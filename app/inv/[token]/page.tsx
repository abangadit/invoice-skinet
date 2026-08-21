"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { 
  FileText, 
  Download, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Upload,
  Calendar,
  Building2,
  Lock,
  Printer,
  Globe,
  X,
  Receipt,
  Percent,
  Tag
} from "lucide-react";
import { createWebBrowserClient } from "@/lib/supabase/client";
import { useLanguage } from "@/lib/context/LanguageContext";
import { uploadImageToR2 } from "@/lib/utils/upload";
import InvoiceTemplate from "@/components/InvoiceTemplate";

interface InvoiceItem {
  id: string;
  name: string;
  description: string | null;
  quantity: number;
  unit: string;
  unit_price: number;
  subtotal: number;
}

interface InvoiceDetail {
  id: string;
  invoice_number: string;
  status: string;
  issue_date: string;
  due_date: string | null;
  currency: string;
  subtotal: number;
  discount_amount: number;
  taxes_amount: number;
  taxes_snapshot?: Array<{ name: string; rate?: number; amount: number }> | any;
  pph23_amount?: number;
  shipping_amount: number;
  shipping_label: string;
  total_amount: number;
  paid_amount: number;
  remaining_amount: number;
  payment_instructions: string | null;
  notes: string | null;
  signature_text: string | null;
  signature_url: string | null;
  stamp_paid: boolean;
  show_qris: boolean;
  created_at: string;
  customer_snapshot: any;
  public_token: string;
  public_token_created_at?: string | null;
  business_id: string;
  adjustments: Array<{ name: string; value: number }> | null;
  type?: string | null;
  attachment_text?: string | null;
  attachment_image_url?: string | null;
}

export default function PublicInvoicePage() {
  const params = useParams();
  const { t, locale, setLocale } = useLanguage();
  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [businessName, setBusinessName] = useState("");
  const [businessAddress, setBusinessAddress] = useState("");
  const [businessLogo, setBusinessLogo] = useState("");
  const [templateId, setTemplateId] = useState("modern");
  const [templateColor, setTemplateColor] = useState("#004de6");
  const [businessQris, setBusinessQris] = useState("");
  const [businessEmail, setBusinessEmail] = useState("");
  const [businessPhone, setBusinessPhone] = useState("");
  const [businessWebsite, setBusinessWebsite] = useState("");
  const [loading, setLoading] = useState(true);
  const [expired, setExpired] = useState(false);
  const [payments, setPayments] = useState<any[]>([]);

  // Proof upload form state
  const [uploaderName, setUploaderName] = useState("");
  const [proofNotes, setProofNotes] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [hasExistingProof, setHasExistingProof] = useState(false);
  const [paymentType, setPaymentType] = useState<"full" | "partial">("full");
  const [paymentAmount, setPaymentAmount] = useState<string>("");

  const fetchPublicInvoice = async () => {
    if (!params.token) return;
    try {
      setLoading(true);
      const supabase = createWebBrowserClient();

      // 1. Try fetching via RPC function (SECURITY DEFINER - bypasses RLS safely)
      const { data: rpcData, error: rpcErr } = await supabase
        .rpc("get_public_invoice_details", { p_token: params.token as string });

      if (!rpcErr && rpcData && rpcData.invoice) {
        const inv = rpcData.invoice;
        const biz = rpcData.business;
        const itms = rpcData.items;
        const pymts = rpcData.payments;

        // Check 3-day expiry
        const tokenCreatedAt = inv.public_token_created_at ? new Date(inv.public_token_created_at) : new Date(inv.created_at);
        const now = new Date();
        const diffMs = now.getTime() - tokenCreatedAt.getTime();
        const diffDays = diffMs / (1000 * 60 * 60 * 24);

        if (diffDays > 3) {
          setExpired(true);
          setLoading(false);
          return;
        }

        setInvoice(inv);
        setPaymentAmount(String(inv.remaining_amount));
        setItems(itms || []);
        setPayments(pymts || []);

        if (biz) {
          setBusinessName(biz.name || "");
          setBusinessAddress(biz.address || "");
          setBusinessLogo(biz.logo_url || "");
          setTemplateId(inv.template_id || biz.template_id || "modern");
          setTemplateColor(inv.template_color || biz.template_color || "#004de6");
          setBusinessQris(biz.qris_url || "");
          setBusinessEmail(biz.email || "");
          setBusinessPhone(biz.phone || "");
          setBusinessWebsite(biz.website || "");
          if (biz.default_language === "en" || biz.default_language === "id") {
            setLocale(biz.default_language);
          }
        }

        // Check pending proof
        const { data: proofData } = await supabase
          .from("customer_payment_proofs")
          .select("id")
          .eq("invoice_id", inv.id)
          .eq("status", "pending")
          .limit(1);

        setHasExistingProof(Boolean(proofData && proofData.length > 0));
        setLoading(false);
        return;
      }

      // 2. Fallback to direct queries if RPC is not deployed yet
      const { data: inv, error: invError } = await supabase
        .from("invoices")
        .select("*")
        .eq("public_token", params.token)
        .single();

      if (invError || !inv) {
        setLoading(false);
        return;
      }

      const tokenCreatedAt = inv.public_token_created_at ? new Date(inv.public_token_created_at) : new Date(inv.created_at);
      const now = new Date();
      const diffMs = now.getTime() - tokenCreatedAt.getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);

      if (diffDays > 3) {
        setExpired(true);
        setLoading(false);
        return;
      }

      setInvoice(inv);
      setPaymentAmount(String(inv.remaining_amount));

      const { data: itemsData } = await supabase
        .from("invoice_items")
        .select("*")
        .eq("invoice_id", inv.id)
        .order("sort_order", { ascending: true });

      setItems(itemsData || []);

      const { data: paymentsData } = await supabase
        .from("payments")
        .select("id, amount, payment_date, method, reference_number, notes")
        .eq("invoice_id", inv.id)
        .order("payment_date", { ascending: false });

      setPayments(paymentsData || []);

      const { data: proofData } = await supabase
        .from("customer_payment_proofs")
        .select("id")
        .eq("invoice_id", inv.id)
        .eq("status", "pending")
        .limit(1);

      setHasExistingProof(Boolean(proofData && proofData.length > 0));

      const { data: bizData } = await supabase
        .from("businesses")
        .select("name, address, logo_url, default_language, template_id, template_color, qris_url, email, phone, website")
        .eq("id", inv.business_id)
        .single();

      if (bizData) {
        setBusinessName(bizData.name);
        setBusinessAddress(bizData.address || "");
        setBusinessLogo(bizData.logo_url || "");
        setTemplateId(inv.template_id || bizData.template_id || "modern");
        setTemplateColor(inv.template_color || bizData.template_color || "#004de6");
        setBusinessQris(bizData.qris_url || "");
        setBusinessEmail(bizData.email || "");
        setBusinessPhone(bizData.phone || "");
        setBusinessWebsite(bizData.website || "");
        if (bizData.default_language === "en" || bizData.default_language === "id") {
          setLocale(bizData.default_language);
        }
      }

    } catch (err) {
      console.error("Error loading public invoice page:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPublicInvoice();
  }, [params.token]);

  const handleUploadProof = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoice || !uploaderName) return;

    try {
      setUploading(true);
      const supabase = createWebBrowserClient();
      let proofUrl = "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=500"; // fallback

      if (selectedFile) {
        try {
          proofUrl = await uploadImageToR2(selectedFile, "proofs");
        } catch (storageErr: any) {
          console.error("R2 upload failed:", storageErr);
          alert(storageErr.message || "Gagal mengunggah file bukti pembayaran.");
          setUploading(false);
          return;
        }
      }

      const amountToSave = paymentType === "full" ? invoice.remaining_amount : Number(paymentAmount);
      if (isNaN(amountToSave) || amountToSave <= 0 || amountToSave > invoice.remaining_amount) {
        alert(locale === "en" ? "Invalid payment amount!" : "Nominal pembayaran tidak valid!");
        setUploading(false);
        return;
      }

      // Save payment proof into db
      const { error: dbError } = await supabase
        .from("customer_payment_proofs")
        .insert({
          invoice_id: invoice.id,
          public_token: invoice.public_token,
          uploader_name: uploaderName,
          notes: proofNotes || null,
          proof_url: proofUrl,
          status: "pending",
          amount: amountToSave
        });

      if (dbError) throw dbError;

      setUploadSuccess(true);
      setHasExistingProof(true);
      setUploaderName("");
      setProofNotes("");
      setSelectedFile(null);
    } catch (err) {
      console.error("Error saving payment proof:", err);
      alert("Gagal mengunggah bukti pembayaran.");
    } finally {
      setUploading(false);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: invoice?.currency || "IDR",
      maximumFractionDigits: 0
    }).format(val);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center font-sans">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs text-slate-500 font-semibold mt-2">Memuat halaman invoice...</p>
      </div>
    );
  }

  if (expired) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 font-sans text-center">
        <div className="max-w-md bg-white border border-slate-200 rounded-2xl p-8 shadow-sm space-y-4">
          <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-100">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">Tautan Kedaluwarsa / Link Expired</h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            Demi alasan keamanan, tautan publik ini otomatis kedaluwarsa setelah 3 hari (72 jam) sejak diterbitkan.
            Silakan hubungi penyedia jasa Anda untuk meminta tautan invoice baru.
          </p>
        </div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 font-sans text-center">
        <div className="max-w-md bg-white border border-slate-200 rounded-2xl p-8 shadow-sm space-y-3">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center mx-auto border border-slate-200">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">Invoice Tidak Ditemukan</h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            Invoice dengan token akses ini tidak terdaftar atau telah dihapus oleh pemilik toko.
          </p>
        </div>
      </div>
    );
  }

  const clientInfo = invoice.customer_snapshot || {};
  const isPaid = invoice.status === "paid";
  const isPartial = invoice.status === "partial";

  return (
    <div className="min-h-screen bg-slate-50 py-4 px-2 sm:py-8 sm:px-4 font-sans text-slate-800">
      
      {/* Printable Area Wrapper */}
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Printable/Print-only CSS settings */}
        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            * {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            body { background: white; color: black; padding: 0; margin: 0; }
            .no-print { display: none !important; }
            .print-full { width: 100% !important; max-width: 100% !important; box-shadow: none !important; border: none !important; }
            .print-page-2 {
              page-break-before: always !important;
              border-top: 6px solid ${templateColor} !important;
              border-left: none !important;
              border-right: none !important;
              border-bottom: none !important;
              box-shadow: none !important;
              padding: 0 !important;
              margin: 0 !important;
            }
          }
        `}} />

        {/* Public Header Area: Actions */}
        <div className="no-print bg-white border border-slate-200 rounded-2xl p-4 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-slate-500">{invoice.invoice_number}</span>
            {invoice.type === "quotation" ? (
              invoice.status === "paid" ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-100">
                  <CheckCircle2 className="w-3.5 h-3.5" /> {locale === "en" ? "Accepted" : "Disetujui"}
                </span>
              ) : invoice.status === "sent" ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-600 border border-blue-100">
                  <Clock className="w-3.5 h-3.5" /> {locale === "en" ? "Sent" : "Dikirim"}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                  <FileText className="w-3.5 h-3.5" /> Draft
                </span>
              )
            ) : isPaid ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-100">
                <CheckCircle2 className="w-3.5 h-3.5" /> {t("paid")}
              </span>
            ) : isPartial ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-600 border border-amber-100">
                <Clock className="w-3.5 h-3.5" /> {t("partial")}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                <Clock className="w-3.5 h-3.5" /> {t("overdue")}
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {/* Language switcher flag */}
            <div className="flex items-center border border-slate-200 rounded-xl p-1 bg-slate-50">
              <button
                onClick={() => setLocale("id")}
                className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition ${
                  locale === "id" ? "bg-white text-blue-600 shadow-sm" : "text-slate-500"
                }`}
              >
                ID
              </button>
              <button
                onClick={() => setLocale("en")}
                className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition ${
                  locale === "en" ? "bg-white text-blue-600 shadow-sm" : "text-slate-500"
                }`}
              >
                EN
              </button>
            </div>

            <button
              onClick={() => window.print()}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition"
            >
              <Printer className="w-4 h-4" /> {t("downloadPDF")}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          
          {/* LEFT COLUMN: INVOICE SHEETS */}
          <div className="md:col-span-2 space-y-6 print-full">
            
            {/* INVOICE CARD */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 md:p-8 shadow-md print-full relative overflow-hidden" style={{ borderTop: ["modern", "classic", "minimal"].includes(templateId) ? `6px solid ${templateColor}` : undefined }}>
              <InvoiceTemplate
                templateId={templateId}
                templateColor={templateColor}
                invoice={{
                  invoice_number: invoice.invoice_number,
                  status: invoice.status,
                  currency: invoice.currency,
                  subtotal: invoice.subtotal,
                  discount_amount: invoice.discount_amount,
                  taxes_amount: invoice.taxes_amount,
                  taxes_snapshot: invoice.taxes_snapshot,
                  pph23_amount: invoice.pph23_amount,
                  shipping_amount: invoice.shipping_amount,
                  shipping_label: invoice.shipping_label || "Ongkos Kirim",
                  total_amount: invoice.total_amount,
                  paid_amount: invoice.paid_amount,
                  remaining_amount: invoice.remaining_amount,
                  adjustments: invoice.adjustments,
                  payment_instructions: invoice.payment_instructions,
                  notes: invoice.notes,
                  signature_text: invoice.signature_text,
                  signature_url: invoice.signature_url,
                  stamp_paid: invoice.stamp_paid,
                  show_qris: invoice.show_qris,
                  issue_date: invoice.issue_date,
                  due_date: invoice.due_date,
                  type: invoice.type,
                }}
                items={items.map((item) => ({
                  ...item,
                  subtotal: item.subtotal,
                }))}
                business={{
                  name: businessName,
                  address: businessAddress,
                  logo_url: businessLogo,
                  qris_url: businessQris,
                  email: businessEmail,
                  phone: businessPhone,
                  website: businessWebsite,
                }}
                customer={{
                  name: clientInfo.name || "Nama Pelanggan",
                  address: clientInfo.address || "Alamat Pelanggan",
                }}
                locale={locale}
              />
            </div>

            {/* PAYMENT HISTORY CARD */}
            {payments.length > 0 && (
              <div 
                className="bg-white border border-slate-200 rounded-2xl p-6 md:p-8 shadow-md print-full relative overflow-hidden" 
                style={{ borderTop: ["modern", "classic", "minimal"].includes(templateId) ? `6px solid ${templateColor}` : undefined }}
              >
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-blue-600" /> {t("paymentHistory")}
                </h3>
                <div className="relative border-l border-slate-100 pl-4 ml-2 space-y-4">
                  {payments.map((p) => (
                    <div key={p.id} className="relative group">
                      {/* Timeline Dot */}
                      <div className="absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-4 ring-emerald-50 border border-emerald-300"></div>
                      
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                        <div>
                          <p className="text-xs font-bold text-slate-700">
                            {formatCurrency(Number(p.amount))}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            {p.method} {p.reference_number && `• Ref: ${p.reference_number}`}
                          </p>
                        </div>
                        <div className="text-[10px] text-slate-500 font-medium">
                          {new Date(p.payment_date).toLocaleDateString(locale === "id" ? "id-ID" : "en-US", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}
                        </div>
                      </div>
                      {p.notes && (
                        <p className="text-[10px] text-slate-600 bg-slate-50 p-2 rounded-lg mt-1 italic leading-relaxed border border-slate-100 whitespace-pre-line">
                          "{p.notes}"
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* WORK ATTACHMENT CARD */}
            {(invoice.attachment_image_url || invoice.attachment_text) && (
              <div 
                className="bg-white border border-slate-200 rounded-2xl p-6 md:p-8 shadow-md print-full print-page-2 relative overflow-hidden" 
                style={{ borderTop: ["modern", "classic", "minimal"].includes(templateId) ? `6px solid ${templateColor}` : undefined }}
              >
                {/* Header Page 2 */}
                <div className="flex items-center justify-between border-b border-slate-200 pb-4 mb-6">
                  <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-blue-600" /> {t("workAttachment")}
                  </h3>
                </div>

                {/* Body Page 2 */}
                <div className="space-y-6">
                  {invoice.attachment_text && (
                    <div className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                      {invoice.attachment_text}
                    </div>
                  )}
                  
                  {invoice.attachment_image_url && (
                    <div className="flex justify-center border border-slate-100 rounded-2xl p-2 bg-slate-50/50">
                      <img 
                        src={invoice.attachment_image_url} 
                        alt="Bukti Pekerjaan" 
                        className="max-h-[600px] object-contain rounded-xl shadow-xs"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          {/* RIGHT COLUMN: BREAKDOWN & ACTIONS */}
          <div className="space-y-6">

            {/* BILLING & TAX BREAKDOWN CARD */}
            <div className="no-print bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3.5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Receipt className="w-4 h-4 text-blue-600" />
                  {locale === "en" ? "Bill & Tax Details" : "Rincian Tagihan & Pajak"}
                </h4>
                <span className="text-[10px] font-bold text-slate-400 uppercase">
                  {invoice.currency}
                </span>
              </div>

              <div className="space-y-2 text-xs">
                {/* Subtotal */}
                <div className="flex justify-between text-slate-600 font-medium">
                  <span>Subtotal</span>
                  <span>{formatCurrency(invoice.subtotal)}</span>
                </div>

                {/* Diskon */}
                {invoice.discount_amount > 0 && (
                  <div className="flex justify-between text-emerald-600 font-medium">
                    <span className="flex items-center gap-1">
                      <Tag className="w-3 h-3" />
                      {locale === "en" ? "Discount" : "Diskon"}
                    </span>
                    <span>-{formatCurrency(invoice.discount_amount)}</span>
                  </div>
                )}

                {/* PPN / Taxes Breakdown */}
                {invoice.taxes_snapshot && Array.isArray(invoice.taxes_snapshot) && invoice.taxes_snapshot.length > 0 ? (
                  invoice.taxes_snapshot.map((tax: any, idx: number) => {
                    const taxLabel = tax.name || (tax.rate ? `PPN (${tax.rate}%)` : "PPN");
                    const taxVal = Number(tax.amount || 0);
                    if (taxVal <= 0) return null;
                    return (
                      <div key={idx} className="flex justify-between text-slate-600 font-medium">
                        <span className="flex items-center gap-1">
                          <Percent className="w-3 h-3 text-blue-500" />
                          {taxLabel}
                        </span>
                        <span>{formatCurrency(taxVal)}</span>
                      </div>
                    );
                  })
                ) : invoice.taxes_amount > 0 ? (
                  <div className="flex justify-between text-slate-600 font-medium">
                    <span className="flex items-center gap-1">
                      <Percent className="w-3 h-3 text-blue-500" />
                      {locale === "en" ? "VAT / Tax" : "PPN (Pajak)"}
                    </span>
                    <span>{formatCurrency(invoice.taxes_amount)}</span>
                  </div>
                ) : null}

                {/* Potongan PPh 23 */}
                {invoice.pph23_amount !== undefined && invoice.pph23_amount > 0 && (
                  <div className="flex justify-between text-rose-600 font-semibold bg-rose-50/70 px-2.5 py-1.5 rounded-lg border border-rose-100">
                    <span className="flex items-center gap-1">
                      <Percent className="w-3 h-3 text-rose-500" />
                      {locale === "en" ? "PPh 23 (2%) Tax Deduction" : "Potongan PPh 23 (2%)"}
                    </span>
                    <span>-{formatCurrency(invoice.pph23_amount)}</span>
                  </div>
                )}

                {/* Adjustments (Other taxes / deductions / fees) */}
                {invoice.adjustments && invoice.adjustments.length > 0 && (
                  invoice.adjustments.map((adj, idx) => {
                    const isNegative = adj.value < 0;
                    return (
                      <div 
                        key={idx} 
                        className={`flex justify-between text-xs font-medium ${
                          isNegative ? "text-rose-600 bg-rose-50/50 px-2 py-1 rounded-lg" : "text-slate-600"
                        }`}
                      >
                        <span>{adj.name}</span>
                        <span>
                          {isNegative ? `-${formatCurrency(Math.abs(adj.value))}` : `+${formatCurrency(adj.value)}`}
                        </span>
                      </div>
                    );
                  })
                )}

                {/* Ongkir / Shipping */}
                {invoice.shipping_amount > 0 && (
                  <div className="flex justify-between text-slate-600 font-medium">
                    <span>{invoice.shipping_label || (locale === "en" ? "Shipping Fee" : "Ongkos Kirim")}</span>
                    <span>{formatCurrency(invoice.shipping_amount)}</span>
                  </div>
                )}

                {/* Total Line */}
                <div className="border-t border-slate-200 pt-2 flex justify-between items-center text-sm font-extrabold text-slate-900">
                  <span>{locale === "en" ? "Grand Total" : "Total Tagihan"}</span>
                  <span className="text-base text-blue-600">{formatCurrency(invoice.total_amount)}</span>
                </div>

                {/* Paid Amount if any */}
                {invoice.paid_amount !== undefined && invoice.paid_amount > 0 && (
                  <div className="flex justify-between text-xs text-emerald-600 font-semibold pt-1">
                    <span>{locale === "en" ? "Paid to Date" : "Sudah Dibayar"}</span>
                    <span>-{formatCurrency(invoice.paid_amount)}</span>
                  </div>
                )}

                {/* Remaining Balance if not full */}
                {invoice.status !== "paid" && (
                  <div className="flex justify-between items-center text-xs font-extrabold text-rose-600 bg-rose-50 p-2.5 rounded-xl border border-rose-100 mt-1">
                    <span>{locale === "en" ? "Remaining Balance" : "Sisa yang Harus Dibayar"}</span>
                    <span className="text-sm">{formatCurrency(invoice.remaining_amount)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* ACTION CARD: QUOTATION OR PAYMENT PROOF */}
            {invoice.type === "quotation" ? (
              <div className="no-print bg-white border border-slate-200 rounded-2xl p-5 shadow-sm text-center py-6 space-y-3">
                <FileText className="w-12 h-12 text-blue-600 mx-auto" />
                <h4 className="font-bold text-slate-800 text-sm">
                  {locale === "en" ? "Quotation Status" : "Status Penawaran"}
                </h4>
                <p className="text-[10px] text-slate-500 leading-relaxed">
                  {invoice.status === "paid" ? (
                    locale === "en" 
                      ? "This quotation has been accepted and processed." 
                      : "Penawaran ini telah disetujui dan diproses."
                  ) : (
                    locale === "en" 
                      ? `This quotation is valid until ${invoice.due_date || "-"}. Please contact the business provider directly to approve or discuss.`
                      : `Penawaran ini berlaku hingga ${invoice.due_date || "-"}. Silakan hubungi penyedia jasa secara langsung untuk menyetujui atau berdiskusi.`
                  )}
                </p>
              </div>
            ) : (
              <div className="no-print bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                
                {uploadSuccess ? (
                  <div className="text-center py-6 space-y-3">
                    <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
                    <h4 className="font-bold text-slate-800 text-sm">{t("clientPaymentProof")}</h4>
                    <p className="text-[10px] text-slate-500 leading-relaxed">
                      {t("proofSentSuccess")}
                    </p>
                    <button
                      onClick={() => setUploadSuccess(false)}
                      className="text-xs font-bold text-blue-600 hover:underline"
                    >
                      {t("sendAnotherProof")}
                    </button>
                  </div>
                ) : hasExistingProof ? (
                  <div className="text-center py-6 space-y-3">
                    <CheckCircle2 className="w-12 h-12 text-blue-600 mx-auto animate-pulse" />
                    <h4 className="font-bold text-slate-800 text-sm">Bukti Pembayaran Terkirim</h4>
                    <p className="text-[10px] text-slate-500 leading-relaxed">
                      Bukti transfer pembayaran untuk tagihan ini sudah berhasil dikirimkan sebelumnya dan sedang dalam proses verifikasi oleh penjual. Anda tidak perlu mengirimkannya lagi.
                    </p>
                  </div>
                ) : isPaid ? (
                  <div className="text-center py-6 space-y-3">
                    <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
                    <h4 className="font-bold text-slate-800 text-sm">Tagihan Telah Lunas</h4>
                    <p className="text-[10px] text-slate-500 leading-relaxed">
                      Terima kasih, pembayaran untuk invoice ini telah terkonfirmasi lunas.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleUploadProof} className="space-y-4">
                    <div>
                      <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                        <Upload className="w-4 h-4 text-blue-600" /> {t("clientPaymentProof")}
                      </h4>
                      <p className="text-[10px] text-slate-400 leading-relaxed mt-1">
                        {t("clientProofDesc")}
                      </p>
                    </div>

                    <div className="space-y-3">
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">{t("senderAccountName")} *</label>
                        <input
                          type="text"
                          required
                          value={uploaderName}
                          onChange={(e) => setUploaderName(e.target.value)}
                          placeholder="Nama Pengirim (misal: Budi Santoso)"
                          className="w-full border border-slate-200 px-3 py-2 rounded-xl text-xs placeholder-slate-400 focus:outline-none"
                        />
                      </div>

                      {/* Toggle Lunas vs Bayar Sebagian */}
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                          {locale === "en" ? "Payment Type" : "Tipe Pembayaran"}
                        </label>
                        <div className="flex gap-2 bg-slate-100 p-1 rounded-xl">
                          <button
                            type="button"
                            onClick={() => {
                              setPaymentType("full");
                              setPaymentAmount(String(invoice.remaining_amount));
                            }}
                            className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg transition ${
                              paymentType === "full" ? "bg-white text-blue-600 shadow-sm" : "text-slate-500"
                            }`}
                          >
                            {locale === "en" ? "Pay in Full" : "Lunas"}
                          </button>
                          <button
                            type="button"
                            onClick={() => setPaymentType("partial")}
                            className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg transition ${
                              paymentType === "partial" ? "bg-white text-blue-600 shadow-sm" : "text-slate-500"
                            }`}
                          >
                            {locale === "en" ? "Pay Partially" : "Bayar Sebagian"}
                          </button>
                        </div>
                      </div>

                      {/* Nominal Pembayaran (Hanya jika Bayar Sebagian) */}
                      {paymentType === "partial" && (
                        <div className="space-y-1 transition duration-200">
                          <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                            {locale === "en" ? "Amount to Pay *" : "Nominal yang Dibayar *"}
                          </label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[10px] font-bold text-slate-400">
                              {invoice.currency}
                            </span>
                            <input
                              type="number"
                              required
                              max={invoice.remaining_amount}
                              min="1"
                              value={paymentAmount}
                              onChange={(e) => setPaymentAmount(e.target.value)}
                              className="w-full border border-slate-200 pl-10 pr-3 py-2 rounded-xl text-xs focus:outline-none font-bold"
                            />
                          </div>
                          <p className="text-[9px] text-slate-400">
                            {locale === "en" 
                              ? "Remaining balance after this payment: " 
                              : "Sisa tagihan setelah pembayaran ini: "}
                            <span className="font-bold text-rose-500">
                              {formatCurrency(invoice.remaining_amount - Number(paymentAmount || 0))}
                            </span>
                          </p>
                        </div>
                      )}

                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">{t("transferNote")}</label>
                        <input
                          type="text"
                          value={proofNotes}
                          onChange={(e) => setProofNotes(e.target.value)}
                          placeholder="Pembayaran lunas Invoice #xxx"
                          className="w-full border border-slate-200 px-3 py-2 rounded-xl text-xs placeholder-slate-400 focus:outline-none"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">{t("transferProofFile")} *</label>
                        <input
                          type="file"
                          required
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0] || null;
                            if (file && !file.type.startsWith("image/")) {
                              alert("Hanya file gambar yang diperbolehkan.");
                              e.target.value = "";
                              setSelectedFile(null);
                            } else {
                              setSelectedFile(file);
                            }
                          }}
                          className="w-full border border-slate-200 p-2 rounded-xl text-[10px] text-slate-500 focus:outline-none bg-slate-50/50"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={uploading}
                      className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition shadow-sm flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      {uploading ? "Mengompres & Mengirim..." : t("sendProof")}
                    </button>
                  </form>
                )}

              </div>
            )}

          </div>

        </div>

      </div>

    </div>
  );
}
