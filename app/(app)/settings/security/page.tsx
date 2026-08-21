"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Lock,
  Smartphone,
  Laptop,
  Globe,
  RefreshCw,
  LogOut,
  Shield,
  Users,
  AlertTriangle,
  CheckCircle,
  HelpCircle
} from "lucide-react";
import { useBusiness } from "../../../../lib/context/BusinessContext";
import { useLanguage } from "../../../../lib/context/LanguageContext";
import { createWebBrowserClient } from "../../../../lib/supabase/client";

interface ActiveSession {
  session_id: string;
  ip_address: string;
  user_agent: string;
  created_at: string;
  updated_at: string;
  is_current: boolean;
}

interface TeamSession {
  session_id: string;
  user_id: string;
  email: string;
  role: string;
  ip_address: string;
  user_agent: string;
  created_at: string;
  updated_at: string;
  is_current: boolean;
}

function parseUserAgent(ua: string) {
  if (!ua) return { os: "Unknown OS", browser: "Unknown Browser", device: "Desktop" };
  const lower = ua.toLowerCase();
  
  // OS Detection
  let os = "Unknown OS";
  if (lower.includes("windows")) os = "Windows";
  else if (lower.includes("macintosh") || lower.includes("mac os")) {
    if (lower.includes("iphone") || lower.includes("ipad")) os = "iOS";
    else os = "macOS";
  }
  else if (lower.includes("android")) os = "Android";
  else if (lower.includes("linux")) os = "Linux";
  
  // Browser Detection
  let browser = "Unknown Browser";
  if (lower.includes("chrome") || lower.includes("chromium")) {
    if (lower.includes("edg")) browser = "Edge";
    else if (lower.includes("opr") || lower.includes("opera")) browser = "Opera";
    else browser = "Chrome";
  }
  else if (lower.includes("safari")) {
    if (lower.includes("chrome")) browser = "Chrome";
    else browser = "Safari";
  }
  else if (lower.includes("firefox")) browser = "Firefox";
  
  // Device Type
  let device = "Desktop";
  if (lower.includes("mobi") || lower.includes("phone")) device = "Mobile";
  else if (lower.includes("tablet") || lower.includes("ipad")) device = "Tablet";
  
  return { os, browser, device };
}

export default function SecuritySettingsPage() {
  const { activeBusiness, userRole } = useBusiness();
  const { locale } = useLanguage();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<"my-sessions" | "team-sessions">("my-sessions");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [updatingPassword, setUpdatingPassword] = useState(false);

  const [mySessions, setMySessions] = useState<ActiveSession[]>([]);
  const [teamSessions, setTeamSessions] = useState<TeamSession[]>([]);

  const isOwnerOrAdmin = userRole === "owner" || userRole === "admin";

  const fetchSessions = async (isSilent = false) => {
    if (!activeBusiness) return;
    try {
      if (!isSilent) setLoading(true);
      else setRefreshing(true);

      const supabase = createWebBrowserClient();

      // 1. Fetch current user's sessions
      const { data: myData, error: myError } = await supabase
        .rpc("get_my_active_sessions");

      if (myError) throw myError;
      setMySessions(myData || []);

      // 2. Fetch business team sessions if owner/admin
      if (isOwnerOrAdmin) {
        const { data: teamData, error: teamError } = await supabase
          .rpc("get_business_active_sessions", { p_business_id: activeBusiness.id });

        if (teamError) throw teamError;
        setTeamSessions(teamData || []);
      }

    } catch (err) {
      console.error("Error fetching active sessions:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, [activeBusiness, userRole]);

  const handleRevokeSession = async (sessionId: string, isCurrent: boolean) => {
    const confirmationMsg = isCurrent
      ? "Apakah Anda yakin ingin mengeluarkan perangkat yang sedang Anda gunakan saat ini? Anda akan langsung dikeluarkan dari sistem."
      : "Apakah Anda yakin ingin mencabut akses masuk untuk perangkat ini?";
      
    if (!confirm(confirmationMsg)) return;

    try {
      setRevokingId(sessionId);
      const supabase = createWebBrowserClient();

      const { data, error } = await supabase
        .rpc("revoke_user_session", { p_session_id: sessionId });

      if (error) throw error;

      if (data) {
        alert("Sesi berhasil di-kick/dikeluarkan!");
        
        // If they kicked their current session, sign out and redirect to login
        if (isCurrent) {
          await supabase.auth.signOut();
          router.refresh();
          router.push("/login");
          return;
        }

        await fetchSessions(true);
      } else {
        alert("Gagal mengeluarkan sesi. Sesi mungkin sudah tidak aktif.");
      }
    } catch (err: any) {
      console.error("Error revoking session:", err);
      alert(err.message || "Gagal mencabut sesi.");
    } finally {
      setRevokingId(null);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      alert("Konfirmasi password tidak cocok!");
      return;
    }
    if (newPassword.length < 6) {
      alert("Password minimal 6 karakter.");
      return;
    }
    try {
      setUpdatingPassword(true);
      const supabase = createWebBrowserClient();
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      
      if (error) throw error;
      
      alert("Password berhasil diperbarui! Anda sekarang dapat login menggunakan email dan password ini.");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      console.error("Error updating password:", err);
      alert(err.message || "Gagal memperbarui password.");
    } finally {
      setUpdatingPassword(false);
    }
  };

  const formatDateTime = (isoString: string) => {
    return new Date(isoString).toLocaleString("id-ID", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    });
  };

  const getDeviceIcon = (deviceType: string) => {
    if (deviceType === "Mobile" || deviceType === "Tablet") {
      return <Smartphone className="w-5 h-5 text-slate-500" />;
    }
    return <Laptop className="w-5 h-5 text-slate-500" />;
  };

  return (
    <div className="space-y-6 text-xs font-semibold text-slate-800">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            Keamanan Akun & Manajemen Sesi
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">Pantau perangkat yang sedang aktif dan amankan akun Anda dari akses tidak sah.</p>
        </div>
        <button
          onClick={() => fetchSessions(true)}
          disabled={refreshing}
          className="self-start sm:self-auto bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-extrabold py-2 px-3 rounded-xl flex items-center gap-1.5 shadow-sm transition active:scale-95 disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
          Perbarui Data
        </button>
      </div>

      {/* Tabs */}
      {isOwnerOrAdmin && (
        <div className="flex border-b border-slate-200 text-xs font-bold gap-4">
          <button
            onClick={() => setActiveTab("my-sessions")}
            className={`pb-3 transition ${
              activeTab === "my-sessions"
                ? "border-b-2 border-blue-600 text-blue-600"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            Sesi Aktif Anda
          </button>
          <button
            onClick={() => setActiveTab("team-sessions")}
            className={`pb-3 transition ${
              activeTab === "team-sessions"
                ? "border-b-2 border-blue-600 text-blue-600"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            Sesi Aktif Tim ({teamSessions.length} Sesi)
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs text-slate-500 font-semibold mt-2">Memuat log keamanan sesi...</p>
        </div>
      ) : activeTab === "my-sessions" ? (
        
        /* MY SESSIONS VIEW */
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-100 text-amber-800 p-4 rounded-xl flex items-start gap-2.5">
            <AlertTriangle className="w-5 h-5 shrink-0 text-amber-650" />
            <div>
              <p className="font-bold text-slate-900">Lindungi Akun Anda</p>
              <p className="text-slate-650 font-medium mt-0.5 leading-normal">
                Di bawah ini adalah daftar browser dan perangkat tempat Anda baru-baru ini melakukan login.
                Jika Anda melihat ada login mencurigakan yang tidak Anda kenali, klik **Keluarkan Perangkat** segera untuk menutup sesi tersebut.
              </p>
            </div>
          </div>

          {/* Update Password Section */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden card-shadow p-5 sm:p-6 mb-6">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                <Lock className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Ubah / Buat Password</h3>
                <p className="text-slate-500 font-medium text-xs mt-0.5 leading-normal max-w-xl">
                  Jika Anda mendaftar dengan Google, Anda dapat membuat password di sini agar dapat login dengan email dan password. Atau gunakan ini untuk mengubah password Anda saat ini.
                </p>
              </div>
            </div>
            
            <form onSubmit={handleUpdatePassword} className="space-y-4 max-w-md ml-0 sm:ml-13">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Password Baru</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimal 6 karakter"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Konfirmasi Password Baru</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Ketik ulang password baru"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition"
                />
              </div>
              <button
                type="submit"
                disabled={updatingPassword || !newPassword || !confirmPassword}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-5 rounded-xl shadow-sm transition active:scale-95 disabled:opacity-50 disabled:active:scale-100 flex items-center gap-2"
              >
                {updatingPassword ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Menyimpan...
                  </>
                ) : (
                  <>
                    <Shield className="w-4 h-4" />
                    Simpan Password
                  </>
                )}
              </button>
            </form>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden card-shadow">
            <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Laptop className="w-4 h-4 text-slate-500" /> 
                Perangkat Aktif
              </h3>
            </div>
            <div className="divide-y divide-slate-100">
              {mySessions.map((session) => {
                const { os, browser, device } = parseUserAgent(session.user_agent);
                return (
                  <div key={session.session_id} className="p-4 sm:p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:bg-slate-50/50 transition">
                    <div className="flex items-start gap-3.5">
                      <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center shrink-0">
                        {getDeviceIcon(device)}
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center flex-wrap gap-1.5">
                          <span className="font-bold text-sm text-slate-900">{browser} di {os}</span>
                          {session.is_current && (
                            <span className="bg-blue-50 text-blue-650 border border-blue-100 px-2 py-0.5 rounded-full font-extrabold text-[9px] uppercase tracking-wider">
                              Perangkat Ini
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-slate-400 font-semibold text-[10.5px]">
                          <span className="flex items-center gap-1"><Globe className="w-3.5 h-3.5" /> IP: {session.ip_address}</span>
                          <span className="text-slate-300">|</span>
                          <span>Aktif Terakhir: {formatDateTime(session.updated_at)}</span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleRevokeSession(session.session_id, session.is_current)}
                      disabled={revokingId !== null}
                      className={`font-extrabold py-2 px-4 rounded-xl flex items-center gap-1 shadow-sm transition active:scale-95 disabled:opacity-50 text-[11px] ${
                        session.is_current
                          ? "bg-slate-100 text-slate-650 hover:bg-slate-200 border border-slate-200"
                          : "bg-rose-50 text-rose-650 hover:bg-rose-100 border border-rose-100"
                      }`}
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      {session.is_current ? "Keluar Akun" : "Keluarkan Perangkat"}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

      ) : (

        /* TEAM SESSIONS VIEW (Owner/Admin only) */
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-100 text-blue-800 p-4 rounded-xl flex items-start gap-2.5">
            <Shield className="w-5 h-5 shrink-0 text-blue-600" />
            <div>
              <p className="font-bold text-slate-900">Keamanan Akses Tim</p>
              <p className="text-slate-650 font-medium mt-0.5 leading-normal">
                Sebagai Owner/Admin, Anda dapat memantau seluruh sesi aktif yang digunakan oleh karyawan/staf Anda.
                Anda dapat mengeluarkan paksa karyawan jika terdeteksi menggunakan perangkat yang salah atau setelah mereka dinonaktifkan dari bisnis.
              </p>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden card-shadow">
            <div className="divide-y divide-slate-100">
              {teamSessions.map((session) => {
                const { os, browser, device } = parseUserAgent(session.user_agent);
                return (
                  <div key={session.session_id} className="p-4 sm:p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:bg-slate-50/50 transition">
                    <div className="flex items-start gap-3.5">
                      <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center shrink-0">
                        {getDeviceIcon(device)}
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center flex-wrap gap-2">
                          <span className="font-bold text-sm text-slate-900">{session.email}</span>
                          <span className={`px-2 py-0.5 rounded font-extrabold text-[9px] uppercase tracking-wider ${
                            session.role === "owner"
                              ? "bg-amber-50 text-amber-700 border border-amber-100"
                              : session.role === "admin"
                                ? "bg-purple-50 text-purple-700 border border-purple-100"
                                : "bg-slate-100 text-slate-600 border border-slate-200"
                          }`}>
                            {session.role}
                          </span>
                          {session.is_current && (
                            <span className="bg-blue-50 text-blue-650 border border-blue-100 px-2 py-0.5 rounded-full font-extrabold text-[9px] uppercase tracking-wider">
                              Perangkat Anda
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-600 font-bold">
                          {browser} di {os}
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-slate-400 font-semibold text-[10.5px]">
                          <span className="flex items-center gap-1"><Globe className="w-3.5 h-3.5" /> IP: {session.ip_address}</span>
                          <span className="text-slate-300">|</span>
                          <span>Terakhir Aktif: {formatDateTime(session.updated_at)}</span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleRevokeSession(session.session_id, session.is_current)}
                      disabled={revokingId !== null}
                      className="bg-rose-50 text-rose-650 hover:bg-rose-100 border border-rose-100 font-extrabold py-2 px-4 rounded-xl flex items-center gap-1 shadow-sm transition active:scale-95 disabled:opacity-50 text-[11px]"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      Kick Sesi
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
