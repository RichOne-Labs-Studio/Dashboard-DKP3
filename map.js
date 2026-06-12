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
let mapErrorControl = null;

// Membuat peta Kota Cirebon dengan mode aman.
// Jika elemen #map atau library Leaflet belum siap, file ini tidak membuat dashboard berhenti loading.
const mapElement = document.getElementById('map');
function isLeafletReady(){
  return typeof L !== 'undefined';
}

function isValidLeafletMap(obj){
  return obj &&
    typeof obj.invalidateSize === 'function' &&
    typeof obj.addLayer === 'function' &&
    typeof obj.removeLayer === 'function';
}

function getMiderMap(){
  return isValidLeafletMap(window.map) ? window.map : null;
}

function initMiderMap(){
  const el = document.getElementById('map');

  if(!el || !isLeafletReady()){
    console.warn('Peta belum siap: elemen #map atau library Leaflet tidak ditemukan.');
    return false;
  }

  // Catatan penting:
  // Karena elemen peta punya id="map", browser bisa otomatis membuat window.map
  // sebagai HTMLDivElement. Itu BUKAN objek Leaflet Map. Jika tidak dicek, muncul error:
  // window.map.invalidateSize is not a function / t.addLayer is not a function.
  if(!isValidLeafletMap(window.map)){
    window.map = L.map(el).setView([-6.7320, 108.5523], 12);

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap'
    }).addTo(getMiderMap());
  }

  return true;
}

function refreshMiderMapSize(){
  const leafletMap = getMiderMap();
  if(!leafletMap) return;

  // Leaflet sering kosong jika dibuat saat tab/layer masih display:none.
  // Beberapa delay dipakai agar ukuran container sudah stabil setelah layer dibuka.
  [80, 250, 600].forEach(delay => {
    setTimeout(function(){
      const mapObj = getMiderMap();
      if(mapObj){
        mapObj.invalidateSize();

        if(geoJsonLayer && geoJsonLayer.getBounds && geoJsonLayer.getBounds().isValid()){
          mapObj.fitBounds(geoJsonLayer.getBounds(), { padding: [20, 20] });
        }
      }
    }, delay);
  });
}

window.initMiderMap = initMiderMap;
window.refreshMiderMapSize = refreshMiderMapSize;

initMiderMap();

// Warna dasar kecamatan/wilayah
function getKecamatanColor(nama){
  const colors = {
    'harjamukti': '#2563eb',
    'kesambi': '#16a34a',
    'lemahwungkuk': '#7c3aed',
    'pekalipan': '#f97316',
    'kejaksan': '#dc2626'
  };

  return colors[normalizeText(nama)] || '#64748b';
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

  // Ambil nama kecamatan dari berbagai kemungkinan nama field GeoJSON.
  // Jika GeoJSON kelurahan tidak punya field kecamatan, coba infer dari MAP_DATA
  // berdasarkan nama kelurahan di spreadsheet.
  const directName = String(
    props.district ||
    props.kecamatan ||
    props.KECAMATAN ||
    props.WADMKC ||
    props.NAMKEC ||
    props.NAMOBJ_KEC ||
    props.nama_kec ||
    props.nama_kecamatan ||
    props.NAMA_KEC ||
    props.NAMA_KECAMATAN ||
    ''
  ).trim();

  if(directName){
    return directName;
  }

  if(activeMapLevel === 'kelurahan'){
    const namaKelurahan = getWilayahName(feature);
    const rowsSource = window.MAP_DATA || MAP_DATA || [];
    const matched = rowsSource.find(d =>
      normalizeText(d.kelurahan) === normalizeText(namaKelurahan) &&
      d.kecamatan
    );

    return String(matched?.kecamatan || '').trim();
  }

  return '';
}

function isValidMapColor(value){
  const color = String(value || '').trim();
  if(!color) return false;
  if(color.toLowerCase() === 'default') return false;

  return (
    /^#[0-9a-f]{3}([0-9a-f]{3})?$/i.test(color) ||
    /^rgba?\(/i.test(color) ||
    /^hsla?\(/i.test(color) ||
    /^[a-z]+$/i.test(color)
  );
}

function getRowColor(row, fallback){
  const rawColor = row?.warna || row?.warna_peta || row?.color;
  return isValidMapColor(rawColor) ? String(rawColor).trim() : (fallback || '#2563eb');
}


function shouldUseSpreadsheetMapColor(){
  // Warna khusus dari spreadsheet hanya dipakai saat user memilih
  // kategori/indikator tematik yang memang punya pewarnaan sendiri.
  // Untuk tampilan kelurahan default atau filter kecamatan/kelurahan saja,
  // warna kelurahan tetap mengikuti warna kecamatan induknya.
  const kategori = document.getElementById('mapKategoriFilter')?.value || activeMapKategori || 'all';
  const indikator = document.getElementById('mapIndikatorFilter')?.value || activeMapIndikator || 'all';

  const kategoriText = normalizeText(kategori);
  const indikatorText = normalizeText(indikator);

  if(kategoriText === 'all' && indikatorText === 'all'){
    return false;
  }

  return (
    kategoriText.includes('kerawanan pangan') ||
    indikatorText.includes('kerawanan pangan') ||
    indikatorText.includes('kerentanan pangan') ||
    indikatorText.includes('ketahanan dan kerentanan pangan')
  );
}

function normalizeText(value){
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[._-]+/g, ' ');
}

function getBestStyleRow(namaWilayah){
  const rows = getMatchingRows(namaWilayah);
  if(!rows.length) return null;

  // Prioritaskan baris yang punya warna valid dari spreadsheet, bukan nilai "default".
  // Ini penting saat satu kelurahan punya banyak indikator, misalnya Pelaku Usaha
  // berwarna default dan Kerawanan Pangan berwarna heatmap.
  const selectedYear = document.getElementById('mapYearFilter')?.value || 'all';

  const byYear = rows.filter(d =>
    selectedYear === 'all' || String(d.tahun) === String(selectedYear)
  );

  const candidates = byYear.length ? byYear : rows;

  const withValidColor = candidates.filter(d =>
    isValidMapColor(d?.warna || d?.warna_peta || d?.color)
  );

  const sorted = [...(withValidColor.length ? withValidColor : candidates)]
    .sort((a,b) => Number(b.tahun || 0) - Number(a.tahun || 0));

  return sorted[0] || null;
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
      const kelurahanMatch = normalizeText(d.kelurahan) === normalizeText(namaWilayah);
      const kecamatanMatch = activeMapKecamatan === 'all' || normalizeText(d.kecamatan) === normalizeText(activeMapKecamatan);
      const activeKelurahanMatch = activeMapKelurahan === 'all' || normalizeText(d.kelurahan) === normalizeText(activeMapKelurahan);
      return kelurahanMatch && kecamatanMatch && activeKelurahanMatch;
    });
  }else{
    rows = rows.filter(d =>
      normalizeText(d.kecamatan) === normalizeText(namaWilayah)
    );
  }

  return rows;
}

function escapePopupHtml(value){
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatPopupValue(value, satuan){
  const hasValue = value !== null && value !== undefined && value !== '';
  const numberValue = Number(value);

  const formattedValue = hasValue && Number.isFinite(numberValue)
    ? numberValue.toLocaleString('id-ID', {maximumFractionDigits: 2})
    : (hasValue ? escapePopupHtml(value) : '-');

  const cleanSatuan = String(satuan || '').trim();

  if(!cleanSatuan){
    return formattedValue;
  }

  if(cleanSatuan === '%'){
    return `${formattedValue}%`;
  }

  return `${formattedValue} ${escapePopupHtml(cleanSatuan)}`;
}

function makePopupDetailId(namaWilayah){
  return 'mider_popup_detail_' + String(namaWilayah || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_') + '_' + Math.random().toString(36).slice(2, 8);
}

function getPopupYear(rows){
  const selectedYear = document.getElementById('mapYearFilter')?.value || 'all';

  if(selectedYear !== 'all'){
    return selectedYear;
  }

  const numericYears = rows
    .map(d => Number(d.tahun))
    .filter(y => Number.isFinite(y));

  if(numericYears.length){
    return Math.max(...numericYears);
  }

  return rows[0]?.tahun || '-';
}

function ensureMiderPopupStyles(){
  if(document.getElementById('mider-popup-inline-style')) return;

  const style = document.createElement('style');
  style.id = 'mider-popup-inline-style';
  style.textContent = `
    .mider-map-popup{
      min-width:190px;
      max-width:270px;
      line-height:1.45;
      color:var(--text,#0f172a);
      font-family:Inter, "Segoe UI", Arial, sans-serif;
    }
    .mider-popup-title{
      font-weight:800;
      font-size:14px;
      margin-bottom:8px;
    }
    .mider-popup-year{
      font-size:13px;
      color:var(--muted,#475569);
      margin-bottom:8px;
      font-weight:700;
    }
    .mider-popup-list,
    .mider-popup-detail{
      display:flex;
      flex-direction:column;
      gap:4px;
    }
    .mider-popup-detail{
      margin-top:4px;
    }
    .mider-popup-item{
      font-size:13px;
      color:var(--text,#0f172a);
    }
    .mider-popup-label{
      font-weight:500;
    }
    .mider-popup-separator{
      color:var(--muted,#64748b);
      margin:0 3px;
    }
    .mider-popup-item b{
      font-weight:800;
    }
    .mider-popup-toggle{
      margin-top:10px;
      padding-top:6px;
      border-top:1px solid rgba(148,163,184,.25);
      color:var(--muted,#64748b);
      font-size:12px;
      font-weight:600;
      cursor:pointer;
      user-select:none;
    }
    .mider-popup-toggle:hover{
      color:var(--text,#334155);
      text-decoration:underline;
    }
    .mider-popup-empty{
      font-size:12px;
      color:var(--muted,#64748b);
    }
  `;
  document.head.appendChild(style);
}

function getWilayahSummary(namaWilayah){
  ensureMiderPopupStyles();

  const allRows = getMatchingRows(namaWilayah);

  if(!allRows.length){
    return `
      <div class="mider-popup-body">
        <div class="mider-popup-year">Tahun -</div>
        <div class="mider-popup-empty">Tidak ada data sesuai filter peta.</div>
      </div>
    `;
  }

  const tahun = getPopupYear(allRows);
  const rows = allRows.filter(d => String(d.tahun || '') === String(tahun));
  const displayRows = rows.length ? rows : allRows;

  const visibleRows = displayRows.slice(0, 2);
  const hiddenRows = displayRows.slice(2);
  const detailId = makePopupDetailId(namaWilayah);

  const renderItem = (d) => `
    <div class="mider-popup-item">
      <span class="mider-popup-label">${escapePopupHtml(d.indikator || '-')}</span>
      <span class="mider-popup-separator">:</span>
      <b>${formatPopupValue(d.nilai, d.satuan)}</b>
    </div>
  `;

  return `
    <div class="mider-popup-body">
      <div class="mider-popup-year">Tahun ${escapePopupHtml(tahun)}</div>
      <div class="mider-popup-list">
        ${visibleRows.map(renderItem).join('')}
      </div>
      ${hiddenRows.length ? `
        <div id="${detailId}" class="mider-popup-detail" style="display:none;">
          ${hiddenRows.map(renderItem).join('')}
        </div>
        <div
          role="button"
          tabindex="0"
          class="mider-popup-toggle"
          onclick="toggleMiderPopupDetail('${detailId}', this, ${hiddenRows.length})"
          onkeydown="if(event.key === 'Enter' || event.key === ' '){ event.preventDefault(); toggleMiderPopupDetail('${detailId}', this, ${hiddenRows.length}); }">
          ▼ Tampilkan ${hiddenRows.length} indikator lainnya
        </div>
      ` : ''}
    </div>
  `;
}

function getPopupContent(namaWilayah){
  return `
    <div class="mider-map-popup">
      <div class="mider-popup-title">📍 ${escapePopupHtml(namaWilayah)}</div>
      ${getWilayahSummary(namaWilayah)}
    </div>
  `;
}

window.toggleMiderPopupDetail = function(detailId, button, count){
  const detail = document.getElementById(detailId);

  if(!detail) return;

  const isHidden = detail.style.display === 'none';
  detail.style.display = isHidden ? 'block' : 'none';

  button.innerHTML = isHidden
    ? '▲ Sembunyikan detail'
    : `▼ Tampilkan ${count} indikator lainnya`;
};

function defaultStyle(feature){
  const nama = getWilayahName(feature);
  const kecamatan = getFeatureKecamatan(feature) || nama;
  const fallbackColor = getKecamatanColor(kecamatan);

  // Pada layer kelurahan, warna spreadsheet hanya dipakai saat filter tematik
  // Kerawanan Pangan aktif. Jika filter masih umum atau warna = default/kosong,
  // polygon kelurahan mengikuti warna kecamatan induknya.
  const matched = shouldUseSpreadsheetMapColor() ? getBestStyleRow(nama) : null;
  const fill = getRowColor(matched, fallbackColor);

  // Layer Kelurahan: jika filter Kecamatan/Kelurahan aktif,
  // wilayah di luar pilihan dibuat redup agar wilayah terpilih lebih menonjol.
  if(activeMapLevel === 'kelurahan'){
    const featureKecamatan = normalizeText(getFeatureKecamatan(feature));
    const namaKelurahan = normalizeText(nama);

    const kecamatanAktif = normalizeText(activeMapKecamatan || 'all');
    const kelurahanAktif = normalizeText(activeMapKelurahan || 'all');

    const isKecamatanFiltered = kecamatanAktif !== 'all';
    const isKelurahanFiltered = kelurahanAktif !== 'all';

    const matchKecamatan =
      !isKecamatanFiltered ||
      featureKecamatan === kecamatanAktif;

    const matchKelurahan =
      !isKelurahanFiltered ||
      namaKelurahan === kelurahanAktif;

    const isActiveArea = matchKecamatan && matchKelurahan;

    if(!isActiveArea){
      return {
        color: '#94a3b8',
        weight: 1,
        fillColor: '#94a3b8',
        fillOpacity: 0.04,
        opacity: 0.20
      };
    }

    const isKerawananKelurahan =
      activeMapLevel === 'kelurahan' &&
      shouldUseSpreadsheetMapColor();

    return {
      // Khusus Kerawanan Pangan level Kelurahan:
      // garis batas dibuat putih dan lebih tebal agar batas antar kelurahan jelas.
      color: isKerawananKelurahan ? '#FFFFFF' : fill,
      weight: isKerawananKelurahan
        ? (isKelurahanFiltered ? 5 : 3)
        : (isKelurahanFiltered ? 4 : 2.5),
      fillColor: fill,
      fillOpacity: isKecamatanFiltered || isKelurahanFiltered ? 0.72 : 0.38,
      opacity: 1
    };
  }

  return {
    color: fill,
    weight: 2,
    fillColor: fill,
    fillOpacity: 0.25,
    opacity: 1
  };
}

function hoverStyle(feature){
  const base = defaultStyle(feature);

  const isKerawananKelurahan =
    activeMapLevel === 'kelurahan' &&
    shouldUseSpreadsheetMapColor();

  return {
    // Hover khusus Kerawanan Pangan Kelurahan dibuat kuning agar terlihat jelas.
    color: isKerawananKelurahan ? '#FACC15' : base.color,
    weight: isKerawananKelurahan ? 5 : 3,
    fillColor: base.fillColor,
    fillOpacity: isKerawananKelurahan ? 0.60 : 0.55
  };
}

function selectedStyle(feature){
  const base = defaultStyle(feature);

  const isKerawananKelurahan =
    activeMapLevel === 'kelurahan' &&
    shouldUseSpreadsheetMapColor();

  return {
    // Kelurahan yang dipilih diberi outline gelap tebal.
    color: isKerawananKelurahan ? '#111827' : base.color,
    weight: isKerawananKelurahan ? 6 : 4,
    fillColor: base.fillColor,
    fillOpacity: isKerawananKelurahan ? 0.75 : 0.70
  };
}

function getFilteredRowsForMapControls(){
  let rows = window.MAP_DATA || MAP_DATA || [];

  if(activeMapLevel === 'kelurahan'){
    if(activeMapKecamatan !== 'all'){
      rows = rows.filter(d => normalizeText(d.kecamatan) === normalizeText(activeMapKecamatan));
    }

    if(activeMapKelurahan !== 'all'){
      rows = rows.filter(d => normalizeText(d.kelurahan) === normalizeText(activeMapKelurahan));
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
    if(typeof forceRefreshMapStyles === 'function') forceRefreshMapStyles();
    renderDynamicMapLegend();
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
    if(typeof forceRefreshMapStyles === 'function') forceRefreshMapStyles();
    renderDynamicMapLegend();
  };

  i.onchange = function(){
    activeMapIndikator = this.value;

    if(typeof populateSidebarMenu === 'function'){
      populateSidebarMenu('map');
    }

    refreshMapPopup();
    if(typeof forceRefreshMapStyles === 'function') forceRefreshMapStyles();
    renderDynamicMapLegend();
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

function updateMapVisualHighlight(){
  if(geoJsonLayer){
    geoJsonLayer.setStyle(defaultStyle);
  }

  if(selectedMapLayer && geoJsonLayer){
    const nama = getWilayahName(selectedMapLayer.feature);
    const rows = getMatchingRows(nama);

    // Jika wilayah yang sebelumnya dipilih sudah tidak sesuai filter,
    // hilangkan pilihan agar tampilan peta mengikuti filter baru.
    if(!rows.length){
      geoJsonLayer.resetStyle(selectedMapLayer);
      if(selectedMapLayer.closePopup) selectedMapLayer.closePopup();
      selectedMapLayer = null;
      return;
    }

    selectedMapLayer.setStyle(selectedStyle(selectedMapLayer.feature));
    refreshMapPopup();
  }
}

function forceRefreshMapStyles(){
  if(!geoJsonLayer) return;

  // Paksa Leaflet menghitung ulang warna polygon setelah filter wilayah/kategori/indikator berubah.
  // Ini mencegah warna kelurahan tertahan pada warna sebelumnya.
  geoJsonLayer.eachLayer(function(layer){
    if(layer && layer.feature && typeof layer.setStyle === 'function'){
      layer.setStyle(defaultStyle(layer.feature));
    }
  });

  if(selectedMapLayer && selectedMapLayer.feature){
    const nama = getWilayahName(selectedMapLayer.feature);
    const rows = getMatchingRows(nama);

    if(rows.length){
      selectedMapLayer.setStyle(selectedStyle(selectedMapLayer.feature));
      selectedMapLayer.setPopupContent(getPopupContent(nama));
    }else{
      if(selectedMapLayer.closePopup) selectedMapLayer.closePopup();
      selectedMapLayer = null;
    }
  }
}

window.forceRefreshMapStyles = forceRefreshMapStyles;

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
  scheduleDynamicMapLegendRender(4);
}

function refreshMapPopup(){
  if(!selectedMapLayer) return;

  if(selectedMapLayer.closePopup) selectedMapLayer.closePopup();

  const nama = getWilayahName(selectedMapLayer.feature);
  const label = activeMapLevel === 'kelurahan' ? 'Kelurahan' : 'Kecamatan';

  selectedMapLayer.setPopupContent(getPopupContent(nama));

  if(selectedMapLayer.openPopup) selectedMapLayer.openPopup();
}

function waitForMapDataAndPopulateFilter(){
  let attempts = 0;

  const timer = setInterval(function(){
    attempts++;

    if(window.MAP_DATA && window.MAP_DATA.length){
      populateMapFilters();
      scheduleDynamicMapLegendRender(5);
      clearInterval(timer);
    }

    if(attempts >= 20){
      populateMapFilters();
      scheduleDynamicMapLegendRender(5);
      clearInterval(timer);
    }
  }, 300);
}

function reloadMapGeojson(){
  if(!initMiderMap()){
    console.warn('Peta belum bisa dimuat karena Leaflet atau elemen peta belum siap.');
    return;
  }

  if(geoJsonLayer){
    window.map.removeLayer(geoJsonLayer);
    geoJsonLayer = null;
    window.geoJsonLayer = null;
  }

  selectedMapLayer = null;

  fetch(getActiveGeojsonFile())
    .then(response => {
      if(!response.ok){
        throw new Error('File GeoJSON tidak ditemukan: ' + getActiveGeojsonFile() + ' (HTTP ' + response.status + ')');
      }
      return response.json();
    })
    .then(geojsonData => {
      geoJsonLayer = L.geoJSON(geojsonData, {
        style: defaultStyle,

        onEachFeature: function(feature, layer){
          const nama = getWilayahName(feature);
          const label = activeMapLevel === 'kelurahan' ? 'Kelurahan' : 'Kecamatan';

          layer.bindPopup(getPopupContent(nama));

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
              getMiderMap().fitBounds(layer.getBounds(), {
                padding: [20, 20],
                maxZoom: activeMapLevel === 'kelurahan' ? 15 : 14
              });
            }

            refreshMapPopup();
          });
        }
      }).addTo(getMiderMap());

      window.geoJsonLayer = geoJsonLayer;

      getMiderMap().fitBounds(geoJsonLayer.getBounds(), {
        padding: [20, 20]
      });

      refreshMiderMapSize();
      waitForMapDataAndPopulateFilter();
      scheduleDynamicMapLegendRender(8);
    })
    .catch(error => {
      console.error('Gagal memuat file GeoJSON:', error);

      if(mapErrorControl){
        getMiderMap().removeControl(mapErrorControl);
        mapErrorControl = null;
      }

      const info = L.control({position:'topright'});
      mapErrorControl = info;

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

      info.addTo(getMiderMap());
    });
}



// =====================================================
// MIDER 2.0 - LEGENDA DINAMIS KERAWANAN PANGAN
// Versi stabil: tidak bergantung klik tema, aman terhadap timing API,
// dan memakai Leaflet Control agar posisi legenda konsisten di peta.
// =====================================================
let dynamicMapLegendControl = null;
let dynamicMapLegendControlEl = null;
let dynamicMapLegendRenderTimer = null;
let dynamicMapLegendWatchCounter = 0;

function getCurrentMapLevelForLegend(){
  return document.getElementById('mapLevelFilter')?.value || activeMapLevel || 'kecamatan';
}

function getCurrentMapKategoriForLegend(){
  return document.getElementById('mapKategoriFilter')?.value || activeMapKategori || 'all';
}

function getCurrentMapIndikatorForLegend(){
  return document.getElementById('mapIndikatorFilter')?.value || activeMapIndikator || 'all';
}

function isKerawananPanganActive(){
  const level = normalizeText(getCurrentMapLevelForLegend());
  const kategori = getCurrentMapKategoriForLegend();
  const indikator = getCurrentMapIndikatorForLegend();
  const text = normalizeText(kategori + ' ' + indikator);

  return level === 'kelurahan' && (
    text.includes('kerawanan') ||
    text.includes('kerentanan') ||
    text.includes('ketahanan dan kerentanan pangan')
  );
}

function getDynamicLegendRows(){
  let rows = Array.isArray(window.LEGENDA_DATA) ? window.LEGENDA_DATA : [];

  rows = rows
    .filter(row => {
      const kategori = normalizeText(row?.kategori || '');
      return !kategori || kategori.includes('kerawanan') || kategori.includes('kerentanan');
    })
    .sort((a,b) => Number(a.urutan || 0) - Number(b.urutan || 0));

  // Fallback agar legenda tetap tampil walaupun API legenda belum selesai dimuat
  // atau sheet data_legenda sementara kosong.
  if(!rows.length){
    rows = [
      {label:'Sangat Aman', warna:'#A7FFA7', urutan:1},
      {label:'Aman', warna:'#19FF19', urutan:2},
      {label:'Rentan', warna:'#FFD966', urutan:3},
      {label:'Rawan', warna:'#FF9900', urutan:4},
      {label:'Sangat Rawan', warna:'#FF0000', urutan:5}
    ];
  }

  return rows;
}

function ensureDynamicLegendStyles(){
  if(document.getElementById('mider-dynamic-map-legend-style')) return;

  const style = document.createElement('style');
  style.id = 'mider-dynamic-map-legend-style';
  style.textContent = `
    .mider-dynamic-map-legend{
      background:var(--panel,#ffffff);
      color:var(--text,#1e293b);
      border:1px solid var(--line,rgba(148,163,184,.35));
      border-radius:14px;
      box-shadow:0 12px 28px rgba(15,23,42,.22);
      padding:12px 13px;
      min-width:190px;
      font-family:Inter,"Segoe UI",Arial,sans-serif;
      line-height:1.35;
      pointer-events:auto;
    }
    .mider-dynamic-map-legend-title{
      font-size:13px;
      font-weight:900;
      margin-bottom:8px;
      color:var(--text,#1e293b);
    }
    .mider-dynamic-map-legend-item{
      display:flex;
      align-items:center;
      gap:8px;
      margin:5px 0;
      font-size:12.5px;
      font-weight:700;
      color:var(--text,#1e293b);
      white-space:nowrap;
    }
    .mider-dynamic-map-legend-color{
      width:18px;
      height:18px;
      border-radius:5px;
      border:1px solid rgba(15,23,42,.25);
      flex:0 0 18px;
    }
    .leaflet-bottom.leaflet-right .mider-dynamic-map-legend{
      margin:0 12px 12px 0;
    }
  `;
  document.head.appendChild(style);
}

function buildDynamicLegendHtml(rows){
  return `
    <div class="mider-dynamic-map-legend-title">Kerawanan Pangan</div>
    ${rows.map(row => `
      <div class="mider-dynamic-map-legend-item">
        <span class="mider-dynamic-map-legend-color" style="background:${escapePopupHtml(row.warna || '#64748b')}"></span>
        <span>${escapePopupHtml(row.label || '-')}</span>
      </div>
    `).join('')}
  `;
}

function removeDynamicMapLegend(){
  const mapObj = getMiderMap();

  if(dynamicMapLegendControl && mapObj){
    try{ mapObj.removeControl(dynamicMapLegendControl); }catch(error){}
  }

  dynamicMapLegendControl = null;
  dynamicMapLegendControlEl = null;

  const fallback = document.getElementById('mapLegend');
  if(fallback){
    fallback.innerHTML = '';
    fallback.style.display = 'none';
  }
}

function renderDynamicMapLegend(){
  ensureDynamicLegendStyles();

  if(!isKerawananPanganActive()){
    removeDynamicMapLegend();
    return;
  }

  const rows = getDynamicLegendRows();
  const html = buildDynamicLegendHtml(rows);
  const mapObj = getMiderMap();

  if(mapObj && typeof L !== 'undefined'){
    if(!dynamicMapLegendControl){
      dynamicMapLegendControl = L.control({position:'bottomright'});
      dynamicMapLegendControl.onAdd = function(){
        dynamicMapLegendControlEl = L.DomUtil.create('div', 'mider-dynamic-map-legend');
        if(L.DomEvent){
          L.DomEvent.disableClickPropagation(dynamicMapLegendControlEl);
          L.DomEvent.disableScrollPropagation(dynamicMapLegendControlEl);
        }
        return dynamicMapLegendControlEl;
      };
      dynamicMapLegendControl.addTo(mapObj);
    }

    if(dynamicMapLegendControlEl){
      dynamicMapLegendControlEl.innerHTML = html;
      dynamicMapLegendControlEl.style.display = 'block';
    }
  }

  // Fallback untuk layout lama yang sudah memiliki <div id="mapLegend"></div>.
  const fallback = document.getElementById('mapLegend');
  if(fallback){
    fallback.className = 'mider-dynamic-map-legend';
    fallback.innerHTML = html;
    fallback.style.display = mapObj ? 'none' : 'block';
  }
}

function scheduleDynamicMapLegendRender(retryCount){
  const retries = Number.isFinite(Number(retryCount)) ? Number(retryCount) : 6;

  if(dynamicMapLegendRenderTimer){
    clearTimeout(dynamicMapLegendRenderTimer);
  }

  dynamicMapLegendRenderTimer = setTimeout(function(){
    renderDynamicMapLegend();

    // Ulangi beberapa kali saat awal load untuk mengatasi urutan:
    // DOM siap -> GeoJSON siap -> API data/legenda selesai.
    if(retries > 0){
      setTimeout(function(){
        renderDynamicMapLegend();
        scheduleDynamicMapLegendRender(retries - 1);
      }, 350);
    }
  }, 60);
}

window.renderDynamicMapLegend = renderDynamicMapLegend;
window.scheduleDynamicMapLegendRender = scheduleDynamicMapLegendRender;

// Pantau perubahan filter apa pun, termasuk level wilayah.
document.addEventListener('change', function(event){
  const id = event.target && event.target.id;
  if([
    'mapLevelFilter',
    'mapYearFilter',
    'mapKecamatanFilter',
    'mapKelurahanFilter',
    'mapKategoriFilter',
    'mapIndikatorFilter'
  ].includes(id)){
    scheduleDynamicMapLegendRender(4);
  }
});

// Saat data legenda diisi belakangan oleh app.js, render ulang otomatis.
const dynamicMapLegendWatcher = setInterval(function(){
  dynamicMapLegendWatchCounter++;

  if(isKerawananPanganActive()){
    renderDynamicMapLegend();
  }

  if(dynamicMapLegendWatchCounter >= 40){
    clearInterval(dynamicMapLegendWatcher);
  }
}, 500);

// Jalankan peta pertama kali dengan mode aman
if(initMiderMap() && getMiderMap()){
  reloadMapGeojson();
  refreshMiderMapSize();
}

// Saat layer peta dibuka dari tombol/sidebar, paksa Leaflet menghitung ulang ukuran.
document.addEventListener('click', function(event){
  const target = event.target;
  const text = (target && target.textContent ? target.textContent : '').toLowerCase();

  if(text.includes('mider peta') || text.includes('peta')){
    initMiderMap();
    if(!window.geoJsonLayer && typeof reloadMapGeojson === 'function'){
      reloadMapGeojson();
    }
    refreshMiderMapSize();
    scheduleDynamicMapLegendRender(5);
  }
});

// Pantau perubahan display pada #mapLayer agar peta muncul normal setelah layer ditampilkan.
document.addEventListener('DOMContentLoaded', function(){
  const mapLayer = document.getElementById('mapLayer');

  if(!mapLayer || typeof MutationObserver === 'undefined') return;

  const observer = new MutationObserver(function(){
    const isVisible = mapLayer.style.display !== 'none';

    if(isVisible){
      initMiderMap();

      if(!geoJsonLayer && typeof reloadMapGeojson === 'function'){
        reloadMapGeojson();
      }

      refreshMiderMapSize();
      scheduleDynamicMapLegendRender(5);
    }
  });

  observer.observe(mapLayer, {
    attributes: true,
    attributeFilter: ['style', 'class']
  });
});

// Render awal legenda setelah seluruh script dimuat.
setTimeout(function(){ scheduleDynamicMapLegendRender(8); }, 500);


// =====================================================
// MIDER 2.0 - THEME REFRESH FOR MAP
// =====================================================
document.addEventListener('mider-theme-updated', function(){
  if(typeof forceRefreshMapStyles === 'function'){
    forceRefreshMapStyles();
  }
  if(typeof renderDynamicMapLegend === 'function'){
    renderDynamicMapLegend();
  }
});



// =====================================================
// MIDER 2.0 - MAP THEME SYNC
// Tidak mengubah warna polygon Kerawanan Pangan.
// =====================================================
document.addEventListener('mider-theme-updated', function(){
  if(typeof renderDynamicMapLegend === 'function'){
    renderDynamicMapLegend();
  }
  if(selectedMapLayer && typeof refreshMapPopup === 'function'){
    refreshMapPopup();
  }
});
