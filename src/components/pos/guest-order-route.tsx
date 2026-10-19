"use client";

import { useParams } from "next/navigation";
import { GuestOrderPage } from "@/components/pos/guest-order-page";

export function GuestOrderRoute() {
  const params = useParams();
  const companySlug = typeof params.companySlug === "string" ? params.companySlug : undefined;
  const tableId = typeof params.tableId === "string" ? params.tableId : "";
  return <GuestOrderPage companySlug={companySlug} tableId={tableId} />;
}

export function GuestLegacyOrderRoute() {
  const params = useParams();
  const tableId = typeof params.tableId === "string" ? params.tableId : "";
  return <GuestOrderPage tableId={tableId} />;
}
