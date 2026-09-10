import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

function getMobileJwtSecret(): string {
  return (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.JWT_SECRET ||
    "fallback-pos-secret-skinet-secure-key-2026"
  );
}

function base64UrlEncode(str: string | Buffer): string {
  const buf = typeof str === "string" ? Buffer.from(str, "utf-8") : str;
  return buf.toString("base64url");
}

function base64UrlDecode(str: string): string {
  return Buffer.from(str, "base64url").toString("utf-8");
}

/**
 * Menghasilkan token JWT khusus mobile POS tanpa batas kedaluwarsa (100 tahun) menggunakan crypto bawaan Node.js
 */
export async function generateMobilePosToken(userId: string, email: string): Promise<string> {
  const secret = getMobileJwtSecret();
  const header = base64UrlEncode(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const now = Math.floor(Date.now() / 1000);
  const payload = base64UrlEncode(
    JSON.stringify({
      sub: userId,
      email: email.toLowerCase(),
      type: "mobile_pos_token",
      iat: now,
      exp: now + 100 * 365 * 24 * 3600, // 100 tahun
    })
  );

  const signature = crypto
    .createHmac("sha256", secret)
    .update(`${header}.${payload}`)
    .digest("base64url");

  return `${header}.${payload}.${signature}`;
}

/**
 * Memverifikasi apakah token adalah Mobile POS JWT valid menggunakan crypto bawaan Node.js
 */
export async function verifyMobilePosToken(
  token: string
): Promise<{ userId: string; email: string } | null> {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const [headerB64, payloadB64, signature] = parts;
    const secret = getMobileJwtSecret();

    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(`${headerB64}.${payloadB64}`)
      .digest("base64url");

    // Bandingkan signature secara konstan untuk mencegah timing attack
    if (signature.length !== expectedSignature.length) return null;
    const sigBuf = Buffer.from(signature);
    const expBuf = Buffer.from(expectedSignature);
    if (!crypto.timingSafeEqual(sigBuf, expBuf)) {
      return null;
    }

    const payload = JSON.parse(base64UrlDecode(payloadB64));
    if (payload && payload.sub && payload.type === "mobile_pos_token") {
      return {
        userId: payload.sub as string,
        email: (payload.email as string) || "",
      };
    }
    return null;
  } catch {
    return null;
  }
}

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
  businessName?: string;
  employeeId?: string;
  name: string;
  role: string;
  isOwner: boolean;
}

export function checkHasPosPermission(role: string, permissions: any, isPosAccess?: boolean): boolean {
  const allowedRoles = ["admin", "owner", "kasir", "cashier", "sales", "finance"];
  if (allowedRoles.includes(role?.toLowerCase())) {
    return true;
  }
  if (isPosAccess === true) {
    return true;
  }
  if (permissions) {
    if (typeof permissions === "object") {
      if (permissions.pos === true || permissions.POS === true || permissions["kasir"] === true) {
        return true;
      }
      if (Array.isArray(permissions) && (permissions.includes("pos") || permissions.includes("kasir"))) {
        return true;
      }
    }
  }
  return false;
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
  let userId = "";
  let userEmail = "";
  let userMetadataName: string | undefined = undefined;

  // 1. Cek apakah ini Mobile POS Token (Non-Expiring)
  const mobilePayload = await verifyMobilePosToken(token);
  if (mobilePayload) {
    userId = mobilePayload.userId;
    userEmail = (mobilePayload.email || "").toLowerCase();
  } else {
    // 2. Fallback ke Supabase Gotrue token (backward compatibility)
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      throw new Error("UNAUTHORIZED: Token is invalid or has expired");
    }

    userId = user.id;
    userEmail = (user.email || "").toLowerCase();
    userMetadataName = user.user_metadata?.full_name;
  }

  // 1. Cek di tabel business_members (Sistem Tim & Hak Akses Menu Web)
  const { data: member } = await supabaseAdmin
    .from("business_members")
    .select("id, business_id, role, permissions, businesses ( id, name )")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (member) {
    const hasAccess = checkHasPosPermission(member.role, member.permissions);
    if (!hasAccess) {
      throw new Error("FORBIDDEN: Akses POS tidak diizinkan untuk akun ini. Hubungi admin untuk mengaktifkan izin 'Kasir Penjualan (POS)'.");
    }

    // Cari linked employee jika ada
    const { data: linkedEmp } = await supabaseAdmin
      .from("employees")
      .select("id, name")
      .or(`user_id.eq.${userId},email.ilike.${userEmail}`)
      .eq("business_id", member.business_id)
      .limit(1)
      .maybeSingle();

    const bizObj = member.businesses as any;
    const bizName = bizObj?.name || "Bisnis";

    return {
      userId: userId,
      email: userEmail,
      businessId: member.business_id,
      businessName: bizName,
      employeeId: linkedEmp?.id,
      name: linkedEmp?.name || userMetadataName || userEmail.split("@")[0],
      role: member.role || "staff",
      isOwner: member.role === "owner",
    };
  }

  // 2. Cek di tabel employees (Karyawan)
  const { data: employee } = await supabaseAdmin
    .from("employees")
    .select("id, name, email, business_id, is_pos_access, is_active, role")
    .or(`user_id.eq.${userId},email.ilike.${userEmail}`)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (employee) {
    if (employee.is_active === false) {
      throw new Error("FORBIDDEN: Status karyawan tidak aktif");
    }

    const hasAccess = checkHasPosPermission(employee.role, null, employee.is_pos_access);
    if (!hasAccess) {
      throw new Error("FORBIDDEN: Akses POS tidak diizinkan untuk akun ini.");
    }

    // Ambil info bisnis
    const { data: business } = await supabaseAdmin
      .from("businesses")
      .select("id, name")
      .eq("id", employee.business_id)
      .maybeSingle();

    return {
      userId: userId,
      email: userEmail || employee.email,
      businessId: employee.business_id,
      businessName: business?.name || "Bisnis",
      employeeId: employee.id,
      name: employee.name,
      role: employee.role || "staff",
      isOwner: false,
    };
  }

  // 3. Cek apakah user adalah pemilik bisnis (owner)
  const { data: business } = await supabaseAdmin
    .from("businesses")
    .select("id, name, user_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (business) {
    return {
      userId: userId,
      email: userEmail,
      businessId: business.id,
      businessName: business.name,
      name: userMetadataName || userEmail.split("@")[0] || "Owner",
      role: "owner",
      isOwner: true,
    };
  }

  throw new Error("FORBIDDEN: Akun ini belum terhubung dengan data bisnis manapun.");
}
