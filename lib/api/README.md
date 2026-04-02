## API Layer Overview

This directory contains typed API client modules for the core domain entities:

- `shift-management.ts`
- `clients.ts`
- `employees.ts`
- `agencies.ts`

All modules:

- Use the shared `axiosClient` instance (handles base URL, auth headers, etc.).
- Return typed responses so components/pages can rely on consistent shapes.
- Mirror the backend REST contract as closely as possible (paths, query params, payloads).

---

## `shift-management.ts` – Shift Management APIs

### Key Types

- **`Shift`**: Represents a shift record.
  - Includes core fields like `id`, `employeeId`, `clientId`, `agencyId`, `date`, `status`, `type`, etc.
  - May include populated relations (when requested):
    - `employee?: Employee`
    - `client?: Client`
    - `agency?: Agency`

- **`CreateShiftRequest`**:
  - `employeeId: string` – ID of the DSP/employee assigned to the shift.
  - `clientId?: string` – ID of the client (optional for now; required where enforced by backend).
  - Other scheduling fields as defined in the file (e.g., `date`, `startTime`, `endTime`, `type`, `notes`, etc.).

- **`ListShiftsParams`** (for `listShifts` and some helpers):
  - `agencyId?: string`
  - `employeeId?: string`
  - `status?: ShiftStatus`
  - `limit?: number`
  - `client?: boolean` – if `true`, backend will populate `shift.client`.
  - `employee?: boolean` – if `true`, backend will populate `shift.employee`.
  - Additional filters as defined in the file.

- **Stats Types**:
  - `ShiftStatsRange = "lastWeek" | "thisMonth" | "thisYear" | "day"`
  - `ShiftStatsBucket`:
    - `date: string` (YYYY-MM-DD)
    - `scheduled: number`
    - `completed: number`
    - `total: number`
  - `ShiftStatsResponse`:
    - `success: boolean`
    - `range: ShiftStatsRange`
    - `startDate: string`
    - `endDate: string`
    - `buckets: ShiftStatsBucket[]`

### Core Functions

- **`createShift(data: CreateShiftRequest)`**
  - `POST /shifts/create`
  - Creates a new shift.

- **`listShifts(params?: ListShiftsParams)`**
  - `GET /shifts`
  - Flexible listing endpoint with filters, population flags (`client`, `employee`), and pagination (`limit`).

- **Today / Upcoming / Previous / Status-based helpers**

  These helpers wrap common queries and pass the appropriate params:
  - `getTodayShifts(agencyId?: string, employeeId?: string)`
    - `GET /shifts/today`
    - Params: `{ agencyId?, employeeId? }`
  - `getAvailableShifts(limit = 20, agencyId?: string, employeeId?: string)`
    - `GET /shifts/upcoming`
    - Params: `{ limit, agencyId?, employeeId? }`
  - `getOngoingShifts(agencyId?: string, employeeId?: string)`
    - Uses `listShifts({ status: ShiftStatus.ONGOING, agencyId, employeeId })`.
  - `getCompletedShifts(limit?: number, agencyId?: string, employeeId?: string)`
    - Uses `listShifts({ status: ShiftStatus.COMPLETED, limit, agencyId, employeeId })`.
  - `getPreviousShifts(limit = 30, agencyId?: string, employeeId?: string)`
    - `GET /shifts/previous` with `{ limit, agencyId?, employeeId? }`.
  - `getPendingShifts(limit?: number, agencyId?: string, employeeId?: string)`
    - Uses `listShifts({ status: ShiftStatus.PENDING, limit, agencyId, employeeId })`.

- **Status / Action APIs**

  Check the file for exact names; typical patterns include:
  - `updateShift(id, data)` – `PUT /shifts/:shiftId`
  - `deleteShift(id)` – `DELETE /shifts/:shiftId`
  - `startShift`, `clockIn`, `clockOut`, etc. – mapped to corresponding backend routes.

- **`getShiftStats(range?: ShiftStatsRange, agencyId?: string, date?: string)`**
  - `GET /shifts/stats`
  - **Params**:
    - `range`: `"lastWeek" | "thisMonth" | "thisYear" | "day"` (defaults to `"lastWeek"`).
    - `agencyId?`: optional; ignored for agencies (backend uses their own agency), required for others.
    - `date?`: **required when `range === "day"`**. A date string in `YYYY-MM-DD` format.
  - **Behavior**:
    - For `range = "lastWeek" | "thisMonth" | "thisYear"` – returns buckets over that date range.
    - For `range = "day"` – returns a single bucket for the specific date.

#### Example Usage

```ts
import { getShiftStats, ShiftStatsRange } from "@/lib/api/shift-management";

// Last week stats for current agency (agency users don't need agencyId)
const stats = await getShiftStats("lastWeek");

// Single-day stats for a chart when a bar is clicked
const statsForDay = await getShiftStats("day", profile?.data?.id, "2025-01-08");
```

---

## `clients.ts` – Client Management APIs

### Key Types

- **`Client`**:
  - Core identifiers: `id`, `agencyId`, `status` (`"active"`, etc.).
  - Person info: `firstName`, `lastName`, `email?`, `phone?`, etc.
  - UI/metadata: `profileImage?`, addresses, notes.
  - Care plan fields: `planOfCare?`, `ispOutcome?`, and any other backend-aligned attributes.

- **List & Mutation Types**:
  - `ListClientsParams`:
    - `agencyId?: string` (required for employees)
    - `status?: string`
    - `service?: string`
    - `search?: string`
    - `limit?: number`
  - `CreateClientRequest`
  - `UpdateClientRequest`
  - `ListClientsResponse`

- **Stats Types**:
  - `ClientStats`:
    - `active: number`
    - `inactive: number`
    - `total: number`
  - `ClientStatsResponse`:
    - `success: boolean`
    - `stats: ClientStats`

### Core Functions

- **`createClient(data: CreateClientRequest)`**
  - `POST /clients/create`
  - Agencies: `agencyId` defaults to their own.
  - Employees: must supply `agencyId` in the request body.

- **`listClients(params?: ListClientsParams)`**
  - `GET /clients`
  - Query params: `agencyId`, `status`, `service`, `search`, `limit`.

- **`getClientById(clientId: string, agencyId?: string)`**
  - `GET /clients/:clientId`
  - Employees must supply `agencyId` via query param.

- **`updateClient(clientId: string, data: UpdateClientRequest, agencyId?: string)`**
  - `PUT /clients/:clientId`
  - `agencyId` cannot be changed; employees must pass `agencyId` query param.

- **`deleteClient(clientId: string, agencyId?: string)`**
  - `DELETE /clients/:clientId`
  - Employees must supply `agencyId` via query param.

- **`seedClients(payload: SeedClientsRequest)`**
  - `POST /clients/seed`
  - Uses counts for each status and an optional `overwrite` flag.

- **`searchClients(query: string, agencyId?: string)`**
  - Thin wrapper around `GET /clients` with `search` + optional `agencyId`.

- **`getClientStats(agencyId?: string)`**
  - `GET /clients/stats`
  - Agencies: `agencyId` inferred on backend.
  - Others: must provide `agencyId`.

#### Example Usage

```ts
import { listClients, getClientStats } from "@/lib/api/clients";

// Dropdown search
const { data: clients } = await listClients({ search: "john", limit: 10 });

// Stats for dashboard
const clientStats = await getClientStats(profile?.data?.id);
```

---

## `employees.ts` – Employee (DSP) Management APIs

### Key Types

- **`Employee`**:
  - Identifiers: `id`, `uid` (auth user UID), `agencyId`.
  - Profile: `fullName`, `email`, `profilePicture?`, `role?`, `status?` (e.g., `"active"`).
  - Other fields as exposed by backend (e.g., `phone`, `createdAt`, etc.).

- **List & Mutation Types**:
  - `ListEmployeesParams`:
    - `agencyId?: string`
    - `status?: string`
    - `search?: string`
    - `limit?: number`
  - `CreateEmployeeRequest`
  - `UpdateEmployeeRequest`
  - `ListEmployeesResponse`

- **Training Types**:
  - `EmployeeTraining`
  - `EmployeeTrainingsResponse`

- **Stats Types**:
  - `EmployeeStats`:
    - `active: number`
    - `inactive: number`
    - `total: number`
  - `EmployeeStatsResponse`:
    - `success: boolean`
    - `stats: EmployeeStats`

### Core Functions

- **`createEmployee(data: CreateEmployeeRequest)`**
  - `POST /employees/create`

- **`listEmployees(params?: ListEmployeesParams)`**
  - `GET /employees`
  - Query: `agencyId`, `status`, `search`, `limit`.

- **`getCurrentEmployee()`**
  - `GET /employees/me`
  - Uses authenticated user’s UID to resolve the employee record.

- **`getEmployeeById(employeeId: string)`**
  - `GET /employees/:employeeId`

- **`updateEmployee(employeeId: string, data: UpdateEmployeeRequest)`**
  - `PUT /employees/:employeeId`

- **`deleteEmployee(employeeId: string)`**
  - `DELETE /employees/:employeeId`

- **`getEmployeeTrainings(employeeId: string)`**
  - `GET /employees/:employeeId/trainings`

- **`searchEmployees(query: string, agencyId?: string)`**
  - Uses `GET /employees` with `search` + optional `agencyId`.

- **`getEmployeeStats(agencyId?: string)`**
  - `GET /employees/stats`
  - Agencies: `agencyId` inferred.
  - Others: must provide `agencyId`.

#### Example Usage

```ts
import { searchEmployees, getEmployeeStats } from "@/lib/api/employees";

// Assigned DSP search in Add Schedule modal
const { data: employees } = await searchEmployees("jane", profile?.data?.id);

// DSP stats for dashboard
const dspStats = await getEmployeeStats(profile?.data?.id);
```

---

## `agencies.ts` – Agency Management APIs

### Key Types

- **`Agency`**:
  - Identifiers: `id`, `uid` (owner’s UID).
  - Info: `name`, `email?`, `phone?`, `status`, `isVerified`, `logoUrl?`, address fields, etc.
  - Any other fields from backend are captured in the interface.

- **List & Mutation Types**:
  - `ListAgenciesParams`:
    - `status?: string`
    - `isVerified?: boolean`
    - `search?: string`
    - `limit?: number`
  - `CreateAgencyRequest`
  - `UpdateAgencyRequest`

### Core Functions

- **`createAgency(data: CreateAgencyRequest)`**
  - `POST /agencies/create`
  - Uses authenticated user’s UID; one agency per user.

- **`listAgencies(params?: ListAgenciesParams)`**
  - `GET /agencies`
  - Agencies see only their own agency; supports `status`, `isVerified`, `search`, `limit`.

- **`getAgencyById(agencyId: string)`**
  - `GET /agencies/:agencyId`
  - Access restricted to own agency on the backend.

- **`updateAgency(agencyId: string, data: UpdateAgencyRequest)`**
  - `PUT /agencies/:agencyId`
  - `uid` cannot be changed.

- **`deleteAgency(agencyId: string)`**
  - `DELETE /agencies/:agencyId`
  - Backend blocks deletion if clients or shifts exist.

- **`seedAgency(overwrite?: boolean)`**
  - `POST /agencies/seed`
  - Seeds a single agency for the authenticated user, with optional `overwrite` behavior.

> Note: Some older helpers like `getMyAgency`, `searchAgencies`, `uploadAgencyLogo` were removed to match the current backend.

#### Example Usage

```ts
import { listAgencies, seedAgency } from "@/lib/api/agencies";

// Used during login for agency users
const { data: agencies } = await listAgencies({ limit: 1 });
if (!agencies.length) {
  await seedAgency(true);
}
```

---

## General Usage Notes

- **Auth**:
  - All endpoints assume `axiosClient` is configured with a valid bearer token.
  - Where backend uses the authenticated user to resolve agency/employee, you typically **do not** need to pass `agencyId` explicitly for agency users.

- **Typing**:
  - Prefer importing shared interfaces (`Shift`, `Client`, `Employee`, `Agency`) from these modules instead of redefining local types.
  - This keeps the app consistent as backend contracts evolve.

- **Search / Dropdowns**:
  - Use the `searchClients` and `searchEmployees` helpers for typeahead dropdowns.
  - Always pass `agencyId` when required (e.g. employees, or contexts where the backend cannot infer it).

- **Stats**:
  - `getEmployeeStats`, `getClientStats`, and `getShiftStats` are designed for dashboards.
  - For `getShiftStats("day", ...)`, you must pass a `date` string in `YYYY-MM-DD` format.
