"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Users, Clock, CheckCircle2, AlertTriangle, ArrowRight, Settings2, X, Check } from "lucide-react";

export default function AdminDashboardPage() {
  const [stats, setStats] = useState({
    activeUsers: 0,
    maxUsers: 30,
    expiringSoon: 0,
    suspendedUsers: 0,
  });
  const [recentUsers, setRecentUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal Ubah Kuota
  const [showQuotaModal, setShowQuotaModal] = useState(false);
  const [newQuotaInput, setNewQuotaInput] = useState(30);
  const [savingQuota, setSavingQuota] = useState(false);

  async function loadDashboard() {
    try {
      const res = await fetch(`/api/admin/users?_t=${Date.now()}`, {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache" },
      });
      const json = await res.json();
      
      const userList = json.data || [];
      const maxUsers = json.max_users || 30;

      const active = userList.filter((u: any) => u.is_active !== false).length;
      const suspended = userList.filter((u: any) => u.is_active === false).length;

      // Count expiring within 30 days
      const now = new Date().getTime();
      const thirtyDays = 30 * 24 * 60 * 60 * 1000;
      const expiring = userList.filter((u: any) => {
        if (!u.expires_at || u.is_active === false) return false;
        const exp = new Date(u.expires_at).getTime();
        return exp > now && exp - now <= thirtyDays;
      }).length;

      setStats({
        activeUsers: active,
        maxUsers,
        expiringSoon: expiring,
        suspendedUsers: suspended,
      });
      setNewQuotaInput(maxUsers);
      setRecentUsers(userList.slice(0, 5));
    } catch (err) {
      console.error("Failed to load dashboard data:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  const handleUpdateQuota = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingQuota(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ update_max_users: newQuotaInput }),
      });
      const json = await res.json();
      if (res.ok) {
        setShowQuotaModal(false);
        loadDashboard();
      } else {
        alert(json.error || "Gagal memperbarui kuota.");
      }
    } catch (e) {
      alert("Terjadi kesalahan.");
    } finally {
      setSavingQuota(false);
    }
  };

  const percentage = Math.min(Math.round((stats.activeUsers / stats.maxUsers) * 100), 100);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Ringkasan Sistem Whitelabel</h1>
        <p className="text-xs text-slate-500 font-medium">Pantau kuota akun perusahaan dan masa aktif lisensi.</p>
      </div>

      {/* Quota Progress Card */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-indigo-600 tracking-wider uppercase">Kapasitas Pengguna</span>
            <h2 className="text-3xl font-black text-slate-900">
              {stats.activeUsers} <span className="text-slate-400 font-medium text-lg">/ {stats.maxUsers} Slot Terpakai</span>
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowQuotaModal(true)}
              className="inline-flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-4 py-3 rounded-2xl border border-slate-200 transition"
            >
              <Settings2 className="w-4 h-4 text-indigo-600" />
              <span>Ubah Kuota</span>
            </button>
            <Link
              href="/admin/users"
              className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-5 py-3 rounded-2xl shadow-md shadow-indigo-600/20 transition"
            >
              <span>Kelola User</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Progress bar */}
        <div className="space-y-2">
          <div className="w-full h-3.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                stats.activeUsers >= stats.maxUsers
                  ? "bg-rose-500"
                  : stats.activeUsers >= stats.maxUsers * 0.8
                  ? "bg-amber-500"
                  : "bg-indigo-600"
              }`}
              style={{ width: `${percentage}%` }}
            />
          </div>
          <div className="flex justify-between text-[11px] font-semibold text-slate-400">
            <span>Sisa Kuota: {Math.max(stats.maxUsers - stats.activeUsers, 0)} user</span>
            <span>{percentage}% Kuota Terpakai</span>
          </div>
        </div>
      </div>

      {/* Modal Ubah Kuota */}
      {showQuotaModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Settings2 className="w-5 h-5 text-indigo-600" />
                <h3 className="font-extrabold text-slate-900 text-base">Atur Kuota User</h3>
              </div>
              <button
                onClick={() => setShowQuotaModal(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Tentukan batas maksimum jumlah perusahaan/klien aktif yang dapat didaftarkan di sistem ini.
            </p>

            <form onSubmit={handleUpdateQuota} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Jumlah Maksimum Slot</label>
                <input
                  type="number"
                  min={stats.activeUsers}
                  max={9999}
                  required
                  value={newQuotaInput}
                  onChange={(e) => setNewQuotaInput(parseInt(e.target.value, 10))}
                  className="w-full border border-slate-200 px-4 py-2.5 rounded-xl text-base font-black text-slate-900 focus:outline-none focus:border-indigo-600"
                />
                <p className="text-[10px] text-slate-400">Minimal {stats.activeUsers} (sesuai user aktif saat ini).</p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowQuotaModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingQuota}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 flex items-center gap-1.5"
                >
                  {savingQuota ? "Menyimpan..." : (
                    <>
                      <Check className="w-4 h-4" />
                      Simpan Kuota
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Mini Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">User Aktif</p>
            <p className="text-xl font-black text-slate-800">{stats.activeUsers}</p>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Kadaluarsa &lt; 30 Hari</p>
            <p className="text-xl font-black text-slate-800">{stats.expiringSoon}</p>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Dinonaktifkan</p>
            <p className="text-xl font-black text-slate-800">{stats.suspendedUsers}</p>
          </div>
        </div>
      </div>

      {/* Recent Users List */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Pengguna Terbaru</h3>
          <Link href="/admin/users" className="text-xs font-bold text-indigo-600 hover:text-indigo-700">
            Lihat Semua
          </Link>
        </div>

        <div className="divide-y divide-slate-100">
          {recentUsers.map((u) => {
            const exp = u.expires_at ? new Date(u.expires_at) : null;
            const isExp = exp && exp < new Date();
            return (
              <div key={u.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <p className="text-xs font-bold text-slate-800">{u.full_name || "Tanpa Nama"}</p>
                  <p className="text-[11px] text-slate-400">{u.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                      u.is_active === false
                        ? "bg-slate-100 text-slate-600"
                        : isExp
                        ? "bg-rose-50 text-rose-600"
                        : "bg-emerald-50 text-emerald-600"
                    }`}
                  >
                    {u.is_active === false ? "Nonaktif" : isExp ? "Expired" : "Aktif"}
                  </span>
                  <span className="text-[11px] text-slate-400 font-medium">
                    Exp: {exp ? exp.toLocaleDateString("id-ID") : "-"}
                  </span>
                </div>
              </div>
            );
          })}
          {recentUsers.length === 0 && !loading && (
            <p className="text-center py-6 text-xs text-slate-400">Belum ada user yang didaftarkan.</p>
          )}
        </div>
      </div>
    </div>
  );
}
