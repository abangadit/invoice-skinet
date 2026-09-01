"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { createWebBrowserClient } from "../../../../lib/supabase/client";
import { Users, Clock, CheckCircle2, AlertTriangle, ArrowRight } from "lucide-react";

export default function AdminDashboardPage() {
  const [stats, setStats] = useState({
    activeUsers: 0,
    maxUsers: 25,
    expiringSoon: 0,
    suspendedUsers: 0,
  });
  const [recentUsers, setRecentUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboard() {
      try {
        const supabase = createWebBrowserClient();

        // 1. Fetch config
        const { data: config } = await supabase
          .from("whitelabel_config")
          .select("max_users")
          .single();
        const maxUsers = config?.max_users || 25;

        // 2. Fetch users (hanya tenant/PT yang dibuat superadmin)
        const { data: users } = await supabase
          .from("users")
          .select("*")
          .eq("is_tenant", true)
          .order("created_at", { ascending: false });

        const userList = users || [];
        const active = userList.filter((u) => u.is_active !== false).length;
        const suspended = userList.filter((u) => u.is_active === false).length;

        // Count expiring within 30 days
        const now = new Date().getTime();
        const thirtyDays = 30 * 24 * 60 * 60 * 1000;
        const expiring = userList.filter((u) => {
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
        setRecentUsers(userList.slice(0, 5));
      } catch (err) {
        console.error("Failed to load dashboard data:", err);
      } finally {
        setLoading(false);
      }
    }
    loadDashboard();
  }, []);

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
          <Link
            href="/admin/users"
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-5 py-3 rounded-2xl shadow-md shadow-indigo-600/20 transition self-start sm:self-auto"
          >
            <span>Kelola User</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
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
