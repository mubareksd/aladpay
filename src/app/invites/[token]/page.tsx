import { Suspense } from "react";
import { AcceptInviteRoute } from "@/components/auth/accept-invite-route";

export const instant = false;

export default function AcceptInvitePage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto max-w-md px-4 py-12 text-sm text-muted">Loading invite…</main>
      }
    >
      <AcceptInviteRoute />
    </Suspense>
  );
}
