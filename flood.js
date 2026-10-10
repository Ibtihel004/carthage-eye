// flood.js - loads AFTER app.js. Adds the flood susceptibility layer
// and a minimum river-flow threshold for the forecast advice.

// ---------- data ----------
pix.flood = null;
STOPS.flood = [[0,255,255,255],[0.3,198,219,239],[0.6,66,146,198],[1,8,48,107]];
LUTS.flood = makeLut(STOPS.flood);
I18N.en.layerFlood = 'Flood susceptibility';
I18N.ar.layerFlood = 'القابلية للفيضان';

function loadFlood() {
  loadImg('data/flood.png', function (img) {
    if (!img.naturalWidth) { console.error('EMPTY IMAGE: data/flood.png'); return; }
    pix.flood = toPixels(img);
    urlCache = {};
    refreshAll();
  }, function () { console.error('CANNOT LOAD: data/flood.png'); });
}

// load the flood image once the monthly images are ready
var _onBaseReady = onBaseReady;
onBaseReady = function () { _onBaseReady(); loadFlood(); };

// ---------- map layer ----------
var _layerUrl = layerUrl;
layerUrl = function () {
  if (layerName !== 'flood') return _layerUrl();
  if (urlCache.flood) return urlCache.flood;
  var dn = pix.ndvi[month];
  if (!dn || !pix.flood) return null;
  var c = document.createElement('canvas');
  c.width = W; c.height = H;
  var ctx = c.getContext('2d');
  var out = ctx.createImageData(W, H), o = out.data, lut = LUTS.flood;
  for (var i = 0; i < dn.length; i += 4) {
    if (dn[i + 3] === 0) continue;               // keep the sea and outside Tunisia transparent
    var k = Math.round(clamp01(pix.flood[i] / 255) * 255) * 3;
    o[i] = lut[k]; o[i + 1] = lut[k + 1]; o[i + 2] = lut[k + 2]; o[i + 3] = 255;
  }
  ctx.putImageData(out, 0, 0);
  urlCache.flood = c.toDataURL();
  return urlCache.flood;
};

// ---------- legend ----------
var _buildLegend = buildLegend;
buildLegend = function () {
  _buildLegend();
  if (layerName === 'flood') {
    $('legLo').textContent = t('low');
    $('legHi').textContent = t('high');
  }
};

// ---------- forecast advice with a minimum river flow ----------
var FC_FLOW_MIN = 5;   // m3/s, demonstration value, replace with an official level
showFcRecs = function (rain, flow) {
  var box = $('fcRecs');
  if (!box) return;
  var wet = [], heavy = [];
  rain.precipitation_sum.forEach(function (v, i) {
    if (v >= FC_HEAVY) heavy.push(fcDate(rain.time[i]));
    if (v >= FC_WET) wet.push(fcDate(rain.time[i]));
  });
  var recs = [];
  if (wet.length) {
    recs.push(t('fcRecPrep', {d: wet[0]}));
    recs.push(t('fcRecWet', {d: wet.slice(0, 5).join(', ')}));
  } else {
    recs.push(t('fcRecDry'));
  }
  if (heavy.length) recs.push(t('fcRecHeavy', {d: heavy.slice(0, 5).join(', ')}));
  if (flow) {
    var q = flow.river_discharge, pk = 0;
    q.forEach(function (v, i) { if ((v || 0) > (q[pk] || 0)) pk = i; });
    if ((q[pk] || 0) >= FC_FLOW_MIN) recs.push(t('fcRecFlow', {d: fcDate(flow.time[pk])}));
  }
  recs.push(t('fcRecCrop'));
  recs.push(t('fcRecLeave'));
  var card = 'background:#fff;border-radius:8px;padding:8px 10px;margin-bottom:6px';
  box.innerHTML = '<h4>' + t('fcRecsTitle') + '</h4>' +
    '<div class="note">' + t('fcRecsDraft', {a: FC_WET, b: FC_HEAVY}) + '</div>' +
    recs.map(function (x) { return '<div style="' + card + '">' + x + '</div>'; }).join('');
};

// refresh the dropdown text and everything else now that the new strings exist
applyLang();
