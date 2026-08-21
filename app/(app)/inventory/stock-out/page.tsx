"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { 
  Package, 
  Warehouse, 
  Printer, 
  FileText, 
  Check, 
  X, 
  AlertCircle, 
  Search, 
  Plus, 
  Calendar, 
  User, 
  TrendingDown, 
  ArrowUpRight,
  Filter
} from "lucide-react";
import { createWebBrowserClient } from "../../../../lib/supabase/client";
import { useBusiness } from "../../../../lib/context/BusinessContext";

const REASONS = [
  { value: "expired", label: "Kadaluarsa (Expired)", badgeColor: "bg-amber-50 text-amber-700 border-amber-200" },
  { value: "damaged", label: "Rusak / Cacat (Damaged)", badgeColor: "bg-rose-50 text-rose-700 border-rose-200" },
  { value: "internal_use", label: "Pemakaian Internal / Operasional", badgeColor: "bg-blue-50 text-blue-700 border-blue-200" },
  { value: "sample", label: "Sample / Tester / Promosi", badgeColor: "bg-purple-50 text-purple-700 border-purple-200" },
  { value: "loss", label: "Hilang / Selisih Fisik", badgeColor: "bg-slate-100 text-slate-700 border-slate-300" },
  { value: "other", label: "Lainnya", badgeColor: "bg-slate-50 text-slate-600 border-slate-200" },
];

export default function StockOutPage() {
  const { activeBusiness } = useBusiness();
  const [items, setItems] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [searchHistory, setSearchHistory] = useState("");
  const [filterReason, setFilterReason] = useState("all");

  // Form states
  const [itemId, setItemId] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("damaged");
  const [recipientName, setRecipientName] = useState("");
  const [notes, setNotes] = useState("");
  const [outDate, setOutDate] = useState(new Date().toISOString().split("T")[0]);
  
  const [loading, setLoading] = useState(false);
  const [fetchingHistory, setFetchingHistory] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Print modal state
  const [printDoc, setPrintDoc] = useState<any | null>(null);
  const [showPrintModal, setShowPrintModal] = useState(false);

  const fetchItems = async () => {
    if (!activeBusiness) return;
    const supabase = createWebBrowserClient();
    const { data } = await supabase
      .from("items")
      .select("id, name, unit, stock_quantity, cogs_unit_price")
      .eq("business_id", activeBusiness.id)
      .order("name");
    setItems(data || []);
  };

  const fetchWarehouses = async () => {
    if (!activeBusiness) return;
    const supabase = createWebBrowserClient();
    const { data } = await supabase
      .from("warehouses")
      .select("id, name, code, address")
      .eq("business_id", activeBusiness.id)
      .order("name");
    setWarehouses(data || []);
    if (data && data.length > 0 && !warehouseId) {
      setWarehouseId(data[0].id);
    }
  };

  const fetchHistory = async () => {
    if (!activeBusiness) return;
    setFetchingHistory(true);
    const supabase = createWebBrowserClient();
    const { data } = await supabase
      .from("stock_out")
      .select(`
        *,
        items (name, unit, cogs_unit_price),
        warehouses (name, code)
      `)
      .eq("business_id", activeBusiness.id)
      .order("created_at", { ascending: false })
      .limit(100);
    setHistory(data || []);
    setFetchingHistory(false);
  };

  useEffect(() => {
    fetchItems();
    fetchWarehouses();
    fetchHistory();
  }, [activeBusiness]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBusiness || !itemId || !quantity) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/stock-out", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          business_id: activeBusiness.id,
          item_id: itemId,
          warehouse_id: warehouseId || null,
          quantity: parseFloat(quantity),
          reason,
          recipient_name: recipientName,
          notes,
          out_date: outDate,
        }),
      });

      const result = await res.json();
      if (!res.ok) {
        setError(result.error || "Gagal menyimpan pengeluaran barang.");
      } else {
        setSuccess(true);
        setItemId("");
        setQuantity("");
        setNotes("");
        setRecipientName("");
        setReason("damaged");
        fetchHistory();
        fetchItems();

        // Siapkan dokumen yang baru dibuat untuk langsung bisa dicetak
        if (result.data) {
          setPrintDoc(result.data);
          setShowPrintModal(true);
        }
        setTimeout(() => setSuccess(false), 4000);
      }
    } catch (err: any) {
      setError(err.message || "Terjadi kesalahan koneksi.");
    } finally {
      setLoading(false);
    }
  };

  const openPrintModal = (item: any) => {
    setPrintDoc(item);
    setShowPrintModal(true);
  };

  const handlePrint = () => {
    window.print();
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: activeBusiness?.default_currency || "IDR",
      maximumFractionDigits: 0
    }).format(val);
  };

  // Filter history
  const filteredHistory = history.filter((row) => {
    const matchSearch = 
      (row.items?.name || "").toLowerCase().includes(searchHistory.toLowerCase()) ||
      (row.stock_out_number || "").toLowerCase().includes(searchHistory.toLowerCase()) ||
      (row.recipient_name || "").toLowerCase().includes(searchHistory.toLowerCase()) ||
      (row.notes || "").toLowerCase().includes(searchHistory.toLowerCase());
    
    const matchReason = filterReason === "all" || row.reason === filterReason;
    return matchSearch && matchReason;
  });

  return (
    <div className="space-y-6">
      
      {/* Header & Quick Links */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
            <TrendingDown className="w-6 h-6 text-rose-600" />
            Barang Keluar (Stock Out)
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Catat pengeluaran barang non-invoice (rusak, sample, pemakaian internal) lengkap dengan surat jalan pengeluaran & pengurangan stok otomatis.
          </p>
        </div>
        
        <Link
          href="/reports/stock-out"
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-sm transition shrink-0"
        >
          <FileText className="w-4 h-4 text-blue-400" />
          Lihat Laporan Barang Keluar
          <ArrowUpRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Form Input Barang Keluar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-2 pb-4 mb-4 border-b border-slate-100">
          <Plus className="w-4 h-4 text-blue-600" />
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
            Form Catat Pengeluaran Barang
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* Produk */}
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
                <span>Pilih Produk *</span>
                {itemId && items.find(i => i.id === itemId) && (
                  <span className="text-[11px] text-blue-600 font-semibold normal-case">
                    Sisa Stok: {items.find(i => i.id === itemId)?.stock_quantity} {items.find(i => i.id === itemId)?.unit}
                  </span>
                )}
              </label>
              <select
                required
                value={itemId}
                onChange={(e) => setItemId(e.target.value)}
                className="w-full border border-slate-200 px-3.5 py-2.5 rounded-xl text-sm font-medium focus:outline-none focus:border-blue-500 bg-white"
              >
                <option value="">-- Pilih Produk yang Keluar --</option>
                {items.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} (Stok: {item.stock_quantity} {item.unit})
                  </option>
                ))}
              </select>
            </div>

            {/* Gudang Sumber */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                <Warehouse className="w-3.5 h-3.5 text-slate-400" />
                <span>Gudang Sumber *</span>
              </label>
              <select
                value={warehouseId}
                onChange={(e) => setWarehouseId(e.target.value)}
                className="w-full border border-slate-200 px-3.5 py-2.5 rounded-xl text-sm font-medium focus:outline-none focus:border-blue-500 bg-white"
              >
                {warehouses.length > 0 ? (
                  warehouses.map((wh) => (
                    <option key={wh.id} value={wh.id}>
                      {wh.name} {wh.code ? `(${wh.code})` : ""}
                    </option>
                  ))
                ) : (
                  <option value="">Gudang Utama</option>
                )}
              </select>
            </div>

            {/* Jumlah Keluar */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Jumlah Keluar *
              </label>
              <input
                type="number"
                required
                min="0.01"
                step="any"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="0"
                className="w-full border border-slate-200 px-3.5 py-2.5 rounded-xl text-sm font-medium focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Alasan Keluar */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Kategori / Alasan *
              </label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full border border-slate-200 px-3.5 py-2.5 rounded-xl text-sm font-medium focus:outline-none focus:border-blue-500 bg-white"
              >
                {REASONS.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>

            {/* Tanggal Keluar */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>Tanggal Keluar *</span>
              </label>
              <input
                type="date"
                required
                value={outDate}
                onChange={(e) => setOutDate(e.target.value)}
                className="w-full border border-slate-200 px-3.5 py-2.5 rounded-xl text-sm font-medium focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Penerima / PIC */}
            <div className="space-y-1.5 md:col-span-1">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span>Penerima / PIC (Opsional)</span>
              </label>
              <input
                type="text"
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                placeholder="Contoh: Bpk. Joko (QC) / Tim Marketing"
                className="w-full border border-slate-200 px-3.5 py-2.5 rounded-xl text-sm font-medium focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Catatan */}
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Catatan / Keterangan Tambahan
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Misal: Nomor Berita Acara Kerusakan, Keperluan Sample Klien, dll."
                className="w-full border border-slate-200 px-3.5 py-2.5 rounded-xl text-sm font-medium focus:outline-none focus:border-blue-500"
              />
            </div>

          </div>

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-xs font-bold text-rose-600 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          {success && (
            <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-xs font-bold text-emerald-700 flex items-center gap-2">
              <Check className="w-4 h-4 shrink-0" />
              Pengeluaran barang berhasil dicatat! Stok gudang telah terpotong otomatis.
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-sm transition shadow-sm flex items-center gap-2"
            >
              {loading ? (
                <span>Menyimpan...</span>
              ) : (
                <>
                  <TrendingDown className="w-4 h-4" />
                  Simpan & Potong Stok
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Tabel Riwayat Barang Keluar */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        
        {/* Toolbar Pencarian & Filter */}
        <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-slate-500" />
            <h3 className="text-sm font-bold text-slate-800">Riwayat Pengeluaran Barang</h3>
            <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 text-[10px] font-bold">
              {filteredHistory.length}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[200px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari produk / no. doc..."
                value={searchHistory}
                onChange={(e) => setSearchHistory(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-blue-500 bg-white"
              />
            </div>

            <select
              value={filterReason}
              onChange={(e) => setFilterReason(e.target.value)}
              className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-blue-500 bg-white"
            >
              <option value="all">Semua Alasan</option>
              {REASONS.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Tabel */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-100">
              <tr>
                <th className="px-4 py-3">No. Dokumen</th>
                <th className="px-4 py-3">Tanggal</th>
                <th className="px-4 py-3">Gudang</th>
                <th className="px-4 py-3">Produk</th>
                <th className="px-4 py-3 text-right">Jumlah</th>
                <th className="px-4 py-3 text-right">Est. HPP Satuan</th>
                <th className="px-4 py-3">Alasan</th>
                <th className="px-4 py-3">Penerima / Catatan</th>
                <th className="px-4 py-3 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {filteredHistory.map((row) => {
                const reasonMeta = REASONS.find(r => r.value === row.reason);
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
                    <td className="px-4 py-3 text-right text-slate-500 font-semibold">
                      {formatCurrency(Number(row.unit_cost || 0))}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${reasonMeta?.badgeColor || "bg-slate-50 text-slate-600 border-slate-200"}`}>
                        {reasonMeta?.label.split(" (")[0] || row.reason}
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
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => openPrintModal(row)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-lg text-xs transition border border-blue-200 shadow-sm"
                        title="Cetak Surat Pengeluaran Barang"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        Cetak
                      </button>
                    </td>
                  </tr>
                );
              })}

              {!fetchingHistory && filteredHistory.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-slate-400">
                    <Package className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    <p className="font-semibold">Belum ada data pengeluaran barang</p>
                  </td>
                </tr>
              )}

              {fetchingHistory && (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-slate-400 font-semibold">
                    Memuat riwayat barang keluar...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL CETAK / PRINT SURAT PENGELUARAN BARANG (MIRIP SURAT JALAN) */}
      {showPrintModal && printDoc && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto print:p-0 print:bg-white">
          <div className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden print:shadow-none print:w-full print:max-w-none print:rounded-none">
            
            {/* Modal Action Header (Hidden saat dicetak) */}
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between print:hidden">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5 text-blue-400" />
                <h3 className="text-sm font-bold">Pratinjau Surat Pengeluaran Barang (Stock Out Slip)</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrint}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs transition flex items-center gap-1.5 shadow-sm"
                >
                  <Printer className="w-4 h-4" />
                  Cetak Dokumen
                </button>
                <button
                  onClick={() => setShowPrintModal(false)}
                  className="p-2 text-slate-400 hover:text-white rounded-lg transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* AREA DOKUMEN CETAK (A4 Style) */}
            <div className="p-8 sm:p-10 space-y-6 text-slate-900 bg-white" id="printable-stock-out-area">
              
              {/* Header Dokumen / Kop Perusahaan */}
              <div className="flex justify-between items-start border-b-2 border-slate-900 pb-4">
                <div className="space-y-1">
                  <h2 className="text-xl font-black tracking-tight text-slate-900 uppercase">
                    {activeBusiness?.name || "Perusahaan"}
                  </h2>
                  <p className="text-xs text-slate-600 max-w-sm leading-relaxed">
                    {activeBusiness?.address || "Alamat Perusahaan"}
                  </p>
                  {activeBusiness?.phone && (
                    <p className="text-xs text-slate-600">Telp: {activeBusiness.phone}</p>
                  )}
                </div>

                <div className="text-right space-y-1">
                  <div className="inline-block px-3 py-1 bg-slate-900 text-white font-extrabold text-xs uppercase tracking-wider rounded">
                    SURAT PENGELUARAN BARANG
                  </div>
                  <p className="text-xs font-mono font-bold text-slate-700">
                    No: {printDoc.stock_out_number || "OUT-" + printDoc.id.slice(0, 8)}
                  </p>
                  <p className="text-xs text-slate-500 font-semibold">
                    Tanggal: {new Date(printDoc.out_date).toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" })}
                  </p>
                </div>
              </div>

              {/* Info Detail Dokumen */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-xl text-xs border border-slate-200">
                <div className="space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-semibold">Gudang Asal:</span>
                    <span className="font-bold text-slate-900">{printDoc.warehouses?.name || "Gudang Utama"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-semibold">Kategori / Alasan:</span>
                    <span className="font-bold text-rose-700 uppercase">
                      {REASONS.find(r => r.value === printDoc.reason)?.label || printDoc.reason}
                    </span>
                  </div>
                </div>

                <div className="space-y-1.5 border-l border-slate-200 pl-4">
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-semibold">Penerima / PIC:</span>
                    <span className="font-bold text-slate-900">{printDoc.recipient_name || "-"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-semibold">Status Dokumen:</span>
                    <span className="font-bold text-emerald-700">STOK TERPOTONG (FINAL)</span>
                  </div>
                </div>
              </div>

              {/* Tabel Rincian Barang Keluar */}
              <div className="border border-slate-300 rounded-lg overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 font-bold text-slate-800 uppercase tracking-wider border-b border-slate-300">
                    <tr>
                      <th className="py-2.5 px-3 w-10 text-center">No</th>
                      <th className="py-2.5 px-3">Nama Barang</th>
                      <th className="py-2.5 px-3 text-center w-28">Jumlah Keluar</th>
                      <th className="py-2.5 px-3">Catatan / Keterangan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-semibold text-slate-800">
                    <tr>
                      <td className="py-3 px-3 text-center text-slate-500 font-bold">1</td>
                      <td className="py-3 px-3">
                        <div className="font-bold text-sm text-slate-900">{printDoc.items?.name || "Produk"}</div>
                        <div className="text-[10px] text-slate-500 font-mono">ID: {printDoc.item_id.slice(0, 8)}</div>
                      </td>
                      <td className="py-3 px-3 text-center text-sm font-extrabold text-slate-900">
                        {printDoc.quantity} {printDoc.items?.unit || "pcs"}
                      </td>
                      <td className="py-3 px-3 text-slate-600 font-medium">
                        {printDoc.notes || "-"}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Catatan Khusus */}
              <div className="p-3 border border-dashed border-slate-300 rounded-lg text-xs text-slate-600 space-y-1">
                <span className="font-bold text-slate-800 uppercase text-[10px] block">Keterangan:</span>
                <p className="text-[11px] leading-relaxed">
                  Surat Pengeluaran Barang ini merupakan bukti resmi berkurangnya kuantitas fisik persediaan dari gudang dan diakui dalam laporan mutasi persediaan perusahaan.
                </p>
              </div>

              {/* Kolom Tanda Tangan (3 Pihak) */}
              <div className="pt-8 grid grid-cols-3 gap-6 text-center text-xs font-bold text-slate-700 uppercase tracking-wider">
                <div>
                  <p className="text-[11px] text-slate-500">Dikeluarkan Oleh,</p>
                  <p className="text-[10px] text-slate-400 font-normal mt-0.5">(Petugas Gudang)</p>
                  <div className="h-20"></div>
                  <p className="border-t border-slate-400 pt-1 mx-4 text-slate-800 font-bold">
                    ( ............................ )
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-slate-500">Diterima / PIC,</p>
                  <p className="text-[10px] text-slate-400 font-normal mt-0.5">(Penerima Barang)</p>
                  <div className="h-20"></div>
                  <p className="border-t border-slate-400 pt-1 mx-4 text-slate-800 font-bold">
                    {printDoc.recipient_name ? `( ${printDoc.recipient_name} )` : "( ............................ )"}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-slate-500">Mengetahui / Disetujui,</p>
                  <p className="text-[10px] text-slate-400 font-normal mt-0.5">(Kepala Gudang / Supervisor)</p>
                  <div className="h-20"></div>
                  <p className="border-t border-slate-400 pt-1 mx-4 text-slate-800 font-bold">
                    ( ............................ )
                  </p>
                </div>
              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
}
