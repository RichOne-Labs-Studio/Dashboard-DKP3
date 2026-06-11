MIDER 2.0 - STELLAR NUSA HIJAU

Isi ZIP:
- index.html
- style.css
- app.js
- map.js

Perubahan utama:
1. Tema dashboard mengikuti komposisi Stellar Nusa Hijau:
   dark navy, green accent, purple, yellow, red/pink, teal.
2. Tetap mendukung data_warna_tema dari spreadsheet.
3. Default theme diatur dark.
4. Cache awal dimatikan agar perubahan spreadsheet lebih cepat terlihat.
5. Chart color diganti sesuai palet Stellar Nusa Hijau.
6. Popup/legenda peta dibuat lebih konsisten dengan tema.
7. Logika warna Kerawanan Pangan TIDAK diubah:
   polygon tetap membaca warna dari data spreadsheet.

Cara pakai:
1. Backup 4 file lama.
2. Extract ZIP ini.
3. Replace file di repository GitHub Pages:
   index.html, style.css, app.js, map.js
4. Commit/push ke GitHub.
5. Buka dashboard dan tekan Ctrl + Shift + R.
6. Jika masih melihat tema lama, jalankan Console:
   localStorage.removeItem('mider-theme');
   localStorage.removeItem('miderTheme');
   localStorage.removeItem('miderDashboardCacheV1');
   location.reload();

Variabel spreadsheet yang didukung pada sheet data_warna_tema:
bg, surface, panel, panel2, text, muted, line,
primary, primary2, success, warning, danger, purple, teal.
