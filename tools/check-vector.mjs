// Hold the vector side to PROJ.
//
// 1. Readers: the three samples in public/samples/ read back with the
//    feature counts, kinds and CRS their writer (make-samples.mjs) gave them.
//    The FlatGeobuf sample is also the CRS round trip: written with code
//    3031, it must read back as EPSG:3031.
//
// 2. Densification: lines that are straight in one CRS are densified into
//    another by wgis (proj4js), then every drawn segment is checked with
//    PROJ (in wasm): take its two display points back to the layer CRS, go
//    half way in layer coordinates, project that with PROJ, and measure how
//    far it lands from the drawn chord. It must be within the tolerance the
//    densifier was given (with a little slack for proj4js vs PROJ). A
//    segment drawn across a projection break fails this by a mile, so the
//    same test proves cuts happened where they should. Each case also states
//    what should be visible (how many pieces, where they end).
//
// 3. Paste: features moved into a layer in another CRS keep their shape,
//    checked the same way (every pasted edge, straight in the target CRS,
//    against the source edge it stands for, with PROJ). Rings that have no
//    place in the target are dropped and counted, not mangled.
//
// 4. Saves: FlatGeobuf reads back in the layer's CRS with the same
//    coordinates and attributes; GeoJSON reads back in lon/lat where PROJ
//    puts the vertices.
//
// 5. Vertex edits: moving, adding and removing vertices keep rings closed
//    and refuse to make a ring or line too small.
//
//   node tools/check-vector.mjs
import { build } from 'esbuild';
import { readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as proj from 'proj-wasm';
import { parquetWriteBuffer } from 'hyparquet-writer';

const root = dirname(dirname(fileURLToPath(import.meta.url)));

// proj-wasm listens for uncaughtException and unhandledRejection, which
// turns off Node's own crash on them: an error thrown here would stop the
// script silently with exit 0. So fail unless the end is reached, and say
// what went wrong.
process.exitCode = 1;
const stopped = (e) => {
  console.log(`FAIL check-vector stopped: ${e && e.stack ? e.stack : e}`);
  process.exit(1);
};
process.on('uncaughtException', stopped);
process.on('unhandledRejection', stopped);
const require = createRequire(import.meta.url);

const entry = join(root, '.vector-entry.ts');
const bundle = join(root, '.vector-check.cjs');
writeFileSync(entry, [
  "export * from './src/vector/read';",
  "export * from './src/vector/densify';",
  "export * from './src/vector/project';",
  "export * from './src/core/crs';",
  "export * from './src/vector/reproject';",
  "export * from './src/vector/write';",
  "export * as geom from './src/edit/geom';"
].join('\n') + '\n');
try {
  await build({ entryPoints: [entry], bundle: true, format: 'cjs', platform: 'node', outfile: bundle, logLevel: 'error' });
} finally {
  unlinkSync(entry);
}
const wgis = require(bundle);
unlinkSync(bundle);
wgis.registerProjections();

let failures = 0;
const check = (ok, what) => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`);
  if (!ok) failures++;
};

// --- 1. Readers -------------------------------------------------------------

const sample = async (name) => {
  const bytes = readFileSync(join(root, 'public', 'samples', name));
  return wgis.readVectorFile(new File([bytes], name));
};
const kinds = (d) => d.features.map((f) => f.kind).join(',');

{
  const d = await sample('polar-box-3031.fgb');
  check(d.format === 'flatgeobuf' && d.crs === 'EPSG:3031' && d.crsOrigin === 'flatgeobuf header',
    `FlatGeobuf: CRS from the header (${d.crs}, ${d.crsOrigin})`);
  check(kinds(d) === 'polygon,polygon,line', `FlatGeobuf: kinds ${kinds(d)}`);
  check(d.features[0].parts.length === 2 && d.features[0].rings[0] === 2, 'FlatGeobuf: polygon keeps its hole');
}
{
  const d = await sample('lonlat-lines.parquet');
  check(d.format === 'geoparquet' && d.crs === 'EPSG:4326' && d.crsOrigin === 'geoparquet header',
    `GeoParquet: no crs key reads as lon/lat (${d.crs}, ${d.crsOrigin})`);
  check(d.features.length === 19, `GeoParquet: ${d.features.length} features`);
  check(d.features[17].kind === 'polygon' && d.features[18].kind === 'point' && d.features[18].parts[0].length === 8,
    'GeoParquet: polygon and multipoint decoded from WKB');
  check(d.features[0].props.name === 'parallel -40', 'GeoParquet: attributes come through');
}
{
  const d = await sample('tasmania-mga55.geojson');
  check(d.format === 'geojson' && d.crs === 'EPSG:28355' && d.crsOrigin === 'geojson header',
    `GeoJSON: legacy crs member (${d.crs}, ${d.crsOrigin})`);
  check(kinds(d) === 'point,point,point,point,line,line,line', `GeoJSON: kinds ${kinds(d)}`);
}
{
  const fc = { type: 'FeatureCollection', features: [{ type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: [147, -42] } }] };
  const d = await wgis.readVectorFile(new File([JSON.stringify(fc)], 'plain.geojson'));
  check(d.crs === 'EPSG:4326' && d.crsOrigin === '[assumed]', 'GeoJSON: no crs member is lon/lat, marked assumed');
}
{
  // Parquet's own GEOMETRY type can give its CRS as projjson:<key>, the
  // PROJJSON being in the file's key-value metadata under that key. (The
  // writer encodes a GEOMETRY column's GeoJSON as WKB itself.)
  const parquet = (crs, kv) => new File([parquetWriteBuffer({
    columnData: [{ name: 'geometry', data: [{ type: 'Point', coordinates: [0, -2000000] }] }],
    schema: [
      { name: 'root', num_children: 1 },
      { name: 'geometry', type: 'BYTE_ARRAY', repetition_type: 'OPTIONAL', logical_type: { type: 'GEOMETRY', crs } }
    ],
    kvMetadata: kv
  })], 'native.parquet');
  const projjson = { type: 'ProjectedCRS', name: 'WGS 84 / Antarctic Polar Stereographic', id: { authority: 'EPSG', code: 3031 } };
  const d = await wgis.readVectorFile(parquet('projjson:my_crs', [{ key: 'my_crs', value: JSON.stringify(projjson) }]));
  check(d.crs === 'EPSG:3031' && d.crsOrigin === 'geoparquet header' && d.features[0].parts[0][1] === -2000000,
    `GeoParquet: GEOMETRY crs projjson:<key> read from the metadata (${d.crs}, ${d.crsOrigin})`);
  const missing = await wgis.readVectorFile(parquet('projjson:nowhere', [])).then(() => 'read', (e) => e.message);
  check(/no nowhere metadata/.test(missing), `GeoParquet: projjson:<key> with no such key is refused (${missing})`);
}

// --- 2. Densification against PROJ ------------------------------------------

await proj.init({ size: 1 });
const ctx = await proj.contextCreate({ network: false });
const pipes = new Map();
async function transform(src, dst, xy) {
  const key = `${src}|${dst}`;
  let t = pipes.get(key);
  if (!t) {
    t = await proj.projCreateCrsToCrs({ context: ctx, source_crs: src, target_crs: dst });
    pipes.set(key, t);
  }
  const n = xy.length / 2;
  const ca = await proj.coordArray(n);
  const pts = [];
  for (let i = 0; i < n; i++) pts.push([xy[i * 2], xy[i * 2 + 1], 0, 0]);
  await proj.setCoords(ca, pts);
  await proj.projTransArray({ p: t, direction: proj.PJ_FWD, n, coord: ca });
  const out = new Float64Array(xy.length);
  for (let i = 0; i < n; i++) {
    const c = await proj.getCoords(ca, i);
    out[i * 2] = c[0];
    out[i * 2 + 1] = c[1];
  }
  return out;
}

const LONLAT = { wgis: 'EPSG:4326', proj: 'OGC:CRS84' };
const POLAR = { wgis: 'EPSG:3031', proj: 'EPSG:3031' };
const orthoSouth = '+proj=ortho +lat_0=-90 +lon_0=0 +x_0=0 +y_0=0 +ellps=WGS84 +units=m';
const orthoTas = '+proj=ortho +lat_0=-30 +lon_0=147 +x_0=0 +y_0=0 +ellps=WGS84 +units=m';
const robin150 = '+proj=robin +lon_0=150 +x_0=0 +y_0=0 +ellps=WGS84 +units=m';

const cases = [
  {
    name: 'parallel 60S (lon/lat) on polar stereographic',
    layer: LONLAT, display: { wgis: 'EPSG:3031', proj: 'EPSG:3031' }, tol: 500,
    parts: [[-180, -60, -90, -60, 0, -60, 90, -60, 180, -60]],
    expect: (paths) => paths.length === 1 && paths[0].xy.length / 2 > 64 ? null : `${paths.length} paths`
  },
  {
    name: 'diagonal through the pole (EPSG:3031) in lon/lat: cut where longitude jumps',
    layer: POLAR, display: LONLAT, tol: 0.01,
    parts: [[-3500000, -3500000, 3500000, 3500000]],
    expect: (paths) => paths.length === 2 ? null : `${paths.length} paths`
  },
  {
    name: '800 km square (EPSG:3031) on an orthographic globe over the pole',
    layer: POLAR, display: { wgis: orthoSouth, proj: orthoSouth }, tol: 200,
    parts: [[1600000, -1900000, 2400000, -1900000, 2400000, -1100000, 1600000, -1100000, 1600000, -1900000]],
    expect: (paths) => paths.length === 1 && paths[0].closed ? null : 'not one closed ring'
  },
  {
    name: 'parallel 40S (lon/lat) in Robinson centred on 150E: cut at the antimeridian, 30W',
    layer: LONLAT, display: { wgis: robin150, proj: robin150 }, tol: 2000,
    parts: [[-180, -40, -90, -40, 0, -40, 90, -40, 180, -40]],
    expect: (paths) => paths.length === 2 ? null : `${paths.length} paths`
  },
  {
    name: 'parallel 10N (lon/lat) on a globe over the south pole: all on the far side',
    layer: LONLAT, display: { wgis: orthoSouth, proj: orthoSouth }, tol: 500,
    parts: [[-180, 10, 0, 10, 180, 10]],
    expect: (paths) => paths.length === 0 ? null : `${paths.length} paths drawn`
  },
  {
    name: 'meridian 0 from 85S to 40N on a globe over the south pole: stops at the horizon',
    layer: LONLAT, display: { wgis: orthoSouth, proj: orthoSouth }, tol: 500,
    parts: [[0, -85, 0, 40]],
    // the horizon of a polar orthographic is the equator: the line should reach within a few km of it
    expect: async (paths) => {
      if (paths.length !== 1) return `${paths.length} paths`;
      const xy = paths[0].xy;
      const end = await transform(orthoSouth, 'OGC:CRS84', xy.subarray(xy.length - 2));
      return end[1] > -0.1 ? null : `ends at latitude ${end[1].toFixed(3)}`;
    }
  },
  {
    name: 'Cape Grim to Casey, straight in MGA55, on a globe over Tasmania',
    layer: { wgis: 'EPSG:28355', proj: 'EPSG:28355' }, display: { wgis: orthoTas, proj: orthoTas }, tol: 200,
    parts: [[300000, 5494000, -1450000, 2400000]],
    expect: (paths) => paths.length === 1 ? null : `${paths.length} paths`
  }
];

/**
 * Every segment of paths drawn in `display`, against PROJ: take its ends
 * back to `layer`, go half way there, and see how far from the segment
 * PROJ puts that point. Returns the worst distance and the segment count.
 */
async function worstDeviation(paths, layer, display) {
  let worst = 0, segs = 0;
  for (const path of paths) {
    const back = await transform(display.proj, layer.proj, path.xy);
    const n = path.xy.length / 2;
    // PROJ hands longitudes back in -180..180; a path that runs through
    // 180 must be unwrapped before taking midpoints along it.
    if (layer.proj === 'OGC:CRS84') {
      for (let i = 1; i < n; i++) {
        while (back[i * 2] - back[i * 2 - 2] > 180) back[i * 2] -= 360;
        while (back[i * 2] - back[i * 2 - 2] < -180) back[i * 2] += 360;
      }
    }
    const mids = new Float64Array((n - 1) * 2);
    for (let i = 0; i < n - 1; i++) {
      mids[i * 2] = (back[i * 2] + back[i * 2 + 2]) / 2;
      mids[i * 2 + 1] = (back[i * 2 + 1] + back[i * 2 + 3]) / 2;
    }
    const m = await transform(layer.proj, display.proj, mids);
    // and a target in lon/lat has the same seam on the way forward
    if (display.proj === 'OGC:CRS84') {
      for (let i = 0; i < n - 1; i++) {
        const ref = path.xy[i * 2];
        while (m[i * 2] - ref > 180) m[i * 2] -= 360;
        while (m[i * 2] - ref < -180) m[i * 2] += 360;
      }
    }
    for (let i = 0; i < n - 1; i++) {
      const ax = path.xy[i * 2], ay = path.xy[i * 2 + 1], bx = path.xy[i * 2 + 2], by = path.xy[i * 2 + 3];
      const cx = bx - ax, cy = by - ay, len = Math.hypot(cx, cy);
      const ex = m[i * 2] - ax, ey = m[i * 2 + 1] - ay;
      const dev = len > 0 ? Math.abs(ex * cy - ey * cx) / len : Math.hypot(ex, ey);
      // a midpoint that lands outside the chord is off by its distance to the chord's middle
      const t = len > 0 ? (ex * cx + ey * cy) / (len * len) : 0.5;
      const along = t < 0 || t > 1 ? Math.hypot(ex - cx / 2, ey - cy / 2) : 0;
      worst = Math.max(worst, dev, along);
      segs++;
    }
  }
  return { worst, segs };
}

for (const c of cases) {
  const projector = wgis.makeProjector(c.layer.wgis, c.display.wgis, c.tol * 4);
  const parts = c.parts.map((p) => Float64Array.from(p));
  const result = wgis.runSync(wgis.densifyParts(parts, { tol: c.tol, maxDepth: 12 }, true), projector.sync);
  const paths = result.flatMap((r) => r.paths);
  const { worst, segs } = await worstDeviation(paths, c.layer, c.display);
  const shape = await c.expect(paths);
  const within = worst <= c.tol * 1.5;
  check(within && shape === null,
    `${c.name}: ${paths.length} piece(s), ${segs} segments, worst ${(worst / c.tol).toFixed(2)} x tol` +
    (shape ? `; expected otherwise: ${shape}` : ''));
}

// --- 3. Paste into another CRS ----------------------------------------------

{
  const polar = await sample('polar-box-3031.fgb');
  const [holed, square, diagonal] = polar.features;
  const MGA55 = { wgis: 'EPSG:28355', proj: 'EPSG:28355' };

  // The 800 km square into lon/lat: one ring, every edge true to the square.
  const tol = 0.01;
  const r = await wgis.reprojectFeatures([square], 'EPSG:3031', 'EPSG:4326', { tol });
  const ring = r.features[0]?.parts[0];
  const { worst, segs } = ring ? await worstDeviation([{ xy: ring }], POLAR, LONLAT) : { worst: Infinity, segs: 0 };
  check(r.dropped === 0 && r.features.length === 1 && ring.length / 2 > 20 && worst <= tol * 1.5,
    `paste the 800 km square (EPSG:3031) into a lon/lat layer: ${ring ? ring.length / 2 : 0} vertices, ${segs} edges, worst ${(worst / tol).toFixed(2)} x tol`);

  // Vertices only: same four corners, nothing added.
  const v = await wgis.reprojectFeatures([square], 'EPSG:3031', 'EPSG:4326', { keepShape: false });
  check(v.features[0].parts[0].length === 10, `paste without keeping shape moves only the 5 ring vertices (${v.features[0].parts[0].length / 2})`);

  // The square around the pole has no ring in lon/lat: dropped and counted.
  const h = await wgis.reprojectFeatures([holed], 'EPSG:3031', 'EPSG:4326', { tol });
  check(h.features.length === 0 && h.dropped === 1, `a ring around the pole is dropped from a lon/lat paste, not mangled (${h.dropped} dropped)`);

  // The diagonal through the pole into lon/lat: split where longitude jumps.
  const d = await wgis.reprojectFeatures([diagonal], 'EPSG:3031', 'EPSG:4326', { tol });
  check(d.features.length === 1 && d.features[0].parts.length === 2, `a line through the pole pastes into lon/lat as two parts (${d.features[0]?.parts.length})`);

  // Into MGA55, and back: the square survives a round trip close to where it was.
  const m = await wgis.reprojectFeatures([square], 'EPSG:3031', 'EPSG:28355', { tol: 100 });
  const mw = await worstDeviation([{ xy: m.features[0].parts[0] }], POLAR, MGA55);
  check(m.dropped === 0 && mw.worst <= 150, `paste the square into an MGA55 layer: worst ${(mw.worst / 100).toFixed(2)} x tol`);

  // Same CRS: copies, never the same arrays.
  const same = await wgis.reprojectFeatures([square], 'EPSG:3031', 'EPSG:3031');
  check(same.features[0].parts[0] !== square.parts[0] && same.features[0].parts[0].join() === square.parts[0].join(),
    'paste into the same CRS copies the coordinates exactly');
}

// --- 4. Saves ----------------------------------------------------------------

{
  const polar = await sample('polar-box-3031.fgb');
  // Mixed attributes, as a layer with drawn and pasted features has.
  polar.features[1] = { ...polar.features[1], props: {} };
  polar.features.push(wgis.geom.sketchFeature('point', [100000, 200000], { name: 'drawn', n: 3 }));
  const { bytes, crsRecorded } = wgis.toFlatGeobuf(polar);
  const back = await wgis.readVectorFile(new File([bytes], 'saved.fgb'));
  const sameXY = back.features.length === polar.features.length &&
    back.features.every((f, i) => f.kind === polar.features[i].kind && f.parts.map((p) => p.join()).join('|') === polar.features[i].parts.map((p) => p.join()).join('|'));
  check(crsRecorded && back.crs === 'EPSG:3031' && sameXY,
    `FlatGeobuf save reads back in EPSG:3031 with the same coordinates (${back.features.length} features)`);
  const names = back.features.map((f) => f.props.name ?? null);
  check(names[0] === polar.features[0].props.name && names[3] === 'drawn' && Number(back.features[3].props.n) === 3,
    `FlatGeobuf save keeps mixed attributes (${JSON.stringify(names)}, n=${back.features[3].props.n})`);

  const odd = { ...polar, crs: '+proj=stere +lat_0=-90 +lat_ts=-71 +lon_0=0 +datum=WGS84 +units=m' };
  check(wgis.toFlatGeobuf(odd).crsRecorded === false, 'FlatGeobuf save says when a CRS cannot be recorded (not an EPSG code)');

  const tas = await sample('tasmania-mga55.geojson');
  const { text, dropped } = await wgis.toGeoJSONText(tas.features, tas.crs);
  const gj = await wgis.readGeoJSONText(text, 'saved');
  const hobart = gj.features[0].parts[0];
  const want = await transform('EPSG:28355', 'OGC:CRS84', tas.features[0].parts[0]);
  const err = Math.hypot(hobart[0] - want[0], hobart[1] - want[1]);
  const line = gj.features[5].parts[0].length / 2;
  check(dropped === 0 && gj.crs === 'EPSG:4326' && err < 1e-6 && line > 2,
    `GeoJSON save is lon/lat: Hobart within ${err.toExponential(1)} deg of PROJ, a long MGA55 line has ${line} vertices`);
}

// --- 5. Vertex edits ----------------------------------------------------------

{
  const g = wgis.geom;
  const tri = g.sketchFeature('polygon', [0, 0, 10, 0, 0, 10]);
  const closed = (f) => { const p = f.parts[0]; return p[0] === p[p.length - 2] && p[1] === p[p.length - 1]; };
  const m = g.moveVertex(tri, 0, 0, -5, -5);
  check(closed(m) && m.parts[0][0] === -5 && tri.parts[0][0] === 0, 'moving a ring\'s first vertex moves its closing vertex, and leaves the original alone');
  const ins = g.insertVertex(tri, 0, 2, -3, 3);
  check(ins.parts[0].length === 10 && ins.parts[0][6] === -3 && closed(ins), 'adding a vertex on the closing edge keeps the ring closed');
  check(typeof g.deleteVertex(tri, 0, 1) === 'string', 'a triangle refuses to lose a vertex');
  const del = g.deleteVertex(ins, 0, 0);
  check(typeof del === 'object' && del.parts[0].length === 8 && closed(del), 'removing a ring\'s first vertex re-closes it on the next');
  const line = g.sketchFeature('line', [0, 0, 1, 1]);
  check(typeof g.deleteVertex(line, 0, 0) === 'string', 'a two-vertex line refuses to lose one');
  check(g.deleteVertex(g.sketchFeature('point', [1, 2]), 0, 0) === null, 'removing a single point removes the feature');
  const t = g.translate(tri, 5, 5);
  check(t.parts[0].join() === '5,5,15,5,5,15,5,5', 'a moved feature moves every vertex by the same amount in its CRS');
}

await proj.shutdown();
if (failures) {
  console.log(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log('\nall vector checks passed');
process.exitCode = 0;
