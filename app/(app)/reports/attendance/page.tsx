"use client";

import React, { useEffect, useState } from "react";
import { 
  Users, 
  Clock, 
  Search, 
  Calendar,
  CheckCircle,
  AlertCircle,
  XCircle,
  Download,
  Printer,
  ArrowLeft,
  MapPin,
  User,
  FileText
} from "lucide-react";
import { useBusiness } from "../../../../lib/context/BusinessContext";
import { createWebBrowserClient } from "../../../../lib/supabase/client";

interface Employee {
  id: string;
  name: string;
  nik: string | null;
  email: string | null;
}

interface AttendanceLog {
  id: string;
  date: string;
  status: "present" | "late" | "absent" | "sick" | "leave";
  employee_id: string;
  check_in: string | null;
  check_out: string | null;
  check_in_latitude: number | null;
  check_in_longitude: number | null;
  check_out_latitude: number | null;
  check_out_longitude: number | null;
  notes: string | null;
}

export default function AttendanceReportPage() {
  const { activeBusiness } = useBusiness();
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendances, setAttendances] = useState<AttendanceLog[]>([]);

  // Search & Filter states
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);

  const fetchAttendanceReportData = async () => {
    if (!activeBusiness) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const supabase = createWebBrowserClient();

      // 1. Fetch Employees
      const { data: empData, error: empError } = await supabase
        .from("employees")
        .select("id, name, nik, email")
        .eq("business_id", activeBusiness.id)
        .eq("is_active", true)
        .order("name", { ascending: true });

      if (empError) throw empError;
      setEmployees(empData || []);

      // 2. Fetch Attendances
      let attQuery = supabase
        .from("attendances")
        .select("id, date, status, employee_id, check_in, check_out, check_in_latitude, check_in_longitude, check_out_latitude, check_out_longitude, notes")
        .eq("business_id", activeBusiness.id);

      if (startDate) {
        attQuery = attQuery.gte("date", startDate);
      }
      if (endDate) {
        attQuery = attQuery.lte("date", endDate);
      }

      const { data: attData, error: attError } = await attQuery;
      if (attError) throw attError;
      setAttendances(attData as AttendanceLog[] || []);
    } catch (err) {
      console.error("Error loading attendance report data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Default current month date filter
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0];
    setStartDate(firstDay);
    setEndDate(lastDay);
  }, []);

  useEffect(() => {
    setSelectedEmployeeId(null);
  }, [activeBusiness]);

  useEffect(() => {
    if (startDate && endDate) {
      fetchAttendanceReportData();
    }
  }, [activeBusiness, startDate, endDate]);

  const formatPercent = (val: number) => {
    return `${val.toFixed(1)}%`;
  };

  const formatDateIndo = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      const dayNames = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
      const monthNames = [
        "Januari", "Februari", "Maret", "April", "Mei", "Juni", 
        "Juli", "Agustus", "September", "Oktober", "November", "Desember"
      ];
      return `${dayNames[d.getDay()]}, ${d.getDate()} ${monthNames[d.getMonth()]} ${d.getFullYear()}`;
    } catch (e) {
      return dateStr;
    }
  };

  const formatTime = (timeStr: string | null) => {
    if (!timeStr) return "-";
    try {
      const d = new Date(timeStr);
      return d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", hour12: false });
    } catch (e) {
      return "-";
    }
  };

  // Process Aggregates
  const employeeSummaries = employees.map(emp => {
    const empLogs = attendances.filter(att => att.employee_id === emp.id);
    
    const presentCount = empLogs.filter(l => l.status === "present").length;
    const lateCount = empLogs.filter(l => l.status === "late").length;
    const absentCount = empLogs.filter(l => l.status === "absent").length;
    const leaveCount = empLogs.filter(l => l.status === "leave").length;
    const sickCount = empLogs.filter(l => l.status === "sick").length;
    const totalWorking = empLogs.length;

    // Attendance percentage
    const attended = presentCount + lateCount;
    const rate = totalWorking > 0 ? (attended / totalWorking) * 100 : 0;

    return {
      ...emp,
      present: presentCount,
      late: lateCount,
      absent: absentCount,
      leaveAndSick: leaveCount + sickCount,
      total: totalWorking,
      rate
    };
  });

  const filteredSummaries = employeeSummaries.filter(emp => 
    emp.name.toLowerCase().includes(search.toLowerCase()) ||
    (emp.nik && emp.nik.includes(search))
  );

  // Business level metrics
  const avgAttendanceRate = filteredSummaries.length > 0
    ? filteredSummaries.reduce((sum, e) => sum + e.rate, 0) / filteredSummaries.length
    : 0;
  const totalLateCount = filteredSummaries.reduce((sum, e) => sum + e.late, 0);
  const totalAbsentCount = filteredSummaries.reduce((sum, e) => sum + e.absent, 0);

  const selectedEmployee = employees.find(e => e.id === selectedEmployeeId);
  const selectedEmployeeSummary = selectedEmployeeId 
    ? employeeSummaries.find(e => e.id === selectedEmployeeId)
    : null;

  // Generate daily logs for the selected employee
  const getSelectedEmployeeDetails = () => {
    if (!selectedEmployeeId || !startDate || !endDate) return [];
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    const logs: Array<{
      date: string;
      status: string;
      check_in: string | null;
      check_out: string | null;
      check_in_latitude: number | null;
      check_in_longitude: number | null;
      check_out_latitude: number | null;
      check_out_longitude: number | null;
      notes: string | null;
      isWeekend: boolean;
    }> = [];
    
    // Iterate through date range
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split("T")[0];
      const att = attendances.find(a => a.employee_id === selectedEmployeeId && a.date === dateStr);
      
      const dayOfWeek = d.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      
      if (att) {
        logs.push({
          date: dateStr,
          status: att.status,
          check_in: att.check_in,
          check_out: att.check_out,
          check_in_latitude: att.check_in_latitude ? Number(att.check_in_latitude) : null,
          check_in_longitude: att.check_in_longitude ? Number(att.check_in_longitude) : null,
          check_out_latitude: att.check_out_latitude ? Number(att.check_out_latitude) : null,
          check_out_longitude: att.check_out_longitude ? Number(att.check_out_longitude) : null,
          notes: att.notes,
          isWeekend
        });
      } else {
        logs.push({
          date: dateStr,
          status: "no_log",
          check_in: null,
          check_out: null,
          check_in_latitude: null,
          check_in_longitude: null,
          check_out_latitude: null,
          check_out_longitude: null,
          notes: null,
          isWeekend
        });
      }
    }
    
    return logs.sort((a, b) => b.date.localeCompare(a.date));
  };

  const getStatusBadge = (status: string, isWeekend: boolean) => {
    switch (status) {
      case "present":
        return (
          <span className="px-2.5 py-1 rounded-full border text-[10px] font-extrabold bg-emerald-50 text-emerald-600 border-emerald-100 uppercase tracking-wide">
            Hadir
          </span>
        );
      case "late":
        return (
          <span className="px-2.5 py-1 rounded-full border text-[10px] font-extrabold bg-amber-50 text-amber-600 border-amber-100 uppercase tracking-wide">
            Terlambat
          </span>
        );
      case "absent":
        return (
          <span className="px-2.5 py-1 rounded-full border text-[10px] font-extrabold bg-rose-50 text-rose-600 border-rose-100 uppercase tracking-wide">
            Alpa
          </span>
        );
      case "sick":
        return (
          <span className="px-2.5 py-1 rounded-full border text-[10px] font-extrabold bg-blue-50 text-blue-600 border-blue-100 uppercase tracking-wide">
            Sakit
          </span>
        );
      case "leave":
        return (
          <span className="px-2.5 py-1 rounded-full border text-[10px] font-extrabold bg-indigo-50 text-indigo-655 text-indigo-600 border-indigo-100 uppercase tracking-wide">
            Cuti
          </span>
        );
      default:
        if (isWeekend) {
          return (
            <span className="px-2.5 py-1 rounded-full border text-[10px] font-medium bg-slate-50 text-slate-400 border-slate-100 uppercase tracking-wide">
              Libur Akhir Pekan
            </span>
          );
        }
        return (
          <span className="px-2.5 py-1 rounded-full border text-[10px] font-bold bg-slate-100 text-slate-500 border-slate-200 uppercase tracking-wide">
            Tidak Ada Log
          </span>
        );
    }
  };

  const handleExportCSV = () => {
    let csvContent = "\uFEFF"; // UTF-8 BOM
    
    if (selectedEmployeeId && selectedEmployee) {
      csvContent += `LAPORAN ABSENSI DETAIL KARYAWAN\n`;
      csvContent += `Nama Karyawan: ${selectedEmployee.name}\n`;
      csvContent += `NIK: ${selectedEmployee.nik || "-"}\n`;
      csvContent += `Email: ${selectedEmployee.email || "-"}\n`;
      csvContent += `Bisnis: ${activeBusiness?.name || "Bisnis"}\n`;
      csvContent += `Periode: ${startDate || "Semua"} s.d. ${endDate || "Semua"}\n\n`;
      
      csvContent += "Tanggal,Hari,Status,Jam Masuk (Check-In),Jam Keluar (Check-Out),Catatan,Lokasi Masuk,Lokasi Keluar\n";
      
      const details = getSelectedEmployeeDetails();
      const dayNames = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
      
      details.forEach(log => {
        const d = new Date(log.date);
        const dayName = dayNames[d.getDay()];
        let statusText = "";
        switch (log.status) {
          case "present": statusText = "Hadir (Tepat Waktu)"; break;
          case "late": statusText = "Terlambat"; break;
          case "absent": statusText = "Mangkir (Alpa)"; break;
          case "sick": statusText = "Sakit"; break;
          case "leave": statusText = "Cuti"; break;
          default: statusText = log.isWeekend ? "Libur Akhir Pekan" : "Tidak Ada Log / Alpa";
        }
        
        const checkInTime = log.check_in ? new Date(log.check_in).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", hour12: false }) : "-";
        const checkOutTime = log.check_out ? new Date(log.check_out).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", hour12: false }) : "-";
        const notesText = log.notes ? `"${log.notes.replace(/"/g, '""')}"` : "-";
        const locIn = log.check_in_latitude && log.check_in_longitude ? `${log.check_in_latitude};${log.check_in_longitude}` : "-";
        const locOut = log.check_out_latitude && log.check_out_longitude ? `${log.check_out_latitude};${log.check_out_longitude}` : "-";
        
        csvContent += `"${log.date}","${dayName}","${statusText}","${checkInTime}","${checkOutTime}",${notesText},"${locIn}","${locOut}"\n`;
      });
      
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `Laporan_Absensi_Detail_${selectedEmployee.name.replace(/\s+/g, "_")}_${startDate}_sd_${endDate}.csv`);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      csvContent += "LAPORAN KEHADIRAN & ABSENSI KARYAWAN\n";
      csvContent += `${activeBusiness?.name || "Bisnis"}\n`;
      csvContent += `Periode: ${startDate || "Semua"} s.d. ${endDate || "Semua"}\n\n`;
      csvContent += "NIK,Nama Karyawan,Email,Hadir (Tepat Waktu),Terlambat,Cuti/Sakit,Mangkir (Absen),Total Hari Tercatat,Tingkat Kehadiran (%)\n";
      
      filteredSummaries.forEach(emp => {
        csvContent += `"${emp.nik || "-"}","${emp.name}","${emp.email || "-"}",${emp.present},${emp.late},${emp.leaveAndSick},${emp.absent},${emp.total},${emp.rate.toFixed(1)}\n`;
      });
      
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `Laporan_Absensi_Karyawan_${activeBusiness?.name || "Bisnis"}.csv`);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  if (loading && employees.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs text-slate-500 font-semibold mt-2">Menghitung laporan absensi...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* CSS untuk menyembunyikan sidebar dan komponen navigasi saat Print */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          /* Sembunyikan sidebar, navbar, footer dan elemen-elemen tombol */
          header, nav, aside, footer, .no-print, button, select, input {
            display: none !important;
          }
          /* Reset container margins/paddings */
          body, main, #root, [class*="layout"], [class*="container"] {
            background: white !important;
            color: black !important;
            padding: 0 !important;
            margin: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
          }
          .space-y-6 {
            margin-top: 0 !important;
            padding-top: 0 !important;
          }
          /* Pastikan bayangan bayangan dihilangkan agar cetak lebih bersih */
          .shadow-sm, .shadow, .border {
            box-shadow: none !important;
            border-color: #e2e8f0 !important;
          }
        }
      `}} />

      {/* Print-only Header */}
      <div className="hidden print:block border-b-2 border-slate-900 pb-4 mb-6">
        <h1 className="text-2xl font-extrabold text-slate-900 uppercase tracking-tight">
          Laporan Kehadiran Karyawan
        </h1>
        <p className="text-sm font-semibold text-slate-700 mt-1">
          {activeBusiness?.name || "Bisnis"}
        </p>
        <p className="text-xs text-slate-500 mt-0.5">
          Periode: {startDate ? formatDateIndo(startDate) : "-"} s.d. {endDate ? formatDateIndo(endDate) : "-"}
        </p>
        {selectedEmployee && (
          <div className="mt-4 pt-3 border-t border-dashed border-slate-200 grid grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-slate-400 block font-medium">Nama Karyawan:</span>
              <span className="font-bold text-slate-900">{selectedEmployee.name}</span>
            </div>
            <div>
              <span className="text-slate-400 block font-medium">NIK / Email:</span>
              <span className="font-bold text-slate-900">{selectedEmployee.nik || "-"} / {selectedEmployee.email || "-"}</span>
            </div>
          </div>
        )}
      </div>

      {/* Header */}
      {selectedEmployee ? (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4 no-print text-xs font-semibold">
          <div>
            <button
              onClick={() => setSelectedEmployeeId(null)}
              className="flex items-center gap-1.5 text-slate-500 hover:text-slate-700 font-bold mb-2 transition"
            >
              <ArrowLeft className="w-4 h-4" /> Kembali ke Semua Karyawan
            </button>
            <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              Detail Absensi: {selectedEmployee.name}
            </h2>
            <p className="text-sm text-slate-500 mt-0.5">
              NIK: {selectedEmployee.nik || "-"} • {selectedEmployee.email || "-"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition"
            >
              <Download className="w-4 h-4" /> Ekspor Detail (CSV)
            </button>
            <button
              onClick={() => window.print()}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition"
            >
              <Printer className="w-4 h-4" /> Cetak Detail (PDF)
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4 no-print text-xs font-semibold">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              Laporan Kehadiran Karyawan
            </h2>
            <p className="text-sm text-slate-500 mt-0.5">Analisis kedisiplinan karyawan, total hari kerja, jumlah keterlambatan, dan persentase absen.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition"
            >
              <Download className="w-4 h-4" /> Ekspor Excel (CSV)
            </button>
            <button
              onClick={() => window.print()}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition"
            >
              <Printer className="w-4 h-4" /> Cetak Laporan (PDF)
            </button>
          </div>
        </div>
      )}

      {/* Date Filters & Employee Selector - no-print */}
      <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm space-y-4 no-print text-xs font-semibold text-slate-550">
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center w-full md:w-auto">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs font-bold text-slate-500 shrink-0">Karyawan:</span>
              <select
                value={selectedEmployeeId || ""}
                onChange={(e) => setSelectedEmployeeId(e.target.value || null)}
                className="bg-white border border-slate-200 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-sm flex-1 sm:flex-none"
              >
                <option value="">Semua Karyawan</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.name}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs font-bold text-slate-500 shrink-0">Filter Periode:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-white border border-slate-200 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-sm flex-1 sm:flex-none"
              />
              <span>s.d.</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-white border border-slate-200 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-sm flex-1 sm:flex-none"
              />
            </div>
          </div>

          {!selectedEmployeeId && (
            <div className="relative w-full md:max-w-xs">
              <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari karyawan / NIK..."
                className="w-full bg-white border border-slate-200 pl-10 pr-4 py-2.5 rounded-xl text-xs placeholder-slate-400 focus:outline-none focus:border-blue-500 transition shadow-sm font-semibold"
              />
            </div>
          )}
        </div>
      </div>

      {/* Metric Cards */}
      {selectedEmployeeSummary ? (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm flex items-center gap-4 col-span-2 sm:col-span-1">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center border border-emerald-100 shrink-0">
              <CheckCircle className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Disiplin</span>
              <span className="text-xl font-extrabold text-slate-900">{formatPercent(selectedEmployeeSummary.rate)}</span>
            </div>
          </div>

          <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center border border-emerald-100 shrink-0">
              <CheckCircle className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Hadir</span>
              <span className="text-xl font-extrabold text-slate-900">{selectedEmployeeSummary.present} Hari</span>
            </div>
          </div>

          <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center border border-amber-100 shrink-0">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Terlambat</span>
              <span className="text-xl font-extrabold text-slate-900">{selectedEmployeeSummary.late} Hari</span>
            </div>
          </div>

          <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center border border-blue-100 shrink-0">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Sakit/Cuti</span>
              <span className="text-xl font-extrabold text-slate-900">{selectedEmployeeSummary.leaveAndSick} Hari</span>
            </div>
          </div>

          <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center border border-rose-100 shrink-0">
              <XCircle className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Alpa</span>
              <span className="text-xl font-extrabold text-slate-900">{selectedEmployeeSummary.absent} Hari</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center border border-emerald-100 shrink-0">
              <CheckCircle className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Rata-Rata Tingkat Kehadiran</span>
              <span className="text-xl font-extrabold text-slate-900">{formatPercent(avgAttendanceRate)}</span>
            </div>
          </div>

          <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center border border-amber-100 shrink-0">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Terlambat</span>
              <span className="text-xl font-extrabold text-slate-900">{totalLateCount} Kali</span>
            </div>
          </div>

          <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center border border-rose-100 shrink-0">
              <XCircle className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Mangkir (Alpa)</span>
              <span className="text-xl font-extrabold text-slate-900">{totalAbsentCount} Hari</span>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Table */}
      {selectedEmployeeId && selectedEmployee ? (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden text-xs font-semibold">
          <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Riwayat Absensi Harian</h3>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5">Detail log masuk, keluar, catatan, dan lokasi gps harian karyawan.</p>
            </div>
            <div className="text-[11px] text-slate-400 font-medium no-print">
              Menampilkan {getSelectedEmployeeDetails().length} hari
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-slate-700">
              <thead>
                <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-400 uppercase text-[9px] tracking-wider">
                  <th className="px-5 py-3">Hari / Tanggal</th>
                  <th className="px-5 py-3 text-center">Status</th>
                  <th className="px-5 py-3 text-center">Jam Masuk</th>
                  <th className="px-5 py-3 text-center">Jam Keluar</th>
                  <th className="px-5 py-3 text-center">Lokasi</th>
                  <th className="px-5 py-3">Catatan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-150">
                {getSelectedEmployeeDetails().length > 0 ? (
                  getSelectedEmployeeDetails().map((log) => {
                    const hasCoordinates = (log.check_in_latitude && log.check_in_longitude) || (log.check_out_latitude && log.check_out_longitude);
                    const mapsLink = hasCoordinates
                      ? `https://www.google.com/maps/search/?api=1&query=${log.check_in_latitude || log.check_out_latitude},${log.check_in_longitude || log.check_out_longitude}`
                      : null;

                    return (
                      <tr key={log.date} className={`hover:bg-slate-50/30 transition ${log.isWeekend ? "bg-slate-50/10 text-slate-400" : ""}`}>
                        <td className="px-5 py-3.5 font-bold text-slate-900">
                          {formatDateIndo(log.date)}
                        </td>
                        <td className="px-5 py-3.5 text-center">
                          {getStatusBadge(log.status, log.isWeekend)}
                        </td>
                        <td className="px-5 py-3.5 text-center font-mono font-bold text-slate-800">
                          {formatTime(log.check_in)}
                        </td>
                        <td className="px-5 py-3.5 text-center font-mono font-bold text-slate-800">
                          {formatTime(log.check_out)}
                        </td>
                        <td className="px-5 py-3.5 text-center">
                          {mapsLink ? (
                            <a
                              href={mapsLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 font-bold hover:underline"
                            >
                              <MapPin className="w-3.5 h-3.5" /> Gmaps
                            </a>
                          ) : (
                            <span className="text-slate-400 font-medium">-</span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-slate-600 font-medium max-w-xs truncate" title={log.notes || ""}>
                          {log.notes || <span className="text-slate-400 font-normal">-</span>}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="px-5 py-8 text-center text-slate-400 font-medium">
                      Pilih tanggal / periode untuk menampilkan riwayat.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Summary Table for All Employees */
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden text-xs font-semibold">
          <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50">
            <h3 className="font-bold text-slate-900 text-sm">Rincian Kehadiran per Karyawan</h3>
            <p className="text-[11px] text-slate-500 font-medium mt-0.5">Daftar agregasi hari kerja aktif, status tepat waktu, keterlambatan, dan alpa.</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-slate-700">
              <thead>
                <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-400 uppercase text-[9px] tracking-wider">
                  <th className="px-5 py-3">NIK</th>
                  <th className="px-5 py-3">Nama Karyawan</th>
                  <th className="px-5 py-3 text-center">Tepat Waktu</th>
                  <th className="px-5 py-3 text-center">Terlambat</th>
                  <th className="px-5 py-3 text-center">Cuti / Sakit</th>
                  <th className="px-5 py-3 text-center">Mangkir (Alpa)</th>
                  <th className="px-5 py-3 text-center">Total Hari Tercatat</th>
                  <th className="px-5 py-3 text-center">Rasio Disiplin</th>
                  <th className="px-5 py-3 text-center no-print">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-150">
                {filteredSummaries.length > 0 ? (
                  filteredSummaries.map((emp) => (
                    <tr key={emp.id} className="hover:bg-slate-50/30 transition">
                      <td className="px-5 py-3.5 font-mono text-slate-400">{emp.nik || "-"}</td>
                      <td className="px-5 py-3.5 font-bold text-slate-900">
                        <div>
                          <div>{emp.name}</div>
                          <div className="text-[10px] text-slate-400 font-medium mt-0.5">{emp.email}</div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-center font-bold text-emerald-650">{emp.present} Hari</td>
                      <td className="px-5 py-3.5 text-center font-bold text-amber-600">{emp.late} Hari</td>
                      <td className="px-5 py-3.5 text-center text-blue-600">{emp.leaveAndSick} Hari</td>
                      <td className="px-5 py-3.5 text-center text-rose-600">{emp.absent} Hari</td>
                      <td className="px-5 py-3.5 text-center text-slate-500 font-mono">{emp.total} Hari</td>
                      <td className="px-5 py-3.5 text-center">
                        <span className={`px-2 py-0.5 rounded-full border text-[10px] font-extrabold ${
                          emp.rate >= 90
                            ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                            : emp.rate >= 75
                              ? "bg-amber-50 text-amber-600 border-amber-100"
                              : "bg-rose-50 text-rose-600 border-rose-100"
                        }`}>
                          {formatPercent(emp.rate)}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-center no-print">
                        <button
                          onClick={() => setSelectedEmployeeId(emp.id)}
                          className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-1 px-2.5 rounded-lg border border-slate-200 transition"
                        >
                          Detail
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={9} className="px-5 py-8 text-center text-slate-400 font-medium">
                      Tidak ada log kehadiran karyawan ditemukan.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}
