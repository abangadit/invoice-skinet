"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { 
  BellRing, 
  ArrowLeft, 
  MessageSquare, 
  Mail, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  Calendar,
  ExternalLink
} from "lucide-react";
import { useBusiness } from "../../../../lib/context/BusinessContext";
import { createWebBrowserClient } from "../../../../lib/supabase/client";

interface InvoiceDue {
  id: string;
  invoice_number: string;
  customer_snapshot: any;
  status: string;
  due_date: string;
  remaining_amount: number;
  total_amount: number;
  currency: string;
  public_token: string | null;
}

export default function InvoiceDuePage() {
  const { activeBusiness } = useBusiness();
  const [invoices, setInvoices] = useState<InvoiceDue[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overdue" | "today" | "3days">("overdue");

  const fetchDueInvoices = async () => {
    if (!activeBusiness) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const supabase = createWebBrowserClient();

      const { data, error } = await supabase
        .from("invoices")
        .select("id, invoice_number, status, total_amount, remaining_amount, due_date, currency, public_token, customer_snapshot")
        .eq("business_id", activeBusiness.id)
        .eq("type", "invoice")
        .neq("status", "draft")
        .neq("status", "paid")
        .gt("remaining_amount", 0)
        .order("due_date", { ascending: true });

      if (error) throw error;
      setInvoices(data || []);
    } catch (err) {
      console.error("Error fetching due invoices:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDueInvoices();
  }, [activeBusiness]);

  const formatCurrency = (val: number, currencyCode: string) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: currencyCode || "IDR",
      maximumFractionDigits: 0
    }).format(val);
  };

  // Date category filters
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const overdueInvoices: InvoiceDue[] = [];
  const todayInvoices: InvoiceDue[] = [];
  const threeDaysInvoices: InvoiceDue[] = [];

  invoices.forEach((inv) => {
    if (!inv.due_date || Number(inv.remaining_amount) <= 0) return;
    const dueDate = new Date(inv.due_date);
    dueDate.setHours(0, 0, 0, 0);

    const diffTime = dueDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      overdueInvoices.push(inv);
    } else if (diffDays === 0) {
      todayInvoices.push(inv);
    } else if (diffDays > 0 && diffDays <= 3) {
      threeDaysInvoices.push(inv);
    }
  });

  const getActiveList = () => {
    if (activeTab === "overdue") return overdueInvoices;
    if (activeTab === "today") return todayInvoices;
    return threeDaysInvoices;
  };

  const getWAReminderLink = (inv: InvoiceDue, category: "overdue" | "today" | "3days") => {
    const custName = inv.customer_snapshot?.name || "Pelanggan";
    const amountStr = formatCurrency(inv.remaining_amount, inv.currency);
    const publicUrl = `${window.location.origin}/inv/${inv.public_token}`;
    
    let text = "";
    if (category === "overdue") {
      text = `Halo ${custName},\nKami ingin mengingatkan bahwa Invoice ${inv.invoice_number} sebesar ${amountStr} telah MELEWATI jatuh tempo pada tanggal ${inv.due_date}.\nMohon segera lakukan pembayaran. Detail tagihan & link pembayaran:\n${publicUrl}\n\nTerima kasih.`;
    } else if (category === "today") {
      text = `Halo ${custName},\nIngat pembayaran Invoice ${inv.invoice_number} sebesar ${amountStr} JATUH TEMPO HARI INI (${inv.due_date}).\nMohon lakukan transfer pembayaran hari ini. Link detail:\n${publicUrl}\n\nTerima kasih.`;
    } else {
      text = `Halo ${custName},\nKami ingatkan bahwa Invoice ${inv.invoice_number} sebesar ${amountStr} akan segera jatuh tempo dalam 3 hari pada tanggal ${inv.due_date}.\nDetail tagihan & instruksi bank:\n${publicUrl}\n\nTerima kasih.`;
    }

    return `https://wa.me/${inv.customer_snapshot?.phone || ""}?text=${encodeURIComponent(text)}`;
  };

  const getEmailReminderLink = (inv: InvoiceDue, category: "overdue" | "today" | "3days") => {
    const email = inv.customer_snapshot?.email || "";
    const subject = `Reminder Tagihan: Invoice ${inv.invoice_number}`;
    const custName = inv.customer_snapshot?.name || "Pelanggan";
    const amountStr = formatCurrency(inv.remaining_amount, inv.currency);
    const publicUrl = `${window.location.origin}/inv/${inv.public_token}`;

    let body = "";
    if (category === "overdue") {
      body = `Yth. ${custName},\n\nKami menginformasikan bahwa pembayaran Invoice ${inv.invoice_number} sebesar ${amountStr} telah melewati tanggal jatuh tempo (${inv.due_date}).\n\nSilakan kunjungi link berikut untuk detail tagihan dan konfirmasi bukti bayar:\n${publicUrl}\n\nHormat kami,\n${activeBusiness?.name}`;
    } else if (category === "today") {
      body = `Yth. ${custName},\n\nKami mengingatkan bahwa pembayaran Invoice ${inv.invoice_number} sebesar ${amountStr} jatuh tempo hari ini (${inv.due_date}).\n\nSilakan kunjungi link berikut untuk rincian tagihan:\n${publicUrl}\n\nHormat kami,\n${activeBusiness?.name}`;
    } else {
      body = `Yth. ${custName},\n\nKami menginformasikan bahwa pembayaran Invoice ${inv.invoice_number} sebesar ${amountStr} akan jatuh tempo pada ${inv.due_date} (3 hari lagi).\n\nDetail tagihan selengkapnya dapat diakses di:\n${publicUrl}\n\nHormat kami,\n${activeBusiness?.name}`;
    }

    return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-slate-200 pb-4">
        <Link 
          href="/invoice"
          className="p-2 text-slate-400 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <BellRing className="w-5 h-5 text-amber-500" /> Pengingat Jatuh Tempo (Due Alerts)
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">Pantau tagihan mendekati jatuh tempo dan kirimkan pengingat.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
        <button
          onClick={() => setActiveTab("overdue")}
          className={`flex-1 py-3 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 ${
            activeTab === "overdue" 
              ? "bg-rose-50 text-rose-600 font-extrabold" 
              : "text-slate-500 hover:bg-slate-50"
          }`}
        >
          <AlertTriangle className="w-4 h-4 text-rose-500" /> Lewat Jatuh Tempo ({overdueInvoices.length})
        </button>
        <button
          onClick={() => setActiveTab("today")}
          className={`flex-1 py-3 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 ${
            activeTab === "today" 
              ? "bg-amber-50 text-amber-600 font-extrabold" 
              : "text-slate-500 hover:bg-slate-50"
          }`}
        >
          <Clock className="w-4 h-4 text-amber-500" /> Hari H ({todayInvoices.length})
        </button>
        <button
          onClick={() => setActiveTab("3days")}
          className={`flex-1 py-3 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 ${
            activeTab === "3days" 
              ? "bg-blue-50 text-blue-600 font-extrabold" 
              : "text-slate-500 hover:bg-slate-50"
          }`}
        >
          <Calendar className="w-4 h-4 text-blue-500" /> 3 Hari Lagi ({threeDaysInvoices.length})
        </button>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs text-slate-500 font-semibold mt-2">Memeriksa tanggal jatuh tempo...</p>
        </div>
      ) : getActiveList().length > 0 ? (
        <div className="space-y-3">
          {getActiveList().map((inv) => (
            <div 
              key={inv.id}
              className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 card-shadow-hover transition"
            >
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border ${
                  activeTab === "overdue" ? "bg-rose-50 border-rose-100 text-rose-600" :
                  activeTab === "today" ? "bg-amber-50 border-amber-100 text-amber-600" :
                  "bg-blue-50 border-blue-100 text-blue-600"
                }`}>
                  {activeTab === "overdue" ? <AlertTriangle className="w-5.5 h-5.5" /> : <Clock className="w-5.5 h-5.5" />}
                </div>
                
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-bold text-slate-400">{inv.invoice_number}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      activeTab === "overdue" ? "bg-rose-50 text-rose-600 border border-rose-100" :
                      activeTab === "today" ? "bg-amber-50 text-amber-600 border border-amber-100" :
                      "bg-blue-50 text-blue-600 border border-blue-100"
                    }`}>
                      {activeTab === "overdue" ? "Overdue" : activeTab === "today" ? "Due Today" : "Due Soon"}
                    </span>
                  </div>
                  <h4 className="font-bold text-slate-900 text-sm">{inv.customer_snapshot?.name || "Pelanggan Umum"}</h4>
                  <p className="text-xs text-slate-500 flex items-center gap-1">
                    Jatuh tempo pada: <span className="font-semibold text-slate-700">{inv.due_date}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between md:justify-end gap-4 border-t md:border-t-0 border-slate-100 pt-3 md:pt-0">
                <div className="md:text-right">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Tagihan Tertunggak</span>
                  <span className="text-base font-extrabold text-slate-950">
                    {formatCurrency(inv.remaining_amount, inv.currency)}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <a
                    href={getWAReminderLink(inv, activeTab)}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Kirim WhatsApp Reminder"
                    className="p-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border border-emerald-100 rounded-xl transition flex items-center gap-1.5 text-xs font-bold"
                  >
                    <MessageSquare className="w-4 h-4" /> WA
                  </a>
                  {inv.customer_snapshot?.email && (
                    <a
                      href={getEmailReminderLink(inv, activeTab)}
                      title="Kirim Email Reminder"
                      className="p-2.5 bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-100 rounded-xl transition flex items-center gap-1.5 text-xs font-bold"
                    >
                      <Mail className="w-4 h-4" /> Email
                    </a>
                  )}
                  <Link
                    href={`/invoice/${inv.id}`}
                    title="Buka Invoice"
                    className="p-2.5 bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-xl transition"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </Link>
                </div>
              </div>

            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-400 shadow-sm">
          <CheckCircle2 className="w-12 h-12 mx-auto text-emerald-500 mb-3" />
          <p className="text-sm font-semibold">Bebas Tunggakan!</p>
          <p className="text-xs text-slate-500 mt-0.5">Tidak ada invoice unpaid yang jatuh tempo dalam kriteria ini.</p>
        </div>
      )}

    </div>
  );
}
