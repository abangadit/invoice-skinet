"use client";

import React from "react";
import Link from "next/link";
import { useLanguage } from "../../lib/context/LanguageContext";
import Logo from "../../components/Logo";
import { FileText, Shield, Sparkles, Scale, Info, ArrowLeft, Globe } from "lucide-react";

export default function TermsPage() {
  const { locale, setLocale, t } = useLanguage();

  const handleLangToggle = () => {
    setLocale(locale === "id" ? "en" : "id");
  };

  const content = {
    id: {
      title: "Syarat & Ketentuan",
      subtitle: "Terakhir diperbarui: 18 Juni 2026",
      intro: "Selamat datang di MyBiz. Harap baca Syarat dan Ketentuan ini dengan saksama sebelum menggunakan platform kami.",
      sections: [
        {
          icon: <Info className="w-5 h-5 text-blue-600" />,
          title: "1. Penerimaan Ketentuan",
          text: "Dengan mendaftar, mengakses, atau menggunakan layanan di platform ini, Anda setuju untuk terikat oleh syarat dan ketentuan ini secara penuh. Jika Anda tidak menyetujui bagian apa pun dari dokumen ini, Anda tidak diperkenankan menggunakan layanan kami."
        },
        {
          icon: <Scale className="w-5 h-5 text-blue-600" />,
          title: "2. Pembuatan & Akurasi Transaksi",
          text: "Platform ini menyediakan alat untuk membuat, mengelola, dan mengirimkan invoice/faktur, surat jalan, dan pencatatan kasir POS. Anda bertanggung jawab penuh atas keakuratan data, nominal transaksi, detail pajak, kepatuhan hukum transaksi, serta pengiriman invoice kepada klien Anda."
        },
        {
          icon: <Shield className="w-5 h-5 text-blue-600" />,
          title: "3. Akun Pengguna & Keamanan",
          text: "Anda wajib menjaga kerahasiaan kata sandi akun Anda dan bertanggung jawab penuh atas semua aktivitas yang terjadi di bawah akun Anda. Pengelola platform tidak bertanggung jawab atas kerugian akibat kelalaian Anda menjaga keamanan akun."
        },
        {
          icon: <Sparkles className="w-5 h-5 text-blue-600" />,
          title: "4. Kebijakan Layanan & Batasan Tanggung Jawab",
          text: "Platform ini disediakan 'sebagaimana adanya' (as-is). Kami berhak untuk mengubah, menangguhkan, atau menghentikan aspek apa pun dari platform ini kapan saja. Kami tidak bertanggung jawab atas kerugian bisnis, kesalahan perhitungan pajak manual, atau perselisihan pembayaran antara Anda dan klien Anda."
        }
      ],
      ctaText: "Kembali ke Halaman Masuk",
    },
    en: {
      title: "Terms & Conditions",
      subtitle: "Last updated: June 18, 2026",
      intro: "Welcome to MyBiz. Please read these Terms and Conditions carefully before using our platform.",
      sections: [
        {
          icon: <Info className="w-5 h-5 text-blue-600" />,
          title: "1. Acceptance of Terms",
          text: "By registering, accessing, or using the services on this platform, you agree to be fully bound by these terms and conditions. If you do not agree to any part of this document, you are not authorized to use our services."
        },
        {
          icon: <Scale className="w-5 h-5 text-blue-600" />,
          title: "2. Invoice Creation & Accuracy",
          text: "This platform provides tools to create, manage, and send invoices, delivery orders, and POS transactions. You are solely responsible for the accuracy of data, transaction values, tax details, legal compliance of transactions, and invoice delivery to your clients."
        },
        {
          icon: <Shield className="w-5 h-5 text-blue-600" />,
          title: "3. User Account & Security",
          text: "You must maintain the confidentiality of your account password and are fully responsible for all activities that occur under your account. The platform administrator is not liable for losses resulting from your failure to secure your account."
        },
        {
          icon: <Sparkles className="w-5 h-5 text-blue-600" />,
          title: "4. Service Policies & Limitation of Liability",
          text: "The platform is provided on an 'as-is' and 'as-available' basis. We reserve the right to modify, suspend, or discontinue any aspect of this platform at any time. We are not liable for business losses, manual tax calculation errors, or payment disputes between you and your clients."
        }
      ],
      ctaText: "Back to Login Page",
    }
  };

  const activeContent = content[locale] || content.id;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between p-4 md:p-8 font-sans">
      {/* Header bar */}
      <header className="max-w-3xl mx-auto w-full flex items-center justify-between pb-6">
        <Link 
          href="/login" 
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-800 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{locale === "en" ? "Back" : "Kembali"}</span>
        </Link>
        <span className="text-xs font-bold text-slate-400">MyBiz Platform</span>
      </header>

      {/* Main Document Content */}
      <main className="max-w-3xl mx-auto w-full">
        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 md:p-10 shadow-sm space-y-8">
          
          {/* Title Area */}
          <div className="space-y-2 border-b border-slate-150 pb-6">
            <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
              {activeContent.title}
            </h1>
            <p className="text-xs text-slate-400 font-semibold">
              {activeContent.subtitle}
            </p>
            <p className="text-xs md:text-sm text-slate-600 leading-relaxed pt-2">
              {activeContent.intro}
            </p>
          </div>

          {/* Clauses List */}
          <div className="space-y-6">
            {activeContent.sections.map((sec, idx) => (
              <div key={idx} className="flex gap-4 items-start">
                <div className="p-2.5 bg-blue-50 rounded-2xl shrink-0 mt-0.5 border border-blue-100/50">
                  {sec.icon}
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-slate-900">
                    {sec.title}
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed font-medium">
                    {sec.text}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Footer inside Card */}
          <div className="border-t border-slate-100 pt-6 text-center text-[10px] text-slate-400 font-semibold tracking-wide uppercase">
            &copy; {new Date().getFullYear()} MyBiz Platform &bull; Business in our hands
          </div>
        </div>
      </main>

      {/* Footer copyright */}
      <footer className="py-6 text-center text-xs text-slate-400">
        MyBiz is a product of our premium management system.
      </footer>
    </div>
  );
}
