import { NextRequest } from "next/server";
import { validateMobileToken, getSupabaseAdmin } from "../../_helpers/auth";
import { jsonResponse, handleOptions } from "../../_helpers/cors";

export const dynamic = "force-dynamic";

export async function OPTIONS() {
  return handleOptions();
}

// GET: Cek apakah ada shift aktif untuk kasir saat ini
export async function GET(request: NextRequest) {
  try {
    const authUser = await validateMobileToken(request);
    const supabaseAdmin = getSupabaseAdmin();

    let query = supabaseAdmin
      .from("pos_shifts")
      .select("id, business_id, employee_id, opened_at, opening_cash, status, notes")
      .eq("business_id", authUser.businessId)
      .eq("status", "open")
      .order("opened_at", { ascending: false });

    if (authUser.employeeId) {
      query = query.eq("employee_id", authUser.employeeId);
    }

    const { data: activeShift, error } = await query.limit(1).maybeSingle();

    if (error) {
      console.error("Error fetching active shift:", error);
      return jsonResponse({ success: false, error: "Gagal mengecek status shift." }, { status: 500 });
    }

    return jsonResponse({
      success: true,
      has_active_shift: !!activeShift,
      shift: activeShift || null,
    });
  } catch (err: any) {
    const message = err.message || "";
    if (message.startsWith("UNAUTHORIZED")) return jsonResponse({ success: false, error: message }, { status: 401 });
    if (message.startsWith("FORBIDDEN")) return jsonResponse({ success: false, error: message }, { status: 403 });
    return jsonResponse({ success: false, error: "Gagal mengambil data shift." }, { status: 500 });
  }
}

// POST: Buka shift baru atau tutup shift yang sedang aktif
export async function POST(request: NextRequest) {
  try {
    const authUser = await validateMobileToken(request);
    const supabaseAdmin = getSupabaseAdmin();

    const body = await request.json().catch(() => ({}));
    const { action, opening_cash, shift_id, actual_closing_cash, notes } = body;

    // 1. Aksi Buka Shift
    if (action === "open") {
      const startCash = Number(opening_cash) || 0;

      // Cek apakah sudah ada shift yang berstatus 'open'
      let checkQuery = supabaseAdmin
        .from("pos_shifts")
        .select("id")
        .eq("business_id", authUser.businessId)
        .eq("status", "open");

      if (authUser.employeeId) {
        checkQuery = checkQuery.eq("employee_id", authUser.employeeId);
      }

      const { data: existing } = await checkQuery.limit(1).maybeSingle();
      if (existing) {
        return jsonResponse(
          { success: false, error: "Masih ada shift kasir yang aktif. Harap tutup shift sebelumnya terlebih dahulu." },
          { status: 400 }
        );
      }

      // Pastikan ada employee_id (jika owner yang buka dan belum punya employee row, ambil employee id atau cari/fallback)
      let targetEmployeeId = authUser.employeeId;
      if (!targetEmployeeId) {
        const { data: firstEmp } = await supabaseAdmin
          .from("employees")
          .select("id")
          .eq("business_id", authUser.businessId)
          .limit(1)
          .maybeSingle();
        targetEmployeeId = firstEmp?.id;
      }

      if (!targetEmployeeId) {
        return jsonResponse(
          { success: false, error: "Data karyawan tidak ditemukan untuk membuka shift." },
          { status: 400 }
        );
      }

      const { data: newShift, error: createErr } = await supabaseAdmin
        .from("pos_shifts")
        .insert({
          business_id: authUser.businessId,
          employee_id: targetEmployeeId,
          opening_cash: startCash,
          status: "open",
          opened_at: new Date().toISOString(),
          notes: notes || null,
        })
        .select("id, opened_at, opening_cash, status")
        .single();

      if (createErr || !newShift) {
        console.error("Error opening shift:", createErr);
        return jsonResponse({ success: false, error: "Gagal membuka shift kasir." }, { status: 500 });
      }

      return jsonResponse({
        success: true,
        message: "Shift kasir berhasil dibuka.",
        shift: newShift,
      }, { status: 201 });
    }

    // 2. Aksi Tutup Shift
    if (action === "close") {
      if (!shift_id) {
        return jsonResponse({ success: false, error: "ID Shift wajib disertakan untuk menutup shift." }, { status: 400 });
      }

      const actualCash = actual_closing_cash !== undefined ? Number(actual_closing_cash) : null;

      // Hitung total transaksi kas selama shift ini berlangsung
      const { data: shiftInvoices } = await supabaseAdmin
        .from("invoices")
        .select("total_amount")
        .eq("pos_shift_id", shift_id)
        .eq("status", "paid");

      let totalSales = 0;
      if (shiftInvoices) {
        for (const inv of shiftInvoices) {
          totalSales += Number(inv.total_amount) || 0;
        }
      }

      const { data: currentShift } = await supabaseAdmin
        .from("pos_shifts")
        .select("opening_cash")
        .eq("id", shift_id)
        .single();

      const expectedClosing = (Number(currentShift?.opening_cash) || 0) + totalSales;

      const { data: closedShift, error: closeErr } = await supabaseAdmin
        .from("pos_shifts")
        .update({
          status: "closed",
          closed_at: new Date().toISOString(),
          expected_closing_cash: expectedClosing,
          actual_closing_cash: actualCash,
          notes: notes || null,
        })
        .eq("id", shift_id)
        .select("id, opened_at, closed_at, opening_cash, expected_closing_cash, actual_closing_cash, status")
        .single();

      if (closeErr || !closedShift) {
        console.error("Error closing shift:", closeErr);
        return jsonResponse({ success: false, error: "Gagal menutup shift kasir." }, { status: 500 });
      }

      return jsonResponse({
        success: true,
        message: "Shift kasir berhasil ditutup.",
        shift: closedShift,
      });
    }

    return jsonResponse({ success: false, error: "Aksi tidak valid (gunakan 'open' atau 'close')." }, { status: 400 });
  } catch (err: any) {
    const message = err.message || "";
    if (message.startsWith("UNAUTHORIZED")) return jsonResponse({ success: false, error: message }, { status: 401 });
    if (message.startsWith("FORBIDDEN")) return jsonResponse({ success: false, error: message }, { status: 403 });
    return jsonResponse({ success: false, error: "Gagal memproses aksi shift." }, { status: 500 });
  }
}
