// =====================================================
// PETA INTERAKTIF MIDER DKP3
// Mendukung Level Wilayah: Kecamatan dan Kelurahan
// Syarat file:
// 1. cirebon_kecamatan.geojson
// 2. cirebon_kelurahan.geojson
// 3. app.js membuat window.MAP_DATA sesuai level wilayah
// =====================================================

let selectedMapLayer = null;
let geoJsonLayer = null;

// Membuat peta Kota Cirebon
window.map = L.map('map').setView([-6.7320, 108.5523], 12);

// Layer peta dasar OpenStreetMap
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '&copy; OpenStreetMap'
}).addTo(window.map);

// Warna dasar kecamatan/wilayah
function getKecamatanColor(nama){
  const colors = {
    'Harjamukti': '#2563eb',
    'Kesambi': '#16a34a',
    'Lemahwungkuk': '#7c3aed',
    'Pekalipan': '#f97316',
    'Kejaksan': '#dc2626'
  };

  return colors[nama] || '#64748b';
}

function getActiveGeojsonFile(){
  return activeMapLevel === 'kelurahan'
    ? 'cirebon_kelurahan.geojson'
    : 'cirebon_kecamatan.geojson';
}

function getWilayahName(feature){
  const props = feature.properties || {};

  if(activeMapLevel === 'kelurahan'){
    return String(
      props.village ||
      props.kelurahan ||
      props.KELURAHAN ||
      props.nama ||
      props.NAMA ||
      props.NAMOBJ ||
      props.name ||
      props.NAME ||
      ''
    ).trim();
  }

  return String(
    props.district ||
    props.kecamatan ||
    props.KECAMATAN ||
    props.WADMKC ||
    props.nama ||
    props.NAMA ||
    props.NAMOBJ ||
    props.name ||
    props.NAME ||
    ''
  ).trim();
}

function getFeatureKecamatan(feature){
  const props = feature.properties || {};

  return String(
    props.district ||
    props.kecamatan ||
    props.KECAMATAN ||
    props.WADMKC ||
    ''
  ).trim();
}

function getRowColor(row, fallback){
  return row?.warna || row?.warna_peta || row?.color || fallback || '#2563eb';
}

function getMatchingRows(namaWilayah){
  const rowsSource = window.MAP_DATA || MAP_DATA || [];

  const tahun = document.getElementById('mapYearFilter')?.value || 'all';
  const kategori = document.getElementById('mapKategoriFilter')?.value || 'all';
  const indikator = document.getElementById('mapIndikatorFilter')?.value || 'all';

  let rows = rowsSource.filter(d =>
    (tahun === 'all' || String(d.tahun) === String(tahun)) &&
    (kategori === 'all' || String(d.kategori || '') === String(kategori)) &&
    (indikator === 'all' || String(d.indikator || '') === String(indikator))
  );

  if(activeMapLevel === 'kelurahan'){
    rows = rows.filter(d => {
      const kelurahanMatch = String(d.kelurahan || '').toLowerCase() === String(namaWilayah || '').toLowerCase();
      const kecamatanMatch = activeMapKecamatan === 'all' || String(d.kecamatan || '') === String(activeMapKecamatan);
      const activeKelurahanMatch = activeMapKelurahan === 'all' || String(d.kelurahan || '') === String(activeMapKelurahan);
      return kelurahanMatch && kecamatanMatch && activeKelurahanMatch;
    });
  }else{
    rows = rows.filter(d =>
      String(d.kecamatan || '').toLowerCase() === String(namaWilayah || '').toLowerCase()
    );
  }

  return rows;
}

function getWilayahSummary(namaWilayah){
  const rows = getMatchingRows(namaWilayah);

  if(!rows.length){
    return '<br><small>Tidak ada data sesuai filter peta.</small>';
  }

  return rows.map(d => `
    <br><small>
      ${activeMapLevel === 'kelurahan' ? `Kecamatan: <b>${d.kecamatan || '-'}</b><br>` : ''}
      Indikator: <b>${d.indikator || '-'}</b><br>
      Nilai: <b>${d.nilai ?? '-'}</b><br>
      Satuan: ${d.satuan || '-'}
    </small>
  `).join('<hr>');
}

function defaultStyle(feature){
  const nama = getWilayahName(feature);
  const kecamatan = getFeatureKecamatan(feature) || nama;
  const matched = getMatchingRows(nama)[0];
  const fill = getRowColor(matched, getKecamatanColor(kecamatan));

  return {
    color: fill,
    weight: 2,
    fillColor: fill,
    fillOpacity: activeMapLevel === 'kelurahan' ? 0.38 : 0.25
  };
}

function hoverStyle(feature){
  const base = defaultStyle(feature);

  return {
    color: base.color,
    weight: 3,
    fillColor: base.fillColor,
    fillOpacity: 0.55
  };
}

function selectedStyle(feature){
  const base = defaultStyle(feature);

  return {
    color: base.color,
    weight: 4,
    fillColor: base.fillColor,
    fillOpacity: 0.70
  };
}

function getFilteredRowsForMapControls(){
  let rows = window.MAP_DATA || MAP_DATA || [];

  if(activeMapLevel === 'kelurahan'){
    if(activeMapKecamatan !== 'all'){
      rows = rows.filter(d => String(d.kecamatan || '') === String(activeMapKecamatan));
    }

    if(activeMapKelurahan !== 'all'){
      rows = rows.filter(d => String(d.kelurahan || '') === String(activeMapKelurahan));
    }
  }

  return rows;
}

// Mengisi dropdown filter peta dari data aktif
function populateMapFilters(){
  const y = document.getElementById('mapYearFilter');
  const k = document.getElementById('mapKategoriFilter');
  const i = document.getElementById('mapIndikatorFilter');

  if(!y || !k || !i) return;

  const rows = getFilteredRowsForMapControls();

  const currentYear = y.value || 'all';
  const currentKategori = activeMapKategori || k.value || 'all';
  const currentIndikator = activeMapIndikator || i.value || 'all';

  y.innerHTML = '<option value="all">Semua Tahun</option>' +
    [...new Set(rows.map(d => d.tahun).filter(Boolean))]
      .sort((a,b) => Number(a) - Number(b))
      .map(x => `<option value="${x}">${x}</option>`)
      .join('');

  y.value = [...y.options].some(opt => opt.value === currentYear) ? currentYear : 'all';

  k.innerHTML = '<option value="all">Semua Kategori</option>' +
    [...new Set(rows.map(d => d.kategori).filter(Boolean))]
      .sort()
      .map(x => `<option value="${x}">${x}</option>`)
      .join('');

  k.value = [...k.options].some(opt => opt.value === currentKategori) ? currentKategori : 'all';
  activeMapKategori = k.value;

  updateMapIndikatorFilter();

  i.value = [...i.options].some(opt => opt.value === currentIndikator) ? currentIndikator : 'all';
  activeMapIndikator = i.value;

  y.onchange = function(){
    refreshMapPopup();
    if(geoJsonLayer) geoJsonLayer.setStyle(defaultStyle);
  };

  k.onchange = function(){
    activeMapKategori = this.value;
    activeMapIndikator = 'all';

    updateMapIndikatorFilter();

    if(i) i.value = 'all';

    if(typeof populateSidebarMenu === 'function'){
      populateSidebarMenu('map');
    }

    refreshMapPopup();
    if(geoJsonLayer) geoJsonLayer.setStyle(defaultStyle);
  };

  i.onchange = function(){
    activeMapIndikator = this.value;

    if(typeof populateSidebarMenu === 'function'){
      populateSidebarMenu('map');
    }

    refreshMapPopup();
    if(geoJsonLayer) geoJsonLayer.setStyle(defaultStyle);
  };
}

// Mengisi indikator peta berdasarkan kategori yang dipilih
function updateMapIndikatorFilter(){
  const k = document.getElementById('mapKategoriFilter');
  const i = document.getElementById('mapIndikatorFilter');

  if(!k || !i) return;

  const rows = getFilteredRowsForMapControls();
  const selectedKategori = k.value || 'all';

  const filtered = rows.filter(d =>
    selectedKategori === 'all' ||
    String(d.kategori || '') === String(selectedKategori)
  );

  i.innerHTML = '<option value="all">Semua Indikator</option>' +
    [...new Set(filtered.map(d => d.indikator).filter(Boolean))]
      .sort()
      .map(x => `<option value="${x}">${x}</option>`)
      .join('');
}

function resetMapDataFilter(){
  const y = document.getElementById('mapYearFilter');
  const k = document.getElementById('mapKategoriFilter');
  const i = document.getElementById('mapIndikatorFilter');
  const kecamatan = document.getElementById('mapKecamatanFilter');
  const kelurahan = document.getElementById('mapKelurahanFilter');

  if(y) y.value = 'all';
  if(k) k.value = 'all';
  if(i) i.value = 'all';
  if(kecamatan) kecamatan.value = 'all';
  if(kelurahan) kelurahan.value = 'all';

  activeMapKecamatan = 'all';
  activeMapKelurahan = 'all';
  activeMapKategori = 'all';
  activeMapIndikator = 'all';

  if(typeof populateMapWilayahFilters === 'function'){
    populateMapWilayahFilters();
  }

  populateMapFilters();

  if(typeof populateSidebarMenu === 'function'){
    populateSidebarMenu('map');
  }

  if(geoJsonLayer){
    geoJsonLayer.setStyle(defaultStyle);
  }

  refreshMapPopup();
}

function refreshMapPopup(){
  if(!selectedMapLayer) return;

  selectedMapLayer.closePopup();

  const nama = getWilayahName(selectedMapLayer.feature);
  const label = activeMapLevel === 'kelurahan' ? 'Kelurahan' : 'Kecamatan';

  selectedMapLayer.setPopupContent(`
    <b>${label}: ${nama}</b>
    ${getWilayahSummary(nama)}
  `);

  selectedMapLayer.openPopup();
}

function waitForMapDataAndPopulateFilter(){
  let attempts = 0;

  const timer = setInterval(function(){
    attempts++;

    if(window.MAP_DATA && window.MAP_DATA.length){
      populateMapFilters();
      clearInterval(timer);
    }

    if(attempts >= 20){
      populateMapFilters();
      clearInterval(timer);
    }
  }, 300);
}

function reloadMapGeojson(){
  if(geoJsonLayer){
    window.map.removeLayer(geoJsonLayer);
    geoJsonLayer = null;
  }

  selectedMapLayer = null;

  fetch(getActiveGeojsonFile())
    .then(response => response.json())
    .then(geojsonData => {
      geoJsonLayer = L.geoJSON(geojsonData, {
        style: defaultStyle,

        onEachFeature: function(feature, layer){
          const nama = getWilayahName(feature);
          const label = activeMapLevel === 'kelurahan' ? 'Kelurahan' : 'Kecamatan';

          layer.bindPopup(`
            <b>${label}: ${nama}</b>
            ${getWilayahSummary(nama)}
          `);

          layer.on('mouseover', function(){
            if(selectedMapLayer !== layer){
              layer.setStyle(hoverStyle(feature));
            }
          });

          layer.on('mouseout', function(){
            if(selectedMapLayer !== layer && geoJsonLayer){
              geoJsonLayer.resetStyle(layer);
            }
          });

          layer.on('click', function(){
            if(selectedMapLayer && geoJsonLayer){
              geoJsonLayer.resetStyle(selectedMapLayer);
            }

            selectedMapLayer = layer;
            layer.setStyle(selectedStyle(feature));

            if(layer.getBounds){
              window.map.fitBounds(layer.getBounds(), {
                padding: [20, 20],
                maxZoom: activeMapLevel === 'kelurahan' ? 15 : 14
              });
            }

            refreshMapPopup();
          });
        }
      }).addTo(window.map);

      window.map.fitBounds(geoJsonLayer.getBounds(), {
        padding: [20, 20]
      });

      waitForMapDataAndPopulateFilter();
    })
    .catch(error => {
      console.error('Gagal memuat file GeoJSON:', error);

      const info = L.control({position:'topright'});

      info.onAdd = function(){
        const div = L.DomUtil.create('div', 'map-error-box');
        div.innerHTML = `
          <div style="background:white;padding:10px 12px;border-radius:10px;box-shadow:0 4px 14px rgba(0,0,0,.18);font-size:13px;color:#991b1b;font-weight:700;">
            File GeoJSON belum ditemukan.<br>
            Pastikan ada file:<br>
            ${getActiveGeojsonFile()}
          </div>
        `;
        return div;
      };

      info.addTo(window.map);
    });
}

// Jalankan peta pertama kali
reloadMapGeojson();
