import {describe, expect, it} from 'vitest';
import {ShiftStatus, type Shift} from '@/lib/api/shifts';
import {buildClientRows, cityState, clientStatus, clientsOverview, filterClientRows, padCount} from './myClients';

const now = new Date(2026, 4, 16, 10, 0);
const shift = (overrides: Partial<Shift>): Shift => ({
    id: Math.random().toString(36).slice(2), date: '2026-05-16', startTime: '09:00 AM', endTime: '11:00 AM',
    status: ShiftStatus.AVAILABLE, ...overrides,
});
const client = (id: string, extra: Record<string, unknown> = {}) => ({
    id, firstName: 'Theresa', lastName: 'Webb', primaryAddress: {address: '12 Main St, Brooklyn, NY 11201'},
    services: [{code: 'T1019', name: 'Personal care'}], ...extra,
}) as unknown as Shift['client'];

describe('cityState', () => {
    it('prefers saved city and state', () => {
        expect(cityState({primaryAddress: {city: 'Queens', state: 'NY'}})).toBe('Queens, NY');
    });
    it('reads the city and state code from a one-line address', () => {
        expect(cityState({address: '48 Elm Ave, Newark, NJ 07104'})).toBe('Newark, NJ');
        expect(cityState({address: '48 Elm Ave, Newark, New Jersey'})).toBe('Newark, New Jersey');
        expect(cityState({address: ''})).toBe('');
    });
});

describe('clientStatus', () => {
    it('maps record statuses to what staff see', () => {
        expect(clientStatus('active')).toBe('active');
        expect(clientStatus(undefined)).toBe('active');
        expect(clientStatus('inactive')).toBe('on_hold');
        expect(clientStatus('archived')).toBe('on_hold');
        expect(clientStatus('pending')).toBe('pending');
    });
});

describe('buildClientRows', () => {
    const shifts = [
        shift({clientId: 'abc123xyz', client: client('abc123xyz'), serviceCode: 'T1019', date: '2026-05-10', status: ShiftStatus.COMPLETED}),
        shift({clientId: 'abc123xyz', client: client('abc123xyz'), serviceCode: 'T1019', date: '2026-05-18'}),
        shift({clientId: 'abc123xyz', client: client('abc123xyz'), serviceCode: 'T1019', date: '2026-05-17'}),
        shift({clientId: 'def456uvw', client: client('def456uvw', {status: 'inactive'}), serviceCode: 'S5125', date: '2026-05-01', status: ShiftStatus.COMPLETED}),
        shift({clientId: 'ghi789rst', client: client('ghi789rst'), serviceCode: 'T1019', date: '2026-05-16', status: ShiftStatus.ONGOING}),
    ];
    const rows = buildClientRows(shifts, now);

    it('shows a short id, never the name', () => {
        expect(rows.map(row => row.label)).toEqual(['GHI789', 'ABC123', 'DEF456']);
        expect(JSON.stringify(rows.map(({label, careTypes, location}) => ({label, careTypes, location})))).not.toMatch(/Theresa|Webb/);
    });
    it('picks the soonest visit still ahead and the care type by name', () => {
        const row = rows.find(item => item.clientId === 'abc123xyz')!;
        expect(row.nextVisit?.date).toBe('2026-05-17');
        expect(row.careTypes).toEqual(['Personal care']);
        expect(row.location).toBe('Brooklyn, NY');
    });
    it('marks clients with no visits ahead and on-hold records', () => {
        const row = rows.find(item => item.clientId === 'def456uvw')!;
        expect(row.nextVisit).toBeNull();
        expect(row.status).toBe('on_hold');
        expect(row.careTypes).toEqual(['S5125']);
    });
    it('counts clients, services this month and visits today', () => {
        expect(clientsOverview(rows, shifts, now)).toEqual({assignedClients: 3, activeServices: 3, servicesToday: 1});
    });
    it('filters by short id, care type or location', () => {
        expect(filterClientRows(rows, 'abc1').map(row => row.clientId)).toEqual(['abc123xyz']);
        expect(filterClientRows(rows, 's5125').map(row => row.clientId)).toEqual(['def456uvw']);
        expect(filterClientRows(rows, 'theresa')).toEqual([]);
        expect(filterClientRows(rows, '  ')).toHaveLength(3);
    });
});

it('pads small counts', () => {
    expect(padCount(8)).toBe('08');
    expect(padCount(12)).toBe('12');
});
