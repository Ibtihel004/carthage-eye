// 07_fire_backtest.js
// Google Earth Engine Code Editor script (code.earthengine.google.com).
// Back-test of the weather part of the fire-danger rule against NASA FIRMS fire detections.
//
// Days: 1 June to 30 September, 2021 to 2025.
// Places: the 11 governorates whose centre lies north of 36 degrees N (avoids gas flares in the south).
// Flag: maximum temperature 35 C or more, relative humidity 25% or less, rain under 5 mm.
// Event: at least one FIRMS detection with confidence 50 or higher inside the governorate that day.
//
// How to use: paste into the Code Editor and click Run. Five tasks appear in the Tasks tab
// (one per year). Click RUN on each. Each writes fire_backtest_YEAR.csv to Google Drive with
// four counts: hit (flag and fire), fa (flag, no fire), miss (fire, no flag), none (neither).
// Each year adds up to 1342 governorate-days (11 governorates x 122 days).
//
// Results (all five years): hit 79, fa 761, miss 315, none 5555 (6710 governorate-days).
// Fire detected on 9.4% of flagged days and 5.4% of other days (ratio 1.75).
// Hit rate 20%, false alarm ratio 91%. Per-year counts: results/fire_backtest_2021_2025.csv
//
// Not tested: the wind factor (ERA5-Land has no daily maximum wind), the fire-history and
// vegetation adjustments of the app, and forecast skill (reanalysis weather is used here,
// the app uses the Open-Meteo forecast). Humidity is estimated from the daily-mean dewpoint
// and the daily-maximum temperature (an approximation). FIRMS detections include crop burning.

var gov = ee.FeatureCollection('FAO/GAUL_SIMPLIFIED_500m/2015/level1')
  .filter(ee.Filter.eq('ADM0_NAME', 'Tunisia'))
  .map(function (f) {
    return f.set('lat', ee.Number(f.geometry().centroid(100).coordinates().get(1)));
  })
  .filter(ee.Filter.gt('lat', 36));
print('Governorates tested', gov.size());

var era = ee.ImageCollection('ECMWF/ERA5_LAND/DAILY_AGGR');
var firms = ee.ImageCollection('FIRMS');

function dayRows(YEAR) {
  return ee.FeatureCollection(ee.List.sequence(0, 121).map(function (i) {
    var dd = ee.Date.fromYMD(YEAR, 6, 1).advance(i, 'day');
    var w = ee.Image(era.filterDate(dd, dd.advance(1, 'day')).first());
    var tmax = w.select('temperature_2m_max').subtract(273.15);
    var td = w.select('dewpoint_temperature_2m').subtract(273.15);
    // relative humidity at the hottest time of day (Magnus formula)
    var rh = td.multiply(17.625).divide(td.add(243.04)).exp()
      .divide(tmax.multiply(17.625).divide(tmax.add(243.04)).exp()).multiply(100);
    var rain = w.select('total_precipitation_sum').multiply(1000);
    var f = firms.filterDate(dd, dd.advance(1, 'day'));
    var fire = ee.Image(ee.Algorithms.If(f.size().gt(0),
      f.select('confidence').max().gte(50).unmask(0), ee.Image(0))).rename('fire');
    var img = tmax.rename('tmax').addBands(rh.rename('rh'))
      .addBands(rain.rename('rain')).addBands(fire);
    return img.reduceRegions({
      collection: gov, reducer: ee.Reducer.mean(), scale: 1000, tileScale: 4
    }).map(function (g) {
      var flag = ee.Number(g.get('tmax')).gte(35)
        .and(ee.Number(g.get('rh')).lte(25))
        .and(ee.Number(g.get('rain')).lt(5));
      var ev = ee.Number(g.get('fire')).gt(0);
      return ee.Feature(null, {
        hit: flag.and(ev), fa: flag.and(ev.not()),
        miss: flag.not().and(ev), none: flag.not().and(ev.not())
      });
    });
  })).flatten();
}

[2021, 2022, 2023, 2024, 2025].forEach(function (Y) {
  var r = dayRows(Y);
  var one = ee.Feature(null, {
    year: Y,
    hit: r.aggregate_sum('hit'), fa: r.aggregate_sum('fa'),
    miss: r.aggregate_sum('miss'), none: r.aggregate_sum('none')
  });
  Export.table.toDrive({
    collection: ee.FeatureCollection([one]),
    description: 'fire_backtest_' + Y,
    fileFormat: 'CSV'
  });
});
