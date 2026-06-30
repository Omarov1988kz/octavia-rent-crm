import { NextResponse } from "next/server";
import { deleteBooking, updateBooking } from "@/server/services/bookings";

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

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const body = await request.json();
  const { carId, clientId, startDate, startTime, endDate, endTime, status, comment } = body;

  try {
    const booking = await updateBooking(params.id, { carId, clientId, startDate, startTime, endDate, endTime, status, comment });
    if (!booking) {
      return NextResponse.json({ message: "Бронь не найдена" }, { status: 404 });
    }

    return NextResponse.json({ booking });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Ошибка обновления брони" },
      { status: 400 }
    );
  }
}
