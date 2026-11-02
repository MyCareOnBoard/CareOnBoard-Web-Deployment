import {describe, expect, it} from 'vitest';
import type {UserIncidentReport} from '@/lib/api/incidents';
import {filterIncidents, incidentClient, incidentOverview, incidentWhen, joinWitnesses, splitWitnesses} from './incidentRecords';

const incident = (over: Partial<UserIncidentReport>): UserIncidentReport => ({
    id: 'i', employeeId: 'e', employeeUid: 'u', employeeName: 'Test', agencyId: 'a', clientName: 'Jane Doe', clientId: 'hq7lmn2pxy',
    date: '2026-11-02T00:00:00.000Z', time: '14:30', whatHappened: 'Client slipped', whatActionsTaken: null, whatDidYouDo: 'Helped',
    witness: null, status: 'submitted', submittedAt: '', createdAt: '', updatedAt: '', ...over,
});

describe('incident helpers', () => {
    it('shows the client by short id only', () => {
        expect(incidentClient(incident({}))).toBe('HQ7LMN');
        expect(incidentClient(incident({clientId: null}))).toBeNull();
        expect(filterIncidents([incident({})], 'jane')).toHaveLength(0);
    });

    it('formats the date and time', () => {
        expect(incidentWhen(incident({}))).toBe('Nov 2, 2026 · 2:30 PM');
        expect(incidentWhen(incident({date: '2026-11-02', time: ''}))).toBe('Nov 2, 2026');
        expect(incidentWhen(incident({date: ''}))).toBe('No date');
    });

    it('counts by status', () => {
        const overview = incidentOverview([incident({status: 'submitted'}), incident({status: 'under_review'}), incident({status: 'resolved'}), incident({status: 'not_resolved'})]);
        expect(overview).toEqual({total: 4, waiting: 2, resolved: 1, notResolved: 1});
    });

    it('keeps witnesses in one field', () => {
        expect(joinWitnesses([' Mr. Joseph Eshun ', '', 'Ama'])).toBe('Mr. Joseph Eshun, Ama');
        expect(splitWitnesses('Mr. Joseph Eshun, Ama')).toEqual(['Mr. Joseph Eshun', 'Ama']);
        expect(splitWitnesses(null)).toEqual([]);
    });
});
