/**
 * Straight-in-the-layer-CRS edges, drawn in the display CRS.
 *
 * A vector edge is straight in its layer's CRS (the GIS meaning of a
 * polygon edge). In another CRS it is a curve, so each edge is halved,
 * in layer coordinates, until its projected midpoint lies within a
 * tolerance of the projected chord. Densification is adaptive and done
 * per view: the tolerance is a fraction of a screen pixel, so a zoomed-out
 * globe gets few extra points and a close-up gets what it needs.
 *
 * The same halving finds where an edge leaves the map. A vertex that does
 * not project (the far side of an orthographic globe, beyond a gnomonic
 * horizon) breaks the line; the edge between a visible and an invisible
 * vertex is halved towards the horizon so the line reaches it. An edge whose
 * midpoint keeps landing far from its chord at the last halving crosses a
 * break in the projection (the antimeridian of a world projection, the gap
 * between lobes) and is cut there instead of drawn across the map.
 *
 * The work is a generator that yields batches of layer-CRS points and
 * receives their display coordinates (NaN where a point is not on the map).
 * One batch per round of halving, so the same code runs on proj4js
 * synchronously and on PROJ in wasm with one worker round trip per round.
 */

export interface DensifyOptions {
  /** Allowed deviation of a projected midpoint from the chord, display units. */
  tol: number;
  /** Halvings per original edge; 2^maxDepth points at most. */
  maxDepth: number;
  /** Stop refining once this many midpoints have been asked for. */
  budget?: number;
}

/** A run of consecutive display points with no break in it. */
export interface DisplayPath {
  xy: Float64Array;
  /** The whole ring came through unbroken and closes on itself. */
  closed: boolean;
}

export interface DensifiedPart {
  paths: DisplayPath[];
  /** Nothing was dropped or cut: a polygon ring that is intact can be filled. */
  intact: boolean;
}

interface Node {
  lx: number; ly: number;    // layer CRS
  dx: number; dy: number;    // display CRS, NaN if not on the map
  next: Node | null;
  cut: boolean;              // the edge from here to next crosses a break
}

interface Pending { a: Node; depth: number; mx: number; my: number; }

function onMap(n: Node): boolean {
  return isFinite(n.dx) && isFinite(n.dy);
}

/**
 * How far the projected midpoint m is from where a straight display edge
 * a-b would put it. Returns true if the edge needs halving.
 *
 * Two measures: the perpendicular distance from the chord, which catches
 * curvature, and where along the chord m falls. A smooth map puts the
 * midpoint near the middle once edges are short; an edge across a break
 * puts it near one end however short the edge gets, while its perpendicular
 * distance can be zero (a cut along a parallel in a cylindrical projection).
 */
function needsSplit(a: Node, b: Node, mx: number, my: number, tol: number): boolean {
  const cx = b.dx - a.dx, cy = b.dy - a.dy;
  const len2 = cx * cx + cy * cy;
  const ex = mx - a.dx, ey = my - a.dy;
  if (len2 <= tol * tol) return ex * ex + ey * ey > tol * tol;
  const len = Math.sqrt(len2);
  const perp = Math.abs(ex * cy - ey * cx) / len;
  const t = (ex * cx + ey * cy) / len2;
  return perp > tol || Math.abs(t - 0.5) > 0.25;
}

function isRing(p: Float64Array): boolean {
  const n = p.length;
  return n >= 8 && p[0] === p[n - 2] && p[1] === p[n - 1];
}

/**
 * Densify parts given in layer coordinates. With `edges` false the parts are
 * point sets: their vertices are projected and nothing is halved.
 */
export function* densifyParts(
  parts: Float64Array[],
  opts: DensifyOptions,
  edges: boolean
): Generator<Float64Array, DensifiedPart[], Float64Array> {
  // Round 0: every vertex.
  let total = 0;
  for (const p of parts) total += p.length;
  const all = new Float64Array(total);
  let o = 0;
  for (const p of parts) { all.set(p, o); o += p.length; }
  const xy0 = yield all;

  const heads: (Node | null)[] = [];
  o = 0;
  for (const p of parts) {
    let head: Node | null = null, tail: Node | null = null;
    for (let i = 0; i < p.length; i += 2) {
      const n: Node = { lx: p[i], ly: p[i + 1], dx: xy0[o + i], dy: xy0[o + i + 1], next: null, cut: false };
      if (tail) tail.next = n; else head = n;
      tail = n;
    }
    heads.push(head);
    o += p.length;
  }

  if (edges) {
    let queue: Pending[] = [];
    const enqueue = (a: Node, depth: number) => {
      const b = a.next!;
      if (!onMap(a) && !onMap(b)) return;
      queue.push({ a, depth, mx: (a.lx + b.lx) / 2, my: (a.ly + b.ly) / 2 });
    };
    for (const h of heads) for (let n = h; n && n.next; n = n.next) enqueue(n, 0);

    let asked = 0;
    const budget = opts.budget ?? Infinity;
    while (queue.length > 0 && asked < budget) {
      const req = new Float64Array(queue.length * 2);
      for (let i = 0; i < queue.length; i++) { req[i * 2] = queue[i].mx; req[i * 2 + 1] = queue[i].my; }
      asked += queue.length;
      const got = yield req;
      const next: Pending[] = [];
      const push = (a: Node, depth: number) => {
        const b = a.next!;
        if (!onMap(a) && !onMap(b)) return;
        next.push({ a, depth, mx: (a.lx + b.lx) / 2, my: (a.ly + b.ly) / 2 });
      };
      for (let i = 0; i < queue.length; i++) {
        const { a, depth, mx, my } = queue[i];
        const b = a.next!;
        const dx = got[i * 2], dy = got[i * 2 + 1];
        const mOn = isFinite(dx) && isFinite(dy);
        const both = onMap(a) && onMap(b);
        const split = both ? (!mOn || needsSplit(a, b, dx, dy, opts.tol)) : true;
        if (!split) continue;
        if (depth >= opts.maxDepth) {
          // Out of halvings. An edge still bending away from its chord with
          // both ends on the map crosses a break: cut it rather than draw
          // a line across the map.
          if (both) a.cut = true;
          continue;
        }
        const m: Node = { lx: mx, ly: my, dx, dy, next: b, cut: false };
        a.next = m;
        push(a, depth + 1);
        push(m, depth + 1);
      }
      queue = next;
    }
  }

  // Walk each part into runs of on-map nodes, breaking at cuts.
  const out: DensifiedPart[] = [];
  for (let k = 0; k < parts.length; k++) {
    const paths: DisplayPath[] = [];
    let run: number[] = [];
    let broken = false;
    const flush = () => {
      if (run.length >= (edges ? 4 : 2)) paths.push({ xy: Float64Array.from(run), closed: false });
      run = [];
    };
    for (let n = heads[k]; n; n = n.next) {
      if (!onMap(n)) { broken = true; flush(); continue; }
      run.push(n.dx, n.dy);
      if (!edges) { flush(); continue; }
      if (n.cut) { broken = true; flush(); }
    }
    flush();
    const intact = !broken;
    if (edges && intact && paths.length === 1 && isRing(parts[k])) paths[0].closed = true;
    out.push({ paths, intact });
  }
  return out;
}

/** Run a densification to the end with a synchronous projector. */
export function runSync(
  gen: Generator<Float64Array, DensifiedPart[], Float64Array>,
  project: (layerXY: Float64Array) => Float64Array
): DensifiedPart[] {
  let r = gen.next();
  while (!r.done) r = gen.next(project(r.value));
  return r.value;
}

/** Run a densification to the end with a projector that may be asynchronous. */
export async function runAsync(
  gen: Generator<Float64Array, DensifiedPart[], Float64Array>,
  project: (layerXY: Float64Array) => Promise<Float64Array>
): Promise<DensifiedPart[]> {
  let r = gen.next();
  while (!r.done) r = gen.next(await project(r.value));
  return r.value;
}
