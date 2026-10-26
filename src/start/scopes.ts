/**
 * How much of the Earth: the start card's choices and the defaults each
 * one picks (view mode, CRS, extent, background).
 *
 *   global  a world projection that spins about its central meridian
 *   hemi    the centred globe, at a pole or a chosen point
 *   local   the UTM zone of a point, in the regional datum where there is one
 *   data    the first layer's own CRS and extent
 *
 * Pure functions only; main.ts applies them.
 */

import { SourceBounds } from '../core/bounds';
import { crsDefinition } from '../core/crs';

export type Scope = 'global' | 'hemi' | 'local' | 'data';

export const SCOPE_LABELS: Record<Scope, string> = {
  global: 'Global',
  hemi: 'Hemispheric',
  local: 'Local',
  data: 'Layer CRS'
};

/** Backgrounds the top bar offers, as layer URLs addLayer() understands. */
export const BACKGROUNDS: Record<string, { label: string; url: string }> = {
  esri: { label: 'Esri imagery', url: 'preset:esri-imagery' },
  gebco: { label: 'GEBCO bathymetry', url: 'preset:gebco-2024' },
  osm: { label: 'OpenStreetMap', url: 'preset:osm' }
};

export function backgroundKeyOf(url: string): string | null {
  for (const [k, b] of Object.entries(BACKGROUNDS)) if (b.url === url) return k;
  return null;
}

/**
 * The background for a view whose middle is at this latitude. Web
 * Mercator tiles stop at 85 degrees, so a polar view gets GEBCO, which
 * covers the poles.
 */
export function backgroundFor(lat: number): string {
  return Math.abs(lat) >= 60 ? 'gebco' : 'esri';
}

export interface LocalCRS {
  /** An EPSG code the CRS table resolves (zone arithmetic in core/crs.ts). */
  code: string;
  /** Short name for the top bar, e.g. "MGA 55". */
  label: string;
}

export function utmZone(lon: number): number {
  const l = ((lon + 180) % 360 + 360) % 360;
  return Math.min(60, Math.floor(l / 6) + 1);
}

/**
 * The UTM zone of a point, in the regional datum where one applies:
 * GDA2020 MGA in Australia, ETRS89 in Europe, NAD83 in North America,
 * WGS 84 elsewhere, and UPS beyond UTM's limits. State grids (VicGrid and the like) are not chosen.
 * The Norway and Svalbard zone exceptions are not applied either.
 */
export function localCRS(lon: number, lat: number): LocalCRS {
  // UTM stops at 84N and 80S; the polar caps have UPS.
  if (lat > 84) return { code: 'EPSG:32661', label: 'UPS North' };
  if (lat < -80) return { code: 'EPSG:32761', label: 'UPS South' };
  const z = utmZone(lon);
  const south = lat < 0;
  if (south && lat > -45 && lat < -8 && lon > 108 && lon < 160 && z >= 46 && z <= 59) {
    return { code: `EPSG:${7800 + z}`, label: `MGA ${z}` };
  }
  if (!south && lat > 34 && lat < 72 && lon > -16 && lon < 42 && z >= 28 && z <= 38) {
    return { code: `EPSG:${25800 + z}`, label: `ETRS89 UTM ${z}N` };
  }
  if (!south && lat > 14 && lat < 84 && lon > -170 && lon < -50 && z >= 1 && z <= 23) {
    return { code: `EPSG:${26900 + z}`, label: `NAD83 UTM ${z}N` };
  }
  return { code: `EPSG:${(south ? 32700 : 32600) + z}`, label: `UTM ${z}${south ? 'S' : 'N'}` };
}

/** Half-width of the mesh around a local point, in metres. */
export const LOCAL_MESH_HALF = 500_000;
/** Half-width of the first local view, in metres. */
export const LOCAL_VIEW_HALF = 25_000;

/**
 * What scope a layer's lon/lat bounds look like: a world-wide layer is
 * global, one reaching a pole or wider than 40 degrees is hemispheric,
 * anything else is local.
 */
export function scopeOfLonLat(b: SourceBounds): Exclude<Scope, 'data'> {
  const w = b.maxX - b.minX, h = b.maxY - b.minY;
  if (w > 120) return 'global';
  if (w > 40 || h > 40 || b.minY < -80 || b.maxY > 80) return 'hemi';
  return 'local';
}

/**
 * What kind of CRS this is, read from its definition (the one crs.ts
 * resolved, or the CRS itself when it is a proj string or WKT), never from
 * the digits of its code.
 */
function crsKind(crs: string): 'lonlat' | 'webmercator' | 'other' {
  const def = crsDefinition(crs) ?? crs;
  if (/\+proj=(longlat|latlong|lonlat|latlon)\b/.test(def) || /^\s*GEOG(CRS|CS)\[/i.test(def)) return 'lonlat';
  if (/\+proj=merc\b/.test(def) && /\+a=6378137\b/.test(def) && /\+b=6378137\b/.test(def)) return 'webmercator';
  return 'other';
}

/**
 * A fixed-mode mesh extent around a layer's bounds: twice their size,
 * kept inside the world for lon/lat and Web Mercator, never empty.
 */
export function paddedExtent(b: SourceBounds, crs: string): SourceBounds {
  const kind = crsKind(crs);
  const lonlat = kind === 'lonlat';
  const minSpan = lonlat ? 0.2 : 20_000;
  const w = Math.max(b.maxX - b.minX, minSpan), h = Math.max(b.maxY - b.minY, minSpan);
  const cx = (b.minX + b.maxX) / 2, cy = (b.minY + b.maxY) / 2;
  const out = { minX: cx - w, maxX: cx + w, minY: cy - h, maxY: cy + h };
  const clamp = lonlat ? [180, 90] : kind === 'webmercator' ? [20037508.34, 20037508.34] : null;
  if (clamp) {
    out.minX = Math.max(out.minX, -clamp[0]);
    out.maxX = Math.min(out.maxX, clamp[0]);
    out.minY = Math.max(out.minY, -clamp[1]);
    out.maxY = Math.min(out.maxY, clamp[1]);
  }
  return out;
}
