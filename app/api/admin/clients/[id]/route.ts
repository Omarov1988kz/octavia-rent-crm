import { NextResponse } from "next/server";
import { getClient, updateClient, deleteClient } from "@/server/services/clients";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const client = await getClient(params.id);
  if (!client) {
    return NextResponse.json({ message: "Клиент не найден" }, { status: 404 });
  }
  return NextResponse.json({ client });
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const body = await request.json();
  const client = await updateClient(params.id, body);
  if (!client) {
    return NextResponse.json({ message: "Клиент не найден" }, { status: 404 });
  }
  return NextResponse.json({ client });
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const deleted = await deleteClient(params.id);
  if (!deleted) {
    return NextResponse.json({ message: "Клиент не найден" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
