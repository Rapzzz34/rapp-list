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
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  CheckCircle2,
  Clock,
  Play,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

type MediaStatus = "plan-to-watch" | "watching" | "completed" | "dropped";

const STATUS_OPTIONS: { value: MediaStatus; label: string; cls: string; icon: React.ElementType }[] = [
  { value: "plan-to-watch", label: "Plan to Watch", cls: "status-plan", icon: Clock },
  { value: "watching", label: "Watching", cls: "status-watching", icon: Play },
  { value: "completed", label: "Completed", cls: "status-completed", icon: CheckCircle2 },
  { value: "dropped", label: "Dropped", cls: "status-dropped", icon: XCircle },
];

const GENRES = [
  "Romance", "Action", "Comedy", "Thriller", "Fantasy",
  "Slice of Life", "Horror", "Mystery", "Sci-Fi", "Drama",
  "Historical", "Crime", "Sports", "School", "Family",
];

const formSchema = z.object({
  title: z.string().min(1, "Title is required"),
  genre: z.string().optional(),
  status: z.enum(["plan-to-watch", "watching", "completed", "dropped"]),
  rating: z.coerce.number().min(1).max(10).optional().or(z.literal("")),
  totalEpisodes: z.coerce.number().min(1).optional().or(z.literal("")),
  currentEpisode: z.coerce.number().min(0).optional().or(z.literal("")),
  notes: z.string().optional(),
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
  const opt = STATUS_OPTIONS.find((s) => s.value === status) || STATUS_OPTIONS[0];
  const Icon = opt.icon;
  return (
    <Badge className={cn("border text-xs gap-1 px-2 py-0.5", opt.cls)}>
      <Icon className="w-3 h-3" />
      {opt.label}
    </Badge>
  );
}

function MediaFormDialog({
  open,
  onOpenChange,
  item,
  category,
  onSuccess,
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

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: item?.title ?? "",
      genre: item?.genre ?? "",
      status: (item?.status as MediaStatus) ?? "plan-to-watch",
      rating: item?.rating ?? "",
      totalEpisodes: item?.totalEpisodes ?? "",
      currentEpisode: item?.currentEpisode ?? "",
      notes: item?.notes ?? "",
    },
  });

  const isEditing = !!item;

  async function onSubmit(values: FormValues) {
    const payload = {
      title: values.title,
      category,
      genre: values.genre || undefined,
      status: values.status,
      rating: values.rating === "" ? undefined : Number(values.rating),
      totalEpisodes: values.totalEpisodes === "" ? undefined : Number(values.totalEpisodes),
      currentEpisode: values.currentEpisode === "" ? undefined : Number(values.currentEpisode),
      notes: values.notes || undefined,
    };

    try {
      if (isEditing) {
        await updateMedia.mutateAsync({ id: item.id, data: payload });
        toast({ title: "Updated successfully" });
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
      <DialogContent className="glass-card border-white/10 max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-display">
            {isEditing ? "Edit" : "Add"} <span className="neon-text-primary">{category === "short-dracin" ? "Short Dracin" : category === "indo" ? "Indonesian" : category === "webtoon" ? "Webtoon" : "K-Drama"}</span>
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Enter title..."
                      className="bg-black/40 border-white/10 focus:border-primary/50"
                      data-testid="input-title"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="genre"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Genre</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-black/40 border-white/10" data-testid="select-genre">
                          <SelectValue placeholder="Select genre" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="glass-card border-white/10">
                        {GENRES.map((g) => (
                          <SelectItem key={g} value={g}>{g}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-black/40 border-white/10" data-testid="select-status">
                          <SelectValue placeholder="Status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="glass-card border-white/10">
                        {STATUS_OPTIONS.map((s) => (
                          <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="rating"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rating (1-10)</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        min={1}
                        max={10}
                        placeholder="—"
                        className="bg-black/40 border-white/10"
                        data-testid="input-rating"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="totalEpisodes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Total Eps</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        min={1}
                        placeholder="—"
                        className="bg-black/40 border-white/10"
                        data-testid="input-total-episodes"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="currentEpisode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Current Ep</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        min={0}
                        placeholder="—"
                        className="bg-black/40 border-white/10"
                        data-testid="input-current-episode"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Personal notes..."
                      className="bg-black/40 border-white/10 resize-none"
                      rows={3}
                      data-testid="input-notes"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="border-white/10"
                data-testid="button-cancel"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createMedia.isPending || updateMedia.isPending}
                className="bg-primary/20 border border-primary/50 text-primary hover:bg-primary/30 hover:border-primary"
                data-testid="button-submit"
              >
                {isEditing ? "Save Changes" : "Add to List"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function MediaCard({
  item,
  onEdit,
  onDelete,
  onStatusChange,
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

  const episodeProgress =
    item.totalEpisodes && item.currentEpisode != null
      ? Math.round((item.currentEpisode / item.totalEpisodes) * 100)
      : null;

  return (
    <Card
      className="glass-card p-4 group relative overflow-hidden"
      data-testid={`card-media-${item.id}`}
    >
      <div className="flex items-start gap-3">
        {/* Status toggle checkbox */}
        <button
          onClick={() => onStatusChange(item, nextStatus[item.status] || "plan-to-watch")}
          className={cn(
            "mt-0.5 flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-300",
            item.status === "completed"
              ? "border-purple-400 bg-purple-400/20 shadow-[0_0_8px_rgba(168,85,247,0.6)]"
              : item.status === "watching"
              ? "border-green-400 bg-green-400/10 shadow-[0_0_8px_rgba(34,197,94,0.4)]"
              : item.status === "dropped"
              ? "border-zinc-500 bg-zinc-500/10"
              : "border-blue-400/50 bg-blue-400/5 hover:border-blue-400"
          )}
          title={`Click to change to ${nextStatus[item.status]}`}
          data-testid={`button-status-toggle-${item.id}`}
        >
          {item.status === "completed" && <CheckCircle2 className="w-3 h-3 text-purple-400" />}
          {item.status === "watching" && <Play className="w-2.5 h-2.5 text-green-400" />}
          {item.status === "dropped" && <XCircle className="w-3 h-3 text-zinc-500" />}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className={cn(
              "font-semibold text-sm leading-tight",
              item.status === "dropped" && "line-through text-muted-foreground",
              item.status === "completed" && "text-purple-300"
            )}>
              {item.title}
            </h3>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
              <button
                onClick={() => onEdit(item)}
                className="p-1.5 rounded-md hover:bg-white/10 text-muted-foreground hover:text-primary transition-colors"
                data-testid={`button-edit-${item.id}`}
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onDelete(item)}
                className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                data-testid={`button-delete-${item.id}`}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <StatusBadge status={item.status} />
            {item.genre && (
              <Badge variant="outline" className="text-xs border-white/10 text-muted-foreground">
                {item.genre}
              </Badge>
            )}
            {item.rating && (
              <span className="text-xs text-yellow-400 font-medium">{item.rating}/10</span>
            )}
          </div>

          {episodeProgress !== null && (
            <div className="mt-2 space-y-1">
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>Ep {item.currentEpisode} / {item.totalEpisodes}</span>
                <span>{episodeProgress}%</span>
              </div>
              <div className="h-1 rounded-full bg-black/40 overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    item.status === "completed" ? "bg-purple-400" :
                    item.status === "watching" ? "bg-green-400" :
                    "bg-blue-400"
                  )}
                  style={{ width: `${episodeProgress}%` }}
                />
              </div>
            </div>
          )}

          {item.notes && (
            <p className="text-xs text-muted-foreground mt-1.5 italic truncate">{item.notes}</p>
          )}
        </div>
      </div>
    </Card>
  );
}

export function CategoryList({ category, title }: CategoryListProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [selectedGenre, setSelectedGenre] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<MediaItem | null>(null);
  const [deleteItem, setDeleteItem] = useState<MediaItem | null>(null);

  const { data: items = [], isLoading } = useListMedia(
    { category },
    { query: { queryKey: getListMediaQueryKey({ category }) } }
  );

  const { data: allGenres = [] } = useListGenres({
    query: { queryKey: getListGenresQueryKey() },
  });

  const deleteMedia = useDeleteMedia();
  const updateMedia = useUpdateMedia();

  const filtered = items.filter((item) => {
    const matchSearch = search === "" || item.title.toLowerCase().includes(search.toLowerCase());
    const matchGenre = selectedGenre === "all" || item.genre === selectedGenre;
    const matchStatus = selectedStatus === "all" || item.status === selectedStatus;
    return matchSearch && matchGenre && matchStatus;
  });

  const counts = {
    total: items.length,
    completed: items.filter((i) => i.status === "completed").length,
    watching: items.filter((i) => i.status === "watching").length,
    planToWatch: items.filter((i) => i.status === "plan-to-watch").length,
    dropped: items.filter((i) => i.status === "dropped").length,
  };

  async function handleStatusChange(item: MediaItem, status: MediaStatus) {
    try {
      await updateMedia.mutateAsync({ id: item.id, data: { status } });
      queryClient.invalidateQueries({ queryKey: getListMediaQueryKey({ category }) });
    } catch {
      toast({ title: "Failed to update status", variant: "destructive" });
    }
  }

  async function handleDelete() {
    if (!deleteItem) return;
    try {
      await deleteMedia.mutateAsync({ id: deleteItem.id });
      queryClient.invalidateQueries({ queryKey: getListMediaQueryKey({ category }) });
      toast({ title: "Removed from list" });
    } catch {
      toast({ title: "Failed to delete", variant: "destructive" });
    } finally {
      setDeleteItem(null);
    }
  }

  function handleEdit(item: MediaItem) {
    setEditItem(item);
    setDialogOpen(true);
  }

  function handleAdd() {
    setEditItem(null);
    setDialogOpen(true);
  }

  function handleFormSuccess() {
    queryClient.invalidateQueries({ queryKey: getListMediaQueryKey({ category }) });
    queryClient.invalidateQueries({ queryKey: getListGenresQueryKey() });
  }

  const categoryGenres = allGenres.filter((g) =>
    items.some((i) => i.genre === g)
  );

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20 md:pb-0">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold mb-1">
            <span className="neon-text-primary">{title}</span>
          </h1>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span>{counts.total} total</span>
            <span className="text-green-400">{counts.watching} watching</span>
            <span className="text-purple-400">{counts.completed} completed</span>
            <span className="text-blue-400">{counts.planToWatch} planned</span>
            {counts.dropped > 0 && <span className="text-zinc-400">{counts.dropped} dropped</span>}
          </div>
        </div>
        <Button
          onClick={handleAdd}
          className="bg-primary/20 border border-primary/50 text-primary hover:bg-primary/30 hover:border-primary gap-2"
          data-testid="button-add"
        >
          <Plus className="w-4 h-4" />
          Add
        </Button>
      </div>

      {/* Filters */}
      <div className="space-y-3">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`Search ${title.toLowerCase()}...`}
            className="pl-9 bg-black/40 border-white/10 focus:border-primary/50"
            data-testid="input-search"
          />
        </div>

        {/* Status filter */}
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setSelectedStatus("all")}
            className={cn(
              "px-3 py-1 rounded-full text-xs font-medium border transition-all",
              selectedStatus === "all"
                ? "bg-white/10 border-white/30 text-white"
                : "border-white/10 text-muted-foreground hover:border-white/20 hover:text-white"
            )}
            data-testid="filter-status-all"
          >
            All
          </button>
          {STATUS_OPTIONS.map((s) => (
            <button
              key={s.value}
              onClick={() => setSelectedStatus(s.value)}
              className={cn(
                "px-3 py-1 rounded-full text-xs font-medium border transition-all",
                selectedStatus === s.value ? s.cls : "border-white/10 text-muted-foreground hover:border-white/20 hover:text-white"
              )}
              data-testid={`filter-status-${s.value}`}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Genre filter */}
        {categoryGenres.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setSelectedGenre("all")}
              className={cn(
                "px-3 py-1 rounded-full text-xs font-medium border transition-all",
                selectedGenre === "all"
                  ? "bg-accent/20 border-accent/50 text-accent"
                  : "border-white/10 text-muted-foreground hover:border-white/20 hover:text-white"
              )}
              data-testid="filter-genre-all"
            >
              All Genres
            </button>
            {categoryGenres.map((g) => (
              <button
                key={g}
                onClick={() => setSelectedGenre(g)}
                className={cn(
                  "px-3 py-1 rounded-full text-xs font-medium border transition-all",
                  selectedGenre === g
                    ? "bg-accent/20 border-accent/50 text-accent"
                    : "border-white/10 text-muted-foreground hover:border-white/20 hover:text-white"
                )}
                data-testid={`filter-genre-${g}`}
              >
                {g}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* List */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-20 glass rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="glass p-10 text-center border-dashed border-white/10">
          <p className="text-muted-foreground mb-4">
            {items.length === 0 ? `No ${title} yet. Add your first one!` : "No items match your filters."}
          </p>
          {items.length === 0 && (
            <Button
              onClick={handleAdd}
              className="bg-primary/20 border border-primary/50 text-primary hover:bg-primary/30"
              data-testid="button-add-empty"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add {title}
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filtered.map((item) => (
            <MediaCard
              key={item.id}
              item={item as MediaItem}
              onEdit={handleEdit}
              onDelete={setDeleteItem}
              onStatusChange={handleStatusChange}
            />
          ))}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <MediaFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        item={editItem}
        category={category}
        onSuccess={handleFormSuccess}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteItem} onOpenChange={(v) => !v && setDeleteItem(null)}>
        <AlertDialogContent className="glass-card border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle>Remove from list?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              This will permanently remove <span className="text-white font-medium">"{deleteItem?.title}"</span> from your list.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              className="border-white/10 bg-transparent"
              data-testid="button-cancel-delete"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive/20 border border-destructive/50 text-destructive hover:bg-destructive/30"
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
