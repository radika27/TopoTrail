/* =====================================================
   utils.js
   Fungsi bantu yang dipakai di seluruh aplikasi:
   - Notifikasi toast
   - Loading overlay
   - Alat ukur jarak di peta
   ===================================================== */

// =====================================================
// NOTIFIKASI TOAST
// =====================================================
function notify(msg, type = '') {
  const el = document.getElementById('notif');
  el.textContent  = msg;
  el.className    = 'notif ' + type + ' show';
  setTimeout(() => el.classList.remove('show'), 3500);
}

// =====================================================
// LOADING OVERLAY
// =====================================================
function showLoad() { document.getElementById('loading').classList.add('on'); }
function hideLoad() { document.getElementById('loading').classList.remove('on'); }

// =====================================================
// ALAT UKUR JARAK
// Klik peta untuk menambah titik, jarak dihitung otomatis
// =====================================================
let measuring = false;
let mPts      = [];  // array titik yang sudah diklik
let mPoly     = null; // polyline pengukuran di peta
let mMarks    = [];  // marker titik-titik pengukuran

function toggleMeasure() {
  measuring = !measuring;
  document.getElementById('btnM').classList.toggle('active', measuring);
  map.getContainer().style.cursor = measuring ? 'crosshair' : '';

  // Reset saat dimatikan
  if (!measuring) {
    mPts = [];
    if (mPoly) map.removeLayer(mPoly);
    mMarks.forEach(m => map.removeLayer(m));
    mMarks = [];
  }
}

// ---- Klik peta saat measuring aktif ----
function mClick(e) {
  mPts.push(e.latlng);

  // Tambahkan titik kuning kecil
  const m = L.circleMarker(e.latlng, {
    radius: 4, color: '#ffd740', fillColor: '#ffd740', fillOpacity: 1
  }).addTo(map);
  mMarks.push(m);

  // Gambar/update polyline
  if (mPts.length >= 2) {
    if (mPoly) map.removeLayer(mPoly);
    mPoly = L.polyline(mPts, { color: '#ffd740', weight: 2, dashArray: '5,4' }).addTo(map);

    // Hitung total jarak
    const tot = mPts.reduce((a, p, i) => i === 0 ? 0 : a + p.distanceTo(mPts[i - 1]), 0);
    notify('📏 ' + (tot >= 1000 ? (tot / 1000).toFixed(3) + ' km' : tot.toFixed(1) + ' m'), 'ok');
  }
}

// (Placeholder — tidak dipakai saat ini tapi diperlukan sebagai handler)
function mMove() {}
