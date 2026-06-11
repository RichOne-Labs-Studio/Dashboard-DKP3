AUDIT APP.JS MIDER 2.0

Status file awal:
- File sudah mengambil API Google Sheets.
- File sudah membaca config, legenda, tema mentah, KPI, peta kecamatan, dan peta kelurahan.
- Namun pembacaan tema masih dominan memakai rawData.tema, belum optimal memakai API baru rawData.theme / rawData.warna_tema.
- Masih ada blok hardcode STELLAR NUSA HIJAU THEME HARDENING yang bisa menimpa warna dari spreadsheet.

Perbaikan yang dilakukan:
1. Menambahkan dukungan API baru:
   - rawData.theme
   - rawData.warna_tema
   - theme.dark
   - theme.light

2. Menambahkan variabel global:
   - MIDER_THEME_OBJECT
   - window.MIDER_THEME_OBJECT
   - window.MIDER_RAW_DATA

3. Menambahkan fungsi:
   - applyMiderThemeObject(themeObject)
   - applyMiderThemeFromApi(rawData)

4. Mengubah startDashboard() agar:
   - menyimpan rawData terbaru
   - membaca theme.dark dan theme.light
   - tetap kompatibel dengan data lama rawData.tema

5. Mengubah tombol dark/light agar:
   - menerapkan ulang tema dari API baru
   - tidak hanya dari tabel tema mentah lama

6. Menghapus blok hardcode:
   - MIDER 2.0 - STELLAR NUSA HIJAU THEME HARDENING

7. Mengubah efek warna kartu/grafik agar:
   - memakai getMiderChartColors()
   - mengikuti variabel chart dari CSS/spreadsheet

Catatan pemakaian:
- Rename app_audit_theme_api.js menjadi app.js.
- Ganti file app.js lama di folder dashboard.
- Pastikan Apps Script sudah deploy ulang dan menghasilkan theme.dark serta theme.light.
- Pastikan style.css memakai variabel CSS dari spreadsheet.
