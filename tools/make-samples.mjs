// Write the small vector samples in public/samples/, one per format, each in
// a different CRS, chosen so the densification is easy to see:
//
//   polar-box-3031.fgb         FlatGeobuf, EPSG:3031. A square with a square
//                              hole around the pole and a line through it;
//                              edges straight in polar stereographic, so
//                              they bend on a globe or in lon/lat.
//   lonlat-lines.parquet       GeoParquet, no crs key (OGC:CRS84). Parallels
//                              with a vertex only every 90 degrees, meridians
//                              with two vertices, and a lon/lat box; straight
//                              in lon/lat, so parallels draw as circles on a
//                              polar projection.
//   tasmania-mga55.geojson     GeoJSON with a legacy crs member, EPSG:28355.
//                              Towns as points (approximate positions) and
//                              long lines straight in MGA zone 55.
//
// The samples are committed; this script documents and regenerates them.
//
//   node tools/make-samples.mjs
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import proj4 from 'proj4';
import { serialize } from 'flatgeobuf/geojson';
import { parquetWriteBuffer, geojsonToWkb } from 'hyparquet-writer';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const out = join(root, 'public', 'samples');
mkdirSync(out, { recursive: true });

const feature = (geometry, properties) => ({ type: 'Feature', geometry, properties });
const square = (c, h) => [[c[0] - h, c[1] - h], [c[0] + h, c[1] - h], [c[0] + h, c[1] + h], [c[0] - h, c[1] + h], [c[0] - h, c[1] - h]];

// --- FlatGeobuf, EPSG:3031 --------------------------------------------------
{
  const fc = {
    type: 'FeatureCollection',
    features: [
      feature({ type: 'Polygon', coordinates: [square([0, 0], 2500000), square([0, 0], 1000000).reverse()] },
        { name: 'square with a hole, 5000 km a side' }),
      feature({ type: 'Polygon', coordinates: [square([2000000, -1500000], 400000)] },
        { name: 'square, 800 km a side' }),
      feature({ type: 'LineString', coordinates: [[-3500000, -3500000], [3500000, 3500000]] },
        { name: 'diagonal through the pole' })
    ]
  };
  writeFileSync(join(out, 'polar-box-3031.fgb'), serialize(fc, 3031));
}

// --- GeoParquet, lon/lat ----------------------------------------------------
{
  const geoms = [];
  const names = [];
  for (const lat of [-40, -50, -60, -70, -80]) {
    geoms.push({ type: 'LineString', coordinates: [[-180, lat], [-90, lat], [0, lat], [90, lat], [180, lat]] });
    names.push(`parallel ${lat}`);
  }
  for (let lon = -180; lon < 180; lon += 30) {
    geoms.push({ type: 'LineString', coordinates: [[lon, -85], [lon, -35]] });
    names.push(`meridian ${lon}`);
  }
  geoms.push({ type: 'Polygon', coordinates: [[[100, -70], [160, -70], [160, -45], [100, -45], [100, -70]]] });
  names.push('box 100E-160E, 70S-45S');
  geoms.push({ type: 'MultiPoint', coordinates: [[147.33, -42.88], [110.53, -66.28], [77.97, -68.58], [62.87, -67.6]] });
  names.push('Hobart, Casey, Davis, Mawson');

  const geo = {
    version: '1.1.0',
    primary_column: 'geometry',
    columns: { geometry: { encoding: 'WKB', geometry_types: ['LineString', 'Polygon', 'MultiPoint'] } }
  };
  const buf = parquetWriteBuffer({
    columnData: [
      { name: 'name', data: names, type: 'STRING' },
      { name: 'geometry', data: geoms.map((g) => geojsonToWkb(g)), type: 'BYTE_ARRAY' }
    ],
    kvMetadata: [{ key: 'geo', value: JSON.stringify(geo) }]
  });
  writeFileSync(join(out, 'lonlat-lines.parquet'), new Uint8Array(buf));
}

// --- GeoJSON, EPSG:28355 ----------------------------------------------------
{
  const mga55 = '+proj=utm +zone=55 +south +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs';
  const p = (lon, lat) => proj4('EPSG:4326', mga55, [lon, lat]).map((v) => Math.round(v));
  const towns = { Hobart: [147.325, -42.881], Launceston: [147.138, -41.434], Devonport: [146.35, -41.18], Strahan: [145.33, -42.15] };
  const fc = {
    type: 'FeatureCollection',
    crs: { type: 'name', properties: { name: 'urn:ogc:def:crs:EPSG::28355' } },
    features: [
      ...Object.entries(towns).map(([name, ll]) => feature({ type: 'Point', coordinates: p(...ll) }, { name, note: 'approximate position' })),
      feature({ type: 'LineString', coordinates: [p(144.70, -40.68), p(148.00, -43.21)] }, { name: 'Cape Grim to Cape Pillar, straight in MGA55' }),
      feature({ type: 'LineString', coordinates: [p(144.70, -40.68), p(158.94, -54.50)] }, { name: 'Cape Grim to Macquarie Island, straight in MGA55' }),
      feature({ type: 'LineString', coordinates: [p(144.70, -40.68), p(110.53, -66.28)] }, { name: 'Cape Grim to Casey, straight in MGA55' })
    ]
  };
  writeFileSync(join(out, 'tasmania-mga55.geojson'), JSON.stringify(fc, null, 1) + '\n');
}

console.log(`samples written to ${out}`);
