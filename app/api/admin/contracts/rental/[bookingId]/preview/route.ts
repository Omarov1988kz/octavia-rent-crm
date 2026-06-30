import { NextResponse } from "next/server";
import { getRentalContractPreview } from "@/server/services/contracts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: { bookingId: string } }) {
  try {
    const preview = await getRentalContractPreview(params.bookingId);
    return NextResponse.json({ preview });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Ошибка подготовки договора" },
      { status: 400 }
    );
  }
}
