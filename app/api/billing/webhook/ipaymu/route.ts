// Webhook Callback Handler for iPaymu Payments
// Path: apps/web/app/api/billing/webhook/ipaymu/route.ts

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";
import { processReferralUpgradeCommission } from "@/lib/referral";

export async function POST(req: Request) {
  try {
    // Parse request body. iPaymu webhook can send x-www-form-urlencoded or JSON
    const contentType = req.headers.get("content-type") || "";
    let body: any = {};

    if (contentType.includes("application/json")) {
      body = await req.json();
    } else {
      const formData = await req.formData();
      formData.forEach((value, key) => {
        body[key] = value;
      });
    }

    console.log("iPaymu Webhook received:", body);

    const {
      sid,
      referenceId,
      status,
      amount,
      trx_id,
      signature,
      va
    } = body;

    // Validate VA to prevent completely spoofed origins
    const myVa = process.env.IPAYMU_VA;
    if (va && myVa && va !== myVa) {
      return NextResponse.json({ error: "Invalid VA" }, { status: 400 });
    }

    // Determine the reference ID (iPaymu uses referenceId, sid, or reference_id depending on payment type)
    const refId = referenceId || sid || body.reference_id;

    if (!refId) {
      return NextResponse.json({ error: "Missing reference ID" }, { status: 400 });
    }

    // We only process successful payments
    if (status === "berhasil" || status === "success" || body.status_code === "1") {
      // Reference ID structure: sub_${userId}_${planKey}_${billingCycle}_${randomSuffix}
      const parts = refId.split("_");

      if (parts[0] !== "sub" || parts.length < 4) {
        return NextResponse.json({ error: "Invalid reference ID format" }, { status: 400 });
      }

      const userId = parts[1];
      const planKey = parts[2];
      const billingCycle = parts[3];

      // Setup Supabase Admin Client (bypass RLS)
      const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SECRET_KEY!
      );

      const durationDays = billingCycle === "yearly" ? 365 : 30;
      const endsAt = new Date();
      endsAt.setDate(endsAt.getDate() + durationDays);

      // Update User subscription
      const { error: updateError } = await supabaseAdmin
        .from("users")
        .update({
          subscription_tier: planKey,
          subscription_ends_at: endsAt.toISOString(),
          billing_country: "Indonesia" // iPaymu is Indonesian domestic payment
        })
        .eq("id", userId);

      if (updateError) {
        console.error("Database update failed during iPaymu webhook:", updateError);
        return NextResponse.json({ error: "Failed to update database" }, { status: 500 });
      }

      // Process Referral Upgrade Commission
      const paidAmount = parseFloat(amount || "0");
      await processReferralUpgradeCommission(supabaseAdmin, userId, planKey, paidAmount);

      console.log(`Successfully upgraded user ${userId} to plan ${planKey} via iPaymu`);
      return NextResponse.json({ status: 200, message: "Webhook processed successfully" });
    }

    return NextResponse.json({ status: 200, message: `Ignored status: ${status}` });
  } catch (err: any) {
    console.error("iPaymu Webhook error:", err);
    return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
  }
}
