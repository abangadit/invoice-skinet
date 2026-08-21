"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { 
  ArrowLeft, 
  FileText, 
  Edit2, 
  Send, 
  MessageSquare, 
  CreditCard, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  Plus, 
  TrendingUp, 
  History, 
  Building2, 
  User, 
  ExternalLink, 
  Printer, 
  Mail,
  Lock,
  UploadCloud,
  RefreshCw,
  Briefcase,
  Truck
} from "lucide-react";
import { useBusiness } from "../../../../lib/context/BusinessContext";
import { createWebBrowserClient } from "../../../../lib/supabase/client";
import { useLanguage } from "@/lib/context/LanguageContext";
import InvoiceTemplate from "@/components/InvoiceTemplate";
import { uploadImageToR2 } from "@/lib/utils/upload";


interface InvoiceItem {
  id: string;
  name: string;
  description: string | null;
  quantity: number;
  unit: string;
  unit_price: number;
  discount_amount: number;
  subtotal: number;
  item_id?: string | null;
  discount_type?: string | null;
  discount_value?: number | null;
  tax_included?: boolean | null;
  tax_base_per_item?: number | null;
}

interface PaymentRecord {
  id: string;
  amount: number;
  payment_date: string;
  method: string;
  reference_number: string | null;
  notes: string | null;
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
  shipping_amount: number;
  shipping_label: string;
  total_amount: number;
  paid_amount: number;
  remaining_amount: number;
  payment_instructions: string | null;
  notes: string | null;
  signature_text: string | null;
  signature_url: string | null;
  adjustments: Array<{ name: string; value: number }> | null;
  stamp_paid: boolean;
  show_qris: boolean;
  public_token: string | null;
  public_token_created_at?: string | null;
  created_at?: string | null;
  customer_snapshot: any;
  type?: string | null;
  discount_type?: string | null;
  discount_value?: number | null;
  tax_base?: number | null;
  taxes_snapshot?: any;
  pph23_amount?: number;
  payment_methods?: string[] | null;
  customer_id?: string | null;
  template_id?: string | null;
  template_color?: string | null;
  attachment_text?: string | null;
  attachment_image_url?: string | null;
  exchange_rate?: number | null;
  converted_to_project_id?: string | null;
}

export default function InvoiceDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { activeBusiness } = useBusiness();
  const { locale, t } = useLanguage();
  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [converting, setConverting] = useState(false);
  const [refreshingLink, setRefreshingLink] = useState(false);

  // Modal Record Payment
  const [showPayModal, setShowPayModal] = useState(false);
  const [payAmount, setPayAmount] = useState("");
  const [payDate, setPayDate] = useState("");
  const [payMethod, setPayMethod] = useState("Transfer Bank");
  const [payRef, setPayRef] = useState("");
  const [payNotes, setPayNotes] = useState("");
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [payExchangeRate, setPayExchangeRate] = useState<number | null>(null);

  // Fetch exchange rate on payDate change for valas invoices
  useEffect(() => {
    const fetchPayRate = async () => {
      if (!invoice || invoice.currency === "IDR" || !payDate) {
        setPayExchangeRate(1.0000);
        return;
      }
      try {
        const supabase = createWebBrowserClient();
        const { data, error } = await supabase
          .from("currency_rates")
          .select("rate")
          .eq("from_currency", invoice.currency)
          .eq("to_currency", "IDR")
          .eq("rate_date", payDate)
          .maybeSingle();

        if (error) throw error;
        if (data) {
          setPayExchangeRate(Number(data.rate));
        } else {
          // Fallback to invoice exchange rate
          setPayExchangeRate(Number(invoice.exchange_rate || 1.0000));
        }
      } catch (err) {
        console.error("Error fetching payment exchange rate:", err);
        setPayExchangeRate(Number(invoice.exchange_rate || 1.0000));
      }
    };
    if (showPayModal) {
      fetchPayRate();
    }
  }, [payDate, showPayModal, invoice]);

  // Work Attachment States
  const [attText, setAttText] = useState("");
  const [attFile, setAttFile] = useState<File | null>(null);
  const [attPreview, setAttPreview] = useState<string | null>(null);
  const [attUploading, setAttUploading] = useState(false);
  const [attError, setAttError] = useState("");

  const fetchInvoiceDetails = async () => {
    if (!params.id) return;
    try {
      setLoading(true);
      const supabase = createWebBrowserClient();

      // Fetch invoice
      const { data: invData, error: invError } = await supabase
        .from("invoices")
        .select("*")
        .eq("id", params.id)
        .single();

      if (invError) throw invError;
      setInvoice(invData);
      setAttText(invData?.attachment_text || "");

      // Fetch items
      const { data: itemsData, error: itemsError } = await supabase
        .from("invoice_items")
        .select("*")
        .eq("invoice_id", params.id)
        .order("sort_order", { ascending: true });

      if (itemsError) throw itemsError;
      setItems(itemsData || []);

      // Fetch payments
      const { data: paymentsData, error: payError } = await supabase
        .from("payments")
        .select("id, amount, payment_date, method, reference_number, notes")
        .eq("invoice_id", params.id)
        .order("payment_date", { ascending: false });

      if (payError) throw payError;
      setPayments(paymentsData || []);

    } catch (err) {
      console.error("Error loading invoice detail:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshLink = async () => {
    if (!invoice) return;
    try {
      setRefreshingLink(true);
      const supabase = createWebBrowserClient();
      const now = new Date().toISOString();
      
      const { error } = await supabase
        .from("invoices")
        .update({ public_token_created_at: now })
        .eq("id", invoice.id);

      if (error) throw error;
      
      alert(locale === "en" ? "Payment link successfully renewed!" : "Masa aktif tautan pembayaran berhasil diperbarui!");
      await fetchInvoiceDetails();
    } catch (err) {
      console.error("Error refreshing link:", err);
      alert("Gagal memperbarui tautan pembayaran.");
    } finally {
      setRefreshingLink(false);
    }
  };

  const isLinkExpired = () => {
    if (!invoice?.public_token) return false;
    const tokenCreatedAt = invoice.public_token_created_at ? new Date(invoice.public_token_created_at) : new Date(invoice.created_at || "");
    const now = new Date();
    const diffMs = now.getTime() - tokenCreatedAt.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    return diffDays > 3;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedMimes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowedMimes.includes(file.type)) {
      setAttError("Format file tidak didukung. Harap pilih gambar JPEG, PNG, WebP, atau GIF.");
      setAttFile(null);
      setAttPreview(null);
      return;
    }

    setAttError("");
    setAttFile(file);

    // Create preview URL
    const reader = new FileReader();
    reader.onloadend = () => {
      setAttPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveAttachment = async () => {
    if (!invoice) return;
    if (!attText.trim()) {
      setAttError("Deskripsi detail pekerjaan wajib diisi.");
      return;
    }
    if (!attFile && !invoice.attachment_image_url) {
      setAttError("Foto bukti pekerjaan wajib diunggah.");
      return;
    }

    try {
      setAttUploading(true);
      setAttError("");

      let imageUrl = invoice.attachment_image_url || "";

      if (attFile) {
        // Enforce safe image check client side
        const allowedMimes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
        if (!allowedMimes.includes(attFile.type)) {
          throw new Error("Format file tidak didukung. Harap pilih gambar JPEG, PNG, WebP, atau GIF.");
        }
        
        // uploadImageToR2 compresses the image client-side to quality 0.6 and max dimension 800px.
        imageUrl = await uploadImageToR2(attFile, "attachments");
      }

      const supabase = createWebBrowserClient();
      const { error } = await supabase
        .from("invoices")
        .update({
          attachment_text: attText.trim(),
          attachment_image_url: imageUrl,
        })
        .eq("id", invoice.id);

      if (error) throw error;

      // Refresh page state
      await fetchInvoiceDetails();
      setAttFile(null);
      setAttPreview(null);
    } catch (err: any) {
      console.error("Error saving attachment:", err);
      setAttError(err.message || "Gagal menyimpan lampiran pekerjaan.");
    } finally {
      setAttUploading(false);
    }
  };

  const handleConvertToInvoice = async () => {
    if (!invoice || !activeBusiness) return;
    if (!confirm(locale === "en" 
      ? `Convert Offer ${invoice.invoice_number} to a new Invoice?` 
      : `Konversi Penawaran ${invoice.invoice_number} menjadi Invoice baru?`
    )) return;

    try {
      setConverting(true);
      const supabase = createWebBrowserClient();

      // Generate invoice number
      const now = new Date();
      const yyyy = String(now.getFullYear());
      const mm = String(now.getMonth() + 1).padStart(2, "0");
      const no = String(activeBusiness.invoice_counter || 1).padStart(4, "0");
      let invoiceNumber = activeBusiness.invoice_number_format || "INV/[YYYY]/[MM]/[NO]";
      invoiceNumber = invoiceNumber.replace("[YYYY]", yyyy).replace("[MM]", mm).replace("[NO]", no);

      // Generate public token
      const alphabet = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let publicToken = '';
      for (let i = 0; i < 8; i++) {
        publicToken += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
      }

      // 1. Insert Invoice
      const { data: newInv, error: insertError } = await supabase
        .from("invoices")
        .insert({
          business_id: activeBusiness.id,
          customer_id: invoice.customer_id,
          customer_snapshot: invoice.customer_snapshot,
          invoice_number: invoiceNumber,
          type: "invoice",
          status: "draft",
          issue_date: now.toISOString().split("T")[0],
          due_date: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString().split("T")[0], // default 14 days
          currency: invoice.currency,
          subtotal: invoice.subtotal,
          discount_type: invoice.discount_type,
          discount_value: invoice.discount_value,
          discount_amount: invoice.discount_amount,
          tax_base: invoice.tax_base,
          taxes_snapshot: invoice.taxes_snapshot,
          taxes_amount: invoice.taxes_amount,
          shipping_amount: invoice.shipping_amount,
          shipping_label: invoice.shipping_label,
          total_amount: invoice.total_amount,
          remaining_amount: invoice.total_amount,
          payment_methods: invoice.payment_methods,
          payment_instructions: invoice.payment_instructions,
          notes: invoice.notes,
          signature_text: invoice.signature_text,
          stamp_paid: false,
          public_token: publicToken,
          converted_from_id: invoice.id
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // 2. Insert items
      const newItems = (items || []).map((item, idx) => ({
        invoice_id: newInv.id,
        item_id: item.item_id || null,
        sort_order: idx,
        name: item.name,
        description: item.description,
        quantity: item.quantity,
        unit: item.unit,
        unit_price: item.unit_price,
        discount_type: item.discount_type || null,
        discount_value: item.discount_value || null,
        discount_amount: item.discount_amount || 0,
        tax_included: item.tax_included || false,
        tax_base_per_item: item.tax_base_per_item || null,
        subtotal: item.subtotal
      }));

      const { error: insertItemsError } = await supabase
        .from("invoice_items")
        .insert(newItems);

      if (insertItemsError) throw insertItemsError;

      // 3. Mark Quotation as accepted/sent or simply linked
      await supabase
        .from("invoices")
        .update({ status: "paid" }) // in quotation context, "paid" means deal/closed
        .eq("id", invoice.id);

      // Increment business counter
      await supabase
        .from("businesses")
        .update({ invoice_counter: (activeBusiness.invoice_counter || 1) + 1 })
        .eq("id", activeBusiness.id);

      alert(locale === "en" ? "Successfully converted quotation to new invoice!" : "Berhasil mengonversi penawaran ke invoice baru!");
      router.push(`/invoice/${newInv.id}`);
    } catch (err) {
      console.error("Error converting quotation:", err);
      alert(locale === "en" ? "Failed to convert quotation." : "Gagal mengonversi penawaran.");
    } finally {
      setConverting(false);
    }
  };

  useEffect(() => {
    fetchInvoiceDetails();
  }, [params.id]);

  // Set default pay date to today
  useEffect(() => {
    if (showPayModal) {
      setPayDate(new Date().toISOString().split("T")[0]);
      if (invoice) {
        setPayAmount(String(invoice.remaining_amount));
      }
    }
  }, [showPayModal]);

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoice) return;

    try {
      setSubmittingPayment(true);
      const supabase = createWebBrowserClient();

      // 1. Insert into payments
      const { error: payError } = await supabase
        .from("payments")
        .insert({
          invoice_id: invoice.id,
          amount: Number(payAmount),
          payment_date: payDate,
          method: payMethod,
          reference_number: payRef || null,
          notes: payNotes || null
        });

      if (payError) throw payError;

      // 2. We also update the remaining_amount on the client to simulate immediately,
      // but reloading details is safer since the DB trigger will handle status updates.
      setShowPayModal(false);
      setPayAmount("");
      setPayRef("");
      setPayNotes("");
      
      await fetchInvoiceDetails();
    } catch (err) {
      console.error("Error recording payment:", err);
      alert("Gagal mencatat pembayaran.");
    } finally {
      setSubmittingPayment(false);
    }
  };

  const getStatusBadge = (status: string) => {
    if (invoice?.type === "quotation") {
      switch (status) {
        case "paid":
          return (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-600 border border-emerald-100">
              <CheckCircle2 className="w-3.5 h-3.5" /> {locale === "en" ? "Accepted" : "Disetujui"}
            </span>
          );
        case "sent":
          return (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-600 border border-blue-100">
              <Send className="w-3.5 h-3.5" /> {locale === "en" ? "Sent" : "Dikirim"}
            </span>
          );
        default:
          return (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">
              <FileText className="w-3.5 h-3.5" /> Draft
            </span>
          );
      }
    }

    switch (status) {
      case "paid":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-600 border border-emerald-100">
            <CheckCircle2 className="w-3.5 h-3.5" /> {locale === "en" ? "Paid" : "Lunas"}
          </span>
        );
      case "partial":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-600 border border-amber-100">
            <Clock className="w-3.5 h-3.5" /> {locale === "en" ? "Partial" : "Belum Lunas"}
          </span>
        );
      case "overdue":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-600 border border-rose-100">
            <AlertCircle className="w-3.5 h-3.5" /> {locale === "en" ? "Overdue" : "Terlambat"}
          </span>
        );
      case "sent":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-600 border border-blue-100">
            <Send className="w-3.5 h-3.5" /> {locale === "en" ? "Sent" : "Dikirim"}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">
            <FileText className="w-3.5 h-3.5" /> Draft
          </span>
        );
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: invoice?.currency || "IDR",
      maximumFractionDigits: 0
    }).format(val);
  };

  // WhatsApp share deep-link generator
  const getWhatsAppShareLink = () => {
    if (!invoice) return "#";
    const isEn = locale === "en";
    const docTypeName = invoice.type === "quotation"
      ? (isEn ? "Quotation" : "Penawaran")
      : (isEn ? "Invoice" : "Invoice");
    const custName = invoice.customer_snapshot?.name || (isEn ? "Customer" : "Pelanggan");
    const amountStr = formatCurrency(invoice.total_amount);
    const publicUrl = `${window.location.origin}/inv/${invoice.public_token}`;
    const message = isEn 
      ? `Hello ${custName},\nHere is ${docTypeName} ${invoice.invoice_number} amounting to ${amountStr}.\nYou can view the details and download the PDF using this link:\n${publicUrl}\n\nThank you.`
      : `Halo ${custName},\nBerikut kami kirimkan ${docTypeName} ${invoice.invoice_number} sebesar ${amountStr}.\nAnda dapat melihat detail tagihan dan mengunduh PDF melalui tautan berikut:\n${publicUrl}\n\nTerima kasih.`;
    return `https://wa.me/${invoice.customer_snapshot?.phone || ""}?text=${encodeURIComponent(message)}`;
  };

  // Email share link handler (Web Share API with mailto fallback)
  const handleEmailShare = async () => {
    if (!invoice) return;
    const isEn = locale === "en";
    const docTypeName = invoice.type === "quotation" 
      ? (isEn ? "Quotation" : "Penawaran") 
      : (isEn ? "Invoice" : "Invoice");
    const custName = invoice.customer_snapshot?.name || (isEn ? "Customer" : "Pelanggan");
    const amountStr = formatCurrency(invoice.total_amount);
    const publicUrl = `${window.location.origin}/inv/${invoice.public_token}`;
    const businessName = activeBusiness?.name || "invoice.co.id";
    
    const subject = `${docTypeName} ${invoice.invoice_number} - ${businessName}`;
    const text = isEn 
      ? `Hello ${custName},\n\nHere is ${docTypeName} ${invoice.invoice_number} amounting to ${amountStr}.` 
      : `Halo ${custName},\n\nBerikut kami kirimkan ${docTypeName} ${invoice.invoice_number} sebesar ${amountStr}.`;

    // Check Web Share API
    if (typeof window !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: subject,
          text: isEn 
            ? `${text}\nYou can view the details and download the PDF using this link: ${publicUrl}`
            : `${text}\nAnda dapat melihat detail tagihan dan mengunduh PDF melalui tautan berikut: ${publicUrl}`,
          url: publicUrl
        });
        return;
      } catch (err) {
        console.log("Error sharing via Web Share API:", err);
      }
    }

    // Fallback to mailto link
    const body = isEn
      ? `${text}\nYou can view the details and download the PDF using this link:\n${publicUrl}\n\nThank you.`
      : `${text}\nAnda dapat melihat detail tagihan dan mengunduh PDF melalui tautan berikut:\n${publicUrl}\n\nTerima kasih.`;
      
    window.location.href = `mailto:${invoice.customer_snapshot?.email || ""}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs text-slate-500 font-semibold mt-2">Memuat rincian invoice...</p>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-400">
        <FileText className="w-12 h-12 mx-auto text-slate-200 mb-3" />
        <p className="text-sm font-semibold">Invoice tidak ditemukan</p>
        <Link href="/invoice" className="text-xs font-bold text-blue-600 hover:underline mt-1 inline-block">
          Kembali ke Daftar Invoice
        </Link>
      </div>
    );
  }

  const clientInfo = invoice.customer_snapshot || {};
  const isOverdue = invoice.status === "overdue" || (invoice.status !== "paid" && invoice.status !== "draft" && invoice.due_date && new Date(invoice.due_date) < new Date());

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      
      {/* Printable/Print-only CSS settings */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          /* Hide all chrome/navigation/action elements */
          header, nav, aside, footer, .no-print {
            display: none !important;
          }
          /* Reset container margins/paddings for print */
          body {
            background: white !important;
            color: black !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .max-w-4xl {
            max-width: 100% !important;
            width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          /* Make invoice sheet span full page */
          .print-full-invoice {
            grid-column: span 3 / span 3 !important;
            width: 100% !important;
            max-width: 100% !important;
          }
          .print-card {
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .print-page-2 {
            page-break-before: always !important;
            border-top: 6px solid ${invoice?.template_color || activeBusiness?.template_color || "#004de6"} !important;
            border-left: none !important;
            border-right: none !important;
            border-bottom: none !important;
            box-shadow: none !important;
            padding: 0 !important;
            margin: 0 !important;
          }
        }
      `}} />

      {/* Top action header */}
      <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => router.push(invoice.type === "quotation" ? "/quotation" : "/invoice")}
            className="p-2 text-slate-400 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-slate-500">{invoice.invoice_number}</span>
              {getStatusBadge(invoice.status)}
            </div>
            <h2 className="text-xl font-bold text-slate-900 mt-1">
              {invoice.type === "quotation" 
                ? (locale === "en" ? "Quotation: " : "Penawaran: ")
                : (locale === "en" ? "Invoice: " : "Tagihan: ")}
              {clientInfo.name || "Pelanggan Umum"}
            </h2>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {invoice.type !== "quotation" && (
            <Link
              href={`/invoice/${invoice.id}/edit`}
              className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-semibold py-2 px-3 rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition"
            >
              <Edit2 className="w-4 h-4" /> Ubah
            </Link>
          )}

          {invoice.type === "quotation" && invoice.converted_to_project_id && (
            <Link
              href={`/project/${invoice.converted_to_project_id}`}
              className="bg-blue-50 hover:bg-blue-100 border border-blue-100 text-blue-600 font-semibold py-2 px-3 rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition font-bold"
            >
              <Briefcase className="w-4 h-4" /> Buka Proyek
            </Link>
          )}

          {invoice.type === "quotation" && !invoice.converted_to_project_id && (
            <Link
              href={`/project/new?quotation_id=${invoice.id}`}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-3 rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition font-bold"
            >
              <Briefcase className="w-4 h-4" /> Jadikan Proyek
            </Link>
          )}

          {invoice.type === "quotation" && invoice.status !== "paid" && !invoice.converted_to_project_id && (
            <button
              onClick={handleConvertToInvoice}
              disabled={converting}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2 px-3 rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition disabled:opacity-50 font-bold"
            >
              <FileText className="w-4 h-4" /> {converting ? (locale === "en" ? "Converting..." : "Mengonversi...") : (locale === "en" ? "Convert to Invoice" : "Jadikan Invoice")}
            </button>
          )}
          
          {invoice.type !== "quotation" && invoice.status !== "paid" && (
            <button
              onClick={() => setShowPayModal(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2 px-3 rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition"
            >
              <CreditCard className="w-4 h-4" /> Catat Pembayaran
            </button>
          )}

          {invoice.type !== "quotation" && (
            <Link
              href={`/delivery/new?invoice_id=${invoice.id}`}
              className="bg-orange-600 hover:bg-orange-700 text-white font-semibold py-2 px-3 rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition font-bold"
            >
              <Truck className="w-4 h-4" /> Buat Surat Jalan
            </Link>
          )}

          <a
            href={getWhatsAppShareLink()}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-3.5 rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition"
          >
            <MessageSquare className="w-4 h-4" /> Kirim WA
          </a>

          <button
            onClick={handleEmailShare}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-3.5 rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition"
          >
            <Mail className="w-4 h-4" /> {locale === "en" ? "Send Email" : "Kirim Email"}
          </button>

          <button 
            onClick={() => window.print()}
            className="p-2 text-slate-500 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition"
            title="Cetak Invoice"
          >
            <Printer className="w-4.5 h-4.5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Left Column: Invoice Sheet */}
        <div className="md:col-span-2 space-y-6 print-full-invoice">
          <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 md:p-8 shadow-sm print-card" style={{ borderTop: ["modern", "classic", "minimal"].includes(invoice.template_id || activeBusiness?.template_id || "modern") ? `6px solid ${invoice.template_color || activeBusiness?.template_color || "#004de6"}` : undefined }}>
            <InvoiceTemplate
              templateId={invoice.template_id || activeBusiness?.template_id || "modern"}
              templateColor={invoice.template_color || activeBusiness?.template_color || "#004de6"}
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
                name: activeBusiness?.name || "Nama Bisnis",
                address: activeBusiness?.address || "Alamat Bisnis",
                logo_url: activeBusiness?.logo_url,
                qris_url: activeBusiness?.qris_url,
                email: activeBusiness?.email,
                phone: activeBusiness?.phone,
                website: activeBusiness?.website,
              }}
              customer={{
                name: clientInfo.name || "Nama Pelanggan",
                address: clientInfo.address || "Alamat Pelanggan",
              }}
              locale={locale}
            />
          </div>

          {/* Saved Work Attachment (Page 2) */}
          {(invoice.attachment_image_url || invoice.attachment_text) && (
            <div 
              className="bg-white border border-slate-200 rounded-2xl p-6 md:p-8 shadow-sm print-card print-page-2 relative overflow-hidden" 
              style={{ borderTop: ["modern", "classic", "minimal"].includes(invoice.template_id || activeBusiness?.template_id || "modern") ? `6px solid ${invoice.template_color || activeBusiness?.template_color || "#004de6"}` : undefined }}
            >
              {/* Header Page 2 */}
              <div className="flex items-center justify-between border-b border-slate-200 pb-4 mb-6">
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-600" /> {t("workAttachment")}
                </h3>
                <span className="no-print inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">
                  <Lock className="w-3.5 h-3.5" /> {t("workAttachmentLocked")}
                </span>
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

          {/* Upload Work Attachment Form */}
          {(!invoice.attachment_image_url && !invoice.attachment_text) && (
            <div className="no-print bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
              <div>
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <UploadCloud className="w-4.5 h-4.5 text-blue-600" /> {t("workAttachment")}
                </h3>
                <p className="text-xs text-slate-500 mt-1">{t("workAttachmentDesc")}</p>
              </div>

              <div className="space-y-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-700">{t("workAttachmentTextLabel")}</label>
                  <textarea
                    rows={4}
                    value={attText}
                    onChange={(e) => setAttText(e.target.value)}
                    placeholder={t("workAttachmentTextPlaceholder")}
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-blue-600 transition"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-700">{t("workAttachmentImageLabel")}</label>
                  
                  {attPreview ? (
                    <div className="relative border border-slate-200 rounded-xl p-2 bg-slate-50 flex flex-col items-center gap-2">
                      <img src={attPreview} alt="Preview" className="max-h-60 object-contain rounded-lg" />
                      <button
                        type="button"
                        onClick={() => {
                          setAttFile(null);
                          setAttPreview(null);
                        }}
                        className="absolute top-4 right-4 bg-slate-900/60 hover:bg-slate-900 text-white p-1.5 rounded-full transition"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 hover:border-blue-400 rounded-xl p-6 cursor-pointer bg-slate-50/50 hover:bg-blue-50/10 transition text-center">
                      <UploadCloud className="w-8 h-8 text-slate-400 mb-2" />
                      <span className="text-xs font-semibold text-slate-600">Klik untuk pilih gambar</span>
                      <span className="text-[10px] text-slate-400 mt-1">JPEG, PNG, WebP, GIF (Maks 10MB)</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>

                {attError && (
                  <div className="p-3 bg-rose-50 border border-rose-100 text-rose-600 text-xs font-bold rounded-xl flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{attError}</span>
                  </div>
                )}

                <button
                  type="button"
                  disabled={attUploading}
                  onClick={handleSaveAttachment}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold rounded-xl transition text-xs shadow-xs"
                >
                  <Lock className="w-4 h-4" /> {attUploading ? t("saving") : t("workAttachmentSaveBtn")}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Timeline & Payment History */}
        <div className="space-y-6 no-print">
          
          {/* Public Link Share Card */}
          {invoice.public_token && (
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                  <ExternalLink className="w-4 h-4 text-blue-600" /> {locale === "en" ? "Client Link" : "Tautan Klien (Public Link)"}
                </h4>
                {isLinkExpired() ? (
                  <span className="px-2 py-0.5 text-[9px] font-bold bg-rose-50 text-rose-600 border border-rose-100 rounded-full">
                    {locale === "en" ? "Expired" : "Kedaluwarsa"}
                  </span>
                ) : (
                  <span className="px-2 py-0.5 text-[9px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-full">
                    {locale === "en" ? "Active" : "Aktif"}
                  </span>
                )}
              </div>
              <p className="text-[10px] text-slate-500 leading-relaxed">
                {invoice.type === "quotation"
                  ? (locale === "en"
                    ? "Secure non-login link to send to clients. Clients can view and download the PDF quote."
                    : "Tautan aman non-login untuk dikirimkan ke klien. Klien dapat melihat dan mengunduh PDF penawaran.")
                  : (locale === "en"
                    ? "Secure non-login link to send to clients (active for 3 days). Clients can download PDF and upload payment proof."
                    : "Tautan aman non-login untuk dikirimkan ke klien (aktif selama 3 hari). Klien dapat mengunduh PDF dan mengunggah bukti bayar.")}
              </p>
              
              <div className="flex items-center gap-2">
                <input 
                  type="text" 
                  readOnly 
                  value={`${window.location.origin}/inv/${invoice.public_token}`} 
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-[10px] font-mono text-slate-600 focus:outline-none"
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/inv/${invoice.public_token}`);
                    alert(locale === "en" ? "Link copied to clipboard!" : "Tautan disalin ke clipboard!");
                  }}
                  className="px-2.5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-100 rounded-lg text-[10px] font-bold transition shrink-0"
                >
                  {locale === "en" ? "Copy" : "Salin"}
                </button>
              </div>

              {invoice.type !== "quotation" && (
                <button
                  onClick={handleRefreshLink}
                  disabled={refreshingLink}
                  className="w-full mt-1.5 py-2 bg-slate-50 hover:bg-slate-100 disabled:opacity-50 text-slate-600 border border-slate-200 rounded-xl text-[10px] font-bold transition flex items-center justify-center gap-1.5"
                >
                  <RefreshCw className={`w-3 h-3 ${refreshingLink ? 'animate-spin' : ''}`} />
                  {locale === "en" ? "Refresh Link Expiry" : "Perbarui Masa Aktif Link"}
                </button>
              )}
            </div>
          )}

          {/* Timeline Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <History className="w-4.5 h-4.5 text-blue-600" /> {invoice.type === "quotation" ? (locale === "en" ? "Quotation History" : "Histori Penawaran") : (locale === "en" ? "Invoice History" : "Histori Tagihan")}
            </h4>

            <div className="space-y-4 text-xs">
              
              {/* Event: Paid status */}
              {invoice.status === "paid" && (
                <div className="flex items-start gap-2.5">
                  <div className="w-6 h-6 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-800">
                      {invoice.type === "quotation" 
                        ? (locale === "en" ? "Quotation Accepted" : "Penawaran Disetujui") 
                        : (locale === "en" ? "Payment Completed" : "Pembayaran Lunas")}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      {invoice.type === "quotation"
                        ? (locale === "en" ? "Quotation has been accepted and processed." : "Penawaran telah disetujui dan siap dikonversi/proses.")
                        : (locale === "en" ? "Full payment has been completed." : "Seluruh tagihan telah diselesaikan.")}
                    </p>
                  </div>
                </div>
              )}

              {/* Event: Partial payment */}
              {invoice.type !== "quotation" && invoice.paid_amount > 0 && invoice.status !== "paid" && (
                <div className="flex items-start gap-2.5">
                  <div className="w-6 h-6 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-100">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-800">Pembayaran Sebagian</p>
                    <p className="text-[10px] text-slate-400">Telah dibayar: {formatCurrency(invoice.paid_amount)}</p>
                  </div>
                </div>
              )}

              {/* Event: Sent */}
              {invoice.status !== "draft" && (
                <div className="flex items-start gap-2.5">
                  <div className="w-6 h-6 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
                    <Send className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-800">
                      {invoice.type === "quotation" 
                        ? (locale === "en" ? "Quotation Sent" : "Penawaran Terkirim") 
                        : (locale === "en" ? "Invoice Sent" : "Invoice Terkirim")}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      {invoice.type === "quotation"
                        ? (locale === "en" ? "Quotation issued and sent to customer." : "Penawaran diterbitkan dan dikirimkan ke pelanggan.")
                        : (locale === "en" ? "Invoice issued and sent to customer." : "Invoice diterbitkan dan dikirimkan ke pelanggan.")}
                    </p>
                  </div>
                </div>
              )}

              {/* Event: Created */}
              <div className="flex items-start gap-2.5">
                <div className="w-6 h-6 rounded-full bg-slate-50 text-slate-500 flex items-center justify-center shrink-0 border border-slate-200">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-bold text-slate-800">
                    {invoice.type === "quotation" 
                      ? (locale === "en" ? "Quotation Created" : "Penawaran Dibuat") 
                      : (locale === "en" ? "Invoice Created" : "Invoice Dibuat")}
                  </p>
                  <p className="text-[10px] text-slate-400">
                    {locale === "en" ? `Created on ${invoice.issue_date}` : `Dibuat pada tanggal ${invoice.issue_date}`}
                  </p>
                </div>
              </div>

            </div>
          </div>

          {/* Payment Receipts Card */}
          {invoice.type !== "quotation" && (
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <CreditCard className="w-4.5 h-4.5 text-blue-600" /> Riwayat Pembayaran
              </h4>

              <div className="divide-y divide-slate-100">
                {payments.length > 0 ? (
                  payments.map((p) => (
                    <div key={p.id} className="py-2.5 first:pt-0 last:pb-0 text-xs">
                      <div className="flex justify-between font-bold text-slate-800">
                        <span>{p.method}</span>
                        <span className="text-emerald-600">+{formatCurrency(p.amount)}</span>
                      </div>
                      <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                        <span>Tanggal: {p.payment_date}</span>
                        {p.reference_number && <span>Ref: {p.reference_number}</span>}
                      </div>
                      {p.notes && <p className="text-[10px] text-slate-500 mt-1 italic">"{p.notes}"</p>}
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400 text-center py-4">Belum ada transaksi terekam.</p>
                )}
              </div>
            </div>
          )}

        </div>

      </div>

      {/* RECORD PAYMENT MODAL */}
      {showPayModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full overflow-hidden shadow-2xl">
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">Catat Pembayaran</h3>
              <button 
                onClick={() => setShowPayModal(false)}
                className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleRecordPayment} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Nominal Pembayaran *</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-xs font-bold text-slate-400">{invoice.currency}</span>
                  <input
                    type="number"
                    required
                    max={invoice.remaining_amount}
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
                    className="w-full border border-slate-200 pl-12 pr-4 py-2.5 rounded-xl text-sm placeholder-slate-400 focus:outline-none focus:border-blue-500 transition font-bold"
                  />
                </div>
                <div className="text-[10px] text-slate-500 mt-1.5 space-y-1">
                  <p>Sisa tagihan yang harus dibayar: {formatCurrency(invoice.remaining_amount)}</p>
                  {invoice.currency !== "IDR" && (
                    <div className="mt-2 bg-blue-50/50 p-2 rounded-xl border border-blue-100 space-y-1 text-slate-700">
                      <div className="font-bold flex justify-between">
                        <span>Kurs Pembayaran ({payDate}):</span>
                        <span className="text-blue-600">1 {invoice.currency} = Rp {payExchangeRate ? payExchangeRate.toLocaleString("id-ID") : "..."}</span>
                      </div>
                      {payExchangeRate && invoice.exchange_rate && (
                        <div className="text-[9px] text-slate-500 pt-1 border-t border-slate-100 space-y-0.5">
                          <div className="flex justify-between">
                            <span>Kurs Awal Invoice:</span>
                            <span>1 {invoice.currency} = Rp {Number(invoice.exchange_rate).toLocaleString("id-ID")}</span>
                          </div>
                          <div className="flex justify-between font-semibold">
                            <span>Estimasi Selisih Kurs:</span>
                            {payExchangeRate !== Number(invoice.exchange_rate) ? (
                              <span className={payExchangeRate > Number(invoice.exchange_rate) ? "text-emerald-600" : "text-rose-600"}>
                                {payExchangeRate > Number(invoice.exchange_rate) ? "Laba Kurs" : "Rugi Kurs"} (Rp {Math.abs(payExchangeRate - Number(invoice.exchange_rate)).toLocaleString("id-ID")} / {invoice.currency})
                              </span>
                            ) : (
                              <span className="text-slate-500">Tidak ada selisih</span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Tanggal Transaksi *</label>
                  <input
                    type="date"
                    required
                    value={payDate}
                    onChange={(e) => setPayDate(e.target.value)}
                    className="w-full border border-slate-200 px-3 py-2.5 rounded-xl text-xs focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Metode Pembayaran *</label>
                  <select
                    value={payMethod}
                    onChange={(e) => setPayMethod(e.target.value)}
                    className="w-full bg-white border border-slate-200 px-3 py-2.5 rounded-xl text-xs focus:outline-none"
                  >
                    <option value="Transfer Bank">Transfer Bank</option>
                    <option value="Tunai">Cash / Tunai</option>
                    <option value="Kartu Kredit">Kartu Kredit</option>
                    <option value="E-Wallet">Gopay / OVO / QRIS</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Nomor Referensi (Opsional)</label>
                <input
                  type="text"
                  value={payRef}
                  onChange={(e) => setPayRef(e.target.value)}
                  placeholder="ID Transaksi / Nomor Resi"
                  className="w-full border border-slate-200 px-3 py-2 rounded-xl text-xs placeholder-slate-400 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Keterangan / Catatan Pembayaran</label>
                <textarea
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  placeholder="Catatan pelunasan..."
                  rows={2}
                  className="w-full border border-slate-200 px-3 py-2 rounded-xl text-xs placeholder-slate-400 focus:outline-none"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
                <button 
                  type="button" 
                  onClick={() => setShowPayModal(false)}
                  className="flex-1 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold rounded-xl text-xs transition text-center"
                >
                  Batal
                </button>
                <button 
                  type="submit" 
                  disabled={submittingPayment}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition shadow-sm text-center flex items-center justify-center"
                >
                  {submittingPayment ? "Mencatat..." : "Simpan Pembayaran"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
