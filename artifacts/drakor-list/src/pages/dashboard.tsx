import {
  useGetMediaStats, useListMedia,
  getGetMediaStatsQueryKey, getListMediaQueryKey,
} from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Tv, BookOpen, Clapperboard, MonitorPlay, ArrowRight, TrendingUp, CheckCircle2, Play, Clock } from "lucide-react";
import { Link } from "wouter";

const CATS = {
  drakor:         { label: "K-Dramas",     icon: Tv,           path: "/drakor",        hue: "252,70%,65%" },
  webtoon:        { label: "Webtoons",      icon: BookOpen,     path: "/webtoon",       hue: "186,80%,52%" },
  "short-dracin": { label: "Short Dracin",  icon: Clapperboard, path: "/short-dracin",  hue: "330,70%,60%" },
  indo:           { label: "Indo",          icon: MonitorPlay,  path: "/indo",          hue: "38,85%,55%"  },
} as const;

type CatKey = keyof typeof CATS;

export function Dashboard() {
  const { data: stats, isLoading: loadStats } = useGetMediaStats({
    query: { queryKey: getGetMediaStatsQueryKey() },
  });
  const { data: watching = [], isLoading: loadW } = useListMedia(
    { status: "watching" },
    { query: { queryKey: getListMediaQueryKey({ status: "watching" }) } }
  );

  const totalAll    = stats?.totalAll ?? 0;
  const totalDone   = stats?.categories?.reduce((s, c) => s + (c.completed ?? 0), 0) ?? 0;
  const totalWatch  = stats?.categories?.reduce((s, c) => s + (c.watching  ?? 0), 0) ?? 0;
  const totalPlan   = stats?.categories?.reduce((s, c) => s + (c.planToWatch ?? 0), 0) ?? 0;
  const globalPct   = totalAll > 0 ? Math.round((totalDone / totalAll) * 100) : 0;

  return (
    <div className="pb-20 md:pb-0" style={{ display: "flex", flexDirection: "column", gap: 32 }}>

      {/* ── Header ── */}
      <div>
        <h1 style={{ fontFamily: "'Sora',sans-serif", fontWeight: 800, fontSize: 30, letterSpacing: "-0.5px", color: "hsl(220,18%,91%)", marginBottom: 4 }}>
          Dashboard<span className="glow-text">.</span>
        </h1>
        <p style={{ fontSize: 13, color: "hsl(220,12%,40%)" }}>
          Semua list tontonan kamu di satu tempat.
        </p>
      </div>

      {/* ── 4 stat pills ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
        {loadStats ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl bg-muted/40" />
          ))
        ) : (
          <>
            {[
              { label: "Total", value: totalAll,   icon: TrendingUp,    color: "220,18%,75%" },
              { label: "Nonton",value: totalWatch,  icon: Play,          color: "155,60%,55%" },
              { label: "Selesai",value: totalDone,  icon: CheckCircle2,  color: "252,70%,70%" },
              { label: "Planned",value: totalPlan,  icon: Clock,         color: "214,80%,62%" },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="surface" style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 11, fontWeight: 500, color: "hsl(220,12%,38%)", textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</span>
                  <Icon style={{ width: 13, height: 13, color: `hsl(${color})` }} />
                </div>
                <span style={{ fontFamily: "'Sora',sans-serif", fontWeight: 800, fontSize: 26, color: `hsl(${color})`, lineHeight: 1 }}>
                  {value}
                </span>
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
          <p style={{ fontSize: 11, color: "hsl(220,12%,35%)", marginTop: 8 }}>
            {totalDone} dari {totalAll} judul selesai
          </p>
        </div>
      )}

      {/* ── Category rows ── */}
      <div>
        <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "hsl(220,12%,32%)", marginBottom: 12 }}>
          Kategori
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {loadStats ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-16 rounded-xl bg-muted/40" />
            ))
          ) : (
            (Object.keys(CATS) as CatKey[]).map(key => {
              const cat = CATS[key];
              const Icon = cat.icon;
              const row  = stats?.categories?.find(c => c.category === key);
              const total     = row?.total ?? 0;
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
                    {/* Icon */}
                    <div style={{
                      flexShrink: 0, width: 36, height: 36, borderRadius: 10,
                      background: `hsla(${cat.hue},0.1)`, border: `1px solid hsla(${cat.hue},0.22)`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      <Icon style={{ width: 16, height: 16, color: `hsl(${cat.hue})` }} />
                    </div>

                    {/* Label + progress */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
                        <span style={{ fontFamily: "'Sora',sans-serif", fontWeight: 600, fontSize: 13, color: "hsl(220,18%,85%)" }}>
                          {cat.label}
                        </span>
                        <div style={{ display: "flex", gap: 10, fontSize: 12, color: "hsl(220,12%,38%)" }}>
                          {watching2 > 0 && (
                            <span style={{ color: "hsl(155,55%,52%)", fontWeight: 500 }}>▶ {watching2}</span>
                          )}
                          <span style={{ fontFamily: "'Sora',sans-serif", fontWeight: 700, color: `hsl(${cat.hue})` }}>
                            {completed}<span style={{ fontWeight: 400, color: "hsl(220,12%,32%)" }}>/{total}</span>
                          </span>
                        </div>
                      </div>
                      {/* Progress bar */}
                      <div style={{ height: 4, borderRadius: 99, background: "hsla(255,100%,100%,0.05)", overflow: "hidden" }}>
                        <div style={{
                          height: "100%", borderRadius: 99,
                          background: `linear-gradient(90deg, hsla(${cat.hue},0.6), hsl(${cat.hue}))`,
                          width: total > 0 ? `${pct}%` : "0%",
                          transition: "width 600ms ease",
                        }} />
                      </div>
                    </div>

                    {/* Arrow */}
                    <ArrowRight style={{ width: 14, height: 14, color: "hsl(220,12%,28%)", flexShrink: 0 }} />
                  </div>
                </Link>
              );
            })
          )}
        </div>
      </div>

      {/* ── Currently Watching ── */}
      <div>
        <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "hsl(220,12%,32%)", marginBottom: 12 }}>
          Sedang Ditonton
        </p>

        {loadW ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-xl bg-muted/40" />
            ))}
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
                    style={{
                      padding: "14px 18px", cursor: "pointer",
                      borderLeft: `3px solid hsl(${cat.hue})`,
                      transition: "border-color 200ms, background 200ms",
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "hsl(228,20%,12%)"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "hsl(228,20%,10%)"; }}
                  >
                    {/* Title row */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: hasPct ? 10 : 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                        <Icon style={{ width: 13, height: 13, color: `hsl(${cat.hue})`, flexShrink: 0 }} />
                        <p style={{
                          fontFamily: "'Sora',sans-serif", fontWeight: 600, fontSize: 14,
                          color: "hsl(220,18%,90%)",
                          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        }}>
                          {item.title}
                        </p>
                      </div>

                      {/* Episode counter */}
                      {hasPct && (
                        <div style={{ flexShrink: 0, textAlign: "right" }}>
                          <span style={{
                            fontFamily: "'Sora',sans-serif", fontWeight: 700, fontSize: 13,
                            color: `hsl(${cat.hue})`,
                          }}>
                            {item.currentEpisode}
                          </span>
                          <span style={{ fontSize: 12, color: "hsl(220,12%,35%)" }}>
                            /{item.totalEpisodes} ep
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Progress bar */}
                    {pct !== null && (
                      <div style={{ height: 3, borderRadius: 99, background: "hsla(255,100%,100%,0.05)", overflow: "hidden" }}>
                        <div style={{
                          height: "100%", borderRadius: 99,
                          background: `linear-gradient(90deg, hsla(${cat.hue},0.5), hsl(${cat.hue}))`,
                          width: `${pct}%`,
                          transition: "width 600ms ease",
                        }} />
                      </div>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
