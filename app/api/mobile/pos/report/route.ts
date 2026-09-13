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
    const shiftId = searchParams.get("shift_id");
    const startDate = searchParams.get("start_date"); // YYYY-MM-DD
    const endDate = searchParams.get("end_date");     // YYYY-MM-DD
    const isOngoing = searchParams.get("is_ongoing") === "true";
    const cashierId = searchParams.get("cashier_id") || searchParams.get("employee_id");

    // Ambil daftar seluruh karyawan/kasir bisnis untuk opsi filter dan resolusi nama
    const { data: allEmps } = await supabaseAdmin
      .from("employees")
      .select("id, name, role, user_id, is_active")
      .eq("business_id", authUser.businessId)
      .order("name", { ascending: true });

    const employeeMap = new Map<string, any>();
    (allEmps || []).forEach((e) => employeeMap.set(e.id, e));

    // 1. Ambil list shift berdasarkan filter
    let shiftQuery = supabaseAdmin
      .from("pos_shifts")
      .select(`
        id,
        business_id,
        employee_id,
        opened_at,
        closed_at,
        opening_cash,
        expected_closing_cash,
        actual_closing_cash,
        status,
        notes
      `)
      .eq("business_id", authUser.businessId)
      .order("opened_at", { ascending: false })
      .order("id", { ascending: false });

    if (shiftId) {
      shiftQuery = shiftQuery.eq("id", shiftId);
    } else if (isOngoing) {
      shiftQuery = shiftQuery.eq("status", "open");
    }

    if (cashierId && cashierId !== "all") {
      shiftQuery = shiftQuery.eq("employee_id", cashierId);
    }

    if (startDate) {
      shiftQuery = shiftQuery.gte("opened_at", `${startDate}T00:00:00.000Z`);
    }
    if (endDate) {
      shiftQuery = shiftQuery.lte("opened_at", `${endDate}T23:59:59.999Z`);
    }

    const { data: rawShifts, error: shiftErr } = await shiftQuery.limit(50);
    if (shiftErr) {
      console.error("Error fetching shifts:", shiftErr);
    }

    const shifts = rawShifts || [];
    const shiftIds = shifts.map((s) => s.id);

    // 2. Ambil seluruh faktur yang lunas (persis seperti pola riwayat penjualan)
    let invoicesQuery = supabaseAdmin
      .from("invoices")
      .select(`
        id,
        invoice_number,
        issue_date,
        total_amount,
        paid_amount,
        payment_methods,
        pos_shift_id,
        created_at,
        created_by,
        created_by_name,
        invoice_items (
          id,
          name,
          quantity,
          unit_price,
          subtotal
        )
      `)
      .eq("business_id", authUser.businessId)
      .eq("status", "paid")
      .order("created_at", { ascending: false })
      .order("id", { ascending: false });

    if (shiftId) {
      invoicesQuery = invoicesQuery.eq("pos_shift_id", shiftId);
    } else if (isOngoing && shiftIds.length > 0) {
      invoicesQuery = invoicesQuery.in("pos_shift_id", shiftIds);
    }

    const { data: rawInvoices, error: invErr } = await invoicesQuery.limit(200);
    if (invErr) {
      console.error("Error fetching invoices for report:", invErr);
    }

    const invoices = (rawInvoices || []) as any[];

    // Kumpulkan user ID potensial untuk resolusi nama (fallback jika employee tidak ada/bernama Kasir)
    const userIdsToLookup = new Set<string>();
    shifts.forEach((s) => {
      if (s.employee_id) userIdsToLookup.add(s.employee_id);
    });
    (allEmps || []).forEach((e) => {
      if (e.user_id) userIdsToLookup.add(e.user_id);
    });
    invoices.forEach((inv) => {
      if (inv.created_by) userIdsToLookup.add(inv.created_by);
    });
    if (authUser.userId) userIdsToLookup.add(authUser.userId);

    const userMap = new Map<string, { email?: string; name?: string }>();
    if (userIdsToLookup.size > 0) {
      const { data: usersData } = await supabaseAdmin
        .from("users")
        .select("id, email")
        .in("id", Array.from(userIdsToLookup));
      (usersData || []).forEach((u) => {
        const username = u.email ? u.email.split("@")[0] : "";
        userMap.set(u.id, {
          email: u.email,
          name: username ? username.charAt(0).toUpperCase() + username.slice(1) : "",
        });
      });
    }

    const { data: membersData } = await supabaseAdmin
      .from("business_members")
      .select("user_id, role")
      .eq("business_id", authUser.businessId);
    const memberRoleMap = new Map<string, string>();
    (membersData || []).forEach((m) => memberRoleMap.set(m.user_id, m.role));

    // 3. Rekapitulasi Metrik Shift
    const assignedInvoiceIds = new Set<string>();
    const shiftReports = (shifts || []).map((shift) => {
      const shiftInvoices = invoices.filter((inv) => {
        if (inv.pos_shift_id === shift.id) {
          assignedInvoiceIds.add(inv.id);
          return true;
        }
        return false;
      });
      
      let totalRevenue = 0;
      let totalCost = 0;
      let cashRevenue = 0;
      let nonCashRevenue = 0;
      let totalItemsSold = 0;

      shiftInvoices.forEach((inv) => {
        const invTotal = Number(inv.total_amount) || 0;
        totalRevenue += invTotal;

        const method = Array.isArray(inv.payment_methods) && inv.payment_methods.length > 0
          ? String(inv.payment_methods[0]).toLowerCase()
          : "cash";

        if (method === "cash" || method === "tunai") {
          cashRevenue += invTotal;
        } else {
          nonCashRevenue += invTotal;
        }

        (inv.invoice_items || []).forEach((item: any) => {
          const qty = Number(item.quantity) || 1;
          totalItemsSold += qty;
          const buyPrice = Number(item.purchase_price || item.unit_price * 0.7) || 0;
          totalCost += buyPrice * qty;
        });
      });

      const openingCash = Number(shift.opening_cash) || 0;
      const expectedCash = openingCash + cashRevenue;
      const isClosed = shift.status === "closed";
      const actualCash = isClosed
        ? Number(shift.actual_closing_cash !== null ? shift.actual_closing_cash : expectedCash)
        : expectedCash;
      const cashDifference = actualCash - expectedCash; // Minus jika < 0
      const grossProfit = totalRevenue - totalCost;

      const employeeObj = employeeMap.get(shift.employee_id);

      // Multi-layer resolution nama kasir shift:
      // 1. Cek created_by_name transaksi pertama di shift jika bukan generic "Admin"/"Kasir"
      const invoiceCreatorName = shiftInvoices.find(
        (inv) => inv.created_by_name && inv.created_by_name.trim() !== "" && inv.created_by_name !== "Admin" && inv.created_by_name !== "Kasir"
      )?.created_by_name;

      let resolvedCashierName = "";
      if (employeeObj?.name && employeeObj.name.toLowerCase() !== "kasir") {
        resolvedCashierName = employeeObj.name;
      } else if (invoiceCreatorName) {
        resolvedCashierName = invoiceCreatorName;
      } else if (employeeObj?.user_id && userMap.has(employeeObj.user_id) && userMap.get(employeeObj.user_id)?.name) {
        resolvedCashierName = userMap.get(employeeObj.user_id)!.name!;
      } else if (shift.employee_id && userMap.has(shift.employee_id) && userMap.get(shift.employee_id)?.name) {
        resolvedCashierName = userMap.get(shift.employee_id)!.name!;
      } else if (employeeObj?.name) {
        resolvedCashierName = employeeObj.name;
      } else {
        resolvedCashierName = authUser.name || "Kasir";
      }

      if (!resolvedCashierName || resolvedCashierName.toLowerCase() === "kasir") {
        resolvedCashierName = authUser.name || "Kasir";
      }

      // Bersihkan jika nama berupa format email
      if (resolvedCashierName.includes("@")) {
        const username = resolvedCashierName.split("@")[0];
        resolvedCashierName = username.charAt(0).toUpperCase() + username.slice(1);
      }

      let resolvedRole = employeeObj?.role;
      if (!resolvedRole && employeeObj?.user_id && memberRoleMap.has(employeeObj.user_id)) {
        resolvedRole = memberRoleMap.get(employeeObj.user_id);
      }
      if (!resolvedRole && shift.employee_id && memberRoleMap.has(shift.employee_id)) {
        resolvedRole = memberRoleMap.get(shift.employee_id);
      }
      resolvedRole = resolvedRole || "kasir";

      // Hitung 2 huruf inisial avatar kasir
      const words = resolvedCashierName.trim().split(/\s+/).filter(Boolean);
      const cashierInitials = (
        words.length >= 2
          ? words[0].charAt(0) + words[1].charAt(0)
          : words.length === 1
          ? words[0].slice(0, 2)
          : "KS"
      ).toUpperCase();

      // Breakdown per jam (Hourly Analysis)
      const hourlyMap: { [hour: string]: { hour: string; count: number; revenue: number } } = {};
      shiftInvoices.forEach((inv) => {
        const d = new Date(inv.created_at || inv.issue_date);
        const hourKey = `${String(d.getHours()).padStart(2, "0")}:00`;
        if (!hourlyMap[hourKey]) {
          hourlyMap[hourKey] = { hour: hourKey, count: 0, revenue: 0 };
        }
        hourlyMap[hourKey].count += 1;
        hourlyMap[hourKey].revenue += Number(inv.total_amount) || 0;
      });

      const hourlyBreakdown = Object.values(hourlyMap).sort((a, b) => a.hour.localeCompare(b.hour));

      return {
        id: shift.id,
        cashier_name: resolvedCashierName,
        cashier_role: resolvedRole,
        cashier_initials: cashierInitials,
        status: shift.status,
        opened_at: shift.opened_at,
        closed_at: shift.closed_at,
        opening_cash: openingCash,
        expected_closing_cash: expectedCash,
        actual_closing_cash: isClosed ? actualCash : null,
        cash_difference: isClosed ? cashDifference : 0,
        is_minus: isClosed && cashDifference < 0,
        total_revenue: totalRevenue,
        total_cost: totalCost,
        gross_profit: grossProfit,
        cash_revenue: cashRevenue,
        non_cash_revenue: nonCashRevenue,
        total_transactions: shiftInvoices.length,
        total_items_sold: totalItemsSold,
        notes: shift.notes,
        hourly_breakdown: hourlyBreakdown,
        transactions: shiftInvoices.map((inv) => {
          let txCashier = inv.created_by_name;
          if (!txCashier || txCashier === "Admin" || txCashier === "Kasir") {
            txCashier = resolvedCashierName;
          }
          if (txCashier && txCashier.includes("@")) {
            const u = txCashier.split("@")[0];
            txCashier = u.charAt(0).toUpperCase() + u.slice(1);
          }
          return {
            id: inv.id,
            invoice_number: inv.invoice_number,
            time: inv.created_at || inv.issue_date,
            total_amount: Number(inv.total_amount) || 0,
            payment_method: Array.isArray(inv.payment_methods) && inv.payment_methods.length > 0 ? inv.payment_methods[0] : "cash",
            items_count: Array.isArray(inv.invoice_items) ? inv.invoice_items.length : 0,
            cashier_name: txCashier,
          };
        }),
      };
    });

    // 4. Kumpulkan faktur sisa yang belum terasosiasi ke shift spesifik (hanya jika tidak difilter ke kasir spesifik)
    const isFilteredBySpecificCashier = Boolean(cashierId && cashierId !== "all");
    const unassignedInvoices = isFilteredBySpecificCashier
      ? []
      : invoices.filter((inv) => !assignedInvoiceIds.has(inv.id));
    if (unassignedInvoices.length > 0) {
      let unRevenue = 0;
      let unCost = 0;
      let unCashRev = 0;
      let unNonCashRev = 0;
      let unItemsSold = 0;
      const unHourlyMap: { [h: string]: { hour: string; count: number; revenue: number } } = {};

      unassignedInvoices.forEach((inv) => {
        const invTotal = Number(inv.total_amount) || 0;
        unRevenue += invTotal;

        const method = Array.isArray(inv.payment_methods) && inv.payment_methods.length > 0
          ? String(inv.payment_methods[0]).toLowerCase()
          : "cash";

        if (method === "cash" || method === "tunai") {
          unCashRev += invTotal;
        } else {
          unNonCashRev += invTotal;
        }

        (inv.invoice_items || []).forEach((item: any) => {
          const qty = Number(item.quantity) || 1;
          unItemsSold += qty;
          const buyPrice = Number(item.purchase_price || item.unit_price * 0.7) || 0;
          unCost += buyPrice * qty;
        });

        const d = new Date(inv.created_at || inv.issue_date);
        const hourKey = `${String(d.getHours()).padStart(2, "0")}:00`;
        if (!unHourlyMap[hourKey]) {
          unHourlyMap[hourKey] = { hour: hourKey, count: 0, revenue: 0 };
        }
        unHourlyMap[hourKey].count += 1;
        unHourlyMap[hourKey].revenue += invTotal;
      });

      const firstUnassignedCreator = unassignedInvoices.find(
        (inv) => inv.created_by_name && inv.created_by_name !== "Admin" && inv.created_by_name !== "Kasir"
      )?.created_by_name;
      const directCashierName = firstUnassignedCreator || authUser.name || "Penjualan Langsung";
      const directWords = directCashierName.trim().split(/\s+/).filter(Boolean);
      const directInitials = (
        directWords.length >= 2
          ? directWords[0].charAt(0) + directWords[1].charAt(0)
          : directWords.length === 1
          ? directWords[0].slice(0, 2)
          : "PL"
      ).toUpperCase();

      shiftReports.unshift({
        id: "direct-sales",
        cashier_name: directCashierName,
        cashier_role: "penjualan",
        cashier_initials: directInitials,
        status: "closed",
        opened_at: unassignedInvoices[0]?.created_at || new Date().toISOString(),
        closed_at: unassignedInvoices[unassignedInvoices.length - 1]?.created_at || new Date().toISOString(),
        opening_cash: 0,
        expected_closing_cash: unCashRev,
        actual_closing_cash: unCashRev,
        cash_difference: 0,
        is_minus: false,
        total_revenue: unRevenue,
        total_cost: unCost,
        gross_profit: unRevenue - unCost,
        cash_revenue: unCashRev,
        non_cash_revenue: unNonCashRev,
        total_transactions: unassignedInvoices.length,
        total_items_sold: unItemsSold,
        notes: "Penjualan tercatat langsung di sistem",
        hourly_breakdown: Object.values(unHourlyMap).sort((a, b) => a.hour.localeCompare(b.hour)),
        transactions: unassignedInvoices.map((inv) => ({
          id: inv.id,
          invoice_number: inv.invoice_number,
          time: inv.created_at || inv.issue_date,
          total_amount: Number(inv.total_amount) || 0,
          payment_method: Array.isArray(inv.payment_methods) && inv.payment_methods.length > 0 ? inv.payment_methods[0] : "cash",
          items_count: Array.isArray(inv.invoice_items) ? inv.invoice_items.length : 0,
          cashier_name: inv.created_by_name || directCashierName,
        })),
      });
    }

    // Ringkasan Global dari Seluruh Shift yang Terfilter
    const grandSummary = shiftReports.reduce(
      (acc, s) => {
        acc.total_revenue += s.total_revenue;
        acc.gross_profit += s.gross_profit;
        acc.cash_revenue += s.cash_revenue;
        acc.non_cash_revenue += s.non_cash_revenue;
        acc.total_transactions += s.total_transactions;
        acc.total_items_sold += s.total_items_sold;
        if (s.cash_difference < 0) {
          acc.total_cash_deficit += Math.abs(s.cash_difference);
        }
        return acc;
      },
      {
        total_revenue: 0,
        gross_profit: 0,
        cash_revenue: 0,
        non_cash_revenue: 0,
        total_transactions: 0,
        total_items_sold: 0,
        total_cash_deficit: 0,
      }
    );

    return jsonResponse({
      success: true,
      summary: grandSummary,
      shifts: shiftReports,
      cashiers: (allEmps || []).filter((e) => e.is_active !== false).map((e) => ({ id: e.id, name: e.name, role: e.role })),
    });
  } catch (err: any) {
    const message = err.message || "";
    if (message.startsWith("UNAUTHORIZED")) return jsonResponse({ success: false, error: message }, { status: 401 });
    if (message.startsWith("FORBIDDEN")) return jsonResponse({ success: false, error: message }, { status: 403 });
    return jsonResponse({ success: false, error: "Gagal memuat laporan shift POS." }, { status: 500 });
  }
}
