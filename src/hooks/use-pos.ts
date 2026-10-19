"use client";

import { useCallback, useSyncExternalStore } from "react";
import {
  addLineToOrder,
  createOrder,
  getPosClientSnapshot,
  getPosServerSnapshot,
  removeMenuItem,
  removeTable,
  setOrderStatus,
  setPaymentSettings,
  setTableStatus,
  subscribePos,
  updateOrder,
  upsertMenuItem,
  upsertTable,
  updatePos,
} from "@/lib/pos/storage";
import { defaultPosState } from "@/lib/pos/defaults";
import type { MenuItem, PosPaymentSettings, PosTable, TableStatus } from "@/lib/pos/types";

export function usePos() {
  const state = useSyncExternalStore(subscribePos, getPosClientSnapshot, getPosServerSnapshot);

  return {
    state,
    upsertTable: useCallback((table: PosTable) => upsertTable(table), []),
    removeTable: useCallback((id: string) => removeTable(id), []),
    setTableStatus: useCallback((id: string, status: TableStatus) => setTableStatus(id, status), []),
    upsertMenuItem: useCallback((item: MenuItem) => upsertMenuItem(item), []),
    removeMenuItem: useCallback((id: string) => removeMenuItem(id), []),
    createOrder: useCallback((table: PosTable | null) => createOrder(table), []),
    addLineToOrder: useCallback(
      (orderId: string, item: MenuItem, quantity?: number) =>
        addLineToOrder(orderId, item, quantity),
      [],
    ),
    updateOrder: useCallback(
      (orderId: string, patch: Parameters<typeof updateOrder>[1]) => updateOrder(orderId, patch),
      [],
    ),
    setOrderStatus: useCallback(
      (orderId: string, status: Parameters<typeof setOrderStatus>[1]) =>
        setOrderStatus(orderId, status),
      [],
    ),
    setPaymentSettings: useCallback((payment: PosPaymentSettings) => setPaymentSettings(payment), []),
    resetPos: useCallback(() => updatePos(() => defaultPosState()), []),
  };
}
