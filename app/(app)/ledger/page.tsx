"use client";

import React, { useEffect, useState } from "react";
import { 
  BookOpen, 
  Plus, 
  Search, 
  Calendar,
  AlertCircle,
  FileSpreadsheet,
  CheckCircle,
  Trash2,
  Scale
} from "lucide-react";
import { useBusiness } from "../../../lib/context/BusinessContext";
import { createWebBrowserClient } from "../../../lib/supabase/client";

interface JournalItem {
  id: string;
  debit: number;
  credit: number;
  accounts: {
    id: string;
    code: string;
    name: string;
  } | null;
}

interface JournalEntry {
  id: string;
  entry_date: string;
  description: string;
  reference_source: string | null;
  reference_id: string | null;
  journal_items: JournalItem[];
}

interface AccountOption {
  id: string;
  code: string;
  name: string;
  type: string;
}

export default function LedgerPage() {
  const { activeBusiness } = useBusiness();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  
  // Date filters
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Modal states for manual entry
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [entryDate, setEntryDate] = useState(new Date().toISOString().split("T")[0]);
  const [rows, setRows] = useState<{ accountId: string; debit: string; credit: string }[]>([
    { accountId: "", debit: "", credit: "" },
    { accountId: "", debit: "", credit: "" }
  ]);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const fetchData = async () => {
    if (!activeBusiness) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const supabase = createWebBrowserClient();

      // Fetch Accounts for dropdown
      const { data: accountsData, error: accountsError } = await supabase
        .from("accounts")
        .select("id, code, name, type")
        .eq("business_id", activeBusiness.id)
        .order("code", { ascending: true });

      if (accountsError) throw accountsError;
      setAccounts(accountsData || []);

      // Fetch Journal Entries
      const { data: entriesData, error: entriesError } = await supabase
        .from("journal_entries")
        .select(`
          id,
          entry_date,
          description,
          reference_source,
          reference_id,
          journal_items (
            id,
            debit,
            credit,
            accounts (
              id,
              code,
              name
            )
          )
        `)
        .eq("business_id", activeBusiness.id)
        .order("entry_date", { ascending: false })
        .order("created_at", { ascending: false });

      if (entriesError) throw entriesError;

      // Safely map joins to handle single vs array format
      const formattedEntries = (entriesData || []).map((entry: any) => ({
        id: entry.id,
        entry_date: entry.entry_date,
        description: entry.description,
        reference_source: entry.reference_source,
        reference_id: entry.reference_id,
        journal_items: (entry.journal_items || []).map((item: any) => ({
          id: item.id,
          debit: Number(item.debit || 0),
          credit: Number(item.credit || 0),
          accounts: Array.isArray(item.accounts) ? item.accounts[0] : (item.accounts || null)
        }))
      }));

      setEntries(formattedEntries);
    } catch (err) {
      console.error("Error loading general ledger:", err);
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

  // Add row in manual entry modal
  const handleAddRow = () => {
    setRows([...rows, { accountId: "", debit: "", credit: "" }]);
  };

  // Remove row in manual entry modal
  const handleRemoveRow = (index: number) => {
    if (rows.length <= 2) return; // Must have at least 2 rows
    setRows(rows.filter((_, i) => i !== index));
  };

  // Update row in manual entry modal
  const handleUpdateRow = (index: number, field: "accountId" | "debit" | "credit", value: string) => {
    const newRows = [...rows];
    if (field === "debit" && value !== "") {
      newRows[index].credit = ""; // Clear credit if debit is entered
    } else if (field === "credit" && value !== "") {
      newRows[index].debit = ""; // Clear debit if credit is entered
    }
    newRows[index][field] = value;
    setRows(newRows);
  };

  const calculateModalTotals = () => {
    const totalDebit = rows.reduce((sum, r) => sum + Number(r.debit || 0), 0);
    const totalCredit = rows.reduce((sum, r) => sum + Number(r.credit || 0), 0);
    return { totalDebit, totalCredit };
  };

  const handleCreateAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBusiness) return;
    if (!description) {
      setErrorMsg("Harap masukkan deskripsi jurnal!");
      return;
    }

    // Validation
    const { totalDebit, totalCredit } = calculateModalTotals();
    if (totalDebit <= 0 || totalCredit <= 0) {
      setErrorMsg("Nominal debit dan kredit harus lebih besar dari nol!");
      return;
    }
    if (totalDebit !== totalCredit) {
      setErrorMsg(`Jurnal tidak seimbang (debit: ${formatCurrency(totalDebit)} vs kredit: ${formatCurrency(totalCredit)}). Total debit dan kredit harus sama!`);
      return;
    }

    // Verify all rows have account selected
    if (rows.some(r => !r.accountId)) {
      setErrorMsg("Pilih akun untuk semua baris jurnal!");
      return;
    }

    try {
      setSaving(true);
      setErrorMsg("");
      const supabase = createWebBrowserClient();

      // 1. Insert Journal Entry Header
      const { data: entryData, error: entryError } = await supabase
        .from("journal_entries")
        .select("id") // select placeholder
        .eq("business_id", activeBusiness.id) // trigger dummy query or insert directly
        .limit(1); // not needed, just insert directly:

      const { data: newEntry, error: createError } = await supabase
        .from("journal_entries")
        .insert({
          business_id: activeBusiness.id,
          entry_date: entryDate,
          description: description,
          reference_source: "MANUAL",
        })
        .select()
        .single();

      if (createError) throw createError;

      // 2. Insert Journal Items
      const itemsPayload = rows.map(r => ({
        journal_entry_id: newEntry.id,
        account_id: r.accountId,
        debit: Number(r.debit || 0),
        credit: Number(r.credit || 0)
      }));

      const { error: itemsError } = await supabase
        .from("journal_items")
        .insert(itemsPayload);

      if (itemsError) {
        // Rollback header if items fail (Supabase will cascade or we clean up)
        await supabase.from("journal_entries").delete().eq("id", newEntry.id);
        throw itemsError;
      }

      setIsModalOpen(false);
      setDescription("");
      setEntryDate(new Date().toISOString().split("T")[0]);
      setRows([
        { accountId: "", debit: "", credit: "" },
        { accountId: "", debit: "", credit: "" }
      ]);
      fetchData();
      alert("Entri jurnal penyesuaian manual berhasil disimpan!");
    } catch (err: any) {
      console.error("Error saving manual journal:", err);
      setErrorMsg(err.message || "Gagal menyimpan entri jurnal.");
    } finally {
      setSaving(false);
    }
  };

  // Filter entries
  const filteredEntries = entries.filter((entry) => {
    const matchesSearch = 
      entry.description.toLowerCase().includes(search.toLowerCase()) ||
      (entry.reference_source && entry.reference_source.toLowerCase().includes(search.toLowerCase())) ||
      entry.journal_items.some(ji => ji.accounts?.name.toLowerCase().includes(search.toLowerCase()) || ji.accounts?.code.includes(search));

    const matchesDate = 
      (!startDate || new Date(entry.entry_date) >= new Date(startDate)) &&
      (!endDate || new Date(entry.entry_date) <= new Date(endDate));

    return matchesSearch && matchesDate;
  });

  const grandTotalDebit = filteredEntries.reduce((sum, entry) => 
    sum + entry.journal_items.reduce((s, ji) => s + ji.debit, 0)
  , 0);

  const grandTotalCredit = filteredEntries.reduce((sum, entry) => 
    sum + entry.journal_items.reduce((s, ji) => s + ji.credit, 0)
  , 0);

  const isBalanced = grandTotalDebit === grandTotalCredit;

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            Buku Kas & Jurnal (General Ledger)
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">Catatan historis seluruh transaksi keuangan beserta debit-kredit akuntansi.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 px-4 rounded-xl text-sm flex items-center justify-center gap-1.5 shadow-sm transition shrink-0 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" /> Entri Jurnal Penyesuaian
        </button>
      </div>

      {/* Sanity Check & Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm flex items-center gap-4 card-shadow">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center border border-blue-100">
            <Scale className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Debit Jurnal</span>
            <span className="text-xl font-extrabold text-slate-900">{formatCurrency(grandTotalDebit)}</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm flex items-center gap-4 card-shadow">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center border border-blue-100">
            <Scale className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Kredit Jurnal</span>
            <span className="text-xl font-extrabold text-slate-900">{formatCurrency(grandTotalCredit)}</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm flex items-center gap-4 card-shadow">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${
            isBalanced 
              ? "bg-emerald-50 text-emerald-600 border-emerald-100" 
              : "bg-rose-50 text-rose-600 border-rose-100 animate-pulse"
          }`}>
            <CheckCircle className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Status Keseimbangan</span>
            <span className={`text-xl font-extrabold ${isBalanced ? "text-emerald-600" : "text-rose-600"}`}>
              {isBalanced ? "Seimbang (Balanced)" : "Tidak Seimbang"}
            </span>
          </div>
        </div>
      </div>

      {/* Filter and Search Section */}
      <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari deskripsi, nomor referensi, nama atau kode akun..."
              className="w-full bg-white border border-slate-200 pl-10 pr-4 py-2.5 rounded-xl text-sm placeholder-slate-400 focus:outline-none focus:border-blue-500 transition shadow-sm"
            />
          </div>
          
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-white border border-slate-200 px-3 py-2.5 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-sm"
            />
            <span>s.d.</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-white border border-slate-200 px-3 py-2.5 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-sm"
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
      </div>

      {/* Ledger History List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs text-slate-500 font-semibold mt-2">Memuat buku kas & jurnal...</p>
        </div>
      ) : filteredEntries.length > 0 ? (
        <div className="space-y-4">
          {filteredEntries.map((entry) => (
            <div key={entry.id} className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden card-shadow">
              
              {/* Header Jurnal */}
              <div className="bg-slate-50/70 border-b border-slate-150 px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1 text-slate-500 font-semibold">
                    <Calendar className="w-4 h-4 text-slate-400" /> {entry.entry_date}
                  </div>
                  <h4 className="font-extrabold text-slate-900 text-sm">{entry.description}</h4>
                </div>
                
                {entry.reference_source && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-600 border border-blue-100 font-mono">
                    Ref: {entry.reference_source}
                  </span>
                )}
              </div>

              {/* Rows Jurnal */}
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="bg-slate-50/30 text-slate-400 font-bold border-b border-slate-100 text-[10px] uppercase tracking-wider">
                      <th className="py-2 px-5 w-40">Kode Akun</th>
                      <th className="py-2 px-5">Nama Perkiraan Akun</th>
                      <th className="py-2 px-5 text-right w-44">Debit</th>
                      <th className="py-2 px-5 text-right w-44">Kredit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {entry.journal_items.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/50 transition">
                        <td className="py-2.5 px-5 font-mono font-bold text-slate-500">
                          {item.accounts?.code || "-"}
                        </td>
                        <td className={`py-2.5 px-5 font-semibold ${item.credit > 0 ? "pl-10 text-slate-500" : "text-slate-800"}`}>
                          {item.accounts?.name || "Akun Dihapus"}
                        </td>
                        <td className="py-2.5 px-5 text-right font-extrabold text-slate-800">
                          {item.debit > 0 ? formatCurrency(item.debit) : "-"}
                        </td>
                        <td className="py-2.5 px-5 text-right font-extrabold text-slate-800">
                          {item.credit > 0 ? formatCurrency(item.credit) : "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-400 shadow-sm">
          <BookOpen className="w-12 h-12 mx-auto text-slate-200 mb-3" />
          <p className="text-sm font-semibold">Tidak ada entri jurnal akuntansi ditemukan</p>
          <p className="text-xs text-slate-500 mt-1">Sistem akan otomatis mencatat jurnal saat ada invoice lunas, PO diterima, atau pengeluaran dibuat.</p>
        </div>
      )}

      {/* Manual Entry Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl p-6 max-w-3xl w-full shadow-2xl relative border border-slate-100 space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <FileSpreadsheet className="w-5 h-5 text-blue-600" />
              <h3 className="text-md font-bold text-slate-900">Buat Entri Jurnal Penyesuaian</h3>
            </div>

            {errorMsg && (
              <div className="bg-rose-50 border border-rose-100 text-rose-600 text-xs px-3.5 py-2.5 rounded-xl flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleCreateAdjustment} className="space-y-4 text-xs font-semibold">
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1 col-span-1">
                  <label className="text-slate-500">Tanggal Jurnal</label>
                  <input
                    type="date"
                    required
                    value={entryDate}
                    onChange={(e) => setEntryDate(e.target.value)}
                    className="w-full bg-white border border-slate-200 px-3.5 py-2 rounded-xl text-slate-800 focus:outline-none focus:border-blue-500 transition shadow-sm font-bold"
                  />
                </div>

                <div className="space-y-1 col-span-2">
                  <label className="text-slate-500">Keterangan / Deskripsi Jurnal</label>
                  <input
                    type="text"
                    required
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="e.g. Setoran modal pemilik awal / Penyesuaian saldo kas"
                    className="w-full bg-white border border-slate-200 px-3.5 py-2.5 rounded-xl text-slate-800 focus:outline-none focus:border-blue-500 transition shadow-sm font-bold"
                  />
                </div>
              </div>

              {/* Dynamic Rows */}
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Rincian Baris Jurnal</span>
                
                <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50/30">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="bg-slate-100 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                        <th className="py-2.5 px-3">Pilih Akun Perkiraan</th>
                        <th className="py-2.5 px-3 text-right w-44">Debit</th>
                        <th className="py-2.5 px-3 text-right w-44">Kredit</th>
                        <th className="py-2.5 px-3 text-center w-14">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {rows.map((row, index) => (
                        <tr key={index}>
                          <td className="py-2 px-2">
                            <select
                              required
                              value={row.accountId}
                              onChange={(e) => handleUpdateRow(index, "accountId", e.target.value)}
                              className="w-full bg-white border border-slate-200 px-3 py-2 rounded-lg text-xs font-bold text-slate-700 focus:outline-none focus:border-blue-500 shadow-sm"
                            >
                              <option value="">-- Pilih Akun --</option>
                              {accounts.map(acc => (
                                <option key={acc.id} value={acc.id}>
                                  [{acc.code}] {acc.name} ({acc.type.toUpperCase()})
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="py-2 px-2">
                            <input
                              type="number"
                              disabled={row.credit !== ""}
                              value={row.debit}
                              onChange={(e) => handleUpdateRow(index, "debit", e.target.value)}
                              placeholder="0"
                              min="0"
                              className="w-full bg-white border border-slate-200 px-3 py-2 rounded-lg text-right text-xs font-bold text-slate-800 focus:outline-none focus:border-blue-500 shadow-sm"
                            />
                          </td>
                          <td className="py-2 px-2">
                            <input
                              type="number"
                              disabled={row.debit !== ""}
                              value={row.credit}
                              onChange={(e) => handleUpdateRow(index, "credit", e.target.value)}
                              placeholder="0"
                              min="0"
                              className="w-full bg-white border border-slate-200 px-3 py-2 rounded-lg text-right text-xs font-bold text-slate-800 focus:outline-none focus:border-blue-500 shadow-sm"
                            />
                          </td>
                          <td className="py-2 px-2 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveRow(index)}
                              disabled={rows.length <= 2}
                              className={`p-1.5 rounded-lg border transition ${
                                rows.length <= 2 
                                  ? "text-slate-300 border-slate-100 bg-slate-50 cursor-not-allowed" 
                                  : "text-rose-500 border-rose-100 hover:bg-rose-50 active:scale-95"
                              }`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <button
                  type="button"
                  onClick={handleAddRow}
                  className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" /> Tambah Baris Jurnal
                </button>
              </div>

              {/* Totals Section */}
              {(() => {
                const { totalDebit, totalCredit } = calculateModalTotals();
                const matched = totalDebit === totalCredit && totalDebit > 0;
                return (
                  <div className="bg-slate-50 p-4 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
                    <div className="space-y-1">
                      <span className="text-slate-500 font-semibold">Total Debit: <strong>{formatCurrency(totalDebit)}</strong></span>
                      <span className="text-slate-500 font-semibold block">Total Kredit: <strong>{formatCurrency(totalCredit)}</strong></span>
                    </div>
                    
                    <span className={`px-3 py-1 rounded-full font-bold border ${
                      matched 
                        ? "bg-emerald-50 border-emerald-100 text-emerald-600" 
                        : "bg-rose-50 border-rose-100 text-rose-600"
                    }`}>
                      {matched ? "Balanced (Seimbang)" : "Unbalanced (Belum Seimbang)"}
                    </span>
                  </div>
                );
              })()}

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
                  {saving ? "Menyimpan..." : "Simpan Jurnal"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
