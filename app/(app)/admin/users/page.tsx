"use client";

import React, { useState, useEffect } from "react";
import { 
  Plus, 
  UserPlus, 
  RefreshCw, 
  Trash2, 
  ShieldAlert, 
  KeyRound, 
  CalendarPlus, 
  Calendar, 
  CalendarClock,
  X, 
  Check, 
  Search,
  Clock,
  Building2,
  Mail,
  UserCheck
} from "lucide-react";

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  
  // Modal Tambah User
  const [showAddModal, setShowAddModal] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [businessName, setBusinessName] = useState("");
  
  // Default masa aktif 12 bulan dari hari ini
  const defaultNextYear = () => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1);
    return d.toISOString().split("T")[0];
  };
  const [customExpiresAt, setCustomExpiresAt] = useState(defaultNextYear());
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Modal Reset Password
  const [selectedUserForPw, setSelectedUserForPw] = useState<any>(null);
  const [newPassword, setNewPassword] = useState("");
  const [resettingPw, setResettingPw] = useState(false);

  // Modal Atur Masa Aktif
  const [selectedUserForExpiry, setSelectedUserForExpiry] = useState<any>(null);
  const [expiryDateInput, setExpiryDateInput] = useState("");
  const [savingExpiry, setSavingExpiry] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/users?_t=${Date.now()}`, {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache" },
      });
      const json = await res.json();
      if (json.data) {
        setUsers(json.data);
      }
    } catch (e) {
      console.error("Failed fetching users:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: fullName,
          email,
          password,
          business_name: businessName,
          expires_at: customExpiresAt,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setErrorMsg(json.error || "Gagal membuat akun.");
      } else {
        setShowAddModal(false);
        setFullName("");
        setEmail("");
        setPassword("");
        setBusinessName("");
        setCustomExpiresAt(defaultNextYear());
        fetchUsers();
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Terjadi kesalahan.");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (user: any) => {
    const nextStatus = user.is_active === false ? true : false;
    const confirmText = nextStatus
      ? `Aktifkan akun ${user.email}?`
      : `Nonaktifkan akun ${user.email}? Pengguna tidak akan bisa login.`;

    if (!confirm(confirmText)) return;

    try {
      await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: user.id, is_active: nextStatus }),
      });
      fetchUsers();
    } catch (e) {
      alert("Gagal memperbarui status user.");
    }
  };

  const openExpiryModal = (user: any) => {
    setSelectedUserForExpiry(user);
    if (user.expires_at) {
      setExpiryDateInput(new Date(user.expires_at).toISOString().split("T")[0]);
    } else {
      setExpiryDateInput(defaultNextYear());
    }
  };

  const handleSaveExpiry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserForExpiry || !expiryDateInput) return;
    setSavingExpiry(true);

    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedUserForExpiry.id,
          expires_at: expiryDateInput,
        }),
      });
      if (res.ok) {
        setSelectedUserForExpiry(null);
        fetchUsers();
      } else {
        const json = await res.json();
        alert(json.error || "Gagal memperbarui masa aktif.");
      }
    } finally {
      setSavingExpiry(false);
    }
  };

  const applyExpiryPreset = (monthsToAdd: number) => {
    const base = new Date();
    base.setMonth(base.getMonth() + monthsToAdd);
    setExpiryDateInput(base.toISOString().split("T")[0]);
  };

  const applyAddPreset = (monthsToAdd: number) => {
    const base = new Date();
    base.setMonth(base.getMonth() + monthsToAdd);
    setCustomExpiresAt(base.toISOString().split("T")[0]);
  };

  const handleDeleteUser = async (user: any) => {
    if (!confirm(`HAPUS PERMANEN akun ${user.email}? Seluruh data bisnis pengguna ini akan dihapus.`)) return;

    try {
      const res = await fetch(`/api/admin/users?id=${user.id}`, { method: "DELETE" });
      const json = await res.json();
      if (res.ok && json.success) {
        setUsers((prev) => prev.filter((u) => u.id !== user.id));
        fetchUsers();
      } else {
        alert(json.error || "Gagal menghapus pengguna.");
      }
    } catch (e) {
      alert("Terjadi kesalahan.");
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserForPw || !newPassword) return;
    setResettingPw(true);

    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: selectedUserForPw.id, reset_password: newPassword }),
      });
      if (res.ok) {
        alert("Kata sandi berhasil diperbarui.");
        setSelectedUserForPw(null);
        setNewPassword("");
      } else {
        const json = await res.json();
        alert(json.error || "Gagal mereset kata sandi.");
      }
    } finally {
      setResettingPw(false);
    }
  };

  const activeCount = users.filter((u) => u.is_active !== false).length;
  const isQuotaFull = activeCount >= 25;

  const filteredUsers = users.filter(
    (u) =>
      u.email?.toLowerCase().includes(search.toLowerCase()) ||
      u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      (u.businesses?.[0]?.name || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <UserCheck className="w-7 h-7 text-indigo-600" />
            Manajemen Pengguna & Lisensi
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Kelola akun perusahaan klien ({activeCount} / 25 slot aktif) dan tentukan masa aktif langganan bebas kapan pun.
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          disabled={isQuotaFull}
          className={`inline-flex items-center gap-2 font-bold text-xs px-5 py-3 rounded-2xl shadow-md transition ${
            isQuotaFull
              ? "bg-slate-300 text-slate-500 cursor-not-allowed"
              : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/20"
          }`}
        >
          <UserPlus className="w-4 h-4" />
          <span>Tambah User Baru</span>
        </button>
      </div>

      {isQuotaFull && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-2xl text-xs font-semibold flex items-center gap-3">
          <ShieldAlert className="w-5 h-5 shrink-0 text-rose-600" />
          <span>Batas kuota 25 user aktif telah penuh. Nonaktifkan atau hapus user lama untuk menambah user baru.</span>
        </div>
      )}

      {/* Search and Table */}
      <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari email, nama PIC, atau PT..."
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-indigo-600 font-medium"
            />
          </div>
          <button
            onClick={fetchUsers}
            className="p-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-slate-600 transition"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-100">
              <tr>
                <th className="px-5 py-3.5 text-left">Nama PIC & Email</th>
                <th className="px-5 py-3.5 text-left">Bisnis / PT Klien</th>
                <th className="px-5 py-3.5 text-left">Status</th>
                <th className="px-5 py-3.5 text-left">Masa Aktif Berakhir</th>
                <th className="px-5 py-3.5 text-right">Aksi & Pengaturan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.map((u) => {
                const exp = u.expires_at ? new Date(u.expires_at) : null;
                const isExp = exp && exp < new Date();
                const bizName = u.businesses?.[0]?.name || "-";

                return (
                  <tr key={u.id} className="hover:bg-slate-50/50 transition">
                    <td className="px-5 py-4">
                      <p className="font-bold text-slate-900">{u.full_name || "Tanpa Nama"}</p>
                      <p className="text-slate-400 font-medium">{u.email}</p>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1.5 font-bold text-slate-800">
                        <Building2 className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                        <span>{bizName}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-lg font-bold text-[10px] uppercase tracking-wide ${
                          u.is_active === false
                            ? "bg-slate-100 text-slate-600"
                            : isExp
                            ? "bg-rose-50 text-rose-600 border border-rose-100"
                            : "bg-emerald-50 text-emerald-600 border border-emerald-100"
                        }`}
                      >
                        {u.is_active === false ? "Nonaktif" : isExp ? "Expired" : "Aktif"}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <div>
                          <p className={`font-bold ${isExp ? "text-rose-600" : "text-slate-800"}`}>
                            {exp ? exp.toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" }) : "-"}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            Didaftarkan: {new Date(u.created_at).toLocaleDateString("id-ID")}
                          </p>
                        </div>
                        <button
                          onClick={() => openExpiryModal(u)}
                          className="px-2 py-1 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-600 rounded-lg text-[10px] font-bold border border-slate-200 transition flex items-center gap-1 shrink-0"
                          title="Ubah Tanggal Masa Aktif"
                        >
                          <CalendarClock className="w-3 h-3" />
                          Ubah
                        </button>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          onClick={() => handleToggleStatus(u)}
                          title={u.is_active === false ? "Aktifkan User" : "Nonaktifkan User"}
                          className={`px-2.5 py-1.5 rounded-lg border transition text-xs font-bold ${
                            u.is_active === false
                              ? "bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100"
                              : "bg-amber-50 text-amber-600 border-amber-200 hover:bg-amber-100"
                          }`}
                        >
                          {u.is_active === false ? "Aktifkan" : "Nonaktifkan"}
                        </button>
                        <button
                          onClick={() => openExpiryModal(u)}
                          title="Atur Masa Aktif Langganan"
                          className="p-2 rounded-lg border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 transition"
                        >
                          <CalendarClock className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setSelectedUserForPw(u)}
                          title="Reset Kata Sandi"
                          className="p-2 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 transition"
                        >
                          <KeyRound className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteUser(u)}
                          title="Hapus Permanen"
                          className="p-2 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-600 transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredUsers.length === 0 && !loading && (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-slate-400">
                    Tidak ada data pengguna ditemukan.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Tambah User Baru */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <h3 className="font-extrabold text-slate-900 text-base">Tambah Akun Perusahaan Baru</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="bg-rose-50 border border-rose-100 p-3 rounded-xl text-rose-600 text-xs font-semibold">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleCreateUser} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Nama Lengkap PIC</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Budi Santoso"
                  className="w-full border border-slate-200 px-3.5 py-2.5 rounded-xl text-xs focus:outline-none focus:border-indigo-600 font-medium"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Nama Bisnis / PT</label>
                <input
                  type="text"
                  required
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="PT Abadi Jaya Perkasa"
                  className="w-full border border-slate-200 px-3.5 py-2.5 rounded-xl text-xs focus:outline-none focus:border-indigo-600 font-medium"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Alamat Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="pic@abadijaya.com"
                  className="w-full border border-slate-200 px-3.5 py-2.5 rounded-xl text-xs focus:outline-none focus:border-indigo-600 font-medium"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Kata Sandi Awal</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimal 6 karakter"
                  className="w-full border border-slate-200 px-3.5 py-2.5 rounded-xl text-xs focus:outline-none focus:border-indigo-600 font-medium"
                />
              </div>

              {/* Tanggal Masa Aktif Kustom */}
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Masa Aktif Berakhir Pada</span>
                  </label>
                </div>
                <input
                  type="date"
                  required
                  value={customExpiresAt}
                  onChange={(e) => setCustomExpiresAt(e.target.value)}
                  className="w-full border border-slate-200 px-3.5 py-2.5 rounded-xl text-xs focus:outline-none focus:border-indigo-600 font-bold text-slate-800 bg-slate-50"
                />
                {/* Shortcut Presets */}
                <div className="flex items-center gap-1.5 pt-1">
                  <span className="text-[10px] text-slate-400 font-semibold">Pilih Cepat:</span>
                  {[
                    { label: "1 Bln", m: 1 },
                    { label: "3 Bln", m: 3 },
                    { label: "6 Bln", m: 6 },
                    { label: "1 Thn", m: 12 },
                    { label: "2 Thn", m: 24 },
                  ].map((p) => (
                    <button
                      key={p.m}
                      type="button"
                      onClick={() => applyAddPreset(p.m)}
                      className="px-2 py-0.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[10px] font-bold border border-indigo-200 transition"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 transition"
                >
                  {saving ? "Membuat Akun..." : "Buat Akun"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Ubah Masa Aktif Pengguna */}
      {selectedUserForExpiry && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <CalendarClock className="w-5 h-5 text-indigo-600" />
                <h3 className="font-extrabold text-slate-900 text-base">Atur Masa Aktif Lisensi</h3>
              </div>
              <button
                onClick={() => setSelectedUserForExpiry(null)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-1 text-xs">
              <p className="text-slate-500 font-medium">Pengguna:</p>
              <p className="font-bold text-slate-900">{selectedUserForExpiry.full_name} ({selectedUserForExpiry.email})</p>
              <p className="text-[11px] text-slate-500 pt-1">
                Masa aktif saat ini berakhir:{" "}
                <span className="font-bold text-slate-800">
                  {selectedUserForExpiry.expires_at 
                    ? new Date(selectedUserForExpiry.expires_at).toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" })
                    : "Belum diset"}
                </span>
              </p>
            </div>

            <form onSubmit={handleSaveExpiry} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
                  Pilih Tanggal Berakhir Bebas (Kapan Saja):
                </label>
                <input
                  type="date"
                  required
                  value={expiryDateInput}
                  onChange={(e) => setExpiryDateInput(e.target.value)}
                  className="w-full border border-slate-200 px-4 py-3 rounded-2xl text-sm font-bold text-slate-900 focus:outline-none focus:border-indigo-600 bg-white"
                />
              </div>

              {/* Quick Presets */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Shortcut Durasi Tambahan dari Hari Ini:
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { label: "+1 Bulan", m: 1 },
                    { label: "+3 Bulan", m: 3 },
                    { label: "+6 Bulan", m: 6 },
                    { label: "+1 Tahun", m: 12 },
                    { label: "+2 Tahun", m: 24 },
                    { label: "+3 Tahun", m: 36 },
                  ].map((p) => (
                    <button
                      key={p.m}
                      type="button"
                      onClick={() => applyExpiryPreset(p.m)}
                      className="px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold border border-indigo-200 transition"
                    >
                      {p.label}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setExpiryDateInput(new Date().toISOString().split("T")[0])}
                    className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold border border-rose-200 transition"
                  >
                    Set Expired Hari Ini
                  </button>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedUserForExpiry(null)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingExpiry}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 transition flex items-center gap-1.5"
                >
                  {savingExpiry ? (
                    "Menyimpan..."
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      Simpan Masa Aktif
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Reset Password */}
      {selectedUserForPw && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="font-extrabold text-slate-900 text-sm">Ganti Kata Sandi</h3>
              <button
                onClick={() => setSelectedUserForPw(null)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Ubah kata sandi untuk <span className="font-bold text-slate-800">{selectedUserForPw.email}</span>
            </p>

            <form onSubmit={handleResetPassword} className="space-y-3">
              <input
                type="password"
                required
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Kata sandi baru..."
                className="w-full border border-slate-200 px-3.5 py-2.5 rounded-xl text-xs focus:outline-none focus:border-indigo-600 font-medium"
              />

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedUserForPw(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={resettingPw}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold"
                >
                  {resettingPw ? "Menyimpan..." : "Perbarui Sandi"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
