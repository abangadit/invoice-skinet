"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { 
  TrendingUp, 
  Scale, 
  Calendar,
  AlertCircle,
  FileText,
  DollarSign,
  TrendingDown,
  Building2,
  PieChart,
  ArrowRight,
  Download,
  HelpCircle,
  Search,
  ExternalLink,
  Info,
  X,
  CheckCircle2,
  BookOpen,
  Layers,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  ChevronRight,
  Wallet,
  ShoppingCart,
  Truck,
  CreditCard,
  Plus,
  Minus,
  ArrowDown
} from "lucide-react";
import { useBusiness } from "../../../../lib/context/BusinessContext";
import { createWebBrowserClient } from "../../../../lib/supabase/client";

interface JournalEntryDetail {
  id?: string;
  entry_date: string;
  description?: string;
  reference_source?: string | null;
  reference_id?: string | null;
}

interface JournalItemDetail {
  id?: string;
  debit: number;
  credit: number;
  journal_entries?: JournalEntryDetail | JournalEntryDetail[] | null;
}

interface AccountWithItems {
  id: string;
  code: string;
  name: string;
  type: "asset" | "liability" | "equity" | "income" | "expense";
  is_active: boolean;
  journal_items: JournalItemDetail[];
}

interface MetricKnowledge {
  title: string;
  plainMeaning: string;
  mathFormula: string;
  sourceMenus: {
    menuName: string;
    actionTrigger: string;
    route: string;
    badgeColor: string;
  }[];
  howToChange: string[];
  whereDoesItGo?: string;
}

// Kamus Pengetahuan Keuangan Non-Finance (Bahasa Bisnis Sehari-hari)
const FINANCIAL_KNOWLEDGE_BASE: Record<string, MetricKnowledge> = {
  // 1. HUTANG USAHA (POIN UTAMA PERTANYAAN USER)
  "2101": {
    title: "Hutang Usaha / Dagang (Kewajiban Tempo ke Vendor)",
    plainMeaning: "Total tagihan yang WAJIB Anda bayarkan ke supplier/vendor karena barang dari Purchase Order (PO) sudah Anda terima di gudang, namun pembayarannya belum Anda lunasi (masih sistem tempo/kredit).",
    mathFormula: "Saldo Hutang Usaha = Total Nilai PO Diterima (Kredit) - Total Pembayaran PO yang Dicatat (Debit)",
    sourceMenus: [
      {
        menuName: "Menu Pembelian (/purchase)",
        actionTrigger: "Saat Purchase Order (PO) diubah statusnya menjadi 'received' (Diterima), sistem otomatis menambah nilai Hutang Usaha (Kredit) dan menambah nilai Persediaan Barang (Debit).",
        route: "/purchase",
        badgeColor: "bg-purple-100 text-purple-700"
      },
      {
        menuName: "Detail PO -> Catat Pembayaran (/purchase/[id])",
        actionTrigger: "Saat Anda mengklik tombol 'Catat Pembayaran' di detail PO, sistem otomatis mendebit akun Hutang Usaha ini (mengurangi utang) dan mengkredit Kas/Bank (uang keluar).",
        route: "/purchase",
        badgeColor: "bg-emerald-100 text-emerald-700"
      }
    ],
    howToChange: [
      "Jika ingin MENGURANGI/MELUNASI utang: Buka menu Pembelian (/purchase), pilih PO yang berstatus 'unpaid' atau 'partial', lalu klik tombol 'Catat Pembayaran' untuk mencatat transfer ke vendor.",
      "Jika ingin MENAMBAH utang: Buat PO tempo baru di menu Pembelian (/purchase/new), lalu saat barang fisik tiba di gudang ubah status PO tersebut menjadi 'Diterima' (Received).",
      "Jika ingin MEMBATALKAN utang fiktif/salah: Buka PO terkait di /purchase, hapus pembayaran jika ada, atau batalkan/hapus PO tersebut jika belum ada mutasi.",
      "Koreksi manual darurat: Buat entri Jurnal Penyesuaian di menu Buku Besar (/ledger)."
    ],
    whereDoesItGo: "Saat PO dilunasi melalui 'Catat Pembayaran', saldo Hutang Usaha (2101) ini hilang/berkurang di sisi Pasiva, dan berpindah MENGURANGI SALDO KAS & BANK (1101) di sisi Aktiva karena ada uang kas riil perusahaan yang keluar untuk membayar supplier. Kedua sisi Neraca tetap seimbang!"
  },

  // 2. KAS DAN BANK
  "1101": {
    title: "Kas dan Bank (Uang Kasir, Brankas & Rekening Bisnis)",
    plainMeaning: "Saldo uang tunai dan saldo di semua rekening bank (BCA, Mandiri, dll) milik bisnis Anda yang siap dipakai setiap saat untuk operasional.",
    mathFormula: "Saldo Kas/Bank = Total Uang Masuk (Debit) - Total Uang Keluar (Kredit)",
    sourceMenus: [
      {
        menuName: "Menu Pembayaran (/payment) & Kasir (/pos)",
        actionTrigger: "Uang Masuk (+): Saat customer melunasi invoice atau bertransaksi langsung di kasir POS.",
        route: "/payment",
        badgeColor: "bg-emerald-100 text-emerald-700"
      },
      {
        menuName: "Menu Pengeluaran (/expenses)",
        actionTrigger: "Uang Keluar (-): Saat mencatat pembayaran listrik, sewa, gaji, konsumsi, atau biaya operasional lain.",
        route: "/expenses",
        badgeColor: "bg-rose-100 text-rose-700"
      },
      {
        menuName: "Pelunasan PO Vendor (/purchase)",
        actionTrigger: "Uang Keluar (-): Saat mencatat pembayaran tagihan Purchase Order ke supplier.",
        route: "/purchase",
        badgeColor: "bg-amber-100 text-amber-700"
      }
    ],
    howToChange: [
      "Menambah saldo kas: Catat penerimaan pembayaran invoice customer di menu Pembayaran (/payment) atau catat penambahan modal pemilik di Buku Besar (/ledger).",
      "Mengurangi saldo kas: Catat pengeluaran biaya operasional di menu Biaya (/expenses) atau bayar tagihan PO di menu Pembelian (/purchase)."
    ],
    whereDoesItGo: "Ketika kas keluar untuk bayar PO vendor, kas berpindah mengurangi Utang Usaha. Ketika kas keluar untuk belanja biaya kantor, kas berpindah menjadi Beban di Laba Rugi yang mengurangi Laba Bersih usaha."
  },

  // 3. PERSEDIAAN BARANG DAGANG
  "1102": {
    title: "Persediaan Barang Dagang (Nilai Aset Stok Gudang)",
    plainMeaning: "Total nilai rupiah dari seluruh barang dagangan yang saat ini masih tersimpan di rak toko atau gudang Anda dan siap untuk dijual ke pelanggan.",
    mathFormula: "Saldo Persediaan = Total Nilai Kulakan Masuk (Debit) - Total Modal Barang Terjual (Kredit)",
    sourceMenus: [
      {
        menuName: "Menu Pembelian (/purchase)",
        actionTrigger: "Stok Masuk (+): Tercipta otomatis saat PO vendor berstatus 'received' (Diterima). Nilai PO langsung masuk menambah persediaan.",
        route: "/purchase",
        badgeColor: "bg-purple-100 text-purple-700"
      },
      {
        menuName: "Menu Invoice (/invoice) & Surat Jalan (/delivery)",
        actionTrigger: "Stok Keluar (-): Terjadi saat Anda menerbitkan invoice penjualan atau mengirim barang. Persediaan dipotong otomatis dan berpindah menjadi HPP.",
        route: "/invoice",
        badgeColor: "bg-blue-100 text-blue-700"
      }
    ],
    howToChange: [
      "Menambah persediaan: Buat PO baru di menu Pembelian (/purchase) dan ubah statusnya menjadi 'Diterima' (Received).",
      "Mengurangi persediaan: Terbitkan Invoice penjualan barang tersebut di menu Invoice (/invoice) atau sesuaikan stok fisik di menu Stok (/inventory)."
    ],
    whereDoesItGo: "Saat barang dagang laku terjual ke pembeli, nilai aset persediaan ini berkurang dan OTOMATIS BERPINDAH MENJADI HARGA POKOK PENJUALAN (HPP akun 5101) di Laporan Laba Rugi!"
  },

  // 4. PIUTANG USAHA / DAGANG
  "1103": {
    title: "Piutang Usaha (Tagihan Penjualan Belum Lunas)",
    plainMeaning: "Uang bisnis Anda yang saat ini masih 'dipinjam' atau belum dilunasi oleh pelanggan atas faktur penjualan yang sudah Anda terbitkan dan kirimkan.",
    mathFormula: "Saldo Piutang = Total Faktur Invoice Terbit (Debit) - Total Pembayaran Masuk (Kredit)",
    sourceMenus: [
      {
        menuName: "Menu Invoice (/invoice)",
        actionTrigger: "Piutang Bertambah (+): Saat Anda menerbitkan invoice penjualan berstatus 'sent', 'partial', atau 'overdue'.",
        route: "/invoice",
        badgeColor: "bg-blue-100 text-blue-700"
      },
      {
        menuName: "Menu Pembayaran (/payment)",
        actionTrigger: "Piutang Berkurang (-): Saat pelanggan mentransfer dan Anda mencatat pembayarannya di menu Pembayaran atau detail Invoice.",
        route: "/payment",
        badgeColor: "bg-emerald-100 text-emerald-700"
      }
    ],
    howToChange: [
      "Mengurangi angka piutang: Tagih pelanggan dan catat pelunasannya di menu Pembayaran (/payment). Saldo piutang akan turun dan saldo kas/bank bertambah.",
      "Menambah piutang: Terbitkan faktur penjualan baru secara tempo/kredit di menu Invoice (/invoice/new).",
      "Koreksi invoice salah: Batalkan atau edit invoice di menu /invoice."
    ],
    whereDoesItGo: "Saat customer membayar tagihan, nilai piutang ini hilang dan BERPINDAH MENJADI UANG TUNAI di akun Kas dan Bank (1101) pada Neraca Aktiva."
  },

  // 5. PENDAPATAN PENJUALAN
  "4101": {
    title: "Pendapatan Penjualan (Omset Kotor Penjualan)",
    plainMeaning: "Total omset seluruh penjualan produk dan jasa bisnis Anda kepada customer dalam periode laporan (sebelum dikurangi modal belanja barang maupun biaya kantor).",
    mathFormula: "Total Pendapatan = Total Subtotal Seluruh Invoice Terbit (Kredit) - Retur/Diskon (Debit)",
    sourceMenus: [
      {
        menuName: "Menu Invoice (/invoice)",
        actionTrigger: "Dihitung dari seluruh faktur penjualan yang difinalisasi (bukan status draft).",
        route: "/invoice",
        badgeColor: "bg-blue-100 text-blue-700"
      },
      {
        menuName: "Menu Kasir POS (/pos)",
        actionTrigger: "Dihitung otomatis dari setiap struk transaksi langsung kasir.",
        route: "/pos",
        badgeColor: "bg-indigo-100 text-indigo-700"
      }
    ],
    howToChange: [
      "Menaikkan angka: Terbitkan faktur penjualan baru di menu Invoice (/invoice/new) atau buat transaksi penjualan kasir di /pos.",
      "Menurunkan angka (jika ada salah input): Edit atau batalkan faktur yang keliru di menu /invoice."
    ],
    whereDoesItGo: "Pendapatan ini menjadi komponen utama pembentuk Laba Kotor dan Laba Bersih di Laporan Laba Rugi, yang nantinya mengalir otomatis menambah Modal Pemilik di Neraca Keuangan."
  },

  // 6. HARGA POKOK PENJUALAN (HPP)
  "5101": {
    title: "Harga Pokok Penjualan (HPP / Biaya Kulakan Barang Terjual)",
    plainMeaning: "Total modal beli kulakan atas barang-barang yang SUDAH LAKU TERJUAL dalam periode ini. HPP BUKAN total belanja stok baru, melainkan modal dari stok yang benar-benar sudah keluar ke pelanggan.",
    mathFormula: "HPP = ∑ (Jumlah Qty Barang Terjual × Harga Modal Beli COGS di Katalog)",
    sourceMenus: [
      {
        menuName: "Menu Katalog Produk (/catalog)",
        actionTrigger: "Mengambil data 'Harga Beli (COGS)' yang Anda masukkan saat membuat/mengedit produk di katalog.",
        route: "/catalog",
        badgeColor: "bg-amber-100 text-amber-700"
      },
      {
        menuName: "Menu Invoice (/invoice) & Surat Jalan (/delivery)",
        actionTrigger: "Saat invoice/surat jalan terbit, sistem mengalikan Qty barang yang laku dengan harga modal di katalog.",
        route: "/invoice",
        badgeColor: "bg-blue-100 text-blue-700"
      }
    ],
    howToChange: [
      "Jika HPP tidak wajar (terlalu tinggi/rendah): Buka menu Katalog (/catalog), klik edit produk terkait, dan pastikan kolom 'Harga Beli Pokok (COGS)' sudah diisi angka modal yang akurat.",
      "Jika penjualan dibatalkan: Batalkan atau hapus invoice terkait di /invoice, maka sistem otomatis membatalkan jurnal HPP dan mengembalikan stok fisik."
    ],
    whereDoesItGo: "HPP langsung mengurangi omset Pendapatan Penjualan untuk menghasilkan Laba Kotor (Gross Profit)."
  },

  // 7. BEBAN SELISIH KURS
  "5205": {
    title: "Beban Selisih Kurs (Forex Loss)",
    plainMeaning: "Kerugian akibat penurunan nilai tukar valuta asing (USD, SGD, dll) antara tanggal faktur dibuat dengan tanggal pembayaran dilunasi.",
    mathFormula: "Beban Kurs = Selisih Kurs Negatif saat Pelunasan Valas",
    sourceMenus: [
      {
        menuName: "Menu Pembayaran Valas (/payment)",
        actionTrigger: "Dihitung otomatis saat invoice mata uang asing dilunasi dengan kurs yang berbeda.",
        route: "/payment",
        badgeColor: "bg-rose-100 text-rose-700"
      }
    ],
    howToChange: [
      "Dihitung otomatis oleh sistem berdasarkan kurs transaksi valas yang dicatat di menu Pembayaran."
    ]
  },

  // 8. PENDAPATAN SELISIH KURS
  "4201": {
    title: "Pendapatan Selisih Kurs (Forex Gain)",
    plainMeaning: "Keuntungan akibat penguatan nilai tukar valuta asing antara tanggal invoice diterbitkan dengan tanggal pelunasan diterima.",
    mathFormula: "Pendapatan Kurs = Selisih Kurs Positif saat Pelunasan Valas",
    sourceMenus: [
      {
        menuName: "Menu Pembayaran Valas (/payment)",
        actionTrigger: "Dihitung otomatis saat invoice mata uang asing dilunasi dengan kurs yang lebih menguntungkan.",
        route: "/payment",
        badgeColor: "bg-emerald-100 text-emerald-700"
      }
    ],
    howToChange: [
      "Dihitung otomatis oleh sistem berdasarkan kurs transaksi valas yang dicatat di menu Pembayaran."
    ]
  },

  // 9. MODAL PEMILIK
  "3101": {
    title: "Modal Pemilik (Owner's Equity / Modal Disetor)",
    plainMeaning: "Total uang modal awal yang disetorkan oleh pemilik usaha saat pertama kali mendirikan usaha atau suntikan modal tambahan ke dalam rekening bisnis.",
    mathFormula: "Saldo Modal = Total Setoran Modal (Kredit) - Penarikan Prive Pemilik (Debit)",
    sourceMenus: [
      {
        menuName: "Menu Buku Besar (/ledger)",
        actionTrigger: "Dicatat melalui tombol 'Jurnal Penyesuaian Manual' (Debit Kas/Bank, Kredit Modal Pemilik).",
        route: "/ledger",
        badgeColor: "bg-slate-100 text-slate-700"
      }
    ],
    howToChange: [
      "Menambah modal: Buka menu Buku Besar (/ledger), klik 'Buat Jurnal Manual', pilih akun Kas/Bank di sisi Debit dan akun Modal Pemilik di sisi Kredit.",
      "Mencatat penarikan prive pemilik: Buat jurnal penyesuaian di /ledger (Debit Prive/Modal, Kredit Kas)."
    ]
  },

  // 10. LABA DITAHAN
  "3201": {
    title: "Laba Ditahan (Retained Earnings)",
    plainMeaning: "Akumulasi keuntungan bersih dari tahun-tahun buku sebelumnya yang tidak diambil oleh pemilik dan disimpan untuk membiayai pengembangan usaha.",
    mathFormula: "Saldo Laba Ditahan = Akumulasi Laba Bersih Periode Lampau yang Ditutup ke Modal",
    sourceMenus: [
      {
        menuName: "Menu Buku Besar (/ledger)",
        actionTrigger: "Terbentuk dari penutupan buku tahunan atau jurnal saldo awal periode.",
        route: "/ledger",
        badgeColor: "bg-slate-100 text-slate-700"
      }
    ],
    howToChange: [
      "Dikelola pada saat penutupan tahun buku di akhir tahun atau disesuaikan melalui Jurnal Penyesuaian di menu Buku Besar (/ledger)."
    ]
  }
};

export default function FinancialReportsPage() {
  const { activeBusiness } = useBusiness();
  const [activeTab, setActiveTab] = useState<"p_l" | "balance_sheet">("p_l");
  const [accounts, setAccounts] = useState<AccountWithItems[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Date filters
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Audit drill-down drawer/modal state
  const [selectedAuditAccount, setSelectedAuditAccount] = useState<AccountWithItems | null>(null);
  const [selectedAuditMetric, setSelectedAuditMetric] = useState<{
    key: string;
    code?: string;
    name: string;
    category: "income" | "cogs" | "expense" | "asset" | "liability" | "equity" | "summary";
    balance: number;
    subAccounts?: { code: string; name: string; balance: number }[];
    knowledge: MetricKnowledge;
  } | null>(null);
  const [auditTab, setAuditTab] = useState<"guide" | "logs">("guide");
  const [logSearchQuery, setLogSearchQuery] = useState("");

  // Visual Flow Guide Modal
  const [showFlowModal, setShowFlowModal] = useState(false);
  const [baganTab, setBaganTab] = useState<"terpadu" | "po" | "invoice" | "expense" | "neraca">("terpadu");

  const fetchAccountsAndJournalItems = async () => {
    if (!activeBusiness) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const supabase = createWebBrowserClient();

      let query = supabase
        .from("accounts")
        .select(`
          id,
          code,
          name,
          type,
          is_active,
          journal_items (
            id,
            debit,
            credit,
            journal_entries!inner (
              id,
              entry_date,
              description,
              reference_source,
              reference_id
            )
          )
        `)
        .eq("business_id", activeBusiness.id);

      if (startDate) {
        query = query.gte("journal_items.journal_entries.entry_date", startDate);
      }
      if (endDate) {
        query = query.lte("journal_items.journal_entries.entry_date", endDate);
      }

      const { data, error } = await query.order("code", { ascending: true });

      if (error) throw error;
      setAccounts(data as any[] || []);
    } catch (err) {
      console.error("Error fetching report details:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccountsAndJournalItems();
  }, [activeBusiness, startDate, endDate]);

  const calculateBalance = (account: AccountWithItems) => {
    const totalDebit = (account.journal_items || []).reduce((sum, item) => sum + Number(item.debit || 0), 0);
    const totalCredit = (account.journal_items || []).reduce((sum, item) => sum + Number(item.credit || 0), 0);
    
    if (account.type === "asset" || account.type === "expense") {
      return totalDebit - totalCredit;
    } else {
      return totalCredit - totalDebit;
    }
  };

  const formatCurrency = (val: number) => {
    const isNegative = val < 0;
    const absVal = Math.abs(val);
    const formatted = new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: activeBusiness?.default_currency || "IDR",
      maximumFractionDigits: 0
    }).format(absVal);
    
    return isNegative ? `-${formatted}` : formatted;
  };

  // 1. PROFIT AND LOSS CALCULATIONS
  const incomeAccounts = accounts.filter(a => a.type === "income").map(a => ({
    ...a,
    balance: calculateBalance(a)
  }));
  const totalRevenues = incomeAccounts.reduce((s, a) => s + a.balance, 0);

  const hppAccount = accounts.find(a => a.code === "5101");
  const totalCOGS = hppAccount ? calculateBalance(hppAccount) : 0;

  const grossProfit = totalRevenues - totalCOGS;

  const expenseAccounts = accounts
    .filter(a => a.type === "expense" && a.code !== "5101")
    .map(a => ({
      ...a,
      balance: calculateBalance(a)
    }));
  const totalExpenses = expenseAccounts.reduce((s, a) => s + a.balance, 0);

  const netIncome = grossProfit - totalExpenses;

  // 2. BALANCE SHEET CALCULATIONS
  const assetAccounts = accounts.filter(a => a.type === "asset").map(a => ({
    ...a,
    balance: calculateBalance(a)
  }));
  const totalAssets = assetAccounts.reduce((s, a) => s + calculateBalance(a), 0);

  const liabilityAccounts = accounts.filter(a => a.type === "liability").map(a => ({
    ...a,
    balance: calculateBalance(a)
  }));
  const totalLiabilities = liabilityAccounts.reduce((s, a) => s + a.balance, 0);

  const equityAccounts = accounts.filter(a => a.type === "equity").map(a => ({
    ...a,
    balance: calculateBalance(a)
  }));
  const totalEquityBase = equityAccounts.reduce((s, a) => s + a.balance, 0);
  const totalEquity = totalEquityBase + netIncome;

  const balanceDifference = Math.abs(totalAssets - (totalLiabilities + totalEquity));
  const isBalanced = balanceDifference < 1;

  // Helper to open audit inspection for an individual account
  const handleOpenAccountAudit = (acc: AccountWithItems) => {
    setSelectedAuditMetric(null);
    setSelectedAuditAccount(acc);
    setAuditTab("guide");
    setLogSearchQuery("");
  };

  // Helper to open audit inspection for summary/calculated row
  const handleOpenSummaryAudit = (
    key: string,
    name: string,
    balance: number,
    category: "income" | "cogs" | "expense" | "asset" | "liability" | "equity" | "summary",
    knowledge: MetricKnowledge,
    subAccounts?: { code: string; name: string; balance: number }[]
  ) => {
    setSelectedAuditAccount(null);
    setSelectedAuditMetric({
      key,
      name,
      balance,
      category,
      knowledge,
      subAccounts
    });
    setAuditTab("guide");
    setLogSearchQuery("");
  };

  // Generate fallback knowledge for general accounts
  const getAccountKnowledge = (acc: AccountWithItems): MetricKnowledge => {
    if (FINANCIAL_KNOWLEDGE_BASE[acc.code]) {
      return FINANCIAL_KNOWLEDGE_BASE[acc.code];
    }

    if (acc.type === "expense") {
      return {
        title: `[${acc.code}] ${acc.name}`,
        plainMeaning: `Beban operasional bisnis untuk keperluan ${acc.name}. Tercatat saat pengeluaran kas dicatat untuk pos ini.`,
        mathFormula: `Saldo Beban = Total Pengeluaran Dicatat (Debit) - Pengembalian/Koreksi (Kredit)`,
        sourceMenus: [
          {
            menuName: "Menu Pengeluaran (/expenses)",
            actionTrigger: "Terbentuk saat Anda menambahkan pengeluaran operasional baru dan memilih kategori ini.",
            route: "/expenses",
            badgeColor: "bg-amber-100 text-amber-700"
          }
        ],
        howToChange: [
          "Buka menu Pengeluaran (/expenses), tambah catatan pengeluaran baru atau edit/hapus pengeluaran yang keliru."
        ],
        whereDoesItGo: "Beban ini mengurangi Laba Kotor untuk menghitung Laba Bersih di Laporan Laba Rugi."
      };
    }

    return {
      title: `[${acc.code}] ${acc.name}`,
      plainMeaning: `Akun pembukuan resmi berkode ${acc.code} tipe ${acc.type.toUpperCase()} pada Bagan Akun (Chart of Accounts).`,
      mathFormula: acc.type === "asset"
        ? "Saldo = Total Debit - Total Kredit"
        : "Saldo = Total Kredit - Total Debit",
      sourceMenus: [
        {
          menuName: "Menu Buku Besar (/ledger) & Bagan Akun (/accounts)",
          actionTrigger: "Dipengaruhi oleh entri jurnal transaksi otomatis maupun jurnal penyesuaian manual.",
          route: "/ledger",
          badgeColor: "bg-slate-100 text-slate-700"
        }
      ],
      howToChange: [
        "Buat jurnal penyesuaian di menu Buku Besar (/ledger) atau kelola di Bagan Akun (/accounts)."
      ]
    };
  };

  // Helper to interpret Debit vs Credit flow for non-finance users based on account type
  const getAccountFlowInterpretation = (type?: string, code?: string) => {
    // 1. PENDAPATAN (Income) - Saldo normal Kredit (Kredit = Penjualan Masuk / Omset Bertambah)
    if (type === "income" || code?.startsWith("4")) {
      return {
        debitLabel: "Debit (Retur/Diskon)",
        debitSubtitle: "Pengurang Omset / Retur (-)",
        debitBadge: "text-rose-700 bg-rose-50 border-rose-200/80",
        debitHeaderBadge: "text-rose-800 bg-rose-100/90 border-rose-300",
        debitCardBg: "bg-rose-50/90 border-rose-200",
        debitCardTitle: "text-rose-800",
        debitCardValue: "text-rose-700",
        debitCardBadge: "bg-rose-600 text-white",
        debitCardStatus: "🔴 Pengurang Omset / Retur (-)",
        debitSign: "-",
        debitIcon: Minus,

        creditLabel: "Kredit (Penjualan Masuk)",
        creditSubtitle: "Omset Penjualan Faktur (+)",
        creditBadge: "text-emerald-700 bg-emerald-50 border-emerald-200/80",
        creditHeaderBadge: "text-emerald-800 bg-emerald-100/90 border-emerald-300",
        creditCardBg: "bg-emerald-50/90 border-emerald-200",
        creditCardTitle: "text-emerald-800",
        creditCardValue: "text-emerald-700",
        creditCardBadge: "bg-emerald-600 text-white",
        creditCardStatus: "🟢 Penjualan Masuk / Omset (+)",
        creditSign: "+",
        creditIcon: Plus,

        balanceLabel: "Total Pendapatan Bersih",
        quickGuideDebit: "🔴 (-) Debit = Retur / Diskon / Pengurang Omset",
        quickGuideCredit: "🟢 (+) Kredit = Penjualan Masuk (Omset Bertambah)",
      };
    }

    // 2. BEBAN & HPP (Expense & COGS) - Saldo normal Debit (Debit = Beban Tercatat Memotong Laba)
    if (type === "expense" || code?.startsWith("5")) {
      return {
        debitLabel: "Debit (Biaya Tercatat)",
        debitSubtitle: "Beban Operasional Keluar (-)",
        debitBadge: "text-rose-700 bg-rose-50 border-rose-200/80",
        debitHeaderBadge: "text-rose-800 bg-rose-100/90 border-rose-300",
        debitCardBg: "bg-rose-50/90 border-rose-200",
        debitCardTitle: "text-rose-800",
        debitCardValue: "text-rose-700",
        debitCardBadge: "bg-rose-600 text-white",
        debitCardStatus: "🔴 Pengeluaran Biaya / Beban",
        debitSign: "+",
        debitIcon: Plus,

        creditLabel: "Kredit (Koreksi/Pengembalian)",
        creditSubtitle: "Pengurangan Beban / Koreksi (+)",
        creditBadge: "text-emerald-700 bg-emerald-50 border-emerald-200/80",
        creditHeaderBadge: "text-emerald-800 bg-emerald-100/90 border-emerald-300",
        creditCardBg: "bg-emerald-50/90 border-emerald-200",
        creditCardTitle: "text-emerald-800",
        creditCardValue: "text-emerald-700",
        creditCardBadge: "bg-emerald-600 text-white",
        creditCardStatus: "🟢 Koreksi / Pengembalian Biaya (+)",
        creditSign: "-",
        creditIcon: Minus,

        balanceLabel: "Total Beban Operasional",
        quickGuideDebit: "🔴 Debit = Beban Tercatat (Memotong Laba)",
        quickGuideCredit: "🟢 Kredit = Pengembalian / Koreksi Beban",
      };
    }

    // 3. KEWAJIBAN / UTANG (Liability) - Saldo normal Kredit (Kredit = Tagihan Baru, Debit = Bayar Utang)
    if (type === "liability" || code?.startsWith("2")) {
      return {
        debitLabel: "Debit (Pelunasan Utang)",
        debitSubtitle: "Pembayaran ke Vendor (-)",
        debitBadge: "text-emerald-700 bg-emerald-50 border-emerald-200/80",
        debitHeaderBadge: "text-emerald-800 bg-emerald-100/90 border-emerald-300",
        debitCardBg: "bg-emerald-50/90 border-emerald-200",
        debitCardTitle: "text-emerald-800",
        debitCardValue: "text-emerald-700",
        debitCardBadge: "bg-emerald-600 text-white",
        debitCardStatus: "🟢 Pembayaran Vendor (Utang Lunas/Turun)",
        debitSign: "-",
        debitIcon: Minus,

        creditLabel: "Kredit (Tagihan Baru)",
        creditSubtitle: "PO Tempo Diterima / Utang Baru (+)",
        creditBadge: "text-amber-700 bg-amber-50 border-amber-200/80",
        creditHeaderBadge: "text-amber-800 bg-amber-100/90 border-amber-300",
        creditCardBg: "bg-amber-50/90 border-amber-200",
        creditCardTitle: "text-amber-800",
        creditCardValue: "text-amber-700",
        creditCardBadge: "bg-amber-600 text-white",
        creditCardStatus: "🟡 Tagihan Baru Masuk (Utang Bertambah)",
        creditSign: "+",
        creditIcon: Plus,

        balanceLabel: "Sisa Utang Belum Lunas",
        quickGuideDebit: "🟢 (-) Debit = Pelunasan Utang (Kewajiban Berkurang)",
        quickGuideCredit: "🟡 (+) Kredit = Tagihan Baru (Utang Bertambah)",
      };
    }

    // 4. EKUITAS / MODAL (Equity) - Saldo normal Kredit (Kredit = Tambah Modal/Laba, Debit = Prive)
    if (type === "equity" || code?.startsWith("3")) {
      return {
        debitLabel: "Debit (Penarikan Prive)",
        debitSubtitle: "Penarikan Modal Pemilik (-)",
        debitBadge: "text-rose-700 bg-rose-50 border-rose-200/80",
        debitHeaderBadge: "text-rose-800 bg-rose-100/90 border-rose-300",
        debitCardBg: "bg-rose-50/90 border-rose-200",
        debitCardTitle: "text-rose-800",
        debitCardValue: "text-rose-700",
        debitCardBadge: "bg-rose-600 text-white",
        debitCardStatus: "🔴 Penarikan Modal / Prive (-)",
        debitSign: "-",
        debitIcon: Minus,

        creditLabel: "Kredit (Tambah Modal)",
        creditSubtitle: "Setoran Modal / Akumulasi Laba (+)",
        creditBadge: "text-emerald-700 bg-emerald-50 border-emerald-200/80",
        creditHeaderBadge: "text-emerald-800 bg-emerald-100/90 border-emerald-300",
        creditCardBg: "bg-emerald-50/90 border-emerald-200",
        creditCardTitle: "text-emerald-800",
        creditCardValue: "text-emerald-700",
        creditCardBadge: "bg-emerald-600 text-white",
        creditCardStatus: "🟢 Tambah Modal / Laba Bersih (+)",
        creditSign: "+",
        creditIcon: Plus,

        balanceLabel: "Total Modal & Ekuitas",
        quickGuideDebit: "🔴 (-) Debit = Penarikan Modal / Prive Pribadi",
        quickGuideCredit: "🟢 (+) Kredit = Penambahan Modal / Akumulasi Laba",
      };
    }

    // 5. DEFAULT: ASET (Asset: Kas, Bank, Piutang, Stok, Aset Tetap - code 1xxx)
    return {
      debitLabel: "Debit (Aset Masuk)",
      debitSubtitle: "Uang / Piutang / Stok Bertambah (+)",
      debitBadge: "text-emerald-700 bg-emerald-50 border-emerald-200/80",
      debitHeaderBadge: "text-emerald-800 bg-emerald-100/90 border-emerald-300",
      debitCardBg: "bg-emerald-50/90 border-emerald-200",
      debitCardTitle: "text-emerald-800",
      debitCardValue: "text-emerald-700",
      debitCardBadge: "bg-emerald-600 text-white",
      debitCardStatus: "🟢 Uang / Aset Bertambah (+)",
      debitSign: "+",
      debitIcon: Plus,

      creditLabel: "Kredit (Aset Keluar)",
      creditSubtitle: "Uang Keluar / Piutang Lunas / Stok Terjual (-)",
      creditBadge: "text-rose-700 bg-rose-50 border-rose-200/80",
      creditHeaderBadge: "text-rose-800 bg-rose-100/90 border-rose-300",
      creditCardBg: "bg-rose-50/90 border-rose-200",
      creditCardTitle: "text-rose-800",
      creditCardValue: "text-rose-700",
      creditCardBadge: "bg-rose-600 text-white",
      creditCardStatus: "🔴 Uang / Aset Berkurang (-)",
      creditSign: "-",
      creditIcon: Minus,

      balanceLabel: "Saldo Harta / Aset Tersedia",
      quickGuideDebit: "🟢 (+) Debit = Uang/Aset Masuk (Saldo Bertambah)",
      quickGuideCredit: "🔴 (-) Kredit = Uang/Aset Keluar (Saldo Berkurang)",
    };
  };

  // Helper to format source badge
  const getSourceBadge = (source: string | null | undefined) => {
    const s = (source || "").toLowerCase();
    if (s.includes("purchase_order")) {
      return { label: "Penerimaan PO", color: "bg-purple-100 text-purple-700 border-purple-200" };
    }
    if (s.includes("purchase_payment")) {
      return { label: "Pelunasan PO", color: "bg-rose-100 text-rose-700 border-rose-200" };
    }
    if (s.includes("invoice") || s.startsWith("inv")) {
      return { label: "Faktur Invoice", color: "bg-blue-100 text-blue-700 border-blue-200" };
    }
    if (s.includes("payment")) {
      return { label: "Pembayaran Masuk", color: "bg-emerald-100 text-emerald-700 border-emerald-200" };
    }
    if (s.includes("expense")) {
      return { label: "Biaya Operasional", color: "bg-amber-100 text-amber-700 border-amber-200" };
    }
    if (s.includes("delivery")) {
      return { label: "Surat Jalan / DO", color: "bg-cyan-100 text-cyan-700 border-cyan-200" };
    }
    return { label: "Jurnal Manual", color: "bg-slate-100 text-slate-700 border-slate-200" };
  };

  // Helper to get document link
  const getDocumentRoute = (source: string | null | undefined, refId: string | null | undefined) => {
    const s = (source || "").toLowerCase();
    if (s.includes("purchase_order") && refId) {
      return `/purchase/${refId}`;
    }
    if (s.includes("purchase_payment")) {
      return `/purchase`;
    }
    if ((s.includes("invoice") || s.startsWith("inv")) && refId) {
      return `/invoice/${refId}`;
    }
    if (s.includes("payment")) {
      return `/payment`;
    }
    if (s.includes("expense")) {
      return `/expenses`;
    }
    if (s.includes("delivery")) {
      return `/delivery`;
    }
    return `/ledger`;
  };

  const handleExportCSV = () => {
    let csvContent = "\uFEFF"; // UTF-8 BOM for Excel Excel character support
    
    if (activeTab === "p_l") {
      csvContent += "LAPORAN LABA RUGI\n";
      csvContent += `${activeBusiness?.name || "Bisnis"}\n`;
      csvContent += `Periode: ${startDate || "Semua"} s.d. ${endDate || "Semua"}\n\n`;
      csvContent += "Kode Akun,Nama Akun,Tipe Akun,Saldo (Rp)\n";
      
      csvContent += "PENDAPATAN OPERASIONAL,,,\n";
      incomeAccounts.forEach(acc => {
        csvContent += `"${acc.code}","${acc.name}","${acc.type}",${acc.balance}\n`;
      });
      csvContent += `,,TOTAL PENDAPATAN OPERASIONAL,${totalRevenues}\n\n`;
      
      csvContent += "HARGA POKOK PENJUALAN (HPP),,,\n";
      if (hppAccount) {
        csvContent += `"${hppAccount.code}","${hppAccount.name}","${hppAccount.type}",${totalCOGS}\n`;
      }
      csvContent += `,,TOTAL BEBAN POKOK PENJUALAN,${totalCOGS}\n\n`;
      
      csvContent += `,,LABA KOTOR (GROSS PROFIT),${grossProfit}\n\n`;
      
      csvContent += "BEBAN OPERASIONAL,,,\n";
      expenseAccounts.forEach(acc => {
        csvContent += `"${acc.code}","${acc.name}","${acc.type}",${acc.balance}\n`;
      });
      csvContent += `,,TOTAL BEBAN OPERASIONAL,${totalExpenses}\n\n`;
      csvContent += `,,LABA BERSIH TAHUN BERJALAN,${netIncome}\n`;
    } else {
      csvContent += "LAPORAN NERACA KEUANGAN (BALANCE SHEET)\n";
      csvContent += `${activeBusiness?.name || "Bisnis"}\n`;
      csvContent += `Per Tanggal: ${endDate || "Hari Ini"}\n\n`;
      
      csvContent += "AKTIVA (ASSETS),,,PASIVA (LIABILITIES & EQUITY),,\n";
      csvContent += "Kode Akun,Nama Akun,Saldo (Rp),Kode Akun,Nama Akun,Saldo (Rp)\n";
      
      const maxRows = Math.max(assetAccounts.length, liabilityAccounts.length + equityAccounts.length + 3);
      
      for (let i = 0; i < maxRows; i++) {
        // Left column: Assets
        let assetStr = ",,";
        if (i < assetAccounts.length) {
          const acc = assetAccounts[i];
          assetStr = `"${acc.code}","${acc.name}",${calculateBalance(acc)}`;
        } else if (i === assetAccounts.length) {
          assetStr = `,,${totalAssets}`;
        }
        
        // Right column: Liabilities & Equity
        let pasivaStr = ",,";
        const liabLen = liabilityAccounts.length;
        const eqLen = equityAccounts.length;
        
        if (i < liabLen) {
          const acc = liabilityAccounts[i];
          pasivaStr = `"${acc.code}","${acc.name}",${acc.balance}`;
        } else if (i === liabLen) {
          pasivaStr = `,,${totalLiabilities}`;
        } else if (i < liabLen + 1 + eqLen) {
          const accIndex = i - liabLen - 1;
          const acc = equityAccounts[accIndex];
          pasivaStr = `"${acc.code}","${acc.name}",${acc.balance}`;
        } else if (i === liabLen + 1 + eqLen) {
          pasivaStr = `,"Laba Tahun Berjalan (Net Income)",${netIncome}`;
        } else if (i === liabLen + 1 + eqLen + 1) {
          pasivaStr = `,,${totalEquity}`;
        } else if (i === liabLen + 1 + eqLen + 2) {
          pasivaStr = `,,${totalLiabilities + totalEquity}`;
        }
        
        csvContent += `${assetStr},${pasivaStr}\n`;
      }
    }
    
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Laporan_${activeTab === "p_l" ? "Laba_Rugi" : "Neraca"}_${activeBusiness?.name || "Bisnis"}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 text-slate-800">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4 no-print">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              Laporan Keuangan Resmi
            </h2>
            <span className="bg-blue-100 text-blue-700 text-[10px] font-extrabold px-2 py-0.5 rounded-full border border-blue-200 uppercase tracking-wide">
              Buku Besar Terintegrasi
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-0.5">
            Analisis Laba Rugi dan Neraca Keuangan otomatis bersumber dari transaksi PO, Invoice, dan Pengeluaran.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowFlowModal(true)}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-2.5 px-3.5 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-sm transition transform hover:-translate-y-0.5"
            title="Buka Peta Alur & Panduan untuk Non-Finance"
          >
            <BookOpen className="w-4 h-4" /> Peta Alur & Panduan Non-Finance
          </button>
          <button
            onClick={handleExportCSV}
            className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold py-2.5 px-3.5 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-sm transition"
          >
            <Download className="w-4 h-4" /> Ekspor CSV
          </button>
          <button
            onClick={() => window.print()}
            className="bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-sm transition"
          >
            Cetak (PDF)
          </button>
        </div>
      </div>

      {/* Date Filters no-print */}
      <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 no-print">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-blue-600" />
          <span className="text-xs font-bold text-slate-600">Filter Periode Laporan:</span>
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 w-full sm:w-auto">
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="bg-white border border-slate-200 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-sm flex-1 sm:flex-none"
          />
          <span>s.d.</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="bg-white border border-slate-200 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-sm flex-1 sm:flex-none"
          />
          {(startDate || endDate) && (
            <button
              type="button"
              onClick={() => {
                setStartDate("");
                setEndDate("");
              }}
              className="text-[11px] font-bold text-rose-600 hover:text-rose-700 px-2 py-1 hover:bg-rose-50 rounded-lg transition"
            >
              Reset Filter
            </button>
          )}
        </div>
      </div>

      {/* Interactive Helper Banner no-print */}
      <div className="bg-blue-50/80 border border-blue-200/80 rounded-2xl p-3.5 flex items-start gap-3 text-xs text-blue-900 no-print shadow-xs">
        <div className="w-6 h-6 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
          <Sparkles className="w-3.5 h-3.5" />
        </div>
        <div className="flex-1">
          <span className="font-bold text-blue-950">Mode Audit Interaktif Aktif: </span>
          <span>
            Bukan orang finance? <strong>Klik baris atau angka mana pun pada laporan di bawah</strong> untuk melihat rumus hitungnya, menu asal datanya (PO, Invoice, Biaya), cara mengubahnya, serta riwayat log transaksinya.
          </span>
        </div>
        <button
          onClick={() => setShowFlowModal(true)}
          className="underline font-extrabold text-blue-700 hover:text-blue-950 shrink-0 text-[11px] self-center"
        >
          Lihat Peta Alur
        </button>
      </div>

      {/* Tab Switcher no-print */}
      <div className="flex bg-white border border-slate-200 rounded-xl p-1 shadow-sm no-print">
        <button
          onClick={() => setActiveTab("p_l")}
          className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 ${
            activeTab === "p_l" 
              ? "bg-blue-600 text-white shadow-sm font-extrabold" 
              : "text-slate-500 hover:bg-slate-50"
          }`}
        >
          <PieChart className="w-4 h-4" /> Laporan Laba Rugi (Profit & Loss)
        </button>
        <button
          onClick={() => setActiveTab("balance_sheet")}
          className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 ${
            activeTab === "balance_sheet" 
              ? "bg-blue-600 text-white shadow-sm font-extrabold" 
              : "text-slate-500 hover:bg-slate-50"
          }`}
        >
          <Scale className="w-4 h-4" /> Neraca Keuangan (Balance Sheet)
        </button>
      </div>

      {/* Print Document Wrapper */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white border border-slate-200 rounded-2xl">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs text-slate-500 font-semibold mt-3">Menyusun laporan keuangan & riwayat buku besar...</p>
        </div>
      ) : activeTab === "p_l" ? (
        
        /* 1. LABA RUGI STATEMENT SHEET */
        <div className="bg-white border border-slate-200 rounded-2xl p-6 md:p-8 shadow-sm space-y-8 relative overflow-hidden print-layout" style={{ borderTop: `6px solid #2563EB` }}>
          
          <div className="text-center space-y-1.5 pb-6 border-b border-slate-100">
            <h3 className="text-lg font-bold text-slate-900 uppercase tracking-wide">{activeBusiness?.name || "Nama Toko / Bisnis"}</h3>
            <h4 className="text-md font-bold text-slate-800 uppercase">Laporan Laba Rugi</h4>
            <p className="text-xs text-slate-500 font-medium">
              {startDate && endDate 
                ? `Periode: ${startDate} s.d. ${endDate}` 
                : "Periode: Semua Transaksi Terdaftar"}
            </p>
          </div>

          <div className="space-y-6 text-sm">
            
            {/* 1.1 PENDAPATAN OPERASIONAL */}
            <div className="space-y-2">
              <div className="flex justify-between border-b border-slate-950 pb-1.5 text-slate-900 font-bold uppercase tracking-wider text-xs">
                <span>Pendapatan Operasional</span>
                <span>Jumlah</span>
              </div>
              
              <div className="space-y-1">
                {incomeAccounts.map(acc => (
                  <div 
                    key={acc.id} 
                    onClick={() => handleOpenAccountAudit(acc)}
                    className="group flex justify-between items-center px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 hover:bg-blue-50/70 hover:text-blue-900 cursor-pointer transition border border-transparent hover:border-blue-200"
                    title="Klik untuk melihat rumus & riwayat log transaksi"
                  >
                    <div className="flex items-center gap-2">
                      <span>[{acc.code}] {acc.name}</span>
                      <span className="opacity-0 group-hover:opacity-100 text-[10px] font-extrabold text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded transition flex items-center gap-0.5">
                        <Search className="w-2.5 h-2.5" /> Audit
                      </span>
                    </div>
                    <span className="font-bold text-slate-900">{formatCurrency(acc.balance)}</span>
                  </div>
                ))}
              </div>
              
              <div 
                onClick={() => handleOpenSummaryAudit(
                  "gross_revenue",
                  "Total Pendapatan Operasional",
                  totalRevenues,
                  "income",
                  {
                    title: "Total Pendapatan Bersih (Omset Penjualan)",
                    plainMeaning: "Total akumulasi seluruh penjualan produk atau jasa dari faktur invoice yang diterbitkan dalam periode laporan.",
                    mathFormula: "Total Pendapatan = Jumlah seluruh akun pendapatan (Akun 4xxx)",
                    sourceMenus: [
                      {
                        menuName: "Menu Invoice (/invoice)",
                        actionTrigger: "Semua transaksi invoice penjualan.",
                        route: "/invoice",
                        badgeColor: "bg-blue-100 text-blue-700"
                      }
                    ],
                    howToChange: [
                      "Terbitkan invoice baru di /invoice untuk menaikkan, atau batalkan invoice yang salah di /invoice."
                    ]
                  },
                  incomeAccounts.map(a => ({ code: a.code, name: a.name, balance: a.balance }))
                )}
                className="group flex justify-between items-center border-t border-dashed border-slate-200 pt-2 px-3 py-1.5 font-bold text-slate-900 text-xs hover:bg-slate-50 cursor-pointer rounded-lg transition"
                title="Klik untuk melihat rincian akun pembentuk"
              >
                <div className="flex items-center gap-2 uppercase tracking-wide">
                  <span>Total Pendapatan Bersih</span>
                  <span className="opacity-0 group-hover:opacity-100 text-[10px] font-bold text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded transition">
                    Rincian
                  </span>
                </div>
                <span className="text-blue-600 font-extrabold">{formatCurrency(totalRevenues)}</span>
              </div>
            </div>

            {/* 1.2 HARGA POKOK PENJUALAN (HPP) */}
            <div className="space-y-2">
              <div className="flex justify-between border-b border-slate-950 pb-1.5 text-slate-900 font-bold uppercase tracking-wider text-xs">
                <span>Harga Pokok Penjualan (HPP)</span>
                <span>Jumlah</span>
              </div>
              
              <div className="space-y-1">
                {hppAccount ? (
                  <div 
                    onClick={() => handleOpenAccountAudit(hppAccount)}
                    className="group flex justify-between items-center px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 hover:bg-amber-50/70 hover:text-amber-900 cursor-pointer transition border border-transparent hover:border-amber-200"
                    title="Klik untuk melihat rumus & riwayat log transaksi HPP"
                  >
                    <div className="flex items-center gap-2">
                      <span>[{hppAccount.code}] {hppAccount.name}</span>
                      <span className="opacity-0 group-hover:opacity-100 text-[10px] font-extrabold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded transition flex items-center gap-0.5">
                        <Search className="w-2.5 h-2.5" /> Audit
                      </span>
                    </div>
                    <span className="font-bold text-slate-900">{formatCurrency(totalCOGS)}</span>
                  </div>
                ) : (
                  <div className="px-3 py-1.5 text-xs text-slate-400 italic">Akun HPP [5101] belum memiliki transaksi pada periode ini.</div>
                )}
              </div>
              
              <div 
                onClick={() => hppAccount && handleOpenAccountAudit(hppAccount)}
                className="group flex justify-between items-center border-t border-dashed border-slate-200 pt-2 px-3 py-1.5 font-bold text-slate-900 text-xs hover:bg-slate-50 cursor-pointer rounded-lg transition"
              >
                <span className="uppercase">Total Beban Pokok Penjualan</span>
                <span className="text-rose-600 font-bold">({formatCurrency(totalCOGS)})</span>
              </div>
            </div>

            {/* 1.3 LABA KOTOR (GROSS PROFIT) */}
            <div 
              onClick={() => handleOpenSummaryAudit(
                "gross_profit",
                "Laba Kotor (Gross Profit)",
                grossProfit,
                "summary",
                {
                  title: "Laba Kotor (Gross Profit)",
                  plainMeaning: "Keuntungan riil yang didapat langsung dari selisih harga jual produk dikurangi modal beli barangnya (sebelum dipotong biaya listrik, sewa, atau gaji karyawan).",
                  mathFormula: `Laba Kotor = Total Pendapatan Bersih (${formatCurrency(totalRevenues)}) - HPP (${formatCurrency(totalCOGS)}) = ${formatCurrency(grossProfit)}`,
                  sourceMenus: [
                    {
                      menuName: "Invoice (/invoice) & Katalog (/catalog)",
                      actionTrigger: "Dipengaruhi langsung oleh volume penjualan dan marjin harga jual vs harga modal barang.",
                      route: "/catalog",
                      badgeColor: "bg-blue-100 text-blue-700"
                    }
                  ],
                  howToChange: [
                    "Tingkatkan omset penjualan produk dengan marjin keuntungan tinggi.",
                    "Lakukan negosiasi harga kulakan ke supplier untuk menekan biaya modal beli (HPP)."
                  ]
                }
              )}
              className="group flex justify-between items-center bg-slate-50 hover:bg-blue-50/70 p-3.5 rounded-xl border border-slate-200 hover:border-blue-300 font-extrabold text-slate-900 text-xs uppercase cursor-pointer transition"
              title="Klik untuk melihat rumus hitung Laba Kotor"
            >
              <div className="flex items-center gap-2">
                <span>Laba Kotor (Gross Profit)</span>
                <span className="opacity-0 group-hover:opacity-100 text-[10px] font-bold text-blue-600 bg-blue-100 px-2 py-0.5 rounded transition">
                  Rumus Hitung 📐
                </span>
              </div>
              <span className={grossProfit >= 0 ? "text-emerald-700 text-sm" : "text-rose-600 text-sm"}>
                {formatCurrency(grossProfit)}
              </span>
            </div>

            {/* 1.4 BEBAN OPERASIONAL */}
            <div className="space-y-2">
              <div className="flex justify-between border-b border-slate-950 pb-1.5 text-slate-900 font-bold uppercase tracking-wider text-xs">
                <span>Beban Operasional / Pengeluaran Rutin</span>
                <span>Jumlah</span>
              </div>
              
              <div className="space-y-1">
                {expenseAccounts.length === 0 ? (
                  <div className="px-3 py-1.5 text-xs text-slate-400 italic">Tidak ada transaksi beban operasional tercatat pada periode ini.</div>
                ) : (
                  expenseAccounts.map(acc => (
                    <div 
                      key={acc.id} 
                      onClick={() => handleOpenAccountAudit(acc)}
                      className="group flex justify-between items-center px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 hover:bg-rose-50/70 hover:text-rose-900 cursor-pointer transition border border-transparent hover:border-rose-200"
                      title="Klik untuk melihat rumus & riwayat log transaksi biaya"
                    >
                      <div className="flex items-center gap-2">
                        <span>[{acc.code}] {acc.name}</span>
                        <span className="opacity-0 group-hover:opacity-100 text-[10px] font-extrabold text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded transition flex items-center gap-0.5">
                          <Search className="w-2.5 h-2.5" /> Audit
                        </span>
                      </div>
                      <span className="font-bold text-slate-900">{formatCurrency(acc.balance)}</span>
                    </div>
                  ))
                )}
              </div>
              
              <div 
                onClick={() => handleOpenSummaryAudit(
                  "operating_expenses",
                  "Total Beban Operasional",
                  totalExpenses,
                  "expense",
                  {
                    title: "Total Beban Operasional",
                    plainMeaning: "Total seluruh biaya kantor, gaji, sewa, listrik, konsumsi, dan biaya harian yang dicatat selama periode laporan.",
                    mathFormula: "Total Beban = Jumlah seluruh akun biaya (Akun 5xxx selain HPP)",
                    sourceMenus: [
                      {
                        menuName: "Menu Pengeluaran (/expenses)",
                        actionTrigger: "Catatan biaya rutin usaha.",
                        route: "/expenses",
                        badgeColor: "bg-amber-100 text-amber-700"
                      }
                    ],
                    howToChange: [
                      "Buka menu Pengeluaran (/expenses) untuk menambah, mengedit, atau menghapus catatan pengeluaran."
                    ]
                  },
                  expenseAccounts.map(a => ({ code: a.code, name: a.name, balance: a.balance }))
                )}
                className="group flex justify-between items-center border-t border-dashed border-slate-200 pt-2 px-3 py-1.5 font-bold text-slate-900 text-xs hover:bg-slate-50 cursor-pointer rounded-lg transition"
              >
                <div className="flex items-center gap-2 uppercase tracking-wide">
                  <span>Total Beban Operasional</span>
                  <span className="opacity-0 group-hover:opacity-100 text-[10px] font-bold text-rose-600 bg-rose-100 px-1.5 py-0.5 rounded transition">
                    Rincian Biaya
                  </span>
                </div>
                <span className="text-rose-600 font-bold">({formatCurrency(totalExpenses)})</span>
              </div>
            </div>

            {/* 1.5 LABA BERSIH (NET INCOME) */}
            <div 
              onClick={() => handleOpenSummaryAudit(
                "net_income",
                "Laba Bersih Tahun Berjalan (Net Income)",
                netIncome,
                "summary",
                {
                  title: "Laba Bersih Tahun Berjalan (Net Income)",
                  plainMeaning: "Keuntungan bersih riil yang berhasil dicetak bisnis Anda setelah semua omset dikurangi modal barang (HPP) dan seluruh biaya operasional kantor.",
                  mathFormula: `Laba Bersih = Laba Kotor (${formatCurrency(grossProfit)}) - Total Beban Operasional (${formatCurrency(totalExpenses)}) = ${formatCurrency(netIncome)}`,
                  sourceMenus: [
                    {
                      menuName: "Seluruh Transaksi Penjualan, HPP, dan Biaya",
                      actionTrigger: "Hasil akhir dari seluruh aktivitas usaha selama periode yang dipilih.",
                      route: "/reports",
                      badgeColor: "bg-blue-100 text-blue-700"
                    }
                  ],
                  howToChange: [
                    "Untuk menaikkan laba bersih: Tingkatkan omset penjualan, minimalkan HPP, dan lakukan efisiensi pada biaya operasional di menu Pengeluaran (/expenses)."
                  ],
                  whereDoesItGo: "Ini adalah JEMBATAN EMAS ke Neraca Keuangan! Angka Laba Bersih ini otomatis mengalir masuk ke sisi Ekuitas (Modal) pada Neraca Keuangan untuk menambah kekayaan bisnis Anda dan membuat Aktiva & Pasiva seimbang."
                }
              )}
              className="group flex justify-between items-center bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 p-4 rounded-xl font-extrabold text-blue-900 text-sm uppercase cursor-pointer hover:border-blue-400 hover:shadow-sm transition"
              title="Klik untuk melihat jembatan Laba Bersih ke Neraca Keuangan"
            >
              <div className="flex items-center gap-2">
                <span>Laba Bersih Tahun Berjalan (Net Income)</span>
                <span className="text-[10px] font-bold text-blue-700 bg-white/80 px-2 py-0.5 rounded border border-blue-200 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-blue-600" /> Jembatan ke Neraca
                </span>
              </div>
              <span className={`text-base font-black ${netIncome >= 0 ? "text-blue-700" : "text-rose-600"}`}>
                {formatCurrency(netIncome)}
              </span>
            </div>
          </div>

        </div>
      ) : (
        
        /* 2. BALANCE SHEET STATEMENT SHEET */
        <div className="bg-white border border-slate-200 rounded-2xl p-6 md:p-8 shadow-sm space-y-8 relative overflow-hidden print-layout" style={{ borderTop: `6px solid #10B981` }}>
          
          <div className="text-center space-y-1.5 pb-6 border-b border-slate-100">
            <h3 className="text-lg font-bold text-slate-900 uppercase tracking-wide">{activeBusiness?.name || "Nama Toko / Bisnis"}</h3>
            <h4 className="text-md font-bold text-slate-800 uppercase">Neraca Keuangan (Balance Sheet)</h4>
            <p className="text-xs text-slate-500 font-medium">
              {endDate ? `Per Tanggal: ${endDate}` : "Per Tanggal: Hari Ini"} (Prinsip: Aktiva = Pasiva)
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-xs">
            
            {/* SISI KIRI: AKTIVA (ASET / KEKAYAAN) */}
            <div className="space-y-4">
              <div className="flex justify-between border-b border-slate-950 pb-1.5 text-slate-900 font-bold uppercase tracking-wider text-xs">
                <span>AKTIVA (ASET / HARTA USAHA)</span>
                <span>Saldo</span>
              </div>
              
              <div className="space-y-1">
                {assetAccounts.map(acc => {
                  const bal = calculateBalance(acc);
                  const isContra = acc.code === "1202";
                  return (
                    <div 
                      key={acc.id} 
                      onClick={() => handleOpenAccountAudit(acc)}
                      className="group flex justify-between items-center px-3 py-1.5 rounded-lg font-semibold text-slate-700 hover:bg-emerald-50/70 hover:text-emerald-900 cursor-pointer transition border border-transparent hover:border-emerald-200"
                      title="Klik untuk melihat rumus & riwayat log transaksi aset"
                    >
                      <div className="flex items-center gap-2">
                        <span>[{acc.code}] {acc.name}</span>
                        <span className="opacity-0 group-hover:opacity-100 text-[10px] font-extrabold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded transition flex items-center gap-0.5">
                          <Search className="w-2.5 h-2.5" /> Audit
                        </span>
                      </div>
                      <span className={isContra ? "text-rose-600 font-bold" : "font-bold text-slate-900"}>
                        {isContra && bal !== 0 ? `(${formatCurrency(Math.abs(bal))})` : formatCurrency(bal)}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div 
                onClick={() => handleOpenSummaryAudit(
                  "total_assets",
                  "TOTAL AKTIVA (ASSETS)",
                  totalAssets,
                  "asset",
                  {
                    title: "Total Aktiva (Total Harta & Kekayaan Bisnis)",
                    plainMeaning: "Seluruh kekayaan nyata yang dikuasai bisnis Anda saat ini, mencakup kas tunai, saldo rekening bank, piutang tagihan ke pelanggan, serta persediaan stok barang di gudang.",
                    mathFormula: "Total Aktiva = Kas & Bank + Persediaan Gudang + Piutang Dagang + Aset Tetap",
                    sourceMenus: [
                      {
                        menuName: "Menu Kasir, Invoice, Gudang & Bank",
                        actionTrigger: "Akumulasi dari seluruh pos kekayaan aktif bisnis.",
                        route: "/reports",
                        badgeColor: "bg-emerald-100 text-emerald-700"
                      }
                    ],
                    howToChange: [
                      "Aktiva bertambah jika ada laba usaha masuk, ada setoran modal baru, atau ada penambahan barang dagang."
                    ]
                  },
                  assetAccounts.map(a => ({ code: a.code, name: a.name, balance: calculateBalance(a) }))
                )}
                className="group flex justify-between items-center border-t border-slate-950 pt-2 font-extrabold text-blue-700 text-xs bg-blue-50/50 hover:bg-blue-100/70 p-3 rounded-lg border border-blue-200 cursor-pointer transition"
                title="Klik untuk rincian Total Aktiva"
              >
                <div className="flex items-center gap-2 uppercase">
                  <span>TOTAL AKTIVA (ASSETS)</span>
                  <span className="opacity-0 group-hover:opacity-100 text-[10px] font-bold text-blue-700 bg-white px-1.5 py-0.5 rounded">
                    Rincian
                  </span>
                </div>
                <span className="text-sm font-black">{formatCurrency(totalAssets)}</span>
              </div>
            </div>

            {/* SISI KANAN: PASIVA (KEWAJIBAN & MODAL) */}
            <div className="space-y-6">
              
              {/* KEWAJIBAN (UTANG) */}
              <div className="space-y-3">
                <div className="flex justify-between border-b border-slate-950 pb-1.5 text-slate-900 font-bold uppercase tracking-wider text-xs">
                  <span>KEWAJIBAN (UTANG / LIABILITIES)</span>
                  <span>Saldo</span>
                </div>
                
                <div className="space-y-1">
                  {liabilityAccounts.map(acc => (
                    <div 
                      key={acc.id} 
                      onClick={() => handleOpenAccountAudit(acc)}
                      className="group flex justify-between items-center px-3 py-1.5 rounded-lg font-semibold text-slate-700 hover:bg-purple-50/70 hover:text-purple-900 cursor-pointer transition border border-transparent hover:border-purple-200"
                      title="Klik untuk melihat rumus & riwayat PO / utang"
                    >
                      <div className="flex items-center gap-2">
                        <span>[{acc.code}] {acc.name}</span>
                        <span className="opacity-0 group-hover:opacity-100 text-[10px] font-extrabold text-purple-700 bg-purple-100 px-1.5 py-0.5 rounded transition flex items-center gap-0.5">
                          <Search className="w-2.5 h-2.5" /> Audit
                        </span>
                      </div>
                      <span className="font-bold text-slate-900">{formatCurrency(acc.balance)}</span>
                    </div>
                  ))}
                </div>

                <div 
                  onClick={() => handleOpenSummaryAudit(
                    "total_liabilities",
                    "Total Kewajiban (Utang)",
                    totalLiabilities,
                    "liability",
                    {
                      title: "Total Kewajiban (Hutang Usaha & Utang Pajak)",
                      plainMeaning: "Seluruh kewajiban finansial yang masih harus Anda bayarkan kepada pihak luar (vendor supplier barang atau dinas pajak).",
                      mathFormula: "Total Kewajiban = Hutang Usaha (PO Tempo) + Utang Pajak PPN",
                      sourceMenus: [
                        {
                          menuName: "Menu Pembelian (/purchase)",
                          actionTrigger: "Utang dagang timbul saat PO berstatus 'Diterima' dan berkurang saat dilunasi.",
                          route: "/purchase",
                          badgeColor: "bg-purple-100 text-purple-700"
                        }
                      ],
                      howToChange: [
                        "Untuk melunasi: Bayar PO vendor di menu /purchase melalui tombol 'Catat Pembayaran'."
                      ]
                    },
                    liabilityAccounts.map(a => ({ code: a.code, name: a.name, balance: a.balance }))
                  )}
                  className="group flex justify-between items-center border-t border-slate-300 pt-1.5 px-3 py-1 font-bold text-slate-900 hover:bg-slate-50 cursor-pointer rounded-lg transition"
                >
                  <span className="uppercase">Total Kewajiban</span>
                  <span className="text-purple-700 font-extrabold">{formatCurrency(totalLiabilities)}</span>
                </div>
              </div>

              {/* EKUITAS (MODAL) */}
              <div className="space-y-3">
                <div className="flex justify-between border-b border-slate-950 pb-1.5 text-slate-900 font-bold uppercase tracking-wider text-xs">
                  <span>EKUITAS (MODAL SENDIRI / EQUITY)</span>
                  <span>Saldo</span>
                </div>
                
                <div className="space-y-1">
                  {equityAccounts.map(acc => (
                    <div 
                      key={acc.id} 
                      onClick={() => handleOpenAccountAudit(acc)}
                      className="group flex justify-between items-center px-3 py-1.5 rounded-lg font-semibold text-slate-700 hover:bg-blue-50/70 hover:text-blue-900 cursor-pointer transition border border-transparent hover:border-blue-200"
                      title="Klik untuk melihat detail modal"
                    >
                      <div className="flex items-center gap-2">
                        <span>[{acc.code}] {acc.name}</span>
                        <span className="opacity-0 group-hover:opacity-100 text-[10px] font-extrabold text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded transition flex items-center gap-0.5">
                          <Search className="w-2.5 h-2.5" /> Audit
                        </span>
                      </div>
                      <span className="font-bold text-slate-900">{formatCurrency(acc.balance)}</span>
                    </div>
                  ))}

                  {/* LABA TAHUN BERJALAN JEMBATAN DARI LABA RUGI */}
                  <div 
                    onClick={() => handleOpenSummaryAudit(
                      "net_income_equity",
                      "Laba Tahun Berjalan (Net Income)",
                      netIncome,
                      "equity",
                      {
                        title: "Laba Tahun Berjalan (Jembatan dari Laba Rugi)",
                        plainMeaning: "Keuntungan bersih yang dicetak usaha Anda pada periode berjalan. Nilai ini DIIMPOR LANGSUNG dari Laporan Laba Rugi ke dalam Neraca untuk menambah Modal Pemilik.",
                        mathFormula: `Laba Tahun Berjalan = Pendapatan Bersih - HPP - Beban = ${formatCurrency(netIncome)}`,
                        sourceMenus: [
                          {
                            menuName: "Laporan Laba Rugi (P&L)",
                            actionTrigger: "Secara otomatis disinkronkan ke Neraca Keuangan.",
                            route: "/reports/financial",
                            badgeColor: "bg-blue-100 text-blue-700"
                          }
                        ],
                        howToChange: [
                          "Nilai ini berubah otomatis setiap kali ada transaksi penjualan, HPP, atau pengeluaran biaya baru."
                        ]
                      }
                    )}
                    className="group flex justify-between items-center px-3 py-2 font-bold text-blue-700 bg-blue-50/70 hover:bg-blue-100/80 rounded-lg border border-dashed border-blue-300 cursor-pointer transition"
                    title="Klik untuk melihat penjelasan jembatan Laba Rugi ke Ekuitas"
                  >
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                      <span>Laba Tahun Berjalan (Net Income)</span>
                      <span className="text-[9px] bg-blue-600 text-white font-extrabold px-1.5 py-0.5 rounded">
                        Otomatis
                      </span>
                    </div>
                    <span className="font-extrabold">{formatCurrency(netIncome)}</span>
                  </div>
                </div>

                <div 
                  onClick={() => handleOpenSummaryAudit(
                    "total_equity",
                    "Total Ekuitas",
                    totalEquity,
                    "equity",
                    {
                      title: "Total Ekuitas (Modal Sendiri)",
                      plainMeaning: "Total hak kekayaan bersih milik pemilik usaha setelah seluruh aset dikurangi total kewajiban utang.",
                      mathFormula: `Total Ekuitas = Modal Pemilik + Laba Ditahan + Laba Tahun Berjalan (${formatCurrency(netIncome)}) = ${formatCurrency(totalEquity)}`,
                      sourceMenus: [
                        {
                          menuName: "Buku Besar & Laba Rugi",
                          actionTrigger: "Kombinasi modal disetor dan akumulasi keuntungan.",
                          route: "/ledger",
                          badgeColor: "bg-emerald-100 text-emerald-700"
                        }
                      ],
                      howToChange: [
                        "Ekuitas bertambah saat bisnis mencetak laba bersih atau saat pemilik menyetor modal tambahan."
                      ]
                    },
                    [
                      ...equityAccounts.map(a => ({ code: a.code, name: a.name, balance: a.balance })),
                      { code: "NET", name: "Laba Tahun Berjalan", balance: netIncome }
                    ]
                  )}
                  className="group flex justify-between items-center border-t border-slate-300 pt-1.5 px-3 py-1 font-bold text-slate-900 hover:bg-slate-50 cursor-pointer rounded-lg transition"
                >
                  <span className="uppercase">Total Ekuitas</span>
                  <span className="text-blue-700 font-extrabold">{formatCurrency(totalEquity)}</span>
                </div>
              </div>

              {/* TOTAL PASIVA */}
              <div 
                onClick={() => handleOpenSummaryAudit(
                  "total_pasiva",
                  "TOTAL PASIVA (UTANG + MODAL)",
                  totalLiabilities + totalEquity,
                  "summary",
                  {
                    title: "TOTAL PASIVA (Kewajiban + Ekuitas)",
                    plainMeaning: "Total sumber pendanaan bisnis Anda: Berapa yang dibiayai dari utang pihak luar (Kewajiban) dan berapa yang dibiayai dari modal sendiri/laba usaha (Ekuitas).",
                    mathFormula: `Total Pasiva = Total Kewajiban (${formatCurrency(totalLiabilities)}) + Total Ekuitas (${formatCurrency(totalEquity)}) = ${formatCurrency(totalLiabilities + totalEquity)}`,
                    sourceMenus: [
                      {
                        menuName: "Prinsip Neraca Seimbang",
                        actionTrigger: "Nilai Total Pasiva ini harus selalu SAMA PERSIS dengan Total Aktiva.",
                        route: "/reports/financial",
                        badgeColor: "bg-emerald-100 text-emerald-700"
                      }
                    ],
                    howToChange: [
                      "Dipengaruhi secara otomatis oleh seluruh transaksi utang dan modal."
                    ]
                  }
                )}
                className="group flex justify-between items-center border-t border-slate-950 pt-2 font-extrabold text-emerald-700 text-xs bg-emerald-50/50 hover:bg-emerald-100/70 p-3 rounded-lg border border-emerald-200 cursor-pointer transition"
                title="Klik untuk rincian Total Pasiva"
              >
                <div className="flex items-center gap-2 uppercase">
                  <span>TOTAL PASIVA (UTANG + MODAL)</span>
                  <span className="opacity-0 group-hover:opacity-100 text-[10px] font-bold text-emerald-700 bg-white px-1.5 py-0.5 rounded">
                    Rincian
                  </span>
                </div>
                <span className="text-sm font-black">{formatCurrency(totalLiabilities + totalEquity)}</span>
              </div>
            </div>

          </div>

          {/* Keseimbangan Neraca Status */}
          {!isBalanced ? (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs p-4 rounded-xl flex items-start gap-3 no-print shadow-xs">
              <AlertCircle className="w-5 h-5 shrink-0 text-rose-600 mt-0.5" />
              <div>
                <h5 className="font-bold text-rose-900">Neraca Belum Seimbang (Selisih Rp {formatCurrency(balanceDifference)})</h5>
                <p className="text-[11px] text-rose-600 mt-0.5 leading-relaxed">
                  Total Aktiva ({formatCurrency(totalAssets)}) berbeda dengan Total Pasiva ({formatCurrency(totalLiabilities + totalEquity)}).
                  Hal ini biasanya terjadi jika ada Jurnal Penyesuaian Manual di Buku Besar yang jumlah debit dan kreditnya tidak sama, atau ada transaksi persediaan lama yang belum memiliki entri tandingan.
                </p>
                <Link 
                  href="/ledger"
                  className="inline-flex items-center gap-1 font-bold text-rose-800 underline text-[11px] mt-2 hover:text-rose-950"
                >
                  Periksa Buku Besar & Audit Jurnal Yatim (/ledger) <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          ) : (
            <div className="bg-emerald-50/80 border border-emerald-200 text-emerald-800 text-xs p-3 rounded-xl flex items-center justify-between no-print shadow-xs">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-bold text-emerald-950">Neraca Keuangan Seimbang Sempurna (Balanced):</span>
                <span>Aktiva ({formatCurrency(totalAssets)}) = Pasiva ({formatCurrency(totalLiabilities + totalEquity)})</span>
              </div>
              <span className="text-[10px] font-extrabold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-200">
                100% Akurat
              </span>
            </div>
          )}

        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. MODAL / DRAWER AUDIT DRILL-DOWN (KLIK PADA SETIAP POIN LAPORAN)       */}
      {/* ========================================================================= */}
      {(selectedAuditAccount || selectedAuditMetric) && (() => {
        const isAccount = !!selectedAuditAccount;
        const account = selectedAuditAccount;
        const metric = selectedAuditMetric;
        
        const title = isAccount ? `[${account!.code}] ${account!.name}` : metric!.name;
        const balance = isAccount ? calculateBalance(account!) : metric!.balance;
        const knowledge = isAccount ? getAccountKnowledge(account!) : metric!.knowledge;

        // Tentukan tipe akun untuk interpretasi debit/kredit yang akurat non-finance
        const rawType = isAccount 
          ? account!.type 
          : (metric?.category === "income" ? "income" : metric?.category === "expense" || metric?.category === "cogs" ? "expense" : metric?.category === "liability" ? "liability" : metric?.category === "equity" ? "equity" : "asset");
        const rawCode = isAccount ? account!.code : "";
        const flow = getAccountFlowInterpretation(rawType, rawCode);

        // Extract and sort journal items for account
        const journalItems = isAccount
          ? (account!.journal_items || []).map(item => {
              const entry = Array.isArray(item.journal_entries) 
                ? item.journal_entries[0] 
                : item.journal_entries;
              return {
                id: item.id || Math.random().toString(),
                entryDate: entry?.entry_date || "-",
                description: entry?.description || "Transaksi Jurnal",
                referenceSource: entry?.reference_source || null,
                referenceId: entry?.reference_id || null,
                debit: Number(item.debit || 0),
                credit: Number(item.credit || 0)
              };
            }).sort((a, b) => new Date(b.entryDate).getTime() - new Date(a.entryDate).getTime())
          : [];

        const filteredLogs = journalItems.filter(log => {
          if (!logSearchQuery) return true;
          const q = logSearchQuery.toLowerCase();
          return (
            log.description.toLowerCase().includes(q) ||
            log.entryDate.toLowerCase().includes(q) ||
            (log.referenceSource && log.referenceSource.toLowerCase().includes(q))
          );
        });

        const totalDebit = journalItems.reduce((s, i) => s + i.debit, 0);
        const totalCredit = journalItems.reduce((s, i) => s + i.credit, 0);

        return (
          <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 animate-in fade-in duration-150">
            <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
              
              {/* Header Modal */}
              <div className="p-5 border-b border-slate-100 flex items-start justify-between bg-slate-50/70">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="bg-blue-600 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">
                      Audit Trace &amp; Rumus
                    </span>
                    {isAccount && (
                      <span className="text-xs font-bold text-slate-500 uppercase">
                        Tipe: {account!.type}
                      </span>
                    )}
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    {title}
                  </h3>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-slate-500 font-medium">Saldo dalam Laporan:</span>
                    <span className="font-extrabold text-blue-600 text-sm">{formatCurrency(balance)}</span>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setSelectedAuditAccount(null);
                    setSelectedAuditMetric(null);
                  }}
                  className="w-8 h-8 rounded-full bg-white border border-slate-200 hover:bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-800 transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Tab Navigation inside Modal */}
              <div className="flex border-b border-slate-200 px-5 pt-2 bg-white gap-3 text-xs font-bold">
                <button
                  onClick={() => setAuditTab("guide")}
                  className={`pb-3 border-b-2 transition flex items-center gap-1.5 ${
                    auditTab === "guide"
                      ? "border-blue-600 text-blue-600 font-extrabold"
                      : "border-transparent text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <HelpCircle className="w-4 h-4" /> Rumus &amp; Panduan Non-Finance
                </button>
                <button
                  onClick={() => setAuditTab("logs")}
                  className={`pb-3 border-b-2 transition flex items-center gap-1.5 ${
                    auditTab === "logs"
                      ? "border-blue-600 text-blue-600 font-extrabold"
                      : "border-transparent text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <FileText className="w-4 h-4" /> 
                  {isAccount 
                    ? `Log Riil Transaksi (${journalItems.length})` 
                    : `Komponen Akun Pembentuk (${metric?.subAccounts?.length || 0})`}
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-5 overflow-y-auto space-y-6 flex-1 text-xs">
                
                {auditTab === "guide" ? (
                  <div className="space-y-5">
                    
                    {/* 1. Arti Sederhana */}
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-1.5">
                      <h4 className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
                        <Info className="w-4 h-4 text-blue-600" /> Arti Sederhana (Bahasa Sehari-hari)
                      </h4>
                      <p className="text-slate-700 leading-relaxed font-medium">
                        {knowledge.plainMeaning}
                      </p>
                    </div>

                    {/* 2. Rumus Matematika */}
                    <div className="bg-blue-50/70 p-4 rounded-2xl border border-blue-200 space-y-2">
                      <h4 className="font-bold text-blue-950 flex items-center gap-1.5 text-xs">
                        <Sparkles className="w-4 h-4 text-blue-600" /> Rumus Matematis Perhitungan
                      </h4>
                      <div className="bg-white p-3 rounded-xl border border-blue-200/80 font-mono text-xs font-bold text-blue-900 shadow-xs">
                        {knowledge.mathFormula}
                      </div>
                      
                      {/* Debit Credit Summary jika akun riil */}
                      {isAccount && (
                        <div className="space-y-2 pt-1">
                          <div className="grid grid-cols-3 gap-2 text-center font-bold">
                            <div className={`${flow.debitCardBg} p-2.5 rounded-xl border text-left`}>
                              <span className={`text-[10px] ${flow.debitCardTitle} uppercase font-black flex items-center gap-1`}>
                                <span className={`w-4 h-4 rounded-full ${flow.debitCardBadge} flex items-center justify-center text-[10px] font-black shrink-0`}>
                                  {flow.debitSign}
                                </span>
                                Total Debit
                              </span>
                              <span className={`${flow.debitCardValue} font-extrabold text-xs sm:text-sm block mt-1`}>
                                {flow.debitSign}{formatCurrency(totalDebit)}
                              </span>
                              <span className={`text-[9px] ${flow.debitCardTitle} font-bold block mt-0.5`}>
                                {flow.debitCardStatus}
                              </span>
                            </div>

                            <div className={`${flow.creditCardBg} p-2.5 rounded-xl border text-left`}>
                              <span className={`text-[10px] ${flow.creditCardTitle} uppercase font-black flex items-center gap-1`}>
                                <span className={`w-4 h-4 rounded-full ${flow.creditCardBadge} flex items-center justify-center text-[10px] font-black shrink-0`}>
                                  {flow.creditSign}
                                </span>
                                Total Kredit
                              </span>
                              <span className={`${flow.creditCardValue} font-extrabold text-xs sm:text-sm block mt-1`}>
                                {flow.creditSign}{formatCurrency(totalCredit)}
                              </span>
                              <span className={`text-[9px] ${flow.creditCardTitle} font-bold block mt-0.5`}>
                                {flow.creditCardStatus}
                              </span>
                            </div>

                            <div className="bg-blue-600 text-white p-2.5 rounded-xl shadow-xs flex flex-col justify-center text-left">
                              <span className="text-[10px] text-blue-100 uppercase font-black block">
                                Saldo Akhir
                              </span>
                              <span className="font-black text-xs sm:text-sm block mt-1">
                                {formatCurrency(balance)}
                              </span>
                              <span className="text-[9px] text-blue-200 font-bold block mt-0.5">
                                {flow.balanceLabel}
                              </span>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-[10px] font-bold text-slate-600 bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
                            <span className="text-slate-400 font-extrabold">Panduan Akun Ini:</span>
                            <span className="text-slate-800 flex items-center gap-1 font-extrabold">
                              {flow.quickGuideCredit}
                            </span>
                            <span className="text-slate-800 flex items-center gap-1 font-extrabold">
                              {flow.quickGuideDebit}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* 3. Dari Menu Mana Datanya */}
                    <div className="space-y-2">
                      <h4 className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
                        <Layers className="w-4 h-4 text-indigo-600" /> Dari Menu Mana Datanya Terbentuk di Aplikasi?
                      </h4>
                      <div className="space-y-2">
                        {knowledge.sourceMenus.map((src, i) => (
                          <div key={i} className="p-3 bg-white border border-slate-200 rounded-xl flex items-start justify-between gap-3 shadow-xs">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md ${src.badgeColor}`}>
                                  {src.menuName}
                                </span>
                              </div>
                              <p className="text-slate-600 leading-relaxed font-medium">
                                {src.actionTrigger}
                              </p>
                            </div>
                            <Link
                              href={src.route}
                              className="shrink-0 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold px-2.5 py-1.5 rounded-lg text-[11px] flex items-center gap-1 border border-slate-200 transition"
                            >
                              Buka Menu <ArrowRight className="w-3 h-3" />
                            </Link>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* 4. Kalau Mau Ubah Angka Ini Harus Ngapain */}
                    <div className="bg-amber-50/70 p-4 rounded-2xl border border-amber-200 space-y-2">
                      <h4 className="font-bold text-amber-950 flex items-center gap-1.5 text-xs">
                        <ChevronRight className="w-4 h-4 text-amber-600" /> Kalau Mau Mengubah / Memperbaiki Angka Ini, Harus Ngapain?
                      </h4>
                      <ul className="space-y-1.5 text-slate-700">
                        {knowledge.howToChange.map((step, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="w-4 h-4 rounded-full bg-amber-200 text-amber-900 font-bold flex items-center justify-center shrink-0 text-[10px] mt-0.5">
                              {idx + 1}
                            </span>
                            <span className="font-medium leading-relaxed">{step}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* 5. Kemana Pindahnya Jika Berubah */}
                    {knowledge.whereDoesItGo && (
                      <div className="bg-emerald-50/70 p-4 rounded-2xl border border-emerald-200 space-y-1">
                        <h4 className="font-bold text-emerald-950 flex items-center gap-1.5 text-xs">
                          <ArrowRight className="w-4 h-4 text-emerald-600" /> Ke Mana Nilainya Berpindah Jika Lunas / Berubah?
                        </h4>
                        <p className="text-slate-700 font-medium leading-relaxed">
                          {knowledge.whereDoesItGo}
                        </p>
                      </div>
                    )}

                  </div>
                ) : (
                  
                  /* TAB 2: LOG TRANSAKSI ATAU SUB-AKUN */
                  <div className="space-y-4">
                    {isAccount ? (
                      <>
                        {/* Search & Meta */}
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
                          <div className="relative w-full sm:w-64">
                            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                            <input
                              type="text"
                              value={logSearchQuery}
                              onChange={(e) => setLogSearchQuery(e.target.value)}
                              placeholder="Cari deskripsi / no. transaksi..."
                              className="w-full bg-slate-50 border border-slate-200 pl-8 pr-3 py-1.5 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
                            />
                          </div>
                          <span className="text-[11px] text-slate-500 font-medium self-end sm:self-center">
                            Menampilkan {filteredLogs.length} dari {journalItems.length} transaksi
                          </span>
                        </div>

                        {/* Tabel Log */}
                        {filteredLogs.length === 0 ? (
                          <div className="text-center py-12 bg-slate-50 border border-dashed border-slate-200 rounded-2xl text-slate-400 font-medium">
                            Tidak ada transaksi buku besar untuk akun ini pada periode yang dipilih.
                          </div>
                        ) : (
                          <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                            <div className="max-h-[350px] overflow-y-auto">
                              <table className="w-full text-left text-[11px]">
                                <thead className="bg-slate-100/90 sticky top-0 text-slate-700 font-bold border-b border-slate-200">
                                  <tr>
                                    <th className="py-2.5 px-3">Tanggal</th>
                                    <th className="py-2.5 px-3">Sumber Menu</th>
                                    <th className="py-2.5 px-3">Deskripsi / Catatan</th>
                                    <th className="py-2.5 px-3 text-right">
                                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] font-black ${flow.debitHeaderBadge}`}>
                                        <flow.debitIcon className="w-2.5 h-2.5 stroke-[3]" /> {flow.debitLabel}
                                      </span>
                                    </th>
                                    <th className="py-2.5 px-3 text-right">
                                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] font-black ${flow.creditHeaderBadge}`}>
                                        <flow.creditIcon className="w-2.5 h-2.5 stroke-[3]" /> {flow.creditLabel}
                                      </span>
                                    </th>
                                    <th className="py-2.5 px-3 text-center">Aksi</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                  {filteredLogs.map((log) => {
                                    const badge = getSourceBadge(log.referenceSource);
                                    const docUrl = getDocumentRoute(log.referenceSource, log.referenceId);
                                    return (
                                      <tr key={log.id} className="hover:bg-blue-50/40 transition">
                                        <td className="py-2 px-3 font-semibold text-slate-600 whitespace-nowrap">
                                          {log.entryDate}
                                        </td>
                                        <td className="py-2 px-3 whitespace-nowrap">
                                          <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded border ${badge.color}`}>
                                            {badge.label}
                                          </span>
                                        </td>
                                        <td className="py-2 px-3 font-medium text-slate-800">
                                          {log.description}
                                        </td>
                                        <td className="py-2 px-3 text-right whitespace-nowrap">
                                          {log.debit > 0 ? (
                                            <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded font-black border ${flow.debitBadge}`}>
                                              <flow.debitIcon className="w-2.5 h-2.5 stroke-[3]" />
                                              {formatCurrency(log.debit)}
                                            </span>
                                          ) : (
                                            <span className="text-slate-300">-</span>
                                          )}
                                        </td>
                                        <td className="py-2 px-3 text-right whitespace-nowrap">
                                          {log.credit > 0 ? (
                                            <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded font-black border ${flow.creditBadge}`}>
                                              <flow.creditIcon className="w-2.5 h-2.5 stroke-[3]" />
                                              {formatCurrency(log.credit)}
                                            </span>
                                          ) : (
                                            <span className="text-slate-300">-</span>
                                          )}
                                        </td>
                                        <td className="py-2 px-3 text-center whitespace-nowrap">
                                          <Link
                                            href={docUrl}
                                            className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded transition"
                                            title="Buka dokumen sumber transaksi"
                                          >
                                            Dokumen <ArrowUpRight className="w-3 h-3" />
                                          </Link>
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      
                      /* Sub-accounts breakdown untuk summary metric */
                      <div className="space-y-3">
                        <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                              <tr>
                                <th className="py-2.5 px-4">Kode Akun</th>
                                <th className="py-2.5 px-4">Nama Akun</th>
                                <th className="py-2.5 px-4 text-right">Saldo</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {(metric?.subAccounts || []).map((sub, i) => (
                                <tr key={i} className="hover:bg-slate-50">
                                  <td className="py-2.5 px-4 font-mono font-bold text-slate-700">[{sub.code}]</td>
                                  <td className="py-2.5 px-4 font-semibold text-slate-800">{sub.name}</td>
                                  <td className="py-2.5 px-4 text-right font-extrabold text-blue-600">{formatCurrency(sub.balance)}</td>
                                </tr>
                              ))}
                              <tr className="bg-slate-50 font-black text-slate-900 border-t-2 border-slate-200">
                                <td colSpan={2} className="py-3 px-4 uppercase tracking-wider">Total Terakumulasi</td>
                                <td className="py-3 px-4 text-right text-blue-700 text-sm">{formatCurrency(metric?.balance || 0)}</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                )}

              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
                <Link
                  href="/ledger"
                  className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
                >
                  Buka Buku Besar Lengkap (/ledger) <ArrowRight className="w-3.5 h-3.5" />
                </Link>
                <button
                  onClick={() => {
                    setSelectedAuditAccount(null);
                    setSelectedAuditMetric(null);
                  }}
                  className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-4 py-2 rounded-xl text-xs shadow-xs transition"
                >
                  Tutup
                </button>
              </div>

            </div>
          </div>
        );
      })()}

      {/* ========================================================================= */}
      {/* 4. MODAL PETA ALUR KEUANGAN VISUAL (UNTUK NON-FINANCE)                   */}
      {/* ========================================================================= */}
      {showFlowModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
            
            {/* Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5" />
                  <h3 className="text-lg font-bold">Bagan Alur Transaksi ke Laporan Keuangan</h3>
                  <span className="bg-white/20 text-white text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                    Format Bagan
                  </span>
                </div>
                <p className="text-xs text-blue-100">
                  Diagram visual non-teoritis: Bagaimana setiap klik menu di aplikasi ini menghasilkan angka di Laba Rugi dan Neraca.
                </p>
              </div>
              <button
                onClick={() => setShowFlowModal(false)}
                className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Bagan Tab Switcher */}
            <div className="flex bg-slate-100 p-1.5 border-b border-slate-200 overflow-x-auto gap-1 text-xs font-bold shrink-0">
              <button
                onClick={() => setBaganTab("terpadu")}
                className={`px-3.5 py-2 rounded-xl transition whitespace-nowrap flex items-center gap-1.5 ${
                  baganTab === "terpadu"
                    ? "bg-white text-blue-700 shadow-xs font-extrabold"
                    : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
                }`}
              >
                <Layers className="w-4 h-4" /> Bagan Terpadu (Semua Menu)
              </button>
              <button
                onClick={() => setBaganTab("po")}
                className={`px-3.5 py-2 rounded-xl transition whitespace-nowrap flex items-center gap-1.5 ${
                  baganTab === "po"
                    ? "bg-white text-purple-700 shadow-xs font-extrabold"
                    : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
                }`}
              >
                <Truck className="w-4 h-4" /> 1. Bagan Pembelian (PO &amp; Utang)
              </button>
              <button
                onClick={() => setBaganTab("invoice")}
                className={`px-3.5 py-2 rounded-xl transition whitespace-nowrap flex items-center gap-1.5 ${
                  baganTab === "invoice"
                    ? "bg-white text-blue-700 shadow-xs font-extrabold"
                    : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
                }`}
              >
                <CreditCard className="w-4 h-4" /> 2. Bagan Penjualan (Invoice &amp; Piutang)
              </button>
              <button
                onClick={() => setBaganTab("expense")}
                className={`px-3.5 py-2 rounded-xl transition whitespace-nowrap flex items-center gap-1.5 ${
                  baganTab === "expense"
                    ? "bg-white text-amber-700 shadow-xs font-extrabold"
                    : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
                }`}
              >
                <Wallet className="w-4 h-4" /> 3. Bagan Biaya (Expenses)
              </button>
              <button
                onClick={() => setBaganTab("neraca")}
                className={`px-3.5 py-2 rounded-xl transition whitespace-nowrap flex items-center gap-1.5 ${
                  baganTab === "neraca"
                    ? "bg-white text-emerald-700 shadow-xs font-extrabold"
                    : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
                }`}
              >
                <Scale className="w-4 h-4" /> 4. Bagan Laba Rugi → Neraca
              </button>
            </div>

            {/* Bagan Content Canvas */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1 text-xs bg-slate-50/50">
              
              {/* ================================================================= */}
              {/* BAGAN 1: TERPADU (ALL-IN-ONE MASTER FLOWCHART)                   */}
              {/* ================================================================= */}
              {baganTab === "terpadu" && (
                <div className="space-y-6">
                  <div className="bg-blue-50 border border-blue-200 p-3.5 rounded-2xl flex items-center justify-between text-blue-900">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
                      <span className="font-extrabold">Bagan Terpadu: Alur Dari Menu Aplikasi Menuju Laba Rugi dan Neraca</span>
                    </div>
                    <span className="text-[10px] font-bold bg-blue-200 text-blue-800 px-2 py-0.5 rounded-full">
                      Peta Lengkap
                    </span>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-stretch">
                    
                    {/* KOLOM A: MENU OPERASIONAL BISNIS */}
                    <div className="bg-white p-4 rounded-2xl border-2 border-slate-200 shadow-xs space-y-3 flex flex-col justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between border-b pb-2">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">TAHAP 1: MENU INPUT</span>
                          <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping"></span>
                        </div>
                        <h4 className="font-bold text-slate-900 text-sm">Aktivitas Harian Bisnis</h4>
                        <p className="text-slate-500 text-[11px]">Menu-menu tempat Anda dan tim bekerja sehari-hari:</p>
                      </div>

                      <div className="space-y-2.5 my-2">
                        <div className="p-2.5 rounded-xl border border-purple-200 bg-purple-50/50 flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-purple-600 text-white flex items-center justify-center shrink-0">
                            <Truck className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="font-bold text-purple-950 text-xs">Menu Pembelian (/purchase)</div>
                            <div className="text-[10px] text-purple-700">Buat PO ke Vendor &amp; Terima Barang</div>
                          </div>
                        </div>

                        <div className="p-2.5 rounded-xl border border-blue-200 bg-blue-50/50 flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0">
                            <FileText className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="font-bold text-blue-950 text-xs">Menu Penjualan (/invoice) &amp; POS</div>
                            <div className="text-[10px] text-blue-700">Terbitkan Faktur &amp; Jual Barang</div>
                          </div>
                        </div>

                        <div className="p-2.5 rounded-xl border border-amber-200 bg-amber-50/50 flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-amber-600 text-white flex items-center justify-center shrink-0">
                            <Wallet className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="font-bold text-amber-950 text-xs">Menu Pengeluaran (/expenses)</div>
                            <div className="text-[10px] text-amber-700">Catat Listrik, Sewa, Gaji, ATK</div>
                          </div>
                        </div>

                        <div className="p-2.5 rounded-xl border border-emerald-200 bg-emerald-50/50 flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
                            <CreditCard className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="font-bold text-emerald-950 text-xs">Menu Pembayaran (/payment)</div>
                            <div className="text-[10px] text-emerald-700">Terima Pelunasan dari Pelanggan</div>
                          </div>
                        </div>
                      </div>

                      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-center font-bold text-slate-600 text-[11px] flex items-center justify-center gap-1.5">
                        <span>Otomatis Menghasilkan Jurnal</span>
                        <ArrowRight className="w-3.5 h-3.5 text-blue-600" />
                      </div>
                    </div>

                    {/* KOLOM B: LAPORAN LABA RUGI */}
                    <div className="bg-white p-4 rounded-2xl border-2 border-blue-200 shadow-xs space-y-3 flex flex-col justify-between" style={{ borderTop: "6px solid #2563EB" }}>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between border-b pb-2">
                          <span className="text-[10px] font-black text-blue-600 uppercase tracking-wider">TAHAP 2: LABA RUGI</span>
                          <span className="text-[10px] font-extrabold bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded">Performa</span>
                        </div>
                        <h4 className="font-bold text-slate-900 text-sm">Laporan Laba Rugi</h4>
                        <p className="text-slate-500 text-[11px]">Mengukur untung-rugi usaha dari selisih penjualan dan beban:</p>
                      </div>

                      <div className="space-y-2 my-2 font-mono text-[11px]">
                        <div className="bg-emerald-50 p-2.5 rounded-xl border border-emerald-200">
                          <div className="text-[10px] text-emerald-800 font-extrabold uppercase">Pendapatan Penjualan [4101]</div>
                          <div className="text-emerald-700 font-black text-xs">Total Omset Bersih</div>
                        </div>

                        <div className="flex items-center justify-center text-slate-400 font-black">
                          <ArrowDown className="w-3.5 h-3.5 text-slate-400" /> Dikurangi (-)
                        </div>

                        <div className="bg-rose-50 p-2.5 rounded-xl border border-rose-200">
                          <div className="text-[10px] text-rose-800 font-extrabold uppercase">Harga Pokok Penjualan [5101]</div>
                          <div className="text-rose-700 font-black text-xs">Modal Kulakan Barang Terjual</div>
                        </div>

                        <div className="flex items-center justify-center text-slate-400 font-black">
                          <ArrowDown className="w-3.5 h-3.5 text-slate-400" /> Sama Dengan (=)
                        </div>

                        <div className="bg-slate-100 p-2.5 rounded-xl border border-slate-200 font-sans">
                          <div className="text-[10px] text-slate-600 font-bold uppercase">Laba Kotor (Gross Profit)</div>
                          <div className="text-slate-900 font-black text-xs">Omset - Modal Barang</div>
                        </div>

                        <div className="flex items-center justify-center text-slate-400 font-black">
                          <ArrowDown className="w-3.5 h-3.5 text-slate-400" /> Dikurangi (-)
                        </div>

                        <div className="bg-amber-50 p-2.5 rounded-xl border border-amber-200">
                          <div className="text-[10px] text-amber-800 font-extrabold uppercase">Beban Operasional [5xxx]</div>
                          <div className="text-amber-700 font-black text-xs">Gaji, Listrik, Sewa Kantor</div>
                        </div>
                      </div>

                      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-3 rounded-xl shadow-xs text-center space-y-0.5">
                        <div className="text-[9px] uppercase tracking-wider font-extrabold text-blue-200">HASIL AKHIR LABA RUGI:</div>
                        <div className="font-black text-sm">Laba Bersih Tahun Berjalan</div>
                        <div className="text-[10px] text-blue-100">Mengalir otomatis ke Neraca Ekuitas ➔</div>
                      </div>
                    </div>

                    {/* KOLOM C: LAPORAN NERACA KEUANGAN */}
                    <div className="bg-white p-4 rounded-2xl border-2 border-emerald-200 shadow-xs space-y-3 flex flex-col justify-between" style={{ borderTop: "6px solid #10B981" }}>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between border-b pb-2">
                          <span className="text-[10px] font-black text-emerald-600 uppercase tracking-wider">TAHAP 3: NERACA</span>
                          <span className="text-[10px] font-extrabold bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded">Posisi Harta</span>
                        </div>
                        <h4 className="font-bold text-slate-900 text-sm">Neraca Keuangan</h4>
                        <p className="text-slate-500 text-[11px]">Posisi kekayaan usaha harus sama persis dengan utang + modal:</p>
                      </div>

                      <div className="space-y-2.5 my-2">
                        {/* AKTIVA */}
                        <div className="bg-blue-50/70 p-3 rounded-xl border border-blue-200 space-y-1">
                          <span className="text-[10px] font-black text-blue-800 uppercase block tracking-wider">SISI KIRI: AKTIVA (ASET / HARTA)</span>
                          <div className="text-slate-700 text-xs font-semibold space-y-0.5">
                            <div>• [1101] Kas &amp; Saldo Rekening Bank</div>
                            <div>• [1102] Persediaan Barang di Gudang</div>
                            <div>• [1103] Piutang Tagihan ke Customer</div>
                            <div>• [1201] Aset Tetap &amp; Peralatan</div>
                          </div>
                        </div>

                        <div className="flex items-center justify-center font-black text-emerald-600 text-xs">
                          ⚖️ HARUS SEIMBANG SAMA PERSIS (=)
                        </div>

                        {/* PASIVA */}
                        <div className="bg-purple-50/70 p-3 rounded-xl border border-purple-200 space-y-1">
                          <span className="text-[10px] font-black text-purple-800 uppercase block tracking-wider">SISI KANAN: PASIVA (UTANG + MODAL)</span>
                          <div className="text-slate-700 text-xs font-semibold space-y-0.5">
                            <div className="text-purple-900">• [2101] Hutang Usaha ke Vendor (PO Tempo)</div>
                            <div className="text-purple-900">• [2102] Utang Pajak PPN</div>
                            <div className="text-blue-900">• [3101] Modal Pemilik</div>
                            <div className="text-emerald-700 font-bold bg-emerald-100/70 p-1 rounded">
                              • 🌟 Laba Bersih (Masuk dari Laba Rugi)
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="bg-emerald-50 border border-emerald-300 p-2.5 rounded-xl text-center font-bold text-emerald-800 text-[11px]">
                        Prinsip Neraca: Aktiva (Harta) = Kewajiban + Ekuitas
                      </div>
                    </div>

                  </div>
                </div>
              )}

              {/* ================================================================= */}
              {/* BAGAN 2: SIKLUS PEMBELIAN (PO & UTANG DAGANG)                     */}
              {/* ================================================================= */}
              {baganTab === "po" && (
                <div className="space-y-6">
                  <div className="bg-purple-50 border border-purple-200 p-3.5 rounded-2xl flex items-center justify-between text-purple-900">
                    <div className="flex items-center gap-2">
                      <Truck className="w-4 h-4 text-purple-600 shrink-0" />
                      <span className="font-extrabold">Bagan Siklus Pembelian: PO Tempo → Utang Dagang → Pelunasan</span>
                    </div>
                    <span className="text-[10px] font-bold bg-purple-200 text-purple-800 px-2 py-0.5 rounded-full">
                      Menjawab Pertanyaan Anda
                    </span>
                  </div>

                  {/* Flowchart Steps Vertical */}
                  <div className="space-y-3">
                    
                    {/* NODE 1 */}
                    <div className="bg-white p-4 rounded-2xl border-2 border-slate-200 shadow-xs flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-purple-600 text-white font-black flex items-center justify-center shrink-0 text-xs shadow-xs">
                        1
                      </div>
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center justify-between">
                          <h5 className="font-bold text-slate-900 text-sm">Buat Purchase Order ke Vendor (/purchase/new)</h5>
                          <span className="text-[10px] font-extrabold bg-slate-100 text-slate-600 px-2 py-0.5 rounded">Status: Draft / Sent</span>
                        </div>
                        <p className="text-slate-600 text-xs">
                          Anda memesan barang kulakan ke vendor dengan metode tempo. Pada tahap ini, <strong>belum ada jurnal keuangan</strong> karena fisik barang belum tiba di gudang.
                        </p>
                      </div>
                    </div>

                    <div className="flex justify-center text-purple-600">
                      <ArrowDown className="w-5 h-5 stroke-[2.5]" />
                    </div>

                    {/* NODE 2 */}
                    <div className="bg-white p-4 rounded-2xl border-2 border-purple-300 shadow-xs flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-purple-600 text-white font-black flex items-center justify-center shrink-0 text-xs shadow-xs">
                        2
                      </div>
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center justify-between">
                          <h5 className="font-bold text-purple-950 text-sm">Fisik Barang Tiba di Gudang: Ubah Status PO jadi &apos;Diterima&apos; (Received)</h5>
                          <span className="text-[10px] font-extrabold bg-purple-100 text-purple-800 px-2 py-0.5 rounded">Trigger Jurnal Otomatis</span>
                        </div>
                        <p className="text-slate-600 text-xs">
                          Sistem otomatis mengakui barang masuk ke stok dan mencatat utang dagang Anda ke vendor:
                        </p>
                        <div className="bg-slate-50 p-2.5 rounded-xl font-mono text-[11px] space-y-1 border border-slate-200">
                          <div className="flex items-center gap-1.5 text-emerald-800 font-bold">
                            <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded text-[10px] font-black border border-emerald-300">
                              <Plus className="w-2.5 h-2.5 stroke-[3]" /> Debit (Masuk)
                            </span>
                            <span>: [1102] Persediaan Barang Dagang bertambah (Aset Naik di Aktiva)</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-rose-800 font-bold">
                            <span className="inline-flex items-center gap-1 bg-rose-100 text-rose-800 px-2 py-0.5 rounded text-[10px] font-black border border-rose-300">
                              <Minus className="w-2.5 h-2.5 stroke-[3]" /> Kredit (Utang)
                            </span>
                            <span>: [2101] Hutang Usaha bertambah (Kewajiban Naik di Pasiva)</span>
                          </div>
                        </div>
                        <p className="text-[10px] text-purple-800 font-semibold italic">
                          👉 Dari sinilah angka Hutang Usaha (2101) muncul di Neraca Keuangan Anda!
                        </p>
                      </div>
                    </div>

                    <div className="flex justify-center text-purple-600">
                      <ArrowDown className="w-5 h-5 stroke-[2.5]" />
                    </div>

                    {/* NODE 3 */}
                    <div className="bg-white p-4 rounded-2xl border-2 border-slate-200 shadow-xs flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-emerald-600 text-white font-black flex items-center justify-center shrink-0 text-xs shadow-xs">
                        3
                      </div>
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center justify-between">
                          <h5 className="font-bold text-slate-900 text-sm">Saat Jatuh Tempo: Anda Bayar Tagihan PO ke Vendor</h5>
                          <span className="text-[10px] font-extrabold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">Klik Catat Pembayaran</span>
                        </div>
                        <p className="text-slate-600 text-xs">
                          Buka detail PO di <code>/purchase/[id]</code> dan klik tombol <strong>&quot;Catat Pembayaran&quot;</strong>. Anda memilih rekening kasir/bank sumber transfer.
                        </p>
                      </div>
                    </div>

                    <div className="flex justify-center text-purple-600">
                      <ArrowDown className="w-5 h-5 stroke-[2.5]" />
                    </div>

                    {/* NODE 4 */}
                    <div className="bg-white p-4 rounded-2xl border-2 border-emerald-300 shadow-xs flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-emerald-600 text-white font-black flex items-center justify-center shrink-0 text-xs shadow-xs">
                        4
                      </div>
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center justify-between">
                          <h5 className="font-bold text-emerald-950 text-sm">Hasil Akhir: Kemana Utang Dagang Berpindah Saat Lunas?</h5>
                          <span className="text-[10px] font-extrabold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">Neraca Seimbang</span>
                        </div>
                        <p className="text-slate-600 text-xs">
                          Sistem otomatis membuat jurnal pelunasan berpasangan:
                        </p>
                        <div className="bg-slate-50 p-2.5 rounded-xl font-mono text-[11px] space-y-1 border border-slate-200">
                          <div className="flex items-center gap-1.5 text-emerald-800 font-bold">
                            <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded text-[10px] font-black border border-emerald-300">
                              <Plus className="w-2.5 h-2.5 stroke-[3]" /> Debit (Lunas)
                            </span>
                            <span>: [2101] Hutang Usaha Berkurang / Lunas (Hilang di Sisi Pasiva)</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-rose-800 font-bold">
                            <span className="inline-flex items-center gap-1 bg-rose-100 text-rose-800 px-2 py-0.5 rounded text-[10px] font-black border border-rose-300">
                              <Minus className="w-2.5 h-2.5 stroke-[3]" /> Kredit (Keluar)
                            </span>
                            <span>: [1101] Kas &amp; Bank Uang Rekening Berkurang (Keluar di Sisi Aktiva)</span>
                          </div>
                        </div>
                        <p className="text-[11px] text-slate-700 leading-relaxed font-bold bg-emerald-50/70 p-2.5 rounded-xl border border-emerald-200">
                          💡 Jawaban: Utang dagang tidak &quot;hilang lenyap&quot;, melainkan <strong>berpindah mengurangi saldo uang kas rekening bank Anda di Neraca Aktiva</strong>. Karena utang berkurang dan kas berkurang sama besar, neraca tetap seimbang!
                        </p>
                      </div>
                    </div>

                  </div>
                </div>
              )}

              {/* ================================================================= */}
              {/* BAGAN 3: SIKLUS PENJUALAN (INVOICE, PIUTANG, & HPP)               */}
              {/* ================================================================= */}
              {baganTab === "invoice" && (
                <div className="space-y-6">
                  <div className="bg-blue-50 border border-blue-200 p-3.5 rounded-2xl flex items-center justify-between text-blue-900">
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-blue-600 shrink-0" />
                      <span className="font-extrabold">Bagan Siklus Penjualan: Invoice Terbit → Piutang &amp; HPP → Pelunasan Kas</span>
                    </div>
                    <span className="text-[10px] font-bold bg-blue-200 text-blue-800 px-2 py-0.5 rounded-full">
                      Penjualan &amp; Kas Masuk
                    </span>
                  </div>

                  <div className="space-y-3">
                    
                    {/* STEP 1 */}
                    <div className="bg-white p-4 rounded-2xl border-2 border-slate-200 shadow-xs flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-black flex items-center justify-center shrink-0 text-xs">
                        1
                      </div>
                      <div className="space-y-1 flex-1">
                        <h5 className="font-bold text-slate-900 text-sm">Buat &amp; Finalisasi Invoice Penjualan (/invoice/new)</h5>
                        <p className="text-slate-600 text-xs">
                          Anda menjual barang/jasa kepada pelanggan dan menerbitkan faktur invoice resmi (status diubah dari draft menjadi <code>sent / partial / overdue</code>).
                        </p>
                      </div>
                    </div>

                    <div className="flex justify-center text-blue-600">
                      <ArrowDown className="w-5 h-5 stroke-[2.5]" />
                    </div>

                    {/* STEP 2 */}
                    <div className="bg-white p-4 rounded-2xl border-2 border-blue-300 shadow-xs flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-black flex items-center justify-center shrink-0 text-xs">
                        2
                      </div>
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center justify-between">
                          <h5 className="font-bold text-blue-950 text-sm">Dampak Ganda: Masuk ke Laba Rugi &amp; Masuk ke Neraca</h5>
                          <span className="text-[10px] font-extrabold bg-blue-100 text-blue-800 px-2 py-0.5 rounded">Otomatisasi Database</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 font-mono text-[11px]">
                          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 space-y-1">
                            <div className="text-[10px] font-extrabold text-blue-800 uppercase font-sans">A. Dampak ke Neraca:</div>
                            <div className="text-emerald-800 font-bold">🟢 (+) Debit: [1103] Piutang Usaha Naik</div>
                            <div className="text-rose-800 font-bold">🔴 (-) Kredit: [1102] Persediaan Barang Turun</div>
                          </div>
                          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 space-y-1">
                            <div className="text-[10px] font-extrabold text-indigo-800 uppercase font-sans">B. Dampak ke Laba Rugi:</div>
                            <div className="text-emerald-800 font-bold">🟢 (+) Kredit: [4101] Pendapatan Omset Naik</div>
                            <div className="text-rose-800 font-bold">🔴 (+) Debit: [5101] HPP Modal Barang Naik</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-center text-blue-600">
                      <ArrowDown className="w-5 h-5 stroke-[2.5]" />
                    </div>

                    {/* STEP 3 */}
                    <div className="bg-white p-4 rounded-2xl border-2 border-emerald-300 shadow-xs flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-emerald-600 text-white font-black flex items-center justify-center shrink-0 text-xs">
                        3
                      </div>
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center justify-between">
                          <h5 className="font-bold text-emerald-950 text-sm">Pelunasan: Pelanggan Mentransfer Uang Pembayaran (/payment)</h5>
                          <span className="text-[10px] font-extrabold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">Uang Masuk</span>
                        </div>
                        <p className="text-slate-600 text-xs">
                          Saat customer membayar tagihan invoice:
                        </p>
                        <div className="bg-slate-50 p-2.5 rounded-xl font-mono text-[11px] space-y-1 border border-slate-200">
                          <div className="flex items-center gap-1.5 text-emerald-800 font-bold">
                            <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded text-[10px] font-black border border-emerald-300">
                              <Plus className="w-2.5 h-2.5 stroke-[3]" /> Debit (Masuk)
                            </span>
                            <span>: [1101] Kas &amp; Bank Uang Rekening Bertambah (Kas Masuk di Aktiva)</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-rose-800 font-bold">
                            <span className="inline-flex items-center gap-1 bg-rose-100 text-rose-800 px-2 py-0.5 rounded text-[10px] font-black border border-rose-300">
                              <Minus className="w-2.5 h-2.5 stroke-[3]" /> Kredit (Lunas)
                            </span>
                            <span>: [1103] Piutang Usaha Berkurang / Lunas (Piutang Hilang di Aktiva)</span>
                          </div>
                        </div>
                        <p className="text-[10px] text-slate-500 italic">
                          Piutang hilang dan berubah menjadi saldo uang kas tunai / rekening bank perusahaan Anda.
                        </p>
                      </div>
                    </div>

                  </div>
                </div>
              )}

              {/* ================================================================= */}
              {/* BAGAN 4: BIAYA OPERASIONAL (EXPENSES)                             */}
              {/* ================================================================= */}
              {baganTab === "expense" && (
                <div className="space-y-6">
                  <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-2xl flex items-center justify-between text-amber-900">
                    <div className="flex items-center gap-2">
                      <Wallet className="w-4 h-4 text-amber-600 shrink-0" />
                      <span className="font-extrabold">Bagan Pengeluaran Biaya Operasional: Menu Biaya → Kas Berkurang</span>
                    </div>
                    <span className="text-[10px] font-bold bg-amber-200 text-amber-800 px-2 py-0.5 rounded-full">
                      Beban Kantor
                    </span>
                  </div>

                  <div className="space-y-3">
                    
                    <div className="bg-white p-4 rounded-2xl border-2 border-slate-200 shadow-xs flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-amber-600 text-white font-black flex items-center justify-center shrink-0 text-xs">
                        1
                      </div>
                      <div className="space-y-1 flex-1">
                        <h5 className="font-bold text-slate-900 text-sm">Catat Pengeluaran di Menu Pengeluaran (/expenses)</h5>
                        <p className="text-slate-600 text-xs">
                          Anda mencatat biaya tagihan listrik, sewa ruko, internet, konsumsi, bensin, atau gaji karyawan di menu <code>/expenses</code>.
                        </p>
                      </div>
                    </div>

                    <div className="flex justify-center text-amber-600">
                      <ArrowDown className="w-5 h-5 stroke-[2.5]" />
                    </div>

                    <div className="bg-white p-4 rounded-2xl border-2 border-amber-300 shadow-xs flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-amber-600 text-white font-black flex items-center justify-center shrink-0 text-xs">
                        2
                      </div>
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center justify-between">
                          <h5 className="font-bold text-amber-950 text-sm">Pilih Kategori Beban &amp; Rekening Kas/Bank Sumber Pembayaran</h5>
                          <span className="text-[10px] font-extrabold bg-amber-100 text-amber-800 px-2 py-0.5 rounded">Jurnal Berpasangan</span>
                        </div>
                        <div className="bg-slate-50 p-2.5 rounded-xl font-mono text-[11px] space-y-1.5 border border-slate-200">
                          <div className="flex items-center gap-1.5 text-rose-800 font-bold">
                            <span className="inline-flex items-center gap-1 bg-rose-100 text-rose-800 px-2 py-0.5 rounded text-[10px] font-black border border-rose-300">
                              <Plus className="w-2.5 h-2.5 stroke-[3]" /> Debit (Beban)
                            </span>
                            <span>: Akun Beban (5102 Gaji / 5103 Sewa / 5104 Listrik dll) → Mengurangi Laba di Laba Rugi</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-rose-800 font-bold">
                            <span className="inline-flex items-center gap-1 bg-rose-100 text-rose-800 px-2 py-0.5 rounded text-[10px] font-black border border-rose-300">
                              <Minus className="w-2.5 h-2.5 stroke-[3]" /> Kredit (Keluar)
                            </span>
                            <span>: [1101] Kas &amp; Bank → Saldo Rekening Uang Berkurang di Neraca</span>
                          </div>
                        </div>
                      </div>
                    </div>

                  </div>
                </div>
              )}

              {/* ================================================================= */}
              {/* BAGAN 5: JEMBATAN LABA RUGI KE NERACA                              */}
              {/* ================================================================= */}
              {baganTab === "neraca" && (
                <div className="space-y-6">
                  <div className="bg-emerald-50 border border-emerald-200 p-3.5 rounded-2xl flex items-center justify-between text-emerald-900">
                    <div className="flex items-center gap-2">
                      <Scale className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span className="font-extrabold">Bagan Jembatan Emas: Hubungan Laporan Laba Rugi ke Neraca Keuangan</span>
                    </div>
                    <span className="text-[10px] font-bold bg-emerald-200 text-emerald-800 px-2 py-0.5 rounded-full">
                      Kunci Neraca Seimbang
                    </span>
                  </div>

                  {/* Visual Cascade Formula */}
                  <div className="bg-white p-5 rounded-3xl border-2 border-slate-200 shadow-xs space-y-4">
                    <h4 className="font-bold text-slate-900 text-sm border-b pb-2">
                      Kalkulasi Laba Bersih di Laporan Laba Rugi:
                    </h4>

                    <div className="space-y-2 font-mono text-xs">
                      <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center justify-between">
                        <span className="font-bold text-emerald-900">Total Pendapatan Operasional (Omset Faktur)</span>
                        <span className="font-black text-emerald-700">[+] Positif</span>
                      </div>

                      <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 flex items-center justify-between">
                        <span className="font-bold text-rose-900">Dikurangi: Harga Pokok Penjualan (HPP Modal Barang Terjual)</span>
                        <span className="font-black text-rose-700">[-] Negatif</span>
                      </div>

                      <div className="p-3 bg-slate-100 rounded-xl border border-slate-200 flex items-center justify-between font-sans">
                        <span className="font-black text-slate-900">Sama Dengan: Laba Kotor (Gross Profit)</span>
                        <span className="font-black text-slate-800">[=] Subtotal</span>
                      </div>

                      <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 flex items-center justify-between">
                        <span className="font-bold text-amber-900">Dikurangi: Total Beban Operasional (Gaji, Listrik, Sewa)</span>
                        <span className="font-black text-amber-700">[-] Negatif</span>
                      </div>

                      <div className="p-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl shadow-xs flex items-center justify-between font-sans">
                        <div>
                          <div className="text-[10px] uppercase font-bold text-blue-200">Hasil Akhir:</div>
                          <div className="font-black text-base">LABA BERSIH TAHUN BERJALAN (NET INCOME)</div>
                        </div>
                        <span className="bg-white text-blue-700 font-black px-3 py-1 rounded-lg text-sm shadow-xs">
                          Keuntungan Riil
                        </span>
                      </div>
                    </div>

                    <div className="flex justify-center text-blue-600 py-1">
                      <div className="flex flex-col items-center gap-1 font-bold text-blue-700 text-xs">
                        <ArrowDown className="w-6 h-6 stroke-[3] animate-bounce" />
                        <span>Angka Laba Bersih ini OTOMATIS Mengalir Masuk ke Neraca!</span>
                      </div>
                    </div>

                    <div className="bg-emerald-50 border-2 border-emerald-300 p-4 rounded-2xl space-y-2">
                      <div className="flex items-center gap-2 text-emerald-950 font-bold text-sm">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                        <span>Posisi di Neraca Keuangan:</span>
                      </div>
                      <p className="text-slate-700 text-xs leading-relaxed">
                        Laba Bersih masuk ke sisi <strong>Pasiva → Ekuitas (Modal) → Laba Tahun Berjalan</strong>.
                        Karena laba bersih menambah ekuitas pemilik, maka total kekayaan di sisi kiri (Aktiva) akan selalu <strong>SEIMBANG PERSIS</strong> dengan total utang + modal di sisi kanan (Pasiva).
                      </p>
                      <div className="bg-white p-3 rounded-xl border border-emerald-200 font-mono text-xs font-black text-center text-emerald-900">
                        Total Aktiva (Kas + Piutang + Stok) = Total Pasiva (Utang Usaha + Modal Pemilik + Laba Bersih)
                      </div>
                    </div>

                  </div>
                </div>
              )}

            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
              <span className="text-[11px] text-slate-500 font-medium">
                Tip: Pilih tab bagan di atas untuk melihat alur siklus transaksi secara bertahap.
              </span>
              <button
                onClick={() => setShowFlowModal(false)}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-2.5 rounded-xl text-xs shadow-xs transition"
              >
                Tutup Bagan Panduan
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
