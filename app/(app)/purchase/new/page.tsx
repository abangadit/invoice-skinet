"use client";
 
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { 
  Truck, 
  Plus, 
  Trash2, 
  ArrowLeft, 
  Building2, 
  Package, 
  Calendar, 
  FileText 
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
  unit: string;
  unit_price: number;
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

  // Totals
  const [subtotal, setSubtotal] = useState(0);
  const [taxAmount, setTaxAmount] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);
  const [isTaxEnabled, setIsTaxEnabled] = useState(true);

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

      // Fetch catalog items (only items that can be tracked, or all items)
      const { data: itemData } = await supabase
        .from("items")
        .select("id, name, unit, unit_price, is_inventory")
        .eq("business_id", activeBusiness.id)
        .order("name", { ascending: true });

      setVendors(vendorData || []);
      setCatalog(itemData || []);

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
        newItems[idx].itemId = selectedCatalog.id;
        newItems[idx].name = selectedCatalog.name;
        newItems[idx].unit = selectedCatalog.unit;
        // Set default unit price from catalog as unit cost placeholder
        newItems[idx].unitCost = selectedCatalog.unit_price;
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBusiness) return;
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

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center font-sans">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs text-slate-500 font-semibold mt-2">Memuat formulir PO...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      
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
                  className="w-full bg-white border border-slate-200 pl-10 pr-4 py-2.5 rounded-xl text-sm focus:outline-none focus:border-blue-500 transition appearance-none cursor-pointer"
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

        {/* Items Builder Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 md:p-6 shadow-sm space-y-4">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-3">
            <Package className="w-4 h-4 text-blue-600" /> Item Detail Pesanan
          </h3>

          <div className="space-y-3">
            {items.map((item, idx) => (
              <div key={idx} className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-3 bg-slate-50 border border-slate-150 rounded-xl">
                
                {/* Product Catalog Auto-complete */}
                <div className="w-full sm:flex-1 space-y-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase block">Katalog Item</label>
                  <select
                    value={item.itemId}
                    onChange={(e) => handleItemChange(idx, "itemId", e.target.value)}
                    className="w-full bg-white border border-slate-200 px-2.5 py-1.5 rounded-xl text-xs focus:outline-none"
                  >
                    <option value="">-- Pilih dari Katalog (Opsional) --</option>
                    {catalog.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.is_inventory ? "(Gudang)" : "(Non-Gudang)"}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Manual Custom Name */}
                <div className="w-full sm:flex-1 space-y-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase block">Nama Item *</label>
                  <input
                    type="text"
                    required
                    value={item.name}
                    onChange={(e) => handleItemChange(idx, "name", e.target.value)}
                    placeholder="Bahan baku / Nama produk..."
                    className="w-full border border-slate-200 px-2.5 py-1.5 rounded-xl text-xs focus:outline-none"
                  />
                </div>

                {/* Quantity */}
                <div className="w-24 space-y-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase block">Jumlah *</label>
                  <input
                    type="number"
                    required
                    min="0.001"
                    step="any"
                    value={item.quantity}
                    onChange={(e) => handleItemChange(idx, "quantity", Number(e.target.value))}
                    className="w-full border border-slate-200 px-2.5 py-1.5 rounded-xl text-xs focus:outline-none text-center font-bold"
                  />
                </div>

                {/* Unit */}
                <div className="w-20 space-y-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase block">Satuan</label>
                  <input
                    type="text"
                    required
                    value={item.unit}
                    onChange={(e) => handleItemChange(idx, "unit", e.target.value)}
                    placeholder="pcs"
                    className="w-full border border-slate-200 px-2.5 py-1.5 rounded-xl text-xs focus:outline-none text-center"
                  />
                </div>

                {/* Unit Cost */}
                <div className="w-32 space-y-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase block">Harga Beli Satuan *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="any"
                    value={item.unitCost}
                    onChange={(e) => handleItemChange(idx, "unitCost", Number(e.target.value))}
                    placeholder="0"
                    className="w-full border border-slate-200 px-2.5 py-1.5 rounded-xl text-xs focus:outline-none text-right font-semibold"
                  />
                </div>

                {/* Subtotal */}
                <div className="w-32 space-y-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase block">Subtotal</label>
                  <div className="py-2 text-right text-xs font-bold text-slate-800">
                    {formatCurrency(item.subtotal)}
                  </div>
                </div>

                {/* Delete Row */}
                <button
                  type="button"
                  onClick={() => handleRemoveItemRow(idx)}
                  disabled={items.length === 1}
                  className="p-1.5 text-slate-400 hover:text-rose-600 disabled:opacity-30 self-end sm:self-center transition"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={handleAddItemRow}
            className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1.5 py-1.5 px-3 rounded-lg hover:bg-blue-50 transition"
          >
            <Plus className="w-4 h-4" /> Tambah Baris Item
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
