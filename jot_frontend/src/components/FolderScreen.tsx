import { useState } from "react";
import { format } from "date-fns";
import { LayoutGrid, List, Star, Tag, FileText, SquarePen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Note } from "@/components/NoteScreen";

// ── Types ─────────────────────────────────────────────────────────────────────

export type Folder = {
  id: string;
  name: string;
  notes: Note[];
};

type View = "list" | "gallery";

type Props = {
  folder: Folder;
  onNoteSelect?: (note: Note) => void;
  onFolderRename?: (name: string) => void;
  onNewNote?: () => void;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function getPlainTextPreview(note: Note): string {
  if (!note.contentJSON?.content) return "";

  const extractText = (nodes: any[]): string =>
    nodes
      .flatMap((node) => {
        if (node.type === "text") return node.text ?? "";
        if (node.content) return extractText(node.content);
        return "";
      })
      .join(" ")
      .trim();

  return extractText(note.contentJSON.content);
}

// ── List Row ──────────────────────────────────────────────────────────────────

function NoteListRow({ note, onClick }: { note: Note; onClick: () => void }) {
  const preview = getPlainTextPreview(note);

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left px-4 py-3 flex items-start gap-3",
        "border-b last:border-b-0 border-border",
        "hover:bg-muted/50 transition-colors group",
      )}
    >
      {/* Icon */}
      <FileText className="size-4 mt-0.5 shrink-0 text-muted-foreground/60 group-hover:text-muted-foreground transition-colors" />

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-sm font-medium text-foreground truncate">
            {note.title || "Untitled"}
          </span>
          {note.favorite && (
            <Star className="size-3 shrink-0 fill-amber-400 text-amber-400" />
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="shrink-0">{format(note.date, "MMM d, yyyy")}</span>
          {preview && (
            <>
              <span className="shrink-0">·</span>
              <span className="truncate">{preview}</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-1 mt-0.5 text-xs text-muted-foreground/60">
          <span>
            Edited {format(note.lastEditedAt, "MMM d, yyyy 'at' h:mm a")}
          </span>
        </div>
        {note.tags.length > 0 && (
          <div className="flex gap-1 mt-1.5 flex-wrap">
            {note.tags.slice(0, 3).map((tag) => (
              <Badge
                key={tag}
                variant="secondary"
                className="text-xs font-normal px-1.5 py-0 h-4"
              >
                {tag}
              </Badge>
            ))}
            {note.tags.length > 3 && (
              <span className="text-xs text-muted-foreground">
                +{note.tags.length - 3}
              </span>
            )}
          </div>
        )}
      </div>
    </button>
  );
}

// ── Gallery Card ──────────────────────────────────────────────────────────────

function NoteGalleryCard({
  note,
  onClick,
}: {
  note: Note;
  onClick: () => void;
}) {
  const preview = getPlainTextPreview(note);

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left flex flex-col",
        "border rounded-lg bg-white hover:shadow-md transition-all duration-200",
        "hover:-translate-y-0.5 group overflow-hidden",
      )}
    >
      {/* Card header — mirrors NoteScreen's title area */}
      <div className="px-4 pt-4 pb-3 border-b border-border/60">
        <div className="flex items-start gap-2">
          <span className="flex-1 text-sm font-semibold text-foreground leading-tight line-clamp-2">
            {note.title || "Untitled"}
          </span>
          {note.favorite && (
            <Star className="size-3.5 shrink-0 mt-0.5 fill-amber-400 text-amber-400" />
          )}
        </div>

        {/* Meta row — mirrors NoteScreen's meta row */}
        <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
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

      {/* Preview body */}
      <div className="px-4 py-3 flex-1">
        {preview ? (
          <p className="text-xs text-muted-foreground line-clamp-4 leading-relaxed">
            {preview}
          </p>
        ) : (
          <p className="text-xs text-muted-foreground/40 italic">
            No additional text
          </p>
        )}
      </div>
    </button>
  );
}

// ── FolderScreen ──────────────────────────────────────────────────────────────

export default function FolderScreen({
  folder,
  onNoteSelect,
  onFolderRename,
  onNewNote,
}: Props) {
  const [view, setView] = useState<View>("list");
  const [name, setName] = useState(folder.name);

  function handleNameBlur() {
    const trimmed = name.trim();
    // Revert to original if left empty
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

  // Sort by date descending — most recently edited first.
  const sortedNotes = [...folder.notes].sort(
    (a, b) => b.date.getTime() - a.date.getTime(),
  );

  return (
    <div className="flex flex-col h-full w-full">
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-white/80 backdrop-blur sticky top-0 z-10">
        <div>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={handleNameBlur}
            onKeyDown={handleNameKeyDown}
            aria-label="Folder name"
            className={cn(
              "text-xl font-semibold text-foreground tracking-tight bg-transparent",
              "border-none outline-none w-full",
              "placeholder:text-muted-foreground/40",
              "hover:bg-muted/40 focus:bg-muted/40 rounded px-1 -mx-1 transition-colors",
            )}
          />
          <p className="text-xs text-muted-foreground mt-0.5 px-1">
            {sortedNotes.length} {sortedNotes.length === 1 ? "note" : "notes"}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* New note */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              console.log("New note button pressed — folder:", folder.id);
              onNewNote?.();
            }}
            aria-label="New note"
            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground transition-colors"
          >
            <SquarePen className="size-4" />
          </Button>

          {/* View toggle */}
          <div className="flex items-center gap-0.5 border rounded-md p-0.5 bg-muted/40">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setView("list")}
              aria-label="List view"
              aria-pressed={view === "list"}
              className={cn(
                "h-7 w-7 p-0 transition-colors",
                view === "list"
                  ? "bg-white shadow-sm text-foreground"
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
                  ? "bg-white shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <LayoutGrid className="size-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* ── Empty state ── */}
      {sortedNotes.length === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center gap-2 text-muted-foreground">
          <FileText className="size-10 opacity-20" />
          <p className="text-sm">No notes in this folder</p>
        </div>
      )}

      {/* ── List view ── */}
      {sortedNotes.length > 0 && view === "list" && (
        <div className="flex-1 overflow-y-auto">
          <div className="divide-y-0">
            {sortedNotes.map((note) => (
              <NoteListRow
                key={note.id}
                note={note}
                onClick={() => onNoteSelect?.(note)}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Gallery view ── */}
      {sortedNotes.length > 0 && view === "gallery" && (
        <div className="flex-1 overflow-y-auto px-4 py-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {sortedNotes.map((note) => (
              <NoteGalleryCard
                key={note.id}
                note={note}
                onClick={() => onNoteSelect?.(note)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
