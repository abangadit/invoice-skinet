"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { 
  ClipboardCheck, 
  ArrowLeft, 
  Plus, 
  Trash2, 
  AlertCircle, 
  User, 
  Briefcase,
  TrendingUp,
  Percent
} from "lucide-react";
import { useBusiness } from "../../../../lib/context/BusinessContext";
import { createWebBrowserClient } from "../../../../lib/supabase/client";

interface Customer {
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
  cogs_unit_price: number;
  is_inventory: boolean;
}

interface SOItemRow {
  itemId: string;
  name: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  discountAmount: number;
  cogs: number;
  subtotal: number;
}

export default function NewSalesOrderPage() {
  const { activeBusiness } = useBusiness();
  const router = useRouter();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState("");

  // Form states
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [soNumber, setSoNumber] = useState("");
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split("T")[0]);
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState("");
  const [notes, setNotes] = useState("");
  const [rows, setRows] = useState<SOItemRow[]>([
    { itemId: "", name: "", quantity: 1, unit: "pcs", unitPrice: 0, discountAmount: 0, cogs: 0, subtotal: 0 }
  ]);
  const [applyTax, setApplyTax] = useState(false);

  useEffect(() => {
    const generateSoNumber = () => {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, "0");
      const random = Math.floor(1000 + Math.random() * 9000);
      setSoNumber(`SO/${year}/${month}/${random}`);
    };
    generateSoNumber();
  }, []);

  const fetchFormOptions = async () => {
    if (!activeBusiness) return;
    try {
      setLoading(true);
      const supabase = createWebBrowserClient();

      // Fetch Customers
      const { data: custData, error: custError } = await supabase
        .from("customers")
        .select("id, name, email, phone, address")
        .eq("business_id", activeBusiness.id)
        .order("name", { ascending: true });

      if (custError) throw custError;
      setCustomers(custData || []);

      // Fetch Catalog Items
      const { data: catData, error: catError } = await supabase
        .from("items")
        .select("id, name, unit, unit_price, cogs_unit_price, is_inventory")
        .eq("business_id", activeBusiness.id)
        .order("name", { ascending: true });

      if (catError) throw catError;
      setCatalog(catData || []);

      // Fetch Warehouses
      const { data: whData } = await supabase
        .from("warehouses")
        .select("*")
        .eq("business_id", activeBusiness.id)
        .order("name", { ascending: true });
      setWarehouses(whData || []);
      if (whData && whData.length > 0) {
        setSelectedWarehouseId(whData[0].id);
      }
    } catch (err) {
      console.error("Error loading SO form details:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFormOptions();
  }, [activeBusiness]);

  const handleAddRow = () => {
    setRows([...rows, { itemId: "", name: "", quantity: 1, unit: "pcs", unitPrice: 0, discountAmount: 0, cogs: 0, subtotal: 0 }]);
  };

  const handleRemoveRow = (index: number) => {
    if (rows.length <= 1) return;
    setRows(rows.filter((_, i) => i !== index));
  };

  const handleUpdateRow = (index: number, field: keyof SOItemRow, value: any) => {
    const updated = [...rows];
    const row = updated[index];

    if (field === "itemId") {
      const item = catalog.find(c => c.id === value);
      if (item) {
        row.itemId = item.id;
        row.name = item.name;
        row.unit = item.unit || "pcs";
        row.unitPrice = Number(item.unit_price || 0);
        row.cogs = Number(item.cogs_unit_price || 0);
      } else {
        row.itemId = "";
        row.name = "";
        row.unit = "pcs";
        row.unitPrice = 0;
        row.cogs = 0;
      }
    } else {
      (row as any)[field] = value;
    }

    // Recalculate row subtotal
    const qty = Number(row.quantity || 0);
    const price = Number(row.unitPrice || 0);
    const disc = Number(row.discountAmount || 0);
    row.subtotal = Math.max(0, (qty * price) - disc);

    setRows(updated);
  };

  // Profit Margin calculations for SO preview
  const calculateTotals = () => {
    const subtotal = rows.reduce((sum, r) => sum + r.subtotal, 0);
    const totalCogs = rows.reduce((sum, r) => sum + (Number(r.quantity || 0) * Number(r.cogs || 0)), 0);
    const taxRate = activeBusiness?.tax_rate_percent ?? 11;
    const taxAmount = applyTax ? Math.round(subtotal * (taxRate / 100) * 100) / 100 : 0;
    const totalAmount = subtotal + taxAmount;
    
    // Profit margin untung kotor
    const profitMargin = subtotal - totalCogs;
    const profitPercent = subtotal > 0 ? (profitMargin / subtotal) * 100 : 0;

    return { subtotal, totalCogs, taxAmount, totalAmount, profitMargin, profitPercent };
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: activeBusiness?.default_currency || "IDR",
      maximumFractionDigits: 0
    }).format(val);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBusiness) return;
    if (!selectedCustomerId) {
      setErrorMsg("Harap pilih pelanggan!");
      return;
    }
    if (rows.some(r => !r.itemId)) {
      setErrorMsg("Harap pilih produk untuk semua baris order!");
      return;
    }

    try {
      setSaving(true);
      setErrorMsg("");
      const supabase = createWebBrowserClient();

      const { subtotal, taxAmount, totalAmount } = calculateTotals();

      // 1. Insert Sales Order Header
      const { data: newSO, error: soError } = await supabase
        .from("sales_orders")
        .insert({
          business_id: activeBusiness.id,
          customer_id: selectedCustomerId,
          so_number: soNumber,
          status: "draft",
          order_date: orderDate,
          expected_delivery_date: expectedDeliveryDate || null,
          currency: activeBusiness.default_currency || "IDR",
          subtotal,
          tax_amount: taxAmount,
          total_amount: totalAmount,
          notes,
          warehouse_id: activeBusiness?.is_multi_warehouse_enabled ? (selectedWarehouseId || null) : null
        })
        .select()
        .single();

      if (soError) {
        if (soError.code === "23505") {
          throw new Error("Nomor Sales Order sudah digunakan.");
        }
        throw soError;
      }

      // 2. Insert Sales Order Items
      const itemsPayload = rows.map(r => ({
        so_id: newSO.id,
        item_id: r.itemId,
        name: r.name,
        quantity: r.quantity,
        unit: r.unit,
        unit_price: r.unitPrice,
        discount_amount: r.discountAmount,
        tax_type: applyTax ? "ppn" : null,
        subtotal: r.subtotal
      }));

      const { error: itemsError } = await supabase
        .from("sales_order_items")
        .insert(itemsPayload);

      if (itemsError) {
        // Rollback SO header
        await supabase.from("sales_orders").delete().eq("id", newSO.id);
        throw itemsError;
      }

      alert("Sales Order berhasil dibuat dengan status Draft!");
      router.push(`/sales/${newSO.id}`);
    } catch (err: any) {
      console.error("Error creating SO:", err);
      setErrorMsg(err.message || "Gagal membuat Sales Order.");
    } finally {
      setSaving(false);
    }
  };

  const { subtotal, totalCogs, taxAmount, totalAmount, profitMargin, profitPercent } = calculateTotals();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center font-sans">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs text-slate-500 font-semibold mt-2">Memuat formulir Sales Order...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <button 
          onClick={() => router.push("/sales")}
          className="hover:text-blue-600 transition flex items-center gap-1.5 text-xs text-slate-500 font-semibold"
        >
          <ArrowLeft className="w-4 h-4" /> Kembali
        </button>
        <h3 className="text-md font-bold text-slate-900 flex items-center gap-2">
          <ClipboardCheck className="w-5 h-5 text-blue-600" /> Buat Sales Order (SO) Baru
        </h3>
      </div>

      {errorMsg && (
        <div className="bg-rose-50 border border-rose-100 text-rose-600 text-xs px-3.5 py-2.5 rounded-xl flex items-start gap-2">
          <AlertCircle className="w-4.5 h-4.5 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-xs font-semibold">
        
        {/* Left Columns - Form inputs & items */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Section: Basic info */}
          <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm space-y-4 card-shadow">
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Detail Pesanan</h4>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-slate-500">Pilih Pelanggan</label>
                <select
                  required
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  className="w-full bg-white border border-slate-200 px-3.5 py-2.5 rounded-xl text-slate-800 focus:outline-none focus:border-blue-500 shadow-sm"
                >
                  <option value="">-- Pilih Pelanggan --</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.phone ? `(${c.phone})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-slate-500">Nomor Sales Order (Edit jika manual)</label>
                <input
                  type="text"
                  required
                  value={soNumber}
                  onChange={(e) => setSoNumber(e.target.value)}
                  className="w-full bg-white border border-slate-200 px-3.5 py-2.5 rounded-xl text-slate-800 focus:outline-none focus:border-blue-500 shadow-sm font-mono font-bold"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-500">Tanggal Order</label>
                <input
                  type="date"
                  required
                  value={orderDate}
                  onChange={(e) => setOrderDate(e.target.value)}
                  className="w-full bg-white border border-slate-200 px-3.5 py-2 rounded-xl text-slate-800 focus:outline-none focus:border-blue-500 shadow-sm font-bold"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-500">Estimasi Pengiriman (Opsional)</label>
                <input
                  type="date"
                  value={expectedDeliveryDate}
                  onChange={(e) => setExpectedDeliveryDate(e.target.value)}
                  className="w-full bg-white border border-slate-200 px-3.5 py-2.5 rounded-xl text-slate-800 focus:outline-none focus:border-blue-500 shadow-sm font-bold"
                />
              </div>

              {activeBusiness?.is_multi_warehouse_enabled && (
                <div className="space-y-1">
                  <label className="text-slate-500">Alokasi Gudang (Stok)</label>
                  <select
                    value={selectedWarehouseId}
                    onChange={(e) => setSelectedWarehouseId(e.target.value)}
                    className="w-full bg-white border border-slate-200 px-3.5 py-2.5 rounded-xl text-slate-800 focus:outline-none focus:border-blue-500 shadow-sm font-bold"
                  >
                    {warehouses.length === 0 ? (
                      <option value="">Tidak ada gudang</option>
                    ) : (
                      warehouses.map((wh) => (
                        <option key={wh.id} value={wh.id}>{wh.name} {wh.code ? `(${wh.code})` : ""}</option>
                      ))
                    )}
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Section: SO Line Items */}
          <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm space-y-4 card-shadow">
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Baris Item SO</h4>
            
            <div className="space-y-3">
              {rows.map((row, index) => (
                <div key={index} className="grid grid-cols-1 sm:grid-cols-12 gap-2 p-3 bg-slate-50 rounded-xl border border-slate-100 items-end">
                  
                  {/* Select Item */}
                  <div className="sm:col-span-4 space-y-1">
                    <label className="text-slate-400 text-[10px]">Pilih Barang</label>
                    <select
                      required
                      value={row.itemId}
                      onChange={(e) => handleUpdateRow(index, "itemId", e.target.value)}
                      className="w-full bg-white border border-slate-200 px-2 py-1.5 rounded-lg text-xs font-semibold shadow-sm"
                    >
                      <option value="">-- Autocomplete Item --</option>
                      {catalog.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({formatCurrency(c.unit_price)})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Quantity */}
                  <div className="sm:col-span-2 space-y-1">
                    <label className="text-slate-400 text-[10px]">Qty</label>
                    <div className="flex items-center bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
                      <input
                        type="number"
                        required
                        min="0.001"
                        step="any"
                        value={row.quantity}
                        onChange={(e) => handleUpdateRow(index, "quantity", Number(e.target.value))}
                        className="w-full px-2 py-1.5 text-center text-xs font-bold focus:outline-none"
                      />
                      <span className="text-[10px] font-bold text-slate-400 px-1.5 border-l border-slate-100">{row.unit}</span>
                    </div>
                  </div>

                  {/* Unit Price */}
                  <div className="sm:col-span-2.5 space-y-1">
                    <label className="text-slate-400 text-[10px]">Harga Jual Unit</label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={row.unitPrice}
                      onChange={(e) => handleUpdateRow(index, "unitPrice", Number(e.target.value))}
                      className="w-full bg-white border border-slate-200 px-2 py-1.5 rounded-lg text-right text-xs font-bold shadow-sm"
                    />
                  </div>

                  {/* Discount Amount */}
                  <div className="sm:col-span-2 space-y-1">
                    <label className="text-slate-400 text-[10px]">Diskon Unit</label>
                    <input
                      type="number"
                      min="0"
                      value={row.discountAmount}
                      onChange={(e) => handleUpdateRow(index, "discountAmount", Number(e.target.value))}
                      className="w-full bg-white border border-slate-200 px-2 py-1.5 rounded-lg text-right text-xs font-bold shadow-sm"
                    />
                  </div>

                  {/* Delete Button */}
                  <div className="sm:col-span-1.5 flex justify-center py-1">
                    <button
                      type="button"
                      onClick={() => handleRemoveRow(index)}
                      disabled={rows.length <= 1}
                      className={`p-1.5 rounded-lg border transition ${
                        rows.length <= 1 
                          ? "text-slate-300 border-slate-100 bg-slate-50 cursor-not-allowed" 
                          : "text-rose-500 border-rose-100 hover:bg-rose-50 active:scale-95 shadow-sm"
                      }`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Margin Helper line */}
                  {row.itemId && (
                    <div className="col-span-12 mt-1.5 flex justify-between text-[9px] font-bold border-t border-slate-200/50 pt-1 text-slate-400">
                      <span>Harga Pokok (HPP): {formatCurrency(row.cogs)}</span>
                      {row.unitPrice > 0 && (
                        <span className={row.unitPrice < row.cogs ? "text-rose-500" : "text-emerald-600"}>
                          Margin Unit: {formatCurrency(row.unitPrice - row.cogs)} ({(((row.unitPrice - row.cogs) / row.unitPrice) * 100).toFixed(0)}%)
                        </span>
                      )}
                    </div>
                  )}

                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={handleAddRow}
              className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              <Plus className="w-4 h-4" /> Tambah Baris Produk
            </button>
          </div>

          <div className="space-y-1">
            <label className="text-slate-500">Catatan Internal / Keterangan Order</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Pesanan mendesak untuk proyek kabel gedung perkantoran, kirim via ekspedisi khusus..."
              rows={3}
              className="w-full bg-white border border-slate-200 p-3 rounded-2xl font-semibold focus:outline-none"
            />
          </div>

        </div>

        {/* Right Column - Summary & Profitability Check */}
        <div className="space-y-6">
          
          {/* Margin & Profitability Health Check Panel */}
          <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm space-y-4 card-shadow">
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <TrendingUp className="w-4 h-4 text-emerald-500" /> Analisis Profitabilitas SO
            </h4>
            
            <div className="space-y-2">
              <div className="flex justify-between text-slate-500 font-medium">
                <span>Nilai Jurnal Jual (DPP)</span>
                <span className="font-semibold text-slate-800">{formatCurrency(subtotal)}</span>
              </div>
              
              <div className="flex justify-between text-slate-500 font-medium">
                <span>Harga Pokok Penjualan (HPP)</span>
                <span className="font-semibold text-slate-850">-{formatCurrency(totalCogs)}</span>
              </div>

              <div className="border-t border-slate-100 pt-2 flex justify-between items-baseline">
                <span className="text-slate-600 font-bold">Laba Kotor Estimasi</span>
                <span className={`text-sm font-extrabold ${profitMargin < 0 ? "text-rose-600" : "text-emerald-600"}`}>
                  {formatCurrency(profitMargin)}
                </span>
              </div>

              <div className="flex justify-between items-center text-[10px] text-slate-400">
                <span>Margin Untung (%)</span>
                <span className={`font-bold px-2 py-0.5 rounded ${
                  profitPercent < 15 ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-600"
                }`}>
                  {profitPercent.toFixed(1)}%
                </span>
              </div>
            </div>

            {profitPercent < 0 && (
              <div className="bg-rose-50 border border-rose-100 text-rose-600 text-[10px] p-3 rounded-xl flex items-start gap-1.5 leading-normal">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>Peringatan: Harga jual berada **di bawah biaya pokok HPP** barang. Anda menjual rugi!</span>
              </div>
            )}
          </div>

          {/* Totals Section */}
          <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm space-y-4 card-shadow">
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Ringkasan Biaya SO</h4>

            <div className="space-y-2 border-b border-slate-100 pb-3">
              <div className="flex justify-between text-slate-500 font-medium">
                <span>Subtotal</span>
                <span className="font-semibold text-slate-800">{formatCurrency(subtotal)}</span>
              </div>

              {/* Tax Toggle */}
              <div className="flex justify-between items-center py-1 text-slate-500">
                <span className="flex items-center gap-1.5">
                  <Percent className="w-3.5 h-3.5 text-blue-600" /> Terapkan PPN {activeBusiness?.tax_rate_percent ?? 11}%
                </span>
                <input
                  type="checkbox"
                  checked={applyTax}
                  onChange={(e) => setApplyTax(e.target.checked)}
                  className="w-4 h-4 text-blue-600 focus:ring-blue-500 rounded border-slate-350"
                />
              </div>

              {applyTax && (
                <div className="flex justify-between text-slate-500 font-medium animate-fade-in">
                  <span>PPN ({activeBusiness?.tax_rate_percent ?? 11}%)</span>
                  <span className="font-semibold text-slate-800">{formatCurrency(taxAmount)}</span>
                </div>
              )}
            </div>

            <div className="flex justify-between items-baseline pt-1">
              <span className="text-sm font-bold text-slate-900">Total Nilai SO</span>
              <span className="text-xl font-extrabold text-blue-600">{formatCurrency(totalAmount)}</span>
            </div>

            <div className="pt-2 flex flex-col gap-2">
              <button
                type="submit"
                disabled={saving}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-extrabold py-3 px-4 rounded-xl shadow-sm transition flex items-center justify-center gap-2 active:scale-95"
              >
                {saving ? "Membuat SO..." : "Buat Sales Order"}
              </button>
              <button
                type="button"
                onClick={() => router.push("/sales")}
                className="w-full bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold py-2.5 px-4 rounded-xl text-center transition"
              >
                Batal
              </button>
            </div>

          </div>

        </div>

      </form>

    </div>
  );
}
