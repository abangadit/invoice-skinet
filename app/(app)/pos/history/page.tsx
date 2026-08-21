"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { 
  ArrowLeft, 
  History, 
  Search, 
  Clock, 
  Coins, 
  Package, 
  FileText, 
  Eye, 
  X, 
  Calendar,
  User,
  CreditCard,
  Printer,
  AlertCircle
} from "lucide-react";
import { useBusiness } from "../../../../lib/context/BusinessContext";
import { createWebBrowserClient } from "../../../../lib/supabase/client";
import Pagination from "../../../../components/Pagination";

interface POSInvoice {
  id: string;
  invoice_number: string;
  total_amount: number;
  payment_methods: string[];
  created_at: string;
  customer_snapshot: any;
  loyalty_points_redeemed: number;
  loyalty_points_earned: number;
  pos_shifts: {
    id: string;
    employees: {
      id: string;
      name: string;
    } | null;
  } | null;
}

interface Employee {
  id: string;
  name: string;
}

interface InvoiceItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  unit_price: number;
  subtotal: number;
}

export default function POSHistoryPage() {
  const router = useRouter();
  const { activeBusiness, userRole, loading: businessLoading } = useBusiness();

  // Data States
  const [invoices, setInvoices] = useState<POSInvoice[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Detail Modal States
  const [selectedInvoice, setSelectedInvoice] = useState<POSInvoice | null>(null);
  const [selectedInvoiceItems, setSelectedInvoiceItems] = useState<InvoiceItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [printMode, setPrintMode] = useState<"thermal" | "a4">("thermal");

  // Filters State
  const [search, setSearch] = useState("");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("All");
  const [dateFilter, setDateFilter] = useState<"today" | "week" | "month" | "custom">("month");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;

  useEffect(() => {
    setCurrentPage(1);
  }, [search, selectedEmployeeId, dateFilter, startDate, endDate]);

  const fetchData = async () => {
    if (!activeBusiness) return;
    try {
      setLoading(true);
      const supabase = createWebBrowserClient();

      // 1. Fetch Invoices matching POS signature
      const { data: invData, error: invError } = await supabase
        .from("invoices")
        .select(`
          id,
          invoice_number,
          total_amount,
          payment_methods,
          created_at,
          customer_snapshot,
          loyalty_points_redeemed,
          loyalty_points_earned,
          pos_shifts (
            id,
            employees (
              id,
              name
            )
          )
        `)
        .eq("business_id", activeBusiness.id)
        .or("invoice_number.ilike.POS-%,pos_shift_id.not.is.null")
        .order("created_at", { ascending: false });

      if (invError) throw invError;
      setInvoices((invData as any[]) || []);

      // 2. Fetch Employees for filters
      const { data: empData, error: empError } = await supabase
        .from("employees")
        .select("id, name")
        .eq("business_id", activeBusiness.id)
        .eq("is_active", true);

      if (empError) throw empError;
      setEmployees(empData || []);

    } catch (err) {
      console.error("Error loading POS history:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeBusiness) {
      fetchData();
    }
  }, [activeBusiness]);

  // Load Items on modal view
  const fetchInvoiceItems = async (invId: string) => {
    try {
      setLoadingItems(true);
      const supabase = createWebBrowserClient();
      const { data, error } = await supabase
        .from("invoice_items")
        .select("*")
        .eq("invoice_id", invId)
        .order("sort_order", { ascending: true });

      if (error) throw error;
      setSelectedInvoiceItems(data || []);
    } catch (err) {
      console.error("Error loading invoice items:", err);
    } finally {
      setLoadingItems(false);
    }
  };

  const handleOpenDetail = (inv: POSInvoice) => {
    setSelectedInvoice(inv);
    fetchInvoiceItems(inv.id);
    setShowDetailModal(true);
  };

  // 360 Filtering logic
  const filteredInvoices = invoices.filter((inv) => {
    // A. Search Match
    const custName = inv.customer_snapshot?.name || "Pelanggan Umum";
    const matchesSearch = 
      inv.invoice_number.toLowerCase().includes(search.toLowerCase()) || 
      custName.toLowerCase().includes(search.toLowerCase());

    // B. Cashier Match
    let matchesCashier = true;
    if (selectedEmployeeId !== "All") {
      const cashierId = inv.pos_shifts?.employees?.id;
      matchesCashier = cashierId === selectedEmployeeId;
    }

    // C. Date Match
    let matchesDate = true;
    const invDate = new Date(inv.created_at);
    const today = new Date();
    
    if (dateFilter === "today") {
      matchesDate = invDate.toDateString() === today.toDateString();
    } else if (dateFilter === "week") {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(today.getDate() - 7);
      matchesDate = invDate >= oneWeekAgo && invDate <= today;
    } else if (dateFilter === "month") {
      matchesDate = 
        invDate.getMonth() === today.getMonth() && 
        invDate.getFullYear() === today.getFullYear();
    } else if (dateFilter === "custom") {
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        matchesDate = matchesDate && invDate >= start;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        matchesDate = matchesDate && invDate <= end;
      }
    }

    return matchesSearch && matchesCashier && matchesDate;
  });

  // Load items sold only on the current filtered list for calculation
  const [totalItemsSold, setTotalItemsSold] = useState(0);
  const [calculatingStock, setCalculatingStock] = useState(false);

  useEffect(() => {
    const calculateStockOut = async () => {
      if (filteredInvoices.length === 0) {
        setTotalItemsSold(0);
        return;
      }
      try {
        setCalculatingStock(true);
        const supabase = createWebBrowserClient();
        const ids = filteredInvoices.map(i => i.id);
        
        // Batch query to sum up items sold
        const { data, error } = await supabase
          .from("invoice_items")
          .select("quantity")
          .in("invoice_id", ids);

        if (error) throw error;
        const total = (data || []).reduce((acc, item) => acc + Number(item.quantity || 0), 0);
        setTotalItemsSold(total);
      } catch (err) {
        console.error("Error calculating stock quantity sold:", err);
      } finally {
        setCalculatingStock(false);
      }
    };

    calculateStockOut();
  }, [invoices, search, selectedEmployeeId, dateFilter, startDate, endDate]);

  // Aggregate stats
  const totalSales = filteredInvoices.reduce((acc, inv) => acc + Number(inv.total_amount || 0), 0);
  const totalTransactions = filteredInvoices.length;

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: activeBusiness?.default_currency || "IDR",
      maximumFractionDigits: 0
    }).format(val);
  };

  if (businessLoading || loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <span className="text-xs font-semibold text-slate-500 mt-3">Memuat riwayat transaksi kasir...</span>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header breadcrumb */}
      <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
        <button onClick={() => router.push("/pos")} className="hover:text-blue-600 transition flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" /> POS Kasir
        </button>
        <span>/</span>
        <span className="text-slate-850">Riwayat Penjualan POS</span>
      </div>

      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <History className="w-6 h-6 text-blue-600" /> Riwayat Penjualan POS
          </h2>
          <p className="text-sm text-slate-500 mt-1 font-medium">
            Pantau performa penjualan kasir, jumlah barang terjual, dan cetak ulang struk transaksi.
          </p>
        </div>
      </div>

      {/* Metrics Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-center gap-4 card-shadow-hover transition">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 shrink-0">
            <Coins className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block uppercase font-bold tracking-wider">Total Omset POS</span>
            <span className="text-xl font-extrabold text-slate-900">{formatCurrency(totalSales)}</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-center gap-4 card-shadow-hover transition">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 shrink-0">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block uppercase font-bold tracking-wider">Total Item Terjual (Stok Keluar)</span>
            <span className="text-xl font-extrabold text-slate-900">
              {calculatingStock ? "Menghitung..." : `${totalItemsSold.toLocaleString("id-ID")} Pcs`}
            </span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-center gap-4 card-shadow-hover transition">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100 shrink-0">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block uppercase font-bold tracking-wider">Jumlah Nota Transaksi</span>
            <span className="text-xl font-extrabold text-slate-900">{totalTransactions.toLocaleString("id-ID")} Nota</span>
          </div>
        </div>
      </div>

      {/* Filters Area */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* A. Search Text */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nomor nota atau pelanggan..."
              className="w-full bg-slate-50 border border-slate-250 pl-10 pr-4 py-2.5 rounded-xl text-xs placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition font-semibold"
            />
          </div>

          {/* B. Cashier Filter Dropdown */}
          <div className="relative">
            <select
              value={selectedEmployeeId}
              onChange={(e) => setSelectedEmployeeId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-250 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-blue-500 focus:bg-white transition cursor-pointer appearance-none"
            >
              <option value="All">Semua Kasir (Staf Karyawan)</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>{emp.name}</option>
              ))}
            </select>
            <div className="absolute right-3.5 top-1/2 transform -translate-y-1/2 pointer-events-none text-slate-400">
              ▼
            </div>
          </div>

          {/* C. Date Quick Filter Pills */}
          <div className="flex gap-1 bg-slate-55 p-1 border border-slate-200 rounded-xl">
            {(["today", "week", "month", "custom"] as const).map((pill) => (
              <button
                key={pill}
                type="button"
                onClick={() => setDateFilter(pill)}
                className={`flex-1 text-center py-1.5 rounded-lg text-[10px] font-extrabold uppercase tracking-wide transition ${
                  dateFilter === pill 
                    ? "bg-blue-600 text-white shadow-sm" 
                    : "text-slate-655 hover:bg-slate-100"
                }`}
              >
                {pill === "today" ? "Hari Ini" : pill === "week" ? "7 Hari" : pill === "month" ? "Bulan Ini" : "Kustom"}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Date Picker Fields (Only visible on custom) */}
        {dateFilter === "custom" && (
          <div className="flex flex-col sm:flex-row gap-3 pt-2 border-t border-slate-100 animate-slide-down">
            <div className="flex-1 flex flex-col gap-1">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Tanggal Mulai</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs text-slate-700 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div className="flex-1 flex flex-col gap-1">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Tanggal Selesai</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs text-slate-700 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
        )}
      </div>

      {/* Transactions Table Section */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="px-6 py-4">Nomor Nota POS</th>
                <th className="px-6 py-4">Tanggal & Waktu</th>
                <th className="px-6 py-4">Kasir / Staf</th>
                <th className="px-6 py-4">Member (Pelanggan)</th>
                <th className="px-6 py-4">Metode Bayar</th>
                <th className="px-6 py-4 text-right">Total Transaksi</th>
                <th className="px-6 py-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400 font-semibold">
                    Tidak ada transaksi penjualan POS yang cocok dengan filter.
                  </td>
                </tr>
              ) : (
                filteredInvoices.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE).map((inv) => {
                  const cashierName = inv.pos_shifts?.employees?.name || "Owner/Admin";
                  const memberName = inv.customer_snapshot?.name || "Pelanggan Umum";
                  const paymentMethodStr = inv.payment_methods?.join(", ") || "Cash";
                  
                  return (
                    <tr key={inv.id} className="hover:bg-slate-50/40 transition">
                      <td className="px-6 py-4 font-mono font-bold text-slate-900">
                        {inv.invoice_number}
                      </td>
                      <td className="px-6 py-4 text-slate-500">
                        {new Date(inv.created_at).toLocaleString("id-ID", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit"
                        })} WIB
                      </td>
                      <td className="px-6 py-4">
                        <span className="flex items-center gap-1">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          {cashierName}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-800">
                        {memberName}
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded-md text-[10px] text-slate-600 font-bold border border-slate-150">
                          <CreditCard className="w-3 h-3" />
                          {paymentMethodStr}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right font-extrabold text-slate-900">
                        {formatCurrency(inv.total_amount)}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleOpenDetail(inv)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                          title="Lihat Detail Nota"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {filteredInvoices.length > 0 && (
          <Pagination
            currentPage={currentPage}
            totalItems={filteredInvoices.length}
            pageSize={PAGE_SIZE}
            onPageChange={setCurrentPage}
          />
        )}
      </div>

      {/* DETAIL MODAL (Thermal Receipt Style) */}
      {showDetailModal && selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-150 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <FileText className="w-4.5 h-4.5 text-blue-600" /> Detail Nota Penjualan
              </h3>
              <button 
                onClick={() => {
                  setShowDetailModal(false);
                  setSelectedInvoice(null);
                  setSelectedInvoiceItems([]);
                }} 
                className="p-1 text-slate-400 hover:text-slate-850 hover:bg-slate-100 rounded-lg transition"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            {/* Modal Body: Thermal Receipt Layout */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 font-mono text-[11px] leading-relaxed">
              <div className="text-center space-y-0.5 border-b border-dashed border-slate-300 pb-3">
                <span className="font-bold text-sm block uppercase tracking-wide">{activeBusiness?.name}</span>
                <span className="text-slate-550 block text-[10px]">{activeBusiness?.address || "No Address"}</span>
                <span className="text-slate-550 block text-[10px]">Telp: {activeBusiness?.phone || "-"}</span>
              </div>

              {/* Receipt metadata */}
              <div className="space-y-1 text-slate-600 border-b border-dashed border-slate-300 pb-3">
                <div className="flex justify-between">
                  <span>No. Nota:</span>
                  <span className="font-bold text-slate-900">{selectedInvoice.invoice_number}</span>
                </div>
                <div className="flex justify-between">
                  <span>Waktu:</span>
                  <span>
                    {new Date(selectedInvoice.created_at).toLocaleString("id-ID", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit"
                    })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Kasir:</span>
                  <span className="font-bold text-slate-800">
                    {selectedInvoice.pos_shifts?.employees?.name || "Owner/Admin"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Pelanggan:</span>
                  <span>{selectedInvoice.customer_snapshot?.name || "Pelanggan Umum"}</span>
                </div>
              </div>

              {/* Items List */}
              <div className="space-y-3 py-1">
                {loadingItems ? (
                  <div className="text-center py-4 flex flex-col items-center justify-center gap-1.5">
                    <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-[10px] text-slate-400 font-bold">Memuat item nota...</span>
                  </div>
                ) : selectedInvoiceItems.length === 0 ? (
                  <div className="text-center py-4 text-slate-450 italic">
                    Gagal memuat item belanja.
                  </div>
                ) : (
                  <div className="space-y-2 border-b border-dashed border-slate-300 pb-3">
                    {selectedInvoiceItems.map((item) => (
                      <div key={item.id} className="space-y-0.5">
                        <div className="flex justify-between font-bold text-slate-850">
                          <span>{item.name}</span>
                        </div>
                        <div className="flex justify-between text-slate-550 text-[10px]">
                          <span>
                            {item.quantity.toLocaleString("id-ID")} {item.unit} x {formatCurrency(item.unit_price)}
                          </span>
                          <span>{formatCurrency(item.subtotal)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Transaction pricing totals */}
              {!loadingItems && selectedInvoiceItems.length > 0 && (
                <div className="space-y-1.5 text-right font-bold text-slate-850">
                  <div className="flex justify-between text-slate-500 font-normal">
                    <span>Subtotal:</span>
                    <span>
                      {formatCurrency(
                        selectedInvoiceItems.reduce((acc, it) => acc + Number(it.subtotal || 0), 0)
                      )}
                    </span>
                  </div>

                  {selectedInvoice.loyalty_points_redeemed > 0 && (
                    <div className="flex justify-between text-rose-600 font-normal">
                      <span>Diskon Poin ({selectedInvoice.loyalty_points_redeemed} Pts):</span>
                      <span>-{formatCurrency(selectedInvoice.loyalty_points_redeemed * 100)}</span>
                    </div>
                  )}

                  <div className="flex justify-between text-sm border-t border-slate-200 pt-1.5">
                    <span>TOTAL AKHIR:</span>
                    <span className="text-blue-600 font-extrabold">
                      {formatCurrency(selectedInvoice.total_amount)}
                    </span>
                  </div>

                  <div className="flex justify-between text-slate-500 font-normal text-[10px] pt-1">
                    <span>Metode Bayar:</span>
                    <span className="uppercase text-slate-800">{selectedInvoice.payment_methods?.join(", ") || "CASH"}</span>
                  </div>

                  {selectedInvoice.loyalty_points_earned > 0 && (
                    <div className="flex justify-between text-emerald-600 font-normal text-[10px] border-t border-dashed border-slate-250 pt-2 mt-1">
                      <span>Poin Diperoleh:</span>
                      <span>+{selectedInvoice.loyalty_points_earned} Poin</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Printable Receipt Components (Thermal & A4) */}
            <style dangerouslySetInnerHTML={{ __html: `
              @media print {
                @page {
                  ${printMode === 'thermal' ? 'size: 58mm auto; margin: 0;' : 'size: A4; margin: 15mm;'}
                }
                body * {
                  visibility: hidden !important;
                }
                .no-print, header, nav, aside, footer {
                  display: none !important;
                }
                ${printMode === 'thermal' ? `
                  #pos-history-print-thermal, #pos-history-print-thermal * {
                    visibility: visible !important;
                  }
                  #pos-history-print-thermal {
                    display: block !important;
                    position: fixed !important;
                    left: 0 !important;
                    top: 0 !important;
                    width: 48mm !important;
                    max-width: 48mm !important;
                    padding: 4px !important;
                    margin: 0 !important;
                    background: white !important;
                    color: black !important;
                    font-family: monospace, "Courier New", Courier !important;
                    font-size: 9px !important;
                    line-height: 1.2 !important;
                    box-sizing: border-box !important;
                    z-index: 99999999 !important;
                  }
                  #pos-history-print-a4 {
                    display: none !important;
                  }
                ` : `
                  #pos-history-print-a4, #pos-history-print-a4 * {
                    visibility: visible !important;
                  }
                  #pos-history-print-a4 {
                    display: block !important;
                    position: absolute !important;
                    left: 0 !important;
                    top: 0 !important;
                    width: 100% !important;
                    background: white !important;
                    color: #0f172a !important;
                    font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
                    z-index: 99999999 !important;
                  }
                  #pos-history-print-thermal {
                    display: none !important;
                  }
                `}
              }
            ` }} />

            {/* Hidden thermal print DOM container */}
            <div id="pos-history-print-thermal" className="hidden print:block font-mono text-[11px]">
              <div className="text-center border-b border-dashed border-slate-400 pb-3 mb-3">
                <div className="text-sm font-bold uppercase">{activeBusiness?.name}</div>
                <div>{activeBusiness?.address || "Jakarta, Indonesia"}</div>
                <div>Telp: {activeBusiness?.phone || "-"}</div>
              </div>

              <div className="space-y-0.5 border-b border-dashed border-slate-400 pb-2 mb-2">
                <div className="flex justify-between"><span>No Nota:</span><span className="font-bold">{selectedInvoice.invoice_number}</span></div>
                <div className="flex justify-between"><span>Tanggal:</span><span>{new Date(selectedInvoice.created_at).toLocaleDateString("id-ID")}</span></div>
                <div className="flex justify-between"><span>Kasir:</span><span>{selectedInvoice.pos_shifts?.employees?.name || "Kasir"}</span></div>
                <div className="flex justify-between"><span>Pelanggan:</span><span>{selectedInvoice.customer_snapshot?.name || "Umum"}</span></div>
              </div>

              <div className="border-b border-dashed border-slate-400 pb-2 mb-2">
                <div className="flex justify-between font-bold pb-1"><span>Produk</span><span>Total</span></div>
                {selectedInvoiceItems.map((item) => (
                  <div key={item.id} className="mb-1">
                    <div className="font-bold">{item.name}</div>
                    <div className="flex justify-between text-[10px]">
                      <span>{item.quantity} x {formatCurrency(item.unit_price)}</span>
                      <span>{formatCurrency(item.subtotal)}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-0.5 border-b border-dashed border-slate-400 pb-2 mb-2">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>{formatCurrency(selectedInvoiceItems.reduce((acc, it) => acc + Number(it.subtotal || 0), 0))}</span>
                </div>
                {selectedInvoice.loyalty_points_redeemed > 0 && (
                  <div className="flex justify-between font-bold">
                    <span>Diskon Poin:</span>
                    <span>-{formatCurrency(selectedInvoice.loyalty_points_redeemed * 100)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-xs pt-1 border-t border-dashed border-slate-300">
                  <span>TOTAL:</span>
                  <span>{formatCurrency(selectedInvoice.total_amount)}</span>
                </div>
              </div>

              <div className="space-y-0.5 border-b border-dashed border-slate-400 pb-2 mb-3">
                <div className="flex justify-between"><span>Metode Bayar:</span><span className="font-bold uppercase">{selectedInvoice.payment_methods?.join(", ") || "CASH"}</span></div>
              </div>

              <div className="text-center pt-2 text-[10px]">
                Terima kasih atas kunjungan Anda!<br />
                Struk ini adalah bukti pembayaran sah.
              </div>
            </div>

            {/* Hidden A4 print DOM container */}
            <div id="pos-history-print-a4" className="hidden print:block text-slate-900 text-sm">
              <div className="flex justify-between items-start border-b-2 border-slate-900 pb-6 mb-6">
                <div>
                  <h1 className="text-2xl font-black tracking-tight text-slate-900 uppercase">{activeBusiness?.name || "FAKTUR ONLINE"}</h1>
                  <p className="text-slate-600 mt-1">{activeBusiness?.address || "Jakarta, Indonesia"}</p>
                  <p className="text-slate-600">Telp/HP: {activeBusiness?.phone || "-"}</p>
                </div>
                <div className="text-right">
                  <span className="inline-block bg-slate-900 text-white font-extrabold px-3 py-1 text-xs tracking-wider uppercase rounded mb-2">Faktur / Nota POS</span>
                  <h2 className="text-lg font-bold text-slate-800">{selectedInvoice.invoice_number}</h2>
                  <p className="text-slate-500 text-xs mt-0.5">Tanggal: {new Date(selectedInvoice.created_at).toLocaleDateString("id-ID", { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6 mb-6 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
                <div>
                  <span className="text-slate-500 block font-semibold mb-1 uppercase text-[10px]">Informasi Kasir:</span>
                  <p className="font-bold text-slate-800">{selectedInvoice.pos_shifts?.employees?.name || "Kasir"}</p>
                  <p className="text-slate-600">POS Shift Record</p>
                </div>
                <div>
                  <span className="text-slate-500 block font-semibold mb-1 uppercase text-[10px]">Pelanggan:</span>
                  <p className="font-bold text-slate-800">{selectedInvoice.customer_snapshot?.name || "Umum"}</p>
                  <p className="text-slate-600">Status Pembayaran: <span className="font-bold text-emerald-600 uppercase">LUNAS</span></p>
                </div>
              </div>

              <table className="w-full text-left border-collapse mb-6 text-xs">
                <thead>
                  <tr className="border-b-2 border-slate-900 text-slate-900 font-extrabold uppercase tracking-wide">
                    <th className="py-2.5 px-2">No</th>
                    <th className="py-2.5 px-2">Nama Barang / Produk</th>
                    <th className="py-2.5 px-2 text-right">Harga Satuan</th>
                    <th className="py-2.5 px-2 text-center">Jumlah</th>
                    <th className="py-2.5 px-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {selectedInvoiceItems.map((item, idx) => (
                    <tr key={item.id} className="text-slate-800">
                      <td className="py-2.5 px-2 text-slate-500">{idx + 1}</td>
                      <td className="py-2.5 px-2 font-bold">{item.name}</td>
                      <td className="py-2.5 px-2 text-right">{formatCurrency(item.unit_price)}</td>
                      <td className="py-2.5 px-2 text-center">{item.quantity} {item.unit}</td>
                      <td className="py-2.5 px-2 text-right font-semibold">{formatCurrency(item.subtotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="flex justify-between items-start pt-2">
                <div className="w-1/2 pr-6 text-xs text-slate-500 space-y-4">
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <p className="font-semibold text-slate-700 mb-1">Catatan Pembayaran:</p>
                    <p>Metode Bayar: <span className="font-bold uppercase text-slate-900">{selectedInvoice.payment_methods?.join(", ") || "CASH"}</span></p>
                  </div>
                  <p className="italic text-[11px]">Terima kasih atas kepercayaan Anda bertransaksi bersama kami.</p>
                </div>

                <div className="w-1/2 max-w-xs space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-slate-150">
                    <span className="text-slate-600">Subtotal</span>
                    <span className="font-bold text-slate-800">
                      {formatCurrency(selectedInvoiceItems.reduce((acc, it) => acc + Number(it.subtotal || 0), 0))}
                    </span>
                  </div>
                  {selectedInvoice.loyalty_points_redeemed > 0 && (
                    <div className="flex justify-between py-1 border-b border-slate-150 text-rose-600">
                      <span>Diskon Poin ({selectedInvoice.loyalty_points_redeemed} Pts)</span>
                      <span className="font-bold">-{formatCurrency(selectedInvoice.loyalty_points_redeemed * 100)}</span>
                    </div>
                  )}
                  <div className="flex justify-between py-2 border-b-2 border-slate-900 font-black text-base text-slate-900">
                    <span>TOTAL</span>
                    <span>{formatCurrency(selectedInvoice.total_amount)}</span>
                  </div>
                </div>
              </div>

              <div className="mt-16 pt-6 border-t border-slate-200 flex justify-between text-center text-xs text-slate-600">
                <div className="w-40">
                  <p className="mb-14">Hormat Kami,</p>
                  <p className="font-bold border-t border-slate-400 pt-1">{activeBusiness?.name}</p>
                </div>
                <div className="w-40">
                  <p className="mb-14">Pelanggan,</p>
                  <p className="font-bold border-t border-slate-400 pt-1">{selectedInvoice.customer_snapshot?.name || "Umum"}</p>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-150 flex flex-wrap sm:flex-nowrap gap-2">
              <button
                type="button"
                onClick={() => {
                  setPrintMode("thermal");
                  setTimeout(() => window.print(), 100);
                }}
                className="flex-1 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 font-bold py-2.5 px-3 rounded-xl text-xs transition text-center shadow-sm flex items-center justify-center gap-1.5"
              >
                <Printer className="w-4 h-4 text-slate-600" /> Cetak Thermal
              </button>
              <button
                type="button"
                onClick={() => {
                  setPrintMode("a4");
                  setTimeout(() => window.print(), 100);
                }}
                className="flex-1 bg-slate-800 hover:bg-slate-900 border border-slate-900 text-white font-bold py-2.5 px-3 rounded-xl text-xs transition text-center shadow-sm flex items-center justify-center gap-1.5"
              >
                <FileText className="w-4 h-4 text-blue-400" /> Cetak PDF (A4)
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowDetailModal(false);
                  setSelectedInvoice(null);
                  setSelectedInvoiceItems([]);
                }}
                className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-extrabold py-2.5 px-4 rounded-xl text-xs transition text-center shadow-sm"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
