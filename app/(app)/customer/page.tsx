"use client";

import React, { useEffect, useState } from "react";
import { 
  Users, 
  Plus, 
  Search, 
  Phone, 
  Mail, 
  MapPin, 
  FileText, 
  Trash2, 
  Edit2, 
  X, 
  Building2,
  AlertCircle
} from "lucide-react";
import { useBusiness } from "../../../lib/context/BusinessContext";
import { createWebBrowserClient } from "../../../lib/supabase/client";
import Pagination from "../../../components/Pagination";

interface Customer {
  id: string;
  business_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  tax_id: string | null;
  created_at: string;
  outstanding_balance?: number;
}

export default function CustomerPage() {
  const { activeBusiness, subscription } = useBusiness();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modals state
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<"create" | "edit">("create");
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  
  // Form fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [taxId, setTaxId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Search & Filter
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<"All" | "Hutang" | "Lunas">("All");
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;

  useEffect(() => {
    setCurrentPage(1);
  }, [search, filterType]);

  // Invoices list modal states
  const [viewingCustomer, setViewingCustomer] = useState<Customer | null>(null);
  const [customerInvoices, setCustomerInvoices] = useState<any[]>([]);
  const [loadingCustomerInvoices, setLoadingCustomerInvoices] = useState(false);
  const [customerInvoiceFilter, setCustomerInvoiceFilter] = useState<"unpaid" | "all">("unpaid");

  const fetchCustomerInvoices = async (customerId: string) => {
    try {
      setLoadingCustomerInvoices(true);
      const supabase = createWebBrowserClient();
      const { data, error } = await supabase
        .from("invoices")
        .select("id, invoice_number, status, total_amount, remaining_amount, issue_date")
        .eq("customer_id", customerId)
        .eq("type", "invoice")
        .order("issue_date", { ascending: false });

      if (error) throw error;
      setCustomerInvoices(data || []);
    } catch (err) {
      console.error("Error fetching customer invoices:", err);
    } finally {
      setLoadingCustomerInvoices(false);
    }
  };

  useEffect(() => {
    if (viewingCustomer) {
      fetchCustomerInvoices(viewingCustomer.id);
    } else {
      setCustomerInvoices([]);
    }
  }, [viewingCustomer]);

  const fetchCustomers = async () => {
    if (!activeBusiness) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const supabase = createWebBrowserClient();

      // Fetch customers
      const { data: customersData, error: custError } = await supabase
        .from("customers")
        .select("*")
        .eq("business_id", activeBusiness.id)
        .order("name", { ascending: true });

      if (custError) throw custError;

      // Fetch invoice balances to calculate outstanding balance for each customer
      const { data: invoicesData, error: invError } = await supabase
        .from("invoices")
        .select("customer_id, remaining_amount")
        .eq("business_id", activeBusiness.id)
        .eq("type", "invoice")
        .neq("status", "draft");

      if (invError) throw invError;

      // Map outstanding balance
      const mapped = (customersData || []).map((cust) => {
        const balance = (invoicesData || [])
          .filter((inv) => inv.customer_id === cust.id)
          .reduce((sum, inv) => sum + Number(inv.remaining_amount || 0), 0);
        return {
          ...cust,
          outstanding_balance: balance
        };
      });

      setCustomers(mapped);
    } catch (err) {
      console.error("Error fetching customers:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [activeBusiness]);

  const openCreateModal = () => {
    setModalType("create");
    setEditingCustomer(null);
    setName("");
    setEmail("");
    setPhone("");
    setAddress("");
    setTaxId("");
    setShowModal(true);
  };

  const openEditModal = (cust: Customer) => {
    setModalType("edit");
    setEditingCustomer(cust);
    setName(cust.name);
    setEmail(cust.email || "");
    setPhone(cust.phone || "");
    setAddress(cust.address || "");
    setTaxId(cust.tax_id || "");
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBusiness) return;
    try {
      setSubmitting(true);
      const supabase = createWebBrowserClient();

      if (modalType === "create") {
        // Enforce customer subscription limit checks
        if (subscription) {
          const { checkUsageLimit } = await import("../../../lib/utils/subscription");
          const limitCheck = await checkUsageLimit(
            supabase,
            activeBusiness.id,
            "customer",
            subscription.tier,
            subscription.isTrialExpired
          );
          if (!limitCheck.allowed) {
            alert(`Batas jumlah pelanggan terlampaui! Paket Anda membatasi maksimum ${limitCheck.max} pelanggan. Silakan tingkatkan paket Anda untuk melanjutkan.`);
            setSubmitting(false);
            return;
          }
        }

        const { error } = await supabase.from("customers").insert({
          business_id: activeBusiness.id,
          name,
          email: email || null,
          phone: phone || null,
          address: address || null,
          tax_id: taxId || null
        });
        if (error) throw error;
      } else if (modalType === "edit" && editingCustomer) {
        const { error } = await supabase
          .from("customers")
          .update({
            name,
            email: email || null,
            phone: phone || null,
            address: address || null,
            tax_id: taxId || null
          })
          .eq("id", editingCustomer.id);
        if (error) throw error;
      }

      setShowModal(false);
      fetchCustomers();
    } catch (err) {
      console.error("Error saving customer:", err);
      alert("Gagal menyimpan data pelanggan.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus pelanggan ini? Semua invoice terkait akan kehilangan relasi pelanggan.")) return;
    try {
      const supabase = createWebBrowserClient();
      const { error } = await supabase.from("customers").delete().eq("id", id);
      if (error) throw error;
      fetchCustomers();
    } catch (err) {
      console.error("Error deleting customer:", err);
      alert("Gagal menghapus pelanggan.");
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: activeBusiness?.default_currency || "IDR",
      maximumFractionDigits: 0
    }).format(val);
  };

  const filteredCustomers = customers.filter((cust) => {
    const matchesSearch = 
      cust.name.toLowerCase().includes(search.toLowerCase()) || 
      (cust.email && cust.email.toLowerCase().includes(search.toLowerCase())) ||
      (cust.phone && cust.phone.includes(search));

    const balance = cust.outstanding_balance || 0;
    const matchesFilter =
      filterType === "All" ||
      (filterType === "Hutang" && balance > 0) ||
      (filterType === "Lunas" && balance === 0);

    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            Pelanggan
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">Kelola daftar pelanggan dan status tagihan mereka.</p>
        </div>
        <button
          onClick={openCreateModal}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 px-4 rounded-xl text-sm flex items-center justify-center gap-1.5 shadow-sm transition shrink-0 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" /> Tambah Pelanggan
        </button>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama, email, atau telepon..."
            className="w-full bg-white border border-slate-200 pl-10 pr-4 py-2.5 rounded-xl text-sm placeholder-slate-400 focus:outline-none focus:border-blue-500 transition shadow-sm"
          />
        </div>
        
        <div className="flex gap-1.5 shrink-0 bg-white p-1 border border-slate-200 rounded-xl shadow-sm">
          {(["All", "Hutang", "Lunas"] as const).map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-4 py-1.5 text-xs font-bold rounded-lg transition ${
                filterType === type 
                  ? "bg-blue-600 text-white shadow-sm" 
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              {type === "All" ? "Semua" : type === "Hutang" ? "Berhutang" : "Lunas"}
            </button>
          ))}
        </div>
      </div>

      {/* Main List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs text-slate-500 font-semibold mt-2">Memuat pelanggan...</p>
        </div>
      ) : filteredCustomers.length > 0 ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filteredCustomers.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE).map((cust) => {
              const hasHutang = (cust.outstanding_balance || 0) > 0;
              return (
                <div 
                  key={cust.id} 
                  className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm flex flex-col justify-between gap-4 card-shadow-hover transition"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm tracking-wide border border-blue-100 shrink-0">
                        {cust.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div className="space-y-1">
                        <h4 className="font-bold text-slate-900 text-sm">{cust.name}</h4>
                        {cust.email && (
                          <span className="text-xs text-slate-500 flex items-center gap-1.5">
                            <Mail className="w-3.5 h-3.5 text-slate-400" /> {cust.email}
                          </span>
                        )}
                        {cust.phone && (
                          <span className="text-xs text-slate-500 flex items-center gap-1.5">
                            <Phone className="w-3.5 h-3.5 text-slate-400" /> {cust.phone}
                          </span>
                        )}
                        {cust.address && (
                          <span className="text-xs text-slate-500 flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" /> <span className="truncate max-w-[200px]">{cust.address}</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1">
                      <button 
                        onClick={() => openEditModal(cust)}
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                        title="Ubah"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDelete(cust.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                        title="Hapus"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div 
                    onClick={() => {
                      setViewingCustomer(cust);
                      setCustomerInvoiceFilter("unpaid");
                    }}
                    className="flex items-center justify-between border-t border-slate-100 pt-3 cursor-pointer hover:bg-slate-50/80 -mx-5 px-5 -mb-5 pb-5 rounded-b-2xl transition"
                    title="Klik untuk melihat daftar invoice"
                  >
                    <div>
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Tagihan Outstanding</span>
                      <span className={`text-base font-extrabold ${hasHutang ? "text-rose-600" : "text-slate-950"}`}>
                        {formatCurrency(cust.outstanding_balance || 0)}
                      </span>
                    </div>
                    
                    {hasHutang && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-600 border border-rose-100">
                        <AlertCircle className="w-3.5 h-3.5" /> Berhutang
                      </span>
                    )}
                    {!hasHutang && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-100">
                        Lunas
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <Pagination
            currentPage={currentPage}
            totalItems={filteredCustomers.length}
            pageSize={PAGE_SIZE}
            onPageChange={setCurrentPage}
          />
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-400 shadow-sm">
          <Users className="w-12 h-12 mx-auto text-slate-200 mb-3" />
          <p className="text-sm font-semibold">Tidak ada data pelanggan ditemukan</p>
          <button 
            onClick={openCreateModal}
            className="text-xs font-bold text-blue-600 hover:underline mt-1 inline-block"
          >
            Tambah Pelanggan Baru
          </button>
        </div>
      )}

      {/* CRUD MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full overflow-hidden shadow-2xl">
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {modalType === "create" ? "Tambah Pelanggan Baru" : "Ubah Data Pelanggan"}
                </h3>
              </div>
              <button 
                onClick={() => setShowModal(false)}
                className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Nama Lengkap / Kontak Utama *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nama Pelanggan"
                  className="w-full border border-slate-200 px-3 py-2 rounded-xl text-sm placeholder-slate-400 focus:outline-none focus:border-blue-500 transition"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="pelanggan@email.com"
                  className="w-full border border-slate-200 px-3 py-2 rounded-xl text-sm placeholder-slate-400 focus:outline-none focus:border-blue-500 transition"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Nomor Telepon (WhatsApp)</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="62812345678"
                  className="w-full border border-slate-200 px-3 py-2 rounded-xl text-sm placeholder-slate-400 focus:outline-none focus:border-blue-500 transition"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">NPWP / Tax ID (Opsional)</label>
                <input
                  type="text"
                  value={taxId}
                  onChange={(e) => setTaxId(e.target.value)}
                  placeholder="00.000.000.0-000.000"
                  className="w-full border border-slate-200 px-3 py-2 rounded-xl text-sm placeholder-slate-400 focus:outline-none focus:border-blue-500 transition"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Alamat Pengiriman / Penagihan</label>
                <textarea
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Alamat lengkap pelanggan..."
                  rows={3}
                  className="w-full border border-slate-200 px-3 py-2 rounded-xl text-sm placeholder-slate-400 focus:outline-none focus:border-blue-500 transition"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
                <button 
                  type="button" 
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold rounded-xl text-xs transition text-center"
                >
                  Batal
                </button>
                <button 
                  type="submit" 
                  disabled={submitting}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition shadow-sm text-center flex items-center justify-center"
                >
                  {submitting ? "Menyimpan..." : "Simpan Data"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Customer Invoices List Modal */}
      {viewingCustomer && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl">
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Daftar Invoice: {viewingCustomer.name}
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Outstanding: <strong className="text-rose-600">{formatCurrency(viewingCustomer.outstanding_balance || 0)}</strong>
                </p>
              </div>
              <button 
                onClick={() => setViewingCustomer(null)}
                className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              
              {/* Tab Filters */}
              <div className="flex gap-1.5 p-1 bg-slate-100 rounded-xl w-fit">
                <button
                  onClick={() => setCustomerInvoiceFilter("unpaid")}
                  className={`px-4 py-1.5 text-xs font-bold rounded-lg transition ${
                    customerInvoiceFilter === "unpaid" ? "bg-white text-blue-600 shadow-sm font-extrabold" : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  Belum Lunas (Outstanding)
                </button>
                <button
                  onClick={() => setCustomerInvoiceFilter("all")}
                  className={`px-4 py-1.5 text-xs font-bold rounded-lg transition ${
                    customerInvoiceFilter === "all" ? "bg-white text-blue-600 shadow-sm font-extrabold" : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  Semua Invoice
                </button>
              </div>

              {loadingCustomerInvoices ? (
                <div className="flex flex-col items-center justify-center py-10">
                  <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-[10px] text-slate-400 font-semibold mt-2">Memuat daftar invoice...</p>
                </div>
              ) : (
                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                        <th className="py-2.5 px-3">Nomor</th>
                        <th className="py-2.5 px-3">Tanggal</th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3 text-right">Total</th>
                        <th className="py-2.5 px-3 text-right">Sisa Tagihan</th>
                        <th className="py-2.5 px-3 text-center">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {customerInvoices.filter(inv => {
                        if (customerInvoiceFilter === "unpaid") {
                          return Number(inv.remaining_amount) > 0 && inv.status !== "draft";
                        }
                        return true;
                      }).length > 0 ? (
                        customerInvoices.filter(inv => {
                          if (customerInvoiceFilter === "unpaid") {
                            return Number(inv.remaining_amount) > 0 && inv.status !== "draft";
                          }
                          return true;
                        }).map((inv) => (
                          <tr key={inv.id} className="hover:bg-slate-50/50 transition">
                            <td className="py-2.5 px-3 font-mono font-bold text-slate-850">{inv.invoice_number}</td>
                            <td className="py-2.5 px-3 text-slate-500">{inv.issue_date}</td>
                            <td className="py-2.5 px-3">
                              {inv.status === "paid" ? (
                                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-100">Lunas</span>
                              ) : inv.status === "partial" ? (
                                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-50 text-amber-600 border border-amber-100">Sebagian</span>
                              ) : inv.status === "overdue" ? (
                                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-rose-50 text-rose-600 border border-rose-100">Terlambat</span>
                              ) : inv.status === "sent" ? (
                                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-blue-50 text-blue-600 border border-blue-100">Terkirim</span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-slate-100 text-slate-600 border border-slate-200">Draft</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-right font-semibold">{formatCurrency(inv.total_amount)}</td>
                            <td className={`py-2.5 px-3 text-right font-extrabold ${Number(inv.remaining_amount) > 0 ? "text-rose-600" : "text-slate-800"}`}>
                              {formatCurrency(inv.remaining_amount)}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <a 
                                href={`/invoice/${inv.id}`}
                                className="text-blue-600 hover:text-blue-700 font-bold hover:underline"
                              >
                                Detail
                              </a>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={6} className="py-6 text-center text-slate-400 italic">
                            Tidak ada invoice yang sesuai.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}

            </div>
          </div>
        </div>
      )}
    </div>
  );
}
