"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  FileSpreadsheet, 
  Plus, 
  Search, 
  Trash2, 
  Edit2,
  Eye, 
  Calendar,
  CheckCircle,
  Clock,
  ArrowRight,
  TrendingUp,
  FileText,
  Briefcase
} from "lucide-react";
import { useBusiness } from "../../../lib/context/BusinessContext";
import { createWebBrowserClient } from "../../../lib/supabase/client";
import Pagination from "../../../components/Pagination";

interface Quotation {
  id: string;
  invoice_number: string;
  customer_snapshot: any;
  status: string;
  issue_date: string;
  valid_until: string | null;
  total_amount: number;
  currency: string;
  public_token: string | null;
  converted_to_project_id?: string | null;
}

export default function QuotationListPage() {
  const router = useRouter();
  const { activeBusiness } = useBusiness();
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [convertingId, setConvertingId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;

  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  const fetchQuotations = async () => {
    if (!activeBusiness) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const supabase = createWebBrowserClient();

      const { data, error } = await supabase
        .from("invoices")
        .select("id, invoice_number, status, total_amount, issue_date, valid_until, currency, public_token, customer_snapshot, converted_to_project_id")
        .eq("business_id", activeBusiness.id)
        .eq("type", "quotation")
        .order("issue_date", { ascending: false });

      if (error) throw error;
      setQuotations(data || []);
    } catch (err) {
      console.error("Error fetching quotations:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuotations();
  }, [activeBusiness]);

  const handleDelete = async (id: string, number: string) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus Quotation ${number}?`)) return;
    try {
      const supabase = createWebBrowserClient();
      const { error } = await supabase.from("invoices").delete().eq("id", id);
      if (error) throw error;
      fetchQuotations();
    } catch (err) {
      console.error("Error deleting quotation:", err);
      alert("Gagal menghapus quotation.");
    }
  };

  const handleConvertToInvoice = async (q: Quotation) => {
    if (!activeBusiness) return;
    if (!confirm(`Konversi Penawaran ${q.invoice_number} menjadi Invoice baru?`)) return;

    try {
      setConvertingId(q.id);
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

      // Fetch quotation details first
      const { data: qDetail, error: qError } = await supabase
        .from("invoices")
        .select("*")
        .eq("id", q.id)
        .single();

      if (qError) throw qError;

      // Fetch items of the quotation
      const { data: qItems, error: itemsError } = await supabase
        .from("invoice_items")
        .select("*")
        .eq("invoice_id", q.id);

      if (itemsError) throw itemsError;

      // 1. Insert Invoice
      const { data: newInv, error: insertError } = await supabase
        .from("invoices")
        .insert({
          business_id: activeBusiness.id,
          customer_id: qDetail.customer_id,
          customer_snapshot: qDetail.customer_snapshot,
          invoice_number: invoiceNumber,
          type: "invoice",
          status: "draft",
          issue_date: now.toISOString().split("T")[0],
          due_date: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString().split("T")[0], // default 14 days
          currency: qDetail.currency,
          subtotal: qDetail.subtotal,
          discount_type: qDetail.discount_type,
          discount_value: qDetail.discount_value,
          discount_amount: qDetail.discount_amount,
          tax_base: qDetail.tax_base,
          taxes_snapshot: qDetail.taxes_snapshot,
          taxes_amount: qDetail.taxes_amount,
          shipping_amount: qDetail.shipping_amount,
          shipping_label: qDetail.shipping_label,
          total_amount: qDetail.total_amount,
          remaining_amount: qDetail.total_amount,
          payment_methods: qDetail.payment_methods,
          payment_instructions: qDetail.payment_instructions,
          notes: qDetail.notes,
          signature_text: qDetail.signature_text,
          stamp_paid: false,
          public_token: publicToken,
          converted_from_id: q.id
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // 2. Insert items
      const newItems = (qItems || []).map((item, idx) => ({
        invoice_id: newInv.id,
        item_id: item.item_id,
        sort_order: idx,
        name: item.name,
        description: item.description,
        quantity: item.quantity,
        unit: item.unit,
        unit_price: item.unit_price,
        discount_type: item.discount_type,
        discount_value: item.discount_value,
        discount_amount: item.discount_amount,
        tax_included: item.tax_included,
        tax_base_per_item: item.tax_base_per_item,
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
        .eq("id", q.id);

      // Increment business counter
      await supabase
        .from("businesses")
        .update({ invoice_counter: (activeBusiness.invoice_counter || 1) + 1 })
        .eq("id", activeBusiness.id);

      alert("Berhasil mengonversi penawaran ke invoice baru!");
      router.push(`/invoice/${newInv.id}`);
    } catch (err) {
      console.error("Error converting quotation:", err);
      alert("Gagal mengonversi penawaran.");
    } finally {
      setConvertingId(null);
    }
  };

  const formatCurrency = (val: number, currencyCode: string) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: currencyCode || "IDR",
      maximumFractionDigits: 0
    }).format(val);
  };

  const filteredQuotations = quotations.filter((q) => {
    const custName = q.customer_snapshot?.name || "Pelanggan Umum";
    return (
      q.invoice_number.toLowerCase().includes(search.toLowerCase()) || 
      custName.toLowerCase().includes(search.toLowerCase())
    );
  });

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            Quotations
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">Kelola penawaran harga pra-kesepakatan (pre-deal) proyek Anda.</p>
        </div>
        <Link
          href="/quotation/new"
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 px-4 rounded-xl text-sm flex items-center justify-center gap-1.5 shadow-sm transition shrink-0 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" /> Buat Penawaran
        </Link>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari nomor penawaran atau pelanggan..."
          className="w-full bg-white border border-slate-200 pl-10 pr-4 py-2.5 rounded-xl text-sm placeholder-slate-400 focus:outline-none focus:border-blue-500 transition shadow-sm"
        />
      </div>

      {/* Quotations List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs text-slate-500 font-semibold mt-2">Memuat penawaran...</p>
        </div>
      ) : filteredQuotations.length > 0 ? (
        <div className="space-y-3">
          {filteredQuotations.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE).map((q) => (
            <div 
              key={q.id} 
              className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 card-shadow-hover transition"
            >
              <div className="flex items-start gap-4 flex-1">
                <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 shrink-0">
                  <FileSpreadsheet className="w-6 h-6 text-blue-600" />
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
                    {q.invoice_number}
                  </span>
                  <h4 className="font-bold text-slate-900 text-sm">
                    {q.customer_snapshot?.name || "Pelanggan Umum"}
                  </h4>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" /> Dibuat: {q.issue_date}
                    </span>
                    {q.valid_until && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" /> Berlaku Hingga: {q.valid_until}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t sm:border-t-0 border-slate-100 pt-3 sm:pt-0 gap-3">
                <div className="sm:text-right">
                  <div className="text-base font-extrabold text-slate-900">
                    {formatCurrency(q.total_amount, q.currency)}
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  {q.converted_to_project_id ? (
                    <Link
                      href={`/project/${q.converted_to_project_id}`}
                      className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-100 rounded-xl text-xs font-bold transition flex items-center gap-1"
                    >
                      <Briefcase className="w-3.5 h-3.5" /> Proyek
                    </Link>
                  ) : (
                    <Link
                      href={`/project/new?quotation_id=${q.id}`}
                      className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-150 rounded-xl text-xs font-bold transition flex items-center gap-1"
                      title="Konversi ke Proyek Baru"
                    >
                      <Briefcase className="w-3.5 h-3.5" /> Jadikan Proyek
                    </Link>
                  )}

                  {!q.converted_to_project_id && (
                    <button
                      onClick={() => handleConvertToInvoice(q)}
                      disabled={convertingId === q.id}
                      className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border border-emerald-100 rounded-xl text-xs font-bold transition flex items-center gap-1"
                      title="Konversi ke Invoice Resmi"
                    >
                      <ArrowRight className="w-3.5 h-3.5" /> {convertingId === q.id ? "Memproses..." : "Jadikan Invoice"}
                    </button>
                  )}

                  <Link 
                    href={`/invoice/${q.id}`} // since it shares the page schema, it's renderable under detail page
                    className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                    title="Pratinjau"
                  >
                    <Eye className="w-4 h-4" />
                  </Link>

                  <Link 
                    href={`/quotation/${q.id}/edit`}
                    className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition"
                    title="Ubah Penawaran"
                  >
                    <Edit2 className="w-4 h-4" />
                  </Link>
                  
                  <button 
                    onClick={() => handleDelete(q.id, q.invoice_number)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                    title="Hapus"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
          <Pagination
            currentPage={currentPage}
            totalItems={filteredQuotations.length}
            pageSize={PAGE_SIZE}
            onPageChange={setCurrentPage}
          />
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-400 shadow-sm">
          <FileSpreadsheet className="w-12 h-12 mx-auto text-slate-200 mb-3" />
          <p className="text-sm font-semibold">Tidak ada penawaran harga dibuat</p>
          <Link 
            href="/quotation/new"
            className="text-xs font-bold text-blue-600 hover:underline mt-1 inline-block"
          >
            Buat Penawaran Pertama
          </Link>
        </div>
      )}

    </div>
  );
}
