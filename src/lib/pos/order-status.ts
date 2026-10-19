import type { OrderStatus } from "@/lib/pos/types";

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  open: "Open",
  kitchen: "In kitchen",
  ready: "Ready",
  served: "Served",
  awaiting_payment: "Awaiting payment",
  paid: "Paid",
  cancelled: "Cancelled",
};

/** Order still using the table or bill is unsettled. */
export function isActiveOrderStatus(status: OrderStatus): boolean {
  return (
    status === "open" ||
    status === "kitchen" ||
    status === "ready" ||
    status === "served" ||
    status === "awaiting_payment"
  );
}

export function isKitchenQueueStatus(status: OrderStatus): boolean {
  return status === "kitchen" || status === "ready";
}
