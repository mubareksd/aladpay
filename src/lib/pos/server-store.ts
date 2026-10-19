import { databaseConfigured } from "@/lib/db/pool";
import type { PublishedGuestMenu, ServerGuestOrder } from "@/lib/pos/types";
import * as fileStore from "@/lib/pos/server-store-file";
import * as pgStore from "@/lib/pos/server-store-pg";

function postgresBackendEnabled(): boolean {
  return databaseConfigured();
}

export function posStorageBackend(): "postgres" | "file" {
  return postgresBackendEnabled() ? "postgres" : "file";
}

export async function getPublishedMenu(companyId?: string): Promise<PublishedGuestMenu> {
  if (postgresBackendEnabled()) {
    if (!companyId) return fileStore.getPublishedMenu();
    return pgStore.getPublishedMenu(companyId);
  }
  return fileStore.getPublishedMenu();
}

export async function publishGuestMenu(
  menu: PublishedGuestMenu,
  companyId?: string,
): Promise<PublishedGuestMenu> {
  if (postgresBackendEnabled()) {
    if (!companyId) throw new Error("companyId required");
    return pgStore.publishGuestMenu(companyId, menu);
  }
  return fileStore.publishGuestMenu(menu);
}

export async function appendGuestOrder(
  order: Omit<ServerGuestOrder, "id" | "createdAt" | "acknowledged">,
  companyId?: string,
): Promise<ServerGuestOrder> {
  if (postgresBackendEnabled()) {
    if (!companyId) throw new Error("companyId required");
    return pgStore.appendGuestOrder(companyId, order);
  }
  return fileStore.appendGuestOrder(order);
}

export async function listPendingGuestOrders(companyId?: string): Promise<ServerGuestOrder[]> {
  if (postgresBackendEnabled()) {
    if (!companyId) return [];
    return pgStore.listPendingGuestOrders(companyId);
  }
  return fileStore.listPendingGuestOrders();
}

export async function acknowledgeGuestOrders(companyId: string | undefined, ids: string[]): Promise<number> {
  if (postgresBackendEnabled()) {
    if (!companyId) return 0;
    return pgStore.acknowledgeGuestOrders(companyId, ids);
  }
  return fileStore.acknowledgeGuestOrders(ids);
}
