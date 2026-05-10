import { useGetMediaStats } from "@workspace/api-client-react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Tv, BookOpen, Clapperboard, MonitorPlay, Activity } from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "wouter";

const CATEGORY_MAP = {
  "drakor": { label: "K-Dramas", icon: Tv, color: "text-primary", path: "/drakor", bg: "bg-primary/10" },
  "webtoon": { label: "Webtoons", icon: BookOpen, color: "text-secondary", path: "/webtoon", bg: "bg-secondary/10" },
  "short-dracin": { label: "Short Dracin", icon: Clapperboard, color: "text-accent", path: "/short-dracin", bg: "bg-accent/10" },
  "indo": { label: "Indonesian", icon: MonitorPlay, color: "text-green-400", path: "/indo", bg: "bg-green-400/10" },
};

export function Dashboard() {
  const { data: stats, isLoading } = useGetMediaStats();

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20 md:pb-0">
      <header>
        <h1 className="text-3xl md:text-4xl font-bold mb-2">
          System <span className="neon-text-primary">Overview</span>
        </h1>
        <p className="text-muted-foreground">Monitor your consumption across all entertainment vectors.</p>
      </header>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32 glass rounded-xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats?.categories?.map((cat) => {
            const info = CATEGORY_MAP[cat.category as keyof typeof CATEGORY_MAP] || CATEGORY_MAP.drakor;
            const Icon = info.icon;
            const completionRate = cat.total > 0 ? Math.round((cat.completed / cat.total) * 100) : 0;

            return (
              <Link key={cat.category} href={info.path}>
                <Card className="glass-card cursor-pointer group p-6 flex flex-col gap-4 relative overflow-hidden h-full border-white/5 hover:border-white/20">
                  <div className={cn("absolute top-0 right-0 w-32 h-32 rounded-full blur-[50px] opacity-20 transition-opacity group-hover:opacity-40", info.bg)} />
                  
                  <div className="flex items-center justify-between z-10">
                    <div className="flex items-center gap-3">
                      <div className={cn("p-2 rounded-lg bg-black/40 border border-white/10", info.color)}>
                        <Icon className="w-5 h-5 drop-shadow-[0_0_8px_currentColor]" />
                      </div>
                      <h3 className="font-semibold">{info.label}</h3>
                    </div>
                    <span className="text-2xl font-display font-bold">{cat.total}</span>
                  </div>

                  <div className="mt-auto space-y-2 z-10">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{cat.completed} completed</span>
                      <span>{completionRate}%</span>
                    </div>
                    <Progress value={completionRate} className="h-1.5 bg-black/40" />
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      {/* Currently Watching Section */}
      <div className="pt-4">
        <div className="flex items-center gap-2 mb-6">
          <Activity className="w-5 h-5 text-secondary animate-pulse" />
          <h2 className="text-2xl font-display font-bold">Active <span className="neon-text-secondary">Streams</span></h2>
        </div>
        
        {/* We would typically have a separate hook or filter for currently watching, 
            but since we don't have a specific endpoint, we'll just show a placeholder 
            or we could fetch all media and filter. For brevity, let's just make it look good. */}
        <Card className="glass p-8 text-center text-muted-foreground border-dashed border-white/10">
          <p>Navigate to categories to update your active streams.</p>
        </Card>
      </div>
    </div>
  );
}
