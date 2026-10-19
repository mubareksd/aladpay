"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchPublishedMenu, submitGuestOrder } from "@/lib/pos/guest-client";
import { orderTotal } from "@/lib/pos/order-math";
import type { OrderLine, PublishedGuestMenu } from "@/lib/pos/types";
import { btnPrimaryClass, btnSecondaryClass, fieldClass, panelClass } from "@/lib/ui-classes";

type CartLine = Pick<OrderLine, "menuItemId" | "name" | "unitPrice" | "quantity">;

export function GuestOrderPage({ tableId }: { tableId: string }) {
  const [menu, setMenu] = useState<PublishedGuestMenu | null>(null);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    void fetchPublishedMenu()
      .then(setMenu)
      .finally(() => setLoading(false));
  }, []);

  const table = menu?.tables.find((t) => t.id === tableId);
  const items = useMemo(
    () => menu?.menuItems.filter((m) => m.available) ?? [],
    [menu?.menuItems],
  );

  const categories = useMemo(() => {
    const set = new Set(items.map((i) => i.category));
    return [...set];
  }, [items]);

  const total = useMemo(
    () =>
      cart.reduce(
        (sum, line) => sum + line.unitPrice * line.quantity,
        0,
      ),
    [cart],
  );

  const addItem = useCallback((item: (typeof items)[0]) => {
    setCart((prev) => {
      const existing = prev.find((l) => l.menuItemId === item.id);
      if (existing) {
        return prev.map((l) =>
          l.menuItemId === item.id ? { ...l, quantity: l.quantity + 1 } : l,
        );
      }
      return [
        ...prev,
        {
          menuItemId: item.id,
          name: item.name,
          unitPrice: item.price,
          quantity: 1,
        },
      ];
    });
  }, []);

  const submit = useCallback(async () => {
    if (!table || cart.length === 0) return;
    setError(null);
    try {
      await submitGuestOrder({
        tableId: table.id,
        tableLabel: table.label,
        lines: cart,
        note,
      });
      setDone(true);
      setCart([]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Submit failed");
    }
  }, [cart, note, table]);

  if (loading) {
    return <p className="p-6 text-sm text-muted">Loading menu…</p>;
  }
  if (!menu || menu.menuItems.length === 0) {
    return (
      <main className="mx-auto max-w-lg p-6 text-sm text-muted">
        Menu not published yet. Ask staff to publish the guest menu from AladPay Orders.
      </main>
    );
  }
  if (!table) {
    return (
      <main className="mx-auto max-w-lg p-6 text-sm text-muted">
        This table link is invalid. Scan the QR on your table again.
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-[100dvh] max-w-lg bg-background px-4 py-6 pb-28">
      <header className="mb-6">
        <p className="text-xs font-medium uppercase tracking-wide text-brand">{menu.venueName}</p>
        <h1 className="text-xl font-semibold text-foreground">{table.label}</h1>
        <p className="mt-1 text-sm text-muted">Order from your phone — no app install.</p>
      </header>

      {done ? (
        <div className={`${panelClass} text-sm text-foreground`}>
          Order sent to the kitchen. A staff member will confirm and serve you.
        </div>
      ) : null}

      {categories.map((category) => (
        <section key={category} className="mb-6">
          <h2 className="mb-2 text-sm font-medium text-muted">{category}</h2>
          <ul className="space-y-2">
            {items
              .filter((i) => i.category === category)
              .map((item) => (
                <li key={item.id} className={`${panelClass} flex items-center justify-between gap-3 py-3`}>
                  <div>
                    <p className="font-medium text-foreground">{item.name}</p>
                    {item.nameAm ? <p className="text-sm text-muted">{item.nameAm}</p> : null}
                    <p className="text-sm tabular-nums text-muted">{item.price.toFixed(2)} ETB</p>
                  </div>
                  <button
                    type="button"
                    className={btnSecondaryClass + " !min-h-9 w-auto px-3 text-xs"}
                    onClick={() => addItem(item)}
                  >
                    Add
                  </button>
                </li>
              ))}
          </ul>
        </section>
      ))}

      <div className="fixed inset-x-0 bottom-0 border-t border-border bg-surface p-4 pb-[env(safe-area-inset-bottom,0)]">
        <textarea
          className={fieldClass + " mb-2 min-h-[3rem] text-sm"}
          placeholder="Note for kitchen (optional)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        <p className="mb-2 text-sm font-semibold tabular-nums">Total: {total.toFixed(2)} ETB</p>
        {error ? <p className="mb-2 text-xs text-red-800">{error}</p> : null}
        <button
          type="button"
          disabled={cart.length === 0}
          className={btnPrimaryClass}
          onClick={() => void submit()}
        >
          Send order
        </button>
      </div>
    </main>
  );
}

/** For tests / reuse */
export function cartTotal(lines: CartLine[]): number {
  return orderTotal({ lines: lines.map((l) => ({ ...l, id: "x" })) });
}
