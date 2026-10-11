// 05_fire_history.js  -> save the link's image as data/fire.png
// Days with a satellite fire detection per cell, 2021-2025. History, not a prediction.
// If you get "User memory limit exceeded": use 2021-2023 (end date 2024-01-01, sequence 2021..2023).
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

// MODIS active fire detections, medium confidence or better, 5 full years
var fires = ee.ImageCollection('FIRMS')
  .filter(ee.Filter.date('2021-01-01', '2026-01-01'))
  .map(function (i) { return i.updateMask(i.select('confidence').gte(50)); })
  .select('T21');

// Days with a detection per pixel, summed year by year to keep memory low
var years = ee.List.sequence(2021, 2025);
var cnt = ee.ImageCollection.fromImages(years.map(function (y) {
  y = ee.Number(y);
  return fires.filter(ee.Filter.calendarRange(y, y, 'year')).count().rename('n');
})).sum();

var coarse = cnt.unmask(0)
  .reproject({crs: 'EPSG:3857', scale: 1000})
  .reduceResolution({reducer: ee.Reducer.max(), maxPixels: 64})
  .reproject({crs: 'EPSG:3857', scale: scale});

var url = coarse.visualize({min: 0, max: 10}).getThumbURL({
  region: region, crs: 'EPSG:3857', dimensions: W + 'x' + H, format: 'png'
});
print('Click this link, then save the image as fire.png:', url);

Map.centerObject(region, 6);
Map.addLayer(coarse, {min: 0, max: 10, palette: ['white', 'yellow', 'orange', 'red']}, 'fire days');
