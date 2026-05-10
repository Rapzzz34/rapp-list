import { Link, useLocation } from "wouter";
import { Tv, BookOpen, Clapperboard, MonitorPlay, LayoutDashboard, BarChart2, Search } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { path: "/",             label: "Dashboard",    icon: LayoutDashboard },
  { path: "/drakor",       label: "K-Dramas",     icon: Tv },
  { path: "/webtoon",      label: "Webtoons",     icon: BookOpen },
  { path: "/short-dracin", label: "Short Dracin", icon: Clapperboard },
  { path: "/indo",         label: "Indo",         icon: MonitorPlay },
  { path: "/stats",        label: "Statistik",    icon: BarChart2 },
  { path: "/search",       label: "Cari",         icon: Search },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  return (
    <div className="flex h-[100dvh] w-full overflow-hidden bg-background">
      {/* ── Sidebar ── */}
      <aside
        className="w-52 flex-shrink-0 hidden md:flex flex-col"
        style={{ background: "hsl(228,22%,6%)", borderRight: "1px solid hsl(228,18%,13%)" }}
      >
        {/* Logo */}
        <div className="h-14 flex items-center px-5" style={{ borderBottom: "1px solid hsl(228,18%,13%)" }}>
          <Link href="/" data-testid="link-home" style={{ textDecoration: "none" }}>
            <div className="flex items-center gap-2.5">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ background: "hsla(252,70%,65%,0.12)", border: "1px solid hsla(252,70%,65%,0.3)" }}
              >
                <Tv className="w-3.5 h-3.5" style={{ color: "hsl(252,70%,72%)" }} />
              </div>
              <span style={{ fontFamily: "'Sora', sans-serif", fontWeight: 700, fontSize: 15, letterSpacing: "-0.3px", color: "hsl(220,18%,91%)" }}>
                Neon<span className="glow-text">Watch</span>
              </span>
            </div>
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 flex flex-col gap-0.5">
          {NAV_ITEMS.map(({ path, label, icon: Icon }) => {
            const active = location === path;
            return (
              <Link key={path} href={path} data-testid={`nav-${label.toLowerCase().replace(/\s+/g, "-")}`} style={{ textDecoration: "none" }}>
                <div className={cn("nav-item", active && "nav-item-active")}>
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  {label}
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="px-5 py-4" style={{ borderTop: "1px solid hsl(228,18%,13%)" }}>
          <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", color: "hsl(220,12%,30%)", textTransform: "uppercase" }}>
            Personal Tracker
          </p>
        </div>
      </aside>

      {/* ── Page ── */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden">
        <div className="min-h-full max-w-3xl mx-auto px-4 sm:px-6 md:px-10 py-5 sm:py-7 md:py-8">
          {children}
        </div>
      </main>

      {/* ── Mobile bottom nav (exclude Cari — accessible via sidebar on desktop) ── */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 flex items-center z-50"
        style={{ height: 54, background: "hsl(228,22%,6%)", borderTop: "1px solid hsl(228,18%,13%)" }}
      >
        {NAV_ITEMS.filter(n => n.path !== "/search").map(({ path, label, icon: Icon }) => {
          const active = location === path;
          // Short labels for cramped bottom nav
          const shortLabel: Record<string, string> = {
            "Dashboard": "Home",
            "K-Dramas": "Dramas",
            "Webtoons": "Webtoon",
            "Short Dracin": "Dracin",
            "Indo": "Indo",
            "Statistik": "Stats",
            "Cari": "Cari",
          };
          return (
            <Link key={path} href={path} style={{ textDecoration: "none", flex: 1, minWidth: 0 }}>
              <div
                className="flex flex-col items-center justify-center h-full gap-0.5"
                style={{ color: active ? "hsl(252,70%,72%)" : "hsl(220,12%,40%)" }}
              >
                <Icon className="w-[18px] h-[18px]" />
                <span style={{ fontSize: 9, fontWeight: 500, lineHeight: 1, textAlign: "center", maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {shortLabel[label] ?? label}
                </span>
              </div>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
