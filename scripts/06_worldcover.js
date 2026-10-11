// 06_worldcover.js
// Google Earth Engine Code Editor script (code.earthengine.google.com).
// Exports ESA WorldCover (2021) on the same grid as the other PNGs, for the check of the
// k-means zones in kmeans.js.
//
// How to use: paste into the Code Editor, click Run, click the printed link and save the
// image as data/worldcover.png.
//
// Encoding: the WorldCover class codes (10, 20, 30, ... 100) are stored directly as grey
// levels, so keep min: 0 and max: 255. kmeans.js decodes them.
//   10 tree cover, 20 shrubland, 30 grassland, 40 cropland, 50 built-up,
//   60 bare or sparse, 70 snow or ice, 80 water, 90 wetland, 95 mangroves, 100 moss or lichen
//
// If the link times out, run it again, or change dimensions to '300x620'. The app expects
// all PNGs to have the same size, so then export the other images at that size too.

var rect = ee.Geometry.Rectangle([7.5, 30.2, 11.7, 37.4], null, false);
var tunisia = ee.FeatureCollection('USDOS/LSIB_SIMPLE/2017')
  .filter(ee.Filter.eq('country_na', 'Tunisia'));

var wc = ee.ImageCollection('ESA/WorldCover/v200').first().select('Map')
  .clip(tunisia.geometry());

print('worldcover', wc.getThumbURL({
  min: 0, max: 255, palette: ['000000', 'ffffff'],
  region: rect, crs: 'EPSG:3857', dimensions: '400x826', format: 'png'
}));
