"use client";

import React, { useEffect, useState, useRef } from "react";
import {
  ClipboardCheck,
  Camera,
  MapPin,
  Clock,
  CheckCircle,
  AlertCircle,
  Settings,
  Users,
  Locate,
  Navigation,
  Info,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Eye,
  Search,
  Download
} from "lucide-react";
import { useBusiness } from "../../../../lib/context/BusinessContext";
import { createWebBrowserClient } from "../../../../lib/supabase/client";
import { useGeofence } from "../../../../lib/hooks/useGeofence";

interface AttendanceRecord {
  id: string;
  date: string;
  check_in: string | null;
  check_out: string | null;
  overtime_in: string | null;
  overtime_out: string | null;
  overtime_notes: string | null;
  check_in_latitude: number | null;
  check_in_longitude: number | null;
  check_out_latitude: number | null;
  check_out_longitude: number | null;
  status: "present" | "late" | "absent" | "sick" | "leave";
  notes: string | null;
  employee: {
    name: string;
    email: string | null;
    working_shifts?: {
      name: string;
      start_time: string;
      end_time: string;
    } | null;
  };
}

interface Employee {
  id: string;
  name: string;
  email: string | null;
  user_id: string | null;
  face_descriptor: number[] | null;
  shift_id: string | null;
  working_shifts?: {
    name: string;
    start_time: string;
    end_time: string;
  } | null;
}

const getLocalDateString = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export default function AttendancePage() {
  const { activeBusiness, userRole, reloadBusiness } = useBusiness();
  const [activeTab, setActiveTab] = useState<"portal" | "history" | "logs" | "settings">("portal");
  const [loading, setLoading] = useState(true);
  const [currentEmployee, setCurrentEmployee] = useState<Employee | null>(null);

  // face-api states
  const [faceApiLoaded, setFaceApiLoaded] = useState(false);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [loadingModelsMsg, setLoadingModelsMsg] = useState("");
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [processing, setProcessing] = useState(false);

  // Attendance state for current user today
  const [todayRecord, setTodayRecord] = useState<any>(null);
  const [myLogs, setMyLogs] = useState<AttendanceRecord[]>([]);
  const [myLogsLoading, setMyLogsLoading] = useState(false);

  // Admin Logs & Settings States
  const [logs, setLogs] = useState<AttendanceRecord[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logSearch, setLogSearch] = useState("");
  const [logStatusFilter, setLogStatusFilter] = useState("all");
  const [settingsForm, setSettingsForm] = useState({
    latitude: "",
    longitude: "",
    radius: "100",
    geofenceEnabled: true,
    faceRecognitionEnabled: true,
    defaultStartTime: "09:00"
  });
  const [savingSettings, setSavingSettings] = useState(false);

  // References
  const videoRef = useRef<HTMLVideoElement>(null);
  const { userLocation, distance, inRange, error: geoError, loading: geoLoading, checkLocation } = useGeofence();

  // Load dynamically Vladmandic face-api CDN script if face recognition is enabled
  useEffect(() => {
    if (!activeBusiness) return;
    const isFaceRecEnabled = activeBusiness.attendance_face_recognition_enabled ?? true;
    if (!isFaceRecEnabled) return;

    const scriptId = "face-api-cdn-script";
    const existingScript = document.getElementById(scriptId);
    
    if (existingScript) {
      setFaceApiLoaded(true);
      return;
    }

    const script = document.createElement("script");
    script.id = scriptId;
    script.src = "https://cdn.jsdelivr.net/npm/@vladmandic/face-api/dist/face-api.js";
    script.async = true;
    script.onload = () => {
      setFaceApiLoaded(true);
    };
    script.onerror = () => {
      console.error("Gagal memuat face-api.js CDN script");
      setCameraError("Gagal memuat modul pengenal wajah (CDN offline).");
    };
    document.body.appendChild(script);
  }, [activeBusiness]);

  // Load face recognition model weights from CDN
  const loadFaceApiModels = async () => {
    if (!faceApiLoaded) return;
    try {
      setLoadingModelsMsg("Memuat AI model deteksi wajah (0.5MB - 5MB)...");
      const fapi = (window as any).faceapi;
      const modelUrl = "https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@master/weights/";
      
      // Load TinyFaceDetector, Landmarks, and Face Recognition Models
      await Promise.all([
        fapi.nets.tinyFaceDetector.loadFromUri(modelUrl),
        fapi.nets.faceLandmark68Net.loadFromUri(modelUrl),
        fapi.nets.faceRecognitionNet.loadFromUri(modelUrl)
      ]);
      
      setModelsLoaded(true);
      setLoadingModelsMsg("");
    } catch (err) {
      console.error("Error loading face-api models:", err);
      setCameraError("Gagal memuat parameter kecerdasan buatan wajah.");
      setLoadingModelsMsg("");
    }
  };

  useEffect(() => {
    if (faceApiLoaded) {
      loadFaceApiModels();
    }
  }, [faceApiLoaded]);

  const fetchTodayAttendance = async (employeeId: string) => {
    try {
      const supabase = createWebBrowserClient();
      const todayStr = getLocalDateString();
      const { data, error } = await supabase
        .from("attendances")
        .select("*")
        .eq("employee_id", employeeId)
        .eq("date", todayStr)
        .maybeSingle();

      if (error) throw error;
      setTodayRecord(data);
    } catch (e) {
      console.error("Error loading today attendance status:", e);
    }
  };

  const fetchMyLogs = async (employeeId: string) => {
    try {
      setMyLogsLoading(true);
      const supabase = createWebBrowserClient();
      const { data, error } = await supabase
        .from("attendances")
        .select(`
          id, date, check_in, check_out, overtime_in, overtime_out, overtime_notes, status, notes
        `)
        .eq("employee_id", employeeId)
        .order("date", { ascending: false });

      if (error) throw error;
      setMyLogs((data || []) as any);
    } catch (e) {
      console.error("Error loading my attendance logs:", e);
    } finally {
      setMyLogsLoading(false);
    }
  };

  const fetchAllLogs = async () => {
    if (!activeBusiness) return;
    try {
      setLogsLoading(true);
      const supabase = createWebBrowserClient();
      const { data, error } = await supabase
        .from("attendances")
        .select(`
          id, date, check_in, check_out, overtime_in, overtime_out, overtime_notes, check_in_latitude, check_in_longitude, check_out_latitude, check_out_longitude, status, notes,
          employee:employee_id (name, email, working_shifts:shift_id (name, start_time, end_time))
        `)
        .eq("business_id", activeBusiness.id)
        .order("date", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) throw error;
      setLogs((data || []) as any);
    } catch (e) {
      console.error("Error loading all attendance logs:", e);
    } finally {
      setLogsLoading(false);
    }
  };

  const initializeUserSession = async () => {
    if (!activeBusiness) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const supabase = createWebBrowserClient();
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError || !user) {
        setLoading(false);
        return;
      }

      // Check employee record
      let emp: Employee | null = null;
      
      // Query by user_id
      const { data: empByUid } = await supabase
        .from("employees")
        .select("id, name, email, user_id, face_descriptor, shift_id, working_shifts:shift_id (name, start_time, end_time)")
        .eq("business_id", activeBusiness.id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (empByUid) {
        emp = empByUid as any;
      } else if (user.email) {
        // Fallback: search by email & auto-link
        const { data: empByEmail } = await supabase
          .from("employees")
          .select("id, name, email, user_id, face_descriptor, shift_id, working_shifts:shift_id (name, start_time, end_time)")
          .eq("business_id", activeBusiness.id)
          .eq("email", user.email)
          .maybeSingle();

        if (empByEmail) {
          console.log("Auto-linking employee record to user session...");
          const { data: updatedEmp } = await supabase
            .from("employees")
            .update({ user_id: user.id })
            .eq("id", empByEmail.id)
            .select("id, name, email, user_id, face_descriptor, shift_id, working_shifts:shift_id (name, start_time, end_time)")
            .single();
          emp = updatedEmp as any;
        }
      }

      setCurrentEmployee(emp);

      // Route default view
      if (userRole === "owner" || userRole === "admin") {
        if (!emp) {
          setActiveTab("logs");
        }
      }

      // Pre-populate settings form
      setSettingsForm({
        latitude: activeBusiness.latitude?.toString() || "",
        longitude: activeBusiness.longitude?.toString() || "",
        radius: activeBusiness.geofence_radius_meters?.toString() || "100",
        geofenceEnabled: activeBusiness.attendance_geofence_enabled ?? true,
        faceRecognitionEnabled: activeBusiness.attendance_face_recognition_enabled ?? true,
        defaultStartTime: activeBusiness.default_attendance_start_time?.substring(0, 5) || "09:00"
      });

      if (emp) {
        await fetchTodayAttendance(emp.id);
        await fetchMyLogs(emp.id);
      }
      if (userRole === "owner" || userRole === "admin") {
        await fetchAllLogs();
      }

      // Trigger location validation if geofencing is enabled
      const isGeofenceEnabled = activeBusiness.attendance_geofence_enabled ?? true;
      if (isGeofenceEnabled) {
        checkLocation(
          activeBusiness.latitude ? Number(activeBusiness.latitude) : null,
          activeBusiness.longitude ? Number(activeBusiness.longitude) : null,
          Number(activeBusiness.geofence_radius_meters || 100)
        );
      }

    } catch (e) {
      console.error("Error initializing session:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    initializeUserSession();
  }, [activeBusiness, userRole]);

  // Stream reference state to keep track of the stream
  const [stream, setStream] = useState<MediaStream | null>(null);

  // Manage camera stream on cameraActive toggle
  useEffect(() => {
    if (cameraActive) {
      setCameraError("");
      navigator.mediaDevices
        .getUserMedia({ video: { width: 320, height: 240, facingMode: "user" } })
        .then((mediaStream) => {
          setStream(mediaStream);
          // Small timeout to allow React to mount the <video> element
          setTimeout(() => {
            if (videoRef.current) {
              videoRef.current.srcObject = mediaStream;
              videoRef.current.play().catch(e => console.error("Play video feed error:", e));
            }
          }, 100);
        })
        .catch((err) => {
          console.error("Akses kamera ditolak:", err);
          setCameraError("Akses kamera ditolak browser. Izinkan kamera untuk melakukan absen.");
          setCameraActive(false);
        });
    } else {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
        setStream(null);
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [cameraActive]);

  const startVideoFeed = () => {
    if (!modelsLoaded) {
      alert("Kecerdasan buatan deteksi wajah (AI Models) sedang dimuat. Harap tunggu beberapa saat...");
      return;
    }
    setCameraActive(true);
  };

  const stopVideoFeed = () => {
    setCameraActive(false);
  };

  // Run Local Face Detection and Descriptor calculations
  const calculateDescriptor = async (): Promise<Float32Array | null> => {
    if (!modelsLoaded) {
      alert("Model deteksi wajah sedang dimuat. Silakan tunggu sebentar.");
      return null;
    }
    if (!videoRef.current) {
      alert("Kamera video tidak aktif atau tidak ditemukan.");
      return null;
    }
    const fapi = (window as any).faceapi;
    
    // Scan single face with TinyDetector
    const detection = await fapi
      .detectSingleFace(videoRef.current, new fapi.TinyFaceDetectorOptions({ inputSize: 128, scoreThreshold: 0.5 }))
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (!detection) {
      alert("Wajah tidak terdeteksi. Harap dekatkan wajah Anda ke tengah bingkai kamera.");
      return null;
    }

    return detection.descriptor;
  };

  // Enrollment (Pendaftaran Wajah Baru)
  const handleRegisterFace = async () => {
    if (!currentEmployee) return;
    try {
      setProcessing(true);
      const descriptor = await calculateDescriptor();
      if (!descriptor) return;

      const descriptorArray = Array.from(descriptor);
      const supabase = createWebBrowserClient();

      const { error } = await supabase
        .from("employees")
        .update({ face_descriptor: descriptorArray })
        .eq("id", currentEmployee.id);

      if (error) throw error;

      setCurrentEmployee({
        ...currentEmployee,
        face_descriptor: descriptorArray
      });
      stopVideoFeed();
      alert("Pendaftaran wajah sukses! Wajah Anda kini terdaftar sebagai kunci absen.");
    } catch (err: any) {
      console.error("Gagal mendaftarkan wajah:", err);
      alert(err.message || "Gagal menyimpan pengenal wajah.");
    } finally {
      setProcessing(false);
    }
  };

  const saveAttendanceRecord = async (type: "in" | "out") => {
    if (!currentEmployee || !activeBusiness) return;
    const lat = userLocation?.latitude || null;
    const lon = userLocation?.longitude || null;
    const supabase = createWebBrowserClient();
    const todayStr = getLocalDateString();

    if (type === "in") {
      // Get shift start time from employee's assigned shift or business default
      let shiftTimeStr = "09:00:00";
      if (currentEmployee.working_shifts) {
        const shiftObj = Array.isArray(currentEmployee.working_shifts)
          ? currentEmployee.working_shifts[0]
          : currentEmployee.working_shifts;
        if (shiftObj?.start_time) {
          shiftTimeStr = shiftObj.start_time;
        }
      } else if (activeBusiness.default_attendance_start_time) {
        shiftTimeStr = activeBusiness.default_attendance_start_time;
      }

      const parts = shiftTimeStr.split(":");
      const shiftHours = Number(parts[0] || 9);
      const shiftMinutes = Number(parts[1] || 0);

      const now = new Date();
      const curHours = now.getHours();
      const curMinutes = now.getMinutes();

      const isLate = curHours > shiftHours || (curHours === shiftHours && curMinutes > shiftMinutes);
      const status = isLate ? "late" : "present";

      const { error } = await supabase
        .from("attendances")
        .upsert({
          business_id: activeBusiness.id,
          employee_id: currentEmployee.id,
          shift_id: currentEmployee.shift_id || null,
          date: todayStr,
          check_in: new Date().toISOString(),
          check_in_latitude: lat,
          check_in_longitude: lon,
          status: status
        }, {
          onConflict: "employee_id, date"
        });

      if (error) throw error;
      alert(`Absen MASUK Berhasil! Status: ${isLate ? "Terlambat" : "Tepat Waktu"}`);
    } else {
      const { error } = await supabase
        .from("attendances")
        .update({
          check_out: new Date().toISOString(),
          check_out_latitude: lat,
          check_out_longitude: lon
        })
        .eq("employee_id", currentEmployee.id)
        .eq("date", todayStr);

      if (error) throw error;
      alert("Absen KELUAR Berhasil! Kerja bagus untuk hari ini.");
    }

    stopVideoFeed();
    await fetchTodayAttendance(currentEmployee.id);
    if (userRole === "owner" || userRole === "admin") {
      await fetchAllLogs();
    }
  };

  const handleOvertimeInOut = async (type: "overtime_in" | "overtime_out") => {
    if (!currentEmployee) {
      alert("Absen Lembur Gagal: Data karyawan tidak terdeteksi.");
      return;
    }
    try {
      setProcessing(true);
      const supabase = createWebBrowserClient();
      const todayStr = getLocalDateString();

      if (type === "overtime_in") {
        const { error } = await supabase
          .from("attendances")
          .update({
            overtime_in: new Date().toISOString()
          })
          .eq("employee_id", currentEmployee.id)
          .eq("date", todayStr);

        if (error) throw error;
        alert("Absen LEMBUR MASUK Berhasil!");
      } else {
        const { error } = await supabase
          .from("attendances")
          .update({
            overtime_out: new Date().toISOString()
          })
          .eq("employee_id", currentEmployee.id)
          .eq("date", todayStr);

        if (error) throw error;
        alert("Absen LEMBUR PULANG Berhasil!");
      }

      await fetchTodayAttendance(currentEmployee.id);
      if (userRole === "owner" || userRole === "admin") {
        await fetchAllLogs();
      }
    } catch (err: any) {
      console.error("Error updating overtime:", err);
      alert("Gagal mencatat lembur: " + err.message);
    } finally {
      setProcessing(false);
    }
  };

  // Verification & Attendance check
  const handleCheckInOut = async (type: "in" | "out") => {
    if (!activeBusiness) {
      alert("Absensi Gagal: Data bisnis tidak terdeteksi. Silakan segarkan halaman.");
      return;
    }
    if (!currentEmployee) {
      alert("Absensi Gagal: Akun login Anda belum terhubung dengan data karyawan mana pun di bisnis ini. Silakan hubungi admin untuk mendaftarkan email Anda di menu Karyawan.");
      return;
    }

    const isGeofenceEnabled = activeBusiness.attendance_geofence_enabled ?? true;
    if (isGeofenceEnabled) {
      if (geoError) {
        alert(`Absensi Gagal: Terjadi kesalahan GPS (${geoError}). Pastikan izin lokasi aktif.`);
        return;
      }
      if (geoLoading || !userLocation) {
        alert("Sedang mendeteksi lokasi GPS Anda... Silakan tunggu beberapa detik dan coba lagi.");
        return;
      }
      if (!inRange) {
        alert(`Absensi Gagal: Anda berada di luar radius lokasi kantor! Jarak Anda: ${distance ? Math.round(distance) : "?"}m (Radius maks: ${activeBusiness.geofence_radius_meters || 100}m)`);
        return;
      }
    }

    const isFaceRecEnabled = activeBusiness.attendance_face_recognition_enabled ?? true;
    if (isFaceRecEnabled) {
      if (!currentEmployee.face_descriptor || currentEmployee.face_descriptor.length === 0) {
        alert("Absensi Gagal: Anda belum mendaftarkan wajah di sistem!");
        return;
      }

      try {
        setProcessing(true);
        const newDescriptor = await calculateDescriptor();
        if (!newDescriptor) return;

        const fapi = (window as any).faceapi;
        const storedDescriptor = new Float32Array(currentEmployee.face_descriptor);

        // Measure similarity (Euclidean distance)
        const dist = fapi.euclideanDistance(newDescriptor, storedDescriptor);
        console.log("Recognition distance index:", dist);

        // Vladmandic tiny-face-detector threshold standard is 0.55
        if (dist > 0.55) {
          alert(`Verifikasi Wajah Gagal: Wajah Anda tidak cocok dengan yang terdaftar (Jarak: ${dist.toFixed(3)}). Harap posisikan kepala tegak lurus dan pencahayaan terang.`);
          return;
        }

        await saveAttendanceRecord(type);
      } catch (err: any) {
        console.error("Gagal menyimpan absensi:", err);
        alert(err.message || "Gagal mencatat absensi.");
      } finally {
        setProcessing(false);
      }
    } else {
      try {
        setProcessing(true);
        await saveAttendanceRecord(type);
      } catch (err: any) {
        console.error("Gagal menyimpan absensi:", err);
        alert(err.message || "Gagal mencatat absensi.");
      } finally {
        setProcessing(false);
      }
    }
  };

  // Fetch Current location for Geofence Target settings
  const handleFetchCurrentCoords = () => {
    if (!navigator.geolocation) {
      alert("Geolokasi tidak didukung browser.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setSettingsForm({
          ...settingsForm,
          latitude: pos.coords.latitude.toString(),
          longitude: pos.coords.longitude.toString()
        });
        alert("Koordinat GPS berhasil disematkan dari lokasi Anda saat ini!");
      },
      (err) => {
        alert("Gagal mendeteksi lokasi GPS Anda: " + err.message);
      },
      { enableHighAccuracy: true }
    );
  };

  // Save Settings
  const handleSaveGeofenceSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBusiness) return;

    try {
      setSavingSettings(true);
      const supabase = createWebBrowserClient();
      
      const timeStr = settingsForm.defaultStartTime;
      const formattedTime = timeStr.includes(":") && timeStr.split(":").length === 2 ? `${timeStr}:00` : timeStr;

      const { error } = await supabase
        .from("businesses")
        .update({
          latitude: settingsForm.latitude ? Number(settingsForm.latitude) : null,
          longitude: settingsForm.longitude ? Number(settingsForm.longitude) : null,
          geofence_radius_meters: settingsForm.radius ? Number(settingsForm.radius) : null,
          attendance_geofence_enabled: settingsForm.geofenceEnabled,
          attendance_face_recognition_enabled: settingsForm.faceRecognitionEnabled,
          default_attendance_start_time: formattedTime
        })
        .eq("id", activeBusiness.id);

      if (error) throw error;
      
      alert("Pengaturan absensi sukses diperbarui!");
      await reloadBusiness();
    } catch (err: any) {
      console.error("Error saving attendance settings:", err);
      alert(err.message || "Gagal menyimpan pengaturan absensi.");
    } finally {
      setSavingSettings(false);
    }
  };

  // Helper Owner profile builder
  const handleRegisterSelfAsEmployee = async () => {
    if (!activeBusiness) return;
    try {
      setLoading(true);
      const supabase = createWebBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) return;

      const { error } = await supabase
        .from("employees")
        .insert({
          business_id: activeBusiness.id,
          name: user.user_metadata?.full_name || "Pemilik Bisnis",
          email: user.email || null,
          user_id: user.id,
          nik: "9999999999999999",
          ptkp_status: "TK/0",
          basic_salary: 0,
          allowance_fixed: 0,
          join_date: new Date().toISOString().split("T")[0],
          is_active: true
        });

      if (error) throw error;
      await initializeUserSession();
      alert("Profil Anda sukses terdaftar sebagai Karyawan. Anda sekarang dapat mencoba menu Absensi Selfie Kamera.");
    } catch (err: any) {
      console.error("Gagal mendaftarkan diri:", err);
      alert(err.message || "Gagal mendaftarkan diri.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-semibold">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            Absensi GPS Geofencing & Face Recognition
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">Lakukan pencatatan check-in harian dengan keamanan pengenalan wajah lokal tanpa biaya API.</p>
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="flex border-b border-slate-200 text-xs font-bold gap-6 overflow-x-auto">
        <button
          onClick={() => setActiveTab("portal")}
          className={`pb-3 transition font-extrabold shrink-0 ${
            activeTab === "portal"
              ? "border-b-2 border-blue-600 text-blue-600"
              : "text-slate-500 hover:text-slate-900"
          }`}
        >
          Portal Absen Saya
        </button>
        <button
          onClick={() => setActiveTab("history")}
          className={`pb-3 transition font-extrabold shrink-0 ${
            activeTab === "history"
              ? "border-b-2 border-blue-600 text-blue-600"
              : "text-slate-500 hover:text-slate-900"
          }`}
        >
          Riwayat Absen Saya
        </button>
        {(userRole === "owner" || userRole === "admin") && (
          <>
            <button
              onClick={() => setActiveTab("logs")}
              className={`pb-3 transition font-extrabold shrink-0 ${
                activeTab === "logs"
                  ? "border-b-2 border-blue-600 text-blue-600"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              Log Kehadiran Karyawan
            </button>
            <button
              onClick={() => setActiveTab("settings")}
              className={`pb-3 transition font-extrabold shrink-0 ${
                activeTab === "settings"
                  ? "border-b-2 border-blue-600 text-blue-600"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              Pengaturan Absensi
            </button>
          </>
        )}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs text-slate-500 font-semibold mt-2">Menyelaraskan koordinat absensi...</p>
        </div>
      ) : activeTab === "portal" ? (
        // PORTAL ABSEN VIEW
        !currentEmployee ? (
          <div className="bg-white border border-slate-200 rounded-3xl p-8 max-w-xl mx-auto text-center space-y-4 shadow-sm my-6 card-shadow">
            <div className="w-16 h-16 rounded-3xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto border border-blue-100">
              <Camera className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-extrabold text-slate-900">Hubungkan Profil Karyawan Anda</h3>
              <p className="text-xs text-slate-500 font-medium max-w-md mx-auto leading-relaxed">
                Anda sedang login sebagai Administrator / Pemilik Bisnis. Daftarkan dan hubungkan akun Anda sebagai karyawan untuk dapat mencoba absensi selfie wajah biometrik dan validasi GPS secara mandiri.
              </p>
            </div>
            <button
              type="button"
              onClick={handleRegisterSelfAsEmployee}
              className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold px-6 py-3 rounded-2xl shadow-lg shadow-blue-500/25 transition active:scale-95 text-xs inline-flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Daftarkan Diri & Coba Absensi (1-Klik)</span>
            </button>
          </div>
        ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs font-semibold">
          
          {/* Geofence GPS status */}
          <div className="md:col-span-1 space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Validasi Posisi GPS Anda</h3>
            
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4 card-shadow">
              
              {/* Location indicator */}
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${
                  !(activeBusiness?.attendance_geofence_enabled ?? true)
                    ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                    : inRange 
                      ? "bg-emerald-50 text-emerald-600 border-emerald-100" 
                      : "bg-rose-50 text-rose-600 border-rose-100"
                }`}>
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-slate-900">Zona Kantor</div>
                  <div className="font-medium text-slate-400 mt-0.5">
                    {!(activeBusiness?.attendance_geofence_enabled ?? true)
                      ? "Bebas Lokasi (GPS Nonaktif)"
                      : inRange 
                        ? "Berada Dalam Radius Kantor" 
                        : "Di Luar Radius Kantor"}
                  </div>
                </div>
              </div>

              {/* Haversine Distance Details */}
              {(activeBusiness?.attendance_geofence_enabled ?? true) ? (
                <div className="border-t border-slate-100 pt-3 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-bold">Jarak ke Kantor:</span>
                    <span className="font-extrabold text-slate-800">
                      {distance !== null ? `${Math.round(distance)} Meter` : "Mengukur..."}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-bold">Akurasi GPS Perangkat:</span>
                    <span className="font-bold text-slate-700">
                      {userLocation?.accuracy ? `+/- ${Math.round(userLocation.accuracy)} Meter` : "-"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-bold">Radius Toleransi:</span>
                    <span className="font-bold text-slate-700">
                      {activeBusiness?.geofence_radius_meters || 100} Meter
                    </span>
                  </div>
                </div>
              ) : (
                <div className="border-t border-slate-100 pt-3 text-[10px] text-slate-450 leading-normal font-medium">
                  Pengaturan GPS geofencing telah dinonaktifkan oleh pemilik bisnis. Anda dapat melakukan absensi check-in/out tanpa batasan jarak lokasi.
                </div>
              )}

              {geoError && (activeBusiness?.attendance_geofence_enabled ?? true) && (
                <div className="bg-rose-50 border border-rose-100 text-rose-600 p-2.5 rounded-xl flex items-start gap-1.5">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{geoError}</span>
                </div>
              )}

              {(activeBusiness?.attendance_geofence_enabled ?? true) && (
                <button
                  onClick={() => {
                    checkLocation(
                      activeBusiness?.latitude ? Number(activeBusiness.latitude) : null,
                      activeBusiness?.longitude ? Number(activeBusiness.longitude) : null,
                      Number(activeBusiness?.geofence_radius_meters || 100)
                    );
                  }}
                  disabled={geoLoading}
                  className="w-full bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition active:scale-95 disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${geoLoading ? "animate-spin" : ""}`} /> Perbarui Posisi GPS
                </button>
              )}
            </div>

            {/* Attendance Status Today */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4 card-shadow">
              <h4 className="font-bold text-slate-900 flex items-center gap-1.5 border-b border-slate-100 pb-2">
                <Clock className="w-4.5 h-4.5 text-blue-600" /> Jam Kerja Hari Ini
              </h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center text-[10px] text-blue-650 font-bold bg-blue-50/40 border border-blue-100/50 p-2 rounded-lg mb-1">
                  <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-blue-600" /> Shift Anda:</span>
                  <span>
                    {(() => {
                      const shift = Array.isArray(currentEmployee?.working_shifts) 
                        ? currentEmployee?.working_shifts[0] 
                        : currentEmployee?.working_shifts;
                      if (shift) {
                        return `${shift.name} (${shift.start_time.substring(0, 5)} - ${shift.end_time.substring(0, 5)})`;
                      }
                      const defTime = activeBusiness?.default_attendance_start_time?.substring(0, 5) || "09:00";
                      return `Default Kantor (${defTime})`;
                    })()}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-slate-400 font-bold">Check-In Masuk:</span>
                  <span className="font-extrabold text-slate-800">
                    {todayRecord?.check_in 
                      ? new Date(todayRecord.check_in).toLocaleTimeString("id-ID", { timeStyle: "short" }) 
                      : "--:--"}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 font-bold">Check-Out Keluar:</span>
                  <span className="font-extrabold text-slate-800">
                    {todayRecord?.check_out 
                      ? new Date(todayRecord.check_out).toLocaleTimeString("id-ID", { timeStyle: "short" }) 
                      : "--:--"}
                  </span>
                </div>
                <div className="flex justify-between items-center border-t border-slate-100 pt-2.5">
                  <span className="text-slate-400 font-bold">Status Kehadiran:</span>
                  <span>
                    {todayRecord?.status === "present" && (
                      <span className="bg-emerald-50 text-emerald-600 border border-emerald-100 px-2 py-0.5 rounded font-bold text-[10px]">Tepat Waktu</span>
                    )}
                    {todayRecord?.status === "late" && (
                      <span className="bg-rose-50 text-rose-600 border border-rose-100 px-2 py-0.5 rounded font-bold text-[10px]">Terlambat</span>
                    )}
                    {!todayRecord && (
                      <span className="bg-slate-100 text-slate-500 border border-slate-200 px-2 py-0.5 rounded font-bold text-[10px]">Belum Absen</span>
                    )}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Camera / Direct Attendance Panel */}
          <div className="md:col-span-2 space-y-4">
            <h3 className="text-sm font-bold text-slate-900">
              {(activeBusiness?.attendance_face_recognition_enabled ?? true)
                ? "Verifikasi Kamera Biometrik"
                : "Pencatatan Kehadiran"}
            </h3>
            
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col items-center justify-center min-h-[380px] card-shadow relative">
              
              {!(activeBusiness?.attendance_face_recognition_enabled ?? true) ? (
                // Face Recognition is Disabled: Show simple direct check-in buttons
                <div className="text-center p-8 max-w-sm space-y-5 flex flex-col items-center">
                  <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center border border-blue-100">
                    <Clock className="w-8 h-8 text-blue-600" />
                  </div>
                  
                  <div className="space-y-1">
                    <p className="font-bold text-slate-800 text-sm">Pencatatan Mandiri</p>
                    <p className="text-[11px] text-slate-500 leading-normal">
                      Verifikasi wajah dinonaktifkan untuk bisnis Anda. Anda dapat langsung menekan tombol di bawah untuk mencatat kehadiran.
                    </p>
                  </div>

                  <div className="flex flex-col gap-3 w-full items-center">
                    <div className="flex gap-3 w-full justify-center flex-wrap">
                      {/* Check-In Button */}
                      {!todayRecord?.check_in && (
                        <button
                          type="button"
                          disabled={processing}
                          onClick={() => handleCheckInOut("in")}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-2.5 px-6 rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition active:scale-95 disabled:opacity-50 min-w-[140px]"
                        >
                          <CheckCircle className="w-4 h-4" /> Check-In Masuk
                        </button>
                      )}
                      {/* Check-Out Button */}
                      {todayRecord?.check_in && !todayRecord?.check_out && (
                        <button
                          type="button"
                          disabled={processing}
                          onClick={() => handleCheckInOut("out")}
                          className="bg-rose-600 hover:bg-rose-700 text-white font-extrabold py-2.5 px-6 rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition active:scale-95 disabled:opacity-50 min-w-[140px]"
                        >
                          <XCircle className="w-4 h-4" /> Check-Out Keluar
                        </button>
                      )}
                      {todayRecord?.check_in && todayRecord?.check_out && (
                        <div className="bg-slate-100 border border-slate-200 text-slate-500 font-bold py-2.5 px-6 rounded-xl text-center min-w-[180px]">
                          Absen Reguler Selesai
                        </div>
                      )}
                    </div>

                    {/* Overtime Actions */}
                    {todayRecord?.check_in && (
                      <div className="pt-3 border-t border-slate-150 w-full flex flex-col items-center gap-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Catatan Lembur Hari Ini</span>
                        <div className="flex gap-2 flex-wrap justify-center">
                          {!todayRecord?.overtime_in ? (
                            <button
                              type="button"
                              disabled={processing}
                              onClick={() => handleOvertimeInOut("overtime_in")}
                              className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-xl text-xs flex items-center gap-1 shadow-sm transition active:scale-95"
                            >
                              <Clock className="w-3.5 h-3.5" /> Lembur Masuk
                            </button>
                          ) : !todayRecord?.overtime_out ? (
                            <button
                              type="button"
                              disabled={processing}
                              onClick={() => handleOvertimeInOut("overtime_out")}
                              className="bg-purple-800 hover:bg-purple-900 text-white font-bold py-2 px-4 rounded-xl text-xs flex items-center gap-1 shadow-sm transition active:scale-95"
                            >
                              <Clock className="w-3.5 h-3.5" /> Lembur Pulang
                            </button>
                          ) : (
                            <div className="text-[11px] font-bold text-purple-700 bg-purple-50 border border-purple-200 px-3 py-1 rounded-xl">
                              Lembur: {new Date(todayRecord.overtime_in).toLocaleTimeString("id-ID", { timeStyle: "short" })} - {new Date(todayRecord.overtime_out).toLocaleTimeString("id-ID", { timeStyle: "short" })}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                // Face Recognition is Enabled: Original biometrics view
                <>
                  {loadingModelsMsg && (
                    <div className="absolute inset-0 bg-white/95 backdrop-blur-sm z-15 flex flex-col items-center justify-center gap-3 rounded-2xl p-4 text-center">
                      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-slate-650 font-bold">{loadingModelsMsg}</span>
                      <span className="text-[10px] text-slate-400 mt-1 max-w-xs leading-normal">
                        Pemuatan ini hanya terjadi sekali di awal menggunakan static weights CDN bebas lisensi (Rp 0 API).
                      </span>
                    </div>
                  )}

                  {cameraActive ? (
                    <div className="space-y-4 w-full max-w-xs flex flex-col items-center">
                      
                      {/* Camera Frame View */}
                      <div className="relative border-4 border-blue-600 rounded-3xl overflow-hidden shadow-md aspect-video bg-black max-w-[320px] w-full flex items-center justify-center">
                        <video
                          ref={videoRef}
                          muted
                          className="w-full h-full object-cover scale-x-[-1]"
                        />
                        <div className="absolute inset-4 border border-dashed border-white/50 rounded-2xl pointer-events-none flex items-center justify-center">
                          <div className="w-24 h-32 border border-white/30 rounded-[50px] opacity-40"></div>
                        </div>
                      </div>

                      <div className="flex gap-2 w-full">
                        {/* Face Enrollment Button */}
                        {(!currentEmployee?.face_descriptor || currentEmployee.face_descriptor.length === 0) ? (
                          <button
                            type="button"
                            disabled={processing}
                            onClick={handleRegisterFace}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-extrabold py-2.5 rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition active:scale-95 disabled:opacity-50"
                          >
                            <Camera className="w-4 h-4" /> {processing ? "Merekam Wajah..." : "Daftarkan Wajah"}
                          </button>
                        ) : (
                          <>
                            {/* Check-In Button */}
                            {!todayRecord?.check_in && (
                              <button
                                type="button"
                                disabled={processing}
                                onClick={() => handleCheckInOut("in")}
                                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-2.5 rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition active:scale-95 disabled:opacity-50"
                              >
                                <CheckCircle className="w-4 h-4" /> Check-In Masuk
                              </button>
                            )}
                            {/* Check-Out Button */}
                            {todayRecord?.check_in && !todayRecord?.check_out && (
                              <button
                                type="button"
                                disabled={processing}
                                onClick={() => handleCheckInOut("out")}
                                className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-extrabold py-2.5 rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition active:scale-95 disabled:opacity-50"
                              >
                                <XCircle className="w-4 h-4" /> Check-Out Keluar
                              </button>
                            )}
                            {todayRecord?.check_in && todayRecord?.check_out && (
                              <div className="w-full bg-slate-100 border border-slate-200 text-slate-500 font-bold py-2.5 rounded-xl text-center">
                                Absen Hari Ini Selesai
                              </div>
                            )}
                          </>
                        )}
                      </div>
                      
                      <button
                        type="button"
                        onClick={stopVideoFeed}
                        className="text-xs text-slate-400 hover:underline hover:text-slate-600"
                      >
                        Matikan Kamera
                      </button>

                    </div>
                  ) : (
                    <div className="text-center p-8 max-w-sm space-y-4">
                      
                      <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center border border-blue-100 mx-auto">
                        <Camera className="w-8 h-8 text-blue-650" />
                      </div>
                      
                      <div className="space-y-1">
                        <p className="font-bold text-slate-800 text-sm">Validasi Kamera Kehadiran</p>
                        {(!currentEmployee?.face_descriptor || currentEmployee.face_descriptor.length === 0) ? (
                          <p className="text-[11px] text-slate-500 leading-normal">
                            Anda belum mendaftarkan wajah biometrik di database bisnis. Silakan aktifkan kamera untuk mengambil potret wajah pertama Anda.
                          </p>
                        ) : (
                          <p className="text-[11px] text-slate-500 leading-normal">
                            Kunci wajah Anda terdaftar. Lakukan absensi check-in/out dengan menghadapkan kamera ke wajah Anda di area geofence kantor.
                          </p>
                        )}
                      </div>

                      {cameraError && (
                        <div className="bg-rose-50 border border-rose-100 text-rose-600 p-2.5 rounded-xl text-left flex items-start gap-1.5">
                          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                          <span>{cameraError}</span>
                        </div>
                      )}

                      <button
                        onClick={startVideoFeed}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold py-2.5 px-6 rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition active:scale-95 disabled:opacity-50 mx-auto"
                      >
                        <Camera className="w-4 h-4" /> Aktifkan Kamera Absen
                      </button>
                    </div>
                  )}
                </>
              )}

            </div>
          </div>

        </div>
        )
      ) : activeTab === "history" ? (
        <div className="space-y-4 text-xs font-semibold">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
            <Clock className="w-4.5 h-4.5 text-blue-600" /> Riwayat Absensi Saya (30 Hari Terakhir)
          </h3>
          
          {myLogsLoading ? (
            <div className="flex flex-col items-center justify-center py-20 bg-white border border-slate-200 rounded-2xl">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-xs text-slate-500 font-semibold mt-2">Memuat riwayat absen Anda...</p>
            </div>
          ) : myLogs.length > 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden card-shadow">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 uppercase text-[10px] tracking-wider border-b border-slate-200">
                      <th className="py-3 px-4 font-extrabold whitespace-nowrap">Tanggal</th>
                      <th className="py-3 px-4 font-extrabold whitespace-nowrap">Jam Masuk</th>
                      <th className="py-3 px-4 font-extrabold whitespace-nowrap">Jam Keluar</th>
                      <th className="py-3 px-4 font-extrabold whitespace-nowrap">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {myLogs.slice(0, 30).map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 whitespace-nowrap font-bold">
                          {new Date(log.date).toLocaleDateString("id-ID", { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap font-bold">
                          {log.check_in ? new Date(log.check_in).toLocaleTimeString("id-ID", { timeStyle: "short" }) : "-"}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap font-bold">
                          {log.check_out ? new Date(log.check_out).toLocaleTimeString("id-ID", { timeStyle: "short" }) : "-"}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          {log.status === "present" && (
                            <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-600 border border-emerald-100 px-2.5 py-0.5 rounded font-bold text-[10px]">
                              Tepat Waktu
                            </span>
                          )}
                          {log.status === "late" && (
                            <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-600 border border-rose-100 px-2.5 py-0.5 rounded font-bold text-[10px]">
                              Terlambat
                            </span>
                          )}
                          {log.status === "absent" && (
                            <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-600 border border-slate-200 px-2.5 py-0.5 rounded font-bold text-[10px]">
                              Alpa
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl py-12 px-4 flex flex-col items-center justify-center text-center">
              <ClipboardCheck className="w-12 h-12 text-slate-300 mb-3" />
              <div className="text-slate-900 font-bold text-sm">Belum Ada Riwayat Absen</div>
              <div className="text-slate-500 text-xs mt-1">Anda belum memiliki catatan absensi sebelumnya.</div>
            </div>
          )}
        </div>
      ) : activeTab === "logs" ? (
        // LOGS VIEW (Admin/Owner)
        <div className="space-y-4 text-xs font-semibold">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <Users className="w-4.5 h-4.5 text-blue-600" /> Log Riwayat Absensi Karyawan
            </h3>

            {/* Filter & Search Bar */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative min-w-[180px]">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={logSearch}
                  onChange={(e) => setLogSearch(e.target.value)}
                  placeholder="Cari nama karyawan..."
                  className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-blue-500 font-semibold shadow-2xs"
                />
              </div>

              <select
                value={logStatusFilter}
                onChange={(e) => setLogStatusFilter(e.target.value)}
                className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700 focus:outline-none focus:border-blue-500 shadow-2xs"
              >
                <option value="all">Semua Status</option>
                <option value="present">Tepat Waktu</option>
                <option value="late">Terlambat</option>
                <option value="overtime">Lembur</option>
              </select>

              <button
                type="button"
                onClick={fetchAllLogs}
                className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition flex items-center justify-center shadow-2xs"
                title="Muat Ulang Data"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          
          {logsLoading ? (
            <div className="flex flex-col items-center justify-center py-20 bg-white border border-slate-200 rounded-3xl">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-xs text-slate-500 font-semibold mt-2">Memuat riwayat log absensi...</p>
            </div>
          ) : logs.length > 0 ? (
            <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden card-shadow">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                      <th className="py-3 px-4">Nama Karyawan</th>
                      <th className="py-3 px-4">Tanggal Kerja</th>
                      <th className="py-3 px-4">Check-In</th>
                      <th className="py-3 px-4">Check-Out (Jam Pulang)</th>
                      <th className="py-3 px-4">Jam Lembur (Masuk - Pulang)</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4">Koordinat GPS Check-in</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {logs
                      .filter(log => {
                        const q = logSearch.toLowerCase().trim();
                        const matchesSearch = !q || 
                          log.employee?.name?.toLowerCase().includes(q) ||
                          log.employee?.email?.toLowerCase().includes(q);
                        const matchesStatus = logStatusFilter === "all" 
                          ? true 
                          : logStatusFilter === "overtime" 
                            ? !!log.overtime_in 
                            : log.status === logStatusFilter;
                        return matchesSearch && matchesStatus;
                      })
                      .map((log) => {
                        const empShift = Array.isArray(log.employee?.working_shifts) 
                          ? log.employee?.working_shifts[0] 
                          : log.employee?.working_shifts;

                        return (
                          <tr key={log.id} className="hover:bg-slate-50/80 transition">
                            <td className="py-3 px-4 font-bold text-slate-900">
                              {log.employee?.name}
                              <div className="text-[10px] text-slate-400 font-mono font-medium">{log.employee?.email}</div>
                              {empShift && (
                                <span className="inline-flex items-center gap-1 text-[9px] text-blue-600 font-bold bg-blue-50 border border-blue-100 px-1.5 py-0.5 rounded-md mt-0.5">
                                  <Clock className="w-2.5 h-2.5" /> {empShift.name} ({empShift.start_time.substring(0, 5)} - {empShift.end_time.substring(0, 5)})
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4 font-bold text-slate-650">
                              {new Date(log.date).toLocaleDateString("id-ID", { dateStyle: "long" })}
                            </td>
                            <td className="py-3 px-4 font-extrabold text-slate-800">
                              {log.check_in ? new Date(log.check_in).toLocaleTimeString("id-ID", { timeStyle: "short" }) : "-"}
                            </td>
                            <td className="py-3 px-4 font-extrabold text-slate-800">
                              {log.check_out ? new Date(log.check_out).toLocaleTimeString("id-ID", { timeStyle: "short" }) : "-"}
                              {empShift?.end_time && (
                                <div className="text-[9px] text-slate-400 font-normal">Target: {empShift.end_time.substring(0, 5)}</div>
                              )}
                            </td>
                            <td className="py-3 px-4 font-bold text-purple-700">
                              {log.overtime_in ? (
                                <div className="text-[11px]">
                                  {new Date(log.overtime_in).toLocaleTimeString("id-ID", { timeStyle: "short" })}
                                  {" - "}
                                  {log.overtime_out ? new Date(log.overtime_out).toLocaleTimeString("id-ID", { timeStyle: "short" }) : "Berlangsung..."}
                                </div>
                              ) : (
                                <span className="text-slate-400 font-normal">-</span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-center">
                              {log.status === "present" && (
                                <span className="bg-emerald-50 text-emerald-600 border border-emerald-100 px-2 py-0.5 rounded-md font-bold text-[10px]">Tepat Waktu</span>
                              )}
                              {log.status === "late" && (
                                <span className="bg-rose-50 text-rose-600 border border-rose-100 px-2 py-0.5 rounded-md font-bold text-[10px]">Terlambat</span>
                              )}
                              {log.status === "absent" && (
                                <span className="bg-slate-100 text-slate-600 border border-slate-200 px-2 py-0.5 rounded-md font-bold text-[10px]">Alpa</span>
                              )}
                            </td>
                            <td className="py-3 px-4 font-mono text-slate-500 text-xs">
                              {log.check_in_latitude && log.check_in_longitude ? (
                                <a
                                  href={`https://maps.google.com/?q=${log.check_in_latitude},${log.check_in_longitude}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:underline flex items-center gap-1 font-bold"
                                >
                                  <MapPin className="w-3 h-3" />
                                  <span>{log.check_in_latitude.toFixed(4)}, {log.check_in_longitude.toFixed(4)}</span>
                                </a>
                              ) : (
                                "-"
                              )}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-3xl p-16 text-center text-slate-400 shadow-sm flex flex-col items-center justify-center">
              <ClipboardCheck className="w-12 h-12 text-slate-300 mb-3" />
              <p className="font-bold text-slate-600 text-sm">Belum ada data riwayat absensi tercatat</p>
            </div>
          )}
        </div>
      ) : (
        // GEOFENCE SETTINGS VIEW (Admin/Owner)
        <div className="space-y-4 text-xs font-semibold max-w-lg">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
            <Settings className="w-4.5 h-4.5 text-blue-600" /> Konfigurasi Kehadiran & Geofence
          </h3>

          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm card-shadow">
            <form onSubmit={handleSaveGeofenceSettings} className="space-y-5">
              
              {/* Toggles for Geofence & Face Recognition */}
              <div className="bg-slate-50/80 border border-slate-200/70 rounded-2xl p-5 space-y-4">
                <h4 className="font-extrabold text-slate-900 border-b border-slate-200/60 pb-2.5 text-xs">Fitur Absensi Aktif</h4>
                
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settingsForm.geofenceEnabled}
                    onChange={(e) => setSettingsForm({ ...settingsForm, geofenceEnabled: e.target.checked })}
                    className="w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500 mt-0.5 cursor-pointer"
                  />
                  <div>
                    <span className="font-bold text-slate-800">Aktifkan GPS Geofencing</span>
                    <p className="text-[10px] text-slate-400 font-medium mt-0.5 leading-relaxed">Karyawan wajib berada dalam radius tertentu dari koordinat kantor agar dapat absen.</p>
                  </div>
                </label>

                <label className="flex items-start gap-3 cursor-pointer border-t border-slate-200/60 pt-3">
                  <input
                    type="checkbox"
                    checked={settingsForm.faceRecognitionEnabled}
                    onChange={(e) => setSettingsForm({ ...settingsForm, faceRecognitionEnabled: e.target.checked })}
                    className="w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500 mt-0.5 cursor-pointer"
                  />
                  <div>
                    <span className="font-bold text-slate-800">Aktifkan Verifikasi Wajah (Face Recognition)</span>
                    <p className="text-[10px] text-slate-400 font-medium mt-0.5 leading-relaxed">Karyawan wajib melakukan verifikasi wajah biometrik (selfie verifikasi) untuk check-in/out.</p>
                  </div>
                </label>

                <div className="border-t border-slate-200/60 pt-3 flex flex-col gap-1">
                  <span className="font-bold text-slate-800">Jam Masuk Default Kantor (Global)</span>
                  <p className="text-[10px] text-slate-400 font-medium mb-1.5">Digunakan untuk menghitung keterlambatan jika karyawan tidak memiliki shift khusus.</p>
                  <div className="relative max-w-[140px]">
                    <input
                      type="time"
                      required
                      value={settingsForm.defaultStartTime}
                      onChange={(e) => setSettingsForm({ ...settingsForm, defaultStartTime: e.target.value })}
                      className="w-full bg-white border border-slate-200 px-3.5 py-2 rounded-xl text-slate-800 focus:outline-none focus:border-blue-500 font-bold text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Geofence Coordinate Configuration */}
              <div className="space-y-4">
                <div className="bg-blue-50/60 border border-blue-100 rounded-2xl p-4 flex items-start gap-3 leading-relaxed text-slate-700 text-xs">
                  <Navigation className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                  <span className="font-medium">
                    Tentukan lokasi pusat kantor bisnis Anda. Karyawan hanya diperbolehkan melakukan absensi jika koordinat GPS peranti mereka berada dalam radius geofencing di bawah.
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-slate-600 font-bold text-[11px]">Latitude Pusat Kantor</label>
                    <input
                      type="text"
                      value={settingsForm.latitude}
                      onChange={(e) => setSettingsForm({ ...settingsForm, latitude: e.target.value })}
                      placeholder="e.g. -6.2088"
                      className="w-full bg-white border border-slate-200 px-3.5 py-2.5 rounded-xl text-slate-800 focus:outline-none focus:border-blue-500 font-bold text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-slate-600 font-bold text-[11px]">Longitude Pusat Kantor</label>
                    <input
                      type="text"
                      value={settingsForm.longitude}
                      onChange={(e) => setSettingsForm({ ...settingsForm, longitude: e.target.value })}
                      placeholder="e.g. 106.8456"
                      className="w-full bg-white border border-slate-200 px-3.5 py-2.5 rounded-xl text-slate-800 focus:outline-none focus:border-blue-500 font-bold text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 border-t border-slate-100 pt-3">
                  <div className="space-y-1">
                    <label className="text-slate-600 font-bold text-[11px]">Radius Toleransi Geofence (Meter)</label>
                    <input
                      type="number"
                      min="10"
                      max="10000"
                      value={settingsForm.radius}
                      onChange={(e) => setSettingsForm({ ...settingsForm, radius: e.target.value })}
                      placeholder="100"
                      className="w-full bg-white border border-slate-200 px-3.5 py-2.5 rounded-xl text-slate-800 focus:outline-none focus:border-blue-500 font-bold text-xs"
                    />
                  </div>

                  <div className="space-y-1 flex items-end">
                    <button
                      type="button"
                      onClick={handleFetchCurrentCoords}
                      className="w-full bg-slate-100 border border-slate-200 hover:bg-slate-200 text-slate-800 font-extrabold py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition active:scale-95 text-xs shadow-2xs"
                    >
                      <Locate className="w-4 h-4 text-blue-600" /> Ambil Lokasi Saya
                    </button>
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-3">
                <button
                  type="submit"
                  disabled={savingSettings}
                  className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-extrabold px-6 py-3 rounded-xl shadow-md shadow-blue-500/20 transition active:scale-95 disabled:opacity-50 text-xs"
                >
                  {savingSettings ? "Menyimpan..." : "Simpan Pengaturan Kehadiran"}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
