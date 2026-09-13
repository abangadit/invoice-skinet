import { NextRequest } from "next/server";
import { validateMobileToken, getSupabaseAdmin } from "../../_helpers/auth";
import { jsonResponse, handleOptions } from "../../_helpers/cors";

export const dynamic = "force-dynamic";

export async function OPTIONS() {
  return handleOptions();
}

export async function GET(request: NextRequest) {
  try {
    const authUser = await validateMobileToken(request);
    const supabaseAdmin = getSupabaseAdmin();

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "100");
    const shiftId = searchParams.get("shift_id");
    const cashierId = searchParams.get("cashier_id") || searchParams.get("employee_id");
    const startDate = searchParams.get("start_date");
    const endDate = searchParams.get("end_date");

    // 1. Ambil daftar seluruh karyawan di bisnis
    const { data: activeEmployees } = await supabaseAdmin
      .from("employees")
      .select("id, name, role, user_id, is_active")
      .eq("business_id", authUser.businessId)
      .order("name", { ascending: true });

    const employeeMap = new Map<string, { id: string; name: string; role: string; user_id?: string }>();
    (activeEmployees || []).forEach((e) => {
      let cleanName = e.name;
      if (cleanName && cleanName.includes("@")) {
        const u = cleanName.split("@")[0];
        cleanName = u.charAt(0).toUpperCase() + u.slice(1);
      }
      employeeMap.set(e.id, { id: e.id, name: cleanName, role: e.role, user_id: e.user_id });
      if (e.user_id) {
        employeeMap.set(e.user_id, { id: e.id, name: cleanName, role: e.role, user_id: e.user_id });
      }
    });

    // 2. Ambil business_members (termasuk owner/admin yang login di POS)
    const { data: bizMembers } = await supabaseAdmin
      .from("business_members")
      .select("user_id, role, users ( id, email, raw_user_meta_data )")
      .eq("business_id", authUser.businessId);

    const cashierMap = new Map<string, { id: string; name: string; role: string; user_id?: string }>();
    (activeEmployees || []).filter((e) => e.is_active !== false).forEach((e) => {
      let cleanName = e.name;
      if (cleanName && cleanName.includes("@")) {
        const u = cleanName.split("@")[0];
        cleanName = u.charAt(0).toUpperCase() + u.slice(1);
      }
      cashierMap.set(e.id, { id: e.id, name: cleanName, role: e.role || "kasir", user_id: e.user_id });
      if (e.user_id) {
        cashierMap.set(e.user_id, { id: e.id, name: cleanName, role: e.role || "kasir", user_id: e.user_id });
      }
    });

    // Pastikan user aktif saat ini (Owner atau Kasir yang login) terdaftar
    const authCleanName = authUser.name && authUser.name.includes("@")
      ? authUser.name.split("@")[0].charAt(0).toUpperCase() + authUser.name.split("@")[0].slice(1)
      : (authUser.name || "Kasir");

    const authId = authUser.employeeId || authUser.userId;
    if (!cashierMap.has(authId) && !Array.from(cashierMap.values()).some((c) => c.name.toLowerCase() === authCleanName.toLowerCase())) {
      cashierMap.set(authId, {
        id: authId,
        name: authCleanName,
        role: authUser.role || "owner",
        user_id: authUser.userId,
      });
    }

    (bizMembers || []).forEach((m: any) => {
      const uId = m.user_id;
      const email = m.users?.email || "";
      const metaName = m.users?.raw_user_meta_data?.full_name || m.users?.raw_user_meta_data?.name;
      let mName = metaName || (email ? email.split("@")[0] : "");
      if (mName) {
        mName = mName.charAt(0).toUpperCase() + mName.slice(1);
      }
      if (uId && !cashierMap.has(uId) && !Array.from(cashierMap.values()).some((c) => c.name.toLowerCase() === mName.toLowerCase())) {
        cashierMap.set(uId, {
          id: uId,
          name: mName || "Kasir",
          role: m.role || "kasir",
          user_id: uId,
        });
      }
    });

    // Susun daftar unik kasir untuk dropdown/chip filter
    const uniqueCashiers: { id: string; name: string; role: string }[] = [];
    const seenNames = new Set<string>();
    cashierMap.forEach((c) => {
      const normName = c.name.trim().toLowerCase();
      if (!seenNames.has(normName) && normName !== "admin" && normName !== "kasir") {
        seenNames.add(normName);
        uniqueCashiers.push({ id: c.id, name: c.name, role: c.role });
      }
    });
    if (uniqueCashiers.length === 0) {
      uniqueCashiers.push({ id: authId, name: authCleanName, role: authUser.role || "kasir" });
    }

    // Resolusi target kasir jika sedang difilter
    let targetCashier: { id: string; name: string; role: string; user_id?: string } | undefined;
    let targetUserId: string | null = null;
    let targetName: string | null = null;
    let cashierShiftIds: string[] = [];

    if (cashierId && cashierId !== "all") {
      targetCashier = Array.from(cashierMap.values()).find(
        (c) => c.id === cashierId || c.user_id === cashierId
      );
      targetUserId = targetCashier?.user_id || (cashierId.length > 20 ? cashierId : null);
      targetName = targetCashier?.name || null;

      const targetIds = [cashierId];
      if (targetUserId && targetUserId !== cashierId) targetIds.push(targetUserId);

      // Cari shift yang terasosiasi dengan kasir ini
      const { data: cashierShifts } = await supabaseAdmin
        .from("pos_shifts")
        .select("id, employee_id")
        .eq("business_id", authUser.businessId)
        .in("employee_id", targetIds);

      cashierShiftIds = (cashierShifts || []).map((s) => s.id);
    }

    // Query faktur lunas
    let query = supabaseAdmin
      .from("invoices")
      .select(`
        id,
        invoice_number,
        issue_date,
        total_amount,
        paid_amount,
        payment_methods,
        notes,
        created_at,
        pos_shift_id,
        created_by,
        created_by_name,
        invoice_items (
          id,
          name,
          quantity,
          unit,
          unit_price,
          subtotal
        )
      `)
      .eq("business_id", authUser.businessId)
      .eq("status", "paid")
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(limit);

    if (shiftId) {
      query = query.eq("pos_shift_id", shiftId);
    }

    if (startDate) {
      query = query.gte("created_at", `${startDate}T00:00:00.000Z`);
    }
    if (endDate) {
      query = query.lte("created_at", `${endDate}T23:59:59.999Z`);
    }

    const { data: rawInvoices, error } = await query;

    if (error) {
      console.error("Error fetching sales history:", error);
      return jsonResponse({ success: false, error: "Gagal memuat riwayat penjualan." }, { status: 500 });
    }

    const invoices = (rawInvoices || []) as any[];

    // Resolusi nama kasir via pos_shift_id
    const distinctShiftIds = Array.from(new Set(invoices.map((i) => i.pos_shift_id).filter(Boolean)));
    const shiftMap = new Map<string, any>();
    if (distinctShiftIds.length > 0) {
      const { data: shifts } = await supabaseAdmin
        .from("pos_shifts")
        .select("id, employee_id")
        .in("id", distinctShiftIds);

      const additionalEmpIds: string[] = [];
      (shifts || []).forEach((s) => {
        shiftMap.set(s.id, s);
        if (s.employee_id && !employeeMap.has(s.employee_id)) {
          additionalEmpIds.push(s.employee_id);
        }
      });

      if (additionalEmpIds.length > 0) {
        const { data: extraEmps } = await supabaseAdmin
          .from("employees")
          .select("id, name, role, user_id")
          .in("id", additionalEmpIds);
        (extraEmps || []).forEach((e) => {
          let cleanName = e.name;
          if (cleanName && cleanName.includes("@")) {
            const u = cleanName.split("@")[0];
            cleanName = u.charAt(0).toUpperCase() + u.slice(1);
          }
          employeeMap.set(e.id, { id: e.id, name: cleanName, role: e.role, user_id: e.user_id });
          if (e.user_id) {
            employeeMap.set(e.user_id, { id: e.id, name: cleanName, role: e.role, user_id: e.user_id });
          }
        });
      }
    }

    // Resolusi fallback via tabel users (misal owner atau shift dibuka langsung oleh user)
    const userIdsToLookup = new Set<string>();
    invoices.forEach((inv) => {
      if (inv.created_by) userIdsToLookup.add(inv.created_by);
    });
    employeeMap.forEach((e) => {
      if (e.user_id) userIdsToLookup.add(e.user_id);
    });

    const userMap = new Map<string, string>();
    if (userIdsToLookup.size > 0) {
      const { data: usersData } = await supabaseAdmin
        .from("users")
        .select("id, email")
        .in("id", Array.from(userIdsToLookup));
      (usersData || []).forEach((u) => {
        const username = u.email ? u.email.split("@")[0] : "";
        if (username) {
          userMap.set(u.id, username.charAt(0).toUpperCase() + username.slice(1));
        }
      });
    }

    const formatted = invoices.map((inv) => {
      const paymentMethod = Array.isArray(inv.payment_methods) && inv.payment_methods.length > 0
        ? inv.payment_methods[0]
        : "cash";

      const shift = inv.pos_shift_id ? shiftMap.get(inv.pos_shift_id) : null;
      const employee = shift?.employee_id ? employeeMap.get(shift.employee_id) : null;

      // Multi-layer cashier name resolution:
      let cashierName = "";
      if (inv.created_by_name && inv.created_by_name.trim() !== "" && inv.created_by_name !== "Admin" && inv.created_by_name !== "Kasir") {
        cashierName = inv.created_by_name;
      } else if (employee?.name && employee.name.toLowerCase() !== "kasir") {
        cashierName = employee.name;
      } else if (inv.created_by_name && inv.created_by_name.trim() !== "") {
        cashierName = inv.created_by_name;
      } else if (employee?.name) {
        cashierName = employee.name;
      } else if (inv.created_by && userMap.has(inv.created_by)) {
        cashierName = userMap.get(inv.created_by)!;
      } else if (shift?.employee_id && userMap.has(shift.employee_id)) {
        cashierName = userMap.get(shift.employee_id)!;
      } else {
        cashierName = inv.pos_shift_id ? (authUser.name || "Kasir") : (authUser.name || "Penjualan Langsung");
      }

      if (!cashierName || cashierName.toLowerCase() === "kasir") {
        cashierName = authUser.name || "Kasir";
      }

      // Jika nama kasir berupa alamat email (contoh: sulaiman@gmail.com -> Sulaiman)
      if (cashierName.includes("@")) {
        const username = cashierName.split("@")[0];
        cashierName = username.charAt(0).toUpperCase() + username.slice(1);
      }

      const resolvedCashierId = shift?.employee_id || inv.created_by || null;

      return {
        id: inv.id,
        invoice_number: inv.invoice_number,
        date: inv.created_at || inv.issue_date,
        total_amount: Number(inv.total_amount) || 0,
        paid_amount: Number(inv.paid_amount) || 0,
        payment_method: paymentMethod,
        notes: inv.notes,
        pos_shift_id: inv.pos_shift_id || null,
        created_by: inv.created_by || null,
        cashier_id: resolvedCashierId,
        cashier_name: cashierName,
        items_count: Array.isArray(inv.invoice_items) ? inv.invoice_items.length : 0,
        items: inv.invoice_items || [],
      };
    });

    // Filter data jika cashierId dipilih
    const filtered = (cashierId && cashierId !== "all")
      ? formatted.filter((inv) => {
          if (inv.pos_shift_id && cashierShiftIds.includes(inv.pos_shift_id)) return true;
          if (inv.cashier_id && (inv.cashier_id === cashierId || inv.cashier_id === targetUserId)) return true;
          if (inv.created_by && (inv.created_by === cashierId || inv.created_by === targetUserId)) return true;
          if (targetName && inv.cashier_name && inv.cashier_name.toLowerCase() === targetName.toLowerCase()) return true;
          return false;
        })
      : formatted;

    return jsonResponse({
      success: true,
      data: filtered,
      cashiers: uniqueCashiers,
    });
  } catch (err: any) {
    const message = err.message || "";
    if (message.startsWith("UNAUTHORIZED")) return jsonResponse({ success: false, error: message }, { status: 401 });
    if (message.startsWith("FORBIDDEN")) return jsonResponse({ success: false, error: message }, { status: 403 });
    return jsonResponse({ success: false, error: "Gagal memuat riwayat transaksi." }, { status: 500 });
  }
}
