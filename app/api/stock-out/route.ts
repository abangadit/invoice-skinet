import { NextRequest, NextResponse } from "next/server";
import { createWebServerClient } from "../../../lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = createWebServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { business_id, item_id, warehouse_id, quantity, reason, notes, out_date, recipient_name } = body;

    if (!business_id || !item_id || !quantity) {
      return NextResponse.json({ error: "Field wajib tidak lengkap (produk, jumlah wajib diisi)" }, { status: 400 });
    }

    const numQty = parseFloat(quantity);
    if (isNaN(numQty) || numQty <= 0) {
      return NextResponse.json({ error: "Jumlah barang keluar harus lebih dari 0" }, { status: 400 });
    }

    // 1. Ambil data item & unit cost
    const { data: itemData } = await supabase
      .from("items")
      .select("id, name, unit, cogs_unit_price")
      .eq("id", item_id)
      .eq("business_id", business_id)
      .single();

    // Cek harga pokok dari item_stocks jika ada spesifik gudang
    let unit_cost = itemData?.cogs_unit_price || 0;
    if (warehouse_id) {
      const { data: stockData } = await supabase
        .from("item_stocks")
        .select("cogs_unit_price")
        .eq("item_id", item_id)
        .eq("warehouse_id", warehouse_id)
        .maybeSingle();

      if (stockData?.cogs_unit_price) {
        unit_cost = stockData.cogs_unit_price;
      }
    }

    // 2. Generate Nomor Dokumen Pengeluaran Barang (OUT/YYYY/MM/XXXX)
    const today = out_date ? new Date(out_date) : new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");

    const { count } = await supabase
      .from("stock_out")
      .select("id", { count: "exact", head: true })
      .eq("business_id", business_id);

    const counter = (count || 0) + 1;
    const stock_out_number = `OUT/${year}/${month}/${String(counter).padStart(4, "0")}`;

    // 3. Insert ke tabel stock_out
    const { data: stockOut, error: stockOutError } = await supabase
      .from("stock_out")
      .insert({
        business_id,
        item_id,
        warehouse_id: warehouse_id || null,
        stock_out_number,
        recipient_name: recipient_name || null,
        quantity: numQty,
        unit_cost,
        reason: reason || "other",
        notes: notes || null,
        out_date: out_date || new Date().toISOString().split("T")[0],
        created_by: user.id,
      })
      .select(`
        *,
        items (name, unit),
        warehouses (name)
      `)
      .single();

    if (stockOutError) throw stockOutError;

    // 4. Insert ke stock_movements (adjustment_sub untuk trigger process_stock_out)
    await supabase.from("stock_movements").insert({
      business_id,
      item_id,
      quantity: numQty,
      type: "adjustment_sub",
      unit: itemData?.unit || "pcs",
      warehouse_id: warehouse_id || null,
      unit_cost,
      reference_id: stockOut.id,
      notes: `Barang Keluar [${stock_out_number}]: ${reason}${notes ? ' - ' + notes : ''}`,
    });

    return NextResponse.json({ success: true, data: stockOut });
  } catch (err: any) {
    console.error("Stock out error:", err);
    return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
  }
}

