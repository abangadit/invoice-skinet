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
  },
  {
    id: "admin",
    name: "Manajemen Superadmin",
    description: "Ringkasan sistem pusat, audit trail, dan manajemen pengguna global",
    iconName: "Shield"
  }
];

export const HELP_TOPICS: HelpTopic[] = [
  // 1. DASHBOARD
  {
    id: "dashboard",
    menuKey: "dashboard",
    title: "Dashboard & Ringkasan Bisnis",
    category: "Menu Utama & POS",
    categoryId: "main",
    iconName: "Layers",
    badge: "Utama",
    targetRole: "Semua Pengguna / Owner / Admin",
    path: "/",
    summary: "Pusat visualisasi performa bisnis, grafik penjualan, status piutang, dan aktivitas terbaru secara real-time.",
    overview: "Halaman Dashboard adalah halaman pertama yang tampil setelah login. Halaman ini memberikan rangkuman indikator kinerja utama (KPI) usaha Anda seperti Total Penjualan, Tagihan Belum Terbayar (Unpaid Invoices), Pengeluaran Bulan Ini, serta Peringatan Stok Minimum.",
    workflow: [
      {
        step: 1,
        title: "Pilih Periode Waktu",
        description: "Gunakan filter tanggal di bagian atas dashboard untuk melihat data Hari Ini, 7 Hari Terakhir, Bulan Ini, atau Kustom.",
        tip: "Data grafik akan otomatis diperbarui secara instan saat Anda mengganti filter periode.",
        screenshotPlaceholder: {
          caption: "Tampilan Ringkasan Metrik Dashboard",
          description: "Screenshot kartu ringkasan omset, profit estimasi, dan grafik tren mingguan."
        }
      },
      {
        step: 2,
        title: "Pantau Notifikasi & Peringatan Penting",
        description: "Periksa widget peringatan jatuh tempo nota pelanggan dan peringatan produk dengan stok di bawah batas aman.",
        tip: "Klik langsung pada kartu peringatan stok untuk menuju modul penambahan stok (Restock)."
      },
      {
        step: 3,
        title: "Akses Cepat Transaksi",
        description: "Gunakan tombol aksi cepat di pojok kanan atau sidebar untuk langsung membuat Faktur Baru (+ Buat Invoice) atau buka POS Kasir.",
        screenshotPlaceholder: {
          caption: "Aksi Cepat & Navigasi Cepat",
          description: "Screenshot tombol aksi cepat (+ Invoice Baru, + POS) di dashboard."
        }
      }
    ],
    keyFeatures: [
      { name: "Widget Metrik KPI", description: "Menampilkan kartu total omzet, laba kotor, piutang tertahan, dan kas masuk." },
      { name: "Grafik Tren Penjualan", description: "Visualisasi tren penjualan harian dan bulanan untuk analisa pertumbuhan." },
      { name: "Peringatan Stok Rendah", description: "Daftar otomatis barang-barang yang kuantitasnya mendekati nol / batas minimum." },
      { name: "Feed Aktivitas Terbaru", description: "Riwayat pembuatan invoice dan transaksi terakhir yang dilakukan staf." }
    ],
    tipsAndTricks: [
      "Periksa dashboard setiap pagi untuk memprioritaskan penagihan piutang jatuh tempo hari ini.",
      "Gunakan tombol refresh profil jika data baru belum terupdate karena kendala koneksi."
    ],
    faq: [
      { question: "Mengapa angka total pendapatan belum bertambah?", answer: "Angka pendapatan bertambah saat invoice dibuat atau status pembayaran tercatat lunas, periksa filter rentang tanggal di pojok atas." }
    ]
  },

  // 2. POS KASIR
  {
    id: "pos",
    menuKey: "pos",
    title: "Point of Sale (POS / Kasir)",
    category: "Menu Utama & POS",
    categoryId: "main",
    iconName: "ShoppingCart",
    badge: "Transaksi Cepat",
    targetRole: "Kasir / Sales / Admin / Owner",
    path: "/pos",
    summary: "Antarmuka kasir cepat untuk melayani transaksi retail, scan barcode, diskon langsung, dan cetak struk nota.",
    overview: "Modul POS dirancang khusus untuk kecepatan pelayanan kasir langsung di toko fisik atau outlet. Dilengkapi dukungan barcode scanner, tombol pintas kategori produk, keranjang belanja dinamis, kalkulator kembalian, dan cetak struk printer thermal (Bluetooth/USB/Dot Matrix).",
    workflow: [
      {
        step: 1,
        title: "Buka Shift Kasir",
        description: "Masukkan modal awal (kas awal di laci kasir) sebelum memulai transaksi harian.",
        tip: "Modal awal penting dicatat untuk mencocokkan laporan penerimaan fisik uang tunai saat tutup kasir di akhir hari.",
        screenshotPlaceholder: {
          caption: "Modal Awal Kasir",
          description: "Screenshot pop-up input kas awal shift kasir."
        }
      },
      {
        step: 2,
        title: "Pilih Produk atau Scan Barcode",
        description: "Klik pada kartu produk, gunakan filter kategori, atau arahkan scanner barcode ke barcode produk untuk memasukkannya ke keranjang.",
        tip: "Klik item di keranjang untuk mengubah kuantitas atau memberikan diskon per item."
      },
      {
        step: 3,
        title: "Pilih Pelanggan & Metode Pembayaran",
        description: "Pilih pelanggan (Umum / Pelanggan Terdaftar), lalu pilih metode bayar: Tunai (Cash), QRIS, Transfer Bank, atau Kartu Debit.",
        screenshotPlaceholder: {
          caption: "Antarmuka Kasir & Keranjang Transaksi",
          description: "Screenshot katalog produk di sebelah kiri dan keranjang belanja dengan total di sebelah kanan."
        }
      },
      {
        step: 4,
        title: "Selesaikan & Cetak Struk",
        description: "Masukkan nominal uang diterima, sistem akan menghitung kembalian otomatis. Klik tombol Bayar lalu Cetak Struk (Thermal / Dot Matrix).",
        tip: "Struk juga dapat dikirim secara digital melalui WhatsApp pelanggan jika nomor HP terisi."
      }
    ],
    keyFeatures: [
      { name: "Pencarian Cepat & Barcode", description: "Mendukung input barcode otomatis dengan auto-add ke keranjang belanja." },
      { name: "Diskon & Pajak Otomatis", description: "Pengaturan diskon persentase/nominal per item maupun per total nota." },
      { name: "Split Payment / Multi Payment", description: "Fleksibilitas pembayaran sebagian tunai dan sebagian transfer." },
      { name: "Manajemen Shift & Rekonsiliasi", description: "Laporan tutup kasir (Z-Report) untuk menghitung selisih kas fisik vs sistem." }
    ],
    tipsAndTricks: [
      "Gunakan browser Chrome pada mode Fullscreen (F11) agar pandangan kasir lebih luas dan fokus.",
      "Pastikan ukuran kertas thermal (58mm atau 80mm) telah disesuaikan di Pengaturan Printer."
    ],
    faq: [
      { question: "Bisakah melakukan transaksi saat offline?", answer: "Sistem membutuhkan koneksi internet untuk sinkronisasi stok dan pencatatan kas secara terpusat." }
    ]
  },

  // 3. PROSPEK (LEADS)
  {
    id: "leads",
    menuKey: "sales",
    title: "Prospek & Peluang (Leads)",
    category: "Penjualan & Piutang",
    categoryId: "sales",
    iconName: "Target",
    badge: "CRM Sales",
    targetRole: "Sales / Marketing / Admin",
    path: "/leads",
    summary: "Manajemen calon pelanggan, tahapan follow-up (pipeline), estimasi nilai peluang, dan konversi ke pelanggan aktif.",
    overview: "Modul Leads membantu tim penjualan melacak calon pembeli potensial mulai dari kontak pertama hingga siap melakukan pembelian. Anda dapat memantau status prospek dalam tampilan papan Kanban atau tabel data.",
    workflow: [
      {
        step: 1,
        title: "Tambah Prospek Baru",
        description: "Klik '+ Tambah Prospek', isi nama kontak, nomor WhatsApp/Telepon, nama perusahaan, dan estimasi nilai potensi transaksi.",
        screenshotPlaceholder: {
          caption: "Form Input Prospek Baru",
          description: "Screenshot formulir penambahan data prospek dan sumber referensi (Instagram, Referral, Iklan)."
        }
      },
      {
        step: 2,
        title: "Update Status Follow-Up",
        description: "Geser kartu prospek di Kanban atau ubah statusnya: Baru -> Dihubungi -> Negosiasi -> Tertarik -> Deal / Lost.",
        tip: "Catat riwayat percakapan atau janji temu di kolom catatan aktivitas."
      },
      {
        step: 3,
        title: "Konversi ke Customer & Buat Penawaran",
        description: "Setelah prospek sepakat (Deal), klik tombol 'Konversi ke Pelanggan' untuk otomatis mendaftarkannya ke master Customer dan membuat Quotation.",
        screenshotPlaceholder: {
          caption: "Pipeline Prospek (Kanban Board)",
          description: "Screenshot papan Kanban alur tahapan prospek dari kontak awal sampai deal."
        }
      }
    ],
    keyFeatures: [
      { name: "Kanban Pipeline View", description: "Visualisasi tahapan penjualan dengan drag-and-drop antar kolom status." },
      { name: "One-Click Conversion", description: "Konversi data calon pelanggan menjadi Customer terdaftar tanpa input ulang." },
      { name: "Pencatatan Sumber Prospek", description: "Analisis saluran pemasaran yang paling banyak menghasilkan penjualan." }
    ],
    tipsAndTricks: [
      "Selalu jadwalkan tanggal follow-up berikutnya agar calon pembeli tidak terbengkalai."
    ],
    faq: [
      { question: "Apa bedanya Leads dengan Customer?", answer: "Leads adalah kontak yang belum tentu membeli, sedangkan Customer adalah kontak yang sudah resmi bertransaksi atau terdaftar sebagai mitra." }
    ]
  },

  // 4. QUOTATION
  {
    id: "quotation",
    menuKey: "quotation",
    title: "Surat Penawaran Harga (Quotations)",
    category: "Penjualan & Piutang",
    categoryId: "sales",
    iconName: "FileSpreadsheet",
    badge: "Pra-Penjualan",
    targetRole: "Sales / Admin / Owner",
    path: "/quotation",
    summary: "Pembuatan estimasi harga resmi untuk klien, syarat & ketentuan, masa berlaku penawaran, serta ekspor PDF resmi.",
    overview: "Modul Surat Penawaran Harga (Quotation) memungkinkan Anda membuat proposal penawaran harga yang rapi dan profesional untuk dikirimkan kepada calon pelanggan sebelum kesepakatan final dan penerbitan invoice.",
    workflow: [
      {
        step: 1,
        title: "Buat Penawaran Baru",
        description: "Masuk ke menu Quotation -> Klik '+ Buat Penawaran'. Pilih nama pelanggan atau masukkan pelanggan baru.",
        screenshotPlaceholder: {
          caption: "Form Pembuatan Surat Penawaran",
          description: "Screenshot form pembuatan quotation lengkap dengan rincian item barang dan termin pembayaran."
        }
      },
      {
        step: 2,
        title: "Tambahkan Item Barang & Diskon",
        description: "Pilih produk dari katalog atau ketik item kustom, atur kuantitas, harga khusus proyek, dan catatan syarat garansi.",
        tip: "Anda dapat mengatur tanggal masa berlaku penawaran (misal: Berlaku 14 hari)."
      },
      {
        step: 3,
        title: "Kirim PDF ke Klien",
        description: "Klik 'Cetak PDF' atau 'Kirim via WhatsApp' untuk membagikan surat penawaran berkop resmi perusahaan.",
        screenshotPlaceholder: {
          caption: "Pratinjau PDF Quotation Resmi",
          description: "Screenshot tampilan dokumen PDF penawaran lengkap dengan tanda tangan digital & logo perusahaan."
        }
      },
      {
        step: 4,
        title: "Konversi ke Sales Order / Invoice",
        description: "Ketika penawaran disetujui klien, klik tombol 'Ubah ke Invoice' atau 'Ubah ke Sales Order' tanpa perlu mengetik ulang item.",
        tip: "Status penawaran akan otomatis berubah menjadi Disetujui (Accepted)."
      }
    ],
    keyFeatures: [
      { name: "Konversi 1-Klik ke Invoice", description: "Transformasi instan dari surat penawaran menjadi tagihan aktif." },
      { name: "Masa Berlaku Penawaran", description: "Pengingat otomatis jika penawaran telah melewati batas waktu berlaku." },
      { name: "Template Berkop Resmi", description: "Desain PDF elegan lengkap dengan logo perusahaan, nomor surat resmi, dan tanda tangan." }
    ],
    tipsAndTricks: [
      "Sertakan syarat pembayaran yang jelas (misal DP 50% di awal) pada kolom Syarat & Ketentuan di bawah nota."
    ],
    faq: [
      { question: "Apakah pembuatan Quotation memotong stok barang?", answer: "Tidak. Quotation hanya bersifat estimasi penawaran harga, stok baru terpotong saat Sales Order/Invoice dibuat atau Delivery Order diproses." }
    ]
  },

  // 5. SALES ORDER
  {
    id: "sales",
    menuKey: "sales",
    title: "Pesanan Penjualan (Sales Orders)",
    category: "Penjualan & Piutang",
    categoryId: "sales",
    iconName: "ClipboardCheck",
    badge: "Order Penjualan",
    targetRole: "Sales / Warehouse / Admin",
    path: "/sales",
    summary: "Pencatatan pesanan resmi dari pembeli sebelum barang dipersiapkan di gudang dan dikirim ke lokasi.",
    overview: "Sales Order (SO) berfungsi sebagai bukti kesepakatan pemesanan barang/jasa dari pembeli. Dokumen ini menjadi instruksi bagi bagian gudang untuk menyiapkan barang (packing) dan bagian pengiriman untuk membuat surat jalan.",
    workflow: [
      {
        step: 1,
        title: "Terbitkan Sales Order",
        description: "Buat SO langsung dari menu Pesanan Penjualan atau hasil konversi dari Surat Penawaran yang disetujui.",
        screenshotPlaceholder: {
          caption: "Daftar Sales Order",
          description: "Screenshot tabel data pesanan penjualan dengan indikator status pemenuhan."
        }
      },
      {
        step: 2,
        title: "Periksa Ketersediaan Stok",
        description: "Sistem akan mengecek ketersediaan stok fisik di gudang. Jika stok mencukupi, status pesanan siap diproses.",
        tip: "Jika stok kurang, sistem akan memberikan indikator peringatan untuk membuat Purchase Order ke supplier."
      },
      {
        step: 3,
        title: "Proses Pengiriman (Delivery)",
        description: "Klik 'Buat Surat Jalan (Delivery Order)' untuk mengalihkan pesanan ke tim logistik/gudang.",
        screenshotPlaceholder: {
          caption: "Detail Sales Order & Tombol Aksi Pengiriman",
          description: "Screenshot rincian SO dengan tombol Buat Surat Jalan dan Buat Invoice."
        }
      }
    ],
    keyFeatures: [
      { name: "Pelacakan Status Order", description: "Status: Menunggu Diproses -> Sedang Disiapkan -> Dikirim Sebagian -> Selesai." },
      { name: "Integrasi Surat Jalan", description: "Terhubung langsung dengan modul Delivery Orders untuk kelancaran logistik." }
    ],
    tipsAndTricks: [
      "Gunakan Sales Order saat transaksi bernilai besar atau membutuhkan waktu beberapa hari sebelum pengiriman."
    ],
    faq: [
      { question: "Kapan saya harus pakai SO dibanding langsung Invoice?", answer: "Gunakan SO jika barang perlu waktu disiapkan/dikemas dulu oleh tim gudang sebelum dikirim dan ditagih." }
    ]
  },

  // 6. DELIVERY ORDERS (SURAT JALAN)
  {
    id: "delivery",
    menuKey: "delivery",
    title: "Surat Jalan & Pengiriman (Delivery)",
    category: "Penjualan & Piutang",
    categoryId: "sales",
    iconName: "Truck",
    badge: "Logistik",
    targetRole: "Gudang / Kurir / Admin",
    path: "/delivery",
    summary: "Pembuatan surat jalan pengiriman barang, detail armada/driver, nomor resi, dan konfirmasi penerimaan pelanggan.",
    overview: "Surat Jalan (Delivery Order / DO) adalah dokumen wajib yang dibawa oleh kurir atau supir saat mengirimkan barang pesanan ke lokasi pelanggan sebagai bukti sah pengeluaran dan penyerahan barang.",
    workflow: [
      {
        step: 1,
        title: "Buat Surat Jalan",
        description: "Pilih Sales Order atau Invoice yang akan dikirim, tentukan kuantitas barang yang diberangkatkan.",
        screenshotPlaceholder: {
          caption: "Pembuatan Surat Jalan Pengiriman",
          description: "Screenshot formulir DO dengan pemilihan alamat tujuan, nama driver, dan plat nomor kendaraan."
        }
      },
      {
        step: 2,
        title: "Cetak Surat Jalan Rangkap",
        description: "Cetak dokumen Surat Jalan dalam format A4/A5 untuk dibawa oleh pengemudi dan ditandatangani penerima barang.",
        tip: "Surat jalan biasanya dicetak 2-3 rangkap (untuk arsip gudang, finance, dan tanda terima pelanggan)."
      },
      {
        step: 3,
        title: "Konfirmasi Penerimaan (Delivered)",
        description: "Setelah barang diterima, perbarui status menjadi 'Terkirim / Diterima' dan upload foto bukti tanda terima fisik.",
        screenshotPlaceholder: {
          caption: "Format Cetak Surat Jalan Resmi",
          description: "Screenshot pratinjau cetak surat jalan dengan kolom tanda tangan pengirim, supir, dan penerima."
        }
      }
    ],
    keyFeatures: [
      { name: "Partial Delivery", description: "Mendukung pengiriman bertahap (sebagian barang dikirim hari ini, sisanya besok)." },
      { name: "Pengurangan Stok Fisik", description: "Mengurangi saldo stok gudang tepat saat status surat jalan diberangkatkan." },
      { name: "Bukti Foto Penerimaan", description: "Kemampuan melampirkan foto tanda terima atau tanda tangan digital penerima." }
    ],
    tipsAndTricks: [
      "Pastikan driver selalu meminta stempel atau tanda tangan jelas nama penerima di lembar surat jalan fisik."
    ],
    faq: [
      { question: "Apakah bisa kirim barang dari 1 SO menjadi 2 Surat Jalan terpisah?", answer: "Bisa, Anda cukup memasukkan kuantitas sesuai yang siap dikirim saat membuat Surat Jalan pertama, lalu buat DO kedua untuk sisanya." }
    ]
  },

  // 7. INVOICE
  {
    id: "invoice",
    menuKey: "invoice",
    title: "Faktur & Penagihan (Invoices)",
    category: "Penjualan & Piutang",
    categoryId: "sales",
    iconName: "FileText",
    badge: "Finansial Utama",
    targetRole: "Finance / Sales / Admin / Owner",
    path: "/invoice",
    summary: "Pembuatan tagihan penjualan resmi, pengingat jatuh tempo, pengiriman invoice online, dan pelacakan pembayaran.",
    overview: "Modul Faktur (Invoice) adalah inti dari penerbitan tagihan komersial kepada klien. Dilengkapi dengan nomor invoice otomatis, perhitungan pajak (PPN), diskon, pilihan rekening bank tujuan transfer, tautan publik tagihan, dan rekonsiliasi pembayaran.",
    workflow: [
      {
        step: 1,
        title: "Buat Faktur Baru",
        description: "Klik '+ Buat Invoice' di menu Invoice atau tombol cepat di pojok kanan atas layar.",
        screenshotPlaceholder: {
          caption: "Formulir Pembuatan Invoice Lengkap",
          description: "Screenshot halaman input invoice dengan pilihan pelanggan, rincian barang, termin pembayaran, dan rekening bank."
        }
      },
      {
        step: 2,
        title: "Isi Rincian Tagihan & Jatuh Tempo",
        description: "Pilih nama pelanggan, tanggal terbit, tanggal jatuh tempo (Due Date), pilih produk/jasa, dan tentukan PPN jika ada.",
        tip: "Gunakan fitur 'Termin Pembayaran' seperti Net 14 atau Net 30 agar tanggal jatuh tempo terhitung otomatis."
      },
      {
        step: 3,
        title: "Kirim Invoice ke Pelanggan",
        description: "Gunakan tombol 'Kirim WhatsApp' untuk mengirim pesan dan link invoice langsung ke WhatsApp pelanggan, atau 'Cetak PDF'.",
        screenshotPlaceholder: {
          caption: "Pratinjau Dokumen Invoice & Tombol Bagikan WhatsApp",
          description: "Screenshot tampilan invoice siap kirim dengan tombol Share WA, Download PDF, dan Catat Bayar."
        }
      },
      {
        step: 4,
        title: "Pencatatan Pembayaran",
        description: "Ketika pelanggan mentransfer, klik 'Catat Pembayaran', masukkan jumlah diterima dan rekening tujuan (BCA, Mandiri, Kas Tunai).",
        tip: "Status invoice otomatis berganti dari 'Belum Dibayar' (Unpaid) -> 'Dibayar Sebagian' (Partial) -> 'Lunas' (Paid)."
      }
    ],
    keyFeatures: [
      { name: "Nomor Faktur Otomatis", description: "Format nomor invoice yang fleksibel dan berurutan sesuai pola konfigurasi usaha." },
      { name: "Public Invoice Link", description: "Tautan online unik yang bisa diakses pelanggan langsung dari HP untuk melihat tagihan & bukti bayar." },
      { name: "Dukungan Multi-Termin (DP / Termin)", description: "Fleksibilitas pembayaran bertahap (Down Payment) hingga pelunasan akhir." },
      { name: "Cetak Format Dot Matrix & Laser PDF", description: "Pilihan cetak format kertas continuous form dot matrix atau format PDF modern." }
    ],
    tipsAndTricks: [
      "Tambahkan catatan rekening bank dan QRIS statis perusahaan pada catatan kaki invoice agar klien mudah mentransfer."
    ],
    faq: [
      { question: "Bagaimana cara membatalkan invoice yang salah?", answer: "Buka detail invoice, lalu pilih menu Opsi -> Batalkan Invoice (Void). Invoice batal tidak akan dihitung dalam laporan keuangan." }
    ]
  },

  // 8. NOTA JATUH TEMPO
  {
    id: "invoice_due",
    menuKey: "invoice",
    title: "Peringatan Jatuh Tempo (Due Alerts)",
    category: "Penjualan & Piutang",
    categoryId: "sales",
    iconName: "Clock",
    badge: "Monitoring Piutang",
    targetRole: "Finance / Collector / Admin",
    path: "/invoice/due",
    summary: "Monitoring terpusat invoice yang telah melewati batas tanggal jatuh tempo untuk mempercepat penagihan piutang.",
    overview: "Halaman ini menyaring semua tagihan yang terlambat dibayar (Overdue) dan yang mendekati tanggal jatuh tempo dalam 3-7 hari ke depan. Membantu tim finance dan penagihan melakukan follow-up tepat waktu.",
    workflow: [
      {
        step: 1,
        title: "Periksa Daftar Tagihan Jatuh Tempo",
        description: "Lihat daftar invoice yang diurutkan berdasarkan hari keterlambatan (Overdue Days: 1-30 hari, 31-60 hari, >90 hari).",
        screenshotPlaceholder: {
          caption: "Tabel Monitoring Nota Jatuh Tempo",
          description: "Screenshot daftar piutang jatuh tempo dengan badge warna merah untuk tagihan kritis."
        }
      },
      {
        step: 2,
        title: "Kirim Pengingat Tagihan (Reminder)",
        description: "Klik tombol 'Kirim Pengingat WhatsApp' untuk mengirimkan template pesan pengingat sopan beserta link invoice ke pelanggan.",
        tip: "Pesan WhatsApp sudah terisi otomatis nama pelanggan, nomor nota, nominal tagihan, dan nomor rekening."
      }
    ],
    keyFeatures: [
      { name: "Pengelompokan Umur Piutang (Aging AR)", description: "Melihat kesehatan arus kas berdasarkan umur keterlambatan tagihan." },
      { name: "One-Click WhatsApp Reminder", description: "Mengirim template pesan pengingat tagihan ramah dalam satu sentuhan." }
    ],
    tipsAndTricks: [
      "Lakukan follow-up rutin setiap hari Senin atau awal bulan untuk meminimalkan piutang macet (bad debts)."
    ],
    faq: [
      { question: "Apakah ada biaya tambahan untuk mengirim pengingat WhatsApp?", answer: "Pengiriman menggunakan tautan WhatsApp Web / Aplikasi langsung dari perangkat Anda tanpa biaya SMS gateway." }
    ]
  },

  // 9. PEMBAYARAN & BUKTI BAYAR
  {
    id: "payment",
    menuKey: "payment",
    title: "Penerimaan Pembayaran & Bukti Transfer",
    category: "Penjualan & Piutang",
    categoryId: "sales",
    iconName: "CreditCard",
    badge: "Kas Masuk",
    targetRole: "Finance / Kasir / Admin",
    path: "/payment",
    summary: "Pencatatan riwayat transaksi kas masuk, verifikasi bukti transfer yang diunggah pelanggan, dan kuitansi penerimaan.",
    overview: "Modul Pembayaran menyimpan seluruh mutasi kas masuk yang diterima dari pelanggan. Selain itu, modul ini memiliki fitur verifikasi bukti transfer (Proof of Payment) yang diunggah oleh pelanggan melalui link invoice publik.",
    workflow: [
      {
        step: 1,
        title: "Verifikasi Bukti Transfer Masuk",
        description: "Periksa tab 'Menunggu Verifikasi'. Klik pada bukti transfer yang dikirim pelanggan untuk memeriksa keaslian struk bank.",
        screenshotPlaceholder: {
          caption: "Persetujuan Bukti Transfer Pelanggan",
          description: "Screenshot pratinjau foto struk transfer pelanggan dengan tombol 'Setujui Pembayaran' dan 'Tolak'."
        }
      },
      {
        step: 2,
        title: "Setujui & Terbitkan Kuitansi",
        description: "Klik 'Setujui', pilih akun kas/bank penampung (misal: Bank BCA Bisnis). Sistem akan otomatis memperbarui status invoice menjadi Lunas.",
        tip: "Kuitansi penerimaan pembayaran resmi dapat langsung dicetak atau dikirim ke WhatsApp pelanggan."
      }
    ],
    keyFeatures: [
      { name: "Customer Self-Service Upload", description: "Pelanggan bisa langsung upload struk transfer lewat link invoice tanpa login." },
      { name: "Cetak Kuitansi Resmi", description: "Format kuitansi pembayaran dengan terbilang nominal otomatis dalam bahasa Indonesia." }
    ],
    tipsAndTricks: [
      "Selalu cocokkan mutasi di m-Banking sebelum menekan tombol setujui bukti transfer."
    ],
    faq: [
      { question: "Apa yang terjadi jika pembayaran ditolak?", answer: "Jika ditolak, invoice tetap berstatus Unpaid dan pelanggan dapat mengunggah bukti transfer baru yang benar." }
    ]
  },

  // 10. CUSTOMERS
  {
    id: "customer",
    menuKey: "customer",
    title: "Data Pelanggan (Customers)",
    category: "Penjualan & Piutang",
    categoryId: "sales",
    iconName: "Users",
    badge: "Master Data",
    targetRole: "Sales / Finance / Admin",
    path: "/customer",
    summary: "Database pelanggan, riwayat seluruh transaksi, total piutang berjalan, limit kredit, dan kontak penagihan.",
    overview: "Master Pelanggan adalah pusat data seluruh klien Anda. Di sini Anda dapat melihat profil lengkap pelanggan, NPWP, alamat pengiriman, nomor PIC, riwayat pembelian, serta saldo total piutang yang masih belum dibayar.",
    workflow: [
      {
        step: 1,
        title: "Tambah Pelanggan Baru",
        description: "Klik '+ Tambah Pelanggan', lengkapi Nama Usaha/Individu, Nomor WhatsApp, Email, Alamat Lengkap, dan NPWP (opsional).",
        screenshotPlaceholder: {
          caption: "Form Pendaftaran Pelanggan",
          description: "Screenshot formulir input master data pelanggan baru."
        }
      },
      {
        step: 2,
        title: "Atur Limit Piutang & Termin Default",
        description: "Tentukan batas maksimal plafon piutang (Credit Limit) dan jangka waktu pembayaran default (misal: Net 30).",
        tip: "Sistem akan memberi peringatan jika pelanggan mencoba membuat order baru saat piutangnya melebihi limit."
      },
      {
        step: 3,
        title: "Lihat Buku Pembantu Piutang (Statement of Account)",
        description: "Buka profil pelanggan untuk melihat kartu piutang pelanggan (seluruh invoice vs pembayaran yang pernah dilakukan).",
        screenshotPlaceholder: {
          caption: "Kartu Profil Pelanggan & Riwayat Transaksi",
          description: "Screenshot halaman detail pelanggan yang menampilkan riwayat invoice, pembayaran, dan sisa piutang."
        }
      }
    ],
    keyFeatures: [
      { name: "Buku Pembantu Piutang (Customer Ledger)", description: "Daftar mutasi saldo debit/kredit per pelanggan secara transparan." },
      { name: "Plafon Kredit (Credit Limit)", description: "Mencegah terjadinya piutang macet dengan membatasi nilai transaksi tertunda." }
    ],
    tipsAndTricks: [
      "Simpan nomor WhatsApp PIC penagihan terpisah dari PIC teknis agar pengiriman nota tagihan langsung tepat sasaran."
    ],
    faq: [
      { question: "Bisakah mengimpor data pelanggan dari Excel?", answer: "Bisa, gunakan tombol 'Import Data' di pojok kanan atas tabel pelanggan dengan template CSV yang disediakan." }
    ]
  },

  // 11. PROJECTS
  {
    id: "project",
    menuKey: "project",
    title: "Manajemen Proyek (Projects)",
    category: "Proyek & Operasional",
    categoryId: "project",
    iconName: "Briefcase",
    badge: "Operasional",
    targetRole: "Project Manager / Admin / Owner",
    path: "/project",
    summary: "Pelacakan alur kerja proyek, tahapan milestone, biaya bahan/operasional proyek, dan profitabilitas per proyek.",
    overview: "Modul Proyek dirancang untuk usaha berbasis pengerjaan (kontraktor, jasa IT, event organizer, percetakan khusus). Modul ini mengaitkan invoice penjualan dengan pengeluaran belanja riil untuk menghitung laba bersih aktual per proyek.",
    workflow: [
      {
        step: 1,
        title: "Buat Proyek Baru",
        description: "Klik '+ Proyek Baru', beri nama proyek, hubungkan ke Pelanggan, tentukan nilai kontrak dan tanggal target selesai.",
        screenshotPlaceholder: {
          caption: "Daftar Proyek Aktif",
          description: "Screenshot daftar proyek dengan bar persentase progress pengerjaan."
        }
      },
      {
        step: 2,
        title: "Catat Pengeluaran Khusus Proyek",
        description: "Setiap kali membeli bahan baku atau membayar tukang/subkontraktor, kaitkan biaya (Expense/PO) ke nama proyek ini.",
        tip: "Sistem akan otomatis mengalkulasi total biaya riil (Cost of Goods Sold) untuk proyek tersebut."
      },
      {
        step: 3,
        title: "Pantau Profitabilitas Proyek",
        description: "Lihat kartu keuangan proyek: Nilai Kontrak - Total Biaya Riil = Keuntungan Bersih Proyek (Net Margin).",
        screenshotPlaceholder: {
          caption: "Detail Keuangan & Milestone Proyek",
          description: "Screenshot dashboard proyek yang membandingkan pendapatan tagihan vs biaya operasional yang dikeluarkan."
        }
      }
    ],
    keyFeatures: [
      { name: "Perhitungan Margin Proyek Otomatis", description: "Laporan untung-rugi riil per proyek yang dikerjakan." },
      { name: "Milestone & Task Tracking", description: "Daftar tugas pekerjaan untuk memantau tahapan kemajuan proyek." }
    ],
    tipsAndTricks: [
      "Pastikan setiap struk belanja tukang/material selalu dimasukkan ke sistem dengan memilih tag nama proyek terkait."
    ],
    faq: [
      { question: "Apakah 1 proyek bisa memiliki banyak invoice bertahap?", answer: "Ya, Anda bisa menerbitkan beberapa invoice (DP, Termin 1, Termin 2, Pelunasan) yang semuanya ditautkan ke 1 proyek." }
    ]
  },

  // 12. CATALOG
  {
    id: "catalog",
    menuKey: "catalog",
    title: "Master Katalog Produk & Jasa",
    category: "Pembelian & Gudang",
    categoryId: "purchase",
    iconName: "Briefcase",
    badge: "Master Data",
    targetRole: "Gudang / Purchasing / Admin",
    path: "/catalog",
    summary: "Daftar master produk barang dan jasa layanan, harga jual, harga pokok (HPP), satuan unit, dan barcode SKU.",
    overview: "Katalog adalah pusat data seluruh barang yang Anda jual atau gunakan. Di sini Anda menentukan apakah suatu item merupakan barang berstok (Inventory Item) atau layanan jasa (Service Item), harga jual standar, serta batas stok aman.",
    workflow: [
      {
        step: 1,
        title: "Tambah Produk / Jasa Baru",
        description: "Klik '+ Tambah Produk', masukkan Kode SKU, Nama Barang, Kategori (misal: Elektronik, Jasa Pasang), dan Satuan (Pcs, Box, Meter).",
        screenshotPlaceholder: {
          caption: "Form Tambah Produk / Jasa",
          description: "Screenshot formulir input produk dengan pengaturan harga modal, harga jual, dan tipe barang."
        }
      },
      {
        step: 2,
        title: "Atur Harga Modal & Harga Jual",
        description: "Masukkan Harga Pokok Pembelian (HPP) dan Harga Jual standar toko. Anda juga bisa mengatur diskon tetap atau batas minimum.",
        tip: "Centang 'Lacak Stok Gudang' jika item adalah barang fisik yang kuantitasnya berkurang saat terjual."
      },
      {
        step: 3,
        title: "Generate / Input Barcode",
        description: "Ketik kode barcode produk atau biarkan sistem membuat kode SKU unik untuk dicetak pada label barcode produk fisik.",
        screenshotPlaceholder: {
          caption: "Katalog Produk & Tombol Aksi",
          description: "Screenshot tabel katalog dengan foto produk, harga, dan indikator status stok."
        }
      }
    ],
    keyFeatures: [
      { name: "Tipe Barang vs Jasa", description: "Dukungan produk fisik (berkurang stok) dan jasa layanan (tanpa pengurangan stok)." },
      { name: "Kategori & Satuan Kustom", description: "Pengelompokan produk yang memudahkan filter di POS dan laporan penjualan." }
    ],
    tipsAndTricks: [
      "Lengkapi foto produk dengan ukuran persegi (rasio 1:1) agar terlihat jelas dan menarik pada layar POS kasir."
    ],
    faq: [
      { question: "Bagaimana cara mengubah harga jual barang yang sudah pernah ditransaksikan?", answer: "Anda bisa mengedit harga di katalog kapan saja. Perubahan harga tidak akan mengubah nominal transaksi lampau yang sudah lunas." }
    ]
  },

  // 13. INVENTORY
  {
    id: "inventory",
    menuKey: "inventory",
    title: "Manajemen Stok & Gudang (Inventory)",
    category: "Pembelian & Gudang",
    categoryId: "purchase",
    iconName: "Package",
    badge: "Stok Gudang",
    targetRole: "Gudang / Purchasing / Admin",
    path: "/inventory",
    summary: "Pemantauan saldo stok fisik real-time, penyesuaian stok (Stock Opname), kartu mutasi stok, dan peringatan stok menipis.",
    overview: "Modul Inventaris mencatat pergerakan masuk dan keluar setiap unit barang di gudang Anda. Terintegrasi langsung dengan penjualan di POS/Invoice (Stok Keluar) dan pembelian di Purchase Order (Stok Masuk).",
    workflow: [
      {
        step: 1,
        title: "Pantau Ketersediaan Stok Fisik",
        description: "Buka menu Inventaris untuk melihat jumlah stok saat ini, stok dialokasikan untuk pesanan, dan nilai total aset persediaan.",
        screenshotPlaceholder: {
          caption: "Tabel Saldo Stok Gudang",
          description: "Screenshot daftar inventaris dengan jumlah kuantitas, nilai rupiah stok, dan peringatan stok menipis."
        }
      },
      {
        step: 2,
        title: "Lakukan Penyesuaian Stok (Stock Opname)",
        description: "Klik 'Penyesuaian Stok (Adjustment)' jika ada perbedaan antara hitungan fisik di rak toko dengan data di aplikasi.",
        tip: "Pilih alasan penyesuaian: Hasil Opname Bulanan, Barang Rusak / Kadaluarsa, atau Selisih Input."
      },
      {
        step: 3,
        title: "Cek Kartu Riwayat Mutasi Stok",
        description: "Klik pada nama barang untuk membuka buku mutasi stok (melihat riwayat masuk, keluar, dan sisa per transaksi).",
        screenshotPlaceholder: {
          caption: "Buku Mutasi Stok (Stock Card)",
          description: "Screenshot riwayat pergerakan stok per transaksi lengkap dengan nomor dokumen referensi."
        }
      }
    ],
    keyFeatures: [
      { name: "Peringatan Stok Minimum", description: "Notifikasi otomatis ketika kuantitas barang berada di bawah batas aman." },
      { name: "Penilaian Persediaan (Valuation)", description: "Perhitungan nilai total rupiah barang yang tersimpan di gudang." }
    ],
    tipsAndTricks: [
      "Jadwalkan Stock Opname rutin secara berkala (mingguan atau bulanan) untuk mencegah kerugian akibat barang hilang."
    ],
    faq: [
      { question: "Mengapa stok bisa bernilai minus?", answer: "Stok minus terjadi jika fitur penjualan tetap diizinkan saat stok sistem belum ditambahkan dari pembelian. Segera input PO penerimaan barang." }
    ]
  },

  // 14. BARANG KELUAR (STOCK OUT)
  {
    id: "stock_out",
    menuKey: "inventory",
    title: "Barang Keluar Non-Invoice (Stock Out)",
    category: "Pembelian & Gudang",
    categoryId: "purchase",
    iconName: "Package",
    badge: "Pengurangan Stok",
    targetRole: "Gudang / Admin",
    path: "/inventory/stock-out",
    summary: "Pencatatan pengeluaran barang tanpa faktur penjualan, seperti barang rusak (spoilage), sampel promosi, atau pemakaian sendiri.",
    overview: "Tidak semua barang keluar karena dijual. Modul Stock Out digunakan untuk mencatat pengeluaran barang untuk keperluan internal perusahaan, barang kadaluarsa/pecah, atau sampel tester cuma-cuma sehingga pembukuan stok tetap akurat.",
    workflow: [
      {
        step: 1,
        title: "Catat Pengeluaran Barang",
        description: "Klik '+ Catat Barang Keluar', pilih tanggal pengeluaran dan barang yang dikeluarkan.",
        screenshotPlaceholder: {
          caption: "Form Input Barang Keluar Non-Penjualan",
          description: "Screenshot form pengeluaran stok dengan pemilihan alasan: Pemakaian Sendiri, Rusak, Sampel."
        }
      },
      {
        step: 2,
        title: "Tentukan Kategori Alasan & Beban",
        description: "Pilih alasan: Pemakaian Sendiri, Kerusakan/Expired, atau Promosi. Sistem akan mencatat biaya HPP ke akun beban terkait.",
        tip: "Sertakan catatan atau foto bukti barang yang rusak untuk kebutuhan audit internal."
      }
    ],
    keyFeatures: [
      { name: "Alokasi Akun Beban", description: "Secara otomatis mencatat biaya kerugian ke pos beban operasional akuntansi." },
      { name: "Audit Trail Pengeluaran", description: "Menghindari kebocoran barang di gudang dengan pencatatan nama staf penanggung jawab." }
    ],
    tipsAndTricks: [
      "Wajibkan staf gudang mengisi keterangan jelas pada setiap formulir pengeluaran barang non-invoice."
    ],
    faq: [
      { question: "Apakah pengeluaran ini memengaruhi laporan laba rugi?", answer: "Ya, HPP dari barang yang dikeluarkan akan dicatat sebagai beban operasional/kerugian pada periode tersebut." }
    ]
  },

  // 15. PURCHASE ORDERS
  {
    id: "purchase",
    menuKey: "purchase",
    title: "Pesanan Pembelian (Purchase Orders)",
    category: "Pembelian & Gudang",
    categoryId: "purchase",
    iconName: "Truck",
    badge: "Pengadaan Barang",
    targetRole: "Purchasing / Gudang / Finance",
    path: "/purchase",
    summary: "Pemesanan barang ke pemasok (supplier), persetujuan pengadaan, penerimaan barang ke gudang, dan pencatatan hutang dagang.",
    overview: "Modul Purchase Order (PO) mengelola siklus pembelian barang atau bahan baku dari vendor. Mulai dari pembuatan surat pesanan resmi, pelacakan pengiriman dari supplier, penerimaan fisik di gudang, hingga pencatatan tagihan faktur pembelian.",
    workflow: [
      {
        step: 1,
        title: "Buat Surat Pesanan (PO)",
        description: "Klik '+ Buat PO Baru', pilih Vendor/Supplier, tambahkan item produk yang ingin dibeli beserta harga beli yang disepakati.",
        screenshotPlaceholder: {
          caption: "Form Pembuatan Purchase Order",
          description: "Screenshot form input PO lengkap dengan daftar supplier dan estimasi tanggal kedatangan."
        }
      },
      {
        step: 2,
        title: "Kirim PO ke Vendor & Konfirmasi",
        description: "Cetak dokumen PO atau kirim via email/WhatsApp ke supplier. Status PO menjadi 'Menunggu Pengiriman'.",
        tip: "Dokumen PO berisi nomor resmi pengadaan untuk memudahkan verifikasi saat kurir supplier tiba."
      },
      {
        step: 3,
        title: "Penerimaan Barang di Gudang (Goods Received)",
        description: "Ketika barang sampai di gudang, klik 'Terima Barang'. Masukkan jumlah fisik yang diterima secara riil.",
        screenshotPlaceholder: {
          caption: "Penerimaan Barang & Penambahan Stok Otomatis",
          description: "Screenshot form konfirmasi penerimaan barang yang menambah saldo kuantitas inventaris."
        },
        tip: "Stok gudang akan bertambah secara otomatis tepat saat Anda mengonfirmasi penerimaan barang."
      },
      {
        step: 4,
        title: "Catat Pembayaran Tagihan Vendor",
        description: "Catat pelunasan faktur pembelian dari supplier melalui akun kas/bank untuk melunasi hutang dagang (Accounts Payable)."
      }
    ],
    keyFeatures: [
      { name: "Auto-Restock Stok Gudang", description: "Penerimaan barang langsung menambah saldo stok fisik secara akurat." },
      { name: "Pelacakan Hutang Usaha", description: "Mencatat sisa kewajiban hutang yang harus dibayar kepada pemasok." },
      { name: "Penerimaan Parsial", description: "Mendukung penerimaan bertahap jika vendor mengirim pesanan dalam beberapa kloter." }
    ],
    tipsAndTricks: [
      "Cocokkan Surat Jalan dari vendor dengan dokumen PO sebelum menekan tombol konfirmasi penerimaan barang."
    ],
    faq: [
      { question: "Apakah harga beli di PO otomatis memperbarui HPP barang di katalog?", answer: "Ya, sistem menghitung rata-rata bergerak (moving average) harga modal barang berdasarkan pembelian terbaru." }
    ]
  },

  // 16. VENDORS
  {
    id: "vendor",
    menuKey: "vendor",
    title: "Data Pemasok (Vendors / Suppliers)",
    category: "Pembelian & Gudang",
    categoryId: "purchase",
    iconName: "Building2",
    badge: "Master Data",
    targetRole: "Purchasing / Finance / Admin",
    path: "/vendor",
    summary: "Database pemasok, nomor kontak sales, rekening tujuan transfer, syarat pembayaran, dan riwayat hutang dagang.",
    overview: "Master Vendor menyimpan seluruh data mitra penyuplai barang atau jasa untuk operasional usaha Anda. Memudahkan pencarian kontak saat hendak restock barang dan memantau saldo total hutang yang jatuh tempo ke masing-masing vendor.",
    workflow: [
      {
        step: 1,
        title: "Tambah Data Pemasok",
        description: "Klik '+ Tambah Vendor', lengkapi Nama Perusahaan, Nama Kontak Sales, WhatsApp, Alamat Gudang Supplier, dan Rekening Bank.",
        screenshotPlaceholder: {
          caption: "Form Input Master Vendor",
          description: "Screenshot formulir penambahan data pemasok dan nomor rekening pembayaran."
        }
      },
      {
        step: 2,
        title: "Pantau Buku Pembantu Hutang (Vendor Statement)",
        description: "Buka detail vendor untuk melihat daftar seluruh PO yang pernah diterbitkan dan status pembayaran hutang Anda ke mereka.",
        screenshotPlaceholder: {
          caption: "Profil Vendor & Riwayat Pembelian",
          description: "Screenshot halaman detail vendor dengan rekap total pembelian dan sisa hutang usaha."
        }
      }
    ],
    keyFeatures: [
      { name: "Rekening Bank Vendor Tersimpan", description: "Mencegah kesalahan nomor rekening saat tim finance mentransfer pelunasan." },
      { name: "Riwayat Harga Beli Produk", description: "Membandingkan harga beli barang dari waktu ke waktu antar vendor berbeda." }
    ],
    tipsAndTricks: [
      "Simpan nomor rekening resmi perusahaan vendor untuk mencegah penipuan transfer ke rekening pribadi."
    ],
    faq: [
      { question: "Bisakah satu produk dibeli dari beberapa vendor berbeda?", answer: "Bisa, Anda bebas memilih nama vendor mana saja saat membuat Purchase Order baru." }
    ]
  },

  // 17. EMPLOYEES
  {
    id: "employees",
    menuKey: "employees",
    title: "Database Karyawan (Employees)",
    category: "SDM & HR",
    categoryId: "hr",
    iconName: "Users",
    badge: "Master HR",
    targetRole: "HRD / Admin / Owner",
    path: "/employees",
    summary: "Manajemen data induk karyawan, jabatan, tanggal masuk kerja, struktur gaji pokok & tunjangan, serta dokumen kepegawaian.",
    overview: "Modul Karyawan adalah pusat informasi kepegawaian perusahaan. Modul ini menjadi fondasi untuk sistem absensi, pengajuan cuti, klaim biaya (reimbursement), dan penghitungan slip gaji bulanan (Payroll).",
    workflow: [
      {
        step: 1,
        title: "Tambah Karyawan Baru",
        description: "Klik '+ Tambah Karyawan', masukkan Nama Lengkap, NIK/Nomor Karyawan, Posisi/Jabatan, Departemen, dan Email Login.",
        screenshotPlaceholder: {
          caption: "Form Input Data Karyawan",
          description: "Screenshot formulir biodata karyawan, jabatan, dan nomor rekening penerimaan gaji."
        }
      },
      {
        step: 2,
        title: "Atur Komponen Gaji Pokok & Tunjangan",
        description: "Tentukan nominal Gaji Pokok, Tunjangan Tetap (Makan/Transport), BPJS, dan nomor rekening bank karyawan.",
        tip: "Data gaji ini akan otomatis ditarik saat Anda memproses Penggajian (Payroll) bulanan."
      },
      {
        step: 3,
        title: "Atur Akun Login & Hak Akses",
        description: "Tautkan data karyawan dengan akun login aplikasi dan pilih peran (*Role*): Karyawan, Sales, Kasir, atau Finance.",
        screenshotPlaceholder: {
          caption: "Tabel Data Induk Karyawan",
          description: "Screenshot daftar karyawan lengkap dengan status keaktifan dan departemen."
        }
      }
    ],
    keyFeatures: [
      { name: "Struktur Kompensasi Fleksibel", description: "Pengaturan gaji pokok, tunjangan harian, bonus, dan potongan BPJS/PPH." },
      { name: "Pemberian Hak Akses (Role-Based)", description: "Membatasi menu yang bisa dilihat staf sesuai tanggung jawab kerja." }
    ],
    tipsAndTricks: [
      "Pastikan nomor WhatsApp dan email karyawan aktif untuk pengiriman slip gaji digital."
    ],
    faq: [
      { question: "Bagaimana jika ada karyawan yang resign?", answer: "Ubah status karyawan menjadi 'Non-Aktif'. Akun login akan otomatis dinonaktifkan tanpa menghapus riwayat transaksi lamanya." }
    ]
  },

  // 18. ABSENSI (ATTENDANCE)
  {
    id: "employee_attendance",
    menuKey: "employee_attendance",
    title: "Presensi & Absensi Karyawan",
    category: "SDM & HR",
    categoryId: "hr",
    iconName: "ClipboardCheck",
    badge: "Kehadiran",
    targetRole: "Semua Karyawan / HRD / Admin",
    path: "/employees/attendance",
    summary: "Pencatatan presensi masuk dan pulang kerja karyawan secara mandiri (Clock-In / Clock-Out) serta rekap kehadiran bulanan.",
    overview: "Modul Absensi memudahkan karyawan melakukan presensi langsung dari perangkat mereka dengan catatan jam masuk, jam pulang, dan status keterlambatan. Data absensi otomatis terintegrasi ke kalkulasi tunjangan hadir pada slip gaji.",
    workflow: [
      {
        step: 1,
        title: "Clock-In (Presensi Masuk)",
        description: "Saat tiba di tempat kerja, karyawan membuka menu Absensi dan menekan tombol hijau 'Presensi Masuk'.",
        screenshotPlaceholder: {
          caption: "Antarmuka Presensi Mandiri Karyawan",
          description: "Screenshot tombol besar Presensi Masuk (Clock-In) dan Presensi Pulang (Clock-Out) dengan jam digital."
        }
      },
      {
        step: 2,
        title: "Clock-Out (Presensi Pulang)",
        description: "Saat jam kerja berakhir, tekan tombol 'Presensi Pulang' untuk mencatat total durasi jam kerja hari itu.",
        tip: "Sistem akan menghitung otomatis apakah ada jam lembur atau keterlambatan."
      },
      {
        step: 3,
        title: "Rekap Kehadiran untuk HRD",
        description: "Admin/HRD dapat melihat log harian seluruh staf, rekap kehadiran bulanan, dan mengekspornya ke Excel/PDF.",
        screenshotPlaceholder: {
          caption: "Tabel Rekap Kehadiran Harian Seluruh Karyawan",
          description: "Screenshot tabel rekap jam masuk, jam pulang, dan status hadir/terlambat/izin."
        }
      }
    ],
    keyFeatures: [
      { name: "Pencatatan Waktu Akurat", description: "Waktu presensi terkunci mengikuti jam server untuk mencegah manipulasi jam." },
      { name: "Integrasi Payroll", description: "Menghitung potongan telat atau insentif uang makan hadir secara otomatis." }
    ],
    tipsAndTricks: [
      "Pasang tablet khusus di meja resepsionis/pintu masuk jika ingin menggunakan presensi bersama di kantor."
    ],
    faq: [
      { question: "Bagaimana jika karyawan lupa absen pulang?", answer: "Admin HRD dapat melakukan koreksi manual jam pulang melalui menu Edit Riwayat Absensi." }
    ]
  },

  // 19. CUTI & IZIN (LEAVE)
  {
    id: "employee_leave",
    menuKey: "employee_leave",
    title: "Pengajuan Cuti & Izin (Leave)",
    category: "SDM & HR",
    categoryId: "hr",
    iconName: "Calendar",
    badge: "Pengajuan HR",
    targetRole: "Semua Karyawan / HRD / Admin",
    path: "/employees/leave",
    summary: "Portal pengajuan cuti tahunan, izin sakit, atau dinas luar oleh staf serta alur persetujuan (approval) oleh atasan.",
    overview: "Modul Cuti mengotomatiskan pengelolaan kuota cuti tahunan staf. Karyawan dapat melihat sisa cuti mereka, mengajukan tanggal libur, melampirkan surat dokter, dan mendapatkan notifikasi jika pengajuan disetujui.",
    workflow: [
      {
        step: 1,
        title: "Karyawan Mengajukan Cuti",
        description: "Klik '+ Ajukan Cuti', pilih tipe cuti (Cuti Tahunan, Sakit, Izin Khusus), pilih rentang tanggal, dan ketik alasan.",
        screenshotPlaceholder: {
          caption: "Form Pengajuan Cuti Staf",
          description: "Screenshot form pengajuan tanggal cuti dan upload lampiran surat dokter."
        }
      },
      {
        step: 2,
        title: "Persetujuan oleh HRD / Manager",
        description: "Atasan menerima notifikasi di lonceng atas. Buka tab 'Persetujuan Admin' lalu klik 'Setujui' atau 'Tolak'.",
        screenshotPlaceholder: {
          caption: "Panel Persetujuan Cuti oleh Admin/HRD",
          description: "Screenshot daftar pengajuan cuti yang menunggu approval beserta tombol aksi Setujui / Tolak."
        },
        tip: "Jika disetujui, sisa kuota cuti tahunan karyawan akan berkurang secara otomatis."
      }
    ],
    keyFeatures: [
      { name: "Pelacakan Kuota Cuti Otomatis", description: "Mencegah staf mengambil cuti melebihi batas hak kuota tahunan." },
      { name: "Lampiran Surat Keterangan", description: "Dukungan upload foto/PDF surat izin dokter untuk pengajuan sakit." }
    ],
    tipsAndTricks: [
      "Ajukan cuti minimal 3 hari sebelumnya agar atasan memiliki waktu mengatur pengganti tugas (handover)."
    ],
    faq: [
      { question: "Apakah izin sakit memotong jatah cuti tahunan?", answer: "Tergantung kebijakan perusahaan. Di sistem Anda bisa memilih tipe 'Sakit' yang tidak memotong kuota cuti tahunan." }
    ]
  },

  // 20. REIMBURSEMENT
  {
    id: "employee_reimbursement",
    menuKey: "employee_reimbursement",
    title: "Klaim Biaya Karyawan (Reimbursement)",
    category: "SDM & HR",
    categoryId: "hr",
    iconName: "FileText",
    badge: "Klaim Dana",
    targetRole: "Semua Karyawan / Finance / Admin",
    path: "/employees/reimbursement",
    summary: "Pengajuan klaim penggantian dana operasional yang ditalangi staf, upload nota struk bukti belanja, dan approval finance.",
    overview: "Modul Reimbursement memudahkan staf mengklaim kembali uang pribadi yang dipakai untuk keperluan dinas (bensin, makan lembur, belanja ATK darurat). Finance dapat memverifikasi struk sebelum mencairkan dana.",
    workflow: [
      {
        step: 1,
        title: "Karyawan Mengajukan Klaim",
        description: "Klik '+ Klaim Baru', masukkan judul klaim, nominal rupiah, kategori biaya, dan upload foto struk nota fisik.",
        screenshotPlaceholder: {
          caption: "Form Pengajuan Klaim Reimburse",
          description: "Screenshot form pengajuan klaim beserta upload foto nota struk belanja."
        }
      },
      {
        step: 2,
        title: "Verifikasi & Pencairan Dana oleh Finance",
        description: "Finance memeriksa kecocokan nominal dengan foto struk, lalu klik 'Setujui & Cairkan Dana' dari rekening kas operasional.",
        screenshotPlaceholder: {
          caption: "Verifikasi Struk Reimburse oleh Finance",
          description: "Screenshot pratinjau foto struk dan tombol persetujuan pencairan kas."
        },
        tip: "Pencairan dana otomatis tercatat ke buku kas pengeluaran (Expenses) perusahaan."
      }
    ],
    keyFeatures: [
      { name: "Bukti Struk Wajib", description: "Mengharuskan lampiran foto nota fisik untuk meminimalkan klaim palsu." },
      { name: "Integrasi Akuntansi Otomatis", description: "Klaim yang disetujui langsung menjurnal ke akun beban dan mengurangi kas." }
    ],
    tipsAndTricks: [
      "Ambil foto struk struk thermal segera sebelum tintanya pudar untuk memudahkan verifikasi finance."
    ],
    faq: [
      { question: "Bisakah reimbursement digabungkan ke pembayaran gaji bulanan?", answer: "Bisa, klaim yang disetujui dapat dicairkan langsung atau dimasukkan ke komponen tambahan slip gaji bulanan." }
    ]
  },

  // 21. PAYROLL & SLIP GAJI
  {
    id: "payroll",
    menuKey: "payroll",
    title: "Penggajian & Slip Gaji (Payroll)",
    category: "SDM & HR",
    categoryId: "hr",
    iconName: "Wallet",
    badge: "Penggajian",
    targetRole: "Finance / HRD / Owner / Karyawan",
    path: "/payroll",
    summary: "Pemrosesan gaji bulanan staf, perhitungan otomatis lembur & potongan, generate slip gaji PDF, dan portal 'Slip Gaji Saya'.",
    overview: "Modul Payroll mengotomatiskan proses penggajian seluruh staf setiap akhir bulan. Menggabungkan gaji pokok, tunjangan kehadiran dari modul Absensi, klaim reimburse, bonus, dan potongan pinjaman/kasbon menjadi slip gaji PDF resmi.",
    workflow: [
      {
        step: 1,
        title: "Buat Periode Penggajian Baru",
        description: "Pilih bulan & tahun penggajian (misal: Agustus 2026). Klik 'Tarik Data Gaji Otomatis'.",
        screenshotPlaceholder: {
          caption: "Pemrosesan Penggajian Bulanan",
          description: "Screenshot tabel rekapitulasi gaji seluruh staf dengan rincian tunjangan dan potongan."
        }
      },
      {
        step: 2,
        title: "Sesuaikan Bonus & Potongan Tambahan",
        description: "Tambahkan bonus lembur, insentif performa penjualan, atau potongan kasbon jika ada.",
        tip: "Sistem akan menghitung Total Gaji Bersih (Take Home Pay) secara instan."
      },
      {
        step: 3,
        title: "Finalisasi & Terbitkan Slip Gaji",
        description: "Klik 'Kunci & Terbitkan'. Karyawan dapat langsung melihat dan mengunduh slip gaji mereka di menu 'Slip Gaji Saya' (/employees/payslips).",
        screenshotPlaceholder: {
          caption: "Format Cetak Dokumen Slip Gaji Karyawan",
          description: "Screenshot dokumen PDF Slip Gaji resmi dengan rincian pendapatan, potongan, dan logo perusahaan."
        }
      }
    ],
    keyFeatures: [
      { name: "Generate Slip Gaji PDF Otomatis", description: "Setiap karyawan mendapatkan dokumen slip gaji rahasia berkop resmi." },
      { name: "Portal Karyawan Mandiri", description: "Karyawan dapat mengunduh riwayat slip gaji bulan-bulan sebelumnya kapan saja." },
      { name: "Otomasi Jurnal Beban Gaji", description: "Mencatat total beban gaji ke buku besar akuntansi dalam satu klik." }
    ],
    tipsAndTricks: [
      "Kunci periode penggajian setelah pembayaran transfer bank selesai agar data tidak berubah."
    ],
    faq: [
      { question: "Apakah staf biasa bisa melihat gaji staf lainnya?", answer: "Tidak. Staf biasa hanya memiliki akses ke menu 'Slip Gaji Saya' yang hanya menampilkan slip miliknya sendiri." }
    ]
  },

  // 22. CHART OF ACCOUNTS (COA)
  {
    id: "accounts",
    menuKey: "accounts",
    title: "Bagan Akun Standar (Chart of Accounts)",
    category: "Akuntansi & Keuangan",
    categoryId: "finance",
    iconName: "Grid",
    badge: "Struktur Akuntansi",
    targetRole: "Finance / Akuntan / Owner",
    path: "/accounts",
    summary: "Daftar struktur rekening akuntansi (Aktiva, Kewajiban, Ekuitas, Pendapatan, Beban) dan pengaturan saldo awal buku.",
    overview: "Chart of Accounts (COA) adalah kerangka dasar seluruh pencatatan keuangan bisnis Anda. Setiap rupiah yang masuk atau keluar dari transaksi penjualan, kasir, belanja barang, atau beban operasional akan dialokasikan ke nomor akun COA yang sesuai.",
    workflow: [
      {
        step: 1,
        title: "Pahami 5 Klasifikasi Akun Utama",
        description: "1. Aktiva (Kas, Bank, Piutang, Stok) | 2. Kewajiban (Hutang) | 3. Modal (Ekuitas) | 4. Pendapatan (Penjualan) | 5. Beban (Operasional).",
        screenshotPlaceholder: {
          caption: "Pohon Bagan Akun (Chart of Accounts)",
          description: "Screenshot struktur hierarki kode akun akuntansi beserta saldo debit/kredit terkini."
        }
      },
      {
        step: 2,
        title: "Tambah Akun Bank / Kas Baru",
        description: "Jika Anda membuka rekening bank baru (misal: Bank Mandiri Giro), klik '+ Tambah Akun', pilih tipe 'Kas & Bank', dan beri kode unik.",
        tip: "Akun kas/bank ini akan otomatis muncul sebagai opsi pembayaran di Invoice dan POS Kasir."
      }
    ],
    keyFeatures: [
      { name: "Standar Akuntansi Indonesia", description: "Sudah dilengkapi template kode akun standar yang siap langsung digunakan." },
      { name: "Sub-Akun Bertingkat", description: "Mendukung hierarki akun induk dan anak akun untuk rincian beban yang rapi." }
    ],
    tipsAndTricks: [
      "Jangan mengubah kode akun yang sudah memiliki riwayat jurnal transaksi tanpa berkonsultasi dengan akuntan Anda."
    ],
    faq: [
      { question: "Bagaimana cara memasukkan saldo awal saat pertama kali pakai sistem?", answer: "Gunakan fitur 'Jurnal Penyesuaian Saldo Awal' di menu Buku Besar untuk mengisi saldo awal kas, bank, dan modal." }
    ]
  },

  // 23. EXPENSES (BIAYA OPERASIONAL)
  {
    id: "expenses",
    menuKey: "expenses",
    title: "Pengeluaran & Biaya Operasional (Expenses)",
    category: "Akuntansi & Keuangan",
    categoryId: "finance",
    iconName: "Wallet",
    badge: "Arus Kas Keluar",
    targetRole: "Finance / Admin / Owner",
    path: "/expenses",
    summary: "Pencatatan biaya harian operasional (listrik, sewa, internet, gaji, ATK), upload bukti pembayaran, dan alokasi pos beban.",
    overview: "Modul Biaya Operasional (Expenses) mencatat semua uang keluar non-pembelian barang dagang. Berguna untuk mengontrol pengeluaran kas kecil (petty cash) dan menyajikan laporan laba rugi yang mencerminkan beban riil perusahaan.",
    workflow: [
      {
        step: 1,
        title: "Catat Pengeluaran Baru",
        description: "Klik '+ Catat Biaya', pilih tanggal, masukkan nominal rupiah, dan pilih Kategori Beban (misal: Biaya Listrik & Air).",
        screenshotPlaceholder: {
          caption: "Form Input Pengeluaran Biaya",
          description: "Screenshot formulir pencatatan beban operasional dengan pemilihan akun kas sumber dana."
        }
      },
      {
        step: 2,
        title: "Pilih Akun Kas / Bank Sumber Dana",
        description: "Pilih rekening yang digunakan untuk membayar (Kas Tunai, Rekening BCA, dll) dan lampirkan foto kuitansi/struk.",
        tip: "Saldo rekening sumber akan langsung terpotong secara otomatis di buku kas."
      },
      {
        step: 3,
        title: "Kaitkan ke Proyek / Departemen (Opsional)",
        description: "Jika pengeluaran untuk proyek tertentu, pilih nama proyek terkait agar terhitung dalam biaya HPP proyek."
      }
    ],
    keyFeatures: [
      { name: "Kategori Biaya Fleksibel", description: "Pengelompokan beban operasional, beban pemasaran, beban administrasi, dll." },
      { name: "Lampiran Struk Bukti Bayar", description: "Penyimpanan digital bukti kuitansi fisik agar tidak hilang." }
    ],
    tipsAndTricks: [
      "Catat pengeluaran kecil kasir secara harian agar saldo kas fisik tidak selisih saat tutup buku."
    ],
    faq: [
      { question: "Apa bedanya Pengeluaran (Expense) dengan Pembelian (Purchase Order)?", answer: "Purchase Order untuk pembelian barang yang dijual kembali (masuk stok), sedangkan Expense untuk biaya habis pakai operasional." }
    ]
  },

  // 24. BUKU BESAR (LEDGER)
  {
    id: "ledger",
    menuKey: "ledger",
    title: "Buku Besar & Jurnal Umum (General Ledger)",
    category: "Akuntansi & Keuangan",
    categoryId: "finance",
    iconName: "BookOpen",
    badge: "Jurnal Otomatis",
    targetRole: "Finance / Akuntan / Owner",
    path: "/ledger",
    summary: "Catatan jurnal transaksi otomatis double-entry dari seluruh aktivitas sistem, mutasi debit/kredit, dan jurnal penyesuaian manual.",
    overview: "General Ledger adalah rekaman lengkap seluruh ayat jurnal akuntansi yang terbentuk secara otomatis di balik layar ketika invoice diterbitkan, kas masuk diterima, atau beban dicatat. Dilengkapi kemampuan input Jurnal Manual (Manual Journal Entry).",
    workflow: [
      {
        step: 1,
        title: "Pilih Akun yang Ingin Diperiksa",
        description: "Pilih akun tertentu (misal: Akun 1010 - Kas Utama) dan tentukan rentang bulan untuk melihat mutasi saldo.",
        screenshotPlaceholder: {
          caption: "Buku Besar Akun (General Ledger View)",
          description: "Screenshot baris mutasi debit, kredit, saldo berjalan, dan nomor referensi dokumen sumber."
        }
      },
      {
        step: 2,
        title: "Buat Jurnal Penyesuaian Manual (Jika Diperlukan)",
        description: "Klik '+ Jurnal Manual', masukkan akun di sisi Debit dan Kredit dengan nominal yang seimbang (Balance).",
        tip: "Digunakan untuk penyusutan aset, koreksi salah akun, atau alokasi dividen."
      }
    ],
    keyFeatures: [
      { name: "Double-Entry Accounting Otomatis", description: "Sistem otomatis menjurnal sisi debit dan kredit tanpa perlu input manual." },
      { name: "Audit Trail Lengkap", description: "Setiap baris jurnal dapat diklik untuk membuka dokumen transaksi aslinya." }
    ],
    tipsAndTricks: [
      "Pastikan total Debit dan Kredit pada Jurnal Manual selalu bernilai sama (imbang) sebelum disimpan."
    ],
    faq: [
      { question: "Apakah saya harus mengerti akuntansi untuk memakai aplikasi ini?", answer: "Tidak, sistem sudah membuat jurnal otomatis di latar belakang saat Anda membuat invoice atau mencatat pembayaran." }
    ]
  },

  // 25. ASET TETAP (ASSETS)
  {
    id: "assets",
    menuKey: "assets",
    title: "Manajemen Aset Tetap (Assets)",
    category: "Akuntansi & Keuangan",
    categoryId: "finance",
    iconName: "Layers",
    badge: "Aktiva Tetap",
    targetRole: "Finance / Admin / Owner",
    path: "/assets",
    summary: "Pencatatan aset tetap perusahaan (kendaraan, mesin, laptop, gedung), masa manfaat, dan perhitungan penyusutan otomatis.",
    overview: "Modul Aset Tetap membantu mencatat inventaris barang berharga modal perusahaan, nilai perolehan awal, perkiraan umur ekonomis, dan menghitung penyusutan nilai buku (Depreciation) setiap akhir bulan.",
    workflow: [
      {
        step: 1,
        title: "Daftarkan Aset Tetap Baru",
        description: "Klik '+ Tambah Aset', beri nama (misal: Laptop MacBook Desain), tanggal beli, nilai perolehan (harga beli), dan masa manfaat (misal: 4 tahun).",
        screenshotPlaceholder: {
          caption: "Form Input Master Aset Tetap",
          description: "Screenshot formulir pendaftaran aset dengan pilihan metode penyusutan garis lurus."
        }
      },
      {
        step: 2,
        title: "Hitung Penyusutan Bulanan",
        description: "Sistem akan otomatis menghitung nilai depresiasi per bulan dan menyajikan sisa Nilai Buku (Book Value) terkini.",
        screenshotPlaceholder: {
          caption: "Daftar Aset & Jadwal Penyusutan",
          description: "Screenshot tabel aset dengan nilai beli awal, akumulasi penyusutan, dan nilai buku saat ini."
        }
      }
    ],
    keyFeatures: [
      { name: "Penyusutan Garis Lurus (Straight Line)", description: "Metode depresiasi standar akuntansi otomatis setiap periode." },
      { name: "Pelacakan Lokasi & Penanggung Jawab", description: "Mencatat siapa staf yang memegang aset dan lokasi penempatannya." }
    ],
    tipsAndTricks: [
      "Beri label stiker nomor inventaris fisik pada setiap laptop atau mesin kantor sesuai kode aset di sistem."
    ],
    faq: [
      { question: "Kapan suatu barang dicatat sebagai Aset dibanding Biaya?", answer: "Barang dengan masa pakai lebih dari 1 tahun dan bernilai signifikan dicatat sebagai Aset Tetap, sedangkan barang habis pakai dicatat sebagai Expense." }
    ]
  },

  // 26. PUSAT LAPORAN (REPORTS)
  {
    id: "reports",
    menuKey: "reports",
    title: "Pusat Laporan & Analitik (Reports Hub)",
    category: "Laporan Bisnis",
    categoryId: "reports",
    iconName: "TrendingUp",
    badge: "Analitik",
    targetRole: "Owner / Direktur / Finance / Manager",
    path: "/reports",
    summary: "Kumpulan seluruh laporan analitik bisnis: Laba Rugi, Neraca, Arus Kas, Penjualan, Valuasi Stok, Absensi, dan POS Shift.",
    overview: "Pusat Laporan menyajikan seluruh ringkasan kinerja bisnis Anda dalam bentuk tabel dan grafik siap cetak atau ekspor ke Excel/PDF. Membantu pemilik usaha mengambil keputusan strategis berdasarkan data riil.",
    workflow: [
      {
        step: 1,
        title: "Pilih Jenis Laporan",
        description: "Di menu Pusat Laporan, pilih kategori laporan yang diinginkan: Laporan Penjualan, Laba Rugi, Valuasi Stok, atau Absensi.",
        screenshotPlaceholder: {
          caption: "Pusat Direktori Laporan Bisnis",
          description: "Screenshot katalog pusat laporan dengan kartu pilihan laporan keuangan, penjualan, dan stok."
        }
      },
      {
        step: 2,
        title: "Atur Parameter Filter & Tanggal",
        description: "Pilih rentang tanggal (Bulan Ini, Kuartal Ini, Tahunan), filter per cabang/outlet, atau filter per kategori produk.",
        tip: "Gunakan filter per sales/kasir untuk mengevaluasi kinerja masing-masing staf."
      },
      {
        step: 3,
        title: "Ekspor ke Excel / PDF",
        description: "Klik tombol 'Ekspor Excel (XLSX)' untuk olah data lebih lanjut, atau 'Cetak PDF' untuk laporan meeting manajemen.",
        screenshotPlaceholder: {
          caption: "Pratinjau Laporan Keuangan Siap Cetak",
          description: "Screenshot format laporan laba rugi lengkap dengan persentase margin keuntungan."
        }
      }
    ],
    keyFeatures: [
      { name: "Laporan Laba Rugi (Profit & Loss)", description: "Pendapatan kotor dikurangi HPP dan beban operasional menghasilkan laba bersih." },
      { name: "Laporan Valuasi Stok Gudang", description: "Menampilkan kuantitas sisa barang dan nilai total rupiah persediaan." },
      { name: "Laporan Performa Kasir (POS Shifts)", description: "Rekap total penjualan kasir, selisih kas fisik, dan metode bayar terpopuler." },
      { name: "Ekspor Multi-Format", description: "Mendukung unduh format Excel (.xlsx), CSV, dan cetak PDF profesional." }
    ],
    tipsAndTricks: [
      "Evaluasi Laporan Laba Rugi setiap akhir bulan untuk memangkas pos pengeluaran yang tidak efisien."
    ],
    faq: [
      { question: "Apakah laporan keuangan bisa difilter per cabang?", answer: "Bisa, jika Anda menggunakan fitur multi-outlet, laporan dapat difilter per cabang atau konsolidasi seluruh outlet." }
    ]
  },

  // 27. PENGATURAN & KEAMANAN (SETTINGS)
  {
    id: "settings",
    menuKey: "settings",
    title: "Pengaturan Profil & Keamanan (Settings)",
    category: "Sistem & Pengaturan",
    categoryId: "system",
    iconName: "Settings",
    badge: "Konfigurasi",
    targetRole: "Owner / Admin",
    path: "/settings",
    summary: "Konfigurasi profil usaha, upload logo kop surat, nomor rekening bank, format penomoran nota, dan manajemen sesi login.",
    overview: "Modul Pengaturan adalah pusat konfigurasi identitas bisnis Anda. Informasi yang diisi di sini (seperti Logo, Alamat, No Telepon, Rekening Bank) akan otomatis tercetak pada kop faktur, surat jalan, dan penawaran harga.",
    workflow: [
      {
        step: 1,
        title: "Lengkapi Profil Usaha & Logo",
        description: "Upload logo beresolusi tinggi (format PNG transparan disarankan), isi nama resmi perusahaan, NPWP, dan nomor WhatsApp admin.",
        screenshotPlaceholder: {
          caption: "Pengaturan Identitas Perusahaan",
          description: "Screenshot halaman input profil bisnis, logo, dan alamat toko."
        }
      },
      {
        step: 2,
        title: "Atur Format Nomor Faktur & Struk",
        description: "Tentukan awalan kode nota (Prefix) misal: INV/2026/, DO/2026/, serta teks catatan kaki (Footer) default.",
        tip: "Nomor urut nota akan bertambah otomatis secara berurutan sesuai pola yang Anda buat."
      },
      {
        step: 3,
        title: "Pantau Keamanan Sesi Login (/settings/security)",
        description: "Periksa daftar perangkat yang sedang login ke akun Anda. Anda dapat melakukan 'Logout dari Semua Perangkat Lain' jika ada aktivitas mencurigakan.",
        screenshotPlaceholder: {
          caption: "Panel Keamanan Akun & Manajemen Sesi",
          description: "Screenshot daftar riwayat login perangkat (browser, lokasi IP, waktu aktif)."
        }
      }
    ],
    keyFeatures: [
      { name: "Kustomisasi Kop Dokumen", description: "Menampilkan logo dan identitas bisnis profesional pada seluruh cetakan PDF." },
      { name: "Pemberian Hak Akses Karyawan", description: "Mengatur menu apa saja yang boleh dibuka oleh masing-masing staf." },
      { name: "Session Security Monitor", description: "Melindungi akun usaha dari pembajakan dengan pelacakan sesi login real-time." }
    ],
    tipsAndTricks: [
      "Gunakan kombinasi password yang kuat dan lakukan pergantian berkala setiap 3-6 bulan."
    ],
    faq: [
      { question: "Bagaimana jika ingin mengganti nama bisnis atau alamat?", answer: "Cukup ubah data di menu Pengaturan Profil Bisnis, maka semua invoice yang diterbitkan berikutnya akan memakai data baru." }
    ]
  },

  // 28. ADMIN DASHBOARD & USERS (SUPERADMIN)
  {
    id: "admin",
    menuKey: "admin_dashboard",
    title: "Manajemen Sistem (Superadmin)",
    category: "Manajemen Superadmin",
    categoryId: "admin",
    iconName: "Shield",
    badge: "Khusus Superadmin",
    targetRole: "Superadmin Global Only",
    path: "/admin/dashboard",
    summary: "Panel kontrol pusat untuk mengelola seluruh akun pengguna, bisnis terdaftar, audit sistem, dan performa database.",
    overview: "Khusus untuk pemilik sistem (Superadmin). Menu ini memberikan wewenang tingkat tertinggi untuk memantau seluruh entitas bisnis, reset akses pengguna, dan memastikan kelancaran operasional platform.",
    workflow: [
      {
        step: 1,
        title: "Pantau Ringkasan Sistem Global",
        description: "Buka menu Ringkasan Sistem untuk memantau total pengguna aktif, jumlah transaksi keseluruhan, dan kesehatan server.",
        screenshotPlaceholder: {
          caption: "Dashboard Superadmin Master",
          description: "Screenshot ringkasan sistem global dengan grafik utilisasi dan log sistem."
        }
      },
      {
        step: 2,
        title: "Kelola Akses Pengguna (/admin/users)",
        description: "Admin pusat dapat mengaktifkan/menonaktifkan akun, mengatur ulang password darurat, dan menetapkan peran Superadmin.",
        screenshotPlaceholder: {
          caption: "Tabel Manajemen Pengguna Global",
          description: "Screenshot daftar seluruh pengguna terdaftar dengan kontrol status aktif/banned."
        }
      }
    ],
    keyFeatures: [
      { name: "Master Control Pengguna", description: "Kontrol penuh atas seluruh akun yang terdaftar dalam ekosistem aplikasi." },
      { name: "Audit Trail Global", description: "Pencatatan aktivitas sistem untuk keamanan dan kepatuhan data." }
    ],
    tipsAndTricks: [
      "Hanya berikan hak akses Superadmin kepada staf IT terpercaya tingkat eksekutif."
    ],
    faq: [
      { question: "Apakah menu ini muncul untuk staf biasa?", answer: "Tidak. Menu Manajemen Sistem hanya muncul untuk akun dengan status role 'superadmin'." }
    ]
  }
];
