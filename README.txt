Struktur dashboard DKP3 hasil pemisahan file

1. index.html  : struktur tampilan halaman
2. style.css   : seluruh style/tampilan
3. app.js      : seluruh logika dashboard dan grafik
4. data.json   : data indikator dashboard

Cara pakai:
- Upload semua file ini dalam satu folder ke hosting.
- Untuk update data manual, edit data.json saja.
- Untuk tahap berikutnya, data.json bisa diganti sumbernya dari Google Sheets/API.

Catatan:
- Chart.js masih memakai CDN online. Cocok untuk sistem online.
- Bila ingin full offline, download chart.js dan ubah script di index.html dari CDN menjadi chart.js lokal.
