"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { 
  Package, 
  Warehouse, 
  Download, 
  Printer, 
  Search, 
  Filter, 
  Calendar, 
  TrendingDown, 
  DollarSign, 
  Layers,
  ArrowLeft,
  FileSpreadsheet
} from "lucide-react";
import { useBusiness } from "../../../../lib/context/BusinessContext";
import { createWebBrowserClient } from "../../../../lib/supabase/client";

const REASONS = [
  { value: "expired", label: "Kadaluarsa", color: "bg-amber-50 text-amber-700 border-amber-200" },
  { value: "damaged", label: "Rusak / Cacat", color: "bg-rose-50 text-rose-700 border-rose-200" },
  { value: "internal_use", label: "Pemakaian Internal", color: "bg-blue-50 text-blue-700 border-blue-200" },
  { value: "sample", label: "Sample / Promosi", color: "bg-purple-50 text-purple-700 border-purple-200" },
  { value: "loss", label: "Hilang / Selisih", color: "bg-slate-100 text-slate-700 border-slate-300" },
  { value: "other", label: "Lainnya", color: "bg-slate-50 text-slate-600 border-slate-200" },
];

export default function StockOutReportPage() {
  const { activeBusiness } = useBusiness();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);

  // Filter states (default 30 days)
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
  const today = now.toISOString().split("T")[0];

  const [startDate, setStartDate] = useState(firstDay);
  const [endDate, setEndDate] = useState(today);
  const [selectedWarehouse, setSelectedWarehouse] = useState("all");
  const [selectedReason, setSelectedReason] = useState("all");
  const [search, setSearch] = useState("");

  const fetchData = async () => {
    if (!activeBusiness) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const supabase = createWebBrowserClient();

      // 1. Fetch Warehouses
      const { data: whData } = await supabase
        .from("warehouses")
        .select("id, name")
        .eq("business_id", activeBusiness.id)
        .order("name");
      setWarehouses(whData || []);

      // 2. Query stock_out with filters
      let query = supabase
        .from("stock_out")
        .select(`
          *,
          items (name, unit, cogs_unit_price),
          warehouses (name)
        `)
        .eq("business_id", activeBusiness.id)
        .gte("out_date", startDate)
        .lte("out_date", endDate)
        .order("out_date", { ascending: false });

      if (selectedWarehouse !== "all") {
        query = query.eq("warehouse_id", selectedWarehouse);
      }

      if (selectedReason !== "all") {
        query = query.eq("reason", selectedReason);
      }

      const { data: stockOutData, error } = await query;
      if (error) throw error;

      setData(stockOutData || []);
    } catch (err) {
      console.error("Error loading stock out report:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeBusiness, startDate, endDate, selectedWarehouse, selectedReason]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: activeBusiness?.default_currency || "IDR",
      maximumFractionDigits: 0
    }).format(val);
  };

  // Filter items based on search
  const filteredData = data.filter((row) => {
    const term = search.toLowerCase();
    return (
      (row.items?.name || "").toLowerCase().includes(term) ||
      (row.stock_out_number || "").toLowerCase().includes(term) ||
      (row.recipient_name || "").toLowerCase().includes(term) ||
      (row.notes || "").toLowerCase().includes(term)
    );
  });

  // Calculate Statistics
  const totalTransactions = filteredData.length;
  const totalQuantity = filteredData.reduce((sum, row) => sum + Number(row.quantity || 0), 0);
  const totalValue = filteredData.reduce((sum, row) => sum + (Number(row.quantity || 0) * Number(row.unit_cost || 0)), 0);

  // CSV Export
  const handleExportCSV = () => {
    let csv = "\uFEFF"; // UTF-8 BOM
    csv += "LAPORAN PENGELUARAN BARANG (STOCK OUT REPORT)\n";
    csv += `Perusahaan: ${activeBusiness?.name || "Bisnis"}\n`;
    csv += `Periode: ${startDate} s/d ${endDate}\n\n`;
    csv += "No Dokumen,Tanggal,Gudang,Nama Produk,Satuan,Jumlah Keluar,HPP Satuan (Rp),Total Nilai HPP (Rp),Kategori Alasan,Penerima / PIC,Catatan\n";

    filteredData.forEach((row) => {
      const docNo = `"${row.stock_out_number || "-"}"`;
      const date = `"${row.out_date}"`;
      const wh = `"${row.warehouses?.name || "Gudang Utama"}"`;
      const prod = `"${(row.items?.name || "").replace(/"/g, '""')}"`;
      const unit = `"${row.items?.unit || "pcs"}"`;
      const qty = row.quantity;
      const unitCost = row.unit_cost || 0;
      const totalCost = qty * unitCost;
      const reasonLabel = `"${REASONS.find(r => r.value === row.reason)?.label || row.reason}"`;
      const pic = `"${(row.recipient_name || "").replace(/"/g, '""')}"`;
      const notes = `"${(row.notes || "").replace(/"/g, '""')}"`;

      csv += `${docNo},${date},${wh},${prod},${unit},${qty},${unitCost},${totalCost},${reasonLabel},${pic},${notes}\n`;
    });

    csv += `\nTOTAL,,,,"${totalQuantity}",,"${totalValue}",,,\n`;

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Laporan_Barang_Keluar_${startDate}_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Link 
              href="/reports" 
              className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 transition"
              title="Kembali ke Pusat Laporan"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
              <TrendingDown className="w-6 h-6 text-rose-600" />
              Laporan Barang Keluar (Stock Out)
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Rekapitulasi pengeluaran barang non-invoice (rusak, sample, pemakaian internal) beserta evaluasi biaya HPP.
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 shrink-0 print:hidden">
          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            Ekspor CSV
          </button>
          <button
            onClick={() => window.print()}
            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition"
          >
            <Printer className="w-4 h-4" />
            Cetak Laporan
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4 print:hidden">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          
          {/* Dari Tanggal */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Dari Tanggal</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full border border-slate-200 px-3 py-2 rounded-xl text-xs font-semibold focus:outline-none focus:border-blue-500 bg-white"
            />
          </div>

          {/* Sampai Tanggal */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Sampai Tanggal</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full border border-slate-200 px-3 py-2 rounded-xl text-xs font-semibold focus:outline-none focus:border-blue-500 bg-white"
            />
          </div>

          {/* Filter Gudang */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Gudang</label>
            <select
              value={selectedWarehouse}
              onChange={(e) => setSelectedWarehouse(e.target.value)}
              className="w-full border border-slate-200 px-3 py-2 rounded-xl text-xs font-semibold focus:outline-none focus:border-blue-500 bg-white"
            >
              <option value="all">Semua Gudang</option>
              {warehouses.map((wh) => (
                <option key={wh.id} value={wh.id}>{wh.name}</option>
              ))}
            </select>
          </div>

          {/* Filter Alasan */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Kategori / Alasan</label>
            <select
              value={selectedReason}
              onChange={(e) => setSelectedReason(e.target.value)}
              className="w-full border border-slate-200 px-3 py-2 rounded-xl text-xs font-semibold focus:outline-none focus:border-blue-500 bg-white"
            >
              <option value="all">Semua Kategori</option>
              {REASONS.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>

        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 transform -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari berdasarkan nama produk, nomor dokumen, nama PIC, atau catatan..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-blue-500 bg-white"
          />
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Frekuensi Transaksi</span>
            <Layers className="w-5 h-5 text-blue-500" />
          </div>
          <div className="text-2xl font-black text-slate-900">{totalTransactions}</div>
          <p className="text-[11px] text-slate-400">Dokumen pengeluaran barang tercatat</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Kuantitas Keluar</span>
            <Package className="w-5 h-5 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-rose-600">-{totalQuantity.toLocaleString("id-ID")}</div>
          <p className="text-[11px] text-slate-400">Unit barang terpotong dari gudang</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Estimasi Beban HPP</span>
            <DollarSign className="w-5 h-5 text-rose-500" />
          </div>
          <div className="text-2xl font-black text-slate-900">{formatCurrency(totalValue)}</div>
          <p className="text-[11px] text-slate-400">Total nilai harga pokok pengeluaran</p>
        </div>

      </div>

      {/* Tabel Laporan Lengkap */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingDown className="w-4 h-4 text-slate-500" />
            <h3 className="text-sm font-bold text-slate-800">Rincian Pengeluaran Barang</h3>
          </div>
          <span className="text-xs text-slate-500 font-semibold">
            Menampilkan {filteredData.length} data
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-100">
              <tr>
                <th className="px-4 py-3">No. Dokumen</th>
                <th className="px-4 py-3">Tanggal</th>
                <th className="px-4 py-3">Gudang</th>
                <th className="px-4 py-3">Nama Produk</th>
                <th className="px-4 py-3 text-right">Jumlah Keluar</th>
                <th className="px-4 py-3 text-right">HPP Satuan</th>
                <th className="px-4 py-3 text-right">Total Nilai HPP</th>
                <th className="px-4 py-3">Kategori / Alasan</th>
                <th className="px-4 py-3">PIC / Catatan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {filteredData.map((row) => {
                const reasonMeta = REASONS.find(r => r.value === row.reason);
                const subtotalCost = Number(row.quantity || 0) * Number(row.unit_cost || 0);

                return (
                  <tr key={row.id} className="hover:bg-slate-50/60 transition">
                    <td className="px-4 py-3 font-mono font-bold text-blue-600">
                      {row.stock_out_number || "OUT-" + row.id.slice(0, 8)}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {new Date(row.out_date).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 font-semibold text-slate-700">
                        <Warehouse className="w-3 h-3 text-slate-400" />
                        {row.warehouses?.name || "Gudang Utama"}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-bold text-slate-900">
                      {row.items?.name || "Item"}
                    </td>
                    <td className="px-4 py-3 text-right font-extrabold text-rose-600 text-sm">
                      -{row.quantity} <span className="text-xs font-medium text-slate-500">{row.items?.unit || "pcs"}</span>
                    </td>
                    <td className="px-4 py-3 text-right text-slate-500">
                      {formatCurrency(Number(row.unit_cost || 0))}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-slate-900">
                      {formatCurrency(subtotalCost)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${reasonMeta?.color || "bg-slate-50 text-slate-600 border-slate-200"}`}>
                        {reasonMeta?.label || row.reason}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500 max-w-xs truncate">
                      {row.recipient_name && (
                        <span className="font-semibold text-slate-700 block truncate">
                          PIC: {row.recipient_name}
                        </span>
                      )}
                      <span className="text-[11px] text-slate-400 block truncate">
                        {row.notes || "-"}
                      </span>
                    </td>
                  </tr>
                );
              })}

              {!loading && filteredData.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-slate-400">
                    <Package className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    <p className="font-semibold">Tidak ada data barang keluar pada periode/filter ini</p>
                  </td>
                </tr>
              )}

              {loading && (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-slate-400 font-semibold">
                    Memuat data laporan...
                  </td>
                </tr>
              )}
            </tbody>
            {filteredData.length > 0 && (
              <tfoot className="bg-slate-50 font-bold text-slate-900 border-t border-slate-200">
                <tr>
                  <td colSpan={4} className="px-4 py-3 uppercase tracking-wider text-slate-500">
                    Total Keseluruhan
                  </td>
                  <td className="px-4 py-3 text-right text-rose-600 font-extrabold text-sm">
                    -{totalQuantity.toLocaleString("id-ID")}
                  </td>
                  <td className="px-4 py-3"></td>
                  <td className="px-4 py-3 text-right font-black text-sm">
                    {formatCurrency(totalValue)}
                  </td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

    </div>
  );
}
