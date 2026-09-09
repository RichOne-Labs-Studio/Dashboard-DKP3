============================================================
MIDER DKP3 KOTA CIREBON - PERBAIKAN PETA (API KEY WATERMARK)
============================================================

File yang diperbaiki untuk menghilangkan tulisan 'API KEY Required':

1. map.js
   - Mengganti basemap raster CARTO (yang kini memerlukan API key)
     dengan Esri World Dark Gray Canvas resmi yang bebas watermark,
     cepat, dan tidak memerlukan API key.
   - Menambahkan kontrol pilihan layer (Peta Gelap, Citra Satelit, OpenStreetMap).
   - Menambahkan fallback otomatis jika 'carto_api_key' diisi di data.json.

2. style.css
   - Menambahkan styling responsif untuk kontrol switcher layer basemap
     Leaflet (.leaflet-control-layers) agar menyatu sempurna dengan tema
     High-Tech GIS Command Center.

3. data.json
   - Menambahkan field opsi 'carto_api_key': '' pada objek 'config'.

CARA MENGGUNAKAN:
Cukup salin (overwrite) file-file di atas ke dalam folder proyek Anda di GitHub / server lokal.
