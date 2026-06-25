import { NextResponse } from "next/server";
import { cancelBooking } from "@/server/services/bookings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Params {
  params: {
    id: string;
  };
}

export async function POST(_request: Request, { params }: Params) {
  const { id } = params;
  const success = await cancelBooking(id);
  if (!success) {
    return NextResponse.json({ message: "Бронирование не найдено" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
