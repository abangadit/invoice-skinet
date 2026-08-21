"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { 
  ArrowLeft, 
  Plus, 
  Trash2, 
  FileText, 
  Save, 
  ChevronDown, 
  Sparkles,
  CheckCircle,
  Clock,
  Printer,
  Trash,
  X,
  Building2,
  User
} from "lucide-react";
import { useBusiness } from "../../../../../lib/context/BusinessContext";
import { createWebBrowserClient } from "../../../../../lib/supabase/client";
import { useLanguage } from "../../../../../lib/context/LanguageContext";
import SignaturePad from "@/components/SignaturePad";
import InvoiceTemplate from "@/components/InvoiceTemplate";
import { uploadImageToR2 } from "../../../../../lib/utils/upload";

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

interface InvoiceItemInput {
  id?: string;
  item_id: string | null;
  name: string;
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
  discount_type: "percentage" | "fixed" | null;
  discount_value: number;
  tax_included: boolean;
  save_to_catalog: boolean; // Optional catalog saving
}

export default function EditInvoicePage() {
  const router = useRouter();
  const params = useParams();
  const { activeBusiness, businesses, reloadBusiness, setActiveBusiness } = useBusiness();
  const { t, locale } = useLanguage();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [catalogItems, setCatalogItems] = useState<CatalogItem[]>([]);
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  
  // Loading & submit states
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Business switching state
  const [selectedBusinessId, setSelectedBusinessId] = useState("");

  // Form states
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [issueDate, setIssueDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  
  // Custom manual customer input if not choosing from catalog
  const [isManualCustomer, setIsManualCustomer] = useState(false);
  const [saveManualCustomer, setSaveManualCustomer] = useState(false);
  const [manualCustomer, setManualCustomer] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    tax_id: ""
  });

  // Invoice Items
  const [items, setItems] = useState<InvoiceItemInput[]>([]);

  // Adjustments & Taxes
  const [globalDiscountType, setGlobalDiscountType] = useState<"percentage" | "fixed" | null>(null);
  const [globalDiscountValue, setGlobalDiscountValue] = useState(0);
  const [taxRate, setTaxRate] = useState(0); // PPN
  const [pph23Rate, setPph23Rate] = useState(0); // PPh 23
  const [shippingAmount, setShippingAmount] = useState(0);
  const [shippingLabel, setShippingLabel] = useState("Ongkos Kirim");
  const [paymentInstructions, setPaymentInstructions] = useState("");
  const [notes, setNotes] = useState("");
  const [signatureText, setSignatureText] = useState("");
  const [stampPaid, setStampPaid] = useState(false);
  const [showQris, setShowQris] = useState(false);
  const [currency, setCurrency] = useState("IDR");
  const [invoiceStatus, setInvoiceStatus] = useState<"draft" | "sent" | "paid" | "partial" | "overdue">("draft");
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState("");

  // Custom adjustments (+ / -)
  const [adjustmentsList, setAdjustmentsList] = useState<Array<{ name: string; value: number }>>([]);

  // Selected Bank Accounts
  const [selectedBankAccounts, setSelectedBankAccounts] = useState<string[]>([]);

  // Signature drawing/upload
  const [signatureType, setSignatureType] = useState<"draw" | "upload">("draw");
  const [signatureUrl, setSignatureUrl] = useState("");
  const [uploadingSignature, setUploadingSignature] = useState(false);

  // Template chosen
  const [templateId, setTemplateId] = useState("modern");
  const [templateColor, setTemplateColor] = useState("#004de6");
  const [paidAmount, setPaidAmount] = useState(0);
  const [isInitialized, setIsInitialized] = useState(false);

  // Load existing invoice details
  const loadInvoiceData = async () => {
    if (!activeBusiness || !params.id) return;
    try {
      setLoading(true);
      const supabase = createWebBrowserClient();

      // Fetch invoice first to retrieve business_id
      const { data: inv, error: invError } = await supabase
        .from("invoices")
        .select("*")
        .eq("id", params.id)
        .single();

      if (invError) throw invError;

      const currentBizId = inv.business_id;
      setSelectedBusinessId(currentBizId);

      // Fetch customers, catalog items, and bank accounts
      const { data: custData } = await supabase
        .from("customers")
        .select("*")
        .eq("business_id", currentBizId)
        .order("name", { ascending: true });
      setCustomers(custData || []);

      const { data: catData } = await supabase
        .from("items")
        .select("*")
        .eq("business_id", currentBizId)
        .order("name", { ascending: true });
      setCatalogItems(catData || []);

      const { data: bankData } = await supabase
        .from("bank_accounts")
        .select("*")
        .eq("business_id", currentBizId)
        .order("created_at", { ascending: true });
      setBankAccounts(bankData || []);

      const { data: whData } = await supabase
        .from("warehouses")
        .select("*")
        .eq("business_id", currentBizId)
        .order("name", { ascending: true });
      setWarehouses(whData || []);
      setSelectedWarehouseId(inv.warehouse_id || "");

      // Populate states
      setInvoiceNumber(inv.invoice_number);
      setIssueDate(inv.issue_date);
      setDueDate(inv.due_date || "");
      setCurrency(inv.currency);
      setInvoiceStatus(inv.status);
      setGlobalDiscountType(inv.discount_type);
      setGlobalDiscountValue(Number(inv.discount_value || 0));
      setTaxRate(inv.taxes_amount > 0 ? 11 : 0);
      setPph23Rate(inv.pph23_amount > 0 ? 2 : 0);
      setShippingAmount(Number(inv.shipping_amount || 0));
      setShippingLabel(inv.shipping_label || "Ongkos Kirim");
      setPaymentInstructions(inv.payment_instructions || "");
      setNotes(inv.notes || "");
      setSignatureText(inv.signature_text || "");
      setSignatureUrl(inv.signature_url || "");
      setStampPaid(inv.stamp_paid);
      setShowQris(inv.show_qris || false);
      setAdjustmentsList(inv.adjustments || []);
      setPaidAmount(Number(inv.paid_amount || 0));
      
      // Determine if customer is manual
      if (inv.customer_id) {
        setSelectedCustomerId(inv.customer_id);
        setIsManualCustomer(false);
      } else {
        setIsManualCustomer(true);
        setManualCustomer(inv.customer_snapshot || { name: "", email: "", phone: "", address: "", tax_id: "" });
      }

      // Fetch items
      const { data: itemsData, error: itemsError } = await supabase
        .from("invoice_items")
        .select("*")
        .eq("invoice_id", params.id)
        .order("sort_order", { ascending: true });

      if (itemsError) throw itemsError;

      const formattedItems = (itemsData || []).map((item) => ({
        id: item.id,
        item_id: item.item_id,
        name: item.name,
        description: item.description || "",
        quantity: Number(item.quantity || 0),
        unit: item.unit,
        unit_price: Number(item.unit_price || 0),
        discount_type: item.discount_type,
        discount_value: Number(item.discount_value || 0),
        tax_included: item.tax_included,
        save_to_catalog: false
      }));

      setItems(formattedItems);

      // Load template colors
      const biz = businesses.find(b => b.id === currentBizId) || activeBusiness;
      setTemplateId(inv.template_id || biz.template_id || "modern");
      setTemplateColor(inv.template_color || biz.template_color || "#004de6");

    } catch (err) {
      console.error("Error loading invoice for edit:", err);
      alert("Gagal memuat rincian invoice.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isInitialized && activeBusiness) {
      loadInvoiceData();
      setIsInitialized(true);
    }
  }, [params.id, activeBusiness, isInitialized]);

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

      const { data: bankData } = await supabase
        .from("bank_accounts")
        .select("*")
        .eq("business_id", businessId)
        .order("created_at", { ascending: true });

      const { data: whData } = await supabase
        .from("warehouses")
        .select("*")
        .eq("business_id", businessId)
        .order("name", { ascending: true });

      setCustomers(custData || []);
      setCatalogItems(itemData || []);
      setBankAccounts(bankData || []);
      setWarehouses(whData || []);
      if (whData && whData.length > 0) {
        setSelectedWarehouseId(whData[0].id);
      } else {
        setSelectedWarehouseId("");
      }
    } catch (err) {
      console.error("Error loading master records for selected business:", err);
    }
  };

  const handleSwitchBusiness = (bizId: string) => {
    setSelectedBusinessId(bizId);
    const biz = businesses.find(b => b.id === bizId);
    if (biz) {
      setCurrency(biz.default_currency || "IDR");
      setTemplateId(biz.template_id || "modern");
      setTemplateColor(biz.template_color || "#004de6");
      setPaymentInstructions(
        biz.footer_text || "Silakan lakukan transfer bank pembayaran ke rekening di bawah ini."
      );
      setSignatureText(biz.name);
      
      // Load specific masters
      fetchBusinessSpecificMasters(bizId);
      setSelectedCustomerId("");
      setSelectedBankAccounts([]);
    }
  };

  // Calculations
  const getSelectedCustomer = (): Partial<Customer> => {
    if (isManualCustomer) {
      return manualCustomer;
    }
    const found = customers.find(c => c.id === selectedCustomerId);
    return found || { name: "", email: "", phone: "", address: "", tax_id: "" };
  };

  // Line Item Math
  const computeItemSubtotal = (item: InvoiceItemInput) => {
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

  const computeItemDiscount = (item: InvoiceItemInput) => {
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

  const getPph23Amount = () => {
    const baseAmount = getSubtotal() - getGlobalDiscountAmount();
    return baseAmount * (pph23Rate / 100);
  };

  const getAdjustmentsTotal = () => {
    return adjustmentsList.reduce((sum, adj) => sum + Number(adj.value || 0), 0);
  };

  const getTotal = () => {
    return Math.max(0, getSubtotal() - getGlobalDiscountAmount() + getTaxAmount() + Number(shippingAmount || 0) + getAdjustmentsTotal() - getPph23Amount());
  };

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
        tax_included: false,
        save_to_catalog: false
      }
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length === 1) return;
    const next = [...items];
    next.splice(index, 1);
    setItems(next);
  };

  const handleUpdateItem = (index: number, fields: Partial<InvoiceItemInput>) => {
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

  // Bank selection changes auto populate instructions
  const handleBankSelectionChange = (bankId: string, checked: boolean) => {
    let next: string[] = [];
    if (checked) {
      next = [...selectedBankAccounts, bankId];
    } else {
      next = selectedBankAccounts.filter(id => id !== bankId);
    }
    setSelectedBankAccounts(next);
    
    const selectedBanks = bankAccounts.filter(b => next.includes(b.id));
    if (selectedBanks.length > 0) {
      const formatted = selectedBanks.map(b => `${b.bank_name}: ${b.account_number} a.n. ${b.account_name}`).join("\n");
      setPaymentInstructions(formatted);
    } else {
      setPaymentInstructions("");
    }
  };

  // Signature image file upload
  const handleSignatureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploadingSignature(true);
      const url = await uploadImageToR2(file, "signatures");
      setSignatureUrl(url);
    } catch (err: any) {
      alert(err.message || "Gagal mengunggah tanda tangan.");
    } finally {
      setUploadingSignature(false);
    }
  };

  // Focus value clearing helper
  const handleNumericFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    if (Number(e.target.value) === 0) {
      e.target.value = "";
    }
  };

  // Add custom fee adjustment
  const handleAddAdjustment = () => {
    setAdjustmentsList([...adjustmentsList, { name: "", value: 0 }]);
  };

  const handleUpdateAdjustment = (index: number, fields: Partial<{ name: string; value: number }>) => {
    const next = [...adjustmentsList];
    next[index] = { ...next[index], ...fields };
    setAdjustmentsList(next);
  };

  const handleRemoveAdjustment = (index: number) => {
    const next = [...adjustmentsList];
    next.splice(index, 1);
    setAdjustmentsList(next);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBusiness || !params.id) return;
    
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

      // 1. Update Invoice details
      const { error: updateInvError } = await supabase
        .from("invoices")
        .update({
          business_id: selectedBusinessId,
          customer_id: finalCustomerId,
          customer_snapshot: clientInfo,
          invoice_number: invoiceNumber,
          status: invoiceStatus,
          issue_date: issueDate,
          due_date: dueDate || null,
          currency: currency,
          subtotal: sub,
          discount_type: globalDiscountType,
          discount_value: globalDiscountValue,
          discount_amount: globDisc,
          tax_base: "after_discount",
          taxes_snapshot: taxRate > 0 ? [{ name: `PPN ${taxRate}%`, rate: taxRate, amount: tax }] : [],
          taxes_amount: tax,
          pph23_amount: getPph23Amount(),
          shipping_amount: Number(shippingAmount || 0),
          shipping_label: shippingLabel,
          total_amount: tot,
          remaining_amount: invoiceStatus === "paid" ? 0 : (tot - paidAmount), // updates remaining
          warehouse_id: activeBusiness?.is_multi_warehouse_enabled ? (selectedWarehouseId || null) : null,
          payment_instructions: paymentInstructions || null,
          notes: notes || null,
          signature_text: signatureText || null,
          signature_url: signatureUrl || null,
          stamp_paid: stampPaid || (invoiceStatus === "paid"),
          show_qris: showQris,
          adjustments: adjustmentsList,
          template_id: templateId,
          template_color: templateColor
        })
        .eq("id", params.id);

      if (updateInvError) throw updateInvError;

      // 2. Clear out existing items
      const { error: deleteItemsError } = await supabase
        .from("invoice_items")
        .delete()
        .eq("invoice_id", params.id);

      if (deleteItemsError) throw deleteItemsError;

      // 3. Re-insert items
      const invoiceItemsRows = items.map((item, idx) => ({
        invoice_id: params.id,
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
        .insert(invoiceItemsRows);

      if (itemsError) throw itemsError;

      // 4. Save manual items to Catalog (optional)
      const manualItemsToSave = items.filter(item => !item.item_id && item.save_to_catalog && item.name);
      if (manualItemsToSave.length > 0) {
        const itemRows = manualItemsToSave.map(mi => ({
          business_id: selectedBusinessId,
          name: mi.name,
          unit: mi.unit,
          unit_price: mi.unit_price,
          description: mi.description || null
        }));
        await supabase.from("items").insert(itemRows);
      }

      // 5. Send automated Resend email to client if email exists
      if (clientInfo.email && (invoiceStatus === "sent" || invoiceStatus === "paid")) {
        // Find public token or retrieve it
        const { data: retrievedInv } = await supabase
          .from("invoices")
          .select("public_token")
          .eq("id", params.id)
          .single();

        const publicLink = `${window.location.origin}/inv/${retrievedInv?.public_token}`;
        const amountStr = formatCurrency(tot);
        await fetch("/api/email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to: clientInfo.email,
            customerName: clientInfo.name,
            invoiceNumber: invoiceNumber,
            amountStr,
            publicLink,
            businessName: selectedBusiness?.name || activeBusiness?.name,
            language: locale
          })
        }).catch(err => console.error("Error triggering Resend email:", err));
      }

      await reloadBusiness();
      const nextBiz = businesses.find(b => b.id === selectedBusinessId);
      if (nextBiz) {
        setActiveBusiness(nextBiz);
      }
      router.push(`/invoice/${params.id}`);
    } catch (err) {
      console.error("Error updating invoice:", err);
      alert("Gagal mengubah data invoice.");
    } finally {
      setSaving(false);
    }
  };

  // Helper placeholder
  const invData = null; 

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs text-slate-500 font-semibold mt-2">Memuat rincian invoice...</p>
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
            onClick={() => router.push(`/invoice/${params.id}`)}
            className="p-2 text-slate-400 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-xl font-bold text-slate-900">{locale === "en" ? "Edit Invoice" : "Ubah Invoice"}</h2>
            <p className="text-xs text-slate-500">
              {locale === "en" ? "Adjust details and calculations for this invoice." : "Sesuaikan rincian dan kalkulasi untuk invoice ini."}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <select 
            value={invoiceStatus} 
            onChange={(e) => setInvoiceStatus(e.target.value as any)}
            className="bg-white border border-slate-200 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 focus:outline-none"
          >
            <option value="draft">Draft</option>
            <option value="sent">Kirim</option>
            <option value="paid">Lunas</option>
            <option value="partial">Belum Lunas (Sebagian)</option>
            <option value="overdue">Terlambat</option>
          </select>
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition"
          >
            <Save className="w-4 h-4" /> {saving ? "Menyimpan..." : "Simpan Perubahan"}
          </button>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        
        {/* Detail & Identitas Invoice */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5">
          <h3 className="text-sm font-bold text-blue-600 uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-4.5 h-4.5" /> {t("basicInfo")}
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Nomor Invoice</label>
              <input
                type="text"
                required
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                className="w-full border border-slate-200 px-3 py-2 rounded-xl text-sm placeholder-slate-400 focus:outline-none focus:border-blue-500 transition font-mono"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Tanggal Terbit</label>
              <input
                type="date"
                required
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
                className="w-full border border-slate-200 px-3 py-2 rounded-xl text-sm placeholder-slate-400 focus:outline-none focus:border-blue-500 transition"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Tanggal Jatuh Tempo</label>
              <input
                type="date"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full border border-slate-200 px-3 py-2 rounded-xl text-sm placeholder-slate-400 focus:outline-none focus:border-blue-500 transition"
              />
            </div>
          </div>

          <div className={`grid grid-cols-1 ${activeBusiness?.is_multi_warehouse_enabled ? 'md:grid-cols-3' : 'md:grid-cols-2'} gap-4 pt-2`}>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Mata Uang</label>
              <select 
                value={currency} 
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full bg-white border border-slate-200 px-3 py-2 rounded-xl text-sm focus:outline-none focus:border-blue-500"
              >
                <option value="IDR">IDR - Rupiah Indonesia</option>
                <option value="USD">USD - US Dollar</option>
                <option value="SGD">SGD - Singapore Dollar</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Pengirim (Bill From)</label>
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

            {activeBusiness?.is_multi_warehouse_enabled && (
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Gudang Sumber (Stok)</label>
                <div className="relative">
                  <select
                    value={selectedWarehouseId}
                    onChange={(e) => setSelectedWarehouseId(e.target.value)}
                    className="w-full bg-white border border-slate-200 pl-3 pr-10 py-2.5 rounded-xl text-sm font-semibold text-slate-700 appearance-none focus:outline-none focus:border-blue-500 transition shadow-sm"
                  >
                    {warehouses.length === 0 ? (
                      <option value="">Tidak ada gudang</option>
                    ) : (
                      warehouses.map((wh) => (
                        <option key={wh.id} value={wh.id}>{wh.name} {wh.code ? `(${wh.code})` : ""}</option>
                      ))
                    )}
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Penerima (Bill To) */}
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
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Nama Pelanggan / Perusahaan *</label>
                <input
                  type="text"
                  required
                  value={manualCustomer.name}
                  onChange={(e) => setManualCustomer({ ...manualCustomer, name: e.target.value })}
                  placeholder="PT Maju Bersama"
                  className="w-full border border-slate-200 px-3 py-2 rounded-xl text-sm placeholder-slate-400 focus:outline-none focus:border-blue-500 transition"
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
                  className="w-full border border-slate-200 px-3 py-2 rounded-xl text-xs focus:outline-none"
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
                  {t("saveCustomerToDb")}
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

        {/* Daftar Item */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-blue-600 uppercase tracking-wider flex items-center gap-1.5">
            <FileText className="w-4.5 h-4.5" /> Itemized List
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
                        value={item.item_id || ""}
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
                      onFocus={handleNumericFocus}
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
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Harga *</label>
                    <input
                      type="number"
                      required
                      value={item.unit_price}
                      onFocus={handleNumericFocus}
                      onChange={(e) => handleUpdateItem(index, { unit_price: Number(e.target.value) })}
                      className="w-full border border-slate-200 px-3 py-2 rounded-lg text-xs focus:outline-none"
                    />
                    {Number(item.unit_price) > 0 && (
                      <span className="text-[10px] text-blue-655 font-bold mt-1 block">
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
                          onFocus={handleNumericFocus}
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

                {/* Option to Save manual product to Catalog */}
                {!item.item_id && item.name && (
                  <div className="flex items-center gap-2 pt-1.5">
                    <input
                      type="checkbox"
                      id={`save-catalog-${index}`}
                      checked={item.save_to_catalog}
                      onChange={(e) => handleUpdateItem(index, { save_to_catalog: e.target.checked })}
                      className="w-3.5 h-3.5 text-blue-600 border-slate-300 rounded"
                    />
                    <label htmlFor={`save-catalog-${index}`} className="text-[10px] text-slate-500 font-bold cursor-pointer">
                      Simpan ke katalog produk
                    </label>
                  </div>
                )}

              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={handleAddItem}
            className="w-full md:w-auto max-w-[220px] mx-auto py-2.5 bg-slate-50 hover:bg-slate-100 border border-dashed border-slate-300 text-slate-600 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition"
          >
            <Plus className="w-4 h-4" /> Tambah Item Baru
          </button>
        </div>

        {/* SECTION 4: Adjustments & Total */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Notes & Payment info */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4 order-2 md:order-1">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Metode Pembayaran & Catatan</h3>
            
            <div className="space-y-4">
              {/* Select payment bank account */}
              {bankAccounts.length > 0 && (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Pilih Rekening Bank Pembayaran</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {bankAccounts.map((b) => (
                      <div key={b.id} className="flex items-center gap-2 p-2 border border-slate-150 rounded-xl bg-slate-50/20">
                        <input
                          type="checkbox"
                          id={`bank-${b.id}`}
                          checked={selectedBankAccounts.includes(b.id)}
                          onChange={(e) => handleBankSelectionChange(b.id, e.target.checked)}
                          className="w-4 h-4 text-blue-600 border-slate-300 rounded"
                        />
                        <label htmlFor={`bank-${b.id}`} className="text-[11px] font-semibold text-slate-700 cursor-pointer truncate">
                          {b.bank_name} ({b.account_number.slice(-4)})
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Instruksi Pembayaran (Rekening Bank)</label>
                <textarea
                  value={paymentInstructions}
                  onChange={(e) => setPaymentInstructions(e.target.value)}
                  placeholder="BCA - 123456789 a.n. Bisnis Saya"
                  rows={2}
                  className="w-full border border-slate-200 px-3 py-2 rounded-xl text-xs placeholder-slate-400 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Catatan Tambahan (Ke Klien)</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Terima kasih atas kerja sama Anda!"
                  rows={2}
                  className="w-full border border-slate-200 px-3 py-2 rounded-xl text-xs placeholder-slate-400 focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  {locale === "en" ? "Digital Signature" : "Tanda Tangan Digital"}
                </label>
                
                <div className="flex gap-2 mb-2 bg-slate-100 p-1 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setSignatureType("draw")}
                    className={`flex-1 py-1 text-[10px] font-bold rounded-md transition ${
                      signatureType === "draw" ? "bg-white text-blue-600 shadow-sm" : "text-slate-500"
                    }`}
                  >
                    Gambar Online
                  </button>
                  <button
                    type="button"
                    onClick={() => setSignatureType("upload")}
                    className={`flex-1 py-1 text-[10px] font-bold rounded-md transition ${
                      signatureType === "upload" ? "bg-white text-blue-600 shadow-sm" : "text-slate-500"
                    }`}
                  >
                    Unggah File
                  </button>
                </div>

                {signatureType === "draw" ? (
                  <SignaturePad
                    value={signatureUrl}
                    onChange={(url) => setSignatureUrl(url)}
                    clearLabel="Bersihkan"
                    placeholder="Coret tanda tangan di sini..."
                  />
                ) : (
                  <div className="space-y-2">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleSignatureUpload}
                      disabled={uploadingSignature}
                      className="w-full border border-slate-200 p-2 rounded-xl text-[10px] focus:outline-none bg-slate-50 disabled:opacity-50"
                    />
                    {uploadingSignature && (
                      <p className="text-[10px] text-slate-500 font-semibold">Mengunggah tanda tangan...</p>
                    )}
                    {signatureUrl && !uploadingSignature && (
                      <div className="relative border border-slate-200 rounded-xl overflow-hidden h-28 bg-white flex items-center justify-center p-2">
                        <img src={signatureUrl} alt="Signature Preview" className="h-full object-contain" />
                        <button
                          type="button"
                          onClick={() => setSignatureUrl("")}
                          className="absolute top-1.5 right-1.5 p-1 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-md"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Nama Penandatangan (Tanda Tangan)</label>
                <input
                  type="text"
                  value={signatureText}
                  onChange={(e) => setSignatureText(e.target.value)}
                  className="w-full border border-slate-200 px-3 py-2 rounded-xl text-xs focus:outline-none"
                />
              </div>

              <div className="flex flex-col gap-2.5 pt-1">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="stampPaid"
                    checked={stampPaid}
                    onChange={(e) => setStampPaid(e.target.checked)}
                    className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-slate-300 rounded"
                  />
                  <label htmlFor="stampPaid" className="text-xs font-bold text-slate-600 cursor-pointer">
                    Tampilkan Stamp "LUNAS" (Paid)
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="showQris"
                    checked={showQris}
                    onChange={(e) => setShowQris(e.target.checked)}
                    className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-slate-300 rounded"
                    disabled={!selectedBusiness?.qris_url}
                  />
                  <label htmlFor="showQris" className={`text-xs font-bold cursor-pointer ${!selectedBusiness?.qris_url ? "text-slate-400 cursor-not-allowed" : "text-slate-600"}`}>
                    {locale === "en" ? "Show QRIS Code" : "Tampilkan Kode QRIS"}
                    {!selectedBusiness?.qris_url && (
                      <span className="text-[9px] font-normal text-slate-400 block italic">
                        ({locale === "en" ? "Upload QRIS in settings first" : "Unggah QRIS di pengaturan terlebih dahulu"})
                      </span>
                    )}
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Calculations totals */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4 order-1 md:order-2">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Penyesuaian & Total</h3>
            
            <div className="space-y-3 text-xs">
              
              {/* Subtotal */}
              <div className="flex justify-between items-center text-slate-600">
                <span>Subtotal</span>
                <span className="font-semibold">{formatCurrency(getSubtotal())}</span>
              </div>

              {/* Global Discount */}
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
                        onFocus={handleNumericFocus}
                        onChange={(e) => setGlobalDiscountValue(Number(e.target.value))}
                        className="w-20 border border-slate-200 px-2 py-1 rounded text-[11px] focus:outline-none"
                      />
                    )}
                  </div>
                </div>
                {globalDiscountType && (
                  <div className="flex justify-between text-slate-500 font-semibold pl-2">
                    <span>Diskon Terhitung</span>
                    <span>-{formatCurrency(getGlobalDiscountAmount())}</span>
                  </div>
                )}
              </div>

              {/* Tax (PPN) */}
              <div className="flex justify-between items-center border-t border-slate-100 pt-2.5">
                <span className="text-slate-500">Pajak (PPN {activeBusiness?.tax_rate_percent ?? 11}%)</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const bizRate = activeBusiness?.tax_rate_percent ?? 11;
                      setTaxRate(taxRate > 0 ? 0 : bizRate);
                    }}
                    className={`px-3 py-1 text-[10px] font-bold rounded-lg border transition ${
                      taxRate > 0 
                        ? "bg-blue-50 text-blue-600 border-blue-100" 
                        : "bg-white text-slate-400 border-slate-200"
                    }`}
                  >
                    {taxRate > 0 ? `PPN ${taxRate}% Aktif` : "Non-Aktif"}
                  </button>
                  {taxRate > 0 && <span className="font-semibold">{formatCurrency(getTaxAmount())}</span>}
                </div>
              </div>

              {/* PPh 23 */}
              <div className="flex justify-between items-center border-t border-slate-100 pt-2.5">
                <span className="text-slate-500">PPh 23 (2%)</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPph23Rate(pph23Rate === 2 ? 0 : 2)}
                    className={`px-3 py-1 text-[10px] font-bold rounded-lg border transition ${
                      pph23Rate === 2 
                        ? "bg-blue-50 text-blue-600 border-blue-100" 
                        : "bg-white text-slate-400 border-slate-200"
                    }`}
                  >
                    {pph23Rate === 2 ? "PPh 23 (2%) Aktif" : "Non-Aktif"}
                  </button>
                  {pph23Rate > 0 && <span className="font-semibold text-rose-600">-{formatCurrency(getPph23Amount())}</span>}
                </div>
              </div>

              {/* Shipping */}
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
                      onFocus={handleNumericFocus}
                      onChange={(e) => setShippingAmount(Number(e.target.value))}
                      placeholder="0"
                      className="w-24 border border-slate-200 px-2 py-1 rounded text-right focus:outline-none text-[11px]"
                    />
                    {shippingAmount > 0 && (
                      <span className="text-[10px] text-blue-655 font-bold mt-1 text-right block">
                        {formatCurrency(shippingAmount)}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Custom adjustments list */}
              <div className="space-y-2 border-t border-slate-100 pt-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-semibold">Biaya & Pajak Kustom</span>
                  <button
                    type="button"
                    onClick={handleAddAdjustment}
                    className="px-2 py-1 text-[10px] font-bold text-blue-600 hover:text-blue-700 bg-blue-50 border border-blue-100 rounded-lg transition"
                  >
                    + Tambah Biaya Kustom
                  </button>
                </div>
                
                {adjustmentsList.map((adj, idx) => (
                  <div key={idx} className="flex gap-2 items-center bg-slate-50/50 p-2 rounded-xl border border-slate-150">
                    <input
                      type="text"
                      required
                      placeholder="Biaya Admin, Diskon, dll."
                      value={adj.name}
                      onChange={(e) => handleUpdateAdjustment(idx, { name: e.target.value })}
                      className="flex-1 border border-slate-200 px-2 py-1.5 rounded-lg text-xs focus:outline-none bg-white"
                    />
                    <input
                      type="number"
                      required
                      placeholder="Nilai (+/-)"
                      value={adj.value}
                      onFocus={handleNumericFocus}
                      onChange={(e) => handleUpdateAdjustment(idx, { value: Number(e.target.value) })}
                      className="w-24 border border-slate-200 px-2 py-1.5 rounded-lg text-xs text-right focus:outline-none bg-white font-mono font-bold"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveAdjustment(idx)}
                      className="p-1 text-slate-400 hover:text-rose-600 rounded-md transition"
                    >
                      <Trash className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Final total */}
              <div className="flex justify-between items-center border-t border-slate-200 pt-3 text-sm font-bold">
                <span className="text-slate-900">Total Tagihan</span>
                <span className="text-lg font-extrabold text-blue-600">{formatCurrency(getTotal())}</span>
              </div>

            </div>
          </div>
        </div>

        {/* SECTION 5: LIVE TEMPLATE PREVIEW & SELECTOR */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
          
          {/* Settings */}
          <div className="border-b border-slate-100 pb-4">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
              <Printer className="w-4.5 h-4.5 text-blue-600" /> {locale === "en" ? "Template Options & Live Preview" : "Pilihan Template & Live Preview"}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              {locale === "en" ? "Adjust the appearance of the invoice for your client in real-time." : "Sesuaikan tampilan invoice untuk klien Anda secara real-time."}
            </p>
            
            <div className="flex flex-wrap gap-4 mt-4">
              <div className="space-y-1 w-full">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  {locale === "en" ? "Template Style" : "Gaya Template"}
                </label>
                <div className="flex flex-wrap gap-2">
                  {Object.entries({
                    modern: "Modern",
                    classic: locale === "en" ? "Classic" : "Klasik",
                    minimal: locale === "en" ? "Minimalist" : "Minimalis",
                    premium_elegant: "Elegant Sidebar (Premium)",
                    premium_bold: "Bold Startup (Premium)",
                    premium_compact: "Compact 2-Col (Premium)",
                    premium_creative: "Creative Split (Premium)",
                    premium_luxury: "Luxury Gold (Premium)",
                  }).map(([id, name]) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setTemplateId(id)}
                      className={`px-3 py-1.5 text-xs font-bold rounded-xl border transition ${
                        templateId === id 
                          ? "bg-blue-600 text-white border-blue-600 shadow-sm" 
                          : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      {name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  {locale === "en" ? "Accent Color" : "Warna Aksen"}
                </label>
                <div className="flex gap-2.5 items-center py-1">
                  {["#004de6", "#059669", "#7c3aed", "#e11d48", "#1e293b"].map((col) => (
                    <button
                      key={col}
                      type="button"
                      onClick={() => setTemplateColor(col)}
                      style={{ backgroundColor: col }}
                      className={`w-6 h-6 rounded-full border transition transform active:scale-90 ${
                        templateColor === col ? "ring-2 ring-offset-2 ring-slate-400 border-white" : "border-transparent"
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Live Preview Container (CSS Layout rendering matching selection) */}
          <div className="bg-slate-100 rounded-xl p-2 sm:p-4 md:p-8 flex justify-center">
            
            <div 
              id="invoice-preview"
              className="w-full max-w-[650px] bg-white border border-slate-200 shadow-lg p-4 sm:p-6 md:p-8 rounded-lg text-slate-800 font-sans relative"
              style={{ borderTop: ["modern", "classic", "minimal"].includes(templateId) ? `6px solid ${templateColor}` : undefined }}
            >
              
              <InvoiceTemplate
                templateId={templateId}
                templateColor={templateColor}
                invoice={{
                  invoice_number: invoiceNumber,
                  status: invoiceStatus,
                  currency: currency,
                  subtotal: getSubtotal(),
                  discount_amount: getGlobalDiscountAmount(),
                  taxes_amount: getTaxAmount(),
                  taxes_snapshot: taxRate > 0 ? [{ name: `PPN ${taxRate}%`, rate: taxRate, amount: getTaxAmount() }] : [],
                  pph23_amount: getPph23Amount(),
                  shipping_amount: shippingAmount,
                  shipping_label: shippingLabel || (locale === "en" ? "Shipping" : "Ongkos Kirim"),
                  total_amount: getTotal(),
                  paid_amount: invoiceStatus === "paid" ? getTotal() : paidAmount,
                  remaining_amount: invoiceStatus === "paid" ? 0 : Math.max(0, getTotal() - paidAmount),
                  adjustments: adjustmentsList,
                  payment_instructions: paymentInstructions,
                  notes: notes,
                  signature_text: signatureText,
                  signature_url: signatureUrl,
                  stamp_paid: stampPaid,
                  show_qris: showQris,
                  issue_date: issueDate,
                  due_date: dueDate,
                }}
                items={items.map((item) => ({
                  ...item,
                  subtotal: computeItemSubtotal(item),
                }))}
                business={{
                  name: selectedBusiness?.name || "Nama Bisnis",
                  address: selectedBusiness?.address || "Alamat Bisnis",
                  logo_url: selectedBusiness?.logo_url,
                  qris_url: selectedBusiness?.qris_url,
                  email: selectedBusiness?.email,
                  phone: selectedBusiness?.phone,
                }}
                customer={{
                  name: clientInfo.name || "Nama Pelanggan",
                  address: clientInfo.address || "Alamat Pelanggan",
                }}
                locale={locale}
              />

            </div>
          </div>
        </div>

      </form>

    </div>
  );
}
