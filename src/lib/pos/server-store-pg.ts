import { ensureDatabaseSchema, getPool } from "@/lib/db/pool";
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

export async function getPublishedMenu(companyId: string): Promise<PublishedGuestMenu> {
  await ensureDatabaseSchema();
  const result = await getPool().query<{ menu: PublishedGuestMenu }>(
    "SELECT menu FROM pos_published_menu WHERE company_id = $1",
    [companyId],
  );
  const menu = result.rows[0]?.menu;
  if (!menu || typeof menu !== "object") return DEFAULT_PUBLIC;
  return menu;
}

export async function publishGuestMenu(
  companyId: string,
  menu: PublishedGuestMenu,
): Promise<PublishedGuestMenu> {
  await ensureDatabaseSchema();
  const published = { ...menu, updatedAt: Date.now() };
  await getPool().query(
    `INSERT INTO pos_published_menu (company_id, menu, updated_at)
     VALUES ($1, $2::jsonb, $3)
     ON CONFLICT (company_id) DO UPDATE SET menu = EXCLUDED.menu, updated_at = EXCLUDED.updated_at`,
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
  await getPool().query(
    `INSERT INTO pos_guest_orders (id, company_id, table_id, table_label, lines, note, created_at, acknowledged)
     VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7, false)`,
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
  await getPool().query(
    `DELETE FROM pos_guest_orders
     WHERE company_id = $1 AND id IN (
       SELECT id FROM (
         SELECT id FROM pos_guest_orders WHERE company_id = $1 ORDER BY created_at DESC OFFSET 200
       ) AS overflow
     )`,
    [companyId],
  );
  return entry;
}

export async function listPendingGuestOrders(companyId: string): Promise<ServerGuestOrder[]> {
  await ensureDatabaseSchema();
  const result = await getPool().query(
    `SELECT id, table_id, table_label, lines, note, created_at, acknowledged
     FROM pos_guest_orders
     WHERE company_id = $1 AND acknowledged = false
     ORDER BY created_at DESC
     LIMIT 100`,
    [companyId],
  );
  return result.rows.map(rowToOrder);
}

export async function acknowledgeGuestOrders(companyId: string, ids: string[]): Promise<number> {
  if (ids.length === 0) return 0;
  await ensureDatabaseSchema();
  const result = await getPool().query(
    `UPDATE pos_guest_orders SET acknowledged = true
     WHERE company_id = $1 AND id = ANY($2::uuid[]) AND acknowledged = false`,
    [companyId, ids],
  );
  return result.rowCount ?? 0;
}
