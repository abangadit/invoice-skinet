"use client";

import React, { useState } from "react";
import { 
  ArrowLeft, 
  Upload, 
  Download, 
  CheckCircle2, 
  AlertTriangle, 
  Loader2, 
  FileSpreadsheet, 
  UserPlus, 
  ShoppingBag, 
  Truck,
  Check
} from "lucide-react";
import Link from "next/link";
import { useBusiness } from "../../../../lib/context/BusinessContext";
import { createWebBrowserClient } from "../../../../lib/supabase/client";

type ImportType = "customers" | "vendors" | "items";

export default function ImportPage() {
  const { activeBusiness } = useBusiness();
  const [importType, setImportType] = useState<ImportType>("customers");
  const [file, setFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);
  const [result, setResult] = useState<{ success: number; failed: number; errors: string[] } | null>(null);

  const downloadTemplate = (type: ImportType) => {
    let headers = "";
    let sampleData = "";
    
    if (type === "customers") {
      headers = "Nama,Email,Telepon,Alamat,NPWP";
      sampleData = "\nBudi Utomo,budi@example.com,08123456789,Jl. Merdeka No. 10 Jakarta,12.345.678.9-012.000\nSiti Rahma,siti@example.com,08987654321,Jl. Sudirman No. 5 Bandung,";
    } else if (type === "vendors") {
      headers = "Nama,Email,Telepon,Alamat,NPWP";
      sampleData = "\nPT Supplier Abadi,info@supplierabadi.com,021-5551234,Kawasan Industri Jababeka,01.234.567.8-091.000\nCV Logistik Cepat,sales@logistikcepat.com,08111222333,,";
    } else {
      headers = "Nama,Deskripsi,Satuan,Harga Jual,Stok Awal,Harga Beli Rata-Rata";
      sampleData = "\nKertas A4 80gr,Kertas HVS A4 Merk Sinar Dunia,rim,55000,10,45000\nTinta Printer Black,Tinta Dye Black 100ml,botol,35000,5,25000\nJasa Konsultasi IT,Jasa konsultasi sistem informasi,jam,150000,0,0";
    }
    
    const blob = new Blob([headers + sampleData], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `template_${type}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const parseCSV = (text: string): string[][] => {
    const lines: string[][] = [];
    let row: string[] = [""];
    let insideQuote = false;
    
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const nextChar = text[i + 1];
      
      if (insideQuote) {
        if (char === '"') {
          if (nextChar === '"') {
            row[row.length - 1] += '"';
            i++; 
          } else {
            insideQuote = false;
          }
        } else {
          row[row.length - 1] += char;
        }
      } else {
        if (char === '"') {
          insideQuote = true;
        } else if (char === ',') {
          row.push("");
        } else if (char === '\r' || char === '\n') {
          if (char === '\r' && nextChar === '\n') {
            i++;
          }
          lines.push(row);
          row = [""];
        } else {
          row[row.length - 1] += char;
        }
      }
    }
    if (row.length > 1 || row[0] !== "") {
      lines.push(row);
    }
    return lines;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setResult(null);
    }
  };

  const handleImport = async () => {
    if (!activeBusiness || !file) return;

    try {
      setParsing(true);
      setResult(null);
      const reader = new FileReader();

      reader.onload = async (e) => {
        const text = e.target?.result as string;
        const parsedRows = parseCSV(text);
        
        if (parsedRows.length <= 1) {
          alert("CSV tidak memiliki baris data (hanya header atau kosong).");
          setParsing(false);
          return;
        }

        const headers = parsedRows[0].map(h => h.trim().toLowerCase());
        const dataRows = parsedRows.slice(1);

        setParsing(false);
        setImporting(true);
        setProgress({ current: 0, total: dataRows.length });

        const supabase = createWebBrowserClient();
        let success = 0;
        let failed = 0;
        const errorsList: string[] = [];

        for (let i = 0; i < dataRows.length; i++) {
          const row = dataRows[i];
          // Skip empty rows
          if (row.length === 0 || (row.length === 1 && !row[0])) {
            continue;
          }

          try {
            if (importType === "customers") {
              const nameIdx = headers.indexOf("nama");
              const emailIdx = headers.indexOf("email");
              const phoneIdx = headers.indexOf("telepon");
              const addressIdx = headers.indexOf("alamat");
              const npwpIdx = headers.indexOf("npwp");

              const name = row[nameIdx]?.trim();
              if (!name) throw new Error("Kolom nama kosong");

              const { error } = await supabase
                .from("customers")
                .insert({
                  business_id: activeBusiness.id,
                  name,
                  email: row[emailIdx]?.trim() || null,
                  phone: row[phoneIdx]?.trim() || null,
                  address: row[addressIdx]?.trim() || null,
                  tax_id: row[npwpIdx]?.trim() || null
                });

              if (error) throw error;
              success++;
            } else if (importType === "vendors") {
              const nameIdx = headers.indexOf("nama");
              const emailIdx = headers.indexOf("email");
              const phoneIdx = headers.indexOf("telepon");
              const addressIdx = headers.indexOf("alamat");
              const npwpIdx = headers.indexOf("npwp");

              const name = row[nameIdx]?.trim();
              if (!name) throw new Error("Kolom nama kosong");

              const { error } = await supabase
                .from("vendors")
                .insert({
                  business_id: activeBusiness.id,
                  name,
                  email: row[emailIdx]?.trim() || null,
                  phone: row[phoneIdx]?.trim() || null,
                  address: row[addressIdx]?.trim() || null,
                  tax_id: row[npwpIdx]?.trim() || null
                });

              if (error) throw error;
              success++;
            } else if (importType === "items") {
              const nameIdx = headers.indexOf("nama");
              const descIdx = headers.indexOf("deskripsi");
              const unitIdx = headers.indexOf("satuan");
              const priceIdx = headers.indexOf("harga jual");
              const stockIdx = headers.indexOf("stok awal");
              const cogsIdx = headers.indexOf("harga beli rata-rata");

              const name = row[nameIdx]?.trim();
              if (!name) throw new Error("Kolom nama kosong");

              const unit = row[unitIdx]?.trim() || "pcs";
              const unitPrice = Number(row[priceIdx] || 0);
              const initialStock = Number(row[stockIdx] || 0);
              const cogsPrice = Number(row[cogsIdx] || 0);
              const isInventory = initialStock > 0 || cogsPrice > 0;

              // Insert item first
              const { data: itemData, error: itemError } = await supabase
                .from("items")
                .insert({
                  business_id: activeBusiness.id,
                  name,
                  description: row[descIdx]?.trim() || null,
                  unit,
                  unit_price: unitPrice,
                  stock_quantity: 0.000, // initialize as 0 and adjust via stock movement below
                  cogs_unit_price: cogsPrice,
                  is_inventory: isInventory
                })
                .select("id")
                .single();

              if (itemError) throw itemError;

              // If has initial stock, create a stock movement transaction
              if (itemData && isInventory && initialStock > 0) {
                const { error: moveError } = await supabase
                  .from("stock_movements")
                  .insert({
                    business_id: activeBusiness.id,
                    item_id: itemData.id,
                    type: "adjustment_add",
                    quantity: initialStock,
                    unit_cost: cogsPrice,
                    notes: "Saldo awal persediaan terdaftar via import bulk CSV"
                  });

                if (moveError) throw moveError;
              }
              success++;
            }
          } catch (err: any) {
            failed++;
            errorsList.push(`Baris ${i + 2}: ${err.message || "Gagal memasukkan data"}`);
          }
          setProgress({ current: i + 1, total: dataRows.length });
        }

        setResult({ success, failed, errors: errorsList });
        setImporting(false);
        setFile(null);
      };

      reader.readAsText(file);
    } catch (err) {
      console.error("Error importing CSV file:", err);
      alert("Gagal membaca file CSV.");
      setParsing(false);
      setImporting(false);
    }
  };

  return (
    <div className="space-y-6 text-xs font-semibold">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div className="space-y-1">
          <Link href="/settings" className="inline-flex items-center gap-1 text-slate-500 hover:text-blue-600 transition font-bold mb-1">
            <ArrowLeft className="w-4 h-4" /> Kembali ke Pengaturan
          </Link>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <FileSpreadsheet className="w-7 h-7 text-emerald-600" /> Bulk Import Data via CSV
          </h2>
          <p className="text-sm text-slate-500 font-medium mt-0.5">Unggah data Pelanggan, Vendor, atau Katalog Barang Anda langsung dari file excel spreadsheet (CSV).</p>
        </div>
      </div>

      {/* Select Entity Type Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button
          onClick={() => {
            setImportType("customers");
            setResult(null);
          }}
          disabled={importing}
          className={`border p-5 rounded-2xl flex items-center gap-4 transition text-left cursor-pointer card-shadow ${
            importType === "customers" 
              ? "bg-blue-50 border-blue-200 ring-2 ring-blue-50" 
              : "bg-white border-slate-200 hover:bg-slate-50"
          }`}
        >
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${
            importType === "customers" ? "bg-blue-600 text-white border-blue-500" : "bg-slate-50 text-slate-500 border-slate-200"
          }`}>
            <UserPlus className="w-6 h-6" />
          </div>
          <div>
            <span className="font-extrabold text-sm block text-slate-900">Pelanggan</span>
            <span className="text-[10px] text-slate-500 font-medium mt-0.5">Import kontak data pelanggan</span>
          </div>
        </button>

        <button
          onClick={() => {
            setImportType("vendors");
            setResult(null);
          }}
          disabled={importing}
          className={`border p-5 rounded-2xl flex items-center gap-4 transition text-left cursor-pointer card-shadow ${
            importType === "vendors" 
              ? "bg-blue-50 border-blue-200 ring-2 ring-blue-50" 
              : "bg-white border-slate-200 hover:bg-slate-50"
          }`}
        >
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${
            importType === "vendors" ? "bg-blue-600 text-white border-blue-500" : "bg-slate-50 text-slate-500 border-slate-200"
          }`}>
            <Truck className="w-6 h-6" />
          </div>
          <div>
            <span className="font-extrabold text-sm block text-slate-900">Vendor</span>
            <span className="text-[10px] text-slate-500 font-medium mt-0.5">Import kontak pemasok / vendor</span>
          </div>
        </button>

        <button
          onClick={() => {
            setImportType("items");
            setResult(null);
          }}
          disabled={importing}
          className={`border p-5 rounded-2xl flex items-center gap-4 transition text-left cursor-pointer card-shadow ${
            importType === "items" 
              ? "bg-blue-50 border-blue-200 ring-2 ring-blue-50" 
              : "bg-white border-slate-200 hover:bg-slate-50"
          }`}
        >
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${
            importType === "items" ? "bg-blue-600 text-white border-blue-500" : "bg-slate-50 text-slate-500 border-slate-200"
          }`}>
            <ShoppingBag className="w-6 h-6" />
          </div>
          <div>
            <span className="font-extrabold text-sm block text-slate-900">Katalog Barang</span>
            <span className="text-[10px] text-slate-500 font-medium mt-0.5">Import data produk & stok awal</span>
          </div>
        </button>
      </div>

      {/* Template Download & Instructions Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm card-shadow grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
            <Download className="w-4 h-4 text-slate-400" /> Unduh Format Template CSV
          </h3>
          <p className="text-slate-500 font-medium leading-relaxed">
            Gunakan format file template kami untuk memastikan seluruh struktur kolom terpetakan dengan benar ke database sistem.
          </p>
          <button
            onClick={() => downloadTemplate(importType)}
            className="inline-flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white font-extrabold py-2 px-4 rounded-xl transition"
          >
            <Download className="w-4 h-4" /> Download Template {importType === "customers" ? "Pelanggan" : importType === "vendors" ? "Vendor" : "Barang"}
          </button>
        </div>

        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-2">
          <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Langkah-langkah Import:</h4>
          <ol className="list-decimal list-inside space-y-1.5 text-slate-655 font-medium leading-normal">
            <li>Download format template di samping.</li>
            <li>Buka file menggunakan Excel, Google Sheets, atau text editor.</li>
            <li>Isi baris data sesuai kolom yang tersedia, jangan ubah baris pertama (header).</li>
            <li>Simpan (Export) sebagai file dengan ekstensi **.csv (comma-separated)**.</li>
            <li>Pilih file dan unggah di panel di bawah ini.</li>
          </ol>
        </div>
      </div>

      {/* Upload Zone */}
      <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center shadow-sm card-shadow">
        {!importing && !parsing ? (
          <div className="max-w-md mx-auto space-y-4">
            <div className="w-16 h-16 bg-slate-50 text-slate-500 rounded-full flex items-center justify-center border border-slate-200 mx-auto">
              <Upload className="w-8 h-8 text-slate-450" />
            </div>
            <div className="space-y-1">
              <span className="font-extrabold text-sm block text-slate-800">
                Pilih File CSV Data {importType === "customers" ? "Pelanggan" : importType === "vendors" ? "Vendor" : "Barang"}
              </span>
              <span className="text-slate-500 font-medium block">
                Unggah file csv dengan ukuran maksimal 10MB
              </span>
            </div>
            <div className="flex justify-center">
              <label className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold py-2.5 px-5 rounded-xl shadow-sm transition cursor-pointer active:scale-95">
                Pilih File CSV
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            </div>
            {file && (
              <div className="bg-slate-50 py-2.5 px-4 rounded-xl border border-slate-200 inline-flex items-center gap-2 max-w-full">
                <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-bold text-slate-700 truncate max-w-xs">{file.name}</span>
                <span className="text-[10px] text-slate-400">({(file.size / 1024).toFixed(1)} KB)</span>
              </div>
            )}
            {file && (
              <div className="pt-2">
                <button
                  onClick={handleImport}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-2.5 px-8 rounded-xl shadow-sm transition active:scale-95"
                >
                  Mulai Import Data
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="py-8 space-y-4 max-w-xs mx-auto">
            <Loader2 className="w-10 h-10 text-emerald-600 animate-spin mx-auto" />
            <div className="space-y-1">
              <span className="font-extrabold text-slate-800">
                {parsing ? "Membaca file..." : "Memproses data..."}
              </span>
              {progress && (
                <span className="text-slate-500 font-bold block text-[10px]">
                  Mengunggah: {progress.current} dari {progress.total} baris ({Math.round((progress.current / progress.total) * 100)}%)
                </span>
              )}
            </div>
            {progress && (
              <div className="w-full bg-slate-100 rounded-full h-2">
                <div 
                  className="bg-emerald-600 h-2 rounded-full transition-all duration-150" 
                  style={{ width: `${(progress.current / progress.total) * 100}%` }}
                ></div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Result Display */}
      {result && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm card-shadow space-y-4">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
            Hasil Import Data
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-emerald-50 border border-emerald-100 text-emerald-700 p-4 rounded-xl flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-600 text-white rounded-lg flex items-center justify-center shrink-0">
                <Check className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider block">Sukses Dimasukkan</span>
                <span className="text-lg font-extrabold">{result.success} Baris Data</span>
              </div>
            </div>

            <div className={`p-4 rounded-xl flex items-center gap-3 border ${
              result.failed > 0 ? "bg-rose-50 border-rose-100 text-rose-700" : "bg-slate-50 border-slate-100 text-slate-500"
            }`}>
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                result.failed > 0 ? "bg-rose-600 text-white" : "bg-slate-350 text-white"
              }`}>
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[9px] font-bold uppercase tracking-wider block">Gagal Dimasukkan</span>
                <span className="text-lg font-extrabold">{result.failed} Baris Data</span>
              </div>
            </div>
          </div>

          {result.errors.length > 0 && (
            <div className="space-y-2 border-t border-slate-100 pt-4">
              <span className="font-bold text-rose-600 block">Daftar Error Baris:</span>
              <div className="bg-rose-50/50 border border-rose-100 rounded-xl p-3 max-h-40 overflow-y-auto space-y-1 text-[10px] font-mono leading-normal text-rose-700">
                {result.errors.map((err, idx) => (
                  <div key={idx}>&bull; {err}</div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
