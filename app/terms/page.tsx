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
      intro: "Selamat datang di invoice.co.id. Harap baca Syarat dan Ketentuan ini dengan saksama sebelum menggunakan platform kami.",
      sections: [
        {
          icon: <Info className="w-5 h-5 text-blue-600" />,
          title: "1. Penerimaan Ketentuan",
          text: "Dengan mendaftar, mengakses, atau menggunakan layanan di invoice.co.id, Anda setuju untuk terikat oleh syarat dan ketentuan ini secara penuh. Jika Anda tidak menyetujui bagian apa pun dari dokumen ini, Anda tidak diperkenankan menggunakan layanan kami."
        },
        {
          icon: <Scale className="w-5 h-5 text-blue-600" />,
          title: "2. Pembuatan & Akurasi Invoice",
          text: "Platform ini menyediakan alat untuk membuat, mengelola, dan mengirimkan invoice/faktur. Anda bertanggung jawab penuh atas keakuratan data, nominal transaksi, detail pajak, kepatuhan hukum transaksi, serta pengiriman invoice kepada klien Anda."
        },
        {
          icon: <Shield className="w-5 h-5 text-blue-600" />,
          title: "3. Akun Pengguna & Keamanan",
          text: "Anda wajib menjaga kerahasiaan kata sandi akun Anda dan bertanggung jawab penuh atas semua aktivitas yang terjadi di bawah akun Anda. invoice.co.id tidak bertanggung jawab atas kerugian akibat kelalaian Anda menjaga keamanan akun."
        },
        {
          icon: <Sparkles className="w-5 h-5 text-blue-600" />,
          title: "4. Kebijakan Layanan & Batasan Tanggung Jawab",
          text: "invoice.co.id disediakan 'sebagaimana adanya' (as-is). Kami berhak untuk mengubah, menangguhkan, atau menghentikan aspek apa pun dari platform ini kapan saja. Kami tidak bertanggung jawab atas kerugian bisnis, kesalahan perhitungan pajak manual, atau perselisihan pembayaran antara Anda dan klien Anda."
        }
      ],
      ctaText: "Kembali ke Halaman Masuk",
    },
    en: {
      title: "Terms & Conditions",
      subtitle: "Last updated: June 18, 2026",
      intro: "Welcome to invoice.co.id. Please read these Terms and Conditions carefully before using our platform.",
      sections: [
        {
          icon: <Info className="w-5 h-5 text-blue-600" />,
          title: "1. Acceptance of Terms",
          text: "By registering, accessing, or using the services at invoice.co.id, you agree to be fully bound by these terms and conditions. If you do not agree to any part of this document, you are not authorized to use our services."
        },
        {
          icon: <Scale className="w-5 h-5 text-blue-600" />,
          title: "2. Invoice Creation & Accuracy",
          text: "This platform provides tools to create, manage, and send invoices. You are solely responsible for the accuracy of data, transaction values, tax details, legal compliance of transactions, and invoice delivery to your clients."
        },
        {
          icon: <Shield className="w-5 h-5 text-blue-600" />,
          title: "3. User Account & Security",
          text: "You must maintain the confidentiality of your account password and are fully responsible for all activities that occur under your account. invoice.co.id is not liable for losses resulting from your failure to secure your account."
        },
        {
          icon: <Sparkles className="w-5 h-5 text-blue-600" />,
          title: "4. Service Policies & Limitation of Liability",
          text: "invoice.co.id is provided on an 'as-is' and 'as-available' basis. We reserve the right to modify, suspend, or discontinue any aspect of this platform at any time. We are not liable for business losses, manual tax calculation errors, or payment disputes between you and your clients."
        }
      ],
      ctaText: "Back to Login Page",
    }
  };

  const activeContent = content[locale] || content.id;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans relative overflow-hidden">
      {/* Top Background Blur Orbs */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-blue-400/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-indigo-400/10 blur-[120px] pointer-events-none" />

      {/* Header Bar */}
      <header className="w-full max-w-4xl mx-auto px-6 py-6 flex items-center justify-between z-10 relative">
        <Link href="/login" className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-900 transition bg-white border border-slate-200 px-3.5 py-2 rounded-xl shadow-xs">
          <ArrowLeft className="w-4 h-4" /> {activeContent.ctaText}
        </Link>

        {/* Brand Center */}
        <Logo iconClassName="w-8 h-8" textClassName="text-lg font-bold text-slate-900 tracking-tight" />

        {/* Language Switcher */}
        <button
          onClick={handleLangToggle}
          className="flex items-center gap-1.5 text-xs font-bold text-slate-650 hover:text-blue-600 bg-white border border-slate-200 px-3.5 py-2 rounded-xl shadow-xs transition"
        >
          <Globe className="w-4 h-4" />
          <span className="uppercase">{locale}</span>
        </button>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-3xl mx-auto px-6 py-8 md:py-12 z-10">
        <div className="bg-white border border-slate-200 rounded-3xl p-6 md:p-10 shadow-xl space-y-8 relative overflow-hidden">
          {/* Header Info */}
          <div className="space-y-3 border-b border-slate-100 pb-6 text-center">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-600 border border-blue-100/50">
              <Shield className="w-3.5 h-3.5" /> Legal Document
            </span>
            <h1 className="text-3xl font-black tracking-tight text-slate-900 md:text-4xl">{activeContent.title}</h1>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{activeContent.subtitle}</p>
          </div>

          <p className="text-sm text-slate-600 leading-relaxed text-center font-medium bg-slate-50 p-4 rounded-2xl border border-slate-100">
            {activeContent.intro}
          </p>

          {/* Sections List */}
          <div className="space-y-6">
            {activeContent.sections.map((section, idx) => (
              <div key={idx} className="flex gap-4 items-start p-4 hover:bg-slate-50/50 rounded-2xl border border-transparent hover:border-slate-100 transition">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0 border border-blue-100/50">
                  {section.icon}
                </div>
                <div className="space-y-1">
                  <h3 className="font-extrabold text-slate-900 text-sm leading-tight">{section.title}</h3>
                  <p className="text-xs text-slate-500 leading-relaxed font-medium">{section.text}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Footer inside Card */}
          <div className="border-t border-slate-100 pt-6 text-center text-[10px] text-slate-400 font-semibold tracking-wide uppercase">
            &copy; {new Date().getFullYear()} invoice.co.id &bull; Business in our hands
          </div>
        </div>
      </main>

      {/* Footer copyright */}
      <footer className="py-6 text-center text-xs text-slate-400">
        invoice.co.id is a product of our premium billing system.
      </footer>
    </div>
  );
}
