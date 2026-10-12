/**
 * wgis - Main entry point
 *
 * Raster and vector layers, each in its own CRS, drawn in any display CRS.
 * The raster side began as ortho-cog-viewer; vector layers keep their
 * features in their own CRS and are densified into the display (vector/).
 *
 * The shell: view modes, the layer list, styling state, the UI and URL
 * state. A layer's pixels belong to its engine (see engine/types.ts), so
 * everything here is independent of how a layer is actually drawn.
 *
 * Two view modes share the same engines, loaders and UI:
 *
 *   fixed    A static display CRS and mesh extent; a camera pans/zooms over it.
 *            This is the original design.
 *
 *   centred  The display CRS is a template whose lon_0/lat_0 track the view
 *            centre. The mesh is always the screen rectangle around (0, 0)
 *            and panning moves the projection centre. See centred.ts.
 */

import { generateGridMesh, GridMesh } from './engine/mesh';
import { registerProjections, ensureCRS, resolveCRS, unknownCRSMessage, setDefinitionProvider, executorFor } from './core/crs';
import { projWasmProvider } from './core/projwasm';
import { RasterSource, parseFragment, formatFragment } from './core/source';
import { COGSource, splitCogUrl, registerLocalFile, isLocalUrl, isTiffFile } from './core/cogSource';
import { COLORMAPS, colormapCss, colormapRange, isColormapName } from './core/colormap';
import { XYZSource, TILE_PRESETS, isTileTemplate } from './core/xyzSource';
import { isCapabilitiesUrl, fetchCapabilities, splitCapabilitiesUrl, ParsedCapabilities, WMTSLayerInfo } from './core/wmts';
import { LineRenderer } from './engine/LineRenderer';
import { buildGraticule, buildGraticuleAsync } from './core/graticule';
import { geoTransform } from './core/transform';
import { transformBounds, boundsToDisplayAsync, SourceBounds } from './core/bounds';
import { WrapSpec, detectWrap, detectWrapAsync, copyIndex } from './core/wrap';
import { ViewController, ViewState } from './ViewController';
import { CENTRED_PRESETS, centredCRS, isPresetName, panCentre, panCentreAsync, resolveTemplate, normaliseLonLat } from './core/centred';
import { LayerEngine, RenderContext, Style, View, Curve, defaultStyle } from './engine/types';
import { MeshEngine } from './engine/meshEngine';
import { WarpEngine, WarpOptions } from './engine/warpEngine';
import { ResampleAlg } from './core/warp';
import { VectorEngine, VectorStyle, defaultVectorStyle } from './vector/vectorEngine';
import { readVectorUrl, readVectorFile, vectorFormatOf } from './vector/read';
import { Feature, VectorData, featureBounds } from './vector/types';
import { toFlatGeobuf, toGeoJSONText, download } from './vector/write';
import { Editor, EditMode } from './edit/editor';
import { Scope, SCOPE_LABELS, BACKGROUNDS, backgroundKeyOf, backgroundFor, localCRS, LOCAL_MESH_HALF, LOCAL_VIEW_HALF, scopeOfLonLat, paddedExtent } from './start/scopes';
import { Place, parseCoordinate, searchPlaces, deviceLocation } from './start/locate';
import proj4 from 'proj4';

registerProjections();
// PROJ in wasm answers for codes nothing built in knows; loaded on first miss.
setDefinitionProvider(projWasmProvider);

type Mode = 'fixed' | 'centred';

const DEFAULT_EXTENT = Math.PI * 6378137 * 2;  // ~40M meters
const MAX_VERTICES = 66000;  // ~256x256 grid max
/** The coastline every view starts with (tools/make-coastline.mjs). */
const COASTLINE_URL = './base/coastline.fgb';
/** Where "Continue where you were" keeps the last view, layers and all. */
const LAST_VIEW_KEY = 'wgis.lastView';

// ---------------------------------------------------------------------------
// Display state
// ---------------------------------------------------------------------------

let mode: Mode = 'centred';
let gridSize = 64;
let showWireframe = false;
let refineEdges = true;        // refine the mesh at the edge of the map once the view settles
let wrapWorld = false;         // repeat the world sideways where the projection allows
// Which engine draws a layer: the mesh (GPU interpolation, free while
// panning) or a real warp (rwarp in a worker, exact and resampled).
type EngineKind = 'mesh' | 'warp';
let engineKind: EngineKind = 'mesh';
let warpAlg: ResampleAlg = 'bilinear';
let warpScale = 1;
let warpMaxError = 0.125;      // rwarp's approximate transformer; 0 is exact
// When a drag moves the projection centre: every frame, or once on release.
// auto: live under proj4js (free), on release under PROJ (a round trip, and
// for an unfolded net a re-cut of the whole map).
type RecentreMode = 'auto' | 'live' | 'release';
let recentreMode: RecentreMode = 'auto';
// A release-mode drag accumulates as a look-around offset until the release
// folds it into the centre; this says the current offset is that kind.
let foldOnRelease = false;
let wrapSpec: WrapSpec | null = null;
let wrapCRS = '';              // display CRS wrapSpec was detected for
let showGraticule = true;
let graticuleCRS = '';        // display CRS the current graticule was built for
let graticuleInFlight = false;
let graticuleQueued = false;

// fixed mode
let displayCRS = 'EPSG:3857';
let meshExtent = {
  minX: -DEFAULT_EXTENT,
  minY: -DEFAULT_EXTENT,
  maxX: DEFAULT_EXTENT,
  maxY: DEFAULT_EXTENT
};

// centred mode
let centredProj = 'ortho';            // preset name or raw template
let centreLon = 135;
let centreLat = -35;
let meshZoom = NaN;                   // zoom the current screen mesh was built for
let meshCssW = 0;
let meshCssH = 0;
// Display-space point the centred mesh is built around: the origin for a
// re-centring template (the projection follows the view), or the projected
// view centre for a static CRS used in centred mode.
let centredOriginX = 0;
let centredOriginY = 0;
// A shift-drag moves the view over the projection without re-centring it:
// this is that displacement, in display metres, from the projected centre.
// The next ordinary drag folds it back into the centre and clears it.
let lookOffsetX = 0;
let lookOffsetY = 0;
let meshOriginX = NaN;
let meshOriginY = NaN;

// Layer state. The pixels belong to the engine; everything here is the
// shell's business: identity, how the user wants it styled, opacity.
interface Layer {
  id: number;
  url: string;
  source: RasterSource;
  engine: LayerEngine;
  scale: ScaleState | null;
  opacity: number;
}

/** Parameters carried on a layer URL's fragment. */
function fragmentParams(url: string): Map<string, string> {
  return parseFragment(url);
}

/**
 * A layer's Style plus the two policies the shell applies on top of it:
 * whether the range follows each fetched window's 2-98 percentile, and
 * whether nodata comes from the file's own tag.
 */
interface ScaleState extends Style {
  auto: boolean;
  nodataAuto: boolean;
}

let layers: Layer[] = [];
let nextLayerId = 0;

// Vector layers: features stay in their own CRS and are drawn on a 2D
// canvas above the map (vector/vectorEngine.ts).
interface VectorLayer {
  id: number;
  /** Where it came from; null for a local file, which cannot go in a link. */
  url: string | null;
  engine: VectorEngine;
  /** Made here (drawn or pasted) with no file behind it. */
  temp: boolean;
  /** Edited since it was opened or last saved. */
  modified: boolean;
}
let vectorLayers: VectorLayer[] = [];
/** Where drawing and pasting go (edit/editor.ts). */
let activeVectorId: number | null = null;
let editor: Editor;
let nextTempLayer = 1;
let overlay: HTMLCanvasElement;
let overlayCtx: CanvasRenderingContext2D;
const VECTOR_COLOURS = ['#ffd400', '#00e5ff', '#ff4fd8', '#7cfc00', '#ff8a3d', '#ffffff'];
const VECTOR_SAMPLES: Record<string, { label: string; url: string }> = {
  'polar-box': { label: 'square with a hole, straight edges in EPSG:3031 (FlatGeobuf)', url: './samples/polar-box-3031.fgb' },
  'parallels': { label: 'parallels and meridians, straight in lon/lat (GeoParquet)', url: './samples/lonlat-lines.parquet' },
  'mga55': { label: 'Tasmanian lines and points in MGA55, EPSG:28355 (GeoJSON)', url: './samples/tasmania-mga55.geojson' },
  'coast': { label: 'Natural Earth 110m coastline (GeoJSON, remote)', url: 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_coastline.geojson' },
  'countries': { label: 'FlatGeobuf test countries (remote)', url: 'https://raw.githubusercontent.com/flatgeobuf/flatgeobuf/master/test/data/countries.fgb' }
};
// The start card and the top bar (start/scopes.ts).
let scope: Scope | null = null;
/** The raster layer the background chip controls, if any. */
let backgroundId: number | null = null;
/** The start card is up: the address bar is left alone until a choice. */
let startOpen = false;
/** The bundled coastline: drawn under the vector layers, never edited. */
let coastline: VectorEngine | null = null;
let showCoastline = true;
let baseMesh: GridMesh;
let gl: WebGL2RenderingContext;
let viewController: ViewController;
let canvas: HTMLCanvasElement;

// UI elements
let urlInput: HTMLInputElement;
let modeSelect: HTMLSelectElement;
let fixedPanel: HTMLElement;
let centredPanel: HTMLElement;
let displayCrsInput: HTMLInputElement;
let extentInput: HTMLInputElement;
let projSelect: HTMLSelectElement;
let projTemplateInput: HTMLInputElement;
let centreLonInput: HTMLInputElement;
let centreLatInput: HTMLInputElement;
let gridSizeInput: HTMLInputElement;
let wireframeInput: HTMLInputElement;
let graticuleInput: HTMLInputElement;
let wrapInput: HTMLInputElement;
let engineSelect: HTMLSelectElement;
let warpAlgSelect: HTMLSelectElement;
let warpScaleInput: HTMLInputElement;
let recentreSelect: HTMLSelectElement;
let gratMinor: LineRenderer;
let gratMajor: LineRenderer;
let vertexCountEl: HTMLElement;
let infoEl: HTMLElement;
let layersEl: HTMLElement;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function currentDisplayCRS(): string {
  if (mode === 'centred') {
    return centredCRS(resolveTemplate(centredProj), centreLon, centreLat);
  }
  return displayCRS;
}

/**
 * Where the centred-mode mesh is anchored in display space: at the projected
 * view centre, plus any shift-drag look-around offset.
 *
 * For a template with both placeholders the projected centre is (0, 0) by
 * construction. For one with only {lon_0} (the world projections) it is
 * (0, y(lat)), which is what lets a north-south drag move the view while the
 * central meridian keeps tracking. For a static CRS (no placeholders) it is
 * simply where the centre falls in that CRS.
 */
function updateCentredOrigin(): void {
  if (mode !== 'centred') {
    centredOriginX = 0;
    centredOriginY = 0;
    return;
  }
  const geo = geoTransform(currentDisplayCRS());
  if (!geo.fromGeoSync) {
    // PROJ executor: the origin arrives later; until then keep the last one.
    // (A template with both placeholders projects its centre to (0, 0)
    // anyway, which is the common case, so the wait rarely shows.)
    void geo.fromGeo(new Float64Array([centreLon, centreLat])).then((xy) => {
      const x = isFinite(xy[0]) ? xy[0] : 0, y = isFinite(xy[1]) ? xy[1] : 0;
      const nx = x + lookOffsetX, ny = y + lookOffsetY;
      if (nx === centredOriginX && ny === centredOriginY) return;
      centredOriginX = nx;
      centredOriginY = ny;
      regenerateMesh();
      layoutAllLayers();
      render(viewController.getState());
    });
    return;
  }
  let x = 0, y = 0;
  try {
    const xy = geo.fromGeoSync(new Float64Array([centreLon, centreLat]));
    x = isFinite(xy[0]) ? xy[0] : 0;
    y = isFinite(xy[1]) ? xy[1] : 0;
  } catch {
    x = 0; y = 0;
  }
  centredOriginX = x + lookOffsetX;
  centredOriginY = y + lookOffsetY;
}

/**
 * The view an engine should draw: the camera in display space, plus the
 * canvas it has to fill.
 */
function currentView(state: ViewState): View {
  return {
    crs: currentDisplayCRS(),
    centreX: state.centerX + centredOriginX,
    centreY: state.centerY + centredOriginY,
    zoom: state.zoom,
    width: canvas.clientWidth,
    height: canvas.clientHeight
  };
}

/** The wrap for the current display CRS, detected once per CRS string. */
function currentWrap(): WrapSpec | null {
  if (!wrapWorld) return null;
  const crs = currentDisplayCRS();
  if (crs !== wrapCRS) {
    wrapCRS = crs;
    const geo = geoTransform(crs);
    if (geo.fromGeoSync) {
      wrapSpec = detectWrap(crs);
    } else {
      // PROJ executor: keep the previous answer until the new one lands.
      void detectWrapAsync(geo).then((w) => {
        if (wrapCRS !== crs) return;
        wrapSpec = w;
        graticuleCRS = '';
        layoutAllLayers();
        render(viewController.getState());
      });
    }
  }
  return wrapSpec;
}

function contextFor(state: ViewState): RenderContext {
  return { view: currentView(state), grid: baseMesh, wrap: currentWrap(), refine: refineEdges };
}

/** Which copies of the world the view currently touches, along the wrap. */
function copyRange(w: WrapSpec, state: ViewState): [number, number] {
  const scale = Math.pow(2, state.zoom);
  const hw = canvas.clientWidth / 2 / scale, hh = canvas.clientHeight / 2 / scale;
  const cx = state.centerX + centredOriginX, cy = state.centerY + centredOriginY;
  let kMin = Infinity, kMax = -Infinity;
  for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const k = copyIndex(w, cx + sx * hw, cy + sy * hh);
    if (k < kMin) kMin = k;
    if (k > kMax) kMax = k;
  }
  return [kMin - 1, kMax + 1];
}

function warpOptions(): WarpOptions {
  return { alg: warpAlg, scale: warpScale, prefer: 'rwarp', maxError: warpMaxError };
}

/** An engine of the current kind for a layer. */
function makeEngine(layer: Layer): LayerEngine {
  const change = () => onEngineChange(layer);
  return engineKind === 'warp'
    ? new WarpEngine(gl, layer.source, styleOf(layer), change, warpOptions())
    : new MeshEngine(gl, layer.source, styleOf(layer), change);
}

/** Swap every layer to the current engine kind (or push new warp options). */
function rebuildEngines(): void {
  const ctx = contextFor(viewController.getState());
  for (const layer of layers) {
    if (layer.engine.kind === engineKind) {
      if (layer.engine instanceof WarpEngine) layer.engine.setOptions(warpOptions());
    } else {
      layer.engine.dispose();
      layer.engine = makeEngine(layer);
    }
    layer.engine.layout(ctx);
  }
  render(viewController.getState());
  scheduleRefresh(viewController.getState());
  updateUI();
}

/** The Style a layer's engine should use, from the shell's own state. */
function styleOf(layer: Layer): Style {
  const base = layer.scale ?? defaultStyle();
  return { ...base, opacity: layer.opacity };
}

/**
 * An engine reports that something changed: it started loading, or new
 * pixels arrived. Applying the auto range needs the statistics of what just
 * loaded, so it belongs here rather than in the engine.
 */
function onEngineChange(layer: Layer): void {
  const stats = layer.engine.status().stats;
  if (layer.scale && layer.scale.auto && stats && stats.count > 0 &&
      (layer.scale.min !== stats.p2 || layer.scale.max !== stats.p98)) {
    layer.scale.min = stats.p2;
    layer.scale.max = stats.p98;
    layer.engine.setStyle(styleOf(layer));
  }
  updateUI();
  render(viewController.getState());
  // A layout that landed late (the PROJ executor) may have changed what
  // the view needs from the source; the refresh is debounced, so this is
  // cheap when nothing did.
  scheduleRefresh(viewController.getState());
}

/**
 * Rebuild the base mesh for the current mode.
 *
 * fixed:   the configured extent, gridSize x gridSize.
 * centred: the screen rectangle in display metres around (0,0), with roughly
 *          square cells. Only depends on zoom and canvas size.
 */
function regenerateMesh(state?: ViewState): void {
  if (mode === 'centred') {
    const zoom = state ? state.zoom : viewController.getState().zoom;
    const cssW = canvas.clientWidth || 1;
    const cssH = canvas.clientHeight || 1;
    const scale = Math.pow(2, zoom);
    const halfW = cssW / scale / 2;
    const halfH = cssH / scale / 2;
    const rows = Math.max(4, Math.round(gridSize * cssH / cssW));
    updateCentredOrigin();
    const ox = centredOriginX, oy = centredOriginY;
    baseMesh = generateGridMesh([ox - halfW, oy - halfH, ox + halfW, oy + halfH], gridSize, rows);
    meshZoom = zoom;
    meshCssW = cssW;
    meshCssH = cssH;
    meshOriginX = ox;
    meshOriginY = oy;
  } else {
    baseMesh = generateGridMesh(
      [meshExtent.minX, meshExtent.minY, meshExtent.maxX, meshExtent.maxY],
      gridSize
    );
  }
  updateVertexCount();
}

function meshCellSize(): number {
  // Width of one cell in display units; used to scale the round-trip tolerance.
  const p = baseMesh.positions;
  return Math.abs(p[3] - p[0]) || 1;
}

function updateVertexCount(): void {
  const verts = baseMesh ? baseMesh.vertexCount : (gridSize + 1) * (gridSize + 1);
  vertexCountEl.textContent = `(${verts} verts)`;
  vertexCountEl.style.color = verts > MAX_VERTICES ? '#f66' : '#aaa';
}

/**
 * Rebuild the graticule if the display CRS changed since it was last built.
 */
function updateGraticule(): void {
  if (!showGraticule || !baseMesh) return;
  const crs = currentDisplayCRS();
  const w = currentWrap();
  const [kMin, kMax] = w ? copyRange(w, viewController.getState()) : [0, 0];
  const key = `${crs}|${kMin},${kMax}`;
  if (key === graticuleCRS) return;
  const opts = { stepDeg: 10, sampleDeg: 1, tolerance: meshCellSize() * 1e-2, wrap: w, kMin, kMax };
  const geo = geoTransform(crs);
  if (geo.fromGeoSync) {
    const g = buildGraticule(crs, opts);
    gratMinor.setLines(g.minor);
    gratMajor.setLines(g.major);
    graticuleCRS = key;
    return;
  }
  // PROJ executor: one build in flight; the newest request wins when it
  // lands. The old lines stay up until then.
  graticuleCRS = key;
  if (graticuleInFlight) { graticuleQueued = true; return; }
  graticuleInFlight = true;
  buildGraticuleAsync(geo, opts).then((g) => {
    if (graticuleCRS === key) {
      gratMinor.setLines(g.minor);
      gratMajor.setLines(g.major);
      render(viewController.getState());
    }
  }).catch((err) => console.warn('graticule (PROJ) failed:', err)).finally(() => {
    graticuleInFlight = false;
    if (graticuleQueued) {
      graticuleQueued = false;
      graticuleCRS = '';
      updateGraticule();
    }
  });
}

function layoutAllLayers(): void {
  const ctx = contextFor(viewController.getState());
  for (const layer of layers) {
    try {
      layer.engine.layout(ctx);
    } catch (err) {
      console.error(`Failed to lay out layer ${layer.id}:`, err);
    }
  }
  for (const v of vectorLayers) {
    try {
      v.engine.layout(ctx);
    } catch (err) {
      console.error(`Failed to lay out vector layer ${v.id}:`, err);
    }
  }
  if (coastline && showCoastline) {
    try {
      coastline.layout(ctx);
    } catch (err) {
      console.error('Failed to lay out the coastline:', err);
    }
  }
}

// ---------------------------------------------------------------------------
// View change handling
// ---------------------------------------------------------------------------

let rafPending = false;
let pendingState: ViewState | null = null;

function onViewChange(state: ViewState): void {
  pendingState = state;
  if (rafPending) return;
  rafPending = true;
  requestAnimationFrame(() => {
    rafPending = false;
    const s = pendingState!;
    pendingState = null;
    handleViewChange(s);
  });
}

/** Does a drag re-centre the projection as it goes, for this CRS? */
function recentreLive(): boolean {
  if (recentreMode === 'live') return true;
  if (recentreMode === 'release') return false;
  return executorFor(currentDisplayCRS()) === 'proj4js';
}

function handleViewChange(state: ViewState): void {
  if (mode === 'centred') {
    if (executorFor(currentDisplayCRS()) === 'proj' && !state.shift &&
        (state.centerX !== 0 || state.centerY !== 0)) {
      handleViewChangeProj(state);
      return;
    }
    // On release of a release-mode drag, fold the accumulated look-around
    // into the centre: the point now under the screen centre becomes it.
    if (!state.dragging && foldOnRelease && !state.shift) {
      foldOnRelease = false;
      const next = panCentre(resolveTemplate(centredProj), centreLon, centreLat, centredOriginX, centredOriginY);
      if (next) {
        [centreLon, centreLat] = next;
        lookOffsetX = 0;
        lookOffsetY = 0;
        updateCentredOrigin();
        syncCentreInputs();
        regenerateMesh(state);
        layoutAllLayers();
      }
    }
    // Consume any pan offset: the display point now at the screen centre
    // becomes the new projection centre, and the camera snaps back to origin.
    if (state.centerX !== 0 || state.centerY !== 0) {
      if (state.shift || (state.dragging && !recentreLive())) {
        // Look around: move over the projection as it stands, no re-centring
        // (for a release-mode drag, not yet).
        lookOffsetX += state.centerX;
        lookOffsetY += state.centerY;
        if (!state.shift) foldOnRelease = true;
      } else {
        const next = panCentre(resolveTemplate(centredProj), centreLon, centreLat,
          centredOriginX + state.centerX, centredOriginY + state.centerY);
        if (next) {
          [centreLon, centreLat] = next;
          lookOffsetX = 0;
          lookOffsetY = 0;
        } else {
          // Off the map: keep the view where it was put, as a look-around.
          lookOffsetX += state.centerX;
          lookOffsetY += state.centerY;
        }
      }
      viewController.setState({ centerX: 0, centerY: 0 });
      state = viewController.getState();
      updateCentredOrigin();
      syncCentreInputs();
    }
    if (state.zoom !== meshZoom || canvas.clientWidth !== meshCssW || canvas.clientHeight !== meshCssH ||
        centredOriginX !== meshOriginX || centredOriginY !== meshOriginY) {
      regenerateMesh(state);
    }
    layoutAllLayers();
  }
  render(state);
  scheduleRefresh(state);
  scheduleUrlUpdate();
}

/**
 * The PROJ executor's pan. The inverse of the screen centre is a worker
 * round trip, so the camera keeps its offset over the existing mesh (the
 * view moves at once, the projection catches up), and when the new centre
 * lands the consumed offset is subtracted from whatever the camera has
 * accumulated since. One request at a time; a drag settles on the last
 * position.
 */
let panInFlight = false;

function handleViewChangeProj(state: ViewState): void {
  render(state);
  scheduleRefresh(state);
  scheduleUrlUpdate();
  // In release mode the camera just slides over the mesh it has while the
  // drag is going; re-centring is a round trip and, for an unfolded net,
  // re-cuts the map, so it happens once, on release. (Wheel zoom has no
  // drag and re-centres as it goes.) Live mode re-centres as fast as the
  // round trips come back.
  if ((state.dragging && !recentreLive()) || panInFlight) return;
  panInFlight = true;
  const dx = state.centerX, dy = state.centerY;
  const template = resolveTemplate(centredProj);
  panCentreAsync(template, centreLon, centreLat, centredOriginX + dx, centredOriginY + dy)
    .then(async (next) => {
      if (!next) {
        // The screen centre is off the map (a facet gap, the horizon): keep
        // the view where the user put it as a look-around, no snap back.
        lookOffsetX += dx;
        lookOffsetY += dy;
        centredOriginX += dx;
        centredOriginY += dy;
        const s = viewController.getState();
        viewController.setState({ centerX: s.centerX - dx, centerY: s.centerY - dy });
        regenerateMesh(viewController.getState());
        layoutAllLayers();
        render(viewController.getState());
        return;
      }
      [centreLon, centreLat] = next;
      lookOffsetX = 0;
      lookOffsetY = 0;
      // The origin for the new centre, then take the consumed pan off the camera.
      const geo = geoTransform(currentDisplayCRS());
      const xy = await geo.fromGeo(new Float64Array([centreLon, centreLat]));
      centredOriginX = isFinite(xy[0]) ? xy[0] : 0;
      centredOriginY = isFinite(xy[1]) ? xy[1] : 0;
      const s = viewController.getState();
      viewController.setState({ centerX: s.centerX - dx, centerY: s.centerY - dy });
      syncCentreInputs();
      regenerateMesh(viewController.getState());
      layoutAllLayers();
      render(viewController.getState());
    })
    .catch((err) => console.warn('pan (PROJ) failed:', err))
    .finally(() => {
      panInFlight = false;
      const s = viewController.getState();
      if ((!s.dragging || recentreLive()) && (s.centerX !== 0 || s.centerY !== 0)) handleViewChangeProj(s);
    });
}

function makeViewController(initial: ViewState): void {
  if (viewController) viewController.destroy();
  viewController = new ViewController(canvas, initial, onViewChange);
  // The editor gets first say on every press (dragging a vertex is not a pan).
  if (editor) viewController.claim = editor.claim;
}

// ---------------------------------------------------------------------------
// Applying display settings from the UI
// ---------------------------------------------------------------------------

function readGridSize(): number | null {
  const n = parseInt(gridSizeInput.value);
  if (isNaN(n) || n < 4) {
    alert('Grid size must be at least 4');
    return null;
  }
  const verts = (n + 1) * (n + 1);
  if (verts > MAX_VERTICES) {
    if (!confirm(`Grid ${n}x${n} = ${verts} vertices. This may be slow. Continue?`)) {
      return null;
    }
  }
  return n;
}

async function applyDisplaySettings(): Promise<void> {
  const newMode = modeSelect.value as Mode;
  const newGrid = readGridSize();
  if (newGrid === null) return;

  if (newMode === 'fixed') {
    const newCRS = displayCrsInput.value.trim();
    if (!newCRS) {
      alert('Invalid CRS');
      return;
    }
    const parts = extentInput.value.split(',').map(s => parseFloat(s.trim()));
    if (parts.length !== 4 || parts.some(isNaN)) {
      alert('Invalid extent. Use format: xmin,xmax,ymin,ymax');
      return;
    }
    const [xmin, xmax, ymin, ymax] = parts;
    if (!await resolveCRS(newCRS)) {
      alert(unknownCRSMessage(newCRS));
      return;
    }

    mode = 'fixed';
    gridSize = newGrid;
    displayCRS = newCRS;
    meshExtent = { minX: xmin, minY: ymin, maxX: xmax, maxY: ymax };

    regenerateMesh();
    layoutAllLayers();

    const centerX = (xmin + xmax) / 2;
    const centerY = (ymin + ymax) / 2;
    const zoom = Math.log2(canvas.clientWidth / (xmax - xmin));
    makeViewController({ centerX, centerY, zoom });
  } else {
    const proj = projSelect.value === 'custom' ? projTemplateInput.value.trim() : projSelect.value;
    if (!proj) {
      alert('Enter a proj template with {lon_0} and {lat_0} placeholders');
      return;
    }
    const lon = parseFloat(centreLonInput.value);
    const lat = parseFloat(centreLatInput.value);
    if (isNaN(lon) || isNaN(lat)) {
      alert('Invalid centre');
      return;
    }
    // A template may be a plain CRS (no placeholders), including an EPSG code
    // that needs resolving before proj4 can use it.
    const instantiated = centredCRS(resolveTemplate(proj), lon, lat);
    if (!await resolveCRS(instantiated)) {
      alert(unknownCRSMessage(instantiated));
      return;
    }

    const wasCentred = mode === 'centred';
    mode = 'centred';
    gridSize = newGrid;
    centredProj = proj;
    [centreLon, centreLat] = normaliseLonLat(lon, lat);
    updateCentredOrigin();

    const zoom = wasCentred ? viewController.getState().zoom : defaultCentredZoom();
    makeViewController({ centerX: 0, centerY: 0, zoom });
    // ViewController fires onChange on construction, which builds the mesh
    // and UVs via handleViewChange on the next frame.
  }
  syncUI();
}

function defaultCentredZoom(): number {
  // Fit a hemisphere (2 earth radii) to the shorter screen dimension.
  const px = Math.min(canvas.clientWidth, canvas.clientHeight) || 512;
  return Math.log2(px / (2 * 6378137 * 1.05));
}

/**
 * Centre / fit the view on a layer.
 */
function fitLayer(layer: Layer): void {
  fitBounds(layer.source.bounds, layer.source.crs);
}

/**
 * Centre / fit the view on bounds given in some CRS.
 */
function fitBounds(b: SourceBounds, crsOfBounds: string): void {
  if (!isFinite(b.minX) || !isFinite(b.maxY)) return;
  if (mode === 'centred') {
    const toGeo = proj4(crsOfBounds, 'EPSG:4326');
    const [lon, lat] = toGeo.forward([(b.minX + b.maxX) / 2, (b.minY + b.maxY) / 2]);
    if (!isFinite(lon) || !isFinite(lat)) return;
    [centreLon, centreLat] = normaliseLonLat(lon, lat);
    updateCentredOrigin();
    const crs = currentDisplayCRS();
    const geo = geoTransform(crs);
    const apply = (tb: SourceBounds) => {
      const w = Math.max(tb.maxX - tb.minX, tb.maxY - tb.minY);
      const zoom = isFinite(w) && w > 0
        ? Math.log2(Math.min(canvas.clientWidth, canvas.clientHeight) / (w * 1.1))
        : defaultCentredZoom();
      makeViewController({ centerX: 0, centerY: 0, zoom });
      syncCentreInputs();
    };
    if (geo.fromGeoSync) apply(transformBounds(b, crsOfBounds, crs, 30));
    else void boundsToDisplayAsync(b, crsOfBounds, geo).then(apply);
  } else {
    const geo = geoTransform(displayCRS);
    const apply = (tb: SourceBounds) => viewController.fitBounds(tb.minX, tb.minY, tb.maxX, tb.maxY);
    if (geo.fromGeoSync) apply(transformBounds(b, crsOfBounds, displayCRS, 30));
    else void boundsToDisplayAsync(b, crsOfBounds, geo).then(apply);
  }
}

// ---------------------------------------------------------------------------
// Layers
// ---------------------------------------------------------------------------

async function openSource(url: string): Promise<RasterSource> {
  if (url.startsWith('preset:')) {
    const p = TILE_PRESETS[url.slice(7)];
    if (p && p.cog) return COGSource.open(p.template);
    return XYZSource.fromPreset(url.slice(7));
  }
  if (isTileTemplate(url)) return XYZSource.fromTemplate(url);
  if (isCapabilitiesUrl(url)) return XYZSource.fromCapabilities(url);
  return COGSource.open(url);
}

async function addLayer(url: string, quiet = false): Promise<Layer | null> {
  console.log('Adding layer:', url);
  try {
    const source = await openSource(url);

    // Styling state first: the engine is constructed with it.
    const alpha = parseFloat(fragmentParams(url).get('alpha') || '');
    const opacity = isFinite(alpha) ? Math.max(0, Math.min(1, alpha)) : 1;
    let scale: ScaleState | null = null;
    if (source.numeric) {
      const o = splitCogUrl(url);
      const cog = source as COGSource;
      const cmap = o.cmap && isColormapName(o.cmap) ? o.cmap : 'viridis';
      const pinned = colormapRange(cmap);
      const explicit = o.min !== undefined && o.max !== undefined;
      const curve: Curve = o.curve === 'sqrt' || o.curve === 'log' ? o.curve : 'linear';
      scale = {
        mode: cog.rgbBands ? 'rgb' : 'single',
        min: pinned ? pinned[0] : (o.min ?? 0),
        max: pinned ? pinned[1] : (o.max ?? 1),
        cmap,
        curve,
        auto: !explicit && !pinned,
        nodata: o.nodata ?? null,
        nodataAuto: o.nodata === undefined,
        shade: o.shade !== undefined,
        shadeStrength: o.shade ?? 0.6,
        zfactor: o.zf ?? 1,
        azimuth: o.az ?? 315,
        altitude: o.alt ?? 45,
        opacity
      };
    }

    const layer = {
      id: nextLayerId++,
      url,
      source,
      scale,
      opacity
    } as Layer;
    layer.engine = makeEngine(layer);

    const ctx = contextFor(viewController.getState());
    layer.engine.layout(ctx);
    layers.push(layer);
    updateUI();

    await layer.engine.refresh(ctx);
    render(viewController.getState());
    scheduleUrlUpdate();
    return layer;
  } catch (err) {
    console.error('Failed to add layer:', err);
    if (!quiet) alert(`Failed to load source: ${err}`);
    return null;
  }
}

function removeLayer(id: number): void {
  const layer = layers.find(l => l.id === id);
  if (layer) layer.engine.dispose();
  layers = layers.filter(l => l.id !== id);
  if (backgroundId === id) backgroundId = null;
  updateUI();
  render(viewController.getState());
  scheduleUrlUpdate();
}

/** Remove the raster layers; the background stays unless asked. */
function clearLayers(keepBackground = true): void {
  for (const l of layers) {
    if (keepBackground && l.id === backgroundId) continue;
    l.engine.dispose();
  }
  layers = layers.filter(l => keepBackground && l.id === backgroundId);
  if (!layers.length) backgroundId = null;
}

// ---------------------------------------------------------------------------
// Vector layers
// ---------------------------------------------------------------------------

/** Style keys a vector layer URL carries in its fragment, beside #crs=. */
const VECTOR_STYLE_KEYS = ['colour', 'alpha', 'fill', 'width'];

function vectorStyleFromUrl(url: string | null, fallback: string): VectorStyle {
  const st = defaultVectorStyle(fallback);
  if (!url) return st;
  const f = fragmentParams(url);
  const c = f.get('colour');
  if (c && /^[0-9a-f]{6}$/i.test(c)) st.stroke = `#${c}`;
  const num = (k: string, lo: number, hi: number) => {
    const v = parseFloat(f.get(k) || '');
    return isFinite(v) ? Math.max(lo, Math.min(hi, v)) : null;
  };
  st.opacity = num('alpha', 0, 1) ?? st.opacity;
  st.fillOpacity = num('fill', 0, 1) ?? st.fillOpacity;
  st.width = num('width', 0.25, 20) ?? st.width;
  return st;
}

function vectorUrlWithState(v: VectorLayer): string | null {
  if (!v.url) return null;
  const [base, hash] = v.url.split('#');
  const frag = new URLSearchParams(hash ?? '');
  for (const k of VECTOR_STYLE_KEYS) frag.delete(k);
  const st = v.engine.getStyle();
  frag.set('colour', st.stroke.replace('#', ''));
  if (st.opacity !== 1) frag.set('alpha', String(st.opacity));
  frag.set('fill', String(st.fillOpacity));
  if (st.width !== 1.5) frag.set('width', String(st.width));
  return `${base}#${frag.toString()}`;
}

async function addVectorLayer(input: string | File, fit = false): Promise<VectorLayer | null> {
  const url = typeof input === 'string' ? input : null;
  let data: VectorData;
  try {
    data = typeof input === 'string' ? await readVectorUrl(input) : await readVectorFile(input);
  } catch (err) {
    console.error('Failed to read vector layer:', err);
    alert(`Failed to read vector layer: ${err instanceof Error ? err.message : err}`);
    return null;
  }
  return pushVectorLayer(data, url, false, fit);
}

function pushVectorLayer(data: VectorData, url: string | null, temp: boolean, fit: boolean): VectorLayer {
  const colour = VECTOR_COLOURS[vectorLayers.length % VECTOR_COLOURS.length];
  const v: VectorLayer = { id: nextLayerId++, url, engine: null as unknown as VectorEngine, temp, modified: false };
  v.engine = new VectorEngine(data, vectorStyleFromUrl(url, colour), () => {
    updateUI();
    render(viewController.getState());
  });
  vectorLayers.push(v);
  if (activeVectorId === null) activeVectorId = v.id;
  if (fit) fitBounds(data.bounds, data.crs);
  const state = viewController.getState();
  v.engine.layout(contextFor(state));
  updateUI();
  render(state);
  scheduleRefresh(state);
  scheduleUrlUpdate();
  return v;
}

/** A layer with no file behind it, for drawing or pasting into; made active. */
function newTempLayer(crs: string, label: string, features: Feature[]): VectorLayer {
  const name = `${label} ${nextTempLayer++}`;
  const data: VectorData = { crs, crsOrigin: 'new layer', features, bounds: featureBounds(features), label: name, format: 'temporary' };
  const v = pushVectorLayer(data, null, true, false);
  v.modified = features.length > 0;
  activeVectorId = v.id;
  updateUI();
  return v;
}

function removeVectorLayer(id: number): void {
  const v = vectorLayers.find(l => l.id === id);
  if (!v) return;
  if (v.modified && !confirm(`${v.engine.data.label} has unsaved edits. Remove it anyway?`)) return;
  v.engine.dispose();
  editor.forget(v);
  vectorLayers = vectorLayers.filter(l => l.id !== id);
  if (activeVectorId === id) activeVectorId = vectorLayers.length ? vectorLayers[vectorLayers.length - 1].id : null;
  updateUI();
  render(viewController.getState());
  scheduleUrlUpdate();
}

function clearVectorLayers(): void {
  for (const v of vectorLayers) {
    v.engine.dispose();
    editor.forget(v);
  }
  vectorLayers = [];
  activeVectorId = null;
}

function drawVectors(ctx: RenderContext): void {
  const dpr = window.devicePixelRatio || 1;
  overlayCtx.setTransform(1, 0, 0, 1, 0, 0);
  overlayCtx.clearRect(0, 0, overlay.width, overlay.height);
  overlayCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  if (coastline && showCoastline) coastline.draw(overlayCtx, ctx);
  for (const v of vectorLayers) v.engine.draw(overlayCtx, ctx);
  editor?.draw(overlayCtx, ctx);
}

/** Save a layer: FlatGeobuf in its own CRS, or GeoJSON in lon/lat. */
async function saveVectorLayer(id: number, as: 'fgb' | 'geojson'): Promise<void> {
  const v = vectorLayers.find(l => l.id === id);
  if (!v) return;
  const d = v.engine.data;
  const base = d.label.replace(/\.(geojson|json|fgb|parquet|geoparquet)$/i, '').replace(/[^\w.-]+/g, '_') || 'layer';
  if (as === 'fgb') {
    const { bytes, crsRecorded } = toFlatGeobuf(d);
    download(`${base}.fgb`, bytes, 'application/octet-stream');
    if (!crsRecorded) {
      alert(`Saved, but FlatGeobuf records a CRS only as an EPSG code and this layer's CRS is\n${d.crs}\n` +
        `Open the file with #crs=... on its URL, or save GeoJSON (lon/lat) instead.`);
    }
  } else {
    const { text, dropped } = await toGeoJSONText(d.features, d.crs);
    download(`${base}.geojson`, text, 'application/geo+json');
    if (dropped) alert(`${dropped} part(s) have no position in lon/lat and were left out of the GeoJSON.`);
  }
  v.modified = false;
  updateUI();
}

function anyUnsaved(): boolean {
  return vectorLayers.some(v => v.modified);
}

// ---------------------------------------------------------------------------
// The edit panel
// ---------------------------------------------------------------------------

let editHintEl: HTMLElement;
let editStatusEl: HTMLElement;
let editPropsEl: HTMLElement;
/** The feature whose attributes the panel shows. */
let propsShown: Feature | null = null;

/** CRS for a new layer when none is asked for: the map's, if it holds still. */
function defaultNewLayerCRS(): string {
  return mode === 'fixed' ? displayCRS : 'EPSG:4326';
}

function updateEditPanel(): void {
  if (!editor) return;
  document.querySelectorAll<HTMLButtonElement>('[data-emode]').forEach((b) => {
    b.classList.toggle('on', b.dataset.emode === editor.mode);
  });
  (document.getElementById('edit-undo') as HTMLButtonElement).disabled = !editor.canUndo();
  (document.getElementById('edit-redo') as HTMLButtonElement).disabled = !editor.canRedo();
  const active = vectorLayers.find(l => l.id === activeVectorId);
  editHintEl.textContent = editor.hint();
  editHintEl.hidden = editor.mode === 'pan';
  const into = active ? `${active.engine.data.label} (${active.engine.data.crs})` : 'a new layer';
  editStatusEl.textContent = editor.message || (editor.mode === 'pan' || editor.mode === 'select' ? '' : `drawing into ${into}`);
  const sel = editor.selection();
  if (!sel) { editPropsEl.innerHTML = ''; propsShown = null; return; }
  const feats = sel.layer.engine.data.features;
  const head = `${sel.indices.length} selected in ${escapeHtml(sel.layer.engine.data.label)}`;
  if (sel.indices.length !== 1) { editPropsEl.innerHTML = `<div class="hint">${head}</div>`; propsShown = null; return; }
  const i = sel.indices[0];
  const f = feats[i];
  if (!f) { editPropsEl.innerHTML = ''; return; }
  // Rebuilding would take the cursor out of a field being typed in.
  if (f === propsShown) return;
  propsShown = f;
  // a ring's closing vertex is not one the user placed
  const nv = f.parts.reduce((n, p) => n + p.length / 2, 0) - (f.kind === 'polygon' ? f.parts.length : 0);
  const rows = Object.entries(f.props).map(([k, val]) => `
      <div class="control-row prop-row">
        <label title="${escapeHtml(k)}">${escapeHtml(k)}</label>
        <input type="text" data-prop="${escapeHtml(k)}" value="${escapeHtml(val === null || val === undefined ? '' : String(val))}" />
        <button data-prop-del="${escapeHtml(k)}" title="remove this attribute">x</button>
      </div>`).join('');
  editPropsEl.innerHTML = `
      <div class="hint">${head}: feature ${i + 1}, ${f.kind}, ${f.parts.length} part${f.parts.length === 1 ? '' : 's'}, ${nv} vertices</div>
      ${rows}
      <div class="control-row prop-row">
        <input type="text" id="prop-new-key" class="small" placeholder="new attribute" />
        <input type="text" id="prop-new-val" placeholder="value" />
        <button id="prop-add">add</button>
      </div>`;
  editPropsEl.dataset.index = String(i);
}

/** Attribute text from the panel, as a number when it was one and still reads as one. */
function propValue(text: string, was: unknown): unknown {
  if ((typeof was === 'number' || typeof was === 'bigint') && text.trim() !== '' && isFinite(Number(text))) return Number(text);
  if (typeof was === 'boolean' && (text === 'true' || text === 'false')) return text === 'true';
  return text;
}

function wireEditPanel(): void {
  editHintEl = document.getElementById('edit-hint')!;
  editStatusEl = document.getElementById('edit-status')!;
  editPropsEl = document.getElementById('edit-props')!;
  editor = new Editor({
    canvas,
    context: () => contextFor(viewController.getState()),
    layers: () => vectorLayers,
    active: () => vectorLayers.find(l => l.id === activeVectorId) ?? null,
    defaultCRS: defaultNewLayerCRS,
    newLayer: (crs, label, features) => newTempLayer(crs, label, features),
    changed: (layer) => {
      const state = viewController.getState();
      layer.engine.layout(contextFor(state));
      render(state);
      updateUI();
      scheduleRefresh(state);
    },
    render: () => render(viewController.getState()),
    panel: updateEditPanel
  });
  viewController.claim = editor.claim;

  document.querySelectorAll<HTMLButtonElement>('[data-emode]').forEach((b) => {
    b.addEventListener('click', () => editor.setMode(b.dataset.emode as EditMode));
  });
  document.getElementById('edit-undo')!.addEventListener('click', () => editor.undo());
  document.getElementById('edit-redo')!.addEventListener('click', () => editor.redo());
  document.getElementById('edit-delete')!.addEventListener('click', () => editor.deleteSelected());
  document.getElementById('edit-copy')!.addEventListener('click', () => editor.copy());
  // The buttons paste what wgis copied; with nothing copied they ask the
  // system clipboard (which may ask the user first). Ctrl+V reads both.
  const pasteFromButton = async (asNew: boolean) => {
    let text: string | null = null;
    if (!editor.hasClip()) {
      try { text = await navigator.clipboard.readText(); } catch { /* not allowed */ }
    }
    await editor.paste(text, asNew);
  };
  document.getElementById('edit-paste')!.addEventListener('click', () => pasteFromButton(false));
  document.getElementById('edit-paste-new')!.addEventListener('click', () => pasteFromButton(true));
  const keep = document.getElementById('edit-keep-shape') as HTMLInputElement;
  keep.addEventListener('change', () => { editor.keepShape = keep.checked; });
  const crsIn = document.getElementById('new-layer-crs') as HTMLInputElement;
  crsIn.placeholder = `CRS (blank: ${defaultNewLayerCRS()})`;
  crsIn.addEventListener('focus', () => { crsIn.placeholder = `CRS (blank: ${defaultNewLayerCRS()})`; });
  document.getElementById('new-layer-btn')!.addEventListener('click', async () => {
    const crs = crsIn.value.trim() || defaultNewLayerCRS();
    if (!await resolveCRS(crs)) { alert(unknownCRSMessage(crs)); return; }
    newTempLayer(crs, 'new layer', []);
    editor.message = `new layer in ${crs}; pick a drawing mode`;
    updateEditPanel();
  });

  editPropsEl.addEventListener('change', (e) => {
    const t = e.target as HTMLInputElement;
    const key = t.getAttribute('data-prop');
    const sel = editor.selection();
    if (key === null || !sel) return;
    const i = parseInt(editPropsEl.dataset.index || '-1');
    const f = sel.layer.engine.data.features[i];
    if (!f) return;
    editor.setProps(i, { ...f.props, [key]: propValue(t.value, f.props[key]) });
  });
  editPropsEl.addEventListener('click', (e) => {
    const t = e.target as HTMLElement;
    const sel = editor.selection();
    if (!sel) return;
    const i = parseInt(editPropsEl.dataset.index || '-1');
    const f = sel.layer.engine.data.features[i];
    if (!f) return;
    const del = t.getAttribute('data-prop-del');
    if (del !== null) {
      const props = { ...f.props };
      delete props[del];
      editor.setProps(i, props);
    } else if (t.id === 'prop-add') {
      const k = (document.getElementById('prop-new-key') as HTMLInputElement).value.trim();
      const val = (document.getElementById('prop-new-val') as HTMLInputElement).value;
      if (k) editor.setProps(i, { ...f.props, [k]: val });
    }
  });

  window.addEventListener('beforeunload', (e) => {
    if (!anyUnsaved()) return;
    e.preventDefault();
    e.returnValue = '';
  });
  updateEditPanel();
}

function vectorItemHtml(v: VectorLayer): string {
  const d = v.engine.data;
  const st = v.engine.status();
  const sty = v.engine.getStyle();
  const notes = [st.loading ? 'loading' : '', st.coarse ? 'coarse while moving' : ''].filter(Boolean).join(', ');
  const crs = d.crs.length > 40 ? d.crs.slice(0, 37) + '...' : d.crs;
  const edited = v.modified ? (v.temp ? ' <b title="not saved anywhere yet">unsaved</b>' : ' <b title="a link still loads the original">edited</b>') : '';
  return `
      <div class="layer-item">
        <input type="radio" name="vactive" data-vactive="${v.id}"${v.id === activeVectorId ? ' checked' : ''} title="draw and paste into this layer" />
        <button data-vremove="${v.id}" title="Remove layer">x</button>
        <button data-vfit="${v.id}" title="Centre the view on this layer">fit</button>
        <input type="color" class="swatch" data-vcolour="${v.id}" value="${sty.stroke}" title="colour" />
        <span title="${v.url ?? 'local file'}">${escapeHtml(d.label)}</span>
        <span>(${d.format}, <span title="${escapeHtml(d.crs)}">${escapeHtml(crs)}</span> ${d.crsOrigin === '[assumed]' ? '[assumed]' : ''})${edited}</span>
      </div>
      <div class="alpha-row">
        ${st.features} features, ${st.vertices} vertices; ${st.visible} on the map as ${st.drawnPoints} points${notes ? ` (${notes})` : ''}
      </div>
      <div class="alpha-row">
        alpha <input type="range" min="0" max="1" step="0.02" value="${sty.opacity}" data-valpha="${v.id}" style="width:60px" />
        fill <input type="range" min="0" max="1" step="0.02" value="${sty.fillOpacity}" data-vfill="${v.id}" style="width:60px" />
        width <input type="text" class="num tiny" value="${sty.width}" data-vwidth="${v.id}" style="width:32px" />
        save <button data-vsave="${v.id}" data-as="fgb" title="FlatGeobuf in the layer's own CRS">.fgb</button>
        <button data-vsave="${v.id}" data-as="geojson" title="GeoJSON in lon/lat">.geojson</button>
      </div>`;
}

function escapeHtml(t: string): string {
  return t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function setVectorStyle(id: number, partial: Partial<VectorStyle>): void {
  const v = vectorLayers.find(l => l.id === id);
  if (!v) return;
  v.engine.setStyle({ ...v.engine.getStyle(), ...partial });
  render(viewController.getState());
  scheduleUrlUpdate();
}

/**
 * Engines may have to fetch or compute to serve a new view, so that is
 * debounced while the view is still moving.
 */
let updateTimeout: number | null = null;
function scheduleRefresh(state: ViewState): void {
  if (updateTimeout) clearTimeout(updateTimeout);
  updateTimeout = window.setTimeout(() => {
    const ctx = contextFor(state);
    layers.forEach(layer => layer.engine.refresh(ctx));
    vectorLayers.forEach(v => v.engine.refresh(ctx).then((changed) => {
      if (changed) { render(viewController.getState()); updateUI(); }
    }));
    if (coastline && showCoastline) void coastline.refresh(ctx).then((changed) => {
      if (changed) render(viewController.getState());
    });
    updateTimeout = null;
  }, 150);
}

// ---------------------------------------------------------------------------
// WMTS layer picker
// ---------------------------------------------------------------------------

let pickerEl: HTMLElement;
let pickerFilter: HTMLInputElement;
let pickerLayer: HTMLSelectElement;
let pickerTms: HTMLSelectElement;
let pickerTimeRow: HTMLElement;
let pickerTime: HTMLInputElement;
let pickerTimeHint: HTMLElement;
let pickerCount: HTMLElement;
let pickerCaps: ParsedCapabilities | null = null;
let pickerUrl = '';

/**
 * Load a capabilities document into the picker. Returns true if the picker
 * was shown (the caller should not add a layer yet), false if the document
 * has exactly one layer and no choices to make.
 */
async function openPicker(url: string): Promise<boolean> {
  const caps = await fetchCapabilities(url);
  const usable = caps.layers.filter(l => l.tmsIds.some(id => {
    const t = caps.tms.get(id);
    return t && ensureCRS(t.crs);
  }));
  if (usable.length === 0) throw new Error('No layer in this capabilities document uses a CRS we can transform');
  const single = usable.length === 1 && usable[0].tmsIds.length <= 1 && usable[0].dimensions.length === 0;
  if (single) return false;

  pickerCaps = caps;
  pickerUrl = url;
  pickerFilter.value = '';
  fillPickerLayers(usable);
  pickerEl.hidden = false;
  return true;
}

function fillPickerLayers(layers: WMTSLayerInfo[]): void {
  const q = pickerFilter.value.trim().toLowerCase();
  const shown = q ? layers.filter(l => (l.title + ' ' + l.id).toLowerCase().includes(q)) : layers;
  pickerLayer.innerHTML = '';
  for (const l of shown.slice(0, 500)) {
    const opt = document.createElement('option');
    opt.value = l.id;
    opt.textContent = l.title === l.id ? l.id : `${l.title} [${l.id}]`;
    pickerLayer.appendChild(opt);
  }
  pickerCount.textContent = `${shown.length} of ${layers.length} layers`;
  onPickerLayerChange();
}

function pickerUsableLayers(): WMTSLayerInfo[] {
  if (!pickerCaps) return [];
  const caps = pickerCaps;
  return caps.layers.filter(l => l.tmsIds.some(id => {
    const t = caps.tms.get(id);
    return t && ensureCRS(t.crs);
  }));
}

function onPickerLayerChange(): void {
  if (!pickerCaps) return;
  const layer = pickerCaps.layers.find(l => l.id === pickerLayer.value);
  pickerTms.innerHTML = '';
  pickerTimeRow.hidden = true;
  if (!layer) return;
  for (const id of layer.tmsIds) {
    const t = pickerCaps.tms.get(id);
    if (!t || !ensureCRS(t.crs)) continue;
    const opt = document.createElement('option');
    opt.value = id;
    opt.textContent = `${id} (${t.crs}, ${t.matrices.length} levels)`;
    pickerTms.appendChild(opt);
  }
  const pref = Array.from(pickerTms.options).find(o => /google|webmercator|3857/i.test(o.value));
  if (pref) pickerTms.value = pref.value;

  const time = layer.dimensions.find(d => /^time$/i.test(d.id));
  if (time) {
    pickerTimeRow.hidden = false;
    pickerTime.value = time.default || time.values[0] || '';
    const v = time.values;
    pickerTimeHint.textContent = v.length ? (v.length === 1 ? v[0] : `${v[0]} .. ${v[v.length - 1]}`) : '';
    pickerTimeHint.title = v.slice(0, 20).join('\n');
  }
}

function pickerSelectionUrl(): string {
  const frag = new URLSearchParams();
  frag.set('layer', pickerLayer.value);
  if (pickerTms.value) frag.set('tms', pickerTms.value);
  if (!pickerTimeRow.hidden && pickerTime.value.trim()) frag.set('time', pickerTime.value.trim());
  return `${pickerUrl}#${frag.toString()}`;
}

// ---------------------------------------------------------------------------
// Rendering and UI
// ---------------------------------------------------------------------------

function render(state: ViewState): void {
  const ctx = contextFor(state);
  const { view } = ctx;
  gl.clearColor(0.1, 0.1, 0.1, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT);
  for (const layer of layers) {
    layer.engine.draw(ctx);
  }
  if (showGraticule) {
    updateGraticule();
    gratMinor.render(view.centreX, view.centreY, view.zoom, [1, 1, 1, 0.25]);
    gratMajor.render(view.centreX, view.centreY, view.zoom, [1, 1, 1, 0.6]);
  }
  if (showWireframe) {
    const colors: [number, number, number, number][] = [
      [1, 1, 0, 0.55], [0, 1, 1, 0.55], [1, 0.4, 1, 0.55], [0.5, 1, 0.5, 0.55]
    ];
    layers.forEach((layer, i) => layer.engine.drawWireframe(ctx, colors[i % colors.length]));
  }
  drawVectors(ctx);
  updateInfo(state);
}

function updateInfo(state: ViewState): void {
  const crs = currentDisplayCRS();
  const metresPerPx = 1 / Math.pow(2, state.zoom);
  const lines = [
    `Mode: ${mode}`,
    `Display: <span class="crs-string" title="${crs}">${crs}</span>`,
    `Engine: ${engineKind === 'warp' ? `warp (${warpAlg}, ${warpScale}x)` : 'mesh'}`,
    `Executor: ${executorFor(crs) === 'proj' ? 'PROJ (wasm), a frame behind' : 'proj4js'}`,
    `Zoom: ${state.zoom.toFixed(2)} (${formatRes(metresPerPx)}/px)`,
  ];
  if (mode === 'centred') {
    lines.push(`Centre: ${centreLon.toFixed(4)}, ${centreLat.toFixed(4)}`);
    if (wrapWorld) lines.push(currentWrap() ? 'Wrap: repeating the world' : 'Wrap: this projection has no sideways repeat');
    lines.push(`Re-centre: ${recentreLive() ? 'live' : 'on release'}`);
    if ((lookOffsetX !== 0 || lookOffsetY !== 0) && !foldOnRelease) {
      lines.push(`Looking ${formatUnits(Math.hypot(lookOffsetX, lookOffsetY), 'm')} off centre (shift-drag; a plain drag re-centres)`);
    }
  } else {
    lines.push(`Centre: ${state.centerX.toFixed(1)}, ${state.centerY.toFixed(1)}`);
    if (wrapWorld) lines.push(currentWrap() ? 'Wrap: repeating the world' : 'Wrap: this projection has no sideways repeat');
  }
  lines.push(`Layers: ${layers.length} raster, ${vectorLayers.length} vector`);
  infoEl.innerHTML = lines.join('<br>');
  updateTopbar(state);
}

function formatUnits(v: number, unit: string): string {
  if (!isFinite(v)) return '?';
  if (unit === 'deg') return v >= 1 ? `${v.toFixed(2)} deg` : `${v.toFixed(4)} deg`;
  return formatRes(v);
}

function formatRes(v: number): string {
  if (!isFinite(v)) return '?';
  if (v >= 1000) return `${(v / 1000).toFixed(1)} km`;
  if (v >= 1) return `${v.toFixed(1)} m`;
  return `${v.toFixed(3)} m`;
}

function updateUI(): void {
  layersEl.innerHTML = layers.map(layer => {
    const src = layer.source;
    const st8 = layer.engine.status();
    const res = st8.hasTexture ? src.levels[st8.level].resolution : NaN;
    const unit = /4326|4269|longlat/.test(src.crs) ? 'deg' : 'm';
    const lvl = st8.hasTexture ? `${formatUnits(res, unit)}/px ${st8.textureSize}` : '...';
    const loading = st8.loading ? ' (loading)' : '';
    const pct = Math.round(st8.validFraction * 100);
    const attr = src.attribution ? `<div class="attribution">${src.attribution}</div>` : '';
    let scaleRow = '';
    if (layer.scale) {
      const sc = layer.scale;
      const cog = src as COGSource;
      const st = layer.engine.status().stats;
      const n = cog.samplesPerPixel;
      const pinned = colormapRange(sc.cmap) !== null;
      const cmapOpts = Object.entries(COLORMAPS).map(([k, v]) =>
        `<option value="${k}"${k === sc.cmap ? ' selected' : ''}>${v.label}</option>`).join('');
      const bandOpts = (sel: number) => Array.from({ length: n }, (_, i) =>
        `<option value="${i + 1}"${i === sel ? ' selected' : ''}>${i + 1}</option>`).join('');
      const bandUI = sc.mode === 'rgb' && cog.rgbBands
        ? `R <select data-band="${layer.id}" data-ch="0">${bandOpts(cog.rgbBands[0])}</select>
           G <select data-band="${layer.id}" data-ch="1">${bandOpts(cog.rgbBands[1])}</select>
           B <select data-band="${layer.id}" data-ch="2">${bandOpts(cog.rgbBands[2])}</select>`
        : (n > 1 ? `band <select data-band="${layer.id}" data-ch="0">${bandOpts(cog.band)}</select>` : '');
      const modeUI = n >= 3
        ? `<select data-mode="${layer.id}">
             <option value="single"${sc.mode === 'single' ? ' selected' : ''}>single band + colormap</option>
             <option value="rgb"${sc.mode === 'rgb' ? ' selected' : ''}>RGB composite</option>
           </select>` : '';
      const statInfo = st && st.count ? `data ${fmtNum(st.min)}..${fmtNum(st.max)}` : '';
      const curveOpts = (['linear', 'sqrt', 'log'] as Curve[]).map(c =>
        `<option value="${c}"${c === sc.curve ? ' selected' : ''}>${c}</option>`).join('');
      const ndValue = sc.nodataAuto ? (cog.fileNodata === null ? '' : String(cog.fileNodata)) : String(sc.nodata ?? '');
      scaleRow = `
      <div class="scale-row" data-layer="${layer.id}">
        ${modeUI} ${bandUI}
        <span class="hint">${statInfo}</span>
      </div>
      <div class="scale-row" data-layer="${layer.id}">
        <canvas class="hist" data-hist="${layer.id}" width="200" height="36"></canvas>
      </div>
      <div class="scale-row" data-layer="${layer.id}">
        <span class="hist-legend" style="background:${sc.mode === 'rgb' ? 'linear-gradient(to right,#000,#fff)' : colormapCss(sc.cmap)}"></span>
        <span class="hint">${pinned ? 'anchored palette: colours are fixed to values' : ''}</span>
      </div>
      <div class="scale-row" data-layer="${layer.id}">
        <input type="text" class="num" data-min="${layer.id}" value="${fmtNum(sc.min)}" title="min"${pinned ? ' disabled' : ''} />
        <input type="text" class="num" data-max="${layer.id}" value="${fmtNum(sc.max)}" title="max"${pinned ? ' disabled' : ''} />
        <button data-auto="${layer.id}" title="2-98 percentile of the current window"${pinned ? ' disabled' : ''}>2-98%</button>
        <button data-minmax="${layer.id}" title="full range of the current window"${pinned ? ' disabled' : ''}>min/max</button>
        <select data-curve="${layer.id}" title="curve">${curveOpts}</select>
      </div>
      <div class="scale-row" data-layer="${layer.id}">
        ${sc.mode === 'rgb' ? '' : `<select data-cmap="${layer.id}">${cmapOpts}</select>`}
        <label class="wide">nodata</label>
        <input type="text" class="num" data-nodata="${layer.id}" value="${ndValue}" placeholder="none" title="nodata value; blank = none" />
        <button data-nodata-auto="${layer.id}" title="use the file's nodata tag"${sc.nodataAuto ? ' disabled' : ''}>auto</button>
        <button data-reset="${layer.id}" title="back to the styling this layer was loaded with">reset</button>
      </div>
      ${sc.mode === 'rgb' ? '' : `<div class="scale-row" data-layer="${layer.id}">
        <input type="checkbox" data-shade="${layer.id}"${sc.shade ? ' checked' : ''} />
        <label class="wide">hillshade</label>
        <input type="range" min="0" max="1" step="0.05" value="${sc.shadeStrength}" data-shade-strength="${layer.id}" title="strength" style="width:70px" />
        <label class="wide">z</label>
        <input type="text" class="num tiny" data-zf="${layer.id}" value="${sc.zfactor}" title="vertical exaggeration" />
        <label class="wide">az</label>
        <input type="text" class="num tiny" data-az="${layer.id}" value="${sc.azimuth}" title="sun azimuth (deg from north)" />
        <label class="wide">alt</label>
        <input type="text" class="num tiny" data-alt="${layer.id}" value="${sc.altitude}" title="sun altitude (deg)" />
      </div>`}`;
    }
    return `
      <div class="layer-item">
        <button data-remove="${layer.id}" title="Remove layer">x</button>
        <button data-fit="${layer.id}" title="Centre the view on this layer">fit</button>
        <span title="${layer.url}">${src.label}</span>
        <span>(${src.kind} ${src.crs}, ${lvl}${loading}, ${pct}% on-globe)</span>
      </div>${layer.engine instanceof WarpEngine ? `<div class="alpha-row">${layer.engine.describe()}</div>` : ''}
      <div class="alpha-row">
        alpha <input type="range" min="0" max="1" step="0.02" value="${layer.opacity}" data-alpha="${layer.id}" />
        <span data-alpha-val="${layer.id}">${Math.round(layer.opacity * 100)}%</span>
      </div>${scaleRow}${attr}
    `;
  }).join('') + vectorLayers.map(vectorItemHtml).join('');
  for (const layer of layers) drawHistogram(layer);
  updateEditPanel();
}

/**
 * Histogram of the fetched window with the current min/max as handles.
 */
function drawHistogram(layer: Layer): void {
  if (!layer.scale) return;
  const c = layersEl.querySelector(`canvas[data-hist="${layer.id}"]`) as HTMLCanvasElement | null;
  if (!c) return;
  const ctx = c.getContext('2d')!;
  const W = c.width, H = c.height;
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(0, 0, W, H);
  const st = layer.engine.status().stats;
  if (!st || !st.count) return;
  const sc = layer.scale;
  // Axis spans the union of data range and current range so handles are visible
  const lo = Math.min(st.min, sc.min), hi = Math.max(st.max, sc.max);
  const span = hi - lo || 1;
  const bins = st.hist.length;
  let peak = 0;
  for (let i = 0; i < bins; i++) if (st.hist[i] > peak) peak = st.hist[i];
  const lpeak = Math.log(1 + peak);
  ctx.fillStyle = '#777';
  for (let x = 0; x < W; x++) {
    // bin for this pixel column (data bins cover st.min..st.max)
    const v0 = lo + (x / W) * span;
    const v1 = lo + ((x + 1) / W) * span;
    const b0 = Math.floor((v0 - st.min) / (st.max - st.min || 1) * bins);
    const b1 = Math.max(b0 + 1, Math.ceil((v1 - st.min) / (st.max - st.min || 1) * bins));
    let m = 0;
    for (let b = Math.max(0, b0); b < Math.min(bins, b1); b++) if (st.hist[b] > m) m = st.hist[b];
    if (m > 0) {
      const h = Math.max(1, Math.round((Math.log(1 + m) / lpeak) * (H - 2)));
      ctx.fillRect(x, H - h, 1, h);
    }
  }
  // Selected range and handles
  const xMin = ((sc.min - lo) / span) * W;
  const xMax = ((sc.max - lo) / span) * W;
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  ctx.fillRect(xMin, 0, Math.max(1, xMax - xMin), H);
  ctx.fillStyle = '#ff0';
  ctx.fillRect(Math.round(xMin) - 1, 0, 2, H);
  ctx.fillRect(Math.round(xMax) - 1, 0, 2, H);
}

/**
 * Drag the min/max handles on a histogram.
 */
function histogramPointer(layer: Layer, canvas: HTMLCanvasElement, e: PointerEvent): void {
  const st0 = layer.engine.status().stats;
  if (!layer.scale || !st0 || !st0.count) return;
  if (colormapRange(layer.scale.cmap)) return;  // pinned palette
  const st = st0, sc = layer.scale;
  const rect = canvas.getBoundingClientRect();
  const toValue = (clientX: number) => {
    const lo = Math.min(st.min, sc.min), hi = Math.max(st.max, sc.max);
    const x = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return lo + x * (hi - lo);
  };
  const v = toValue(e.clientX);
  const which: 'min' | 'max' = Math.abs(v - sc.min) <= Math.abs(v - sc.max) ? 'min' : 'max';
  const move = (ev: PointerEvent) => {
    const nv = toValue(ev.clientX);
    if (which === 'min') applyScale(layer, { min: Math.min(nv, sc.max), auto: false }, false);
    else applyScale(layer, { max: Math.max(nv, sc.min), auto: false }, false);
    drawHistogram(layer);
    const row = layersEl.querySelector(`.scale-row[data-layer="${layer.id}"] [data-${which}]`) as HTMLInputElement | null;
    if (row) row.value = fmtNum(which === 'min' ? sc.min : sc.max);
  };
  const up = () => {
    canvas.removeEventListener('pointermove', move);
    canvas.removeEventListener('pointerup', up);
    canvas.releasePointerCapture(e.pointerId);
    scheduleUrlUpdate();
  };
  canvas.setPointerCapture(e.pointerId);
  canvas.addEventListener('pointermove', move);
  canvas.addEventListener('pointerup', up);
  move(e);
}

function fmtNum(v: number): string {
  if (!isFinite(v)) return '?';
  const a = Math.abs(v);
  if (a === 0) return '0';
  if (a >= 1e6 || a < 1e-3) return v.toExponential(3);
  if (a >= 100) return v.toFixed(1);
  return v.toPrecision(4).replace(/\.?0+$/, '');
}

/**
 * Apply an edited scale to a numeric layer: uniforms only, no refetch.
 */
function applyScale(layer: Layer, partial: Partial<ScaleState> & { minmax?: boolean }, updateUrl = true): void {
  if (!layer.scale) return;
  const sc = layer.scale;
  const { minmax, ...rest } = partial;
  Object.assign(sc, rest);
  const pinned = colormapRange(sc.cmap);
  if (pinned) {
    sc.min = pinned[0];
    sc.max = pinned[1];
    sc.auto = false;
  } else {
    const stats = layer.engine.status().stats;
    if (stats && stats.count) {
      if (minmax) {
        sc.min = stats.min;
        sc.max = stats.max;
        sc.auto = false;
      } else if (sc.auto) {
        sc.min = stats.p2;
        sc.max = stats.p98;
      }
    }
  }
  // The source needs the nodata value too: it masks on the raw value as it
  // reads, which the shader cannot do.
  const cog = layer.source as COGSource;
  cog.nodata = sc.nodataAuto ? cog.fileNodata : sc.nodata;
  sc.nodata = cog.nodata;
  layer.engine.setStyle(styleOf(layer));
  render(viewController.getState());
  if (updateUrl) scheduleUrlUpdate();
}

/**
 * Restore the styling a layer was loaded with (its URL fragment, or the
 * defaults). Bands and mode are restored too, which refetches if they differ.
 */
async function resetScale(layer: Layer): Promise<void> {
  if (!layer.scale) return;
  const o = splitCogUrl(layer.url);
  const cog = layer.source as COGSource;
  const cmap = o.cmap && isColormapName(o.cmap) ? o.cmap : 'viridis';
  const pinned = colormapRange(cmap);
  const explicit = o.min !== undefined && o.max !== undefined;
  const wantMode: 'single' | 'rgb' = o.bands && cog.samplesPerPixel >= 3 ? 'rgb' : 'single';
  const wantBands = wantMode === 'rgb' ? o.bands!.map(b => b - 1) : [Math.max(0, (o.band || 1) - 1)];
  const a = parseFloat(fragmentParams(layer.url).get('alpha') || '');
  layer.opacity = isFinite(a) ? a : 1;
  Object.assign(layer.scale, {
    min: pinned ? pinned[0] : (o.min ?? 0),
    max: pinned ? pinned[1] : (o.max ?? 1),
    cmap,
    curve: o.curve === 'sqrt' || o.curve === 'log' ? o.curve : 'linear',
    auto: !explicit && !pinned,
    nodata: o.nodata ?? null,
    nodataAuto: o.nodata === undefined,
    shade: o.shade !== undefined,
    shadeStrength: o.shade ?? 0.6,
    zfactor: o.zf ?? 1,
    azimuth: o.az ?? 315,
    altitude: o.alt ?? 45
  });
  const bandsDiffer = wantMode !== layer.scale.mode ||
    (wantMode === 'rgb' ? !cog.rgbBands || wantBands.some((b, i) => b !== cog.rgbBands![i]) : cog.band !== wantBands[0]);
  if (bandsDiffer) {
    await changeBands(layer, wantMode, wantBands);
  } else {
    applyScale(layer, {});
    updateUI();
  }
}

/**
 * Band or mode changes need the data itself: refetch, then re-run auto range.
 */
async function changeBands(layer: Layer, mode: 'single' | 'rgb', bands: number[]): Promise<void> {
  if (!layer.scale) return;
  const cog = layer.source as COGSource;
  const n = cog.samplesPerPixel;
  const clamp = (b: number) => Math.max(0, Math.min(n - 1, b));
  if (mode === 'rgb') {
    cog.rgbBands = [clamp(bands[0]), clamp(bands[1]), clamp(bands[2])];
  } else {
    cog.rgbBands = null;
    cog.band = clamp(bands[0]);
  }
  layer.scale.mode = mode;
  layer.engine.invalidate();
  await layer.engine.refresh(contextFor(viewController.getState()));
  // stats changed with the new bands: the nodata may too, so recompute
  applyScale(layer, {});
  updateUI();
}

/**
 * The layer URL with its current scaling encoded in the fragment.
 */
function layerUrlWithState(layer: Layer): string {
  const base = splitCogUrl(layer.url);
  const frag = fragmentParams(layer.url);
  for (const k of ['band', 'bands', 'min', 'max', 'cmap', 'curve', 'nodata', 'alpha', 'shade', 'zf', 'az', 'alt']) frag.delete(k);
  if (layer.opacity < 1) frag.set('alpha', layer.opacity.toFixed(2));
  if (!layer.scale) {
    const q0 = formatFragment(frag);
    return q0 ? `${base.url}#${q0}` : base.url;
  }
  const cog = layer.source as COGSource;
  const sc = layer.scale;
  if (sc.mode === 'rgb' && cog.rgbBands) {
    frag.set('bands', cog.rgbBands.map(b => b + 1).join(','));
  } else if (cog.samplesPerPixel > 1) {
    frag.set('band', String(cog.band + 1));
  }
  if (!sc.auto && !colormapRange(sc.cmap)) {
    frag.set('min', String(sc.min));
    frag.set('max', String(sc.max));
  }
  if (sc.mode !== 'rgb' && sc.cmap !== 'viridis') frag.set('cmap', sc.cmap);
  if (sc.curve !== 'linear') frag.set('curve', sc.curve);
  if (!sc.nodataAuto && sc.nodata !== null) frag.set('nodata', String(sc.nodata));
  if (sc.shade) {
    frag.set('shade', sc.shadeStrength.toFixed(2));
    if (sc.zfactor !== 1) frag.set('zf', String(sc.zfactor));
    if (sc.azimuth !== 315) frag.set('az', String(sc.azimuth));
    if (sc.altitude !== 45) frag.set('alt', String(sc.altitude));
  }
  const q = formatFragment(frag);
  return q ? `${base.url}#${q}` : base.url;
}

function syncCentreInputs(): void {
  centreLonInput.value = centreLon.toFixed(4);
  centreLatInput.value = centreLat.toFixed(4);
}

/**
 * Push the current state into the form controls.
 */
function syncUI(): void {
  modeSelect.value = mode;
  fixedPanel.hidden = mode !== 'fixed';
  centredPanel.hidden = mode !== 'centred';
  gridSizeInput.value = String(gridSize);
  wireframeInput.checked = showWireframe;
  (document.getElementById('refine') as HTMLInputElement).checked = refineEdges;
  wrapInput.checked = wrapWorld;
  engineSelect.value = engineKind;
  warpAlgSelect.value = warpAlg;
  warpScaleInput.value = String(warpScale);
  recentreSelect.value = recentreMode;
  graticuleInput.checked = showGraticule;
  if (coastlineInput) coastlineInput.checked = showCoastline;
  displayCrsInput.value = displayCRS;
  extentInput.value = [meshExtent.minX, meshExtent.maxX, meshExtent.minY, meshExtent.maxY].join(',');
  if (isPresetName(centredProj)) {
    projSelect.value = centredProj;
    projTemplateInput.value = CENTRED_PRESETS[centredProj].template;
  } else {
    projSelect.value = 'custom';
    projTemplateInput.value = centredProj;
  }
  projTemplateInput.hidden = projSelect.value !== 'custom';
  syncCentreInputs();
  updateVertexCount();
}

// ---------------------------------------------------------------------------
// URL state (so a hosted page can link to a specific scene)
// ---------------------------------------------------------------------------

function applyUrlParams(params: URLSearchParams): void {
  const m = params.get('mode');
  if (m === 'fixed' || m === 'centred') mode = m;

  const g = parseInt(params.get('grid') || '');
  if (!isNaN(g) && g >= 4) gridSize = g;

  const rf = params.get('refine');
  if (rf !== null) refineEdges = !(rf === '0' || rf === 'false');

  const w = params.get('wire');
  if (w !== null) showWireframe = w === '1' || w === 'true';

  const gr = params.get('grat');
  if (gr !== null) showGraticule = gr === '1' || gr === 'true';

  const wr = params.get('wrap');
  if (wr !== null) wrapWorld = wr === '1' || wr === 'true';

  const en = params.get('engine');
  if (en === 'mesh' || en === 'warp') engineKind = en;
  const al = params.get('alg');
  if (al === 'nearest' || al === 'bilinear' || al === 'cubic' || al === 'lanczos') warpAlg = al;
  const ws = parseFloat(params.get('warpscale') || '');
  if (isFinite(ws) && ws > 0) warpScale = ws;
  const me = parseFloat(params.get('maxerr') || '');
  if (isFinite(me) && me >= 0) warpMaxError = me;

  const sc = params.get('scope');
  if (sc === 'global' || sc === 'hemi' || sc === 'local' || sc === 'data') scope = sc;
  const co = params.get('coast');
  if (co !== null) showCoastline = !(co === '0' || co === 'false');

  const rc = params.get('recentre');
  if (rc === 'live' || rc === 'release' || rc === 'auto') recentreMode = rc;

  const crs = params.get('crs');
  if (crs) displayCRS = crs;

  const proj = params.get('proj');
  if (proj) centredProj = proj;

  const ext = params.get('extent');
  if (ext) {
    const p = ext.split(',').map(Number);
    if (p.length === 4 && p.every(isFinite)) {
      meshExtent = { minX: p[0], maxX: p[1], minY: p[2], maxY: p[3] };
    }
  }
}

function initialViewFromParams(params: URLSearchParams): ViewState {
  const c = (params.get('center') || '').split(',').map(Number);
  const z = parseFloat(params.get('zoom') || '');
  if (mode === 'centred') {
    if (c.length === 2 && c.every(isFinite)) {
      [centreLon, centreLat] = normaliseLonLat(c[0], c[1]);
    }
    return { centerX: 0, centerY: 0, zoom: isFinite(z) ? z : defaultCentredZoom() };
  }
  const cx = c.length === 2 && isFinite(c[0]) ? c[0] : (meshExtent.minX + meshExtent.maxX) / 2;
  const cy = c.length === 2 && isFinite(c[1]) ? c[1] : (meshExtent.minY + meshExtent.maxY) / 2;
  const zoom = isFinite(z) ? z : Math.log2(canvas.clientWidth / (meshExtent.maxX - meshExtent.minX));
  return { centerX: cx, centerY: cy, zoom };
}

let urlTimeout: number | null = null;
function scheduleUrlUpdate(): void {
  if (urlTimeout) clearTimeout(urlTimeout);
  urlTimeout = window.setTimeout(writeUrl, 300);
}

/**
 * The address bar follows the view - mode, projection, centre, zoom, grid,
 * the toggles - so a refresh comes back where you were. Layers are not
 * written as you go: they are the thing you most often want to start
 * again without, and a link that is meant to be shared gets them
 * explicitly with the "link" button (or withLayers here).
 */
function viewUrl(withLayers: boolean): string {
  const state = viewController.getState();
  const p = new URLSearchParams();
  p.set('mode', mode);
  if (mode === 'centred') {
    p.set('proj', centredProj);
    p.set('center', `${centreLon.toFixed(5)},${centreLat.toFixed(5)}`);
  } else {
    p.set('crs', displayCRS);
    p.set('extent', [meshExtent.minX, meshExtent.maxX, meshExtent.minY, meshExtent.maxY].join(','));
    p.set('center', `${state.centerX.toFixed(1)},${state.centerY.toFixed(1)}`);
  }
  p.set('zoom', state.zoom.toFixed(3));
  if (gridSize !== 64) p.set('grid', String(gridSize));
  if (showWireframe) p.set('wire', '1');
  if (!refineEdges) p.set('refine', '0');
  if (!showGraticule) p.set('grat', '0');
  if (wrapWorld) p.set('wrap', '1');
  if (recentreMode !== 'auto') p.set('recentre', recentreMode);
  if (engineKind !== 'mesh') p.set('engine', engineKind);
  if (warpAlg !== 'bilinear') p.set('alg', warpAlg);
  if (warpScale !== 1) p.set('warpscale', String(warpScale));
  if (warpMaxError !== 0.125) p.set('maxerr', String(warpMaxError));
  if (scope) p.set('scope', scope);
  if (!showCoastline) p.set('coast', '0');
  if (withLayers) {
    // Local files can't go on a link; they are this page's only.
    for (const l of layers) if (!isLocalUrl(l.url)) p.append('url', layerUrlWithState(l));
    for (const v of vectorLayers) {
      const u = vectorUrlWithState(v);
      if (u) p.append('url', u);
    }
  }
  return `${location.pathname}?${p.toString()}`;
}

function writeUrl(): void {
  // While the start card is up the page is still "no parameters": a
  // reload comes back to the card, not to the spinning globe.
  if (startOpen) return;
  history.replaceState(null, '', viewUrl(false));
  try {
    localStorage.setItem(LAST_VIEW_KEY, viewUrl(true));
  } catch {
    // no storage: "Continue where you were" just does not appear
  }
}

/** A shareable link: the view plus every layer, in the address bar and copied. */
function shareLink(): void {
  const rel = viewUrl(true);
  history.replaceState(null, '', rel);
  const abs = new URL(rel, location.href).href;
  if (navigator.clipboard) {
    navigator.clipboard.writeText(abs).then(
      () => console.log('Link copied:', abs),
      () => console.log('Link (copy by hand):', abs));
  } else {
    console.log('Link (copy by hand):', abs);
  }
}

/** Back to the defaults: the page with no parameters at all. */
function resetAll(): void {
  location.href = location.pathname;
}

// ---------------------------------------------------------------------------
// The start card, scopes and the top bar (start/scopes.ts)
// ---------------------------------------------------------------------------

let startCard: HTMLElement;
let startHint: HTMLElement;
let startMsg: HTMLElement;
let startPlaces: HTMLElement;
let scopeChip: HTMLButtonElement;
let crsChip: HTMLButtonElement;
let bgChip: HTMLSelectElement;
let switchChip: HTMLButtonElement;
let coastlineInput: HTMLInputElement;
/** The key of the background layer (BACKGROUNDS), or 'none'. */
let backgroundKey = 'none';
let backgroundToken = 0;
/** "Pick on the globe": the next click on the map is the place. */
let picking = false;
let switchAction: (() => void) | null = null;

/** Switch to a centred view. False (and nothing changed) if the CRS cannot be resolved. */
async function setCentredView(proj: string, lon: number, lat: number, zoom: number): Promise<boolean> {
  const crs = centredCRS(resolveTemplate(proj), lon, lat);
  if (!await resolveCRS(crs)) {
    alert(unknownCRSMessage(crs));
    return false;
  }
  mode = 'centred';
  centredProj = proj;
  [centreLon, centreLat] = normaliseLonLat(lon, lat);
  lookOffsetX = 0;
  lookOffsetY = 0;
  foldOnRelease = false;
  meshZoom = NaN;   // the mesh may be a fixed-mode one: rebuild it
  updateCentredOrigin();
  makeViewController({ centerX: 0, centerY: 0, zoom });
  syncUI();
  return true;
}

/**
 * Switch to a fixed view in a CRS, with this mesh extent, showing `fit`
 * (or centred on it at `zoom`). False if the CRS cannot be resolved.
 */
async function setFixedView(crs: string, extent: SourceBounds, fit: SourceBounds, zoom?: number): Promise<boolean> {
  if (!await resolveCRS(crs)) {
    alert(unknownCRSMessage(crs));
    return false;
  }
  mode = 'fixed';
  displayCRS = crs;
  meshExtent = { minX: extent.minX, minY: extent.minY, maxX: extent.maxX, maxY: extent.maxY };
  lookOffsetX = 0;
  lookOffsetY = 0;
  updateCentredOrigin();
  regenerateMesh();
  const w = Math.max(fit.maxX - fit.minX, 1e-9), h = Math.max(fit.maxY - fit.minY, 1e-9);
  const z = zoom ?? Math.log2(Math.min(canvas.clientWidth / w, canvas.clientHeight / h) / 1.1);
  makeViewController({ centerX: (fit.minX + fit.maxX) / 2, centerY: (fit.minY + fit.maxY) / 2, zoom: z });
  layoutAllLayers();
  syncUI();
  return true;
}

/** Equal Earth, the whole world in the canvas. */
function worldZoom(): number {
  const w = canvas.clientWidth || 800, h = canvas.clientHeight || 600;
  return Math.log2(Math.min(w / 34.5e6, h / 16.8e6) / 1.08);
}

/** Replace the background layer (always the bottom raster); 'none' removes it. */
async function setBackground(key: string): Promise<void> {
  const token = ++backgroundToken;
  const old = layers.find(l => l.id === backgroundId);
  if (old) {
    old.engine.dispose();
    layers = layers.filter(l => l !== old);
  }
  backgroundId = null;
  backgroundKey = 'none';
  const b = BACKGROUNDS[key];
  bgChip.title = 'Background';
  if (b) {
    // A background that cannot be reached is not worth a dialog: the
    // coastline is there anyway, and the chip says what happened.
    const layer = await addLayer(b.url, true);
    if (!layer && token === backgroundToken) bgChip.title = `${b.label} could not be loaded`;
    if (layer && token !== backgroundToken) {
      // a later choice overtook this one
      removeLayer(layer.id);
      return;
    }
    if (layer) {
      layers = [layer, ...layers.filter(l => l !== layer)];
      backgroundId = layer.id;
      backgroundKey = key;
    }
  }
  bgChip.value = backgroundKey;
  updateUI();
  render(viewController.getState());
  scheduleUrlUpdate();
}

async function ensureBackground(key: string): Promise<void> {
  if (key !== backgroundKey) await setBackground(key);
}

async function loadCoastline(): Promise<void> {
  try {
    const data = await readVectorUrl(COASTLINE_URL);
    const style = { ...defaultVectorStyle('#e6e6e6'), width: 0.8, opacity: 0.75, fillOpacity: 0 };
    coastline = new VectorEngine(data, style, () => render(viewController.getState()));
    const state = viewController.getState();
    if (showCoastline) coastline.layout(contextFor(state));
    render(state);
    scheduleRefresh(state);
  } catch (err) {
    console.warn('Coastline not loaded:', err);
  }
}

// The globe turns slowly behind the start card until anyone touches it.
const SPIN_DEG_PER_S = 6;
let spinning = false;
let spinLast = 0;
let spinRefreshLast = 0;

function startSpin(): void {
  if (spinning || mode !== 'centred') return;
  spinning = true;
  spinLast = performance.now();
  requestAnimationFrame(spinStep);
}

function stopSpin(): void {
  spinning = false;
}

function spinStep(t: number): void {
  if (!spinning || mode !== 'centred') {
    spinning = false;
    return;
  }
  const dt = Math.min(0.1, (t - spinLast) / 1000);
  spinLast = t;
  [centreLon, centreLat] = normaliseLonLat(centreLon + SPIN_DEG_PER_S * dt, centreLat);
  updateCentredOrigin();
  syncCentreInputs();
  layoutAllLayers();
  const state = viewController.getState();
  render(state);
  // scheduleRefresh is a debounce, which a steady spin would starve.
  if (t - spinRefreshLast > 400) {
    spinRefreshLast = t;
    scheduleRefresh(state);
  }
  requestAnimationFrame(spinStep);
}

function showStart(atBoot: boolean): void {
  startOpen = atBoot;
  picking = false;
  startHint.hidden = true;
  startCard.hidden = false;
  document.body.classList.add('starting');
  let last: string | null = null;
  try {
    last = localStorage.getItem(LAST_VIEW_KEY);
  } catch {
    last = null;
  }
  const cont = document.getElementById('start-continue') as HTMLAnchorElement;
  cont.hidden = !atBoot || !last;
  if (last) cont.onclick = () => { location.href = last!; };
  (document.getElementById('start-close') as HTMLElement).hidden = atBoot;
}

function hideStart(): void {
  startOpen = false;
  picking = false;
  stopSpin();
  startCard.hidden = true;
  startHint.hidden = true;
  startMsg.textContent = '';
  startPlaces.innerHTML = '';
  document.body.classList.remove('starting');
}

async function chooseGlobal(lon = centreLon): Promise<void> {
  hideStart();
  scope = 'global';
  if (await setCentredView('eqearth', lon, 0, worldZoom())) await ensureBackground(backgroundFor(0));
}

async function chooseHemi(lat = centreLat, lon = centreLon): Promise<void> {
  hideStart();
  scope = 'hemi';
  if (await setCentredView('ortho', lon, lat, defaultCentredZoom())) await ensureBackground(backgroundFor(lat));
}

/** Local: the UTM zone of the place, a mesh 1000 km across, a view 50 km across (or at `zoom`). */
async function chooseLocal(p: Place, zoom?: number): Promise<void> {
  const lc = localCRS(p.lon, p.lat);
  if (!await resolveCRS(lc.code)) {
    startMsg.textContent = unknownCRSMessage(lc.code);
    return;
  }
  const xy = await geoTransform(lc.code).fromGeo(new Float64Array([p.lon, p.lat]));
  const x = xy[0], y = xy[1];
  if (!isFinite(x) || !isFinite(y)) {
    startMsg.textContent = `${lc.label} has no position for ${p.label}`;
    return;
  }
  hideStart();
  scope = 'local';
  const box = (r: number) => ({ minX: x - r, maxX: x + r, minY: y - r, maxY: y + r });
  if (await setFixedView(lc.code, box(LOCAL_MESH_HALF), box(LOCAL_VIEW_HALF), zoom)) {
    console.log(`Local: ${lc.label} (${lc.code}) at ${p.label}`);
    await ensureBackground(backgroundFor(p.lat));
  }
}

/** Open data: the map goes to the layer's own CRS and extent. */
async function chooseData(input: string | File): Promise<void> {
  if (typeof input === 'string' && !vectorFormatOf(input)) {
    hideStart();
    scope = 'data';
    const layer = await addLayer(input);
    if (!layer) return;
    await viewInCRS(layer.source.crs, layer.source.bounds);
    return;
  }
  let data: VectorData;
  try {
    data = typeof input === 'string' ? await readVectorUrl(input) : await readVectorFile(input);
  } catch (err) {
    startMsg.textContent = `Could not read that layer: ${err instanceof Error ? err.message : err}`;
    return;
  }
  hideStart();
  scope = 'data';
  if (await viewInCRS(data.crs, data.bounds)) pushVectorLayer(data, typeof input === 'string' ? input : null, false, false);
}

async function viewInCRS(crs: string, b: SourceBounds): Promise<boolean> {
  if (![b.minX, b.minY, b.maxX, b.maxY].every(isFinite)) return false;
  if (!await setFixedView(crs, paddedExtent(b, crs), b)) return false;
  let key = 'esri';
  try {
    if (geoTransform(crs).toGeoSync) {
      // Data around a pole (in one hemisphere, reaching 80 degrees) gets
      // the polar background, however many longitudes it spans.
      const ll = transformBounds(b, crs, 'EPSG:4326', 30);
      if (ll.minY <= -80 && ll.maxY < 0) key = backgroundFor(-90);
      else if (ll.maxY >= 80 && ll.minY > 0) key = backgroundFor(90);
      else if (scopeOfLonLat(ll) !== 'global') key = backgroundFor((ll.minY + ll.maxY) / 2);
    }
  } catch {
    // no lon/lat bounds: the default background
  }
  await ensureBackground(key);
  return true;
}

/** Find a typed place: a coordinate if it reads as one, otherwise a place search. */
async function findPlace(text: string): Promise<void> {
  const q = text.trim();
  startPlaces.innerHTML = '';
  startMsg.textContent = '';
  if (!q) return;
  const c = parseCoordinate(q, centreLon, centreLat);
  if (c) {
    await chooseLocal(c);
    return;
  }
  if (!/[A-Za-z]{2,}/.test(q)) {
    startMsg.textContent = 'Could not read that as a place or a coordinate.';
    return;
  }
  startMsg.textContent = 'Searching...';
  let found: Place[];
  try {
    found = await searchPlaces(q);
  } catch (err) {
    startMsg.textContent = `Place search failed (${err instanceof Error ? err.message : err}); coordinates still work.`;
    return;
  }
  if (!found.length) {
    startMsg.textContent = 'No place found by that name.';
    return;
  }
  if (found.length === 1) {
    await chooseLocal(found[0]);
    return;
  }
  startMsg.textContent = '';
  for (const p of found) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = p.label;
    b.addEventListener('click', () => void chooseLocal(p));
    startPlaces.appendChild(b);
  }
}

/** Lon/lat under a screen point (CSS pixels), or null off the map. */
async function lonLatAt(sx: number, sy: number): Promise<Place | null> {
  const v = currentView(viewController.getState());
  const s = Math.pow(2, v.zoom);
  const x = v.centreX + (sx - v.width / 2) / s;
  const y = v.centreY - (sy - v.height / 2) / s;
  const r = await geoTransform(v.crs).toGeo(new Float64Array([x, y]));
  if (!isFinite(r[0]) || !isFinite(r[1])) return null;
  return { lon: r[0], lat: r[1], label: `${r[0].toFixed(4)}, ${r[1].toFixed(4)}` };
}

function startPicking(): void {
  stopSpin();
  startCard.hidden = true;
  picking = true;
  startHint.textContent = 'Click a place on the globe (drag to turn it, Esc to go back)';
  startHint.hidden = false;
}

/** The short name of the map's CRS, for the top bar. */
function crsShortName(): string {
  if (mode === 'centred') {
    return isPresetName(centredProj) ? CENTRED_PRESETS[centredProj].label.replace(/^World: /, '') : 'custom projection';
  }
  const m = displayCRS.match(/^EPSG:(\d+)$/i);
  if (m) {
    const c = +m[1];
    if (c >= 7846 && c <= 7859) return `MGA ${c - 7800}`;
    if (c >= 25828 && c <= 25838) return `ETRS89 UTM ${c - 25800}N`;
    if (c >= 26901 && c <= 26923) return `NAD83 UTM ${c - 26900}N`;
    if (c >= 32601 && c <= 32660) return `UTM ${c - 32600}N`;
    if (c >= 32701 && c <= 32760) return `UTM ${c - 32700}S`;
    if (c === 32661) return 'UPS North';
    if (c === 32761) return 'UPS South';
  }
  return displayCRS.length > 28 ? `${displayCRS.slice(0, 26)}...` : displayCRS;
}

function setText(el: HTMLElement, text: string): void {
  if (el.textContent !== text) el.textContent = text;
}

/**
 * The top bar follows the view: scope and CRS names, and an offer to move
 * between scopes when the zoom has left the current one behind.
 */
function updateTopbar(state: ViewState): void {
  if (!scopeChip) return;
  setText(scopeChip, scope ? SCOPE_LABELS[scope] : 'Choose scope');
  setText(crsChip, crsShortName());
  crsChip.title = `${currentDisplayCRS()}\n(open the view settings)`;
  const mpp = 1 / Math.pow(2, state.zoom);
  let offer = '';
  switchAction = null;
  if (mode === 'centred' && mpp < 150 && !spinning) {
    const lon = centreLon, lat = centreLat;
    offer = `Work locally in ${localCRS(lon, lat).label}?`;
    switchAction = () => void chooseLocal({ lon, lat, label: 'the view centre' }, state.zoom);
  } else if (mode === 'fixed' && scope === 'local' && mpp > 1500) {
    const geo = geoTransform(displayCRS);
    if (geo.toGeoSync) {
      const ll = geo.toGeoSync(new Float64Array([state.centerX, state.centerY]));
      if (isFinite(ll[0]) && isFinite(ll[1])) {
        offer = 'See this on the globe?';
        switchAction = () => void chooseHemi(ll[1], ll[0]);
      }
    }
  }
  switchChip.hidden = !offer;
  setText(switchChip, offer);
}

function wireStart(): void {
  startCard = document.getElementById('start-card')!;
  startHint = document.getElementById('start-hint')!;
  startMsg = document.getElementById('start-msg')!;
  startPlaces = document.getElementById('start-places')!;
  scopeChip = document.getElementById('scope-chip') as HTMLButtonElement;
  crsChip = document.getElementById('crs-chip') as HTMLButtonElement;
  bgChip = document.getElementById('bg-chip') as HTMLSelectElement;
  switchChip = document.getElementById('switch-chip') as HTMLButtonElement;

  startCard.addEventListener('click', (e) => {
    const door = (e.target as HTMLElement).closest('[data-door]')?.getAttribute('data-door');
    if (!door) return;
    if (door === 'global') void chooseGlobal();
    else if (door === 'hemi-north') void chooseHemi(90);
    else if (door === 'hemi-south') void chooseHemi(-90);
    else if (door === 'hemi-here') void chooseHemi();
    else if (door === 'local-pick') startPicking();
    else if (door === 'local-me') {
      startMsg.textContent = 'Asking for your location...';
      deviceLocation().then(
        (p) => chooseLocal(p),
        (err) => {
          // No location: the typed place is the fallback.
          startMsg.textContent = `No location (${err.message}). Type a place, an address or coordinates above.`;
          (document.getElementById('start-place') as HTMLInputElement).focus();
        });
    } else if (door === 'data-file') {
      (document.getElementById('vector-file') as HTMLInputElement).click();
    }
  });
  document.getElementById('start-place-form')!.addEventListener('submit', (e) => {
    e.preventDefault();
    void findPlace((document.getElementById('start-place') as HTMLInputElement).value);
  });
  document.getElementById('start-url-form')!.addEventListener('submit', (e) => {
    e.preventDefault();
    const u = (document.getElementById('start-url') as HTMLInputElement).value.trim();
    if (u) void chooseData(u);
  });
  document.getElementById('start-close')!.addEventListener('click', hideStart);

  // Any touch of the map stops the spin; a click while picking is the place.
  let downX = 0, downY = 0;
  canvas.addEventListener('mousedown', (e) => { stopSpin(); downX = e.clientX; downY = e.clientY; });
  canvas.addEventListener('wheel', stopSpin, { passive: true });
  canvas.addEventListener('touchstart', stopSpin, { passive: true });
  canvas.addEventListener('mouseup', async (e) => {
    if (!picking || Math.hypot(e.clientX - downX, e.clientY - downY) > 4) return;
    const r = canvas.getBoundingClientRect();
    const p = await lonLatAt(e.clientX - r.left, e.clientY - r.top);
    if (p) await chooseLocal(p);
  });
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && picking) showStart(startOpen || scope === null);
  });

  scopeChip.addEventListener('click', () => showStart(false));
  crsChip.addEventListener('click', () => {
    document.getElementById('controls')!.classList.remove('collapsed');
    (document.getElementById('view-details') as HTMLDetailsElement).open = true;
  });
  bgChip.addEventListener('change', () => void setBackground(bgChip.value));
  switchChip.addEventListener('click', () => switchAction?.());

  coastlineInput = document.getElementById('coastline') as HTMLInputElement;
  coastlineInput.checked = showCoastline;
  coastlineInput.addEventListener('change', () => {
    showCoastline = coastlineInput.checked;
    layoutAllLayers();
    render(viewController.getState());
    scheduleRefresh(viewController.getState());
    scheduleUrlUpdate();
  });
}

/** `?scope=global&lon_0=150`, `?scope=hemi&at=lon,lat`, `?scope=local&at=lon,lat`. */
async function doorFromParams(params: URLSearchParams): Promise<boolean> {
  const at = (params.get('at') || '').split(',').map(Number);
  const hasAt = at.length === 2 && at.every(isFinite);
  const s = params.get('scope');
  if (s === 'global') {
    const l0 = parseFloat(params.get('lon_0') || '');
    await chooseGlobal(isFinite(l0) ? l0 : hasAt ? at[0] : 0);
    return true;
  }
  if (s === 'hemi') {
    if (hasAt) await chooseHemi(at[1], at[0]);
    else await chooseHemi();
    return true;
  }
  if (s === 'local' && hasAt) {
    await chooseLocal({ lon: at[0], lat: at[1], label: `${at[0]}, ${at[1]}` });
    return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const container = document.getElementById('app')!;
  urlInput = document.getElementById('cog-url') as HTMLInputElement;
  modeSelect = document.getElementById('mode') as HTMLSelectElement;
  fixedPanel = document.getElementById('fixed-panel')!;
  centredPanel = document.getElementById('centred-panel')!;
  displayCrsInput = document.getElementById('display-crs') as HTMLInputElement;
  extentInput = document.getElementById('extent') as HTMLInputElement;
  projSelect = document.getElementById('proj') as HTMLSelectElement;
  projTemplateInput = document.getElementById('proj-template') as HTMLInputElement;
  centreLonInput = document.getElementById('centre-lon') as HTMLInputElement;
  centreLatInput = document.getElementById('centre-lat') as HTMLInputElement;
  gridSizeInput = document.getElementById('grid-size') as HTMLInputElement;
  wireframeInput = document.getElementById('wireframe') as HTMLInputElement;
  wrapInput = document.getElementById('wrap') as HTMLInputElement;
  recentreSelect = document.getElementById('recentre') as HTMLSelectElement;
  engineSelect = document.getElementById('engine') as HTMLSelectElement;
  warpAlgSelect = document.getElementById('warp-alg') as HTMLSelectElement;
  warpScaleInput = document.getElementById('warp-scale') as HTMLInputElement;
  graticuleInput = document.getElementById('graticule') as HTMLInputElement;
  vertexCountEl = document.getElementById('vertex-count')!;
  infoEl = document.getElementById('info')!;
  layersEl = document.getElementById('layers')!;
  const loadBtn = document.getElementById('load-btn')!;
  const tilePresetSelect = document.getElementById('tile-preset') as HTMLSelectElement;
  for (const [name, preset] of Object.entries(TILE_PRESETS)) {
    const opt = document.createElement('option');
    opt.value = name;
    opt.textContent = preset.label;
    tilePresetSelect.appendChild(opt);
  }
  tilePresetSelect.addEventListener('change', () => {
    if (tilePresetSelect.value) {
      urlInput.value = TILE_PRESETS[tilePresetSelect.value].template;
      tilePresetSelect.value = '';
    }
  });
  const addBtn = document.getElementById('add-btn')!;
  const applyBtn = document.getElementById('apply-crs-btn')!;
  const panelToggle = document.getElementById('panel-toggle')!;

  // Populate preset select
  for (const [name, preset] of Object.entries(CENTRED_PRESETS)) {
    const opt = document.createElement('option');
    opt.value = name;
    opt.textContent = `${name} - ${preset.label}`;
    projSelect.appendChild(opt);
  }
  const custom = document.createElement('option');
  custom.value = 'custom';
  custom.textContent = 'custom template...';
  projSelect.appendChild(custom);

  // Canvas
  canvas = document.createElement('canvas');
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.style.cursor = 'grab';
  container.appendChild(canvas);

  // Vector layers draw here, above the WebGL map; pointer events go through.
  overlay = document.createElement('canvas');
  overlay.className = 'overlay';
  overlay.style.width = '100%';
  overlay.style.height = '100%';
  container.appendChild(overlay);
  overlayCtx = overlay.getContext('2d')!;

  function resizeCanvas() {
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.max(1, Math.round(rect.width * dpr));
    canvas.height = Math.max(1, Math.round(rect.height * dpr));
    overlay.width = canvas.width;
    overlay.height = canvas.height;
  }
  resizeCanvas();
  window.addEventListener('resize', () => {
    resizeCanvas();
    if (viewController) onViewChange(viewController.getState());
  });

  const glContext = canvas.getContext('webgl2', { antialias: true, alpha: false });
  if (!glContext) {
    infoEl.innerHTML = 'WebGL2 not supported';
    return;
  }
  gl = glContext;
  gratMinor = new LineRenderer(gl);
  gratMajor = new LineRenderer(gl);

  // State from URL, then mesh and view
  const params = new URLSearchParams(location.search);
  applyUrlParams(params);
  const initial = initialViewFromParams(params);
  // The display CRS may be an EPSG code from the URL (fixed mode, or a static
  // template in centred mode), so resolve it before anything tries to use it.
  const wantCRS = currentDisplayCRS();
  if (!await resolveCRS(wantCRS)) {
    alert(unknownCRSMessage(wantCRS));
    if (mode === 'centred') centredProj = 'ortho';
    else displayCRS = 'EPSG:3857';
  }
  regenerateMesh(initial);
  makeViewController(initial);
  syncUI();
  wireEditPanel();
  wireStart();

  // Wire up UI
  async function loadOrAdd(url: string, replace: boolean): Promise<void> {
    if (!url) return;
    // Vector data goes over the map: "load" replaces the vector layers and
    // leaves the rasters it would be drawn on.
    if (vectorFormatOf(url)) {
      if (replace) {
        if (anyUnsaved() && !confirm('Some vector layers have unsaved edits. Replace them anyway?')) return;
        clearVectorLayers();
      }
      await addVectorLayer(url);
      return;
    }
    if (isCapabilitiesUrl(url) && !splitCapabilitiesUrl(url).layer) {
      try {
        if (await openPicker(splitCapabilitiesUrl(url).url)) return;
      } catch (err) {
        alert(`Failed to read capabilities: ${err}`);
        return;
      }
    }
    if (replace) clearLayers();
    await addLayer(url);
  }
  loadBtn.addEventListener('click', () => loadOrAdd(urlInput.value.trim(), true));
  addBtn.addEventListener('click', () => loadOrAdd(urlInput.value.trim(), false));

  // WMTS picker
  pickerEl = document.getElementById('wmts-picker')!;
  pickerFilter = document.getElementById('wmts-filter') as HTMLInputElement;
  pickerLayer = document.getElementById('wmts-layer') as HTMLSelectElement;
  pickerTms = document.getElementById('wmts-tms') as HTMLSelectElement;
  pickerTimeRow = document.getElementById('wmts-time-row')!;
  pickerTime = document.getElementById('wmts-time') as HTMLInputElement;
  pickerTimeHint = document.getElementById('wmts-time-hint')!;
  pickerCount = document.getElementById('wmts-count')!;
  pickerFilter.addEventListener('input', () => fillPickerLayers(pickerUsableLayers()));
  pickerLayer.addEventListener('change', onPickerLayerChange);
  document.getElementById('wmts-load-btn')!.addEventListener('click', async () => {
    clearLayers();
    await addLayer(pickerSelectionUrl());
  });
  document.getElementById('wmts-add-btn')!.addEventListener('click', async () => {
    await addLayer(pickerSelectionUrl());
  });
  // Vector samples, files and drops
  const sampleSelect = document.getElementById('vector-sample') as HTMLSelectElement;
  for (const [name, sample] of Object.entries(VECTOR_SAMPLES)) {
    const opt = document.createElement('option');
    opt.value = name;
    opt.textContent = sample.label;
    sampleSelect.appendChild(opt);
  }
  sampleSelect.addEventListener('change', async () => {
    const sample = VECTOR_SAMPLES[sampleSelect.value];
    sampleSelect.value = '';
    if (sample) await addVectorLayer(sample.url);
  });
  const fileInput = document.getElementById('vector-file') as HTMLInputElement;
  document.getElementById('vector-file-btn')!.addEventListener('click', () => fileInput.click());
  const addFiles = async (files: FileList | File[]) => {
    // GeoTIFFs become local:<name> raster layers, read in place from disk;
    // any #fragment typed in the URL box is carried over, so
    // "#band=2&cmap=turbo" styles a file the way it styles a URL.
    const typed = urlInput.value.trim();
    const frag = typed.includes('#') ? typed.slice(typed.indexOf('#')) : '';
    const list: (string | File)[] = [];
    for (const f of Array.from(files)) list.push(await isTiffFile(f) ? registerLocalFile(f) + frag : f);
    // From the start card, the first file sets the view (its own CRS).
    if (!startCard.hidden && list.length) await chooseData(list.shift()!);
    let first = true;
    for (const f of list) {
      if (typeof f === 'string') {
        await addLayer(f);
      } else {
        await addVectorLayer(f, first);
        first = false;
      }
    }
  };
  fileInput.addEventListener('change', async () => {
    if (fileInput.files) await addFiles(fileInput.files);
    fileInput.value = '';
  });
  container.addEventListener('dragover', (e) => {
    e.preventDefault();
    container.classList.add('dropping');
  });
  container.addEventListener('dragleave', () => container.classList.remove('dropping'));
  container.addEventListener('drop', async (e) => {
    e.preventDefault();
    container.classList.remove('dropping');
    if (e.dataTransfer?.files.length) await addFiles(e.dataTransfer.files);
  });

  urlInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') loadBtn.click();
  });
  applyBtn.addEventListener('click', applyDisplaySettings);
  graticuleInput.addEventListener('change', () => {
    showGraticule = graticuleInput.checked;
    graticuleCRS = '';
    render(viewController.getState());
    scheduleUrlUpdate();
  });
  const refineInput = document.getElementById('refine') as HTMLInputElement;
  refineInput.addEventListener('change', () => {
    refineEdges = refineInput.checked;
    layoutAllLayers();
    const state = viewController.getState();
    render(state);
    scheduleRefresh(state);
    scheduleUrlUpdate();
  });
  wireframeInput.addEventListener('change', () => {
    showWireframe = wireframeInput.checked;
    render(viewController.getState());
    scheduleUrlUpdate();
  });
  (document.getElementById('link-btn') as HTMLButtonElement).addEventListener('click', shareLink);
  (document.getElementById('reset-btn') as HTMLButtonElement).addEventListener('click', resetAll);
  engineSelect.addEventListener('change', () => {
    engineKind = engineSelect.value as EngineKind;
    rebuildEngines();
    scheduleUrlUpdate();
  });
  warpAlgSelect.addEventListener('change', () => {
    warpAlg = warpAlgSelect.value as ResampleAlg;
    rebuildEngines();
    scheduleUrlUpdate();
  });
  warpScaleInput.addEventListener('change', () => {
    const v = parseFloat(warpScaleInput.value);
    if (isFinite(v) && v > 0) { warpScale = v; rebuildEngines(); scheduleUrlUpdate(); }
  });
  recentreSelect.addEventListener('change', () => {
    recentreMode = recentreSelect.value as RecentreMode;
    scheduleUrlUpdate();
  });
  wrapInput.addEventListener('change', () => {
    wrapWorld = wrapInput.checked;
    wrapCRS = '';
    graticuleCRS = '';
    layoutAllLayers();
    render(viewController.getState());
    updateUI();
    scheduleUrlUpdate();
  });
  modeSelect.addEventListener('change', () => {
    fixedPanel.hidden = modeSelect.value !== 'fixed';
    centredPanel.hidden = modeSelect.value !== 'centred';
  });
  projSelect.addEventListener('change', () => {
    projTemplateInput.hidden = projSelect.value !== 'custom';
    if (projSelect.value !== 'custom') {
      projTemplateInput.value = CENTRED_PRESETS[projSelect.value].template;
    }
  });
  gridSizeInput.addEventListener('input', () => {
    const size = parseInt(gridSizeInput.value) || 32;
    const verts = (size + 1) * (size + 1);
    vertexCountEl.textContent = `(${verts} verts)`;
    vertexCountEl.style.color = verts > MAX_VERTICES ? '#f66' : '#aaa';
  });
  layersEl.addEventListener('click', (e) => {
    const t = e.target as HTMLElement;
    const rm = t.getAttribute('data-remove');
    const fit = t.getAttribute('data-fit');
    const auto = t.getAttribute('data-auto');
    const minmax = t.getAttribute('data-minmax');
    const ndAuto = t.getAttribute('data-nodata-auto');
    const reset = t.getAttribute('data-reset');
    if (reset !== null) {
      const layer = layers.find(l => l.id === parseInt(reset));
      if (layer) resetScale(layer);
      return;
    }
    const vrm = t.getAttribute('data-vremove');
    const vfit = t.getAttribute('data-vfit');
    if (vrm !== null) { removeVectorLayer(parseInt(vrm)); return; }
    const vsave = t.getAttribute('data-vsave');
    if (vsave !== null) { void saveVectorLayer(parseInt(vsave), t.getAttribute('data-as') === 'geojson' ? 'geojson' : 'fgb'); return; }
    if (vfit !== null) {
      const v = vectorLayers.find(l => l.id === parseInt(vfit));
      if (v) fitBounds(v.engine.data.bounds, v.engine.data.crs);
      return;
    }
    if (rm !== null) removeLayer(parseInt(rm));
    if (fit !== null) {
      const layer = layers.find(l => l.id === parseInt(fit));
      if (layer) fitLayer(layer);
    }
    const id = auto ?? minmax ?? ndAuto;
    if (id !== null) {
      const layer = layers.find(l => l.id === parseInt(id));
      if (!layer) return;
      if (auto !== null) applyScale(layer, { auto: true });
      else if (minmax !== null) applyScale(layer, { minmax: true });
      else applyScale(layer, { nodataAuto: true, nodata: null });
      updateUI();
    }
  });
  layersEl.addEventListener('input', (e) => {
    const t = e.target as HTMLInputElement;
    const vid = t.getAttribute('data-valpha') ?? t.getAttribute('data-vfill') ?? t.getAttribute('data-vcolour');
    if (vid !== null) {
      const id = parseInt(vid);
      if (t.hasAttribute('data-valpha')) setVectorStyle(id, { opacity: parseFloat(t.value) });
      else if (t.hasAttribute('data-vfill')) setVectorStyle(id, { fillOpacity: parseFloat(t.value) });
      else setVectorStyle(id, { stroke: t.value });
      return;
    }
    const sid = t.getAttribute('data-shade-strength');
    if (sid !== null) {
      const layer = layers.find(l => l.id === parseInt(sid));
      if (layer) applyScale(layer, { shadeStrength: parseFloat(t.value) });
      return;
    }
    const id = t.getAttribute('data-alpha');
    if (id === null) return;
    const layer = layers.find(l => l.id === parseInt(id));
    if (!layer) return;
    layer.opacity = parseFloat(t.value);
    layer.engine.setStyle(styleOf(layer));
    const lbl = layersEl.querySelector(`[data-alpha-val="${layer.id}"]`);
    if (lbl) lbl.textContent = `${Math.round(layer.opacity * 100)}%`;
    render(viewController.getState());
    scheduleUrlUpdate();
  });
  layersEl.addEventListener('pointerdown', (e) => {
    const t = e.target as HTMLElement;
    const h = t.getAttribute('data-hist');
    if (h === null) return;
    const layer = layers.find(l => l.id === parseInt(h));
    if (layer) histogramPointer(layer, t as HTMLCanvasElement, e as PointerEvent);
  });
  layersEl.addEventListener('change', async (e) => {
    const t = e.target as HTMLInputElement | HTMLSelectElement;
    const get = (k: string) => t.getAttribute(k);
    const va = get('data-vactive');
    if (va !== null) {
      activeVectorId = parseInt(va);
      updateEditPanel();
      return;
    }
    const vw = get('data-vwidth');
    if (vw !== null) {
      const w = parseFloat(t.value);
      if (isFinite(w) && w > 0) setVectorStyle(parseInt(vw), { width: Math.min(20, w) });
      return;
    }
    const id = get('data-min') ?? get('data-max') ?? get('data-cmap') ?? get('data-curve') ??
               get('data-nodata') ?? get('data-band') ?? get('data-mode') ??
               get('data-shade') ?? get('data-zf') ?? get('data-az') ?? get('data-alt');
    if (id === null) return;
    const layer = layers.find(l => l.id === parseInt(id));
    if (!layer || !layer.scale) return;
    const cog = layer.source as COGSource;
    if (get('data-mode') !== null) {
      const mode = t.value as 'single' | 'rgb';
      const bands = mode === 'rgb' ? [0, 1, 2] : [cog.band];
      await changeBands(layer, mode, bands);
      return;
    }
    if (get('data-band') !== null) {
      const ch = parseInt(get('data-ch') || '0');
      const b = parseInt(t.value) - 1;
      if (layer.scale.mode === 'rgb' && cog.rgbBands) {
        const bands = [...cog.rgbBands];
        bands[ch] = b;
        await changeBands(layer, 'rgb', bands);
      } else {
        await changeBands(layer, 'single', [b]);
      }
      return;
    }
    if (get('data-cmap') !== null) {
      applyScale(layer, { cmap: t.value });
      updateUI();   // pinned palettes change min/max and disable inputs
      return;
    }
    if (get('data-curve') !== null) {
      applyScale(layer, { curve: t.value as Curve });
      return;
    }
    if (get('data-shade') !== null) {
      applyScale(layer, { shade: (t as HTMLInputElement).checked });
      return;
    }
    if (get('data-zf') !== null || get('data-az') !== null || get('data-alt') !== null) {
      const v = parseFloat(t.value);
      if (!isFinite(v)) return;
      if (get('data-zf') !== null) applyScale(layer, { zfactor: v });
      else if (get('data-az') !== null) applyScale(layer, { azimuth: v });
      else applyScale(layer, { altitude: v });
      return;
    }
    if (get('data-nodata') !== null) {
      const txt = t.value.trim();
      const v = txt === '' ? null : parseFloat(txt);
      if (v !== null && !isFinite(v)) return;
      applyScale(layer, { nodata: v, nodataAuto: false });
      updateUI();
      return;
    }
    const v = parseFloat(t.value);
    if (!isFinite(v)) return;
    applyScale(layer, get('data-min') !== null ? { min: v, auto: false } : { max: v, auto: false });
    drawHistogram(layer);
  });
  panelToggle.addEventListener('click', () => {
    document.getElementById('controls')!.classList.toggle('collapsed');
  });

  void loadCoastline();
  // No parameters at all: the start card, over a turning globe.
  if (params.toString() === '') {
    showStart(true);
    startSpin();
    await setBackground(backgroundFor(centreLat));
    console.log('Viewer ready!');
    return;
  }
  // A scope with no view: the start card's choice, made by the link.
  if (!params.has('mode') && params.has('scope') && await doorFromParams(params)) {
    console.log('Viewer ready!');
    return;
  }
  // Otherwise the view the link describes, with its layers. A background
  // preset among them is the one the top bar controls.
  const urls = params.getAll('url');
  urlInput.value = urls[0] ?? '';
  for (const u of urls) {
    if (vectorFormatOf(u)) {
      await addVectorLayer(u);
      continue;
    }
    const layer = await addLayer(u);
    const key = layer && backgroundId === null ? backgroundKeyOf(u.split('#')[0]) : null;
    if (layer && key) {
      layers = [layer, ...layers.filter(l => l !== layer)];
      backgroundId = layer.id;
      backgroundKey = key;
      bgChip.value = key;
    }
  }
  if (urls.length === 0) await setBackground(backgroundFor(mode === 'centred' ? centreLat : 0));
  else if (backgroundId === null) bgChip.value = 'none';

  console.log('Viewer ready!');
}

main().catch(console.error);
