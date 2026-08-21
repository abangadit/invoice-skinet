"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { 
  ClipboardCheck, 
  Plus, 
  Search, 
  Calendar, 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  XCircle, 
  Eye, 
  User 
} from "lucide-react";
import { useBusiness } from "../../../lib/context/BusinessContext";
import { createWebBrowserClient } from "../../../lib/supabase/client";

interface SalesOrder {
  id: string;
  so_number: string;
  status: "draft" | "confirmed" | "processing" | "completed" | "cancelled";
  order_date: string;
  expected_delivery_date: string | null;
  total_amount: number;
  currency: string;
  customers: {
    name: string;
  } | null;
}

export default function SalesPage() {
  const { activeBusiness } = useBusiness();
  const [sos, setSos] = useState<SalesOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const fetchSOs = async () => {
    if (!activeBusiness) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const supabase = createWebBrowserClient();

      const { data, error } = await supabase
        .from("sales_orders")
        .select(`
          id,
          so_number,
          status,
          order_date,
          expected_delivery_date,
          total_amount,
          currency,
          customers (
            name
          )
        `)
        .eq("business_id", activeBusiness.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      const formatted = (data || []).map((so: any) => ({
        id: so.id,
        so_number: so.so_number,
        status: so.status,
        order_date: so.order_date,
        expected_delivery_date: so.expected_delivery_date,
        total_amount: Number(so.total_amount || 0),
        currency: so.currency,
        customers: Array.isArray(so.customers) ? so.customers[0] : (so.customers || null)
      }));

      setSos(formatted);
    } catch (err) {
      console.error("Error fetching sales orders:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSOs();
  }, [activeBusiness]);

  const formatCurrency = (val: number, curr?: string) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: curr || activeBusiness?.default_currency || "IDR",
      maximumFractionDigits: 0
    }).format(val);
  };

  const filteredSOs = sos.filter((so) => {
    const matchesSearch = 
      so.so_number.toLowerCase().includes(search.toLowerCase()) ||
      (so.customers && so.customers.name.toLowerCase().includes(search.toLowerCase()));
    
    const matchesStatus = statusFilter === "all" || so.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-100">
            <CheckCircle className="w-3 h-3" /> Selesai
          </span>
        );
      case "confirmed":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-600 border border-blue-100">
            <CheckCircle className="w-3 h-3" /> Dikonfirmasi
          </span>
        );
      case "processing":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-600 border border-indigo-100">
            <Clock className="w-3 h-3" /> Diproses
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
            Pesanan Penjualan (Sales Order)
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">Pantau pesanan penjualan barang/jasa masuk dari pelanggan Anda.</p>
        </div>
        <Link
          href="/sales/new"
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 px-4 rounded-xl text-sm flex items-center justify-center gap-1.5 shadow-sm transition shrink-0 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" /> Buat Sales Order
        </Link>
      </div>

      {/* Filter Status Pills & Search */}
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {[
            { key: "all", label: "Semua SO" },
            { key: "draft", label: "Draft" },
            { key: "confirmed", label: "Dikonfirmasi" },
            { key: "processing", label: "Diproses" },
            { key: "completed", label: "Selesai" },
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
            placeholder="Cari nomor SO atau nama pelanggan..."
            className="w-full bg-white border border-slate-200 pl-10 pr-4 py-2.5 rounded-xl text-sm placeholder-slate-400 focus:outline-none focus:border-blue-500 transition shadow-sm"
          />
        </div>
      </div>

      {/* SO List Table */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs text-slate-500 font-semibold mt-2">Memuat daftar SO...</p>
        </div>
      ) : filteredSOs.length > 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden card-shadow">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                  <th className="py-3.5 px-4">Nomor SO</th>
                  <th className="py-3.5 px-4">Nama Pelanggan</th>
                  <th className="py-3.5 px-4">Tanggal Order</th>
                  <th className="py-3.5 px-4">Estimasi Kirim</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Total Nilai</th>
                  <th className="py-3.5 px-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredSOs.map((so) => (
                  <tr key={so.id} className="hover:bg-slate-50 transition">
                    <td className="py-4 px-4 font-mono font-bold text-slate-800">
                      {so.so_number}
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <span className="font-semibold text-slate-900">{so.customers?.name || "Pelanggan Umum"}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4 flex items-center gap-1.5 font-medium mt-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" /> {so.order_date}
                    </td>
                    <td className="py-4 px-4 font-medium">
                      {so.expected_delivery_date || "-"}
                    </td>
                    <td className="py-4 px-4">
                      {getStatusBadge(so.status)}
                    </td>
                    <td className="py-4 px-4 text-right font-extrabold text-slate-900">
                      {formatCurrency(so.total_amount, so.currency)}
                    </td>
                    <td className="py-4 px-4 text-center">
                      <Link
                        href={`/sales/${so.id}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition font-bold"
                      >
                        <Eye className="w-3.5 h-3.5" /> Detail SO
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
          <ClipboardCheck className="w-12 h-12 mx-auto text-slate-200 mb-3" />
          <p className="text-sm font-semibold">Tidak ada Sales Order ditemukan</p>
          <Link 
            href="/sales/new"
            className="text-xs font-bold text-blue-600 hover:underline mt-1 inline-block"
          >
            Buat Sales Order Pertama Anda
          </Link>
        </div>
      )}

    </div>
  );
}
