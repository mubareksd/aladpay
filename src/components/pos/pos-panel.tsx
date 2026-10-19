"use client";

import { useCallback, useMemo, useState } from "react";
import { usePos } from "@/hooks/use-pos";
import { useSavedAccounts } from "@/hooks/use-saved-accounts";
import { ALAD_BANK_OPTIONS, bicToAladBank } from "@/lib/alad/bank-codes";
import { createOrderCheckoutSession, paymentSettingsReady } from "@/lib/pos/checkout";
import { orderTotal } from "@/lib/pos/order-math";
import { openOrders } from "@/lib/pos/storage";
import type { MenuItem, PosOrder, PosTable, TableStatus } from "@/lib/pos/types";
import {
  btnPrimaryClass,
  btnSecondaryClass,
  fieldClass,
  panelClass,
} from "@/lib/ui-classes";

type PosTab = "tables" | "menu" | "orders";

const TABLE_STATUS_LABEL: Record<TableStatus, string> = {
  available: "Available",
  occupied: "Occupied",
  reserved: "Reserved",
};

export function PosPanel() {
  const pos = usePos();
  const { accounts } = useSavedAccounts();
  const [tab, setTab] = useState<PosTab>("orders");
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [payLoading, setPayLoading] = useState(false);

  const { tables, menuItems, orders, payment } = pos.state;

  const activeOrder = useMemo(
    () => orders.find((o) => o.id === activeOrderId) ?? null,
    [activeOrderId, orders],
  );

  const activeOpen = useMemo(() => openOrders(pos.state), [pos.state]);

  const applySavedAccount = useCallback(
    (savedId: string) => {
      const saved = accounts.find((a) => a.id === savedId);
      if (!saved) return;
      const aladBank = bicToAladBank(saved.bankBic);
      pos.setPaymentSettings({
        savedAccountId: savedId,
        aladBank: aladBank ?? payment.aladBank,
        accountNumber: saved.account,
        accountName: saved.name,
      });
    },
    [accounts, payment.aladBank, pos],
  );

  const startPayment = useCallback(async (order: PosOrder) => {
    setPayLoading(true);
    setError(null);
    try {
      const response = await createOrderCheckoutSession(order, payment);
      const paymentUrl = response.data?.paymentUrl ?? response.pay_url;
      const sessionId = response.data?.sessionId ?? response.order_id;
      if (!paymentUrl) throw new Error("No payment link returned.");
      pos.updateOrder(order.id, {
        status: "awaiting_payment",
        paymentUrl,
        checkoutSessionId: sessionId,
      });
      window.open(paymentUrl, "_blank", "noopener,noreferrer");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Payment could not start.");
    } finally {
      setPayLoading(false);
    }
  }, [payment, pos]);

  return (
    <div className="mt-6 space-y-4 md:mt-8">
      <div className="flex flex-wrap gap-2">
        {(
          [
            ["tables", "Tables"],
            ["menu", "Menu"],
            ["orders", "Orders"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            aria-pressed={tab === id}
            onClick={() => setTab(id)}
            className={
              tab === id
                ? btnPrimaryClass + " !min-h-9 w-auto px-4 text-xs"
                : btnSecondaryClass + " !min-h-9 w-auto px-4 text-xs"
            }
          >
            {label}
          </button>
        ))}
      </div>

      {error ? (
        <p role="alert" className="border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-900">
          {error}
        </p>
      ) : null}

      {tab === "tables" ? (
        <TablesTab
          tables={tables}
          orders={orders}
          onAdd={(label, seats) =>
            pos.upsertTable({
              id: crypto.randomUUID(),
              label: label.trim() || `Table ${tables.length + 1}`,
              seats: seats || 4,
              status: "available",
              updatedAt: Date.now(),
            })
          }
          onRemove={pos.removeTable}
          onStatusChange={pos.setTableStatus}
          onNewOrder={(table) => {
            const order = pos.createOrder(table);
            setActiveOrderId(order.id);
            setTab("orders");
          }}
        />
      ) : null}

      {tab === "menu" ? (
        <MenuTab
          items={menuItems}
          onSave={(item) => pos.upsertMenuItem(item)}
          onRemove={pos.removeMenuItem}
        />
      ) : null}

      {tab === "orders" ? (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,360px)]">
          <div className="space-y-4">
            <PaymentSetup
              payment={payment}
              accounts={accounts}
              onApplySaved={applySavedAccount}
              onChange={pos.setPaymentSettings}
              ready={paymentSettingsReady(payment)}
            />
            <div className={`${panelClass} space-y-3`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-sm font-medium text-foreground">Open orders</h2>
                <button
                  type="button"
                  className={btnSecondaryClass + " !min-h-9 w-auto px-3 text-xs"}
                  onClick={() => {
                    const order = pos.createOrder(null);
                    setActiveOrderId(order.id);
                  }}
                >
                  Takeaway order
                </button>
              </div>
              <ul className="divide-y divide-border">
                {activeOpen.length === 0 ? (
                  <li className="py-4 text-sm text-muted">No open orders. Start from a table or takeaway.</li>
                ) : (
                  activeOpen.map((order) => (
                    <li key={order.id}>
                      <button
                        type="button"
                        onClick={() => setActiveOrderId(order.id)}
                        className={`flex w-full items-center justify-between gap-3 py-3 text-left text-sm hover:bg-brand-soft/40 ${
                          activeOrderId === order.id ? "bg-brand-soft/60" : ""
                        }`}
                      >
                        <span>
                          <span className="font-medium text-foreground">{order.tableLabel}</span>
                          <span className="ml-2 text-xs text-muted">{order.status.replace("_", " ")}</span>
                        </span>
                        <span className="font-medium tabular-nums">{orderTotal(order).toFixed(2)} ETB</span>
                      </button>
                    </li>
                  ))
                )}
              </ul>
            </div>
          </div>

          {activeOrder ? (
            <OrderEditor
              order={activeOrder}
              menuItems={menuItems.filter((m) => m.available)}
              payLoading={payLoading}
              paymentReady={paymentSettingsReady(payment)}
              onAddItem={(item) => pos.addLineToOrder(activeOrder.id, item)}
              onNote={(note) => pos.updateOrder(activeOrder.id, { note })}
              onPay={() => void startPayment(activeOrder)}
              onMarkPaid={() => pos.setOrderStatus(activeOrder.id, "paid")}
              onCancel={() => {
                pos.setOrderStatus(activeOrder.id, "cancelled");
                setActiveOrderId(null);
              }}
              onReopenPayment={() => {
                if (activeOrder.paymentUrl) window.open(activeOrder.paymentUrl, "_blank", "noopener");
              }}
            />
          ) : (
            <div className={`${panelClass} text-sm text-muted`}>Select an order to add items and accept payment.</div>
          )}
        </div>
      ) : null}
    </div>
  );
}

function PaymentSetup({
  payment,
  accounts,
  ready,
  onApplySaved,
  onChange,
}: {
  payment: import("@/lib/pos/types").PosPaymentSettings;
  accounts: import("@/lib/saved-accounts").SavedAccount[];
  ready: boolean;
  onApplySaved: (id: string) => void;
  onChange: (p: import("@/lib/pos/types").PosPaymentSettings) => void;
}) {
  return (
    <div className={`${panelClass} space-y-3`}>
      <h2 className="text-sm font-medium text-foreground">Payment setup</h2>
      <p className="text-xs text-muted">
        Settlement account for order checkout. Requires server payment API to be enabled.
      </p>
      {!ready ? (
        <p className="text-xs text-amber-900" role="status">
          Choose a bank and account to accept digital payments on orders.
        </p>
      ) : null}
      {accounts.length > 0 ? (
        <div>
          <label className="mb-1 block text-xs font-medium text-muted">From saved account</label>
          <select
            className={fieldClass}
            value={payment.savedAccountId ?? ""}
            onChange={(e) => {
              const id = e.target.value;
              if (id) onApplySaved(id);
            }}
          >
            <option value="">Select…</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.label}
              </option>
            ))}
          </select>
        </div>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-muted">Settlement bank</label>
          <select
            className={fieldClass}
            value={payment.aladBank}
            onChange={(e) => onChange({ ...payment, aladBank: e.target.value, savedAccountId: null })}
          >
            {ALAD_BANK_OPTIONS.map((b) => (
              <option key={b.code} value={b.code}>
                {b.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted">Account number</label>
          <input
            className={fieldClass}
            value={payment.accountNumber}
            onChange={(e) =>
              onChange({ ...payment, accountNumber: e.target.value, savedAccountId: null })
            }
          />
        </div>
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-muted">Account name</label>
        <input
          className={fieldClass}
          value={payment.accountName}
          onChange={(e) => onChange({ ...payment, accountName: e.target.value, savedAccountId: null })}
        />
      </div>
    </div>
  );
}

function TablesTab({
  tables,
  orders,
  onAdd,
  onRemove,
  onStatusChange,
  onNewOrder,
}: {
  tables: PosTable[];
  orders: PosOrder[];
  onAdd: (label: string, seats: number) => void;
  onRemove: (id: string) => void;
  onStatusChange: (id: string, status: TableStatus) => void;
  onNewOrder: (table: PosTable) => void;
}) {
  const [label, setLabel] = useState("");
  const [seats, setSeats] = useState("4");

  return (
    <div className="space-y-4">
      <div className={`${panelClass} flex flex-wrap gap-2`}>
        <input
          className={fieldClass + " max-w-[10rem]"}
          placeholder="Table name"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
        />
        <input
          className={fieldClass + " max-w-[5rem]"}
          inputMode="numeric"
          value={seats}
          onChange={(e) => setSeats(e.target.value)}
          aria-label="Seats"
        />
        <button
          type="button"
          className={btnSecondaryClass + " !min-h-11 w-auto px-4"}
          onClick={() => {
            onAdd(label, Number(seats) || 4);
            setLabel("");
          }}
        >
          Add table
        </button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {tables.map((table) => {
          const hasOpen = orders.some(
            (o) =>
              o.tableId === table.id &&
              (o.status === "open" || o.status === "awaiting_payment"),
          );
          return (
            <div key={table.id} className={panelClass}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-foreground">{table.label}</p>
                  <p className="text-xs text-muted">
                    {table.seats} seats · {TABLE_STATUS_LABEL[table.status]}
                    {hasOpen ? " · active order" : ""}
                  </p>
                </div>
                <button
                  type="button"
                  className="text-xs text-muted hover:text-red-800"
                  onClick={() => onRemove(table.id)}
                  aria-label={`Remove ${table.label}`}
                >
                  Remove
                </button>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  className={btnPrimaryClass + " !min-h-9 text-xs"}
                  onClick={() => onNewOrder(table)}
                >
                  New order
                </button>
                <select
                  className={fieldClass + " !min-h-9 max-w-[8rem] text-xs"}
                  value={table.status}
                  onChange={(e) => onStatusChange(table.id, e.target.value as TableStatus)}
                >
                  {Object.entries(TABLE_STATUS_LABEL).map(([value, text]) => (
                    <option key={value} value={value}>
                      {text}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MenuTab({
  items,
  onSave,
  onRemove,
}: {
  items: MenuItem[];
  onSave: (item: MenuItem) => void;
  onRemove: (id: string) => void;
}) {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("Food");

  const categories = useMemo(() => {
    const set = new Set(items.map((i) => i.category));
    set.add("Food");
    set.add("Drinks");
    return [...set].sort();
  }, [items]);

  return (
    <div className="space-y-4">
      <div className={`${panelClass} grid gap-2 sm:grid-cols-4`}>
        <input
          className={fieldClass}
          placeholder="Item name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          className={fieldClass}
          placeholder="Price ETB"
          inputMode="decimal"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
        />
        <input
          className={fieldClass}
          placeholder="Category"
          list="menu-categories"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        />
        <datalist id="menu-categories">
          {categories.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
        <button
          type="button"
          className={btnSecondaryClass}
          onClick={() => {
            const p = Number(price);
            if (!name.trim() || !Number.isFinite(p)) return;
            onSave({
              id: crypto.randomUUID(),
              name: name.trim(),
              price: p,
              category: category.trim() || "General",
              available: true,
              updatedAt: Date.now(),
            });
            setName("");
            setPrice("");
          }}
        >
          Add item
        </button>
      </div>
      <ul className={`${panelClass} divide-y divide-border !p-0`}>
        {items.map((item) => (
          <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
            <div>
              <p className="font-medium text-foreground">{item.name}</p>
              <p className="text-xs text-muted">
                {item.category} · {item.price.toFixed(2)} ETB
                {!item.available ? " · hidden" : ""}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                className="text-xs text-brand hover:underline"
                onClick={() => onSave({ ...item, available: !item.available, updatedAt: Date.now() })}
              >
                {item.available ? "Hide" : "Show"}
              </button>
              <button
                type="button"
                className="text-xs text-muted hover:text-red-800"
                onClick={() => onRemove(item.id)}
              >
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function OrderEditor({
  order,
  menuItems,
  payLoading,
  paymentReady,
  onAddItem,
  onNote,
  onPay,
  onMarkPaid,
  onCancel,
  onReopenPayment,
}: {
  order: PosOrder;
  menuItems: MenuItem[];
  payLoading: boolean;
  paymentReady: boolean;
  onAddItem: (item: MenuItem) => void;
  onNote: (note: string) => void;
  onPay: () => void;
  onMarkPaid: () => void;
  onCancel: () => void;
  onReopenPayment: () => void;
}) {
  const total = orderTotal(order);
  const canEdit = order.status === "open";

  return (
    <div className={`${panelClass} space-y-4 lg:sticky lg:top-4`}>
      <div>
        <h2 className="text-sm font-medium text-foreground">{order.tableLabel}</h2>
        <p className="text-xs text-muted capitalize">{order.status.replace("_", " ")}</p>
      </div>

      {canEdit ? (
        <>
          <div className="flex flex-wrap gap-2">
            {menuItems.map((item) => (
              <button
                key={item.id}
                type="button"
                className={btnSecondaryClass + " !min-h-9 w-auto px-2.5 text-xs"}
                onClick={() => onAddItem(item)}
              >
                + {item.name} ({item.price} ETB)
              </button>
            ))}
          </div>
          <textarea
            className={fieldClass + " min-h-[4rem] text-sm"}
            placeholder="Order note"
            value={order.note}
            onChange={(e) => onNote(e.target.value)}
          />
        </>
      ) : null}

      <ul className="space-y-2 text-sm">
        {order.lines.length === 0 ? (
          <li className="text-muted">No items yet.</li>
        ) : (
          order.lines.map((line) => (
            <li key={line.id} className="flex justify-between gap-2">
              <span>
                {line.quantity}× {line.name}
              </span>
              <span className="tabular-nums">{(line.unitPrice * line.quantity).toFixed(2)} ETB</span>
            </li>
          ))
        )}
      </ul>

      <p className="border-t border-border pt-3 text-base font-semibold tabular-nums">
        Total: {total.toFixed(2)} ETB
      </p>

      <div className="grid gap-2">
        {(order.status === "open" || order.status === "awaiting_payment") && total > 0 ? (
          <button
            type="button"
            disabled={payLoading || !paymentReady}
            className={btnPrimaryClass}
            data-testid="pos-accept-payment"
            onClick={onPay}
          >
            {payLoading ? "Starting checkout…" : "Accept payment (checkout link)"}
          </button>
        ) : null}
        {order.status === "awaiting_payment" && order.paymentUrl ? (
          <button type="button" className={btnSecondaryClass} onClick={onReopenPayment}>
            Reopen payment page
          </button>
        ) : null}
        {order.status !== "paid" && order.status !== "cancelled" ? (
          <button type="button" className={btnSecondaryClass} onClick={onMarkPaid}>
            Mark paid (cash / other)
          </button>
        ) : null}
        {order.status === "open" || order.status === "awaiting_payment" ? (
          <button type="button" className={btnSecondaryClass + " text-red-900"} onClick={onCancel}>
            Cancel order
          </button>
        ) : null}
      </div>
    </div>
  );
}
