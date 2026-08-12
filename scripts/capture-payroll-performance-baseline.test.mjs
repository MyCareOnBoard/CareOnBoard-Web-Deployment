import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  createAssetMap,
  createGzipStaticServer,
} from "./capture-payroll-performance-baseline.mjs";

test("createAssetMap maps emitted JavaScript assets to their immutable build paths", async (t) => {
  // Production break caught: a manifest parser that omits an emitted script would
  // silently exclude that shipping asset from the performance baseline.
  const buildDir = await mkdtemp(join(tmpdir(), "payroll-baseline-assets-"));
  t.after(() => rm(buildDir, { recursive: true, force: true }));
  await mkdir(join(buildDir, ".vite"), { recursive: true });
  await writeFile(join(buildDir, ".vite", "manifest.json"), JSON.stringify({
    "index.html": { file: "assets/index-a1b2c3.js", imports: ["assets/vendor-d4e5f6.js"] },
    "assets/vendor.ts": { file: "assets/vendor-d4e5f6.js" },
  }));
  await writeFile(join(buildDir, "assets", "index-a1b2c3.js"), "console.log('entry');", { flag: "w" }).catch(async () => {
    await mkdir(join(buildDir, "assets"), { recursive: true });
    await writeFile(join(buildDir, "assets", "index-a1b2c3.js"), "console.log('entry');");
  });
  await writeFile(join(buildDir, "assets", "vendor-d4e5f6.js"), "console.log('vendor');");

  const assets = await createAssetMap(buildDir);

  assert.deepEqual(Object.keys(assets).sort(), ["/assets/index-a1b2c3.js", "/assets/vendor-d4e5f6.js"]);
  assert.equal(assets["/assets/index-a1b2c3.js"].gzipBytes > 0, true);
  assert.equal(assets["/assets/vendor-d4e5f6.js"].bytes, 22);
});

test("gzip static server returns level-six gzip responses with transfer headers", async (t) => {
  // Production break caught: serving uncompressed assets would make transfer-size
  // baselines incomparable with the shipping budget's encoded script bytes.
  const buildDir = await mkdtemp(join(tmpdir(), "payroll-baseline-server-"));
  t.after(() => rm(buildDir, { recursive: true, force: true }));
  await mkdir(join(buildDir, "assets"), { recursive: true });
  await writeFile(join(buildDir, "assets", "app.js"), "export const payroll = 'baseline';\n".repeat(32));

  const server = await createGzipStaticServer(buildDir);
  t.after(() => server.close());
  const response = await fetch(`${server.url}/assets/app.js`, { headers: { "accept-encoding": "gzip" } });

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-encoding"), "gzip");
  assert.equal(response.headers.get("vary"), "Accept-Encoding");
  assert.equal(Number(response.headers.get("content-length")) > 0, true);
  assert.match(response.headers.get("content-type") ?? "", /javascript/);
});
