import { pgTable, serial, text, integer, timestamp, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const mediaTable = pgTable("media", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  category: text("category").notNull(),
  genre: text("genre"),
  status: text("status").notNull().default("plan-to-watch"),
  rating: integer("rating"),
  notes: text("notes"),
  totalEpisodes: integer("total_episodes"),
  currentEpisode: integer("current_episode"),
  imageUrl: text("image_url"),
  tags: text("tags"),
  startDate: date("start_date"),
  endDate: date("end_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()),
});

export const insertMediaSchema = createInsertSchema(mediaTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertMedia = z.infer<typeof insertMediaSchema>;
export type Media = typeof mediaTable.$inferSelect;
