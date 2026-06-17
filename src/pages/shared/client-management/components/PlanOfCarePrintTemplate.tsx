import React from "react";
import { POC_TASKS, type PlanOfCareFormData } from "../types/planOfCare";

/**
 * Paper-faithful render of the Plan of Care used ONLY for PDF export. It mirrors
 * the printed CHHA form (bordered 3-column table, checkboxes, signature lines)
 * and is independent of how the on-screen modal looks. Rendered off-screen and
 * snapshotted by generateFormPdfBlob (html2canvas), so all styling is inline and
 * uses explicit black/white colors for reliable rasterization.
 */

const BORDER = "1px solid #000";
/** Thicker rule for fill-in lines so values sit clearly on (not through) the line. */
const UNDERLINE = "1.5px solid #000";

/**
 * Checkbox drawn as an SVG (vector box + check). html2canvas positions text
 * glyphs by baseline, so a "✓" character can't be reliably centered in a box;
 * an SVG path rasterizes exactly as drawn.
 */
function Box({ checked }: { checked: boolean }) {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 15 15"
      style={{ display: "inline-block", verticalAlign: "middle" }}
      aria-hidden="true"
    >
      <rect
        x="0.7"
        y="0.7"
        width="13.6"
        height="13.6"
        fill="#ffffff"
        stroke="#000000"
        strokeWidth="1.2"
      />
      {checked ? (
        <path
          d="M3 8 L6.2 11 L12 4.2"
          fill="none"
          stroke="#000000"
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : null}
    </svg>
  );
}

/**
 * Checkbox + label on one line. html2canvas mis-renders every CSS vertical
 * centering method (flex/grid `align-items`, `vertical-align: middle`, table
 * cells, line-height) for a box-next-to-text, so the box is absolutely
 * positioned at a calibrated offset — absolute positions are rasterized exactly.
 */
const CHECK_ROW = 18;
const BOX_TOP = 5;
function CheckLabel({
  checked,
  children,
  marginRight,
}: {
  checked: boolean;
  children: React.ReactNode;
  marginRight?: number;
}) {
  return (
    <span
      style={{
        position: "relative",
        display: "inline-block",
        minHeight: CHECK_ROW,
        lineHeight: `${CHECK_ROW}px`,
        paddingLeft: 20,
        marginRight,
        verticalAlign: "top",
      }}
    >
      <span style={{ position: "absolute", left: 0, top: BOX_TOP }}>
        <Box checked={checked} />
      </span>
      {children}
    </span>
  );
}

/** Inline label + underlined value (mimics a fill-in line). */
function Line({
  label,
  value,
  grow = 1,
}: {
  label: string;
  value: string;
  grow?: number;
}) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 6, flex: grow, minWidth: 0 }}>
      <span style={{ fontWeight: 700, whiteSpace: "nowrap" }}>{label}</span>
      <span
        style={{
          flex: 1,
          borderBottom: UNDERLINE,
          paddingBottom: 3,
          lineHeight: 1.4,
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
        }}
      >
        {value || " "}
      </span>
    </div>
  );
}

/** Signature line: renders the captured signature image (or a blank line). */
function SignatureLine({
  label,
  value,
  grow = 1,
}: {
  label: string;
  value: string;
  grow?: number;
}) {
  const isImage = value.startsWith("data:image");
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 6, flex: grow, minWidth: 0 }}>
      <span style={{ fontWeight: 700, whiteSpace: "nowrap" }}>{label}</span>
      <span
        style={{
          flex: 1,
          borderBottom: UNDERLINE,
          minHeight: 26,
          display: "flex",
          alignItems: "flex-end",
          overflow: "hidden",
        }}
      >
        {isImage ? (
          <img src={value} alt="" style={{ maxHeight: 30, maxWidth: "100%", objectFit: "contain" }} />
        ) : null}
      </span>
    </div>
  );
}

function Underline({ value, minWidth = 40 }: { value: string; minWidth?: number }) {
  return (
    <span
      style={{
        borderBottom: UNDERLINE,
        display: "inline-block",
        minWidth,
        paddingBottom: 2,
        lineHeight: 1.4,
        whiteSpace: "pre-wrap",
        wordBreak: "break-word",
        verticalAlign: "bottom",
      }}
    >
      {value || " "}
    </span>
  );
}

/** Date rendered as three underlined segments separated by slashes (slashes always shown). */
function DateField({ label, value }: { label: string; value?: Date }) {
  const seg = (text: string, w: number) => (
    <span
      style={{
        display: "inline-block",
        minWidth: w,
        borderBottom: UNDERLINE,
        textAlign: "center",
        paddingBottom: 3,
        lineHeight: 1.4,
        verticalAlign: "bottom",
      }}
    >
      {text || " "}
    </span>
  );
  const mm = value ? String(value.getMonth() + 1).padStart(2, "0") : "";
  const dd = value ? String(value.getDate()).padStart(2, "0") : "";
  const yyyy = value ? String(value.getFullYear()) : "";
  return (
    <span style={{ display: "inline-flex", alignItems: "baseline", gap: 4, whiteSpace: "nowrap" }}>
      <span style={{ fontWeight: 700 }}>{label}</span>
      {seg(mm, 24)}
      <span style={{ fontWeight: 700 }}>/</span>
      {seg(dd, 24)}
      <span style={{ fontWeight: 700 }}>/</span>
      {seg(yyyy, 42)}
    </span>
  );
}

function GoalItem({ checked, children }: { checked: boolean; children: React.ReactNode }) {
  // Box absolutely positioned so it aligns with the first line; text may wrap.
  return (
    <div style={{ position: "relative", paddingLeft: 21, margin: "3px 0", lineHeight: "18px" }}>
      <span style={{ position: "absolute", left: 0, top: 5 }}>
        <Box checked={checked} />
      </span>
      {children}
    </div>
  );
}

export default function PlanOfCarePrintTemplate({ poc }: { poc: PlanOfCareFormData }) {
  const cell: React.CSSProperties = {
    border: BORDER,
    padding: "4px 6px",
    verticalAlign: "top",
  };
  const headerCell: React.CSSProperties = { ...cell, fontWeight: 700 };

  return (
    <div
      style={{
        width: "100%",
        boxSizing: "border-box",
        color: "#000",
        background: "#fff",
        fontFamily: "Arial, Helvetica, sans-serif",
        fontSize: 12.5,
        lineHeight: 1.35,
      }}
    >
      {/* Header — slightly larger font than the table body */}
      <div style={{ fontSize: 12.5 }}>
        {/* Title + date of initial POC */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            gap: 12,
            marginBottom: 10,
          }}
        >
          <span>
            <span style={{ fontWeight: 700, fontSize: 19 }}>PLAN OF CARE/ </span>
            <span style={{ fontWeight: 700, fontSize: 13.5 }}>PERSONAL CARE SERVICES:</span>
          </span>
          <DateField label="DATE OF INITIAL PLAN OF CARE:" value={poc.dateOfInitialPoc} />
        </div>

        {/* Identity lines */}
        <div style={{ display: "flex", alignItems: "flex-end", gap: 16, marginBottom: 7 }}>
          <Line label="CLIENT NAME:" value={poc.clientName} grow={3} />
          <DateField label="START OF CARE:" value={poc.startOfCare} />
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 16, marginBottom: 7 }}>
          <Line label="MEDICAL/Nursing DX:" value={poc.medicalNursingDx} grow={2} />
          <Line label="ALLERGIES:" value={poc.allergies} grow={2} />
        </div>
        <div style={{ marginBottom: 7 }}>
          <Line label="DAYS/HOURS OF SERVICE:" value={poc.daysHoursOfService} />
        </div>

        {/* Advance directive */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: 14,
            margin: "4px 0 8px",
          }}
        >
          <span style={{ fontWeight: 700 }}>Does Client have an Advance Directive?</span>
          <CheckLabel checked={poc.advanceDirective === "no"}>No</CheckLabel>
          <CheckLabel checked={poc.advanceDirective === "yes"}>Yes</CheckLabel>
          <CheckLabel checked={poc.advanceDirectiveCopyObtained}>Copy Obtained</CheckLabel>
          <CheckLabel checked={poc.advanceDirectiveInfoGiven}>Info Given</CheckLabel>
          <CheckLabel checked={poc.advanceDirectiveInfoRefused}>Info Refused</CheckLabel>
        </div>
      </div>

      {/* Tasks / Frequency / Goals table */}
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          border: BORDER,
          fontSize: 12.5,
          tableLayout: "fixed",
        }}
      >
        <colgroup>
          <col style={{ width: "46%" }} />
          <col style={{ width: "15%" }} />
          <col style={{ width: "39%" }} />
        </colgroup>
        <tbody>
          <tr>
            <td style={headerCell}>Tasks to be Performed by CHHA:</td>
            <td style={headerCell}>Frequency:</td>
            <td style={cell} rowSpan={POC_TASKS.length + 1}>
              <div style={{ fontWeight: 700 }}>Short Term Goals:</div>
              <GoalItem checked={poc.shortTermGoals.personalCareMet}>
                Personal Care needs will be met
              </GoalItem>
              <GoalItem checked={poc.shortTermGoals.freeFromInjury}>
                Client will remain free from injury
              </GoalItem>
              <GoalItem checked={!!poc.shortTermGoals.other.trim()}>
                Other: <Underline value={poc.shortTermGoals.other} minWidth={120} />
              </GoalItem>

              <div style={{ fontWeight: 700, marginTop: 10 }}>Long Term Goals:</div>
              <GoalItem checked={poc.longTermGoals.maxIndependence}>
                Client will reach maximum level of independence
              </GoalItem>
              <GoalItem checked={poc.longTermGoals.safeEnvironment}>
                Client will be maintained in a safe environment
              </GoalItem>
              <GoalItem checked={!!poc.longTermGoals.other.trim()}>
                Other: <Underline value={poc.longTermGoals.other} minWidth={120} />
              </GoalItem>

              <div style={{ fontWeight: 700, marginTop: 10 }}>
                Discharge Plan/Goals for Discharge:
              </div>
              <GoalItem checked={poc.dischargePlan.adequateFunctioning}>
                Adequate level of functioning in the home
              </GoalItem>
              <GoalItem checked={poc.dischargePlan.independentManagement}>
                Independent Management of Care
              </GoalItem>
              <GoalItem checked={!!poc.dischargePlan.other.trim()}>
                Other: <Underline value={poc.dischargePlan.other} minWidth={120} />
              </GoalItem>

              <div style={{ fontWeight: 700, marginTop: 10 }}>
                Changes in Client Status to be reported to RN:
              </div>
              <div style={{ margin: "2px 0" }}>
                1. <Underline value={poc.changesToReportToRn[0]} minWidth={180} />
              </div>
              <div style={{ margin: "2px 0" }}>
                2. <Underline value={poc.changesToReportToRn[1]} minWidth={180} />
              </div>
            </td>
          </tr>

          {POC_TASKS.map((task) => {
            const state = poc.tasks[task.id];
            return (
              <tr key={task.id}>
                <td style={cell}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                    <span
                      style={{
                        fontWeight: 700,
                        minWidth: 104,
                        flexShrink: 0,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {task.label}:
                    </span>
                    {task.options.length > 0 ? (
                      <div
                        style={{
                          flex: 1,
                          minWidth: 0,
                          display: "grid",
                          gridTemplateColumns: "repeat(auto-fill, minmax(112px, 1fr))",
                          columnGap: 8,
                          rowGap: 4,
                        }}
                      >
                        {task.options.map((opt) => (
                          <CheckLabel key={opt.key} checked={!!state?.options[opt.key]}>
                            {opt.label}
                          </CheckLabel>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </td>
                <td style={cell}>{state?.frequency || " "}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Disclaimer + signatures */}
      <p style={{ fontStyle: "italic", margin: "10px 0 8px", fontSize: 11, lineHeight: 1.4 }}>
        This Plan of Care was developed by the RN with client/family input. It will be reviewed at
        least every 30 days to determine its appropriateness to the needs of the client and that it
        is being discharged correctly. The Plan of Care is maintained in the office and a copy at
        the patient's residence and available to client, family, pertinent agency health care
        providers as needed.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <Line label="RN NAME (PRINT)" value={poc.rnName} />
        <div style={{ display: "flex", alignItems: "flex-end", gap: 16 }}>
          <SignatureLine label="RN SIGNATURE:" value={poc.rnSignature} grow={3} />
          <DateField label="DATE:" value={poc.rnDate} />
        </div>
        <div style={{ display: "flex", gap: 16 }}>
          <Line label="CLIENT/REP NAME (Print)" value={poc.clientRepName} grow={3} />
          <Line label="RELATIONSHIP" value={poc.clientRepRelationship} grow={2} />
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 16 }}>
          <SignatureLine label="CLIENT/REP SIGNATURE" value={poc.clientRepSignature} grow={3} />
          <DateField label="DATE:" value={poc.clientRepDate} />
        </div>
      </div>
    </div>
  );
}
