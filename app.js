const DASH_CHART_COLORS = [
  '#38CE3C', '#8E32E9', '#FFDE73', '#FF4D6B', '#14B8A6', '#2563EB',
  '#2EB532', '#A855F7', '#F97316', '#0EA5A4', '#60A5FA', '#F472B6'
];

Chart.defaults.color = '#CBD5E1';
Chart.defaults.font.family = 'Inter, Segoe UI, Poppins, Arial, sans-serif';
Chart.defaults.borderColor = 'rgba(148,163,184,.18)';

const DashboardColorPlugin = {
  id: 'dashboardColorPlugin',
  beforeUpdate(chart) {
    if (!chart.data || !chart.data.datasets) return;
    chart.data.datasets.forEach((ds, i) => {
      const canvasIndex = [...document.querySelectorAll('canvas')].indexOf(chart.canvas);
      const color = DASH_CHART_COLORS[(canvasIndex + i) % DASH_CHART_COLORS.length];
      const soft = color + '2E';
      const mid = color + 'C7';
      if (chart.config.type === 'line') {
        ds.borderColor = color;
        ds.backgroundColor = soft;
        ds.pointBackgroundColor = color;
        ds.pointBorderColor = '#ffffff';
        ds.pointRadius = 3;
        ds.pointHoverRadius = 5;
        ds.borderWidth = 3;
        ds.tension = .35;
        ds.fill = true;
      } else {
        ds.backgroundColor = mid;
        ds.borderColor = color;
        ds.borderWidth = 1.5;
        ds.borderRadius = 5;
        ds.hoverBackgroundColor = color;
      }
    });
  }
};
Chart.register(DashboardColorPlugin);

// =========================
// DATA UTAMA DASHBOARD
// =========================
let DATA = [];
let MAP_DATA = [];
let MAP_DATA_KECAMATAN = [];
let MAP_DATA_KELURAHAN = [];
let CONFIG = {};
let LEGENDA_DATA = [];
let TEMA_DATA = [];
let miderAutoRefreshTimer = null;

let mainChart, barChart;
let miniCharts = [];
let years = [];
let selectedKecamatan = null;

// =========================
// STATUS FILTER PETA
// =========================
let activeMapLevel = 'kecamatan';
let activeMapKecamatan = 'all';
let activeMapKelurahan = 'all';
let activeDashboardUrusan = 'all';
let activeDashboardKategori = 'all';
let activeDashboardIndikator = 'all';

const EXECUTIVE_KPI = [
  {
    indikator: 'Indeks Ketahanan Pangan'
  },
  {
    indikator: 'Prevalence of Undernourishment'
  },
  {
    indikator: 'Kontribusi PDRB',
    urusan: 'Pertanian'
  },
  {
    indikator: 'Kontribusi PDRB',
    urusan: 'Kelautan dan Perikanan'
  }
];

let activeMapKategori = 'all';
let activeMapIndikator = 'all';

const fmt=(v)=> v==null?'N/A':Number(v).toLocaleString('id-ID',{maximumFractionDigits:2});
const pct=(a,b)=> (a==null||b==null||b===0)?null:((a-b)/Math.abs(b)*100);
function populateFilters(){
 const y=document.getElementById('yearFilter'), u=document.getElementById('urusanFilter'), k=document.getElementById('kategoriFilter');
 if(!y || !u || !k) return;

 const currentYear = y.value || 'all';
 const currentUrusan = u.value || 'all';
 const currentKategori = k.value || 'all';

 y.innerHTML='<option value="all">Semua Tahun</option>'+years.map(x=>`<option value="${x}">${x}</option>`).join('');
 u.innerHTML='<option value="all">Semua Urusan</option>'+[...new Set(DATA.map(d=>d.urusan).filter(Boolean))].sort().map(x=>`<option value="${x}">${x}</option>`).join('');

 if([...y.options].some(opt => opt.value === currentYear)) y.value = currentYear;
 if([...u.options].some(opt => opt.value === currentUrusan)) u.value = currentUrusan;

 updateKategori();

 if([...k.options].some(opt => opt.value === currentKategori)) k.value = currentKategori;

 [
   {id:'yearFilter', event:'change'},
   {id:'urusanFilter', event:'change'},
   {id:'kategoriFilter', event:'change'},
   {id:'searchFilter', event:'input'}
 ].forEach(cfg=>{
   const el=document.getElementById(cfg.id);
   if(!el || el.dataset.miderBound === '1') return;

   el.addEventListener(cfg.event, ()=>{
     if(cfg.id === 'urusanFilter'){
       updateKategori();
     }
     render();
   });

   el.dataset.miderBound = '1';
 });
}
function updateKategori(){
 const uEl=document.getElementById('urusanFilter');
 const kEl=document.getElementById('kategoriFilter');
 if(!uEl || !kEl) return;

 const u=uEl.value;
 let rows=DATA.filter(d=>u==='all'||d.urusan===u);
 let cats=[...new Set(rows.map(d=>d.kategori).filter(Boolean))].sort();

 const currentKategori = kEl.value || 'all';
 kEl.innerHTML='<option value="all">Semua Kategori</option>'+cats.map(x=>`<option value="${x}">${x}</option>`).join('');

 if([...kEl.options].some(opt => opt.value === currentKategori)){
   kEl.value = currentKategori;
 }else{
   kEl.value = 'all';
 }
}
function filteredBase(){
const y=document.getElementById('yearFilter')?.value || 'all';
const u=document.getElementById('urusanFilter')?.value || 'all';
const k=document.getElementById('kategoriFilter')?.value || 'all';
const s=(document.getElementById('searchFilter')?.value || '').toLowerCase();

return DATA.filter(d=>
(y==='all'||String(d.tahun)===String(y)) &&
(u==='all'||d.urusan===u) &&
(k==='all'||d.kategori===k) &&
(!s||String(d.indikator||'').toLowerCase().includes(s)) &&
(!selectedKecamatan || String(d.kecamatan||'').toLowerCase()===String(selectedKecamatan).toLowerCase())
);
}
function getSelectedDashboardYear(){
  return document.getElementById('yearFilter')?.value || 'all';
}

function latestForIndicator(rows, ind){
  const yr = getSelectedDashboardYear();
  let r=rows.filter(d=>d.indikator===ind.indikator && d.urusan===ind.urusan && d.kategori===ind.kategori && d.kode===ind.kode && d.nilai!=null);
  if(yr!=='all') r=r.filter(d=>String(d.tahun)===String(yr));
  r.sort((a,b)=>Number(b.tahun)-Number(a.tahun));
  return r[0];
}
function groupIndicators(rows){ const map=new Map(); rows.forEach(d=>{const key=[d.urusan,d.kategori,d.kode,d.indikator].join('|'); if(!map.has(key)) map.set(key,d);}); return [...map.values()];}

// =========================
// FILTER TAMPILAN UTAMA / EKSEKUTIF
// =========================
function isExecutiveDashboardMode(){
  return activeDashboardUrusan === 'all' &&
    activeDashboardKategori === 'all' &&
    activeDashboardIndikator === 'all';
}

function isExecutiveIndicator(ind){
  if(!ind || !ind.indikator) return false;

  return EXECUTIVE_KPI.some(item => {
    const indikatorMatch = String(ind.indikator || '')
      .toLowerCase()
      .includes(String(item.indikator || '').toLowerCase());

    const urusanMatch = !item.urusan || ind.urusan === item.urusan;

    return indikatorMatch && urusanMatch;
  });
}

function getDashboardDisplayRows(rows){
  const sourceRows = Array.isArray(rows) ? rows : [];

  if(!isExecutiveDashboardMode()){
    return sourceRows;
  }

  return sourceRows.filter(isExecutiveIndicator);
}
function trendOf(rows, ind, targetYear=null){
  const arr=rows
    .filter(d=>d.kode===ind.kode&&d.urusan===ind.urusan&&d.kategori===ind.kategori&&d.nilai!==null&&d.nilai!==undefined)
    .sort((a,b)=>a.tahun-b.tahun);

  if(arr.length<2){
    return {cls:'flat',text:'YoY: Data terbatas',change:null,first:arr[0]||null,prev:null,last:arr[arr.length-1]||null};
  }

  let last;
  if(targetYear!==null&&targetYear!==undefined&&targetYear!=='all'){
    last=arr.find(d=>String(d.tahun)===String(targetYear));
  }else{
    last=arr[arr.length-1];
  }

  if(!last){
    return {cls:'flat',text:'YoY: Data tidak tersedia',change:null,first:arr[0],prev:null,last:null};
  }

  const idx=arr.findIndex(d=>String(d.tahun)===String(last.tahun));
  const prev=idx>0?arr[idx-1]:null;

  if(!prev||prev.nilai===0||prev.nilai===null||prev.nilai===undefined){
    return {cls:'flat',text:'YoY: Data tahun sebelumnya tidak tersedia',change:null,first:arr[0],prev,last};
  }

  const c=((last.nilai-prev.nilai)/Math.abs(prev.nilai))*100;
  const cls=Math.abs(c)<1?'flat':c>0?'up':'down';
  const label=Math.abs(c)<1?'Tetap':c>0?'Naik':'Turun';

  return {
    cls,
    text:'YoY: '+label+' '+Math.abs(c).toLocaleString('id-ID',{maximumFractionDigits:2})+'%',
    change:c,
    first:arr[0],
    prev,
    last
  };
}
function renderKPIs(rows){
  let inds = groupIndicators(rows);
if(isExecutiveDashboardMode()) inds = inds.filter(isExecutiveIndicator);
  const selectedYear=getSelectedDashboardYear();

  kpiGrid.innerHTML=inds.map(ind=>{
    const latest=latestForIndicator(rows,ind);
    const yoyYear=selectedYear==='all' ? latest?.tahun : selectedYear;
    const tr=trendOf(DATA,ind,yoyYear);
    const periode=tr.prev&&tr.last ? 'dibanding tahun sebelumnya' : '';

    return `<div class="card kpi"><h3>${ind.indikator}</h3><div class="value">${fmt(latest?.nilai)}</div><div class="meta">${ind.urusan} • ${ind.kategori} • ${ind.satuan||'-'}</div><div class="meta">Tahun: ${latest?.tahun||'-'} ${periode}</div><div class="trend ${tr.cls}">${tr.text}</div></div>`;
  }).join('') || '<div class="card kpi">Tidak ada data.</div>';
}

function getChartYears(){
  if(!years.length) return [];

  const yearEl = document.getElementById('yearFilter');
  const selectedYear =
    (yearEl?.value || 'all') === 'all'
      ? Math.max(...years.map(Number))
      : Number(yearEl.value);

  return years.filter(y => Number(y) <= selectedYear);
}

function makeDatasets(rows, inds){
  const chartYears = getChartYears();

  return inds.slice(0,12).map(ind => ({
    label: ind.indikator.substring(0,48),

    data: chartYears.map(y => {
      const r = DATA.find(
        d =>
          Number(d.tahun) === Number(y) &&
          d.kode === ind.kode &&
          d.urusan === ind.urusan &&
          d.kategori === ind.kategori
      );

      return r?.nilai ?? null;
    }),

    fill: true,
    tension: .35,
    borderWidth: 3
  }));
} 

function renderCharts(rows){
 if(mainChart) mainChart.destroy();
 if(barChart) barChart.destroy();
 mainChart = null;
 barChart = null;
 let inds = groupIndicators(rows);
if(isExecutiveDashboardMode()) inds = inds.filter(isExecutiveIndicator);

 const mainCanvas=document.getElementById('mainChart');
 if(mainCanvas){
  mainChart=new Chart(mainCanvas,{type:'line',data:{labels:getChartYears(),datasets:makeDatasets(rows,inds)},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom'}},scales:{x:{stacked:true},y:{stacked:true,beginAtZero:false}}}});
 }
 const barCanvas=document.getElementById('barChart');
 if(barCanvas){
  const selectedYear=getSelectedDashboardYear()==='all'?Math.max(...years.map(Number)):Number(getSelectedDashboardYear());
  const vals=inds.map(ind=>({label:ind.indikator.substring(0,35),v:rows.find(d=>d.tahun===selectedYear&&d.kode===ind.kode&&d.urusan===ind.urusan&&d.kategori===ind.kategori)?.nilai??null})).filter(x=>x.v!=null).sort((a,b)=>b.v-a.v).slice(0,15);
  barChart=new Chart(barCanvas,{type:'bar',data:{labels:vals.map(x=>x.label),datasets:[{label:'Nilai '+selectedYear,data:vals.map(x=>x.v)}]},options:{indexAxis:'y',responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{beginAtZero:true}}}});
 }
 renderMiniCharts(rows,inds);
}
function renderMiniCharts(rows,inds){
  miniCharts.forEach(c=>c.destroy());
  miniCharts=[];

  const chartYears = getChartYears();

  indicatorCharts.innerHTML=inds.map((ind,i)=>`<div class="card kpi smallChart"><h3>${ind.indikator}</h3><canvas id="mini${i}"></canvas><div class="meta">${ind.urusan} • ${ind.kategori}</div></div>`).join('');

  inds.forEach((ind,i)=>{
    const vals=chartYears.map(y=>
      DATA.find(
        d =>
          Number(d.tahun)===Number(y) &&
          d.kode===ind.kode &&
          d.urusan===ind.urusan &&
          d.kategori===ind.kategori
      )?.nilai??null
    );

    const allowedCharts = ['line','bar','pie','doughnut','radar','polarArea'];
    const type = allowedCharts.includes(ind.chart)? ind.chart: 'line';

    miniCharts.push(new Chart(document.getElementById('mini'+i),{
      type,
      data:{
        labels:chartYears,
        datasets:[{
          label:ind.indikator,
          data:vals,
          fill:true,
          tension:.35,
          borderWidth:3
        }]
      },
      options:{
        responsive:true,
        maintainAspectRatio:false,
        interaction:{mode:'index',intersect:false},
        plugins:{legend:{display:false}},
        scales:{x:{stacked:true},y:{stacked:true,beginAtZero:false}}
      }
    }));
  });
}

function renderInsights(rows){
  // Fungsi ini dibuat aman agar dashboard tidak gagal loading
  // jika elemen insight tidak tersedia di HTML.
  const insightListEl = document.getElementById('insightList');
  const relationListEl = document.getElementById('relationList');

  if(!insightListEl && !relationListEl){
    return;
  }

  const inds = groupIndicators(rows || []);
  const selectedYear = document.getElementById('yearFilter')?.value || 'all';

  let ranked = inds.map(ind => {
    const latest = latestForIndicator(rows || [], ind);
    const yoyYear = selectedYear === 'all' ? latest?.tahun : selectedYear;
    return { ind, tr: trendOf(DATA, ind, yoyYear) };
  }).filter(x => x.tr && x.tr.change !== null && x.tr.change !== undefined);

  const up = ranked
    .filter(x => x.tr.change > 0)
    .sort((a,b) => b.tr.change - a.tr.change)
    .slice(0,3);

  const down = ranked
    .filter(x => x.tr.change < 0)
    .sort((a,b) => a.tr.change - b.tr.change)
    .slice(0,3);

  if(insightListEl){
    const items = [
      ...up.map(x => `<li><b>${x.ind.indikator}</b> YoY naik ${Math.abs(x.tr.change).toLocaleString('id-ID',{maximumFractionDigits:2})}% dibanding tahun sebelumnya.</li>`),
      ...down.map(x => `<li><b>${x.ind.indikator}</b> YoY turun ${Math.abs(x.tr.change).toLocaleString('id-ID',{maximumFractionDigits:2})}% dibanding tahun sebelumnya.</li>`)
    ];

    insightListEl.innerHTML = items.length
      ? items.join('')
      : '<li>Insight belum tersedia karena data tren masih terbatas.</li>';
  }

  if(relationListEl){
    relationListEl.innerHTML =
      '<li><b>Hubungan data:</b> pilih tahun, urusan, atau kategori untuk melihat pola perkembangan indikator secara lebih terarah.</li>' +
      '<li><b>Tren tahunan:</b> grafik menampilkan data historis sampai tahun yang dipilih agar perubahan antar tahun lebih mudah dibaca.</li>';
  }
}

function renderTable(rows){
  const sortedRows=[...rows].sort((a,b)=>(a.tahun||0)-(b.tahun||0)||String(a.urusan||'').localeCompare(String(b.urusan||''))||String(a.kategori||'').localeCompare(String(b.kategori||''))||String(a.indikator||'').localeCompare(String(b.indikator||'')));

  matrixTable.innerHTML='<thead><tr><th>Tahun</th><th>Urusan</th><th>Kategori</th><th>Indikator</th><th>Satuan</th><th>Nilai</th><th>YoY</th><th>Keterangan</th></tr></thead><tbody>'+
  sortedRows.map(d=>{
    const ind={kode:d.kode,urusan:d.urusan,kategori:d.kategori};
    const tr=trendOf(DATA,ind,d.tahun);

    let yoyText='-';
    let ket='Data tahun sebelumnya tidak tersedia';
    let trendClass='flat';

    if(tr.change!==null&&tr.change!==undefined){
      yoyText=(tr.change>0?'+':'')+tr.change.toLocaleString('id-ID',{maximumFractionDigits:2})+'%';
      trendClass=tr.cls;
      ket=tr.cls==='up'?'Naik dibanding tahun sebelumnya':tr.cls==='down'?'Turun dibanding tahun sebelumnya':'Relatif tetap dibanding tahun sebelumnya';
    }

    return `<tr><td>${d.tahun??'-'}</td><td>${d.urusan??'-'}</td><td>${d.kategori??'-'}</td><td>${d.indikator??'-'}</td><td>${d.satuan??'-'}</td><td>${d.nilai!==null&&d.nilai!==undefined?fmt(d.nilai):'-'}</td><td class="trend ${trendClass}">${yoyText}</td><td class="trend ${trendClass}">${ket}</td></tr>`;
  }).join('')+'</tbody>';
}
function render(){
  const rows = filteredBase();
  const displayRows = getDashboardDisplayRows(rows);
  const inds = groupIndicators(displayRows);
  const yearEl = document.getElementById('yearFilter');
  const urusanEl = document.getElementById('urusanFilter');
  const kategoriEl = document.getElementById('kategoriFilter');

  const selectedYear = yearEl?.value || 'all';
  const trends = inds.map(ind => {
    const latest = latestForIndicator(displayRows, ind);
    const yoyYear = selectedYear === 'all' ? latest?.tahun : selectedYear;
    return trendOf(DATA, ind, yoyYear);
  });

  const sumIndicatorsEl = document.getElementById('sumIndicators');
  const sumYearsEl = document.getElementById('sumYears');
  const sumUpEl = document.getElementById('sumUp');
  const sumDownEl = document.getElementById('sumDown');
  const activeFilterLabelEl = document.getElementById('activeFilterLabel');

  if(sumIndicatorsEl) sumIndicatorsEl.textContent = inds.length;
  if(sumYearsEl) sumYearsEl.textContent = [...new Set(displayRows.map(d=>d.tahun))].length;
  if(sumUpEl) sumUpEl.textContent = trends.filter(t=>t.change>0).length;
  if(sumDownEl) sumDownEl.textContent = trends.filter(t=>t.change<0).length;
  if(activeFilterLabelEl){
    activeFilterLabelEl.textContent =
      `${selectedYear === 'all' ? 'Semua Tahun' : selectedYear} • ${urusanEl?.value === 'all' ? 'Semua Urusan' : (urusanEl?.value || '-')} • ${kategoriEl?.value === 'all' ? 'Semua Kategori' : (kategoriEl?.value || '-')}`;
  }

  renderKPIs(displayRows);
  renderCharts(displayRows);
  renderInsights(displayRows);
  renderTable(displayRows);

  if(typeof scheduleSmartKpiIcons === 'function'){
    scheduleSmartKpiIcons();
  }
}

// Scroll vertikal tetap diarahkan ke konten utama ketika kursor berada di area tabel.
// Scroll horizontal tabel tetap dipertahankan, termasuk saat memakai Shift + roda mouse/trackpad.
function setupMatrixTableWheelFix(){
  const tableWrap = document.querySelector('.tableWrap');
  const mainContent = document.getElementById('mainContent') || document.querySelector('.main-content');

  if(!tableWrap || !mainContent || tableWrap.dataset.miderWheelFix === '1') return;

  tableWrap.addEventListener('wheel', function(event){
    const horizontalIntent = event.shiftKey || Math.abs(event.deltaX) > Math.abs(event.deltaY);

    if(horizontalIntent){
      return;
    }

    if(event.deltaY !== 0){
      event.preventDefault();
      mainContent.scrollTop += event.deltaY;
    }
  }, {passive:false});

  tableWrap.dataset.miderWheelFix = '1';
}
function resetFilters(){
  const yearEl = document.getElementById('yearFilter');
  const urusanEl = document.getElementById('urusanFilter');
  const kategoriEl = document.getElementById('kategoriFilter');
  const searchEl = document.getElementById('searchFilter');

  if(yearEl) yearEl.value = 'all';
  if(urusanEl) urusanEl.value = 'all';
  updateKategori();
  if(kategoriEl) kategoriEl.value = 'all';
  if(searchEl) searchEl.value = '';

  activeDashboardUrusan = 'all';
  activeDashboardKategori = 'all';
  activeDashboardIndikator = 'all';

  populateSidebarMenu('dashboard');
  render();
}
function downloadPDF(){window.print();}
const GOOGLE_SHEETS_API_URL = 'https://script.google.com/macros/s/AKfycbw-g0VpS35FrnUwtFaOnSpqUguWgTvmuotBOTKNcp1VPlleDXWevMOSkt1p9JM7tWuK/exec';

const DASHBOARD_CACHE_KEY = 'miderDashboardCacheV1';
let isDashboardLoading = false;

function saveDashboardCache(rawData){
  try{
    localStorage.setItem(DASHBOARD_CACHE_KEY, JSON.stringify({
      savedAt: Date.now(),
      data: rawData
    }));
  }catch(error){
    console.warn('Cache dashboard tidak bisa disimpan:', error);
  }
}

function getDashboardCache(){
  try{
    const cached = localStorage.getItem(DASHBOARD_CACHE_KEY);
    if(!cached) return null;

    const parsed = JSON.parse(cached);
    return parsed?.data || null;
  }catch(error){
    console.warn('Cache dashboard tidak bisa dibaca:', error);
    return null;
  }
}

function setRefreshButtonLoading(isLoading){
  const btn = document.getElementById('manualRefreshBtn');
  if(!btn) return;

  btn.disabled = isLoading;
  btn.textContent = isLoading ? '⏳ Memuat data...' : '🔄 Refresh Data';
}

function setupManualRefreshButton(){
  const actions = document.querySelector('#dashboardLayer .actions') || document.querySelector('.actions');
  if(!actions || document.getElementById('manualRefreshBtn')) return;

  const btn = document.createElement('button');
  btn.id = 'manualRefreshBtn';
  btn.type = 'button';
  btn.className = 'secondary';
  btn.textContent = '🔄 Refresh Data';
  btn.title = 'Ambil data terbaru dari Google Sheets';

  btn.addEventListener('click', async function(){
    if(isDashboardLoading) return;

    try{
      await loadDashboardData({forceRefresh:true, useCache:false, showLoading:true});
    }catch(error){
      console.error('Refresh manual gagal:', error);
      alert('Gagal refresh data. Periksa koneksi internet dan URL API.');
    }
  });

  actions.appendChild(btn);
}



function normalizeDashboardData(rawData){
  const rows = Array.isArray(rawData) ? rawData : (rawData && Array.isArray(rawData.data) ? rawData.data : []);

  return rows
    .map(row => {
      const normalized = {};

      Object.keys(row || {}).forEach(key => {
        const cleanKey = String(key).trim().toLowerCase();
        normalized[cleanKey] = row[key];
      });

      const tahun = Number(normalized.tahun);
      const nilaiRaw = normalized.nilai;

      return {
	tahun: Number.isFinite(tahun) ? tahun : normalized.tahun,
	urusan: String(normalized.urusan || '').trim(),
	kategori: String(normalized.kategori || '').trim(),
	kode: String(normalized.kode || '').trim(),
	indikator: String(normalized.indikator || '').trim(),
	label_lengkap: String(normalized.label_lengkap || '').trim(),
	satuan: String(normalized.satuan || '').trim(),
	nilai: nilaiRaw === '' || nilaiRaw === null || nilaiRaw === undefined ? null : 	Number(String(nilaiRaw).replace(',', '.')),
	chart: String(normalized.chart || 'stacked_area').trim(),
	kecamatan: String(normalized.kecamatan || '').trim()
	};
    })
    .filter(row => row.tahun && row.urusan && row.kategori && row.kode && row.indikator);
}


// =========================
// HELPER DATA PETA KECAMATAN / KELURAHAN
// =========================
function getActiveMapData(){
  return activeMapLevel === 'kelurahan'
    ? MAP_DATA_KELURAHAN
    : MAP_DATA_KECAMATAN;
}

function updateMapKelurahanFilter(){
  const kelurahanFilter = document.getElementById('mapKelurahanFilter');

  if(!kelurahanFilter) return;

  let rows = MAP_DATA_KELURAHAN || [];

  if(activeMapKecamatan !== 'all'){
    rows = rows.filter(d => String(d.kecamatan || '') === String(activeMapKecamatan));
  }

  const kelurahanList = [
    ...new Set(rows.map(d => d.kelurahan).filter(Boolean))
  ].sort();

  kelurahanFilter.innerHTML =
    '<option value="all">Semua Kelurahan</option>' +
    kelurahanList.map(k => `<option value="${k}">${k}</option>`).join('');

  kelurahanFilter.value = activeMapKelurahan;
}

function populateMapWilayahFilters(){
  const kecamatanFilter = document.getElementById('mapKecamatanFilter');
  const kelurahanFilter = document.getElementById('mapKelurahanFilter');

  if(!kecamatanFilter || !kelurahanFilter) return;

  const rows = MAP_DATA_KELURAHAN || [];

  const kecamatanList = [
    ...new Set(rows.map(d => d.kecamatan).filter(Boolean))
  ].sort();

  kecamatanFilter.innerHTML =
    '<option value="all">Semua Kecamatan</option>' +
    kecamatanList.map(k => `<option value="${k}">${k}</option>`).join('');

  kecamatanFilter.value = activeMapKecamatan;

  updateMapKelurahanFilter();

  kecamatanFilter.onchange = function(){
    activeMapKecamatan = this.value;
    activeMapKelurahan = 'all';

    updateMapKelurahanFilter();

    if(typeof populateMapFilters === 'function'){
      populateMapFilters();
    }

    populateSidebarMenu('map');

    if(typeof updateMapVisualHighlight === 'function'){
      updateMapVisualHighlight();
    }else if(typeof refreshMapPopup === 'function'){
      refreshMapPopup();
    }
  };

  kelurahanFilter.onchange = function(){
    activeMapKelurahan = this.value;

    if(typeof populateMapFilters === 'function'){
      populateMapFilters();
    }

    populateSidebarMenu('map');

    if(typeof updateMapVisualHighlight === 'function'){
      updateMapVisualHighlight();
    }else if(typeof refreshMapPopup === 'function'){
      refreshMapPopup();
    }
  };
}

function setupMapLevelFilter(){
  const levelFilter = document.getElementById('mapLevelFilter');
  const kecamatanBox = document.querySelector('.map-kecamatan-box');
  const kelurahanBox = document.querySelector('.map-kelurahan-box');

  if(!levelFilter) return;

  function applyLevel(){
    activeMapLevel = levelFilter.value || 'kecamatan';

    activeMapKecamatan = 'all';
    activeMapKelurahan = 'all';
    activeMapKategori = 'all';
    activeMapIndikator = 'all';

    MAP_DATA = getActiveMapData();
    window.MAP_DATA = MAP_DATA;

    if(activeMapLevel === 'kelurahan'){
      if(kecamatanBox) kecamatanBox.style.display = 'block';
      if(kelurahanBox) kelurahanBox.style.display = 'block';
    }else{
      if(kecamatanBox) kecamatanBox.style.display = 'none';
      if(kelurahanBox) kelurahanBox.style.display = 'none';
    }

    populateMapWilayahFilters();

    if(typeof populateMapFilters === 'function'){
      populateMapFilters();
    }

    const isMapLayerVisible =
      document.getElementById('mapLayer')?.style.display === 'block';

    if(isMapLayerVisible){
      populateSidebarMenu('map');
    }

    if(typeof reloadMapGeojson === 'function'){
      reloadMapGeojson();
    }

    if(typeof refreshMapPopup === 'function'){
      refreshMapPopup();
    }
  }

  levelFilter.onchange = applyLevel;
  applyLevel();
}

function startDashboard(rawData){
  rawData = rawData || {};

  CONFIG = rawData.config || {};
  LEGENDA_DATA = rawData.legenda || [];
  TEMA_DATA = rawData.tema || [];

  window.CONFIG = CONFIG;
  window.LEGENDA_DATA = LEGENDA_DATA;
  window.TEMA_DATA = TEMA_DATA;
  window.MIDER_GENERATED_AT = rawData.generated_at || '';

  applyMiderThemeFromSpreadsheet(TEMA_DATA);
  initMiderTheme(CONFIG);

  setTimeout(function(){
    const currentTheme =
      document.documentElement.getAttribute('data-theme') ||
      normalizeThemeName(CONFIG.default_theme || 'light');

    document.documentElement.setAttribute('data-theme', currentTheme);
    applyMiderThemeFromSpreadsheet(window.TEMA_DATA || TEMA_DATA || []);
  }, 100);
  renderMiderFooter(CONFIG, rawData.generated_at);
  scheduleMiderAutoRefresh(CONFIG);

  const maintenanceStatus = String(CONFIG.maintenance || rawData.maintenance || 'OFF').trim().toUpperCase();

  if(maintenanceStatus === 'ON'){
    document.body.innerHTML = `
      <div id="maintenanceMode">
        <div class="maintenance-box">
          <div class="maintenance-icon">🛠️</div>
          <h1>UNDER MAINTENANCE</h1>
          <p>Dashboard sedang update data.</p>
          <small>Silakan cek kembali beberapa saat lagi.</small>
        </div>
      </div>
    `;
    return;
  }

  DATA = normalizeDashboardData(rawData.kpi || rawData);
  MAP_DATA_KECAMATAN = rawData.peta_kecamatan || rawData.peta || [];
  MAP_DATA_KELURAHAN = rawData.peta_kelurahan || [];

  MAP_DATA = getActiveMapData();
  window.MAP_DATA = MAP_DATA;
  window.MAP_DATA_KECAMATAN = MAP_DATA_KECAMATAN;
  window.MAP_DATA_KELURAHAN = MAP_DATA_KELURAHAN;

  setTimeout(function(){
    if(typeof populateMapFilters === 'function') populateMapFilters();
    if(typeof renderDynamicMapLegend === 'function') renderDynamicMapLegend();
  }, 500);

  years = [...new Set(DATA.map(d=>d.tahun))].sort((a,b)=>a-b);

  if(!DATA.length){
    throw new Error('Data KPI kosong atau header spreadsheet tidak sesuai.');
  }

  populateFilters();
  window.dashboardInitialized = true;

  setupMapLevelFilter();

  const activeLayer = document.getElementById('mapLayer')?.style.display === 'block' ? 'map' : 'dashboard';
  populateSidebarMenu(activeLayer);

  render();
}

async function loadDashboardDataFromFetch(options = {}){
  const forceRefresh = options.forceRefresh === true;
  const apiUrl = forceRefresh
    ? GOOGLE_SHEETS_API_URL + '?v=' + Date.now()
    : GOOGLE_SHEETS_API_URL;

  const response = await fetch(apiUrl, {
    cache: forceRefresh ? 'reload' : 'default'
  });

  if(!response.ok) throw new Error('Gagal memuat data API: HTTP ' + response.status);

  const rawData = await response.json();
  saveDashboardCache(rawData);
  startDashboard(rawData);
}

function loadDashboardDataFromJsonp(){
  return new Promise((resolve, reject) => {
    const callbackName = '__dkp3DashboardCallback_' + Date.now();

    window[callbackName] = function(rawData){
      try{
        saveDashboardCache(rawData);
        startDashboard(rawData);
        resolve();
      }catch(error){
        reject(error);
      }finally{
        delete window[callbackName];
        script.remove();
      }
    };

    const script = document.createElement('script');
    script.src = GOOGLE_SHEETS_API_URL + '?callback=' + callbackName + '&v=' + Date.now();
    script.onerror = function(){
      delete window[callbackName];
      script.remove();
      reject(new Error('Gagal memuat data melalui JSONP. Pastikan Apps Script mendukung parameter callback.'));
    };

    document.body.appendChild(script);
  });
}

async function loadDashboardData(options = {}){
  const forceRefresh = options.forceRefresh === true;
  const useCache = options.useCache !== false;
  const showLoading = options.showLoading === true;

  if(isDashboardLoading) return;

  isDashboardLoading = true;
  if(showLoading) setRefreshButtonLoading(true);

  try{
    if(useCache && !forceRefresh){
      const cachedData = getDashboardCache();

      if(cachedData){
        startDashboard(cachedData);
      }
    }

    await loadDashboardDataFromFetch({forceRefresh:true});

  }catch(fetchError){
    console.warn('Fetch API gagal, mencoba mode JSONP:', fetchError);

    try{
      await loadDashboardDataFromJsonp();
    }catch(jsonpError){
      console.error(jsonpError);

      try{
        const fallback = await fetch(GOOGLE_SHEETS_API_URL + '?v=' + Date.now(), {cache: 'reload'});
        if(!fallback.ok) throw new Error('Fallback API juga gagal');
        const rawData = await fallback.json();
        saveDashboardCache(rawData);
        startDashboard(rawData);

        document.body.insertAdjacentHTML(
          'afterbegin',
          `<div style="padding:10px 16px;background:#fef3c7;color:#92400e;font-weight:700">
            Data Google Sheets sempat lambat dimuat, dashboard memakai hasil pembacaan terakhir dari API.
          </div>`
        );
      }catch(fallbackError){
        console.error(fallbackError);
        document.body.insertAdjacentHTML(
          'afterbegin',
          `<div style="padding:14px 18px;background:#fee2e2;color:#991b1b;font-weight:700">
            Gagal memuat data dashboard. Periksa URL API, akses Apps Script, dan header Google Sheets.
          </div>`
        );
      }
    }
  }finally{
    isDashboardLoading = false;
    if(showLoading) setRefreshButtonLoading(false);
    setupManualRefreshButton();
  }
}



// =========================
// MIDER 2.0: CONFIG, THEME, FOOTER
// =========================
function normalizeThemeName(value){
  const text = String(value || '').trim().toLowerCase();
  if(text === 'nusa malam' || text === 'gelap') return 'dark';
  if(text === 'nusa hijau' || text === 'terang') return 'light';
  return text === 'dark' ? 'dark' : 'light';
}

function cssVarName(name){
  const key = String(name || '').trim().toLowerCase().replace(/^--/,'').replace(/\s+/g,'_');
  const map = {
    bg:'--bg',
    background:'--bg',
    surface:'--surface',
    sidebar:'--surface',
    panel:'--panel',
    card:'--panel',
    panel2:'--panel2',
    text:'--text',
    muted:'--muted',
    line:'--line',
    primary:'--blue',
    primary2:'--blue2',
    accent:'--blue',
    blue:'--blue',
    blue2:'--blue2',
    success:'--green',
    green:'--green',
    danger:'--red',
    red:'--red',
    warning:'--orange',
    orange:'--orange',
    purple:'--purple',
    violet:'--purple',
    teal:'--teal',
    shadow:'--shadow',
    soft_shadow:'--softShadow',
    radius:'--radius'
  };
  return map[key] || ('--' + key.replace(/_/g,'-'));
}

function applyMiderThemeFromSpreadsheet(rows){
  if(!Array.isArray(rows) || !rows.length){
    return;
  }

  ['light','dark'].forEach(function(themeName){
    const selector = themeName === 'light'
      ? ':root, [data-theme="light"]'
      : '[data-theme="dark"]';

    let style = document.getElementById('mider-theme-spreadsheet-' + themeName);

    if(!style){
      style = document.createElement('style');
      style.id = 'mider-theme-spreadsheet-' + themeName;
      document.head.appendChild(style);
    }

    const vars = rows
      .filter(function(row){ return normalizeThemeName(row.tema) === themeName; })
      .filter(function(row){ return row.variabel && row.nilai; })
      .map(function(row){ return '  ' + cssVarName(row.variabel) + ': ' + row.nilai + ';'; })
      .join('\n');

    style.textContent = vars ? selector + '{\n' + vars + '\n}' : '';
  });

  const activeTheme =
    document.documentElement.getAttribute('data-theme') ||
    normalizeThemeName((window.CONFIG || {}).default_theme || 'light');

  document.documentElement.setAttribute('data-theme', activeTheme);

  document.dispatchEvent(new CustomEvent('mider-theme-updated', {
    detail: { theme: activeTheme }
  }));
}

function initMiderTheme(config = {}){
  const btn = document.getElementById('themeToggle');
  // Hapus kunci tema lama agar tidak bentrok dengan sistem MIDER 2.0.
  localStorage.removeItem('miderTheme');

  const saved = localStorage.getItem('mider-theme');
  const defaultTheme = normalizeThemeName(config.default_theme || 'dark');
  const active = normalizeThemeName(saved || defaultTheme);

  document.documentElement.setAttribute('data-theme', active);

  if(btn){
    btn.textContent = active === 'dark' ? '☀️' : '🌙';
    btn.title = active === 'dark' ? 'Ganti ke tema terang' : 'Ganti ke tema gelap';

    if(btn.dataset.miderThemeBound !== '1'){
      btn.addEventListener('click', function(){
        const current = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
        const next = current === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem('mider-theme', next);

        applyMiderThemeFromSpreadsheet(window.TEMA_DATA || TEMA_DATA || []);
        btn.textContent = next === 'dark' ? '☀️' : '🌙';
        btn.title = next === 'dark' ? 'Ganti ke tema terang' : 'Ganti ke tema gelap';

        if(typeof renderDynamicMapLegend === 'function') renderDynamicMapLegend();
      });
      btn.dataset.miderThemeBound = '1';
    }
  }
}

function renderMiderFooter(config = {}, generatedAt = ''){
  const versionEl = document.getElementById('footerVersion');
  const updateEl = document.getElementById('footerUpdate');
  const agencyEl = document.getElementById('footerAgency');
  const statusEl = document.getElementById('footerStatus');

  if(versionEl) versionEl.textContent = 'MIDER v' + (config.dashboard_version || '2.0.0');
  if(updateEl) updateEl.textContent = generatedAt ? ('Update data: ' + generatedAt + ' WIB') : 'Update data: -';
  if(agencyEl) agencyEl.textContent = config.dashboard_footer || 'DKP3 Kota Cirebon';
  if(statusEl){
    const maintenance = String(config.maintenance || 'OFF').trim().toUpperCase();
    statusEl.textContent = maintenance === 'ON' ? '🟠 Maintenance' : '🟢 Data Aktif';
  }
}

function scheduleMiderAutoRefresh(config = {}){
  const minutes = Number(config.auto_refresh_minutes || 0);
  if(miderAutoRefreshTimer){
    clearInterval(miderAutoRefreshTimer);
    miderAutoRefreshTimer = null;
  }

  if(Number.isFinite(minutes) && minutes > 0){
    miderAutoRefreshTimer = setInterval(function(){
      if(!isDashboardLoading){
        loadDashboardData({forceRefresh:true, useCache:false, showLoading:false});
      }
    }, minutes * 60000);
  }
}

document.addEventListener('DOMContentLoaded', setupManualRefreshButton);
document.addEventListener('DOMContentLoaded', setupMatrixTableWheelFix);
loadDashboardData({forceRefresh:true, useCache:false});



setTimeout(()=>{
  document.querySelectorAll('#indicatorCharts .kpi').forEach((el,i)=>{
    const color = DASH_CHART_COLORS[i % DASH_CHART_COLORS.length];
    el.style.borderTop = `4px solid ${color}`;
  });
  document.querySelectorAll('#kpiGrid .kpi').forEach((el,i)=>{
    const color = DASH_CHART_COLORS[i % DASH_CHART_COLORS.length];
    el.style.boxShadow = `0 6px 18px ${color}18`;
  });
},500);



function applySmartKpiIcons(){
  const rules = [
    {rx:/prevalence|undernourishment|gizi|pou/i, icon:'🍽️', sector:'pangan'},
    {rx:/ketahanan pangan|indeks ketahanan/i, icon:'🛡️', sector:'pangan'},
    {rx:/ketersediaan|cadangan|cppd|pangan utama/i, icon:'🌾', sector:'pangan'},
    {rx:/pph|pola pangan/i, icon:'🥗', sector:'pangan'},
    {rx:/energi|kkal|kalori/i, icon:'⚡', sector:'pangan'},
    {rx:/protein/i, icon:'🥚', sector:'pangan'},
    {rx:/keamanan pangan|aman pangan|psat|register/i, icon:'✅', sector:'keamanan'},
    {rx:/rawan|kerawanan|bantuan rawan/i, icon:'⚠️', sector:'risiko'},
    {rx:/food waste|limbah|sampah/i, icon:'♻️', sector:'risiko'},

    {rx:/perikanan tangkap|nelayan/i, icon:'🚢', sector:'perikanan'},
    {rx:/budidaya ikan|perikanan budidaya|pembudiaya|pokdakan/i, icon:'🐟', sector:'perikanan'},
    {rx:/pengolahan|pemasaran perikanan|poklasar/i, icon:'🏭', sector:'perikanan'},
    {rx:/produksi perikanan|total produksi perikanan/i, icon:'🐠', sector:'perikanan'},
    {rx:/konsumsi ikan/i, icon:'🍣', sector:'perikanan'},
    {rx:/air tawar/i, icon:'💧', sector:'perikanan'},
    {rx:/air payau/i, icon:'🌊', sector:'perikanan'},
    {rx:/air laut/i, icon:'⚓', sector:'perikanan'},

    {rx:/padi|beras/i, icon:'🌾', sector:'pangan'},
    {rx:/jagung/i, icon:'🌽', sector:'pangan'},
    {rx:/cabai|cabe/i, icon:'🌶️', sector:'pangan'},
    {rx:/bawang/i, icon:'🧅', sector:'pangan'},
    {rx:/sayur|hortikultura/i, icon:'🥬', sector:'pangan'},
    {rx:/buah/i, icon:'🍊', sector:'pangan'},

    {rx:/sapi|kerbau/i, icon:'🐄', sector:'peternakan'},
    {rx:/kambing|domba/i, icon:'🐐', sector:'peternakan'},
    {rx:/ayam|unggas/i, icon:'🐔', sector:'peternakan'},
    {rx:/telur/i, icon:'🥚', sector:'peternakan'},
    {rx:/daging/i, icon:'🥩', sector:'peternakan'},
    {rx:/susu/i, icon:'🥛', sector:'peternakan'},
    {rx:/ternak|peternakan/i, icon:'🐄', sector:'peternakan'},

    {rx:/pdrb|ekonomi|kontribusi/i, icon:'📈', sector:'ekonomi'},
    {rx:/nilai tukar|ntp|harga/i, icon:'💰', sector:'ekonomi'},
    {rx:/kelompok|pelaku/i, icon:'👥', sector:'ekonomi'},
    {rx:/jumlah|jml|jmlh/i, icon:'🔢', sector:'ekonomi'}
  ];

  document.querySelectorAll('#kpiGrid .kpi').forEach((card)=>{
    const title = card.querySelector('h3');
    if(!title) return;
    const text = title.textContent || '';
    const found = rules.find(item => item.rx.test(text)) || {icon:'📊', sector:'umum'};
    title.style.setProperty('--kpiIcon', `"${found.icon}"`);
    card.dataset.sector = found.sector;
  });

  const summaryIcons = ['📊','📅','📈','📉'];
  document.querySelectorAll('.summary .card').forEach((card,i)=>{
    card.style.setProperty('--summaryIcon', `"${summaryIcons[i] || '📌'}"`);
  });
}

// Jalankan hanya setelah render/perubahan tampilan, bukan interval terus-menerus.
let smartKpiIconFrame = null;
function scheduleSmartKpiIcons(){
  if(smartKpiIconFrame){
    cancelAnimationFrame(smartKpiIconFrame);
  }

  smartKpiIconFrame = requestAnimationFrame(function(){
    smartKpiIconFrame = null;
    applySmartKpiIcons();
  });
}

setTimeout(scheduleSmartKpiIcons, 300);
setTimeout(scheduleSmartKpiIcons, 1000);

/* HEADER AUTO-HIDE KHUSUS MOBILE */
(function(){
  let lastScrollY = window.scrollY || 0;
  const minDelta = 8;
  const hideAfter = 120;

  function isMobile(){
    return window.matchMedia('(max-width:720px)').matches;
  }

  function handleHeaderAutoHide(){
    const header = document.querySelector('header');
    if(!header) return;

    if(!isMobile()){
      header.classList.remove('header-hidden');
      return;
    }

    const currentY = window.scrollY || document.documentElement.scrollTop || 0;
    const diff = currentY - lastScrollY;

    if(Math.abs(diff) < minDelta) return;

    if(currentY > hideAfter && diff > 0){
      header.classList.add('header-hidden');
    }else if(diff < 0){
      header.classList.remove('header-hidden');
    }

    if(currentY <= 20){
      header.classList.remove('header-hidden');
    }

    lastScrollY = currentY;
  }

  window.addEventListener('scroll', handleHeaderAutoHide, {passive:true});
  window.addEventListener('resize', handleHeaderAutoHide);
})();

function showLayer(layerId, shouldReset = true){

  document.getElementById('dashboardLayer').style.display = 'none';
  document.getElementById('mapLayer').style.display = 'none';
  document.getElementById(layerId).style.display = 'block';

  document.querySelectorAll('.sidebar-menu').forEach(btn=>{
    btn.classList.remove('active');
  });

  if(layerId === 'dashboardLayer'){
    if(shouldReset){
      selectedKecamatan = null;
      activeDashboardUrusan = 'all';
      activeDashboardKategori = 'all';
      activeDashboardIndikator = 'all';

      const urusanEl = document.getElementById('urusanFilter');
      const kategoriEl = document.getElementById('kategoriFilter');
      const searchEl = document.getElementById('searchFilter');

      if(urusanEl) urusanEl.value = 'all';
      updateKategori();
      if(kategoriEl) kategoriEl.value = 'all';
      if(searchEl) searchEl.value = '';
    }

    document.querySelector('.sidebar-menu:nth-of-type(1)').classList.add('active');
    populateSidebarMenu('dashboard');
    render();
  }

  if(layerId === 'mapLayer'){
    if(shouldReset){
      activeMapKecamatan = 'all';
      activeMapKelurahan = 'all';
      activeMapKategori = 'all';
      activeMapIndikator = 'all';

      const kecamatanFilter = document.getElementById('mapKecamatanFilter');
      const kelurahanFilter = document.getElementById('mapKelurahanFilter');
      const kategoriFilter = document.getElementById('mapKategoriFilter');
      const indikatorFilter = document.getElementById('mapIndikatorFilter');

      if(kecamatanFilter) kecamatanFilter.value = 'all';
      if(kelurahanFilter) kelurahanFilter.value = 'all';
      if(kategoriFilter) kategoriFilter.value = 'all';
      if(indikatorFilter) indikatorFilter.value = 'all';
    }

    document.querySelector('.sidebar-menu:nth-of-type(2)').classList.add('active');

    if(typeof populateMapWilayahFilters === 'function'){
      populateMapWilayahFilters();
    }

    if(typeof populateMapFilters === 'function'){
      populateMapFilters();
    }

    populateSidebarMenu('map');

    if(typeof updateMapVisualHighlight === 'function'){
      updateMapVisualHighlight();
    }else if(typeof refreshMapPopup === 'function'){
      refreshMapPopup();
    }

    // Pastikan peta Leaflet muncul normal saat layer Peta baru dibuka.
    // Masalah umum: peta dibuat saat layer masih display:none sehingga ukuran canvas terbaca 0.
    [80, 300, 700].forEach(function(delay){
      setTimeout(function(){
        if(typeof initMiderMap === 'function'){
          initMiderMap();
        }

        if(typeof reloadMapGeojson === 'function' && !window.geoJsonLayer){
          reloadMapGeojson();
        }

        if(typeof refreshMiderMapSize === 'function'){
          refreshMiderMapSize();
        }else if(window.map){
          window.map.invalidateSize();
        }
      }, delay);
    });
  }
}

function setKecamatanFilter(kecamatan){

selectedKecamatan = kecamatan;

render();

showLayer('dashboardLayer', false);

}
function resetKecamatanFilter(){

selectedKecamatan = null;

render();

}
document.addEventListener('DOMContentLoaded', function(){
  const toggle = document.getElementById('toggleSidebar');
  const sidebar = document.getElementById('sidebar');
  const mainContent = document.getElementById('mainContent');
  const overlay = document.getElementById('mobileOverlay');

  function refreshMapSize(){
    setTimeout(function(){
      if(window.map){
        window.map.invalidateSize();
      }
    }, 350);
  }

  if(toggle){
    toggle.addEventListener('click', function(){
      if(window.innerWidth <= 768){
        sidebar.classList.toggle('mobile-open');
        overlay.classList.toggle('active');
      }else{
        sidebar.classList.toggle('collapsed');
        mainContent.classList.toggle('fullscreen');
      }

      refreshMapSize();
    });
  }

  if(overlay){
    overlay.addEventListener('click', function(){
      sidebar.classList.remove('mobile-open');
      overlay.classList.remove('active');
      refreshMapSize();
    });
  }
});

function populateSidebarMenu(mode = 'dashboard'){
  const urusanBox = document.getElementById('sidebarUrusan');
  const kategoriBox = document.getElementById('sidebarKategori');
  const indikatorBox = document.getElementById('sidebarIndikator');

  if(!urusanBox || !kategoriBox || !indikatorBox) return;

  const rows = mode === 'map' ? (window.MAP_DATA || MAP_DATA || []) : DATA;

  /* Tampilkan filter Urusan hanya di layer Data */
  const urusanTitle = urusanBox.previousElementSibling;

  if(urusanTitle){
    urusanTitle.style.display = mode === 'map' ? 'none' : 'block';
  }

  urusanBox.style.display = mode === 'map' ? 'none' : 'block';

  if(!rows.length){
    urusanBox.innerHTML = '<small>Data belum tersedia</small>';
    kategoriBox.innerHTML = '<small>Data belum tersedia</small>';
    indikatorBox.innerHTML = '<small>Data belum tersedia</small>';
    return;
  }

  const activeUrusan = activeDashboardUrusan;
  const activeKategori = mode === 'map' ? activeMapKategori : activeDashboardKategori;
  const activeIndikator = mode === 'map' ? activeMapIndikator : activeDashboardIndikator;

  /*
    Sidebar mode cascade:
    - Data: Urusan -> Kategori -> Indikator
    - Peta: Wilayah -> Kategori -> Indikator
    Reset tidak memakai tombol, cukup klik menu utama Mider Data / Mider Peta.
  */
  let kategoriRows = [...rows];
  let indikatorRows = [...rows];

  if(mode === 'dashboard'){
    if(activeDashboardUrusan !== 'all'){
      kategoriRows = kategoriRows.filter(d => d.urusan === activeDashboardUrusan);
      indikatorRows = indikatorRows.filter(d => d.urusan === activeDashboardUrusan);
    }

    if(activeDashboardKategori !== 'all'){
      indikatorRows = indikatorRows.filter(d => d.kategori === activeDashboardKategori);
    }
  }

  if(mode === 'map'){
    if(activeMapLevel === 'kelurahan'){
      if(activeMapKecamatan !== 'all'){
        kategoriRows = kategoriRows.filter(d => String(d.kecamatan || '') === String(activeMapKecamatan));
        indikatorRows = indikatorRows.filter(d => String(d.kecamatan || '') === String(activeMapKecamatan));
      }

      if(activeMapKelurahan !== 'all'){
        kategoriRows = kategoriRows.filter(d => String(d.kelurahan || '') === String(activeMapKelurahan));
        indikatorRows = indikatorRows.filter(d => String(d.kelurahan || '') === String(activeMapKelurahan));
      }
    }

    if(activeMapKategori !== 'all'){
      indikatorRows = indikatorRows.filter(d => d.kategori === activeMapKategori);
    }
  }

  if(mode === 'dashboard'){
    urusanBox.innerHTML = [...new Set(rows.map(d => d.urusan).filter(Boolean))]
      .sort()
      .map(u => `
        <button class="${activeUrusan === u ? 'active-filter' : ''}"
          onclick="pilihUrusanSidebar('${u.replace(/'/g,"\\'")}', '${mode}')">
          ${u}
        </button>
      `)
      .join('');
  }else{
    urusanBox.innerHTML = '';
  }

  kategoriBox.innerHTML = [...new Set(kategoriRows.map(d => d.kategori).filter(Boolean))]
    .sort()
    .map(k => `
      <button class="${activeKategori === k ? 'active-filter' : ''}"
        onclick="pilihKategoriSidebar('${k.replace(/'/g,"\\'")}', '${mode}')">
        ${k}
      </button>
    `)
    .join('') || '<small>Tidak ada kategori sesuai filter.</small>';

  indikatorBox.innerHTML = [...new Set(indikatorRows.map(d => d.indikator).filter(Boolean))]
    .sort()
    .slice(0,40)
    .map(i => `
      <button class="${activeIndikator === i ? 'active-filter' : ''}"
        onclick="pilihIndikatorSidebar('${i.replace(/'/g,"\\'")}', '${mode}')">
        ${i}
      </button>
    `)
    .join('') || '<small>Tidak ada indikator sesuai filter.</small>';
}

function pilihUrusanSidebar(urusan, mode = 'dashboard'){

  /* Layer Peta tidak memakai filter Urusan */
  if(mode === 'map'){
    showLayer('mapLayer', false);
    return;
  }

  activeDashboardUrusan = urusan;
  activeDashboardKategori = 'all';
  activeDashboardIndikator = 'all';

  populateSidebarMenu('dashboard');

  const filter = document.getElementById('urusanFilter');

  if(filter){
    filter.value = urusan;
    updateKategori();
    kategoriFilter.value = 'all';
    searchFilter.value = '';
    render();
  }

  showLayer('dashboardLayer', false);
}

function pilihKategoriSidebar(kategori, mode = 'dashboard'){

  if(mode === 'map'){
    activeMapKategori = kategori;
    activeMapIndikator = 'all';

    populateSidebarMenu('map');

    const filter = document.getElementById('mapKategoriFilter');

    if(filter){
      filter.value = kategori;
    }

    if(typeof updateMapIndikatorFilter === 'function'){
      updateMapIndikatorFilter();
    }

    const indikatorFilter = document.getElementById('mapIndikatorFilter');

    if(indikatorFilter){
      indikatorFilter.value = 'all';
    }

    if(typeof refreshMapPopup === 'function'){
      refreshMapPopup();
    }

    showLayer('mapLayer', false);
    return;
  }

  activeDashboardKategori = kategori;
  activeDashboardIndikator = 'all';

  populateSidebarMenu('dashboard');

  const filter = document.getElementById('kategoriFilter');

  if(filter){
    filter.value = kategori;
    searchFilter.value = '';
    render();
  }

  showLayer('dashboardLayer', false);
}

function pilihIndikatorSidebar(indikator, mode = 'dashboard'){

  if(mode === 'map'){
    activeMapIndikator = indikator;

    populateSidebarMenu('map');

    const filter = document.getElementById('mapIndikatorFilter');

    if(filter){
      filter.value = indikator;
    }

    if(typeof refreshMapPopup === 'function'){
      refreshMapPopup();
    }

    showLayer('mapLayer', false);
    return;
  }

  activeDashboardIndikator = indikator;

  populateSidebarMenu('dashboard');

  const search = document.getElementById('searchFilter');

  if(search){
    search.value = indikator;
    render();
  }

  showLayer('dashboardLayer', false);
}

/* MOBILE SCROLL OPTIMIZED
   Pull-to-refresh dan scroll chaining ditangani lewat CSS overscroll-behavior.
   Tidak memakai touchmove preventDefault global agar scroll sidebar/konten/peta tetap responsif.
*/

/* AUTO REFRESH DIHILANGKAN
   Data hanya diperbarui saat halaman dibuka ulang atau tombol Refresh Data ditekan.
*/



// ==== END MIDER 2.0 THEME FIX: legacy light-mode removed, spreadsheet theme active ====


// =====================================================
// MIDER 2.0 - STELLAR NUSA HIJAU THEME HARDENING
// =====================================================
(function(){
  function ensureStellarFallbackStyle(){
    if(document.getElementById('mider-stellar-fallback-theme')) return;

    const style = document.createElement('style');
    style.id = 'mider-stellar-fallback-theme';
    style.textContent = `
      :root,[data-theme="dark"]{
        --bg:#0F111A;
        --surface:#181824;
        --panel:#1C1D2B;
        --panel2:#242638;
        --text:#F8FAFC;
        --muted:#CBD5E1;
        --line:#334155;
        --blue:#38CE3C;
        --blue2:#2EB532;
        --green:#38CE3C;
        --red:#FF4D6B;
        --orange:#FFDE73;
        --purple:#8E32E9;
        --teal:#14B8A6;
        --shadow:0 18px 42px rgba(0,0,0,.34);
        --softShadow:0 10px 28px rgba(0,0,0,.24);
      }
      [data-theme="light"]{
        --bg:#F5F7FA;
        --surface:#FFFFFF;
        --panel:#FFFFFF;
        --panel2:#F8FAFC;
        --text:#1F2937;
        --muted:#64748B;
        --line:#E2E8F0;
        --blue:#38CE3C;
        --blue2:#2EB532;
        --green:#38CE3C;
        --red:#FF4D6B;
        --orange:#FFDE73;
        --purple:#8E32E9;
        --teal:#14B8A6;
        --shadow:0 14px 34px rgba(15,17,26,.12);
        --softShadow:0 8px 22px rgba(15,17,26,.09);
      }
    `;
    document.head.appendChild(style);
  }

  document.addEventListener('DOMContentLoaded', ensureStellarFallbackStyle);
  document.addEventListener('mider-theme-updated', function(){
    if(typeof renderDynamicMapLegend === 'function'){
      renderDynamicMapLegend();
    }
  });
})();
