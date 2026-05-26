import { format } from "date-fns";

export function buildClaimReportFilename(clientName: string) {
  const safe = clientName.trim().replace(/\s+/g, "_").replace(/[^\w-]/g, "") || "client";
  return `${safe}_claim_report_${format(new Date(), "yyyy-MM-dd")}.pdf`;
}

function centerForPdf(el: HTMLElement, display: "grid" | "inline-grid" = "grid") {
  el.style.display = display;
  el.style.placeItems = "center";
  el.style.lineHeight = "1";
}

function applyPdfAlignmentFixes(root: HTMLElement) {
  root.querySelectorAll<HTMLElement>(".cr-badge").forEach((el) => centerForPdf(el, "inline-grid"));

  root.querySelectorAll<HTMLElement>(".h-14.w-14.rounded-full").forEach((avatar) => {
    centerForPdf(avatar);
    avatar.querySelectorAll<HTMLElement>("span").forEach((span) => centerForPdf(span));
  });

  root.querySelectorAll<HTMLElement>('[data-section="condition"] .flex').forEach((row) => {
    row.style.display = "grid";
    row.style.gridTemplateColumns = "1fr auto";
    row.style.alignItems = "center";
    row.querySelector<HTMLElement>(".cr-row-label")?.style.setProperty("line-height", "20px");
    row.querySelectorAll<HTMLElement>("label").forEach((label) => {
      centerForPdf(label);
      label.querySelectorAll<HTMLElement>("span").forEach((box) => centerForPdf(box));
    });
  });

  root.querySelectorAll<HTMLElement>('[data-section="outside-lab"] label').forEach((label) => {
    centerForPdf(label);
  });
  root
    .querySelectorAll<HTMLElement>('[data-section="outside-lab"] [data-slot="radio-group-item"]')
    .forEach((item) => centerForPdf(item));
}

export async function downloadClaimReportPdf(root: HTMLElement, clientName: string) {
  const offscreen = document.createElement("div");
  offscreen.setAttribute("aria-hidden", "true");
  offscreen.style.cssText = "position:fixed;left:-10000px;top:0;background:#fff;";

  const clone = root.cloneNode(true) as HTMLElement;
  clone.style.overflow = "visible";
  clone.style.maxHeight = "none";

  clone.querySelectorAll(".claim-report-no-print").forEach((el) => el.remove());

  const scrollBody = clone.querySelector(".claim-report-modal-body") as HTMLElement | null;
  if (scrollBody) {
    scrollBody.style.overflow = "visible";
    scrollBody.style.maxHeight = "none";
    scrollBody.style.height = "auto";
  }

  applyPdfAlignmentFixes(clone);

  offscreen.style.width = `${root.offsetWidth}px`;
  offscreen.appendChild(clone);
  document.body.appendChild(offscreen);

  try {
    const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
      import("html2canvas"),
      import("jspdf"),
    ]);

    await document.fonts.ready;
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    });

    const canvas = await html2canvas(clone, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: "#ffffff",
      windowHeight: clone.scrollHeight,
      height: clone.scrollHeight,
      width: clone.scrollWidth,
    });

    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const PDF_MARGIN_MM = 10;
    const imgWidth = pageWidth - PDF_MARGIN_MM * 2;
    const usableHeight = pageHeight - PDF_MARGIN_MM * 2;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    const imageData = canvas.toDataURL("image/jpeg", 0.98);

    let heightLeft = imgHeight;
    let position = PDF_MARGIN_MM;

    pdf.addImage(imageData, "JPEG", PDF_MARGIN_MM, position, imgWidth, imgHeight);
    heightLeft -= usableHeight;

    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imageData, "JPEG", PDF_MARGIN_MM, position, imgWidth, imgHeight);
      heightLeft -= usableHeight;
    }

    pdf.save(buildClaimReportFilename(clientName));
  } finally {
    offscreen.remove();
  }
}
