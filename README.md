# Luvv — Satu Tahun, Tetap Kamu

Scrapbook anniversary pertama Hendi, 22 November 2026. Berisi 20 bab kenangan, 41 foto pilihan yang mengutamakan kebersamaan Hendi dan Dinda, galeri foto, surat, dan pemutar lagu Kita usahakan rumah itu oleh Sal Priadi.

## Menjalankan di komputer

Buka folder ini lewat server statis agar modul JavaScript dapat dimuat.

```bash
python3 -m http.server 8000
```

Kemudian buka http://localhost:8000.

## GitHub Pages

Di Settings → Pages, pilih Deploy from a branch, branch main dan folder /(root), lalu Save. Berkas .nojekyll membuat GitHub menyajikan situs statis ini langsung.

## Mengubah isi

- index.html memuat sampul dan surat.
- data.js memuat tanggal, judul, keterangan, dan pilihan foto.
- style.css mengatur tampilan scrapbook.
- music.mjs mengatur pemutaran lagu.
- assets/ berisi foto, font, ilustrasi, dan audio.

Lagu dimulai saat album dibuka atau dari usapan pertama jika browser mengizinkan. Jika browser meminta interaksi tambahan, ketuk pesan Ketuk untuk memutar lagu. Tombol musik di atas dapat menjeda dan melanjutkan lagu.

## Pemeriksaan

Dengan Node.js terpasang, jalankan perintah berikut.

```bash
node --test tests/*.test.mjs
node scripts/verify.mjs
```
