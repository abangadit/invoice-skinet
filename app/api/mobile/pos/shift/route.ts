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
      .select("id, business_id, employee_id, opened_at, opening_cash, expected_closing_cash, status, notes")
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

      // Pastikan ada employee_id
      let targetEmployeeId = authUser.employeeId;
      if (!targetEmployeeId) {
        const { data: existingEmp } = await supabaseAdmin
          .from("employees")
          .select("id")
          .or(`user_id.eq.${authUser.userId},email.ilike.${authUser.email}`)
          .eq("business_id", authUser.businessId)
          .limit(1)
          .maybeSingle();

        if (existingEmp) {
          targetEmployeeId = existingEmp.id;
        } else {
          // Buat record employee otomatis
          const { data: newEmp } = await supabaseAdmin
            .from("employees")
            .insert({
              business_id: authUser.businessId,
              user_id: authUser.userId,
              name: authUser.name || "Kasir",
              email: authUser.email,
              role: "kasir",
              is_pos_access: true,
              is_active: true,
            })
            .select("id")
            .single();
          targetEmployeeId = newEmp?.id;
        }
      }

      if (!targetEmployeeId) {
        return jsonResponse(
          { success: false, error: "Data karyawan kasir tidak dapat diinisialisasi." },
          { status: 400 }
        );
      }

      const { data: newShift, error: createErr } = await supabaseAdmin
        .from("pos_shifts")
        .insert({
          business_id: authUser.businessId,
          employee_id: targetEmployeeId,
          opening_cash: startCash,
          expected_closing_cash: startCash,
          status: "open",
          opened_at: new Date().toISOString(),
          notes: notes || null,
        })
        .select("id, opened_at, opening_cash, expected_closing_cash, status")
        .single();

      if (createErr || !newShift) {
        console.error("Error opening shift:", createErr);
        return jsonResponse({ success: false, error: "Gagal membuka shift kasir." }, { status: 500 });
      }

      return jsonResponse({
        success: true,
        message: "Shift kasir berhasil dibuka.",
        shift: newShift,
      });
    }

    // 2. Aksi Tutup Shift
    if (action === "close") {
      let targetShiftId = shift_id;

      if (!targetShiftId) {
        let findQuery = supabaseAdmin
          .from("pos_shifts")
          .select("id")
          .eq("business_id", authUser.businessId)
          .eq("status", "open");

        if (authUser.employeeId) {
          findQuery = findQuery.eq("employee_id", authUser.employeeId);
        }

        const { data: active } = await findQuery.limit(1).maybeSingle();
        targetShiftId = active?.id;
      }

      if (!targetShiftId) {
        return jsonResponse(
          { success: false, error: "Tidak ditemukan shift kasir aktif untuk ditutup." },
          { status: 400 }
        );
      }

      // Hitung total uang tunai yang masuk selama shift ini
      const { data: invoices } = await supabaseAdmin
        .from("invoices")
        .select("total_amount, payment_methods")
        .eq("pos_shift_id", targetShiftId)
        .eq("status", "paid");

      const { data: shiftCurrent } = await supabaseAdmin
        .from("pos_shifts")
        .select("opening_cash")
        .eq("id", targetShiftId)
        .single();

      let cashSales = 0;
      (invoices || []).forEach((inv) => {
        const method = Array.isArray(inv.payment_methods) && inv.payment_methods.length > 0
          ? inv.payment_methods[0].toLowerCase()
          : "cash";
        if (method === "cash" || method === "tunai") {
          cashSales += Number(inv.total_amount || 0);
        }
      });

      const openingCash = Number(shiftCurrent?.opening_cash || 0);
      const expectedCash = openingCash + cashSales;
      const actualCash = actual_closing_cash !== undefined ? Number(actual_closing_cash) : expectedCash;

      const { error: closeErr } = await supabaseAdmin
        .from("pos_shifts")
        .update({
          status: "closed",
          closed_at: new Date().toISOString(),
          expected_closing_cash: expectedCash,
          actual_closing_cash: actualCash,
          notes: notes || null,
        })
        .eq("id", targetShiftId);

      if (closeErr) {
        console.error("Error closing shift:", closeErr);
        return jsonResponse({ success: false, error: "Gagal menutup shift kasir." }, { status: 500 });
      }

      return jsonResponse({
        success: true,
        message: "Shift kasir berhasil ditutup.",
        expected_closing_cash: expectedCash,
        actual_closing_cash: actualCash,
      });
    }

    return jsonResponse(
      { success: false, error: "Aksi tidak dikenali. Gunakan action 'open' atau 'close'." },
      { status: 400 }
    );
  } catch (err: any) {
    const message = err.message || "";
    if (message.startsWith("UNAUTHORIZED")) return jsonResponse({ success: false, error: message }, { status: 401 });
    if (message.startsWith("FORBIDDEN")) return jsonResponse({ success: false, error: message }, { status: 403 });
    return jsonResponse({ success: false, error: "Gagal memproses aksi shift." }, { status: 500 });
  }
}
