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
