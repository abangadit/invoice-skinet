"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { 
  Users, 
  Plus, 
  Trash2, 
  Edit2,
  Shield, 
  ArrowLeft, 
  Check, 
  X, 
  Settings,
  AlertCircle,
  Key,
  Eye,
  EyeOff
} from "lucide-react";
import { useBusiness } from "../../../../lib/context/BusinessContext";
import { useLanguage } from "../../../../lib/context/LanguageContext";
import { createWebBrowserClient } from "../../../../lib/supabase/client";

interface TeamMember {
  id: string;
  user_id: string;
  role: string;
  permissions: Record<string, boolean>;
  created_at: string;
  users: {
    email: string;
  } | null;
}

const AVAILABLE_PERMISSIONS = [
  { key: "dashboard", label: "Dashboard" },
  { key: "invoice", label: "Faktur Penjualan (Invoices)" },
  { key: "quotation", label: "Penawaran (Quotations)" },
  { key: "customer", label: "Pelanggan (Customers)" },
  { key: "payment", label: "Konfirmasi Pembayaran (Payments)" },
  { key: "catalog", label: "Katalog Item (Catalog)" },
  { key: "vendor", label: "Pemasok (Vendors)" },
  { key: "sales", label: "Sales Orders (SO)" },
  { key: "delivery", label: "Surat Jalan (DO)" },
  { key: "purchase", label: "Purchase Orders (PO)" },
  { key: "inventory", label: "Stok Gudang (Inventory)" },
  { key: "pos", label: "Kasir Penjualan (POS)" },
  { key: "employees", label: "Karyawan (Employees)" },
  { key: "payroll", label: "Slip Gaji (Payroll)" },
  { key: "accounts", label: "Bagan Akun (Chart of Accounts)" },
  { key: "expenses", label: "Pengeluaran (Expenses)" },
  { key: "ledger", label: "Buku Besar (General Ledger)" },
  { key: "reports", label: "Laporan Keuangan" },
  { key: "tax", label: "Ekspor Pajak (e-Faktur)" },
  { key: "assets", label: "Aset & Penyusutan" },
  { key: "report", label: "Analisis Penjualan" },
  { key: "settings", label: "Pengaturan (Settings)" }
];

export default function TeamSettingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { activeBusiness, userRole, loading: businessLoading } = useBusiness();
  const { locale } = useLanguage();

  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [modalWarning, setModalWarning] = useState("");
  const [emailInput, setEmailInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [showPasswordPlainText, setShowPasswordPlainText] = useState(false);
  const [roleInput, setRoleInput] = useState("staff");
  const [customPermissions, setCustomPermissions] = useState<Record<string, boolean>>({});
  
  const [modalError, setModalError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [showEditModal, setShowEditModal] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [editRoleInput, setEditRoleInput] = useState("staff");
  const [editCustomPermissions, setEditCustomPermissions] = useState<Record<string, boolean>>({});

  // Initialize permissions Map
  useEffect(() => {
    const initialPerms: Record<string, boolean> = {};
    AVAILABLE_PERMISSIONS.forEach(p => {
      initialPerms[p.key] = false;
    });
    setCustomPermissions(initialPerms);
  }, []);

  // Check if redirected from employee registration page
  useEffect(() => {
    const isNewEmployee = searchParams.get("new_employee") === "true";
    const emailParam = searchParams.get("new_employee_email");
    if (isNewEmployee) {
      if (emailParam) {
        setEmailInput(emailParam);
      }
      setModalWarning(locale === "en" ? "It is recommended to immediately set the access rights of the newly added employee so you don't get confused." : "Disarankan untuk langsung menentukan hak akses karyawan baru agar tidak bingung.");
      setShowAddModal(true);
    }
  }, [searchParams, locale]);

  const fetchMembers = async () => {
    if (!activeBusiness) return;
    try {
      setLoading(true);
      const supabase = createWebBrowserClient();
      const { data, error } = await supabase
        .from("business_members")
        .select(`
          id,
          user_id,
          role,
          permissions,
          created_at,
          users (
            email
          )
        `)
        .eq("business_id", activeBusiness.id)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setMembers((data as any[]) || []);
    } catch (err) {
      console.error("Error fetching business members:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeBusiness) {
      fetchMembers();
    }
  }, [activeBusiness]);

  // Protect client side access: Only owner and admin allowed
  useEffect(() => {
    if (!businessLoading && userRole) {
      if (userRole !== "owner" && userRole !== "admin") {
        router.push("/unauthorized");
      }
    }
  }, [userRole, businessLoading, router]);

  const handlePermissionChange = (key: string) => {
    setCustomPermissions(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleEditPermissionChange = (key: string) => {
    setEditCustomPermissions(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const openEditModal = (member: TeamMember) => {
    setEditingMember(member);
    setEditRoleInput(member.role);
    
    // Initialize permissions
    const perms: Record<string, boolean> = {};
    AVAILABLE_PERMISSIONS.forEach(p => {
      perms[p.key] = member.permissions?.[p.key] || false;
    });
    setEditCustomPermissions(perms);
    setModalError("");
    setShowEditModal(true);
  };

  const handleEditMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBusiness || !editingMember) return;

    try {
      setSubmitting(true);
      setModalError("");
      const supabase = createWebBrowserClient();

      const { error: updateError } = await supabase
        .from("business_members")
        .update({
          role: editRoleInput,
          permissions: editRoleInput === "custom" ? editCustomPermissions : {}
        })
        .eq("id", editingMember.id);

      if (updateError) throw updateError;

      setShowEditModal(false);
      setEditingMember(null);
      await fetchMembers();
    } catch (err) {
      console.error("Error updating team member:", err);
      setModalError(locale === "en" ? "Failed to update team member." : "Gagal memperbarui peran anggota tim.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseAddModal = () => {
    if (searchParams.get("new_employee") === "true") {
      alert(locale === "en" 
        ? "Access rights setup has been canceled. You can set it up at any time on this page."
        : "Pengaturan hak akses dibatalkan. Disarankan untuk segera menginput hak akses karyawan baru agar tidak bingung."
      );
    }
    setShowAddModal(false);
    setModalError("");
    setModalWarning("");
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBusiness || !emailInput.trim()) return;

    try {
      setSubmitting(true);
      setModalError("");

      const res = await fetch("/api/admin/employees/auth-create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: emailInput.trim(),
          password: passwordInput.trim() || undefined,
          business_id: activeBusiness.id,
          role: roleInput,
          permissions: roleInput === "custom" ? customPermissions : {}
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || (locale === "en" ? "Failed to add member" : "Gagal menambahkan anggota"));
      }

      // Reset Form & Refetch
      setEmailInput("");
      setPasswordInput("");
      setRoleInput("staff");
      // Reset permissions checklist
      const resetPerms: Record<string, boolean> = {};
      AVAILABLE_PERMISSIONS.forEach(p => {
        resetPerms[p.key] = false;
      });
      setCustomPermissions(resetPerms);
      
      setShowAddModal(false);
      await fetchMembers();
    } catch (err: any) {
      console.error("Error adding team member:", err);
      setModalError(err.message || (locale === "en" ? "Failed to add team member." : "Gagal menambahkan anggota tim."));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteMember = async (member: TeamMember) => {
    if (member.role === "owner") {
      alert(locale === "en" ? "Cannot remove the business owner." : "Tidak dapat menghapus pemilik utama bisnis.");
      return;
    }

    const confirmMsg = locale === "en" 
      ? `Are you sure you want to remove ${member.users?.email || "this member"} from the business?`
      : `Apakah Anda yakin ingin menghapus ${member.users?.email || "anggota ini"} dari tim bisnis Anda?`;
    
    if (!confirm(confirmMsg)) return;

    try {
      const supabase = createWebBrowserClient();
      const { error } = await supabase
        .from("business_members")
        .delete()
        .eq("id", member.id);

      if (error) throw error;
      await fetchMembers();
    } catch (err) {
      console.error("Error deleting member:", err);
      alert(locale === "en" ? "Failed to remove team member." : "Gagal mengeluarkan anggota tim.");
    }
  };

  if (businessLoading || loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <span className="text-xs font-semibold text-slate-500 mt-3">Memuat data tim kerja...</span>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header breadcrumb */}
      <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
        <button onClick={() => router.push("/settings")} className="hover:text-blue-600 transition flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" /> Pengaturan
        </button>
        <span>/</span>
        <span className="text-slate-800">Manajemen Anggota & Hak Akses</span>
      </div>

      {/* Title */}
      <div className="flex justify-between items-center border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-6 h-6 text-blue-600" /> Anggota Tim & Hak Akses
          </h2>
          <p className="text-sm text-slate-500 mt-1 font-medium">
            Kelola akses staf divisi ke modul invoice, inventaris, ledger keuangan, payroll, dan slip gaji secara aman.
          </p>
        </div>
        
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 px-4 rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition"
        >
          <Plus className="w-4 h-4" /> Tambah Anggota Tim
        </button>
      </div>

      {/* POS Access Information Card */}
      <div className="bg-blue-50/60 border border-blue-100 rounded-2xl p-5 flex gap-3 text-xs text-blue-800 leading-relaxed shadow-sm">
        <AlertCircle className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <span className="font-bold text-blue-900 block">Informasi Akses Kasir (POS)</span>
          <p>
            Modul <strong className="font-bold text-blue-950">Kasir Penjualan (POS)</strong> secara bawaan (default) dapat diakses oleh peran:
          </p>
          <ul className="list-disc pl-4 mt-1 space-y-0.5 font-semibold text-blue-950">
            <li>Employee (Staff biasa)</li>
            <li>Sales (Bagian Penjualan)</li>
            <li>Finance (Bagian Keuangan)</li>
          </ul>
          <p className="pt-1">
            Jika menggunakan <strong className="font-bold text-blue-950">Peran Kustom (Custom Role)</strong>, pastikan Anda mencentang opsi <strong className="font-bold text-blue-950">Kasir Penjualan (POS)</strong> pada daftar perizinan saat menambahkan atau mengatur akses anggota.
          </p>
        </div>
      </div>

      {/* Members List Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="px-6 py-3.5">Email Pengguna</th>
                <th className="px-6 py-3.5">Peran / Divisi</th>
                <th className="px-6 py-3.5">Hak Akses Menu</th>
                <th className="px-6 py-3.5">Tanggal Bergabung</th>
                <th className="px-6 py-3.5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
              {members.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-10 text-slate-400">
                    Belum ada anggota tim terdaftar.
                  </td>
                </tr>
              ) : (
                members.map((m) => {
                  return (
                    <tr key={m.id} className="hover:bg-slate-50/50 transition">
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-800">{m.users?.email || "Tidak diketahui"}</span>
                          <span className="text-[10px] text-slate-400 mt-0.5">UID: {m.user_id}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold tracking-wide uppercase ${
                          m.role === "owner" 
                            ? "bg-amber-50 text-amber-700 border border-amber-100" 
                            : m.role === "admin"
                            ? "bg-blue-50 text-blue-700 border border-blue-100"
                            : "bg-slate-100 text-slate-700 border border-slate-150"
                        }`}>
                          <Shield className="w-3 h-3 shrink-0" />
                          {m.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 max-w-[240px]">
                        <span className="text-slate-500 leading-normal line-clamp-2">
                          {m.role === "owner" || m.role === "admin" ? (
                            "Semua Menu (Akses Penuh)"
                          ) : m.role === "sales" ? (
                            "Dashboard, Invoices, Quotations, Customers, Sales Orders, Delivery Orders, Catalog, Kasir Penjualan (POS)"
                          ) : m.role === "purchasing" ? (
                            "Dashboard, Vendors, Purchase Orders, Inventory, Catalog"
                          ) : m.role === "warehouse" ? (
                            "Dashboard, Catalog, Inventory, Delivery Orders"
                          ) : m.role === "finance" ? (
                            "Dashboard, Invoices, Payments, Accounts, Expenses, Ledger, Reports, Tax, Assets, Kasir Penjualan (POS)"
                          ) : (
                            // Custom
                            Object.keys(m.permissions || {})
                              .filter(k => m.permissions[k])
                              .map(k => AVAILABLE_PERMISSIONS.find(ap => ap.key === k)?.label)
                              .filter(Boolean)
                              .join(", ") || "Tidak ada hak akses"
                          )}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-400">
                        {new Date(m.created_at).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "short",
                          year: "numeric"
                        })}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {m.role !== "owner" && (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => openEditModal(m)}
                              className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                              title="Ubah Akses/Peran"
                            >
                              <Edit2 className="w-4.5 h-4.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteMember(m)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                              title="Hapus Anggota"
                            >
                              <Trash2 className="w-4.5 h-4.5" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Member Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[85vh]">
            <div className="px-6 py-4 border-b border-slate-150 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <Users className="w-4.5 h-4.5 text-blue-600" /> Undang Anggota Divisi Baru
              </h3>
              <button 
                onClick={handleCloseAddModal} 
                className="p-1.5 text-slate-400 hover:text-slate-850 hover:bg-slate-100 rounded-lg transition"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            <form onSubmit={handleAddMember} className="flex-1 overflow-y-auto p-6 space-y-4">
              {modalError && (
                <div className="p-3 bg-rose-50 border border-rose-100 text-rose-600 text-xs font-semibold rounded-xl flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{modalError}</span>
                </div>
              )}

              {modalWarning && (
                <div className="p-3 bg-amber-50 border border-amber-100 text-amber-800 text-xs font-semibold rounded-xl flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <span>{modalWarning}</span>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Alamat Email Pengguna *
                </label>
                <input
                  type="email"
                  required
                  placeholder="staf-divisi@example.com"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  className="w-full border border-slate-200 px-3.5 py-2.5 rounded-xl text-xs focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Kata Sandi Akun (Password)
                </label>
                <div className="relative">
                  <input
                    type={showPasswordPlainText ? "text" : "password"}
                    placeholder="Wajib diisi jika akun baru (min. 6 karakter)"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    className="w-full border border-slate-200 pl-3.5 pr-10 py-2.5 rounded-xl text-xs focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswordPlainText(!showPasswordPlainText)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPasswordPlainText ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <span className="text-[10px] text-slate-400 block mt-1 font-medium">
                  Jika pengguna belum memiliki akun, sistem akan otomatis mendaftarkannya dengan kata sandi ini.
                </span>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Peran / Divisi Kerja *
                </label>
                <select
                  value={roleInput}
                  onChange={(e) => setRoleInput(e.target.value)}
                  className="w-full bg-white border border-slate-200 px-3 py-2.5 rounded-xl text-xs focus:outline-none"
                >
                  <option value="staff">Staff Umum (Hanya Dashboard)</option>
                  <option value="admin">Admin Bisnis (Akses Penuh)</option>
                  <option value="sales">Divisi Sales (SO, DO, Invoices, Customers)</option>
                  <option value="purchasing">Divisi Purchasing (PO, Vendors, Inventory)</option>
                  <option value="warehouse">Divisi Gudang (DO, Inventory, Catalog)</option>
                  <option value="finance">Divisi Finance/Accounting (Ledger, Expenses, Invoices)</option>
                  <option value="custom">Peran Kustom (Atur Akses Menu Sendiri)</option>
                </select>
              </div>

              {roleInput === "custom" && (
                <div className="space-y-3 pt-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block border-b border-slate-100 pb-1.5">
                    Daftar Menu & Modul yang Diizinkan:
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                    {AVAILABLE_PERMISSIONS.map((p) => {
                      return (
                        <label 
                          key={p.key} 
                          className="flex items-center gap-2.5 p-2 border border-slate-100 hover:border-blue-100 hover:bg-blue-50/10 rounded-xl cursor-pointer transition select-none text-[11px] font-medium"
                        >
                          <input
                            type="checkbox"
                            checked={!!customPermissions[p.key]}
                            onChange={() => handlePermissionChange(p.key)}
                            className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                          />
                          <span className="text-slate-700">{p.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="border-t border-slate-150 pt-4 flex justify-end gap-2 mt-6">
                <button
                  type="button"
                  onClick={handleCloseAddModal}
                  className="px-4 py-2.5 border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 rounded-xl text-xs transition"
                  disabled={submitting}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 px-5 rounded-xl text-xs transition shadow-sm flex items-center gap-1.5"
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Menyimpan...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" /> Simpan Anggota
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Member Modal */}
      {showEditModal && editingMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[85vh]">
            <div className="px-6 py-4 border-b border-slate-150 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <Edit2 className="w-4.5 h-4.5 text-blue-600" /> Ubah Peran & Hak Akses Anggota
              </h3>
              <button 
                onClick={() => {
                  setShowEditModal(false);
                  setEditingMember(null);
                  setModalError("");
                }} 
                className="p-1.5 text-slate-400 hover:text-slate-850 hover:bg-slate-100 rounded-lg transition"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            <form onSubmit={handleEditMember} className="flex-1 overflow-y-auto p-6 space-y-4">
              {modalError && (
                <div className="p-3 bg-rose-50 border border-rose-100 text-rose-600 text-xs font-semibold rounded-xl flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{modalError}</span>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Alamat Email Pengguna
                </label>
                <input
                  type="email"
                  disabled
                  value={editingMember.users?.email || ""}
                  className="w-full bg-slate-50 border border-slate-200 px-3.5 py-2.5 rounded-xl text-xs text-slate-500 cursor-not-allowed focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Peran / Divisi Kerja *
                </label>
                <select
                  value={editRoleInput}
                  onChange={(e) => setEditRoleInput(e.target.value)}
                  className="w-full bg-white border border-slate-200 px-3 py-2.5 rounded-xl text-xs focus:outline-none"
                >
                  <option value="staff">Staff Umum (Hanya Dashboard)</option>
                  <option value="admin">Admin Bisnis (Akses Penuh)</option>
                  <option value="sales">Divisi Sales (SO, DO, Invoices, Customers, POS)</option>
                  <option value="purchasing">Divisi Purchasing (PO, Vendors, Inventory)</option>
                  <option value="warehouse">Divisi Gudang (DO, Inventory, Catalog)</option>
                  <option value="finance">Divisi Finance/Accounting (Ledger, Expenses, Invoices, POS)</option>
                  <option value="custom">Peran Kustom (Atur Akses Menu Sendiri)</option>
                </select>
              </div>

              {editRoleInput === "custom" && (
                <div className="space-y-3 pt-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block border-b border-slate-100 pb-1.5">
                    Daftar Menu & Modul yang Diizinkan:
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                    {AVAILABLE_PERMISSIONS.map((p) => {
                      return (
                        <label 
                          key={p.key} 
                          className="flex items-center gap-2.5 p-2 border border-slate-100 hover:border-blue-100 hover:bg-blue-50/10 rounded-xl cursor-pointer transition select-none text-[11px] font-medium"
                        >
                          <input
                            type="checkbox"
                            checked={!!editCustomPermissions[p.key]}
                            onChange={() => handleEditPermissionChange(p.key)}
                            className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                          />
                          <span className="text-slate-700">{p.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="border-t border-slate-150 pt-4 flex justify-end gap-2 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingMember(null);
                    setModalError("");
                  }}
                  className="px-4 py-2.5 border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 rounded-xl text-xs transition"
                  disabled={submitting}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 px-5 rounded-xl text-xs transition shadow-sm flex items-center gap-1.5"
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Menyimpan...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" /> Simpan Perubahan
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
