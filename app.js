const DASH_CHART_COLORS = [
  '#0B6FEA', '#10B981', '#F97316', '#7C3AED', '#0EA5A4', '#EC4899',
  '#F59E0B', '#2563EB', '#14B8A6', '#9333EA', '#EF4444', '#22C55E',
  '#06B6D4', '#D946EF', '#84CC16', '#FB7185'
];

Chart.defaults.color = '#334155';
Chart.defaults.font.family = 'Inter, Segoe UI, Poppins, Arial, sans-serif';
Chart.defaults.borderColor = 'rgba(148,163,184,.22)';

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

let DATA = [];
let MAP_DATA = [];
let mainChart, barChart; let miniCharts=[];
let years = [];
let selectedKecamatan = null;
const fmt=(v)=> v==null?'N/A':Number(v).toLocaleString('id-ID',{maximumFractionDigits:2});
const pct=(a,b)=> (a==null||b==null||b===0)?null:((a-b)/Math.abs(b)*100);
function populateFilters(){
 const y=document.getElementById('yearFilter'), u=document.getElementById('urusanFilter'), k=document.getElementById('kategoriFilter');
 y.innerHTML='<option value="all">Semua Tahun</option>'+years.map(x=>`<option>${x}</option>`).join('');
 u.innerHTML='<option value="all">Semua Urusan</option>'+[...new Set(DATA.map(d=>d.urusan))].sort().map(x=>`<option>${x}</option>`).join('');
 updateKategori();
 ['yearFilter','urusanFilter','kategoriFilter','searchFilter'].forEach(id=>document.getElementById(id).addEventListener(id==='urusanFilter'?'change':'input',()=>{ if(id==='urusanFilter') updateKategori(); render();}));
 document.getElementById('yearFilter').addEventListener('change',render); document.getElementById('kategoriFilter').addEventListener('change',render);
}
function updateKategori(){ const u=document.getElementById('urusanFilter').value; let rows=DATA.filter(d=>u==='all'||d.urusan===u); let cats=[...new Set(rows.map(d=>d.kategori))].sort(); document.getElementById('kategoriFilter').innerHTML='<option value="all">Semua Kategori</option>'+cats.map(x=>`<option>${x}</option>`).join('');}
function filteredBase(){
const y=yearFilter.value;
const u=urusanFilter.value;
const k=kategoriFilter.value;
const s=searchFilter.value.toLowerCase();

return DATA.filter(d=>
(y==='all'||String(d.tahun)===String(y)) &&
(u==='all'||d.urusan===u) &&
(k==='all'||d.kategori===k) &&
(!s||String(d.indikator||'').toLowerCase().includes(s)) &&
(!selectedKecamatan || String(d.kecamatan||'').toLowerCase()===String(selectedKecamatan).toLowerCase())
);
}
function latestForIndicator(rows, ind){ const yr=yearFilter.value; let r=rows.filter(d=>d.indikator===ind.indikator && d.urusan===ind.urusan && d.kategori===ind.kategori && d.kode===ind.kode && d.nilai!=null); if(yr!=='all') r=r.filter(d=>d.tahun==yr); r.sort((a,b)=>b.tahun-a.tahun); return r[0];}
function groupIndicators(rows){ const map=new Map(); rows.forEach(d=>{const key=[d.urusan,d.kategori,d.kode,d.indikator].join('|'); if(!map.has(key)) map.set(key,d);}); return [...map.values()];}
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
  const inds=groupIndicators(rows);
  const selectedYear=yearFilter.value;

  kpiGrid.innerHTML=inds.map(ind=>{
    const latest=latestForIndicator(rows,ind);
    const yoyYear=selectedYear==='all' ? latest?.tahun : selectedYear;
    const tr=trendOf(DATA,ind,yoyYear);
    const periode=tr.prev&&tr.last ? 'dibanding tahun sebelumnya' : '';

    return `<div class="card kpi"><h3>${ind.indikator}</h3><div class="value">${fmt(latest?.nilai)}</div><div class="meta">${ind.urusan} • ${ind.kategori} • ${ind.satuan||'-'}</div><div class="meta">Tahun: ${latest?.tahun||'-'} ${periode}</div><div class="trend ${tr.cls}">${tr.text}</div></div>`;
  }).join('') || '<div class="card kpi">Tidak ada data.</div>';
}
function makeDatasets(rows, inds){return inds.slice(0,12).map(ind=>({label:ind.indikator.substring(0,48), data:years.map(y=>{let r=rows.find(d=>d.tahun===y&&d.kode===ind.kode&&d.urusan===ind.urusan&&d.kategori===ind.kategori); return r?.nilai??null;}), fill: true, tension:.35, borderWidth:3}));}
function renderCharts(rows){
 if(mainChart) mainChart.destroy();
 if(barChart) barChart.destroy();
 mainChart = null;
 barChart = null;
 const inds=groupIndicators(rows);
 const mainCanvas=document.getElementById('mainChart');
 if(mainCanvas){
  mainChart=new Chart(mainCanvas,{type:'line',data:{labels:years,datasets:makeDatasets(rows,inds)},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom'}},scales:{x:{stacked:true},y:{stacked:true,beginAtZero:false}}}});
 }
 const barCanvas=document.getElementById('barChart');
 if(barCanvas){
  const selectedYear=yearFilter.value==='all'?Math.max(...years):Number(yearFilter.value);
  const vals=inds.map(ind=>({label:ind.indikator.substring(0,35),v:rows.find(d=>d.tahun===selectedYear&&d.kode===ind.kode&&d.urusan===ind.urusan&&d.kategori===ind.kategori)?.nilai??null})).filter(x=>x.v!=null).sort((a,b)=>b.v-a.v).slice(0,15);
  barChart=new Chart(barCanvas,{type:'bar',data:{labels:vals.map(x=>x.label),datasets:[{label:'Nilai '+selectedYear,data:vals.map(x=>x.v)}]},options:{indexAxis:'y',responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{beginAtZero:true}}}});
 }
 renderMiniCharts(rows,inds);
}
function renderMiniCharts(rows,inds){ miniCharts.forEach(c=>c.destroy()); miniCharts=[]; indicatorCharts.innerHTML=inds.map((ind,i)=>`<div class="card kpi smallChart"><h3>${ind.indikator}</h3><canvas id="mini${i}"></canvas><div class="meta">${ind.urusan} • ${ind.kategori}</div></div>`).join(''); inds.forEach((ind,i)=>{const vals=years.map(y=>rows.find(d=>d.tahun===y&&d.kode===ind.kode&&d.urusan===ind.urusan&&d.kategori===ind.kategori)?.nilai??null); const allowedCharts = ['line','bar','pie','doughnut','radar','polarArea'];const type = allowedCharts.includes(ind.chart)? ind.chart: 'line'; miniCharts.push(new Chart(document.getElementById('mini'+i),{type,data:{labels:years,datasets:[{label:ind.indikator,data:vals,fill:true,tension:.35,borderWidth:3}]},options:{responsive:true,maintainAspectRatio:false,interaction:{mode:'index',intersect:false},plugins:{legend:{display:false}},scales:{x:{stacked:true},y:{stacked:true,beginAtZero:false}}}}));});}
function renderInsights(rows){
  const inds=groupIndicators(rows);
  const selectedYear=yearFilter.value;

  let ranked=inds.map(ind=>{
    const latest=latestForIndicator(rows,ind);
    const yoyYear=selectedYear==='all' ? latest?.tahun : selectedYear;
    return {ind,tr:trendOf(DATA,ind,yoyYear)};
  }).filter(x=>x.tr.change!=null);

  let up=ranked.filter(x=>x.tr.change>0).sort((a,b)=>b.tr.change-a.tr.change).slice(0,3);
  let down=ranked.filter(x=>x.tr.change<0).sort((a,b)=>a.tr.change-b.tr.change).slice(0,3);

  insightList.innerHTML=[
    ...up.map(x=>`<li><b>${x.ind.indikator}</b> YoY naik ${Math.abs(x.tr.change).toFixed(2)}% dibanding tahun sebelumnya.</li>`),
    ...down.map(x=>`<li><b>${x.ind.indikator}</b> YoY turun ${Math.abs(x.tr.change).toFixed(2)}% dibanding tahun sebelumnya.</li>`),
    '<li><b>Keamanan pangan</b> pada pangan, ikan, dan hewan relatif tinggi, mayoritas berada sekitar 97%–100%.</li>',
    '<li><b>Food waste</b> meningkat konsisten sehingga perlu penguatan efisiensi distribusi dan pengurangan kehilangan pangan.</li>'
  ].join('');

  relationList.innerHTML=`<li><b>Ketersediaan pangan vs food waste:</b> ketersediaan naik tajam, tetapi food waste juga naik; produksi belum sepenuhnya diikuti efisiensi konsumsi/distribusi.</li><li><b>Luas lahan vs produktivitas:</b> luas lahan pertanian meningkat kembali pada 2025, sementara produktivitas juga naik; ini menunjukkan perbaikan kapasitas lahan dan intensifikasi pertanian.</li><li><b>Populasi ternak vs produksi daging:</b> keduanya meningkat, menunjukkan penguatan subsektor peternakan.</li><li><b>Produksi perikanan vs konsumsi ikan:</b> keduanya meningkat; pasar konsumsi lokal tampak menyerap peningkatan produksi.</li><li><b>Produksi naik vs PDRB turun:</b> pada perikanan dan pertanian, kontribusi PDRB menurun; nilai tambah ekonomi perlu diperkuat.</li>`;
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
function render(){ const rows=filteredBase(); const inds=groupIndicators(rows); const selectedYear=yearFilter.value; const trends=inds.map(ind=>{const latest=latestForIndicator(rows,ind); const yoyYear=selectedYear==='all'?latest?.tahun:selectedYear; return trendOf(DATA,ind,yoyYear);}); sumIndicators.textContent=inds.length; sumYears.textContent=[...new Set(rows.map(d=>d.tahun))].length; sumUp.textContent=trends.filter(t=>t.change>0).length; sumDown.textContent=trends.filter(t=>t.change<0).length; activeFilterLabel.textContent=`${yearFilter.value==='all'?'Semua Tahun':yearFilter.value} • ${urusanFilter.value==='all'?'Semua Urusan':urusanFilter.value} • ${kategoriFilter.value==='all'?'Semua Kategori':kategoriFilter.value}`; renderKPIs(rows); renderCharts(rows); renderInsights(rows); renderTable(rows);}
function resetFilters(){yearFilter.value='all';urusanFilter.value='all';updateKategori();kategoriFilter.value='all';searchFilter.value='';render();}
function downloadPDF(){window.print();}
const GOOGLE_SHEETS_API_URL = 'https://script.google.com/macros/s/AKfycbx1r0FE6IGDVPMHuwxFIq0G1-gM14zHfCwuICQEZ9j_10J53LByuHwPOF9Dhw4bdAW2/exec';

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

function startDashboard(rawData){

 const maintenanceStatus = String(rawData.maintenance || '').trim().toUpperCase();

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
MAP_DATA = rawData.peta || [];
window.MAP_DATA = MAP_DATA;

/* Paksa isi ulang filter peta setelah data peta siap */
setTimeout(function(){
  if (typeof populateMapFilters === 'function') {
    populateMapFilters();
  }
}, 500);

years = [...new Set(DATA.map(d=>d.tahun))].sort((a,b)=>a-b);

if(!DATA.length){
throw new Error('Data KPI kosong atau header spreadsheet tidak sesuai.');
}

populateFilters();
populateSidebarMenu('dashboard');
render();

}

async function loadDashboardDataFromFetch(){
  const response = await fetch(GOOGLE_SHEETS_API_URL + '?v=' + Date.now(), {cache: 'no-store'});
  if(!response.ok) throw new Error('Gagal memuat data API: HTTP ' + response.status);
  const rawData = await response.json();
  startDashboard(rawData);
}

function loadDashboardDataFromJsonp(){
  return new Promise((resolve, reject) => {
    const callbackName = '__dkp3DashboardCallback_' + Date.now();

    window[callbackName] = function(rawData){
      try{
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

async function loadDashboardData(){
  try{
    await loadDashboardDataFromFetch();
  }catch(fetchError){
    console.warn('Fetch API gagal, mencoba mode JSONP:', fetchError);

    try{
      await loadDashboardDataFromJsonp();
    }catch(jsonpError){
      console.error(jsonpError);

      try{
        const fallback = await fetch('https://script.google.com/macros/s/AKfycbzTAUfaqWFxiERhswBOrpv2luomgYtGSju1hu8MRIVcZ2c142XWUtxgTjacm0lYKNPbKw/exec', {cache: 'no-store'});
        if(!fallback.ok) throw new Error('Fallback data.json juga gagal');
        const rawData = await fallback.json();
        startDashboard(rawData);

        document.body.insertAdjacentHTML(
          'afterbegin',
          `<div style="padding:10px 16px;background:#fef3c7;color:#92400e;font-weight:700">
            Data Google Sheets belum bisa dimuat, dashboard sementara memakai data.json lokal.
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
  }
}
loadDashboardData();


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

// jalankan setelah render dan setelah filter berubah
setInterval(applySmartKpiIcons, 900);
setTimeout(applySmartKpiIcons, 300);
setTimeout(applySmartKpiIcons, 1000);

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

function showLayer(layerId){

  document.getElementById('dashboardLayer').style.display = 'none';
  document.getElementById('mapLayer').style.display = 'none';
  document.getElementById(layerId).style.display = 'block';

  document.querySelectorAll('.sidebar-menu').forEach(btn=>{
    btn.classList.remove('active');
  });

  if(layerId === 'dashboardLayer'){
    document.querySelector('.sidebar-menu:nth-of-type(1)').classList.add('active');
    populateSidebarMenu('dashboard');
  }

  if(layerId === 'mapLayer'){
    document.querySelector('.sidebar-menu:nth-of-type(2)').classList.add('active');
    populateSidebarMenu('map');

    setTimeout(function(){
      if(window.map){
        window.map.invalidateSize();
      }
    },300);
  }
}

function setKecamatanFilter(kecamatan){

selectedKecamatan = kecamatan;

render();

showLayer('dashboardLayer');

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
  const mapTahunBox = document.getElementById('sidebarMapTahun');

  if(!urusanBox || !kategoriBox || !indikatorBox) return;

  const rows = mode === 'map' ? (window.MAP_DATA || MAP_DATA || []) : DATA;

  if(mapTahunBox){

    mapTahunBox.style.display = mode === 'map' ? 'block' : 'none';

    mapTahunBox.previousElementSibling.style.display =
      mode === 'map' ? 'block' : 'none';
}

  if(!rows.length){
    urusanBox.innerHTML = '<small>Data belum tersedia</small>';
    kategoriBox.innerHTML = '<small>Data belum tersedia</small>';
    indikatorBox.innerHTML = '<small>Data belum tersedia</small>';
    return;
  }

if(mode === 'map' && mapTahunBox){

  mapTahunBox.innerHTML =
    [...new Set(rows.map(d => d.tahun).filter(Boolean))]
    .sort((a,b)=>a-b)
    .map(t => `
      <button onclick="pilihTahunPetaSidebar('${t}')">
        ${t}
      </button>
    `)
    .join('');
}

  urusanBox.innerHTML = [...new Set(rows.map(d => d.urusan).filter(Boolean))]
    .sort()
    .map(u => `<button onclick="pilihUrusanSidebar('${u.replace(/'/g, "\\'")}', '${mode}')">${u}</button>`)
    .join('');

  kategoriBox.innerHTML = [...new Set(rows.map(d => d.kategori).filter(Boolean))]
    .sort()
    .map(k => `<button onclick="pilihKategoriSidebar('${k.replace(/'/g, "\\'")}', '${mode}')">${k}</button>`)
    .join('');

  indikatorBox.innerHTML = [...new Set(rows.map(d => d.indikator).filter(Boolean))]
    .sort()
    .slice(0, 40)
    .map(i => `<button onclick="pilihIndikatorSidebar('${i.replace(/'/g, "\\'")}', '${mode}')">${i}</button>`)
    .join('');
}

function pilihUrusanSidebar(urusan, mode = 'dashboard'){
  if(mode === 'map'){
    showLayer('mapLayer');
    return;
  }

  const filter = document.getElementById('urusanFilter');

  if(filter){
    filter.value = urusan;
    updateKategori();
    render();
  }

  showLayer('dashboardLayer');
}

function pilihKategoriSidebar(kategori, mode = 'dashboard'){
  if(mode === 'map'){
    const filter = document.getElementById('mapKategoriFilter');

    if(filter){
      filter.value = kategori;

      if(typeof updateMapIndikatorFilter === 'function'){
        updateMapIndikatorFilter();
      }

if(typeof renderMapData === 'function'){
  renderMapData();
}

      if(typeof refreshMapPopup === 'function'){
        refreshMapPopup();
      }
    }

    showLayer('mapLayer');
    return;
  }

  const filter = document.getElementById('kategoriFilter');

  if(filter){
    filter.value = kategori;
    render();
  }

  showLayer('dashboardLayer');
}

function pilihIndikatorSidebar(indikator, mode = 'dashboard'){

  if(mode === 'map'){
    const filter = document.getElementById('mapIndikatorFilter');

    if(filter){
      filter.value = indikator;

    if(typeof renderMapData === 'function'){
  renderMapData();
}

      if(typeof refreshMapPopup === 'function'){
        refreshMapPopup();
      }
    }

    showLayer('mapLayer');
    return;
  }

  const search = document.getElementById('searchFilter');

  if(search){
    search.value = indikator;
    render();
  }

  showLayer('dashboardLayer');
}

function pilihTahunPetaSidebar(tahun){
  const filter = document.getElementById('mapYearFilter');

  if(filter){
    filter.value = tahun;

    if(typeof renderMapData === 'function'){
      renderMapData();
    }

    if(typeof refreshMapPopup === 'function'){
      refreshMapPopup();
    }
  }

  showLayer('mapLayer');
}
/* DISABLE MOBILE PULL TO REFRESH */

(function(){

  let touchStartY = 0;

  document.addEventListener('touchstart', function(e){

    touchStartY = e.touches[0].clientY;

  }, { passive:true });

  document.addEventListener('touchmove', function(e){

    const touchY = e.touches[0].clientY;
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;

    /* jika di paling atas dan swipe ke bawah */
    if(scrollTop <= 0 && touchY > touchStartY){

      e.preventDefault();

    }

  }, { passive:false });

})();

/* AUTO REFRESH DASHBOARD */

let autoRefreshTimer = null;

function startAutoRefresh(){

  /* 5 menit */
  const interval = 300000;

  autoRefreshTimer = setInterval(async ()=>{

    try{

      const status = document.getElementById('autoRefreshStatus');

      if(status){
        status.innerHTML = '⟳ Sinkronisasi data...';
      }

      await loadDashboardData();

      if(status){

        const now = new Date();

        status.innerHTML =
          '✓ Update ' +
          now.toLocaleTimeString('id-ID',{
            hour:'2-digit',
            minute:'2-digit'
          });
      }

    }catch(error){

      console.error('Auto refresh gagal:', error);

      const status = document.getElementById('autoRefreshStatus');

      if(status){
        status.innerHTML = '⚠ Gagal sinkronisasi';
      }

    }

  }, interval);
}

/* jalankan auto refresh */
startAutoRefresh();