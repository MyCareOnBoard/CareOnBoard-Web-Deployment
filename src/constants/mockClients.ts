/**
 * Mock Clients Data
 * 
 * Dummy data for Clients & Services page during development.
 * This file provides realistic sample data until the backend API is ready.
 * 
 * To use real API data:
 * 1. Update the page component to use getClients() from @/lib/api/clients
 * 2. Remove references to this mock data file
 */

import type { Client } from "@/lib/api/clients";

/**
 * Array of realistic client names for variety
 */
const CLIENT_NAMES = [
  "DR Brooklyn Simmons",
  "Sarah Martinez",
  "Michael Johnson",
  "Emily Chen",
  "James Anderson",
  "Maria Garcia",
  "Robert Williams",
  "Jennifer Taylor",
  "David Brown",
  "Lisa Thompson",
  "Christopher Davis",
  "Amanda Rodriguez",
  "Daniel Martinez",
  "Jessica Wilson",
  "Matthew Moore",
];

/**
 * Array of service locations
 */
const LOCATIONS = [
  "2211B Baker Street",
  "456 Oak Avenue",
  "789 Pine Road",
  "321 Maple Drive",
  "654 Elm Street",
  "987 Cedar Lane",
  "147 Birch Way",
  "258 Willow Court",
  "369 Ash Boulevard",
  "741 Spruce Terrace",
  "2231B Baker Street",
];

/**
 * Array of service types
 */
const SERVICES = [
  "Service Name",
  "Community Based",
  "Day Habilitation",
  "Respite Care",
  "Community Inclusion",
  "Prevocational Training",
  "Residential Services",
  "Behavioral Support",
];

/**
 * Generate a random number between min and max (inclusive)
 */
function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Pending clients awaiting acceptance
 */
export const MOCK_PENDING_CLIENTS: Client[] = [
  {
    id: 'pending-1',
    fullName: 'DR Brooklyn Simmons',
    clientId: 'CLT-1001',
    location: '2231B Baker Street',
    service: 'Service Name',
    sessionsCompleted: 2,
    profileImage: undefined,
    isPending: true,
    requestDate: '12 January',
  },
  {
    id: 'pending-2',
    fullName: 'DR Brooklyn Simmons',
    clientId: 'CLT-1002',
    location: '2231B Baker Street',
    service: 'Service Name',
    sessionsCompleted: 2,
    profileImage: undefined,
    isPending: true,
    requestDate: '12 January',
  },
  {
    id: 'pending-3',
    fullName: 'DR Brooklyn Simmons',
    clientId: 'CLT-1003',
    location: '2231B Baker Street',
    service: 'Service Name',
    sessionsCompleted: 2,
    profileImage: undefined,
    isPending: true,
    requestDate: '12 January',
  },
  {
    id: 'pending-4',
    fullName: 'DR Brooklyn Simmons',
    clientId: 'CLT-1004',
    location: '2231B Baker Street',
    service: 'Service Name',
    sessionsCompleted: 2,
    profileImage: undefined,
    isPending: true,
    requestDate: '12 January',
  },
];

/**
 * Past/completed clients
 */
export const MOCK_PAST_CLIENTS: Client[] = Array.from({ length: 9 }, (_, i) => ({
  id: `past-${i + 1}`,
  fullName: 'DR Brooklyn Simmons',
  clientId: `CLT-${2000 + i}`,
  location: '2211B Baker Street',
  service: 'Service Name',
  sessionsCompleted: 2,
  profileImage: undefined,
  isPending: false,
}));

/**
 * All mock clients combined (for backward compatibility)
 */
export const MOCK_CLIENTS: Client[] = [...MOCK_PENDING_CLIENTS, ...MOCK_PAST_CLIENTS];

/**
 * Simulate paginated API response
 */
export function getMockClientsPage(page: number = 1, pageSize: number = 10) {
  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedData = MOCK_CLIENTS.slice(startIndex, endIndex);

  return {
    data: paginatedData,
    total: MOCK_CLIENTS.length,
    page,
    pageSize,
  };
}

/**
 * Simulate getting a single client by ID
 */
export function getMockClientById(clientId: string): Client | undefined {
  return MOCK_CLIENTS.find(client => client.id === clientId || client.clientId === clientId);
}

/**
 * Simulate searching clients by name
 */
export function searchMockClients(query: string): Client[] {
  const lowerQuery = query.toLowerCase();
  return MOCK_CLIENTS.filter(client =>
    client.fullName.toLowerCase().includes(lowerQuery) ||
    client.clientId.toLowerCase().includes(lowerQuery) ||
    client.location.toLowerCase().includes(lowerQuery) ||
    client.service.toLowerCase().includes(lowerQuery)
  );
}

/**
 * Flag to control whether to use mock data
 * Set to false when the real API is ready
 */
export const USE_MOCK_DATA = true;
