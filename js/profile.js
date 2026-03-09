/* =====================================================
   profile.js
   Menggambar profil elevasi interaktif menggunakan Canvas
   - Warna lereng gradient (slope-colored fill)
   - Hover tooltip
   - Klik → zoom peta ke titik tersebut
   - Waypoint markers di atas profil
   ===================================================== */

let hoverMark = null; // marker Leaflet yang mengikuti hover profil
let clickPulse = null; // marker pulse saat klik profil

// =====================================================
// INISIALISASI PROFIL (dipanggil setelah layer di-analyze)
// =====================================================
function drawProfile(A, color, wps) {
  document.getElementById('sempE').style.display = 'none';
  const cv = document.getElementById('pCanvas');
  cv.style.display = 'block';

  // Render pertama kali
  renderCanvas(A, color, wps);

  // Event hover
  cv.onmousemove = e => onHover(e, A, color, wps);

  // Event leave hover
  cv.onmouseleave = () => {
    document.getElementById('ctip').style.display = 'none';
    if (hoverMark) { map.removeLayer(hoverMark); hoverMark = null; }
    renderCanvas(A, color, wps);
  };

  // Event klik → zoom ke titik
  cv.onclick = e => onProfileClick(e, A, color, wps);
}

// =====================================================
// RENDER CANVAS UTAMA
// =====================================================
function renderCanvas(A, color, wps) {
  const cv = document.getElementById('pCanvas');
  const sb = document.getElementById('sbody');
  cv.width  = sb.clientWidth  || 800;
  cv.height = sb.clientHeight || 300;

  const ctx = cv.getContext('2d');
  const W = cv.width, H = cv.height;

  // Margin: left=50 (label elev), right=14, top=10, bottom=32 (label jarak)
  const P = { l: 50, r: 14, t: 10, b: 32 };
  const DW = W - P.l - P.r;
  const DH = H - P.t - P.b;

  ctx.clearRect(0, 0, W, H);

  const elevs = A.elevs, dists = A.dists;
  const maxE = A.maxE, minE = A.minE, rng = maxE - minE || 1, totD = A.totalDist || 1;
  const N = Math.min(elevs.length, dists.length);

  // ---- Gridlines Y (elevasi) ----
  const gY = 5;
  ctx.font = '9px Space Mono,monospace';
  for (let i = 0; i <= gY; i++) {
    const y = P.t + DH * (1 - i / gY);
    ctx.strokeStyle = 'rgba(54,82,74,0.35)'; ctx.lineWidth = 1; ctx.setLineDash([2, 4]);
    ctx.beginPath(); ctx.moveTo(P.l, y); ctx.lineTo(P.l + DW, y); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(106,144,112,0.85)'; ctx.textAlign = 'right';
    ctx.fillText((minE + rng * i / gY).toFixed(0), P.l - 5, y + 3);
  }

  // ---- Gridlines X (jarak) ----
  const gX = 8;
  for (let i = 0; i <= gX; i++) {
    const x = P.l + DW * i / gX;
    ctx.strokeStyle = 'rgba(54,82,74,0.2)'; ctx.lineWidth = 1; ctx.setLineDash([2, 4]);
    ctx.beginPath(); ctx.moveTo(x, P.t); ctx.lineTo(x, P.t + DH); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(106,144,112,0.85)'; ctx.textAlign = 'center';
    ctx.fillText((totD / 1000 * i / gX).toFixed(1), x, P.t + DH + 14);
  }

  // ---- Label Sumbu ----
  ctx.fillStyle = 'rgba(106,144,112,0.7)'; ctx.font = '8px Space Mono,monospace';
  ctx.textAlign = 'center';
  ctx.fillText('Jarak (km)', P.l + DW / 2, H - 3);
  ctx.save(); ctx.translate(11, P.t + DH / 2); ctx.rotate(-Math.PI / 2);
  ctx.fillText('Elevasi (m)', 0, 0); ctx.restore();

  // ---- Garis Sumbu ----
  ctx.strokeStyle = 'rgba(54,82,74,0.6)'; ctx.lineWidth = 1; ctx.setLineDash([]);
  ctx.beginPath(); ctx.moveTo(P.l, P.t); ctx.lineTo(P.l, P.t + DH); ctx.lineTo(P.l + DW, P.t + DH); ctx.stroke();

  // ---- Hitung titik-titik di layar ----
  const pts = [];
  for (let i = 0; i < N; i++) {
    pts.push({
      x: P.l + DW * (dists[i] / totD),
      y: P.t + DH * (1 - (elevs[i] - minE) / rng),
      e: elevs[i], d: dists[i], s: A.slopes[i - 1] || 0
    });
  }

  // ---- Fill Warna Lereng (slope-colored segments) ----
  for (let i = 1; i < pts.length; i++) {
    const rgb = slopeRGB(pts[i].s);
    ctx.beginPath();
    ctx.moveTo(pts[i - 1].x, pts[i - 1].y);
    ctx.lineTo(pts[i].x, pts[i].y);
    ctx.lineTo(pts[i].x, P.t + DH);
    ctx.lineTo(pts[i - 1].x, P.t + DH);
    ctx.closePath();
    ctx.fillStyle = `rgba(${rgb},0.55)`;
    ctx.fill();
  }

  // ---- Gradient Overlay (kesan terrain) ----
  const gradO = ctx.createLinearGradient(0, P.t, 0, P.t + DH);
  gradO.addColorStop(0, hexToRgba(color, 0.35));
  gradO.addColorStop(0.35, hexToRgba(color, 0.15));
  gradO.addColorStop(1, hexToRgba(color, 0.0));
  ctx.beginPath();
  ctx.moveTo(pts[0].x, P.t + DH);
  pts.forEach(p => ctx.lineTo(p.x, p.y));
  ctx.lineTo(pts[pts.length - 1].x, P.t + DH);
  ctx.closePath();
  ctx.fillStyle = gradO;
  ctx.fill();

  // ---- Garis Elevasi Utama ----
  ctx.beginPath();
  pts.forEach((p, i) => { i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y); });
  ctx.strokeStyle = color; ctx.lineWidth = 2.5; ctx.lineJoin = 'round'; ctx.setLineDash([]);
  ctx.stroke();

  // ---- Bar Lereng (bawah canvas) ----
  const barH = 5, barY = P.t + DH + 20;
  for (let i = 1; i < pts.length; i++) {
    const rgb = slopeRGB(pts[i].s);
    ctx.fillStyle = `rgba(${rgb},0.8)`;
    ctx.fillRect(pts[i - 1].x, barY, pts[i].x - pts[i - 1].x + 1, barH);
  }
  ctx.strokeStyle = 'rgba(54,82,74,0.5)'; ctx.lineWidth = 0.5;
  ctx.strokeRect(P.l, barY, DW, barH);
  ctx.fillStyle = 'rgba(106,144,112,0.6)'; ctx.font = '7px Space Mono,monospace'; ctx.textAlign = 'left';
  ctx.fillText('LERENG', P.l, barY + 14);

  // ---- Marker Waypoint ----
  const wpPts = [];
  wps.forEach((wp) => {
    const c = wp.coord;
    let bi = -1, bd = Infinity;
    A.coords.forEach((co, i) => {
      const d = Math.hypot(co[0] - c[0], co[1] - c[1]);
      if (d < bd) { bd = d; bi = i; }
    });
    if (bi < 0 || !pts[bi]) return;
    const px = pts[bi];
    wpPts.push({ x: px.x, y: px.y, name: wp.name, e: px.e, d: px.d, bi });

    // Tick dashed samar
    ctx.strokeStyle = 'rgba(255,255,255,0.10)'; ctx.lineWidth = 1; ctx.setLineDash([2, 5]);
    ctx.beginPath(); ctx.moveTo(px.x, P.t + DH); ctx.lineTo(px.x, px.y); ctx.stroke();
    ctx.setLineDash([]);

    // Dot waypoint
    ctx.beginPath(); ctx.arc(px.x, px.y, 5.5, 0, Math.PI * 2);
    ctx.fillStyle = color + '33'; ctx.fill();
    ctx.beginPath(); ctx.arc(px.x, px.y, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#fff'; ctx.fill();
    ctx.strokeStyle = color; ctx.lineWidth = 1.8; ctx.stroke();

    // Badge elevasi kecil di bawah dot
    const ev = px.e.toFixed(0) + 'm';
    ctx.font = '6px Space Mono,monospace'; ctx.textAlign = 'center';
    const ew = ctx.measureText(ev).width + 8;
    const ey = Math.min(px.y + 8, P.t + DH - 13);
    ctx.fillStyle = 'rgba(10,20,14,0.80)';
    if (ctx.roundRect) ctx.roundRect(px.x - ew / 2, ey, ew, 11, 2);
    else ctx.rect(px.x - ew / 2, ey, ew, 11);
    ctx.fill();
    ctx.fillStyle = color + 'cc'; ctx.fillText(ev, px.x, ey + 8);
  });
  cv._wpPts = wpPts;

  // ---- Marker MAX/MIN ----
  drawMinMaxMarker(ctx, pts, A.elevs, maxE, 'MAX ▲', color, P, 'top');
  drawMinMaxMarker(ctx, pts, A.elevs, minE, 'MIN ▼', '#ff7043', P, 'bottom');

  // Simpan data untuk hover/klik
  cv._pts = pts; cv._P = P; cv._A = A;
}

// ---- Gambar label MAX/MIN ----
function drawMinMaxMarker(ctx, pts, elevs, val, lbl, c, P, pos) {
  const i = elevs.indexOf(val);
  if (i < 0 || !pts[i]) return;
  const px  = pts[i];
  const tag = lbl + ': ' + val.toFixed(0) + 'm';
  ctx.font  = 'bold 8px Space Mono,monospace';
  const tw  = ctx.measureText(tag).width + 10;
  const by  = pos === 'top' ? px.y - 22 : px.y + 9;
  ctx.fillStyle = 'rgba(10,18,14,0.9)';
  if (ctx.roundRect) ctx.roundRect(px.x - tw / 2, by, tw, 15, 4);
  else ctx.rect(px.x - tw / 2, by, tw, 15);
  ctx.fill();
  ctx.strokeStyle = c + '80'; ctx.lineWidth = 1; ctx.stroke();
  ctx.fillStyle = c; ctx.textAlign = 'center';
  ctx.fillText(tag, px.x, by + 11);
}

// =====================================================
// HOVER: tampilkan info titik di cursor
// =====================================================
function onHover(e, A, color, wps) {
  const cv = document.getElementById('pCanvas'), P = cv._P, pts = cv._pts;
  if (!pts || !P) return;

  const rect = cv.getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;
  if (mx < P.l || mx > P.l + (cv.width - P.l - P.r)) return;

  // Cek apakah kursor di atas waypoint dot
  const wpPts = cv._wpPts || [];
  let hovWP = null;
  for (const wp of wpPts) {
    if (Math.hypot(mx - wp.x, my - wp.y) < 12) { hovWP = wp; break; }
  }
  cv.style.cursor = hovWP ? 'pointer' : 'crosshair';

  // Cari titik profil terdekat secara horizontal
  let bi = 0, bd = Infinity;
  pts.forEach((p, i) => { const d = Math.abs(p.x - mx); if (d < bd) { bd = d; bi = i; } });
  const pt = pts[bi]; if (!pt) return;

  renderCanvas(A, color, wps);
  const ctx = cv.getContext('2d');
  const DH  = cv.height - P.t - P.b;

  // Garis vertikal kursor
  ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 1; ctx.setLineDash([4, 4]);
  ctx.beginPath(); ctx.moveTo(pt.x, P.t); ctx.lineTo(pt.x, P.t + DH); ctx.stroke();
  ctx.setLineDash([]);

  // Titik crosshair
  ctx.beginPath(); ctx.arc(pt.x, pt.y, 6, 0, Math.PI * 2);
  ctx.fillStyle = color; ctx.fill();
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();

  // Jika hover waypoint → tampilkan nama
  if (hovWP) {
    ctx.beginPath(); ctx.arc(hovWP.x, hovWP.y, 9, 0, Math.PI * 2);
    ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.setLineDash([]); ctx.stroke();
    ctx.font = 'bold 9px Outfit,sans-serif'; ctx.textAlign = 'center';
    const nw = Math.max(ctx.measureText(hovWP.name).width + 16, 80);
    const DW2 = cv.width - P.l - P.r;
    const nx = Math.min(Math.max(hovWP.x, P.l + nw / 2 + 2), P.l + DW2 - nw / 2 - 2);
    const ny = Math.max(P.t + 4, hovWP.y - 36);
    ctx.fillStyle = 'rgba(10,20,14,0.92)';
    ctx.strokeStyle = color + '80'; ctx.lineWidth = 1;
    if (ctx.roundRect) ctx.roundRect(nx - nw / 2, ny, nw, 19, 4);
    else ctx.rect(nx - nw / 2, ny, nw, 19);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#eaf5ec'; ctx.fillText(hovWP.name, nx, ny + 12);
    ctx.font = '6.5px Space Mono,monospace';
    ctx.fillStyle = color + 'bb'; ctx.fillText('Klik untuk zoom →', nx, ny + 21);
    return;
  }

  // Info box data titik normal
  const sl  = pt.s, sc2 = slopeClass(sl);
  const lines = [`${(pt.d / 1000).toFixed(3)} km`, `${pt.e.toFixed(1)} m`, `${sl.toFixed(1)}°`, sc2.lbl];
  const iW = 118, iH = 62;
  const ix = pt.x + 12 > cv.width - iW - 10 ? pt.x - iW - 12 : pt.x + 12;
  const iy = Math.max(P.t, pt.y - 30);
  ctx.fillStyle = 'rgba(18,30,22,0.96)';
  ctx.strokeStyle = 'rgba(54,82,74,0.9)'; ctx.lineWidth = 1;
  if (ctx.roundRect) ctx.roundRect(ix, iy, iW, iH, 6);
  else ctx.rect(ix, iy, iW, iH);
  ctx.fill(); ctx.stroke();
  ctx.font = '8.5px Space Mono,monospace';
  const lbls = ['Jarak', 'Elevasi', 'Lereng', 'Kelas'];
  const cols = [color, '#00d4ff', '#ffd740', sc2.c];
  lbls.forEach((l, i) => {
    ctx.fillStyle = 'rgba(106,144,112,0.8)'; ctx.textAlign = 'left'; ctx.fillText(l, ix + 7, iy + 13 + i * 12);
    ctx.fillStyle = cols[i]; ctx.textAlign = 'right'; ctx.fillText(lines[i], ix + iW - 7, iy + 13 + i * 12);
  });

  // Marker di peta mengikuti hover
  const coord = A.coords[bi];
  if (coord) {
    if (hoverMark) map.removeLayer(hoverMark);
    hoverMark = L.circleMarker([coord[1], coord[0]], {
      radius: 9, color, fillColor: '#fff', weight: 2.5, fillOpacity: 0.9, pane: 'popupPane'
    }).addTo(map);
  }
}

// =====================================================
// KLIK PROFIL → zoom peta ke titik / waypoint
// =====================================================
function onProfileClick(e, A, color, wps) {
  const cv = document.getElementById('pCanvas'), P = cv._P, pts = cv._pts;
  if (!pts || !P) return;

  const rect = cv.getBoundingClientRect();
  const mx   = e.clientX - rect.left;
  const my   = e.clientY - rect.top;
  if (mx < P.l || mx > P.l + (cv.width - P.l - P.r)) return;

  // Cek klik di waypoint dot
  const wpPts = cv._wpPts || [];
  let hitWP = null;
  for (const wp of wpPts) {
    if (Math.hypot(mx - wp.x, my - wp.y) < 14) { hitWP = wp; break; }
  }

  if (hitWP) {
    // Zoom ke waypoint yang diklik
    renderCanvas(A, color, wps);
    const ctx = cv.getContext('2d');
    const DW  = cv.width - P.l - P.r;
    ctx.beginPath(); ctx.arc(hitWP.x, hitWP.y, 9, 0, Math.PI * 2);
    ctx.strokeStyle = activeColor; ctx.lineWidth = 2.5; ctx.setLineDash([]); ctx.stroke();
    ctx.font = 'bold 9px Outfit,sans-serif'; ctx.textAlign = 'center';
    const lw = Math.max(ctx.measureText(hitWP.name).width + 16, 80);
    const lx = Math.min(Math.max(hitWP.x, P.l + lw / 2 + 2), P.l + DW - lw / 2 - 2);
    const ly = Math.max(P.t + 4, hitWP.y - 38);
    ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 1; ctx.setLineDash([3, 3]);
    ctx.beginPath(); ctx.moveTo(hitWP.x, hitWP.y - 9); ctx.lineTo(hitWP.x, ly + 15); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(10,20,14,0.94)';
    ctx.strokeStyle = activeColor + '90'; ctx.lineWidth = 1.2;
    if (ctx.roundRect) ctx.roundRect(lx - lw / 2, ly, lw, 20, 4);
    else ctx.rect(lx - lw / 2, ly, lw, 20);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#eaf5ec'; ctx.fillText(hitWP.name, lx, ly + 13);
    ctx.font = '7px Space Mono,monospace';
    ctx.fillStyle = activeColor + 'cc';
    ctx.fillText((hitWP.e / 1000 >= 1 ? (hitWP.e / 1000).toFixed(2) + 'k' : hitWP.e.toFixed(0)) + ' m dpl', lx, ly + 22);
    flyToWaypoint(
      A.coords[pts.findIndex(p => Math.abs(p.x - hitWP.x) < 1)]?.[1] || 0,
      A.coords[pts.findIndex(p => Math.abs(p.x - hitWP.x) < 1)]?.[0] || 0,
      hitWP.e, hitWP.name, activeColor
    );
    notify(`📍 ${hitWP.name} — ${hitWP.e.toFixed(0)} m dpl`, 'ok');
    return;
  }

  // Klik titik biasa → zoom peta
  let bi = 0, bd = Infinity;
  pts.forEach((p, i) => { const d = Math.abs(p.x - mx); if (d < bd) { bd = d; bi = i; } });
  const coord = A.coords[bi];
  if (!coord) return;

  map.flyTo([coord[1], coord[0]], 16, { duration: 0.9, easeLinearity: 0.4 });
  if (clickPulse) { map.removeLayer(clickPulse); clickPulse = null; }

  const pt  = pts[bi], sc2 = slopeClass(pt.s);
  clickPulse = L.circleMarker([coord[1], coord[0]], {
    radius: 12, color: sc2.c, fillColor: sc2.c, weight: 3, fillOpacity: 0.3, pane: 'popupPane'
  }).addTo(map).bindPopup(
    `<div style="font-family:'Rajdhani',sans-serif;">
      <div style="font-size:13px;font-weight:700;color:#eaf5ec;margin-bottom:4px;">📍 Titik Profil</div>
      <div style="font-size:10px;color:#6a9070;">Jarak &nbsp;<span style="color:#5fffa0">${(pt.d / 1000).toFixed(3)} km</span></div>
      <div style="font-size:10px;color:#00d4ff;">Elevasi &nbsp;<span style="color:#00d4ff">${pt.e.toFixed(1)} m</span></div>
      <div style="font-size:10px;color:#6a9070;">Lereng &nbsp;<span style="color:${sc2.c}">${pt.s.toFixed(1)}° — ${sc2.lbl}</span></div>
    </div>`, { maxWidth: 200 }
  ).openPopup();

  // Ring klik di canvas
  renderCanvas(A, color, wps);
  const ctx = cv.getContext('2d');
  ctx.beginPath(); ctx.arc(pt.x, pt.y, 9, 0, Math.PI * 2);
  ctx.strokeStyle = sc2.c; ctx.lineWidth = 2.5; ctx.setLineDash([]); ctx.stroke();
  ctx.beginPath(); ctx.arc(pt.x, pt.y, 5, 0, Math.PI * 2);
  ctx.fillStyle = '#fff'; ctx.fill();
  ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.stroke();

  notify(`📍 Zoom ke ${(pt.d / 1000).toFixed(2)} km — ${pt.e.toFixed(0)} m dpl`, 'ok');
  setTimeout(() => { if (clickPulse) { map.removeLayer(clickPulse); clickPulse = null; } }, 4000);
}

// =====================================================
// STRIP TOGGLE (buka/tutup profil)
// =====================================================
let stripOpen = true;
function toggleStrip() {
  const s = document.getElementById('estrip');
  const t = document.getElementById('stog');
  stripOpen = !stripOpen;
  s.classList.toggle('collapsed', !stripOpen);
  t.textContent = stripOpen ? '▼' : '▲';
  if (stripOpen && profileData) {
    setTimeout(() => renderCanvas(profileData, activeColor, activeWPs), 320);
  }
}

// ---- Auto re-render saat ukuran panel berubah ----
new ResizeObserver(() => {
  if (profileData && stripOpen) {
    renderCanvas(profileData, activeColor, activeWPs);
  }
}).observe(document.getElementById('sbody'));
