// How good is the mesh at the edge of the map?
//
// For globes and world projections the regular display grid leaves a
// staircase at the limb or outline, a hole round a pole, and texture placed
// several pixels wrong where the projection curves hardest. This measures
// that, for the plain grid at 64, 128 and 256 and for the refined grid
// (src/engine/refine.ts) on a 64 base, and checks the refined one:
//
//   missed   share of on-map pixels the mesh does not cover
//   extra    share of off-map pixels it covers anyway
//   err      how far from its true place the texture is drawn, in screen
//            pixels: each sample pixel's interpolated texture coordinate is
//            taken back through the source and display CRSs and measured
//            against the pixel (p50, p99, p99.9, max)
//
// The source is a global lon/lat texture, or a Web Mercator one (which
// stops at 85 degrees); the canvas is 1000 x 800 with the whole map in view.
// Sampling is every 2 pixels.
//
//   node tools/check-mesh.mjs
import { build } from 'esbuild';
import { unlinkSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const require = createRequire(import.meta.url);
const entry = join(root, '.mesh-entry.ts');
const bundle = join(root, '.mesh-check.cjs');
writeFileSync(entry, [
  "export * from './src/core/crs';",
  "export * from './src/core/transform';",
  "export * from './src/core/centred';",
  "export * from './src/engine/mesh';",
  "export * from './src/engine/uv';",
  "export * from './src/engine/refine';",
  "export { default as proj4 } from 'proj4';"
].join('\n') + '\n');
try {
  await build({ entryPoints: [entry], bundle: true, format: 'cjs', platform: 'node', outfile: bundle, logLevel: 'error' });
} finally {
  unlinkSync(entry);
}
const w = require(bundle);
unlinkSync(bundle);
w.registerProjections();

const W = 1000, H = 800, STEP = 2;
const R = 6378137, M = Math.PI * R;
const SOURCES = {
  lonlat: { crs: 'EPSG:4326', bounds: { minX: -180, minY: -90, maxX: 180, maxY: 90 } },
  merc: { crs: 'EPSG:3857', bounds: { minX: -M, minY: -M, maxX: M, maxY: M } }
};
const P = w.CENTRED_PRESETS;
// name, display CRS, width and height of the view in display units, source
const cases = [
  ['orthographic', w.centredCRS(P.ortho.template, 147, -42), 2 * R, 2 * R],
  ['orthographic, south pole', w.centredCRS(P.ortho.template, 0, -90), 2 * R, 2 * R],
  ['tilted perspective', '+proj=tpers +h=3000000 +tilt=30 +azi=20 +lon_0=147 +lat_0=-42 +x_0=0 +y_0=0 +ellps=WGS84 +units=m +no_defs', 6.0e6, 6.0e6],
  ['Equal Earth', w.centredCRS(P.eqearth.template, 150, 0), 34.5e6, 16.8e6],
  ['Winkel Tripel', w.centredCRS(P.wintri.template, 150, 0), 36.0e6, 20.0e6],
  ['sinusoidal', w.centredCRS(P.sinu.template, 150, 0), 40.1e6, 20.0e6],
  // Edges that are not the edge of the Earth: the interruptions of the
  // homolosine are straight cuts, and so is the top and bottom of an oblique
  // Mercator (where its strip would repeat). Over Web Mercator imagery the
  // view also has the texture's own edge at 85 degrees round each pole.
  ['interrupted homolosine', w.centredCRS(P.igh.template, 0, 0), 40.1e6, 18.0e6],
  ['oblique Mercator, Web Mercator source', w.centredCRS(P.omerc.template, 58, 28.6), 45e6, 36e6, 'merc']
];

/** Barycentric lookup of the texture coordinate under a screen pixel. */
function locator(g, s) {
  const B = 8, bw = Math.ceil(W / B), bh = Math.ceil(H / B);
  const buckets = Array.from({ length: bw * bh }, () => []);
  const sx = (x) => x * s + W / 2, sy = (y) => H / 2 - y * s;
  const p = g.positions, uv = g.texCoords;
  for (let t = 0; t < g.triangleCount; t++) {
    const xs = [sx(p[t * 9]), sx(p[t * 9 + 3]), sx(p[t * 9 + 6])];
    const ys = [sy(p[t * 9 + 1]), sy(p[t * 9 + 4]), sy(p[t * 9 + 7])];
    const x0 = Math.max(0, Math.floor(Math.min(...xs) / B)), x1 = Math.min(bw - 1, Math.floor(Math.max(...xs) / B));
    const y0 = Math.max(0, Math.floor(Math.min(...ys) / B)), y1 = Math.min(bh - 1, Math.floor(Math.max(...ys) / B));
    for (let by = y0; by <= y1; by++) for (let bx = x0; bx <= x1; bx++) buckets[by * bw + bx].push(t);
  }
  return (px, py) => {
    for (const t of buckets[Math.floor(py / B) * bw + Math.floor(px / B)]) {
      const ax = sx(p[t * 9]), ay = sy(p[t * 9 + 1]), bx = sx(p[t * 9 + 3]), by = sy(p[t * 9 + 4]);
      const cx = sx(p[t * 9 + 6]), cy = sy(p[t * 9 + 7]);
      const d = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy);
      if (Math.abs(d) < 1e-12) continue;
      const l1 = ((by - cy) * (px - cx) + (cx - bx) * (py - cy)) / d;
      const l2 = ((cy - ay) * (px - cx) + (ax - cx) * (py - cy)) / d;
      const l3 = 1 - l1 - l2;
      if (l1 >= -1e-9 && l2 >= -1e-9 && l3 >= -1e-9) {
        return [l1 * uv[t * 6] + l2 * uv[t * 6 + 2] + l3 * uv[t * 6 + 4],
          l1 * uv[t * 6 + 1] + l2 * uv[t * 6 + 3] + l3 * uv[t * 6 + 5]];
      }
    }
    return null;
  };
}

function measure(g, geo, s, tol, src) {
  const toLonLat = w.proj4(src.crs, 'EPSG:4326');
  const fromLonLat = w.proj4('EPSG:4326', src.crs);
  const { minX: bx0, minY: by0, maxX: bx1, maxY: by1 } = src.bounds;
  const find = locator(g, s);
  let valid = 0, missed = 0, extra = 0;
  const errs = [];
  for (let y = STEP / 2; y < H; y += STEP) {
    for (let x = STEP / 2; x < W; x += STEP) {
      const dx = (x - W / 2) / s, dy = -(y - H / 2) / s;
      const ll = geo.toGeoSync(new Float64Array([dx, dy]));
      const bk = geo.fromGeoSync(ll);
      let on = isFinite(ll[0]) && isFinite(bk[0]) && Math.hypot(bk[0] - dx, bk[1] - dy) < tol;
      if (on) {
        // and inside the texture, which the shader draws nothing beyond
        const sy = fromLonLat.forward([ll[0], ll[1]])[1];
        on = sy >= by0 && sy <= by1;
      }
      let uv = find(x, y);
      if (uv && (uv[1] < 0 || uv[1] > 1)) uv = null;
      if (on) valid++;
      if (on && !uv) { missed++; continue; }
      if (!on && uv) { extra++; continue; }
      if (!uv) continue;
      const [lon, lat] = toLonLat.forward([bx0 + (((uv[0] % 1) + 1) % 1) * (bx1 - bx0), by1 - uv[1] * (by1 - by0)]);
      const d = geo.fromGeoSync(new Float64Array([lon, lat]));
      const e = Math.hypot(d[0] - dx, d[1] - dy) * s;
      // A pixel within a pixel of the edge can interpolate to just over
      // it, where the forward projection has no answer: count it as 1 px.
      errs.push(isFinite(e) ? e : 1);
    }
  }
  errs.sort((a, b) => a - b);
  const q = (f) => (errs.length ? errs[Math.min(errs.length - 1, Math.floor(f * errs.length))] : NaN);
  return { missed: missed / valid, extra: extra / valid, p50: q(0.5), p99: q(0.99), p999: q(0.999), max: q(1) };
}

let failures = 0;
const pct = (v) => `${(100 * v).toFixed(2)}%`.padStart(6);
const f2 = (v) => v.toFixed(2).padStart(5);
for (const [name, crs, mw, mh, srcName = 'lonlat'] of cases) {
  const src = SOURCES[srcName], SRC = src.crs, SB = src.bounds;
  const geo = w.geoTransform(crs);
  const s = Math.min(W / (mw * 1.02), H / (mh * 1.02));
  const hw = W / 2 / s, hh = H / 2 / s;
  const rect = [-hw, -hh, hw, hh];
  console.log(`\n${name}: ${crs}`);
  const row = (label, g, ms, m) => console.log(
    `  ${label.padEnd(12)} ${String(g.triangleCount).padStart(6)} tris ${ms.toFixed(0).padStart(4)} ms` +
    `  missed ${pct(m.missed)}  extra ${pct(m.extra)}  err px ${f2(m.p50)} ${f2(m.p99)} ${f2(m.p999)} ${f2(m.max)}`);
  for (const n of [64, 128, 256]) {
    const grid = w.generateGridMesh(rect, n, Math.round(n * H / W));
    const tol = (2 * hw / n) * 1e-2;
    const t0 = performance.now();
    const g = w.buildLayerGeometry(grid.positions, grid.indices, crs, SRC, SB, tol, true, null);
    row(`grid ${n}`, g, performance.now() - t0, measure(g, geo, s, tol, src));
  }
  const grid = w.generateGridMesh(rect, 64, Math.round(64 * H / W));
  const tol = (2 * hw / 64) * 1e-2;
  const opts = {
    sourceCRS: SRC, sourceBounds: SB, tolerance: tol, wrapU: true, wrap: null,
    pxSize: 1 / s, maxErrorPx: 0.5, minCellPx: 2
  };
  w.refineSync(grid, geo, opts);   // once to warm up, as the plain grids were by the grid 64 run
  const t0 = performance.now();
  const g = w.refineSync(grid, geo, opts);
  const ms = performance.now() - t0;
  const m = measure(g, geo, s, tol, src);
  row('refined 64', g, ms, m);
  const ok = m.missed < 0.002 && m.extra < 0.002 && m.p99 < 0.6;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}: refined mesh within 0.2% coverage and p99 < 0.6 px`);
  if (!ok) failures++;
}
console.log(failures ? `\n${failures} check(s) failed` : '\nall mesh checks passed');
process.exit(failures ? 1 : 0);
