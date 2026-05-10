import { Link, useLocation } from "wouter";
import { Tv, BookOpen, Clapperboard, MonitorPlay, LayoutDashboard } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { path: "/", label: "Dashboard", icon: LayoutDashboard },
  { path: "/drakor", label: "K-Dramas", icon: Tv },
  { path: "/webtoon", label: "Webtoons", icon: BookOpen },
  { path: "/short-dracin", label: "Short Dracin", icon: Clapperboard },
  { path: "/indo", label: "Indo", icon: MonitorPlay },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  return (
    <div className="flex h-[100dvh] w-full overflow-hidden bg-background">
      {/* Sidebar */}
      <aside className="w-56 border-r border-border flex-shrink-0 hidden md:flex flex-col bg-[hsl(224,20%,7%)]">
        <div className="h-14 flex items-center px-5 border-b border-border">
          <Link href="/" className="flex items-center gap-2.5 cursor-pointer" data-testid="link-home">
            <div className="w-7 h-7 rounded-md bg-primary/20 flex items-center justify-center border border-primary/30">
              <Tv className="w-4 h-4 text-primary" />
            </div>
            <span className="font-display font-semibold text-base text-foreground tracking-wide">
              NeonWatch
            </span>
          </Link>
        </div>

        <nav className="flex-1 py-4 px-3 flex flex-col gap-0.5">
          {NAV_ITEMS.map((item) => {
            const isActive = location === item.path;
            const Icon = item.icon;

            return (
              <Link
                key={item.path}
                href={item.path}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md transition-colors duration-150 text-sm font-medium",
                  isActive
                    ? "bg-primary/12 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-white/4"
                )}
                data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="px-4 py-4 border-t border-border">
          <p className="text-xs text-muted-foreground">Your personal list tracker</p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 relative overflow-y-auto overflow-x-hidden">
        <div className="min-h-full p-5 md:p-8 max-w-5xl mx-auto">
          {children}
        </div>
      </main>

      {/* Mobile Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-14 bg-[hsl(224,20%,7%)] border-t border-border flex items-center justify-around px-1 z-50">
        {NAV_ITEMS.map((item) => {
          const isActive = location === item.path;
          const Icon = item.icon;

          return (
            <Link
              key={item.path}
              href={item.path}
              className={cn(
                "flex flex-col items-center justify-center w-full h-full gap-1",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
