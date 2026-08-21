"use client";

import React, { useState } from "react";
import Link from "next/link";
import { createWebBrowserClient } from "../../../lib/supabase/client";
import { AlertCircle, Clock, CheckCircle2 } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleResetRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const supabase = createWebBrowserClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      setErrorMsg(error.message || "Gagal mengirim email pemulihan sandi.");
      setLoading(false);
    } else {
      setSuccessMsg(
        "Email Pemulihan Dikirim! Silakan periksa kotak masuk email Anda untuk mengatur ulang kata sandi Anda."
      );
      setLoading(false);
    }
  };

  if (successMsg) {
    return (
      <div className="space-y-6 text-center">
        <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-100">
          <CheckCircle2 className="w-6 h-6" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-slate-900">Periksa Email Anda</h2>
          <p className="text-xs text-slate-500 leading-relaxed px-2">
            {successMsg}
          </p>
        </div>
        <div className="pt-4 border-t border-slate-100">
          <Link href="/login" className="text-sm font-bold text-blue-600 hover:text-blue-700">
            Kembali ke Halaman Masuk
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Title */}
      <div className="text-center space-y-1.5">
        <h2 className="text-xl font-bold text-slate-900">Lupa Kata Sandi</h2>
        <p className="text-xs text-slate-500">Masukkan email Anda untuk menerima tautan pemulihan sandi.</p>
      </div>

      {/* Error Alert */}
      {errorMsg && (
        <div className="bg-rose-50 border border-rose-100 rounded-xl p-3 flex items-start gap-2 text-rose-600 text-xs font-semibold">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleResetRequest} className="space-y-4">
        
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

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm transition shadow-sm flex items-center justify-center gap-1.5"
        >
          {loading ? (
            <>
              <Clock className="w-4 h-4 animate-spin" /> Mengirim...
            </>
          ) : (
            "Kirim Link Pemulihan"
          )}
        </button>

      </form>

      {/* Back to Login Link */}
      <div className="text-center pt-2 border-t border-slate-100 text-xs text-slate-500">
        Sudah ingat sandi Anda?{" "}
        <Link href="/login" className="font-bold text-blue-600 hover:text-blue-700">
          Masuk Sekarang
        </Link>
      </div>

    </div>
  );
}
