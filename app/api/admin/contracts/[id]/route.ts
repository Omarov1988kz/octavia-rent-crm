import { NextResponse } from "next/server";
import { deleteRentalContract } from "@/server/services/contracts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const deleted = await deleteRentalContract(params.id);
  if (!deleted) {
    return NextResponse.json({ message: "Договор не найден" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
