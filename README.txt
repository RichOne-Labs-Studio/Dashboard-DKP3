MIDER 2.0 - FULL SPREADSHEET THEME CONTROL

File yang diganti:
- index.html
- style.css
- app.js
- map.js

Tambahan:
- data_warna_tema_template.csv untuk ditempel ke sheet data_warna_tema.

Tujuan:
- Seluruh warna tampilan dashboard dikendalikan dari Spreadsheet.
- Sidebar mengikuti gaya Stellar: navy gelap, teks abu, highlight hijau tipis, garis kiri aktif.
- Warna polygon Kerawanan Pangan tetap mengikuti data_peta_kelurahan, tidak diubah oleh tema.

Cara pakai:
1. Backup 4 file lama.
2. Replace 4 file dari ZIP ini ke GitHub Pages.
3. Copy isi data_warna_tema_template.csv ke sheet data_warna_tema.
4. Commit/push.
5. Buka dashboard dan tekan Ctrl + Shift + R.

Jika masih tampil warna lama, jalankan Console:
localStorage.removeItem('mider-theme');
localStorage.removeItem('miderTheme');
localStorage.removeItem('miderDashboardCacheV1');
location.reload();
