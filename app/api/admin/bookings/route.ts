import { NextResponse } from "next/server";
import { createBooking, listBookings } from "@/server/services/bookings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const bookings = await listBookings();
  return NextResponse.json({ bookings });
}

export async function POST(request: Request) {
  const body = await request.json();
  const { carId, clientName, clientPhone, startDate, startTime, endDate, endTime, status, comment } = body;

  try {
    const booking = await createBooking({ carId, clientName, clientPhone, startDate, startTime, endDate, endTime, status, comment });
    return NextResponse.json({ booking });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Ошибка создания брони" }, { status: 400 });
  }
}
