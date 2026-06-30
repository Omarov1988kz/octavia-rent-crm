import { NextResponse } from "next/server";
import { suggestAddress } from "@/server/services/dadata";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = await suggestAddress(typeof body.query === "string" ? body.query : "");
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ suggestions: [], message: "Подсказки временно недоступны" });
  }
}
