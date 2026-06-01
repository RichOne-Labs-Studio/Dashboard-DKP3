// =====================================================
// PETA INTERAKTIF KECAMATAN DKP3
// File: map.js
// Syarat:
// 1. Harus ada file cirebon_kecamatan.geojson
// 2. app.js harus membuat window.MAP_DATA dari Sheet data_peta
// =====================================================

let selectedMapLayer = null;

// Membuat peta Kota Cirebon
window.map = L.map('map').setView([-6.7320, 108.5523], 12);

// Layer peta dasar OpenStreetMap
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '&copy; OpenStreetMap'
}).addTo(window.map);

// Warna khusus untuk membedakan kecamatan
function getKecamatanColor(kecamatan){
  const colors = {
    'Harjamukti': '#2563eb',
    'Kesambi': '#16a34a',
    'Lemahwungkuk': '#7c3aed',
    'Pekalipan': '#f97316',
    'Kejaksan': '#dc2626'
  };

  return colors[kecamatan] || '#64748b';
}

function getKecamatanName(feature){
  const props = feature.properties || {};

  return (
    props.nama ||
    props.NAMA ||
    props.kecamatan ||
    props.KECAMATAN ||
    props.district ||
    props.DISTRICT ||
    props.name ||
    props.NAME ||
    props.NAMOBJ ||
    props.WADMKC ||
    ''
  ).toString().trim();
}

function defaultStyle(feature){
  const kecamatan = getKecamatanName(feature);

  return {
    color: getKecamatanColor(kecamatan),
    weight: 2,
    fillColor: getKecamatanColor(kecamatan),
    fillOpacity: 0.25
  };
}

function hoverStyle(feature){
  const kecamatan = getKecamatanName(feature);

  return {
    color: getKecamatanColor(kecamatan),
    weight: 3,
    fillColor: getKecamatanColor(kecamatan),
    fillOpacity: 0.45
  };
}

function selectedStyle(feature){
  const kecamatan = getKecamatanName(feature);

  return {
    color: getKecamatanColor(kecamatan),
    weight: 4,
    fillColor: getKecamatanColor(kecamatan),
    fillOpacity: 0.65
  };
}

// Mengisi dropdown filter peta dari Sheet data_peta
function populateMapFilters(){

  const y = document.getElementById('mapYearFilter');
  const k = document.getElementById('mapKategoriFilter');
  const i = document.getElementById('mapIndikatorFilter');

  if(!y || !k || !i) return;

  const rows = window.MAP_DATA || MAP_DATA || [];

  y.innerHTML = '<option value="all">Semua Tahun</option>' +
[...new Set(rows.map(d=>d.tahun))].sort().map(x=>`<option>${x}</option>`).join('');

  k.innerHTML = '<option value="all">Semua Kategori</option>' +
[...new Set(rows.map(d=>d.kategori))].sort().map(x=>`<option>${x}</option>`).join('');

  updateMapIndikatorFilter();

  y.onchange = refreshMapPopup;

  k.onchange = function(){
    updateMapIndikatorFilter();
    refreshMapPopup();
  };

  i.onchange = refreshMapPopup;
}

// Mengisi indikator peta berdasarkan kategori yang dipilih
function updateMapIndikatorFilter(){

  const k = document.getElementById('mapKategoriFilter');
  const i = document.getElementById('mapIndikatorFilter');

  const rows = window.MAP_DATA || MAP_DATA || [];

  const selectedKategori = k.value;

  const filtered = rows.filter(d =>
    selectedKategori === 'all' ||
    String(d.kategori || '') === String(selectedKategori)
  );

  i.innerHTML = '<option value="all">Semua Indikator</option>' +
  [...new Set(filtered.map(d => d.indikator).filter(Boolean))]
    .sort()
    .map(x => `<option>${x}</option>`)
    .join('');
}

// Reset filter khusus peta
function resetMapDataFilter(){

  const y = document.getElementById('mapYearFilter');
  const k = document.getElementById('mapKategoriFilter');
  const i = document.getElementById('mapIndikatorFilter');

  if(y) y.value = 'all';
  if(k) k.value = 'all';

  updateMapIndikatorFilter();

  if(i) i.value = 'all';

  refreshMapPopup();
}

// Ringkasan data dari Sheet data_peta berdasarkan kecamatan dan filter peta
function getKecamatanSummary(kecamatan){

  const rowsSource = window.MAP_DATA || MAP_DATA || [];

  const tahun = document.getElementById('mapYearFilter')?.value || 'all';
  const kategori = document.getElementById('mapKategoriFilter')?.value || 'all';
  const indikator = document.getElementById('mapIndikatorFilter')?.value || 'all';

    const rows = rowsSource.filter(d =>
    String(d.kecamatan || '').toLowerCase() === String(kecamatan || '').toLowerCase() &&
    (tahun === 'all' || String(d.tahun) === String(tahun)) &&
    (kategori === 'all' || String(d.kategori) === String(kategori)) &&
    (indikator === 'all' || String(d.indikator) === String(indikator))
  );

  if(!rows.length){
    return '<br><small>Tidak ada data sesuai filter peta.</small>';
  }

  return rows.map(d => `
  <br><small>
    Indikator: <b>${d.indikator || '-'}</b><br>
    Nilai: <b>${d.nilai ?? '-'}</b><br>
    Satuan: ${d.satuan || '-'}
  </small>
`).join('<hr>');
}

// Refresh popup jika filter peta berubah
function refreshMapPopup(){

  if(selectedMapLayer){
  selectedMapLayer.closePopup();
  
const kecamatan = getKecamatanName(selectedMapLayer.feature);

selectedMapLayer.setPopupContent(`
<b>${kecamatan}</b>
${getKecamatanSummary(kecamatan)}
`);

selectedMapLayer.openPopup();
}

}

// Jika MAP_DATA belum siap saat map.js dibaca, tunggu sebentar
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

// Memuat GeoJSON kecamatan
fetch('cirebon_kecamatan.geojson')
  .then(response => response.json())
  .then(geojsonData => {

    const geoLayer = L.geoJSON(geojsonData, {

      style: defaultStyle,

      onEachFeature: function(feature, layer){

        const kecamatan = getKecamatanName(feature);

        layer.bindPopup(`
  	<b>${kecamatan}</b>
  	${getKecamatanSummary(kecamatan)}
	`);

        layer.on('mouseover', function(){
          if(selectedMapLayer !== layer){
            layer.setStyle(hoverStyle(feature));
          }
        });

        layer.on('mouseout', function(){
          if(selectedMapLayer !== layer){
            layer.setStyle(defaultStyle(feature));
          }
        });

        layer.on('click', function(){

          if(selectedMapLayer){
            selectedMapLayer.setStyle(defaultStyle(selectedMapLayer.feature));
          }

          selectedMapLayer = layer;
          layer.setStyle(selectedStyle(feature));

          if(layer.getBounds){
            window.map.fitBounds(layer.getBounds(), {
              padding: [20, 20],
              maxZoom: 14
            });
          }

          refreshMapPopup();

        });

      }

    }).addTo(window.map);

    window.map.fitBounds(geoLayer.getBounds(), {
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
          cirebon_kecamatan.geojson
        </div>
      `;
      return div;
    };

    info.addTo(window.map);
  });
