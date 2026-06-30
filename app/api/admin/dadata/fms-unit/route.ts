import { NextResponse } from "next/server";
import { suggestFmsUnit } from "@/server/services/dadata";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = await suggestFmsUnit(typeof body.query === "string" ? body.query : "");
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ suggestions: [], message: "Подсказки временно недоступны" });
  }
}
