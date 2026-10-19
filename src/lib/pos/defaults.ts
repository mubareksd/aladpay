import type { MenuItem, PosPaymentSettings, PosState, PosTable } from "@/lib/pos/types";

const now = () => Date.now();

export function defaultPaymentSettings(): PosPaymentSettings {
  return {
    savedAccountId: null,
    aladBank: "boa",
    accountNumber: "",
    accountName: "",
  };
}

export function seedTables(): PosTable[] {
  return Array.from({ length: 8 }, (_, i) => ({
    id: crypto.randomUUID(),
    label: `Table ${i + 1}`,
    seats: 4,
    status: "available" as const,
    updatedAt: now(),
  }));
}

export function seedMenu(): MenuItem[] {
  const items: Omit<MenuItem, "id" | "updatedAt">[] = [
    { name: "Macchiato", price: 80, category: "Drinks", available: true },
    { name: "Spris", price: 90, category: "Drinks", available: true },
    { name: "Burger", price: 350, category: "Food", available: true },
    { name: "Firfir", price: 220, category: "Food", available: true },
    { name: "Water 1L", price: 40, category: "Drinks", available: true },
  ];
  return items.map((item) => ({ ...item, id: crypto.randomUUID(), updatedAt: now() }));
}

export function defaultPosState(): PosState {
  return {
    tables: seedTables(),
    menuItems: seedMenu(),
    orders: [],
    payment: defaultPaymentSettings(),
  };
}
