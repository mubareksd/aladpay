import type { GuestOrderSubmit, PublishedGuestMenu } from "@/lib/pos/types";

export async function fetchPublishedMenu(): Promise<PublishedGuestMenu | null> {
  const res = await fetch("/api/pos/public", { cache: "no-store" });
  if (!res.ok) return null;
  return (await res.json()) as PublishedGuestMenu;
}

export async function publishMenuToServer(menu: PublishedGuestMenu): Promise<void> {
  const res = await fetch("/api/pos/publish", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(menu),
  });
  if (!res.ok) {
    const data = (await res.json()) as { error?: string };
    throw new Error(data.error ?? "Publish failed");
  }
}

export async function submitGuestOrder(order: GuestOrderSubmit): Promise<string> {
  const res = await fetch("/api/pos/guest-order", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(order),
  });
  const data = (await res.json()) as { orderId?: string; error?: string };
  if (!res.ok) throw new Error(data.error ?? "Could not submit order");
  return data.orderId ?? "";
}

export async function fetchGuestInbox() {
  const res = await fetch("/api/pos/inbox", { cache: "no-store" });
  if (!res.ok) return [];
  const data = (await res.json()) as { orders: import("@/lib/pos/types").ServerGuestOrder[] };
  return data.orders ?? [];
}

export async function acknowledgeInbox(ids: string[]): Promise<void> {
  await fetch("/api/pos/inbox", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ids }),
  });
}
