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
  opts: { width?: number; paged?: boolean } = {},
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
    // Wait for embedded images (e.g. captured signatures) to finish decoding so
    // the measured height is correct and the bottom of the form isn't clipped.
    await Promise.all(
      Array.from(clone.querySelectorAll("img")).map((img) =>
        img.complete
          ? Promise.resolve()
          : new Promise<void>((res) => {
              img.addEventListener("load", () => res(), { once: true });
              img.addEventListener("error", () => res(), { once: true });
            }),
      ),
    );
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
    const A4_HEIGHT_MM = 297;
    const MARGIN_X = 10;
    const MARGIN_Y = 6;
    const imgWidth = A4_WIDTH_MM - MARGIN_X * 2;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    const imageData = canvas.toDataURL("image/jpeg", 0.95);

    // Paged: lay the form across standard A4 pages, breaking only at content-block
    // boundaries (elements marked [data-pdf-block]) so a row or section is never
    // split mid-content across a page boundary. Each page is cropped from the full
    // render so nothing from the next block bleeds into the current page.
    if (opts.paged) {
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const MARGIN_TOP = 8;
      const fullH = canvas.height;
      const pxPerMm = canvas.width / imgWidth;
      const pageContentPx = (A4_HEIGHT_MM - MARGIN_TOP * 2) * pxPerMm;

      // Measure block boundaries (in canvas px) from the still-attached clone.
      // Keep only outermost blocks (drop any nested inside another marked block,
      // e.g. rows inside a medication card) so boundaries never overlap.
      const pxScale = fullH / clone.scrollHeight;
      const cloneTop = clone.getBoundingClientRect().top;
      const blocks = Array.from(clone.querySelectorAll<HTMLElement>("[data-pdf-block]"))
        .filter((el) => !el.parentElement?.closest("[data-pdf-block]"))
        .map((el) => {
          const r = el.getBoundingClientRect();
          return {
            top: (r.top - cloneTop) * pxScale,
            bottom: (r.bottom - cloneTop) * pxScale,
            keepNext: el.dataset.pdfKeepNext === "1",
            breakBefore: el.dataset.pdfBreakBefore === "1",
          };
        })
        .filter((b) => b.bottom > b.top)
        .sort((a, b) => a.top - b.top);

      // Greedily pack whole blocks onto each page; the page ends at the bottom of
      // the last block that fits. A "keep with next" block (a heading) is pushed to
      // the next page rather than stranded at the bottom. An oversized block (taller
      // than a page) is the only thing allowed to be sliced internally.
      const slices: Array<{ start: number; end: number }> = [];
      if (blocks.length === 0) {
        for (let start = 0; start < fullH; start += pageContentPx) {
          slices.push({ start, end: Math.min(fullH, start + pageContentPx) });
        }
      } else {
        let start = 0;
        let idx = 0;
        while (idx < blocks.length) {
          const limit = start + pageContentPx;
          let j = idx;
          let end = start;
          while (j < blocks.length && blocks[j].bottom <= limit) {
            // A block flagged break-before forces a new page (unless it is already
            // the first block on this page, which would make no progress).
            if (j > idx && blocks[j].breakBefore) break;
            end = blocks[j].bottom;
            j += 1;
          }
          if (j === idx) {
            // Single block taller than a page — slice within it.
            end = limit;
          } else {
            // Don't strand a heading at the bottom of a page. Defer ALL trailing
            // "keep with next" blocks (handles a section heading immediately
            // followed by a sub-heading), while keeping at least one block here.
            let lastPlaced = j - 1;
            while (lastPlaced > idx && blocks[lastPlaced].keepNext) lastPlaced -= 1;
            j = lastPlaced + 1;
            // End the page just before the next block — including this block's
            // trailing margin (whitespace) — so content drawn just below a block's
            // text baseline (e.g. the absolutely-positioned checkbox boxes, which
            // sit a few px below the measured box) isn't clipped. The final block
            // extends to the canvas bottom to capture its trailing padding.
            end = j < blocks.length ? blocks[j].top : fullH;
          }
          slices.push({ start, end });
          start = end;
          idx = j;
        }
      }

      let pageDrawn = false;
      for (const slice of slices) {
        // Round both edges of the seam the same way so adjacent pages neither
        // overlap (a duplicated 1px band) nor leave a gap at the break.
        const sliceTop = Math.max(0, Math.round(slice.start));
        const sliceBottom = Math.min(fullH, Math.round(slice.end));
        const sliceH = sliceBottom - sliceTop;
        if (sliceH <= 0) continue;
        const pageCanvas = document.createElement("canvas");
        pageCanvas.width = canvas.width;
        pageCanvas.height = sliceH;
        const ctx = pageCanvas.getContext("2d");
        if (ctx) {
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, canvas.width, sliceH);
          ctx.drawImage(canvas, 0, sliceTop, canvas.width, sliceH, 0, 0, canvas.width, sliceH);
        }
        if (pageDrawn) pdf.addPage();
        pdf.addImage(
          pageCanvas.toDataURL("image/jpeg", 0.95),
          "JPEG",
          MARGIN_X,
          MARGIN_TOP,
          imgWidth,
          sliceH / pxPerMm,
        );
        pageDrawn = true;
      }
      if (!pageDrawn) {
        pdf.addImage(imageData, "JPEG", MARGIN_X, MARGIN_TOP, imgWidth, imgHeight);
      }

      return pdf.output("blob");
    }

    // Default: single page sized to the content height (A4 width) so the form is
    // never split or clipped at a page boundary.
    const pageHeight = imgHeight + MARGIN_Y * 2;
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: [A4_WIDTH_MM, pageHeight],
    });
    pdf.addImage(imageData, "JPEG", MARGIN_X, MARGIN_Y, imgWidth, imgHeight);

    return pdf.output("blob");
  } finally {
    offscreen.remove();
  }
}
