/** Scroll to and focus the POC upload input on Stage 3. */
export function scrollToPocUpload() {
  const el = document.getElementById("doc-upload-poc");
  el?.scrollIntoView({ behavior: "smooth", block: "center" });
  el?.focus?.();
}
