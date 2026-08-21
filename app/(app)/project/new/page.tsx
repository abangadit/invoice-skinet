"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Save, Briefcase } from "lucide-react";
import { useBusiness } from "../../../../lib/context/BusinessContext";
import { createWebBrowserClient } from "../../../../lib/supabase/client";
import { uploadFileToR2 } from "../../../../lib/utils/upload";

interface Customer {
  id: string;
  name: string;
}

function NewProjectPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const quotationId = searchParams ? searchParams.get("quotation_id") : null;
  const { activeBusiness, reloadBusiness } = useBusiness();
  const [submitting, setSubmitting] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [name, setName] = useState("");
  const [projectNumber, setProjectNumber] = useState("");
  const [projectType, setProjectType] = useState<"service" | "service_goods">("service");
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [budgetAmount, setBudgetAmount] = useState<number | "">("");
  const [priority, setPriority] = useState<"low" | "medium" | "high" | "urgent">("medium");
  const [startDate, setStartDate] = useState("");
  const [targetEndDate, setTargetEndDate] = useState("");
  const [description, setDescription] = useState("");
  const [initialFiles, setInitialFiles] = useState<File[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);

  // Live Currency Preview Helper
  const [formattedBudgetPreview, setFormattedBudgetPreview] = useState("");

  useEffect(() => {
    if (activeBusiness) {
      // Setup default project number format: PRJ-{Counter}
      const prefix = activeBusiness.project_prefix || "PRJ";
      const counter = activeBusiness.project_counter || 1;
      const formattedCounter = String(counter).padStart(4, "0");
      setProjectNumber(`${prefix}-${formattedCounter}`);
    }
  }, [activeBusiness]);

  useEffect(() => {
    if (budgetAmount !== "" && budgetAmount > 0) {
      setFormattedBudgetPreview(
        new Intl.NumberFormat("id-ID", {
          style: "currency",
          currency: activeBusiness?.default_currency || "IDR",
          maximumFractionDigits: 0
        }).format(Number(budgetAmount))
      );
    } else {
      setFormattedBudgetPreview("");
    }
  }, [budgetAmount, activeBusiness]);

  useEffect(() => {
    const fetchData = async () => {
      if (!activeBusiness) return;
      try {
        setLoading(true);
        const supabase = createWebBrowserClient();
        
        // Fetch customers list
        const { data: customerData, error: customerErr } = await supabase
          .from("customers")
          .select("id, name")
          .eq("business_id", activeBusiness.id)
          .order("name", { ascending: true });

        if (customerErr) throw customerErr;
        setCustomers(customerData || []);

        // Prepopulate from quotation if provided
        if (quotationId) {
          const { data: qData, error: qErr } = await supabase
            .from("invoices")
            .select("invoice_number, total_amount, customer_id")
            .eq("id", quotationId)
            .eq("type", "quotation")
            .single();
          
          if (!qErr && qData) {
            setName(`Proyek Penawaran ${qData.invoice_number}`);
            setBudgetAmount(qData.total_amount);
            if (qData.customer_id) {
              setSelectedCustomerId(qData.customer_id);
            }
            setDescription(`Dibuat otomatis dari Quotation Penawaran Harga #${qData.invoice_number}`);
          }
        }
      } catch (err) {
        console.error("Error loading form dependencies:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [activeBusiness, quotationId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBusiness || submitting) return;

    if (!name.trim()) {
      alert("Nama Proyek wajib diisi!");
      return;
    }

    if (!projectNumber.trim()) {
      alert("Nomor Proyek wajib diisi!");
      return;
    }

    try {
      setSubmitting(true);
      const supabase = createWebBrowserClient();

      // Upload initial documents if any
      const uploadedDocs: Array<{ name: string; url: string }> = [];
      if (initialFiles.length > 0) {
        setUploadingFiles(true);
        for (const file of initialFiles) {
          try {
            const fileUrl = await uploadFileToR2(file, "projects/contracts");
            uploadedDocs.push({ name: file.name, url: fileUrl });
          } catch (uploadErr: any) {
            console.error("Gagal mengunggah file:", file.name, uploadErr);
            alert(`Gagal mengunggah file ${file.name}: ${uploadErr.message || "Error R2"}`);
          }
        }
        setUploadingFiles(false);
      }

      // 1. Insert Project record
      const { data: newProj, error: insertErr } = await supabase
        .from("projects")
        .insert({
          business_id: activeBusiness.id,
          project_number: projectNumber.trim(),
          name: name.trim(),
          description: description.trim() || null,
          project_type: projectType,
          status: "draft", // Start as draft
          priority,
          customer_id: selectedCustomerId || null,
          budget_amount: budgetAmount === "" ? 0 : Number(budgetAmount),
          currency: activeBusiness.default_currency || "IDR",
          start_date: startDate || null,
          target_end_date: targetEndDate || null,
          progress_percent: 0,
          source_document_id: quotationId || null,
          initial_documents: uploadedDocs
        })
        .select("id")
        .single();

      if (insertErr) throw insertErr;

      // Update source document (quotation) with reference
      if (quotationId && newProj) {
        await supabase
          .from("invoices")
          .update({ 
            converted_to_project_id: newProj.id,
            status: "paid" // Mark deal / closed
          })
          .eq("id", quotationId);
      }

      // 2. Increment project counter in businesses if user used the generated number
      const prefix = activeBusiness.project_prefix || "PRJ";
      const counter = activeBusiness.project_counter || 1;
      const formattedCounter = String(counter).padStart(4, "0");
      const defaultGenerated = `${prefix}-${formattedCounter}`;

      if (projectNumber.trim() === defaultGenerated) {
        const { error: counterErr } = await supabase
          .from("businesses")
          .update({ project_counter: counter + 1 })
          .eq("id", activeBusiness.id);
        
        if (counterErr) {
          console.error("Failed to increment project counter:", counterErr);
        } else {
          await reloadBusiness(); // Refresh context state
        }
      }

      alert("Proyek berhasil dibuat!");
      router.push("/project");
    } catch (err: any) {
      console.error("Error creating project:", err);
      alert(err.message || "Gagal membuat proyek.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center font-sans">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs text-slate-500 font-semibold mt-2">Membuat formulir proyek...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto px-4 sm:px-6">
      
      {/* Breadcrumbs */}
      <div>
        <button 
          onClick={() => router.push("/project")}
          className="flex items-center gap-1 text-xs text-slate-500 hover:text-blue-600 transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Kembali ke Daftar Proyek
        </button>
      </div>

      {/* Page Title */}
      <div>
        <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
          <Briefcase className="w-6 h-6 text-blue-600" />
          Buat Proyek Baru
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Daftarkan proyek baru dengan tipe adaptif (Pure Jasa atau dengan material) beserta detail anggarannya.
        </p>
      </div>

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="bg-white border border-slate-150 rounded-2xl shadow-xs overflow-hidden">
        <div className="p-6 space-y-6">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Project Name */}
            <div className="md:col-span-2 space-y-2">
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block">
                Nama Proyek <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Contoh: Pembuatan Website E-Commerce, Renovasi Dapur"
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            {/* Project Number */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block">
                Nomor Proyek <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                value={projectNumber}
                onChange={(e) => setProjectNumber(e.target.value)}
              />
            </div>

            {/* Project Type */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block">
                Tipe Proyek <span className="text-rose-500">*</span>
              </label>
              <select
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                value={projectType}
                onChange={(e) => setProjectType(e.target.value as any)}
              >
                <option value="service">💻 Pure Jasa (Service Only)</option>
                <option value="service_goods">🏗️ Jasa + Material (Service & Goods)</option>
              </select>
            </div>

            {/* Customer Selector */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block">
                Pelanggan / Klien (Opsional)
              </label>
              <select
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
              >
                <option value="">-- Pilih Pelanggan --</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Budget Amount */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block">
                Anggaran (Budget Proyek)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-3 text-slate-400 text-xs font-bold">
                  {activeBusiness?.default_currency || "IDR"}
                </span>
                <input
                  type="number"
                  placeholder="0"
                  min="0"
                  className="w-full pl-12 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition font-medium"
                  value={budgetAmount}
                  onChange={(e) => setBudgetAmount(e.target.value === "" ? "" : Number(e.target.value))}
                />
              </div>
              {formattedBudgetPreview && (
                <p className="text-xs text-blue-600 font-bold mt-1">
                  Preview: {formattedBudgetPreview}
                </p>
              )}
            </div>

            {/* Project Priority */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block">
                Prioritas Proyek
              </label>
              <select
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
              >
                <option value="low">Rendah (Low)</option>
                <option value="medium">Sedang (Medium)</option>
                <option value="high">Tinggi (High)</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            {/* Empty space/spacer */}
            <div className="hidden md:block"></div>

            {/* Start Date */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block">
                Tanggal Mulai
              </label>
              <input
                type="date"
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            {/* Target End Date */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block">
                Target Selesai
              </label>
              <input
                type="date"
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                value={targetEndDate}
                onChange={(e) => setTargetEndDate(e.target.value)}
              />
            </div>

            {/* Description / Notes */}
            <div className="md:col-span-2 space-y-2">
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block">
                Deskripsi Proyek / Catatan
              </label>
              <textarea
                placeholder="Rincian mengenai detail proyek, deliverables utama, atau instruksi kerja..."
                rows={4}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition leading-relaxed"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            {/* Initial Documents Upload (Max 3 files) */}
            <div className="md:col-span-2 space-y-2 border-t border-slate-100 pt-5 mt-2">
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block">
                Dokumen Awal Proyek (Maks. 3 File, Format PDF/Gambar, Maks. 10MB)
              </label>
              <input
                type="file"
                multiple
                accept=".pdf,image/*"
                className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 transition cursor-pointer"
                onChange={(e) => {
                  const files = e.target.files ? Array.from(e.target.files) : [];
                  if (initialFiles.length + files.length > 3) {
                    alert("Maksimum hanya diperbolehkan mengunggah 3 dokumen awal.");
                    return;
                  }
                  setInitialFiles(prev => [...prev, ...files]);
                }}
              />
              {initialFiles.length > 0 && (
                <div className="mt-3 space-y-1.5">
                  {initialFiles.map((file, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-150 rounded-xl text-xs text-slate-600 transition">
                      <span className="font-semibold truncate max-w-xs">{file.name}</span>
                      <button
                        type="button"
                        onClick={() => setInitialFiles(prev => prev.filter((_, i) => i !== idx))}
                        className="text-rose-500 hover:text-rose-700 font-bold transition"
                      >
                        Hapus
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

        </div>

        {/* Submit Actions Footer */}
        <div className="bg-slate-50 border-t border-slate-100 px-6 py-4 flex justify-end gap-3">
          <button
            type="button"
            onClick={() => router.push("/project")}
            className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 transition"
            disabled={submitting}
          >
            Batal
          </button>
          <button
            type="submit"
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition shadow-sm"
            disabled={submitting || uploadingFiles}
          >
            <Save className="w-4 h-4" />
            {uploadingFiles ? "Mengunggah..." : submitting ? "Menyimpan..." : "Simpan Proyek"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function NewProjectPage() {
  return (
    <React.Suspense fallback={
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center font-sans">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs text-slate-500 font-semibold mt-2">Memuat halaman proyek...</p>
      </div>
    }>
      <NewProjectPageContent />
    </React.Suspense>
  );
}
