"use client";

import React, { useState, useEffect } from "react";
import { useBusiness } from "../../../../lib/context/BusinessContext";
import { useLanguage } from "../../../../lib/context/LanguageContext";
import { createWebBrowserClient } from "../../../../lib/supabase/client";
import { 
  Upload, 
  FileSpreadsheet, 
  CheckCircle2, 
  ArrowLeft, 
  RefreshCw, 
  HelpCircle, 
  Search, 
  ArrowUpRight, 
  ArrowDownLeft, 
  X,
  CreditCard,
  Plus
} from "lucide-react";
import Link from "next/link";

interface ParsedTransaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: "CR" | "DB"; // CR = Credit/Uang Masuk, DB = Debit/Uang Keluar
  isReconciled: boolean;
}

interface Invoice {
  id: string;
  invoice_number: string;
  customer_name: string;
  total_amount: number;
  remaining_amount: number;
}

interface Account {
  id: string;
  code: string;
  name: string;
  type: string;
}

export default function ReconciliationPage() {
  const { activeBusiness } = useBusiness();
  const { locale, t } = useLanguage();
  const [bankType, setBankType] = useState<"bca" | "mandiri">("bca");
  const [dragActive, setDragActive] = useState(false);
  const [transactions, setTransactions] = useState<ParsedTransaction[]>([]);
  const [unpaidInvoices, setUnpaidInvoices] = useState<Invoice[]>([]);
  const [expenseAccounts, setExpenseAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedTx, setSelectedTx] = useState<ParsedTransaction | null>(null);
  const [reconMode, setReconMode] = useState<"invoice" | "expense" | null>(null);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState("");
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const fetchReconciliationData = React.useCallback(async () => {
    if (!activeBusiness) return;
    try {
      const supabase = createWebBrowserClient();
      
      // Fetch unpaid or partially paid invoices
      const { data: invs, error: invError } = await supabase
        .from("invoices")
        .select(`
          id, 
          invoice_number, 
          total_amount, 
          remaining_amount,
          customers ( name )
        `)
        .eq("business_id", activeBusiness.id)
        .in("status", ["sent", "partial"]);

      if (invError) throw invError;
      
      const formattedInvs: Invoice[] = (invs || []).map((inv: any) => ({
        id: inv.id,
        invoice_number: inv.invoice_number,
        customer_name: inv.customers?.name || "Pelanggan",
        total_amount: inv.total_amount,
        remaining_amount: inv.remaining_amount ?? inv.total_amount
      }));
      setUnpaidInvoices(formattedInvs);

      // Fetch Expense accounts (type = 'expense')
      const { data: accs, error: accError } = await supabase
        .from("accounts")
        .select("id, code, name, type")
        .eq("business_id", activeBusiness.id)
        .eq("type", "expense");

      if (accError) throw accError;
      setExpenseAccounts(accs || []);

    } catch (err) {
      console.error("Error fetching reconciliation data:", err);
    }
  }, [activeBusiness]);

  useEffect(() => {
    fetchReconciliationData();
  }, [activeBusiness, fetchReconciliationData]);

  // Handle file dragging
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  // Handle file drops / selection
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      parseFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      parseFile(e.target.files[0]);
    }
  };

  // Parsing Bank Statement Client-side
  const parseFile = (file: File) => {
    setLoading(true);
    setErrorMessage("");
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split(/\r?\n/);
        const parsedList: ParsedTransaction[] = [];

        if (bankType === "bca") {
          // Simplistic parsing for BCA CSV or Text statements
          // Example BCA format typically has: Date, Description, Amount, DB/CR
          // E.g.: "15/06","TRSF DR BIZ ","10.000.000,00","CR"
          lines.forEach((line, index) => {
            const cleanLine = line.replace(/"/g, "").trim();
            if (!cleanLine || cleanLine.startsWith("Tanggal") || cleanLine.startsWith("Mulai")) return;
            
            const parts = cleanLine.split(/,+/);
            if (parts.length >= 3) {
              const date = parts[0] || "";
              const desc = parts[1] || "";
              let amountStr = parts[2] || "0";
              let type: "CR" | "DB" = "CR";
              
              if (parts.length >= 4) {
                type = parts[3].trim().toUpperCase() === "DB" ? "DB" : "CR";
              } else if (amountStr.includes("-")) {
                type = "DB";
              }

              // Clean amount string: 10.000.000,00 -> 10000000
              const amount = parseFloat(amountStr.replace(/\./g, "").replace(/,/g, ".").replace(/-/g, "")) || 0;

              if (amount > 0) {
                parsedList.push({
                  id: `bca-${index}-${Date.now()}`,
                  date,
                  description: desc,
                  amount,
                  type,
                  isReconciled: false
                });
              }
            }
          });
        } else if (bankType === "mandiri") {
          // Parsing Mandiri MCM statement (Date, Desc, Debit, Credit)
          lines.forEach((line, index) => {
            const cleanLine = line.replace(/"/g, "").trim();
            if (!cleanLine || cleanLine.startsWith("Date") || cleanLine.startsWith("Tanggal")) return;

            const parts = cleanLine.split(/,+/);
            if (parts.length >= 4) {
              const date = parts[0] || "";
              const desc = parts[1] || "";
              const debitVal = parseFloat(parts[2]?.replace(/\./g, "").replace(/,/g, ".") || "0");
              const creditVal = parseFloat(parts[3]?.replace(/\./g, "").replace(/,/g, ".") || "0");

              let amount = 0;
              let type: "CR" | "DB" = "CR";

              if (creditVal > 0) {
                amount = creditVal;
                type = "CR";
              } else if (debitVal > 0) {
                amount = debitVal;
                type = "DB";
              }

              if (amount > 0) {
                parsedList.push({
                  id: `mandiri-${index}-${Date.now()}`,
                  date,
                  description: desc,
                  amount,
                  type,
                  isReconciled: false
                });
              }
            }
          });
        }

        if (parsedList.length === 0) {
          throw new Error(
            locale === "en" 
              ? "No transactions parsed. Please check if file matches selected bank format."
              : "Tidak ada transaksi yang terbaca. Cek kembali kecocokan file dengan bank terpilih."
          );
        }

        setTransactions(parsedList);
        setSuccessMessage(
          locale === "en" 
            ? `Successfully loaded ${parsedList.length} transactions!` 
            : `Berhasil memuat ${parsedList.length} transaksi!`
        );
      } catch (err: any) {
        setErrorMessage(err.message || "Gagal membaca file.");
      } finally {
        setLoading(false);
      }
    };

    reader.onerror = () => {
      setErrorMessage("Error membaca berkas file.");
      setLoading(false);
    };

    reader.readAsText(file);
  };

  // Perform Reconciliation
  const handleReconcile = async () => {
    if (!selectedTx || !activeBusiness) return;
    setLoading(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const supabase = createWebBrowserClient();

      if (reconMode === "invoice") {
        if (!selectedInvoiceId) throw new Error("Silakan pilih invoice.");
        const invoice = unpaidInvoices.find(i => i.id === selectedInvoiceId);
        if (!invoice) throw new Error("Invoice tidak ditemukan.");

        // Record a Payment
        const { error: payError } = await supabase
          .from("payments")
          .insert({
            invoice_id: selectedInvoiceId,
            amount: selectedTx.amount,
            payment_date: new Date().toISOString().split("T")[0],
            payment_method: "transfer",
            notes: `Auto-Reconciled: ${selectedTx.description}`
          });

        if (payError) throw payError;

        // Update Invoice status/remaining amount
        const newRemaining = Math.max(0, invoice.remaining_amount - selectedTx.amount);
        const newStatus = newRemaining === 0 ? "paid" : "partial";

        const { error: invUpdateError } = await supabase
          .from("invoices")
          .update({
            remaining_amount: newRemaining,
            status: newStatus
          })
          .eq("id", selectedInvoiceId);

        if (invUpdateError) throw invUpdateError;

      } else if (reconMode === "expense") {
        if (!selectedAccountId) throw new Error("Silakan pilih akun beban.");
        
        // Find Cash Account (1101) of the business
        const { data: cashAcc, error: cashErr } = await supabase
          .from("accounts")
          .select("id")
          .eq("business_id", activeBusiness.id)
          .eq("code", "1101")
          .single();

        if (cashErr || !cashAcc) throw new Error("Akun Kas Utama (1101) tidak ditemukan.");

        // Record direct Expense
        const { error: expError } = await supabase
          .from("expenses")
          .insert({
            business_id: activeBusiness.id,
            account_id: selectedAccountId,
            payment_account_id: cashAcc.id,
            amount: selectedTx.amount,
            expense_date: new Date().toISOString().split("T")[0],
            notes: `Auto-Reconciled Mutasi: ${selectedTx.description}`
          });

        if (expError) throw expError;
      }

      // Mark transaction as reconciled in client state
      setTransactions(prev =>
        prev.map(t => (t.id === selectedTx.id ? { ...t, isReconciled: true } : t))
      );

      setSuccessMessage(
        locale === "en" 
          ? "Transaction reconciled successfully!" 
          : "Transaksi berhasil direkonsiliasi!"
      );
      setSelectedTx(null);
      setReconMode(null);
      fetchReconciliationData(); // Refresh invoice list
    } catch (err: any) {
      setErrorMessage(err.message || "Gagal melakukan rekonsiliasi.");
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0
    }).format(val);
  };

  return (
    <div className="space-y-6">
      
      {/* Top Navigation Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div className="flex items-center gap-3">
          <Link 
            href="/accounts" 
            className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Rekonsiliasi Bank</h1>
            <p className="text-xs text-slate-500 font-medium">Unggah mutasi rekening bank dan cocokkan secara instan dengan piutang atau beban.</p>
          </div>
        </div>
      </div>

      {/* Notifications */}
      {successMessage && (
        <div className="bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs font-semibold rounded-2xl p-4 flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}
      {errorMessage && (
        <div className="bg-rose-50 border border-rose-100 text-rose-700 text-xs font-semibold rounded-2xl p-4 flex items-center gap-2">
          <X className="w-5 h-5 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Upload and Configuration Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Settings Box */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
          <h3 className="font-extrabold text-sm text-slate-950 flex items-center gap-2">
            <CreditCard className="w-4.5 h-4.5 text-blue-600" /> Pengaturan Rekening
          </h3>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Format Bank</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setBankType("bca")}
                className={`py-2 px-3 rounded-xl border font-bold text-xs transition ${
                  bankType === "bca" 
                    ? "bg-blue-50 border-blue-200 text-blue-600" 
                    : "bg-white border-slate-200 text-slate-650 hover:bg-slate-50"
                }`}
              >
                BCA (KlikBCA)
              </button>
              <button
                type="button"
                onClick={() => setBankType("mandiri")}
                className={`py-2 px-3 rounded-xl border font-bold text-xs transition ${
                  bankType === "mandiri" 
                    ? "bg-blue-50 border-blue-200 text-blue-600" 
                    : "bg-white border-slate-200 text-slate-650 hover:bg-slate-50"
                }`}
              >
                Mandiri (MCM)
              </button>
            </div>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl space-y-1">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Petunjuk File</span>
            <p className="text-[10px] text-slate-500 leading-relaxed">
              Format ekspor e-statement dalam bentuk <strong>CSV / TXT</strong> dari layanan internet banking korporat atau retail.
            </p>
          </div>
        </div>

        {/* Drag and Drop Upload Area */}
        <div className="md:col-span-2">
          <div 
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            className={`h-full border-2 border-dashed rounded-2xl flex flex-col items-center justify-center text-center p-6 transition relative ${
              dragActive 
                ? "border-blue-500 bg-blue-50/20" 
                : "border-slate-200 bg-white hover:bg-slate-50/40"
            }`}
          >
            <input 
              type="file" 
              accept=".csv,.txt"
              onChange={handleFileChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 mb-3 border border-blue-100">
              <Upload className="w-5 h-5 animate-pulse" />
            </div>
            <p className="text-xs font-extrabold text-slate-700">Tarik & lepas file mutasi di sini</p>
            <p className="text-[10px] text-slate-400 mt-1">atau klik untuk menelusuri file (.csv / .txt)</p>
          </div>
        </div>

      </div>

      {/* Transactions Table Container */}
      {transactions.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-extrabold text-sm text-slate-950 flex items-center gap-2">
              <FileSpreadsheet className="w-4.5 h-4.5 text-emerald-600" /> Hasil Parsing Mutasi Rekening
            </h3>
            <span className="text-[10px] bg-slate-100 text-slate-650 px-2 py-0.5 rounded-full font-bold">
              {transactions.filter(t => !t.isReconciled).length} Belum Direkonsiliasi
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">
                  <th className="py-3 px-5">Tanggal</th>
                  <th className="py-3 px-5">Keterangan</th>
                  <th className="py-3 px-5 text-right">Nominal</th>
                  <th className="py-3 px-5 text-center">Jenis</th>
                  <th className="py-3 px-5 text-center">Status</th>
                  <th className="py-3 px-5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {transactions.map((tx) => (
                  <tr key={tx.id} className={`hover:bg-slate-50/50 transition ${tx.isReconciled ? "opacity-60 bg-slate-50/30" : ""}`}>
                    <td className="py-3 px-5 text-slate-550 font-semibold">{tx.date}</td>
                    <td className="py-3 px-5 text-slate-800 leading-normal max-w-xs truncate" title={tx.description}>
                      {tx.description}
                    </td>
                    <td className={`py-3 px-5 text-right font-bold font-mono ${tx.type === "CR" ? "text-emerald-600" : "text-slate-800"}`}>
                      {tx.type === "CR" ? "+" : "-"}{formatCurrency(tx.amount)}
                    </td>
                    <td className="py-3 px-5 text-center">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-black border uppercase tracking-wider ${
                        tx.type === "CR" 
                          ? "bg-emerald-50 text-emerald-600 border-emerald-100" 
                          : "bg-slate-100 text-slate-600 border-slate-200"
                      }`}>
                        {tx.type === "CR" ? (
                          <><ArrowDownLeft className="w-3 h-3" /> In (CR)</>
                        ) : (
                          <><ArrowUpRight className="w-3 h-3" /> Out (DB)</>
                        )}
                      </span>
                    </td>
                    <td className="py-3 px-5 text-center">
                      {tx.isReconciled ? (
                        <span className="text-[10px] font-extrabold text-emerald-600 inline-flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Reconciled
                        </span>
                      ) : (
                        <span className="text-[10px] font-extrabold text-amber-500">
                          Pending
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-5 text-right">
                      {!tx.isReconciled && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedTx(tx);
                            setReconMode(tx.type === "CR" ? "invoice" : "expense");
                          }}
                          className="py-1 px-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-[10px] transition shadow-sm"
                        >
                          Rekonsiliasi
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Reconciliation Pop-up Modal */}
      {selectedTx && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md shadow-2xl p-5 relative overflow-hidden space-y-4">
            
            <button 
              onClick={() => {
                setSelectedTx(null);
                setReconMode(null);
              }}
              className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-1">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Proses Rekonsiliasi</span>
              <h4 className="font-extrabold text-sm text-slate-950 leading-tight">Match Mutasi Bank</h4>
            </div>

            {/* Selected Tx Detail */}
            <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Deskripsi:</span>
                <span className="font-bold text-slate-800 text-right truncate max-w-[200px]" title={selectedTx.description}>
                  {selectedTx.description}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Nominal:</span>
                <span className="font-mono font-bold text-slate-900">{formatCurrency(selectedTx.amount)}</span>
              </div>
            </div>

            {/* Match Mode Selection */}
            <div className="flex bg-slate-100 p-1 rounded-xl gap-1">
              <button
                type="button"
                onClick={() => setReconMode("invoice")}
                className={`flex-1 py-1.5 text-center font-bold text-[10px] rounded-lg transition ${
                  reconMode === "invoice" ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-900"
                }`}
              >
                Cocokkan ke Invoice
              </button>
              <button
                type="button"
                onClick={() => setReconMode("expense")}
                className={`flex-1 py-1.5 text-center font-bold text-[10px] rounded-lg transition ${
                  reconMode === "expense" ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-900"
                }`}
              >
                Catat Beban Baru
              </button>
            </div>

            {/* Reconciliation Forms */}
            {reconMode === "invoice" ? (
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Pilih Invoice Yang Belum Lunas</label>
                {unpaidInvoices.length > 0 ? (
                  <select
                    value={selectedInvoiceId}
                    onChange={(e) => setSelectedInvoiceId(e.target.value)}
                    className="w-full border border-slate-200 px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-blue-500 transition font-medium"
                  >
                    <option value="">-- Pilih Invoice --</option>
                    {unpaidInvoices.map((inv) => (
                      <option key={inv.id} value={inv.id}>
                        {inv.invoice_number} - {inv.customer_name} ({formatCurrency(inv.remaining_amount)})
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="text-[10px] text-slate-400">Tidak ada tagihan/invoice belum lunas saat ini.</p>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Pilih Kategori Beban/Pengeluaran</label>
                <select
                  value={selectedAccountId}
                  onChange={(e) => setSelectedAccountId(e.target.value)}
                  className="w-full border border-slate-200 px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-blue-500 transition font-medium"
                >
                  <option value="">-- Pilih Akun Beban --</option>
                  {expenseAccounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.code} - {acc.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Perform Actions */}
            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedTx(null);
                  setReconMode(null);
                }}
                className="flex-1 py-2 border border-slate-200 hover:bg-slate-50 text-slate-650 font-bold rounded-xl text-xs transition"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleReconcile}
                disabled={loading || (reconMode === "invoice" ? !selectedInvoiceId : !selectedAccountId)}
                className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Menyimpan..." : "Selesaikan Cocok"}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
