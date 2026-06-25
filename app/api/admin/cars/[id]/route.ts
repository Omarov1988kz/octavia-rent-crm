import { NextResponse } from "next/server";
import { deleteCar, getCar, updateCar } from "@/server/services/cars";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const car = await getCar(params.id);
  if (!car) {
    return NextResponse.json({ message: "Автомобиль не найден" }, { status: 404 });
  }

  return NextResponse.json({ car });
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const body = await request.json();

  try {
    const car = await updateCar(params.id, body);
    if (!car) {
      return NextResponse.json({ message: "Автомобиль не найден" }, { status: 404 });
    }

    return NextResponse.json({ car });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Ошибка обновления автомобиля" },
      { status: 400 }
    );
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const result = await deleteCar(params.id);
  if (!result.car) {
    return NextResponse.json({ message: "Автомобиль не найден" }, { status: 404 });
  }

  return NextResponse.json(result);
}
