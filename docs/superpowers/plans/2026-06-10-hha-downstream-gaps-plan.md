# HHA Downstream Gaps — Implementation Plan

**Spec:** `docs/superpowers/specs/2026-06-10-hha-downstream-gaps-design.md`
**Repos:** `Care-On-Board` (frontend, this repo) and `CareOnBoard-BackEnd`
(`C:/Users/Ph4n70m/Workdir/nodejs/CareOnBoard-BackEnd`)

**Ground rules**

- One PR per workstream per repo. Backend PR merges/deploys before (or with) its
  frontend counterpart.
- WS1 blocks WS2–WS4. WS2, WS3, WS4 are independent of each other. WS5 is independent.
- Every task ends with its verification step. Frontend: `pnpm test` (vitest).
  Backend: `npm test` inside `functions/`.
- Normalizer parity: WS1 fixture cases are duplicated verbatim in both repos' test
  suites, each marked `// parity: see 2026-06-10-hha-downstream-gaps-design.md`.

---

## Workstream 1 — Normalization & schema foundation

### Task 1.1 (BE): preserve `modifier`, derive staff payType

**File:** `functions/utils/client-services-normalize.js`

- Add `resolveHhaStaffPayType(auth)` beside `resolveHhaClientPayType` (line ~171):
  returns `auth.payType` if truthy, else the unitType mapping (15-min, daily, hourly,
  mile), else `undefined`.
- In `normalizeClientServicesFromHhaAuthorizations` (line ~193):
  - replace `payType: payType || undefined` with `payType: resolveHhaStaffPayType(auth)`;
  - add `modifier: String(auth?.modifier ?? "").trim() || undefined`.

**Tests:** extend `functions/.../client-services-normalize.test.js` (parity fixtures):
modifier preserved; modifier absent → omitted; payType derived per unitType; explicit
payType wins; existing DDD outcome normalization unchanged.

### Task 1.2 (BE): require staffRate/payType on meaningful HHA rows; drop telephonyPhone

**File:** `functions/schemas/client.schema.js`

- In `hhaAuthorizationSchema` (~line 298): when a row has a non-empty `serviceId` or
  `serviceCode`, `staffRate` and `payType` are required (Joi `when` conditions).
- Remove `telephonyPhone` from the client create/update schemas.

**Tests:** schema tests — incomplete meaningful row rejected with a field-specific
message; row without serviceId/serviceCode still allowed; payload containing
`telephonyPhone` rejected (or stripped, matching existing unknown-key policy).

### Task 1.3 (FE): mirror normalizer changes

**Files:**
- `src/pages/shared/client-management/utils/clientServicesForOperations.ts` — same
  `resolveHhaStaffPayType` + `modifier` changes as Task 1.1.
- `src/lib/api/clients.ts` — add `modifier?: string` to `ClientService` (and confirm
  `ClientHhaAuthorization.modifier` exists).

**Tests:** new/extended vitest suite with the **same fixture cases** as Task 1.1.

### Task 1.4 (FE): Stage 2 validation + remove telephonyPhone

**Files:**
- Stage 2 wizard validation (where HHA authorization rows are validated — follow
  `isMeaningfulHhaAuthorizationRow` in
  `src/pages/shared/client-management/utils/formDataToApiPayload.ts`): meaningful rows
  must have `staffRate` and `payType`; inline field errors in
  `HhaAuthorizationFields.tsx`.
- Remove `telephonyPhone`: `stages/Stage4EvvAndVisitConfig.tsx` (~lines 119–131),
  formData types, `formDataToApiPayload.ts` (~line 318), `clientToFormData.ts`.

**Tests:** wizard validation test (missing staffRate blocks Stage 2 advance); payload
test asserting no `telephonyPhone` key; `pnpm build` passes (type removal is clean).

---

## Workstream 2 — Claims correctness + insurance plumbing

### Task 2.1 (BE): daily unit math

**File:** `functions/utils/billing-claim-prefill.js` (`computeClaimBilling`, ~185–196)

- `payType === "daily"` → units = count of **distinct shift dates** in the line;
  charge = units × rate. Signature gains the shift-date list (or a precomputed
  distinct-day count) from callers in `buildClaimReportPrefillFromShifts`.

**Tests:** 8h single-day daily shift → 1 unit; two shifts same day → 1 unit; three
shifts across two days → 2 units; 15-min/hourly regression unchanged.

### Task 2.2 (BE): modifier into claim lines + claim record

**File:** `functions/utils/billing-claim-prefill.js` (line construction, ~282–357)

- Use `matchedService.modifier` when present; else keep parse-from-code fallback.
- Persist `modifier` on the claim record (schema change in Task 2.4).

**Tests:** HHA service with modifier "UA" → line modifier "UA" even when serviceCode
has no suffix; DDD "H2021HI" fallback still parses "HI".

### Task 2.3 (BE): authorization validation at claim creation

**File:** `functions/utils/billing-claims-mutations.js`
(`createBillingClaimForAgency`, ~151–342; helpers ~29–146)

- Add validation pass before claim write:
  1. each shift date within matched service `startAuthDate`/`endAuthDate` (skip when
     unset);
  2. cumulative hours (sum of existing non-voided claims for this client+service +
     this claim) ≤ `totalHours` when set;
  3. HHA + primary insurance `authorizationRequired === "yes"` →
     `sdrPriorAuthorization.paNumber` non-empty.
- Errors are 400s listing offending shifts (date, serviceCode, reason) / totals.

**Tests:** one per rule (reject) + happy path; DDD client with no auth dates
unaffected; voided/rejected claims excluded from the cumulative sum.

### Task 2.4 (BE): insurance snapshot on claim schema + prefill

**Files:** `functions/schemas/billing-claim.schema.js`,
`functions/utils/billing-claim-prefill.js`

- Schema: optional `insurance` block — `{ primary?: { company, memberId, groupNumber },
  secondary?: { … }, authorizationNumber?, modifier? }`.
- Prefill: populate from `client.insuranceInfo` (rows typed primary/secondary) for HHA;
  omit for DDD. Applies to both shift- and ride-based prefill.

**Tests:** HHA claim carries snapshot; DDD claim has no insurance block.

### Task 2.5 (FE): mirror billing math + modifier; PDF insured fields

**Files:**
- `src/pages/agency/billing/claims/utils/claimReportPrefillUtils.ts` (~208–223 math,
  ~183–195 modifier) — mirror Tasks 2.1/2.2.
- `src/pages/agency/billing/claims/utils/claimReportPrintUtils.ts` + claim report
  components — render insured's ID, group number, plan name when the claim has an
  insurance snapshot.
- Claim types in `src/lib/api/` — add the insurance block + modifier.

**Tests:** mirror math/modifier fixtures; snapshot/unit test that PDF data includes
insured fields for HHA and omits them for DDD.

---

## Workstream 3 — Payroll guards

### Task 3.1 (BE): rateStatus in pay calc

**File:** `functions/utils/payroll-pay-calc.js` (`computeShiftPayAmount`, ~26–42)

- Return `{ amount, rate, payType, rateStatus }`;
  `rateStatus = "no-service-match"` when `findMatchingService` misses,
  `"missing-staff-rate"` when matched but `parseStaffRate` yields no positive rate,
  else `"ok"`. Update all callers (preview, prefill, mutations, overtime path).

**Tests:** all three statuses; amount math regression for hourly/15-min/daily/mile.

### Task 3.2 (BE): preview flags + creation block

**Files:** `functions/utils/payroll-invoice-preview.js` (~51–77),
`functions/utils/payroll-invoice-mutations.js` (~62–101)

- Preview items include `rateStatus` and a human-readable `rateIssue` string.
- Creation: any non-`ok` shift → 400 with
  `{ blockedShifts: [{ shiftId, date, dspName, serviceCode, reason }] }`.

**Tests:** preview flags both reasons; mixed batch rejected listing only flagged
shifts; all-ok batch succeeds; DDD regression.

### Task 3.3 (FE): surface flags and blocks

**Files:** payroll invoice preview/create components under
`src/pages/agency/billing/payroll/`, types in `src/lib/api/payroll.ts`

- Add `rateStatus`/`rateIssue` to `PayrollInvoicePrefill` types; warning badge +
  reason on flagged rows; creation error state renders the `blockedShifts` list.

**Tests:** component test — flagged row shows badge/reason; error state lists blocked
shifts.

---

## Workstream 4 — Scheduling

### Task 4.1 (BE): assignedDsps hard block

**File:** `functions/utils/shift-validation.js` (`evaluateShiftWriteInvariants`)

- After service resolution (`resolveClientServiceRowForShift`, ~216–252): if
  `service.assignedDsps?.length` and shift's DSP id not in it → invariant failure
  `"DSP {name} is not authorized for service {code}. Update the client's
  authorization to add them."` Runs on create and update/reassignment paths.

**Tests:** assigned passes; unassigned rejected; empty/absent list unrestricted (DDD
regression); reassignment to unassigned DSP rejected.

### Task 4.2 (FE): DSP picker filtering + ISP outcome cleanup

**File:** `src/pages/agency/scheduling/components/AddScheduleModal.tsx`

- When `selectedService?.assignedDsps?.length`, filter the DSP picker to that list and
  show a hint ("Limited to staff on this client's authorization").
- Hide the ISP outcomes field for HHA (`isHhaClient`, ~line 705 / form section) instead
  of rendering blank; guard direct `client.outcomes` reads (~143–144, 160–161).

**Tests:** picker filters when assignedDsps present, full list otherwise; ISP outcome
field absent for HHA, present for DDD.

---

## Workstream 5 — HHA mileage

### Task 5.1 (BE): catalog entry + transport code

**Files:** `functions/controllers/agency/services.js` (`NJ_HHA_SERVICES`, ~225–305),
`functions/utils/mileage-transportation.js` (`TRANSPORTATION_CODES`)

- Add `{ code: "S0215", name: "Non-Emergency Transportation – Mileage",
  unitType: "mile", defaultRate: "" }` to `NJ_HHA_SERVICES` (match existing entry
  shape exactly). Add `"S0215"` to `TRANSPORTATION_CODES`.
- ⚠️ Before release: confirm S0215 with the billing owner (spec Risks).

**Tests:** HHA client with a mile authorization passes
`validateMileageTransportationForClient`; agency ride creation (POST route, ~377–387)
succeeds; ride → claim bundling (`billing-claims-ready-bundles.js`) includes the ride.

### Task 5.2 (FE): transport code + wizard verification

**Files:** `src/pages/agency/mileage/utils/transportationClientService.ts`,
verify `src/pages/shared/client-management/utils/applyHhaCatalogService.ts`

- Add `"S0215"` to the frontend transportation codes set.
- Verify (no change expected): catalog dropdown shows the new service; unitType "mile"
  flows to `clientPayType: "mile"`; `AddMileageModal` resolves the service for an HHA
  client.

**Tests:** mileage modal resolves HHA transport service; unitType "mile" mapping test
(the previously-dead branch).

---

## Final verification (after WS5)

1. Both repos: full test suites green (`pnpm test`; `npm test` in `functions/`).
2. `pnpm build` (tsc) clean.
3. Manual end-to-end against the Firebase emulator (`pnpm dev:emulator`):
   onboard an HHA client (with modifier'd PDN service, mile authorization, insurance,
   assignedDsps) → schedule shift (picker filtered; unassigned DSP rejected) →
   complete shift → create claim (modifier + insurance on PDF; daily math correct) →
   payroll preview/create (flagged when staffRate removed) → log mileage ride →
   bundle ride claim.
4. DDD regression sweep: schedule, claim, payroll an existing DDD test client —
   outputs identical to pre-change (except intentional daily-math fix).
5. Release notes: assignedDsps hard block + DDD daily-math change (spec
   "Backward compatibility").
