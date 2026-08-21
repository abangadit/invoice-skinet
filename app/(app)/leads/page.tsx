"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { 
  Plus, 
  Search, 
  Trash2, 
  Eye, 
  Target, 
  TrendingUp, 
  Users, 
  PhoneCall, 
  Kanban, 
  List, 
  CheckCircle2
} from "lucide-react";
import { useBusiness } from "../../../lib/context/BusinessContext";
import { createWebBrowserClient } from "../../../lib/supabase/client";

export interface Lead {
  id: string;
  business_id: string;
  sales_id: string;
  company_name: string;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  status: "NEW" | "CONTACTED" | "MEETING" | "PROPOSAL" | "NEGOTIATION" | "WON" | "LOST";
  potential_value: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
  employees?: {
    id: string;
    name: string;
  } | null;
}

const STATUS_CONFIG: Record<Lead["status"], { label: string; color: string; badgeBg: string }> = {
  NEW: { label: "Baru", color: "text-blue-600", badgeBg: "bg-blue-50 text-blue-700 border-blue-200" },
  CONTACTED: { label: "Dihubungi", color: "text-cyan-600", badgeBg: "bg-cyan-50 text-cyan-700 border-cyan-200" },
  MEETING: { label: "Meeting / Janji", color: "text-indigo-600", badgeBg: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  PROPOSAL: { label: "Penawaran", color: "text-amber-600", badgeBg: "bg-amber-50 text-amber-700 border-amber-200" },
  NEGOTIATION: { label: "Negosiasi", color: "text-purple-600", badgeBg: "bg-purple-50 text-purple-700 border-purple-200" },
  WON: { label: "Deal (Won)", color: "text-emerald-600", badgeBg: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  LOST: { label: "Gagal (Lost)", color: "text-rose-600", badgeBg: "bg-rose-50 text-rose-700 border-rose-200" }
};

export default function LeadsListPage() {
  const { activeBusiness } = useBusiness();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [employees, setEmployees] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [salesFilter, setSalesFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"kanban" | "table">("kanban");

  useEffect(() => {
    if (!activeBusiness?.id) return;
    fetchData();
  }, [activeBusiness?.id]);

  const fetchData = async () => {
    setLoading(true);
    const supabase = createWebBrowserClient();

    // Fetch employees for filter dropdown
    const { data: empData } = await supabase
      .from("employees")
      .select("id, name")
      .eq("business_id", activeBusiness!.id);

    if (empData) {
      setEmployees(empData);
    }

    // Fetch leads with employee details
    const { data: leadsData, error } = await supabase
      .from("leads")
      .select(`
        *,
        employees (
          id,
          name
        )
      `)
      .eq("business_id", activeBusiness!.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching leads:", error);
    } else {
      setLeads(leadsData || []);
    }
    setLoading(false);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus lead "${name}"?`)) return;
    const supabase = createWebBrowserClient();
    const { error } = await supabase.from("leads").delete().eq("id", id);
    if (error) {
      alert("Gagal menghapus lead: " + error.message);
    } else {
      setLeads((prev) => prev.filter((l) => l.id !== id));
    }
  };

  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      const matchSearch =
        lead.company_name.toLowerCase().includes(search.toLowerCase()) ||
        (lead.contact_person && lead.contact_person.toLowerCase().includes(search.toLowerCase())) ||
        (lead.phone && lead.phone.includes(search));
      const matchStatus = statusFilter === "all" || lead.status === statusFilter;
      const matchSales = salesFilter === "all" || lead.sales_id === salesFilter;
      return matchSearch && matchStatus && matchSales;
    });
  }, [leads, search, statusFilter, salesFilter]);

  // Metrics Calculation
  const metrics = useMemo(() => {
    const totalLeads = filteredLeads.length;
    const activeLeads = filteredLeads.filter((l) => l.status !== "WON" && l.status !== "LOST");
    const wonLeads = filteredLeads.filter((l) => l.status === "WON");
    const totalPotential = activeLeads.reduce((sum, l) => sum + (Number(l.potential_value) || 0), 0);
    const totalWonValue = wonLeads.reduce((sum, l) => sum + (Number(l.potential_value) || 0), 0);
    const winRate = totalLeads > 0 ? ((wonLeads.length / totalLeads) * 100).toFixed(1) : "0";

    return { totalLeads, activeLeadsCount: activeLeads.length, totalPotential, totalWonValue, winRate };
  }, [filteredLeads]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0
    }).format(val);
  };

  const KANBAN_STAGES: Lead["status"][] = [
    "NEW",
    "CONTACTED",
    "MEETING",
    "PROPOSAL",
    "NEGOTIATION",
    "WON",
    "LOST"
  ];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Target className="w-7 h-7 text-indigo-600" />
            Prospek & Canvassing (Leads)
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Kelola data prospek sales, jalur komunikasi, dan potensi nilai omset/profit.
          </p>
        </div>
        <Link
          href="/leads/new"
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl shadow-sm transition-all shrink-0"
        >
          <Plus className="w-5 h-5" />
          Tambah Prospek Baru
        </Link>
      </div>

      {/* Summary Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Leads Aktif</p>
            <h3 className="text-2xl font-bold text-slate-900">{metrics.activeLeadsCount}</h3>
            <p className="text-xs text-slate-400 mt-0.5">Dari {metrics.totalLeads} total prospek</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Potensi Omset Aktif</p>
            <h3 className="text-2xl font-bold text-slate-900">{formatCurrency(metrics.totalPotential)}</h3>
            <p className="text-xs text-slate-400 mt-0.5">Prospek dalam proses</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Deal (Won)</p>
            <h3 className="text-2xl font-bold text-emerald-600">{formatCurrency(metrics.totalWonValue)}</h3>
            <p className="text-xs text-slate-400 mt-0.5">Penjualan berhasil</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
            <Target className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Win Rate</p>
            <h3 className="text-2xl font-bold text-purple-600">{metrics.winRate}%</h3>
            <p className="text-xs text-slate-400 mt-0.5">Rasio Closing</p>
          </div>
        </div>
      </div>

      {/* Filter and View Controls */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Search */}
          <div className="relative min-w-[240px] flex-1 md:flex-initial">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari perusahaan / PIC / telp..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          >
            <option value="all">Semua Status</option>
            {Object.entries(STATUS_CONFIG).map(([key, val]) => (
              <option key={key} value={key}>
                {val.label}
              </option>
            ))}
          </select>

          {/* Sales Filter */}
          <select
            value={salesFilter}
            onChange={(e) => setSalesFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          >
            <option value="all">Semua Sales / Karyawan</option>
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.name}
              </option>
            ))}
          </select>
        </div>

        {/* View Toggle */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl shrink-0 self-end md:self-auto">
          <button
            onClick={() => setViewMode("kanban")}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              viewMode === "kanban"
                ? "bg-white text-indigo-600 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Kanban className="w-4 h-4" />
            Kanban Board
          </button>
          <button
            onClick={() => setViewMode("table")}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              viewMode === "table"
                ? "bg-white text-indigo-600 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <List className="w-4 h-4" />
            Tabel List
          </button>
        </div>
      </div>

      {/* Content Area */}
      {loading ? (
        <div className="py-20 text-center text-slate-500">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          Memuat data prospek...
        </div>
      ) : filteredLeads.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200/80 shadow-sm">
          <Target className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-slate-800">Belum ada data prospek</h3>
          <p className="text-slate-500 text-sm mt-1 max-w-md mx-auto">
            Mulai catat aktivitas canvassing sales Anda dengan menambahkan prospek baru.
          </p>
          <Link
            href="/leads/new"
            className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl text-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            Tambah Lead Pertama
          </Link>
        </div>
      ) : viewMode === "kanban" ? (
        /* Kanban View */
        <div className="flex gap-4 overflow-x-auto pb-6 pt-1 items-start min-h-[500px]">
          {KANBAN_STAGES.map((stage) => {
            const stageLeads = filteredLeads.filter((l) => l.status === stage);
            const stageTotalVal = stageLeads.reduce((sum, l) => sum + (Number(l.potential_value) || 0), 0);
            const config = STATUS_CONFIG[stage];

            return (
              <div
                key={stage}
                className="w-80 shrink-0 bg-slate-50/80 border border-slate-200/80 rounded-2xl p-3 flex flex-col max-h-[75vh]"
              >
                {/* Stage Header */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 mb-3 px-1">
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${config.color.replace('text-', 'bg-')}`}></span>
                    <h4 className="font-bold text-sm text-slate-800">{config.label}</h4>
                    <span className="bg-slate-200 text-slate-700 text-xs px-2 py-0.5 rounded-full font-semibold">
                      {stageLeads.length}
                    </span>
                  </div>
                  <span className="text-xs font-semibold text-slate-500">
                    {formatCurrency(stageTotalVal)}
                  </span>
                </div>

                {/* Stage Cards */}
                <div className="space-y-3 overflow-y-auto pr-1 flex-1">
                  {stageLeads.map((lead) => (
                    <div
                      key={lead.id}
                      className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm hover:shadow-md transition-all group"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <Link
                          href={`/leads/${lead.id}`}
                          className="font-bold text-slate-900 hover:text-indigo-600 transition-colors text-base line-clamp-1"
                        >
                          {lead.company_name}
                        </Link>
                        <button
                          onClick={() => handleDelete(lead.id, lead.company_name)}
                          className="text-slate-300 hover:text-rose-500 transition-colors p-1 opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {lead.contact_person && (
                        <p className="text-xs text-slate-600 mt-1 flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          {lead.contact_person}
                        </p>
                      )}

                      {lead.phone && (
                        <p className="text-xs text-slate-600 mt-1 flex items-center gap-1.5">
                          <PhoneCall className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          {lead.phone}
                        </p>
                      )}

                      <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
                        <span className="text-xs font-bold text-indigo-600">
                          {formatCurrency(Number(lead.potential_value) || 0)}
                        </span>

                        <span className="text-[11px] text-slate-500 font-medium truncate max-w-[120px]">
                          {lead.employees?.name || "Unassigned"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Table View */
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4">Perusahaan / Prospek</th>
                  <th className="px-6 py-4">PIC & Kontak</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Potensi Nilai</th>
                  <th className="px-6 py-4">Sales Penanggung Jawab</th>
                  <th className="px-6 py-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLeads.map((lead) => {
                  const statusInfo = STATUS_CONFIG[lead.status];
                  return (
                    <tr key={lead.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-4 font-semibold text-slate-900">
                        <Link href={`/leads/${lead.id}`} className="hover:text-indigo-600 transition-colors">
                          {lead.company_name}
                        </Link>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-slate-800 font-medium">{lead.contact_person || "-"}</div>
                        <div className="text-xs text-slate-400 mt-0.5">{lead.phone || lead.email || "-"}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${statusInfo.badgeBg}`}
                        >
                          {statusInfo.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-bold text-slate-900">
                        {formatCurrency(Number(lead.potential_value) || 0)}
                      </td>
                      <td className="px-6 py-4 text-slate-700">
                        {lead.employees?.name || "-"}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/leads/${lead.id}`}
                            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                            title="Detail Lead"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>
                          <button
                            onClick={() => handleDelete(lead.id, lead.company_name)}
                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                            title="Hapus"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
