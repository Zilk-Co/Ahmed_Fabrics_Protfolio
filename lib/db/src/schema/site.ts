import {
  boolean,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const siteSettingsTable = pgTable("site_settings", {
  id: serial("id").primaryKey(),
  brandName: text("brand_name").notNull(),
  location: text("location").notNull(),
  phone: text("phone").notNull(),
  whatsapp: text("whatsapp").notNull(),
  email: text("email").notNull(),
  officeAddress: text("office_address").notNull(),
  factoryAddress: text("factory_address").notNull(),
  businessHours: text("business_hours").notNull(),
  whatsappMessage: text("whatsapp_message").notNull(),
  heroImage: text("hero_image").notNull(),
  heroVideo: text("hero_video"),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const factoryStatsTable = pgTable("factory_stats", {
  id: serial("id").primaryKey(),
  value: text("value").notNull(),
  label: text("label").notNull(),
  displayOrder: integer("display_order").notNull().default(0),
});

export const contentTable = pgTable("content", {
  id: serial("id").primaryKey(),
  collection: varchar("collection", { length: 32 }).notNull(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  shortDescription: text("short_description").notNull().default(""),
  description: text("description").notNull().default(""),
  category: text("category").notNull().default(""),
  image: text("image").notNull().default(""),
  images: text("images").array().notNull().default([]),
  video: text("video"),
  published: boolean("published").notNull().default(true),
  featured: boolean("featured").notNull().default(false),
  displayOrder: integer("display_order").notNull().default(0),
  meta: jsonb("meta").$type<Record<string, unknown>>().notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const adminSessionsTable = pgTable("admin_sessions", {
  id: serial("id").primaryKey(),
  tokenHash: text("token_hash").notNull().unique(),
  username: text("username").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertSiteSettingsSchema = createInsertSchema(siteSettingsTable).omit({
  id: true,
  updatedAt: true,
});
export const insertFactoryStatSchema = createInsertSchema(factoryStatsTable).omit({ id: true });
export const insertContentSchema = createInsertSchema(contentTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertAdminSessionSchema = createInsertSchema(adminSessionsTable).omit({
  id: true,
  createdAt: true,
});

export type SiteSettings = z.infer<typeof insertSiteSettingsSchema>;
export type FactoryStat = z.infer<typeof insertFactoryStatSchema>;
export type Content = typeof contentTable.$inferSelect;
export type InsertContent = z.infer<typeof insertContentSchema>;