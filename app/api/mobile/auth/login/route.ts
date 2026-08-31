import { NextRequest } from "next/server";
import { getSupabaseAnon, getSupabaseAdmin, checkHasPosPermission } from "../../_helpers/auth";
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

    // 2. Cek di tabel business_members (Sistem Tim & Hak Akses Web)
    const { data: member } = await supabaseAdmin
      .from("business_members")
      .select("id, business_id, role, permissions, businesses ( id, name )")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (member) {
      const hasAccess = checkHasPosPermission(member.role, member.permissions);
      if (!hasAccess) {
        return jsonResponse(
          {
            success: false,
            error: "Akses POS tidak diizinkan. Silakan hubungi admin bisnis Anda untuk mengaktifkan centang izin 'Kasir Penjualan (POS)'.",
          },
          { status: 403 }
        );
      }

      // Auto sync / cari data employee jika ada
      const { data: linkedEmp } = await supabaseAdmin
        .from("employees")
        .select("id, name, user_id")
        .or(`user_id.eq.${user.id},email.ilike.${cleanEmail}`)
        .eq("business_id", member.business_id)
        .limit(1)
        .maybeSingle();

      if (linkedEmp && !linkedEmp.user_id) {
        await supabaseAdmin.from("employees").update({ user_id: user.id }).eq("id", linkedEmp.id);
      }

      const bizObj = member.businesses as any;
      const bizName = bizObj?.name || "Bisnis";

      return jsonResponse({
        success: true,
        token: session.access_token,
        refresh_token: session.refresh_token,
        user: {
          id: user.id,
          email: user.email,
          name: linkedEmp?.name || user.user_metadata?.full_name || cleanEmail.split("@")[0],
          employee_id: linkedEmp?.id,
          business_id: member.business_id,
          business_name: bizName,
          role: member.role || "staff",
          is_owner: member.role === "owner",
        },
      });
    }

    // 3. Cek di tabel employees (Karyawan)
    const { data: employee } = await supabaseAdmin
      .from("employees")
      .select("id, name, email, business_id, is_pos_access, is_active, role, user_id")
      .or(`user_id.eq.${user.id},email.ilike.${cleanEmail}`)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (employee) {
      if (employee.is_active === false) {
        return jsonResponse(
          { success: false, error: "Akun karyawan Anda telah dinonaktifkan." },
          { status: 403 }
        );
      }

      const hasAccess = checkHasPosPermission(employee.role, null, employee.is_pos_access);
      if (!hasAccess) {
        return jsonResponse(
          {
            success: false,
            error: "Akses POS tidak diizinkan. Silakan hubungi admin bisnis Anda untuk membuka hak akses POS.",
          },
          { status: 403 }
        );
      }

      if (!employee.user_id) {
        await supabaseAdmin.from("employees").update({ user_id: user.id }).eq("id", employee.id);
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

    // 4. Cek apakah user adalah pemilik bisnis (owner)
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
          name: user.user_metadata?.full_name || cleanEmail.split("@")[0] || "Owner",
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
        error: "Akun ini belum terhubung dengan data tim atau bisnis manapun.",
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
