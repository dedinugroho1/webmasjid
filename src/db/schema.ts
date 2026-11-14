/**
 * Skema database WebMasjid (Drizzle ORM + Neon Postgres).
 *
 * Prinsip multi-tenancy: setiap tabel data masjid memiliki kolom `tenant_id`
 * yang mereferensikan `tenants.id`. Semua query di server WAJIB difilter
 * berdasarkan tenant yang sudah diverifikasi (lihat `src/lib/session.ts`).
 *
 * Tabel `users`, `sessions`, `accounts`, `verifications` mengikuti skema
 * standar Better Auth, ditambah kolom `tenant_id` & `role`.
 */
import { relations } from "drizzle-orm";
import {
  bigint,
  boolean,
  date,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

const id = () =>
  text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID());

const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updatedAt = () =>
  timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date());

// ─── Enums ──────────────────────────────────────────────────────────────
export const userRoleEnum = pgEnum("user_role", ["DKM_ADMIN", "BENDAHARA", "SUPERADMIN"]);
export const transactionTypeEnum = pgEnum("transaction_type", ["IN", "OUT"]);
/** Jenis kas: operasional harian atau dana pembangunan/renovasi. */
export const cashFundEnum = pgEnum("cash_fund", ["OPERASIONAL", "PEMBANGUNAN"]);
export const eventTypeEnum = pgEnum("event_type", ["KAJIAN", "JUMAT", "SOSIAL"]);

export type UserRole = (typeof userRoleEnum.enumValues)[number];
export type TransactionType = (typeof transactionTypeEnum.enumValues)[number];
export type CashFund = (typeof cashFundEnum.enumValues)[number];
export type EventType = (typeof eventTypeEnum.enumValues)[number];

/** Koreksi (menit, boleh negatif) per waktu: subuh, syuruq, dzuhur, ashar, maghrib, isya. */
export type PrayerAdjustments = Partial<Record<"subuh" | "syuruq" | "dzuhur" | "ashar" | "maghrib" | "isya", number>>;
/** Jeda iqomah (menit) per waktu sholat wajib. */
export type IqomahMinutes = Partial<Record<"subuh" | "dzuhur" | "ashar" | "maghrib" | "isya", number>>;

export type BankAccount = {
  bank: string;
  number: string;
  holder: string;
};

// ─── Tenants (Masjid) ───────────────────────────────────────────────────
export const tenants = pgTable(
  "tenants",
  {
    id: id(),
    name: text("name").notNull(),
    /** Dipakai di URL: webmasjid.com/{slug} */
    slug: text("slug").notNull(),
    /** Domain sendiri (tanpa protokol), mis. "masjidalikhlas.or.id". */
    customDomain: text("custom_domain"),
    description: text("description"),
    address: text("address"),
    city: text("city"),
    latitude: doublePrecision("latitude"),
    longitude: doublePrecision("longitude"),
    /** IANA timezone: Asia/Jakarta (WIB), Asia/Makassar (WITA), Asia/Jayapura (WIT). */
    timezone: text("timezone").notNull().default("Asia/Jakarta"),
    phone: text("phone"),
    email: text("email"),
    logoUrl: text("logo_url"),
    coverUrl: text("cover_url"),
    qrisUrl: text("qris_url"),
    bankAccounts: jsonb("bank_accounts").$type<BankAccount[]>().notNull().default([]),
    /** Pesan running text (fitur TV Display — sementara dinonaktifkan). */
    runningText: text("running_text"),
    /** Tampil di direktori publik webmasjid.com. */
    isPublished: boolean("is_published").notNull().default(true),
    /** Diisi superadmin untuk menangguhkan masjid (mis. pendaftaran palsu). */
    suspendedAt: timestamp("suspended_at", { withTimezone: true }),
    suspendReason: text("suspend_reason"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("tenants_slug_uidx").on(t.slug), uniqueIndex("tenants_custom_domain_uidx").on(t.customDomain)],
);

// ─── Better Auth: users ─────────────────────────────────────────────────
export const users = pgTable(
  "users",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    emailVerified: boolean("email_verified").notNull().default(false),
    image: text("image"),
    // Tambahan WebMasjid
    tenantId: text("tenant_id").references(() => tenants.id, { onDelete: "set null" }),
    role: userRoleEnum("role").notNull().default("DKM_ADMIN"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("users_tenant_idx").on(t.tenantId)],
);

// ─── Better Auth: sessions ──────────────────────────────────────────────
export const sessions = pgTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    token: text("token").notNull().unique(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    // Tambahan WebMasjid: tenant aktif yang terikat pada sesi ini.
    tenantId: text("tenant_id").references(() => tenants.id, { onDelete: "set null" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
);

// ─── Better Auth: accounts ──────────────────────────────────────────────
export const accounts = pgTable(
  "accounts",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
    scope: text("scope"),
    password: text("password"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("accounts_user_idx").on(t.userId)],
);

// ─── Better Auth: verifications ─────────────────────────────────────────
export const verifications = pgTable(
  "verifications",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("verifications_identifier_idx").on(t.identifier)],
);

// ─── Buku Kas ───────────────────────────────────────────────────────────
export const cashTransactions = pgTable(
  "cash_transactions",
  {
    id: id(),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    type: transactionTypeEnum("type").notNull(),
    fund: cashFundEnum("fund").notNull().default("OPERASIONAL"),
    category: text("category").notNull(),
    /** Nominal dalam Rupiah (bilangan bulat, tanpa desimal). */
    amount: bigint("amount", { mode: "number" }).notNull(),
    description: text("description"),
    transactionDate: date("transaction_date", { mode: "string" }).notNull(),
    receiptUrl: text("receipt_url"),
    createdBy: text("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: createdAt(),
  },
  (t) => [
    index("cash_tx_tenant_date_idx").on(t.tenantId, t.transactionDate),
    index("cash_tx_tenant_fund_idx").on(t.tenantId, t.fund),
  ],
);

// ─── Agenda & Kajian ────────────────────────────────────────────────────
export const events = pgTable(
  "events",
  {
    id: id(),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    type: eventTypeEnum("type").notNull().default("KAJIAN"),
    title: text("title").notNull(),
    /** Penceramah / ustadz; untuk JUMAT = khatib. */
    speaker: text("speaker"),
    /** Khusus JUMAT: imam sholat. */
    imam: text("imam"),
    description: text("description"),
    dateTime: timestamp("date_time", { withTimezone: true }).notNull(),
    location: text("location"),
    createdAt: createdAt(),
  },
  (t) => [index("events_tenant_date_idx").on(t.tenantId, t.dateTime)],
);

// ─── Jadwal Petugas Jumat ───────────────────────────────────────────────
export const jumatSchedules = pgTable(
  "jumat_schedules",
  {
    id: id(),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    /** Tanggal Jumat (YYYY-MM-DD). */
    date: date("date", { mode: "string" }).notNull(),
    khatib: text("khatib"),
    imam: text("imam"),
    muadzin: text("muadzin"),
    /** Tema khutbah (opsional). */
    theme: text("theme"),
    notes: text("notes"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("jumat_tenant_date_uidx").on(t.tenantId, t.date)],
);

// ─── Kajian Rutin ───────────────────────────────────────────────────────
export const kajianFrequencyEnum = pgEnum("kajian_frequency", [
  "SETIAP_PEKAN",
  "PEKAN_1_3",
  "PEKAN_2_4",
  "SEBULAN_SEKALI",
]);
export type KajianFrequency = (typeof kajianFrequencyEnum.enumValues)[number];

/** Jadwal kajian yang berulang (mis. setiap Ahad ba'da Subuh). */
export const routineKajian = pgTable(
  "routine_kajian",
  {
    id: id(),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    /** 0 = Ahad, 1 = Senin, … 6 = Sabtu. */
    dayOfWeek: integer("day_of_week").notNull(),
    /** Waktu bebas: "Ba'da Subuh", "Ba'da Maghrib", "16.00". */
    time: text("time").notNull(),
    title: text("title").notNull(),
    ustadz: text("ustadz"),
    frequency: kajianFrequencyEnum("frequency").notNull().default("SETIAP_PEKAN"),
    /** Peserta/sasaran, mis. "Umum", "Ibu-ibu", "Remaja". */
    audience: text("audience"),
    location: text("location"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("routine_kajian_tenant_idx").on(t.tenantId, t.dayOfWeek)],
);

// ─── Pengumuman ─────────────────────────────────────────────────────────
export const announcements = pgTable(
  "announcements",
  {
    id: id(),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    body: text("body").notNull(),
    /** Disematkan di urutan teratas. */
    isPinned: boolean("is_pinned").notNull().default(false),
    /** Opsional: setelah waktu ini pengumuman tidak tampil di halaman publik. */
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    createdBy: text("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("announcements_tenant_idx").on(t.tenantId, t.createdAt)],
);

// ─── Galeri Kegiatan ────────────────────────────────────────────────────
export const galleryItems = pgTable(
  "gallery_items",
  {
    id: id(),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    imageUrl: text("image_url").notNull(),
    caption: text("caption"),
    takenAt: date("taken_at", { mode: "string" }),
    createdBy: text("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: createdAt(),
  },
  (t) => [index("gallery_tenant_idx").on(t.tenantId, t.createdAt)],
);

// ─── Pengaturan Jadwal Sholat ───────────────────────────────────────────
export const prayerSettings = pgTable(
  "prayer_settings",
  {
    id: id(),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    /** Lihat `CALCULATION_METHODS` di src/lib/prayer.ts. Default: KEMENAG. */
    calculationMethod: text("calculation_method").notNull().default("KEMENAG"),
    /** Jeda iqomah bawaan bila `iqomah_minutes` untuk suatu waktu tidak diisi. */
    iqomahOffsetMinutes: integer("iqomah_offset_minutes").notNull().default(10),
    /** Koreksi jadwal per waktu agar sama dengan jadwal masjid setempat. */
    adjustments: jsonb("adjustments").$type<PrayerAdjustments>().notNull().default({}),
    /** Jeda iqomah per waktu, mis. { subuh: 15, maghrib: 5 }. */
    iqomahMinutes: jsonb("iqomah_minutes").$type<IqomahMinutes>().notNull().default({}),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("prayer_settings_tenant_uidx").on(t.tenantId)],
);

// ─── Undangan Pengurus ──────────────────────────────────────────────────
/**
 * Link undangan untuk menambah pengurus (bendahara/admin) ke sebuah masjid.
 * Hanya hash token yang disimpan; token mentah ditampilkan sekali ke admin.
 */
export const invitations = pgTable(
  "invitations",
  {
    id: id(),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    role: userRoleEnum("role").notNull().default("BENDAHARA"),
    /** Catatan untuk admin, mis. nama calon pengurus. */
    note: text("note"),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    acceptedBy: text("accepted_by").references(() => users.id, { onDelete: "set null" }),
    createdBy: text("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("invitations_token_uidx").on(t.tokenHash), index("invitations_tenant_idx").on(t.tenantId)],
);

// ─── Rate limit ─────────────────────────────────────────────────────────
/**
 * Penghitung batas percobaan (login, daftar, reset password, dll.).
 * Disimpan di database agar berlaku lintas instance serverless.
 */
export const rateLimits = pgTable("rate_limits", {
  key: text("key").primaryKey(),
  count: integer("count").notNull(),
  /** Awal jendela waktu (epoch ms). */
  windowStart: bigint("window_start", { mode: "number" }).notNull(),
});

// ─── Relations ──────────────────────────────────────────────────────────
export const tenantsRelations = relations(tenants, ({ many, one }) => ({
  users: many(users),
  cashTransactions: many(cashTransactions),
  events: many(events),
  invitations: many(invitations),
  announcements: many(announcements),
  jumatSchedules: many(jumatSchedules),
  routineKajian: many(routineKajian),
  galleryItems: many(galleryItems),
  prayerSettings: one(prayerSettings, {
    fields: [tenants.id],
    references: [prayerSettings.tenantId],
  }),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  tenant: one(tenants, { fields: [users.tenantId], references: [tenants.id] }),
  sessions: many(sessions),
  accounts: many(accounts),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}));

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, { fields: [accounts.userId], references: [users.id] }),
}));

export const cashTransactionsRelations = relations(cashTransactions, ({ one }) => ({
  tenant: one(tenants, { fields: [cashTransactions.tenantId], references: [tenants.id] }),
  author: one(users, { fields: [cashTransactions.createdBy], references: [users.id] }),
}));

export const eventsRelations = relations(events, ({ one }) => ({
  tenant: one(tenants, { fields: [events.tenantId], references: [tenants.id] }),
}));

export const prayerSettingsRelations = relations(prayerSettings, ({ one }) => ({
  tenant: one(tenants, { fields: [prayerSettings.tenantId], references: [tenants.id] }),
}));

export const invitationsRelations = relations(invitations, ({ one }) => ({
  tenant: one(tenants, { fields: [invitations.tenantId], references: [tenants.id] }),
}));

export type Tenant = typeof tenants.$inferSelect;
export type NewTenant = typeof tenants.$inferInsert;
export type User = typeof users.$inferSelect;
export type CashTransaction = typeof cashTransactions.$inferSelect;
export type MasjidEvent = typeof events.$inferSelect;
export type PrayerSetting = typeof prayerSettings.$inferSelect;
export type Invitation = typeof invitations.$inferSelect;
export type Announcement = typeof announcements.$inferSelect;
export type JumatSchedule = typeof jumatSchedules.$inferSelect;
export type RoutineKajian = typeof routineKajian.$inferSelect;
export type GalleryItem = typeof galleryItems.$inferSelect;
