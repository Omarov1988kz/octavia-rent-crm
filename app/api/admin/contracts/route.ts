import { NextResponse } from "next/server";
import { listRentalContracts } from "@/server/services/contracts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const contracts = await listRentalContracts();
  return NextResponse.json({ contracts });
}
