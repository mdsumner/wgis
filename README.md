# wgis

A web-based GIS where every layer keeps its own CRS and the map can be
drawn in any of them. Raster and vector are peers; the first target is
opening layers over a background and drawing new vector features.

Design notes are in `docs/` (start with `docs/foundations.md`).

## What works now

**Rasters**, from [ortho-cog-viewer](https://github.com/mdsumner/ortho-cog-viewer)
(copied in at 3e00588): COGs, XYZ and WMTS tile pyramids in any CRS,
reprojected on the GPU into any display CRS, in a *fixed* view (a static
CRS with a camera over it) or a *centred* one (the projection centre
follows the view, so azimuthal projections spin like a globe). That
project's README documents the raster side in full.

**Vectors**: GeoJSON, FlatGeobuf and GeoParquet, from a URL, a file
picked with "open file", or files dropped on the map.

- Features stay in the CRS the file states: the FlatGeobuf header, the
  GeoParquet `geo` metadata (PROJJSON; no `crs` key means lon/lat), or a
  legacy GeoJSON `crs` member. A `#crs=` fragment on a URL overrides the
  file. A file that states nothing is taken as lon/lat and marked
  `[assumed]` in the layer list.
- An edge is straight in the layer's CRS. To draw it in the display CRS
  it is halved until its projected midpoint is within half a screen pixel
  of the drawn chord, so a parallel in lon/lat comes out as a circle on a
  polar map, and a straight line in polar stereographic bends on a globe.
- The same halving finds where a line leaves the map: lines stop at the
  horizon of a globe and are cut at the antimeridian of a world
  projection instead of crossing it.
- Vector layers go in the shareable link (the "link" button) with their
  colour, opacity and fill. Local files cannot.

**Drawing and editing**, in each layer's own CRS (the Edit panel):

- Modes: *select* (click, shift-click to add, drag a selected feature to
  move it), *point*, *line*, *polygon* (click vertices; double-click or
  Enter finishes, Backspace takes one back, Esc cancels) and *vertices*
  (drag a vertex, drag an edge midpoint to add one, Alt-click or Delete
  to remove one). Panning works in every mode: a drag is a pan, a click is
  a click.
- Drawing goes into the *active* layer (the radio button in the layer
  list), or a new temporary layer if there is none. "new layer" makes an
  empty temporary layer in any CRS (blank means the map's CRS in a fixed
  view, lon/lat in a centred one).
- A click is taken back from the display to lon/lat to the layer CRS, and
  stored there. Edges are straight in the layer CRS, so a line drawn into
  an EPSG:3031 layer on a lon/lat map bends as you draw it, and stays the
  same line when the view changes projection.
- Undo and redo (Ctrl+Z, Ctrl+Y) for every edit, attributes included.
  Selected features show their attributes, which can be edited, added and
  removed.
- **Copy and paste, after Manifold.** Copied features keep their CRS.
  Paste (Ctrl+V) puts them into the active layer, converted to its CRS;
  "paste as layer" (Ctrl+Shift+V) makes a new temporary layer in the CRS
  they came from. With "paste keeps shape" on (the default) every edge is
  densified so the pasted shape is the same shape in the new CRS; off,
  only the vertices move and the edges become straight in the target.
  Parts with no place in the target (a ring around the pole, pasted into
  lon/lat) are left out and counted. Copy also puts lon/lat GeoJSON on the
  system clipboard, and GeoJSON pasted from elsewhere comes in the same way.
- **Saving**: each layer has ".fgb" (FlatGeobuf in the layer's own CRS)
  and ".geojson" (lon/lat). Edited layers are marked in the list, and
  leaving the page with unsaved edits asks first.

The "samples..." menu has one small file per format, each in a different
CRS, plus two remote files (Natural Earth coastline, FlatGeobuf's test
countries). Some links:

- [Samples on a globe over the AAT](https://mdsumner.github.io/wgis/?mode=centred&proj=ortho&center=110,-70&zoom=-14.5&url=./samples/polar-box-3031.fgb&url=./samples/lonlat-lines.parquet&url=./samples/tasmania-mga55.geojson)
- [Polar square (EPSG:3031) in plain lon/lat](https://mdsumner.github.io/wgis/?mode=fixed&crs=EPSG:4326&extent=-180,180,-90,90&url=./samples/polar-box-3031.fgb)
- [Coastline in Robinson centred on 150E](https://mdsumner.github.io/wgis/?mode=centred&proj=robin&center=150,0&zoom=-16.3&url=https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_coastline.geojson)

(These work once GitHub Pages serves the `gh-pages` branch: Settings >
Pages > Source, "Deploy from a branch", `gh-pages`, root.
`.github/workflows/pages.yml` builds `main` into that branch's root, and
`.github/workflows/preview.yml` builds every pull request into
`pr-preview/pr-<number>/`, comments the link on the PR, and removes it
when the PR closes.)

## Limits, for now

- Whole files are read. bbox-limited reads (FlatGeobuf's index,
  GeoParquet row groups) are next for big remote data.
- A polygon cut by the horizon or a projection break is drawn as its
  outline, without fill.
- Vectors are drawn with Canvas 2D. Layers over 5,000 vertices are thinned
  while the view moves and redrawn in full when it settles.
- GeoParquet geometry must be WKB (not the native GeoArrow encodings).
- No styling by attribute, and no identify beyond selecting.
- Editing: no snapping, no holes or multi-part drawing (they survive
  editing when they come from a file), and temporary layers live only in
  the tab until saved.
- FlatGeobuf records a CRS only as an EPSG code; saving a layer in any
  other CRS says so.

## Run it

    pnpm install
    pnpm dev            # or: pnpm build && pnpm preview

## Checks

    pnpm check-vector   # readers, densification, paste and saves, held to PROJ (wasm)
    pnpm check-warp     # raster warp, from ortho-cog-viewer
    pnpm samples        # regenerate public/samples/

`check-vector` densifies lines with wgis (proj4js) and then checks every
drawn segment with PROJ: back to the layer CRS, half way along, forward
again, and how far that lands from the chord. Cases include a parallel on
polar stereographic, a line through the pole drawn in lon/lat, a polygon on
a globe, a parallel across Robinson's antimeridian, lines past a globe's
horizon, and a long MGA55 line on a globe. Pasted features get the same
test against the edges they came from, saves are read back, and the
vertex edits are checked to keep rings closed.

## Layout

    src/core/, src/engine/   from ortho-cog-viewer: CRS, sources, warp, mesh
    src/vector/types.ts      features in their own CRS
    src/vector/read.ts       GeoJSON, FlatGeobuf, GeoParquet
    src/vector/densify.ts    straight-in-layer-CRS edges, drawn in the display CRS
    src/vector/project.ts    layer CRS -> display CRS with the validity test
    src/vector/vectorEngine.ts  layout / refresh / draw on a 2D canvas, hit testing
    src/vector/reproject.ts  features into another CRS, keeping their shape
    src/vector/write.ts      FlatGeobuf and GeoJSON out
    src/edit/editor.ts       modes, pointer, undo, copy and paste
    src/edit/geom.ts         vertex edits on one feature
    src/main.ts              the shell: view, layers, UI, URL state
