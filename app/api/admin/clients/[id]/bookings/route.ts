import { NextResponse } from "next/server";
import { listBookingsByClient } from "@/server/services/bookings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const allBookings = await listBookingsByClient(params.id);
  const activeBookings = allBookings.filter((booking) => booking.status === "request" || booking.status === "booked");
  const recentBookings = allBookings.filter((booking) => booking.status === "cancelled").slice(0, 3);

  return NextResponse.json({
    activeBookings,
    recentBookings: recentBookings.length > 0 ? recentBookings : allBookings.slice(0, 3),
    allBookings,
  });
}
