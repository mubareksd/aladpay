import { orderTotal } from "@/lib/pos/order-math";
import type { PosOrder } from "@/lib/pos/types";

export type DailyPosReport = {
  paidOrderCount: number;
  revenueEtb: number;
  openTicketCount: number;
  topItems: { name: string; quantity: number; revenue: number }[];
};

function startOfLocalDay(ts = Date.now()): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function buildDailyReport(orders: PosOrder[], now = Date.now()): DailyPosReport {
  const dayStart = startOfLocalDay(now);
  const paidToday = orders.filter(
    (o) => o.status === "paid" && (o.paidAt ?? o.updatedAt) >= dayStart,
  );
  const revenueEtb = paidToday.reduce((sum, o) => sum + orderTotal(o), 0);
  const openTicketCount = orders.filter(
    (o) =>
      o.status !== "paid" &&
      o.status !== "cancelled" &&
      o.createdAt >= dayStart,
  ).length;

  const itemMap = new Map<string, { name: string; quantity: number; revenue: number }>();
  for (const order of paidToday) {
    for (const line of order.lines) {
      const key = line.name;
      const prev = itemMap.get(key) ?? { name: line.name, quantity: 0, revenue: 0 };
      prev.quantity += line.quantity;
      prev.revenue += line.unitPrice * line.quantity;
      itemMap.set(key, prev);
    }
  }
  const topItems = [...itemMap.values()]
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  return {
    paidOrderCount: paidToday.length,
    revenueEtb: Math.round(revenueEtb * 100) / 100,
    openTicketCount,
    topItems,
  };
}
