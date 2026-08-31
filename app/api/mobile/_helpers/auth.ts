import { createClient } from "@supabase/supabase-js";

export function getSupabaseUrl() {
  return (
    process.env.INTERNAL_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    "http://127.0.0.1:8000"
  );
}

export function getSupabaseAdmin() {
  const supabaseUrl = getSupabaseUrl();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not defined in environment variables");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export function getSupabaseAnon() {
  const supabaseUrl = getSupabaseUrl();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!anonKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY is not defined in environment variables");
  }

  return createClient(supabaseUrl, anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export interface AuthenticatedMobileUser {
  userId: string;
  email: string;
  businessId: string;
  employeeId?: string;
  name: string;
  role: string;
  isOwner: boolean;
}

export async function validateMobileToken(request: Request): Promise<AuthenticatedMobileUser> {
  const authHeader = request.headers.get("Authorization") || request.headers.get("authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new Error("UNAUTHORIZED: Missing or invalid Authorization header");
  }

  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) {
    throw new Error("UNAUTHORIZED: Empty token provided");
  }

  const supabaseAdmin = getSupabaseAdmin();
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

  if (authError || !user) {
    throw new Error("UNAUTHORIZED: Token is invalid or has expired");
  }

  // 1. Cek apakah user adalah karyawan dengan hak akses POS
  const { data: employee } = await supabaseAdmin
    .from("employees")
    .select("id, name, email, business_id, is_pos_access, is_active, role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (employee) {
    if (employee.is_active === false) {
      throw new Error("FORBIDDEN: Status karyawan tidak aktif");
    }

    if (!employee.is_pos_access) {
      throw new Error("FORBIDDEN: Hak akses POS tidak diizinkan untuk akun ini");
    }

    return {
      userId: user.id,
      email: user.email || employee.email,
      businessId: employee.business_id,
      employeeId: employee.id,
      name: employee.name,
      role: employee.role || "staff",
      isOwner: false,
    };
  }

  // 2. Jika bukan karyawan, cek apakah user adalah pemilik bisnis (owner)
  const { data: business } = await supabaseAdmin
    .from("businesses")
    .select("id, name, user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (business) {
    return {
      userId: user.id,
      email: user.email || "",
      businessId: business.id,
      name: user.user_metadata?.full_name || user.email?.split("@")[0] || "Owner",
      role: "owner",
      isOwner: true,
    };
  }

  throw new Error("FORBIDDEN: Akun tidak terhubung dengan bisnis manapun");
}
