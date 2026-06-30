import { NextResponse } from "next/server";
import { generateRentalContract } from "@/server/services/contracts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: { bookingId: string } }) {
  try {
    const contract = await generateRentalContract(params.bookingId);
    return new NextResponse(contract.buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(contract.fileName)}"`,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Ошибка формирования договора" },
      { status: 400 }
    );
  }
}

export async function POST(request: Request, { params }: { params: { bookingId: string } }) {
  try {
    const body = await request.json();
    const contract = await generateRentalContract(params.bookingId, body);
    return new NextResponse(contract.buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(contract.fileName)}"`,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Ошибка формирования договора" },
      { status: 400 }
    );
  }
}
