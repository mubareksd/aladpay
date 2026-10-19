import { describe, expect, it } from "vitest";
import { orderTotal } from "@/lib/pos/order-math";
import type { PosOrder } from "@/lib/pos/types";

describe("orderTotal", () => {
  it("sums line quantities and prices", () => {
    const order: Pick<PosOrder, "lines"> = {
      lines: [
        { id: "1", menuItemId: "a", name: "Coffee", unitPrice: 80, quantity: 2 },
        { id: "2", menuItemId: "b", name: "Burger", unitPrice: 350, quantity: 1 },
      ],
    };
    expect(orderTotal(order)).toBe(510);
  });
});
