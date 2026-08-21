// API Route Checkout for Invoicing subscriptions
// Path: apps/web/app/api/billing/checkout/route.ts

import { NextResponse } from "next/server";
import { createWebServerClient } from "../../../../lib/supabase/server";
import crypto from "crypto";

const planPrices = {
  small_business: {
    IDR: { monthly: 99000, yearly: 79000 * 12 },
    USD: { monthly: 20, yearly: 16 * 12 }
  },
  company: {
    IDR: { monthly: 299000, yearly: 239000 * 12 },
    USD: { monthly: 50, yearly: 40 * 12 }
  },
  enterprise: {
    IDR: { monthly: 599000, yearly: 479000 * 12 },
    USD: { monthly: 99, yearly: 79 * 12 }
  }
};

export async function POST(req: Request) {
  try {
    const supabase = createWebServerClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { planKey, billingCycle, currency } = await req.json();

    if (!planKey || !billingCycle || !currency) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const plan = planPrices[planKey as keyof typeof planPrices];
    if (!plan) {
      return NextResponse.json({ error: "Invalid plan key" }, { status: 400 });
    }

    const price = plan[currency as "IDR" | "USD"][billingCycle as "monthly" | "yearly"];
    const planName = `${planKey.replace("_", " ").toUpperCase()} - ${billingCycle === "yearly" ? "Tahunan" : "Bulanan"}`;

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const user = session.user;
    const referenceId = `sub_${user.id}_${planKey}_${billingCycle}_${Date.now().toString().slice(-6)}`;

    // ----------------------------------------------------
    // CASE A: Mata Uang Rupiah (IDR) -> iPaymu Integration
    // ----------------------------------------------------
    if (currency === "IDR") {
      const ipaymuKey = process.env.IPAYMU_API;
      const ipaymuVa = process.env.IPAYMU_VA;

      if (!ipaymuKey || !ipaymuVa) {
        return NextResponse.json({ error: "iPaymu credentials not configured" }, { status: 500 });
      }

      // Default to production unless explicitly specified as sandbox in environment variables
      const isSandbox = process.env.IPAYMU_MODE === "sandbox" || process.env.PAYMENT_MODE === "sandbox";
      const ipaymuUrl = isSandbox 
        ? "https://sandbox.ipaymu.com/api/v2/payment"
        : "https://my.ipaymu.com/api/v2/payment";

      const body = {
        product: [planName],
        qty: ["1"],
        price: [String(price)],
        amount: String(price),
        returnUrl: `${appUrl}/pricing?status=success&ref=${referenceId}`,
        cancelUrl: `${appUrl}/pricing?status=cancel`,
        notifyUrl: `${appUrl}/api/billing/webhook/ipaymu`,
        referenceId: referenceId,
        buyerName: user.email?.split("@")[0] || "User FakturOnline",
        buyerEmail: user.email,
        buyerPhone: "0812345678" // Default placeholder, can be updated later
      };

      // Generate Signature v2 iPaymu
      const bodyJson = JSON.stringify(body);
      const bodyHash = crypto.createHash("sha256").update(bodyJson).digest("hex").toLowerCase();
      const stringToSign = `POST:${ipaymuVa}:${bodyHash}:${ipaymuKey}`;
      const signature = crypto.createHmac("sha256", ipaymuKey).update(stringToSign).digest("hex");

      const ipaymuRes = await fetch(ipaymuUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "va": ipaymuVa,
          "signature": signature
        },
        body: bodyJson
      });

      const ipaymuData = await ipaymuRes.json();

      const status = ipaymuData.Status ?? ipaymuData.status;
      const data = ipaymuData.Data ?? ipaymuData.data;
      const url = data?.Url ?? data?.url;
      const message = ipaymuData.Message ?? ipaymuData.message;

      if (ipaymuRes.ok && status === 200 && url) {
        return NextResponse.json({ url });
      } else {
        console.error("iPaymu initiation failed:", ipaymuData);
        const detailedError = message || (typeof ipaymuData === 'object' ? JSON.stringify(ipaymuData) : String(ipaymuData));
        return NextResponse.json({ error: `Gagal inisialisasi iPaymu: ${detailedError}` }, { status: 400 });
      }
    }

    // ----------------------------------------------------
    // CASE B: Mata Uang Dolar (USD) -> PayPal Integration
    // ----------------------------------------------------
    if (currency === "USD") {
      const paypalClientId = process.env.PAYPAL_CLIENT_ID;
      const paypalSecret = process.env.PAYPAL_SECRET;

      if (!paypalClientId || !paypalSecret) {
        return NextResponse.json({ error: "PayPal credentials not configured" }, { status: 500 });
      }

      // Default to production unless explicitly specified as sandbox in environment variables
      const isLive = process.env.PAYPAL_MODE !== "sandbox" && process.env.PAYMENT_MODE !== "sandbox";
      const paypalBaseUrl = isLive 
        ? "https://api-m.paypal.com"
        : "https://api-m.sandbox.paypal.com";

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
        const errText = await tokenRes.text();
        console.error("PayPal token request failed:", errText);
        return NextResponse.json({ error: `Gagal autentikasi PayPal (Token): ${errText}` }, { status: 500 });
      }

      const tokenData = await tokenRes.json();
      const accessToken = tokenData.access_token;

      // 2. Create Order
      const orderRes = await fetch(`${paypalBaseUrl}/v2/checkout/orders`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          intent: "CAPTURE",
          purchase_units: [
            {
              reference_id: referenceId,
              amount: {
                currency_code: "USD",
                value: String(price)
              },
              description: planName
            }
          ],
          application_context: {
            brand_name: "FakturOnline.co.id",
            user_action: "PAY_NOW",
            return_url: `${appUrl}/pricing?status=success&ref=${referenceId}`,
            cancel_url: `${appUrl}/pricing?status=cancel`
          }
        })
      });

      const orderData = await orderRes.json();

      if (orderRes.ok && orderData.id) {
        const approveLink = orderData.links?.find((l: any) => l.rel === "approve");
        return NextResponse.json({ 
          paypalOrderId: orderData.id, 
          url: approveLink?.href || null 
        });
      } else {
        console.error("PayPal order creation failed:", orderData);
        const detailedError = typeof orderData === 'object' ? JSON.stringify(orderData) : String(orderData);
        return NextResponse.json({ error: `Gagal membuat order PayPal: ${detailedError}` }, { status: 400 });
      }
    }

    return NextResponse.json({ error: "Invalid currency selected" }, { status: 400 });
  } catch (err: any) {
    console.error("Checkout route error:", err);
    return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
  }
}
