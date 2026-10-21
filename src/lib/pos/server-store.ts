import { databaseConfigured } from "@/lib/db/pool";
import type { PublishedGuestMenu, ServerGuestOrder } from "@/lib/pos/types";
import * as fileStore from "@/lib/pos/server-store-file";
import * as mysqlStore from "@/lib/pos/server-store-mysql";

function mysqlBackendEnabled(): boolean {
  return databaseConfigured();
}

export function posStorageBackend(): "mysql" | "file" {
  return mysqlBackendEnabled() ? "mysql" : "file";
}

export async function getPublishedMenu(companyId?: string): Promise<PublishedGuestMenu> {
  if (mysqlBackendEnabled()) {
    if (!companyId) return fileStore.getPublishedMenu();
    return mysqlStore.getPublishedMenu(companyId);
  }
  return fileStore.getPublishedMenu();
}

export async function publishGuestMenu(
  menu: PublishedGuestMenu,
  companyId?: string,
): Promise<PublishedGuestMenu> {
  if (mysqlBackendEnabled()) {
    if (!companyId) throw new Error("companyId required");
    return mysqlStore.publishGuestMenu(companyId, menu);
  }
  return fileStore.publishGuestMenu(menu);
}

export async function appendGuestOrder(
  order: Omit<ServerGuestOrder, "id" | "createdAt" | "acknowledged">,
  companyId?: string,
): Promise<ServerGuestOrder> {
  if (mysqlBackendEnabled()) {
    if (!companyId) throw new Error("companyId required");
    return mysqlStore.appendGuestOrder(companyId, order);
  }
  return fileStore.appendGuestOrder(order);
}

export async function listPendingGuestOrders(companyId?: string): Promise<ServerGuestOrder[]> {
  if (mysqlBackendEnabled()) {
    if (!companyId) return [];
    return mysqlStore.listPendingGuestOrders(companyId);
  }
  return fileStore.listPendingGuestOrders();
}

export async function acknowledgeGuestOrders(companyId: string | undefined, ids: string[]): Promise<number> {
  if (mysqlBackendEnabled()) {
    if (!companyId) return 0;
    return mysqlStore.acknowledgeGuestOrders(companyId, ids);
  }
  return fileStore.acknowledgeGuestOrders(ids);
}
