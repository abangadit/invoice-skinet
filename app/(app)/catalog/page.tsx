"use client";

import React, { useEffect, useState, useRef } from "react";
import { 
  Briefcase, 
  Plus, 
  Search, 
  Trash2, 
  Edit2, 
  X,
  FileSpreadsheet,
  Package
} from "lucide-react";
import { useBusiness } from "../../../lib/context/BusinessContext";
import { createWebBrowserClient } from "../../../lib/supabase/client";
import Pagination from "../../../components/Pagination";

interface CatalogItem {
  id: string;
  business_id: string;
  name: string;
  description: string | null;
  unit: string;
  unit_price: number;
  sku?: string | null;
  is_inventory?: boolean;
  stock_quantity?: number;
  cogs_unit_price?: number;
  created_at: string;
}

export default function CatalogPage() {
  const { activeBusiness, subscription } = useBusiness();
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modals state
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<"create" | "edit">("create");
  const [editingItem, setEditingItem] = useState<CatalogItem | null>(null);
  
  // Form fields
  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [description, setDescription] = useState("");
  const [unit, setUnit] = useState("pcs");
  const [unitPrice, setUnitPrice] = useState("");
  const [isInventory, setIsInventory] = useState(false);
  const [stockQuantity, setStockQuantity] = useState(0);
  const [cogsUnitPrice, setCogsUnitPrice] = useState<string | number>("");
  const [submitting, setSubmitting] = useState(false);

  // Search
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;

  // Mass Import Modal states
  const [showImportModal, setShowImportModal] = useState(false);
  const [importMode, setImportMode] = useState<"file" | "text">("file");
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importText, setImportText] = useState("");
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [selectedTargetWarehouseId, setSelectedTargetWarehouseId] = useState<string>("");
  const [importing, setImporting] = useState(false);
  const [importStatusMsg, setImportStatusMsg] = useState("");
  const [importProgress, setImportProgress] = useState(0);
  const isImportCancelled = useRef(false);

  // Mass Select & Clear Data states
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showClearModal, setShowClearModal] = useState(false);
  const [clearConfirmText, setClearConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    setCurrentPage(1);
    setSelectedIds([]);
  }, [search]);

  const fetchWarehouses = async () => {
    if (!activeBusiness) return;
    try {
      const supabase = createWebBrowserClient();
      const { data } = await supabase
        .from("warehouses")
        .select("id, name")
        .eq("business_id", activeBusiness.id)
        .order("name", { ascending: true });
      setWarehouses(data || []);
      if (data && data.length > 0) {
        setSelectedTargetWarehouseId(data[0].id);
      }
    } catch (err) {
      console.error("Error fetching warehouses:", err);
    }
  };

  const fetchItems = async () => {
    if (!activeBusiness) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const supabase = createWebBrowserClient();

      const { data, error } = await supabase
        .from("items")
        .select("*")
        .eq("business_id", activeBusiness.id)
        .order("name", { ascending: true });

      if (error) throw error;
      setItems(data || []);
    } catch (err) {
      console.error("Error fetching items:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
    fetchWarehouses();
  }, [activeBusiness]);

  const handleDownloadTemplate = () => {
    let csv = "\uFEFF";
    csv += "SKU,Nama Produk,Satuan,Harga Modal (HPP),Harga Jual,Keterangan,Stok Awal\n";
    csv += "SKU-001,Kopi Susu Aren,Cup,8000,18000,Best Seller,50\n";
    csv += "SKU-002,Teh Manis,Gelas,2000,5000,Segar,100\n";
    
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "Template_Import_Produk.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const openCreateModal = () => {
    setModalType("create");
    setEditingItem(null);
    setName("");
    setSku("");
    setDescription("");
    setUnit("pcs");
    setUnitPrice("");
    setIsInventory(true);
    setStockQuantity(0);
    setCogsUnitPrice("");
    setShowModal(true);
  };

  const openEditModal = (item: CatalogItem) => {
    setModalType("edit");
    setEditingItem(item);
    setName(item.name);
    setSku(item.sku || "");
    setDescription(item.description || "");
    setUnit(item.unit || "pcs");
    setUnitPrice(String(item.unit_price));
    setIsInventory(item.is_inventory || false);
    setStockQuantity(Number(item.stock_quantity || 0));
    setCogsUnitPrice(item.cogs_unit_price ? String(item.cogs_unit_price) : "");
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBusiness) return;
    try {
      setSubmitting(true);
      const supabase = createWebBrowserClient();

      if (modalType === "create") {
        // Enforce catalog item subscription limit checks
        if (subscription) {
          const { checkUsageLimit } = await import("../../../lib/utils/subscription");
          const limitCheck = await checkUsageLimit(
            supabase,
            activeBusiness.id,
            "catalog",
            subscription.tier,
            subscription.isTrialExpired
          );
          if (!limitCheck.allowed) {
            alert(`Batas jumlah barang katalog terlampaui! Paket Anda membatasi maksimum ${limitCheck.max} barang. Silakan tingkatkan paket Anda untuk melanjutkan.`);
            setSubmitting(false);
            return;
          }
        }

        const { error } = await supabase.from("items").insert({
          business_id: activeBusiness.id,
          name,
          description: description || null,
          unit,
          unit_price: Number(unitPrice),
          cogs_unit_price: Number(cogsUnitPrice || 0),
          is_inventory: isInventory,
          sku: sku.trim() || null
        });
        if (error) throw error;
      } else if (modalType === "edit" && editingItem) {
        const { error } = await supabase
          .from("items")
          .update({
            name,
            description: description || null,
            unit,
            unit_price: Number(unitPrice),
            cogs_unit_price: Number(cogsUnitPrice || 0),
            is_inventory: isInventory,
            sku: sku.trim() || null
          })
          .eq("id", editingItem.id);
        if (error) throw error;
      }

      setShowModal(false);
      fetchItems();
    } catch (err) {
      console.error("Error saving item:", err);
      alert("Gagal menyimpan katalog item.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus item ini dari katalog?")) return;
    try {
      const supabase = createWebBrowserClient();
      const { error } = await supabase.rpc("delete_items_batch", {
        p_business_id: activeBusiness?.id,
        p_item_ids: [id]
      });
      if (error) {
        // Fallback to direct delete if RPC is missing
        const { error: err2 } = await supabase.from("items").delete().eq("id", id);
        if (err2) throw err2;
      }
      setSelectedIds((prev) => prev.filter((i) => i !== id));
      fetchItems();
    } catch (err) {
      console.error("Error deleting item:", err);
      alert("Gagal menghapus item dari katalog.");
    }
  };

  const handleSelectAll = (currentPageItems: CatalogItem[]) => {
    const pageIds = currentPageItems.map((item) => item.id);
    const allSelected = pageIds.every((id) => selectedIds.includes(id));

    if (allSelected) {
      setSelectedIds((prev) => prev.filter((id) => !pageIds.includes(id)));
    } else {
      setSelectedIds((prev) => Array.from(new Set([...prev, ...pageIds])));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0 || !activeBusiness) return;
    if (!confirm(`Apakah Anda yakin ingin menghapus ${selectedIds.length} produk yang dipilih?`)) return;
    try {
      setDeleting(true);
      const supabase = createWebBrowserClient();
      const { error } = await supabase.rpc("delete_items_batch", {
        p_business_id: activeBusiness.id,
        p_item_ids: selectedIds
      });

      if (error) {
        // Fallback
        const { error: err2 } = await supabase.from("items").delete().in("id", selectedIds);
        if (err2) throw err2;
      }

      setSelectedIds([]);
      fetchItems();
      alert(`Berhasil menghapus ${selectedIds.length} produk.`);
    } catch (err) {
      console.error("Error bulk deleting items:", err);
      alert("Gagal menghapus produk masal.");
    } finally {
      setDeleting(false);
    }
  };

  const handleClearAllProducts = async () => {
    if (!activeBusiness) return;
    if (clearConfirmText.trim().toUpperCase() !== "HAPUS") {
      alert("Kata konfirmasi tidak cocok. Ketik HAPUS untuk melanjutkan.");
      return;
    }

    try {
      setDeleting(true);
      const supabase = createWebBrowserClient();
      const { error } = await supabase.rpc("clear_business_items", {
        p_business_id: activeBusiness.id
      });

      if (error) {
        // Fallback
        const { error: err2 } = await supabase.from("items").delete().eq("business_id", activeBusiness.id);
        if (err2) throw err2;
      }

      setShowClearModal(false);
      setClearConfirmText("");
      setSelectedIds([]);
      fetchItems();
      alert("Seluruh data produk katalog berhasil dibersihkan.");
    } catch (err) {
      console.error("Error clearing all products:", err);
      alert("Gagal membersihkan data produk.");
    } finally {
      setDeleting(false);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: activeBusiness?.default_currency || "IDR",
      maximumFractionDigits: 0
    }).format(val);
  };

  const handleMassImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBusiness) return;

    let contentToProcess = "";

    if (importMode === "file") {
      if (!importFile) {
        setImportStatusMsg("Harap pilih file Excel / CSV terlebih dahulu!");
        return;
      }
      contentToProcess = await importFile.text();
    } else {
      if (!importText.trim()) {
        setImportStatusMsg("Harap isi atau tempelkan data teks CSV!");
        return;
      }
      contentToProcess = importText;
    }

    try {
      setImporting(true);
      setImportStatusMsg("");
      setImportProgress(0);
      isImportCancelled.current = false;
      const supabase = createWebBrowserClient();

      const lines = contentToProcess.trim().split("\n");
      const validRows = [];

      for (const line of lines) {
        if (!line.trim()) continue;
        
        // Basic CSV parsing that handles commas inside double quotes
        const cols = line.includes("\t") 
          ? line.split("\t") 
          : line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(s => s.replace(/^"|"$/g, ''));
          
        if (cols.length < 2) continue;

        const pSku = cols[0]?.trim() || null;
        const pName = cols[1]?.trim();
        if (!pName || pName.toLowerCase() === "nama" || pName.toLowerCase() === "nama produk" || pName.toLowerCase() === "sku") continue;

        const pUnit = cols[2]?.trim() || "pcs";
        const pCostPrice = Number(cols[3]?.trim() || 0);
        const pUnitPrice = Number(cols[4]?.trim() || 0);
        const pDesc = cols[5]?.trim() || null;
        const pStock = Number(cols[6]?.trim() || 0);

        validRows.push({
          business_id: activeBusiness.id,
          name: pName,
          sku: pSku,
          unit: pUnit,
          unit_price: pUnitPrice,
          cogs_unit_price: pCostPrice,
          description: pDesc,
          is_inventory: pStock > 0 || pCostPrice > 0,
          stock_quantity: 0,
          originalStock: pStock
        });
      }

      if (validRows.length === 0) {
        setImportStatusMsg("Tidak ada data valid yang ditemukan.");
        setImporting(false);
        return;
      }

      let addedCount = 0;
      const CHUNK_SIZE = 50;
      const total = validRows.length;

      for (let i = 0; i < total; i += CHUNK_SIZE) {
        if (isImportCancelled.current) {
          setImportStatusMsg(`Import dibatalkan. ${addedCount} produk berhasil dimasukkan.`);
          fetchItems();
          setImporting(false);
          return;
        }

        const chunk = validRows.slice(i, i + CHUNK_SIZE);
        const itemsToInsert = chunk.map(({ originalStock, ...rest }) => rest);

        const { data: insertedItems, error: itemError } = await supabase
          .from("items")
          .insert(itemsToInsert)
          .select();

        if (itemError) {
          console.error("Error inserting batch item row:", itemError);
          setImportStatusMsg(`Gagal memproses sebagian data: ${itemError.message}`);
          break;
        }

        if (insertedItems && insertedItems.length > 0) {
          addedCount += insertedItems.length;

          // Prepare stock_movements
          const movements = [];
          for (let j = 0; j < insertedItems.length; j++) {
            const dbItem = insertedItems[j];
            // matching back to chunk via name & sku
            const originalRow = chunk.find(r => r.name === dbItem.name && (r.sku || null) === (dbItem.sku || null));
            
            if (originalRow && originalRow.originalStock > 0) {
              movements.push({
                business_id: activeBusiness.id,
                item_id: dbItem.id,
                type: "adjustment_add",
                quantity: originalRow.originalStock,
                unit_cost: originalRow.cogs_unit_price,
                warehouse_id: selectedTargetWarehouseId || null,
                notes: "Saldo awal persediaan terdaftar via import masal CSV"
              });
            }
          }

          if (movements.length > 0) {
            const { error: moveError } = await supabase.from("stock_movements").insert(movements);
            if (moveError) {
              console.warn("stock_movements batch insert failed:", moveError);
            }
          }
        }

        setImportProgress(Math.round(((i + chunk.length) / total) * 100));
      }

      setImportStatusMsg(`Selesai! Berhasil mengimpor ${addedCount} produk masal.`);
      fetchItems();
      setTimeout(() => {
        setShowImportModal(false);
        setImportFile(null);
        setImportText("");
        setImportStatusMsg("");
        setImportProgress(0);
      }, 2000);

    } catch (err: any) {
      console.error("Error during mass import:", err);
      setImportStatusMsg(err.message || "Terjadi kesalahan saat memproses import masal.");
    } finally {
      if (!isImportCancelled.current) {
        setImporting(false);
      }
    }
  };

  const filteredItems = items.filter((item) => {
    return (
      item.name.toLowerCase().includes(search.toLowerCase()) || 
      (item.description && item.description.toLowerCase().includes(search.toLowerCase())) ||
      (item.sku && item.sku.toLowerCase().includes(search.toLowerCase()))
    );
  });

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            Katalog Item
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">Kelola daftar produk, jasa, atau material beserta tarif default-nya.</p>
        </div>
        <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto flex-wrap">
          <button
            onClick={() => setShowClearModal(true)}
            className="bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold py-2.5 px-3 rounded-xl text-sm flex items-center justify-center gap-1.5 border border-rose-200 transition"
            title="Bersihkan seluruh data produk katalog"
          >
            <Trash2 className="w-4 h-4" /> Bersihkan Data Produk
          </button>
          <button
            onClick={() => setShowImportModal(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 px-4 rounded-xl text-sm flex items-center justify-center gap-1.5 shadow-sm transition"
          >
            <FileSpreadsheet className="w-4 h-4" /> Upload / Import Masal
          </button>
          <button
            onClick={openCreateModal}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 px-4 rounded-xl text-sm flex items-center justify-center gap-1.5 shadow-sm transition"
          >
            <Plus className="w-4 h-4" /> Tambah Item
          </button>
        </div>
      </div>

      {/* Search & Bulk Action Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama item, deskripsi, atau unit..."
            className="w-full bg-white border border-slate-200 pl-10 pr-4 py-2.5 rounded-xl text-sm placeholder-slate-400 focus:outline-none focus:border-blue-500 transition shadow-sm"
          />
        </div>

        {selectedIds.length > 0 && (
          <div className="bg-rose-50 border border-rose-200 px-4 py-2 rounded-xl flex items-center justify-between gap-3 animate-fadeIn">
            <span className="text-xs font-bold text-rose-800">
              {selectedIds.length} produk dipilih
            </span>
            <button
              onClick={handleBulkDelete}
              disabled={deleting}
              className="bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 transition shadow-sm"
            >
              <Trash2 className="w-3.5 h-3.5" /> Hapus Terpilih
            </button>
          </div>
        )}
      </div>

      {/* Select All Row Bar */}
      {filteredItems.length > 0 && (
        <div className="bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-xl flex items-center justify-between">
          <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={
                filteredItems
                  .slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
                  .every((item) => selectedIds.includes(item.id))
              }
              onChange={() =>
                handleSelectAll(
                  filteredItems.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
                )
              }
              className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            Pilih Semua di Halaman Ini ({filteredItems.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE).length} produk)
          </label>
          <span className="text-[11px] font-semibold text-slate-500">
            Total {filteredItems.length} Produk
          </span>
        </div>
      )}

      {/* Main List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs text-slate-500 font-semibold mt-2">Memuat katalog...</p>
        </div>
      ) : filteredItems.length > 0 ? (
        <div className="space-y-3">
          {filteredItems.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE).map((item) => (
            <div 
              key={item.id} 
              className={`bg-white border p-5 rounded-2xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 card-shadow-hover transition ${
                selectedIds.includes(item.id) ? "border-blue-400 bg-blue-50/20" : "border-slate-200"
              }`}
            >
              <div className="flex items-start gap-3 flex-1">
                <input
                  type="checkbox"
                  checked={selectedIds.includes(item.id)}
                  onChange={() => toggleSelect(item.id)}
                  className="mt-1 w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 shrink-0">
                  <Package className="w-5 h-5 text-blue-600" />
                </div>
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="font-bold text-slate-900 text-sm">{item.name}</h4>
                    <span className="text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200 px-2 py-0.5 rounded-md uppercase">
                      {item.unit}
                    </span>
                    {item.sku && (
                      <span className="text-[9px] font-mono font-bold bg-blue-50 text-blue-600 border border-blue-100 px-2 py-0.5 rounded-md">
                        SKU: {item.sku}
                      </span>
                    )}
                  </div>
                  {item.description && (
                    <p className="text-xs text-slate-500 leading-relaxed max-w-xl">{item.description}</p>
                  )}
                  {item.is_inventory && (
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-[10px] font-bold bg-blue-50 text-blue-600 border border-blue-100 px-2 py-0.5 rounded-md flex items-center gap-1">
                        Stok: {Number(item.stock_quantity || 0).toLocaleString("id-ID")} {item.unit}
                      </span>
                      <span className="text-[10px] font-semibold text-slate-500 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-md">
                        HPP: {formatCurrency(Number(item.cogs_unit_price || 0))}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t sm:border-t-0 border-slate-100 pt-3 sm:pt-0 gap-3">
                <div className="sm:text-right">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Harga Default</span>
                  <div className="flex items-baseline justify-start sm:justify-end gap-1">
                    <span className="text-base font-extrabold text-slate-900">{formatCurrency(item.unit_price)}</span>
                    <span className="text-[10px] text-slate-400">/ {item.unit}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button 
                    onClick={() => openEditModal(item)}
                    className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                    title="Ubah"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => handleDelete(item.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                    title="Hapus"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
          <Pagination
            currentPage={currentPage}
            totalItems={filteredItems.length}
            pageSize={PAGE_SIZE}
            onPageChange={setCurrentPage}
          />
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-400 shadow-sm">
          <Briefcase className="w-12 h-12 mx-auto text-slate-200 mb-3" />
          <p className="text-sm font-semibold">Tidak ada katalog item ditemukan</p>
          <button 
            onClick={openCreateModal}
            className="text-xs font-bold text-blue-600 hover:underline mt-1 inline-block"
          >
            Tambah Item Baru
          </button>
        </div>
      )}

      {/* CRUD MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full overflow-hidden shadow-2xl">
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {modalType === "create" ? "Tambah Item Baru" : "Ubah Data Item"}
                </h3>
              </div>
              <button 
                onClick={() => setShowModal(false)}
                className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Nama Item / Produk / Jasa *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nama Item (misal: Jasa Desain Logo)"
                  className="w-full border border-slate-200 px-3 py-2 rounded-xl text-sm placeholder-slate-400 focus:outline-none focus:border-blue-500 transition"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">SKU (Stock Keeping Unit)</label>
                <input
                  type="text"
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  placeholder="misal: SKU-10024"
                  className="w-full border border-slate-200 px-3 py-2 rounded-xl text-sm placeholder-slate-400 focus:outline-none focus:border-blue-500 transition"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Satuan (Unit) *</label>
                  <input
                    type="text"
                    required
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    placeholder="misal: pcs"
                    className="w-full border border-slate-200 px-3 py-2 rounded-xl text-sm placeholder-slate-400 focus:outline-none focus:border-blue-500 transition"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Harga Jual *</label>
                  <input
                    type="number"
                    required
                    value={unitPrice}
                    onChange={(e) => setUnitPrice(e.target.value)}
                    placeholder="misal: 150000"
                    className="w-full border border-slate-200 px-3 py-2 rounded-xl text-sm placeholder-slate-400 focus:outline-none focus:border-blue-500 transition"
                  />
                  {Number(unitPrice) > 0 && (
                    <span className="text-[10px] text-blue-650 font-bold mt-1 block">
                      {formatCurrency(Number(unitPrice))}
                    </span>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Harga Modal (HPP)</label>
                  <input
                    type="number"
                    value={cogsUnitPrice}
                    onChange={(e) => setCogsUnitPrice(e.target.value)}
                    placeholder="misal: 100000"
                    className="w-full border border-slate-200 px-3 py-2 rounded-xl text-sm placeholder-slate-400 focus:outline-none focus:border-blue-500 transition"
                  />
                  {Number(cogsUnitPrice) > 0 && (
                    <span className="text-[10px] text-emerald-600 font-bold mt-1 block">
                      {formatCurrency(Number(cogsUnitPrice))}
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Deskripsi Detail</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Keterangan lengkap item..."
                  rows={4}
                  className="w-full border border-slate-200 px-3 py-2 rounded-xl text-sm placeholder-slate-400 focus:outline-none focus:border-blue-500 transition"
                />
              </div>

              {/* Checkbox Lacak Persediaan */}
              <div className="flex items-start gap-2 pt-1">
                <input
                  type="checkbox"
                  id="isInventory"
                  checked={isInventory}
                  onChange={(e) => setIsInventory(e.target.checked)}
                  className="mt-0.5 w-4 h-4 text-blue-600 border-slate-300 rounded-md focus:ring-blue-500 transition cursor-pointer"
                />
                <div className="leading-tight">
                  <label htmlFor="isInventory" className="text-xs font-bold text-slate-700 cursor-pointer block select-none">
                    Lacak Persediaan Stok (Inventaris)
                  </label>
                  <p className="text-[10px] text-slate-400">
                    Aktifkan jika barang ini memiliki kuantitas fisik dan HPP yang dipantau keluar-masuk.
                  </p>
                </div>
              </div>

              {/* Tampilkan Stok & HPP jika isInventory dan sedang Edit */}
              {isInventory && modalType === "edit" && (
                <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl leading-relaxed">
                  <div>
                    <span className="text-[9px] text-slate-400 font-bold block uppercase">Stok Gudang</span>
                    <span className="text-xs font-extrabold text-slate-900">{stockQuantity} {unit}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 font-bold block uppercase">HPP (Moving Average)</span>
                    <span className="text-xs font-extrabold text-slate-900">{formatCurrency(Number(cogsUnitPrice || 0))}</span>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
                <button 
                  type="button" 
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold rounded-xl text-xs transition text-center"
                >
                  Batal
                </button>
                <button 
                  type="submit" 
                  disabled={submitting}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition shadow-sm text-center flex items-center justify-center"
                >
                  {submitting ? "Menyimpan..." : "Simpan Data"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Upload / Import Masal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-600" /> Upload / Import Masal Produk & Stok
              </h3>
              <button 
                onClick={() => setShowImportModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleMassImport} className="p-6 space-y-4">
              {/* Header Banner & Download Template */}
              <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-emerald-900 font-medium">
                <div className="space-y-1">
                  <p className="font-bold text-emerald-950">Format Kolom Template:</p>
                  <code className="block bg-white/80 p-2 rounded-xl border border-emerald-200 font-mono text-[11px] text-slate-700">
                    SKU, Nama Produk, Satuan, Harga Modal (HPP), Harga Jual, Keterangan, Stok Awal
                  </code>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3.5 py-2 rounded-xl text-xs shrink-0 transition shadow-xs flex items-center gap-1.5"
                >
                  📥 Unduh Template
                </button>
              </div>

              {/* Pemilih Gudang Target jika multi warehouse enabled */}
              {warehouses.length > 0 && (
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Gudang Lokasi Penempatan Stok Awal
                  </label>
                  <select
                    value={selectedTargetWarehouseId}
                    onChange={(e) => setSelectedTargetWarehouseId(e.target.value)}
                    className="w-full border border-slate-200 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 bg-white focus:outline-none focus:border-emerald-500 transition"
                  >
                    {warehouses.map(wh => (
                      <option key={wh.id} value={wh.id}>{wh.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Mode Selector Tab */}
              <div className="flex gap-2 border-b border-slate-100 pb-2">
                <button
                  type="button"
                  onClick={() => setImportMode("file")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${importMode === "file" ? "bg-emerald-600 text-white shadow-xs" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
                >
                  📁 Unggah File (.csv / .txt)
                </button>
                <button
                  type="button"
                  onClick={() => setImportMode("text")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${importMode === "text" ? "bg-emerald-600 text-white shadow-xs" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
                >
                  📝 Tempelkan (Paste) Teks CSV
                </button>
              </div>

              {importMode === "file" ? (
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Pilih File Excel / CSV Hasil Edit Template *
                  </label>
                  <input
                    type="file"
                    accept=".csv, .txt, text/plain, text/csv"
                    onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                    className="w-full border border-slate-200 p-2.5 rounded-2xl text-xs text-slate-700 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 cursor-pointer"
                  />
                  {importFile && (
                    <span className="text-[11px] font-bold text-emerald-600 block mt-1">
                      File terpilih: {importFile.name} ({(importFile.size / 1024).toFixed(1)} KB)
                    </span>
                  )}
                </div>
              ) : (
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Tempelkan (Paste) Baris Excel / CSV Di Sini *
                  </label>
                  <textarea
                    rows={6}
                    value={importText}
                    onChange={(e) => setImportText(e.target.value)}
                    placeholder={"SKU-001, Kopi Susu Aren, Cup, 8000, 18000, Best seller, 50\nSKU-002, Teh Manis, Gelas, 2000, 5000, Segar, 100"}
                    className="w-full font-mono text-xs border border-slate-200 p-3 rounded-2xl placeholder-slate-400 focus:outline-none focus:border-emerald-500 transition shadow-inner"
                  />
                </div>
              )}

              {importStatusMsg && (
                <div className={`p-3 rounded-xl text-xs font-bold ${importStatusMsg.includes("Berhasil") ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"}`}>
                  {importStatusMsg}
                </div>
              )}

              <div className="flex flex-col gap-3 pt-3 border-t border-slate-100">
                {importing && (
                  <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                    <div 
                      className="bg-emerald-600 h-2.5 rounded-full transition-all duration-300"
                      style={{ width: `${importProgress > 100 ? 100 : importProgress}%` }}
                    ></div>
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <button 
                    type="button" 
                    onClick={() => {
                      if (importing) {
                        isImportCancelled.current = true;
                      } else {
                        setShowImportModal(false);
                      }
                    }}
                    className="flex-1 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold rounded-xl text-xs transition text-center"
                  >
                    {importing ? "Batalkan (Cancel)" : "Batal"}
                  </button>
                  <button 
                    type="submit" 
                    disabled={importing}
                    className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs shadow-md transition flex items-center justify-center gap-1.5"
                  >
                    {importing ? `Memproses Import (${importProgress > 100 ? 100 : importProgress}%)` : "Mulai Import Produk"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CLEAR ALL PRODUCTS MODAL */}
      {showClearModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-rose-200 rounded-2xl max-w-md w-full overflow-hidden shadow-2xl animate-scaleIn">
            <div className="bg-rose-50 px-6 py-4 border-b border-rose-100 flex items-center justify-between">
              <div className="flex items-center gap-2 text-rose-700">
                <Trash2 className="w-5 h-5" />
                <h3 className="text-base font-bold">Bersihkan Seluruh Data Produk</h3>
              </div>
              <button 
                onClick={() => {
                  setShowClearModal(false);
                  setClearConfirmText("");
                }}
                className="p-1 text-slate-400 hover:text-slate-700 hover:bg-rose-100 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-xs text-slate-600 leading-relaxed">
                Tindakan ini akan <strong>menghapus seluruh barang/produk</strong> yang ada di katalog usaha ini beserta seluruh kartu stok dan mutasi persediaan per gudang.
              </p>
              <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl text-[11px] text-amber-800 font-medium leading-normal">
                ⚠️ PERHATIAN: Riwayat transaksi invoice lama akan tetap aman, namun link referensi barang di katalog akan diatur ke kosong/dihapus.
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-700 block">
                  Ketik kata <span className="text-rose-600 font-mono font-extrabold">HAPUS</span> untuk konfirmasi:
                </label>
                <input
                  type="text"
                  value={clearConfirmText}
                  onChange={(e) => setClearConfirmText(e.target.value)}
                  placeholder="Ketik HAPUS"
                  className="w-full border border-slate-300 px-3 py-2 rounded-xl text-sm font-bold placeholder-slate-400 focus:outline-none focus:border-rose-500 transition"
                />
              </div>

              <div className="flex items-center gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowClearModal(false);
                    setClearConfirmText("");
                  }}
                  className="flex-1 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold rounded-xl text-xs transition"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={clearConfirmText.trim().toUpperCase() !== "HAPUS" || deleting}
                  onClick={handleClearAllProducts}
                  className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-40 text-white font-bold rounded-xl text-xs shadow-md transition flex items-center justify-center gap-1.5"
                >
                  {deleting ? "Membersihkan..." : "Bersihkan Seluruh Produk"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
