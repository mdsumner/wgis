/**
 * Layer CRS -> display CRS for vector vertices, with the same validity test
 * the mesh and graticule use: a point is on the map if it projects and its
 * round trip through the display CRS comes home. Points that fail are NaN.
 *
 * Both sides go through lon/lat with geoTransform(), so either may be a CRS
 * only PROJ in wasm executes; when both are proj4js the projector is also
 * available synchronously, which is what lets a layout finish in the frame
 * that asked for it.
 */

import { geoTransform, GeoTransform } from '../core/transform';

export interface Projector {
  /** Present when both CRSs run on proj4js. */
  sync?: (layerXY: Float64Array) => Float64Array;
  async: (layerXY: Float64Array) => Promise<Float64Array>;
}

function screen(d: Float64Array, back: Float64Array, tol2: number): Float64Array {
  for (let i = 0; i < d.length; i += 2) {
    const ex = back[i] - d[i], ey = back[i + 1] - d[i + 1];
    if (!(ex * ex + ey * ey <= tol2)) { d[i] = NaN; d[i + 1] = NaN; }
  }
  return d;
}

/**
 * @param roundTripTol display units; a point whose round trip lands farther
 *   away than this is treated as off the map.
 */
export function makeProjector(layerCRS: string, displayCRS: string, roundTripTol: number): Projector {
  if (layerCRS.trim() === displayCRS.trim()) {
    const id = (xy: Float64Array) => Float64Array.from(xy);
    return { sync: id, async: async (xy) => id(xy) };
  }
  const layer: GeoTransform = geoTransform(layerCRS);
  const disp: GeoTransform = geoTransform(displayCRS);
  const tol2 = roundTripTol * roundTripTol;
  const projector: Projector = {
    async: async (xy) => {
      const d = await disp.fromGeo(await layer.toGeo(xy));
      const back = await disp.fromGeo(await disp.toGeo(d));
      return screen(d, back, tol2);
    }
  };
  if (layer.toGeoSync && disp.fromGeoSync && disp.toGeoSync) {
    const toGeo = layer.toGeoSync, fromGeo = disp.fromGeoSync, dispToGeo = disp.toGeoSync;
    projector.sync = (xy) => {
      const d = fromGeo(toGeo(xy));
      return screen(d, fromGeo(dispToGeo(d)), tol2);
    };
  }
  return projector;
}
