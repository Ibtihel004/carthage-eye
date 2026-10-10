// fire.js - loads AFTER outlook.js. Fire HISTORY layer (not a fire prediction).

pix.fire = null;
STOPS.fire = [[0,255,255,178],[0.25,254,204,92],[0.5,253,141,60],[0.75,240,59,32],[1,128,0,38]];
LUTS.fire = makeLut(STOPS.fire);

I18N.en.layerFire = 'Fire history (2021-2025)';
I18N.ar.layerFire = 'سجل الحرائق (2021-2025)';
I18N.en.fireHere = 'Past fires: {a} of {b} map cells within the radius had at least one satellite fire detection in 2021-2025 (up to {c} days in one cell). This is history, not a forecast. Some detections are gas flares or crop burning.';
I18N.ar.fireHere = 'حرائق سابقة: {a} من أصل {b} خلية ضمن الشعاع سجلت كشفاً واحداً على الأقل بالأقمار الاصطناعية في 2021-2025 (حتى {c} يوماً في خلية واحدة). هذا سجل تاريخي وليس توقعاً. بعض الكشوفات مشاعل غاز أو حرق محاصيل.';

// add the option to the dropdown (no index.html change needed)
var fo = document.createElement('option');
fo.value = 'fire'; fo.setAttribute('data-i18n', 'layerFire');
$('layerSel').appendChild(fo);

function loadFire() {
  loadImg('data/fire.png', function (img) {
    if (!img.naturalWidth) { console.error('EMPTY IMAGE: data/fire.png'); return; }
    pix.fire = toPixels(img);
    urlCache = {};
    refreshAll();
  }, function () { console.error('CANNOT LOAD: data/fire.png'); });
}
var _obr2 = onBaseReady;
onBaseReady = function () { _obr2(); loadFire(); };

// map layer: only cells with at least one detection are drawn
var _layerUrl2 = layerUrl;
layerUrl = function () {
  if (layerName !== 'fire') return _layerUrl2();
  if (urlCache.fire) return urlCache.fire;
  var dn = pix.ndvi[month];
  if (!dn || !pix.fire) return null;
  var c = document.createElement('canvas');
  c.width = W; c.height = H;
  var ctx = c.getContext('2d');
  var out = ctx.createImageData(W, H), o = out.data, lut = LUTS.fire;
  for (var i = 0; i < dn.length; i += 4) {
    if (dn[i + 3] === 0 || pix.fire[i] < 13) continue;     // 13/255 is about half a day
    var k = Math.round(Math.sqrt(pix.fire[i] / 255) * 255) * 3;   // square root so single detections are visible
    o[i] = lut[k]; o[i + 1] = lut[k + 1]; o[i + 2] = lut[k + 2]; o[i + 3] = 220;
  }
  ctx.putImageData(out, 0, 0);
  urlCache.fire = c.toDataURL();
  return urlCache.fire;
};

var _buildLegend2 = buildLegend;
buildLegend = function () {
  _buildLegend2();
  if (layerName === 'fire') { $('legLo').textContent = '0'; $('legHi').textContent = '10+'; }
};

// written line in the point panel: fire history around the clicked place
var _renderPanel = renderPanel;
renderPanel = function () {
  _renderPanel();
  var box = $('precs');
  if (!A || !pix.fire || !box || $('content').style.display === 'none') return;
  var rp = Math.max(0, Math.round(sRad)), n = 0, hit = 0, mx = 0;
  for (var dy = -rp; dy <= rp; dy++) {
    for (var dx = -rp; dx <= rp; dx++) {
      if (dx * dx + dy * dy > rp * rp) continue;
      var x = A.x + dx, y = A.y + dy;
      if (x < 0 || y < 0 || x >= W || y >= H) continue;
      var v = pix.fire[(y * W + x) * 4];
      n++;
      if (v >= 13) { hit++; if (v > mx) mx = v; }
    }
  }
  if (n) box.innerHTML += '<div>' + t('fireHere', {a: hit, b: n, c: Math.round(mx / 255 * 10)}) + '</div>';
};

applyLang();
