import { NextResponse } from "next/server";
import { isAladConfigured } from "@/lib/alad/server";

export async function GET() {
  return NextResponse.json({ configured: isAladConfigured() });
}
