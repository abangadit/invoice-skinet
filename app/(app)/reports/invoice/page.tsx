"use client";

import React, { useEffect, useState } from "react";
import { 
  FileText, 
  Calendar, 
  Download, 
  Printer, 
  User, 
  Filter, 
  DollarSign, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  X,
  FileCheck
} from "lucide-react";
import { useBusiness } from "../../../../lib/context/BusinessContext";
import { createWebBrowserClient } from "../../../../lib/supabase/client";

interface InvoiceReportItem {
  id: string;
  invoice_number: string;
  status: string;
  total_amount: number;
  paid_amount: number;
  remaining_amount: number;
  issue_date: string;
  due_date: string | null;
  currency: string;
  customer_id: string | null;
  customers: {
    name: string;
  } | null;
}

export default function InvoiceReportPage() {
  const { activeBusiness } = useBusiness();
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState<InvoiceReportItem[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);

  // Filter states
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");

  const fetchInvoiceReportData = async () => {
    if (!activeBusiness) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const supabase = createWebBrowserClient();

      // Fetch Invoices
      const { data: invData, error: invErr } = await supabase
        .from("invoices")
        .select(`
          id,
          invoice_number,
          status,
          total_amount,
          paid_amount,
          remaining_amount,
          issue_date,
          due_date,
          currency,
          customer_id,
          customers ( name )
        `)
        .eq("business_id", activeBusiness.id)
        .eq("type", "invoice")
        .order("issue_date", { ascending: false });

      if (invErr) throw invErr;

      const formattedInvoices = (invData || []).map((inv: any) => ({
        ...inv,
        customers: Array.isArray(inv.customers) ? inv.customers[0] || null : inv.customers
      }));

      setInvoices(formattedInvoices);

      // Fetch Customers list for filter
      const { data: custData } = await supabase
        .from("customers")
        .select("id, name")
        .eq("business_id", activeBusiness.id)
        .order("name", { ascending: true });

      setCustomers(custData || []);

    } catch (err) {
      console.error("Error loading invoice report data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoiceReportData();
  }, [activeBusiness]);

  // Apply filters dynamically
  const filteredInvoices = invoices.filter((inv) => {
    // Tanggal Dari
    if (startDate) {
      const invTime = new Date(inv.issue_date).getTime();
      const startTime = new Date(startDate).getTime();
      if (invTime < startTime) return false;
    }

    // Tanggal Sampai
    if (endDate) {
      const invTime = new Date(inv.issue_date).getTime();
      const endTime = new Date(endDate).getTime();
      if (invTime > endTime) return false;
    }

    // Pelanggan
    if (selectedCustomerId !== "all" && inv.customer_id !== selectedCustomerId) {
      return false;
    }

    // Status Invoice
    if (selectedStatus !== "all" && inv.status !== selectedStatus) {
      return false;
    }

    return true;
  });

  // Calculate Summary metrics
  const summary = filteredInvoices.reduce(
    (acc, inv) => {
      const total = Number(inv.total_amount || 0);
      const paid = Number(inv.paid_amount || 0);
      const rem = Number(inv.remaining_amount || 0);

      acc.totalAmount += total;
      acc.totalPaid += paid;
      acc.totalRemaining += rem;
      acc.count += 1;

      if (inv.status === "paid") acc.paidCount += 1;
      else if (inv.status === "partial") acc.partialCount += 1;
      else if (inv.status === "sent") acc.sentCount += 1;
      else if (inv.status === "overdue") acc.overdueCount += 1;
      else if (inv.status === "draft") acc.draftCount += 1;

      return acc;
    },
    {
      totalAmount: 0,
      totalPaid: 0,
      totalRemaining: 0,
      count: 0,
      paidCount: 0,
      partialCount: 0,
      sentCount: 0,
      overdueCount: 0,
      draftCount: 0
    }
  );

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: activeBusiness?.default_currency || "IDR",
      maximumFractionDigits: 0
    }).format(val);
  };

  const handleExportCSV = () => {
    let csv = "\uFEFF";
    csv += "LAPORAN INVOICE PENJUALAN\n";
    csv += `${activeBusiness?.name || "Bisnis"}\n`;
    csv += `Periode: ${startDate || "Awal"} s.d. ${endDate || "Sekarang"}\n\n`;
    
    csv += "No. Invoice,Pelanggan,Tanggal Terbit,Jatuh Tempo,Status,Total Invoice (Rp),Terbayar (Rp),Sisa Piutang (Rp)\n";
    
    filteredInvoices.forEach(inv => {
      const custName = inv.customers?.name || "Pelanggan Umum";
      csv += `"${inv.invoice_number}","${custName}","${inv.issue_date}","${inv.due_date || "-"}","${inv.status}",${inv.total_amount},${inv.paid_amount},${inv.remaining_amount}\n`;
    });

    csv += `\n,,TOTAL METRIK,,${summary.count} Invoice,${summary.totalAmount},${summary.totalPaid},${summary.totalRemaining}\n`;

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Laporan_Invoice_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 flex items-center gap-2">
            <FileCheck className="w-7 h-7 text-blue-600" />
            Laporan Invoice
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Rekapitulasi tagihan faktur penjualan terperinci beserta status pembayaran dan sisa piutang.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0 no-print">
          <button
            onClick={handleExportCSV}
            className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-sm transition"
          >
            <Download className="w-4 h-4 text-emerald-600" /> Ekspor CSV/Excel
          </button>
          <button
            onClick={() => window.print()}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-sm transition"
          >
            <Printer className="w-4 h-4" /> Cetak / Export PDF
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm space-y-4 no-print">
        <div className="flex items-center gap-2 text-xs font-extrabold text-slate-800 border-b border-slate-100 pb-2">
          <Filter className="w-4 h-4 text-blue-600" /> Filter Laporan Invoice
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs font-semibold text-slate-600">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Tanggal Dari</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full bg-white border border-slate-200 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-blue-500 transition shadow-xs"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Tanggal Sampai</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full bg-white border border-slate-200 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-blue-500 transition shadow-xs"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Pelanggan</label>
            <select
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              className="w-full bg-white border border-slate-200 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-blue-500 transition shadow-xs"
            >
              <option value="all">Semua Pelanggan</option>
              {customers.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Status Invoice</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full bg-white border border-slate-200 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-blue-500 transition shadow-xs"
            >
              <option value="all">Semua Status</option>
              <option value="draft">Draft</option>
              <option value="sent">Dikirim</option>
              <option value="paid">Lunas</option>
              <option value="partial">Belum Lunas (Partial)</option>
              <option value="overdue">Terlambat (Overdue)</option>
            </select>
          </div>
        </div>

        {(startDate || endDate || selectedCustomerId !== "all" || selectedStatus !== "all") && (
          <div className="flex justify-end pt-1">
            <button
              onClick={() => {
                setStartDate("");
                setEndDate("");
                setSelectedCustomerId("all");
                setSelectedStatus("all");
              }}
              className="text-xs font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1"
            >
              <X className="w-3.5 h-3.5" /> Reset Filter
            </button>
          </div>
        )}
      </div>

      {/* Summary Metrik Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm space-y-2">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Tagihan (Grand Total)</span>
          <span className="text-2xl font-black text-slate-900 block">{formatCurrency(summary.totalAmount)}</span>
          <span className="text-xs text-slate-500 font-bold flex items-center gap-1">
            <FileText className="w-3.5 h-3.5 text-slate-400" /> {summary.count} Invoice
          </span>
        </div>

        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm space-y-2">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Terbayar (Lunas)</span>
          <span className="text-2xl font-black text-emerald-600 block">{formatCurrency(summary.totalPaid)}</span>
          <span className="text-xs text-slate-500 font-bold flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> {summary.paidCount} Invoice Lunas
          </span>
        </div>

        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm space-y-2">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Sisa Piutang</span>
          <span className="text-2xl font-black text-rose-600 block">{formatCurrency(summary.totalRemaining)}</span>
          <span className="text-xs text-slate-500 font-bold flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5 text-rose-500" /> {summary.partialCount + summary.overdueCount} Belum Lunas
          </span>
        </div>

        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm space-y-2">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Rincian Status</span>
          <div className="grid grid-cols-2 gap-1 text-[11px] font-bold">
            <span className="text-emerald-600">Lunas: {summary.paidCount}</span>
            <span className="text-amber-600">Partial: {summary.partialCount}</span>
            <span className="text-blue-600">Dikirim: {summary.sentCount}</span>
            <span className="text-rose-600">Terlambat: {summary.overdueCount}</span>
          </div>
        </div>
      </div>

      {/* Tabel List Invoice */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">Daftar Rincian Invoice</h3>
            <p className="text-[11px] text-slate-500 font-medium mt-0.5">Menampilkan {filteredInvoices.length} transaksi invoice sesuai filter aktif.</p>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs text-slate-500 font-semibold mt-2">Memuat laporan invoice...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-semibold text-slate-700">
              <thead>
                <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-400 uppercase text-[9px] tracking-wider">
                  <th className="px-5 py-3.5">No. Invoice</th>
                  <th className="px-5 py-3.5">Pelanggan</th>
                  <th className="px-5 py-3.5">Tanggal Terbit</th>
                  <th className="px-5 py-3.5">Jatuh Tempo</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Total Invoice</th>
                  <th className="px-5 py-3.5 text-right">Terbayar</th>
                  <th className="px-5 py-3.5 text-right">Sisa Piutang</th>
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

                    return (
                      <tr key={inv.id} className="hover:bg-slate-50/50 transition">
                        <td className="px-5 py-3.5 font-bold text-slate-900 font-mono">{inv.invoice_number}</td>
                        <td className="px-5 py-3.5">{inv.customers?.name || "Pelanggan Umum"}</td>
                        <td className="px-5 py-3.5">{inv.issue_date}</td>
                        <td className="px-5 py-3.5">{inv.due_date || "-"}</td>
                        <td className="px-5 py-3.5">
                          <span className={`px-2.5 py-0.5 rounded-full border text-[9px] font-extrabold tracking-wide uppercase ${statusColors[inv.status] || "bg-slate-50 text-slate-500 border-slate-150"}`}>
                            {inv.status}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-right font-mono font-bold text-slate-900">{formatCurrency(inv.total_amount)}</td>
                        <td className="px-5 py-3.5 text-right font-mono text-emerald-600">{formatCurrency(inv.paid_amount)}</td>
                        <td className="px-5 py-3.5 text-right font-mono text-rose-600 font-bold">{formatCurrency(inv.remaining_amount)}</td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={8} className="px-5 py-8 text-center text-slate-400 font-medium">
                      Tidak ada invoice yang sesuai dengan kriteria filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
