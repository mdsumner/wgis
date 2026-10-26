/**
 * Drawing and editing vector layers, in each layer's own CRS.
 *
 * The pointer is on the display; the feature is in its layer's CRS. A click
 * goes screen -> display -> lon/lat -> layer CRS in one function,
 * pointerToLayer in pointer.ts (with the display's round trip test, so a
 * click off the edge of the world adds nothing), and every vertex is stored
 * there. Edges are straight in the layer CRS, so a line drawn into an
 * EPSG:3031 layer while looking at an orthographic globe bends as it is
 * drawn: the sketch is densified for the display exactly like the layer is.
 *
 * Modes
 *   pan       the map moves; nothing else happens
 *   select    click selects the topmost feature (shift adds or removes);
 *             dragging a selected feature moves it, in the layer CRS
 *   point     click adds a point
 *   line      click adds vertices; double-click or Enter finishes
 *   polygon   the same, closing the ring
 *   vertex    handles on the selected features' vertices and edge
 *             midpoints: drag a vertex to move it, drag a midpoint to add
 *             one, Alt-click (or Delete over it) removes one
 *
 * Panning still works in every mode: a click is a press and release that
 * did not move, anything else is a drag of the map.
 *
 * Undo keeps whole feature arrays: features are never changed in place
 * (geom.ts returns new ones), so an edit is "this layer's array was A, now
 * it is B", and undo puts A back.
 *
 * Copy and paste follow Manifold: copied features keep their CRS, and a
 * paste into a layer converts them to that layer's CRS on the way in
 * (keeping their shape, see reproject.ts, unless asked not to); "paste as
 * layer" makes a new temporary layer in the CRS they came from. The system
 * clipboard also gets them as lon/lat GeoJSON for other programs, and
 * GeoJSON text pasted from elsewhere (geojson.io, a text editor) comes in
 * the same way.
 */

import { RenderContext } from '../engine/types';
import { copyIndex } from '../core/wrap';
import { Feature } from '../vector/types';
import {
  DisplayFeature, VectorEngine, VectorStyle, buildDisplayAsync, displayNow, drawDisplay
} from '../vector/vectorEngine';
import { makeProjector } from '../vector/project';
import { cloneFeatures, reprojectFeatures } from '../vector/reproject';
import { toGeoJSONText } from '../vector/write';
import { readGeoJSONText } from '../vector/read';
import * as G from './geom';
import { pointerToLayer, screenToDisplay } from './pointer';

export type EditMode = 'pan' | 'select' | 'point' | 'line' | 'polygon' | 'vertex';

/** What the editor needs of a vector layer. */
export interface EditLayer {
  id: number;
  engine: VectorEngine;
  /** Changed since it was opened or last saved. */
  modified: boolean;
}

export interface EditorHost {
  canvas: HTMLCanvasElement;
  context(): RenderContext;
  /** Vector layers, bottom to top. */
  layers(): EditLayer[];
  /** Where drawing and pasting go, if anywhere yet. */
  active(): EditLayer | null;
  /** CRS for a layer made because there was nowhere to draw. */
  defaultCRS(): string;
  /** Make a temporary layer (no file behind it) and make it active. */
  newLayer(crs: string, label: string, features: Feature[]): EditLayer;
  /** A layer's features changed: lay it out again, redraw, update the list. */
  changed(layer: EditLayer): void;
  render(): void;
  /** Mode, selection or message changed. */
  panel(): void;
}

interface Op {
  layer: EditLayer;
  before: Feature[];
  after: Feature[];
  what: string;
}

interface Sketch {
  layer: EditLayer;
  kind: 'line' | 'polygon';
  /** Vertices so far, layer CRS. */
  xy: number[];
}

/** A vertex or edge-midpoint handle, display coordinates in the base copy. */
interface Handle {
  fi: number;
  part: number;
  v: number;
  mid: boolean;
  x: number;
  y: number;
}

interface Drag {
  kind: 'vertex' | 'mid' | 'move';
  layer: EditLayer;
  handle: Handle | null;
  /** Pointer at the start, layer CRS (null until an async transform lands). */
  start: Float64Array | null;
  /** Features as they would be if released now, by index. */
  preview: Map<number, Feature> | null;
}

interface Clip {
  crs: string;
  features: Feature[];
  label: string;
  /** What went on the system clipboard, to recognise it coming back. */
  text: string;
}

const HINTS: Record<EditMode, string> = {
  pan: 'drag to pan, wheel to zoom',
  select: 'click a feature to select it, shift-click to add; drag a selected feature to move it',
  point: 'click to add a point',
  line: 'click to add vertices; double-click or Enter finishes, Backspace takes one back, Esc cancels',
  polygon: 'click to add vertices; double-click or Enter closes the ring, Backspace takes one back, Esc cancels',
  vertex: 'drag a vertex to move it, drag a midpoint to add one; Alt-click or Delete removes the vertex under the pointer'
};

const SELECTED: VectorStyle = { stroke: '#ff2a2a', fillOpacity: 0.25, width: 2.5, radius: 5, opacity: 1 };
const SKETCH: VectorStyle = { stroke: '#ffffff', fillOpacity: 0.15, width: 2, radius: 4, opacity: 1 };
/** Pixels a press can move and still be a click. */
const CLICK_PX = 4;
const HANDLE_PX = 7;
/** Above this many handles on screen, vertex editing asks for a closer view. */
const MAX_HANDLES = 4000;

function inField(t: EventTarget | null): boolean {
  const el = t as HTMLElement | null;
  if (!el || !el.tagName) return false;
  return el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable;
}

export class Editor {
  mode: EditMode = 'pan';
  /** Paste converts keeping the shape (densified), or moves vertices only. */
  keepShape = true;
  /** The latest thing worth telling the user. */
  message = '';

  private host: EditorHost;
  private selLayer: EditLayer | null = null;
  private sel = new Set<number>();
  private sketch: Sketch | null = null;
  /** Pointer in the sketch layer's CRS. */
  private hover: Float64Array | null = null;
  private hoverSeq = 0;
  private hoverHandle: Handle | null = null;
  private drag: Drag | null = null;
  private dragSeq = 0;
  private down: { x: number; y: number } | null = null;
  private undoStack: Op[] = [];
  private redoStack: Op[] = [];
  private clip: Clip | null = null;
  private shiftPaste = false;
  /** Bumped whenever features or the selection change; keys cached handles. */
  private version = 0;
  private slots = new Map<string, { key: string; value: unknown; inflight: string | null }>();

  constructor(host: EditorHost) {
    this.host = host;
    window.addEventListener('mousemove', this.onMove);
    window.addEventListener('mouseup', this.onUp);
    window.addEventListener('keydown', this.onKey);
    document.addEventListener('paste', this.onPaste);
  }

  // -------------------------------------------------------------------------
  // State the panel shows
  // -------------------------------------------------------------------------

  hint(): string {
    return HINTS[this.mode];
  }

  canUndo(): boolean { return this.undoStack.length > 0; }
  hasClip(): boolean { return this.clip !== null; }
  canRedo(): boolean { return this.redoStack.length > 0; }

  /** The selection: its layer and feature indices, in order. */
  selection(): { layer: EditLayer; indices: number[] } | null {
    if (!this.selLayer || this.sel.size === 0) return null;
    return { layer: this.selLayer, indices: [...this.sel].sort((a, b) => a - b) };
  }

  setMode(mode: EditMode): void {
    if (this.sketch) this.finish();
    this.mode = mode;
    this.hover = null;
    this.hoverHandle = null;
    this.message = '';
    this.host.canvas.style.cursor = this.cursorFor(null);
    this.host.panel();
    this.host.render();
  }

  /** A layer is going away: forget everything that points at it. */
  forget(layer: EditLayer): void {
    if (this.selLayer === layer) this.clearSelection();
    if (this.sketch?.layer === layer) this.sketch = null;
    this.undoStack = this.undoStack.filter((o) => o.layer !== layer);
    this.redoStack = this.redoStack.filter((o) => o.layer !== layer);
    this.host.panel();
  }

  private say(msg: string): void {
    this.message = msg;
    this.host.panel();
  }

  // -------------------------------------------------------------------------
  // Coordinates
  // -------------------------------------------------------------------------

  private local(e: MouseEvent): [number, number] {
    const r = this.host.canvas.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top];
  }

  /**
   * A value computed asynchronously, remembered under a key. Until it
   * lands this returns the previous value when `stale` is allowed (fine for
   * a preview) or null (handles, which must match what they edit).
   */
  private viaSlot<T>(name: string, key: string, stale: boolean, compute: () => Promise<T>): T | null {
    let s = this.slots.get(name);
    if (!s) { s = { key: '', value: null, inflight: null }; this.slots.set(name, s); }
    if (s.key === key) return s.value as T;
    if (s.inflight !== key) {
      s.inflight = key;
      const slot = s;
      compute().then((v) => {
        if (slot.inflight !== key) return;
        slot.key = key;
        slot.value = v;
        slot.inflight = null;
        this.host.render();
      }).catch((err) => console.warn(`edit (${name}):`, err));
    }
    return stale ? s.value as T | null : null;
  }

  /** A few features for the display, now if proj4js can, else when PROJ answers. */
  private displayOf(name: string, key: string, features: Feature[], crs: string, ctx: RenderContext): DisplayFeature[] | null {
    const now = displayNow(features, crs, ctx);
    if (now) return now;
    const scale = Math.pow(2, ctx.view.zoom);
    return this.viaSlot(name, `${key}|${ctx.view.crs}|${ctx.view.zoom}`, true, () =>
      buildDisplayAsync(features, makeProjector(crs, ctx.view.crs, 2 / scale), { tol: 0.5 / scale, maxDepth: 10 }));
  }

  /** Handles for the selected features, vertex mode only. */
  private handles(ctx: RenderContext): Handle[] | null {
    if (this.mode !== 'vertex' || !this.selLayer || this.sel.size === 0) return null;
    const layer = this.selLayer;
    const feats = layer.engine.data.features;
    const list: Omit<Handle, 'x' | 'y'>[] = [];
    const xy: number[] = [];
    for (const fi of this.sel) {
      const f = feats[fi];
      if (!f) continue;
      f.parts.forEach((p, part) => {
        const slots = G.vertexSlots(f, part);
        for (let v = 0; v < slots; v++) {
          list.push({ fi, part, v, mid: false });
          xy.push(p[v * 2], p[v * 2 + 1]);
        }
        if (f.kind === 'point') return;
        for (let v = 0; v + 1 < p.length / 2; v++) {
          list.push({ fi, part, v, mid: true });
          xy.push((p[v * 2] + p[v * 2 + 2]) / 2, (p[v * 2 + 1] + p[v * 2 + 3]) / 2);
        }
      });
    }
    const crs = layer.engine.data.crs;
    const scale = Math.pow(2, ctx.view.zoom);
    const projector = makeProjector(crs, ctx.view.crs, 2 / scale);
    const src = Float64Array.from(xy);
    const d = projector.sync
      ? projector.sync(src)
      : this.viaSlot(`handles`, `${this.version}|${ctx.view.crs}|${ctx.view.zoom}`, false, () => projector.async(src));
    if (!d) return null;
    const out: Handle[] = [];
    list.forEach((h, i) => {
      const x = d[i * 2], y = d[i * 2 + 1];
      if (isFinite(x) && isFinite(y)) out.push({ ...h, x, y });
    });
    return out;
  }

  /** Base-copy display -> screen for the copy the view centre is in. */
  private screenOf(ctx: RenderContext): (x: number, y: number) => [number, number] {
    const v = ctx.view;
    const s = Math.pow(2, v.zoom);
    let ox = 0, oy = 0;
    if (ctx.wrap) {
      const k = copyIndex(ctx.wrap, v.centreX, v.centreY);
      ox = k * ctx.wrap.tx;
      oy = k * ctx.wrap.ty;
    }
    return (x, y) => [(x + ox - v.centreX) * s + v.width / 2, v.height / 2 - (y + oy - v.centreY) * s];
  }

  private handleAt(ctx: RenderContext, sx: number, sy: number): Handle | null {
    const hs = this.handles(ctx);
    if (!hs || hs.length > MAX_HANDLES * 2) return null;
    const [x, y] = screenToDisplay(ctx, sx, sy);
    const d = HANDLE_PX / Math.pow(2, ctx.view.zoom);
    let best: Handle | null = null, bestD = Infinity;
    for (const h of hs) {
      // Vertices win over midpoints at the same distance.
      const dist = Math.hypot(h.x - x, h.y - y) + (h.mid ? d * 0.25 : 0);
      if (dist <= d && dist < bestD) { best = h; bestD = dist; }
    }
    return best;
  }

  /** Topmost feature under the pointer across the layers, or null. */
  private hitAt(ctx: RenderContext, sx: number, sy: number): { layer: EditLayer; index: number } | null {
    const layers = this.host.layers();
    for (let i = layers.length - 1; i >= 0; i--) {
      const index = layers[i].engine.hitTest(ctx, ...screenToDisplay(ctx, sx, sy));
      if (index >= 0) return { layer: layers[i], index };
    }
    return null;
  }

  // -------------------------------------------------------------------------
  // Pointer
  // -------------------------------------------------------------------------

  /**
   * Asked by the view controller on every press: true takes the gesture
   * (a vertex or feature drag) so the map does not pan.
   */
  claim = (e: MouseEvent): boolean => {
    this.down = { x: e.clientX, y: e.clientY };
    if (e.button !== 0) return false;
    if (this.mode !== 'select' && this.mode !== 'vertex') return false;
    const ctx = this.host.context();
    const [sx, sy] = this.local(e);
    if (this.mode === 'vertex') {
      const h = this.handleAt(ctx, sx, sy);
      if (h && this.selLayer) {
        if (e.altKey && !h.mid) {
          this.deleteVertex(h);
          this.down = null;
          return true;
        }
        this.startDrag(h.mid ? 'mid' : 'vertex', this.selLayer, h, ctx, sx, sy);
        return true;
      }
    }
    if (this.selLayer && this.sel.size && !e.shiftKey) {
      const index = this.selLayer.engine.hitTest(ctx, ...screenToDisplay(ctx, sx, sy));
      if (index >= 0 && this.sel.has(index)) {
        this.startDrag('move', this.selLayer, null, ctx, sx, sy);
        return true;
      }
    }
    return false;
  };

  private startDrag(kind: Drag['kind'], layer: EditLayer, handle: Handle | null, ctx: RenderContext, sx: number, sy: number): void {
    const drag: Drag = { kind, layer, handle, start: null, preview: null };
    this.drag = drag;
    const start = pointerToLayer(ctx, sx, sy, layer.engine.data.crs);
    if (start instanceof Promise) void start.then((p) => { if (this.drag === drag) drag.start = p; });
    else drag.start = start;
    this.host.canvas.style.cursor = kind === 'move' ? 'move' : 'pointer';
  }

  private onMove = (e: MouseEvent): void => {
    if (this.drag) {
      this.dragTo(e);
      return;
    }
    if (e.target !== this.host.canvas || e.buttons) return;
    const ctx = this.host.context();
    const [sx, sy] = this.local(e);
    if (this.mode === 'vertex') {
      const h = this.handleAt(ctx, sx, sy);
      if (h?.fi !== this.hoverHandle?.fi || h?.part !== this.hoverHandle?.part || h?.v !== this.hoverHandle?.v || h?.mid !== this.hoverHandle?.mid) {
        this.hoverHandle = h;
        this.host.render();
      }
    }
    if (this.mode === 'line' || this.mode === 'polygon') {
      const layer = this.sketch?.layer ?? this.host.active();
      if (layer) {
        const seq = ++this.hoverSeq;
        void Promise.resolve(pointerToLayer(ctx, sx, sy, layer.engine.data.crs)).then((p) => {
          if (seq !== this.hoverSeq) return;
          this.hover = p;
          if (this.sketch) this.host.render();
        });
      }
    }
    this.host.canvas.style.cursor = this.cursorFor(this.hoverHandle ? 'handle'
      : this.mode === 'select' && this.selLayer && this.sel.has(this.selLayer.engine.hitTest(ctx, ...screenToDisplay(ctx, sx, sy))) ? 'selected' : null);
  };

  private cursorFor(over: 'handle' | 'selected' | null): string {
    if (over === 'handle') return 'pointer';
    if (over === 'selected') return 'move';
    if (this.mode === 'point' || this.mode === 'line' || this.mode === 'polygon') return 'crosshair';
    return this.mode === 'pan' ? 'grab' : 'default';
  }

  private dragTo(e: MouseEvent): void {
    const drag = this.drag!;
    const ctx = this.host.context();
    const [sx, sy] = this.local(e);
    const seq = ++this.dragSeq;
    void Promise.resolve(pointerToLayer(ctx, sx, sy, drag.layer.engine.data.crs)).then((p) => {
      if (seq !== this.dragSeq || this.drag !== drag || !p || !drag.start) return;
      const feats = drag.layer.engine.data.features;
      const preview = new Map<number, Feature>();
      const h = drag.handle;
      if (drag.kind === 'vertex' && h) preview.set(h.fi, G.moveVertex(feats[h.fi], h.part, h.v, p[0], p[1]));
      else if (drag.kind === 'mid' && h) preview.set(h.fi, G.insertVertex(feats[h.fi], h.part, h.v, p[0], p[1]));
      else {
        const dx = p[0] - drag.start[0], dy = p[1] - drag.start[1];
        for (const i of this.sel) preview.set(i, G.translate(feats[i], dx, dy));
      }
      drag.preview = preview;
      this.host.render();
    });
  }

  private onUp = (e: MouseEvent): void => {
    const down = this.down;
    this.down = null;
    if (this.drag) {
      const drag = this.drag;
      this.drag = null;
      this.dragSeq++;
      if (drag.preview) {
        const feats = drag.layer.engine.data.features;
        const after = feats.map((f, i) => drag.preview!.get(i) ?? f);
        this.commit(drag.layer, after, drag.kind === 'move' ? 'move' : drag.kind === 'mid' ? 'add vertex' : 'move vertex');
      } else {
        this.host.render();
      }
      this.host.canvas.style.cursor = this.cursorFor(null);
      return;
    }
    if (!down || e.button !== 0 || e.target !== this.host.canvas) return;
    if (Math.hypot(e.clientX - down.x, e.clientY - down.y) > CLICK_PX) return;
    void this.click(e);
  };

  private async click(e: MouseEvent): Promise<void> {
    const ctx = this.host.context();
    const [sx, sy] = this.local(e);
    switch (this.mode) {
      case 'pan':
        return;
      case 'select':
      case 'vertex': {
        const hit = this.hitAt(ctx, sx, sy);
        if (!hit) {
          if (!e.shiftKey) this.clearSelection();
        } else if (e.shiftKey && hit.layer === this.selLayer) {
          if (this.sel.has(hit.index)) this.sel.delete(hit.index); else this.sel.add(hit.index);
        } else {
          this.selLayer = hit.layer;
          this.sel = new Set([hit.index]);
        }
        this.version++;
        this.message = '';
        this.host.panel();
        this.host.render();
        return;
      }
      case 'point':
      case 'line':
      case 'polygon': {
        if (this.mode !== 'point' && e.detail >= 2) {
          // The first click of the double-click already added this vertex.
          this.finish();
          return;
        }
        const layer = this.sketch?.layer ?? this.target();
        const p = await pointerToLayer(ctx, sx, sy, layer.engine.data.crs);
        if (!p) {
          this.say(`that point is off the map, or has no position in ${layer.engine.data.crs}`);
          return;
        }
        if (this.mode === 'point') {
          const feats = layer.engine.data.features;
          this.commit(layer, [...feats, G.sketchFeature('point', [p[0], p[1]])], 'add point');
          this.select(layer, [feats.length]);
          return;
        }
        if (!this.sketch) this.sketch = { layer, kind: this.mode, xy: [] };
        this.sketch.xy.push(p[0], p[1]);
        this.hover = p;
        this.message = '';
        this.host.render();
        this.host.panel();
        return;
      }
    }
  }

  /** The active layer, or a new one when there is none. */
  private target(): EditLayer {
    const a = this.host.active();
    if (a) return a;
    const crs = this.host.defaultCRS();
    const l = this.host.newLayer(crs, 'new layer', []);
    this.say(`drawing into a new temporary layer in ${crs}`);
    return l;
  }

  /** End the sketch, adding it if it has enough vertices. */
  finish(): void {
    const s = this.sketch;
    if (!s) return;
    this.sketch = null;
    const n = s.xy.length / 2;
    const need = s.kind === 'line' ? 2 : 3;
    if (n < need) {
      this.say(`a ${s.kind} needs at least ${need} vertices; nothing added`);
      this.host.render();
      return;
    }
    const feats = s.layer.engine.data.features;
    this.commit(s.layer, [...feats, G.sketchFeature(s.kind, s.xy)], `add ${s.kind}`);
    this.select(s.layer, [feats.length]);
  }

  // -------------------------------------------------------------------------
  // Keys, clipboard
  // -------------------------------------------------------------------------

  private onKey = (e: KeyboardEvent): void => {
    if (inField(e.target)) return;
    const mod = e.ctrlKey || e.metaKey;
    const k = e.key.toLowerCase();
    if (mod && k === 'z') { e.preventDefault(); if (e.shiftKey) this.redo(); else this.undo(); return; }
    if (mod && k === 'y') { e.preventDefault(); this.redo(); return; }
    if (mod && (k === 'c' || k === 'x')) {
      if (!this.selection()) return;     // let the browser copy text
      e.preventDefault();
      void this.copy(k === 'x');
      return;
    }
    if (mod && k === 'v') { this.shiftPaste = e.shiftKey; return; }   // the paste event follows
    if (mod && k === 'a') {
      const layer = this.selLayer ?? this.host.active();
      if (!layer) return;
      e.preventDefault();
      this.select(layer, layer.engine.data.features.map((_, i) => i));
      return;
    }
    if (mod || e.altKey) return;
    if (e.key === 'Escape') {
      if (this.drag) { this.drag = null; this.dragSeq++; }
      else if (this.sketch) { this.sketch = null; this.say('drawing cancelled'); }
      else this.clearSelection();
      this.host.render();
      return;
    }
    if (e.key === 'Enter' && this.sketch) { e.preventDefault(); this.finish(); return; }
    if (e.key === 'Backspace' || e.key === 'Delete') {
      e.preventDefault();
      if (this.sketch && e.key === 'Backspace') {
        this.sketch.xy.splice(-2, 2);
        if (!this.sketch.xy.length) this.sketch = null;
        this.host.render();
        return;
      }
      if (this.mode === 'vertex' && this.hoverHandle && !this.hoverHandle.mid) {
        this.deleteVertex(this.hoverHandle);
        return;
      }
      this.deleteSelected();
    }
  };

  private onPaste = (e: ClipboardEvent): void => {
    if (inField(e.target)) return;
    e.preventDefault();
    const asNew = this.shiftPaste;
    this.shiftPaste = false;
    void this.paste(e.clipboardData?.getData('text/plain') ?? null, asNew);
  };

  /**
   * Copy the selection, keeping its CRS; cut also deletes it. The system
   * clipboard gets lon/lat GeoJSON, when the browser allows it.
   */
  async copy(cut = false): Promise<void> {
    const s = this.selection();
    if (!s) { this.say('nothing selected to copy'); return; }
    const data = s.layer.engine.data;
    const clip: Clip = { crs: data.crs, features: cloneFeatures(s.indices.map((i) => data.features[i])), label: data.label, text: '' };
    this.clip = clip;
    const n = clip.features.length;
    if (cut) this.deleteSelected('cut');
    this.say(`${cut ? 'cut' : 'copied'} ${n} feature${n === 1 ? '' : 's'} in ${data.crs}`);
    try {
      const { text } = await toGeoJSONText(clip.features, clip.crs);
      clip.text = text;
      await navigator.clipboard?.writeText(text);
    } catch (err) {
      console.info('system clipboard not written:', err);
    }
  }

  /**
   * Paste into the active layer, converting to its CRS, or as a new layer
   * in the CRS the features came in. `text` is the system clipboard: GeoJSON
   * there is used unless it is what wgis itself put there.
   */
  async paste(text: string | null, asNew: boolean): Promise<void> {
    let src: { crs: string; features: Feature[]; label: string } | null = null;
    const t = text?.trim();
    if (t && t.startsWith('{') && (!this.clip || t !== this.clip.text.trim())) {
      try {
        const d = await readGeoJSONText(t, 'pasted GeoJSON');
        if (d.features.length) src = { crs: d.crs, features: d.features, label: 'pasted GeoJSON' };
      } catch (err) {
        console.info('clipboard text is not GeoJSON wgis reads:', err);
      }
    }
    if (!src && this.clip) src = this.clip;
    if (!src) { this.say('nothing to paste: copy some features first, or paste GeoJSON text'); return; }

    const n = src.features.length;
    const target = asNew ? null : this.host.active();
    if (!target) {
      const layer = this.host.newLayer(src.crs, `${src.label} (pasted)`, cloneFeatures(src.features));
      this.select(layer, src.features.map((_, i) => i));
      this.say(`pasted ${n} feature${n === 1 ? '' : 's'} as a new layer in ${src.crs}`);
      return;
    }
    const to = target.engine.data.crs;
    const r = await reprojectFeatures(src.features, src.crs, to, { keepShape: this.keepShape });
    const feats = target.engine.data.features;
    this.commit(target, [...feats, ...r.features], 'paste');
    this.select(target, r.features.map((_, i) => feats.length + i));
    const how = src.crs.trim() === to.trim() ? 'same CRS'
      : `${src.crs} to ${to}, ${this.keepShape ? 'shape kept' : 'vertices moved, edges now straight in the target'}`;
    const lost = r.dropped ? `; ${r.dropped} part${r.dropped === 1 ? '' : 's'} had no place in ${to} and were left out` : '';
    this.say(`pasted ${r.features.length} of ${n} into ${target.engine.data.label} (${how})${lost}`);
  }

  // -------------------------------------------------------------------------
  // Edits
  // -------------------------------------------------------------------------

  private commit(layer: EditLayer, after: Feature[], what: string): void {
    this.undoStack.push({ layer, before: layer.engine.data.features, after, what });
    if (this.undoStack.length > 200) this.undoStack.shift();
    this.redoStack = [];
    this.message = '';
    this.apply(layer, after);
  }

  private apply(layer: EditLayer, features: Feature[]): void {
    layer.engine.data.features = features;
    layer.engine.invalidate();
    layer.modified = true;
    if (this.selLayer === layer) {
      for (const i of [...this.sel]) if (i >= features.length) this.sel.delete(i);
    }
    this.version++;
    this.host.changed(layer);
    this.host.panel();
  }

  undo(): void {
    const op = this.undoStack.pop();
    if (!op) { this.say('nothing to undo'); return; }
    this.redoStack.push(op);
    this.apply(op.layer, op.before);
    this.say(`undid ${op.what}`);
  }

  redo(): void {
    const op = this.redoStack.pop();
    if (!op) { this.say('nothing to redo'); return; }
    this.undoStack.push(op);
    this.apply(op.layer, op.after);
    this.say(`redid ${op.what}`);
  }

  deleteSelected(what = 'delete'): void {
    const s = this.selection();
    if (!s) { this.say('nothing selected'); return; }
    const gone = new Set(s.indices);
    this.clearSelection();
    this.commit(s.layer, s.layer.engine.data.features.filter((_, i) => !gone.has(i)), what);
  }

  private deleteVertex(h: Handle): void {
    const layer = this.selLayer;
    if (!layer) return;
    const feats = layer.engine.data.features;
    const r = G.deleteVertex(feats[h.fi], h.part, h.v);
    if (typeof r === 'string') { this.say(`can't remove that vertex: ${r}`); return; }
    this.hoverHandle = null;
    if (r === null) {
      this.clearSelection();
      this.commit(layer, feats.filter((_, i) => i !== h.fi), 'delete point');
      return;
    }
    this.commit(layer, feats.map((f, i) => (i === h.fi ? r : f)), 'remove vertex');
  }

  /** Replace one selected feature's attributes. */
  setProps(index: number, props: Record<string, unknown>): void {
    const layer = this.selLayer;
    if (!layer) return;
    const feats = layer.engine.data.features;
    this.commit(layer, feats.map((f, i) => (i === index ? G.withProps(f, props) : f)), 'edit attributes');
  }

  select(layer: EditLayer, indices: number[]): void {
    this.selLayer = layer;
    this.sel = new Set(indices);
    this.version++;
    this.host.panel();
    this.host.render();
  }

  clearSelection(): void {
    if (!this.selLayer && this.sel.size === 0) return;
    this.selLayer = null;
    this.sel = new Set();
    this.hoverHandle = null;
    this.version++;
    this.host.panel();
  }

  // -------------------------------------------------------------------------
  // Drawing
  // -------------------------------------------------------------------------

  draw(g: CanvasRenderingContext2D, ctx: RenderContext): void {
    const drag = this.drag;
    if (this.selLayer && this.sel.size) {
      g.save();
      if (drag?.preview) g.globalAlpha = 0.35;
      this.selLayer.engine.drawSubset(g, ctx, this.sel, SELECTED);
      g.restore();
    }
    if (drag?.preview) {
      const feats = [...drag.preview.values()];
      const d = this.displayOf('drag', `${this.dragSeq}`, feats, drag.layer.engine.data.crs, ctx);
      if (d) drawDisplay(g, ctx, d, SELECTED);
    } else {
      this.drawHandles(g, ctx);
    }
    this.drawSketch(g, ctx);
  }

  private drawHandles(g: CanvasRenderingContext2D, ctx: RenderContext): void {
    const hs = this.handles(ctx);
    if (!hs) return;
    const screen = this.screenOf(ctx);
    const v = ctx.view;
    const on: { h: Handle; px: number; py: number }[] = [];
    for (const h of hs) {
      const [px, py] = screen(h.x, h.y);
      if (px >= -10 && py >= -10 && px <= v.width + 10 && py <= v.height + 10) on.push({ h, px, py });
    }
    if (on.length > MAX_HANDLES) {
      if (!this.message.startsWith('zoom in')) this.message = `zoom in to edit vertices (${on.length} on screen)`;
      return;
    }
    g.save();
    g.lineWidth = 1;
    for (const { h, px, py } of on) {
      const hot = this.hoverHandle && h.fi === this.hoverHandle.fi && h.part === this.hoverHandle.part &&
        h.v === this.hoverHandle.v && h.mid === this.hoverHandle.mid;
      g.beginPath();
      if (h.mid) {
        g.arc(px, py, hot ? 5 : 3, 0, Math.PI * 2);
        g.fillStyle = hot ? '#ffd400' : 'rgba(255,255,255,0.55)';
      } else {
        const r = hot ? 5 : 3.5;
        g.rect(px - r, py - r, r * 2, r * 2);
        g.fillStyle = hot ? '#ffd400' : '#ffffff';
      }
      g.fill();
      g.strokeStyle = '#000000';
      g.stroke();
    }
    g.restore();
  }

  private drawSketch(g: CanvasRenderingContext2D, ctx: RenderContext): void {
    const s = this.sketch;
    if (!s) return;
    const crs = s.layer.engine.data.crs;
    const xy = s.xy;
    const h = this.hover;
    const n = xy.length / 2;
    const feats: Feature[] = [];
    // What it would be if finished at the pointer, dashed.
    const withHover = h ? [...xy, h[0], h[1]] : xy;
    if (s.kind === 'polygon' && withHover.length >= 6) feats.push(G.sketchFeature('polygon', withHover));
    else if (withHover.length >= 4) feats.push(G.sketchFeature('line', withHover));
    // The vertices placed so far, solid.
    const placed: Feature[] = n >= 2 ? [G.sketchFeature('line', xy)] : [];
    const verts: Feature = { kind: 'point', parts: [Float64Array.from(xy)], props: {} };
    const key = `${xy.length}|${h ? h[0] + ',' + h[1] : ''}`;
    const d = this.displayOf('sketch', key, [...feats, ...placed, verts], crs, ctx);
    if (!d) return;
    const nf = feats.length;
    g.save();
    g.setLineDash([6, 4]);
    drawDisplay(g, ctx, d.slice(0, nf), SKETCH);
    g.setLineDash([]);
    drawDisplay(g, ctx, d.slice(nf), { ...SKETCH, fillOpacity: 0, radius: 3 });
    g.restore();
  }
}
