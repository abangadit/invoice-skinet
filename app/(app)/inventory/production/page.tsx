"use client";

import React, { useEffect, useState } from "react";
import { 
  ArrowLeft, 
  RefreshCw, 
  Plus, 
  Trash2, 
  ChevronDown, 
  ChevronUp, 
  Sliders, 
  Package, 
  CheckCircle,
  FileText,
  SlidersHorizontal,
  Wrench,
  DollarSign,
  AlertTriangle,
  Layers
} from "lucide-react";
import Link from "next/link";
import { useBusiness } from "../../../../lib/context/BusinessContext";
import { createWebBrowserClient } from "../../../../lib/supabase/client";
import { useLanguage } from "../../../../lib/context/LanguageContext";

interface CatalogItem {
  id: string;
  name: string;
  unit: string;
}

interface WarehouseData {
  id: string;
  name: string;
}

interface BOMItemInput {
  raw_item_id: string;
  quantity_required: number;
}

interface BOMData {
  id: string;
  name: string;
  version: string;
  is_active: boolean;
  finished_item: { name: string; unit: string } | null;
  bom_items_count?: number;
}

interface WorkOrderData {
  id: string;
  wo_number: string;
  quantity_to_produce: number;
  status: "draft" | "in_progress" | "completed";
  labor_cost: number;
  overhead_cost: number;
  created_at: string;
  bill_of_materials: { name: string; finished_item: { name: string } | null } | null;
  completed_at: string | null;
}

export default function ProductionPage() {
  const { activeBusiness } = useBusiness();
  const { locale, t } = useLanguage();

  const [activeTab, setActiveTab] = useState<"bom" | "wo">("bom");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Metadata Lists
  const [catalogItems, setCatalogItems] = useState<CatalogItem[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseData[]>([]);
  const [boms, setBoms] = useState<BOMData[]>([]);
  const [workOrders, setWorkOrders] = useState<WorkOrderData[]>([]);

  // Modals Toggle
  const [showAddBOM, setShowAddBOM] = useState(false);
  const [showAddWO, setShowAddWO] = useState(false);

  // New BOM Form State
  const [bomName, setBomName] = useState("");
  const [finishedItemId, setFinishedItemId] = useState("");
  const [bomItems, setBomItems] = useState<BOMItemInput[]>([
    { raw_item_id: "", quantity_required: 1 }
  ]);

  // New Work Order Form State
  const [woNumber, setWoNumber] = useState("");
  const [selectedBOMId, setSelectedBOMId] = useState("");
  const [qtyToProduce, setQtyToProduce] = useState(1);
  const [laborCost, setLaborCost] = useState(0);
  const [overheadCost, setOverheadCost] = useState(0);
  const [targetWhId, setTargetWhId] = useState("");

  const [submitting, setSubmitting] = useState(false);

  // Expandable details states
  const [expandedBOMId, setExpandedBOMId] = useState<string | null>(null);
  const [expandedBOMItems, setExpandedBOMItems] = useState<any[]>([]);
  const [loadingBOMDetails, setLoadingBOMDetails] = useState(false);

  const fetchData = async (isRefresh = false) => {
    if (!activeBusiness) return;
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const supabase = createWebBrowserClient();

      // 1. Fetch Catalog Items (Raw & Finished)
      const { data: itemsData } = await supabase
        .from("items")
        .select("id, name, unit")
        .eq("business_id", activeBusiness.id)
        .order("name", { ascending: true });
      setCatalogItems(itemsData || []);

      // 2. Fetch Warehouses
      const { data: whData } = await supabase
        .from("warehouses")
        .select("id, name")
        .eq("business_id", activeBusiness.id)
        .order("name", { ascending: true });
      setWarehouses(whData || []);

      // 3. Fetch BOMs
      const { data: bomData } = await supabase
        .from("bill_of_materials")
        .select(`
          *,
          finished_item:finished_item_id (name, unit)
        `)
        .eq("business_id", activeBusiness.id)
        .order("created_at", { ascending: false });
      setBoms(bomData || []);

      // 4. Fetch Work Orders
      const { data: woData } = await supabase
        .from("work_orders")
        .select(`
          *,
          bill_of_materials:bom_id (
            name,
            finished_item:finished_item_id (name)
          )
        `)
        .eq("business_id", activeBusiness.id)
        .order("created_at", { ascending: false });
      setWorkOrders(woData || []);

    } catch (err) {
      console.error("Error loading production data:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeBusiness]);

  // Autogenerate WO number sequence
  useEffect(() => {
    if (showAddWO) {
      const now = new Date();
      const timestamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}`;
      setWoNumber(`WO-${timestamp}`);
      
      if (boms.length > 0) {
        setSelectedBOMId(boms[0].id);
      }
      if (warehouses.length > 0) {
        setTargetWhId(warehouses[0].id);
      }
    }
  }, [showAddWO, boms, warehouses]);

  // BOM Items Expandable Details
  const handleLoadBOMDetails = async (bomId: string) => {
    try {
      setLoadingBOMDetails(true);
      const supabase = createWebBrowserClient();
      const { data } = await supabase
        .from("bom_items")
        .select(`
          id,
          quantity_required,
          unit,
          raw_item:raw_item_id (name)
        `)
        .eq("bom_id", bomId);
      setExpandedBOMItems(data || []);
    } catch (err) {
      console.error("Error loading BOM items:", err);
    } finally {
      setLoadingBOMDetails(false);
    }
  };

  const handleExpandBOM = (bomId: string) => {
    if (expandedBOMId === bomId) {
      setExpandedBOMId(null);
      setExpandedBOMItems([]);
    } else {
      setExpandedBOMId(bomId);
      handleLoadBOMDetails(bomId);
    }
  };

  // Raw Item Rows Handlers
  const handleAddBOMRow = () => {
    setBomItems([...bomItems, { raw_item_id: "", quantity_required: 1 }]);
  };

  const handleRemoveBOMRow = (index: number) => {
    if (bomItems.length === 1) return;
    const next = [...bomItems];
    next.splice(index, 1);
    setBomItems(next);
  };

  const handleUpdateBOMItem = (index: number, fields: Partial<BOMItemInput>) => {
    const next = [...bomItems];
    next[index] = { ...next[index], ...fields };
    setBomItems(next);
  };

  const handleCreateBOM = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBusiness || !finishedItemId || !bomName.trim()) return;

    const invalidItems = bomItems.some(i => !i.raw_item_id || i.quantity_required <= 0);
    if (invalidItems) {
      alert("Harap pilih bahan baku dan isi kuantitas formula secara valid.");
      return;
    }

    try {
      setSubmitting(true);
      const supabase = createWebBrowserClient();

      // 1. Insert BOM Header
      const { data: newBom, error: headerErr } = await supabase
        .from("bill_of_materials")
        .insert({
          business_id: activeBusiness.id,
          finished_item_id: finishedItemId,
          name: bomName,
          version: "1.0",
          is_active: true
        })
        .select()
        .single();

      if (headerErr) throw headerErr;

      // 2. Insert items
      const bomItemsRows = bomItems.map(item => {
        const itemUnit = catalogItems.find(i => i.id === item.raw_item_id)?.unit || "pcs";
        return {
          bom_id: newBom.id,
          raw_item_id: item.raw_item_id,
          quantity_required: item.quantity_required,
          unit: itemUnit
        };
      });

      const { error: itemsErr } = await supabase
        .from("bom_items")
        .insert(bomItemsRows);

      if (itemsErr) throw itemsErr;

      alert("Formula BOM baru berhasil didaftarkan!");
      setShowAddBOM(false);
      setBomName("");
      setFinishedItemId("");
      setBomItems([{ raw_item_id: "", quantity_required: 1 }]);
      
      await fetchData();
    } catch (err) {
      console.error("Error saving BOM:", err);
      alert("Gagal menyimpan BOM.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateWorkOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBusiness || !selectedBOMId || !targetWhId || !woNumber.trim()) return;

    try {
      setSubmitting(true);
      const supabase = createWebBrowserClient();

      // Insert Work Order
      const { error } = await supabase
        .from("work_orders")
        .insert({
          business_id: activeBusiness.id,
          bom_id: selectedBOMId,
          wo_number: woNumber,
          quantity_to_produce: qtyToProduce,
          labor_cost: Number(laborCost || 0),
          overhead_cost: Number(overheadCost || 0),
          status: "draft"
        });

      if (error) throw error;

      alert("Work Order baru berhasil dibuat (Status: Draft)!");
      setShowAddWO(false);
      setLaborCost(0);
      setOverheadCost(0);
      setQtyToProduce(1);

      await fetchData();
    } catch (err) {
      console.error("Error creating Work Order:", err);
      alert("Gagal membuat Work Order.");
    } finally {
      setSubmitting(false);
    }
  };

  // Complete Work Order (Atomic RPC call to PL/pgSQL function complete_work_order)
  const handleCompleteWorkOrder = async (wo: WorkOrderData) => {
    // Select default warehouse for this business
    let targetWh = targetWhId;
    if (!targetWh) {
      if (warehouses.length > 0) {
        targetWh = warehouses[0].id;
      } else {
        alert("Harap buat gudang penyimpanan terlebih dahulu di menu gudang.");
        return;
      }
    }

    if (!confirm(`Selesaikan Work Order ${wo.wo_number}? Tindakan ini otomatis akan:\n1. Memotong stok bahan mentah di gudang terpilih.\n2. Menambah stok produk jadi.\n3. Menghitung HPP unit (COGM) perakitan.`)) return;

    try {
      setRefreshing(true);
      const supabase = createWebBrowserClient();

      // Call PL/pgSQL function complete_work_order
      const { error } = await supabase.rpc("complete_work_order", {
        p_wo_id: wo.id,
        p_warehouse_id: targetWh
      });

      if (error) throw error;

      alert(`Work Order ${wo.wo_number} selesai diproduksi! Stok produk jadi telah terupdate di gudang.`);
      await fetchData();
    } catch (err: any) {
      console.error("Error completing work order:", err);
      alert(err.message || "Gagal menyelesaikan Work Order.");
    } finally {
      setRefreshing(false);
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
              Formula & Perakitan (BOM & Work Orders)
            </h2>
            <p className="text-sm text-slate-500 mt-0.5">
              Kelola formula produksi (Bill of Materials) dan konfirmasi perintah kerja perakitan barang jadi.
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => fetchData(true)}
            disabled={refreshing}
            className="p-2.5 text-slate-600 hover:text-slate-900 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition shadow-xs"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
          </button>
          
          {activeTab === "bom" ? (
            <button
              onClick={() => setShowAddBOM(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold py-2.5 px-4 rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition"
            >
              <Plus className="w-4 h-4" /> Daftarkan Formula (BOM)
            </button>
          ) : (
            <button
              onClick={() => setShowAddWO(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold py-2.5 px-4 rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition"
            >
              <Plus className="w-4 h-4" /> Rilis Perintah Kerja (WO)
            </button>
          )}
        </div>
      </div>

      {/* Tab Controllers */}
      <div className="flex bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
        <button
          onClick={() => setActiveTab("bom")}
          className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 ${
            activeTab === "bom" 
              ? "bg-blue-600 text-white shadow-sm font-extrabold" 
              : "text-slate-500 hover:bg-slate-50"
          }`}
        >
          <Sliders className="w-4.5 h-4.5" /> Formula BOM Bahan Baku
        </button>
        <button
          onClick={() => setActiveTab("wo")}
          className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 ${
            activeTab === "wo" 
              ? "bg-blue-600 text-white shadow-sm font-extrabold" 
              : "text-slate-500 hover:bg-slate-50"
          }`}
        >
          <Wrench className="w-4.5 h-4.5" /> Perintah Kerja Perakitan (Work Order)
        </button>
      </div>

      {/* Main List content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white border border-slate-200 rounded-2xl shadow-sm">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs text-slate-500 font-semibold mt-2">Memuat modul perakitan...</p>
        </div>
      ) : activeTab === "bom" ? (
        /* BOM LIST TAB */
        boms.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-400">
            <Sliders className="w-12 h-12 mx-auto text-slate-200 mb-3" />
            <p className="text-sm font-semibold">Belum ada formula BOM terdaftar</p>
            <p className="text-xs text-slate-500 mt-1">
              Klik **"Daftarkan Formula (BOM)"** untuk menentukan resep rakitan produk jadi.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {boms.map((bom) => {
              const isExpanded = expandedBOMId === bom.id;
              return (
                <div 
                  key={bom.id} 
                  className={`bg-white border border-slate-200 rounded-2xl overflow-hidden transition shadow-xs hover:border-slate-300 ${
                    isExpanded ? "ring-1 ring-blue-500/20 border-blue-300" : ""
                  }`}
                >
                  <div 
                    onClick={() => handleExpandBOM(bom.id)}
                    className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer select-none hover:bg-slate-50/50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                        <Layers className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-slate-800">{bom.name}</span>
                          <span className="px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded text-[9px] font-bold">
                            v{bom.version}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">Produk Jadi: **{bom.finished_item?.name}**</p>
                      </div>
                    </div>

                    <button className="flex items-center gap-1 text-xs font-bold text-blue-600">
                      <span>{isExpanded ? "Tutup" : "Lihat Formula"}</span>
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>

                  {isExpanded && (
                    <div className="border-t border-slate-100 bg-slate-50/50 p-4 space-y-2">
                      <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Komposisi Bahan Mentah (Per 1 {bom.finished_item?.unit}):</h4>
                      
                      {loadingBOMDetails ? (
                        <div className="flex justify-center p-3">
                          <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                      ) : (
                        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                          <table className="w-full text-xs text-left">
                            <thead>
                              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                                <th className="py-2 px-3">Bahan Mentah</th>
                                <th className="py-2 px-3 text-right">Qty Kebutuhan</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-slate-700">
                              {expandedBOMItems.map((item) => (
                                <tr key={item.id}>
                                  <td className="py-2 px-3 font-semibold">{item.raw_item?.name || "Bahan Baku Dihapus"}</td>
                                  <td className="py-2 px-3 text-right font-bold">{Number(item.quantity_required).toLocaleString("id-ID")} {item.unit}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )
      ) : (
        /* WORK ORDERS LIST TAB */
        workOrders.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-400">
            <Wrench className="w-12 h-12 mx-auto text-slate-200 mb-3" />
            <p className="text-sm font-semibold">Belum ada perintah kerja perakitan</p>
            <p className="text-xs text-slate-500 mt-1">
              Klik **"Rilis Perintah Kerja (WO)"** untuk menjadwalkan produksi barang jadi.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {workOrders.map((wo) => {
              const totalCost = Number(wo.labor_cost) + Number(wo.overhead_cost);
              return (
                <div 
                  key={wo.id} 
                  className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs hover:border-slate-300 transition flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl mt-0.5">
                      <Wrench className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-slate-800">{wo.wo_number}</span>
                        {wo.status === "completed" ? (
                          <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-md text-[9px] font-extrabold uppercase">
                            Selesai
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-amber-50 text-amber-600 border border-amber-100 rounded-md text-[9px] font-extrabold uppercase animate-pulse">
                            Draft Produksi
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-800 font-bold mt-1">
                        Memproduksi: {wo.quantity_to_produce} unit ({wo.bill_of_materials?.finished_item?.name})
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        Formula: {wo.bill_of_materials?.name || "BOM Dihapus"}
                      </p>
                      
                      {/* Biaya Overhead & Labor */}
                      <div className="flex flex-wrap items-center gap-3 mt-1.5 text-[10px] font-bold text-slate-500">
                        <span className="flex items-center gap-0.5"><DollarSign className="w-3 h-3 text-slate-400" /> Jasa: {formatCurrency(wo.labor_cost)}</span>
                        <span>•</span>
                        <span className="flex items-center gap-0.5"><DollarSign className="w-3 h-3 text-slate-400" /> Overhead: {formatCurrency(wo.overhead_cost)}</span>
                        <span>•</span>
                        <span>Est Biaya Konversi: {formatCurrency(totalCost)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 justify-end shrink-0">
                    {wo.status !== "completed" && (
                      <button
                        type="button"
                        onClick={() => handleCompleteWorkOrder(wo)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded-xl text-xs flex items-center gap-1 shadow-sm transition"
                      >
                        <CheckCircle className="w-4 h-4" /> Selesaikan & Rakit
                      </button>
                    )}
                    
                    {wo.status === "completed" && wo.completed_at && (
                      <span className="text-[10px] font-medium text-slate-400 block text-right font-sans">
                        Selesai pada:<br />
                        {new Date(wo.completed_at).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "short",
                          year: "numeric"
                        })}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {/* Add BOM Modal */}
      {showAddBOM && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-800">Daftarkan Formula Produksi (BOM)</h3>
                <p className="text-xs text-slate-500">Tetapkan komposisi bahan mentah untuk membuat produk jadi.</p>
              </div>
              <button onClick={() => setShowAddBOM(false)} className="text-slate-400 hover:text-slate-900 text-xl font-bold">&times;</button>
            </div>

            <form onSubmit={handleCreateBOM} className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Nama Formula *</label>
                  <input
                    type="text"
                    required
                    value={bomName}
                    onChange={(e) => setBomName(e.target.value)}
                    placeholder="e.g. Formula Roti Cokelat Reguler"
                    className="w-full border border-slate-200 px-3 py-2 rounded-xl text-xs focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Hasil Produk Jadi *</label>
                  <select
                    value={finishedItemId}
                    onChange={(e) => setFinishedItemId(e.target.value)}
                    className="w-full bg-white border border-slate-200 px-3 py-2 rounded-xl text-xs focus:outline-none"
                    required
                  >
                    <option value="">-- Pilih Produk Jadi --</option>
                    {catalogItems.map(item => (
                      <option key={item.id} value={item.id}>{item.name} ({item.unit})</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Composition row builder */}
              <div className="space-y-2 border-t border-slate-100 pt-3">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Komposisi Bahan Mentah</label>
                
                <div className="space-y-2">
                  {bomItems.map((row, index) => (
                    <div key={index} className="flex gap-3 items-end p-2.5 bg-slate-50 border border-slate-150 rounded-xl">
                      <div className="flex-1 space-y-1">
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Bahan Baku</label>
                        <select
                          value={row.raw_item_id}
                          onChange={(e) => handleUpdateBOMItem(index, { raw_item_id: e.target.value })}
                          className="w-full bg-white border border-slate-200 px-3 py-1.5 rounded-lg text-xs focus:outline-none"
                          required
                        >
                          <option value="">-- Pilih Bahan Baku --</option>
                          {catalogItems.map(item => (
                            <option key={item.id} value={item.id}>{item.name} ({item.unit})</option>
                          ))}
                        </select>
                      </div>

                      <div className="w-28 space-y-1">
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Kebutuhan Qty</label>
                        <input
                          type="number"
                          required
                          min="0.0001"
                          step="any"
                          value={row.quantity_required}
                          onChange={(e) => handleUpdateBOMItem(index, { quantity_required: Number(e.target.value) })}
                          className="w-full border border-slate-200 px-3 py-1.5 rounded-lg text-xs focus:outline-none font-bold"
                        />
                      </div>

                      {bomItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveBOMRow(index)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={handleAddBOMRow}
                  className="w-full py-2 bg-slate-50 hover:bg-slate-100 border border-dashed border-slate-300 text-slate-600 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition"
                >
                  <Plus className="w-3.5 h-3.5" /> Tambah Bahan Baku
                </button>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddBOM(false)}
                  className="border border-slate-200 hover:bg-slate-100 text-slate-600 font-bold py-2 px-4 rounded-xl text-xs"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-xl text-xs shadow-sm transition"
                >
                  Simpan Formula
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Work Order Modal */}
      {showAddWO && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 w-full max-w-lg shadow-2xl flex flex-col">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-800">Rilis Perintah Kerja (Work Order)</h3>
                <p className="text-xs text-slate-500">Mulai penjadwalan perakitan produk jadi di gudang.</p>
              </div>
              <button onClick={() => setShowAddWO(false)} className="text-slate-400 hover:text-slate-900 text-xl font-bold">&times;</button>
            </div>

            <form onSubmit={handleCreateWorkOrder} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">No. Work Order</label>
                <input
                  type="text"
                  required
                  value={woNumber}
                  onChange={(e) => setWoNumber(e.target.value)}
                  className="w-full border border-slate-200 px-3 py-2.5 rounded-xl text-xs font-mono font-bold focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Pilih Formula BOM *</label>
                <select
                  value={selectedBOMId}
                  onChange={(e) => setSelectedBOMId(e.target.value)}
                  className="w-full bg-white border border-slate-200 px-3 py-2.5 rounded-xl text-xs focus:outline-none"
                  required
                >
                  {boms.map(bom => (
                    <option key={bom.id} value={bom.id}>{bom.name} (Jadi: {bom.finished_item?.name})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Qty Yang Diproduksi *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={qtyToProduce}
                    onChange={(e) => setQtyToProduce(Number(e.target.value))}
                    className="w-full border border-slate-200 px-3 py-2.5 rounded-xl text-xs focus:outline-none font-bold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Lokasi Gudang Produksi *</label>
                  <select
                    value={targetWhId}
                    onChange={(e) => setTargetWhId(e.target.value)}
                    className="w-full bg-white border border-slate-200 px-3 py-2.5 rounded-xl text-xs focus:outline-none"
                    required
                  >
                    {warehouses.map(w => (
                      <option key={w.id} value={w.id}>{w.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 border-t border-slate-100 pt-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Biaya Tenaga Kerja (Labor)</label>
                  <input
                    type="number"
                    value={laborCost}
                    onChange={(e) => setLaborCost(Number(e.target.value))}
                    placeholder="Rp 0"
                    className="w-full border border-slate-200 px-3 py-2.5 rounded-xl text-xs focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Biaya Overhead</label>
                  <input
                    type="number"
                    value={overheadCost}
                    onChange={(e) => setOverheadCost(Number(e.target.value))}
                    placeholder="Rp 0"
                    className="w-full border border-slate-200 px-3 py-2.5 rounded-xl text-xs focus:outline-none"
                  />
                </div>
              </div>

              {boms.length === 0 && (
                <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 flex items-start gap-2 text-[10px] text-amber-700 font-medium">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>Harap daftarkan formula BOM terlebih dahulu di tab sebelah sebelum merilis Work Order.</span>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddWO(false)}
                  className="border border-slate-200 hover:bg-slate-100 text-slate-600 font-bold py-2 px-4 rounded-xl text-xs"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting || boms.length === 0}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-xl text-xs shadow-sm transition disabled:opacity-50"
                >
                  Rilis WO
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
