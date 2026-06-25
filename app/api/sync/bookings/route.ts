import { NextResponse } from "next/server";
import { syncPublicBookings } from "@/server/services/bookings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const token = process.env.SYNC_API_TOKEN;

export async function POST(request: Request) {
  const authToken = request.headers.get("x-sync-token");

  if (!token || authToken !== token) {
    return new NextResponse(JSON.stringify({ message: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const body = await request.json();
  const bookings = Array.isArray(body?.bookings) ? body.bookings : [];

  try {
    const count = await syncPublicBookings(bookings);
    return NextResponse.json({ synced: count });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Ошибка синхронизации" },
      { status: 400 }
    );
  }
}
