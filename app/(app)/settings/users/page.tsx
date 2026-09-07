"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
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
  Eye,
  EyeOff,
  Lock,
  Key
} from "lucide-react";
import { useBusiness } from "../../../../lib/context/BusinessContext";
import { useLanguage } from "../../../../lib/context/LanguageContext";
import { createWebBrowserClient } from "../../../../lib/supabase/client";
import GroupedPermissionSelector from "../../../../components/permissions/GroupedPermissionSelector";
import { ALL_AVAILABLE_PERMISSIONS, getAllPermissionKeys } from "../../../../lib/utils/permissions";

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
  const [fullNameInput, setFullNameInput] = useState("");
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
    ALL_AVAILABLE_PERMISSIONS.forEach(p => {
      initialPerms[p.key] = false;
    });
    setCustomPermissions(initialPerms);
  }, []);

  // Check if redirected from employee registration page
  useEffect(() => {
    const isNewEmployee = searchParams.get("new_employee") === "true";
    const emailParam = searchParams.get("new_employee_email");
    const nameParam = searchParams.get("new_employee_name");
    if (isNewEmployee) {
      if (emailParam) {
        setEmailInput(emailParam);
      }
      if (nameParam) {
        setFullNameInput(nameParam);
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
    ALL_AVAILABLE_PERMISSIONS.forEach(p => {
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

      const payload = {
        email: emailInput.trim(),
        password: passwordInput.trim() || undefined,
        full_name: fullNameInput.trim() || undefined,
        business_id: activeBusiness.id,
        role: roleInput,
        permissions: roleInput === "custom" ? customPermissions : {}
      };

      const res = await fetch("/api/admin/employees/auth-create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || (locale === "en" ? "Failed to add team member." : "Gagal menambahkan anggota tim."));
      }

      // Reset Form & Refetch
      setEmailInput("");
      setFullNameInput("");
      setPasswordInput("");
      setShowPasswordPlainText(false);
      setRoleInput("staff");
      // Reset permissions checklist
      const resetPerms: Record<string, boolean> = {};
      ALL_AVAILABLE_PERMISSIONS.forEach(p => {
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
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 font-sans">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/80 pb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <Link 
              href="/settings"
              className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-700 transition"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-2xl border border-blue-100">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
                Pengguna &amp; Hak Akses
              </h1>
              <p className="text-xs md:text-sm text-slate-500 font-medium">
                Kelola anggota tim dan atur perizinan akses menu per divisi
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs shadow-md shadow-blue-500/20 transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Undang Anggota Tim</span>
        </button>
      </div>

      {/* POS Role Guidance Banner */}
      <div className="bg-gradient-to-r from-blue-50 via-indigo-50/50 to-blue-50 border border-blue-150 p-4.5 rounded-2xl flex items-start gap-3.5 shadow-2xs">
        <div className="p-2 bg-blue-600 text-white rounded-xl shrink-0 mt-0.5 shadow-xs">
          <Shield className="w-4.5 h-4.5" />
        </div>
        <div className="space-y-1">
          <h4 className="text-xs font-bold text-blue-950">
            Panduan Hak Akses Karyawan &amp; Kasir POS:
          </h4>
          <p className="text-[11px] leading-relaxed text-blue-900/80">
            Karyawan dengan peran <strong className="font-bold text-blue-950">Staff Umum</strong> hanya dapat mengakses profil &amp; modul mandiri karyawan (slip gaji dan absensi). Untuk staf toko/kasir, pilih peran <strong className="font-bold text-blue-950">Divisi Sales</strong> atau <strong className="font-bold text-blue-950">Peran Kustom</strong> dan centang submenu yang diinginkan (termasuk modul Kasir POS, Gudang, atau Laporan).
          </p>
        </div>
      </div>

      {/* Team Members List Table */}
      <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-xs">
        <div className="p-5 border-b border-slate-150 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-800">Daftar Anggota Tim</h3>
            <p className="text-xs text-slate-400 mt-0.5">Total {members.length} pengguna terdaftar pada bisnis ini</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-150 bg-slate-50/50 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                <th className="px-6 py-3.5">Email Pengguna</th>
                <th className="px-6 py-3.5">Peran / Divisi</th>
                <th className="px-6 py-3.5">Hak Akses Menu</th>
                <th className="px-6 py-3.5">Bergabung Pada</th>
                <th className="px-6 py-3.5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-150 font-medium text-slate-600">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                      <span>Memuat data anggota...</span>
                    </div>
                  </td>
                </tr>
              ) : members.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                    Belum ada anggota tim tambahan pada bisnis ini.
                  </td>
                </tr>
              ) : (
                members.map((m) => {
                  const activePermKeys = Object.keys(m.permissions || {}).filter(k => m.permissions[k]);
                  return (
                    <tr key={m.id} className="hover:bg-slate-50/60 transition">
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-900">{m.users?.email || "Tidak diketahui"}</span>
                          <span className="text-[10px] text-slate-400 mt-0.5">UID: {m.user_id}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold tracking-wide uppercase ${
                          m.role === "owner" 
                            ? "bg-amber-50 text-amber-700 border border-amber-200" 
                            : m.role === "admin"
                            ? "bg-blue-50 text-blue-700 border border-blue-200"
                            : "bg-slate-100 text-slate-700 border border-slate-200"
                        }`}>
                          <Shield className="w-3 h-3 shrink-0" />
                          {m.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 max-w-[280px]">
                        {m.role === "owner" || m.role === "admin" ? (
                          <span className="text-emerald-700 font-bold bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md text-[11px]">
                            Semua Menu (Akses Penuh)
                          </span>
                        ) : m.role === "sales" ? (
                          <span className="text-slate-600 leading-normal line-clamp-2">
                            Dashboard, Invoices, Quotations, Customers, Sales Orders, Delivery Orders, Catalog, Kasir Penjualan (POS)
                          </span>
                        ) : m.role === "purchasing" ? (
                          <span className="text-slate-600 leading-normal line-clamp-2">
                            Dashboard, Vendors, Purchase Orders, Inventory, Catalog
                          </span>
                        ) : m.role === "warehouse" ? (
                          <span className="text-slate-600 leading-normal line-clamp-2">
                            Dashboard, Catalog, Inventory, Delivery Orders
                          </span>
                        ) : m.role === "finance" ? (
                          <span className="text-slate-600 leading-normal line-clamp-2">
                            Dashboard, Invoices, Payments, Accounts, Expenses, Ledger, Reports, Tax, Assets
                          </span>
                        ) : (
                          // Custom Role Display
                          activePermKeys.length === 0 ? (
                            <span className="text-slate-400 italic">Tidak ada hak akses</span>
                          ) : (
                            <div className="flex flex-col gap-1">
                              <span className="inline-flex items-center gap-1 text-blue-700 font-extrabold bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md text-[11px] w-fit">
                                <Check className="w-3 h-3 text-blue-600" />
                                {activePermKeys.length} Submenu Aktif
                              </span>
                              <span className="text-[10px] text-slate-400 leading-tight line-clamp-1">
                                {activePermKeys.map(k => ALL_AVAILABLE_PERMISSIONS.find(ap => ap.key === k)?.label || k).join(", ")}
                              </span>
                            </div>
                          )
                        )}
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
                            <Link
                              href={`/settings/users/${m.id}?from=users`}
                              className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition cursor-pointer"
                              title="Kelola Hak Akses & Peran"
                            >
                              <Edit2 className="w-4.5 h-4.5" />
                            </Link>
                            <button
                              onClick={() => handleDeleteMember(m)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fade-in">
          <div className={`bg-white rounded-2xl w-full ${roleInput === "custom" ? "max-w-4xl" : "max-w-lg"} shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[90vh] transition-all`}>
            <div className="px-6 py-4 border-b border-slate-150 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <Users className="w-4.5 h-4.5 text-blue-600" /> Undang Anggota Divisi Baru
              </h3>
              <button 
                onClick={handleCloseAddModal} 
                className="p-1.5 text-slate-400 hover:text-slate-850 hover:bg-slate-100 rounded-lg transition cursor-pointer"
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
                  Nama Lengkap Anggota / Karyawan (Opsional)
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Budi Santoso"
                  value={fullNameInput}
                  onChange={(e) => setFullNameInput(e.target.value)}
                  className="w-full border border-slate-200 px-3.5 py-2.5 rounded-xl text-xs focus:outline-none"
                />
              </div>

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
                  Kata Sandi Login Pengguna
                </label>
                <div className="relative">
                  <input
                    type={showPasswordPlainText ? "text" : "password"}
                    placeholder="Minimal 6 karakter (wajib untuk akun baru)"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    className="w-full border border-slate-200 pl-3.5 pr-10 py-2.5 rounded-xl text-xs focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswordPlainText(!showPasswordPlainText)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPasswordPlainText ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <span className="text-[10px] text-slate-400 block mt-1 font-medium">
                  Jika email belum memiliki akun login, sistem akan otomatis membuatkan akun dengan kata sandi ini.
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
                  <option value="staff">Staff Umum / Karyawan (Dashboard & Menu Karyawan Mandiri - Tanpa POS)</option>
                  <option value="admin">Admin Bisnis (Akses Penuh)</option>
                  <option value="sales">Divisi Sales (SO, DO, Invoices, Customers, Kasir POS)</option>
                  <option value="purchasing">Divisi Purchasing (PO, Vendors, Inventory)</option>
                  <option value="warehouse">Divisi Gudang (DO, Inventory, Catalog)</option>
                  <option value="finance">Divisi Finance/Accounting (Ledger, Expenses, Invoices - Tanpa POS)</option>
                  <option value="custom">Peran Kustom (Atur Akses Granular Hingga Submenu)</option>
                </select>
              </div>

              {roleInput === "custom" && (
                <div className="space-y-3 pt-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block border-b border-slate-100 pb-1.5">
                    Pilih Menu &amp; Submenu yang Diizinkan:
                  </label>
                  <GroupedPermissionSelector
                    permissions={customPermissions}
                    onChange={setCustomPermissions}
                  />
                </div>
              )}

              <div className="border-t border-slate-150 pt-4 flex justify-end gap-2 mt-6">
                <button
                  type="button"
                  onClick={handleCloseAddModal}
                  className="px-4 py-2.5 border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 rounded-xl text-xs transition cursor-pointer"
                  disabled={submitting}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 px-5 rounded-xl text-xs transition shadow-sm flex items-center gap-1.5 cursor-pointer"
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Simpan &amp; Beri Akses</span>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fade-in">
          <div className={`bg-white rounded-2xl w-full ${editRoleInput === "custom" ? "max-w-4xl" : "max-w-lg"} shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[90vh] transition-all`}>
            <div className="px-6 py-4 border-b border-slate-150 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <Edit2 className="w-4.5 h-4.5 text-blue-600" /> Ubah Peran &amp; Hak Akses Anggota
              </h3>
              <button 
                onClick={() => {
                  setShowEditModal(false);
                  setEditingMember(null);
                  setModalError("");
                }} 
                className="p-1.5 text-slate-400 hover:text-slate-850 hover:bg-slate-100 rounded-lg transition cursor-pointer"
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
                  <option value="staff">Staff Umum / Karyawan (Dashboard & Menu Karyawan Mandiri - Tanpa POS)</option>
                  <option value="admin">Admin Bisnis (Akses Penuh)</option>
                  <option value="sales">Divisi Sales (SO, DO, Invoices, Customers, Kasir POS)</option>
                  <option value="purchasing">Divisi Purchasing (PO, Vendors, Inventory)</option>
                  <option value="warehouse">Divisi Gudang (DO, Inventory, Catalog)</option>
                  <option value="finance">Divisi Finance/Accounting (Ledger, Expenses, Invoices - Tanpa POS)</option>
                  <option value="custom">Peran Kustom (Atur Akses Granular Hingga Submenu)</option>
                </select>
              </div>

              {editRoleInput === "custom" && (
                <div className="space-y-3 pt-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block border-b border-slate-100 pb-1.5">
                    Pilih Menu &amp; Submenu yang Diizinkan:
                  </label>
                  <GroupedPermissionSelector
                    permissions={editCustomPermissions}
                    onChange={setEditCustomPermissions}
                  />
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
                  className="px-4 py-2.5 border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 rounded-xl text-xs transition cursor-pointer"
                  disabled={submitting}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 px-5 rounded-xl text-xs transition shadow-sm flex items-center gap-1.5 cursor-pointer"
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Simpan Perubahan</span>
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
