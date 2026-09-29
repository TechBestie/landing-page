# Tech Bestie

Situs 3D Tech Bestie: portofolio, estimasi harga, dan dashboard admin.
Tersedia dalam Bahasa Indonesia dan Inggris, dengan harga dalam IDR, USD, atau AUD.

## Menjalankan

Salin `admin.config.example.json` menjadi `admin.config.json` dan isi password sendiri. File itu tidak ikut ke git.

```bash
npm install
npm run dev
```

Buka http://localhost:5183. Dashboard admin ada di http://localhost:5183/admin.

Untuk produksi:

```bash
npm run build
npm start
```

## Dashboard admin

| Tab | Isi |
| --- | --- |
| Slide | Judul, klien, kategori, deskripsi, dan gambar tiap slide |
| Fitur & harga | Pertanyaan, opsi, harga, dan pengali di estimasi harga |
| Pengaturan | Nomor WhatsApp, rentang estimasi, dan kurs |
| Leads | Kontak yang masuk dari form estimasi |

Username dan password ada di `admin.config.json`. Ubah file itu lalu jalankan ulang server.

## Cara harga dihitung

Setiap opsi punya `price` (ditambahkan, dalam rupiah) atau `mult` (pengali).
Total = jumlah semua `price` × semua `mult`, lalu ditampilkan sebagai rentang ± persentase di Pengaturan.
Harga disimpan dalam rupiah dan dikonversi saat ditampilkan.

Kurs otomatis diambil dari api.frankfurter.dev, dengan open.er-api.com sebagai cadangan, dan disimpan 6 jam.
Kalau keduanya tidak bisa diakses, kurs manual di Pengaturan yang dipakai.

## Isi folder

| Path | Isi |
| --- | --- |
| `server.js` | Server dan API |
| `admin.config.json` | Username dan password admin |
| `web/` | Kode situs |
| `web/src/pricing-default.js` | Pertanyaan dan harga bawaan |
| `web/src/i18n.js` | Teks situs dalam dua bahasa |
| `web/src/data.js` | Slide bawaan dan kategori |
| `data/content.json` | Slide, harga, dan pengaturan yang disimpan dari dashboard |
| `data/leads.json` | Leads yang masuk |
| `data/uploads/` | Gambar yang diunggah |
| `index.html` | File estimator asli, sumber isi wizard. Tidak dipakai situs |
