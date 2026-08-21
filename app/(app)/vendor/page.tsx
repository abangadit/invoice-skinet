"use client";
 
 import React, { useEffect, useState } from "react";
 import { 
   Building2, 
   Plus, 
   Search, 
   Trash2, 
   Edit2, 
   X,
   Phone,
   Mail,
   MapPin,
   FileText
 } from "lucide-react";
 import { useBusiness } from "../../../lib/context/BusinessContext";
 import { createWebBrowserClient } from "../../../lib/supabase/client";
 import { useLanguage } from "../../../lib/context/LanguageContext";
 import Pagination from "../../../components/Pagination";
 
 interface Vendor {
   id: string;
   business_id: string;
   name: string;
   email: string | null;
   phone: string | null;
   address: string | null;
   tax_id: string | null;
   created_at: string;
 }
 
 export default function VendorPage() {
   const { activeBusiness } = useBusiness();
   const { locale, t } = useLanguage();
   const [vendors, setVendors] = useState<Vendor[]>([]);
   const [loading, setLoading] = useState(true);
   
   // Modals state
   const [showModal, setShowModal] = useState(false);
   const [modalType, setModalType] = useState<"create" | "edit">("create");
   const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
   
   // Form fields
   const [name, setName] = useState("");
   const [email, setEmail] = useState("");
   const [phone, setPhone] = useState("");
   const [address, setAddress] = useState("");
   const [taxId, setTaxId] = useState("");
   const [submitting, setSubmitting] = useState(false);
 
   // Search
   const [search, setSearch] = useState("");
   const [currentPage, setCurrentPage] = useState(1);
   const PAGE_SIZE = 10;
 
   useEffect(() => {
     setCurrentPage(1);
   }, [search]);
 
   const fetchVendors = async () => {
     if (!activeBusiness) {
       setLoading(false);
       return;
     }
     try {
       setLoading(true);
       const supabase = createWebBrowserClient();
 
       const { data, error } = await supabase
         .from("vendors")
         .select("*")
         .eq("business_id", activeBusiness.id)
         .order("name", { ascending: true });
 
       if (error) throw error;
       setVendors(data || []);
     } catch (err) {
       console.error("Error fetching vendors:", err);
     } finally {
       setLoading(false);
     }
   };
 
   useEffect(() => {
     fetchVendors();
   }, [activeBusiness]);
 
   const openCreateModal = () => {
     setModalType("create");
     setEditingVendor(null);
     setName("");
     setEmail("");
     setPhone("");
     setAddress("");
     setTaxId("");
     setShowModal(true);
   };
 
   const openEditModal = (vendor: Vendor) => {
     setModalType("edit");
     setEditingVendor(vendor);
     setName(vendor.name);
     setEmail(vendor.email || "");
     setPhone(vendor.phone || "");
     setAddress(vendor.address || "");
     setTaxId(vendor.tax_id || "");
     setShowModal(true);
   };
 
   const handleSubmit = async (e: React.FormEvent) => {
     e.preventDefault();
     if (!activeBusiness) return;
     try {
       setSubmitting(true);
       const supabase = createWebBrowserClient();
 
       if (modalType === "create") {
         const { error } = await supabase.from("vendors").insert({
           business_id: activeBusiness.id,
           name,
           email: email || null,
           phone: phone || null,
           address: address || null,
           tax_id: taxId || null
         });
         if (error) throw error;
       } else if (modalType === "edit" && editingVendor) {
         const { error } = await supabase
           .from("vendors")
           .update({
             name,
             email: email || null,
             phone: phone || null,
             address: address || null,
             tax_id: taxId || null
           })
           .eq("id", editingVendor.id);
         if (error) throw error;
       }
 
       setShowModal(false);
       fetchVendors();
     } catch (err) {
       console.error("Error saving vendor:", err);
       alert("Gagal menyimpan data vendor.");
     } finally {
       setSubmitting(false);
     }
   };
 
   const handleDelete = async (id: string) => {
     if (!confirm("Apakah Anda yakin ingin menghapus vendor ini dari daftar?")) return;
     try {
       const supabase = createWebBrowserClient();
       const { error } = await supabase.from("vendors").delete().eq("id", id);
       if (error) throw error;
       fetchVendors();
     } catch (err) {
       console.error("Error deleting vendor:", err);
       alert("Gagal menghapus vendor.");
     }
   };
 
   const filteredVendors = vendors.filter((v) => {
     return (
       v.name.toLowerCase().includes(search.toLowerCase()) || 
       (v.email && v.email.toLowerCase().includes(search.toLowerCase())) ||
       (v.phone && v.phone.toLowerCase().includes(search.toLowerCase())) ||
       (v.address && v.address.toLowerCase().includes(search.toLowerCase()))
     );
   });
 
   return (
     <div className="space-y-6">
       
       {/* Header */}
       <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
         <div>
           <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
             Pemasok (Vendor)
           </h2>
           <p className="text-sm text-slate-500 mt-0.5">Kelola daftar pemasok bahan baku, produk, atau penyedia jasa eksternal Anda.</p>
         </div>
         <button
           onClick={openCreateModal}
           className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 px-4 rounded-xl text-sm flex items-center justify-center gap-1.5 shadow-sm transition shrink-0 self-start sm:self-auto"
         >
           <Plus className="w-4 h-4" /> Tambah Vendor
         </button>
       </div>
 
       {/* Search Bar */}
       <div className="relative">
         <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
         <input
           type="text"
           value={search}
           onChange={(e) => setSearch(e.target.value)}
           placeholder="Cari nama vendor, email, nomor HP, atau alamat..."
           className="w-full bg-white border border-slate-200 pl-10 pr-4 py-2.5 rounded-xl text-sm placeholder-slate-400 focus:outline-none focus:border-blue-500 transition shadow-sm"
         />
       </div>
 
       {/* Main List */}
       {loading ? (
         <div className="flex flex-col items-center justify-center py-20">
           <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
           <p className="text-xs text-slate-500 font-semibold mt-2">Memuat daftar vendor...</p>
         </div>
       ) : filteredVendors.length > 0 ? (
         <div className="space-y-4">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             {filteredVendors.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE).map((vendor) => (
               <div 
                 key={vendor.id} 
                 className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm space-y-4 flex flex-col justify-between card-shadow-hover transition"
               >
                 <div className="space-y-3">
                   <div className="flex justify-between items-start">
                     <div className="flex items-center gap-3">
                       <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 shrink-0">
                         <Building2 className="w-5 h-5 text-blue-600" />
                       </div>
                       <div>
                         <h4 className="font-bold text-slate-900 text-sm">{vendor.name}</h4>
                         {vendor.tax_id && (
                           <span className="text-[10px] font-semibold text-slate-400 font-mono block">
                             NPWP: {vendor.tax_id}
                           </span>
                         )}
                       </div>
                     </div>
                     
                     <div className="flex items-center gap-1">
                       <button 
                         onClick={() => openEditModal(vendor)}
                         className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                         title="Ubah"
                       >
                         <Edit2 className="w-4 h-4" />
                       </button>
                       <button 
                         onClick={() => handleDelete(vendor.id)}
                         className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                         title="Hapus"
                       >
                         <Trash2 className="w-4 h-4" />
                       </button>
                     </div>
                   </div>
 
                   <div className="space-y-1.5 border-t border-slate-100 pt-3 text-xs text-slate-600">
                     {vendor.phone && (
                       <div className="flex items-center gap-2">
                         <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                         <span className="font-medium">{vendor.phone}</span>
                       </div>
                     )}
                     {vendor.email && (
                       <div className="flex items-center gap-2">
                         <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                         <span>{vendor.email}</span>
                       </div>
                     )}
                     {vendor.address && (
                       <div className="flex items-start gap-2">
                         <MapPin className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                         <span className="line-clamp-2 leading-relaxed">{vendor.address}</span>
                       </div>
                     )}
                   </div>
                 </div>
               </div>
             ))}
           </div>
           <Pagination
             currentPage={currentPage}
             totalItems={filteredVendors.length}
             pageSize={PAGE_SIZE}
             onPageChange={setCurrentPage}
           />
         </div>
       ) : (
         <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-400 shadow-sm">
           <Building2 className="w-12 h-12 mx-auto text-slate-200 mb-3" />
           <p className="text-sm font-semibold">Belum ada vendor terdaftar</p>
           <button 
             onClick={openCreateModal}
             className="text-xs font-bold text-blue-600 hover:underline mt-1 inline-block"
           >
             Tambah Vendor Baru
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
                   {modalType === "create" ? "Tambah Vendor Baru" : "Ubah Data Vendor"}
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
                 <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Nama Vendor / Perusahaan *</label>
                 <input
                   type="text"
                   required
                   value={name}
                   onChange={(e) => setName(e.target.value)}
                   placeholder="Nama Pemasok (misal: PT Abadi Logistik)"
                   className="w-full border border-slate-200 px-3 py-2 rounded-xl text-sm placeholder-slate-400 focus:outline-none focus:border-blue-500 transition"
                 />
               </div>
 
               <div className="grid grid-cols-2 gap-3">
                 <div className="space-y-1">
                   <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">WhatsApp / No. Telp</label>
                   <input
                     type="tel"
                     value={phone}
                     onChange={(e) => setPhone(e.target.value)}
                     placeholder="misal: 08123456789"
                     className="w-full border border-slate-200 px-3 py-2 rounded-xl text-sm placeholder-slate-400 focus:outline-none focus:border-blue-500 transition"
                   />
                 </div>
 
                 <div className="space-y-1">
                   <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Email Vendor</label>
                   <input
                     type="email"
                     value={email}
                     onChange={(e) => setEmail(e.target.value)}
                     placeholder="misal: sales@vendor.com"
                     className="w-full border border-slate-200 px-3 py-2 rounded-xl text-sm placeholder-slate-400 focus:outline-none focus:border-blue-500 transition"
                   />
                 </div>
               </div>
 
               <div className="space-y-1">
                 <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">NPWP (Tax ID Vendor)</label>
                 <input
                   type="text"
                   value={taxId}
                   onChange={(e) => setTaxId(e.target.value)}
                   placeholder="NPWP Vendor (misal: 01.234.567.8-999.000)"
                   className="w-full border border-slate-200 px-3 py-2 rounded-xl text-sm placeholder-slate-400 focus:outline-none focus:border-blue-500 transition"
                 />
               </div>
 
               <div className="space-y-1">
                 <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Alamat Lengkap</label>
                 <textarea
                   value={address}
                   onChange={(e) => setAddress(e.target.value)}
                   placeholder="Alamat kantor atau gudang pengiriman vendor..."
                   rows={3}
                   className="w-full border border-slate-200 px-3 py-2 rounded-xl text-sm placeholder-slate-400 focus:outline-none focus:border-blue-500 transition"
                 />
               </div>
 
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
 
     </div>
   );
 }
 
