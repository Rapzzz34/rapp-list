import {
  useGetMediaStats, useListMedia,
  getGetMediaStatsQueryKey, getListMediaQueryKey,
} from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Tv, BookOpen, Clapperboard, MonitorPlay } from "lucide-react";
import { Link } from "wouter";

const CATS = {
  drakor:        { label: "K-Dramas",     icon: Tv,           cls: "cat-drakor",       path: "/drakor" },
  webtoon:       { label: "Webtoons",     icon: BookOpen,     cls: "cat-webtoon",      path: "/webtoon" },
  "short-dracin":{ label: "Short Dracin", icon: Clapperboard, cls: "cat-short-dracin", path: "/short-dracin" },
  indo:          { label: "Indo",         icon: MonitorPlay,  cls: "cat-indo",         path: "/indo" },
} as const;

export function Dashboard() {
  const { data: stats, isLoading } = useGetMediaStats({
    query: { queryKey: getGetMediaStatsQueryKey() },
  });
  const { data: watching = [], isLoading: loadW } = useListMedia(
    { status: "watching" },
    { query: { queryKey: getListMediaQueryKey({ status: "watching" }) } }
  );

  const totalAll = stats?.totalAll ?? 0;

  return (
    <div className="pb-20 md:pb-0" style={{ display: "flex", flexDirection: "column", gap: 36 }}>

      {/* ── Header ── */}
      <div>
        <h1 style={{ fontFamily: "'Sora',sans-serif", fontWeight: 800, fontSize: 32, letterSpacing: "-0.5px", color: "hsl(220,18%,91%)", marginBottom: 6 }}>
          Dashboard<span className="glow-text">.</span>
        </h1>
        <p style={{ fontSize: 14, color: "hsl(220,12%,45%)" }}>
          {totalAll > 0 ? `${totalAll} titles tracked across all categories.` : "Start adding titles to your list."}
        </p>
      </div>

      {/* ── Category cards ── */}
      <div>
        <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "hsl(220,12%,35%)", marginBottom: 14 }}>
          Categories
        </p>

        {isLoading ? (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {[1,2,3,4].map(i => <Skeleton key={i} className="h-28 rounded-xl bg-muted/50" />)}
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
            {(Object.keys(CATS) as (keyof typeof CATS)[]).map(key => {
              const cat = CATS[key];
              const Icon = cat.icon;
              const row = stats?.categories?.find(c => c.category === key);
              const total     = row?.total ?? 0;
              const completed = row?.completed ?? 0;
              const watching2 = row?.watching ?? 0;
              const planned   = row?.planToWatch ?? 0;
              const pct       = total > 0 ? Math.round((completed / total) * 100) : 0;

              return (
                <Link key={key} href={cat.path} style={{ textDecoration: "none" }}>
                  <div
                    className={`surface ${cat.cls}`}
                    style={{
                      padding: "18px 20px",
                      cursor: "pointer",
                      position: "relative",
                      overflow: "hidden",
                      transition: "border-color 200ms",
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLElement).style.borderColor = `hsla(var(--cat),0.5)`;
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLElement).style.borderColor = `hsl(228,18%,16%)`;
                    }}
                  >
                    {/* glow blob */}
                    <div style={{
                      position: "absolute", top: -20, right: -20,
                      width: 80, height: 80, borderRadius: "50%",
                      background: `hsla(var(--cat),0.12)`,
                      filter: "blur(24px)", pointerEvents: "none",
                    }} />

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14, position: "relative" }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: 8,
                        background: `hsla(var(--cat),0.12)`,
                        border: `1px solid hsla(var(--cat),0.25)`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        <Icon className="w-4 h-4" style={{ color: `hsl(var(--cat))` }} />
                      </div>
                      <span style={{ fontFamily: "'Sora',sans-serif", fontWeight: 800, fontSize: 28, color: "hsl(220,18%,91%)", lineHeight: 1 }}>
                        {total}
                      </span>
                    </div>

                    <p style={{ fontFamily: "'Sora',sans-serif", fontWeight: 600, fontSize: 13, color: "hsl(220,18%,82%)", marginBottom: 10, position: "relative" }}>
                      {cat.label}
                    </p>

                    {/* progress bar */}
                    <div style={{ height: 3, borderRadius: 99, background: "hsla(255,100%,100%,0.06)", overflow: "hidden", marginBottom: 8, position: "relative" }}>
                      <div style={{
                        height: "100%", borderRadius: 99,
                        background: `linear-gradient(90deg, hsla(var(--cat),0.6), hsl(var(--cat)))`,
                        width: `${pct}%`,
                        transition: "width 600ms ease",
                      }} />
                    </div>

                    <div style={{ display: "flex", gap: 10, fontSize: 11, color: "hsl(220,12%,40%)" }}>
                      <span>{completed} done</span>
                      {watching2 > 0 && <><span>·</span><span>{watching2} watching</span></>}
                      {planned > 0   && <><span>·</span><span>{planned} planned</span></>}
                      <span style={{ marginLeft: "auto" }}>{pct}%</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Currently Watching ── */}
      <div>
        <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "hsl(220,12%,35%)", marginBottom: 14 }}>
          Currently Watching
        </p>

        {loadW ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {[1,2,3].map(i => <Skeleton key={i} className="h-14 rounded-lg bg-muted/50" />)}
          </div>
        ) : watching.length === 0 ? (
          <div className="surface" style={{ padding: "32px 24px", textAlign: "center" }}>
            <p style={{ fontSize: 14, color: "hsl(220,12%,40%)" }}>Nothing in your watchlist yet.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {watching.slice(0, 10).map(item => {
              const cat = CATS[item.category as keyof typeof CATS] ?? CATS.drakor;
              const Icon = cat.icon;
              const pct = item.totalEpisodes && item.currentEpisode != null
                ? Math.round((item.currentEpisode / item.totalEpisodes) * 100) : null;

              return (
                <Link key={item.id} href={cat.path} style={{ textDecoration: "none" }}>
                  <div
                    className={`surface-sm ${cat.cls}`}
                    style={{
                      padding: "12px 16px", cursor: "pointer",
                      display: "flex", alignItems: "center", gap: 12,
                      transition: "border-color 200ms",
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = `hsla(var(--cat),0.4)`; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = `hsl(228,18%,16%)`; }}
                  >
                    <Icon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: `hsl(var(--cat))` }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 500, color: "hsl(220,18%,88%)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginBottom: pct !== null ? 6 : 0 }}>
                        {item.title}
                      </p>
                      {pct !== null && (
                        <div style={{ height: 2, borderRadius: 99, background: "hsla(255,100%,100%,0.06)", overflow: "hidden" }}>
                          <div style={{
                            height: "100%", borderRadius: 99,
                            background: `hsl(var(--cat))`,
                            opacity: 0.7, width: `${pct}%`,
                          }} />
                        </div>
                      )}
                    </div>
                    {item.currentEpisode != null && item.totalEpisodes && (
                      <span style={{ fontSize: 12, color: "hsl(220,12%,40%)", flexShrink: 0, fontVariantNumeric: "tabular-nums" }}>
                        {item.currentEpisode}/{item.totalEpisodes}
                      </span>
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
