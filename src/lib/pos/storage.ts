import { defaultPosState } from "@/lib/pos/defaults";
import { orderTotal } from "@/lib/pos/order-math";
import type {
  MenuItem,
  OrderLine,
  OrderStatus,
  PosOrder,
  PosPaymentSettings,
  PosState,
  PosTable,
  TableStatus,
} from "@/lib/pos/types";

export const POS_STORAGE_KEY = "aladpay.pos.v1";

const SERVER_SNAPSHOT = defaultPosState();
let clientSnapshot: PosState = SERVER_SNAPSHOT;
let clientSnapshotSerialized: string | null = null;
const listeners = new Set<() => void>();

function isPosState(value: unknown): value is PosState {
  if (!value || typeof value !== "object") return false;
  const v = value as PosState;
  return Array.isArray(v.tables) && Array.isArray(v.menuItems) && Array.isArray(v.orders);
}

function parsePosState(raw: string | null): PosState {
  if (!raw) return defaultPosState();
  try {
    const data = JSON.parse(raw) as unknown;
    if (!isPosState(data)) return defaultPosState();
    return {
      ...defaultPosState(),
      ...data,
      payment: { ...defaultPosState().payment, ...data.payment },
    };
  } catch {
    return defaultPosState();
  }
}

function syncClientSnapshotFromStorage(): PosState {
  if (typeof window === "undefined") return SERVER_SNAPSHOT;
  const raw = localStorage.getItem(POS_STORAGE_KEY);
  if (raw === clientSnapshotSerialized) return clientSnapshot;
  clientSnapshotSerialized = raw;
  clientSnapshot = parsePosState(raw);
  return clientSnapshot;
}

function publish(state: PosState): void {
  const serialized = JSON.stringify(state);
  localStorage.setItem(POS_STORAGE_KEY, serialized);
  clientSnapshot = state;
  clientSnapshotSerialized = serialized;
  listeners.forEach((l) => l());
}

export function subscribePos(onStoreChange: () => void): () => void {
  syncClientSnapshotFromStorage();
  listeners.add(onStoreChange);
  return () => listeners.delete(onStoreChange);
}

export function getPosClientSnapshot(): PosState {
  return syncClientSnapshotFromStorage();
}

export function getPosServerSnapshot(): PosState {
  return SERVER_SNAPSHOT;
}

export function replacePosState(state: PosState): void {
  publish(state);
}

export function updatePos(mutator: (state: PosState) => PosState): void {
  publish(mutator(syncClientSnapshotFromStorage()));
}

export function upsertTable(table: PosTable): void {
  updatePos((s) => ({
    ...s,
    tables: [table, ...s.tables.filter((t) => t.id !== table.id)].sort((a, b) =>
      a.label.localeCompare(b.label, undefined, { numeric: true }),
    ),
  }));
}

export function removeTable(id: string): void {
  updatePos((s) => ({
    ...s,
    tables: s.tables.filter((t) => t.id !== id),
    orders: s.orders.map((o) =>
      o.tableId === id ? { ...o, tableId: null, tableLabel: "Takeaway" } : o,
    ),
  }));
}

export function setTableStatus(id: string, status: TableStatus): void {
  updatePos((s) => ({
    ...s,
    tables: s.tables.map((t) => (t.id === id ? { ...t, status, updatedAt: Date.now() } : t)),
  }));
}

export function upsertMenuItem(item: MenuItem): void {
  updatePos((s) => ({
    ...s,
    menuItems: [item, ...s.menuItems.filter((m) => m.id !== item.id)].sort((a, b) =>
      a.name.localeCompare(b.name),
    ),
  }));
}

export function removeMenuItem(id: string): void {
  updatePos((s) => ({ ...s, menuItems: s.menuItems.filter((m) => m.id !== id) }));
}

export function createOrder(table: PosTable | null): PosOrder {
  const order: PosOrder = {
    id: crypto.randomUUID(),
    tableId: table?.id ?? null,
    tableLabel: table?.label ?? "Takeaway",
    status: "open",
    lines: [],
    note: "",
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  updatePos((s) => {
    const tables =
      table && table.status === "available"
        ? s.tables.map((t) =>
            t.id === table.id ? { ...t, status: "occupied" as const, updatedAt: Date.now() } : t,
          )
        : s.tables;
    return { ...s, tables, orders: [order, ...s.orders] };
  });
  return order;
}

export function updateOrder(orderId: string, patch: Partial<PosOrder>): void {
  updatePos((s) => ({
    ...s,
    orders: s.orders.map((o) =>
      o.id === orderId ? { ...o, ...patch, updatedAt: Date.now() } : o,
    ),
  }));
}

export function addLineToOrder(orderId: string, item: MenuItem, quantity = 1): void {
  updatePos((s) => ({
    ...s,
    orders: s.orders.map((o) => {
      if (o.id !== orderId || o.status !== "open") return o;
      const existing = o.lines.find((l) => l.menuItemId === item.id);
      let lines: OrderLine[];
      if (existing) {
        lines = o.lines.map((l) =>
          l.menuItemId === item.id ? { ...l, quantity: l.quantity + quantity } : l,
        );
      } else {
        lines = [
          ...o.lines,
          {
            id: crypto.randomUUID(),
            menuItemId: item.id,
            name: item.name,
            unitPrice: item.price,
            quantity,
          },
        ];
      }
      return { ...o, lines, updatedAt: Date.now() };
    }),
  }));
}

export function setOrderStatus(orderId: string, status: OrderStatus): void {
  updatePos((s) => {
    const order = s.orders.find((o) => o.id === orderId);
    if (!order) return s;
    let tables = s.tables;
    if (status === "paid" || status === "cancelled") {
      if (order.tableId) {
        const otherOpen = s.orders.some(
          (o) =>
            o.id !== orderId &&
            o.tableId === order.tableId &&
            (o.status === "open" || o.status === "awaiting_payment"),
        );
        if (!otherOpen) {
          tables = tables.map((t) =>
            t.id === order.tableId
              ? { ...t, status: "available" as const, updatedAt: Date.now() }
              : t,
          );
        }
      }
    }
    return {
      ...s,
      tables,
      orders: s.orders.map((o) =>
        o.id === orderId
          ? {
              ...o,
              status,
              paidAt: status === "paid" ? Date.now() : o.paidAt,
              updatedAt: Date.now(),
            }
          : o,
      ),
    };
  });
}

export function markOrderPaidByNonce(nonce: string): boolean {
  const state = syncClientSnapshotFromStorage();
  if (!state.orders.some((o) => o.id === nonce)) return false;
  setOrderStatus(nonce, "paid");
  return true;
}

export function setPaymentSettings(payment: PosPaymentSettings): void {
  updatePos((s) => ({ ...s, payment }));
}

export function openOrders(state: PosState): PosOrder[] {
  return state.orders.filter((o) => o.status === "open" || o.status === "awaiting_payment");
}

export function orderTotalEtb(order: PosOrder): number {
  return orderTotal(order);
}
