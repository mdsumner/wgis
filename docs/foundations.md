# wgis: foundations

Status note, 12 October 2026. Step 1 of the plan: what already exists to
build a web GIS on, what each piece cannot do, and the design calls to
make before writing code. The vision and roadmap come later (step 4),
after the vector and drawing prototype has taught us something.

The first target, stated plainly:

1. Open raster and vector layers over a background, displayed in the
   layer's CRS or a nominated one.
2. Create a new vector layer and draw features into it.

Everything below is judged against those two.

## 1. What we already have

Four of our own projects carry most of the hard parts. None of them has
vector layers or editing; that is the gap.

| piece | where | what it gives wgis |
|---|---|---|
| display CRS decoupled from source CRS | ortho-cog-viewer `core/`, `engine/` | any proj4 CRS as the map; *fixed* (static CRS, camera) and *centred* (projection centre follows the view, globes spin, no pole or antimeridian special cases) view modes |
| GPU reprojection without resampling | ortho-cog-viewer `engine/meshEngine.ts`, `uv.ts` | mesh in display space, UVs by inverse projection, validity mask, seam handling |
| one raster source abstraction | ortho-cog-viewer `core/source.ts`, `cogSource.ts`, `xyzSource.ts`, `wmts.ts` | COGs and XYZ/WMTS pyramids (any tile matrix set) are the same thing: CRS, extent, levels, fetch-a-window; viewport-limited fetches with level choice |
| the engine seam | ortho-cog-viewer `engine/types.ts` | `LayerEngine` with `layout` / `refresh` / `draw`; a vector engine is a second implementation, not a rewrite |
| a real warp | rwarp-wasm (vendored in ortho-cog-viewer) | exact resampled warp for "settled" views, and later for raster analysis output |
| CRS resolution chain | rangefinder `lib/mapcrs.js`, ortho-cog-viewer `core/crs.ts`, `projwasm.ts` | built-in table, zone arithmetic (UTM, MGA, ...), spatialreference.org lookup, proj-wasm as last resort; checked against PROJ by `tools/check-crs.py` |
| wider source catalogue | rangefinder `lib/sources/` | STAC search, starc stores, GDAL VRT mosaics (with overviews), Zarr (zarrita), wildtiles cube |
| vector over reprojected imagery, minimal | aatgrid `explorer/` | coastline strips and a tile lattice drawn in UTM over GPU-reprojected web tiles; a small proof that the overlay idea holds |
| doctrine | wildtiles `docs/design.md` | densify every reprojected edge (corner-only transforms lose real geometry); no hand-typed geometry; append-only state |

Two consequences:

- wgis starts from ortho-cog-viewer's `core/` and `engine/`, not from a
  general web map framework. The reason is in section 4, call A.
- The CRS story is already better than most web maps: neither raster
  sources nor the display are bound to Web Mercator.

## 2. Outside foundations

Versions are the npm `latest` tag on 2026-10-12.

### Map frameworks

| library | strength | limit for wgis |
|---|---|---|
| OpenLayers 10.11 | the only mainstream web map with arbitrary projections (proj4), raster reprojection by triangulation, mature Draw/Modify/Snap interactions that work in the view projection, FlatGeobuf/GeoJSON/WKB readers | reprojection is CPU canvas work; no centred/rotating projections; the view projection is fixed per view, so "spin the globe" means rebuilding the view; heavy for what we would use |
| MapLibre GL 6.14 | fast vector tiles, globe mode, big plugin ecosystem (Geoman, terra-draw) | Web Mercator (or its globe) only; a GIS that cares about CRS fights it constantly |
| deck.gl 9.4 + deck.gl-raster 0.8, @geoarrow/deck.gl-layers 0.3 | GPU layers, GeoArrow straight to the GPU, COG rendering (used for source.coop previews) | views are Web Mercator, globe, or plain orthographic; arbitrary projected CRS needs coordinates pre-projected, which is what we would do ourselves anyway |

### Raster IO

- geotiff.js 3.0 (already used), @cogeotiff/core 9.5 (lighter, header
  only, good for planning reads), zarrita 0.7 (already used in
  rangefinder), rwarp-wasm (ours).
- Limit for all of them: the data must be public over HTTP with range
  requests and CORS. rangefinder's notes list real buckets that fail
  this (Copernicus DEM, ESA WorldCover, DE Africa). A server-side proxy
  is the only fix, and it is optional, not core.

### CRS

- proj4js 2.22: fast, in the main thread and workers; no EPSG database
  and a smaller set of projections and datum shifts than PROJ.
- proj-wasm 0.1.0 (released 2026-10-01): real PROJ, WKT2 and PROJJSON
  in, the EPSG database available. Slower to start; the right tool for
  "what is this file's CRS" and for anything grid-shift dependent.
- The existing split (proj4js for per-vertex transforms, PROJ for
  resolution and checking) carries over unchanged.

### Vector IO

| library | reads | writes | CRS | note |
|---|---|---|---|---|
| flatgeobuf 4.6 | yes, streamed, bbox-filtered over HTTP range | yes | header carries the CRS; the JS writer takes an EPSG code only | best fit for "open a big remote file and read only the view" |
| hyparquet 1.31 | GeoParquet (WKB column, PROJJSON in metadata) | no | yes, PROJJSON | pure JS, small; already used in rangefinder |
| DuckDB-wasm 1.33 + spatial | GeoParquet, FlatGeobuf, GDAL-backed formats, SQL, `ST_Transform` | yes | yes | the SQL engine for later; large download, single thread in the browser, WKB not GeoArrow at the boundary |
| @ngageoint/geopackage 4.2, sqlite-wasm 3.53 | GeoPackage | yes | yes | GeoPackage is the natural *project/edit* store, as in QGIS |
| gdal3.js 2.8.1 | most GDAL formats | yes | yes | last release February 2024; usable as a format converter of last resort, not a foundation |
| GeoJSON (built in) | yes | yes | RFC 7946 says lon/lat only | accept a `crs` member or a user-stated CRS on read; write lon/lat by default |

### Geometry and editing

- turf 7.4: convenient, but lon/lat only and spherical; wrong for
  planar work in a projected CRS.
- geos-wasm 3.1 (December 2024): real planar predicates, buffer,
  union, validity; the right engine for overlay operations later.
- terra-draw 1.37: drawing modes (point, line, polygon, rectangle,
  circle, freehand, select/edit) behind an adapter with `project` /
  `unproject` / `render`. A custom adapter onto our display is feasible.
  The catch: it stores lon/lat, and its geometry helpers assume Web
  Mercator or globe. A polygon edge drawn on a polar stereographic layer
  would be stored as lon/lat vertices whose "straight" edge is straight
  in neither CRS.
- Geoman (MapLibre/Leaflet only): richer editing, not portable.

### Comparable web GIS

- GeoLibre (geolibre.app): the closest thing in spirit, a browser GIS
  with DuckDB spatial, PGlite+PostGIS, GeoPackage via sql.js, Geoman
  editing and undo. It is built on MapLibre plus deck.gl, so it is Web
  Mercator at heart, which is exactly where wgis should differ. Its
  documented limits (about 2 GiB remote files, 4 GiB per tab, single
  threaded DuckDB, confirmation above 500K features, client tiling above
  50K features) are a fair picture of the browser's ceiling.
- QGIS Web Client and Lizmap publish QGIS projects to the web; they are
  viewers for a server-side QGIS, not a GIS in the browser.

## 3. What Manifold and QGIS get right that we want

- The CRS belongs to the layer, and the map has its own; reprojection
  is on the fly and never silently destructive. (QGIS, Manifold.)
- Raster and vector are peers in one project. (Both.)
- SQL is a first-class way to make new layers from old ones, and the
  result is just another layer. (Manifold most strongly.)
- A project is a file: layers, styles, CRS, view, and edited data
  together. (Both; GeoPackage for QGIS, `.map` for Manifold.)
- Editing is precise: snapping, vertex lists, coordinates typed in the
  layer's CRS. (QGIS.)

The first target needs only the first two plus basic editing. The rest
shapes the data model now so it does not have to be torn up later.

## 4. Design calls

Each call has a recommendation. Edit or overrule before step 2 starts.

**A. Rendering base: ortho-cog-viewer's engine, not OpenLayers.**
OpenLayers is the only framework that could carry the CRS requirement,
and it is the obvious fallback. But centred projections, GPU mesh
reprojection and the engine seam already exist in our code, and
OpenLayers would replace them with something slower and less general.
Recommendation: lift `core/` and `engine/` into wgis as the base and
keep OpenLayers' Draw/Modify as a reference for interaction design.

**B. Features keep their own CRS.**
A vector layer has a CRS (from the file, or chosen at creation).
Coordinates are stored in it, as Float64 arrays in a GeoArrow-like
layout (coords, ring offsets, geometry offsets) so that GeoParquet,
FlatGeobuf and later DuckDB exchange data without per-feature objects.
Nothing is ever rewritten into the display CRS.

**C. Edges are straight in the layer CRS and densified for display.**
This is the GIS meaning of a polygon edge, and the wildtiles doctrine.
On each `layout`, edges are transformed to the display CRS with
adaptive densification: split an edge while its projected midpoint
misses the projected chord by more than a screen tolerance (about half
a pixel). Breaks in the display projection (the far side of an
orthographic globe, an interrupted lobe) cut lines the same way the
raster validity mask cuts the mesh. Geodesic edges can be a per-layer
option later.

**D. Vector drawing: Canvas 2D overlay first, WebGL later.**
A 2D canvas above the WebGL raster canvas, redrawn on `layout`, is
exact, simple, and fast enough for tens of thousands of vertices.
Hit-testing for editing is easier there too. A WebGL line and polygon
engine (extending `LineRenderer.ts`, with earcut in display space)
comes when a layer outgrows it. The `LayerEngine` seam means the swap
does not touch the rest.

**E. Editing: our own small editor, not terra-draw.**
Because of call B, the editor works in the layer CRS: pointer position
is inverse-projected display to lon/lat to layer CRS, vertices are
stored there, and snapping tolerances are in screen pixels. The first
set is point, line and polygon creation, vertex drag, midpoint insert,
vertex delete, feature delete, and undo/redo. terra-draw's mode design
is the reference for the state machine.

**F. File formats.**
Read: GeoJSON, FlatGeobuf (local or remote with bbox reads), GeoParquet
(hyparquet plus a WKB decoder). Write: FlatGeobuf in the layer CRS (the
native save), GeoJSON in lon/lat (the interchange save). GeoPackage
(read and write, via sqlite-wasm) follows as the project and edit store.
DuckDB-wasm arrives with SQL, not before.

**G. Persistence.**
The view and layer list stay in the URL as in ortho-cog-viewer. Drawn
layers live in the browser's origin private file system (OPFS) between
sessions and are saved out explicitly. A project file comes with the
GeoPackage work.

**H. No server in the core.**
Static hosting (GitHub Pages) like the other three projects. Anything a
server would add (a CORS proxy, a tile service for huge vectors, shared
editing) is an optional extra, not a dependency.

## 5. Limits to plan around

- CORS and range requests decide what data is reachable at all.
- Memory: one tab gets a few GiB. Large vectors need bbox-filtered
  reads (FlatGeobuf, GeoParquet row groups) rather than whole loads.
- proj4js covers fewer projections and datum transforms than PROJ;
  anything that needs grid shifts goes through proj-wasm.
- Per-vertex transforms on every `layout` are the cost of call C. For
  large layers this moves to a worker, then to the GPU (project in the
  vertex shader for the common projections).
- Format breadth will never match GDAL in the browser while gdal3.js is
  unmaintained; rwarp shows a Rust-to-wasm route that could cover the
  formats that matter.

## 6. Later, not now: a 3D mode

Out of scope for the first target, recorded so the 2D design does not
close the door on it. The reference is the `native/` viewer in
mdsumner/listmap3d (three.js, Tasmania 2 m DEM):

- **Terrain tiles in the view CRS.** A quadtree over the DEM extent in
  the chosen projection; each tile is a 128 x 128 mesh (with skirts)
  sampled from the COG overview whose pixel matches the tile spacing,
  split by screen-space error. No Web Mercator step anywhere.
- **No reprojection when the view CRS is the DEM's own.** Sample
  positions map straight to COG pixels; any other CRS reprojects each
  sample position to the DEM CRS before sampling.
- **Raw heights into the vertex buffer**, normals by central
  differences, relief colour and shading in a small shader; no
  Terrarium encode/decode.
- **Vectors drawn into each tile's texture**, projected into the view
  CRS once on arrival, so they sit exactly on the ground at any
  exaggeration; picking happens in the view CRS.
- **Imagery fetched in the view CRS** (ArcGIS `export` with
  `imageSR`), which needs an EPSG code.

What this asks of the 2D design now:

- Keep the raster `Source` able to return *values* (heights), not only
  textures, so a terrain engine can sit behind the same `LayerEngine`
  seam.
- Keep vector features in their own CRS and project on demand (call B),
  so draping onto terrain tiles is the same transform with a different
  target.
- Keep the editor's pointer-to-layer-CRS step one function, so a 3D
  pick (ray to terrain, then inverse projection) can replace it.

## 7. Step 2, concretely

1. Set up wgis: Vite and TypeScript as in ortho-cog-viewer, with its
   `core/` and `engine/` copied in and credited, and the same Pages
   deploy.
2. A `VectorSource` (CRS, extent, features as in call B) with GeoJSON,
   FlatGeobuf and GeoParquet readers, from a URL or a dropped file.
3. A Canvas 2D vector engine that implements `LayerEngine`, with
   adaptive densification (call C) and simple styles.
4. Checks in the style of `tools/`: densification against PROJ on a
   polar and a global case, and a FlatGeobuf round trip that keeps the
   CRS.

## 8. Step 3, as built

Call E as planned, with these choices made on the way:

- Undo keeps whole feature arrays. Features are never changed in place,
  so an edit is "this layer's array was A, now it is B"; cheap, and it
  covers attribute edits, deletes and pastes with one mechanism.
- Copy and paste follow Manifold: a copy carries its CRS, a paste
  converts into the target layer's CRS, and "paste as layer" keeps the
  source CRS. Conversion keeps shape by default (densify in the source,
  judged in the target, the same machinery as display), which is what
  makes call C hold across layers and not just on screen.
- Temporary layers are in memory, marked unsaved, with a warning on
  leaving. OPFS persistence (call G) is still to do.
- FlatGeobuf is written with explicit columns (the union of every
  feature's attributes), because the library's serializer takes them from
  the first feature only.
- Not yet: snapping, drawing holes and multi-part features, a geodesic
  edge option, and splitting a pasted ring at a break rather than
  dropping it (a ring around the pole has a lon/lat form only if the
  pole is added as an edge).
