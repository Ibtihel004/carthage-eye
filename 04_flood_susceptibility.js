// 04_flood_susceptibility.js  -> save the link's image as data/flood.png
// Susceptibility (where water would collect), NOT a flood forecast. Weights are assumptions.
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

var dem = ee.Image('USGS/SRTMGL1_003').select('elevation');
var gsw = ee.Image('JRC/GSW1_4/GlobalSurfaceWater');

var MID = 240;   // working grid in metres. If it fails with a memory error, try 480.
var P = {crs: 'EPSG:3857', scale: MID};

// reproject() only: Earth Engine reads its pre-shrunk copies, no 30 m scan
var demM   = dem.reproject(P);
var slopeM = ee.Terrain.slope(demM);
var wetM   = gsw.select('max_extent').unmask(0).reproject(P);     // 1 = water seen at least once
var permM  = gsw.select('occurrence').unmask(0).reproject(P);     // % of time under water

var rel = demM.subtract(demM.focalMin({radius: 2000, units: 'meters'}));   // height above local low point
var nearWater = wetM.focalMax({radius: 1000, units: 'meters'});

var low  = ee.Image(1).subtract(rel.divide(30).clamp(0, 1));
var flat = ee.Image(1).subtract(slopeM.divide(5).clamp(0, 1));
var flood = low.multiply(0.5).add(flat.multiply(0.3)).add(nearWater.multiply(0.2))
  .rename('flood');

// Permanent water (sea, big lakes) is not "flood risk"
flood = flood.where(permM.gt(90), 0);

var coarse = flood
  .reduceResolution({reducer: ee.Reducer.mean(), maxPixels: 1024})
  .reproject({crs: 'EPSG:3857', scale: scale})
  .unmask(0);

var url = coarse.visualize({min: 0, max: 1}).getThumbURL({
  region: region, crs: 'EPSG:3857', dimensions: W + 'x' + H, format: 'png'
});
print('Click this link, then save the image as flood.png:', url);

Map.centerObject(region, 6);
Map.addLayer(coarse, {min: 0, max: 1}, 'flood susceptibility');
