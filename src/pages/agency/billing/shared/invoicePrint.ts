import { format } from "date-fns";

export function buildInvoiceFilename(name: string, docType = "invoice") {
  const safe = name.trim().replace(/\s+/g, "_").replace(/[^\w-]/g, "") || "document";
  return `${safe}_${docType}_${format(new Date(), "yyyy-MM-dd")}.pdf`;
}

export async function downloadInvoicePdf(
  root: HTMLElement,
  name: string,
  docType = "invoice",
) {
  const offscreen = document.createElement("div");
  offscreen.setAttribute("aria-hidden", "true");
  offscreen.style.cssText = "position:fixed;left:-10000px;top:0;background:#fff;";

  const clone = root.cloneNode(true) as HTMLElement;
  clone.style.overflow = "visible";
  clone.style.maxHeight = "none";

  clone.querySelectorAll(".invoice-no-print").forEach((element) => element.remove());

  const scrollBody = clone.querySelector(".invoice-modal-body") as HTMLElement | null;
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
    const margin = 10;
    const imageWidth = pageWidth - margin * 2;
    const usableHeight = pageHeight - margin * 2;
    const imageHeight = (canvas.height * imageWidth) / canvas.width;
    const imageData = canvas.toDataURL("image/jpeg", 0.98);

    let heightLeft = imageHeight;
    let position = margin;

    pdf.addImage(imageData, "JPEG", margin, position, imageWidth, imageHeight);
    heightLeft -= usableHeight;

    while (heightLeft > 0) {
      position -= usableHeight;
      pdf.addPage();
      pdf.addImage(imageData, "JPEG", margin, position, imageWidth, imageHeight);
      heightLeft -= usableHeight;
    }

    pdf.save(buildInvoiceFilename(name, docType));
  } finally {
    offscreen.remove();
  }
}
