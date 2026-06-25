import { NextResponse } from "next/server";
import { createCar, listCars, type CarOwnershipType, type CarStatus } from "@/server/services/cars";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isCarStatus(value: string | null): value is CarStatus {
  return value === "active" || value === "service" || value === "repair" || value === "inactive";
}

function isOwnershipType(value: string | null): value is CarOwnershipType {
  return value === "own" || value === "partner" || value === "leased";
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const search = url.searchParams.get("search") || undefined;
  const statusParam = url.searchParams.get("status");
  const ownershipTypeParam = url.searchParams.get("ownershipType");
  const activeOnly = url.searchParams.get("activeOnly") === "true";

  const cars = await listCars({
    search,
    status: isCarStatus(statusParam) ? statusParam : undefined,
    ownershipType: isOwnershipType(ownershipTypeParam) ? ownershipTypeParam : undefined,
    activeOnly,
  });

  return NextResponse.json({ cars });
}

export async function POST(request: Request) {
  const body = await request.json();

  try {
    const car = await createCar(body);
    return NextResponse.json({ car });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Ошибка создания автомобиля" },
      { status: 400 }
    );
  }
}
