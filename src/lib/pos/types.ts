export type TableStatus = "available" | "occupied" | "reserved";

export type MenuStation = "kitchen" | "bar" | "general";

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
  /** Optional Amharic label (Abay QR / GebetaLink-style menus). */
  nameAm?: string;
  price: number;
  category: string;
  station: MenuStation;
  available: boolean;
  updatedAt: number;
};

export type OrderLine = {
  id: string;
  menuItemId: string;
  name: string;
  unitPrice: number;
  quantity: number;
  station?: MenuStation;
};

export type OrderStatus =
  | "open"
  | "kitchen"
  | "ready"
  | "served"
  | "awaiting_payment"
  | "paid"
  | "cancelled";

export type OrderSource = "staff" | "guest";

export type PosOrder = {
  id: string;
  tableId: string | null;
  tableLabel: string;
  status: OrderStatus;
  source: OrderSource;
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
  venueName: string;
  tables: PosTable[];
  menuItems: MenuItem[];
  orders: PosOrder[];
  payment: PosPaymentSettings;
};

export type GuestOrderSubmit = {
  tableId: string;
  tableLabel: string;
  lines: { menuItemId: string; name: string; unitPrice: number; quantity: number }[];
  note: string;
};

export type PublishedGuestMenu = {
  updatedAt: number;
  venueName: string;
  tables: { id: string; label: string }[];
  menuItems: {
    id: string;
    name: string;
    nameAm?: string;
    price: number;
    category: string;
    station: MenuStation;
    available: boolean;
  }[];
};

export type ServerGuestOrder = GuestOrderSubmit & {
  id: string;
  createdAt: number;
  acknowledged: boolean;
};

export type ServerPosFile = {
  public: PublishedGuestMenu;
  guestOrders: ServerGuestOrder[];
};
