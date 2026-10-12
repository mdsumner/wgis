/**
 * Moving features from one CRS to another, the way a paste into a layer in
 * a different CRS does.
 *
 * With keepShape (the default), every edge is first densified in the
 * source CRS until it is straight to within a tolerance in the target CRS,
 * then the vertices are transformed. The result has the same shape it had:
 * a square drawn in polar stereographic stays that square when pasted into
 * a lon/lat layer, it just has more vertices there. Without keepShape only
 * the vertices move, and each edge becomes straight in the new CRS: a
 * different shape, which is sometimes what is wanted (a "rhumb" edge
 * becoming a "chord", say), but never silently.
 *
 * A part that does not survive (a point with no position in the target, a
 * ring that crosses a break in the target CRS) is dropped and counted.
 * Lines that cross a break are split there.
 */

import { Feature } from './types';
import { densifyParts, runAsync, runSync } from './densify';
import { makeProjector } from './project';

export interface Reprojected {
  features: Feature[];
  /** Parts that could not be placed in the target CRS. */
  dropped: number;
}

export interface ReprojectOptions {
  keepShape?: boolean;
  /**
   * Allowed deviation from the true edge, in target CRS units. Default:
   * a ten-thousandth of the features' extent in the target.
   */
  tol?: number;
}

function cloneFeature(f: Feature): Feature {
  return { kind: f.kind, parts: f.parts.map((p) => Float64Array.from(p)), rings: f.rings ? [...f.rings] : undefined, props: { ...f.props } };
}

/** Same CRS: copies, so a paste never shares arrays with its source. */
export function cloneFeatures(features: Feature[]): Feature[] {
  return features.map(cloneFeature);
}

function extentOf(parts: Float64Array[]): number {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of parts) {
    for (let i = 0; i < p.length; i += 2) {
      if (!isFinite(p[i]) || !isFinite(p[i + 1])) continue;
      minX = Math.min(minX, p[i]); maxX = Math.max(maxX, p[i]);
      minY = Math.min(minY, p[i + 1]); maxY = Math.max(maxY, p[i + 1]);
    }
  }
  const e = Math.max(maxX - minX, maxY - minY);
  return isFinite(e) && e > 0 ? e : 1;
}

type Run = (parts: Float64Array[], edges: boolean, tol: number) => Promise<{ paths: { xy: Float64Array; closed: boolean }[]; intact: boolean }[]>;

async function reprojectWith(features: Feature[], run: Run, vertexOnly: (xy: Float64Array) => Promise<Float64Array>,
  keepShape: boolean, tol: number | undefined): Promise<Reprojected> {
  let dropped = 0;
  const out: Feature[] = [];
  for (const f of features) {
    if (f.kind === 'point') {
      const kept: number[] = [];
      for (const p of f.parts) {
        const q = await vertexOnly(p);
        for (let i = 0; i < q.length; i += 2) {
          if (isFinite(q[i]) && isFinite(q[i + 1])) kept.push(q[i], q[i + 1]); else dropped++;
        }
      }
      if (kept.length) out.push({ kind: 'point', parts: [Float64Array.from(kept)], props: { ...f.props } });
      continue;
    }
    if (!keepShape) {
      // Vertices only: each part survives whole or not at all.
      const moved = await Promise.all(f.parts.map(vertexOnly));
      const ok = moved.map((q) => q.every((v) => isFinite(v)));
      if (f.kind === 'line') {
        const parts = moved.filter((_, i) => ok[i]);
        dropped += moved.length - parts.length;
        if (parts.length) out.push({ kind: 'line', parts, props: { ...f.props } });
        continue;
      }
      const parts: Float64Array[] = [];
      const rings: number[] = [];
      let k = 0;
      for (const n of f.rings ?? [f.parts.length]) {
        if (ok.slice(k, k + n).every(Boolean)) { parts.push(...moved.slice(k, k + n)); rings.push(n); } else dropped++;
        k += n;
      }
      if (parts.length) out.push({ kind: 'polygon', parts, rings, props: { ...f.props } });
      continue;
    }
    // Shape-keeping: densify in the source, judged in the target.
    const t = tol ?? 1e-4 * extentOf(await Promise.all(f.parts.map(vertexOnly)));
    const res = await run(f.parts, true, t);
    if (f.kind === 'line') {
      const parts: Float64Array[] = [];
      for (const r of res) {
        if (!r.intact && r.paths.length === 0) dropped++;
        for (const path of r.paths) parts.push(path.xy);
      }
      if (parts.length) out.push({ kind: 'line', parts, props: { ...f.props } });
      continue;
    }
    // Polygons: each polygon keeps all its rings or is dropped.
    const parts: Float64Array[] = [];
    const rings: number[] = [];
    let k = 0;
    for (const n of f.rings ?? [f.parts.length]) {
      const group = res.slice(k, k + n);
      k += n;
      if (group.every((r) => r.intact && r.paths.length === 1 && r.paths[0].closed)) {
        parts.push(...group.map((r) => r.paths[0].xy));
        rings.push(n);
      } else {
        dropped++;
      }
    }
    if (parts.length) out.push({ kind: 'polygon', parts, rings, props: { ...f.props } });
  }
  return { features: out, dropped };
}

/** Transform features from one CRS to another; see the file comment. */
export async function reprojectFeatures(features: Feature[], from: string, to: string, opts: ReprojectOptions = {}): Promise<Reprojected> {
  if (from.trim() === to.trim()) return { features: cloneFeatures(features), dropped: 0 };
  // No round-trip test here: the target is a layer CRS, not a view, and a
  // point that does not project comes back NaN either way.
  const projector = makeProjector(from, to, Infinity);
  const sync = projector.sync;
  const run: Run = async (parts, edges, tol) => {
    const gen = densifyParts(parts, { tol, maxDepth: 12 }, edges);
    return sync ? runSync(gen, sync) : runAsync(gen, projector.async);
  };
  const vertexOnly = async (xy: Float64Array) => (sync ? sync(xy) : projector.async(xy));
  return reprojectWith(features, run, vertexOnly, opts.keepShape ?? true, opts.tol);
}
