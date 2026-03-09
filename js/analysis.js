/* =====================================================
   analysis.js
   Komputasi inti: elevasi, lereng, jarak, klasifikasi
   Semua fungsi matematika terrain ada di sini
   ===================================================== */

// ---- State analisis aktif ----
let profileData  = null;
let activeColor  = '#5fffa0';
let activeWPs    = [];
let currentA     = null;

// =====================================================
// FUNGSI UTAMA: jalankan semua analisis
// =====================================================
function analyze(obj) {
  active      = obj;
  activeColor = obj.color;
  updateLayerList();

  const coords = extractCoords(obj.gj);
  if (!coords.length) return;

  const A   = compute(coords);
  profileData = A;
  currentA    = A;
  activeWPs   = getWaypointsFromGeoJSON(obj.gj);

  // Perbarui semua panel
  updateStats(A);
  drawProfile(A, obj.color, activeWPs);
  drawSlopeTab(A);
  drawCharts(A, obj.color);
  updateWaypointPanel(obj.gj, obj.color);
  buildAnalysisPanel(A);

  // Update meta strip profil elevasi
  const dk = A.totalDist / 1000;
  const et = (dk / 3 + A.totalGain / 400);
  document.getElementById('stripMeta').style.display = 'flex';
  document.getElementById('smD').textContent = dk.toFixed(2);
  document.getElementById('smG').textContent = A.totalGain.toFixed(0);
  document.getElementById('smL').textContent = A.totalLoss.toFixed(0);
  document.getElementById('smT').textContent = et.toFixed(1);
}

// =====================================================
// EKSTRAK KOORDINAT dari GeoJSON
// Hanya mengambil dari LineString (jalur utama)
// Point/Waypoint TIDAK dimasukkan ke kalkulasi profil
// =====================================================
function extractCoords(gj) {
  let out = [];
  const fs = gj.features || [gj];

  (fs || []).forEach(f => {
    if (!f || !f.geometry) return;
    const pull = c => {
      if (!c || !c.length) return;
      if (typeof c[0] === 'number') out.push(c);
      else c.forEach(pull);
    };
    const g = f.geometry;
    // Hanya LineString yang dipakai untuk profil
    if (g.type === 'LineString' || g.type === 'MultiLineString') pull(g.coordinates);
  });

  // Fallback: jika tidak ada LineString, gunakan semua koordinat
  if (!out.length) {
    (fs || []).forEach(f => {
      if (!f || !f.geometry) return;
      const pull = c => {
        if (!c || !c.length) return;
        if (typeof c[0] === 'number') out.push(c);
        else c.forEach(pull);
      };
      pull(f.geometry.coordinates);
    });
  }

  return out;
}

// =====================================================
// KOMPUTASI UTAMA
// Input: array koordinat [[lon, lat, elev], ...]
// Output: objek data analisis lengkap
// =====================================================
function compute(coords) {
  let dist = 0, gain = 0, loss = 0;
  const elevs  = coords.map(c => c[2] || 0);
  const dists  = [0];
  const slopes = [];
  const segs   = [];

  for (let i = 1; i < coords.length; i++) {
    const d  = haversine(coords[i - 1], coords[i]);           // jarak antar titik (m)
    const de = (coords[i][2] || 0) - (coords[i - 1][2] || 0); // beda elevasi (m)
    dist += d;
    dists.push(dist);

    if (de > 0) gain += de; else loss += Math.abs(de);

    // Kemiringan lereng dalam derajat
    const sd = d > 0 ? Math.atan(Math.abs(de) / d) * 180 / Math.PI : 0;
    slopes.push(sd);
    segs.push({ dist: d, de, sd, cumDist: dist });
  }

  const maxE = elevs.length ? Math.max(...elevs) : 0;
  const minE = elevs.length ? Math.min(...elevs) : 0;
  const avgS = slopes.length ? slopes.reduce((a, b) => a + b, 0) / slopes.length : 0;
  const maxS = slopes.length ? Math.max(...slopes) : 0;

  // Gain/Loss kumulatif
  let cg = 0, cl = 0;
  const ga = [], la = [];
  for (let i = 1; i < elevs.length; i++) {
    const de = elevs[i] - elevs[i - 1];
    if (de > 0) cg += de; else cl += Math.abs(de);
    ga.push(cg);
    la.push(cl);
  }

  return {
    coords, elevs, dists, slopes, segs,
    totalDist: dist,
    totalGain: gain,
    totalLoss: loss,
    maxE, minE, avgS, maxS,
    ga, la,
    diff: calcDifficulty(dist / 1000, maxE - minE, maxS)
  };
}

// =====================================================
// FORMULA HAVERSINE
// Menghitung jarak antar dua koordinat [lon, lat] dalam meter
// =====================================================
function haversine(c1, c2) {
  const R   = 6371000;
  const la1 = c1[1] * Math.PI / 180;
  const la2 = c2[1] * Math.PI / 180;
  const dl  = (c2[1] - c1[1]) * Math.PI / 180;
  const dg  = (c2[0] - c1[0]) * Math.PI / 180;
  const a   = Math.sin(dl / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dg / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// =====================================================
// KLASIFIKASI TINGKAT KESULITAN
// Berdasarkan: jarak, beda tinggi, lereng maksimum
// =====================================================
function calcDifficulty(km, deltaElev, maxSlope) {
  let score = 0;
  if (km > 5)          score++;
  if (km > 10)         score++;
  if (km > 20)         score++;
  if (deltaElev > 500) score++;
  if (deltaElev > 1000) score++;
  if (deltaElev > 2000) score++;  
  if (maxSlope > 20)   score++;
  if (maxSlope > 35)   score++;
  if (maxSlope > 50)   score++;

  if (score <= 2) return { lbl: 'MUDAH',   c: '#44ff88', p: 25 };
  if (score <= 4) return { lbl: 'SEDANG',  c: '#ffd740', p: 50 };
  if (score <= 6) return { lbl: 'SULIT',   c: '#ff6b35', p: 75 };
  return              { lbl: 'EKSTREM', c: '#ff2c2c', p: 100 };
}

// =====================================================
// KLASIFIKASI LERENG (per segmen)
// Berdasarkan derajat kemiringan
// =====================================================
function slopeClass(deg) {
  if (deg <= 5)  return { lbl: 'Datar',        chip: 'cd', c: '#44ff88' };
  if (deg <= 15) return { lbl: 'Landai',        chip: 'cl', c: '#ffd740' };
  if (deg <= 25) return { lbl: 'Agak Curam',    chip: 'ca', c: '#ff8c00' };
  if (deg <= 45) return { lbl: 'Curam',         chip: 'cc2', c: '#ff6b35' };
  if (deg <= 60) return { lbl: 'Sangat Curam',  chip: 'cs', c: '#ff2c2c' };
  return              { lbl: 'Vertikal',      chip: 'cv', c: '#b400ff' };
}

// Versi RGB (untuk canvas)
function slopeRGB(deg) {
  if (deg <= 5)  return '68,255,136';
  if (deg <= 15) return '255,215,64';
  if (deg <= 25) return '255,140,0';
  if (deg <= 45) return '255,107,53';
  if (deg <= 60) return '255,44,44';
  return '180,0,255';
}

// =====================================================
// HELPER: hex color → rgba
// =====================================================
function hexToRgba(hex, alpha) {
  hex = hex.replace('#', '');
  const n = parseInt(hex, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}

// =====================================================
// UPDATE STATISTIK SIDEBAR
// =====================================================
function updateStats(A) {
  const dk = A.totalDist / 1000;
  document.getElementById('sDist').innerHTML     = dk.toFixed(2) + '<span class="sunit">km</span>';
  document.getElementById('sEMax').innerHTML     = A.maxE.toFixed(0) + '<span class="sunit">m</span>';
  document.getElementById('sEMin').innerHTML     = A.minE.toFixed(0) + '<span class="sunit">m</span>';
  document.getElementById('sDelta').innerHTML    = (A.maxE - A.minE).toFixed(0) + '<span class="sunit">m</span>';
  document.getElementById('sSlopeMax').innerHTML = A.maxS.toFixed(1) + '<span class="sunit">°</span>';
  document.getElementById('sSlopeAvg').innerHTML = A.avgS.toFixed(1) + '<span class="sunit">°</span>';
  document.getElementById('sGain').innerHTML     = A.totalGain.toFixed(0) + '<span class="sunit">m</span>';
  document.getElementById('sLoss').innerHTML     = A.totalLoss.toFixed(0) + '<span class="sunit">m</span>';

  const d  = A.diff;
  const dl = document.getElementById('difLbl');
  dl.textContent  = d.lbl;
  dl.style.color  = d.c;
  const df = document.getElementById('difFill');
  df.style.background = d.c;
  df.style.width      = d.p + '%';
}
