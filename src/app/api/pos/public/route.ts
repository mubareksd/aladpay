import { NextResponse } from "next/server";
import { getCompanyIdBySlug } from "@/lib/auth/repository";
import { databaseConfigured } from "@/lib/db/pool";
import { getPublishedMenu } from "@/lib/pos/server-store";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const companySlug = searchParams.get("company")?.trim();
  if (databaseConfigured()) {
    if (!companySlug) {
      return NextResponse.json({ error: "company query required" }, { status: 422 });
    }
    const companyId = await getCompanyIdBySlug(companySlug);
    if (!companyId) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }
    const menu = await getPublishedMenu(companyId);
    return NextResponse.json(menu);
  }
  const menu = await getPublishedMenu();
  return NextResponse.json(menu);
}
