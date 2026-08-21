"use client";

import React, { useEffect, useState } from "react";
import { 
  Building, 
  MapPin, 
  Plus, 
  ArrowLeft, 
  Loader2, 
  Package, 
  Hash, 
  CheckCircle2, 
  X,
  FileText,
  Warehouse
} from "lucide-react";
import Link from "next/link";
import { useBusiness } from "../../../../lib/context/BusinessContext";
import { createWebBrowserClient } from "../../../../lib/supabase/client";

interface WarehouseItem {
  id: string;
  business_id: string;
  name: string;
  code: string | null;
  address: string | null;
  created_at: string;
  item_stocks?: Array<{
    id: string;
    stock_quantity: number;
  }>;
}

export default function WarehousesPage() {
  const { activeBusiness } = useBusiness();
  const [loading, setLoading] = useState(true);
  const [warehouses, setWarehouses] = useState<WarehouseItem[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form states
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [address, setAddress] = useState("");

  const fetchWarehouses = async () => {
    if (!activeBusiness) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const supabase = createWebBrowserClient();
      
      const { data, error } = await supabase
        .from("warehouses")
        .select(`
          *,
          item_stocks (
            id,
            stock_quantity
          )
        `)
        .eq("business_id", activeBusiness.id)
        .order("name", { ascending: true });

      if (error) throw error;
      setWarehouses(data || []);
    } catch (err) {
      console.error("Error fetching warehouses:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWarehouses();
  }, [activeBusiness]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBusiness) return;
    if (!name.trim()) {
      alert("Nama gudang wajib diisi.");
      return;
    }

    try {
      setSaving(true);
      const supabase = createWebBrowserClient();
      
      const { error } = await supabase
        .from("warehouses")
        .insert({
          business_id: activeBusiness.id,
          name: name.trim(),
          code: code.trim() || null,
          address: address.trim() || null
        });

      if (error) throw error;

      setName("");
      setCode("");
      setAddress("");
      setShowAddModal(false);
      fetchWarehouses();
    } catch (err: any) {
      console.error("Error creating warehouse:", err);
      alert(err.message || "Gagal membuat gudang baru.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4 text-xs font-semibold">
        <div className="space-y-1">
          <Link href="/inventory" className="inline-flex items-center gap-1 text-slate-500 hover:text-blue-600 transition font-bold mb-1">
            <ArrowLeft className="w-4 h-4" /> Kembali ke Inventaris
          </Link>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Warehouse className="w-7 h-7 text-blue-600" /> Kelola Gudang (Multi-Warehouse)
          </h2>
          <p className="text-sm text-slate-500 font-medium mt-0.5">Kelola banyak lokasi penyimpanan persediaan barang untuk bisnis Anda.</p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold py-2.5 px-4 rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition shrink-0 self-start sm:self-auto active:scale-95"
        >
          <Plus className="w-4 h-4" /> Tambah Gudang
        </button>
      </div>

      {/* Grid of Warehouses */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          <p className="text-xs text-slate-500 font-semibold mt-2">Memuat data gudang...</p>
        </div>
      ) : warehouses.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {warehouses.map((wh) => {
            const totalItemsCount = wh.item_stocks?.length || 0;
            const totalQty = wh.item_stocks?.reduce((sum, item) => sum + Number(item.stock_quantity || 0), 0) || 0;

            return (
              <div key={wh.id} className="bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-md transition duration-200 flex flex-col justify-between overflow-hidden card-shadow">
                <div className="p-5 space-y-4">
                  {/* Title & Code */}
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <h3 className="text-base font-bold text-slate-900">{wh.name}</h3>
                      {wh.code && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200 font-mono">
                          <Hash className="w-3 h-3 text-slate-400" /> {wh.code}
                        </span>
                      )}
                    </div>
                    <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center border border-blue-100">
                      <Warehouse className="w-5 h-5 text-blue-600" />
                    </div>
                  </div>

                  {/* Address */}
                  <div className="flex gap-2 text-xs text-slate-500 font-medium">
                    <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                    <span>{wh.address || "Tidak ada detail alamat"}</span>
                  </div>
                </div>

                {/* Warehouse Stock Stats */}
                <div className="bg-slate-50 px-5 py-3.5 border-t border-slate-100 grid grid-cols-2 gap-4 text-center divide-x divide-slate-200">
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Varian Produk</span>
                    <span className="text-sm font-extrabold text-slate-800">{totalItemsCount} item</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Total Stok Fisik</span>
                    <span className="text-sm font-extrabold text-blue-650">{totalQty.toLocaleString("id-ID")} unit</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl p-16 text-center text-slate-400 shadow-sm">
          <Warehouse className="w-16 h-16 mx-auto text-slate-200 mb-4" />
          <p className="text-base font-bold text-slate-700">Belum ada gudang terdaftar</p>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 leading-relaxed">
            Daftarkan lokasi gudang baru Anda untuk mulai melacak persediaan secara terpisah per-gudang.
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="mt-4 bg-blue-600 hover:bg-blue-700 text-white font-extrabold py-2 px-4 rounded-xl text-xs inline-flex items-center gap-1.5 shadow-sm transition"
          >
            <Plus className="w-4 h-4" /> Tambah Gudang Pertama
          </button>
        </div>
      )}

      {/* Add Warehouse Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-xs font-semibold">
            {/* Modal Header */}
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <span className="font-bold text-slate-800 text-sm">Tambah Gudang Baru</span>
              <button 
                onClick={() => setShowAddModal(false)} 
                className="text-slate-400 hover:text-slate-600 transition p-1"
                disabled={saving}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body / Form */}
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div className="space-y-1">
                <label className="text-slate-500 block font-bold">Nama Gudang <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Contoh: Gudang Cabang Bandung, Gudang Utama"
                  className="w-full bg-white border border-slate-200 px-3 py-2 rounded-xl text-slate-800 focus:outline-none focus:border-blue-500 font-semibold"
                  disabled={saving}
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-500 block font-bold">Kode Gudang (Opsional)</label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="Contoh: G-BDG"
                  className="w-full bg-white border border-slate-200 px-3 py-2 rounded-xl text-slate-800 focus:outline-none focus:border-blue-500 font-mono font-semibold"
                  disabled={saving}
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-500 block font-bold">Alamat / Lokasi (Opsional)</label>
                <textarea
                  rows={3}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Alamat lengkap lokasi gudang..."
                  className="w-full bg-white border border-slate-200 px-3 py-2 rounded-xl text-slate-800 focus:outline-none focus:border-blue-500 font-semibold resize-none"
                  disabled={saving}
                />
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl transition font-bold"
                  disabled={saving}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold px-4 py-2 rounded-xl shadow-sm transition flex items-center gap-1.5 disabled:opacity-50"
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Menyimpan...
                    </>
                  ) : (
                    "Simpan Gudang"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
