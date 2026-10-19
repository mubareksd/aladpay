export type TableStatus = "available" | "occupied" | "reserved";

export type PosTable = {
  id: string;
  label: string;
  seats: number;
  status: TableStatus;
  updatedAt: number;
};

export type MenuItem = {
  id: string;
  name: string;
  price: number;
  category: string;
  available: boolean;
  updatedAt: number;
};

export type OrderLine = {
  id: string;
  menuItemId: string;
  name: string;
  unitPrice: number;
  quantity: number;
};

export type OrderStatus =
  | "open"
  | "awaiting_payment"
  | "paid"
  | "cancelled";

export type PosOrder = {
  id: string;
  tableId: string | null;
  tableLabel: string;
  status: OrderStatus;
  lines: OrderLine[];
  note: string;
  createdAt: number;
  updatedAt: number;
  checkoutSessionId?: string;
  paymentUrl?: string;
  paidAt?: number;
};

export type PosPaymentSettings = {
  savedAccountId: string | null;
  aladBank: string;
  accountNumber: string;
  accountName: string;
};

export type PosState = {
  tables: PosTable[];
  menuItems: MenuItem[];
  orders: PosOrder[];
  payment: PosPaymentSettings;
};
