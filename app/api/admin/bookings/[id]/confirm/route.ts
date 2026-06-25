import { NextResponse } from "next/server";
import { confirmBooking } from "@/server/services/bookings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Params {
  params: {
    id: string;
  };
}

export async function POST(_request: Request, { params }: Params) {
  const { id } = params;
  const success = await confirmBooking(id);
  if (!success) {
    return NextResponse.json({ message: "Невозможно подтвердить бронь" }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
