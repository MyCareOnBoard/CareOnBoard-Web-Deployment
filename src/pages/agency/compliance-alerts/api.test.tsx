import {act, renderHook} from '@testing-library/react';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
vi.mock('@/lib/baseQuery', () => ({customBaseQuery: vi.fn()}));
import {useComplianceDateRefresh} from './api';
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-09-16T03:59:45Z'));
  Object.defineProperty(document, 'visibilityState', {configurable: true, value: 'visible'});
});
afterEach(() => vi.useRealTimers());
describe('agency date freshness for empty issue pages', () => {
  it('refreshes an empty New York page at local midnight, not UTC midnight', async () => {
    const response = {items: [], timezone: 'America/New_York', localDate: '2026-09-15'};
    const refresh = vi.fn();
    const {unmount} = renderHook(() => useComplianceDateRefresh(response.timezone, refresh, response.localDate));
    expect(refresh).not.toHaveBeenCalled();
    await act(() => vi.advanceTimersByTimeAsync(30_000));
    expect(refresh).toHaveBeenCalledTimes(1);
    unmount();
    await act(() => vi.advanceTimersByTimeAsync(86_400_000));
    expect(refresh).toHaveBeenCalledTimes(1);
  });
  it('defers midnight refresh while hidden until the view becomes visible', async () => {
    Object.defineProperty(document, 'visibilityState', {configurable: true, value: 'hidden'});
    const refresh = vi.fn();
    renderHook(() => useComplianceDateRefresh('America/New_York', refresh, '2026-09-15'));
    await act(() => vi.advanceTimersByTimeAsync(30_000));
    expect(refresh).not.toHaveBeenCalled();
    Object.defineProperty(document, 'visibilityState', {configurable: true, value: 'visible'});
    act(() => document.dispatchEvent(new Event('visibilitychange')));
    expect(refresh).toHaveBeenCalledTimes(1);
  });
});

import { configureStore } from '@reduxjs/toolkit';
import { customBaseQuery } from '@/lib/baseQuery';
import { complianceAlertsApi } from './api';
import { userPanelNotesApi } from '@/pages/userPanel/notes/api';
import { waitFor } from '@testing-library/react';
const queryMock = vi.mocked(customBaseQuery);
describe('shift-note request bounds and invalidation', () => {
  const setup = () => {
    vi.useRealTimers(); queryMock.mockReset();
    queryMock.mockResolvedValue({data: {items: [], coverage: 'ready', nextCursor: null, data: {id: 'row'}}});
    return configureStore({reducer: {[complianceAlertsApi.reducerPath]: complianceAlertsApi.reducer, [userPanelNotesApi.reducerPath]: userPanelNotesApi.reducer}, middleware: getDefault => getDefault().concat(complianceAlertsApi.middleware, userPanelNotesApi.middleware)});
  };
  it('defaults to 25, caps at 50 and never sends viewer identity', async () => {
    const store = setup();
    await store.dispatch(complianceAlertsApi.endpoints.getShiftNoteCompliance.initiate({viewerId: 'viewer', agencyId: 'agency'}));
    expect(queryMock.mock.calls[0][0]).toMatchObject({url: '/shifts/note-compliance', params: {agencyId: 'agency', limit: 25}});
    expect((queryMock.mock.calls[0][0] as any).params).not.toHaveProperty('viewerId');
    await store.dispatch(complianceAlertsApi.endpoints.getShiftNoteCompliance.initiate({viewerId: 'viewer', agencyId: 'agency', limit: 500}));
    expect((queryMock.mock.calls[1][0] as any).params.limit).toBe(50);
    store.dispatch(complianceAlertsApi.util.resetApiState());
  });
  it('uses one list call, no detail for list rows, no compliance refresh on autosave and one refresh each after submit', async () => {
    const store = setup();
    const list = store.dispatch(complianceAlertsApi.endpoints.getShiftNoteCompliance.initiate({viewerId: 'viewer', agencyId: 'agency'}));
    await list;
    expect(queryMock).toHaveBeenCalledTimes(1);
    const detail = store.dispatch(complianceAlertsApi.endpoints.getShiftNoteComplianceDetail.initiate({viewerId: 'viewer', agencyId: 'agency', shiftId: 'shift'}));
    await detail;
    await store.dispatch(userPanelNotesApi.endpoints.createOrUpdateActivityLog.initiate({activityLog: 'log', data: {id: 'row', startDate: '2026-09-12', endDate: '2026-09-12', metadata: {description: 'Typing'}}}));
    const complianceCalls = () => queryMock.mock.calls.filter(call => (call[0] as any).url.startsWith('/shifts/'));
    expect(complianceCalls()).toHaveLength(2);
    await store.dispatch(userPanelNotesApi.endpoints.submitActivityLogNotes.initiate({activityLog: 'log', logNoteIds: ['row'], operationId: 'operation'}));
    await waitFor(() => expect(complianceCalls()).toHaveLength(4));
    expect(queryMock.mock.calls.find(call => (call[0] as any).url.endsWith('/notes/submit'))?.[0]).toMatchObject({data: {logNoteIds: ['row'], operationId: 'operation'}});
    list.unsubscribe(); detail.unsubscribe(); store.dispatch(complianceAlertsApi.util.resetApiState()); store.dispatch(userPanelNotesApi.util.resetApiState());
  });
  it.each([
    ['community-based', {activity: 'Walk', description: 'Progress'}],
    ['community-inclusion', {units: '1', strategies: 'Goal', activities: 'Walk', location: 'Park', notes: 'Progress'}],
    ['day-habilitation', {units: '1', strategies: 'Goal', activities: 'Walk', location: 'Park', notes: 'Progress'}],
    ['prevocational-training', {units: '1', strategies: 'Goal', activities: 'Work', location: 'Office', notes: 'Progress'}],
    ['supported-employment-pre', {seProfessional: 'Staff', noOfHoursStart: '09:00', noOfHoursEnd: '10:00', noOfHoursTotal: '1', activityConducted: 'Work', whatWasDone: 'Practice', howDidThisAssist: 'Progress'}],
    ['supported-employment-intervention', {type: 'service', seProfessional: 'Staff', noOfHoursStart: '09:00', noOfHoursEnd: '10:00', noOfHoursTotal: '1', servicesProvided: 'Practice', EmployeeProgress: 'Progress'}],
    ['respite-log', {activities: 'Walk'}],
    ['hha-service-log', {description: 'Assisted'}],
    ['hha-personal-care', {checkedActivities: ['Medication reminders'], completedBy: 'Staff', completionDate: '2026-09-13'}],
  ])('preserves the %s draft payload shape', async (_type, metadata) => {
    const store = setup();
    const data = {id: 'row', startDate: '2026-09-12', endDate: '2026-09-12', metadata};
    await store.dispatch(userPanelNotesApi.endpoints.createOrUpdateActivityLog.initiate({activityLog: 'log', data}));
    expect(queryMock.mock.calls[0][0]).toMatchObject({method: 'PUT', data});
    store.dispatch(userPanelNotesApi.util.resetApiState());
  });
});
