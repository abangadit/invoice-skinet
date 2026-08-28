export interface HelpStep {
  step: number;
  title: string;
  description: string;
  tip?: string;
  screenshotPlaceholder?: {
    caption: string;
    description: string;
  };
}

export interface HelpFeatureItem {
  name: string;
  description: string;
}

export interface UIElement {
  name: string;
  type: "Tombol" | "Kolom Isian" | "Dropdown" | "Toggle / Switch" | "Tab Navigasi" | "Tabel Data" | "Badge Status";
  description: string;
}

export interface HelpTopic {
  id: string;
  menuKey: string;
  title: string;
  category: string;
  categoryId: string;
  iconName: string;
  badge: string;
  summary: string;
  targetRole: string;
  path: string;
  overview: string;
  workflow: HelpStep[];
  uiGuide?: UIElement[];
  keyFeatures: HelpFeatureItem[];
  tipsAndTricks: string[];
  faq: { question: string; answer: string }[];
}

export interface HelpCategory {
  id: string;
  name: string;
  description: string;
  iconName: string;
}

export const HELP_CATEGORIES: HelpCategory[] = [
  {
    id: "main",
    name: "Menu Utama & POS",
    description: "Pengenalan antarmuka, ringkasan dashboard, dan transaksi kasir harian",
    iconName: "Layers"
  },
  {
    id: "sales",
    name: "Penjualan & Piutang",
    description: "Alur prospek, penawaran, pesanan, pengiriman, invoice dan penagihan",
    iconName: "FileText"
  },
  {
    id: "purchase",
    name: "Pembelian & Gudang",
    description: "Pengelolaan katalog barang, stok gudang, vendor, dan pesanan pembelian",
    iconName: "Package"
  },
  {
    id: "project",
    name: "Proyek & Operasional",
    description: "Pelacakan proyek kerja, tahapan milestone, dan biaya operasional proyek",
    iconName: "Briefcase"
  },
  {
    id: "hr",
    name: "SDM & HR",
    description: "Database karyawan, absensi, pengajuan cuti, reimburse, dan penggajian payroll",
    iconName: "Users"
  },
  {
    id: "finance",
    name: "Akuntansi & Keuangan",
    description: "Bagan akun (COA), pencatatan beban/biaya, buku besar umum, dan aset tetap",
    iconName: "Wallet"
  },
  {
    id: "reports",
    name: "Laporan Bisnis",
    description: "Ekspor dan analitik laporan keuangan, penjualan, stok, absensi, dan kasir",
    iconName: "TrendingUp"
  },
  {
    id: "system",
    name: "Sistem & Pengaturan",
    description: "Profil usaha, nomor seri dokumen, keamanan sesi login, dan hak akses",
    iconName: "Settings"
  }
];

export const HELP_TOPICS: HelpTopic[] = [
  {
    "id": "dashboard",
    "menuKey": "dashboard",
    "title": "Dashboard & Ringkasan Bisnis",
    "category": "Menu Utama & POS",
    "categoryId": "main",
    "iconName": "Layers",
    "badge": "Utama",
    "targetRole": "Semua Pengguna / Owner / Admin",
    "path": "/",
    "summary": "Pusat visualisasi performa bisnis, grafik penjualan, status piutang, dan aktivitas terbaru secara real-time.",
    "overview": "Halaman Dashboard adalah halaman pertama yang tampil setelah login. Halaman ini memberikan rangkuman indikator kinerja utama (KPI) usaha Anda seperti Total Penjualan, Tagihan Belum Terbayar (Unpaid Invoices), Pengeluaran Bulan Ini, serta Peringatan Stok Minimum.",
    "workflow": [
      {
        "step": 1,
        "title": "Pilih Periode Waktu",
        "description": "Gunakan filter tanggal di bagian atas dashboard untuk melihat data Hari Ini, 7 Hari Terakhir, Bulan Ini, atau Kustom.",
        "tip": "Data grafik akan otomatis diperbarui secara instan saat Anda mengganti filter periode.",
        "screenshotPlaceholder": {
          "caption": "Tampilan Ringkasan Metrik Dashboard",
          "description": "Screenshot kartu ringkasan omset, profit estimasi, dan grafik tren mingguan."
        }
      },
      {
        "step": 2,
        "title": "Pantau Notifikasi & Peringatan Penting",
        "description": "Periksa widget peringatan jatuh tempo nota pelanggan dan peringatan produk dengan stok di bawah batas aman.",
        "tip": "Klik langsung pada kartu peringatan stok untuk menuju modul penambahan stok (Restock)."
      },
      {
        "step": 3,
        "title": "Akses Cepat Transaksi",
        "description": "Gunakan tombol aksi cepat di pojok kanan atau sidebar untuk langsung membuat Faktur Baru (+ Buat Invoice) atau buka POS Kasir.",
        "screenshotPlaceholder": {
          "caption": "Aksi Cepat & Navigasi Cepat",
          "description": "Screenshot tombol aksi cepat (+ Invoice Baru, + POS) di dashboard."
        }
      }
    ],
    "uiGuide": [
      {
        "name": "Filter Rentang Waktu",
        "type": "Dropdown",
        "description": "Memilih periode analitik data (Hari Ini, Kemarin, 7 Hari Terakhir, Bulan Ini, Tahun Ini, atau Kustom Tanggal)."
      },
      {
        "name": "Kartu Total Omset / Penjualan",
        "type": "Tabel Data",
        "description": "Menampilkan akumulasi nilai bruto dari seluruh invoice dan transaksi POS dalam periode yang dipilih."
      },
      {
        "name": "Kartu Piutang Belum Lunas (Unpaid)",
        "type": "Badge Status",
        "description": "Total tagihan invoice yang belum dibayar atau masih berstatus cicilan oleh pelanggan."
      },
      {
        "name": "Kartu Total Pengeluaran",
        "type": "Tabel Data",
        "description": "Total beban biaya operasional, pembelian barang, dan reimbursement yang tercatat dalam periode aktif."
      },
      {
        "name": "Grafik Tren Penjualan & Laba",
        "type": "Tabel Data",
        "description": "Grafik batang/garis interaktif yang menunjukkan fluktuasi pendapatan harian/bulanan."
      },
      {
        "name": "Widget Peringatan Stok Minimum",
        "type": "Tabel Data",
        "description": "Daftar barang inventaris yang jumlah fisiknya berada di bawah batas minimum stok yang telah ditentukan."
      },
      {
        "name": "Tombol '+ Buat Invoice'",
        "type": "Tombol",
        "description": "Pintasan cepat untuk langsung membuka formulir pembuatan faktur tagihan penjualan baru."
      },
      {
        "name": "Tombol '+ Buka Kasir POS'",
        "type": "Tombol",
        "description": "Pintasan langsung untuk membuka layar kasir Point of Sale retail."
      }
    ],
    "keyFeatures": [
      {
        "name": "Widget Metrik KPI",
        "description": "Menampilkan kartu total omzet, laba kotor, piutang tertahan, dan kas masuk."
      },
      {
        "name": "Grafik Tren Penjualan",
        "description": "Visualisasi tren penjualan harian dan bulanan untuk analisa pertumbuhan."
      },
      {
        "name": "Peringatan Stok Rendah",
        "description": "Daftar otomatis barang-barang yang kuantitasnya mendekati nol / batas minimum."
      },
      {
        "name": "Feed Aktivitas Terbaru",
        "description": "Riwayat pembuatan invoice dan transaksi terakhir yang dilakukan staf."
      }
    ],
    "tipsAndTricks": [
      "Periksa dashboard setiap pagi untuk memprioritaskan penagihan piutang jatuh tempo hari ini.",
      "Gunakan tombol refresh profil jika data baru belum terupdate karena kendala koneksi."
    ],
    "faq": [
      {
        "question": "Mengapa angka total pendapatan di dashboard belum bertambah?",
        "answer": "Pastikan filter periode tanggal di bagian atas sudah sesuai. Angka penjualan bertambah otomatis saat invoice baru dibuat atau transaksi kasir POS selesai."
      },
      {
        "question": "Apakah staf biasa bisa melihat metrik laba dan pengeluaran?",
        "answer": "Tidak, staf divisi biasa (seperti kasir atau gudang) hanya melihat ringkasan sesuai izin hak akses mereka. Laba kotor hanya tampil untuk Owner dan Admin."
      },
      {
        "question": "Bagaimana cara menyegarkan (refresh) data di dashboard?",
        "answer": "Anda cukup mengubah filter periode tanggal atau memuat ulang halaman browser. Sistem juga memperbarui data secara berkala saat terjadi transaksi baru."
      }
    ]
  },
  {
    "id": "pos",
    "menuKey": "pos",
    "title": "Point of Sale (POS / Kasir)",
    "category": "Menu Utama & POS",
    "categoryId": "main",
    "iconName": "ShoppingCart",
    "badge": "Transaksi Cepat",
    "targetRole": "Kasir / Sales / Admin / Owner",
    "path": "/pos",
    "summary": "Antarmuka kasir cepat untuk melayani transaksi retail, scan barcode, diskon langsung, dan cetak struk nota.",
    "overview": "Modul POS dirancang khusus untuk kecepatan pelayanan kasir langsung di toko fisik atau outlet. Dilengkapi dukungan barcode scanner, tombol pintas kategori produk, keranjang belanja dinamis, modal pembayaran terpadu, kalkulator kembalian, dan cetak struk printer thermal (Bluetooth/USB/Dot Matrix).",
    "workflow": [
      {
        "step": 1,
        "title": "Buka Shift Kasir",
        "description": "Masukkan modal awal (kas awal di laci kasir) sebelum memulai transaksi harian.",
        "tip": "Modal awal penting dicatat untuk mencocokkan laporan penerimaan fisik uang tunai saat tutup kasir di akhir hari.",
        "screenshotPlaceholder": {
          "caption": "Modal Awal Kasir",
          "description": "Screenshot pop-up input kas awal shift kasir."
        }
      },
      {
        "step": 2,
        "title": "Pilih Produk atau Scan Barcode",
        "description": "Klik pada kartu produk, gunakan filter kategori, atau arahkan scanner barcode ke barcode produk untuk memasukkannya ke keranjang.",
        "tip": "Klik item di keranjang untuk mengubah kuantitas atau memberikan diskon per item."
      },
      {
        "step": 3,
        "title": "Buka Popup Pembayaran (Bayar Sekarang)",
        "description": "Klik tombol 'BAYAR SEKARANG' di bawah keranjang belanja. Modal pembayaran akan muncul untuk memilih pelanggan, metode bayar (Tunai, QRIS, Transfer, Debit), serta nominal bayar.",
        "screenshotPlaceholder": {
          "caption": "Antarmuka Kasir & Keranjang Transaksi",
          "description": "Screenshot katalog produk di sebelah kiri dan keranjang belanja dengan tombol Bayar Sekarang."
        }
      },
      {
        "step": 4,
        "title": "Selesaikan & Cetak Struk",
        "description": "Masukkan nominal uang diterima, sistem akan menghitung kembalian otomatis. Klik tombol Selesaikan Pembayaran lalu Cetak Struk (Thermal 58mm/80mm atau Dot Matrix).",
        "tip": "Struk juga dapat dibagikan langsung secara digital melalui WhatsApp pelanggan."
      }
    ],
    "uiGuide": [
      {
        "name": "Kolom Pencarian Produk & Barcode",
        "type": "Kolom Isian",
        "description": "Ketik nama barang, SKU, atau arahkan scanner barcode USB/Bluetooth untuk langsung memasukkan barang ke keranjang."
      },
      {
        "name": "Tombol Filter Kategori Produk",
        "type": "Tab Navigasi",
        "description": "Menyaring daftar produk yang ditampilkan di layar kasir berdasarkan kategori (Makanan, Minuman, Pakaian, Jasa, dll)."
      },
      {
        "name": "Daftar Item Keranjang",
        "type": "Tabel Data",
        "description": "Menampilkan barang yang dipilih, harga satuan, jumlah qty (+/-), subtotal, dan tombol hapus item."
      },
      {
        "name": "Tombol 'Kosongkan Keranjang'",
        "type": "Tombol",
        "description": "Membatalkan seluruh pesanan saat ini dan mengosongkan item keranjang belanja."
      },
      {
        "name": "Tombol 'BAYAR SEKARANG'",
        "type": "Tombol",
        "description": "Membuka popup modal pembayaran untuk menyelesaikan transaksi kasir."
      },
      {
        "name": "Dropdown 'Pilih Pelanggan'",
        "type": "Dropdown",
        "description": "Memilih apakah transaksi dilakukan oleh Pelanggan Umum (Walk-in Guest) atau Member terdaftar untuk akumulasi poin loyalitas."
      },
      {
        "name": "Opsi Metode Pembayaran",
        "type": "Tombol",
        "description": "Pilihan cara pembayaran: Uang Tunai (Cash), QRIS Dinamis/Statis, Transfer Bank BCA/Mandiri/BRI, atau Mesin EDC Debit/Kredit."
      },
      {
        "name": "Kolom 'Nominal Uang Diterima'",
        "type": "Kolom Isian",
        "description": "Nominal uang kertas yang diserahkan pelanggan. Sistem menghitung uang kembalian secara otomatis."
      },
      {
        "name": "Tombol Uang Pas (Nominal Cepat)",
        "type": "Tombol",
        "description": "Pintasan nominal uang pecahan (Uang Pas, 50.000, 100.000, 200.000) untuk mempercepat pengembalian kembalian."
      },
      {
        "name": "Tombol 'Cetak Struk'",
        "type": "Tombol",
        "description": "Mengirim perintah cetak langsung ke printer thermal 58mm/80mm atau printer dot matrix yang terhubung."
      }
    ],
    "keyFeatures": [
      {
        "name": "Pencarian Cepat & Barcode",
        "description": "Mendukung input barcode otomatis dengan auto-add ke keranjang belanja."
      },
      {
        "name": "Diskon & Pajak Otomatis",
        "description": "Pengaturan diskon persentase/nominal per item maupun per total nota."
      },
      {
        "name": "Split Payment / Multi Payment",
        "description": "Fleksibilitas pembayaran sebagian tunai dan sebagian transfer."
      },
      {
        "name": "Manajemen Shift & Rekonsiliasi",
        "description": "Laporan tutup kasir (Z-Report) untuk menghitung selisih kas fisik vs sistem."
      }
    ],
    "tipsAndTricks": [
      "Gunakan tombol sembunyikan sidebar (ikon panah di pojok kiri atas) agar layar katalog kasir menjadi lebih lebar dan lega.",
      "Gunakan browser Chrome pada mode Fullscreen (F11) agar pandangan kasir lebih fokus.",
      "Pastikan ukuran kertas thermal (58mm atau 80mm) telah disesuaikan di Pengaturan Bisnis."
    ],
    "faq": [
      {
        "question": "Bagaimana cara melakukan retur atau pembatalan transaksi kasir?",
        "answer": "Buka menu Riwayat Transaksi POS (/pos/history), cari nomor nota yang bersangkutan, lalu klik tombol 'Void / Retur' dengan memasukkan alasan pembatalan."
      },
      {
        "question": "Apakah stok produk langsung berkurang saat transaksi POS selesai?",
        "answer": "Ya, stok produk di gudang toko/outlet akan langsung terpotong secara realtime begitu pembayaran berhasil."
      },
      {
        "question": "Printer apa saja yang kompatibel dengan modul POS?",
        "answer": "Mendukung semua printer thermal 58mm & 80mm (USB, Bluetooth, LAN) dan Printer Kasir Dot Matrix (Epson TM-U220 / LX-310)."
      }
    ]
  },
  {
    "id": "leads",
    "menuKey": "sales",
    "title": "Prospek & Peluang (Leads)",
    "category": "Penjualan & Piutang",
    "categoryId": "sales",
    "iconName": "Target",
    "badge": "CRM Sales",
    "targetRole": "Sales / Marketing / Admin",
    "path": "/leads",
    "summary": "Manajemen calon pelanggan, tahapan follow-up (pipeline), estimasi nilai peluang, dan konversi ke pelanggan aktif.",
    "overview": "Modul Leads membantu tim penjualan melacak calon pembeli potensial mulai dari kontak pertama hingga siap melakukan pembelian. Anda dapat memantau status prospek dalam tampilan papan Kanban atau tabel data.",
    "workflow": [
      {
        "step": 1,
        "title": "Tambah Prospek Baru",
        "description": "Klik '+ Tambah Prospek', isi nama kontak, nomor WhatsApp/Telepon, nama perusahaan, dan estimasi nilai potensi transaksi.",
        "screenshotPlaceholder": {
          "caption": "Form Input Prospek Baru",
          "description": "Screenshot formulir penambahan data prospek dan sumber referensi."
        }
      },
      {
        "step": 2,
        "title": "Update Status Follow-Up",
        "description": "Geser kartu prospek di Kanban atau ubah statusnya: Baru -> Dihubungi -> Negosiasi -> Tertarik -> Deal / Lost.",
        "tip": "Catat riwayat percakapan atau janji temu di kolom catatan aktivitas."
      },
      {
        "step": 3,
        "title": "Konversi ke Customer & Buat Penawaran",
        "description": "Setelah prospek sepakat (Deal), klik tombol 'Konversi ke Pelanggan' untuk otomatis mendaftarkannya ke master Customer dan membuat Quotation.",
        "screenshotPlaceholder": {
          "caption": "Pipeline Prospek (Kanban Board)",
          "description": "Screenshot tahapan leads dari Baru hingga Deal."
        }
      }
    ],
    "uiGuide": [
      {
        "name": "Tombol '+ Tambah Prospek'",
        "type": "Tombol",
        "description": "Membuka formulir modal untuk mendaftarkan kontak prospek/klien potensial baru."
      },
      {
        "name": "Kolom 'Nama Lengkap / Kontak'",
        "type": "Kolom Isian",
        "description": "Nama personil perwakilan dari calon klien atau nama individu pembeli."
      },
      {
        "name": "Kolom 'Nama Perusahaan / Organisasi'",
        "type": "Kolom Isian",
        "description": "Nama entitas bisnis atau institusi dari prospek bersangkutan."
      },
      {
        "name": "Kolom 'Nomor WhatsApp / Telepon'",
        "type": "Kolom Isian",
        "description": "Nomor kontak aktif untuk kebutuhan follow-up via WhatsApp otomatis."
      },
      {
        "name": "Dropdown 'Sumber Prospek (Lead Source)'",
        "type": "Dropdown",
        "description": "Kanal asal prospek didapatkan (Iklan Medsos, Rekomendasi/Referral, Pameran, Telemarketing, Website, dll)."
      },
      {
        "name": "Kolom 'Estimasi Nilai Prospek (IDR)'",
        "type": "Kolom Isian",
        "description": "Perkiraan nominal anggaran atau nilai potensi kesepakatan transaksi."
      },
      {
        "name": "Tab Tampilan Kanban / Tabel",
        "type": "Tab Navigasi",
        "description": "Beralih antara visualisasi papan kartu geser (Kanban Pipeline) atau daftar baris tabel analitik."
      },
      {
        "name": "Tombol 'Konversi ke Pelanggan'",
        "type": "Tombol",
        "description": "Mengubah status prospek yang sudah 'Deal' menjadi master data Customer resmi."
      }
    ],
    "keyFeatures": [
      {
        "name": "Pipeline Visual Kanban",
        "description": "Memudahkan pemindahan status prospek hanya dengan metode drag and drop."
      },
      {
        "name": "Log Aktivitas Follow-up",
        "description": "Pencatatan panggilan telepon, janji temu demo produk, dan catatan negosiasi."
      },
      {
        "name": "Konversi Otomatis 1-Klik",
        "description": "Menyalin otomatis kontak prospek menjadi data Customer tanpa ketik ulang."
      },
      {
        "name": "Analitik Lead Source",
        "description": "Laporan persentase closing rate berdasarkan kanal marketing yang paling efektif."
      }
    ],
    "tipsAndTricks": [
      "Selalu catat tanggal estimasi closing untuk membantu proyeksi arus kas bulan depan.",
      "Gunakan fitur filter Sales Representative untuk mengevaluasi kinerja masing-masing sales person."
    ],
    "faq": [
      {
        "question": "Apa perbedaan data Prospek (Leads) dengan Pelanggan (Customer)?",
        "answer": "Prospek adalah kontak yang masih dalam tahap penjajakan/penawaran. Pelanggan adalah entitas yang sudah resmi melakukan transaksi atau terikat kontrak."
      },
      {
        "question": "Jika status prospek diubah ke 'Lost', apakah datanya terhapus?",
        "answer": "Tidak. Data tetap disimpan sebagai riwayat analitik kegagalan prospek agar dapat di-follow up ulang di masa depan."
      },
      {
        "question": "Bisakah mengekspor daftar prospek ke format Excel?",
        "answer": "Ya, klik tombol 'Export Excel' di pojok kanan atas tabel data prospek."
      }
    ]
  },
  {
    "id": "quotation",
    "menuKey": "quotation",
    "title": "Surat Penawaran Harga (Quotation)",
    "category": "Penjualan & Piutang",
    "categoryId": "sales",
    "iconName": "FileSpreadsheet",
    "badge": "Penawaran",
    "targetRole": "Sales / Estimator / Admin / Owner",
    "path": "/quotation",
    "summary": "Penyusunan estimasi harga formal kepada klien, masa berlaku penawaran, dan konversi instan ke Sales Order atau Invoice.",
    "overview": "Quotation adalah dokumen resmi penawaran harga dan spesifikasi barang/jasa sebelum klien memutuskan membeli. Sistem memudahkan pembuatan penawaran profesional berlogo, bertanda tangan digital, dengan perhitungan pajak dan diskon otomatis.",
    "workflow": [
      {
        "step": 1,
        "title": "Buat Penawaran Baru",
        "description": "Klik '+ Buat Penawaran', pilih nama pelanggan, nomor referensi, tanggal dokumen, dan masa berlaku (valid until).",
        "screenshotPlaceholder": {
          "caption": "Form Pembuatan Surat Penawaran",
          "description": "Screenshot pengisian daftar item barang, harga penawaran, dan syarat pembayaran."
        }
      },
      {
        "step": 2,
        "title": "Tambahkan Rincian Produk & Biaya",
        "description": "Pilih item dari katalog barang/jasa, tentukan kuantitas, harga khusus penawaran, diskon bertingkat, dan opsi pajak PPN.",
        "tip": "Anda juga dapat mengetik item kustom non-katalog secara langsung."
      },
      {
        "step": 3,
        "title": "Kirim Dokumen & Cetak PDF",
        "description": "Simpan dokumen penawaran. Cetak menjadi PDF berdesain elegan atau kirim link penawaran online melalui WhatsApp/Email.",
        "screenshotPlaceholder": {
          "caption": "Preview PDF Surat Penawaran Resmi",
          "description": "Screenshot layout PDF surat penawaran dengan kop surat dan syarat ketentuan."
        }
      },
      {
        "step": 4,
        "title": "Konversi ke Sales Order / Invoice",
        "description": "Saat pelanggan menyetujui penawaran, klik tombol 'Konversi ke Invoice' atau 'Buat Sales Order' untuk memproses pesanan tanpa ketik ulang.",
        "tip": "Status penawaran akan otomatis berubah menjadi Disetujui (Accepted)."
      }
    ],
    "uiGuide": [
      {
        "name": "Tombol '+ Buat Penawaran'",
        "type": "Tombol",
        "description": "Membuka lembar kerja pembuatan surat penawaran harga baru."
      },
      {
        "name": "Dropdown 'Pilih Pelanggan'",
        "type": "Dropdown",
        "description": "Memilih customer tujuan. Alamat dan kontak akan otomatis terisi pada kop penawaran."
      },
      {
        "name": "Kolom 'Nomor Penawaran'",
        "type": "Kolom Isian",
        "description": "Nomor seri otomatis (misal: SPH/2026/08/001) yang formatnya dapat dikustomisasi di Pengaturan."
      },
      {
        "name": "Kolom 'Tanggal Dokumen & Masa Berlaku'",
        "type": "Kolom Isian",
        "description": "Batas akhir keberlakuan harga penawaran (misal berlaku 14 hari kerja)."
      },
      {
        "name": "Tabel Item Penawaran",
        "type": "Tabel Data",
        "description": "Tabel input produk/jasa, deskripsi rincian, jumlah volume, satuan, harga per unit, diskon %, dan total."
      },
      {
        "name": "Toggle 'Kenakan PPN (Pajak)'",
        "type": "Toggle / Switch",
        "description": "Mengaktifkan perhitungan otomatis PPN (11% atau tarif kustom) pada subtotal penawaran."
      },
      {
        "name": "Kolom 'Syarat & Ketentuan (Terms)'",
        "type": "Kolom Isian",
        "description": "Catatan khusus garansi, metode pengiriman, ketentuan DP, dan nomor rekening pembayaran."
      },
      {
        "name": "Tombol 'Konversi ke Invoice / Sales Order'",
        "type": "Tombol",
        "description": "Mengubah penawaran menjadi tagihan faktur penjualan resmi secara otomatis."
      }
    ],
    "keyFeatures": [
      {
        "name": "Generator PDF Profesional",
        "description": "Mencetak dokumen penawaran siap kirim dengan logo usaha, watermark status, dan tanda tangan."
      },
      {
        "name": "Pelacakan Status Penawaran",
        "description": "Status Draft, Terkirim, Diterima (Accepted), Ditolak (Rejected), dan Kedaluwarsa (Expired)."
      },
      {
        "name": "Konversi Instan ke Invoice",
        "description": "Menghemat waktu administrasi tanpa risiko kesalahan ketik ulang nominal barang."
      },
      {
        "name": "Kirim via WhatsApp",
        "description": "Menyediakan tautan langsung untuk mengirim pesan WA berisi ringkasan penawaran kepada klien."
      }
    ],
    "tipsAndTricks": [
      "Selalu isi masa berlaku penawaran untuk melindungi margin bisnis Anda dari fluktuasi harga bahan baku.",
      "Gunakan template syarat & ketentuan default di menu Pengaturan agar tidak perlu mengetik ulang setiap kali membuat penawaran."
    ],
    "faq": [
      {
        "question": "Apakah penawaran harga akan memotong stok barang di gudang?",
        "answer": "Tidak. Quotation hanya berupa penawaran harga administratif dan tidak mempengaruhi jumlah stok fisik gudang."
      },
      {
        "question": "Bagaimana jika klien meminta revisi harga pada penawaran?",
        "answer": "Buka detail penawaran, klik tombol 'Edit Penawaran', lakukan penyesuaian harga item, lalu simpan dan cetak ulang revisi dokumen."
      },
      {
        "question": "Apakah penawaran yang sudah dikonversi ke Invoice bisa diedit?",
        "answer": "Bisa, namun sebaiknya revisi dilakukan pada dokumen Invoice hasil konversinya agar sinkron dengan bagian keuangan."
      }
    ]
  },
  {
    "id": "sales",
    "menuKey": "sales",
    "title": "Pesanan Penjualan (Sales Orders)",
    "category": "Penjualan & Piutang",
    "categoryId": "sales",
    "iconName": "ClipboardCheck",
    "badge": "Pesanan",
    "targetRole": "Sales / Warehouse / Admin",
    "path": "/sales",
    "summary": "Pencatatan pesanan resmi dari pembeli sebelum barang dikirim dan faktur diterbitkan.",
    "overview": "Sales Order (SO) berfungsi sebagai bukti kesepakatan pemesanan barang/jasa dari pelanggan. SO menjadi rujukan bagi tim gudang untuk menyiapkan pengiriman (Surat Jalan) dan bagian keuangan untuk menerbitkan faktur.",
    "workflow": [
      {
        "step": 1,
        "title": "Buat Sales Order Baru",
        "description": "Klik '+ Buat Pesanan', pilih pelanggan dan masukkan item barang yang dipesan beserta jadwal pengiriman yang diminta.",
        "screenshotPlaceholder": {
          "caption": "Form Sales Order",
          "description": "Screenshot pembuatan Sales Order dari konversi penawaran atau input manual."
        }
      },
      {
        "step": 2,
        "title": "Verifikasi Ketersediaan Stok",
        "description": "Sistem akan menampilkan indikator ketersediaan stok fisik di gudang untuk setiap item yang dipesan.",
        "tip": "Jika stok tidak mencukupi, sistem akan memberi opsi untuk membuat Purchase Order ke supplier."
      },
      {
        "step": 3,
        "title": "Proses Pengiriman (Surat Jalan)",
        "description": "Klik tombol 'Buat Surat Jalan / Delivery Order' untuk menginstruksikan tim gudang dan kurir melakukan pengantaran barang.",
        "screenshotPlaceholder": {
          "caption": "Status Pemenuhan Pesanan (Fulfillment)",
          "description": "Screenshot progress pengiriman sebagian (Partial Delivery) atau selesai penuh."
        }
      }
    ],
    "uiGuide": [
      {
        "name": "Tombol '+ Buat Sales Order'",
        "type": "Tombol",
        "description": "Membuka formulir input pesanan penjualan baru."
      },
      {
        "name": "Kolom 'Nomor SO'",
        "type": "Kolom Isian",
        "description": "Nomor referensi pesanan penjualan (misal: SO-2026-0012)."
      },
      {
        "name": "Dropdown 'Pilih Gudang Pengeluaran'",
        "type": "Dropdown",
        "description": "Menentukan gudang asal barang yang akan dialokasikan untuk pesanan ini."
      },
      {
        "name": "Badge Status Pemenuhan (Fulfillment)",
        "type": "Badge Status",
        "description": "Menunjukkan status logistik pesanan: Menunggu Diproses, Dikirim Sebagian (Partial), atau Selesai Dikirim (Fulfilled)."
      },
      {
        "name": "Tombol 'Buat Surat Jalan (DO)'",
        "type": "Tombol",
        "description": "Menerbitkan surat jalan pengiriman untuk tim logistik."
      },
      {
        "name": "Tombol 'Terbitkan Invoice'",
        "type": "Tombol",
        "description": "Membuat tagihan faktur penjualan berdasarkan item yang telah dipesan."
      }
    ],
    "keyFeatures": [
      {
        "name": "Alokasi Stok Otomatis",
        "description": "Mengunci kuantitas stok barang agar tidak terjual ganda ke pelanggan lain."
      },
      {
        "name": "Pengiriman Parsial (Partial Fulfillment)",
        "description": "Mendukung pengiriman bertahap jika barang dikirim dalam beberapa kali pengantaran."
      },
      {
        "name": "Integrasi Dokumen Lengkap",
        "description": "Tautan otomatis dari Prospek -> Penawaran -> Sales Order -> Surat Jalan -> Invoice."
      }
    ],
    "tipsAndTricks": [
      "Periksa kolom 'Status Pengiriman' secara berkala untuk memantau pesanan yang belum terkirim ke pelanggan.",
      "Gunakan catatan internal untuk menginformasikan instruksi packing khusus kepada tim gudang."
    ],
    "faq": [
      {
        "question": "Kapan stok barang resmi berkurang?",
        "answer": "Stok barang resmi berkurang dari gudang saat Surat Jalan (Delivery Order) berstatus Terkirim atau saat Invoice POS diterbitkan."
      },
      {
        "question": "Bisakah satu Sales Order dibuatkan beberapa Surat Jalan?",
        "answer": "Bisa. Anda dapat mengirimkan sebagian kuantitas terlebih dahulu, dan sisanya dibuatkan surat jalan kedua."
      }
    ]
  },
  {
    "id": "delivery",
    "menuKey": "delivery",
    "title": "Surat Jalan & Pengiriman (Delivery Orders)",
    "category": "Penjualan & Piutang",
    "categoryId": "sales",
    "iconName": "Truck",
    "badge": "Logistik",
    "targetRole": "Gudang / Kurir / Logistik / Admin",
    "path": "/delivery",
    "summary": "Dokumen pengantar barang resmi, instruksi pengemasan ekspedisi, bukti serah terima, dan pemotongan stok fisik.",
    "overview": "Surat Jalan (Delivery Order / DO) adalah dokumen sah yang menyertai barang saat dikirim dari gudang menuju alamat penerima. Dokumen ini memuat detail barang tanpa menampilkan nominal harga dan dilengkapi kolom tanda tangan kurir serta penerima barang.",
    "workflow": [
      {
        "step": 1,
        "title": "Buat Surat Jalan dari Pesanan",
        "description": "Pilih nomor Sales Order atau buat pengiriman langsung, pilih alamat pengantaran dan nama armada/kurir pengirim.",
        "screenshotPlaceholder": {
          "caption": "Form Surat Jalan Pengiriman",
          "description": "Screenshot rincian barang yang akan dimuat ke kendaraan dan nama driver/ekspedisi."
        }
      },
      {
        "step": 2,
        "title": "Cetak Surat Jalan Fisik",
        "description": "Cetak rangkap dokumen (untuk arsip gudang, kurir, dan tanda terima pelanggan) dan serahkan bersama barang kepada kurir.",
        "tip": "Format cetak telah dioptimasi untuk printer continuous form Dot Matrix maupun printer laser A4."
      },
      {
        "step": 3,
        "title": "Konfirmasi Serah Terima (POD)",
        "description": "Setelah barang sampai dan ditandatangani pelanggan, ubah status menjadi 'Terkirim / Selesai' dan unggah foto bukti serah terima (Proof of Delivery).",
        "screenshotPlaceholder": {
          "caption": "Konfirmasi Bukti Penerimaan Barang",
          "description": "Screenshot status Surat Jalan yang telah ditandatangani dan selesai."
        }
      }
    ],
    "uiGuide": [
      {
        "name": "Tombol '+ Buat Surat Jalan'",
        "type": "Tombol",
        "description": "Membuka formulir pembuatan dokumen pengiriman baru."
      },
      {
        "name": "Kolom 'Nomor Surat Jalan'",
        "type": "Kolom Isian",
        "description": "Nomor identifikasi surat jalan (misal: SJ/2026/08/005)."
      },
      {
        "name": "Kolom 'Nama Pengemudi / Ekspedisi'",
        "type": "Kolom Isian",
        "description": "Nama driver internal atau nama ekspedisi pihak ketiga (JNE, J&T, SiCepat, Lalamove, dll)."
      },
      {
        "name": "Kolom 'Nomor Plat Kendaraan / No Resi'",
        "type": "Kolom Isian",
        "description": "Nomor plat mobil pengantar atau nomor resi pelacakan ekspedisi."
      },
      {
        "name": "Tabel Item Pengiriman",
        "type": "Tabel Data",
        "description": "Daftar barang dan kuantitas fisik yang dimasukkan ke dalam armada pengiriman."
      },
      {
        "name": "Tombol 'Cetak Surat Jalan (A4 / Dot Matrix)'",
        "type": "Tombol",
        "description": "Mencetak dokumen resmi surat jalan 3 rangkap untuk serah terima fisik."
      },
      {
        "name": "Tombol 'Konfirmasi Diterima'",
        "type": "Tombol",
        "description": "Mengubah status surat jalan menjadi 'Selesai' setelah ditandatangani oleh penerima."
      }
    ],
    "keyFeatures": [
      {
        "name": "Cetak Standar Industri",
        "description": "Layout siap cetak tanpa nominal harga untuk menjaga kerahasiaan harga saat diantar kurir."
      },
      {
        "name": "Pelacakan No Resi & Armada",
        "description": "Pencatatan nomor kendaraan dan resi ekspedisi untuk monitoring status kiriman."
      },
      {
        "name": "Pengurangan Stok Riil",
        "description": "Mengurangi saldo inventaris gudang secara akurat pada saat pengiriman divalidasi."
      }
    ],
    "tipsAndTricks": [
      "Pastikan selalu meminta tanda tangan dan stempel basah penerima pada lembar kedua surat jalan sebagai bukti penagihan invoice.",
      "Gunakan fitur lampiran foto untuk mengunggah foto paket yang telah diterima customer di lokasi."
    ],
    "faq": [
      {
        "question": "Apakah harga produk ditampilkan di lembar Surat Jalan?",
        "answer": "Secara default tidak. Surat Jalan difokuskan untuk bagian logistik dan penerima gudang sehingga hanya menampilkan kuantitas, deskripsi barang, dan nomor seri."
      },
      {
        "question": "Bagaimana jika ada barang yang rusak atau ditolak saat sampai?",
        "answer": "Ubah kuantitas barang yang diterima di sistem, dan buatkan Surat Jalan pengganti atau catat retur penjualan."
      }
    ]
  },
  {
    "id": "invoice",
    "menuKey": "invoice",
    "title": "Faktur Penjualan (Invoices)",
    "category": "Penjualan & Piutang",
    "categoryId": "sales",
    "iconName": "FileText",
    "badge": "Penagihan",
    "targetRole": "Finance / Admin / Owner",
    "path": "/invoice",
    "summary": "Penerbitan faktur tagihan resmi, perhitungan jatuh tempo, pajak PPN, pengiriman tagihan WhatsApp, dan pelacakan pembayaran.",
    "overview": "Modul Invoice adalah inti dari pencatatan piutang dan arus kas penjualan usaha Anda. Anda dapat menerbitkan faktur dengan berbagai opsi termin pembayaran (Cash on Delivery, Net 7, Net 15, Net 30, Net 60), menambahkan diskon, biaya ongkos kirim, serta memantau status lunas/terlambat.",
    "workflow": [
      {
        "step": 1,
        "title": "Buat Invoice Baru",
        "description": "Klik '+ Buat Invoice', pilih pelanggan, tentukan tanggal invoice, dan pilih termin pembayaran (misal: Net 30).",
        "screenshotPlaceholder": {
          "caption": "Form Pembuatan Invoice Tagihan",
          "description": "Screenshot pengisian formulir invoice baru dengan nomor seri dan rincian produk."
        }
      },
      {
        "step": 2,
        "title": "Input Rincian Barang / Jasa",
        "description": "Tambahkan barang dari katalog atau ketik deskripsi pekerjaan jasa, tentukan harga, diskon, dan centang PPN jika dikenakan pajak.",
        "tip": "Sistem otomatis menghitung subtotal, diskon global, pajak, dan grand total penagihan."
      },
      {
        "step": 3,
        "title": "Kirim Tagihan ke Pelanggan",
        "description": "Simpan invoice, lalu klik 'Kirim WhatsApp' untuk mengirim pesan pengingat tagihan dengan link invoice online atau cetak PDF.",
        "screenshotPlaceholder": {
          "caption": "Dokumen Faktur PDF & Opsi Pembayaran",
          "description": "Screenshot PDF Invoice resmi lengkap dengan instruksi transfer bank dan QRIS."
        }
      },
      {
        "step": 4,
        "title": "Catat Pembayaran Masuk",
        "description": "Saat pelanggan mentransfer dana, klik tombol 'Catat Pembayaran', pilih akun bank penampung, dan masukkan nominal yang diterima.",
        "tip": "Status invoice akan otomatis berubah menjadi 'Lunas (Paid)' atau 'Dibayar Sebagian (Partial)'."
      }
    ],
    "uiGuide": [
      {
        "name": "Tombol '+ Buat Invoice'",
        "type": "Tombol",
        "description": "Membuka halaman formulir pembuatan faktur tagihan penjualan baru."
      },
      {
        "name": "Dropdown 'Pilih Pelanggan'",
        "type": "Dropdown",
        "description": "Memilih customer tujuan tagihan. Data email, alamat, dan nomor HP akan terisi otomatis."
      },
      {
        "name": "Kolom 'Nomor Invoice'",
        "type": "Kolom Isian",
        "description": "Nomor seri faktur unik (misal: INV-202608-0021) dengan format penomoran otomatis."
      },
      {
        "name": "Dropdown 'Termin Pembayaran (Terms)'",
        "type": "Dropdown",
        "description": "Ketentuan jatuh tempo pembayaran (Jatuh Tempo Langsung, Net 7, Net 14, Net 30, Net 60, Akhir Bulan)."
      },
      {
        "name": "Kolom 'Tanggal Jatuh Tempo (Due Date)'",
        "type": "Kolom Isian",
        "description": "Tanggal batas akhir pembayaran yang dihitung otomatis dari termin atau ditentukan manual."
      },
      {
        "name": "Tabel Item Tagihan",
        "type": "Tabel Data",
        "description": "Daftar produk/jasa yang ditagihkan lengkap dengan kolom Kuantitas, Satuan, Harga Unit, Diskon, dan Subtotal."
      },
      {
        "name": "Toggle 'Kenakan PPN (Pajak Penjualan)'",
        "type": "Toggle / Switch",
        "description": "Mengaktifkan pajak pertambahan nilai (PPN) secara otomatis pada total tagihan."
      },
      {
        "name": "Kolom 'Biaya Pengiriman / Tambahan'",
        "type": "Kolom Isian",
        "description": "Nominal ongkos kirim atau biaya penanganan tambahan di luar harga produk."
      },
      {
        "name": "Kolom 'Catatan & Rekening Bank'",
        "type": "Kolom Isian",
        "description": "Instruksi transfer bank penerima (BCA, Mandiri, dll) dan pesan terima kasih kepada klien."
      },
      {
        "name": "Tombol 'Catat Pembayaran (Pay)'",
        "type": "Tombol",
        "description": "Membuka modal pencatatan bukti transfer atau pembayaran tunai dari pelanggan."
      },
      {
        "name": "Tombol 'Kirim WhatsApp'",
        "type": "Tombol",
        "description": "Membuka WhatsApp Web / Aplikasi dengan draf pesan penagihan dan tautan faktur."
      }
    ],
    "keyFeatures": [
      {
        "name": "Portal Invoice Online",
        "description": "Pelanggan dapat membuka link tagihan interaktif dan mengunduh struk nota secara mandiri."
      },
      {
        "name": "Pengingat Jatuh Tempo Otomatis",
        "description": "Notifikasi visual untuk faktur yang mendekati atau telah melewati batas jatuh tempo."
      },
      {
        "name": "Pembayaran Bertahap (Cicilan)",
        "description": "Mencatat pembayaran termin/DP bertahap hingga seluruh sisa saldo lunas."
      },
      {
        "name": "Integrasi Jurnal Keuangan",
        "description": "Otomatis membukukan jurnal piutang usaha dan pendapatan ke modul Akuntansi."
      }
    ],
    "tipsAndTricks": [
      "Gunakan tombol 'Salin Link Invoice' untuk membagikan faktur melalui chat atau email dalam 1 klik.",
      "Atur rekening bank penerima utama di menu Pengaturan agar otomatis muncul pada setiap faktur baru."
    ],
    "faq": [
      {
        "question": "Apakah invoice yang sudah berstatus 'Lunas' masih bisa diubah rinciannya?",
        "answer": "Demi integritas pembukuan akuntansi, invoice yang sudah lunas tidak disarankan diubah. Anda perlu membatalkan/menghapus pembayaran terkait terlebih dahulu jika ingin mengedit item."
      },
      {
        "question": "Bagaimana cara memberi diskon nominal langsung (bukan persentase)?",
        "answer": "Anda dapat memasukkan nominal diskon langsung pada kolom 'Diskon Faktur (Rp)' di bagian bawah ringkasan total tagihan."
      },
      {
        "question": "Apakah format nomor invoice bisa disesuaikan dengan pola perusahaan kami?",
        "answer": "Bisa. Anda dapat mengatur prefiks, format tahun/bulan, dan nomor urut di menu Pengaturan -> Nomor Seri Dokumen."
      }
    ]
  },
  {
    "id": "invoice_due",
    "menuKey": "invoice",
    "title": "Monitoring Jatuh Tempo Piutang",
    "category": "Penjualan & Piutang",
    "categoryId": "sales",
    "iconName": "Clock",
    "badge": "Piutang",
    "targetRole": "Finance / Collector / Admin",
    "path": "/invoice?filter=due",
    "summary": "Pemantauan khusus tagihan yang mendekati jatuh tempo dan faktur menunggak (overdue).",
    "overview": "Fitur Monitoring Jatuh Tempo menyaring seluruh invoice yang belum lunas berdasarkan umur piutang (Aging Receivables): Jatuh Tempo Hari Ini, Lewat 1-30 Hari, Lewat 31-60 Hari, dan Menunggak >60 Hari. Memudahkan tim penagihan memprioritaskan follow-up.",
    "workflow": [
      {
        "step": 1,
        "title": "Buka Filter Tagihan Menunggak",
        "description": "Di halaman Invoice, klik tab filter 'Jatuh Tempo' atau 'Lewat Jatuh Tempo (Overdue)'.",
        "screenshotPlaceholder": {
          "caption": "Daftar Piutang Jatuh Tempo",
          "description": "Screenshot tabel invoice dengan highlight warna merah pada tagihan yang lewat jatuh tempo."
        }
      },
      {
        "step": 2,
        "title": "Kirim Pesan Pengingat (Reminder)",
        "description": "Klik ikon WhatsApp di baris tagihan untuk mengirim draf pesan pengingat sopan kepada penanggung jawab pembayaran klien.",
        "tip": "Pesan otomatis memuat nomor invoice, sisa saldo yang harus dibayar, dan link faktur."
      }
    ],
    "uiGuide": [
      {
        "name": "Tab Filter 'Jatuh Tempo Hari Ini'",
        "type": "Tab Navigasi",
        "description": "Menampilkan seluruh nota yang batas akhir pembayarannya adalah hari ini."
      },
      {
        "name": "Tab Filter 'Overdue / Menunggak'",
        "type": "Tab Navigasi",
        "description": "Menampilkan daftar tagihan yang telah melewati tanggal jatuh tempo dan belum dilunasi."
      },
      {
        "name": "Badge Umur Piutang (Aging Badge)",
        "type": "Badge Status",
        "description": "Label warna merah/oranye yang menunjukkan berapa hari tagihan telah terlambat."
      },
      {
        "name": "Tombol 'Kirim Pengingat WhatsApp'",
        "type": "Tombol",
        "description": "Mengirimkan template pesan pengingat tagihan ramah dan profesional dalam 1 klik."
      }
    ],
    "keyFeatures": [
      {
        "name": "Analisis Umur Piutang",
        "description": "Mengkategorikan risiko piutang berdasarkan lama hari keterlambatan pembayaran."
      },
      {
        "name": "Pintasan Pengingat WA 1-Klik",
        "description": "Mempercepat tim collection menagih puluhan pelanggan tanpa ketik manual."
      }
    ],
    "tipsAndTricks": [
      "Jadwalkan pengiriman pesan pengingat 3 hari sebelum jatuh tempo untuk meminimalkan risiko keterlambatan pembayaran."
    ],
    "faq": [
      {
        "question": "Apakah sistem mengirim WhatsApp otomatis sendiri ke customer?",
        "answer": "Saat ini sistem menyiapkan tombol kirim langsung ke WhatsApp Web / Aplikasi Anda untuk memastikan kontrol penuh pesan tetap di tangan Anda."
      }
    ]
  },
  {
    "id": "payment",
    "menuKey": "payment",
    "title": "Pembayaran & Kas Masuk (Payments)",
    "category": "Penjualan & Piutang",
    "categoryId": "sales",
    "iconName": "CreditCard",
    "badge": "Keuangan",
    "targetRole": "Kasir / Finance / Admin",
    "path": "/payment",
    "summary": "Pencatatan riwayat pembayaran masuk dari pelanggan, rekonsiliasi bank, dan kuitansi penerimaan.",
    "overview": "Modul Pembayaran merekam setiap mutasi kas masuk yang melunasi faktur pelanggan. Dilengkapi pencatatan nomor referensi bank, metode pembayaran, akun bank tujuan, dan cetak kuitansi resmi.",
    "workflow": [
      {
        "step": 1,
        "title": "Pilih Invoice yang Dibayar",
        "description": "Cari invoice terkait melalui nomor faktur atau nama pelanggan.",
        "screenshotPlaceholder": {
          "caption": "Form Pencatatan Pembayaran Masuk",
          "description": "Screenshot modal pengisian nominal dana masuk dan pemilihan rekening bank penerima."
        }
      },
      {
        "step": 2,
        "title": "Isi Nominal & Akun Bank Penerima",
        "description": "Masukkan jumlah uang yang diterima, pilih akun kas/bank penampung (misal Kas Toko, Rekening BCA), dan unggah bukti transfer jika ada.",
        "tip": "Sistem otomatis mengupdate sisa tagihan pada invoice bersangkutan."
      },
      {
        "step": 3,
        "title": "Cetak Kuitansi Resmi",
        "description": "Cetak dokumen kuitansi penerimaan pembayaran bermaterai/bernomor seri untuk diserahkan ke pelanggan.",
        "screenshotPlaceholder": {
          "caption": "Bukti Kuitansi Pembayaran Lunas",
          "description": "Screenshot tanda terima kuitansi pembayaran resmi."
        }
      }
    ],
    "uiGuide": [
      {
        "name": "Tombol '+ Catat Pembayaran'",
        "type": "Tombol",
        "description": "Membuka formulir penerimaan kas masuk dari pelanggan."
      },
      {
        "name": "Dropdown 'Pilih Akun Kas / Bank'",
        "type": "Dropdown",
        "description": "Menentukan rekening tujuan penerimaan dana (Kas Kasir, Bank BCA, Bank Mandiri, dll)."
      },
      {
        "name": "Kolom 'Nominal Pembayaran'",
        "type": "Kolom Isian",
        "description": "Jumlah uang yang dibayarkan oleh klien."
      },
      {
        "name": "Kolom 'Nomor Referensi / Ref Bank'",
        "type": "Kolom Isian",
        "description": "Nomor transaksi transfer bank atau kode transaksi EDC/QRIS."
      },
      {
        "name": "Kolom 'Upload Bukti Transfer'",
        "type": "Kolom Isian",
        "description": "Mengunggah foto/dokumen slip bukti transfer bank dari pelanggan."
      },
      {
        "name": "Tombol 'Cetak Kuitansi'",
        "type": "Tombol",
        "description": "Mencetak bukti kuitansi tanda terima sah berlogo perusahaan."
      }
    ],
    "keyFeatures": [
      {
        "name": "Riwayat Transaksi Lengkap",
        "description": "Semua pembayaran terekam rapi dan dapat ditelusuri riwayat per pelanggan."
      },
      {
        "name": "Kuitansi Otomatis",
        "description": "Menerbitkan kuitansi berformat profesional dalam hitungan detik."
      },
      {
        "name": "Sinkronisasi Buku Kas",
        "description": "Saldo akun kas/bank akan bertambah secara otomatis sesuai nominal yang dibukukan."
      }
    ],
    "tipsAndTricks": [
      "Selalu lampirkan nomor referensi bank untuk mempermudah proses rekonsiliasi rekening koran di akhir bulan."
    ],
    "faq": [
      {
        "question": "Bagaimana jika kasir salah menginput nominal pembayaran?",
        "answer": "Buka menu Pembayaran, cari transaksi bersangkutan, klik tombol Hapus/Batalkan. Status saldo invoice akan otomatis kembali seperti semula."
      }
    ]
  },
  {
    "id": "customer",
    "menuKey": "customer",
    "title": "Database Pelanggan (Customers)",
    "category": "Penjualan & Piutang",
    "categoryId": "sales",
    "iconName": "Users",
    "badge": "Master Data",
    "targetRole": "Sales / CRM / Admin",
    "path": "/customer",
    "summary": "Master data pelanggan, kontak person, batas kredit (credit limit), riwayat transaksi, dan poin loyalitas.",
    "overview": "Modul Pelanggan mengelola direktori profil klien perorangan maupun korporat (B2B). Anda dapat mengatur batas limit piutang, termin pembayaran khusus pelanggan, nomor NPWP untuk faktur pajak, serta memantau riwayat seluruh pembelian mereka.",
    "workflow": [
      {
        "step": 1,
        "title": "Tambah Data Pelanggan Baru",
        "description": "Klik '+ Tambah Pelanggan', lengkapi nama perusahaan, nama kontak PIC, nomor WhatsApp, email, dan alamat pengiriman.",
        "screenshotPlaceholder": {
          "caption": "Form Master Pelanggan",
          "description": "Screenshot pengisian informasi kontak, alamat penagihan, dan NPWP pelanggan."
        }
      },
      {
        "step": 2,
        "title": "Atur Batas Kredit & Ketentuan Khusus",
        "description": "Tentukan limit maksimal piutang (Credit Limit) dan termin pembayaran default (misal Net 30) untuk pelanggan B2B.",
        "tip": "Sistem akan memberi peringatan jika invoice baru melebihi batas kredit pelanggan tersebut."
      },
      {
        "step": 3,
        "title": "Pantau Buku Pembantu Piutang (Statement)",
        "description": "Buka detail pelanggan untuk melihat riwayat invoice yang belum dibayar, total belanja seumur hidup (Lifetime Value), dan poin member.",
        "screenshotPlaceholder": {
          "caption": "Profil Lengkap Pelanggan & Riwayat Piutang",
          "description": "Screenshot rincian kartu profil pelanggan dan daftar invoice terkait."
        }
      }
    ],
    "uiGuide": [
      {
        "name": "Tombol '+ Tambah Pelanggan'",
        "type": "Tombol",
        "description": "Membuka formulir pendaftaran profil pelanggan baru."
      },
      {
        "name": "Kolom 'Nama Pelanggan / Perusahaan'",
        "type": "Kolom Isian",
        "description": "Nama entitas atau nama lengkap pembeli."
      },
      {
        "name": "Kolom 'Nomor WhatsApp / HP'",
        "type": "Kolom Isian",
        "description": "Nomor kontak utama untuk pengiriman notifikasi invoice dan promo."
      },
      {
        "name": "Kolom 'Email'",
        "type": "Kolom Isian",
        "description": "Alamat surat elektronik untuk pengiriman dokumen resmi."
      },
      {
        "name": "Kolom 'Alamat Lengkap Penagihan & Pengiriman'",
        "type": "Kolom Isian",
        "description": "Alamat fisik untuk keperluan pencetakan pada invoice dan surat jalan."
      },
      {
        "name": "Kolom 'Nomor NPWP'",
        "type": "Kolom Isian",
        "description": "Nomor Pokok Wajib Pajak untuk penerbitan faktur pajak elektronik."
      },
      {
        "name": "Kolom 'Batas Kredit (Credit Limit)'",
        "type": "Kolom Isian",
        "description": "Batas plafon maksimal total piutang yang diizinkan untuk customer ini."
      },
      {
        "name": "Tombol 'Cetak Rekening Koran (Statement)'",
        "type": "Tombol",
        "description": "Mencetak ringkasan mutasi piutang dan pembayaran pelanggan dalam format PDF."
      }
    ],
    "keyFeatures": [
      {
        "name": "Pencegahan Over-Limit Piutang",
        "description": "Peringatan otomatis saat membuat transaksi jika hutang pelanggan sudah melewati batas limit."
      },
      {
        "name": "Kartu Statement Piutang",
        "description": "Cetak rekap tagihan pelanggan dalam 1 dokumen rangkuman untuk memudahkan rekonsiliasi B2B."
      },
      {
        "name": "Poin Loyalitas Member",
        "description": "Pemberian poin otomatis dari setiap transaksi belanja yang dapat ditukarkan diskon."
      }
    ],
    "tipsAndTricks": [
      "Pastikan nomor WhatsApp diawali format kode negara (misal: 62812xxx) agar tombol kirim WA otomatis berfungsi sempurna."
    ],
    "faq": [
      {
        "question": "Bisakah satu pelanggan memiliki beberapa alamat pengiriman berbeda?",
        "answer": "Bisa. Anda dapat mencatat alamat utama di profil pelanggan dan mengubah alamat spesifik saat membuat Surat Jalan."
      },
      {
        "question": "Bagaimana cara melihat total hutang seorang pelanggan?",
        "answer": "Buka menu Pelanggan, cari nama customer bersangkutan, total piutang aktif akan tampil di kolom 'Saldo Piutang'."
      }
    ]
  },
  {
    "id": "project",
    "menuKey": "project",
    "title": "Manajemen Proyek & Operasional",
    "category": "Proyek & Operasional",
    "categoryId": "project",
    "iconName": "Briefcase",
    "badge": "Proyek",
    "targetRole": "Project Manager / Tim Lapangan / Owner",
    "path": "/project",
    "summary": "Perencanaan proyek, tahapan milestone, pencatatan waktu kerja (time log), dan pelacakan laba rugi per proyek.",
    "overview": "Modul Proyek dirancang untuk bisnis berbasis jasa, kontraktor, event organizer, software house, atau agensi. Memungkinkan Anda melacak progres penyelesaian pekerjaan, mengalokasikan staf, mencatat biaya material/operasional langsung ke proyek, dan membandingkan anggaran (Budget) vs Realisasi Biaya.",
    "workflow": [
      {
        "step": 1,
        "title": "Buat Proyek Baru",
        "description": "Klik '+ Buat Proyek', tentukan nama proyek, klien pemilik, tanggal mulai, target selesai, dan total nilai kontrak.",
        "screenshotPlaceholder": {
          "caption": "Form Input Proyek Baru",
          "description": "Screenshot pembuatan proyek dengan estimasi anggaran biaya dan tenggat waktu."
        }
      },
      {
        "step": 2,
        "title": "Bagi Tahapan Pekerjaan (Milestone)",
        "description": "Buat rincian tahapan milestone (misal: Perencanaan -> Pengadaan Material -> Instalasi Lapangan -> Serah Terima).",
        "tip": "Milestone dapat dihubungkan dengan jadwal termin penagihan invoice proyek."
      },
      {
        "step": 3,
        "title": "Catat Pengeluaran & Biaya Proyek",
        "description": "Setiap ada pembelian bahan atau biaya tukang/staf, hubungkan pengeluaran tersebut ke nama proyek untuk menghitung profitabilitas proyek secara presisi.",
        "screenshotPlaceholder": {
          "caption": "Laporan Laba Rugi Per Proyek (Profitability)",
          "description": "Screenshot perbandingan nilai kontrak invoice vs total pengeluaran riil proyek."
        }
      }
    ],
    "uiGuide": [
      {
        "name": "Tombol '+ Buat Proyek Baru'",
        "type": "Tombol",
        "description": "Membuka formulir pendaftaran proyek baru."
      },
      {
        "name": "Kolom 'Nama Proyek'",
        "type": "Kolom Isian",
        "description": "Judul atau nama kegiatan proyek pekerjaan."
      },
      {
        "name": "Dropdown 'Pilih Klien / Customer'",
        "type": "Dropdown",
        "description": "Menentukan customer pemilik pekerjaan proyek."
      },
      {
        "name": "Kolom 'Nilai Kontrak Proyek (IDR)'",
        "type": "Kolom Isian",
        "description": "Total nominal kontrak yang disepakati dengan klien."
      },
      {
        "name": "Kolom 'Anggaran Biaya (Budgeted Cost)'",
        "type": "Kolom Isian",
        "description": "Batas maksimal alokasi biaya pengeluaran untuk proyek ini."
      },
      {
        "name": "Tab Navigasi Proyek (Milestone / Task / Biaya / Dokumen)",
        "type": "Tab Navigasi",
        "description": "Berpindah antar menu rincian tugas, tahapan pekerjaan, log pengeluaran, dan lampiran kontrak."
      },
      {
        "name": "Tombol 'Catat Pengeluaran Proyek'",
        "type": "Tombol",
        "description": "Menghubungkan nota belanja atau biaya operasional langsung ke neraca proyek ini."
      }
    ],
    "keyFeatures": [
      {
        "name": "Kalkulasi Profitabilitas Otomatis",
        "description": "Menampilkan margin laba bersih proyek (Nilai Kontrak - Total Biaya Riil)."
      },
      {
        "name": "Pelacakan Milestone & Tugas",
        "description": "Memantau persentase kemajuan pekerjaan fisik proyek secara real-time."
      },
      {
        "name": "Time Tracking Log",
        "description": "Mencatat jam kerja staf/teknisi lapangan yang dialokasikan untuk proyek."
      }
    ],
    "tipsAndTricks": [
      "Selalu pilih 'Proyek Terkait' saat mencatat nota pembelian barang di modul Pembelian agar biaya material otomatis terhitung ke proyek."
    ],
    "faq": [
      {
        "question": "Bisakah menagih invoice bertahap sesuai persentase progres proyek?",
        "answer": "Bisa. Anda dapat menerbitkan Invoice DP, Invoice Termin Progres (misal 50%), dan Invoice Pelunasan (Retensi) yang terhubung ke satu proyek yang sama."
      },
      {
        "question": "Bagaimana cara menutup proyek yang sudah selesai?",
        "answer": "Ubah status proyek menjadi 'Selesai / Completed' di halaman detail proyek. Status anggaran akan dikunci dan laporan laba rugi final tersimpan."
      }
    ]
  },
  {
    "id": "catalog",
    "menuKey": "catalog",
    "title": "Katalog Produk & Jasa (Catalog)",
    "category": "Pembelian & Gudang",
    "categoryId": "purchase",
    "iconName": "Package",
    "badge": "Master Produk",
    "targetRole": "Admin Gudang / Sales / Owner",
    "path": "/catalog",
    "summary": "Master data barang, jasa, SKU, barcode, harga beli (HPP), harga jual, kategori, dan foto produk.",
    "overview": "Modul Katalog adalah pusat master data seluruh item barang dagangan, bahan baku, paket bundling, maupun layanan jasa yang dijual bisnis Anda. Mendukung multi-satuan, batas stok minimum, barcode, dan variasi harga grosir/retail.",
    "workflow": [
      {
        "step": 1,
        "title": "Tambah Produk Baru",
        "description": "Klik '+ Tambah Produk', pilih tipe (Barang Fisik atau Jasa/Layanan), isi nama produk, kode SKU, dan barcode.",
        "screenshotPlaceholder": {
          "caption": "Form Master Produk",
          "description": "Screenshot pengisian nama barang, harga modal HPP, harga jual, dan foto produk."
        }
      },
      {
        "step": 2,
        "title": "Tentukan Harga Beli & Harga Jual",
        "description": "Masukkan harga pokok pembelian (HPP/Cost) dan harga jual standar. Tentukan juga batas kuantitas minimum peringatan stok.",
        "tip": "Sistem otomatis menghitung estimasi persentase margin laba kotor per produk."
      },
      {
        "step": 3,
        "title": "Unggah Foto & Label Barcode",
        "description": "Unggah foto produk untuk tampilan kasir POS dan cetak stiker barcode untuk ditempel pada kemasan fisik barang.",
        "screenshotPlaceholder": {
          "caption": "Cetak Label Barcode Produk",
          "description": "Screenshot fitur cetak stiker barcode produk siap tempel."
        }
      }
    ],
    "uiGuide": [
      {
        "name": "Tombol '+ Tambah Produk'",
        "type": "Tombol",
        "description": "Membuka formulir pendaftaran barang/jasa baru."
      },
      {
        "name": "Dropdown 'Tipe Produk'",
        "type": "Dropdown",
        "description": "Memilih jenis: Barang Fisik (Track Stok Inventaris) atau Jasa / Layanan (Non-Stok)."
      },
      {
        "name": "Kolom 'Nama Produk'",
        "type": "Kolom Isian",
        "description": "Nama resmi barang yang akan muncul di nota dan katalog."
      },
      {
        "name": "Kolom 'Kode SKU & Barcode'",
        "type": "Kolom Isian",
        "description": "Kode unik internal dan kode barcode untuk pemindaian scanner POS."
      },
      {
        "name": "Dropdown 'Kategori Produk'",
        "type": "Dropdown",
        "description": "Mengelompokkan produk ke dalam kategori (misal: Suku Cadang, Makanan, Pakaian, Jasa Desain)."
      },
      {
        "name": "Kolom 'Harga Beli Pokok (HPP / Cost)'",
        "type": "Kolom Isian",
        "description": "Harga modal rata-rata perolehan barang untuk perhitungan laba kotor."
      },
      {
        "name": "Kolom 'Harga Jual Standar'",
        "type": "Kolom Isian",
        "description": "Harga jual kepada konsumen sebelum diskon."
      },
      {
        "name": "Kolom 'Batas Stok Minimum'",
        "type": "Kolom Isian",
        "description": "Jumlah ambang batas di mana sistem akan menyalakan peringatan stok menipis."
      },
      {
        "name": "Tombol 'Cetak Barcode'",
        "type": "Tombol",
        "description": "Mencetak lembar stiker barcode sesuai jumlah kuantitas yang diinginkan."
      }
    ],
    "keyFeatures": [
      {
        "name": "Dukungan Multi Kategori & Satuan",
        "description": "Mendukung satuan Pcs, Box, Lusin, Kg, Liter, Meter, dan Jam."
      },
      {
        "name": "Cetak Label Barcode Mandiri",
        "description": "Fitur cetak barcode standar Code128 dan EAN13 siap pakai."
      },
      {
        "name": "Import & Export Excel",
        "description": "Upload ratusan produk sekaligus melalui template spreadsheet Excel."
      }
    ],
    "tipsAndTricks": [
      "Gunakan kode SKU yang terstruktur (misal: BAJU-PRIA-HITAM-L) untuk mempermudah pencarian cepat kasir."
    ],
    "faq": [
      {
        "question": "Apa bedanya produk tipe 'Barang Fisik' dengan 'Jasa'?",
        "answer": "Barang Fisik memiliki kuantitas stok yang akan bertambah saat dibeli dan berkurang saat dijual. Jasa tidak memiliki stok fisik sehingga tidak akan membatasi transaksi kasir."
      },
      {
        "question": "Bagaimana cara mengubah harga jual secara massal?",
        "answer": "Anda dapat mengekspor data katalog ke Excel, memperbarui kolom harga, lalu mengimpor kembali file tersebut ke sistem."
      }
    ]
  },
  {
    "id": "inventory",
    "menuKey": "inventory",
    "title": "Stok & Manajemen Gudang (Inventory)",
    "category": "Pembelian & Gudang",
    "categoryId": "purchase",
    "iconName": "Building2",
    "badge": "Inventaris",
    "targetRole": "Admin Gudang / Supervisor / Owner",
    "path": "/inventory",
    "summary": "Monitoring stok riil, multi-gudang, kartu stok (mutasi keluar/masuk), penyesuaian stok opname, dan transfer antar gudang.",
    "overview": "Modul Inventory memantau pergerakan fisik seluruh barang secara real-time. Anda dapat melacak riwayat mutasi barang (Kartu Stok), melakukan penyesuaian selisih stok fisik (Stock Opname), dan mentransfer barang antar cabang gudang.",
    "workflow": [
      {
        "step": 1,
        "title": "Cek Saldo Stok Riil",
        "description": "Lihat daftar kuantitas fisik barang per gudang/cabang toko lengkap dengan total nilai aset inventaris.",
        "screenshotPlaceholder": {
          "caption": "Tabel Stok Gudang Terintegrasi",
          "description": "Screenshot tabel saldo stok, lokasi rak gudang, dan nilai valuasi aset."
        }
      },
      {
        "step": 2,
        "title": "Lihat Kartu Stok (Stock Card)",
        "description": "Klik ikon Kartu Stok pada produk tertentu untuk menelusuri detail riwayat transaksi masuk (Pembelian) dan keluar (Penjualan / Rusak).",
        "tip": "Setiap perubahan stok mencantumkan tanggal, nomor dokumen referensi, dan nama pengguna yang memproses."
      },
      {
        "step": 3,
        "title": "Lakukan Penyesuaian (Stock Opname)",
        "description": "Jika ada barang hilang, rusak, atau selisih hitungan fisik, gunakan menu 'Stock Adjustment' untuk mencocokkan saldo sistem dengan fisik.",
        "screenshotPlaceholder": {
          "caption": "Form Penyesuaian Stok Opname",
          "description": "Screenshot input selisih fisik barang dan alasan penyesuaian stok."
        }
      }
    ],
    "uiGuide": [
      {
        "name": "Dropdown 'Pilih Cabang Gudang'",
        "type": "Dropdown",
        "description": "Menyaring tampilan stok berdasarkan lokasi gudang (Gudang Utama, Toko Cabang 1, Gudang Retur, dll)."
      },
      {
        "name": "Tombol '+ Penyesuaian Stok (Stock Opname)'",
        "type": "Tombol",
        "description": "Membuka formulir rekonsiliasi selisih stok fisik vs catatan sistem."
      },
      {
        "name": "Tombol '+ Transfer Antar Gudang'",
        "type": "Tombol",
        "description": "Membuat dokumen mutasi pengiriman barang dari satu gudang ke gudang lain."
      },
      {
        "name": "Ikon 'Kartu Stok (Stock Movement)'",
        "type": "Tombol",
        "description": "Membuka riwayat buku mutasi kronologis masuk-keluar untuk satu item tertentu."
      },
      {
        "name": "Kolom 'Nilai Valuasi Inventaris (IDR)'",
        "type": "Tabel Data",
        "description": "Total nilai rupiah aset persediaan barang (Qty x HPP)."
      }
    ],
    "keyFeatures": [
      {
        "name": "Multi Gudang & Multi Cabang",
        "description": "Manajemen stok terpisah untuk setiap toko fisik atau gudang logistik."
      },
      {
        "name": "Audit Trail Kartu Stok",
        "description": "Catatan mutasi transparan yang tidak dapat dimanipulasi tanpa jejak dokumen."
      },
      {
        "name": "Laporan Penyesuaian Opname",
        "description": "Mencatat selisih plus/minus opname langsung ke akun kerugian selisih persediaan di Akuntansi."
      }
    ],
    "tipsAndTricks": [
      "Lakukan stock opname rutin berkala (mingguan/bulanan) untuk mencegah kehilangan barang yang tidak terdeteksi."
    ],
    "faq": [
      {
        "question": "Metode penilaian persediaan apa yang digunakan?",
        "answer": "Sistem menggunakan metode Rata-Rata Tertimbang (Weighted Average Cost) untuk menghitung nilai HPP persediaan secara akurat."
      },
      {
        "question": "Bagaimana cara memindahkan barang dari Gudang Pusat ke Toko Cabang?",
        "answer": "Gunakan menu 'Transfer Antar Gudang', pilih gudang asal, gudang tujuan, dan masukkan kuantitas barang yang dikirim."
      }
    ]
  },
  {
    "id": "stock_out",
    "menuKey": "inventory",
    "title": "Pengeluaran Stok & Pemakaian (Stock Out)",
    "category": "Pembelian & Gudang",
    "categoryId": "purchase",
    "iconName": "Package",
    "badge": "Logistik",
    "targetRole": "Gudang / Produksi / Admin",
    "path": "/inventory/stock-out",
    "summary": "Pencatatan barang keluar untuk kebutuhan internal, sampel promosi, barang rusak (damaged), atau bahan baku produksi.",
    "overview": "Fitur Pengeluaran Stok (Stock Out) digunakan untuk mencatat pengurangan fisik barang di luar transaksi penjualan nota, seperti pemakaian operasional kantor, tester/sampel gratis, pemusnahan barang kedaluwarsa, atau pemakaian bahan olahan.",
    "workflow": [
      {
        "step": 1,
        "title": "Buat Form Pengeluaran Stok",
        "description": "Klik '+ Catat Pengeluaran Stok', pilih kategori alasan (Pemakaian Internal, Sampel, Rusak/Expired, Produksi).",
        "screenshotPlaceholder": {
          "caption": "Form Pengeluaran Stok Non-Jual",
          "description": "Screenshot pengisian daftar barang yang dikeluarkan dan alasan peruntukan."
        }
      },
      {
        "step": 2,
        "title": "Pilih Item & Jumlah Kuantitas",
        "description": "Pilih item barang yang dikeluarkan dan masukkan jumlah fisik yang diambil dari rak gudang.",
        "tip": "Sistem otomatis membukukan HPP barang tersebut ke akun beban biaya yang relevan."
      }
    ],
    "uiGuide": [
      {
        "name": "Tombol '+ Catat Barang Keluar'",
        "type": "Tombol",
        "description": "Membuka formulir pengeluaran inventaris non-jual."
      },
      {
        "name": "Dropdown 'Alasan Pengeluaran'",
        "type": "Dropdown",
        "description": "Kategori alasan: Pemakaian Kantor, Tester / Sampel Promosi, Barang Rusak (Damaged), Kedaluwarsa (Expired), atau Lainnya."
      },
      {
        "name": "Kolom 'Catatan / Departemen Pemohon'",
        "type": "Kolom Isian",
        "description": "Keterangan siapa staf atau divisi yang meminta barang tersebut."
      }
    ],
    "keyFeatures": [
      {
        "name": "Alokasi Beban Otomatis",
        "description": "Mencatat biaya barang terpakai ke dalam pos pengeluaran operasional perusahaan."
      },
      {
        "name": "Dokumen Bukti Pengeluaran Barang",
        "description": "Mencetak bukti tanda terima serah terima barang internal."
      }
    ],
    "tipsAndTricks": [
      "Wajibkan tanda tangan staf peminta barang pada bukti serah terima barang keluar internal."
    ],
    "faq": [
      {
        "question": "Apakah pengeluaran stok ini akan mengurangi omset penjualan?",
        "answer": "Tidak. Transaksi ini tidak dicatat sebagai penjualan, melainkan sebagai biaya beban operasional sebesar nilai harga pokok (HPP) barang."
      }
    ]
  },
  {
    "id": "purchase",
    "menuKey": "purchase",
    "title": "Pesanan Pembelian & Supplier (Purchase Orders)",
    "category": "Pembelian & Gudang",
    "categoryId": "purchase",
    "iconName": "ShoppingCart",
    "badge": "Pengadaan",
    "targetRole": "Purchasing / Admin / Finance / Owner",
    "path": "/purchase",
    "summary": "Penerbitan PO ke supplier, pencatatan tagihan vendor, bukti penerimaan barang masuk (Goods Receipt), dan hutang usaha.",
    "overview": "Modul Purchase mengelola seluruh siklus pengadaan barang/bahan baku dari vendor dan supplier. Mencakup pembuatan Surat Pesanan Pembelian (PO), verifikasi penerimaan fisik barang di gudang, pencatatan faktur tagihan supplier (Bill), dan jadwal pelunasan hutang.",
    "workflow": [
      {
        "step": 1,
        "title": "Buat Purchase Order (PO) Baru",
        "description": "Klik '+ Buat PO', pilih vendor/supplier, tanggal perkiraan tiba, dan masukkan daftar item barang yang dipesan beserta harga beli yang disepakati.",
        "screenshotPlaceholder": {
          "caption": "Form Pembuatan Purchase Order",
          "description": "Screenshot form PO resmi ke supplier dengan nomor seri otomatis."
        }
      },
      {
        "step": 2,
        "title": "Kirim PO ke Supplier & Terima Barang",
        "description": "Kirim dokumen PDF PO ke supplier. Saat barang fisik tiba di gudang, klik tombol 'Terima Barang (Goods Receipt)' untuk menambah stok otomatis.",
        "tip": "Mendukung penerimaan barang bertahap jika supplier mengirimkan pesanan secara terpisah."
      },
      {
        "step": 3,
        "title": "Catat Faktur Tagihan Vendor & Pelunasan",
        "description": "Catat tagihan invoice dari supplier, lalu klik 'Catat Pembayaran Hutang' saat perusahaan mentransfer pembayaran ke rekening supplier.",
        "screenshotPlaceholder": {
          "caption": "Status Penerimaan & Pelunasan Hutang Supplier",
          "description": "Screenshot status PO yang telah diterima penuh dan lunas dibayar."
        }
      }
    ],
    "uiGuide": [
      {
        "name": "Tombol '+ Buat Purchase Order'",
        "type": "Tombol",
        "description": "Membuka formulir pemesanan barang ke supplier baru."
      },
      {
        "name": "Dropdown 'Pilih Supplier / Vendor'",
        "type": "Dropdown",
        "description": "Memilih data supplier penyedia barang."
      },
      {
        "name": "Kolom 'Nomor PO'",
        "type": "Kolom Isian",
        "description": "Nomor seri pesanan pembelian (misal: PO/2026/08/001)."
      },
      {
        "name": "Kolom 'Estimasi Tanggal Tiba'",
        "type": "Kolom Isian",
        "description": "Target tanggal barang dijanjikan sampai di gudang oleh supplier."
      },
      {
        "name": "Tabel Item Pembelian",
        "type": "Tabel Data",
        "description": "Daftar barang, kuantitas order, harga beli satuan, diskon supplier, dan total nilai PO."
      },
      {
        "name": "Tombol 'Terima Barang (Goods Receipt)'",
        "type": "Tombol",
        "description": "Memvalidasi kedatangan fisik barang dan menambah stok gudang secara otomatis."
      },
      {
        "name": "Tombol 'Bayar Tagihan Vendor'",
        "type": "Tombol",
        "description": "Membukukan pengeluaran kas/bank untuk melunasi hutang pembelian ke supplier."
      }
    ],
    "keyFeatures": [
      {
        "name": "Three-Way Matching",
        "description": "Pencocokan akurat antara dokumen PO, Surat Jalan Penerimaan Barang, dan Faktur Tagihan Vendor."
      },
      {
        "name": "Pembaruan HPP Otomatis",
        "description": "Menghitung ulang harga pokok rata-rata produk saat terjadi perubahan harga beli dari supplier."
      },
      {
        "name": "Manajemen Hutang Usaha (AP)",
        "description": "Jadwal jatuh tempo hutang dagang agar perusahaan terhindar dari denda keterlambatan."
      }
    ],
    "tipsAndTricks": [
      "Selalu lampirkan nomor PO saat mentransfer pembayaran ke supplier untuk mempermudah pengecekan kedua belah pihak."
    ],
    "faq": [
      {
        "question": "Apakah membuat PO langsung menambah stok barang di sistem?",
        "answer": "Tidak. Stok barang baru akan bertambah setelah Anda mengklik tombol 'Terima Barang' ketika fisik produk telah diperiksa dan tiba di gudang."
      },
      {
        "question": "Bagaimana jika barang yang dikirim supplier ada yang rusak/cacat?",
        "answer": "Anda cukup menginput kuantitas barang bagus yang diterima pada form penerimaan, dan mengembalikan barang cacat dengan status retur beli."
      }
    ]
  },
  {
    "id": "vendor",
    "menuKey": "vendor",
    "title": "Database Vendor & Supplier",
    "category": "Pembelian & Gudang",
    "categoryId": "purchase",
    "iconName": "Building2",
    "badge": "Master Data",
    "targetRole": "Purchasing / Admin / Finance",
    "path": "/vendor",
    "summary": "Master data pemasok, kontak sales supplier, nomor rekening pembayaran, dan riwayat pesanan pembelian.",
    "overview": "Modul Vendor mengelola direktori supplier rekanan bisnis Anda. Memudahkan pencarian kontak sales person, nomor rekening bank pembayaran supplier, syarat termin hutang (Top), serta riwayat barang-barang yang biasa dipasok.",
    "workflow": [
      {
        "step": 1,
        "title": "Daftarkan Vendor Baru",
        "description": "Klik '+ Tambah Vendor', isi nama perusahaan supplier, nomor telepon, alamat kantor/gudang, dan nama sales representatif.",
        "screenshotPlaceholder": {
          "caption": "Form Master Vendor",
          "description": "Screenshot pengisian kontak supplier dan rekening bank transfer."
        }
      },
      {
        "step": 2,
        "title": "Catat Rekening Bank Supplier",
        "description": "Lengkapi nomor rekening bank vendor untuk mencegah kesalahan transfer saat bagian keuangan membayar tagihan PO.",
        "tip": "Anda juga dapat mencatat nomor NPWP vendor untuk keperluan bukti potong pajak PPh 23 jika ada."
      }
    ],
    "uiGuide": [
      {
        "name": "Tombol '+ Tambah Vendor'",
        "type": "Tombol",
        "description": "Membuka formulir pendaftaran supplier rekanan baru."
      },
      {
        "name": "Kolom 'Nama Vendor / Perusahaan'",
        "type": "Kolom Isian",
        "description": "Nama resmi supplier atau toko grosir penyedia barang."
      },
      {
        "name": "Kolom 'Nomor Rekening & Nama Bank Vendor'",
        "type": "Kolom Isian",
        "description": "Informasi rekening bank tujuan pembayaran tagihan."
      },
      {
        "name": "Kolom 'Termin Pembayaran Default'",
        "type": "Dropdown",
        "description": "Kesepakatan tempo pembayaran hutang (Tunai / Net 14 / Net 30 hari)."
      }
    ],
    "keyFeatures": [
      {
        "name": "Direktori Supplier Terpusat",
        "description": "Seluruh tim pengadaan dapat mengakses kontak supplier resmi tanpa tercecer."
      },
      {
        "name": "Rekapitulasi Saldo Hutang Vendor",
        "description": "Menampilkan total nominal tagihan belum dibayar ke masing-masing vendor."
      }
    ],
    "tipsAndTricks": [
      "Cantumkan nama sales kontak person dan nomor WA aktif di kolom kontak agar komunikasi order lebih cepat."
    ],
    "faq": [
      {
        "question": "Bisakah satu vendor memasok berbagai macam kategori barang?",
        "answer": "Bisa. Saat membuat PO, Anda bebas memilih produk apa saja yang disediakan oleh vendor tersebut."
      }
    ]
  },
  {
    "id": "employees",
    "menuKey": "employees",
    "title": "Database Karyawan (Employees)",
    "category": "SDM & HR",
    "categoryId": "hr",
    "iconName": "Users",
    "badge": "SDM",
    "targetRole": "HRD / Admin / Owner",
    "path": "/employees",
    "summary": "Master data staf, struktur divisi & jabatan, status kontrak kerja, dokumen identitas, dan rekening gaji.",
    "overview": "Modul Karyawan mengelola seluruh basis data sumber daya manusia (SDM) perusahaan Anda. Mulai dari informasi pribadi, NIK/KTP, jabatan, tanggal mulai bekerja, status kepegawaian (Tetap, Kontrak, Magang), hingga akun bank penerima gaji bulanan.",
    "workflow": [
      {
        "step": 1,
        "title": "Tambah Profil Karyawan",
        "description": "Klik '+ Tambah Karyawan', isi nama lengkap, email, nomor HP, divisi kerja, jabatan, dan tanggal bergabung.",
        "screenshotPlaceholder": {
          "caption": "Form Master Karyawan",
          "description": "Screenshot pengisian data staf, divisi jabatan, dan nomor rekening payroll."
        }
      },
      {
        "step": 2,
        "title": "Tautkan Akun Login (Opsional)",
        "description": "Hubungkan profil karyawan dengan email akun login agar staf dapat mengakses portal mandiri (ESS) untuk absensi, cuti, dan melihat slip gaji.",
        "tip": "Tentukan hak akses peran (Role) yang sesuai untuk membatasi menu yang boleh dibuka staf."
      }
    ],
    "uiGuide": [
      {
        "name": "Tombol '+ Tambah Karyawan'",
        "type": "Tombol",
        "description": "Membuka formulir pendaftaran anggota tim kerja baru."
      },
      {
        "name": "Kolom 'Nama Lengkap & NIK'",
        "type": "Kolom Isian",
        "description": "Nama karyawan sesuai KTP dan Nomor Induk Kependudukan / No Karyawan."
      },
      {
        "name": "Dropdown 'Divisi & Jabatan'",
        "type": "Dropdown",
        "description": "Departemen kerja (Sales, Kasir, Gudang, Operasional, IT, HR, Finance) dan level posisi."
      },
      {
        "name": "Dropdown 'Status Kepegawaian'",
        "type": "Dropdown",
        "description": "Status ikatan kerja: Karyawan Tetap (PKWTT), Kontrak (PKWT), Harian Lepas, atau Magang (Internship)."
      },
      {
        "name": "Kolom 'Gaji Pokok & Tunjangan Standar'",
        "type": "Kolom Isian",
        "description": "Nominal acuan penghasilan bulanan untuk perhitungan penggajian payroll."
      },
      {
        "name": "Kolom 'Nomor Rekening Gaji'",
        "type": "Kolom Isian",
        "description": "Nomor rekening bank untuk keperluan transfer slip gaji."
      }
    ],
    "keyFeatures": [
      {
        "name": "Portal Mandiri Karyawan (ESS)",
        "description": "Staf dapat login untuk absen online, klaim reimburse, ajukan cuti, dan download slip gaji."
      },
      {
        "name": "Pengingat Habis Kontrak",
        "description": "Notifikasi peringatan sebelum masa kontrak kerja staf berakhir."
      },
      {
        "name": "Manajemen Struktur Divisi",
        "description": "Pengelompokan tim kerja yang rapi untuk delegasi wewenang dan persetujuan."
      }
    ],
    "tipsAndTricks": [
      "Gunakan email aktif karyawan saat mendaftarkan profil agar staf dapat melakukan verifikasi login mandiri."
    ],
    "faq": [
      {
        "question": "Bagaimana jika ada karyawan yang resign / berhenti bekerja?",
        "answer": "Buka profil karyawan tersebut, ubah statusnya menjadi 'Non-Aktif / Resigned'. Riwayat absensi dan slip gaji masa lalu akan tetap tersimpan aman di arsip."
      }
    ]
  },
  {
    "id": "employee_attendance",
    "menuKey": "employee_attendance",
    "title": "Absensi GPS & Pengenalan Wajah",
    "category": "SDM & HR",
    "categoryId": "hr",
    "iconName": "Clock",
    "badge": "Absensi Online",
    "targetRole": "Semua Karyawan / HRD / Admin / Owner",
    "path": "/employees/attendance",
    "summary": "Pencatatan jam masuk & pulang karyawan dengan validasi radius lokasi GPS (Geofencing), selfie foto, dan log kehadiran.",
    "overview": "Modul Absensi menyediakan 4 tab lengkap: Portal Absen Saya (Clock-in/out dengan GPS & Kamera Selfie), Riwayat Absen Pribadi, Log Kehadiran Seluruh Karyawan (Admin), dan Pengaturan Geofence Lokasi Kantor (Radius Meter, Jam Masuk Standar). Mencegah kecurangan titip absen.",
    "workflow": [
      {
        "step": 1,
        "title": "Pengaturan Titik Lokasi Kantor (Admin)",
        "description": "Buka tab 'Pengaturan Absensi', klik 'Ambil Lokasi Saya' untuk menyimpan koordinat GPS kantor dan tentukan radius toleransi (misal 100 meter).",
        "screenshotPlaceholder": {
          "caption": "Pengaturan Geofencing GPS Kantor",
          "description": "Screenshot input Latitude, Longitude, Radius Meter, dan Jam Masuk default."
        }
      },
      {
        "step": 2,
        "title": "Clock In / Clock Out Mandiri (Karyawan)",
        "description": "Karyawan membuka tab 'Portal Absen Saya' lewat HP/Laptop di kantor, izinkan akses GPS dan kamera, lalu klik tombol 'Catat Masuk' atau 'Catat Pulang'.",
        "tip": "Sistem otomatis mendeteksi apakah posisi berada di dalam radius dan mencatat status Tepat Waktu atau Terlambat.",
        "screenshotPlaceholder": {
          "caption": "Portal Absensi Selfie & Lokasi GPS",
          "description": "Screenshot tombol Clock In/Out dengan indikator jarak meter dari kantor."
        }
      },
      {
        "step": 3,
        "title": "Pantau Log Kehadiran Karyawan (Admin)",
        "description": "HRD dan Owner dapat memeriksa tab 'Log Kehadiran Karyawan' dengan filter tanggal, pencarian nama, status terlambat, dan link peta koordinat Google Maps.",
        "screenshotPlaceholder": {
          "caption": "Tabel Log Absensi Staf & Link Google Maps",
          "description": "Screenshot tabel log kehadiran seluruh tim lengkap dengan foto selfie dan koordinat."
        }
      }
    ],
    "uiGuide": [
      {
        "name": "Tab 'Portal Absen Saya'",
        "type": "Tab Navigasi",
        "description": "Halaman untuk karyawan mencatat jam masuk, jam pulang, dan mengambil foto selfie kehadiran."
      },
      {
        "name": "Tab 'Riwayat Absen Saya'",
        "type": "Tab Navigasi",
        "description": "Daftar riwayat jam kerja, jam lembur, dan status kehadiran pribadi karyawan."
      },
      {
        "name": "Tab 'Log Kehadiran Karyawan (Admin)'",
        "type": "Tab Navigasi",
        "description": "Tabel rekapitulasi kehadiran seluruh staf perusahaan untuk evaluasi HRD."
      },
      {
        "name": "Tab 'Pengaturan Absensi (Admin)'",
        "type": "Tab Navigasi",
        "description": "Pengaturan batas radius GPS, jam masuk standar, dan aktivasi fitur validasi wajah."
      },
      {
        "name": "Tombol 'Ambil Lokasi Saya (GPS)'",
        "type": "Tombol",
        "description": "Mengambil koordinat Latitude & Longitude saat ini secara instan dari sensor GPS perangkat."
      },
      {
        "name": "Kolom 'Batas Radius Geofence (Meter)'",
        "type": "Kolom Isian",
        "description": "Jarak maksimal dalam meter (misal: 100 meter) karyawan diizinkan melakukan absensi dari titik kantor."
      },
      {
        "name": "Toggle 'Aktifkan Validasi Radius GPS'",
        "type": "Toggle / Switch",
        "description": "Mengunci absensi agar hanya bisa dilakukan jika karyawan berada di dalam radius kantor."
      },
      {
        "name": "Tombol 'Catat Masuk (Clock In)' & 'Catat Pulang (Clock Out)'",
        "type": "Tombol",
        "description": "Tombol utama karyawan untuk merekam waktu kehadiran harian."
      }
    ],
    "keyFeatures": [
      {
        "name": "Validasi Geofencing GPS Presisi",
        "description": "Memastikan staf benar-benar berada di area kantor atau outlet kerja saat absen."
      },
      {
        "name": "Kamera Selfie Real-Time",
        "description": "Mengambil foto wajah langsung saat tombol ditekan untuk verifikasi fisik kehadiran."
      },
      {
        "name": "Kalkulasi Keterlambatan Otomatis",
        "description": "Otomatis menghitung menit keterlambatan untuk potongan denda disiplin saat payroll."
      }
    ],
    "tipsAndTricks": [
      "Pastikan karyawan mengaktifkan izin Lokasi (GPS) dan Kamera pada browser HP mereka saat pertama kali membuka portal."
    ],
    "faq": [
      {
        "question": "Bagaimana jika GPS karyawan akurasinya meleset karena berada di dalam gedung?",
        "answer": "Admin dapat menaikkan toleransi 'Batas Radius Geofence' menjadi 150-200 meter di tab Pengaturan Absensi."
      },
      {
        "question": "Apakah staf yang bekerja WFH (Remote) bisa absen?",
        "answer": "Bisa. Admin dapat menonaktifkan sementara toggle Geofence untuk staf tertentu atau membuat cabang lokasi kerja virtual."
      }
    ]
  },
  {
    "id": "employee_leave",
    "menuKey": "employee_leave",
    "title": "Pengajuan & Kuota Cuti Karyawan",
    "category": "SDM & HR",
    "categoryId": "hr",
    "iconName": "Calendar",
    "badge": "Cuti & Izin",
    "targetRole": "Semua Karyawan / HRD / Admin / Owner",
    "path": "/employees/leave",
    "summary": "Pengajuan cuti tahunan, sakit, izin khusus, pemantauan saldo sisa cuti, dan persetujuan approval oleh manajer.",
    "overview": "Modul Cuti mengelola jatah kuota cuti tahunan staf secara terstruktur. Terdiri dari Portal ESS (karyawan mengajukan cuti, melihat sisa kuota, riwayat persetujuan) dan Panel Manajemen Admin (manajer/owner menyetujui atau menolak pengajuan, atur kuota kupon cuti tahunan).",
    "workflow": [
      {
        "step": 1,
        "title": "Pengajuan Cuti (Staf)",
        "description": "Karyawan membuka tab Portal ESS, klik '+ Ajukan Cuti', pilih tipe cuti (Tahunan, Sakit dengan Surat Dokter, Melahirkan, Izin Khusus), pilih rentang tanggal dan alasan.",
        "screenshotPlaceholder": {
          "caption": "Form Pengajuan Cuti Mandiri",
          "description": "Screenshot pengisian tanggal cuti dan keterangan izin kerja."
        }
      },
      {
        "step": 2,
        "title": "Persetujuan / Approval (Admin/Owner)",
        "description": "Manajer/Owner membuka tab 'Panel Manajemen (Admin)', meninjau daftar pengajuan yang masuk, lalu klik 'Setujui' atau 'Tolak' beserta catatan.",
        "tip": "Saldo kuota cuti tahunan staf akan otomatis terpotong saat pengajuan disetujui.",
        "screenshotPlaceholder": {
          "caption": "Panel Persetujuan Cuti Karyawan",
          "description": "Screenshot tabel approval cuti dengan tombol Setujui dan Tolak."
        }
      }
    ],
    "uiGuide": [
      {
        "name": "Tab 'Portal Mandiri Karyawan (ESS)'",
        "type": "Tab Navigasi",
        "description": "Halaman staf untuk melihat kuota tahunan, sisa saldo hari cuti, dan form pengajuan."
      },
      {
        "name": "Tab 'Panel Manajemen (Admin)'",
        "type": "Tab Navigasi",
        "description": "Halaman khusus Owner & Admin untuk menyetujui/menolak pengajuan cuti seluruh tim."
      },
      {
        "name": "Tombol '+ Ajukan Cuti Baru'",
        "type": "Tombol",
        "description": "Membuka modal formulir permohonan izin cuti kerja."
      },
      {
        "name": "Dropdown 'Jenis Cuti'",
        "type": "Dropdown",
        "description": "Kategori: Cuti Tahunan (Potong Kuota), Izin Sakit, Cuti Menikah, Cuti Melahirkan, atau Izin Penting."
      },
      {
        "name": "Kolom 'Tanggal Mulai & Tanggal Selesai'",
        "type": "Kolom Isian",
        "description": "Rentang hari kerja yang diajukan untuk izin libur."
      },
      {
        "name": "Tombol 'Setujui (Approve)' & 'Tolak (Reject)'",
        "type": "Tombol",
        "description": "Tombol aksi manajer untuk memutuskan status pengajuan cuti."
      },
      {
        "name": "Tombol '+ Alokasikan Kuota Cuti Tahunan'",
        "type": "Tombol",
        "description": "Menetapkan jatah hak cuti tahunan (misal 12 hari per tahun) untuk setiap karyawan."
      }
    ],
    "keyFeatures": [
      {
        "name": "Kalkulator Saldo Cuti Real-Time",
        "description": "Otomatis menghitung kuota terpakai dan sisa kuota tanpa rekap manual."
      },
      {
        "name": "Notifikasi Pengajuan",
        "description": "Pemberitahuan instan saat ada permohonan cuti baru yang membutuhkan persetujuan."
      }
    ],
    "tipsAndTricks": [
      "Staf dapat melampirkan foto surat dokter pada kolom catatan jika mengajukan izin sakit lebih dari 1 hari."
    ],
    "faq": [
      {
        "question": "Apakah cuti sakit memotong jatah kuota cuti tahunan?",
        "answer": "Secara default tidak. Hanya tipe 'Cuti Tahunan' yang akan memotong saldo kuota tahunan karyawan."
      },
      {
        "question": "Bagaimana jika karyawan membatalkan cuti yang sudah disetujui?",
        "answer": "Admin dapat membatalkan persetujuan di Panel Admin, dan sistem akan mengembalikan saldo cuti staf secara otomatis."
      }
    ]
  },
  {
    "id": "employee_reimbursement",
    "menuKey": "employee_reimbursement",
    "title": "Klaim Reimbursement & Biaya Karyawan",
    "category": "SDM & HR",
    "categoryId": "hr",
    "iconName": "Wallet",
    "badge": "Klaim Biaya",
    "targetRole": "Semua Karyawan / Finance / Admin / Owner",
    "path": "/employees/reimbursement",
    "summary": "Pengajuan klaim penggantian dana operasional staf, upload foto struk nota, verifikasi admin, dan pembayaran pencairan dana.",
    "overview": "Modul Reimbursement menangani penggantian uang pribadi staf yang terpakai untuk keperluan operasional kantor (Bensin/Transport, Makan Klien, Pembelian ATK mendesak, Biaya Parkir, Penginapan Dinas). Terdiri dari Portal ESS dan Panel Persetujuan Keuangan.",
    "workflow": [
      {
        "step": 1,
        "title": "Ajukan Klaim & Foto Struk (Staf)",
        "description": "Karyawan mengunggah foto struk belanja asli, mengisi nominal rupiah, tanggal transaksi, kategori pengeluaran, dan nomor rekening penerima.",
        "screenshotPlaceholder": {
          "caption": "Form Pengajuan Reimbursement & Upload Struk",
          "description": "Screenshot upload foto struk bukti bayar dan input nominal klaim."
        }
      },
      {
        "step": 2,
        "title": "Review & Persetujuan (Finance/Owner)",
        "description": "Bagian Keuangan meninjau foto struk nota. Jika valid, klik 'Setujui Klaim'.",
        "screenshotPlaceholder": {
          "caption": "Panel Verifikasi Struk & Persetujuan Klaim",
          "description": "Screenshot preview foto struk belanja dan tombol persetujuan admin."
        }
      },
      {
        "step": 3,
        "title": "Pencairan Dana (Disbursement)",
        "description": "Klik tombol 'Tandai Telah Dibayar (Disbursed)' setelah dana ditransfer ke rekening karyawan, otomatis tercatat di pengeluaran kas perusahaan.",
        "tip": "Karyawan dapat melihat status klaim berubah menjadi 'Telah Dicairkan'."
      }
    ],
    "uiGuide": [
      {
        "name": "Tab 'Portal Mandiri Karyawan (ESS)'",
        "type": "Tab Navigasi",
        "description": "Tempat staf membuat klaim reimbursement baru dan melihat status pencairan dana."
      },
      {
        "name": "Tab 'Persetujuan & Pembayaran (Admin)'",
        "type": "Tab Navigasi",
        "description": "Tempat Finance & Owner memverifikasi keaslian nota struk dan mencairkan uang klaim."
      },
      {
        "name": "Tombol '+ Ajukan Reimbursement'",
        "type": "Tombol",
        "description": "Membuka formulir pengajuan klaim baru."
      },
      {
        "name": "Kolom 'Unggah Foto Struk / Nota Fisik'",
        "type": "Kolom Isian",
        "description": "Upload foto kwitansi/struk belanja dari kamera HP atau file gambar."
      },
      {
        "name": "Dropdown 'Kategori Biaya'",
        "type": "Dropdown",
        "description": "Kategori: Transportasi & Bensin, Jamuan Klien / Entertainment, ATK Kantor, Penginapan Dinas, Medis / Kesehatan."
      },
      {
        "name": "Kolom 'Nominal Klaim (IDR)'",
        "type": "Kolom Isian",
        "description": "Jumlah total uang yang harus diganti sesuai angka yang tertera di struk."
      },
      {
        "name": "Tombol 'Setujui Klaim' & 'Tolak Klaim'",
        "type": "Tombol",
        "description": "Memvalidasi atau menolak permohonan klaim dengan alasan."
      },
      {
        "name": "Tombol 'Bayar / Cairkan Dana (Disburse)'",
        "type": "Tombol",
        "description": "Mencatat pencairan transfer uang ke rekening staf dan membukukan ke kas pengeluaran."
      }
    ],
    "keyFeatures": [
      {
        "name": "Lampiran Foto Struk Terintegrasi",
        "description": "Memudahkan audit visual nota struk tanpa perlu mengumpulkan berkas kertas fisik."
      },
      {
        "name": "Pencatatan Otomatis ke Kas Beban",
        "description": "Reimburse yang dicairkan otomatis masuk ke laporan pengeluaran keuangan."
      }
    ],
    "tipsAndTricks": [
      "Pastikan foto struk belanja terlihat jelas pada bagian tanggal, nominal, dan nama merchant toko."
    ],
    "faq": [
      {
        "question": "Berapa lama batas maksimal pengajuan reimbursement setelah transaksi?",
        "answer": "Kebijakan standar umumnya maksimal 14-30 hari kalender setelah tanggal yang tertera di struk belanja."
      },
      {
        "question": "Bisakah klaim digabungkan pembayarannya bersamaan dengan gaji bulanan?",
        "answer": "Bisa. Anda dapat menyetujui klaim terlebih dahulu dan memilih pencairan digabung saat penggajian Payroll."
      }
    ]
  },
  {
    "id": "payroll",
    "menuKey": "payroll",
    "title": "Penggajian & Slip Gaji (Payroll)",
    "category": "SDM & HR",
    "categoryId": "hr",
    "iconName": "CreditCard",
    "badge": "Payroll",
    "targetRole": "HRD / Finance / Owner",
    "path": "/payroll",
    "summary": "Kalkulasi gaji bulanan, tunjangan, uang lembur, potongan absensi/pajak PPh 21 TER, cetak slip gaji PDF, dan transfer payroll.",
    "overview": "Modul Payroll mengotomatiskan perhitungan gaji seluruh tim kerja Anda. Memadukan data kehadiran absensi, jam lembur yang disetujui, tunjangan jabatan/makan, potongan denda terlambat, iuran BPJS, dan kalkulasi tarif efektif pajak PPh 21 TER terbaru.",
    "workflow": [
      {
        "step": 1,
        "title": "Pilih Periode Penggajian",
        "description": "Tentukan bulan dan tahun penggajian (misal: Agustus 2026), sistem akan menarik data rekap kehadiran dan tunjangan staf.",
        "screenshotPlaceholder": {
          "caption": "Kalkulasi Slip Gaji Bulanan",
          "description": "Screenshot tabel rincian gaji pokok, lembur, tunjangan, potongan pajak, dan take home pay."
        }
      },
      {
        "step": 2,
        "title": "Verifikasi & Tambah Komponen Bonus / Potongan",
        "description": "Periksa rincian gaji per karyawan. Anda dapat menambahkan bonus insentif sales atau potongan kasbon/pinjaman jika ada.",
        "tip": "Sistem otomatis menghitung nilai Take Home Pay (Gaji Bersih)."
      },
      {
        "step": 3,
        "title": "Terbitkan Slip Gaji & Cetak PDF",
        "description": "Klik 'Kunci & Terbitkan Slip Gaji'. Cetak slip gaji berformat rahasia (Confidential) atau kirim link slip ke akun portal mandiri karyawan.",
        "screenshotPlaceholder": {
          "caption": "Dokumen Slip Gaji PDF Resmi",
          "description": "Screenshot layout slip gaji elegan dengan rincian pendapatan dan potongan."
        }
      }
    ],
    "uiGuide": [
      {
        "name": "Tombol '+ Buat Periode Payroll Baru'",
        "type": "Tombol",
        "description": "Memulai proses perhitungan penggajian untuk bulan berjalan."
      },
      {
        "name": "Dropdown 'Pilih Periode Bulan & Tahun'",
        "type": "Dropdown",
        "description": "Menentukan bulan buku penggajian."
      },
      {
        "name": "Tabel Komponen Gaji Karyawan",
        "type": "Tabel Data",
        "description": "Kolom Gaji Pokok, Tunjangan Jabatan, Uang Makan/Transport, Upah Lembur, Potongan Absensi, Potongan PPh 21, dan Take Home Pay."
      },
      {
        "name": "Tombol 'Hitung Otomatis dari Absensi'",
        "type": "Tombol",
        "description": "Menarik data jumlah hari masuk dan jam lembur dari modul Absensi secara instan."
      },
      {
        "name": "Tombol 'Cetak Semua Slip Gaji (Batch PDF)'",
        "type": "Tombol",
        "description": "Mencetak seluruh slip gaji staf dalam 1 dokumen PDF siap cetak."
      },
      {
        "name": "Tombol 'Kunci & Bayar Payroll'",
        "type": "Tombol",
        "description": "Mengunci data penggajian dan mencatat total biaya gaji ke buku besar Akuntansi."
      }
    ],
    "keyFeatures": [
      {
        "name": "Kalkulasi Pajak PPh 21 Tarif Efektif Rata-rata (TER)",
        "description": "Perhitungan otomatis pajak penghasilan karyawan sesuai aturan perpajakan terbaru."
      },
      {
        "name": "Slip Gaji Digital Terproteksi",
        "description": "Karyawan dapat melihat dan mengunduh slip gaji mereka langsung melalui menu ESS."
      },
      {
        "name": "Otomatisasi Jurnal Gaji",
        "description": "Membukukan biaya beban gaji dan hutang PPh 21 langsung ke neraca keuangan."
      }
    ],
    "tipsAndTricks": [
      "Pastikan seluruh klaim lembur dan penyesuaian absensi sudah disetujui sebelum mengunci periode payroll."
    ],
    "faq": [
      {
        "question": "Apakah format slip gaji menampilkan informasi potongan secara transparan?",
        "answer": "Ya, slip gaji merinci seluruh komponen pendapatan kotor, tunjangan, serta setiap pos potongan (pajak, BPJS, kasbon) secara rinci."
      },
      {
        "question": "Bisakah mengekspor file daftar transfer gaji ke format bank?",
        "answer": "Ya, Anda dapat mengekspor daftar nomor rekening dan nominal take home pay ke format Excel untuk upload massal di Internet Banking bisnis Anda."
      }
    ]
  },
  {
    "id": "accounts",
    "menuKey": "accounts",
    "title": "Bagan Akun (Chart of Accounts / COA)",
    "category": "Akuntansi & Keuangan",
    "categoryId": "finance",
    "iconName": "Wallet",
    "badge": "Akuntansi",
    "targetRole": "Akuntan / Finance / Owner",
    "path": "/accounts",
    "summary": "Master klasifikasi akun akuntansi (Aset, Kewajiban, Ekuitas, Pendapatan, dan Beban), saldo awal, dan nomor kode akun.",
    "overview": "Chart of Accounts (COA) adalah fondasi sistem pembukuan double-entry bisnis Anda. Mengelompokkan seluruh pos rekening keuangan berdasarkan standar akuntansi Indonesia dengan struktur hierarki kode akun yang fleksibel.",
    "workflow": [
      {
        "step": 1,
        "title": "Lihat Struktur Akun Standar",
        "description": "Sistem telah menyediakan susunan COA standar bisnis (Kas, Bank, Piutang Usaha, Persediaan, Hutang, Modal, Pendapatan, Beban).",
        "screenshotPlaceholder": {
          "caption": "Tabel Bagan Akun (Chart of Accounts)",
          "description": "Screenshot hierarki nomor kode akun dan saldo berjalan saat ini."
        }
      },
      {
        "step": 2,
        "title": "Tambah atau Kustomisasi Akun",
        "description": "Klik '+ Tambah Akun', pilih klasifikasi tipe akun, masukkan nomor kode (misal: 1-1002 Bank Mandiri) dan nama akun.",
        "tip": "Akun dapat dijadikan sub-akun di bawah akun induk untuk pengelompokan yang lebih rapi."
      }
    ],
    "uiGuide": [
      {
        "name": "Tombol '+ Tambah Akun Baru'",
        "type": "Tombol",
        "description": "Membuka formulir pendaftaran kode akun COA baru."
      },
      {
        "name": "Dropdown 'Klasifikasi Kategori Akun'",
        "type": "Dropdown",
        "description": "Kategori standar: Aset Lancar, Aset Tetap, Kewajiban Jangka Pendek/Panjang, Ekuitas Modal, Pendapatan Usaha, HPP, atau Beban Operasional."
      },
      {
        "name": "Kolom 'Kode Akun'",
        "type": "Kolom Isian",
        "description": "Nomor numerik unik kode akun (misal: 1101 untuk Kas Kecil, 1102 untuk Bank BCA)."
      },
      {
        "name": "Kolom 'Nama Akun'",
        "type": "Kolom Isian",
        "description": "Deskripsi nama rekening akun keuangan."
      },
      {
        "name": "Kolom 'Saldo Awal (Opening Balance)'",
        "type": "Kolom Isian",
        "description": "Saldo rupiah saat pertama kali sistem mulai digunakan."
      }
    ],
    "keyFeatures": [
      {
        "name": "Standar Akuntansi Berpasangan (Double Entry)",
        "description": "Menjaga keseimbangan neraca Debit dan Kredit secara otomatis."
      },
      {
        "name": "Struktur Hierarki Tanpa Batas",
        "description": "Mendukung pembuatan sub-akun bertingkat sesuai kebutuhan manajemen."
      }
    ],
    "tipsAndTricks": [
      "Jangan mengubah kode akun sistem default (seperti Piutang Usaha & Hutang Usaha) yang telah ditautkan otomatis oleh modul transaksi."
    ],
    "faq": [
      {
        "question": "Apakah akun yang sudah memiliki riwayat transaksi bisa dihapus?",
        "answer": "Tidak, akun yang sudah memiliki jurnal transaksi tidak boleh dihapus demi menjaga integritas laporan historis. Anda hanya dapat menonaktifkannya."
      }
    ]
  },
  {
    "id": "expenses",
    "menuKey": "expenses",
    "title": "Pencatatan Beban & Biaya (Expenses)",
    "category": "Akuntansi & Keuangan",
    "categoryId": "finance",
    "iconName": "CreditCard",
    "badge": "Pengeluaran",
    "targetRole": "Kasir / Finance / Admin / Owner",
    "path": "/expenses",
    "summary": "Pencatatan pengeluaran kas rutin, biaya listrik/air/internet, sewa tempat, gaji, dan belanja operasional kantor.",
    "overview": "Modul Biaya mencatat seluruh transaksi kas keluar untuk keperluan operasional harian. Mendukung kategorisasi akun beban, pemilihan sumber kas/bank pembayaran, serta lampiran foto kuitansi/nota pembayaran.",
    "workflow": [
      {
        "step": 1,
        "title": "Catat Pengeluaran Baru",
        "description": "Klik '+ Catat Biaya', pilih kategori akun beban (misal: Biaya Listrik & Internet), masukkan nominal rupiah, dan pilih akun kas/bank pembayar.",
        "screenshotPlaceholder": {
          "caption": "Form Pencatatan Biaya Operasional",
          "description": "Screenshot pengisian formulir pengeluaran dan upload foto kuitansi."
        }
      },
      {
        "step": 2,
        "title": "Lampirkan Bukti Pembayaran",
        "description": "Unggah foto nota atau bukti transfer. Klik Simpan, saldo kas/bank akan otomatis terpotong.",
        "tip": "Data biaya akan otomatis tercatat ke Laporan Laba Rugi periode bersangkutan."
      }
    ],
    "uiGuide": [
      {
        "name": "Tombol '+ Catat Pengeluaran'",
        "type": "Tombol",
        "description": "Membuka formulir pencatatan kas keluar baru."
      },
      {
        "name": "Dropdown 'Akun Beban / Kategori'",
        "type": "Dropdown",
        "description": "Memilih pos biaya: Beban Listrik, Beban Sewa, Beban Pemasaran, Beban Perlengkapan, dll."
      },
      {
        "name": "Dropdown 'Dibayar Dari (Kas / Bank)'",
        "type": "Dropdown",
        "description": "Memilih sumber uang yang terpotong (Kasir Toko, Bank BCA, dll)."
      },
      {
        "name": "Kolom 'Nominal Biaya (IDR)'",
        "type": "Kolom Isian",
        "description": "Jumlah uang yang dikeluarkan."
      },
      {
        "name": "Kolom 'Unggah Foto Bukti Kuitansi'",
        "type": "Kolom Isian",
        "description": "Mengunggah foto bukti fisik pembayaran."
      }
    ],
    "keyFeatures": [
      {
        "name": "Pelacakan Biaya Berulang",
        "description": "Memantau tren kenaikan pos-pos pengeluaran bulanan usaha Anda."
      },
      {
        "name": "Otomatisasi Jurnal Buku Besar",
        "description": "Mendebit akun beban dan mengkredit akun kas secara instan."
      }
    ],
    "tipsAndTricks": [
      "Kelompokkan biaya secara spesifik agar Laporan Laba Rugi memberikan gambaran pos mana yang paling boros."
    ],
    "faq": [
      {
        "question": "Apa bedanya mencatat biaya di modul ini dengan modul Pembelian (Purchase)?",
        "answer": "Modul Pembelian digunakan untuk pengadaan barang dagangan/bahan baku yang masuk ke stok gudang. Modul Biaya digunakan untuk beban operasional murni (seperti listrik, sewa, konsumsi)."
      }
    ]
  },
  {
    "id": "ledger",
    "menuKey": "ledger",
    "title": "Buku Besar & Jurnal Umum (General Ledger)",
    "category": "Akuntansi & Keuangan",
    "categoryId": "finance",
    "iconName": "BookOpen",
    "badge": "Jurnal",
    "targetRole": "Akuntan / Finance / Owner",
    "path": "/ledger",
    "summary": "Riwayat buku jurnal berpasangan (Debit/Kredit), buku besar per akun, input jurnal penyesuaian manual, dan audit trail.",
    "overview": "Modul Buku Besar mencatat seluruh mutasi akuntansi yang dihasilkan otomatis dari modul penjualan, pembelian, kasir, penggajian, maupun entri jurnal memorial/penyesuaian manual.",
    "workflow": [
      {
        "step": 1,
        "title": "Telusuri Mutasi Buku Besar",
        "description": "Pilih akun tertentu (misal: 1102 Bank BCA) dan rentang tanggal untuk melihat kronologis mutasi saldo debit/kredit.",
        "screenshotPlaceholder": {
          "caption": "Tampilan Buku Besar Akun",
          "description": "Screenshot buku besar dengan kolom tanggal, referensi transaksi, debit, kredit, dan saldo akhir."
        }
      },
      {
        "step": 2,
        "title": "Buat Jurnal Penyesuaian Manual",
        "description": "Klik '+ Buat Jurnal Manual', masukkan tanggal, keterangan, pilih baris akun debit dan kredit, pastikan total keduanya seimbang (Balance).",
        "tip": "Digunakan untuk mencatat amortisasi, penyusutan manual, atau koreksi saldo."
      }
    ],
    "uiGuide": [
      {
        "name": "Tombol '+ Buat Jurnal Manual'",
        "type": "Tombol",
        "description": "Membuka lembar entri jurnal akuntansi debit-kredit manual."
      },
      {
        "name": "Dropdown 'Filter Akun Buku Besar'",
        "type": "Dropdown",
        "description": "Menyaring transaksi khusus untuk satu akun COA tertentu."
      },
      {
        "name": "Tabel Entri Jurnal",
        "type": "Tabel Data",
        "description": "Daftar baris akun, posisi Debit, posisi Kredit, dan indikator status balance."
      }
    ],
    "keyFeatures": [
      {
        "name": "Validasi Balance Otomatis",
        "description": "Sistem menolak penyimpanan jurnal jika total Debit tidak sama dengan total Kredit."
      },
      {
        "name": "Audit Trail Terintegrasi",
        "description": "Setiap jurnal transaksi terhubung langsung ke dokumen asalnya (Invoice, PO, Payroll)."
      }
    ],
    "tipsAndTricks": [
      "Gunakan keterangan memo yang jelas pada setiap baris jurnal manual untuk mempermudah audit tahunan."
    ],
    "faq": [
      {
        "question": "Apakah transaksi dari modul Invoice dan POS otomatis membuat jurnal?",
        "answer": "Ya, 100% otomatis. Anda tidak perlu membuat jurnal manual untuk penjualan atau pembelian reguler."
      }
    ]
  },
  {
    "id": "tax",
    "menuKey": "tax",
    "title": "Pengaturan & Laporan Pajak (Tax)",
    "category": "Akuntansi & Keuangan",
    "categoryId": "finance",
    "iconName": "Percent",
    "badge": "Pajak",
    "targetRole": "Tax Officer / Finance / Owner",
    "path": "/tax",
    "summary": "Pengaturan tarif PPN, rekapitulasi PPN Masukan vs PPN Keluaran, dan pelaporan SPT Masa PPh.",
    "overview": "Modul Pajak merekapitulasi seluruh kewajiban perpajakan bisnis Anda, terutama PPN Keluaran (dari penjualan invoice) dan PPN Masukan (dari pembelian supplier), menghitung selisih Kurang/Lebih Bayar pajak.",
    "workflow": [
      {
        "step": 1,
        "title": "Atur Tarif Pajak Default",
        "description": "Tentukan persentase tarif PPN standar (11% atau sesuai peraturan) di menu Pengaturan Pajak.",
        "screenshotPlaceholder": {
          "caption": "Rekapitulasi Pajak PPN Masukan & Keluaran",
          "description": "Screenshot perbandingan PPN Keluaran Penjualan vs PPN Masukan Pembelian."
        }
      },
      {
        "step": 2,
        "title": "Ekspor Rekapitulasi Pajak",
        "description": "Unduh rekapitulasi faktur pajak bulanan untuk mempermudah pelaporan e-Faktur DJP.",
        "tip": "Data mencakup nomor NPWP pelanggan, DPP (Dasar Pengenaan Pajak), dan nominal PPN."
      }
    ],
    "uiGuide": [
      {
        "name": "Toggle 'Aktifkan PPN pada Invoice Penjualan'",
        "type": "Toggle / Switch",
        "description": "Mengaktifkan opsi perhitungan pajak otomatis pada pembuatan nota penjualan."
      },
      {
        "name": "Kolom 'Tarif Standar PPN (%)'",
        "type": "Kolom Isian",
        "description": "Persentase tarif pajak yang berlaku (default: 11.00%)."
      },
      {
        "name": "Tabel Rekap PPN Masukan vs Keluaran",
        "type": "Tabel Data",
        "description": "Menampilkan perbandingan total pajak yang dipungut vs pajak yang dibayar ke supplier."
      }
    ],
    "keyFeatures": [
      {
        "name": "Kalkulasi Kurang / Lebih Bayar PPN",
        "description": "Otomatis menghitung selisih neto pajak yang harus disetor ke kas negara."
      },
      {
        "name": "Format Siap e-Faktur",
        "description": "Ekspor data transaksi penjualan dengan format yang mudah diimpor ke aplikasi DJP."
      }
    ],
    "tipsAndTricks": [
      "Pastikan selalu mengisi nomor NPWP customer pada master data pelanggan agar laporan faktur pajak valid."
    ],
    "faq": [
      {
        "question": "Bisakah membuat invoice tanpa mengenakan pajak untuk klien non-PKP?",
        "answer": "Bisa. Anda cukup menonaktifkan centang toggle 'Kenakan PPN' saat membuat invoice bersangkutan."
      }
    ]
  },
  {
    "id": "assets",
    "menuKey": "assets",
    "title": "Aset Tetap & Depresiasi (Fixed Assets)",
    "category": "Akuntansi & Keuangan",
    "categoryId": "finance",
    "iconName": "Building2",
    "badge": "Aset",
    "targetRole": "Finance / Asset Manager / Owner",
    "path": "/assets",
    "summary": "Pencatatan inventaris aset tetap perusahaan (Kendaraan, Mesin, Gedung, Komputer), nilai buku, dan penyusutan otomatis.",
    "overview": "Modul Aset Tetap mengelola pencatatan aktiva tetap perusahaan. Sistem secara otomatis menghitung akumulasi penyusutan bulanan (Depresiasi Garis Lurus), nilai sisa buku (Book Value), dan membukukannya ke laporan neraca keuangan.",
    "workflow": [
      {
        "step": 1,
        "title": "Daftarkan Aset Baru",
        "description": "Klik '+ Tambah Aset', isi nama barang (misal: Mobil Box Operasional), tanggal perolehan, harga beli awal, dan estimasi masa manfaat (tahun).",
        "screenshotPlaceholder": {
          "caption": "Form Master Aset Tetap",
          "description": "Screenshot pengisian data perolehan aset dan tabel simulasi jadwal penyusutan bulanan."
        }
      },
      {
        "step": 2,
        "title": "Jadwalkan Depresiasi Otomatis",
        "description": "Sistem akan membuat tabel jadwal penyusutan otomatis dari bulan ke bulan hingga masa manfaat aset habis.",
        "tip": "Setiap akhir bulan, nilai penyusutan otomatis masuk ke Laporan Laba Rugi sebagai Beban Depresiasi."
      }
    ],
    "uiGuide": [
      {
        "name": "Tombol '+ Tambah Aset Baru'",
        "type": "Tombol",
        "description": "Membuka formulir pendaftaran barang inventaris aset tetap baru."
      },
      {
        "name": "Kolom 'Nama Aset & Nomor Seri'",
        "type": "Kolom Isian",
        "description": "Nama peralatan/kendaraan dan nomor seri fisik."
      },
      {
        "name": "Kolom 'Harga Perolehan Awal (IDR)'",
        "type": "Kolom Isian",
        "description": "Total biaya pembelian awal saat aset didapatkan."
      },
      {
        "name": "Kolom 'Estimasi Masa Manfaat (Bulan / Tahun)'",
        "type": "Kolom Isian",
        "description": "Perkiraan usia pakai aset sebelum nilainya habis disusutkan."
      },
      {
        "name": "Kolom 'Nilai Residu / Sisa (IDR)'",
        "type": "Kolom Isian",
        "description": "Perkiraan nilai jual rongsok/sisa aset setelah masa manfaat berakhir."
      },
      {
        "name": "Tombol 'Proses Jurnal Penyusutan Bulanan'",
        "type": "Tombol",
        "description": "Mengeksekusi pembukuan beban akumulasi penyusutan bulan berjalan ke neraca."
      }
    ],
    "keyFeatures": [
      {
        "name": "Depresiasi Garis Lurus Otomatis",
        "description": "Perhitungan penyusutan matematis akurat sesuai standar akuntansi."
      },
      {
        "name": "Monitoring Nilai Buku Riil",
        "description": "Mengetahui sisa nilai kekayaan aset riil perusahaan kapan saja."
      }
    ],
    "tipsAndTricks": [
      "Tempelkan label stiker kode aset pada fisik mesin/laptop untuk mempermudah audit inventaris tahunan."
    ],
    "faq": [
      {
        "question": "Bagaimana jika aset dijual atau rusak total sebelum masa manfaatnya habis?",
        "answer": "Gunakan fitur 'Pelepasan / Penjualan Aset (Asset Disposal)'. Sistem akan menghitung laba/rugi atas pelepasan aset tersebut secara otomatis."
      }
    ]
  },
  {
    "id": "reports",
    "menuKey": "reports",
    "title": "Pusat Laporan & Analitik Bisnis (Reports)",
    "category": "Laporan Bisnis",
    "categoryId": "reports",
    "iconName": "TrendingUp",
    "badge": "Laporan Lengkap",
    "targetRole": "Semua Manager / Finance / Owner",
    "path": "/reports",
    "summary": "Hub laporan terintegrasi: Laba Rugi, Neraca, Arus Kas, Rekapitulasi Penjualan, Laporan Stok, Pengeluaran Stok, dan Laporan Kasir.",
    "overview": "Modul Laporan adalah pusat inteligensi data usaha Anda. Menyajikan laporan keuangan berstandar akuntansi dan laporan operasional harian yang dapat difilter berdasarkan tanggal, cabang, kategori, serta diekspor ke PDF dan Excel.",
    "workflow": [
      {
        "step": 1,
        "title": "Pilih Kategori Laporan",
        "description": "Pilih jenis laporan yang dibutuhkan: Laporan Penjualan Invoice, Laporan Pengeluaran Stok (/reports/stock-out), Laba Rugi, Neraca Keuangan, atau Rekap Kasir POS.",
        "screenshotPlaceholder": {
          "caption": "Hub Navigasi Laporan Bisnis",
          "description": "Screenshot kartu menu pilihan berbagai laporan operasional dan keuangan."
        }
      },
      {
        "step": 2,
        "title": "Tentukan Filter Periode & Cabang",
        "description": "Gunakan filter tanggal untuk memilih bulan atau rentang kustom, serta pilih cabang/gudang spesifik jika diperlukan.",
        "tip": "Tampilan tabel analitik interaktif akan langsung menyajikan ringkasan total angka."
      },
      {
        "step": 3,
        "title": "Cetak & Ekspor Data",
        "description": "Klik tombol 'Export Excel' untuk pengolahan data lanjutan atau 'Cetak PDF' untuk laporan resmi kepada investor/pimpinan.",
        "screenshotPlaceholder": {
          "caption": "Pratinjau Laporan & Tombol Ekspor",
          "description": "Screenshot tampilan laporan siap cetak dengan tombol Export Excel dan PDF."
        }
      }
    ],
    "uiGuide": [
      {
        "name": "Kartu 'Laporan Penjualan (Sales Report)'",
        "type": "Tombol",
        "description": "Membuka analitik omset faktur, produk terlaris, dan performa per sales."
      },
      {
        "name": "Kartu 'Laporan Pengeluaran Stok (Stock Out Report)'",
        "type": "Tombol",
        "description": "Membuka rekapitulasi mutasi pengeluaran barang non-jual dan pemakaian internal."
      },
      {
        "name": "Kartu 'Laporan Laba Rugi (Profit & Loss)'",
        "type": "Tombol",
        "description": "Melihat pendapatan bersih, HPP, beban operasional, dan laba bersih usaha."
      },
      {
        "name": "Kartu 'Neraca Keuangan (Balance Sheet)'",
        "type": "Tombol",
        "description": "Melihat posisi keseimbangan total Aset, Kewajiban Hutang, dan Ekuitas Modal."
      },
      {
        "name": "Kartu 'Laporan Arus Kas (Cash Flow)'",
        "type": "Tombol",
        "description": "Melihat aliran kas masuk dan kas keluar dari aktivitas operasi, investasi, dan pendanaan."
      },
      {
        "name": "Tombol 'Export Excel (.xlsx)'",
        "type": "Tombol",
        "description": "Mengunduh seluruh baris data laporan ke format lembar kerja spreadsheet Excel."
      },
      {
        "name": "Tombol 'Cetak PDF / Print'",
        "type": "Tombol",
        "description": "Mencetak laporan rapi berlogo perusahaan siap tanda tangan pimpinan."
      }
    ],
    "keyFeatures": [
      {
        "name": "Filter Fleksibel Multi-Dimensi",
        "description": "Penyaringan berdasarkan periode hari, bulan, kuartal, tahun, gudang, dan divisi."
      },
      {
        "name": "Visualisasi Grafik Interaktif",
        "description": "Dilengkapi bagan perbandingan untuk membaca tren perkembangan bisnis secara visual."
      }
    ],
    "tipsAndTricks": [
      "Gunakan Laporan Arus Kas secara berkala untuk memastikan bisnis memiliki likuiditas dana yang aman untuk operasional 3 bulan ke depan."
    ],
    "faq": [
      {
        "question": "Apakah data laporan dihitung secara realtime?",
        "answer": "Ya, seluruh laporan langsung mencerminkan transaksi terbaru yang dimasukkan oleh staf tanpa perlu menunggu proses tutup buku harian."
      },
      {
        "question": "Apakah staf kasir bisa melihat laporan Laba Rugi perusahaan?",
        "answer": "Tidak. Hak akses menu laporan dibatasi secara ketat berdasarkan role pengguna. Laporan keuangan hanya bisa diakses oleh Owner, Admin, dan Finance."
      }
    ]
  },
  {
    "id": "settings",
    "menuKey": "settings",
    "title": "Pengaturan Bisnis & Profil Usaha (Settings)",
    "category": "Sistem & Pengaturan",
    "categoryId": "system",
    "iconName": "Settings",
    "badge": "Konfigurasi",
    "targetRole": "Admin / Owner / Superadmin",
    "path": "/settings",
    "summary": "Kustomisasi profil usaha, logo nota, rekening bank penampung, format nomor seri faktur, printer, bahasa, dan hak akses tim.",
    "overview": "Modul Pengaturan adalah pusat konfigurasi menyeluruh aplikasi untuk bisnis Anda. Anda dapat mengunggah logo perusahaan, mengatur nomor rekening yang tampil pada faktur, mengundang anggota tim divisi, mengelola shift kerja, mengatur kustomisasi menu sidebar, dan melihat log audit aktivitas.",
    "workflow": [
      {
        "step": 1,
        "title": "Lengkapi Profil & Logo Usaha",
        "description": "Isi nama usaha, email resmi, nomor telepon, alamat lengkap, dan unggah logo perusahaan beresolusi tinggi.",
        "screenshotPlaceholder": {
          "caption": "Pengaturan Profil Usaha & Logo",
          "description": "Screenshot pengisian profil bisnis, upload logo nota, dan informasi kontak."
        }
      },
      {
        "step": 2,
        "title": "Atur Rekening Bank Penampung",
        "description": "Daftarkan rekening bank (BCA, Mandiri, BRI, BNI) yang akan muncul sebagai instruksi pembayaran transfer pada invoice.",
        "tip": "Anda juga dapat mengunggah gambar QRIS statis toko untuk pembayaran digital."
      },
      {
        "step": 3,
        "title": "Kelola Tim & Hak Akses Divisi",
        "description": "Buka menu 'Tim & Hak Akses' untuk mengundang staf baru dan memberikan peran (Sales, Purchasing, Gudang, Finance, Kasir) atau hak akses kustom.",
        "screenshotPlaceholder": {
          "caption": "Manajemen Tim & Hak Akses Pengguna",
          "description": "Screenshot tabel pengguna tim dan pengaturan checklist izin akses menu."
        }
      }
    ],
    "uiGuide": [
      {
        "name": "Kolom 'Nama Usaha / Perusahaan'",
        "type": "Kolom Isian",
        "description": "Nama entitas bisnis yang akan tercetak pada kop surat faktur dan kuitansi."
      },
      {
        "name": "Kolom 'Unggah Logo Perusahaan'",
        "type": "Kolom Isian",
        "description": "Upload file gambar logo (PNG/JPG) untuk kop faktur, struk, dan laporan."
      },
      {
        "name": "Daftar 'Rekening Bank Penerima Pembayaran'",
        "type": "Tabel Data",
        "description": "Kelola nama bank, nomor rekening, dan nama pemilik rekening untuk instruksi bayar invoice."
      },
      {
        "name": "Kartu 'Tim & Hak Akses Divisi (/settings/users)'",
        "type": "Tombol",
        "description": "Mengelola undangan staf, penetapan role wewenang, dan checklist izin menu."
      },
      {
        "name": "Kartu 'Master Shift Karyawan (/settings/shifts)'",
        "type": "Tombol",
        "description": "Mengatur jadwal jam kerja shift pagi, siang, dan malam untuk absensi staf."
      },
      {
        "name": "Kartu 'Kustomisasi Sidebar Menu (/settings/sidebar)'",
        "type": "Tombol",
        "description": "Menyembunyikan atau menampilkan menu sidebar sesuai preferensi alur kerja operasional."
      },
      {
        "name": "Kartu 'Log Audit Aktivitas (/settings/audit-logs)'",
        "type": "Tombol",
        "description": "Memantau rekam jejak aktivitas staf (siapa yang membuat, mengubah, atau menghapus data)."
      },
      {
        "name": "Dropdown 'Pilihan Bahasa (Bahasa Indonesia / English)'",
        "type": "Dropdown",
        "description": "Mengganti bahasa tampilan antarmuka aplikasi secara instan."
      }
    ],
    "keyFeatures": [
      {
        "name": "Kustomisasi Whitelabel Lengkap",
        "description": "Tampilan dokumen PDF dan struk kasir 100% menggunakan identitas dan merek usaha Anda."
      },
      {
        "name": "Manajemen Akses Berbasis Peran (RBAC)",
        "description": "Melindungi data sensitif keuangan agar hanya dapat dibuka oleh staf yang berwenang."
      },
      {
        "name": "Audit Trail Keamanan",
        "description": "Mencegah kecurangan internal dengan mencatat setiap aksi penting pengguna."
      }
    ],
    "tipsAndTricks": [
      "Gunakan logo berformat PNG transparan agar tampilan kop surat faktur terlihat jernih dan profesional."
    ],
    "faq": [
      {
        "question": "Bagaimana cara mengganti mata uang utama bisnis?",
        "answer": "Anda dapat memilih mata uang utama (IDR, USD, SGD, MYR) pada bagian Pengaturan Mata Uang."
      },
      {
        "question": "Apakah saya bisa memiliki lebih dari 1 bisnis/perusahaan dalam satu akun?",
        "answer": "Bisa. Klik tombol dropdown nama bisnis di sidebar kiri atas, lalu klik '+ Tambah Bisnis Baru'."
      }
    ]
  },
  {
    "id": "settings_security",
    "menuKey": "settings_security",
    "title": "Keamanan Akun & Manajemen Sesi",
    "category": "Sistem & Pengaturan",
    "categoryId": "system",
    "iconName": "Shield",
    "badge": "Keamanan",
    "targetRole": "Semua Pengguna",
    "path": "/settings/security",
    "summary": "Ubah kata sandi, verifikasi sesi login aktif per perangkat, dan perlindungan keamanan akun pengguna.",
    "overview": "Halaman Keamanan Akun melindungi privasi dan data bisnis Anda dari akses tidak sah. Pengguna dapat memperbarui password secara berkala serta memantau perangkat atau browser mana saja yang sedang aktif login.",
    "workflow": [
      {
        "step": 1,
        "title": "Ubah Kata Sandi (Password)",
        "description": "Masukkan password lama, buat password baru yang kuat (minimal 8 karakter kombinasi huruf, angka, dan simbol), lalu klik Simpan.",
        "screenshotPlaceholder": {
          "caption": "Form Ubah Password Akun",
          "description": "Screenshot pengisian kata sandi baru dan konfirmasi sandi."
        }
      },
      {
        "step": 2,
        "title": "Periksa Sesi Login Aktif",
        "description": "Lihat daftar perangkat (Laptop, HP, Tablet) yang sedang mengakses akun Anda beserta lokasi dan waktu login terakhir.",
        "tip": "Jika ada perangkat asing yang mencurigakan, klik 'Keluar dari Sesi Ini'."
      }
    ],
    "uiGuide": [
      {
        "name": "Kolom 'Kata Sandi Saat Ini'",
        "type": "Kolom Isian",
        "description": "Verifikasi password lama untuk memastikan keamanan pemilik akun."
      },
      {
        "name": "Kolom 'Kata Sandi Baru & Konfirmasi'",
        "type": "Kolom Isian",
        "description": "Membuat kata sandi baru yang memenuhi standar keamanan."
      },
      {
        "name": "Daftar Sesi Login Aktif",
        "type": "Tabel Data",
        "description": "Menampilkan jenis browser, sistem operasi, alamat IP, dan waktu aktif terakhir."
      },
      {
        "name": "Tombol 'Keluar dari Semua Perangkat Lain'",
        "type": "Tombol",
        "description": "Memaksa logout seluruh sesi di HP/komputer lain secara serentak."
      }
    ],
    "keyFeatures": [
      {
        "name": "Enkripsi Password Tingkat Tinggi",
        "description": "Kata sandi dienkripsi dengan standar hash industri modern yang aman."
      },
      {
        "name": "Force Logout Perangkat Tak Dikenal",
        "description": "Menutup akses login liar secara instan dari satu tombol."
      }
    ],
    "tipsAndTricks": [
      "Jangan pernah membagikan email dan password login Anda kepada staf. Selalu buatkan akun tersendiri untuk setiap karyawan."
    ],
    "faq": [
      {
        "question": "Bagaimana jika saya lupa kata sandi saat ingin login?",
        "answer": "Gunakan tautan 'Lupa Password' di halaman login untuk menerima tautan reset kata sandi melalui email terdaftar Anda."
      }
    ]
  }
];
