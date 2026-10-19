import { databaseConfigured } from "@/lib/db/pool";
import type { PublishedGuestMenu, ServerGuestOrder } from "@/lib/pos/types";
import * as fileStore from "@/lib/pos/server-store-file";
import * as pgStore from "@/lib/pos/server-store-pg";

function backend() {
  return databaseConfigured() ? pgStore : fileStore;
}

export function posStorageBackend(): "postgres" | "file" {
  return databaseConfigured() ? "postgres" : "file";
}

export async function getPublishedMenu(): Promise<PublishedGuestMenu> {
  return backend().getPublishedMenu();
}

export async function publishGuestMenu(menu: PublishedGuestMenu): Promise<PublishedGuestMenu> {
  return backend().publishGuestMenu(menu);
}

export async function appendGuestOrder(
  order: Omit<ServerGuestOrder, "id" | "createdAt" | "acknowledged">,
): Promise<ServerGuestOrder> {
  return backend().appendGuestOrder(order);
}

export async function listPendingGuestOrders(): Promise<ServerGuestOrder[]> {
  return backend().listPendingGuestOrders();
}

export async function acknowledgeGuestOrders(ids: string[]): Promise<number> {
  return backend().acknowledgeGuestOrders(ids);
}
