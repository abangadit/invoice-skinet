"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Truck,
  Plus,
  Search,
  Calendar,
  CheckCircle,
  Clock,
  AlertCircle,
  XCircle,
  Eye,
  User,
  ClipboardList
} from "lucide-react";
import { useBusiness } from "../../../lib/context/BusinessContext";
import { createWebBrowserClient } from "../../../lib/supabase/client";

interface DeliveryOrder {
  id: string;
  do_number: string;
  status: "draft" | "shipped" | "delivered" | "cancelled";
  shipped_date: string | null;
  recipient_name: string | null;
  tracking_number: string | null;
  sales_orders: {
    so_number: string;
    customers: {
      name: string;
    } | null;
  } | null;
}

export default function DeliveryOrdersPage() {
  const { activeBusiness } = useBusiness();
  const [dos, setDos] = useState<DeliveryOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const fetchDOs = async () => {
    if (!activeBusiness) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const supabase = createWebBrowserClient();

      const { data, error } = await supabase
        .from("delivery_orders")
        .select(`
          id,
          do_number,
          status,
          shipped_date,
          recipient_name,
          tracking_number,
          sales_orders (
            so_number,
            customers (
              name
            )
          )
        `)
        .eq("business_id", activeBusiness.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const formatted = (data || []).map((d: any) => {
        let salesOrderData = null;
        if (d.sales_orders) {
          const so = d.sales_orders;
          salesOrderData = {
            so_number: so.so_number,
            customers: Array.isArray(so.customers) ? so.customers[0] : (so.customers || null)
          };
        }
        return {
          id: d.id,
          do_number: d.do_number,
          status: d.status,
          shipped_date: d.shipped_date,
          recipient_name: d.recipient_name,
          tracking_number: d.tracking_number,
          sales_orders: salesOrderData
        };
      });

      setDos(formatted);
    } catch (err) {
      console.error("Error fetching delivery orders:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDOs();
  }, [activeBusiness]);

  const filteredDOs = dos.filter((d) => {
    const custName = d.sales_orders?.customers?.name || "";
    const matchesSearch =
      d.do_number.toLowerCase().includes(search.toLowerCase()) ||
      (d.sales_orders?.so_number || "").toLowerCase().includes(search.toLowerCase()) ||
      custName.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = statusFilter === "all" || d.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "delivered":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-100">
            <CheckCircle className="w-3 h-3" /> Diterima
          </span>
        );
      case "shipped":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-600 border border-amber-100">
            <Truck className="w-3 h-3" /> Dikirim
          </span>
        );
      case "cancelled":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-600 border border-rose-100">
            <XCircle className="w-3 h-3" /> Dibatalkan
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
            <AlertCircle className="w-3 h-3" /> Draft
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            Surat Jalan (Delivery Order)
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">Kelola logistik pengiriman barang ke pelanggan Anda.</p>
        </div>
      </div>

      {/* Filter Status & Search */}
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {[
            { key: "all", label: "Semua DO" },
            { key: "draft", label: "Draft" },
            { key: "shipped", label: "Dikirim (Shipped)" },
            { key: "delivered", label: "Diterima (Delivered)" },
            { key: "cancelled", label: "Dibatalkan" }
          ].map((pill) => (
            <button
              key={pill.key}
              onClick={() => setStatusFilter(pill.key)}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition border ${
                statusFilter === pill.key
                  ? "bg-blue-600 border-blue-600 text-white shadow-sm"
                  : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {pill.label}
            </button>
          ))}
        </div>

        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nomor Surat Jalan, nomor SO, atau nama pelanggan..."
            className="w-full bg-white border border-slate-200 pl-10 pr-4 py-2.5 rounded-xl text-sm placeholder-slate-400 focus:outline-none focus:border-blue-500 transition shadow-sm"
          />
        </div>
      </div>

      {/* DO List Table */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs text-slate-500 font-semibold mt-2">Memuat daftar Surat Jalan...</p>
        </div>
      ) : filteredDOs.length > 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden card-shadow">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                  <th className="py-3.5 px-4">Nomor DO</th>
                  <th className="py-3.5 px-4">Nomor SO Asal</th>
                  <th className="py-3.5 px-4">Nama Pelanggan</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Tanggal Kirim</th>
                  <th className="py-3.5 px-4">Penerima / Tracking</th>
                  <th className="py-3.5 px-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredDOs.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50 transition">
                    <td className="py-4 px-4 font-mono font-bold text-slate-800">
                      {d.do_number}
                    </td>
                    <td className="py-4 px-4 font-mono font-semibold text-slate-500">
                      {d.sales_orders?.so_number || "-"}
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <span className="font-semibold text-slate-900">
                          {d.sales_orders?.customers?.name || "Pelanggan Umum"}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      {getStatusBadge(d.status)}
                    </td>
                    <td className="py-4 px-4 flex items-center gap-1.5 font-medium mt-1">
                      {d.shipped_date ? (
                        <>
                          <Calendar className="w-3.5 h-3.5 text-slate-400" /> 
                          {new Date(d.shipped_date).toLocaleDateString("id-ID")}
                        </>
                      ) : "-"}
                    </td>
                    <td className="py-4 px-4 font-medium">
                      {d.recipient_name && <span>{d.recipient_name}</span>}
                      {d.tracking_number && (
                        <span className="block text-[10px] text-slate-400 font-mono">
                          Resi: {d.tracking_number}
                        </span>
                      )}
                      {!d.recipient_name && !d.tracking_number && "-"}
                    </td>
                    <td className="py-4 px-4 text-center">
                      <Link
                        href={`/delivery/${d.id}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition font-bold"
                      >
                        <Eye className="w-3.5 h-3.5" /> Detail DO
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-400 shadow-sm">
          <ClipboardList className="w-12 h-12 mx-auto text-slate-200 mb-3" />
          <p className="text-sm font-semibold">Tidak ada Surat Jalan ditemukan</p>
          <p className="text-xs text-slate-450 mt-1">
            Silakan buat Surat Jalan (DO) baru dari halaman detail Sales Order yang telah dikonfirmasi.
          </p>
          <Link
            href="/sales"
            className="text-xs font-bold text-blue-600 hover:underline mt-2 inline-block"
          >
            Lihat Sales Order
          </Link>
        </div>
      )}

    </div>
  );
}
