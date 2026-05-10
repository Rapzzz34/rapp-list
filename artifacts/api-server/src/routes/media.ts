import { Router } from "express";
import { db, mediaTable } from "@workspace/db";
import {
  ListMediaQueryParams,
  CreateMediaBody,
  UpdateMediaBody,
  GetMediaParams,
  UpdateMediaParams,
  DeleteMediaParams,
} from "@workspace/api-zod";
import { eq, and, ilike, sql, SQL } from "drizzle-orm";

const mediaRouter = Router();

function serializeItem(item: typeof mediaTable.$inferSelect) {
  return {
    ...item,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt ? item.updatedAt.toISOString() : null,
  };
}

mediaRouter.get("/media", async (req, res) => {
  const parsed = ListMediaQueryParams.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid query params" });
  }

  const { category, genre, status, search } = parsed.data;
  const filters: SQL[] = [];

  if (category) filters.push(eq(mediaTable.category, category));
  if (genre) filters.push(eq(mediaTable.genre, genre));
  if (status) filters.push(eq(mediaTable.status, status));
  if (search) filters.push(ilike(mediaTable.title, `%${search}%`));

  const items = await db
    .select()
    .from(mediaTable)
    .where(filters.length > 0 ? and(...filters) : undefined)
    .orderBy(mediaTable.createdAt);

  return res.json(items.map(serializeItem));
});

mediaRouter.post("/media", async (req, res) => {
  const parsed = CreateMediaBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid body" });
  }

  const [created] = await db.insert(mediaTable).values(parsed.data).returning();
  return res.status(201).json(serializeItem(created));
});

mediaRouter.get("/media/stats/summary", async (req, res) => {
  const rows = await db
    .select({
      category: mediaTable.category,
      status: mediaTable.status,
      count: sql<number>`count(*)::int`,
    })
    .from(mediaTable)
    .groupBy(mediaTable.category, mediaTable.status);

  const categoryMap: Record<string, { total: number; completed: number; watching: number; planToWatch: number; dropped: number }> = {};

  for (const row of rows) {
    if (!categoryMap[row.category]) {
      categoryMap[row.category] = { total: 0, completed: 0, watching: 0, planToWatch: 0, dropped: 0 };
    }
    const cat = categoryMap[row.category];
    cat.total += row.count;
    if (row.status === "completed") cat.completed += row.count;
    else if (row.status === "watching") cat.watching += row.count;
    else if (row.status === "plan-to-watch") cat.planToWatch += row.count;
    else if (row.status === "dropped") cat.dropped += row.count;
  }

  const categories = Object.entries(categoryMap).map(([category, stats]) => ({ category, ...stats }));
  const totalAll = categories.reduce((acc, c) => acc + c.total, 0);
  return res.json({ totalAll, categories });
});

mediaRouter.get("/media/stats/detailed", async (req, res) => {
  const [monthlyRows, genreRows, ratingRow, episodeRow, dateRows] = await Promise.all([
    db.execute(sql`
      SELECT TO_CHAR(COALESCE(updated_at, created_at), 'YYYY-MM') as month, COUNT(*)::int as count
      FROM media
      WHERE status = 'completed'
        AND COALESCE(updated_at, created_at) >= NOW() - INTERVAL '12 months'
      GROUP BY month ORDER BY month
    `),
    db.execute(sql`
      SELECT genre, COUNT(*)::int as count
      FROM media WHERE genre IS NOT NULL
      GROUP BY genre ORDER BY count DESC LIMIT 12
    `),
    db.execute(sql`
      SELECT ROUND(AVG(rating)::numeric, 1) as avg_rating
      FROM media WHERE rating IS NOT NULL
    `),
    db.execute(sql`
      SELECT COALESCE(SUM(current_episode), 0)::int as total_episodes
      FROM media
    `),
    db.execute(sql`
      SELECT DISTINCT DATE(COALESCE(updated_at, created_at)) as activity_date
      FROM media ORDER BY activity_date DESC LIMIT 365
    `),
  ]);

  const monthly = (monthlyRows.rows as { month: string; count: number }[]).map(r => ({
    month: r.month,
    count: Number(r.count),
  }));

  const genres = (genreRows.rows as { genre: string; count: number }[]).map(r => ({
    genre: r.genre,
    count: Number(r.count),
  }));

  const avgRating = Number((ratingRow.rows[0] as { avg_rating: string | null })?.avg_rating ?? 0);
  const totalEpisodes = Number((episodeRow.rows[0] as { total_episodes: number })?.total_episodes ?? 0);
  const estimatedHours = Math.round(totalEpisodes * 0.75 * 10) / 10;

  // Compute streak (consecutive days ending today or yesterday)
  const activityDates = (dateRows.rows as { activity_date: Date }[])
    .map(r => {
      const d = r.activity_date instanceof Date ? r.activity_date : new Date(r.activity_date as string);
      return d.toISOString().split("T")[0];
    })
    .sort()
    .reverse();

  let streak = 0;
  if (activityDates.length > 0) {
    const today = new Date().toISOString().split("T")[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
    let cursor = activityDates[0] === today || activityDates[0] === yesterday ? activityDates[0] : null;
    if (cursor) {
      for (const date of activityDates) {
        if (date === cursor) {
          streak++;
          const dd: Date = new Date(cursor as string);
          dd.setDate(dd.getDate() - 1);
          cursor = dd.toISOString().split("T")[0];
        } else if (date < (cursor as string)) {
          break;
        }
      }
    }
  }

  return res.json({ monthly, genres, avgRating, totalEpisodes, estimatedHours, streak });
});

mediaRouter.get("/media/export", async (req, res) => {
  const items = await db.select().from(mediaTable).orderBy(mediaTable.createdAt);
  return res.json(items.map(serializeItem));
});

mediaRouter.post("/media/bulk-import", async (req, res) => {
  const { items } = req.body as { items: Array<{ title: string; category: string; status?: string }> };
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: "items must be a non-empty array" });
  }

  let created = 0;
  let failed = 0;

  for (const item of items) {
    try {
      if (!item.title || !item.category) { failed++; continue; }
      await db.insert(mediaTable).values({
        title: String(item.title).trim(),
        category: String(item.category),
        status: (item.status as string) || "plan-to-watch",
      });
      created++;
    } catch {
      failed++;
    }
  }

  return res.json({ created, failed });
});

mediaRouter.get("/media/genres/list", async (req, res) => {
  const rows = await db
    .selectDistinct({ genre: mediaTable.genre })
    .from(mediaTable)
    .where(sql`${mediaTable.genre} is not null`);

  const genres = rows.map((r) => r.genre).filter(Boolean) as string[];
  return res.json(genres.sort());
});

mediaRouter.get("/media/:id", async (req, res) => {
  const parsed = GetMediaParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) return res.status(400).json({ error: "Invalid id" });

  const [item] = await db.select().from(mediaTable).where(eq(mediaTable.id, parsed.data.id));
  if (!item) return res.status(404).json({ error: "Not found" });
  return res.json(serializeItem(item));
});

mediaRouter.patch("/media/:id", async (req, res) => {
  const paramParsed = UpdateMediaParams.safeParse({ id: Number(req.params.id) });
  if (!paramParsed.success) return res.status(400).json({ error: "Invalid id" });

  const bodyParsed = UpdateMediaBody.safeParse(req.body);
  if (!bodyParsed.success) return res.status(400).json({ error: "Invalid body" });

  const [updated] = await db
    .update(mediaTable)
    .set(bodyParsed.data)
    .where(eq(mediaTable.id, paramParsed.data.id))
    .returning();

  if (!updated) return res.status(404).json({ error: "Not found" });
  return res.json(serializeItem(updated));
});

mediaRouter.delete("/media/:id", async (req, res) => {
  const parsed = DeleteMediaParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) return res.status(400).json({ error: "Invalid id" });

  const [deleted] = await db.delete(mediaTable).where(eq(mediaTable.id, parsed.data.id)).returning();
  if (!deleted) return res.status(404).json({ error: "Not found" });
  return res.status(204).send();
});

export default mediaRouter;
