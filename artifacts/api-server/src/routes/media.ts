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

  return res.json(
    items.map((item) => ({
      ...item,
      createdAt: item.createdAt.toISOString(),
    }))
  );
});

mediaRouter.post("/media", async (req, res) => {
  const parsed = CreateMediaBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid body" });
  }

  const [created] = await db
    .insert(mediaTable)
    .values(parsed.data)
    .returning();

  return res.status(201).json({
    ...created,
    createdAt: created.createdAt.toISOString(),
  });
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

  const categoryMap: Record<
    string,
    { total: number; completed: number; watching: number; planToWatch: number; dropped: number }
  > = {};

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

  const categories = Object.entries(categoryMap).map(([category, stats]) => ({
    category,
    ...stats,
  }));

  const totalAll = categories.reduce((acc, c) => acc + c.total, 0);

  return res.json({ totalAll, categories });
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
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid id" });
  }

  const [item] = await db
    .select()
    .from(mediaTable)
    .where(eq(mediaTable.id, parsed.data.id));

  if (!item) return res.status(404).json({ error: "Not found" });

  return res.json({ ...item, createdAt: item.createdAt.toISOString() });
});

mediaRouter.patch("/media/:id", async (req, res) => {
  const paramParsed = UpdateMediaParams.safeParse({ id: Number(req.params.id) });
  if (!paramParsed.success) {
    return res.status(400).json({ error: "Invalid id" });
  }

  const bodyParsed = UpdateMediaBody.safeParse(req.body);
  if (!bodyParsed.success) {
    return res.status(400).json({ error: "Invalid body" });
  }

  const [updated] = await db
    .update(mediaTable)
    .set(bodyParsed.data)
    .where(eq(mediaTable.id, paramParsed.data.id))
    .returning();

  if (!updated) return res.status(404).json({ error: "Not found" });

  return res.json({ ...updated, createdAt: updated.createdAt.toISOString() });
});

mediaRouter.delete("/media/:id", async (req, res) => {
  const parsed = DeleteMediaParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid id" });
  }

  const [deleted] = await db
    .delete(mediaTable)
    .where(eq(mediaTable.id, parsed.data.id))
    .returning();

  if (!deleted) return res.status(404).json({ error: "Not found" });

  return res.status(204).send();
});

export default mediaRouter;
