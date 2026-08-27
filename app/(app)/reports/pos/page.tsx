"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Calendar,
  Warehouse,
  TrendingUp,
  FileText,
  DollarSign,
  AlertCircle,
  HelpCircle,
  Clock,
  History,
  Sliders,
  ChevronDown,
  ChevronUp,
  Search
} from "lucide-react";
import Link from "next/link";
import { useBusiness } from "../../../../lib/context/BusinessContext";
import { createWebBrowserClient } from "../../../../lib/supabase/client";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area
} from "recharts";

// Recharts JSX element compatibility fix for React 18/TypeScript
const ResponsiveContainerComponent = ResponsiveContainer as any;
const BarChartComponent = BarChart as any;
const BarComponent = Bar as any;
const XAxisComponent = XAxis as any;
const YAxisComponent = YAxis as any;
const CartesianGridComponent = CartesianGrid as any;
const TooltipComponent = Tooltip as any;
const LegendComponent = Legend as any;

interface ShiftData {
  id: string;
  opened_at: string;
  closed_at: string | null;
  opening_cash: number;
  expected_closing_cash: number;
  actual_closing_cash: number | null;
  status: "open" | "closed";
  notes: string | null;
  employees: {
    name: string;
  } | null;
  invoices: {
    id: string;
    total_amount: number;
  }[];
}

export default function POSReportsPage() {
  const { activeBusiness } = useBusiness();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [isMounted, setIsMounted] = useState(false);

  // Raw data from database
  const [shifts, setShifts] = useState<ShiftData[]>([]);

  // Filter States
  const [selectedMonth, setSelectedMonth] = useState<string>("all");
  const [selectedYear, setSelectedYear] = useState<string>("all");
  const [selectedType, setSelectedType] = useState<"all" | "with_tx" | "no_tx">("all");

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const fetchShiftData = async () => {
    if (!activeBusiness) return;
    try {
      setLoading(true);
      setErrorMsg("");
      const supabase = createWebBrowserClient();

      // Fetch all shifts with employee info and invoices for counts
      const { data, error } = await supabase
        .from("pos_shifts")
        .select(`
          id,
          opened_at,
          closed_at,
          opening_cash,
          expected_closing_cash,
          actual_closing_cash,
          status,
          notes,
          employees ( name ),
          invoices ( id, total_amount )
        `)
        .eq("business_id", activeBusiness.id)
        .order("opened_at", { ascending: false });

      if (error) throw error;

      const formatted: ShiftData[] = (data || []).map((s: any) => ({
        id: s.id,
        opened_at: s.opened_at,
        closed_at: s.closed_at,
        opening_cash: Number(s.opening_cash || 0),
        expected_closing_cash: Number(s.expected_closing_cash || 0),
        actual_closing_cash: s.actual_closing_cash !== null ? Number(s.actual_closing_cash) : null,
        status: s.status,
        notes: s.notes,
        employees: Array.isArray(s.employees) ? s.employees[0] : (s.employees || null),
        invoices: s.invoices || []
      }));

      setShifts(formatted);
    } catch (err: any) {
      console.error("Error loading POS shift report data:", err);
      setErrorMsg(err.message || "Gagal memuat data laporan shift kasir.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShiftData();
  }, [activeBusiness]);

  // Apply filters
  const filteredShifts = shifts.filter((shift) => {
    const date = new Date(shift.opened_at);
    const month = String(date.getMonth() + 1);
    const year = String(date.getFullYear());

    // Month filter
    const matchesMonth = selectedMonth === "all" || month === selectedMonth;
    // Year filter
    const matchesYear = selectedYear === "all" || year === selectedYear;

    // Shift Type filter
    const invoiceCount = shift.invoices?.length || 0;
    const isRegularPos = invoiceCount > 0 || shift.expected_closing_cash !== shift.opening_cash;
    
    let matchesType = true;
    if (selectedType === "with_tx") {
      matchesType = isRegularPos;
    } else if (selectedType === "no_tx") {
      matchesType = !isRegularPos;
    }

    return matchesMonth && matchesYear && matchesType;
  });

  // Calculations for summary cards (Only from CLOSED shifts)
  const closedShifts = filteredShifts.filter(s => s.status === "closed");
  const totalOpeningCash = closedShifts.reduce((sum, s) => sum + s.opening_cash, 0);
  const totalActualClosingCash = closedShifts.reduce((sum, s) => sum + (s.actual_closing_cash || 0), 0);
  
  // Keuntungan Kas Bersih (Uang Masuk Riil = Kas Akhir Riil - Modal Awal)
  const totalCashInflow = closedShifts.reduce((sum, s) => {
    const net = (s.actual_closing_cash || 0) - s.opening_cash;
    return sum + (net > 0 ? net : 0);
  }, 0);

  // Total discrepancy/selisih kas
  const totalDiscrepancy = closedShifts.reduce((sum, s) => {
    const diff = (s.actual_closing_cash || 0) - s.expected_closing_cash;
    return sum + diff;
  }, 0);

  // Prepare chart data (Chronological order)
  const chartData = [...closedShifts]
    .reverse() // Chronological
    .map((s) => {
      const dateStr = new Date(s.opened_at).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short"
      });
      const cashierName = s.employees?.name?.split(" ")[0] || "Admin";
      const netRevenue = Math.max(0, (s.actual_closing_cash || 0) - s.opening_cash);

      return {
        name: `${dateStr} (${cashierName})`,
        "Modal Awal": s.opening_cash,
        "Kas Akhir": s.actual_closing_cash || 0,
        "Uang Masuk (Net)": netRevenue
      };
    });

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: activeBusiness?.default_currency || "IDR",
      maximumFractionDigits: 0
    }).format(val);
  };

  return (
    <div className="space-y-6 text-xs font-semibold text-slate-800">
      
      {/* Header section */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-4">
        <Link 
          href="/reports"
          className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 transition"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            Laporan POS & Shift Kasir
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Analisis arus kas masuk harian dari aktivitas laci kas kasir (opening/closing cash).
          </p>
        </div>
      </div>

      {errorMsg && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-xl flex items-start gap-2">
          <AlertCircle className="w-5 h-5 shrink-0 text-rose-500" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Filter panel */}
      <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm space-y-4">
        <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
          <Sliders className="w-4 h-4 text-blue-600" /> Penyaringan Laporan POS
        </h4>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Shift Type Filter */}
          <div className="space-y-1">
            <label className="text-slate-500 block">Tipe Aktivitas Shift</label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value as any)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:border-blue-500 font-semibold cursor-pointer"
            >
              <option value="all">Semua Sesi Shift (Manual & POS)</option>
              <option value="with_tx">Transaksi POS Terdaftar (Regular POS)</option>
              <option value="no_tx">Hanya Buka-Tutup Kasir (Manual Summary)</option>
            </select>
          </div>

          {/* Month Filter */}
          <div className="space-y-1">
            <label className="text-slate-500 block">Bulan</label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:border-blue-500 font-semibold cursor-pointer"
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
          </div>

          {/* Year Filter */}
          <div className="space-y-1">
            <label className="text-slate-500 block">Tahun</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:border-blue-500 font-semibold cursor-pointer"
            >
              <option value="all">Semua Tahun</option>
              <option value="2025">2025</option>
              <option value="2026">2026</option>
              <option value="2027">2027</option>
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white border border-slate-200 rounded-2xl shadow-sm">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs text-slate-500 font-semibold mt-2">Memuat data laporan shift...</p>
        </div>
      ) : (
        <>
          {/* Summary Dashboard Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Card 1: Total Modal Awal */}
            <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 bg-slate-50 text-slate-600 rounded-xl flex items-center justify-center border border-slate-200">
                <Clock className="w-6 h-6 text-slate-500" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Modal Awal (Opening)</span>
                <span className="text-xl font-extrabold text-slate-900">{formatCurrency(totalOpeningCash)}</span>
              </div>
            </div>

            {/* Card 2: Total Pendapatan Uang Masuk */}
            <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center border border-emerald-100">
                <TrendingUp className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Uang Masuk Bersih</span>
                <span className="text-xl font-extrabold text-emerald-600">{formatCurrency(totalCashInflow)}</span>
              </div>
            </div>

            {/* Card 3: Akumulasi Selisih Laci Kas */}
            <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${
                totalDiscrepancy < 0 
                  ? "bg-rose-50 text-rose-600 border-rose-100" 
                  : totalDiscrepancy > 0 
                    ? "bg-blue-50 text-blue-600 border-blue-100"
                    : "bg-slate-50 text-slate-600 border-slate-200"
              }`}>
                <DollarSign className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Akumulasi Selisih Kasir</span>
                <span className={`text-xl font-extrabold ${
                  totalDiscrepancy < 0 
                    ? "text-rose-600" 
                    : totalDiscrepancy > 0 
                      ? "text-blue-600" 
                      : "text-slate-900"
                }`}>
                  {totalDiscrepancy > 0 ? "+" : ""}{formatCurrency(totalDiscrepancy)}
                </span>
              </div>
            </div>
          </div>

          {/* Visual Chart section */}
          {closedShifts.length > 0 ? (
            <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-950">Grafik Trend Arus Kas Shift POS</h3>
              
              <div className="w-full">
                {isMounted ? (
                  <ResponsiveContainerComponent width="100%" height={320}>
                    <BarChartComponent data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
                      <CartesianGridComponent strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxisComponent dataKey="name" tick={{ fontSize: 10 }} stroke="#94a3b8" />
                      <YAxisComponent tick={{ fontSize: 10 }} stroke="#94a3b8" />
                      <TooltipComponent formatter={(value: any) => formatCurrency(Number(value))} contentStyle={{ fontSize: '11px', borderRadius: '12px' }} />
                      <LegendComponent wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                      <BarComponent dataKey="Modal Awal" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                      <BarComponent dataKey="Kas Akhir" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                      <BarComponent dataKey="Uang Masuk (Net)" fill="#10b981" radius={[4, 4, 0, 0]} />
                    </BarChartComponent>
                  </ResponsiveContainerComponent>
                ) : (
                  <div className="h-[320px] flex items-center justify-center text-slate-400">
                    Memuat grafik analisis...
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 p-8 rounded-2xl text-center text-slate-400">
              Tidak ada data shift yang ditutup untuk menampilkan grafik tren.
            </div>
          )}

          {/* Detailed Shift Logs Table */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-950 flex items-center gap-1.5">
                <History className="w-4 h-4 text-slate-500" /> Log Histori Sesi Shift Kasir ({filteredShifts.length})
              </h3>
            </div>

            {filteredShifts.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                      <th className="py-3 px-4">Kasir & Sesi Mulai</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4 text-right">Modal Awal</th>
                      <th className="py-3 px-4 text-right">Kas Sistem (Expected)</th>
                      <th className="py-3 px-4 text-right">Kas Fisik (Actual)</th>
                      <th className="py-3 px-4 text-center">Selisih (+/-)</th>
                      <th className="py-3 px-4 text-center">Uang Masuk (Net)</th>
                      <th className="py-3 px-4">Keterangan / Alasan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {filteredShifts.map((shift) => {
                      const openedDate = new Date(shift.opened_at).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit"
                      });

                      const invoiceCount = shift.invoices?.length || 0;
                      const hasTx = invoiceCount > 0 || shift.expected_closing_cash !== shift.opening_cash;

                      // Kuantitas bersih uang kas masuk = Kas Riil - Modal Awal (hanya jika shift sudah ditutup)
                      const netInflow = shift.actual_closing_cash !== null
                        ? Math.max(0, shift.actual_closing_cash - shift.opening_cash)
                        : 0;

                      // Selisih laci
                      const discrepancy = shift.actual_closing_cash !== null
                        ? shift.actual_closing_cash - shift.expected_closing_cash
                        : 0;

                      return (
                        <tr key={shift.id} className="hover:bg-slate-50/50 transition">
                          <td className="py-3.5 px-4 font-bold">
                            <div className="text-slate-900">{shift.employees?.name || "Owner/Admin"}</div>
                            <div className="text-[10px] text-slate-400 font-medium mt-0.5">{openedDate}</div>
                          </td>
                          
                          <td className="py-3.5 px-4 text-center">
                            {shift.status === "open" ? (
                              <span className="bg-amber-55 text-amber-600 border border-amber-100 px-2.5 py-0.5 rounded-full text-[9px] font-bold">
                                BUKA
                              </span>
                            ) : (
                              <span className="bg-slate-100 text-slate-500 border border-slate-200 px-2.5 py-0.5 rounded-full text-[9px] font-bold">
                                SELESAI
                              </span>
                            )}
                          </td>

                          <td className="py-3.5 px-4 text-right font-mono text-slate-600">
                            {formatCurrency(shift.opening_cash)}
                          </td>

                          <td className="py-3.5 px-4 text-right font-mono font-medium text-slate-700">
                            {formatCurrency(shift.expected_closing_cash)}
                            <div className="text-[9px] text-slate-400 font-bold mt-0.5">
                              {invoiceCount} Transaksi POS
                            </div>
                          </td>

                          <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900">
                            {shift.actual_closing_cash !== null 
                              ? formatCurrency(shift.actual_closing_cash) 
                              : "-"
                            }
                          </td>

                          <td className="py-3.5 px-4 text-center font-mono font-extrabold">
                            {shift.status === "closed" ? (
                              discrepancy > 0 ? (
                                <span className="text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">+{formatCurrency(discrepancy)}</span>
                              ) : discrepancy < 0 ? (
                                <span className="text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-100">{formatCurrency(discrepancy)}</span>
                              ) : (
                                <span className="text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">Pas</span>
                              )
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>

                          <td className="py-3.5 px-4 text-center font-mono font-extrabold text-emerald-600">
                            {shift.status === "closed" ? formatCurrency(netInflow) : "-"}
                          </td>

                          <td className="py-3.5 px-4 text-slate-500 max-w-[200px] truncate" title={shift.notes || ""}>
                            <div className="flex flex-col gap-0.5">
                              <span className="font-semibold text-slate-700">{shift.notes || "-"}</span>
                              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                                {hasTx ? "Tipe: Transaksi Biasa" : "Tipe: Buka-Tutup Kas Manual"}
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="bg-white border-t border-slate-100 p-12 text-center text-slate-400">
                Belum ada log shift kasir yang tercatat untuk periode dan tipe ini.
              </div>
            )}
          </div>
        </>
      )}

    </div>
  );
}
