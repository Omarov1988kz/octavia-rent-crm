import { NextResponse } from "next/server";
import { getActiveCars } from "@/server/services/bookings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const cars = await getActiveCars();
  return NextResponse.json({ cars });
}
