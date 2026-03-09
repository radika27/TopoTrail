/* =====================================================
   layers.js
   Manajemen layer peta: upload file, tambah, hapus, pilih
   ===================================================== */

// ---- State global ----
let layers  = [];   // array semua layer aktif
let active  = null; // layer yang sedang dipilih

// =====================================================
// UPLOAD FILE
// =====================================================
const upzone = document.getElementById('upzone');
const fi     = document.getElementById('fi');

upzone.addEventListener('dragover', e => {
  e.preventDefault();
  upzone.classList.add('drag');
});
upzone.addEventListener('dragleave', () => upzone.classList.remove('drag'));
upzone.addEventListener('drop', e => {
  e.preventDefault();
  upzone.classList.remove('drag');
  [...e.dataTransfer.files].forEach(processFile);
});
fi.addEventListener('change', e => {
  [...e.target.files].forEach(processFile);
  fi.value = '';
});

// ---- Proses satu file upload ----
async function processFile(file) {
  showLoad();
  const ext = file.name.split('.').pop().toLowerCase();
  try {
    let gj = null;
    if (['geojson', 'json'].includes(ext)) gj = JSON.parse(await file.text());
    else if (ext === 'kml')                gj = kml2gj(await file.text());
    else if (ext === 'gpx')                gj = gpx2gj(await file.text());
    else if (['zip', 'shp'].includes(ext)) gj = await shp(await file.arrayBuffer());
    else { notify('Format tidak didukung', 'err'); hideLoad(); return; }
    if (gj) addLayer(gj, file.name);
  } catch (e) {
    console.error(e);
    notify('Gagal memuat: ' + file.name, 'err');
  }
  hideLoad();
}

// =====================================================
// TAMBAH LAYER KE PETA
// =====================================================
function addLayer(gj, name) {
  const idx     = layers.length;
  const color   = COLORS[idx % COLORS.length];
  const wpColor = WP_COLORS[idx % WP_COLORS.length];

  // Buat layer Leaflet GeoJSON
  const layer = L.geoJSON(gj, {
    // Style untuk LineString
    style: () => ({ color, weight: 3.5, opacity: 0.9 }),

    // Style untuk Point (waypoint)
    pointToLayer: (f, ll) => L.circleMarker(ll, {
      radius: 7, fillColor: wpColor, color: '#fff', weight: 2, fillOpacity: 1
    }),

    // Popup untuk setiap fitur
    onEachFeature: (f, l) => {
      const p = f.properties || {};
      let html = `<div style="min-width:150px;">
        <div style="font-family:'Rajdhani';font-size:14px;font-weight:700;color:#eaf5ec;margin-bottom:5px;">
          ${p.name || p.Name || p.NAMA || 'Fitur'}
        </div>`;
      Object.entries(p).forEach(([k, v]) => {
        if (v != null && k !== 'name' && k !== 'Name') {
          html += `<div style="display:flex;justify-content:space-between;gap:10px;margin-bottom:2px;">
            <span style="color:#6a9070;font-size:10px;">${k}</span>
            <span style="color:#c8e0cc;font-size:10px;">${v}</span>
          </div>`;
        }
      });
      l.bindPopup(html + '</div>');
    }
  }).addTo(map);

  // Simpan ke array layers
  const obj = { layer, gj, name, color, id: idx };
  layers.push(obj);

  // Update UI
  updateLayerList();
  map.fitBounds(layer.getBounds().pad(0.1));
  analyze(obj);
  notify('✅ ' + name, 'ok');
}

// =====================================================
// UPDATE DAFTAR LAYER (SIDEBAR)
// =====================================================
function updateLayerList() {
  const el = document.getElementById('layerList');
  if (!layers.length) {
    el.innerHTML = `<div class="empty" style="padding:10px;">
      <div class="eico" style="font-size:18px;">🗂</div>
      <div class="etxt">Belum ada layer</div>
    </div>`;
    return;
  }
  el.innerHTML = layers.map((l, i) => `
    <div class="litem ${active && active.id === l.id ? 'active' : ''}" onclick="selectLayer(${i})">
      <div class="lcolor" style="background:${l.color};box-shadow:0 0 5px ${l.color};"></div>
      <div class="lname">${l.name}</div>
      <div class="ltype">${getGeoType(l.gj)}</div>
      <button class="lrm" onclick="event.stopPropagation();removeLayer(${i})">✕</button>
    </div>
  `).join('');
}

// Helper: ambil tipe geometri singkat dari GeoJSON
function getGeoType(gj) {
  const t = new Set();
  (gj.features || [gj]).forEach(f => {
    if (f && f.geometry) {
      t.add(f.geometry.type.replace('Multi', '').slice(0, 4).toUpperCase());
    }
  });
  return [...t].join('/') || 'GEO';
}

// ---- Pilih layer (klik dari daftar) ----
function selectLayer(i) {
  analyze(layers[i]);
  updateLayerList();
  try {
    const bounds = layers[i].layer.getBounds();
    if (bounds.isValid()) map.flyToBounds(bounds.pad(0.12), { duration: 0.8, easeLinearity: 0.4 });
  } catch (e) {}
}

// ---- Hapus layer ----
function removeLayer(i) {
  map.removeLayer(layers[i].layer);
  layers.splice(i, 1);
  if (active && layers.findIndex(l => l.id === active.id) < 0) active = null;
  updateLayerList();
}
