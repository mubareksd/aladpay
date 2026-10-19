import type { OrderLine, PosOrder } from "@/lib/pos/types";

export function orderLineTotal(line: OrderLine): number {
  return line.unitPrice * line.quantity;
}

export function orderTotal(order: Pick<PosOrder, "lines">): number {
  return order.lines.reduce((sum, line) => sum + orderLineTotal(line), 0);
}

export function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}
