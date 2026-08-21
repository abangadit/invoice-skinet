"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Percent,
  Search,
  Calendar,
  Download,
  AlertCircle,
  CheckCircle2,
  Edit3,
  HelpCircle,
  Check,
  Save,
  Grid,
  XCircle
} from "lucide-react";
import { useBusiness } from "../../../lib/context/BusinessContext";
import { createWebBrowserClient } from "../../../lib/supabase/client";

interface TaxTransaction {
  id: string;
  reference_type: string;
  reference_id: string;
  tax_type: "ppn" | "pph23";
  tax_rate: number;
  dpp_amount: number;
  tax_amount: number;
  tax_invoice_number: string | null;
  tax_invoice_date: string | null;
  customer_npwp: string | null;
  created_at: string;
  invoice_number?: string;
  customer_name?: string;
}

export default function TaxExportPage() {
  const { activeBusiness } = useBusiness();
  
  const [txs, setTxs] = useState<TaxTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [taxTypeFilter, setTaxTypeFilter] = useState<string>("all");
  
  // Date Filters
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Bulk update state
  const [bulkStartNsfp, setBulkStartNsfp] = useState("");

  // Inline editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNsfpValue, setEditNsfpValue] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  // Stats
  const [stats, setStats] = useState({
    totalDpp: 0,
    totalPpn: 0,
    totalPph23: 0,
    missingNsfpCount: 0
  });

  // Load date range (default current month)
  useEffect(() => {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    
    setStartDate(firstDay.toISOString().split("T")[0]);
    setEndDate(today.toISOString().split("T")[0]);
  }, []);

  const fetchTaxTransactions = async () => {
    if (!activeBusiness) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const supabase = createWebBrowserClient();

      // 1. Fetch Tax Transactions
      const { data: txData, error: txError } = await supabase
        .from("tax_transactions")
        .select("*")
        .eq("business_id", activeBusiness.id)
        .order("created_at", { ascending: false });

      if (txError) throw txError;

      // 2. Fetch Related Invoices (to map invoice_number and customer name)
      const { data: invData, error: invError } = await supabase
        .from("invoices")
        .select("id, invoice_number, customer_snapshot")
        .eq("business_id", activeBusiness.id);

      if (invError) throw invError;

      const invoiceMap = new Map();
      (invData || []).forEach((inv: any) => {
        invoiceMap.set(inv.id, {
          invoice_number: inv.invoice_number,
          customer_name: inv.customer_snapshot?.name || "Pelanggan Umum"
        });
      });

      const formatted: TaxTransaction[] = (txData || []).map((tx: any) => {
        const invInfo = invoiceMap.get(tx.reference_id);
        return {
          id: tx.id,
          reference_type: tx.reference_type,
          reference_id: tx.reference_id,
          tax_type: tx.tax_type,
          tax_rate: Number(tx.tax_rate || 0),
          dpp_amount: Number(tx.dpp_amount || 0),
          tax_amount: Number(tx.tax_amount || 0),
          tax_invoice_number: tx.tax_invoice_number || "",
          tax_invoice_date: tx.tax_invoice_date,
          customer_npwp: tx.customer_npwp || "",
          created_at: tx.created_at,
          invoice_number: invInfo?.invoice_number || "INV/N-A",
          customer_name: invInfo?.customer_name || "Pelanggan Umum"
        };
      });

      setTxs(formatted);
    } catch (err) {
      console.error("Error loading tax records:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTaxTransactions();
  }, [activeBusiness]);

  // Recalculate stats whenever txs change or date filters change
  useEffect(() => {
    let dppSum = 0;
    let ppnSum = 0;
    let pph23Sum = 0;
    let missingNsfp = 0;

    filteredTxs.forEach(tx => {
      dppSum += tx.dpp_amount;
      if (tx.tax_type === "ppn") {
        ppnSum += tx.tax_amount;
      } else if (tx.tax_type === "pph23") {
        pph23Sum += tx.tax_amount;
      }

      if (!tx.tax_invoice_number || tx.tax_invoice_number.trim() === "") {
        missingNsfp++;
      }
    });

    setStats({
      totalDpp: dppSum,
      totalPpn: ppnSum,
      totalPph23: pph23Sum,
      missingNsfpCount: missingNsfp
    });
  }, [txs, startDate, endDate, search, taxTypeFilter]);

  const cleanNPWP = (npwp: string | null) => {
    if (!npwp) return "000000000000000";
    const cleaned = npwp.replace(/[^0-9]/g, "");
    if (cleaned.length === 15) return cleaned;
    return cleaned.substring(0, 15).padEnd(15, "0");
  };

  const filteredTxs = txs.filter(tx => {
    // Date filter
    const txDate = tx.tax_invoice_date || tx.created_at.split("T")[0];
    if (startDate && txDate < startDate) return false;
    if (endDate && txDate > endDate) return false;

    // Tax Type filter
    if (taxTypeFilter !== "all" && tx.tax_type !== taxTypeFilter) return false;

    // Search filter
    const searchLower = search.toLowerCase();
    const matchesSearch =
      (tx.invoice_number || "").toLowerCase().includes(searchLower) ||
      (tx.customer_name || "").toLowerCase().includes(searchLower) ||
      (tx.customer_npwp || "").toLowerCase().includes(searchLower) ||
      (tx.tax_invoice_number || "").toLowerCase().includes(searchLower);

    return matchesSearch;
  });

  const handleSaveNsfp = async (txId: string) => {
    try {
      setActionLoading(true);
      const supabase = createWebBrowserClient();

      const { error } = await supabase
        .from("tax_transactions")
        .update({ tax_invoice_number: editNsfpValue.trim() })
        .eq("id", txId);

      if (error) throw error;

      setTxs(prev => prev.map(t => t.id === txId ? { ...t, tax_invoice_number: editNsfpValue.trim() } : t));
      setEditingId(null);
    } catch (err) {
      console.error("Error updating NSFP:", err);
      alert("Gagal mengupdate nomor NSFP.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleBulkUpdateNsfp = async () => {
    const rawStart = bulkStartNsfp.replace(/[^0-9]/g, "");
    if (rawStart.length < 13) {
      alert("Masukkan minimal 13 digit angka untuk nomor NSFP awal!");
      return;
    }

    const unassignedTxs = filteredTxs.filter(tx => tx.tax_type === "ppn" && (!tx.tax_invoice_number || tx.tax_invoice_number.trim() === ""));
    if (unassignedTxs.length === 0) {
      alert("Tidak ada transaksi PPN tanpa NSFP pada filter saat ini.");
      return;
    }

    if (!confirm(`Apakah Anda yakin ingin mengisi NSFP secara masal untuk ${unassignedTxs.length} transaksi PPN?`)) {
      return;
    }

    try {
      setActionLoading(true);
      const supabase = createWebBrowserClient();

      let currentNum = BigInt(rawStart);

      // We perform updates in a loop or single updates
      for (const tx of unassignedTxs) {
        // Format current number to prefix format (maintain leading zeros)
        const nsfpStr = String(currentNum).padStart(13, "0");
        
        // Let's format it back with standard DJP dot notations: e.g. XXX.XX.XXXXXXXX
        const formattedNsfp = `${nsfpStr.substring(0, 3)}.${nsfpStr.substring(3, 5)}.${nsfpStr.substring(5)}`;

        await supabase
          .from("tax_transactions")
          .update({ tax_invoice_number: formattedNsfp })
          .eq("id", tx.id);

        currentNum++;
      }

      alert("Bulk NSFP berhasil diaplikasikan!");
      setBulkStartNsfp("");
      fetchTaxTransactions();
    } catch (err) {
      console.error("Error bulk updating NSFP:", err);
      alert("Gagal memproses bulk update.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDownloadCsv = () => {
    if (filteredTxs.length === 0) {
      alert("Tidak ada transaksi untuk diekspor.");
      return;
    }

    // CSV e-Faktur Header
    let csvContent = "FK;KD_JENIS_TRANSAKSI;FG_PENGGANTI;NOMOR_FAKTUR;MASA_PAJAK;TAHUN_PAJAK;TANGGAL_FAKTUR;NPWP;NAMA;ALAMAT_LENGKAP;JUMLAH_DPP;JUMLAH_PPN;JUMLAH_PPNBM;ID_KETERANGAN_TAMBAHAN;FG_UANG_MUKA;UANG_MUKA_DPP;UANG_MUKA_PPN;UANG_MUKA_PPNBM;REFERENSI\r\n";

    // Loop through FK records (PPN only, as PPh 23 is not reported via e-Faktur FK CSV)
    const ppnTxs = filteredTxs.filter(tx => tx.tax_type === "ppn");

    if (ppnTxs.length === 0) {
      alert("Tidak ada transaksi PPN ditemukan pada filter saat ini. e-Faktur DJP hanya menerima PPN.");
      return;
    }

    ppnTxs.forEach(tx => {
      // Parse dates
      const dateParts = (tx.tax_invoice_date || tx.created_at.split("T")[0]).split("-");
      const formattedDate = `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`; // DD/MM/YYYY
      const month = parseInt(dateParts[1], 10);
      const year = dateParts[0];

      // Remove dots/dashes from NSFP for DJP parser (must be 13 digits)
      const cleanNsfp = (tx.tax_invoice_number || "").replace(/[^0-9]/g, "");

      const npwpClean = cleanNPWP(tx.customer_npwp);
      const name = tx.customer_name || "Pelanggan Umum";
      
      const row = [
        "FK",
        "01", // KD_JENIS_TRANSAKSI
        "0",  // FG_PENGGANTI
        cleanNsfp,
        month,
        year,
        formattedDate,
        npwpClean,
        name.replace(/;/g, ","), // escape semicolons
        "Alamat Terdaftar", // DJP address fallback
        Math.round(tx.dpp_amount),
        Math.round(tx.tax_amount),
        0,  // JUMLAH_PPNBM
        "", // ID_KETERANGAN_TAMBAHAN
        0,  // FG_UANG_MUKA
        0,  // UANG_MUKA_DPP
        0,  // UANG_MUKA_PPN
        0,  // UANG_MUKA_PPNBM
        tx.invoice_number || "" // REFERENSI
      ];

      csvContent += row.join(";") + "\r\n";
    });

    // Download Trigger
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `EFaktur_FK_${activeBusiness?.name.replace(/[^a-z0-9]/gi, "_") || "Tax"}_${startDate}_to_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0
    }).format(val);
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-semibold">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            Pelaporan & Ekspor e-Faktur Pajak
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Kelola PPN Keluaran & PPh 23, isi nomor seri faktur pajak, dan ekspor berkas CSV DJP Indonesia.
          </p>
        </div>
        <button
          onClick={handleDownloadCsv}
          className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold py-2.5 px-4 rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition shrink-0 self-start sm:self-auto active:scale-95"
        >
          <Download className="w-4 h-4" /> {activeBusiness?.default_currency === "IDR" ? "Unduh CSV e-Faktur" : "Export Tax CSV"}
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs font-semibold">
        
        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm card-shadow space-y-1">
          <span className="text-slate-450 font-bold text-[10px] uppercase tracking-wider">Total Nilai DPP</span>
          <p className="text-lg font-extrabold text-slate-900">{formatCurrency(stats.totalDpp)}</p>
        </div>

        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm card-shadow space-y-1">
          <span className="text-emerald-500 font-bold text-[10px] uppercase tracking-wider">Total PPN Keluaran</span>
          <p className="text-lg font-extrabold text-emerald-600">+{formatCurrency(stats.totalPpn)}</p>
        </div>

        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm card-shadow space-y-1">
          <span className="text-blue-500 font-bold text-[10px] uppercase tracking-wider">Total PPh 23 Terpotong</span>
          <p className="text-lg font-extrabold text-blue-600">-{formatCurrency(stats.totalPph23)}</p>
        </div>

        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm card-shadow space-y-1">
          <span className="text-amber-500 font-bold text-[10px] uppercase tracking-wider">Jumlah NSFP Kosong</span>
          <p className="text-lg font-extrabold text-amber-600">{stats.missingNsfpCount} Invoice</p>
        </div>

      </div>

      {/* Filter and Bulk Action Card */}
      <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm space-y-4 card-shadow text-xs font-semibold">
        <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Filter & Aksi Masal</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          <div className="space-y-1">
            <label className="text-slate-500">Tanggal Mulai</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full bg-white border border-slate-200 px-3 py-2 rounded-xl text-slate-800 focus:outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="text-slate-500">Tanggal Selesai</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full bg-white border border-slate-200 px-3 py-2 rounded-xl text-slate-800 focus:outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="text-slate-500">Tipe Pajak</label>
            <select
              value={taxTypeFilter}
              onChange={(e) => setTaxTypeFilter(e.target.value)}
              className="w-full bg-white border border-slate-200 px-3 py-2 rounded-xl text-slate-800 focus:outline-none"
            >
              <option value="all">Semua Jenis Pajak</option>
              <option value="ppn">PPN (Pajak Pertambahan Nilai)</option>
              <option value="pph23">PPh 23 (Jasa)</option>
            </select>
          </div>

          {/* Bulk NSFP Assigner */}
          <div className="space-y-1">
            <label className="text-slate-500 flex items-center gap-1">
              Input NSFP Mulai Masal <span title="Masukkan 13 digit angka, sistem akan mengurutkan otomatis."><HelpCircle className="w-3.5 h-3.5 text-slate-400 cursor-help" /></span>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="e.g. 0012612345678"
                value={bulkStartNsfp}
                onChange={(e) => setBulkStartNsfp(e.target.value)}
                className="w-full bg-white border border-slate-200 px-3 py-2 rounded-xl text-slate-800 focus:outline-none font-mono font-bold"
              />
              <button
                type="button"
                onClick={handleBulkUpdateNsfp}
                disabled={actionLoading}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-3 py-2 rounded-xl transition shadow-sm"
              >
                Terapkan
              </button>
            </div>
          </div>

        </div>

        {/* Real-time search bar */}
        <div className="relative pt-2">
          <Search className="absolute left-3.5 top-[22px] transform -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nomor invoice, nama pelanggan, NPWP, atau NSFP..."
            className="w-full bg-slate-50 border border-slate-200 pl-10 pr-4 py-2 rounded-xl text-sm placeholder-slate-400 focus:outline-none focus:bg-white focus:border-blue-500 transition shadow-sm font-semibold"
          />
        </div>
      </div>

      {/* Tax Table */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs text-slate-500 font-semibold mt-2">Memuat rekonsiliasi perpajakan...</p>
        </div>
      ) : filteredTxs.length > 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden card-shadow text-xs font-semibold">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                  <th className="py-3 px-4">Invoice</th>
                  <th className="py-3 px-4">Pelanggan & NPWP</th>
                  <th className="py-3 px-4 text-center">Tipe</th>
                  <th className="py-3 px-4 text-right">DPP (Subtotal)</th>
                  <th className="py-3 px-4 text-right">Nilai Pajak</th>
                  <th className="py-3 px-4">Nomor Faktur Pajak (NSFP)</th>
                  <th className="py-3 px-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                {filteredTxs.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50 transition">
                    <td className="py-3.5 px-4">
                      <Link href={`/invoice/${tx.reference_id}`} className="font-mono font-bold text-blue-600 hover:underline">
                        {tx.invoice_number}
                      </Link>
                      <span className="block text-[9px] text-slate-400 font-medium">
                        Tanggal: {tx.tax_invoice_date || tx.created_at.split("T")[0]}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-800">
                      <div>{tx.customer_name}</div>
                      <div className="font-mono text-[9px] font-medium text-slate-400">
                        NPWP: {tx.customer_npwp ? cleanNPWP(tx.customer_npwp) : "000000000000000"}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold border ${
                        tx.tax_type === "ppn"
                          ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                          : "bg-blue-50 text-blue-600 border-blue-100"
                      }`}>
                        {tx.tax_type === "ppn" ? "PPN 11%" : "PPh 23 2%"}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-semibold text-slate-750">
                      {formatCurrency(tx.dpp_amount)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-extrabold text-slate-900">
                      {formatCurrency(tx.tax_amount)}
                    </td>
                    <td className="py-3.5 px-4">
                      {editingId === tx.id ? (
                        <input
                          type="text"
                          value={editNsfpValue}
                          onChange={(e) => setEditNsfpValue(e.target.value)}
                          placeholder="e.g. 001.26.12345678"
                          className="bg-white border border-slate-350 px-2 py-1 rounded font-mono font-bold text-slate-800 focus:outline-none w-36 shadow-sm"
                        />
                      ) : (
                        <span className="font-mono font-bold text-slate-800">
                          {tx.tax_invoice_number || (
                            <span className="text-amber-500 text-[10px] font-bold italic flex items-center gap-0.5">
                              <AlertCircle className="w-3.5 h-3.5" /> Belum Diisi
                            </span>
                          )}
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {editingId === tx.id ? (
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleSaveNsfp(tx.id)}
                            disabled={actionLoading}
                            className="p-1 text-emerald-600 hover:bg-emerald-50 rounded transition"
                            title="Simpan"
                          >
                            <Save className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="p-1 text-rose-500 hover:bg-rose-50 rounded transition"
                            title="Batal"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setEditingId(tx.id);
                            setEditNsfpValue(tx.tax_invoice_number || "");
                          }}
                          className="inline-flex items-center gap-0.5 text-blue-600 hover:bg-blue-50 px-2 py-1 rounded transition font-bold"
                        >
                          <Edit3 className="w-3.5 h-3.5" /> Edit
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-400 shadow-sm text-xs font-semibold">
          <Percent className="w-12 h-12 mx-auto text-slate-200 mb-3" />
          <p className="text-sm font-semibold">Tidak ada transaksi perpajakan ditemukan</p>
          <p className="text-[10px] text-slate-450 mt-1">
            Transaksi perpajakan otomatis tercatat saat Invoice Penjualan yang memiliki PPN/PPh 23 di-finalisasi (bukan draft).
          </p>
        </div>
      )}

    </div>
  );
}
