"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { 
  ArrowLeft, 
  Shield, 
  User, 
  Mail, 
  Check, 
  AlertCircle, 
  Save, 
  Sliders, 
  Sparkles,
  Info
} from "lucide-react";
import { useBusiness } from "../../../../../lib/context/BusinessContext";
import { createWebBrowserClient } from "../../../../../lib/supabase/client";
import GroupedPermissionSelector from "../../../../../components/permissions/GroupedPermissionSelector";
import { 
  getPresetPermissionsRecord, 
  ALL_AVAILABLE_PERMISSIONS 
} from "../../../../../lib/utils/permissions";

interface MemberData {
  id: string;
  business_id: string;
  user_id: string;
  role: string;
  permissions: Record<string, boolean>;
  created_at: string;
  users?: {
    email: string;
  } | null;
  employee_name?: string | null;
}

export default function UserPermissionDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromSource = searchParams.get("from"); // "employees" or "users"
  const { activeBusiness, userRole, loading: businessLoading } = useBusiness();

  const [member, setMember] = useState<MemberData | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<string>("staff");
  const [permissions, setPermissions] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const fetchMemberData = async () => {
    if (!activeBusiness || !id) return;
    try {
      setLoading(true);
      setErrorMsg("");
      const supabase = createWebBrowserClient();

      // Fetch business member
      const { data, error } = await supabase
        .from("business_members")
        .select(`
          id,
          business_id,
          user_id,
          role,
          permissions,
          created_at,
          users (
            email
          )
        `)
        .eq("id", id)
        .eq("business_id", activeBusiness.id)
        .single();

      if (error) throw error;

      if (data) {
        // Also check if this user is linked to an employee record
        let empName: string | null = null;
        if (data.user_id) {
          const { data: empData } = await supabase
            .from("employees")
            .select("name")
            .eq("business_id", activeBusiness.id)
            .eq("user_id", data.user_id)
            .maybeSingle();

          if (empData) empName = empData.name;
        }

        const formattedMember: MemberData = {
          ...data,
          users: Array.isArray(data.users) ? data.users[0] : data.users,
          employee_name: empName
        };

        setMember(formattedMember);
        setRole(formattedMember.role);
        
        // Initialize permissions
        const initialPerms: Record<string, boolean> = {};
        ALL_AVAILABLE_PERMISSIONS.forEach(p => {
          initialPerms[p.key] = formattedMember.permissions?.[p.key] || false;
        });

        // If it was already a preset role, initialize preset values
        if (formattedMember.role !== "custom") {
          const presetPerms = getPresetPermissionsRecord(formattedMember.role);
          setPermissions(presetPerms);
        } else {
          setPermissions(initialPerms);
        }
      }
    } catch (err: any) {
      console.error("Error loading team member permission detail:", err);
      setErrorMsg(err.message || "Gagal memuat data hak akses anggota.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMemberData();
  }, [activeBusiness, id]);

  // Protect client side access: Only owner and admin allowed
  useEffect(() => {
    if (!businessLoading && userRole) {
      if (userRole !== "owner" && userRole !== "admin") {
        router.push("/unauthorized");
      }
    }
  }, [userRole, businessLoading, router]);

  // Handle Role Dropdown Change
  const handleRoleChange = (newRole: string) => {
    setRole(newRole);
    if (newRole !== "custom") {
      // Sync permissions preview with preset
      setPermissions(getPresetPermissionsRecord(newRole));
    }
  };

  // Convert current preset to custom so admin can modify individual submenus
  const handleConvertToCustom = () => {
    setRole("custom");
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!member || !activeBusiness) return;

    try {
      setSaving(true);
      setErrorMsg("");
      setSuccessMsg("");
      const supabase = createWebBrowserClient();

      const { error: updateError } = await supabase
        .from("business_members")
        .update({
          role,
          permissions: role === "custom" ? permissions : {}
        })
        .eq("id", member.id);

      if (updateError) throw updateError;

      setSuccessMsg("Hak akses berhasil disimpan dan segera berlaku bagi pengguna ini!");
      setTimeout(() => setSuccessMsg(""), 4000);
      fetchMemberData();
    } catch (err: any) {
      console.error("Error saving member permissions:", err);
      setErrorMsg(err.message || "Gagal menyimpan perubahan hak akses.");
    } finally {
      setSaving(false);
    }
  };

  if (loading || !member) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <span className="text-xs font-semibold text-slate-500 mt-3">Memuat konfigurasi hak akses...</span>
      </div>
    );
  }

  const backHref = fromSource === "employees" ? "/employees" : "/settings/users";

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-28 font-sans">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
        <Link href={backHref} className="hover:text-blue-600 transition flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" /> 
          {fromSource === "employees" ? "Kembali ke Manajemen Karyawan" : "Kembali ke Anggota Tim & Hak Akses"}
        </Link>
        <span>/</span>
        <span className="text-slate-800">
          {member.employee_name || member.users?.email || "Kelola Hak Akses"}
        </span>
      </div>

      {/* User Header Card */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-5">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center text-white text-xl font-bold shadow-md shadow-blue-500/20 shrink-0">
            {(member.employee_name || member.users?.email || "U").charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900">
                {member.employee_name || member.users?.email}
              </h1>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${
                role === "owner" 
                  ? "bg-amber-50 text-amber-700 border-amber-200" 
                  : role === "admin"
                  ? "bg-blue-50 text-blue-700 border-blue-200"
                  : role === "custom"
                  ? "bg-purple-50 text-purple-700 border-purple-200"
                  : "bg-slate-100 text-slate-700 border-slate-200"
              }`}>
                {role}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1">
              <span className="flex items-center gap-1">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                {member.users?.email || "Email tidak terdaftar"}
              </span>
              <span>•</span>
              <span className="text-[11px] text-slate-400 font-mono">UID: {member.user_id}</span>
            </div>
          </div>
        </div>

        {/* Role Selector Header */}
        <div className="w-full md:w-auto flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Peran Utama Karyawan
            </span>
            <select
              value={role}
              onChange={(e) => handleRoleChange(e.target.value)}
              disabled={role === "owner"}
              className="bg-slate-50 border border-slate-200 px-3.5 py-2.5 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:border-blue-500 transition"
            >
              <option value="staff">Staff Umum (Menu Mandiri / ESS - Tanpa Dashboard & POS)</option>
              <option value="admin">Admin Bisnis (Akses Penuh ke Seluruh Sistem)</option>
              <option value="sales">Divisi Sales (SO, DO, Invoices, Customers, Kasir POS)</option>
              <option value="purchasing">Divisi Purchasing (PO, Vendors, Inventory)</option>
              <option value="warehouse">Divisi Gudang (DO, Inventory, Catalog - Tanpa Dashboard)</option>
              <option value="finance">Divisi Finance/Accounting (Ledger, Expenses, Invoices - Tanpa POS)</option>
              <option value="custom">Kustomisasi Hak Akses Spesifik (Atur Sendiri)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Alerts */}
      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-600 text-xs font-semibold flex items-center gap-2.5 animate-in fade-in">
          <AlertCircle className="w-4.5 h-4.5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-700 text-xs font-semibold flex items-center gap-2.5 animate-in fade-in">
          <Check className="w-4.5 h-4.5 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Preset Notice & Convert Action */}
      {role !== "custom" && role !== "admin" && role !== "owner" && (
        <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-amber-900 text-xs">
                Peran "{role.toUpperCase()}" menggunakan daftar sub-menu bawaan standar.
              </h4>
              <p className="text-[11px] text-amber-800 mt-0.5 leading-relaxed">
                Ingin menyesuaikan sub-menu tertentu saja (misal hanya izinkan Sales Order tanpa Faktur, atau hanya Proyek tanpa After Sales)? Klik tombol di samping untuk beralih ke mode kustom.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleConvertToCustom}
            className="shrink-0 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition shadow-xs flex items-center gap-1.5"
          >
            <Sliders className="w-3.5 h-3.5" />
            Kustomisasi Peran Ini
          </button>
        </div>
      )}

      {/* MAIN PERMISSION SELECTOR */}
      <div className="space-y-4">
        <div className="flex justify-between items-center px-1">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Shield className="w-5 h-5 text-blue-600" />
              Konfigurasi Hak Akses Sub-Menu Modul
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {role === "custom" 
                ? "Centang atau kosongkan sub-menu spesifik yang dapat diakses oleh akun ini."
                : `Menampilkan pratinjau hak akses sub-menu untuk peran ${role.toUpperCase()}.`}
            </p>
          </div>
        </div>

        <GroupedPermissionSelector
          permissions={permissions}
          onChange={setPermissions}
          disabled={role !== "custom"}
        />
      </div>

      {/* Sticky Bottom Save Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/90 backdrop-blur-md border-t border-slate-200 py-3.5 px-6 shadow-lg">
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <div className="text-xs text-slate-500 font-medium hidden sm:block">
            Peran Aktif: <strong className="text-slate-800 uppercase">{role}</strong>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <Link
              href={backHref}
              className="px-4 py-2 border border-slate-200 text-slate-600 font-bold rounded-xl text-xs hover:bg-slate-50 transition"
            >
              Batal
            </Link>

            <button
              onClick={handleSave}
              disabled={saving || role === "owner"}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-2 rounded-xl text-xs shadow-md shadow-blue-500/20 transition flex items-center gap-2 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? "Menyimpan..." : "Simpan Hak Akses"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
