import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import type { PublishedGuestMenu, ServerGuestOrder, ServerPosFile } from "@/lib/pos/types";

const DEFAULT_PUBLIC: PublishedGuestMenu = {
  updatedAt: 0,
  venueName: "Restaurant",
  tables: [],
  menuItems: [],
};

function storePath(): string {
  const dir = process.env.POS_DATA_DIR?.trim() || path.join(process.cwd(), ".data");
  return path.join(dir, "pos-guest.json");
}

async function readStore(): Promise<ServerPosFile> {
  try {
    const raw = await readFile(storePath(), "utf8");
    const data = JSON.parse(raw) as ServerPosFile;
    return {
      public: data.public ?? DEFAULT_PUBLIC,
      guestOrders: Array.isArray(data.guestOrders) ? data.guestOrders : [],
    };
  } catch {
    return { public: DEFAULT_PUBLIC, guestOrders: [] };
  }
}

async function writeStore(file: ServerPosFile): Promise<void> {
  const filePath = storePath();
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, JSON.stringify(file, null, 2), "utf8");
}

export async function getPublishedMenu(): Promise<PublishedGuestMenu> {
  const store = await readStore();
  return store.public;
}

export async function publishGuestMenu(menu: PublishedGuestMenu): Promise<PublishedGuestMenu> {
  const store = await readStore();
  store.public = { ...menu, updatedAt: Date.now() };
  await writeStore(store);
  return store.public;
}

export async function appendGuestOrder(
  order: Omit<ServerGuestOrder, "id" | "createdAt" | "acknowledged">,
): Promise<ServerGuestOrder> {
  const store = await readStore();
  const entry: ServerGuestOrder = {
    ...order,
    id: crypto.randomUUID(),
    createdAt: Date.now(),
    acknowledged: false,
  };
  store.guestOrders.unshift(entry);
  store.guestOrders = store.guestOrders.slice(0, 200);
  await writeStore(store);
  return entry;
}

export async function listPendingGuestOrders(): Promise<ServerGuestOrder[]> {
  const store = await readStore();
  return store.guestOrders.filter((o) => !o.acknowledged);
}

export async function acknowledgeGuestOrders(ids: string[]): Promise<number> {
  const store = await readStore();
  const set = new Set(ids);
  let count = 0;
  store.guestOrders = store.guestOrders.map((o) => {
    if (set.has(o.id) && !o.acknowledged) {
      count += 1;
      return { ...o, acknowledged: true };
    }
    return o;
  });
  if (count) await writeStore(store);
  return count;
}
