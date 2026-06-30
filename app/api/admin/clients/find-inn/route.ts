import { NextResponse } from "next/server";
import { findInnByPassport } from "@/server/services/innLookup";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = await findInnByPassport({
      lastName: body.lastName,
      firstName: body.firstName,
      patronymic: body.patronymic,
      birthDate: body.birthDate,
      passportNumber: body.passportNumber,
      passportIssuedDate: body.passportIssuedDate,
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Не удалось выполнить поиск ИНН" },
      { status: 400 }
    );
  }
}
