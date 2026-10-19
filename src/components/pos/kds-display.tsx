"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { usePos } from "@/hooks/use-pos";
import { ORDER_STATUS_LABEL } from "@/lib/pos/order-status";
import { kitchenOrders } from "@/lib/pos/storage";
import type { MenuStation, PosOrder } from "@/lib/pos/types";
import { btnSecondaryClass, panelClass } from "@/lib/ui-classes";

const STATIONS: { id: MenuStation | "all"; label: string }[] = [
  { id: "all", label: "All stations" },
  { id: "kitchen", label: "Kitchen" },
  { id: "bar", label: "Bar" },
  { id: "general", label: "General" },
];

function orderMatchesStation(order: PosOrder, station: MenuStation | "all"): boolean {
  if (station === "all") return true;
  return order.lines.some((l) => (l.station ?? "general") === station);
}

export function KdsDisplay() {
  const { state, setOrderStatus } = usePos();
  const [station, setStation] = useState<MenuStation | "all">("all");
  const queue = useMemo(
    () => kitchenOrders(state).filter((o) => orderMatchesStation(o, station)),
    [state, station],
  );

  return (
    <div className="min-h-[100dvh] bg-[#101614] text-[#e8eeec]">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#2c3a36] px-4 py-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-[#5dbeb3]">Kitchen display</p>
          <h1 className="text-lg font-semibold">{state.venueName || "Orders"}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {STATIONS.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setStation(s.id)}
              className={
                station === s.id
                  ? "rounded-lg bg-[#0b5f56] px-3 py-1.5 text-xs font-medium text-white"
                  : "rounded-lg border border-[#2c3a36] px-3 py-1.5 text-xs text-[#a3b4ae]"
              }
            >
              {s.label}
            </button>
          ))}
          <Link href="/app?section=pos" className={btnSecondaryClass + " !min-h-9 text-xs !bg-[#18201e]"}>
            Back to POS
          </Link>
        </div>
      </header>

      <div className="grid gap-4 p-4 md:grid-cols-2 xl:grid-cols-3">
        {queue.length === 0 ? (
          <p className="col-span-full text-sm text-[#a3b4ae]">No tickets in kitchen.</p>
        ) : (
          queue.map((order) => (
            <article key={order.id} className={`${panelClass} !border-[#2c3a36] !bg-[#18201e] !text-[#e8eeec]`}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="font-semibold">{order.tableLabel}</h2>
                  <p className="text-xs text-[#a3b4ae]">{ORDER_STATUS_LABEL[order.status]}</p>
                </div>
                <div className="flex gap-1">
                  {order.status === "kitchen" ? (
                    <button
                      type="button"
                      className="rounded-lg bg-[#0b5f56] px-2 py-1 text-xs"
                      onClick={() => setOrderStatus(order.id, "ready")}
                    >
                      Ready
                    </button>
                  ) : null}
                  {order.status === "ready" ? (
                    <button
                      type="button"
                      className="rounded-lg border border-[#2c3a36] px-2 py-1 text-xs"
                      onClick={() => setOrderStatus(order.id, "served")}
                    >
                      Served
                    </button>
                  ) : null}
                </div>
              </div>
              <ul className="mt-3 space-y-1 text-sm">
                {order.lines.map((line) => (
                  <li key={line.id}>
                    {line.quantity}× {line.name}
                    {line.station ? (
                      <span className="ml-1 text-xs text-[#a3b4ae]">({line.station})</span>
                    ) : null}
                  </li>
                ))}
              </ul>
              {order.note ? <p className="mt-2 text-xs text-[#5dbeb3]">Note: {order.note}</p> : null}
            </article>
          ))
        )}
      </div>
    </div>
  );
}
