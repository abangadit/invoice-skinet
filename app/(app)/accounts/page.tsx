"use client";

import React, { useEffect, useState } from "react";
import { 
  Grid, 
  Plus, 
  Search, 
  Database,
  ArrowRight,
  TrendingUp,
  AlertCircle,
  FolderTree,
  DollarSign
} from "lucide-react";
import { useBusiness } from "../../../lib/context/BusinessContext";
import { createWebBrowserClient } from "../../../lib/supabase/client";
import Link from "next/link";

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

export default function AccountsPage() {
  const { activeBusiness } = useBusiness();
  const [accounts, setAccounts] = useState<AccountWithItems[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newAccount, setNewAccount] = useState({
    code: "",
    name: "",
    type: "asset" as "asset" | "liability" | "equity" | "income" | "expense"
  });
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const fetchAccounts = async () => {
    if (!activeBusiness) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const supabase = createWebBrowserClient();

      const { data, error } = await supabase
        .from("accounts")
        .select(`
          id,
          code,
          name,
          type,
          is_active,
          journal_items (
            debit,
            credit
          )
        `)
        .eq("business_id", activeBusiness.id)
        .order("code", { ascending: true });

      if (error) throw error;
      setAccounts(data as any[] || []);
    } catch (err) {
      console.error("Error fetching accounts:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, [activeBusiness]);

  const calculateBalance = (account: AccountWithItems) => {
    const totalDebit = (account.journal_items || []).reduce((sum, item) => sum + Number(item.debit || 0), 0);
    const totalCredit = (account.journal_items || []).reduce((sum, item) => sum + Number(item.credit || 0), 0);
    
    // Normal balance calculation:
    // Debit accounts: Assets & Expenses (Debit increase, Credit decrease)
    // Credit accounts: Liabilities, Equity, Revenue (Credit increase, Debit decrease)
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
    
    return isNegative ? `(${formatted})` : formatted;
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBusiness) return;
    if (!newAccount.code || !newAccount.name) {
      setErrorMsg("Harap isi kode dan nama akun!");
      return;
    }

    try {
      setSaving(true);
      setErrorMsg("");
      const supabase = createWebBrowserClient();

      const { error } = await supabase
        .from("accounts")
        .insert({
          business_id: activeBusiness.id,
          code: newAccount.code,
          name: newAccount.name,
          type: newAccount.type,
          is_active: true
        });

      if (error) {
        if (error.code === "23505") {
          throw new Error("Kode akun sudah digunakan oleh akun lain.");
        }
        throw error;
      }

      setIsModalOpen(false);
      setNewAccount({ code: "", name: "", type: "asset" });
      fetchAccounts();
    } catch (err: any) {
      setErrorMsg(err.message || "Gagal membuat akun.");
    } finally {
      setSaving(false);
    }
  };

  // Group accounts by type for summary display
  const groupByType = (type: string) => {
    return accounts
      .filter(acc => acc.type === type && acc.name.toLowerCase().includes(search.toLowerCase()))
      .map(acc => ({
        ...acc,
        balance: calculateBalance(acc)
      }));
  };

  const assets = groupByType("asset");
  const liabilities = groupByType("liability");
  const equities = groupByType("equity");
  const incomes = groupByType("income");
  const expenses = groupByType("expense");

  const totalAssetsSum = accounts
    .filter(acc => acc.type === "asset")
    .reduce((sum, acc) => sum + calculateBalance(acc), 0);

  const totalLiabilitiesSum = accounts
    .filter(acc => acc.type === "liability")
    .reduce((sum, acc) => sum + calculateBalance(acc), 0);

  const totalEquitySum = accounts
    .filter(acc => acc.type === "equity")
    .reduce((sum, acc) => sum + calculateBalance(acc), 0);

  const renderAccountGroupTable = (title: string, groupAccounts: any[], colorClass: string) => {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden card-shadow">
        <div className={`px-5 py-3.5 border-b border-slate-200 flex justify-between items-center ${colorClass}`}>
          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">{title}</h4>
          <span className="text-xs font-mono font-bold text-slate-900 bg-white/70 px-2 py-0.5 rounded border">
            {groupAccounts.length} Akun
          </span>
        </div>
        
        {groupAccounts.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                  <th className="py-2.5 px-4 w-32">Kode Akun</th>
                  <th className="py-2.5 px-4">Nama Akun</th>
                  <th className="py-2.5 px-4 text-right w-44">Saldo Berjalan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {groupAccounts.map((acc) => (
                  <tr key={acc.id} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-4 font-mono font-bold text-slate-600">{acc.code}</td>
                    <td className="py-3 px-4 font-semibold text-slate-900">{acc.name}</td>
                    <td className={`py-3 px-4 text-right font-extrabold ${
                      acc.balance < 0 ? "text-rose-600" : "text-slate-800"
                    }`}>
                      {formatCurrency(acc.balance)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-6 text-center text-slate-400">
            <p className="text-xs">Tidak ada akun di kategori ini</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            Bagan Akun (Chart of Accounts)
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">Kelola bagan perkiraan akun akuntansi untuk menyusun jurnal entri ganda.</p>
        </div>
        <div className="flex gap-2 text-xs font-semibold">
          <Link
            href="/accounts/reconciliation"
            className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition shrink-0 self-start sm:self-auto"
          >
            <Database className="w-4 h-4 text-slate-500" /> Rekonsiliasi Bank
          </Link>
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 px-4 rounded-xl text-sm flex items-center justify-center gap-1.5 shadow-sm transition shrink-0 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" /> Tambah Akun Baru
          </button>
        </div>
      </div>

      {/* Accounting Balance Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm flex items-center gap-4 card-shadow">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center border border-blue-100">
            <DollarSign className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Aset (Aktiva)</span>
            <span className="text-xl font-extrabold text-slate-900">{formatCurrency(totalAssetsSum)}</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm flex items-center gap-4 card-shadow">
          <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center border border-amber-100">
            <Database className="w-6 h-6 text-amber-600" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Kewajiban (Pasiva)</span>
            <span className="text-xl font-extrabold text-slate-900">{formatCurrency(totalLiabilitiesSum)}</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm flex items-center gap-4 card-shadow">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center border border-emerald-100">
            <TrendingUp className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Ekuitas (Modal)</span>
            <span className="text-xl font-extrabold text-slate-900">{formatCurrency(totalEquitySum)}</span>
          </div>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari nama atau kode akun..."
          className="w-full bg-white border border-slate-200 pl-10 pr-4 py-2.5 rounded-xl text-sm placeholder-slate-400 focus:outline-none focus:border-blue-500 transition shadow-sm"
        />
      </div>

      {/* Accounts Categories Table Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs text-slate-500 font-semibold mt-2">Memuat bagan perkiraan akun...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {renderAccountGroupTable("1. ASET (ASSETS)", assets, "bg-blue-50/50")}
          {renderAccountGroupTable("2. KEWAJIBAN (LIABILITIES)", liabilities, "bg-amber-50/50")}
          {renderAccountGroupTable("3. EKUITAS (EQUITY)", equities, "bg-emerald-50/50")}
          {renderAccountGroupTable("4. PENDAPATAN (INCOME)", incomes, "bg-indigo-50/50")}
          {renderAccountGroupTable("5. BEBAN (EXPENSES)", expenses, "bg-rose-50/50")}
        </div>
      )}

      {/* Create Account Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl relative border border-slate-100 space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <FolderTree className="w-5 h-5 text-blue-600" />
              <h3 className="text-md font-bold text-slate-900">Tambah Akun Keuangan Baru</h3>
            </div>

            {errorMsg && (
              <div className="bg-rose-50 border border-rose-100 text-rose-600 text-xs px-3.5 py-2.5 rounded-xl flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleCreateAccount} className="space-y-4 text-xs font-semibold">
              <div className="space-y-1">
                <label className="text-slate-500">Tipe Kelompok Akun</label>
                <select
                  value={newAccount.type}
                  onChange={(e) => setNewAccount({ ...newAccount, type: e.target.value as any })}
                  className="w-full bg-white border border-slate-200 px-3.5 py-2.5 rounded-xl text-slate-800 focus:outline-none focus:border-blue-500 transition shadow-sm font-bold"
                >
                  <option value="asset">Aset (1xxx)</option>
                  <option value="liability">Kewajiban / Utang (2xxx)</option>
                  <option value="equity">Ekuitas / Modal (3xxx)</option>
                  <option value="income">Pendapatan Penjualan (4xxx)</option>
                  <option value="expense">Beban Biaya (5xxx)</option>
                </select>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1 col-span-1">
                  <label className="text-slate-500">Kode Akun</label>
                  <input
                    type="text"
                    required
                    value={newAccount.code}
                    onChange={(e) => setNewAccount({ ...newAccount, code: e.target.value })}
                    placeholder="e.g. 1104"
                    className="w-full bg-white border border-slate-200 px-3.5 py-2.5 rounded-xl text-slate-800 focus:outline-none focus:border-blue-500 transition shadow-sm font-bold font-mono"
                  />
                </div>

                <div className="space-y-1 col-span-2">
                  <label className="text-slate-500">Nama Akun</label>
                  <input
                    type="text"
                    required
                    value={newAccount.name}
                    onChange={(e) => setNewAccount({ ...newAccount, name: e.target.value })}
                    placeholder="e.g. Kas Kecil Mandiri"
                    className="w-full bg-white border border-slate-200 px-3.5 py-2.5 rounded-xl text-slate-800 focus:outline-none focus:border-blue-500 transition shadow-sm font-bold"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold rounded-xl transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-sm transition flex items-center gap-1.5"
                >
                  {saving ? "Menyimpan..." : "Simpan Akun"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
