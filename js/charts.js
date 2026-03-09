/* =====================================================
   charts.js
   Grafik Chart.js di panel kanan:
   1. Histogram Distribusi Elevasi
   2. Pie chart Kelas Lereng
   3. Line chart Gain/Loss Kumulatif
   ===================================================== */

// ---- Warna default Chart.js ----
Chart.defaults.color       = '#6a9070';
Chart.defaults.borderColor = '#243530';

// ---- Objek penyimpan instance chart (agar bisa di-destroy sebelum re-render) ----
let charts = {};

// ---- Destroy chart yang sudah ada ----
function destroyChart(key) {
  if (charts[key]) { charts[key].destroy(); delete charts[key]; }
}

// =====================================================
// DRAW SEMUA CHARTS
// Dipanggil setiap kali layer baru di-analyze
// =====================================================
function drawCharts(A, color) {
  document.getElementById('diE').style.display = 'none';
  document.getElementById('diC').style.display = 'block';

  drawElevHistogram(A, color);
  drawSlopePie(A);
  drawGainLossChart(A);
}

// =====================================================
// 1. HISTOGRAM DISTRIBUSI ELEVASI
// Berapa banyak titik jalur di rentang elevasi tertentu
// =====================================================
function drawElevHistogram(A, color) {
  destroyChart('he');
  const bins = 10;
  const rng  = A.maxE - A.minE || 1;
  const bs   = rng / bins;
  const cnts = new Array(bins).fill(0);

  A.elevs.forEach(e => {
    const i = Math.min(bins - 1, Math.floor((e - A.minE) / bs));
    cnts[i]++;
  });

  charts['he'] = new Chart(document.getElementById('hElev').getContext('2d'), {
    type: 'bar',
    data: {
      labels: cnts.map((_, i) => (A.minE + i * bs).toFixed(0)),
      datasets: [{
        data: cnts,
        backgroundColor: color + '40',
        borderColor: color,
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { color: '#1a2820' }, ticks: { font: { family: 'Space Mono', size: 8 }, maxTicksLimit: 5 } },
        y: { grid: { color: '#1a2820' }, ticks: { font: { family: 'Space Mono', size: 8 } } }
      }
    }
  });
}

// =====================================================
// 2. PIE CHART KELAS LERENG
// Distribusi persentase tiap kelas kemiringan
// =====================================================
function drawSlopePie(A) {
  destroyChart('sp');
  const cl = { Datar: 0, Landai: 0, 'Agak Curam': 0, Curam: 0, 'Sangat Curam': 0, Vertikal: 0 };
  A.slopes.forEach(s => cl[slopeClass(s).lbl]++);

  const pl  = Object.keys(cl).filter(k => cl[k] > 0);
  const pc  = pl.map(k => cl[k]);
  const pco = pl.map(k => ({
    Datar: '#44ff88', Landai: '#ffd740', 'Agak Curam': '#ff8c00',
    Curam: '#ff6b35', 'Sangat Curam': '#ff2c2c', Vertikal: '#b400ff'
  }[k]));

  charts['sp'] = new Chart(document.getElementById('sPie').getContext('2d'), {
    type: 'doughnut',
    data: {
      labels: pl,
      datasets: [{
        data: pc,
        backgroundColor: pco.map(c => c + '99'),
        borderColor: pco,
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '62%',
      plugins: {
        legend: {
          position: 'right',
          labels: { font: { family: 'Space Mono', size: 8 }, padding: 5, color: '#b2d3bb', boxWidth: 10 }
        }
      }
    }
  });
}

// =====================================================
// 3. LINE CHART GAIN/LOSS KUMULATIF
// Menunjukkan akumulasi naik dan turun sepanjang jalur
// =====================================================
function drawGainLossChart(A) {
  destroyChart('gl');

  // Sampling agar tidak terlalu banyak titik
  const step = Math.max(1, Math.ceil(A.ga.length / 100));
  const gls  = A.ga.filter((_, i) => i % step === 0);
  const lls  = A.la.filter((_, i) => i % step === 0);
  const glx  = A.dists.slice(1).filter((_, i) => i % step === 0).map(d => (d / 1000).toFixed(1));

  charts['gl'] = new Chart(document.getElementById('gChart').getContext('2d'), {
    type: 'line',
    data: {
      labels: glx,
      datasets: [
        {
          label: '↑ Naik', data: gls,
          borderColor: '#44ff88', borderWidth: 1.5, backgroundColor: '#44ff8818',
          fill: true, tension: 0.4, pointRadius: 0
        },
        {
          label: '↓ Turun', data: lls,
          borderColor: '#ff4444', borderWidth: 1.5, backgroundColor: '#ff444418',
          fill: true, tension: 0.4, pointRadius: 0
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { labels: { font: { family: 'Space Mono', size: 8 }, color: '#b2d3bb', boxWidth: 10 } }
      },
      scales: {
        x: { grid: { color: '#1a2820' }, ticks: { maxTicksLimit: 5, font: { family: 'Space Mono', size: 8 } } },
        y: { grid: { color: '#1a2820' }, ticks: { font: { family: 'Space Mono', size: 8 } } }
      }
    }
  });
}
