"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { createWebBrowserClient } from "../../../lib/supabase/client";
import { AlertCircle, Clock, CheckCircle2 } from "lucide-react";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [supabase] = useState(() => createWebBrowserClient());
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Auto-exchange code if PKCE redirects here directly
  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");
      if (code) {
        setLoading(true);
        supabase.auth.exchangeCodeForSession(code)
          .then(({ error }) => {
            if (error) {
              console.error("Error exchanging recovery code:", error);
              setErrorMsg("Token atur ulang sandi kedaluwarsa atau tidak valid. Silakan ajukan lupa sandi kembali.");
            }
          })
          .catch((err) => {
            console.error("Exception in code exchange:", err);
            setErrorMsg("Gagal memproses token atur ulang sandi.");
          })
          .finally(() => {
            setLoading(false);
          });
      }
    }
  }, [supabase]);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setErrorMsg("Kata sandi baru dan konfirmasi kata sandi tidak cocok.");
      return;
    }
    if (password.length < 6) {
      setErrorMsg("Kata sandi harus minimal 6 karakter.");
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setErrorMsg(error.message || "Gagal memperbarui kata sandi.");
      setLoading(false);
    } else {
      setSuccessMsg("Kata sandi Anda berhasil diperbarui!");
      setLoading(false);
      setTimeout(() => {
        router.refresh();
        router.push("/");
      }, 2000);
    }
  };

  if (successMsg) {
    return (
      <div className="space-y-6 text-center">
        <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-100">
          <CheckCircle2 className="w-6 h-6" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-slate-900">Sandi Diperbarui</h2>
          <p className="text-xs text-slate-500 leading-relaxed px-2">
            {successMsg} Anda akan dialihkan ke halaman utama dalam beberapa detik...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Title */}
      <div className="text-center space-y-1.5">
        <h2 className="text-xl font-bold text-slate-900">Atur Ulang Sandi</h2>
        <p className="text-xs text-slate-500">Masukkan kata sandi baru Anda di bawah ini.</p>
      </div>

      {/* Error Alert */}
      {errorMsg && (
        <div className="bg-rose-50 border border-rose-100 rounded-xl p-3 flex items-start gap-2 text-rose-600 text-xs font-semibold">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleResetPassword} className="space-y-4">
        
        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Kata Sandi Baru</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Minimal 6 karakter"
            className="w-full border border-slate-200 px-4 py-2.5 rounded-xl text-sm placeholder-slate-400 focus:outline-none focus:border-blue-500 transition"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Konfirmasi Sandi Baru</label>
          <input
            type="password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Ketik ulang kata sandi baru"
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
              <Clock className="w-4 h-4 animate-spin" /> Memperbarui...
            </>
          ) : (
            "Perbarui Kata Sandi"
          )}
        </button>

      </form>

    </div>
  );
}
