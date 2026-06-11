MIDER 2.0 - APP THEME FIX

Perbaikan:
1. Menghapus sistem tema lama berbasis body.light-mode.
2. Mengaktifkan sistem tema baru berbasis documentElement data-theme.
3. Tema dari sheet data_warna_tema sekarang diterapkan ulang saat data API masuk.
4. Saat tombol tema diklik, CSS variable dari spreadsheet diterapkan ulang.
5. Menghapus localStorage lama 'miderTheme' agar tidak bentrok dengan 'mider-theme'.

Cara pakai:
1. Extract ZIP ini.
2. Ganti app.js lama dengan app.js baru.
3. Upload/commit ke GitHub Pages.
4. Buka dashboard dan tekan Ctrl + Shift + R.
5. Jika masih memakai cache lama, jalankan di Console:
   localStorage.removeItem('miderTheme');
   localStorage.removeItem('mider-theme');
   localStorage.removeItem('miderDashboardCacheV1');
   location.reload();
