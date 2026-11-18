WORLD DOMINION V.I — BUILD 0.9 (EKONOMI)
========================================
MENU EKONOMI (semua halaman memakai navigasi penuh seperti dashboard):
- market.html (Pasar Lokal): harga & transaksi pakai MATA UANG lokal (Rupiah untuk Indonesia). Beli/jual langsung dengan total harga yang harus
  dibayar / total yang diterima (setelah pajak), atau pasang tawaran (limit). Grafik harga + jual/beli + volume (selang 10 menit, harga bergerak
  real-time), papan tawaran, tawaranku, dan riwayat transaksi real-time.
- global-market.html (Pasar Global): sama, tapi HANYA Gold. Pajak impor/ekspor 5%.
- forex.html (Valuta Asing): hanya Gold <-> mata uang (USD, IDR, EUR, JPY, CNY, Dinar, Rubel), 1 Gold = 10 USD kurs dasar. Tab "Beli emas" menampilkan
  tawaran BELI tertinggi, tab "Jual emas" menampilkan tawaran JUAL terendah; bisa langsung atau pasang tawaran. Grafik, riwayat aktivitas, dan
  slot "Valas negara" (belum aktif sampai negara terbentuk).
- jobs.html (Pekerjaan): lowongan di wilayah TEMPAT TINGGAL (kewarganegaraan), pencarian nama perusahaan/pemilik, tag (lokasi, sembunyikan penuh,
  sembunyikan tak sanggup bayar upah, bagi hasil, sembunyikan tanpa bahan), navigasi jenis barang, tombol Bekerja sekarang / Mengundurkan diri,
  dan Berkas pekerja (stat ekonomi, energi, pemberi kerja, izin kerja).
- companies.html (Perusahaan): pabrik bahan baku (8 jenis) dan pabrik produksi (Makanan <- Gandum, Senjata <- Besi, Tiket <- Minyak; 10 bahan = 1 unit).
  Setor/ambil bahan, tarik hasil, dana upah, upah vs bagi hasil, buka/tutup rekrutmen, naik level, dirikan perusahaan baru.
- contracts.html (Kontrak): barter antar pemain (Draf/Masuk/Terkirim/Riwayat), tiket kurir menurut jarak, biaya notaris, aturan sesuai rancangan.
PENTING (prototipe lokal): lawan transaksi = pemain simulasi (NPC) deterministik berdasarkan waktu. Seluruh logika ada di economy*.js dan disimpan
di player.economy sehingga mudah dipindah ke server (server menjadi sumber waktu, order, kontrak). Angka balancing ada di economy.js (CONFIG) dan
economy-work.js. CONFIG.DEV_MODE = true melonggarkan syarat level 20 / umur akun 3 hari untuk kontrak; ubah ke false saat rilis.
Dompet: player.wallet menyimpan 7 mata uang; uang lokal ikut negara tempat berada. Tiket pesawat kini dibayar dari mata uang lokal.
Pajak awal 5% mengalir ke kas wilayah (economy.treasury) untuk kelak diatur parlemen/menteri.

WORLD DOMINION V.I — BUILD 0.8 (WORLD ATLAS)
============================================

CATATAN TERBARU: peta 789 provinsi (Indonesia lengkap 34); tab "Negara" dihapus dari panel wilayah (warna/bendera/nama
kelak diatur lewat UUD di parlemen); pajak awal 5% di semua jenis, perbatasan terbuka.
 wilayah dimulai dari NOL (penduduk, perusahaan, infrastruktur, pajak, perang, embargo = kosong; hanya
sumber daya alam yang ada). Penduduk dihitung dari pemain nyata. Tab Perjalanan memiliki tombol "Berangkat sekarang".
Plakat pojok kanan bawah dihapus. Data peta lama (4.300) otomatis dihapus; bangun ulang lewat tombol di halaman peta.

BARU DI BUILD 0.8
1. PETA ABU-ABU DUNIA NYATA, TARGET 789 PROVINSI (ringan untuk perangkat kecil; Indonesia selalu lengkap) (gaya "Dunia 1900"): daratan abu-abu, garis provinsi putih tipis,
   garis negara lebih tebal, lautan abu gelap. Data dari Natural Earth admin-1 (domain publik), diseleksi dan
   disederhanakan oleh tools/ lalu disimpan di data/world-provinces.js.
2. LANGKAH SEKALI SAJA: buka world.html -> klik tombol "Bangun peta provinsi" (unduhan ±40 MB dari Natural Earth,
   hasilnya disimpan otomatis di browser; tidak perlu menyalin file). Cara manual tetap ada di tools/build-map.html
   atau node tools/build-provinces.js. Tanpa langkah ini peta tampil dalam MODE NEGARA (±175 negara).
   Catatan: tidak lagi memakai d3/topojson dari CDN (penyebab error "peta gagal dimuat" sebelumnya).
3. DUNIA BERPUTAR TANPA BATAS: seret ke kiri/kanan terus-menerus; peta tersambung seperti bola dunia.
4. HANYA INDONESIA TERBUKA. Provinsi lain dapat diklik tetapi menampilkan "masih terkunci". Daftar negara terbuka ada di
   worldlib.js (UNLOCKED_ISO = ["IDN"]); tambahkan kode ISO-3 untuk membuka negara lain.
5. LAHIR DI PROVINSI ACAK (Indonesia) dan menjadi penduduk asli; pemain lama yang berada di wilayah terkunci dipindahkan.
6. SUMBER DAYA: mode "Sumber daya" mewarnai provinsi Indonesia menurut komoditas utama dan memunculkan ikon sumber daya
   (1-3 ikon, makin banyak saat zoom). Stok sumber daya tiap provinsi ada di tab Ringkasan.
7. (SEMENTARA) TAMPILAN NEGARA: tab "Negara" di panel wilayah. Negara TIDAK bisa didirikan dari peta; ia akan lahir dari Partai > Pemilu Parlemen > Pemilu Presiden (belum dibuat).
   Penguasa negara dapat memilih warna daratan, pola bendera, dan dua warna bendera. Di mode "Politik", daratan berwarna dan bendera + nama
   negara tampil di tengah wilayah. Pendiri boleh mengubah warna/bendera kapan saja. API: Game.foundCountry,
   Game.updateCountry, Game.ownerOfRegion. (Syarat dan biaya sementara; sambungkan ke hasil pemberontakan/pemilu nanti.)
8. NAVIGASI DOMAIN di halaman peta: dock kaca transparan di kiri atas (Home, Dunia, Ekonomi, Pers, Politik, Perang);
   hampir transparan saat tidak disentuh, ikon saja di layar kecil.
9. Penerbangan memakai jarak (haversine); dashboard menampilkan negara dan peta mini provinsi; plakat "Dunia, 2026" di
   pojok kanan bawah; zoom hingga 24x; tooltip nama; direktori Benua > Negara > Provinsi (tombol "Direktori").
10. Bug lama diperbaiki: login/daftar menimpa data akun dengan data sesi sebelumnya (kini Game.reloadFromStorage).

FILE BARU
- worldlib.js              : statistik simulasi wilayah (deterministik dari id), jarak, bendera, penempatan awal acak.
- data/world-provinces.js  : data peta (stub kosong sampai kamu membangunnya).
- tools/province-builder.js, tools/build-map.html, tools/build-provinces.js : pembangun peta.

CATATAN DATA
- Natural Earth adalah data skala dunia: Indonesia di sana masih 34 provinsi (belum 38 dengan pemekaran Papua 2022).
  Batas dan nama mengikuti sumber; angka game tetap simulasi, bukan statistik nyata.
- Provinsi yang tidak terpilih tampil sebagai area negara di lapisan dasar (world-atlas, perlu internet).
- ID provinsi stabil selama target pembangunan sama; mengubah --target dapat menghilangkan sebagian id lama,
  dan pemain yang lokasinya hilang akan ditempatkan ulang secara acak.

--------------------------------------------------------------------------------
(Catatan build sebelumnya di bawah ini)

CARA MENJALANKAN
1. Ekstrak seluruh isi ZIP ke satu folder.
2. Buka index.html melalui browser.
3. Daftar akun baru atau masuk menggunakan akun lokal yang sudah dibuat.
4. Simpan seluruh file HTML, JS, dan CSS dalam satu folder. Peta vector dimuat melalui layanan GIS dan CDN saat online.

FILE UTAMA
- index.html       : Login/Daftar dan Dashboard utama.
- inventory.html   : Inventaris dan penyimpanan; pembelian minuman energi.
- achievements.html: Pencapaian dan statistik aktivitas.
- convoy.html      : Slot dan pembangunan bangunan konvoi.
- world.html       : Domain Navigasi Dunia / Peta Dunia.
- world.js         : Interaksi peta, direktori provinsi, panel wilayah, politik, dan perjalanan.
- world.css        : Tampilan khusus domain Peta Dunia.
- core.js          : Sumber data pemain, penyimpanan, aktivitas, dan sistem lintas domain.
- dashboard.js     : Interaksi Dashboard.
- domain.js        : Interaksi domain Inventaris, Pencapaian, dan Konvoi.
- dashboard.css    : Tampilan bersama.
- forex.html       : Domain contoh Valuta Asing.
- news.html        : Domain contoh Pers.

SISTEM HOME DAN NAVIGASI DUNIA
Menu Home berisi Dashboard, Inventaris, Pencapaian, dan Konvoi. Menu Dunia membuka Peta Dunia. Semua domain memakai core.js dan penyimpanan localStorage yang sama.
Peta Dunia membuka 38 provinsi Indonesia. Daftar provinsi mengikuti pembagian administrasi Indonesia yang tersedia pada rilis peta BIG 2025. Negara/wilayah lain masih dikunci. Status 38 provinsi juga ditampilkan oleh Badan Strategi Kebijakan Dalam Negeri Kemendagri pada 2026. Zoom, fokus Indonesia, pencarian, direktori provinsi, dan lapisan peta Perang/Sumber Daya/Embargo/Perdagangan tersedia.
Angka penduduk, penduduk asli, perusahaan, pemain aktif, kapasitas, sumber daya, pajak, konflik, embargo, dan jalur perdagangan pada Build 0.6 adalah DATA SIMULASI untuk balancing game, bukan data statistik nyata.
Panel wilayah memiliki Ringkasan, Kota, Politik, Perbatasan, Kewarganegaraan, dan Perjalanan. Pindah kewarganegaraan mengubah lokasi pemain dan dibatasi cooldown 5 hari. Pemberontakan memerlukan 50 Gold dan minimal 5 pendukung (masih dihitung secara simulasi lokal). Izin kerja dicatat secara lokal. Penerbangan T1/T2/T3 menggunakan Uang lokal dengan durasi 8/4/2 jam; semakin tinggi tier semakin cepat tiba.

INVENTARIS
Bahan mentah: Gandum, Batu, Kayu, Besi, Minyak, Batu bara, Tembaga, Kapas.
Perlengkapan: Senjata, Perisai, Armor.
Kebutuhan: Makanan, Minuman energi, Tiket perjalanan.
Minuman energi dapat dibeli dengan harga 0,1 Gold per unit. Pembelian memeriksa Gold dan kapasitas penyimpanan.

PENCAPAIAN
Aktivitas yang dicatat: jumlah barang yang dibeli di Pasar Global, jumlah serangan perang, total damage perang, total energi yang digunakan, dan UU yang telah disahkan. Aktivitas yang belum benar-benar dilakukan tidak dihitung.
API integrasi untuk domain lain:
- Game.recordActivity("marketPurchases", jumlahBarangBerhasilDibeli)
- Game.recordActivity("warAttacks", 1) setelah serangan benar-benar dilakukan
- Game.recordActivity("warDamage", damageAktual) setelah damage tercatat
- Game.recordActivity("lawsRatified", 1) hanya setelah UU disahkan
Energi yang digunakan melalui Game.useEnergy() dan aktivitas kerja dihitung otomatis ke total energi.

KONVOI
Tiga slot reguler terbuka pada Level 10, Level 30, dan Level 70. Batas level saat ini masih 50, sehingga slot ketiga belum bisa dibuka sebelum batas level dinaikkan. Slot keempat hanya penanda ekspansi mendatang dan tidak dihitung sebagai slot reguler.
- Rumah sakit: bonus pemulihan energi +10%.
- Bengkel bergerak: produksi +8% dan upah +5%.
- Pusat komando: kekuatan dan damage serangan +8%.
- Pusat pendidikan: waktu upgrade stat -10%.
Setiap bangunan memerlukan bahan berbeda; rincian kebutuhan ditampilkan di domain Konvoi. Pembangunan mengurangi bahan dari inventaris.
API efek yang tersedia: Game.getCombatBuffs(), Game.getWageMultiplier(), Game.getUpgradeTimeMultiplier(), Game.getEnergyRestoreMultiplier().

ATURAN PROGRESI YANG DIPERTAHANKAN
- Level 1 sampai 50 untuk build saat ini.
- EXP level berikutnya = level saat ini x 100.
- Setiap level-up menambah maksimum energi 5, tanpa mengisi energi saat ini.
- Kapasitas inventaris +500 setiap mencapai level 10, 20, 30, 40, dan 50.
- Setiap 10 energi menghasilkan 2 Besi dan 5 EXP saat bekerja.
- Build 0.6 menambahkan upah kerja dasar 0,1 Gold per siklus 10 energi. Upah mengikuti multiplier upah konvoi (misalnya Bengkel bergerak +5%). Gold dan total upah tersimpan di profil pemain. Ini adalah reward simulasi lokal; sistem payroll perusahaan/akuntansi server belum ada.
- Makanan memulihkan hingga 10 energi; minuman energi memulihkan hingga 1 energi sebelum buff rumah sakit.
- Upgrade stat: biaya = level stat x 100 Gold; durasi dasar = level stat x 60 detik. Setiap stat memiliki timer independen, sehingga Kekuatan, Pendidikan, dan Ekonomi bisa di-upgrade bersamaan selama saldo Gold cukup untuk membayar masing-masing.
- Chat Global/Region/Negara/Partai sekarang bisa berpindah kanal dan menyimpan pesan lokal per akun; belum menyiarkan pesan ke pemain lain.
- Buff produksi dihitung bertingkat/multiplikatif.

CATATAN PENTING
Ini masih prototype lokal berbasis localStorage, bukan server multiplayer. Akun, chat, kewarganegaraan, izin kerja, penerbangan, dan progres hanya tersimpan di browser/perangkat ini. Password akun demo lokal belum diamankan untuk penggunaan produksi. Jangan gunakan password penting/pribadi.
Data peta provinsi ditampilkan melalui hotspot yang dapat dipilih dan direktori. Gambar latar adalah aset visual dunia yang disediakan pengguna; geometri perbatasan provinsi belum berupa polygon GIS yang dapat di-hit-test. Untuk server multiplayer produksi, data wilayah, saldo, payroll, pemberontakan, chat, dan perjalanan harus divalidasi di backend agar tidak dapat dimodifikasi melalui localStorage.
Domain Pasar Global, Perang, dan Parlemen nantinya wajib memanggil API pencatatan aktivitas di atas ketika aksi sukses agar pencapaian terhitung.


BUILD 0.6 GIS UPDATE
- Peta provinsi menggunakan polygon GeoJSON dari layanan ArcGIS REST BIG, layer Area Batas Wilayah Administrasi Provinsi.
- Data dimuat saat halaman world.html dibuka dan memerlukan koneksi internet. Jika layanan tidak tersedia, titik hotspot provinsi tetap menjadi fallback.
- Geometri sumber: BIG, BATASWILAYAH/BATAS_WILAYAH MapServer layer 12. Atribut nama dicocokkan ke direktori 38 provinsi game.
- Peta GIS diproyeksikan secara visual ke area Indonesia pada peta dunia; bukan proyeksi kartografi untuk pengukuran jarak.

WORLD MAP ENGINE 2.0 — VECTOR GIS UPDATE
========================================
Peta raster world-map.png tidak lagi dipakai sebagai peta utama dan telah
hapus dari paket. Tampilan peta dunia sekarang digambar sebagai SVG vector
dari Natural Earth 1:50m (world-atlas TopoJSON).

Interaksi:
- Drag mouse / satu jari: geser peta setelah zoom-in.
- Scroll wheel / trackpad: zoom mengikuti posisi pointer.
- Pinch dua jari: zoom pada layar sentuh.
- Tombol +/- dan slider: zoom 1x sampai 8x.
- Fokus Indonesia: pindah dan zoom ke kawasan Indonesia.
- Klik polygon provinsi: highlight dan buka panel detail di kanan.
- Klik polygon negara lain: notifikasi wilayah terkunci.

Dependensi runtime (perlu internet saat membuka Peta Dunia):
- topojson-client 3 dari jsDelivr
- d3-geo 3 dari jsDelivr
- world-atlas countries-50m TopoJSON dari jsDelivr
- GeoJSON polygon provinsi dari ArcGIS FeatureServer:
  https://geoportal.pertanian.go.id/arcgis/rest/services/Hosted/Batas_Administrasi_Provinsi/FeatureServer/0

Catatan:
- Ini peta vector GIS di browser, bukan peta gambar PNG.
- Peta dunia memakai geometri Natural Earth 1:50m; garis pantai dan batas
  negara merupakan generalisasi skala dunia, bukan batas kadaster.
- Polygon provinsi memerlukan layanan GIS aktif dan dukungan CORS dari sumber.
  Jika layanan tidak dapat dijangkau, status GIS menampilkan OFFLINE.
- Angka penduduk, perusahaan, kapasitas, pajak, dan sumber daya tetap data
  simulasi game Build 0.6.
- Belum ada backend multiplayer atau API internal server-side; data game
  tetap menggunakan penyimpanan lokal Build 0.6.

Sumber geografi:
- Natural Earth: https://www.naturalearthdata.com/downloads/50m-cultural-vectors/
- World Atlas: https://github.com/topojson/world-atlas
- Geoportal Kementerian Pertanian, layer ADMINISTRASI_AR_PROVINSI_38.
