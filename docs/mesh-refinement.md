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

- Start from the regular grid. Split a cell in four when linear
  interpolation is off by more than half a screen pixel at the cell's
  centre or edge midpoints, when its texture coordinates wrap more than
  half way round (a pole in a 360-degree texture), or when the edge of
  the map crosses it and is not straight there (next section). The error
  is measured in screen pixels: the difference between the interpolated
  and true texture coordinate, taken back to display space through the
  cell's Jacobian.
- Stop at cells about 2 screen pixels across. Leaf triangles that
  straddle the edge are clipped where their edges cross it, found by
  bisection to a quarter pixel, so the edge is a smooth polyline, not a
  staircase. Crossings are shared by neighbouring triangles.
- T-junctions between a split cell and an unsplit neighbour leave no
  gaps, because the mesh is planar; the texture along such an edge differs
  by less than the error tolerance, which the edge-midpoint test bounds.
- Only cells meeting the view (plus a margin) are refined, so a fixed view
  zoomed into a large extent does not refine off-screen edges.
- Work is batched level by level. The refinement is a generator that
  yields batches of display points and is handed back their transforms,
  so the same code runs synchronously under proj4js and as a few worker
  round trips under PROJ.

## What counts as "the edge"

The first version split every cell the edge of the map crossed down to
2 pixels. That is right for the limb of a globe, but "edge" means
different things in different CRSs, and an oblique Mercator showed it:
dense straight lines of refinement across the map. The mesh sees only
where display points stop round-tripping through lon/lat, and that
happens at

| kind | example | shape | what it needs |
|---|---|---|---|
| the Earth's outline | limb of ortho, tpers; outline of sinu, eqearth, wintri | curved | refine to a pixel, clip |
| a cut, where the map would carry on in another copy | top and bottom of omerc (its strip repeats along the centre line) | straight | clip a coarse cell; no refinement |
| an interruption | the notches between igh's lobes | curved | as the outline |
| a hole inside the map | a sliver of failed points | small | refine |
| the source texture's own edge (no round-trip failure at all) | Web Mercator stops at 85 degrees; a COG covering part of the world | the shader discards beyond it | nothing beyond it needs refining |
| a kink inside the map, not an edge | igh's join between sinusoidal and Mollweide at 40.7 degrees | straight | ordinary error refinement, already right |
| strong curvature near a singular point, not an edge | the poles of a Web Mercator texture in omerc, where meridians fan out | blobs round the pole | ordinary error refinement, already right |

So a cell the edge crosses is now handled like this: walk round its
corners and edge midpoints; if the edge goes in and out once, find where
it meets the cell's sides by bisection, then probe a quarter pixel either
side of the middle of the chord between those. If the boundary passes
between the probes, every other point of the cell is on the side of the
chord it should be, and the texture over the part on the map fits an
affine map to within half a pixel, the cell is kept whole and clipped
along the chord. Otherwise it is split as before.

Error is measured on texture coordinates clamped to the texture, because
the shader draws nothing outside it, and triangles wholly outside the
texture are dropped. Inside a Web Mercator texture's 85-degree circle
there is then nothing to refine.

Tracing is available through the `trace` option
of `refineLayerGeometry`: it is told every split cell and the reason.
`why-split-om.png` and `why-split-igh.png` in the project files show
it for the oblique Mercator and the homolosine.

While checking omerc we also found a proj4js bug: its oblique Mercator
forward does not bring the longitude within 180 degrees of the centre
line, as PROJ does, and on the ellipsoid its formula is not periodic. A
longitude on the far side (west of -122 with lonc=58) landed up to about
100 km from where the inverse puts it, so coastlines and graticule drew
off the imagery there. `src/core/projections.ts` now normalises first.

In wgis the coarse grid is still used while the view moves (it is cheap
and changes every frame). The refined mesh replaces it when the view
settles, in the engine's debounced refresh. "refine edges" in the view
settings turns it off (`refine=0` in a link).

## Measurements

From `pnpm check-mesh`: a global lon/lat texture (a Web Mercator one for
the oblique Mercator) on a 1000 x 800 canvas with the whole map in view, sampled every 2 pixels. "Edge missed" is the
share of on-map pixels no triangle covers. The error is how far the
texture is drawn from its true place, found by taking each sample's
interpolated texture coordinate back through both CRSs. Times are
single-threaded Node, which is close to the browser's V8.

| projection | mesh | triangles | ms | edge missed | p99 err (px) | max err (px) |
|---|---|---|---|---|---|---|
| orthographic | grid 64 | 3761 | 22 | 4.74% | 1.89 | 14.02 |
| orthographic | grid 128 | 15427 | 25 | 2.30% | 0.67 | 6.39 |
| orthographic | grid 256 | 62709 | 58 | 1.15% | 0.21 | 2.93 |
| orthographic | refined 64 | 12111 | 76 | 0.05% | 0.42 | 2.42 |
| orthographic, south pole | grid 64 | 3761 | 4 | 4.74% | 1.57 | 7.39 |
| orthographic, south pole | grid 128 | 15427 | 14 | 2.30% | 0.58 | 5.83 |
| orthographic, south pole | grid 256 | 62709 | 56 | 1.15% | 0.18 | 1.34 |
| orthographic, south pole | refined 64 | 10871 | 55 | 0.05% | 0.44 | 2.29 |
| tilted perspective | grid 64 | 3714 | 25 | 3.40% | 1.36 | 4.80 |
| tilted perspective | grid 128 | 15128 | 36 | 1.65% | 0.52 | 2.41 |
| tilted perspective | grid 256 | 61343 | 139 | 0.73% | 0.17 | 1.15 |
| tilted perspective | refined 64 | 8609 | 97 | 0.04% | 0.41 | 2.14 |
| Equal Earth | grid 64 | 3182 | 14 | 5.20% | 0.68 | 0.77 |
| Equal Earth | grid 128 | 13158 | 33 | 1.95% | 0.50 | 0.94 |
| Equal Earth | grid 256 | 53392 | 132 | 1.23% | 0.14 | 0.34 |
| Equal Earth | refined 64 | 6242 | 51 | 0.03% | 0.40 | 1.62 |
| Winkel Tripel | grid 64 | 3088 | 29 | 5.63% | 0.78 | 1.39 |
| Winkel Tripel | grid 128 | 12706 | 89 | 2.91% | 0.22 | 0.43 |
| Winkel Tripel | grid 256 | 52034 | 329 | 0.86% | 0.06 | 0.12 |
| Winkel Tripel | refined 64 | 5394 | 123 | 0.04% | 0.36 | 0.71 |
| sinusoidal | grid 64 | 2328 | 12 | 6.38% | 2.37 | 6.82 |
| sinusoidal | grid 128 | 9624 | 18 | 3.23% | 0.72 | 3.07 |
| sinusoidal | grid 256 | 39372 | 50 | 1.62% | 0.22 | 1.14 |
| sinusoidal | refined 64 | 9618 | 47 | 0.05% | 0.44 | 2.31 |
| interrupted homolosine | grid 64 | 2258 | 18 | 9.56% | 1.65 | 13.71 |
| interrupted homolosine | grid 128 | 9486 | 47 | 4.96% | 0.61 | 12.84 |
| interrupted homolosine | grid 256 | 39122 | 200 | 2.53% | 0.16 | 2.67 |
| interrupted homolosine | refined 64 | 6731 | 102 | 0.11% | 0.43 | 6.98 |
| oblique Mercator, Web Mercator source | grid 64 | 6187 | 15 | 1.19% | 0.81 | 6.93 |
| oblique Mercator, Web Mercator source | grid 128 | 24895 | 29 | 0.61% | 0.21 | 1.17 |
| oblique Mercator, Web Mercator source | grid 256 | 100356 | 100 | 0.28% | 0.05 | 1.17 |
| oblique Mercator, Web Mercator source | refined 64 | 10121 | 55 | 0.01% | 0.41 | 1.17 |

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
  not refined to a pixel; the shader discards beyond it, so it is as
  sharp as the interpolated texture coordinate there. Clipping to the
  footprint the way the map's edge is clipped would sharpen that too.
- An oblique Mercator's strip repeats along its centre line; the map
  could repeat there as `wrap` repeats a cylindrical map sideways.
