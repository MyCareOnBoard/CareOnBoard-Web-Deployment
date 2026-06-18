import type { ClientPocGenerationResponse } from "../types/clientPocGeneration";
import {
  displayValue,
  formatContactPhoneEmail,
  normalizePocTableDocument,
} from "./normalizePocTableDocument";

const PAGE_MARGIN = 10;
const LINE_HEIGHT = 4.2;
const LABEL_SIZE = 8;
const BODY_SIZE = 8;
const TITLE_SIZE = 14;
const CELL_PAD_X = 2;
const CELL_PAD_Y = 2;
const BORDER_WIDTH = 0.2;

type PdfCell = {
  label: string;
  text: string;
  colSpan?: number;
};

function wrapText(
  pdf: import("jspdf").jsPDF,
  text: string,
  maxWidth: number,
  fontSize = BODY_SIZE,
): string[] {
  pdf.setFontSize(fontSize);
  const lines = pdf.splitTextToSize(text || "NA", maxWidth) as string[];
  return Array.isArray(lines) ? lines : [String(lines)];
}

function ensurePageSpace(
  pdf: import("jspdf").jsPDF,
  y: number,
  needed: number,
): number {
  const pageHeight = pdf.internal.pageSize.getHeight();
  if (y + needed > pageHeight - PAGE_MARGIN) {
    pdf.addPage();
    return PAGE_MARGIN;
  }
  return y;
}

function measureCellHeight(
  pdf: import("jspdf").jsPDF,
  cellWidth: number,
  label: string,
  text: string,
): number {
  const contentWidth = Math.max(8, cellWidth - CELL_PAD_X * 2);
  const labelLines = wrapText(pdf, label, contentWidth, LABEL_SIZE);
  const bodyLines = wrapText(pdf, text, contentWidth, BODY_SIZE);
  return (
    CELL_PAD_Y * 2 +
    labelLines.length * (LINE_HEIGHT - 0.5) +
    1 +
    bodyLines.length * LINE_HEIGHT
  );
}

function drawCellContent(
  pdf: import("jspdf").jsPDF,
  x: number,
  y: number,
  width: number,
  label: string,
  text: string,
): void {
  const contentWidth = Math.max(8, width - CELL_PAD_X * 2);
  let cursorY = y + CELL_PAD_Y + 3;

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(LABEL_SIZE);
  const labelLines = wrapText(pdf, label, contentWidth, LABEL_SIZE);
  for (const line of labelLines) {
    pdf.text(line, x + CELL_PAD_X, cursorY);
    cursorY += LINE_HEIGHT - 0.5;
  }

  cursorY += 0.5;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(BODY_SIZE);
  const bodyLines = wrapText(pdf, text, contentWidth, BODY_SIZE);
  for (const line of bodyLines) {
    pdf.text(line, x + CELL_PAD_X, cursorY);
    cursorY += LINE_HEIGHT;
  }
}

const GRID_COLUMNS = 4;
const GRID_WEIGHTS = [1, 1, 1, 1];

function drawTableRow(
  pdf: import("jspdf").jsPDF,
  y: number,
  pageWidth: number,
  cells: PdfCell[],
): { y: number; rowHeight: number } {
  const tableWidth = pageWidth - PAGE_MARGIN * 2;
  const totalWeight = GRID_WEIGHTS.reduce((sum, w) => sum + w, 0);
  const colWidths = GRID_WEIGHTS.map((w) => (tableWidth * w) / totalWeight);

  let x = PAGE_MARGIN;
  let colIndex = 0;
  const cellRects: Array<{ x: number; width: number; cell: PdfCell }> = [];

  for (const cell of cells) {
    const span = Math.min(cell.colSpan ?? 1, GRID_COLUMNS - colIndex);
    let width = 0;
    for (let c = 0; c < span; c += 1) {
      width += colWidths[colIndex + c] ?? 0;
    }
    cellRects.push({ x, width, cell });
    x += width;
    colIndex += span;
  }

  const rowHeight = Math.max(
    ...cellRects.map(({ width, cell }) =>
      measureCellHeight(pdf, width, cell.label, cell.text),
    ),
    LINE_HEIGHT * 2,
  );

  for (const { x: cellX, width, cell } of cellRects) {
    pdf.setLineWidth(BORDER_WIDTH);
    pdf.rect(cellX, y, width, rowHeight);
    drawCellContent(pdf, cellX, y, width, cell.label, cell.text);
  }

  return { y: y + rowHeight, rowHeight };
}

function drawBulletedSection(
  pdf: import("jspdf").jsPDF,
  y: number,
  pageWidth: number,
  heading: string,
  items: string[],
): number {
  const contentWidth = pageWidth - PAGE_MARGIN * 2 - 4;
  const lines: string[] = [];
  for (const item of items.length ? items : ["NA"]) {
    for (const wrapped of wrapText(pdf, `• ${item}`, contentWidth - 4, BODY_SIZE)) {
      lines.push(wrapped);
    }
  }

  const blockHeight =
    LINE_HEIGHT +
    2 +
    lines.length * LINE_HEIGHT +
    CELL_PAD_Y * 2;

  y = ensurePageSpace(pdf, y, blockHeight + 2);
  const startY = y;

  pdf.setLineWidth(BORDER_WIDTH);
  pdf.rect(PAGE_MARGIN, startY, pageWidth - PAGE_MARGIN * 2, blockHeight);

  pdf.setFont("helvetica", "bolditalic");
  pdf.setFontSize(BODY_SIZE);
  pdf.text(heading, PAGE_MARGIN + CELL_PAD_X, startY + CELL_PAD_Y + 3);

  pdf.setFont("helvetica", "italic");
  pdf.setFontSize(BODY_SIZE);
  let cursorY = startY + CELL_PAD_Y + LINE_HEIGHT + 2;
  for (const line of lines) {
    pdf.text(line, PAGE_MARGIN + CELL_PAD_X + 2, cursorY);
    cursorY += LINE_HEIGHT;
  }

  return startY + blockHeight + 2;
}

export async function buildPocPdfBlob(
  response: ClientPocGenerationResponse,
): Promise<Blob> {
  const { default: jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const table = normalizePocTableDocument(response);
  const contacts = table.contacts.length
    ? table.contacts
    : [{ name: "", relationship: "", phone: "", email: "" }];

  let y = PAGE_MARGIN;

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(TITLE_SIZE);
  const title = "Emergency Plan of Care";
  const titleWidth = pdf.getTextWidth(title);
  pdf.text(title, pageWidth - PAGE_MARGIN - titleWidth, y + 4);
  y += 10;

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

  const contactNames = contacts.map((c) => displayValue(c.name)).join("\n\n");
  const contactRelationships = contacts
    .map((c) => displayValue(c.relationship))
    .join("\n\n");
  const contactPhones = contacts.map((c) => formatContactPhoneEmail(c)).join("\n\n");

  const scText = [
    displayValue(table.coordination.supportCoordinator),
    table.coordination.phone.trim() ? `P: ${table.coordination.phone.trim()}` : "",
    table.coordination.email.trim() ? `E: ${table.coordination.email.trim()}` : "",
  ]
    .filter((line) => line && line !== "NA")
    .join("\n");

  const coordinationContact = [
    table.coordination.phone.trim() ? `P: ${table.coordination.phone.trim()}` : "",
    table.coordination.email.trim() ? `E: ${table.coordination.email.trim()}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const supervisorText = [
    displayValue(table.coordination.coordinatorSupervisor),
    table.coordination.email.trim() ? `E: ${table.coordination.email.trim()}` : "",
  ]
    .filter((line) => line && line !== "NA")
    .join("\n");

  const hospitalText = (table.medical.preferredHospital.length
    ? table.medical.preferredHospital.map((line) => `• ${line}`)
    : ["• NA"]
  )
    .concat([`Primary Care Physician:`, displayValue(table.medical.primaryCarePhysician)])
    .join("\n");

  const providerText = [
    displayValue(table.provider.agencyName),
    table.provider.phone.trim() ? `P: ${table.provider.phone.trim()}` : "",
    table.provider.email.trim() ? `E: ${table.provider.email.trim()}` : "",
  ]
    .filter((line) => line && line !== "NA")
    .join("\n");

  const rows: Array<{ cells: PdfCell[] }> = [
    {
      cells: [
        { label: "Client Name:", text: clientNameDisplay },
        { label: "Age:", text: ageDobDisplay || "NA" },
        { label: "Client ID:", text: displayValue(table.client.clientId) },
        { label: "Type of Service:", text: displayValue(table.client.typeOfService) },
      ],
    },
    {
      cells: [
        { label: "Contact Person Name:", text: contactNames },
        { label: "Relationship:", text: contactRelationships },
        { label: "Phone Number:", text: contactPhones, colSpan: 2 },
      ],
    },
    {
      cells: [
        { label: "Address:", text: displayValue(table.client.address) },
        { label: "City:", text: displayValue(table.client.city) },
        { label: "State / Zip Code", text: displayValue(table.client.stateZipCode), colSpan: 2 },
      ],
    },
    {
      cells: [
        { label: "SC :", text: scText || "NA" },
        { label: "Coordination Agency:", text: displayValue(table.coordination.agency) },
        {
          label: "Coordination Phone and Email:",
          text: coordinationContact || "NA",
          colSpan: 2,
        },
      ],
    },
    {
      cells: [
        { label: "Coordinator Supervisor:", text: supervisorText || "NA" },
        { label: "Preferred Hospital:", text: hospitalText },
        { label: "", text: providerText || "NA", colSpan: 2 },
      ],
    },
    {
      cells: [
        { label: "County:", text: displayValue(table.client.county) },
        { label: "Diagnosis:", text: displayValue(table.medical.diagnosis) },
        {
          label: "Schedule Hours /Days",
          text: displayValue(table.services.hoursDays || table.services.schedule),
          colSpan: 2,
        },
      ],
    },
    {
      cells: [
        {
          label: "Medication:",
          text: displayValue(table.medical.medication),
          colSpan: 4,
        },
      ],
    },
    {
      cells: [
        {
          label: "Outcome per ISP:",
          text: displayValue(table.services.outcomePerIsp),
          colSpan: 4,
        },
      ],
    },
  ];

  for (const row of rows) {
    const tableWidth = pageWidth - PAGE_MARGIN * 2;
    const colWidth = tableWidth / GRID_COLUMNS;
    let colIndex = 0;
    let maxHeight = LINE_HEIGHT * 2;
    for (const cell of row.cells) {
      const span = Math.min(cell.colSpan ?? 1, GRID_COLUMNS - colIndex);
      const width = colWidth * span;
      colIndex += span;
      maxHeight = Math.max(maxHeight, measureCellHeight(pdf, width, cell.label, cell.text));
    }
    y = ensurePageSpace(pdf, y, maxHeight);
    const result = drawTableRow(pdf, y, pageWidth, row.cells);
    y = result.y;
  }

  for (const section of table.supportSections) {
    y = drawBulletedSection(pdf, y, pageWidth, section.heading, section.items);
  }

  return pdf.output("blob");
}

export function buildPocFileName(response: ClientPocGenerationResponse): string {
  const raw = response.fileName?.trim();
  if (raw) {
    return raw.toLowerCase().endsWith(".pdf") ? raw : `${raw}.pdf`;
  }
  return "plan-of-care.pdf";
}

export function downloadPocPdfFromBlob(
  blob: Blob,
  fileName: string,
): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  // Defer revocation so the browser has started the download before the URL is
  // invalidated (synchronous revoke can cancel the download in some browsers).
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function downloadPocPdf(response: ClientPocGenerationResponse): Promise<void> {
  const blob = await buildPocPdfBlob(response);
  downloadPocPdfFromBlob(blob, buildPocFileName(response));
}

export function pocBlobToFile(blob: Blob, response: ClientPocGenerationResponse): File {
  return new File([blob], buildPocFileName(response), { type: "application/pdf" });
}

export async function pocResponseToFile(
  response: ClientPocGenerationResponse,
): Promise<File> {
  const blob = await buildPocPdfBlob(response);
  return pocBlobToFile(blob, response);
}
