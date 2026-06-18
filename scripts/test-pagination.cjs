// Deterministic test of the page-slicing logic in generateFormPdfBlob's paged
// branch. Verifies that no block ever straddles a page boundary and that
// consecutive slices are contiguous (no overlap, no gap). Pure logic, no DOM.

function pack(blocks, pageContentPx, fullH) {
  if (fullH == null) fullH = blocks.length ? blocks[blocks.length - 1].bottom + 48 : 0;
  const slices = [];
  let start = 0;
  let idx = 0;
  let guard = 0;
  while (idx < blocks.length) {
    if (++guard > 100000) throw new Error("INFINITE LOOP");
    const limit = start + pageContentPx;
    let j = idx;
    let end = start;
    while (j < blocks.length && blocks[j].bottom <= limit) {
      if (j > idx && blocks[j].breakBefore) break;
      end = blocks[j].bottom;
      j += 1;
    }
    if (j === idx) {
      end = limit; // oversized block sliced internally
    } else {
      let lastPlaced = j - 1;
      while (lastPlaced > idx && blocks[lastPlaced].keepNext) lastPlaced -= 1;
      j = lastPlaced + 1;
      end = j < blocks.length ? blocks[j].top : fullH;
    }
    slices.push({ start, end });
    start = end;
    idx = j;
  }
  return slices;
}

function check(name, blocks, pageContentPx) {
  const slices = pack(blocks, pageContentPx);
  const problems = [];

  // Contiguity: each slice starts exactly where the previous ended.
  for (let i = 1; i < slices.length; i++) {
    if (Math.abs(slices[i].start - slices[i - 1].end) > 1e-6) {
      problems.push(`slice ${i} start ${slices[i].start} != prev end ${slices[i - 1].end} (gap/overlap)`);
    }
  }

  // No block straddles a slice boundary, UNLESS it is genuinely oversized
  // (taller than one page), which is the only case allowed to be split.
  const cuts = slices.map((s) => s.end); // internal boundaries
  for (const b of blocks) {
    const oversized = b.bottom - b.top > pageContentPx + 1e-6;
    for (let k = 0; k < cuts.length - 1; k++) {
      const cut = cuts[k];
      if (b.top < cut - 1e-6 && b.bottom > cut + 1e-6) {
        if (!oversized) problems.push(`block [${b.top.toFixed(1)},${b.bottom.toFixed(1)}] straddles cut ${cut.toFixed(1)}`);
      }
    }
  }

  console.log(`${problems.length ? "FAIL" : "ok  "} ${name} (${slices.length} pages)` + (problems.length ? "\n   - " + problems.join("\n   - ") : ""));
  return problems.length === 0;
}

// pxPerMm ~ 8.63, page content ~2425px (matches the real 1640px-wide render).
const PAGE = 2425;

// A doc whose rows are ~ a real form: many short rows + a couple headings.
function buildRows(specs) {
  // specs: array of {h, keepNext?} ; gap=18 between blocks
  const blocks = [];
  let y = 0;
  for (const s of specs) {
    blocks.push({ top: y, bottom: y + s.h, keepNext: !!s.keepNext, breakBefore: !!s.breakBefore });
    y += s.h + 18;
  }
  return blocks;
}

let allOk = true;

// Real-ish: 16 sections, each a keepNext heading (~30px) + several ~40px rows,
// plus two keepNext sub-headers in section 10.
{
  const specs = [];
  for (let sec = 1; sec <= 16; sec++) {
    specs.push({ h: 34, keepNext: true }); // section heading
    if (sec === 10) {
      specs.push({ h: 24, keepNext: true }); // "Respiratory" sub-header
      for (let r = 0; r < 3; r++) specs.push({ h: 40 });
      specs.push({ h: 24, keepNext: true }); // "Cardiovascular" sub-header
      for (let r = 0; r < 3; r++) specs.push({ h: 40 });
    } else {
      const rows = 3 + (sec % 5);
      for (let r = 0; r < rows; r++) specs.push({ h: 40 });
    }
  }
  allOk = check("real-ish 16 sections", buildRows(specs), PAGE) && allOk;
}

// Adjacent keep-next blocks right at a boundary (the Section 10 stranding case).
{
  const specs = [];
  // fill ~ to near a page bottom with rows
  for (let r = 0; r < 58; r++) specs.push({ h: 40 });
  specs.push({ h: 34, keepNext: true }); // SectionTitle
  specs.push({ h: 24, keepNext: true }); // sub-header
  for (let r = 0; r < 5; r++) specs.push({ h: 40 });
  allOk = check("adjacent keep-next at boundary", buildRows(specs), PAGE) && allOk;
}

// break-before forces a new page even when the block would otherwise fit.
{
  const blocks = buildRows([
    { h: 40 }, { h: 40 }, { h: 40 },
    { h: 34, keepNext: true, breakBefore: true }, // forced to a new page
    { h: 40 }, { h: 40 },
  ]);
  const slices = pack(blocks, PAGE);
  const sliceOf = (b) => slices.findIndex((s) => b.top >= s.start - 1e-6 && b.bottom <= s.end + 1e-6);
  // The forced block must land on a later page than the block before it.
  const movedDown = sliceOf(blocks[3]) > sliceOf(blocks[2]) && sliceOf(blocks[2]) >= 0;
  console.log(`${movedDown ? "ok  " : "FAIL"} break-before starts a new page (${slices.length} pages)`);
  if (!movedDown) allOk = false;
  check("break-before integrity", blocks, PAGE);
}

// Oversized single block (taller than a page) — allowed to split.
{
  const blocks = [{ top: 0, bottom: 60, keepNext: false }, { top: 80, bottom: 80 + 5000, keepNext: false }, { top: 5100, bottom: 5150, keepNext: false }];
  allOk = check("oversized block", blocks, PAGE) && allOk;
}

// Randomized fuzz.
let seed = 12345;
const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
for (let t = 0; t < 500; t++) {
  const specs = [];
  const n = 20 + Math.floor(rnd() * 120);
  for (let i = 0; i < n; i++) specs.push({ h: 20 + Math.floor(rnd() * 80), keepNext: rnd() < 0.15 });
  if (!check(`fuzz ${t}`, buildRows(specs), PAGE)) { allOk = false; break; }
}

console.log(allOk ? "\nALL PASS" : "\nFAILURES FOUND");
process.exit(allOk ? 0 : 1);
