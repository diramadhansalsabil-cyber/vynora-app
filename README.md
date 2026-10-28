# VynoraApp — Premium Mobile Video Player

> **Tagline:** *"Your Visual World, One Tap Away."*  
> **Pengembang:** Kelompok **ARENA**  
> **Tujuan:** Tugas UTS Pemrograman — Mengadaptasi logika pemutar musik menjadi pemutar video mobile premium dengan kendali penuh.

---

## 1. Fitur Utama

- 📱 **Mobile-First & Responsif:** Antarmuka smartphone modern dengan dark navy theme, aksen electric violet dan neon blue, glassmorphism, serta animasi halus.
- 🎨 **Logo Original:** Ikon geometris huruf "V" berpadu dengan segitiga Play, resolusi tinggi, dan wordmark resmi.
- 🎬 **Pemutar Video Sosial:** Mendukung embed TikTok, Instagram, YouTube, Facebook, dan Vimeo, dengan tautan untuk membuka video di platform asal.
- 📼 **Video Lokal MP4:** Memutar video komunitas langsung dari aplikasi; sampul unggahan dibuat dari frame pertama.
- ➕ **Tambah Video Komunitas:** Pengunjung dapat menambahkan tautan dari platform yang didukung atau mengunggah MP4 hingga 50 MB. Video tersimpan di server dan langsung muncul bagi pengunjung lain.
- 🎛️ **Kontrol Pemutaran:** Kontrol bawaan untuk video sosial dan kontrol HTML5 untuk video lokal.
- 📑 **Filter Platform:** Kategori Semua, TikTok, Instagram, YouTube, Facebook, Vimeo, dan Video Lokal.
- 📑 **Playlist Dinamis:** Video sosial dan lokal dengan sampul serta indikator video yang sedang aktif.
- 👥 **Halaman About & Data Anggota ARENA:** Informasi tim terpusat pada file konfigurasi yang mudah diedit.
- ⚙️ **Pengaturan Modal:** Konfigurasi auto-play dan preferensi pemutar.

---

## 2. Struktur Folder Proyek

```text
VynoraApp/
├── public/
│   ├── vynora-mark.png        # Ikon aplikasi dari identitas visual Vynora
│   ├── vynora-brand.png       # Artwork lengkap Vynora Video Player
│   ├── covers/                # Sampul video pilihan pengguna
│   └── videos/                # Video MP4 bawaan
├── src/
│   ├── data/
│   │   └── config.js          # File konfigurasi anggota tim ARENA & playlist video
│   ├── player.js              # Unified Video Player Controller (HTML5 + YouTube API)
│   ├── playlist.js            # Komponen pengelola playlist dan rendering list
│   ├── team.js                # Komponen rendering daftar anggota tim ARENA
│   ├── style.css              # Sistem styling futuristik (Dark Navy, Violet & Cyan)
│   └── main.js                # Entry point utama aplikasi & event listeners
├── index.html                 # Struktur halaman utama (Player, Playlist, About, Settings)
├── package.json               # Dependensi & script proyek (Vite)
├── run-dev.bat                # Shortcut Windows untuk menjalankan server dev
└── README.md                  # Dokumentasi proyek
```

---

## 3. Cara Menjalankan Aplikasi

Pastikan **Node.js** sudah terpasang di komputer Anda.

### Menjalankan Server Pengembangan:
Klik dua kali file `run-dev.bat`, atau jalankan melalui terminal:

```bash
npm run dev
```

Buka URL yang ditampilkan di terminal (default: `http://localhost:5173/`) pada browser Anda.

### Melakukan Build Production:
```bash
npm run build
```
File siap saji akan dibuat di folder `dist/`. Jalankan `npm start` pada server Node.js untuk menyajikan situs dan API. Simpan folder `data/` serta `public/uploads/` pada penyimpanan persisten server agar video komunitas tidak hilang saat restart atau deploy.

> **Catatan deployment:** `npm run dev` menjalankan API melalui middleware Vite. Untuk membagikan video yang diunggah kepada semua pengunjung, deploy aplikasi dengan `npm start` pada server yang mendukung Node.js dan penyimpanan persisten. Kiriman publik dibatasi 10 per alamat IP tiap 10 menit; file unggahan hanya menerima MP4 hingga 50 MB.

---

## 4. Cara Mengubah Data Anggota Kelompok & Playlist

Buka file [`src/data/config.js`](file:///d:/Pemrograman/VynoraApp/src/data/config.js):

### Mengubah Anggota Kelompok:
Edit array `members` di dalam objek `teamData`:
```javascript
export const teamData = {
  groupName: "ARENA",
  // ...
  members: [
    {
      id: 1,
      name: "Nama Lengkap Anda",
      role: "Lead Developer",
      studentId: "NIM Anda",
      avatarBg: "linear-gradient(135deg, #7C3AED, #3B82F6)"
    },
    // Tambah atau kurangi anggota sesuai kebutuhan
  ]
};
```

### Menambah atau Mengganti Video Playlist:
Edit array `initialPlaylist` di file yang sama. Tautan sosial baru dapat ditambahkan dari tombol `+`; unggahan MP4 memperoleh sampul otomatis dari frame pertamanya.

---

## 5. Status Pengujian

| Fitur | Status | Catatan |
|---|---|---|
| Build Vite | ✅ Berhasil | Tidak ada error atau peringatan |
| TikTok Embedded Player | ✅ Terintegrasi | Menggunakan pemutar embed TikTok dan menyediakan tautan cadangan |
| Next & Previous | ✅ Berhasil | Navigasi antar video di playlist |
| Desain Mobile Responsif | ✅ Berhasil | Optimal di viewport smartphone maupun desktop frame |
| Halaman About ARENA | ✅ Berhasil | Render dinamis dari konfigurasi terpusat |
| Settings Modal | ✅ Berhasil | Konfigurasi autoplay dan repeat aktif |
