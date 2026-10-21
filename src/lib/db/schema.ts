import { sql } from "drizzle-orm";
import {
  bigint,
  char,
  datetime,
  index,
  json,
  mysqlTable,
  primaryKey,
  text,
  tinyint,
  varchar,
} from "drizzle-orm/mysql-core";
import type { GuestOrderSubmit, PublishedGuestMenu } from "@/lib/pos/types";

export const users = mysqlTable("users", {
  id: char("id", { length: 36 }).primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  passwordHash: text("password_hash").notNull(),
  createdAt: datetime("created_at", { mode: "string" })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export const companies = mysqlTable("companies", {
  id: char("id", { length: 36 }).primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 64 }).notNull().unique(),
  ownerUserId: char("owner_user_id", { length: 36 })
    .notNull()
    .references(() => users.id),
  createdAt: datetime("created_at", { mode: "string" })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export const companyMembers = mysqlTable(
  "company_members",
  {
    companyId: char("company_id", { length: 36 })
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    userId: char("user_id", { length: 36 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: varchar("role", { length: 16 }).notNull(),
    invitedBy: char("invited_by", { length: 36 }),
    createdAt: datetime("created_at", { mode: "string" })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.companyId, t.userId] }),
  }),
);

export const sessions = mysqlTable(
  "sessions",
  {
    id: char("id", { length: 36 }).primaryKey(),
    userId: char("user_id", { length: 36 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    companyId: char("company_id", { length: 36 }),
    tokenHash: varchar("token_hash", { length: 128 }).notNull().unique(),
    expiresAt: datetime("expires_at", { mode: "date" }).notNull(),
    createdAt: datetime("created_at", { mode: "string" })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (t) => ({
    userExpiresIdx: index("sessions_user_idx").on(t.userId, t.expiresAt),
  }),
);

export const posPublishedMenu = mysqlTable("pos_published_menu", {
  companyId: char("company_id", { length: 36 })
    .primaryKey()
    .references(() => companies.id, { onDelete: "cascade" }),
  menu: json("menu").$type<PublishedGuestMenu>().notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
});

export const posGuestOrders = mysqlTable(
  "pos_guest_orders",
  {
    id: char("id", { length: 36 }).primaryKey(),
    companyId: char("company_id", { length: 36 })
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    tableId: varchar("table_id", { length: 64 }).notNull(),
    tableLabel: varchar("table_label", { length: 255 }).notNull(),
    orderLines: json("order_lines").$type<GuestOrderSubmit["lines"]>().notNull(),
    note: text("note").notNull(),
    createdAt: bigint("created_at", { mode: "number" }).notNull(),
    acknowledged: tinyint("acknowledged").notNull().default(0),
  },
  (t) => ({
    pendingIdx: index("pos_guest_pending_idx").on(t.companyId, t.acknowledged, t.createdAt),
  }),
);

export const companyInvites = mysqlTable(
  "company_invites",
  {
    id: char("id", { length: 36 }).primaryKey(),
    companyId: char("company_id", { length: 36 })
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    email: varchar("email", { length: 255 }).notNull(),
    role: varchar("role", { length: 16 }).notNull(),
    token: varchar("token", { length: 128 }).notNull().unique(),
    invitedBy: char("invited_by", { length: 36 }),
    createdAt: datetime("created_at", { mode: "string" })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    expiresAt: datetime("expires_at", { mode: "date" }).notNull(),
    acceptedAt: datetime("accepted_at", { mode: "string" }),
  },
  (t) => ({
    companyCreatedIdx: index("company_invites_company_idx").on(t.companyId, t.createdAt),
  }),
);
