import { useState } from "react";
import { useListMedia } from "@workspace/api-client-react";
import { Search, Tv, BookOpen, Clapperboard, MonitorPlay, CheckCircle2, Play, Clock, XCircle, Star } from "lucide-react";
import { Link } from "wouter";

const CATEGORY_LABELS: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  drakor:       { label: "K-Dramas",    icon: Tv,          color: "252,70%,65%" },
  webtoon:      { label: "Webtoons",    icon: BookOpen,    color: "186,80%,52%" },
  "short-dracin": { label: "Short Dracin", icon: Clapperboard, color: "330,70%,60%" },
  indo:         { label: "Indo",        icon: MonitorPlay, color: "38,85%,55%" },
};

const CATEGORY_PATHS: Record<string, string> = {
  drakor: "/drakor",
  webtoon: "/webtoon",
  "short-dracin": "/short-dracin",
  indo: "/indo",
};

const STATUS_ICON: Record<string, React.ElementType> = {
  "plan-to-watch": Clock,
  watching: Play,
  completed: CheckCircle2,
  dropped: XCircle,
};

const STATUS_COLOR: Record<string, string> = {
  "plan-to-watch": "hsl(214,80%,65%)",
  watching: "hsl(155,60%,60%)",
  completed: "hsl(252,70%,72%)",
  dropped: "hsl(220,10%,45%)",
};

export function SearchPage() {
  const [query, setQuery] = useState("");

  const { data: results = [], isFetching } = useListMedia(
    { search: query || undefined },
    {
      query: {
        queryKey: ["search-global", query],
        enabled: query.trim().length >= 1,
      },
    }
  );

  const grouped = results.reduce<Record<string, typeof results>>((acc, item) => {
    const cat = item.category ?? "drakor";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {});

  const totalCount = results.length;

  return (
    <div className="flex flex-col gap-5 pb-20 md:pb-0 animate-in fade-in duration-300">
      <div style={{ paddingTop: 4 }}>
        <h1 className="text-2xl sm:text-3xl" style={{ fontFamily: "'Sora',sans-serif", fontWeight: 800, letterSpacing: "-0.5px", color: "hsl(220,18%,91%)", marginBottom: 4, lineHeight: 1.15 }}>
          Cari<span style={{ color: "hsl(252,70%,70%)", textShadow: "0 0 28px hsla(252,70%,65%,0.6)" }}>.</span>
        </h1>
        <p style={{ fontSize: 13, color: "hsl(220,12%,40%)" }}>Temukan judul di semua kategori sekaligus.</p>
      </div>

      {/* Search input */}
      <div style={{ position: "relative" }}>
        <Search style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", width: 16, height: 16, color: "hsl(252,70%,60%)" }} />
        <input
          autoFocus
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Cari judul, genre..."
          style={{
            width: "100%", padding: "11px 14px 11px 42px",
            borderRadius: 12, fontSize: 14,
            background: "hsl(228,20%,10%)", border: "1px solid hsl(228,18%,20%)",
            color: "hsl(220,18%,90%)", outline: "none", fontFamily: "'Inter',sans-serif",
          }}
          onFocus={e => { e.currentTarget.style.borderColor = "hsla(252,70%,65%,0.5)"; }}
          onBlur={e => { e.currentTarget.style.borderColor = "hsl(228,18%,20%)"; }}
        />
      </div>

      {/* Results */}
      {query.trim().length >= 1 && (
        isFetching ? (
          <div style={{ textAlign: "center", padding: "40px 0", color: "hsl(220,12%,40%)", fontSize: 13 }}>
            Mencari...
          </div>
        ) : totalCount === 0 ? (
          <div className="surface" style={{ padding: "40px 24px", textAlign: "center" }}>
            <p style={{ fontSize: 14, color: "hsl(220,12%,38%)" }}>
              Tidak ada judul yang cocok dengan "<span style={{ color: "hsl(220,18%,72%)" }}>{query}</span>".
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            <p style={{ fontSize: 12, color: "hsl(220,12%,38%)" }}>
              {totalCount} hasil ditemukan
            </p>
            {Object.entries(grouped).map(([cat, catItems]) => {
              const catMeta = CATEGORY_LABELS[cat] ?? { label: cat, icon: Tv, color: "252,70%,65%" };
              const CatIcon = catMeta.icon;
              return (
                <div key={cat}>
                  {/* Category header */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                    <div style={{
                      width: 26, height: 26, borderRadius: 8, flexShrink: 0,
                      background: `hsla(${catMeta.color},0.12)`,
                      border: `1px solid hsla(${catMeta.color},0.25)`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      <CatIcon style={{ width: 12, height: 12, color: `hsl(${catMeta.color})` }} />
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 600, color: `hsl(${catMeta.color})`, letterSpacing: "0.05em", textTransform: "uppercase" }}>
                      {catMeta.label}
                    </span>
                    <span style={{ fontSize: 11, color: "hsl(220,12%,35%)" }}>{catItems.length} judul</span>
                    <Link href={CATEGORY_PATHS[cat] ?? "/"} style={{ marginLeft: "auto", fontSize: 11, color: "hsl(252,70%,62%)", textDecoration: "none" }}>
                      Lihat semua →
                    </Link>
                  </div>

                  {/* Items */}
                  <div className="flex flex-col gap-2">
                    {catItems.map(item => {
                      const StatusIcon = STATUS_ICON[item.status] ?? Clock;
                      return (
                        <div
                          key={item.id}
                          className="surface-sm"
                          style={{ padding: "10px 14px", display: "flex", alignItems: "center", gap: 12 }}
                        >
                          {/* Poster */}
                          {item.imageUrl ? (
                            <img
                              src={item.imageUrl}
                              alt={item.title}
                              style={{ width: 36, height: 50, objectFit: "cover", borderRadius: 5, border: "1px solid hsl(228,18%,18%)", flexShrink: 0 }}
                            />
                          ) : (
                            <div style={{
                              width: 36, height: 50, borderRadius: 5,
                              background: `hsla(${catMeta.color},0.08)`,
                              border: "1px solid hsl(228,18%,18%)",
                              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                            }}>
                              <CatIcon style={{ width: 14, height: 14, color: `hsl(${catMeta.color})` }} />
                            </div>
                          )}

                          {/* Info */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{
                              fontSize: 13, fontWeight: 600, fontFamily: "'Sora',sans-serif",
                              color: item.status === "dropped" ? "hsl(220,12%,38%)" : "hsl(220,18%,90%)",
                              textDecoration: item.status === "dropped" ? "line-through" : "none",
                              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                            }}>
                              {item.title}
                            </p>
                            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 3, flexWrap: "wrap" }}>
                              <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 11, color: STATUS_COLOR[item.status] ?? "hsl(220,12%,45%)" }}>
                                <StatusIcon style={{ width: 10, height: 10 }} />
                                {item.status === "plan-to-watch" ? "Mau Nonton" : item.status === "watching" ? "Nonton" : item.status === "completed" ? "Selesai" : "Dropped"}
                              </span>
                              {item.genre && (
                                <span style={{ fontSize: 11, color: "hsl(220,12%,38%)" }}>{item.genre}</span>
                              )}
                              {item.rating && (
                                <span style={{ display: "inline-flex", alignItems: "center", gap: 2, fontSize: 11, color: "hsl(40,85%,62%)", fontWeight: 600 }}>
                                  <Star style={{ width: 10, height: 10, fill: "hsl(40,85%,62%)" }} />
                                  {item.rating}
                                </span>
                              )}
                              {item.currentEpisode != null && item.totalEpisodes && (
                                <span style={{ fontSize: 11, color: "hsl(220,12%,35%)" }}>
                                  Ep {item.currentEpisode}/{item.totalEpisodes}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {/* Empty state */}
      {query.trim().length === 0 && (
        <div style={{ paddingTop: 24, textAlign: "center" }}>
          <p style={{ fontSize: 13, color: "hsl(220,12%,32%)" }}>Ketik untuk mulai mencari di semua kategori.</p>
        </div>
      )}
    </div>
  );
}
