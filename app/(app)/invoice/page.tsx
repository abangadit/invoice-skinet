"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { 
  FileText, 
  Plus, 
  Search, 
  Trash2, 
  Edit2, 
  Eye, 
  Calendar,
  AlertCircle,
  Clock,
  CheckCircle2,
  Send,
  BellRing
} from "lucide-react";
import { useBusiness } from "../../../lib/context/BusinessContext";
import { createWebBrowserClient } from "../../../lib/supabase/client";
import Pagination from "../../../components/Pagination";

interface Invoice {
  id: string;
  invoice_number: string;
  customer_snapshot: any;
  status: string;
  issue_date: string;
  due_date: string | null;
  total_amount: number;
  paid_amount: number;
  remaining_amount: number;
  currency: string;
}

export default function InvoiceListPage() {
  const { activeBusiness } = useBusiness();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("Semua");
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showClearModal, setShowClearModal] = useState(false);
  const [clearConfirmText, setClearConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    setCurrentPage(1);
    setSelectedIds([]);
  }, [search, statusFilter]);

  const fetchInvoices = async () => {
    if (!activeBusiness) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const supabase = createWebBrowserClient();

      const { data, error } = await supabase
        .from("invoices")
        .select("id, invoice_number, status, total_amount, paid_amount, remaining_amount, issue_date, due_date, currency, customer_snapshot")
        .eq("business_id", activeBusiness.id)
        .eq("type", "invoice")
        .order("issue_date", { ascending: false });

      if (error) throw error;
      setInvoices(data || []);
    } catch (err) {
      console.error("Error fetching invoices:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, [activeBusiness]);

  const handleDelete = async (id: string, number: string) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus Invoice ${number}? Transaksi keuangan & stok terkait akan dibersihkan.`)) return;
    try {
      const supabase = createWebBrowserClient();
      const { error } = await supabase.rpc("delete_invoices_batch", {
        p_business_id: activeBusiness?.id,
        p_invoice_ids: [id]
      });

      if (error) {
        // Fallback
        const { error: err2 } = await supabase.from("invoices").delete().eq("id", id);
        if (err2) throw err2;
      }

      setSelectedIds((prev) => prev.filter((i) => i !== id));
      fetchInvoices();
    } catch (err) {
      console.error("Error deleting invoice:", err);
      alert("Gagal menghapus invoice.");
    }
  };

  const handleSelectAll = (currentPageInvoices: Invoice[]) => {
    const pageIds = currentPageInvoices.map((inv) => inv.id);
    const allSelected = pageIds.every((id) => selectedIds.includes(id));

    if (allSelected) {
      setSelectedIds((prev) => prev.filter((id) => !pageIds.includes(id)));
    } else {
      setSelectedIds((prev) => Array.from(new Set([...prev, ...pageIds])));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0 || !activeBusiness) return;
    if (!confirm(`Apakah Anda yakin ingin menghapus ${selectedIds.length} invoice yang dipilih? Seluruh stok yang terpotong & jurnal keuangan terkait akan dikembalikan/dibersihkan.`)) return;
    try {
      setDeleting(true);
      const supabase = createWebBrowserClient();
      const { error } = await supabase.rpc("delete_invoices_batch", {
        p_business_id: activeBusiness.id,
        p_invoice_ids: selectedIds
      });

      if (error) {
        // Fallback
        const { error: err2 } = await supabase.from("invoices").delete().in("id", selectedIds);
        if (err2) throw err2;
      }

      setSelectedIds([]);
      fetchInvoices();
      alert(`Berhasil menghapus ${selectedIds.length} invoice.`);
    } catch (err) {
      console.error("Error bulk deleting invoices:", err);
      alert("Gagal menghapus invoice masal.");
    } finally {
      setDeleting(false);
    }
  };

  const handleClearAllInvoices = async () => {
    if (!activeBusiness) return;
    if (clearConfirmText.trim().toUpperCase() !== "HAPUS") {
      alert("Kata konfirmasi tidak cocok. Ketik HAPUS untuk melanjutkan.");
      return;
    }

    try {
      setDeleting(true);
      const supabase = createWebBrowserClient();
      const { error } = await supabase.rpc("clear_business_invoices", {
        p_business_id: activeBusiness.id
      });

      if (error) {
        // Fallback
        const { error: err2 } = await supabase.from("invoices").delete().eq("business_id", activeBusiness.id);
        if (err2) throw err2;
      }

      setShowClearModal(false);
      setClearConfirmText("");
      setSelectedIds([]);
      fetchInvoices();
      alert("Seluruh data invoice & jurnal keuangan terkait berhasil dibersihkan.");
    } catch (err) {
      console.error("Error clearing all invoices:", err);
      alert("Gagal membersihkan data invoice.");
    } finally {
      setDeleting(false);
    }
  };

  const formatCurrency = (val: number, currencyCode: string) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: currencyCode || "IDR",
      maximumFractionDigits: 0
    }).format(val);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-600 border border-emerald-100">
            <CheckCircle2 className="w-3.5 h-3.5" /> Lunas
          </span>
        );
      case "partial":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-600 border border-amber-100">
            <Clock className="w-3.5 h-3.5" /> Belum Lunas
          </span>
        );
      case "overdue":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-600 border border-rose-100">
            <AlertCircle className="w-3.5 h-3.5" /> Terlambat
          </span>
        );
      case "sent":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-600 border border-blue-100">
            <Send className="w-3.5 h-3.5" /> Dikirim
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">
            <FileText className="w-3.5 h-3.5" /> Draft
          </span>
        );
    }
  };

  const filteredInvoices = invoices.filter((inv) => {
    const custName = inv.customer_snapshot?.name || "Pelanggan Umum";
    const matchesSearch = 
      inv.invoice_number.toLowerCase().includes(search.toLowerCase()) || 
      custName.toLowerCase().includes(search.toLowerCase());

    const matchesFilter = 
      statusFilter === "Semua" || 
      (statusFilter === "Draft" && inv.status === "draft") ||
      (statusFilter === "Dikirim" && inv.status === "sent") ||
      (statusFilter === "Lunas" && inv.status === "paid") ||
      (statusFilter === "Belum Lunas" && inv.status === "partial") ||
      (statusFilter === "Terlambat" && inv.status === "overdue");

    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            Invoices
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">Kelola dan pantau semua tagihan pelanggan Anda.</p>
        </div>
        <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto flex-wrap">
          <button
            onClick={() => setShowClearModal(true)}
            className="bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold py-2.5 px-3 rounded-xl text-sm flex items-center justify-center gap-1.5 border border-rose-200 transition"
            title="Bersihkan seluruh data invoice"
          >
            <Trash2 className="w-4 h-4" /> Bersihkan Data Invoice
          </button>
          <Link
            href="/invoice/due"
            className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-semibold py-2.5 px-4 rounded-xl text-sm flex items-center justify-center gap-1.5 shadow-sm transition"
          >
            <BellRing className="w-4 h-4 text-amber-500" /> Invoice Due
          </Link>
          <Link
            href="/invoice/new"
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 px-4 rounded-xl text-sm flex items-center justify-center gap-1.5 shadow-sm transition"
          >
            <Plus className="w-4 h-4" /> Buat Invoice
          </Link>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari invoice atau pelanggan..."
            className="w-full bg-white border border-slate-200 pl-10 pr-4 py-2.5 rounded-xl text-sm placeholder-slate-400 focus:outline-none focus:border-blue-500 transition shadow-sm"
          />
        </div>
        
        <div className="flex gap-1 overflow-x-auto pb-1 shrink-0 bg-white p-1 border border-slate-200 rounded-xl shadow-sm scrollbar-none">
          {["Semua", "Draft", "Dikirim", "Lunas", "Belum Lunas", "Terlambat"].map((pill) => (
            <button
              key={pill}
              onClick={() => setStatusFilter(pill)}
              className={`px-4 py-1.5 text-xs font-bold rounded-lg transition shrink-0 ${
                statusFilter === pill 
                  ? "bg-blue-600 text-white shadow-sm" 
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              {pill}
            </button>
          ))}
        </div>
      </div>

      {/* Bulk Action Bar */}
      {selectedIds.length > 0 && (
        <div className="bg-rose-50 border border-rose-200 px-4 py-2.5 rounded-xl flex items-center justify-between gap-3 animate-fadeIn">
          <span className="text-xs font-bold text-rose-800">
            {selectedIds.length} invoice dipilih (Stok & Jurnal Keuangan akan dibersihkan otomatis)
          </span>
          <button
            onClick={handleBulkDelete}
            disabled={deleting}
            className="bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-bold px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 transition shadow-sm"
          >
            <Trash2 className="w-3.5 h-3.5" /> Hapus Terpilih
          </button>
        </div>
      )}

      {/* Select All Row Bar */}
      {filteredInvoices.length > 0 && (
        <div className="bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-xl flex items-center justify-between">
          <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={
                filteredInvoices
                  .slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
                  .every((inv) => selectedIds.includes(inv.id))
              }
              onChange={() =>
                handleSelectAll(
                  filteredInvoices.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
                )
              }
              className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            Pilih Semua di Halaman Ini ({filteredInvoices.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE).length} invoice)
          </label>
          <span className="text-[11px] font-semibold text-slate-500">
            Total {filteredInvoices.length} Invoice
          </span>
        </div>
      )}

      {/* Invoices List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs text-slate-500 font-semibold mt-2">Memuat invoice...</p>
        </div>
      ) : filteredInvoices.length > 0 ? (
        <div className="space-y-3">
          {filteredInvoices.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE).map((inv) => (
            <div 
              key={inv.id} 
              className={`bg-white border p-5 rounded-2xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 card-shadow-hover transition ${
                selectedIds.includes(inv.id) ? "border-blue-400 bg-blue-50/20" : "border-slate-200"
              }`}
            >
              <div className="flex items-start gap-3 flex-1">
                <input
                  type="checkbox"
                  checked={selectedIds.includes(inv.id)}
                  onChange={() => toggleSelect(inv.id)}
                  className="mt-1 w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 shrink-0">
                  <FileText className="w-5.5 h-5.5 text-blue-600" />
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
                    {inv.invoice_number}
                  </span>
                  <h4 className="font-bold text-slate-900 text-sm">
                    {inv.customer_snapshot?.name || "Pelanggan Umum"}
                  </h4>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" /> Issued: {inv.issue_date}
                    </span>
                    {inv.due_date && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" /> Due: {inv.due_date}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t sm:border-t-0 border-slate-100 pt-3 sm:pt-0 gap-3">
                <div className="sm:text-right">
                  {getStatusBadge(inv.status)}
                  <div className="text-lg font-extrabold text-slate-900 mt-1">
                    {formatCurrency(inv.total_amount, inv.currency)}
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <Link 
                    href={`/invoice/${inv.id}`}
                    className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                    title="Lihat Detail"
                  >
                    <Eye className="w-4 h-4" />
                  </Link>
                  <Link 
                    href={`/invoice/${inv.id}/edit`}
                    className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition"
                    title="Ubah"
                  >
                    <Edit2 className="w-4 h-4" />
                  </Link>
                  <button 
                    onClick={() => handleDelete(inv.id, inv.invoice_number)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                    title="Hapus"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
          <Pagination
            currentPage={currentPage}
            totalItems={filteredInvoices.length}
            pageSize={PAGE_SIZE}
            onPageChange={setCurrentPage}
          />
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-400 shadow-sm">
          <FileText className="w-12 h-12 mx-auto text-slate-200 mb-3" />
          <p className="text-sm font-semibold">Tidak ada invoice ditemukan</p>
          <Link 
            href="/invoice/new"
            className="text-xs font-bold text-blue-600 hover:underline mt-1 inline-block"
          >
            Buat Invoice Baru
          </Link>
        </div>
      )}

      {/* CLEAR ALL INVOICES MODAL */}
      {showClearModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-rose-200 rounded-2xl max-w-md w-full overflow-hidden shadow-2xl animate-scaleIn">
            <div className="bg-rose-50 px-6 py-4 border-b border-rose-100 flex items-center justify-between">
              <div className="flex items-center gap-2 text-rose-700">
                <Trash2 className="w-5 h-5" />
                <h3 className="text-base font-bold">Bersihkan Seluruh Data Invoice</h3>
              </div>
              <button 
                onClick={() => {
                  setShowClearModal(false);
                  setClearConfirmText("");
                }}
                className="p-1 text-slate-400 hover:text-slate-700 hover:bg-rose-100 rounded-lg transition"
              >
                <AlertCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-xs text-slate-600 leading-relaxed">
                Tindakan ini akan <strong>menghapus seluruh data invoice</strong> di usaha ini, memulihkan kuantitas stok produk yang pernah terpotong, serta membersihkan seluruh entri jurnal keuangan & transaksi pajak terkait.
              </p>
              <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl text-[11px] text-amber-800 font-medium leading-normal">
                ⚠️ PERHATIAN: Seluruh laporan keuangan (Laba Rugi, Buku Besar, Neraca, PPN/PPh 23) akan disesuaikan bersih dari invoice yang dihapus.
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-700 block">
                  Ketik kata <span className="text-rose-600 font-mono font-extrabold">HAPUS</span> untuk konfirmasi:
                </label>
                <input
                  type="text"
                  value={clearConfirmText}
                  onChange={(e) => setClearConfirmText(e.target.value)}
                  placeholder="Ketik HAPUS"
                  className="w-full border border-slate-300 px-3 py-2 rounded-xl text-sm font-bold placeholder-slate-400 focus:outline-none focus:border-rose-500 transition"
                />
              </div>

              <div className="flex items-center gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowClearModal(false);
                    setClearConfirmText("");
                  }}
                  className="flex-1 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold rounded-xl text-xs transition"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={clearConfirmText.trim().toUpperCase() !== "HAPUS" || deleting}
                  onClick={handleClearAllInvoices}
                  className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-40 text-white font-bold rounded-xl text-xs shadow-md transition flex items-center justify-center gap-1.5"
                >
                  {deleting ? "Membersihkan..." : "Bersihkan Seluruh Invoice"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
