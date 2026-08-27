"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Users,
  Plus,
  Search,
  Calendar,
  AlertCircle,
  UserPlus,
  Edit2,
  Trash2,
  Phone,
  Mail,
  UserCheck,
  UserMinus,
  Briefcase,
  X,
  Clock,
  Shield,
  Sliders,
  Key,
  Eye,
  EyeOff,
  CheckCircle2,
  Lock
} from "lucide-react";
import { useBusiness } from "../../../lib/context/BusinessContext";
import { createWebBrowserClient } from "../../../lib/supabase/client";

interface Employee {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  nik: string;
  npwp: string | null;
  ptkp_status: string;
  basic_salary: number;
  allowance_fixed: number;
  join_date: string;
  resign_date: string | null;
  is_active: boolean;
  shift_id: string | null;
  working_shifts?: {
    name: string;
    start_time: string;
    end_time: string;
  } | null;
}

export default function EmployeesPage() {
  const router = useRouter();
  const { activeBusiness } = useBusiness();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("active");

  // Modal States
  const [showModal, setShowModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [saving, setSaving] = useState(false);

  // Master Shift Management Modal States
  const [showShiftManagementModal, setShowShiftManagementModal] = useState(false);
  const [workingShifts, setWorkingShifts] = useState<any[]>([]);
  const [shiftName, setShiftName] = useState("");
  const [shiftStartTime, setShiftStartTime] = useState("08:00");
  const [shiftEndTime, setShiftEndTime] = useState("17:00");
  const [addingShift, setAddingShift] = useState(false);

  // POS Shift Log States
  const [activeShiftEmployee, setActiveShiftEmployee] = useState<Employee | null>(null);
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [shifts, setShifts] = useState<any[]>([]);
  const [loadingShifts, setLoadingShifts] = useState(false);

  // Bulk Shift Selection & Access Rights States
  const [selectedEmpIds, setSelectedEmpIds] = useState<string[]>([]);
  const [showBulkShiftModal, setShowBulkShiftModal] = useState(false);
  const [targetBulkShiftId, setTargetBulkShiftId] = useState<string>("");
  const [updatingBulkShift, setUpdatingBulkShift] = useState(false);

  const handleSelectAll = (checked: boolean, list: Employee[]) => {
    if (checked) {
      setSelectedEmpIds(list.map(e => e.id));
    } else {
      setSelectedEmpIds([]);
    }
  };

  const handleToggleSelect = (empId: string) => {
    setSelectedEmpIds(prev => 
      prev.includes(empId) ? prev.filter(id => id !== empId) : [...prev, empId]
    );
  };

  // Access Rights Modal State
  const [showAccessRightsModal, setShowAccessRightsModal] = useState(false);
  const [accessEmployee, setAccessEmployee] = useState<Employee | null>(null);
  const [accessMemberId, setAccessMemberId] = useState<string | null>(null);
  const [accessUserId, setAccessUserId] = useState<string | null>(null);
  const [accessRole, setAccessRole] = useState<string>("staff");
  const [accessPermissions, setAccessPermissions] = useState<Record<string, boolean>>({});
  const [loadingAccess, setLoadingAccess] = useState(false);
  const [savingAccess, setSavingAccess] = useState(false);
  const [accessModalError, setAccessModalError] = useState("");

  // Employee Login Account & Password States
  const [isExistingUser, setIsExistingUser] = useState(false);
  const [accessPassword, setAccessPassword] = useState("");
  const [resetPasswordToggle, setResetPasswordToggle] = useState(false);
  const [showPasswordPlainText, setShowPasswordPlainText] = useState(false);

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

  const handleAccessRights = async (emp: Employee) => {
    if (!emp.email) {
      alert(`Karyawan "${emp.name}" belum memiliki email terdaftar. Silakan edit data karyawan dan isi alamat email terlebih dahulu agar dapat mengonfigurasi Hak Akses & Akun Login.`);
      return;
    }
    
    setAccessEmployee(emp);
    setShowAccessRightsModal(true);
    setLoadingAccess(true);
    setAccessModalError("");
    setAccessMemberId(null);
    setAccessUserId(null);
    setAccessPassword("");
    setResetPasswordToggle(false);
    setShowPasswordPlainText(false);

    const initPerms: Record<string, boolean> = {};
    AVAILABLE_PERMISSIONS.forEach(p => {
      initPerms[p.key] = false;
    });

    try {
      const supabase = createWebBrowserClient();

      const { data: userData } = await supabase
        .from("users")
        .select("id, email")
        .ilike("email", emp.email.trim())
        .maybeSingle();

      if (userData) {
        setIsExistingUser(true);
        setAccessUserId(userData.id);
        const { data: memberData } = await supabase
          .from("business_members")
          .select("*")
          .eq("business_id", activeBusiness?.id)
          .eq("user_id", userData.id)
          .maybeSingle();

        if (memberData) {
          setAccessMemberId(memberData.id);
          setAccessRole(memberData.role || "staff");
          if (memberData.permissions && typeof memberData.permissions === "object") {
            setAccessPermissions({ ...initPerms, ...memberData.permissions });
          } else {
            setAccessPermissions(initPerms);
          }
        } else {
          setAccessRole("staff");
          setAccessPermissions(initPerms);
        }
      } else {
        setIsExistingUser(false);
        setResetPasswordToggle(true);
        setAccessRole("staff");
        setAccessPermissions(initPerms);
      }
    } catch (err: any) {
      console.error("Error loading access rights:", err);
    } finally {
      setLoadingAccess(false);
    }
  };

  const handleSaveAccessRights = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBusiness || !accessEmployee?.email) return;

    // Validasi Password jika akun baru atau saat reset password aktif
    if (!isExistingUser) {
      if (!accessPassword || accessPassword.trim().length < 6) {
        setAccessModalError("Password untuk akun login baru minimal 6 karakter.");
        return;
      }
    } else if (resetPasswordToggle && accessPassword) {
      if (accessPassword.trim().length < 6) {
        setAccessModalError("Password baru minimal 6 karakter.");
        return;
      }
    }

    try {
      setSavingAccess(true);
      setAccessModalError("");

      const payload = {
        email: accessEmployee.email.trim(),
        password: accessPassword.trim() || undefined,
        reset_password: isExistingUser && resetPasswordToggle && accessPassword.trim() ? accessPassword.trim() : undefined,
        full_name: accessEmployee.name,
        business_id: activeBusiness.id,
        role: accessRole,
        permissions: accessRole === "custom" ? accessPermissions : {},
        employee_id: accessEmployee.id
      };

      const res = await fetch("/api/admin/employees/auth-create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal menyimpan akun login & hak akses.");
      }

      setShowAccessRightsModal(false);
      alert(`Akun login & hak akses untuk "${accessEmployee.name}" berhasil disimpan! Karyawan sekarang dapat langsung login menggunakan email & password tersebut.`);
    } catch (err: any) {
      console.error("Error saving access rights:", err);
      setAccessModalError(err.message || "Gagal menyimpan hak akses.");
    } finally {
      setSavingAccess(false);
    }
  };

  const handleBulkShiftSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedEmpIds.length === 0) return;
    try {
      setUpdatingBulkShift(true);
      const supabase = createWebBrowserClient();
      const { error } = await supabase
        .from("employees")
        .update({
          shift_id: targetBulkShiftId || null,
          updated_at: new Date().toISOString()
        })
        .in("id", selectedEmpIds);

      if (error) throw error;
      
      setSelectedEmpIds([]);
      setShowBulkShiftModal(false);
      fetchEmployees();
    } catch (err: any) {
      console.error("Error updating bulk shift:", err);
      alert("Gagal memperbarui shift masal: " + err.message);
    } finally {
      setUpdatingBulkShift(false);
    }
  };

  const fetchEmployeeShifts = async (empId: string) => {
    try {
      setLoadingShifts(true);
      const supabase = createWebBrowserClient();
      const { data, error } = await supabase
        .from("pos_shifts")
        .select("*")
        .eq("employee_id", empId)
        .order("opened_at", { ascending: false });

      if (error) throw error;
      setShifts(data || []);
    } catch (err) {
      console.error("Error loading employee shifts:", err);
    } finally {
      setLoadingShifts(false);
    }
  };

  const handleOpenShiftHistory = (emp: Employee) => {
    setActiveShiftEmployee(emp);
    setShifts([]);
    fetchEmployeeShifts(emp.id);
    setShowShiftModal(true);
  };

  const fetchWorkingShifts = async () => {
    if (!activeBusiness) return;
    try {
      const supabase = createWebBrowserClient();
      const { data, error } = await supabase
        .from("working_shifts")
        .select("*")
        .eq("business_id", activeBusiness.id)
        .order("name", { ascending: true });
      if (error) throw error;
      setWorkingShifts(data || []);
    } catch (err) {
      console.error("Error fetching working shifts:", err);
    }
  };

  // Form Fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [nik, setNik] = useState("");
  const [npwp, setNpwp] = useState("");
  const [ptkpStatus, setPtkpStatus] = useState("TK/0");
  const [basicSalary, setBasicSalary] = useState<number>(0);
  const [allowanceFixed, setAllowanceFixed] = useState<number>(0);
  const [joinDate, setJoinDate] = useState("");
  const [resignDate, setResignDate] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [shiftId, setShiftId] = useState("");

  const fetchEmployees = async () => {
    if (!activeBusiness) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const supabase = createWebBrowserClient();
      const { data, error } = await supabase
        .from("employees")
        .select("*, working_shifts:shift_id (name, start_time, end_time)")
        .eq("business_id", activeBusiness.id)
        .order("name", { ascending: true });

      if (error) throw error;
      setEmployees((data || []).map((e: any) => ({
        ...e,
        basic_salary: Number(e.basic_salary || 0),
        allowance_fixed: Number(e.allowance_fixed || 0)
      })));
    } catch (err) {
      console.error("Error fetching employees:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
    fetchWorkingShifts();
  }, [activeBusiness]);

  const resetForm = () => {
    setName("");
    setEmail("");
    setPhone("");
    setNik("");
    setNpwp("");
    setPtkpStatus("TK/0");
    setBasicSalary(0);
    setAllowanceFixed(0);
    setJoinDate(new Date().toISOString().split("T")[0]);
    setResignDate("");
    setIsActive(true);
    setShiftId("");
    setErrorMsg("");
  };

  const handleOpenAddModal = () => {
    setEditingEmployee(null);
    resetForm();
    setShowModal(true);
  };

  const handleOpenEditModal = (emp: Employee) => {
    setEditingEmployee(emp);
    setName(emp.name);
    setEmail(emp.email || "");
    setPhone(emp.phone || "");
    setNik(emp.nik);
    setNpwp(emp.npwp || "");
    setPtkpStatus(emp.ptkp_status);
    setBasicSalary(emp.basic_salary);
    setAllowanceFixed(emp.allowance_fixed);
    setJoinDate(emp.join_date);
    setResignDate(emp.resign_date || "");
    setIsActive(emp.is_active);
    setShiftId(emp.shift_id || "");
    setErrorMsg("");
    setShowModal(true);
  };

  const handleSaveEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBusiness) return;

    if (nik.length !== 16) {
      setErrorMsg("Nomor NIK harus tepat 16 digit!");
      return;
    }

    try {
      setSaving(true);
      setErrorMsg("");
      const supabase = createWebBrowserClient();

      const payload = {
        business_id: activeBusiness.id,
        name,
        email: email || null,
        phone: phone || null,
        nik,
        npwp: npwp || null,
        ptkp_status: ptkpStatus,
        basic_salary: basicSalary,
        allowance_fixed: allowanceFixed,
        join_date: joinDate,
        resign_date: resignDate || null,
        is_active: isActive,
        shift_id: shiftId || null
      };

      if (editingEmployee) {
        const { error } = await supabase
          .from("employees")
          .update(payload)
          .eq("id", editingEmployee.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("employees")
          .insert(payload);
        if (error) throw error;
      }

      setShowModal(false);
      fetchEmployees();
      if (!editingEmployee) {
        router.push(`/settings/users?new_employee=true&new_employee_email=${encodeURIComponent(email)}&new_employee_name=${encodeURIComponent(name)}`);
      }
    } catch (err: any) {
      console.error("Error saving employee:", err);
      setErrorMsg(err.message || "Gagal menyimpan data karyawan.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteEmployee = async (id: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus data karyawan ini secara permanen?")) return;
    try {
      const supabase = createWebBrowserClient();
      const { error } = await supabase.from("employees").delete().eq("id", id);
      if (error) throw error;
      fetchEmployees();
    } catch (err: any) {
      console.error("Error deleting employee:", err);
      alert(err.message || "Gagal menghapus data karyawan.");
    }
  };

  const filteredEmployees = employees.filter(emp => {
    const matchesSearch =
      emp.name.toLowerCase().includes(search.toLowerCase()) ||
      emp.nik.includes(search) ||
      (emp.email || "").toLowerCase().includes(search.toLowerCase()) ||
      (emp.phone || "").includes(search);

    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && emp.is_active) ||
      (statusFilter === "inactive" && !emp.is_active);

    return matchesSearch && matchesStatus;
  });

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0
    }).format(val);
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-semibold">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            Direktori Data Karyawan
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">Kelola data induk karyawan, informasi perpajakan PTKP, dan remunerasi gaji pokok.</p>
        </div>
        <div className="flex gap-2 shrink-0 self-start sm:self-auto flex-wrap">
          {selectedEmpIds.length > 0 && (
            <button
              onClick={() => setShowBulkShiftModal(true)}
              className="bg-amber-500 hover:bg-amber-600 text-white font-extrabold py-2.5 px-4 rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition active:scale-95 animate-in fade-in"
            >
              <Sliders className="w-4 h-4" /> Ubah Shift Masal ({selectedEmpIds.length})
            </button>
          )}
          <button
            onClick={() => router.push("/settings/shifts")}
            className="bg-slate-100 border border-slate-200 hover:bg-slate-200 text-slate-700 font-extrabold py-2.5 px-4 rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition active:scale-95"
          >
            <Clock className="w-4 h-4 text-blue-600" /> Master Shift Kerja
          </button>
          <button
            onClick={handleOpenAddModal}
            className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold py-2.5 px-4 rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition active:scale-95"
          >
            <Plus className="w-4 h-4" /> Tambah Karyawan
          </button>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="space-y-4 text-xs font-semibold">
        <div className="flex flex-wrap gap-2">
          {[
            { key: "active", label: "Aktif Bekerja" },
            { key: "inactive", label: "Sudah Resign / Inaktif" },
            { key: "all", label: "Semua Karyawan" }
          ].map((pill) => (
            <button
              key={pill.key}
              onClick={() => setStatusFilter(pill.key)}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition border ${
                statusFilter === pill.key
                  ? "bg-blue-600 border-blue-600 text-white shadow-sm"
                  : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {pill.label}
            </button>
          ))}
        </div>

        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari karyawan berdasarkan nama, NIK, email, atau telepon..."
            className="w-full bg-white border border-slate-200 pl-10 pr-4 py-2.5 rounded-xl text-sm placeholder-slate-400 focus:outline-none focus:border-blue-500 transition shadow-sm font-semibold"
          />
        </div>
      </div>

      {/* Employee List Table */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs text-slate-500 font-semibold mt-2">Memuat direktori karyawan...</p>
        </div>
      ) : filteredEmployees.length > 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden card-shadow text-xs font-semibold">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                  <th className="py-3.5 px-4 text-center w-10">
                    <input
                      type="checkbox"
                      checked={selectedEmpIds.length > 0 && selectedEmpIds.length === filteredEmployees.length}
                      onChange={(e) => handleSelectAll(e.target.checked, filteredEmployees)}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                    />
                  </th>
                  <th className="py-3.5 px-4">Nama & Informasi SDM</th>
                  <th className="py-3.5 px-4">NIK / NPWP</th>
                  <th className="py-3.5 px-4 text-center">PTKP</th>
                  <th className="py-3.5 px-4 text-right">Gaji Pokok</th>
                  <th className="py-3.5 px-4 text-right">Tunjangan Tetap</th>
                  <th className="py-3.5 px-4 text-center">Tanggal Masuk</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredEmployees.map((emp) => (
                  <tr key={emp.id} className={`hover:bg-slate-50 transition ${selectedEmpIds.includes(emp.id) ? "bg-blue-50/40" : ""}`}>
                    <td className="py-4 px-4 text-center">
                      <input
                        type="checkbox"
                        checked={selectedEmpIds.includes(emp.id)}
                        onChange={() => handleToggleSelect(emp.id)}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                      />
                    </td>
                    <td className="py-4 px-4">
                      <div className="font-bold text-slate-900 text-sm">{emp.name}</div>
                      <div className="flex flex-col gap-0.5 mt-1 text-slate-500 font-medium">
                        {emp.email && (
                          <span className="flex items-center gap-1">
                            <Mail className="w-3.5 h-3.5 text-slate-400" /> {emp.email}
                          </span>
                        )}
                        {emp.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3.5 h-3.5 text-slate-400" /> {emp.phone}
                          </span>
                        )}
                        {emp.working_shifts && (
                          (() => {
                            const shift = Array.isArray(emp.working_shifts) ? emp.working_shifts[0] : emp.working_shifts;
                            if (!shift) return null;
                            return (
                              <span className="flex items-center gap-1 text-[10px] text-blue-650 font-bold bg-blue-50/50 border border-blue-100/50 px-1.5 py-0.5 rounded w-max mt-1">
                                <Clock className="w-3 h-3" /> Shift: {shift.name} ({shift.start_time.substring(0, 5)} - {shift.end_time.substring(0, 5)})
                              </span>
                            );
                          })()
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-4 font-mono font-bold text-slate-800">
                      <div>NIK: {emp.nik}</div>
                      <div className="text-[10px] text-slate-400">NPWP: {emp.npwp || "-"}</div>
                    </td>
                    <td className="py-4 px-4 text-center font-bold">
                      <span className="bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 rounded text-[10px]">
                        {emp.ptkp_status}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right font-extrabold text-slate-900">
                      {formatCurrency(emp.basic_salary)}
                    </td>
                    <td className="py-4 px-4 text-right font-semibold text-slate-750">
                      {formatCurrency(emp.allowance_fixed)}
                    </td>
                    <td className="py-4 px-4 text-center font-medium">
                      <div className="flex items-center justify-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {new Date(emp.join_date).toLocaleDateString("id-ID")}
                      </div>
                      {emp.resign_date && (
                        <div className="text-[9px] text-rose-500 font-semibold mt-0.5">
                          Resign: {new Date(emp.resign_date).toLocaleDateString("id-ID")}
                        </div>
                      )}
                    </td>
                    <td className="py-4 px-4 text-center">
                      {emp.is_active ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-100">
                          <UserCheck className="w-3.5 h-3.5" /> Aktif
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-600 border border-rose-100">
                          <UserMinus className="w-3.5 h-3.5" /> Inaktif
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleAccessRights(emp)}
                          className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                          title="Edit Hak Akses & Peran"
                        >
                          <Shield className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleOpenEditModal(emp)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                          title="Edit Data"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleOpenShiftHistory(emp)}
                          className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition"
                          title="Riwayat Shift POS"
                        >
                          <Clock className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteEmployee(emp.id)}
                          className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition"
                          title="Hapus"
                        >
                          <Trash2 className="w-4 h-4" />
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
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-400 shadow-sm text-xs font-semibold">
          <Users className="w-12 h-12 mx-auto text-slate-200 mb-3" />
          <p className="text-sm font-semibold">Tidak ada data karyawan ditemukan</p>
          <button
            onClick={handleOpenAddModal}
            className="text-xs font-bold text-blue-600 hover:underline mt-1 inline-block"
          >
            Daftarkan Karyawan Pertama Anda
          </button>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col text-xs font-semibold max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="p-5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-950 flex items-center gap-1.5">
                <Briefcase className="w-4.5 h-4.5 text-blue-600" />
                {editingEmployee ? "Ubah Data Karyawan" : "Daftarkan Karyawan Baru"}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 transition">
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            {errorMsg && (
              <div className="mx-5 mt-4 bg-rose-50 border border-rose-100 text-rose-600 p-2.5 rounded-xl flex items-start gap-1.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Modal Form */}
            <form onSubmit={handleSaveEmployee} className="flex-1 overflow-y-auto p-5 space-y-4">
              
              <div className="space-y-1">
                <label className="text-slate-500">Nama Lengkap Karyawan</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Aditya Eka Putra"
                  className="w-full bg-white border border-slate-200 px-3.5 py-2.5 rounded-xl text-slate-800 focus:outline-none focus:border-blue-500 shadow-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-slate-500">Email Pribadi</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. aditya@gmail.com"
                    className="w-full bg-white border border-slate-200 px-3.5 py-2.5 rounded-xl text-slate-800 focus:outline-none focus:border-blue-500 shadow-sm"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-500">Nomor WhatsApp</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. 08129938820"
                    className="w-full bg-white border border-slate-200 px-3.5 py-2.5 rounded-xl text-slate-800 focus:outline-none focus:border-blue-500 shadow-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-slate-500">Nomor NIK (KTP - 16 Digit)</label>
                  <input
                    type="text"
                    required
                    maxLength={16}
                    value={nik}
                    onChange={(e) => setNik(e.target.value.replace(/[^0-9]/g, ""))}
                    placeholder="e.g. 3201882001920038"
                    className="w-full bg-white border border-slate-200 px-3.5 py-2.5 rounded-xl text-slate-800 focus:outline-none focus:border-blue-500 shadow-sm font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-500">Nomor NPWP (Opsional)</label>
                  <input
                    type="text"
                    value={npwp}
                    onChange={(e) => setNpwp(e.target.value)}
                    placeholder="e.g. 09.254.299.1-407.000"
                    className="w-full bg-white border border-slate-200 px-3.5 py-2.5 rounded-xl text-slate-800 focus:outline-none focus:border-blue-500 shadow-sm font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-slate-100 pt-3">
                <div className="space-y-1">
                  <label className="text-slate-500">Kategori PTKP Pajak</label>
                  <select
                    value={ptkpStatus}
                    onChange={(e) => setPtkpStatus(e.target.value)}
                    className="w-full bg-white border border-slate-200 px-3 py-2.5 rounded-xl text-slate-800 focus:outline-none focus:border-blue-500 shadow-sm font-bold"
                  >
                    <option value="TK/0">TK/0 (Belum Menikah, 0 Tanggungan)</option>
                    <option value="TK/1">TK/1 (1 Tanggungan)</option>
                    <option value="TK/2">TK/2 (2 Tanggungan)</option>
                    <option value="TK/3">TK/3 (3 Tanggungan)</option>
                    <option value="K/0">K/0 (Menikah, 0 Tanggungan)</option>
                    <option value="K/1">K/1 (1 Tanggungan)</option>
                    <option value="K/2">K/2 (2 Tanggungan)</option>
                    <option value="K/3">K/3 (3 Tanggungan)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-500">Status Pekerja</label>
                  <div className="flex items-center h-[42px] gap-4">
                    <label className="flex items-center gap-1.5 cursor-pointer font-bold">
                      <input
                        type="checkbox"
                        checked={isActive}
                        onChange={(e) => setIsActive(e.target.checked)}
                        className="w-4 h-4 text-blue-600 border-slate-300 rounded"
                      />
                      <span>Masih Aktif Bekerja</span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-slate-100 pt-3">
                <div className="space-y-1">
                  <label className="text-slate-500">Gaji Pokok Bulanan (Rp)</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={basicSalary}
                    onChange={(e) => setBasicSalary(Number(e.target.value))}
                    className="w-full bg-white border border-slate-200 px-3.5 py-2.5 rounded-xl text-slate-800 focus:outline-none focus:border-blue-500 shadow-sm font-bold text-right"
                  />
                  {basicSalary > 0 && (
                    <span className="text-[10px] text-blue-600 font-semibold mt-1 text-right block">
                      Format: {formatCurrency(basicSalary)}
                    </span>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-slate-500">Tunjangan Tetap Bulanan (Rp)</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={allowanceFixed}
                    onChange={(e) => setAllowanceFixed(Number(e.target.value))}
                    className="w-full bg-white border border-slate-200 px-3.5 py-2.5 rounded-xl text-slate-800 focus:outline-none focus:border-blue-500 shadow-sm font-bold text-right"
                  />
                  {allowanceFixed > 0 && (
                    <span className="text-[10px] text-blue-600 font-semibold mt-1 text-right block">
                      Format: {formatCurrency(allowanceFixed)}
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-slate-100 pt-3">
                <div className="space-y-1">
                  <label className="text-slate-500">Tanggal Mulai Bekerja</label>
                  <input
                    type="date"
                    required
                    value={joinDate}
                    onChange={(e) => setJoinDate(e.target.value)}
                    className="w-full bg-white border border-slate-200 px-3 py-2 rounded-xl text-slate-800 focus:outline-none focus:border-blue-500 shadow-sm font-bold"
                  />
                </div>

                {!isActive && (
                  <div className="space-y-1">
                    <label className="text-rose-500">Tanggal Resign / Keluar</label>
                    <input
                      type="date"
                      required
                      value={resignDate}
                      onChange={(e) => setResignDate(e.target.value)}
                      className="w-full bg-white border border-rose-200 px-3 py-2 rounded-xl text-slate-800 focus:outline-none focus:border-rose-500 shadow-sm font-bold"
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 gap-4 border-t border-slate-100 pt-3">
                <div className="space-y-1">
                  <label className="text-slate-500">Shift Kerja Karyawan</label>
                  <select
                    value={shiftId}
                    onChange={(e) => setShiftId(e.target.value)}
                    className="w-full bg-white border border-slate-200 px-3 py-2.5 rounded-xl text-slate-800 focus:outline-none focus:border-blue-500 shadow-sm font-bold"
                  >
                    <option value="">Gunakan Default Kantor</option>
                    {workingShifts.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.start_time.substring(0, 5)} - {s.end_time.substring(0, 5)})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="border-t border-slate-150 pt-4 flex gap-2 justify-end bg-slate-50/50 -mx-5 -mb-5 p-5">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold px-4 py-2 rounded-xl transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold px-5 py-2 rounded-xl shadow-sm transition active:scale-95 disabled:opacity-50"
                >
                  {saving ? "Menyimpan..." : "Simpan Data"}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Shift History Modal */}
      {showShiftModal && activeShiftEmployee && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col text-xs font-semibold max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="p-5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-950 flex items-center gap-1.5">
                <Clock className="w-4.5 h-4.5 text-amber-600" />
                Riwayat Shift POS & Laci Kas - {activeShiftEmployee.name}
              </h3>
              <button onClick={() => setShowShiftModal(false)} className="text-slate-400 hover:text-slate-600 transition">
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-5">
               {loadingShifts ? (
                 <div className="flex flex-col items-center justify-center py-10">
                   <div className="w-6 h-6 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                   <span className="text-[10px] text-slate-500 font-semibold mt-2">Memuat riwayat shift...</span>
                 </div>
               ) : shifts.length > 0 ? (
                 <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                   <table className="w-full text-left">
                     <thead>
                       <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                         <th className="py-2.5 px-3">Buka Shift</th>
                         <th className="py-2.5 px-3">Tutup Shift</th>
                         <th className="py-2.5 px-3 text-right">Modal Awal</th>
                         <th className="py-2.5 px-3 text-right">Ekspektasi Kas</th>
                         <th className="py-2.5 px-3 text-right">Kas Aktual</th>
                         <th className="py-2.5 px-3 text-right">Selisih</th>
                         <th className="py-2.5 px-3 text-center">Status</th>
                       </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-100 text-slate-700">
                       {shifts.map((s) => {
                         const opened = new Date(s.opened_at).toLocaleString("id-ID", {
                           month: "short",
                           day: "numeric",
                           hour: "2-digit",
                           minute: "2-digit"
                         });
                         const closed = s.closed_at 
                           ? new Date(s.closed_at).toLocaleString("id-ID", {
                               month: "short",
                               day: "numeric",
                               hour: "2-digit",
                               minute: "2-digit"
                             }) 
                           : "-";
                         
                         const opCash = Number(s.opening_cash || 0);
                         const expCash = Number(s.expected_closing_cash || 0);
                         const actCash = s.actual_closing_cash !== null ? Number(s.actual_closing_cash) : null;
                         const diff = actCash !== null ? actCash - expCash : 0;

                         return (
                           <tr key={s.id} className="hover:bg-slate-50 transition text-[11px]">
                             <td className="py-3 px-3 font-medium">{opened}</td>
                             <td className="py-3 px-3 font-medium">{closed}</td>
                             <td className="py-3 px-3 text-right font-semibold">{formatCurrency(opCash)}</td>
                             <td className="py-3 px-3 text-right font-semibold">{formatCurrency(expCash)}</td>
                             <td className="py-3 px-3 text-right font-semibold">
                               {actCash !== null ? formatCurrency(actCash) : "-"}
                             </td>
                             <td className={`py-3 px-3 text-right font-bold ${
                               diff < 0 ? "text-rose-600" : diff > 0 ? "text-emerald-600" : "text-slate-500"
                             }`}>
                               {actCash !== null 
                                 ? (diff === 0 ? "Pas" : (diff > 0 ? "+" : "") + formatCurrency(diff))
                                 : "-"
                               }
                             </td>
                             <td className="py-3 px-3 text-center">
                               {s.status === "open" ? (
                                 <span className="bg-blue-50 text-blue-600 border border-blue-100 px-2 py-0.5 rounded text-[9px] font-bold">
                                   Aktif
                                 </span>
                               ) : (
                                 <span className="bg-slate-100 text-slate-500 border border-slate-200 px-2 py-0.5 rounded text-[9px] font-bold">
                                   Selesai
                                 </span>
                               )}
                             </td>
                           </tr>
                         );
                       })}
                     </tbody>
                   </table>
                 </div>
               ) : (
                 <div className="text-center py-10 text-slate-400">
                   <Clock className="w-10 h-10 mx-auto text-slate-200 mb-2" />
                   <p className="font-semibold text-slate-500">Karyawan ini belum pernah membuka shift kasir POS.</p>
                 </div>
               )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-150 flex justify-end bg-slate-50">
              <button
                type="button"
                onClick={() => setShowShiftModal(false)}
                className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold px-4 py-2 rounded-xl transition"
              >
                Tutup
              </button>
            </div>
            
          </div>
        </div>
      )}

      {/* Shift Management Modal */}
      {showShiftManagementModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col text-xs font-semibold max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="p-5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-950 flex items-center gap-1.5">
                <Clock className="w-4.5 h-4.5 text-blue-600" />
                Kelola Template Shift Kerja
              </h3>
              <button onClick={() => setShowShiftManagementModal(false)} className="text-slate-400 hover:text-slate-600 transition">
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              
              {/* Form to Create Shift */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                <h4 className="font-bold text-slate-800 text-[11px] uppercase tracking-wider">Tambah Shift Baru</h4>
                <div className="space-y-2">
                  <div className="space-y-1">
                    <label className="text-slate-500">Nama Shift</label>
                    <input
                      type="text"
                      value={shiftName}
                      onChange={(e) => setShiftName(e.target.value)}
                      placeholder="e.g. Shift Pagi, Shift Siang"
                      className="w-full bg-white border border-slate-200 px-3 py-2 rounded-lg text-slate-800 focus:outline-none focus:border-blue-500 font-semibold"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-slate-500">Jam Masuk (Batas Absen)</label>
                      <input
                        type="time"
                        value={shiftStartTime}
                        onChange={(e) => setShiftStartTime(e.target.value)}
                        className="w-full bg-white border border-slate-200 px-3 py-2 rounded-lg text-slate-800 focus:outline-none focus:border-blue-500 font-semibold"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-slate-500">Jam Pulang Kerja</label>
                      <input
                        type="time"
                        value={shiftEndTime}
                        onChange={(e) => setShiftEndTime(e.target.value)}
                        className="w-full bg-white border border-slate-200 px-3 py-2 rounded-lg text-slate-800 focus:outline-none focus:border-blue-500 font-semibold"
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={addingShift || !shiftName}
                    onClick={async () => {
                      if (!activeBusiness || !shiftName) return;
                      try {
                        setAddingShift(true);
                        const supabase = createWebBrowserClient();
                        // Format to time string format (HH:MM:SS) if not already
                        const formattedStart = shiftStartTime.includes(":") && shiftStartTime.split(":").length === 2 ? `${shiftStartTime}:00` : shiftStartTime;
                        const formattedEnd = shiftEndTime.includes(":") && shiftEndTime.split(":").length === 2 ? `${shiftEndTime}:00` : shiftEndTime;
                        
                        const { error } = await supabase
                          .from("working_shifts")
                          .insert({
                            business_id: activeBusiness.id,
                            name: shiftName,
                            start_time: formattedStart,
                            end_time: formattedEnd
                          });
                        if (error) throw error;
                        setShiftName("");
                        await fetchWorkingShifts();
                      } catch (err: any) {
                        alert("Gagal menyimpan shift: " + err.message);
                      } finally {
                        setAddingShift(false);
                      }
                    }}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-extrabold py-2 rounded-lg text-center transition active:scale-95 disabled:opacity-50 mt-1"
                  >
                    {addingShift ? "Menambahkan..." : "Tambah Template Shift"}
                  </button>
                </div>
              </div>

              {/* List of Existing Shifts */}
              <div className="space-y-2">
                <h4 className="font-bold text-slate-800 text-[11px] uppercase tracking-wider">Daftar Shift Aktif</h4>
                {workingShifts.length > 0 ? (
                  <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white">
                    {workingShifts.map((ws) => (
                      <div key={ws.id} className="flex items-center justify-between p-3 hover:bg-slate-50 transition">
                        <div>
                          <div className="font-bold text-slate-900">{ws.name}</div>
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            Jam Kerja: {ws.start_time.substring(0, 5)} - {ws.end_time.substring(0, 5)}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={async () => {
                            if (!confirm(`Hapus shift "${ws.name}"? Karyawan yang menggunakan shift ini akan dialihkan ke default bisnis.`)) return;
                            try {
                              const supabase = createWebBrowserClient();
                              const { error } = await supabase
                                .from("working_shifts")
                                .delete()
                                .eq("id", ws.id);
                              if (error) throw error;
                              await fetchWorkingShifts();
                              await fetchEmployees();
                            } catch (err: any) {
                              alert("Gagal menghapus shift: " + err.message);
                            }
                          }}
                          className="p-1 text-rose-600 hover:bg-rose-50 rounded-lg transition"
                          title="Hapus Shift"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-slate-400 border border-dashed border-slate-200 rounded-xl">
                    Belum ada template shift terdaftar.
                  </div>
                )}
              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-150 flex justify-end bg-slate-50">
              <button
                type="button"
                onClick={() => setShowShiftManagementModal(false)}
                className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold px-4 py-2 rounded-xl transition"
              >
                Selesai
              </button>
            </div>
            
          </div>
        </div>
      )}

      {/* Bulk Shift Update Modal */}
      {showBulkShiftModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-amber-500" />
                Ubah Shift Masal ({selectedEmpIds.length} Karyawan)
              </h3>
              <button 
                onClick={() => setShowBulkShiftModal(false)}
                className="text-slate-400 hover:text-slate-600 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleBulkShiftSubmit} className="p-5 space-y-4 text-xs font-semibold">
              <p className="text-slate-500">
                Pilih master shift baru yang akan diterapkan pada <strong>{selectedEmpIds.length} karyawan</strong> yang terpilih:
              </p>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Target Shift Kerja</label>
                <select
                  value={targetBulkShiftId}
                  onChange={(e) => setTargetBulkShiftId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
                >
                  <option value="">-- Tanpa Shift (Default Jam Bisnis) --</option>
                  {workingShifts.map((ws) => (
                    <option key={ws.id} value={ws.id}>
                      {ws.name} ({ws.start_time.substring(0, 5)} - {ws.end_time.substring(0, 5)})
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowBulkShiftModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={updatingBulkShift}
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white font-extrabold rounded-xl shadow-sm transition disabled:opacity-50"
                >
                  {updatingBulkShift ? "Memproses..." : "Terapkan Shift"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Access Rights & Employee Login Modal */}
      {showAccessRightsModal && accessEmployee && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-3xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-8">
            <div className="p-5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Shield className="w-4.5 h-4.5 text-emerald-600" />
                Akun Login & Hak Akses - {accessEmployee.name}
              </h3>
              <button 
                onClick={() => setShowAccessRightsModal(false)}
                className="text-slate-400 hover:text-slate-600 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveAccessRights} className="p-5 space-y-4 text-xs font-semibold max-h-[80vh] overflow-y-auto">
              {accessModalError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-600 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{accessModalError}</span>
                </div>
              )}

              {/* Info Karyawan */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 text-[11px]">Email Karyawan</span>
                  <span className="font-mono text-slate-900 font-bold">{accessEmployee.email}</span>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                  <span className="text-slate-500 text-[11px]">Bisnis Terhubung</span>
                  <span className="text-blue-700 font-bold">{activeBusiness?.name}</span>
                </div>
              </div>

              {loadingAccess ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <div className="w-6 h-6 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-[10px] text-slate-400 font-bold mt-2">Memeriksa status akun login...</span>
                </div>
              ) : (
                <>
                  {/* SEKSI STATUS & PASSWORD AKUN */}
                  <div className={`p-4 rounded-2xl border ${
                    isExistingUser 
                      ? "bg-emerald-50/50 border-emerald-200" 
                      : "bg-blue-50/60 border-blue-200"
                  } space-y-3`}>
                    <div className="flex items-start gap-2.5">
                      {isExistingUser ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                      ) : (
                        <Key className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-black text-slate-900">
                          {isExistingUser ? "Akun Login Sudah Terdaftar" : "Buatkan Password Login Baru"}
                        </div>
                        <p className="text-[11px] text-slate-600 leading-relaxed mt-0.5">
                          {isExistingUser 
                            ? "Karyawan ini sudah memiliki akun di sistem. Anda dapat mengatur ulang (reset) password jika diperlukan." 
                            : "Karyawan belum memiliki akun. Tentukan password di bawah agar karyawan dapat langsung login."}
                        </p>
                      </div>
                    </div>

                    {/* Jika belum ada akun, input password wajib tampil */}
                    {!isExistingUser && (
                      <div className="space-y-1.5 pt-1">
                        <label className="block text-[11px] font-bold text-slate-800">
                          Password Login Baru <span className="text-rose-500">*</span>
                        </label>
                        <div className="relative">
                          <input
                            type={showPasswordPlainText ? "text" : "password"}
                            required
                            value={accessPassword}
                            onChange={(e) => setAccessPassword(e.target.value)}
                            placeholder="Minimal 6 karakter (contoh: Staff#2026)"
                            className="w-full pl-3 pr-10 py-2 bg-white border border-blue-300 rounded-xl text-slate-900 font-medium text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPasswordPlainText(!showPasswordPlainText)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                          >
                            {showPasswordPlainText ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                        <p className="text-[10px] text-slate-500 font-normal">
                          Karyawan dapat masuk menggunakan email <strong>{accessEmployee.email}</strong> dan password ini.
                        </p>
                      </div>
                    )}

                    {/* Jika sudah ada akun, sediakan opsi toggle reset password */}
                    {isExistingUser && (
                      <div className="space-y-2 pt-1 border-t border-emerald-200/60">
                        <label className="flex items-center gap-2 cursor-pointer text-emerald-950">
                          <input
                            type="checkbox"
                            checked={resetPasswordToggle}
                            onChange={(e) => {
                              setResetPasswordToggle(e.target.checked);
                              if (!e.target.checked) setAccessPassword("");
                            }}
                            className="rounded border-emerald-300 text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5"
                          />
                          <span className="text-[11px] font-bold">Ubah / Reset Kata Sandi Karyawan Ini</span>
                        </label>

                        {resetPasswordToggle && (
                          <div className="space-y-1 pl-5 pt-1">
                            <div className="relative">
                              <input
                                type={showPasswordPlainText ? "text" : "password"}
                                required={resetPasswordToggle}
                                value={accessPassword}
                                onChange={(e) => setAccessPassword(e.target.value)}
                                placeholder="Masukkan password baru (minimal 6 karakter)"
                                className="w-full pl-3 pr-10 py-2 bg-white border border-emerald-300 rounded-xl text-slate-900 font-medium text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                              />
                              <button
                                type="button"
                                onClick={() => setShowPasswordPlainText(!showPasswordPlainText)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                              >
                                {showPasswordPlainText ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* SEKSI PERAN / ROLE */}
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Peran / Role di Bisnis Ini</label>
                    <select
                      value={accessRole}
                      onChange={(e) => setAccessRole(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
                    >
                      <option value="admin">Admin Bisnis (Akses Penuh Seluruh Menu)</option>
                      <option value="sales">Sales & Penjualan (Faktur, Penawaran, Pelanggan, Kasir POS)</option>
                      <option value="purchasing">Pembelian & Pemasok (PO, Vendor, Stok)</option>
                      <option value="warehouse">Gudang & Inventori (Stok, Surat Jalan, UOM)</option>
                      <option value="finance">Keuangan & Akuntansi (Pembayaran, Kas, Laporan)</option>
                      <option value="staff">Staff Biasa / Operasional (Sesuai Izin Dasar)</option>
                      <option value="custom">Kustomisasi Hak Akses Spesifik</option>
                    </select>
                  </div>

                  {accessRole === "custom" && (
                    <div className="space-y-2 pt-2 border-t border-slate-100">
                      <label className="block font-bold text-slate-700">Pilih Menu Yang Diizinkan:</label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-2 bg-slate-50 border border-slate-200 rounded-xl">
                        {AVAILABLE_PERMISSIONS.map((perm) => (
                          <label key={perm.key} className="flex items-center gap-2 p-1.5 hover:bg-white rounded-lg transition cursor-pointer text-slate-700">
                            <input
                              type="checkbox"
                              checked={!!accessPermissions[perm.key]}
                              onChange={() => setAccessPermissions(prev => ({ ...prev, [perm.key]: !prev[perm.key] }))}
                              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
                            />
                            <span className="text-[11px] font-semibold">{perm.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="pt-3 flex items-center justify-between border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => {
                        setShowAccessRightsModal(false);
                        router.push(`/settings/users?new_employee=true&new_employee_email=${encodeURIComponent(accessEmployee.email || "")}`);
                      }}
                      className="text-[10px] font-bold text-blue-600 hover:underline"
                    >
                      Buka Pengaturan Tim Lengkap ↗
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setShowAccessRightsModal(false)}
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition"
                      >
                        Batal
                      </button>
                      <button
                        type="submit"
                        disabled={savingAccess}
                        className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl shadow-sm transition disabled:opacity-50 flex items-center gap-1.5"
                      >
                        <Lock className="w-3.5 h-3.5" />
                        <span>{savingAccess ? "Menyimpan..." : "Simpan Akun & Hak Akses"}</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
