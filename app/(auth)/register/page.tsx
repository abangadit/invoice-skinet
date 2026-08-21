"use client";

import React from "react";
import Link from "next/link";

export default function RegisterPage() {
  return (
    <div className="space-y-6 text-center">

      {/* Icon */}
      <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center mx-auto">
        <svg className="w-7 h-7 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      </div>

      {/* Title */}
      <div className="space-y-2">
        <h2 className="text-xl font-bold text-slate-900">Pendaftaran Hanya Via Undangan</h2>
        <p className="text-xs text-slate-500 leading-relaxed px-2">
          Akun pada aplikasi ini hanya dapat dibuat oleh administrator.
          Silakan hubungi admin Anda untuk mendapatkan akses.
        </p>
      </div>

      {/* Info box */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-left space-y-1">
        <p className="text-xs font-semibold text-blue-700 uppercase tracking-wider">Butuh Akses?</p>
        <p className="text-xs text-blue-600 leading-relaxed">
          Hubungi administrator perusahaan Anda dan minta mereka untuk membuat akun atas nama Anda.
        </p>
      </div>

      {/* Back to login */}
      <Link
        href="/login"
        className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm transition shadow-sm flex items-center justify-center gap-2"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Kembali ke Halaman Masuk
      </Link>

      {/* Terms */}
      <div className="text-center pt-1 text-[10px] text-slate-400">
        <Link href="/terms" className="hover:text-blue-600 hover:underline transition">
          Syarat &amp; Ketentuan
        </Link>
      </div>

    </div>
  );
}
