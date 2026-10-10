// outlook.js - loads AFTER flood.js.
// Regional heavy-rain watch for the 24 governorates. NOT a flood prediction.

var REG = [
  ['Tunis','تونس',36.80,10.18], ['Ariana','أريانة',36.86,10.19], ['Ben Arous','بن عروس',36.75,10.23],
  ['Manouba','منوبة',36.81,10.09], ['Nabeul','نابل',36.45,10.73], ['Zaghouan','زغوان',36.40,10.14],
  ['Bizerte','بنزرت',37.27,9.87], ['Béja','باجة',36.73,9.18], ['Jendouba','جندوبة',36.50,8.78],
  ['Le Kef','الكاف',36.17,8.71], ['Siliana','سليانة',36.08,9.37], ['Sousse','سوسة',35.83,10.64],
  ['Monastir','المنستير',35.78,10.83], ['Mahdia','المهدية',35.50,11.06], ['Sfax','صفاقس',34.74,10.76],
  ['Kairouan','القيروان',35.68,10.10], ['Kasserine','القصرين',35.17,8.83], ['Sidi Bouzid','سيدي بوزيد',35.04,9.49],
  ['Gabès','قابس',33.88,10.10], ['Médenine','مدنين',33.35,10.50], ['Tataouine','تطاوين',32.93,10.45],
  ['Gafsa','قفصة',34.43,8.78], ['Tozeur','توزر',33.92,8.13], ['Kébili','قبلي',33.70,8.97]
];

// DEMONSTRATION thresholds in mm. Replace with levels from the national weather service.
var OUT_T = {att1: 15, att2: 30, watch1: 30, watch2: 50};   // 1-day and 2-day totals
var OUT = null;

I18N.en.outTitle = 'Regional heavy-rain watch (next 16 days)';
I18N.en.outNote = 'This is a heavy-rain watch, not a flood prediction. Whether rain becomes a flood depends on its intensity, soil wetness and drainage, which this app cannot see. Forecasts get much less reliable beyond about a week. Thresholds are demonstration values and the score has not been back-tested. For official warnings, follow the Institut National de la Météorologie (INM) and civil protection.';
I18N.en.outFrom = 'Forecast starts {d}. Source: Open-Meteo model forecast.';
I18N.en.outNone = 'No governorate shows heavy rain in the next 16 days (thresholds are demonstration values).';
I18N.en.outL1 = 'Attention'; I18N.en.outL2 = 'Watch';
I18N.en.outLine = '{r}: up to {p} mm forecast on {d}, {w} ({c} confidence).';
I18N.en.outSusc = ' Flood susceptibility here: {s}.';
I18N.en.outToday = 'today'; I18N.en.outAhead = '{n} days ahead';
I18N.en.outCH = 'higher'; I18N.en.outCM = 'medium'; I18N.en.outCL = 'low';

I18N.ar.outTitle = 'مراقبة الأمطار الغزيرة حسب الولاية (الـ16 يوماً القادمة)';
I18N.ar.outNote = 'هذه مراقبة للأمطار الغزيرة وليست توقعاً بحدوث فيضان. تحول المطر إلى فيضان يتوقف على شدته ورطوبة التربة وتصريف المياه، وهي أمور لا يراها هذا التطبيق. تقل موثوقية التوقعات كثيراً بعد نحو أسبوع. العتبات قيم تجريبية ولم يتم اختبار المؤشر على أحداث سابقة. للإنذارات الرسمية تابع المعهد الوطني للرصد الجوي (INM) والحماية المدنية.';
I18N.ar.outFrom = 'تبدأ التوقعات من {d}. المصدر: توقعات نموذج Open-Meteo.';
I18N.ar.outNone = 'لا توجد ولاية فيها أمطار غزيرة متوقعة خلال 16 يوماً القادمة (العتبات قيم تجريبية).';
I18N.ar.outL1 = 'انتباه'; I18N.ar.outL2 = 'ترقب';
I18N.ar.outLine = '{r}: حتى {p} مم متوقعة في {d}، {w} (الثقة {c}).';
I18N.ar.outSusc = ' القابلية للفيضان هنا: {s}.';
I18N.ar.outToday = 'اليوم'; I18N.ar.outAhead = 'بعد {n} أيام';
I18N.ar.outCH = 'أعلى'; I18N.ar.outCM = 'متوسطة'; I18N.ar.outCL = 'منخفضة';

// card in the side panel, above the hint
var oc = document.createElement('div');
oc.className = 'card'; oc.id = 'outlook'; oc.style.marginTop = '10px';
oc.innerHTML = '<h4 style="margin-top:0" data-i18n="outTitle"></h4><div id="outBody"></div>' +
               '<div class="note" data-i18n="outNote"></div>';
$('panel').insertBefore(oc, $('hint'));

function loadOutlook() {
  var la = REG.map(function (r) { return r[2]; }).join(',');
  var lo = REG.map(function (r) { return r[3]; }).join(',');
  getJson('https://api.open-meteo.com/v1/forecast?latitude=' + la + '&longitude=' + lo +
          '&daily=precipitation_sum&forecast_days=16&timezone=auto')
    .then(function (d) { OUT = Array.isArray(d) ? d : [d]; renderOutlook(); })
    .catch(function () { OUT = 'fail'; renderOutlook(); });
}

// mean flood susceptibility (0..1) in a 3x3 window around a point
function floodAt(lat, lon) {
  if (!pix.flood || !W) return null;
  var p = toXY(lat, lon), s = 0, n = 0;
  for (var dy = -1; dy <= 1; dy++) for (var dx = -1; dx <= 1; dx++) {
    var x = p.x + dx, y = p.y + dy;
    if (x < 0 || y < 0 || x >= W || y >= H) continue;
    s += pix.flood[(y * W + x) * 4] / 255; n++;
  }
  return n ? s / n : null;
}

function evalRegion(i) {
  var p = OUT[i].daily.precipitation_sum, best = null;
  var su = floodAt(REG[i][2], REG[i][3]);
  for (var d = 0; d < p.length; d++) {
    var v = p[d] || 0, v2 = v + (d > 0 ? (p[d - 1] || 0) : 0);
    var lv = (v >= OUT_T.watch1 || v2 >= OUT_T.watch2) ? 2 : (v >= OUT_T.att1 || v2 >= OUT_T.att2) ? 1 : 0;
    if (lv === 1 && su !== null && su >= 0.6) lv = 2;     // high susceptibility raises the level
    if (lv && (!best || lv > best.lv || (lv === best.lv && v > best.v))) best = {lv: lv, v: v, d: d};
  }
  if (best) { best.i = i; best.su = su; best.time = OUT[i].daily.time[best.d]; }
  return best;
}

function renderOutlook() {
  var box = $('outBody');
  if (!box) return;
  if (!OUT) { box.innerHTML = '<div class="note">' + t('fcLoading') + '</div>'; return; }
  if (OUT === 'fail') { box.innerHTML = '<div class="note">' + t('fcFail') + '</div>'; return; }
  var rows = [];
  REG.forEach(function (r, i) { var e = evalRegion(i); if (e) rows.push(e); });
  rows.sort(function (a, b) { return b.lv - a.lv || a.d - b.d; });
  var html = '<div class="note">' + t('outFrom', {d: fcDate(OUT[0].daily.time[0])}) + '</div>';
  if (!rows.length) html += '<div class="note"><b>' + t('outNone') + '</b></div>';
  rows.forEach(function (e) {
    var c = e.d <= 3 ? 'outCH' : e.d <= 7 ? 'outCM' : 'outCL';
    var when = e.d === 0 ? t('outToday') : t('outAhead', {n: e.d});
    var line = t('outLine', {
      r: LANG === 'ar' ? REG[e.i][1] : REG[e.i][0],
      p: '<bdi dir="ltr">' + e.v.toFixed(0) + '</bdi>',
      d: '<bdi dir="ltr">' + fcDate(e.time) + '</bdi>', w: when, c: t(c)
    });
    if (e.su !== null) line += t('outSusc', {s: t(e.su < 0.35 ? 'low' : e.su < 0.6 ? 'moderate' : 'high')});
    html += '<div style="background:#fff;border-radius:8px;padding:8px 10px;margin-top:6px;border-inline-start:4px solid ' +
            (e.lv === 2 ? '#c62828' : '#f9a825') + '"><b>' + t(e.lv === 2 ? 'outL2' : 'outL1') + '</b> · ' + line + '</div>';
  });
  box.innerHTML = html;
}

// redraw whenever the app refreshes (language change, flood image loaded...)
var _refreshAll = refreshAll;
refreshAll = function () { _refreshAll(); renderOutlook(); };

loadOutlook();
applyLang();

// ---------- always-visible "wettest governorates" list (below or above thresholds) ----------
I18N.en.outTop = 'Wettest governorates (shown even below the thresholds)';
I18N.en.outTopLine = '{r}: peak {p} mm on {d}, 16-day total {n} mm';
I18N.ar.outTop = 'أكثر الولايات أمطاراً (تُعرض حتى لو كانت دون العتبات)';
I18N.ar.outTopLine = '{r}: الذروة {p} مم في {d}، مجموع 16 يوماً {n} مم';

var _renderOutlook = renderOutlook;
renderOutlook = function () {
  _renderOutlook();
  var box = $('outBody');
  if (!box || !OUT || OUT === 'fail') return;
  var list = REG.map(function (r, i) {
    var p = OUT[i].daily.precipitation_sum, mx = 0, di = 0, tot = 0;
    p.forEach(function (v, d) { v = v || 0; tot += v; if (v > mx) { mx = v; di = d; } });
    return {i: i, mx: mx, di: di, tot: tot};
  }).sort(function (a, b) { return b.tot - a.tot; }).slice(0, 5);
  box.innerHTML += '<div class="note" style="margin-top:10px"><b>' + t('outTop') + '</b></div>' +
    list.map(function (e) {
      return '<div class="note">' + t('outTopLine', {
        r: LANG === 'ar' ? REG[e.i][1] : REG[e.i][0],
        p: '<bdi dir="ltr">' + e.mx.toFixed(1) + '</bdi>',
        d: '<bdi dir="ltr">' + fcDate(OUT[e.i].daily.time[e.di]) + '</bdi>',
        n: '<bdi dir="ltr">' + e.tot.toFixed(1) + '</bdi>'
      }) + '</div>';
    }).join('');
};
applyLang();
