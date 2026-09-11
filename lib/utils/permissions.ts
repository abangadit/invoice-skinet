// Definition of granular permissions, groups, submenus, and role presets
// Path: apps/web/lib/utils/permissions.ts

export interface PermissionItem {
  key: string;
  label: string;
  description?: string;
  route?: string;
  parentKey?: string;
  isSubmenu?: boolean;
}

export interface PermissionGroup {
  id: string;
  title: string;
  description: string;
  iconName: string;
  items: PermissionItem[];
}

export const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    id: "main",
    title: "1. Menu Utama & POS",
    description: "Metrik utama dan titik penjualan kasir toko",
    iconName: "Layers",
    items: [
      { key: "dashboard", label: "Dashboard Utama", route: "/", description: "Melihat grafik omzet, performa penjualan, dan ringkasan bisnis" },
      { key: "pos", label: "Kasir Penjualan (POS)", route: "/pos", description: "Mengoperasikan mesin kasir penjualan langsung & sesi kasir" },
      { key: "pos_history", label: "Riwayat Transaksi Kasir (POS)", route: "/pos/history", description: "Melihat daftar struk dan nota penjualan kasir POS", parentKey: "pos", isSubmenu: true }
    ]
  },
  {
    id: "project",
    title: "2. Proyek & Operasional",
    description: "Pengelolaan kontrak proyek, tahapan kerja, dan purna jual",
    iconName: "Briefcase",
    items: [
      { key: "project", label: "Manajemen Proyek & RAB", route: "/project", description: "Membuat proyek, tahapan milestone, dan pelacakan anggaran RAB" },
      { key: "after_sales", label: "After Sales & Garansi", route: "/after-sales", description: "Master garansi proyek, uang retensi, dan tiket keluhan servis" }
    ]
  },
  {
    id: "sales",
    title: "3. Penjualan & Piutang (Sales & CRM)",
    description: "Alur prospek pelanggan hingga penagihan dan pengiriman",
    iconName: "TrendingUp",
    items: [
      { key: "leads", label: "Prospek Klien (Leads)", route: "/leads", description: "Pelacakan pipeline prospek dan aktivitas follow-up calon klien" },
      { key: "landing_page", label: "Website Profil (Landing Page)", route: "/landing-page", description: "Pengaturan halaman profil website publik bisnis" },
      { key: "quotation", label: "Penawaran Harga (Quotations)", route: "/quotation", description: "Penerbitan surat penawaran harga kepada calon klien" },
      { key: "sales", label: "Sales Orders (SO)", route: "/sales", description: "Pencatatan pesanan penjualan resmi dari pelanggan" },
      { key: "delivery", label: "Surat Jalan (Delivery Orders)", route: "/delivery", description: "Penerbitan surat jalan dan bukti pengiriman fisik barang" },
      { key: "invoice", label: "Faktur Penjualan (Invoices)", route: "/invoice", description: "Penerbitan faktur tagihan dan cetak nota invoice" },
      { key: "invoice_due", label: "Nota Jatuh Tempo", route: "/invoice/due", description: "Peringatan daftar faktur penjualan yang mendekati/melewati batas tempo", parentKey: "invoice", isSubmenu: true },
      { key: "customer", label: "Data Pelanggan (Customers)", route: "/customer", description: "Buku data kontak klien, piutang, dan riwayat pesanan" },
      { key: "payment", label: "Konfirmasi Pembayaran", route: "/payment", description: "Verifikasi bukti transfer dan pelunasan piutang klien" }
    ]
  },
  {
    id: "purchase",
    title: "4. Pembelian & Gudang (Supply Chain)",
    description: "Manajemen pemasok, pembelian barang, dan inventaris",
    iconName: "Package",
    items: [
      { key: "purchase", label: "Purchase Orders (PO)", route: "/purchase", description: "Pengajuan dan penerbitan pesanan pembelian ke pemasok" },
      { key: "purchase_due", label: "Tagihan PO Jatuh Tempo", route: "/purchase/due", description: "Peringatan daftar tagihan PO yang mendekati/melewati tempo bayar", parentKey: "purchase", isSubmenu: true },
      { key: "vendor", label: "Data Pemasok (Vendors)", route: "/vendor", description: "Buku data pemasok, utang dagang, dan riwayat belanja" },
      { key: "catalog", label: "Katalog Item & Harga Modal (COGS)", route: "/catalog", description: "Daftar produk, SKU, harga jual, dan harga beli pokok" },
      { key: "inventory_stock", label: "Daftar Stok Multi-Gudang", route: "/inventory", description: "Melihat saldo dan ketersediaan stok fisik barang di gudang", parentKey: "inventory", isSubmenu: true },
      { key: "inventory_stock_card", label: "Kartu Stok & Riwayat Mutasi", route: "/inventory/stock-card", description: "Pelacakan mutasi alur masuk-keluar stok barang per produk", parentKey: "inventory", isSubmenu: true },
      { key: "inventory_adjustments", label: "Stok Opname / Penyesuaian", route: "/inventory/adjustments", description: "Koreksi selisih stok fisik riil dengan catatan sistem", parentKey: "inventory", isSubmenu: true },
      { key: "inventory_transfer", label: "Transfer Antar Gudang", route: "/inventory/transfer", description: "Pemindahan stok barang dari satu lokasi gudang ke gudang lain", parentKey: "inventory", isSubmenu: true },
      { key: "inventory_stock_out", label: "Pengeluaran Barang Non-Invoice", route: "/inventory/stock-out", description: "Pencatatan pengeluaran barang rusak, sampel, atau internal", parentKey: "inventory", isSubmenu: true },
      { key: "inventory_production", label: "Produksi & Perakitan (BOM)", route: "/inventory/production", description: "Proses perakitan bahan baku menjadi produk jadi", parentKey: "inventory", isSubmenu: true },
      { key: "inventory_warehouses", label: "Master Lokasi Gudang", route: "/inventory/warehouses", description: "Pengelolaan daftar lokasi gudang dan cabang penyimpanan", parentKey: "inventory", isSubmenu: true }
    ]
  },
  {
    id: "hr",
    title: "5. SDM & Kepegawaian (HR & Payroll)",
    description: "Pengelolaan tim kerja, absensi, cuti, dan penggajian",
    iconName: "Users",
    items: [
      { key: "employees", label: "Buku Induk Karyawan & Staf", route: "/employees", description: "Biodata tim, jabatan, dan struktur gaji pokok" },
      { key: "payroll", label: "Penggajian (Payroll & Gaji)", route: "/payroll", description: "Proses kalkulasi gaji bulanan, tunjangan, dan slip gaji" },
      { key: "employee_attendance", label: "Rekap Absensi Seluruh Tim", route: "/employees/attendance", description: "Rekap kehadiran seluruh tim, jam kerja shift, dan lembur" },
      { key: "employee_leave", label: "Persetujuan Cuti Tim", route: "/employees/leave", description: "Verifikasi dan persetujuan pengajuan cuti anggota tim" },
      { key: "employee_reimbursement", label: "Persetujuan Reimbursement", route: "/employees/reimbursement", description: "Verifikasi dan klaim penggantian biaya operasional staf" },
      { key: "employee_payslips", label: "Slip Gaji Pribadi", route: "/employees/payslips", description: "Melihat dan mengunduh slip gaji milik akun sendiri" }
    ]
  },
  {
    id: "finance",
    title: "6. Akuntansi & Keuangan",
    description: "Pembukuan standar akuntansi, buku besar, dan perpajakan",
    iconName: "Wallet",
    items: [
      { key: "accounts", label: "Bagan Akun (Chart of Accounts)", route: "/accounts", description: "Master nomor akun kas, bank, pendapatan, dan beban" },
      { key: "accounts_reconciliation", label: "Rekonsiliasi Bank", route: "/accounts/reconciliation", description: "Pencocokan mutasi rekening bank dengan jurnal kas sistem", parentKey: "accounts", isSubmenu: true },
      { key: "expenses", label: "Pencatatan Biaya (Expenses)", route: "/expenses", description: "Pengeluaran kas operasional, listrik, sewa, ATK, dan bon" },
      { key: "ledger", label: "Buku Kas & Jurnal Umum", route: "/ledger", description: "Jurnal akuntansi, mutasi debit/kredit, dan neraca saldo" },
      { key: "tax", label: "Ekspor Pajak (e-Faktur)", route: "/tax", description: "Kalkulasi PPN/PPh dan ekspor format CSV DJP" },
      { key: "assets", label: "Aset Tetap & Penyusutan", route: "/assets", description: "Pencatatan aktiva tetap dan beban amortisasi berkala" }
    ]
  },
  {
    id: "reports",
    title: "7. Pusat Laporan Bisnis",
    description: "Laporan analitik penjualan, inventori, dan keuangan resmi",
    iconName: "TrendingUp",
    items: [
      { key: "reports_sales", label: "Laporan Penjualan", route: "/reports/sales", description: "Analisis produk terlaris dan omzet sales per periode", parentKey: "reports", isSubmenu: true },
      { key: "reports_invoice", label: "Laporan Faktur & Piutang", route: "/reports/invoice", description: "Rekap umur piutang dan status penagihan faktur", parentKey: "reports", isSubmenu: true },
      { key: "reports_inventory", label: "Laporan Nilai Stok Gudang", route: "/reports/inventory", description: "Valuasi total nilai rupiah persediaan di gudang", parentKey: "reports", isSubmenu: true },
      { key: "reports_financial", label: "Laporan Keuangan (Laba Rugi & Neraca)", route: "/reports/financial", description: "Laporan resmi Laba Rugi, Neraca Keuangan, dan Arus Kas", parentKey: "reports", isSubmenu: true },
      { key: "reports_attendance", label: "Laporan Kehadiran Karyawan", route: "/reports/attendance", description: "Rekapitulasi absensi bulanan untuk penilaian kedisiplinan tim", parentKey: "reports", isSubmenu: true },
      { key: "reports_pos", label: "Laporan Kasir POS & Shift", route: "/reports/pos", description: "Rekapitulasi setoran uang kasir per sesi dan shift", parentKey: "reports", isSubmenu: true }
    ]
  },
  {
    id: "system",
    title: "8. Sistem & Pengaturan",
    description: "Konfigurasi umum perusahaan, pengguna, dan keamanan",
    iconName: "Settings",
    items: [
      { key: "settings_profile", label: "Profil Bisnis & Perusahaan", route: "/settings", description: "Profil usaha, logo, nomor seri faktur, dan rekening bank" },
      { key: "settings_users", label: "Pengguna & Hak Akses Tim", route: "/settings/users", description: "Menambah anggota tim dan mengatur perizinan peran", parentKey: "settings", isSubmenu: true },
      { key: "settings_sidebar", label: "Kustomisasi Menu Sidebar", route: "/settings/sidebar", description: "Mengatur urutan dan visibilitas menu sidebar", parentKey: "settings", isSubmenu: true },
      { key: "settings_shifts", label: "Jadwal Kerja & Shift", route: "/settings/shifts", description: "Pengaturan jam kerja dan shift operasional", parentKey: "settings", isSubmenu: true },
      { key: "settings_audit_logs", label: "Audit Log Aktivitas", route: "/settings/audit-logs", description: "Riwayat jejak aksi pembuatan, pengubahan, dan penghapusan data", parentKey: "settings", isSubmenu: true },
      { key: "settings_import", label: "Import Data Massal", route: "/settings/import", description: "Import CSV produk, pelanggan, dan saldo awal", parentKey: "settings", isSubmenu: true }
    ]
  }
];

// Flat array of all available permissions
export const ALL_AVAILABLE_PERMISSIONS: PermissionItem[] = PERMISSION_GROUPS.flatMap(g => g.items);

// Helper: Get all permission keys
export function getAllPermissionKeys(): string[] {
  return ALL_AVAILABLE_PERMISSIONS.map(p => p.key);
}

// Preset permissions by role for quick 1-click configuration
export const ROLE_PRESETS: Record<string, string[]> = {
  admin: getAllPermissionKeys(),
  pos_cashier: ["dashboard", "pos", "pos_history", "reports_pos"],
  sales: [
    "dashboard", "pos", "pos_history", "leads", "landing_page", "quotation", 
    "sales", "delivery", "invoice", "invoice_due", "customer", "payment", 
    "catalog", "reports_sales", "reports_invoice", "project", "after_sales"
  ],
  purchasing: [
    "dashboard", "purchase", "purchase_due", "vendor", "catalog", 
    "inventory_stock", "inventory_stock_card", "reports_inventory"
  ],
  warehouse: [
    "delivery", "catalog", "inventory_stock", "inventory_stock_card", 
    "inventory_adjustments", "inventory_transfer", "inventory_stock_out", 
    "inventory_production", "inventory_warehouses", "reports_inventory"
  ],
  finance: [
    "dashboard", "invoice", "invoice_due", "payment", "customer", "accounts", 
    "accounts_reconciliation", "expenses", "ledger", "reports_sales", 
    "reports_invoice", "reports_financial", "tax", "assets", "project"
  ],
  hr: [
    "dashboard", "employees", "payroll", "employee_attendance", 
    "employee_leave", "employee_reimbursement", "employee_payslips", 
    "reports_attendance", "settings_shifts"
  ],
  staff: [
    "employee_attendance", "employee_payslips"
  ]
};

// Helper: Return a record of { [key]: boolean } based on a role preset
export function getPresetPermissionsRecord(role: string): Record<string, boolean> {
  const allowed = ROLE_PRESETS[role] || [];
  const record: Record<string, boolean> = {};
  ALL_AVAILABLE_PERMISSIONS.forEach(p => {
    record[p.key] = allowed.includes(p.key);
  });
  return record;
}

// Smart evaluator with backward compatibility fallback to parent module key
export function hasPermission(
  permissions: Record<string, boolean> | null | undefined, 
  specificKey: string, 
  parentModuleKey?: string
): boolean {
  if (!permissions) return false;
  
  // 1. Explicit true on specific granular key
  if (permissions[specificKey] === true) return true;
  
  // 2. Explicit false on specific granular key (strictly denied)
  if (permissions[specificKey] === false) return false;
  
  // 3. Backward compatibility fallback: Check parent module key if available
  if (parentModuleKey && permissions[parentModuleKey] === true) {
    return true;
  }
  
  // 4. Fallback for common parent aliases
  if (specificKey.startsWith("inventory_") && permissions["inventory"] === true) return true;
  if (specificKey.startsWith("reports_") && permissions["reports"] === true) return true;
  if (specificKey.startsWith("settings_") && permissions["settings"] === true) return true;
  if (specificKey.startsWith("employee_") && (permissions["employees"] === true || permissions["hr"] === true)) return true;
  if ((specificKey === "employees" || specificKey === "payroll") && permissions["hr"] === true) return true;
  if (specificKey === "invoice_due" && permissions["invoice"] === true) return true;
  if (specificKey === "purchase_due" && permissions["purchase"] === true) return true;
  if (specificKey === "pos_history" && permissions["pos"] === true) return true;
  if (specificKey === "accounts_reconciliation" && permissions["accounts"] === true) return true;

  return false;
}
