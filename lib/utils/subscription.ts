// Helper utilities for subscription checks and limitations
// Path: apps/web/lib/utils/subscription.ts

import { SupabaseClient } from "@supabase/supabase-js";

export type SubscriptionTier = 'trial' | 'free' | 'small_business' | 'company' | 'enterprise';

export interface SubscriptionLimits {
  maxInvoicesPerMonth: number; // -1 for unlimited
  maxCustomers: number;       // -1 for unlimited
  maxCatalogItems: number;    // -1 for unlimited
  maxBusinesses: number;      // -1 for unlimited
}

// Get hard limits based on subscription tier and expiration status
export function getSubscriptionLimits(tier: SubscriptionTier, isTrialExpired: boolean): SubscriptionLimits {
  if (isTrialExpired || tier === 'free') {
    return {
      maxInvoicesPerMonth: 5,
      maxCustomers: 3,
      maxCatalogItems: 5,
      maxBusinesses: 1,
    };
  }

  switch (tier) {
    case 'small_business':
      return {
        maxInvoicesPerMonth: 100,
        maxCustomers: 50,
        maxCatalogItems: 100,
        maxBusinesses: 1,
      };
    case 'company':
      return {
        maxInvoicesPerMonth: -1,
        maxCustomers: -1,
        maxCatalogItems: -1,
        maxBusinesses: 3,
      };
    case 'enterprise':
      return {
        maxInvoicesPerMonth: -1,
        maxCustomers: -1,
        maxCatalogItems: -1,
        maxBusinesses: -1,
      };
    case 'trial':
    default:
      return {
        maxInvoicesPerMonth: -1,
        maxCustomers: -1,
        maxCatalogItems: -1,
        maxBusinesses: 1,
      };
  }
}

// Check if a user has access to a specific sidebar menu/feature route
export function hasMenuAccess(tier: SubscriptionTier, menuKey: string, isTrialExpired: boolean): boolean {
  if (isTrialExpired || tier === 'free') {
    // Highly restricted tier
    const allowed = ["dashboard", "invoice", "quotation", "customer", "payment", "catalog", "settings"];
    return allowed.includes(menuKey);
  }

  // HR & Kepegawaian menus
  const hrMenus = ["employees", "payroll", "employee_leave", "employee_reimbursement", "employee_attendance"];
  // Akuntansi & Keuangan menus
  const financeMenus = ["accounts", "expenses", "ledger", "reports", "tax", "assets"];

  switch (tier) {
    case 'small_business':
      // Small Business has basic invoicing, POS and single-warehouse inventory, but NO finance or HR
      if (hrMenus.includes(menuKey) || financeMenus.includes(menuKey)) {
        return false;
      }
      return true;

    case 'company':
      // Company has everything except HR & Payroll
      if (hrMenus.includes(menuKey)) {
        return false;
      }
      return true;

    case 'enterprise':
      // Enterprise has everything unlocked
      return true;

    case 'trial':
    default:
      // Active Trial has everything unlocked
      return true;
  }
}

// Check if a business is currently exceeding or reaching its usage limits
export async function checkUsageLimit(
  supabase: SupabaseClient,
  businessId: string,
  limitType: 'invoice' | 'customer' | 'catalog',
  tier: SubscriptionTier,
  isTrialExpired: boolean
): Promise<{ allowed: boolean; current: number; max: number }> {
  const limits = getSubscriptionLimits(tier, isTrialExpired);
  let max = -1;
  let current = 0;

  if (limitType === 'invoice') {
    max = limits.maxInvoicesPerMonth;
    if (max === -1) return { allowed: true, current: 0, max };

    // Get current calendar month start and end
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const { count, error } = await supabase
      .from("invoices")
      .select("id", { count: "exact", head: true })
      .eq("business_id", businessId)
      .eq("type", "invoice") // Only limit invoices, not estimations/quotations
      .gte("created_at", startOfMonth.toISOString());

    if (!error && count !== null) {
      current = count;
    }
  } else if (limitType === 'customer') {
    max = limits.maxCustomers;
    if (max === -1) return { allowed: true, current: 0, max };

    const { count, error } = await supabase
      .from("customers")
      .select("id", { count: "exact", head: true })
      .eq("business_id", businessId);

    if (!error && count !== null) {
      current = count;
    }
  } else if (limitType === 'catalog') {
    max = limits.maxCatalogItems;
    if (max === -1) return { allowed: true, current: 0, max };

    const { count, error } = await supabase
      .from("items")
      .select("id", { count: "exact", head: true })
      .eq("business_id", businessId);

    if (!error && count !== null) {
      current = count;
    }
  }

  return {
    allowed: max === -1 || current < max,
    current,
    max,
  };
}
