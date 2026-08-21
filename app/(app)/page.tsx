"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { 
  FileText, 
  TrendingUp, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Plus, 
  Calendar,
  Users,
  DollarSign,
  ClipboardCheck,
  Wallet,
  ChevronRight,
  Sparkles
} from "lucide-react";
import { useBusiness } from "@/lib/context/BusinessContext";
import { createWebBrowserClient } from "@/lib/supabase/client";
import { useLanguage } from "@/lib/context/LanguageContext";

interface InvoiceActivity {
  id: string;
  invoice_number: string;
  customer_snapshot: any;
  total_amount: number;
  paid_amount: number;
  remaining_amount: number;
  status: string;
  issue_date: string;
  due_date?: string;
}

export default function DashboardPage() {
  const { activeBusiness, userRole, subscription } = useBusiness();
  const { t, locale } = useLanguage();
  
  // SME / Admin Dashboard State
  const [stats, setStats] = useState({
    totalOmset: 0,
    lunasAmount: 0,
    lunasCount: 0,
    outstandingAmount: 0,
    overdueAmount: 0,
    customerCount: 0
  });
  const [recentInvoices, setRecentInvoices] = useState<InvoiceActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [rawInvoices, setRawInvoices] = useState<InvoiceActivity[]>([]);
  const [customerCount, setCustomerCount] = useState(0);
  const [selectedMonth, setSelectedMonth] = useState<string>("all");
  const [selectedYear, setSelectedYear] = useState<string>("all");

  // Employee Dashboard State
  const [employeeInfo, setEmployeeInfo] = useState<any>(null);
  const [todayAttendance, setTodayAttendance] = useState<any>(null);
  const [leaveBalance, setLeaveBalance] = useState<any>(null);
  const [pendingClaimsCount, setPendingClaimsCount] = useState<number>(0);
  const [recentLeaves, setRecentLeaves] = useState<any[]>([]);
  const [empLoading, setEmpLoading] = useState(true);

  // Fetch Admin/Owner Dashboard Data
  const fetchDashboardData = async () => {
    if (!activeBusiness) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const supabase = createWebBrowserClient();

      const { data: invoices, error: invError } = await supabase
        .from("invoices")
        .select("id, invoice_number, status, total_amount, paid_amount, remaining_amount, issue_date, due_date, customer_snapshot")
        .eq("business_id", activeBusiness.id)
        .eq("type", "invoice");

      if (invError) throw invError;
      setRawInvoices(invoices || []);

      const { count: custCount, error: custError } = await supabase
        .from("customers")
        .select("*", { count: "exact", head: true })
        .eq("business_id", activeBusiness.id);

      if (custError) throw custError;
      setCustomerCount(custCount || 0);

    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch Employee Portal Data
  const fetchEmployeeDashboardData = async () => {
    if (!activeBusiness) {
      setEmpLoading(false);
      return;
    }
    try {
      setEmpLoading(true);
      const supabase = createWebBrowserClient();
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Get employee profile
      const { data: empData, error: empError } = await supabase
        .from("employees")
        .select("*")
        .eq("user_id", user.id)
        .eq("business_id", activeBusiness.id)
        .maybeSingle();

      if (empError || !empData) {
        console.error("Employee profile not found or error:", empError);
        setEmployeeInfo(null);
        return;
      }
      setEmployeeInfo(empData);

      // 2. Get today's attendance
      const todayStr = new Date().toISOString().split("T")[0];
      const { data: attData } = await supabase
        .from("attendances")
        .select("*")
        .eq("employee_id", empData.id)
        .eq("work_date", todayStr)
        .maybeSingle();
      setTodayAttendance(attData);

      // 3. Get leave balance
      const currentYear = new Date().getFullYear();
      const { data: balData } = await supabase
        .from("leave_balances")
        .select("*")
        .eq("employee_id", empData.id)
        .eq("year", currentYear)
        .maybeSingle();
      setLeaveBalance(balData);

      // 4. Get pending reimbursement claims count
      const { count: claimsCount } = await supabase
        .from("expense_claims")
        .select("id", { count: "exact", head: true })
        .eq("employee_id", empData.id)
        .eq("status", "pending");
      setPendingClaimsCount(claimsCount || 0);

      // 5. Get recent leave requests
      const { data: leaves } = await supabase
        .from("leave_requests")
        .select("*")
        .eq("employee_id", empData.id)
        .order("start_date", { ascending: false })
        .limit(3);
      setRecentLeaves(leaves || []);

    } catch (e) {
      console.error("Error fetching employee dashboard:", e);
    } finally {
      setEmpLoading(false);
    }
  };

  useEffect(() => {
    if (userRole === "employee") {
      fetchEmployeeDashboardData();
    } else {
      fetchDashboardData();
    }
  }, [activeBusiness, userRole]);

  // Reactive Stats & Recent Invoices updates based on filters
  useEffect(() => {
    if (userRole === "employee") return;

    let totalOmset = 0;
    let lunasAmount = 0;
    let lunasCount = 0;
    let outstandingAmount = 0;
    let overdueAmount = 0;

    const today = new Date();
    today.setHours(0,0,0,0);

    const filtered = rawInvoices.filter(inv => {
      if (!inv.issue_date) return true;
      const date = new Date(inv.issue_date);
      const m = date.getMonth() + 1; // 1-12
      const y = date.getFullYear();

      if (selectedMonth !== "all" && String(m) !== selectedMonth) return false;
      if (selectedYear !== "all" && String(y) !== selectedYear) return false;
      return true;
    });

    filtered.forEach(inv => {
      totalOmset += Number(inv.total_amount || 0);
      lunasAmount += Number(inv.paid_amount || 0);
      
      if (inv.status === "paid") {
        lunasCount++;
      }

      outstandingAmount += Number(inv.remaining_amount || 0);

      if (inv.status !== "paid" && inv.status !== "draft" && inv.due_date) {
        const dueDate = new Date(inv.due_date);
        if (dueDate < today) {
          overdueAmount += Number(inv.remaining_amount || 0);
        }
      }
    });

    setStats({
      totalOmset,
      lunasAmount,
      lunasCount,
      outstandingAmount,
      overdueAmount,
      customerCount
    });

    const sortedInvoices = [...filtered]
      .sort((a, b) => new Date(b.issue_date).getTime() - new Date(a.issue_date).getTime())
      .slice(0, 5);

    setRecentInvoices(sortedInvoices);

  }, [rawInvoices, selectedMonth, selectedYear, customerCount, userRole]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: activeBusiness?.default_currency || "IDR",
      maximumFractionDigits: 0
    }).format(val);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-100">
            {t("paid")}
          </span>
        );
      case "partial":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-600 border border-blue-100">
            {t("partial")}
          </span>
        );
      case "overdue":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-600 border border-rose-100">
            {t("overdue")}
          </span>
        );
      case "sent":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 text-sky-600 border border-sky-100">
            {t("sent")}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
            {t("draft")}
          </span>
        );
    }
  };

  // ----------------------------------------------------
  // RENDER PORTAL KARYAWAN (ESS)
  // ----------------------------------------------------
  if (userRole === "employee") {
    if (empLoading) {
      return (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs text-slate-500 font-semibold mt-2">
            Memuat portal karyawan Anda...
          </p>
        </div>
      );
    }

    if (!employeeInfo) {
      return (
        <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center max-w-xl mx-auto mt-10 card-shadow text-xs font-semibold">
          <AlertCircle className="w-12 h-12 mx-auto text-amber-500 mb-3" />
          <h3 className="text-lg font-bold text-slate-900 mb-1">Akun Karyawan Belum Sinkron</h3>
          <p className="text-sm text-slate-500 leading-relaxed">
            Data karyawan untuk akun Anda sedang diproses oleh Administrator. Silakan minta Admin bisnis Anda untuk memverifikasi email data karyawan Anda telah diset ke <strong>{activeBusiness?.email || "nintendoabangadit@gmail.com"}</strong>.
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Welcome Banner */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-3xl p-6 md:p-8 shadow-sm relative overflow-hidden">
          <div className="absolute right-0 top-0 translate-x-1/4 -translate-y-1/4 w-96 h-96 bg-white/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute left-1/3 bottom-0 translate-y-1/2 w-64 h-64 bg-indigo-500/20 rounded-full blur-2xl pointer-events-none" />
          
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-[10px] font-bold tracking-wider uppercase">
                <Sparkles className="w-3.5 h-3.5 text-amber-300" /> Portal Karyawan ESS
              </div>
              <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight mt-2">
                Halo, {employeeInfo.name}!
              </h2>
              <p className="text-sm text-blue-100 max-w-md">
                Selamat bekerja hari ini! Akses cepat presensi, pengajuan cuti, dan klaim pengeluaran di bawah ini.
              </p>
            </div>
            <div className="shrink-0 flex items-center gap-3 bg-white/10 backdrop-blur-md px-4 py-3 rounded-2xl border border-white/10">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-white font-extrabold text-sm shrink-0">
                {employeeInfo.name.charAt(0).toUpperCase()}
              </div>
              <div className="text-xs font-semibold">
                <div className="font-bold">{employeeInfo.name}</div>
                <div className="text-[10px] text-blue-200 mt-0.5">NIK: {employeeInfo.nik}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Dashboard Content Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Presensi Hari Ini */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col justify-between shadow-sm card-shadow text-xs font-semibold">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Presensi Hari Ini</span>
                <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                  <ClipboardCheck className="w-4.5 h-4.5" />
                </div>
              </div>
              <div className="py-2">
                {todayAttendance ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-sm font-bold text-slate-900">Sudah Check-In</span>
                    </div>
                    <div className="text-slate-500 font-medium space-y-1">
                      <div>Masuk: <strong className="text-slate-800 font-bold">{todayAttendance.check_in_time.substring(0, 5)}</strong></div>
                      {todayAttendance.check_out_time ? (
                        <div>Pulang: <strong className="text-slate-800 font-bold">{todayAttendance.check_out_time.substring(0, 5)}</strong></div>
                      ) : (
                        <div className="text-amber-600 font-semibold">Belum Check-Out</div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                      <span className="text-sm font-bold text-slate-900">Belum Presensi Masuk</span>
                    </div>
                    <p className="text-slate-400 font-medium leading-relaxed">Lakukan presensi mandiri dengan validasi lokasi (geofence) & biometrik.</p>
                  </div>
                )}
              </div>
            </div>
            <Link 
              href="/employees/attendance"
              className="mt-4 w-full py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-600 font-bold rounded-xl flex items-center justify-center gap-1.5 transition active:scale-95"
            >
              Buka Presensi <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Card 2: Saldo Cuti */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col justify-between shadow-sm card-shadow text-xs font-semibold">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Saldo Cuti Tahunan</span>
                <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Calendar className="w-4.5 h-4.5" />
                </div>
              </div>
              <div className="py-2 space-y-3">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-extrabold text-slate-900">
                    {leaveBalance ? (leaveBalance.allocated_days - leaveBalance.used_days) : 12}
                  </span>
                  <span className="text-slate-500 font-medium">Hari Tersisa</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div 
                    className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                    style={{ 
                      width: `${leaveBalance ? ((leaveBalance.allocated_days - leaveBalance.used_days) / leaveBalance.allocated_days) * 100 : 100}%` 
                    }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-slate-400 font-medium">
                  <span>Terpakai: {leaveBalance?.used_days || 0} Hari</span>
                  <span>Kuota: {leaveBalance?.allocated_days || 12} Hari</span>
                </div>
              </div>
            </div>
            <Link 
              href="/employees/leave"
              className="mt-4 w-full py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 font-bold rounded-xl flex items-center justify-center gap-1.5 transition active:scale-95"
            >
              Ajukan Cuti <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Card 3: Klaim Reimbursement */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col justify-between shadow-sm card-shadow text-xs font-semibold">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Klaim Reimbursement</span>
                <div className="w-8 h-8 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center">
                  <Wallet className="w-4.5 h-4.5" />
                </div>
              </div>
              <div className="py-2 space-y-2">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-extrabold text-slate-900">{pendingClaimsCount}</span>
                  <span className="text-slate-500 font-medium">Klaim Aktif</span>
                </div>
                <p className="text-slate-400 font-medium leading-relaxed">Pantau reimbursement medis, operasional, & perjalanan dinas Anda.</p>
              </div>
            </div>
            <Link 
              href="/employees/reimbursement"
              className="mt-4 w-full py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold rounded-xl flex items-center justify-center gap-1.5 transition active:scale-95"
            >
              Buat Klaim Baru <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Recent Leave Requests List */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm card-shadow overflow-hidden text-xs font-semibold">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-sm">Pengajuan Cuti Terakhir Anda</h3>
            <Link href="/employees/leave" className="text-xs font-bold text-blue-600 hover:text-blue-700 transition">
              Lihat Semua
            </Link>
          </div>
          <div className="divide-y divide-slate-100">
            {recentLeaves.length > 0 ? (
              recentLeaves.map((leave) => (
                <div key={leave.id} className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                      <Calendar className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-800 uppercase">
                        {leave.leave_type === "annual" ? "Cuti Tahunan" : "Izin / Sakit"}
                      </h4>
                      <span className="text-[10px] text-slate-400 font-medium">
                        {new Date(leave.start_date).toLocaleDateString("id-ID")} s/d {new Date(leave.end_date).toLocaleDateString("id-ID")} ({leave.total_days} Hari)
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    {leave.status === "approved" ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-100">
                        Disetujui
                      </span>
                    ) : leave.status === "rejected" ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-600 border border-rose-100">
                        Ditolak
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-600 border border-amber-100 animate-pulse">
                        Menunggu
                      </span>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-slate-400">
                <Calendar className="w-10 h-10 mx-auto text-slate-200 mb-2" />
                <p className="text-xs font-semibold">Belum ada riwayat pengajuan cuti</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // RENDER PORTAL SME / ADMIN
  // ----------------------------------------------------
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs text-slate-500 font-semibold mt-2">
          {locale === "en" ? "Loading dashboard..." : "Memuat dashboard..."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-xs font-semibold">
      
      {/* Welcome Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            {locale === "en" ? "Hello!" : "Halo!"} <span className="animate-bounce">👋</span>
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {locale === "en" ? "Welcome back to your business dashboard." : "Selamat datang kembali di dashboard bisnis Anda."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Month Selector */}
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="bg-white border border-slate-200 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-sm"
          >
            <option value="all">{locale === "en" ? "All Months" : "Semua Bulan"}</option>
            <option value="1">{locale === "en" ? "January" : "Januari"}</option>
            <option value="2">{locale === "en" ? "February" : "Februari"}</option>
            <option value="3">{locale === "en" ? "March" : "Maret"}</option>
            <option value="4">{locale === "en" ? "April" : "April"}</option>
            <option value="5">{locale === "en" ? "May" : "Mei"}</option>
            <option value="6">{locale === "en" ? "June" : "Juni"}</option>
            <option value="7">{locale === "en" ? "July" : "Juli"}</option>
            <option value="8">{locale === "en" ? "August" : "Agustus"}</option>
            <option value="9">{locale === "en" ? "September" : "September"}</option>
            <option value="10">{locale === "en" ? "October" : "Oktober"}</option>
            <option value="11">{locale === "en" ? "November" : "November"}</option>
            <option value="12">{locale === "en" ? "December" : "Desember"}</option>
          </select>

          {/* Year Selector */}
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="bg-white border border-slate-200 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-sm"
          >
            <option value="all">{locale === "en" ? "All Years" : "Semua Tahun"}</option>
            <option value="2024">2024</option>
            <option value="2025">2025</option>
            <option value="2026">2026</option>
            <option value="2027">2027</option>
            <option value="2028">2028</option>
          </select>
        </div>
      </div>

      {/* Subscription / Masa Aktif Status Bar */}
      {userRole !== "superadmin" && (
        <div className="bg-gradient-to-r from-blue-50/90 via-indigo-50/60 to-white border border-blue-100/80 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 card-shadow">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm shadow-blue-500/20">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900 flex items-center gap-2">
                <span>Masa Aktif:</span>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Aktif (1 Tahun Lisensi)
                </span>
              </div>
              <p className="text-[11px] text-slate-600 font-medium mt-1">
                {(() => {
                  const startDate = subscription?.activatedAt 
                    ? new Date(subscription.activatedAt) 
                    : new Date();
                  
                  const endDate = subscription?.expiresAt 
                    ? new Date(subscription.expiresAt) 
                    : (() => {
                        const d = new Date(startDate);
                        d.setFullYear(d.getFullYear() + 1);
                        return d;
                      })();

                  return (
                    <>
                      Masa aktif akun berlaku selama 1 tahun dari{" "}
                      <span className="font-bold text-slate-900">
                        {startDate.toLocaleDateString("id-ID", { dateStyle: "long" })}
                      </span>{" "}
                      sampai dengan{" "}
                      <span className="font-bold text-slate-900">
                        {endDate.toLocaleDateString("id-ID", { dateStyle: "long" })}
                      </span>.
                    </>
                  );
                })()}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        
        {/* Card 1: Total Omset (Blue) */}
        <div className="bg-blue-600 text-white p-6 rounded-2xl flex flex-col justify-between h-40 shadow-sm relative overflow-hidden">
          <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-white/10 rounded-full blur-xl" />
          <div className="flex items-center justify-between z-10">
            <span className="text-xs font-semibold uppercase tracking-wider text-blue-100">
              {locale === "en" ? "Total Revenue" : "Total Omset"}
            </span>
            <TrendingUp className="w-5 h-5 text-blue-200" />
          </div>
          <div className="space-y-1 z-10">
            <span className="text-2xl font-extrabold block truncate">{formatCurrency(stats.totalOmset)}</span>
            <span className="text-[10px] text-blue-100 font-medium">
              {locale === "en" ? "Based on all invoices" : "Berdasarkan total semua invoice"}
            </span>
          </div>
        </div>

        {/* Card 2: Lunas / Terbayar (White) */}
        <div className="bg-white border border-slate-200 p-6 rounded-2xl flex flex-col justify-between h-40 shadow-sm card-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              {locale === "en" ? "Paid" : "Terbayar"}
            </span>
            <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="space-y-1">
            <span className="text-2xl font-extrabold text-slate-900 block truncate">{formatCurrency(stats.lunasAmount)}</span>
            <span className="text-[10px] text-slate-500 font-medium">
              {stats.lunasCount} {locale === "en" ? "Paid Invoices" : "Invoice Terbayar"}
            </span>
          </div>
        </div>

        {/* Card 3: Outstanding / Sisa Piutang (White) */}
        <div className="bg-white border border-slate-200 p-6 rounded-2xl flex flex-col justify-between h-40 shadow-sm card-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              {locale === "en" ? "Outstanding Balance" : "Sisa Piutang"}
            </span>
            <div className="w-8 h-8 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="space-y-1">
            <span className="text-2xl font-extrabold text-slate-900 block truncate">{formatCurrency(stats.outstandingAmount)}</span>
            <span className="text-[10px] text-rose-600 font-semibold">
              {stats.overdueAmount > 0 
                ? `${formatCurrency(stats.overdueAmount)} ${locale === "en" ? "Overdue" : "Terlambat"}` 
                : (locale === "en" ? "No overdue dues" : "Tidak ada jatuh tempo")}
            </span>
          </div>
        </div>

      </div>

      {/* Income Trend SVG Chart */}
      <div className="bg-white border border-slate-200 p-6 rounded-2xl card-shadow space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">
              {locale === "en" ? "Revenue Trend" : "Tren Pendapatan"}
            </h3>
            <p className="text-xs text-slate-500">
              {locale === "en" ? "Overview of financial performance" : "Gambaran kinerja keuangan"}
            </p>
          </div>
          <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg">
            {activeBusiness?.default_currency || "IDR"}
          </span>
        </div>

        {/* Clean Custom SVG Line Chart */}
        <div className="relative h-44 w-full">
          <svg className="w-full h-full" viewBox="0 0 500 150" preserveAspectRatio="none">
            <defs>
              <linearGradient id="chart-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#004de6" stopOpacity="0.15" />
                <stop offset="100%" stopColor="#004de6" stopOpacity="0.0" />
              </linearGradient>
            </defs>
            {/* Grid lines */}
            <line x1="0" y1="25" x2="500" y2="25" stroke="#f1f5f9" strokeWidth="1" />
            <line x1="0" y1="75" x2="500" y2="75" stroke="#f1f5f9" strokeWidth="1" />
            <line x1="0" y1="125" x2="500" y2="125" stroke="#f1f5f9" strokeWidth="1" />
            
            {/* Fill Area */}
            <path 
              d="M 0,120 C 50,110 80,135 120,130 C 180,120 200,30 250,55 C 300,80 320,135 370,125 C 420,115 450,20 500,35 L 500,150 L 0,150 Z" 
              fill="url(#chart-grad)" 
            />
            {/* Curve line */}
            <path 
              d="M 0,120 C 50,110 80,135 120,130 C 180,120 200,30 250,55 C 300,80 320,135 370,125 C 420,115 450,20 500,35" 
              fill="none" 
              stroke="#004de6" 
              strokeWidth="3.5" 
              strokeLinecap="round"
            />
          </svg>
        </div>
      </div>

      {/* Recent Activities Section */}
      <div className="bg-white border border-slate-200 rounded-2xl card-shadow overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-900 text-sm">
            {locale === "en" ? "Recent Invoices" : "Invoice Terbaru"}
          </h3>
          <Link href="/invoice" className="text-xs font-bold text-blue-600 hover:text-blue-700 transition">
            {locale === "en" ? "View All" : "Lihat Semua"}
          </Link>
        </div>

        <div className="divide-y divide-slate-100">
          {recentInvoices.length > 0 ? (
            recentInvoices.map((inv) => (
              <Link 
                key={inv.id} 
                href={`/invoice/${inv.id}`}
                className="p-4 flex items-center justify-between hover:bg-slate-50 transition cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                    <FileText className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-800">
                      {inv.customer_snapshot?.name || (locale === "en" ? "General Customer" : "Pelanggan Umum")}
                    </h4>
                    <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">{inv.invoice_number}</span>
                  </div>
                </div>
                <div className="text-right space-y-1">
                  <span className="text-sm font-bold text-slate-900 block">{formatCurrency(inv.total_amount)}</span>
                  {getStatusBadge(inv.status)}
                </div>
              </Link>
            ))
          ) : (
            <div className="p-8 text-center text-slate-400">
              <FileText className="w-10 h-10 mx-auto text-slate-200 mb-2" />
              <p className="text-xs font-semibold">
                {locale === "en" ? "No invoices created yet" : "Belum ada invoice dibuat"}
              </p>
              <Link 
                href="/invoice/new" 
                className="text-xs font-bold text-blue-600 hover:underline mt-1 inline-block"
              >
                {locale === "en" ? "Create your first invoice" : "Buat Invoice Pertama Anda"}
              </Link>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
