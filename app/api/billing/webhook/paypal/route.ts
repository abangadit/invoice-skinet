// Webhook and Capture API Route for PayPal Payments
// Path: apps/web/app/api/billing/webhook/paypal/route.ts

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log("PayPal Webhook/Capture received:", body);

    const paypalClientId = process.env.PAYPAL_CLIENT_ID;
    const paypalSecret = process.env.PAYPAL_SECRET;

    if (!paypalClientId || !paypalSecret) {
      return NextResponse.json({ error: "PayPal credentials not configured" }, { status: 500 });
    }

    const isLive = !paypalClientId.startsWith("Ad");
    const paypalBaseUrl = isLive 
      ? "https://api-m.paypal.com"
      : "https://api-m.sandbox.paypal.com";

    // ----------------------------------------------------
    // CASE A: Client-Side Direct Order Capture Trigger
    // ----------------------------------------------------
    if (body.orderId && body.referenceId) {
      const { orderId, referenceId } = body;

      // 1. Get Access Token
      const authString = Buffer.from(`${paypalClientId}:${paypalSecret}`).toString("base64");
      const tokenRes = await fetch(`${paypalBaseUrl}/v1/oauth2/token`, {
        method: "POST",
        headers: {
          "Authorization": `Basic ${authString}`,
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: "grant_type=client_credentials"
      });

      if (!tokenRes.ok) {
        return NextResponse.json({ error: "Failed to authenticate with PayPal" }, { status: 500 });
      }

      const tokenData = await tokenRes.json();
      const accessToken = tokenData.access_token;

      // 2. Capture Order
      const captureRes = await fetch(`${paypalBaseUrl}/v2/checkout/orders/${orderId}/capture`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        }
      });

      const captureData = await captureRes.json();

      if (captureRes.ok && (captureData.status === "COMPLETED" || captureData.status === "APPROVED")) {
        // Parse reference ID: sub_${userId}_${planKey}_${billingCycle}_${randomSuffix}
        const parts = referenceId.split("_");
        if (parts[0] !== "sub" || parts.length < 4) {
          return NextResponse.json({ error: "Invalid reference ID format" }, { status: 400 });
        }

        const userId = parts[1];
        const planKey = parts[2];
        const billingCycle = parts[3];

        // Update database
        const supabaseAdmin = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SECRET_KEY!
        );

        const durationDays = billingCycle === "yearly" ? 365 : 30;
        const endsAt = new Date();
        endsAt.setDate(endsAt.getDate() + durationDays);

        const { error: updateError } = await supabaseAdmin
          .from("users")
          .update({
            subscription_tier: planKey,
            subscription_ends_at: endsAt.toISOString(),
            billing_country: "International" // PayPal handles international USD checkouts
          })
          .eq("id", userId);

        if (updateError) {
          console.error("Database update failed during PayPal capture:", updateError);
          return NextResponse.json({ error: "Failed to update database" }, { status: 500 });
        }

        console.log(`Successfully upgraded user ${userId} to plan ${planKey} via PayPal Capture`);
        return NextResponse.json({ status: 200, message: "Order captured and subscription activated" });
      } else {
        console.error("PayPal Capture failed:", captureData);
        return NextResponse.json({ error: captureData.message || "Failed to capture PayPal order" }, { status: 400 });
      }
    }

    // ----------------------------------------------------
    // CASE B: Standard PayPal Webhook (IPN/Webhooks)
    // ----------------------------------------------------
    if (body.event_type) {
      const eventType = body.event_type;

      // Handle standard PAYMENT.SALE.COMPLETED or CHECKOUT.ORDER.APPROVED
      if (eventType === "PAYMENT.SALE.COMPLETED" || eventType === "CHECKOUT.ORDER.COMPLETED") {
        const resource = body.resource;
        
        // PayPal webhooks send custom_id or reference_id
        const refId = resource.custom_id || resource.reference_id || (resource.purchase_units && resource.purchase_units[0]?.reference_id);

        if (refId) {
          const parts = refId.split("_");
          if (parts[0] === "sub" && parts.length >= 4) {
            const userId = parts[1];
            const planKey = parts[2];
            const billingCycle = parts[3];

            const supabaseAdmin = createClient(
              process.env.NEXT_PUBLIC_SUPABASE_URL!,
              process.env.SUPABASE_SECRET_KEY!
            );

            const durationDays = billingCycle === "yearly" ? 365 : 30;
            const endsAt = new Date();
            endsAt.setDate(endsAt.getDate() + durationDays);

            await supabaseAdmin
              .from("users")
              .update({
                subscription_tier: planKey,
                subscription_ends_at: endsAt.toISOString(),
                billing_country: "International"
              })
              .eq("id", userId);

            console.log(`Successfully updated user ${userId} via PayPal Webhook ${eventType}`);
          }
        }
      }

      return NextResponse.json({ status: 200, message: "Webhook event parsed" });
    }

    return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
  } catch (err: any) {
    console.error("PayPal Capture/Webhook route error:", err);
    return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
  }
}
