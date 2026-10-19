"use client";

import { useParams } from "next/navigation";
import { AcceptInviteForm } from "@/components/auth/accept-invite-form";

export function AcceptInviteRoute() {
  const params = useParams();
  const token = typeof params.token === "string" ? params.token : "";
  return <AcceptInviteForm token={token} />;
}
