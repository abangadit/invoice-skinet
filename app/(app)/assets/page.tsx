"use client";

import React, { useEffect, useState } from "react";
import {
  Layers,
  Plus,
  Calendar,
  AlertCircle,
  TrendingDown,
  Building2,
  Trash2,
  Coins,
  CheckCircle2,
  HelpCircle,
  ChevronRight,
  BookOpen,
  X
} from "lucide-react";
import { useBusiness } from "../../../lib/context/BusinessContext";
import { createWebBrowserClient } from "../../../lib/supabase/client";

interface FixedAsset {
  id: string;
  asset_code: string;
  name: string;
  purchase_date: string;
  purchase_cost: number;
  residual_value: number;
  useful_life_years: number;
  depreciation_method: "straight_line" | "double_declining";
  accumulated_depreciation: number;
  book_value: number;
  status: string;
}

interface DepreciationLog {
  id: string;
  fixed_asset_id: string;
  period_month: number;
  period_year: number;
  depreciation_amount: number;
  created_at: string;
  asset_name?: string;
  asset_code?: string;
}

export default function FixedAssetsPage() {
  const { activeBusiness } = useBusiness();
  const [assets, setAssets] = useState<FixedAsset[]>([]);
  const [logs, setLogs] = useState<DepreciationLog[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal & form states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDepModal, setShowDepModal] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [saving, setSaving] = useState(false);

  // Form Fields
  const [name, setName] = useState("");
  const [assetCode, setAssetCode] = useState("");
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split("T")[0]);
  const [purchaseCost, setPurchaseCost] = useState<number>(0);
  const [residualValue, setResidualValue] = useState<number>(0);
  const [usefulLifeYears, setUsefulLifeYears] = useState<number>(4);
  const [depMethod, setDepMethod] = useState<"straight_line" | "double_declining">("straight_line");

  // Run Depreciation Form
  const [depMonth, setDepMonth] = useState<number>(new Date().getMonth() + 1);
  const [depYear, setDepYear] = useState<number>(new Date().getFullYear());

  const months = [
    { value: 1, label: "Januari" },
    { value: 2, label: "Februari" },
    { value: 3, label: "Maret" },
    { value: 4, label: "April" },
    { value: 5, label: "Mei" },
    { value: 6, label: "Juni" },
    { value: 7, label: "Juli" },
    { value: 8, label: "Agustus" },
    { value: 9, label: "September" },
    { value: 10, label: "Oktober" },
    { value: 11, label: "November" },
    { value: 12, label: "Desember" }
  ];

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);

  const generateAssetCode = () => {
    const now = new Date();
    const random = Math.floor(100 + Math.random() * 900);
    setAssetCode(`AST-${now.getFullYear()}-${random}`);
  };

  const fetchAssetsAndLogs = async () => {
    if (!activeBusiness) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const supabase = createWebBrowserClient();

      // 1. Fetch Assets
      const { data: assetData, error: assetError } = await supabase
        .from("fixed_assets")
        .select("*")
        .eq("business_id", activeBusiness.id)
        .order("purchase_date", { ascending: false });

      if (assetError) throw assetError;
      
      const formattedAssets: FixedAsset[] = (assetData || []).map(a => ({
        ...a,
        purchase_cost: Number(a.purchase_cost || 0),
        residual_value: Number(a.residual_value || 0),
        accumulated_depreciation: Number(a.accumulated_depreciation || 0),
        book_value: Number(a.book_value || 0)
      }));
      setAssets(formattedAssets);

      // 2. Fetch Depreciation Logs
      const { data: logData, error: logError } = await supabase
        .from("depreciation_logs")
        .select(`
          *,
          fixed_asset:fixed_assets (
            name,
            asset_code,
            business_id
          )
        `)
        .order("created_at", { ascending: false })
        .limit(30);

      if (logError) throw logError;

      // Filter logs based on business in memory (since we joined fixed_assets)
      const formattedLogs: DepreciationLog[] = (logData || [])
        .filter((l: any) => l.fixed_asset?.business_id === activeBusiness.id)
        .map((l: any) => ({
          id: l.id,
          fixed_asset_id: l.fixed_asset_id,
          period_month: l.period_month,
          period_year: l.period_year,
          depreciation_amount: Number(l.depreciation_amount || 0),
          created_at: l.created_at,
          asset_name: l.fixed_asset?.name,
          asset_code: l.fixed_asset?.asset_code
        }));
      setLogs(formattedLogs);

    } catch (err) {
      console.error("Error loading asset records:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssetsAndLogs();
  }, [activeBusiness]);

  const handleOpenAddModal = () => {
    setName("");
    generateAssetCode();
    setPurchaseDate(new Date().toISOString().split("T")[0]);
    setPurchaseCost(0);
    setResidualValue(0);
    setUsefulLifeYears(4);
    setDepMethod("straight_line");
    setErrorMsg("");
    setShowAddModal(true);
  };

  const handleSaveAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBusiness) return;

    if (purchaseCost <= 0) {
      setErrorMsg("Harga Perolehan harus lebih dari 0!");
      return;
    }

    if (residualValue < 0 || residualValue >= purchaseCost) {
      setErrorMsg("Nilai Residu tidak boleh negatif dan harus di bawah Harga Perolehan!");
      return;
    }

    try {
      setSaving(true);
      setErrorMsg("");
      const supabase = createWebBrowserClient();

      const { error } = await supabase
        .from("fixed_assets")
        .insert({
          business_id: activeBusiness.id,
          asset_code: assetCode,
          name,
          purchase_date: purchaseDate,
          purchase_cost: purchaseCost,
          residual_value: residualValue,
          useful_life_years: usefulLifeYears,
          depreciation_method: depMethod,
          accumulated_depreciation: 0,
          book_value: purchaseCost, // initially book value = purchase cost
          status: "active"
        });

      if (error) throw error;

      setShowAddModal(false);
      fetchAssetsAndLogs();
    } catch (err: any) {
      console.error("Error saving asset:", err);
      setErrorMsg(err.message || "Gagal menyimpan aset tetap.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAsset = async (id: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus data aset ini secara permanen? Catatan log penyusutan & jurnal terkait tidak akan otomatis terhapus.")) return;
    try {
      const supabase = createWebBrowserClient();
      const { error } = await supabase.from("fixed_assets").delete().eq("id", id);
      if (error) throw error;
      fetchAssetsAndLogs();
    } catch (err: any) {
      console.error("Error deleting asset:", err);
      alert(err.message || "Gagal menghapus aset tetap.");
    }
  };

  const handleRunDepreciation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBusiness) return;

    if (!confirm(`Jalankan depresiasi bulanan secara masal untuk periode ${depMonth}/${depYear}? Ini akan menjurnal penyusutan aset otomatis.`)) {
      return;
    }

    try {
      setSaving(true);
      setErrorMsg("");
      const supabase = createWebBrowserClient();

      const { error } = await supabase.rpc("run_monthly_depreciation", {
        p_business_id: activeBusiness.id,
        p_month: depMonth,
        p_year: depYear
      });

      if (error) throw error;

      alert(`Penyusutan Aset periode ${depMonth}/${depYear} berhasil dijalankan!`);
      setShowDepModal(false);
      fetchAssetsAndLogs();
    } catch (err: any) {
      console.error("Error running depreciation:", err);
      setErrorMsg(err.message || "Gagal menjalankan penyusutan otomatis.");
    } finally {
      setSaving(false);
    }
  };

  // Compute Stats
  const totalCost = assets.reduce((sum, a) => sum + a.purchase_cost, 0);
  const totalAccum = assets.reduce((sum, a) => sum + a.accumulated_depreciation, 0);
  const totalBookVal = assets.reduce((sum, a) => sum + a.book_value, 0);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0
    }).format(val);
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-semibold">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            Manajemen Aktiva Tetap (Assets)
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">Pantau penyusutan nilai buku aset tetap dan lakukan tutup buku depresiasi bulanan.</p>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={() => setShowDepModal(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold py-2.5 px-4 rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition active:scale-95"
          >
            <TrendingDown className="w-4 h-4" /> Penyusutan Bulanan
          </button>
          
          <button
            onClick={handleOpenAddModal}
            className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold py-2.5 px-4 rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition active:scale-95"
          >
            <Plus className="w-4 h-4" /> Tambah Aset
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs font-semibold">
        
        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm card-shadow space-y-1">
          <span className="text-slate-450 font-bold text-[10px] uppercase tracking-wider">Jumlah Aktiva Tetap</span>
          <p className="text-lg font-extrabold text-slate-900">{assets.length} Item Aset</p>
        </div>

        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm card-shadow space-y-1">
          <span className="text-blue-500 font-bold text-[10px] uppercase tracking-wider">Total Harga Perolehan</span>
          <p className="text-lg font-extrabold text-blue-650">{formatCurrency(totalCost)}</p>
        </div>

        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm card-shadow space-y-1">
          <span className="text-rose-500 font-bold text-[10px] uppercase tracking-wider">Total Akumulasi Depresiasi</span>
          <p className="text-lg font-extrabold text-rose-600">-{formatCurrency(totalAccum)}</p>
        </div>

        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm card-shadow space-y-1">
          <span className="text-emerald-500 font-bold text-[10px] uppercase tracking-wider">Total Nilai Buku Bersih</span>
          <p className="text-lg font-extrabold text-emerald-600">{formatCurrency(totalBookVal)}</p>
        </div>

      </div>

      {/* Main Content Grid: Asset List & Log History */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-xs font-semibold">
        
        {/* Left Side: Asset Catalog List */}
        <div className="lg:col-span-2 space-y-6">
          
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 bg-white border border-slate-200 rounded-2xl shadow-sm">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-xs text-slate-500 font-semibold mt-2">Memuat daftar aset tetap...</p>
            </div>
          ) : assets.length > 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden card-shadow">
              <div className="p-4 bg-slate-50 border-b border-slate-200">
                <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Daftar Inventaris Aktiva Tetap ({assets.length})
                </h3>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider">
                      <th className="py-2.5 px-4">Kode / Nama Aset</th>
                      <th className="py-2.5 px-4 text-right">Harga Perolehan</th>
                      <th className="py-2.5 px-4 text-center">Manfaat (Thn)</th>
                      <th className="py-2.5 px-4 text-right">Akumulasi Depresiasi</th>
                      <th className="py-2.5 px-4 text-right text-emerald-600">Nilai Buku</th>
                      <th className="py-2.5 px-4 text-center">Hapus</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {assets.map((ast) => (
                      <tr key={ast.id} className="hover:bg-slate-50 transition">
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-800">{ast.name}</div>
                          <div className="font-mono text-[9px] text-slate-400 mt-0.5">
                            {ast.asset_code} | Beli: {new Date(ast.purchase_date).toLocaleDateString("id-ID")}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right font-medium">
                          {formatCurrency(ast.purchase_cost)}
                        </td>
                        <td className="py-3 px-4 text-center font-bold text-slate-650">
                          {ast.useful_life_years} Tahun
                        </td>
                        <td className="py-3 px-4 text-right text-rose-500 font-semibold">
                          -{formatCurrency(ast.accumulated_depreciation)}
                        </td>
                        <td className="py-3 px-4 text-right font-extrabold text-slate-900">
                          {formatCurrency(ast.book_value)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => handleDeleteAsset(ast.id)}
                            className="text-rose-500 hover:bg-rose-50 p-1.5 rounded-lg transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-400 shadow-sm">
              <Layers className="w-12 h-12 mx-auto text-slate-200 mb-3" />
              <p className="text-sm font-semibold">Tidak ada aktiva tetap ditemukan</p>
              <button onClick={handleOpenAddModal} className="text-xs font-bold text-blue-600 hover:underline mt-1 inline-block">
                Daftarkan Aset Pertama Anda
              </button>
            </div>
          )}

        </div>

        {/* Right Side: Depreciation Log History */}
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm space-y-4 card-shadow">
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Log Riwayat Penyusutan Bulanan
            </h4>

            {logs.length > 0 ? (
              <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                {logs.map((log) => (
                  <div
                    key={log.id}
                    className="p-3 bg-slate-50 border border-slate-100 rounded-xl space-y-1.5 hover:bg-slate-100/70 transition"
                  >
                    <div className="flex justify-between items-start">
                      <span className="font-bold text-slate-800">{log.asset_name}</span>
                      <span className="text-[10px] font-extrabold text-rose-600">
                        -{formatCurrency(log.depreciation_amount)}
                      </span>
                    </div>
                    
                    <div className="flex justify-between text-[9px] text-slate-400 font-bold">
                      <span>Kode: {log.asset_code}</span>
                      <span>Periode: {months.find(m => m.value === log.period_month)?.label} {log.period_year}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[10px] text-slate-400 font-medium italic">Belum ada riwayat penyusutan tercatat.</p>
            )}
          </div>
        </div>

      </div>

      {/* Add Asset Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col text-xs font-semibold">
            
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-950 flex items-center gap-1.5">
                <Plus className="w-4.5 h-4.5 text-blue-600" />
                Daftarkan Aset Tetap Baru
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600 transition">
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            {errorMsg && (
              <div className="mx-5 mt-4 bg-rose-50 border border-rose-100 text-rose-600 p-2.5 rounded-xl flex items-start gap-1.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSaveAsset} className="p-5 space-y-4">
              
              <div className="space-y-1">
                <label className="text-slate-500">Nama Aset / Aktiva</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Printer Epson L121"
                  className="w-full bg-white border border-slate-200 px-3.5 py-2.5 rounded-xl text-slate-800 focus:outline-none focus:border-blue-500 shadow-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-slate-500">Kode Aset (Auto)</label>
                  <input
                    type="text"
                    required
                    value={assetCode}
                    onChange={(e) => setAssetCode(e.target.value)}
                    className="w-full bg-white border border-slate-200 px-3.5 py-2.5 rounded-xl text-slate-800 focus:outline-none font-mono font-bold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-500">Tanggal Beli</label>
                  <input
                    type="date"
                    required
                    value={purchaseDate}
                    onChange={(e) => setPurchaseDate(e.target.value)}
                    className="w-full bg-white border border-slate-200 px-3 py-2 rounded-xl text-slate-800 focus:outline-none font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-slate-500">Harga Beli (Rp)</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={purchaseCost}
                    onChange={(e) => setPurchaseCost(Number(e.target.value))}
                    className="w-full bg-white border border-slate-200 px-3.5 py-2.5 rounded-xl text-slate-800 focus:outline-none focus:border-blue-500 font-bold text-right"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-500">Nilai Residu Sisa (Rp)</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={residualValue}
                    onChange={(e) => setResidualValue(Number(e.target.value))}
                    className="w-full bg-white border border-slate-200 px-3.5 py-2.5 rounded-xl text-slate-800 focus:outline-none focus:border-blue-500 font-bold text-right"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-slate-500">Masa Manfaat Aset</label>
                  <select
                    value={usefulLifeYears}
                    onChange={(e) => setUsefulLifeYears(Number(e.target.value))}
                    className="w-full bg-white border border-slate-200 px-3 py-2.5 rounded-xl text-slate-800 focus:outline-none font-bold"
                  >
                    <option value={1}>1 Tahun</option>
                    <option value={2}>2 Tahun</option>
                    <option value={3}>3 Tahun</option>
                    <option value={4}>4 Tahun</option>
                    <option value={5}>5 Tahun</option>
                    <option value={8}>8 Tahun</option>
                    <option value={10}>10 Tahun</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-500">Metode Depresiasi</label>
                  <select
                    value={depMethod}
                    onChange={(e) => setDepMethod(e.target.value as any)}
                    className="w-full bg-white border border-slate-200 px-3 py-2.5 rounded-xl text-slate-800 focus:outline-none font-bold"
                  >
                    <option value="straight_line">Garis Lurus (Straight Line)</option>
                  </select>
                </div>
              </div>

              <div className="border-t border-slate-150 pt-4 flex gap-2 justify-end -mx-5 -mb-5 p-5 bg-slate-50/50">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold px-4 py-2 rounded-xl transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold px-5 py-2 rounded-xl shadow-sm transition active:scale-95 disabled:opacity-50"
                >
                  {saving ? "Mendaftarkan..." : "Daftarkan Aset"}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Run Depreciation Modal */}
      {showDepModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col text-xs font-semibold">
            
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-950 flex items-center gap-1.5">
                <TrendingDown className="w-4.5 h-4.5 text-blue-600" />
                Penyusutan Aset Tutup Buku
              </h3>
              <button onClick={() => setShowDepModal(false)} className="text-slate-400 hover:text-slate-600 transition">
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            {errorMsg && (
              <div className="mx-5 mt-4 bg-rose-50 border border-rose-100 text-rose-600 p-2.5 rounded-xl flex items-start gap-1.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleRunDepreciation} className="p-5 space-y-4">
              
              <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl flex gap-2 text-[10.5px] leading-normal text-slate-600 font-medium">
                <AlertCircle className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                <span>Sistem akan menghitung beban penyusutan bulanan untuk seluruh aset aktif perusahaan pada periode yang dipilih, memotong nilai buku aset, dan memicu jurnal otomatis.</span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-slate-500">Pilih Bulan</label>
                  <select
                    value={depMonth}
                    onChange={(e) => setDepMonth(Number(e.target.value))}
                    className="w-full bg-white border border-slate-200 px-3 py-2.5 rounded-xl text-slate-800 focus:outline-none font-bold shadow-sm"
                  >
                    {months.map(m => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-500">Pilih Tahun</label>
                  <select
                    value={depYear}
                    onChange={(e) => setDepYear(Number(e.target.value))}
                    className="w-full bg-white border border-slate-200 px-3 py-2.5 rounded-xl text-slate-800 focus:outline-none font-bold shadow-sm"
                  >
                    {years.map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="border-t border-slate-150 pt-4 flex gap-2 justify-end -mx-5 -mb-5 p-5 bg-slate-50/50">
                <button
                  type="button"
                  onClick={() => setShowDepModal(false)}
                  className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold px-4 py-2 rounded-xl transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold px-5 py-2 rounded-xl shadow-sm transition active:scale-95 disabled:opacity-50"
                >
                  {saving ? "Memproses..." : "Jalankan Penyusutan"}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
