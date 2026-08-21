"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ClipboardCheck,
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle,
  Plus,
  FileText,
  User,
  Truck,
  Printer,
  ChevronRight,
  Briefcase
} from "lucide-react";
import { useBusiness } from "../../../../lib/context/BusinessContext";
import { createWebBrowserClient } from "../../../../lib/supabase/client";

interface SOItem {
  id: string;
  item_id: string | null;
  name: string;
  quantity: number;
  unit: string;
  unit_price: number;
  discount_amount: number;
  tax_type: string | null;
  subtotal: number;
}

interface SODetail {
  id: string;
  so_number: string;
  status: "draft" | "confirmed" | "processing" | "completed" | "cancelled";
  order_date: string;
  expected_delivery_date: string | null;
  currency: string;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  notes: string | null;
  customer_id: string;
  warehouse_id?: string | null;
  warehouses?: {
    name: string;
  } | null;
  customers: {
    name: string;
    email: string | null;
    phone: string | null;
    address: string | null;
    tax_id: string | null;
  } | null;
}

interface DeliveryOrder {
  id: string;
  do_number: string;
  status: string;
  created_at: string;
}

interface Invoice {
  id: string;
  invoice_number: string;
  status: string;
  total_amount: number;
}

export default function SalesOrderDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { activeBusiness } = useBusiness();
  
  const [so, setSo] = useState<SODetail | null>(null);
  const [items, setItems] = useState<SOItem[]>([]);
  const [deliveryOrders, setDeliveryOrders] = useState<DeliveryOrder[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const fetchSODetails = async () => {
    if (!activeBusiness || !params?.id) return;
    try {
      setLoading(true);
      setErrorMsg("");
      const supabase = createWebBrowserClient();

      // 1. Fetch Sales Order Header
      const { data: soData, error: soError } = await supabase
        .from("sales_orders")
        .select(`
          *,
          customers (
            name,
            email,
            phone,
            address,
            tax_id
          ),
          warehouses (
            name
          )
        `)
        .eq("id", params.id)
        .eq("business_id", activeBusiness.id)
        .single();

      if (soError) throw soError;

      // Formatting customer if it's returning array or object
      const formattedSO: SODetail = {
        ...soData,
        customers: Array.isArray(soData.customers) ? soData.customers[0] : soData.customers
      };
      setSo(formattedSO);

      // 2. Fetch Sales Order Items
      const { data: itemsData, error: itemsError } = await supabase
        .from("sales_order_items")
        .select("*")
        .eq("so_id", params.id);

      if (itemsError) throw itemsError;
      setItems(itemsData || []);

      // 3. Fetch related Delivery Orders
      const { data: doData } = await supabase
        .from("delivery_orders")
        .select("id, do_number, status, created_at")
        .eq("sales_order_id", params.id)
        .order("created_at", { ascending: false });

      setDeliveryOrders(doData || []);

      // 4. Fetch related Invoices
      const { data: invData } = await supabase
        .from("invoices")
        .select("id, invoice_number, status, total_amount")
        .eq("sales_order_id", params.id)
        .order("created_at", { ascending: false });

      setInvoices(invData || []);

    } catch (err: any) {
      console.error("Error loading SO details:", err);
      setErrorMsg(err.message || "Gagal memuat detail Sales Order.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSODetails();
  }, [activeBusiness, params?.id]);

  const handleConfirmOrder = async () => {
    if (!so) return;
    try {
      setActionLoading(true);
      const supabase = createWebBrowserClient();

      const { error } = await supabase
        .from("sales_orders")
        .update({ status: "confirmed" })
        .eq("id", so.id);

      if (error) throw error;

      alert("Sales Order berhasil dikonfirmasi!");
      fetchSODetails();
    } catch (err: any) {
      console.error("Error confirming SO:", err);
      alert(err.message || "Gagal mengkonfirmasi Sales Order.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleConvertInvoice = async () => {
    if (!so || !activeBusiness) return;
    if (!confirm("Apakah Anda yakin ingin menerbitkan Invoice Draft langsung dari Sales Order ini?")) return;

    try {
      setActionLoading(true);
      const supabase = createWebBrowserClient();

      // Get next invoice number
      const now = new Date();
      const yyyy = String(now.getFullYear());
      const mm = String(now.getMonth() + 1).padStart(2, "0");
      const no = String(activeBusiness.invoice_counter || 1).padStart(4, "0");
      
      let format = activeBusiness.invoice_number_format || "INV/[YYYY]/[MM]/[NO]";
      format = format.replace("[YYYY]", yyyy).replace("[MM]", mm).replace("[NO]", no);

      // Generate public token
      let publicToken = "";
      const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
      for (let i = 0; i < 12; i++) {
        publicToken += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
      }

      // Customer Snapshot
      const customerSnapshot = so.customers ? {
        name: so.customers.name,
        email: so.customers.email,
        phone: so.customers.phone,
        address: so.customers.address,
        tax_id: so.customers.tax_id
      } : { name: "Pelanggan Umum" };

      // Set due date
      const issueDate = new Date().toISOString().split("T")[0];
      const dueDateObj = new Date();
      dueDateObj.setDate(dueDateObj.getDate() + (activeBusiness.default_due_days || 14));
      const dueDate = dueDateObj.toISOString().split("T")[0];

      // Insert invoice
      const { data: invData, error: invError } = await supabase
        .from("invoices")
        .insert({
          business_id: activeBusiness.id,
          sales_order_id: so.id,
          customer_id: so.customer_id,
          customer_snapshot: customerSnapshot,
          invoice_number: format,
          type: "invoice",
          status: "draft",
          issue_date: issueDate,
          due_date: dueDate,
          currency: so.currency,
          subtotal: so.subtotal,
          discount_type: null,
          discount_value: 0,
          discount_amount: 0,
          tax_base: "after_discount",
          taxes_snapshot: so.tax_amount > 0 ? [{ name: "PPN 11%", rate: 11, amount: so.tax_amount }] : [],
          taxes_amount: so.tax_amount,
          shipping_amount: 0,
          shipping_label: "Ongkos Kirim",
          total_amount: so.total_amount,
          remaining_amount: so.total_amount,
          paid_amount: 0,
          payment_methods: ["transfer_bank"],
          notes: so.notes,
          public_token: publicToken,
          template_id: activeBusiness.template_id || "modern",
          template_color: activeBusiness.template_color || "#004de6",
          dpp_amount: so.subtotal,
          pph23_amount: 0.00
        })
        .select()
        .single();

      if (invError) throw invError;

      // Insert invoice items
      const invoiceItemsPayload = items.map((item, idx) => ({
        invoice_id: invData.id,
        item_id: item.item_id || null,
        sort_order: idx,
        name: item.name,
        description: null,
        quantity: item.quantity,
        unit: item.unit,
        unit_price: item.unit_price,
        discount_type: null,
        discount_value: 0,
        discount_amount: item.discount_amount,
        tax_included: false,
        tax_base_per_item: "after_discount",
        subtotal: item.subtotal
      } as any));

      const { error: itemsError } = await supabase
        .from("invoice_items")
        .insert(invoiceItemsPayload);

      if (itemsError) {
        // Rollback invoice
        await supabase.from("invoices").delete().eq("id", invData.id);
        throw itemsError;
      }

      // Increment Counter
      await supabase
        .from("businesses")
        .update({ invoice_counter: (activeBusiness.invoice_counter || 1) + 1 })
        .eq("id", activeBusiness.id);

      // Optionally update Sales Order status if not completed
      await supabase
        .from("sales_orders")
        .update({ status: "processing" })
        .eq("id", so.id);

      alert("Invoice Draft berhasil diterbitkan!");
      router.push(`/invoice/${invData.id}`);

    } catch (err: any) {
      console.error("Error converting SO to Invoice:", err);
      alert(err.message || "Gagal menerbitkan invoice.");
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-600 border border-emerald-100">
            <CheckCircle className="w-3.5 h-3.5" /> Selesai
          </span>
        );
      case "confirmed":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-600 border border-blue-100">
            <CheckCircle className="w-3.5 h-3.5" /> Dikonfirmasi
          </span>
        );
      case "processing":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-600 border border-indigo-100">
            <Clock className="w-3.5 h-3.5" /> Diproses
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

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: so?.currency || activeBusiness?.default_currency || "IDR",
      maximumFractionDigits: 0
    }).format(val);
  };

  if (loading) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs text-slate-500 font-semibold mt-2">Memuat detail Sales Order...</p>
      </div>
    );
  }

  if (errorMsg || !so) {
    return (
      <div className="bg-rose-50 border border-rose-100 text-rose-600 text-xs px-4 py-3 rounded-2xl max-w-xl mx-auto mt-10 space-y-3">
        <div className="flex items-center gap-2 font-bold">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>Error Terjadi</span>
        </div>
        <p>{errorMsg || "Sales Order tidak ditemukan."}</p>
        <button onClick={() => router.push("/sales")} className="text-blue-600 hover:underline font-bold">
          Kembali ke Daftar SO
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      
      {/* Top Navigation Bar */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <button
          onClick={() => router.push("/sales")}
          className="hover:text-blue-600 transition flex items-center gap-1.5 text-xs text-slate-500 font-semibold"
        >
          <ArrowLeft className="w-4 h-4" /> Kembali ke Daftar SO
        </button>
        
        <div className="flex items-center gap-2">
          {getStatusBadge(so.status)}
        </div>
      </div>

      {/* Main Grid: Info & Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-xs font-semibold">
        
        {/* Left Side: Detail & Items */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Header Card */}
          <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-6 card-shadow">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] font-extrabold text-blue-600 uppercase tracking-widest bg-blue-50 px-2 py-0.5 rounded">
                  Sales Order
                </span>
                <h2 className="text-xl font-mono font-extrabold text-slate-900 mt-2">
                  {so.so_number}
                </h2>
                <div className="flex gap-4 mt-1.5 text-slate-500 font-medium text-[11px]">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" /> Tanggal: {so.order_date}
                  </span>
                  {so.expected_delivery_date && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" /> Estimasi Kirim: {so.expected_delivery_date}
                    </span>
                  )}
                  {activeBusiness?.is_multi_warehouse_enabled && so.warehouses?.name && (
                    <span className="flex items-center gap-1">
                      <Briefcase className="w-3.5 h-3.5 text-blue-500" /> Gudang: <strong className="text-blue-600">{so.warehouses.name}</strong>
                    </span>
                  )}
                </div>
              </div>
              
              <button
                onClick={() => window.print()}
                className="inline-flex items-center gap-1 border border-slate-200 px-3 py-2 rounded-xl bg-white text-slate-600 hover:bg-slate-50 active:scale-95 transition font-bold"
              >
                <Printer className="w-4 h-4" /> Cetak Penawaran
              </button>
            </div>

            {/* Customer Snapshot */}
            <div className="border-t border-slate-100 pt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Pelanggan</span>
                <p className="text-slate-800 text-sm font-bold flex items-center gap-1.5">
                  <User className="w-4 h-4 text-slate-400" /> {so.customers?.name || "Pelanggan Umum"}
                </p>
                {so.customers?.email && <p className="text-slate-500 font-medium">{so.customers.email}</p>}
                {so.customers?.phone && <p className="text-slate-500 font-medium">WA: {so.customers.phone}</p>}
              </div>

              {so.customers?.address && (
                <div className="space-y-1">
                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Alamat Kirim</span>
                  <p className="text-slate-650 font-medium leading-relaxed">{so.customers.address}</p>
                  {so.customers?.tax_id && (
                    <p className="text-slate-400 text-[10px] mt-1">NPWP: {so.customers.tax_id}</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Items Table Card */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden card-shadow">
            <div className="p-4 bg-slate-50 border-b border-slate-200">
              <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Daftar Barang Dipesan ({items.length})
              </h3>
            </div>
            
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider">
                  <th className="py-2.5 px-4">Nama Barang</th>
                  <th className="py-2.5 px-4 text-center">Jumlah</th>
                  <th className="py-2.5 px-4 text-right">Harga Satuan</th>
                  <th className="py-2.5 px-4 text-right">Potongan</th>
                  <th className="py-2.5 px-4 text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {items.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-4 font-bold text-slate-800">
                      {item.name}
                      {item.tax_type === "ppn" && (
                        <span className="ml-1.5 px-1 bg-blue-50 text-blue-600 rounded text-[9px] font-bold">
                          PPN 11%
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center font-bold">
                      {item.quantity} <span className="text-slate-400 font-medium">{item.unit}</span>
                    </td>
                    <td className="py-3 px-4 text-right font-medium">
                      {formatCurrency(item.unit_price)}
                    </td>
                    <td className="py-3 px-4 text-right text-rose-500 font-bold">
                      {item.discount_amount > 0 ? `-${formatCurrency(item.discount_amount)}` : "-"}
                    </td>
                    <td className="py-3 px-4 text-right font-extrabold text-slate-900">
                      {formatCurrency(item.subtotal)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Calculations Footer */}
            <div className="border-t border-slate-150 p-4 space-y-2 bg-slate-50 flex flex-col items-end">
              <div className="flex justify-between w-64 text-slate-500 font-semibold">
                <span>Subtotal Jual:</span>
                <span className="text-slate-800 font-bold">{formatCurrency(so.subtotal)}</span>
              </div>
              {so.tax_amount > 0 && (
                <div className="flex justify-between w-64 text-slate-500 font-semibold">
                  <span>PPN (11%):</span>
                  <span className="text-slate-800 font-bold">+{formatCurrency(so.tax_amount)}</span>
                </div>
              )}
              <div className="flex justify-between w-64 pt-2 border-t border-slate-200 text-sm font-bold">
                <span className="text-slate-900">Total Tagihan:</span>
                <span className="text-blue-600 font-extrabold text-md">{formatCurrency(so.total_amount)}</span>
              </div>
            </div>
          </div>

          {/* Notes Card */}
          {so.notes && (
            <div className="space-y-1">
              <label className="text-slate-500">Keterangan / Catatan Internal</label>
              <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl text-slate-700 font-medium leading-relaxed">
                {so.notes}
              </div>
            </div>
          )}

        </div>

        {/* Right Side: Documents & Actions */}
        <div className="space-y-6">
          
          {/* Actions Panel */}
          <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm space-y-4 card-shadow">
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Aksi Dokumen</h4>
            
            <div className="space-y-2.5">
              {so.status === "draft" && (
                <button
                  onClick={handleConfirmOrder}
                  disabled={actionLoading}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-extrabold py-3 px-4 rounded-xl shadow-sm transition flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
                >
                  Konfirmasi Pesanan (Confirm)
                </button>
              )}

              {so.status !== "draft" && so.status !== "cancelled" && (
                <>
                  <button
                    onClick={() => router.push(`/delivery/new?soId=${so.id}`)}
                    disabled={actionLoading}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold py-3 px-4 rounded-xl shadow-sm transition flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
                  >
                    <Truck className="w-4 h-4" /> Buat Surat Jalan (DO)
                  </button>

                  <button
                    onClick={handleConvertInvoice}
                    disabled={actionLoading}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-3 px-4 rounded-xl shadow-sm transition flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
                  >
                    <FileText className="w-4 h-4" /> Terbitkan Invoice Draft
                  </button>
                </>
              )}

              {so.status !== "cancelled" && so.status !== "completed" && (
                <button
                  onClick={async () => {
                    if (!confirm("Batalkan Sales Order ini?")) return;
                    setActionLoading(true);
                    try {
                      const supabase = createWebBrowserClient();
                      const { error } = await supabase
                        .from("sales_orders")
                        .update({ status: "cancelled" })
                        .eq("id", so.id);
                      if (error) throw error;
                      alert("Sales Order berhasil dibatalkan!");
                      fetchSODetails();
                    } catch (e: any) {
                      alert(e.message || "Gagal membatalkan.");
                    } finally {
                      setActionLoading(false);
                    }
                  }}
                  disabled={actionLoading}
                  className="w-full bg-white border border-rose-100 hover:bg-rose-50 text-rose-600 font-bold py-2.5 px-4 rounded-xl transition"
                >
                  Batalkan Order
                </button>
              )}
            </div>
          </div>

          {/* Related Documents Flow */}
          <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm space-y-4 card-shadow">
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Alur Dokumen Terkait</h4>
            
            {/* Delivery Orders */}
            <div className="space-y-2">
              <span className="text-[10px] text-slate-400 font-bold flex items-center gap-1">
                <Truck className="w-3.5 h-3.5" /> Surat Jalan (DO)
              </span>
              {deliveryOrders.length > 0 ? (
                <div className="space-y-2">
                  {deliveryOrders.map(d => (
                    <Link
                      key={d.id}
                      href={`/delivery/${d.id}`}
                      className="flex items-center justify-between p-2 bg-slate-50 border border-slate-100 rounded-xl hover:bg-slate-100 transition"
                    >
                      <div className="font-mono text-[10px] font-bold text-slate-700">
                        {d.do_number}
                      </div>
                      <div className="flex items-center gap-1 font-bold">
                        <span className={`px-1.5 py-0.5 rounded text-[8px] uppercase ${
                          d.status === "shipped" ? "bg-amber-100 text-amber-700" :
                          d.status === "delivered" ? "bg-emerald-100 text-emerald-700" :
                          "bg-slate-100 text-slate-650"
                        }`}>
                          {d.status === "shipped" ? "Dikirim" : d.status === "delivered" ? "Diterima" : "Draft"}
                        </span>
                        <ChevronRight className="w-3 h-3 text-slate-400" />
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-[10px] text-slate-400 font-medium pl-1">Belum ada Surat Jalan dibuat.</p>
              )}
            </div>

            {/* Invoices */}
            <div className="space-y-2 border-t border-slate-100 pt-3">
              <span className="text-[10px] text-slate-400 font-bold flex items-center gap-1">
                <FileText className="w-3.5 h-3.5" /> Invoice Penjualan
              </span>
              {invoices.length > 0 ? (
                <div className="space-y-2">
                  {invoices.map(inv => (
                    <Link
                      key={inv.id}
                      href={`/invoice/${inv.id}`}
                      className="flex items-center justify-between p-2 bg-slate-50 border border-slate-100 rounded-xl hover:bg-slate-100 transition"
                    >
                      <div>
                        <div className="font-mono text-[10px] font-bold text-slate-700">{inv.invoice_number}</div>
                        <div className="text-[9px] text-slate-400 mt-0.5 font-bold">{formatCurrency(inv.total_amount)}</div>
                      </div>
                      <div className="flex items-center gap-1 font-bold">
                        <span className={`px-1.5 py-0.5 rounded text-[8px] uppercase ${
                          inv.status === "paid" ? "bg-emerald-100 text-emerald-700" :
                          inv.status === "partial" ? "bg-blue-100 text-blue-700" :
                          "bg-slate-100 text-slate-650"
                        }`}>
                          {inv.status === "paid" ? "Lunas" : inv.status === "partial" ? "Cicilan" : "Draft"}
                        </span>
                        <ChevronRight className="w-3 h-3 text-slate-400" />
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-[10px] text-slate-400 font-medium pl-1">Belum ada Invoice diterbitkan.</p>
              )}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
