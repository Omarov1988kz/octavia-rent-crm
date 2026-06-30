import { NextResponse } from "next/server";
import { query } from "@/server/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const publicSyncUrl = process.env.PUBLIC_SYNC_URL;
const syncToken = process.env.SYNC_API_TOKEN;

function normalizeTimeForSync(value: string | null | undefined) {
  if (!value) return value;

  if (/^\d{2}:\d{2}$/.test(value)) {
    return value;
  }

  const match = value.match(/^(\d{2}:\d{2}):\d{2}$/);
  return match ? match[1] : value;
}

export async function POST() {
  if (!publicSyncUrl) {
    return NextResponse.json({ message: "PUBLIC_SYNC_URL is not configured" }, { status: 500 });
  }

  if (!syncToken) {
    return NextResponse.json({ message: "SYNC_API_TOKEN is not configured" }, { status: 500 });
  }

  const result = await query<{
    id: string;
    start_date: string;
    start_time: string;
    end_date: string;
    end_time: string;
    status: string;
  }>(
    `SELECT id, start_date, start_time, end_date, end_time, status
     FROM bookings
     ORDER BY created_at DESC`,
    []
  );

  const payload = {
    bookings: result.rows.map((booking) => ({
      externalId: booking.id,
      carKey: "octavia",
      startDate: booking.start_date,
      startTime: normalizeTimeForSync(booking.start_time),
      endDate: booking.end_date,
      endTime: normalizeTimeForSync(booking.end_time),
      status: booking.status,
    })),
  };

  try {
    const response = await fetch(publicSyncUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-sync-token": syncToken,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json({ message: `Sync failed: ${response.status} ${response.statusText} ${errorText}` }, { status: 502 });
    }

    const responseJson = await response.json();
    return NextResponse.json({ message: "Синхронизация выполнена", result: responseJson });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Ошибка синхронизации" }, { status: 502 });
  }
}
