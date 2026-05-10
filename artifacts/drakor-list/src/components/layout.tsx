import { Link, useLocation } from "wouter";
import { Tv, BookOpen, Clapperboard, MonitorPlay, LayoutDashboard } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { path: "/",            label: "Dashboard",   icon: LayoutDashboard },
  { path: "/drakor",      label: "K-Dramas",    icon: Tv },
  { path: "/webtoon",     label: "Webtoons",    icon: BookOpen },
  { path: "/short-dracin",label: "Short Dracin",icon: Clapperboard },
  { path: "/indo",        label: "Indo",        icon: MonitorPlay },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  return (
    <div className="flex h-[100dvh] w-full overflow-hidden bg-background">
      {/* Sidebar */}
      <aside className="w-56 flex-shrink-0 hidden md:flex flex-col sidebar-glass">
        {/* Logo */}
        <div className="h-14 flex items-center px-5 border-b border-white/5">
          <Link href="/" className="flex items-center gap-2.5 cursor-pointer group" data-testid="link-home">
            <div className="w-7 h-7 rounded-md flex items-center justify-center border border-primary/30 bg-primary/10 group-hover:border-primary/50 transition-colors">
              <Tv className="w-3.5 h-3.5 text-primary" style={{ filter: "drop-shadow(0 0 6px hsl(185,80%,52%))" }} />
            </div>
            <span className="font-display font-bold text-[15px] tracking-wide text-foreground">
              Neon<span className="neon-text">Watch</span>
            </span>
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 px-3 flex flex-col gap-0.5">
          {NAV_ITEMS.map((item) => {
            const isActive = location === item.path;
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                href={item.path}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all duration-150",
                  isActive
                    ? "nav-active pl-[10px]"
                    : "text-muted-foreground hover:text-foreground hover:bg-white/4 border-l-2 border-transparent"
                )}
                data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
              >
                <Icon className={cn("w-4 h-4 flex-shrink-0", isActive && "text-primary")} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="px-5 py-4 border-t border-white/5">
          <p className="text-[11px] text-muted-foreground/60 tracking-wide uppercase font-medium">Personal tracker</p>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 relative overflow-y-auto overflow-x-hidden">
        <div className="min-h-full p-5 md:p-8 max-w-4xl mx-auto">
          {children}
        </div>
      </main>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-14 sidebar-glass border-t border-white/5 flex items-center justify-around px-1 z-50">
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
              <Icon className="w-5 h-5" style={isActive ? { filter: "drop-shadow(0 0 6px hsl(185,80%,52%))" } : undefined} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
