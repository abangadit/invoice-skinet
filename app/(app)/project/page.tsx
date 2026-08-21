"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { 
  Plus, 
  Search, 
  Trash2, 
  Eye, 
  FolderKanban
} from "lucide-react";
import { useBusiness } from "../../../lib/context/BusinessContext";
import { createWebBrowserClient } from "../../../lib/supabase/client";
import Pagination from "../../../components/Pagination";

interface Project {
  id: string;
  project_number: string;
  name: string;
  description: string | null;
  project_type: "service" | "service_goods";
  status: "draft" | "active" | "on_hold" | "completed" | "cancelled";
  priority: "low" | "medium" | "high" | "urgent";
  start_date: string | null;
  target_end_date: string | null;
  budget_amount: number;
  currency: string;
  progress_percent: number;
  total_invoiced: number;
  total_paid: number;
  customer: {
    id: string;
    name: string;
  } | null;
}

export default function ProjectListPage() {
  const { activeBusiness } = useBusiness();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 9;

  useEffect(() => {
    setCurrentPage(1);
  }, [search, typeFilter, statusFilter]);

  const fetchProjects = async () => {
    if (!activeBusiness) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const supabase = createWebBrowserClient();

      const { data, error } = await supabase
        .from("projects")
        .select(`
          id,
          project_number,
          name,
          description,
          project_type,
          status,
          priority,
          start_date,
          target_end_date,
          budget_amount,
          currency,
          progress_percent,
          total_invoiced,
          total_paid,
          customer:customers(id, name)
        `)
        .eq("business_id", activeBusiness.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      // Cast the joined data to matches our interface
      const formattedProjects = (data || []).map((p: any) => ({
        ...p,
        customer: Array.isArray(p.customer) ? p.customer[0] : p.customer
      })) as Project[];

      setProjects(formattedProjects);
    } catch (err) {
      console.error("Error fetching projects:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, [activeBusiness]);

  const handleDelete = async (id: string, number: string) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus Proyek ${number}? Semua data milestone, tugas, dan time logs terkait akan ikut terhapus.`)) return;
    try {
      const supabase = createWebBrowserClient();
      const { error } = await supabase.from("projects").delete().eq("id", id);
      if (error) throw error;
      fetchProjects();
    } catch (err) {
      console.error("Error deleting project:", err);
      alert("Gagal menghapus proyek.");
    }
  };

  const formatCurrency = (val: number, currencyCode: string) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: currencyCode || "IDR",
      maximumFractionDigits: 0
    }).format(val);
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case "draft":
        return "bg-slate-100 text-slate-700 border-slate-200";
      case "active":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "on_hold":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "completed":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "cancelled":
        return "bg-rose-50 text-rose-700 border-rose-200";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "draft": return "Draft";
      case "active": return "Aktif";
      case "on_hold": return "Ditunda";
      case "completed": return "Selesai";
      case "cancelled": return "Dibatalkan";
      default: return status;
    }
  };

  const getPriorityStyle = (priority: string) => {
    switch (priority) {
      case "low":
        return "text-slate-500 bg-slate-100";
      case "medium":
        return "text-blue-600 bg-blue-50";
      case "high":
        return "text-amber-600 bg-amber-50";
      case "urgent":
        return "text-rose-600 bg-rose-50 animate-pulse";
      default:
        return "text-slate-500 bg-slate-100";
    }
  };

  // Filtered & Search logic
  const filteredProjects = projects.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || 
                          p.project_number.toLowerCase().includes(search.toLowerCase()) ||
                          (p.customer?.name || "").toLowerCase().includes(search.toLowerCase());
    const matchesType = typeFilter === "all" || p.project_type === typeFilter;
    const matchesStatus = statusFilter === "all" || p.status === statusFilter;
    return matchesSearch && matchesType && matchesStatus;
  });

  // Pagination logic
  const totalPages = Math.ceil(filteredProjects.length / PAGE_SIZE);
  const displayedProjects = filteredProjects.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  // Statistics
  const activeCount = projects.filter(p => p.status === "active").length;
  const draftCount = projects.filter(p => p.status === "draft").length;
  const completedCount = projects.filter(p => p.status === "completed").length;
  
  const totalBudgetVal = projects
    .filter(p => p.status !== "cancelled")
    .reduce((sum, p) => sum + Number(p.budget_amount || 0), 0);

  const totalInvoicedVal = projects
    .filter(p => p.status !== "cancelled")
    .reduce((sum, p) => sum + Number(p.total_invoiced || 0), 0);

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6">
      
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-5">
        <div>
          <h1 className="text-2xl font-black text-slate-800 flex items-center gap-2">
            <FolderKanban className="w-7 h-7 text-blue-600" />
            Manajemen Proyek
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Kelola progress tahapan proyek, milestone penagihan, dan profitabilitas bisnis jasa Anda.
          </p>
        </div>
        <Link 
          href="/project/new"
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition text-sm shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Proyek Baru
        </Link>
      </div>

      {/* Summary Cards */}
      {projects.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-4 bg-white border border-slate-150 rounded-2xl shadow-xs">
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Total Proyek Aktif</p>
            <div className="flex items-center gap-3 mt-2">
              <span className="text-2xl font-black text-slate-800">{activeCount}</span>
              <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 font-semibold rounded-md">Berjalan</span>
            </div>
          </div>
          <div className="p-4 bg-white border border-slate-150 rounded-2xl shadow-xs">
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Selesai / Draft</p>
            <div className="flex items-center gap-3 mt-2">
              <span className="text-2xl font-black text-slate-800">{completedCount} <span className="text-slate-300 text-lg">/</span> {draftCount}</span>
              <span className="text-xs px-2 py-0.5 bg-slate-50 text-slate-600 font-semibold rounded-md">Proyek</span>
            </div>
          </div>
          <div className="p-4 bg-white border border-slate-150 rounded-2xl shadow-xs">
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Total Anggaran (Budget)</p>
            <p className="text-lg font-black text-slate-800 mt-2 truncate">
              {formatCurrency(totalBudgetVal, activeBusiness?.default_currency || "IDR")}
            </p>
          </div>
          <div className="p-4 bg-white border border-slate-150 rounded-2xl shadow-xs">
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Nilai Di-invoice</p>
            <div className="flex flex-col mt-1">
              <span className="text-lg font-black text-slate-800 truncate">
                {formatCurrency(totalInvoicedVal, activeBusiness?.default_currency || "IDR")}
              </span>
              {totalBudgetVal > 0 && (
                <span className="text-[10px] text-slate-500 font-semibold mt-0.5">
                  ({Math.round((totalInvoicedVal / totalBudgetVal) * 100)}% dari total budget)
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Filter and Search controls */}
      <div className="flex flex-col md:flex-row gap-3 bg-white p-4 border border-slate-150 rounded-2xl shadow-xs">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Cari nama proyek, nomor, atau pelanggan..."
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            className="px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="all">Semua Tipe</option>
            <option value="service">💻 Pure Jasa (Service)</option>
            <option value="service_goods">🏗️ Jasa + Material</option>
          </select>
          <select
            className="px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">Semua Status</option>
            <option value="draft">Draft</option>
            <option value="active">Aktif</option>
            <option value="on_hold">Ditunda</option>
            <option value="completed">Selesai</option>
            <option value="cancelled">Dibatalkan</option>
          </select>
        </div>
      </div>

      {/* Loading & Empty State */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white border border-slate-150 rounded-2xl">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-semibold text-slate-500 mt-3">Memuat daftar proyek...</p>
        </div>
      ) : displayedProjects.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center py-16 bg-white border border-slate-150 rounded-2xl p-6">
          <FolderKanban className="w-12 h-12 text-slate-300 mb-3" />
          <h3 className="text-base font-bold text-slate-700">Tidak ada proyek ditemukan</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm">
            {search || typeFilter !== "all" || statusFilter !== "all" 
              ? "Coba ganti kata kunci pencarian atau bersihkan filter yang terpasang." 
              : "Buat proyek pertama Anda untuk mulai melacak termin billing, milestone pekerjaan, dan material cost."}
          </p>
          {(search || typeFilter !== "all" || statusFilter !== "all") ? (
            <button 
              onClick={() => { setSearch(""); setTypeFilter("all"); setStatusFilter("all"); }}
              className="mt-4 text-xs font-bold text-blue-600 hover:text-blue-700"
            >
              Reset Filter
            </button>
          ) : (
            <Link 
              href="/project/new"
              className="mt-4 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition"
            >
              Mulai Proyek Pertama
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Card View Layout */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {displayedProjects.map((p) => (
              <div 
                key={p.id} 
                className="bg-white border border-slate-150 rounded-2xl shadow-xs hover:shadow-md transition flex flex-col justify-between overflow-hidden relative group"
              >
                {/* Priority Top-Right indicator */}
                {p.priority && p.priority !== "medium" && (
                  <span className={`absolute top-3 right-3 text-[10px] font-bold px-2 py-0.5 rounded-md ${getPriorityStyle(p.priority)}`}>
                    {p.priority === "urgent" ? "Urgent" : p.priority === "high" ? "Tinggi" : "Rendah"}
                  </span>
                )}

                <div className="p-5 space-y-4">
                  {/* Header info */}
                  <div>
                    <span className="text-[10px] text-slate-400 font-mono font-bold tracking-wider uppercase block">
                      {p.project_number}
                    </span>
                    <h3 className="text-base font-black text-slate-800 mt-1 leading-snug group-hover:text-blue-600 transition truncate">
                      {p.name}
                    </h3>
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 border rounded-full ${getStatusStyle(p.status)}`}>
                        {getStatusLabel(p.status)}
                      </span>
                      <span className="text-[10px] font-bold text-slate-500 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-full">
                        {p.project_type === "service" ? "💻 Jasa" : "🏗️ Jasa + Material"}
                      </span>
                    </div>
                  </div>

                  {/* Customer Info */}
                  {p.customer && (
                    <div className="text-xs bg-slate-50 border border-slate-100 rounded-xl p-2.5 flex flex-col gap-0.5">
                      <span className="text-[9px] font-bold uppercase text-slate-400 tracking-wider">Klien</span>
                      <span className="font-bold text-slate-700 truncate">{p.customer.name}</span>
                    </div>
                  )}

                  {/* Progress bar */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-bold text-slate-500">Progress</span>
                      <span className="font-black text-slate-800">{p.progress_percent}%</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-blue-600 rounded-full transition-all duration-500" 
                        style={{ width: `${p.progress_percent}%` }}
                      />
                    </div>
                  </div>

                </div>

                {/* Footer action buttons */}
                <div className="bg-slate-50 border-t border-slate-100 px-5 py-3.5 flex justify-between items-center gap-2">
                  <button
                    onClick={() => handleDelete(p.id, p.project_number)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 transition"
                    title="Hapus Proyek"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  
                  <div className="flex gap-2">
                    <Link
                      href={`/project/${p.id}`}
                      className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-lg transition"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      Detail
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <Pagination
              currentPage={currentPage}
              totalItems={filteredProjects.length}
              pageSize={PAGE_SIZE}
              onPageChange={setCurrentPage}
            />
          )}
        </div>
      )}
    </div>
  );
}
