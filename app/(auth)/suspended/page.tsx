"use client";
import Link from "next/link";

export default function SuspendedPage() {
  return (
    <div className="space-y-6 text-center">
      <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center mx-auto">
        <svg className="w-7 h-7 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
        </svg>
      </div>
      <div className="space-y-2">
        <h2 className="text-xl font-bold text-slate-900">Akun Dinonaktifkan</h2>
        <p className="text-xs text-slate-500 leading-relaxed px-2">
          Akun Anda saat ini dinonaktifkan oleh administrator.
          Hubungi admin untuk mengaktifkan kembali akses Anda.
        </p>
      </div>
      <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-left space-y-1">
        <p className="text-xs font-semibold text-amber-700 uppercase tracking-wider">Perlu Bantuan?</p>
        <p className="text-xs text-amber-600 leading-relaxed">
          Hubungi administrator perusahaan Anda untuk mengaktifkan kembali akun Anda.
        </p>
      </div>
      <Link
        href="/login"
        className="w-full py-3 bg-slate-700 hover:bg-slate-800 text-white font-bold rounded-xl text-sm transition shadow-sm flex items-center justify-center gap-2"
      >
        Kembali ke Halaman Masuk
      </Link>
    </div>
  );
}
