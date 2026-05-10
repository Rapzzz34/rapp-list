import { Router } from "express";
import { db, mediaTable } from "@workspace/db";
import { openai } from "@workspace/integrations-openai-ai-server";
import { eq } from "drizzle-orm";

const analyzeRouter = Router();

const CATEGORY_LABEL: Record<string, string> = {
  drakor:        "Korean Drama",
  webtoon:       "Webtoon / Manhwa",
  "short-dracin": "Short Chinese Drama",
  indo:          "Indonesian Drama / Film",
};

analyzeRouter.get("/media/:id/analyze", async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  const [item] = await db.select().from(mediaTable).where(eq(mediaTable.id, id));
  if (!item) return res.status(404).json({ error: "Not found" });

  const categoryLabel = CATEGORY_LABEL[item.category] ?? item.category;

  const prompt = `Kamu adalah database hiburan Asia — drama Korea, webtoon, drama pendek Cina, dan drama Indonesia.

Judul: "${item.title}"
Tipe: ${categoryLabel}
${item.genre ? `Genre (dari pengguna): ${item.genre}` : ""}

Tugasmu: cari informasi resmi judul ini dan kembalikan JSON berikut (TANPA komentar, TANPA markdown, HANYA JSON mentah):

{
  "title": "<judul resmi>",
  "category": "<tipe konten>",
  "synopsis": "<sinopsis 2-3 kalimat dalam Bahasa Indonesia>",
  "year": "<tahun rilis, contoh: 2023>",
  "country": "<negara asal>",
  "platform": "<platform streaming, contoh: Netflix, WeTV, Viki, iQIYI, dll>",
  "totalEpisodes": <jumlah episode, null jika tidak ada>,
  "cast": [
    { "name": "<nama karakter>", "actor": "<nama aktor/aktris asli>", "role": "main" },
    { "name": "<nama karakter>", "actor": "<nama aktor/aktris asli>", "role": "supporting" }
  ]
}

Sertakan 3-5 pemeran utama dan 2-3 pemeran pendukung.
Jika judul tidak dikenal, tetap kembalikan JSON dengan nilai terbaik yang kamu ketahui.
PENTING: Kembalikan HANYA JSON mentah, tidak ada teks lain.`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-5.1",
      max_completion_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    const cleaned = raw.replace(/```json|```/g, "").trim();
    const analysis = JSON.parse(cleaned);
    return res.json(analysis);
  } catch (err) {
    req.log?.error({ err }, "AI analyze failed");
    return res.status(503).json({ error: "AI tidak tersedia" });
  }
});

export default analyzeRouter;
