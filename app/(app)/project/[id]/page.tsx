"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { 
  ArrowLeft, 
  Briefcase, 
  Calendar, 
  Clock, 
  Plus, 
  Trash2, 
  Edit2, 
  FolderKanban, 
  FileText,
  Package,
  Trash
} from "lucide-react";
import { useBusiness } from "../../../../lib/context/BusinessContext";
import { createWebBrowserClient } from "../../../../lib/supabase/client";
import { uploadFileToR2 } from "../../../../lib/utils/upload";

interface Milestone {
  id: string;
  name: string;
  description: string | null;
  sort_order: number;
  status: "pending" | "in_progress" | "completed" | "invoiced";
  billing_type: "fixed" | "percentage";
  billing_amount: number;
  billing_percentage: number;
  due_date: string | null;
  progress_percent: number;
  attachments: Array<{ name: string; url: string; type: string }> | null;
}

interface TimeLog {
  id: string;
  employee_id: string | null;
  description: string | null;
  log_date: string;
  hours: number;
  billable: boolean;
  hourly_rate: number;
  employee?: {
    id: string;
    name: string;
  };
}

interface LinkedInvoice {
  id: string;
  invoice_number: string;
  status: string;
  total_amount: number;
  issue_date: string;
  milestone_id: string | null;
}

interface LinkedPO {
  id: string;
  po_number: string;
  status: string;
  total_amount: number;
  vendor_snapshot: any;
  milestone_id: string | null;
}

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
  customer_id: string | null;
  customer: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    address: string | null;
  } | null;
  initial_documents: Array<{ name: string; url: string }> | null;
}

interface Employee {
  id: string;
  name: string;
}

export default function ProjectDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { activeBusiness } = useBusiness();

  const [project, setProject] = useState<Project | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [timeLogs, setTimeLogs] = useState<TimeLog[]>([]);
  const [invoices, setInvoices] = useState<LinkedInvoice[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<LinkedPO[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [activeTab, setActiveTab] = useState<"milestones" | "pos">("milestones");

  // Modals state
  const [showMilestoneModal, setShowMilestoneModal] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState<Milestone | null>(null);
  const [msName, setMsName] = useState("");
  const [msDesc, setMsDesc] = useState("");
  const [msBillingType, setMsBillingType] = useState<"fixed" | "percentage">("fixed");
  const [msBillingAmt, setMsBillingAmt] = useState<number | "">("");
  const [msBillingPct, setMsBillingPct] = useState<number | "">("");
  const [msDueDate, setMsDueDate] = useState("");
  const [msStatus, setMsStatus] = useState<"pending" | "in_progress" | "completed" | "invoiced">("pending");
  const [msProgressPercent, setMsProgressPercent] = useState<number>(0);
  const [msAttachments, setMsAttachments] = useState<Array<{ name: string; url: string; type: string }>>([]);
  const [uploadingMsFile, setUploadingMsFile] = useState(false);

  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [submittingMilestone, setSubmittingMilestone] = useState(false);

  const fetchProjectData = async () => {
    if (!activeBusiness || !id) return;
    try {
      setLoading(true);
      const supabase = createWebBrowserClient();

      // 1. Fetch Project Details
      const { data: projData, error: projErr } = await supabase
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
          customer_id,
          customer:customers(id, name, email, phone, address),
          initial_documents
        `)
        .eq("id", id)
        .single();

      if (projErr) throw projErr;
      
      const formattedProj = {
        ...projData,
        customer: Array.isArray(projData.customer) ? projData.customer[0] : projData.customer
      } as Project;

      setProject(formattedProj);

      // 2. Fetch Milestones
      const { data: msData, error: msErr } = await supabase
        .from("project_milestones")
        .select("*")
        .eq("project_id", id)
        .order("sort_order", { ascending: true });

      if (msErr) throw msErr;
      const loadedMilestones = msData || [];
      setMilestones(loadedMilestones);

      // Auto-reconcile project progress on load if database value is stale
      const computedProgress = loadedMilestones.length > 0
        ? Math.max(...loadedMilestones.map(m => m.progress_percent || 0))
        : 0;

      if (formattedProj.progress_percent !== computedProgress) {
        await supabase
          .from("projects")
          .update({ progress_percent: computedProgress })
          .eq("id", formattedProj.id);
        formattedProj.progress_percent = computedProgress;
        setProject({ ...formattedProj });
      }

      // 3. Fetch Linked Invoices
      const { data: invData, error: invErr } = await supabase
        .from("invoices")
        .select("id, invoice_number, status, total_amount, issue_date, milestone_id")
        .eq("project_id", id)
        .eq("type", "invoice");

      if (invErr) throw invErr;
      setInvoices(invData || []);

      // 4. Fetch Linked POs
      const { data: poData, error: poErr } = await supabase
        .from("purchase_orders")
        .select("id, po_number, status, total_amount, vendor_snapshot, milestone_id")
        .eq("project_id", id);

      if (poErr) throw poErr;
      setPurchaseOrders(poData || []);

    } catch (err) {
      console.error("Error loading project detail details:", err);
      alert("Gagal memuat detail proyek.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjectData();
  }, [activeBusiness, id]);

  const handleUpdateStatus = async (newStatus: string) => {
    if (!project) return;
    try {
      setUpdatingStatus(true);
      const supabase = createWebBrowserClient();
      const { error } = await supabase
        .from("projects")
        .update({ status: newStatus })
        .eq("id", project.id);

      if (error) throw error;
      setProject({ ...project, status: newStatus as any });
      alert("Status proyek berhasil diperbarui.");
    } catch (err) {
      console.error("Error updating project status:", err);
      alert("Gagal memperbarui status proyek.");
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleOpenMilestoneModal = (ms: Milestone | null) => {
    if (ms) {
      setEditingMilestone(ms);
      setMsName(ms.name);
      setMsDesc(ms.description || "");
      setMsBillingType(ms.billing_type);
      setMsBillingAmt(ms.billing_amount || "");
      setMsBillingPct(ms.billing_percentage || "");
      setMsDueDate(ms.due_date || "");
      setMsStatus(ms.status === "invoiced" ? "invoiced" : ms.status);
      setMsProgressPercent(ms.progress_percent || 0);
      setMsAttachments(ms.attachments || []);
    } else {
      setEditingMilestone(null);
      setMsName("");
      setMsDesc("");
      setMsBillingType("fixed");
      setMsBillingAmt("");
      setMsBillingPct("");
      setMsDueDate("");
      setMsStatus("pending");
      setMsProgressPercent(0);
      setMsAttachments([]);
    }
    setShowMilestoneModal(true);
  };

  const syncProjectProgress = async (currentMilestones: Milestone[]) => {
    if (!project) return;
    const progress = currentMilestones.length > 0
      ? Math.max(...currentMilestones.map(m => m.progress_percent || 0))
      : 0;
    
    const supabase = createWebBrowserClient();
    await supabase.from("projects").update({ progress_percent: progress }).eq("id", project.id);
    setProject({ ...project, progress_percent: progress });
  };

  const handleMsFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (files.length === 0) return;
    
    setUploadingMsFile(true);
    for (const file of files) {
      try {
        const fileUrl = await uploadFileToR2(file, "projects/milestones");
        setMsAttachments(prev => [...prev, { name: file.name, url: fileUrl, type: file.type }]);
      } catch (err: any) {
        console.error("Gagal mengunggah file milestone:", err);
        alert(`Gagal mengunggah ${file.name}: ${err.message || "Error"}`);
      }
    }
    setUploadingMsFile(false);
  };

  const handleSaveMilestone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!project || submittingMilestone) return;

    if (!msName.trim()) {
      alert("Nama milestone wajib diisi!");
      return;
    }

    try {
      setSubmittingMilestone(true);
      const supabase = createWebBrowserClient();

      const finalBillingAmt = msBillingType === "percentage" && project.budget_amount > 0 && msBillingPct !== ""
        ? (project.budget_amount * Number(msBillingPct)) / 100
        : msBillingAmt === "" ? 0 : Number(msBillingAmt);

      // Auto-set status on progress logic:
      // If progress is 100%, and status is pending/in_progress, auto-set to completed
      let determinedStatus = msStatus;
      if (msProgressPercent === 100 && (msStatus === "pending" || msStatus === "in_progress")) {
        determinedStatus = "completed";
      } else if (msProgressPercent > 0 && msProgressPercent < 100 && msStatus === "pending") {
        determinedStatus = "in_progress";
      }

      const payload = {
        project_id: project.id,
        name: msName.trim(),
        description: msDesc.trim() || null,
        billing_type: msBillingType,
        billing_amount: finalBillingAmt,
        billing_percentage: msBillingPct === "" ? 0 : Number(msBillingPct),
        due_date: msDueDate || null,
        status: determinedStatus,
        progress_percent: msProgressPercent,
        attachments: msAttachments
      };

      let updatedMsList = [...milestones];

      if (editingMilestone) {
        // Update milestone
        const { error } = await supabase
          .from("project_milestones")
          .update({
            ...payload,
            status: editingMilestone.status === "invoiced" ? "invoiced" : determinedStatus
          })
          .eq("id", editingMilestone.id);

        if (error) throw error;
        updatedMsList = updatedMsList.map(m => m.id === editingMilestone.id ? { ...m, ...payload, status: m.status === "invoiced" ? "invoiced" : determinedStatus } : m);
      } else {
        // Insert new milestone
        const { data, error } = await supabase
          .from("project_milestones")
          .insert({
            ...payload,
            sort_order: milestones.length
          })
          .select()
          .single();

        if (error) throw error;
        updatedMsList.push(data);
      }

      setMilestones(updatedMsList);
      await syncProjectProgress(updatedMsList);
      setShowMilestoneModal(false);
      alert("Milestone berhasil disimpan!");
    } catch (err) {
      console.error("Error saving milestone:", err);
      alert("Gagal menyimpan milestone.");
    } finally {
      setSubmittingMilestone(false);
    }
  };

  const handleDeleteMilestone = async (msId: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus milestone ini?")) return;
    try {
      const supabase = createWebBrowserClient();
      const { error } = await supabase.from("project_milestones").delete().eq("id", msId);
      if (error) throw error;

      const updatedMsList = milestones.filter(m => m.id !== msId);
      setMilestones(updatedMsList);
      await syncProjectProgress(updatedMsList);
      alert("Milestone berhasil dihapus.");
    } catch (err) {
      console.error("Error deleting milestone:", err);
      alert("Gagal menghapus milestone.");
    }
  };



  const formatCurrency = (val: number, currencyCode: string = "IDR") => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: currencyCode || "IDR",
      maximumFractionDigits: 0
    }).format(val);
  };

  if (loading || !project) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center font-sans">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs text-slate-500 font-semibold mt-2">Memuat detail proyek...</p>
      </div>
    );
  }

  // Financial Calculations (Live calculated from child tables)
  const totalBudget = project.budget_amount;
  const totalInvoiced = invoices.reduce((sum, inv) => sum + Number(inv.total_amount || 0), 0);
  const totalPaid = invoices
    .filter(inv => inv.status === "paid")
    .reduce((sum, inv) => sum + Number(inv.total_amount || 0), 0);

  const materialCost = purchaseOrders
    .filter(po => ["received", "confirmed"].includes(po.status))
    .reduce((sum, po) => sum + Number(po.total_amount || 0), 0);

  const totalCost = project.project_type === "service_goods" ? materialCost : 0;
  const netProfit = totalInvoiced - totalCost;
  const profitMarginPercent = totalInvoiced > 0 ? Math.round((netProfit / totalInvoiced) * 100) : 0;

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6">
      
      {/* Breadcrumb & Navigation Actions */}
      <div className="flex justify-between items-center">
        <button 
          onClick={() => router.push("/project")}
          className="flex items-center gap-1 text-xs text-slate-500 hover:text-blue-600 transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Daftar Proyek
        </button>
      </div>

      {/* Project Main Header Info Card */}
      <div className="bg-white border border-slate-150 rounded-3xl p-6 shadow-xs relative overflow-hidden">
        {/* Decorative backdrop glow */}
        <div className="absolute right-0 top-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row justify-between items-start gap-4">
          <div className="space-y-3 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-widest bg-slate-100 px-2 py-0.5 rounded-md">
                {project.project_number}
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 border rounded-full uppercase`}>
                {project.project_type === "service" ? "💻 Pure Jasa" : "🏗️ Jasa + Material"}
              </span>
              <span className={`text-[10px] font-bold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full capitalize`}>
                {project.priority} priority
              </span>
            </div>

            <h1 className="text-2xl font-black text-slate-800 leading-snug">
              {project.name}
            </h1>

            {project.description && (
              <p className="text-xs text-slate-500 leading-relaxed whitespace-pre-line max-w-2xl">
                {project.description}
              </p>
            )}

            {/* Dates */}
            <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-slate-500 pt-1">
              {project.start_date && (
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  Mulai: <strong>{project.start_date}</strong>
                </div>
              )}
              {project.target_end_date && (
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  Target Selesai: <strong>{project.target_end_date}</strong>
                </div>
              )}
            </div>
          </div>

          {/* Status Change Selector & Actions */}
          <div className="flex flex-col items-start md:items-end gap-3 shrink-0">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const shareUrl = `${window.location.origin}/p/${project.id}`;
                  navigator.clipboard.writeText(shareUrl);
                  alert("Link public project berhasil disalin ke clipboard:\n" + shareUrl);
                }}
                className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-600 font-bold rounded-xl text-xs flex items-center gap-1.5 transition shadow-xs"
              >
                🔗 Share Link Project
              </button>

              <select
                disabled={updatingStatus}
                className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                value={project.status}
                onChange={(e) => handleUpdateStatus(e.target.value)}
              >
                <option value="draft">Draft</option>
                <option value="active">Aktif</option>
                <option value="on_hold">Ditunda</option>
                <option value="completed">Selesai</option>
                <option value="cancelled">Dibatalkan</option>
              </select>
            </div>
            
            {/* Dynamic Progress indicator */}
            <div className="w-40 space-y-1 text-right">
              <div className="flex justify-between text-xs">
                <span className="font-bold text-slate-400">Progress</span>
                <span className="font-black text-slate-800">{project.progress_percent}%</span>
              </div>
              <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-600 rounded-full transition-all duration-300"
                  style={{ width: `${project.progress_percent}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* CSS untuk Animasi Download Shimmer Stripe */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes shimmer {
          0% { background-position: 0 0; }
          100% { background-position: 40px 0; }
        }
        .animate-shimmer {
          animation: shimmer 1.5s linear infinite;
        }
        .bg-stripes {
          background-image: linear-gradient(
            45deg,
            rgba(255, 255, 255, 0.15) 25%,
            transparent 25%,
            transparent 50%,
            rgba(255, 255, 255, 0.15) 50%,
            rgba(255, 255, 255, 0.15) 75%,
            transparent 75%,
            transparent
          );
          background-size: 40px 40px;
        }
      `}} />

      {/* Interactive Milestone Progress Bar (Download Bar Style) */}
      <div className="bg-white border border-slate-150 rounded-3xl p-6 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 pb-4">
          <div>
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
              <span className="w-2.5 h-2.5 bg-blue-600 rounded-full animate-pulse" />
              Progres Pengerjaan Proyek & Milestone
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Klik penanda milestone (ikon panah) untuk melihat atau mengedit progres secara langsung.
            </p>
          </div>
          <div className="flex items-center gap-1.5 bg-blue-50 px-3 py-1.5 rounded-xl border border-blue-100">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Progress</span>
            <span className="text-sm font-black text-blue-700">{project.progress_percent}%</span>
          </div>
        </div>

        {/* The Download-style Bar Container */}
        <div className="relative pt-10 pb-6 px-4 select-none">
          {/* Main Track */}
          <div className="relative w-full h-4 bg-slate-100 rounded-full border border-slate-200 overflow-visible shadow-inner flex items-center">
            {/* Filled Progress with Glowing animated stripes */}
            <div 
              className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full transition-all duration-500 relative flex items-center justify-end overflow-hidden"
              style={{ width: `${project.progress_percent}%` }}
            >
              {/* Animated Shimmer stripes overlay resembling a download process */}
              <div className="absolute inset-0 bg-stripes opacity-20 animate-shimmer w-full h-full" />
            </div>

            {/* Render Milestone Pins on the Bar */}
            {milestones.map((ms, index) => {
              const position = ms.progress_percent || 0;
              
              const isCompleted = ms.status === "completed" || ms.status === "invoiced";
              const isInProgress = ms.status === "in_progress";
              
              return (
                <div 
                  key={ms.id}
                  className="absolute transform -translate-x-1/2 flex flex-col items-center group cursor-pointer"
                  style={{ left: `${position}%` }}
                  onClick={() => handleOpenMilestoneModal(ms)}
                >
                  {/* Vertical Tick Mark intersecting the bar */}
                  <div className={`w-0.5 h-6 border-l-2 border-dashed z-10 -mt-1 ${
                    isCompleted ? "border-emerald-500" : isInProgress ? "border-amber-500" : "border-slate-350"
                  }`} />
                  
                  {/* Position Arrow Indicator pointing down to the bar */}
                  <div className="absolute -top-7 flex flex-col items-center transition-all duration-200 group-hover:-translate-y-1">
                    {/* Tooltip text/Milestone Name label */}
                    <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold shadow-xs border truncate max-w-[120px] ${
                      isCompleted 
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                        : isInProgress 
                          ? "bg-amber-50 text-amber-700 border-amber-200" 
                          : "bg-white text-slate-500 border-slate-200"
                    }`}>
                      {ms.name}
                    </span>
                    {/* Arrow shape */}
                    <div className={`w-1.5 h-1.5 rotate-45 border-r border-b -mt-0.5 ${
                      isCompleted 
                        ? "bg-emerald-50 border-emerald-200" 
                        : isInProgress 
                          ? "bg-amber-50 border-amber-200" 
                          : "bg-white border-slate-200"
                    }`} />
                  </div>
                  
                  {/* Bottom Tooltip details on hover */}
                  <div className="absolute top-8 hidden group-hover:flex flex-col bg-slate-900 text-white rounded-xl p-3 shadow-lg z-50 text-left min-w-[200px] border border-slate-800 space-y-1.5">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Milestone Details</div>
                    <div className="font-extrabold text-xs text-white truncate">{ms.name}</div>
                    {ms.description && <div className="text-[10px] text-slate-300 line-clamp-2">{ms.description}</div>}
                    <div className="flex justify-between items-center text-[10px] pt-1 border-t border-slate-800">
                      <span className="text-slate-400">Status:</span>
                      <span className={`font-black ${
                        isCompleted ? "text-emerald-450" : isInProgress ? "text-amber-400" : "text-slate-450"
                      }`}>
                        {ms.status === "completed" ? "Selesai" : ms.status === "invoiced" ? "Ditagih" : ms.status === "in_progress" ? "Dalam Proses" : "Belum Mulai"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="text-slate-400">Progres:</span>
                      <span className="font-mono font-bold text-blue-400">{ms.progress_percent || 0}%</span>
                    </div>
                    {ms.due_date && (
                      <div className="flex justify-between items-center text-[10px]">
                        <span className="text-slate-400">Tenggat:</span>
                        <span className="font-mono text-slate-300">{ms.due_date}</span>
                      </div>
                    )}
                    <div className="text-[9px] text-center text-slate-400 pt-1 border-t border-slate-800/50 font-bold">
                      Klik untuk edit milestone
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Detail Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Side: Dynamic Tab System */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-slate-150 rounded-3xl overflow-hidden shadow-xs">
            {/* Tab header */}
            <div className="flex border-b border-slate-100 bg-slate-50/50 p-2 gap-1">
              <button
                onClick={() => setActiveTab("milestones")}
                className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl transition ${activeTab === "milestones" ? "bg-white text-blue-600 shadow-xs" : "text-slate-500 hover:bg-slate-100"}`}
              >
                <FolderKanban className="w-4 h-4" />
                Milestone & Penagihan
              </button>
              
              {project.project_type === "service_goods" && (
                <button
                  onClick={() => setActiveTab("pos")}
                  className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl transition ${activeTab === "pos" ? "bg-white text-blue-600 shadow-xs" : "text-slate-500 hover:bg-slate-100"}`}
                >
                  <Package className="w-4 h-4" />
                  Material / PO
                </button>
              )}
            </div>
            <div className="p-6">
              
              {/* TAB 1: MILESTONES */}
              {activeTab === "milestones" && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <h3 className="text-sm font-black text-slate-700 uppercase tracking-wider">Tahapan Proyek</h3>
                    <button
                      onClick={() => handleOpenMilestoneModal(null)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition shadow-xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Tambah Milestone
                    </button>
                  </div>

                  {milestones.length === 0 ? (
                    <div className="text-center py-10 border-2 border-dashed border-slate-100 rounded-2xl">
                      <FolderKanban className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                      <p className="text-xs font-bold text-slate-400">Belum ada milestone dibuat</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">Definisikan tahapan kerja untuk melacak progress penyelesaian.</p>
                    </div>
                  ) : (
                    <div className="relative border-l border-slate-150 pl-5 ml-2.5 space-y-6 pt-2">
                      {milestones.map((ms, idx) => {
                        const isCompleted = ms.status === "completed" || ms.status === "invoiced";
                        return (
                          <div key={ms.id} className="relative">
                            {/* Dot indicator */}
                            <span className={`absolute -left-[26px] top-1 w-3 h-3 rounded-full border-2 bg-white ${isCompleted ? "border-emerald-500 bg-emerald-500" : ms.status === "in_progress" ? "border-blue-500 bg-blue-500 animate-pulse" : "border-slate-300"}`} />
                            
                            <div className="bg-slate-50 border border-slate-150/70 p-4 rounded-2xl hover:border-slate-300 transition flex flex-col sm:flex-row justify-between items-start gap-4">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <h4 className="text-xs font-black text-slate-800">{ms.name}</h4>
                                  <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 border rounded-md ${ms.status === "invoiced" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : isCompleted ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-slate-100 text-slate-500"}`}>
                                    {ms.status === "invoiced" ? "Tertagih" : ms.status === "completed" ? "Selesai" : ms.status === "in_progress" ? "Berjalan" : "Antri"}
                                  </span>
                                </div>
                                {ms.description && <p className="text-[10px] text-slate-500 whitespace-pre-line leading-relaxed">{ms.description}</p>}
                                <div className="flex items-center gap-4 text-[10px] text-slate-400 pt-1 font-semibold">
                                  {ms.due_date && <span>Target: {ms.due_date}</span>}
                                  {ms.billing_amount > 0 && (
                                    <span className="text-blue-600">
                                      Tagihan: {formatCurrency(ms.billing_amount, project.currency)}
                                      {ms.billing_type === "percentage" && ` (${ms.billing_percentage}%)`}
                                    </span>
                                  )}
                                </div>

                                {/* Linked Invoices Badge */}
                                {invoices.filter(inv => inv.milestone_id === ms.id).map((inv) => (
                                  <div key={inv.id} className="mt-1.5 flex items-center">
                                    <Link
                                      href={`/invoice/${inv.id}`}
                                      className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-blue-50 hover:bg-blue-100 border border-blue-200/50 hover:border-blue-300 rounded-lg text-[9px] font-black text-blue-700 transition"
                                    >
                                      <FileText className="w-3 h-3 text-blue-500 shrink-0" />
                                      <span>Invoice: {inv.invoice_number} ({formatCurrency(inv.total_amount, project.currency)})</span>
                                      <span className={`text-[7px] font-black uppercase px-1 rounded-sm ${inv.status === "paid" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
                                        {inv.status === "paid" ? "Lunas" : "Antri/Kirim"}
                                      </span>
                                    </Link>
                                  </div>
                                ))}

                                {/* Physical Progress Bar */}
                                <div className="flex items-center gap-2 pt-2">
                                  <span className="text-[9px] text-slate-400 font-bold uppercase">Progress Fisik:</span>
                                  <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                    <div className="h-full bg-blue-600 rounded-full transition-all" style={{ width: `${ms.progress_percent || 0}%` }}></div>
                                  </div>
                                  <span className="text-[10px] text-slate-700 font-extrabold">{ms.progress_percent || 0}%</span>
                                </div>

                                {/* Milestone Documentation Attachments */}
                                {ms.attachments && ms.attachments.length > 0 && (
                                  <div className="pt-2 border-t border-slate-100/70 mt-2 space-y-1">
                                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Dokumentasi Pengerjaan</p>
                                    <div className="flex flex-wrap gap-1.5">
                                      {ms.attachments.map((file, fIdx) => (
                                        <a
                                          key={fIdx}
                                          href={file.url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="flex items-center gap-1 px-2 py-0.5 bg-white border border-slate-200 rounded-lg text-[9px] text-slate-600 hover:text-blue-600 hover:border-blue-300 transition"
                                        >
                                          {file.type?.startsWith("image/") ? (
                                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0"></span>
                                          ) : file.type?.startsWith("video/") ? (
                                            <span className="w-1.5 h-1.5 rounded-full bg-purple-500 shrink-0"></span>
                                          ) : (
                                            <span className="w-1.5 h-1.5 rounded-full bg-slate-450 shrink-0"></span>
                                          )}
                                          <span className="truncate max-w-[120px] font-semibold">{file.name}</span>
                                        </a>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                                {/* ACTION: Generate Invoice from Milestone */}
                                {ms.status !== "invoiced" && (
                                  <button
                                    onClick={() => router.push(`/invoice/new?project_id=${project.id}&milestone_id=${ms.id}`)}
                                    className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-250 rounded-lg text-[10px] font-bold transition flex items-center gap-1"
                                  >
                                    <FileText className="w-3 h-3" />
                                    Buat Invoice
                                  </button>
                                )}
                                
                                <button
                                  onClick={() => handleOpenMilestoneModal(ms)}
                                  className="p-1 text-slate-400 hover:text-blue-600 transition"
                                  title="Edit Milestone"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteMilestone(ms.id)}
                                  className="p-1 text-slate-400 hover:text-rose-600 transition"
                                  title="Hapus Milestone"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: MATERIAL / PO */}
              {activeTab === "pos" && project.project_type === "service_goods" && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-sm font-black text-slate-700 uppercase tracking-wider">Purchase Orders (Material Cost)</h3>
                      <p className="text-[10px] text-slate-400 mt-0.5">Biaya semen, kayu, besi, atau pasokan luar yang terikat ke proyek.</p>
                    </div>
                    <Link
                      href={`/purchase/new?project_id=${project.id}`}
                      className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition shadow-xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Buat PO Baru
                    </Link>
                  </div>

                  {purchaseOrders.length === 0 ? (
                    <div className="text-center py-10 border-2 border-dashed border-slate-100 rounded-2xl">
                      <Package className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                      <p className="text-xs font-bold text-slate-400">Belum ada PO terhubung</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">Buat PO baru untuk melacak anggaran material cost.</p>
                    </div>
                  ) : (
                    <div className="border border-slate-150 rounded-2xl overflow-hidden">
                      <table className="w-full text-xs text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-150 text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                            <th className="py-2.5 px-4">No. PO</th>
                            <th className="py-2.5 px-4">Vendor</th>
                            <th className="py-2.5 px-4">Status</th>
                            <th className="py-2.5 px-4 text-right">Total Biaya</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {purchaseOrders.map((po) => (
                            <tr key={po.id} className="hover:bg-slate-50/50">
                              <td className="py-3 px-4 font-mono font-bold text-blue-600">
                                <Link href={`/purchase/${po.id}`} className="hover:underline">
                                  {po.po_number}
                                </Link>
                              </td>
                              <td className="py-3 px-4 font-medium text-slate-700">
                                {po.vendor_snapshot?.name || "-"}
                              </td>
                              <td className="py-3 px-4">
                                <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded-md ${po.status === "received" ? "bg-emerald-50 text-emerald-700" : po.status === "confirmed" ? "bg-blue-50 text-blue-700" : "bg-slate-100 text-slate-500"}`}>
                                  {po.status}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-right font-bold text-slate-800">
                                {formatCurrency(po.total_amount, project.currency)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}



            </div>
          </div>
        </div>

        {/* Right Side: Financial Performance & Customer Details */}
        <div className="space-y-6">
          


          {/* Card 2: Customer / Client Contact Card */}
          <div className="bg-white border border-slate-150 rounded-3xl p-6 shadow-xs space-y-4">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Informasi Klien</h3>
            
            {project.customer ? (
              <div className="space-y-3">
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase">Nama Klien</p>
                  <p className="text-sm font-black text-slate-800 mt-0.5">{project.customer.name}</p>
                </div>
                {project.customer.email && (
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Email</p>
                    <p className="text-xs font-semibold text-slate-600 mt-0.5">{project.customer.email}</p>
                  </div>
                )}
                {project.customer.phone && (
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Telepon</p>
                    <p className="text-xs font-semibold text-slate-600 mt-0.5">{project.customer.phone}</p>
                  </div>
                )}
                {project.customer.address && (
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Alamat Pengiriman/Klien</p>
                    <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{project.customer.address}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-4 bg-slate-50 border border-dashed border-slate-150 rounded-2xl">
                <p className="text-xs font-semibold text-slate-400">Proyek Internal</p>
                <p className="text-[9px] text-slate-400 mt-0.5">Tidak ada pelanggan eksternal terhubung.</p>
              </div>
            )}
          </div>

          {/* Card 3: Initial Documents (PO / Contract / Gambar Proyek) */}
          <div className="bg-white border border-slate-150 rounded-3xl p-6 shadow-xs space-y-4">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Dokumen Kontrak & Berkas / Gambar Proyek</h3>
            {project.initial_documents && project.initial_documents.length > 0 ? (
              <div className="space-y-3">
                {/* Image Gallery Grid for image files */}
                {project.initial_documents.filter(doc => {
                  const u = (doc.url || "").toLowerCase().split("?")[0];
                  const n = (doc.name || "").toLowerCase();
                  return u.endsWith(".png") || u.endsWith(".jpg") || u.endsWith(".jpeg") || u.endsWith(".webp") || u.endsWith(".gif") || u.endsWith(".svg") ||
                         n.endsWith(".png") || n.endsWith(".jpg") || n.endsWith(".jpeg") || n.endsWith(".webp") || n.endsWith(".gif") || n.endsWith(".svg");
                }).length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Gambar Proyek</p>
                    <div className="grid grid-cols-2 gap-2">
                      {project.initial_documents.filter(doc => {
                        const u = (doc.url || "").toLowerCase().split("?")[0];
                        const n = (doc.name || "").toLowerCase();
                        return u.endsWith(".png") || u.endsWith(".jpg") || u.endsWith(".jpeg") || u.endsWith(".webp") || u.endsWith(".gif") || u.endsWith(".svg") ||
                               n.endsWith(".png") || n.endsWith(".jpg") || n.endsWith(".jpeg") || n.endsWith(".webp") || n.endsWith(".gif") || n.endsWith(".svg");
                      }).map((doc, idx) => (
                        <a
                          key={idx}
                          href={doc.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group relative aspect-video bg-slate-100 rounded-xl overflow-hidden border border-slate-200 block hover:ring-2 hover:ring-blue-500 transition"
                        >
                          <img
                            src={doc.url}
                            alt={doc.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition flex items-end p-2">
                            <span className="text-[10px] text-white font-medium truncate">{doc.name}</span>
                          </div>
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* All Files List */}
                <div className="space-y-2">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Semua Berkas ({project.initial_documents.length})</p>
                  {project.initial_documents.map((doc, idx) => (
                    <a
                      key={idx}
                      href={doc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-2.5 bg-slate-50 hover:bg-slate-100 hover:text-blue-600 border border-slate-150 rounded-2xl text-xs text-slate-600 transition"
                    >
                      <span className="font-semibold truncate max-w-[180px]">{doc.name}</span>
                      <span className="text-[10px] text-blue-500 font-extrabold uppercase shrink-0">Buka ↗</span>
                    </a>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-4 bg-slate-50 border border-dashed border-slate-150 rounded-2xl">
                <p className="text-xs font-semibold text-slate-400">Tidak ada dokumen awal</p>
                <p className="text-[9px] text-slate-400 mt-0.5">Kontrak atau berkas PO pelanggan tidak diunggah.</p>
              </div>
            )}
          </div>

        </div>

      </div>

      {/* MODAL: Milestone Form (Create/Edit) */}
      {showMilestoneModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white border border-slate-150 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-sm font-black text-slate-800">
                {editingMilestone ? "Edit Milestone" : "Tambah Milestone Baru"}
              </h3>
              <button 
                onClick={() => setShowMilestoneModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handleSaveMilestone}>
              <div className="p-5 space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase block">Nama Milestone *</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Pembayaran DP 30%, Serah Terima Kunci"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    value={msName}
                    onChange={(e) => setMsName(e.target.value)}
                  />
                </div>
                
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase block">Deskripsi / Scope Pekerjaan</label>
                  <textarea
                    placeholder="Apa saja hasil kerja yang dicapai pada milestone ini..."
                    rows={3}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 leading-relaxed"
                    value={msDesc}
                    onChange={(e) => setMsDesc(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase block">Tipe Nominal</label>
                    <select
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      value={msBillingType}
                      onChange={(e) => setMsBillingType(e.target.value as any)}
                    >
                      <option value="fixed">Fixed (Tetap)</option>
                      <option value="percentage">Persentase (%)</option>
                    </select>
                  </div>

                  {msBillingType === "fixed" ? (
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase block">Nilai Tagihan (IDR)</label>
                      <input
                        type="number"
                        placeholder="0"
                        min="0"
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        value={msBillingAmt}
                        onChange={(e) => setMsBillingAmt(e.target.value === "" ? "" : Number(e.target.value))}
                      />
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase block">Persentase (%)</label>
                      <input
                        type="number"
                        placeholder="0"
                        min="0"
                        max="100"
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        value={msBillingPct}
                        onChange={(e) => setMsBillingPct(e.target.value === "" ? "" : Number(e.target.value))}
                      />
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase block">Target Due Date</label>
                    <input
                      type="date"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      value={msDueDate}
                      onChange={(e) => setMsDueDate(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase block">Status Pekerjaan</label>
                    <select
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      value={msStatus}
                      onChange={(e) => setMsStatus(e.target.value as any)}
                    >
                      <option value="pending">Antri (Pending)</option>
                      <option value="in_progress">Berjalan (In Progress)</option>
                      <option value="completed">Selesai (Completed)</option>
                      {msStatus === "invoiced" && (
                        <option value="invoiced">Tertagih (Invoiced)</option>
                      )}
                    </select>
                  </div>
                </div>

                {/* Progress Fisik (0-100%) with Preset Buttons */}
                <div className="space-y-1.5 pt-2 border-t border-slate-100">
                  <label className="text-[10px] font-bold text-slate-500 uppercase block">Progress Fisik Pengerjaan ({msProgressPercent}%)</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      className="w-20 px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      value={msProgressPercent}
                      onChange={(e) => setMsProgressPercent(Math.max(0, Math.min(100, Number(e.target.value))))}
                    />
                    <div className="flex flex-wrap gap-1">
                      {[0, 25, 50, 75, 100].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setMsProgressPercent(preset)}
                          className={`px-2 py-1 text-[10px] font-bold border rounded-lg transition ${msProgressPercent === preset ? "bg-blue-600 border-blue-600 text-white" : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"}`}
                        >
                          {preset}%
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Dokumentasi Media (Image, PDF, Video) */}
                <div className="space-y-1.5 pt-2 border-t border-slate-100">
                  <label className="text-[10px] font-bold text-slate-500 uppercase block">Unggah Dokumentasi (Gambar, PDF, Video)</label>
                  <input
                    type="file"
                    multiple
                    accept="image/*,.pdf,video/*"
                    className="block w-full text-[10px] text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[10px] file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 transition cursor-pointer"
                    onChange={handleMsFileChange}
                    disabled={uploadingMsFile}
                  />
                  {uploadingMsFile && (
                    <p className="text-[10px] text-blue-600 font-bold animate-pulse">Mengunggah file...</p>
                  )}
                  {msAttachments.length > 0 && (
                    <div className="mt-2 space-y-1 max-h-28 overflow-y-auto pr-1">
                      {msAttachments.map((file, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 bg-slate-50 border border-slate-150 rounded-xl text-[10px] text-slate-600">
                          <span className="font-semibold truncate max-w-[220px]">{file.name}</span>
                          <button
                            type="button"
                            onClick={() => setMsAttachments(prev => prev.filter((_, i) => i !== idx))}
                            className="text-rose-500 hover:text-rose-700 font-bold"
                          >
                            Hapus
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>

              <div className="bg-slate-50 border-t border-slate-100 px-5 py-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowMilestoneModal(false)}
                  className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 transition"
                  disabled={submittingMilestone}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition"
                  disabled={submittingMilestone}
                >
                  {submittingMilestone ? "Menyimpan..." : "Simpan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}



    </div>
  );
}
