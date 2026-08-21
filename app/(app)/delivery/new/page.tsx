"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Truck,
  AlertCircle,
  ClipboardCheck,
  User,
  Plus
} from "lucide-react";
import { useBusiness } from "../../../../lib/context/BusinessContext";
import { createWebBrowserClient } from "../../../../lib/supabase/client";

interface SOItem {
  id: string;
  item_id: string | null;
  name: string;
  quantity: number;
  unit: string;
}

interface SODetail {
  id: string;
  so_number: string;
  customers: {
    name: string;
    address: string | null;
  } | null;
}

interface DOItemRow {
  itemId: string | null;
  name: string;
  quantityOrdered: number;
  quantityShipped: number;
  unit: string;
}

function DeliveryOrderFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const soId = searchParams?.get("soId");
  const invoiceId = searchParams?.get("invoice_id");
  const { activeBusiness } = useBusiness();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [so, setSo] = useState<SODetail | null>(null);
  const [doNumber, setDoNumber] = useState("");
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [rows, setRows] = useState<DOItemRow[]>([]);

  useEffect(() => {
    const generateDoNumber = () => {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, "0");
      const random = Math.floor(1000 + Math.random() * 9000);
      setDoNumber(`DO/${year}/${month}/${random}`);
    };
    generateDoNumber();
  }, []);

  const loadReferenceData = async () => {
    if (!activeBusiness || (!soId && !invoiceId)) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setErrorMsg("");
      const supabase = createWebBrowserClient();

      if (invoiceId) {
        // Fetch Invoice Header
        const { data: invData, error: invError } = await supabase
          .from("invoices")
          .select(`
            id,
            invoice_number,
            warehouse_id,
            customer_snapshot,
            customers (
              name,
              address
            )
          `)
          .eq("id", invoiceId)
          .eq("business_id", activeBusiness.id)
          .single();

        if (invError) throw invError;

        const custObj = invData.customers
          ? (Array.isArray(invData.customers) ? invData.customers[0] : invData.customers)
          : { name: invData.customer_snapshot?.name || "Pelanggan Umum", address: invData.customer_snapshot?.address || "" };

        const formattedRef = {
          id: invData.id,
          so_number: invData.invoice_number,
          customers: custObj
        };
        setSo(formattedRef);
        if (invData.warehouse_id) {
          setSelectedWarehouseId(invData.warehouse_id);
        }

        if (custObj) {
          setRecipientName(custObj.name);
          setDeliveryAddress(custObj.address || "");
        }

        // Fetch Invoice Items
        const { data: itemsData, error: itemsError } = await supabase
          .from("invoice_items")
          .select("item_id, name, quantity, unit")
          .eq("invoice_id", invoiceId);

        if (itemsError) throw itemsError;

        const initialRows: DOItemRow[] = (itemsData || []).map((item: any) => ({
          itemId: item.item_id,
          name: item.name,
          quantityOrdered: Number(item.quantity || 0),
          quantityShipped: Number(item.quantity || 0),
          unit: item.unit || "pcs"
        }));

        setRows(initialRows);
      } else if (soId) {
        // Fetch Sales Order header
        const { data: soData, error: soError } = await supabase
          .from("sales_orders")
          .select(`
            id,
            so_number,
            warehouse_id,
            customers (
              name,
              address
            )
          `)
          .eq("id", soId)
          .eq("business_id", activeBusiness.id)
          .single();

        if (soError) throw soError;

        const formattedSO = {
          id: soData.id,
          so_number: soData.so_number,
          customers: Array.isArray(soData.customers) ? soData.customers[0] : soData.customers
        };
        setSo(formattedSO);
        if (soData.warehouse_id) {
          setSelectedWarehouseId(soData.warehouse_id);
        }

        if (formattedSO.customers) {
          setRecipientName(formattedSO.customers.name);
          setDeliveryAddress(formattedSO.customers.address || "");
        }

        // Fetch SO line items
        const { data: itemsData, error: itemsError } = await supabase
          .from("sales_order_items")
          .select("item_id, name, quantity, unit")
          .eq("so_id", soId);

        if (itemsError) throw itemsError;

        const initialRows: DOItemRow[] = (itemsData || []).map((item: any) => ({
          itemId: item.item_id,
          name: item.name,
          quantityOrdered: Number(item.quantity || 0),
          quantityShipped: Number(item.quantity || 0),
          unit: item.unit || "pcs"
        }));

        setRows(initialRows);
      }
    } catch (err: any) {
      console.error("Error loading reference data for DO creation:", err);
      setErrorMsg(err.message || "Gagal memuat referensi dokumen.");
    } finally {
      setLoading(false);
    }
  };

  const fetchWarehouses = async () => {
    if (!activeBusiness) return;
    try {
      const supabase = createWebBrowserClient();
      const { data, error } = await supabase
        .from("warehouses")
        .select("*")
        .eq("business_id", activeBusiness.id)
        .order("name", { ascending: true });
      if (error) throw error;
      setWarehouses(data || []);
      if (data && data.length > 0) {
        setSelectedWarehouseId(prev => prev || data[0].id);
      }
    } catch (err) {
      console.error("Error fetching warehouses:", err);
    }
  };

  useEffect(() => {
    loadReferenceData();
    fetchWarehouses();
  }, [activeBusiness, soId, invoiceId]);

  const handleUpdateQty = (index: number, val: number) => {
    const updated = [...rows];
    updated[index].quantityShipped = Math.max(0, val);
    setRows(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBusiness || !so) return;

    if (!deliveryAddress.trim()) {
      setErrorMsg("Alamat Pengiriman tidak boleh kosong!");
      return;
    }

    if (rows.some(r => r.quantityShipped <= 0)) {
      setErrorMsg("Harap tentukan jumlah kirim yang valid (> 0) untuk semua baris barang!");
      return;
    }

    try {
      setSaving(true);
      setErrorMsg("");
      const supabase = createWebBrowserClient();

      // 1. Insert Delivery Order Header
      const { data: newDO, error: doError } = await supabase
        .from("delivery_orders")
        .insert({
          business_id: activeBusiness.id,
          sales_order_id: soId ? so.id : null,
          do_number: doNumber,
          status: "draft",
          recipient_name: recipientName || null,
          delivery_address: deliveryAddress,
          tracking_number: trackingNumber || null,
          notes: notes || null,
          warehouse_id: activeBusiness?.is_multi_warehouse_enabled ? (selectedWarehouseId || null) : null
        })
        .select()
        .single();

      if (doError) {
        if (doError.code === "23505") {
          throw new Error("Nomor Surat Jalan sudah digunakan.");
        }
        throw doError;
      }

      // 2. Insert Delivery Order Items
      const itemsPayload = rows.map(r => ({
        do_id: newDO.id,
        item_id: r.itemId,
        name: r.name,
        quantity_ordered: r.quantityOrdered,
        quantity_shipped: r.quantityShipped,
        unit: r.unit
      }));

      const { error: itemsError } = await supabase
        .from("delivery_order_items")
        .insert(itemsPayload);

      if (itemsError) {
        // Rollback DO header
        await supabase.from("delivery_orders").delete().eq("id", newDO.id);
        throw itemsError;
      }

      // 3. Set SO status to processing if created from SO
      if (soId) {
        await supabase
          .from("sales_orders")
          .update({ status: "processing" })
          .eq("id", so.id);
      }

      alert("Surat Jalan (DO) berhasil dibuat dengan status Draft!");
      router.push(`/delivery/${newDO.id}`);

    } catch (err: any) {
      console.error("Error creating DO:", err);
      setErrorMsg(err.message || "Gagal membuat Surat Jalan.");
    } finally {
      setSaving(false);
    }
  };

  if (!soId && !invoiceId) {
    return (
      <div className="bg-rose-50 border border-rose-100 text-rose-600 text-xs px-4 py-3 rounded-2xl max-w-xl mx-auto mt-10 space-y-2 font-bold">
        <AlertCircle className="w-5 h-5 shrink-0" />
        <span>Gagal memuat form: ID Referensi (Invoice atau Sales Order) wajib disertakan.</span>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center font-sans">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs text-slate-500 font-semibold mt-2">Memuat form Surat Jalan...</p>
      </div>
    );
  }

  if (errorMsg && !so) {
    return (
      <div className="bg-rose-50 border border-rose-100 text-rose-600 text-xs px-4 py-3 rounded-2xl max-w-xl mx-auto mt-10 space-y-3 font-bold">
        <p>{errorMsg}</p>
        <button onClick={() => router.push("/sales")} className="text-blue-600 hover:underline">
          Kembali ke Sales Order
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4 text-xs font-semibold">
        <button
          onClick={() => router.push(`/sales/${soId}`)}
          className="hover:text-blue-600 transition flex items-center gap-1.5 text-slate-500"
        >
          <ArrowLeft className="w-4 h-4" /> Batal & Kembali ke Detail SO
        </button>
        <h3 className="text-md font-bold text-slate-900 flex items-center gap-2">
          <Truck className="w-5 h-5 text-blue-600" /> Buat Surat Jalan (DO) Baru
        </h3>
      </div>

      {errorMsg && (
        <div className="bg-rose-50 border border-rose-100 text-rose-600 text-xs px-3.5 py-2.5 rounded-xl flex items-start gap-2 font-semibold">
          <AlertCircle className="w-4.5 h-4.5 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs font-semibold">
        
        {/* Left column - Form details */}
        <div className="md:col-span-2 space-y-6">
          
          <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm space-y-4 card-shadow">
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Informasi Pengiriman
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              <div className="space-y-1">
                <label className="text-slate-500">Nomor Sales Order Asal</label>
                <input
                  type="text"
                  disabled
                  value={so?.so_number || ""}
                  className="w-full bg-slate-50 border border-slate-200 px-3.5 py-2.5 rounded-xl text-slate-500 cursor-not-allowed font-mono font-bold"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-500">Nomor Surat Jalan (DO)</label>
                <input
                  type="text"
                  required
                  value={doNumber}
                  onChange={(e) => setDoNumber(e.target.value)}
                  className="w-full bg-white border border-slate-200 px-3.5 py-2.5 rounded-xl text-slate-800 focus:outline-none focus:border-blue-500 shadow-sm font-mono font-bold"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-500">Nama Penerima Paket</label>
                <input
                  type="text"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  placeholder="e.g. Bapak Budi Santoso"
                  className="w-full bg-white border border-slate-200 px-3.5 py-2.5 rounded-xl text-slate-800 focus:outline-none focus:border-blue-500 shadow-sm"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-500">Nomor Resi / Kurir (Opsional)</label>
                <input
                  type="text"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  placeholder="e.g. JNE - 8820019200182"
                  className="w-full bg-white border border-slate-200 px-3.5 py-2.5 rounded-xl text-slate-800 focus:outline-none focus:border-blue-500 shadow-sm font-mono"
                />
              </div>

              {activeBusiness?.is_multi_warehouse_enabled && (
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-slate-500">Kirim dari Gudang (Sumber Stok)</label>
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

              <div className="sm:col-span-2 space-y-1">
                <label className="text-slate-500">Alamat Lengkap Pengiriman</label>
                <textarea
                  required
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  placeholder="Masukkan alamat lengkap pengantaran barang..."
                  rows={3}
                  className="w-full bg-white border border-slate-200 p-3 rounded-2xl focus:outline-none shadow-sm font-semibold text-slate-700"
                />
              </div>

            </div>
          </div>

          {/* Items Section */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden card-shadow">
            <div className="p-4 bg-slate-50 border-b border-slate-200">
              <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Kuantitas Pengiriman Item
              </h3>
            </div>
            
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider">
                  <th className="py-2.5 px-4">Nama Barang</th>
                  <th className="py-2.5 px-4 text-center">Qty Dipesan SO</th>
                  <th className="py-2.5 px-4 text-center w-36">Qty Dikirim DO</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-bold">
                {rows.map((row, index) => (
                  <tr key={index}>
                    <td className="py-3.5 px-4 text-slate-800">{row.name}</td>
                    <td className="py-3.5 px-4 text-center text-slate-500">
                      {row.quantityOrdered} {row.unit}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
                        <input
                          type="number"
                          required
                          min="0.001"
                          max={row.quantityOrdered}
                          step="any"
                          value={row.quantityShipped}
                          onChange={(e) => handleUpdateQty(index, Number(e.target.value))}
                          className="w-full px-2 py-1.5 text-center text-xs font-extrabold focus:outline-none"
                        />
                        <span className="text-[10px] font-bold text-slate-400 px-1.5 border-l border-slate-100">
                          {row.unit}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        </div>

        {/* Right column - Summary & Action buttons */}
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm space-y-4 card-shadow">
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Penyelesaian DO</h4>

            <div className="space-y-1">
              <label className="text-slate-500">Catatan Khusus Pengiriman (Ke Driver)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Taruh di pos satpam jika penerima tidak di tempat..."
                rows={4}
                className="w-full bg-white border border-slate-200 p-3 rounded-xl focus:outline-none"
              />
            </div>

            <div className="pt-2 flex flex-col gap-2">
              <button
                type="submit"
                disabled={saving}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-extrabold py-3 px-4 rounded-xl shadow-sm transition flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
              >
                {saving ? "Menyimpan DO..." : "Simpan Surat Jalan"}
              </button>
              <button
                type="button"
                onClick={() => router.push(`/sales/${soId}`)}
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

export default function NewDeliveryOrderPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center font-sans">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs text-slate-500 font-semibold mt-2">Memuat halaman Surat Jalan...</p>
      </div>
    }>
      <DeliveryOrderFormContent />
    </Suspense>
  );
}
