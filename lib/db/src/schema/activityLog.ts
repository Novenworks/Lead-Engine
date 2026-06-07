import { pgTable, serial, integer, text, timestamp, jsonb } from "drizzle-orm/pg-core";
import { z } from "zod/v4";

export const activityLogTable = pgTable("activity_log", {
  id: serial("id").primaryKey(),
  leadId: integer("lead_id"),
  clientId: integer("client_id"),
  userId: integer("user_id"),
  action: text("action").notNull(),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type ActivityLog = typeof activityLogTable.$inferSelect;

export const insertActivityLogSchema = z.object({
  leadId: z.number().int().optional(),
  clientId: z.number().int().optional(),
  userId: z.number().int().optional(),
  action: z.string().min(1),
  metadata: z.record(z.string(), z.unknown()).optional(),
});
export type InsertActivityLog = z.infer<typeof insertActivityLogSchema>;
