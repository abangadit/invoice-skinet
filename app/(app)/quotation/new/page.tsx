"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
import { useBusiness } from "../../../../lib/context/BusinessContext";
import { createWebBrowserClient } from "../../../../lib/supabase/client";
import { useLanguage } from "../../../../lib/context/LanguageContext";

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

export default function NewQuotationPage() {
  const router = useRouter();
  const { activeBusiness, businesses, reloadBusiness, setActiveBusiness } = useBusiness();
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
  const [items, setItems] = useState<QuotationItemInput[]>([
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

  // Adjustments
  const [globalDiscountType, setGlobalDiscountType] = useState<"percentage" | "fixed" | null>(null);
  const [globalDiscountValue, setGlobalDiscountValue] = useState(0);
  const [taxRate, setTaxRate] = useState(0); // 0 or 11
  const [shippingAmount, setShippingAmount] = useState(0);
  const [shippingLabel, setShippingLabel] = useState("Ongkos Kirim");
  const [paymentInstructions, setPaymentInstructions] = useState("");
  const [notes, setNotes] = useState("");
  const [signatureText, setSignatureText] = useState("");
  const [currency, setCurrency] = useState("IDR");

  // Template chosen
  const [templateId, setTemplateId] = useState("modern");
  const [templateColor, setTemplateColor] = useState("#004de6");
  const [isInitialized, setIsInitialized] = useState(false);

  const fetchBusinessSpecificMasters = async (businessId: string) => {
    try {
      const supabase = createWebBrowserClient();
      const { data: custData } = await supabase
        .from("customers")
        .select("*")
        .eq("business_id", businessId)
        .order("name", { ascending: true });

      const { data: itemData } = await supabase
        .from("items")
        .select("*")
        .eq("business_id", businessId)
        .order("name", { ascending: true });

      setCustomers(custData || []);
      setCatalogItems(itemData || []);
    } catch (err) {
      console.error("Error loading master records for selected business:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSwitchBusiness = (bizId: string) => {
    setSelectedBusinessId(bizId);
    const biz = businesses.find(b => b.id === bizId);
    if (biz) {
      const today = new Date();
      const yyyy = String(today.getFullYear());
      const mm = String(today.getMonth() + 1).padStart(2, "0");
      const count = String(biz.invoice_counter || 1).padStart(4, "0");
      setQuotationNumber(`QTN/${yyyy}/${mm}/${count}`);

      setCurrency(biz.default_currency || "IDR");
      setTemplateId(biz.template_id || "modern");
      setTemplateColor(biz.template_color || "#004de6");
      setPaymentInstructions(
        "Instruksi penawaran: Silakan konfirmasi untuk persetujuan pengerjaan proyek."
      );
      setSignatureText(biz.name);
      
      // Load specific masters
      fetchBusinessSpecificMasters(bizId);
      setSelectedCustomerId("");
    }
  };

  // Load defaults
  useEffect(() => {
    if (!activeBusiness || isInitialized) {
      if (!activeBusiness) setLoading(false);
      return;
    }

    // Dates
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];
    setIssueDate(todayStr);

    const valid = new Date();
    valid.setDate(today.getDate() + 30); // Penawaran valid 30 hari
    setValidUntil(valid.toISOString().split("T")[0]);

    // Set initial business
    setSelectedBusinessId(activeBusiness.id);
    handleSwitchBusiness(activeBusiness.id);
    setIsInitialized(true);
  }, [activeBusiness, businesses, isInitialized]);

  // Calculations
  const getSelectedCustomer = (): Partial<Customer> => {
    if (isManualCustomer) {
      return manualCustomer;
    }
    const found = customers.find(c => c.id === selectedCustomerId);
    return found || { name: "", email: "", phone: "", address: "", tax_id: "" };
  };

  // Line Item Math
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

  // Item additions / selections
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

      // Create unique public NanoID token (8 characters)
      const alphabet = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let publicToken = '';
      for (let i = 0; i < 8; i++) {
        publicToken += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
      }

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

      // 1. Insert Quotation Record
      const { data: qData, error: qError } = await supabase
        .from("invoices")
        .insert({
          business_id: selectedBusinessId,
          customer_id: finalCustomerId,
          customer_snapshot: clientInfo,
          invoice_number: quotationNumber,
          type: "quotation",
          status: "draft",
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
          payment_methods: ["transfer_bank"],
          payment_instructions: paymentInstructions || null,
          notes: notes || null,
          signature_text: signatureText || null,
          public_token: publicToken,
          template_id: templateId,
          template_color: templateColor
        })
        .select()
        .single();

      if (qError) throw qError;

      // 2. Insert Items
      const quotationItemsRows = items.map((item, idx) => ({
        invoice_id: qData.id,
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

      // 3. Send automated Resend email to client if email exists
      if (clientInfo.email) {
        const publicLink = `${window.location.origin}/inv/${publicToken}`;
        const amountStr = formatCurrency(tot);
        await fetch("/api/email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to: clientInfo.email,
            customerName: clientInfo.name,
            invoiceNumber: quotationNumber,
            amountStr,
            publicLink,
            businessName: selectedBusiness?.name || activeBusiness?.name,
            language: locale,
            isQuotation: true
          })
        }).catch(err => console.error("Error triggering Resend email:", err));
      }

      // 4. Increment Invoice Counter on Business
      const { error: counterError } = await supabase
        .from("businesses")
        .update({
          invoice_counter: ((businesses.find(b => b.id === selectedBusinessId)?.invoice_counter || 1)) + 1
        })
        .eq("id", selectedBusinessId);

      if (counterError) console.error("Error updating counter:", counterError);

      await reloadBusiness();
      const nextBiz = businesses.find(b => b.id === selectedBusinessId);
      if (nextBiz) {
        setActiveBusiness(nextBiz);
      }
      router.push("/quotation");
    } catch (err) {
      console.error("Error creating quotation penawaran:", err);
      alert("Gagal menyimpan penawaran.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs text-slate-500 font-semibold mt-2">Menyiapkan editor penawaran...</p>
      </div>
    );
  }

  const clientInfo = getSelectedCustomer();
  const selectedBusiness = businesses.find(b => b.id === selectedBusinessId) || activeBusiness;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      
      {/* Top action header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => router.push("/quotation")}
            className="p-2 text-slate-400 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-xl font-bold text-slate-900">Buat Penawaran Baru (Quotation)</h2>
            <p className="text-xs text-slate-500">Buat proposal penawaran harga pra-deal profesional secara instan.</p>
          </div>
        </div>
        
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 px-4 rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition"
        >
          <Save className="w-4 h-4" /> {saving ? "Menyimpan..." : "Simpan Penawaran"}
        </button>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        
        {/* Detail & Identitas */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5">
          <h3 className="text-sm font-bold text-blue-600 uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-4.5 h-4.5" /> Informasi Dasar
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Nomor Penawaran</label>
              <input
                type="text"
                required
                value={quotationNumber}
                onChange={(e) => setQuotationNumber(e.target.value)}
                className="w-full border border-slate-200 px-3 py-2 rounded-xl text-sm placeholder-slate-400 focus:outline-none focus:border-blue-500 transition font-mono"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Tanggal Dibuat</label>
              <input
                type="date"
                required
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
                className="w-full border border-slate-200 px-3 py-2 rounded-xl text-sm focus:outline-none focus:border-blue-500 transition"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Berlaku Hingga</label>
              <input
                type="date"
                required
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
                className="w-full border border-slate-200 px-3 py-2 rounded-xl text-sm focus:outline-none focus:border-blue-500 transition"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Mata Uang</label>
              <select 
                value={currency} 
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full bg-white border border-slate-200 px-3 py-2 rounded-xl text-sm focus:outline-none focus:border-blue-500"
              >
                <option value="IDR">IDR - Rupiah Indonesia</option>
                <option value="USD">USD - US Dollar</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Penerbit (Dari)</label>
              <div className="relative">
                <select
                  value={selectedBusinessId}
                  onChange={(e) => handleSwitchBusiness(e.target.value)}
                  className="w-full bg-white border border-slate-200 pl-10 pr-10 py-2.5 rounded-xl text-sm font-semibold text-slate-700 appearance-none focus:outline-none focus:border-blue-500 transition shadow-sm"
                >
                  {businesses.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
                <Building2 className="w-4.5 h-4.5 text-slate-400 absolute left-3.5 top-1/2 transform -translate-y-1/2 pointer-events-none" />
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          </div>
        </div>

        {/* Customer Select */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-blue-600 uppercase tracking-wider flex items-center gap-1.5">
              <User className="w-4.5 h-4.5" /> Kepada (Bill To)
            </h3>
            <button
              type="button"
              onClick={() => setIsManualCustomer(!isManualCustomer)}
              className="text-xs font-bold text-blue-600 hover:text-blue-700"
            >
              {isManualCustomer ? "Pilih dari Database" : "Input Manual"}
            </button>
          </div>

          {isManualCustomer ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1 md:col-span-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Nama Klien / Perusahaan *</label>
                <input
                  type="text"
                  required
                  value={manualCustomer.name}
                  onChange={(e) => setManualCustomer({ ...manualCustomer, name: e.target.value })}
                  placeholder="PT Maju Bersama"
                  className="w-full border border-slate-200 px-3 py-2 rounded-xl text-sm focus:outline-none focus:border-blue-500 transition"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Email</label>
                <input
                  type="email"
                  value={manualCustomer.email}
                  onChange={(e) => setManualCustomer({ ...manualCustomer, email: e.target.value })}
                  placeholder="klien@email.com"
                  className="w-full border border-slate-200 px-3 py-2 rounded-xl text-sm focus:outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">WhatsApp</label>
                <input
                  type="tel"
                  value={manualCustomer.phone}
                  onChange={(e) => setManualCustomer({ ...manualCustomer, phone: e.target.value })}
                  placeholder="62812xxx"
                  className="w-full border border-slate-200 px-3 py-2 rounded-xl text-sm focus:outline-none"
                />
              </div>
              <div className="space-y-1 md:col-span-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Alamat Lengkap</label>
                <textarea
                  value={manualCustomer.address}
                  onChange={(e) => setManualCustomer({ ...manualCustomer, address: e.target.value })}
                  placeholder="Alamat penagihan..."
                  rows={2}
                  className="w-full border border-slate-200 px-3 py-2 rounded-xl text-sm focus:outline-none"
                />
              </div>
              <div className="md:col-span-2 flex items-center gap-2 pt-1.5">
                <input
                  type="checkbox"
                  id="saveManualCustomer"
                  checked={saveManualCustomer}
                  onChange={(e) => setSaveManualCustomer(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                />
                <label htmlFor="saveManualCustomer" className="text-xs font-semibold text-slate-700 select-none cursor-pointer">
                  {t("saveCustomerToDb") || "Simpan pelanggan ke database"}
                </label>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="relative">
                <select
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  className="w-full bg-white border border-slate-200 px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-700 appearance-none focus:outline-none focus:border-blue-500"
                >
                  <option value="">-- Pilih Pelanggan --</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-none" />
              </div>

              {selectedCustomerId && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs space-y-1">
                  <p className="font-bold text-slate-800">{clientInfo.name}</p>
                  {clientInfo.email && <p className="text-slate-500">Email: {clientInfo.email}</p>}
                  {clientInfo.phone && <p className="text-slate-500">Telp: {clientInfo.phone}</p>}
                  {clientInfo.address && <p className="text-slate-500">Alamat: {clientInfo.address}</p>}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Itemized List */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-blue-600 uppercase tracking-wider flex items-center gap-1.5">
            <FileSpreadsheet className="w-4.5 h-4.5" /> Itemized proposal
          </h3>

          <div className="space-y-4">
            {items.map((item, index) => (
              <div 
                key={index} 
                className="p-4 border border-slate-200 rounded-xl bg-slate-50/30 space-y-3 relative"
              >
                {items.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(index)}
                    className="absolute top-2 right-2 p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="space-y-1 md:col-span-2">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Katalog Item (Opsional)</label>
                    <div className="relative">
                      <select
                        onChange={(e) => handleSelectCatalogItem(index, e.target.value)}
                        className="w-full bg-white border border-slate-200 px-3 py-1.5 rounded-lg text-xs appearance-none focus:outline-none"
                      >
                        <option value="">-- Autocomplete dari Katalog --</option>
                        {catalogItems.map((c) => (
                          <option key={c.id} value={c.id}>{c.name} ({formatCurrency(c.unit_price)} / {c.unit})</option>
                        ))}
                      </select>
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                  <div className="space-y-1 md:col-span-6">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Nama Item *</label>
                    <input
                      type="text"
                      required
                      value={item.name}
                      onChange={(e) => handleUpdateItem(index, { name: e.target.value })}
                      placeholder="Nama produk / jasa..."
                      className="w-full border border-slate-200 px-3 py-2 rounded-lg text-xs focus:outline-none"
                    />
                  </div>
                  
                  <div className="space-y-1 md:col-span-2">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Jumlah *</label>
                    <input
                      type="number"
                      required
                      min="0.001"
                      step="any"
                      value={item.quantity}
                      onChange={(e) => handleUpdateItem(index, { quantity: Number(e.target.value) })}
                      className="w-full border border-slate-200 px-3 py-2 rounded-lg text-xs focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1 md:col-span-2">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Unit *</label>
                    <input
                      type="text"
                      required
                      value={item.unit}
                      placeholder="pcs"
                      onChange={(e) => handleUpdateItem(index, { unit: e.target.value })}
                      className="w-full border border-slate-200 px-3 py-2 rounded-lg text-xs focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1 md:col-span-2">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Harga Satuan *</label>
                    <input
                      type="number"
                      required
                      value={item.unit_price}
                      onChange={(e) => handleUpdateItem(index, { unit_price: Number(e.target.value) })}
                      className="w-full border border-slate-200 px-3 py-2 rounded-lg text-xs focus:outline-none"
                    />
                    {Number(item.unit_price) > 0 && (
                      <span className="text-[10px] text-blue-650 font-bold mt-1 block">
                        {formatCurrency(Number(item.unit_price))}
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                  <div className="space-y-1 md:col-span-6">
                    <input
                      type="text"
                      value={item.description}
                      placeholder="Keterangan tambahan item..."
                      onChange={(e) => handleUpdateItem(index, { description: e.target.value })}
                      className="w-full border border-slate-200 px-3 py-2 rounded-lg text-[11px] focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1 md:col-span-3">
                    <div className="flex items-center gap-1.5">
                      <select
                        value={item.discount_type || ""}
                        onChange={(e) => handleUpdateItem(index, { 
                          discount_type: (e.target.value === "percentage" || e.target.value === "fixed") ? e.target.value : null,
                          discount_value: 0
                        })}
                        className="border border-slate-200 px-2 py-1.5 rounded-lg text-[10px] focus:outline-none"
                      >
                        <option value="">No Disc</option>
                        <option value="percentage">%</option>
                        <option value="fixed">Nominal</option>
                      </select>
                      {item.discount_type && (
                        <input
                          type="number"
                          value={item.discount_value}
                          onChange={(e) => handleUpdateItem(index, { discount_value: Number(e.target.value) })}
                          placeholder="Nilai disc"
                          className="w-full border border-slate-200 px-2 py-1.5 rounded-lg text-xs focus:outline-none"
                        />
                      )}
                    </div>
                  </div>

                  <div className="md:col-span-3 text-right font-bold text-xs py-2 text-slate-700">
                    Subtotal: {formatCurrency(computeItemSubtotal(item))}
                  </div>
                </div>

              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={handleAddItem}
            className="w-full py-2.5 bg-slate-50 hover:bg-slate-100 border border-dashed border-slate-300 text-slate-600 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition"
          >
            <Plus className="w-4 h-4" /> Tambah Item Baru
          </button>
        </div>

        {/* Adjustments */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Metode & Catatan Penawaran</h3>
            
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Catatan Penawaran (Tampilkan di proposal)</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Terima kasih atas kesempatan penawaran ini..."
                  rows={3}
                  className="w-full border border-slate-200 px-3 py-2 rounded-xl text-xs focus:outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Nama Penanggung Jawab</label>
                <input
                  type="text"
                  value={signatureText}
                  onChange={(e) => setSignatureText(e.target.value)}
                  className="w-full border border-slate-200 px-3 py-2 rounded-xl text-xs focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Perhitungan Total</h3>
            
            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center text-slate-600">
                <span>Subtotal</span>
                <span className="font-semibold">{formatCurrency(getSubtotal())}</span>
              </div>

              <div className="space-y-1.5 border-t border-slate-100 pt-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Diskon Global</span>
                  <div className="flex items-center gap-1.5">
                    <select
                      value={globalDiscountType || ""}
                      onChange={(e) => {
                        setGlobalDiscountType(
                          (e.target.value === "percentage" || e.target.value === "fixed") ? e.target.value : null
                        );
                        setGlobalDiscountValue(0);
                      }}
                      className="border border-slate-200 px-2 py-1 rounded text-[10px] focus:outline-none"
                    >
                      <option value="">No Disc</option>
                      <option value="percentage">%</option>
                      <option value="fixed">Nominal</option>
                    </select>
                    {globalDiscountType && (
                      <input
                        type="number"
                        value={globalDiscountValue}
                        onChange={(e) => setGlobalDiscountValue(Number(e.target.value))}
                        className="w-20 border border-slate-200 px-2 py-1 rounded text-[11px] focus:outline-none"
                      />
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center border-t border-slate-100 pt-2.5">
                <span className="text-slate-500">Pajak (PPN 11%)</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setTaxRate(taxRate === 11 ? 0 : 11)}
                    className={`px-3 py-1 text-[10px] font-bold rounded-lg border transition ${
                      taxRate === 11 
                        ? "bg-blue-50 text-blue-600 border-blue-100" 
                        : "bg-white text-slate-400 border-slate-200"
                    }`}
                  >
                    {taxRate === 11 ? "PPN 11% Aktif" : "Non-Aktif"}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5 border-t border-slate-100 pt-2.5">
                <div className="flex items-center justify-between">
                  <input
                    type="text"
                    value={shippingLabel}
                    onChange={(e) => setShippingLabel(e.target.value)}
                    className="bg-transparent border-b border-dashed border-slate-200 text-slate-500 focus:outline-none w-28 hover:border-slate-400"
                  />
                  <div className="flex flex-col items-end">
                    <input
                      type="number"
                      value={shippingAmount}
                      onChange={(e) => setShippingAmount(Number(e.target.value))}
                      placeholder="0"
                      className="w-24 border border-slate-200 px-2 py-1 rounded text-right focus:outline-none text-[11px]"
                    />
                    {shippingAmount > 0 && (
                      <span className="text-[10px] text-blue-650 font-bold mt-1 text-right block">
                        {formatCurrency(shippingAmount)}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center border-t border-slate-200 pt-3 text-sm font-bold">
                <span className="text-slate-900">Total Penawaran</span>
                <span className="text-lg font-extrabold text-blue-600">{formatCurrency(getTotal())}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Live Preview Dropdown at bottom */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
              <Printer className="w-4.5 h-4.5 text-blue-600" /> Pratinjau Desain Proposal Penawaran
            </h4>
          </div>

          <div className="bg-slate-100 rounded-xl p-4 md:p-8 flex justify-center">
            <div 
              className="w-full max-w-[650px] bg-white border border-slate-200 shadow-lg p-6 rounded-lg text-slate-800 font-sans"
              style={{ borderTop: `6px solid ${templateColor}` }}
            >
              <div className="flex justify-between items-start gap-4">
                <div>
                  <h4 className="text-lg font-extrabold" style={{ color: templateColor }}>{selectedBusiness?.name}</h4>
                  <p className="text-[10px] text-slate-500 whitespace-pre-line mt-1">{selectedBusiness?.address}</p>
                </div>
                <div className="text-right">
                  <h2 className="text-xl font-black uppercase text-slate-400">Penawaran</h2>
                  <p className="text-[10px] font-mono font-bold text-slate-700">{quotationNumber}</p>
                </div>
              </div>

              <hr className="border-slate-100 my-4" />

              <div className="grid grid-cols-2 gap-4 text-[10px]">
                <div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Untuk Klien:</span>
                  <p className="font-bold text-slate-800 mt-1">{clientInfo.name || "Nama Klien"}</p>
                  <p className="text-slate-500 whitespace-pre-line mt-0.5">{clientInfo.address}</p>
                </div>
                <div className="text-right space-y-1">
                  <p><span className="text-slate-400">Tanggal:</span> <span className="font-semibold">{issueDate}</span></p>
                  <p><span className="text-slate-400">Valid Sampai:</span> <span className="font-semibold">{validUntil}</span></p>
                </div>
              </div>

              <table className="w-full text-[10px] text-left mt-6">
                <thead>
                  <tr className="text-white" style={{ backgroundColor: templateColor }}>
                    <th className="p-2 rounded-l-md">Deskripsi Item</th>
                    <th className="p-2 text-center">Qty</th>
                    <th className="p-2 text-right">Harga</th>
                    <th className="p-2 text-right rounded-r-md">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((item, idx) => (
                    <tr key={idx}>
                      <td className="py-2 px-1">
                        <p className="font-bold text-slate-800">{item.name || "Nama Item"}</p>
                        {item.description && <p className="text-[9px] text-slate-400 mt-0.5">{item.description}</p>}
                      </td>
                      <td className="py-2 px-1 text-center">{item.quantity} {item.unit}</td>
                      <td className="py-2 px-1 text-right">{formatCurrency(item.unit_price)}</td>
                      <td className="py-2 px-1 text-right font-bold">{formatCurrency(computeItemSubtotal(item))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="flex justify-end pt-4 mt-4 border-t border-slate-100">
                <div className="w-56 space-y-1 text-[10px]">
                  <div className="flex justify-between text-slate-500">
                    <span>Subtotal</span>
                    <span>{formatCurrency(getSubtotal())}</span>
                  </div>
                  {getGlobalDiscountAmount() > 0 && (
                    <div className="flex justify-between text-slate-500">
                      <span>Diskon</span>
                      <span className="text-rose-600">-{formatCurrency(getGlobalDiscountAmount())}</span>
                    </div>
                  )}
                  {getTaxAmount() > 0 && (
                    <div className="flex justify-between text-slate-500">
                      <span>Pajak (PPN 11%)</span>
                      <span>{formatCurrency(getTaxAmount())}</span>
                    </div>
                  )}
                  {Number(shippingAmount) > 0 && (
                    <div className="flex justify-between text-slate-500">
                      <span>{shippingLabel || "Ongkos Kirim"}</span>
                      <span>{formatCurrency(Number(shippingAmount))}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-extrabold text-xs pt-1.5 border-t border-slate-100 mt-1 animate-pulse-subtle" style={{ color: templateColor }}>
                    <span>Total Penawaran</span>
                    <span>{formatCurrency(getTotal())}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

      </form>

    </div>
  );
}
