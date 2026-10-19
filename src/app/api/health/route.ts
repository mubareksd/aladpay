import { NextResponse } from "next/server";
import { buildHealthSnapshot } from "@/lib/platform-health";

export async function GET() {
  const snapshot = await buildHealthSnapshot();
  const statusCode = snapshot.status === "outage" ? 503 : 200;
  return NextResponse.json(snapshot, { status: statusCode });
}
