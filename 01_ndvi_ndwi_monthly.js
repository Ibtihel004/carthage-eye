// 01_ndvi_ndwi_monthly.js
// NOTE: reconstruction of the original script. Same output encoding the app expects.
// Produces 24 links: ndvi_01..12.png and ndwi_01..12.png. Save each into data/.
// Encoding: NDVI = -0.2 + v/255 (min -0.2, max 0.8); NDWI = -0.6 + v/255 (min -0.6, max 0.4).
// Transparent pixels (alpha 0) = no data (cloud, sea, outside Tunisia).
var W = 400;

var X0 = 7.5, X1 = 11.7, LAT_N = 37.4, LAT_S = 30.2;
function merc(lat) { return Math.log(Math.tan(Math.PI / 4 + lat * Math.PI / 360)); }
var R = 6378137;
var xSpan = (X1 - X0) * Math.PI / 180 * R;
var ySpan = (merc(LAT_N) - merc(LAT_S)) * R;
var H = Math.round(W * ySpan / xSpan);
var scale = xSpan / W;
print("Output size (must match the app):", W, "x", H);

var region = ee.Geometry.Rectangle([X0, LAT_S, X1, LAT_N], "EPSG:4326", false);

var YEAR = 2025;
var tunisia = ee.FeatureCollection('USDOS/LSIB_SIMPLE/2017').filter(ee.Filter.eq('country_na', 'Tunisia'));

function pad(m) { return (m < 10 ? '0' : '') + m; }

function monthly(m) {
  var start = ee.Date.fromYMD(YEAR, m, 1);
  var col = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
    .filterBounds(region)
    .filterDate(start, start.advance(1, 'month'))
    .map(function (im) {
      var scl = im.select('SCL');   // mask shadows, clouds, cirrus, snow
      var ok = scl.neq(3).and(scl.neq(8)).and(scl.neq(9)).and(scl.neq(10)).and(scl.neq(11));
      return im.select(['B3', 'B4', 'B8']).updateMask(ok).divide(10000);
    });
  return col.median().clip(tunisia);
}

function link(img, min, max, name) {
  var url = img.visualize({min: min, max: max}).getThumbURL({
    region: region, crs: 'EPSG:3857', dimensions: W + 'x' + H, format: 'png'
  });
  print(name, url);
}

for (var m = 1; m <= 12; m++) {
  var im = monthly(m);
  link(im.normalizedDifference(['B8', 'B4']), -0.2, 0.8, 'ndvi_' + pad(m) + '.png');
  link(im.normalizedDifference(['B3', 'B8']), -0.6, 0.4, 'ndwi_' + pad(m) + '.png');
}
Map.centerObject(region, 6);
Map.addLayer(monthly(4).normalizedDifference(['B8', 'B4']), {min: -0.2, max: 0.8, palette: ['brown', 'yellow', 'green']}, 'NDVI April');
