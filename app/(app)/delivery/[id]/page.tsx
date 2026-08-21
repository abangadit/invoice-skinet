"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Truck,
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle,
  Printer,
  FileText,
  User,
  MapPin,
  ClipboardList
} from "lucide-react";
import { useBusiness } from "../../../../lib/context/BusinessContext";
import { createWebBrowserClient } from "../../../../lib/supabase/client";

interface DOItem {
  id: string;
  name: string;
  quantity_ordered: number;
  quantity_shipped: number;
  unit: string;
}

interface DODetail {
  id: string;
  do_number: string;
  status: "draft" | "shipped" | "delivered" | "cancelled";
  shipped_date: string | null;
  delivered_date: string | null;
  recipient_name: string | null;
  delivery_address: string;
  tracking_number: string | null;
  notes: string | null;
  created_at: string;
  warehouse_id?: string | null;
  warehouses?: {
    name: string;
  } | null;
  sales_orders: {
    id: string;
    so_number: string;
    order_date: string;
    customers: {
      name: string;
      phone: string | null;
      email: string | null;
    } | null;
  } | null;
}

export default function DeliveryOrderDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { activeBusiness } = useBusiness();

  const [dOrder, setDOrder] = useState<DODetail | null>(null);
  const [items, setItems] = useState<DOItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const fetchDODetails = async () => {
    if (!activeBusiness || !params?.id) return;
    try {
      setLoading(true);
      setErrorMsg("");
      const supabase = createWebBrowserClient();

      // 1. Fetch DO Header
      const { data: doData, error: doError } = await supabase
        .from("delivery_orders")
        .select(`
          *,
          sales_orders (
            id,
            so_number,
            order_date,
            customers (
              name,
              phone,
              email
            )
          ),
          warehouses (
            name
          )
        `)
        .eq("id", params.id)
        .eq("business_id", activeBusiness.id)
        .single();

      if (doError) throw doError;

      const formattedDO: DODetail = {
        ...doData,
        sales_orders: doData.sales_orders ? {
          ...doData.sales_orders,
          customers: Array.isArray(doData.sales_orders.customers)
            ? doData.sales_orders.customers[0]
            : doData.sales_orders.customers
        } : null
      };
      setDOrder(formattedDO);

      // 2. Fetch DO Line Items
      const { data: itemsData, error: itemsError } = await supabase
        .from("delivery_order_items")
        .select("*")
        .eq("do_id", params.id);

      if (itemsError) throw itemsError;
      setItems(itemsData || []);

    } catch (err: any) {
      console.error("Error loading DO details:", err);
      setErrorMsg(err.message || "Gagal memuat detail Surat Jalan.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDODetails();
  }, [activeBusiness, params?.id]);

  const handleShipItems = async () => {
    if (!dOrder) return;
    if (!confirm("Apakah Anda yakin ingin mengirimkan barang? Ini akan memotong stok di gudang dan mencatat jurnal HPP secara otomatis.")) return;

    try {
      setActionLoading(true);
      const supabase = createWebBrowserClient();

      const { error } = await supabase
        .from("delivery_orders")
        .update({
          status: "shipped",
          shipped_date: new Date().toISOString()
        })
        .eq("id", dOrder.id);

      if (error) throw error;

      alert("Barang berhasil ditandai sebagai dikirim (Shipped)!");
      fetchDODetails();
    } catch (err: any) {
      console.error("Error shipping DO:", err);
      alert(err.message || "Gagal memproses pengiriman Surat Jalan.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeliverItems = async () => {
    if (!dOrder) return;
    if (!confirm("Konfirmasi bahwa barang telah diterima dengan sukses oleh pelanggan?")) return;

    try {
      setActionLoading(true);
      const supabase = createWebBrowserClient();

      const { error } = await supabase
        .from("delivery_orders")
        .update({
          status: "delivered",
          delivered_date: new Date().toISOString()
        })
        .eq("id", dOrder.id);

      if (error) throw error;

      alert("Surat Jalan berhasil ditandai sebagai diterima (Delivered)!");
      fetchDODetails();
    } catch (err: any) {
      console.error("Error delivering DO:", err);
      alert(err.message || "Gagal memproses penerimaan Surat Jalan.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelDO = async () => {
    if (!dOrder) return;
    const msg = dOrder.status === "shipped"
      ? "Membatalkan DO yang sudah dikirim akan mengembalikan stok gudang dan membatalkan jurnal HPP terkait. Apakah Anda yakin?"
      : "Apakah Anda yakin ingin membatalkan Surat Jalan ini?";
    
    if (!confirm(msg)) return;

    try {
      setActionLoading(true);
      const supabase = createWebBrowserClient();

      const { error } = await supabase
        .from("delivery_orders")
        .update({ status: "cancelled" })
        .eq("id", dOrder.id);

      if (error) throw error;

      alert("Surat Jalan berhasil dibatalkan!");
      fetchDODetails();
    } catch (err: any) {
      console.error("Error cancelling DO:", err);
      alert(err.message || "Gagal membatalkan Surat Jalan.");
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "delivered":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-600 border border-emerald-100">
            <CheckCircle className="w-3.5 h-3.5" /> Diterima
          </span>
        );
      case "shipped":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-600 border border-amber-100">
            <Truck className="w-3.5 h-3.5" /> Dikirim
          </span>
        );
      case "cancelled":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-600 border border-rose-100">
            <XCircle className="w-3.5 h-3.5" /> Dibatalkan
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">
            <AlertCircle className="w-3.5 h-3.5" /> Draft
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs text-slate-500 font-semibold mt-2">Memuat detail Surat Jalan...</p>
      </div>
    );
  }

  if (errorMsg || !dOrder) {
    return (
      <div className="bg-rose-50 border border-rose-100 text-rose-600 text-xs px-4 py-3 rounded-2xl max-w-xl mx-auto mt-10 space-y-3 font-semibold">
        <div className="flex items-center gap-2 font-bold">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>Error Terjadi</span>
        </div>
        <p>{errorMsg || "Surat Jalan tidak ditemukan."}</p>
        <button onClick={() => router.push("/delivery")} className="text-blue-600 hover:underline font-bold">
          Kembali ke Daftar Surat Jalan
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      
      {/* Top Navigation Bar - Hidden on print */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4 text-xs font-semibold print:hidden">
        <button
          onClick={() => router.push("/delivery")}
          className="hover:text-blue-600 transition flex items-center gap-1.5 text-slate-500"
        >
          <ArrowLeft className="w-4 h-4" /> Kembali ke Daftar Surat Jalan
        </button>
        
        <div className="flex items-center gap-2">
          {getStatusBadge(dOrder.status)}
        </div>
      </div>

      {/* Main Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-xs font-semibold">
        
        {/* Left Side: Delivery Details & Items */}
        <div className="lg:col-span-2 space-y-6 print:col-span-3">
          
          {/* Printable Surat Jalan Panel */}
          <div className="bg-white border border-slate-200 p-8 rounded-2xl shadow-sm space-y-6 card-shadow print:border-0 print:shadow-none print:p-0">
            
            {/* Header info */}
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 pb-6 border-b border-slate-100">
              <div>
                <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  {activeBusiness?.name || "invoice.co.id"}
                </h1>
                {activeBusiness?.address && (
                  <p className="text-slate-500 font-medium max-w-xs mt-1 text-[11px] leading-relaxed">
                    {activeBusiness.address}
                  </p>
                )}
                {activeBusiness?.phone && (
                  <p className="text-slate-400 text-[10px] mt-0.5">Telp: {activeBusiness.phone}</p>
                )}
              </div>

              <div className="sm:text-right">
                <span className="text-[10px] font-extrabold text-blue-600 uppercase tracking-widest bg-blue-50 px-2 py-0.5 rounded print:hidden">
                  Surat Jalan / Delivery Order
                </span>
                <h2 className="text-md font-mono font-extrabold text-slate-900 mt-2">
                  {dOrder.do_number}
                </h2>
                <p className="text-slate-400 font-medium text-[10px] mt-0.5">
                  Tanggal Cetak: {new Date().toLocaleDateString("id-ID")}
                </p>
              </div>
            </div>

            {/* Shipping details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pb-6">
              
              <div className="space-y-1.5">
                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Tujuan Pengiriman</span>
                <p className="text-slate-800 font-extrabold text-sm">{dOrder.recipient_name || "Pelanggan Umum"}</p>
                
                {dOrder.sales_orders?.customers?.phone && (
                  <p className="text-slate-500 font-medium">WA: {dOrder.sales_orders.customers.phone}</p>
                )}
                
                <p className="text-slate-650 font-medium mt-1 flex items-start gap-1 leading-relaxed">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5 print:hidden" /> {dOrder.delivery_address}
                </p>
              </div>

              <div className="space-y-2 text-[11px] font-medium text-slate-600 bg-slate-50 p-4 rounded-xl border border-slate-100 print:bg-transparent print:border-0 print:p-0">
                <div className="flex justify-between">
                  <span className="text-slate-450">Referensi SO:</span>
                  <span className="font-mono font-bold text-slate-800">
                    {dOrder.sales_orders?.so_number || "-"}
                  </span>
                </div>
                {dOrder.sales_orders?.order_date && (
                  <div className="flex justify-between">
                    <span className="text-slate-450">Tanggal SO:</span>
                    <span className="text-slate-800">{dOrder.sales_orders.order_date}</span>
                  </div>
                )}
                {dOrder.tracking_number && (
                  <div className="flex justify-between">
                    <span className="text-slate-450">Kurir & No. Resi:</span>
                    <span className="text-slate-800 font-mono font-bold">{dOrder.tracking_number}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-450">Status DO:</span>
                  <span className="capitalize font-bold text-blue-650">{dOrder.status}</span>
                </div>
                {activeBusiness?.is_multi_warehouse_enabled && dOrder.warehouses?.name && (
                  <div className="flex justify-between border-t border-slate-100 pt-2 mt-2">
                    <span className="text-slate-450 font-bold">Gudang Sumber:</span>
                    <span className="font-bold text-blue-600">{dOrder.warehouses.name}</span>
                  </div>
                )}
              </div>

            </div>

            {/* Line items Table */}
            <div className="border border-slate-200 rounded-xl overflow-hidden print:border-slate-300">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider print:bg-slate-100">
                    <th className="py-2.5 px-4 w-12 text-center">No</th>
                    <th className="py-2.5 px-4">Nama Barang</th>
                    <th className="py-2.5 px-4 text-center w-36">Jumlah Dipesan</th>
                    <th className="py-2.5 px-4 text-center w-36 bg-blue-50/30 print:bg-transparent">Jumlah Dikirim</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700 font-semibold print:divide-slate-200">
                  {items.map((item, idx) => (
                    <tr key={item.id}>
                      <td className="py-3 px-4 text-center text-slate-400 font-medium">{idx + 1}</td>
                      <td className="py-3 px-4 font-bold text-slate-800">{item.name}</td>
                      <td className="py-3 px-4 text-center text-slate-500 font-medium">
                        {item.quantity_ordered} {item.unit}
                      </td>
                      <td className="py-3 px-4 text-center text-blue-700 bg-blue-50/10 font-extrabold text-sm print:bg-transparent print:text-black">
                        {item.quantity_shipped} {item.unit}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* DO Notes */}
            {dOrder.notes && (
              <div className="pt-2">
                <span className="text-[9px] text-slate-450 font-bold uppercase tracking-wider">Catatan Pengiriman:</span>
                <p className="text-slate-600 font-medium leading-relaxed bg-slate-50/50 p-3 rounded-lg border border-slate-100 mt-1 print:border-0 print:p-0">
                  {dOrder.notes}
                </p>
              </div>
            )}

            {/* Signature Block for Print */}
            <div className="pt-10 grid grid-cols-3 gap-6 text-center text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              <div>
                <p>Penerima / Customer</p>
                <div className="h-16"></div>
                <p className="border-t border-slate-300 pt-1.5 mx-4 font-semibold text-slate-700">
                  {dOrder.recipient_name || "Nama Jelas & Cap"}
                </p>
              </div>
              <div>
                <p>Kurir / Driver</p>
                <div className="h-16"></div>
                <p className="border-t border-slate-300 pt-1.5 mx-4 font-semibold text-slate-700">
                  Nama Jelas
                </p>
              </div>
              <div>
                <p>Hormat Kami / Gudang</p>
                <div className="h-16"></div>
                <p className="border-t border-slate-300 pt-1.5 mx-4 font-semibold text-slate-700">
                  {activeBusiness?.name || "invoice.co.id"}
                </p>
              </div>
            </div>

          </div>
        </div>

        {/* Right Side: Operations Panel */}
        <div className="space-y-6 print:hidden">
          
          <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm space-y-4 card-shadow">
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Operasi Surat Jalan</h4>

            <div className="space-y-2.5">
              
              <button
                onClick={() => window.print()}
                className="w-full bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-extrabold py-2.5 px-4 rounded-xl shadow-sm transition flex items-center justify-center gap-1.5 active:scale-95"
              >
                <Printer className="w-4.5 h-4.5" /> Cetak Surat Jalan (PDF)
              </button>

              {dOrder.status === "draft" && (
                <button
                  onClick={handleShipItems}
                  disabled={actionLoading}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-extrabold py-3 px-4 rounded-xl shadow-sm transition flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
                >
                  <Truck className="w-4 h-4" /> Kirim Barang (Ship)
                </button>
              )}

              {dOrder.status === "shipped" && (
                <button
                  onClick={handleDeliverItems}
                  disabled={actionLoading}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-3 px-4 rounded-xl shadow-sm transition flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
                >
                  <CheckCircle className="w-4 h-4" /> Konfirmasi Diterima (Deliver)
                </button>
              )}

              {dOrder.status !== "cancelled" && dOrder.status !== "delivered" && (
                <button
                  onClick={handleCancelDO}
                  disabled={actionLoading}
                  className="w-full bg-white border border-rose-100 hover:bg-rose-50 text-rose-600 font-bold py-2.5 px-4 rounded-xl transition"
                >
                  Batalkan Surat Jalan
                </button>
              )}
            </div>
          </div>

          {/* Reference Document Information */}
          {dOrder.sales_orders && (
            <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm space-y-4 card-shadow">
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Referensi SO</h4>
              
              <div className="space-y-1.5 text-[11px] text-slate-550 font-medium">
                <div className="flex justify-between">
                  <span>Nomor SO:</span>
                  <Link href={`/sales/${dOrder.sales_orders.id}`} className="text-blue-600 hover:underline font-bold font-mono">
                    {dOrder.sales_orders.so_number}
                  </Link>
                </div>
                <div className="flex justify-between">
                  <span>Tanggal SO:</span>
                  <span className="text-slate-800 font-semibold">{dOrder.sales_orders.order_date}</span>
                </div>
              </div>
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
