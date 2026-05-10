import { useState, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListMedia, useCreateMedia, useUpdateMedia, useDeleteMedia, useListGenres, useBulkImportMedia,
  getListMediaQueryKey, getListGenresQueryKey, getGetMediaStatsQueryKey, getGetDetailedStatsQueryKey,
} from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Search, Plus, Pencil, Trash2, CheckCircle2, Play, Clock, XCircle, Star, ChevronRight, Download, Upload, Share2, ArrowUpDown, Shuffle, LayoutList, LayoutGrid, X } from "lucide-react";
import confetti from "canvas-confetti";
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

type SortKey = "date-desc" | "date-asc" | "title-az" | "rating-desc" | "progress-desc";
const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "date-desc",     label: "Terbaru" },
  { value: "date-asc",      label: "Terlama" },
  { value: "title-az",      label: "Judul A–Z" },
  { value: "rating-desc",   label: "Rating ↓" },
  { value: "progress-desc", label: "Progress ↓" },
];

const schema = z.object({
  title:          z.string().min(1, "Title wajib diisi"),
  genre:          z.string().optional(),
  status:         z.enum(["plan-to-watch","watching","completed","dropped"]),
  rating:         z.coerce.number().min(1).max(10).optional().or(z.literal("")),
  totalEpisodes:  z.coerce.number().min(1).optional().or(z.literal("")),
  currentEpisode: z.coerce.number().min(0).optional().or(z.literal("")),
  notes:          z.string().optional(),
  imageUrl:       z.string().optional(),
  tags:           z.string().optional(),
});
type FormVals = z.infer<typeof schema>;

interface Item {
  id: number; title: string; category: string; genre?: string | null;
  status: string; rating?: number | null; notes?: string | null;
  totalEpisodes?: number | null; currentEpisode?: number | null;
  imageUrl?: string | null; tags?: string | null; createdAt: string;
  startDate?: string | null; endDate?: string | null;
}

function fireConfetti() {
  confetti({
    particleCount: 90,
    spread: 70,
    origin: { y: 0.65 },
    colors: ["#7c3aed", "#8b5cf6", "#a78bfa", "#c4b5fd", "#00d4ff", "#fff"],
  });
}

function fmtDate(d: string | null | undefined) {
  if (!d) return null;
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}

/* ── Form dialog ── */
function ItemDialog({ open, onOpenChange, item, category, title, onSuccess, existingItems = [] }: {
  open: boolean; onOpenChange: (v: boolean) => void;
  item: Item | null; category: string; title: string; onSuccess: () => void;
  existingItems?: Item[];
}) {
  const { toast } = useToast();
  const create = useCreateMedia();
  const update = useUpdateMedia();
  const isEdit = !!item;
  const [isMovie, setIsMovie] = useState<boolean>(() => isEdit ? item.totalEpisodes == null : false);
  const [imgPreview, setImgPreview] = useState<string>(item?.imageUrl ?? "");
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function uploadFile(file: File) {
    setIsUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/storage/uploads", { method: "POST", body: fd });
      if (!res.ok) throw new Error("upload failed");
      const { servingUrl } = await res.json() as { servingUrl: string };
      form.setValue("imageUrl", servingUrl);
      setImgPreview(servingUrl);
    } catch {
      toast({ title: "Gagal upload gambar", variant: "destructive" });
      setImgPreview(item?.imageUrl ?? "");
    } finally {
      setIsUploading(false);
    }
  }

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
      imageUrl:       item?.imageUrl       ?? "",
      tags:           item?.tags           ?? "",
    },
  });

  async function onSubmit(v: FormVals) {
    const data = {
      title: v.title, category,
      genre:          v.genre   || undefined,
      status:         v.status,
      rating:         v.rating  === "" ? undefined : Number(v.rating),
      totalEpisodes:  isMovie ? undefined : (v.totalEpisodes  === "" ? undefined : Number(v.totalEpisodes)),
      currentEpisode: isMovie ? undefined : (v.currentEpisode === "" ? undefined : Number(v.currentEpisode)),
      notes:          v.notes    || undefined,
      imageUrl:       v.imageUrl || undefined,
      tags:           v.tags     || undefined,
    };
    if (!isEdit) {
      const dup = existingItems.find(i => i.title.toLowerCase() === v.title.toLowerCase());
      if (dup) {
        toast({ title: `"${v.title}" sudah ada di list!`, description: `Status: ${STATUS_CONFIG[dup.status as Status]?.label ?? dup.status}`, variant: "destructive" });
        return;
      }
    }
    try {
      if (isEdit) { await update.mutateAsync({ id: item.id, data }); toast({ title: "Tersimpan" }); }
      else        { await create.mutateAsync({ data });               toast({ title: `🎉 "${v.title}" ditambahkan!` }); }
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

  const toggleStyle = (active: boolean): React.CSSProperties => ({
    flex: 1, padding: "6px 0", borderRadius: 7, fontSize: 12, fontWeight: 600,
    cursor: "pointer", transition: "all 150ms", fontFamily: "'Inter',sans-serif",
    background: active ? "hsla(252,70%,65%,0.15)" : "transparent",
    color: active ? "hsl(252,70%,75%)" : "hsl(220,12%,42%)",
    border: active ? "1px solid hsla(252,70%,65%,0.4)" : "1px solid transparent",
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent style={{ background: "hsl(228,22%,9%)", border: "1px solid hsl(228,18%,16%)", borderRadius: 14, maxWidth: 440, maxHeight: "90vh", overflowY: "auto" }}>
        <DialogHeader>
          <DialogTitle style={{ fontFamily: "'Sora',sans-serif", fontWeight: 700, fontSize: 17, color: "hsl(220,18%,91%)" }}>
            {isEdit ? "Edit" : <><span className="glow-text">+</span> Tambah ke</>} {title}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} style={{ display: "flex", flexDirection: "column", gap: 16 }}>

            {/* Type toggle */}
            <div>
              <span {...lbl}>Tipe</span>
              <div style={{ display: "flex", gap: 6, background: "hsl(228,18%,13%)", borderRadius: 9, padding: 4 }}>
                <button type="button" onClick={() => setIsMovie(false)} style={toggleStyle(!isMovie)} data-testid="toggle-series">📺 Series / Drama</button>
                <button type="button" onClick={() => setIsMovie(true)}  style={toggleStyle(isMovie)}  data-testid="toggle-movie">🎬 Movie</button>
              </div>
            </div>

            <FormField control={form.control} name="title" render={({ field }) => (
              <FormItem>
                <FormLabel><span {...lbl}>Judul</span></FormLabel>
                <FormControl><input {...field} placeholder="Nama judul..." {...inp} data-testid="input-title" /></FormControl>
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

            {!isMovie && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {([["totalEpisodes","Total Episode","—"],["currentEpisode","Episode Sekarang","0"]] as const).map(([name, label2, ph]) => (
                  <FormField key={name} control={form.control} name={name} render={({ field }) => (
                    <FormItem>
                      <FormLabel><span {...lbl}>{label2}</span></FormLabel>
                      <FormControl>
                        <input {...field} type="number" min={name === "currentEpisode" ? 0 : 1} placeholder={ph} {...inp} data-testid={`input-${name}`} />
                      </FormControl>
                    </FormItem>
                  )} />
                ))}
              </div>
            )}

            <FormField control={form.control} name="rating" render={({ field }) => (
              <FormItem>
                <FormLabel><span {...lbl}>Rating (1–10)</span></FormLabel>
                <FormControl>
                  <input {...field} type="number" min={1} max={10} placeholder="Nilai 1–10" {...inp} data-testid="input-rating" />
                </FormControl>
              </FormItem>
            )} />

            {/* Poster upload */}
            <div>
              <span {...lbl}>Poster / Gambar</span>
              <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }} data-testid="input-imageUpload"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setImgPreview(URL.createObjectURL(file));
                  await uploadFile(file);
                  e.target.value = "";
                }}
              />
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <button type="button" disabled={isUploading} onClick={() => fileInputRef.current?.click()}
                  style={{
                    padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600,
                    cursor: isUploading ? "not-allowed" : "pointer",
                    background: "hsla(252,70%,65%,0.12)", border: "1px solid hsla(252,70%,65%,0.35)",
                    color: "hsl(252,70%,75%)", fontFamily: "'Inter',sans-serif", transition: "all 150ms",
                  }}
                >
                  {isUploading ? "⏳ Uploading..." : "📁 Pilih Gambar"}
                </button>
                {imgPreview && !isUploading && (
                  <img src={imgPreview} alt="preview" onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                    style={{ width: 48, height: 68, objectFit: "cover", borderRadius: 6, border: "1px solid hsl(228,18%,22%)" }} />
                )}
                {imgPreview && (
                  <button type="button" onClick={() => { setImgPreview(""); form.setValue("imageUrl", ""); }}
                    style={{ fontSize: 11, color: "hsl(220,12%,38%)", background: "none", border: "none", cursor: "pointer", padding: 4 }}>
                    ✕ Hapus
                  </button>
                )}
              </div>
            </div>

            <FormField control={form.control} name="tags" render={({ field }) => (
              <FormItem>
                <FormLabel><span {...lbl}>Tag (pisahkan dengan koma)</span></FormLabel>
                <FormControl>
                  <input {...field} placeholder="re-watch, favorit, nonton bareng..." {...inp} data-testid="input-tags" />
                </FormControl>
              </FormItem>
            )} />

            <FormField control={form.control} name="notes" render={({ field }) => (
              <FormItem>
                <FormLabel><span {...lbl}>Catatan</span></FormLabel>
                <FormControl>
                  <textarea {...field} rows={2} placeholder="Catatan pribadi..." data-testid="input-notes" style={{ ...inp.style, resize: "none" }} />
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

/* ── Share Card Dialog ── */
function ShareCardDialog({ item, open, onClose }: { item: Item; open: boolean; onClose: () => void }) {
  const st = (item.status as Status) in STATUS_CONFIG ? item.status as Status : "plan-to-watch";
  const cfg = STATUS_CONFIG[st];
  const cardRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);

  const year = item.startDate ? item.startDate.slice(0, 4) : item.endDate ? item.endDate.slice(0, 4) : null;

  const infoRows: { label: string; value: string }[] = [
    ...(item.genre    ? [{ label: "genre",   value: item.genre }] : []),
    { label: "status",  value: cfg.label },
    ...(item.totalEpisodes != null
      ? [{ label: "episode", value: `${item.currentEpisode ?? 0} / ${item.totalEpisodes} ep` }] : []),
    ...(item.rating   != null ? [{ label: "rating",  value: `${item.rating} / 10` }] : []),
    ...(item.tags     ? [{ label: "tag",     value: item.tags }] : []),
  ];

  async function handleDownload() {
    if (!cardRef.current) return;
    setDownloading(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(cardRef.current, { scale: 3, useCORS: true, backgroundColor: null });
      const link = document.createElement("a");
      link.download = `${item.title.replace(/\s+/g, "_")}_neonwatch.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch { /* silent */ }
    finally { setDownloading(false); }
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent style={{
        background: "hsl(228,22%,8%)",
        border: "1px solid hsl(228,18%,16%)",
        borderRadius: 18,
        maxWidth: 300,
        padding: "16px 16px 14px",
      }}>
        <DialogHeader>
          <DialogTitle style={{ fontFamily: "'Sora',sans-serif", fontWeight: 700, fontSize: 12, color: "hsl(220,18%,55%)", letterSpacing: "0.12em", textTransform: "uppercase" }}>
            Poster Card
          </DialogTitle>
        </DialogHeader>

        {/* ══ Poster card — mirip referensi ══ */}
        <div ref={cardRef} style={{
          background: "#eae6df",
          borderRadius: 10,
          overflow: "hidden",
          fontFamily: "'Inter','Helvetica Neue',Arial,sans-serif",
          boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
        }}>

          {/* ── Gambar ── */}
          <div style={{ padding: "10px 10px 8px" }}>
            <div style={{
              width: "100%", aspectRatio: "2/3",
              borderRadius: 6, overflow: "hidden",
              background: "#cac5bc",
              boxShadow: "0 3px 14px rgba(0,0,0,0.32)",
              position: "relative",
            }}>
              {item.imageUrl ? (
                <img
                  src={item.imageUrl}
                  alt={item.title}
                  crossOrigin="anonymous"
                  style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                />
              ) : (
                <div style={{
                  width: "100%", height: "100%",
                  background: "linear-gradient(135deg, #d0cbc3, #bfb9b1)",
                  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6,
                }}>
                  <span style={{ fontSize: 36, fontWeight: 900, color: "rgba(60,52,44,0.15)", letterSpacing: 2 }}>
                    {item.title.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase()}
                  </span>
                  <span style={{ fontSize: 9, color: "rgba(60,52,44,0.3)", fontWeight: 600, letterSpacing: "0.1em" }}>NO POSTER</span>
                </div>
              )}
            </div>
          </div>

          {/* ── Info ── */}
          <div style={{ padding: "0 12px 12px" }}>
            {/* Judul + tahun */}
            <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 8, flexWrap: "wrap" }}>
              <span style={{
                fontSize: 16, fontWeight: 900, letterSpacing: "-0.03em",
                color: "#18150f", textTransform: "uppercase", lineHeight: 1.2,
                fontFamily: "'Sora','Inter',sans-serif",
              }}>
                {item.title}
              </span>
              {year && (
                <span style={{ fontSize: 13, fontWeight: 400, color: "#8c8880", flexShrink: 0 }}>{year}</span>
              )}
            </div>

            {/* Divider */}
            <div style={{ height: 1, background: "#cac5bc", marginBottom: 8 }} />

            {/* Info rows */}
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {infoRows.map(r => (
                <div key={r.label} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                  <span style={{
                    fontSize: 9, fontWeight: 700, color: "#9c9790",
                    letterSpacing: "0.05em", minWidth: 46, paddingTop: 1, flexShrink: 0,
                  }}>
                    {r.label}
                  </span>
                  <span style={{ fontSize: 10, color: "#2c2924", fontWeight: 500, lineHeight: 1.5, flex: 1 }}>
                    {r.value}
                  </span>
                </div>
              ))}
              {item.notes && (
                <>
                  <div style={{ height: 1, background: "#d2cec8", margin: "3px 0" }} />
                  <div style={{ display: "flex", gap: 8 }}>
                    <span style={{ fontSize: 9, fontWeight: 700, color: "#9c9790", minWidth: 46, paddingTop: 1, flexShrink: 0 }}>catatan</span>
                    <span style={{ fontSize: 10, color: "#2c2924", fontStyle: "italic", lineHeight: 1.5, flex: 1 }}>{item.notes}</span>
                  </div>
                </>
              )}
            </div>

            {/* Branding */}
            <div style={{ marginTop: 10, borderTop: "1px solid #cac5bc", paddingTop: 6, display: "flex", justifyContent: "flex-end" }}>
              <span style={{ fontSize: 8, fontWeight: 800, letterSpacing: "0.2em", color: "#9c9790", textTransform: "uppercase" }}>
                NeonWatch
              </span>
            </div>
          </div>
        </div>

        {/* ── Actions ── */}
        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="btn-primary"
            style={{ flex: 1, justifyContent: "center", gap: 6, fontSize: 12, height: 34 }}
          >
            <Download className="w-3.5 h-3.5" />
            {downloading ? "Memproses..." : "Simpan Gambar"}
          </button>
          <button
            onClick={onClose}
            style={{ width: 34, height: 34, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", background: "transparent", border: "1px solid hsl(228,18%,20%)", color: "hsl(220,12%,50%)", cursor: "pointer" }}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ── Bulk Import Dialog ── */
function BulkImportDialog({ open, onClose, category, onDone }: {
  open: boolean; onClose: () => void; category: string; onDone: () => void;
}) {
  const { toast } = useToast();
  const [text, setText] = useState("");
  const bulkImport = useBulkImportMedia();

  async function handleImport() {
    const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) return;
    try {
      const result = await bulkImport.mutateAsync({
        data: { items: lines.map(title => ({ title, category, status: "plan-to-watch" })) }
      });
      toast({ title: `✅ ${result.created} judul ditambahkan${result.failed > 0 ? `, ${result.failed} gagal` : ""}` });
      setText("");
      onDone();
      onClose();
    } catch {
      toast({ title: "Gagal import", variant: "destructive" });
    }
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent style={{ background: "hsl(228,22%,9%)", border: "1px solid hsl(228,18%,16%)", borderRadius: 14, maxWidth: 420 }}>
        <DialogHeader>
          <DialogTitle style={{ fontFamily: "'Sora',sans-serif", fontWeight: 700, fontSize: 15, color: "hsl(220,18%,88%)" }}>
            Import Massal
          </DialogTitle>
        </DialogHeader>
        <p style={{ fontSize: 12, color: "hsl(220,12%,42%)", marginBottom: 8 }}>
          Paste daftar judul, satu per baris. Semua akan masuk sebagai "Plan to Watch".
        </p>
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          rows={8}
          placeholder={"Goblin\nItaewon Class\nExtraordinary Attorney Woo\n..."}
          style={{
            width: "100%", padding: "10px 12px", borderRadius: 8, fontSize: 13, resize: "vertical",
            background: "hsl(228,18%,13%)", border: "1px solid hsl(228,18%,20%)",
            color: "hsl(220,18%,88%)", outline: "none", fontFamily: "'Inter',sans-serif",
          }}
        />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 11, color: "hsl(220,12%,38%)" }}>
            {text.split("\n").filter(l => l.trim()).length} judul
          </span>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={onClose} style={{ padding: "7px 14px", borderRadius: 8, fontSize: 13, background: "transparent", border: "1px solid hsl(228,18%,20%)", color: "hsl(220,12%,50%)", cursor: "pointer" }}>
              Batal
            </button>
            <button onClick={handleImport} disabled={bulkImport.isPending || !text.trim()} className="btn-primary">
              {bulkImport.isPending ? "Importing..." : "Import"}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ── Media row card ── */
function ItemCard({ item, onEdit, onDelete, onStatus, onEpisodeUp, onShare, onTagClick }: {
  item: Item;
  onEdit: () => void;
  onDelete: () => void;
  onStatus: (s: Status) => void;
  onEpisodeUp: () => void;
  onShare: () => void;
  onTagClick?: (tag: string) => void;
}) {
  const st = (item.status as Status) in STATUS_CONFIG ? item.status as Status : "plan-to-watch";
  const cfg = STATUS_CONFIG[st];
  const Icon = cfg.icon;
  const pct = item.totalEpisodes && item.currentEpisode != null
    ? Math.round((item.currentEpisode / item.totalEpisodes) * 100) : null;

  const tagList = item.tags ? item.tags.split(",").map(t => t.trim()).filter(Boolean) : [];

  return (
    <div
      className={cn("surface-sm", cfg.stripe)}
      style={{ padding: "12px 14px", display: "flex", gap: 12, alignItems: "flex-start" }}
      data-testid={`card-media-${item.id}`}
    >
      {/* Poster thumbnail */}
      <div style={{ flexShrink: 0, position: "relative" }}>
        {item.imageUrl ? (
          <img
            src={item.imageUrl}
            alt={item.title}
            onError={e => {
              const el = e.currentTarget as HTMLImageElement;
              el.style.display = "none";
              (el.nextElementSibling as HTMLElement | null)?.style && ((el.nextElementSibling as HTMLElement).style.display = "flex");
            }}
            style={{ width: 44, height: 62, objectFit: "cover", borderRadius: 6, border: "1px solid hsl(228,18%,18%)", opacity: st === "dropped" ? 0.4 : 1 }}
          />
        ) : null}
        <div style={{
          width: 44, height: 62, borderRadius: 6,
          background: st === "completed" ? "hsla(252,70%,60%,0.08)" : st === "watching" ? "hsla(155,60%,45%,0.08)" : st === "dropped" ? "hsla(220,10%,40%,0.06)" : "hsla(214,80%,55%,0.06)",
          border: "1px solid hsl(228,18%,18%)",
          display: item.imageUrl ? "none" : "flex",
          alignItems: "center", justifyContent: "center",
        }}>
          <Icon className="w-4 h-4" style={{
            color: st === "completed" ? "hsl(252,70%,50%)" : st === "watching" ? "hsl(155,60%,45%)" : st === "dropped" ? "hsl(220,10%,35%)" : "hsl(214,80%,45%)",
          }} />
        </div>
        <button
          onClick={() => onStatus(CYCLE[st])}
          title="Klik untuk ganti status"
          data-testid={`button-status-toggle-${item.id}`}
          style={{
            position: "absolute", bottom: -6, right: -6,
            width: 18, height: 18, borderRadius: "50%",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", border: "1px solid hsl(228,18%,14%)",
            background: "hsl(228,20%,10%)",
          }}
        >
          <Icon className="w-2.5 h-2.5" style={{
            color: st === "completed" ? "hsl(252,70%,72%)" : st === "watching" ? "hsl(155,60%,60%)" : st === "dropped" ? "hsl(220,10%,48%)" : "hsl(214,80%,65%)",
          }} />
        </button>
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Title row */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginBottom: 6 }}>
          <p style={{
            fontSize: 14, fontWeight: 600, fontFamily: "'Sora',sans-serif",
            color: st === "dropped" ? "hsl(220,12%,38%)" : st === "completed" ? "hsl(252,70%,78%)" : "hsl(220,18%,90%)",
            textDecoration: st === "dropped" ? "line-through" : "none",
            lineHeight: 1.3,
          }}>
            {item.title}
          </p>

          {/* Action buttons */}
          <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
            <button
              onClick={onShare}
              data-testid={`button-share-${item.id}`}
              title="Share card"
              style={{ width: 28, height: 28, borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", background: "hsla(255,100%,100%,0.04)", border: "1px solid hsl(228,18%,18%)", color: "hsl(220,12%,48%)", cursor: "pointer", transition: "all 150ms" }}
              onMouseEnter={e => { const el = e.currentTarget; el.style.color = "hsl(252,70%,72%)"; el.style.borderColor = "hsla(252,70%,55%,0.4)"; }}
              onMouseLeave={e => { const el = e.currentTarget; el.style.color = "hsl(220,12%,48%)"; el.style.borderColor = "hsl(228,18%,18%)"; }}
            >
              <Share2 className="w-3 h-3" />
            </button>
            <button
              onClick={onEdit}
              data-testid={`button-edit-${item.id}`}
              title="Edit"
              style={{ width: 28, height: 28, borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", background: "hsla(255,100%,100%,0.04)", border: "1px solid hsl(228,18%,18%)", color: "hsl(220,12%,48%)", cursor: "pointer", transition: "all 150ms" }}
              onMouseEnter={e => { const el = e.currentTarget; el.style.color = "hsl(220,18%,85%)"; el.style.borderColor = "hsl(228,18%,28%)"; el.style.background = "hsla(255,100%,100%,0.08)"; }}
              onMouseLeave={e => { const el = e.currentTarget; el.style.color = "hsl(220,12%,48%)"; el.style.borderColor = "hsl(228,18%,18%)"; el.style.background = "hsla(255,100%,100%,0.04)"; }}
            >
              <Pencil className="w-3 h-3" />
            </button>
            <button
              onClick={onDelete}
              data-testid={`button-delete-${item.id}`}
              title="Hapus"
              style={{ width: 28, height: 28, borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", background: "hsla(0,65%,55%,0.06)", border: "1px solid hsla(0,65%,55%,0.2)", color: "hsl(0,60%,55%)", cursor: "pointer", transition: "all 150ms" }}
              onMouseEnter={e => { const el = e.currentTarget; el.style.background = "hsla(0,65%,55%,0.14)"; el.style.borderColor = "hsla(0,65%,55%,0.5)"; }}
              onMouseLeave={e => { const el = e.currentTarget; el.style.background = "hsla(0,65%,55%,0.06)"; el.style.borderColor = "hsla(0,65%,55%,0.2)"; }}
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Badges row */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: pct !== null ? 8 : 0 }}>
          <span className={cfg.badge} style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px", borderRadius: 20, fontSize: 11, fontWeight: 500 }}>
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

          <div style={{ display: "flex", alignItems: "center", gap: 6, marginLeft: "auto" }}>
            {item.currentEpisode != null && item.totalEpisodes && (
              <span style={{ fontSize: 12, color: "hsl(220,12%,42%)" }}>Ep {item.currentEpisode}/{item.totalEpisodes}</span>
            )}
            {st === "watching" && item.totalEpisodes != null && (
              <button onClick={onEpisodeUp} data-testid={`button-episode-up-${item.id}`} title="Selesai nonton 1 episode"
                style={{ display: "inline-flex", alignItems: "center", gap: 3, padding: "2px 8px", borderRadius: 20, fontSize: 11, fontWeight: 600, background: "hsla(155,60%,45%,0.1)", border: "1px solid hsla(155,60%,45%,0.3)", color: "hsl(155,60%,60%)", cursor: "pointer", transition: "all 150ms", fontFamily: "'Inter',sans-serif" }}
                onMouseEnter={e => { const el = e.currentTarget; el.style.background = "hsla(155,60%,45%,0.2)"; el.style.borderColor = "hsla(155,60%,45%,0.55)"; }}
                onMouseLeave={e => { const el = e.currentTarget; el.style.background = "hsla(155,60%,45%,0.1)"; el.style.borderColor = "hsla(155,60%,45%,0.3)"; }}
              >
                <ChevronRight className="w-3 h-3" />+1 ep
              </button>
            )}
            {st === "watching" && item.totalEpisodes == null && (
              <button onClick={onEpisodeUp} data-testid={`button-episode-up-${item.id}`} title="Tandai sudah selesai ditonton"
                style={{ display: "inline-flex", alignItems: "center", gap: 3, padding: "2px 8px", borderRadius: 20, fontSize: 11, fontWeight: 600, background: "hsla(252,70%,60%,0.1)", border: "1px solid hsla(252,70%,60%,0.3)", color: "hsl(252,70%,75%)", cursor: "pointer", transition: "all 150ms", fontFamily: "'Inter',sans-serif" }}
                onMouseEnter={e => { const el = e.currentTarget; el.style.background = "hsla(252,70%,60%,0.2)"; el.style.borderColor = "hsla(252,70%,60%,0.55)"; }}
                onMouseLeave={e => { const el = e.currentTarget; el.style.background = "hsla(252,70%,60%,0.1)"; el.style.borderColor = "hsla(252,70%,60%,0.3)"; }}
              >
                <CheckCircle2 className="w-3 h-3" />Selesai
              </button>
            )}
          </div>
        </div>

        {/* Progress bar */}
        {pct !== null && (
          <div style={{ height: 2, borderRadius: 99, background: "hsla(255,100%,100%,0.06)", overflow: "hidden" }}>
            <div style={{
              height: "100%", borderRadius: 99,
              background: st === "completed" ? "hsl(252,70%,60%)" : st === "watching" ? "hsl(155,60%,45%)" : "hsl(214,80%,55%)",
              opacity: 0.7, width: `${pct}%`, transition: "width 400ms ease",
            }} />
          </div>
        )}

        {/* Tags */}
        {tagList.length > 0 && (
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 6 }}>
            {tagList.map(tag => (
              <button
                key={tag}
                onClick={() => onTagClick?.(tag)}
                style={{ fontSize: 10, padding: "1px 7px", borderRadius: 20, background: "hsla(252,70%,55%,0.08)", border: "1px solid hsla(252,70%,55%,0.2)", color: "hsl(252,70%,62%)", fontWeight: 500, cursor: onTagClick ? "pointer" : "default", fontFamily: "'Inter',sans-serif" }}
                title={onTagClick ? `Filter tag #${tag}` : undefined}
              >
                #{tag}
              </button>
            ))}
          </div>
        )}

        {/* Notes */}
        {item.notes && (
          <p style={{ fontSize: 12, color: "hsl(220,12%,38%)", marginTop: 6, fontStyle: "italic", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {item.notes}
          </p>
        )}

        {/* Dates */}
        {(item.startDate || item.endDate) && (
          <div style={{ display: "flex", gap: 10, marginTop: 5, flexWrap: "wrap" }}>
            {item.startDate && (
              <span style={{ fontSize: 10, color: "hsl(155,60%,45%)" }}>▶ {fmtDate(item.startDate)}</span>
            )}
            {item.endDate && (
              <span style={{ fontSize: 10, color: "hsl(252,70%,60%)" }}>✓ {fmtDate(item.endDate)}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Main page ── */
export function CategoryList({ category, title }: { category: string; title: string }) {
  const qc = useQueryClient();
  const { toast } = useToast();

  const [search,      setSearch]      = useState("");
  const [genre,       setGenre]       = useState("all");
  const [status,      setStatus]      = useState("all");
  const [sort,        setSort]        = useState<SortKey>("date-desc");
  const [sortOpen,    setSortOpen]    = useState(false);
  const [dlgOpen,     setDlgOpen]     = useState(false);
  const [editItem,    setEditItem]    = useState<Item | null>(null);
  const [delItem,     setDelItem]     = useState<Item | null>(null);
  const [shareItem,   setShareItem]   = useState<Item | null>(null);
  const [bulkOpen,    setBulkOpen]    = useState(false);
  const [viewMode,    setViewMode]    = useState<"list"|"grid">("list");
  const [ratingMin,   setRatingMin]   = useState<number|null>(null);
  const [tagFilter,   setTagFilter]   = useState<string|null>(null);

  const { data: items = [], isLoading } = useListMedia(
    { category },
    { query: { queryKey: getListMediaQueryKey({ category }) } }
  );
  const { data: allGenres = [] } = useListGenres({ query: { queryKey: getListGenresQueryKey() } });
  const delMedia = useDeleteMedia();
  const updMedia = useUpdateMedia();

  const myGenres = allGenres.filter(g => items.some(i => i.genre === g));

  function sortItems(list: Item[]): Item[] {
    return [...list].sort((a, b) => {
      switch (sort) {
        case "title-az":      return a.title.localeCompare(b.title);
        case "rating-desc":   return (b.rating ?? 0) - (a.rating ?? 0);
        case "date-asc":      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case "date-desc":     return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case "progress-desc": {
          const pa = a.totalEpisodes ? (a.currentEpisode ?? 0) / a.totalEpisodes : 0;
          const pb = b.totalEpisodes ? (b.currentEpisode ?? 0) / b.totalEpisodes : 0;
          return pb - pa;
        }
        default: return 0;
      }
    });
  }

  const shown = sortItems(
    items.filter(i => {
      const ms  = !search    || i.title.toLowerCase().includes(search.toLowerCase());
      const mg  = genre  === "all" || i.genre  === genre;
      const ms2 = status === "all" || i.status === status;
      const mr  = !ratingMin || (i.rating != null && i.rating >= ratingMin);
      const mt  = !tagFilter || (i.tags?.split(",").map(t => t.trim()).includes(tagFilter));
      return ms && mg && ms2 && mr && mt;
    })
  );

  const cnt = {
    total:   items.length,
    done:    items.filter(i => i.status === "completed").length,
    watch:   items.filter(i => i.status === "watching").length,
    plan:    items.filter(i => i.status === "plan-to-watch").length,
    dropped: items.filter(i => i.status === "dropped").length,
  };

  function inv() {
    qc.invalidateQueries({ queryKey: getListMediaQueryKey({ category }) });
    qc.invalidateQueries({ queryKey: getGetMediaStatsQueryKey() });
    qc.invalidateQueries({ queryKey: getGetDetailedStatsQueryKey() });
  }

  async function handleStatus(item: Item, s: Status) {
    try {
      await updMedia.mutateAsync({ id: item.id, data: { status: s } });
      inv();
      if (s === "completed") { fireConfetti(); toast({ title: `🎉 Selesai nonton "${item.title}"!` }); }
    }
    catch { toast({ title: "Gagal update status", variant: "destructive" }); }
  }

  async function handleEpisodeUp(item: Item) {
    const isMovie = item.totalEpisodes == null;
    try {
      if (isMovie) {
        await updMedia.mutateAsync({ id: item.id, data: { status: "completed" } });
        inv();
        fireConfetti();
        toast({ title: `🎉 Selesai nonton "${item.title}"!` });
      } else {
        const current = item.currentEpisode ?? 0;
        const next = current + 1;
        const finished = next >= item.totalEpisodes!;
        await updMedia.mutateAsync({ id: item.id, data: { currentEpisode: finished ? item.totalEpisodes! : next, ...(finished ? { status: "completed" } : {}) } });
        inv();
        if (finished) { fireConfetti(); toast({ title: `🎉 Selesai! "${item.title}" tamat.` }); }
        else toast({ title: `Ep ${next}/${item.totalEpisodes} — ${item.title}`, duration: 2000 });
      }
    } catch { toast({ title: "Gagal update", variant: "destructive" }); }
  }

  function handleRandomPick() {
    const pool = items.filter(i => i.status === "plan-to-watch");
    if (pool.length === 0) { toast({ title: "Tidak ada judul di Mau Nonton!" }); return; }
    const picked = pool[Math.floor(Math.random() * pool.length)];
    toast({ title: `🎲 ${picked.title}`, description: "Tonton ini berikutnya!" });
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

  async function handleExport() {
    try {
      const res = await fetch("/api/media/export");
      const data: Item[] = await res.json();
      const filtered = data.filter(i => i.category === category);
      const blob = new Blob([JSON.stringify(filtered, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `neonwatch-${category}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: `${filtered.length} judul diekspor` });
    } catch { toast({ title: "Gagal ekspor", variant: "destructive" }); }
  }

  function openAdd()         { setEditItem(null); setDlgOpen(true); }
  function openEdit(i: Item) { setEditItem(i);    setDlgOpen(true); }
  function onFormDone()      { inv(); qc.invalidateQueries({ queryKey: getListGenresQueryKey() }); }

  const currentSortLabel = SORT_OPTIONS.find(o => o.value === sort)?.label ?? "Urutkan";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }} className="pb-20 md:pb-0 animate-in fade-in duration-300">

      {/* ── Header ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between" style={{ paddingTop: 4 }}>
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl" style={{ fontFamily: "'Sora',sans-serif", fontWeight: 800, letterSpacing: "-0.5px", color: "hsl(220,18%,91%)", marginBottom: 4, lineHeight: 1.15 }}>
            {title}<span className="glow-text">.</span>
          </h1>
          <div style={{ display: "flex", gap: 6, fontSize: 12, color: "hsl(220,12%,42%)", flexWrap: "wrap", alignItems: "center" }}>
            <span>{cnt.total} total</span>
            {cnt.watch   > 0 && <><span>·</span><span style={{ color: "hsl(155,60%,58%)" }}>{cnt.watch} watching</span></>}
            {cnt.done    > 0 && <><span>·</span><span style={{ color: "hsl(252,70%,72%)" }}>{cnt.done} selesai</span></>}
            {cnt.plan    > 0 && <><span>·</span><span style={{ color: "hsl(214,80%,65%)" }}>{cnt.plan} planned</span></>}
            {cnt.dropped > 0 && <><span>·</span><span style={{ color: "hsl(220,10%,45%)" }}>{cnt.dropped} dropped</span></>}
          </div>
        </div>
        <div className="flex gap-2 items-center flex-shrink-0 flex-wrap">
          {/* Random pick */}
          <button onClick={handleRandomPick} title="Pilihkan judul secara acak dari Mau Nonton"
            style={{ height: 32, width: 32, borderRadius: 8, background: "hsla(255,100%,100%,0.04)", border: "1px solid hsl(228,18%,20%)", color: "hsl(220,12%,50%)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Shuffle className="w-3.5 h-3.5" />
          </button>
          {/* Grid / List toggle */}
          <button onClick={() => setViewMode(v => v === "list" ? "grid" : "list")} title={viewMode === "list" ? "Tampilan grid" : "Tampilan list"}
            style={{ height: 32, width: 32, borderRadius: 8, background: viewMode === "grid" ? "hsla(252,70%,65%,0.15)" : "hsla(255,100%,100%,0.04)", border: viewMode === "grid" ? "1px solid hsla(252,70%,65%,0.4)" : "1px solid hsl(228,18%,20%)", color: viewMode === "grid" ? "hsl(252,70%,72%)" : "hsl(220,12%,50%)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            {viewMode === "list" ? <LayoutGrid className="w-3.5 h-3.5" /> : <LayoutList className="w-3.5 h-3.5" />}
          </button>
          <button onClick={() => setBulkOpen(true)} title="Import massal"
            style={{ height: 32, padding: "0 10px", borderRadius: 8, fontSize: 12, fontWeight: 500, background: "hsla(255,100%,100%,0.04)", border: "1px solid hsl(228,18%,20%)", color: "hsl(220,12%,50%)", cursor: "pointer", display: "flex", alignItems: "center", gap: 5, fontFamily: "'Inter',sans-serif", whiteSpace: "nowrap" }}>
            <Upload className="w-3 h-3" />Import
          </button>
          <button onClick={handleExport} title="Export JSON"
            style={{ height: 32, padding: "0 10px", borderRadius: 8, fontSize: 12, fontWeight: 500, background: "hsla(255,100%,100%,0.04)", border: "1px solid hsl(228,18%,20%)", color: "hsl(220,12%,50%)", cursor: "pointer", display: "flex", alignItems: "center", gap: 5, fontFamily: "'Inter',sans-serif", whiteSpace: "nowrap" }}>
            <Download className="w-3 h-3" />Export
          </button>
          <button onClick={openAdd} className="btn-primary" data-testid="button-add" style={{ whiteSpace: "nowrap" }}>
            <Plus className="w-3.5 h-3.5" />Tambah
          </button>
        </div>
      </div>

      {/* ── Search ── */}
      <div style={{ position: "relative" }}>
        <Search style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", width: 15, height: 15, color: "hsl(220,12%,40%)" }} />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={`Cari ${title.toLowerCase()}...`}
          data-testid="input-search"
          style={{ width: "100%", padding: "9px 12px 9px 36px", borderRadius: 10, fontSize: 13, background: "hsl(228,20%,10%)", border: "1px solid hsl(228,18%,16%)", color: "hsl(220,18%,88%)", outline: "none", fontFamily: "'Inter',sans-serif" }}
        />
      </div>

      {/* ── Status filter + Sort ── */}
      <div className="flex items-start gap-2">
        <div className="flex gap-1.5 flex-wrap flex-1">
          {([["all","Semua"], ["plan-to-watch","Mau Nonton"], ["watching","Lagi Nonton"], ["completed","Selesai"], ["dropped","Dropped"]] as const).map(([v, lbl]) => (
            <button key={v} onClick={() => setStatus(v)} className={cn("pill", status === v && "pill-active")} data-testid={`filter-status-${v}`}>
              {lbl}
            </button>
          ))}
        </div>
        {/* Sort dropdown — always flush right */}
        <div style={{ position: "relative", flexShrink: 0 }}>
          <button
            onClick={() => setSortOpen(o => !o)}
            style={{ height: 28, padding: "0 10px", borderRadius: 8, fontSize: 12, fontWeight: 500, background: "hsla(255,100%,100%,0.04)", border: "1px solid hsl(228,18%,20%)", color: "hsl(220,12%,50%)", cursor: "pointer", display: "flex", alignItems: "center", gap: 5, fontFamily: "'Inter',sans-serif", whiteSpace: "nowrap" }}
          >
            <ArrowUpDown className="w-3 h-3" />
            <span className="hidden sm:inline">{currentSortLabel}</span>
          </button>
          {sortOpen && (
            <div style={{ position: "absolute", right: 0, top: "calc(100% + 6px)", zIndex: 50, background: "hsl(228,22%,9%)", border: "1px solid hsl(228,18%,18%)", borderRadius: 10, overflow: "hidden", minWidth: 130, boxShadow: "0 8px 24px hsla(0,0%,0%,0.4)" }}>
              {SORT_OPTIONS.map(o => (
                <button
                  key={o.value}
                  onClick={() => { setSort(o.value); setSortOpen(false); }}
                  style={{ width: "100%", padding: "8px 14px", textAlign: "left", fontSize: 12, background: sort === o.value ? "hsla(252,70%,65%,0.1)" : "transparent", color: sort === o.value ? "hsl(252,70%,75%)" : "hsl(220,12%,55%)", border: "none", cursor: "pointer", fontFamily: "'Inter',sans-serif" }}
                >
                  {o.label}
                </button>
              ))}
            </div>
          )}
        </div>
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

      {/* ── Rating filter ── */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <span style={{ fontSize: 11, color: "hsl(220,12%,38%)", fontWeight: 500 }}>Rating:</span>
        {([null, 7, 8, 9] as const).map(r => (
          <button
            key={r ?? "all"}
            onClick={() => setRatingMin(r)}
            style={{
              height: 24, padding: "0 10px", borderRadius: 20, fontSize: 11, fontWeight: 500,
              background: ratingMin === r ? "hsla(40,85%,55%,0.15)" : "transparent",
              border: ratingMin === r ? "1px solid hsla(40,85%,55%,0.5)" : "1px solid hsl(228,18%,18%)",
              color: ratingMin === r ? "hsl(40,85%,68%)" : "hsl(220,12%,42%)",
              cursor: "pointer", fontFamily: "'Inter',sans-serif",
            }}
          >
            {r === null ? "Semua" : `≥${r} ⭐`}
          </button>
        ))}
        {/* Active tag filter chip */}
        {tagFilter && (
          <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "2px 8px 2px 10px", borderRadius: 20, background: "hsla(252,70%,55%,0.12)", border: "1px solid hsla(252,70%,55%,0.35)", color: "hsl(252,70%,72%)", fontSize: 11, fontWeight: 500, marginLeft: 4 }}>
            #{tagFilter}
            <button onClick={() => setTagFilter(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "hsl(252,70%,60%)", display: "flex", padding: 0 }}>
              <X className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>

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
              <Plus className="w-3.5 h-3.5" />Tambah yang pertama
            </button>
          )}
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3" onClick={() => sortOpen && setSortOpen(false)}>
          {shown.map(item => {
            const it = item as Item;
            const st = (it.status as Status) in STATUS_CONFIG ? it.status as Status : "plan-to-watch";
            const cfg = STATUS_CONFIG[st];
            const Icon = cfg.icon;
            const initials = it.title.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase();
            return (
              <div key={it.id} style={{ display: "flex", flexDirection: "column", overflow: "hidden", borderRadius: 12, background: "hsl(228,22%,10%)", border: "1px solid hsl(228,18%,16%)" }}>
                {/* ── Poster ── */}
                <div style={{ position: "relative", aspectRatio: "2/3", overflow: "hidden" }}>
                  {it.imageUrl ? (
                    <img
                      src={it.imageUrl}
                      alt={it.title}
                      style={{ width: "100%", height: "100%", objectFit: "cover", opacity: st === "dropped" ? 0.35 : 1, display: "block" }}
                    />
                  ) : (
                    /* Placeholder gradient */
                    <div style={{
                      width: "100%", height: "100%",
                      background: `linear-gradient(135deg, hsl(228,22%,13%) 0%, hsl(252,30%,18%) 100%)`,
                      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6,
                    }}>
                      <span style={{ fontSize: 28, fontWeight: 800, fontFamily: "'Sora',sans-serif", color: "hsla(252,60%,70%,0.25)", letterSpacing: 1 }}>{initials}</span>
                      <Icon style={{ width: 20, height: 20, color: "hsla(252,60%,70%,0.15)" }} />
                    </div>
                  )}

                  {/* Rating pill — top-right, only when has image */}
                  {it.rating != null && it.imageUrl && (
                    <span style={{
                      position: "absolute", top: 7, right: 7,
                      display: "inline-flex", alignItems: "center", gap: 3,
                      fontSize: 11, fontWeight: 700, color: "hsl(40,85%,62%)",
                      background: "hsla(228,28%,6%,0.82)", backdropFilter: "blur(4px)",
                      padding: "2px 7px", borderRadius: 20,
                    }}>
                      <Star className="w-2.5 h-2.5" style={{ fill: "hsl(40,85%,62%)" }} />{it.rating}
                    </span>
                  )}

                  {/* Gradient scrim at bottom for dropped/no-image state */}
                  {st !== "watching" && st !== "plan-to-watch" && it.imageUrl && (
                    <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, hsla(228,22%,7%,0.6) 0%, transparent 50%)" }} />
                  )}
                </div>

                {/* ── Info + Actions ── */}
                <div style={{ padding: "9px 10px 10px", display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
                  {/* Status badge */}
                  <span className={cfg.badge} style={{ alignSelf: "flex-start", display: "inline-flex", alignItems: "center", gap: 3, padding: "2px 8px", borderRadius: 20, fontSize: 9, fontWeight: 600 }}>
                    <Icon className="w-2 h-2" />{cfg.label}
                  </span>

                  {/* Title */}
                  <p style={{
                    fontSize: 12, fontWeight: 700, fontFamily: "'Sora',sans-serif", lineHeight: 1.3,
                    color: st === "dropped" ? "hsl(220,12%,32%)" : "hsl(220,18%,90%)",
                    textDecoration: st === "dropped" ? "line-through" : "none",
                    overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
                  }}>
                    {it.title}
                  </p>

                  {/* Genre / episode */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 1, marginTop: 1 }}>
                    {it.genre && <span style={{ fontSize: 9, color: "hsl(220,12%,35%)", fontWeight: 500 }}>{it.genre}</span>}
                    {it.totalEpisodes != null && (
                      <span style={{ fontSize: 9, color: "hsl(220,12%,30%)" }}>
                        Ep {it.currentEpisode ?? 0}/{it.totalEpisodes}
                      </span>
                    )}
                    {it.rating != null && !it.imageUrl && (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 2, fontSize: 10, color: "hsl(40,85%,60%)", fontWeight: 700, marginTop: 2 }}>
                        <Star className="w-2.5 h-2.5" style={{ fill: "hsl(40,85%,60%)" }} />{it.rating}
                      </span>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div style={{ display: "flex", gap: 5, marginTop: "auto", paddingTop: 6 }}>
                    <button
                      onClick={() => openEdit(it)}
                      style={{ flex: 1, height: 26, borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", gap: 4, background: "hsla(255,100%,100%,0.04)", border: "1px solid hsl(228,18%,20%)", color: "hsl(220,12%,52%)", cursor: "pointer", fontSize: 10, fontWeight: 500, fontFamily: "'Inter',sans-serif" }}
                    >
                      <Pencil className="w-2.5 h-2.5" />Edit
                    </button>
                    <button
                      onClick={() => setDelItem(it)}
                      style={{ width: 26, height: 26, borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", background: "hsla(0,65%,55%,0.08)", border: "1px solid hsla(0,65%,45%,0.25)", color: "hsl(0,60%,55%)", cursor: "pointer", flexShrink: 0 }}
                    >
                      <Trash2 className="w-2.5 h-2.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }} onClick={() => sortOpen && setSortOpen(false)}>
          {shown.map(item => (
            <ItemCard
              key={item.id}
              item={item as Item}
              onEdit={() => openEdit(item as Item)}
              onDelete={() => setDelItem(item as Item)}
              onStatus={s => handleStatus(item as Item, s)}
              onEpisodeUp={() => handleEpisodeUp(item as Item)}
              onShare={() => setShareItem(item as Item)}
              onTagClick={tag => setTagFilter(tag)}
            />
          ))}
        </div>
      )}

      {/* ── Dialogs ── */}
      <ItemDialog
        key={editItem?.id ?? "new"}
        open={dlgOpen} onOpenChange={setDlgOpen}
        item={editItem} category={category} title={title}
        onSuccess={onFormDone}
        existingItems={items as Item[]}
      />

      {shareItem && (
        <ShareCardDialog
          item={shareItem}
          open={!!shareItem}
          onClose={() => setShareItem(null)}
        />
      )}

      <BulkImportDialog
        open={bulkOpen}
        onClose={() => setBulkOpen(false)}
        category={category}
        onDone={onFormDone}
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
            <AlertDialogCancel style={{ background: "transparent", border: "1px solid hsl(228,18%,20%)", color: "hsl(220,12%,50%)", borderRadius: 8, fontSize: 13 }} data-testid="button-cancel-delete">
              Batal
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} style={{ background: "hsla(0,65%,55%,0.12)", border: "1px solid hsla(0,65%,55%,0.35)", color: "hsl(0,65%,65%)", borderRadius: 8, fontSize: 13 }} data-testid="button-confirm-delete">
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
