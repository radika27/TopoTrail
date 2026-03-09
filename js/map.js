/* =====================================================
   map.js
   Inisialisasi peta Leaflet, basemap, dan kontrol peta
   ===================================================== */

// ---- Inisialisasi Peta ----
const map = L.map('map', {
  zoomControl: false,
  attributionControl: false
}).setView([-7.5, 110.5], 8);

// ---- Daftar Basemap ----
const BML = {
  osm:  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }),
  sat:  L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { maxZoom: 19 }),
  topo: L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', { maxZoom: 17 })
};

// Aktifkan basemap default
BML.sat.addTo(map);

// ---- Event: update koordinat kursor ----
map.on('mousemove', e => {
  document.getElementById('cLat').textContent = e.latlng.lat.toFixed(6);
  document.getElementById('cLng').textContent = e.latlng.lng.toFixed(6);
  document.getElementById('cZ').textContent   = map.getZoom();
  if (measuring) mMove(e);
});

map.on('click',   e => { if (measuring) mClick(e); });
map.on('zoomend', () => document.getElementById('cZ').textContent = map.getZoom());

// ---- Fungsi: ganti basemap ----
function setBM(name, btn) {
  Object.values(BML).forEach(l => map.removeLayer(l));
  BML[name].addTo(map);
  BML[name].bringToBack();
  document.querySelectorAll('.bmbtn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}

// ---- Fungsi: fit semua layer ----
function fitAll() {
  if (!layers.length) return;
  const g = L.featureGroup(layers.map(l => l.layer));
  map.fitBounds(g.getBounds().pad(0.1));
}
