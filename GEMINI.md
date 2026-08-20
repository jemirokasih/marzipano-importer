# Workspace Rules for Mikrotek Marzipano Importer

## Git Branching & Merge Workflow

1. **Pengembangan Selalu di Branch `dev`**:
   - Setiap kali membuat fitur baru, perbaikan bug, atau perubahan kode, pastikan pengembangkan dan commit selalu dilakukan di branch `dev`.
   - Dilarang membuat perubahan langsung di branch `main`.

2. **Merge & Push ke `main` Hanya Setelah Konfirmasi User ("Oke")**:
   - Jangan melakukan merge atau push ke branch `main` sampai USER secara eksplisit memberikan persetujuan (contoh: "oke", "merge ke main", "push ke main").

3. **Pertahankan Histori Commit (Dilarang Hapus History)**:
   - Dilarang keras menghapus, menimpa dengan `force push` (`--force`), atau melakukan squash yang merusak rekam jejak histori commit.
   - Seluruh histori commit harus dijaga keutuhannya agar sewaktu-waktu dapat dilakukan *rollback* (pengembalian ke versi sebelumnya) dengan aman.

4. **Update Versi Footer, CHANGELOG.md & Otomatis Buat GitHub Release**:
   - Setiap kali menambah fitur baru atau memperbaiki bug, selalu perbarui tag versi (contoh: `v1.2.0`) di footer `index.html` dan catat riwayat perubahannya di `CHANGELOG.md`.
   - Saat USER meminta push/merge ke `main`, lakukan merge/push dari `dev` ke `main`, buat tag versi git, dan secara otomatis buat GitHub Release (`gh release create vX.Y.Z ...`) dengan catatan rilis yang diambil dari `CHANGELOG.md`.
