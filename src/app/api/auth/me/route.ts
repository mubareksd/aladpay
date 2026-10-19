import { NextResponse } from "next/server";
import { authRequiredForApp, getServerSession } from "@/lib/auth/guard";

export async function GET() {
  const authRequired = authRequiredForApp();
  const session = await getServerSession();
  return NextResponse.json({ authRequired, session });
}
