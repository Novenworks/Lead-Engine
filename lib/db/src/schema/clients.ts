import { pgTable, text, serial, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const clientsTable = pgTable("clients", {
  id: serial("id").primaryKey(),
  businessName: text("business_name").notNull(),
  slug: text("slug").notNull().unique(),
  ownerEmail: text("owner_email").notNull(),
  notificationEmail: text("notification_email").notNull(),
  apiKey: text("api_key").notNull().unique(),
  websiteUrl: text("website_url"),
  industry: text("industry"),
  isActive: boolean("is_active").notNull().default(true),
  automationEnabled: boolean("automation_enabled").notNull().default(false),
  emailSequenceEnabled: boolean("email_sequence_enabled").notNull().default(false),
  smsSequenceEnabled: boolean("sms_sequence_enabled").notNull().default(false),
  aiFollowupEnabled: boolean("ai_followup_enabled").notNull().default(false),
  reviewRequestEnabled: boolean("review_request_enabled").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertClientSchema = createInsertSchema(clientsTable).omit({ id: true, createdAt: true });
export type InsertClient = z.infer<typeof insertClientSchema>;
export type Client = typeof clientsTable.$inferSelect;
