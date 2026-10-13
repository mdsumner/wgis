/**
 * Reading vector files into features in their own CRS.
 *
 *   GeoJSON     RFC 7946 is lon/lat; a legacy `crs` member, or `#crs=` on
 *               the URL, says otherwise.
 *   FlatGeobuf  the header carries the CRS (an authority code or WKT).
 *   GeoParquet  `geo` metadata gives the primary column and its CRS as
 *               PROJJSON; no `crs` key means OGC:CRS84. Parquet's own
 *               GEOMETRY logical type works too. Spherical edges (`edges`
 *               in the metadata, or the GEOGRAPHY type) are refused.
 *
 * A `#crs=` fragment on a URL overrides whatever the file says, for files
 * that are wrong or silent about it. Whole files are read: bbox-limited
 * reads of FlatGeobuf's index and GeoParquet row groups come later.
 */

import { deserialize as fgbDeserialize } from 'flatgeobuf/geojson';
import type { HeaderMeta } from 'flatgeobuf';
import { parquetMetadataAsync, parquetReadObjects } from 'hyparquet';
import { normaliseDefinition, resolveCRS, unknownCRSMessage } from '../core/crs';
import { Feature, VectorData, featureBounds } from './types';

export type VectorFormat = 'geojson' | 'flatgeobuf' | 'geoparquet';

/** GeoJSON geometry, loosely: what all three readers produce on the way in. */
interface Geometry {
  type: string;
  coordinates?: any;
  geometries?: Geometry[];
}

const EXT: [RegExp, VectorFormat][] = [
  [/\.(geo)?json$/i, 'geojson'],
  [/\.fgb$/i, 'flatgeobuf'],
  [/\.(geo)?parquet$/i, 'geoparquet']
];

/** The format a URL or file name names, or null if it does not look like vector data. */
export function vectorFormatOf(name: string): VectorFormat | null {
  const path = name.split('#')[0].split('?')[0];
  for (const [re, f] of EXT) if (re.test(path)) return f;
  return null;
}

/** Sniff the format from the first bytes, for dropped files with odd names. */
function sniff(bytes: Uint8Array): VectorFormat | null {
  if (bytes[0] === 0x66 && bytes[1] === 0x67 && bytes[2] === 0x62) return 'flatgeobuf';
  if (bytes[0] === 0x50 && bytes[1] === 0x41 && bytes[2] === 0x52 && bytes[3] === 0x31) return 'geoparquet';
  const head = new TextDecoder().decode(bytes.subarray(0, 64)).trimStart();
  if (head.startsWith('{')) return 'geojson';
  return null;
}

function crsFragment(url: string): string | null {
  const hash = url.split('#')[1];
  if (!hash) return null;
  return new URLSearchParams(hash).get('crs');
}

function labelOf(name: string): string {
  const path = name.split('#')[0].split('?')[0];
  return decodeURIComponent(path.split('/').pop() || path);
}

// ---------------------------------------------------------------------------
// Geometry to features
// ---------------------------------------------------------------------------

function flat(coords: number[][]): Float64Array {
  const out = new Float64Array(coords.length * 2);
  for (let i = 0; i < coords.length; i++) {
    out[i * 2] = Number(coords[i][0]);
    out[i * 2 + 1] = Number(coords[i][1]);
  }
  return out;
}

/** A ring that is not closed is closed here, so every ring repeats its first vertex. */
function ring(coords: number[][]): Float64Array {
  const r = flat(coords);
  const n = r.length;
  if (n >= 4 && (r[0] !== r[n - 2] || r[1] !== r[n - 1])) {
    const c = new Float64Array(n + 2);
    c.set(r);
    c[n] = r[0];
    c[n + 1] = r[1];
    return c;
  }
  return r;
}

export function geometryToFeatures(g: Geometry | null | undefined, props: Record<string, unknown>, out: Feature[]): void {
  if (!g) return;
  const c = g.coordinates;
  switch (g.type) {
    case 'Point':
      if (c && c.length >= 2) out.push({ kind: 'point', parts: [flat([c])], props });
      break;
    case 'MultiPoint':
      if (c && c.length) out.push({ kind: 'point', parts: [flat(c)], props });
      break;
    case 'LineString':
      if (c && c.length >= 2) out.push({ kind: 'line', parts: [flat(c)], props });
      break;
    case 'MultiLineString': {
      const parts = (c ?? []).filter((l: number[][]) => l.length >= 2).map(flat);
      if (parts.length) out.push({ kind: 'line', parts, props });
      break;
    }
    case 'Polygon': {
      const parts = (c ?? []).filter((r: number[][]) => r.length >= 3).map(ring);
      if (parts.length) out.push({ kind: 'polygon', parts, rings: [parts.length], props });
      break;
    }
    case 'MultiPolygon': {
      const parts: Float64Array[] = [];
      const rings: number[] = [];
      for (const poly of c ?? []) {
        const rs = (poly as number[][][]).filter((r) => r.length >= 3).map(ring);
        if (!rs.length) continue;
        parts.push(...rs);
        rings.push(rs.length);
      }
      if (parts.length) out.push({ kind: 'polygon', parts, rings, props });
      break;
    }
    case 'GeometryCollection':
      for (const sub of g.geometries ?? []) geometryToFeatures(sub, props, out);
      break;
  }
}

// ---------------------------------------------------------------------------
// CRS
// ---------------------------------------------------------------------------

/**
 * A CRS as the file states it, made usable: an authority code is resolved
 * through the usual chain, anything else (WKT, PROJJSON) is normalised to a
 * proj string by PROJ.
 */
async function usableCRS(stated: string): Promise<string> {
  const code = /^(EPSG|ESRI|IAU_\d+):\d+$/i.test(stated.trim());
  if (code) {
    if (await resolveCRS(stated)) return stated;
    throw new Error(unknownCRSMessage(stated));
  }
  const norm = await normaliseDefinition(stated);
  if (norm) return norm;
  if (await resolveCRS(stated)) return stated;
  throw new Error(unknownCRSMessage(stated));
}

/** A legacy GeoJSON `crs` member, e.g. urn:ogc:def:crs:EPSG::3031. */
function geojsonCRS(obj: any): string | null {
  const name: unknown = obj?.crs?.properties?.name;
  if (typeof name !== 'string') return null;
  if (/CRS84$/i.test(name)) return 'EPSG:4326';
  const m = /EPSG:{1,2}(\d+)$/i.exec(name);
  return m ? `EPSG:${m[1]}` : name;
}

function projjsonCRS(crs: any): string {
  const id = crs?.id ?? crs?.ids?.[0];
  if (id && id.authority && id.code !== undefined) {
    const auth = String(id.authority).toUpperCase();
    return auth === 'OGC' && /CRS84/i.test(String(id.code)) ? 'EPSG:4326' : `${auth}:${id.code}`;
  }
  return JSON.stringify(crs);
}

// ---------------------------------------------------------------------------
// Readers
// ---------------------------------------------------------------------------

interface Parsed {
  features: Feature[];
  /** CRS the file states, or null when it states none. */
  crs: string | null;
  /** What to call it if the file states none. */
  assumed: string;
}

function readGeoJSON(text: string): Parsed {
  const obj = JSON.parse(text);
  const features: Feature[] = [];
  if (obj.type === 'FeatureCollection') {
    for (const f of obj.features ?? []) geometryToFeatures(f.geometry, f.properties ?? {}, features);
  } else if (obj.type === 'Feature') {
    geometryToFeatures(obj.geometry, obj.properties ?? {}, features);
  } else {
    geometryToFeatures(obj, {}, features);
  }
  return { features, crs: geojsonCRS(obj), assumed: 'EPSG:4326' };
}

async function readFlatGeobuf(bytes: Uint8Array): Promise<Parsed> {
  let header: HeaderMeta | null = null;
  const features: Feature[] = [];
  for await (const f of fgbDeserialize(bytes, { headerMetaFn: (h: HeaderMeta) => { header = h; } })) {
    geometryToFeatures(f.geometry as Geometry, (f.properties ?? {}) as Record<string, unknown>, features);
  }
  let crs: string | null = null;
  const c = (header as HeaderMeta | null)?.crs;
  if (c) {
    if (c.code && c.code !== 0) crs = `${c.org || 'EPSG'}:${c.code}`;
    else if (c.wkt) crs = c.wkt;
  }
  return { features, crs, assumed: 'EPSG:4326' };
}

/** hyparquet reads anything with byteLength and slice(); an ArrayBuffer qualifies. */
interface AsyncBuffer {
  byteLength: number;
  slice(start: number, end?: number): ArrayBuffer | Promise<ArrayBuffer>;
}

/**
 * wgis draws an edge straight in the layer's CRS (call C). A geodesic edge
 * read that way would be a different line, so such files are refused until
 * a geodesic edge option exists.
 */
function sphericalMessage(column: string, edges: string): string {
  return `GeoParquet column ${column} has ${edges.toLowerCase()} edges; wgis draws edges straight in the layer CRS and does not read geodesic edges yet`;
}

async function readGeoParquet(file: AsyncBuffer): Promise<Parsed> {
  const metadata = await parquetMetadataAsync(file);
  const geoKV = metadata.key_value_metadata?.find((kv: { key: string }) => kv.key === 'geo')?.value;
  const geo = geoKV ? JSON.parse(geoKV) : null;

  let column: string | null = geo?.primary_column ?? null;
  let crs: string | null = null;
  if (geo && column) {
    const meta = geo.columns?.[column] ?? {};
    if (meta.encoding && meta.encoding !== 'WKB') {
      throw new Error(`GeoParquet column ${column} is ${meta.encoding}; only WKB is read so far`);
    }
    if (meta.edges && meta.edges !== 'planar') throw new Error(sphericalMessage(column, meta.edges));
    // No crs key means OGC:CRS84; an explicit null means "not stated".
    if (!('crs' in meta)) crs = 'EPSG:4326';
    else if (meta.crs) crs = projjsonCRS(meta.crs);
  } else {
    // Parquet's own GEOMETRY / GEOGRAPHY logical type.
    const el = metadata.schema.find((s: any) => s.logical_type?.type === 'GEOMETRY' || s.logical_type?.type === 'GEOGRAPHY');
    if (!el) throw new Error('No geometry column: neither GeoParquet metadata nor a GEOMETRY column');
    column = el.name;
    const lt = el.logical_type as { type: string; crs?: string; algorithm?: string };
    if (lt.type === 'GEOGRAPHY') throw new Error(sphericalMessage(column, lt.algorithm ?? 'spherical'));
    if (!lt.crs) crs = 'EPSG:4326';
    else if (lt.crs.startsWith('projjson:')) {
      // The PROJJSON is in the file's key-value metadata, under this key.
      const key = lt.crs.slice('projjson:'.length);
      const value = metadata.key_value_metadata?.find((kv: { key: string }) => kv.key === key)?.value;
      if (!value) throw new Error(`GEOMETRY column ${column} gives its CRS as ${lt.crs}, and the file has no ${key} metadata`);
      crs = projjsonCRS(JSON.parse(value));
    } else crs = lt.crs;
  }

  const rows = await parquetReadObjects({ file, metadata });
  const features: Feature[] = [];
  for (const row of rows) {
    const g = row[column!] as Geometry | null;
    const props: Record<string, unknown> = {};
    for (const k of Object.keys(row)) if (k !== column) props[k] = row[k];
    geometryToFeatures(g, props, features);
  }
  return { features, crs, assumed: 'EPSG:4326' };
}

async function parse(format: VectorFormat, bytes: Uint8Array): Promise<Parsed> {
  switch (format) {
    case 'geojson': return readGeoJSON(new TextDecoder().decode(bytes));
    case 'flatgeobuf': return readFlatGeobuf(bytes);
    case 'geoparquet': {
      const ab = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
      return readGeoParquet(ab);
    }
  }
}

async function finish(p: Parsed, label: string, format: VectorFormat, override: string | null): Promise<VectorData> {
  const stated = override ?? p.crs;
  const crs = await usableCRS(stated ?? p.assumed);
  const crsOrigin = override ? 'URL #crs' : p.crs ? `${format} header` : '[assumed]';
  return { crs, crsOrigin, features: p.features, bounds: featureBounds(p.features), label, format };
}

/** GeoJSON text (pasted, say) as vector data, with the CRS it states or lon/lat. */
export async function readGeoJSONText(text: string, label: string): Promise<VectorData> {
  return finish(readGeoJSON(text), label, 'geojson', null);
}

/** Read a vector file from a URL. */
export async function readVectorUrl(url: string): Promise<VectorData> {
  const bare = url.split('#')[0];
  const res = await fetch(bare);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${bare}`);
  const bytes = new Uint8Array(await res.arrayBuffer());
  const format = vectorFormatOf(url) ?? sniff(bytes);
  if (!format) throw new Error(`Not a vector format wgis reads: ${bare}`);
  return finish(await parse(format, bytes), labelOf(url), format, crsFragment(url));
}

/** Read a dropped or picked file. */
export async function readVectorFile(file: File, crsOverride: string | null = null): Promise<VectorData> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const format = vectorFormatOf(file.name) ?? sniff(bytes);
  if (!format) throw new Error(`Not a vector format wgis reads: ${file.name}`);
  return finish(await parse(format, bytes), file.name, format, crsOverride);
}
