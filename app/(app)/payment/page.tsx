"use client";

import React, { useEffect, useState } from "react";
import { 
  CreditCard, 
  Search, 
  Calendar, 
  DollarSign, 
  FileText, 
  CheckCircle,
  Building2,
  AlertCircle,
  Clock,
  Eye,
  Check,
  X,
  User
} from "lucide-react";
import { useBusiness } from "../../../lib/context/BusinessContext";
import { createWebBrowserClient } from "../../../lib/supabase/client";
import { useLanguage } from "../../../lib/context/LanguageContext";
import Pagination from "../../../components/Pagination";

interface PaymentAudit {
  id: string;
  amount: number;
  payment_date: string;
  method: string;
  reference_number: string | null;
  notes: string | null;
  invoice_number: string;
  customer_name: string;
}

export default function PaymentPage() {
  const { activeBusiness } = useBusiness();
  const { t, locale } = useLanguage();
  const [payments, setPayments] = useState<PaymentAudit[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [totalIncome, setTotalIncome] = useState(0);
  const [activeTab, setActiveTab] = useState<"audit" | "proofs">("audit");
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;

  useEffect(() => {
    setCurrentPage(1);
  }, [search, activeTab]);

  // Incoming payment proofs state
  const [proofs, setProofs] = useState<any[]>([]);
  const [loadingProofs, setLoadingProofs] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Confirming proof state
  const [confirmingProof, setConfirmingProof] = useState<any | null>(null);
  const [confirmType, setConfirmType] = useState<"full" | "partial">("full");
  const [confirmAmount, setConfirmAmount] = useState<string>("");
  const [confirmDate, setConfirmDate] = useState<string>("");
  const [confirmRef, setConfirmRef] = useState<string>("");
  const [confirmNotes, setConfirmNotes] = useState<string>("");
  const [submittingConfirm, setSubmittingConfirm] = useState(false);

  const fetchPayments = async () => {
    if (!activeBusiness) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const supabase = createWebBrowserClient();

      const { data, error } = await supabase
        .from("payments")
        .select(`
          id,
          amount,
          payment_date,
          method,
          reference_number,
          notes,
          invoices!inner (
            invoice_number,
            customer_snapshot,
            business_id
          )
        `)
        .eq("invoices.business_id", activeBusiness.id)
        .order("payment_date", { ascending: false });

      if (error) throw error;

      const formatted: PaymentAudit[] = (data || []).map((p: any) => ({
        id: p.id,
        amount: Number(p.amount),
        payment_date: p.payment_date,
        method: p.method,
        reference_number: p.reference_number,
        notes: p.notes,
        invoice_number: p.invoices?.invoice_number || "INV-UNKNOWN",
        customer_name: p.invoices?.customer_snapshot?.name || "Pelanggan Umum"
      }));

      setPayments(formatted);
      
      const total = formatted.reduce((sum, item) => sum + item.amount, 0);
      setTotalIncome(total);
    } catch (err) {
      console.error("Error fetching payments audit:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchProofs = async () => {
    if (!activeBusiness) return;
    try {
      setLoadingProofs(true);
      const supabase = createWebBrowserClient();
      const { data, error } = await supabase
        .from("customer_payment_proofs")
        .select(`
          id,
          uploader_name,
          notes,
          proof_url,
          status,
          uploaded_at,
          invoice_id,
          amount,
          invoices!inner (
            invoice_number,
            total_amount,
            remaining_amount,
            currency,
            business_id
          )
        `)
        .eq("invoices.business_id", activeBusiness.id)
        .eq("status", "pending")
        .order("uploaded_at", { ascending: false });

      if (error) throw error;
      setProofs(data || []);
    } catch (err) {
      console.error("Error fetching customer payment proofs:", err);
    } finally {
      setLoadingProofs(false);
    }
  };

  useEffect(() => {
    fetchPayments();
    fetchProofs();
  }, [activeBusiness]);

  const formatCurrency = (val: number, curr?: string) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: curr || activeBusiness?.default_currency || "IDR",
      maximumFractionDigits: 0
    }).format(val);
  };

  // Confirm/Approve Proof of Payment (Opens modal)
  const handleApproveProof = (proof: any) => {
    setConfirmingProof(proof);
    const isPartial = proof.amount && Number(proof.amount) < Number(proof.invoices.remaining_amount);
    setConfirmType(isPartial ? "partial" : "full");
    setConfirmAmount(String(proof.amount || proof.invoices.remaining_amount));
    setConfirmDate(new Date().toISOString().split("T")[0]);
    setConfirmRef(`PROOF-${proof.id.slice(-6).toUpperCase()}`);
    setConfirmNotes(`Bukti transfer dikonfirmasi: a.n. ${proof.uploader_name}. Catatan klien: "${proof.notes || ''}"`);
  };

  const executeApproveProof = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmingProof || !confirmAmount || !confirmDate) return;

    try {
      setSubmittingConfirm(true);
      const supabase = createWebBrowserClient();
      const amount = Number(confirmAmount);

      if (amount <= 0 || amount > Number(confirmingProof.invoices.remaining_amount)) {
        alert("Nominal pembayaran tidak valid!");
        setSubmittingConfirm(false);
        return;
      }

      // 1. Record the payment
      const { error: payError } = await supabase
        .from("payments")
        .insert({
          invoice_id: confirmingProof.invoice_id,
          amount: amount,
          payment_date: confirmDate,
          method: "Transfer Bank",
          reference_number: confirmRef || null,
          notes: confirmNotes || null
        });

      if (payError) throw payError;

      // 2. Set proof status to confirmed
      const { error: proofError } = await supabase
        .from("customer_payment_proofs")
        .update({
          status: "confirmed",
          confirmed_at: new Date().toISOString()
        })
        .eq("id", confirmingProof.id);

      if (proofError) throw proofError;

      // Reload lists
      await fetchPayments();
      await fetchProofs();
      setConfirmingProof(null);
      alert(locale === "en" ? "Payment confirmed successfully!" : "Pembayaran berhasil dikonfirmasi!");
    } catch (err) {
      console.error("Error confirming payment proof:", err);
      alert("Gagal mengonfirmasi pembayaran.");
    } finally {
      setSubmittingConfirm(false);
    }
  };

  // Reject Proof of Payment
  const handleRejectProof = async (proofId: string) => {
    if (!confirm(t("confirmRejectProof"))) return;
    try {
      const supabase = createWebBrowserClient();
      const { error } = await supabase
        .from("customer_payment_proofs")
        .update({
          status: "rejected"
        })
        .eq("id", proofId);

      if (error) throw error;
      fetchProofs();
    } catch (err) {
      console.error("Error rejecting payment proof:", err);
      alert("Gagal menolak bukti pembayaran.");
    }
  };

  const filteredPayments = payments.filter((p) => {
    return (
      p.invoice_number.toLowerCase().includes(search.toLowerCase()) || 
      p.customer_name.toLowerCase().includes(search.toLowerCase()) ||
      (p.reference_number && p.reference_number.toLowerCase().includes(search.toLowerCase()))
    );
  });

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            {t("payment")}
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">{locale === "en" ? "Manage payments and confirm bank transfers." : "Pantau riwayat pemasukan dan konfirmasi bukti transfer bank."}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
        <button
          onClick={() => setActiveTab("audit")}
          className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition ${
            activeTab === "audit" 
              ? "bg-blue-600 text-white shadow-sm font-extrabold" 
              : "text-slate-500 hover:bg-slate-50"
          }`}
        >
          {t("auditPaymentsTab")}
        </button>
        <button
          onClick={() => setActiveTab("proofs")}
          className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 ${
            activeTab === "proofs" 
              ? "bg-blue-600 text-white shadow-sm font-extrabold" 
              : "text-slate-500 hover:bg-slate-50"
          }`}
        >
          {t("incomingProofsTab")}
          {proofs.length > 0 && (
            <span className="w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] flex items-center justify-center font-bold animate-pulse">
              {proofs.length}
            </span>
          )}
        </button>
      </div>

      {activeTab === "audit" ? (
        <>
          {/* Summary card */}
          <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm flex items-center justify-between card-shadow">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center border border-emerald-100">
                <DollarSign className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">{t("subtotal")}</span>
                <span className="text-2xl font-extrabold text-slate-900">{formatCurrency(totalIncome)}</span>
              </div>
            </div>
            
            <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-600 border border-emerald-100">
              <CheckCircle className="w-4 h-4" /> Audit Bersih
            </span>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nomor invoice, pelanggan, atau nomor referensi transfer..."
              className="w-full bg-white border border-slate-200 pl-10 pr-4 py-2.5 rounded-xl text-sm placeholder-slate-400 focus:outline-none focus:border-blue-500 transition shadow-sm"
            />
          </div>

          {/* Audit Log Table */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-xs text-slate-500 font-semibold mt-2">Memuat catatan pembayaran...</p>
            </div>
          ) : filteredPayments.length > 0 ? (
            <div className="space-y-4">
              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden card-shadow">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                        <th className="py-3.5 px-4">Tanggal</th>
                        <th className="py-3.5 px-4">Invoice</th>
                        <th className="py-3.5 px-4">Pelanggan</th>
                        <th className="py-3.5 px-4">Metode</th>
                        <th className="py-3.5 px-4">Referensi</th>
                        <th className="py-3.5 px-4 text-right">Jumlah</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {filteredPayments.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE).map((p) => (
                        <tr key={p.id} className="hover:bg-slate-50 transition">
                          <td className="py-3.5 px-4 flex items-center gap-1.5 font-medium">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" /> {p.payment_date}
                          </td>
                          <td className="py-3.5 px-4 font-mono font-bold text-slate-800">
                            {p.invoice_number}
                          </td>
                          <td className="py-3.5 px-4">
                            {p.customer_name}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="font-semibold">{p.method}</span>
                          </td>
                          <td className="py-3.5 px-4 text-slate-500 font-mono">
                            {p.reference_number || "-"}
                          </td>
                          <td className="py-3.5 px-4 text-right font-extrabold text-emerald-600">
                            {formatCurrency(p.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <Pagination
                currentPage={currentPage}
                totalItems={filteredPayments.length}
                pageSize={PAGE_SIZE}
                onPageChange={setCurrentPage}
              />
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-400 shadow-sm">
              <CreditCard className="w-12 h-12 mx-auto text-slate-200 mb-3" />
              <p className="text-sm font-semibold">Tidak ada transaksi pemasukan terekam</p>
            </div>
          )}
        </>
      ) : (
        /* PROOFS OF PAYMENT SECTION */
        <>
          {loadingProofs ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-xs text-slate-500 font-semibold mt-2">Memeriksa bukti transfer...</p>
            </div>
          ) : proofs.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {proofs.map((proof) => (
                <div key={proof.id} className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm space-y-4 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <span className="text-[10px] font-mono text-slate-400 uppercase block">{proof.invoices?.invoice_number}</span>
                        <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1">
                          <User className="w-4 h-4 text-slate-400" /> {proof.uploader_name}
                        </h4>
                      </div>
                      
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-600 border border-amber-100">
                        <Clock className="w-3 h-3" /> Pending Confirmation
                      </span>
                    </div>

                    <div className="p-3 bg-slate-50 border border-slate-150 rounded-xl flex items-center justify-between">
                      <div>
                        <span className="text-[9px] text-slate-400 font-bold block uppercase">Jumlah Tagihan</span>
                        <span className="text-sm font-extrabold text-slate-900">{formatCurrency(proof.invoices?.total_amount, proof.invoices?.currency)}</span>
                      </div>
                      <div className="text-center">
                        <span className="text-[9px] text-slate-400 font-bold block uppercase">Jumlah Konfirmasi</span>
                        <span className="text-sm font-extrabold text-emerald-600">{formatCurrency(proof.amount || proof.invoices?.remaining_amount, proof.invoices?.currency)}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[9px] text-slate-400 font-bold block uppercase">Sisa Tagihan</span>
                        <span className="text-sm font-extrabold text-rose-600">{formatCurrency(proof.invoices?.remaining_amount, proof.invoices?.currency)}</span>
                      </div>
                    </div>

                    {proof.notes && (
                      <p className="text-xs text-slate-500 italic bg-slate-50/50 p-2 rounded-lg border border-slate-100">
                        "{proof.notes}"
                      </p>
                    )}

                    <div className="relative group rounded-xl overflow-hidden border border-slate-200 h-44 bg-slate-100 flex items-center justify-center cursor-pointer" onClick={() => setPreviewImage(proof.proof_url)}>
                      <img src={proof.proof_url} alt="Proof" className="h-full object-contain" />
                      <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                        <span className="px-3 py-1.5 bg-white text-slate-900 rounded-lg text-xs font-bold flex items-center gap-1 shadow-md">
                          <Eye className="w-4 h-4" /> Preview Receipt
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-3 border-t border-slate-100">
                    <button
                      onClick={() => handleRejectProof(proof.id)}
                      className="flex-1 py-2 hover:bg-slate-50 text-rose-600 font-bold border border-slate-200 rounded-xl text-xs transition flex items-center justify-center gap-1"
                    >
                      <X className="w-4 h-4" /> {t("reject")}
                    </button>
                    <button
                      onClick={() => handleApproveProof(proof)}
                      className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition flex items-center justify-center gap-1 shadow-sm"
                    >
                      <Check className="w-4 h-4" /> {t("approve")}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-400 shadow-sm">
              <CheckCircle className="w-12 h-12 mx-auto text-emerald-500 mb-3" />
              <p className="text-sm font-semibold">Semua Beres!</p>
              <p className="text-xs text-slate-500 mt-0.5">Tidak ada bukti konfirmasi transfer pembayaran yang tertunda.</p>
            </div>
          )}
        </>
      )}

      {/* Image Preview Modal */}
      {previewImage && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setPreviewImage(null)}>
          <div className="relative max-w-2xl w-full bg-white border border-slate-200 rounded-2xl overflow-hidden p-3 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute top-4 right-4 p-1.5 bg-white/80 hover:bg-white text-slate-500 rounded-full shadow transition"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="w-full max-h-[80vh] flex items-center justify-center bg-slate-50 rounded-xl p-2">
              <img src={previewImage} alt="Receipt Preview" className="max-w-full max-h-[70vh] object-contain" />
            </div>
          </div>
        </div>
      )}

      {/* Confirm Payment Modal */}
      {confirmingProof && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">Konfirmasi Bukti Pembayaran</h3>
              <button 
                onClick={() => setConfirmingProof(null)}
                className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={executeApproveProof} className="p-6 space-y-4">
              <div className="text-xs space-y-1 bg-slate-50 border border-slate-150 p-3.5 rounded-xl leading-relaxed">
                <p><strong>Invoice:</strong> {confirmingProof.invoices?.invoice_number}</p>
                <p><strong>Pengirim:</strong> {confirmingProof.uploader_name}</p>
                <p><strong>Nominal Dilaporkan:</strong> {formatCurrency(Number(confirmingProof.amount || confirmingProof.invoices?.remaining_amount), confirmingProof.invoices?.currency)} ({confirmingProof.amount && Number(confirmingProof.amount) < Number(confirmingProof.invoices?.remaining_amount) ? "Sebagian" : "Lunas"})</p>
                <p><strong>Catatan Klien:</strong> {confirmingProof.notes || "-"}</p>
                <p><strong>Sisa Tagihan:</strong> {formatCurrency(confirmingProof.invoices?.remaining_amount, confirmingProof.invoices?.currency)}</p>
              </div>

              {/* Toggle Lunas vs Bayar Sebagian */}
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Tipe Konfirmasi</label>
                <div className="flex gap-2 bg-slate-100 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => {
                      setConfirmType("full");
                      setConfirmAmount(String(confirmingProof.invoices?.remaining_amount));
                    }}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition ${
                      confirmType === "full" ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:bg-slate-50"
                    }`}
                  >
                    Lunas (Bayar Penuh)
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmType("partial")}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition ${
                      confirmType === "partial" ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:bg-slate-50"
                    }`}
                  >
                    Bayar Sebagian
                  </button>
                </div>
              </div>

              {/* Nominal Pembayaran */}
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Nominal Pembayaran *</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-xs font-bold text-slate-400">
                    {confirmingProof.invoices?.currency}
                  </span>
                  <input
                    type="number"
                    required
                    disabled={confirmType === "full"}
                    max={confirmingProof.invoices?.remaining_amount}
                    min="1"
                    value={confirmAmount}
                    onChange={(e) => setConfirmAmount(e.target.value)}
                    className="w-full border border-slate-200 pl-12 pr-4 py-2.5 rounded-xl text-sm placeholder-slate-400 focus:outline-none focus:border-blue-500 transition font-bold disabled:bg-slate-50 disabled:text-slate-500"
                  />
                </div>
              </div>

              {/* Tanggal & Ref */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Tanggal Transaksi *</label>
                  <input
                    type="date"
                    required
                    value={confirmDate}
                    onChange={(e) => setConfirmDate(e.target.value)}
                    className="w-full border border-slate-200 px-3 py-2.5 rounded-xl text-xs focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Nomor Referensi</label>
                  <input
                    type="text"
                    required
                    value={confirmRef}
                    onChange={(e) => setConfirmRef(e.target.value)}
                    className="w-full border border-slate-200 px-3 py-2.5 rounded-xl text-xs focus:outline-none"
                  />
                </div>
              </div>

              {/* Catatan Internal */}
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Catatan Internal / Keterangan</label>
                <textarea
                  value={confirmNotes}
                  onChange={(e) => setConfirmNotes(e.target.value)}
                  placeholder="Catatan pelunasan..."
                  rows={2}
                  className="w-full border border-slate-200 px-3 py-2 rounded-xl text-xs focus:outline-none"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
                <button 
                  type="button" 
                  onClick={() => setConfirmingProof(null)}
                  className="flex-1 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold rounded-xl text-xs transition text-center"
                >
                  Batal
                </button>
                <button 
                  type="submit" 
                  disabled={submittingConfirm}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition shadow-sm text-center flex items-center justify-center"
                >
                  {submittingConfirm ? "Menyimpan..." : "Konfirmasi Pembayaran"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
