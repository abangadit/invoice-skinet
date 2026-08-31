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
    const search = searchParams.get("search")?.trim();

    // 1. Query items milik bisnis
    let itemsQuery = supabaseAdmin
      .from("items")
      .select("id, name, description, unit, unit_price, sku, minimum_stock, created_at")
      .eq("business_id", authUser.businessId)
      .order("name", { ascending: true });

    if (search) {
      itemsQuery = itemsQuery.or(`name.ilike.%${search}%,sku.ilike.%${search}%,description.ilike.%${search}%`);
    }

    const { data: items, error: itemsError } = await itemsQuery;

    if (itemsError) {
      console.error("Error fetching items:", itemsError);
      return jsonResponse({ success: false, error: "Gagal mengambil data produk." }, { status: 500 });
    }

    if (!items || items.length === 0) {
      return jsonResponse({ success: true, data: [] });
    }

    // 2. Ambil total stok dari tabel item_stocks
    const itemIds = items.map((i) => i.id);
    const { data: stocks, error: stocksError } = await supabaseAdmin
      .from("item_stocks")
      .select("item_id, stock_quantity")
      .in("item_id", itemIds);

    if (stocksError) {
      console.error("Error fetching stocks:", stocksError);
    }

    // 3. Hitung total agregat stok per item_id
    const stockMap: Record<string, number> = {};
    if (stocks) {
      for (const s of stocks) {
        const qty = Number(s.stock_quantity) || 0;
        stockMap[s.item_id] = (stockMap[s.item_id] || 0) + qty;
      }
    }

    // 4. Format data untuk POS
    const formatted = items.map((item) => ({
      id: item.id,
      name: item.name,
      description: item.description || "",
      unit: item.unit || "PCS",
      price: Number(item.unit_price) || 0,
      sku: item.sku || "-",
      stock: stockMap[item.id] !== undefined ? stockMap[item.id] : 0,
    }));

    return jsonResponse({
      success: true,
      data: formatted,
    });
  } catch (err: any) {
    const message = err.message || "";
    if (message.startsWith("UNAUTHORIZED")) {
      return jsonResponse({ success: false, error: message }, { status: 401 });
    }
    if (message.startsWith("FORBIDDEN")) {
      return jsonResponse({ success: false, error: message }, { status: 403 });
    }
    console.error("Mobile Products API Error:", err);
    return jsonResponse({ success: false, error: "Gagal memuat produk." }, { status: 500 });
  }
}
