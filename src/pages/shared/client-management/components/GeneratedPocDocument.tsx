import { useMemo, type ReactNode } from "react";
import type { ClientPocGenerationResponse } from "../types/clientPocGeneration";
import {
  displayValue,
  formatContactPhoneEmail,
  normalizePocTableDocument,
} from "../utils/normalizePocTableDocument";

const cellClass =
  "border border-black px-2 py-1.5 align-top text-[12px] leading-snug text-black";
const labelClass = "font-bold";

function TableCell({
  label,
  children,
  colSpan,
  rowSpan,
  className = "",
}: {
  label: string;
  children: ReactNode;
  colSpan?: number;
  rowSpan?: number;
  className?: string;
}) {
  return (
    <td colSpan={colSpan} rowSpan={rowSpan} className={`${cellClass} ${className}`}>
      <div className={labelClass}>{label}</div>
      <div className="mt-1 whitespace-pre-wrap">{children}</div>
    </td>
  );
}

export function GeneratedPocDocument({
  response,
}: {
  response: ClientPocGenerationResponse;
}) {
  const table = useMemo(() => normalizePocTableDocument(response), [response]);
  const contacts = table.contacts.length
    ? table.contacts
    : [{ name: "", relationship: "", phone: "", email: "" }];

  const clientNameDisplay = [
    displayValue(table.client.name),
    table.client.gender.trim() ? `(${table.client.gender.trim()})` : "",
  ]
    .filter(Boolean)
    .join(" ");

  const ageDobDisplay = [
    table.client.age.trim() ? `Age: ${table.client.age.trim()}` : "",
    table.client.dob.trim(),
  ]
    .filter(Boolean)
    .join("\n");

  const hospitalLines = table.medical.preferredHospital.length
    ? table.medical.preferredHospital
    : ["NA"];

  return (
    <div className="space-y-4 text-black">
      <h2 className="text-right text-[18px] font-bold">Emergency Plan of Care</h2>

      <table className="w-full border-collapse border border-black text-left">
        <tbody>
          <tr>
            <TableCell label="Client Name:">{clientNameDisplay}</TableCell>
            <TableCell label="Age:">{ageDobDisplay || "NA"}</TableCell>
            <TableCell label="Client ID:">{displayValue(table.client.clientId)}</TableCell>
            <TableCell label="Type of Service:">
              {displayValue(table.client.typeOfService)}
            </TableCell>
          </tr>

          <tr>
            <TableCell label="Contact Person Name:">
              {contacts.map((c, i) => (
                <div key={`name-${i}`} className={i > 0 ? "mt-3" : ""}>
                  {displayValue(c.name)}
                </div>
              ))}
            </TableCell>
            <TableCell label="Relationship:">
              {contacts.map((c, i) => (
                <div key={`rel-${i}`} className={i > 0 ? "mt-3" : ""}>
                  {displayValue(c.relationship)}
                </div>
              ))}
            </TableCell>
            <TableCell label="Phone Number:" colSpan={2}>
              {contacts.map((c, i) => (
                <div key={`phone-${i}`} className={i > 0 ? "mt-3" : ""}>
                  {formatContactPhoneEmail(c)}
                </div>
              ))}
            </TableCell>
          </tr>

          <tr>
            <TableCell label="Address:">{displayValue(table.client.address)}</TableCell>
            <TableCell label="City:">{displayValue(table.client.city)}</TableCell>
            <TableCell label="State / Zip Code" colSpan={2}>
              {displayValue(table.client.stateZipCode)}
            </TableCell>
          </tr>

          <tr>
            <TableCell label="SC :">
              {[
                displayValue(table.coordination.supportCoordinator),
                table.coordination.phone.trim()
                  ? `P: ${table.coordination.phone.trim()}`
                  : "",
                table.coordination.email.trim()
                  ? `E: ${table.coordination.email.trim()}`
                  : "",
              ]
                .filter((line) => line && line !== "NA")
                .join("\n") || "NA"}
            </TableCell>
            <TableCell label="Coordination Agency:">
              {displayValue(table.coordination.agency)}
            </TableCell>
            <TableCell label="Coordination Phone and Email:" colSpan={2}>
              {[
                table.coordination.phone.trim()
                  ? `P: ${table.coordination.phone.trim()}`
                  : "",
                table.coordination.email.trim()
                  ? `E: ${table.coordination.email.trim()}`
                  : "",
              ]
                .filter(Boolean)
                .join("\n") || "NA"}
            </TableCell>
          </tr>

          <tr>
            <TableCell label="Coordinator Supervisor:">
              {[
                displayValue(table.coordination.coordinatorSupervisor),
                table.coordination.email.trim()
                  ? `E: ${table.coordination.email.trim()}`
                  : "",
              ]
                .filter((line) => line && line !== "NA")
                .join("\n") || "NA"}
            </TableCell>
            <TableCell label="Preferred Hospital:">
              <ul className="list-disc pl-4">
                {hospitalLines.map((line, i) => (
                  <li key={`hospital-${i}`}>{line}</li>
                ))}
              </ul>
              <div className={`${labelClass} mt-3`}>Primary Care Physician:</div>
              <div>{displayValue(table.medical.primaryCarePhysician)}</div>
            </TableCell>
            <TableCell label="" colSpan={2}>
              <div className={labelClass}>{displayValue(table.provider.agencyName)}</div>
              <div>
                {table.provider.phone.trim() ? `P: ${table.provider.phone.trim()}` : ""}
              </div>
              <div>
                {table.provider.email.trim() ? `E: ${table.provider.email.trim()}` : ""}
              </div>
            </TableCell>
          </tr>

          <tr>
            <TableCell label="County:">{displayValue(table.client.county)}</TableCell>
            <TableCell label="Diagnosis:">
              <span className="italic whitespace-pre-wrap">
                {displayValue(table.medical.diagnosis)}
              </span>
            </TableCell>
            <TableCell label="Schedule Hours /Days" colSpan={2}>
              {displayValue(table.services.hoursDays || table.services.schedule)}
            </TableCell>
          </tr>

          <tr>
            <TableCell label="Medication:" colSpan={4}>
              {displayValue(table.medical.medication)}
            </TableCell>
          </tr>

          <tr>
            <TableCell label="Outcome per ISP:" colSpan={4}>
              <span className="italic whitespace-pre-wrap">
                {displayValue(table.services.outcomePerIsp)}
              </span>
            </TableCell>
          </tr>
        </tbody>
      </table>

      {table.supportSections.map((section, idx) => (
        <section
          key={`${section.heading}-${idx}`}
          className="border border-black px-3 py-2 text-[12px]"
        >
          <h3 className="font-bold italic">{section.heading}</h3>
          {section.items.length ? (
            <ul className="mt-2 list-disc pl-5 italic">
              {section.items.map((item, i) => (
                <li key={`${item}-${i}`} className="whitespace-pre-wrap">
                  {item}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 italic">NA</p>
          )}
        </section>
      ))}

      {response.warnings?.length ? (
        <section className="rounded-[12px] border border-amber-200 bg-amber-50 p-4 space-y-2">
          <h3 className="text-[14px] font-semibold text-amber-900">
            Review before using
          </h3>
          <ul className="list-disc pl-5 space-y-1 text-[13px] text-amber-900">
            {response.warnings.map((w, i) => (
              <li key={`${w.code}-${i}`}>{w.message}</li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
