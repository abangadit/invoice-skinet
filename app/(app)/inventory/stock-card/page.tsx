"use client";

import React, { useEffect, useState } from "react";
import { 
  History, 
  ArrowLeft, 
  Loader2, 
  Warehouse, 
  Package, 
  Calendar, 
  ArrowDownLeft, 
  ArrowUpRight, 
  FileText,
  Search,
  BookOpen
} from "lucide-react";
import Link from "next/link";
import { useBusiness } from "../../../../lib/context/BusinessContext";
import { createWebBrowserClient } from "../../../../lib/supabase/client";

interface WarehouseItem {
  id: string;
  name: string;
}

interface CatalogItem {
  id: string;
  name: string;
  unit: string;
}

interface StockMovement {
  id: string;
  created_at: string;
  type: "in_purchase" | "out_sales" | "adjustment_add" | "adjustment_sub";
  quantity: number;
  unit_cost: number;
  notes: string | null;
  warehouse_id: string;
}

export default function StockCardPage() {
  const { activeBusiness } = useBusiness();
  const [loadingLists, setLoadingLists] = useState(true);
  const [loadingMovements, setLoadingMovements] = useState(false);

  // Selection lists
  const [warehouses, setWarehouses] = useState<WarehouseItem[]>([]);
  const [items, setItems] = useState<CatalogItem[]>([]);

  // Selected filters
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>("");
  const [selectedItemId, setSelectedItemId] = useState<string>("");

  // Stock card entries
  const [movements, setMovements] = useState<StockMovement[]>([]);

  // Load masters
  useEffect(() => {
    const loadMasters = async () => {
      if (!activeBusiness) return;
      try {
        setLoadingLists(true);
        const supabase = createWebBrowserClient();

        // 1. Fetch Warehouses
        const { data: whData } = await supabase
          .from("warehouses")
          .select("id, name")
          .eq("business_id", activeBusiness.id)
          .order("name", { ascending: true });
        setWarehouses(whData || []);
        if (whData && whData.length > 0) {
          setSelectedWarehouseId(whData[0].id);
        }

        // 2. Fetch Catalog Items
        const { data: itemsData } = await supabase
          .from("items")
          .select("id, name, unit")
          .eq("business_id", activeBusiness.id)
          .eq("is_inventory", true)
          .order("name", { ascending: true });
        setItems(itemsData || []);
        if (itemsData && itemsData.length > 0) {
          setSelectedItemId(itemsData[0].id);
        }
      } catch (err) {
        console.error("Error loading master lists for stock card:", err);
      } finally {
        setLoadingLists(false);
      }
    };

    loadMasters();
  }, [activeBusiness]);

  // Load stock movements when item or warehouse changes
  useEffect(() => {
    const fetchMovements = async () => {
      if (!selectedItemId || !selectedWarehouseId) {
        setMovements([]);
        return;
      }
      try {
        setLoadingMovements(true);
        const supabase = createWebBrowserClient();

        const { data, error } = await supabase
          .from("stock_movements")
          .select("*")
          .eq("item_id", selectedItemId)
          .eq("warehouse_id", selectedWarehouseId)
          .order("created_at", { ascending: true }); // chronological order

        if (error) throw error;
        setMovements(data || []);
      } catch (err) {
        console.error("Error fetching stock movements:", err);
      } finally {
        setLoadingMovements(false);
      }
    };

    fetchMovements();
  }, [selectedItemId, selectedWarehouseId]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: activeBusiness?.default_currency || "IDR",
      maximumFractionDigits: 0
    }).format(val);
  };

  // Calculations for running balance and statistics
  const currentItem = items.find(i => i.id === selectedItemId);
  const selectedWarehouse = warehouses.find(w => w.id === selectedWarehouseId);
  const unitLabel = currentItem?.unit || "unit";

  // Build card entries with running balances
  let runningBalance = 0;
  let totalIncoming = 0;
  let totalOutgoing = 0;

  const stockCardEntries = movements.map((mv) => {
    const isIncoming = mv.type === "in_purchase" || mv.type === "adjustment_add";
    const qty = Number(mv.quantity || 0);
    
    if (isIncoming) {
      runningBalance += qty;
      totalIncoming += qty;
    } else {
      runningBalance -= qty;
      totalOutgoing += qty;
    }

    return {
      ...mv,
      changeQty: qty,
      isIncoming,
      balance: runningBalance
    };
  });

  // Since we computed running balance chronologically, we reverse the list for chronological display (newest first)
  const displayEntries = [...stockCardEntries].reverse();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4 text-xs font-semibold">
        <div className="space-y-1">
          <Link href="/inventory" className="inline-flex items-center gap-1 text-slate-500 hover:text-blue-600 transition font-bold mb-1">
            <ArrowLeft className="w-4 h-4" /> Kembali ke Inventaris
          </Link>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <BookOpen className="w-7 h-7 text-blue-600" /> Kartu Stok Barang (Stock Ledger)
          </h2>
          <p className="text-sm text-slate-500 font-medium mt-0.5">Lacak mutasi masuk, keluar, dan saldo persediaan produk per-gudang secara historis.</p>
        </div>
      </div>

      {/* Selectors Card */}
      <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm card-shadow text-xs font-semibold">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Select Warehouse */}
          <div className="space-y-1.5">
            <label className="text-slate-500 font-bold flex items-center gap-1">
              <Warehouse className="w-4 h-4 text-slate-400" /> Pilih Gudang
            </label>
            <select
              value={selectedWarehouseId}
              onChange={(e) => setSelectedWarehouseId(e.target.value)}
              disabled={loadingLists}
              className="w-full bg-white border border-slate-200 px-3.5 py-2.5 rounded-xl text-slate-800 focus:outline-none font-bold"
            >
              {warehouses.map(wh => (
                <option key={wh.id} value={wh.id}>{wh.name}</option>
              ))}
              {warehouses.length === 0 && !loadingLists && (
                <option value="">Gudang tidak ditemukan - Buat terlebih dahulu</option>
              )}
            </select>
          </div>

          {/* Select Item */}
          <div className="space-y-1.5">
            <label className="text-slate-500 font-bold flex items-center gap-1">
              <Package className="w-4 h-4 text-slate-400" /> Pilih Barang Inventaris
            </label>
            <select
              value={selectedItemId}
              onChange={(e) => setSelectedItemId(e.target.value)}
              disabled={loadingLists}
              className="w-full bg-white border border-slate-200 px-3.5 py-2.5 rounded-xl text-slate-800 focus:outline-none font-bold"
            >
              {items.map(item => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
              {items.length === 0 && !loadingLists && (
                <option value="">Produk inventaris tidak ditemukan</option>
              )}
            </select>
          </div>
        </div>
      </div>

      {loadingLists ? (
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          <p className="text-xs text-slate-500 font-semibold mt-2">Memuat pilihan...</p>
        </div>
      ) : !selectedItemId || !selectedWarehouseId ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-400 shadow-sm">
          <Package className="w-12 h-12 mx-auto text-slate-200 mb-3" />
          <p className="text-sm font-semibold">Pilih Gudang & Barang terlebih dahulu</p>
          <p className="text-xs text-slate-550 mt-1">
            Pastikan Anda sudah mendaftarkan Gudang dan Barang dengan opsi Lacak Persediaan aktif.
          </p>
        </div>
      ) : (
        <>
          {/* Quick Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm flex items-center gap-4 card-shadow text-xs font-semibold">
              <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center border border-emerald-100 shrink-0">
                <ArrowDownLeft className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Masuk (Periode Ini)</span>
                <span className="text-lg font-extrabold text-slate-900">+{totalIncoming.toLocaleString("id-ID")} {unitLabel}</span>
              </div>
            </div>

            <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm flex items-center gap-4 card-shadow text-xs font-semibold">
              <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center border border-amber-100 shrink-0">
                <ArrowUpRight className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Keluar (Periode Ini)</span>
                <span className="text-lg font-extrabold text-slate-900">-{totalOutgoing.toLocaleString("id-ID")} {unitLabel}</span>
              </div>
            </div>

            <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm flex items-center gap-4 card-shadow text-xs font-semibold">
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center border border-blue-100 shrink-0">
                <Warehouse className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Saldo Akhir di Gudang</span>
                <span className="text-lg font-extrabold text-blue-650">{runningBalance.toLocaleString("id-ID")} {unitLabel}</span>
              </div>
            </div>
          </div>

          {/* Movements Ledger Table */}
          {loadingMovements ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
              <p className="text-xs text-slate-500 font-semibold mt-2">Memuat mutasi persediaan...</p>
            </div>
          ) : displayEntries.length > 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden card-shadow">
              <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                <span className="font-bold text-slate-800 text-xs">Jurnal Mutasi Kartu Stok</span>
                <span className="text-[10px] font-bold text-slate-400 tracking-wide uppercase">
                  {currentItem?.name} &bull; {selectedWarehouse?.name}
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                      <th className="py-3.5 px-4">Tanggal & Waktu</th>
                      <th className="py-3.5 px-4 text-center">Tipe Transaksi</th>
                      <th className="py-3.5 px-4 text-right">Mutasi Qty</th>
                      <th className="py-3.5 px-4 text-right">Saldo Qty</th>
                      <th className="py-3.5 px-4 text-right">Nilai Unit (HPP)</th>
                      <th className="py-3.5 px-4">Keterangan Catatan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {displayEntries.map((entry) => {
                      const date = new Date(entry.created_at).toLocaleString("id-ID", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit"
                      });

                      return (
                        <tr key={entry.id} className="hover:bg-slate-50 transition">
                          <td className="py-4 px-4 text-slate-500 font-medium">
                            <span className="flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-slate-450 shrink-0" /> {date}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-center">
                            {entry.isIncoming ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-100">
                                <ArrowDownLeft className="w-3 h-3" /> MASUK
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-600 border border-amber-100">
                                <ArrowUpRight className="w-3 h-3" /> KELUAR
                              </span>
                            )}
                          </td>
                          <td className={`py-4 px-4 text-right font-extrabold ${entry.isIncoming ? "text-emerald-600" : "text-amber-600"}`}>
                            {entry.isIncoming ? "+" : "-"}{entry.changeQty.toLocaleString("id-ID")} {unitLabel}
                          </td>
                          <td className="py-4 px-4 text-right font-extrabold text-slate-900 bg-slate-50/50">
                            {entry.balance.toLocaleString("id-ID")} {unitLabel}
                          </td>
                          <td className="py-4 px-4 text-right font-semibold text-slate-800">
                            {formatCurrency(entry.unit_cost)}
                          </td>
                          <td className="py-4 px-4">
                            <span className="flex items-center gap-1.5 text-slate-500 font-medium" title={entry.notes || ""}>
                              <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span className="truncate max-w-[250px]">{entry.notes || "-"}</span>
                            </span>
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
              <History className="w-12 h-12 mx-auto text-slate-250 mb-3" />
              <p className="text-sm font-semibold">Tidak ada riwayat mutasi di lokasi ini</p>
              <p className="text-xs text-slate-500 mt-1">
                Barang **{currentItem?.name}** belum mencatat adanya mutasi masuk/keluar di **{selectedWarehouse?.name}**.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
