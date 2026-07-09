import { useState, useRef, useEffect } from "react";
import { format } from "date-fns";
import {
  Star,
  Tag,
  Plus,
  Calendar,
  List,
  FolderInput,
  Trash2,
  Link2,
  History,
} from "lucide-react";
import TagChip from "@/components/TagChip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import Editor from "@/components/editor";
import type { ToCItem } from "@/components/editor";
import ConfirmDialog from "@/components/ConfirmDialog";
import FolderPicker from "@/components/FolderPicker";
import VersionHistory from "@/components/VersionHistory";
import type { Folder } from "@/components/FolderScreen";
import { computeBacklinks } from "@/lib/wikilinks";

// ── Types ─────────────────────────────────────────────────────────────────────

export type Note = {
  id: string; // stable UUID, lives in frontmatter — independent of file path
  folderId: string | null; // parent directory's vault-relative path, or null = vault root
  title: string; // derived from the filename (basename minus .md), not stored in frontmatter
  bodyMd: string; // markdown body — source of truth for the editor
  favorite: boolean;
  tags: string[];
  date: Date; // user-editable note date
  lastEditedAt: Date; // auto-stamped on every save, not user-controlled
};

type Props = {
  note: Note;
  folders?: Folder[];
  // All notes in the vault — powers [[wikilink]] resolution/autocomplete and
  // the backlinks panel. Omitted (empty) is safe: links just show unresolved.
  notes?: Note[];
  vaultPath?: string | null;
  onChange?: (updated: Note) => void;
  onDelete?: () => void;
  onMove?: (folderId: string | null) => void;
  onNavigateToNote?: (noteId: string) => void;
  onCreateLinkedNote?: (title: string) => Promise<Note>;
  onRestoreVersion?: (snapshot: Note) => Promise<void>;
};

// ── NoteScreen ────────────────────────────────────────────────────────────────

export default function NoteScreen({
  note,
  folders = [],
  notes = [],
  vaultPath = null,
  onChange,
  onDelete,
  onMove,
  onNavigateToNote,
  onCreateLinkedNote,
  onRestoreVersion,
}: Props) {
  const [title, setTitle] = useState(note.title);
  const [titleFocused, setTitleFocused] = useState(false);
  // Tracks the note.title we've last synced `title` from, so the render-phase
  // adjustment below fires only on an actual prop change, not every render.
  const [syncedTitle, setSyncedTitle] = useState(note.title);
  const [favorite, setFavorite] = useState(note.favorite);
  const [tags, setTags] = useState<string[]>(note.tags);
  const [date, setDate] = useState<Date>(note.date);
  const [focused, setFocused] = useState(false);
  const [tocItems, setTocItems] = useState<ToCItem[]>([]);
  const [tocOpen, setTocOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  const [tagInput, setTagInput] = useState("");
  const [tagInputOpen, setTagInputOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);

  const tagInputRef = useRef<HTMLInputElement>(null);

  // rootRef   — the entire note. Clicks outside it hide the toolbar.
  // editorRef — just the editor+toolbar area. Only clicks here show the toolbar;
  //             clicking title/tags/date does not.
  const rootRef = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<HTMLDivElement | null>(null);
  // Ref (not state) so the pointer listener is stable and never re-registered.
  const menuOpenRef = useRef(false);
  // Debounce timer for content saves — avoids calling onChange on every keystroke.
  const saveContentTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      // Radix portals (dropdowns, calendars) live outside rootRef — ignore them.
      if (target.closest("[data-radix-portal]")) return;

      // Don't change toolbar state while a menu is open.
      if (menuOpenRef.current) return;

      // Clicked outside the entire note — hide toolbar.
      if (!rootRef.current?.contains(target)) {
        setFocused(false);
        return;
      }

      // Inside the editor area → show toolbar.
      // Inside the note but outside the editor (title, tags, date) → hide toolbar.
      setFocused(!!editorRef.current?.contains(target));
    };

    document.addEventListener("pointerdown", onPointerDown, true);
    return () =>
      document.removeEventListener("pointerdown", onPointerDown, true);
  }, []);

  // Title is the filename now, so the store can silently adjust it on write
  // (collision auto-suffix, e.g. "Notes" -> "Notes 2"). Adjusted during
  // render (React's documented pattern for "sync state from a changed prop")
  // rather than in an effect, and only when note.title actually changed —
  // and never while the user is still typing in the field, or we'd clobber
  // their in-progress edit.
  if (note.title !== syncedTitle) {
    setSyncedTitle(note.title);
    if (!titleFocused) setTitle(note.title);
  }

  const backlinks = computeBacklinks(notes, note);

  // ── Helpers ──────────────────────────────────────────────────────────────────

  function handleMenuOpenChange(open: boolean) {
    menuOpenRef.current = open;
    if (open) setFocused(true);
  }

  function patch(partial: Partial<Note>) {
    onChange?.({
      ...note,
      title,
      favorite,
      tags,
      date,
      ...partial,
      lastEditedAt: new Date(),
    });
  }

  function handleTitleChange(value: string) {
    // Update local state instantly for responsive typing.
    // patch() is NOT called here — onChange on every keystroke causes a parent
    // re-render which makes tiptap steal focus back mid-type.
    setTitle(value);
  }

  function handleTitleBlur() {
    setTitleFocused(false);
    patch({ title });
  }

  function handleContentChange(bodyMd: string) {
    // Debounce saves so onChange fires ~500ms after the user stops typing,
    // rather than on every keystroke.
    if (saveContentTimer.current) clearTimeout(saveContentTimer.current);
    saveContentTimer.current = setTimeout(() => {
      patch({ bodyMd });
    }, 500);
  }

  function handleFavoriteToggle() {
    const next = !favorite;
    setFavorite(next);
    patch({ favorite: next });
  }

  function handleDateSelect(day: Date | undefined) {
    if (!day) return;
    setDate(day);
    setCalendarOpen(false);
    patch({ date: day });
  }

  function commitTag() {
    const trimmed = tagInput.trim().toLowerCase();
    if (!trimmed || tags.includes(trimmed)) {
      setTagInput("");
      setTagInputOpen(false);
      return;
    }
    const next = [...tags, trimmed];
    setTags(next);
    setTagInput("");
    setTagInputOpen(false);
    patch({ tags: next });
  }

  function removeTag(tag: string) {
    const next = tags.filter((t) => t !== tag);
    setTags(next);
    patch({ tags: next });
  }

  function handleTagKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      commitTag();
    }
    if (e.key === "Escape") {
      setTagInput("");
      setTagInputOpen(false);
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div
      ref={rootRef}
      className="flex flex-col gap-4 w-full max-w-5xl mx-auto px-4 py-6"
    >
      {/* ── Title row ── */}
      <div className="flex items-start gap-2">
        <input
          className={cn(
            "flex-1 font-serif text-3xl font-semibold tracking-[-0.015em] bg-transparent border-none outline-none",
            "placeholder:text-muted-foreground/40 text-foreground leading-tight",
          )}
          value={title}
          onChange={(e) => handleTitleChange(e.target.value)}
          onFocus={() => setTitleFocused(true)}
          onBlur={handleTitleBlur}
          placeholder="Untitled"
          aria-label="Note title"
        />
        <Button
          variant="ghost"
          size="icon"
          onClick={handleFavoriteToggle}
          aria-label={favorite ? "Remove from favorites" : "Add to favorites"}
          className="mt-1 shrink-0 text-muted-foreground hover:text-amber-400 transition-colors"
        >
          <Star
            className={cn(
              "size-5 transition-all",
              favorite && "fill-amber-400 text-amber-400",
            )}
          />
        </Button>
        {onRestoreVersion && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setHistoryOpen(true)}
            aria-label="Version history"
            className="mt-1 shrink-0 text-muted-foreground hover:text-foreground transition-colors"
          >
            <History className="size-5" />
          </Button>
        )}
        {onMove && (
          <FolderPicker
            folders={folders}
            currentFolderId={note.folderId}
            onSelect={onMove}
          >
            <Button
              variant="ghost"
              size="icon"
              aria-label="Move to folder"
              className="mt-1 shrink-0 text-muted-foreground hover:text-foreground transition-colors"
            >
              <FolderInput className="size-5" />
            </Button>
          </FolderPicker>
        )}
        {onDelete && (
          <>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setDeleteOpen(true)}
              aria-label="Delete note"
              className="mt-1 shrink-0 text-muted-foreground hover:text-destructive transition-colors"
            >
              <Trash2 className="size-5" />
            </Button>
            <ConfirmDialog
              open={deleteOpen}
              onOpenChange={setDeleteOpen}
              title={`Delete "${title || "Untitled"}"?`}
              description="This note will be permanently deleted."
              onConfirm={() => {
                setDeleteOpen(false);
                onDelete();
              }}
            />
          </>
        )}
      </div>

      {/* ── Meta row: date + tags ── */}
      <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
        {/* Editable date */}
        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 gap-1.5 text-muted-foreground hover:text-foreground font-mono font-normal"
            >
              <Calendar className="size-3.5" />
              {format(date, "MMM d, yyyy")}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <CalendarPicker
              mode="single"
              selected={date}
              onSelect={handleDateSelect}
              initialFocus
            />
          </PopoverContent>
        </Popover>

        <div className="w-px h-4 bg-border" />

        {/* Tags */}
        <div className="flex flex-wrap items-center gap-1.5">
          <Tag className="size-3.5 shrink-0" />

          {tags.map((tag) => (
            <TagChip key={tag} tag={tag} onRemove={() => removeTag(tag)} />
          ))}

          {tagInputOpen ? (
            <Input
              ref={tagInputRef}
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleTagKeyDown}
              onBlur={commitTag}
              placeholder="tag name"
              className="h-6 w-24 text-xs px-2 py-0"
              autoFocus
            />
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setTagInputOpen(true)}
              className="h-6 w-6 p-0 rounded-full text-muted-foreground hover:text-foreground"
              aria-label="Add tag"
            >
              <Plus className="size-3" />
            </Button>
          )}
        </div>

        {/* ToC toggle — only shown when the note has headings */}
        {tocItems.length > 0 && (
          <>
            <div className="w-px h-4 bg-border" />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setTocOpen((o) => !o)}
              aria-label={
                tocOpen ? "Hide table of contents" : "Show table of contents"
              }
              aria-expanded={tocOpen}
              className={cn(
                "h-7 px-2 gap-1.5 font-normal transition-colors",
                tocOpen
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <List className="size-3.5" />
              Contents
            </Button>
          </>
        )}
      </div>

      {/* ── Divider ── */}
      <div className="border-t" />

      {/* ── Editor + ToC ── */}
      <div className="flex items-start">
        {/* Editor — flex-1 so it naturally fills remaining space as aside width changes */}
        <div
          ref={editorRef}
          className="flex-1 min-w-0 transition-all duration-300"
        >
          <Editor
            focused={focused}
            noteId={note.id}
            content={note.bodyMd}
            onContentChange={handleContentChange}
            onToCChange={setTocItems}
            onMenuOpenChange={handleMenuOpenChange}
            notes={notes}
            onNavigateToNote={onNavigateToNote}
            onCreateNote={onCreateLinkedNote}
          />
        </div>

        {/* Table of Contents — width transitions between 0 and w-44 so the
            editor flex-1 naturally shrinks and expands in response. */}
        {tocItems.length > 0 && (
          <div
            className={cn(
              "hidden xl:block shrink-0 sticky top-6 overflow-hidden",
              "transition-all duration-300 ease-in-out",
              tocOpen ? "w-52 opacity-100 ml-8" : "w-0 opacity-0 ml-0",
            )}
            aria-hidden={!tocOpen}
          >
            <aside className="w-52 flex flex-col gap-1 border border-line rounded-card bg-paper-card shadow-xs p-4">
              <p className="font-mono text-[11px] text-ink-500 uppercase tracking-widest mb-2">
                On this page
              </p>
              {tocItems.map((item) => (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  className={cn(
                    "text-sm truncate transition-colors hover:text-foreground",
                    item.level === 1 && "pl-0",
                    item.level === 2 && "pl-3",
                    item.level === 3 && "pl-6",
                    item.isActive
                      ? "text-foreground font-medium"
                      : "text-muted-foreground",
                    item.isScrolledOver && "opacity-50",
                  )}
                >
                  {item.textContent}
                </a>
              ))}
            </aside>
          </div>
        )}
      </div>

      {/* ── Backlinks ── */}
      {backlinks.length > 0 && (
        <div className="w-full max-w-2xl">
          <p className="flex items-center gap-1.5 font-mono text-[11px] text-ink-500 uppercase tracking-widest mb-2">
            <Link2 className="size-3" />
            Linked mentions
          </p>
          <div className="flex flex-col gap-1 border border-line rounded-card bg-paper-card shadow-xs p-2">
            {backlinks.map((linker) => (
              <button
                key={linker.id}
                type="button"
                onClick={() => onNavigateToNote?.(linker.id)}
                className="text-left text-sm rounded-sm px-2 py-1.5 text-foreground hover:bg-paper-panel transition-colors"
              >
                {linker.title || "Untitled"}
              </button>
            ))}
          </div>
        </div>
      )}

      {onRestoreVersion && (
        <VersionHistory
          open={historyOpen}
          onOpenChange={setHistoryOpen}
          vaultPath={vaultPath}
          note={note}
          onRestore={onRestoreVersion}
        />
      )}
    </div>
  );
}
