import { useState } from "react";
import {
  SquarePen,
  FolderPlus,
  Search,
  Star,
  FileText,
  FolderInput,
  Trash2,
  Inbox,
  Folder as FolderIcon,
  Settings as SettingsIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import ConfirmDialog from "@/components/ConfirmDialog";
import Logo from "@/components/Logo";
import FolderTree from "./FolderTree";
import IndexStatusBadge from "./IndexStatusBadge";
import type { Note } from "@/components/NoteScreen";
import type { Folder } from "@/components/FolderScreen";

type Props = {
  folders: Folder[];
  notes: Note[];
  activeFolderId: string | null;
  activeNoteId: string | null;
  onOpenFolder: (folder: Folder) => void;
  onOpenNote: (note: Note) => void;
  onNewNote: (folderId: string | null) => void;
  onNewFolder: (parentId: string | null) => void;
  onRenameFolder: (folderId: string, name: string) => void;
  onMoveFolder: (folderId: string, parentId: string | null) => void;
  onDeleteFolder: (folderId: string) => void;
  onToggleFavorite: (noteId: string) => void;
  onMoveNote: (noteId: string, folderId: string | null) => void;
  onDeleteNote: (noteId: string) => void;
  onOpenCommand: () => void;
  onOpenSettings: () => void;
};

export default function Sidebar({
  folders,
  notes,
  activeFolderId,
  activeNoteId,
  onOpenFolder,
  onOpenNote,
  onNewNote,
  onNewFolder,
  onRenameFolder,
  onMoveFolder,
  onDeleteFolder,
  onToggleFavorite,
  onMoveNote,
  onDeleteNote,
  onOpenCommand,
  onOpenSettings,
}: Props) {
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());

  function toggleExpand(id: string) {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const favorites = notes
    .filter((n) => n.favorite)
    .sort((a, b) => b.lastEditedAt.getTime() - a.lastEditedAt.getTime());

  const unfiled = notes
    .filter((n) => n.folderId === null)
    .sort((a, b) => b.lastEditedAt.getTime() - a.lastEditedAt.getTime());

  return (
    <div className="w-64 shrink-0 h-full flex flex-col border-r border-line bg-paper-panel">
      {/* ── Brand ── */}
      <div className="px-3 pt-3 pb-1">
        <Logo />
      </div>

      {/* ── Quick actions ── */}
      <div className="flex items-center gap-1 p-2 border-b border-line">
        <Button
          variant="ghost"
          size="sm"
          onClick={onOpenCommand}
          className="flex-1 justify-start gap-2 text-muted-foreground hover:text-foreground"
        >
          <Search className="size-3.5" />
          Search
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => onNewNote(null)}
          aria-label="New note"
          className="text-muted-foreground hover:text-foreground"
        >
          <SquarePen className="size-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => onNewFolder(null)}
          aria-label="New folder"
          className="text-muted-foreground hover:text-foreground"
        >
          <FolderPlus className="size-3.5" />
        </Button>
      </div>

      {/* ── Scrollable sections ── */}
      <div className="flex-1 overflow-y-auto py-2">
        {favorites.length > 0 && (
          <SidebarSection title="Favorites">
            {favorites.map((note) => (
              <SidebarRow
                key={note.id}
                note={note}
                folders={folders}
                icon={<Star className="size-3.5 shrink-0 fill-amber-400 text-amber-400" />}
                active={activeNoteId === note.id}
                onClick={() => onOpenNote(note)}
                onToggleFavorite={onToggleFavorite}
                onMoveNote={onMoveNote}
                onDeleteNote={onDeleteNote}
              />
            ))}
          </SidebarSection>
        )}

        <SidebarSection title="Folders">
          <FolderTree
            folders={folders}
            notes={notes}
            activeFolderId={activeFolderId}
            collapsedIds={collapsedIds}
            onToggleExpand={toggleExpand}
            onOpenFolder={onOpenFolder}
            onNewNote={onNewNote}
            onNewFolder={onNewFolder}
            onRenameFolder={onRenameFolder}
            onMoveFolder={onMoveFolder}
            onDeleteFolder={onDeleteFolder}
          />
        </SidebarSection>

        {unfiled.length > 0 && (
          <SidebarSection title="Unfiled">
            {unfiled.map((note) => (
              <SidebarRow
                key={note.id}
                note={note}
                folders={folders}
                icon={<FileText className="size-3.5 shrink-0 text-muted-foreground/60" />}
                active={activeNoteId === note.id}
                onClick={() => onOpenNote(note)}
                onToggleFavorite={onToggleFavorite}
                onMoveNote={onMoveNote}
                onDeleteNote={onDeleteNote}
              />
            ))}
          </SidebarSection>
        )}
      </div>

      {/* ── Footer ── */}
      <div className="border-t border-line flex items-center">
        <div className="flex-1 min-w-0">
          <IndexStatusBadge />
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onOpenSettings}
          aria-label="Settings"
          className="mr-1 text-ink-500 hover:text-ink-900"
        >
          <SettingsIcon className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}

// ── Shared bits ──────────────────────────────────────────────────────────────

function SidebarSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="px-2 py-1.5">
      <p className="px-2 pb-1 font-mono text-[11px] uppercase tracking-widest text-ink-500">
        {title}
      </p>
      {children}
    </div>
  );
}

function SidebarRow({
  note,
  folders,
  icon,
  active,
  onClick,
  onToggleFavorite,
  onMoveNote,
  onDeleteNote,
}: {
  note: Note;
  folders: Folder[];
  icon: React.ReactNode;
  active: boolean;
  onClick: () => void;
  onToggleFavorite: (noteId: string) => void;
  onMoveNote: (noteId: string, folderId: string | null) => void;
  onDeleteNote: (noteId: string) => void;
}) {
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <button
            onClick={onClick}
            className={cn(
              "w-full flex items-center gap-1.5 px-2 py-1.5 rounded-[10px] text-sm text-left transition-colors",
              active
                ? "bg-ink-900/8 border border-ink-900/15 text-ink-900 font-medium"
                : "border border-transparent text-ink-700 hover:bg-paper-panel hover:text-ink-900",
            )}
          >
            {active && <span className="size-1.5 rounded-full bg-ink-900 shrink-0" />}
            {icon}
            <span className="truncate">{note.title || "Untitled"}</span>
          </button>
        </ContextMenuTrigger>

        <ContextMenuContent className="w-48">
          <ContextMenuItem
            onClick={() => onToggleFavorite(note.id)}
            className="gap-2"
          >
            <Star
              className={cn(
                "size-3.5",
                note.favorite && "fill-amber-400 text-amber-400",
              )}
            />
            {note.favorite ? "Remove from Favorites" : "Add to Favorites"}
          </ContextMenuItem>
          <ContextMenuSub>
            <ContextMenuSubTrigger className="gap-2">
              <FolderInput className="size-3.5" />
              Move to
            </ContextMenuSubTrigger>
            <ContextMenuSubContent>
              {note.folderId !== null && (
                <ContextMenuItem
                  onClick={() => onMoveNote(note.id, null)}
                  className="gap-2"
                >
                  <Inbox className="size-3.5" />
                  Unfiled
                </ContextMenuItem>
              )}
              {folders.length === 0 ? (
                <ContextMenuItem disabled>No folders</ContextMenuItem>
              ) : (
                folders
                  .filter((f) => f.id !== note.folderId)
                  .map((folder) => (
                    <ContextMenuItem
                      key={folder.id}
                      onClick={() => onMoveNote(note.id, folder.id)}
                      className="gap-2"
                    >
                      <FolderIcon className="size-3.5 text-amber-500" />
                      <span className="truncate">
                        {folder.name || "Untitled Folder"}
                      </span>
                    </ContextMenuItem>
                  ))
              )}
            </ContextMenuSubContent>
          </ContextMenuSub>
          <ContextMenuSeparator />
          <ContextMenuItem
            variant="destructive"
            onClick={() => setDeleteOpen(true)}
            className="gap-2"
          >
            <Trash2 className="size-3.5" />
            Delete
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={`Delete "${note.title || "Untitled"}"?`}
        description="This note will be permanently deleted."
        onConfirm={() => {
          setDeleteOpen(false);
          onDeleteNote(note.id);
        }}
      />
    </>
  );
}
