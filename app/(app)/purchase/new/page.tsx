"use client";
 
import React, { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { 
  Truck, 
  Plus, 
  Trash2, 
  ArrowLeft, 
  Building2, 
  Package, 
  Calendar, 
  FileText,
  Search,
  Barcode,
  CheckCircle2,
  AlertCircle,
  X,
  ChevronDown
} from "lucide-react";
import { useBusiness } from "../../../../lib/context/BusinessContext";
import { createWebBrowserClient } from "../../../../lib/supabase/client";
import { useLanguage } from "../../../../lib/context/LanguageContext";

interface Vendor {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
}

interface CatalogItem {
  id: string;
  name: string;
  sku?: string | null;
  unit: string;
  unit_price: number;
  cogs_unit_price?: number;
  is_inventory?: boolean;
}

interface POItemRow {
  itemId: string;
  name: string;
  quantity: number;
  unit: string;
  unitCost: number;
  subtotal: number;
}

export default function NewPOPage() {
  const { activeBusiness } = useBusiness();
  const { locale, t } = useLanguage();
  const router = useRouter();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form States
  const [selectedVendorId, setSelectedVendorId] = useState("");
  const [poNumber, setPoNumber] = useState("");
  const [issueDate, setIssueDate] = useState("");
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<POItemRow[]>([
    { itemId: "", name: "", quantity: 1, unit: "pcs", unitCost: 0, subtotal: 0 }
  ]);

  // Scanner & Quick Search States
  const [quickSearch, setQuickSearch] = useState("");
  const [showQuickDropdown, setShowQuickDropdown] = useState(false);
  const quickSearchInputRef = useRef<HTMLInputElement>(null);
  const [activeRowSearchIdx, setActiveRowSearchIdx] = useState<number | null>(null);
  const [rowSearchQuery, setRowSearchQuery] = useState("");
  const [scanToast, setScanToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Totals
  const [subtotal, setSubtotal] = useState(0);
  const [taxAmount, setTaxAmount] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);
  const [isTaxEnabled, setIsTaxEnabled] = useState(true);

  // Audio Feedback for Barcode Scanner
  const playScannerBeep = (type: "success" | "error" = "success") => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === "success") {
        osc.type = "sine";
        osc.frequency.setValueAtTime(1760, ctx.currentTime);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.08);
      } else {
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(320, ctx.currentTime);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.18);
      }
    } catch {}
  };

  const showScanNotification = (message: string, type: "success" | "error" = "success") => {
    setScanToast({ message, type });
    setTimeout(() => {
      setScanToast(prev => (prev?.message === message ? null : prev));
    }, 2500);
  };

  const fetchData = async () => {
    if (!activeBusiness) return;
    try {
      setLoading(true);
      const supabase = createWebBrowserClient();

      // Fetch vendors
      const { data: vendorData } = await supabase
        .from("vendors")
        .select("id, name, email, phone, address")
        .eq("business_id", activeBusiness.id)
        .order("name", { ascending: true });

      // Fetch catalog items including sku and cost
      const { data: itemData } = await supabase
        .from("items")
        .select("id, name, sku, unit, unit_price, cogs_unit_price, is_inventory")
        .eq("business_id", activeBusiness.id)
        .order("name", { ascending: true });

      setVendors(vendorData || []);
      setCatalog((itemData || []).map((i: any) => ({
        ...i,
        unit_price: Number(i.unit_price || 0),
        cogs_unit_price: Number(i.cogs_unit_price || 0)
      })));

      // Auto-generate clean PO number
      const randStr = Math.floor(1000 + Math.random() * 9000);
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
      setPoNumber(`PO-${dateStr}-${randStr}`);
      
      setIssueDate(new Date().toISOString().split("T")[0]);
    } catch (err) {
      console.error("Error fetching dependencies for PO page:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeBusiness]);

  // Set initial tax settings from active business defaults
  useEffect(() => {
    if (activeBusiness) {
      setIsTaxEnabled(activeBusiness.po_tax_enabled !== false);
    }
  }, [activeBusiness]);

  // Recalculate totals whenever items, isTaxEnabled, or activeBusiness changes
  useEffect(() => {
    const sub = items.reduce((sum, item) => sum + (item.unitCost * item.quantity), 0);
    const rate = activeBusiness?.tax_rate_percent ?? 11;
    const tax = isTaxEnabled ? (sub * (rate / 100)) : 0;
    const tot = sub + tax;
    
    setSubtotal(sub);
    setTaxAmount(tax);
    setTotalAmount(tot);
  }, [items, isTaxEnabled, activeBusiness]);

  // Add Item From Catalog helper (used by Barcode Scanner and Search)
  const addCatalogItemToPO = (catItem: CatalogItem) => {
    const defaultCost = catItem.cogs_unit_price && catItem.cogs_unit_price > 0 
      ? catItem.cogs_unit_price 
      : catItem.unit_price;

    setItems(prevItems => {
      // Check if already in PO items list
      const existingIdx = prevItems.findIndex(i => i.itemId === catItem.id);
      if (existingIdx >= 0) {
        const updated = [...prevItems];
        const newQty = updated[existingIdx].quantity + 1;
        updated[existingIdx] = {
          ...updated[existingIdx],
          quantity: newQty,
          subtotal: newQty * updated[existingIdx].unitCost
        };
        return updated;
      }

      // If the first row is completely empty, replace it
      if (prevItems.length === 1 && !prevItems[0].itemId && !prevItems[0].name && prevItems[0].quantity === 1 && prevItems[0].unitCost === 0) {
        return [{
          itemId: catItem.id,
          name: catItem.name,
          quantity: 1,
          unit: catItem.unit || "pcs",
          unitCost: defaultCost,
          subtotal: defaultCost
        }];
      }

      // Append new row
      return [
        ...prevItems,
        {
          itemId: catItem.id,
          name: catItem.name,
          quantity: 1,
          unit: catItem.unit || "pcs",
          unitCost: defaultCost,
          subtotal: defaultCost
        }
      ];
    });

    playScannerBeep("success");
    showScanNotification(`+1 "${catItem.name}" berhasil ditambahkan ke daftar item`, "success");
    setQuickSearch("");
    setShowQuickDropdown(false);
    quickSearchInputRef.current?.focus();
  };

  const handleScanOrSubmitQuickQuery = (rawCode: string) => {
    const code = rawCode.trim();
    if (!code) return;

    // 1. Exact match by SKU / Barcode
    const exactSkuMatch = catalog.find(item => item.sku && item.sku.toLowerCase() === code.toLowerCase());
    if (exactSkuMatch) {
      addCatalogItemToPO(exactSkuMatch);
      return;
    }

    // 2. Exact match by Name
    const exactNameMatch = catalog.find(item => item.name.toLowerCase() === code.toLowerCase());
    if (exactNameMatch) {
      addCatalogItemToPO(exactNameMatch);
      return;
    }

    // 3. Single partial match
    const matches = catalog.filter(item => {
      const q = code.toLowerCase();
      return item.name.toLowerCase().includes(q) || (item.sku && item.sku.toLowerCase().includes(q));
    });

    if (matches.length === 1) {
      addCatalogItemToPO(matches[0]);
      return;
    }

    if (matches.length === 0) {
      playScannerBeep("error");
      showScanNotification(`Item dengan barcode "${code}" tidak ditemukan di katalog!`, "error");
    }
  };

  // Hardware Scanner Global Listener
  useEffect(() => {
    let barcodeBuffer = "";
    let lastKeyTime = 0;

    const handleKeyDown = (e: KeyboardEvent) => {
      // If focused on input or textarea, skip global buffer (input's onKeyDown will handle Enter)
      const target = e.target as HTMLElement;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) {
        return;
      }

      const currentTime = Date.now();
      if (currentTime - lastKeyTime > 80) {
        barcodeBuffer = "";
      }
      lastKeyTime = currentTime;

      if (e.key === "Enter") {
        if (barcodeBuffer.length >= 2) {
          handleScanOrSubmitQuickQuery(barcodeBuffer);
          barcodeBuffer = "";
        }
      } else if (e.key.length === 1) {
        barcodeBuffer += e.key;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [catalog, items]);

  const handleAddItemRow = () => {
    setItems([
      ...items,
      { itemId: "", name: "", quantity: 1, unit: "pcs", unitCost: 0, subtotal: 0 }
    ]);
  };

  const handleRemoveItemRow = (idx: number) => {
    if (items.length === 1) return;
    setItems(items.filter((_, i) => i !== idx));
  };

  const handleItemChange = (idx: number, field: keyof POItemRow, val: any) => {
    const newItems = [...items];
    
    if (field === "itemId") {
      const selectedCatalog = catalog.find(c => c.id === val);
      if (selectedCatalog) {
        const defaultCost = selectedCatalog.cogs_unit_price && selectedCatalog.cogs_unit_price > 0 
          ? selectedCatalog.cogs_unit_price 
          : selectedCatalog.unit_price;

        newItems[idx].itemId = selectedCatalog.id;
        newItems[idx].name = selectedCatalog.name;
        newItems[idx].unit = selectedCatalog.unit;
        newItems[idx].unitCost = defaultCost;
      } else {
        newItems[idx].itemId = "";
        newItems[idx].name = "";
        newItems[idx].unit = "pcs";
        newItems[idx].unitCost = 0;
      }
    } else {
      newItems[idx][field] = val as never;
    }

    // Recalculate subtotal for row
    const q = Number(newItems[idx].quantity || 0);
    const c = Number(newItems[idx].unitCost || 0);
    newItems[idx].subtotal = q * c;

    setItems(newItems);
  };

  const selectCatalogForItemRow = (idx: number, catItem: CatalogItem) => {
    const defaultCost = catItem.cogs_unit_price && catItem.cogs_unit_price > 0 
      ? catItem.cogs_unit_price 
      : catItem.unit_price;

    const newItems = [...items];
    newItems[idx].itemId = catItem.id;
    newItems[idx].name = catItem.name;
    newItems[idx].unit = catItem.unit;
    newItems[idx].unitCost = defaultCost;
    newItems[idx].subtotal = (newItems[idx].quantity || 1) * defaultCost;
    setItems(newItems);
    setActiveRowSearchIdx(null);
    setRowSearchQuery("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBusiness || submitting) return;
    if (!selectedVendorId) {
      alert("Harap pilih Vendor pemasok terlebih dahulu!");
      return;
    }

    // Validation
    const invalidItem = items.some(item => !item.name || item.quantity <= 0 || item.unitCost < 0);
    if (invalidItem) {
      alert("Pastikan semua baris item terisi dengan jumlah dan harga valid!");
      return;
    }

    try {
      setSubmitting(true);
      const supabase = createWebBrowserClient();

      // Get selected vendor snapshot
      const selectedVendor = vendors.find(v => v.id === selectedVendorId);
      
      // 1. Insert Purchase Order Header
      const { data: poData, error: poError } = await supabase
        .from("purchase_orders")
        .insert({
          business_id: activeBusiness.id,
          vendor_id: selectedVendorId,
          vendor_snapshot: selectedVendor ? {
            name: selectedVendor.name,
            email: selectedVendor.email,
            phone: selectedVendor.phone,
            address: selectedVendor.address
          } : null,
          po_number: poNumber,
          status: "draft", // Starts as draft
          payment_status: "unpaid",
          issue_date: issueDate,
          expected_delivery_date: expectedDeliveryDate || null,
          due_date: dueDate || null,
          subtotal: subtotal,
          tax_amount: taxAmount,
          total_amount: totalAmount,
          notes: notes || null
        })
        .select("id")
        .single();

      if (poError || !poData) throw poError || new Error("Failed to save PO header");

      // 2. Insert Purchase Order Lines
      const itemsPayload = items.map(item => ({
        po_id: poData.id,
        item_id: item.itemId || null,
        name: item.name,
        quantity: item.quantity,
        unit: item.unit,
        unit_cost: item.unitCost,
        subtotal: item.subtotal
      }));

      const { error: linesError } = await supabase
        .from("purchase_order_items")
        .insert(itemsPayload);

      if (linesError) throw linesError;

      alert("Purchase Order berhasil disimpan sebagai Draft!");
      router.push("/purchase");
    } catch (err) {
      console.error("Error saving Purchase Order:", err);
      alert("Gagal membuat Purchase Order.");
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: activeBusiness?.default_currency || "IDR",
      maximumFractionDigits: 0
    }).format(val);
  };

  const filteredQuickCatalog = catalog.filter(c => {
    if (!quickSearch.trim()) return false;
    const q = quickSearch.toLowerCase().trim();
    return c.name.toLowerCase().includes(q) || (c.sku && c.sku.toLowerCase().includes(q));
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center font-sans">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs text-slate-500 font-semibold mt-2">Memuat formulir PO...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <button onClick={() => router.push("/purchase")} className="hover:text-blue-600 transition flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" /> Kembali ke Daftar PO
        </button>
      </div>

      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          Buat Purchase Order Baru
        </h2>
        <p className="text-xs text-slate-500 mt-0.5 font-medium">Buat pengajuan pemesanan pasokan barang atau persediaan ke pemasok eksternal.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* Top Section Info Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 md:p-6 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-4">
          
          <div className="space-y-4">
            {/* Vendor Selection */}
            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Pilih Pemasok (Vendor) *</label>
              <div className="relative">
                <Building2 className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                <select
                  required
                  value={selectedVendorId}
                  onChange={(e) => setSelectedVendorId(e.target.value)}
                  className="w-full bg-white border border-slate-200 pl-10 pr-4 py-2.5 rounded-xl text-sm focus:outline-none focus:border-blue-500 transition appearance-none cursor-pointer font-medium"
                >
                  <option value="">-- Pilih Vendor --</option>
                  {vendors.map(v => (
                    <option key={v.id} value={v.id}>{v.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* PO Number */}
            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Nomor Purchase Order *</label>
              <input
                type="text"
                required
                value={poNumber}
                onChange={(e) => setPoNumber(e.target.value)}
                className="w-full border border-slate-200 px-3 py-2.5 rounded-xl text-sm focus:outline-none focus:border-blue-500 transition font-mono font-bold"
              />
            </div>
          </div>

          <div className="space-y-4">
            {/* Dates */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Tanggal Terbit *</label>
                <div className="relative">
                  <Calendar className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-slate-400 w-3.5 h-3.5 pointer-events-none" />
                  <input
                    type="date"
                    required
                    value={issueDate}
                    onChange={(e) => setIssueDate(e.target.value)}
                    className="w-full border border-slate-200 pl-8 pr-2 py-2 rounded-xl text-xs focus:outline-none"
                  />
                </div>
              </div>
              
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Estimasi Kirim</label>
                <div className="relative">
                  <Calendar className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-slate-400 w-3.5 h-3.5 pointer-events-none" />
                  <input
                    type="date"
                    value={expectedDeliveryDate}
                    onChange={(e) => setExpectedDeliveryDate(e.target.value)}
                    className="w-full border border-slate-200 pl-8 pr-2 py-2 rounded-xl text-xs focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-amber-600 uppercase tracking-wider block">Tenggat Waktu (Due)</label>
                <div className="relative">
                  <Calendar className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-amber-500 w-3.5 h-3.5 pointer-events-none" />
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full border border-amber-200 bg-amber-50/30 pl-8 pr-2 py-2 rounded-xl text-xs focus:outline-none focus:border-amber-500 font-medium"
                  />
                </div>
              </div>
            </div>

            {/* Notes to Supplier */}
            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Catatan ke Vendor (Instruksi Pengiriman / Pembayaran)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Masukkan detail instruksi, termin pembayaran, nomor rekening vendor..."
                rows={2}
                className="w-full border border-slate-200 px-3 py-2 rounded-xl text-xs focus:outline-none"
              />
            </div>
          </div>

        </div>

        {/* Items Builder Card with Barcode Scanner & Search */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 md:p-6 shadow-sm space-y-4">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Package className="w-4 h-4 text-blue-600" /> Item Detail Pesanan
            </h3>
            <span className="text-[11px] text-slate-400 font-medium">
              Gunakan barcode scanner atau ketik nama produk di bawah ini untuk input instan
            </span>
          </div>

          {/* Quick Scanner & Text Search Input */}
          <div className="relative">
            <div className="flex items-center gap-2 p-1.5 bg-slate-50 border-2 border-blue-100 rounded-2xl focus-within:border-blue-500 focus-within:bg-white transition shadow-xs">
              <div className="pl-3 pr-1 text-blue-600 flex items-center gap-1.5">
                <Barcode className="w-5 h-5" />
                <Search className="w-4 h-4 text-slate-400" />
              </div>
              <input
                ref={quickSearchInputRef}
                type="text"
                value={quickSearch}
                onChange={(e) => {
                  setQuickSearch(e.target.value);
                  setShowQuickDropdown(true);
                }}
                onFocus={() => setShowQuickDropdown(true)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && quickSearch.trim().length > 0) {
                    e.preventDefault();
                    handleScanOrSubmitQuickQuery(quickSearch);
                  }
                }}
                placeholder="Scan Barcode / Ketik Nama Produk / SKU untuk menambahkan item..."
                className="w-full bg-transparent py-2 pr-4 text-sm font-semibold placeholder-slate-400 focus:outline-none"
              />
              {quickSearch && (
                <button
                  type="button"
                  onClick={() => {
                    setQuickSearch("");
                    quickSearchInputRef.current?.focus();
                  }}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-full mr-2"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Quick Live Search Results Dropdown */}
            {showQuickDropdown && filteredQuickCatalog.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-xl z-30 max-h-64 overflow-y-auto divide-y divide-slate-100 animate-slide-up">
                {filteredQuickCatalog.map((catItem) => (
                  <button
                    key={catItem.id}
                    type="button"
                    onClick={() => addCatalogItemToPO(catItem)}
                    className="w-full text-left p-3 hover:bg-blue-50/70 transition flex items-center justify-between group"
                  >
                    <div>
                      <div className="font-bold text-xs text-slate-900 group-hover:text-blue-600 transition">
                        {catItem.name}
                      </div>
                      <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5">
                        {catItem.sku && (
                          <span className="font-mono bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded font-bold">
                            SKU: {catItem.sku}
                          </span>
                        )}
                        <span>Satuan: {catItem.unit}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-extrabold text-blue-600">
                        {formatCurrency(catItem.cogs_unit_price || catItem.unit_price)}
                      </div>
                      <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.2 rounded">
                        + Tambah ke PO
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Scan Toast Banner */}
          {scanToast && (
            <div className={`p-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-between shadow-xs animate-fade-in ${
              scanToast.type === "success" 
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200" 
                : "bg-rose-50 text-rose-700 border border-rose-200"
            }`}>
              <span className="flex items-center gap-2">
                {scanToast.type === "success" ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-rose-600" />}
                {scanToast.message}
              </span>
              <button type="button" onClick={() => setScanToast(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Line Items Rows */}
          <div className="space-y-3 pt-2">
            {items.map((item, idx) => {
              const currentCat = catalog.find(c => c.id === item.itemId);
              const isRowSearchOpen = activeRowSearchIdx === idx;
              const filteredRowCatalog = catalog.filter(c => {
                if (!rowSearchQuery.trim()) return true;
                const q = rowSearchQuery.toLowerCase().trim();
                return c.name.toLowerCase().includes(q) || (c.sku && c.sku.toLowerCase().includes(q));
              });

              return (
                <div key={idx} className="flex flex-col lg:flex-row items-start lg:items-center gap-3 p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl transition hover:border-slate-300">
                  
                  {/* Searchable Catalog Item Picker */}
                  <div className="w-full lg:w-72 space-y-1 relative">
                    <label className="text-[9px] font-bold text-slate-400 uppercase block">Katalog Item</label>
                    
                    <button
                      type="button"
                      onClick={() => {
                        setActiveRowSearchIdx(isRowSearchOpen ? null : idx);
                        setRowSearchQuery("");
                      }}
                      className="w-full bg-white border border-slate-200 px-3 py-2 rounded-xl text-xs flex items-center justify-between text-left hover:border-blue-400 transition"
                    >
                      <span className={`truncate ${currentCat ? "font-bold text-slate-900" : "text-slate-400"}`}>
                        {currentCat ? `${currentCat.name} (${currentCat.unit})` : "-- Cari dari Katalog --"}
                      </span>
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1" />
                    </button>

                    {/* Row Search Popover */}
                    {isRowSearchOpen && (
                      <div className="absolute top-full left-0 w-80 bg-white border border-slate-200 rounded-2xl shadow-xl z-40 p-2 space-y-2 mt-1 animate-slide-up">
                        <div className="relative">
                          <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-slate-400 w-3.5 h-3.5" />
                          <input
                            autoFocus
                            type="text"
                            value={rowSearchQuery}
                            onChange={(e) => setRowSearchQuery(e.target.value)}
                            placeholder="Cari nama atau barcode..."
                            className="w-full bg-slate-50 border border-slate-200 pl-8 pr-3 py-1.5 rounded-xl text-xs focus:outline-none focus:bg-white"
                          />
                        </div>

                        <div className="max-h-48 overflow-y-auto divide-y divide-slate-100">
                          <button
                            type="button"
                            onClick={() => {
                              handleItemChange(idx, "itemId", "");
                              setActiveRowSearchIdx(null);
                            }}
                            className="w-full text-left px-2.5 py-1.5 text-xs text-slate-500 hover:bg-slate-50 rounded-lg italic"
                          >
                            -- Kosongkan (Item Manual) --
                          </button>
                          {filteredRowCatalog.map((catItem) => (
                            <button
                              key={catItem.id}
                              type="button"
                              onClick={() => selectCatalogForItemRow(idx, catItem)}
                              className="w-full text-left p-2 hover:bg-blue-50 rounded-xl transition flex items-center justify-between group"
                            >
                              <div>
                                <div className="text-xs font-bold text-slate-900 group-hover:text-blue-600">
                                  {catItem.name}
                                </div>
                                {catItem.sku && (
                                  <div className="text-[9px] font-mono text-slate-400">
                                    SKU: {catItem.sku}
                                  </div>
                                )}
                              </div>
                              <span className="text-[11px] font-bold text-blue-600">
                                {formatCurrency(catItem.cogs_unit_price || catItem.unit_price)}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Custom Name */}
                  <div className="w-full lg:flex-1 space-y-1">
                    <label className="text-[9px] font-bold text-slate-400 uppercase block">Nama Item *</label>
                    <input
                      type="text"
                      required
                      value={item.name}
                      onChange={(e) => handleItemChange(idx, "name", e.target.value)}
                      placeholder="Nama produk / bahan baku..."
                      className="w-full bg-white border border-slate-200 px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-blue-500 font-semibold"
                    />
                  </div>

                  {/* Quantity */}
                  <div className="w-full sm:w-28 space-y-1">
                    <label className="text-[9px] font-bold text-slate-400 uppercase block">Jumlah *</label>
                    <input
                      type="number"
                      required
                      min="0.001"
                      step="any"
                      value={item.quantity}
                      onChange={(e) => handleItemChange(idx, "quantity", Number(e.target.value))}
                      className="w-full bg-white border border-slate-200 px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-blue-500 text-center font-bold"
                    />
                  </div>

                  {/* Unit */}
                  <div className="w-full sm:w-24 space-y-1">
                    <label className="text-[9px] font-bold text-slate-400 uppercase block">Satuan</label>
                    <input
                      type="text"
                      required
                      value={item.unit}
                      onChange={(e) => handleItemChange(idx, "unit", e.target.value)}
                      placeholder="pcs"
                      className="w-full bg-white border border-slate-200 px-3 py-2 rounded-xl text-xs focus:outline-none text-center"
                    />
                  </div>

                  {/* Unit Cost */}
                  <div className="w-full sm:w-36 space-y-1">
                    <label className="text-[9px] font-bold text-slate-400 uppercase block">Harga Beli Satuan *</label>
                    <input
                      type="number"
                      required
                      min="0"
                      step="any"
                      value={item.unitCost}
                      onChange={(e) => handleItemChange(idx, "unitCost", Number(e.target.value))}
                      placeholder="0"
                      className="w-full bg-white border border-slate-200 px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-blue-500 text-right font-semibold"
                    />
                  </div>

                  {/* Subtotal */}
                  <div className="w-full sm:w-36 space-y-1">
                    <label className="text-[9px] font-bold text-slate-400 uppercase block text-right">Subtotal</label>
                    <div className="py-2 text-right text-xs font-extrabold text-slate-900">
                      {formatCurrency(item.subtotal)}
                    </div>
                  </div>

                  {/* Delete Button */}
                  <button
                    type="button"
                    onClick={() => handleRemoveItemRow(idx)}
                    disabled={items.length === 1}
                    className="p-2 text-slate-400 hover:text-rose-600 disabled:opacity-30 self-end lg:self-center transition rounded-lg hover:bg-rose-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>

          <button
            type="button"
            onClick={handleAddItemRow}
            className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1.5 py-2 px-4 rounded-xl hover:bg-blue-50 transition border border-dashed border-blue-200"
          >
            <Plus className="w-4 h-4" /> Tambah Baris Manual
          </button>
        </div>

        {/* Bottom Totals Section */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 md:p-6 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="text-xs space-y-1.5 max-w-sm">
            <span className="font-bold text-slate-700 block">Informasi Pajak PO</span>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="toggleTax"
                checked={isTaxEnabled}
                onChange={(e) => setIsTaxEnabled(e.target.checked)}
                className="rounded text-blue-600 focus:ring-0 w-4 h-4 cursor-pointer"
              />
              <label htmlFor="toggleTax" className="text-slate-600 cursor-pointer select-none">
                Kenakan PPN {activeBusiness?.tax_rate_percent ?? 11}% pada pesanan ini
              </label>
            </div>
            <p className="text-[11px] text-slate-400">
              * PO yang diterbitkan akan berstatus <strong>Draft</strong> hingga dikonfirmasi ke vendor. Saat barang diterima (Received), Utang Dagang (2101) akan bertambah otomatis.
            </p>
          </div>

          <div className="w-full sm:w-80 space-y-2 border-t sm:border-t-0 pt-4 sm:pt-0">
            <div className="flex justify-between text-xs text-slate-500">
              <span>Subtotal Item</span>
              <span className="font-semibold text-slate-800">{formatCurrency(subtotal)}</span>
            </div>
            {isTaxEnabled && (
              <div className="flex justify-between text-xs text-slate-500">
                <span>PPN {activeBusiness?.tax_rate_percent ?? 11}%</span>
                <span className="font-semibold text-slate-800">{formatCurrency(taxAmount)}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-bold text-slate-900 border-t border-slate-100 pt-2">
              <span>Total Nilai PO</span>
              <span className="text-blue-600">{formatCurrency(totalAmount)}</span>
            </div>
          </div>
        </div>

        {/* Submit Actions */}
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => router.push("/purchase")}
            className="px-5 py-2.5 border border-slate-200 text-slate-600 font-bold rounded-xl text-xs hover:bg-slate-50 transition"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition shadow-sm disabled:opacity-50 flex items-center gap-1.5"
          >
            <Truck className="w-4 h-4" /> {submitting ? "Menyimpan..." : "Simpan Purchase Order"}
          </button>
        </div>

      </form>

    </div>
  );
}
