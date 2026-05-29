import { format } from "date-fns";

export function buildPayrollInvoiceFilename(staffName: string) {
  const safe = staffName.trim().replace(/\s+/g, "_").replace(/[^\w-]/g, "") || "staff";
  return `${safe}_payroll_invoice_${format(new Date(), "yyyy-MM-dd")}.pdf`;
}

export async function downloadPayrollInvoicePdf(root: HTMLElement, staffName: string) {
  const offscreen = document.createElement("div");
  offscreen.setAttribute("aria-hidden", "true");
  offscreen.style.cssText = "position:fixed;left:-10000px;top:0;background:#fff;";

  const clone = root.cloneNode(true) as HTMLElement;
  clone.style.overflow = "visible";
  clone.style.maxHeight = "none";

  clone.querySelectorAll(".payroll-invoice-no-print").forEach((el) => el.remove());

  const scrollBody = clone.querySelector(".payroll-invoice-modal-body") as HTMLElement | null;
  if (scrollBody) {
    scrollBody.style.overflow = "visible";
    scrollBody.style.maxHeight = "none";
    scrollBody.style.height = "auto";
  }

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
      position -= usableHeight;
      pdf.addPage();
      pdf.addImage(imageData, "JPEG", PDF_MARGIN_MM, position, imgWidth, imgHeight);
      heightLeft -= usableHeight;
    }

    pdf.save(buildPayrollInvoiceFilename(staffName));
  } finally {
    offscreen.remove();
  }
}
