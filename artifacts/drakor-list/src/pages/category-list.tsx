import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListMedia, useCreateMedia, useUpdateMedia, useDeleteMedia, useListGenres,
  getListMediaQueryKey, getListGenresQueryKey, getGetMediaStatsQueryKey,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Search, Plus, Pencil, Trash2, CheckCircle2, Clock, Play, XCircle, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

type MediaStatus = "plan-to-watch" | "watching" | "completed" | "dropped";

const STATUS_OPTIONS: { value: MediaStatus; label: string; cls: string; icon: React.ElementType; dot: string }[] = [
  { value: "plan-to-watch", label: "Plan to Watch", cls: "status-plan",      icon: Clock,        dot: "bg-sky-400" },
  { value: "watching",      label: "Watching",      cls: "status-watching",  icon: Play,         dot: "bg-emerald-400" },
  { value: "completed",     label: "Completed",     cls: "status-completed", icon: CheckCircle2, dot: "bg-violet-400" },
  { value: "dropped",       label: "Dropped",       cls: "status-dropped",   icon: XCircle,      dot: "bg-zinc-500" },
];

const GENRES = [
  "Romance","Action","Comedy","Thriller","Fantasy",
  "Slice of Life","Horror","Mystery","Sci-Fi","Drama",
  "Historical","Crime","Sports","School","Family",
];

const formSchema = z.object({
  title:          z.string().min(1, "Title is required"),
  genre:          z.string().optional(),
  status:         z.enum(["plan-to-watch","watching","completed","dropped"]),
  rating:         z.coerce.number().min(1).max(10).optional().or(z.literal("")),
  totalEpisodes:  z.coerce.number().min(1).optional().or(z.literal("")),
  currentEpisode: z.coerce.number().min(0).optional().or(z.literal("")),
  notes:          z.string().optional(),
});
type FormValues = z.infer<typeof formSchema>;

interface MediaItem {
  id: number; title: string; category: string; genre?: string | null;
  status: string; rating?: number | null; notes?: string | null;
  totalEpisodes?: number | null; currentEpisode?: number | null; createdAt: string;
}

function StatusBadge({ status }: { status: string }) {
  const opt = STATUS_OPTIONS.find(s => s.value === status) ?? STATUS_OPTIONS[0];
  const Icon = opt.icon;
  return (
    <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded border text-xs", opt.cls)}>
      <Icon className="w-2.5 h-2.5" />
      {opt.label}
    </span>
  );
}

function MediaFormDialog({
  open, onOpenChange, item, category, title, onSuccess,
}: {
  open: boolean; onOpenChange: (v: boolean) => void;
  item?: MediaItem | null; category: string; title: string; onSuccess: () => void;
}) {
  const { toast } = useToast();
  const createMedia = useCreateMedia();
  const updateMedia = useUpdateMedia();
  const isEditing = !!item;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title:          item?.title ?? "",
      genre:          item?.genre ?? "",
      status:         (item?.status as MediaStatus) ?? "plan-to-watch",
      rating:         item?.rating ?? "",
      totalEpisodes:  item?.totalEpisodes ?? "",
      currentEpisode: item?.currentEpisode ?? "",
      notes:          item?.notes ?? "",
    },
  });

  async function onSubmit(values: FormValues) {
    const payload = {
      title: values.title, category,
      genre:          values.genre          || undefined,
      status:         values.status,
      rating:         values.rating         === "" ? undefined : Number(values.rating),
      totalEpisodes:  values.totalEpisodes  === "" ? undefined : Number(values.totalEpisodes),
      currentEpisode: values.currentEpisode === "" ? undefined : Number(values.currentEpisode),
      notes:          values.notes          || undefined,
    };
    try {
      if (isEditing) {
        await updateMedia.mutateAsync({ id: item.id, data: payload });
        toast({ title: "Updated" });
      } else {
        await createMedia.mutateAsync({ data: payload });
        toast({ title: "Added to list" });
      }
      onSuccess();
      onOpenChange(false);
    } catch {
      toast({ title: "Something went wrong", variant: "destructive" });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[hsl(222,25%,8%)] border-white/8 max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-base">
            {isEditing ? "Edit" : <><span className="neon-text">+</span> Add to</>} {title}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-1">
            <FormField control={form.control} name="title" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs text-muted-foreground">Title</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Enter title..." className="bg-white/4 border-white/8 text-sm h-9 focus-visible:border-primary/50 focus-visible:ring-0" data-testid="input-title" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <div className="grid grid-cols-2 gap-3">
              <FormField control={form.control} name="genre" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs text-muted-foreground">Genre</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="bg-white/4 border-white/8 text-sm h-9" data-testid="select-genre">
                        <SelectValue placeholder="Genre" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-[hsl(222,25%,8%)] border-white/8">
                      {GENRES.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </FormItem>
              )} />
              <FormField control={form.control} name="status" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs text-muted-foreground">Status</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="bg-white/4 border-white/8 text-sm h-9" data-testid="select-status">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-[hsl(222,25%,8%)] border-white/8">
                      {STATUS_OPTIONS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </FormItem>
              )} />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <FormField control={form.control} name="rating" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs text-muted-foreground">Rating</FormLabel>
                  <FormControl>
                    <Input {...field} type="number" min={1} max={10} placeholder="1–10" className="bg-white/4 border-white/8 text-sm h-9" data-testid="input-rating" />
                  </FormControl>
                </FormItem>
              )} />
              <FormField control={form.control} name="totalEpisodes" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs text-muted-foreground">Total Eps</FormLabel>
                  <FormControl>
                    <Input {...field} type="number" min={1} placeholder="—" className="bg-white/4 border-white/8 text-sm h-9" data-testid="input-total-episodes" />
                  </FormControl>
                </FormItem>
              )} />
              <FormField control={form.control} name="currentEpisode" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs text-muted-foreground">Current</FormLabel>
                  <FormControl>
                    <Input {...field} type="number" min={0} placeholder="—" className="bg-white/4 border-white/8 text-sm h-9" data-testid="input-current-episode" />
                  </FormControl>
                </FormItem>
              )} />
            </div>

            <FormField control={form.control} name="notes" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs text-muted-foreground">Notes</FormLabel>
                <FormControl>
                  <Textarea {...field} placeholder="Optional notes..." className="bg-white/4 border-white/8 resize-none text-sm" rows={2} data-testid="input-notes" />
                </FormControl>
              </FormItem>
            )} />

            <DialogFooter className="gap-2 pt-1">
              <Button type="button" variant="ghost" size="sm" onClick={() => onOpenChange(false)} className="text-muted-foreground" data-testid="button-cancel">
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={createMedia.isPending || updateMedia.isPending}
                className="btn-neon font-medium"
                data-testid="button-submit"
              >
                {isEditing ? "Save" : "Add"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function MediaCard({
  item, onEdit, onDelete, onStatusChange,
}: {
  item: MediaItem;
  onEdit: (item: MediaItem) => void;
  onDelete: (item: MediaItem) => void;
  onStatusChange: (item: MediaItem, status: MediaStatus) => void;
}) {
  const nextStatus: Record<string, MediaStatus> = {
    "plan-to-watch": "watching",
    watching: "completed",
    completed: "dropped",
    dropped: "plan-to-watch",
  };

  const pct = item.totalEpisodes && item.currentEpisode != null
    ? Math.round((item.currentEpisode / item.totalEpisodes) * 100) : null;

  const barColor: Record<string, string> = {
    watching:    "bg-gradient-to-r from-emerald-600 to-emerald-400",
    completed:   "bg-gradient-to-r from-violet-600 to-violet-400",
    "plan-to-watch": "bg-gradient-to-r from-sky-700 to-sky-500",
    dropped:     "bg-zinc-700",
  };

  const toggleRing: Record<string, string> = {
    "plan-to-watch": "border-sky-800 hover:border-sky-500",
    watching:        "border-emerald-700 bg-emerald-950/40",
    completed:       "border-violet-600 bg-violet-950/50",
    dropped:         "border-zinc-700 bg-zinc-900/40",
  };

  return (
    <div
      className="glass-card px-4 py-3.5 flex items-start gap-3 group"
      data-testid={`card-media-${item.id}`}
    >
      {/* Status circle */}
      <button
        onClick={() => onStatusChange(item, nextStatus[item.status] ?? "plan-to-watch")}
        className={cn(
          "mt-0.5 flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-200",
          toggleRing[item.status]
        )}
        title="Click to cycle status"
        data-testid={`button-status-toggle-${item.id}`}
      >
        {item.status === "completed"    && <CheckCircle2 className="w-3 h-3 text-violet-400" style={{ filter: "drop-shadow(0 0 4px hsl(262,65%,62%))" }} />}
        {item.status === "watching"     && <Play className="w-2.5 h-2.5 text-emerald-400" />}
        {item.status === "dropped"      && <XCircle className="w-3 h-3 text-zinc-600" />}
      </button>

      <div className="flex-1 min-w-0 space-y-1.5">
        {/* Title + actions */}
        <div className="flex items-start justify-between gap-2">
          <p className={cn(
            "text-sm font-medium leading-snug",
            item.status === "dropped"   && "line-through text-muted-foreground/60",
            item.status === "completed" && "text-violet-300",
          )}>
            {item.title}
          </p>
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
            <button onClick={() => onEdit(item)} className="p-1 rounded hover:bg-white/6 text-muted-foreground hover:text-foreground transition-colors" data-testid={`button-edit-${item.id}`}>
              <Pencil className="w-3 h-3" />
            </button>
            <button onClick={() => onDelete(item)} className="p-1 rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors" data-testid={`button-delete-${item.id}`}>
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Meta row */}
        <div className="flex items-center gap-2 flex-wrap">
          <StatusBadge status={item.status} />
          {item.genre && (
            <span className="text-xs text-muted-foreground/70">{item.genre}</span>
          )}
          {item.rating && (
            <span className="flex items-center gap-0.5 text-xs text-amber-400/80">
              <Star className="w-2.5 h-2.5 fill-amber-400/50" />{item.rating}
            </span>
          )}
        </div>

        {/* Episode progress */}
        {pct !== null && (
          <div className="space-y-1">
            <div className="flex justify-between text-[11px] text-muted-foreground/60">
              <span>Ep {item.currentEpisode} / {item.totalEpisodes}</span>
              <span>{pct}%</span>
            </div>
            <div className="h-0.5 rounded-full bg-white/5 overflow-hidden">
              <div className={cn("h-full rounded-full opacity-70", barColor[item.status] ?? "bg-primary")} style={{ width: `${pct}%` }} />
            </div>
          </div>
        )}

        {/* Notes */}
        {item.notes && (
          <p className="text-[11px] text-muted-foreground/50 truncate italic">{item.notes}</p>
        )}
      </div>
    </div>
  );
}

export function CategoryList({ category, title }: { category: string; title: string }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [search, setSearch]               = useState("");
  const [selectedGenre, setSelectedGenre] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [dialogOpen, setDialogOpen]       = useState(false);
  const [editItem, setEditItem]           = useState<MediaItem | null>(null);
  const [deleteItem, setDeleteItem]       = useState<MediaItem | null>(null);

  const { data: items = [], isLoading } = useListMedia(
    { category },
    { query: { queryKey: getListMediaQueryKey({ category }) } }
  );
  const { data: allGenres = [] } = useListGenres({
    query: { queryKey: getListGenresQueryKey() },
  });
  const deleteMedia = useDeleteMedia();
  const updateMedia = useUpdateMedia();

  const filtered = items.filter(item => {
    const matchSearch  = !search || item.title.toLowerCase().includes(search.toLowerCase());
    const matchGenre   = selectedGenre  === "all" || item.genre   === selectedGenre;
    const matchStatus  = selectedStatus === "all" || item.status  === selectedStatus;
    return matchSearch && matchGenre && matchStatus;
  });

  const counts = {
    total:       items.length,
    completed:   items.filter(i => i.status === "completed").length,
    watching:    items.filter(i => i.status === "watching").length,
    planToWatch: items.filter(i => i.status === "plan-to-watch").length,
    dropped:     items.filter(i => i.status === "dropped").length,
  };

  const categoryGenres = allGenres.filter(g => items.some(i => i.genre === g));

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: getListMediaQueryKey({ category }) });
    queryClient.invalidateQueries({ queryKey: getGetMediaStatsQueryKey() });
  }

  async function handleStatusChange(item: MediaItem, status: MediaStatus) {
    try {
      await updateMedia.mutateAsync({ id: item.id, data: { status } });
      invalidate();
    } catch {
      toast({ title: "Failed to update", variant: "destructive" });
    }
  }

  async function handleDelete() {
    if (!deleteItem) return;
    try {
      await deleteMedia.mutateAsync({ id: deleteItem.id });
      invalidate();
      queryClient.invalidateQueries({ queryKey: getListGenresQueryKey() });
      toast({ title: "Removed" });
    } catch {
      toast({ title: "Failed to delete", variant: "destructive" });
    } finally {
      setDeleteItem(null);
    }
  }

  function handleFormSuccess() {
    invalidate();
    queryClient.invalidateQueries({ queryKey: getListGenresQueryKey() });
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-20 md:pb-0">
      {/* Header */}
      <div className="flex items-start justify-between pt-1">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground mb-1">
            {title}<span className="neon-text">.</span>
          </h1>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground flex-wrap">
            <span>{counts.total} total</span>
            {counts.watching   > 0 && <><span>·</span><span className="text-emerald-400">{counts.watching} watching</span></>}
            {counts.completed  > 0 && <><span>·</span><span className="text-violet-400">{counts.completed} done</span></>}
            {counts.planToWatch > 0 && <><span>·</span><span className="text-sky-400">{counts.planToWatch} planned</span></>}
            {counts.dropped    > 0 && <><span>·</span><span className="text-zinc-500">{counts.dropped} dropped</span></>}
          </div>
        </div>

        <button
          onClick={() => { setEditItem(null); setDialogOpen(true); }}
          className="btn-neon flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium"
          data-testid="button-add"
        >
          <Plus className="w-3.5 h-3.5" />
          Add
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={`Search ${title.toLowerCase()}...`}
          className="pl-9 bg-white/4 border-white/8 text-sm h-9 focus-visible:border-primary/40 focus-visible:ring-0"
          data-testid="input-search"
        />
      </div>

      {/* Status pills */}
      <div className="flex gap-1.5 flex-wrap">
        {["all", ...STATUS_OPTIONS.map(s => s.value)].map(v => {
          const opt = STATUS_OPTIONS.find(s => s.value === v);
          const label = v === "all" ? "All" : (opt?.label ?? v);
          const isActive = selectedStatus === v;
          return (
            <button
              key={v}
              onClick={() => setSelectedStatus(v)}
              className={cn(
                "px-3 py-1 rounded-md text-xs font-medium border transition-all duration-150",
                isActive
                  ? "pill-active"
                  : "border-white/8 text-muted-foreground hover:text-foreground hover:border-white/15"
              )}
              data-testid={`filter-status-${v}`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Genre pills */}
      {categoryGenres.length > 0 && (
        <div className="flex gap-1.5 flex-wrap">
          {["all", ...categoryGenres].map(g => {
            const isActive = selectedGenre === g;
            return (
              <button
                key={g}
                onClick={() => setSelectedGenre(g)}
                className={cn(
                  "px-3 py-1 rounded-md text-xs font-medium border transition-all duration-150",
                  isActive
                    ? "pill-active-genre"
                    : "border-white/8 text-muted-foreground hover:text-foreground hover:border-white/15"
                )}
                data-testid={`filter-genre-${g}`}
              >
                {g === "all" ? "All genres" : g}
              </button>
            );
          })}
        </div>
      )}

      {/* List */}
      {isLoading ? (
        <div className="space-y-2">
          {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-16 rounded-lg bg-muted/50" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-card p-10 text-center">
          <p className="text-sm text-muted-foreground mb-4">
            {items.length === 0 ? `Nothing here yet — add your first ${title} entry!` : "No items match your filters."}
          </p>
          {items.length === 0 && (
            <button
              onClick={() => { setEditItem(null); setDialogOpen(true); }}
              className="btn-neon inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium"
              data-testid="button-add-empty"
            >
              <Plus className="w-3.5 h-3.5" />
              Add first entry
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(item => (
            <MediaCard
              key={item.id}
              item={item as MediaItem}
              onEdit={item => { setEditItem(item); setDialogOpen(true); }}
              onDelete={setDeleteItem}
              onStatusChange={handleStatusChange}
            />
          ))}
        </div>
      )}

      <MediaFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        item={editItem}
        category={category}
        title={title}
        onSuccess={handleFormSuccess}
      />

      <AlertDialog open={!!deleteItem} onOpenChange={v => !v && setDeleteItem(null)}>
        <AlertDialogContent className="bg-[hsl(222,25%,8%)] border-white/8">
          <AlertDialogHeader>
            <AlertDialogTitle>Remove from list?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground text-sm">
              This will permanently remove <span className="text-foreground font-medium">"{deleteItem?.title}"</span>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-transparent border-white/8 text-sm" data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 text-sm"
              data-testid="button-confirm-delete"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
