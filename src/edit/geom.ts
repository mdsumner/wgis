/**
 * Edits to one feature, in the layer's own CRS. Each returns a new Feature
 * (the old one is left alone, which is what makes undo a matter of keeping
 * the old array) or a string saying why the edit cannot be made.
 *
 * A vertex is addressed as (part, v): the part's index in feature.parts and
 * the vertex's index in that part. Polygon rings are stored closed (the
 * last vertex repeats the first), so the first vertex of a ring is also its
 * last, and the closing vertex itself is never addressed.
 */

import { Feature } from '../vector/types';

function withParts(f: Feature, parts: Float64Array[], rings = f.rings): Feature {
  return { kind: f.kind, parts, rings: rings ? [...rings] : undefined, props: f.props };
}

function isRing(f: Feature): boolean {
  return f.kind === 'polygon';
}

/** Vertices that can be addressed in a part (a ring's closing vertex is not one). */
export function vertexSlots(f: Feature, part: number): number {
  const n = f.parts[part].length / 2;
  return isRing(f) ? n - 1 : n;
}

export function moveVertex(f: Feature, part: number, v: number, x: number, y: number): Feature {
  const parts = f.parts.slice();
  const p = Float64Array.from(parts[part]);
  p[v * 2] = x;
  p[v * 2 + 1] = y;
  if (isRing(f) && v === 0) {
    p[p.length - 2] = x;
    p[p.length - 1] = y;
  }
  parts[part] = p;
  return withParts(f, parts);
}

/** A new vertex after v (between v and v + 1). */
export function insertVertex(f: Feature, part: number, v: number, x: number, y: number): Feature {
  const parts = f.parts.slice();
  const old = parts[part];
  const p = new Float64Array(old.length + 2);
  p.set(old.subarray(0, (v + 1) * 2), 0);
  p[(v + 1) * 2] = x;
  p[(v + 1) * 2 + 1] = y;
  p.set(old.subarray((v + 1) * 2), (v + 2) * 2);
  parts[part] = p;
  return withParts(f, parts);
}

/**
 * Remove a vertex. A point feature loses that point (null when it was the
 * last); a line needs two vertices left, a ring three.
 */
export function deleteVertex(f: Feature, part: number, v: number): Feature | null | string {
  const old = f.parts[part];
  if (f.kind === 'point') {
    if (old.length === 2 && f.parts.length === 1) return null;
    const parts = f.parts.slice();
    const p = new Float64Array(old.length - 2);
    p.set(old.subarray(0, v * 2), 0);
    p.set(old.subarray(v * 2 + 2), v * 2);
    if (p.length) parts[part] = p; else parts.splice(part, 1);
    return withParts(f, parts);
  }
  const slots = vertexSlots(f, part);
  if (f.kind === 'line' && slots <= 2) return 'a line needs at least two vertices';
  if (isRing(f) && slots <= 3) return 'a ring needs at least three vertices';
  const keep: number[] = [];
  for (let i = 0; i < slots; i++) if (i !== v) keep.push(old[i * 2], old[i * 2 + 1]);
  if (isRing(f)) keep.push(keep[0], keep[1]);
  const parts = f.parts.slice();
  parts[part] = Float64Array.from(keep);
  return withParts(f, parts);
}

export function translate(f: Feature, dx: number, dy: number): Feature {
  return withParts(f, f.parts.map((p) => {
    const q = new Float64Array(p.length);
    for (let i = 0; i < p.length; i += 2) {
      q[i] = p[i] + dx;
      q[i + 1] = p[i + 1] + dy;
    }
    return q;
  }));
}

/** A finished sketch as a feature: vertices as drawn, a ring closed. */
export function sketchFeature(kind: 'point' | 'line' | 'polygon', xy: number[], props: Record<string, unknown> = {}): Feature {
  if (kind === 'polygon') {
    return { kind, parts: [Float64Array.from([...xy, xy[0], xy[1]])], rings: [1], props };
  }
  return { kind, parts: [Float64Array.from(xy)], props };
}

/** The same feature with other attributes. */
export function withProps(f: Feature, props: Record<string, unknown>): Feature {
  return { kind: f.kind, parts: f.parts, rings: f.rings, props };
}
