# 🏔 TopoTrail — WebGIS Analisis Jalur Pendakian

Aplikasi WebGIS berbasis browser untuk menganalisis jalur pendakian gunung
secara interaktif, dilengkapi profil elevasi, analisis lereng, dan
rekomendasi berbasis jurnal ilmiah.

---

## 📁 Struktur File

```
topotrail/
│
├── index.html          ← Halaman utama (HTML + link semua file)
│
├── css/
│   └── style.css       ← Seluruh gaya tampilan (tema dark, layout, komponen)
│
└── js/
    ├── config.js       ← Konstanta warna, data demo Lawu & Sumbing
    ├── utils.js        ← Toast notifikasi, loading overlay, alat ukur jarak
    ├── map.js          ← Inisialisasi peta Leaflet, basemap, koordinat kursor
    ├── parsers.js      ← Konversi KML & GPX ke GeoJSON
    ├── analysis.js     ← Komputasi inti: haversine, lereng, elevasi, difficulty
    ├── charts.js       ← Grafik Chart.js (histogram, pie, gain/loss)
    ├── profile.js      ← Canvas profil elevasi interaktif (hover, klik, zoom)
    ├── panels.js       ← Panel kanan: tab lereng, waypoint, analisis ilmiah
    └── layers.js       ← Manajemen layer: upload, tambah, hapus, pilih
```

---

## 🔗 Urutan Load JavaScript

Urutan `<script>` di `index.html` penting karena ada ketergantungan antar file:

```
config.js   → mendefinisikan COLORS, DEMOS
utils.js    → notify, showLoad, measuring
map.js      → membuat `map` (dipakai oleh layers, profile, panels)
parsers.js  → kml2gj, gpx2gj (dipakai oleh layers)
analysis.js → compute, slopeClass, dll (dipakai oleh profile, panels, layers)
charts.js   → drawCharts (dipakai oleh analysis/layers)
profile.js  → drawProfile, renderCanvas (dipakai oleh analysis)
panels.js   → drawSlopeTab, updateWaypointPanel, buildAnalysisPanel
layers.js   → addLayer, processFile (memanggil semua yang di atas)
```

---

## 🧪 Format File yang Didukung

| Format   | Keterangan                    |
|----------|-------------------------------|
| GeoJSON  | Format standar GIS berbasis JSON |
| KML      | Format Google Earth/Maps      |
| GPX      | Format GPS (track + waypoint) |
| SHP/ZIP  | Shapefile ESRI (perlu di-ZIP) |

---

## ⚙️ Cara Pakai

1. Buka `index.html` di browser (Chrome/Firefox/Edge)
2. Klik salah satu **Data Demo** (Lawu atau Sumbing) untuk langsung melihat
3. Atau drag & drop / upload file jalur sendiri

> **Catatan:** Karena menggunakan `shpjs` via CDN, butuh koneksi internet
> saat pertama kali membuka. Untuk offline, download semua library CDN.

---

## 🗂️ Panduan Edit per File

### Ingin ubah warna tema?
→ Edit variabel CSS di `css/style.css` bagian `:root { ... }`

### Ingin tambah data demo gunung lain?
→ Tambahkan entry baru di `js/config.js` dalam objek `DEMOS`

### Ingin ubah klasifikasi kelas lereng?
→ Edit fungsi `slopeClass()` di `js/analysis.js`

### Ingin ubah rumus estimasi waktu?
→ Cari `Naismith Rule` di `js/panels.js` (fungsi `buildAnalysisPanel`)

### Ingin tambah grafik baru?
→ Tambahkan fungsi baru di `js/charts.js` dan panggil dari `drawCharts()`

### Ingin ubah tampilan profil elevasi?
→ Edit `renderCanvas()` di `js/profile.js`

---

## 📚 Referensi Jurnal yang Digunakan

- **Wall, I. (2021)** — Mountaineering Risk, Safety and Security
- **Applied Ergonomics (2022)** — Physiological Stress: Backpack Load & Slope
- **WMS Guidelines (2024)** — Prevention of Acute Altitude Illness
- **DZSM (2020)** — High-Altitude Illnesses Pathophysiology
- **Nagano ML Study (2025)** — Predicting Mountain Accident Risks
- **Siguniang (2025)** — Risk Decision-Making in Mountaineering

---

*Dibuat oleh Radhyka Galih Pranata*
