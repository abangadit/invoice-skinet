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
        notes,
        employees (
          id,
          name,
          role
        )
      `)
      .eq("business_id", authUser.businessId)
      .order("opened_at", { ascending: false });

    if (shiftId) {
      shiftQuery = shiftQuery.eq("id", shiftId);
    } else if (isOngoing) {
      shiftQuery = shiftQuery.eq("status", "open");
    } else {
      if (startDate) {
        // Beri buffer timezone lokal (mulai dari H-1 12:00:00 UTC sampai H+1 12:00:00 UTC)
        const dStart = new Date(startDate);
        dStart.setHours(dStart.getHours() - 12);
        shiftQuery = shiftQuery.gte("opened_at", dStart.toISOString());
      }
      if (endDate) {
        const dEnd = new Date(endDate);
        dEnd.setDate(dEnd.getDate() + 1);
        dEnd.setHours(dEnd.getHours() + 12);
        shiftQuery = shiftQuery.lte("opened_at", dEnd.toISOString());
      }
    }

    const { data: shifts, error: shiftErr } = await shiftQuery.limit(50);
    if (shiftErr) {
      console.error("Error fetching shifts:", shiftErr);
      return jsonResponse({ success: false, error: "Gagal mengambil data shift." }, { status: 500 });
    }

    const shiftIds = (shifts || []).map((s) => s.id);

    // 2. Ambil faktur yang terkait dengan shift ATAU rentang tanggal hari ini
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
        invoice_items (
          id,
          name,
          quantity,
          unit_price,
          subtotal,
          item_id,
          items (
            id,
            purchase_price
          )
        )
      `)
      .eq("business_id", authUser.businessId)
      .eq("status", "paid");

    if (shiftId) {
      invoicesQuery = invoicesQuery.eq("pos_shift_id", shiftId);
    } else if (isOngoing && shiftIds.length > 0) {
      invoicesQuery = invoicesQuery.in("pos_shift_id", shiftIds);
    } else if (startDate && endDate) {
      if (startDate === endDate) {
        // Filter fleksibel: jika tanggal sama (contoh hari ini), cocokkan issue_date OR created_at
        invoicesQuery = invoicesQuery.or(`issue_date.eq.${startDate},created_at.gte.${startDate}T00:00:00,created_at.lte.${endDate}T23:59:59`);
      } else {
        invoicesQuery = invoicesQuery
          .gte("issue_date", startDate)
          .lte("issue_date", endDate);
      }
    } else if (shiftIds.length > 0) {
      invoicesQuery = invoicesQuery.in("pos_shift_id", shiftIds);
    }

    const { data: invoices, error: invErr } = await invoicesQuery;
    if (invErr) {
      console.error("Error fetching invoices for report:", invErr);
    }

    // 3. Rekapitulasi Metrik Shift
    const assignedInvoiceIds = new Set<string>();
    const shiftReports = (shifts || []).map((shift) => {
      const shiftInvoices = (invoices || []).filter((inv) => {
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
          const buyPrice = Number(item.items?.purchase_price) || 0;
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

      const employeeObj = shift.employees as any;

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
        cashier_name: employeeObj?.name || "Kasir",
        cashier_role: employeeObj?.role || "kasir",
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
        transactions: shiftInvoices.map((inv) => ({
          id: inv.id,
          invoice_number: inv.invoice_number,
          time: inv.created_at || inv.issue_date,
          total_amount: Number(inv.total_amount) || 0,
          payment_method: Array.isArray(inv.payment_methods) && inv.payment_methods.length > 0 ? inv.payment_methods[0] : "cash",
          items_count: Array.isArray(inv.invoice_items) ? inv.invoice_items.length : 0,
        })),
      };
    });

    // 4. Kumpulkan faktur sisa yang belum terasosiasi ke shift spesifik
    const unassignedInvoices = (invoices || []).filter((inv) => !assignedInvoiceIds.has(inv.id));
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
          const buyPrice = Number(item.items?.purchase_price) || 0;
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

      shiftReports.unshift({
        id: "direct-sales",
        cashier_name: "Penjualan POS Langsung",
        cashier_role: "kasir",
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
    });
  } catch (err: any) {
    const message = err.message || "";
    if (message.startsWith("UNAUTHORIZED")) return jsonResponse({ success: false, error: message }, { status: 401 });
    if (message.startsWith("FORBIDDEN")) return jsonResponse({ success: false, error: message }, { status: 403 });
    return jsonResponse({ success: false, error: "Gagal memuat laporan shift POS." }, { status: 500 });
  }
}
