/**
 * The pointer in a layer's CRS: screen -> display -> lon/lat -> layer CRS.
 *
 * This is the one place that step is made (foundations call E). Everything
 * the editor stores comes through pointerToLayer, so a different way of
 * picking (a ray onto 3D terrain, then the inverse projection) replaces
 * this file and nothing else.
 *
 * The display's validity test applies: a point is on the map only if its
 * round trip through the display CRS comes home, so a click off the edge of
 * the world gives null rather than a position.
 */

import { RenderContext } from '../engine/types';
import { copyIndex } from '../core/wrap';
import { geoTransform } from '../core/transform';

/** What the pointer step needs of a render context. */
export type PointerContext = Pick<RenderContext, 'view' | 'wrap'>;

/** Screen (CSS pixels) to display, reduced into the base copy of the world. */
export function screenToDisplay(ctx: PointerContext, sx: number, sy: number): [number, number] {
  const v = ctx.view;
  const s = Math.pow(2, v.zoom);
  let x = v.centreX + (sx - v.width / 2) / s;
  let y = v.centreY - (sy - v.height / 2) / s;
  if (ctx.wrap) {
    const k = copyIndex(ctx.wrap, x, y);
    x -= k * ctx.wrap.tx;
    y -= k * ctx.wrap.ty;
  }
  return [x, y];
}

/**
 * A screen point in a layer's CRS, or null when it is off the map or has
 * no position there. Answers at once when proj4js runs both CRSs, and with
 * a Promise when PROJ in wasm has to.
 */
export function pointerToLayer(ctx: PointerContext, sx: number, sy: number, crs: string):
  Float64Array | null | Promise<Float64Array | null> {
  const [x, y] = screenToDisplay(ctx, sx, sy);
  if (crs.trim() === ctx.view.crs.trim()) return Float64Array.of(x, y);
  const xy = Float64Array.of(x, y);
  const d = geoTransform(ctx.view.crs), l = geoTransform(crs);
  const tol = 2 / Math.pow(2, ctx.view.zoom);
  // On the map: the round trip comes home, and (since a lon/lat display is
  // the identity beyond the poles and passes that test) on the Earth.
  const onMap = (ll: Float64Array, back: Float64Array) =>
    Math.abs(ll[1]) <= 90 && isFinite(ll[0]) && Math.hypot(back[0] - x, back[1] - y) <= tol;
  const finite = (p: Float64Array) => (isFinite(p[0]) && isFinite(p[1]) ? p : null);
  if (d.toGeoSync && d.fromGeoSync && l.fromGeoSync) {
    const ll = d.toGeoSync(xy);
    return onMap(ll, d.fromGeoSync(ll)) ? finite(l.fromGeoSync(ll)) : null;
  }
  return (async () => {
    const ll = await d.toGeo(xy);
    return onMap(ll, await d.fromGeo(ll)) ? finite(await l.fromGeo(ll)) : null;
  })();
}
