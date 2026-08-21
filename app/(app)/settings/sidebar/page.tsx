"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { 
  ArrowLeft, 
  Save, 
  Eye, 
  EyeOff, 
  ChevronUp, 
  ChevronDown, 
  CheckCircle,
  Sliders,
  Move,
  Lock
} from "lucide-react";
import { useBusiness } from "../../../../lib/context/BusinessContext";
import { useLanguage } from "../../../../lib/context/LanguageContext";
import { createWebBrowserClient } from "../../../../lib/supabase/client";

interface MenuItemDef {
  id: string;
  label: { id: string; en: string };
}

interface MenuSectionDef {
  id: string;
  title: { id: string; en: string };
  items: MenuItemDef[];
}

const DEFAULT_SECTIONS: MenuSectionDef[] = [
  {
    id: "main",
    title: { id: "Menu Utama", en: "Overview" },
    items: [
      { id: "dashboard", label: { id: "Dashboard", en: "Dashboard" } },
      { id: "pos", label: { id: "POS (Kasir)", en: "POS (Cashier)" } },
      { id: "report", label: { id: "Analisis Penjualan", en: "Sales Analytics" } }
    ]
  },
  {
    id: "sales",
    title: { id: "Penjualan & Piutang", en: "Sales & Receivables" },
    items: [
      { id: "invoice", label: { id: "Invoices", en: "Invoices" } },
      { id: "invoice_due", label: { id: "Nota Jatuh Tempo", en: "Due Alerts" } },
      { id: "sales", label: { id: "Sales Orders", en: "Sales Orders" } },
      { id: "delivery", label: { id: "Delivery Orders", en: "Delivery Orders" } },
      { id: "quotation", label: { id: "Quotations", en: "Quotations" } },
      { id: "customer", label: { id: "Customers", en: "Customers" } },
      { id: "payment", label: { id: "Pembayaran & Bukti Transfer", en: "Payments & Proofs" } }
    ]
  },
  {
    id: "purchase",
    title: { id: "Pembelian & Gudang", en: "Purchasing & Inventory" },
    items: [
      { id: "inventory", label: { id: "Inventaris & Stok", en: "Inventory & Stock" } },
      { id: "purchase", label: { id: "Purchase Orders", en: "Purchase Orders" } },
      { id: "vendor", label: { id: "Vendors", en: "Vendors" } },
      { id: "catalog", label: { id: "Katalog Jasa/Barang", en: "Catalog" } }
    ]
  },
  {
    id: "hr",
    title: { id: "SDM & HR", en: "HR & Payroll" },
    items: [
      { id: "employees", label: { id: "Daftar Karyawan", en: "Employees List" } },
      { id: "employee_leave", label: { id: "Pengajuan Cuti", en: "Leave Request" } },
      { id: "employee_reimbursement", label: { id: "Reimbursement", en: "Reimbursement" } },
      { id: "employee_attendance", label: { id: "Absensi & Kehadiran", en: "Attendance" } },
      { id: "payroll", label: { id: "Payroll & Gaji", en: "Payroll & Salaries" } }
    ]
  },
  {
    id: "finance",
    title: { id: "Akuntansi & Keuangan", en: "Finance & Accounts" },
    items: [
      { id: "accounts", label: { id: "Bagan Akun (COA)", en: "Chart of Accounts" } },
      { id: "expenses", label: { id: "Pencatatan Biaya", en: "Expenses" } },
      { id: "ledger", label: { id: "Buku Besar", en: "General Ledger" } },
      { id: "reports", label: { id: "Laporan Keuangan", en: "Financial Reports" } },
      { id: "tax", label: { id: "Ekspor e-Faktur Pajak", en: "Tax e-Faktur Export" } },
      { id: "assets", label: { id: "Manajemen Aset", en: "Asset Management" } }
    ]
  },
  {
    id: "system",
    title: { id: "Sistem & Pengaturan", en: "System" },
    items: [
      { id: "settings", label: { id: "Pengaturan Bisnis", en: "Business Settings" } },
      { id: "pricing", label: { id: "Paket Langganan", en: "Billing & Subscription" } }
    ]
  }
];

interface CustomItemState {
  id: string;
  label: { id: string; en: string };
  visible: boolean;
}

interface CustomSectionState {
  id: string;
  title: { id: string; en: string };
  visible: boolean;
  items: CustomItemState[];
}

export default function SidebarSettingsPage() {
  const { activeBusiness, userRole, reloadBusiness, loading } = useBusiness();
  const { locale } = useLanguage();
  const router = useRouter();
  const [sections, setSections] = useState<CustomSectionState[]>([]);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  // Initialize and merge customization data
  useEffect(() => {
    if (!loading && activeBusiness) {
      const dbCustom = activeBusiness.owner_menu_customization;
      
      const initialSections: CustomSectionState[] = [];

      // 1. If we have customized data in DB
      if (Array.isArray(dbCustom)) {
        dbCustom.forEach((dbSec: any) => {
          const originalSec = DEFAULT_SECTIONS.find(s => s.id === dbSec.id);
          if (originalSec) {
            const itemsState: CustomItemState[] = [];
            
            // Build items state from customized order
            if (Array.isArray(dbSec.items)) {
              dbSec.items.forEach((dbItem: any) => {
                const originalItem = originalSec.items.find(i => i.id === dbItem.id);
                if (originalItem) {
                  itemsState.push({
                    id: originalItem.id,
                    label: originalItem.label,
                    visible: dbItem.visible !== false
                  });
                }
              });
            }

            // Self-healing: Append any item defined in code that is missing in DB
            originalSec.items.forEach(origItem => {
              if (!itemsState.some(i => i.id === origItem.id)) {
                itemsState.push({
                  id: origItem.id,
                  label: origItem.label,
                  visible: true
                });
              }
            });

            initialSections.push({
              id: originalSec.id,
              title: originalSec.title,
              visible: dbSec.visible !== false,
              items: itemsState
            });
          }
        });

        // Self-healing: Append any section defined in code that is missing in DB
        DEFAULT_SECTIONS.forEach(origSec => {
          if (!initialSections.some(s => s.id === origSec.id)) {
            initialSections.push({
              id: origSec.id,
              title: origSec.title,
              visible: true,
              items: origSec.items.map(i => ({ id: i.id, label: i.label, visible: true }))
            });
          }
        });

        setSections(initialSections);
      } else {
        // 2. Default initial state (everything visible, original order)
        const defaults = DEFAULT_SECTIONS.map(sec => ({
          id: sec.id,
          title: sec.title,
          visible: true,
          items: sec.items.map(item => ({
            id: item.id,
            label: item.label,
            visible: true
          }))
        }));
        setSections(defaults);
      }
    }
  }, [activeBusiness, loading]);

  // Authorization Check
  if (loading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center gap-2">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs font-semibold text-slate-500">Memuat data...</p>
      </div>
    );
  }

  if (userRole !== "owner") {
    return (
      <div className="max-w-md mx-auto my-12 bg-white border border-slate-200 rounded-2xl p-6 text-center space-y-4 shadow-sm">
        <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto">
          <Lock className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-bold text-slate-900">Akses Ditolak</h3>
        <p className="text-xs text-slate-500 leading-normal">
          Halaman ini hanya dapat diakses oleh Pemilik Bisnis (Owner) untuk mengkustomisasi menu navigasi sidebar utama.
        </p>
        <button 
          onClick={() => router.push("/settings")}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition"
        >
          Kembali ke Pengaturan
        </button>
      </div>
    );
  }

  const handleToggleSection = (sectionIndex: number) => {
    setSections(prev => {
      const copy = [...prev];
      copy[sectionIndex] = {
        ...copy[sectionIndex],
        visible: !copy[sectionIndex].visible
      };
      return copy;
    });
  };

  const handleToggleItem = (sectionIndex: number, itemIndex: number) => {
    setSections(prev => {
      const copy = [...prev];
      const itemsCopy = [...copy[sectionIndex].items];
      itemsCopy[itemIndex] = {
        ...itemsCopy[itemIndex],
        visible: !itemsCopy[itemIndex].visible
      };
      copy[sectionIndex] = {
        ...copy[sectionIndex],
        items: itemsCopy
      };
      return copy;
    });
  };

  const handleMoveSection = (index: number, direction: "up" | "down") => {
    if (direction === "up" && index === 0) return;
    if (direction === "down" && index === sections.length - 1) return;

    const targetIndex = direction === "up" ? index - 1 : index + 1;
    setSections(prev => {
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[targetIndex];
      copy[targetIndex] = temp;
      return copy;
    });
  };

  const handleMoveItem = (sectionIndex: number, itemIndex: number, direction: "up" | "down") => {
    const section = sections[sectionIndex];
    if (direction === "up" && itemIndex === 0) return;
    if (direction === "down" && itemIndex === section.items.length - 1) return;

    const targetIndex = direction === "up" ? itemIndex - 1 : itemIndex + 1;
    setSections(prev => {
      const copy = [...prev];
      const itemsCopy = [...copy[sectionIndex].items];
      const temp = itemsCopy[itemIndex];
      itemsCopy[itemIndex] = itemsCopy[targetIndex];
      itemsCopy[targetIndex] = temp;
      
      copy[sectionIndex] = {
        ...copy[sectionIndex],
        items: itemsCopy
      };
      return copy;
    });
  };

  const handleSave = async () => {
    if (!activeBusiness) return;

    try {
      setSaving(true);
      setSuccess(false);

      // Clean customization format to save in DB
      const cleanCustom = sections.map(sec => ({
        id: sec.id,
        visible: sec.visible,
        items: sec.items.map(i => ({
          id: i.id,
          visible: i.visible
        }))
      }));

      const supabase = createWebBrowserClient();
      const { error } = await supabase
        .from("businesses")
        .update({
          owner_menu_customization: cleanCustom
        })
        .eq("id", activeBusiness.id);

      if (error) throw error;

      await reloadBusiness();
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error("Error saving menu customization:", err);
      alert("Gagal menyimpan kustomisasi menu sidebar.");
    } finally {
      setSaving(false);
    }
  };

  const handleResetDefaults = () => {
    if (confirm("Apakah Anda yakin ingin mengembalikan susunan dan visibilitas menu ke pengaturan default?")) {
      const defaults = DEFAULT_SECTIONS.map(sec => ({
        id: sec.id,
        title: sec.title,
        visible: true,
        items: sec.items.map(item => ({
          id: item.id,
          label: item.label,
          visible: true
        }))
      }));
      setSections(defaults);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-4 gap-4">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => router.push("/settings")}
            className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 transition"
            title="Kembali ke Pengaturan"
          >
            <ArrowLeft className="w-4 h-4 text-slate-600" />
          </button>
          <div>
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Sliders className="w-5 h-5 text-blue-600" /> Kustomisasi Sidebar Menu
            </h2>
            <p className="text-xs text-slate-500 mt-0.5 font-medium">
              Sesuaikan urutan bagian menu, sembunyikan modul yang tidak dipakai, dan atur sesuai kebutuhan Anda.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleResetDefaults}
            className="px-3.5 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold rounded-xl text-xs transition"
          >
            Reset Default
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition"
          >
            <Save className="w-4 h-4" /> {saving ? "Menyimpan..." : "Simpan Perubahan"}
          </button>
        </div>
      </div>

      {/* Success Alert */}
      {success && (
        <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 flex items-start gap-2 text-emerald-600 text-xs font-semibold shadow-sm animate-fade-in">
          <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>Pengaturan kustomisasi menu sidebar berhasil disimpan dan langsung diterapkan secara real-time!</span>
        </div>
      )}

      {/* Main List */}
      <div className="space-y-4">
        {sections.map((section, secIndex) => {
          const sectionTitle = locale === "en" ? section.title.en : section.title.id;

          return (
            <div 
              key={section.id} 
              className={`bg-white border rounded-2xl shadow-sm transition-all overflow-hidden ${
                section.visible ? "border-slate-200" : "border-dashed border-slate-200 opacity-60 bg-slate-50/20"
              }`}
            >
              {/* Section Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="flex flex-col gap-0.5">
                    <button
                      disabled={secIndex === 0}
                      onClick={() => handleMoveSection(secIndex, "up")}
                      className="p-0.5 hover:bg-slate-200 rounded text-slate-500 disabled:opacity-30 disabled:hover:bg-transparent"
                    >
                      <ChevronUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      disabled={secIndex === sections.length - 1}
                      onClick={() => handleMoveSection(secIndex, "down")}
                      className="p-0.5 hover:bg-slate-200 rounded text-slate-500 disabled:opacity-30 disabled:hover:bg-transparent"
                    >
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="flex items-center gap-1.5 font-bold text-sm text-slate-800">
                    <Move className="w-4 h-4 text-slate-400" />
                    <span>{sectionTitle}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggleSection(secIndex)}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-bold tracking-wide uppercase transition ${
                      section.visible 
                        ? "bg-blue-50 text-blue-600 hover:bg-blue-100" 
                        : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                    }`}
                  >
                    {section.visible ? (
                      <>
                        <Eye className="w-3.5 h-3.5" /> Tampil
                      </>
                    ) : (
                      <>
                        <EyeOff className="w-3.5 h-3.5" /> Sembunyi
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Nested Items */}
              {section.visible && (
                <div className="divide-y divide-slate-100 px-5 py-2">
                  {section.items.map((item, itemIndex) => {
                    const itemLabel = locale === "en" ? item.label.en : item.label.id;

                    return (
                      <div 
                        key={item.id} 
                        className={`flex items-center justify-between py-2.5 transition ${
                          item.visible ? "" : "opacity-50"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {/* Item move controls */}
                          <div className="flex gap-0.5 items-center">
                            <button
                              disabled={itemIndex === 0}
                              onClick={() => handleMoveItem(secIndex, itemIndex, "up")}
                              className="p-0.5 hover:bg-slate-100 rounded text-slate-400 disabled:opacity-20 disabled:hover:bg-transparent"
                            >
                              <ChevronUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              disabled={itemIndex === section.items.length - 1}
                              onClick={() => handleMoveItem(secIndex, itemIndex, "down")}
                              className="p-0.5 hover:bg-slate-100 rounded text-slate-400 disabled:opacity-20 disabled:hover:bg-transparent"
                            >
                              <ChevronDown className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          
                          <span className="text-xs font-semibold text-slate-700">{itemLabel}</span>
                        </div>

                        {/* Visibility checkbox */}
                        <label className="relative inline-flex items-center cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={item.visible}
                            onChange={() => handleToggleItem(secIndex, itemIndex)}
                            className="sr-only peer"
                          />
                          <div className="w-8 h-4 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
