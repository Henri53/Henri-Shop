import { NextResponse } from "next/server";
import { getLiveRates } from "@/lib/rates";

export async function GET() {
  const rates = await getLiveRates();
  return NextResponse.json(rates);
}
