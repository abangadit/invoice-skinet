"use client";

import React from "react";
import Link from "next/link";
import { ShieldAlert, ArrowLeft } from "lucide-react";

export default function UnauthorizedPage() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center font-sans p-6">
      <div className="max-w-md w-full text-center space-y-6 bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
        <div className="w-16 h-16 rounded-full bg-rose-50 border border-rose-100 flex items-center justify-center mx-auto text-rose-600">
          <ShieldAlert className="w-8 h-8" />
        </div>
        
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-slate-900">Akses Ditolak</h2>
          <p className="text-sm text-slate-500 leading-relaxed">
            Peran akun Anda tidak memiliki hak akses untuk membuka halaman ini. 
            Silakan hubungi pemilik bisnis atau administrator jika Anda membutuhkan akses ke divisi ini.
          </p>
        </div>

        <div className="pt-2">
          <Link
            href="/"
            className="inline-flex items-center gap-2 justify-center py-2.5 px-5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition shadow-sm text-xs"
          >
            <ArrowLeft className="w-4 h-4" /> Kembali ke Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
