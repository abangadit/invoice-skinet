import { NextRequest } from "next/server";
import { getSupabaseAnon } from "../../_helpers/auth";
import { jsonResponse, handleOptions } from "../../_helpers/cors";

export const dynamic = "force-dynamic";

export async function OPTIONS() {
  return handleOptions();
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { refresh_token } = body;

    if (!refresh_token || typeof refresh_token !== "string") {
      return jsonResponse(
        { success: false, error: "Refresh token wajib dikirimkan." },
        { status: 400 }
      );
    }

    const supabaseAnon = getSupabaseAnon();

    const { data, error } = await supabaseAnon.auth.refreshSession({
      refresh_token: refresh_token.trim(),
    });

    if (error || !data.session) {
      console.error("Supabase Refresh Token Error:", error?.message);
      return jsonResponse(
        {
          success: false,
          error: error?.message || "Sesi telah berakhir, silakan login kembali.",
        },
        { status: 401 }
      );
    }

    const { session } = data;

    return jsonResponse({
      success: true,
      token: session.access_token,
      refresh_token: session.refresh_token,
      expires_in: session.expires_in,
      expires_at: session.expires_at,
    });
  } catch (err: any) {
    console.error("Refresh Session Error:", err);
    return jsonResponse(
      { success: false, error: err.message || "Terjadi kesalahan internal server" },
      { status: 500 }
    );
  }
}
