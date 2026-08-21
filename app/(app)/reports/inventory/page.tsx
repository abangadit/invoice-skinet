"use client";

import React, { useEffect, useState } from "react";
import { 
  Package, 
  Search, 
  TrendingUp, 
  AlertTriangle, 
  Database,
  Download,
  Printer
} from "lucide-react";
import { useBusiness } from "../../../../lib/context/BusinessContext";
import { createWebBrowserClient } from "../../../../lib/supabase/client";

interface InventoryItem {
  id: string;
  name: string;
  unit: string;
  stock_quantity: number;
  cogs_unit_price: number;
  unit_price: number;
  minimum_stock: number;
}

export default function InventoryReportPage() {
  const { activeBusiness } = useBusiness();
  const [loading, setLoading] = useState(true);
  const [stockItems, setStockItems] = useState<InventoryItem[]>([]);
  
  // Filter & Search states
  const [search, setSearch] = useState("");
  const [stockFilter, setStockFilter] = useState<"all" | "low" | "out">("all");

  const fetchStockData = async () => {
    if (!activeBusiness) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const supabase = createWebBrowserClient();

      const { data: itemsData, error: itemsError } = await supabase
        .from("items")
        .select("id, name, unit, stock_quantity, cogs_unit_price, unit_price, minimum_stock")
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
    } catch (err) {
      console.error("Error loading inventory report:", err);
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

  // Calculations on raw items
  const lowStockCount = stockItems.filter(item => item.stock_quantity <= item.minimum_stock && item.stock_quantity > 0).length;
  const outOfStockCount = stockItems.filter(item => item.stock_quantity <= 0).length;
  const totalAssetValue = stockItems.reduce((sum, item) => sum + (item.stock_quantity * item.cogs_unit_price), 0);

  // Filter items
  const filteredStock = stockItems.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase());
    
    let matchesFilter = true;
    if (stockFilter === "low") {
      matchesFilter = item.stock_quantity <= item.minimum_stock && item.stock_quantity > 0;
    } else if (stockFilter === "out") {
      matchesFilter = item.stock_quantity <= 0;
    }
    
    return matchesSearch && matchesFilter;
  });

  const handleExportCSV = () => {
    let csvContent = "\uFEFF"; // UTF-8 BOM
    csvContent += "LAPORAN PENILAIAN & STOK INVENTARIS GUDANG\n";
    csvContent += `${activeBusiness?.name || "Bisnis"}\n`;
    csvContent += `Tanggal Cetak: ${new Date().toLocaleDateString("id-ID")}\n\n`;
    csvContent += "Nama Barang,Batas Minimum,Sisa Kuantitas,Satuan,Harga Pokok (COGS) (Rp),Harga Jual (Rp),Total Nilai Aset (Rp)\n";
    
    filteredStock.forEach(item => {
      const assetVal = item.stock_quantity * item.cogs_unit_price;
      csvContent += `"${item.name}",${item.minimum_stock},${item.stock_quantity},"${item.unit}",${item.cogs_unit_price},${item.unit_price},${assetVal}\n`;
    });
    
    csvContent += `\n,,TOTAL ASET,,,${totalAssetValue}\n`;
    
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Laporan_Persediaan_Stok_${activeBusiness?.name || "Bisnis"}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs text-slate-500 font-semibold mt-2">Menyusun laporan stok barang...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4 no-print text-xs font-semibold">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            Laporan Stok & Penilaian Gudang
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">Analisis sisa kuantitas barang, harga beli pokok (COGS), dan total nilai aset persediaan.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition"
          >
            <Download className="w-4 h-4" /> Ekspor Excel (CSV)
          </button>
          <button
            onClick={() => window.print()}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition"
          >
            <Printer className="w-4 h-4" /> Cetak Laporan (PDF)
          </button>
        </div>
      </div>

      {/* Cards Dashboard Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center border border-blue-100">
            <TrendingUp className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Nilai Harta Stok</span>
            <span className="text-xl font-extrabold text-slate-900">{formatCurrency(totalAssetValue)}</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-slate-50 text-slate-650 rounded-xl flex items-center justify-center border border-slate-200">
            <Database className="w-6 h-6 text-slate-500" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Varian Jenis Barang</span>
            <span className="text-xl font-extrabold text-slate-900">{stockItems.length} Varian</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm flex items-center gap-4">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${
            lowStockCount > 0 
              ? "bg-rose-50 text-rose-600 border-rose-100 animate-pulse" 
              : "bg-emerald-50 text-emerald-600 border-emerald-100"
          }`}>
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Peringatan Menipis / Habis</span>
            <span className={`text-xl font-extrabold ${lowStockCount + outOfStockCount > 0 ? "text-rose-650" : "text-slate-900"}`}>
              {lowStockCount} Tipis / {outOfStockCount} Habis
            </span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar no-print */}
      <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm space-y-3 no-print">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between text-xs font-semibold">
          <div className="flex gap-1.5 p-1 bg-slate-100 rounded-xl w-full sm:w-auto">
            <button
              onClick={() => setStockFilter("all")}
              className={`flex-1 sm:flex-none px-4 py-1.5 rounded-lg transition ${
                stockFilter === "all" ? "bg-white text-blue-600 shadow-sm font-extrabold" : "text-slate-650 hover:bg-slate-50"
              }`}
            >
              Semua Barang
            </button>
            <button
              onClick={() => setStockFilter("low")}
              className={`flex-1 sm:flex-none px-4 py-1.5 rounded-lg transition flex items-center justify-center gap-1 ${
                stockFilter === "low" ? "bg-white text-blue-600 shadow-sm font-extrabold" : "text-slate-650 hover:bg-slate-50"
              }`}
            >
              Menipis ({lowStockCount})
            </button>
            <button
              onClick={() => setStockFilter("out")}
              className={`flex-1 sm:flex-none px-4 py-1.5 rounded-lg transition flex items-center justify-center gap-1 ${
                stockFilter === "out" ? "bg-white text-blue-600 shadow-sm font-extrabold" : "text-slate-655 hover:bg-slate-50"
              }`}
            >
              Habis ({outOfStockCount})
            </button>
          </div>

          <div className="relative flex-1 sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-3.5 h-3.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama barang..."
              className="w-full bg-white border border-slate-200 pl-9 pr-4 py-2 rounded-xl text-xs placeholder-slate-400 focus:outline-none focus:border-blue-500 font-semibold"
            />
          </div>
        </div>
      </div>

      {/* Main Stock Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden text-xs font-semibold">
        <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50">
          <h3 className="font-bold text-slate-900 text-sm">Rincian Penilaian Persediaan</h3>
          <p className="text-[11px] text-slate-500 font-medium mt-0.5">Daftar stok fisik barang dan nilai aset berdasarkan harga beli pokok rata-rata.</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-slate-700">
            <thead>
              <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-400 uppercase text-[9px] tracking-wider">
                <th className="px-5 py-3">Nama Produk</th>
                <th className="px-5 py-3 text-center">Batas Minimum</th>
                <th className="px-5 py-3 text-center">Stok Kuantitas</th>
                <th className="px-5 py-3 text-right">Harga Pokok (COGS)</th>
                <th className="px-5 py-3 text-right">Harga Jual Default</th>
                <th className="px-5 py-3 text-right">Total Nilai Aset</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-150">
              {filteredStock.length > 0 ? (
                filteredStock.map((item) => {
                  const assetVal = item.stock_quantity * item.cogs_unit_price;
                  const isOut = item.stock_quantity <= 0;
                  const isLow = item.stock_quantity <= item.minimum_stock && !isOut;

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/30 transition">
                      <td className="px-5 py-3.5 font-bold text-slate-900">{item.name}</td>
                      <td className="px-5 py-3.5 text-center text-slate-405 font-mono">{item.minimum_stock} {item.unit}</td>
                      <td className="px-5 py-3.5 text-center">
                        <span className={`px-2 py-0.5 rounded-full border text-[10px] font-extrabold ${
                          isOut 
                            ? "bg-rose-50 text-rose-600 border-rose-100 font-black animate-pulse" 
                            : isLow
                              ? "bg-amber-50 text-amber-600 border-amber-100"
                              : "bg-slate-50 text-slate-650 border-slate-200"
                        }`}>
                          {item.stock_quantity.toLocaleString("id-ID")} {item.unit}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right font-mono text-slate-800 font-bold">{formatCurrency(item.cogs_unit_price)}</td>
                      <td className="px-5 py-3.5 text-right font-mono text-slate-500">{formatCurrency(item.unit_price)}</td>
                      <td className="px-5 py-3.5 text-right font-mono font-extrabold text-blue-600">{formatCurrency(assetVal)}</td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-slate-400 font-medium">
                    Tidak ada data persediaan stok barang gudang ditemukan.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
