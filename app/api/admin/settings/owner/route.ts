import { NextResponse } from "next/server";
import { getOwnerSettings, upsertOwnerSettings } from "@/server/services/ownerSettings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const settings = await getOwnerSettings();
  return NextResponse.json({ settings });
}

export async function POST(request: Request) {
  const body = await request.json();
  const settings = await upsertOwnerSettings(body);
  return NextResponse.json({ settings });
}
