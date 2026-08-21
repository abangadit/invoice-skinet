"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { createWebBrowserClient } from "../supabase/client";
import { checkAndLinkReferral, storeReferralCode, generateRandomReferralCode } from "../referral";

interface Business {
  id: string;
  user_id: string;
  name: string;
  logo_url: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  tax_id: string | null;
  invoice_prefix: string;
  invoice_number_format: string;
  invoice_counter: number;
  default_currency: string;
  default_due_days: number;
  template_id: string;
  template_color: string;
  footer_text: string | null;
  footer_image_url: string | null;
  default_language: string | null;
  qris_url: string | null;
  is_default: boolean;
  latitude?: number | null;
  longitude?: number | null;
  geofence_radius_meters?: number | null;
  owner_menu_customization?: any | null;
  po_tax_enabled?: boolean;
  tax_rate_percent?: number;
  attendance_geofence_enabled?: boolean;
  attendance_face_recognition_enabled?: boolean;
  default_attendance_start_time?: string;
  payroll_tax_enabled?: boolean;
  payroll_tax_type?: string;
  payroll_tax_rate?: number;
  is_multi_warehouse_enabled?: boolean;
  project_prefix?: string;
  project_counter?: number;
  created_at: string;
  updated_at: string;
}

export interface UserSubscription {
  tier: 'trial' | 'free' | 'small_business' | 'company' | 'enterprise';
  trialEndsAt: string | null;
  subscriptionEndsAt: string | null;
  billingCountry: string | null;
  isTrialExpired: boolean;
  activatedAt: string | null;
  expiresAt: string | null;
  role: string | null;
}

interface BusinessContextType {
  activeBusiness: Business | null;
  businesses: Business[];
  userRole: string | null;
  systemRole: string | null;
  userPermissions: any | null;
  loading: boolean;
  userEmail: string | null;
  userFullName: string | null;
  setActiveBusiness: (business: Business) => void;
  reloadBusiness: () => Promise<void>;
  isEmployee: boolean;
  subscription: UserSubscription | null;
}

const BusinessContext = createContext<BusinessContextType | undefined>(undefined);

export function BusinessProvider({ children }: { children: React.ReactNode }) {
  const [activeBusiness, setActiveBusinessState] = useState<Business | null>(null);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [memberships, setMemberships] = useState<Record<string, { role: string; permissions: any }>>({});
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userFullName, setUserFullName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [employeeBizIds, setEmployeeBizIds] = useState<string[]>([]);
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [systemRole, setSystemRole] = useState<string | null>(null);

  const fetchOrCreateBusiness = async () => {
    try {
      setLoading(true);
      const supabase = createWebBrowserClient();
      
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        setLoading(false);
        return;
      }
      setUserId(user.id);
      setUserEmail(user.email || null);

      // Self-healing: ensure public.users profile record exists
      const { data: existingUserProfile } = await supabase
        .from("users")
        .select("id, referral_code")
        .eq("id", user.id)
        .maybeSingle();

      if (!existingUserProfile) {
        console.log(`[Self-Healing] Seeding missing user profile in public.users for ${user.email}`);
        await supabase
          .from("users")
          .insert({
            id: user.id,
            email: user.email,
            full_name: user.user_metadata?.full_name || user.email?.split("@")[0] || "User",
            role: "user",
            referral_code: generateRandomReferralCode(),
            is_active: true,
          });
      }

      // Check and link referral if coming from Google OAuth / Social Login
      if (user.email) {
        checkAndLinkReferral(supabase, user.id, user.email);
      }

      // Fetch user role & subscription info from public.users
      const { data: userProfile } = await supabase
        .from("users")
        .select("role, full_name, activated_at, expires_at, created_at, subscription_tier, trial_ends_at, subscription_ends_at, billing_country")
        .eq("id", user.id)
        .maybeSingle();

      setUserFullName(userProfile?.full_name || user.user_metadata?.full_name || user.email?.split("@")[0] || null);

      if (userProfile) {
        setSystemRole(userProfile.role || null);
        const isTrialExpired = userProfile.subscription_tier === 'trial' && 
          userProfile.trial_ends_at ? new Date(userProfile.trial_ends_at) < new Date() : false;
        
        setSubscription({
          tier: (userProfile.subscription_tier as any) || 'trial',
          trialEndsAt: userProfile.trial_ends_at,
          subscriptionEndsAt: userProfile.subscription_ends_at,
          billingCountry: userProfile.billing_country,
          isTrialExpired,
          activatedAt: userProfile.activated_at || userProfile.created_at || null,
          expiresAt: userProfile.expires_at || null,
          role: userProfile.role || 'user',
        });
      } else {
        setSystemRole(null);
        setSubscription({
          tier: 'trial',
          trialEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          subscriptionEndsAt: null,
          billingCountry: null,
          isTrialExpired: false,
          activatedAt: null,
          expiresAt: null,
          role: 'user',
        });
      }

      // 1. Query businesses by membership (joins business_members and businesses)
      const { data: membershipList, error: fetchError } = await supabase
        .from("business_members")
        .select(`
          role,
          permissions,
          businesses (*)
        `)
        .eq("user_id", user.id);

      // 2. Query businesses owned directly by the user (as fallback/backup)
      const { data: ownedBusinesses, error: ownedError } = await supabase
        .from("businesses")
        .select("*")
        .eq("user_id", user.id);

      // 3. Query businesses where user is registered as an employee
      const { data: employeeRecords } = await supabase
        .from("employees")
        .select("business_id")
        .eq("user_id", user.id);

      const employeeBizIdsList = (employeeRecords || []).map(r => r.business_id);
      setEmployeeBizIds(employeeBizIdsList);

      if (fetchError && ownedError) {
        console.error("Error fetching businesses/memberships:", fetchError || ownedError);
        setLoading(false);
        return;
      }

      const businessMap = new Map<string, Business>();
      const membershipsMap: Record<string, { role: string; permissions: any }> = {};

      // Process owned businesses
      if (ownedBusinesses && ownedBusinesses.length > 0) {
        ownedBusinesses.forEach((biz: Business) => {
          businessMap.set(biz.id, biz);
          membershipsMap[biz.id] = {
            role: "owner",
            permissions: {}
          };
        });
      }

      // Process membership-based businesses
      if (membershipList && membershipList.length > 0) {
        membershipList.forEach((item: any) => {
          const biz = Array.isArray(item.businesses) ? item.businesses[0] : item.businesses;
          if (biz) {
            const isOwner = biz.user_id === user.id;
            businessMap.set(biz.id, biz);
            membershipsMap[biz.id] = {
              role: isOwner ? "owner" : (item.role || "staff"),
              permissions: item.permissions || {}
            };
          }
        });
      }

      // Process employee-based businesses
      if (employeeBizIdsList.length > 0) {
        const { data: employeeBizList } = await supabase
          .from("businesses")
          .select("*")
          .in("id", employeeBizIdsList);

        if (employeeBizList) {
          employeeBizList.forEach((biz: Business) => {
            businessMap.set(biz.id, biz);
            if (!membershipsMap[biz.id]) {
              membershipsMap[biz.id] = {
                role: "employee",
                permissions: {}
              };
            }
          });
        }
      }

      // Self-healing: if an owned business is not in the membership list, insert it into business_members
      if (ownedBusinesses && ownedBusinesses.length > 0) {
        const membershipBizIds = new Set(
          (membershipList || []).map((item: any) => {
            const biz = Array.isArray(item.businesses) ? item.businesses[0] : item.businesses;
            return biz?.id;
          }).filter(Boolean)
        );

        ownedBusinesses.forEach((biz: Business) => {
          if (!membershipBizIds.has(biz.id)) {
            console.log(`Self-healing: Seeding owner membership in business_members for business ${biz.id}`);
            supabase
              .from("business_members")
              .insert({
                business_id: biz.id,
                user_id: user.id,
                role: "owner",
                permissions: {}
              })
              .then(({ error }) => {
                if (error) {
                  console.error(`Self-healing failed for business ${biz.id}:`, error);
                } else {
                  console.log(`Self-healing succeeded for business ${biz.id}`);
                }
              });
          }
        });
      }

      const list = Array.from(businessMap.values());

      if (list.length > 0) {
        setBusinesses(list);
        setMemberships(membershipsMap);
        
        // Find default business from DB, or fallback to first
        const defaultBusiness = list.find(b => b.is_default === true);
        const savedActiveId = localStorage.getItem(`active_business_id_${user.id}`);
        const savedActive = list.find(b => b.id === savedActiveId);
        
        setActiveBusinessState(savedActive || defaultBusiness || list[0]);
      } else {
        // Create default business (Try RPC first to bypass client RLS issues, fallback to insert)
        let createdBiz: Business | null = null;
        const { data: rpcData, error: rpcError } = await supabase.rpc("create_initial_business");
        
        if (!rpcError && rpcData) {
          createdBiz = (Array.isArray(rpcData) ? rpcData[0] : rpcData) as Business;
        } else {
          const businessName = user.user_metadata?.business_name || user.email?.split("@")[0] + " Business" || "Bisnis Saya";
          const { data: newBusiness, error: createError } = await supabase
            .from("businesses")
            .insert({
              user_id: user.id,
              name: businessName,
              invoice_prefix: "INV",
              invoice_number_format: "INV/[YYYY]/[MM]/[NO]",
              invoice_counter: 1,
              default_currency: "IDR",
              default_due_days: 14,
              template_id: "modern",
              template_color: "#004de6", // Royal Blue accent
              is_default: true, // First business is default
            })
            .select()
            .single();

          if (createError) {
            console.error("Error creating business:", createError);
          } else if (newBusiness) {
            createdBiz = newBusiness as Business;
          }
        }

        if (createdBiz) {
          // Seed business_members record so owner role & menu permissions are immediately persistent
          try {
            await supabase
              .from("business_members")
              .insert({
                business_id: createdBiz.id,
                user_id: user.id,
                role: "owner",
                permissions: {}
              });
          } catch (e) {}

          setBusinesses([createdBiz]);
          setMemberships({
            [createdBiz.id]: { role: "owner", permissions: {} }
          });
          setActiveBusinessState(createdBiz);
        }
      }
    } catch (e) {
      console.error("Exception in fetchOrCreateBusiness:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const refParam = params.get("ref");
      if (refParam) {
        storeReferralCode(refParam);
      }
    }
    fetchOrCreateBusiness();
  }, []);

  const isEmployee = activeBusiness ? employeeBizIds.includes(activeBusiness.id) : false;

  const setActiveBusiness = (business: Business) => {
    setActiveBusinessState(business);
    if (userId) {
      localStorage.setItem(`active_business_id_${userId}`, business.id);
    }
  };

  const activeMembership = activeBusiness ? memberships[activeBusiness.id] : null;
  const userRole = systemRole === "superadmin" 
    ? "superadmin" 
    : (activeMembership?.role || (activeBusiness && activeBusiness.user_id === userId ? "owner" : null));
  const userPermissions = activeMembership?.permissions || null;

  return (
    <BusinessContext.Provider
      value={{
        activeBusiness,
        businesses,
        userRole,
        systemRole,
        userPermissions,
        loading,
        userEmail,
        userFullName,
        setActiveBusiness,
        reloadBusiness: fetchOrCreateBusiness,
        isEmployee,
        subscription,
      }}
    >
      {children}
    </BusinessContext.Provider>
  );
}

export function useBusiness() {
  const context = useContext(BusinessContext);
  if (context === undefined) {
    throw new Error("useBusiness must be used within a BusinessProvider");
  }
  return context;
}
