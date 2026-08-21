"use client";

import React, { useEffect, useState } from "react";
import { 
  Settings as SettingsIcon, 
  Save, 
  Building2, 
  Sliders, 
  Palette, 
  CreditCard, 
  Info,
  CheckCircle,
  HelpCircle,
  Plus,
  X,
  Check,
  Trash2,
  Image as ImageIcon,
  Globe,
  Users,
  FileSpreadsheet,
  History,
  } from "lucide-react";
import Link from "next/link";
import { useBusiness } from "../../../lib/context/BusinessContext";
import { createWebBrowserClient } from "../../../lib/supabase/client";
import { useLanguage } from "../../../lib/context/LanguageContext";
import { uploadImageToR2 } from "../../../lib/utils/upload";

export default function SettingsPage() {
  const { activeBusiness, businesses, userRole, reloadBusiness, setActiveBusiness } = useBusiness();
  const { t, locale, setLocale } = useLanguage();
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingBankLogo, setUploadingBankLogo] = useState(false);

  // Add Business Modal States
  const [showAddModal, setShowAddModal] = useState(false);
  const [newBizName, setNewBizName] = useState("");
  const [newBizEmail, setNewBizEmail] = useState("");
  const [newBizPhone, setNewBizPhone] = useState("");
  const [newBizCurrency, setNewBizCurrency] = useState("IDR");
  const [newBizAddress, setNewBizAddress] = useState("");

  // Form Fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [website, setWebsite] = useState("");
  const [address, setAddress] = useState("");
  const [taxId, setTaxId] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [qrisUrl, setQrisUrl] = useState("");
  const [uploadingQris, setUploadingQris] = useState(false);
  const [defaultLanguage, setDefaultLanguage] = useState("id");
  
  // Invoice settings
  const [invoicePrefix, setInvoicePrefix] = useState("INV");
  const [invoiceFormat, setInvoiceFormat] = useState("INV/[YYYY]/[MM]/[NO]");
  const [defaultDueDays, setDefaultDueDays] = useState(14);
  const [defaultCurrency, setDefaultCurrency] = useState("IDR");
  
  // Design settings
  const [templateId, setTemplateId] = useState("modern");
  const [templateColor, setTemplateColor] = useState("#004de6");
  const [footerText, setFooterText] = useState("");

  // PPN settings
  const [poTaxEnabled, setPoTaxEnabled] = useState(true);
  const [taxRatePercent, setTaxRatePercent] = useState(11.00);

  // Multi-Warehouse settings
  const [isMultiWarehouseEnabled, setIsMultiWarehouseEnabled] = useState(false);

  // Payroll Tax settings
  const [payrollTaxEnabled, setPayrollTaxEnabled] = useState(true);
  const [payrollTaxType, setPayrollTaxType] = useState("ter");
  const [payrollTaxRate, setPayrollTaxRate] = useState(0.00);

  // Bank Accounts state
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [loadingBanks, setLoadingBanks] = useState(false);
  const [showAddBank, setShowAddBank] = useState(false);
  const [newBankName, setNewBankName] = useState("");
  const [newAccountName, setNewAccountName] = useState("");
  const [newAccountNumber, setNewAccountNumber] = useState("");
  const [newBankLogo, setNewBankLogo] = useState("");
  const [savingBank, setSavingBank] = useState(false);

  const fetchBankAccounts = async () => {
    if (!activeBusiness) return;
    try {
      setLoadingBanks(true);
      const supabase = createWebBrowserClient();
      const { data, error } = await supabase
        .from("bank_accounts")
        .select("*")
        .eq("business_id", activeBusiness.id)
        .order("created_at", { ascending: true });
      
      if (error) throw error;
      setBankAccounts(data || []);
    } catch (err) {
      console.error("Error loading bank accounts:", err);
    } finally {
      setLoadingBanks(false);
    }
  };

  useEffect(() => {
    if (activeBusiness) {
      setName(activeBusiness.name || "");
      setEmail(activeBusiness.email || "");
      setPhone(activeBusiness.phone || "");
      setWebsite(activeBusiness.website || "");
      setAddress(activeBusiness.address || "");
      setTaxId(activeBusiness.tax_id || "");
      setLogoUrl(activeBusiness.logo_url || "");
      setQrisUrl(activeBusiness.qris_url || "");
      setDefaultLanguage(activeBusiness.default_language || "id");
      
      setInvoicePrefix(activeBusiness.invoice_prefix || "INV");
      setInvoiceFormat(activeBusiness.invoice_number_format || "INV/[YYYY]/[MM]/[NO]");
      setDefaultDueDays(activeBusiness.default_due_days || 14);
      setDefaultCurrency(activeBusiness.default_currency || "IDR");
      
      setTemplateId(activeBusiness.template_id || "modern");
      setTemplateColor(activeBusiness.template_color || "#004de6");
      setFooterText(activeBusiness.footer_text || "");
      setPoTaxEnabled(activeBusiness.po_tax_enabled !== false);
      setTaxRatePercent(activeBusiness.tax_rate_percent ?? 11.00);
      setPayrollTaxEnabled(activeBusiness.payroll_tax_enabled !== false);
      setPayrollTaxType(activeBusiness.payroll_tax_type || "ter");
      setPayrollTaxRate(Number(activeBusiness.payroll_tax_rate || 0));
      setIsMultiWarehouseEnabled(activeBusiness.is_multi_warehouse_enabled || false);

      fetchBankAccounts();
    }
  }, [activeBusiness]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBusiness) return;

    try {
      setSaving(true);
      setSuccess(false);
      const supabase = createWebBrowserClient();

      const { error } = await supabase
        .from("businesses")
        .update({
          name,
          email: email || null,
          phone: phone || null,
          website: website || null,
          address: address || null,
          tax_id: taxId || null,
          logo_url: logoUrl || null,
          qris_url: qrisUrl || null,
          default_language: defaultLanguage,
          invoice_prefix: invoicePrefix,
          invoice_number_format: invoiceFormat,
          default_due_days: Number(defaultDueDays),
          default_currency: defaultCurrency,
          template_id: templateId,
          template_color: templateColor,
          footer_text: footerText || null,
          po_tax_enabled: poTaxEnabled,
          tax_rate_percent: Number(taxRatePercent),
          payroll_tax_enabled: payrollTaxEnabled,
          payroll_tax_type: payrollTaxType,
          payroll_tax_rate: Number(payrollTaxRate),
          is_multi_warehouse_enabled: isMultiWarehouseEnabled
        })
        .eq("id", activeBusiness.id);

      if (error) throw error;
      
      await reloadBusiness();
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error("Error updating business details:", err);
      alert(locale === "en" ? "Failed to save business settings." : "Gagal memperbarui pengaturan bisnis.");
    } finally {
      setSaving(false);
    }
  };

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploadingLogo(true);
      const url = await uploadImageToR2(file, "logos");
      setLogoUrl(url);
    } catch (err: any) {
      alert(err.message || "Gagal mengunggah logo.");
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleQrisChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploadingQris(true);
      const url = await uploadImageToR2(file, "qris");
      setQrisUrl(url);
    } catch (err: any) {
      alert(err.message || "Gagal mengunggah QRIS.");
    } finally {
      setUploadingQris(false);
    }
  };

  // Bank accounts management
  const handleAddBankAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBusiness || !newBankName || !newAccountName || !newAccountNumber) return;

    try {
      setSavingBank(true);
      const supabase = createWebBrowserClient();
      const { error } = await supabase
        .from("bank_accounts")
        .insert({
          business_id: activeBusiness.id,
          bank_name: newBankName,
          account_name: newAccountName,
          account_number: newAccountNumber,
          logo_url: newBankLogo || null
        });

      if (error) throw error;

      setNewBankName("");
      setNewAccountName("");
      setNewAccountNumber("");
      setNewBankLogo("");
      setShowAddBank(false);
      await fetchBankAccounts();
    } catch (err) {
      console.error("Error adding bank account:", err);
      alert("Gagal menambahkan rekening bank.");
    } finally {
      setSavingBank(false);
    }
  };

  const handleDeleteBankAccount = async (id: string) => {
    if (!confirm(locale === "en" ? "Are you sure you want to delete this bank account?" : "Apakah Anda yakin ingin menghapus rekening bank ini?")) return;
    try {
      const supabase = createWebBrowserClient();
      const { error } = await supabase
        .from("bank_accounts")
        .delete()
        .eq("id", id);

      if (error) throw error;
      await fetchBankAccounts();
    } catch (err) {
      console.error("Error deleting bank account:", err);
      alert("Gagal menghapus rekening bank.");
    }
  };

  const handleBankLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploadingBankLogo(true);
      const url = await uploadImageToR2(file, "banks");
      setNewBankLogo(url);
    } catch (err: any) {
      alert(err.message || "Gagal mengunggah logo bank.");
    } finally {
      setUploadingBankLogo(false);
    }
  };

  const handleSetDefault = async (businessId: string) => {
    try {
      const supabase = createWebBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from("businesses")
        .update({ is_default: false })
        .eq("user_id", user.id);

      const { error } = await supabase
        .from("businesses")
        .update({ is_default: true })
        .eq("id", businessId);

      if (error) throw error;
      await reloadBusiness();
    } catch (err) {
      console.error("Error setting default business:", err);
      alert("Gagal mengubah bisnis default.");
    }
  };

  const handleAddBusiness = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBizName.trim()) return;

    try {
      setSaving(true);
      const supabase = createWebBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("businesses")
        .insert({
          user_id: user.id,
          name: newBizName,
          email: newBizEmail || null,
          phone: newBizPhone || null,
          address: newBizAddress || null,
          default_currency: newBizCurrency || "IDR",
          invoice_prefix: "INV",
          invoice_number_format: "INV/[YYYY]/[MM]/[NO]",
          invoice_counter: 1,
          default_due_days: 14,
          template_id: "modern",
          template_color: "#004de6",
        })
        .select()
        .single();

      if (error) throw error;

      setShowAddModal(false);
      setNewBizName("");
      setNewBizEmail("");
      setNewBizPhone("");
      setNewBizAddress("");
      await reloadBusiness();
      if (data) {
        setActiveBusiness(data);
      }
    } catch (err: any) {
      console.error("Error adding business:", err);
      alert(err.message || "Gagal menambahkan profil bisnis.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            {t("settings")}
          </h2>
          <p className="text-sm text-slate-500 mt-0.5 font-medium">
            {locale === "en" ? "Manage company details, defaults, and payment accounts." : "Ubah info perusahaan, format default, dan rekening pembayaran."}
          </p>
        </div>
        
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 px-4 rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition"
        >
          <Save className="w-4 h-4" /> {saving ? t("saving") : t("save")}
        </button>
      </div>

      {/* Success Alert */}
      {success && (
        <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 flex items-start gap-2 text-emerald-600 text-xs font-semibold shadow-sm animate-fade-in">
          <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            {locale === "en" ? "Business settings updated successfully!" : "Pengaturan profil bisnis berhasil diperbarui secara real-time!"}
          </span>
        </div>
      )}

      {/* Profil Bisnis Switcher & Default Manager */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <Building2 className="w-4.5 h-4.5 text-blue-600" /> {locale === "en" ? "Your Business Profiles" : "Daftar Profil Bisnis Anda"}
          </h3>
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-1.5 px-3 rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition"
          >
            <Plus className="w-3.5 h-3.5" /> {locale === "en" ? "Add Profile" : "Tambah Profil"}
          </button>
        </div>

        <div className="grid grid-cols-1 gap-3">
          {businesses.map((biz) => (
            <div 
              key={biz.id} 
              className={`flex justify-between items-center p-4 border rounded-xl transition ${
                activeBusiness?.id === biz.id 
                  ? "border-blue-200 bg-blue-50/20" 
                  : "border-slate-150 bg-slate-50/30 hover:bg-slate-50"
              }`}
            >
              <div className="flex items-center gap-3">
                {biz.logo_url ? (
                  <img src={biz.logo_url} alt={biz.name} className="w-10 h-10 rounded-xl object-contain bg-white border border-slate-200" />
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold text-sm font-sans">
                    {biz.name ? biz.name.charAt(0).toUpperCase() : "B"}
                  </div>
                )}
                <div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <p className="text-sm font-bold text-slate-800">{biz.name}</p>
                    {biz.is_default && (
                      <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-md text-[9px] font-extrabold tracking-wide uppercase">
                        Default
                      </span>
                    )}
                    {activeBusiness?.id === biz.id && (
                      <span className="px-1.5 py-0.5 bg-blue-50 text-blue-600 border border-blue-100 rounded-md text-[9px] font-extrabold tracking-wide uppercase">
                        {locale === "en" ? "Active" : "Aktif"}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{biz.address || (locale === "en" ? "Address not set" : "Alamat belum diset")}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {biz.is_default ? null : (
                  <button
                    type="button"
                    onClick={() => handleSetDefault(biz.id)}
                    className="px-3 py-1.5 hover:bg-white border border-slate-200 text-slate-600 hover:text-slate-800 rounded-xl text-xs font-bold transition shadow-sm bg-white/50"
                  >
                    {locale === "en" ? "Make Default" : "Jadikan Default"}
                  </button>
                )}
                {activeBusiness?.id !== biz.id && (
                  <button
                    type="button"
                    onClick={() => setActiveBusiness(biz)}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
                  >
                    {locale === "en" ? "Select" : "Pilih"}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Team / User Management Settings Card */}
      {(userRole === "owner" || userRole === "admin") && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Users className="w-4.5 h-4.5 text-blue-600" /> {locale === "en" ? "Team & Permissions" : "Tim & Hak Akses Divisi"}
            </h3>
            <Link
              href="/settings/users"
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition"
            >
              <Users className="w-3.5 h-3.5" /> {locale === "en" ? "Manage Team" : "Kelola Anggota Tim"}
            </Link>
          </div>
          <p className="text-xs text-slate-500 leading-normal">
            {locale === "en" 
              ? "Invite division members, assign pre-defined roles (Sales, Purchasing, Warehouse, Finance) or customize menu access dynamically." 
              : "Undang anggota divisi kerja Anda, tetapkan peran (Sales, Purchasing, Gudang, Finance) atau atur hak akses menu secara kustom."}
          </p>
        </div>
      )}

      {/* Master Shift Settings Card */}
      {(userRole === "owner" || userRole === "admin") && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Sliders className="w-4.5 h-4.5 text-blue-600" /> Master Shift Karyawan
            </h3>
            <Link
              href="/settings/shifts"
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition"
            >
              <Sliders className="w-3.5 h-3.5" /> Kelola Shift Kerja
            </Link>
          </div>
          <p className="text-xs text-slate-500 leading-normal">
            Atur master shift kerja, jam masuk, dan jam pulang karyawan untuk pengelolaan absensi dan lembur yang lebih akurat.
          </p>
        </div>
      )}

      {/* Audit Logs Settings Card */}
      {(userRole === "owner" || userRole === "admin") && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <History className="w-4.5 h-4.5 text-blue-600" /> {locale === "en" ? "Audit Trail Logs" : "Log Audit Aktivitas"}
            </h3>
            <Link
              href="/settings/audit-logs"
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition"
            >
              <History className="w-3.5 h-3.5" /> {locale === "en" ? "View Logs" : "Lihat Log Aktivitas"}
            </Link>
          </div>
          <p className="text-xs text-slate-500 leading-normal">
            {locale === "en"
              ? "Monitor and audit critical record creation, modifications, or deletions made by team members."
              : "Pantau dan audit riwayat pembuatan, perubahan, atau penghapusan data penting yang dilakukan oleh anggota tim."}
          </p>
        </div>
      )}

      {/* Kustomisasi Sidebar Menu Card (Owner Only) */}
      {userRole === "owner" && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Sliders className="w-4.5 h-4.5 text-blue-600" /> {locale === "en" ? "Sidebar Menu Customization" : "Kustomisasi Sidebar Menu"}
            </h3>
            <Link
              href="/settings/sidebar"
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition"
            >
              <Sliders className="w-3.5 h-3.5" /> {locale === "en" ? "Customize Menu" : "Kustomisasi Menu"}
            </Link>
          </div>
          <p className="text-xs text-slate-500 leading-normal">
            {locale === "en"
              ? "Arrange the order of menu sections, hide modules you don't use, and personalize your sidebar layout."
              : "Atur urutan bagian menu, sembunyikan modul yang tidak Anda gunakan, dan sesuaikan tata letak sidebar Anda."}
          </p>
        </div>
      )}

      {/* CSV Bulk Import Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex justify-between items-center border-b border-slate-100 pb-3 text-xs font-semibold">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <FileSpreadsheet className="w-4.5 h-4.5 text-blue-600" /> {locale === "en" ? "Bulk Import CSV" : "Import Bulk Data CSV"}
          </h3>
          <Link
            href="/settings/import"
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-xl flex items-center gap-1.5 shadow-sm transition"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" /> {locale === "en" ? "Import Data" : "Import Data"}
          </Link>
        </div>
        <p className="text-xs text-slate-500 leading-normal">
          {locale === "en" 
            ? "Import Customers, Vendors, and Catalog Items instantly from Excel or Google Sheets CSV files." 
            : "Import data Pelanggan, Vendor, dan Katalog Produk secara instan langsung dari file CSV Excel atau Google Sheets."}
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        
        {/* Card 1: Profil Bisnis */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-blue-600 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-2">
            <Building2 className="w-4.5 h-4.5" /> {locale === "en" ? "Primary Business Profile" : "Profil Bisnis Utama"}
          </h3>

          <div className="flex flex-col sm:flex-row gap-6 items-start">
            {/* Logo upload field */}
            <div className="space-y-2 shrink-0 w-full sm:w-36 flex flex-col items-center">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block text-center">
                {locale === "en" ? "Business Logo" : "Logo Bisnis"}
              </label>
              <div className="relative w-28 h-28 border-2 border-dashed border-slate-200 rounded-2xl flex items-center justify-center bg-slate-50 overflow-hidden">
                {logoUrl ? (
                  <>
                    <img src={logoUrl} alt="Logo Preview" className="w-full h-full object-contain" />
                    <button
                      type="button"
                      onClick={() => setLogoUrl("")}
                      className="absolute top-1 right-1 p-1 bg-white/80 hover:bg-white text-slate-500 hover:text-rose-600 rounded-lg shadow transition"
                      disabled={uploadingLogo}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </>
                ) : uploadingLogo ? (
                  <div className="text-center p-3 text-slate-400">
                    <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-1"></div>
                    <span className="text-[9px] block">Mengunggah...</span>
                  </div>
                ) : (
                  <div className="text-center p-3 text-slate-400">
                    <ImageIcon className="w-8 h-8 mx-auto stroke-1" />
                    <span className="text-[9px] block mt-1">Upload Logo</span>
                  </div>
                )}
              </div>
              <input 
                type="file" 
                accept="image/*"
                onChange={handleLogoChange}
                className="hidden" 
                id="logo-file-input" 
                disabled={uploadingLogo}
              />
              <label 
                htmlFor={uploadingLogo ? undefined : "logo-file-input"}
                className={`px-3 py-1 text-slate-600 font-bold rounded-lg text-[10px] shadow-sm transition ${
                  uploadingLogo ? "bg-slate-50 cursor-not-allowed opacity-50" : "bg-slate-100 hover:bg-slate-200 cursor-pointer"
                }`}
              >
                {uploadingLogo ? (locale === "en" ? "Uploading..." : "Mengunggah...") : (locale === "en" ? "Choose File" : "Pilih File")}
              </label>
            </div>

            {/* QRIS upload field */}
            <div className="space-y-2 shrink-0 w-full sm:w-36 flex flex-col items-center">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block text-center">
                {locale === "en" ? "QRIS QR Code" : "QR Code QRIS"}
              </label>
              <div className="relative w-28 h-28 border-2 border-dashed border-slate-200 rounded-2xl flex items-center justify-center bg-slate-50 overflow-hidden">
                {qrisUrl ? (
                  <>
                    <img src={qrisUrl} alt="QRIS Preview" className="w-full h-full object-contain" />
                    <button
                      type="button"
                      onClick={() => setQrisUrl("")}
                      className="absolute top-1 right-1 p-1 bg-white/80 hover:bg-white text-slate-500 hover:text-rose-600 rounded-lg shadow transition"
                      disabled={uploadingQris}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </>
                ) : uploadingQris ? (
                  <div className="text-center p-3 text-slate-400">
                    <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-1"></div>
                    <span className="text-[9px] block">Mengunggah...</span>
                  </div>
                ) : (
                  <div className="text-center p-3 text-slate-400">
                    <ImageIcon className="w-8 h-8 mx-auto stroke-1" />
                    <span className="text-[9px] block mt-1">Upload QRIS</span>
                  </div>
                )}
              </div>
              <input 
                type="file" 
                accept="image/*"
                onChange={handleQrisChange}
                className="hidden" 
                id="qris-file-input" 
                disabled={uploadingQris}
              />
              <label 
                htmlFor={uploadingQris ? undefined : "qris-file-input"}
                className={`px-3 py-1 text-slate-600 font-bold rounded-lg text-[10px] shadow-sm transition ${
                  uploadingQris ? "bg-slate-50 cursor-not-allowed opacity-50" : "bg-slate-100 hover:bg-slate-200 cursor-pointer"
                }`}
              >
                {uploadingQris ? (locale === "en" ? "Uploading..." : "Mengunggah...") : (locale === "en" ? "Choose File" : "Pilih File")}
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1 w-full">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">{t("customerName")} *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full border border-slate-200 px-3 py-2 rounded-xl text-xs focus:outline-none"
                />
              </div>
              
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">{t("email")}</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full border border-slate-200 px-3 py-2 rounded-xl text-xs focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">{t("phone")}</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full border border-slate-200 px-3 py-2 rounded-xl text-xs focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  {locale === "en" ? "Company Website" : "Website Perusahaan"}
                </label>
                <input
                  type="url"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  className="w-full border border-slate-200 px-3 py-2 rounded-xl text-xs focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">{t("taxId")}</label>
                <input
                  type="text"
                  value={taxId}
                  onChange={(e) => setTaxId(e.target.value)}
                  className="w-full border border-slate-200 px-3 py-2 rounded-xl text-xs focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  {locale === "en" ? "Default Invoice Language" : "Bahasa Default Invoice"}
                </label>
                <select
                  value={defaultLanguage}
                  onChange={(e) => setDefaultLanguage(e.target.value)}
                  className="w-full bg-white border border-slate-200 px-3 py-2 rounded-xl text-xs focus:outline-none"
                >
                  <option value="id">{locale === "en" ? "Indonesian" : "Bahasa Indonesia"}</option>
                  <option value="en">English</option>
                </select>
              </div>

              <div className="space-y-1 sm:col-span-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">{t("address")}</label>
                <textarea
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  rows={2}
                  className="w-full border border-slate-200 px-3 py-2 rounded-xl text-xs focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Pengaturan Invoicing */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-blue-600 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-2">
            <Sliders className="w-4.5 h-4.5" /> {locale === "en" ? "Invoice Format & Defaults" : "Format Faktur & Defaults"}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">{locale === "en" ? "Invoice Code Prefix" : "Prefix Kode Invoice"}</label>
              <input
                type="text"
                required
                value={invoicePrefix}
                onChange={(e) => setInvoicePrefix(e.target.value)}
                className="w-full border border-slate-200 px-3 py-2 rounded-xl text-xs focus:outline-none font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">{locale === "en" ? "Invoice Number Format" : "Format Nomor Invoice"}</label>
              <input
                type="text"
                required
                value={invoiceFormat}
                onChange={(e) => setInvoiceFormat(e.target.value)}
                className="w-full border border-slate-200 px-3 py-2 rounded-xl text-xs focus:outline-none font-mono"
              />
              <span className="text-[9px] text-slate-400 block mt-1">
                {locale === "en" ? "Variables: [YYYY] (Year), [MM] (Month), [NO] (Sequence Number)" : "Variabel: [YYYY] (Tahun), [MM] (Bulan), [NO] (Nomor Urut)"}
              </span>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">{locale === "en" ? "Default Due Terms (Days)" : "Batas Jatuh Tempo Default (Hari)"}</label>
              <input
                type="number"
                required
                value={defaultDueDays}
                onChange={(e) => setDefaultDueDays(Number(e.target.value))}
                className="w-full border border-slate-200 px-3 py-2 rounded-xl text-xs focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">{locale === "en" ? "Default Currency" : "Mata Uang Default"}</label>
              <select
                value={defaultCurrency}
                onChange={(e) => setDefaultCurrency(e.target.value)}
                className="w-full bg-white border border-slate-200 px-3 py-2 rounded-xl text-xs focus:outline-none"
              >
                <option value="IDR">IDR - Rupiah Indonesia</option>
                <option value="USD">USD - US Dollar</option>
                <option value="SGD">SGD - Singapore Dollar</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                {locale === "en" ? "Default PPN Rate (%)" : "Tarif PPN Default (%)"}
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={taxRatePercent}
                onChange={(e) => setTaxRatePercent(Number(e.target.value))}
                className="w-full border border-slate-200 px-3 py-2 rounded-xl text-xs focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2 pt-3">
              <input
                type="checkbox"
                id="poTaxEnabled"
                checked={poTaxEnabled}
                onChange={(e) => setPoTaxEnabled(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-slate-200 rounded focus:ring-blue-500"
              />
              <label htmlFor="poTaxEnabled" className="text-xs font-bold text-slate-600 select-none">
                {locale === "en" ? "Enable PPN for Purchase Orders by default" : "Aktifkan PPN untuk Purchase Order secara default"}
              </label>
            </div>

            <div className="flex items-center gap-2 pt-3">
              <input
                type="checkbox"
                id="isMultiWarehouseEnabled"
                checked={isMultiWarehouseEnabled}
                onChange={(e) => setIsMultiWarehouseEnabled(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-slate-200 rounded focus:ring-blue-500"
              />
              <label htmlFor="isMultiWarehouseEnabled" className="text-xs font-bold text-slate-600 select-none">
                {locale === "en" ? "Enable Multi-Warehouse management" : "Aktifkan manajemen Multi-Gudang (Gudang Tambahan)"}
              </label>
            </div>

            {/* Payroll Tax Settings */}
            <div className="border-t border-slate-100 pt-4 mt-4 space-y-4">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                {locale === "en" ? "Payroll Tax Settings (PPh 21)" : "Pengaturan Pajak Penggajian (PPh 21)"}
              </h4>
              
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="payrollTaxEnabled"
                  checked={payrollTaxEnabled}
                  onChange={(e) => setPayrollTaxEnabled(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-slate-200 rounded focus:ring-blue-500"
                />
                <label htmlFor="payrollTaxEnabled" className="text-xs font-bold text-slate-600 select-none">
                  {locale === "en" ? "Enable PPh 21 tax deductions for payroll run" : "Aktifkan pemotongan Pajak PPh 21 saat penggajian"}
                </label>
              </div>

              {payrollTaxEnabled && (
                <div className="grid grid-cols-2 gap-3 pl-6">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      {locale === "en" ? "PPh 21 Calculation Method" : "Metode Kalkulasi PPh 21"}
                    </label>
                    <select
                      value={payrollTaxType}
                      onChange={(e) => setPayrollTaxType(e.target.value)}
                      className="w-full bg-white border border-slate-200 px-3 py-2 rounded-xl text-xs font-semibold focus:outline-none focus:border-blue-500"
                    >
                      <option value="ter">TER PP 58/2023 (Rekomendasi)</option>
                      <option value="flat">Tarif Flat (%)</option>
                      <option value="none">Tanpa Potongan Pajak</option>
                    </select>
                  </div>

                  {payrollTaxType === "flat" && (
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        {locale === "en" ? "Flat Tax Rate (%)" : "Tarif Pajak Flat (%)"}
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        required
                        value={payrollTaxRate}
                        onChange={(e) => setPayrollTaxRate(Number(e.target.value))}
                        className="w-full border border-slate-200 px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Card 3: Rekening Bank & Desain Default */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-blue-600 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-2">
            <Palette className="w-4.5 h-4.5" /> {locale === "en" ? "Design Template Defaults" : "Pengaturan Desain Faktur"}
          </h3>

          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                {locale === "en" ? "Default Bank Account Instructions" : "Instruksi Rekening Bank Default"}
              </label>
              <textarea
                value={footerText}
                onChange={(e) => setFooterText(e.target.value)}
                placeholder="BCA - 123456789 a.n. Nama Bisnis Anda"
                rows={2}
                className="w-full border border-slate-200 px-3 py-2 rounded-xl text-xs focus:outline-none"
              />
              <span className="text-[9px] text-slate-400 block mt-1">
                {locale === "en" ? "These instructions will automatically pre-fill when creating a new invoice." : "Instruksi ini akan otomatis terisi saat membuat invoice baru."}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  {locale === "en" ? "Template Accent Color" : "Aksen Warna Template"}
                </label>
                <div className="flex gap-2.5 items-center py-2">
                  {["#004de6", "#059669", "#7c3aed", "#e11d48", "#1e293b"].map((col) => (
                    <button
                      key={col}
                      type="button"
                      onClick={() => setTemplateColor(col)}
                      style={{ backgroundColor: col }}
                      className={`w-6 h-6 rounded-full border transition transform active:scale-90 ${
                        templateColor === col ? "ring-2 ring-offset-2 ring-slate-400 border-white" : "border-transparent"
                      }`}
                    />
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  {locale === "en" ? "Default Template" : "Template Default"}
                </label>
                <select
                  value={templateId}
                  onChange={(e) => setTemplateId(e.target.value)}
                  className="w-full bg-white border border-slate-200 px-3 py-2 rounded-xl text-xs focus:outline-none"
                >
                  <option value="modern">Modern Layout</option>
                  <option value="classic">Classic Layout</option>
                  <option value="minimal">Minimalist Layout</option>
                  <option value="premium_elegant">Premium Elegant Sidebar (Premium)</option>
                  <option value="premium_bold">Premium Bold Startup (Premium)</option>
                  <option value="premium_compact">Premium Compact 2-Column (Premium)</option>
                  <option value="premium_creative">Premium Creative Split (Premium)</option>
                  <option value="premium_luxury">Premium Luxury Gold (Premium)</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Card 4: CRUD Bank Accounts */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 pb-2">
            <h3 className="text-sm font-bold text-blue-600 uppercase tracking-wider flex items-center gap-1.5">
              <CreditCard className="w-4.5 h-4.5" /> {t("bankAccountTitle")}
            </h3>
            <button
              type="button"
              onClick={() => setShowAddBank(!showAddBank)}
              className="bg-blue-50 hover:bg-blue-100 text-blue-600 font-bold py-1 px-3.5 rounded-lg text-xs flex items-center gap-1 transition"
            >
              {showAddBank ? t("cancel") : (
                <>
                  <Plus className="w-3.5 h-3.5" /> {t("addBankAccount")}
                </>
              )}
            </button>
          </div>

          {/* Add Bank Form */}
          {showAddBank && (
            <div className="p-4 border border-blue-100 bg-blue-50/10 rounded-xl space-y-3">
              <h4 className="text-xs font-bold text-slate-700">{t("addBankAccount")}</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">{t("bankName")} *</label>
                  <input
                    type="text"
                    required
                    placeholder="BCA, Mandiri, BRI"
                    value={newBankName}
                    onChange={(e) => setNewBankName(e.target.value)}
                    className="w-full border border-slate-200 px-3 py-1.5 rounded-lg text-xs focus:outline-none bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">{t("accountHolder")} *</label>
                  <input
                    type="text"
                    required
                    placeholder={locale === "en" ? "Account Owner" : "Nama Pemilik"}
                    value={newAccountName}
                    onChange={(e) => setNewAccountName(e.target.value)}
                    className="w-full border border-slate-200 px-3 py-1.5 rounded-lg text-xs focus:outline-none bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">{t("accountNumber")} *</label>
                  <input
                    type="text"
                    required
                    placeholder={locale === "en" ? "Account Number" : "Nomor Rekening"}
                    value={newAccountNumber}
                    onChange={(e) => setNewAccountNumber(e.target.value)}
                    className="w-full border border-slate-200 px-3 py-1.5 rounded-lg text-xs focus:outline-none bg-white"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">{t("bankLogo")}</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleBankLogoChange}
                      className="hidden"
                      id="bank-logo-input"
                      disabled={uploadingBankLogo}
                    />
                    <label
                      htmlFor={uploadingBankLogo ? undefined : "bank-logo-input"}
                      className={`px-3 py-1.5 border rounded-lg text-[10px] font-bold shadow-sm transition bg-white ${
                        uploadingBankLogo ? "border-slate-100 text-slate-400 cursor-not-allowed opacity-50" : "border-slate-200 hover:bg-slate-50 text-slate-600 cursor-pointer"
                      }`}
                    >
                      {uploadingBankLogo ? "Mengunggah..." : (newBankLogo ? "Ganti Logo" : "Upload Logo")}
                    </label>
                    {newBankLogo && !uploadingBankLogo && (
                      <div className="relative">
                        <img src={newBankLogo} alt="Bank Logo" className="w-8 h-8 object-contain bg-white border border-slate-200 rounded-md" />
                        <button
                          type="button"
                          onClick={() => setNewBankLogo("")}
                          className="absolute -top-1 -right-1 p-0.5 bg-rose-500 hover:bg-rose-600 text-white rounded-full shadow transition"
                        >
                          <X className="w-2 h-2" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex-1 text-right pt-4">
                  <button
                    type="button"
                    onClick={handleAddBankAccount}
                    disabled={savingBank}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs transition shadow-sm"
                  >
                    {savingBank ? t("saving") : t("save")}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* List of Bank Accounts */}
          {loadingBanks ? (
            <div className="text-center py-4 text-xs text-slate-400">Loading accounts...</div>
          ) : bankAccounts.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {bankAccounts.map((bank) => (
                <div key={bank.id} className="p-4 border border-slate-150 rounded-xl bg-slate-50/20 flex justify-between items-center hover:border-slate-200 transition">
                  <div className="flex items-center gap-3">
                    {bank.logo_url ? (
                      <img src={bank.logo_url} alt={bank.bank_name} className="w-10 h-10 object-contain bg-white border border-slate-200 rounded-lg" />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs">
                        {bank.bank_name.charAt(0)}
                      </div>
                    )}
                    <div>
                      <p className="text-xs font-bold text-slate-800">{bank.bank_name} - {bank.account_number}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">a.n. {bank.account_name}</p>
                    </div>
                  </div>
                  
                  <button
                    type="button"
                    onClick={() => handleDeleteBankAccount(bank.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400 py-2 italic">{t("noBankAccounts")}</p>
          )}
        </div>

      </form>

      {/* Modal Tambah Profil Bisnis */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl relative">
            {/* Close Button */}
            <button
              onClick={() => setShowAddModal(false)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition"
            >
              <X className="w-4.5 h-4.5" />
            </button>

            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-1.5">
                <Building2 className="w-5 h-5 text-blue-600" /> {locale === "en" ? "Add New Business Profile" : "Tambah Profil Bisnis Baru"}
              </h3>
              <p className="text-xs text-slate-500 mt-1">{locale === "en" ? "Create another business profile to manage separate invoices." : "Buat profil bisnis tambahan untuk mengelola invoice & penawaran terpisah."}</p>
            </div>

            <form onSubmit={handleAddBusiness} className="space-y-3 pt-2">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">{locale === "en" ? "Business Name" : "Nama Bisnis"} *</label>
                <input
                  type="text"
                  required
                  placeholder="Laundry Clean"
                  value={newBizName}
                  onChange={(e) => setNewBizName(e.target.value)}
                  className="w-full border border-slate-200 px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  {locale === "en" ? "Business Email (Optional)" : "Email Bisnis (Opsional)"}
                </label>
                <input
                  type="email"
                  placeholder="laundry@bisnis.com"
                  value={newBizEmail}
                  onChange={(e) => setNewBizEmail(e.target.value)}
                  className="w-full border border-slate-200 px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  {locale === "en" ? "Phone / WA (Optional)" : "Telepon / WA (Opsional)"}
                </label>
                <input
                  type="tel"
                  placeholder="62812xxxx"
                  value={newBizPhone}
                  onChange={(e) => setNewBizPhone(e.target.value)}
                  className="w-full border border-slate-200 px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  {locale === "en" ? "Default Currency" : "Mata Uang Default"}
                </label>
                <select
                  value={newBizCurrency}
                  onChange={(e) => setNewBizCurrency(e.target.value)}
                  className="w-full bg-white border border-slate-200 px-3 py-2 rounded-xl text-xs focus:outline-none"
                >
                  <option value="IDR">IDR - Rupiah Indonesia</option>
                  <option value="USD">USD - US Dollar</option>
                  <option value="SGD">SGD - Singapore Dollar</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  {locale === "en" ? "Business Address (Optional)" : "Alamat Bisnis (Opsional)"}
                </label>
                <textarea
                  placeholder="Jl. Raya laundry"
                  rows={2}
                  value={newBizAddress}
                  onChange={(e) => setNewBizAddress(e.target.value)}
                  className="w-full border border-slate-200 px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 font-bold rounded-xl text-xs transition"
                >
                  {t("cancel")}
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition shadow-sm"
                >
                  {saving ? t("saving") : (locale === "en" ? "Add Profile" : "Tambah Profil")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
