import { useState, useRef, useEffect } from "react";
import type { JSONContent } from "@tiptap/core";
import { format } from "date-fns";
import { Star, Tag, X, Plus, Calendar, List } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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

// ── Types ─────────────────────────────────────────────────────────────────────

export type Note = {
  id: string;
  title: string;
  contentJSON: JSONContent; // source of truth for the editor
  contentMd: string; // derived plain text for RAG embedding
  favorite: boolean;
  tags: string[];
  date: Date;
};

type Props = {
  note: Note;
  onChange?: (updated: Note) => void;
};

// ── NoteScreen ────────────────────────────────────────────────────────────────

export default function NoteScreen({ note, onChange }: Props) {
  const [title, setTitle] = useState(note.title);
  const [favorite, setFavorite] = useState(note.favorite);
  const [tags, setTags] = useState<string[]>(note.tags);
  const [date, setDate] = useState<Date>(note.date);
  const [focused, setFocused] = useState(false);
  const [tocItems, setTocItems] = useState<ToCItem[]>([]);
  const [tocOpen, setTocOpen] = useState(false);

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

  // ── Helpers ──────────────────────────────────────────────────────────────────

  function handleMenuOpenChange(open: boolean) {
    menuOpenRef.current = open;
    if (open) setFocused(true);
  }

  function patch(partial: Partial<Note>) {
    onChange?.({ ...note, title, favorite, tags, date, ...partial });
  }

  function handleTitleChange(value: string) {
    // Update local state instantly for responsive typing.
    // patch() is NOT called here — onChange on every keystroke causes a parent
    // re-render which makes tiptap steal focus back mid-type.
    setTitle(value);
  }

  function handleTitleBlur() {
    patch({ title });
  }

  function handleContentChange(contentJSON: JSONContent) {
    // Debounce saves so onChange fires ~500ms after the user stops typing,
    // rather than on every keystroke.
    if (saveContentTimer.current) clearTimeout(saveContentTimer.current);
    saveContentTimer.current = setTimeout(() => {
      patch({ contentJSON });
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
            "flex-1 text-3xl font-semibold tracking-tight bg-transparent border-none outline-none",
            "placeholder:text-muted-foreground/40 text-foreground leading-tight",
          )}
          value={title}
          onChange={(e) => handleTitleChange(e.target.value)}
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
      </div>

      {/* ── Meta row: date + tags ── */}
      <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
        {/* Editable date */}
        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 gap-1.5 text-muted-foreground hover:text-foreground font-normal"
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
            <Badge
              key={tag}
              variant="secondary"
              className="gap-1 pr-1 text-xs font-normal"
            >
              {tag}
              <button
                onClick={() => removeTag(tag)}
                aria-label={`Remove tag ${tag}`}
                className="rounded-full hover:text-destructive transition-colors"
              >
                <X className="size-2.5" />
              </button>
            </Badge>
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
      <div className="flex gap-8 items-start">
        {/* Editor */}
        <div ref={editorRef} className="flex-1 min-w-0">
          <Editor
            focused={focused}
            noteId={note.id}
            content={note.contentJSON}
            onContentChange={handleContentChange}
            onToCChange={setTocItems}
            onMenuOpenChange={handleMenuOpenChange}
          />
        </div>

        {/* Table of Contents — only shown on xl+ screens when toggled on */}
        {tocOpen && tocItems.length > 0 && (
          <aside className="hidden xl:flex flex-col gap-1 w-44 shrink-0 sticky top-6 border rounded-md bg-white/95 backdrop-blur shadow-sm p-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
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
        )}
      </div>
    </div>
  );
}
