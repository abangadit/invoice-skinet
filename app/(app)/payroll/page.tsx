"use client";

import React, { useEffect, useState } from "react";
import {
  CreditCard,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Download,
  Search,
  Printer,
  ChevronRight,
  FileText,
  DollarSign,
  User,
  Plus,
  ArrowLeft,
  X,
  RotateCcw
} from "lucide-react";
import { useBusiness } from "../../../lib/context/BusinessContext";
import { createWebBrowserClient } from "../../../lib/supabase/client";

// TER Categories Lookup
function getTerCategory(ptkp: string): "A" | "B" | "C" {
  if (["TK/0", "TK/1", "K/0"].includes(ptkp)) return "A";
  if (["TK/2", "TK/3", "K/1", "K/2"].includes(ptkp)) return "B";
  return "C";
}

function getTerRate(category: "A" | "B" | "C", gross: number): number {
  if (category === "A") {
    if (gross <= 5400000) return 0.00;
    if (gross <= 5650000) return 0.0025;
    if (gross <= 6200000) return 0.005;
    if (gross <= 6950000) return 0.0075;
    if (gross <= 8100000) return 0.01;
    if (gross <= 9150000) return 0.0125;
    if (gross <= 10200000) return 0.015;
    if (gross <= 11200000) return 0.0175;
    if (gross <= 12300000) return 0.02;
    if (gross <= 13350000) return 0.0225;
    if (gross <= 14400000) return 0.025;
    if (gross <= 15400000) return 0.03;
    if (gross <= 16800000) return 0.04;
    if (gross <= 18300000) return 0.05;
    if (gross <= 21850000) return 0.06;
    if (gross <= 25500000) return 0.07;
    if (gross <= 33200000) return 0.08;
    if (gross <= 42900000) return 0.09;
    if (gross <= 54100000) return 0.10;
    if (gross <= 66200000) return 0.11;
    if (gross <= 79200000) return 0.12;
    if (gross <= 93200000) return 0.13;
    if (gross <= 109200000) return 0.14;
    if (gross <= 127100000) return 0.15;
    return 0.16; // simplify upper limits for practicality
  } else if (category === "B") {
    if (gross <= 6200000) return 0.00;
    if (gross <= 6500000) return 0.0025;
    if (gross <= 7050000) return 0.005;
    if (gross <= 7850000) return 0.0075;
    if (gross <= 9100000) return 0.01;
    if (gross <= 10150000) return 0.0125;
    if (gross <= 11250000) return 0.015;
    if (gross <= 12400000) return 0.0175;
    if (gross <= 13600000) return 0.02;
    if (gross <= 14800000) return 0.0225;
    if (gross <= 16100000) return 0.025;
    if (gross <= 17400000) return 0.03;
    if (gross <= 19000000) return 0.04;
    if (gross <= 20850000) return 0.05;
    if (gross <= 23200000) return 0.06;
    if (gross <= 25500000) return 0.07;
    if (gross <= 28100000) return 0.08;
    if (gross <= 31100000) return 0.09;
    if (gross <= 34700000) return 0.10;
    if (gross <= 38900000) return 0.11;
    if (gross <= 43900000) return 0.12;
    if (gross <= 49800000) return 0.13;
    if (gross <= 56800000) return 0.14;
    if (gross <= 65300000) return 0.15;
    return 0.16;
  } else {
    // Category C
    if (gross <= 6600000) return 0.00;
    if (gross <= 6950000) return 0.0025;
    if (gross <= 7350000) return 0.005;
    if (gross <= 7800000) return 0.0075;
    if (gross <= 8850000) return 0.01;
    if (gross <= 9800000) return 0.0125;
    if (gross <= 10850000) return 0.015;
    if (gross <= 11950000) return 0.0175;
    if (gross <= 13100000) return 0.02;
    if (gross <= 14350000) return 0.0225;
    if (gross <= 15650000) return 0.025;
    if (gross <= 17050000) return 0.03;
    if (gross <= 18650000) return 0.04;
    if (gross <= 20450000) return 0.05;
    if (gross <= 22650000) return 0.06;
    if (gross <= 24950000) return 0.07;
    if (gross <= 27650000) return 0.08;
    if (gross <= 30750000) return 0.09;
    if (gross <= 34350000) return 0.10;
    if (gross <= 38750000) return 0.11;
    if (gross <= 43950000) return 0.12;
    if (gross <= 50050000) return 0.13;
    if (gross <= 57250000) return 0.14;
    if (gross <= 65950000) return 0.15;
    return 0.16;
  }
}

interface Employee {
  id: string;
  name: string;
  nik: string;
  npwp: string | null;
  ptkp_status: string;
  basic_salary: number;
  allowance_fixed: number;
}

interface PayslipRow {
  employeeId: string;
  name: string;
  nik: string;
  ptkpStatus: string;
  basicSalary: number;
  allowanceFixed: number;
  allowances: number; // variable allowances inputted
  bonus: number; // variable bonus inputted
  deductions: number; // variable deductions inputted
  grossSalary: number;
  pph21Tax: number;
  netSalary: number;
  processed: boolean;
  payslipId?: string;
  status?: string;
}

// Helper to calculate PPh 21 tax based on settings
function calculateTax(gross: number, ptkpStatus: string, business: any): number {
  if (!business) return 0;
  const taxEnabled = business.payroll_tax_enabled !== false;
  if (!taxEnabled) return 0;
  
  const taxType = business.payroll_tax_type || "ter";
  if (taxType === "none") return 0;
  
  if (taxType === "flat") {
    const rate = Number(business.payroll_tax_rate || 0) / 100;
    return Math.round(gross * rate);
  }
  
  // default is 'ter'
  const category = getTerCategory(ptkpStatus);
  const rate = getTerRate(category, gross);
  return Math.round(gross * rate);
}

export default function PayrollPage() {
  const { activeBusiness } = useBusiness();
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [search, setSearch] = useState("");

  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  const [payrollRows, setPayrollRows] = useState<PayslipRow[]>([]);
  const [isFinalized, setIsFinalized] = useState(false);
  const [activePayslip, setActivePayslip] = useState<any | null>(null);
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
    { value: 10, label: "Oktobe" },
    { value: 11, label: "November" },
    { value: 12, label: "Desember" }
  ];

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);

  const fetchPayrollPeriod = async () => {
    if (!activeBusiness) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const supabase = createWebBrowserClient();

      // 1. Fetch active employees
      const { data: empData, error: empError } = await supabase
        .from("employees")
        .select("*")
        .eq("business_id", activeBusiness.id)
        .eq("is_active", true)
        .order("name", { ascending: true });

      if (empError) throw empError;

      // 2. Fetch existing payslips for the period
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
        .eq("business_id", activeBusiness.id)
        .eq("period_month", selectedMonth)
        .eq("period_year", selectedYear);

      if (slipError) throw slipError;

      // If payslips exist, it means the payroll is finalized for this month
      if (slipData && slipData.length > 0) {
        setIsFinalized(true);
        const formattedRows: PayslipRow[] = slipData.map(s => {
          const emp = s.employee || {};
          const allowances = Number(s.allowances || 0) - Number(s.allowance_fixed || 0); // back-calculate variable allowances
          return {
            employeeId: s.employee_id,
            name: emp.name || "Karyawan",
            nik: emp.nik || "",
            ptkpStatus: emp.ptkp_status || "TK/0",
            basicSalary: Number(s.basic_salary || 0),
            allowanceFixed: Number(s.allowance_fixed || 0),
            allowances: allowances,
            bonus: Number(s.bonus || 0),
            deductions: Number(s.deductions || 0),
            grossSalary: Number(s.gross_salary || 0),
            pph21Tax: Number(s.pph21_tax || 0),
            netSalary: Number(s.net_salary || 0),
            processed: true,
            payslipId: s.id,
            status: s.status
          };
        });
        setPayrollRows(formattedRows);
      } else {
        // Payroll not processed yet: populate rows from active employees directory
        setIsFinalized(false);
        const initialRows: PayslipRow[] = (empData || []).map(emp => {
          const bSalary = Number(emp.basic_salary || 0);
          const fAllowance = Number(emp.allowance_fixed || 0);
          const gross = bSalary + fAllowance;
          
          // Compute PPh 21
          const tax = calculateTax(gross, emp.ptkp_status, activeBusiness);

          return {
            employeeId: emp.id,
            name: emp.name,
            nik: emp.nik,
            ptkpStatus: emp.ptkp_status,
            basicSalary: bSalary,
            allowanceFixed: fAllowance,
            allowances: 0,
            bonus: 0,
            deductions: 0,
            grossSalary: gross,
            pph21Tax: tax,
            netSalary: gross - tax,
            processed: false
          };
        });
        setPayrollRows(initialRows);
      }
    } catch (err) {
      console.error("Error loading payroll period:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayrollPeriod();
  }, [activeBusiness, selectedMonth, selectedYear]);

  const handleUpdateVariable = (index: number, field: "allowances" | "deductions" | "bonus", val: number) => {
    const updated = [...payrollRows];
    const row = updated[index];
    row[field] = Math.max(0, val);

    // Recompute gross salary (Basic + Fixed + Variable Allowances + Bonus)
    row.grossSalary = row.basicSalary + row.allowanceFixed + row.allowances + row.bonus;

    // Recompute PPh 21
    row.pph21Tax = calculateTax(row.grossSalary, row.ptkpStatus, activeBusiness);

    // Recompute net
    row.netSalary = row.grossSalary - row.deductions - row.pph21Tax;

    setPayrollRows(updated);
  };

  const handleFinalizePayroll = async () => {
    if (!activeBusiness) return;
    const validRows = payrollRows.filter(row => row.grossSalary > 0);

    if (validRows.length === 0) {
      alert("Tidak ada karyawan dengan gaji lebih dari Rp 0 untuk diproses!");
      return;
    }
    if (!confirm(`Apakah Anda yakin ingin memproses penggajian untuk ${validRows.length} karyawan di Periode ${selectedMonth}/${selectedYear}? Ini akan menjurnal pengeluaran gaji secara otomatis.`)) {
      return;
    }

    try {
      setProcessing(true);
      const supabase = createWebBrowserClient();

      // Gunakan bulk insert agar diproses sebagai satu transaksi (rollback otomatis jika ada yang gagal)
      const payload = validRows.map(row => ({
        business_id: activeBusiness.id,
        employee_id: row.employeeId,
        period_month: selectedMonth,
        period_year: selectedYear,
        basic_salary: row.basicSalary,
        allowances: row.allowanceFixed + row.allowances, // store total allowances (fixed + variable)
        bonus: row.bonus,
        deductions: row.deductions,
        gross_salary: row.grossSalary,
        pph21_tax: row.pph21Tax,
        net_salary: row.netSalary,
        status: "paid" // immediately flag as paid to run trigger
      }));

      const { error } = await supabase.from("payslips").insert(payload);
      if (error) throw error;

      alert("Penggajian bulanan berhasil diproses dan disetujui!");
      fetchPayrollPeriod();
    } catch (err: any) {
      console.error("Error finalising payroll:", err);
      alert(`Gagal memproses penggajian: ${err.message || "Kesalahan pada database akuntansi/jurnal."}`);
    } finally {
      setProcessing(false);
    }
  };

  const handleResetPayroll = async () => {
    if (!activeBusiness) return;
    if (!confirm(`HATI-HATI! Anda akan menghapus seluruh data slip gaji dan jurnal akuntansi penggajian (otomatis dihapus oleh sistem) untuk periode ${selectedMonth}/${selectedYear}. Lanjutkan?`)) {
      return;
    }
    
    try {
      setProcessing(true);
      const supabase = createWebBrowserClient();
      const { error } = await supabase
        .from("payslips")
        .delete()
        .eq("business_id", activeBusiness.id)
        .eq("period_month", selectedMonth)
        .eq("period_year", selectedYear);
        
      if (error) throw error;
      
      alert("Data penggajian berhasil direset (dibatalkan). Anda bisa mengulangi proses penggajian dari awal.");
      fetchPayrollPeriod();
    } catch (err: any) {
      console.error("Error resetting payroll:", err);
      alert(err.message || "Gagal mereset penggajian.");
    } finally {
      setProcessing(false);
    }
  };

  const handleViewPayslipDetails = async (slipId: string) => {
    try {
      const supabase = createWebBrowserClient();
      const { data, error } = await supabase
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
        .eq("id", slipId)
        .single();

      if (error) throw error;
      setActivePayslip(data);
      setShowSlipModal(true);
    } catch (err) {
      console.error("Error loading payslip:", err);
      alert("Gagal memuat detail slip gaji.");
    }
  };

  const filteredRows = payrollRows.filter(r =>
    r.name.toLowerCase().includes(search.toLowerCase()) ||
    r.nik.includes(search)
  );

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0
    }).format(val);
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-semibold">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            Penggajian Bulanan (Payroll Run)
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">Proses penggajian karyawan dan pemotongan PPh 21 menggunakan skema Tarif Efektif Rata-Rata (TER) PP 58/2023.</p>
        </div>
        
        {!isFinalized && payrollRows.length > 0 && (
          <button
            onClick={handleFinalizePayroll}
            disabled={processing}
            className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold py-2.5 px-4 rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition shrink-0 self-start sm:self-auto active:scale-95 disabled:opacity-50"
          >
            {processing ? "Memproses Gaji..." : "Proses & Bayar Gaji"}
          </button>
        )}
        {isFinalized && (
          <button
            onClick={handleResetPayroll}
            disabled={processing}
            className="bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 hover:border-rose-300 font-extrabold py-2.5 px-4 rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition shrink-0 self-start sm:self-auto active:scale-95 disabled:opacity-50"
          >
            <RotateCcw className="w-4 h-4" /> Batal & Reset Penggajian
          </button>
        )}
      </div>

      {/* Date Selectors & Search Card */}
      <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm space-y-4 card-shadow text-xs font-semibold">
        <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Periode Penggajian</h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          
          <div className="space-y-1">
            <label className="text-slate-500">Pilih Bulan</label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              disabled={processing}
              className="w-full bg-white border border-slate-200 px-3 py-2 rounded-xl text-slate-800 focus:outline-none font-bold"
            >
              {months.map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-slate-500">Pilih Tahun</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              disabled={processing}
              className="w-full bg-white border border-slate-200 px-3 py-2 rounded-xl text-slate-800 focus:outline-none font-bold"
            >
              {years.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-slate-500">Cari Nama / NIK</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari..."
                className="w-full bg-white border border-slate-200 pl-8.5 pr-3 py-2 rounded-xl text-slate-800 focus:outline-none font-semibold shadow-sm"
              />
            </div>
          </div>

        </div>

        {isFinalized && (
          <div className="bg-emerald-50 border border-emerald-100 text-emerald-600 px-3 py-2 rounded-xl flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span>Periode ini telah **Final** dan dibayarkan. Jurnal gaji otomatis terbit di Buku Besar.</span>
          </div>
        )}

        {!isFinalized && payrollRows.some(r => r.grossSalary === 0) && (
          <div className="bg-amber-50 border border-amber-200 text-amber-700 px-3 py-2.5 rounded-xl flex items-start gap-2.5 shadow-sm mt-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
            <div className="flex flex-col">
              <span className="font-bold">Info: Ada karyawan dengan Penghasilan Bruto Rp 0</span>
              <span className="text-amber-700/90 text-[11px] font-medium leading-relaxed mt-0.5">
                Karyawan yang total gajinya masih <strong>Rp 0</strong> otomatis <strong>tidak akan diproses</strong>. Anda dapat merevisi tabel di bawah dengan mengisi Tunjangan/Potongan jika ingin memasukkan mereka ke dalam penggajian bulan ini.
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Payroll Worksheet Table */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs text-slate-500 font-semibold mt-2">Memuat data payroll...</p>
        </div>
      ) : filteredRows.length > 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden card-shadow text-xs font-semibold">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                  <th className="py-3.5 px-4">Karyawan</th>
                  <th className="py-3.5 px-4 text-right">Gaji Pokok & Tunjangan Tetap</th>
                  <th className="py-3.5 px-4 text-right w-32">Tunjangan Var. (+)</th>
                  <th className="py-3.5 px-4 text-right w-32">Bonus Var. (+)</th>
                  <th className="py-3.5 px-4 text-right w-32">Potongan Var. (-)</th>
                  <th className="py-3.5 px-4 text-right">Penghasilan Bruto</th>
                  <th className="py-3.5 px-4 text-right text-rose-500">PPh 21 Pajak</th>
                  <th className="py-3.5 px-4 text-right text-blue-600">Gaji Bersih (THP)</th>
                  <th className="py-3.5 px-4 text-center">Detail / Slip</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredRows.map((row, idx) => (
                  <tr key={row.employeeId} className="hover:bg-slate-50 transition">
                    <td className="py-4 px-4">
                      <div className="font-bold text-slate-900">{row.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                        NIK: {row.nik} | PTKP: {row.ptkpStatus}
                      </div>
                    </td>
                    <td className="py-4 px-4 text-right font-medium">
                      <div>Gaji: {formatCurrency(row.basicSalary)}</div>
                      <div className="text-[10px] text-slate-450">Tunj: +{formatCurrency(row.allowanceFixed)}</div>
                    </td>
                    <td className="py-4 px-4 text-right">
                      {isFinalized ? (
                        <span className="font-bold text-slate-800">{formatCurrency(row.allowances - row.allowanceFixed)}</span>
                      ) : (
                        <input
                          type="number"
                          min="0"
                          value={row.allowances}
                          onChange={(e) => handleUpdateVariable(idx, "allowances", Number(e.target.value))}
                          className="bg-white border border-slate-200 px-2 py-1 rounded w-28 text-right font-bold focus:outline-none shadow-sm focus:border-blue-500"
                        />
                      )}
                    </td>
                    <td className="py-4 px-4 text-right">
                      {isFinalized ? (
                        <span className="font-bold text-emerald-600">+{formatCurrency(row.bonus)}</span>
                      ) : (
                        <input
                          type="number"
                          min="0"
                          value={row.bonus}
                          onChange={(e) => handleUpdateVariable(idx, "bonus", Number(e.target.value))}
                          className="bg-white border border-slate-200 px-2 py-1 rounded w-28 text-right font-bold focus:outline-none shadow-sm focus:border-blue-500"
                        />
                      )}
                    </td>
                    <td className="py-4 px-4 text-right">
                      {isFinalized ? (
                        <span className="font-bold text-rose-500">-{formatCurrency(row.deductions)}</span>
                      ) : (
                        <input
                          type="number"
                          min="0"
                          value={row.deductions}
                          onChange={(e) => handleUpdateVariable(idx, "deductions", Number(e.target.value))}
                          className="bg-white border border-slate-200 px-2 py-1 rounded w-28 text-right font-bold focus:outline-none shadow-sm focus:border-blue-500"
                        />
                      )}
                    </td>
                    <td className="py-4 px-4 text-right font-extrabold text-slate-900">
                      {formatCurrency(row.grossSalary)}
                    </td>
                    <td className="py-4 px-4 text-right font-extrabold text-rose-600">
                      -{formatCurrency(row.pph21Tax)}
                    </td>
                    <td className="py-4 px-4 text-right font-extrabold text-blue-600">
                      {formatCurrency(row.netSalary)}
                    </td>
                    <td className="py-4 px-4 text-center">
                      {isFinalized && row.payslipId ? (
                        <button
                          onClick={() => handleViewPayslipDetails(row.payslipId!)}
                          className="inline-flex items-center gap-1 text-blue-600 hover:bg-blue-50 px-2.5 py-1.5 rounded-lg transition font-bold"
                        >
                          <Printer className="w-3.5 h-3.5" /> Slip Gaji
                        </button>
                      ) : (
                        <span className="text-[10px] text-slate-400 font-medium italic">Pending Final</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-400 shadow-sm text-xs font-semibold">
          <CreditCard className="w-12 h-12 mx-auto text-slate-200 mb-3" />
          <p className="text-sm font-semibold">Tidak ada karyawan aktif untuk dikalkulasi</p>
          <p className="text-[10px] text-slate-450 mt-1">Daftarkan karyawan Anda di direktori Karyawan terlebih dahulu.</p>
        </div>
      )}

      {/* Slip Gaji Modal */}
      {showSlipModal && activePayslip && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[95vh] text-xs font-semibold">
            
            {/* Modal Header */}
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between print:hidden">
              <span className="font-bold text-slate-800">Cetak Slip Gaji Karyawan</span>
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
                <p className="text-slate-400 text-[10px] font-bold mt-0.5">Periode: {months.find(m => m.value === activePayslip.period_month)?.label} {activePayslip.period_year}</p>
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
