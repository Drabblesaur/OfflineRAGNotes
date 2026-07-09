import { useState } from "react";
import { FileText, FolderOpen, Plus } from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { DialogTitle } from "@/components/ui/dialog";
import type { Note } from "@/components/NoteScreen";
import type { Folder } from "@/components/FolderScreen";
import { searchNotes } from "@/lib/search";

// ── Types ─────────────────────────────────────────────────────────────────────

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  notes: Note[];
  folders: Folder[];
  onOpenNote: (note: Note) => void;
  onOpenFolder: (folder: Folder) => void;
  onNewNote: () => void;
  onNewFolder: () => void;
};

function noteCountLabel(folder: Folder, notes: Note[]): string {
  const count = notes.filter((n) => n.folderId === folder.id).length;
  return `${count} ${count === 1 ? "note" : "notes"}`;
}

// ── OpenCommand ───────────────────────────────────────────────────────────────

export default function OpenCommand({
  open,
  onOpenChange,
  notes,
  folders,
  onOpenNote,
  onOpenFolder,
  onNewNote,
  onNewFolder,
}: Props) {
  const [search, setSearch] = useState("");

  function handleSelect(fn: () => void) {
    fn();
    onOpenChange(false);
  }

  function handleOpenChange(next: boolean) {
    if (!next) setSearch("");
    onOpenChange(next);
  }

  // cmdk's built-in filter only sees each item's `value` string (title/tags
  // below) — pre-filtering with the shared fuzzy searchNotes (title + tags +
  // body) and disabling cmdk's own filter lets the palette match on note
  // content too, not just titles.
  const matchedNotes = searchNotes(notes, search);
  const matchedFolders = search.trim()
    ? folders.filter((f) => f.name.toLowerCase().includes(search.trim().toLowerCase()))
    : folders;

  return (
    <CommandDialog open={open} onOpenChange={handleOpenChange} shouldFilter={false}>
      {/* DialogTitle required for screen reader accessibility */}
      <DialogTitle className="sr-only">Open note or folder</DialogTitle>

      <CommandInput
        placeholder="Search notes and folders…"
        value={search}
        onValueChange={setSearch}
      />

      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        {/* ── Create new ── */}
        <CommandGroup heading="Create">
          <CommandItem
            onSelect={() => handleSelect(onNewNote)}
            className="gap-2"
          >
            <Plus className="size-3.5 text-blue-500" />
            New Note
          </CommandItem>
          <CommandItem
            onSelect={() => handleSelect(onNewFolder)}
            className="gap-2"
          >
            <Plus className="size-3.5 text-amber-500" />
            New Folder
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        {/* ── Notes ── */}
        {matchedNotes.length > 0 && (
          <CommandGroup heading="Notes">
            {matchedNotes.map((note) => (
              <CommandItem
                key={note.id}
                value={`note-${note.id}-${note.title}`}
                onSelect={() => handleSelect(() => onOpenNote(note))}
                className="gap-2"
              >
                <FileText className="size-3.5 shrink-0 text-blue-500" />
                <span className="flex-1 truncate">
                  {note.title || "Untitled"}
                </span>
                {note.tags.length > 0 && (
                  <span className="text-xs text-muted-foreground truncate max-w-[120px]">
                    {note.tags.join(", ")}
                  </span>
                )}
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {matchedNotes.length > 0 && matchedFolders.length > 0 && <CommandSeparator />}

        {/* ── Folders ── */}
        {matchedFolders.length > 0 && (
          <CommandGroup heading="Folders">
            {matchedFolders.map((folder) => (
              <CommandItem
                key={folder.id}
                value={`folder-${folder.id}-${folder.name}`}
                onSelect={() => handleSelect(() => onOpenFolder(folder))}
                className="gap-2"
              >
                <FolderOpen className="size-3.5 shrink-0 text-amber-500" />
                <span className="flex-1 truncate">
                  {folder.name || "Untitled Folder"}
                </span>
                <span className="text-xs text-muted-foreground">
                  {noteCountLabel(folder, notes)}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}
