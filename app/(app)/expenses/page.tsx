"use client";

import React, { useEffect, useState } from "react";
import { 
  Wallet, 
  Plus, 
  Search, 
  Calendar,
  AlertCircle,
  FileText,
  DollarSign,
  TrendingDown,
  Trash2,
  Receipt
} from "lucide-react";
import { useBusiness } from "../../../lib/context/BusinessContext";
import { createWebBrowserClient } from "../../../lib/supabase/client";
import Pagination from "../../../components/Pagination";

interface Expense {
  id: string;
  amount: number;
  expense_date: string;
  notes: string | null;
  expense_account: {
    id: string;
    code: string;
    name: string;
  } | null;
  payment_account: {
    id: string;
    code: string;
    name: string;
  } | null;
}

interface AccountOption {
  id: string;
  code: string;
  name: string;
  type: string;
}

export default function ExpensesPage() {
  const { activeBusiness } = useBusiness();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [expenseAccounts, setExpenseAccounts] = useState<AccountOption[]>([]);
  const [paymentAccounts, setPaymentAccounts] = useState<AccountOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;

  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  // Modal states for creating expense
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [formData, setFormData] = useState({
    accountId: "",
    paymentAccountId: "",
    amount: "",
    expenseDate: new Date().toISOString().split("T")[0],
    notes: ""
  });

  const fetchData = async () => {
    if (!activeBusiness) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const supabase = createWebBrowserClient();

      // Fetch Accounts (COA) for dropdowns
      const { data: accountsData, error: accountsError } = await supabase
        .from("accounts")
        .select("id, code, name, type")
        .eq("business_id", activeBusiness.id)
        .eq("is_active", true);

      if (accountsError) throw accountsError;

      // Expense accounts: type is 'expense'
      const expAccs = (accountsData || []).filter(a => a.type === "expense");
      // Payment accounts: type is 'asset' (Cash & Bank)
      const payAccs = (accountsData || []).filter(a => a.type === "asset");

      setExpenseAccounts(expAccs);
      setPaymentAccounts(payAccs);

      // Fetch Expenses
      const { data: expensesData, error: expensesError } = await supabase
        .from("expenses")
        .select(`
          id,
          amount,
          expense_date,
          notes,
          expense_account:account_id (
            id,
            code,
            name
          ),
          payment_account:payment_account_id (
            id,
            code,
            name
          )
        `)
        .eq("business_id", activeBusiness.id)
        .order("expense_date", { ascending: false })
        .order("created_at", { ascending: false });

      if (expensesError) throw expensesError;

      // Format data and handle arrays if returned by PostgREST
      const formatted = (expensesData || []).map((exp: any) => ({
        id: exp.id,
        amount: Number(exp.amount || 0),
        expense_date: exp.expense_date,
        notes: exp.notes,
        expense_account: Array.isArray(exp.expense_account) ? exp.expense_account[0] : (exp.expense_account || null),
        payment_account: Array.isArray(exp.payment_account) ? exp.payment_account[0] : (exp.payment_account || null)
      }));

      setExpenses(formatted);

      // Pre-populate cash account if available
      const defaultCashAcc = payAccs.find(a => a.code === "1101");
      if (defaultCashAcc) {
        setFormData(prev => ({ ...prev, paymentAccountId: defaultCashAcc.id }));
      }
    } catch (err) {
      console.error("Error loading expenses page:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeBusiness]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: activeBusiness?.default_currency || "IDR",
      maximumFractionDigits: 0
    }).format(val);
  };

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBusiness) return;
    if (!formData.accountId || !formData.paymentAccountId || !formData.amount) {
      setErrorMsg("Harap lengkapi semua kolom wajib!");
      return;
    }

    try {
      setSaving(true);
      setErrorMsg("");
      const supabase = createWebBrowserClient();

      const { error } = await supabase
        .from("expenses")
        .insert({
          business_id: activeBusiness.id,
          account_id: formData.accountId,
          payment_account_id: formData.paymentAccountId,
          amount: Number(formData.amount),
          expense_date: formData.expenseDate,
          notes: formData.notes
        });

      if (error) throw error;

      setIsModalOpen(false);
      setFormData(prev => ({
        ...prev,
        accountId: "",
        amount: "",
        notes: ""
      }));
      fetchData();
      alert("Pengeluaran biaya berhasil disimpan dan jurnal otomatis telah diterbitkan!");
    } catch (err: any) {
      console.error("Error saving expense:", err);
      setErrorMsg(err.message || "Gagal menyimpan pengeluaran.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteExpense = async (id: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus catatan pengeluaran ini? Entri jurnal yang terkait juga akan otomatis dihapus jika terikat secara cascade.")) return;
    try {
      setLoading(true);
      const supabase = createWebBrowserClient();

      const { error } = await supabase
        .from("expenses")
        .delete()
        .eq("id", id);

      if (error) throw error;
      fetchData();
    } catch (err) {
      console.error("Error deleting expense:", err);
      alert("Gagal menghapus pengeluaran.");
    } finally {
      setLoading(false);
    }
  };

  // Filter
  const filteredExpenses = expenses.filter((exp) => {
    const term = search.toLowerCase();
    return (
      (exp.expense_account && exp.expense_account.name.toLowerCase().includes(term)) ||
      (exp.payment_account && exp.payment_account.name.toLowerCase().includes(term)) ||
      (exp.notes && exp.notes.toLowerCase().includes(term))
    );
  });

  const totalExpenseSum = filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0);

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            Biaya Pengeluaran (Expenses Ledger)
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">Catat biaya pengeluaran operasional non-pembelian barang dagang.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 px-4 rounded-xl text-sm flex items-center justify-center gap-1.5 shadow-sm transition shrink-0 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" /> Catat Pengeluaran Baru
        </button>
      </div>

      {/* Summary Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm flex items-center gap-4 card-shadow">
          <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center border border-rose-100">
            <TrendingDown className="w-6 h-6 text-rose-600" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Pengeluaran Periode</span>
            <span className="text-xl font-extrabold text-slate-900">{formatCurrency(totalExpenseSum)}</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm flex items-center gap-4 card-shadow">
          <div className="w-12 h-12 bg-slate-50 text-slate-650 rounded-xl flex items-center justify-center border border-slate-200">
            <Receipt className="w-6 h-6 text-slate-500" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Beban Gaji/Sewa Aktif</span>
            <span className="text-xl font-extrabold text-slate-900">
              {expenses.filter(e => e.expense_account?.code === "5201" || e.expense_account?.code === "5202").length} Transaksi
            </span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm flex items-center gap-4 card-shadow">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center border border-blue-100">
            <DollarSign className="w-6 h-6 text-blue-650" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Pembayaran Kas Utama (`1101`)</span>
            <span className="text-xl font-extrabold text-slate-900">
              {formatCurrency(expenses.filter(e => e.payment_account?.code === "1101").reduce((s, e) => s + e.amount, 0))}
            </span>
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
          placeholder="Cari pengeluaran berdasarkan nama beban, rekening penarik, catatan..."
          className="w-full bg-white border border-slate-200 pl-10 pr-4 py-2.5 rounded-xl text-sm placeholder-slate-400 focus:outline-none focus:border-blue-500 transition shadow-sm"
        />
      </div>

      {/* Expenses Table */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs text-slate-500 font-semibold mt-2">Memuat daftar pengeluaran...</p>
        </div>
      ) : filteredExpenses.length > 0 ? (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden card-shadow">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                    <th className="py-3.5 px-4 w-32">Tanggal</th>
                    <th className="py-3.5 px-4">Nama Akun Beban</th>
                    <th className="py-3.5 px-4">Akun Pembayaran</th>
                    <th className="py-3.5 px-4">Catatan</th>
                    <th className="py-3.5 px-4 text-right w-36">Jumlah Biaya</th>
                    <th className="py-3.5 px-4 text-center w-20">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredExpenses.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE).map((exp) => (
                    <tr key={exp.id} className="hover:bg-slate-50 transition">
                      <td className="py-4 px-4 font-semibold text-slate-500 flex items-center gap-1.5 mt-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" /> {exp.expense_date}
                      </td>
                      <td className="py-4 px-4">
                        <span className="font-mono font-bold text-slate-500 mr-1.5 bg-slate-100 px-1.5 py-0.5 rounded border text-[10px]">
                          {exp.expense_account?.code}
                        </span>
                        <span className="font-bold text-slate-900">{exp.expense_account?.name || "Beban Lain-Lain"}</span>
                      </td>
                      <td className="py-4 px-4 font-semibold text-slate-700">
                        [{exp.payment_account?.code}] {exp.payment_account?.name || "Kas Utama"}
                      </td>
                      <td className="py-4 px-4 text-slate-500 leading-normal max-w-xs truncate" title={exp.notes || ""}>
                        {exp.notes || "-"}
                      </td>
                      <td className="py-4 px-4 text-right font-extrabold text-rose-600">
                        {formatCurrency(exp.amount)}
                      </td>
                      <td className="py-4 px-4 text-center">
                        <button
                          onClick={() => handleDeleteExpense(exp.id)}
                          className="p-1.5 text-rose-600 border border-rose-100 hover:bg-rose-50 rounded-xl transition"
                          title="Hapus"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <Pagination
            currentPage={currentPage}
            totalItems={filteredExpenses.length}
            pageSize={PAGE_SIZE}
            onPageChange={setCurrentPage}
          />
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-400 shadow-sm">
          <Wallet className="w-12 h-12 mx-auto text-slate-200 mb-3" />
          <p className="text-sm font-semibold">Tidak ada pengeluaran operasional terekam</p>
          <p className="text-xs text-slate-500 mt-0.5">Mulai dengan mencatat pengeluaran biaya sewa, gaji staff, atau listrik.</p>
        </div>
      )}

      {/* Expense Modal Form */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl relative border border-slate-100 space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <Receipt className="w-5 h-5 text-blue-600" />
              <h3 className="text-md font-bold text-slate-900">Catat Pengeluaran Beban</h3>
            </div>

            {errorMsg && (
              <div className="bg-rose-50 border border-rose-100 text-rose-600 text-xs px-3.5 py-2.5 rounded-xl flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleCreateExpense} className="space-y-4 text-xs font-semibold">
              <div className="space-y-1">
                <label className="text-slate-500">Pilih Akun Beban (Operasional)</label>
                <select
                  required
                  value={formData.accountId}
                  onChange={(e) => setFormData({ ...formData, accountId: e.target.value })}
                  className="w-full bg-white border border-slate-200 px-3.5 py-2.5 rounded-xl text-slate-800 focus:outline-none focus:border-blue-500 transition shadow-sm font-bold"
                >
                  <option value="">-- Pilih Akun Beban --</option>
                  {expenseAccounts.map(acc => (
                    <option key={acc.id} value={acc.id}>
                      [{acc.code}] {acc.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-slate-500">Pilih Akun Pembayaran (Sumber Kas)</label>
                <select
                  required
                  value={formData.paymentAccountId}
                  onChange={(e) => setFormData({ ...formData, paymentAccountId: e.target.value })}
                  className="w-full bg-white border border-slate-200 px-3.5 py-2.5 rounded-xl text-slate-800 focus:outline-none focus:border-blue-500 transition shadow-sm font-bold"
                >
                  <option value="">-- Pilih Rekening Pembayar --</option>
                  {paymentAccounts.map(acc => (
                    <option key={acc.id} value={acc.id}>
                      [{acc.code}] {acc.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-500">Tanggal Transaksi</label>
                  <input
                    type="date"
                    required
                    value={formData.expenseDate}
                    onChange={(e) => setFormData({ ...formData, expenseDate: e.target.value })}
                    className="w-full bg-white border border-slate-200 px-3.5 py-2 rounded-xl text-slate-800 focus:outline-none focus:border-blue-500 transition shadow-sm font-bold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-500">Jumlah Nominal (Rupiah)</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    placeholder="e.g. 50000"
                    className="w-full bg-white border border-slate-200 px-3.5 py-2.5 rounded-xl text-slate-800 focus:outline-none focus:border-blue-500 transition shadow-sm font-bold"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-500">Catatan Tambahan (Keterangan)</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="e.g. Pembayaran tagihan token listrik kantor bulan Juni"
                  rows={2}
                  className="w-full bg-white border border-slate-200 px-3.5 py-2 rounded-xl text-slate-800 focus:outline-none focus:border-blue-500 transition shadow-sm font-semibold"
                />
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
                  {saving ? "Menyimpan..." : "Simpan Pengeluaran"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
