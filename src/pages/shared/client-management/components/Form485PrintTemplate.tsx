import React from "react";
import type { Form485Document } from "../types/clientForm485Generation";

/**
 * Paper-faithful render of the CMS-485 (HCFA-485) Home Health Certification and
 * Plan of Care, used ONLY for PDF export. The numbered boxes mirror the printed
 * form. Rendered off-screen and snapshotted by generateFormPdfBlob (html2canvas),
 * so all styling is inline, content is top-aligned, and colors are explicit black
 * on white for reliable rasterization (no flex/vertical centering).
 */

const BORDER = "1px solid #000";

/** A single numbered CMS-485 box. Content is always top-aligned. */
function Cell({
  no,
  label,
  width,
  grow,
  minHeight,
  children,
}: {
  no?: string;
  label: string;
  width?: number | string;
  grow?: number;
  minHeight?: number;
  children?: React.ReactNode;
}) {
  return (
    <div
      style={{
        borderRight: BORDER,
        borderBottom: BORDER,
        padding: "2px 5px 4px",
        boxSizing: "border-box",
        width: grow ? undefined : width,
        flex: grow,
        minHeight,
        overflow: "hidden",
      }}
    >
      <div style={{ fontSize: 7.5, fontWeight: 700, lineHeight: 1.2, textTransform: "uppercase" }}>
        {no ? `${no}. ` : ""}
        {label}
      </div>
      <div
        style={{
          fontSize: 10,
          lineHeight: 1.3,
          paddingTop: 2,
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
        }}
      >
        {children}
      </div>
    </div>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <div style={{ display: "flex", width: "100%" }}>{children}</div>;
}

/** Render an array of strings as stacked lines (one per item). */
function Lines({ items }: { items: string[] }) {
  const clean = items.map((i) => i.trim()).filter(Boolean);
  if (clean.length === 0) return null;
  return (
    <>
      {clean.map((line, i) => (
        <div key={i} style={{ marginBottom: 1 }}>
          {line}
        </div>
      ))}
    </>
  );
}

function PlainText({ value }: { value: string }) {
  return <>{value || ""}</>;
}

function Form485PrintTemplate({ form485 }: { form485: Form485Document }) {
  const f = form485;
  const certPeriod =
    f.certificationPeriodFrom || f.certificationPeriodTo
      ? `${f.certificationPeriodFrom || "—"}  to  ${f.certificationPeriodTo || "—"}`
      : "";

  return (
    <div
      style={{
        width: "100%",
        boxSizing: "border-box",
        color: "#000",
        background: "#fff",
        fontFamily: "Arial, Helvetica, sans-serif",
        fontSize: 10,
        lineHeight: 1.3,
      }}
    >
      {/* Title */}
      <div style={{ textAlign: "center", marginBottom: 6 }}>
        <div style={{ fontSize: 8, fontWeight: 700 }}>
          DEPARTMENT OF HEALTH AND HUMAN SERVICES
        </div>
        <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: 0.3 }}>
          HOME HEALTH CERTIFICATION AND PLAN OF CARE
        </div>
        <div style={{ fontSize: 7.5 }}>Form CMS-485 (HCFA-485)</div>
      </div>

      {/* Grid: top border + left border on the container, right/bottom on each cell */}
      <div style={{ borderTop: BORDER, borderLeft: BORDER }}>
        {/* Row 1: boxes 1-5 */}
        <Row>
          <Cell no="1" label="Patient's HI Claim No." grow={2}>
            <PlainText value={f.patientHiClaimNo} />
          </Cell>
          <Cell no="2" label="Start of Care Date" grow={2}>
            <PlainText value={f.startOfCareDate} />
          </Cell>
          <Cell no="3" label="Certification Period" grow={3}>
            <PlainText value={certPeriod} />
          </Cell>
          <Cell no="4" label="Medical Record No." grow={2}>
            <PlainText value={f.medicalRecordNo} />
          </Cell>
          <Cell no="5" label="Provider No." grow={2}>
            <PlainText value={f.providerNo} />
          </Cell>
        </Row>

        {/* Row 2: 6 patient | 7 provider */}
        <Row>
          <Cell no="6" label="Patient's Name and Address" grow={1} minHeight={48}>
            <div style={{ fontWeight: 700 }}>{f.patientName}</div>
            <PlainText value={f.patientAddress} />
          </Cell>
          <Cell no="7" label="Provider's Name, Address and Telephone Number" grow={1} minHeight={48}>
            <div style={{ fontWeight: 700 }}>{f.providerName}</div>
            <PlainText value={f.providerAddress} />
            {f.providerPhone ? <div>{f.providerPhone}</div> : null}
          </Cell>
        </Row>

        {/* Row 3: 8 DOB | 9 Sex (left half) — right half kept aligned under provider */}
        <Row>
          <Cell no="8" label="Date of Birth" grow={1}>
            <PlainText value={f.dateOfBirth} />
          </Cell>
          <Cell no="9" label="Sex" grow={1}>
            <PlainText value={f.sex} />
          </Cell>
        </Row>

        {/* Row 4: 10 Medications */}
        <Row>
          <Cell
            no="10"
            label="Medications: Dose / Frequency / Route (N)ew (C)hanged"
            grow={1}
            minHeight={56}
          >
            <Lines items={f.medications} />
          </Cell>
        </Row>

        {/* Row 5: 11 Principal Diagnosis | Date */}
        <Row>
          <Cell no="11" label="ICD-9-CM Principal Diagnosis" grow={4}>
            <PlainText value={f.principalDiagnosis} />
          </Cell>
          <Cell label="Date" grow={1}>
            <PlainText value={f.principalDiagnosisDate} />
          </Cell>
        </Row>

        {/* Row 6: 12 Surgical Procedure | Date */}
        <Row>
          <Cell no="12" label="ICD-9-CM Surgical Procedure" grow={4}>
            <PlainText value={f.surgicalProcedure} />
          </Cell>
          <Cell label="Date" grow={1}>
            <PlainText value={f.surgicalProcedureDate} />
          </Cell>
        </Row>

        {/* Row 7: 13 Other Pertinent Diagnoses */}
        <Row>
          <Cell no="13" label="ICD-9-CM Other Pertinent Diagnoses" grow={1} minHeight={40}>
            <Lines items={f.otherDiagnoses} />
          </Cell>
        </Row>

        {/* Row 8: 14 DME and Supplies | 15 Safety Measures */}
        <Row>
          <Cell no="14" label="DME and Supplies" grow={1} minHeight={36}>
            <PlainText value={f.dmeAndSupplies} />
          </Cell>
          <Cell no="15" label="Safety Measures" grow={1} minHeight={36}>
            <PlainText value={f.safetyMeasures} />
          </Cell>
        </Row>

        {/* Row 9: 16 Nutritional Req. | 17 Allergies */}
        <Row>
          <Cell no="16" label="Nutritional Requirements" grow={1} minHeight={32}>
            <PlainText value={f.nutritionalRequirements} />
          </Cell>
          <Cell no="17" label="Allergies" grow={1} minHeight={32}>
            <PlainText value={f.allergies} />
          </Cell>
        </Row>

        {/* Row 10: 18A Functional Limitations | 18B Activities Permitted */}
        <Row>
          <Cell no="18.A" label="Functional Limitations" grow={1} minHeight={48}>
            <Lines items={f.functionalLimitations} />
          </Cell>
          <Cell no="18.B" label="Activities Permitted" grow={1} minHeight={48}>
            <Lines items={f.activitiesPermitted} />
          </Cell>
        </Row>

        {/* Row 11: 19 Mental Status | 20 Prognosis */}
        <Row>
          <Cell no="19" label="Mental Status" grow={1} minHeight={32}>
            <Lines items={f.mentalStatus} />
          </Cell>
          <Cell no="20" label="Prognosis" grow={1} minHeight={32}>
            <PlainText value={f.prognosis} />
          </Cell>
        </Row>

        {/* Row 12: 21 Orders for Discipline and Treatments */}
        <Row>
          <Cell
            no="21"
            label="Orders for Discipline and Treatments (Specify Amount / Frequency / Duration)"
            grow={1}
            minHeight={72}
          >
            <PlainText value={f.ordersForDisciplineAndTreatments} />
          </Cell>
        </Row>

        {/* Row 13: 22 Goals / Rehab Potential / Discharge Plans */}
        <Row>
          <Cell
            no="22"
            label="Goals / Rehabilitation Potential / Discharge Plans"
            grow={1}
            minHeight={64}
          >
            <PlainText value={f.goalsRehabPotentialDischargePlans} />
          </Cell>
        </Row>

        {/* Row 14: 23 Nurse signature | 24 Physician name/address */}
        <Row>
          <Cell
            no="23"
            label="Nurse's Signature and Date of Verbal SOC Where Applicable"
            grow={1}
            minHeight={40}
          >
            <div>{f.nurseSignature}</div>
            {f.verbalSocDate ? <div>Date: {f.verbalSocDate}</div> : null}
          </Cell>
          <Cell no="24" label="Physician's Name and Address" grow={1} minHeight={40}>
            <div style={{ fontWeight: 700 }}>{f.physicianName}</div>
            <PlainText value={f.physicianAddress} />
          </Cell>
        </Row>

        {/* Row 15: 25 Date HHA Received Signed POT */}
        <Row>
          <Cell no="25" label="Date HHA Received Signed POT" grow={1}>
            <PlainText value={f.dateHhaReceivedSignedPot} />
          </Cell>
        </Row>

        {/* Row 16: 26 certification statement */}
        <Row>
          <Cell
            no="26"
            label="Physician's Certification"
            grow={1}
            minHeight={40}
          >
            <span style={{ fontSize: 8.5, fontStyle: "italic" }}>
              I certify/recertify that this patient is confined to his/her home and needs
              intermittent skilled nursing care, physical therapy and/or speech therapy or
              continues to need occupational therapy. The patient is under my care, and I have
              authorized the services on this plan of care and will periodically review the plan.
            </span>
          </Cell>
        </Row>

        {/* Row 17: 27 Attending Physician's Signature and Date */}
        <Row>
          <Cell
            no="27"
            label="Attending Physician's Signature and Date Signed"
            grow={3}
            minHeight={36}
          >
            <PlainText value={f.attendingPhysicianSignature} />
          </Cell>
          <Cell label="Date Signed" grow={1} minHeight={36}>
            <PlainText value={f.attendingPhysicianSignatureDate} />
          </Cell>
        </Row>

        {/* Row 18: 28 penalty notice */}
        <Row>
          <Cell
            no="28"
            label="Anyone who misrepresents, falsifies, or conceals essential information required for payment of Federal funds may be subject to fine, imprisonment, or civil penalty under applicable Federal laws."
            grow={1}
          />
        </Row>
      </div>
    </div>
  );
}

// Memoized: the off-screen template only changes when its `form485` prop does.
export default React.memo(Form485PrintTemplate);
