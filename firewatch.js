// firewatch.js - loads AFTER fire.js.
// Fire-DANGER watch (hot, dry, windy days) per governorate. NOT an ignition forecast.

// DEMONSTRATION thresholds. Replace with levels from the forestry directorate or INM.
var FW_T = {temp: 35, rh: 25, wind: 30, rain: 5, fuel: 0.15};   // deg C, % humidity, km/h, mm, mean NDVI
var FW = null;

I18N.en.fwTitle = 'Fire-danger watch (next 16 days)';
I18N.en.fwNote = 'This shows days when hot, dry, windy weather would let a fire start easily and spread fast. It cannot predict where or when a fire will actually start: sparks (people, power lines, lightning) cannot be forecast. Simplified three-factor score, demonstration thresholds, not back-tested. Forecasts get much less reliable beyond about a week. Follow official forest-fire guidance and civil protection.';
I18N.en.fwNone = 'No governorate reaches Attention or Watch fire danger in the next 16 days.';
I18N.en.fwTop = 'Highest fire-danger days (shown even below the levels)';
I18N.en.fwTopLine = '{r}: {d}, {n} of 3 factors: {why}';
I18N.en.fwL1 = 'Attention'; I18N.en.fwL2 = 'Watch';
I18N.en.fwLine = '{r}: fire danger on {d}, {w} ({c} confidence): {why}.';
I18N.en.fwDays = ' {n} flagged days in total.';
I18N.en.fwPast = ' Fires were detected near here in 2021-2025.';
I18N.en.fwHot = 'hot ({v}°C)'; I18N.en.fwDry = 'dry air ({v}% humidity)'; I18N.en.fwWind = 'windy ({v} km/h)';
I18N.en.fwNoFac = 'no factor';
I18N.en.fwSparse = ' Little vegetation to burn here, so the level was lowered.';

I18N.ar.fwTitle = 'مراقبة خطر الحرائق (الـ16 يوماً القادمة)';
I18N.ar.fwNote = 'يعرض هذا الأيام التي يسمح فيها الطقس الحار والجاف والعاصف باندلاع حريق بسهولة وانتشاره بسرعة. لا يستطيع التنبؤ بمكان أو وقت اندلاع حريق فعلي: الشرارات (الناس، الأسلاك الكهربائية، الصواعق) لا يمكن توقعها. مؤشر مبسّط بثلاثة عوامل، عتبات تجريبية، ولم يتم اختباره على أحداث سابقة. تقل موثوقية التوقعات كثيراً بعد نحو أسبوع. اتبع الإرشادات الرسمية لحرائق الغابات والحماية المدنية.';
I18N.ar.fwNone = 'لا توجد ولاية تبلغ مستوى انتباه أو ترقب لخطر الحرائق خلال 16 يوماً القادمة.';
I18N.ar.fwTop = 'أعلى أيام خطر الحرائق (تُعرض حتى لو كانت دون المستويات)';
I18N.ar.fwTopLine = '{r}: {d}، {n} من 3 عوامل: {why}';
I18N.ar.fwL1 = 'انتباه'; I18N.ar.fwL2 = 'ترقب';
I18N.ar.fwLine = '{r}: خطر حرائق في {d}، {w} (الثقة {c}): {why}.';
I18N.ar.fwDays = ' عدد الأيام المرصودة: {n}.';
I18N.ar.fwPast = ' تم رصد حرائق قرب هذا المكان في 2021-2025.';
I18N.ar.fwHot = 'حار ({v}°م)'; I18N.ar.fwDry = 'هواء جاف (رطوبة {v}%)'; I18N.ar.fwWind = 'رياح ({v} كم/س)';
I18N.ar.fwNoFac = 'لا عامل';
I18N.ar.fwSparse = ' الغطاء النباتي هنا قليل، لذلك خُفّض المستوى.';

var fwc = document.createElement('div');
fwc.className = 'card'; fwc.id = 'firewatch'; fwc.style.marginTop = '10px';
fwc.innerHTML = '<h4 style="margin-top:0" data-i18n="fwTitle"></h4><div id="fwBody"></div>' +
                '<div class="note" data-i18n="fwNote"></div>';
$('panel').insertBefore(fwc, $('hint'));

function loadFireWatch() {
  var la = REG.map(function (r) { return r[2]; }).join(',');
  var lo = REG.map(function (r) { return r[3]; }).join(',');
  getJson('https://api.open-meteo.com/v1/forecast?latitude=' + la + '&longitude=' + lo +
          '&daily=temperature_2m_max,wind_speed_10m_max,precipitation_sum' +
          '&hourly=relative_humidity_2m&forecast_days=16&timezone=auto')
    .then(function (d) { FW = Array.isArray(d) ? d : [d]; renderFireWatch(); })
    .catch(function () { FW = 'fail'; renderFireWatch(); });
}

// were fires detected within about 2 cells (2-3 km) of this point in 2021-2025?
function fireNear(lat, lon) {
  if (!pix.fire || !W) return false;
  var p = toXY(lat, lon);
  for (var dy = -2; dy <= 2; dy++) for (var dx = -2; dx <= 2; dx++) {
    var x = p.x + dx, y = p.y + dy;
    if (x < 0 || y < 0 || x >= W || y >= H) continue;
    if (pix.fire[(y * W + x) * 4] >= 13) return true;
  }
  return false;
}

// mean NDVI over the year in a 5x5 window: how much vegetation there is to burn
function fuelAt(lat, lon) {
  if (!W) return null;
  var p = toXY(lat, lon), s = 0, n = 0;
  for (var m = 1; m <= 12; m++) {
    var d = pix.ndvi[m];
    if (!d) continue;
    for (var dy = -2; dy <= 2; dy++) for (var dx = -2; dx <= 2; dx++) {
      var x = p.x + dx, y = p.y + dy;
      if (x < 0 || y < 0 || x >= W || y >= H) continue;
      var i = (y * W + x) * 4;
      if (d[i + 3] === 0) continue;
      s += -0.2 + d[i] / 255; n++;
    }
  }
  return n ? s / n : null;
}

function fwWhy(f) {
  var w = [];
  if (f.hot) w.push(t('fwHot', {v: f.tmax.toFixed(0)}));
  if (f.dry) w.push(t('fwDry', {v: f.rh.toFixed(0)}));
  if (f.wind) w.push(t('fwWind', {v: f.ws.toFixed(0)}));
  return w.length ? w.join(', ') : t('fwNoFac');
}

function evalFire(i) {
  var D = FW[i].daily, Hr = FW[i].hourly.relative_humidity_2m;
  var past = fireNear(REG[i][2], REG[i][3]);
  var fuel = fuelAt(REG[i][2], REG[i][3]), sparse = fuel !== null && fuel < FW_T.fuel;
  var best = null, top = null, flagged = 0;
  for (var d = 0; d < D.time.length; d++) {
    var tmax = D.temperature_2m_max[d], ws = D.wind_speed_10m_max[d], rain = D.precipitation_sum[d] || 0;
    var rh = 100;
    for (var h = 10; h <= 18; h++) { var v = Hr[d * 24 + h]; if (v !== null && v !== undefined && v < rh) rh = v; }
    var f = {d: d, tmax: tmax, ws: ws, rh: rh, time: D.time[d]};
    f.hot = tmax >= FW_T.temp; f.dry = rh <= FW_T.rh; f.wind = ws >= FW_T.wind;
    f.n = (f.hot ? 1 : 0) + (f.dry ? 1 : 0) + (f.wind ? 1 : 0);
    if (rain >= FW_T.rain) f.n = 0;                          // rain day: danger reset
    f.lv = f.n >= 3 ? 2 : f.n === 2 ? 1 : 0;
    if (f.lv === 1 && past) f.lv = 2;                         // fire history raises the level
    if (sparse && f.lv) f.lv--;                               // little vegetation lowers it
    if (f.lv) flagged++;
    if (f.lv && (!best || f.lv > best.lv)) best = f;          // earliest day at the highest level
    if (!top || f.n > top.n || (f.n === top.n && f.tmax > top.tmax)) top = f;
  }
  return {i: i, best: best, top: top, flagged: flagged, past: past, sparse: sparse};
}

function renderFireWatch() {
  var box = $('fwBody');
  if (!box) return;
  if (!FW) { box.innerHTML = '<div class="note">' + t('fcLoading') + '</div>'; return; }
  if (FW === 'fail') { box.innerHTML = '<div class="note">' + t('fcFail') + '</div>'; return; }
  var all = REG.map(function (r, i) { return evalFire(i); });
  var rows = all.filter(function (e) { return e.best; })
                .sort(function (a, b) { return b.best.lv - a.best.lv || a.best.d - b.best.d; });
  var html = '<div class="note">' + t('outFrom', {d: fcDate(FW[0].daily.time[0])}) + '</div>';
  if (!rows.length) html += '<div class="note"><b>' + t('fwNone') + '</b></div>';
  rows.forEach(function (e) {
    var b = e.best, c = b.d <= 3 ? 'outCH' : b.d <= 7 ? 'outCM' : 'outCL';
    var line = t('fwLine', {
      r: LANG === 'ar' ? REG[e.i][1] : REG[e.i][0],
      d: '<bdi dir="ltr">' + fcDate(b.time) + '</bdi>',
      w: b.d === 0 ? t('outToday') : t('outAhead', {n: b.d}), c: t(c), why: fwWhy(b)
    });
    if (e.flagged > 1) line += t('fwDays', {n: e.flagged});
    if (e.past) line += t('fwPast');
    if (e.sparse) line += t('fwSparse');
    html += '<div style="background:#fff;border-radius:8px;padding:8px 10px;margin-top:6px;border-inline-start:4px solid ' +
            (b.lv === 2 ? '#c62828' : '#f9a825') + '"><b>' + t(b.lv === 2 ? 'fwL2' : 'fwL1') + '</b> · ' + line + '</div>';
  });
  var tops = all.slice().sort(function (a, b) { return b.top.n - a.top.n || b.top.tmax - a.top.tmax; }).slice(0, 3);
  html += '<div class="note" style="margin-top:10px"><b>' + t('fwTop') + '</b></div>' + tops.map(function (e) {
    return '<div class="note">' + t('fwTopLine', {
      r: LANG === 'ar' ? REG[e.i][1] : REG[e.i][0],
      d: '<bdi dir="ltr">' + fcDate(e.top.time) + '</bdi>', n: e.top.n, why: fwWhy(e.top)
    }) + '</div>';
  }).join('');
  box.innerHTML = html;
}

var _refreshAll2 = refreshAll;
refreshAll = function () { _refreshAll2(); renderFireWatch(); };

loadFireWatch();
applyLang();
