# HHA Downstream Gaps — Design

**Date:** 2026-06-10
**Status:** Approved (pending user spec review)
**Repos affected:** `Care-On-Board` (React frontend) and `CareOnBoard-BackEnd` (Firebase functions)

## Problem

Client onboarding, scheduling, mileage, claims, and payroll were built for DDD clients
(ISP/outcome-based services). HHA clients were added later with a different service model
(flat payer authorizations: `hhaAuthorizations[]`). A four-module audit found that the
shared normalization layer (`clientServicesForOperations.ts` /
`client-services-normalize.js`) covers most cases, but:

- The `modifier` field on HHA authorizations is dropped during normalization, so claims
  for modifier-distinguished services (e.g. Private Duty Nursing EPSDT/UA variants) go
  out with the wrong billing code.
- `computeClaimBilling()` treats `daily` pay types as hours × rate, overbilling per-diem
  services (e.g. Medical Day Care S5102) by the number of hours in the shift.
- No claim-time validation of authorization date windows, approved-hours caps, or
  insurance `authorizationRequired`.
- Collected `insuranceInfo` (company, member ID, group number) is never read by any
  claims code; the claim schema has no insurance fields.
- Payroll silently computes $0 when a shift's service code doesn't match or the
  authorization has no `staffRate`; `staffRate`/`payType` are not required at onboarding.
- If `payType` is blank but `unitType` is "15-min", payroll defaults to hourly — a 4×
  underpayment.
- `assignedDsps` on HHA authorizations is displayed but not enforced when scheduling.
- `telephonyPhone` is collected at onboarding but consumed nowhere.
- The HHA service catalog has no `mile` unit type, so mileage fails for HHA clients with
  a confusing error.

## Decisions

| Question | Decision |
|---|---|
| Scope | All four areas: claims, payroll, scheduling, mileage |
| HHA mileage | Supported — add mileage service(s) to the HHA catalog |
| Insurance billing | Phase 1 only: carry insurance data onto claims and PDFs; defer 837/EDI |
| Telephony EVV | Remove the field; GPS remains the only EVV method |
| assignedDsps | Hard block: backend rejects shifts for DSPs not on the authorization |
| Unresolvable pay rate | Block invoice creation and flag the offending shifts |
| Delivery | Foundation-first sequenced workstreams (Approach A), one PR per workstream per repo |

## Workstream 1 — Normalization & schema foundation

Both normalizers change identically:
frontend `src/pages/shared/client-management/utils/clientServicesForOperations.ts`
(`hhaAuthorizationToClientService`) and backend
`functions/utils/client-services-normalize.js`
(`normalizeClientServicesFromHhaAuthorizations`).

1. **Preserve `modifier`.** Copy `auth.modifier` (trimmed, omit if empty) onto the
   normalized service. Add `modifier?: string` to `ClientService` in
   `src/lib/api/clients.ts` and to the backend client service shape.
2. **Derive staff `payType` from `unitType` when blank.** New
   `resolveHhaStaffPayType(auth)`: returns `auth.payType` if set, otherwise the same
   `unitType` → pay-type mapping used by `resolveHhaClientPayType` (15-min, daily,
   hourly, mile). Used for the normalized `payType` field. This exists for legacy
   rows saved before item 3's validation; new rows always carry an explicit payType.
3. **Require `staffRate` and `payType` on meaningful HHA authorization rows.** In the
   backend `hhaAuthorizationSchema` (`functions/schemas/client.schema.js`) and the
   wizard Stage 2 validation: any row with a `serviceId` or `serviceCode` must have a
   non-empty `staffRate` and a `payType`. No data migration — existing incomplete
   clients are caught by the Workstream 3 payroll block and fixed by editing the client.
4. **Remove `telephonyPhone`.** Delete from `Stage4EvvAndVisitConfig.tsx`, formData
   types, `formDataToApiPayload.ts`, `clientToFormData.ts`, and the backend client
   schema. Stored Firestore values stay as inert dead data; no migration.

**Tests:** both repos' normalizer suites use the same documented fixture cases —
modifier preserved; payType derived for each unitType; explicit payType wins over
unitType; schema rejects rows missing staffRate/payType; rows without
serviceId/serviceCode remain exempt.

## Workstream 2 — Claims correctness + insurance plumbing

1. **Daily unit math.** In `computeClaimBilling()` (backend
   `functions/utils/billing-claim-prefill.js` ~lines 185–196; frontend
   `src/pages/agency/billing/claims/utils/claimReportPrefillUtils.ts` ~lines 208–223):
   when `payType === "daily"`, units = number of distinct shift dates in the claim line
   (1 unit per day worked) and charge = units × rate. 15-min (hours × 4), hourly
   (hours), and mile (miles × rate, rides path) are unchanged. Note: this also corrects
   any DDD service with `payType: "daily"` — billing output changes for those too.
2. **Modifier in claim lines.** Claim prefill uses the matched service's `modifier`
   field when present; falls back to the existing parse-from-service-code behavior
   (e.g. "H2021HI" → "HI") for DDD. The modifier is stored on the claim record.
3. **Authorization validation at claim creation** (`functions/utils/billing-claims-mutations.js`):
   - Every included shift's date must fall within the matched service's
     `startAuthDate`/`endAuthDate` when set; reject listing the offending shifts.
   - Cumulative claimed hours for the authorization (existing claims + this one) must
     not exceed `totalHours` (HHA `approvedHours`); reject with current totals.
   - For HHA clients whose primary insurance has `authorizationRequired: "yes"`, a
     non-empty authorization number (surfaced as `sdrPriorAuthorization.paNumber`) is
     required.
4. **Insurance snapshot on claims.** Extend
   `functions/schemas/billing-claim.schema.js` and the prefill snapshot with an
   `insurance` block captured at claim time: primary and secondary (if present)
   company, member ID, group number, plus `authorizationNumber` and `modifier`. The
   claim PDF (`claimReportPrintUtils.ts`) gains CMS-1500-style insured-party fields
   (insured's ID, group number, plan name). DDD claims leave the block empty.
5. **Out of scope:** place-of-service stays hardcoded `"99"`; no 837/EDI export.

**Tests:** billing math for all four pay types; claim creation rejects on auth-window
violation, hours-cap violation, and missing required authorization number; prefill
carries modifier and insurance snapshot; DDD claims regression (empty insurance block,
unchanged math for hourly/15-min).

## Workstream 3 — Payroll guards

1. **Rate resolution with a reason.** Refactor `computeShiftPayAmount()`
   (`functions/utils/payroll-pay-calc.js`) to return
   `{ amount, rate, payType, rateStatus }` with `rateStatus`:
   `"ok" | "no-service-match" | "missing-staff-rate"`. Pay math unchanged.
2. **Preview flags.** `functions/utils/payroll-invoice-preview.js` includes
   `rateStatus` per shift item. The frontend invoice preview renders flagged rows with
   a warning badge and a human-readable reason instead of a silent "—" and $0.
3. **Creation block.** `functions/utils/payroll-invoice-mutations.js` rejects invoice
   creation (400) if any included shift has a non-`ok` rateStatus. The response lists
   each blocked shift (date, DSP, service code, reason). No partial-invoice option —
   that would silently drop shifts.
4. **Frontend surfacing.** The create-invoice flow displays the blocked-shift list in
   its error state, not just a generic toast.

**Tests:** preview and creation for both failure reasons; mixed batch (some ok, some
flagged) rejected with the correct shift list; DDD payroll regression.

## Workstream 4 — Scheduling

1. **Hard block on non-assigned DSPs (backend).** In
   `functions/utils/shift-validation.js`, extend `evaluateShiftWriteInvariants()`:
   when the resolved client service has a non-empty `assignedDsps` list, the shift's
   DSP must be on it; otherwise reject with
   "DSP {name} is not authorized for service {code}. Update the client's authorization
   to add them." Applies on create and edit/reassignment. An absent or empty
   `assignedDsps` list means unrestricted — DDD behavior unchanged.
2. **Frontend pre-emption.** In
   `src/pages/agency/scheduling/components/AddScheduleModal.tsx`, when the selected
   service has `assignedDsps`, filter the DSP picker to those staff with a hint
   explaining the restriction.
3. **ISP outcome UX for HHA.** Hide the ISP outcomes field entirely for HHA clients
   (currently hardcoded blank at ~line 705). Guard the direct `client.outcomes` reads
   (~lines 143–144, 160–161) so they cannot misfire for HHA.

**Tests:** invariants — assigned DSP passes, unassigned rejected, empty list
unrestricted, edit/reassign covered; DSP picker filtering; DDD scheduling regression.

## Workstream 5 — HHA mileage support

1. **Catalog.** Add a mileage service to `NJ_HHA_SERVICES`
   (`functions/controllers/agency/services.js`): code **S0215** (non-emergency
   transportation, per mile), `unitType: "mile"`, blank `defaultRate` (the
   authorization's own `rate` governs billing; defaultRate is only a UI prefill).
   **Open confirmation:** the exact code must be confirmed with the billing
   owner/payer before release; it is isolated to one catalog entry.
2. **Detection.** `resolveHhaClientPayType()` already maps `unitType: "mile"` →
   `clientPayType: "mile"`, which `isTransportationClientService()` matches. Also add
   S0215 to the `TRANSPORTATION_CODES` set in both
   `functions/utils/mileage-transportation.js` and
   `src/pages/agency/mileage/utils/transportationClientService.ts`.
3. **Wizard.** No structural change — the HHA authorization service dropdown picks up
   the catalog entry; `applyHhaCatalogService.ts` already maps "mile". Verify unit-type
   display.
4. **Claims.** `buildClaimReportPrefillFromRides()` already computes miles × rate;
   `isTransportationServiceCodeOnClient()` now passes for HHA rides. The Workstream 2
   insurance snapshot applies to ride-based claims.

**Tests:** HHA client with a mile authorization passes
`validateMileageTransportationForClient()` and ride creation succeeds; HHA ride →
claim bundling; mileage modal resolves the HHA transport service.

## Cross-cutting

**Rollout.** Backend lands before (or with) the frontend for each workstream. PR order
1 → 5 per repo; Workstream 1 blocks 2–4; 2, 3, 4 are mutually independent; 5 is fully
independent.

**Backward compatibility.** No Firestore migrations. Existing HHA clients missing
`staffRate` are caught by the payroll block and fixed via client edit. Stored
`telephonyPhone` values become inert. Existing claims are untouched. **Behavioral
change to communicate:** the assignedDsps hard block applies to existing HHA
authorizations — previously-allowed scheduling of non-listed DSPs will start failing
(intended compliance behavior). The daily-unit fix changes billing output for any
in-flight DDD client with a daily pay type.

**Error handling.** Validation failures are loud, specific, and actionable: every
rejection names the entity (shift, DSP, service code) and the fix. No silent
fallbacks, no $0 defaults.

**Normalizer parity.** The two repos' normalizers must stay mirrored by discipline:
both test suites implement the same fixture cases, listed in each suite with a
comment referencing this spec. No mechanical cross-repo enforcement exists.

**End-to-end coverage.** One happy path per module for an HHA client (onboard →
schedule → complete shift → claim + payroll) plus DDD regression tests on claims math
and scheduling invariants.

## Risks

- S0215 code choice needs payer confirmation (one-line change if wrong).
- Daily-unit math change affects DDD daily-payType services already in flight.
- Normalizer mirroring across repos is convention-enforced only.
- The assignedDsps hard block may surprise agencies with existing authorizations;
  release notes must call it out.
