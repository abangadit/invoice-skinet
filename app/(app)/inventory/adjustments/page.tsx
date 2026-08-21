"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Sliders,
  Plus,
  Trash2,
  Calendar,
  Warehouse,
  CheckCircle,
  FileText,
  AlertTriangle,
  History,
  X,
  Search,
  Check,
  Package,
  TrendingUp,
  Percent
} from "lucide-react";
import Link from "next/link";
import { useBusiness } from "../../../../lib/context/BusinessContext";
import { createWebBrowserClient } from "../../../../lib/supabase/client";

interface WarehouseData {
  id: string;
  name: string;
  code: string;
}

interface CatalogItem {
  id: string;
  name: string;
  unit: string;
  cogs_unit_price: number;
  unit_price: number;
}

interface AdjustmentItemRow {
  itemId: string;
  name: string;
  unit: string;
  systemQuantity: number;
  actualQuantity: number;
  difference: number;
  unitCost: number;
  itemNotes: string;
}

interface StockAdjustmentHeader {
  id: string;
  adjustment_number: string;
  adjustment_date: string;
  notes: string | null;
  created_at: string;
  warehouses: { name: string } | null;
  items_count?: number;
}

interface StockAdjustmentDetail {
  id: string;
  adjustment_number: string;
  adjustment_date: string;
  notes: string | null;
  warehouses: { name: string; code: string } | null;
  items: {
    id: string;
    item_id: string;
    items: { name: string; unit: string } | null;
    system_quantity: number;
    actual_quantity: number;
    difference: number;
    unit_cost: number;
    notes: string | null;
  }[];
}

export default function StockAdjustmentsPage() {
  const { activeBusiness } = useBusiness();
  const router = useRouter();

  // Mode state: 'list' or 'create'
  const [viewMode, setViewMode] = useState<"list" | "create">("list");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Data states
  const [adjustments, setAdjustments] = useState<StockAdjustmentHeader[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseData[]>([]);
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);

  // Selected details modal state
  const [selectedAdjustment, setSelectedAdjustment] = useState<StockAdjustmentDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Form states for creating a new adjustment
  const [selectedWarehouseId, setSelectedWarehouseId] = useState("");
  const [adjustmentNumber, setAdjustmentNumber] = useState("");
  const [adjustmentDate, setAdjustmentDate] = useState("");
  const [notes, setNotes] = useState("");
  const [rows, setRows] = useState<AdjustmentItemRow[]>([
    { itemId: "", name: "", unit: "pcs", systemQuantity: 0, actualQuantity: 0, difference: 0, unitCost: 0, itemNotes: "" }
  ]);

  const generateAdjustmentNumber = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const dateStr = `${year}${month}${day}`;
    const random = Math.floor(1000 + Math.random() * 9000);
    return `SA-${dateStr}-${random}`;
  };

  const fetchInitData = async () => {
    if (!activeBusiness) return;
    try {
      setLoading(true);
      setErrorMsg("");
      const supabase = createWebBrowserClient();

      // Fetch warehouses
      const { data: whData, error: whError } = await supabase
        .from("warehouses")
        .select("id, name, code")
        .eq("business_id", activeBusiness.id)
        .order("name", { ascending: true });

      if (whError) throw whError;
      setWarehouses(whData || []);

      // Fetch catalog items (only is_inventory = true)
      const { data: itemData, error: itemError } = await supabase
        .from("items")
        .select("id, name, unit, cogs_unit_price, unit_price")
        .eq("business_id", activeBusiness.id)
        .eq("is_inventory", true)
        .order("name", { ascending: true });

      if (itemError) throw itemError;
      setCatalog(itemData || []);

      // Fetch adjustments headers
      const { data: adjData, error: adjError } = await supabase
        .from("stock_adjustments")
        .select(`
          id,
          adjustment_number,
          adjustment_date,
          notes,
          created_at,
          warehouses ( name ),
          stock_adjustment_items ( id )
        `)
        .eq("business_id", activeBusiness.id)
        .order("adjustment_date", { ascending: false });

      if (adjError) throw adjError;

      const formatted = (adjData || []).map((adj: any) => ({
        id: adj.id,
        adjustment_number: adj.adjustment_number,
        adjustment_date: adj.adjustment_date,
        notes: adj.notes,
        created_at: adj.created_at,
        warehouses: Array.isArray(adj.warehouses) ? adj.warehouses[0] : (adj.warehouses || null),
        items_count: adj.stock_adjustment_items?.length || 0
      }));

      setAdjustments(formatted);
    } catch (err: any) {
      console.error("Error fetching stock adjustments init data:", err);
      setErrorMsg(err.message || "Gagal memuat data penyesuaian stok.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitData();
  }, [activeBusiness]);

  const handleOpenCreateMode = () => {
    setAdjustmentNumber(generateAdjustmentNumber());
    setAdjustmentDate(new Date().toISOString().slice(0, 16)); // YYYY-MM-DDTHH:MM
    setSelectedWarehouseId(warehouses[0]?.id || "");
    setNotes("");
    setRows([{ itemId: "", name: "", unit: "pcs", systemQuantity: 0, actualQuantity: 0, difference: 0, unitCost: 0, itemNotes: "" }]);
    setErrorMsg("");
    setViewMode("create");
  };

  // Helper to fetch item stock on specific warehouse
  const fetchItemStockInWarehouse = async (itemId: string, warehouseId: string) => {
    if (!itemId || !warehouseId) return { qty: 0, cogs: 0 };
    try {
      const supabase = createWebBrowserClient();
      const { data, error } = await supabase
        .from("item_stocks")
        .select("stock_quantity, cogs_unit_price")
        .eq("warehouse_id", warehouseId)
        .eq("item_id", itemId)
        .maybeSingle();

      if (error) throw error;
      return {
        qty: Number(data?.stock_quantity || 0),
        cogs: Number(data?.cogs_unit_price || 0)
      };
    } catch (err) {
      console.error("Error fetching specific item stock:", err);
      return { qty: 0, cogs: 0 };
    }
  };

  // Recalculate system stock for all rows when warehouse is changed
  useEffect(() => {
    if (!selectedWarehouseId || viewMode !== "create") return;

    const updateAllRowsStock = async () => {
      const updatedRows = await Promise.all(
        rows.map(async (row) => {
          if (!row.itemId) return row;
          const { qty, cogs } = await fetchItemStockInWarehouse(row.itemId, selectedWarehouseId);
          const diff = row.actualQuantity - qty;
          return {
            ...row,
            systemQuantity: qty,
            difference: diff,
            unitCost: row.unitCost === 0 ? cogs : row.unitCost
          };
        })
      );
      setRows(updatedRows);
    };

    updateAllRowsStock();
  }, [selectedWarehouseId]);

  const handleAddRow = () => {
    setRows([
      ...rows,
      { itemId: "", name: "", unit: "pcs", systemQuantity: 0, actualQuantity: 0, difference: 0, unitCost: 0, itemNotes: "" }
    ]);
  };

  const handleRemoveRow = (idx: number) => {
    if (rows.length === 1) return;
    setRows(rows.filter((_, i) => i !== idx));
  };

  const handleRowChange = async (idx: number, field: keyof AdjustmentItemRow, val: any) => {
    const updated = [...rows];
    const row = updated[idx];

    if (field === "itemId") {
      const selectedItem = catalog.find(c => c.id === val);
      if (selectedItem) {
        row.itemId = selectedItem.id;
        row.name = selectedItem.name;
        row.unit = selectedItem.unit || "pcs";
        
        // Fetch current stock and HPP in the selected warehouse
        const { qty, cogs } = await fetchItemStockInWarehouse(selectedItem.id, selectedWarehouseId);
        row.systemQuantity = qty;
        row.unitCost = cogs || selectedItem.cogs_unit_price || 0;
        row.actualQuantity = qty; // Default actual to system qty
        row.difference = 0;
      } else {
        row.itemId = "";
        row.name = "";
        row.unit = "pcs";
        row.systemQuantity = 0;
        row.actualQuantity = 0;
        row.difference = 0;
        row.unitCost = 0;
      }
    } else {
      (row as any)[field] = val;
    }

    // Calculate difference
    if (field === "actualQuantity") {
      row.difference = Number(val || 0) - row.systemQuantity;
    }

    setRows(updated);
  };

  const handleFetchDetail = async (id: string) => {
    try {
      setLoadingDetail(true);
      const supabase = createWebBrowserClient();

      const { data, error } = await supabase
        .from("stock_adjustments")
        .select(`
          id,
          adjustment_number,
          adjustment_date,
          notes,
          warehouses ( name, code ),
          stock_adjustment_items (
            id,
            item_id,
            system_quantity,
            actual_quantity,
            difference,
            unit_cost,
            notes,
            items ( name, unit )
          )
        `)
        .eq("id", id)
        .single();

      if (error) throw error;

      const formattedDetail: StockAdjustmentDetail = {
        id: data.id,
        adjustment_number: data.adjustment_number,
        adjustment_date: data.adjustment_date,
        notes: data.notes,
        warehouses: Array.isArray(data.warehouses) ? data.warehouses[0] : (data.warehouses || null),
        items: (data.stock_adjustment_items || []).map((item: any) => ({
          id: item.id,
          item_id: item.item_id,
          system_quantity: Number(item.system_quantity || 0),
          actual_quantity: Number(item.actual_quantity || 0),
          difference: Number(item.difference || 0),
          unit_cost: Number(item.unit_cost || 0),
          notes: item.notes,
          items: Array.isArray(item.items) ? item.items[0] : (item.items || null)
        }))
      };

      setSelectedAdjustment(formattedDetail);
    } catch (err: any) {
      console.error("Error loading adjustment detail:", err);
      alert("Gagal memuat detail transaksi.");
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBusiness) return;
    if (!selectedWarehouseId) {
      setErrorMsg("Harap pilih gudang penyesuaian!");
      return;
    }
    if (rows.some(r => !r.itemId)) {
      setErrorMsg("Harap pilih barang untuk setiap baris!");
      return;
    }
    if (rows.some(r => r.difference === 0)) {
      if (!confirm("Beberapa barang tidak memiliki selisih penyesuaian (Selisih = 0). Lanjutkan?")) {
        return;
      }
    }

    try {
      setSaving(true);
      setErrorMsg("");
      const supabase = createWebBrowserClient();

      // 1. Insert Header
      const { data: headerData, error: headerError } = await supabase
        .from("stock_adjustments")
        .insert({
          business_id: activeBusiness.id,
          warehouse_id: selectedWarehouseId,
          adjustment_number: adjustmentNumber,
          adjustment_date: adjustmentDate ? new Date(adjustmentDate).toISOString() : new Date().toISOString(),
          notes: notes || null
        })
        .select()
        .single();

      if (headerError) {
        if (headerError.code === "23505") {
          throw new Error("Nomor Penyesuaian sudah digunakan.");
        }
        throw headerError;
      }

      // 2. Insert Details
      const detailsPayload = rows.map(r => ({
        stock_adjustment_id: headerData.id,
        item_id: r.itemId,
        system_quantity: r.systemQuantity,
        actual_quantity: r.actualQuantity,
        difference: r.difference,
        unit_cost: r.unitCost,
        notes: r.itemNotes || null
      }));

      const { error: detailsError } = await supabase
        .from("stock_adjustment_items")
        .insert(detailsPayload);

      if (detailsError) throw detailsError;

      // Reset and reload
      setViewMode("list");
      fetchInitData();
    } catch (err: any) {
      console.error("Error saving stock adjustment:", err);
      setErrorMsg(err.message || "Gagal menyimpan penyesuaian stok.");
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: activeBusiness?.default_currency || "IDR",
      maximumFractionDigits: 0
    }).format(val);
  };

  return (
    <div className="space-y-6 text-xs font-semibold">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Link 
              href="/inventory"
              className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 transition"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              Stok Opname & Penyesuaian Stok
            </h2>
          </div>
          <p className="text-sm text-slate-500 mt-1 pl-9">
            Sesuaikan stok fisik barang di gudang dengan catatan sistem secara resmi.
          </p>
        </div>

        {viewMode === "list" && (
          <button
            onClick={handleOpenCreateMode}
            className="sm:self-end bg-blue-600 hover:bg-blue-700 text-white font-extrabold py-2.5 px-4 rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition active:scale-95 pl-4 pr-4"
          >
            <Plus className="w-4 h-4" /> Mulai Stok Opname baru
          </button>
        )}
      </div>

      {errorMsg && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-xl flex items-start gap-2">
          <AlertTriangle className="w-5 h-5 shrink-0 text-rose-500" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* CREATE VIEW */}
      {viewMode === "create" ? (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
              Informasi Dokumen Opname
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Warehouse selector */}
              <div className="space-y-1">
                <label className="text-slate-500 block">Pilih Gudang Utama *</label>
                <select
                  value={selectedWarehouseId}
                  onChange={(e) => setSelectedWarehouseId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:border-blue-500 font-semibold"
                  required
                >
                  <option value="" disabled>-- Pilih Gudang --</option>
                  {warehouses.map(wh => (
                    <option key={wh.id} value={wh.id}>
                      {wh.name} ({wh.code || "No Code"})
                    </option>
                  ))}
                </select>
              </div>

              {/* Document number */}
              <div className="space-y-1">
                <label className="text-slate-500 block">Nomor Penyesuaian (SA-...) *</label>
                <input
                  type="text"
                  value={adjustmentNumber}
                  onChange={(e) => setAdjustmentNumber(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:border-blue-500 font-mono font-bold"
                  required
                />
              </div>

              {/* Adjustment Date */}
              <div className="space-y-1">
                <label className="text-slate-500 block">Tanggal / Waktu *</label>
                <input
                  type="datetime-local"
                  value={adjustmentDate}
                  onChange={(e) => setAdjustmentDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:border-blue-500 font-semibold"
                  required
                />
              </div>
            </div>

            {/* General notes */}
            <div className="space-y-1">
              <label className="text-slate-500 block">Keterangan / Catatan Dokumen (General Notes)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Contoh: Opname akhir bulan Juni 2026, Penyesuaian stok rusak di gudang."
                rows={2}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:border-blue-500 font-semibold"
              />
            </div>
          </div>

          {/* Details / Items Grid Editor */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
              Daftar Barang & Selisih Opname
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[800px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                    <th className="py-3 px-4 w-[250px]">Nama Barang</th>
                    <th className="py-3 px-3 text-center w-[100px]">Satuan</th>
                    <th className="py-3 px-3 text-center w-[120px]">Stok Sistem</th>
                    <th className="py-3 px-3 text-center w-[120px]">Stok Fisik</th>
                    <th className="py-3 px-3 text-center w-[120px]">Selisih (+/-)</th>
                    <th className="py-3 px-3 text-right w-[150px]">HPP Satuan</th>
                    <th className="py-3 px-4">Alasan / Catatan Barang</th>
                    <th className="py-3 px-4 text-center w-[60px]">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {rows.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50 transition">
                      <td className="py-3 px-4">
                        <select
                          value={row.itemId}
                          onChange={(e) => handleRowChange(idx, "itemId", e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-2 outline-none font-semibold text-slate-950"
                          required
                        >
                          <option value="">-- Pilih Barang --</option>
                          {catalog.map(cat => (
                            <option key={cat.id} value={cat.id}>
                              {cat.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      
                      <td className="py-3 px-3 text-center text-slate-500 font-semibold">
                        {row.unit}
                      </td>

                      <td className="py-3 px-3 text-center font-mono font-bold text-slate-600 bg-slate-50/60 rounded-lg">
                        {row.systemQuantity}
                      </td>

                      <td className="py-3 px-3 text-center">
                        <input
                          type="number"
                          step="any"
                          value={row.actualQuantity}
                          onChange={(e) => handleRowChange(idx, "actualQuantity", Number(e.target.value || 0))}
                          className="w-[100px] bg-slate-50 border border-slate-200 rounded-xl px-2 py-2 outline-none focus:border-blue-500 font-mono text-center font-bold text-slate-950"
                          min="0"
                          required
                        />
                      </td>

                      <td className="py-3 px-3 text-center font-mono font-extrabold">
                        {row.difference > 0 ? (
                          <span className="text-emerald-600">+{row.difference}</span>
                        ) : row.difference < 0 ? (
                          <span className="text-rose-600">{row.difference}</span>
                        ) : (
                          <span className="text-slate-400">0</span>
                        )}
                      </td>

                      <td className="py-3 px-3 text-right">
                        <input
                          type="number"
                          value={row.unitCost}
                          onChange={(e) => handleRowChange(idx, "unitCost", Number(e.target.value || 0))}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-2 outline-none focus:border-blue-500 font-mono text-right font-semibold text-slate-950"
                          min="0"
                          required
                        />
                        {Number(row.unitCost) > 0 && (
                          <span className="text-[9px] text-blue-650 font-bold mt-1 text-right block">
                            {formatCurrency(Number(row.unitCost))}
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <input
                          type="text"
                          placeholder="e.g. Rusak, Hilang, Lebih"
                          value={row.itemNotes}
                          onChange={(e) => handleRowChange(idx, "itemNotes", e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 outline-none focus:border-blue-500 font-semibold"
                        />
                      </td>

                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveRow(idx)}
                          disabled={rows.length === 1}
                          className="text-slate-400 hover:text-rose-600 disabled:opacity-30 p-1.5 rounded-lg hover:bg-slate-100 transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={handleAddRow}
                className="bg-white border border-slate-200 hover:bg-slate-50 text-blue-600 font-extrabold py-2 px-4 rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition active:scale-95 pl-4 pr-4"
              >
                <Plus className="w-4 h-4" /> Tambah Baris Barang
              </button>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-extrabold py-2.5 px-6 rounded-xl transition active:scale-95"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold py-2.5 px-6 rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition active:scale-95 disabled:opacity-50"
            >
              {saving ? "Menyimpan..." : "Simpan & Terapkan Opname"}
            </button>
          </div>
        </form>
      ) : (
        /* LIST VIEW */
        <div className="space-y-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 bg-white border border-slate-200 rounded-2xl shadow-sm">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-xs text-slate-500 font-semibold mt-2">Memuat riwayat penyesuaian stok...</p>
            </div>
          ) : adjustments.length > 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden card-shadow">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                      <th className="py-3.5 px-4">No. Penyesuaian</th>
                      <th className="py-3.5 px-4">Gudang</th>
                      <th className="py-3.5 px-4">Tanggal Transaksi</th>
                      <th className="py-3.5 px-4 text-center">Jumlah Barang</th>
                      <th className="py-3.5 px-4">Catatan Dokumen</th>
                      <th className="py-3.5 px-4 text-center w-[120px]">Detail</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {adjustments.map((adj) => {
                      const dateStr = new Date(adj.adjustment_date).toLocaleDateString("id-ID", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit"
                      });

                      return (
                        <tr key={adj.id} className="hover:bg-slate-50/50 transition">
                          <td className="py-4 px-4 font-bold text-slate-900 font-mono">
                            {adj.adjustment_number}
                          </td>
                          <td className="py-4 px-4 font-medium text-slate-800">
                            {adj.warehouses?.name || "Gudang Utama"}
                          </td>
                          <td className="py-4 px-4 text-slate-500 font-medium">
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5 text-slate-400" /> {dateStr}
                            </div>
                          </td>
                          <td className="py-4 px-4 text-center font-extrabold text-blue-600 font-mono">
                            {adj.items_count} Varian
                          </td>
                          <td className="py-4 px-4 text-slate-500 font-medium max-w-[250px] truncate" title={adj.notes || ""}>
                            {adj.notes || "-"}
                          </td>
                          <td className="py-4 px-4 text-center">
                            <button
                              onClick={() => handleFetchDetail(adj.id)}
                              className="text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 py-1.5 px-3 rounded-lg font-extrabold transition active:scale-95"
                            >
                              Lihat Detail
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl p-16 text-center text-slate-400 shadow-sm">
              <History className="w-12 h-12 mx-auto text-slate-200 mb-3" />
              <p className="text-sm font-semibold">Belum ada riwayat Stok Opname / Penyesuaian Stok</p>
              <p className="text-xs text-slate-500 mt-1">
                Gunakan fitur ini untuk menyesuaikan stok barang jika terjadi kehilangan, kerusakan, atau selisih hitung fisik.
              </p>
            </div>
          )}
        </div>
      )}

      {/* DETAIL MODAL DIALOG */}
      {selectedAdjustment && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col font-sans">
            {/* Modal header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900 font-mono">
                  Detail Opname: {selectedAdjustment.adjustment_number}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Gudang: {selectedAdjustment.warehouses?.name} ({selectedAdjustment.warehouses?.code || "No Code"})
                </p>
              </div>
              <button
                onClick={() => setSelectedAdjustment(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-50 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal content body */}
            <div className="p-6 overflow-y-auto space-y-4 flex-1 text-xs">
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 space-y-2">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-slate-400 block font-bold uppercase tracking-wider text-[9px]">Tanggal Penyesuaian</span>
                    <span className="font-bold text-slate-800">
                      {new Date(selectedAdjustment.adjustment_date).toLocaleString("id-ID", {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit"
                      })}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-bold uppercase tracking-wider text-[9px]">Catatan Dokumen</span>
                    <span className="font-bold text-slate-800">{selectedAdjustment.notes || "-"}</span>
                  </div>
                </div>
              </div>

              {/* Items List Table */}
              <div className="border border-slate-100 rounded-xl overflow-hidden">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                      <th className="py-2.5 px-4">Nama Barang</th>
                      <th className="py-2.5 px-3 text-center">Stok Sistem</th>
                      <th className="py-2.5 px-3 text-center">Stok Fisik</th>
                      <th className="py-2.5 px-3 text-center">Selisih (+/-)</th>
                      <th className="py-2.5 px-3 text-right">HPP Unit</th>
                      <th className="py-2.5 px-4">Keterangan / Alasan Item</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {selectedAdjustment.items.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/30 transition">
                        <td className="py-3 px-4 font-bold text-slate-900">
                          {item.items?.name || "Item Dihapus"}
                        </td>
                        <td className="py-3 px-3 text-center font-mono text-slate-500 font-semibold">
                          {item.system_quantity.toLocaleString("id-ID")} {item.items?.unit || "pcs"}
                        </td>
                        <td className="py-3 px-3 text-center font-mono font-bold text-slate-800">
                          {item.actual_quantity.toLocaleString("id-ID")} {item.items?.unit || "pcs"}
                        </td>
                        <td className="py-3 px-3 text-center font-mono font-extrabold">
                          {item.difference > 0 ? (
                            <span className="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">+{item.difference}</span>
                          ) : item.difference < 0 ? (
                            <span className="text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-100">{item.difference}</span>
                          ) : (
                            <span className="text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full border border-slate-200">0</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-semibold">
                          {formatCurrency(item.unit_cost)}
                        </td>
                        <td className="py-3 px-4 text-slate-500 font-semibold">
                          {item.notes || "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal footer */}
            <div className="border-t border-slate-100 px-6 py-4 flex justify-end">
              <button
                onClick={() => setSelectedAdjustment(null)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold py-2 px-6 rounded-xl transition active:scale-95"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
