"use client";

import React, { useEffect, useState } from "react";
import {
  Wallet,
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
  DollarSign,
  FileText,
  Upload,
  Receipt,
  Eye,
  Link2
} from "lucide-react";
import { useBusiness } from "../../../../lib/context/BusinessContext";
import { createWebBrowserClient } from "../../../../lib/supabase/client";
import { uploadImageToR2 } from "../../../../lib/utils/upload";

interface ExpenseClaim {
  id: string;
  claim_number: string;
  claim_date: string;
  title: string;
  category: "travel" | "meals" | "entertainment" | "others";
  total_amount: number;
  receipt_url: string | null;
  status: "pending" | "approved" | "paid" | "rejected";
  created_at: string;
  employee: {
    id: string;
    name: string;
    email: string | null;
  };
  approver?: {
    name: string;
  } | null;
  expense_id: string | null;
}

interface AccountOption {
  id: string;
  code: string;
  name: string;
  type: string;
}

interface Employee {
  id: string;
  name: string;
  email: string | null;
  user_id: string | null;
}

export default function ReimbursementPage() {
  const { activeBusiness, userRole, systemRole } = useBusiness();
  const isOwnerOrAdmin = userRole === "owner" || userRole === "admin" || userRole === "superadmin" || systemRole === "superadmin";
  const [activeTab, setActiveTab] = useState<"ess" | "admin">("ess");
  const [loading, setLoading] = useState(true);
  const [currentEmployee, setCurrentEmployee] = useState<Employee | null>(null);

  // ESS States
  const [myClaims, setMyClaims] = useState<ExpenseClaim[]>([]);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [submittingApply, setSubmittingApply] = useState(false);
  const [applyError, setApplyError] = useState("");
  
  // ESS Form
  const [applyForm, setApplyForm] = useState({
    title: "",
    category: "meals",
    totalAmount: "",
    notes: ""
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);

  // Admin States
  const [allClaims, setAllClaims] = useState<ExpenseClaim[]>([]);
  const [expenseAccounts, setExpenseAccounts] = useState<AccountOption[]>([]);
  const [paymentAccounts, setPaymentAccounts] = useState<AccountOption[]>([]);
  
  // Admin Process Modal
  const [showPayModal, setShowPayModal] = useState(false);
  const [processingClaim, setProcessingClaim] = useState<ExpenseClaim | null>(null);
  const [selectedExpenseAccount, setSelectedExpenseAccount] = useState("");
  const [selectedPaymentAccount, setSelectedPaymentAccount] = useState("");
  const [payError, setPayError] = useState("");
  const [paying, setPaying] = useState(false);

  // Image Viewer Modal
  const [activeReceiptUrl, setActiveReceiptUrl] = useState<string | null>(null);

  const fetchESSData = async (employeeId: string) => {
    try {
      const supabase = createWebBrowserClient();
      
      // Fetch personal claims
      const { data, error } = await supabase
        .from("expense_claims")
        .select(`
          id, claim_number, claim_date, title, category, total_amount, receipt_url, status, created_at, expense_id,
          employee:employee_id (id, name, email)
        `)
        .eq("employee_id", employeeId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setMyClaims((data || []).map((c: any) => ({
        ...c,
        total_amount: Number(c.total_amount || 0)
      })));

    } catch (err) {
      console.error("Error loading ESS reimbursement data:", err);
    }
  };

  const fetchAdminData = async () => {
    if (!activeBusiness) return;
    try {
      const supabase = createWebBrowserClient();

      // Fetch all claims in active business
      const { data: claimsData, error: claimsError } = await supabase
        .from("expense_claims")
        .select(`
          id, claim_number, claim_date, title, category, total_amount, receipt_url, status, created_at, expense_id,
          employee:employee_id (id, name, email)
        `)
        .eq("business_id", activeBusiness.id)
        .order("created_at", { ascending: false });

      if (claimsError) throw claimsError;
      setAllClaims((claimsData || []).map((c: any) => ({
        ...c,
        total_amount: Number(c.total_amount || 0)
      })));

      // Fetch accounts for booking
      const { data: accountsData } = await supabase
        .from("accounts")
        .select("id, code, name, type")
        .eq("business_id", activeBusiness.id)
        .eq("is_active", true);

      const expAccs = (accountsData || []).filter((a: any) => a.type === "expense");
      const payAccs = (accountsData || []).filter((a: any) => a.type === "asset");

      setExpenseAccounts(expAccs);
      setPaymentAccounts(payAccs);

      // Pre-populate cash account if available (Kas code 1101)
      const defaultCash = payAccs.find((a: any) => a.code === "1101");
      if (defaultCash) {
        setSelectedPaymentAccount(defaultCash.id);
      }

    } catch (err) {
      console.error("Error loading Admin reimbursement data:", err);
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

  // Handle File Input
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        setApplyError("Hanya file gambar/foto struk yang diperbolehkan.");
        return;
      }
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setFilePreviewUrl(url);
    }
  };

  // Generate Claim Number
  const generateClaimNumber = () => {
    const prefix = "CLM";
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const rand = Math.floor(1000 + Math.random() * 9000);
    return `${prefix}-${dateStr}-${rand}`;
  };

  // Handle Apply Claim
  const handleApplyClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBusiness || !currentEmployee) return;

    if (!selectedFile) {
      setApplyError("Harap unggah foto bukti transaksi/struk belanja.");
      return;
    }

    try {
      setSubmittingApply(true);
      setApplyError("");
      const supabase = createWebBrowserClient();

      // 1. Upload receipt to Cloudflare R2
      let receiptUrl = "";
      try {
        receiptUrl = await uploadImageToR2(selectedFile, "reimbursements");
      } catch (err: any) {
        throw new Error(`Gagal mengunggah foto struk: ${err.message}`);
      }

      // 2. Insert into expense_claims
      const claimNumber = generateClaimNumber();
      const { error } = await supabase
        .from("expense_claims")
        .insert({
          business_id: activeBusiness.id,
          employee_id: currentEmployee.id,
          claim_number: claimNumber,
          title: applyForm.title,
          category: applyForm.category,
          total_amount: Number(applyForm.totalAmount),
          receipt_url: receiptUrl,
          status: "pending"
        });

      if (error) throw error;

      setShowApplyModal(false);
      setApplyForm({
        title: "",
        category: "meals",
        totalAmount: "",
        notes: ""
      });
      setSelectedFile(null);
      setFilePreviewUrl(null);

      // Reload Data
      await fetchESSData(currentEmployee.id);
      if (isOwnerOrAdmin) {
        await fetchAdminData();
      }
      alert("Klaim reimbursement Anda berhasil dikirim untuk ditinjau.");
    } catch (err: any) {
      console.error("Error applying reimbursement claim:", err);
      setApplyError(err.message || "Gagal mengirimkan pengajuan klaim.");
    } finally {
      setSubmittingApply(false);
    }
  };

  // Handle Mark as Rejected
  const handleRejectClaim = async (claimId: string) => {
    if (!confirm("Apakah Anda yakin ingin menolak klaim reimbursement ini?")) return;
    try {
      const supabase = createWebBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase
        .from("expense_claims")
        .update({
          status: "rejected",
          approved_by: user?.id || null
        })
        .eq("id", claimId);

      if (error) throw error;

      if (currentEmployee) {
        await fetchESSData(currentEmployee.id);
      }
      await fetchAdminData();
      setShowPayModal(false);
      alert("Klaim reimbursement berhasil ditolak.");
    } catch (err: any) {
      console.error("Error rejecting claim:", err);
      alert(err.message || "Gagal menolak klaim.");
    }
  };

  // Handle Pay and Approve Claim (Maps to COA)
  const handlePayClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!processingClaim || !selectedExpenseAccount || !selectedPaymentAccount) {
      setPayError("Harap lengkapi pemetaan akun beban dan kas.");
      return;
    }

    try {
      setPaying(true);
      setPayError("");
      const supabase = createWebBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) throw new Error("User session not found.");

      // Call stored procedure approve_and_pay_expense_claim
      const { data: expenseId, error } = await supabase.rpc("approve_and_pay_expense_claim", {
        p_claim_id: processingClaim.id,
        p_account_id: selectedExpenseAccount,
        p_payment_account_id: selectedPaymentAccount,
        p_approved_by: user.id
      });

      if (error) throw error;

      setShowPayModal(false);
      setProcessingClaim(null);
      setSelectedExpenseAccount("");

      // Reload Data
      if (currentEmployee) {
        await fetchESSData(currentEmployee.id);
      }
      await fetchAdminData();
      alert("Klaim disetujui, dibayar, dan entri pengeluaran kas telah dicatat otomatis!");
    } catch (err: any) {
      console.error("Error paying reimbursement claim:", err);
      setPayError(err.message || "Gagal melakukan pencatatan pembayaran.");
    } finally {
      setPaying(false);
    }
  };

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
      alert("Profil Anda berhasil didaftarkan sebagai Karyawan. Anda sekarang dapat mencoba mengajukan reimbursement.");
    } catch (err: any) {
      console.error("Error registering self as employee:", err);
      alert(err.message || "Gagal mendaftarkan diri.");
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-100">
            <CheckCircle2 className="w-3.5 h-3.5" /> Lunas Dibayar
          </span>
        );
      case "approved":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-600 border border-blue-100">
            <Check className="w-3.5 h-3.5" /> Disetujui
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

  const translateCategory = (cat: string) => {
    switch (cat) {
      case "travel":
        return "Perjalanan Dinas";
      case "meals":
        return "Konsumsi / Meals";
      case "entertainment":
        return "Jamuan Bisnis";
      case "others":
        return "Lain-Lain";
      default:
        return cat;
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: activeBusiness?.default_currency || "IDR",
      maximumFractionDigits: 0
    }).format(val);
  };

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-semibold">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            Reimbursement & Klaim Biaya (Expense Claims)
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">Kelola klaim pengeluaran operasional karyawan dan hubungkan langsung ke buku kas beban.</p>
        </div>
        {currentEmployee && (
          <button
            onClick={() => {
              setApplyError("");
              setShowApplyModal(true);
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold py-2.5 px-4 rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition shrink-0 self-start sm:self-auto active:scale-95"
          >
            <Plus className="w-4 h-4" /> Ajukan Klaim Baru
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
            Persetujuan & Pembayaran (Admin)
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs text-slate-500 font-semibold mt-2">Menyelaraskan data reimbursement...</p>
        </div>
      ) : activeTab === "ess" ? (
        // PORTAL ESS VIEW
        <div className="space-y-6">
          
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm flex items-center gap-4 card-shadow">
              <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center border border-amber-100">
                <Clock className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Klaim Pending / Review</span>
                <span className="text-xl font-extrabold text-slate-900">
                  {formatCurrency(myClaims.filter(c => c.status === "pending" || c.status === "approved").reduce((s, c) => s + c.total_amount, 0))}
                </span>
              </div>
            </div>

            <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm flex items-center gap-4 card-shadow">
              <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center border border-emerald-100">
                <DollarSign className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Klaim Berhasil Dicairkan</span>
                <span className="text-xl font-extrabold text-slate-900">
                  {formatCurrency(myClaims.filter(c => c.status === "paid").reduce((s, c) => s + c.total_amount, 0))}
                </span>
              </div>
            </div>

            <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm flex items-center gap-4 card-shadow">
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center border border-blue-100">
                <Receipt className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Jumlah Transaksi Saya</span>
                <span className="text-xl font-extrabold text-slate-900">{myClaims.length} Klaim</span>
              </div>
            </div>
          </div>

          {/* Claims History */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Riwayat Pengajuan Reimbursement Saya</h3>
            {myClaims.length > 0 ? (
              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden card-shadow text-xs font-semibold">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                        <th className="py-3 px-4">No. Klaim</th>
                        <th className="py-3 px-4">Deskripsi Biaya</th>
                        <th className="py-3 px-4">Kategori</th>
                        <th className="py-3 px-4 text-right">Nominal Klaim</th>
                        <th className="py-3 px-4 text-center">Berkas Struk</th>
                        <th className="py-3 px-4 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {myClaims.map((claim) => (
                        <tr key={claim.id} className="hover:bg-slate-50 transition">
                          <td className="py-3.5 px-4 font-mono font-bold text-slate-500">
                            {claim.claim_number}
                          </td>
                          <td className="py-3.5 px-4 font-bold text-slate-900">
                            {claim.title}
                            <div className="text-[10px] text-slate-400 font-medium">Tanggal: {claim.claim_date}</div>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 rounded text-[10px]">
                              {translateCategory(claim.category)}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right font-extrabold text-slate-900">
                            {formatCurrency(claim.total_amount)}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            {claim.receipt_url ? (
                              <button
                                onClick={() => setActiveReceiptUrl(claim.receipt_url)}
                                className="text-blue-600 hover:text-blue-800 transition flex items-center justify-center gap-1 mx-auto"
                              >
                                <Eye className="w-3.5 h-3.5" /> Lihat Struk
                              </button>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            {getStatusBadge(claim.status)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center text-slate-400 shadow-sm text-xs">
                <Receipt className="w-10 h-10 mx-auto text-slate-200 mb-2" />
                <p className="font-bold">Belum ada riwayat pengajuan reimbursement</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Unggah foto struk belanja untuk mengajukan reimbursement.</p>
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
                  <p className="text-blue-600 mt-0.5">Anda belum terdaftar sebagai Karyawan di bisnis ini. Daftarkan diri Anda agar dapat mencoba fitur pengajuan reimbursement & unggah struk secara langsung.</p>
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

          {/* Pending Reimbursements */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-amber-500" /> Reimbursement Menunggu Persetujuan & Pembayaran
            </h3>
            {allClaims.filter(c => c.status === "pending" || c.status === "approved").length > 0 ? (
              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden card-shadow text-xs font-semibold">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                        <th className="py-3 px-4">Karyawan</th>
                        <th className="py-3 px-4">Deskripsi Klaim</th>
                        <th className="py-3 px-4">Kategori</th>
                        <th className="py-3 px-4 text-right">Nominal</th>
                        <th className="py-3 px-4 text-center">Berkas Struk</th>
                        <th className="py-3 px-4 text-center">Aksi Proses</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {allClaims.filter(c => c.status === "pending" || c.status === "approved").map((claim) => (
                        <tr key={claim.id} className="hover:bg-slate-50 transition">
                          <td className="py-3.5 px-4 font-bold text-slate-900">
                            {claim.employee?.name}
                            <div className="text-[10px] text-slate-400 font-mono font-medium">{claim.employee?.email}</div>
                          </td>
                          <td className="py-3.5 px-4 font-bold text-slate-800">
                            <div>{claim.title}</div>
                            <div className="text-[10px] text-slate-450 font-mono mt-0.5">{claim.claim_number} ({claim.claim_date})</div>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 rounded text-[10px]">
                              {translateCategory(claim.category)}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right font-extrabold text-slate-900">
                            {formatCurrency(claim.total_amount)}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            {claim.receipt_url ? (
                              <button
                                onClick={() => setActiveReceiptUrl(claim.receipt_url)}
                                className="text-blue-600 hover:text-blue-800 transition flex items-center justify-center gap-1 mx-auto"
                              >
                                <Eye className="w-3.5 h-3.5" /> Lihat Struk
                              </button>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <button
                              onClick={() => {
                                setPayError("");
                                setProcessingClaim(claim);
                                setShowPayModal(true);
                              }}
                              className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold px-3 py-1.5 rounded-lg transition text-[10px] active:scale-95"
                            >
                              Proses & Bayar
                            </button>
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
                <p className="font-bold text-slate-500">Semua bersih! Tidak ada antrean reimbursement pending.</p>
              </div>
            )}
          </div>

          {/* All Claims Log */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <Users className="w-4 h-4 text-slate-500" /> Log Seluruh Transaksi Reimbursement Karyawan
            </h3>
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden card-shadow text-xs font-semibold max-h-[400px] overflow-y-auto">
              {allClaims.length > 0 ? (
                <div className="divide-y divide-slate-100">
                  {allClaims.map(claim => (
                    <div key={claim.id} className="p-4 hover:bg-slate-50 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-800">{claim.employee?.name}</span>
                          <span className="text-[9px] bg-slate-150 text-slate-650 px-1.5 py-0.5 rounded border">
                            {translateCategory(claim.category)}
                          </span>
                        </div>
                        <div className="text-[11px] font-bold text-slate-900 mt-1">{claim.title}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5 font-mono">
                          {claim.claim_number} | Tanggal: {claim.claim_date}
                        </div>
                      </div>

                      <div className="flex flex-col sm:items-end gap-1.5">
                        <span className="font-extrabold text-slate-900">{formatCurrency(claim.total_amount)}</span>
                        <div className="flex items-center gap-2">
                          {claim.receipt_url && (
                            <button
                              onClick={() => setActiveReceiptUrl(claim.receipt_url)}
                              className="text-[10px] text-blue-600 hover:underline flex items-center gap-0.5 font-bold"
                            >
                              <Link2 className="w-3 h-3" /> Struk
                            </button>
                          )}
                          {getStatusBadge(claim.status)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-slate-400 py-16 font-bold">Belum ada transaksi reimbursement.</p>
              )}
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
                <Receipt className="w-4.5 h-4.5 text-blue-600" />
                Pengajuan Reimbursement Baru
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

            <form onSubmit={handleApplyClaim} className="p-5 space-y-4">
              
              <div className="space-y-1">
                <label className="text-slate-500">Judul Pengeluaran / Klaim</label>
                <input
                  type="text"
                  required
                  value={applyForm.title}
                  onChange={(e) => setApplyForm({ ...applyForm, title: e.target.value })}
                  placeholder="e.g. Pembelian bensin dinas kunjungan klien"
                  className="w-full bg-white border border-slate-200 px-3.5 py-2.5 rounded-xl text-slate-800 focus:outline-none focus:border-blue-500 shadow-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-500">Kategori Biaya</label>
                  <select
                    value={applyForm.category}
                    onChange={(e) => setApplyForm({ ...applyForm, category: e.target.value as any })}
                    className="w-full bg-white border border-slate-200 px-3 py-2.5 rounded-xl text-slate-800 focus:outline-none focus:border-blue-500 font-bold shadow-sm"
                  >
                    <option value="travel">Perjalanan Dinas</option>
                    <option value="meals">Konsumsi / Makanan</option>
                    <option value="entertainment">Jamuan Bisnis / Entertainment</option>
                    <option value="others">Lain-Lain (Operasional)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-500">Nominal Biaya (Rp)</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={applyForm.totalAmount}
                    onChange={(e) => setApplyForm({ ...applyForm, totalAmount: e.target.value })}
                    placeholder="e.g. 150000"
                    className="w-full bg-white border border-slate-200 px-3.5 py-2.5 rounded-xl text-slate-800 focus:outline-none focus:border-blue-500 font-bold text-right shadow-sm"
                  />
                </div>
              </div>

              {/* Receipt File Picker */}
              <div className="space-y-1">
                <label className="text-slate-500">Unggah Foto Struk / Bukti Transaksi</label>
                <div className="relative border-2 border-dashed border-slate-200 hover:border-blue-400 rounded-2xl p-5 text-center cursor-pointer transition bg-slate-50 flex flex-col items-center justify-center gap-2">
                  <input
                    type="file"
                    required
                    accept="image/*"
                    onChange={handleFileChange}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  <Upload className="w-8 h-8 text-slate-400" />
                  {selectedFile ? (
                    <div>
                      <p className="font-bold text-blue-600">{selectedFile.name}</p>
                      <p className="text-[10px] text-slate-450 mt-0.5">Klik atau seret file lain untuk mengganti</p>
                    </div>
                  ) : (
                    <div>
                      <p className="font-bold text-slate-500">Pilih Berkas Foto Struk</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">JPEG, PNG format (Gambar di-kompres otomatis)</p>
                    </div>
                  )}
                </div>
              </div>

              {/* File Preview */}
              {filePreviewUrl && (
                <div className="border border-slate-100 rounded-xl p-2 bg-slate-50 flex items-center justify-center max-h-[140px] overflow-hidden">
                  <img src={filePreviewUrl} alt="Preview Struk" className="object-contain max-h-[120px] rounded-lg" />
                </div>
              )}

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

      {/* Admin approve and map ledger Modal */}
      {showPayModal && processingClaim && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col text-xs font-semibold max-h-[90vh]">
            
            <div className="p-5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-950 flex items-center gap-1.5">
                <DollarSign className="w-4.5 h-4.5 text-emerald-600" />
                Proses Pembayaran Reimbursement
              </h3>
              <button onClick={() => setShowPayModal(false)} className="text-slate-400 hover:text-slate-600 transition">
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            {payError && (
              <div className="mx-5 mt-4 bg-rose-50 border border-rose-100 text-rose-600 p-2.5 rounded-xl flex items-start gap-1.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{payError}</span>
              </div>
            )}

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              
              {/* Claim Summary */}
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-2 text-xs">
                <div className="flex justify-between border-b border-slate-200/50 pb-2">
                  <span className="text-slate-400 font-bold">Karyawan Pengaju:</span>
                  <span className="font-extrabold text-slate-900">{processingClaim.employee?.name}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200/50 pb-2">
                  <span className="text-slate-400 font-bold">Judul Klaim:</span>
                  <span className="font-bold text-slate-800">{processingClaim.title}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200/50 pb-2">
                  <span className="text-slate-400 font-bold">Kategori / No. Klaim:</span>
                  <span className="font-mono text-slate-650">{translateCategory(processingClaim.category)} ({processingClaim.claim_number})</span>
                </div>
                <div className="flex justify-between pt-1">
                  <span className="text-slate-400 font-bold text-sm">Nominal Pembayaran:</span>
                  <span className="font-black text-rose-650 text-sm">{formatCurrency(processingClaim.total_amount)}</span>
                </div>
              </div>

              {/* Split Receipt Preview */}
              {processingClaim.receipt_url && (
                <div className="space-y-1">
                  <label className="text-slate-500">Lampiran Bukti Struk Karyawan</label>
                  <div className="border border-slate-200 rounded-2xl p-2 bg-slate-50 flex items-center justify-center max-h-[180px] overflow-hidden relative group">
                    <img src={processingClaim.receipt_url} alt="Struk Belanja" className="object-contain max-h-[160px] rounded-lg" />
                    <button
                      type="button"
                      onClick={() => setActiveReceiptUrl(processingClaim.receipt_url)}
                      className="absolute inset-0 bg-slate-900/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition rounded-2xl"
                    >
                      <span className="bg-white text-slate-800 font-extrabold py-1.5 px-3 rounded-lg text-[10px] shadow-sm flex items-center gap-1">
                        <Eye className="w-3.5 h-3.5" /> Perbesar Gambar
                      </span>
                    </button>
                  </div>
                </div>
              )}

              {/* COA Mapping Form */}
              <form onSubmit={handlePayClaim} className="space-y-4 border-t border-slate-100 pt-3">
                <div className="space-y-1">
                  <label className="text-slate-500">Petakan ke Rekening Beban (Chart of Accounts)</label>
                  <select
                    required
                    value={selectedExpenseAccount}
                    onChange={(e) => setSelectedExpenseAccount(e.target.value)}
                    className="w-full bg-white border border-slate-200 px-3 py-2.5 rounded-xl text-slate-800 focus:outline-none focus:border-blue-500 font-bold shadow-sm"
                  >
                    <option value="">-- Pilih Akun Beban --</option>
                    {expenseAccounts.map(acc => (
                      <option key={acc.id} value={acc.id}>
                        [{acc.code}] {acc.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-500">Sumber Kas Pembayaran</label>
                  <select
                    required
                    value={selectedPaymentAccount}
                    onChange={(e) => setSelectedPaymentAccount(e.target.value)}
                    className="w-full bg-white border border-slate-200 px-3 py-2.5 rounded-xl text-slate-800 focus:outline-none focus:border-blue-500 font-bold shadow-sm"
                  >
                    <option value="">-- Pilih Kas Pembayar --</option>
                    {paymentAccounts.map(acc => (
                      <option key={acc.id} value={acc.id}>
                        [{acc.code}] {acc.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="border-t border-slate-150 pt-4 flex gap-2 justify-end -mx-5 -mb-5 p-5 bg-slate-50/50">
                  <button
                    type="button"
                    onClick={() => handleRejectClaim(processingClaim.id)}
                    className="mr-auto bg-rose-50 border border-rose-100 text-rose-600 hover:bg-rose-100 font-extrabold px-4 py-2 rounded-xl transition"
                  >
                    Tolak Klaim
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowPayModal(false)}
                    className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold px-4 py-2 rounded-xl transition"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={paying}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-5 py-2 rounded-xl shadow-sm transition active:scale-95 disabled:opacity-50"
                  >
                    {paying ? "Menyimpan Jurnal..." : "Setujui & Bayar"}
                  </button>
                </div>
              </form>

            </div>
          </div>
        </div>
      )}

      {/* Full Image receipt Viewer Modal */}
      {activeReceiptUrl && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4" onClick={() => setActiveReceiptUrl(null)}>
          <div className="relative max-w-3xl w-full max-h-[90vh] flex items-center justify-center" onClick={e => e.stopPropagation()}>
            <button onClick={() => setActiveReceiptUrl(null)} className="absolute -top-10 right-0 text-white hover:text-slate-300 font-bold text-xs flex items-center gap-1">
              <X className="w-5 h-5" /> Tutup
            </button>
            <img src={activeReceiptUrl} alt="Receipt Detail" className="object-contain max-h-[80vh] w-auto rounded-xl shadow-2xl border border-white/10" />
          </div>
        </div>
      )}

    </div>
  );
}
