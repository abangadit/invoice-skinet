"use client";
 
 import React, { useEffect, useState } from "react";
 import { 
   Package, 
   History, 
   Search, 
   TrendingUp, 
   ArrowDownLeft, 
   ArrowUpRight, 
   AlertTriangle, 
   Calendar, 
   FileText,
   Database,
   Warehouse,
   Sliders,
   Truck,
   ClipboardCheck,
   X
 } from "lucide-react";
 import { useBusiness } from "../../../lib/context/BusinessContext";
 import { createWebBrowserClient } from "../../../lib/supabase/client";
 import Link from "next/link";
 import Pagination from "../../../components/Pagination";
 
 interface InventoryItem {
  id: string;
  name: string;
  unit: string;
  stock_quantity: number;
  cogs_unit_price: number;
  unit_price: number;
  minimum_stock: number;
  sku?: string | null;
  rack_location?: string;
}

interface StockMovement {
  id: string;
  created_at: string;
  type: "in_purchase" | "out_sales" | "adjustment_add" | "adjustment_sub";
  quantity: number;
  unit_cost: number;
  notes: string | null;
  items: {
    name: string;
    unit: string;
  } | null;
}

export default function InventoryPage() {
  const { activeBusiness } = useBusiness();
  const [activeTab, setActiveTab] = useState<"stock" | "ledger">("stock");
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);
  
  // Pagination
  const [currentStockPage, setCurrentStockPage] = useState(1);
  const [currentMovementPage, setCurrentMovementPage] = useState(1);
  const PAGE_SIZE = 10;
  
  // Data states
  const [stockItems, setStockItems] = useState<InventoryItem[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [selectedWarehouseFilter, setSelectedWarehouseFilter] = useState("all");
  const [itemStocksBreakdown, setItemStocksBreakdown] = useState<any[]>([]);

  // Quick Adjustment Modal States
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [adjustType, setAdjustType] = useState<"in" | "out">("in");
  const [adjustWarehouseId, setAdjustWarehouseId] = useState("");
  const [adjustQty, setAdjustQty] = useState("");
  const [adjustCost, setAdjustCost] = useState("");
  const [adjustNotes, setAdjustNotes] = useState("");
  const [adjusting, setAdjusting] = useState(false);

  // Rack/Drawer Location States
  const [showRackModal, setShowRackModal] = useState(false);
  const [selectedRackItem, setSelectedRackItem] = useState<InventoryItem | null>(null);
  const [rackLocations, setRackLocations] = useState<{[key: string]: string}>({});
  const [savingRack, setSavingRack] = useState(false);

  const handleOpenAdjustModal = (item: InventoryItem) => {
    setSelectedItem(item);
    setAdjustType("in");
    setAdjustWarehouseId(warehouses[0]?.id || "");
    setAdjustQty("");
    setAdjustCost(item.cogs_unit_price.toString());
    setAdjustNotes("");
    setShowAdjustModal(false); // reset modal
    setTimeout(() => {
      setShowAdjustModal(true);
    }, 50);
  };

  const handleQuickAdjustmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBusiness || !selectedItem || !adjustWarehouseId) return;
    const qtyNum = Number(adjustQty);
    const costNum = Number(adjustCost);
    if (isNaN(qtyNum) || qtyNum <= 0) {
      alert("Jumlah penyesuaian harus lebih besar dari 0!");
      return;
    }
    if (isNaN(costNum) || costNum < 0) {
      alert("Biaya satuan tidak valid!");
      return;
    }

    try {
      setAdjusting(true);
      const supabase = createWebBrowserClient();

      const { error } = await supabase
        .from("stock_movements")
        .insert({
          business_id: activeBusiness.id,
          warehouse_id: adjustWarehouseId,
          item_id: selectedItem.id,
          type: adjustType === "in" ? "adjustment_add" : "adjustment_sub",
          quantity: qtyNum,
          unit_cost: costNum,
          notes: adjustNotes || (adjustType === "in" ? "Penyesuaian Masuk Manual" : "Penyesuaian Keluar Manual"),
          unit: selectedItem.unit || "pcs"
        });

      if (error) throw error;
      
      alert("Penyesuaian stok berhasil disimpan!");
      setShowAdjustModal(false);
      await fetchStockData();
    } catch (err: any) {
      console.error("Error saving quick adjustment:", err);
      alert(err.message || "Gagal menyimpan penyesuaian.");
    } finally {
      setAdjusting(false);
    }
  };

  const handleOpenRackModal = (item: InventoryItem) => {
    setSelectedRackItem(item);
    const initialRack: {[key: string]: string} = {};
    warehouses.forEach(wh => {
      const existing = itemStocksBreakdown.find(s => s.item_id === item.id && s.warehouse_id === wh.id);
      initialRack[wh.id] = existing?.rack_location || "";
    });
    setRackLocations(initialRack);
    setShowRackModal(true);
  };

  const handleSaveRackLocations = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBusiness || !selectedRackItem) return;
    try {
      setSavingRack(true);
      const supabase = createWebBrowserClient();
      
      for (const whId of Object.keys(rackLocations)) {
        const rackVal = rackLocations[whId];
        const existing = itemStocksBreakdown.find(s => s.item_id === selectedRackItem.id && s.warehouse_id === whId);
        
        const { error } = await supabase
          .from("item_stocks")
          .upsert({
            id: existing?.id,
            warehouse_id: whId,
            item_id: selectedRackItem.id,
            rack_location: rackVal.trim() || null,
            stock_quantity: existing ? existing.stock_quantity : 0,
            cogs_unit_price: existing ? existing.cogs_unit_price : 0
          }, {
            onConflict: "warehouse_id,item_id"
          });
          
        if (error) throw error;
      }
      
      alert("Lokasi Rak/Laci berhasil disimpan!");
      setShowRackModal(false);
      await fetchStockData();
    } catch (err: any) {
      console.error("Error saving rack locations:", err);
      alert(err.message || "Gagal menyimpan lokasi rak.");
    } finally {
      setSavingRack(false);
    }
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("filter") === "low_stock") {
        setShowLowStockOnly(true);
      }
    }
  }, []);

  useEffect(() => {
    setCurrentStockPage(1);
    setCurrentMovementPage(1);
  }, [search, showLowStockOnly, selectedWarehouseFilter]);

  const fetchStockData = async () => {
    if (!activeBusiness) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const supabase = createWebBrowserClient();

      // Fetch items marked as inventory
      const { data: itemsData, error: itemsError } = await supabase
        .from("items")
        .select("id, name, unit, stock_quantity, cogs_unit_price, unit_price, minimum_stock, sku")
        .eq("business_id", activeBusiness.id)
        .eq("is_inventory", true)
        .order("name", { ascending: true });

      if (itemsError) throw itemsError;
      setStockItems((itemsData || []).map((item: any) => ({
        ...item,
        minimum_stock: Number(item.minimum_stock || 0),
        stock_quantity: Number(item.stock_quantity || 0),
        cogs_unit_price: Number(item.cogs_unit_price || 0),
        unit_price: Number(item.unit_price || 0)
      })));

      // Fetch warehouses
      const { data: whData } = await supabase
        .from("warehouses")
        .select("id, name, code")
        .eq("business_id", activeBusiness.id)
        .order("name", { ascending: true });
      setWarehouses(whData || []);

      // Fetch warehouse specific stock breakdown (item_stocks)
      const { data: stocksData } = await supabase
        .from("item_stocks")
        .select(`
          item_id,
          warehouse_id,
          stock_quantity,
          cogs_unit_price,
          rack_location,
          warehouses ( name, code )
        `);
      
      const formattedStocks = (stocksData || []).map((s: any) => ({
        item_id: s.item_id,
        warehouse_id: s.warehouse_id,
        stock_quantity: Number(s.stock_quantity || 0),
        cogs_unit_price: Number(s.cogs_unit_price || 0),
        rack_location: s.rack_location || "",
        warehouse_name: s.warehouses?.name || "Gudang Utama"
      }));
      setItemStocksBreakdown(formattedStocks);

      // Fetch stock movement logs
      const { data: movementsData, error: movementsError } = await supabase
        .from("stock_movements")
        .select(`
          id,
          created_at,
          type,
          quantity,
          unit_cost,
          notes,
          items (
            name,
            unit
          )
        `)
        .eq("business_id", activeBusiness.id)
        .order("created_at", { ascending: false });

      if (movementsError) throw movementsError;
      
      const formatted = (movementsData || []).map((mv: any) => ({
        id: mv.id,
        created_at: mv.created_at,
        type: mv.type,
        quantity: Number(mv.quantity || 0),
        unit_cost: Number(mv.unit_cost || 0),
        notes: mv.notes,
        items: Array.isArray(mv.items) ? mv.items[0] : (mv.items || null)
      }));
      
      setMovements(formatted);
    } catch (err) {
      console.error("Error loading inventory dashboard:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStockData();
  }, [activeBusiness]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: activeBusiness?.default_currency || "IDR",
      maximumFractionDigits: 0
    }).format(val);
  };

  const lowStockCount = stockItems.filter(item => item.stock_quantity <= item.minimum_stock).length;

  const filteredStock = stockItems.map((item) => {
    // If a specific warehouse filter is selected, override stock_quantity and cogs_unit_price
    if (selectedWarehouseFilter !== "all") {
      const specificStock = itemStocksBreakdown.find(
        (s) => s.item_id === item.id && s.warehouse_id === selectedWarehouseFilter
      );
      return {
        ...item,
        stock_quantity: specificStock ? specificStock.stock_quantity : 0,
        cogs_unit_price: specificStock ? specificStock.cogs_unit_price : item.cogs_unit_price,
        rack_location: specificStock ? specificStock.rack_location : ""
      };
    }
    return item;
  }).filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase()) || 
      (item.sku && item.sku.toLowerCase().includes(search.toLowerCase()));
    const matchesLowStock = !showLowStockOnly || item.stock_quantity <= item.minimum_stock;
    return matchesSearch && matchesLowStock;
  });

  const filteredMovements = movements.filter((mv) => {
    return mv.items?.name.toLowerCase().includes(search.toLowerCase()) || 
      (mv.notes && mv.notes.toLowerCase().includes(search.toLowerCase()));
  });

  const totalAssetValue = stockItems.reduce((sum, item) => sum + (item.stock_quantity * item.cogs_unit_price), 0);

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4 text-xs font-semibold">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            Stok & Inventaris Gudang
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">Pantau nilai aset persediaan barang gudang dan mutasi stok secara real-time.</p>
        </div>
        
        <div className="flex flex-wrap gap-2">
           <Link
             href="/inventory/production"
             className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition active:scale-95"
           >
             <Sliders className="w-4 h-4 text-slate-500" /> BOM & Perakitan
           </Link>
           <Link
             href="/inventory/transfer"
             className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition active:scale-95"
           >
             <Truck className="w-4 h-4 text-slate-500" /> Transfer Gudang
           </Link>
           <Link
             href="/inventory/adjustments"
             className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition active:scale-95"
           >
             <ClipboardCheck className="w-4 h-4 text-slate-500" /> Stok Opname
           </Link>
           <Link
             href="/inventory/warehouses"
             className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition active:scale-95"
           >
             <Warehouse className="w-4 h-4 text-slate-500" /> Kelola Gudang
           </Link>
           <Link
             href="/inventory/stock-card"
             className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold py-2.5 px-4 rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition active:scale-95"
           >
             <History className="w-4 h-4" /> Kartu Stok
           </Link>
         </div>
      </div>

      {/* Cards Dashboard Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Nilai Total Aset Gudang */}
        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm flex items-center gap-4 card-shadow">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center border border-blue-100">
            <TrendingUp className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Nilai Total Aset Stok</span>
            <span className="text-xl font-extrabold text-slate-900">{formatCurrency(totalAssetValue)}</span>
          </div>
        </div>

        {/* Total Jenis Barang Gudang */}
        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm flex items-center gap-4 card-shadow">
          <div className="w-12 h-12 bg-slate-50 text-slate-600 rounded-xl flex items-center justify-center border border-slate-200">
            <Database className="w-6 h-6 text-slate-500" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Varian Barang</span>
            <span className="text-xl font-extrabold text-slate-900">{stockItems.length} Produk</span>
          </div>
        </div>

        {/* Stok Menipis Warning */}
        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm flex items-center gap-4 card-shadow">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${
            lowStockCount > 0 
              ? "bg-rose-50 text-rose-600 border-rose-100 animate-pulse" 
              : "bg-emerald-50 text-emerald-600 border-emerald-100"
          }`}>
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Stok Menipis (Sesuai Batas Minimum)</span>
            <span className={`text-xl font-extrabold ${lowStockCount > 0 ? "text-rose-600" : "text-slate-900"}`}>
              {lowStockCount} Produk
            </span>
          </div>
        </div>
      </div>

      {/* Tab & Filter Controllers */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="flex flex-1 bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
          <button
            onClick={() => setActiveTab("stock")}
            className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 ${
              activeTab === "stock" 
                ? "bg-blue-600 text-white shadow-sm font-extrabold" 
                : "text-slate-500 hover:bg-slate-50"
            }`}
          >
            <Package className="w-4 h-4" /> Stok Gudang Saat Ini
          </button>
          <button
            onClick={() => setActiveTab("ledger")}
            className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 ${
              activeTab === "ledger" 
                ? "bg-blue-600 text-white shadow-sm font-extrabold" 
                : "text-slate-500 hover:bg-slate-50"
            }`}
          >
            <History className="w-4 h-4" /> Riwayat Mutasi Stok Ledger
          </button>
        </div>

        {activeTab === "stock" && (
          <button
            onClick={() => setShowLowStockOnly(!showLowStockOnly)}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 border shadow-sm ${
              showLowStockOnly
                ? "bg-rose-600 border-rose-600 text-white font-extrabold"
                : "bg-white border-slate-200 text-slate-605 hover:bg-slate-50"
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
            <span>Stok Menipis Saja ({lowStockCount})</span>
          </button>
        )}
      </div>

      {/* Search Bar & Warehouse Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={activeTab === "stock" ? "Cari nama barang di gudang..." : "Cari riwayat mutasi berdasarkan nama barang atau catatan..."}
            className="w-full bg-white border border-slate-200 pl-10 pr-4 py-2.5 rounded-xl text-sm placeholder-slate-400 focus:outline-none focus:border-blue-500 transition shadow-sm font-semibold"
          />
        </div>

        {activeTab === "stock" && (
          <div className="flex items-center gap-2 bg-white border border-slate-200 px-3 py-1.5 rounded-xl shadow-sm">
            <Warehouse className="w-4 h-4 text-slate-400 shrink-0" />
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Filter Gudang:</span>
            <select
              value={selectedWarehouseFilter}
              onChange={(e) => setSelectedWarehouseFilter(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-700 focus:outline-none cursor-pointer pr-4"
            >
              <option value="all">Semua Gudang (Akumulasi)</option>
              {warehouses.map(wh => (
                <option key={wh.id} value={wh.id}>
                  {wh.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Contents Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs text-slate-500 font-semibold mt-2">Memuat inventaris gudang...</p>
        </div>
      ) : activeTab === "stock" ? (
        /* STOCK LEVELS TAB */
        filteredStock.length > 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden card-shadow text-xs font-semibold">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                    <th className="py-3.5 px-4">Nama Barang</th>
                    <th className="py-3.5 px-4 text-center">Batas Minimum</th>
                    <th className="py-3.5 px-4 text-center">Sisa Kuantitas</th>
                    <th className="py-3.5 px-4 text-right">Harga Beli Rata-Rata (HPP)</th>
                    <th className="py-3.5 px-4 text-right">Harga Jual Default</th>
                    <th className="py-3.5 px-4 text-right">Total Nilai Aset</th>
                    <th className="py-3.5 px-4 text-center w-28">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredStock.slice((currentStockPage - 1) * PAGE_SIZE, currentStockPage * PAGE_SIZE).map((item) => {
                    const stock = item.stock_quantity;
                    const cogs = item.cogs_unit_price;
                    const assetVal = stock * cogs;
                    const isLow = stock <= item.minimum_stock;

                    return (
                      <tr key={item.id} className="hover:bg-slate-50 transition">
                        <td className="py-4 px-4 font-bold text-slate-900">
                          <div className="flex items-center gap-1.5">
                            <span>{item.name}</span>
                            {item.sku && (
                              <span className="text-[9px] font-mono font-bold bg-slate-100 text-slate-500 border border-slate-200 px-1.5 py-0.2 rounded">
                                {item.sku}
                              </span>
                            )}
                          </div>
                          {selectedWarehouseFilter === "all" ? (
                            <div className="flex flex-wrap gap-1 mt-1 text-[10px] text-slate-400 font-semibold">
                              {itemStocksBreakdown
                                .filter(s => s.item_id === item.id)
                                .map((bd, bidx) => (
                                  <span key={bidx} className="bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200">
                                    {bd.warehouse_name}: {bd.stock_quantity.toLocaleString("id-ID")} {bd.rack_location ? `(Rak: ${bd.rack_location})` : ""}
                                  </span>
                                ))}
                            </div>
                          ) : (
                            <div className="text-[10px] text-slate-450 font-semibold mt-1">
                              Lokasi Rak/Laci: <span className="text-slate-700 font-bold">{item.rack_location || "-"}</span>
                            </div>
                          )}
                        </td>
                        <td className="py-4 px-4 text-center text-slate-500 font-mono">
                          {item.minimum_stock.toLocaleString("id-ID")} {item.unit}
                        </td>
                        <td className="py-4 px-4 text-center">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
                            isLow 
                              ? "bg-rose-50 text-rose-600 border-rose-100 animate-pulse" 
                              : "bg-slate-50 text-slate-700 border-slate-200"
                          }`}>
                            {stock.toLocaleString("id-ID")} {item.unit}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-right font-semibold text-slate-800">
                          {formatCurrency(cogs)}
                        </td>
                        <td className="py-4 px-4 text-right font-medium text-slate-500">
                          {formatCurrency(item.unit_price)}
                        </td>
                        <td className="py-4 px-4 text-right font-extrabold text-blue-600">
                          {formatCurrency(assetVal)}
                        </td>
                        <td className="py-4 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => handleOpenAdjustModal(item)}
                              className="bg-blue-50 hover:bg-blue-100 text-blue-600 px-2.5 py-1.5 rounded-lg transition font-extrabold text-[10px] uppercase"
                            >
                              Sesuaikan
                            </button>
                            <button
                              onClick={() => handleOpenRackModal(item)}
                              className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1.5 rounded-lg transition font-extrabold text-[10px] uppercase"
                              title="Atur Lokasi Rak/Laci"
                            >
                              Rak/Laci
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="p-4 border-t border-slate-100">
              <Pagination
                currentPage={currentStockPage}
                totalItems={filteredStock.length}
                pageSize={PAGE_SIZE}
                onPageChange={setCurrentStockPage}
              />
            </div>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-400 shadow-sm">
            <Package className="w-12 h-12 mx-auto text-slate-200 mb-3" />
            <p className="text-sm font-semibold">Tidak ada barang persediaan stok di gudang</p>
            <p className="text-xs text-slate-500 mt-1">
              Silakan tambahkan produk baru di menu katalog dan aktifkan opsi **"Lacak Persediaan Stok (Inventaris)"**.
            </p>
          </div>
        )
      ) : (
        /* STOCK MOVEMENT LEDGER TAB */
        filteredMovements.length > 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden card-shadow text-xs font-semibold">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                    <th className="py-3.5 px-4">Tanggal & Waktu</th>
                    <th className="py-3.5 px-4">Nama Barang</th>
                    <th className="py-3.5 px-4 text-center">Tipe Mutasi</th>
                    <th className="py-3.5 px-4 text-center">Kuantitas (Qty)</th>
                    <th className="py-3.5 px-4 text-right">Nilai Unit (HPP)</th>
                    <th className="py-3.5 px-4">Catatan Keterangan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredMovements.slice((currentMovementPage - 1) * PAGE_SIZE, currentMovementPage * PAGE_SIZE).map((mv) => {
                    const date = new Date(mv.created_at).toLocaleString("id-ID", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit"
                    });

                    const isIncoming = mv.type === "in_purchase" || mv.type === "adjustment_add";

                    return (
                      <tr key={mv.id} className="hover:bg-slate-50 transition">
                        <td className="py-4 px-4 text-slate-500 font-medium flex items-center gap-1.5 mt-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" /> {date}
                        </td>
                        <td className="py-4 px-4 font-bold text-slate-900">
                          {mv.items?.name || "Item Dihapus"}
                        </td>
                        <td className="py-4 px-4 text-center">
                          {isIncoming ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-100">
                              <ArrowDownLeft className="w-3 h-3" /> MASUK
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-600 border border-amber-100">
                              <ArrowUpRight className="w-3 h-3" /> KELUAR
                            </span>
                          )}
                        </td>
                        <td className={`py-4 px-4 text-center font-extrabold ${isIncoming ? "text-emerald-600" : "text-amber-600"}`}>
                          {isIncoming ? "+" : "-"}{mv.quantity.toLocaleString("id-ID")} {mv.items?.unit}
                        </td>
                        <td className="py-4 px-4 text-right font-semibold">
                          {formatCurrency(mv.unit_cost)}
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-1.5 text-slate-500">
                            <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="truncate max-w-[200px]" title={mv.notes || ""}>
                              {mv.notes || "-"}
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="p-4 border-t border-slate-100">
              <Pagination
                currentPage={currentMovementPage}
                totalItems={filteredMovements.length}
                pageSize={PAGE_SIZE}
                onPageChange={setCurrentMovementPage}
              />
            </div>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-400 shadow-sm">
            <History className="w-12 h-12 mx-auto text-slate-200 mb-3" />
            <p className="text-sm font-semibold">Belum ada mutasi barang terekam</p>
            <p className="text-xs text-slate-500 mt-0.5">Riwayat stok keluar/masuk akan tercatat di sini secara berkala.</p>
          </div>
        )
      )}

      {/* Quick Adjustment Modal */}
      {showAdjustModal && selectedItem && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col text-xs font-semibold text-slate-800">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 bg-slate-50">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Penyesuaian Stok Cepat
                </h3>
                <p className="text-[10px] text-slate-500 mt-0.5 font-bold">
                  {selectedItem.name}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAdjustModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleQuickAdjustmentSubmit} className="p-5 space-y-4">
              {/* Warehouse */}
              <div className="space-y-1">
                <label className="text-slate-500 block">Pilih Gudang *</label>
                <select
                  value={adjustWarehouseId}
                  onChange={(e) => setAdjustWarehouseId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:border-blue-500 font-semibold"
                  required
                >
                  <option value="" disabled>-- Pilih Gudang --</option>
                  {warehouses.map(wh => (
                    <option key={wh.id} value={wh.id}>
                      {wh.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Type */}
              <div className="space-y-1">
                <label className="text-slate-500 block">Tipe Penyesuaian *</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAdjustType("in")}
                    className={`py-2 px-3 rounded-xl border font-bold text-center transition ${
                      adjustType === "in"
                        ? "bg-emerald-50 text-emerald-650 border-emerald-200"
                        : "bg-white text-slate-650 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    Stok Masuk (+)
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustType("out")}
                    className={`py-2 px-3 rounded-xl border font-bold text-center transition ${
                      adjustType === "out"
                        ? "bg-rose-50 text-rose-650 border-rose-200"
                        : "bg-white text-slate-650 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    Stok Keluar (-)
                  </button>
                </div>
              </div>

              {/* Quantity */}
              <div className="space-y-1">
                <label className="text-slate-500 block">Jumlah Kuantitas ({selectedItem.unit || "pcs"}) *</label>
                <input
                  type="number"
                  step="any"
                  min="0.001"
                  value={adjustQty}
                  onChange={(e) => setAdjustQty(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:border-blue-500 font-mono font-bold"
                  placeholder="0"
                  required
                />
              </div>

              {/* Unit Cost (HPP) */}
              <div className="space-y-1">
                <label className="text-slate-500 block">Biaya per Unit (HPP) *</label>
                <input
                  type="number"
                  min="0"
                  value={adjustCost}
                  onChange={(e) => setAdjustCost(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:border-blue-500 font-mono font-bold"
                  placeholder="Rp 0"
                  required
                />
              </div>

              {/* Notes */}
              <div className="space-y-1">
                <label className="text-slate-500 block">Catatan / Alasan</label>
                <input
                  type="text"
                  value={adjustNotes}
                  onChange={(e) => setAdjustNotes(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:border-blue-500 font-semibold"
                  placeholder="Contoh: Barang pecah, bonus toko, dll."
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAdjustModal(false)}
                  className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-extrabold py-2 px-4 rounded-xl transition active:scale-95"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={adjusting}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold py-2 px-4 rounded-xl shadow-sm transition active:scale-95 disabled:opacity-50"
                >
                  {adjusting ? "Menyimpan..." : "Simpan Penyesuaian"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manage Rack Modal */}
      {showRackModal && selectedRackItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full overflow-hidden shadow-2xl text-xs font-semibold">
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Atur Lokasi Rak / Laci
                </h3>
                <p className="text-[10px] text-slate-500 mt-0.5 font-medium">{selectedRackItem.name}</p>
              </div>
              <button 
                onClick={() => setShowRackModal(false)}
                className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveRackLocations} className="p-6 space-y-4">
              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                {warehouses.map(wh => (
                  <div key={wh.id} className="space-y-1 bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                      {wh.name} {wh.code ? `(${wh.code})` : ""}
                    </label>
                    <input
                      type="text"
                      value={rackLocations[wh.id] || ""}
                      onChange={(e) => setRackLocations({ ...rackLocations, [wh.id]: e.target.value })}
                      placeholder="Contoh: Rak B-12, Laci 2"
                      className="w-full border border-slate-200 px-3 py-2 rounded-xl text-sm placeholder-slate-400 focus:outline-none focus:border-blue-500 bg-white transition"
                    />
                  </div>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
                <button 
                  type="button" 
                  onClick={() => setShowRackModal(false)}
                  className="flex-1 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold rounded-xl text-xs transition text-center"
                >
                  Batal
                </button>
                <button 
                  type="submit" 
                  disabled={savingRack}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition shadow-sm text-center flex items-center justify-center"
                >
                  {savingRack ? "Menyimpan..." : "Simpan Lokasi"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
