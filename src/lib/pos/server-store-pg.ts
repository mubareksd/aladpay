import { ensurePosSchema, getPool } from "@/lib/db/pool";
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
  created_at: string;
  acknowledged: boolean;
}): ServerGuestOrder {
  return {
    id: row.id,
    tableId: row.table_id,
    tableLabel: row.table_label,
    lines: row.lines as ServerGuestOrder["lines"],
    note: row.note,
    createdAt: Number(row.created_at),
    acknowledged: row.acknowledged,
  };
}

export async function getPublishedMenu(): Promise<PublishedGuestMenu> {
  await ensurePosSchema();
  const result = await getPool().query<{ menu: PublishedGuestMenu }>(
    "SELECT menu FROM pos_published_menu WHERE id = 1",
  );
  const menu = result.rows[0]?.menu;
  if (!menu || typeof menu !== "object") return DEFAULT_PUBLIC;
  return menu;
}

export async function publishGuestMenu(menu: PublishedGuestMenu): Promise<PublishedGuestMenu> {
  await ensurePosSchema();
  const published = { ...menu, updatedAt: Date.now() };
  await getPool().query(
    `INSERT INTO pos_published_menu (id, menu, updated_at)
     VALUES (1, $1::jsonb, $2)
     ON CONFLICT (id) DO UPDATE SET menu = EXCLUDED.menu, updated_at = EXCLUDED.updated_at`,
    [JSON.stringify(published), published.updatedAt],
  );
  return published;
}

export async function appendGuestOrder(
  order: Omit<ServerGuestOrder, "id" | "createdAt" | "acknowledged">,
): Promise<ServerGuestOrder> {
  await ensurePosSchema();
  const entry: ServerGuestOrder = {
    ...order,
    id: crypto.randomUUID(),
    createdAt: Date.now(),
    acknowledged: false,
  };
  await getPool().query(
    `INSERT INTO pos_guest_orders (id, table_id, table_label, lines, note, created_at, acknowledged)
     VALUES ($1, $2, $3, $4::jsonb, $5, $6, false)`,
    [
      entry.id,
      entry.tableId,
      entry.tableLabel,
      JSON.stringify(entry.lines),
      entry.note,
      entry.createdAt,
    ],
  );
  await getPool().query(
    `DELETE FROM pos_guest_orders
     WHERE id IN (
       SELECT id FROM (
         SELECT id FROM pos_guest_orders ORDER BY created_at DESC OFFSET 200
       ) AS overflow
     )`,
  );
  return entry;
}

export async function listPendingGuestOrders(): Promise<ServerGuestOrder[]> {
  await ensurePosSchema();
  const result = await getPool().query(
    `SELECT id, table_id, table_label, lines, note, created_at, acknowledged
     FROM pos_guest_orders
     WHERE acknowledged = false
     ORDER BY created_at DESC
     LIMIT 100`,
  );
  return result.rows.map(rowToOrder);
}

export async function acknowledgeGuestOrders(ids: string[]): Promise<number> {
  if (ids.length === 0) return 0;
  await ensurePosSchema();
  const result = await getPool().query(
    `UPDATE pos_guest_orders SET acknowledged = true
     WHERE id = ANY($1::uuid[]) AND acknowledged = false`,
    [ids],
  );
  return result.rowCount ?? 0;
}
