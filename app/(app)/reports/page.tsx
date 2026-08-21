"use client";

import React from "react";
import Link from "next/link";
import { 
  FileText, 
  TrendingUp, 
  Package, 
  Clock, 
  ArrowRight,
  TrendingDown,
  ChevronRight
} from "lucide-react";
import { useBusiness } from "../../../lib/context/BusinessContext";

export default function ReportsHubPage() {
  const { activeBusiness, userRole, userPermissions, loading } = useBusiness();

  // Helper check consistent with layout role presets
  const showLink = (menuKey: string) => {
    if (loading || !userRole) return false;
    if (userRole === "owner" || userRole === "admin") return true;
    if (userRole === "employee") return false;
    if (userRole === "custom") return !!userPermissions?.[menuKey];
    
    const rolePresets: Record<string, string[]> = {
      sales: ["reports_sales"],
      purchasing: ["reports_inventory"],
      warehouse: ["reports_inventory"],
      finance: ["reports_sales", "reports_financial"]
    };
    
    return (rolePresets[userRole] || []).includes(menuKey);
  };

  const reportsList = [
    {
      key: "reports_sales",
      href: "/reports/invoice",
      title: "Laporan Invoice",
      description: "Rekapitulasi tagihan faktur penjualan terperinci, status pembayaran lunas/terlambat, dan sisa piutang.",
      icon: <FileText className="w-8 h-8 text-blue-650" />,
      bgIcon: "bg-blue-50 border-blue-100",
      accent: "border-t-blue-500"
    },
    {
      key: "reports_sales",
      href: "/reports/sales",
      title: "Laporan Penjualan & Piutang",
      description: "Analisis total penjualan kotor, HPP, estimasi laba kotor, dan rasio koleksi pembayaran.",
      icon: <TrendingUp className="w-8 h-8 text-indigo-650" />,
      bgIcon: "bg-indigo-50 border-indigo-100",
      accent: "border-t-indigo-500"
    },
    {
      key: "reports_financial",
      href: "/reports/financial",
      title: "Laporan Keuangan Resmi",
      description: "Laporan Laba Rugi resmi (pendapatan, HPP, beban operasional) dan Neraca Keuangan Buku Besar.",
      icon: <TrendingUp className="w-8 h-8 text-emerald-650" />,
      bgIcon: "bg-emerald-50 border-emerald-100",
      accent: "border-t-emerald-500"
    },
    {
      key: "reports_inventory",
      href: "/reports/inventory",
      title: "Laporan Stok & Penilaian Gudang",
      description: "Analisis sisa kuantitas stok barang fisik, peringatan stok menipis/habis, dan kalkulasi nilai aset HPP.",
      icon: <Package className="w-8 h-8 text-amber-650" />,
      bgIcon: "bg-amber-50 border-amber-100",
      accent: "border-t-amber-500"
    },
    {
      key: "reports_inventory",
      href: "/reports/stock-out",
      title: "Laporan Barang Keluar (Stock Out)",
      description: "Rekapitulasi pengeluaran barang non-invoice (rusak, sample, pemakaian internal) beserta evaluasi beban HPP.",
      icon: <TrendingDown className="w-8 h-8 text-rose-600" />,
      bgIcon: "bg-rose-50 border-rose-100",
      accent: "border-t-rose-500"
    },
    {
      key: "reports_attendance",
      href: "/reports/attendance",
      title: "Laporan Kehadiran Karyawan",
      description: "Rangkuman absensi bulanan, status kehadiran tepat waktu, terlambat, sakit/cuti, dan mangkir.",
      icon: <Clock className="w-8 h-8 text-indigo-650" />,
      bgIcon: "bg-indigo-50 border-indigo-100",
      accent: "border-t-indigo-500"
    },
    {
      key: "reports_sales",
      href: "/reports/pos",
      title: "Laporan POS & Shift Kasir",
      description: "Analisis pendapatan kas masuk/keluar dari buka-tutup shift kasir dan perbandingan kas riil.",
      icon: <FileText className="w-8 h-8 text-rose-655" />,
      bgIcon: "bg-rose-50 border-rose-100",
      accent: "border-t-rose-500"
    }
  ];

  const visibleReports = reportsList.filter(rep => showLink(rep.key));

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs text-slate-500 font-semibold mt-2">Memuat pusat laporan...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-slate-800">
      
      {/* Header */}
      <div className="border-b border-slate-200 pb-4">
        <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          Pusat Laporan Bisnis
        </h2>
        <p className="text-sm text-slate-500 mt-0.5">
          {activeBusiness?.name || "Bisnis Saya"} &bull; Pilih jenis laporan terintegrasi yang ingin Anda analisis.
        </p>
      </div>

      {visibleReports.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {visibleReports.map((rep) => (
            <Link 
              key={rep.key}
              href={rep.href}
              className={`block bg-white border border-slate-200 hover:border-blue-300 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-300 transform hover:-translate-y-1 relative overflow-hidden group border-t-4 ${rep.accent}`}
            >
              <div className="flex items-start gap-4">
                <div className={`w-14 h-14 rounded-xl flex items-center justify-center border shrink-0 ${rep.bgIcon}`}>
                  {rep.icon}
                </div>
                <div className="space-y-1.5 flex-1 min-w-0 pr-6">
                  <h3 className="font-extrabold text-slate-900 text-sm group-hover:text-blue-600 transition truncate">
                    {rep.title}
                  </h3>
                  <p className="text-xs text-slate-550 leading-relaxed font-semibold">
                    {rep.description}
                  </p>
                </div>
                <div className="absolute right-5 bottom-5 text-slate-300 group-hover:text-blue-500 transition transform group-hover:translate-x-1">
                  <ChevronRight className="w-5 h-5" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-400">
          <TrendingDown className="w-12 h-12 mx-auto text-slate-200 mb-3" />
          <h3 className="font-bold text-slate-900 text-sm">Akses Laporan Dibatasi</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto leading-relaxed font-semibold">
            Divisi peran Anda saat ini tidak memiliki izin untuk melihat laporan operasional maupun finansial bisnis ini.
          </p>
        </div>
      )}

    </div>
  );
}
