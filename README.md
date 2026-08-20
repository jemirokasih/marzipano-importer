# Mikrotek Marzipano Importer

> **Web Application:** [https://marzipano-importer.mzi.co.id](https://marzipano-importer.mzi.co.id)  
> **Maintainer:** Mikrotek. Jemiro  
> **Base Architecture:** [Marzipano Importer](https://github.com/tunnaduong/marzipano-importer) by [Tunna Duong](https://tunnaduong.com)  
> **Core Engine:** [Marzipano 360° Panorama Viewer](https://www.marzipano.net/)

---

## 📌 About / Tentang Proyek

**Mikrotek Marzipano Importer** adalah aplikasi berbasis web *standalone* yang disempurnakan untuk membuat, mengedit, mengelola, dan mengimpor tur virtual 360° interaktif berbasis **Marzipano Engine**.

Aplikasi ini dikembangkan dan dipelihara oleh **Mikrotek. Jemiro** dengan membangun serta menambahkan berbagai perbaikan bug (*bug fixes*) dan fitur-fitur canggih di atas basis kode awal karya **Tunna Duong** dan pustaka **Marzipano**.

Aplikasi dapat diakses secara publik melalui domain **[marzipano-importer.mzi.co.id](https://marzipano-importer.mzi.co.id)**.

---

## 🛠️ Perbaikan & Fitur Tambahan (Fixes & Added Features)

Berikut adalah rincian lengkap perbaikan dan fitur baru yang telah ditambahkan ke dalam **Mikrotek Marzipano Importer**:

### 💾 1. Manajemen State & Persistensi Berkas (Save & Load File)
* **Simpan ke File (`Save File`)**: Memungkinkan pengguna mengekspor seluruh proyek virtual tour (konfigurasi tur, data scene, dan gambar panorama) ke dalam berkas `.json` / `.marzipano.json` tunggal.
* **Muat File (`Load File`)**: Fitur untuk memuat kembali proyek dari berkas `.json` yang pernah disimpan sebelumnya tanpa harus membuat tur dari awal.
* **Reset State Proyek (`Reset`)**: Tombol untuk membersihkan state proyek dan cache IndexedDB browser secara total, memudahkan pembuatan tur baru dari awal.
* **Auto-Save Browser Cache**: Menggunakan IndexedDB untuk menyimpan proyek secara otomatis di latar belakang sehingga data tidak hilang saat halaman browser ter-refresh secara tidak sengaja.

### ⚡ 2. Pembaruan Hotspot 3D Seketika (Live 3D Hotspot Refresh)
* **Live Refresh Sequence (`refreshActiveScene`)**: Memperbaiki masalah di mana hotspot yang baru ditambahkan tidak langsung muncul di viewer. Hotspot kini dirender dan diproyeksikan secara 100% realtime tanpa memerlukan refresh halaman (F5) atau perpindahan scene.
* **Pratinjau Marker Instan**: Begitu pengguna mengklik area panorama 3D untuk menambah hotspot, ikon marker sementara langsung muncul seketika di titik panorama tersebut sebelum formulir modal diisi.
* **Rotasi Ikon Live**: Memutar ikon panah *Link Hotspot* sebesar 45° secara langsung pada menu hover tanpa menggeser atau melompatkan sudut pandang kamera.

### 🎯 3. Target Initial View Kustom (Sudut Pandang Kamera Landing)
* **Tangkap Sudut Pandang Active (`Capture Current View`)**: Memungkinkan pengguna menangkap sudut pandang kamera (`yaw`, `pitch`, `fov`) saat ini untuk scene tujuan pada *Link Hotspot*.
* **Pengaturan Angka Manual (`Yaw °`, `Pitch °`, `FOV °`)**: Menyediakan 3 kolom input angka manual untuk menentukan derajat sudut pandang kamera secara presisi:
  * **Yaw (°)**: Sudut rotasi horizontal.
  * **Pitch (°)**: Sudut kemiringan vertikal.
  * **FOV (°)**: Sudut lebar pandang (*Field of View*).
* **Navigasi Presisi**: Saat menavigasi antar-scene melalui *Link Hotspot*, kamera akan mendarat secara otomatis dan presisi sesuai sudut pandang kustom yang telah diatur.

### 🎮 4. Opsi Kontrol Layar & Fitur Navigasi (Viewer Settings)
* **Mode Mouse Radio (`Drag` vs `QTVR`)**: Memastikan pilihan mode kontrol mouse antara **Drag** dan **QTVR** bersifat eksplisit dan saling mengunci (*mutually exclusive radio buttons*).
* **Tombol Navigasi Layar (`View Control Buttons Overlay`)**: Opsi Settings untuk menampilkan tombol navigasi melayang di sudut kanan bawah viewer 3D (Atas, Bawah, Kiri, Kanan, Zoom In, Zoom Out) yang dapat ditekan atau ditahan untuk menggerakkan kamera secara halus.
* **Tombol Fullscreen Overlay (`Fullscreen Button Overlay`)**: Opsi Settings untuk menampilkan tombol *Fullscreen* melayang di sudut kanan atas viewer 3D.
* **Autorotate Realtime**: Opsi pemutaran otomatis 360° yang dapat diaktifkan atau dimatikan secara realtime di viewer.

### 💬 5. Pratinjau Pop-up Info Hotspot (Hover Preview)
* **Instant Hover Popup**: Menambahkan tampilan pop-up teks *Info Hotspot* secara otomatis saat kursor diarahkan (*hover*) ke ikon hotspot.
* **Mode Edit Tetap Aktif**: Pop-up tetap terbuka saat diklik untuk memudahkan pengeditan judul dan deskripsi.

---

## 🎯 Fitur Utama Awal (Core Features)

* **Buat Tur Baru**: Membuat tur virtual dari kumpulan foto panorama (JPG/PNG).
* **Impor Berkas ZIP**: Mengimpor berkas ZIP tur Marzipano yang pernah diekspor.
* **Kelola Scene**: Menambah, mengedit nama, mengatur ulang urutan, dan menghapus scene.
* **Ekspor Tur**: Mengunduh tur virtual lengkap sebagai berkas ZIP siap pakai untuk hosting web.

---

## 🚀 Cara Menjalankan Secara Lokal (Quick Start)

1. **Clone repository:**
   ```bash
   git clone https://github.com/jemirokasih/marzipano-importer.git
   cd marzipano-importer
   ```

2. **Jalankan web server lokal (Python/Node):**
   ```bash
   # Menggunakan Python 3
   python3 -m http.server 8000
   ```

3. **Buka di browser:**
   Akses `http://localhost:8000` di web browser modern Anda.

---

## 📜 Lisensi & Kredit (Credits & Attribution)

* **Mikrotek Marzipano Importer**: Dipelihara oleh **Mikrotek. Jemiro**.
* **Marzipano Importer Original**: Berdasarkan karya open-source oleh [Tunna Duong](https://github.com/tunnaduong/marzipano-importer).
* **Marzipano Engine**: Pustaka panorama 360° berbasis WebGL oleh [Marzipano.net](https://www.marzipano.net/) (Lisensi BSD).
