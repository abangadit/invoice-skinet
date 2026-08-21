"use client";

import React, { useEffect, useState } from "react";
import { 
  ArrowLeft, 
  History, 
  Search, 
  Filter, 
  Calendar,
  ChevronDown, 
  ChevronUp, 
  User, 
  Database,
  ArrowRight,
  RefreshCw,
  Copy,
  CheckCircle,
  FileText
} from "lucide-react";
import Link from "next/link";
import { useBusiness } from "../../../../lib/context/BusinessContext";
import { createWebBrowserClient } from "../../../../lib/supabase/client";
import { useLanguage } from "../../../../lib/context/LanguageContext";

interface AuditLog {
  id: string;
  user_id: string | null;
  action_type: "INSERT" | "UPDATE" | "DELETE";
  table_name: string;
  record_id: string;
  old_data: Record<string, any> | null;
  new_data: Record<string, any> | null;
  created_at: string;
  user_email?: string; // Diisi setelah di-fetch
}

export default function AuditLogsPage() {
  const { activeBusiness } = useBusiness();
  const { locale, t } = useLanguage();
  
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Filters
  const [actionFilter, setActionFilter] = useState<string>("ALL");
  const [tableFilter, setTableFilter] = useState<string>("ALL");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const itemsPerPage = 15;

  // UI Expander States
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  const fetchAuditLogs = async (page = 1, isRefresh = false) => {
    if (!activeBusiness) return;
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const supabase = createWebBrowserClient();
      
      let query = supabase
        .from("audit_logs")
        .select("*")
        .eq("business_id", activeBusiness.id)
        .order("created_at", { ascending: false });

      // Apply Filters
      if (actionFilter !== "ALL") {
        query = query.eq("action_type", actionFilter);
      }
      if (tableFilter !== "ALL") {
        query = query.eq("table_name", tableFilter);
      }

      // Range Pagination
      const from = (page - 1) * itemsPerPage;
      const to = from + itemsPerPage;
      query = query.range(from, to);

      const { data, error } = await query;

      if (error) throw error;

      const fetchedLogs: AuditLog[] = data || [];
      
      // Ambil user email terkait untuk tampilan lebih human-readable
      const logsWithEmails = await Promise.all(
        fetchedLogs.map(async (log) => {
          if (!log.user_id) return { ...log, user_email: "System / DB Trigger" };
          
          // Query users table (mirrors auth.users)
          const { data: userData } = await supabase
            .from("users")
            .select("email")
            .eq("id", log.user_id)
            .single();

          return {
            ...log,
            user_email: userData?.email || `User (${log.user_id.slice(0, 8)}...)`
          };
        })
      );

      if (page === 1) {
        setLogs(logsWithEmails.slice(0, itemsPerPage));
      } else {
        setLogs(prev => [...prev, ...logsWithEmails.slice(0, itemsPerPage)]);
      }

      setHasMore(logsWithEmails.length > itemsPerPage);
    } catch (err) {
      console.error("Error loading audit logs:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    setCurrentPage(1);
    fetchAuditLogs(1);
  }, [activeBusiness, actionFilter, tableFilter]);

  const handleRefresh = () => {
    setCurrentPage(1);
    fetchAuditLogs(1, true);
  };

  const loadMore = () => {
    const nextPage = currentPage + 1;
    setCurrentPage(nextPage);
    fetchAuditLogs(nextPage);
  };

  const handleCopy = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Komparator visual perbedaan data sebelum dan sesudah perubahan
  const renderDataDiff = (log: AuditLog) => {
    const oldData = log.old_data || {};
    const newData = log.new_data || {};
    
    // Gabungkan seluruh key unik
    const allKeys = Array.from(new Set([...Object.keys(oldData), ...Object.keys(newData)]))
      .filter(key => key !== "updated_at" && key !== "created_at"); // Saring meta-columns

    const changes = allKeys.map(key => {
      const oldVal = oldData[key];
      const newVal = newData[key];
      
      // Jika bernilai object/array, ubah ke string JSON
      const formatVal = (val: any) => {
        if (val === null || val === undefined) return "NULL";
        if (typeof val === "object") return JSON.stringify(val);
        return String(val);
      };

      const hasChanged = formatVal(oldVal) !== formatVal(newVal);

      return {
        key,
        oldVal: formatVal(oldVal),
        newVal: formatVal(newVal),
        hasChanged
      };
    });

    // Urutkan agar field yang berubah muncul paling atas
    changes.sort((a, b) => (b.hasChanged ? 1 : 0) - (a.hasChanged ? 1 : 0));

    return (
      <div className="bg-slate-900 text-slate-100 rounded-xl p-4 font-mono text-xs overflow-x-auto space-y-2 border border-slate-800">
        <div className="flex justify-between border-b border-slate-800 pb-2 mb-2 text-slate-400 font-sans font-bold">
          <span>Kolom / Field</span>
          <span className="hidden sm:inline">Perbandingan Data</span>
        </div>
        <div className="space-y-2.5">
          {changes.map(({ key, oldVal, newVal, hasChanged }) => {
            if (log.action_type === "INSERT") {
              return (
                <div key={key} className="flex flex-col sm:flex-row sm:justify-between py-1 border-b border-slate-800/30">
                  <span className="text-emerald-400 font-semibold">{key}:</span>
                  <span className="text-slate-300 max-w-md truncate">{newVal}</span>
                </div>
              );
            }
            if (log.action_type === "DELETE") {
              return (
                <div key={key} className="flex flex-col sm:flex-row sm:justify-between py-1 border-b border-slate-800/30">
                  <span className="text-rose-400 font-semibold">{key}:</span>
                  <span className="text-slate-500 line-through max-w-md truncate">{oldVal}</span>
                </div>
              );
            }
            // UPDATE
            return (
              <div 
                key={key} 
                className={`flex flex-col py-1 border-b border-slate-800/30 ${
                  hasChanged ? "bg-blue-950/20 px-2 rounded-lg border-l-2 border-l-blue-500" : "opacity-60"
                }`}
              >
                <span className="font-semibold text-slate-300 mb-1">{key}</span>
                <div className="flex flex-wrap items-center gap-2 text-[11px]">
                  <span className="text-rose-400 bg-rose-950/40 px-1.5 py-0.5 rounded truncate max-w-xs">{oldVal}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span className="text-emerald-400 bg-emerald-950/40 px-1.5 py-0.5 rounded truncate max-w-xs">{newVal}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const getActionBadge = (type: "INSERT" | "UPDATE" | "DELETE") => {
    switch (type) {
      case "INSERT":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-extrabold tracking-wide uppercase bg-emerald-50 text-emerald-600 border border-emerald-100">
            Tambah
          </span>
        );
      case "UPDATE":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-extrabold tracking-wide uppercase bg-blue-50 text-blue-600 border border-blue-100">
            Ubah
          </span>
        );
      case "DELETE":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-extrabold tracking-wide uppercase bg-rose-50 text-rose-600 border border-rose-100">
            Hapus
          </span>
        );
    }
  };

  const getTableNameFriendly = (table: string) => {
    switch (table) {
      case "items":
        return "Katalog Produk";
      case "vendors":
        return "Pemasok (Vendor)";
      case "invoices":
        return "Faktur (Invoice)";
      case "payments":
        return "Pembayaran";
      default:
        return table;
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-slate-200 pb-4">
        <Link 
          href="/settings"
          className="p-2 text-slate-400 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <History className="w-6 h-6 text-blue-600" /> {locale === "en" ? "Audit Trail Logs" : "Log Audit Aktivitas"}
          </h2>
          <p className="text-sm text-slate-500 mt-0.5 font-medium">
            {locale === "en" 
              ? "Track modifications, creation, and deletions of business catalog and invoices." 
              : "Pantau riwayat penambahan, pengubahan, dan penghapusan data secara transparan."}
          </p>
        </div>

        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="p-2.5 text-slate-600 hover:text-slate-900 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition shadow-xs flex items-center gap-1.5 text-xs font-bold"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
          <span>{locale === "en" ? "Refresh" : "Perbarui"}</span>
        </button>
      </div>

      {/* Filter panel */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-wrap gap-4 items-center justify-between">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider">
            <Filter className="w-4.5 h-4.5 text-blue-600" /> Filter:
          </div>
          
          {/* Action Filter */}
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="bg-slate-50 hover:bg-slate-100 border border-slate-200 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 focus:outline-none cursor-pointer transition"
          >
            <option value="ALL">Semua Aksi</option>
            <option value="INSERT">Tambah (INSERT)</option>
            <option value="UPDATE">Ubah (UPDATE)</option>
            <option value="DELETE">Hapus (DELETE)</option>
          </select>

          {/* Table Filter */}
          <select
            value={tableFilter}
            onChange={(e) => setTableFilter(e.target.value)}
            className="bg-slate-50 hover:bg-slate-100 border border-slate-200 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 focus:outline-none cursor-pointer transition"
          >
            <option value="ALL">Semua Tabel</option>
            <option value="items">Katalog Produk (items)</option>
            <option value="vendors">Vendor (vendors)</option>
            <option value="invoices">Invoice (invoices)</option>
            <option value="payments">Pembayaran (payments)</option>
          </select>
        </div>

        <span className="text-[10px] text-slate-400 font-mono">
          Supabase Audit Engine v1.0
        </span>
      </div>

      {/* Logs Table / List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 bg-white border border-slate-200 rounded-2xl shadow-sm">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs text-slate-500 font-semibold mt-2">Membaca log riwayat aktivitas...</p>
        </div>
      ) : logs.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-400 shadow-sm">
          <Database className="w-12 h-12 mx-auto text-slate-200 mb-3" />
          <p className="text-sm font-semibold">Belum ada log aktivitas yang tercatat</p>
          <p className="text-xs text-slate-400 mt-1">
            Log akan otomatis terisi saat staf Anda menambah/mengubah data katalog, vendor, atau tagihan.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {logs.map((log) => {
            const isExpanded = expandedLogId === log.id;
            const logDate = new Date(log.created_at);
            
            return (
              <div 
                key={log.id} 
                className={`bg-white border border-slate-200 rounded-2xl overflow-hidden transition shadow-xs hover:border-slate-300 ${
                  isExpanded ? "ring-1 ring-blue-500/20 border-blue-300" : ""
                }`}
              >
                {/* Header baris log */}
                <div 
                  onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                  className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer select-none hover:bg-slate-50/50"
                >
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="p-2 bg-slate-50 border border-slate-100 rounded-xl shrink-0 mt-0.5">
                      <User className="w-4 h-4 text-slate-500" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-bold text-slate-800 truncate max-w-[200px] sm:max-w-xs" title={log.user_email}>
                          {log.user_email}
                        </span>
                        {getActionBadge(log.action_type)}
                        <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 border border-slate-200 rounded text-[9px] font-bold">
                          {getTableNameFriendly(log.table_name)}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-1.5 mt-1 text-[11px] text-slate-500 font-medium">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>
                          {logDate.toLocaleString("id-ID", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit"
                          })}
                        </span>
                        <span className="text-slate-300">•</span>
                        <span className="font-mono text-[10px] text-slate-400 shrink-0">
                          ID: {log.record_id.slice(0, 8)}...
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between md:justify-end gap-3 shrink-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopy(log.record_id);
                      }}
                      className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded-lg transition"
                      title="Salin Record ID"
                    >
                      {copiedId === log.record_id ? (
                        <CheckCircle className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                    
                    <button className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 transition">
                      <span>{isExpanded ? "Tutup Detail" : "Lihat Detail"}</span>
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Bagian detail data yang terekspansi */}
                {isExpanded && (
                  <div className="border-t border-slate-100 bg-slate-50/50 p-4 space-y-3">
                    <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
                      <span>Full Record ID: {log.record_id}</span>
                      <span>Log ID: {log.id}</span>
                    </div>
                    {renderDataDiff(log)}
                  </div>
                )}
              </div>
            );
          })}

          {/* Load More Button */}
          {hasMore && (
            <div className="flex justify-center pt-2">
              <button
                onClick={loadMore}
                className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold py-2.5 px-6 rounded-xl text-xs shadow-xs transition"
              >
                Tampilkan Log Lebih Banyak
              </button>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
