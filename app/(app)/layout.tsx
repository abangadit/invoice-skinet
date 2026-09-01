"use client";

import React, { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { 
  FileText, 
  Users, 
  ChevronDown, 
  Bell, 
  Menu, 
  Briefcase,
  Layers,
  Plus,
  CreditCard,
  TrendingUp,
  Settings,
  FileSpreadsheet,
  Building2,
  LogOut,
  ChevronRight,
  Globe,
  Clock,
  Download,
  X,
  Truck,
  Package,
  Wallet,
  BookOpen,
  Grid,
  ClipboardCheck,
  Percent,
  Calendar,
  ShoppingCart,
  AlertCircle,
  Lock,
  FileCheck,
  Target,
  Shield,
  UserCog,
  Crown,
  Sparkles,
  HelpCircle
} from "lucide-react";
import { createWebBrowserClient } from "../../lib/supabase/client";
import { BusinessProvider, useBusiness } from "../../lib/context/BusinessContext";
import { useLanguage } from "../../lib/context/LanguageContext";
import Logo from "../../components/Logo";

function checkPathPermission(path: string, role: string | null, permissions: any = {}, isEmployee: boolean = false): boolean {
  if (!role) return true;
  const cleanPath = path.split('?')[0].split('#')[0];
  
  if (cleanPath === "/unauthorized") return true;
  if (role === 'owner' || role === 'admin') return true;

  const match = (prefix: string) => cleanPath === prefix || cleanPath.startsWith(prefix + '/');

  const getMenuKey = (): string | null => {
    if (cleanPath === "/") return "dashboard";
    if (match("/project")) return "project";
    if (match("/invoice")) return "invoice";
    if (match("/quotation")) return "quotation";
    if (match("/customer")) return "customer";
    if (match("/payment")) return "payment";
    if (match("/catalog")) return "catalog";
    if (match("/vendor")) return "vendor";
    if (match("/sales")) return "sales";
    if (match("/delivery")) return "delivery";
    if (match("/purchase")) return "purchase";
    if (match("/inventory")) return "inventory";
    if (match("/pos")) return "pos";
    if (match("/employees/leave")) return "employee_leave";
    if (match("/employees/reimbursement")) return "employee_reimbursement";
    if (match("/employees/attendance")) return "employee_attendance";
    if (match("/employees/payslips")) return "employee_payslips";
    if (match("/employees")) return "employees";
    if (match("/payroll")) return "payroll";
    if (match("/accounts")) return "accounts";
    if (match("/expenses")) return "expenses";
    if (match("/ledger")) return "ledger";
    if (match("/reports")) return "reports";
    if (match("/tax")) return "tax";
    if (match("/assets")) return "assets";
    if (match("/report")) return "report";
    if (match("/settings/security")) return "settings_security";
    if (match("/settings")) return "settings";
    if (match("/help")) return "help";
    if (match("/admin")) return "admin";
    return null;
  };

  const menuKey = getMenuKey();
  if (!menuKey || menuKey === "help") return true;

  if (["employee_attendance", "employee_payslips"].includes(menuKey)) {
    return true;
  }

  if (isEmployee && ["employee_leave", "employee_reimbursement", "employee_attendance", "employee_payslips", "pos", "settings_security"].includes(menuKey)) {
    return true;
  }

  if (role === 'employee') {
    const allowed = ["dashboard", "employee_leave", "employee_reimbursement", "employee_attendance", "employee_payslips", "pos", "settings_security"];
    return allowed.includes(menuKey);
  }

  if (role === 'custom') {
    return !!permissions?.[menuKey];
  }

  // Superadmin selalu boleh akses semua termasuk /admin
  if (role === 'superadmin') return true;

  const rolePresets: Record<string, string[]> = {
    sales: ["dashboard", "invoice", "quotation", "customer", "sales", "delivery", "catalog", "pos", "project"],
    purchasing: ["dashboard", "vendor", "purchase", "inventory", "catalog"],
    warehouse: ["dashboard", "catalog", "inventory", "delivery"],
    finance: ["dashboard", "invoice", "payment", "accounts", "expenses", "ledger", "reports", "tax", "assets", "pos", "project"]
  };

  const allowedMenus = rolePresets[role] || [];
  return allowedMenus.includes(menuKey);
}

function AppLayoutInner({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { activeBusiness, businesses, userRole, systemRole, userPermissions, loading, setActiveBusiness, isEmployee, userEmail, userFullName } = useBusiness();
  const { locale, setLocale, t } = useLanguage();
  const [showBusinessDropdown, setShowBusinessDropdown] = useState(false);
  const [showLangDropdown, setShowLangDropdown] = useState(false);
  const [pendingProofsCount, setPendingProofsCount] = useState(0);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [isSidebarHidden, setIsSidebarHidden] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("skinet_sidebar_hidden");
      if (saved === "true") setIsSidebarHidden(true);
    } catch (e) {}
  }, []);

  // Notification states
  interface NotificationItem {
    id: string;
    title: string;
    message: string;
    type: string;
    reference_id: string | null;
    is_read: boolean;
    created_at: string;
  }
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadNotifsCount, setUnreadNotifsCount] = useState(0);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);

  const fetchNotifications = async () => {
    if (!activeBusiness) return;
    try {
      const supabase = createWebBrowserClient();
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("business_id", activeBusiness.id)
        .eq("user_id", userData.user.id)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      setNotifications(data || []);
      setUnreadNotifsCount((data || []).filter((n: any) => !n.is_read).length);
    } catch (err) {
      console.error("Error fetching notifications:", err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [activeBusiness]);

  const handleMarkNotifAsRead = async (id: string, refId: string | null, type: string) => {
    try {
      const supabase = createWebBrowserClient();
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", id);

      if (error) throw error;
      await fetchNotifications();
      setShowNotifDropdown(false);

      if (type === "leave_request") {
        router.push("/employees/leave?tab=admin");
      } else if (type === "expense_claim") {
        router.push("/employees/reimbursement");
      }
    } catch (err) {
      console.error("Error marking notification as read:", err);
    }
  };

  const handleMarkAllNotifsAsRead = async () => {
    if (notifications.length === 0 || !activeBusiness) return;
    try {
      const supabase = createWebBrowserClient();
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("business_id", activeBusiness.id)
        .eq("user_id", userData.user.id)
        .eq("is_read", false);

      if (error) throw error;
      await fetchNotifications();
    } catch (err) {
      console.error("Error marking all notifications as read:", err);
    }
  };

  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    main: true,
    sales: true,
    purchase: true,
    hr: true,
    finance: true,
    reports: true,
    system: true,
  });

  // Load cached sidebar sections state on client-side mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const cached = localStorage.getItem("faktur_online_open_sections");
      if (cached) {
        try {
          setOpenSections(JSON.parse(cached));
        } catch (e) {
          console.error("Failed to parse open sections from cache:", e);
        }
      }
    }
  }, []);

  const toggleSection = (section: string) => {
    setOpenSections(prev => {
      const updated = {
        ...prev,
        [section]: !prev[section]
      };
      if (typeof window !== "undefined") {
        localStorage.setItem("faktur_online_open_sections", JSON.stringify(updated));
      }
      return updated;
    });
  };

  // Page Guard Redirect
  useEffect(() => {
    if (!loading && pathname !== "/unauthorized" && pathname !== "/pricing") {
      if (userRole) {
        const allowed = checkPathPermission(pathname, userRole, userPermissions, isEmployee);
        if (!allowed) {
          router.push("/unauthorized");
          return;
        }
      }

      
    }
  }, [pathname, userRole, userPermissions, loading, router, isEmployee]);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  const fetchPendingProofsCount = React.useCallback(async () => {
    if (!activeBusiness) return;
    try {
      const supabase = createWebBrowserClient();
      
      const { data: invs, error: invError } = await supabase
        .from("invoices")
        .select("id")
        .eq("business_id", activeBusiness.id);

      if (invError) throw invError;
      
      const invIds = invs?.map(i => i.id) || [];
      if (invIds.length === 0) {
        setPendingProofsCount(0);
        return;
      }

      const { count, error: countError } = await supabase
        .from("customer_payment_proofs")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending")
        .in("invoice_id", invIds);

      if (countError) throw countError;

      setPendingProofsCount(count || 0);
    } catch (err) {
      console.error("Error fetching pending proofs count:", err);
    }
  }, [activeBusiness]);

  const fetchLowStockCount = React.useCallback(async () => {
    if (!activeBusiness) return;
    try {
      const supabase = createWebBrowserClient();
      const { data, error } = await supabase
        .from("items")
        .select("stock_quantity, minimum_stock")
        .eq("business_id", activeBusiness.id)
        .eq("is_inventory", true);

      if (error) throw error;

      const lowCount = data?.filter(
        (item: any) => Number(item.stock_quantity || 0) <= Number(item.minimum_stock || 0)
      ).length || 0;

      setLowStockCount(lowCount);
    } catch (err) {
      console.error("Error fetching low stock count:", err);
    }
  }, [activeBusiness]);

  useEffect(() => {
    fetchPendingProofsCount();
    fetchLowStockCount();
  }, [activeBusiness, pathname, fetchPendingProofsCount, fetchLowStockCount]);

  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isAlreadyInstalled, setIsAlreadyInstalled] = useState(false);
  const [showInstallInstructions, setShowInstallInstructions] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const isStandalone = window.matchMedia("(display-mode: standalone)").matches || (window.navigator as any).standalone;
      setIsAlreadyInstalled(!!isStandalone);

      const userAgent = window.navigator.userAgent.toLowerCase();
      setIsIOS(/iphone|ipad|ipod/.test(userAgent));
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallPWA = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`PWA install prompt outcome: ${outcome}`);
    setDeferredPrompt(null);
    setIsInstallable(false);
  };

  const handleInstallClick = () => {
    if (deferredPrompt) {
      handleInstallPWA();
    } else {
      setShowInstallInstructions(true);
    }
  };

  const handleLogout = async () => {
    const supabase = createWebBrowserClient();
    await supabase.auth.signOut();
    router.refresh();
    router.push("/login");
  };

  const isActive = (path: string) => {
    if (path === "/") {
      return pathname === "/";
    }
    if (path === "/pos") {
      return pathname === "/pos";
    }
    if (path === "/invoice") {
      return pathname.startsWith("/invoice") && !pathname.startsWith("/invoice/due");
    }
    if (path === "/employees") {
      return pathname === "/employees";
    }
    return pathname.startsWith(path);
  };

  const linkClass = (path: string) => {
    return `w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold rounded-xl transition ${
      isActive(path)
        ? "bg-blue-50 text-blue-600 font-bold"
        : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"
    }`;
  };

  const renderSidebarLink = (href: string, menuKey: string, icon: React.ReactNode, label: string, badge?: React.ReactNode, isExternal?: boolean) => {
    if (isExternal) {
      return (
        <a href={href} target="_blank" rel="noopener noreferrer" className={linkClass(href)}>
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-3">
              {icon}
              <span>{label}</span>
            </div>
            {badge && <div className="shrink-0">{badge}</div>}
          </div>
        </a>
      );
    }
    return (
      <Link href={href} className={linkClass(href)}>
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-3">
            {icon}
            <span>{label}</span>
          </div>
          {badge && <div className="shrink-0">{badge}</div>}
        </div>
      </Link>
    );
  };

  const showLink = (menuKey: string) => {
    if (loading || !userRole) return false;
    // Admin menu hanya untuk superadmin
    if (menuKey.startsWith("admin_")) {
      return userRole === "superadmin";
    }
    if (menuKey === "pos") {
      return checkPathPermission("/pos", userRole, userPermissions, isEmployee);
    }
    if (["employee_attendance", "employee_payslips"].includes(menuKey)) {
      return true;
    }
    if (menuKey === "employees" && isEmployee) {
      return true;
    }
    if (userRole === "owner" || userRole === "admin" || userRole === "superadmin") return true;
    if (userRole === "employee") {
      return menuKey === "employees";
    }
    if (userRole === "custom") return !!userPermissions?.[menuKey];
    
    const rolePresets: Record<string, string[]> = {
      sales: ["dashboard", "invoice", "quotation", "customer", "sales", "delivery", "catalog", "pos", "reports", "reports_sales"],
      purchasing: ["dashboard", "vendor", "purchase", "inventory", "catalog", "reports", "reports_inventory"],
      warehouse: ["dashboard", "catalog", "inventory", "delivery", "reports", "reports_inventory"],
      finance: ["dashboard", "invoice", "payment", "accounts", "expenses", "ledger", "reports", "tax", "assets", "pos", "reports_sales", "reports_financial"]
    };
    
    return (rolePresets[userRole] || []).includes(menuKey);
  };

  const showHRSection = showLink("employees") || showLink("payroll") || showLink("employee_attendance") || showLink("employee_payslips");
  const showFinanceSection = showLink("accounts") || showLink("expenses") || showLink("ledger") || showLink("tax") || showLink("assets");
  const showReportsSection = showLink("reports") || showLink("reports_sales") || showLink("reports_financial") || showLink("reports_inventory") || showLink("reports_attendance");

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm font-semibold text-slate-500">Memuat profil bisnis...</span>
        </div>
      </div>
    );
  }

  const showMainSection = showLink("dashboard") || showLink("pos");
  const showProjectSection = showLink("project");
  const showSalesSection = showLink("invoice") || showLink("quotation") || showLink("customer") || showLink("payment") || showLink("sales") || showLink("delivery");
  const showPurchaseSection = showLink("inventory") || showLink("purchase") || showLink("vendor") || showLink("catalog");
  const showSystemSection = showLink("settings");
  const showAdminSection = userRole === "superadmin";

  const renderNavigationItems = () => {
    const defaultSections: {
      id: string;
      title: string;
      show: boolean;
      items: {
        id: string;
        menuKey: string;
        href: string;
        icon: React.ReactNode;
        label: string;
        show: boolean;
        badge?: React.ReactNode;
        isExternal?: boolean;
      }[];
    }[] = [
      {
        id: "main",
        title: locale === "en" ? "Overview" : "Menu Utama",
        show: showMainSection,
        items: [
          { id: "dashboard", menuKey: "dashboard", href: "/", icon: <Layers className="w-5 h-5" />, label: t("dashboard"), show: showLink("dashboard") },
          { id: "pos", menuKey: "pos", href: "/pos", icon: <ShoppingCart className="w-5 h-5" />, label: locale === "en" ? "POS (Cashier)" : "POS (Kasir)", show: showLink("pos") },
          { id: "download_pos_apk", menuKey: "download_pos_apk", href: "/api/download/apk", isExternal: true, icon: <Download className="w-5 h-5 text-emerald-600" />, label: locale === "en" ? "Download POS APK" : "Download APK Kasir", show: showLink("pos"), badge: <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700">APK</span> }
        ]
      },
      {
        id: "project",
        title: locale === "en" ? "Projects & Operations" : "Proyek & Operasional",
        show: showProjectSection,
        items: [
          { id: "project", menuKey: "project", href: "/project", icon: <Briefcase className="w-5 h-5" />, label: locale === "en" ? "Projects" : "Manajemen Proyek", show: showLink("project") }
        ]
      },
      {
        id: "sales",
        title: locale === "en" ? "Sales & Receivables" : "Penjualan & Piutang",
        show: showSalesSection,
        items: [
          { id: "leads", menuKey: "sales", href: "/leads", icon: <Target className="w-5 h-5" />, label: locale === "en" ? "Leads & Follow-up" : "Prospek (Leads)", show: true },
          { id: "invoice", menuKey: "invoice", href: "/invoice", icon: <FileText className="w-5 h-5" />, label: t("invoices"), show: showLink("invoice") },
          { id: "invoice_due", menuKey: "invoice", href: "/invoice/due", icon: <Clock className="w-5 h-5" />, label: locale === "en" ? "Due Alerts" : "Nota Jatuh Tempo", show: showLink("invoice") },
          { id: "sales", menuKey: "sales", href: "/sales", icon: <ClipboardCheck className="w-5 h-5" />, label: t("salesOrders"), show: showLink("sales") },
          { id: "delivery", menuKey: "delivery", href: "/delivery", icon: <Truck className="w-5 h-5" />, label: t("deliveryOrders"), show: showLink("delivery") },
          { id: "quotation", menuKey: "quotation", href: "/quotation", icon: <FileSpreadsheet className="w-5 h-5" />, label: t("quotations"), show: showLink("quotation") },
          { id: "customer", menuKey: "customer", href: "/customer", icon: <Users className="w-5 h-5" />, label: t("customers"), show: showLink("customer") },
          { 
            id: "payment", 
            menuKey: "payment", 
            href: "/payment", 
            icon: <CreditCard className="w-5 h-5" />, 
            label: t("payment"), 
            show: showLink("payment"),
            badge: pendingProofsCount > 0 ? (
              <span className="bg-rose-500 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full shrink-0">
                {pendingProofsCount}
              </span>
            ) : undefined 
          }
        ]
      },
      {
        id: "purchase",
        title: locale === "en" ? "Purchasing & Inventory" : "Pembelian & Gudang",
        show: showPurchaseSection,
        items: [
          { id: "inventory", menuKey: "inventory", href: "/inventory", icon: <Package className="w-5 h-5" />, label: t("inventory"), show: showLink("inventory") },
          { id: "stock_out", menuKey: "inventory", href: "/inventory/stock-out", icon: <Package className="w-5 h-5 text-red-500" />, label: locale === "en" ? "Stock Out (No Inv)" : "Barang Keluar", show: showLink("inventory") },
          { id: "purchase", menuKey: "purchase", href: "/purchase", icon: <Truck className="w-5 h-5" />, label: t("purchaseOrders"), show: showLink("purchase") },
          { id: "vendor", menuKey: "vendor", href: "/vendor", icon: <Building2 className="w-5 h-5" />, label: t("vendors"), show: showLink("vendor") },
          { id: "catalog", menuKey: "catalog", href: "/catalog", icon: <Briefcase className="w-5 h-5" />, label: t("catalog"), show: showLink("catalog") }
        ]
      },
      {
        id: "hr",
        title: locale === "en" ? "HR & Payroll" : "SDM & HR",
        show: showHRSection,
        items: [
          { id: "employees", menuKey: "employees", href: "/employees", icon: <Users className="w-5 h-5" />, label: t("employees"), show: showLink("employees") && (userRole === "owner" || userRole === "admin" || userRole === "superadmin") },
          { id: "employee_leave", menuKey: "employee_leave", href: "/employees/leave", icon: <Calendar className="w-5 h-5" />, label: t("leave"), show: showLink("employees") },
          { id: "employee_reimbursement", menuKey: "employee_reimbursement", href: "/employees/reimbursement", icon: <FileText className="w-5 h-5" />, label: t("reimbursements"), show: showLink("employees") },
          { id: "employee_attendance", menuKey: "employee_attendance", href: "/employees/attendance", icon: <ClipboardCheck className="w-5 h-5" />, label: t("attendance"), show: showLink("employee_attendance") },
          { id: "employee_payslips", menuKey: "employee_payslips", href: "/employees/payslips", icon: <Wallet className="w-5 h-5" />, label: locale === "en" ? "My Payslips" : "Slip Gaji Saya", show: showLink("employee_payslips") },
          { id: "payroll", menuKey: "payroll", href: "/payroll", icon: <CreditCard className="w-5 h-5" />, label: t("payroll"), show: showLink("payroll") }
        ]
      },
      {
        id: "finance",
        title: locale === "en" ? "Finance & Accounts" : "Akuntansi & Keuangan",
        show: showFinanceSection,
        items: [
          { id: "accounts", menuKey: "accounts", href: "/accounts", icon: <Grid className="w-5 h-5" />, label: t("chartOfAccounts"), show: showLink("accounts") },
          { id: "expenses", menuKey: "expenses", href: "/expenses", icon: <Wallet className="w-5 h-5" />, label: t("expenses"), show: showLink("expenses") },
          { id: "ledger", menuKey: "ledger", href: "/ledger", icon: <BookOpen className="w-5 h-5" />, label: t("generalLedger"), show: showLink("ledger") },
          { id: "tax", menuKey: "tax", href: "/tax", icon: <Percent className="w-5 h-5" />, label: t("taxExport"), show: false },
          { id: "assets", menuKey: "assets", href: "/assets", icon: <Layers className="w-5 h-5" />, label: t("assets"), show: showLink("assets") }
        ]
      },
      {
        id: "reports",
        title: locale === "en" ? "Business Reports" : "Laporan Bisnis",
        show: showReportsSection,
        items: [
          { id: "reports_hub", menuKey: "reports", href: "/reports", icon: <Grid className="w-5 h-5" />, label: locale === "en" ? "Reports Hub" : "Pusat Laporan", show: showLink("reports") },
          { id: "reports_invoice", menuKey: "reports_sales", href: "/reports/invoice", icon: <FileCheck className="w-5 h-5 text-blue-500" />, label: locale === "en" ? "Invoice Report" : "Laporan Invoice", show: showLink("reports_sales") },
          { id: "reports_sales", menuKey: "reports_sales", href: "/reports/sales", icon: <FileText className="w-5 h-5" />, label: locale === "en" ? "Sales Report" : "Laporan Penjualan", show: showLink("reports_sales") },
          { id: "reports_financial", menuKey: "reports_financial", href: "/reports/financial", icon: <TrendingUp className="w-5 h-5" />, label: locale === "en" ? "Financial Report" : "Laporan Keuangan", show: showLink("reports_financial") },
          { id: "reports_inventory", menuKey: "reports_inventory", href: "/reports/inventory", icon: <Package className="w-5 h-5" />, label: locale === "en" ? "Inventory Valuation" : "Laporan Stok & Gudang", show: showLink("reports_inventory") },
          { id: "reports_attendance", menuKey: "reports_attendance", href: "/reports/attendance", icon: <Clock className="w-5 h-5" />, label: locale === "en" ? "Attendance Report" : "Laporan Absensi", show: showLink("reports_attendance") },
          { id: "reports_pos", menuKey: "reports_sales", href: "/reports/pos", icon: <ClipboardCheck className="w-5 h-5 text-rose-500" />, label: locale === "en" ? "POS Shift Report" : "Laporan POS & Shift", show: showLink("reports_sales") }
        ]
      },
      {
        id: "system",
        title: locale === "en" ? "System" : "Sistem & Pengaturan",
        show: showSystemSection,
        items: [
          
          { id: "settings_security", menuKey: "settings_security", href: "/settings/security", icon: <Lock className="w-5 h-5" />, label: locale === "en" ? "Security & Sessions" : "Keamanan & Sesi", show: true },
          { id: "settings", menuKey: "settings", href: "/settings", icon: <Settings className="w-5 h-5" />, label: t("settings"), show: showLink("settings") },
          { id: "help", menuKey: "help", href: "/help", icon: <HelpCircle className="w-5 h-5 text-blue-600" />, label: locale === "en" ? "Help & Tutorials" : "Pusat Panduan & Tutorial", show: true }
        ]
      },
      {
        id: "management",
        title: "Manajemen Sistem",
        show: showAdminSection,
        items: [
          {
            id: "admin_dashboard",
            menuKey: "admin_dashboard",
            href: "/admin/dashboard",
            icon: <Shield className="w-5 h-5" />,
            label: "Ringkasan Sistem",
            show: showLink("admin_dashboard"),
          },
          {
            id: "admin_users",
            menuKey: "admin_users",
            href: "/admin/users",
            icon: <UserCog className="w-5 h-5" />,
            label: "Kelola Pengguna",
            show: showLink("admin_users"),
          },
        ],
      }
    ];

    let finalSections = [...defaultSections];

    // Apply Owner customization if exists
    if (userRole === "owner" && activeBusiness?.owner_menu_customization) {
      try {
        const customization = activeBusiness.owner_menu_customization;
        if (Array.isArray(customization)) {
          const customizedSections: typeof defaultSections = [];
          
          customization.forEach((customSec: any) => {
            const originalSec = defaultSections.find(s => s.id === customSec.id);
            if (originalSec) {
              const customizedItems: typeof originalSec.items = [];
              if (Array.isArray(customSec.items)) {
                customSec.items.forEach((customItem: any) => {
                  const originalItem = originalSec.items.find(i => i.id === customItem.id);
                  if (originalItem) {
                    customizedItems.push({
                      ...originalItem,
                      show: originalItem.show && (customItem.visible !== false)
                    });
                  }
                });
              }
              
              // Self-healing: append new code-defined items not in database yet
              originalSec.items.forEach(origItem => {
                if (!customizedItems.some(i => i.id === origItem.id)) {
                  customizedItems.push(origItem);
                }
              });

              customizedSections.push({
                ...originalSec,
                show: originalSec.show && (customSec.visible !== false) && customizedItems.some(i => i.show),
                items: customizedItems
              });
            }
          });

          // Self-healing: append new code-defined sections not in database yet
          defaultSections.forEach(origSec => {
            if (!customizedSections.some(s => s.id === origSec.id)) {
              customizedSections.push(origSec);
            }
          });

          finalSections = customizedSections;
        }
      } catch (e) {
        console.error("Failed to parse sidebar menu customization:", e);
      }
    }

    return (
      <div className="flex flex-col gap-3">
        {/* LOGGED IN USER & ROLE BADGE */}
        {userRole === "superadmin" ? (
          <div className="p-3 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl shadow-md border border-indigo-500/30 relative overflow-hidden mb-1">
            <div className="absolute top-0 right-0 -mt-2 -mr-2 w-16 h-16 bg-amber-400/10 rounded-full blur-lg pointer-events-none" />
            <div className="flex items-center gap-2.5 relative z-10">
              <div className="w-9 h-9 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-extrabold shrink-0 shadow-sm">
                <Crown className="w-5 h-5 text-slate-950 fill-amber-400" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-black truncate text-white tracking-tight">
                  {userFullName || userEmail || "Superadmin"}
                </div>
                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 mt-0.5 rounded-full bg-amber-400/20 border border-amber-400/40 text-[9px] font-black text-amber-300 uppercase tracking-wider">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                  Superadmin Owner
                </div>
              </div>
            </div>
            <div className="mt-2.5 pt-2 border-t border-white/10 flex items-center justify-between text-[10px] text-slate-300 font-medium">
              <span>Akses Master Sistem</span>
              <span className="text-emerald-400 font-bold flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Unlimited
              </span>
            </div>
          </div>
        ) : (
          <div className="p-2.5 bg-slate-50 border border-slate-200/80 rounded-2xl mb-1">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-sm shadow-blue-500/20">
                {(userFullName || userEmail || "U").charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold truncate text-slate-900">
                  {userFullName || userEmail}
                </div>
                <div className="text-[10px] text-slate-500 font-medium capitalize">
                  {userRole === "owner" ? "Owner Bisnis" : userRole || "Member"}
                </div>
              </div>
            </div>
          </div>
        )}
        {finalSections.map((section) => {
          if (!section.show) return null;
          
          const isSectionOpen = openSections[section.id] !== false; // defaults to true
          
          return (
            <div key={section.id} className="space-y-1">
              <div 
                onClick={() => toggleSection(section.id)}
                className="flex items-center justify-between px-3 py-1.5 text-[10px] font-extrabold text-slate-400 hover:text-slate-600 uppercase tracking-wider cursor-pointer select-none rounded-lg hover:bg-slate-50 transition"
              >
                <span>{section.title}</span>
                {isSectionOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              </div>
              {isSectionOpen && (
                <div className="flex flex-col gap-1 pl-1.5">
                  {section.items.map((item) => {
                    if (!item.show) return null;
                    return (
                      <React.Fragment key={item.id}>
                        {renderSidebarLink(item.href, item.menuKey, item.icon, item.label, item.badge, item.isExternal)}
                      </React.Fragment>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {/* PWA INSTALLATION BUTTON */}
        {!isAlreadyInstalled && (
          <button
            onClick={handleInstallClick}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold rounded-xl text-blue-600 hover:bg-blue-50 hover:text-blue-700 transition border border-dashed border-blue-200 mt-1"
          >
            <Download className="w-5 h-5" /> {locale === "en" ? "Install App" : "Instal Aplikasi"}
          </button>
        )}

        {/* QUICK NEW INVOICE BUTTON */}
        {showLink("invoice") && (
          <div className="pt-2 border-t border-slate-100 mt-1">
            <Link 
              href="/invoice/new"
              className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition shadow-sm text-sm"
            >
              <Plus className="w-4 h-4" /> {t("newInvoice")}
            </Link>
          </div>
        )}
      </div>
    );
  };

  // Get first letter of business name or default
  const getInitials = (name: string) => {
    return name ? name.charAt(0).toUpperCase() : "B";
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      
      {/* Mobile Sidebar / Drawer Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm md:hidden transition-opacity"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Sidebar / Drawer Content */}
      <div className={`fixed inset-y-0 left-0 z-50 w-72 bg-white p-5 flex flex-col gap-4 shadow-2xl md:hidden transform transition-transform duration-300 ease-in-out ${
        isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
      }`}>
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <Logo
            iconClassName="w-8 h-8"
            textClassName="text-lg font-bold text-blue-600 tracking-tight"
          />
          <button 
            onClick={() => setIsMobileMenuOpen(false)}
            className="p-1.5 text-slate-500 hover:text-slate-950 rounded-lg hover:bg-slate-50 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-2">
          {renderNavigationItems()}
        </div>
        
        {/* Mobile menu logout button in drawer */}
        <div className="border-t border-slate-100 pt-4 mt-auto">
          <button 
            onClick={handleLogout}
            className="w-full px-4 py-3 text-sm font-semibold text-rose-600 hover:bg-rose-50 rounded-xl transition flex items-center gap-3"
          >
            <LogOut className="w-5 h-5" /> {t("logout")}
          </button>
        </div>
      </div>

      {/* TOP BAR / HEADER */}
      <header className="no-print print:hidden sticky top-0 z-40 bg-white border-b border-slate-200 px-4 md:px-8 xl:px-12 py-3 flex items-center justify-between">
        
        {/* Mobile Header Left (Avatar & Business Dropdown) */}
        <div className="flex items-center gap-3 relative">
          <button 
            onClick={() => setIsMobileMenuOpen(true)}
            className="md:hidden p-2 -ml-2 text-slate-500 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition shrink-0"
            aria-label="Open menu"
          >
            <Menu className="w-6 h-6" />
          </button>
          
          <div className="w-10 h-10 rounded-full bg-blue-50 border border-blue-100 overflow-hidden flex items-center justify-center shrink-0">
            <div className="w-full h-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm">
              {getInitials(activeBusiness?.name || "B")}
            </div>
          </div>
          <div className="flex flex-col select-none">
            <span className="text-[10px] text-slate-500 font-medium leading-none">{t("activeBusiness")}</span>
            <div className="text-sm font-bold text-slate-900 truncate max-w-[180px]">
              {activeBusiness?.name || "Skinet Invoice"}
            </div>
          </div>

          {/* Desktop Toggle Sidebar Button */}
          <button
            onClick={() => {
              const next = !isSidebarHidden;
              setIsSidebarHidden(next);
              try { localStorage.setItem("skinet_sidebar_hidden", String(next)); } catch (e) {}
            }}
            className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold text-slate-600 hover:text-blue-600 hover:bg-slate-100 rounded-xl border border-slate-200 transition shrink-0 ml-1 shadow-2xs"
            title={isSidebarHidden ? "Tampilkan Menu Samping" : "Sembunyikan Menu Samping (Layar Penuh)"}
          >
            <Menu className="w-3.5 h-3.5" />
            <span className="text-[11px] font-semibold">{isSidebarHidden ? "Buka Menu" : "Tutup Menu"}</span>
          </button>
        </div>

        {/* Brand Center (for desktop views, centered logo) */}
        <Logo
          className="hidden md:flex items-center gap-2 absolute left-1/2 transform -translate-x-1/2"
          iconClassName="w-8 h-8"
          textClassName="text-lg font-bold text-blue-600 tracking-tight"
        />

        {/* Header Right */}
        <div className="flex items-center gap-2">
          {/* Language Switcher */}
          <div className="relative">
            <button 
              onClick={() => setShowLangDropdown(!showLangDropdown)}
              className="p-2 text-slate-500 hover:text-blue-600 hover:bg-slate-50 rounded-full transition flex items-center gap-1 text-xs font-bold border border-slate-200"
            >
              <Globe className="w-4 h-4" />
              <span className="uppercase">{locale}</span>
            </button>

            {showLangDropdown && (
              <div className="absolute right-0 mt-2 w-32 bg-white border border-slate-200 rounded-xl shadow-xl py-1 z-50">
                <button
                  onClick={() => {
                    setLocale("id");
                    setShowLangDropdown(false);
                  }}
                  className={`w-full px-4 py-2 text-left text-xs font-bold transition hover:bg-slate-50 flex items-center justify-between ${
                    locale === "id" ? "text-blue-600" : "text-slate-700"
                  }`}
                >
                  <span>Indonesian</span>
                  {locale === "id" && <span className="w-1.5 h-1.5 bg-blue-600 rounded-full" />}
                </button>
                <button
                  onClick={() => {
                    setLocale("en");
                    setShowLangDropdown(false);
                  }}
                  className={`w-full px-4 py-2 text-left text-xs font-bold transition hover:bg-slate-50 flex items-center justify-between ${
                    locale === "en" ? "text-blue-600" : "text-slate-700"
                  }`}
                >
                  <span>English</span>
                  {locale === "en" && <span className="w-1.5 h-1.5 bg-blue-600 rounded-full" />}
                </button>
              </div>
            )}
          </div>

          {lowStockCount > 0 && (
            <Link 
              href="/inventory?filter=low_stock" 
              className="p-2 text-amber-600 hover:bg-amber-50 rounded-full transition relative flex items-center justify-center"
              title={`${lowStockCount} barang stok menipis`}
            >
              <AlertCircle className="w-5 h-5" />
              <span className="absolute -top-1 -right-1 bg-amber-500 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center shadow-sm animate-pulse">
                {lowStockCount}
              </span>
            </Link>
          )}
          
          {/* Help Center Direct Link */}
          <Link
            href="/help"
            className="p-2 text-slate-500 hover:text-blue-600 hover:bg-slate-50 rounded-full transition relative flex items-center justify-center"
            title="Pusat Panduan & Tutorial"
          >
            <HelpCircle className="w-5 h-5" />
          </Link>

          {/* Bell Icon & Dropdown */}
          <div className="relative flex items-center">
            <button 
              onClick={() => setShowNotifDropdown(!showNotifDropdown)}
              className="p-2 text-slate-500 hover:text-blue-600 hover:bg-slate-50 rounded-full transition relative flex items-center justify-center active:scale-95"
              title="Notifikasi"
            >
              <Bell className="w-5 h-5" />
              {unreadNotifsCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full animate-ping" />
              )}
              {unreadNotifsCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full" />
              )}
            </button>

            {showNotifDropdown && (
              <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-slate-250 rounded-2xl shadow-2xl z-50 overflow-hidden text-xs font-semibold animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                  <span className="font-extrabold text-slate-900">Notifikasi ({unreadNotifsCount})</span>
                  {unreadNotifsCount > 0 && (
                    <button 
                      onClick={handleMarkAllNotifsAsRead}
                      className="text-[10px] text-blue-600 hover:underline font-extrabold"
                    >
                      Tandai Semua Terbaca
                    </button>
                  )}
                </div>

                <div className="max-h-[280px] overflow-y-auto divide-y divide-slate-100">
                  {notifications.length > 0 ? (
                    notifications.map((notif) => (
                      <div 
                        key={notif.id}
                        onClick={() => handleMarkNotifAsRead(notif.id, notif.reference_id, notif.type)}
                        className={`p-3 hover:bg-slate-50 transition cursor-pointer flex flex-col gap-1 text-left ${
                          !notif.is_read ? "bg-blue-50/20" : ""
                        }`}
                      >
                        <div className="flex justify-between items-start gap-2">
                          <span className={`font-bold text-slate-900 ${!notif.is_read ? "text-blue-650" : ""}`}>
                            {notif.title}
                          </span>
                          {!notif.is_read && (
                            <span className="w-1.5 h-1.5 bg-blue-600 rounded-full shrink-0 mt-1" />
                          )}
                        </div>
                        <p className="text-[10px] text-slate-500 font-medium leading-relaxed">{notif.message}</p>
                        <span className="text-[8px] text-slate-400 font-bold">
                          {new Date(notif.created_at).toLocaleString("id-ID", {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit"
                          })}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="p-8 text-center text-slate-400">
                      <Bell className="w-8 h-8 mx-auto text-slate-200 mb-2" />
                      <p className="font-bold">Tidak ada notifikasi baru</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          <button 
            onClick={handleLogout}
            className="px-3.5 py-1.5 text-xs font-bold text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg border border-slate-200 hover:border-rose-100 transition flex items-center gap-1"
          >
            <LogOut className="w-3.5 h-3.5" /> {t("logout")}
          </button>
        </div>
      </header>

      {/* WORKSPACE AREA: Sidebar + Content */}
      <div className="flex-1 flex flex-col md:flex-row max-w-none w-full mx-auto px-4 md:px-8 xl:px-12 md:py-6 gap-6">
        
        {/* SIDEBAR NAVIGATION: Desktop only */}
        {!isSidebarHidden && (
          <aside className="no-print print:hidden hidden md:flex flex-col w-64 bg-white border border-slate-200 rounded-2xl p-4 gap-2 h-fit card-shadow shrink-0 animate-in fade-in slide-in-from-left-2 duration-150">
            {renderNavigationItems()}
          </aside>
        )}
 
        {/* CONTENT PANELS */}
        <main className="flex-1 px-4 py-6 md:p-0 pb-24 md:pb-6">
          {/* Trial / Subscription Banner */}
          
          {children}
        </main>
      </div>
 
      {/* MOBILE BOTTOM NAVBAR: Collapses into bottom navigation bar exactly like mockups */}
      <nav className="no-print print:hidden md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 px-1 py-1.5 flex items-center justify-around">
        {showLink("dashboard") && (
          <Link 
            href="/" 
            className={`flex-1 min-w-0 flex flex-col items-center gap-1 py-1 ${isActive("/") ? "text-blue-600" : "text-slate-400"}`}
          >
            <Layers className="w-5 h-5 flex-shrink-0" />
            <span className="text-[9px] sm:text-[10px] font-bold truncate w-full text-center">{t("dashboard")}</span>
          </Link>
        )}
        
        {showLink("invoice") && (
          <Link 
            href="/invoice" 
            className={`flex-1 min-w-0 flex flex-col items-center gap-1 py-1 ${isActive("/invoice") ? "text-blue-600" : "text-slate-400"}`}
          >
            <FileText className="w-5 h-5 flex-shrink-0" />
            <span className="text-[9px] sm:text-[10px] font-bold truncate w-full text-center">{t("invoices")}</span>
          </Link>
        )}
        
        {/* Floating Action Button inside Bottom Bar */}
        {showLink("invoice") && (
          <div className="flex-1 flex justify-center relative -top-4">
            <Link 
              href="/invoice/new"
              className="w-12 h-12 sm:w-14 sm:h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full flex items-center justify-center shadow-lg shadow-blue-500/30 transition transform active:scale-95 flex-shrink-0"
            >
              <Plus className="w-6 h-6 sm:w-7 sm:h-7" />
            </Link>
          </div>
        )}
 
        {showLink("customer") && (
          <Link 
            href="/customer" 
            className={`flex-1 min-w-0 flex flex-col items-center gap-1 py-1 ${isActive("/customer") ? "text-blue-600" : "text-slate-400"}`}
          >
            <Users className="w-5 h-5 flex-shrink-0" />
            <span className="text-[9px] sm:text-[10px] font-bold truncate w-full text-center">{t("customers")}</span>
          </Link>
        )}
        
        {showLink("catalog") && (
          <Link 
            href="/catalog" 
            className={`flex-1 min-w-0 flex flex-col items-center gap-1 py-1 ${isActive("/catalog") ? "text-blue-600" : "text-slate-400"}`}
          >
            <Briefcase className="w-5 h-5 flex-shrink-0" />
            <span className="text-[9px] sm:text-[10px] font-bold truncate w-full text-center">{t("catalog")}</span>
          </Link>
        )}
      </nav>

      {/* PWA Install Instructions Modal */}
      {showInstallInstructions && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl relative border border-slate-100 flex flex-col gap-4">
            <button 
              onClick={() => setShowInstallInstructions(false)}
              className="absolute top-4 right-4 p-1.5 text-slate-500 hover:text-slate-950 rounded-lg hover:bg-slate-50 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex flex-col items-center text-center gap-2 mt-2">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-1">
                <Download className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">
                {locale === "en" ? "Install App" : "Instal Aplikasi"}
              </h3>
              <p className="text-xs text-slate-500">
                {locale === "en" 
                  ? "Install invoice.co.id on your device for fast access and offline usage." 
                  : "Instal invoice.co.id di perangkat Anda untuk akses cepat dan offline."}
              </p>
            </div>

            <div className="border-t border-slate-100 pt-4 flex flex-col gap-3">
              <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">
                {locale === "en" ? "Instructions" : "Petunjuk Instalasi"}
              </span>
              
              {isIOS ? (
                // iOS Safari instructions
                <div className="flex flex-col gap-3 text-xs text-slate-700">
                  <div className="flex gap-2">
                    <span className="w-5 h-5 rounded-full bg-blue-50 text-blue-600 font-bold flex items-center justify-center shrink-0">1</span>
                    <p>
                      {locale === "en" 
                        ? "Open Safari and tap the Share button (icon with an arrow pointing up out of a square)." 
                        : "Buka Safari dan ketuk tombol Bagikan / Share (ikon kotak dengan panah ke atas)."}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <span className="w-5 h-5 rounded-full bg-blue-50 text-blue-600 font-bold flex items-center justify-center shrink-0">2</span>
                    <p>
                      {locale === "en" 
                        ? "Scroll down and select 'Add to Home Screen'." 
                        : "Gulir ke bawah lalu pilih 'Tambahkan ke Layar Utama' / 'Add to Home Screen'."}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <span className="w-5 h-5 rounded-full bg-blue-50 text-blue-600 font-bold flex items-center justify-center shrink-0">3</span>
                    <p>
                      {locale === "en" 
                        ? "Tap 'Add' in the top right corner." 
                        : "Ketuk 'Tambah' / 'Add' di sudut kanan atas."}
                    </p>
                  </div>
                </div>
              ) : (
                // Android/Chrome/Other instructions
                <div className="flex flex-col gap-3 text-xs text-slate-700">
                  <div className="flex gap-2">
                    <span className="w-5 h-5 rounded-full bg-blue-50 text-blue-600 font-bold flex items-center justify-center shrink-0">1</span>
                    <p>
                      {locale === "en" 
                        ? "Tap the browser menu button (three dots) in the corner." 
                        : "Ketuk tombol menu browser (titik tiga) di sudut layar."}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <span className="w-5 h-5 rounded-full bg-blue-50 text-blue-600 font-bold flex items-center justify-center shrink-0">2</span>
                    <p>
                      {locale === "en" 
                        ? "Select 'Install app' or 'Add to Home screen'." 
                        : "Pilih 'Instal aplikasi' atau 'Tambahkan ke Layar Utama'."}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <span className="w-5 h-5 rounded-full bg-blue-50 text-blue-600 font-bold flex items-center justify-center shrink-0">3</span>
                    <p>
                      {locale === "en" 
                        ? "Confirm by clicking 'Install'." 
                        : "Konfirmasi dengan mengetuk 'Instal'."}
                    </p>
                  </div>
                  <div className="mt-1 p-2 bg-amber-50 border border-amber-100 rounded-xl text-[10px] text-amber-700 leading-normal">
                    {locale === "en" 
                      ? "Note: If the install option is not available, try using Google Chrome." 
                      : "Catatan: Jika opsi instal tidak tersedia, coba buka menggunakan Google Chrome."}
                  </div>
                </div>
              )}
            </div>

            <button 
              onClick={() => setShowInstallInstructions(false)}
              className="w-full py-2.5 mt-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition text-xs shadow-sm text-center"
            >
              {locale === "en" ? "Got it" : "Mengerti"}
            </button>
          </div>
        </div>
      )}

    </div>
  );
}

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <BusinessProvider>
      <AppLayoutInner>{children}</AppLayoutInner>
    </BusinessProvider>
  );
}

