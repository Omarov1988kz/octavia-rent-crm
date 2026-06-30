import { NextResponse } from "next/server";
import { listCarClassDeposits, upsertCarClassDeposits } from "@/server/services/deposits";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const deposits = await listCarClassDeposits();
  return NextResponse.json({ deposits });
}

export async function POST(request: Request) {
  const body = await request.json();
  const deposits = await upsertCarClassDeposits(Array.isArray(body?.deposits) ? body.deposits : []);
  return NextResponse.json({ deposits });
}
