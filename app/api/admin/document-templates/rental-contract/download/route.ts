import { NextResponse } from "next/server";
import { readTemplateFile } from "@/server/services/documentTemplates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const { template, buffer } = await readTemplateFile("rental_contract");
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${encodeURIComponent(template.file_name)}"`,
    },
  });
}
