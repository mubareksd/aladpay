import { NextResponse } from "next/server";
import { authRequiredForApp } from "@/lib/auth/guard";

export async function GET() {
  return NextResponse.json({ authRequired: authRequiredForApp() });
}
