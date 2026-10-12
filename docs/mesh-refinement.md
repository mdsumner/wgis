# Refining the display mesh at the edge of the map

12 October 2026. Why a regular grid is not enough for globes and world
projections, what refining it costs and buys, and how wgis does it
(`src/engine/refine.ts`, checked by `pnpm check-mesh`).

## The problem

The mesh engine draws a raster in another CRS by laying a regular grid
over the screen, inverse-projecting each vertex to a texture coordinate,
and letting the GPU interpolate linearly inside each triangle. Two things
go wrong where the projection is hardest:

1. **The edge of the map.** A triangle is drawn only if all three
   vertices are on the map (the display -> lon/lat -> display round trip
   comes back). At the limb of a globe or the outline of a world
   projection that leaves a staircase up to a cell deep: with a 64 grid,
   2 to 6 percent of the map's pixels are not drawn at all.
2. **Curvature.** Near the limb of an orthographic or perspective view,
   and towards the outline of sinusoidal or Equal Earth, the mapping
   bends sharply inside a cell, so the linearly interpolated texture lands
   several pixels from where it belongs.

A finer grid helps both, but slowly and expensively: 256 still misses
about 1 percent of the edge, and costs 16 times the transforms everywhere,
including the flat middle of the map that never needed them.

## The approach

Refine only where needed, and finish the edge exactly:

- Start from the regular grid. Split a cell in four when its corners are
  partly on and partly off the map, when its texture coordinates wrap
  more than half way round (a pole in a 360-degree texture), or when
  linear interpolation is off by more than half a screen pixel at the
  cell's centre or edge midpoints. The error is measured in screen pixels:
  the difference between the interpolated and true texture coordinate,
  taken back to display space through the cell's Jacobian.
- Stop at cells about 2 screen pixels across. Leaf triangles that
  straddle the edge are clipped where their edges cross it, found by
  bisection (6 steps), so the edge is a smooth polyline, not a staircase.
  Crossings are shared by neighbouring triangles.
- T-junctions between a split cell and an unsplit neighbour leave no
  gaps, because the mesh is planar; the texture along such an edge differs
  by less than the error tolerance, which the edge-midpoint test bounds.
- Only cells meeting the view (plus a margin) are refined, so a fixed view
  zoomed into a large extent does not refine off-screen edges.
- Work is batched level by level. The refinement is a generator that
  yields batches of display points and is handed back their transforms,
  so the same code runs synchronously under proj4js and as a few worker
  round trips under PROJ.

In wgis the coarse grid is still used while the view moves (it is cheap
and changes every frame). The refined mesh replaces it when the view
settles, in the engine's debounced refresh. "refine edges" in the view
settings turns it off (`refine=0` in a link).

## Measurements

From `pnpm check-mesh`: a global lon/lat texture on a 1000 x 800 canvas
with the whole map in view, sampled every 2 pixels. "Edge missed" is the
share of on-map pixels no triangle covers. The error is how far the
texture is drawn from its true place, found by taking each sample's
interpolated texture coordinate back through both CRSs. Times are
single-threaded Node, which is close to the browser's V8.

| projection | mesh | triangles | ms | edge missed | p99 err (px) | max err (px) |
|---|---|---|---|---|---|---|
| orthographic | grid 64 | 3761 | 20 | 4.74% | 1.89 | 14.02 |
| orthographic | grid 128 | 15427 | 28 | 2.30% | 0.67 | 6.39 |
| orthographic | grid 256 | 62709 | 49 | 1.15% | 0.21 | 2.93 |
| orthographic | refined 64 | 12421 | 65 | 0.01% | 0.42 | 2.42 |
| orthographic, south pole | grid 64 | 3761 | 4 | 4.74% | 1.57 | 7.39 |
| orthographic, south pole | grid 128 | 15427 | 15 | 2.30% | 0.58 | 5.83 |
| orthographic, south pole | grid 256 | 62709 | 46 | 1.15% | 0.18 | 1.34 |
| orthographic, south pole | refined 64 | 11557 | 41 | 0.00% | 0.42 | 2.29 |
| tilted perspective | grid 64 | 3714 | 14 | 3.40% | 1.36 | 4.80 |
| tilted perspective | grid 128 | 15128 | 33 | 1.65% | 0.52 | 2.41 |
| tilted perspective | grid 256 | 61343 | 135 | 0.73% | 0.17 | 1.15 |
| tilted perspective | refined 64 | 9059 | 66 | 0.01% | 0.41 | 1.26 |
| Equal Earth | grid 64 | 3182 | 14 | 5.20% | 0.68 | 0.77 |
| Equal Earth | grid 128 | 13158 | 33 | 1.95% | 0.50 | 0.94 |
| Equal Earth | grid 256 | 53392 | 147 | 1.23% | 0.14 | 0.34 |
| Equal Earth | refined 64 | 7978 | 44 | 0.00% | 0.39 | 1.62 |
| Winkel Tripel | grid 64 | 3088 | 37 | 5.63% | 0.78 | 1.39 |
| Winkel Tripel | grid 128 | 12706 | 82 | 2.91% | 0.22 | 0.43 |
| Winkel Tripel | grid 256 | 52034 | 370 | 0.86% | 0.06 | 0.12 |
| Winkel Tripel | refined 64 | 8120 | 107 | 0.01% | 0.35 | 0.49 |
| sinusoidal | grid 64 | 2328 | 14 | 6.41% | 2.37 | 6.82 |
| sinusoidal | grid 128 | 9624 | 15 | 3.25% | 0.72 | 3.07 |
| sinusoidal | grid 256 | 39372 | 63 | 1.64% | 0.22 | 1.14 |
| sinusoidal | refined 64 | 11448 | 74 | 0.07% | 0.42 | 2.31 |

The refined 64 mesh covers the edge to within a pixel and keeps the 99th
percentile error under half a pixel in every case, with fewer triangles
than a 128 grid. A 256 grid is sharper in the interior (its cells are
smaller than the half-pixel tolerance needs) but still leaves about 1
percent of the edge undrawn, and costs more than refinement for the
projections with expensive inverses (tilted perspective, Equal Earth,
Winkel Tripel). The remaining maximum errors of 1 to 2 pixels sit in the
last pixel at the edge, where a sample can interpolate to just beyond it.

## Using this elsewhere

`refine.ts` depends only on a display transform (lon/lat both ways), a
source transform (proj4), and the grid's bounds and size. It is meant to
be lifted into ortho-cog-viewer as is: that project has the same
`uv.ts` and `LayerGeometry`.

Things not done yet:

- The display-side transforms are the same for every layer in a view;
  computing them once and sharing them would divide the cost by the
  number of layers.
- The refinement could run in a worker, and could run while the view
  moves at a coarser tolerance.
- A raster source's own edge (a COG that covers part of the world) is
  not refined; its texture simply stops. Clipping to the source's
  footprint the same way would sharpen that too.
