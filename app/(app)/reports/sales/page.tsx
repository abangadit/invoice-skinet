"use client";

import React, { useEffect, useState } from "react";
import { 
  TrendingUp, 
  BarChart3, 
  PieChart, 
  DollarSign, 
  ArrowUpRight, 
  ArrowDownRight, 
  Percent, 
  Clock, 
  FileText,
  Calendar,
  Download,
  Printer,
  ChevronRight,
  ArrowLeft,
  X
} from "lucide-react";
import { useBusiness } from "../../../../lib/context/BusinessContext";
import { createWebBrowserClient } from "../../../../lib/supabase/client";

interface InvoiceReport {
  id: string;
  invoice_number: string;
  status: string;
  total_amount: number;
  paid_amount: number;
  remaining_amount: number;
  issue_date: string;
  payment_methods: string[];
  customer_id?: string | null;
  cogs_total?: number;
  customers: {
    id?: string;
    name: string;
  } | null;
}

export default function SalesReportPage() {
  const { activeBusiness } = useBusiness();
  const [loading, setLoading] = useState(true);
  const [rawInvoices, setRawInvoices] = useState<InvoiceReport[]>([]);
  const [filteredInvoices, setFilteredInvoices] = useState<InvoiceReport[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);

  // Filter states
  const [filterMode, setFilterMode] = useState<"month_year" | "date_range">("month_year");
  const [selectedMonth, setSelectedMonth] = useState<string>("all");
  const [selectedYear, setSelectedYear] = useState<string>("all");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("all");
  const [minPrice, setMinPrice] = useState<string>("");
  const [maxPrice, setMaxPrice] = useState<string>("");

  // Calculated Summary states
  const [summary, setSummary] = useState({
    totalInvoiced: 0,
    totalPaid: 0,
    totalRemaining: 0,
    totalCogs: 0,
    totalGrossProfit: 0,
    draftCount: 0,
    sentCount: 0,
    paidCount: 0,
    partialCount: 0,
    overdueCount: 0,
    invoiceCount: 0
  });

  const fetchReports = async () => {
    if (!activeBusiness) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const supabase = createWebBrowserClient();

      // Fetch Invoices
      const { data: invoices, error } = await supabase
        .from("invoices")
        .select(`
          id,
          invoice_number,
          status,
          total_amount,
          paid_amount,
          remaining_amount,
          issue_date,
          payment_methods,
          customer_id,
          customers ( id, name )
        `)
        .eq("business_id", activeBusiness.id)
        .eq("type", "invoice")
        .order("issue_date", { ascending: false });

      if (error) throw error;

      // Fetch invoice items to sum up COGS / HPP per invoice
      const invoiceIds = (invoices || []).map(i => i.id);
      let cogsMap: Record<string, number> = {};

      if (invoiceIds.length > 0) {
        const { data: itemsData } = await supabase
          .from("invoice_items")
          .select("invoice_id, quantity, items(cogs_unit_price)")
          .in("invoice_id", invoiceIds);

        (itemsData || []).forEach((row: any) => {
          const qty = Number(row.quantity || 0);
          const cogs = Number(row.items?.cogs_unit_price || 0);
          cogsMap[row.invoice_id] = (cogsMap[row.invoice_id] || 0) + (qty * cogs);
        });
      }

      const formattedInvoices = (invoices || []).map((inv: any) => ({
        ...inv,
        customers: Array.isArray(inv.customers) ? inv.customers[0] || null : inv.customers,
        cogs_total: cogsMap[inv.id] || 0
      }));

      setRawInvoices(formattedInvoices);

      // Fetch Customers for filter
      const { data: custData } = await supabase
        .from("customers")
        .select("id, name")
        .eq("business_id", activeBusiness.id)
        .order("name", { ascending: true });

      setCustomers(custData || []);

    } catch (err) {
      console.error("Error fetching report data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [activeBusiness]);

  // Handle filtering dynamically
  useEffect(() => {
    const filtered = rawInvoices.filter((inv) => {
      // 1. Customer Filter
      if (selectedCustomerId !== "all" && inv.customer_id !== selectedCustomerId) {
        return false;
      }

      // 2. Price Range Filter
      const totalAmt = Number(inv.total_amount || 0);
      if (minPrice && totalAmt < Number(minPrice)) return false;
      if (maxPrice && totalAmt > Number(maxPrice)) return false;

      // 3. Date / Month Filter
      if (!inv.issue_date) return true;

      if (filterMode === "month_year") {
        const date = new Date(inv.issue_date);
        const m = date.getMonth() + 1;
        const y = date.getFullYear();

        if (selectedMonth !== "all" && String(m) !== selectedMonth) return false;
        if (selectedYear !== "all" && String(y) !== selectedYear) return false;
      } else if (filterMode === "date_range") {
        const invTime = new Date(inv.issue_date).getTime();
        
        if (startDate) {
          const startTime = new Date(startDate).getTime();
          if (invTime < startTime) return false;
        }
        if (endDate) {
          const endTime = new Date(endDate).getTime();
          if (invTime > endTime) return false;
        }
      }
      return true;
    });

    setFilteredInvoices(filtered);

    // Calculate sum values
    let totalInvoiced = 0;
    let totalPaid = 0;
    let totalRemaining = 0;
    let totalCogs = 0;
    
    let draftCount = 0;
    let sentCount = 0;
    let paidCount = 0;
    let partialCount = 0;
    let overdueCount = 0;

    filtered.forEach((inv) => {
      const total = Number(inv.total_amount || 0);
      const paid = Number(inv.paid_amount || 0);
      const rem = Number(inv.remaining_amount || 0);
      const cogs = Number(inv.cogs_total || 0);

      totalInvoiced += total;
      totalPaid += paid;
      totalRemaining += rem;
      totalCogs += cogs;

      if (inv.status === "draft") draftCount++;
      else if (inv.status === "sent") sentCount++;
      else if (inv.status === "paid") paidCount++;
      else if (inv.status === "partial") partialCount++;
      else if (inv.status === "overdue") overdueCount++;
    });

    const totalGrossProfit = totalInvoiced - totalCogs;

    setSummary({
      totalInvoiced,
      totalPaid,
      totalRemaining,
      totalCogs,
      totalGrossProfit,
      draftCount,
      sentCount,
      paidCount,
      partialCount,
      overdueCount,
      invoiceCount: filtered.length
    });
  }, [rawInvoices, filterMode, selectedMonth, selectedYear, startDate, endDate, selectedCustomerId, minPrice, maxPrice]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: activeBusiness?.default_currency || "IDR",
      maximumFractionDigits: 0
    }).format(val);
  };

  const collectionRate = summary.totalInvoiced > 0 ? (summary.totalPaid / summary.totalInvoiced) * 100 : 0;
  const outstandingRate = summary.totalInvoiced > 0 ? (summary.totalRemaining / summary.totalInvoiced) * 100 : 0;

  const handleExportCSV = () => {
    let csvContent = "\uFEFF"; // UTF-8 BOM for Excel Excel alignment support
    csvContent += "LAPORAN PENJUALAN & PIUTANG\n";
    csvContent += `${activeBusiness?.name || "Bisnis"}\n`;
    csvContent += `Filter: ${filterMode === "month_year" ? `Bulan ${selectedMonth} Tahun ${selectedYear}` : `Rentang ${startDate || "-"} s.d. ${endDate || "-"}`}\n\n`;
    
    csvContent += "No. Invoice,Pelanggan,Tanggal,Status,Total Tagihan (Rp),Terbayar (Rp),Sisa Piutang (Rp),Metode Pembayaran\n";
    
    filteredInvoices.forEach(inv => {
      const customerName = inv.customers ? inv.customers.name : "Pelanggan Umum";
      const methods = inv.payment_methods ? inv.payment_methods.join(";") : "-";
      csvContent += `"${inv.invoice_number}","${customerName}","${inv.issue_date}","${inv.status}",${inv.total_amount},${inv.paid_amount},${inv.remaining_amount},"${methods}"\n`;
    });
    
    csvContent += `\n,,TOTAL,,${summary.totalInvoiced},${summary.totalPaid},${summary.totalRemaining},\n`;
    
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Laporan_Penjualan_${activeBusiness?.name || "Bisnis"}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs text-slate-500 font-semibold mt-2">Menghitung laporan penjualan...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4 no-print">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            Laporan Penjualan & Piutang
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">Analisis omset penjualan, piutang terhutang, dan performa penagihan kasir.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-sm transition"
          >
            <Download className="w-4 h-4" /> Ekspor Excel (CSV)
          </button>
          <button
            onClick={() => window.print()}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-sm transition"
          >
            <Printer className="w-4 h-4" /> Cetak Laporan (PDF)
          </button>
        </div>
      </div>

      {/* Filter Bar no-print */}
      <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm space-y-4 no-print">
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          <div className="flex gap-1.5 p-1 bg-slate-100 rounded-xl">
            <button
              type="button"
              onClick={() => setFilterMode("month_year")}
              className={`px-4 py-1.5 text-xs font-bold rounded-lg transition ${
                filterMode === "month_year" ? "bg-white text-blue-600 shadow-sm font-extrabold" : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              Bulan & Tahun
            </button>
            <button
              type="button"
              onClick={() => setFilterMode("date_range")}
              className={`px-4 py-1.5 text-xs font-bold rounded-lg transition ${
                filterMode === "date_range" ? "bg-white text-blue-600 shadow-sm font-extrabold" : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              Rentang Tanggal
            </button>
          </div>

          {filterMode === "month_year" ? (
            <div className="flex items-center gap-2 w-full md:w-auto">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-white border border-slate-200 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-sm flex-1 md:flex-none"
              >
                <option value="all">Semua Bulan</option>
                <option value="1">Januari</option>
                <option value="2">Februari</option>
                <option value="3">Maret</option>
                <option value="4">April</option>
                <option value="5">Mei</option>
                <option value="6">Juni</option>
                <option value="7">Juli</option>
                <option value="8">Agustus</option>
                <option value="9">September</option>
                <option value="10">Oktober</option>
                <option value="11">November</option>
                <option value="12">Desember</option>
              </select>

              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="bg-white border border-slate-200 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-sm flex-1 md:flex-none"
              >
                <option value="all">Semua Tahun</option>
                <option value="2024">2024</option>
                <option value="2025">2025</option>
                <option value="2026">2026</option>
                <option value="2027">2027</option>
                <option value="2028">2028</option>
              </select>
            </div>
          ) : (
            <div className="flex items-center gap-2 w-full md:w-auto text-xs font-medium text-slate-500">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-white border border-slate-200 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-sm flex-1 md:flex-none"
              />
              <span>s.d.</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-white border border-slate-200 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-sm flex-1 md:flex-none"
              />
            </div>
          )}
        </div>

        {/* Filter Pelanggan & Range Harga */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2 border-t border-slate-100 items-start sm:items-center">
          <div className="flex items-center gap-2 flex-1 w-full sm:w-auto">
            <span className="text-xs font-bold text-slate-500 shrink-0">Pelanggan:</span>
            <select
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              className="bg-white border border-slate-200 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-sm w-full"
            >
              <option value="all">Semua Pelanggan</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 flex-1 w-full sm:w-auto text-xs font-bold text-slate-500">
            <span className="shrink-0">Harga:</span>
            <input
              type="number"
              placeholder="Min Rp"
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
              className="bg-white border border-slate-200 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-sm w-full"
            />
            <span>-</span>
            <input
              type="number"
              placeholder="Max Rp"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              className="bg-white border border-slate-200 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-sm w-full"
            />
          </div>
        </div>
      </div>

      {/* Grid Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm space-y-3">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Omset Penjualan</span>
          <span className="text-2xl font-extrabold text-slate-900 block">{formatCurrency(summary.totalInvoiced)}</span>
          <span className="text-xs text-slate-500 font-semibold flex items-center gap-1">
            <FileText className="w-4 h-4 text-slate-400" /> {summary.invoiceCount} Transaksi penjualan
          </span>
        </div>

        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm space-y-3">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Harga Modal (HPP)</span>
          <span className="text-2xl font-extrabold text-amber-600 block">{formatCurrency(summary.totalCogs)}</span>
          <span className="text-xs text-slate-500 font-semibold">
            Estimasi Modal Barang Terjual
          </span>
        </div>

        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm space-y-3">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Est. Laba Kotor (Gross Profit)</span>
          <span className="text-2xl font-extrabold text-blue-600 block">{formatCurrency(summary.totalGrossProfit)}</span>
          <span className="text-xs text-slate-500 font-semibold">
            Omset Dikurangi HPP
          </span>
        </div>

        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm space-y-3">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Sisa Piutang</span>
          <span className="text-2xl font-extrabold text-rose-600 block">{formatCurrency(summary.totalRemaining)}</span>
          <span className="text-xs text-slate-500 font-semibold flex items-center gap-1.5">
            <span className="text-rose-500 font-bold">{outstandingRate.toFixed(1)}%</span> Outstanding Rate
          </span>
        </div>
      </div>

      {/* Visual Chart Section no-print */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 no-print">
        <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-6">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">Distribusi Nilai Keuangan</h3>
            <p className="text-xs text-slate-500">Perbandingan antara nominal terbayar dan sisa piutang</p>
          </div>

          <div className="space-y-4">
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-slate-600 font-medium">
                <span>Diterima (Terbayar)</span>
                <span>{formatCurrency(summary.totalPaid)} ({collectionRate.toFixed(0)}%)</span>
              </div>
              <div className="w-full bg-slate-100 h-6 rounded-lg overflow-hidden">
                <div className="bg-emerald-500 h-full" style={{ width: `${collectionRate}%` }} />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs text-slate-600 font-medium">
                <span>Piutang (Outstanding)</span>
                <span>{formatCurrency(summary.totalRemaining)} ({outstandingRate.toFixed(0)}%)</span>
              </div>
              <div className="w-full bg-slate-100 h-6 rounded-lg overflow-hidden">
                <div className="bg-rose-500 h-full" style={{ width: `${outstandingRate}%` }} />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-4">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">Rincian Berdasarkan Status Faktur</h3>
            <p className="text-xs text-slate-500">Pembagian kuantitas transaksi penjualan berdasarkan status faktur</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="border border-slate-100 p-3 rounded-xl bg-slate-50/50">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Lunas</span>
              <span className="text-xl font-extrabold text-emerald-600 mt-1 block">{summary.paidCount}</span>
            </div>

            <div className="border border-slate-100 p-3 rounded-xl bg-slate-50/50">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Sebagian</span>
              <span className="text-xl font-extrabold text-amber-600 mt-1 block">{summary.partialCount}</span>
            </div>

            <div className="border border-slate-100 p-3 rounded-xl bg-slate-50/50">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Terkirim</span>
              <span className="text-xl font-extrabold text-blue-600 mt-1 block">{summary.sentCount}</span>
            </div>

            <div className="border border-slate-100 p-3 rounded-xl bg-slate-50/50">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Terlambat</span>
              <span className="text-xl font-extrabold text-rose-600 mt-1 block">{summary.overdueCount}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabular Details Section */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50">
          <h3 className="font-bold text-slate-900 text-sm">Detail Faktur Penjualan</h3>
          <p className="text-[11px] text-slate-500 font-medium mt-0.5">Daftar transaksi penjualan terperinci sesuai filter aktif.</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-semibold text-slate-700">
            <thead>
              <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-400 uppercase text-[9px] tracking-wider">
                <th className="px-5 py-3">No. Invoice</th>
                <th className="px-5 py-3">Pelanggan</th>
                <th className="px-5 py-3">Tanggal</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Total Tagihan</th>
                <th className="px-5 py-3 text-right">Modal (HPP)</th>
                <th className="px-5 py-3 text-right">Est. Laba</th>
                <th className="px-5 py-3 text-right">Terbayar</th>
                <th className="px-5 py-3 text-right">Sisa Piutang</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-150">
              {filteredInvoices.length > 0 ? (
                filteredInvoices.map((inv) => {
                  const statusColors: Record<string, string> = {
                    paid: "bg-emerald-50 text-emerald-600 border-emerald-100",
                    partial: "bg-amber-50 text-amber-600 border-amber-100",
                    sent: "bg-blue-50 text-blue-600 border-blue-100",
                    draft: "bg-slate-100 text-slate-500 border-slate-150",
                    overdue: "bg-rose-50 text-rose-600 border-rose-100"
                  };
                  const cogs = Number(inv.cogs_total || 0);
                  const profit = Number(inv.total_amount || 0) - cogs;

                  return (
                    <tr key={inv.id} className="hover:bg-slate-50/30 transition">
                      <td className="px-5 py-3.5 font-bold text-slate-900 font-mono">{inv.invoice_number}</td>
                      <td className="px-5 py-3.5">{inv.customers?.name || "Pelanggan Umum"}</td>
                      <td className="px-5 py-3.5">{inv.issue_date}</td>
                      <td className="px-5 py-3.5">
                        <span className={`px-2 py-0.5 rounded-full border text-[9px] font-extrabold tracking-wide uppercase ${statusColors[inv.status] || "bg-slate-50 text-slate-500 border-slate-150"}`}>
                          {inv.status}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right font-mono font-bold text-slate-900">{formatCurrency(inv.total_amount)}</td>
                      <td className="px-5 py-3.5 text-right font-mono text-amber-600 font-semibold">{formatCurrency(cogs)}</td>
                      <td className="px-5 py-3.5 text-right font-mono text-blue-600 font-bold">{formatCurrency(profit)}</td>
                      <td className="px-5 py-3.5 text-right font-mono text-emerald-600">{formatCurrency(inv.paid_amount)}</td>
                      <td className="px-5 py-3.5 text-right font-mono text-rose-600">{formatCurrency(inv.remaining_amount)}</td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={9} className="px-5 py-8 text-center text-slate-400 font-medium">
                    Tidak ada transaksi penjualan dalam periode ini.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
