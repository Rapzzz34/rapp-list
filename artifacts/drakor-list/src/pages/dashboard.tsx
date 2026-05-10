import { useState, useEffect } from "react";
import {
  useGetMediaStats, useListMedia, useGetDetailedStats,
  getGetMediaStatsQueryKey, getListMediaQueryKey, getGetDetailedStatsQueryKey,
} from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Tv, BookOpen, Clapperboard, MonitorPlay, ArrowRight, TrendingUp, CheckCircle2, Play, Clock, Flame, Trophy, Target, Smile } from "lucide-react";
import { Link } from "wouter";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const CATS = {
  drakor:         { label: "K-Dramas",     icon: Tv,           path: "/drakor",        hue: "252,70%,65%" },
  webtoon:        { label: "Webtoons",      icon: BookOpen,     path: "/webtoon",       hue: "186,80%,52%" },
  "short-dracin": { label: "Short Dracin",  icon: Clapperboard, path: "/short-dracin",  hue: "330,70%,60%" },
  indo:           { label: "Indo",          icon: MonitorPlay,  path: "/indo",          hue: "38,85%,55%"  },
} as const;
type CatKey = keyof typeof CATS;

const MOODS = [
  { label: "😂 Lucu",      genres: ["Comedy", "Slice of Life"] },
  { label: "😭 Baper",     genres: ["Romance", "Drama", "Family"] },
  { label: "💥 Seru",      genres: ["Action", "Thriller", "Crime"] },
  { label: "👻 Deg-degan", genres: ["Horror", "Mystery", "Thriller"] },
  { label: "🧙 Fantasi",   genres: ["Fantasy", "Sci-Fi", "Historical"] },
  { label: "📚 Ringan",    genres: ["Slice of Life", "School", "Comedy"] },
];

const ACHIEVEMENTS = [
  { id: "first",     label: "Pemula",       desc: "Tambah judul pertama",  icon: "🌱", req: (t: number) => t >= 1 },
  { id: "five",      label: "Kolektor",     desc: "5 judul di list",        icon: "📋", req: (t: number) => t >= 5 },
  { id: "ten",       label: "Enthusiast",   desc: "10 judul di list",       icon: "🔥", req: (t: number) => t >= 10 },
  { id: "twenty",    label: "Addict",       desc: "20 judul di list",       icon: "💜", req: (t: number) => t >= 20 },
  { id: "done5",     label: "Finisher",     desc: "5 judul selesai",        icon: "✅", req: (_t: number, d: number) => d >= 5 },
  { id: "done10",    label: "Marathoner",   desc: "10 judul selesai",       icon: "🏅", req: (_t: number, d: number) => d >= 10 },
  { id: "perfecter", label: "Perfecter",    desc: "Rating 10 di list",      icon: "⭐", req: (_t: number, _d: number, _r: number, hasTen: boolean) => hasTen },
  { id: "streak3",   label: "Consistent",  desc: "3 hari streak",          icon: "📅", req: (_t: number, _d: number, streak: number) => streak >= 3 },
];

export function Dashboard() {
  const { data: stats, isLoading: loadStats } = useGetMediaStats({
    query: { queryKey: getGetMediaStatsQueryKey() },
  });
  const { data: watching = [], isLoading: loadW } = useListMedia(
    { status: "watching" },
    { query: { queryKey: getListMediaQueryKey({ status: "watching" }) } }
  );
  const { data: planItems = [] } = useListMedia(
    { status: "plan-to-watch" },
    { query: { queryKey: getListMediaQueryKey({ status: "plan-to-watch" }) } }
  );
  const { data: allItems = [] } = useListMedia(
    {},
    { query: { queryKey: getListMediaQueryKey({}) } }
  );
  const { data: detailed } = useGetDetailedStats({
    query: { queryKey: getGetDetailedStatsQueryKey() },
  });

  const [moodOpen, setMoodOpen] = useState(false);
  const [selectedMood, setSelectedMood] = useState<typeof MOODS[0] | null>(null);
  const [goal, setGoal] = useState<number>(() => {
    try { return Number(localStorage.getItem("nw_monthly_goal") ?? 0); } catch { return 0; }
  });
  const [editingGoal, setEditingGoal] = useState(false);
  const [goalInput, setGoalInput] = useState("");

  const totalAll    = stats?.totalAll ?? 0;
  const totalDone   = stats?.categories?.reduce((s, c) => s + (c.completed ?? 0), 0) ?? 0;
  const totalWatch  = stats?.categories?.reduce((s, c) => s + (c.watching  ?? 0), 0) ?? 0;
  const totalPlan   = stats?.categories?.reduce((s, c) => s + (c.planToWatch ?? 0), 0) ?? 0;
  const globalPct   = totalAll > 0 ? Math.round((totalDone / totalAll) * 100) : 0;
  const streak      = detailed?.streak ?? 0;

  const hasTen = allItems.some(i => i.rating === 10);

  // Next up: first plan-to-watch per category
  const nextUp = (Object.keys(CATS) as CatKey[]).map(key => ({
    key,
    item: planItems.find(i => i.category === key) ?? null,
  })).filter(x => x.item !== null);

  // Mood results
  const moodResults = selectedMood
    ? allItems.filter(i => i.genre && selectedMood.genres.includes(i.genre) && i.status === "plan-to-watch").slice(0, 5)
    : [];

  function saveGoal() {
    const n = Number(goalInput);
    if (!isNaN(n) && n >= 0) {
      setGoal(n);
      try { localStorage.setItem("nw_monthly_goal", String(n)); } catch {}
    }
    setEditingGoal(false);
  }

  // Current month completions (approximate from stats, use totalDone for now)
  const thisMonthDone = (() => {
    const now = new Date();
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    return detailed?.monthly?.find(m => m.month === monthKey)?.count ?? 0;
  })();

  const goalPct = goal > 0 ? Math.min(100, Math.round((thisMonthDone / goal) * 100)) : 0;

  return (
    <div className="pb-20 md:pb-0" style={{ display: "flex", flexDirection: "column", gap: 28 }}>

      {/* ── Header ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h1 style={{ fontFamily: "'Sora',sans-serif", fontWeight: 800, fontSize: 30, letterSpacing: "-0.5px", color: "hsl(220,18%,91%)", marginBottom: 4 }}>
            Dashboard<span className="glow-text">.</span>
          </h1>
          <p style={{ fontSize: 13, color: "hsl(220,12%,40%)" }}>Semua list tontonan kamu di satu tempat.</p>
        </div>
        {streak > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", borderRadius: 20, background: "hsla(38,85%,55%,0.1)", border: "1px solid hsla(38,85%,55%,0.25)" }}>
            <Flame style={{ width: 14, height: 14, color: "hsl(38,85%,60%)" }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: "hsl(38,85%,62%)", fontFamily: "'Sora',sans-serif" }}>{streak}</span>
            <span style={{ fontSize: 11, color: "hsl(38,75%,50%)" }}>hari</span>
          </div>
        )}
      </div>

      {/* ── 4 stat pills ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
        {loadStats ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl bg-muted/40" />)
        ) : (
          <>
            {[
              { label: "Total",   value: totalAll,   icon: TrendingUp,   color: "220,18%,75%" },
              { label: "Nonton",  value: totalWatch,  icon: Play,         color: "155,60%,55%" },
              { label: "Selesai", value: totalDone,   icon: CheckCircle2, color: "252,70%,70%" },
              { label: "Planned", value: totalPlan,   icon: Clock,        color: "214,80%,62%" },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="surface" style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 11, fontWeight: 500, color: "hsl(220,12%,38%)", textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</span>
                  <Icon style={{ width: 13, height: 13, color: `hsl(${color})` }} />
                </div>
                <span style={{ fontFamily: "'Sora',sans-serif", fontWeight: 800, fontSize: 26, color: `hsl(${color})`, lineHeight: 1 }}>{value}</span>
              </div>
            ))}
          </>
        )}
      </div>

      {/* ── Global progress bar ── */}
      {!loadStats && totalAll > 0 && (
        <div className="surface" style={{ padding: "16px 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: "hsl(220,12%,45%)" }}>Progress Keseluruhan</span>
            <span style={{ fontFamily: "'Sora',sans-serif", fontWeight: 700, fontSize: 18, color: "hsl(252,70%,72%)" }}>
              {globalPct}<span style={{ fontSize: 12, fontWeight: 500 }}>%</span>
            </span>
          </div>
          <div style={{ height: 6, borderRadius: 99, background: "hsla(255,100%,100%,0.06)", overflow: "hidden" }}>
            <div style={{
              height: "100%", borderRadius: 99,
              background: "linear-gradient(90deg, hsl(252,70%,50%), hsl(252,70%,72%))",
              width: `${globalPct}%`,
              boxShadow: "0 0 12px -2px hsla(252,70%,65%,0.5)",
              transition: "width 800ms cubic-bezier(.4,0,.2,1)",
            }} />
          </div>
          <p style={{ fontSize: 11, color: "hsl(220,12%,35%)", marginTop: 8 }}>{totalDone} dari {totalAll} judul selesai</p>
        </div>
      )}

      {/* ── Monthly goal ── */}
      <div className="surface" style={{ padding: "16px 20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Target style={{ width: 14, height: 14, color: "hsl(155,60%,52%)" }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: "hsl(220,12%,45%)" }}>Target Bulan Ini</span>
          </div>
          {!editingGoal ? (
            <button
              onClick={() => { setGoalInput(String(goal)); setEditingGoal(true); }}
              style={{ fontSize: 11, color: "hsl(220,12%,38%)", background: "none", border: "none", cursor: "pointer", padding: "2px 6px" }}
            >
              {goal === 0 ? "Set target" : "Ubah"}
            </button>
          ) : (
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <input
                autoFocus
                type="number"
                min={0}
                value={goalInput}
                onChange={e => setGoalInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") saveGoal(); if (e.key === "Escape") setEditingGoal(false); }}
                style={{ width: 52, padding: "3px 8px", borderRadius: 6, fontSize: 12, background: "hsl(228,18%,13%)", border: "1px solid hsl(252,70%,55%)", color: "hsl(220,18%,88%)", outline: "none" }}
              />
              <button onClick={saveGoal} style={{ fontSize: 11, color: "hsl(155,60%,55%)", background: "none", border: "none", cursor: "pointer" }}>✓</button>
              <button onClick={() => setEditingGoal(false)} style={{ fontSize: 11, color: "hsl(220,12%,38%)", background: "none", border: "none", cursor: "pointer" }}>✕</button>
            </div>
          )}
        </div>
        {goal > 0 ? (
          <>
            <div style={{ height: 6, borderRadius: 99, background: "hsla(255,100%,100%,0.05)", overflow: "hidden" }}>
              <div style={{
                height: "100%", borderRadius: 99,
                background: goalPct >= 100
                  ? "linear-gradient(90deg, hsl(155,60%,40%), hsl(155,60%,58%))"
                  : "linear-gradient(90deg, hsl(155,60%,35%), hsl(155,60%,52%))",
                width: `${goalPct}%`, transition: "width 600ms ease",
              }} />
            </div>
            <p style={{ fontSize: 11, color: "hsl(220,12%,35%)", marginTop: 6 }}>
              {goalPct >= 100
                ? `🎉 Target tercapai! ${thisMonthDone}/${goal} selesai`
                : `${thisMonthDone} dari ${goal} selesai bulan ini`}
            </p>
          </>
        ) : (
          <p style={{ fontSize: 12, color: "hsl(220,12%,32%)" }}>Belum set target. Klik "Set target" di atas.</p>
        )}
      </div>

      {/* ── Mood picker ── */}
      <div className="surface" style={{ padding: "16px 20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <Smile style={{ width: 14, height: 14, color: "hsl(252,70%,65%)" }} />
          <span style={{ fontSize: 12, fontWeight: 600, color: "hsl(220,12%,45%)" }}>Mau Nonton Apa?</span>
          {selectedMood && (
            <button onClick={() => setSelectedMood(null)} style={{ marginLeft: "auto", fontSize: 11, color: "hsl(220,12%,38%)", background: "none", border: "none", cursor: "pointer" }}>Reset</button>
          )}
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: selectedMood ? 12 : 0 }}>
          {MOODS.map(m => (
            <button
              key={m.label}
              onClick={() => setSelectedMood(selectedMood?.label === m.label ? null : m)}
              style={{
                padding: "5px 12px", borderRadius: 20, fontSize: 12, cursor: "pointer",
                fontFamily: "'Inter',sans-serif", transition: "all 150ms",
                background: selectedMood?.label === m.label ? "hsla(252,70%,65%,0.15)" : "hsla(255,100%,100%,0.04)",
                border: selectedMood?.label === m.label ? "1px solid hsla(252,70%,65%,0.4)" : "1px solid hsl(228,18%,18%)",
                color: selectedMood?.label === m.label ? "hsl(252,70%,78%)" : "hsl(220,12%,48%)",
              }}
            >
              {m.label}
            </button>
          ))}
        </div>
        {selectedMood && (
          moodResults.length === 0 ? (
            <p style={{ fontSize: 12, color: "hsl(220,12%,35%)" }}>
              Tidak ada di watchlist untuk mood ini. Coba tambahkan dulu!
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <p style={{ fontSize: 11, color: "hsl(220,12%,38%)" }}>Dari watchlist kamu:</p>
              {moodResults.map(item => {
                const cat = CATS[item.category as CatKey] ?? CATS.drakor;
                return (
                  <Link key={item.id} href={cat.path} style={{ textDecoration: "none" }}>
                    <div style={{ padding: "8px 12px", borderRadius: 8, background: "hsla(252,70%,65%,0.06)", border: "1px solid hsla(252,70%,65%,0.15)", cursor: "pointer" }}>
                      <span style={{ fontSize: 13, fontWeight: 500, color: "hsl(220,18%,85%)" }}>{item.title}</span>
                      <span style={{ fontSize: 11, color: "hsl(220,12%,40%)", marginLeft: 8 }}>{item.genre}</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )
        )}
      </div>

      {/* ── Category rows ── */}
      <div>
        <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "hsl(220,12%,32%)", marginBottom: 12 }}>Kategori</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {loadStats ? (
            Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl bg-muted/40" />)
          ) : (
            (Object.keys(CATS) as CatKey[]).map(key => {
              const cat = CATS[key];
              const Icon = cat.icon;
              const row  = stats?.categories?.find(c => c.category === key);
              const total = row?.total ?? 0;
              const completed = row?.completed ?? 0;
              const watching2 = row?.watching  ?? 0;
              const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
              return (
                <Link key={key} href={cat.path} style={{ textDecoration: "none" }}>
                  <div
                    className="surface"
                    style={{ padding: "14px 18px", cursor: "pointer", display: "flex", alignItems: "center", gap: 14, transition: "border-color 200ms" }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = `hsla(${cat.hue},0.45)`; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = `hsl(228,18%,16%)`; }}
                  >
                    <div style={{ flexShrink: 0, width: 36, height: 36, borderRadius: 10, background: `hsla(${cat.hue},0.1)`, border: `1px solid hsla(${cat.hue},0.22)`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Icon style={{ width: 16, height: 16, color: `hsl(${cat.hue})` }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
                        <span style={{ fontFamily: "'Sora',sans-serif", fontWeight: 600, fontSize: 13, color: "hsl(220,18%,85%)" }}>{cat.label}</span>
                        <div style={{ display: "flex", gap: 10, fontSize: 12, color: "hsl(220,12%,38%)" }}>
                          {watching2 > 0 && <span style={{ color: "hsl(155,55%,52%)", fontWeight: 500 }}>▶ {watching2}</span>}
                          <span style={{ fontFamily: "'Sora',sans-serif", fontWeight: 700, color: `hsl(${cat.hue})` }}>
                            {completed}<span style={{ fontWeight: 400, color: "hsl(220,12%,32%)" }}>/{total}</span>
                          </span>
                        </div>
                      </div>
                      <div style={{ height: 4, borderRadius: 99, background: "hsla(255,100%,100%,0.05)", overflow: "hidden" }}>
                        <div style={{ height: "100%", borderRadius: 99, background: `linear-gradient(90deg, hsla(${cat.hue},0.6), hsl(${cat.hue}))`, width: total > 0 ? `${pct}%` : "0%", transition: "width 600ms ease" }} />
                      </div>
                    </div>
                    <ArrowRight style={{ width: 14, height: 14, color: "hsl(220,12%,28%)", flexShrink: 0 }} />
                  </div>
                </Link>
              );
            })
          )}
        </div>
      </div>

      {/* ── Tontonan Berikutnya ── */}
      {nextUp.length > 0 && (
        <div>
          <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "hsl(220,12%,32%)", marginBottom: 12 }}>
            Tontonan Berikutnya
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {nextUp.map(({ key, item }) => {
              const cat = CATS[key];
              const Icon = cat.icon;
              return (
                <Link key={key} href={cat.path} style={{ textDecoration: "none" }}>
                  <div
                    className="surface"
                    style={{ padding: "12px 16px", cursor: "pointer", display: "flex", alignItems: "center", gap: 12, transition: "border-color 200ms" }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = `hsla(${cat.hue},0.4)`; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "hsl(228,18%,16%)"; }}
                  >
                    <div style={{ width: 32, height: 32, borderRadius: 8, flexShrink: 0, background: `hsla(${cat.hue},0.1)`, border: `1px solid hsla(${cat.hue},0.2)`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Icon style={{ width: 14, height: 14, color: `hsl(${cat.hue})` }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: "hsl(220,18%,88%)", fontFamily: "'Sora',sans-serif", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {item!.title}
                      </p>
                      <p style={{ fontSize: 11, color: "hsl(220,12%,40%)" }}>{cat.label}</p>
                    </div>
                    <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, background: "hsla(214,80%,55%,0.1)", border: "1px solid hsla(214,80%,55%,0.25)", color: "hsl(214,80%,65%)" }}>Plan to Watch</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Currently Watching ── */}
      <div>
        <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "hsl(220,12%,32%)", marginBottom: 12 }}>
          Sedang Ditonton
        </p>
        {loadW ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl bg-muted/40" />)}
          </div>
        ) : watching.length === 0 ? (
          <div className="surface" style={{ padding: "28px", textAlign: "center" }}>
            <Play style={{ width: 24, height: 24, color: "hsl(220,12%,28%)", margin: "0 auto 10px" }} />
            <p style={{ fontSize: 13, color: "hsl(220,12%,38%)" }}>Belum ada yang sedang ditonton.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {watching.slice(0, 8).map(item => {
              const cat   = CATS[item.category as CatKey] ?? CATS.drakor;
              const Icon  = cat.icon;
              const hasPct = item.totalEpisodes != null && item.currentEpisode != null;
              const pct   = hasPct ? Math.round((item.currentEpisode! / item.totalEpisodes!) * 100) : null;
              return (
                <Link key={item.id} href={cat.path} style={{ textDecoration: "none" }}>
                  <div
                    className="surface"
                    style={{ padding: "14px 18px", cursor: "pointer", borderLeft: `3px solid hsl(${cat.hue})`, transition: "border-color 200ms, background 200ms" }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "hsl(228,20%,12%)"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "hsl(228,20%,10%)"; }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: hasPct ? 10 : 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                        <Icon style={{ width: 13, height: 13, color: `hsl(${cat.hue})`, flexShrink: 0 }} />
                        <p style={{ fontFamily: "'Sora',sans-serif", fontWeight: 600, fontSize: 14, color: "hsl(220,18%,90%)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {item.title}
                        </p>
                      </div>
                      {hasPct && (
                        <div style={{ flexShrink: 0, textAlign: "right" }}>
                          <span style={{ fontFamily: "'Sora',sans-serif", fontWeight: 700, fontSize: 13, color: `hsl(${cat.hue})` }}>{item.currentEpisode}</span>
                          <span style={{ fontSize: 12, color: "hsl(220,12%,35%)" }}>/{item.totalEpisodes} ep</span>
                        </div>
                      )}
                    </div>
                    {pct !== null && (
                      <div style={{ height: 3, borderRadius: 99, background: "hsla(255,100%,100%,0.05)", overflow: "hidden" }}>
                        <div style={{ height: "100%", borderRadius: 99, background: `linear-gradient(90deg, hsla(${cat.hue},0.5), hsl(${cat.hue}))`, width: `${pct}%`, transition: "width 600ms ease" }} />
                      </div>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Achievements ── */}
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <Trophy style={{ width: 13, height: 13, color: "hsl(40,85%,62%)" }} />
          <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "hsl(220,12%,32%)" }}>Pencapaian</p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: 8 }}>
          {ACHIEVEMENTS.map(a => {
            const unlocked = a.req(totalAll, totalDone, streak, hasTen);
            return (
              <div
                key={a.id}
                className="surface"
                title={a.desc}
                style={{
                  padding: "12px 14px",
                  opacity: unlocked ? 1 : 0.35,
                  filter: unlocked ? "none" : "grayscale(1)",
                  transition: "opacity 300ms",
                }}
              >
                <div style={{ fontSize: 22, marginBottom: 6 }}>{a.icon}</div>
                <p style={{ fontSize: 12, fontWeight: 600, color: "hsl(220,18%,82%)", marginBottom: 2 }}>{a.label}</p>
                <p style={{ fontSize: 11, color: "hsl(220,12%,38%)" }}>{a.desc}</p>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
