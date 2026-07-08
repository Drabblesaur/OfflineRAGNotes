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
  function handleSelect(fn: () => void) {
    fn();
    onOpenChange(false);
  }

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      {/* DialogTitle required for screen reader accessibility */}
      <DialogTitle className="sr-only">Open note or folder</DialogTitle>

      <CommandInput placeholder="Search notes and folders…" />

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
        {notes.length > 0 && (
          <CommandGroup heading="Notes">
            {notes.map((note) => (
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

        {notes.length > 0 && folders.length > 0 && <CommandSeparator />}

        {/* ── Folders ── */}
        {folders.length > 0 && (
          <CommandGroup heading="Folders">
            {folders.map((folder) => (
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
