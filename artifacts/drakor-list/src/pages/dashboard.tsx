import { useGetMediaStats, useListMedia, getGetMediaStatsQueryKey, getListMediaQueryKey } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Tv, BookOpen, Clapperboard, MonitorPlay, Play, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "wouter";

const CATEGORY_MAP = {
  "drakor":       { label: "K-Dramas",    icon: Tv,           path: "/drakor",       glow: "hsla(185,80%,52%,0.18)",  bar: "from-cyan-500 to-cyan-400",   text: "text-cyan-400" },
  "webtoon":      { label: "Webtoons",    icon: BookOpen,     path: "/webtoon",      glow: "hsla(262,65%,62%,0.18)", bar: "from-violet-500 to-violet-400", text: "text-violet-400" },
  "short-dracin": { label: "Short Dracin",icon: Clapperboard, path: "/short-dracin", glow: "hsla(340,70%,55%,0.16)", bar: "from-pink-500 to-pink-400",    text: "text-pink-400" },
  "indo":         { label: "Indo",        icon: MonitorPlay,  path: "/indo",         glow: "hsla(38,90%,52%,0.16)",  bar: "from-amber-500 to-amber-400",  text: "text-amber-400" },
};

export function Dashboard() {
  const { data: stats, isLoading } = useGetMediaStats({
    query: { queryKey: getGetMediaStatsQueryKey() },
  });
  const { data: allMedia = [], isLoading: loadingWatching } = useListMedia(
    { status: "watching" },
    { query: { queryKey: getListMediaQueryKey({ status: "watching" }) } }
  );

  return (
    <div className="space-y-10 animate-in fade-in duration-400 pb-20 md:pb-0">
      {/* Header */}
      <header className="pt-1">
        <h1 className="text-3xl font-display font-bold text-foreground mb-1">
          Overview<span className="neon-text">.</span>
        </h1>
        <p className="text-sm text-muted-foreground">Track what you watch across every category.</p>
      </header>

      {/* Category stat cards */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-4 h-4 text-primary" />
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Categories</h2>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[1,2,3,4].map(i => <Skeleton key={i} className="h-36 rounded-lg bg-muted/50" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {stats?.categories?.map((cat) => {
              const info = CATEGORY_MAP[cat.category as keyof typeof CATEGORY_MAP] ?? CATEGORY_MAP.drakor;
              const Icon = info.icon;
              const pct = cat.total > 0 ? Math.round((cat.completed / cat.total) * 100) : 0;

              return (
                <Link key={cat.category} href={info.path}>
                  <div
                    className="glass-card p-5 flex flex-col gap-4 cursor-pointer relative overflow-hidden"
                    data-testid={`card-category-${cat.category}`}
                  >
                    {/* Ambient glow blob */}
                    <div
                      className="absolute -top-4 -right-4 w-20 h-20 rounded-full blur-2xl pointer-events-none"
                      style={{ background: info.glow }}
                    />

                    <div className="flex items-start justify-between relative z-10">
                      <div className={cn("p-1.5 rounded-md border border-white/8 bg-black/20", info.text)}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className="text-2xl font-display font-bold text-foreground">{cat.total}</span>
                    </div>

                    <div className="relative z-10">
                      <p className="text-sm font-medium text-foreground mb-2.5">{info.label}</p>
                      {/* Progress bar */}
                      <div className="h-1 rounded-full bg-white/6 overflow-hidden mb-1.5">
                        <div
                          className={cn("h-full rounded-full bg-gradient-to-r opacity-80", info.bar)}
                          style={{ width: `${pct}%`, transition: "width 600ms ease" }}
                        />
                      </div>
                      <div className="flex justify-between text-[11px] text-muted-foreground">
                        <span>{cat.completed} done · {cat.watching} watching</span>
                        <span>{pct}%</span>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* Currently Watching */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Play className="w-4 h-4 text-primary" style={{ filter: "drop-shadow(0 0 6px hsl(185,80%,52%))" }} />
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Currently Watching</h2>
        </div>

        {loadingWatching ? (
          <div className="space-y-2">
            {[1,2,3].map(i => <Skeleton key={i} className="h-12 rounded-lg bg-muted/50" />)}
          </div>
        ) : allMedia.length === 0 ? (
          <div className="glass-card p-8 text-center">
            <p className="text-sm text-muted-foreground">Nothing in your watchlist yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {allMedia.slice(0, 8).map((item) => {
              const info = CATEGORY_MAP[item.category as keyof typeof CATEGORY_MAP] ?? CATEGORY_MAP.drakor;
              const Icon = info.icon;
              const pct = item.totalEpisodes && item.currentEpisode != null
                ? Math.round((item.currentEpisode / item.totalEpisodes) * 100)
                : null;

              return (
                <Link key={item.id} href={info.path}>
                  <div
                    className="glass-card px-4 py-3 flex items-center gap-3 cursor-pointer"
                    data-testid={`card-watching-${item.id}`}
                  >
                    <Icon className={cn("w-3.5 h-3.5 flex-shrink-0", info.text)} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{item.title}</p>
                      {pct !== null && (
                        <div className="mt-1.5 h-0.5 rounded-full bg-white/6 overflow-hidden">
                          <div
                            className={cn("h-full rounded-full bg-gradient-to-r opacity-70", info.bar)}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      )}
                    </div>
                    {item.currentEpisode != null && item.totalEpisodes && (
                      <span className="text-xs text-muted-foreground tabular-nums flex-shrink-0">
                        {item.currentEpisode}/{item.totalEpisodes}
                      </span>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
