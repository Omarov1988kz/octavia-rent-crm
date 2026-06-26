import { NextResponse } from "next/server";
import { listDocumentTemplates, replaceRentalContractTemplate } from "@/server/services/documentTemplates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const templates = await listDocumentTemplates();
  return NextResponse.json({ templates });
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ message: "Файл не найден" }, { status: 400 });
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const template = await replaceRentalContractTemplate(file.name, buffer);
    return NextResponse.json({ template });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Ошибка загрузки шаблона" },
      { status: 400 }
    );
  }
}
