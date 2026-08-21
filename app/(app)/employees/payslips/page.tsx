"use client";

import React, { useEffect, useState } from "react";
import {
  Wallet,
  FileText,
  Printer,
  X,
  Clock,
  AlertCircle,
  TrendingUp,
  Download
} from "lucide-react";
import { useBusiness } from "../../../../lib/context/BusinessContext";
import { useLanguage } from "../../../../lib/context/LanguageContext";
import { createWebBrowserClient } from "../../../../lib/supabase/client";

interface Employee {
  id: string;
  name: string;
  email: string | null;
  user_id: string | null;
}

interface Payslip {
  id: string;
  period_month: number;
  period_year: number;
  basic_salary: number;
  allowances: number;
  bonus: number;
  deductions: number;
  gross_salary: number;
  pph21_tax: number;
  net_salary: number;
  status: string;
  created_at: string;
  employee: {
    name: string;
    nik: string;
    ptkp_status: string;
    npwp: string | null;
  };
}

export default function EmployeePayslipsPage() {
  const { activeBusiness } = useBusiness();
  const { locale } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [currentEmployee, setCurrentEmployee] = useState<Employee | null>(null);
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [activePayslip, setActivePayslip] = useState<Payslip | null>(null);
  const [showSlipModal, setShowSlipModal] = useState(false);

  const months = [
    { value: 1, label: "Januari" },
    { value: 2, label: "Februari" },
    { value: 3, label: "Maret" },
    { value: 4, label: "April" },
    { value: 5, label: "Mei" },
    { value: 6, label: "Juni" },
    { value: 7, label: "Juli" },
    { value: 8, label: "Agustus" },
    { value: 9, label: "September" },
    { value: 10, label: "Oktober" },
    { value: 11, label: "November" },
    { value: 12, label: "Desember" }
  ];

  const initializePayslips = async () => {
    if (!activeBusiness) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const supabase = createWebBrowserClient();
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError || !user) {
        setLoading(false);
        return;
      }

      // Check employee record
      let emp: Employee | null = null;
      
      // Query by user_id
      const { data: empByUid } = await supabase
        .from("employees")
        .select("id, name, email, user_id")
        .eq("business_id", activeBusiness.id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (empByUid) {
        emp = empByUid as any;
      } else if (user.email) {
        // Fallback: search by email
        const { data: empByEmail } = await supabase
          .from("employees")
          .select("id, name, email, user_id")
          .eq("business_id", activeBusiness.id)
          .eq("email", user.email)
          .maybeSingle();
        emp = empByEmail as any;
      }

      setCurrentEmployee(emp);

      if (emp) {
        // Load payslips for this employee
        const { data: slipData, error: slipError } = await supabase
          .from("payslips")
          .select(`
            *,
            employee:employees (
              name,
              nik,
              ptkp_status,
              npwp
            )
          `)
          .eq("employee_id", emp.id)
          .order("period_year", { ascending: false })
          .order("period_month", { ascending: false });

        if (slipError) throw slipError;
        setPayslips((slipData || []) as any[]);
      }

    } catch (e) {
      console.error("Error loading employee payslips:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    initializePayslips();
  }, [activeBusiness]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0
    }).format(val);
  };

  const getMonthLabel = (m: number) => {
    return months.find(item => item.value === m)?.label || m;
  };

  return (
    <div className="space-y-6 text-xs font-semibold">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          Slip Gaji Saya
        </h2>
        <p className="text-sm text-slate-500 mt-0.5">Lihat rincian dan download slip gaji bulanan Anda yang telah diproses.</p>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs text-slate-500 font-semibold mt-2">Memuat slip gaji Anda...</p>
        </div>
      ) : !currentEmployee ? (
        <div className="bg-rose-50 border border-rose-100 text-rose-700 p-5 rounded-2xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-slate-900">Profil Karyawan Belum Terhubung</h4>
            <p className="text-slate-500 mt-1 font-medium leading-normal">
              Akun pengguna Anda saat ini belum terhubung dengan data karyawan mana pun di bisnis ini. 
              Silakan hubungi Admin atau HRD untuk mengaitkan email Anda dengan profil karyawan Anda.
            </p>
          </div>
        </div>
      ) : payslips.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* List Card */}
          <div className="md:col-span-2 space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Daftar Slip Gaji</h3>
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden card-shadow">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                      <th className="py-3.5 px-4">Periode</th>
                      <th className="py-3.5 px-4 text-right">Penghasilan Kotor</th>
                      <th className="py-3.5 px-4 text-right text-rose-500">Pajak (PPh 21)</th>
                      <th className="py-3.5 px-4 text-right text-blue-600">Take Home Pay</th>
                      <th className="py-3.5 px-4 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {payslips.map((slip) => (
                      <tr key={slip.id} className="hover:bg-slate-50 transition">
                        <td className="py-4 px-4 font-bold text-slate-900">
                          {getMonthLabel(slip.period_month)} {slip.period_year}
                        </td>
                        <td className="py-4 px-4 text-right font-medium">
                          {formatCurrency(slip.gross_salary)}
                        </td>
                        <td className="py-4 px-4 text-right font-medium text-rose-600">
                          -{formatCurrency(slip.pph21_tax)}
                        </td>
                        <td className="py-4 px-4 text-right font-extrabold text-blue-600">
                          {formatCurrency(slip.net_salary)}
                        </td>
                        <td className="py-4 px-4 text-center">
                          <button
                            onClick={() => {
                              setActivePayslip(slip);
                              setShowSlipModal(true);
                            }}
                            className="bg-blue-50 hover:bg-blue-100 text-blue-600 px-3 py-1.5 rounded-lg transition font-bold"
                          >
                            Lihat Detail
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Quick Summary Card */}
          <div className="md:col-span-1 space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Ringkasan Terkini</h3>
            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-2xl p-5 shadow-lg space-y-4">
              <div className="flex items-center justify-between">
                <Wallet className="w-8 h-8 opacity-80" />
                <span className="bg-white/20 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Gaji Terakhir
                </span>
              </div>
              <div>
                <p className="text-[10px] text-blue-100 uppercase tracking-widest font-extrabold">Take Home Pay</p>
                <h3 className="text-2xl font-black mt-1">
                  {formatCurrency(payslips[0].net_salary)}
                </h3>
                <p className="text-[10px] text-blue-100 font-bold mt-1">
                  Periode {getMonthLabel(payslips[0].period_month)} {payslips[0].period_year}
                </p>
              </div>
              <div className="border-t border-white/20 pt-4 flex justify-between items-center text-[10px] text-blue-100">
                <span>Pajak Terbayar:</span>
                <span className="font-bold">{formatCurrency(payslips[0].pph21_tax)}</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl py-12 px-4 flex flex-col items-center justify-center text-center shadow-sm">
          <Wallet className="w-12 h-12 text-slate-350 mb-3" />
          <div className="text-slate-900 font-bold text-sm">Belum Ada Slip Gaji</div>
          <div className="text-slate-500 text-xs mt-1">Gaji Anda untuk periode saat ini belum selesai diproses oleh HR/Admin.</div>
        </div>
      )}

      {/* Slip Gaji Modal */}
      {showSlipModal && activePayslip && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[95vh] text-xs font-semibold">
            
            {/* Modal Header */}
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between print:hidden">
              <span className="font-bold text-slate-800">Cetak Slip Gaji</span>
              <div className="flex gap-2">
                <button
                  onClick={() => window.print()}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold px-3 py-1.5 rounded-lg flex items-center gap-1 shadow-sm transition"
                >
                  <Printer className="w-4 h-4" /> Cetak Slip
                </button>
                <button onClick={() => setShowSlipModal(false)} className="text-slate-400 hover:text-slate-600 transition p-1">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Slip Body */}
            <div className="p-8 flex-1 overflow-y-auto space-y-6 text-slate-800 print:p-0">
              
              {/* Slip Header */}
              <div className="text-center pb-4 border-b border-dashed border-slate-300">
                <h2 className="text-base font-extrabold text-slate-950 uppercase">{activeBusiness?.name || "invoice.co.id"}</h2>
                {activeBusiness?.address && <p className="text-slate-500 text-[10px] font-medium max-w-xs mx-auto mt-1 leading-normal">{activeBusiness.address}</p>}
                <h3 className="text-sm font-extrabold text-blue-650 mt-3 tracking-wide uppercase">SLIP GAJI KARYAWAN</h3>
                <p className="text-slate-400 text-[10px] font-bold mt-0.5">Periode: {getMonthLabel(activePayslip.period_month)} {activePayslip.period_year}</p>
              </div>

              {/* Employee Bio */}
              <div className="grid grid-cols-2 gap-4 text-[10.5px]">
                <div className="space-y-1">
                  <div className="flex"><span className="text-slate-400 w-20">Nama:</span> <span className="font-bold text-slate-900">{activePayslip.employee?.name}</span></div>
                  <div className="flex"><span className="text-slate-400 w-20">NIK:</span> <span className="font-mono text-slate-800">{activePayslip.employee?.nik}</span></div>
                </div>
                <div className="space-y-1">
                  <div className="flex"><span className="text-slate-400 w-20">Status PTKP:</span> <span className="font-bold text-slate-800">{activePayslip.employee?.ptkp_status}</span></div>
                  <div className="flex"><span className="text-slate-400 w-20">NPWP:</span> <span className="font-mono text-slate-800">{activePayslip.employee?.npwp || "-"}</span></div>
                </div>
              </div>

              {/* Details Breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
                
                {/* Earnings */}
                <div className="space-y-2">
                  <h4 className="font-bold text-slate-950 border-b border-slate-200 pb-1 text-[10px] uppercase tracking-wider text-emerald-600">Penghasilan (Penerimaan)</h4>
                  <div className="space-y-1 text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-medium">Gaji Pokok:</span>
                      <span className="font-bold text-slate-800">{formatCurrency(activePayslip.basic_salary)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-medium">Tunjangan & Lembur:</span>
                      <span className="font-bold text-slate-800">+{formatCurrency(activePayslip.allowances)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-medium">Bonus:</span>
                      <span className="font-bold text-slate-800">+{formatCurrency(activePayslip.bonus || 0)}</span>
                    </div>
                  </div>
                </div>

                {/* Deductions */}
                <div className="space-y-2">
                  <h4 className="font-bold text-slate-950 border-b border-slate-200 pb-1 text-[10px] uppercase tracking-wider text-rose-600">Potongan (Deductions)</h4>
                  <div className="space-y-1 text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-medium">Potongan Gaji:</span>
                      <span className="font-bold text-slate-800">-{formatCurrency(activePayslip.deductions)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-rose-500 font-bold">PPh 21 TER Pajak:</span>
                      <span className="font-extrabold text-rose-600">-{formatCurrency(activePayslip.pph21_tax)}</span>
                    </div>
                  </div>
                </div>

              </div>

              {/* Totals Summary */}
              <div className="border-t border-slate-200 pt-4 bg-slate-50 p-4 rounded-xl flex justify-between items-center border border-slate-100">
                <div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Total Gaji Bersih (THP)</span>
                  <p className="text-xs text-slate-450 font-medium mt-0.5">Sudah dipotong PPh 21 TER Pajak</p>
                </div>
                <span className="text-lg font-extrabold text-blue-650">{formatCurrency(activePayslip.net_salary)}</span>
              </div>

              {/* Signatures */}
              <div className="pt-10 flex justify-between text-center text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                <div>
                  <p>Diterima Oleh,</p>
                  <div className="h-14"></div>
                  <p className="border-t border-slate-350 pt-1 mx-2 font-semibold text-slate-700">{activePayslip.employee?.name}</p>
                </div>
                <div>
                  <p>Disetujui Oleh,</p>
                  <div className="h-14"></div>
                  <p className="border-t border-slate-350 pt-1 mx-2 font-semibold text-slate-700">{activeBusiness?.name || "Manajemen"}</p>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}
