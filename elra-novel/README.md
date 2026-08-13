# Web Baca Novel — Elra.Corp

Situs untuk mempublikasikan bab novel. Begitu kamu simpan bab baru lewat halaman
**Kelola** di satu perangkat, semua perangkat lain (HP, laptop, siapa pun yang buka
linknya) langsung melihat versi terbaru — karena datanya disimpan di server
(Netlify Blobs), bukan di `localStorage` browser.

Ini beda dari web-web sebelumnya yang single-file HTML + localStorage, karena
kamu minta datanya tersinkron antar perangkat — itu butuh tempat penyimpanan
di server, jadi ada satu file "fungsi" kecil (`netlify/functions/novel.js`)
yang jalan di Netlify.

## Struktur folder

```
elra-novel/
├── netlify.toml              ← konfigurasi build & fungsi
├── package.json               ← dependency (@netlify/blobs)
├── netlify/functions/novel.js ← "backend" kecil: baca & simpan data novel
└── public/
    ├── index.html              ← halaman baca (beranda + daftar isi + baca bab)
    ├── admin.html               ← halaman kelola (dikunci kata sandi)
    ├── style.css
    ├── format.js                ← fungsi bantu yang dipakai bersama
    ├── reader.js
    └── admin.js
```

## Kata sandi

Kata sandi untuk halaman **Kelola** sudah diset ke `aihcna123`.

Untuk menggantinya: buka `netlify/functions/novel.js`, ubah baris

```js
const ADMIN_PASSWORD = "aihcna123";
```

lalu deploy ulang. Kata sandi ini dicek di server, jadi cukup aman —
orang lain nggak bisa menerbitkan perubahan meski mereka menemukan halaman
`admin.html`, karena `admin.html` cuma bisa **membaca** data tanpa kata sandi,
sedangkan **menyimpan** selalu dicek di server.

## Cara deploy ke Netlify (disarankan: lewat GitHub)

Karena situs ini punya bagian fungsi server, cara paling gampang & paling
stabil adalah lewat GitHub, supaya Netlify yang otomatis menginstal
dependency dan membangun fungsinya setiap kali kamu push perubahan.

1. Buat repository baru di GitHub, lalu upload folder ini ke sana:
   ```
   cd elra-novel
   git init
   git add .
   git commit -m "Situs baca novel pertama"
   git branch -M main
   git remote add origin https://github.com/USERNAME/NAMA-REPO.git
   git push -u origin main
   ```
2. Buka [app.netlify.com](https://app.netlify.com) → **Add new site** →
   **Import an existing project** → pilih repo GitHub tadi.
3. Netlify akan otomatis mendeteksi pengaturan dari `netlify.toml`
   (publish directory `public`, functions `netlify/functions`) — biarkan
   apa adanya, lalu klik **Deploy**.
4. Setelah selesai, kamu akan dapat URL seperti `https://nama-acak.netlify.app`.
   Buka `/admin.html` di URL itu untuk mulai menambah bab pertamamu.

Setelah ini, setiap kamu `git push` perubahan (misalnya kalau suatu saat
mau mengubah desain), situsnya otomatis ter-update.

## Alternatif: deploy langsung dari laptop (tanpa GitHub)

Kalau belum mau pakai GitHub, kamu bisa pakai Netlify CLI:

```bash
npm install                       # pasang dependency @netlify/blobs
npm install -g netlify-cli        # sekali saja, alat baris perintah Netlify
netlify login
netlify init                      # ikuti langkah untuk membuat/menghubungkan site
netlify deploy --prod             # deploy ke alamat production
```

`netlify deploy --prod` akan membaca `netlify.toml`, membundel fungsi di
`netlify/functions/`, dan mempublikasikan folder `public/`.

## Coba dulu di komputer sendiri (opsional)

```bash
npm install
npm install -g netlify-cli
netlify dev
```

Ini menjalankan situs lengkap dengan fungsi & Netlify Blobs versi lokal di
`http://localhost:8888`. Membuka `public/index.html` langsung dari File
Explorer/Finder **tidak akan berfungsi**, karena halaman baca butuh
mengambil data dari `/api/novel` yang hanya tersedia lewat `netlify dev`
atau situs yang sudah di-deploy.

## Cara pakai halaman Kelola

1. Buka `/admin.html`, masukkan kata sandi.
2. Isi **Judul**, **Penulis**, dan **Sinopsis** di panel Info Novel.
3. Klik **+ Tambah Bab** untuk menulis bab baru. Aturan penulisan sederhana:
   - Baris kosong di antara paragraf = paragraf baru
   - `**tebal**` dan `*miring*` untuk penekanan
   - Baris berisi `---` sendirian = pembatas adegan (✦ ✦ ✦)
4. Urutan bab bisa diatur pakai tombol ▲▼ di daftar bab.
5. Klik **Simpan & Terbitkan** untuk mengirim semua perubahan ke server —
   setelah ini, siapa pun yang membuka situsnya (di perangkat mana pun)
   akan langsung melihat versi terbaru saat mereka membuka atau
   menyegarkan halaman.
6. Tombol **Kunci** di pojok kanan atas keluar dari mode kelola di
   perangkat itu.

## Kenapa bukan single-file HTML seperti biasanya?

Pola biasa (satu file HTML + `localStorage`) sengaja dihindari di sini
karena `localStorage` hanya tersimpan di satu browser di satu perangkat —
tidak bisa "terlihat" dari perangkat lain. Karena kamu butuh update di satu
device muncul di device lain, datanya harus disimpan di satu tempat pusat
(di sini: Netlify Blobs, lewat fungsi `novel.js`), dan setiap perangkat
mengambil data terbaru itu lewat internet.
