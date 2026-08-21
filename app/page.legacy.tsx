"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { createWebBrowserClient } from "../lib/supabase/client";
import { 
  FileText, 
  Users, 
  TrendingUp, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Plus, 
  Search, 
  SlidersHorizontal, 
  Phone, 
  MessageSquare, 
  ChevronDown, 
  Bell, 
  Menu, 
  MoreVertical,
  Briefcase,
  Layers,
  Send,
  X,
  CreditCard,
  FileSpreadsheet,
  ArrowLeft,
  Calendar,
  DollarSign,
  User
} from "lucide-react";

export default function Home() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"dashboard" | "invoice" | "customer" | "catalog">("dashboard");

  const handleLogout = async () => {
    const supabase = createWebBrowserClient();
    await supabase.auth.signOut();
    router.refresh();
    router.push("/login");
  };
  
  // Modals state
  const [showAddInvoice, setShowAddInvoice] = useState(false);
  const [showRecordPayment, setShowRecordPayment] = useState(false);
  
  // Search & Filter state
  const [invoiceFilter, setInvoiceFilter] = useState("Semua");
  const [customerFilter, setCustomerFilter] = useState("Semua");
  const [catalogFilter, setCatalogFilter] = useState("Semua Item");
  
  const [invoiceSearch, setInvoiceSearch] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [catalogSearch, setCatalogSearch] = useState("");

  // Simulated Database State
  const [invoices, setInvoices] = useState([
    { id: "INV-2023-001", client: "PT Maju Mundur Bersama", amount: 12500000, date: "12 Okt 2023", dueDate: "26 Okt 2023", status: "Lunas", detailStatus: "Lunas" },
    { id: "INV-2023-002", client: "CV Bintang Kejora", amount: 4750000, date: "01 Okt 2023", dueDate: "16 Okt 2023", status: "Terlambat", detailStatus: "Terlambat 15 hari" },
    { id: "INV-2023-003", client: "Toko Makmur Sentosa", amount: 8200000, date: "20 Okt 2023", dueDate: "03 Nov 2023", status: "Dikirim", detailStatus: "Jatuh tempo: 03 Nov 2023" },
    { id: "INV-2023-004", client: "Bapak Budi Santoso", amount: 1500000, date: "22 Okt 2023", dueDate: "", status: "Draft", detailStatus: "Belum dikirim" },
    { id: "INV-2023-005", client: "PT Teknologi Inovasi", amount: 25000000, date: "15 Sep 2023", dueDate: "", status: "Sebagian", detailStatus: "Sisa: Rp 5.000.000" }
  ]);

  const [customers, setCustomers] = useState([
    { id: "1", name: "Budi Anduk", company: "PT Makmur Jaya", amount: 12500000, status: "Lunas", initials: "BA" },
    { id: "2", name: "Siti Aminah", company: "Toko Berkah", amount: 4200000, status: "Berhutang", initials: "SI" },
    { id: "3", name: "Hendra Dinata", company: "Freelance", amount: 850000, status: "Lunas", initials: "HD" }
  ]);

  const [catalog, setCatalog] = useState([
    { id: "1", name: "Konsultasi IT", type: "Jasa", price: 500000, unit: "jam", desc: "Layanan konsultasi arsitektur jaringan dan keamanan server." },
    { id: "2", name: "Lisensi Software X", type: "Produk", price: 1250000, unit: "lisensi", desc: "Lisensi tahunan untuk software manajemen proyek enterprise." },
    { id: "3", name: "Router Wireless Pro", type: "Produk", price: 850000, unit: "pcs", desc: "Dual-band gigabit router untuk keperluan kantor skala..." },
    { id: "4", name: "Kabel UTP Cat 6", type: "Material", price: 12000, unit: "meter", desc: "Kabel jaringan kualitas tinggi, warna biru." }
  ]);

  // Form State for Add Invoice
  const [newInvoice, setNewInvoice] = useState({
    clientName: "PT Maju Mundur Sejahtera",
    clientAddress: "Jl. Sudirman Kav 21, Jakarta Selatan",
    itemName: "Jasa Konsultasi UI/UX",
    itemDesc: "Konsultasi desain aplikasi mobile bulan Juni",
    itemQty: 1,
    itemUnit: "Hari",
    itemPrice: 5000000,
    taxEnabled: false,
    paymentMethod: "Bank Transfer (BCA)",
    signature: "John Doe"
  });

  // Form State for Record Payment
  const [paymentAmount, setPaymentAmount] = useState("5500000");
  const [paymentDate, setPaymentDate] = useState("2023-10-25");
  const [paymentMethod, setPaymentMethod] = useState("Transfer Bank");
  const [paymentNotes, setPaymentNotes] = useState("");

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Handlers
  const handleCreateInvoice = (e: React.FormEvent) => {
    e.preventDefault();
    const itemSubtotal = newInvoice.itemQty * newInvoice.itemPrice;
    const taxAmount = newInvoice.taxEnabled ? itemSubtotal * 0.11 : 0;
    const total = itemSubtotal + taxAmount;

    const newInvObj = {
      id: `INV-2026-VI-${String(invoices.length + 1).padStart(3, '0')}`,
      client: newInvoice.clientName,
      amount: total,
      date: "15 Jun 2026",
      dueDate: "29 Jun 2026",
      status: "Draft",
      detailStatus: "Belum dikirim"
    };

    setInvoices([newInvObj, ...invoices]);
    setShowAddInvoice(false);
  };

  const handleRecordPaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Update the PT Teknologi Inovasi invoice to paid/partial in simulation
    setInvoices(invoices.map(inv => {
      if (inv.client === "PT Teknologi Inovasi") {
        return {
          ...inv,
          status: "Lunas",
          detailStatus: "Lunas"
        };
      }
      return inv;
    }));
    setShowRecordPayment(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      
      {/* HEADER: Web & Mobile */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between">
        
        {/* Mobile Header Left (Avatar & Business Dropdown) */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-slate-200 border border-slate-200 overflow-hidden flex items-center justify-center">
            {/* User Profile avatar */}
            <div className="w-full h-full bg-slate-300 flex items-center justify-center text-slate-600 font-bold text-sm">
              B
            </div>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-500 font-medium leading-none">Bisnis Aktif</span>
            <button className="flex items-center gap-1 text-sm font-bold text-slate-900 hover:text-blue-600 transition">
              Faktur Online <ChevronDown className="w-4 h-4 text-slate-400" />
            </button>
          </div>
        </div>

        {/* Brand Center (for desktop views, centered logo) */}
        <div className="hidden md:flex items-center gap-2 absolute left-1/2 transform -translate-x-1/2">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
            <FileText className="w-4.5 h-4.5 text-white" />
          </div>
          <span className="text-lg font-bold text-blue-600 tracking-tight">Faktur Online</span>
        </div>

        {/* Header Right */}
        <div className="flex items-center gap-2">
          <button className="p-2 text-slate-500 hover:text-blue-600 hover:bg-slate-50 rounded-full transition relative">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full" />
          </button>
          <button 
            onClick={handleLogout}
            className="px-3.5 py-1.5 text-xs font-bold text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg border border-slate-200 hover:border-rose-100 transition"
          >
            Keluar
          </button>
          <button className="md:hidden p-2 text-slate-500 hover:text-blue-600 hover:bg-slate-50 rounded-full transition">
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* WORKSPACE AREA: Sidebar + Content */}
      <div className="flex-1 flex flex-col md:flex-row max-w-7xl w-full mx-auto md:p-6 gap-6">
        
        {/* SIDEBAR NAVIGATION: Desktop only */}
        <aside className="hidden md:flex flex-col w-64 bg-white border border-slate-200 rounded-2xl p-4 gap-2 h-fit card-shadow">
          <button
            onClick={() => setActiveTab("dashboard")}
            className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold rounded-xl transition ${
              activeTab === "dashboard"
                ? "bg-blue-50 text-blue-600"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"
            }`}
          >
            <Layers className="w-5 h-5" /> Dashboard
          </button>
          <button
            onClick={() => setActiveTab("invoice")}
            className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold rounded-xl transition ${
              activeTab === "invoice"
                ? "bg-blue-50 text-blue-600"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"
            }`}
          >
            <FileText className="w-5 h-5" /> Invoices
          </button>
          <button
            onClick={() => setActiveTab("customer")}
            className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold rounded-xl transition ${
              activeTab === "customer"
                ? "bg-blue-50 text-blue-600"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"
            }`}
          >
            <Users className="w-5 h-5" /> Pelanggan
          </button>
          <button
            onClick={() => setActiveTab("catalog")}
            className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold rounded-xl transition ${
              activeTab === "catalog"
                ? "bg-blue-50 text-blue-600"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"
            }`}
          >
            <Briefcase className="w-5 h-5" /> Katalog Item
          </button>
          
          <hr className="my-2 border-slate-100" />
          
          <button 
            onClick={() => setShowAddInvoice(true)}
            className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition shadow-sm text-sm"
          >
            <Plus className="w-4 h-4" /> Buat Invoice Baru
          </button>
        </aside>

        {/* CONTENT PANELS */}
        <main className="flex-1 px-4 py-6 md:p-0 space-y-6 pb-24 md:pb-6">
          
          {/* TAB 1: DASHBOARD */}
          {activeTab === "dashboard" && (
            <div className="space-y-6">
              
              {/* Welcome Section */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                    Halo, Budi! <span className="animate-bounce">👋</span>
                  </h2>
                  <p className="text-sm text-slate-500 mt-0.5">Ringkasan bisnis Anda hari ini.</p>
                </div>
                <div className="bg-white border border-slate-200 px-3 py-1.5 rounded-xl text-xs font-semibold text-blue-600 flex items-center gap-1.5 w-fit">
                  <Calendar className="w-4 h-4 text-slate-400" /> BULAN INI: OKT 2023
                </div>
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Card 1: Total Omset (Blue) */}
                <div className="bg-blue-600 text-white p-6 rounded-2xl flex flex-col justify-between h-40 shadow-sm relative overflow-hidden">
                  <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-white/10 rounded-full blur-xl" />
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-blue-100">Total Omset</span>
                    <TrendingUp className="w-5 h-5 text-blue-200" />
                  </div>
                  <div className="space-y-1">
                    <span className="text-3xl font-extrabold block">Rp 45.2Jt</span>
                    <span className="text-xs text-blue-100 font-medium">+12% dari bulan lalu</span>
                  </div>
                </div>

                {/* Card 2: Lunas (White) */}
                <div className="bg-white border border-slate-200 p-6 rounded-2xl flex flex-col justify-between h-40 shadow-sm card-shadow">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Lunas</span>
                    <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <span className="text-3xl font-extrabold text-slate-900 block">Rp 32.0Jt</span>
                    <span className="text-xs text-slate-500 font-medium">15 Faktur</span>
                  </div>
                </div>

              </div>

              {/* Income Trend SVG Chart */}
              <div className="bg-white border border-slate-200 p-6 rounded-2xl card-shadow space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-slate-900">Tren Pendapatan</h3>
                    <p className="text-xs text-slate-500">7 Hari Terakhir</p>
                  </div>
                  <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg">IDR</span>
                </div>

                {/* Clean Custom SVG Line Chart */}
                <div className="relative h-44 w-full">
                  <svg className="w-full h-full" viewBox="0 0 500 150" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="chart-grad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#2563eb" stopOpacity="0.15" />
                        <stop offset="100%" stopColor="#2563eb" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>
                    {/* Grid lines (very clean and faint) */}
                    <line x1="0" y1="25" x2="500" y2="25" stroke="#f1f5f9" strokeWidth="1" />
                    <line x1="0" y1="75" x2="500" y2="75" stroke="#f1f5f9" strokeWidth="1" />
                    <line x1="0" y1="125" x2="500" y2="125" stroke="#f1f5f9" strokeWidth="1" />
                    
                    {/* Fill Area under chart line */}
                    <path 
                      d="M 0,120 C 50,110 80,135 120,130 C 180,120 200,30 250,55 C 300,80 320,135 370,125 C 420,115 450,20 500,35 L 500,150 L 0,150 Z" 
                      fill="url(#chart-grad)" 
                    />
                    {/* Smooth curve line */}
                    <path 
                      d="M 0,120 C 50,110 80,135 120,130 C 180,120 200,30 250,55 C 300,80 320,135 370,125 C 420,115 450,20 500,35" 
                      fill="none" 
                      stroke="#2563eb" 
                      strokeWidth="3.5" 
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
              </div>

              {/* Recent Activities Section */}
              <div className="bg-white border border-slate-200 rounded-2xl card-shadow overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="font-bold text-slate-900">Aktivitas Terbaru</h3>
                  <button onClick={() => setActiveTab("invoice")} className="text-xs font-bold text-blue-600 hover:text-blue-700 transition">
                    Lihat Semua
                  </button>
                </div>

                <div className="divide-y divide-slate-100">
                  {invoices.slice(0, 3).map((inv) => (
                    <div key={inv.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition cursor-pointer" onClick={() => {
                      if (inv.id === "INV-2023-005" || inv.client === "PT Teknologi Inovasi") {
                        setShowRecordPayment(true);
                      }
                    }}>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-slate-800">{inv.client}</h4>
                          <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">{inv.id}</span>
                        </div>
                      </div>
                      <div className="text-right space-y-1">
                        <span className="text-sm font-bold text-slate-900 block">{formatCurrency(inv.amount)}</span>
                        {inv.status === "Lunas" && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-100">Lunas</span>
                        )}
                        {inv.status === "Sebagian" && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-600 border border-blue-100">Sebagian</span>
                        )}
                        {inv.status === "Terlambat" && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-600 border border-rose-100">Terlambat</span>
                        )}
                        {inv.status === "Dikirim" && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 text-sky-600 border border-sky-100">Dikirim</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: INVOICES LIST */}
          {activeTab === "invoice" && (
            <div className="space-y-4">
              
              {/* Search & Filter Bar */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <input
                    type="text"
                    value={invoiceSearch}
                    onChange={(e) => setInvoiceSearch(e.target.value)}
                    placeholder="Cari invoice atau pelanggan..."
                    className="w-full bg-white border border-slate-200 pl-10 pr-4 py-2.5 rounded-xl text-sm placeholder-slate-400 focus:outline-none focus:border-blue-500 transition"
                  />
                </div>
                <button className="bg-white border border-slate-200 px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-700 flex items-center justify-center gap-2 hover:bg-slate-50 transition">
                  <SlidersHorizontal className="w-4 h-4 text-slate-400" /> Filter
                </button>
              </div>

              {/* Filter Pills */}
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                {["Semua", "Draft", "Dikirim", "Lunas", "Sebagian", "Terlambat"].map((pill) => (
                  <button
                    key={pill}
                    onClick={() => setInvoiceFilter(pill)}
                    className={`px-4 py-1.5 text-xs font-bold rounded-full transition shrink-0 ${
                      invoiceFilter === pill 
                        ? "bg-blue-600 text-white shadow-sm" 
                        : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    {pill}
                  </button>
                ))}
              </div>

              {/* Invoices Stack */}
              <div className="space-y-3">
                {invoices
                  .filter(inv => {
                    const matchesSearch = inv.client.toLowerCase().includes(invoiceSearch.toLowerCase()) || inv.id.toLowerCase().includes(invoiceSearch.toLowerCase());
                    const matchesFilter = invoiceFilter === "Semua" || inv.status === invoiceFilter;
                    return matchesSearch && matchesFilter;
                  })
                  .map((inv) => (
                    <div 
                      key={inv.id} 
                      onClick={() => {
                        if (inv.id === "INV-2023-005" || inv.client === "PT Teknologi Inovasi") {
                          setShowRecordPayment(true);
                        }
                      }}
                      className="bg-white border border-slate-200 p-5 rounded-2xl card-shadow card-shadow-hover flex justify-between items-start cursor-pointer"
                    >
                      <div className="space-y-3">
                        <div>
                          <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">{inv.id}</span>
                          <h4 className="font-bold text-slate-900 mt-0.5">{inv.client}</h4>
                        </div>
                        <div className="space-y-1">
                          <span className="text-xs text-slate-500 block">{inv.date}</span>
                          {inv.dueDate && (
                            <span className={`text-xs flex items-center gap-1.5 font-medium ${inv.status === 'Terlambat' ? 'text-rose-600' : 'text-slate-500'}`}>
                              {inv.status === 'Terlambat' ? <AlertCircle className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5 text-slate-400" />}
                              {inv.detailStatus}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="text-right space-y-4">
                        {inv.status === "Lunas" && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-600 border border-emerald-100">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Lunas
                          </span>
                        )}
                        {inv.status === "Terlambat" && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-600 border border-rose-100">
                            <AlertCircle className="w-3.5 h-3.5" /> Terlambat
                          </span>
                        )}
                        {inv.status === "Dikirim" && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-600 border border-blue-100">
                            <Send className="w-3.5 h-3.5" /> Dikirim
                          </span>
                        )}
                        {inv.status === "Draft" && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">
                            <FileText className="w-3.5 h-3.5" /> Draft
                          </span>
                        )}
                        {inv.status === "Sebagian" && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-600 border border-amber-100">
                            <Clock className="w-3.5 h-3.5" /> Sebagian
                          </span>
                        )}
                        
                        <div className="text-lg font-extrabold text-slate-900">{formatCurrency(inv.amount)}</div>
                      </div>
                    </div>
                  ))}
              </div>

            </div>
          )}

          {/* TAB 3: CUSTOMERS LIST */}
          {activeTab === "customer" && (
            <div className="space-y-4">
              
              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input
                  type="text"
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  placeholder="Cari pelanggan atau perusahaan..."
                  className="w-full bg-white border border-slate-200 pl-10 pr-4 py-2.5 rounded-xl text-sm placeholder-slate-400 focus:outline-none focus:border-blue-500 transition"
                />
              </div>

              {/* Filter Pills */}
              <div className="flex gap-2">
                {["Semua", "Punya Hutang", "Lunas"].map((pill) => (
                  <button
                    key={pill}
                    onClick={() => setCustomerFilter(pill)}
                    className={`px-4 py-1.5 text-xs font-bold rounded-full transition ${
                      customerFilter === pill 
                        ? "bg-blue-600 text-white shadow-sm" 
                        : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    {pill}
                  </button>
                ))}
              </div>

              {/* Customers Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {customers
                  .filter(c => {
                    const matchesSearch = c.name.toLowerCase().includes(customerSearch.toLowerCase()) || c.company.toLowerCase().includes(customerSearch.toLowerCase());
                    const matchesFilter = customerFilter === "Semua" || (customerFilter === "Punya Hutang" && c.status === "Berhutang") || (customerFilter === "Lunas" && c.status === "Lunas");
                    return matchesSearch && matchesFilter;
                  })
                  .map((cust) => (
                    <div key={cust.id} className="bg-white border border-slate-200 p-5 rounded-2xl card-shadow flex flex-col justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm tracking-wide border border-blue-100">
                          {cust.initials}
                        </div>
                        <div className="space-y-1">
                          <h4 className="font-bold text-slate-900">{cust.name}</h4>
                          <span className="text-xs text-slate-500 flex items-center gap-1">
                            <Briefcase className="w-3.5 h-3.5 text-slate-400" /> {cust.company}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                        <div>
                          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Total Tagihan</span>
                          <span className={`text-base font-extrabold ${cust.status === "Berhutang" ? "text-rose-600" : "text-slate-950"}`}>
                            {formatCurrency(cust.amount)}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <button title="Kirim WA" className="w-9 h-9 rounded-full bg-blue-50 hover:bg-blue-100 text-blue-600 flex items-center justify-center border border-blue-100 transition">
                            <MessageSquare className="w-4 h-4" />
                          </button>
                          <button title="Telepon" className="w-9 h-9 rounded-full bg-blue-50 hover:bg-blue-100 text-blue-600 flex items-center justify-center border border-blue-100 transition">
                            <Phone className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>

            </div>
          )}

          {/* TAB 4: CATALOG LIST */}
          {activeTab === "catalog" && (
            <div className="space-y-4">
              
              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input
                  type="text"
                  value={catalogSearch}
                  onChange={(e) => setCatalogSearch(e.target.value)}
                  placeholder="Cari nama produk atau SKU..."
                  className="w-full bg-white border border-slate-200 pl-10 pr-4 py-2.5 rounded-xl text-sm placeholder-slate-400 focus:outline-none focus:border-blue-500 transition"
                />
              </div>

              {/* Filter Pills */}
              <div className="flex gap-2">
                {["Semua Item", "Produk", "Jasa", "Material"].map((pill) => (
                  <button
                    key={pill}
                    onClick={() => setCatalogFilter(pill)}
                    className={`px-4 py-1.5 text-xs font-bold rounded-full transition ${
                      catalogFilter === pill 
                        ? "bg-blue-600 text-white shadow-sm" 
                        : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    {pill}
                  </button>
                ))}
              </div>

              {/* Catalog List */}
              <div className="space-y-3">
                {catalog
                  .filter(item => {
                    const matchesSearch = item.name.toLowerCase().includes(catalogSearch.toLowerCase()) || item.desc.toLowerCase().includes(catalogSearch.toLowerCase());
                    const matchesFilter = catalogFilter === "Semua Item" || item.type === catalogFilter;
                    return matchesSearch && matchesFilter;
                  })
                  .map((item) => (
                    <div key={item.id} className="bg-white border border-slate-200 p-5 rounded-2xl card-shadow flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-start gap-4 flex-1">
                        <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 shrink-0">
                          {item.type === "Jasa" && <Layers className="w-5.5 h-5.5" />}
                          {item.type === "Produk" && <FileSpreadsheet className="w-5.5 h-5.5" />}
                          {item.type === "Material" && <Briefcase className="w-5.5 h-5.5" />}
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-slate-900">{item.name}</h4>
                            <span className="text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200 px-2 py-0.5 rounded-md">{item.type}</span>
                          </div>
                          <p className="text-xs text-slate-500 leading-relaxed max-w-xl">{item.desc}</p>
                        </div>
                      </div>
                      
                      <div className="sm:text-right border-t sm:border-t-0 border-slate-100 pt-3 sm:pt-0">
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Harga Default</span>
                        <div className="flex items-baseline justify-start sm:justify-end gap-1">
                          <span className="text-lg font-extrabold text-slate-900">{formatCurrency(item.price)}</span>
                          <span className="text-xs text-slate-400">/ {item.unit}</span>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>

            </div>
          )}

        </main>
      </div>

      {/* MOBILE BOTTOM NAVBAR: Collapses into bottom navigation bar exactly like mockups */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 px-4 py-2 flex items-center justify-between">
        <button 
          onClick={() => setActiveTab("dashboard")} 
          className={`flex flex-col items-center gap-1 px-3 py-1 ${activeTab === "dashboard" ? "text-blue-600" : "text-slate-400"}`}
        >
          <Layers className="w-5 h-5" />
          <span className="text-[10px] font-bold">Dashboard</span>
        </button>
        
        <button 
          onClick={() => setActiveTab("invoice")} 
          className={`flex flex-col items-center gap-1 px-3 py-1 ${activeTab === "invoice" ? "text-blue-600" : "text-slate-400"}`}
        >
          <FileText className="w-5 h-5" />
          <span className="text-[10px] font-bold">Invoice</span>
        </button>
        
        {/* Floating Action Button inside Bottom Bar */}
        <div className="relative -top-5">
          <button 
            onClick={() => setShowAddInvoice(true)}
            className="w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full flex items-center justify-center shadow-lg shadow-blue-500/30 transition transform active:scale-95"
          >
            <Plus className="w-7 h-7" />
          </button>
        </div>

        <button 
          onClick={() => setActiveTab("customer")} 
          className={`flex flex-col items-center gap-1 px-3 py-1 ${activeTab === "customer" ? "text-blue-600" : "text-slate-400"}`}
        >
          <Users className="w-5 h-5" />
          <span className="text-[10px] font-bold">Pelanggan</span>
        </button>
        
        <button 
          onClick={() => setActiveTab("catalog")} 
          className={`flex flex-col items-center gap-1 px-3 py-1 ${activeTab === "catalog" ? "text-blue-600" : "text-slate-400"}`}
        >
          <Briefcase className="w-5 h-5" />
          <span className="text-[10px] font-bold">Katalog</span>
        </button>
      </nav>

      {/* MODAL 1: BUAT INVOICE BARU (Clean Minimalist Form matching 3.png) */}
      {showAddInvoice && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto card-shadow">
            
            {/* Modal Header */}
            <div className="sticky top-0 bg-white z-10 px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Buat Invoice Baru</h3>
                <p className="text-xs text-slate-500">Lengkapi detail untuk menerbitkan invoice.</p>
              </div>
              <button 
                onClick={() => setShowAddInvoice(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateInvoice} className="p-6 space-y-6">
              
              {/* Template selection dropdown */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Template</label>
                <div className="relative">
                  <select className="w-full bg-white border border-slate-200 px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-700 appearance-none focus:outline-none focus:border-blue-500">
                    <option>Modern Template</option>
                    <option>Classic Template</option>
                    <option>Minimal Template</option>
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              {/* Pengaturan Invoice Card */}
              <div className="border border-slate-200 rounded-xl p-4 space-y-4">
                <h4 className="text-xs font-bold text-blue-600 flex items-center gap-1.5 uppercase tracking-wider">
                  <Layers className="w-4 h-4" /> Pengaturan Invoice
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Mata Uang</label>
                    <input type="text" value="IDR - Indonesian Rupiah" disabled className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg text-xs font-medium text-slate-600 cursor-not-allowed" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Status</label>
                    <input type="text" value="Unpaid" disabled className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg text-xs font-medium text-slate-600 cursor-not-allowed" />
                  </div>
                </div>
              </div>

              {/* Detail Invoice Card */}
              <div className="border border-slate-200 rounded-xl p-4 space-y-4">
                <h4 className="text-xs font-bold text-blue-600 flex items-center gap-1.5 uppercase tracking-wider">
                  <Clock className="w-4 h-4" /> Detail Invoice
                </h4>
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Nomor Invoice</label>
                    <input 
                      type="text" 
                      value={`INV/2026/VI/${String(invoices.length + 1).padStart(3, '0')}`} 
                      disabled 
                      className="w-full bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-lg text-sm font-semibold text-slate-700 cursor-not-allowed"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Tanggal</label>
                      <input type="date" defaultValue="2026-06-15" className="w-full border border-slate-200 px-3 py-2 rounded-lg text-xs font-semibold focus:outline-none focus:border-blue-500" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Jatuh Tempo</label>
                      <input type="date" defaultValue="2026-06-29" className="w-full border border-slate-200 px-3 py-2 rounded-lg text-xs font-semibold focus:outline-none focus:border-blue-500" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Dari (Bill From) */}
              <div className="border border-slate-200 rounded-xl p-4 space-y-3">
                <h4 className="text-xs font-bold text-blue-600 flex items-center gap-1.5 uppercase tracking-wider">
                  <Briefcase className="w-4 h-4" /> Dari (Bill From)
                </h4>
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Pilih Bisnis</label>
                  <select className="w-full border border-slate-200 px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none focus:border-blue-500">
                    <option>Bisnis Utama Saya (PT Maju Bersama)</option>
                  </select>
                </div>
              </div>

              {/* Kepada (Bill To) */}
              <div className="border border-slate-200 rounded-xl p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-bold text-blue-600 flex items-center gap-1.5 uppercase tracking-wider">
                    <User className="w-4 h-4" /> Kepada (Bill To)
                  </h4>
                  <button type="button" className="text-[10px] font-bold text-blue-600 hover:text-blue-700">Input Manual</button>
                </div>
                <div className="space-y-3">
                  <select 
                    value={newInvoice.clientName}
                    onChange={(e) => setNewInvoice({...newInvoice, clientName: e.target.value})}
                    className="w-full border border-slate-200 px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none focus:border-blue-500"
                  >
                    <option>PT Maju Mundur Sejahtera</option>
                    <option>Toko Berkah</option>
                    <option>CV Bintang Kejora</option>
                  </select>
                  <div className="bg-blue-50/50 border border-blue-100 rounded-lg p-3 text-xs text-slate-600">
                    <p className="font-bold text-slate-800">{newInvoice.clientName}</p>
                    <p>{newInvoice.clientAddress}</p>
                  </div>
                </div>
              </div>

              {/* Daftar Item */}
              <div className="border border-slate-200 rounded-xl p-4 space-y-4">
                <h4 className="text-xs font-bold text-blue-600 flex items-center gap-1.5 uppercase tracking-wider">
                  <FileSpreadsheet className="w-4 h-4" /> Daftar Item
                </h4>
                
                <div className="space-y-3 border-l-2 border-blue-500 pl-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Nama Item</label>
                    <input 
                      type="text" 
                      value={newInvoice.itemName}
                      onChange={(e) => setNewInvoice({...newInvoice, itemName: e.target.value})}
                      className="w-full border border-slate-200 px-3 py-2 rounded-lg text-xs font-semibold focus:outline-none focus:border-blue-500" 
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Deskripsi (Opsional)</label>
                    <textarea 
                      value={newInvoice.itemDesc}
                      onChange={(e) => setNewInvoice({...newInvoice, itemDesc: e.target.value})}
                      rows={2}
                      className="w-full border border-slate-200 px-3 py-2 rounded-lg text-xs font-semibold focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Kuantitas</label>
                      <input 
                        type="number" 
                        value={newInvoice.itemQty}
                        onChange={(e) => setNewInvoice({...newInvoice, itemQty: Number(e.target.value)})}
                        className="w-full border border-slate-200 px-3 py-2 rounded-lg text-xs font-semibold focus:outline-none focus:border-blue-500" 
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Unit</label>
                      <input 
                        type="text" 
                        value={newInvoice.itemUnit}
                        onChange={(e) => setNewInvoice({...newInvoice, itemUnit: e.target.value})}
                        className="w-full border border-slate-200 px-3 py-2 rounded-lg text-xs font-semibold focus:outline-none focus:border-blue-500" 
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Harga Satuan</label>
                    <input 
                      type="number" 
                      value={newInvoice.itemPrice}
                      onChange={(e) => setNewInvoice({...newInvoice, itemPrice: Number(e.target.value)})}
                      className="w-full border border-slate-200 px-3 py-2 rounded-lg text-xs font-semibold focus:outline-none focus:border-blue-500" 
                    />
                  </div>
                </div>

                <button type="button" className="w-full py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 transition">
                  <Plus className="w-3.5 h-3.5" /> Tambah Item
                </button>
              </div>

              {/* Totals Section */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Subtotal</span>
                  <span className="font-bold text-slate-900">{formatCurrency(newInvoice.itemQty * newInvoice.itemPrice)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">PPN (11%)</span>
                  <span className="font-bold text-slate-900">{formatCurrency(newInvoice.itemQty * newInvoice.itemPrice * 0.11)}</span>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-2 text-sm">
                  <span className="font-bold text-slate-900">Total Tagihan</span>
                  <span className="font-extrabold text-blue-600">{formatCurrency((newInvoice.itemQty * newInvoice.itemPrice) * 1.11)}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
                <button 
                  type="button" 
                  onClick={() => setShowAddInvoice(false)}
                  className="flex-1 py-3 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold rounded-xl text-sm transition text-center"
                >
                  Batal
                </button>
                <button 
                  type="submit" 
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm transition shadow-sm text-center"
                >
                  Simpan Invoice
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: CATAT PEMBAYARAN (Clean Minimalist Form matching 6.png) */}
      {showRecordPayment && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-t-2xl sm:rounded-2xl max-w-md w-full overflow-hidden card-shadow">
            
            {/* Grab handle for bottom drawer on mobile */}
            <div className="sm:hidden w-12 h-1.5 bg-slate-200 rounded-full mx-auto my-3" />

            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-900">Catat Pembayaran</h3>
              <button 
                onClick={() => setShowRecordPayment(false)}
                className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRecordPaymentSubmit} className="p-6 space-y-4">
              
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Nominal Dibayar</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-sm font-semibold text-slate-400">Rp</span>
                  <input
                    type="number"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    className="w-full border border-slate-200 pl-10 pr-4 py-2.5 rounded-xl text-sm font-semibold focus:outline-none focus:border-blue-500"
                  />
                </div>
                <span className="text-[10px] text-slate-400 font-medium">Sisa tagihan: Rp 5.500.000</span>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Tanggal Pembayaran</label>
                <input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="w-full border border-slate-200 px-4 py-2.5 rounded-xl text-sm font-semibold focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Metode Pembayaran</label>
                <div className="relative">
                  <select 
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full border border-slate-200 px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-700 appearance-none focus:outline-none focus:border-blue-500"
                  >
                    <option>Transfer Bank</option>
                    <option>Tunai</option>
                    <option>E-Wallet</option>
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Catatan (Opsional)</label>
                <textarea
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  placeholder="Masukkan nomor referensi atau catatan tambahan..."
                  rows={3}
                  className="w-full border border-slate-200 px-4 py-2.5 rounded-xl text-sm font-medium focus:outline-none focus:border-blue-500 placeholder-slate-400"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 mt-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm transition shadow-sm text-center"
              >
                Simpan Pembayaran
              </button>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
