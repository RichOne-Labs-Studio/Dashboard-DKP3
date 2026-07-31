AUDIT & PERBAIKAN MIDER MOBILE FINAL

File yang diperbaiki:
1. index.html
   - Meta viewport sudah memakai viewport-fit=cover.
   - Script Theme Bridge inline dihapus agar tidak bentrok dengan app.js.

2. style.css
   - Ditambahkan patch mobile safe area agar header turun di bawah status bar/notch HP.
   - Ditambahkan jarak antara filter peta dan frame peta.
   - Card/frame peta diberi padding, overflow hidden, dan radius agar Leaflet rapi.
   - Tinggi peta mobile distabilkan.

3. app.js
   - Theme API diperbaiki agar membaca theme.dark dan theme.light.
   - Tetap kompatibel dengan data tema lama berupa array dari sheet.
   - Fungsi refresh ukuran peta diperkuat dengan invalidateSize beberapa kali saat layer peta dibuka.

Catatan:
- Setelah mengganti file, refresh browser dengan clear cache.
- Untuk versi PWA atau WebView Android, viewport-fit=cover + CSS safe-area akan menjaga header tidak tertimpa status bar.


=====================================================
UPDATE: DUKUNGAN DATA TAHUNAN & TRIWULANAN + DATA 2026
=====================================================

1. Kolom baru di sheet "data_kpi": TRIWULAN
   - Kosong / "Tahunan" -> data tahunan (perilaku lama, 100% kompatibel).
   - "1", "2", "3", "4" (atau "TW1".."TW4", "Q1".."Q4") -> data triwulan ke berapa.
   - Kolom ini opsional: baris tanpa kolom ini otomatis dianggap tahunan.

2. Filter baru: "Triwulan"
   - Muncul otomatis di panel filter dashboard HANYA jika data yang sedang
     ditampilkan (sesuai filter Tahun/Urusan/Kategori/Cari) memang mengandung
     data triwulanan. Kalau tidak ada, filter ini tetap tersembunyi.
   - Memilih triwulan tertentu tidak menyembunyikan indikator tahunan --
     indikator tahunan tetap tampil apa adanya karena nilainya memang berlaku
     untuk satu tahun penuh.

3. KPI, grafik, dan tabel matriks
   - KPI & tabel menampilkan label "Periode" (mis. "2026 - TW2") menggantikan
     "Tahun" agar triwulan terlihat jelas, plus badge kecil "Triwulan X" / "Tahunan".
   - Tren otomatis berlabel "QoQ" saat membandingkan triwulan-ke-triwulan pada
     tahun yang sama, atau "YoY" untuk perbandingan tahunan seperti biasa.
   - Saat sebuah indikator BARU PERTAMA KALI dipecah per triwulan (mis. dulu
     tahunan, mulai 2026 jadi triwulanan), badge tren akan menampilkan
     "Periode baru: belum ada pembanding triwulan yang setara" alih-alih
     angka persentase yang menyesatkan (karena membandingkan total setahun
     dengan satu triwulan itu tidak apple-to-apple).
   - Grafik gabungan (Grafik Seluruh Indikator, ranking bar chart) tetap
     memakai sumbu per tahun; nilai indikator triwulanan pada tahun tsb
     memakai triwulan TERBARU yang tersedia (atau triwulan spesifik yang
     dipilih lewat filter Triwulan).

4. Sumber data sekarang benar-benar memakai spreadsheet asli
   - data.json di paket ini BUKAN lagi contoh acak, melainkan hasil ekspor
     langsung dari "Data_Dashboard_DKP3.xlsx" (sheet data_kpi, data_peta,
     data_peta_kelurahan, config, data_legenda, data_warna_tema), lengkap
     dengan tambahan data 2026.
   - app.js sekarang punya fallback baru: kalau Google Sheets API/Apps Script
     tidak terjangkau (fetch gagal DAN JSONP gagal), dashboard otomatis
     memuat data.json lokal ini sebagai cadangan supaya dashboard tetap
     tampil dengan data nyata, bukan layar kosong/error. Saat Apps Script
     bisa diakses, data live Google Sheets tetap yang diutamakan seperti biasa.
   - normalizeDashboardData() diperkuat untuk data asli dari spreadsheet:
     nilai "#N/A" (hasil formula kosong di Sheets) kini dibaca sebagai data
     kosong, bukan NaN; dan teks Chart seperti "Stacked Area" dinormalisasi
     otomatis (huruf kecil + underscore) supaya konsisten.

5. Data 2026 & indikator yang dijadikan triwulanan (contoh/starter)
   - Kode berikut ditandai triwulanan untuk 2026 (TW1 & TW2 sudah terisi,
     mengikuti bahwa saat ini baru pertengahan tahun):
     __13 Pelaku Usaha Miliki Nomor Register PSAT
     __14 Jumlah Nomor Register PSAT
     __18 Produksi Perikanan Tangkap
     __19 Produksi Perikanan Budidaya
     __35 Produksi Tanaman Pangan
     __36 Produksi Hortikultura
     __47 Kasus Penyakit Hewan Menular
   - 41 indikator lainnya tetap tahunan untuk 2026.
   - Nilai 2026 dihitung otomatis dari tren 2021-2025 (proyeksi + sedikit
     variasi) -- ini DATA CONTOH agar fitur bisa langsung dites. Silakan
     ganti dengan angka riil begitu tersedia, cukup timpa kolom Nilai
     (dan Triwulan bila perlu) di baris terkait pada sheet data_kpi.

Cara pakai untuk update ke Google Sheets asli:
   1. Buka Data_Dashboard_DKP3.xlsx yang sudah diperbarui (terlampir).
   2. Salin/ekspor isi sheet "data_kpi" (termasuk kolom Triwulan yang baru
      dan baris-baris tahun 2026) ke Google Sheets produksi Anda.
   3. Dashboard akan otomatis membaca kolom Triwulan tersebut lewat Apps
      Script yang sudah ada -- tidak perlu perubahan pada Apps Script,
      selama nama kolom "Triwulan" ikut terbawa ke JSON yang dikirim.
