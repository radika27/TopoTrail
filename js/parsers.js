/* =====================================================
   parsers.js
   Konversi format file GPS ke GeoJSON:
   - KML  → GeoJSON
   - GPX  → GeoJSON
   Format SHP/ZIP ditangani oleh library shpjs (eksternal)
   ===================================================== */

// ---- KML → GeoJSON ----
function kml2gj(txt) {
  const dom = new DOMParser().parseFromString(txt, 'text/xml');
  const feats = [];

  // Helper: parse string koordinat "lon,lat,elev"
  const pc = s => s.trim().split(/\s+/).map(c => {
    const p = c.split(',').map(parseFloat);
    return p.length >= 3 ? [p[0], p[1], p[2]] : [p[0], p[1]];
  });

  dom.querySelectorAll('Placemark').forEach(pm => {
    const name = pm.querySelector('name')?.textContent || '';
    const ls   = pm.querySelector('LineString coordinates');
    const pt   = pm.querySelector('Point coordinates');

    if (ls) {
      feats.push({
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: pc(ls.textContent) },
        properties: { name }
      });
    } else if (pt) {
      feats.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: pc(pt.textContent)[0] },
        properties: { name }
      });
    }
  });

  return { type: 'FeatureCollection', features: feats };
}

// ---- GPX → GeoJSON ----
function gpx2gj(txt) {
  const dom = new DOMParser().parseFromString(txt, 'text/xml');
  const feats = [];

  // Track (trk) → LineString
  dom.querySelectorAll('trk').forEach(trk => {
    const name = trk.querySelector('name')?.textContent || 'Track';
    const coords = [];
    trk.querySelectorAll('trkpt').forEach(pt => {
      coords.push([
        parseFloat(pt.getAttribute('lon')),
        parseFloat(pt.getAttribute('lat')),
        parseFloat(pt.querySelector('ele')?.textContent || 0)
      ]);
    });
    if (coords.length) {
      feats.push({
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: coords },
        properties: { name }
      });
    }
  });

  // Waypoint (wpt) → Point
  dom.querySelectorAll('wpt').forEach(wpt => {
    feats.push({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [
          parseFloat(wpt.getAttribute('lon')),
          parseFloat(wpt.getAttribute('lat')),
          parseFloat(wpt.querySelector('ele')?.textContent || 0)
        ]
      },
      properties: { name: wpt.querySelector('name')?.textContent || 'WP' }
    });
  });

  return { type: 'FeatureCollection', features: feats };
}
