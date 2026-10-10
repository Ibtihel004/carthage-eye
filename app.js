// ===================== CONFIG =====================
var X0 = 7.5, X1 = 11.7, LAT_N = 37.4, LAT_S = 30.2;
var BOUNDS = [[LAT_S, X0], [LAT_N, X1]];

function $(id) { return document.getElementById(id); }
function pad(m) { return (m < 10 ? '0' : '') + m; }
function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
function merc(lat) { return Math.log(Math.tan(Math.PI / 4 + lat * Math.PI / 360)); }
var MY0 = merc(LAT_N), MY1 = merc(LAT_S);

// Chart axes use dots, not commas, in every browser locale
Chart.defaults.locale = 'en-US';

// ===================== LANGUAGES =====================
var LANG = 'en';
var I18N = {
  en: {
    title: 'Tunisia Earth Watch',
    layerNdvi: 'Vegetation (NDVI)', layerNdwi: 'Water (NDWI)', layerRisk: 'Water stress (demo index)', layerTrend: 'Vegetation trend',
    layerUrban: 'Urban (built-up)',
    months: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],
    hint: 'Tap anywhere on Tunisia to analyse that place.',
    scenario: 'Scenario and area', rain: 'Rainfall', irr: 'Irrigation', radius: 'Radius',
    observed: 'Observed · Sentinel-2 2025', projection: 'Projection / scenario',
    yrObs: 'observed', yrProj: 'projection',
    ndvi: 'NDVI', ndwi: 'NDWI', riskL: 'water stress (demo)', trendL: 'NDVI trend / decade',
    low: 'Low', moderate: 'Moderate', high: 'High', severe: 'Severe',
    cWater: 'Open water or wet surface', cDense: 'Dense vegetation or irrigated crops', cCrop: 'Cropland or pasture',
    cSteppe: 'Steppe or sparse vegetation', cBare: 'Bare soil or desert',
    cUrban: 'Built-up or urban area',
    fcIndep: 'Live weather, independent of the year and scenario above.',
    fcRecsTitle: 'Suggested actions (draft, not official)',
    fcRecsDraft: 'Draft guidance. The thresholds ({a} mm and {b} mm per day) are demonstration values, not levels set by the national weather service or civil protection. Official sources will replace this text.',
    fcRecPrep: 'Before {d}: clear drains, gutters, culverts and ditches near you, and move equipment and stored goods off low ground.',
    fcRecWet: 'Rainy days forecast: {d}. Avoid fertiliser, pesticide and irrigation just before and on these days (runoff and waste). Delay sowing and heavy soil work until the soil drains.',
    fcRecHeavy: 'Heavy rain forecast on {d}. Avoid unnecessary travel. Never cross a flooded road or a flowing wadi. Follow instructions from the national weather service and civil protection.',
    fcRecFlow: 'River flow at the nearest modelled cell peaks around {d}. Keep away from river banks and low crossings around then.',
    fcRecDry: 'No significant rain in the next 16 days. Plan irrigation and check the water stress score above.',
    fcRecCrop: 'Which crops to plant or avoid depends on your region and season. Ask your regional agriculture office (CRDA). This app does not give crop advice yet.',
    fcRecLeave: 'This app cannot tell you when to leave home or stay. Only official warnings and civil-protection instructions can.',
    fcTitle: 'Live forecast (next 16 days)', fcRainT: 'Daily rainfall (mm)', fcFlowT: 'River discharge (m³/s)',
    fcLoading: 'Loading forecast...', fcFail: 'Forecast unavailable right now.',
    fcNoFlow: 'No river flow modelled here (zero or no data). This does not mean there is no flood risk.', fcTotal: '16-day rainfall total: {n} mm',
    fcNote: 'Weather and river data: Open-Meteo (model forecasts). River discharge comes from a coarse global model (about 5 km grid) and refers to the nearest river cell, not necessarily this point. Many Tunisian wadis flow only after storms, so values can be missing or wrong. This is not an official warning. For official warnings, follow the Institut National de la Météorologie (INM) and the national civil protection authority.',
    chartMonthly: 'Monthly indices', chartOutlook: 'Outlook: annual mean NDVI (indicative range)',
    recs: 'Recommendations',
    recHigh: 'High water stress. Prioritise irrigation and water allocation here.',
    recMod: 'Moderate stress. Monitor weekly and plan supplementary irrigation.',
    recLow: 'Vegetation and water conditions look stable.',
    recUrban: 'Built-up area. The vegetation-based water stress score does not describe cities, so ignore it here.',
    recDrop: 'NDVI dropped {n} since last month. Early stress warning.',
    recRise: 'NDVI is rising: vegetation is growing or recovering.',
    recWater: 'Open water or a very wet surface was detected.',
    recTrendDown: 'Long-term trend is negative ({n} NDVI per decade). Consider drought-resistant crops and soil conservation.',
    recTrendUp: 'Long-term trend is positive ({n} NDVI per decade).',
    recScenario: 'Scenario effect: risk moves from {a} to {b}.',
    recFuture: 'By {y}, the trend model projects NDVI to change by {d} compared with 2025 here.',
    specTitle: 'Reference spectral signature',
    specNote: 'Typical Sentinel-2 reflectance for this surface type (reference, not measured). Hyperspectral sensors such as EnMAP, PRISMA and EMIT provide 200+ bands here.',
    btnCompare: 'Compare with another place', btnCompareOn: 'Click a second place on the map...',
    btnClearB: 'Clear comparison', btnCsv: 'Download CSV',
    natTitle: 'Tunisia overview', natHigh: 'Land at high or severe stress (demo index)', natNdvi: 'Mean NDVI',
    natNote: 'Relative demonstration index from NDVI and NDWI. Not a forecast and not validated yet.',
    noData: 'No data here (sea, cloud or outside Tunisia).', unknown: 'Unknown place',
    loading: 'Loading satellite data',
    trendMissing: 'Trend images (data/trend_slope_XX.png) not found. Projections use only the scenario sliders.',
    areaTxt: 'about {n} km² analysed', placeB: 'Place B',
    method: 'Data: Sentinel-2 surface reflectance (2025 monthly median, cloud-masked) and MODIS NDVI trend 2010-2025, processed in Google Earth Engine. Projection = 2025 observed + trend × years. Scenario sliders are assumptions, not a forecast. The risk score is a demonstration index.',
    legTrend: 'NDVI per decade',
    ensoTitle: 'El Niño status (NOAA)', ensoRecord: 'Chance of record strength, Oct–Dec',
    ensoIssued: 'Issued', ensoNext: 'Next update',
    ensoStale: 'This status may be out of date. Check NOAA before relying on it.',
    ensoNote: 'El Niño strongly affects the tropics, but its effect on Tunisian rainfall is weak and uncertain. This is context, not a Tunisia forecast.'
  },
  ar: {
    title: 'مرصد تونس من الفضاء',
    layerNdvi: 'الغطاء النباتي (NDVI)', layerNdwi: 'المياه (NDWI)', layerRisk: 'الإجهاد المائي (مؤشر تجريبي)', layerTrend: 'اتجاه الغطاء النباتي',
    layerUrban: 'العمران (المناطق المبنية)',
    months: ['جانفي','فيفري','مارس','أفريل','ماي','جوان','جويلية','أوت','سبتمبر','أكتوبر','نوفمبر','ديسمبر'],
    hint: 'اضغط على أي مكان في تونس لتحليله.',
    scenario: 'السيناريو والمساحة', rain: 'الأمطار', irr: 'الري', radius: 'الشعاع',
    observed: 'مرصود · Sentinel-2 لسنة 2025', projection: 'إسقاط / سيناريو',
    yrObs: 'مرصود', yrProj: 'إسقاط',
    ndvi: 'NDVI', ndwi: 'NDWI', riskL: 'الإجهاد المائي (تجريبي)', trendL: 'اتجاه NDVI لكل عقد',
    low: 'منخفض', moderate: 'متوسط', high: 'مرتفع', severe: 'حاد',
    cWater: 'مياه مفتوحة أو سطح رطب', cDense: 'غطاء نباتي كثيف أو محاصيل مسقية', cCrop: 'أراضٍ زراعية أو مراعٍ',
    cSteppe: 'سهوب أو غطاء نباتي متفرق', cBare: 'تربة جرداء أو صحراء',
    cUrban: 'منطقة عمرانية أو مبنية',
    fcIndep: 'طقس مباشر، مستقل عن السنة والسيناريو أعلاه.',
    fcRecsTitle: 'إجراءات مقترحة (مسودة، غير رسمية)',
    fcRecsDraft: 'مسودة إرشادات. العتبات ({a} مم و{b} مم في اليوم) قيم تجريبية وليست مستويات حددتها مصلحة الرصد الجوي الوطنية أو الحماية المدنية. ستحل مصادر رسمية محل هذا النص.',
    fcRecPrep: 'قبل {d}: نظّف المصارف والميازيب والقنوات والخنادق القريبة منك، وانقل المعدات والمخزون بعيداً عن الأماكن المنخفضة.',
    fcRecWet: 'أيام ممطرة متوقعة: {d}. تجنب التسميد ورش المبيدات والري قبل هذه الأيام وخلالها (جريان سطحي وهدر). أجّل البذر وأشغال التربة الثقيلة حتى تصرّف التربة المياه.',
    fcRecHeavy: 'أمطار غزيرة متوقعة في {d}. تجنب التنقل غير الضروري. لا تعبر طريقاً غمرته المياه ولا وادياً جارياً. اتبع تعليمات مصلحة الرصد الجوي الوطنية والحماية المدنية.',
    fcRecFlow: 'يبلغ تدفق النهر في أقرب خلية مُنمذجة ذروته حوالي {d}. ابتعد عن ضفاف الأنهار والمعابر المنخفضة في ذلك الوقت.',
    fcRecDry: 'لا أمطار مهمة متوقعة خلال 16 يوماً القادمة. خطط للري وراجع مؤشر الإجهاد المائي أعلاه.',
    fcRecCrop: 'اختيار المحاصيل التي تُزرع أو تُتجنب يتوقف على جهتك وموسمك. استشر المندوبية الجهوية للتنمية الفلاحية (CRDA). هذا التطبيق لا يقدم نصائح زراعية بعد.',
    fcRecLeave: 'لا يستطيع هذا التطبيق أن يخبرك متى تغادر منزلك أو تبقى فيه. فقط الإنذارات الرسمية وتعليمات الحماية المدنية تفعل ذلك.',
    fcTitle: 'توقعات مباشرة (الأيام الـ16 القادمة)', fcRainT: 'الأمطار اليومية (مم)', fcFlowT: 'تدفق الأودية (م³/ث)',
    fcLoading: 'جاري تحميل التوقعات...', fcFail: 'التوقعات غير متاحة حالياً.',
    fcNoFlow: 'لا يوجد تدفق نهري في النموذج هنا (صفر أو بلا بيانات). هذا لا يعني انعدام خطر الفيضان.', fcTotal: 'مجموع الأمطار خلال 16 يوماً: {n} مم',
    fcNote: 'بيانات الطقس والأودية: Open-Meteo (توقعات نماذج). يأتي تدفق الأودية من نموذج عالمي منخفض الدقة (شبكة بحدود 5 كم) ويخص أقرب خلية نهر وليس بالضرورة هذه النقطة. كثير من الأودية التونسية لا تجري إلا بعد العواصف، لذلك قد تكون القيم مفقودة أو غير صحيحة. هذا ليس إنذاراً رسمياً. للإنذارات الرسمية تابع المعهد الوطني للرصد الجوي (INM) والسلطة الوطنية للحماية المدنية.',
    chartMonthly: 'المؤشرات الشهرية', chartOutlook: 'التوقعات: متوسط NDVI السنوي (مجال تقريبي)',
    recs: 'التوصيات',
    recHigh: 'إجهاد مائي مرتفع. أعطِ الأولوية للري وتوزيع المياه هنا.',
    recMod: 'إجهاد متوسط. تابع أسبوعياً وخطط لري تكميلي.',
    recLow: 'حالة الغطاء النباتي والمياه مستقرة.',
    recUrban: 'منطقة مبنية. مؤشر الإجهاد المائي المبني على الغطاء النباتي لا يصف المدن، لذلك تجاهله هنا.',
    recDrop: 'انخفض NDVI بمقدار {n} مقارنة بالشهر السابق. إنذار مبكر للإجهاد.',
    recRise: 'NDVI في ارتفاع: الغطاء النباتي ينمو أو يتعافى.',
    recWater: 'تم رصد مياه مفتوحة أو سطح شديد الرطوبة.',
    recTrendDown: 'الاتجاه طويل المدى سلبي ({n} NDVI لكل عقد). فكّر في محاصيل مقاومة للجفاف وحماية التربة.',
    recTrendUp: 'الاتجاه طويل المدى إيجابي ({n} NDVI لكل عقد).',
    recScenario: 'أثر السيناريو: يتغير الخطر من {a} إلى {b}.',
    recFuture: 'بحلول {y} يتوقع نموذج الاتجاه أن يتغير NDVI بمقدار {d} مقارنة بسنة 2025 هنا.',
    specTitle: 'البصمة الطيفية المرجعية',
    specNote: 'انعكاسية Sentinel-2 النموذجية لهذا النوع من السطوح (مرجعية وغير مقاسة). توفر المستشعرات فائقة الطيف مثل EnMAP وPRISMA وEMIT أكثر من 200 نطاق هنا.',
    btnCompare: 'قارن مع مكان آخر', btnCompareOn: 'اضغط على مكان ثانٍ في الخريطة...',
    btnClearB: 'إلغاء المقارنة', btnCsv: 'تحميل CSV',
    natTitle: 'نظرة عامة على تونس', natHigh: 'مساحة معرضة لإجهاد مرتفع أو حاد (مؤشر تجريبي)', natNdvi: 'متوسط NDVI',
    natNote: 'مؤشر نسبي تجريبي مبني على NDVI وNDWI. ليس توقعاً ولم يتم التحقق منه بعد.',
    noData: 'لا توجد بيانات هنا (بحر أو سحب أو خارج تونس).', unknown: 'مكان غير معروف',
    loading: 'جاري تحميل بيانات الأقمار الاصطناعية',
    trendMissing: 'لم يتم العثور على صور الاتجاه (data/trend_slope_XX.png). تعتمد الإسقاطات على منزلقات السيناريو فقط.',
    areaTxt: 'حوالي {n} كم² تم تحليلها', placeB: 'المكان ب',
    method: 'البيانات: انعكاسية سطح Sentinel-2 (وسيط شهري لسنة 2025 بعد إزالة السحب) واتجاه NDVI من MODIS للفترة 2010-2025 عبر Google Earth Engine. الإسقاط = القيمة المرصودة لسنة 2025 + الاتجاه × عدد السنوات. منزلقات السيناريو مجرد افتراضات وليست تنبؤاً. مؤشر الخطر هو مؤشر توضيحي.',
    legTrend: 'NDVI لكل عقد',
    ensoTitle: 'حالة النينيو (NOAA)', ensoRecord: 'احتمال بلوغ قوة قياسية، أكتوبر–ديسمبر',
    ensoIssued: 'صدر في', ensoNext: 'التحديث القادم',
    ensoStale: 'قد تكون هذه الحالة قديمة. تحقق من NOAA قبل الاعتماد عليها.',
    ensoNote: 'يؤثر النينيو بقوة على المناطق المدارية، لكن تأثيره على أمطار تونس ضعيف وغير مؤكد. هذه معلومة سياقية وليست توقعاً لتونس.'
  }
};
function t(k, p) {
  var s = I18N[LANG][k];
  if (s === undefined) s = I18N.en[k];
  if (p) for (var q in p) s = s.replace('{' + q + '}', p[q]);
  return s;
}

// ===================== COLOURS =====================
var STOPS = {
  ndvi: [[0,140,81,10],[0.25,166,97,26],[0.35,223,194,125],[0.5,166,217,106],[0.7,26,150,65],[1,0,90,40]],
  ndwi: [[0,166,97,26],[0.4,245,245,220],[0.6,166,206,227],[0.8,31,120,180],[1,8,48,107]],
  risk: [[0,26,150,65],[0.25,166,217,106],[0.5,254,224,139],[0.75,244,109,67],[1,165,0,38]],
  trend: [[0,140,81,10],[0.5,245,245,245],[1,26,150,65]],
  urban: [[0,255,255,255],[0.3,253,224,139],[0.6,244,109,67],[1,128,0,38]]
};
function ramp(v, stops) {
  for (var k = 1; k < stops.length; k++) {
    if (v <= stops[k][0]) {
      var a = stops[k - 1], b = stops[k];
      var f = (v - a[0]) / (b[0] - a[0]);
      return [a[1] + f * (b[1] - a[1]), a[2] + f * (b[2] - a[2]), a[3] + f * (b[3] - a[3])];
    }
  }
  var l = stops[stops.length - 1];
  return [l[1], l[2], l[3]];
}
function makeLut(stops) {
  var lut = new Uint8ClampedArray(256 * 3);
  for (var i = 0; i < 256; i++) {
    var c = ramp(i / 255, stops);
    lut[i * 3] = c[0]; lut[i * 3 + 1] = c[1]; lut[i * 3 + 2] = c[2];
  }
  return lut;
}
var LUTS = {};
for (var key in STOPS) LUTS[key] = makeLut(STOPS[key]);
function gradientCss(stops) {
  return 'linear-gradient(90deg,' + stops.map(function (s) {
    return 'rgb(' + s[1] + ',' + s[2] + ',' + s[3] + ') ' + Math.round(s[0] * 100) + '%';
  }).join(',') + ')';
}

// ===================== MODEL =====================
function projND(nd, sl, dy, rain, irr) {
  var v = nd + sl * dy;                                  // trend projection
  v = Math.max(-0.2, Math.min(0.9, v));
  v = v * (1 + 0.5 * rain / 100) + 0.12 * (irr / 100) * Math.max(0, 1 - Math.max(0, v) / 0.6);  // scenario
  return Math.max(-0.2, Math.min(0.9, v));
}
function projNW(nw, rain, irr) {
  return Math.max(-0.6, Math.min(0.8, nw + 0.2 * rain / 100 + 0.1 * irr / 100));
}
function riskOf(nd, nw) {
  var r = Math.round(100 * (1 - 0.8 * clamp01(nd / 0.5) - 0.2 * clamp01((nw + 0.6) / 0.6)));
  return Math.max(0, Math.min(100, r));
}
function levelOf(r) { return r < 25 ? 'low' : r < 50 ? 'moderate' : r < 75 ? 'high' : 'severe'; }

// Mean built-up share above this counts as urban. Tune it with builtAt(A) in the console.
var URBAN_T = 0.15;

// Built-up share (0..1) around a clicked pixel, 3x3 window (~3 km)
function builtAt(P) {
  if (!pix.built) return 0;
  var s = 0, n = 0;
  for (var dy = -1; dy <= 1; dy++) {
    for (var dx = -1; dx <= 1; dx++) {
      var x = P.x + dx, y = P.y + dy;
      if (x < 0 || y < 0 || x >= W || y >= H) continue;
      s += pix.built[(y * W + x) * 4] / 255; n++;
    }
  }
  return n ? s / n : 0;
}
function classify(nd, nw, bu) {
  if (nw > 0.05) return 'cWater';
  if (bu > URBAN_T) return 'cUrban';
  if (nd > 0.45) return 'cDense';
  if (nd > 0.28) return 'cCrop';
  if (nd > 0.15) return 'cSteppe';
  return 'cBare';
}
var SPEC = {
  cWater:  [.06,.05,.03,.02,.01,.005,.003],
  cDense:  [.04,.08,.04,.20,.45,.25,.12],
  cCrop:   [.05,.09,.06,.18,.38,.26,.14],
  cSteppe: [.07,.10,.10,.15,.25,.30,.22],
  cBare:   [.12,.16,.20,.24,.28,.35,.33],
  cUrban:  [.10,.12,.14,.16,.20,.25,.22]
};

// ===================== STATE =====================
var layerName = 'ndvi', month = 4, year = 2025, sRain = 0, sIrr = 0, sRad = 5;
var pix = {ndvi: {}, ndwi: {}, trend: {}, built: null};
var W = 0, H = 0, loaded = 0, trendCount = 0, meanSlope = null;
var overlay = null, urlCache = {}, A = null, B = null, compareMode = false;
var timer = null, charts = {};
var ENSO = null;

// ===================== MAP =====================
var map = L.map('map').setView([34, 9.5], 6);
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);
var pins = L.layerGroup().addTo(map);

// ===================== IMAGE LOADING =====================
function loadImg(url, ok, fail) {
  var img = new Image();
  img.onload = function () { ok(img); };
  img.onerror = fail;
  img.src = url;
}
function toPixels(img) {
  if (!W) { W = img.naturalWidth; H = img.naturalHeight; }
  var c = document.createElement('canvas');
  c.width = W; c.height = H;
  var ctx = c.getContext('2d', {willReadFrequently: true});
  ctx.drawImage(img, 0, 0, W, H);
  return ctx.getImageData(0, 0, W, H).data;
}
function loadBase(name, m, tries) {
  var url = 'data/' + name + '_' + pad(m) + '.png';
  loadImg(url, function (img) {
    if (!img.naturalWidth) {
      if (tries < 3) setTimeout(function () { loadBase(name, m, tries + 1); }, 300);
      else console.error('EMPTY IMAGE: ' + url);
      return;
    }
    pix[name][m] = toPixels(img);
    loaded++;
    $('loadTxt').textContent = loaded + '/24';
    if (loaded === 24) onBaseReady();
  }, function () { console.error('CANNOT LOAD: ' + url); });
}
function loadBuilt() {
  loadImg('data/built.png', function (img) {
    if (!img.naturalWidth) { console.error('EMPTY IMAGE: data/built.png'); return; }
    pix.built = toPixels(img);
    urlCache = {};
    refreshAll();
  }, function () { console.error('CANNOT LOAD: data/built.png'); });
}
function onBaseReady() {
  $('loading').style.display = 'none';
  refreshAll();
  loadBuilt();
  var done = 0;
  function finish() {
    if (++done < 12) return;
    if (trendCount) {
      meanSlope = new Float32Array(W * H);
      for (var p = 0; p < W * H; p++) {
        var s = 0, n = 0;
        for (var m = 1; m <= 12; m++) {
          var d = pix.trend[m];
          if (d && d[p * 4 + 3] !== 0) { s += -0.02 + d[p * 4] / 255 * 0.04; n++; }
        }
        meanSlope[p] = n ? s / n : 0;
      }
    }
    $('trendNote').style.display = trendCount ? 'none' : 'block';
    urlCache = {};
    refreshAll();
  }
  for (var m = 1; m <= 12; m++) loadTrend(m, finish);
}
function loadTrend(m, finish) {
  loadImg('data/trend_slope_' + pad(m) + '.png', function (img) {
    if (img.naturalWidth) { pix.trend[m] = toPixels(img); trendCount++; }
    finish();
  }, finish);
}
['ndvi', 'ndwi'].forEach(function (name) {
  for (var m = 1; m <= 12; m++) loadBase(name, m, 0);
});

function slopeAtIndex(m, i) {
  var d = pix.trend[m];
  if (!d || d[i + 3] === 0) return 0;
  return -0.02 + d[i] / 255 * 0.04;
}

// ===================== MAP LAYER =====================
function layerUrl() {
  var key = [layerName, month, year, sRain, sIrr].join('|');
  if (urlCache[key]) return urlCache[key];
  var dn = pix.ndvi[month], dw = pix.ndwi[month];
  if (!dn || !dw) return null;
  if (layerName === 'urban' && !pix.built) return null;
  var c = document.createElement('canvas');
  c.width = W; c.height = H;
  var ctx = c.getContext('2d');
  var out = ctx.createImageData(W, H), o = out.data;
  var lut = LUTS[layerName], dy = year - 2025;
  for (var i = 0, p = 0; i < dn.length; i += 4, p++) {
    if (dn[i + 3] === 0) continue;
    var tt;
    if (layerName === 'trend') {
      tt = meanSlope ? clamp01((meanSlope[p] * 10 + 0.05) / 0.10) : 0.5;
    } else if (layerName === 'urban') {
      tt = clamp01(pix.built[i] / 77);   // 77 = 0.3 x 255, stretches the low values so towns show
    } else {
      var nd = -0.2 + dn[i] / 255, nw = -0.6 + dw[i] / 255;
      var a = projND(nd, slopeAtIndex(month, i), dy, sRain, sIrr);
      var b = projNW(nw, sRain, sIrr);
      if (layerName === 'ndvi') tt = clamp01(a + 0.2);
      else if (layerName === 'ndwi') tt = clamp01(b + 0.6);
      else tt = riskOf(a, b) / 100;
    }
    var k = Math.round(tt * 255) * 3;
    o[i] = lut[k]; o[i + 1] = lut[k + 1]; o[i + 2] = lut[k + 2]; o[i + 3] = 255;
  }
  ctx.putImageData(out, 0, 0);
  var url = c.toDataURL();
  if (Object.keys(urlCache).length > 40) urlCache = {};
  urlCache[key] = url;
  return url;
}
function paintMap() {
  var url = layerUrl();
  if (!url) return;
  var op = $('opac').value / 100;
  if (!overlay) overlay = L.imageOverlay(url, BOUNDS, {opacity: op}).addTo(map);
  else overlay.setUrl(url);
}
function buildLegend() {
  $('legBar').style.background = gradientCss(STOPS[layerName]);
  var lo, hi;
  if (layerName === 'ndvi') { lo = '-0.2'; hi = '0.8'; }
  else if (layerName === 'ndwi') { lo = '-0.6'; hi = '0.4'; }
  else if (layerName === 'risk') { lo = t('low'); hi = t('severe'); }
  else if (layerName === 'urban') { lo = '0'; hi = '0.3+'; }
  else { lo = '-0.05 ' + t('legTrend'); hi = '+0.05'; }
  $('legLo').textContent = lo;
  $('legHi').textContent = hi;
}

// ===================== NATIONAL OVERVIEW =====================
function renderNational() {
  var dn = pix.ndvi[month], dw = pix.ndwi[month];
  if (!dn || !dw) return;
  var dy = year - 2025, tot = 0, hi = 0, sum = 0;
  for (var y = 0; y < H; y += 2) {
    for (var x = 0; x < W; x += 2) {
      var i = (y * W + x) * 4;
      if (dn[i + 3] === 0) continue;
      var a = projND(-0.2 + dn[i] / 255, slopeAtIndex(month, i), dy, sRain, sIrr);
      var b = projNW(-0.6 + dw[i] / 255, sRain, sIrr);
      tot++; sum += a;
      if (riskOf(a, b) >= 50) hi++;
    }
  }
  if (!tot) return;
  $('natHighV').textContent = Math.round(100 * hi / tot) + '%';
  $('natNdviV').textContent = (sum / tot).toFixed(2);
}

// ===================== SAMPLING =====================
function toXY(lat, lon) {
  return {
    x: Math.round((lon - X0) / (X1 - X0) * (W - 1)),
    y: Math.round((MY0 - merc(lat)) / (MY0 - MY1) * (H - 1))
  };
}
function rawSeries(P) {
  var r = [], rp = Math.max(0, Math.round(sRad));
  for (var m = 1; m <= 12; m++) {
    var s = 0, w = 0, sl = 0, n = 0, dn = pix.ndvi[m], dw = pix.ndwi[m];
    if (dn && dw) {
      for (var dy = -rp; dy <= rp; dy++) {
        for (var dx = -rp; dx <= rp; dx++) {
          if (dx * dx + dy * dy > rp * rp) continue;
          var x = P.x + dx, y = P.y + dy;
          if (x < 0 || y < 0 || x >= W || y >= H) continue;
          var i = (y * W + x) * 4;
          if (dn[i + 3] === 0) continue;
          s += -0.2 + dn[i] / 255; w += -0.6 + dw[i] / 255; sl += slopeAtIndex(m, i); n++;
        }
      }
    }
    r.push(n ? {nd: s / n, nw: w / n, sl: sl / n} : null);
  }
  return r;
}
function fromRaw(raw, Y, rn, ir) {
  var dy = Y - 2025;
  return raw.map(function (r) {
    return r ? {nd: projND(r.nd, r.sl, dy, rn, ir), nw: projNW(r.nw, rn, ir), sl: r.sl} : null;
  });
}
function avg(a) { return a.length ? a.reduce(function (x, y) { return x + y; }, 0) / a.length : null; }

// ===================== CHARTS =====================
function mk(id, cfg) {
  if (charts[id]) charts[id].destroy();
  cfg.options = cfg.options || {};
  cfg.options.animation = false;
  charts[id] = new Chart($(id), cfg);
}
function killCharts() {
  for (var id in charts) { charts[id].destroy(); delete charts[id]; }
}

// ===================== PANEL =====================
function updateNames() {
  if (A) $('pname').textContent = A.name;
}
function renderPanel() {
  if (!A) { $('hint').style.display = 'block'; $('content').style.display = 'none'; return; }
  $('hint').style.display = 'none';
  $('content').style.display = 'block';
  updateNames();

  var raw = rawSeries(A);
  var ser = fromRaw(raw, year, sRain, sIrr), base = fromRaw(raw, 2025, 0, 0);
  var cur = ser[month - 1];
  var anyData = raw.some(function (r) { return r; });
  var isObs = (year === 2025 && sRain === 0 && sIrr === 0);
  var months = I18N[LANG].months;

  $('pmeta').innerHTML =
    '<bdi dir="ltr">' + A.lat.toFixed(3) + ' N, ' + A.lon.toFixed(3) + ' E</bdi> · ' +
    t('areaTxt', {n: Math.max(1, Math.round(Math.PI * sRad * sRad))});
  $('badge').className = 'badge ' + (isObs ? 'obs' : 'proj');
  $('badge').textContent = t(isObs ? 'observed' : 'projection');

  if (!anyData) {
    $('pclass').textContent = t('noData');
    ['kNdvi', 'kNdwi', 'kRisk', 'kTrend'].forEach(function (id) { $(id).textContent = '-'; });
    $('riskFill').style.width = '0';
    $('precs').innerHTML = '';
    killCharts();
    renderB();
    return;
  }

  var slopes = raw.filter(Boolean).map(function (r) { return r.sl; });
  var tdec = avg(slopes) * 10;
  $('kTrend').textContent = (tdec >= 0 ? '+' : '') + tdec.toFixed(3);

  if (cur) {
    var rsk = riskOf(cur.nd, cur.nw), lvl = levelOf(rsk), cls = classify(cur.nd, cur.nw, builtAt(A));
    $('kNdvi').textContent = cur.nd.toFixed(2);
    $('kNdwi').textContent = cur.nw.toFixed(2);
    $('kRisk').textContent = t(lvl) + ' · ' + rsk;
    $('pclass').textContent = t(cls);
    var k = Math.round(rsk / 100 * 255) * 3, L = LUTS.risk;
    $('riskFill').style.width = rsk + '%';
    $('riskFill').style.background = 'rgb(' + L[k] + ',' + L[k + 1] + ',' + L[k + 2] + ')';

    // recommendations
    var recs = [];
    if (cls === 'cUrban') recs.push(t('recUrban'));
    else recs.push(t(rsk >= 50 ? 'recHigh' : rsk >= 25 ? 'recMod' : 'recLow'));
    var prev = ser[(month + 10) % 12];
    if (cls !== 'cUrban') {
      if (prev && cur.nd < prev.nd - 0.05) recs.push(t('recDrop', {n: (prev.nd - cur.nd).toFixed(2)}));
      if (prev && cur.nd > prev.nd + 0.05) recs.push(t('recRise'));
    }
    if (cls === 'cWater') recs.push(t('recWater'));
    if (trendCount && tdec < -0.01) recs.push(t('recTrendDown', {n: tdec.toFixed(3)}));
    else if (trendCount && tdec > 0.01) recs.push(t('recTrendUp', {n: '+' + tdec.toFixed(3)}));
    if (year > 2025 && base[month - 1]) {
      var dd = cur.nd - base[month - 1].nd;
      recs.push(t('recFuture', {y: year, d: (dd >= 0 ? '+' : '') + dd.toFixed(3)}));
    }
    if (!isObs && (sRain !== 0 || sIrr !== 0) && base[month - 1]) {
      var r0 = riskOf(base[month - 1].nd, base[month - 1].nw);
      recs.push(t('recScenario', {a: t(levelOf(r0)), b: t(lvl)}));
    }
    $('precs').innerHTML = recs.map(function (x) { return '<div>' + x + '</div>'; }).join('');

    // spectral reference signature
    mk('cSpec', {
      type: 'line',
      data: {
        labels: ['490', '560', '665', '705', '842', '1610', '2190'],
        datasets: [{label: t(cls), data: SPEC[cls], borderColor: '#6a1b9a', tension: .3, pointRadius: 3}]
      },
      options: {
        plugins: {legend: {display: false}},
        scales: {y: {min: 0, max: 0.6, title: {display: true, text: 'Reflectance'}},
                 x: {title: {display: true, text: 'nm'}}}
      }
    });
  } else {
    ['kNdvi', 'kNdwi', 'kRisk'].forEach(function (id) { $(id).textContent = '-'; });
    $('pclass').textContent = t('noData');
    $('precs').innerHTML = '';
  }

  // monthly chart
  var ds = [{label: 'NDVI' + (isObs ? '' : ' ' + year), data: ser.map(function (a) { return a ? a.nd : null; }),
             borderColor: '#2e7d32', backgroundColor: '#2e7d32', tension: .3, spanGaps: true,
             pointRadius: ser.map(function (a, i) { return i === month - 1 ? 5 : 2; })}];
  if (!isObs) ds.push({label: 'NDVI 2025', data: base.map(function (a) { return a ? a.nd : null; }),
             borderColor: '#9e9e9e', borderDash: [5, 4], pointRadius: 0, tension: .3, spanGaps: true});
  ds.push({label: 'NDWI' + (isObs ? '' : ' ' + year), data: ser.map(function (a) { return a ? a.nw : null; }),
             borderColor: '#1565c0', backgroundColor: '#1565c0', tension: .3, spanGaps: true, pointRadius: 2});
  if (B) {
    var serB = fromRaw(rawSeries(B), year, sRain, sIrr);
    ds.push({label: 'NDVI ' + t('placeB'), data: serB.map(function (a) { return a ? a.nd : null; }),
             borderColor: '#ef6c00', backgroundColor: '#ef6c00', tension: .3, spanGaps: true, pointRadius: 2});
  }
  mk('cMonthly', {type: 'line', data: {labels: months, datasets: ds},
                  options: {plugins: {legend: {position: 'bottom'}}}});

  // outlook chart (2025 to 2032)
  var yrs = [], mean = [], up = [], lo = [];
  for (var Y = 2025; Y <= 2032; Y++) {
    var s = fromRaw(raw, Y, sRain, sIrr).filter(Boolean).map(function (a) { return a.nd; });
    var mv = avg(s), bnd = 0.03 * Math.sqrt(Y - 2025);
    yrs.push(Y); mean.push(mv); up.push(mv + bnd); lo.push(mv - bnd);
  }
  mk('cOutlook', {
    type: 'line',
    data: {labels: yrs, datasets: [
      {label: 'NDVI', data: mean, borderColor: '#2e7d32', tension: .3, pointRadius: 3},
      {label: 'upper', data: up, borderWidth: 0, pointRadius: 0, tension: .3},
      {label: 'lower', data: lo, borderWidth: 0, pointRadius: 0, tension: .3, fill: '-1', backgroundColor: 'rgba(46,125,50,0.15)'}
    ]},
    options: {plugins: {legend: {display: false}}}
  });
  renderB();
}
function renderB() {
  var box = $('bInfo');
  if (!B) { box.style.display = 'none'; return; }
  var s = fromRaw(rawSeries(B), year, sRain, sIrr)[month - 1];
  box.style.display = 'block';
  if (!s) { box.textContent = t('placeB') + ': ' + B.name + ' · ' + t('noData'); return; }
  var r = riskOf(s.nd, s.nw);
  box.textContent = t('placeB') + ': ' + B.name + ' · NDVI ' + s.nd.toFixed(2) + ' · ' + t('riskL') + ' ' + t(levelOf(r)) + ' (' + r + ')';
}

// ===================== PINS =====================
function drawPins() {
  pins.clearLayers();
  [[A, '#1565c0', 'A'], [B, '#ef6c00', 'B']].forEach(function (x) {
    if (!x[0]) return;
    L.circle([x[0].lat, x[0].lon], {radius: Math.max(sRad, 1) * 1000, color: x[1], weight: 2, fillOpacity: 0.1}).addTo(pins);
    L.circleMarker([x[0].lat, x[0].lon], {radius: 5, color: x[1], fillOpacity: 1})
      .bindTooltip(x[2], {permanent: true, direction: 'top'}).addTo(pins);
  });
}
function fetchName(P) {
  P.name = '...';
  fetch('https://nominatim.openstreetmap.org/reverse?format=json&zoom=12&accept-language=' + LANG +
        '&lat=' + P.lat + '&lon=' + P.lon)
    .then(function (r) { return r.json(); })
    .then(function (d) {
      var a = d.address || {};
      var n = a.city || a.town || a.village || a.suburb || a.county || a.state || t('unknown');
      P.name = n + ((a.state && a.state !== n) ? ', ' + a.state : '');
      updateNames(); renderB();
    })
    .catch(function () { P.name = t('unknown'); updateNames(); renderB(); });
}

// ===================== LIVE FORECAST (Open-Meteo) =====================
var FC = null;
function getJson(url) {
  return fetch(url).then(function (r) {
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return r.json();
  });
}
function loadForecast(P) {
  FC = {state: 'loading'};
  renderForecast();
  var q = 'latitude=' + P.lat.toFixed(3) + '&longitude=' + P.lon.toFixed(3) + '&forecast_days=16&timezone=auto';
  Promise.allSettled([
    getJson('https://api.open-meteo.com/v1/forecast?' + q + '&daily=precipitation_sum'),
    getJson('https://flood-api.open-meteo.com/v1/flood?' + q + '&daily=river_discharge')
  ]).then(function (res) {
    if (P !== A) return;                      // ignore stale answers after a new click
    FC = {
      state: 'done',
      rain: res[0].status === 'fulfilled' ? res[0].value.daily : null,
      flow: res[1].status === 'fulfilled' ? res[1].value.daily : null
    };
    renderForecast();
  });
}
function dropFcChart(id) {
  if (charts[id]) { charts[id].destroy(); delete charts[id]; }
  var c = $(id);
  if (c) c.style.display = 'none';
}
// Demo thresholds in mm per day. NOT official levels: replace with national weather service levels.
var FC_WET = 10, FC_HEAVY = 30;
function fcDate(d) { return d.slice(8) + '/' + d.slice(5, 7); }
function clearFcRecs() { var b = $('fcRecs'); if (b) b.innerHTML = ''; }
function showFcRecs(rain, flow) {
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
    recs.push(t('fcRecFlow', {d: fcDate(flow.time[pk])}));
  }
  recs.push(t('fcRecCrop'));
  recs.push(t('fcRecLeave'));
  var card = 'background:#fff;border-radius:8px;padding:8px 10px;margin-bottom:6px';
  box.innerHTML = '<h4>' + t('fcRecsTitle') + '</h4>' +
    '<div class="note">' + t('fcRecsDraft', {a: FC_WET, b: FC_HEAVY}) + '</div>' +
    recs.map(function (x) { return '<div style="' + card + '">' + x + '</div>'; }).join('');
}
function renderForecast() {
  var st = $('fcStatus');
  if (!st || !$('cFcRain') || !A || !FC) return;
  if (FC.state === 'loading') {
    st.textContent = t('fcIndep') + ' ' + t('fcLoading');
    clearFcRecs();
    dropFcChart('cFcRain'); dropFcChart('cFcFlow');
    return;
  }
  var rain = FC.rain, flow = FC.flow;
  if (!rain || !rain.time || !rain.precipitation_sum) {
    st.textContent = t('fcIndep') + ' ' + t('fcFail');
    clearFcRecs();
    dropFcChart('cFcRain'); dropFcChart('cFcFlow');
    return;
  }
  var days = rain.time.map(function (d) { return d.slice(5); });
  var tot = rain.precipitation_sum.reduce(function (a, v) { return a + (v || 0); }, 0);
  st.textContent = t('fcIndep') + ' ' + t('fcTotal', {n: tot.toFixed(1)});
  $('cFcRain').style.display = 'block';
  mk('cFcRain', {
    type: 'bar',
    data: {labels: days, datasets: [{label: t('fcRainT'), data: rain.precipitation_sum, backgroundColor: '#1565c0'}]},
    options: {plugins: {legend: {position: 'bottom'}}}
  });
  var hasFlow = flow && flow.river_discharge && flow.river_discharge.some(function (v) { return v !== null && v !== undefined && v > 0; });
  showFcRecs(rain, hasFlow ? flow : null);
  if (!hasFlow) {
    st.textContent += ' · ' + t('fcNoFlow');
    dropFcChart('cFcFlow');
    return;
  }
  $('cFcFlow').style.display = 'block';
  mk('cFcFlow', {
    type: 'line',
    data: {labels: flow.time.map(function (d) { return d.slice(5); }),
           datasets: [{label: t('fcFlowT'), data: flow.river_discharge, borderColor: '#00838f',
                       backgroundColor: '#00838f', tension: .3, pointRadius: 2, spanGaps: true}]},
    options: {plugins: {legend: {position: 'bottom'}}}
  });
}

// ===================== REFRESH =====================
function refreshAll() {
  if (!W) return;
  paintMap();
  renderNational();
  renderPanel();
  renderForecast();
  drawPins();
}
var tmr = null;
function schedule() { clearTimeout(tmr); tmr = setTimeout(refreshAll, 120); }

// ===================== EVENTS =====================
map.on('click', function (e) {
  if (!W) return;
  var p = toXY(e.latlng.lat, e.latlng.lng);
  var P = {lat: e.latlng.lat, lon: e.latlng.lng, x: p.x, y: p.y, name: '...'};
  if (compareMode && A) {
    B = P; compareMode = false; setCompareBtn();
  } else {
    A = P;
  }
  fetchName(P);
  renderPanel();
  drawPins();
  if (P === A) loadForecast(P);
});

$('layerSel').onchange = function () { layerName = this.value; buildLegend(); refreshAll(); };
$('yearSel').onchange = function () { year = +this.value; refreshAll(); };
$('monthRange').oninput = function () { month = +this.value; setMonthLabel(); schedule(); };
$('opac').oninput = function () { if (overlay) overlay.setOpacity(this.value / 100); };
$('rainIn').oninput = function () { sRain = +this.value; $('rainV').textContent = (sRain > 0 ? '+' : '') + sRain + '%'; schedule(); };
$('irrIn').oninput = function () { sIrr = +this.value; $('irrV').textContent = sIrr + '%'; schedule(); };
$('radIn').oninput = function () { sRad = +this.value; $('radV').textContent = sRad + ' km'; schedule(); };

$('playBtn').onclick = function () {
  if (timer) { clearInterval(timer); timer = null; this.textContent = '▶'; return; }
  this.textContent = '⏸';
  timer = setInterval(function () {
    month = month % 12 + 1;
    $('monthRange').value = month;
    setMonthLabel();
    refreshAll();
  }, 900);
};
$('langBtn').onclick = function () { LANG = (LANG === 'en') ? 'ar' : 'en'; applyLang(); if (A) fetchName(A); if (B) fetchName(B); };

function setCompareBtn() { $('btnCompare').textContent = t(compareMode ? 'btnCompareOn' : 'btnCompare'); }
$('btnCompare').onclick = function () { if (!A) return; compareMode = !compareMode; setCompareBtn(); };
$('btnClearB').onclick = function () { B = null; compareMode = false; setCompareBtn(); drawPins(); renderPanel(); };
$('btnCsv').onclick = function () {
  if (!A) return;
  var raw = rawSeries(A), ser = fromRaw(raw, year, sRain, sIrr), base = fromRaw(raw, 2025, 0, 0);
  var f = function (v) { return v === null || v === undefined ? '' : v.toFixed(3); };
  var rows = ['month,ndvi_2025_observed,ndwi_2025_observed,ndvi_selected,ndwi_selected,risk_selected,year,rain_pct,irrigation_pct'];
  for (var m = 0; m < 12; m++) {
    var b = base[m], s = ser[m];
    rows.push([m + 1, f(b && b.nd), f(b && b.nw), f(s && s.nd), f(s && s.nw), s ? riskOf(s.nd, s.nw) : '', year, sRain, sIrr].join(','));
  }
  var a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([rows.join('\n')], {type: 'text/csv'}));
  a.download = 'tunisia_' + A.lat.toFixed(3) + '_' + A.lon.toFixed(3) + '.csv';
  a.click();
};

// ===================== ENSO BANNER =====================
function renderEnso() {
  var box = $('enso');
  if (!box) return;
  if (!ENSO) { box.style.display = 'none'; return; }
  var stale = new Date() > new Date(new Date(ENSO.next_update).getTime() + 7 * 864e5);
  box.style.display = 'block';
  box.innerHTML =
    '<h4 style="margin-top:0">' + t('ensoTitle') + '</h4>' +
    '<div><bdi dir="ltr"><b>' + ENSO.status + '</b> · Niño-3.4 +' + ENSO.nino34.toFixed(1) + '°C</bdi></div>' +
    '<div class="note"><bdi dir="ltr">' + ENSO.outlook + '</bdi></div>' +
    '<div class="note">' + t('ensoRecord') + ': <bdi dir="ltr">' + ENSO.record_chance_ond + '%</bdi></div>' +
    '<div class="note">' + t('ensoIssued') + ' <bdi dir="ltr">' + ENSO.issued + '</bdi> · ' +
      t('ensoNext') + ' <bdi dir="ltr">' + ENSO.next_update + '</bdi></div>' +
    '<div class="note"><a href="' + ENSO.source_url + '" target="_blank" rel="noopener"><bdi dir="ltr">' + ENSO.source + '</bdi></a></div>' +
    '<div class="note"><b>' + t('ensoNote') + '</b></div>' +
    (stale ? '<div class="warn">' + t('ensoStale') + '</div>' : '');
}
function loadEnso() {
  fetch('data/enso.json')
    .then(function (r) { return r.json(); })
    .then(function (d) { ENSO = d; renderEnso(); })
    .catch(function () { ENSO = null; renderEnso(); });
}

// ===================== DATA SOURCES =====================
var SOURCES = null;
function renderSources() {
  var box = $('sources');
  if (!box) return;
  if (!SOURCES) { box.innerHTML = ''; return; }
  box.innerHTML = '<h4>Data sources</h4>' + Object.keys(SOURCES).map(function (k) {
    var s = SOURCES[k], ok = s.status === 'validated';
    return '<div class="note"><b>' + s.name + '</b> · ' + s.provider + ' · ' + s.period +
           ' <span class="badge ' + (ok ? 'obs' : 'proj') + '">' + (ok ? 'Validated' : 'Demo') + '</span></div>';
  }).join('');
}
function applyDemoLabels() {
  document.querySelectorAll('#layerSel option').forEach(function (o) {
    var s = SOURCES && SOURCES[o.value];
    if (s && s.status !== 'validated' && o.textContent.indexOf('(demo)') < 0) o.textContent += ' (demo)';
  });
}
function loadSources() {
  fetch('data/sources.json').then(function (r) { return r.json(); })
    .then(function (d) { SOURCES = d; renderSources(); applyDemoLabels(); })
    .catch(function () { SOURCES = null; });
}

// ===================== LANGUAGE / INIT =====================
function setMonthLabel() { $('monthLbl').textContent = I18N[LANG].months[month - 1]; }
function buildYearSelect() {
  var sel = $('yearSel'), html = '';
  for (var y = 2025; y <= 2032; y++) {
    html += '<option value="' + y + '"' + (y === year ? ' selected' : '') + '>' + y + ' · ' + t(y === 2025 ? 'yrObs' : 'yrProj') + '</option>';
  }
  sel.innerHTML = html;
}
function applyLang() {
  document.querySelectorAll('[data-i18n]').forEach(function (el) { el.textContent = t(el.dataset.i18n); });
  $('panel').dir = (LANG === 'ar') ? 'rtl' : 'ltr';
  $('langBtn').textContent = (LANG === 'ar') ? 'EN' : 'AR';
  setMonthLabel(); buildYearSelect(); buildLegend(); setCompareBtn();
  $('radV').textContent = sRad + ' km';
  renderEnso();
  applyDemoLabels();
  renderSources();
  refreshAll();
}
applyLang();
loadEnso();
loadSources();