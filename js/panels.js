/* =====================================================
   panels.js
   Mengisi konten panel kanan:
   - Tab Lereng: tabel segmen kemiringan
   - Tab Waypoint: daftar pos pendakian
   - Tab Analisis: analisis berbasis jurnal ilmiah
   ===================================================== */

// =====================================================
// TAB SWITCHER
// =====================================================
function switchTab(name, btn) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tc').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('tab-' + name).classList.add('active');
}

// =====================================================
// TAB LERENG: tabel per-segmen kemiringan
// =====================================================
function drawSlopeTab(A) {
  document.getElementById('slE').style.display = 'none';
  document.getElementById('slC').style.display = 'block';

  const dk = A.totalDist / 1000;
  const et = (dk / 3 + A.totalGain / 400).toFixed(1);

  // Info ringkasan
  document.getElementById('tiT').textContent = et;
  document.getElementById('tiP').textContent = A.coords.length;
  document.getElementById('tiA').textContent = A.avgS.toFixed(1) + '°';
  document.getElementById('tiG').textContent = A.totalGain.toFixed(0);
  document.getElementById('tiL').textContent = A.totalLoss.toFixed(0);
  document.getElementById('tiM').textContent = A.maxE.toFixed(0);

  // Batasi jumlah baris tabel (max 30)
  const step = Math.max(1, Math.floor(A.segs.length / 30));
  const rows = A.segs.map((s, origIdx) => ({ ...s, origIdx })).filter((_, i) => i % step === 0);

  document.getElementById('stbody').innerHTML = rows.map((s, i) => {
    const sc   = slopeClass(s.sd);
    const cIdx = Math.min(s.origIdx + 1, A.coords.length - 1);
    return `<tr class="srow" onclick="zoomToSegment(${cIdx})" title="Klik untuk zoom ke lokasi">
      <td style="font-family:'Space Mono',monospace;font-size:8px;color:var(--txtm);">${i + 1}</td>
      <td>${s.dist.toFixed(1)}</td>
      <td style="color:${s.de >= 0 ? '#44ff88' : '#ff4444'}">${s.de >= 0 ? '+' : ''}${s.de.toFixed(1)}</td>
      <td style="font-family:'Space Mono',monospace;">${s.sd.toFixed(1)}°</td>
      <td><span class="chip ${sc.chip}">${sc.lbl}</span></td>
    </tr>`;
  }).join('');
}

// ---- Klik baris tabel → zoom ke segmen tersebut ----
let segZoomPulse = null;
function zoomToSegment(cIdx) {
  if (!currentA || !currentA.coords[cIdx]) return;
  const coord = currentA.coords[cIdx];
  const lat = coord[1], lng = coord[0], elev = coord[2] || 0;
  const sl  = currentA.slopes[cIdx - 1] || 0;
  const sc2 = slopeClass(sl);

  map.flyTo([lat, lng], 17, { duration: 0.85, easeLinearity: 0.4 });
  if (segZoomPulse) map.removeLayer(segZoomPulse);

  segZoomPulse = L.circleMarker([lat, lng], {
    radius: 11, color: sc2.c, fillColor: sc2.c, weight: 3, fillOpacity: 0.25, pane: 'popupPane'
  }).addTo(map).bindPopup(
    `<div style="font-family:'Rajdhani',sans-serif;">
      <div style="font-size:13px;font-weight:700;color:#eaf5ec;margin-bottom:4px;">📐 Segmen Lereng</div>
      <div style="font-size:10px;color:#6a9070;margin-bottom:1px;">Elevasi &nbsp;<span style="color:#00d4ff">${elev.toFixed(0)} m dpl</span></div>
      <div style="font-size:10px;color:#6a9070;margin-bottom:1px;">Kemiringan &nbsp;<span style="color:${sc2.c}">${sl.toFixed(1)}° — ${sc2.lbl}</span></div>
      <div style="font-size:10px;color:#6a9070;">Koordinat &nbsp;<span style="color:#c8e0cc">${lat.toFixed(5)}°, ${lng.toFixed(5)}°</span></div>
    </div>`, { maxWidth: 220 }
  ).openPopup();

  notify(`📐 Lereng ${sl.toFixed(1)}° · ${elev.toFixed(0)} m dpl · ${sc2.lbl}`, 'ok');
  setTimeout(() => { if (segZoomPulse) { map.removeLayer(segZoomPulse); segZoomPulse = null; } }, 5000);
}

// =====================================================
// TAB WAYPOINT: daftar pos/titik pendakian
// =====================================================

// Ekstrak waypoints dari GeoJSON (hanya fitur Point)
function getWaypointsFromGeoJSON(gj) {
  const fs  = gj.features || [gj];
  const wps = (fs || []).filter(f => f && f.geometry && f.geometry.type === 'Point').map(f => ({
    name: (f.properties && (f.properties.name || f.properties.Name || f.properties.NAMA)) || 'WP',
    coord: f.geometry.coordinates
  }));
  // Urutkan dari elevasi terendah → tertinggi
  return wps.sort((a, b) => (a.coord[2] || 0) - (b.coord[2] || 0));
}

function updateWaypointPanel(gj, color) {
  const WP_COLORS = ['#ffd740','#ff7043','#00e5ff','#e040fb','#69ff47','#ff4081','#40c4ff'];
  const idx       = layers.findIndex(l => l.gj === gj);
  const wpColor   = WP_COLORS[Math.max(0, idx) % WP_COLORS.length];
  const fs        = gj.features || [gj];
  let wps         = (fs || []).filter(f => f && f.geometry && f.geometry.type === 'Point');

  const em  = document.getElementById('wpE');
  const con = document.getElementById('wpC');

  if (!wps.length) { em.style.display = 'block'; con.style.display = 'none'; return; }

  // Urutkan elevasi terendah → tertinggi
  wps = [...wps].sort((a, b) => (a.geometry.coordinates[2] || 0) - (b.geometry.coordinates[2] || 0));

  em.style.display  = 'none';
  con.style.display = 'block';

  // Warna gradient berdasarkan elevasi relatif
  const elevs = wps.map(f => f.geometry.coordinates[2] || 0);
  const minE  = Math.min(...elevs), maxE = Math.max(...elevs);

  function elevColor(e) {
    const t = (e - minE) / Math.max(1, maxE - minE);
    if (t < 0.33) return `hsl(${142 - t / 0.33 * 60},100%,60%)`;
    if (t < 0.66) return `hsl(${82 - (t - 0.33) / 0.33 * 42},100%,55%)`;
    return `hsl(${40 - (t - 0.66) / 0.34 * 40},100%,55%)`;
  }

  document.getElementById('wpList').innerHTML = wps.map((f, i) => {
    const p     = f.properties || {};
    const nm    = p.name || p.Name || p.NAMA || `WP ${i + 1}`;
    const c     = f.geometry.coordinates;
    const elev  = c[2] || 0;
    const eColor = elevColor(elev);
    const isBase = i === 0, isPeak = i === wps.length - 1;
    const tag    = isBase ? '🏕 BASECAMP' : isPeak ? '🏔 PUNCAK' : null;

    return `<div class="wpi" onclick="flyToWaypoint(${c[1]},${c[0]},${elev},'${nm.replace(/'/g,"\\'")}','${wpColor}')">
      <div style="display:flex;flex-direction:column;align-items:center;gap:2px;">
        <div class="wpidx" style="background:${eColor};box-shadow:0 0 6px ${eColor}60;color:#000;">${i + 1}</div>
        ${i < wps.length - 1 ? `<div style="width:2px;height:10px;background:linear-gradient(to bottom,${eColor},${elevColor(wps[i + 1].geometry.coordinates[2] || 0)});border-radius:1px;opacity:.6;"></div>` : ''}
      </div>
      <div style="flex:1;min-width:0;">
        <div style="display:flex;align-items:center;gap:5px;margin-bottom:1px;">
          <div class="wpnm">${nm}</div>
          ${tag ? `<span style="font-size:7px;font-family:'Space Mono',monospace;background:${eColor}22;color:${eColor};border:1px solid ${eColor}44;border-radius:3px;padding:1px 4px;flex-shrink:0;">${tag}</span>` : ''}
        </div>
        <div class="wpco">${c[1].toFixed(5)}°, &nbsp;${c[0].toFixed(5)}°</div>
        <div style="display:flex;align-items:center;gap:6px;margin-top:2px;">
          <div class="wpel" style="color:${eColor};">⬆ ${elev.toFixed(0)} m dpl</div>
          ${i > 0 ? `<div style="font-size:8px;color:var(--txtm);">+${(elev - (wps[i - 1].geometry.coordinates[2] || 0)).toFixed(0)}m dari pos sebelumnya</div>` : ''}
        </div>
      </div>
      <div style="font-size:9px;color:var(--txtm);align-self:center;">→</div>
    </div>`;
  }).join('');
}

// ---- Fly ke waypoint + popup ----
let wpPulse = null;
function flyToWaypoint(lat, lng, elev, name, color) {
  map.flyTo([lat, lng], 16, { duration: 0.9, easeLinearity: 0.4 });
  if (wpPulse) map.removeLayer(wpPulse);
  wpPulse = L.circleMarker([lat, lng], {
    radius: 10, color, fillColor: color, weight: 2.5, fillOpacity: 0.3, pane: 'popupPane'
  }).addTo(map).bindPopup(
    `<div style="font-family:'Rajdhani',sans-serif;">
      <div style="font-size:13px;font-weight:700;color:#eaf5ec;margin-bottom:5px;">📍 ${name}</div>
      <div style="font-size:10px;color:#6a9070;">Elevasi &nbsp;<span style="color:#00d4ff">${elev ? elev.toFixed(0) + ' m dpl' : '—'}</span></div>
      <div style="font-size:10px;color:#6a9070;">Koordinat &nbsp;<span style="color:#c8e0cc">${lat.toFixed(5)}°, ${lng.toFixed(5)}°</span></div>
    </div>`, { maxWidth: 200 }
  ).openPopup();
  notify(`📍 ${name} · ${elev ? elev.toFixed(0) + ' m dpl' : ''}`, 'ok');
  setTimeout(() => { if (wpPulse) { map.removeLayer(wpPulse); wpPulse = null; } }, 5000);
}

// =====================================================
// TAB ANALISIS: kartu analisis berbasis jurnal ilmiah
// =====================================================
function buildAnalysisPanel(A) {
  document.getElementById('anE').style.display = 'none';
  document.getElementById('anC').style.display = 'block';

  const dk = A.totalDist / 1000;
  const et = (dk / 3 + A.totalGain / 400);

  // ---- 1. AMS Risk (WMS Clinical Guidelines 2024 + DZSM 2020) ----
  const amsRisk = A.maxE > 3500
    ? { lv: 'KRITIS', c: '#ff2c2c', pct: 100, desc: 'Risiko HACE/HAPE. Aklimatisasi ketat wajib.' }
    : A.maxE > 3000 ? { lv: 'TINGGI',  c: '#ff6b35', pct: 75,  desc: 'Naik maks 500 m/malam. Satu malam ekstra tiap 1.000 m.' }
    : A.maxE > 2500 ? { lv: 'SEDANG',  c: '#ffaa00', pct: 50,  desc: 'Mulai berpotensi AMS. Pantau sakit kepala & mual.' }
    :                 { lv: 'RENDAH',  c: '#44ff88', pct: 20,  desc: 'Di bawah threshold AMS umumnya (<2.500 m).' };

  const acclDays   = A.maxE > 3000 ? Math.ceil((A.maxE - 3000) / 1000) : 0;
  const acclNights = A.maxE > 2750 ? Math.ceil((A.maxE - 2750) / 500)  : 0;

  // ---- 2. Physiological Load (Applied Ergonomics 2022) ----
  const avgSlopeP = Math.tan(A.avgS * Math.PI / 180) * 100;
  const maxSlopeP = Math.tan(A.maxS * Math.PI / 180) * 100;
  const vo2Avg    = Math.min(99, Math.round(30 + avgSlopeP * 2.2));
  const vo2Max    = Math.min(99, Math.round(30 + maxSlopeP * 2.2));
  const vo2Color  = vo2Max > 80 ? '#ff2c2c' : vo2Max > 65 ? '#ff6b35' : vo2Max > 50 ? '#ffaa00' : '#44ff88';
  const hrEst     = Math.min(99, Math.round(45 + avgSlopeP * 1.8));
  const hrColor   = hrEst > 85 ? '#ff2c2c' : hrEst > 70 ? '#ff6b35' : hrEst > 55 ? '#ffaa00' : '#44ff88';

  // ---- 3. Fatigue & Incident Risk (Nagano 2025) ----
  let fallRisk = 0, fatigueRisk = 0, slipRisk = 0;
  fallRisk    = A.maxS > 45 ? 90 : A.maxS > 30 ? 65 : A.maxS > 20 ? 40 : 15;
  fatigueRisk = (dk > 12 || A.totalGain > 1500) ? 75 : (dk > 8 || A.totalGain > 800) ? 50 : 25;
  slipRisk    = A.maxS > 25 ? 70 : A.maxS > 15 ? 45 : 20;
  const riskColor = v => v > 70 ? '#ff2c2c' : v > 50 ? '#ff6b35' : v > 30 ? '#ffaa00' : '#44ff88';

  // ---- 4. Backpack Load Rec (Applied Ergonomics 2021) ----
  const packRec = A.maxS > 20 ? 'Maks 15% berat badan (beban berat pada lereng >20% meningkatkan VO₂ signifikan)'
    : A.maxS > 10 ? 'Maks 20% berat badan — lereng moderat'
    : 'Maks 25% berat badan pada jalur landai';

  // ---- 5. Jadwal Aklimatisasi ----
  const schedRows = [];
  if (A.maxE > 2750) {
    let cur = 2750;
    while (cur < A.maxE) {
      const next = Math.min(cur + 500, A.maxE);
      schedRows.push({ from: cur, to: next, rest: (next - cur >= 500) ? 1 : 0 });
      cur = next;
    }
  }

  // ---- Render HTML ----
  document.getElementById('anC').innerHTML = `

  <!-- AMS RISK -->
  <div class="jcard">
    <div class="jcard-head">
      <span class="jcard-title">🏔 Risiko AMS / Altitude</span>
      <span class="jcard-src">WMS Guidelines 2024</span>
    </div>
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
      <div style="flex:1;">
        <div style="display:flex;justify-content:space-between;font-size:9px;margin-bottom:4px;">
          <span style="color:var(--txtm);">Level Risiko</span>
          <span style="color:${amsRisk.c};font-family:'Rajdhani',sans-serif;font-weight:700;">${amsRisk.lv}</span>
        </div>
        <div class="diftrack"><div class="diffill" style="width:${amsRisk.pct}%;background:${amsRisk.c};"></div></div>
      </div>
    </div>
    <div style="font-size:9px;color:var(--txtm);line-height:1.5;margin-bottom:8px;">${amsRisk.desc}</div>
    <div class="jgrid">
      <div class="jitem"><div class="jitem-lbl">Elev Maks</div><div class="jitem-val">${A.maxE.toFixed(0)}<span class="jitem-unit"> m</span></div></div>
      <div class="jitem"><div class="jitem-lbl">Threshold AMS</div><div class="jitem-val" style="color:${A.maxE > 2500 ? '#ffaa00' : '#44ff88'}">2.500<span class="jitem-unit"> m</span></div></div>
      ${acclNights > 0 ? `<div class="jitem"><div class="jitem-lbl">Malam Aklim.</div><div class="jitem-val" style="color:#00d4ff">${acclNights}<span class="jitem-unit"> mlm</span></div></div>` : ''}
      ${acclDays   > 0 ? `<div class="jitem"><div class="jitem-lbl">Hari Ekstra</div><div class="jitem-val" style="color:#ffd740">${acclDays}<span class="jitem-unit"> hr</span></div></div>` : ''}
    </div>
    ${schedRows.length ? `<div style="font-family:'Rajdhani',sans-serif;font-size:9px;color:var(--accent);letter-spacing:1.5px;text-transform:uppercase;margin:6px 0 5px;">Jadwal Aklimatisasi</div>
    ${schedRows.map((r, i) => `<div style="display:flex;align-items:center;gap:6px;font-size:9px;padding:3px 0;border-bottom:1px solid var(--border);">
      <span style="color:var(--txtm);width:14px;font-family:'Space Mono',monospace;">${i + 1}</span>
      <span style="color:var(--txtb);">${r.from.toLocaleString()} → ${r.to.toLocaleString()} m</span>
      ${r.rest ? `<span style="margin-left:auto;color:#00d4ff;font-family:'Space Mono',monospace;font-size:8px;">+1 malam istirahat</span>` : ''}
    </div>`).join('')}` : ''}
  </div>

  <!-- PHYSIOLOGICAL LOAD -->
  <div class="jcard">
    <div class="jcard-head">
      <span class="jcard-title">💪 Beban Fisiologis</span>
      <span class="jcard-src">Appl. Ergonomics 2022</span>
    </div>
    <div style="font-size:9px;color:var(--txtm);margin-bottom:8px;line-height:1.5;">
      Estimasi berdasarkan kemiringan lereng & beban ransel 20% BB (Wall, 2021; Physiological Stress Study, 2022)
    </div>
    <div class="jmeter-wrap">
      <div class="jmeter">
        <span class="jmeter-lbl">VO₂max Rata² 🫁</span>
        <div class="jmeter-bar"><div class="jmeter-fill" style="width:${vo2Avg}%;background:${vo2Avg > 70 ? '#ff6b35' : '#44ff88'};"></div></div>
        <span class="jmeter-val" style="color:${vo2Avg > 70 ? '#ff6b35' : '#44ff88'};">~${vo2Avg}%</span>
      </div>
      <div class="jmeter">
        <span class="jmeter-lbl">VO₂max Puncak 🔺</span>
        <div class="jmeter-bar"><div class="jmeter-fill" style="width:${vo2Max}%;background:${vo2Color};"></div></div>
        <span class="jmeter-val" style="color:${vo2Color};">~${vo2Max}%</span>
      </div>
      <div class="jmeter">
        <span class="jmeter-lbl">HR Est. %HRmax ❤️</span>
        <div class="jmeter-bar"><div class="jmeter-fill" style="width:${hrEst}%;background:${hrColor};"></div></div>
        <span class="jmeter-val" style="color:${hrColor};">~${hrEst}%</span>
      </div>
    </div>
    <div style="margin-top:8px;font-size:9px;padding:6px 8px;background:var(--card2);border-radius:5px;border:1px solid var(--border);">
      <span style="color:var(--txtm);">Rekomendasi Beban Ransel</span><br>
      <span style="color:var(--txtb);">${packRec}</span>
    </div>
  </div>

  <!-- INCIDENT RISK -->
  <div class="jcard">
    <div class="jcard-head">
      <span class="jcard-title">⚠️ Profil Risiko Insiden</span>
      <span class="jcard-src">Nagano ML Study 2025</span>
    </div>
    <div style="font-size:9px;color:var(--txtm);margin-bottom:8px;">Distribusi insiden: Jatuh 34.1% · Terpeleset 23.6% · Kelelahan 22.3% · Tersesat 20.0%</div>
    <div class="jmeter-wrap">
      <div class="jmeter">
        <span class="jmeter-lbl">🧗 Risiko Jatuh</span>
        <div class="jmeter-bar"><div class="jmeter-fill" style="width:${fallRisk}%;background:${riskColor(fallRisk)};"></div></div>
        <span class="jmeter-val" style="color:${riskColor(fallRisk)};">${fallRisk}%</span>
      </div>
      <div class="jmeter">
        <span class="jmeter-lbl">😮‍💨 Kelelahan</span>
        <div class="jmeter-bar"><div class="jmeter-fill" style="width:${fatigueRisk}%;background:${riskColor(fatigueRisk)};"></div></div>
        <span class="jmeter-val" style="color:${riskColor(fatigueRisk)};">${fatigueRisk}%</span>
      </div>
      <div class="jmeter">
        <span class="jmeter-lbl">🧊 Terpeleset</span>
        <div class="jmeter-bar"><div class="jmeter-fill" style="width:${slipRisk}%;background:${riskColor(slipRisk)};"></div></div>
        <span class="jmeter-val" style="color:${riskColor(slipRisk)};">${slipRisk}%</span>
      </div>
    </div>
  </div>

  <!-- REKOMENDASI -->
  <div class="jcard">
    <div class="jcard-head"><span class="jcard-title">📋 Rekomendasi</span></div>
    <div style="display:flex;flex-direction:column;gap:0;">
      <div class="jstep">
        <div class="jstep-ico" style="background:rgba(95,255,160,.15);">⏱</div>
        <div style="font-size:10px;color:var(--txt);">Estimasi waktu <strong style="color:var(--accent)">${et.toFixed(1)} jam</strong> (Naismith Rule: 3 km/h + 400 m elev/jam)<span class="jsrc-badge">WMS 2024</span></div>
      </div>
      ${A.maxE > 2500 ? `<div class="jstep">
        <div class="jstep-ico" style="background:rgba(255,170,0,.15);">🏥</div>
        <div style="font-size:10px;color:var(--txt);">AMS dimulai dari ${A.maxE > 3000 ? '<strong style="color:#ff6b35">WAJIB</strong> aklimatisasi' : 'berpotensi'} di atas 2.500 m<span class="jsrc-badge">DZSM 2020</span></div>
      </div>` : ''}
      ${A.maxS > 20 ? `<div class="jstep">
        <div class="jstep-ico" style="background:rgba(255,107,53,.15);">🫁</div>
        <div style="font-size:10px;color:var(--txt);">Lereng >20° meningkatkan VO₂max dan %HRmax — kurangi beban ransel<span class="jsrc-badge">Appl.Ergo 2022</span></div>
      </div>` : ''}
      ${A.maxS > 35 ? `<div class="jstep">
        <div class="jstep-ico" style="background:rgba(255,44,44,.15);">🧗</div>
        <div style="font-size:10px;color:var(--txt);">Lereng >35° → risiko jatuh tinggi. Gunakan tali, crampon, atau poles<span class="jsrc-badge">Nagano 2025</span></div>
      </div>` : ''}
      ${dk > 10 ? `<div class="jstep">
        <div class="jstep-ico" style="background:rgba(0,212,255,.15);">💧</div>
        <div style="font-size:10px;color:var(--txt);">Jalur >10 km: bawa min. 3–4 liter air + elektrolit<span class="jsrc-badge">Wall 2021</span></div>
      </div>` : ''}
      ${A.totalGain > 1500 ? `<div class="jstep">
        <div class="jstep-ico" style="background:rgba(255,215,64,.15);">💪</div>
        <div style="font-size:10px;color:var(--txt);">Gain kumulatif >${A.totalGain.toFixed(0)} m — latihan kardio + kekuatan kaki 4–6 minggu sebelum<span class="jsrc-badge">Appl.Ergo 2021</span></div>
      </div>` : ''}
      <div class="jstep">
        <div class="jstep-ico" style="background:rgba(95,255,160,.15);">🗺</div>
        <div style="font-size:10px;color:var(--txt);">Selalu bawa peta fisik + kompas<span class="jsrc-badge">Siguniang 2025</span></div>
      </div>
      <div class="jstep" style="border-bottom:none;">
        <div class="jstep-ico" style="background:rgba(95,255,160,.15);">📱</div>
        <div style="font-size:10px;color:var(--txt);">Beritahu orang terdekat rencana lengkap: jalur, pos, estimasi kembali<span class="jsrc-badge">WMS 2024</span></div>
      </div>
    </div>
  </div>

  <!-- REFERENSI JURNAL -->
  <div style="background:var(--card);border:1px solid var(--border);border-radius:8px;padding:9px 11px;">
    <div style="font-family:'Rajdhani',sans-serif;font-size:10px;font-weight:700;letter-spacing:2px;color:var(--accent);text-transform:uppercase;margin-bottom:7px;">📚 Referensi Jurnal</div>
    ${[
      { n: 'Wall, I. (2021)',           j: 'J. Tourism & Himalayan Adv. 3(1)',    t: 'Mountaineering Risk, Safety and Security' },
      { n: 'Appl. Ergonomics (2022)',   j: 'DOI: 10.1016/j.aperg.2022.103873',   t: 'Physiological Stress: Backpack Load & Slope' },
      { n: 'WMS Guidelines (2024)',     j: 'Wilderness & Environmental Medicine', t: 'Prevention of Acute Altitude Illness' },
      { n: 'DZSM (2020)',               j: 'DOI: 10.5960/dzsm.2020.459',          t: 'High-Altitude Illnesses Pathophysiology' },
      { n: 'Nagano ML Study (2025)',    j: 'Int. J. Data Science & Analytics',    t: 'Predicting Mountain Accident Risks (DL)' },
      { n: 'Siguniang (2025)',          j: 'Tourism Management Perspectives',     t: 'Risk Decision-Making in Mountaineering' },
    ].map(r => `<div style="padding:4px 0;border-bottom:1px solid rgba(36,53,48,.5);">
      <div style="font-size:9px;color:var(--txtb);font-weight:600;">${r.n} <span style="color:var(--txtm);font-weight:400;">— ${r.t}</span></div>
      <div style="font-family:'Space Mono',monospace;font-size:7px;color:var(--txtm);">${r.j}</div>
    </div>`).join('')}
  </div>`;
}
