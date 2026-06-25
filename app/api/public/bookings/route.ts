import { NextResponse } from "next/server";
import { getBookedDateRanges } from "@/server/services/bookings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function GET() {
  const bookings = await getBookedDateRanges();
  return NextResponse.json({ bookings }, { headers: corsHeaders });
}

export function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  });
}
