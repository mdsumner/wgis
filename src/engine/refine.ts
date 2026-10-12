/**
 * Adaptive refinement of the display mesh, where a regular grid is not
 * enough: at the limb of a globe, the outline of a world projection, and
 * around a pole in a periodic texture.
 *
 * The base grid stays as it is wherever it is good enough. A cell is split
 * in four, recursively, when
 *
 *   - its corners are partly on the map and partly off (the limb, the
 *     outline): split down to about a screen pixel, then the leaf
 *     triangles are clipped where their edges leave the map, found by
 *     bisection, so the edge of the map is smooth rather than a staircase;
 *   - its texture coordinates wrap more than half way round (a pole in a
 *     periodic texture): split down to about a pixel, then dropped, so
 *     the hole is a pixel wide rather than a cell;
 *   - linear interpolation inside it puts the texture more than
 *     `maxErrorPx` screen pixels from where it belongs. The test points
 *     are the cell centre and edge midpoints; the error there is the
 *     texture-space difference between interpolated and true coordinates,
 *     taken back to display space through the cell's Jacobian.
 *
 * The mesh is planar, so the T-junctions between a split cell and its
 * neighbour leave no gaps; the texture along such an edge differs from
 * the neighbour's by less than the error tolerance, which the edge
 * midpoint test bounds.
 *
 * The work is a generator that yields batches of display points and is
 * handed back their lon/lat and the forward round trip, so the same code
 * runs synchronously under proj4js and asynchronously under PROJ.
 */

import proj4 from 'proj4';
import { SourceBounds } from '../core/bounds';
import { WrapSpec, copyIndex } from '../core/wrap';
import { GeoTransform } from '../core/transform';
import { GridMesh } from './mesh';
import { LayerGeometry } from './uv';

export interface RefineOptions {
  sourceCRS: string;
  /** Bounds of the texture on the GPU, in the source CRS. */
  sourceBounds: SourceBounds;
  /** Round-trip tolerance for "on the map", in display units. */
  tolerance: number;
  /** The texture repeats in u (a 360-degree source). */
  wrapU: boolean;
  wrap: WrapSpec | null;
  /** Display units per screen pixel. */
  pxSize: number;
  /** Largest allowed texture misplacement, in screen pixels. */
  maxErrorPx?: number;
  /** Smallest cell, in screen pixels. */
  minCellPx?: number;
  /** Bisection steps for the edge of the map. */
  edgeSteps?: number;
  /** Stop refining past this many evaluated points. */
  maxPoints?: number;
  /** Only cells meeting this display rectangle are refined. */
  viewRect?: [number, number, number, number];
}

/** What the generator asks for: display xy pairs. What it is given back. */
export interface DisplayEval {
  lonlat: Float64Array;
  back: Float64Array;
}

export interface RefineStats {
  points: number;
  levels: number;
  leaves: number;
  clipped: number;
  dropped: number;
  budgetHit: boolean;
}

type Gen = Generator<Float64Array, LayerGeometry & { refine: RefineStats }, DisplayEval>;

/** Growable arrays of evaluated points. */
class Points {
  n = 0;
  x = new Float64Array(1024);
  y = new Float64Array(1024);
  u = new Float64Array(1024);
  v = new Float64Array(1024);
  valid = new Uint8Array(1024);
  sx = new Float64Array(1024);
  sy = new Float64Array(1024);

  add(x: number, y: number): number {
    if (this.n === this.x.length) {
      const grow = <T extends Float64Array | Uint8Array>(a: T): T => {
        const b = new (a.constructor as { new(n: number): T })(a.length * 2);
        b.set(a);
        return b;
      };
      this.x = grow(this.x); this.y = grow(this.y);
      this.u = grow(this.u); this.v = grow(this.v);
      this.valid = grow(this.valid);
      this.sx = grow(this.sx); this.sy = grow(this.sy);
    }
    this.x[this.n] = x;
    this.y[this.n] = y;
    return this.n++;
  }
}

interface Cell { i: number; j: number; s: number }

export function* refineLayerGeometry(grid: GridMesh, o: RefineOptions): Gen {
  const maxErrorPx = o.maxErrorPx ?? 0.5;
  const minCellPx = o.minCellPx ?? 1;
  const edgeSteps = o.edgeSteps ?? 8;
  const maxPoints = o.maxPoints ?? 200000;
  const [minX, minY, maxX, maxY] = grid.bounds;
  const cellW = (maxX - minX) / grid.cols, cellH = (maxY - minY) / grid.rows;

  // Finest level: cells of about minCellPx, at most 2^8 per base cell.
  let depth = 0;
  while (depth < 8 && Math.max(cellW, cellH) / (1 << depth) > minCellPx * o.pxSize * 2) depth++;
  const S = 1 << depth;
  const NX = grid.cols * S, NY = grid.rows * S;
  const stepX = cellW / S, stepY = cellH / S;

  const pts = new Points();
  const lattice = new Map<number, number>();
  const pending: number[] = [];
  const at = (I: number, J: number): number => {
    const key = J * (NX + 1) + I;
    let k = lattice.get(key);
    if (k === undefined) {
      k = pts.add(minX + I * stepX, minY + J * stepY);
      lattice.set(key, k);
      pending.push(k);
    }
    return k;
  };

  const { minX: bx0, minY: by0, maxX: bx1, maxY: by1 } = o.sourceBounds;
  const bw = bx1 - bx0, bh = by1 - by0;
  const geoToSource = proj4('EPSG:4326', o.sourceCRS);
  const tol2 = o.tolerance * o.tolerance;
  let sMinX = Infinity, sMinY = Infinity, sMaxX = -Infinity, sMaxY = -Infinity;
  let dMinX = Infinity, dMinY = Infinity, dMaxX = -Infinity, dMaxY = -Infinity;

  /** Evaluate everything pending: yield the batch, take the answer, set uv and validity. */
  function* flush(): Generator<Float64Array, void, DisplayEval> {
    if (!pending.length) return;
    const ids = pending.splice(0);
    const xy = new Float64Array(ids.length * 2);
    for (let q = 0; q < ids.length; q++) {
      let dx = pts.x[ids[q]], dy = pts.y[ids[q]];
      if (o.wrap) {
        const k = copyIndex(o.wrap, dx, dy);
        dx -= k * o.wrap.tx;
        dy -= k * o.wrap.ty;
      }
      xy[q * 2] = dx;
      xy[q * 2 + 1] = dy;
    }
    const r = yield xy;
    for (let q = 0; q < ids.length; q++) {
      const id = ids[q];
      const lon = r.lonlat[q * 2], lat = r.lonlat[q * 2 + 1];
      const ex = r.back[q * 2] - xy[q * 2], ey = r.back[q * 2 + 1] - xy[q * 2 + 1];
      let ok = false;
      if (isFinite(lon) && isFinite(lat) && isFinite(ex) && isFinite(ey) && ex * ex + ey * ey <= tol2) {
        try {
          const [sx, sy] = geoToSource.forward([lon, lat]);
          if (isFinite(sx) && isFinite(sy)) {
            pts.u[id] = (sx - bx0) / bw;
            pts.v[id] = 1 - (sy - by0) / bh;
            pts.sx[id] = sx;
            pts.sy[id] = sy;
            ok = true;
          }
        } catch {
          ok = false;
        }
      }
      pts.valid[id] = ok ? 1 : 0;
      if (ok) {
        const sx = pts.sx[id], sy = pts.sy[id], px = pts.x[id], py = pts.y[id];
        if (sx < sMinX) sMinX = sx;
        if (sx > sMaxX) sMaxX = sx;
        if (sy < sMinY) sMinY = sy;
        if (sy > sMaxY) sMaxY = sy;
        if (px < dMinX) dMinX = px;
        if (px > dMaxX) dMaxX = px;
        if (py < dMinY) dMinY = py;
        if (py > dMaxY) dMaxY = py;
      }
    }
  }

  /** u of b brought within half a texture of a, when u repeats. */
  const near = (a: number, b: number): number => (o.wrapU ? b - Math.round(b - a) : b);

  // Output triangles, as point ids (crossing points are points too).
  const tris: number[] = [];
  const mixedLeaves: number[] = [];   // triangles (3 ids each) with mixed validity
  const stats: RefineStats = { points: 0, levels: 0, leaves: 0, clipped: 0, dropped: 0, budgetHit: false };

  /** Two triangles for a cell, in the base grid's pattern (diagonal c10-c01). */
  const emitCell = (c: Cell, clip: boolean) => {
    const c00 = at(c.i, c.j), c10 = at(c.i + c.s, c.j), c01 = at(c.i, c.j + c.s), c11 = at(c.i + c.s, c.j + c.s);
    for (const t of [[c00, c01, c10], [c10, c01, c11]]) {
      const nv = pts.valid[t[0]] + pts.valid[t[1]] + pts.valid[t[2]];
      if (nv === 3) tris.push(t[0], t[1], t[2]);
      else if (nv > 0 && clip) mixedLeaves.push(t[0], t[1], t[2]);
    }
    stats.leaves++;
  };
  const vr = o.viewRect;
  const inView = (c: Cell): boolean => {
    if (!vr) return true;
    const x0 = minX + c.i * stepX, y0 = minY + c.j * stepY;
    return x0 <= vr[2] && x0 + c.s * stepX >= vr[0] && y0 <= vr[3] && y0 + c.s * stepY >= vr[1];
  };

  /**
   * How far linear interpolation puts the texture from where it belongs,
   * in screen pixels, at the cell's centre and edge midpoints. Infinity when
   * a test point is off the map or the cell wraps round the texture.
   */
  const cellError = (c: Cell): number => {
    const h = c.s >> 1;
    const c00 = at(c.i, c.j), c10 = at(c.i + c.s, c.j), c01 = at(c.i, c.j + c.s), c11 = at(c.i + c.s, c.j + c.s);
    const u00 = pts.u[c00], u10 = near(u00, pts.u[c10]), u01 = near(u00, pts.u[c01]), u11 = near(u00, pts.u[c11]);
    const v00 = pts.v[c00], v10 = pts.v[c10], v01 = pts.v[c01], v11 = pts.v[c11];
    if (o.wrapU && Math.max(u00, u10, u01, u11) - Math.min(u00, u10, u01, u11) > 0.5) return Infinity;
    // Jacobian d(uv)/d(display) across the cell.
    const w = c.s * stepX, hh = c.s * stepY;
    const dudx = ((u10 - u00) + (u11 - u01)) / (2 * w), dudy = ((u01 - u00) + (u11 - u10)) / (2 * hh);
    const dvdx = ((v10 - v00) + (v11 - v01)) / (2 * w), dvdy = ((v01 - v00) + (v11 - v10)) / (2 * hh);
    const det = dudx * dvdy - dudy * dvdx;
    if (!isFinite(det) || Math.abs(det) < 1e-30) return Infinity;
    const tests: [number, number, number, number, number][] = [
      // id, interpolated u, v
      [at(c.i + h, c.j), (u00 + u10) / 2, (v00 + v10) / 2, 0, 0],
      [at(c.i + h, c.j + c.s), (u01 + u11) / 2, (v01 + v11) / 2, 0, 0],
      [at(c.i, c.j + h), (u00 + u01) / 2, (v00 + v01) / 2, 0, 0],
      [at(c.i + c.s, c.j + h), (u10 + u11) / 2, (v10 + v11) / 2, 0, 0],
      [at(c.i + h, c.j + h), (u10 + u01) / 2, (v10 + v01) / 2, 0, 0]
    ];
    let worst = 0;
    for (const [id, ui, vi] of tests) {
      if (!pts.valid[id]) return Infinity;
      const du = ui - near(u00, pts.u[id]), dv = vi - pts.v[id];
      // display offset = J^-1 (du, dv)
      const ddx = (dvdy * du - dudy * dv) / det;
      const ddy = (-dvdx * du + dudx * dv) / det;
      const e = Math.hypot(ddx, ddy) / o.pxSize;
      if (e > worst) worst = e;
    }
    return worst;
  };

  // Level by level: every cell in the queue has its corners and test points
  // evaluated in one batch, then is kept, split, or treated as a leaf.
  let queue: Cell[] = [];
  for (let j = 0; j < grid.rows; j++) for (let i = 0; i < grid.cols; i++) queue.push({ i: i * S, j: j * S, s: S });

  while (queue.length) {
    stats.levels++;
    for (const c of queue) {
      at(c.i, c.j); at(c.i + c.s, c.j); at(c.i, c.j + c.s); at(c.i + c.s, c.j + c.s);
    }
    yield* flush();
    // Cells whose corners are all on the map get their test points; mixed
    // cells need none (they split, or are clipped at the finest level).
    for (const c of queue) {
      if (c.s < 2 || !inView(c)) continue;
      const nv = pts.valid[at(c.i, c.j)] + pts.valid[at(c.i + c.s, c.j)] +
        pts.valid[at(c.i, c.j + c.s)] + pts.valid[at(c.i + c.s, c.j + c.s)];
      if (nv === 4) {
        const h = c.s >> 1;
        at(c.i + h, c.j); at(c.i + h, c.j + c.s); at(c.i, c.j + h); at(c.i + c.s, c.j + h); at(c.i + h, c.j + h);
      }
    }
    yield* flush();

    const overBudget = pts.n > maxPoints;
    if (overBudget) stats.budgetHit = true;
    const next: Cell[] = [];
    for (const c of queue) {
      const nv = pts.valid[at(c.i, c.j)] + pts.valid[at(c.i + c.s, c.j)] +
        pts.valid[at(c.i, c.j + c.s)] + pts.valid[at(c.i + c.s, c.j + c.s)];
      if (nv === 0) continue;   // off the map
      const seen = inView(c);
      let split = false;
      if (c.s >= 2 && !overBudget && seen) {
        split = nv < 4 || cellError(c) > maxErrorPx;
      }
      if (split) {
        const h = c.s >> 1;
        next.push({ i: c.i, j: c.j, s: h }, { i: c.i + h, j: c.j, s: h },
          { i: c.i, j: c.j + h, s: h }, { i: c.i + h, j: c.j + h, s: h });
      } else {
        emitCell(c, seen);
      }
    }
    queue = next;
  }

  // The edge of the map: each leaf triangle with corners on both sides is
  // clipped where its edges cross, found by bisection. Edges are shared
  // between neighbours, so their crossings are too.
  const crossings = new Map<string, { a: number; b: number; lo: number; hi: number; id: number }>();
  const edgeKey = (a: number, b: number) => (a < b ? `${a},${b}` : `${b},${a}`);
  for (let t = 0; t < mixedLeaves.length; t += 3) {
    for (let k = 0; k < 3; k++) {
      const a = mixedLeaves[t + k], b = mixedLeaves[t + (k + 1) % 3];
      if (pts.valid[a] === pts.valid[b]) continue;
      const key = edgeKey(a, b);
      if (crossings.has(key)) continue;
      const [va, vb] = pts.valid[a] ? [a, b] : [b, a];
      crossings.set(key, { a: va, b: vb, lo: 0, hi: 1, id: -1 });
    }
  }
  const edges = [...crossings.values()];
  for (let step = 0; step < edgeSteps && edges.length; step++) {
    const probe: number[] = [];
    for (const e of edges) {
      const m = (e.lo + e.hi) / 2;
      probe.push(pts.add(pts.x[e.a] + (pts.x[e.b] - pts.x[e.a]) * m, pts.y[e.a] + (pts.y[e.b] - pts.y[e.a]) * m));
    }
    pending.push(...probe);
    yield* flush();
    edges.forEach((e, q) => {
      const m = (e.lo + e.hi) / 2;
      if (pts.valid[probe[q]]) {
        e.lo = m;
        e.id = probe[q];
      } else {
        e.hi = m;
      }
    });
  }
  for (const e of edges) if (e.id < 0) e.id = e.a;   // never found: use the valid end

  for (let t = 0; t < mixedLeaves.length; t += 3) {
    const poly: number[] = [];
    for (let k = 0; k < 3; k++) {
      const a = mixedLeaves[t + k], b = mixedLeaves[t + (k + 1) % 3];
      if (pts.valid[a]) poly.push(a);
      if (pts.valid[a] !== pts.valid[b]) poly.push(crossings.get(edgeKey(a, b))!.id);
    }
    for (let k = 1; k + 1 < poly.length; k++) tris.push(poly[0], poly[k], poly[k + 1]);
    stats.clipped++;
  }

  // De-index, unwrapping u per triangle; anything still wrapping is a pole.
  const nTri = tris.length / 3;
  const outPos = new Float32Array(nTri * 9);
  const outUV = new Float32Array(nTri * 6);
  let n = 0;
  for (let t = 0; t < tris.length; t += 3) {
    const a = tris[t], b = tris[t + 1], c = tris[t + 2];
    const ua = pts.u[a], ub = near(ua, pts.u[b]), uc = near(ua, pts.u[c]);
    if (o.wrapU && Math.max(ua, ub, uc) - Math.min(ua, ub, uc) > 0.5) {
      stats.dropped++;
      continue;
    }
    const ids = [a, b, c], us = [ua, ub, uc];
    for (let k = 0; k < 3; k++) {
      outPos[n * 9 + k * 3] = pts.x[ids[k]];
      outPos[n * 9 + k * 3 + 1] = pts.y[ids[k]];
      outPos[n * 9 + k * 3 + 2] = 0;
      outUV[n * 6 + k * 2] = us[k];
      outUV[n * 6 + k * 2 + 1] = pts.v[ids[k]];
    }
    n++;
  }
  const idx = new Uint32Array(n * 3);
  for (let i = 0; i < idx.length; i++) idx[i] = i;
  stats.points = pts.n;

  let baseValid = 0;
  for (let J = 0; J <= NY; J += S) for (let I = 0; I <= NX; I += S) baseValid += pts.valid[at(I, J)];

  return {
    positions: outPos.subarray(0, n * 9),
    texCoords: outUV.subarray(0, n * 6),
    indices: idx,
    triangleCount: n,
    validFraction: baseValid / ((grid.cols + 1) * (grid.rows + 1)),
    seamDropped: stats.dropped,
    sourceBBox: isFinite(sMinX) ? { minX: sMinX, minY: sMinY, maxX: sMaxX, maxY: sMaxY } : null,
    displayBBox: isFinite(dMinX) ? { minX: dMinX, minY: dMinY, maxX: dMaxX, maxY: dMaxY } : null,
    refine: stats
  };
}

/** Run the refinement with a synchronous display transform (proj4js). */
export function refineSync(grid: GridMesh, geo: GeoTransform, o: RefineOptions): LayerGeometry & { refine: RefineStats } {
  if (!geo.toGeoSync || !geo.fromGeoSync) throw new Error('refineSync needs a synchronous transform');
  const gen = refineLayerGeometry(grid, o);
  let r = gen.next();
  while (!r.done) {
    const lonlat = geo.toGeoSync(r.value);
    const back = geo.fromGeoSync(lonlat);
    r = gen.next({ lonlat, back });
  }
  return r.value;
}

/** The same with any executor (PROJ in a worker): one round trip per batch. */
export async function refineAsync(grid: GridMesh, geo: GeoTransform, o: RefineOptions): Promise<LayerGeometry & { refine: RefineStats }> {
  const gen = refineLayerGeometry(grid, o);
  let r = gen.next();
  while (!r.done) {
    const lonlat = await geo.toGeo(r.value);
    const back = await geo.fromGeo(lonlat);
    r = gen.next({ lonlat, back });
  }
  return r.value;
}
