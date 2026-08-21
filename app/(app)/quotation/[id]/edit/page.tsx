"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { 
  ArrowLeft, 
  Plus, 
  Trash2, 
  FileSpreadsheet, 
  Save, 
  ChevronDown, 
  Sparkles,
  Building2,
  User,
  Printer
} from "lucide-react";
import { useBusiness } from "../../../../../lib/context/BusinessContext";
import { createWebBrowserClient } from "../../../../../lib/supabase/client";
import { useLanguage } from "../../../../../lib/context/LanguageContext";

interface Customer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  tax_id: string | null;
}

interface CatalogItem {
  id: string;
  name: string;
  unit: string;
  unit_price: number;
}

interface QuotationItemInput {
  item_id: string | null;
  name: string;
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
  discount_type: "percentage" | "fixed" | null;
  discount_value: number;
  tax_included: boolean;
}

export default function EditQuotationPage() {
  const router = useRouter();
  const params = useParams();
  const quotationId = params?.id as string;

  const { activeBusiness, businesses } = useBusiness();
  const { t, locale } = useLanguage();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [catalogItems, setCatalogItems] = useState<CatalogItem[]>([]);
  
  // Loading & submit states
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Business switching state
  const [selectedBusinessId, setSelectedBusinessId] = useState("");

  // Form states
  const [quotationNumber, setQuotationNumber] = useState("");
  const [issueDate, setIssueDate] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  
  // Custom manual customer input if not choosing from database
  const [isManualCustomer, setIsManualCustomer] = useState(false);
  const [saveManualCustomer, setSaveManualCustomer] = useState(false);
  const [manualCustomer, setManualCustomer] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    tax_id: ""
  });

  // Quotation Items
  const [items, setItems] = useState<QuotationItemInput[]>([]);

  // Adjustments
  const [globalDiscountType, setGlobalDiscountType] = useState<"percentage" | "fixed" | null>(null);
  const [globalDiscountValue, setGlobalDiscountValue] = useState(0);
  const [taxRate, setTaxRate] = useState(0);
  const [shippingAmount, setShippingAmount] = useState(0);
  const [shippingLabel, setShippingLabel] = useState("Ongkos Kirim");
  
  // Additional notes
  const [notes, setNotes] = useState("");
  const [paymentInstructions, setPaymentInstructions] = useState("");
  const [signatureText, setSignatureText] = useState("");
  const [currency, setCurrency] = useState("IDR");

  // Template / Theme options
  const [templateId, setTemplateId] = useState("modern");
  const [templateColor, setTemplateColor] = useState("#004de6");

  const fetchBusinessSpecificMasters = async (bizId: string) => {
    try {
      const supabase = createWebBrowserClient();
      
      const { data: custData } = await supabase
        .from("customers")
        .select("id, name, email, phone, address, tax_id")
        .eq("business_id", bizId)
        .order("name", { ascending: true });

      setCustomers(custData || []);

      const { data: catData } = await supabase
        .from("items")
        .select("id, name, unit, unit_price")
        .eq("business_id", bizId)
        .order("name", { ascending: true });

      setCatalogItems(catData || []);
    } catch (err) {
      console.error("Error fetching masters:", err);
    }
  };

  useEffect(() => {
    const fetchQuotationDetail = async () => {
      if (!quotationId || !activeBusiness) return;
      try {
        setLoading(true);
        const supabase = createWebBrowserClient();

        // 1. Fetch quotation record
        const { data: q, error: qErr } = await supabase
          .from("invoices")
          .select("*")
          .eq("id", quotationId)
          .eq("type", "quotation")
          .single();

        if (qErr || !q) {
          alert("Penawaran tidak ditemukan.");
          router.push("/quotation");
          return;
        }

        setSelectedBusinessId(q.business_id);
        await fetchBusinessSpecificMasters(q.business_id);

        setQuotationNumber(q.invoice_number || "");
        setIssueDate(q.issue_date || "");
        setValidUntil(q.valid_until || "");
        setCurrency(q.currency || "IDR");

        // Customer selection
        if (q.customer_id) {
          setSelectedCustomerId(q.customer_id);
          setIsManualCustomer(false);
        } else if (q.customer_snapshot) {
          setIsManualCustomer(true);
          setManualCustomer({
            name: q.customer_snapshot.name || "",
            email: q.customer_snapshot.email || "",
            phone: q.customer_snapshot.phone || "",
            address: q.customer_snapshot.address || "",
            tax_id: q.customer_snapshot.tax_id || ""
          });
        }

        // Adjustments
        setGlobalDiscountType(q.discount_type || null);
        setGlobalDiscountValue(Number(q.discount_value || 0));
        setShippingAmount(Number(q.shipping_amount || 0));
        setShippingLabel(q.shipping_label || "Ongkos Kirim");
        setNotes(q.notes || "");
        setPaymentInstructions(q.payment_instructions || "");
        setSignatureText(q.signature_text || "");
        setTemplateId(q.template_id || "modern");
        setTemplateColor(q.template_color || "#004de6");

        if (q.taxes_snapshot && Array.isArray(q.taxes_snapshot) && q.taxes_snapshot.length > 0) {
          setTaxRate(Number(q.taxes_snapshot[0].rate || 0));
        } else {
          setTaxRate(0);
        }

        // 2. Fetch invoice items
        const { data: rawItems, error: itemsErr } = await supabase
          .from("invoice_items")
          .select("*")
          .eq("invoice_id", quotationId)
          .order("sort_order", { ascending: true });

        if (itemsErr) throw itemsErr;

        if (rawItems && rawItems.length > 0) {
          setItems(
            rawItems.map((ri) => ({
              item_id: ri.item_id || null,
              name: ri.name || "",
              description: ri.description || "",
              quantity: Number(ri.quantity || 1),
              unit: ri.unit || "pcs",
              unit_price: Number(ri.unit_price || 0),
              discount_type: ri.discount_type || null,
              discount_value: Number(ri.discount_value || 0),
              tax_included: Boolean(ri.tax_included)
            }))
          );
        } else {
          setItems([
            {
              item_id: null,
              name: "",
              description: "",
              quantity: 1,
              unit: "pcs",
              unit_price: 0,
              discount_type: null,
              discount_value: 0,
              tax_included: false
            }
          ]);
        }
      } catch (err) {
        console.error("Error loading quotation:", err);
        alert("Gagal memuat detail penawaran.");
      } finally {
        setLoading(false);
      }
    };

    fetchQuotationDetail();
  }, [quotationId, activeBusiness]);

  // Calculations
  const getSelectedCustomer = (): Partial<Customer> => {
    if (isManualCustomer) {
      return manualCustomer;
    }
    const found = customers.find(c => c.id === selectedCustomerId);
    return found || { name: "", email: "", phone: "", address: "", tax_id: "" };
  };

  const computeItemSubtotal = (item: QuotationItemInput) => {
    const qty = Number(item.quantity || 0);
    const price = Number(item.unit_price || 0);
    const val = Number(item.discount_value || 0);

    let base = qty * price;
    let disc = 0;
    if (item.discount_type === "percentage") {
      disc = base * (val / 100);
    } else if (item.discount_type === "fixed") {
      disc = val;
    }
    return Math.max(0, base - disc);
  };

  const computeItemDiscount = (item: QuotationItemInput) => {
    const qty = Number(item.quantity || 0);
    const price = Number(item.unit_price || 0);
    const val = Number(item.discount_value || 0);

    let base = qty * price;
    if (item.discount_type === "percentage") {
      return base * (val / 100);
    } else if (item.discount_type === "fixed") {
      return val;
    }
    return 0;
  };

  const getSubtotal = () => {
    return items.reduce((sum, item) => sum + computeItemSubtotal(item), 0);
  };

  const getGlobalDiscountAmount = () => {
    const sub = getSubtotal();
    const val = Number(globalDiscountValue || 0);
    if (globalDiscountType === "percentage") {
      return sub * (val / 100);
    } else if (globalDiscountType === "fixed") {
      return val;
    }
    return 0;
  };

  const getTaxAmount = () => {
    const baseAmount = getSubtotal() - getGlobalDiscountAmount();
    return baseAmount * (taxRate / 100);
  };

  const getTotal = () => {
    return Math.max(0, getSubtotal() - getGlobalDiscountAmount() + getTaxAmount() + Number(shippingAmount || 0));
  };

  // Item management
  const handleAddItem = () => {
    setItems([
      ...items,
      {
        item_id: null,
        name: "",
        description: "",
        quantity: 1,
        unit: "pcs",
        unit_price: 0,
        discount_type: null,
        discount_value: 0,
        tax_included: false
      }
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length === 1) return;
    const next = [...items];
    next.splice(index, 1);
    setItems(next);
  };

  const handleUpdateItem = (index: number, fields: Partial<QuotationItemInput>) => {
    const next = [...items];
    next[index] = { ...next[index], ...fields };
    setItems(next);
  };

  const handleSelectCatalogItem = (index: number, catalogId: string) => {
    const found = catalogItems.find(i => i.id === catalogId);
    if (found) {
      handleUpdateItem(index, {
        item_id: found.id,
        name: found.name,
        unit: found.unit,
        unit_price: found.unit_price
      });
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: currency,
      maximumFractionDigits: 0
    }).format(val);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBusiness) return;
    
    const clientInfo = getSelectedCustomer();
    if (!clientInfo.name) {
      alert("Silakan masukkan / pilih nama pelanggan.");
      return;
    }

    try {
      setSaving(true);
      const supabase = createWebBrowserClient();

      const sub = getSubtotal();
      const globDisc = getGlobalDiscountAmount();
      const tax = getTaxAmount();
      const tot = getTotal();

      let finalCustomerId = isManualCustomer ? null : (selectedCustomerId || null);

      if (isManualCustomer && saveManualCustomer) {
        const { data: newCust, error: custErr } = await supabase
          .from("customers")
          .insert({
            business_id: selectedBusinessId,
            name: manualCustomer.name,
            email: manualCustomer.email || null,
            phone: manualCustomer.phone || null,
            address: manualCustomer.address || null,
            tax_id: manualCustomer.tax_id || null
          })
          .select("id")
          .single();

        if (custErr) throw custErr;
        if (newCust) {
          finalCustomerId = newCust.id;
        }
      }

      // 1. Update Quotation Record
      const { error: qError } = await supabase
        .from("invoices")
        .update({
          customer_id: finalCustomerId,
          customer_snapshot: clientInfo,
          invoice_number: quotationNumber,
          issue_date: issueDate,
          valid_until: validUntil || null,
          currency: currency,
          subtotal: sub,
          discount_type: globalDiscountType,
          discount_value: globalDiscountValue,
          discount_amount: globDisc,
          tax_base: "after_discount",
          taxes_snapshot: taxRate > 0 ? [{ name: `PPN ${taxRate}%`, rate: taxRate, amount: tax }] : [],
          taxes_amount: tax,
          shipping_amount: Number(shippingAmount || 0),
          shipping_label: shippingLabel || "Ongkos Kirim",
          total_amount: tot,
          remaining_amount: tot,
          payment_instructions: paymentInstructions || null,
          notes: notes || null,
          signature_text: signatureText || null,
          template_id: templateId,
          template_color: templateColor
        })
        .eq("id", quotationId);

      if (qError) throw qError;

      // 2. Replace Items (Delete old & Insert new)
      await supabase.from("invoice_items").delete().eq("invoice_id", quotationId);

      const quotationItemsRows = items.map((item, idx) => ({
        invoice_id: quotationId,
        item_id: item.item_id,
        sort_order: idx,
        name: item.name || "Item Tanpa Nama",
        description: item.description || null,
        quantity: Number(item.quantity || 0),
        unit: item.unit || "pcs",
        unit_price: Number(item.unit_price || 0),
        discount_type: item.discount_type,
        discount_value: Number(item.discount_value || 0),
        discount_amount: computeItemDiscount(item),
        tax_included: item.tax_included,
        tax_base_per_item: "after_discount",
        subtotal: computeItemSubtotal(item)
      }));

      const { error: itemsError } = await supabase
        .from("invoice_items")
        .insert(quotationItemsRows);

      if (itemsError) throw itemsError;

      alert("Perubahan Penawaran berhasil disimpan!");
      router.push("/quotation");
    } catch (err: any) {
      console.error("Error updating quotation:", err);
      alert(err.message || "Gagal memperbarui Penawaran.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs text-slate-500 font-semibold mt-2">Memuat data penawaran...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 rounded-xl transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-blue-600" /> Ubah Penawaran Harga ({quotationNumber})
            </h2>
            <p className="text-xs text-slate-500">Perbarui rincian harga, masa berlaku, dan penawaran ke klien.</p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            type="button"
            onClick={() => router.push("/quotation")}
            className="px-4 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold rounded-xl text-xs transition"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs shadow-md transition flex items-center gap-2"
          >
            <Save className="w-4 h-4" /> {saving ? "Menyimpan..." : "Simpan Perubahan"}
          </button>
        </div>
      </div>

      <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Form Details */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Information Card */}
          <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
              Informasi Penawaran & Pelanggan
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Nomor Penawaran *</label>
                <input
                  type="text"
                  required
                  value={quotationNumber}
                  onChange={(e) => setQuotationNumber(e.target.value)}
                  className="w-full border border-slate-200 px-3 py-2 rounded-xl text-sm font-semibold focus:outline-none focus:border-blue-500 transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Tanggal *</label>
                  <input
                    type="date"
                    required
                    value={issueDate}
                    onChange={(e) => setIssueDate(e.target.value)}
                    className="w-full border border-slate-200 px-3 py-2 rounded-xl text-xs font-semibold focus:outline-none focus:border-blue-500 transition"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Berlaku Hingga</label>
                  <input
                    type="date"
                    value={validUntil}
                    onChange={(e) => setValidUntil(e.target.value)}
                    className="w-full border border-slate-200 px-3 py-2 rounded-xl text-xs font-semibold focus:outline-none focus:border-blue-500 transition"
                  />
                </div>
              </div>
            </div>

            {/* Customer Selector */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Penerima Penawaran (Klien) *</label>
                <button
                  type="button"
                  onClick={() => setIsManualCustomer(!isManualCustomer)}
                  className="text-xs font-bold text-blue-600 hover:underline"
                >
                  {isManualCustomer ? "Pilih dari Daftar Pelanggan" : "+ Input Manual Klien Baru"}
                </button>
              </div>

              {!isManualCustomer ? (
                <select
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  className="w-full border border-slate-200 px-3 py-2.5 rounded-xl text-sm font-semibold text-slate-700 bg-white focus:outline-none focus:border-blue-500 transition"
                >
                  <option value="">-- Pilih Pelanggan --</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>{c.name} {c.email ? `(${c.email})` : ''}</option>
                  ))}
                </select>
              ) : (
                <div className="space-y-3 p-4 bg-slate-50 border border-slate-200 rounded-xl">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      type="text"
                      required
                      placeholder="Nama Perusahaan / Klien *"
                      value={manualCustomer.name}
                      onChange={(e) => setManualCustomer({ ...manualCustomer, name: e.target.value })}
                      className="border border-slate-200 px-3 py-2 rounded-xl text-xs bg-white focus:outline-none focus:border-blue-500"
                    />
                    <input
                      type="email"
                      placeholder="Email Klien"
                      value={manualCustomer.email}
                      onChange={(e) => setManualCustomer({ ...manualCustomer, email: e.target.value })}
                      className="border border-slate-200 px-3 py-2 rounded-xl text-xs bg-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      type="text"
                      placeholder="No. Telepon"
                      value={manualCustomer.phone}
                      onChange={(e) => setManualCustomer({ ...manualCustomer, phone: e.target.value })}
                      className="border border-slate-200 px-3 py-2 rounded-xl text-xs bg-white focus:outline-none focus:border-blue-500"
                    />
                    <input
                      type="text"
                      placeholder="Alamat Lengkap"
                      value={manualCustomer.address}
                      onChange={(e) => setManualCustomer({ ...manualCustomer, address: e.target.value })}
                      className="border border-slate-200 px-3 py-2 rounded-xl text-xs bg-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Items Table Card */}
          <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">Rincian Item Penawaran</h3>
              <button
                type="button"
                onClick={handleAddItem}
                className="bg-blue-50 hover:bg-blue-100 text-blue-600 font-bold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1 transition"
              >
                <Plus className="w-3.5 h-3.5" /> Tambah Baris
              </button>
            </div>

            <div className="space-y-4">
              {items.map((item, idx) => (
                <div key={idx} className="p-4 border border-slate-200 rounded-xl bg-slate-50/50 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Item #{idx + 1}</span>
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        className="text-slate-400 hover:text-rose-600 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2 space-y-1">
                      <select
                        onChange={(e) => handleSelectCatalogItem(idx, e.target.value)}
                        className="w-full border border-slate-200 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-white text-slate-700 mb-1"
                      >
                        <option value="">-- Impor dari Katalog Produk --</option>
                        {catalogItems.map((cat) => (
                          <option key={cat.id} value={cat.id}>{cat.name} ({cat.unit})</option>
                        ))}
                      </select>
                      <input
                        type="text"
                        required
                        placeholder="Nama Item / Jasa *"
                        value={item.name}
                        onChange={(e) => handleUpdateItem(idx, { name: e.target.value })}
                        className="w-full border border-slate-200 px-3 py-2 rounded-xl text-xs font-bold bg-white focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-400 uppercase">Kuantitas</label>
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => handleUpdateItem(idx, { quantity: Number(e.target.value) })}
                          className="w-full border border-slate-200 px-2.5 py-1.5 rounded-xl text-xs font-bold bg-white"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-400 uppercase">Satuan</label>
                        <input
                          type="text"
                          value={item.unit}
                          onChange={(e) => handleUpdateItem(idx, { unit: e.target.value })}
                          className="w-full border border-slate-200 px-2.5 py-1.5 rounded-xl text-xs font-bold bg-white"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-400 uppercase">Harga Satuan</label>
                      <input
                        type="number"
                        min="0"
                        value={item.unit_price}
                        onChange={(e) => handleUpdateItem(idx, { unit_price: Number(e.target.value) })}
                        className="w-full border border-slate-200 px-3 py-1.5 rounded-xl text-xs font-bold bg-white"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-1.5">
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-400 uppercase">Tipe Diskon</label>
                        <select
                          value={item.discount_type || ""}
                          onChange={(e) => handleUpdateItem(idx, { discount_type: (e.target.value as any) || null })}
                          className="w-full border border-slate-200 px-2 py-1.5 rounded-xl text-xs font-semibold bg-white"
                        >
                          <option value="">Tanpa Diskon</option>
                          <option value="percentage">% Persen</option>
                          <option value="fixed">Nominal (Rp)</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-400 uppercase">Nilai Diskon</label>
                        <input
                          type="number"
                          min="0"
                          value={item.discount_value}
                          onChange={(e) => handleUpdateItem(idx, { discount_value: Number(e.target.value) })}
                          className="w-full border border-slate-200 px-2 py-1.5 rounded-xl text-xs font-bold bg-white"
                        />
                      </div>
                    </div>

                    <div className="flex flex-col justify-end text-right">
                      <span className="text-[9px] font-bold text-slate-400 uppercase block">Subtotal Item</span>
                      <span className="text-sm font-extrabold text-slate-900">{formatCurrency(computeItemSubtotal(item))}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Notes & Terms Card */}
          <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3">Catatan & Syarat Penawaran</h3>
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Catatan Tambahan / Syarat Ketentuan Penawaran</label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="misal: Syarat pembayaran DP 30%, garansi 1 tahun, pengiriman gratis area Jabodetabek."
                  className="w-full border border-slate-200 p-3 rounded-xl text-xs focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Instruksi Pembayaran / Rekening Bank</label>
                <textarea
                  rows={2}
                  value={paymentInstructions}
                  onChange={(e) => setPaymentInstructions(e.target.value)}
                  placeholder="misal: Pembayaran transfer ke Bank BCA 123456789 a.n PT Perusahaan"
                  className="w-full border border-slate-200 p-3 rounded-xl text-xs focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>

        </div>

        {/* Right Column: Totals & Summary */}
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-4 sticky top-6">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3">Ringkasan Biaya</h3>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between font-semibold text-slate-600">
                <span>Subtotal Baris</span>
                <span className="font-bold text-slate-900">{formatCurrency(getSubtotal())}</span>
              </div>

              {/* Global Discount */}
              <div className="space-y-1 pt-2 border-t border-slate-100">
                <label className="text-[10px] font-bold text-slate-400 uppercase block">Diskon Tambahan (Global)</label>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={globalDiscountType || ""}
                    onChange={(e) => setGlobalDiscountType((e.target.value as any) || null)}
                    className="border border-slate-200 p-2 rounded-xl text-xs bg-white font-semibold"
                  >
                    <option value="">Tanpa Diskon</option>
                    <option value="percentage">% Persen</option>
                    <option value="fixed">Nominal (Rp)</option>
                  </select>
                  <input
                    type="number"
                    min="0"
                    value={globalDiscountValue}
                    onChange={(e) => setGlobalDiscountValue(Number(e.target.value))}
                    className="border border-slate-200 p-2 rounded-xl text-xs font-bold"
                  />
                </div>
              </div>

              {/* Tax PPN */}
              <div className="space-y-1 pt-2 border-t border-slate-100">
                <label className="text-[10px] font-bold text-slate-400 uppercase block">Pajak Pertambahan Nilai (PPN)</label>
                <select
                  value={taxRate}
                  onChange={(e) => setTaxRate(Number(e.target.value))}
                  className="w-full border border-slate-200 p-2 rounded-xl text-xs font-semibold bg-white"
                >
                  <option value={0}>Tanpa PPN (0%)</option>
                  <option value={11}>PPN 11%</option>
                  <option value={12}>PPN 12%</option>
                </select>
              </div>

              {/* Shipping Fee */}
              <div className="space-y-1 pt-2 border-t border-slate-100">
                <label className="text-[10px] font-bold text-slate-400 uppercase block">Biaya Pengiriman / Tambahan</label>
                <input
                  type="number"
                  min="0"
                  value={shippingAmount}
                  onChange={(e) => setShippingAmount(Number(e.target.value))}
                  className="w-full border border-slate-200 p-2 rounded-xl text-xs font-bold"
                />
              </div>

              <div className="border-t border-slate-200 pt-3 flex justify-between items-baseline">
                <span className="text-xs font-extrabold text-slate-900 uppercase">Total Nilai Penawaran</span>
                <span className="text-xl font-extrabold text-blue-600">{formatCurrency(getTotal())}</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs shadow-md transition flex items-center justify-center gap-2 mt-4"
            >
              <Save className="w-4 h-4" /> {saving ? "Menyimpan..." : "Simpan Perubahan Penawaran"}
            </button>
          </div>
        </div>

      </form>
    </div>
  );
}
