import { SupabaseClient } from "@supabase/supabase-js";

// Client-side helper: Cookie / LocalStorage Key
export const REFERRAL_COOKIE_KEY = "fo_ref_code";
export const REFERRAL_COOKIE_DAYS = 30;

/**
 * Gets stored referral code from browser cookies or localStorage
 */
export function getStoredReferralCode(): string | null {
  if (typeof window === "undefined") return null;

  // Try Cookie first
  const match = document.cookie.match(new RegExp("(?:^|; )" + REFERRAL_COOKIE_KEY + "=([^;]*)"));
  if (match && match[1]) {
    return decodeURIComponent(match[1]);
  }

  // Fallback to localStorage
  try {
    return localStorage.getItem(REFERRAL_COOKIE_KEY);
  } catch (e) {
    return null;
  }
}

/**
 * Stores referral code in cookie and localStorage
 */
export function storeReferralCode(code: string): void {
  if (typeof window === "undefined" || !code) return;
  
  const cleanedCode = code.trim().toUpperCase();
  
  // Set Cookie
  const date = new Date();
  date.setTime(date.getTime() + REFERRAL_COOKIE_DAYS * 24 * 60 * 60 * 1000);
  document.cookie = `${REFERRAL_COOKIE_KEY}=${encodeURIComponent(cleanedCode)}; expires=${date.toUTCString()}; path=/`;

  // Set LocalStorage
  try {
    localStorage.setItem(REFERRAL_COOKIE_KEY, cleanedCode);
  } catch (e) {
    // ignore quota/privacy errors
  }
}

/**
 * Generates a random 6-character referral code
 */
export function generateRandomReferralCode(): string {
  const chars = "JDKLMNPQRSTUVWXYZ23456789ABCDEFGH";
  let result = "";
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Checks if current user has a stored referral cookie and links it if not already recorded.
 * Essential for Google OAuth / Social Login users.
 */
export async function checkAndLinkReferral(
  supabase: SupabaseClient,
  userId: string,
  userEmail: string
): Promise<void> {
  try {
    const refCode = getStoredReferralCode();
    if (!refCode || !userId || !userEmail) return;

    // Check if user is already in referrals
    const { data: existingRef } = await supabase
      .from("referrals")
      .select("id")
      .or(`referred_user_id.eq.${userId},referred_email.eq.${userEmail}`)
      .maybeSingle();

    if (existingRef) {
      return;
    }

    // Find referrer
    const { data: referrer } = await supabase
      .from("users")
      .select("id")
      .eq("referral_code", refCode)
      .maybeSingle();

    if (referrer && referrer.id !== userId) {
      // Insert referral record
      const { error: insertErr } = await supabase
        .from("referrals")
        .insert({
          referrer_user_id: referrer.id,
          referred_user_id: userId,
          referred_email: userEmail,
          signup_status: "trial"
        });

      if (insertErr) {
        console.error("[Referral] Failed to insert referral record:", insertErr);
      } else {
        console.log(`[Referral] Successfully linked referral record ${refCode} for user ${userEmail}`);
      }

      // Update referred_by_code on user
      const { error: updateErr } = await supabase
        .from("users")
        .update({ referred_by_code: refCode })
        .eq("id", userId);

      if (updateErr) {
        console.error("[Referral] Failed to update user referred_by_code:", updateErr);
      }
    }
  } catch (err) {
    console.error("[Referral] Error in checkAndLinkReferral:", err);
  }
}

/**
 * Server-side helper: Processes referral commission when a user upgrades subscription
 */
export async function processReferralUpgradeCommission(
  supabaseAdmin: SupabaseClient,
  userId: string,
  planKey: string,
  amountPaid: number = 0
): Promise<void> {
  try {
    // 1. Check if user is in referrals table
    const { data: referral, error: refError } = await supabaseAdmin
      .from("referrals")
      .select("id, referrer_user_id, referred_email, signup_status")
      .eq("referred_user_id", userId)
      .single();

    if (refError || !referral) {
      // User was not referred by anyone
      return;
    }

    // 2. Update referral record to premium status
    await supabaseAdmin
      .from("referrals")
      .update({
        signup_status: "premium",
        payout_status: "rewarded"
      })
      .eq("id", referral.id);

    // 3. Calculate commission (e.g. 10% cash commission + 30 days subscription credit)
    const commissionCash = amountPaid > 0 ? Math.round(amountPaid * 0.10) : 0;
    const bonusDays = 30; // 30 days bonus for referrer

    // 4. Record entry in referral_ledger
    await supabaseAdmin
      .from("referral_ledger")
      .insert({
        user_id: referral.referrer_user_id,
        referral_id: referral.id,
        transaction_type: "credit_upgrade",
        amount_cash: commissionCash,
        subscription_days: bonusDays,
        status: "completed",
        admin_notes: `Komisi upgrade paket ${planKey} dari ${referral.referred_email}`
      });

    // 5. Extend referrer's subscription by bonusDays if referrer has an active subscription
    const { data: referrerUser } = await supabaseAdmin
      .from("users")
      .select("subscription_ends_at")
      .eq("id", referral.referrer_user_id)
      .single();

    if (referrerUser) {
      const currentEndsAt = referrerUser.subscription_ends_at 
        ? new Date(referrerUser.subscription_ends_at)
        : new Date();
      
      const baseDate = currentEndsAt > new Date() ? currentEndsAt : new Date();
      baseDate.setDate(baseDate.getDate() + bonusDays);

      await supabaseAdmin
        .from("users")
        .update({
          subscription_ends_at: baseDate.toISOString()
        })
        .eq("id", referral.referrer_user_id);
    }

    console.log(`[Referral] Successfully processed commission for referrer ${referral.referrer_user_id}`);
  } catch (err) {
    console.error("[Referral] Error processing referral upgrade commission:", err);
  }
}
