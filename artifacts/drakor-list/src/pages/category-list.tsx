import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListMedia,
  useCreateMedia,
  useUpdateMedia,
  useDeleteMedia,
  useListGenres,
  getListMediaQueryKey,
  getListGenresQueryKey,
  getGetMediaStatsQueryKey,
} from "@workspace/api-client-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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

const STATUS_OPTIONS: { value: MediaStatus; label: string; cls: string; icon: React.ElementType }[] = [
  { value: "plan-to-watch", label: "Plan to Watch", cls: "status-plan",      icon: Clock },
  { value: "watching",      label: "Watching",      cls: "status-watching",  icon: Play },
  { value: "completed",     label: "Completed",     cls: "status-completed", icon: CheckCircle2 },
  { value: "dropped",       label: "Dropped",       cls: "status-dropped",   icon: XCircle },
];

const GENRES = [
  "Romance", "Action", "Comedy", "Thriller", "Fantasy",
  "Slice of Life", "Horror", "Mystery", "Sci-Fi", "Drama",
  "Historical", "Crime", "Sports", "School", "Family",
];

const formSchema = z.object({
  title:          z.string().min(1, "Title is required"),
  genre:          z.string().optional(),
  status:         z.enum(["plan-to-watch", "watching", "completed", "dropped"]),
  rating:         z.coerce.number().min(1).max(10).optional().or(z.literal("")),
  totalEpisodes:  z.coerce.number().min(1).optional().or(z.literal("")),
  currentEpisode: z.coerce.number().min(0).optional().or(z.literal("")),
  notes:          z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface MediaItem {
  id: number;
  title: string;
  category: string;
  genre?: string | null;
  status: string;
  rating?: number | null;
  notes?: string | null;
  totalEpisodes?: number | null;
  currentEpisode?: number | null;
  createdAt: string;
}

interface CategoryListProps {
  category: string;
  title: string;
}

function StatusBadge({ status }: { status: string }) {
  const opt = STATUS_OPTIONS.find(s => s.value === status) ?? STATUS_OPTIONS[0];
  const Icon = opt.icon;
  return (
    <Badge className={cn("border text-xs gap-1 px-2 py-0.5 font-normal", opt.cls)}>
      <Icon className="w-3 h-3" />
      {opt.label}
    </Badge>
  );
}

function MediaFormDialog({
  open, onOpenChange, item, category, onSuccess,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  item?: MediaItem | null;
  category: string;
  onSuccess: () => void;
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
      title:          values.title,
      category,
      genre:          values.genre || undefined,
      status:         values.status,
      rating:         values.rating === "" ? undefined : Number(values.rating),
      totalEpisodes:  values.totalEpisodes === "" ? undefined : Number(values.totalEpisodes),
      currentEpisode: values.currentEpisode === "" ? undefined : Number(values.currentEpisode),
      notes:          values.notes || undefined,
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
      <DialogContent className="bg-[hsl(224,18%,10%)] border-border max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-lg">
            {isEditing ? "Edit" : "Add to"} {title}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-1">
            <FormField control={form.control} name="title" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm text-muted-foreground">Title</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Enter title..." className="bg-muted/50 border-border" data-testid="input-title" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <div className="grid grid-cols-2 gap-3">
              <FormField control={form.control} name="genre" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm text-muted-foreground">Genre</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="bg-muted/50 border-border" data-testid="select-genre">
                        <SelectValue placeholder="Genre" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-[hsl(224,18%,10%)] border-border">
                      {GENRES.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="status" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm text-muted-foreground">Status</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="bg-muted/50 border-border" data-testid="select-status">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-[hsl(224,18%,10%)] border-border">
                      {STATUS_OPTIONS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <FormField control={form.control} name="rating" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm text-muted-foreground">Rating</FormLabel>
                  <FormControl>
                    <Input {...field} type="number" min={1} max={10} placeholder="1–10" className="bg-muted/50 border-border" data-testid="input-rating" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="totalEpisodes" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm text-muted-foreground">Total Eps</FormLabel>
                  <FormControl>
                    <Input {...field} type="number" min={1} placeholder="—" className="bg-muted/50 border-border" data-testid="input-total-episodes" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="currentEpisode" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm text-muted-foreground">Current</FormLabel>
                  <FormControl>
                    <Input {...field} type="number" min={0} placeholder="—" className="bg-muted/50 border-border" data-testid="input-current-episode" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <FormField control={form.control} name="notes" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm text-muted-foreground">Notes</FormLabel>
                <FormControl>
                  <Textarea {...field} placeholder="Optional notes..." className="bg-muted/50 border-border resize-none text-sm" rows={2} data-testid="input-notes" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <DialogFooter className="gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => onOpenChange(false)} data-testid="button-cancel">
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={createMedia.isPending || updateMedia.isPending}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
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

// Expose title in scope for the form dialog
let title = "";

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
    ? Math.round((item.currentEpisode / item.totalEpisodes) * 100)
    : null;

  const checkColor = {
    "plan-to-watch": "border-sky-700 hover:border-sky-500",
    watching:        "border-emerald-700 bg-emerald-900/30",
    completed:       "border-violet-500 bg-violet-900/40",
    dropped:         "border-zinc-600 bg-zinc-800/30",
  }[item.status] ?? "border-border";

  return (
    <Card
      className="bg-card border-border rounded-lg p-3.5 group flex items-start gap-3 hover:border-[hsl(245,40%,35%)] transition-colors duration-150"
      data-testid={`card-media-${item.id}`}
    >
      {/* Status circle toggle */}
      <button
        onClick={() => onStatusChange(item, nextStatus[item.status] ?? "plan-to-watch")}
        className={cn(
          "mt-0.5 flex-shrink-0 w-4.5 h-4.5 rounded-full border-2 flex items-center justify-center transition-all duration-150",
          checkColor
        )}
        title="Click to cycle status"
        data-testid={`button-status-toggle-${item.id}`}
      >
        {item.status === "completed" && <CheckCircle2 className="w-2.5 h-2.5 text-violet-400" />}
        {item.status === "watching"  && <Play className="w-2 h-2 text-emerald-400" />}
        {item.status === "dropped"   && <XCircle className="w-2.5 h-2.5 text-zinc-500" />}
      </button>

      <div className="flex-1 min-w-0 space-y-1.5">
        <div className="flex items-start justify-between gap-2">
          <p className={cn(
            "text-sm font-medium leading-snug",
            item.status === "dropped"   && "line-through text-muted-foreground",
            item.status === "completed" && "text-violet-300",
          )}>
            {item.title}
          </p>

          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
            <button
              onClick={() => onEdit(item)}
              className="p-1 rounded hover:bg-white/8 text-muted-foreground hover:text-foreground transition-colors"
              data-testid={`button-edit-${item.id}`}
            >
              <Pencil className="w-3 h-3" />
            </button>
            <button
              onClick={() => onDelete(item)}
              className="p-1 rounded hover:bg-destructive/15 text-muted-foreground hover:text-destructive transition-colors"
              data-testid={`button-delete-${item.id}`}
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <StatusBadge status={item.status} />
          {item.genre && (
            <span className="text-xs text-muted-foreground">{item.genre}</span>
          )}
          {item.rating && (
            <span className="flex items-center gap-0.5 text-xs text-amber-400">
              <Star className="w-2.5 h-2.5" />
              {item.rating}
            </span>
          )}
        </div>

        {pct !== null && (
          <div className="space-y-1">
            <div className="flex justify-between text-[11px] text-muted-foreground">
              <span>Ep {item.currentEpisode} / {item.totalEpisodes}</span>
              <span>{pct}%</span>
            </div>
            <div className="h-0.5 rounded-full bg-muted overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full",
                  item.status === "completed" ? "bg-violet-500" :
                  item.status === "watching"  ? "bg-emerald-500" : "bg-sky-500",
                  "opacity-70"
                )}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        )}

        {item.notes && (
          <p className="text-xs text-muted-foreground truncate">{item.notes}</p>
        )}
      </div>
    </Card>
  );
}

export function CategoryList({ category, title: catTitle }: CategoryListProps) {
  title = catTitle;
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
    total:      items.length,
    completed:  items.filter(i => i.status === "completed").length,
    watching:   items.filter(i => i.status === "watching").length,
    planToWatch:items.filter(i => i.status === "plan-to-watch").length,
    dropped:    items.filter(i => i.status === "dropped").length,
  };

  const categoryGenres = allGenres.filter(g => items.some(i => i.genre === g));

  async function handleStatusChange(item: MediaItem, status: MediaStatus) {
    try {
      await updateMedia.mutateAsync({ id: item.id, data: { status } });
      queryClient.invalidateQueries({ queryKey: getListMediaQueryKey({ category }) });
      queryClient.invalidateQueries({ queryKey: getGetMediaStatsQueryKey() });
    } catch {
      toast({ title: "Failed to update status", variant: "destructive" });
    }
  }

  async function handleDelete() {
    if (!deleteItem) return;
    try {
      await deleteMedia.mutateAsync({ id: deleteItem.id });
      queryClient.invalidateQueries({ queryKey: getListMediaQueryKey({ category }) });
      queryClient.invalidateQueries({ queryKey: getGetMediaStatsQueryKey() });
      toast({ title: "Removed" });
    } catch {
      toast({ title: "Failed to delete", variant: "destructive" });
    } finally {
      setDeleteItem(null);
    }
  }

  function handleFormSuccess() {
    queryClient.invalidateQueries({ queryKey: getListMediaQueryKey({ category }) });
    queryClient.invalidateQueries({ queryKey: getListGenresQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetMediaStatsQueryKey() });
  }

  return (
    <div className="space-y-5 animate-in fade-in duration-300 pb-20 md:pb-0">
      {/* Header */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <h1 className="text-2xl font-display font-semibold text-foreground mb-0.5">{catTitle}</h1>
          <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
            <span>{counts.total} total</span>
            {counts.watching   > 0 && <><span>·</span><span className="text-emerald-400">{counts.watching} watching</span></>}
            {counts.completed  > 0 && <><span>·</span><span className="text-violet-400">{counts.completed} done</span></>}
            {counts.planToWatch > 0 && <><span>·</span><span className="text-sky-400">{counts.planToWatch} planned</span></>}
            {counts.dropped    > 0 && <><span>·</span><span className="text-zinc-400">{counts.dropped} dropped</span></>}
          </div>
        </div>
        <Button
          onClick={() => { setEditItem(null); setDialogOpen(true); }}
          size="sm"
          className="bg-primary text-primary-foreground hover:bg-primary/90 gap-1.5"
          data-testid="button-add"
        >
          <Plus className="w-3.5 h-3.5" />
          Add
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={`Search ${catTitle.toLowerCase()}...`}
          className="pl-9 bg-muted/40 border-border text-sm h-9"
          data-testid="input-search"
        />
      </div>

      {/* Status filter */}
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
                "px-3 py-1 rounded-md text-xs font-medium border transition-colors duration-150",
                isActive
                  ? "bg-primary/15 border-primary/40 text-primary"
                  : "border-border text-muted-foreground hover:text-foreground hover:border-[hsl(224,15%,25%)]"
              )}
              data-testid={`filter-status-${v}`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Genre filter */}
      {categoryGenres.length > 0 && (
        <div className="flex gap-1.5 flex-wrap">
          {["all", ...categoryGenres].map(g => (
            <button
              key={g}
              onClick={() => setSelectedGenre(g)}
              className={cn(
                "px-3 py-1 rounded-md text-xs font-medium border transition-colors duration-150",
                selectedGenre === g
                  ? "bg-muted border-[hsl(224,15%,28%)] text-foreground"
                  : "border-border text-muted-foreground hover:text-foreground hover:border-[hsl(224,15%,25%)]"
              )}
              data-testid={`filter-genre-${g}`}
            >
              {g === "all" ? "All genres" : g}
            </button>
          ))}
        </div>
      )}

      {/* List */}
      {isLoading ? (
        <div className="space-y-2">
          {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-16 rounded-lg bg-muted" />)}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="surface p-10 text-center">
          <p className="text-sm text-muted-foreground mb-4">
            {items.length === 0 ? `Nothing added yet. Start your ${catTitle} list!` : "No items match your filters."}
          </p>
          {items.length === 0 && (
            <Button
              size="sm"
              onClick={() => { setEditItem(null); setDialogOpen(true); }}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
              data-testid="button-add-empty"
            >
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              Add first entry
            </Button>
          )}
        </Card>
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
        onSuccess={handleFormSuccess}
      />

      <AlertDialog open={!!deleteItem} onOpenChange={v => !v && setDeleteItem(null)}>
        <AlertDialogContent className="bg-[hsl(224,18%,10%)] border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Remove from list?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              This will permanently remove <span className="text-foreground font-medium">"{deleteItem?.title}"</span>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-transparent border-border" data-testid="button-cancel-delete">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive/20 border border-destructive/40 text-destructive hover:bg-destructive/30"
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
