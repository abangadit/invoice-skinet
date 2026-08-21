"use client";
 
 import React, { useEffect, useState } from "react";
 import { useRouter, useParams } from "next/navigation";
 import { 
   Truck, 
   ArrowLeft, 
   Building2, 
   Package, 
   Calendar, 
   CheckCircle, 
   Clock, 
   AlertCircle, 
   XCircle, 
   Download, 
   FileText,
   Check,
   X
 } from "lucide-react";
 import { useBusiness } from "../../../../lib/context/BusinessContext";
 import { createWebBrowserClient } from "../../../../lib/supabase/client";
 import { useLanguage } from "../../../../lib/context/LanguageContext";
 
 interface POItem {
   id: string;
   item_id: string | null;
   name: string;
   quantity: number;
   unit: string;
   unit_cost: number;
   subtotal: number;
 }
 
 interface PODetail {
   id: string;
   po_number: string;
   status: "draft" | "sent" | "received" | "cancelled";
   issue_date: string;
   expected_delivery_date: string | null;
   subtotal: number;
   tax_amount: number;
   total_amount: number;
   notes: string | null;
   currency: string;
   vendor_snapshot: any;
   vendor_id: string | null;
   business_id: string;
 }
 
 export default function PODetailPage() {
   const { activeBusiness } = useBusiness();
   const { locale, t } = useLanguage();
   const params = useParams();
   const router = useRouter();
   
   const [po, setPo] = useState<PODetail | null>(null);
   const [items, setItems] = useState<POItem[]>([]);
   const [loading, setLoading] = useState(true);
   const [updating, setUpdating] = useState(false);
   const [warehouses, setWarehouses] = useState<any[]>([]);
   const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>("");
   const [showReceiveModal, setShowReceiveModal] = useState(false);

   useEffect(() => {
     const fetchWarehouses = async () => {
       if (!activeBusiness?.is_multi_warehouse_enabled) return;
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
           setSelectedWarehouseId(data[0].id);
         }
       } catch (err) {
         console.error("Error loading warehouses:", err);
       }
     };
     
     fetchWarehouses();
   }, [activeBusiness]);
 
   const fetchPODetails = async () => {
     if (!params.id) return;
     try {
       setLoading(true);
       const supabase = createWebBrowserClient();
 
       // Fetch PO Header
       const { data: poData, error: poError } = await supabase
         .from("purchase_orders")
         .select("*")
         .eq("id", params.id)
         .single();
 
       if (poError || !poData) {
         console.error("Error fetching PO header:", poError);
         setLoading(false);
         return;
       }
 
       setPo(poData);
 
       // Fetch PO Items
       const { data: itemsData, error: itemsError } = await supabase
         .from("purchase_order_items")
         .select("*")
         .eq("po_id", params.id);
 
       if (itemsError) throw itemsError;
       setItems(itemsData || []);
     } catch (err) {
       console.error("Error loading PO details:", err);
     } finally {
       setLoading(false);
     }
   };
 
   useEffect(() => {
     fetchPODetails();
   }, [params.id]);
 
   const handleUpdateStatus = async (newStatus: "sent" | "cancelled") => {
     if (!po) return;
     try {
       setUpdating(true);
       const supabase = createWebBrowserClient();
 
       const { error } = await supabase
         .from("purchase_orders")
         .update({ status: newStatus })
         .eq("id", po.id);
 
       if (error) throw error;
       
       alert(`Status PO berhasil diubah menjadi: ${newStatus === "sent" ? "Dikirim (Sent)" : "Dibatalkan"}`);
       fetchPODetails();
     } catch (err) {
       console.error("Error updating PO status:", err);
       alert("Gagal mengubah status PO.");
     } finally {
       setUpdating(false);
     }
   };
 
   const handleReceiveGoods = async (targetWarehouseId?: string) => {
     if (!po) return;
     
     const confirmMsg = targetWarehouseId 
       ? "Apakah Anda yakin telah menerima semua barang pesanan ini secara fisik?"
       : "Apakah Anda yakin telah menerima semua barang pesanan ini secara fisik? Tindakan ini akan menambah stok gudang secara real-time.";
       
     if (!confirm(confirmMsg)) return;
 
     try {
       setUpdating(true);
       const supabase = createWebBrowserClient();
 
       // 1. Update PO status to received
       const { error: poError } = await supabase
         .from("purchase_orders")
         .update({ status: "received" })
         .eq("id", po.id);
 
       if (poError) throw poError;
 
       // 2. Insert stock movements for items linked to catalog items
       const stockPayloads = items
         .filter(item => item.item_id !== null)
         .map(item => ({
           business_id: po.business_id,
           item_id: item.item_id,
           type: "in_purchase",
           quantity: item.quantity,
           unit_cost: item.unit_cost,
           reference_id: po.id,
           notes: `Diterima dari PO #${po.po_number}`,
           warehouse_id: targetWarehouseId || null
         }));
 
       if (stockPayloads.length > 0) {
         const { error: stockError } = await supabase
           .from("stock_movements")
           .insert(stockPayloads);
 
         if (stockError) throw stockError;
       }
 
       alert("Penerimaan barang berhasil dikonfirmasi! Stok gudang telah ter-update otomatis.");
       setShowReceiveModal(false);
       fetchPODetails();
     } catch (err) {
       console.error("Error receiving PO goods:", err);
       alert("Gagal memproses penerimaan barang.");
     } finally {
       setUpdating(false);
     }
   };
 
   const formatCurrency = (val: number, curr?: string) => {
     return new Intl.NumberFormat("id-ID", {
       style: "currency",
       currency: curr || po?.currency || "IDR",
       maximumFractionDigits: 0
     }).format(val);
   };
 
   const getStatusBadge = (status: string) => {
     switch (status) {
       case "received":
         return (
           <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-600 border border-emerald-100">
             <CheckCircle className="w-3.5 h-3.5" /> Diterima (Received)
           </span>
         );
       case "sent":
         return (
           <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-600 border border-blue-100">
             <Clock className="w-3.5 h-3.5 animate-pulse" /> Dikirim (Sent)
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
       <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center font-sans">
         <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
         <p className="text-xs text-slate-500 font-semibold mt-2">Memuat rincian PO...</p>
       </div>
     );
   }
 
   if (!po) {
     return (
       <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center font-sans text-center p-4">
         <div className="max-w-md bg-white border border-slate-200 rounded-2xl p-8 shadow-sm space-y-3">
           <AlertCircle className="w-12 h-12 text-slate-300 mx-auto" />
           <h3 className="text-lg font-bold text-slate-900">Purchase Order Tidak Ditemukan</h3>
           <p className="text-xs text-slate-500">PO yang Anda cari tidak terdaftar atau telah dihapus.</p>
           <button onClick={() => router.push("/purchase")} className="text-xs font-bold text-blue-600 hover:underline">
             Kembali ke Daftar PO
           </button>
         </div>
       </div>
     );
   }
 
   const vendor = po.vendor_snapshot || {};
 
   return (
     <div className="space-y-6 max-w-4xl mx-auto text-slate-800">
       
       {/* Actions Bar */}
       <div className="flex items-center justify-between border-b border-slate-200 pb-4 no-print gap-3">
         <button onClick={() => router.push("/purchase")} className="hover:text-blue-600 transition flex items-center gap-1.5 text-xs text-slate-500 font-semibold">
           <ArrowLeft className="w-4 h-4" /> Kembali
         </button>
 
         <div className="flex items-center gap-2">
           {po.status === "draft" && (
             <>
               <button
                 onClick={() => handleUpdateStatus("cancelled")}
                 disabled={updating}
                 className="px-3.5 py-2 hover:bg-slate-50 border border-slate-200 text-slate-600 font-bold rounded-xl text-xs transition"
               >
                 Batalkan PO
               </button>
               <button
                 onClick={() => handleUpdateStatus("sent")}
                 disabled={updating}
                 className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition shadow-sm flex items-center gap-1.5"
               >
                 <Check className="w-3.5 h-3.5" /> Kirim ke Pemasok (Sent)
               </button>
             </>
           )}
 
           {po.status === "sent" && (
             <>
               <button
                 onClick={() => handleUpdateStatus("cancelled")}
                 disabled={updating}
                 className="px-3.5 py-2 hover:bg-slate-50 border border-slate-200 text-slate-600 font-bold rounded-xl text-xs transition"
               >
                 Batalkan PO
               </button>
               <button
                 onClick={() => {
                   if (activeBusiness?.is_multi_warehouse_enabled) {
                     setShowReceiveModal(true);
                   } else {
                     handleReceiveGoods();
                   }
                 }}
                 disabled={updating}
                 className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition shadow-sm flex items-center gap-1.5 animate-pulse"
               >
                 <CheckCircle className="w-3.5 h-3.5" /> Konfirmasi Penerimaan Barang
               </button>
             </>
           )}
           
           <button
             onClick={() => window.print()}
             className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold rounded-xl text-xs transition flex items-center gap-1.5"
           >
             <Download className="w-3.5 h-3.5" /> Cetak PDF
           </button>
         </div>
       </div>
 
       {/* PO Sheets for Printing */}
       <div className="bg-white border border-slate-200 rounded-2xl p-6 md:p-8 shadow-sm space-y-8 relative overflow-hidden" style={{ borderTop: `6px solid #2563EB` }}>
         
         {/* Top Header PO */}
         <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pb-6 border-b border-slate-100">
           <div className="space-y-1">
             <div className="flex items-center gap-1.5 text-blue-600 font-extrabold text-sm tracking-wide uppercase">
               <Truck className="w-5 h-5 text-blue-600" /> Purchase Order
             </div>
             <h3 className="text-xl font-mono font-bold text-slate-900">{po.po_number}</h3>
             <div>{getStatusBadge(po.status)}</div>
           </div>
 
           <div className="text-xs space-y-1 sm:text-right text-slate-500 font-medium">
             <p className="flex items-center sm:justify-end gap-1"><Calendar className="w-3.5 h-3.5 text-slate-400" /> Tanggal PO: <strong>{po.issue_date}</strong></p>
             {po.expected_delivery_date && (
               <p className="flex items-center sm:justify-end gap-1"><Calendar className="w-3.5 h-3.5 text-slate-400" /> Estimasi Kirim: <strong>{po.expected_delivery_date}</strong></p>
             )}
           </div>
         </div>
 
         {/* Vendor Detail Info */}
         <div className="p-4 bg-slate-50 border border-slate-150 rounded-2xl grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
           <div className="space-y-1.5">
             <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Penerbit PO (Pembeli)</span>
             <h4 className="font-bold text-slate-900 text-sm">{activeBusiness?.name || "Nama Toko"}</h4>
             <p className="text-slate-500 leading-normal">{activeBusiness?.address || "-"}</p>
             <p className="text-slate-500">{activeBusiness?.phone || "-"}</p>
           </div>
           
           <div className="space-y-1.5">
             <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Dipesan Ke (Vendor / Pemasok)</span>
             <h4 className="font-bold text-slate-900 text-sm">{vendor.name || "Nama Vendor"}</h4>
             {vendor.address && <p className="text-slate-500 leading-normal">{vendor.address}</p>}
             {(vendor.phone || vendor.email) && (
               <p className="text-slate-500">
                 {vendor.phone || "-"} {vendor.email ? `| ${vendor.email}` : ""}
               </p>
             )}
           </div>
         </div>
 
         {/* Line Items Table */}
         <div className="space-y-2">
           <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 pb-1">
             <Package className="w-4 h-4 text-blue-600" /> Rincian Item Pesanan
           </h4>
           
           <div className="border border-slate-200 rounded-xl overflow-hidden">
             <table className="w-full text-xs text-left">
               <thead>
                 <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                   <th className="py-2.5 px-3">Nama Item</th>
                   <th className="py-2.5 px-3 text-center w-24">Jumlah</th>
                   <th className="py-2.5 px-3 text-right w-36">Harga Satuan</th>
                   <th className="py-2.5 px-3 text-right w-36">Total</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-100 text-slate-700">
                 {items.map((item) => (
                   <tr key={item.id} className="hover:bg-slate-50/50">
                     <td className="py-3 px-3">
                       <div className="font-semibold text-slate-900">{item.name}</div>
                       {item.item_id && (
                         <span className="text-[8px] font-bold bg-blue-50 text-blue-600 border border-blue-100 px-1.5 py-0.5 rounded-md mt-0.5 inline-block">
                           Inventaris Lacak
                         </span>
                       )}
                     </td>
                     <td className="py-3 px-3 text-center font-bold text-slate-800">
                       {Number(item.quantity).toLocaleString("id-ID")} {item.unit}
                     </td>
                     <td className="py-3 px-3 text-right font-semibold">
                       {formatCurrency(item.unit_cost)}
                     </td>
                     <td className="py-3 px-3 text-right font-extrabold text-slate-900">
                       {formatCurrency(item.subtotal)}
                     </td>
                   </tr>
                 ))}
               </tbody>
             </table>
           </div>
         </div>
 
         {/* Bottom PO Summary */}
         <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
           {/* Notes */}
           <div className="flex-1 text-xs space-y-1.5 text-slate-500 leading-relaxed max-w-md">
             {po.notes && (
               <>
                 <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Keterangan Tambahan</span>
                 <p className="bg-slate-50 p-3 rounded-xl border border-slate-100 italic">"{po.notes}"</p>
               </>
             )}
           </div>
 
           {/* Totals */}
           <div className="w-full sm:w-72 text-xs space-y-2 shrink-0 border-t sm:border-t-0 border-slate-100 pt-4 sm:pt-0">
             <div className="flex justify-between text-slate-500 font-medium">
               <span>Subtotal</span>
               <span className="font-semibold text-slate-900">{formatCurrency(po.subtotal)}</span>
             </div>
             <div className="flex justify-between text-slate-500 font-medium">
               <span>PPN 11%</span>
               <span className="font-semibold text-slate-900">{formatCurrency(po.tax_amount)}</span>
             </div>
             <div className="flex justify-between items-baseline border-t border-slate-100 pt-2 text-slate-700">
               <span className="font-bold">Total Nilai PO</span>
               <span className="text-lg font-extrabold text-blue-600">{formatCurrency(po.total_amount)}</span>
             </div>
           </div>
         </div>
 
       </div>
 
       {/* Receive Goods Warehouse Modal */}
       {showReceiveModal && (
         <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in font-sans">
           <div className="bg-white rounded-2xl max-w-md w-full border border-slate-150 shadow-xl overflow-hidden animate-slide-up">
             <div className="p-6 border-b border-slate-100 flex items-center justify-between">
               <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5">
                 <Truck className="w-4 h-4 text-emerald-600" /> Penerimaan Barang PO
               </h3>
               <button 
                 onClick={() => setShowReceiveModal(false)}
                 className="text-slate-400 hover:text-slate-650 p-1"
               >
                 <X className="w-4 h-4" />
               </button>
             </div>
             
             <div className="p-6 space-y-4">
               <p className="text-xs text-slate-500">
                 Pilih gudang tujuan untuk memasukkan stok dari barang yang diterima.
               </p>
               
               <div className="space-y-1">
                 <label className="text-slate-500 font-bold block text-xs">Gudang Tujuan</label>
                 <select
                   value={selectedWarehouseId}
                   onChange={(e) => setSelectedWarehouseId(e.target.value)}
                   className="w-full bg-white border border-slate-200 px-3 py-2 rounded-xl text-slate-800 focus:outline-none focus:border-blue-500 text-xs"
                 >
                   {warehouses.length === 0 ? (
                     <option value="">Loading warehouses...</option>
                   ) : (
                     warehouses.map((wh) => (
                       <option key={wh.id} value={wh.id}>
                         {wh.name} {wh.code ? `(${wh.code})` : ""}
                       </option>
                     ))
                   )}
                 </select>
               </div>
 
               <div className="flex gap-3 pt-2">
                 <button
                   type="button"
                   onClick={() => setShowReceiveModal(false)}
                   className="flex-1 px-3 py-2 hover:bg-slate-50 border border-slate-200 text-slate-600 font-bold rounded-xl text-xs transition"
                 >
                   Batal
                 </button>
                 <button
                   type="button"
                   onClick={() => handleReceiveGoods(selectedWarehouseId)}
                   disabled={updating || !selectedWarehouseId}
                   className="flex-1 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition shadow-sm"
                 >
                   {updating ? "Memproses..." : "Konfirmasi & Terima"}
                 </button>
               </div>
             </div>
           </div>
         </div>
       )}
     </div>
   );
 }
