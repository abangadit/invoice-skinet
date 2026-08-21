"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { 
  Clock, 
  Plus, 
  Trash2, 
  Edit2, 
  ArrowLeft, 
  Check, 
  X, 
  AlertCircle,
  Sun,
  Moon,
  Calendar
} from "lucide-react";
import { useBusiness } from "../../../../lib/context/BusinessContext";
import { createWebBrowserClient } from "../../../../lib/supabase/client";

interface WorkingShift {
  id: string;
  business_id: string;
  name: string;
  start_time: string;
  end_time: string;
  created_at: string;
}

export default function MasterShiftPage() {
  const router = useRouter();
  const { activeBusiness } = useBusiness();

  const [shifts, setShifts] = useState<WorkingShift[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingShift, setEditingShift] = useState<WorkingShift | null>(null);
  const [name, setName] = useState("");
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("17:00");
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState("");

  const fetchShifts = async () => {
    if (!activeBusiness) return;
    try {
      setLoading(true);
      const supabase = createWebBrowserClient();
      const { data, error } = await supabase
        .from("working_shifts")
        .select("*")
        .eq("business_id", activeBusiness.id)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setShifts(data || []);
    } catch (err: any) {
      console.error("Error fetching shifts:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeBusiness) {
      fetchShifts();
    }
  }, [activeBusiness]);

  const handleOpenAddModal = () => {
    setEditingShift(null);
    setName("");
    setStartTime("08:00");
    setEndTime("17:00");
    setModalError("");
    setShowModal(true);
  };

  const handleOpenEditModal = (shift: WorkingShift) => {
    setEditingShift(shift);
    setName(shift.name);
    setStartTime(shift.start_time ? shift.start_time.substring(0, 5) : "08:00");
    setEndTime(shift.end_time ? shift.end_time.substring(0, 5) : "17:00");
    setModalError("");
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBusiness) return;
    if (!name.trim()) {
      setModalError("Nama shift wajib diisi.");
      return;
    }
    if (!startTime || !endTime) {
      setModalError("Jam masuk dan jam pulang wajib diisi.");
      return;
    }

    try {
      setSubmitting(true);
      setModalError("");
      const supabase = createWebBrowserClient();

      const formattedStartTime = startTime.length === 5 ? `${startTime}:00` : startTime;
      const formattedEndTime = endTime.length === 5 ? `${endTime}:00` : endTime;

      if (editingShift) {
        const { error } = await supabase
          .from("working_shifts")
          .update({
            name: name.trim(),
            start_time: formattedStartTime,
            end_time: formattedEndTime,
            updated_at: new Date().toISOString()
          })
          .eq("id", editingShift.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("working_shifts")
          .insert({
            business_id: activeBusiness.id,
            name: name.trim(),
            start_time: formattedStartTime,
            end_time: formattedEndTime
          });

        if (error) throw error;
      }

      setShowModal(false);
      fetchShifts();
    } catch (err: any) {
      console.error("Error saving shift:", err);
      setModalError(err.message || "Gagal menyimpan shift.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (shiftId: string, shiftName: string) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus shift "${shiftName}"? Karyawan yang terhubung dengan shift ini akan kehilangan penugasan shift.`)) {
      return;
    }

    try {
      const supabase = createWebBrowserClient();
      const { error } = await supabase
        .from("working_shifts")
        .delete()
        .eq("id", shiftId);

      if (error) throw error;
      fetchShifts();
    } catch (err: any) {
      console.error("Error deleting shift:", err);
      alert("Gagal menghapus shift: " + err.message);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <button 
            onClick={() => router.push("/settings")} 
            className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 transition mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Kembali ke Pengaturan
          </button>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <Clock className="w-6 h-6 text-blue-600" />
            Master Shift Karyawan
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Kelola daftar shift kerja, jam masuk, dan jam pulang karyawan bisnis Anda.
          </p>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs px-4 py-2.5 rounded-2xl shadow-sm transition active:scale-95 shrink-0"
        >
          <Plus className="w-4 h-4" />
          Tambah Shift Baru
        </button>
      </div>

      {/* Shifts List */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-xs text-slate-500 font-bold mt-2">Memuat daftar shift...</span>
          </div>
        ) : shifts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {shifts.map((shift) => (
              <div 
                key={shift.id} 
                className="border border-slate-200 rounded-2xl p-5 bg-slate-50/50 hover:bg-white hover:shadow-md hover:border-blue-200 transition duration-200 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                    <Sun className="w-4 h-4 text-amber-500" />
                    {shift.name}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEditModal(shift)}
                      className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                      title="Edit Shift"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(shift.id, shift.name)}
                      className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                      title="Hapus Shift"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/60">
                  <div className="bg-white p-2.5 rounded-xl border border-slate-150">
                    <p className="text-[9px] font-bold text-slate-400 uppercase">Jam Masuk</p>
                    <p className="text-xs font-black text-blue-600 mt-0.5">
                      {shift.start_time ? shift.start_time.substring(0, 5) : "-"}
                    </p>
                  </div>

                  <div className="bg-white p-2.5 rounded-xl border border-slate-150">
                    <p className="text-[9px] font-bold text-slate-400 uppercase">Jam Pulang</p>
                    <p className="text-xs font-black text-rose-600 mt-0.5">
                      {shift.end_time ? shift.end_time.substring(0, 5) : "-"}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-slate-50 border border-dashed border-slate-200 rounded-2xl">
            <Clock className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-700">Belum ada Master Shift</p>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              Buat shift kerja pertama untuk mengatur jam kerja dan jam pulang karyawan Anda.
            </p>
            <button
              onClick={handleOpenAddModal}
              className="mt-4 inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs px-4 py-2 rounded-xl transition"
            >
              <Plus className="w-3.5 h-3.5" /> Tambah Shift Sekarang
            </button>
          </div>
        )}
      </div>

      {/* Modal Form */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            
            <div className="p-5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-600" />
                {editingShift ? "Edit Shift Kerja" : "Tambah Shift Kerja Baru"}
              </h3>
              <button 
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 transition p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
              {modalError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-600 font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{modalError}</span>
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 mb-1">Nama Shift <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  placeholder="Contoh: Shift Pagi / Shift Reguler"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Jam Masuk <span className="text-rose-500">*</span></label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Jam Pulang <span className="text-rose-500">*</span></label>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
                    required
                  />
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-xl shadow-sm transition disabled:opacity-50"
                >
                  {submitting ? "Memproses..." : editingShift ? "Simpan Perubahan" : "Buat Shift"}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}
    </div>
  );
}
