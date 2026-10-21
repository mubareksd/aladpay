import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { posGuestOrders, posPublishedMenu } from "@/lib/db/schema";
import { ensureDatabaseSchema, getDb } from "@/lib/db/client";
import type { PublishedGuestMenu, ServerGuestOrder } from "@/lib/pos/types";

const DEFAULT_PUBLIC: PublishedGuestMenu = {
  updatedAt: 0,
  venueName: "Restaurant",
  tables: [],
  menuItems: [],
};

export async function getPublishedMenu(companyId: string): Promise<PublishedGuestMenu> {
  await ensureDatabaseSchema();
  const row = await getDb()
    .select({ menu: posPublishedMenu.menu })
    .from(posPublishedMenu)
    .where(eq(posPublishedMenu.companyId, companyId))
    .limit(1)
    .then((r) => r[0]);
  const menu = row?.menu;
  if (!menu || typeof menu !== "object") return DEFAULT_PUBLIC;
  return menu;
}

export async function publishGuestMenu(
  companyId: string,
  menu: PublishedGuestMenu,
): Promise<PublishedGuestMenu> {
  await ensureDatabaseSchema();
  const published = { ...menu, updatedAt: Date.now() };
  await getDb()
    .insert(posPublishedMenu)
    .values({
      companyId,
      menu: published,
      updatedAt: published.updatedAt,
    })
    .onDuplicateKeyUpdate({
      set: {
        menu: published,
        updatedAt: published.updatedAt,
      },
    });
  return published;
}

export async function appendGuestOrder(
  companyId: string,
  order: Omit<ServerGuestOrder, "id" | "createdAt" | "acknowledged">,
): Promise<ServerGuestOrder> {
  await ensureDatabaseSchema();
  const entry: ServerGuestOrder = {
    ...order,
    id: crypto.randomUUID(),
    createdAt: Date.now(),
    acknowledged: false,
  };
  await getDb().insert(posGuestOrders).values({
    id: entry.id,
    companyId,
    tableId: entry.tableId,
    tableLabel: entry.tableLabel,
    orderLines: entry.lines,
    note: entry.note,
    createdAt: entry.createdAt,
    acknowledged: 0,
  });
  await getDb().execute(sql`
    DELETE FROM pos_guest_orders
    WHERE company_id = ${companyId} AND id IN (
      SELECT id FROM (
        SELECT id FROM pos_guest_orders
        WHERE company_id = ${companyId}
        ORDER BY created_at DESC
        LIMIT 999999 OFFSET 200
      ) AS overflow
    )
  `);
  return entry;
}

export async function listPendingGuestOrders(companyId: string): Promise<ServerGuestOrder[]> {
  await ensureDatabaseSchema();
  const rows = await getDb()
    .select()
    .from(posGuestOrders)
    .where(and(eq(posGuestOrders.companyId, companyId), eq(posGuestOrders.acknowledged, 0)))
    .orderBy(desc(posGuestOrders.createdAt))
    .limit(100);
  return rows.map((row) => ({
    id: row.id,
    tableId: row.tableId,
    tableLabel: row.tableLabel,
    lines: row.orderLines,
    note: row.note,
    createdAt: row.createdAt,
    acknowledged: Boolean(row.acknowledged),
  }));
}

export async function acknowledgeGuestOrders(companyId: string, ids: string[]): Promise<number> {
  if (ids.length === 0) return 0;
  await ensureDatabaseSchema();
  const result = await getDb()
    .update(posGuestOrders)
    .set({ acknowledged: 1 })
    .where(
      and(
        eq(posGuestOrders.companyId, companyId),
        inArray(posGuestOrders.id, ids),
        eq(posGuestOrders.acknowledged, 0),
      ),
    );
  return result[0]?.affectedRows ?? 0;
}
