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
  X,
  CreditCard,
  DollarSign,
  AlertTriangle,
  Wallet
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
  payment_status: "unpaid" | "paid";
  paid_at: string | null;
  payment_account_id: string | null;
  issue_date: string;
  expected_delivery_date: string | null;
  due_date: string | null;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  notes: string | null;
  currency: string;
  vendor_snapshot: any;
  vendor_id: string | null;
  business_id: string;
}

interface AccountOption {
  id: string;
  code: string;
  name: string;
  type: string;
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

  // Settlement / Payment Modal States
  const [showPayModal, setShowPayModal] = useState(false);
  const [paymentAccounts, setPaymentAccounts] = useState<AccountOption[]>([]);
  const [selectedPayAccountId, setSelectedPayAccountId] = useState("");
  const [payDate, setPayDate] = useState(new Date().toISOString().split("T")[0]);
  const [payNotes, setPayNotes] = useState("");

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

  const fetchPaymentAccounts = async () => {
    if (!activeBusiness) return;
    try {
      const supabase = createWebBrowserClient();
      const { data, error } = await supabase
        .from("accounts")
        .select("id, code, name, type")
        .eq("business_id", activeBusiness.id)
        .eq("type", "asset")
        .eq("is_active", true)
        .order("code", { ascending: true });

      if (error) throw error;
      setPaymentAccounts(data || []);

      const defaultCash = (data || []).find(a => a.code === "1101") || data?.[0];
      if (defaultCash) {
        setSelectedPayAccountId(defaultCash.id);
      }
    } catch (err) {
      console.error("Error fetching payment accounts:", err);
    }
  };

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
    fetchPaymentAccounts();
    fetchWarehouses();
  }, [params.id, activeBusiness]);

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
      : "Apakah Anda yakin telah menerima semua barang pesanan ini secara fisik? Tindakan ini akan menambah stok gudang secara real-time dan mencatat Utang Dagang (2101).";
      
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

      alert("Penerimaan barang berhasil dikonfirmasi! Stok gudang dan pencatatan Utang Dagang telah ter-update otomatis.");
      setShowReceiveModal(false);
      fetchPODetails();
    } catch (err) {
      console.error("Error receiving PO goods:", err);
      alert("Gagal memproses penerimaan barang.");
    } finally {
      setUpdating(false);
    }
  };

  // Settlement / Pelunasan PO Action
  const handleSettlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!po || !activeBusiness) return;
    if (!selectedPayAccountId) {
      alert("Harap pilih akun Kas/Bank pembayar!");
      return;
    }

    try {
      setUpdating(true);
      const supabase = createWebBrowserClient();

      // 1. Update purchase_orders payment status
      const { error: poError } = await supabase
        .from("purchase_orders")
        .update({
          payment_status: "paid",
          paid_at: new Date(payDate).toISOString(),
          payment_account_id: selectedPayAccountId
        })
        .eq("id", po.id);

      if (poError) throw poError;

      // 2. Fallback ensure journal entry pelunasan (Utang Dagang 2101 vs Kas/Bank)
      const { data: apAcc } = await supabase
        .from("accounts")
        .select("id")
        .eq("business_id", activeBusiness.id)
        .eq("code", "2101")
        .maybeSingle();

      if (apAcc) {
        // Hapus jurnal lama jika ada
        await supabase
          .from("journal_entries")
          .delete()
          .eq("reference_source", "PO_PAYMENT")
          .eq("reference_id", po.id);

        const { data: jEntry, error: jError } = await supabase
          .from("journal_entries")
          .insert({
            business_id: activeBusiness.id,
            entry_date: payDate,
            description: `Pelunasan Utang PO #${po.po_number} ${payNotes ? `(${payNotes})` : ""}`,
            reference_source: "PO_PAYMENT",
            reference_id: po.id
          })
          .select("id")
          .single();

        if (!jError && jEntry) {
          await supabase.from("journal_items").insert([
            {
              journal_entry_id: jEntry.id,
              account_id: apAcc.id,
              debit: po.total_amount,
              credit: 0.00
            },
            {
              journal_entry_id: jEntry.id,
              account_id: selectedPayAccountId,
              debit: 0.00,
              credit: po.total_amount
            }
          ]);
        }
      }

      alert("Pembayaran PO berhasil dicatat! Utang dagang telah dilunaskan dan jurnal akuntansi telah diterbitkan.");
      setShowPayModal(false);
      fetchPODetails();
    } catch (err) {
      console.error("Error settling PO payment:", err);
      alert("Gagal memproses pelunasan PO.");
    } finally {
      setUpdating(false);
    }
  };

  const handleCancelPayment = async () => {
    if (!po || !confirm("Apakah Anda yakin ingin membatalkan status pelunasan PO ini? Utang dagang akan kembali tercatat aktif.")) return;
    try {
      setUpdating(true);
      const supabase = createWebBrowserClient();

      await supabase
        .from("journal_entries")
        .delete()
        .eq("reference_source", "PO_PAYMENT")
        .eq("reference_id", po.id);

      const { error } = await supabase
        .from("purchase_orders")
        .update({
          payment_status: "unpaid",
          paid_at: null,
          payment_account_id: null
        })
        .eq("id", po.id);

      if (error) throw error;
      alert("Status pelunasan berhasil dibatalkan.");
      fetchPODetails();
    } catch (err) {
      console.error("Error canceling PO payment:", err);
      alert("Gagal membatalkan pelunasan.");
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

  const todayStr = new Date().toISOString().split("T")[0];

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
  const isOverdue = po.status === "received" && po.payment_status === "unpaid" && po.due_date && po.due_date < todayStr;
  const paymentAccountName = paymentAccounts.find(a => a.id === po.payment_account_id)?.name;

  return (
    <div className="space-y-6 max-w-4xl mx-auto text-slate-800">
      
      {/* Actions Bar */}
      <div className="flex flex-wrap items-center justify-between border-b border-slate-200 pb-4 no-print gap-3">
        <button onClick={() => router.push("/purchase")} className="hover:text-blue-600 transition flex items-center gap-1.5 text-xs text-slate-500 font-semibold">
          <ArrowLeft className="w-4 h-4" /> Kembali ke Daftar PO
        </button>

        <div className="flex flex-wrap items-center gap-2">
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

          {/* Settle PO Payment Button */}
          {po.status === "received" && po.payment_status !== "paid" && (
            <button
              onClick={() => setShowPayModal(true)}
              disabled={updating}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition shadow-sm flex items-center gap-1.5"
            >
              <DollarSign className="w-4 h-4" /> Lunaskan Pembayaran PO
            </button>
          )}

          {po.status === "received" && po.payment_status === "paid" && (
            <button
              onClick={handleCancelPayment}
              disabled={updating}
              className="px-3 py-2 border border-slate-200 hover:bg-slate-50 text-slate-500 font-bold rounded-xl text-xs transition"
            >
              Batalkan Status Lunas
            </button>
          )}
          
          <button
            onClick={() => window.print()}
            className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold rounded-xl text-xs transition flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" /> Cetak PDF
          </button>
        </div>
      </div>

      {/* PO Settlement Status Alert Box */}
      {po.status === "received" && (
        <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
          po.payment_status === "paid"
            ? "bg-emerald-50/80 border-emerald-200 text-emerald-900"
            : isOverdue
              ? "bg-rose-50/90 border-rose-200 text-rose-900"
              : "bg-amber-50/80 border-amber-200 text-amber-900"
        }`}>
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${
              po.payment_status === "paid" ? "bg-emerald-100 text-emerald-700" : isOverdue ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700"
            }`}>
              {po.payment_status === "paid" ? <CheckCircle className="w-5 h-5" /> : <Wallet className="w-5 h-5" />}
            </div>
            <div>
              <h4 className="font-bold text-sm flex items-center gap-2">
                Status Beban Utang: {po.payment_status === "paid" ? "Lunas" : isOverdue ? "Jatuh Tempo (Overdue)" : "Belum Lunas (Utang Usaha Aktif)"}
              </h4>
              <p className="text-xs opacity-80 mt-0.5">
                {po.payment_status === "paid" 
                  ? `Dibayar pada ${po.paid_at?.slice(0, 10) || "-"} melalui ${paymentAccountName || "Kas/Bank"}`
                  : `Tenggat waktu pembayaran: ${po.due_date || "Tidak ditentukan"}. Jurnal Utang Dagang (2101) tercatat aktif di Neraca.`}
              </p>
            </div>
          </div>

          {po.payment_status !== "paid" && (
            <button
              onClick={() => setShowPayModal(true)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-xs shrink-0 self-end sm:self-auto"
            >
              Bayar Sekarang
            </button>
          )}
        </div>
      )}

      {/* PO Sheets for Printing */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 md:p-8 shadow-sm space-y-8 relative overflow-hidden" style={{ borderTop: `6px solid #2563EB` }}>
        
        {/* Top Header PO */}
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pb-6 border-b border-slate-100">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-blue-600 font-extrabold text-sm tracking-wide uppercase">
              <Truck className="w-5 h-5 text-blue-600" /> Purchase Order
            </div>
            <h3 className="text-xl font-mono font-bold text-slate-900">{po.po_number}</h3>
            <div className="flex flex-wrap items-center gap-2">
              {getStatusBadge(po.status)}
              {po.payment_status === "paid" ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  <CheckCircle className="w-3 h-3 text-emerald-600" /> Lunas
                </span>
              ) : po.status === "received" ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                  Belum Lunas
                </span>
              ) : null}
            </div>
          </div>

          <div className="text-xs space-y-1 sm:text-right text-slate-500 font-medium">
            <p className="flex items-center sm:justify-end gap-1"><Calendar className="w-3.5 h-3.5 text-slate-400" /> Tanggal PO: <strong>{po.issue_date}</strong></p>
            {po.expected_delivery_date && (
              <p className="flex items-center sm:justify-end gap-1"><Calendar className="w-3.5 h-3.5 text-slate-400" /> Estimasi Kirim: <strong>{po.expected_delivery_date}</strong></p>
            )}
            {po.due_date && (
              <p className={`flex items-center sm:justify-end gap-1 ${isOverdue ? "text-rose-600 font-bold" : ""}`}>
                <Clock className="w-3.5 h-3.5" /> Tenggat Pembayaran: <strong>{po.due_date}</strong>
              </p>
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
              <span>PPN</span>
              <span className="font-semibold text-slate-900">{formatCurrency(po.tax_amount)}</span>
            </div>
            <div className="flex justify-between items-baseline border-t border-slate-100 pt-2 text-slate-700">
              <span className="font-bold">Total Nilai PO</span>
              <span className="text-lg font-extrabold text-blue-600">{formatCurrency(po.total_amount)}</span>
            </div>
          </div>
        </div>

      </div>

      {/* Settle Payment Modal */}
      {showPayModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in font-sans">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-xl overflow-hidden animate-slide-up">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                  <DollarSign className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Pelunasan Pembayaran PO</h3>
                  <p className="text-xs text-slate-500 font-medium">PO #{po.po_number}</p>
                </div>
              </div>
              <button onClick={() => setShowPayModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSettlePayment} className="p-6 space-y-4">
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 flex justify-between items-center text-xs">
                <span className="font-semibold text-slate-600">Total Tagihan:</span>
                <span className="text-base font-extrabold text-emerald-600">{formatCurrency(po.total_amount)}</span>
              </div>

              {/* Tanggal Pembayaran */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Tanggal Pelunasan *</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none" />
                  <input
                    type="date"
                    required
                    value={payDate}
                    onChange={(e) => setPayDate(e.target.value)}
                    className="w-full border border-slate-200 pl-10 pr-3 py-2 rounded-xl text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Akun Pembayar (Kas/Bank) */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Sumber Rekening / Kas *</label>
                <div className="relative">
                  <Wallet className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none" />
                  <select
                    required
                    value={selectedPayAccountId}
                    onChange={(e) => setSelectedPayAccountId(e.target.value)}
                    className="w-full border border-slate-200 pl-10 pr-4 py-2 rounded-xl text-xs focus:outline-none focus:border-blue-500 bg-white"
                  >
                    {paymentAccounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.code} - {acc.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Catatan */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Catatan Pelunasan</label>
                <textarea
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  placeholder="Misal: Transfer via BCA ke rekening vendor PT ABC..."
                  rows={2}
                  className="w-full border border-slate-200 p-2.5 rounded-xl text-xs focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="bg-blue-50/70 p-3 rounded-xl border border-blue-100 text-[11px] text-blue-800 leading-relaxed">
                ℹ️ <strong>Jurnal Akuntansi Otomatis:</strong><br />
                - <strong>Debit:</strong> Utang Dagang (2101) sebesar {formatCurrency(po.total_amount)}<br />
                - <strong>Credit:</strong> Kas / Bank yang dipilih sebesar {formatCurrency(po.total_amount)}
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowPayModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 font-bold rounded-xl text-xs hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-sm flex items-center gap-1.5"
                >
                  <CheckCircle className="w-4 h-4" /> {updating ? "Memproses..." : "Konfirmasi Pelunasan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Receive Goods Warehouse Modal */}
      {showReceiveModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in font-sans">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-150 shadow-xl overflow-hidden animate-slide-up">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Pilih Gudang Penerimaan</h3>
                  <p className="text-xs text-slate-500 font-medium">Stok akan dialokasikan ke gudang tujuan</p>
                </div>
              </div>
              <button onClick={() => setShowReceiveModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">Gudang Alokasi Stok</label>
                <select
                  value={selectedWarehouseId}
                  onChange={(e) => setSelectedWarehouseId(e.target.value)}
                  className="w-full border border-slate-200 p-2.5 rounded-xl text-xs focus:outline-none focus:border-blue-500 bg-white"
                >
                  {warehouses.map((wh) => (
                    <option key={wh.id} value={wh.id}>
                      {wh.name} {wh.is_default ? "(Gudang Utama)" : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-4 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowReceiveModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 font-bold rounded-xl text-xs hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={updating}
                  onClick={() => handleReceiveGoods(selectedWarehouseId)}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-sm flex items-center gap-1.5"
                >
                  <CheckCircle className="w-4 h-4" /> {updating ? "Memproses..." : "Konfirmasi Masuk Gudang"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
