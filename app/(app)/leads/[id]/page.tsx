"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { 
  ArrowLeft, 
  Target, 
  Building2, 
  User, 
  Phone, 
  Mail, 
  DollarSign, 
  Calendar, 
  Clock, 
  Plus, 
  CheckCircle2, 
  Edit3, 
  PhoneCall, 
  MessageSquare, 
  MapPin, 
  Send, 
  Trash2,
  AlertCircle
} from "lucide-react";
import { useBusiness } from "../../../../lib/context/BusinessContext";
import { createWebBrowserClient } from "../../../../lib/supabase/client";

interface LeadDetail {
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

interface Activity {
  id: string;
  lead_id: string;
  type: "CALL" | "EMAIL" | "MEETING" | "WHATSAPP" | "VISIT";
  activity_date: string;
  notes: string | null;
  next_follow_up_date: string | null;
  created_at: string;
}

const STATUS_OPTIONS: { value: LeadDetail["status"]; label: string; bg: string }[] = [
  { value: "NEW", label: "Baru", bg: "bg-blue-50 text-blue-700 border-blue-200" },
  { value: "CONTACTED", label: "Dihubungi", bg: "bg-cyan-50 text-cyan-700 border-cyan-200" },
  { value: "MEETING", label: "Meeting / Janji", bg: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  { value: "PROPOSAL", label: "Penawaran", bg: "bg-amber-50 text-amber-700 border-amber-200" },
  { value: "NEGOTIATION", label: "Negosiasi", bg: "bg-purple-50 text-purple-700 border-purple-200" },
  { value: "WON", label: "Deal (Won)", bg: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  { value: "LOST", label: "Gagal (Lost)", bg: "bg-rose-50 text-rose-700 border-rose-200" }
];

const ACTIVITY_ICONS: Record<Activity["type"], { icon: React.ReactNode; label: string; color: string }> = {
  CALL: { icon: <PhoneCall className="w-4 h-4" />, label: "Telepon", color: "bg-blue-100 text-blue-600" },
  WHATSAPP: { icon: <MessageSquare className="w-4 h-4" />, label: "WhatsApp", color: "bg-emerald-100 text-emerald-600" },
  MEETING: { icon: <User className="w-4 h-4" />, label: "Meeting", color: "bg-purple-100 text-purple-600" },
  VISIT: { icon: <MapPin className="w-4 h-4" />, label: "Kunjungan (Visit)", color: "bg-amber-100 text-amber-600" },
  EMAIL: { icon: <Mail className="w-4 h-4" />, label: "Email", color: "bg-indigo-100 text-indigo-600" }
};

export default function LeadDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { activeBusiness } = useBusiness();

  const leadId = params?.id as string;

  const [lead, setLead] = useState<LeadDetail | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [employees, setEmployees] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [showActivityModal, setShowActivityModal] = useState(false);

  // Activity Form State
  const [actType, setActType] = useState<Activity["type"]>("CALL");
  const [actNotes, setActNotes] = useState("");
  const [nextFollowUp, setNextFollowUp] = useState("");
  const [savingAct, setSavingAct] = useState(false);

  useEffect(() => {
    if (!activeBusiness?.id || !leadId) return;
    fetchLeadAndActivities();
  }, [activeBusiness?.id, leadId]);

  const fetchLeadAndActivities = async () => {
    setLoading(true);
    const supabase = createWebBrowserClient();

    // Fetch lead details
    const { data: leadData, error: leadErr } = await supabase
      .from("leads")
      .select(`
        *,
        employees (
          id,
          name
        )
      `)
      .eq("id", leadId)
      .single();

    if (leadErr) {
      console.error("Error fetching lead:", leadErr);
      setLoading(false);
      return;
    }

    setLead(leadData);

    // Fetch employees for reassignment dropdown if needed
    const { data: empData } = await supabase
      .from("employees")
      .select("id, name")
      .eq("business_id", activeBusiness!.id);
    if (empData) setEmployees(empData);

    // Fetch activities / follow ups
    const { data: actData } = await supabase
      .from("lead_activities")
      .select("*")
      .eq("lead_id", leadId)
      .order("activity_date", { ascending: false });

    setActivities(actData || []);
    setLoading(false);
  };

  const handleStatusChange = async (newStatus: LeadDetail["status"]) => {
    if (!lead) return;
    const supabase = createWebBrowserClient();
    const { error } = await supabase
      .from("leads")
      .update({ status: newStatus })
      .eq("id", lead.id);

    if (error) {
      alert("Gagal mengubah status: " + error.message);
    } else {
      setLead({ ...lead, status: newStatus });
    }
  };

  const handleAddActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leadId) return;

    setSavingAct(true);
    const supabase = createWebBrowserClient();

    const newActivity = {
      lead_id: leadId,
      type: actType,
      activity_date: new Date().toISOString(),
      notes: actNotes.trim() || null,
      next_follow_up_date: nextFollowUp ? new Date(nextFollowUp).toISOString() : null
    };

    const { data, error } = await supabase
      .from("lead_activities")
      .insert([newActivity])
      .select()
      .single();

    setSavingAct(false);

    if (error) {
      alert("Gagal mencatat follow up: " + error.message);
    } else if (data) {
      setActivities((prev) => [data, ...prev]);
      setShowActivityModal(false);
      setActNotes("");
      setNextFollowUp("");
    }
  };

  const handleDeleteActivity = async (actId: string) => {
    if (!confirm("Hapus catatan follow up ini?")) return;
    const supabase = createWebBrowserClient();
    const { error } = await supabase.from("lead_activities").delete().eq("id", actId);
    if (error) {
      alert("Gagal menghapus: " + error.message);
    } else {
      setActivities((prev) => prev.filter((a) => a.id !== actId));
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0
    }).format(val);
  };

  const formatDate = (iso: string) => {
    if (!iso) return "-";
    return new Date(iso).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  if (loading) {
    return (
      <div className="py-20 text-center text-slate-500">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        Memuat detail prospek...
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="p-6 max-w-xl mx-auto text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
        <h2 className="text-xl font-bold text-slate-800">Prospek tidak ditemukan</h2>
        <Link
          href="/leads"
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium"
        >
          <ArrowLeft className="w-4 h-4" /> Kembali ke Daftar Leads
        </Link>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Back Button & Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link
            href="/leads"
            className="p-2 text-slate-400 hover:text-slate-700 bg-white hover:bg-slate-100 rounded-xl border border-slate-200 shadow-sm transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-900">{lead.company_name}</h1>
            </div>
            <p className="text-slate-500 text-sm mt-0.5">
              Sales PJ: <span className="font-semibold text-slate-700">{lead.employees?.name || "Unassigned"}</span>
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowActivityModal(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-sm transition-all text-sm shrink-0"
        >
          <Plus className="w-4 h-4" />
          Catat Follow-Up (Aktivitas)
        </button>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Details & Status */}
        <div className="lg:col-span-1 space-y-6">
          {/* Status Pipeline Card */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Status Pipeline Leads</h3>
            <div className="space-y-2">
              {STATUS_OPTIONS.map((opt) => {
                const isActive = lead.status === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => handleStatusChange(opt.value)}
                    className={`w-full flex items-center justify-between p-3 rounded-xl border text-sm font-semibold transition-all ${
                      isActive
                        ? `${opt.bg} ring-2 ring-indigo-500/20 shadow-sm`
                        : "bg-slate-50/50 border-slate-200/60 text-slate-600 hover:bg-slate-100/60"
                    }`}
                  >
                    <span>{opt.label}</span>
                    {isActive && <CheckCircle2 className="w-4 h-4 text-indigo-600" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Lead Information Card */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Informasi Prospek</h3>

            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-3">
                <Building2 className="w-4 h-4 text-slate-400 mt-1 shrink-0" />
                <div>
                  <p className="text-xs text-slate-400">Nama Perusahaan</p>
                  <p className="font-semibold text-slate-800">{lead.company_name}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <User className="w-4 h-4 text-slate-400 mt-1 shrink-0" />
                <div>
                  <p className="text-xs text-slate-400">Contact Person (PIC)</p>
                  <p className="font-semibold text-slate-800">{lead.contact_person || "-"}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Phone className="w-4 h-4 text-slate-400 mt-1 shrink-0" />
                <div>
                  <p className="text-xs text-slate-400">No. Telepon / WA</p>
                  <p className="font-semibold text-slate-800">{lead.phone || "-"}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Mail className="w-4 h-4 text-slate-400 mt-1 shrink-0" />
                <div>
                  <p className="text-xs text-slate-400">Email</p>
                  <p className="font-semibold text-slate-800">{lead.email || "-"}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <DollarSign className="w-4 h-4 text-slate-400 mt-1 shrink-0" />
                <div>
                  <p className="text-xs text-slate-400">Potensi Nilai Deal</p>
                  <p className="font-bold text-indigo-600 text-base">
                    {formatCurrency(Number(lead.potential_value) || 0)}
                  </p>
                </div>
              </div>

              {lead.notes && (
                <div className="pt-3 border-t border-slate-100">
                  <p className="text-xs text-slate-400 mb-1">Catatan Kebutuhan:</p>
                  <p className="text-slate-700 bg-slate-50 p-3 rounded-xl text-xs leading-relaxed">
                    {lead.notes}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Follow-up Timeline */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Riwayat Follow-Up & Aktivitas</h2>
                <p className="text-xs text-slate-500 mt-0.5">Catatan seluruh hasil interaksi dengan prospek ini.</p>
              </div>
              <span className="bg-slate-100 text-slate-700 text-xs font-bold px-2.5 py-1 rounded-full">
                {activities.length} Aktivitas
              </span>
            </div>

            {activities.length === 0 ? (
              <div className="py-12 text-center text-slate-400 space-y-3">
                <MessageSquare className="w-10 h-10 mx-auto text-slate-300" />
                <p className="text-sm">Belum ada riwayat follow-up yang dicatat.</p>
                <button
                  onClick={() => setShowActivityModal(true)}
                  className="px-4 py-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-xl text-xs font-semibold transition-all"
                >
                  + Tambah Catatan Pertama
                </button>
              </div>
            ) : (
              <div className="relative pl-6 space-y-6 before:absolute before:left-3 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200">
                {activities.map((act) => {
                  const config = ACTIVITY_ICONS[act.type];
                  return (
                    <div key={act.id} className="relative group">
                      {/* Timeline Dot */}
                      <div
                        className={`absolute -left-6 top-1.5 w-6 h-6 rounded-full flex items-center justify-center border-2 border-white shadow-sm ${config.color}`}
                      >
                        {config.icon}
                      </div>

                      {/* Content Card */}
                      <div className="bg-slate-50/70 hover:bg-slate-50 p-4 rounded-xl border border-slate-200/80 transition-all space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 text-sm">{config.label}</span>
                            <span className="text-xs text-slate-400">• {formatDate(act.activity_date)}</span>
                          </div>
                          <button
                            onClick={() => handleDeleteActivity(act.id)}
                            className="text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all p-1"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        {act.notes && <p className="text-sm text-slate-700 leading-relaxed">{act.notes}</p>}

                        {act.next_follow_up_date && (
                          <div className="mt-2 pt-2 border-t border-slate-200/60 flex items-center gap-1.5 text-xs text-amber-700 font-medium">
                            <Calendar className="w-3.5 h-3.5 text-amber-500" />
                            <span>Jadwal Follow-Up Berikutnya: {formatDate(act.next_follow_up_date)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal Catat Follow Up */}
      {showActivityModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900">Catat Follow-Up Baru</h3>
              <button
                onClick={() => setShowActivityModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddActivity} className="space-y-4">
              {/* Type Select */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Jenis Aktivitas</label>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                  {(Object.keys(ACTIVITY_ICONS) as Activity["type"][]).map((t) => {
                    const cfg = ACTIVITY_ICONS[t];
                    const selected = actType === t;
                    return (
                      <button
                        type="button"
                        key={t}
                        onClick={() => setActType(t)}
                        className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-xs font-semibold gap-1.5 transition-all ${
                          selected
                            ? "bg-indigo-50 border-indigo-600 text-indigo-700 shadow-sm"
                            : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        {cfg.icon}
                        <span>{cfg.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Hasil Interaksi / Catatan</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Hasil pembicaraan dengan prospek..."
                  value={actNotes}
                  onChange={(e) => setActNotes(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                ></textarea>
              </div>

              {/* Next Follow Up Date */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Jadwal Follow-Up Berikutnya (Opsional)
                </label>
                <input
                  type="datetime-local"
                  value={nextFollowUp}
                  onChange={(e) => setNextFollowUp(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              {/* Modal Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowActivityModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl text-sm font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingAct}
                  className="inline-flex items-center gap-1.5 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  {savingAct ? "Menyimpan..." : "Simpan Catatan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
