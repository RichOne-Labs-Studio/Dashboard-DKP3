MIDER 2.0 FASE 3 UPDATE

File yang diubah:
1. style.css - tema Nusa Hijau/Nusa Malam, footer dinamis, legenda peta.
2. index.html - container legenda peta dan footer dinamis.
3. app.js - membaca config/tema/legenda/generated_at dari Apps Script, switch tema icon-only, footer, auto refresh.
4. map.js - legenda Kerawanan Pangan dinamis dari data_legenda.

Catatan penting:
- Fungsi getRowColor() dan shouldUseSpreadsheetMapColor() tidak diubah.
- Warna polygon Kerawanan Pangan level kelurahan tetap mengikuti kolom warna spreadsheet.
- Apps Script disarankan tetap mengirim maintenance di root dan config.maintenance untuk kompatibilitas.
