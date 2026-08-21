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
   Building2 
 } from "lucide-react";
 import { useBusiness } from "../../../lib/context/BusinessContext";
 import { createWebBrowserClient } from "../../../lib/supabase/client";
 import { useLanguage } from "../../../lib/context/LanguageContext";
 
 interface PurchaseOrder {
   id: string;
   po_number: string;
   status: "draft" | "sent" | "received" | "cancelled";
   issue_date: string;
   expected_delivery_date: string | null;
   total_amount: number;
   currency: string;
   vendors: {
     name: string;
   } | null;
 }
 
 export default function PurchasePage() {
   const { activeBusiness } = useBusiness();
   const { locale, t } = useLanguage();
   const [pos, setPos] = useState<PurchaseOrder[]>([]);
   const [loading, setLoading] = useState(true);
   const [search, setSearch] = useState("");
   const [statusFilter, setStatusFilter] = useState<string>("all");
 
   const fetchPOs = async () => {
     if (!activeBusiness) {
       setLoading(false);
       return;
     }
     try {
       setLoading(true);
       const supabase = createWebBrowserClient();
 
       const { data, error } = await supabase
         .from("purchase_orders")
         .select(`
           id,
           po_number,
           status,
           issue_date,
           expected_delivery_date,
           total_amount,
           currency,
           vendors (
             name
           )
         `)
         .eq("business_id", activeBusiness.id)
         .order("created_at", { ascending: false });
 
       if (error) throw error;
       
       const formatted = (data || []).map((po: any) => ({
         id: po.id,
         po_number: po.po_number,
         status: po.status,
         issue_date: po.issue_date,
         expected_delivery_date: po.expected_delivery_date,
         total_amount: po.total_amount,
         currency: po.currency,
         vendors: Array.isArray(po.vendors) ? po.vendors[0] : (po.vendors || null)
       }));
       
       setPos(formatted);
     } catch (err) {
       console.error("Error fetching purchase orders:", err);
     } finally {
       setLoading(false);
     }
   };
 
   useEffect(() => {
     fetchPOs();
   }, [activeBusiness]);
 
   const formatCurrency = (val: number, curr?: string) => {
     return new Intl.NumberFormat("id-ID", {
       style: "currency",
       currency: curr || activeBusiness?.default_currency || "IDR",
       maximumFractionDigits: 0
     }).format(val);
   };
 
   const filteredPOs = pos.filter((po) => {
     const matchesSearch = 
       po.po_number.toLowerCase().includes(search.toLowerCase()) ||
       (po.vendors && po.vendors.name.toLowerCase().includes(search.toLowerCase()));
     
     const matchesStatus = statusFilter === "all" || po.status === statusFilter;
     
     return matchesSearch && matchesStatus;
   });
 
   const getStatusBadge = (status: string) => {
     switch (status) {
       case "received":
         return (
           <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-100">
             <CheckCircle className="w-3 h-3" /> Diterima
           </span>
         );
       case "sent":
         return (
           <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-600 border border-blue-100">
             <Clock className="w-3 h-3" /> Dikirim
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
             Pembelian (Purchase Order)
           </h2>
           <p className="text-sm text-slate-500 mt-0.5">Pantau pesanan pembelian material/stok ke pemasok (vendor) Anda.</p>
         </div>
         <Link
           href="/purchase/new"
           className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 px-4 rounded-xl text-sm flex items-center justify-center gap-1.5 shadow-sm transition shrink-0 self-start sm:self-auto"
         >
           <Plus className="w-4 h-4" /> Buat PO Baru
         </Link>
       </div>
 
       {/* Filter Pills & Search */}
       <div className="space-y-4">
         <div className="flex flex-wrap gap-2">
           {[
             { key: "all", label: "Semua PO" },
             { key: "draft", label: "Draft" },
             { key: "sent", label: "Dikirim" },
             { key: "received", label: "Diterima" },
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
             placeholder="Cari nomor PO atau nama pemasok..."
             className="w-full bg-white border border-slate-200 pl-10 pr-4 py-2.5 rounded-xl text-sm placeholder-slate-400 focus:outline-none focus:border-blue-500 transition shadow-sm"
           />
         </div>
       </div>
 
       {/* PO List */}
       {loading ? (
         <div className="flex flex-col items-center justify-center py-20">
           <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
           <p className="text-xs text-slate-500 font-semibold mt-2">Memuat daftar PO...</p>
         </div>
       ) : filteredPOs.length > 0 ? (
         <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden card-shadow">
           <div className="overflow-x-auto">
             <table className="w-full text-xs text-left">
               <thead>
                 <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                   <th className="py-3.5 px-4">Nomor PO</th>
                   <th className="py-3.5 px-4">Pemasok (Vendor)</th>
                   <th className="py-3.5 px-4">Tanggal Terbit</th>
                   <th className="py-3.5 px-4">Estimasi Kirim</th>
                   <th className="py-3.5 px-4">Status</th>
                   <th className="py-3.5 px-4 text-right">Total Nilai</th>
                   <th className="py-3.5 px-4 text-center">Aksi</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-100 text-slate-700">
                 {filteredPOs.map((po) => (
                   <tr key={po.id} className="hover:bg-slate-50 transition">
                     <td className="py-4 px-4 font-mono font-bold text-slate-800">
                       {po.po_number}
                     </td>
                     <td className="py-4 px-4">
                       <div className="flex items-center gap-2">
                         <Building2 className="w-3.5 h-3.5 text-slate-400" />
                         <span className="font-semibold text-slate-900">{po.vendors?.name || "Vendor Dihapus"}</span>
                       </div>
                     </td>
                     <td className="py-4 px-4 flex items-center gap-1.5 font-medium mt-1">
                       <Calendar className="w-3.5 h-3.5 text-slate-400" /> {po.issue_date}
                     </td>
                     <td className="py-4 px-4 font-medium">
                       {po.expected_delivery_date || "-"}
                     </td>
                     <td className="py-4 px-4">
                       {getStatusBadge(po.status)}
                     </td>
                     <td className="py-4 px-4 text-right font-extrabold text-slate-900">
                       {formatCurrency(po.total_amount, po.currency)}
                     </td>
                     <td className="py-4 px-4 text-center">
                       <Link
                         href={`/purchase/${po.id}`}
                         className="inline-flex items-center gap-1 px-2.5 py-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition font-bold"
                       >
                         <Eye className="w-3.5 h-3.5" /> Detail
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
           <Truck className="w-12 h-12 mx-auto text-slate-200 mb-3" />
           <p className="text-sm font-semibold">Tidak ada Purchase Order ditemukan</p>
           <Link 
             href="/purchase/new"
             className="text-xs font-bold text-blue-600 hover:underline mt-1 inline-block"
           >
             Buat PO Pertama Anda
           </Link>
         </div>
       )}
 
     </div>
   );
 }
 
