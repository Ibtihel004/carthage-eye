// 08_fire_training_table.js
// One row per northern governorate per day, June to September, 2003 to 2025.
var FIRST_YEAR = 2003, LAST_YEAR = 2025, CHUNK = 4;   // CHUNK = years per export task

var gov = ee.FeatureCollection('FAO/GAUL_SIMPLIFIED_500m/2015/level1')
  .filter(ee.Filter.eq('ADM0_NAME', 'Tunisia'))
  .map(function (f) {
    return f.set('lat', ee.Number(f.geometry().centroid(100).coordinates().get(1)));
  })
  .filter(ee.Filter.gt('lat', 36));
print('Governorates (expect 11)', gov.size(), gov.aggregate_array('ADM1_NAME'));

var era = ee.ImageCollection('ECMWF/ERA5_LAND/DAILY_AGGR');
var firms = ee.ImageCollection('FIRMS');
print('ERA5-Land bands', era.first().bandNames());
print('FIRMS first day', ee.Date(firms.aggregate_min('system:time_start')));
print('FIRMS images per summer (about 122 expected)',
  ee.List.sequence(FIRST_YEAR, LAST_YEAR).map(function (y) {
    var s = ee.Date.fromYMD(y, 6, 1);
    return firms.filterDate(s, s.advance(122, 'day')).size();
  }));

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
    var wind = w.select('u_component_of_wind_10m').pow(2)
      .add(w.select('v_component_of_wind_10m').pow(2)).sqrt().multiply(3.6);   // km/h, daily mean
    var rain7 = era.filterDate(dd.advance(-7, 'day'), dd)
      .select('total_precipitation_sum').sum().multiply(1000);
    var rain30 = era.filterDate(dd.advance(-30, 'day'), dd)
      .select('total_precipitation_sum').sum().multiply(1000);
    var f = firms.filterDate(dd, dd.advance(1, 'day'));
    var fire = ee.Image(ee.Algorithms.If(f.size().gt(0),
      f.select('confidence').max().gte(50).unmask(0), ee.Image(0))).rename('fire');
    var img = tmax.rename('tmax').addBands(rh.rename('rh')).addBands(rain.rename('rain'))
      .addBands(wind.rename('wind')).addBands(rain7.rename('rain7'))
      .addBands(rain30.rename('rain30')).addBands(fire);
    return img.reduceRegions({
      collection: gov, reducer: ee.Reducer.mean(), scale: 1000, tileScale: 4
    }).map(function (g) {
      return ee.Feature(null, {
        gov: g.get('ADM1_NAME'), date: dd.format('YYYY-MM-dd'), year: YEAR,
        doy: dd.getRelative('day', 'year').add(1),
        tmax: g.get('tmax'), rh: g.get('rh'), rain: g.get('rain'), wind: g.get('wind'),
        rain7: g.get('rain7'), rain30: g.get('rain30'),
        fire: ee.Number(g.get('fire')).gt(0)
      });
    });
  })).flatten();
}

var cols = ['gov', 'date', 'year', 'doy', 'tmax', 'rh', 'rain', 'wind', 'rain7', 'rain30', 'fire'];
for (var y0 = FIRST_YEAR; y0 <= LAST_YEAR; y0 += CHUNK) {
  var y1 = Math.min(y0 + CHUNK - 1, LAST_YEAR);
  var parts = [];
  for (var y = y0; y <= y1; y++) parts.push(dayRows(y));
  var table = parts.reduce(function (a, b) { return a.merge(b); });
  Export.table.toDrive({
    collection: table, description: 'fire_train_' + y0 + '_' + y1,
    folder: 'fire_model', fileFormat: 'CSV', selectors: cols
  });
}
