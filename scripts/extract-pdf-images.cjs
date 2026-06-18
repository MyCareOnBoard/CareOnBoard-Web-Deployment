// One-off helper: extract the per-page JPEG images that jsPDF embedded in a PDF
// so they can be viewed directly (no PDF rasterizer needed). Usage:
//   node scripts/extract-pdf-images.cjs <pdf> <outDir>
const fs = require("fs");
const path = require("path");

const pdfPath = process.argv[2];
const outDir = process.argv[3] || path.join(path.dirname(pdfPath), "pdf-pages");
const buf = fs.readFileSync(pdfPath);
const s = buf.toString("latin1");
fs.mkdirSync(outDir, { recursive: true });

const pageCount = (s.match(/\/Type\s*\/Page[^s]/g) || []).length;

// Find each image XObject dict and slice out its DCTDecode (JPEG) stream by /Length.
const imgRe = /\/Subtype\s*\/Image[\s\S]*?\/Length\s+(\d+)[\s\S]*?>>\s*stream\r?\n/g;
const wRe = /\/Width\s+(\d+)/;
const hRe = /\/Height\s+(\d+)/;
let m;
let n = 0;
const out = [];
while ((m = imgRe.exec(s)) !== null) {
  const dict = s.slice(m.index, imgRe.lastIndex);
  const len = parseInt(m[1], 10);
  const streamStart = imgRe.lastIndex;
  const bytes = buf.subarray(streamStart, streamStart + len);
  const file = path.join(outDir, `page-${String(n + 1).padStart(2, "0")}.jpg`);
  fs.writeFileSync(file, bytes);
  const w = (dict.match(wRe) || [])[1];
  const h = (dict.match(hRe) || [])[1];
  out.push({ file, width: Number(w), height: Number(h), bytes: len });
  n += 1;
}

console.log(JSON.stringify({ pdf: pdfPath, pageCount, imagesExtracted: n, images: out }, null, 2));
