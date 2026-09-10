import { NextRequest } from "next/server";
import { getSupabaseAnon, verifyMobilePosToken, generateMobilePosToken } from "../../_helpers/auth";
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

    const cleanRefreshToken = refresh_token.trim();

    // 1. Jika token adalah Mobile POS Token, verifikasi dan kembalikan token valid
    const mobileUser = await verifyMobilePosToken(cleanRefreshToken);
    if (mobileUser) {
      const newToken = await generateMobilePosToken(mobileUser.userId, mobileUser.email);
      return jsonResponse({
        success: true,
        token: newToken,
        refresh_token: newToken,
        expires_in: 3153600000, // 100 tahun
      });
    }

    // 2. Fallback ke Supabase refreshSession untuk token lama, dan auto-upgrade ke Mobile POS Token
    const supabaseAnon = getSupabaseAnon();

    const { data, error } = await supabaseAnon.auth.refreshSession({
      refresh_token: cleanRefreshToken,
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

    const { user } = data;
    const mobileToken = user ? await generateMobilePosToken(user.id, user.email || "") : data.session.access_token;

    return jsonResponse({
      success: true,
      token: mobileToken,
      refresh_token: mobileToken,
      expires_in: 3153600000,
    });
  } catch (err: any) {
    console.error("Refresh Session Error:", err);
    return jsonResponse(
      { success: false, error: err.message || "Terjadi kesalahan internal server" },
      { status: 500 }
    );
  }
}
