/**
 * Vector data as wgis holds it: features in the layer's own CRS.
 *
 * Coordinates are never rewritten into the display CRS. Each part (a point
 * group, a line, a polygon ring) is one Float64Array of interleaved x, y in
 * the layer CRS, and an edge between two vertices is straight in that CRS:
 * the display draws it densified, so it bends as the projection says it
 * should (see densify.ts).
 *
 * Per-feature typed arrays rather than one columnar block keep editing
 * simple; a GeoArrow-style layout is a conversion at the IO boundary.
 */

import { SourceBounds } from '../core/bounds';

export type GeomKind = 'point' | 'line' | 'polygon';

export interface Feature {
  kind: GeomKind;
  /**
   * point:   one part holding every point of a (multi)point
   * line:    one part per linestring
   * polygon: one part per ring, shells and holes; `rings` says which go together
   */
  parts: Float64Array[];
  /** polygon only: how many consecutive parts make each polygon (shell first). */
  rings?: number[];
  props: Record<string, unknown>;
}

export interface VectorData {
  /** CRS the coordinates are in, as resolveCRS() accepts it. */
  crs: string;
  /** Where the CRS came from, for the layer's info line. */
  crsOrigin: string;
  features: Feature[];
  bounds: SourceBounds;
  /** Short name for the layer list. */
  label: string;
  /** Format the data was read from. */
  format: string;
}

export function vertexCount(features: Feature[]): number {
  let n = 0;
  for (const f of features) for (const p of f.parts) n += p.length / 2;
  return n;
}

export function featureBounds(features: Feature[]): SourceBounds {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const f of features) {
    for (const p of f.parts) {
      for (let i = 0; i < p.length; i += 2) {
        const x = p[i], y = p[i + 1];
        if (!isFinite(x) || !isFinite(y)) continue;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  return { minX, minY, maxX, maxY };
}
