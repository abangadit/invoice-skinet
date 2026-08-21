"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Target, Building2, User, Phone, Mail, DollarSign, FileText, Save } from "lucide-react";
import { useBusiness } from "../../../../lib/context/BusinessContext";
import { createWebBrowserClient } from "../../../../lib/supabase/client";

export default function NewLeadPage() {
  const router = Router();
  const { activeBusiness } = useBusiness();
  const [employees, setEmployees] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    company_name: "",
    contact_person: "",
    phone: "",
    email: "",
    sales_id: "",
    status: "NEW",
    potential_value: "",
    notes: ""
  });

  function Router() {
    return useRouter();
  }

  useEffect(() => {
    if (!activeBusiness?.id) return;
    const fetchEmployees = async () => {
      const supabase = createWebBrowserClient();
      const { data } = await supabase
        .from("employees")
        .select("id, name")
        .eq("business_id", activeBusiness.id);

      if (data && data.length > 0) {
        setEmployees(data);
        setFormData((prev) => ({ ...prev, sales_id: data[0].id }));
      }
    };
    fetchEmployees();
  }, [activeBusiness?.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBusiness?.id) return;

    if (!formData.company_name.trim()) {
      alert("Nama perusahaan / prospek wajib diisi");
      return;
    }

    if (!formData.sales_id) {
      alert("Pilih sales penanggung jawab");
      return;
    }

    setLoading(true);
    const supabase = createWebBrowserClient();

    const { data, error } = await supabase.from("leads").insert([
      {
        business_id: activeBusiness.id,
        sales_id: formData.sales_id,
        company_name: formData.company_name,
        contact_person: formData.contact_person || null,
        phone: formData.phone || null,
        email: formData.email || null,
        status: formData.status,
        potential_value: Number(formData.potential_value) || 0,
        notes: formData.notes || null
      }
    ]).select().single();

    setLoading(false);

    if (error) {
      alert("Gagal menambahkan prospek: " + error.message);
    } else if (data) {
      router.push(`/leads/${data.id}`);
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      {/* Back Button & Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/leads"
          className="p-2 text-slate-400 hover:text-slate-700 bg-white hover:bg-slate-100 rounded-xl border border-slate-200 shadow-sm transition-all"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Target className="w-6 h-6 text-indigo-600" />
            Tambah Prospek Baru
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Input data calon pelanggan / hasil canvassing tim sales.
          </p>
        </div>
      </div>

      {/* Form Card */}
      <form onSubmit={handleSubmit} className="bg-white p-6 md:p-8 rounded-2xl border border-slate-200/80 shadow-sm space-y-6">
        {/* Company Name */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">
            Nama Perusahaan / Prospek <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <Building2 className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              required
              placeholder="Contoh: PT Sumber Makmur Abadi"
              value={formData.company_name}
              onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
              className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            />
          </div>
        </div>

        {/* Contact Person & Phone */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Nama Contact Person (PIC)</label>
            <div className="relative">
              <User className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Contoh: Bpk. Budi Santoso"
                value={formData.contact_person}
                onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">No. Telepon / WhatsApp</label>
            <div className="relative">
              <Phone className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Contoh: 081234567890"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              />
            </div>
          </div>
        </div>

        {/* Email & Potential Value */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Email PIC / Perusahaan</label>
            <div className="relative">
              <Mail className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="email"
                placeholder="budi@sumbermakmur.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Potensi Omset / Nilai deal (Rp)</label>
            <div className="relative">
              <DollarSign className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="number"
                min="0"
                placeholder="10000000"
                value={formData.potential_value}
                onChange={(e) => setFormData({ ...formData, potential_value: e.target.value })}
                className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              />
            </div>
          </div>
        </div>

        {/* Sales Assignment & Status */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              Sales Penanggung Jawab <span className="text-rose-500">*</span>
            </label>
            <select
              value={formData.sales_id}
              onChange={(e) => setFormData({ ...formData, sales_id: e.target.value })}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            >
              {employees.length === 0 && <option value="">Tidak ada karyawan terdaftar</option>}
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Status Awal</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            >
              <option value="NEW">Baru</option>
              <option value="CONTACTED">Dihubungi</option>
              <option value="MEETING">Meeting / Janji</option>
              <option value="PROPOSAL">Penawaran</option>
              <option value="NEGOTIATION">Negosiasi</option>
              <option value="WON">Deal (Won)</option>
              <option value="LOST">Gagal (Lost)</option>
            </select>
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">Catatan / Kebutuhan Prospek</label>
          <div className="relative">
            <textarea
              rows={4}
              placeholder="Jelaskan gambaran singkat kebutuhan prospek ini..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            ></textarea>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
          <Link
            href="/leads"
            className="px-5 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-600 font-semibold rounded-xl text-sm transition-all"
          >
            Batal
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold rounded-xl shadow-sm transition-all text-sm"
          >
            <Save className="w-4 h-4" />
            {loading ? "Menyimpan..." : "Simpan Prospek"}
          </button>
        </div>
      </form>
    </div>
  );
}
