import { NextResponse } from "next/server";
import { getLiveRates } from "@/lib/rates";

// Must run on every request, otherwise Next can freeze this response at build time.
export const dynamic = "force-dynamic";

export async function GET() {
  const rates = await getLiveRates();
  const live = rates.fiatLive && rates.cryptoLive;
  return NextResponse.json(rates, {
    headers: {
      // Let Vercel's CDN absorb the traffic: at most ~1 upstream API call per
      // minute, no matter how many visitors there are (CoinGecko's free tier
      // rate-limits quickly). Never cache a degraded answer.
      "Cache-Control": live ? "public, s-maxage=60, stale-while-revalidate=300" : "no-store",
    },
  });
}
