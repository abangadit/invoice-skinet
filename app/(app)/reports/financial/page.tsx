"use client";

import React, { useEffect, useState } from "react";
import { 
  TrendingUp, 
  Scale, 
  Calendar,
  AlertCircle,
  FileText,
  DollarSign,
  TrendingDown,
  Building2,
  PieChart,
  ArrowRight,
  Download
} from "lucide-react";
import { useBusiness } from "../../../../lib/context/BusinessContext";
import { createWebBrowserClient } from "../../../../lib/supabase/client";

interface AccountWithItems {
  id: string;
  code: string;
  name: string;
  type: "asset" | "liability" | "equity" | "income" | "expense";
  is_active: boolean;
  journal_items: {
    debit: number;
    credit: number;
  }[];
}

export default function FinancialReportsPage() {
  const { activeBusiness } = useBusiness();
  const [activeTab, setActiveTab] = useState<"p_l" | "balance_sheet">("p_l");
  const [accounts, setAccounts] = useState<AccountWithItems[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Date filters
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const fetchAccountsAndJournalItems = async () => {
    if (!activeBusiness) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const supabase = createWebBrowserClient();

      let query = supabase
        .from("accounts")
        .select(`
          id,
          code,
          name,
          type,
          is_active,
          journal_items (
            debit,
            credit,
            journal_entries!inner (
              entry_date
            )
          )
        `)
        .eq("business_id", activeBusiness.id);

      if (startDate) {
        query = query.gte("journal_items.journal_entries.entry_date", startDate);
      }
      if (endDate) {
        query = query.lte("journal_items.journal_entries.entry_date", endDate);
      }

      const { data, error } = await query.order("code", { ascending: true });

      if (error) throw error;
      setAccounts(data as any[] || []);
    } catch (err) {
      console.error("Error fetching report details:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccountsAndJournalItems();
  }, [activeBusiness, startDate, endDate]);

  const calculateBalance = (account: AccountWithItems) => {
    const totalDebit = (account.journal_items || []).reduce((sum, item) => sum + Number(item.debit || 0), 0);
    const totalCredit = (account.journal_items || []).reduce((sum, item) => sum + Number(item.credit || 0), 0);
    
    if (account.type === "asset" || account.type === "expense") {
      return totalDebit - totalCredit;
    } else {
      return totalCredit - totalDebit;
    }
  };

  const formatCurrency = (val: number) => {
    const isNegative = val < 0;
    const absVal = Math.abs(val);
    const formatted = new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: activeBusiness?.default_currency || "IDR",
      maximumFractionDigits: 0
    }).format(absVal);
    
    return isNegative ? `-${formatted}` : formatted;
  };

  // 1. PROFIT AND LOSS CALCULATIONS
  const incomeAccounts = accounts.filter(a => a.type === "income").map(a => ({
    ...a,
    balance: calculateBalance(a)
  }));
  const totalRevenues = incomeAccounts.reduce((s, a) => s + a.balance, 0);

  const hppAccount = accounts.find(a => a.code === "5101");
  const totalCOGS = hppAccount ? calculateBalance(hppAccount) : 0;

  const grossProfit = totalRevenues - totalCOGS;

  const expenseAccounts = accounts
    .filter(a => a.type === "expense" && a.code !== "5101")
    .map(a => ({
      ...a,
      balance: calculateBalance(a)
    }));
  const totalExpenses = expenseAccounts.reduce((s, a) => s + a.balance, 0);

  const netIncome = grossProfit - totalExpenses;

  // 2. BALANCE SHEET CALCULATIONS
  const assetAccounts = accounts.filter(a => a.type === "asset").map(a => ({
    ...a,
    balance: calculateBalance(a)
  }));
  const totalAssets = assetAccounts.reduce((s, a) => s + calculateBalance(a), 0);

  const liabilityAccounts = accounts.filter(a => a.type === "liability").map(a => ({
    ...a,
    balance: calculateBalance(a)
  }));
  const totalLiabilities = liabilityAccounts.reduce((s, a) => s + a.balance, 0);

  const equityAccounts = accounts.filter(a => a.type === "equity").map(a => ({
    ...a,
    balance: calculateBalance(a)
  }));
  const totalEquityBase = equityAccounts.reduce((s, a) => s + a.balance, 0);
  const totalEquity = totalEquityBase + netIncome;

  const balanceDifference = Math.abs(totalAssets - (totalLiabilities + totalEquity));
  const isBalanced = balanceDifference < 1;

  const handleExportCSV = () => {
    let csvContent = "\uFEFF"; // UTF-8 BOM for Excel Excel character support
    
    if (activeTab === "p_l") {
      csvContent += "LAPORAN LABA RUGI\n";
      csvContent += `${activeBusiness?.name || "Bisnis"}\n`;
      csvContent += `Periode: ${startDate || "Semua"} s.d. ${endDate || "Semua"}\n\n`;
      csvContent += "Kode Akun,Nama Akun,Tipe Akun,Saldo (Rp)\n";
      
      csvContent += "PENDAPATAN OPERASIONAL,,,\n";
      incomeAccounts.forEach(acc => {
        csvContent += `"${acc.code}","${acc.name}","${acc.type}",${acc.balance}\n`;
      });
      csvContent += `,,TOTAL PENDAPATAN OPERASIONAL,${totalRevenues}\n\n`;
      
      csvContent += "HARGA POKOK PENJUALAN (HPP),,,\n";
      if (hppAccount) {
        csvContent += `"${hppAccount.code}","${hppAccount.name}","${hppAccount.type}",${totalCOGS}\n`;
      }
      csvContent += `,,TOTAL BEBAN POKOK PENJUALAN,${totalCOGS}\n\n`;
      
      csvContent += `,,LABA KOTOR (GROSS PROFIT),${grossProfit}\n\n`;
      
      csvContent += "BEBAN OPERASIONAL,,,\n";
      expenseAccounts.forEach(acc => {
        csvContent += `"${acc.code}","${acc.name}","${acc.type}",${acc.balance}\n`;
      });
      csvContent += `,,TOTAL BEBAN OPERASIONAL,${totalExpenses}\n\n`;
      csvContent += `,,LABA BERSIH TAHUN BERJALAN,${netIncome}\n`;
    } else {
      csvContent += "LAPORAN NERACA KEUANGAN (BALANCE SHEET)\n";
      csvContent += `${activeBusiness?.name || "Bisnis"}\n`;
      csvContent += `Per Tanggal: ${endDate || "Hari Ini"}\n\n`;
      
      csvContent += "AKTIVA (ASSETS),,,PASIVA (LIABILITIES & EQUITY),,\n";
      csvContent += "Kode Akun,Nama Akun,Saldo (Rp),Kode Akun,Nama Akun,Saldo (Rp)\n";
      
      const maxRows = Math.max(assetAccounts.length, liabilityAccounts.length + equityAccounts.length + 3);
      
      for (let i = 0; i < maxRows; i++) {
        // Left column: Assets
        let assetStr = ",,";
        if (i < assetAccounts.length) {
          const acc = assetAccounts[i];
          assetStr = `"${acc.code}","${acc.name}",${calculateBalance(acc)}`;
        } else if (i === assetAccounts.length) {
          assetStr = `,,${totalAssets}`;
        }
        
        // Right column: Liabilities & Equity
        let pasivaStr = ",,";
        const liabLen = liabilityAccounts.length;
        const eqLen = equityAccounts.length;
        
        if (i < liabLen) {
          const acc = liabilityAccounts[i];
          pasivaStr = `"${acc.code}","${acc.name}",${acc.balance}`;
        } else if (i === liabLen) {
          pasivaStr = `,,${totalLiabilities}`;
        } else if (i < liabLen + 1 + eqLen) {
          const accIndex = i - liabLen - 1;
          const acc = equityAccounts[accIndex];
          pasivaStr = `"${acc.code}","${acc.name}",${acc.balance}`;
        } else if (i === liabLen + 1 + eqLen) {
          pasivaStr = `,"Laba Tahun Berjalan (Net Income)",${netIncome}`;
        } else if (i === liabLen + 1 + eqLen + 1) {
          pasivaStr = `,,${totalEquity}`;
        } else if (i === liabLen + 1 + eqLen + 2) {
          pasivaStr = `,,${totalLiabilities + totalEquity}`;
        }
        
        csvContent += `${assetStr},${pasivaStr}\n`;
      }
    }
    
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Laporan_${activeTab === "p_l" ? "Laba_Rugi" : "Neraca"}_${activeBusiness?.name || "Bisnis"}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 text-slate-800">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4 no-print">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            Laporan Keuangan Resmi
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">Analisis Laba Rugi dan Neraca Keuangan secara formal berdasarkan Buku Besar.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-sm transition"
          >
            <Download className="w-4 h-4" /> Ekspor Excel (CSV)
          </button>
          <button
            onClick={() => window.print()}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-sm transition"
          >
            Cetak Laporan (PDF)
          </button>
        </div>
      </div>

      {/* Date Filters no-print */}
      <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 no-print">
        <span className="text-xs font-bold text-slate-500">Filter Tanggal Laporan:</span>
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 w-full sm:w-auto">
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="bg-white border border-slate-200 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-sm flex-1 sm:flex-none"
          />
          <span>s.d.</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="bg-white border border-slate-200 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-sm flex-1 sm:flex-none"
          />
          {(startDate || endDate) && (
            <button
              type="button"
              onClick={() => {
                setStartDate("");
                setEndDate("");
              }}
              className="text-[10px] font-bold text-rose-600 hover:text-rose-700"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Tab Switcher no-print */}
      <div className="flex bg-white border border-slate-200 rounded-xl p-1 shadow-sm no-print">
        <button
          onClick={() => setActiveTab("p_l")}
          className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 ${
            activeTab === "p_l" 
              ? "bg-blue-600 text-white shadow-sm font-extrabold" 
              : "text-slate-500 hover:bg-slate-50"
          }`}
        >
          <PieChart className="w-4 h-4" /> Laporan Laba Rugi (Profit & Loss)
        </button>
        <button
          onClick={() => setActiveTab("balance_sheet")}
          className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 ${
            activeTab === "balance_sheet" 
              ? "bg-blue-600 text-white shadow-sm font-extrabold" 
              : "text-slate-500 hover:bg-slate-50"
          }`}
        >
          <Scale className="w-4 h-4" /> Neraca Keuangan (Balance Sheet)
        </button>
      </div>

      {/* Print Document Wrapper */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs text-slate-500 font-semibold mt-2">Menyusun laporan keuangan...</p>
        </div>
      ) : activeTab === "p_l" ? (
        
        /* 1. LABA RUGI STATEMENT SHEET */
        <div className="bg-white border border-slate-200 rounded-2xl p-6 md:p-8 shadow-sm space-y-8 relative overflow-hidden print-layout" style={{ borderTop: `6px solid #2563EB` }}>
          
          <div className="text-center space-y-1.5 pb-6 border-b border-slate-100">
            <h3 className="text-lg font-bold text-slate-900 uppercase tracking-wide">{activeBusiness?.name || "Nama Toko / Bisnis"}</h3>
            <h4 className="text-md font-bold text-slate-800 uppercase">Laporan Laba Rugi</h4>
            <p className="text-xs text-slate-500 font-medium">
              {startDate && endDate 
                ? `Periode: ${startDate} s.d. ${endDate}` 
                : "Periode: Semua Transaksi Terdaftar"}
            </p>
          </div>

          <div className="space-y-6 text-sm">
            <div className="space-y-2">
              <div className="flex justify-between border-b border-slate-950 pb-1.5 text-slate-900 font-bold uppercase tracking-wider text-xs">
                <span>Pendapatan Operasional</span>
                <span>Jumlah</span>
              </div>
              
              <div className="space-y-1.5">
                {incomeAccounts.map(acc => (
                  <div key={acc.id} className="flex justify-between pl-4 text-xs font-semibold text-slate-700">
                    <span>[{acc.code}] {acc.name}</span>
                    <span>{formatCurrency(acc.balance)}</span>
                  </div>
                ))}
              </div>
              
              <div className="flex justify-between border-t border-dashed border-slate-200 pt-1.5 font-bold text-slate-900 text-xs">
                <span className="uppercase">Total Pendapatan Bersih</span>
                <span>{formatCurrency(totalRevenues)}</span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between border-b border-slate-950 pb-1.5 text-slate-900 font-bold uppercase tracking-wider text-xs">
                <span>Harga Pokok Penjualan (HPP)</span>
                <span>Jumlah</span>
              </div>
              
              <div className="space-y-1.5">
                {hppAccount && (
                  <div className="flex justify-between pl-4 text-xs font-semibold text-slate-700">
                    <span>[{hppAccount.code}] {hppAccount.name}</span>
                    <span>{formatCurrency(totalCOGS)}</span>
                  </div>
                )}
              </div>
              
              <div className="flex justify-between border-t border-dashed border-slate-200 pt-1.5 font-bold text-slate-900 text-xs">
                <span className="uppercase">Total Beban Pokok Penjualan</span>
                <span>({formatCurrency(totalCOGS)})</span>
              </div>
            </div>

            <div className="flex justify-between bg-slate-50 p-3 rounded-xl border border-slate-200 font-extrabold text-slate-900 text-xs uppercase">
              <span>Laba Kotor (Gross Profit)</span>
              <span>{formatCurrency(grossProfit)}</span>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between border-b border-slate-950 pb-1.5 text-slate-900 font-bold uppercase tracking-wider text-xs">
                <span>Beban Operasional / Pengeluaran</span>
                <span>Jumlah</span>
              </div>
              
              <div className="space-y-1.5">
                {expenseAccounts.map(acc => (
                  <div key={acc.id} className="flex justify-between pl-4 text-xs font-semibold text-slate-700">
                    <span>[{acc.code}] {acc.name}</span>
                    <span>{formatCurrency(acc.balance)}</span>
                  </div>
                ))}
              </div>
              
              <div className="flex justify-between border-t border-dashed border-slate-200 pt-1.5 font-bold text-slate-900 text-xs">
                <span className="uppercase">Total Beban Operasional</span>
                <span>({formatCurrency(totalExpenses)})</span>
              </div>
            </div>

            <div className="flex justify-between bg-blue-50 border border-blue-200 p-4 rounded-xl font-extrabold text-blue-600 text-sm uppercase">
              <span>Laba Bersih Tahun Berjalan (Net Income)</span>
              <span>{formatCurrency(netIncome)}</span>
            </div>
          </div>

        </div>
      ) : (
        
        /* 2. BALANCE SHEET STATEMENT SHEET */
        <div className="bg-white border border-slate-200 rounded-2xl p-6 md:p-8 shadow-sm space-y-8 relative overflow-hidden print-layout" style={{ borderTop: `6px solid #10B981` }}>
          
          <div className="text-center space-y-1.5 pb-6 border-b border-slate-100">
            <h3 className="text-lg font-bold text-slate-900 uppercase tracking-wide">{activeBusiness?.name || "Nama Toko / Bisnis"}</h3>
            <h4 className="text-md font-bold text-slate-800 uppercase">Neraca Keuangan (Balance Sheet)</h4>
            <p className="text-xs text-slate-500 font-medium">
              {endDate ? `Per Tanggal: ${endDate}` : "Per Tanggal: Hari Ini"}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-xs">
            
            {/* SISI KIRI: AKTIVA */}
            <div className="space-y-4">
              <div className="flex justify-between border-b border-slate-950 pb-1.5 text-slate-900 font-bold uppercase tracking-wider text-xs">
                <span>AKTIVA (ASET / HARTA)</span>
                <span>Saldo</span>
              </div>
              
              <div className="space-y-2">
                {assetAccounts.map(acc => {
                  const bal = calculateBalance(acc);
                  const isContra = acc.code === "1202";
                  return (
                    <div key={acc.id} className="flex justify-between pl-3 font-semibold text-slate-700">
                      <span>[{acc.code}] {acc.name}</span>
                      <span className={isContra ? "text-rose-600" : ""}>
                        {isContra && bal !== 0 ? `(${formatCurrency(Math.abs(bal))})` : formatCurrency(bal)}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-between border-t border-slate-950 pt-2 font-extrabold text-blue-600 text-xs bg-slate-50 p-2.5 rounded-lg border">
                <span className="uppercase">TOTAL AKTIVA (ASSETS)</span>
                <span>{formatCurrency(totalAssets)}</span>
              </div>
            </div>

            {/* SISI KANAN: PASIVA */}
            <div className="space-y-6">
              
              <div className="space-y-3">
                <div className="flex justify-between border-b border-slate-950 pb-1.5 text-slate-900 font-bold uppercase tracking-wider text-xs">
                  <span>KEWAJIBAN (UTANG / LIABILITIES)</span>
                  <span>Saldo</span>
                </div>
                
                <div className="space-y-2">
                  {liabilityAccounts.map(acc => (
                    <div key={acc.id} className="flex justify-between pl-3 font-semibold text-slate-700">
                      <span>[{acc.code}] {acc.name}</span>
                      <span>{formatCurrency(acc.balance)}</span>
                    </div>
                  ))}
                </div>

                <div className="flex justify-between border-t border-slate-300 pt-1.5 font-bold text-slate-900">
                  <span className="uppercase">Total Kewajiban</span>
                  <span>{formatCurrency(totalLiabilities)}</span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between border-b border-slate-950 pb-1.5 text-slate-900 font-bold uppercase tracking-wider text-xs">
                  <span>EKUITAS (MODAL / EQUITY)</span>
                  <span>Saldo</span>
                </div>
                
                <div className="space-y-2">
                  {equityAccounts.map(acc => (
                    <div key={acc.id} className="flex justify-between pl-3 font-semibold text-slate-700">
                      <span>[{acc.code}] {acc.name}</span>
                      <span>{formatCurrency(acc.balance)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between pl-3 font-semibold text-blue-600 bg-blue-50/50 p-1.5 rounded border border-dashed border-blue-200">
                    <span>Laba Tahun Berjalan (Net Income)</span>
                    <span>{formatCurrency(netIncome)}</span>
                  </div>
                </div>

                <div className="flex justify-between border-t border-slate-300 pt-1.5 font-bold text-slate-900">
                  <span className="uppercase">Total Ekuitas</span>
                  <span>{formatCurrency(totalEquity)}</span>
                </div>
              </div>

              <div className="flex justify-between border-t border-slate-950 pt-2 font-extrabold text-emerald-600 text-xs bg-slate-50 p-2.5 rounded-lg border">
                <span className="uppercase">TOTAL PASIVA (UTANG + MODAL)</span>
                <span>{formatCurrency(totalLiabilities + totalEquity)}</span>
              </div>
            </div>

          </div>

          {!isBalanced && (
            <div className="bg-rose-50 border border-rose-100 text-rose-600 text-xs p-3.5 rounded-xl flex items-start gap-2 no-print">
              <AlertCircle className="w-4.5 h-4.5 shrink-0 mt-0.5" />
              <div>
                <h5 className="font-bold">Neraca Tidak Seimbang (Unbalanced Balance Sheet)</h5>
                <p className="text-[10px] text-rose-500 mt-0.5">
                  Selisih Aktiva dan Pasiva sebesar <strong>{formatCurrency(balanceDifference)}</strong>. 
                  Pastikan seluruh entri jurnal ganda Anda didebit dan dikredit dengan benar pada jumlah seimbang.
                </p>
              </div>
            </div>
          )}

        </div>
      )}

    </div>
  );
}
