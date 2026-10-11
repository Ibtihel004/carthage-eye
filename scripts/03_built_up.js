// 03_built_up.js  -> save the link's image as data/built.png
var W = 400;

var X0 = 7.5, X1 = 11.7, LAT_N = 37.4, LAT_S = 30.2;
function merc(lat) { return Math.log(Math.tan(Math.PI / 4 + lat * Math.PI / 360)); }
var R = 6378137;
var xSpan = (X1 - X0) * Math.PI / 180 * R;
var ySpan = (merc(LAT_N) - merc(LAT_S)) * R;
var H = Math.round(W * ySpan / xSpan);
var scale = xSpan / W;
print('Output size (must match your app):', W, 'x', H);

var region = ee.Geometry.Rectangle([X0, LAT_S, X1, LAT_N], 'EPSG:4326', false);

// Built-up share of each 100 m cell (0 to 1): built_surface is in m2, a cell is 10,000 m2
var built = ee.Image('JRC/GHSL/P2023A/GHS_BUILT_S/2020')
  .select('built_surface').divide(10000).rename('built');

// Average down to your grid, then fill gaps with 0
var coarse = built
  .reduceResolution({reducer: ee.Reducer.mean(), maxPixels: 65536})
  .reproject({crs: 'EPSG:3857', scale: scale})
  .unmask(0);

var url = coarse.visualize({min: 0, max: 1}).getThumbURL({
  region: region, crs: 'EPSG:3857', dimensions: W + 'x' + H, format: 'png'
});
print('Click this link, then save the image as built.png:', url);

Map.centerObject(region, 6);
Map.addLayer(coarse, {min: 0, max: 0.5}, 'built-up share');
