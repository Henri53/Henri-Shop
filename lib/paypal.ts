// Real PayPal integration via PayPal's official Orders API v2.
// Docs: https://developer.paypal.com/docs/api/orders/v2/
//
// Set PAYPAL_ENV=sandbox while testing (fake money, a sandbox buyer account
// from developer.paypal.com) and PAYPAL_ENV=live once you're ready for real
// payments, together with a live PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET.

function apiBase() {
  return process.env.PAYPAL_ENV === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";
}

async function getAccessToken(): Promise<string> {
  const id = process.env.PAYPAL_CLIENT_ID;
  const secret = process.env.PAYPAL_CLIENT_SECRET;
  if (!id || !secret) throw new Error("PayPal is not configured (PAYPAL_CLIENT_ID/SECRET missing).");

  const res = await fetch(`${apiBase()}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: "Basic " + Buffer.from(`${id}:${secret}`).toString("base64"),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Could not authenticate with PayPal.");
  const json = await res.json();
  return json.access_token;
}

export async function createPayPalOrder(amountEur: number): Promise<string> {
  const token = await getAccessToken();
  const res = await fetch(`${apiBase()}/v2/checkout/orders`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [
        { amount: { currency_code: "EUR", value: amountEur.toFixed(2) } },
      ],
    }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Could not create the PayPal order.");
  const json = await res.json();
  return json.id as string;
}

export async function capturePayPalOrder(orderId: string): Promise<{ completed: boolean; amountEur: number }> {
  const token = await getAccessToken();
  const res = await fetch(`${apiBase()}/v2/checkout/orders/${orderId}/capture`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });
  const json = await res.json();
  const capture = json.purchase_units?.[0]?.payments?.captures?.[0];
  const completed = res.ok && capture?.status === "COMPLETED";
  const amountEur = completed ? parseFloat(capture.amount.value) : 0;
  return { completed, amountEur };
}
