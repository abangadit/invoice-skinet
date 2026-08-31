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

    const { data: business } = await supabaseAdmin
      .from("businesses")
      .select("id, name")
      .eq("id", authUser.businessId)
      .maybeSingle();

    return jsonResponse({
      success: true,
      user: {
        id: authUser.userId,
        email: authUser.email,
        name: authUser.name,
        employee_id: authUser.employeeId,
        business_id: authUser.businessId,
        business_name: business?.name || "Bisnis",
        role: authUser.role,
        is_owner: authUser.isOwner,
      },
    });
  } catch (err: any) {
    const message = err.message || "";
    if (message.startsWith("UNAUTHORIZED")) {
      return jsonResponse({ success: false, error: message }, { status: 401 });
    }
    if (message.startsWith("FORBIDDEN")) {
      return jsonResponse({ success: false, error: message }, { status: 403 });
    }
    return jsonResponse({ success: false, error: "Gagal memverifikasi sesi." }, { status: 500 });
  }
}
