import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ error: "Missing Supabase server credentials" }, { status: 500 });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceKey);
    const body = await request.json();
    const {
      email,
      password,
      full_name,
      business_id,
      role = "staff",
      permissions = {},
      employee_id,
      reset_password
    } = body;

    if (!email || !email.trim()) {
      return NextResponse.json({ error: "Alamat email wajib diisi." }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    let targetUserId: string | null = null;

    // 1. Cek apakah user sudah ada di public.users
    const { data: existingUser } = await supabaseAdmin
      .from("users")
      .select("id, email, full_name")
      .ilike("email", cleanEmail)
      .maybeSingle();

    if (existingUser) {
      targetUserId = existingUser.id;

      // Jika ada instruksi reset/update password
      if (reset_password || password) {
        const newPass = reset_password || password;
        if (newPass.length < 6) {
          return NextResponse.json({ error: "Password minimal 6 karakter." }, { status: 400 });
        }
        const { error: updateAuthErr } = await supabaseAdmin.auth.admin.updateUserById(
          existingUser.id,
          { password: newPass }
        );
        if (updateAuthErr) {
          console.error("Error updating auth password:", updateAuthErr);
        }
      }
    } else {
      // 2. Buat user baru di Supabase Auth
      if (!password || password.length < 6) {
        return NextResponse.json(
          { error: "Password untuk akun baru wajib diisi (minimal 6 karakter)." },
          { status: 400 }
        );
      }

      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: cleanEmail,
        password,
        email_confirm: true,
        user_metadata: { full_name: full_name || cleanEmail.split("@")[0] },
      });

      if (authError) {
        return NextResponse.json({ error: authError.message }, { status: 400 });
      }

      if (!authData.user) {
        return NextResponse.json({ error: "Gagal membuat akun otentikasi." }, { status: 500 });
      }

      targetUserId = authData.user.id;

      // 3. Daftarkan di public.users (sebagai non-tenant/anggota tim)
      const now = new Date().toISOString();
      const { error: upsertErr } = await supabaseAdmin.from("users").upsert({
        id: targetUserId,
        email: cleanEmail,
        full_name: full_name || cleanEmail.split("@")[0],
        role: "user",
        is_tenant: false,
        is_active: true,
        activated_at: now,
        expires_at: null, // Diwariskan dari bisnis aktif
      });

      if (upsertErr) {
        console.error("Error upserting public.users:", upsertErr);
      }
    }

    // 4. Hubungkan ke business_members
    if (business_id && targetUserId) {
      const { data: existingMember } = await supabaseAdmin
        .from("business_members")
        .select("id")
        .eq("business_id", business_id)
        .eq("user_id", targetUserId)
        .maybeSingle();

      if (existingMember) {
        const { error: updateMemErr } = await supabaseAdmin
          .from("business_members")
          .update({
            role,
            permissions: role === "custom" ? permissions : {},
          })
          .eq("id", existingMember.id);

        if (updateMemErr) throw updateMemErr;
      } else {
        const { error: insertMemErr } = await supabaseAdmin
          .from("business_members")
          .insert({
            business_id,
            user_id: targetUserId,
            role,
            permissions: role === "custom" ? permissions : {},
          });

        if (insertMemErr) throw insertMemErr;
      }
    }

    // 5. Hubungkan ke data employees (jika ada employee_id)
    if (employee_id && targetUserId) {
      await supabaseAdmin
        .from("employees")
        .update({
          user_id: targetUserId,
          email: cleanEmail,
        })
        .eq("id", employee_id);
    }

    return NextResponse.json({
      success: true,
      user_id: targetUserId,
      message: "Akun login dan hak akses karyawan berhasil disimpan!",
    });
  } catch (err: any) {
    console.error("Employee Auth API Error:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
