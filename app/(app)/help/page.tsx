"use client";

import React, { useState, useMemo, useEffect, useRef, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Layers,
  ShoppingCart,
  Target,
  FileSpreadsheet,
  ClipboardCheck,
  Truck,
  FileText,
  Clock,
  CreditCard,
  Users,
  Briefcase,
  Package,
  Building2,
  Calendar,
  Wallet,
  Grid,
  BookOpen,
  TrendingUp,
  Settings,
  Shield,
  Printer,
  Search,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  HelpCircle,
  Lightbulb,
  ExternalLink,
  ChevronRight,
  Sparkles,
  BookMarked,
  Image as ImageIcon,
  Info,
  Check,
  FileCheck,
  Lock,
  Percent,
  Upload,
  Trash2,
  Loader2,
  RefreshCw,
  ExternalLink as OpenIcon
} from "lucide-react";
import { HELP_CATEGORIES, HELP_TOPICS, HelpTopic } from "./help-data";
import { useBusiness } from "../../../lib/context/BusinessContext";

// Dynamic Lucide Icon Resolver
const renderIcon = (name: string, className: string = "w-5 h-5") => {
  switch (name) {
    case "Layers": return <Layers className={className} />;
    case "ShoppingCart": return <ShoppingCart className={className} />;
    case "Target": return <Target className={className} />;
    case "FileSpreadsheet": return <FileSpreadsheet className={className} />;
    case "ClipboardCheck": return <ClipboardCheck className={className} />;
    case "Truck": return <Truck className={className} />;
    case "FileText": return <FileText className={className} />;
    case "Clock": return <Clock className={className} />;
    case "CreditCard": return <CreditCard className={className} />;
    case "Users": return <Users className={className} />;
    case "Briefcase": return <Briefcase className={className} />;
    case "Package": return <Package className={className} />;
    case "Building2": return <Building2 className={className} />;
    case "Calendar": return <Calendar className={className} />;
    case "Wallet": return <Wallet className={className} />;
    case "Grid": return <Grid className={className} />;
    case "BookOpen": return <BookOpen className={className} />;
    case "TrendingUp": return <TrendingUp className={className} />;
    case "Settings": return <Settings className={className} />;
    case "Shield": return <Shield className={className} />;
    case "Lock": return <Lock className={className} />;
    case "Percent": return <Percent className={className} />;
    case "FileCheck": return <FileCheck className={className} />;
    default: return <BookMarked className={className} />;
  }
};

function HelpCenterContent() {
  const searchParams = useSearchParams();
  const { activeBusiness } = useBusiness();
  const initialTopicId = searchParams.get("topic") || "dashboard";

  const [selectedTopicId, setSelectedTopicId] = useState<string>(initialTopicId);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [printDate, setPrintDate] = useState<string>("");

  // Uploaded screenshots state: { [key: string]: string } where key is `${topicId}_step_${stepNum}`
  const [uploadedScreenshots, setUploadedScreenshots] = useState<Record<string, string>>({});
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Load screenshots from server API on mount (with localStorage automatic migration)
  useEffect(() => {
    const fetchScreenshots = async () => {
      try {
        const res = await fetch("/api/help-center");
        const data = await res.json();
        let serverScreenshots = data.screenshots || {};

        // Check if there are locally cached screenshots in this browser that should be synced to server
        const localSaved = localStorage.getItem("help_center_screenshots");
        if (localSaved) {
          try {
            const localObj = JSON.parse(localSaved);
            const needsSync = Object.keys(localObj).some((k) => !serverScreenshots[k]);
            if (needsSync) {
              const syncRes = await fetch("/api/help-center", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ screenshots: localObj }),
              });
              const syncData = await syncRes.json();
              if (syncData.screenshots) {
                serverScreenshots = syncData.screenshots;
              }
            }
          } catch {}
        }

        setUploadedScreenshots(serverScreenshots);
        localStorage.setItem("help_center_screenshots", JSON.stringify(serverScreenshots));
      } catch (e) {
        console.error("Failed to load help center screenshots from server:", e);
        const saved = localStorage.getItem("help_center_screenshots");
        if (saved) {
          try {
            setUploadedScreenshots(JSON.parse(saved));
          } catch {}
        }
      }
    };

    fetchScreenshots();
  }, []);

  const handleFileUpload = async (topicId: string, stepNumber: number, file: File) => {
    const key = `${topicId}_step_${stepNumber}`;
    setUploadingKey(key);
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "help-center");

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal mengunggah gambar");
      }

      if (data.url) {
        // Persist to server manifest
        const saveRes = await fetch("/api/help-center", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key, url: data.url }),
        });
        const saveData = await saveRes.json();
        const updated = saveData.screenshots || { ...uploadedScreenshots, [key]: data.url };
        
        setUploadedScreenshots(updated);
        localStorage.setItem("help_center_screenshots", JSON.stringify(updated));
      }
    } catch (err: any) {
      console.error("Upload error:", err);
      setUploadError(err.message || "Gagal mengunggah gambar");
      alert(err.message || "Gagal mengunggah gambar. Silakan coba lagi.");
    } finally {
      setUploadingKey(null);
    }
  };

  const handleRemoveImage = async (topicId: string, stepNumber: number) => {
    if (confirm("Apakah Anda yakin ingin menghapus screenshot untuk langkah ini?")) {
      const key = `${topicId}_step_${stepNumber}`;
      try {
        const res = await fetch("/api/help-center", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "delete", key }),
        });
        const data = await res.json();
        const updated = data.screenshots || { ...uploadedScreenshots };
        delete updated[key];
        setUploadedScreenshots(updated);
        localStorage.setItem("help_center_screenshots", JSON.stringify(updated));
      } catch (err) {
        console.error("Failed to remove image from server:", err);
      }
    }
  };

  useEffect(() => {
    const topicParam = searchParams.get("topic");
    if (topicParam && HELP_TOPICS.some((t) => t.id === topicParam)) {
      setSelectedTopicId(topicParam);
    }
  }, [searchParams]);

  useEffect(() => {
    setPrintDate(
      new Date().toLocaleDateString("id-ID", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric"
      })
    );
  }, []);

  // Filter topics based on category and search query
  const filteredTopics = useMemo(() => {
    return HELP_TOPICS.filter((topic) => {
      const matchCategory =
        selectedCategory === "all" || topic.categoryId === selectedCategory;

      if (!matchCategory) return false;

      if (!searchQuery.trim()) return true;

      const q = searchQuery.toLowerCase();
      const inTitle = topic.title.toLowerCase().includes(q);
      const inSummary = topic.summary.toLowerCase().includes(q);
      const inOverview = topic.overview.toLowerCase().includes(q);
      const inCategory = topic.category.toLowerCase().includes(q);
      const inFeatures = topic.keyFeatures.some(
        (f) => f.name.toLowerCase().includes(q) || f.description.toLowerCase().includes(q)
      );

      return inTitle || inSummary || inOverview || inCategory || inFeatures;
    });
  }, [selectedCategory, searchQuery]);

  const currentTopic = useMemo(() => {
    const found = HELP_TOPICS.find((t) => t.id === selectedTopicId);
    return found || HELP_TOPICS[0];
  }, [selectedTopicId]);

  const currentIndex = HELP_TOPICS.findIndex((t) => t.id === currentTopic.id);
  const prevTopic = currentIndex > 0 ? HELP_TOPICS[currentIndex - 1] : null;
  const nextTopic = currentIndex < HELP_TOPICS.length - 1 ? HELP_TOPICS[currentIndex + 1] : null;

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* 1. HERO & SEARCH HEADER (HIDDEN ON PRINT) */}
      <div className="no-print print:hidden bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 md:p-8 shadow-xl border border-indigo-500/20 relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-10 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-xs font-black text-blue-300 uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-blue-300" />
              Pusat Panduan & Dokumentasi
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white">
              Modul Tutorial & Buku Panduan Fitur
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed">
              Pelajari cara menggunakan seluruh fitur aplikasi mulai dari Kasir POS, Manajemen Stok, Penjualan & Invoice, hingga Akuntansi dan Laporan.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <button
              onClick={handlePrint}
              className="px-5 py-3 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-bold rounded-2xl transition shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 text-sm"
              title="Simpan atau cetak modul yang sedang dibuka ke dalam format PDF"
            >
              <Printer className="w-4 h-4" />
              <span>Simpan PDF Modul Ini</span>
            </button>
          </div>
        </div>

        {/* SEARCH BAR */}
        <div className="mt-6 pt-6 border-t border-white/10 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari fitur, menu, atau kata kunci (contoh: Kasir POS, Stok Minus, Buat Invoice, PPN)..."
              className="w-full pl-11 pr-4 py-3 bg-white/10 hover:bg-white/15 focus:bg-white/20 border border-white/15 focus:border-blue-400 rounded-2xl text-white placeholder-slate-400 text-sm font-medium outline-none transition backdrop-blur-md"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white bg-white/10 px-2 py-0.5 rounded-lg"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* CATEGORY FILTER PILLS */}
        <div className="mt-4 flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setSelectedCategory("all")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
              selectedCategory === "all"
                ? "bg-white text-slate-900 shadow-sm"
                : "bg-white/10 text-slate-300 hover:bg-white/15 hover:text-white"
            }`}
          >
            Semua Modul ({HELP_TOPICS.length})
          </button>
          {HELP_CATEGORIES.map((cat) => {
            const count = HELP_TOPICS.filter((t) => t.categoryId === cat.id).length;
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition flex items-center gap-1.5 ${
                  isSelected
                    ? "bg-white text-slate-900 shadow-sm"
                    : "bg-white/10 text-slate-300 hover:bg-white/15 hover:text-white"
                }`}
              >
                {renderIcon(cat.iconName, "w-3.5 h-3.5")}
                <span>{cat.name}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isSelected ? "bg-slate-200 text-slate-900" : "bg-white/10 text-slate-300"}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. MAIN 2-COLUMN LAYOUT (SIDEBAR + CONTENT) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT NAV LIST (HIDDEN ON PRINT) */}
        <div className="no-print print:hidden lg:col-span-4 bg-white border border-slate-200/80 rounded-3xl p-4 shadow-sm flex flex-col gap-3 sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto">
          <div className="flex items-center justify-between px-2 pb-2 border-b border-slate-100">
            <span className="text-xs font-black text-slate-400 uppercase tracking-wider">
              Daftar Modul ({filteredTopics.length})
            </span>
            {searchQuery && (
              <span className="text-[10px] text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded-md">
                Filter Aktif
              </span>
            )}
          </div>

          <div className="space-y-1">
            {filteredTopics.length > 0 ? (
              filteredTopics.map((topic) => {
                const isActive = topic.id === currentTopic.id;
                return (
                  <button
                    key={topic.id}
                    onClick={() => {
                      setSelectedTopicId(topic.id);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className={`w-full text-left p-3 rounded-2xl transition flex items-start gap-3 group ${
                      isActive
                        ? "bg-blue-600 text-white shadow-md shadow-blue-500/20 font-bold"
                        : "text-slate-700 hover:bg-slate-50 hover:text-slate-950"
                    }`}
                  >
                    <div
                      className={`p-2 rounded-xl shrink-0 transition ${
                        isActive
                          ? "bg-white/20 text-white"
                          : "bg-slate-100 text-slate-600 group-hover:bg-slate-200 group-hover:text-slate-900"
                      }`}
                    >
                      {renderIcon(topic.iconName, "w-4 h-4")}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-bold truncate">
                          {topic.title}
                        </span>
                        <span
                          className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded shrink-0 ${
                            isActive
                              ? "bg-white/20 text-white"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {topic.badge}
                        </span>
                      </div>
                      <p
                        className={`text-[11px] truncate mt-0.5 ${
                          isActive ? "text-blue-100" : "text-slate-400"
                        }`}
                      >
                        {topic.summary}
                      </p>
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="p-6 text-center text-slate-400 space-y-2">
                <HelpCircle className="w-8 h-8 mx-auto text-slate-300" />
                <p className="text-xs font-semibold">Tidak ditemukan modul dengan kata kunci tersebut.</p>
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedCategory("all");
                  }}
                  className="text-xs text-blue-600 hover:underline font-bold"
                >
                  Reset Pencarian
                </button>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT CONTENT PANEL / PRINTABLE DOCUMENT */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white border border-slate-200/80 rounded-3xl p-6 md:p-10 shadow-sm space-y-8 print:p-0 print:border-none print:shadow-none print:m-0">
            
            {/* PRINT HEADER: APPLIES ON PDF EXPORT */}
            <div className="hidden print:flex items-center justify-between border-b-2 border-slate-900 pb-4 mb-6">
              <div>
                <div className="text-xs font-black uppercase tracking-wider text-blue-600">
                  {activeBusiness?.name || "Skinet Cloud Enterprise"} • Buku Panduan Pengguna
                </div>
                <h1 className="text-2xl font-black text-slate-950 mt-1">
                  Modul: {currentTopic.title}
                </h1>
                <div className="text-xs text-slate-600 mt-1">
                  Kategori: {currentTopic.category} | Akses: {currentTopic.targetRole}
                </div>
              </div>
              <div className="text-right text-[10px] text-slate-500 font-medium">
                <div>Dokumen Resmi Sistem</div>
                <div className="font-bold text-slate-700">{printDate}</div>
              </div>
            </div>

            {/* SCREEN TOPIC HEADER */}
            <div className="no-print print:hidden flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-100">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/20 shrink-0">
                  {renderIcon(currentTopic.iconName, "w-6 h-6")}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                      {currentTopic.category}
                    </span>
                    <span className="text-[10px] font-bold text-slate-500">
                      Target: {currentTopic.targetRole}
                    </span>
                  </div>
                  <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight mt-1">
                    {currentTopic.title}
                  </h2>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Link
                  href={currentTopic.path}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition flex items-center gap-1.5 shrink-0"
                >
                  <span>Buka Fitur</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
                <button
                  onClick={handlePrint}
                  className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shrink-0 shadow-sm"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Cetak PDF</span>
                </button>
              </div>
            </div>

            {/* RINGKASAN & OVERVIEW */}
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                <div className="text-xs text-slate-700 font-medium leading-relaxed">
                  <strong className="text-slate-900 font-bold block mb-0.5">Ringkasan Modul:</strong>
                  {currentTopic.summary}
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-600" />
                  Gambaran Umum Fitur
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  {currentTopic.overview}
                </p>
              </div>
            </div>

            {/* ALUR KERJA & LANGKAH PENGGUNAAN */}
            <div className="space-y-4 pt-2">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-indigo-600" />
                Alur Kerja & Langkah-Langkah Penggunaan
              </h3>

              <div className="space-y-4">
                {currentTopic.workflow.map((step) => (
                  <div
                    key={step.step}
                    className="p-4 md:p-5 bg-slate-50/70 border border-slate-200/80 rounded-2xl space-y-3 break-inside-avoid print:bg-white print:border-slate-300"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-7 h-7 rounded-xl bg-indigo-600 text-white font-extrabold text-xs flex items-center justify-center shrink-0 shadow-sm">
                        {step.step}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="text-sm font-extrabold text-slate-900">
                          {step.title}
                        </h4>
                        <p className="text-xs text-slate-600 leading-relaxed mt-1">
                          {step.description}
                        </p>
                      </div>
                    </div>

                    {step.tip && (
                      <div className="ml-10 p-2.5 bg-amber-50 border border-amber-200/80 rounded-xl flex items-start gap-2 text-xs text-amber-900">
                        <Lightbulb className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <span><strong>Tips:</strong> {step.tip}</span>
                      </div>
                    )}

                    {/* SCREENSHOT AREA (UPLOADABLE & PRINT-OPTIMIZED) */}
                    {step.screenshotPlaceholder && (() => {
                      const stepKey = `${currentTopic.id}_step_${step.step}`;
                      const imageUrl = uploadedScreenshots[stepKey];
                      const isUploading = uploadingKey === stepKey;

                      if (imageUrl) {
                        return (
                          <div className="ml-10 mt-3 rounded-2xl border border-slate-200 bg-slate-900/5 p-2 overflow-hidden space-y-2 group relative">
                            {/* Image Preview Container */}
                            <div className="relative rounded-xl overflow-hidden bg-slate-950 flex items-center justify-center min-h-[180px] max-h-[500px]">
                              <img
                                src={imageUrl}
                                alt={step.screenshotPlaceholder.caption || step.title}
                                className="w-full h-auto max-h-[500px] object-contain rounded-lg"
                              />

                              {/* Action Overlay (Hidden on Print) */}
                              <div className="no-print print:hidden absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2 p-4">
                                <label className="cursor-pointer px-3.5 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-lg flex items-center gap-1.5 transition">
                                  <Upload className="w-3.5 h-3.5" />
                                  <span>Ganti Gambar</span>
                                  <input
                                    type="file"
                                    accept="image/png,image/jpeg,image/webp,image/gif"
                                    className="hidden"
                                    disabled={isUploading}
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) handleFileUpload(currentTopic.id, step.step, file);
                                    }}
                                  />
                                </label>

                                <a
                                  href={imageUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="px-3.5 py-2 bg-white/20 hover:bg-white/30 active:scale-95 text-white font-bold text-xs rounded-xl shadow-lg flex items-center gap-1.5 backdrop-blur-md transition"
                                >
                                  <OpenIcon className="w-3.5 h-3.5" />
                                  <span>Lihat Asli</span>
                                </a>

                                <button
                                  type="button"
                                  onClick={() => handleRemoveImage(currentTopic.id, step.step)}
                                  className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-lg flex items-center gap-1.5 transition"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span>Hapus</span>
                                </button>
                              </div>
                            </div>

                            {/* Caption Footer */}
                            <div className="px-2 py-1 flex items-center justify-between text-xs">
                              <span className="font-semibold text-slate-700">
                                📷 {step.screenshotPlaceholder.caption}
                              </span>
                              <span className="no-print print:hidden text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                Tersimpan
                              </span>
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div className="ml-10 mt-3 relative">
                          <label
                            className={`block border-2 border-dashed rounded-2xl p-5 text-center transition cursor-pointer group ${
                              isUploading
                                ? "bg-blue-50/50 border-blue-400 cursor-wait"
                                : "bg-slate-50/80 hover:bg-blue-50/30 border-slate-300 hover:border-blue-500"
                            }`}
                          >
                            <input
                              type="file"
                              accept="image/png,image/jpeg,image/webp,image/gif"
                              className="hidden"
                              disabled={isUploading}
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleFileUpload(currentTopic.id, step.step, file);
                              }}
                            />

                            {isUploading ? (
                              <div className="py-3 flex flex-col items-center justify-center gap-2">
                                <Loader2 className="w-7 h-7 text-blue-600 animate-spin" />
                                <span className="text-xs font-bold text-blue-700">
                                  Mengunggah screenshot ke server lokal...
                                </span>
                              </div>
                            ) : (
                              <div className="space-y-2">
                                <div className="w-10 h-10 rounded-xl bg-blue-100/80 text-blue-600 mx-auto flex items-center justify-center group-hover:scale-110 group-hover:bg-blue-600 group-hover:text-white transition">
                                  <Upload className="w-5 h-5" />
                                </div>
                                <div>
                                  <div className="text-xs font-bold text-slate-800 group-hover:text-blue-700 transition">
                                    Unggah Screenshot: {step.screenshotPlaceholder.caption}
                                  </div>
                                  <div className="text-[11px] text-slate-500 max-w-md mx-auto mt-0.5 leading-normal">
                                    {step.screenshotPlaceholder.description}
                                  </div>
                                </div>
                                <div className="inline-flex items-center gap-1.5 text-[10px] text-blue-700 font-extrabold bg-blue-100/60 px-3 py-1 rounded-full group-hover:bg-blue-600 group-hover:text-white transition">
                                  <Upload className="w-3 h-3" />
                                  <span>Klik di sini untuk memilih file screenshot (PNG / JPG / WebP)</span>
                                </div>
                              </div>
                            )}
                          </label>
                        </div>
                      );
                    })()}
                  </div>
                ))}
              </div>
            </div>

            {/* FITUR UTAMA */}
            <div className="space-y-4 pt-2 break-inside-avoid">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-600" />
                Daftar Fitur & Kemampuan Utama
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {currentTopic.keyFeatures.map((feat, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 bg-slate-50/50 border border-slate-200/70 rounded-2xl flex items-start gap-3"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <div className="text-xs font-bold text-slate-900">{feat.name}</div>
                      <div className="text-[11px] text-slate-500 leading-normal mt-0.5">
                        {feat.description}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* TIPS & BEST PRACTICES */}
            {currentTopic.tipsAndTricks.length > 0 && (
              <div className="p-4 bg-emerald-50/60 border border-emerald-200/80 rounded-2xl space-y-2 break-inside-avoid">
                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-emerald-900">
                  <Check className="w-4 h-4 text-emerald-600" />
                  Tips & Rekomendasi Penggunaan
                </div>
                <ul className="list-disc list-inside text-xs text-emerald-950 space-y-1 pl-1">
                  {currentTopic.tipsAndTricks.map((tip, idx) => (
                    <li key={idx} className="leading-relaxed font-medium">
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* FAQ */}
            {currentTopic.faq.length > 0 && (
              <div className="space-y-3 pt-2 break-inside-avoid">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-purple-600" />
                  Pertanyaan Sering Ditanyakan (FAQ)
                </h3>

                <div className="space-y-2">
                  {currentTopic.faq.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl text-xs space-y-1"
                    >
                      <div className="font-extrabold text-slate-900 flex items-start gap-2">
                        <HelpCircle className="w-3.5 h-3.5 text-purple-600 shrink-0 mt-0.5" />
                        <span>{item.question}</span>
                      </div>
                      <div className="pl-5 text-slate-600 leading-relaxed">
                        {item.answer}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* BOTTOM PREV / NEXT NAVIGATION (HIDDEN ON PRINT) */}
            <div className="no-print print:hidden pt-8 border-t border-slate-100 flex items-center justify-between gap-4">
              {prevTopic ? (
                <button
                  onClick={() => {
                    setSelectedTopicId(prevTopic.id);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-2xl border border-slate-200 hover:bg-slate-50 transition text-xs font-bold text-slate-700"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <div className="text-left">
                    <div className="text-[10px] text-slate-400 uppercase">Sebelumnya</div>
                    <div className="font-extrabold text-slate-900">{prevTopic.title}</div>
                  </div>
                </button>
              ) : (
                <div />
              )}

              {nextTopic && (
                <button
                  onClick={() => {
                    setSelectedTopicId(nextTopic.id);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 transition text-xs font-bold text-white shadow-sm shadow-blue-500/20"
                >
                  <div className="text-right">
                    <div className="text-[10px] text-blue-200 uppercase">Selanjutnya</div>
                    <div className="font-extrabold text-white">{nextTopic.title}</div>
                  </div>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* PRINT FOOTER (PDF ONLY) */}
            <div className="hidden print:block pt-8 mt-8 border-t border-slate-300 text-center text-[10px] text-slate-400">
              © {new Date().getFullYear()} {activeBusiness?.name || "Skinet Enterprise"}. Seluruh hak cipta dilindungi undang-undang. Dicetak pada {printDate}.
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

export default function HelpCenterPage() {
  return (
    <Suspense fallback={
      <div className="p-8 text-center text-slate-500">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
        <span className="text-xs font-bold">Memuat Pusat Bantuan...</span>
      </div>
    }>
      <HelpCenterContent />
    </Suspense>
  );
}
