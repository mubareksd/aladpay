import type {
  BankAccountType,
  QrEncoding,
  YayaTag62Encoding,
} from "@/lib/ethiopian-bank-qr";

export type SavedAccount = {
  id: string;
  label: string;
  bankBic: string;
  account: string;
  name: string;
  phone: string;
  till: string;
  city: string;
  encoding: QrEncoding;
  merchantGuid: string;
  accountType?: BankAccountType;
  yayaUsername?: string;
  yayaTag62Encoding?: YayaTag62Encoding;
  updatedAt: number;
};

export const SAVED_ACCOUNTS_STORAGE_KEY = "aladpay.savedAccounts.v1";

export type AccountFormFields = {
  bankBic: string;
  account: string;
  name: string;
  phone: string;
  till: string;
  city: string;
  encoding: QrEncoding;
  merchantGuid: string;
  accountType?: BankAccountType;
  yayaUsername: string;
  yayaTag62Encoding: YayaTag62Encoding;
};

export function defaultAccountLabel(name: string, account: string): string {
  const trimmed = name.trim() || "Account";
  const tail = account.trim().slice(-4);
  return tail ? `${trimmed} ···${tail}` : trimmed;
}

export function formFieldsToSavedAccount(
  fields: AccountFormFields,
  id: string,
  label?: string,
): SavedAccount {
  const account = fields.account.trim();
  const name = fields.name.trim();
  if (!account || !name) {
    throw new Error("Account number and name are required to save.");
  }
  return {
    id,
    label: (label ?? defaultAccountLabel(name, account)).trim() || defaultAccountLabel(name, account),
    bankBic: fields.bankBic,
    account,
    name,
    phone: fields.phone.trim(),
    till: fields.till.trim(),
    city: fields.city.trim() || "ADDIS ABABA",
    encoding: fields.encoding,
    merchantGuid: fields.merchantGuid.trim(),
    accountType: fields.accountType,
    yayaUsername: fields.yayaUsername.trim() || undefined,
    yayaTag62Encoding:
      fields.yayaTag62Encoding === "yaya_app" ? "yaya_app" : undefined,
    updatedAt: Date.now(),
  };
}

export function savedAccountToFormFields(
  saved: SavedAccount,
): AccountFormFields {
  return {
    bankBic: saved.bankBic,
    account: saved.account,
    name: saved.name,
    phone: saved.phone,
    till: saved.till,
    city: saved.city,
    encoding: saved.encoding,
    merchantGuid: saved.merchantGuid,
    accountType: saved.accountType,
    yayaUsername:
      saved.yayaUsername ??
      (saved.bankBic === "YAYAETAA" ? saved.till.trim().toLowerCase() : ""),
    yayaTag62Encoding: saved.yayaTag62Encoding ?? "standard",
  };
}

export function parseSavedAccounts(raw: string | null): SavedAccount[] {
  if (!raw) return [];
  try {
    const data = JSON.parse(raw) as unknown;
    if (!Array.isArray(data)) return [];
    return data.filter(isSavedAccount).map(migrateSavedAccount);
  } catch {
    return [];
  }
}

function migrateSavedAccount(account: SavedAccount): SavedAccount {
  if (account.bankBic === "YAYAETAA" && !account.yayaUsername && account.till.trim()) {
    return { ...account, yayaUsername: account.till.trim().toLowerCase() };
  }
  return account;
}

export function exportSavedAccountsJson(accounts: SavedAccount[]): string {
  return JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), accounts }, null, 2);
}

export function importSavedAccountsJson(raw: string): SavedAccount[] {
  const data = JSON.parse(raw) as unknown;
  if (!data || typeof data !== "object") {
    throw new Error("Invalid backup file.");
  }
  const accounts = (data as { accounts?: unknown }).accounts;
  if (!Array.isArray(accounts)) {
    throw new Error("Backup must contain an accounts array.");
  }
  const parsed = accounts.filter(isSavedAccount).map(migrateSavedAccount);
  if (parsed.length === 0) {
    throw new Error("No valid accounts found in backup.");
  }
  return parsed;
}

function isSavedAccount(value: unknown): value is SavedAccount {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === "string" &&
    typeof v.label === "string" &&
    typeof v.bankBic === "string" &&
    typeof v.account === "string" &&
    typeof v.name === "string" &&
    typeof v.phone === "string" &&
    typeof v.till === "string" &&
    typeof v.city === "string" &&
    (v.encoding === "ips" || v.encoding === "legacy") &&
    typeof v.merchantGuid === "string" &&
    typeof v.updatedAt === "number" &&
    (v.accountType === undefined ||
      v.accountType === "bank_account" ||
      v.accountType === "wallet_phone") &&
    (v.yayaUsername === undefined || typeof v.yayaUsername === "string") &&
    (v.yayaTag62Encoding === undefined ||
      v.yayaTag62Encoding === "standard" ||
      v.yayaTag62Encoding === "yaya_app")
  );
}

export function accountDedupeKey(account: SavedAccount): string {
  return `${account.bankBic}:${account.account.trim()}`;
}

export function mergeAccountsDedupe(
  existing: SavedAccount[],
  imported: SavedAccount[],
): SavedAccount[] {
  const keys = new Set(existing.map(accountDedupeKey));
  const novel = imported.filter((item) => !keys.has(accountDedupeKey(item)));
  return [...novel, ...existing].sort((a, b) => b.updatedAt - a.updatedAt);
}

const SERVER_SNAPSHOT: SavedAccount[] = [];

let clientSnapshot: SavedAccount[] = SERVER_SNAPSHOT;
let clientSnapshotSerialized: string | null = null;

function syncClientSnapshotFromStorage(): SavedAccount[] {
  if (typeof window === "undefined") return SERVER_SNAPSHOT;
  const raw = localStorage.getItem(SAVED_ACCOUNTS_STORAGE_KEY);
  if (raw === clientSnapshotSerialized) return clientSnapshot;
  clientSnapshotSerialized = raw;
  clientSnapshot = parseSavedAccounts(raw);
  return clientSnapshot;
}

function setClientSnapshot(accounts: SavedAccount[], serialized: string): void {
  clientSnapshot = accounts;
  clientSnapshotSerialized = serialized;
}

export function readSavedAccountsFromStorage(): SavedAccount[] {
  return syncClientSnapshotFromStorage();
}

export function writeSavedAccountsToStorage(accounts: SavedAccount[]): void {
  localStorage.setItem(SAVED_ACCOUNTS_STORAGE_KEY, JSON.stringify(accounts));
}

const listeners = new Set<() => void>();

export function subscribeSavedAccounts(onStoreChange: () => void): () => void {
  syncClientSnapshotFromStorage();
  listeners.add(onStoreChange);
  return () => listeners.delete(onStoreChange);
}

/** Must return the same reference until the store changes (useSyncExternalStore). */
export function getSavedAccountsClientSnapshot(): SavedAccount[] {
  return syncClientSnapshotFromStorage();
}

export function getSavedAccountsServerSnapshot(): SavedAccount[] {
  return SERVER_SNAPSHOT;
}

export function publishSavedAccounts(accounts: SavedAccount[]): void {
  const serialized = JSON.stringify(accounts);
  localStorage.setItem(SAVED_ACCOUNTS_STORAGE_KEY, serialized);
  setClientSnapshot(accounts, serialized);
  listeners.forEach((listener) => listener());
}
