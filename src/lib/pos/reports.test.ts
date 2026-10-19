import { describe, expect, it } from "vitest";
import { buildDailyReport } from "@/lib/pos/reports";
import type { PosOrder } from "@/lib/pos/types";

const noon = new Date("2026-10-19T12:00:00+03:00").getTime();

function order(partial: Partial<PosOrder> & Pick<PosOrder, "id">): PosOrder {
  return {
    tableId: null,
    tableLabel: "T1",
    status: "open",
    source: "staff",
    lines: [],
    note: "",
    createdAt: noon,
    updatedAt: noon,
    ...partial,
  };
}

describe("buildDailyReport", () => {
  it("sums paid orders and top items for the local day", () => {
    const orders: PosOrder[] = [
      order({
        id: "a",
        status: "paid",
        paidAt: noon,
        lines: [
          {
            id: "l1",
            menuItemId: "m1",
            name: "Injera",
            unitPrice: 50,
            quantity: 2,
          },
        ],
      }),
      order({
        id: "b",
        status: "open",
        createdAt: noon,
        lines: [
          {
            id: "l2",
            menuItemId: "m2",
            name: "Coffee",
            unitPrice: 30,
            quantity: 1,
          },
        ],
      }),
    ];

    const report = buildDailyReport(orders, noon + 60_000);
    expect(report.paidOrderCount).toBe(1);
    expect(report.revenueEtb).toBe(100);
    expect(report.openTicketCount).toBe(1);
    expect(report.topItems[0]?.name).toBe("Injera");
  });
});
