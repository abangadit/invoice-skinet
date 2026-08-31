import { NextRequest } from "next/server";
import { validateMobileToken, getSupabaseAdmin } from "../../_helpers/auth";
import { jsonResponse, handleOptions } from "../../_helpers/cors";
import crypto from "crypto";

export const dynamic = "force-dynamic";

export async function OPTIONS() {
  return handleOptions();
}

function generateInvoiceNumber() {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, "");
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `POS-${dateStr}-${randomSuffix}`;
}

function generatePublicToken() {
  return crypto.randomBytes(6).toString("base64url").slice(0, 8);
}

export async function POST(request: NextRequest) {
  try {
    const authUser = await validateMobileToken(request);
    const supabaseAdmin = getSupabaseAdmin();

    const body = await request.json().catch(() => ({}));
    const {
      shift_id,
      payment_method = "cash",
      paid_amount,
      notes,
      customer_id,
      items,
    } = body;

    if (!Array.isArray(items) || items.length === 0) {
      return jsonResponse(
        { success: false, error: "Keranjang belanja tidak boleh kosong." },
        { status: 400 }
      );
    }

    // Cari shift aktif jika shift_id tidak dikirim
    let effectiveShiftId = shift_id;
    if (!effectiveShiftId) {
      let shiftQuery = supabaseAdmin
        .from("pos_shifts")
        .select("id")
        .eq("business_id", authUser.businessId)
        .eq("status", "open")
        .order("opened_at", { ascending: false });

      if (authUser.employeeId) {
        shiftQuery = shiftQuery.eq("employee_id", authUser.employeeId);
      }

      const { data: openShift } = await shiftQuery.limit(1).maybeSingle();
      if (openShift) {
        effectiveShiftId = openShift.id;
      }
    }

    // 1. Hitung total amount dari item
    let computedSubtotal = 0;
    const validatedItems: Array<{
      item_id: string | null;
      name: string;
      unit: string;
      quantity: number;
      unit_price: number;
      subtotal: number;
    }> = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const qty = Number(item.qty || item.quantity) || 1;
      const price = Number(item.unit_price || item.price) || 0;
      const subtotal = qty * price;
      computedSubtotal += subtotal;

      validatedItems.push({
        item_id: item.item_id || item.id || null,
        name: item.name || `Item ${i + 1}`,
        unit: item.unit || "pcs",
        quantity: qty,
        unit_price: price,
        subtotal: subtotal,
      });
    }

    const totalAmount = computedSubtotal;
    const receivedAmount = Number(paid_amount) || totalAmount;
    const changeAmount = Math.max(0, receivedAmount - totalAmount);

    if (receivedAmount < totalAmount && payment_method === "cash") {
      return jsonResponse(
        {
          success: false,
          error: `Nominal uang yang diterima (Rp ${receivedAmount}) kurang dari total tagihan (Rp ${totalAmount}).`,
        },
        { status: 400 }
      );
    }

    const todayStr = new Date().toISOString().slice(0, 10);
    const invoiceNumber = generateInvoiceNumber();
    const publicToken = generatePublicToken();

    // 2. Simpan Invoice ke public.invoices
    const { data: invoice, error: invoiceErr } = await supabaseAdmin
      .from("invoices")
      .insert({
        business_id: authUser.businessId,
        customer_id: customer_id || null,
        invoice_number: invoiceNumber,
        type: "invoice",
        status: "paid",
        issue_date: todayStr,
        due_date: todayStr,
        currency: "IDR",
        subtotal: totalAmount,
        discount_amount: 0,
        taxes_amount: 0,
        shipping_amount: 0,
        total_amount: totalAmount,
        paid_amount: totalAmount,
        remaining_amount: 0,
        payment_methods: [payment_method],
        notes: notes || null,
        stamp_paid: true,
        pos_shift_id: effectiveShiftId || null,
        public_token: publicToken,
      })
      .select("id, invoice_number, created_at")
      .single();

    if (invoiceErr || !invoice) {
      console.error("Error creating invoice:", invoiceErr);
      return jsonResponse(
        { success: false, error: invoiceErr?.message || "Gagal menyimpan faktur penjualan." },
        { status: 500 }
      );
    }

    // 3. Simpan Invoice Items ke public.invoice_items
    const invoiceItemsPayload = validatedItems.map((v, index) => ({
      invoice_id: invoice.id,
      item_id: v.item_id,
      sort_order: index + 1,
      name: v.name,
      quantity: v.quantity,
      unit: v.unit,
      unit_price: v.unit_price,
      subtotal: v.subtotal,
      tax_included: true,
    }));

    const { error: itemsErr } = await supabaseAdmin
      .from("invoice_items")
      .insert(invoiceItemsPayload);

    if (itemsErr) {
      console.error("Error creating invoice items:", itemsErr);
    }

    // 4. Catat Riwayat Pembayaran ke public.payments
    const { error: paymentErr } = await supabaseAdmin
      .from("payments")
      .insert({
        invoice_id: invoice.id,
        amount: totalAmount,
        payment_date: todayStr,
        method: payment_method,
        notes: `Transaksi POS Kasir (Diterima: Rp ${receivedAmount}, Kembalian: Rp ${changeAmount})`,
        created_by: authUser.userId,
      });

    if (paymentErr) {
      console.error("Error recording payment:", paymentErr);
    }

    // 5. Update expected_closing_cash pada pos_shifts jika pembayaran tunai
    if (effectiveShiftId && (payment_method === "cash" || payment_method === "tunai")) {
      const { data: curShift } = await supabaseAdmin
        .from("pos_shifts")
        .select("expected_closing_cash")
        .eq("id", effectiveShiftId)
        .single();

      if (curShift) {
        await supabaseAdmin
          .from("pos_shifts")
          .update({
            expected_closing_cash: Number(curShift.expected_closing_cash || 0) + totalAmount,
          })
          .eq("id", effectiveShiftId);
      }
    }

    // 6. Kurangi Stok pada item_stocks
    for (const item of validatedItems) {
      if (!item.item_id) continue;

      const { data: stockRow } = await supabaseAdmin
        .from("item_stocks")
        .select("id, quantity")
        .eq("item_id", item.item_id)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (stockRow) {
        const newQty = Math.max(0, Number(stockRow.quantity || 0) - item.quantity);
        await supabaseAdmin
          .from("item_stocks")
          .update({ quantity: newQty })
          .eq("id", stockRow.id);
      }
    }

    return jsonResponse({
      success: true,
      data: {
        invoice_id: invoice.id,
        invoice_number: invoice.invoice_number,
        total_amount: totalAmount,
        paid_amount: receivedAmount,
        change_amount: changeAmount,
        payment_method: payment_method,
        pos_shift_id: effectiveShiftId || null,
        created_at: invoice.created_at,
      },
    });
  } catch (err: any) {
    console.error("POS Transaction Error:", err);
    const message = err.message || "";
    if (message.startsWith("UNAUTHORIZED")) {
      return jsonResponse({ success: false, error: message }, { status: 401 });
    }
    if (message.startsWith("FORBIDDEN")) {
      return jsonResponse({ success: false, error: message }, { status: 403 });
    }
    return jsonResponse(
      { success: false, error: err.message || "Gagal memproses transaksi penjualan." },
      { status: 500 }
    );
  }
}
