import { NextResponse } from "next/server";
import { getPublishedMenu } from "@/lib/pos/server-store";

export async function GET() {
  const menu = await getPublishedMenu();
  return NextResponse.json(menu);
}
