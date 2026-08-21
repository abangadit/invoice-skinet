"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { 
  FolderKanban, 
  Calendar, 
  Clock, 
  AlertCircle, 
  Building2, 
  Phone, 
  MapPin, 
  Image as ImageIcon,
  ExternalLink,
  CheckCircle2
} from "lucide-react";
import { createWebBrowserClient } from "../../../lib/supabase/client";

export default function PublicProjectPage() {
  const params = useParams();
  const projectId = params?.id as string;
  
  const [project, setProject] = useState<any>(null);
  const [business, setBusiness] = useState<any>(null);
  const [milestones, setMilestones] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return "-";
    try {
      return new Date(dateStr).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric"
      });
    } catch {
      return dateStr;
    }
  };

  const isImageFile = (url: string, name: string = "") => {
    const u = (url || "").toLowerCase().split("?")[0];
    const n = (name || "").toLowerCase();
    return (
      u.endsWith(".png") || u.endsWith(".jpg") || u.endsWith(".jpeg") || u.endsWith(".webp") || u.endsWith(".gif") || u.endsWith(".svg") ||
      n.endsWith(".png") || n.endsWith(".jpg") || n.endsWith(".jpeg") || n.endsWith(".webp") || n.endsWith(".gif") || n.endsWith(".svg")
    );
  };

  useEffect(() => {
    const fetchPublicProject = async () => {
      if (!projectId) return;
      try {
        setLoading(true);
        const supabase = createWebBrowserClient();

        // 1. Fetch Project Details
        const { data: projData, error: projErr } = await supabase
          .from("projects")
          .select(`
            id,
            business_id,
            project_number,
            name,
            description,
            project_type,
            status,
            priority,
            start_date,
            target_end_date,
            progress_percent,
            initial_documents,
            customer:customers(name, email, phone)
          `)
          .eq("id", projectId)
          .single();

        if (projErr || !projData) {
          throw new Error("Proyek tidak ditemukan atau akses publik ditutup.");
        }

        setProject(projData);

        // 2. Fetch Business Details if available
        if (projData.business_id) {
          const { data: bizData } = await supabase
            .from("businesses")
            .select("id, name, logo_url, address, phone, email, website")
            .eq("id", projData.business_id)
            .single();

          if (bizData) {
            setBusiness(bizData);
          }
        }

        // 3. Fetch Milestones
        const { data: msData } = await supabase
          .from("project_milestones")
          .select("*")
          .eq("project_id", projectId)
          .order("sort_order", { ascending: true });

        setMilestones(msData || []);

      } catch (err: any) {
        console.error("Error loading public project:", err);
        setErrorMsg(err.message || "Gagal memuat informasi proyek.");
      } finally {
        setLoading(false);
      }
    };

    fetchPublicProject();
  }, [projectId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs text-slate-500 font-bold mt-2">Memuat progress proyek...</p>
      </div>
    );
  }

  if (errorMsg || !project) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white border border-slate-200 p-8 rounded-3xl text-center max-w-md shadow-sm">
          <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-3" />
          <h3 className="text-base font-extrabold text-slate-900">Akses Proyek Dibatasi</h3>
          <p className="text-xs text-slate-500 mt-1 font-medium">{errorMsg || "Detail proyek tidak tersedia."}</p>
        </div>
      </div>
    );
  }

  const custName = Array.isArray(project.customer) ? project.customer[0]?.name : project.customer?.name;
  
  const projectImages = (project.initial_documents || []).filter((doc: any) => 
    isImageFile(doc.url, doc.name)
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between py-10 px-4">
      <div className="max-w-4xl mx-auto w-full space-y-6">
        
        {/* Company Header */}
        {business && (
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              {business.logo_url ? (
                <img 
                  src={business.logo_url} 
                  alt={business.name} 
                  className="w-14 h-14 object-contain rounded-2xl border border-slate-100 shrink-0 bg-slate-50 p-1"
                />
              ) : (
                <div className="w-14 h-14 bg-blue-50 border border-blue-100 rounded-2xl flex items-center justify-center text-blue-600 shrink-0">
                  <Building2 className="w-7 h-7" />
                </div>
              )}
              <div>
                <h2 className="text-lg font-black text-slate-900">{business.name}</h2>
                {business.address && (
                  <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5 font-medium">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    {business.address}
                  </p>
                )}
              </div>
            </div>

            {business.phone && (
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 bg-slate-50 border border-slate-150 px-3.5 py-2 rounded-2xl w-fit">
                <Phone className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span>{business.phone}</span>
              </div>
            )}
          </div>
        )}

        {/* Public Project Header Card */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-lg">
              {project.project_number}
            </span>
            <span className="text-xs font-extrabold text-blue-600 bg-blue-50 px-3 py-1 rounded-full uppercase">
              {project.status}
            </span>
          </div>

          <div>
            <h1 className="text-2xl font-black text-slate-900">{project.name}</h1>
            {custName && <p className="text-xs font-semibold text-slate-500 mt-1">Klien: {custName}</p>}
            {project.description && (
              <p className="text-xs text-slate-600 mt-2 whitespace-pre-line">{project.description}</p>
            )}
          </div>

          {/* Project Dates */}
          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
            <div className="flex items-center gap-2.5 p-3 bg-slate-50 rounded-2xl border border-slate-150">
              <Calendar className="w-4 h-4 text-blue-600 shrink-0" />
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase">Tanggal Mulai</p>
                <p className="text-xs font-extrabold text-slate-800">{formatDate(project.start_date)}</p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 p-3 bg-slate-50 rounded-2xl border border-slate-150">
              <Clock className="w-4 h-4 text-emerald-600 shrink-0" />
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase">Target / Tanggal Selesai</p>
                <p className="text-xs font-extrabold text-slate-800">{formatDate(project.target_end_date)}</p>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-1.5 pt-2">
            <div className="flex justify-between text-xs font-bold text-slate-700">
              <span>Progress Pengerjaan</span>
              <span>{project.progress_percent || 0}%</span>
            </div>
            <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
              <div 
                className="bg-blue-600 h-full transition-all duration-500 rounded-full" 
                style={{ width: `${project.progress_percent || 0}%` }}
              />
            </div>
          </div>
        </div>

        {/* Project Images Gallery Section */}
        {projectImages.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-blue-600" /> Gambar & Dokumentasi Proyek
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {projectImages.map((doc: any, idx: number) => (
                <a
                  key={idx}
                  href={doc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative aspect-video bg-slate-100 rounded-2xl overflow-hidden border border-slate-200 block hover:ring-2 hover:ring-blue-500 transition"
                >
                  <img
                    src={doc.url}
                    alt={doc.name || `Gambar ${idx + 1}`}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition flex items-end p-2">
                    <span className="text-[10px] text-white font-medium truncate flex items-center gap-1">
                      <ExternalLink className="w-3 h-3" /> {doc.name || "Buka Gambar"}
                    </span>
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Milestones List */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <FolderKanban className="w-4 h-4 text-blue-600" /> Tahapan & Milestone Proyek
          </h3>

          <div className="space-y-4">
            {milestones.length > 0 ? (
              milestones.map((m) => {
                const msImages = (m.attachments || []).filter((file: any) => 
                  file.type?.startsWith("image/") || isImageFile(file.url, file.name)
                );

                return (
                  <div key={m.id} className="border border-slate-150 p-4.5 rounded-2xl bg-slate-50/50 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                        {m.status === "completed" ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                        ) : (
                          <Clock className="w-4 h-4 text-amber-500 shrink-0" />
                        )}
                        {m.name}
                      </h4>
                      <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase ${
                        m.status === 'completed' 
                          ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' 
                          : 'bg-amber-50 text-amber-600 border border-amber-100'
                      }`}>
                        {m.status}
                      </span>
                    </div>

                    {m.description && <p className="text-[11px] text-slate-600 whitespace-pre-line">{m.description}</p>}

                    {/* Milestone Images */}
                    {msImages.length > 0 && (
                      <div className="pt-2 border-t border-slate-200/60 space-y-1.5">
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Gambar Progress Milestone</p>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {msImages.map((img: any, fIdx: number) => (
                            <a
                              key={fIdx}
                              href={img.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="group relative aspect-video bg-white rounded-xl overflow-hidden border border-slate-200 block hover:ring-2 hover:ring-blue-500 transition"
                            >
                              <img
                                src={img.url}
                                alt={img.name || `Progress ${fIdx + 1}`}
                                className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition flex items-end p-1.5">
                                <span className="text-[9px] text-white font-medium truncate flex items-center gap-1">
                                  <ExternalLink className="w-2.5 h-2.5" /> {img.name || "Lihat"}
                                </span>
                              </div>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <p className="text-xs text-slate-400 font-medium text-center py-4">Belum ada tahapan milestone terdaftar.</p>
            )}
          </div>
        </div>

      </div>

      {/* Footer */}
      <footer className="mt-12 pt-6 border-t border-slate-200/80 text-center">
        <p className="text-xs font-semibold text-slate-400">
          by{" "}
          <a 
            href="https://invoice.co.id" 
            target="_blank" 
            rel="noopener noreferrer"
            className="font-bold text-blue-600 hover:underline transition"
          >
            invoice.co.id
          </a>
        </p>
      </footer>
    </div>
  );
}
