import { NextResponse } from "next/server";
import { createClient, listClients } from "@/server/services/clients";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const search = url.searchParams.get("search") || undefined;
  const status = url.searchParams.get("status") as any;
  const isBlacklistedParam = url.searchParams.get("isBlacklisted");
  const isBlacklisted = isBlacklistedParam === "true" ? true : isBlacklistedParam === "false" ? false : undefined;

  const clients = await listClients({
    search: search || undefined,
    status: status || undefined,
    isBlacklisted,
  });

  return NextResponse.json({ clients });
}

export async function POST(request: Request) {
  const body = await request.json();
  const client = await createClient(body);
  return NextResponse.json({ client });
}
