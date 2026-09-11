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
    const limit = parseInt(searchParams.get("limit") || "50");
    const shiftId = searchParams.get("shift_id");
    const cashierId = searchParams.get("cashier_id") || searchParams.get("employee_id");
    const startDate = searchParams.get("start_date");
    const endDate = searchParams.get("end_date");

    // 1. Ambil daftar kasir/karyawan aktif di bisnis untuk opsi filter
    const { data: activeEmployees } = await supabaseAdmin
      .from("employees")
      .select("id, name, role")
      .eq("business_id", authUser.businessId)
      .eq("is_active", true)
      .order("name", { ascending: true });

    const employeeMap = new Map<string, { id: string; name: string; role: string }>();
    (activeEmployees || []).forEach((e) => employeeMap.set(e.id, e));

    // Jika difilter berdasarkan kasir tertentu, cari shift yang dimiliki kasir tersebut
    let allowedShiftIds: string[] | null = null;
    if (cashierId && cashierId !== "all") {
      const { data: cashierShifts } = await supabaseAdmin
        .from("pos_shifts")
        .select("id")
        .eq("business_id", authUser.businessId)
        .eq("employee_id", cashierId);

      allowedShiftIds = (cashierShifts || []).map((s) => s.id);
      // Jika kasir tidak memiliki shift sama sekali, return data kosong
      if (allowedShiftIds.length === 0) {
        return jsonResponse({
          success: true,
          data: [],
          cashiers: (activeEmployees || []).map((e) => ({ id: e.id, name: e.name, role: e.role })),
        });
      }
    }

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
      .limit(limit);

    if (shiftId) {
      query = query.eq("pos_shift_id", shiftId);
    } else if (allowedShiftIds !== null) {
      query = query.in("pos_shift_id", allowedShiftIds);
    }

    if (startDate) {
      query = query.gte("created_at", `${startDate}T00:00:00.000Z`);
    }
    if (endDate) {
      query = query.lte("created_at", `${endDate}T23:59:59.999Z`);
    }

    const { data: invoices, error } = await query;

    if (error) {
      console.error("Error fetching sales history:", error);
      return jsonResponse({ success: false, error: "Gagal memuat riwayat penjualan." }, { status: 500 });
    }

    // Resolusi nama kasir via pos_shift_id
    const distinctShiftIds = Array.from(new Set((invoices || []).map((i) => i.pos_shift_id).filter(Boolean)));
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
          .select("id, name, role")
          .in("id", additionalEmpIds);
        (extraEmps || []).forEach((e) => employeeMap.set(e.id, e));
      }
    }

    const formatted = (invoices || []).map((inv) => {
      const paymentMethod = Array.isArray(inv.payment_methods) && inv.payment_methods.length > 0
        ? inv.payment_methods[0]
        : "cash";

      const shift = inv.pos_shift_id ? shiftMap.get(inv.pos_shift_id) : null;
      const employee = shift?.employee_id ? employeeMap.get(shift.employee_id) : null;
      const cashierName = employee?.name || (inv.pos_shift_id ? "Kasir" : "Penjualan Langsung");

      return {
        id: inv.id,
        invoice_number: inv.invoice_number,
        date: inv.created_at || inv.issue_date,
        total_amount: Number(inv.total_amount) || 0,
        paid_amount: Number(inv.paid_amount) || 0,
        payment_method: paymentMethod,
        notes: inv.notes,
        cashier_id: shift?.employee_id || null,
        cashier_name: cashierName,
        items_count: Array.isArray(inv.invoice_items) ? inv.invoice_items.length : 0,
        items: inv.invoice_items || [],
      };
    });

    return jsonResponse({
      success: true,
      data: formatted,
      cashiers: (activeEmployees || []).map((e) => ({ id: e.id, name: e.name, role: e.role })),
    });
  } catch (err: any) {
    const message = err.message || "";
    if (message.startsWith("UNAUTHORIZED")) return jsonResponse({ success: false, error: message }, { status: 401 });
    if (message.startsWith("FORBIDDEN")) return jsonResponse({ success: false, error: message }, { status: 403 });
    return jsonResponse({ success: false, error: "Gagal memuat riwayat transaksi." }, { status: 500 });
  }
}
