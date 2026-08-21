"use client";

import React, { useEffect, useState } from "react";
import { 
  ArrowLeft, 
  RefreshCw, 
  Plus, 
  Trash2, 
  ChevronDown, 
  ChevronUp, 
  Truck, 
  Package, 
  Warehouse, 
  CheckCircle,
  FileText,
  AlertTriangle
} from "lucide-react";
import Link from "next/link";
import { useBusiness } from "../../../../lib/context/BusinessContext";
import { createWebBrowserClient } from "../../../../lib/supabase/client";
import { useLanguage } from "../../../../lib/context/LanguageContext";

interface WarehouseData {
  id: string;
  name: string;
  code: string;
}

interface CatalogItem {
  id: string;
  name: string;
  unit: string;
  stock_quantity: number;
}

interface TransferItemInput {
  item_id: string;
  quantity: number;
  availableStock?: number;
}

interface StockTransfer {
  id: string;
  transfer_number: string;
  from_warehouse_id: string;
  to_warehouse_id: string;
  status: "draft" | "shipped" | "received";
  notes: string | null;
  created_at: string;
  from_warehouse: { name: string } | null;
  to_warehouse: { name: string } | null;
  items_count?: number;
}

export default function StockTransferPage() {
  const { activeBusiness } = useBusiness();
  const { locale, t } = useLanguage();

  const [transfers, setTransfers] = useState<StockTransfer[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseData[]>([]);
  const [catalogItems, setCatalogItems] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // New Transfer Form Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [transferNumber, setTransferNumber] = useState("");
  const [fromWhId, setFromWhId] = useState("");
  const [toWhId, setToWhId] = useState("");
  const [notes, setNotes] = useState("");
  const [transferItems, setTransferItems] = useState<TransferItemInput[]>([
    { item_id: "", quantity: 1 }
  ]);
  const [submitting, setSubmitting] = useState(false);

  // Expandable Transfer Details State
  const [expandedTransferId, setExpandedTransferId] = useState<string | null>(null);
  const [expandedItems, setExpandedItems] = useState<any[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const fetchInitialData = async (isRefresh = false) => {
    if (!activeBusiness) return;
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      
      const supabase = createWebBrowserClient();

      // 1. Fetch Warehouses
      const { data: whData } = await supabase
        .from("warehouses")
        .select("id, name, code")
        .eq("business_id", activeBusiness.id)
        .order("name", { ascending: true });
      setWarehouses(whData || []);

      // 2. Fetch Catalog Inventory Items
      const { data: itemsData } = await supabase
        .from("items")
        .select("id, name, unit, stock_quantity")
        .eq("business_id", activeBusiness.id)
        .eq("is_inventory", true)
        .order("name", { ascending: true });
      setCatalogItems(itemsData || []);

      // 3. Fetch Stock Transfers
      const { data: transData, error } = await supabase
        .from("stock_transfers")
        .select(`
          *,
          from_warehouse:from_warehouse_id (name),
          to_warehouse:to_warehouse_id (name)
        `)
        .eq("business_id", activeBusiness.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTransfers(transData || []);

    } catch (err) {
      console.error("Error loading stock transfer data:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, [activeBusiness]);

  // Generate transfer number sequence
  useEffect(() => {
    if (showAddModal) {
      const now = new Date();
      const timestamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}`;
      setTransferNumber(`TRF-${timestamp}`);
      
      if (warehouses.length > 0) {
        setFromWhId(warehouses[0].id);
        if (warehouses.length > 1) {
          setToWhId(warehouses[1].id);
        }
      }
    }
  }, [showAddModal, warehouses]);

  // Fetch available stock in origin warehouse for selected item
  const handleItemSelectionChange = async (index: number, itemId: string) => {
    if (!fromWhId || !itemId) return;
    try {
      const supabase = createWebBrowserClient();
      const { data } = await supabase
        .from("item_stocks")
        .select("stock_quantity")
        .eq("warehouse_id", fromWhId)
        .eq("item_id", itemId)
        .maybeSingle();

      const availableStock = data ? Number(data.stock_quantity) : 0;
      
      const next = [...transferItems];
      next[index] = {
        ...next[index],
        item_id: itemId,
        availableStock
      };
      setTransferItems(next);
    } catch (err) {
      console.error("Error fetching warehouse stock:", err);
    }
  };

  const handleUpdateItemQuantity = (index: number, qty: number) => {
    const next = [...transferItems];
    next[index].quantity = qty;
    setTransferItems(next);
  };

  const handleAddItemRow = () => {
    setTransferItems([...transferItems, { item_id: "", quantity: 1 }]);
  };

  const handleRemoveItemRow = (index: number) => {
    if (transferItems.length === 1) return;
    const next = [...transferItems];
    next.splice(index, 1);
    setTransferItems(next);
  };

  const handleCreateTransfer = async (status: "draft" | "shipped" | "received") => {
    if (!activeBusiness || !fromWhId || !toWhId || fromWhId === toWhId) {
      alert("Gudang asal dan tujuan tidak boleh sama.");
      return;
    }

    const invalidItems = transferItems.some(i => !i.item_id || i.quantity <= 0);
    if (invalidItems) {
      alert("Harap pilih barang dan kuantitas transfer yang valid.");
      return;
    }

    // Cek ketersediaan stok asal
    const stockShortage = transferItems.some(i => i.availableStock !== undefined && i.quantity > i.availableStock);
    if (stockShortage && status !== "draft") {
      alert("Terdapat kuantitas item yang melebihi stok tersedia di gudang asal.");
      return;
    }

    try {
      setSubmitting(true);
      const supabase = createWebBrowserClient();

      // 1. Insert Stock Transfer Header
      const { data: newTrf, error: headerErr } = await supabase
        .from("stock_transfers")
        .insert({
          business_id: activeBusiness.id,
          transfer_number: transferNumber,
          from_warehouse_id: fromWhId,
          to_warehouse_id: toWhId,
          status,
          notes: notes || null
        })
        .select()
        .single();

      if (headerErr) throw headerErr;

      // 2. Insert items
      const itemsRows = transferItems.map(item => ({
        transfer_id: newTrf.id,
        item_id: item.item_id,
        quantity: item.quantity
      }));

      const { error: itemsErr } = await supabase
        .from("stock_transfer_items")
        .insert(itemsRows);

      if (itemsErr) throw itemsErr;

      // 3. Jika status langsung 'received', trigger SQL process_stock_transfer_completion akan berjalan otomatis.
      if (status === "received") {
        // Picu pembaruan status ke received jika ingin memastikan trigger berjalan (walaupun insert sudah diset received, update status ke received di backend juga aman)
        await supabase
          .from("stock_transfers")
          .update({ status: "received" })
          .eq("id", newTrf.id);
      }

      alert("Mutasi transfer stok berhasil dibuat!");
      setShowAddModal(false);
      setTransferItems([{ item_id: "", quantity: 1 }]);
      setNotes("");
      
      await fetchInitialData();
    } catch (err) {
      console.error("Error creating stock transfer:", err);
      alert("Gagal memproses transfer stok.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleLoadDetails = async (transferId: string) => {
    try {
      setLoadingDetails(true);
      const supabase = createWebBrowserClient();
      const { data, error } = await supabase
        .from("stock_transfer_items")
        .select(`
          id,
          quantity,
          items (
            name,
            unit
          )
        `)
        .eq("transfer_id", transferId);

      if (error) throw error;
      setExpandedItems(data || []);
    } catch (err) {
      console.error("Error loading transfer items:", err);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleExpandToggle = (transferId: string) => {
    if (expandedTransferId === transferId) {
      setExpandedTransferId(null);
      setExpandedItems([]);
    } else {
      setExpandedTransferId(transferId);
      handleLoadDetails(transferId);
    }
  };

  const handleMarkAsReceived = async (transfer: StockTransfer) => {
    if (!confirm(`Tandai transfer ${transfer.transfer_number} selesai? Ini akan memotong stok gudang asal dan menambahkan ke gudang tujuan.`)) return;
    try {
      setRefreshing(true);
      const supabase = createWebBrowserClient();
      const { error } = await supabase
        .from("stock_transfers")
        .update({ status: "received" })
        .eq("id", transfer.id);

      if (error) throw error;
      alert("Status transfer berhasil diperbarui menjadi SELESAI!");
      await fetchInitialData();
    } catch (err) {
      console.error("Error updating transfer status:", err);
      alert("Gagal menyelesaikan transfer.");
    } finally {
      setRefreshing(false);
    }
  };

  const getStatusBadge = (status: "draft" | "shipped" | "received") => {
    switch (status) {
      case "received":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-100">
            <CheckCircle className="w-3 h-3" /> Selesai
          </span>
        );
      case "shipped":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-600 border border-blue-100 animate-pulse">
            <Truck className="w-3 h-3" /> Dikirim
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
            <FileText className="w-3 h-3" /> Draft
          </span>
        );
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div className="flex items-center gap-3">
          <Link 
            href="/inventory"
            className="p-2 text-slate-400 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              Mutasi Transfer Stok
            </h2>
            <p className="text-sm text-slate-500 mt-0.5">
              Kelola dan catat perpindahan fisik stok barang antar-gudang fisik bisnis Anda.
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => fetchInitialData(true)}
            disabled={refreshing}
            className="p-2.5 text-slate-600 hover:text-slate-900 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition shadow-xs"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold py-2.5 px-4 rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition"
          >
            <Plus className="w-4 h-4" /> Tambah Mutasi
          </button>
        </div>
      </div>

      {/* Main List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white border border-slate-200 rounded-2xl">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs text-slate-500 font-semibold mt-2">Memuat riwayat transfer stok...</p>
        </div>
      ) : transfers.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-400">
          <Warehouse className="w-12 h-12 mx-auto text-slate-200 mb-3" />
          <p className="text-sm font-semibold">Belum ada mutasi stok yang tercatat</p>
          <p className="text-xs text-slate-500 mt-1">
            Klik **"Tambah Mutasi"** untuk memindahkan stok barang antar gudang.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {transfers.map((trf) => {
            const isExpanded = expandedTransferId === trf.id;
            
            return (
              <div 
                key={trf.id} 
                className={`bg-white border border-slate-200 rounded-2xl overflow-hidden transition shadow-xs hover:border-slate-300 ${
                  isExpanded ? "ring-1 ring-blue-500/20 border-blue-300" : ""
                }`}
              >
                <div 
                  onClick={() => handleExpandToggle(trf.id)}
                  className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer select-none hover:bg-slate-50/50"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                      <Truck className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-mono font-bold text-slate-800">{trf.transfer_number}</span>
                        {getStatusBadge(trf.status)}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 mt-1 text-[11px] font-bold text-slate-500">
                        <span>{trf.from_warehouse?.name || "Asal"}</span>
                        <ArrowLeft className="w-3.5 h-3.5 rotate-180 text-slate-400" />
                        <span>{trf.to_warehouse?.name || "Tujuan"}</span>
                        <span className="text-slate-300">•</span>
                        <span>
                          {new Date(trf.created_at).toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "short",
                            year: "numeric"
                          })}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between md:justify-end gap-3 shrink-0">
                    {trf.status === "shipped" && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMarkAsReceived(trf);
                        }}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-1.5 px-3 rounded-lg text-[10px] shadow-xs transition"
                      >
                        Konfirmasi Tiba
                      </button>
                    )}
                    
                    <button className="flex items-center gap-1 text-xs font-bold text-blue-600">
                      <span>{isExpanded ? "Tutup" : "Lihat Detail"}</span>
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-slate-100 bg-slate-50/50 p-4 space-y-3">
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Daftar Barang yang Ditransfer</h4>
                    
                    {loadingDetails ? (
                      <div className="flex justify-center p-4">
                        <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                      </div>
                    ) : (
                      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                              <th className="py-2.5 px-3">Nama Produk</th>
                              <th className="py-2.5 px-3 text-center">Kuantitas</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-slate-700">
                            {expandedItems.map((item) => (
                              <tr key={item.id}>
                                <td className="py-2.5 px-3 font-semibold">{item.items?.name || "Item Dihapus"}</td>
                                <td className="py-2.5 px-3 text-center font-bold">{Number(item.quantity).toLocaleString("id-ID")} {item.items?.unit}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {trf.notes && (
                      <div className="text-xs text-slate-500 border-t border-slate-100 pt-2 flex items-start gap-1">
                        <span className="font-bold">Catatan:</span>
                        <p>{trf.notes}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add Transfer Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-800">Buat Mutasi Transfer Stok</h3>
                <p className="text-xs text-slate-500">Pindahkan stok fisik dari gudang asal ke gudang tujuan.</p>
              </div>
              <button 
                onClick={() => setShowAddModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition"
              >
                &times;
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">No. Transfer</label>
                  <input
                    type="text"
                    required
                    value={transferNumber}
                    onChange={(e) => setTransferNumber(e.target.value)}
                    className="w-full border border-slate-200 px-3 py-2 rounded-xl text-xs font-mono font-bold focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Gudang Asal *</label>
                  <select
                    value={fromWhId}
                    onChange={(e) => {
                      setFromWhId(e.target.value);
                      setTransferItems([{ item_id: "", quantity: 1 }]); // reset rows to prevent invalid stock readings
                    }}
                    className="w-full bg-white border border-slate-200 px-3 py-2 rounded-xl text-xs focus:outline-none"
                  >
                    {warehouses.map(w => (
                      <option key={w.id} value={w.id}>{w.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Gudang Tujuan *</label>
                  <select
                    value={toWhId}
                    onChange={(e) => setToWhId(e.target.value)}
                    className="w-full bg-white border border-slate-200 px-3 py-2 rounded-xl text-xs focus:outline-none"
                  >
                    {warehouses.map(w => (
                      <option key={w.id} value={w.id} disabled={w.id === fromWhId}>{w.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Items row builder */}
              <div className="space-y-2 border-t border-slate-100 pt-3">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Daftar Barang Transfer</label>
                
                <div className="space-y-2.5">
                  {transferItems.map((row, index) => (
                    <div key={index} className="flex flex-col sm:flex-row gap-3 items-end p-3 bg-slate-50/50 border border-slate-150 rounded-xl relative">
                      <div className="flex-1 space-y-1">
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Pilih Barang</label>
                        <select
                          value={row.item_id}
                          onChange={(e) => handleItemSelectionChange(index, e.target.value)}
                          className="w-full bg-white border border-slate-200 px-3 py-2 rounded-lg text-xs focus:outline-none"
                        >
                          <option value="">-- Pilih Barang --</option>
                          {catalogItems.map(item => (
                            <option key={item.id} value={item.id}>{item.name}</option>
                          ))}
                        </select>
                      </div>

                      <div className="w-32 space-y-1">
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Qty Transfer</label>
                        <input
                          type="number"
                          required
                          min="0.001"
                          step="any"
                          value={row.quantity}
                          onChange={(e) => handleUpdateItemQuantity(index, Number(e.target.value))}
                          className="w-full border border-slate-200 px-3 py-2 rounded-lg text-xs focus:outline-none font-bold"
                        />
                      </div>

                      {/* Info sisa stock gudang asal */}
                      {row.item_id && (
                        <div className="text-[9px] font-bold text-slate-400 pb-2.5">
                          Tersedia: <span className="text-slate-800">{row.availableStock !== undefined ? row.availableStock.toLocaleString("id-ID") : "..."}</span>
                        </div>
                      )}

                      {/* Remove row button */}
                      {transferItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItemRow(index)}
                          className="p-2 text-slate-400 hover:text-rose-600 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={handleAddItemRow}
                  className="w-full py-2 bg-slate-50 hover:bg-slate-100 border border-dashed border-slate-300 text-slate-600 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition"
                >
                  <Plus className="w-3.5 h-3.5" /> Tambah Baris
                </button>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Catatan / Keterangan</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Keterangan pengiriman..."
                  rows={2}
                  className="w-full border border-slate-200 px-3 py-2 rounded-xl text-xs focus:outline-none"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 flex flex-wrap gap-2 justify-end bg-slate-50/50">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="border border-slate-200 hover:bg-slate-100 text-slate-600 font-bold py-2 px-4 rounded-xl text-xs transition"
              >
                Batal
              </button>
              
              <button
                type="button"
                onClick={() => handleCreateTransfer("draft")}
                disabled={submitting}
                className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold py-2 px-4 rounded-xl text-xs transition disabled:opacity-50"
              >
                Simpan Draft
              </button>
              
              <button
                type="button"
                onClick={() => handleCreateTransfer("shipped")}
                disabled={submitting}
                className="bg-blue-50 hover:bg-blue-100 text-blue-600 font-bold py-2 px-4 rounded-xl text-xs transition disabled:opacity-50"
              >
                Kirim (Shipped)
              </button>

              <button
                type="button"
                onClick={() => handleCreateTransfer("received")}
                disabled={submitting}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded-xl text-xs transition disabled:opacity-50"
              >
                Selesai (Received)
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
