import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListMedia, useCreateMedia, useUpdateMedia, useDeleteMedia, useListGenres,
  getListMediaQueryKey, getListGenresQueryKey, getGetMediaStatsQueryKey,
} from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Search, Plus, Pencil, Trash2, CheckCircle2, Play, Clock, XCircle, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

type Status = "plan-to-watch" | "watching" | "completed" | "dropped";

const STATUS_CONFIG: Record<Status, { label: string; badge: string; stripe: string; icon: React.ElementType }> = {
  "plan-to-watch": { label: "Plan to Watch", badge: "badge-plan",      stripe: "stripe-plan",      icon: Clock },
  watching:        { label: "Watching",       badge: "badge-watching",  stripe: "stripe-watching",  icon: Play },
  completed:       { label: "Completed",      badge: "badge-completed", stripe: "stripe-completed", icon: CheckCircle2 },
  dropped:         { label: "Dropped",        badge: "badge-dropped",   stripe: "stripe-dropped",   icon: XCircle },
};

const CYCLE: Record<Status, Status> = {
  "plan-to-watch": "watching",
  watching: "completed",
  completed: "dropped",
  dropped: "plan-to-watch",
};

const GENRES = ["Romance","Action","Comedy","Thriller","Fantasy","Slice of Life","Horror","Mystery","Sci-Fi","Drama","Historical","Crime","Sports","School","Family"];

const schema = z.object({
  title:          z.string().min(1, "Title wajib diisi"),
  genre:          z.string().optional(),
  status:         z.enum(["plan-to-watch","watching","completed","dropped"]),
  rating:         z.coerce.number().min(1).max(10).optional().or(z.literal("")),
  totalEpisodes:  z.coerce.number().min(1).optional().or(z.literal("")),
  currentEpisode: z.coerce.number().min(0).optional().or(z.literal("")),
  notes:          z.string().optional(),
});
type FormVals = z.infer<typeof schema>;

interface Item {
  id: number; title: string; category: string; genre?: string | null;
  status: string; rating?: number | null; notes?: string | null;
  totalEpisodes?: number | null; currentEpisode?: number | null; createdAt: string;
}

/* ── Form dialog ── */
function ItemDialog({ open, onOpenChange, item, category, title, onSuccess }: {
  open: boolean; onOpenChange: (v: boolean) => void;
  item: Item | null; category: string; title: string; onSuccess: () => void;
}) {
  const { toast } = useToast();
  const create = useCreateMedia();
  const update = useUpdateMedia();
  const isEdit = !!item;

  const form = useForm<FormVals>({
    resolver: zodResolver(schema),
    defaultValues: {
      title:          item?.title          ?? "",
      genre:          item?.genre          ?? "",
      status:         (item?.status as Status) ?? "plan-to-watch",
      rating:         item?.rating         ?? "",
      totalEpisodes:  item?.totalEpisodes  ?? "",
      currentEpisode: item?.currentEpisode ?? "",
      notes:          item?.notes          ?? "",
    },
  });

  async function onSubmit(v: FormVals) {
    const data = {
      title: v.title, category,
      genre:          v.genre          || undefined,
      status:         v.status,
      rating:         v.rating         === "" ? undefined : Number(v.rating),
      totalEpisodes:  v.totalEpisodes  === "" ? undefined : Number(v.totalEpisodes),
      currentEpisode: v.currentEpisode === "" ? undefined : Number(v.currentEpisode),
      notes:          v.notes          || undefined,
    };
    try {
      if (isEdit) { await update.mutateAsync({ id: item.id, data }); toast({ title: "Tersimpan" }); }
      else        { await create.mutateAsync({ data });               toast({ title: "Ditambahkan!" }); }
      onSuccess(); onOpenChange(false);
    } catch { toast({ title: "Gagal menyimpan", variant: "destructive" }); }
  }

  const inp = {
    style: {
      width: "100%", padding: "8px 12px", borderRadius: 8,
      background: "hsl(228,18%,13%)", border: "1px solid hsl(228,18%,20%)",
      color: "hsl(220,18%,88%)", fontSize: 14, outline: "none",
      fontFamily: "'Inter',sans-serif",
    } as React.CSSProperties,
  };

  const lbl = { style: { display: "block", fontSize: 12, fontWeight: 500, color: "hsl(220,12%,45%)", marginBottom: 6 } as React.CSSProperties };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent style={{ background: "hsl(228,22%,9%)", border: "1px solid hsl(228,18%,16%)", borderRadius: 14, maxWidth: 440, maxHeight: "90vh", overflowY: "auto" }}>
        <DialogHeader>
          <DialogTitle style={{ fontFamily: "'Sora',sans-serif", fontWeight: 700, fontSize: 17, color: "hsl(220,18%,91%)" }}>
            {isEdit ? "Edit" : <><span className="glow-text">+</span> Tambah ke</> } {title}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <FormField control={form.control} name="title" render={({ field }) => (
              <FormItem>
                <FormLabel><span {...lbl}>Judul</span></FormLabel>
                <FormControl>
                  <input {...field} placeholder="Nama judul..." {...inp} data-testid="input-title" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <FormField control={form.control} name="genre" render={({ field }) => (
                <FormItem>
                  <FormLabel><span {...lbl}>Genre</span></FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="bg-muted/60 border-white/8 text-sm h-9" data-testid="select-genre">
                        <SelectValue placeholder="Pilih genre" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent style={{ background: "hsl(228,22%,9%)", border: "1px solid hsl(228,18%,16%)" }}>
                      {GENRES.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </FormItem>
              )} />
              <FormField control={form.control} name="status" render={({ field }) => (
                <FormItem>
                  <FormLabel><span {...lbl}>Status</span></FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="bg-muted/60 border-white/8 text-sm h-9" data-testid="select-status">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent style={{ background: "hsl(228,22%,9%)", border: "1px solid hsl(228,18%,16%)" }}>
                      {(Object.keys(STATUS_CONFIG) as Status[]).map(s => (
                        <SelectItem key={s} value={s}>{STATUS_CONFIG[s].label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
              {([["rating","Rating (1-10)","1–10"],["totalEpisodes","Total Eps","—"],["currentEpisode","Current Ep","—"]] as const).map(([name, label2, ph]) => (
                <FormField key={name} control={form.control} name={name} render={({ field }) => (
                  <FormItem>
                    <FormLabel><span {...lbl}>{label2}</span></FormLabel>
                    <FormControl>
                      <input {...field} type="number" min={name === "currentEpisode" ? 0 : 1} max={name === "rating" ? 10 : undefined} placeholder={ph} {...inp} data-testid={`input-${name}`} />
                    </FormControl>
                  </FormItem>
                )} />
              ))}
            </div>

            <FormField control={form.control} name="notes" render={({ field }) => (
              <FormItem>
                <FormLabel><span {...lbl}>Catatan</span></FormLabel>
                <FormControl>
                  <textarea
                    {...field}
                    rows={2}
                    placeholder="Catatan pribadi..."
                    data-testid="input-notes"
                    style={{ ...inp.style, resize: "none" }}
                  />
                </FormControl>
              </FormItem>
            )} />

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, paddingTop: 4 }}>
              <button type="button" onClick={() => onOpenChange(false)} data-testid="button-cancel"
                style={{ padding: "7px 16px", borderRadius: 8, fontSize: 13, fontWeight: 500, background: "transparent", border: "1px solid hsl(228,18%,20%)", color: "hsl(220,12%,50%)", cursor: "pointer", fontFamily: "'Inter',sans-serif" }}>
                Batal
              </button>
              <button type="submit" disabled={create.isPending || update.isPending} className="btn-primary" data-testid="button-submit">
                {isEdit ? "Simpan" : "Tambah"}
              </button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

/* ── Media row card ── */
function ItemCard({ item, onEdit, onDelete, onStatus }: {
  item: Item;
  onEdit: () => void;
  onDelete: () => void;
  onStatus: (s: Status) => void;
}) {
  const st = (item.status as Status) in STATUS_CONFIG ? item.status as Status : "plan-to-watch";
  const cfg = STATUS_CONFIG[st];
  const Icon = cfg.icon;
  const pct = item.totalEpisodes && item.currentEpisode != null
    ? Math.round((item.currentEpisode / item.totalEpisodes) * 100) : null;

  return (
    <div
      className={cn("surface-sm", cfg.stripe)}
      style={{ padding: "14px 16px", display: "flex", gap: 12, alignItems: "flex-start" }}
      data-testid={`card-media-${item.id}`}
    >
      {/* Status toggle button */}
      <button
        onClick={() => onStatus(CYCLE[st])}
        title="Klik untuk ganti status"
        data-testid={`button-status-toggle-${item.id}`}
        style={{
          flexShrink: 0, marginTop: 2,
          width: 22, height: 22, borderRadius: "50%",
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer", border: "none",
          background: st === "completed" ? "hsla(252,70%,60%,0.2)"
                     : st === "watching"  ? "hsla(155,60%,45%,0.15)"
                     : st === "dropped"   ? "hsla(220,10%,40%,0.15)"
                     :                     "hsla(214,80%,55%,0.1)",
          transition: "opacity 150ms",
        }}
      >
        <Icon
          className="w-3 h-3"
          style={{
            color: st === "completed" ? "hsl(252,70%,72%)"
                 : st === "watching"  ? "hsl(155,60%,60%)"
                 : st === "dropped"   ? "hsl(220,10%,48%)"
                 :                     "hsl(214,80%,65%)",
          }}
        />
      </button>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Title row */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginBottom: 6 }}>
          <p style={{
            fontSize: 14, fontWeight: 600,
            fontFamily: "'Sora',sans-serif",
            color: st === "dropped"   ? "hsl(220,12%,38%)"
                 : st === "completed" ? "hsl(252,70%,78%)"
                 :                     "hsl(220,18%,90%)",
            textDecoration: st === "dropped" ? "line-through" : "none",
            lineHeight: 1.3,
          }}>
            {item.title}
          </p>

          {/* Action buttons — ALWAYS VISIBLE */}
          <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
            <button
              onClick={onEdit}
              data-testid={`button-edit-${item.id}`}
              title="Edit"
              style={{
                width: 28, height: 28, borderRadius: 7,
                display: "flex", alignItems: "center", justifyContent: "center",
                background: "hsla(255,100%,100%,0.04)",
                border: "1px solid hsl(228,18%,18%)",
                color: "hsl(220,12%,48%)", cursor: "pointer",
                transition: "all 150ms",
              }}
              onMouseEnter={e => { const el = e.currentTarget; el.style.color = "hsl(220,18%,85%)"; el.style.borderColor = "hsl(228,18%,28%)"; el.style.background = "hsla(255,100%,100%,0.08)"; }}
              onMouseLeave={e => { const el = e.currentTarget; el.style.color = "hsl(220,12%,48%)"; el.style.borderColor = "hsl(228,18%,18%)"; el.style.background = "hsla(255,100%,100%,0.04)"; }}
            >
              <Pencil className="w-3 h-3" />
            </button>
            <button
              onClick={onDelete}
              data-testid={`button-delete-${item.id}`}
              title="Hapus"
              style={{
                width: 28, height: 28, borderRadius: 7,
                display: "flex", alignItems: "center", justifyContent: "center",
                background: "hsla(0,65%,55%,0.06)",
                border: "1px solid hsla(0,65%,55%,0.2)",
                color: "hsl(0,60%,55%)", cursor: "pointer",
                transition: "all 150ms",
              }}
              onMouseEnter={e => { const el = e.currentTarget; el.style.background = "hsla(0,65%,55%,0.14)"; el.style.borderColor = "hsla(0,65%,55%,0.5)"; }}
              onMouseLeave={e => { const el = e.currentTarget; el.style.background = "hsla(0,65%,55%,0.06)"; el.style.borderColor = "hsla(0,65%,55%,0.2)"; }}
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Badges row */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: pct !== null ? 8 : 0 }}>
          <span
            className={cfg.badge}
            style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px", borderRadius: 20, fontSize: 11, fontWeight: 500 }}
          >
            <Icon className="w-2.5 h-2.5" />
            {cfg.label}
          </span>

          {item.genre && (
            <span style={{ fontSize: 12, color: "hsl(220,12%,42%)", background: "hsla(255,100%,100%,0.04)", border: "1px solid hsl(228,18%,18%)", padding: "2px 8px", borderRadius: 20 }}>
              {item.genre}
            </span>
          )}

          {item.rating && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 12, color: "hsl(40,85%,62%)", fontWeight: 600 }}>
              <Star className="w-3 h-3" style={{ fill: "hsl(40,85%,62%)" }} />
              {item.rating}
            </span>
          )}

          {item.currentEpisode != null && item.totalEpisodes && (
            <span style={{ fontSize: 12, color: "hsl(220,12%,42%)", marginLeft: "auto" }}>
              Ep {item.currentEpisode}/{item.totalEpisodes}
            </span>
          )}
        </div>

        {/* Progress bar */}
        {pct !== null && (
          <div style={{ height: 2, borderRadius: 99, background: "hsla(255,100%,100%,0.06)", overflow: "hidden" }}>
            <div style={{
              height: "100%", borderRadius: 99,
              background: st === "completed" ? "hsl(252,70%,60%)"
                         : st === "watching" ? "hsl(155,60%,45%)"
                         :                    "hsl(214,80%,55%)",
              opacity: 0.7, width: `${pct}%`,
              transition: "width 400ms ease",
            }} />
          </div>
        )}

        {/* Notes */}
        {item.notes && (
          <p style={{ fontSize: 12, color: "hsl(220,12%,38%)", marginTop: 6, fontStyle: "italic", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {item.notes}
          </p>
        )}
      </div>
    </div>
  );
}

/* ── Main page ── */
export function CategoryList({ category, title }: { category: string; title: string }) {
  const qc = useQueryClient();
  const { toast } = useToast();

  const [search,   setSearch]   = useState("");
  const [genre,    setGenre]    = useState("all");
  const [status,   setStatus]   = useState("all");
  const [dlgOpen,  setDlgOpen]  = useState(false);
  const [editItem, setEditItem] = useState<Item | null>(null);
  const [delItem,  setDelItem]  = useState<Item | null>(null);

  const { data: items = [], isLoading } = useListMedia(
    { category },
    { query: { queryKey: getListMediaQueryKey({ category }) } }
  );
  const { data: allGenres = [] } = useListGenres({ query: { queryKey: getListGenresQueryKey() } });
  const delMedia = useDeleteMedia();
  const updMedia = useUpdateMedia();

  const shown = items.filter(i => {
    const ms = !search || i.title.toLowerCase().includes(search.toLowerCase());
    const mg = genre  === "all" || i.genre  === genre;
    const ms2= status === "all" || i.status === status;
    return ms && mg && ms2;
  });

  const cnt = {
    total:   items.length,
    done:    items.filter(i => i.status === "completed").length,
    watch:   items.filter(i => i.status === "watching").length,
    plan:    items.filter(i => i.status === "plan-to-watch").length,
    dropped: items.filter(i => i.status === "dropped").length,
  };

  const myGenres = allGenres.filter(g => items.some(i => i.genre === g));

  function inv() {
    qc.invalidateQueries({ queryKey: getListMediaQueryKey({ category }) });
    qc.invalidateQueries({ queryKey: getGetMediaStatsQueryKey() });
  }

  async function handleStatus(item: Item, s: Status) {
    try { await updMedia.mutateAsync({ id: item.id, data: { status: s } }); inv(); }
    catch { toast({ title: "Gagal update status", variant: "destructive" }); }
  }

  async function handleDelete() {
    if (!delItem) return;
    try {
      await delMedia.mutateAsync({ id: delItem.id });
      inv();
      qc.invalidateQueries({ queryKey: getListGenresQueryKey() });
      toast({ title: `"${delItem.title}" dihapus` });
    } catch { toast({ title: "Gagal hapus", variant: "destructive" }); }
    finally { setDelItem(null); }
  }

  function openAdd()      { setEditItem(null); setDlgOpen(true); }
  function openEdit(i: Item) { setEditItem(i);  setDlgOpen(true); }
  function onFormDone()   { inv(); qc.invalidateQueries({ queryKey: getListGenresQueryKey() }); }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }} className="pb-20 md:pb-0 animate-in fade-in duration-300">

      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, paddingTop: 4 }}>
        <div>
          <h1 style={{ fontFamily: "'Sora',sans-serif", fontWeight: 800, fontSize: 28, letterSpacing: "-0.5px", color: "hsl(220,18%,91%)", marginBottom: 4, lineHeight: 1.1 }}>
            {title}<span className="glow-text">.</span>
          </h1>
          <div style={{ display: "flex", gap: 8, fontSize: 12, color: "hsl(220,12%,42%)", flexWrap: "wrap", alignItems: "center" }}>
            <span>{cnt.total} total</span>
            {cnt.watch   > 0 && <><span>·</span><span style={{ color: "hsl(155,60%,58%)" }}>{cnt.watch} watching</span></>}
            {cnt.done    > 0 && <><span>·</span><span style={{ color: "hsl(252,70%,72%)" }}>{cnt.done} selesai</span></>}
            {cnt.plan    > 0 && <><span>·</span><span style={{ color: "hsl(214,80%,65%)" }}>{cnt.plan} planned</span></>}
            {cnt.dropped > 0 && <><span>·</span><span style={{ color: "hsl(220,10%,45%)" }}>{cnt.dropped} dropped</span></>}
          </div>
        </div>
        <button onClick={openAdd} className="btn-primary" data-testid="button-add">
          <Plus className="w-3.5 h-3.5" />
          Tambah
        </button>
      </div>

      {/* ── Search ── */}
      <div style={{ position: "relative" }}>
        <Search style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", width: 15, height: 15, color: "hsl(220,12%,40%)" }} />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={`Cari ${title.toLowerCase()}...`}
          data-testid="input-search"
          style={{
            width: "100%", padding: "9px 12px 9px 36px",
            borderRadius: 10, fontSize: 13,
            background: "hsl(228,20%,10%)", border: "1px solid hsl(228,18%,16%)",
            color: "hsl(220,18%,88%)", outline: "none", fontFamily: "'Inter',sans-serif",
          }}
        />
      </div>

      {/* ── Status filter ── */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {([["all","Semua"], ["plan-to-watch","Mau Nonton"], ["watching","Lagi Nonton"], ["completed","Selesai"], ["dropped","Dropped"]] as const).map(([v, lbl]) => (
          <button key={v} onClick={() => setStatus(v)} className={cn("pill", status === v && "pill-active")} data-testid={`filter-status-${v}`}>
            {lbl}
          </button>
        ))}
      </div>

      {/* ── Genre filter ── */}
      {myGenres.length > 0 && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {["all", ...myGenres].map(g => (
            <button key={g} onClick={() => setGenre(g)} className={cn("pill", genre === g && "pill-genre-active")} data-testid={`filter-genre-${g}`}>
              {g === "all" ? "Semua Genre" : g}
            </button>
          ))}
        </div>
      )}

      {/* ── List ── */}
      {isLoading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-16 rounded-lg bg-muted/50" />)}
        </div>
      ) : shown.length === 0 ? (
        <div className="surface" style={{ padding: "48px 24px", textAlign: "center" }}>
          <p style={{ fontSize: 14, color: "hsl(220,12%,40%)", marginBottom: 16 }}>
            {items.length === 0 ? `Belum ada ${title} di list kamu.` : "Tidak ada yang cocok dengan filter."}
          </p>
          {items.length === 0 && (
            <button onClick={openAdd} className="btn-outline" data-testid="button-add-empty">
              <Plus className="w-3.5 h-3.5" />
              Tambah yang pertama
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {shown.map(item => (
            <ItemCard
              key={item.id}
              item={item as Item}
              onEdit={() => openEdit(item as Item)}
              onDelete={() => setDelItem(item as Item)}
              onStatus={s => handleStatus(item as Item, s)}
            />
          ))}
        </div>
      )}

      {/* ── Dialogs ── */}
      <ItemDialog
        open={dlgOpen} onOpenChange={setDlgOpen}
        item={editItem} category={category} title={title}
        onSuccess={onFormDone}
      />

      <AlertDialog open={!!delItem} onOpenChange={v => !v && setDelItem(null)}>
        <AlertDialogContent style={{ background: "hsl(228,22%,9%)", border: "1px solid hsl(228,18%,16%)", borderRadius: 14 }}>
          <AlertDialogHeader>
            <AlertDialogTitle style={{ fontFamily: "'Sora',sans-serif", fontSize: 16 }}>Hapus dari list?</AlertDialogTitle>
            <AlertDialogDescription style={{ color: "hsl(220,12%,45%)", fontSize: 14 }}>
              <span style={{ color: "hsl(220,18%,85%)", fontWeight: 500 }}>"{delItem?.title}"</span> akan dihapus permanen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter style={{ gap: 10 }}>
            <AlertDialogCancel
              style={{ background: "transparent", border: "1px solid hsl(228,18%,20%)", color: "hsl(220,12%,50%)", borderRadius: 8, fontSize: 13 }}
              data-testid="button-cancel-delete"
            >
              Batal
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              style={{ background: "hsla(0,65%,55%,0.12)", border: "1px solid hsla(0,65%,55%,0.35)", color: "hsl(0,65%,65%)", borderRadius: 8, fontSize: 13 }}
              data-testid="button-confirm-delete"
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
