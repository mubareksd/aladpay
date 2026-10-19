"use client";

import QRCode from "qrcode";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { usePos } from "@/hooks/use-pos";
import { useSavedAccounts } from "@/hooks/use-saved-accounts";
import { ALAD_BANK_OPTIONS, bicToAladBank } from "@/lib/alad/bank-codes";
import { createOrderCheckoutSession, paymentSettingsReady } from "@/lib/pos/checkout";
import {
  acknowledgeInbox,
  fetchGuestInbox,
  publishMenuToServer,
} from "@/lib/pos/guest-client";
import { orderTotal } from "@/lib/pos/order-math";
import { isActiveOrderStatus, ORDER_STATUS_LABEL } from "@/lib/pos/order-status";
import { buildDailyReport } from "@/lib/pos/reports";
import { exportPosBackup, kitchenOrders, openOrders } from "@/lib/pos/storage";
import type { MenuItem, MenuStation, PosOrder, PosTable, TableStatus } from "@/lib/pos/types";
import {
  btnPrimaryClass,
  btnSecondaryClass,
  fieldClass,
  panelClass,
} from "@/lib/ui-classes";

type PosTab = "tables" | "menu" | "orders" | "kitchen" | "reports";

const STATION_LABEL: Record<MenuStation, string> = {
  kitchen: "Kitchen",
  bar: "Bar",
  general: "General",
};

const TABLE_STATUS_LABEL: Record<TableStatus, string> = {
  available: "Available",
  occupied: "Occupied",
  reserved: "Reserved",
};

export function PosPanel() {
  const { session, authRequired } = useAuth();
  const companySlug = session?.activeCompany?.slug;
  const pos = usePos();
  const { accounts } = useSavedAccounts();
  const [tab, setTab] = useState<PosTab>("orders");
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  const [guestQrTable, setGuestQrTable] = useState<PosTable | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [payLoading, setPayLoading] = useState(false);
  const [publishLoading, setPublishLoading] = useState(false);
  const [inboxHint, setInboxHint] = useState<string | null>(null);

  const { venueName, tables, menuItems, orders, payment } = pos.state;

  const activeOrder = useMemo(
    () => orders.find((o) => o.id === activeOrderId) ?? null,
    [activeOrderId, orders],
  );

  const activeOpen = useMemo(() => openOrders(pos.state), [pos.state]);
  const kitchenQueue = useMemo(() => kitchenOrders(pos.state), [pos.state]);
  const dailyReport = useMemo(() => buildDailyReport(orders), [orders]);

  const importPendingGuestOrders = useCallback(async (focusNew: boolean) => {
    try {
      const pending = await fetchGuestInbox();
      if (pending.length === 0) return;
      const ids: string[] = [];
      let lastImported: PosOrder | null = null;
      for (const entry of pending) {
        lastImported = pos.importGuestOrder(entry);
        ids.push(entry.id);
      }
      await acknowledgeInbox(ids);
      if (focusNew) {
        if (lastImported) setActiveOrderId(lastImported.id);
        setTab("kitchen");
        setInboxHint(
          pending.length === 1 ? "1 guest order imported." : `${pending.length} guest orders imported.`,
        );
      }
    } catch {
      /* ignore polling errors */
    }
  }, [pos]);

  useEffect(() => {
    const timer = window.setInterval(() => void importPendingGuestOrders(false), 8000);
    return () => window.clearInterval(timer);
  }, [importPendingGuestOrders]);

  const publishGuestMenu = useCallback(async () => {
    setPublishLoading(true);
    setError(null);
    try {
      await publishMenuToServer({
        updatedAt: Date.now(),
        venueName: venueName.trim() || "Our venue",
        tables: tables.map((t) => ({ id: t.id, label: t.label })),
        menuItems: menuItems.map((m) => ({
          id: m.id,
          name: m.name,
          nameAm: m.nameAm,
          price: m.price,
          category: m.category,
          station: m.station ?? "general",
          available: m.available,
        })),
      });
      setInboxHint("Menu published for guest ordering.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not publish menu.");
    } finally {
      setPublishLoading(false);
    }
  }, [menuItems, tables, venueName]);

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
      <div className={`${panelClass} flex flex-wrap items-end gap-3`}>
        <div className="min-w-[12rem] flex-1">
          <label className="mb-1 block text-xs font-medium text-muted">Venue name</label>
          <input
            className={fieldClass}
            value={venueName}
            onChange={(e) => pos.setVenueName(e.target.value)}
            placeholder="Restaurant name on guest menu"
          />
        </div>
        <button
          type="button"
          disabled={publishLoading || menuItems.length === 0}
          className={btnSecondaryClass + " !min-h-11 w-auto px-4 text-xs"}
          onClick={() => void publishGuestMenu()}
        >
          {publishLoading ? "Publishing…" : "Publish guest menu"}
        </button>
        <button
          type="button"
          className={btnSecondaryClass + " !min-h-11 w-auto px-4 text-xs"}
          onClick={() => void importPendingGuestOrders(true)}
        >
          Sync guest orders
        </button>
        <button
          type="button"
          className={btnSecondaryClass + " !min-h-11 w-auto px-4 text-xs"}
          onClick={() => {
            const blob = new Blob([exportPosBackup(pos.state)], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `aladpay-pos-${new Date().toISOString().slice(0, 10)}.json`;
            a.click();
            URL.revokeObjectURL(url);
          }}
        >
          Export backup
        </button>
        <label className={btnSecondaryClass + " !min-h-11 w-auto cursor-pointer px-4 text-xs"}>
          Import backup
          <input
            type="file"
            accept="application/json,.json"
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              void file.text().then((raw) => {
                try {
                  pos.importBackup(raw);
                  setError(null);
                  setInboxHint("POS data restored from backup.");
                } catch (err) {
                  setError(err instanceof Error ? err.message : "Invalid backup file.");
                }
              });
              e.target.value = "";
            }}
          />
        </label>
      </div>

      {inboxHint ? (
        <p role="status" className="text-xs text-muted">
          {inboxHint}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {(
          [
            ["tables", "Tables"],
            ["menu", "Menu"],
            ["orders", "Orders"],
            ["kitchen", "Kitchen"],
            ["reports", "Reports"],
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
          onGuestQr={setGuestQrTable}
        />
      ) : null}

      {guestQrTable ? (
        <TableGuestQrModal
          table={guestQrTable}
          companySlug={companySlug}
          authRequired={authRequired}
          onClose={() => setGuestQrTable(null)}
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
                          <span className="ml-2 text-xs text-muted">
                            {ORDER_STATUS_LABEL[order.status]}
                            {order.source === "guest" ? " · guest" : ""}
                          </span>
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
              onSendKitchen={() => pos.setOrderStatus(activeOrder.id, "kitchen")}
              onMarkReady={() => pos.setOrderStatus(activeOrder.id, "ready")}
              onMarkServed={() => pos.setOrderStatus(activeOrder.id, "served")}
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

      {tab === "kitchen" ? (
        <KitchenTab
          orders={kitchenQueue}
          onSelect={(id) => {
            setActiveOrderId(id);
            setTab("orders");
          }}
          onAdvance={(order, next) => pos.setOrderStatus(order.id, next)}
        />
      ) : null}

      {tab === "reports" ? <ReportsTab report={dailyReport} /> : null}
    </div>
  );
}

function TableGuestQrModal({
  table,
  companySlug,
  authRequired,
  onClose,
}: {
  table: PosTable;
  companySlug: string | undefined;
  authRequired: boolean;
  onClose: () => void;
}) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const guestUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    if (authRequired && companySlug) {
      return `${window.location.origin}/guest/${companySlug}/${table.id}`;
    }
    return `${window.location.origin}/guest/${table.id}`;
  }, [authRequired, companySlug, table.id]);

  useEffect(() => {
    if (!guestUrl) return;
    void QRCode.toDataURL(guestUrl, { width: 280, margin: 2 }).then(setDataUrl);
  }, [guestUrl]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-labelledby="guest-qr-title"
    >
      <div className={`${panelClass} max-w-sm space-y-3`}>
        <h2 id="guest-qr-title" className="text-sm font-medium text-foreground">
          Guest order QR — {table.label}
        </h2>
        <p className="text-xs text-muted">
          Customers scan to browse the published menu and send orders to your inbox.
        </p>
        {dataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={dataUrl} alt="" className="mx-auto rounded border border-border" width={280} height={280} />
        ) : (
          <p className="text-sm text-muted">Generating QR…</p>
        )}
        <input className={fieldClass + " text-xs"} readOnly value={guestUrl} onFocus={(e) => e.target.select()} />
        <div className="flex gap-2">
          <button type="button" className={btnPrimaryClass + " flex-1"} onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

function KitchenTab({
  orders,
  onSelect,
  onAdvance,
}: {
  orders: PosOrder[];
  onSelect: (id: string) => void;
  onAdvance: (order: PosOrder, next: "ready" | "served") => void;
}) {
  return (
    <div className={`${panelClass} space-y-3`}>
      <h2 className="text-sm font-medium text-foreground">Kitchen queue</h2>
      {orders.length === 0 ? (
        <p className="text-sm text-muted">Nothing in kitchen. Send open orders from Orders.</p>
      ) : (
        <ul className="divide-y divide-border">
          {orders.map((order) => (
            <li key={order.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
              <button type="button" className="text-left hover:underline" onClick={() => onSelect(order.id)}>
                <span className="font-medium text-foreground">{order.tableLabel}</span>
                <span className="ml-2 text-xs text-muted">{ORDER_STATUS_LABEL[order.status]}</span>
                <span className="mt-1 block text-xs text-muted">
                  {order.lines.map((l) => `${l.quantity}× ${l.name}`).join(", ") || "—"}
                </span>
              </button>
              <div className="flex gap-2">
                {order.status === "kitchen" ? (
                  <button
                    type="button"
                    className={btnPrimaryClass + " !min-h-9 w-auto px-3 text-xs"}
                    onClick={() => onAdvance(order, "ready")}
                  >
                    Mark ready
                  </button>
                ) : null}
                {order.status === "ready" ? (
                  <button
                    type="button"
                    className={btnPrimaryClass + " !min-h-9 w-auto px-3 text-xs"}
                    onClick={() => onAdvance(order, "served")}
                  >
                    Mark served
                  </button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ReportsTab({ report }: { report: ReturnType<typeof buildDailyReport> }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className={`${panelClass} space-y-2`}>
        <h2 className="text-sm font-medium text-foreground">Today</h2>
        <p className="text-2xl font-semibold tabular-nums">{report.revenueEtb.toFixed(2)} ETB</p>
        <p className="text-xs text-muted">
          {report.paidOrderCount} paid · {report.openTicketCount} open tickets
        </p>
      </div>
      <div className={`${panelClass} space-y-2`}>
        <h2 className="text-sm font-medium text-foreground">Top items (paid today)</h2>
        {report.topItems.length === 0 ? (
          <p className="text-sm text-muted">No paid orders yet today.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {report.topItems.map((item) => (
              <li key={item.name} className="flex justify-between gap-2">
                <span>
                  {item.name} <span className="text-muted">×{item.quantity}</span>
                </span>
                <span className="tabular-nums">{item.revenue.toFixed(2)} ETB</span>
              </li>
            ))}
          </ul>
        )}
      </div>
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
  onGuestQr,
}: {
  tables: PosTable[];
  orders: PosOrder[];
  onAdd: (label: string, seats: number) => void;
  onRemove: (id: string) => void;
  onStatusChange: (id: string, status: TableStatus) => void;
  onNewOrder: (table: PosTable) => void;
  onGuestQr: (table: PosTable) => void;
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
            (o) => o.tableId === table.id && isActiveOrderStatus(o.status),
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
                <button
                  type="button"
                  className={btnSecondaryClass + " !min-h-9 text-xs"}
                  onClick={() => onGuestQr(table)}
                >
                  Guest QR
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
  const [nameAm, setNameAm] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("Food");
  const [station, setStation] = useState<MenuStation>("kitchen");

  const categories = useMemo(() => {
    const set = new Set(items.map((i) => i.category));
    set.add("Food");
    set.add("Drinks");
    return [...set].sort();
  }, [items]);

  return (
    <div className="space-y-4">
      <div className={`${panelClass} grid gap-2 sm:grid-cols-2 lg:grid-cols-6`}>
        <input
          className={fieldClass}
          placeholder="Item name (English)"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          className={fieldClass}
          placeholder="Name (Amharic, optional)"
          value={nameAm}
          onChange={(e) => setNameAm(e.target.value)}
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
        <select
          className={fieldClass}
          value={station}
          onChange={(e) => setStation(e.target.value as MenuStation)}
          aria-label="Prep station"
        >
          {(Object.keys(STATION_LABEL) as MenuStation[]).map((s) => (
            <option key={s} value={s}>
              {STATION_LABEL[s]}
            </option>
          ))}
        </select>
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
              nameAm: nameAm.trim() || undefined,
              price: p,
              category: category.trim() || "General",
              station,
              available: true,
              updatedAt: Date.now(),
            });
            setName("");
            setNameAm("");
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
              <p className="font-medium text-foreground">
                {item.name}
                {item.nameAm ? <span className="font-normal text-muted"> · {item.nameAm}</span> : null}
              </p>
              <p className="text-xs text-muted">
                {item.category} · {STATION_LABEL[item.station ?? "general"]} · {item.price.toFixed(2)} ETB
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
  onSendKitchen,
  onMarkReady,
  onMarkServed,
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
  onSendKitchen: () => void;
  onMarkReady: () => void;
  onMarkServed: () => void;
  onCancel: () => void;
  onReopenPayment: () => void;
}) {
  const total = orderTotal(order);
  const canEdit = order.status === "open";
  const canPay =
    total > 0 &&
    (order.status === "open" ||
      order.status === "served" ||
      order.status === "awaiting_payment" ||
      order.status === "ready");

  return (
    <div className={`${panelClass} space-y-4 lg:sticky lg:top-4`}>
      <div>
        <h2 className="text-sm font-medium text-foreground">{order.tableLabel}</h2>
        <p className="text-xs text-muted">
          {ORDER_STATUS_LABEL[order.status]}
          {order.source === "guest" ? " · from guest QR" : ""}
        </p>
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
        {order.status === "open" && order.lines.length > 0 ? (
          <button type="button" className={btnSecondaryClass} onClick={onSendKitchen}>
            Send to kitchen
          </button>
        ) : null}
        {order.status === "kitchen" ? (
          <button type="button" className={btnSecondaryClass} onClick={onMarkReady}>
            Mark ready
          </button>
        ) : null}
        {order.status === "ready" ? (
          <button type="button" className={btnSecondaryClass} onClick={onMarkServed}>
            Mark served
          </button>
        ) : null}
        {canPay && total > 0 ? (
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
        {isActiveOrderStatus(order.status) ? (
          <button type="button" className={btnSecondaryClass + " text-red-900"} onClick={onCancel}>
            Cancel order
          </button>
        ) : null}
      </div>
    </div>
  );
}
