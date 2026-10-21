import { ensureDatabaseSchema, query } from "@/lib/db/pool";
import { parseJsonColumn } from "@/lib/db/sql";
import type { PublishedGuestMenu, ServerGuestOrder } from "@/lib/pos/types";

const DEFAULT_PUBLIC: PublishedGuestMenu = {
  updatedAt: 0,
  venueName: "Restaurant",
  tables: [],
  menuItems: [],
};

function rowToOrder(row: {
  id: string;
  table_id: string;
  table_label: string;
  lines: unknown;
  note: string;
  created_at: string | number;
  acknowledged: number | boolean;
}): ServerGuestOrder {
  return {
    id: row.id,
    tableId: row.table_id,
    tableLabel: row.table_label,
    lines: parseJsonColumn<ServerGuestOrder["lines"]>(row.lines),
    note: row.note,
    createdAt: Number(row.created_at),
    acknowledged: Boolean(row.acknowledged),
  };
}

export async function getPublishedMenu(companyId: string): Promise<PublishedGuestMenu> {
  await ensureDatabaseSchema();
  const result = await query<{ menu: unknown }>(
    "SELECT menu FROM pos_published_menu WHERE company_id = $1",
    [companyId],
  );
  const raw = result.rows[0]?.menu;
  if (raw == null) return DEFAULT_PUBLIC;
  const menu = parseJsonColumn<PublishedGuestMenu>(raw);
  if (!menu || typeof menu !== "object") return DEFAULT_PUBLIC;
  return menu;
}

export async function publishGuestMenu(
  companyId: string,
  menu: PublishedGuestMenu,
): Promise<PublishedGuestMenu> {
  await ensureDatabaseSchema();
  const published = { ...menu, updatedAt: Date.now() };
  await query(
    `INSERT INTO pos_published_menu (company_id, menu, updated_at)
     VALUES ($1, $2, $3)
     ON DUPLICATE KEY UPDATE menu = VALUES(menu), updated_at = VALUES(updated_at)`,
    [companyId, JSON.stringify(published), published.updatedAt],
  );
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
  await query(
    `INSERT INTO pos_guest_orders (id, company_id, table_id, table_label, lines, note, created_at, acknowledged)
     VALUES ($1, $2, $3, $4, $5, $6, $7, 0)`,
    [
      entry.id,
      companyId,
      entry.tableId,
      entry.tableLabel,
      JSON.stringify(entry.lines),
      entry.note,
      entry.createdAt,
    ],
  );
  await query(
    `DELETE FROM pos_guest_orders
     WHERE company_id = $1 AND id IN (
       SELECT id FROM (
         SELECT id FROM pos_guest_orders WHERE company_id = $1 ORDER BY created_at DESC LIMIT 999999 OFFSET 200
       ) AS overflow
     )`,
    [companyId],
  );
  return entry;
}

export async function listPendingGuestOrders(companyId: string): Promise<ServerGuestOrder[]> {
  await ensureDatabaseSchema();
  const result = await query<{
    id: string;
    table_id: string;
    table_label: string;
    lines: unknown;
    note: string;
    created_at: string | number;
    acknowledged: number | boolean;
  }>(
    `SELECT id, table_id, table_label, lines, note, created_at, acknowledged
     FROM pos_guest_orders
     WHERE company_id = $1 AND acknowledged = 0
     ORDER BY created_at DESC
     LIMIT 100`,
    [companyId],
  );
  return result.rows.map(rowToOrder);
}

export async function acknowledgeGuestOrders(companyId: string, ids: string[]): Promise<number> {
  if (ids.length === 0) return 0;
  await ensureDatabaseSchema();
  const placeholders = ids.map((_, i) => `$${i + 2}`).join(", ");
  const result = await query(
    `UPDATE pos_guest_orders SET acknowledged = 1
     WHERE company_id = $1 AND id IN (${placeholders}) AND acknowledged = 0`,
    [companyId, ...ids],
  );
  return result.rowCount ?? 0;
}
