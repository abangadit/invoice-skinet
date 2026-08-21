"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { 
  ShoppingCart, 
  Search, 
  User, 
  Plus, 
  Minus, 
  Trash2, 
  DollarSign, 
  CreditCard, 
  Smartphone, 
  AlertCircle, 
  Clock, 
  Check, 
  Package,
  Award,
  ChevronRight,
  ArrowLeft, 
  Printer, 
  FileText,
  History,
  CheckCircle2,
  X
} from "lucide-react";
import { useBusiness } from "../../../lib/context/BusinessContext";
import { createWebBrowserClient } from "../../../lib/supabase/client";

interface CatalogItem {
  id: string;
  name: string;
  sku?: string | null;
  unit: string;
  unit_price: number;
  stock_quantity: number;
  is_inventory: boolean;
}

interface Customer {
  id: string;
  name: string;
  phone: string | null;
  loyalty_points: number;
}

interface CartItem {
  item: CatalogItem;
  quantity: number;
}

export default function POSPage() {
  const router = useRouter();
  const { activeBusiness, userRole } = useBusiness();
  
  // Auth & Employee States
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [employee, setEmployee] = useState<any>(null);
  const [activeShift, setActiveShift] = useState<any>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [openingCashInput, setOpeningCashInput] = useState("0");
  const [openingNotes, setOpeningNotes] = useState("");
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>("");

  // Owner Register Employee States
  const [ownerName, setOwnerName] = useState("");
  const [ownerNik, setOwnerNik] = useState("");
  const [ownerPhone, setOwnerPhone] = useState("");
  const [registeringOwner, setRegisteringOwner] = useState(false);

  // Catalog & Customer States
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [customerSearchQuery, setCustomerSearchQuery] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [newCustName, setNewCustName] = useState("");
  const [newCustPhone, setNewCustPhone] = useState("");
  const [newCustEmail, setNewCustEmail] = useState("");

  // POS Cart & Loyalty States
  const [cart, setCart] = useState<CartItem[]>([]);
  const [pointsToRedeem, setPointsToRedeem] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<"Cash" | "Bank Transfer" | "QRIS">("Cash");
  const [cashReceived, setCashReceived] = useState("");
  const [checkoutNotes, setCheckoutNotes] = useState("");
  const [activeTab, setActiveTab] = useState<"catalog" | "cart">("catalog");

  // Modal States
  const [showCloseShiftModal, setShowCloseShiftModal] = useState(false);
  const [actualClosingCashInput, setActualClosingCashInput] = useState("");
  const [closingNotes, setClosingNotes] = useState("");
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [lastInvoice, setLastInvoice] = useState<any>(null);
  const [printMode, setPrintMode] = useState<"thermal" | "a4">("thermal");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Verify Active Shift
  const verifyShift = async () => {
    if (!activeBusiness) return;
    try {
      setCheckingAuth(true);
      const supabase = createWebBrowserClient();
      
      // Get current authenticated user
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) throw new Error("Pengguna tidak terautentikasi.");
      setCurrentUser(user);

      // Get employee profile
      const { data: empData, error: empError } = await supabase
        .from("employees")
        .select("*")
        .eq("user_id", user.id)
        .eq("business_id", activeBusiness.id)
        .eq("is_active", true)
        .maybeSingle();

      if (empError || !empData) {
        setEmployee(null);
        setActiveShift(null);
        
        // Pre-fill owner name if they register as employee later
        if (user.email) {
          setOwnerName(user.email.split("@")[0].toUpperCase());
        }
        setCheckingAuth(false);
        return;
      }
      setEmployee(empData);

      // Get active shift
      const { data: shiftData, error: shiftError } = await supabase
        .from("pos_shifts")
        .select("*")
        .eq("employee_id", empData.id)
        .eq("status", "open")
        .order("opened_at", { ascending: false })
        .limit(1);

      if (shiftError) throw shiftError;
      if (shiftData && shiftData.length > 0) {
        setActiveShift(shiftData[0]);
      } else {
        setActiveShift(null);
      }
    } catch (err) {
      console.error("Error verifying cashier shift:", err);
    } finally {
      setCheckingAuth(false);
    }
  };

  const handleRegisterOwnerAsEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBusiness || !currentUser) return;
    if (ownerNik.length !== 16) {
      alert("Nomor NIK harus tepat 16 digit!");
      return;
    }
    try {
      setRegisteringOwner(true);
      setErrorMsg("");
      const supabase = createWebBrowserClient();

      const payload = {
        business_id: activeBusiness.id,
        user_id: currentUser.id,
        name: ownerName,
        email: currentUser.email,
        phone: ownerPhone || null,
        nik: ownerNik,
        join_date: new Date().toISOString().split("T")[0],
        is_active: true,
        basic_salary: 0,
        allowance_fixed: 0,
        ptkp_status: "TK/0"
      };

      const { error } = await supabase
        .from("employees")
        .insert(payload);

      if (error) throw error;
      
      // Refresh shift verification to link profile
      await verifyShift();
    } catch (err: any) {
      console.error("Error creating owner employee profile:", err);
      setErrorMsg(err.message || "Gagal mengaktifkan akun kasir.");
    } finally {
      setRegisteringOwner(false);
    }
  };

  const fetchCatalogAndCustomers = async () => {
    if (!activeBusiness) return;
    try {
      const supabase = createWebBrowserClient();
      
      // Fetch catalog items (conditional warehouse stock)
      let data: any[] = [];
      if (activeBusiness?.is_multi_warehouse_enabled && activeShift?.warehouse_id) {
        const { data: itemsData, error } = await supabase
          .from("items")
          .select(`
            id, 
            name, 
            sku,
            unit, 
            unit_price, 
            is_inventory,
            stock_quantity,
            item_stocks!left (
              stock_quantity,
              warehouse_id
            )
          `)
          .eq("business_id", activeBusiness.id)
          .eq("item_stocks.warehouse_id", activeShift.warehouse_id)
          .order("name", { ascending: true });
        
        if (error) throw error;
        data = itemsData || [];
      } else {
        const { data: itemsData, error } = await supabase
          .from("items")
          .select("id, name, sku, unit, unit_price, stock_quantity, is_inventory")
          .eq("business_id", activeBusiness.id)
          .order("name", { ascending: true });
          
        if (error) throw error;
        data = itemsData || [];
      }

      setCatalog(data.map((item: any) => {
        let stock = Number(item.stock_quantity || 0);
        if (activeBusiness?.is_multi_warehouse_enabled && activeShift?.warehouse_id) {
          const whStock = item.item_stocks?.find((s: any) => s.warehouse_id === activeShift.warehouse_id);
          stock = whStock ? Number(whStock.stock_quantity || 0) : 0;
        }
        return {
          id: item.id,
          name: item.name,
          sku: item.sku,
          unit: item.unit,
          unit_price: Number(item.unit_price || 0),
          stock_quantity: stock,
          is_inventory: item.is_inventory
        };
      }));

      // Fetch customers
      const { data: custData } = await supabase
        .from("customers")
        .select("id, name, phone, loyalty_points")
        .eq("business_id", activeBusiness.id)
        .order("name", { ascending: true });

      setCustomers((custData || []).map((c: any) => ({
        ...c,
        loyalty_points: Number(c.loyalty_points || 0)
      })));
    } catch (err) {
      console.error("Error loading POS catalog data:", err);
    }
  };

  const fetchWarehouses = async () => {
    if (!activeBusiness) return;
    try {
      const supabase = createWebBrowserClient();
      const { data, error } = await supabase
        .from("warehouses")
        .select("*")
        .eq("business_id", activeBusiness.id)
        .order("name", { ascending: true });
      if (error) throw error;
      setWarehouses(data || []);
      if (data && data.length > 0) {
        setSelectedWarehouseId(data[0].id);
      }
    } catch (err) {
      console.error("Error loading warehouses:", err);
    }
  };

  useEffect(() => {
    verifyShift();
    if (activeBusiness?.is_multi_warehouse_enabled) {
      fetchWarehouses();
    }
  }, [activeBusiness]);

  useEffect(() => {
    let barcodeBuffer = "";
    let lastKeyTime = 0;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore key events if focused on input or textarea
      const target = e.target as HTMLElement;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) {
        return;
      }

      const currentTime = Date.now();
      if (currentTime - lastKeyTime > 100) {
        barcodeBuffer = "";
      }
      lastKeyTime = currentTime;

      if (e.key === "Enter") {
        if (barcodeBuffer.length >= 2) {
          const scannedCode = barcodeBuffer.trim();
          const matchedItem = catalog.find(item => item.sku && item.sku.toLowerCase() === scannedCode.toLowerCase());
          if (matchedItem) {
            addToCart(matchedItem);
          } else {
            console.log("No product matched for barcode:", scannedCode);
          }
          barcodeBuffer = "";
        }
      } else if (e.key.length === 1) {
        barcodeBuffer += e.key;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [catalog, cart]);

  useEffect(() => {
    if (activeShift) {
      fetchCatalogAndCustomers();
      // Auto focus on search box
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [activeShift]);

  useEffect(() => {
    if (activeTab === "catalog" && activeShift) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [activeTab]);

  // Open Shift Action
  const handleOpenShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBusiness || !employee) return;
    try {
      setSubmitting(true);
      setErrorMsg("");
      const supabase = createWebBrowserClient();
      
      const payload = {
        business_id: activeBusiness.id,
        employee_id: employee.id,
        opening_cash: Number(openingCashInput || 0),
        expected_closing_cash: Number(openingCashInput || 0),
        status: "open",
        notes: openingNotes || null,
        warehouse_id: activeBusiness?.is_multi_warehouse_enabled ? (selectedWarehouseId || null) : null
      };

      const { data, error } = await supabase
        .from("pos_shifts")
        .insert(payload)
        .select()
        .single();

      if (error) throw error;
      setActiveShift(data);
      setOpeningCashInput("0");
      setOpeningNotes("");
    } catch (err: any) {
      setErrorMsg(err.message || "Gagal membuka shift kasir.");
    } finally {
      setSubmitting(false);
    }
  };

  // Close Shift Action
  const handleCloseShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeShift) return;
    try {
      setSubmitting(true);
      setErrorMsg("");
      const supabase = createWebBrowserClient();

      const { error } = await supabase
        .from("pos_shifts")
        .update({
          closed_at: new Date().toISOString(),
          actual_closing_cash: Number(actualClosingCashInput || 0),
          status: "closed",
          notes: closingNotes || null
        })
        .eq("id", activeShift.id);

      if (error) throw error;
      setActiveShift(null);
      setShowCloseShiftModal(false);
      setActualClosingCashInput("");
      setClosingNotes("");
    } catch (err: any) {
      setErrorMsg(err.message || "Gagal menutup shift.");
    } finally {
      setSubmitting(false);
    }
  };

  // Add Customer Action
  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBusiness) return;
    try {
      setSubmitting(true);
      setErrorMsg("");
      const supabase = createWebBrowserClient();

      const { data, error } = await supabase
        .from("customers")
        .insert({
          business_id: activeBusiness.id,
          name: newCustName,
          phone: newCustPhone || null,
          email: newCustEmail || null,
          loyalty_points: 0
        })
        .select()
        .single();

      if (error) throw error;
      
      const added: Customer = {
        id: data.id,
        name: data.name,
        phone: data.phone,
        loyalty_points: 0
      };

      setCustomers(prev => [added, ...prev].sort((a, b) => a.name.localeCompare(b.name)));
      setSelectedCustomer(added);
      setShowAddCustomerModal(false);
      setNewCustName("");
      setNewCustPhone("");
      setNewCustEmail("");
    } catch (err: any) {
      setErrorMsg(err.message || "Gagal menambahkan pelanggan baru.");
    } finally {
      setSubmitting(false);
    }
  };

  // Cart Operations
  const addToCart = (item: CatalogItem) => {
    const existing = cart.find(c => c.item.id === item.id);
    if (existing) {
      if (item.is_inventory && existing.quantity >= item.stock_quantity) {
        alert(`Stok produk "${item.name}" tidak mencukupi!`);
        return;
      }
      setCart(cart.map(c => c.item.id === item.id ? { ...c, quantity: c.quantity + 1 } : c));
    } else {
      if (item.is_inventory && item.stock_quantity <= 0) {
        alert(`Stok produk "${item.name}" kosong!`);
        return;
      }
      setCart([...cart, { item, quantity: 1 }]);
    }

    // Refocus search bar after adding product to cart
    setTimeout(() => {
      searchInputRef.current?.focus();
    }, 50);
  };

  const updateQuantity = (itemId: string, q: number) => {
    const itemInCart = cart.find(c => c.item.id === itemId);
    if (!itemInCart) return;

    if (q <= 0) {
      setCart(cart.filter(c => c.item.id !== itemId));
      return;
    }

    if (itemInCart.item.is_inventory && q > itemInCart.item.stock_quantity) {
      alert(`Stok produk tidak mencukupi!`);
      return;
    }

    setCart(cart.map(c => c.item.id === itemId ? { ...c, quantity: q } : c));
  };

  const removeFromCart = (itemId: string) => {
    setCart(cart.filter(c => c.item.id !== itemId));
  };

  // Calculations
  const subtotal = cart.reduce((sum, c) => sum + (c.item.unit_price * c.quantity), 0);
  const loyaltyDiscount = pointsToRedeem * 100; // 1 Poin = Rp 100
  const finalTotal = Math.max(0, subtotal - loyaltyDiscount);
  const changeAmount = cashReceived ? Number(cashReceived) - finalTotal : 0;

  const handlePointsChange = (val: string) => {
    const pts = Math.max(0, parseInt(val || "0", 10));
    if (selectedCustomer) {
      const maxPts = Math.min(selectedCustomer.loyalty_points, Math.floor(subtotal / 100));
      setPointsToRedeem(Math.min(pts, maxPts));
    } else {
      setPointsToRedeem(0);
    }
  };

  // Checkout Action
  const handleCheckout = async () => {
    if (cart.length === 0 || !activeBusiness || !activeShift) return;
    if (paymentMethod === "Cash" && (!cashReceived || Number(cashReceived) < finalTotal)) {
      alert("Pembayaran tunai yang dimasukkan kurang!");
      return;
    }

    try {
      setSubmitting(true);
      setErrorMsg("");
      const supabase = createWebBrowserClient();

      // Generate local nanoID-like public token
      const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
      let publicToken = "";
      for (let i = 0; i < 8; i++) {
        publicToken += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
      }

      // POS Invoice number (INV-POS-[timestamp])
      const invNumber = `POS-${Date.now().toString().slice(-8)}`;

      // 1. Create Invoice record (insert as draft first so items exist when triggering paid status)
      const invoicePayload = {
        business_id: activeBusiness.id,
        customer_id: selectedCustomer?.id || null,
        invoice_number: invNumber,
        type: "invoice",
        status: "draft",
        issue_date: new Date().toISOString().split("T")[0],
        due_date: new Date().toISOString().split("T")[0],
        currency: activeBusiness.default_currency || "IDR",
        subtotal: subtotal,
        discount_amount: loyaltyDiscount,
        total_amount: finalTotal,
        paid_amount: finalTotal,
        remaining_amount: 0,
        payment_methods: [paymentMethod],
        notes: checkoutNotes || null,
        pos_shift_id: activeShift.id,
        loyalty_points_redeemed: pointsToRedeem,
        public_token: publicToken
      };

      const { data: invData, error: invError } = await supabase
        .from("invoices")
        .insert(invoicePayload)
        .select()
        .single();

      if (invError) throw invError;

      // 2. Create Invoice Items
      const itemsPayload = cart.map((c, index) => ({
        invoice_id: invData.id,
        item_id: c.item.id,
        sort_order: index,
        name: c.item.name,
        quantity: c.quantity,
        unit: c.item.unit,
        unit_price: c.item.unit_price,
        subtotal: c.item.unit_price * c.quantity
      }));

      const { error: itemsError } = await supabase
        .from("invoice_items")
        .insert(itemsPayload);

      if (itemsError) throw itemsError;

      // 3. Update Invoice status to "paid" so trigger calculates HPP journal entries after items exist
      const { error: updateInvError } = await supabase
        .from("invoices")
        .update({ status: "paid" })
        .eq("id", invData.id);

      if (updateInvError) throw updateInvError;

      // 3. Record Payment Proof
      const paymentPayload = {
        invoice_id: invData.id,
        amount: finalTotal,
        payment_date: new Date().toISOString().split("T")[0],
        method: paymentMethod,
        reference_number: `POS-PAY-${invNumber}`,
        notes: "Transaksi Kasir POS"
      };

      const { error: payError } = await supabase
        .from("payments")
        .insert(paymentPayload);

      if (payError) throw payError;

      // 4. Update expected cash in pos_shift
      if (paymentMethod === "Cash") {
        const { error: shiftError } = await supabase
          .from("pos_shifts")
          .update({
            expected_closing_cash: Number(activeShift.expected_closing_cash) + finalTotal
          })
          .eq("id", activeShift.id);
        
        if (shiftError) throw shiftError;
        
        // Refresh shift state local
        setActiveShift((prev: any) => ({
          ...prev,
          expected_closing_cash: Number(prev.expected_closing_cash) + finalTotal
        }));
      }

      // Trigger stock movement logging automatically:
      // Note: Triggers on public.stock_movements or items stock decreases are handled by supabase triggers in the revision.sql.
      // Insert stock movement logs for our POS sales:
      const stockMovementPayloads = cart.map(c => ({
        business_id: activeBusiness.id,
        item_id: c.item.id,
        type: "out_sales" as const,
        quantity: c.quantity,
        unit: c.item.unit || "pcs",
        unit_cost: 0, // database process_stock_out automatically handles/looks up or records this. But we insert to satisfy schema
        reference_id: invData.id,
        notes: `Penjualan POS #${invNumber}`,
        warehouse_id: activeShift?.warehouse_id || null
      }));

      // Let's insert stock movements
      const { error: mvError } = await supabase
        .from("stock_movements")
        .insert(stockMovementPayloads);
      
      if (mvError) throw mvError;

      // Save invoice for printing receipt
      setLastInvoice({
        ...invData,
        items: cart,
        customerName: selectedCustomer?.name || "Pelanggan Umum",
        changeAmount: changeAmount
      });

      // Clear states & Refresh Catalog
      setCart([]);
      setSelectedCustomer(null);
      setPointsToRedeem(0);
      setCashReceived("");
      setCheckoutNotes("");
      setActiveTab("catalog");
      setShowReceiptModal(true);
      fetchCatalogAndCustomers();
    } catch (err: any) {
      console.error("POS Checkout error:", err);
      setErrorMsg(err.message || "Gagal memproses transaksi kasir.");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredCatalog = catalog.filter(item => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    const matchName = item.name.toLowerCase().includes(q);
    const matchSku = item.sku ? item.sku.toLowerCase().includes(q) : false;
    return matchName || matchSku;
  });

  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(customerSearchQuery.toLowerCase()) ||
    (c.phone && c.phone.includes(customerSearchQuery))
  );

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: activeBusiness?.default_currency || "IDR",
      maximumFractionDigits: 0
    }).format(val);
  };

  if (checkingAuth) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs text-slate-500 font-semibold mt-2">Memeriksa status shift kasir...</p>
      </div>
    );
  }

  // Case 1: Logged-in user is not associated with an active employee profile
  if (!employee) {
    const isOwnerOrAdmin = userRole === "owner" || userRole === "admin";
    
    return (
      <div className="max-w-md mx-auto my-12 bg-white border border-slate-200 rounded-2xl p-8 text-center shadow-sm text-xs font-semibold text-slate-700">
        <AlertCircle className="w-12 h-12 mx-auto text-amber-500 mb-3" />
        <h3 className="text-base font-bold text-slate-900 mb-1">Profil Karyawan Belum Terhubung</h3>
        
        {isOwnerOrAdmin ? (
          <div className="text-left space-y-4 mt-4 border-t border-slate-100 pt-4">
            <p className="text-slate-500 leading-relaxed text-center">
              Sebagai **Owner/Admin**, Anda harus memiliki entri di direktori Karyawan agar dapat membuka shift kasir POS. Daftarkan diri Anda secara instan di bawah ini:
            </p>
            
            {errorMsg && (
              <div className="bg-rose-50 border border-rose-100 text-rose-600 p-2.5 rounded-xl flex items-start gap-1.5 mb-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleRegisterOwnerAsEmployee} className="space-y-3">
              <div className="space-y-1">
                <label className="text-slate-500">Nama Lengkap Kasir</label>
                <input 
                  type="text" 
                  required
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-slate-900 font-bold focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-500">Nomor NIK (16 Digit) *</label>
                <input 
                  type="text" 
                  required
                  maxLength={16}
                  value={ownerNik}
                  onChange={(e) => setOwnerNik(e.target.value.replace(/[^0-9]/g, ""))}
                  placeholder="e.g. 3201882001920038"
                  className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-slate-900 font-bold font-mono focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-500">Nomor WhatsApp / Telepon</label>
                <input 
                  type="tel" 
                  value={ownerPhone}
                  onChange={(e) => setOwnerPhone(e.target.value)}
                  placeholder="e.g. 08129938820"
                  className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-slate-900 font-bold focus:outline-none focus:border-blue-500"
                />
              </div>

              <button
                type="submit"
                disabled={registeringOwner}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-extrabold py-2.5 rounded-xl transition shadow-sm active:scale-95 disabled:opacity-50 mt-2 text-xs"
              >
                {registeringOwner ? "Mendaftarkan..." : "Aktifkan Akun Kasir Saya"}
              </button>
            </form>
          </div>
        ) : (
          <>
            <p className="text-slate-500 leading-relaxed mb-4">
              Untuk menggunakan modul Kasir POS, alamat email akun login Anda harus terdaftar sebagai karyawan aktif di sistem ERP. Silakan daftarkan atau hubungkan email ini di menu Karyawan.
            </p>
            <button 
              onClick={verifyShift} 
              className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold py-2 px-4 rounded-xl transition"
            >
              Coba Hubungkan Kembali
            </button>
          </>
        )}
      </div>
    );
  }

  // Case 2: Employee profile exists but no shift is currently open
  if (!activeShift) {
    return (
      <div className="max-w-md mx-auto my-12 bg-white border border-slate-200 rounded-2xl shadow-md overflow-hidden text-xs font-semibold">
        <div className="p-6 bg-slate-50 border-b border-slate-200 text-center">
          <Clock className="w-12 h-12 mx-auto text-blue-600 mb-2" />
          <h3 className="text-base font-bold text-slate-900">Buka Shift Kasir & Laci Kas</h3>
          <p className="text-slate-500 mt-1">Isi modal kas awal laci kasir untuk mulai memproses transaksi penjualan POS.</p>
        </div>

        {errorMsg && (
          <div className="mx-6 mt-4 bg-rose-50 border border-rose-100 text-rose-650 p-2.5 rounded-xl flex items-start gap-1.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleOpenShift} className="p-6 space-y-4">
          <div className="space-y-1">
            <label className="text-slate-500">Karyawan Penanggung Jawab</label>
            <input 
              type="text" 
              readOnly 
              value={employee.name} 
              className="w-full bg-slate-100 border border-slate-200 px-3 py-2 rounded-xl text-slate-700 font-bold"
            />
          </div>

          <div className="space-y-1">
            <label className="text-slate-500">Uang Modal Awal (Cash Float - Rp)</label>
            <input 
              type="number" 
              min="0"
              required
              value={openingCashInput}
              onChange={(e) => setOpeningCashInput(e.target.value)}
              className="w-full bg-white border border-slate-200 px-3.5 py-2.5 rounded-xl text-slate-900 focus:outline-none focus:border-blue-500 font-bold text-right text-sm"
            />
          </div>

          {activeBusiness?.is_multi_warehouse_enabled && (
            <div className="space-y-1">
              <label className="text-slate-500">Pilih Gudang / Etalase (Sumber Stok)</label>
              <select
                required
                value={selectedWarehouseId}
                onChange={(e) => setSelectedWarehouseId(e.target.value)}
                className="w-full bg-white border border-slate-200 px-3 py-2 rounded-xl text-slate-800 focus:outline-none focus:border-blue-500"
              >
                {warehouses.length === 0 ? (
                  <option value="">Loading warehouses...</option>
                ) : (
                  warehouses.map((wh) => (
                    <option key={wh.id} value={wh.id}>
                      {wh.name} {wh.code ? `(${wh.code})` : ""}
                    </option>
                  ))
                )}
              </select>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-slate-500">Catatan Buka Shift (Opsional)</label>
            <textarea 
              rows={2}
              value={openingNotes}
              onChange={(e) => setOpeningNotes(e.target.value)}
              placeholder="e.g. Kasir shift pagi, laci kas bersih."
              className="w-full bg-white border border-slate-200 px-3 py-2 rounded-xl text-slate-800 focus:outline-none focus:border-blue-500"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-extrabold py-3 rounded-xl transition shadow-sm active:scale-95 disabled:opacity-50 text-sm"
          >
            {submitting ? "Membuka Laci Kas..." : "Buka Laci Kas & POS"}
          </button>
        </form>
      </div>
    );
  }

  // Case 3: Shift is open, display active cashier POS panel
  return (
    <div className="flex flex-col gap-3 min-h-0 lg:h-[calc(100vh-140px)] -mt-2 -mb-6 text-xs font-semibold select-none pb-28 lg:pb-0">
      
      {/* Mobile Tab Switcher Bar */}
      <div className="lg:hidden flex bg-slate-100 p-1.5 rounded-2xl gap-1.5 border border-slate-200 shadow-2xs">
        <button
          type="button"
          onClick={() => setActiveTab("catalog")}
          className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
            activeTab === "catalog"
              ? "bg-white text-blue-600 shadow-sm font-extrabold"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <Package className="w-4 h-4" />
          <span>Katalog Produk</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("cart")}
          className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 relative ${
            activeTab === "cart"
              ? "bg-white text-blue-600 shadow-sm font-extrabold"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <ShoppingCart className="w-4 h-4" />
          <span>Keranjang & Kasir</span>
          {cart.length > 0 && (
            <span className="bg-blue-600 text-white font-black text-[10px] px-1.5 py-0.5 rounded-full shrink-0">
              {cart.reduce((sum, c) => sum + c.quantity, 0)}
            </span>
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-0 flex-1">
      
      {/* LEFT COLUMN: Catalog (lg:col-span-7) */}
      <div className={`${activeTab === "catalog" ? "flex" : "hidden"} lg:flex lg:col-span-7 flex-col gap-4 min-h-0 lg:h-full bg-white border border-slate-200 rounded-2xl p-4 shadow-sm pb-20 lg:pb-4`}>
        
        {/* Search & Shift Header info */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100">
              <Clock className="w-4.5 h-4.5" />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block uppercase font-bold tracking-wider">Shift Aktif</span>
              <span className="text-slate-850 font-bold">Kasir: {employee.name}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => router.push("/pos/history")}
              className="bg-slate-50 border border-slate-200 text-slate-755 hover:bg-slate-100 font-extrabold px-3 py-2 rounded-xl flex items-center gap-1.5 transition active:scale-95 text-[11px]"
            >
              <History className="w-4 h-4 text-slate-500" /> Riwayat Penjualan
            </button>
            <button
              type="button"
              onClick={() => {
                setActualClosingCashInput(activeShift.expected_closing_cash.toString());
                setShowCloseShiftModal(true);
              }}
              className="bg-rose-50 border border-rose-100 text-rose-600 hover:bg-rose-100 font-extrabold px-3 py-2 rounded-xl flex items-center gap-1.5 transition active:scale-95 text-[11px]"
            >
              <Clock className="w-4 h-4" /> Tutup Shift & Kas
            </button>
          </div>
        </div>

        {/* Catalog Search Bar */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input
            ref={searchInputRef}
            autoFocus
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && searchQuery.trim().length > 0) {
                if (filteredCatalog.length > 0) {
                  addToCart(filteredCatalog[0]);
                  setSearchQuery("");
                }
              }
            }}
            placeholder="Cari produk (Nama atau SKU / Barcode)..."
            className="w-full bg-slate-50 border border-slate-200 pl-10 pr-9 py-2.5 rounded-xl text-sm placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition font-semibold"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                searchInputRef.current?.focus();
              }}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full transition"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Catalog Items Grid */}
        <div className="flex-1 overflow-y-auto min-h-0 pr-1">
          {filteredCatalog.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {filteredCatalog.map(item => {
                const isOutOfStock = item.is_inventory && item.stock_quantity <= 0;
                const isLowStock = item.is_inventory && item.stock_quantity <= 5; // Default safe buffer visual warning
                
                return (
                  <button
                    key={item.id}
                    disabled={isOutOfStock}
                    onClick={() => addToCart(item)}
                    className={`flex flex-col text-left p-3.5 border rounded-2xl transition relative hover:shadow-md hover:border-blue-300 active:scale-95 group ${
                      isOutOfStock 
                        ? "bg-slate-50 border-slate-100 opacity-50 cursor-not-allowed" 
                        : "bg-white border-slate-200"
                    }`}
                  >
                    {item.is_inventory && (
                      <span className={`absolute top-2.5 right-2.5 text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                        isOutOfStock 
                          ? "bg-rose-50 border-rose-100 text-rose-600" 
                          : isLowStock 
                            ? "bg-amber-50 border-amber-100 text-amber-600" 
                            : "bg-slate-50 border-slate-100 text-slate-500"
                      }`}>
                        Stok: {item.stock_quantity}
                      </span>
                    )}

                    <div className="font-bold text-slate-900 text-[13px] leading-tight group-hover:text-blue-600 transition pr-8 mt-2.5">
                      {item.name}
                    </div>
                    
                    <div className="text-[10px] text-slate-400 font-medium mt-1 flex flex-wrap items-center gap-1.5 uppercase">
                      <span>Satuan: {item.unit}</span>
                      {item.sku && (
                        <span className="bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded text-[9px] font-mono font-bold tracking-tight">
                          SKU: {item.sku}
                        </span>
                      )}
                    </div>

                    <div className="text-sm font-extrabold text-blue-600 mt-auto pt-3">
                      {formatCurrency(item.unit_price)}
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-20 text-slate-400 font-medium">
              <Package className="w-12 h-12 mx-auto text-slate-200 mb-2" />
              <p>Tidak ada produk ditemukan</p>
            </div>
          )}
        </div>

      </div>

      {/* RIGHT COLUMN: Cart & Checkout (lg:col-span-5) */}
      <div className={`${activeTab === "cart" ? "flex" : "hidden"} lg:flex lg:col-span-5 flex-col min-h-0 lg:h-full bg-white border border-slate-200 rounded-2xl p-4 shadow-sm pb-32 lg:pb-4`}>
        
        {/* Mobile Header: Back to Catalog */}
        <div className="lg:hidden flex items-center gap-2 mb-3 pb-2 border-b border-slate-100">
          <button 
            type="button" 
            onClick={() => setActiveTab("catalog")}
            className="p-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 transition"
          >
            <ArrowLeft className="w-4 h-4 text-slate-600" />
          </button>
          <span className="font-extrabold text-sm text-slate-800">Keranjang Kasir</span>
        </div>
        
        {/* Customer Selector Section */}
        <div className="relative pb-3 border-b border-slate-100">
          <label className="text-[10px] text-slate-400 block uppercase font-bold tracking-wider mb-1.5">
            Pelanggan (Membership & Poin)
          </label>
          <div className="flex gap-2">
            {selectedCustomer ? (
              <div className="flex-1 bg-blue-50 border border-blue-100 text-blue-800 px-3.5 py-2 rounded-xl flex items-center justify-between">
                <div>
                  <div className="font-bold text-xs">{selectedCustomer.name}</div>
                  <div className="text-[10px] text-blue-600 font-bold flex items-center gap-1 mt-0.5">
                    <Award className="w-3.5 h-3.5" />
                    <span>{selectedCustomer.loyalty_points} Poin Aktif</span>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    setSelectedCustomer(null);
                    setPointsToRedeem(0);
                  }}
                  className="text-blue-500 hover:text-blue-700 transition"
                >
                  <X className="w-4.5 h-4.5" />
                </button>
              </div>
            ) : (
              <div className="flex-1 relative">
                <input
                  type="text"
                  placeholder="Cari member / ketik nama..."
                  value={customerSearchQuery}
                  onChange={(e) => {
                    setCustomerSearchQuery(e.target.value);
                    setShowCustomerDropdown(true);
                  }}
                  onFocus={() => setShowCustomerDropdown(true)}
                  className="w-full bg-slate-50 border border-slate-200 px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-blue-500 focus:bg-white text-xs font-semibold"
                />
                
                {/* Customers Dropdown list */}
                {showCustomerDropdown && (
                  <div className="absolute top-11 left-0 right-0 bg-white border border-slate-200 rounded-xl shadow-xl z-50 max-h-48 overflow-y-auto">
                    {filteredCustomers.length > 0 ? (
                      filteredCustomers.map(c => (
                        <button
                          key={c.id}
                          onClick={() => {
                            setSelectedCustomer(c);
                            setShowCustomerDropdown(false);
                            setCustomerSearchQuery("");
                          }}
                          className="w-full text-left px-4 py-2 hover:bg-slate-50 border-b border-slate-100 last:border-none flex items-center justify-between text-xs"
                        >
                          <div>
                            <span className="font-bold text-slate-800 block">{c.name}</span>
                            <span className="text-[10px] text-slate-400">{c.phone || "Tanpa Telepon"}</span>
                          </div>
                          <span className="bg-amber-50 text-amber-600 border border-amber-100 font-bold text-[9px] px-2 py-0.5 rounded-full shrink-0">
                            {c.loyalty_points} Poin
                          </span>
                        </button>
                      ))
                    ) : (
                      <div className="p-3.5 text-center text-slate-400">
                        Tidak ada pelanggan terdaftar.
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
            
            <button
              onClick={() => setShowAddCustomerModal(true)}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold px-3 py-2 rounded-xl transition flex items-center gap-1 shrink-0"
              title="Tambah Pelanggan Baru"
            >
              <Plus className="w-4 h-4" /> Member
            </button>
          </div>
        </div>

        {/* Cart Item List */}
        <div className="flex-1 overflow-y-auto min-h-[180px] lg:min-h-0 py-3 space-y-2 border-b border-slate-100 pr-1">
          {cart.length > 0 ? (
            cart.map(c => (
              <div key={c.item.id} className="flex items-center gap-3 bg-slate-50/50 border border-slate-150 p-2.5 rounded-xl">
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-slate-800 truncate text-[11px]">{c.item.name}</div>
                  <div className="text-[10px] text-slate-500 font-semibold mt-0.5">
                    {formatCurrency(c.item.unit_price)} / {c.item.unit}
                  </div>
                </div>

                {/* Adjuster */}
                <div className="flex items-center border border-slate-200 rounded-lg bg-white overflow-hidden shadow-sm shrink-0">
                  <button 
                    onClick={() => updateQuantity(c.item.id, c.quantity - 1)}
                    className="p-1.5 hover:bg-slate-50 text-slate-500 transition"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="w-8 text-center text-xs font-extrabold text-slate-800">{c.quantity}</span>
                  <button 
                    onClick={() => updateQuantity(c.item.id, c.quantity + 1)}
                    className="p-1.5 hover:bg-slate-50 text-slate-500 transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="text-right shrink-0 min-w-[70px] text-xs font-bold text-slate-900">
                  {formatCurrency(c.item.unit_price * c.quantity)}
                </div>

                <button 
                  onClick={() => removeFromCart(c.item.id)}
                  className="text-slate-400 hover:text-rose-500 transition shrink-0 p-1"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-1.5 font-medium py-12">
              <ShoppingCart className="w-10 h-10 text-slate-200" />
              <p>Keranjang kasir masih kosong</p>
            </div>
          )}
        </div>

        {/* Loyalty Point Redemption */}
        {selectedCustomer && selectedCustomer.loyalty_points > 0 && subtotal > 0 && (
          <div className="py-3 border-b border-slate-100 bg-amber-50/50 -mx-4 px-4 space-y-2">
            <div className="flex items-center justify-between text-[11px] font-bold text-amber-850">
              <span className="flex items-center gap-1">
                <Award className="w-4 h-4 text-amber-600 animate-bounce" />
                Gunakan Poin Loyalitas?
              </span>
              <span className="text-[10px] text-slate-500">1 Poin = Rp 100</span>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min="0"
                max={Math.min(selectedCustomer.loyalty_points, Math.floor(subtotal / 100))}
                value={pointsToRedeem || ""}
                onChange={(e) => handlePointsChange(e.target.value)}
                placeholder={`Maksimal ${Math.min(selectedCustomer.loyalty_points, Math.floor(subtotal / 100))} Poin`}
                className="w-full bg-white border border-slate-200 px-3 py-1.5 rounded-xl focus:outline-none focus:border-amber-500 text-xs font-bold font-mono text-right"
              />
              <span className="text-xs font-extrabold text-amber-600 shrink-0 min-w-[70px] text-right">
                -{formatCurrency(loyaltyDiscount)}
              </span>
            </div>
          </div>
        )}

        {/* Billing Checkout Summary */}
        <div className="py-4 space-y-3">
          <div className="flex justify-between items-center text-xs font-bold text-slate-500">
            <span>Subtotal</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>

          {loyaltyDiscount > 0 && (
            <div className="flex justify-between items-center text-xs font-bold text-amber-600">
              <span>Diskon Poin Loyalty</span>
              <span>-{formatCurrency(loyaltyDiscount)}</span>
            </div>
          )}

          <div className="flex justify-between items-center text-base font-extrabold text-slate-900 border-t border-slate-100 pt-3">
            <span>Total Tagihan</span>
            <span className="text-xl text-blue-600 font-black">{formatCurrency(finalTotal)}</span>
          </div>

          {/* Payment Method Selector */}
          <div className="space-y-1.5 pt-2">
            <label className="text-[10px] text-slate-400 block uppercase font-bold tracking-wider">
              Metode Pembayaran
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { key: "Cash", label: "Tunai / Cash", icon: DollarSign },
                { key: "Bank Transfer", label: "Transfer Bank", icon: CreditCard },
                { key: "QRIS", label: "QRIS Manual", icon: Smartphone }
              ].map((btn) => (
                <button
                  key={btn.key}
                  type="button"
                  onClick={() => setPaymentMethod(btn.key as any)}
                  className={`py-2 px-1 rounded-xl text-[10px] font-bold border transition flex flex-col items-center justify-center gap-1 text-center ${
                    paymentMethod === btn.key
                      ? "bg-blue-600 border-blue-600 text-white shadow-sm font-extrabold"
                      : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <btn.icon className="w-4 h-4 shrink-0" />
                  <span>{btn.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Cash Received Field (Only for Cash payments) */}
          {paymentMethod === "Cash" && finalTotal > 0 && (
            <div className="space-y-2 pt-2">
              {/* Quick Cash Buttons */}
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setCashReceived(finalTotal.toString())}
                  className="px-2.5 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100 font-extrabold text-[11px] rounded-lg transition active:scale-95 flex items-center gap-1 shadow-2xs"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" /> Uang Pas ({formatCurrency(finalTotal)})
                </button>
                {[
                  Math.ceil(finalTotal / 10000) * 10000,
                  Math.ceil(finalTotal / 50000) * 50000,
                  100000
                ]
                  .filter((val, idx, self) => val >= finalTotal && self.indexOf(val) === idx)
                  .map((amount) => (
                    <button
                      key={amount}
                      type="button"
                      onClick={() => setCashReceived(amount.toString())}
                      className="px-2 py-1 bg-slate-100 border border-slate-200 text-slate-700 hover:bg-slate-200 font-bold text-[10px] rounded-lg transition active:scale-95 font-mono"
                    >
                      {formatCurrency(amount)}
                    </button>
                  ))}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 block uppercase font-bold tracking-wider">
                    Uang Diterima (Rp)
                  </label>
                  <input
                    type="number"
                    required
                    min={finalTotal}
                    value={cashReceived}
                    onChange={(e) => setCashReceived(e.target.value)}
                    placeholder="e.g. 50000"
                    className="w-full bg-white border border-slate-200 px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-blue-500 font-bold text-right font-mono text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 block uppercase font-bold tracking-wider">
                    Uang Kembalian
                  </label>
                  <div className={`w-full border px-3 py-2.5 rounded-xl text-right font-extrabold font-mono text-xs ${
                    changeAmount < 0 ? "bg-rose-50 border-rose-100 text-rose-600" : "bg-slate-50 border-slate-200 text-slate-700"
                  }`}>
                    {changeAmount >= 0 ? formatCurrency(changeAmount) : "Uang Kurang"}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Checkout Notes */}
          <div className="space-y-1 pt-1">
            <label className="text-[10px] text-slate-400 block uppercase font-bold tracking-wider">
              Keterangan Transaksi (Opsional)
            </label>
            <input
              type="text"
              value={checkoutNotes}
              onChange={(e) => setCheckoutNotes(e.target.value)}
              placeholder="Keterangan tambahan..."
              className="w-full bg-slate-50 border border-slate-200 px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-blue-500 focus:bg-white text-xs font-semibold"
            />
          </div>

          {/* Checkout Submit Button */}
          <button
            type="button"
            disabled={cart.length === 0 || submitting}
            onClick={handleCheckout}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-extrabold py-3.5 rounded-xl transition shadow-md active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed text-sm mt-3"
          >
            {submitting ? "Memproses Checkout..." : `BAYAR SEKARANG (${formatCurrency(finalTotal)})`}
          </button>
        </div>

      </div>

      {/* MODAL 1: Tutup Shift (Rekonsiliasi Kas) */}
      {showCloseShiftModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col text-xs font-semibold">
            
            <div className="p-5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-950 flex items-center gap-1.5">
                <Clock className="w-4.5 h-4.5 text-rose-600" />
                Tutup Shift & Rekonsiliasi Kas
              </h3>
              <button onClick={() => setShowCloseShiftModal(false)} className="text-slate-400 hover:text-slate-600 transition">
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            {errorMsg && (
              <div className="mx-5 mt-4 bg-rose-50 border border-rose-100 text-rose-650 p-2.5 rounded-xl flex items-start gap-1.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleCloseShift} className="p-5 space-y-4">
              <div className="space-y-1">
                <label className="text-slate-500">Estimasi Saldo Kas (Di Sistem - Rp)</label>
                <div className="w-full bg-slate-100 border border-slate-200 px-3.5 py-2.5 rounded-xl text-slate-800 font-extrabold text-right text-sm font-mono">
                  {formatCurrency(Number(activeShift.expected_closing_cash || 0))}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-500">Saldo Kas Aktual / Uang Masuk</label>
                <input 
                  type="number" 
                  min="0"
                  required
                  value={actualClosingCashInput}
                  onChange={(e) => setActualClosingCashInput(e.target.value)}
                  className="w-full bg-white border border-slate-200 px-3.5 py-2.5 rounded-xl text-slate-900 focus:outline-none focus:border-blue-500 font-extrabold text-right text-sm font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-500">Catatan Tutup Shift (Opsional)</label>
                <textarea 
                  rows={2}
                  value={closingNotes}
                  onChange={(e) => setClosingNotes(e.target.value)}
                  placeholder="e.g. Kas pas, shift selesai lancar."
                  className="w-full bg-white border border-slate-200 px-3 py-2 rounded-xl text-slate-800 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="border-t border-slate-150 pt-4 flex gap-2 justify-end -mx-5 -mb-5 p-5 bg-slate-50">
                <button
                  type="button"
                  onClick={() => setShowCloseShiftModal(false)}
                  className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold px-4 py-2 rounded-xl transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-rose-600 hover:bg-rose-700 text-white font-extrabold px-5 py-2 rounded-xl shadow-sm transition active:scale-95 disabled:opacity-50"
                >
                  {submitting ? "Menutup Shift..." : "Tutup Shift Sekarang"}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* MODAL 2: Receipt / Cetak Struk */}
      {showReceiptModal && lastInvoice && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col text-xs font-semibold">
            
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-950 flex items-center gap-1.5">
                <Check className="w-5 h-5 text-emerald-500 bg-emerald-50 border border-emerald-100 rounded-full p-0.5" />
                Transaksi Sukses
              </h3>
              <button onClick={() => setShowReceiptModal(false)} className="text-slate-400 hover:text-slate-600 transition">
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            {/* Printable Receipt Components (Thermal & A4) */}
            <style dangerouslySetInnerHTML={{ __html: `
              @media print {
                @page {
                  ${printMode === 'thermal' ? 'size: 58mm auto; margin: 0;' : 'size: A4; margin: 15mm;'}
                }
                body * {
                  visibility: hidden !important;
                }
                .no-print, header, nav, aside, footer {
                  display: none !important;
                }
                ${printMode === 'thermal' ? `
                  #pos-print-area-thermal, #pos-print-area-thermal * {
                    visibility: visible !important;
                  }
                  #pos-print-area-thermal {
                    display: block !important;
                    position: fixed !important;
                    left: 0 !important;
                    top: 0 !important;
                    width: 48mm !important;
                    max-width: 48mm !important;
                    padding: 4px !important;
                    margin: 0 !important;
                    background: white !important;
                    color: black !important;
                    font-family: monospace, "Courier New", Courier !important;
                    font-size: 9px !important;
                    line-height: 1.2 !important;
                    box-sizing: border-box !important;
                    z-index: 99999999 !important;
                  }
                  #pos-print-area-a4 {
                    display: none !important;
                  }
                ` : `
                  #pos-print-area-a4, #pos-print-area-a4 * {
                    visibility: visible !important;
                  }
                  #pos-print-area-a4 {
                    display: block !important;
                    position: absolute !important;
                    left: 0 !important;
                    top: 0 !important;
                    width: 100% !important;
                    background: white !important;
                    color: #0f172a !important;
                    font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
                    z-index: 99999999 !important;
                  }
                  #pos-print-area-thermal {
                    display: none !important;
                  }
                `}
              }
            ` }} />

            {/* Hidden thermal print DOM container */}
            <div id="pos-print-area-thermal" className="hidden print:block font-mono text-[11px]">
              <div className="text-center border-b border-dashed border-slate-400 pb-3 mb-3">
                <div className="text-sm font-bold uppercase">{activeBusiness?.name}</div>
                <div>{activeBusiness?.address || "Jakarta, Indonesia"}</div>
                <div>Telp: {activeBusiness?.phone || "-"}</div>
              </div>

              <div className="space-y-0.5 border-b border-dashed border-slate-400 pb-2 mb-2">
                <div className="flex justify-between"><span>No Nota:</span><span className="font-bold">{lastInvoice.invoice_number}</span></div>
                <div className="flex justify-between"><span>Tanggal:</span><span>{new Date().toLocaleDateString("id-ID")}</span></div>
                <div className="flex justify-between"><span>Kasir:</span><span>{employee.name}</span></div>
                <div className="flex justify-between"><span>Pelanggan:</span><span>{lastInvoice.customerName}</span></div>
              </div>

              <div className="border-b border-dashed border-slate-400 pb-2 mb-2">
                <div className="flex justify-between font-bold pb-1"><span>Produk</span><span>Total</span></div>
                {lastInvoice.items.map((c: any) => (
                  <div key={c.item.id} className="mb-1">
                    <div className="font-bold">{c.item.name}</div>
                    <div className="flex justify-between text-[10px]">
                      <span>{c.quantity} x {formatCurrency(c.item.unit_price)}</span>
                      <span>{formatCurrency(c.item.unit_price * c.quantity)}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-0.5 border-b border-dashed border-slate-400 pb-2 mb-2">
                <div className="flex justify-between"><span>Subtotal:</span><span>{formatCurrency(lastInvoice.subtotal)}</span></div>
                {lastInvoice.discount_amount > 0 && (
                  <div className="flex justify-between font-bold">
                    <span>Diskon Poin:</span>
                    <span>-{formatCurrency(lastInvoice.discount_amount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-xs pt-1 border-t border-dashed border-slate-300">
                  <span>TOTAL:</span>
                  <span>{formatCurrency(lastInvoice.total_amount)}</span>
                </div>
              </div>

              <div className="space-y-0.5 border-b border-dashed border-slate-400 pb-2 mb-3">
                <div className="flex justify-between"><span>Metode Bayar:</span><span className="font-bold uppercase">{lastInvoice.payment_methods[0]}</span></div>
                {lastInvoice.payment_methods[0] === "Cash" && (
                  <>
                    <div className="flex justify-between"><span>Uang Diterima:</span><span>{formatCurrency(Number(cashReceived) || lastInvoice.total_amount)}</span></div>
                    <div className="flex justify-between font-bold"><span>Kembalian:</span><span>{formatCurrency(lastInvoice.changeAmount)}</span></div>
                  </>
                )}
              </div>

              <div className="text-center pt-2 text-[10px]">
                Terima kasih atas kunjungan Anda!<br />
                Struk ini adalah bukti pembayaran sah.
              </div>
            </div>

            {/* Hidden A4 print DOM container */}
            <div id="pos-print-area-a4" className="hidden print:block text-slate-900 text-sm">
              <div className="flex justify-between items-start border-b-2 border-slate-900 pb-6 mb-6">
                <div>
                  <h1 className="text-2xl font-black tracking-tight text-slate-900 uppercase">{activeBusiness?.name || "FAKTUR ONLINE"}</h1>
                  <p className="text-slate-600 mt-1">{activeBusiness?.address || "Jakarta, Indonesia"}</p>
                  <p className="text-slate-600">Telp/HP: {activeBusiness?.phone || "-"}</p>
                </div>
                <div className="text-right">
                  <span className="inline-block bg-slate-900 text-white font-extrabold px-3 py-1 text-xs tracking-wider uppercase rounded mb-2">Faktur / Nota POS</span>
                  <h2 className="text-lg font-bold text-slate-800">{lastInvoice.invoice_number}</h2>
                  <p className="text-slate-500 text-xs mt-0.5">Tanggal: {new Date().toLocaleDateString("id-ID", { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6 mb-6 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
                <div>
                  <span className="text-slate-500 block font-semibold mb-1 uppercase text-[10px]">Informasi Kasir:</span>
                  <p className="font-bold text-slate-800">{employee.name}</p>
                  <p className="text-slate-600">Shift / POS Terminal</p>
                </div>
                <div>
                  <span className="text-slate-500 block font-semibold mb-1 uppercase text-[10px]">Pelanggan:</span>
                  <p className="font-bold text-slate-800">{lastInvoice.customerName}</p>
                  <p className="text-slate-600">Status Pembayaran: <span className="font-bold text-emerald-600 uppercase">LUNAS</span></p>
                </div>
              </div>

              <table className="w-full text-left border-collapse mb-6 text-xs">
                <thead>
                  <tr className="border-b-2 border-slate-900 text-slate-900 font-extrabold uppercase tracking-wide">
                    <th className="py-2.5 px-2">No</th>
                    <th className="py-2.5 px-2">Nama Barang / Produk</th>
                    <th className="py-2.5 px-2 text-right">Harga Satuan</th>
                    <th className="py-2.5 px-2 text-center">Jumlah</th>
                    <th className="py-2.5 px-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {lastInvoice.items.map((c: any, idx: number) => (
                    <tr key={c.item.id} className="text-slate-800">
                      <td className="py-2.5 px-2 text-slate-500">{idx + 1}</td>
                      <td className="py-2.5 px-2 font-bold">{c.item.name}</td>
                      <td className="py-2.5 px-2 text-right">{formatCurrency(c.item.unit_price)}</td>
                      <td className="py-2.5 px-2 text-center">{c.quantity}</td>
                      <td className="py-2.5 px-2 text-right font-semibold">{formatCurrency(c.item.unit_price * c.quantity)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="flex justify-between items-start pt-2">
                <div className="w-1/2 pr-6 text-xs text-slate-500 space-y-4">
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <p className="font-semibold text-slate-700 mb-1">Catatan Pembayaran:</p>
                    <p>Metode Bayar: <span className="font-bold uppercase text-slate-900">{lastInvoice.payment_methods[0]}</span></p>
                    {lastInvoice.payment_methods[0] === "Cash" && (
                      <>
                        <p>Tunai Diterima: {formatCurrency(Number(cashReceived) || lastInvoice.total_amount)}</p>
                        <p>Kembalian: {formatCurrency(lastInvoice.changeAmount)}</p>
                      </>
                    )}
                  </div>
                  <p className="italic text-[11px]">Terima kasih atas kepercayaan Anda bertransaksi bersama kami.</p>
                </div>

                <div className="w-1/2 max-w-xs space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-slate-150">
                    <span className="text-slate-600">Subtotal</span>
                    <span className="font-bold text-slate-800">{formatCurrency(lastInvoice.subtotal)}</span>
                  </div>
                  {lastInvoice.discount_amount > 0 && (
                    <div className="flex justify-between py-1 border-b border-slate-150 text-rose-600">
                      <span>Diskon Poin ({lastInvoice.loyalty_points_redeemed} Pts)</span>
                      <span className="font-bold">-{formatCurrency(lastInvoice.discount_amount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between py-2 border-b-2 border-slate-900 font-black text-base text-slate-900">
                    <span>TOTAL</span>
                    <span>{formatCurrency(lastInvoice.total_amount)}</span>
                  </div>
                </div>
              </div>

              <div className="mt-16 pt-6 border-t border-slate-200 flex justify-between text-center text-xs text-slate-600">
                <div className="w-40">
                  <p className="mb-14">Hormat Kami,</p>
                  <p className="font-bold border-t border-slate-400 pt-1">{activeBusiness?.name}</p>
                </div>
                <div className="w-40">
                  <p className="mb-14">Pelanggan,</p>
                  <p className="font-bold border-t border-slate-400 pt-1">{lastInvoice.customerName}</p>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-4 bg-slate-50 border-t border-slate-150 flex flex-wrap sm:flex-nowrap gap-2 justify-end">
              <button
                type="button"
                onClick={() => {
                  setPrintMode("thermal");
                  setTimeout(() => window.print(), 100);
                }}
                className="flex-1 bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 font-bold px-3 py-2.5 rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition active:scale-95 text-xs"
              >
                <Printer className="w-4 h-4 text-slate-600" /> Cetak Thermal
              </button>

              <button
                type="button"
                onClick={() => {
                  setPrintMode("a4");
                  setTimeout(() => window.print(), 100);
                }}
                className="flex-1 bg-slate-800 border border-slate-900 text-white hover:bg-slate-900 font-bold px-3 py-2.5 rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition active:scale-95 text-xs"
              >
                <FileText className="w-4 h-4 text-blue-400" /> Cetak PDF (A4)
              </button>

              <button
                type="button"
                onClick={() => setShowReceiptModal(false)}
                className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-extrabold px-4 py-2.5 rounded-xl shadow-sm transition active:scale-95 text-xs"
              >
                Selesai / Transaksi Baru
              </button>
            </div>

          </div>
        </div>
      )}

      {/* MODAL 3: Tambah Pelanggan Baru (Membership) */}
      {showAddCustomerModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col text-xs font-semibold">
            
            <div className="p-5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-950 flex items-center gap-1.5">
                <User className="w-4.5 h-4.5 text-blue-600" />
                Registrasi Pelanggan Baru (Member)
              </h3>
              <button onClick={() => setShowAddCustomerModal(false)} className="text-slate-400 hover:text-slate-600 transition">
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            {errorMsg && (
              <div className="mx-5 mt-4 bg-rose-50 border border-rose-100 text-rose-650 p-2.5 rounded-xl flex items-start gap-1.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleAddCustomer} className="p-5 space-y-4">
              <div className="space-y-1">
                <label className="text-slate-500">Nama Lengkap Pelanggan *</label>
                <input 
                  type="text" 
                  required
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  placeholder="e.g. Budi Santoso"
                  className="w-full bg-white border border-slate-200 px-3.5 py-2.5 rounded-xl text-slate-800 focus:outline-none focus:border-blue-500 shadow-sm font-bold"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-500">Nomor Telepon / WhatsApp</label>
                <input 
                  type="tel" 
                  value={newCustPhone}
                  onChange={(e) => setNewCustPhone(e.target.value)}
                  placeholder="e.g. 08129938820"
                  className="w-full bg-white border border-slate-200 px-3.5 py-2.5 rounded-xl text-slate-800 focus:outline-none focus:border-blue-500 shadow-sm"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-500">Alamat Email (Opsional)</label>
                <input 
                  type="email" 
                  value={newCustEmail}
                  onChange={(e) => setNewCustEmail(e.target.value)}
                  placeholder="e.g. budi@gmail.com"
                  className="w-full bg-white border border-slate-200 px-3.5 py-2.5 rounded-xl text-slate-800 focus:outline-none focus:border-blue-500 shadow-sm"
                />
              </div>

              <div className="border-t border-slate-150 pt-4 flex gap-2 justify-end -mx-5 -mb-5 p-5 bg-slate-50">
                <button
                  type="button"
                  onClick={() => setShowAddCustomerModal(false)}
                  className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold px-4 py-2 rounded-xl transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold px-5 py-2 rounded-xl shadow-sm transition active:scale-95 disabled:opacity-50"
                >
                  {submitting ? "Mendaftarkan..." : "Daftar Member"}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}
      {/* Floating mobile bottom cart bar */}
      {cart.length > 0 && activeTab === "catalog" && (
        <div 
          onClick={() => setActiveTab("cart")}
          className="lg:hidden fixed bottom-20 left-4 right-4 bg-blue-600 text-white p-4 rounded-2xl flex items-center justify-between shadow-lg shadow-blue-500/30 z-40 transition-all duration-350 transform active:scale-[0.98] cursor-pointer hover:bg-blue-700 hover:shadow-xl"
        >
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 shrink-0 animate-bounce" />
            <div>
              <div className="font-bold text-xs">{cart.reduce((sum, c) => sum + c.quantity, 0)} Item</div>
              <div className="text-[10px] text-blue-100 font-bold">{formatCurrency(finalTotal)}</div>
            </div>
          </div>
          <div className="bg-white text-blue-600 px-3.5 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1 transition shrink-0">
            <span>Lihat Keranjang</span>
            <ChevronRight className="w-4 h-4" />
          </div>
        </div>
      )}

      </div>
    </div>
  );
}
