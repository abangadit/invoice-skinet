import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ error: "Missing Supabase server credentials" }, { status: 500 });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceKey);

    const { data: users, error } = await supabaseAdmin
      .from("users")
      .select("*, businesses(id, name, is_protected)")
      .eq("is_tenant", true)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return NextResponse.json({ data: users });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ error: "Missing Supabase server credentials" }, { status: 500 });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceKey);

    const body = await request.json();
    const { full_name, email, password, business_name } = body;

    if (!email || !password || !full_name) {
      return NextResponse.json({ error: "Nama, email, dan kata sandi wajib diisi." }, { status: 400 });
    }

    // 1. Cek limit 25 user (Hanya tenant/PT yang didaftarkan superadmin yang memakan kuota)
    const { data: config } = await supabaseAdmin
      .from("whitelabel_config")
      .select("max_users, subscription_months")
      .single();

    const maxUsers = config?.max_users || 25;
    const subMonths = config?.subscription_months || 12;

    const { count } = await supabaseAdmin
      .from("users")
      .select("*", { count: "exact", head: true })
      .eq("is_tenant", true)
      .eq("is_active", true);

    if (count !== null && count >= maxUsers) {
      return NextResponse.json(
        { error: `Batas maksimum ${maxUsers} user aktif telah tercapai. Hapus atau nonaktifkan user lain terlebih dahulu.` },
        { status: 400 }
      );
    }

    // 2. Buat akun di auth.users
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name },
    });

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    if (!authUser.user) {
      return NextResponse.json({ error: "Gagal membuat pengguna." }, { status: 500 });
    }

    // 3. Setup masa aktif (kustom atau default 12 bulan)
    const now = new Date();
    let finalExpiresAt: Date;
    if (body.expires_at) {
      finalExpiresAt = new Date(body.expires_at);
    } else {
      finalExpiresAt = new Date();
      finalExpiresAt.setMonth(finalExpiresAt.getMonth() + subMonths);
    }

    // Upsert / update profil di public.users
    await supabaseAdmin.from("users").upsert({
      id: authUser.user.id,
      email,
      full_name,
      role: "user",
      is_tenant: true,
      is_active: true,
      activated_at: now.toISOString(),
      expires_at: finalExpiresAt.toISOString(),
    });

    // 4. Buat 1 bisnis default untuk user
    const { error: bizError } = await supabaseAdmin.from("businesses").insert({
      user_id: authUser.user.id,
      name: business_name || `Bisnis ${full_name}`,
      invoice_prefix: "INV",
      invoice_number_format: "INV/[YYYY]/[MM]/[NO]",
      invoice_counter: 1,
      default_currency: "IDR",
      default_due_days: 14,
      template_id: "modern",
      template_color: "#004de6",
      is_protected: true,
    });

    if (bizError) {
      console.error("Warning: Gagal membuat bisnis default:", bizError);
    }

    return NextResponse.json({ success: true, user_id: authUser.user.id });
  } catch (err: any) {
    console.error("Admin create user error:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ error: "Missing Supabase server credentials" }, { status: 500 });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceKey);
    const body = await request.json();
    const { id, is_active, extend_months, expires_at, full_name, reset_password } = body;

    if (!id) {
      return NextResponse.json({ error: "User ID required" }, { status: 400 });
    }

    // Aksi Reset Password
    if (reset_password) {
      const { error: resetErr } = await supabaseAdmin.auth.admin.updateUserById(id, {
        password: reset_password,
      });
      if (resetErr) throw resetErr;
      return NextResponse.json({ success: true, message: "Password berhasil diperbarui" });
    }

    // Aksi Update Status / Perpanjangan / Kustom Tanggal Kadaluarsa
    const updates: any = {};
    if (typeof is_active === "boolean") {
      updates.is_active = is_active;
    }
    if (full_name) {
      updates.full_name = full_name;
    }
    if (expires_at) {
      updates.expires_at = new Date(expires_at).toISOString();
    } else if (extend_months) {
      const { data: user } = await supabaseAdmin
        .from("users")
        .select("expires_at")
        .eq("id", id)
        .single();

      let baseDate = new Date();
      if (user?.expires_at && new Date(user.expires_at) > baseDate) {
        baseDate = new Date(user.expires_at);
      }
      baseDate.setMonth(baseDate.getMonth() + Number(extend_months));
      updates.expires_at = baseDate.toISOString();
    }

    if (Object.keys(updates).length > 0) {
      const { error } = await supabaseAdmin.from("users").update(updates).eq("id", id);
      if (error) throw error;
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ error: "Missing Supabase server credentials" }, { status: 500 });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceKey);
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "User ID required" }, { status: 400 });
    }

    // 1. Panggil fungsi cascade delete di database PostgreSQL
    const { error: rpcErr } = await supabaseAdmin.rpc("delete_user_cascade", { p_user_id: id });
    if (rpcErr) {
      console.error("delete_user_cascade RPC error:", rpcErr);
      // Direct delete fallback
      await supabaseAdmin.from("business_members").delete().eq("user_id", id);
      await supabaseAdmin.from("businesses").delete().eq("user_id", id);
      const { error: delUserErr } = await supabaseAdmin.from("users").delete().eq("id", id);
      if (delUserErr) {
        console.error("Fallback delete user error:", delUserErr);
        throw delUserErr;
      }
    }

    // 2. Hapus dari auth.users
    try {
      await supabaseAdmin.auth.admin.deleteUser(id);
    } catch (e) {
      console.warn("User not found in auth.users:", e);
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("DELETE user API error:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
