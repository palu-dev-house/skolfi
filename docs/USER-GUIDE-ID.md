# Panduan Pengguna — SkolFi

Panduan ini menjelaskan cara menggunakan **SkolFi**, aplikasi SPP sekolah, untuk kegiatan sehari-hari. Dokumen ini ditujukan untuk staf sekolah (Admin dan Kasir) serta siswa/orang tua yang menggunakan portal.

**Versi aplikasi:** 2.14.0
**Bahasa UI:** Tersedia dalam Bahasa Indonesia dan English (dapat diubah lewat tombol bendera di bagian atas).

---

## Daftar Isi

1. [Masuk ke Aplikasi](#1-masuk-ke-aplikasi)
2. [Peran Pengguna](#2-peran-pengguna)
3. [Dashboard](#3-dashboard)
4. [Data Master](#4-data-master)
   - [4.1 Tahun Ajaran](#41-tahun-ajaran)
   - [4.2 Kelas](#42-kelas)
   - [4.3 Siswa](#43-siswa)
   - [4.4 Karyawan](#44-karyawan)
5. [Beasiswa & Diskon](#5-beasiswa--diskon)
6. [Tagihan SPP](#6-tagihan-spp)
7. [Pembayaran](#7-pembayaran)
   - [Transport](#transport)
   - [Uang Perlengkapan](#uang-perlengkapan)
   - [Buat Semua Tagihan](#buat-semua-tagihan)
   - [Pembayaran Multi-Tagihan (Kasir)](#pembayaran-multi-tagihan-kasir)
   - [Portal — Tagihan Gabungan](#portal--tagihan-gabungan)
   - [Perilaku Keluar Siswa](#perilaku-keluar-siswa)
   - [Beasiswa dan Diskon — Hanya untuk SPP](#beasiswa-dan-diskon--hanya-untuk-spp)
8. [Akun Portal Siswa](#8-akun-portal-siswa)
9. [Pembayaran Online](#9-pembayaran-online)
10. [Status Keluar Siswa](#10-status-keluar-siswa)
11. [Laporan](#11-laporan)
    - [11.1 Laporan Tunggakan](#111-laporan-tunggakan-overdue)
    - [11.2 Laporan Ringkasan Kelas](#112-laporan-ringkasan-kelas)
    - [11.3 Laporan Ringkasan Fee Service](#113-laporan-ringkasan-fee-service)
    - [11.4 Filter yang dapat dibagikan](#114-filter-yang-dapat-dibagikan)
12. [Portal Siswa / Orang Tua](#12-portal-siswa--orang-tua)
13. [Pengaturan Akun](#13-pengaturan-akun)
14. [Pertanyaan Umum](#14-pertanyaan-umum)
15. [Alur Kerja (Workflow)](#15-alur-kerja-workflow)
16. [Studi Kasus](#16-studi-kasus)

---

## 1. Masuk ke Aplikasi

1. Buka URL aplikasi di browser (biasanya `https://sekolah-anda.id/admin`).
2. Masukkan **Email** dan **Password** yang diberikan administrator.
3. Klik **Login**.

Setelah login berhasil, Anda akan diarahkan ke halaman Dashboard.

**Lupa password?** Hubungi administrator untuk reset password manual.

---

## 2. Peran Pengguna

Aplikasi memiliki dua peran dengan hak akses berbeda:

| Peran | Akses |
|-------|-------|
| **ADMIN** | Semua fitur — data master, tagihan, pembayaran, laporan, pengaturan, serta fitur khusus seperti tandai siswa keluar. |
| **KASIR (CASHIER)** | Hanya halaman yang dibutuhkan untuk mencatat pembayaran: Dashboard, Siswa (read-only), Pembayaran, dan Laporan. |

Menu yang ditampilkan di sidebar akan menyesuaikan dengan peran Anda.

---

## 3. Dashboard

Halaman pertama setelah login. Menampilkan:

- **Statistik umum** — jumlah siswa aktif, tagihan bulan berjalan, pembayaran hari ini.
- **Tingkat pencapaian pembayaran** — progress bar untuk tahun ajaran aktif.
- **Aktivitas terbaru** — pembayaran dan perubahan terbaru.
- **Sapaan personal** — menampilkan nama pengguna yang login.

---

## 4. Data Master

Data master adalah data inti yang dipakai seluruh sistem. Urutan pembuatan sangat penting:

> **Urutan wajib:** Tahun Ajaran → Kelas → Siswa → (beasiswa/diskon jika ada) → Generate Tagihan.

### 4.1 Tahun Ajaran

**Menu:** `Tahun Ajaran`

**Membuat tahun ajaran baru:**
1. Klik tombol **Tambah Tahun Ajaran**.
2. Isi nama (contoh: `2025/2026`), tanggal mulai, dan tanggal selesai.
3. Klik **Simpan**.

**Mengaktifkan tahun ajaran:**
- Klik menu tiga titik pada baris tahun ajaran, pilih **Jadikan Aktif**.
- Hanya satu tahun ajaran yang dapat aktif dalam satu waktu. Semua fitur otomatis menggunakan tahun ajaran aktif.

**Catatan:** Tahun ajaran yang sudah pernah dipakai untuk menerbitkan tagihan tidak bisa dihapus — demi menjaga integritas data historis.

### 4.2 Kelas

**Menu:** `Kelas`

**Membuat kelas akademik:**
1. Klik **Tambah Kelas**.
2. Isi:
   - **Nama kelas** — contoh: `7A`, `XII IPA 1`.
   - **Grade / Tingkat** — angka 1–12.
   - **Tahun Ajaran** — pilih dari dropdown.
   - **Biaya SPP** — isi sesuai frekuensi pembayaran (lihat di bawah).
   - **Frekuensi pembayaran** — `MONTHLY` (bulanan), `QUARTERLY` (per triwulan), atau `SEMESTER` (per semester).
3. Klik **Simpan**.

**Impor massal:**
- Klik **Import** untuk mengunggah banyak kelas sekaligus dari file Excel.
- Klik **Download Template** untuk mendapatkan format yang benar.

**Hubungan kelas ↔ siswa:** Setelah kelas dibuat, assign siswa ke kelas melalui halaman detail kelas (tab **Siswa**).

### 4.3 Siswa

**Menu:** `Siswa`

**Menambahkan siswa:**
1. Klik **Tambah Siswa**.
2. Isi:
   - **NIS** — unik, menjadi ID login portal.
   - **NIK** — 16 digit.
   - **Nama lengkap**, **alamat**, **nama orang tua**, **no. HP orang tua**.
   - **Tanggal masuk** (Start Join Date).
3. Klik **Simpan**.

Secara otomatis, akun portal siswa akan dibuat dengan password default berupa nomor HP orang tua (tanpa tanda minus/plus). Siswa diminta ganti password saat login pertama.

**Filter status:**
- Dropdown **Status** di atas tabel — pilih `Aktif` (default), `Sudah Keluar`, atau `Semua`.
- Siswa yang sudah keluar ditampilkan dengan teks redup dan label "Keluar".

**Operasi massal:** Centang beberapa siswa untuk menghapus atau mengubah tanggal masuk secara massal.

**Import Excel:** Gunakan menu `Import` → unggah file berdasarkan template yang disediakan.

### 4.4 Karyawan

**Menu:** `Karyawan` *(hanya Admin)*

Gunakan untuk mengelola akun Admin/Kasir:
1. **Tambah Karyawan** → isi nama, email, peran, password awal.
2. Karyawan wajib mengganti password saat login pertama.
3. Peran karyawan tidak dapat diubah setelah dibuat — hapus lalu buat ulang jika perlu.

---

## 5. Beasiswa & Diskon

### 5.1 Beasiswa

**Menu:** `Beasiswa` *(hanya Admin)*

Beasiswa mengurangi biaya SPP siswa tertentu untuk tahun ajaran tertentu.

**Membuat beasiswa:**
1. Klik **Tambah Beasiswa**.
2. Pilih siswa (NIS) dan kelas akademik.
3. Pilih:
   - **Full Scholarship** — siswa gratis 100% (tagihan otomatis = 0).
   - **Persentase** — contoh 50% (biaya dipotong separuh).
   - **Nominal tetap** — potongan angka rupiah.
4. Klik **Simpan**.

Beasiswa akan diterapkan otomatis saat tagihan digenerate.

### 5.2 Diskon

**Menu:** `Diskon` *(hanya Admin)*

Diskon berlaku untuk seluruh kelas (misalnya diskon adik-kakak, diskon spesial 17 Agustus, dll.).

**Membuat diskon:**
1. Klik **Tambah Diskon**.
2. Pilih kelas akademik dan tahun ajaran.
3. Tentukan jenis diskon (persentase atau nominal) dan periode berlaku.
4. Aktifkan/nonaktifkan sesuai kebutuhan.

**Catatan:** Diskon yang tidak aktif tidak akan dipakai saat generate tagihan.

---

## 6. Tagihan SPP

**Menu:** `Tagihan SPP`

### 6.1 Membuat Tagihan (Generate)

Tagihan SPP biasanya digenerate di awal tahun ajaran untuk seluruh periode.

1. Klik **Generate Tagihan**.
2. Pilih kelas akademik (atau gunakan **Generate Bulk** untuk semua kelas sekaligus).
3. Sistem otomatis:
   - Menghitung periode berdasarkan frekuensi kelas (bulanan 12 periode, triwulan 4, semester 2).
   - Menerapkan beasiswa & diskon aktif.
   - **Melewati periode setelah tanggal keluar** untuk siswa yang sudah keluar.
   - Tidak membuat duplikat jika periode sudah ada.

**Catatan:** Tagihan yang sudah ada tidak akan ditimpa. Untuk membuat ulang tagihan yang sudah dihapus, generate akan mengisinya kembali.

### 6.2 Melihat & Memfilter Tagihan

Tabel tagihan dapat difilter berdasarkan:
- Kelas akademik
- Siswa (NIS)
- Status: `UNPAID`, `PAID`, `PARTIAL`, `VOID`
- Periode dan tahun
- Rentang tanggal jatuh tempo

### 6.3 Status Tagihan

| Status | Arti |
|--------|------|
| **UNPAID** | Belum dibayar sama sekali. |
| **PARTIAL** | Sebagian dibayar, sisanya masih kurang. |
| **PAID** | Lunas. |
| **VOID** | Dibatalkan (tidak ditagih). |

### 6.4 Update Massal

Admin dapat mengubah status banyak tagihan sekaligus (contoh: membatalkan VOID secara massal). Tagihan yang sudah ada pembayarannya **tidak bisa** di-VOID.

---

## 7. Pembayaran

**Menu:** `Pembayaran`

### 7.1 Mencatat Pembayaran

1. Klik **Tambah Pembayaran**.
2. Cari siswa (berdasarkan NIS atau nama).
3. Pilih tagihan yang ingin dibayar (bisa centang beberapa).
4. Isi:
   - **Jumlah bayar** (bisa partial atau lunas).
   - **Tanggal pembayaran**.
   - **Metode** — tunai, transfer, dll.
   - **Catatan** (opsional).
5. Klik **Simpan**.

Sistem otomatis:
- Mengupdate status tagihan (UNPAID → PARTIAL → PAID).
- Mencatat Kasir yang menerima.
- Menyiapkan kuitansi siap cetak.

### 7.2 Mencetak Kuitansi / Bukti Pembayaran

Ada dua cara mencetak kuitansi:

**Cara 1 — Cetak Massal dari halaman Pembayaran (Rekomendasi Harian):**
1. Buka menu **Pembayaran**.
2. Klik tombol **Cetak** di pojok kanan atas halaman.
3. Pilih filter:
   - **Tahun Ajaran** — biasanya otomatis pilih yang aktif.
   - **Mode Cetak:**
     - **Hari Ini** — semua pembayaran yang tercatat hari ini (paling sering dipakai kasir).
     - **Semua Lunas** — semua pembayaran berstatus PAID pada tahun ajaran tersebut.
     - **Per Siswa** — cari NIS/nama siswa tertentu lalu cetak ulang semua kuitansinya (untuk kasus slip hilang).
4. Opsional: centang kotak pada slip yang diinginkan lalu klik **Cetak Terpilih (N)**; atau klik **Cetak Semua (N)** untuk mencetak semuanya di tampilan saat ini.
5. Browser akan membuka dialog print. Pilih printer atau *Save as PDF*.

**Format cetak:**
- Ukuran kertas: **A4**.
- **Tata letak Kompak (default)** — 8 slip per lembar A4 (100 mm × 70 mm per slip), dikelompokkan per siswa sehingga beberapa bulan muncul di slip yang sama. Cocok untuk bukti kecil yang bisa disobek.
- **Tata letak Lengkap** — 3 kuitansi lengkap per lembar A4 dengan kop sekolah, nomor kuitansi, data siswa, rincian biaya, jumlah diterima, kasir, dan tanda tangan. Pakai untuk invoice formal.
- Pembayaran dengan tagihan status **PAID** mendapat stempel **"LUNAS"** otomatis.

**Cara 2 — Cetak Ulang Kuitansi Lama:**
1. Buka menu **Pembayaran**.
2. Pakai filter di tabel untuk mencari pembayaran tertentu (berdasarkan NIS, tanggal, kelas).
3. Klik tombol **Cetak** → pilih mode **Semua Lunas** (atau **Per Siswa** untuk riwayat satu siswa) → filter tahun ajaran jika perlu.
4. Cetak.

**Catatan:**
- Kuitansi berfungsi sebagai bukti pembayaran resmi untuk orang tua.
- Simpan salinan digital (Save as PDF) untuk arsip.
- Jika printer tidak tersedia, kuitansi bisa di-PDF-kan dan dikirim via WhatsApp.

### 7.3 Kartu Bukti Pembayaran (A4)

Untuk sekolah yang masih menggunakan **kartu SPP fisik pra-cetak** sebagai bukti pembayaran siswa, sistem menyediakan fitur cetak khusus yang menempatkan data pembayaran tepat pada grid kartu.

**Cara membuka:**
1. Buka menu **Siswa** → klik NIS siswa yang dituju.
2. Pada halaman detail siswa, klik tombol **Kartu Bukti Pembayaran** di pojok kanan atas.
3. Pilih **Tahun Ajaran** (otomatis memakai tahun aktif).

**Tiga mode cetak:**
- **Header saja** — hanya mencetak judul, identitas siswa, dan kerangka tabel kosong sesuai frekuensi kelas. Gunakan untuk menyiapkan kartu kosong yang nanti diisi tangan.
- **Bulan terpilih** — pilih bulan mana saja yang ingin dicetak. Sistem otomatis mencentang semua bulan yang sudah pernah dibayar (autofill). Tersedia tombol **Pilih Lunas**, **Pilih Semua**, dan **Kosongkan**.
- **Semua bulan** — mencetak seluruh bulan yang ada data bayarnya.

**Kolom pada kartu:** No, Bulan, SPP, Transport, Perlengkapan, Total, Tanggal Bayar, No. Kuitansi, Kasir. Baris total di bawah menjumlahkan semua bulan yang sedang ditampilkan.

**Format cetak:**
- Ukuran kertas: **A4 portrait** (210 mm × 297 mm).
- Jumlah baris **mengikuti frekuensi kelas** — 10 baris untuk kelas MONTHLY, 4 untuk QUARTERLY, 2 untuk SEMESTER. Juli dan Agustus dikecualikan.
- Tiap baris bulan tingginya tepat **12 px** agar pas di grid kartu pra-cetak.
- Di dialog browser, pastikan skala cetak **100%** dan margin **none/default** agar posisi baris tidak bergeser.

**Catatan:**
- Pilih **Bulan terpilih** jika orang tua meminta bukti untuk bulan-bulan tertentu saja.
- Fitur ini independen dari cetak kuitansi di bagian 7.2 — keduanya bisa dipakai bersamaan sesuai kebutuhan sekolah.

### 7.4 Riwayat Pembayaran

Filter pada halaman pembayaran untuk melihat:
- Semua pembayaran siswa tertentu
- Pembayaran per kelas
- Pembayaran per kasir
- Rentang tanggal

---

## Transport

Tagihan transport dikelola sebagai **layanan** dengan langganan per siswa dan riwayat harga.

### Membuat layanan

1. Buka menu **Transport** pada grup Layanan & Biaya.
2. Klik **Tambah Layanan** lalu isi Nama, Kategori, dan catatan opsional.
3. Simpan. Layanan tanpa harga tidak bisa membuat tagihan.

### Import layanan dari Excel

1. Pada halaman Transport, klik tombol **Impor**.
2. Download template Excel — template sudah berisi daftar tahun ajaran dan kategori sebagai referensi.
3. Isi data layanan (Tahun Ajaran, Kategori, Nama, Deskripsi) sesuai format template.
4. Upload file dan klik **Proses Import**. Layanan yang sudah ada (duplikat nama + tahun ajaran + kategori) akan dilewati.

### Mengatur harga dan riwayat harga

Setiap layanan punya riwayat harga. Saat pembuatan tagihan, harga yang aktif pada tanggal 1 bulan terkait yang dipakai.

1. Buka detail layanan → **Riwayat Harga** → **Tambah Harga**.
2. Isi **Berlaku Mulai** (tanggal bebas dalam bulan tersebut — akan dinormalisasi ke tanggal 1 saat disimpan) dan jumlah.
3. Untuk menaikkan harga di tengah tahun, tambahkan entri baru dengan tanggal mulai lebih baru. Tagihan yang sudah dibuat tetap memakai harga snapshot lama.

### Menambah dan mengakhiri langganan siswa

1. Pada halaman detail layanan, buka **Pelanggan** → **Langganan Siswa**.
2. Pilih siswa, isi Tanggal Mulai dan catatan opsional. Kosongkan Tanggal Berakhir untuk langganan terbuka.
3. **Akhiri Langganan** akan mengisi tanggal berakhir; siswa tidak akan ditagih untuk bulan-bulan setelahnya.

### Membuat tagihan

Gunakan tombol **Buat Semua Tagihan** di bagian atas halaman Semua Tagihan. Aman dijalankan berkali-kali — tagihan yang sudah ada tidak diubah. Siswa baru, langganan baru, dan siswa yang keluar otomatis diperhitungkan pada eksekusi berikutnya.

Jika ada layanan yang belum punya harga pada suatu periode, akan muncul peringatan **Harga belum diatur**. Tambahkan harga lalu jalankan ulang.

## Uang Perlengkapan

**Uang perlengkapan** adalah biaya wajib per kelas yang ditagihkan pada bulan yang dikonfigurasi (default Juli dan Januari).

### Membuat uang perlengkapan

1. Buka **Uang Perlengkapan** pada grup Layanan & Biaya.
2. Klik **Tambah Uang Perlengkapan**, pilih Kelas, isi Jumlah dan Bulan Penagihan.
3. Simpan.

Setiap siswa di kelas tersebut akan mendapat tagihan di setiap bulan penagihan.

### Import uang perlengkapan dari Excel

1. Pada halaman Uang Perlengkapan, klik tombol **Impor**.
2. Download template Excel — template sudah berisi daftar kelas dan bulan sebagai referensi.
3. Isi data (Kelas, Nama, Jumlah, Bulan Penagihan) sesuai format template.
4. Upload file dan klik **Proses Import**. Data yang sudah ada (duplikat nama + kelas) akan dilewati.

### Bulan penagihan

Edit uang perlengkapan untuk menambah/menghapus bulan penagihan. Eksekusi berikutnya mengikuti daftar baru; tagihan lama tidak berubah.

### Perubahan jumlah

Perubahan jumlah hanya berlaku untuk tagihan yang dibuat berikutnya. Tagihan lama tetap memakai snapshot.

## Buat Semua Tagihan

Tombol **Buat Semua Tagihan** pada halaman **Semua Tagihan** membuat tagihan yang belum ada untuk tahun ajaran aktif di tiga jalur (SPP, transport, uang perlengkapan).

- **Idempoten:** aman dijalankan berulang.
- **Tidak merusak:** tagihan yang sudah dibayar tidak disentuh.
- **Sadar drift:** siswa baru, langganan baru, dan siswa yang keluar diperhitungkan otomatis.
- Jalankan ulang setelah menambah harga yang hilang, menambah langganan baru, atau mencatat siswa keluar.

## Pembayaran Multi-Tagihan (Kasir)

Pada halaman pembayaran kasir, daftar tagihan menggabungkan SPP, tagihan transport, dan uang perlengkapan untuk siswa yang dipilih. Sekali klik **Proses Pembayaran** membuat satu transaksi yang mencakup semua item terpilih.

- Setiap baris payment terkait tepat satu tagihan (SPP, fee bill, atau service-fee bill).
- Semua baris dalam satu transaksi berbagi **ID Transaksi** yang sama, jadi kuitansi dicetak sebagai satu slip.
- Membatalkan payment akan memperbarui jumlah terbayar dan status pada tagihan asalnya.

## Portal — Tagihan Gabungan

Siswa/orang tua melihat tiga jenis tagihan dalam satu daftar di halaman pembayaran portal. Mereka bisa memilih subset mana saja dan membayar lewat Midtrans dalam satu transaksi. Item yang lunas otomatis hilang dari daftar setelah settlement.

## Perilaku Keluar Siswa

Saat siswa ditandai keluar:

- **Langganan transport** yang aktif diberi Tanggal Berakhir sama dengan tanggal keluar.
- Tagihan **belum dibayar** untuk bulan-bulan berikutnya (termasuk fee bill dan uang perlengkapan) **dibatalkan** — flag `voidedByExit` diset, jumlah menjadi 0. Tidak dihitung lagi di total.
- Tagihan **sebagian dibayar** tetap utuh, dan ada peringatan agar staf memutuskan cara menyelesaikannya.
- Tagihan yang sudah lunas tidak pernah diubah.

Membatalkan status keluar akan memulihkan langganan dan mengembalikan tagihan yang sebelumnya dibatalkan (jumlah dihitung ulang dari riwayat harga atau jumlah uang perlengkapan saat ini).

## Beasiswa dan Diskon — Hanya untuk SPP

**Penting:** Beasiswa dan diskon hanya berlaku untuk SPP. Tagihan transport, akomodasi, dan uang perlengkapan tetap dibebankan penuh, tanpa melihat status beasiswa atau diskon siswa. Layar kasir tidak menyediakan kolom beasiswa/diskon untuk item non-SPP.

---

## 8. Akun Portal Siswa

**Menu:** `Akun Siswa` *(hanya Admin)*

Halaman ini untuk mengelola akun portal (login siswa/orang tua).

**Operasi yang tersedia:**
- **Buat Akun** — jika siswa belum punya akun (misalnya diimpor sebelum fitur portal aktif).
- **Reset Password** — menghasilkan password baru yang harus diberikan ke orang tua.
- **Hapus Akun** — menonaktifkan login (tagihan tetap tersimpan).
- **Pulihkan Akun** — mengembalikan akun yang sebelumnya dihapus.

**Password default:** No. HP orang tua tanpa karakter selain angka. Siswa wajib ganti password saat login pertama.

---

## 9. Pembayaran Online

**Menu:** `Pembayaran Online` *(hanya Admin)*

Memantau transaksi pembayaran online yang dilakukan siswa/orang tua lewat portal (terintegrasi dengan Midtrans).

**Status yang dipantau:**
- **PENDING** — menunggu pembayaran.
- **SETTLEMENT** — pembayaran berhasil, tagihan otomatis ter-update jadi PAID.
- **EXPIRE** — kadaluarsa (default 24 jam).
- **CANCEL / FAILED / DENY** — gagal.

**Pengaturan:**
Menu `Pengaturan Pembayaran` untuk mengatur Midtrans server key, client key, metode yang tersedia, dan batas waktu pembayaran.

---

## 10. Status Keluar Siswa

*Menangani siswa yang keluar di tengah tahun ajaran sehingga tagihan periode berikutnya otomatis dibatalkan.*

### 10.1 Masalah yang Diselesaikan

Sebelum fitur ini: jika siswa pindah sekolah di pertengahan tahun, tagihan periode berikutnya terus muncul sebagai "belum dibayar", sehingga laporan tunggakan dan total piutang jadi tidak akurat.

### 10.2 Aturan

- **Hanya Admin** yang dapat menandai siswa keluar.
- Tanggal keluar harus **>= tanggal masuk** dan **<= hari ini**.
- Tagihan UNPAID dengan periode yang **dimulai setelah** tanggal keluar akan otomatis dibatalkan (status VOID).
- Periode yang sedang berjalan saat tanggal keluar **tetap ditagih penuh** (sesuai praktik sekolah di Indonesia).
- Tagihan PARTIAL (sudah sebagian dibayar) **tidak dibatalkan otomatis** — ditampilkan sebagai peringatan untuk ditangani manual (refund atau tetap ditagih).
- Aksi ini **dapat dibatalkan** — tagihan yang dibatalkan karena keluar akan dikembalikan ke UNPAID.

### 10.3 Cara Menandai Siswa Keluar

1. Buka menu **Siswa** → klik nama siswa untuk masuk halaman detail.
2. Scroll ke bagian **Status Siswa**.
3. Klik tombol merah **Tandai Keluar**.
4. Pada modal:
   - Pilih **Tanggal Keluar** (default: hari ini).
   - Isi **Alasan Keluar** (contoh: "Pindah ke Surabaya").
5. Klik **Tandai Keluar**.

Setelah proses selesai, notifikasi akan muncul menyebutkan jumlah tagihan yang dibatalkan. Jika ada tagihan PARTIAL yang perlu ditangani manual, peringatan tambahan akan muncul.

### 10.4 Membatalkan Status Keluar

Jika siswa ternyata kembali masuk sekolah:

1. Buka halaman detail siswa.
2. Pada banner kuning **Siswa keluar pada [tanggal]...**, klik **Batalkan Status Keluar**.
3. Konfirmasi pada modal.

Sistem akan:
- Mengembalikan status siswa menjadi aktif.
- Memulihkan tagihan yang sebelumnya dibatalkan oleh fitur keluar (menjadi UNPAID) dengan biaya sesuai tarif kelas.
- Tagihan yang di-VOID **secara manual** (bukan karena keluar) tidak akan ikut dipulihkan.

### 10.5 Filter Siswa Keluar

Di halaman daftar siswa, gunakan dropdown **Status** untuk:
- `Aktif` (default) — sembunyikan siswa keluar.
- `Sudah Keluar` — hanya tampilkan siswa keluar.
- `Semua` — tampilkan keduanya.

### 10.6 Generate Tagihan untuk Siswa Keluar

Jika Anda menjalankan **Generate Tagihan** setelah menandai siswa keluar, sistem otomatis melewati periode-periode setelah tanggal keluar — tidak perlu perlakuan khusus.

---

## 11. Laporan

**Menu:** `Laporan`

### 11.1 Laporan Tunggakan (Overdue)

Menampilkan daftar tagihan yang **lewat jatuh tempo** dan belum lunas. Laporan dipisah menjadi tiga tab sesuai jenis tagihan:

- **SPP** — tagihan SPP bulanan (tuition).
- **Transport** — tagihan layanan berlangganan (fee bills).
- **Uang Perlengkapan** — tagihan one-time per kelas (service fee bills).

Setiap tab menggunakan filter dan format tabel yang sama, jadi Anda bisa beralih antar jenis tagihan tanpa kehilangan konteks.

**Filter yang tersedia:**
- Kelas akademik
- Grade / tingkat
- Tahun ajaran

**Informasi per baris:**
- Nama siswa, kelas, periode, tanggal jatuh tempo.
- Sisa tagihan.
- Jumlah hari keterlambatan.

Gunakan laporan ini sebagai dasar penagihan WhatsApp ke orang tua. Cek ketiga tab secara rutin agar tidak ada jenis tunggakan yang terlewat.

### 11.2 Laporan Ringkasan Kelas

Menampilkan per kelas:
- Total tagihan yang dibuat.
- Total terbayar.
- Total tunggakan.
- Tingkat kolekti­bilitas (persentase).

Berguna untuk rapat bulanan/kuartal dengan kepala sekolah.

### 11.3 Laporan Ringkasan Fee Service

**Menu:** `Laporan → Fee Services`

Tampilan terpadu untuk layanan **transport**, dikelompokkan per layanan. Gunakan laporan ini untuk melihat kinerja tiap rute bus tanpa harus menelusuri daftar tagihan satu per satu.

**Kartu ringkasan (atas):** total keseluruhan *Ditagihkan*, *Dibayar*, dan *Tunggakan* untuk layanan yang sedang difilter.

**Info per baris:**
- Nama layanan dan badge kategori.
- Jumlah siswa aktif yang berlangganan.
- Total ditagihkan, total dibayar, tunggakan.
- Jumlah tagihan yang jatuh tempo.

**Filter tersedia:**
- Tahun ajaran
- Kategori
- Layanan tertentu
- Status tagihan (Belum Bayar / Sebagian / Lunas / Void)
- Kelas
- Rentang bulan tagihan (dari / sampai)
- Cari berdasarkan nama layanan

**Ekspor:** klik **Export Excel** untuk mengunduh tampilan yang sedang difilter sebagai file `.xlsx`.

### 11.4 Filter yang dapat dibagikan

Semua filter dan nomor halaman di halaman daftar admin dan laporan **disimpan di URL**. Artinya Anda dapat:

- **Bookmark** tampilan tertentu (misalnya "Tunggakan, Kelas 8, TA 2025/2026") dan kembali sekali klik.
- **Bagikan tautan** ke rekan kerja — mereka membukanya dengan filter yang sama.
- Gunakan tombol **back / forward** browser untuk menelusuri perubahan filter.

Mengubah filter apa pun otomatis mereset tabel kembali ke halaman 1 sehingga Anda tidak mendarat di halaman kosong.

---

## 12. Portal Siswa / Orang Tua

URL portal: `https://sekolah-anda.id/portal`

Portal ini digunakan oleh siswa/orang tua, **bukan** staf sekolah.

### 12.1 Login

1. Buka halaman portal.
2. Masukkan **NIS** dan **password** (default: no. HP orang tua).
3. Wajib ganti password saat login pertama.

### 12.2 Menu Portal

| Menu | Fungsi |
|------|--------|
| **Home** | Dashboard dengan ringkasan tagihan dan status. |
| **Bayar** | Daftar tagihan yang bisa dibayar online (via Midtrans). |
| **Riwayat** | Daftar tagihan dan pembayaran historis. |
| **Ganti Password** | Ubah password akun. |

### 12.3 Membayar Online

1. Menu **Bayar** → centang tagihan yang ingin dibayar.
2. Klik **Bayar Sekarang**.
3. Pilih metode pembayaran (QRIS, virtual account, e-wallet, kartu kredit).
4. Selesaikan pembayaran pada halaman Midtrans.
5. Setelah berhasil, status tagihan otomatis berubah jadi PAID.

### 12.4 Banner Siswa Keluar

Jika akun login adalah siswa yang sudah ditandai keluar, portal menampilkan **banner kuning** di atas halaman:

> *"Akun ini berstatus keluar per [tanggal]. Hanya tagihan tertunggak yang dapat dilihat."*

Siswa masih bisa melihat dan membayar tagihan yang belum lunas (tunggakan), sehingga hubungan finansial dapat diselesaikan.

---

## 13. Pengaturan Akun

Klik nama pengguna di pojok kiri bawah sidebar untuk:

- **Profil** — melihat informasi akun (nama, email, peran).
- **Ganti Password** — ubah password akun sendiri.
- **Logout** — keluar dari aplikasi.

### Mengubah Bahasa

Klik **bendera** di pojok kanan atas untuk beralih antara Bahasa Indonesia dan English. Pilihan ini tersimpan di browser.

---

## 14. Pertanyaan Umum

**Q: Tagihan yang di-VOID bisa dikembalikan?**
A: Admin dapat mengubah status via halaman tagihan (edit atau update massal). Tagihan yang di-VOID otomatis karena status keluar hanya dipulihkan jika Anda membatalkan status keluar siswa.

**Q: Apa bedanya beasiswa Full dan persentase 100%?**
A: Sama secara nominal (0 rupiah). Namun Full Scholarship ditandai khusus di laporan untuk memudahkan audit.

**Q: Siswa pindah kelas di tengah tahun — bagaimana?**
A: Fitur khusus pindah kelas belum tersedia. Solusinya: tandai siswa keluar dari kelas lama, kemudian buat entri siswa baru di kelas baru (dengan NIS yang sama tidak bisa — gunakan NIS berbeda atau hubungi developer untuk penanganan khusus).

**Q: Siswa sudah bayar semua tagihan bulan Januari, tapi keluar di bulan Februari — apa yang terjadi?**
A: Tagihan Januari yang PAID tetap utuh. Tagihan Februari yang UNPAID akan dibatalkan otomatis saat Anda tandai keluar dengan tanggal di bulan Februari. Periode yang periode-start-nya setelah tanggal keluar akan di-VOID.

**Q: Bagaimana backup data?**
A: Backup database dilakukan otomatis via script. Hubungi admin sistem/IT untuk penjadwalan dan restorasi.

**Q: Siswa tidak bisa login ke portal, apa yang harus dilakukan?**
A: Di menu **Akun Siswa**, cari NIS yang bermasalah, klik **Reset Password**. Berikan password baru ke orang tua. Jika akun ternyata sudah dihapus, klik **Pulihkan Akun** terlebih dahulu.

**Q: Apakah data historis bisa dilihat setelah ganti tahun ajaran?**
A: Ya. Semua data historis tetap tersimpan. Gunakan filter tahun ajaran di tagihan dan laporan untuk melihat periode sebelumnya.

---

## 15. Alur Kerja (Workflow)

Bagian ini menjelaskan urutan kerja tipikal dari setup awal hingga operasional harian.

### 15.1 Alur Setup Awal (Admin, sekali di awal tahun ajaran)

```
Tahun Ajaran → Kelas → Siswa → Akun Portal → Tagihan SPP
```

1. **Buat Tahun Ajaran baru** di menu *Tahun Ajaran*. Tandai sebagai **Aktif**.
2. **Buat Kelas** untuk tahun ajaran tersebut (contoh: 7A, 7B, 8A …). Tentukan nominal SPP per kelas.
3. **Tambah / import Siswa** ke sistem. Masukkan NIS, nama, kelas, tanggal masuk (`startJoinDate`).
4. **Generate Akun Portal** untuk siswa (tombol *Generate Akun* di daftar Akun Siswa). Password default otomatis dibuat.
5. **Generate Tagihan SPP** di menu *Tagihan* — pilih tahun ajaran, periode (bulanan/kuartal/semester), dan kelas. Sistem akan membuat tagihan untuk semua siswa di kelas tersebut.

### 15.2 Alur Harian (Kasir)

```
Siswa datang bayar → Cari NIS → Catat Pembayaran → Cetak Kwitansi
```

1. Siswa/orang tua datang ke kasir membawa uang.
2. Kasir buka menu *Pembayaran* → *Catat Pembayaran Baru*.
3. Cari siswa berdasarkan NIS atau nama.
4. Pilih tagihan yang akan dibayar (bisa satu atau lebih).
5. Masukkan nominal yang dibayar dan metode (Tunai / Transfer).
6. Simpan → status tagihan otomatis update (PAID atau PARTIAL).
7. Klik *Cetak Kwitansi* → berikan ke siswa.

### 15.3 Alur Bulanan (Admin)

```
Cek tagihan nunggak → Ingatkan → Rekap laporan bulanan
```

1. Awal bulan: cek *Laporan Tunggakan* untuk daftar siswa yang belum bayar.
2. Export / print daftar untuk ditindaklanjuti (telepon orang tua / kirim pesan).
3. Akhir bulan: cek *Laporan Pendapatan* untuk rekap masuk kas.
4. Cek *Riwayat Pembayaran* untuk audit trail.

### 15.4 Alur Akhir Tahun Ajaran (Admin)

```
Tutup tahun ajaran → Rekap akhir → Buat tahun ajaran baru → Naik kelas
```

1. Pastikan semua pembayaran tahun berjalan sudah tercatat.
2. Generate *Laporan Tahunan*.
3. Buat *Tahun Ajaran* baru, tandai sebagai Aktif (yang lama jadi non-aktif otomatis).
4. Buat Kelas baru untuk tahun ajaran baru.
5. Pindahkan siswa ke kelas baru (naik kelas) — atau tandai keluar bagi yang lulus.
6. Generate tagihan SPP untuk tahun ajaran baru.

### 15.5 Alur Keluar Siswa Mid-Year (Admin)

```
Siswa tidak lanjut → Tandai Keluar → Sistem otomatis VOID tagihan ke depan
```

1. Buka detail siswa di menu *Siswa* (klik NIS).
2. Scroll ke bagian **Status Keluar Siswa**.
3. Klik **Tandai Keluar**, isi tanggal keluar dan alasan.
4. Sistem tampilkan preview: "X tagihan UNPAID akan di-VOID" → konfirmasi.
5. Status siswa berubah jadi **Keluar**, tagihan periode setelah tanggal keluar otomatis VOID.
6. Jika salah input tanggal, klik **Batalkan Keluar** untuk restore.

### 15.6 Alur Portal Siswa / Orang Tua

```
Login portal → Lihat tagihan → Bayar online (opsional) → Unduh kwitansi
```

1. Orang tua / siswa buka `https://sekolah-anda.id/portal`.
2. Login dengan NIS + password (awalnya password default, wajib ganti saat pertama login).
3. Lihat ringkasan tagihan (PAID / PARTIAL / UNPAID).
4. Jika gateway online aktif: klik **Bayar Online** → pilih tagihan → bayar via virtual account / QRIS.
5. Lihat *Riwayat Pembayaran* untuk kwitansi digital.

---

## 16. Studi Kasus

Bagian ini memberi contoh skenario nyata dan cara menanganinya.

### Skenario 1: Setup sekolah baru (tahun ajaran 2026/2027)

**Situasi:** Sekolah baru saja go-live dengan aplikasi ini. Ada 3 kelas (7A, 7B, 7C) dengan total 90 siswa. SPP per bulan Rp 500.000.

**Langkah:**
1. Login sebagai ADMIN.
2. Buat *Tahun Ajaran* "2026/2027", tanggal 1 Juli 2026 – 30 Juni 2027, tandai Aktif.
3. Buat 3 Kelas: 7A, 7B, 7C — masing-masing nominal SPP Rp 500.000/bulan.
4. Import siswa via Excel (*Siswa → Import*) — template disediakan aplikasi.
5. Generate akun portal semua siswa (aksi massal di *Akun Siswa*).
6. Generate tagihan: pilih tahun 2026/2027, periode MONTHLY (12 bulan Juli 2026–Juni 2027), semua kelas.
7. Sistem membuat 90 siswa × 12 bulan = 1.080 tagihan otomatis.
8. Bagikan username (NIS) + password default ke orang tua via WhatsApp/surat edaran.

**Hasil:** Sekolah siap operasional. Kasir tinggal catat pembayaran yang masuk.

### Skenario 2: Siswa keluar pindah kota di tengah tahun

**Situasi:** Budi (NIS 2026001) kelas 7A sudah bayar bulan Juli–Oktober 2026. Budi pindah kota, hari terakhir masuk 15 November 2026. Tagihan November 2026 belum dibayar, tagihan Desember 2026 – Juni 2027 juga masih UNPAID.

**Langkah:**
1. Admin buka detail Budi (NIS 2026001).
2. Di bagian **Status Keluar Siswa**, klik **Tandai Keluar**.
3. Tanggal keluar: 15 November 2026. Alasan: "Pindah kota ke Surabaya".
4. Sistem tampilkan preview:
   - Tagihan November 2026 → tetap UNPAID (periode Nov mulai 1 Nov, sebelum 15 Nov).
   - Tagihan Desember 2026 – Juni 2027 → akan di-VOID (7 tagihan).
5. Admin klik **Konfirmasi**.
6. Sistem update: 7 tagihan VOID, Budi status "Keluar".

**Catatan:** Tagihan November yang masih UNPAID **tidak** otomatis di-VOID karena periodenya sudah dimulai sebelum tanggal keluar. Admin bisa negosiasi dengan orang tua: bayar penuh, bayar prorata (PARTIAL), atau void manual.

**Hasil:** Laporan keuangan bersih, tagihan masa depan tidak lagi muncul sebagai tunggakan.

### Skenario 3: Siswa dapat beasiswa 50%

**Situasi:** Siti (NIS 2026042) kelas 8B mendapat beasiswa prestasi 50% dari nominal SPP mulai Januari 2027.

**Langkah:**
1. Admin buka menu *Beasiswa*.
2. Klik **Tambah Beasiswa** → pilih siswa Siti, tipe "Persentase", nilai 50%, berlaku Jan 2027 – Jun 2027.
3. Save. Sistem menandai beasiswa aktif.
4. Untuk tagihan Januari 2027 dan seterusnya, nominal otomatis dikurangi 50% → Rp 250.000.
5. Tagihan bulan-bulan sebelumnya (yang sudah ada) **tidak** terpengaruh kecuali di-regenerate.

**Hasil:** Beasiswa diterapkan otomatis tanpa perlu edit manual tiap tagihan.

### Skenario 4: Siswa bayar sebagian (cicilan)

**Situasi:** Orang tua Rio (NIS 2026077) hanya sanggup bayar Rp 300.000 dari SPP November 2026 yang Rp 500.000. Sisanya akan dilunasi bulan berikutnya.

**Langkah:**
1. Kasir buka *Pembayaran → Catat Pembayaran*.
2. Cari NIS 2026077, pilih tagihan November 2026.
3. Input nominal Rp 300.000, metode Tunai.
4. Simpan → status tagihan jadi **PARTIAL** (sisa Rp 200.000).
5. Bulan depan, saat orang tua melunasi:
   - Catat pembayaran lagi untuk tagihan yang sama, nominal Rp 200.000.
   - Status otomatis jadi **PAID**.
6. Cetak kwitansi untuk kedua transaksi.

**Hasil:** Cicilan tercatat rapi, kasir bisa audit ulang kapan saja.

### Skenario 5: Salah tandai keluar, perlu dibatalkan

**Situasi:** Admin salah input — menandai Ayu (NIS 2026099) keluar padahal yang dimaksud siswa lain. Akibatnya 6 tagihan masa depan Ayu ter-VOID.

**Langkah:**
1. Buka detail Ayu (NIS 2026099).
2. Di bagian **Status Keluar Siswa**, klik **Batalkan Keluar**.
3. Konfirmasi. Sistem:
   - Restore 6 tagihan VOID → UNPAID.
   - Hapus exitedAt, exitReason, exitedBy dari data siswa.
4. Ayu kembali status aktif, tagihan masa depan muncul lagi normal.

**Hasil:** Kesalahan input bisa dibalik tanpa kerusakan data.

### Skenario 6: Orang tua lupa password portal

**Situasi:** Bu Ani, orang tua Dita (NIS 2026110), lupa password dan minta reset.

**Langkah:**
1. Admin buka *Akun Siswa*, cari NIS 2026110.
2. Klik tombol **Reset Password**.
3. Sistem generate password baru default (misal `dita2026`).
4. Admin beri tahu Bu Ani password baru via WhatsApp.
5. Bu Ani login dengan password baru → sistem minta ganti password saat pertama login.

**Hasil:** Akses portal pulih tanpa perlu intervensi teknis.

### Skenario 7: Pembayaran online via gateway

**Situasi:** Sekolah mengaktifkan gateway Midtrans. Orang tua Rafi (NIS 2026120) mau bayar dari rumah tanpa datang ke kasir.

**Langkah:**
1. Bu Ani (orang tua Rafi) login ke portal dengan NIS Rafi.
2. Lihat tagihan Januari 2027 = UNPAID Rp 500.000.
3. Klik **Bayar Online**, pilih tagihan Januari.
4. Sistem arahkan ke halaman Midtrans Snap.
5. Bu Ani pilih BCA Virtual Account, bayar via m-banking.
6. Setelah pembayaran sukses, webhook Midtrans update status tagihan Januari jadi **PAID**.
7. Kwitansi digital muncul di riwayat portal.

**Hasil:** Pembayaran selesai tanpa perlu ke sekolah.

---

## Bantuan Lebih Lanjut

- **Bug / error teknis:** Hubungi administrator IT sekolah.
- **Pertanyaan operasional:** Hubungi Admin utama di sekolah.
- **Dokumentasi teknis (developer):** Lihat folder `docs/` pada repository.

*Dokumen ini diperbarui pada April 2026 untuk aplikasi versi 2.13.2.*
