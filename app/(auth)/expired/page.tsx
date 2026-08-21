"use client";
import Link from "next/link";

export default function ExpiredPage() {
  return (
    <div className="space-y-6 text-center">
      <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center mx-auto">
        <svg className="w-7 h-7 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <div className="space-y-2">
        <h2 className="text-xl font-bold text-slate-900">Masa Aktif Akun Habis</h2>
        <p className="text-xs text-slate-500 leading-relaxed px-2">
          Masa aktif akun Anda telah berakhir. Silakan hubungi administrator
          untuk memperpanjang akses Anda.
        </p>
      </div>
      <div className="bg-rose-50 border border-rose-100 rounded-xl p-4 text-left space-y-1">
        <p className="text-xs font-semibold text-rose-700 uppercase tracking-wider">Perlu Bantuan?</p>
        <p className="text-xs text-rose-600 leading-relaxed">
          Hubungi administrator perusahaan Anda dan minta perpanjangan masa aktif akun.
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
