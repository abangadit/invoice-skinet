import { NextRequest } from "next/server";
import { getSupabaseAnon, getSupabaseAdmin } from "../../_helpers/auth";
import { jsonResponse, handleOptions } from "../../_helpers/cors";

export const dynamic = "force-dynamic";

export async function OPTIONS() {
  return handleOptions();
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { email, password } = body;

    if (!email || !password) {
      return jsonResponse(
        { success: false, error: "Email dan kata sandi wajib diisi" },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();
    const supabaseAnon = getSupabaseAnon();

    // 1. Verifikasi kredensial ke Supabase Auth
    const { data: authData, error: authError } = await supabaseAnon.auth.signInWithPassword({
      email: cleanEmail,
      password,
    });

    if (authError || !authData.user || !authData.session) {
      return jsonResponse(
        { success: false, error: "Email atau kata sandi salah." },
        { status: 401 }
      );
    }

    const user = authData.user;
    const session = authData.session;
    const supabaseAdmin = getSupabaseAdmin();

    // 2. Cek apakah user adalah karyawan di tabel employees
    const { data: employee } = await supabaseAdmin
      .from("employees")
      .select("id, name, email, business_id, is_pos_access, is_active, role")
      .eq("user_id", user.id)
      .maybeSingle();

    if (employee) {
      if (employee.is_active === false) {
        return jsonResponse(
          { success: false, error: "Akun karyawan Anda telah dinonaktifkan." },
          { status: 403 }
        );
      }

      // Validasi krusial: cek hak akses POS
      if (!employee.is_pos_access) {
        return jsonResponse(
          {
            success: false,
            error: "Akses POS tidak diizinkan. Silakan hubungi admin bisnis Anda untuk membuka hak akses POS.",
          },
          { status: 403 }
        );
      }

      // Ambil info nama bisnis
      const { data: business } = await supabaseAdmin
        .from("businesses")
        .select("id, name")
        .eq("id", employee.business_id)
        .maybeSingle();

      return jsonResponse({
        success: true,
        token: session.access_token,
        refresh_token: session.refresh_token,
        user: {
          id: user.id,
          email: user.email,
          name: employee.name,
          employee_id: employee.id,
          business_id: employee.business_id,
          business_name: business?.name || "Bisnis",
          role: employee.role || "kasir",
          is_owner: false,
        },
      });
    }

    // 3. Cek apakah user adalah pemilik bisnis (owner)
    const { data: business } = await supabaseAdmin
      .from("businesses")
      .select("id, name")
      .eq("user_id", user.id)
      .maybeSingle();

    if (business) {
      return jsonResponse({
        success: true,
        token: session.access_token,
        refresh_token: session.refresh_token,
        user: {
          id: user.id,
          email: user.email,
          name: user.user_metadata?.full_name || user.email?.split("@")[0] || "Owner",
          business_id: business.id,
          business_name: business.name,
          role: "owner",
          is_owner: true,
        },
      });
    }

    return jsonResponse(
      {
        success: false,
        error: "Akun ini belum terhubung dengan data bisnis atau karyawan manapun.",
      },
      { status: 403 }
    );
  } catch (err: any) {
    console.error("Mobile Login Error:", err);
    return jsonResponse(
      { success: false, error: err.message || "Terjadi kesalahan internal server" },
      { status: 500 }
    );
  }
}
