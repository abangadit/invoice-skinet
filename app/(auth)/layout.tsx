import React from "react";
import Logo from "../../components/Logo";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-center items-center p-4">
      {/* Brand Header */}
      <Logo
        className="flex items-center gap-2.5 mb-6"
        iconClassName="w-9 h-9"
        textClassName="text-2xl font-black text-slate-900 tracking-tight"
      />

      {/* Auth Card Container */}
      <div className="w-full max-w-md bg-white border border-slate-200 p-6 sm:p-8 rounded-2xl shadow-sm">
        {children}
      </div>
    </main>
  );
}

