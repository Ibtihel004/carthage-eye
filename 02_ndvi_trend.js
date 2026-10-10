// 02_ndvi_trend.js
// NOTE: reconstruction of the original script. Same output encoding the app expects.
// Produces 12 links: trend_slope_01..12.png. Save each into data/.
// Encoding: slope per year = -0.02 + v/255 * 0.04 (min -0.02, max 0.02).
// Method: for each calendar month, linear fit of MODIS NDVI against year, 2010-2025.
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

var tunisia = ee.FeatureCollection('USDOS/LSIB_SIMPLE/2017').filter(ee.Filter.eq('country_na', 'Tunisia'));
function pad(m) { return (m < 10 ? '0' : '') + m; }

function slopeFor(m) {
  var years = ee.List.sequence(2010, 2025);
  var col = ee.ImageCollection.fromImages(years.map(function (y) {
    y = ee.Number(y);
    var mean = ee.ImageCollection('MODIS/061/MOD13A2').select('NDVI')
      .filter(ee.Filter.calendarRange(y, y, 'year'))
      .filter(ee.Filter.calendarRange(m, m, 'month'))
      .mean().multiply(0.0001).rename('ndvi');
    return ee.Image.cat(ee.Image.constant(y).float().rename('year'), mean);
  }));
  return col.select(['year', 'ndvi']).reduce(ee.Reducer.linearFit()).select('scale').clip(tunisia);
}

for (var m = 1; m <= 12; m++) {
  var url = slopeFor(m).visualize({min: -0.02, max: 0.02}).getThumbURL({
    region: region, crs: 'EPSG:3857', dimensions: W + 'x' + H, format: 'png'
  });
  print('trend_slope_' + pad(m) + '.png', url);
}
Map.centerObject(region, 6);
Map.addLayer(slopeFor(4), {min: -0.02, max: 0.02, palette: ['brown', 'white', 'green']}, 'trend April');
