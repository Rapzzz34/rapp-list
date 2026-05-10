import { useGetMediaStats, useListMedia, getGetMediaStatsQueryKey, getListMediaQueryKey } from "@workspace/api-client-react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Tv, BookOpen, Clapperboard, MonitorPlay, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "wouter";

const CATEGORY_MAP = {
  "drakor":      { label: "K-Dramas",    icon: Tv,          path: "/drakor",      color: "text-violet-400",  bar: "bg-violet-500" },
  "webtoon":     { label: "Webtoons",    icon: BookOpen,    path: "/webtoon",     color: "text-sky-400",     bar: "bg-sky-500" },
  "short-dracin":{ label: "Short Dracin",icon: Clapperboard,path: "/short-dracin",color: "text-emerald-400", bar: "bg-emerald-500" },
  "indo":        { label: "Indo",        icon: MonitorPlay, path: "/indo",        color: "text-amber-400",   bar: "bg-amber-500" },
};

export function Dashboard() {
  const { data: stats, isLoading } = useGetMediaStats({
    query: { queryKey: getGetMediaStatsQueryKey() },
  });
  const { data: allMedia = [] } = useListMedia(
    { status: "watching" },
    { query: { queryKey: getListMediaQueryKey({ status: "watching" }) } }
  );

  const watching = allMedia.slice(0, 8);

  return (
    <div className="space-y-8 animate-in fade-in duration-300 pb-20 md:pb-0">
      <header className="pt-1">
        <h1 className="text-2xl font-display font-semibold text-foreground mb-1">
          Overview
        </h1>
        <p className="text-sm text-muted-foreground">Your entertainment tracker across all categories.</p>
      </header>

      {/* Category cards */}
      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-28 rounded-lg bg-muted" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {stats?.categories?.map((cat) => {
            const info = CATEGORY_MAP[cat.category as keyof typeof CATEGORY_MAP] ?? CATEGORY_MAP.drakor;
            const Icon = info.icon;
            const pct = cat.total > 0 ? Math.round((cat.completed / cat.total) * 100) : 0;

            return (
              <Link key={cat.category} href={info.path}>
                <Card
                  className="surface surface-hover cursor-pointer p-4 flex flex-col gap-3 h-full"
                  data-testid={`card-category-${cat.category}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className={cn("w-4 h-4", info.color)} />
                      <span className="text-sm font-medium text-foreground">{info.label}</span>
                    </div>
                    <span className="text-xl font-display font-bold text-foreground">{cat.total}</span>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{cat.completed} done</span>
                      <span>{pct}%</span>
                    </div>
                    <div className="h-1 rounded-full bg-muted overflow-hidden">
                      <div
                        className={cn("h-full rounded-full transition-all duration-500", info.bar, "opacity-70")}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="flex gap-2 text-xs text-muted-foreground">
                      <span>{cat.watching} watching</span>
                      <span>·</span>
                      <span>{cat.planToWatch} planned</span>
                    </div>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      {/* Currently Watching */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Play className="w-4 h-4 text-emerald-400" />
          <h2 className="text-base font-display font-semibold text-foreground">Currently Watching</h2>
        </div>

        {watching.length === 0 ? (
          <Card className="surface p-8 text-center">
            <p className="text-sm text-muted-foreground">Nothing on your watchlist yet.</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {watching.map((item) => {
              const info = CATEGORY_MAP[item.category as keyof typeof CATEGORY_MAP] ?? CATEGORY_MAP.drakor;
              const Icon = info.icon;
              const pct = item.totalEpisodes && item.currentEpisode != null
                ? Math.round((item.currentEpisode / item.totalEpisodes) * 100)
                : null;

              return (
                <Link key={item.id} href={info.path}>
                  <Card
                    className="surface surface-hover cursor-pointer p-3 flex items-center gap-3"
                    data-testid={`card-watching-${item.id}`}
                  >
                    <Icon className={cn("w-4 h-4 flex-shrink-0", info.color)} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{item.title}</p>
                      {pct !== null && (
                        <div className="mt-1 h-0.5 rounded-full bg-muted overflow-hidden">
                          <div
                            className={cn("h-full rounded-full", info.bar, "opacity-60")}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      )}
                    </div>
                    {item.currentEpisode != null && item.totalEpisodes && (
                      <span className="text-xs text-muted-foreground flex-shrink-0">
                        {item.currentEpisode}/{item.totalEpisodes}
                      </span>
                    )}
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
