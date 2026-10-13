/**
 * The seam between the viewer shell and whatever actually draws a layer.
 *
 * The shell owns the view, the layer list, styling state and the UI. An
 * engine owns one layer's pixels: it reads from a RasterSource and puts
 * something on the screen for the current view. Two engines are envisaged:
 *
 *   mesh   Source stays in its own CRS as a texture; a screen-aligned grid
 *          carries the reprojection in its UVs, interpolated by the GPU.
 *          Approximate, no resampling, free while panning.
 *
 *   warp   A real warp (rwarp/GDAL pipeline in wasm) resamples the source
 *          into a raster on the display grid, drawn as a single quad.
 *          Exact and resampled, but costs work per view change.
 *
 * Both read through the same RasterSource and are styled by the same Style,
 * so everything above this interface - palettes, rescaling, hillshade,
 * nodata, alpha, the layer list, URL state - is engine-agnostic.
 *
 * The three verbs are separated by what they cost:
 *   layout()   every view change; cheap (mesh: recompute UVs)
 *   refresh()  debounced; may fetch or warp
 *   draw()     every frame
 */

import { GridMesh } from './mesh';
import { RasterSource, FloatStats } from '../core/source';
import { WrapSpec } from '../core/wrap';
import { ResampleAlg } from '../core/warp';

export type Curve = 'linear' | 'sqrt' | 'log';

/** What the shell is looking at, in display space. */
export interface View {
  /** Display CRS, already instantiated (never a {lon_0} template). */
  crs: string;
  /** Camera centre in display CRS units. */
  centreX: number;
  centreY: number;
  /** log2 of screen pixels per display unit. */
  zoom: number;
  /** Canvas size in CSS pixels. */
  width: number;
  height: number;
}

/**
 * A view plus the screen-aligned grid the shell built for it, in display
 * coordinates. An engine that builds its own geometry ignores the grid.
 */
export interface RenderContext {
  view: View;
  grid: GridMesh;
  /** Repeat the world along this vector, or null for one copy only. */
  wrap: WrapSpec | null;
  /**
   * Once the view settles, refine the grid where it is not good enough
   * (the edge of the map, poles, strong curvature): engine/refine.ts.
   * wgis divergence from ortho-cog-viewer (d352f7e).
   */
  refine?: boolean;
}

/**
 * How a layer is turned into colour. Every field is a shader uniform in the
 * mesh engine, which is why changing any of them costs nothing.
 */
export interface Style {
  mode: 'single' | 'rgb';
  min: number;
  max: number;
  cmap: string;
  curve: Curve;
  nodata: number | null;
  shade: boolean;
  shadeStrength: number;
  zfactor: number;
  azimuth: number;
  altitude: number;
  opacity: number;
}

export function defaultStyle(): Style {
  return {
    mode: 'single', min: 0, max: 1, cmap: 'viridis', curve: 'linear',
    nodata: null, shade: false, shadeStrength: 0.6, zfactor: 1,
    azimuth: 315, altitude: 45, opacity: 1
  };
}

/** What the shell needs to report about a layer. */
export interface EngineStatus {
  hasTexture: boolean;
  loading: boolean;
  /** index into source.levels, or -1 */
  level: number;
  /** pixel dimensions of what is on the GPU, for display */
  textureSize: string;
  /** fraction of the view's vertices that landed on the globe */
  validFraction: number;
  /** statistics of the numeric data currently loaded, if any */
  stats: FloatStats | null;
  /**
   * A line for the layer's caption, if the engine has something to say
   * (the warp engine: which backend, how long, or why not).
   * wgis divergence from ortho-cog-viewer.
   */
  detail?: string;
}

/**
 * The warp engine's settings, which the shell holds and the link carries.
 * wgis divergence from ortho-cog-viewer: defined here, not in
 * warpEngine.ts, so the seam can pass them without naming an engine.
 */
export interface WarpOptions {
  alg: ResampleAlg;
  /** warp pixels per screen pixel: 1 is exact, 0.5 is four times faster */
  scale: number;
  prefer: 'rwarp' | 'reference';
  /** approximate-transformer threshold in source pixels; 0 is exact */
  maxError: number;
}

/**
 * What the shell drives on every layer, raster or vector: the three verbs
 * and the housekeeping around them. `Surface` is what draw() puts pixels
 * on: nothing for the raster engines, which hold their WebGL context, a 2D
 * canvas context for the vector engine (vector/vectorEngine.ts).
 *
 * wgis divergence from ortho-cog-viewer: upstream has LayerEngine alone;
 * wgis splits out this part so the vector engine sits behind the same seam
 * without a raster source.
 */
export interface EngineSeam<Surface = void, Status = EngineStatus> {
  readonly kind: string;

  /** Recompute geometry for this view. Called on every view change. */
  layout(ctx: RenderContext): void;

  /**
   * Ensure what is drawn suits this view. Debounced by the shell. May
   * resolve true when the result wants a redraw the engine did not ask for.
   */
  refresh(ctx: RenderContext): Promise<boolean | void>;

  /** Drop cached results so the next layout or refresh makes them again. */
  invalidate(): void;

  draw(ctx: RenderContext, surface: Surface): void;

  status(): Status;
  dispose(): void;
}

/** A raster layer's engine: the seam, plus a source, a style and a wireframe. */
export interface LayerEngine extends EngineSeam<void, EngineStatus> {
  readonly source: RasterSource;

  /** Uniforms only; never refetches. */
  setStyle(style: Style): void;

  /** Ensure the pixels on the GPU suit this view. Debounced by the shell. */
  refresh(ctx: RenderContext): Promise<void>;

  /** Drop cached pixels so the next refresh() reads again (band changes). */
  invalidate(): void;

  draw(ctx: RenderContext): void;
  drawWireframe(ctx: RenderContext, colour: [number, number, number, number]): void;

  /**
   * New settings from the shell, for an engine that has any (the warp
   * engine); the shell calls it on every engine of the current kind
   * rather than asking which kind it is. wgis divergence from
   * ortho-cog-viewer.
   */
  setOptions?(opts: WarpOptions): void;
}
