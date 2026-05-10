import { useGetDetailedStats, getGetDetailedStatsQueryKey } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Flame, Tv, Clock, Star } from "lucide-react";

const GENRE_COLORS = [
  "hsl(252,70%,68%)", "hsl(186,80%,52%)", "hsl(330,70%,60%)",
  "hsl(38,85%,55%)",  "hsl(155,60%,50%)", "hsl(214,80%,62%)",
  "hsl(280,65%,60%)", "hsl(10,70%,60%)",  "hsl(60,70%,55%)",
  "hsl(190,75%,50%)", "hsl(350,65%,60%)", "hsl(120,55%,50%)",
];

function StatCard({ label, value, sub, icon: Icon, color }: {
  label: string; value: string | number; sub?: string;
  icon: React.ElementType; color: string;
}) {
  return (
    <div className="surface" style={{ padding: "14px 16px", display: "flex", alignItems: "flex-start", gap: 10 }}>
      <div style={{
        width: 32, height: 32, borderRadius: 9, flexShrink: 0,
        background: `hsla(${color},0.12)`, border: `1px solid hsla(${color},0.25)`,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <Icon style={{ width: 14, height: 14, color: `hsl(${color})` }} />
      </div>
      <div className="min-w-0">
        <p style={{ fontSize: 10, fontWeight: 500, color: "hsl(220,12%,38%)", textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</p>
        <p className="text-lg sm:text-xl" style={{ fontFamily: "'Sora',sans-serif", fontWeight: 800, color: `hsl(${color})`, lineHeight: 1.15, wordBreak: "break-word" }}>{value}</p>
        {sub && <p style={{ fontSize: 10, color: "hsl(220,12%,35%)", marginTop: 2, lineHeight: 1.3 }}>{sub}</p>}
      </div>
    </div>
  );
}

const MONTH_NAMES: Record<string, string> = {
  "01": "Jan", "02": "Feb", "03": "Mar", "04": "Apr",
  "05": "Mei", "06": "Jun", "07": "Jul", "08": "Agu",
  "09": "Sep", "10": "Okt", "11": "Nov", "12": "Des",
};

export function StatsPage() {
  const { data, isLoading } = useGetDetailedStats({
    query: { queryKey: getGetDetailedStatsQueryKey() },
  });

  const monthly = (data?.monthly ?? []).map(m => ({
    ...m,
    label: MONTH_NAMES[m.month.slice(5)] ?? m.month.slice(5),
  }));

  const genres = data?.genres ?? [];
  const maxGenreCount = genres[0]?.count ?? 1;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }} className="pb-20 md:pb-0">
      <div>
        <h1 style={{ fontFamily: "'Sora',sans-serif", fontWeight: 800, fontSize: 28, letterSpacing: "-0.5px", color: "hsl(220,18%,91%)", marginBottom: 4 }}>
          Statistik<span className="glow-text">.</span>
        </h1>
        <p style={{ fontSize: 13, color: "hsl(220,12%,40%)" }}>Rekap perjalanan tontonan kamu.</p>
      </div>

      {/* ── Stat cards ── */}
      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-24 rounded-xl bg-muted/40" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
          <StatCard
            label="Streak"
            value={`${data?.streak ?? 0} hari`}
            sub="berturut-turut aktif"
            icon={Flame}
            color="38,85%,58%"
          />
          <StatCard
            label="Total Episode"
            value={data?.totalEpisodes ?? 0}
            sub="episode ditonton"
            icon={Tv}
            color="252,70%,70%"
          />
          <StatCard
            label="Est. Jam"
            value={`${data?.estimatedHours ?? 0} jam`}
            sub="≈45 menit per episode"
            icon={Clock}
            color="186,80%,52%"
          />
          <StatCard
            label="Avg Rating"
            value={data?.avgRating ? data.avgRating.toFixed(1) : "—"}
            sub="rata-rata dari semua rating"
            icon={Star}
            color="40,85%,62%"
          />
        </div>
      )}

      {/* ── Monthly completions chart ── */}
      <div className="surface" style={{ padding: "20px 20px 12px" }}>
        <p style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "hsl(220,12%,40%)", marginBottom: 16 }}>
          Judul Selesai per Bulan (12 Bulan Terakhir)
        </p>
        {isLoading ? (
          <Skeleton className="h-40 rounded-lg bg-muted/40" />
        ) : monthly.length === 0 ? (
          <div style={{ height: 120, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <p style={{ fontSize: 13, color: "hsl(220,12%,35%)" }}>Belum ada data selesai.</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={monthly} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: "hsl(220,12%,42%)", fontFamily: "Inter" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 11, fill: "hsl(220,12%,42%)", fontFamily: "Inter" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  background: "hsl(228,22%,9%)", border: "1px solid hsl(228,18%,18%)",
                  borderRadius: 8, fontSize: 12, color: "hsl(220,18%,88%)",
                }}
                cursor={{ fill: "hsla(252,70%,65%,0.06)" }}
                formatter={(v: number) => [`${v} selesai`, ""]}
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={36}>
                {monthly.map((_, i) => (
                  <Cell key={i} fill="hsl(252,70%,62%)" fillOpacity={0.8} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ── Genre distribution ── */}
      <div className="surface" style={{ padding: "20px" }}>
        <p style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "hsl(220,12%,40%)", marginBottom: 16 }}>
          Genre Terbanyak
        </p>
        {isLoading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[1,2,3,4].map(i => <Skeleton key={i} className="h-6 rounded bg-muted/40" />)}
          </div>
        ) : genres.length === 0 ? (
          <p style={{ fontSize: 13, color: "hsl(220,12%,35%)" }}>Belum ada data genre.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {genres.slice(0, 10).map((g, i) => (
              <div key={g.genre} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 12, color: "hsl(220,12%,52%)", width: 90, flexShrink: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {g.genre}
                </span>
                <div style={{ flex: 1, height: 8, borderRadius: 99, background: "hsla(255,100%,100%,0.05)", overflow: "hidden" }}>
                  <div style={{
                    height: "100%", borderRadius: 99,
                    background: GENRE_COLORS[i % GENRE_COLORS.length],
                    width: `${Math.round((g.count / maxGenreCount) * 100)}%`,
                    transition: "width 600ms ease",
                  }} />
                </div>
                <span style={{ fontSize: 12, fontFamily: "'Sora',sans-serif", fontWeight: 700, color: GENRE_COLORS[i % GENRE_COLORS.length], width: 24, textAlign: "right", flexShrink: 0 }}>
                  {g.count}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
