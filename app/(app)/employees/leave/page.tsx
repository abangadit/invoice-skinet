"use client";

import React, { useEffect, useState } from "react";
import {
  Calendar,
  Plus,
  Check,
  X,
  AlertCircle,
  Clock,
  User,
  CheckCircle2,
  XCircle,
  Users,
  Briefcase,
  Sliders,
  Sparkles,
  Info,
  Upload,
  FileText,
  ExternalLink
} from "lucide-react";
import { useBusiness } from "../../../../lib/context/BusinessContext";
import { createWebBrowserClient } from "../../../../lib/supabase/client";
import { uploadImageToR2 } from "../../../../lib/utils/upload";

interface LeaveRequest {
  id: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  total_days: number;
  reason: string | null;
  status: "pending" | "approved" | "rejected";
  attachment_url?: string | null;
  created_at: string;
  employee: {
    id: string;
    name: string;
    email: string | null;
  };
  approver?: {
    name: string;
  } | null;
}

interface LeaveBalance {
  id: string;
  employee_id: string;
  employee_name: string;
  year: number;
  allocated_days: number;
  used_days: number;
  remaining_days: number;
}

interface Employee {
  id: string;
  name: string;
  email: string | null;
  user_id: string | null;
}

export default function LeavePage() {
  const { activeBusiness, userRole, systemRole } = useBusiness();
  const isOwnerOrAdmin = userRole === "owner" || userRole === "admin" || userRole === "superadmin" || systemRole === "superadmin";
  const [activeTab, setActiveTab] = useState<"ess" | "admin">("ess");
  const [loading, setLoading] = useState(true);
  const [currentEmployee, setCurrentEmployee] = useState<Employee | null>(null);
  
  // ESS States
  const [myRequests, setMyRequests] = useState<LeaveRequest[]>([]);
  const [myBalance, setMyBalance] = useState<LeaveBalance | null>(null);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [submittingApply, setSubmittingApply] = useState(false);
  const [applyError, setApplyError] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [applyForm, setApplyForm] = useState({
    leaveType: "annual",
    startDate: new Date().toISOString().split("T")[0],
    endDate: new Date().toISOString().split("T")[0],
    reason: ""
  });

  // Admin States
  const [allRequests, setAllRequests] = useState<LeaveRequest[]>([]);
  const [allBalances, setAllBalances] = useState<LeaveBalance[]>([]);
  const [allEmployees, setAllEmployees] = useState<Employee[]>([]);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  
  // Balance Manage Modal
  const [showBalanceModal, setShowBalanceModal] = useState(false);
  const [selectedEmpForBalance, setSelectedEmpForBalance] = useState("");
  const [balanceForm, setBalanceForm] = useState({
    year: new Date().getFullYear(),
    allocatedDays: 12
  });
  const [balanceError, setBalanceError] = useState("");
  const [savingBalance, setSavingBalance] = useState(false);

  // Auto-calculation of days
  const calculateTotalDays = (start: string, end: string) => {
    const sDate = new Date(start);
    const eDate = new Date(end);
    if (isNaN(sDate.getTime()) || isNaN(eDate.getTime())) return 0;
    
    // Count days
    let count = 0;
    const cur = new Date(sDate);
    while (cur <= eDate) {
      // Exclude weekends (Saturday = 6, Sunday = 0)
      const day = cur.getDay();
      if (day !== 0 && day !== 6) {
        count++;
      }
      cur.setDate(cur.getDate() + 1);
    }
    return count;
  };

  const currentTotalDays = calculateTotalDays(applyForm.startDate, applyForm.endDate);

  const fetchESSData = async (employeeId: string) => {
    try {
      const supabase = createWebBrowserClient();
      
      // Fetch Balance for current year
      const currentYear = new Date().getFullYear();
      const { data: balanceData, error: balanceError } = await supabase
        .from("leave_balances")
        .select("*")
        .eq("employee_id", employeeId)
        .eq("year", currentYear)
        .maybeSingle();

      if (balanceData) {
        setMyBalance({
          id: balanceData.id,
          employee_id: balanceData.employee_id,
          employee_name: currentEmployee?.name || "",
          year: balanceData.year,
          allocated_days: balanceData.allocated_days,
          used_days: balanceData.used_days,
          remaining_days: balanceData.remaining_days
        });
      } else {
        setMyBalance({
          id: "",
          employee_id: employeeId,
          employee_name: currentEmployee?.name || "",
          year: currentYear,
          allocated_days: 12,
          used_days: 0,
          remaining_days: 12
        });
      }

      // Fetch personal requests
      const { data: requestsData, error: reqError } = await supabase
        .from("leave_requests")
        .select(`
          id, leave_type, start_date, end_date, total_days, reason, status, created_at, attachment_url,
          employee:employee_id (id, name, email)
        `)
        .eq("employee_id", employeeId)
        .order("created_at", { ascending: false });

      if (reqError) throw reqError;
      setMyRequests((requestsData || []) as any);

    } catch (err) {
      console.error("Error loading ESS leave data:", err);
    }
  };

  const fetchAdminData = async () => {
    if (!activeBusiness) return;
    try {
      const supabase = createWebBrowserClient();

      // Fetch all employees for list/balances dropdowns
      const { data: empData } = await supabase
        .from("employees")
        .select("id, name, email, user_id")
        .eq("business_id", activeBusiness.id)
        .order("name", { ascending: true });
      
      setAllEmployees((empData || []) as any);

      // Fetch all leave requests in active business
      const { data: allReqData, error: reqError } = await supabase
        .from("leave_requests")
        .select(`
          id, leave_type, start_date, end_date, total_days, reason, status, created_at, attachment_url,
          employee:employee_id (id, name, email)
        `)
        .eq("business_id", activeBusiness.id)
        .order("created_at", { ascending: false });

      if (reqError) throw reqError;
      setAllRequests((allReqData || []) as any);

      // Fetch all balances for current year
      const currentYear = new Date().getFullYear();
      const { data: balData, error: balError } = await supabase
        .from("leave_balances")
        .select(`
          id, employee_id, year, allocated_days, used_days, remaining_days,
          employee:employee_id (id, name)
        `)
        .eq("year", currentYear);

      if (balError) throw balError;
      
      const formattedBalances = (balData || []).map((b: any) => ({
        id: b.id,
        employee_id: b.employee_id,
        employee_name: b.employee?.name || "Karyawan",
        year: b.year,
        allocated_days: b.allocated_days,
        used_days: b.used_days,
        remaining_days: b.remaining_days
      }));
      setAllBalances(formattedBalances);

    } catch (err) {
      console.error("Error loading Admin leave data:", err);
    }
  };

  const initializeUserSession = async () => {
    if (!activeBusiness) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const supabase = createWebBrowserClient();
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError || !user) {
        setLoading(false);
        return;
      }

      // Check employee record
      let emp: Employee | null = null;
      
      // Query by user_id
      const { data: empByUid } = await supabase
        .from("employees")
        .select("id, name, email, user_id")
        .eq("business_id", activeBusiness.id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (empByUid) {
        emp = empByUid as any;
      } else if (user.email) {
        // Fallback: search by email & auto-link
        const { data: empByEmail } = await supabase
          .from("employees")
          .select("id, name, email, user_id")
          .eq("business_id", activeBusiness.id)
          .eq("email", user.email)
          .maybeSingle();

        if (empByEmail) {
          console.log("Auto-linking employee record to user session...");
          const { data: updatedEmp } = await supabase
            .from("employees")
            .update({ user_id: user.id })
            .eq("id", empByEmail.id)
            .select("id, name, email, user_id")
            .single();
          emp = updatedEmp as any;
        }
      }

      setCurrentEmployee(emp);

      // Routing tab default view
      if (isOwnerOrAdmin) {
        if (!emp) {
          setActiveTab("admin");
        }
      }

      if (emp) {
        await fetchESSData(emp.id);
      }
      if (isOwnerOrAdmin) {
        await fetchAdminData();
      }

    } catch (e) {
      console.error("Error initializing session:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    initializeUserSession();
  }, [activeBusiness, userRole, systemRole]);

  // Handle Apply Leave
  const handleApplyLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBusiness || !currentEmployee) return;

    if (currentTotalDays <= 0) {
      setApplyError("Tanggal mulai dan berakhir tidak valid atau bertepatan dengan akhir pekan.");
      return;
    }

    if (applyForm.leaveType === "annual" && myBalance && currentTotalDays > myBalance.remaining_days) {
      setApplyError(`Sisa kuota cuti tahunan Anda tidak mencukupi (${myBalance.remaining_days} hari tersisa, mengajukan ${currentTotalDays} hari).`);
      return;
    }

    try {
      setSubmittingApply(true);
      setApplyError("");
      const supabase = createWebBrowserClient();

      let attachmentUrl = null;
      if (selectedFile) {
        if (selectedFile.type.startsWith("image/")) {
          attachmentUrl = await uploadImageToR2(selectedFile, "leaves");
        } else {
          const formData = new FormData();
          formData.append("file", selectedFile);
          formData.append("folder", "leaves");
          const response = await fetch("/api/upload", {
            method: "POST",
            body: formData,
          });
          if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.error || "Gagal mengunggah file lampiran.");
          }
          const uploadData = await response.json();
          attachmentUrl = uploadData.url;
        }
      }

      const { error } = await supabase
        .from("leave_requests")
        .insert({
          business_id: activeBusiness.id,
          employee_id: currentEmployee.id,
          leave_type: applyForm.leaveType,
          start_date: applyForm.startDate,
          end_date: applyForm.endDate,
          total_days: currentTotalDays,
          reason: applyForm.reason || null,
          status: "pending",
          attachment_url: attachmentUrl
        });

      if (error) throw error;

      setShowApplyModal(false);
      setSelectedFile(null);
      setApplyForm({
        leaveType: "annual",
        startDate: new Date().toISOString().split("T")[0],
        endDate: new Date().toISOString().split("T")[0],
        reason: ""
      });
      
      // Reload Data
      await fetchESSData(currentEmployee.id);
      if (isOwnerOrAdmin) {
        await fetchAdminData();
      }
      alert("Pengajuan cuti Anda berhasil dikirim ke manajer.");
    } catch (err: any) {
      console.error("Error applying leave:", err);
      setApplyError(err.message || "Gagal mengirimkan pengajuan cuti.");
    } finally {
      setSubmittingApply(false);
    }
  };

  // Handle Approve/Reject
  const handleProcessRequest = async (reqId: string, status: "approved" | "rejected") => {
    try {
      setActionLoading(reqId);
      const supabase = createWebBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase
        .from("leave_requests")
        .update({
          status,
          approved_by: user?.id || null
        })
        .eq("id", reqId);

      if (error) throw error;

      // Reload
      if (currentEmployee) {
        await fetchESSData(currentEmployee.id);
      }
      await fetchAdminData();
    } catch (err: any) {
      console.error("Error processing leave request:", err);
      alert(err.message || "Gagal memproses pengajuan cuti.");
    } finally {
      setActionLoading(null);
    }
  };

  // Create or Update Leave Balance
  const handleSaveBalance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmpForBalance) {
      setBalanceError("Silakan pilih karyawan terlebih dahulu.");
      return;
    }

    try {
      setSavingBalance(true);
      setBalanceError("");
      const supabase = createWebBrowserClient();

      const { error } = await supabase
        .from("leave_balances")
        .upsert({
          employee_id: selectedEmpForBalance,
          year: Number(balanceForm.year),
          allocated_days: Number(balanceForm.allocatedDays)
        }, {
          onConflict: "employee_id, year"
        });

      if (error) throw error;

      setShowBalanceModal(false);
      setSelectedEmpForBalance("");
      await fetchAdminData();
      alert("Saldo kuota cuti tahunan karyawan berhasil disimpan.");
    } catch (err: any) {
      console.error("Error saving leave balance:", err);
      setBalanceError(err.message || "Gagal menyimpan saldo cuti.");
    } finally {
      setSavingBalance(false);
    }
  };

  // Auto register self as employee for testing (Owner only helper)
  const handleRegisterSelfAsEmployee = async () => {
    if (!activeBusiness) return;
    try {
      setLoading(true);
      const supabase = createWebBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) return;

      const { error } = await supabase
        .from("employees")
        .insert({
          business_id: activeBusiness.id,
          name: user.user_metadata?.full_name || "Pemilik Bisnis",
          email: user.email || null,
          user_id: user.id,
          nik: "9999999999999999",
          ptkp_status: "TK/0",
          basic_salary: 0,
          allowance_fixed: 0,
          join_date: new Date().toISOString().split("T")[0],
          is_active: true
        });

      if (error) throw error;
      await initializeUserSession();
      alert("Profil Anda berhasil didaftarkan sebagai Karyawan. Anda sekarang dapat mencoba mengajukan cuti.");
    } catch (err: any) {
      console.error("Error registering self as employee:", err);
      alert(err.message || "Gagal mendaftarkan diri.");
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-100">
            <CheckCircle2 className="w-3.5 h-3.5" /> Disetujui
          </span>
        );
      case "rejected":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-600 border border-rose-100">
            <XCircle className="w-3.5 h-3.5" /> Ditolak
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-600 border border-amber-100">
            <Clock className="w-3.5 h-3.5" /> Pending
          </span>
        );
    }
  };

  const translateLeaveType = (type: string) => {
    switch (type) {
      case "annual":
        return "Cuti Tahunan";
      case "sick":
        return "Sakit";
      case "maternity":
        return "Melahirkan";
      case "unpaid":
        return "Cuti Di Luar Tanggungan";
      default:
        return type;
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-semibold">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            Portal Pengajuan Cuti (Leave Portal)
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">Kelola kuota cuti tahunan karyawan, ajukan permohonan cuti, dan tinjau persetujuan.</p>
        </div>
        {currentEmployee && (
          <button
            onClick={() => {
              setApplyError("");
              setShowApplyModal(true);
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold py-2.5 px-4 rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition shrink-0 self-start sm:self-auto active:scale-95"
          >
            <Plus className="w-4 h-4" /> Ajukan Cuti Baru
          </button>
        )}
      </div>

      {/* Tabs Menu */}
      <div className="flex border-b border-slate-200 text-xs font-bold gap-6">
        <button
          onClick={() => setActiveTab("ess")}
          className={`pb-3 transition font-extrabold ${
            activeTab === "ess"
              ? "border-b-2 border-blue-600 text-blue-600"
              : "text-slate-500 hover:text-slate-900"
          }`}
        >
          Portal Mandiri Karyawan (ESS)
        </button>
        {isOwnerOrAdmin && (
          <button
            onClick={() => setActiveTab("admin")}
            className={`pb-3 transition font-extrabold ${
              activeTab === "admin"
                ? "border-b-2 border-blue-600 text-blue-600"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            Panel Manajemen (Admin)
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs text-slate-500 font-semibold mt-2">Menyelaraskan data portal...</p>
        </div>
      ) : activeTab === "ess" ? (
        // PORTAL ESS VIEW
        <div className="space-y-6">
          {/* ESS Metric Cards */}
          {myBalance && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm flex items-center gap-4 card-shadow">
                <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center border border-blue-100">
                  <Sparkles className="w-6 h-6 text-blue-650" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Jatah Kuota Tahunan ({myBalance.year})</span>
                  <span className="text-xl font-extrabold text-slate-900">{myBalance.allocated_days} Hari</span>
                </div>
              </div>

              <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm flex items-center gap-4 card-shadow">
                <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center border border-rose-100">
                  <Calendar className="w-6 h-6 text-rose-600" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Kuota Telah Diambil</span>
                  <span className="text-xl font-extrabold text-slate-900">{myBalance.used_days} Hari</span>
                </div>
              </div>

              <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm flex items-center gap-4 card-shadow">
                <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center border border-emerald-100">
                  <Check className="w-6 h-6 text-emerald-600" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Sisa Cuti Tersedia</span>
                  <span className="text-xl font-extrabold text-slate-900">{myBalance.remaining_days} Hari</span>
                </div>
              </div>
            </div>
          )}

          {/* ESS History list */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Riwayat Pengajuan Cuti Saya</h3>
            {myRequests.length > 0 ? (
              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden card-shadow text-xs font-semibold">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                        <th className="py-3 px-4">Tipe Cuti</th>
                        <th className="py-3 px-4">Tanggal Mulai</th>
                        <th className="py-3 px-4">Tanggal Berakhir</th>
                        <th className="py-3 px-4 text-center">Durasi Hari</th>
                        <th className="py-3 px-4">Alasan Pengajuan</th>
                        <th className="py-3 px-4 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {myRequests.map((req) => (
                        <tr key={req.id} className="hover:bg-slate-50 transition">
                          <td className="py-3.5 px-4 font-bold text-slate-900">
                            {translateLeaveType(req.leave_type)}
                          </td>
                          <td className="py-3.5 px-4 font-bold text-slate-600">
                            {new Date(req.start_date).toLocaleDateString("id-ID", { dateStyle: "long" })}
                          </td>
                          <td className="py-3.5 px-4 font-bold text-slate-600">
                            {new Date(req.end_date).toLocaleDateString("id-ID", { dateStyle: "long" })}
                          </td>
                          <td className="py-3.5 px-4 text-center font-extrabold text-slate-900">
                            {req.total_days} Hari
                          </td>
                          <td className="py-3.5 px-4 text-slate-500 max-w-xs truncate" title={req.reason || ""}>
                            <div>{req.reason || "-"}</div>
                            {req.attachment_url && (
                              <a 
                                href={req.attachment_url} 
                                target="_blank" 
                                rel="noreferrer" 
                                className="text-[10px] text-blue-600 hover:underline font-bold inline-flex items-center gap-0.5 mt-1"
                              >
                                <FileText className="w-3 h-3" /> Bukti Lampiran
                              </a>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            {getStatusBadge(req.status)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center text-slate-400 shadow-sm text-xs">
                <Calendar className="w-10 h-10 mx-auto text-slate-200 mb-2" />
                <p className="font-bold">Belum ada riwayat pengajuan cuti</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Sisa saldo cuti Anda dapat digunakan dengan mengajukan cuti baru di atas.</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        // PANEL ADMIN VIEW
        <div className="space-y-6">
          {/* Owner Test Helper Notice */}
          {!currentEmployee && isOwnerOrAdmin && (
            <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex gap-2 text-blue-700 font-medium">
                <Info className="w-5 h-5 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Mode Pengembang / Pemilik Bisnis</p>
                  <p className="text-blue-600 mt-0.5">Anda belum terdaftar sebagai Karyawan di bisnis ini. Daftarkan diri Anda agar dapat menguji menu Portal ESS Mandiri secara langsung.</p>
                </div>
              </div>
              <button
                onClick={handleRegisterSelfAsEmployee}
                className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold py-2 px-4 rounded-xl shrink-0 transition"
              >
                Daftarkan Diri Sebagai Karyawan
              </button>
            </div>
          )}

          {/* Pending Leave Requests */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-amber-500" /> Pengajuan Cuti Menunggu Persetujuan
            </h3>
            {allRequests.filter(r => r.status === "pending").length > 0 ? (
              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden card-shadow text-xs font-semibold">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                        <th className="py-3 px-4">Nama Karyawan</th>
                        <th className="py-3 px-4">Tipe Cuti</th>
                        <th className="py-3 px-4">Mulai / Selesai</th>
                        <th className="py-3 px-4 text-center">Durasi</th>
                        <th className="py-3 px-4">Alasan</th>
                        <th className="py-3 px-4 text-center">Aksi Persetujuan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {allRequests.filter(r => r.status === "pending").map((req) => (
                        <tr key={req.id} className="hover:bg-slate-50 transition">
                          <td className="py-3.5 px-4 font-bold text-slate-900">
                            {req.employee?.name}
                            <div className="text-[10px] text-slate-400 font-medium font-mono">{req.employee?.email}</div>
                          </td>
                          <td className="py-3.5 px-4 font-bold text-slate-750">
                            {translateLeaveType(req.leave_type)}
                          </td>
                          <td className="py-3.5 px-4 font-medium text-slate-600">
                            {req.start_date} s/d {req.end_date}
                          </td>
                          <td className="py-3.5 px-4 text-center font-extrabold text-slate-900">
                            {req.total_days} Hari
                          </td>
                          <td className="py-3.5 px-4 text-slate-500 max-w-xs truncate" title={req.reason || ""}>
                            <div>{req.reason || "-"}</div>
                            {req.attachment_url && (
                              <a 
                                href={req.attachment_url} 
                                target="_blank" 
                                rel="noreferrer" 
                                className="text-[10px] text-blue-600 hover:underline font-bold inline-flex items-center gap-0.5 mt-1"
                              >
                                <FileText className="w-3 h-3" /> Bukti Lampiran
                              </a>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                disabled={actionLoading === req.id}
                                onClick={() => handleProcessRequest(req.id, "approved")}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-3 py-1.5 rounded-lg transition text-[10px] flex items-center gap-1 active:scale-95 disabled:opacity-50"
                              >
                                <Check className="w-3.5 h-3.5" /> Setujui
                              </button>
                              <button
                                disabled={actionLoading === req.id}
                                onClick={() => handleProcessRequest(req.id, "rejected")}
                                className="bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-100 font-extrabold px-3 py-1.5 rounded-lg transition text-[10px] flex items-center gap-1 active:scale-95 disabled:opacity-50"
                              >
                                <X className="w-3.5 h-3.5" /> Tolak
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-slate-400 shadow-sm text-xs">
                <CheckCircle2 className="w-8 h-8 mx-auto text-slate-200 mb-2" />
                <p className="font-bold text-slate-500">Semua bersih! Tidak ada antrean pengajuan cuti pending.</p>
              </div>
            )}
          </div>

          {/* Leave Balances Management & History Log */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Balance List */}
            <div className="lg:col-span-1 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <Sliders className="w-4 h-4 text-blue-600" /> Saldo Cuti ({new Date().getFullYear()})
                </h3>
                <button
                  onClick={() => {
                    setBalanceError("");
                    setShowBalanceModal(true);
                  }}
                  className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-0.5"
                >
                  <Plus className="w-3.5 h-3.5" /> Atur Saldo
                </button>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 space-y-3 max-h-[400px] overflow-y-auto card-shadow">
                {allBalances.length > 0 ? (
                  allBalances.map(bal => (
                    <div key={bal.id || bal.employee_id} className="border-b border-slate-100 last:border-0 pb-2.5 last:pb-0 flex items-center justify-between text-xs">
                      <div>
                        <div className="font-bold text-slate-800">{bal.employee_name}</div>
                        <div className="text-[10px] text-slate-400 font-medium">Tahun {bal.year}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-extrabold text-slate-900">{bal.remaining_days} / {bal.allocated_days} Hari</div>
                        <div className="text-[9px] text-slate-400 font-bold">TERPAKAI: {bal.used_days} Hari</div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-slate-400 py-10 font-bold">Belum ada saldo cuti diinisialisasi.</p>
                )}
              </div>
            </div>

            {/* All Leave Requests Log */}
            <div className="lg:col-span-2 space-y-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-slate-500" /> Seluruh Riwayat Cuti Karyawan
              </h3>
              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 card-shadow text-xs font-semibold max-h-[400px] overflow-y-auto">
                {allRequests.length > 0 ? (
                  <div className="space-y-3">
                    {allRequests.map((req) => (
                      <div key={req.id} className="border-b border-slate-100 last:border-0 pb-3 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-1.5 font-bold text-slate-800">
                            <span>{req.employee?.name}</span>
                            <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border">
                              {translateLeaveType(req.leave_type)}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            {req.start_date} s/d {req.end_date} ({req.total_days} Hari)
                          </div>
                          {req.reason && <p className="text-[10px] text-slate-500 font-medium italic mt-1">"{req.reason}"</p>}
                        </div>
                        <div className="self-start sm:self-center">
                          {getStatusBadge(req.status)}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-slate-400 py-20 font-bold">Belum ada pengajuan cuti.</p>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ESS apply Modal */}
      {showApplyModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col text-xs font-semibold">
            
            <div className="p-5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-950 flex items-center gap-1.5">
                <Briefcase className="w-4.5 h-4.5 text-blue-600" />
                Formulir Permohonan Cuti
              </h3>
              <button onClick={() => setShowApplyModal(false)} className="text-slate-400 hover:text-slate-600 transition">
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            {applyError && (
              <div className="mx-5 mt-4 bg-rose-50 border border-rose-100 text-rose-600 p-2.5 rounded-xl flex items-start gap-1.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{applyError}</span>
              </div>
            )}

            <form onSubmit={handleApplyLeave} className="p-5 space-y-4">
              
              <div className="space-y-1">
                <label className="text-slate-500">Tipe Pengajuan Cuti</label>
                <select
                  value={applyForm.leaveType}
                  onChange={(e) => setApplyForm({ ...applyForm, leaveType: e.target.value })}
                  className="w-full bg-white border border-slate-200 px-3 py-2.5 rounded-xl text-slate-800 focus:outline-none focus:border-blue-500 font-bold shadow-sm"
                >
                  <option value="annual">Cuti Tahunan (Dipotong Kuota)</option>
                  <option value="sick">Cuti Sakit (Khusus Sakit/Disertai Surat Dokter)</option>
                  <option value="maternity">Cuti Melahirkan</option>
                  <option value="unpaid">Cuti Di Luar Tanggungan (Tanpa Gaji)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-500">Tanggal Mulai</label>
                  <input
                    type="date"
                    required
                    value={applyForm.startDate}
                    onChange={(e) => setApplyForm({ ...applyForm, startDate: e.target.value })}
                    className="w-full bg-white border border-slate-200 px-3.5 py-2 rounded-xl text-slate-800 focus:outline-none focus:border-blue-500 font-bold shadow-sm"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-500">Tanggal Berakhir</label>
                  <input
                    type="date"
                    required
                    value={applyForm.endDate}
                    onChange={(e) => setApplyForm({ ...applyForm, endDate: e.target.value })}
                    className="w-full bg-white border border-slate-200 px-3.5 py-2 rounded-xl text-slate-800 focus:outline-none focus:border-blue-500 font-bold shadow-sm"
                  />
                </div>
              </div>

              {/* Day Calc Preview */}
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 flex items-center justify-between text-xs font-bold text-slate-750">
                <span>Estimasi Durasi Kerja Cuti:</span>
                <span className="text-blue-600">{currentTotalDays} Hari Kerja</span>
              </div>

              <div className="space-y-1">
                <label className="text-slate-500 block">Keterangan / Alasan Cuti</label>
                <textarea
                  required
                  value={applyForm.reason}
                  onChange={(e) => setApplyForm({ ...applyForm, reason: e.target.value })}
                  placeholder="e.g. Ingin menghadiri acara pernikahan saudara kandung di luar kota."
                  rows={3}
                  className="w-full bg-white border border-slate-200 px-3.5 py-2 rounded-xl text-slate-800 focus:outline-none focus:border-blue-500 font-semibold"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-500 block">Lampiran Bukti (Gambar / PDF)</label>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 transition cursor-pointer"
                />
                <p className="text-[9px] text-slate-400">Unggah berkas bukti berupa foto surat dokter, tiket perjalanan, dsb (Maks. 10MB).</p>
              </div>

              <div className="border-t border-slate-100 pt-4 flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setShowApplyModal(false)}
                  className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold px-4 py-2 rounded-xl transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submittingApply}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold px-5 py-2 rounded-xl shadow-sm transition disabled:opacity-50 active:scale-95"
                >
                  {submittingApply ? "Mengirim..." : "Kirim Pengajuan"}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Admin manage balance modal */}
      {showBalanceModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col text-xs font-semibold">
            
            <div className="p-5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-950 flex items-center gap-1.5">
                <Sliders className="w-4.5 h-4.5 text-blue-600" />
                Atur Saldo Kuota Cuti
              </h3>
              <button onClick={() => setShowBalanceModal(false)} className="text-slate-400 hover:text-slate-600 transition">
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            {balanceError && (
              <div className="mx-5 mt-4 bg-rose-50 border border-rose-100 text-rose-600 p-2.5 rounded-xl flex items-start gap-1.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{balanceError}</span>
              </div>
            )}

            <form onSubmit={handleSaveBalance} className="p-5 space-y-4">
              
              <div className="space-y-1">
                <label className="text-slate-500">Pilih Karyawan</label>
                <select
                  required
                  value={selectedEmpForBalance}
                  onChange={(e) => setSelectedEmpForBalance(e.target.value)}
                  className="w-full bg-white border border-slate-200 px-3 py-2.5 rounded-xl text-slate-800 focus:outline-none focus:border-blue-500 font-bold shadow-sm"
                >
                  <option value="">-- Pilih Karyawan --</option>
                  {allEmployees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-500">Tahun Aktif</label>
                  <input
                    type="number"
                    required
                    value={balanceForm.year}
                    onChange={(e) => setBalanceForm({ ...balanceForm, year: Number(e.target.value) })}
                    className="w-full bg-white border border-slate-200 px-3.5 py-2.5 rounded-xl text-slate-800 focus:outline-none focus:border-blue-500 font-bold shadow-sm"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-500">Alokasi Cuti (Hari)</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={balanceForm.allocatedDays}
                    onChange={(e) => setBalanceForm({ ...balanceForm, allocatedDays: Number(e.target.value) })}
                    className="w-full bg-white border border-slate-200 px-3.5 py-2.5 rounded-xl text-slate-800 focus:outline-none focus:border-blue-500 font-bold shadow-sm"
                  />
                </div>
              </div>

              <div className="border-t border-slate-100 pt-4 flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setShowBalanceModal(false)}
                  className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold px-4 py-2 rounded-xl transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingBalance}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold px-5 py-2 rounded-xl shadow-sm transition disabled:opacity-50 active:scale-95"
                >
                  {savingBalance ? "Menyimpan..." : "Simpan Saldo"}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
