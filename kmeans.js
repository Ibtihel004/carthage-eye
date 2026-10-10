/* kmeans.js
   Unsupervised machine learning on the dashboard's own satellite images, plus a check against ESA WorldCover.
   Each ~1 km pixel gets a 24-number "fingerprint" (12 monthly NDVI + 12 monthly NDWI).
   K-means groups pixels with similar yearly fingerprints into zones. No labels are used for the clustering.
   Needs: Leaflet map in a global variable called `map`, and data/ndvi_01..12.png, data/ndwi_01..12.png.
   Optional: data/worldcover.png (ESA WorldCover class codes, same size as the other images) for the validation block.
*/
function kmInit() {
  var BOUNDS = [[30.2, 7.5], [37.4, 11.7]];
  var DIM = 24;
  var WATER_COLOR = '#3b78b5';
  var LAND_COLORS = ['#1b6b3a', '#5aa55c', '#a9cf6b', '#e3d58a', '#d9a65a', '#b0703c', '#7b4a2a', '#4a3322'];

  // ESA WorldCover classes used for the check (0-based index)
  var WC_NAMES = ['Tree cover', 'Shrubland', 'Grassland', 'Cropland', 'Built-up', 'Bare or sparse', 'Snow or ice', 'Water', 'Wetland', 'Moss or lichen'];
  // Which WorldCover classes count as "agreeing" with each zone name. Fixed here, before looking at results.
  var EXPECT = {
    'Dense vegetation or forest': [0, 1, 3],
    'Cropland and pasture': [1, 2, 3],
    'Steppe and rangeland': [1, 2, 3, 5],
    'Arid steppe': [1, 2, 5],
    'Desert and bare soil': [5],
    'Water, wet or salty surfaces': [7, 8, 5]
  };
  var WC_LUT = (function () {
    var codes = [10, 20, 30, 40, 50, 60, 70, 80, 90, 95, 100], lut = new Int8Array(256), g, i, best, bd;
    for (g = 0; g < 256; g++) {
      best = -1; bd = 1e9;
      for (i = 0; i < codes.length; i++) { if (Math.abs(g - codes[i]) < bd) { bd = Math.abs(g - codes[i]); best = i; } }
      if (bd > 4) lut[g] = -1;
      else lut[g] = (best === 9) ? 8 : (best === 10) ? 9 : best;   // 95 mangroves -> wetland, 100 -> moss
    }
    return lut;
  })();

  var D = {ndvi: [], ndwi: []};
  var W = 0, H = 0, loadedCount = 0, ready = false;
  var overlay = null, lab = null, zones = null, running = false, WC = null;

  function lm() { return (typeof map !== 'undefined') ? map : null; }
  function merc(lat) { return Math.log(Math.tan(Math.PI / 4 + lat * Math.PI / 360)); }
  function pad(m) { return (m < 10 ? '0' : '') + m; }

  /* ---------- small panel ---------- */
  var box = document.createElement('div');
  box.id = 'kmBox';
  box.style.cssText = 'position:fixed;left:50%;bottom:12px;transform:translateX(-50%);z-index:1200;' +
    'width:340px;max-width:94vw;max-height:60vh;overflow:auto;background:#fff;color:#1c2b22;' +
    'border-radius:10px;box-shadow:0 2px 10px rgba(0,0,0,.25);padding:10px 12px;' +
    'font:13px system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;';
  box.innerHTML =
    '<div style="font-weight:600;margin-bottom:6px">Machine learning: climate-vegetation zones</div>' +
    '<div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">' +
    '<label for="kmK">Zones</label>' +
    '<select id="kmK"><option>4</option><option>5</option><option selected>6</option><option>7</option><option>8</option></select>' +
    '<button id="kmRun" disabled style="border:0;background:#0f3d2e;color:#fff;border-radius:6px;padding:6px 10px;cursor:pointer">Loading images 0/24</button>' +
    '<button id="kmHide" style="border:0;background:#e3e8e5;border-radius:6px;padding:6px 10px;cursor:pointer;display:none">Hide</button>' +
    '</div>' +
    '<div id="kmOut" style="margin-top:8px"></div>' +
    '<div id="kmPick" style="margin-top:6px;font-weight:600"></div>' +
    '<div id="kmVal" style="margin-top:8px;font-size:12px"></div>' +
    '<div style="margin-top:6px;font-size:11px;color:#5b6b62">K-means groups pixels by their 12-month NDVI and NDWI curves (2025, 1 km grid). ' +
    'The algorithm finds the groups; the names are given by reading each zone\'s average curve.</div>';
  document.body.appendChild(box);
  var runBtn = document.getElementById('kmRun');
  var hideBtn = document.getElementById('kmHide');
  var out = document.getElementById('kmOut');
  var pick = document.getElementById('kmPick');
  var valBox = document.getElementById('kmVal');

  /* ---------- load the 24 images ---------- */
  function loadAll() {
    ['ndvi', 'ndwi'].forEach(function (name) {
      for (var m = 1; m <= 12; m++) loadOne(name, m, 0);
    });
  }
  function loadOne(name, m, tries) {
    var img = new Image();
    img.onload = function () {
      if (!img.naturalWidth) {
        if (tries < 3) setTimeout(function () { loadOne(name, m, tries + 1); }, 300);
        return;
      }
      if (!W) { W = img.naturalWidth; H = img.naturalHeight; }
      var c = document.createElement('canvas');
      c.width = W; c.height = H;
      var ctx = c.getContext('2d');
      ctx.drawImage(img, 0, 0, W, H);
      D[name][m - 1] = ctx.getImageData(0, 0, W, H).data;
      loadedCount++;
      runBtn.textContent = 'Loading images ' + loadedCount + '/24';
      if (loadedCount === 24) {
        ready = true;
        runBtn.disabled = false;
        runBtn.textContent = 'Find zones';
      }
    };
    img.onerror = function () { runBtn.textContent = 'Missing: data/' + name + '_' + pad(m) + '.png'; };
    img.src = 'data/' + name + '_' + pad(m) + '.png';
  }

  /* ---------- features for one pixel ---------- */
  function feat(p, o) {
    var i = p * 4, g, m, s, c, v, set;
    for (g = 0; g < 2; g++) {
      s = 0; c = 0;
      for (m = 0; m < 12; m++) {
        set = g ? D.ndwi[m] : D.ndvi[m];
        if (set[i + 3] > 0) {
          v = (g ? -0.6 : -0.2) + set[i] / 255;
          o[g * 12 + m] = v; s += v; c++;
        } else {
          o[g * 12 + m] = NaN;
        }
      }
      if (c < 9) return false;           // too many cloudy months, skip this pixel
      s /= c;
      for (m = 0; m < 12; m++) if (o[g * 12 + m] !== o[g * 12 + m]) o[g * 12 + m] = s;  // fill gaps with the pixel's own mean
    }
    return true;
  }

  /* ---------- k-means (k-means++ start, fixed seed so results repeat) ---------- */
  function rng(seed) {
    var s = seed >>> 0;
    return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  }
  function d2(X, i, C, c) {
    var s = 0, j, t;
    for (j = 0; j < DIM; j++) { t = X[i * DIM + j] - C[c * DIM + j]; s += t * t; }
    return s;
  }
  function kmeans(X, n, k) {
    var r = rng(42), C = new Float32Array(k * DIM), dist = new Float32Array(n), i, j, c;
    for (i = 0; i < n; i++) dist[i] = 1e9;
    var first = Math.floor(r() * n);
    for (j = 0; j < DIM; j++) C[j] = X[first * DIM + j];
    for (c = 1; c < k; c++) {
      var tot = 0, dd;
      for (i = 0; i < n; i++) {
        dd = d2(X, i, C, c - 1);
        if (dd < dist[i]) dist[i] = dd;
        tot += dist[i];
      }
      var target = r() * tot, acc = 0, pickI = n - 1;
      for (i = 0; i < n; i++) { acc += dist[i]; if (acc >= target) { pickI = i; break; } }
      for (j = 0; j < DIM; j++) C[c * DIM + j] = X[pickI * DIM + j];
    }
    var asg = new Uint8Array(n);
    for (i = 0; i < n; i++) asg[i] = 255;
    for (var it = 0; it < 40; it++) {
      var changed = 0, sums = new Float64Array(k * DIM), cnt = new Int32Array(k);
      for (i = 0; i < n; i++) {
        var best = 0, bd = 1e30;
        for (c = 0; c < k; c++) { dd = d2(X, i, C, c); if (dd < bd) { bd = dd; best = c; } }
        if (asg[i] !== best) { asg[i] = best; changed++; }
        cnt[best]++;
        for (j = 0; j < DIM; j++) sums[best * DIM + j] += X[i * DIM + j];
      }
      for (c = 0; c < k; c++) if (cnt[c]) for (j = 0; j < DIM; j++) C[c * DIM + j] = sums[c * DIM + j] / cnt[c];
      if (!changed) break;
    }
    return C;
  }

  /* ---------- naming a zone from its average curve ---------- */
  function nameOf(mn, mw) {
    if (mw > -0.15) return 'Water, wet or salty surfaces';
    if (mn > 0.45) return 'Dense vegetation or forest';
    if (mn > 0.30) return 'Cropland and pasture';
    if (mn > 0.18) return 'Steppe and rangeland';
    if (mn > 0.11) return 'Arid steppe';
    return 'Desert and bare soil';
  }
  function spark(C, c) {
    var pts = [], m, v;
    for (m = 0; m < 12; m++) {
      v = C[c * DIM + m];
      pts.push((2 + m * 5.1).toFixed(1) + ',' + (22 - Math.max(-0.05, Math.min(0.8, v)) / 0.85 * 20 - 0.9).toFixed(1));
    }
    return '<svg width="60" height="24" viewBox="0 0 60 24" aria-hidden="true"><polyline points="' + pts.join(' ') +
      '" fill="none" stroke="#1c2b22" stroke-width="1.5"/></svg>';
  }

  /* ---------- agreement metrics between two groupings ---------- */
  function metrics(M) {
    var nz = M.length, nc = M[0].length, n = 0, rows = [], cols = [], i, j, pur = 0;
    for (i = 0; i < nz; i++) rows.push(0);
    for (j = 0; j < nc; j++) cols.push(0);
    for (i = 0; i < nz; i++) for (j = 0; j < nc; j++) { n += M[i][j]; rows[i] += M[i][j]; cols[j] += M[i][j]; }
    for (i = 0; i < nz; i++) pur += Math.max.apply(null, M[i]);
    pur /= n;
    var HU = 0, HV = 0, I = 0;
    for (i = 0; i < nz; i++) if (rows[i] > 0) HU -= rows[i] / n * Math.log(rows[i] / n);
    for (j = 0; j < nc; j++) if (cols[j] > 0) HV -= cols[j] / n * Math.log(cols[j] / n);
    for (i = 0; i < nz; i++) for (j = 0; j < nc; j++) if (M[i][j] > 0) I += M[i][j] / n * Math.log(M[i][j] * n / (rows[i] * cols[j]));
    var nmi = (HU + HV) > 0 ? 2 * I / (HU + HV) : 0;
    function c2(x) { return x * (x - 1) / 2; }
    var sij = 0, sa = 0, sb = 0;
    for (i = 0; i < nz; i++) { sa += c2(rows[i]); for (j = 0; j < nc; j++) sij += c2(M[i][j]); }
    for (j = 0; j < nc; j++) sb += c2(cols[j]);
    var expd = sa * sb / c2(n), mx = 0.5 * (sa + sb);
    var ari = (mx - expd) !== 0 ? (sij - expd) / (mx - expd) : 0;
    return {n: n, purity: pur, nmi: nmi, ari: ari};
  }

  /* ---------- optional reference image: ESA WorldCover ---------- */
  function loadWC(cb) {
    if (WC) { cb(WC); return; }
    var img = new Image();
    img.onload = function () {
      if (img.naturalWidth !== W || img.naturalHeight !== H) { cb('size'); return; }
      var c = document.createElement('canvas');
      c.width = W; c.height = H;
      var ctx = c.getContext('2d');
      ctx.drawImage(img, 0, 0);
      var d = ctx.getImageData(0, 0, W, H).data, o = new Int8Array(W * H), p;
      for (p = 0; p < W * H; p++) o[p] = d[p * 4 + 3] > 0 ? WC_LUT[d[p * 4]] : -1;
      WC = o;
      cb(WC);
    };
    img.onerror = function () { cb(null); };
    img.src = 'data/worldcover.png';
  }

  function pct(x) { return Math.round(100 * x) + '%'; }

  function validate(k, names, mnArr, ordered) {
    valBox.textContent = 'Checking against ESA WorldCover...';
    loadWC(function (wc) {
      if (wc === null) { valBox.innerHTML = '<span style="color:#7a5b00">No reference check yet: add <code>data/worldcover.png</code>.</span>'; return; }
      if (wc === 'size') { valBox.textContent = 'worldcover.png has a different size from the other images. Export it again with the same dimensions.'; return; }
      var NC = WC_NAMES.length, i, p, M = [], B = [], zN = [], zA = [];
      for (i = 0; i < k; i++) { M.push(new Array(NC).fill(0)); B.push(new Array(NC).fill(0)); zN.push(0); zA.push(0); }
      var vals = [];
      for (p = 0; p < W * H; p++) if (lab[p] && wc[p] >= 0) vals.push(mnArr[p]);
      if (vals.length < 100) { valBox.textContent = 'Not enough pixels with both a zone and a WorldCover class.'; return; }
      var sorted = Float32Array.from(vals).sort(), edges = [];
      for (i = 1; i < k; i++) edges.push(sorted[Math.floor(i * sorted.length / k)]);
      var agree = 0, tot = 0;
      for (p = 0; p < W * H; p++) {
        if (!lab[p] || wc[p] < 0) continue;
        var z = lab[p] - 1, cI = wc[p];
        M[z][cI]++;
        var b = 0;
        while (b < edges.length && mnArr[p] >= edges[b]) b++;
        B[b][cI]++;
        tot++; zN[z]++;
        var ex = EXPECT[names[z].replace(/ \(\d+\)$/, '')];
        if (ex && ex.indexOf(cI) >= 0) { agree++; zA[z]++; }
      }
      var mk = metrics(M), mb = metrics(B);
      var perZone = ordered.map(function (a) {
        var row = M[a.c], top = 0, j;
        for (j = 1; j < NC; j++) if (row[j] > row[top]) top = j;
        return {zone: names[a.c], pixels: zN[a.c], topClass: WC_NAMES[top], topShare: zN[a.c] ? row[top] / zN[a.c] : 0,
                nameAgreement: zN[a.c] ? zA[a.c] / zN[a.c] : 0};
      });
      window.kmValidation = {zones: k, pixels: tot, kmeans: mk, ndviBaseline: mb, nameAgreement: agree / tot, perZone: perZone};
      if (typeof console !== 'undefined') console.log('kmValidation', JSON.stringify(window.kmValidation));

      var h = '<details open><summary style="cursor:pointer;font-weight:600">Check against ESA WorldCover</summary>' +
        '<table style="border-collapse:collapse;margin-top:4px;width:100%">' +
        '<tr><th style="text-align:left"></th><th style="text-align:right">K-means</th><th style="text-align:right">NDVI-only baseline</th></tr>' +
        '<tr><td>Purity</td><td style="text-align:right">' + pct(mk.purity) + '</td><td style="text-align:right">' + pct(mb.purity) + '</td></tr>' +
        '<tr><td>Normalised mutual information</td><td style="text-align:right">' + mk.nmi.toFixed(2) + '</td><td style="text-align:right">' + mb.nmi.toFixed(2) + '</td></tr>' +
        '<tr><td>Adjusted Rand index</td><td style="text-align:right">' + mk.ari.toFixed(2) + '</td><td style="text-align:right">' + mb.ari.toFixed(2) + '</td></tr>' +
        '</table>' +
        '<div style="margin-top:4px">Zone names agree with WorldCover: <b>' + pct(agree / tot) + '</b> of ' + tot + ' pixels.</div>';
      perZone.forEach(function (z) {
        h += '<div style="margin-top:2px">' + z.zone + ': mostly ' + z.topClass.toLowerCase() + ' (' + pct(z.topShare) + '), name agrees ' + pct(z.nameAgreement) + '</div>';
      });
      h += '<div style="margin-top:4px;color:#5b6b62">WorldCover is itself a satellite-derived map (2021), not field data. Compared on the 1 km grid; neighbouring pixels are not independent, so treat the figures as descriptive. ' +
        'The baseline cuts pixels into the same number of groups by mean yearly NDVI only.</div></details>';
      valBox.innerHTML = h;
    });
  }

  /* ---------- run ---------- */
  function run() {
    if (running || !ready) return;
    var mp = lm();
    if (!mp) { out.textContent = 'Could not find the Leaflet map variable named "map".'; return; }
    running = true;
    runBtn.disabled = true;
    runBtn.textContent = 'Running...';
    setTimeout(function () {
      var k = +document.getElementById('kmK').value;
      var tmp = new Float32Array(DIM), arr = [], x, y;
      for (y = 0; y < H; y += 4) {
        for (x = 0; x < W; x += 4) {
          if (feat(y * W + x, tmp)) for (var j = 0; j < DIM; j++) arr.push(tmp[j]);
        }
      }
      var n = arr.length / DIM;
      if (n < k * 10) { out.textContent = 'Not enough valid pixels found.'; running = false; runBtn.disabled = false; runBtn.textContent = 'Find zones'; return; }
      var C = kmeans(new Float32Array(arr), n, k);

      // describe each zone
      var info = [], c, m;
      for (c = 0; c < k; c++) {
        var sn = 0, sw = 0;
        for (m = 0; m < 12; m++) { sn += C[c * DIM + m]; sw += C[c * DIM + 12 + m]; }
        info.push({c: c, mn: sn / 12, mw: sw / 12, count: 0});
      }
      var land = info.filter(function (a) { return a.mw <= -0.15; }).sort(function (a, b) { return b.mn - a.mn; });
      var wet = info.filter(function (a) { return a.mw > -0.15; });
      var colors = {}, names = {}, used = {};
      land.forEach(function (a, i) {
        colors[a.c] = LAND_COLORS[Math.min(i, LAND_COLORS.length - 1)];
        var nm = nameOf(a.mn, a.mw);
        used[nm] = (used[nm] || 0) + 1;
        names[a.c] = used[nm] > 1 ? nm + ' (' + used[nm] + ')' : nm;
      });
      wet.forEach(function (a) { colors[a.c] = WATER_COLOR; names[a.c] = nameOf(a.mn, a.mw); });

      // assign every valid pixel to its nearest zone and paint it
      lab = new Uint8Array(W * H);
      var mnArr = new Float32Array(W * H);
      var cv = document.createElement('canvas');
      cv.width = W; cv.height = H;
      var ctx = cv.getContext('2d'), img = ctx.createImageData(W, H), px = img.data;
      var rgb = {};
      for (c = 0; c < k; c++) {
        var hx = colors[c];
        rgb[c] = [parseInt(hx.substr(1, 2), 16), parseInt(hx.substr(3, 2), 16), parseInt(hx.substr(5, 2), 16)];
      }
      var total = 0, v;
      for (var p = 0; p < W * H; p++) {
        if (!feat(p, tmp)) continue;
        var best = 0, bd = 1e30, sm = 0;
        for (c = 0; c < k; c++) {
          var s = 0;
          for (var q = 0; q < DIM; q++) { v = tmp[q] - C[c * DIM + q]; s += v * v; }
          if (s < bd) { bd = s; best = c; }
        }
        for (var q2 = 0; q2 < 12; q2++) sm += tmp[q2];
        mnArr[p] = sm / 12;
        lab[p] = best + 1;
        info[best].count++;
        total++;
        px[p * 4] = rgb[best][0]; px[p * 4 + 1] = rgb[best][1]; px[p * 4 + 2] = rgb[best][2]; px[p * 4 + 3] = 235;
      }
      ctx.putImageData(img, 0, 0);
      if (overlay) mp.removeLayer(overlay);
      overlay = L.imageOverlay(cv.toDataURL(), BOUNDS, {opacity: 0.85}).addTo(mp);

      // legend
      zones = {C: C, names: names, colors: colors};
      var ordered = land.concat(wet), html = '';
      ordered.forEach(function (a) {
        html += '<div style="display:flex;align-items:center;gap:8px;margin-top:4px">' +
          '<span style="width:14px;height:14px;border-radius:3px;background:' + colors[a.c] + ';flex:none"></span>' +
          '<span style="flex:1">' + names[a.c] + '</span>' +
          spark(C, a.c) +
          '<span style="width:34px;text-align:right">' + Math.round(100 * a.count / total) + '%</span></div>';
      });
      out.innerHTML = html;
      pick.textContent = '';
      hideBtn.style.display = 'inline-block';
      hideBtn.textContent = 'Hide';
      running = false;
      runBtn.disabled = false;
      runBtn.textContent = 'Find zones again';
      validate(k, names, mnArr, ordered);
    }, 50);
  }

  /* ---------- events ---------- */
  runBtn.onclick = run;
  hideBtn.onclick = function () {
    var mp = lm();
    if (!mp || !overlay) return;
    if (mp.hasLayer(overlay)) { mp.removeLayer(overlay); hideBtn.textContent = 'Show'; }
    else { overlay.addTo(mp); hideBtn.textContent = 'Hide'; }
  };
  function hook() {
    var mp = lm();
    if (!mp) { setTimeout(hook, 300); return; }
    mp.on('click', function (e) {
      if (!lab || !zones) return;
      var x = Math.round((e.latlng.lng - 7.5) / (11.7 - 7.5) * (W - 1));
      var y = Math.round((merc(37.4) - merc(e.latlng.lat)) / (merc(37.4) - merc(30.2)) * (H - 1));
      if (x < 0 || y < 0 || x >= W || y >= H) return;
      var v = lab[y * W + x];
      pick.textContent = v ? 'Zone here: ' + zones.names[v - 1] : 'No zone here (sea, cloud or outside Tunisia).';
    });
  }
  hook();
  loadAll();
}

// wait for the page body to exist, wherever the script tag is placed
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', kmInit);
else kmInit();
