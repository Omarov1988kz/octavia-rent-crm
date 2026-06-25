import { NextResponse } from "next/server";
import { deleteBooking } from "@/server/services/bookings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const { id } = params;

  try {
    const deleted = await deleteBooking(id);
    if (!deleted) {
      return NextResponse.json({ message: "Бронь не найдена" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Ошибка удаления брони" }, { status: 500 });
  }
}
