/**
 * Features out: GeoJSON objects and the two saves.
 *
 *   FlatGeobuf  in the layer's own CRS, the native save. The format records
 *               the CRS as an authority code, so a layer whose CRS is not
 *               an EPSG code is written without one (and the caller is told).
 *   GeoJSON     in lon/lat (RFC 7946), the interchange save; features are
 *               moved there shape-preserving (reproject.ts).
 */

import type { FeatureCollection, Geometry, Feature as GeoJsonFeature } from 'geojson';
// The parts of flatgeobuf's GeoJSON serializer, so the columns can be given
// rather than guessed from the first feature (see toFlatGeobuf).
import { magicbytes } from 'flatgeobuf/lib/mjs/constants.js';
import { buildFeature } from 'flatgeobuf/lib/mjs/generic/feature.js';
import { buildHeader } from 'flatgeobuf/lib/mjs/generic/featurecollection.js';
import { inferGeometryType } from 'flatgeobuf/lib/mjs/generic/header.js';
import { parseGeometry } from 'flatgeobuf/lib/mjs/geojson/geometry.js';
import { ColumnType } from 'flatgeobuf/lib/mjs/flat-geobuf/column-type.js';
import { GeometryType } from 'flatgeobuf/lib/mjs/flat-geobuf/geometry-type.js';
import type { ColumnMeta } from 'flatgeobuf/lib/mjs/column-meta.js';
import type { HeaderMeta } from 'flatgeobuf/lib/mjs/header-meta.js';
import { Feature, VectorData } from './types';
import { reprojectFeatures } from './reproject';

function coords(p: Float64Array): number[][] {
  const out: number[][] = [];
  for (let i = 0; i < p.length; i += 2) out.push([p[i], p[i + 1]]);
  return out;
}

export function featureGeometry(f: Feature): Geometry {
  if (f.kind === 'point') {
    const pts = f.parts.flatMap(coords);
    return pts.length === 1 ? { type: 'Point', coordinates: pts[0] } : { type: 'MultiPoint', coordinates: pts };
  }
  if (f.kind === 'line') {
    return f.parts.length === 1
      ? { type: 'LineString', coordinates: coords(f.parts[0]) }
      : { type: 'MultiLineString', coordinates: f.parts.map(coords) };
  }
  const polys: number[][][][] = [];
  let k = 0;
  for (const n of f.rings ?? [f.parts.length]) {
    polys.push(f.parts.slice(k, k + n).map(coords));
    k += n;
  }
  return polys.length === 1 ? { type: 'Polygon', coordinates: polys[0] } : { type: 'MultiPolygon', coordinates: polys };
}

/** Attribute values GeoJSON can hold; BigInts become numbers or strings. */
function plainProps(props: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(props)) {
    if (typeof v === 'bigint') out[k] = Number.isSafeInteger(Number(v)) ? Number(v) : v.toString();
    else if (v instanceof Date) out[k] = v.toISOString();
    else out[k] = v;
  }
  return out;
}

export function toFeatureCollection(features: Feature[]): FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: features.map((f): GeoJsonFeature => ({ type: 'Feature', geometry: featureGeometry(f), properties: plainProps(f.props) }))
  };
}

/** GeoJSON text in lon/lat, shape-preserving from the layer CRS. */
export async function toGeoJSONText(features: Feature[], crs: string): Promise<{ text: string; dropped: number }> {
  const r = await reprojectFeatures(features, crs, 'EPSG:4326');
  return { text: JSON.stringify(toFeatureCollection(r.features)), dropped: r.dropped };
}

/** The EPSG code of a CRS written as EPSG:n, or null. */
export function epsgCode(crs: string): number | null {
  const m = /^EPSG:(\d+)$/i.exec(crs.trim());
  return m ? parseInt(m[1]) : null;
}

/**
 * One column per attribute any feature has, typed by every value it holds:
 * all booleans, all numbers, or all strings keep their type, anything else
 * is written as text. (flatgeobuf's own serializer takes the columns from
 * the first feature alone, which loses attributes in a layer of drawn and
 * pasted features.)
 */
function columnsOf(props: Record<string, unknown>[]): { columns: ColumnMeta[]; rows: Record<string, unknown>[] } {
  const kinds = new Map<string, Set<string>>();
  for (const p of props) {
    for (const [k, v] of Object.entries(p)) {
      if (!kinds.has(k)) kinds.set(k, new Set());
      if (v !== null && v !== undefined) kinds.get(k)!.add(typeof v === 'object' ? 'object' : typeof v);
    }
  }
  const columns: ColumnMeta[] = [];
  const asText = new Set<string>();
  for (const [name, set] of kinds) {
    const only = set.size === 1 ? [...set][0] : null;
    const type = only === 'boolean' ? ColumnType.Bool : only === 'number' ? ColumnType.Double : ColumnType.String;
    if (type === ColumnType.String && only !== 'string') asText.add(name);
    columns.push({ name, type, title: null, description: null, width: -1, precision: -1, scale: -1, nullable: true, unique: false, primary_key: false });
  }
  const rows = props.map((p) => {
    const row: Record<string, unknown> = {};
    for (const c of columns) {
      const v = p[c.name];
      // flatgeobuf skips nulls: the attribute is absent for that feature.
      row[c.name] = v === undefined || v === null ? null
        : asText.has(c.name) ? (typeof v === 'object' ? JSON.stringify(v) : String(v)) : v;
    }
    return row;
  });
  return { columns, rows };
}

export function toFlatGeobuf(data: VectorData): { bytes: Uint8Array; crsRecorded: boolean } {
  const code = epsgCode(data.crs);
  const fc = toFeatureCollection(data.features);
  const { columns, rows } = columnsOf(fc.features.map((f) => f.properties ?? {}));
  const header: HeaderMeta = {
    // A layer of mixed kinds is written as "unknown", which reads back.
    geometryType: fc.features.length ? inferGeometryType(fc.features as never) : GeometryType.Unknown,
    columns: columns.length ? columns : null,
    envelope: null,
    featuresCount: fc.features.length,
    indexNodeSize: 0,
    crs: null,
    title: null,
    description: null,
    metadata: null
  };
  const chunks = [magicbytes, buildHeader(header, code ?? 0)];
  fc.features.forEach((f, i) => chunks.push(buildFeature(parseGeometry(f.geometry as never), rows[i] as never, header)));
  const bytes = new Uint8Array(chunks.reduce((n, c) => n + c.length, 0));
  let off = 0;
  for (const c of chunks) { bytes.set(c, off); off += c.length; }
  return { bytes, crsRecorded: code !== null };
}

/** Hand the browser a file to save. */
export function download(name: string, data: Uint8Array | string, type: string): void {
  const blob = new Blob([data as BlobPart], { type });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
