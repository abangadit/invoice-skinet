"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createWebBrowserClient } from "../../../lib/supabase/client";
import { AlertCircle, Clock } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    const supabase = createWebBrowserClient();
    
    const { data: authData, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setErrorMsg(error.message || "Gagal masuk. Silakan periksa email dan kata sandi Anda.");
      setLoading(false);
    } else {
      let role = "user";
      if (authData.user) {
        const { data: profile } = await supabase
          .from("users")
          .select("role")
          .eq("id", authData.user.id)
          .single();
        if (profile?.role) {
          role = profile.role;
        }
      }

      // Force a router refresh to update middleware state, then redirect
      router.refresh();
      if (role === "superadmin") {
        router.push("/admin/dashboard");
      } else {
        router.push("/");
      }
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Title */}
      <div className="text-center space-y-1.5">
        <h2 className="text-xl font-bold text-slate-900">Selamat Datang Kembali</h2>
        <p className="text-xs text-slate-500">Masuk dengan akun yang diberikan oleh administrator Anda.</p>
      </div>

      {/* Error Alert */}
      {errorMsg && (
        <div className="bg-rose-50 border border-rose-100 rounded-xl p-3 flex items-start gap-2 text-rose-600 text-xs font-semibold">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleLogin} className="space-y-4">
        
        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Alamat Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="nama@perusahaan.com"
            className="w-full border border-slate-200 px-4 py-2.5 rounded-xl text-sm placeholder-slate-400 focus:outline-none focus:border-blue-500 transition"
          />
        </div>

        <div className="space-y-1">
          <div className="flex justify-between items-center">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Kata Sandi</label>
            <Link href="/forgot-password" className="text-[10px] font-bold text-blue-600 hover:text-blue-700">Lupa Sandi?</Link>
          </div>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full border border-slate-200 px-4 py-2.5 rounded-xl text-sm placeholder-slate-400 focus:outline-none focus:border-blue-500 transition"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm transition shadow-sm flex items-center justify-center gap-1.5"
        >
          {loading ? (
            <>
              <Clock className="w-4 h-4 animate-spin" /> Masuk...
            </>
          ) : (
            "Masuk ke Akun"
          )}
        </button>

      </form>

      {/* Terms and conditions link */}
      <div className="text-center pt-2 text-[10px] text-slate-400">
        <Link href="/terms" className="hover:text-blue-600 hover:underline transition">
          Syarat & Ketentuan
        </Link>
      </div>

    </div>
  );
}
