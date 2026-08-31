import { NextRequest } from "next/server";
import { validateMobileToken, getSupabaseAdmin } from "../../../_helpers/auth";
import { jsonResponse, handleOptions } from "../../../_helpers/cors";

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
    }

    const { data: invoices, error } = await query;

    if (error) {
      console.error("Error fetching sales history:", error);
      return jsonResponse({ success: false, error: "Gagal memuat riwayat penjualan." }, { status: 500 });
    }

    const formatted = (invoices || []).map((inv) => {
      const paymentMethod = Array.isArray(inv.payment_methods) && inv.payment_methods.length > 0
        ? inv.payment_methods[0]
        : "cash";

      return {
        id: inv.id,
        invoice_number: inv.invoice_number,
        date: inv.created_at || inv.issue_date,
        total_amount: Number(inv.total_amount) || 0,
        paid_amount: Number(inv.paid_amount) || 0,
        payment_method: paymentMethod,
        notes: inv.notes,
        items_count: Array.isArray(inv.invoice_items) ? inv.invoice_items.length : 0,
        items: inv.invoice_items || [],
      };
    });

    return jsonResponse({
      success: true,
      data: formatted,
    });
  } catch (err: any) {
    const message = err.message || "";
    if (message.startsWith("UNAUTHORIZED")) return jsonResponse({ success: false, error: message }, { status: 401 });
    if (message.startsWith("FORBIDDEN")) return jsonResponse({ success: false, error: message }, { status: 403 });
    return jsonResponse({ success: false, error: "Gagal memuat riwayat transaksi." }, { status: 500 });
  }
}
