import {describe, expect, it, vi} from 'vitest';
import {fireEvent, render, screen} from '@testing-library/react';
import type {AssignedTimesheetClient} from '@/lib/api/shifts';
import ClientLocationPicker, {filterAssignedClients} from './ClientLocationPicker';

vi.mock('@/lib/firebase', () => ({auth: {currentUser: null}}));

const clients: AssignedTimesheetClient[] = [
    {
        id: 'kc6hps0001',
        type: 'ddd',
        services: [{code: 'DH', name: 'Day Habilitation'}],
        locations: [
            {id: 'primaryAddress', kind: 'primary', source: 'primaryAddress', display: '12 Grand Quest Complex, Newark, NJ, 07102',
                location: {address: '12 Grand Quest Complex', countyState: 'Newark, NJ', zipCode: '07102'}, serviceName: null, payrollSourceFrom: '2026-11-01'},
            {id: 'secondaryAddress', kind: 'service', source: 'secondaryAddress', display: '210 Main St, Trenton, NJ, 08608',
                location: {address: '210 Main St', countyState: 'Trenton, NJ', zipCode: '08608'}, serviceName: null, payrollSourceFrom: null},
        ],
    },
    {id: 'm3t9qa0002', type: 'ddd', services: [{code: 'IS', name: 'Individual Supports'}], locations: []},
];

describe('filterAssignedClients', () => {
    it('keeps a whole client when its id or service matches', () => {
        expect(filterAssignedClients(clients, 'kc6hps')[0].locations).toHaveLength(2);
        expect(filterAssignedClients(clients, 'individual').map(client => client.id)).toEqual(['m3t9qa0002']);
    });

    it('narrows to matching locations on an address search', () => {
        const [match] = filterAssignedClients(clients, 'trenton');
        expect(match.locations.map(location => location.id)).toEqual(['secondaryAddress']);
    });
});

describe('ClientLocationPicker', () => {
    it('groups locations under short client ids and returns the picked pair', () => {
        const onChange = vi.fn();
        render(<ClientLocationPicker clients={clients} loading={false} error={false} value={null} onChange={onChange} onRetry={vi.fn()}/>);
        fireEvent.click(screen.getByRole('button', {name: /^Client and location/}));
        expect(screen.getByRole('group', {name: 'Client KC6HPS'})).toBeTruthy();
        expect(screen.getByText('No address on file. Enter where you worked')).toBeTruthy();
        fireEvent.click(screen.getByRole('option', {name: /210 Main St/}));
        expect(onChange).toHaveBeenCalledWith(clients[0], clients[0].locations[1]);
    });

    it('shows the chosen client and location on the field', () => {
        render(<ClientLocationPicker clients={clients} loading={false} error={false}
            value={{clientId: 'kc6hps0001', locationId: 'primaryAddress'}} onChange={vi.fn()} onRetry={vi.fn()}/>);
        expect(screen.getByText('Client KC6HPS')).toBeTruthy();
        expect(screen.getByText('Primary · 12 Grand Quest Complex, Newark, NJ, 07102')).toBeTruthy();
    });

    it('explains an empty list', () => {
        render(<ClientLocationPicker clients={[]} loading={false} error={false} value={null} onChange={vi.fn()} onRetry={vi.fn()}/>);
        fireEvent.click(screen.getByRole('button', {name: /^Client and location/}));
        expect(screen.getByText(/aren't assigned to any client services/)).toBeTruthy();
    });
});
