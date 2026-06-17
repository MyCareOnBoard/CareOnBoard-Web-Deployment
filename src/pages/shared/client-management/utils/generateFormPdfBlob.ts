/**
 * Render a DOM node (an on-site intake form) to a single-page PDF Blob. The page
 * uses A4 width and a height sized to the content, so the form is never split or
 * clipped at a page boundary. The node is cloned off-screen at a fixed width so
 * the export looks the same regardless of the device the agency user is on.
 * Mirrors the billing claim-report print approach (html2canvas + jsPDF), but
 * returns a Blob so the caller can download it or wrap it as the client's POC File.
 */
export async function generateFormPdfBlob(
  root: HTMLElement,
  opts: { width?: number } = {},
): Promise<Blob> {
  const width = opts.width ?? 820;

  const offscreen = document.createElement("div");
  offscreen.setAttribute("aria-hidden", "true");
  offscreen.style.cssText = `position:fixed;left:-10000px;top:0;background:#ffffff;width:${width}px;padding:24px;`;

  const clone = root.cloneNode(true) as HTMLElement;
  clone.style.overflow = "visible";
  clone.style.maxHeight = "none";
  clone.style.height = "auto";
  clone.style.width = `${width}px`;

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
      windowWidth: width,
      width,
      height: clone.scrollHeight,
      windowHeight: clone.scrollHeight,
    });

    const A4_WIDTH_MM = 210;
    const MARGIN = 10;
    const imgWidth = A4_WIDTH_MM - MARGIN * 2;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    // Single page sized to the content height (A4 width) so the form is never
    // split or clipped at a page boundary.
    const pageHeight = imgHeight + MARGIN * 2;
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: [A4_WIDTH_MM, pageHeight],
    });
    const imageData = canvas.toDataURL("image/jpeg", 0.95);
    pdf.addImage(imageData, "JPEG", MARGIN, MARGIN, imgWidth, imgHeight);

    return pdf.output("blob");
  } finally {
    offscreen.remove();
  }
}
