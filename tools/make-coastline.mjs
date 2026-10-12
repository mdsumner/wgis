// Write public/base/coastline.fgb, the coastline every view starts with.
//
// Natural Earth 1:50m coastline (public domain), lon/lat, properties
// dropped. It draws in any display CRS with no network beyond the page
// itself, so the map is never blank while a raster background loads (or
// when its host is unreachable).
//
//   node tools/make-coastline.mjs [path/to/ne_50m_coastline.geojson]
//
// With no argument it downloads the GeoJSON from the natural-earth-vector
// repository.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serialize } from 'flatgeobuf/geojson';

const SRC = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_coastline.geojson';
const root = dirname(dirname(fileURLToPath(import.meta.url)));
const out = join(root, 'public', 'base');
mkdirSync(out, { recursive: true });

const arg = process.argv[2];
const text = arg ? readFileSync(arg, 'utf8') : await (await fetch(SRC)).text();
const fc = JSON.parse(text);
// Five decimals is about a metre: far finer than 1:50m needs.
const round = (c) => typeof c[0] === 'number'
  ? [Math.round(c[0] * 1e5) / 1e5, Math.round(c[1] * 1e5) / 1e5]
  : c.map(round);
const slim = {
  type: 'FeatureCollection',
  features: fc.features.map((f) => ({
    type: 'Feature',
    geometry: { type: f.geometry.type, coordinates: round(f.geometry.coordinates) },
    properties: {}
  }))
};
const bytes = serialize(slim, 4326);
writeFileSync(join(out, 'coastline.fgb'), bytes);
console.log(`coastline.fgb: ${slim.features.length} features, ${bytes.length} bytes`);
