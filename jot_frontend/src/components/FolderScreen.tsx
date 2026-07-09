import { useState } from "react";
import { format } from "date-fns";
import {
  LayoutGrid,
  List,
  Star,
  Tag,
  FileText,
  FolderOpen,
  SquarePen,
  Search,
  ArrowUpDown,
  Check,
  X,
  MoreVertical,
  Trash2,
  FolderInput,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import TagChip from "@/components/TagChip";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { Note } from "@/components/NoteScreen";
import ConfirmDialog from "@/components/ConfirmDialog";
import FolderPicker from "@/components/FolderPicker";

// ── Types ─────────────────────────────────────────────────────────────────────

export type Folder = {
  id: string; // the directory's own vault-relative path
  parentId: string | null; // parent directory's vault-relative path, or null = top-level
  name: string;
};

type View = "list" | "gallery";

type SortKey = "lastEditedAt" | "date" | "dateAsc" | "titleAZ" | "titleZA";

const SORT_LABELS: Record<SortKey, string> = {
  lastEditedAt: "Last Edited",
  date: "Date: Newest First",
  dateAsc: "Date: Oldest First",
  titleAZ: "Title A–Z",
  titleZA: "Title Z–A",
};

type Props = {
  folder: Folder;
  notes: Note[];
  subfolders: Folder[];
  allFolders: Folder[];
  onNoteSelect?: (note: Note) => void;
  onFolderSelect?: (folder: Folder) => void;
  onFolderRename?: (name: string) => void;
  onNewNote?: () => void;
  onDeleteNote?: (noteId: string) => void;
  onMoveNote?: (noteId: string, folderId: string | null) => void;
  onDeleteFolder?: () => void;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

// Cheap markdown-punctuation strip, not a parser — good enough for a list/
// gallery preview snippet. Pulls from the first few non-empty lines so a
// note that opens with a heading still shows something after it.
function getPlainTextPreview(note: Note): string {
  return note.bodyMd
    .split("\n")
    .map((line) => line.replace(/^\s*(#{1,6}|[-*+]|\d+\.|>)\s*/, "").trim())
    .filter(Boolean)
    .slice(0, 3)
    .join(" ")
    .trim();
}

function sortNotes(notes: Note[], key: SortKey): Note[] {
  return [...notes].sort((a, b) => {
    switch (key) {
      case "lastEditedAt":
        return b.lastEditedAt.getTime() - a.lastEditedAt.getTime();
      case "date":
        return b.date.getTime() - a.date.getTime();
      case "dateAsc":
        return a.date.getTime() - b.date.getTime();
      case "titleAZ":
        return (a.title || "Untitled").localeCompare(b.title || "Untitled");
      case "titleZA":
        return (b.title || "Untitled").localeCompare(a.title || "Untitled");
    }
  });
}

function filterNotes(notes: Note[], query: string): Note[] {
  if (!query.trim()) return notes;
  const q = query.toLowerCase();
  return notes.filter(
    (note) =>
      (note.title || "Untitled").toLowerCase().includes(q) ||
      getPlainTextPreview(note).toLowerCase().includes(q) ||
      note.tags.some((tag) => tag.toLowerCase().includes(q)),
  );
}

// ── Note actions menu (shared by list row + gallery card) ──────────────────────

function NoteActionsMenu({
  note,
  allFolders,
  onDelete,
  onMove,
  className,
}: {
  note: Note;
  allFolders: Folder[];
  onDelete?: (noteId: string) => void;
  onMove?: (noteId: string, folderId: string | null) => void;
  className?: string;
}) {
  const [deleteOpen, setDeleteOpen] = useState(false);

  if (!onDelete && !onMove) return null;

  return (
    <div
      className={cn(
        "flex items-center gap-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity",
        className,
      )}
    >
      {onMove && (
        <FolderPicker
          folders={allFolders}
          currentFolderId={note.folderId}
          onSelect={(folderId) => onMove(note.id, folderId)}
        >
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => e.stopPropagation()}
            aria-label="Move to folder"
            className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
          >
            <FolderInput className="size-3.5" />
          </Button>
        </FolderPicker>
      )}
      {onDelete && (
        <>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              setDeleteOpen(true);
            }}
            aria-label="Delete note"
            className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="size-3.5" />
          </Button>
          <ConfirmDialog
            open={deleteOpen}
            onOpenChange={setDeleteOpen}
            title={`Delete "${note.title || "Untitled"}"?`}
            description="This note will be permanently deleted."
            onConfirm={() => {
              setDeleteOpen(false);
              onDelete(note.id);
            }}
          />
        </>
      )}
    </div>
  );
}

// ── List Row ──────────────────────────────────────────────────────────────────

function NoteListRow({
  note,
  allFolders,
  onClick,
  onDelete,
  onMove,
}: {
  note: Note;
  allFolders: Folder[];
  onClick: () => void;
  onDelete?: (noteId: string) => void;
  onMove?: (noteId: string, folderId: string | null) => void;
}) {
  const preview = getPlainTextPreview(note);

  return (
    <div
      className={cn(
        "w-full flex items-start gap-3 px-4 py-3",
        "border-b last:border-b-0 border-line",
        "hover:bg-paper-panel transition-colors group",
      )}
    >
      <button
        onClick={onClick}
        className="flex-1 min-w-0 flex items-start gap-3 text-left"
      >
        <FileText className="size-4 mt-0.5 shrink-0 text-muted-foreground/60 group-hover:text-muted-foreground transition-colors" />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="font-serif text-sm font-medium text-foreground truncate">
              {note.title || "Untitled"}
            </span>
            {note.favorite && (
              <Star className="size-3 shrink-0 fill-amber-400 text-amber-400" />
            )}
          </div>
          <div className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
            <span className="shrink-0">
              {format(note.date, "MMM d, yyyy")}
            </span>
            {preview && (
              <>
                <span className="shrink-0">·</span>
                <span className="font-sans truncate">{preview}</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-1 mt-0.5 font-mono text-xs text-muted-foreground/60">
            <span>
              Edited {format(note.lastEditedAt, "MMM d, yyyy 'at' h:mm a")}
            </span>
          </div>
          {note.tags.length > 0 && (
            <div className="flex gap-1 mt-1.5 flex-wrap">
              {note.tags.slice(0, 3).map((tag) => (
                <TagChip key={tag} tag={tag} size="sm" />
              ))}
              {note.tags.length > 3 && (
                <span className="font-mono text-xs text-muted-foreground">
                  +{note.tags.length - 3}
                </span>
              )}
            </div>
          )}
        </div>
      </button>

      <NoteActionsMenu
        note={note}
        allFolders={allFolders}
        onDelete={onDelete}
        onMove={onMove}
      />

      <span className="font-mono text-xs text-muted-foreground/60 shrink-0 mt-0.5 whitespace-nowrap">
        {format(note.lastEditedAt, "h:mm a")}
      </span>
    </div>
  );
}

// ── Folder Row ───────────────────────────────────────────────────────────────

function FolderRow({
  folder,
  onClick,
}: {
  folder: Folder;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left px-4 py-3 flex items-center gap-3",
        "border-b last:border-b-0 border-line",
        "hover:bg-paper-panel transition-colors group",
      )}
    >
      <FolderOpen className="size-4 shrink-0 text-amber-500" />
      <span className="text-sm font-medium text-foreground truncate">
        {folder.name || "Untitled Folder"}
      </span>
    </button>
  );
}

// ── Gallery Card ──────────────────────────────────────────────────────────────

function NoteGalleryCard({
  note,
  allFolders,
  onClick,
  onDelete,
  onMove,
}: {
  note: Note;
  allFolders: Folder[];
  onClick: () => void;
  onDelete?: (noteId: string) => void;
  onMove?: (noteId: string, folderId: string | null) => void;
}) {
  const preview = getPlainTextPreview(note);

  return (
    <div
      className={cn(
        "w-full flex flex-col",
        "border border-line rounded-card bg-paper-card transition-colors",
        "group overflow-hidden relative",
      )}
    >
      <NoteActionsMenu
        note={note}
        allFolders={allFolders}
        onDelete={onDelete}
        onMove={onMove}
        className="absolute top-2 right-2 z-10 bg-paper-card/90 rounded-md"
      />
      <button onClick={onClick} className="w-full text-left flex flex-col">
        <div className="px-4 pt-4 pb-3 border-b border-line/60">
          <div className="flex items-start gap-2">
            <span className="flex-1 font-serif text-sm font-semibold text-foreground leading-tight line-clamp-2">
              {note.title || "Untitled"}
            </span>
            {note.favorite && (
              <Star className="size-3.5 shrink-0 mt-0.5 fill-amber-400 text-amber-400" />
            )}
          </div>
          <div className="flex items-center gap-2 mt-2 font-mono text-xs text-muted-foreground">
            <span>{format(note.date, "MMM d, yyyy")}</span>
            {note.tags.length > 0 && (
              <>
                <span>·</span>
                <Tag className="size-2.5" />
                <span className="truncate">
                  {note.tags.slice(0, 2).join(", ")}
                  {note.tags.length > 2 && ` +${note.tags.length - 2}`}
                </span>
              </>
            )}
          </div>
        </div>
        <div className="px-4 py-3 flex-1">
          {preview ? (
            <p className="text-xs text-ink-700 line-clamp-4 leading-relaxed">
              {preview}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground/40 italic">
              No additional text
            </p>
          )}
        </div>
      </button>
    </div>
  );
}

// ── FolderScreen ──────────────────────────────────────────────────────────────

export default function FolderScreen({
  folder,
  notes,
  subfolders,
  allFolders,
  onNoteSelect,
  onFolderSelect,
  onFolderRename,
  onNewNote,
  onDeleteNote,
  onMoveNote,
  onDeleteFolder,
}: Props) {
  const [view, setView] = useState<View>("list");
  const [sort, setSort] = useState<SortKey>("lastEditedAt");
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [name, setName] = useState(folder.name);
  const [deleteFolderOpen, setDeleteFolderOpen] = useState(false);

  function handleNameBlur() {
    const trimmed = name.trim();
    if (!trimmed) {
      setName(folder.name);
      return;
    }
    onFolderRename?.(trimmed);
  }

  function handleNameKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") e.currentTarget.blur();
    if (e.key === "Escape") {
      setName(folder.name);
      e.currentTarget.blur();
    }
  }

  function handleSearchClose() {
    setSearch("");
    setSearchOpen(false);
  }

  const processedNotes = sortNotes(filterNotes(notes, search), sort);
  const isEmpty = notes.length === 0 && subfolders.length === 0;
  const noResults =
    !isEmpty && search.trim() !== "" && processedNotes.length === 0;
  const showNotesSection = notes.length > 0 && !noResults;

  return (
    <div className="flex flex-col h-full w-full">
      {/* ── Header ── */}
      <div className="border-b border-line bg-paper-panel sticky top-0 z-10">
        <div className="flex items-center justify-between px-4 py-3">
          {/* Folder name + count */}
          <div>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={handleNameBlur}
              onKeyDown={handleNameKeyDown}
              aria-label="Folder name"
              className={cn(
                "font-serif text-xl font-semibold text-foreground tracking-[-0.015em] bg-transparent",
                "border-none outline-none w-full",
                "placeholder:text-muted-foreground/40",
                "hover:bg-paper-card focus:bg-paper-card rounded px-1 -mx-1 transition-colors",
              )}
            />
            <p className="font-mono text-xs text-muted-foreground mt-0.5 px-1">
              {processedNotes.length}
              {search ? ` of ${notes.length}` : ""}{" "}
              {notes.length === 1 ? "note" : "notes"}
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1">
            {/* Search toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                searchOpen ? handleSearchClose() : setSearchOpen(true)
              }
              aria-label={searchOpen ? "Close search" : "Search notes"}
              className={cn(
                "h-8 w-8 p-0 transition-colors",
                searchOpen
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Search className="size-4" />
            </Button>

            {/* Sort dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label="Sort notes"
                  className={cn(
                    "h-8 px-2 gap-1.5 transition-colors font-mono text-xs font-normal",
                    sort !== "lastEditedAt"
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <ArrowUpDown className="size-3.5" />
                  {SORT_LABELS[sort]}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                {(Object.keys(SORT_LABELS) as SortKey[]).map((key) => (
                  <DropdownMenuItem
                    key={key}
                    onClick={() => setSort(key)}
                    className="flex items-center justify-between"
                  >
                    {SORT_LABELS[key]}
                    {sort === key && (
                      <Check className="size-3.5 text-foreground" />
                    )}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* New note */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onNewNote?.()}
              aria-label="New note"
              className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground transition-colors"
            >
              <SquarePen className="size-4" />
            </Button>

            {/* Folder actions (delete) */}
            {onDeleteFolder && (
              <>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label="Folder actions"
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <MoreVertical className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-40">
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={() => setDeleteFolderOpen(true)}
                      className="gap-2"
                    >
                      <Trash2 className="size-3.5" />
                      Delete folder
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <ConfirmDialog
                  open={deleteFolderOpen}
                  onOpenChange={setDeleteFolderOpen}
                  title={`Delete "${folder.name || "Untitled Folder"}"?`}
                  description={`This will permanently delete ${notes.length} ${
                    notes.length === 1 ? "note" : "notes"
                  } and ${subfolders.length} ${
                    subfolders.length === 1 ? "subfolder" : "subfolders"
                  } (including everything inside them).`}
                  onConfirm={() => {
                    setDeleteFolderOpen(false);
                    onDeleteFolder();
                  }}
                />
              </>
            )}

            {/* View toggle */}
            <div className="flex items-center gap-0.5 border border-line rounded-control p-0.5 bg-paper-panel ml-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setView("list")}
                aria-label="List view"
                aria-pressed={view === "list"}
                className={cn(
                  "h-7 w-7 p-0 transition-colors",
                  view === "list"
                    ? "bg-paper-card text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <List className="size-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setView("gallery")}
                aria-label="Gallery view"
                aria-pressed={view === "gallery"}
                className={cn(
                  "h-7 w-7 p-0 transition-colors",
                  view === "gallery"
                    ? "bg-paper-card text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <LayoutGrid className="size-3.5" />
              </Button>
            </div>
          </div>
        </div>

        {/* ── Search bar — slides in below the header row ── */}
        <div
          className={cn(
            "overflow-hidden transition-all duration-200",
            searchOpen ? "max-h-14 opacity-100" : "max-h-0 opacity-0",
          )}
        >
          <div className="px-4 pb-3 flex items-center gap-2">
            <Search className="size-3.5 shrink-0 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by title, content or tag…"
              autoFocus={searchOpen}
              className="h-7 text-sm border-none shadow-none bg-transparent focus-visible:ring-0 px-0 placeholder:text-muted-foreground/50"
            />
            {search && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSearch("")}
                className="h-6 w-6 p-0 shrink-0 text-muted-foreground hover:text-foreground"
              >
                <X className="size-3.5" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* ── Empty folder state ── */}
      {isEmpty && (
        <div className="flex-1 flex flex-col items-center justify-center gap-2 text-muted-foreground">
          <FileText className="size-10 opacity-20" />
          <p className="text-sm">No notes in this folder</p>
        </div>
      )}

      {!isEmpty && (
        <div className="flex-1 overflow-y-auto">
          {/* ── Subfolders ── */}
          {subfolders.length > 0 && (
            <div>
              {subfolders.map((sub) => (
                <FolderRow
                  key={sub.id}
                  folder={sub}
                  onClick={() => onFolderSelect?.(sub)}
                />
              ))}
            </div>
          )}

          {/* ── No search results state ── */}
          {noResults && (
            <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground m-8">
              <Search className="size-10 opacity-20" />
              <p className="text-sm">No notes match "{search}"</p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSearch("")}
                className="text-xs"
              >
                Clear search
              </Button>
            </div>
          )}

          {/* ── List view ── */}
          {showNotesSection && view === "list" && (
            <div>
              {processedNotes.map((note) => (
                <NoteListRow
                  key={note.id}
                  note={note}
                  allFolders={allFolders}
                  onClick={() => onNoteSelect?.(note)}
                  onDelete={onDeleteNote}
                  onMove={onMoveNote}
                />
              ))}
            </div>
          )}

          {/* ── Gallery view ── */}
          {showNotesSection && view === "gallery" && (
            <div className="px-4 py-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {processedNotes.map((note) => (
                  <NoteGalleryCard
                    key={note.id}
                    note={note}
                    allFolders={allFolders}
                    onClick={() => onNoteSelect?.(note)}
                    onDelete={onDeleteNote}
                    onMove={onMoveNote}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
