/**
 * Draws one vector layer on a 2D canvas above the WebGL map.
 *
 * It implements the engine seam (engine/types.ts EngineSeam), with the 2D
 * context as the surface it draws on. The verbs are split by cost:
 *
 *   layout()   every view change. Projects and densifies for the new
 *              display CRS and zoom. A small layer is done in full; a large
 *              one gets a coarse pass (every k-th vertex, few halvings) so
 *              dragging a centred projection stays live.
 *   refresh()  debounced. The full densification, if layout was coarse.
 *   draw()     every frame. Canvas paths from the display coordinates.
 *
 * Results are kept per (display CRS, zoom), so panning in fixed mode costs
 * nothing but the draw. Under PROJ (either CRS) the work is asynchronous
 * and lands a frame or so later through onChange.
 *
 * Canvas 2D is exact and simple and fine for tens of thousands of
 * vertices; a WebGL engine can replace it behind the same verbs.
 */

import { EngineSeam, RenderContext } from '../engine/types';
import { copyIndex } from '../core/wrap';
import { Feature, GeomKind, VectorData, featureBounds, vertexCount } from './types';
import { DensifiedPart, DisplayPath, densifyParts, runAsync, runSync } from './densify';
import { makeProjector, Projector } from './project';

export interface VectorStyle {
  /** CSS colour for lines, outlines and points. */
  stroke: string;
  /** Polygon fill opacity, 0 for none; the fill is the stroke colour. */
  fillOpacity: number;
  /** Line width, CSS pixels. */
  width: number;
  /** Point radius, CSS pixels. */
  radius: number;
  opacity: number;
}

export function defaultVectorStyle(stroke: string): VectorStyle {
  return { stroke, fillOpacity: 0.25, width: 1.5, radius: 3.5, opacity: 1 };
}

/** One feature as the display sees it. */
export interface DisplayFeature {
  kind: GeomKind;
  /** Lines and outlines (and, for points, single-point paths). */
  paths: DisplayPath[];
  /** Polygon rings to fill, when every ring came through intact. */
  fill: Float64Array[] | null;
  /** Display bbox, for culling. */
  minX: number; minY: number; maxX: number; maxY: number;
}

export interface VectorStatus {
  features: number;
  vertices: number;
  /** Display points drawn after densification. */
  drawnPoints: number;
  /** Features with something on the map. */
  visible: number;
  coarse: boolean;
  loading: boolean;
}

/** Midpoint budget and depth: full, and the coarse pass for big layers on view changes. */
const FULL = { maxDepth: 10, budget: 2_000_000 };
const COARSE = { maxDepth: 3, budget: 20_000 };
/**
 * Layers up to this many vertices are densified in full on every layout;
 * bigger ones are thinned to about this many while the view moves. Each
 * vertex costs four proj4js transforms (there and back, for the validity
 * test), roughly 10 us, so this keeps a layout near 50 ms.
 */
const LIVE_VERTICES = 5_000;
/** Allowed deviation from the true curve, and the round-trip tolerance, in screen pixels. */
const TOL_PX = 0.5;
const ROUND_TRIP_PX = 2;

export class VectorEngine implements EngineSeam<CanvasRenderingContext2D, VectorStatus> {
  readonly kind = 'canvas';
  readonly data: VectorData;
  private style: VectorStyle;
  private onChange: () => void;
  private nVertices: number;
  /** The features thinned for the coarse pass, made on first need. */
  private thinned: Feature[] | null = null;

  private display: DisplayFeature[] = [];
  private key = '';
  private coarse = false;
  private loading = false;
  private generation = 0;

  constructor(data: VectorData, style: VectorStyle, onChange: () => void) {
    this.data = data;
    this.style = style;
    this.onChange = onChange;
    this.nVertices = vertexCount(data.features);
  }

  setStyle(style: VectorStyle): void {
    this.style = style;
  }

  getStyle(): VectorStyle {
    return this.style;
  }

  layout(ctx: RenderContext): void {
    const live = this.nVertices <= LIVE_VERTICES;
    this.run(ctx, live ? FULL : COARSE, !live);
  }

  /** Resolves true if the display geometry changed and wants a redraw. */
  async refresh(ctx: RenderContext): Promise<boolean> {
    if (!this.coarse || this.key !== keyOf(ctx)) return false;
    this.key = '';
    await this.run(ctx, FULL, false);
    return true;
  }

  /** Forget the cached display geometry, e.g. after the features changed. */
  invalidate(): void {
    this.key = '';
    this.thinned = null;
    this.nVertices = vertexCount(this.data.features);
    this.data.bounds = featureBounds(this.data.features);
  }

  /**
   * The topmost feature under a display point, or -1. The point is in the
   * base copy of the world, where display geometry lives (edit/pointer.ts
   * screenToDisplay makes one from the pointer). Tested against what is
   * drawn: points and lines within tolPx, polygons inside their fill (or on
   * their outline when they could not be filled).
   */
  hitTest(ctx: RenderContext, x: number, y: number, tolPx = 6): number {
    const d = tolPx / Math.pow(2, ctx.view.zoom);
    for (let i = this.display.length - 1; i >= 0; i--) {
      const f = this.display[i];
      if (x < f.minX - d || x > f.maxX + d || y < f.minY - d || y > f.maxY + d) continue;
      if (f.kind === 'polygon' && f.fill && insideRings(f.fill, x, y)) return i;
      for (const p of f.paths) {
        const xy = p.xy;
        if (xy.length === 2) {
          if (Math.hypot(xy[0] - x, xy[1] - y) <= d) return i;
          continue;
        }
        for (let k = 0; k + 3 < xy.length; k += 2) {
          if (segDist(x, y, xy[k], xy[k + 1], xy[k + 2], xy[k + 3]) <= d) return i;
        }
      }
    }
    return -1;
  }

  /** Draw some of this layer's features in another style (selection highlight). */
  drawSubset(g: CanvasRenderingContext2D, ctx: RenderContext, indices: Iterable<number>, style: VectorStyle): void {
    const subset: DisplayFeature[] = [];
    for (const i of indices) if (this.display[i]) subset.push(this.display[i]);
    drawDisplay(g, ctx, subset, style);
  }

  private run(ctx: RenderContext, depth: { maxDepth: number; budget: number }, coarse: boolean): Promise<void> {
    const key = keyOf(ctx);
    if (key === this.key && (!this.coarse || coarse)) return Promise.resolve();
    const scale = Math.pow(2, ctx.view.zoom);
    const projector = makeProjector(this.data.crs, ctx.view.crs, ROUND_TRIP_PX / scale);
    const opts = { tol: TOL_PX / scale, ...depth };
    const gen = ++this.generation;
    const features = coarse ? this.thin() : this.data.features;
    if (projector.sync) {
      this.display = buildDisplay(features, projector, opts);
      this.key = key;
      this.coarse = coarse;
      return Promise.resolve();
    }
    this.loading = true;
    return buildDisplayAsync(features, projector, opts).then((d) => {
      if (gen !== this.generation) return;
      this.display = d;
      this.key = key;
      this.coarse = coarse;
      this.loading = false;
      this.onChange();
    }).catch((err) => {
      this.loading = false;
      console.warn(`vector layout (${this.data.label}) failed:`, err);
    });
  }

  /**
   * Every k-th vertex of each part, keeping its ends (so rings stay closed),
   * with k chosen to bring the layer near LIVE_VERTICES. Points are kept.
   */
  private thin(): Feature[] {
    if (this.thinned) return this.thinned;
    const k = Math.max(1, Math.ceil(this.nVertices / LIVE_VERTICES));
    this.thinned = this.data.features.map((f) => {
      if (f.kind === 'point' || k === 1) return f;
      const parts = f.parts.map((p) => {
        const n = p.length / 2;
        if (n <= 4) return p;
        const out: number[] = [];
        for (let i = 0; i < n - 1; i += k) out.push(p[i * 2], p[i * 2 + 1]);
        out.push(p[n * 2 - 2], p[n * 2 - 1]);
        if (f.kind === 'polygon' && out.length < 8) return p;
        return Float64Array.from(out);
      });
      return { ...f, parts };
    });
    return this.thinned;
  }

  draw(ctx: RenderContext, g: CanvasRenderingContext2D): void {
    drawDisplay(g, ctx, this.display, this.style);
  }

  status(): VectorStatus {
    let pts = 0, visible = 0;
    for (const f of this.display) {
      if (f.paths.length) visible++;
      for (const p of f.paths) pts += p.xy.length / 2;
    }
    return {
      features: this.data.features.length,
      vertices: this.nVertices,
      drawnPoints: pts,
      visible,
      coarse: this.coarse,
      loading: this.loading
    };
  }

  dispose(): void {
    this.generation++;
    this.display = [];
  }
}

/** Draw display features on a 2D canvas, once per copy of the world the view touches. */
export function drawDisplay(g: CanvasRenderingContext2D, ctx: RenderContext, display: DisplayFeature[], st: VectorStyle): void {
  const { view } = ctx;
  const s = Math.pow(2, view.zoom);
  const hw = view.width / 2, hh = view.height / 2;
  const vx0 = view.centreX - hw / s, vx1 = view.centreX + hw / s;
  const vy0 = view.centreY - hh / s, vy1 = view.centreY + hh / s;

  // Copies of the world the view touches, when the projection repeats.
  let kMin = 0, kMax = 0;
  const w = ctx.wrap;
  if (w) {
    kMin = Infinity; kMax = -Infinity;
    for (const [x, y] of [[vx0, vy0], [vx1, vy0], [vx0, vy1], [vx1, vy1]]) {
      const k = copyIndex(w, x, y);
      kMin = Math.min(kMin, k);
      kMax = Math.max(kMax, k);
    }
    kMin -= 1; kMax += 1;
  }

  g.save();
  g.globalAlpha = st.opacity;
  g.strokeStyle = st.stroke;
  g.fillStyle = st.stroke;
  g.lineWidth = st.width;
  g.lineJoin = 'round';
  g.lineCap = 'round';

  for (let k = kMin; k <= kMax; k++) {
    const ox = w ? k * w.tx : 0, oy = w ? k * w.ty : 0;
    // display -> CSS pixels, y up -> y down
    const tx = (x: number) => (x + ox - view.centreX) * s + hw;
    const ty = (y: number) => hh - (y + oy - view.centreY) * s;
    const x0 = vx0 - ox, x1 = vx1 - ox, y0 = vy0 - oy, y1 = vy1 - oy;

    for (const f of display) {
      if (f.maxX < x0 || f.minX > x1 || f.maxY < y0 || f.minY > y1) continue;
      if (f.kind === 'point') {
        g.beginPath();
        for (const p of f.paths) {
          const px = tx(p.xy[0]), py = ty(p.xy[1]);
          g.moveTo(px + st.radius, py);
          g.arc(px, py, st.radius, 0, Math.PI * 2);
        }
        g.globalAlpha = st.opacity * 0.6;
        g.fill();
        g.globalAlpha = st.opacity;
        g.stroke();
        continue;
      }
      if (f.fill && st.fillOpacity > 0) {
        g.beginPath();
        for (const r of f.fill) trace(g, r, tx, ty, true);
        g.globalAlpha = st.opacity * st.fillOpacity;
        g.fill('evenodd');
        g.globalAlpha = st.opacity;
      }
      g.beginPath();
      for (const p of f.paths) trace(g, p.xy, tx, ty, p.closed);
      g.stroke();
    }
  }
  g.restore();
}

function insideRings(rings: Float64Array[], x: number, y: number): boolean {
  let inside = false;
  for (const r of rings) {
    for (let i = 0, j = r.length - 2; i < r.length; j = i, i += 2) {
      const xi = r[i], yi = r[i + 1], xj = r[j], yj = r[j + 1];
      if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
    }
  }
  return inside;
}

function segDist(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const cx = bx - ax, cy = by - ay;
  const len2 = cx * cx + cy * cy;
  let t = len2 > 0 ? ((px - ax) * cx + (py - ay) * cy) / len2 : 0;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (ax + t * cx), py - (ay + t * cy));
}

function keyOf(ctx: RenderContext): string {
  return `${ctx.view.crs}|${ctx.view.zoom}`;
}

function trace(
  g: CanvasRenderingContext2D, xy: Float64Array,
  tx: (x: number) => number, ty: (y: number) => number, close: boolean
): void {
  g.moveTo(tx(xy[0]), ty(xy[1]));
  for (let i = 2; i < xy.length; i += 2) g.lineTo(tx(xy[i]), ty(xy[i + 1]));
  if (close) g.closePath();
}

// ---------------------------------------------------------------------------
// Layer coordinates -> display features
// ---------------------------------------------------------------------------

interface Plan {
  edgeParts: Float64Array[];
  pointParts: Float64Array[];
  /** per feature: where its parts sit in edgeParts / pointParts */
  index: { kind: GeomKind; start: number; count: number }[];
}

function plan(features: Feature[]): Plan {
  const edgeParts: Float64Array[] = [];
  const pointParts: Float64Array[] = [];
  const index: Plan['index'] = [];
  for (const f of features) {
    if (f.kind === 'point') {
      // Each point is its own part so one off the map drops alone.
      const start = pointParts.length;
      for (const p of f.parts) for (let i = 0; i < p.length; i += 2) pointParts.push(p.subarray(i, i + 2));
      index.push({ kind: 'point', start, count: pointParts.length - start });
    } else {
      index.push({ kind: f.kind, start: edgeParts.length, count: f.parts.length });
      edgeParts.push(...f.parts);
    }
  }
  return { edgeParts, pointParts, index };
}

function assemble(p: Plan, edges: DensifiedPart[], points: DensifiedPart[]): DisplayFeature[] {
  const out: DisplayFeature[] = [];
  for (const ix of p.index) {
    const src = ix.kind === 'point' ? points : edges;
    const parts = src.slice(ix.start, ix.start + ix.count);
    const paths: DisplayPath[] = [];
    for (const d of parts) paths.push(...d.paths);
    let fill: Float64Array[] | null = null;
    if (ix.kind === 'polygon' && parts.every((d) => d.intact && d.paths.length === 1 && d.paths[0].closed)) {
      fill = parts.map((d) => d.paths[0].xy);
    }
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const path of paths) {
      const xy = path.xy;
      for (let i = 0; i < xy.length; i += 2) {
        if (xy[i] < minX) minX = xy[i];
        if (xy[i] > maxX) maxX = xy[i];
        if (xy[i + 1] < minY) minY = xy[i + 1];
        if (xy[i + 1] > maxY) maxY = xy[i + 1];
      }
    }
    out.push({ kind: ix.kind, paths, fill, minX, minY, maxX, maxY });
  }
  return out;
}

type Opts = { tol: number; maxDepth: number; budget?: number };

/**
 * A few features (a sketch, a feature being dragged) for the current view,
 * synchronously when proj4js runs both CRSs, else null (the caller can
 * fall back to buildDisplayAsync).
 */
export function displayNow(features: Feature[], crs: string, ctx: RenderContext): DisplayFeature[] | null {
  const scale = Math.pow(2, ctx.view.zoom);
  const projector = makeProjector(crs, ctx.view.crs, ROUND_TRIP_PX / scale);
  if (!projector.sync) return null;
  return buildDisplay(features, projector, { tol: TOL_PX / scale, ...FULL });
}

export function buildDisplay(features: Feature[], projector: Projector, opts: Opts): DisplayFeature[] {
  const p = plan(features);
  const edges = runSync(densifyParts(p.edgeParts, opts, true), projector.sync!);
  const points = runSync(densifyParts(p.pointParts, opts, false), projector.sync!);
  return assemble(p, edges, points);
}

export async function buildDisplayAsync(features: Feature[], projector: Projector, opts: Opts): Promise<DisplayFeature[]> {
  const p = plan(features);
  const [edges, points] = await Promise.all([
    runAsync(densifyParts(p.edgeParts, opts, true), projector.async),
    runAsync(densifyParts(p.pointParts, opts, false), projector.async)
  ]);
  return assemble(p, edges, points);
}
