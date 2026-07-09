import { useMemo, useState } from "react";
import {
  ChevronRight,
  ChevronDown,
  FolderOpen,
  Folder as FolderIcon,
  SquarePen,
  FolderPlus,
  Pencil,
  FolderInput,
  Trash2,
  Inbox,
} from "lucide-react";
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
import type { Note } from "@/components/NoteScreen";
import type { Folder } from "@/components/FolderScreen";

type Props = {
  folders: Folder[];
  notes: Note[];
  activeFolderId: string | null;
  // Ids explicitly collapsed by the user — absence means expanded, so a
  // fresh/empty set (the default) renders the whole tree open.
  collapsedIds: Set<string>;
  onToggleExpand: (id: string) => void;
  onOpenFolder: (folder: Folder) => void;
  onNewNote: (folderId: string) => void;
  onNewFolder: (parentId: string) => void;
  onRenameFolder: (folderId: string, name: string) => void;
  onMoveFolder: (folderId: string, parentId: string | null) => void;
  onDeleteFolder: (folderId: string) => void;
};

// Walks the parent→children map to collect every descendant id of `rootId`
// (used to keep the "Move to" submenu from offering a folder's own subtree).
function collectDescendantIds(
  childrenByParent: Map<string | null, Folder[]>,
  rootId: string,
): Set<string> {
  const result = new Set<string>();
  const stack = [rootId];
  while (stack.length > 0) {
    const id = stack.pop()!;
    for (const child of childrenByParent.get(id) ?? []) {
      result.add(child.id);
      stack.push(child.id);
    }
  }
  return result;
}

export default function FolderTree({
  folders,
  notes,
  activeFolderId,
  collapsedIds,
  onToggleExpand,
  onOpenFolder,
  onNewNote,
  onNewFolder,
  onRenameFolder,
  onMoveFolder,
  onDeleteFolder,
}: Props) {
  const childrenByParent = useMemo(() => {
    const map = new Map<string | null, Folder[]>();
    for (const folder of folders) {
      const key = folder.parentId;
      const siblings = map.get(key) ?? [];
      siblings.push(folder);
      map.set(key, siblings);
    }
    return map;
  }, [folders]);

  const roots = childrenByParent.get(null) ?? [];

  if (roots.length === 0) {
    return (
      <p className="px-2 py-1 text-xs text-muted-foreground/60 italic">
        No folders yet
      </p>
    );
  }

  return (
    <div>
      {roots.map((folder) => (
        <FolderNode
          key={folder.id}
          folder={folder}
          depth={0}
          folders={folders}
          notes={notes}
          childrenByParent={childrenByParent}
          activeFolderId={activeFolderId}
          collapsedIds={collapsedIds}
          onToggleExpand={onToggleExpand}
          onOpenFolder={onOpenFolder}
          onNewNote={onNewNote}
          onNewFolder={onNewFolder}
          onRenameFolder={onRenameFolder}
          onMoveFolder={onMoveFolder}
          onDeleteFolder={onDeleteFolder}
        />
      ))}
    </div>
  );
}

function FolderNode({
  folder,
  depth,
  folders,
  notes,
  childrenByParent,
  activeFolderId,
  collapsedIds,
  onToggleExpand,
  onOpenFolder,
  onNewNote,
  onNewFolder,
  onRenameFolder,
  onMoveFolder,
  onDeleteFolder,
}: {
  folder: Folder;
  depth: number;
  folders: Folder[];
  notes: Note[];
  childrenByParent: Map<string | null, Folder[]>;
  activeFolderId: string | null;
  collapsedIds: Set<string>;
  onToggleExpand: (id: string) => void;
  onOpenFolder: (folder: Folder) => void;
  onNewNote: (folderId: string) => void;
  onNewFolder: (parentId: string) => void;
  onRenameFolder: (folderId: string, name: string) => void;
  onMoveFolder: (folderId: string, parentId: string | null) => void;
  onDeleteFolder: (folderId: string) => void;
}) {
  const children = childrenByParent.get(folder.id) ?? [];
  const hasChildren = children.length > 0;
  const expanded = !collapsedIds.has(folder.id);
  const isActive = activeFolderId === folder.id;

  const [renaming, setRenaming] = useState(false);
  const [draftName, setDraftName] = useState(folder.name);
  const [deleteOpen, setDeleteOpen] = useState(false);

  function startRename() {
    setDraftName(folder.name);
    setRenaming(true);
  }

  function commitRename() {
    const trimmed = draftName.trim();
    if (trimmed && trimmed !== folder.name) onRenameFolder(folder.id, trimmed);
    setRenaming(false);
  }

  function handleRenameKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") e.currentTarget.blur();
    if (e.key === "Escape") {
      setDraftName(folder.name);
      setRenaming(false);
    }
  }

  const descendantIds = collectDescendantIds(childrenByParent, folder.id);
  const moveTargets = folders.filter(
    (f) =>
      f.id !== folder.id &&
      f.id !== folder.parentId &&
      !descendantIds.has(f.id),
  );
  const canMoveToRoot = folder.parentId !== null;

  const directNoteCount = notes.filter((n) => n.folderId === folder.id).length;
  const directSubfolderCount = children.length;

  const indentPx = 8 + depth * 16;

  if (renaming) {
    return (
      <div style={{ paddingLeft: `${indentPx + 20}px` }} className="pr-2 py-0.5">
        <input
          autoFocus
          value={draftName}
          onChange={(e) => setDraftName(e.target.value)}
          onBlur={commitRename}
          onKeyDown={handleRenameKeyDown}
          onFocus={(e) => e.currentTarget.select()}
          className="w-full text-sm bg-transparent border-none outline-none rounded px-1 -mx-1 focus:bg-muted/40"
        />
      </div>
    );
  }

  return (
    <div>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <button
            onClick={() => onOpenFolder(folder)}
            style={{ paddingLeft: `${indentPx}px` }}
            className={cn(
              "w-full flex items-center gap-1 pr-2 py-1.5 rounded-[10px] text-sm text-left transition-colors group",
              isActive
                ? "bg-ink-900/8 border border-ink-900/15 text-ink-900 font-medium"
                : "border border-transparent text-ink-700 hover:bg-paper-panel hover:text-ink-900",
            )}
          >
            <span
              role="button"
              aria-label={expanded ? "Collapse folder" : "Expand folder"}
              onClick={(e) => {
                e.stopPropagation();
                if (hasChildren) onToggleExpand(folder.id);
              }}
              className={cn(
                "shrink-0 size-4 flex items-center justify-center rounded-sm",
                hasChildren ? "hover:bg-line" : "opacity-0 pointer-events-none",
              )}
            >
              {hasChildren &&
                (expanded ? (
                  <ChevronDown className="size-3" />
                ) : (
                  <ChevronRight className="size-3" />
                ))}
            </span>
            {isActive ? (
              <FolderOpen className="size-3.5 shrink-0 text-amber-500" />
            ) : (
              <FolderIcon className="size-3.5 shrink-0 text-muted-foreground/60 group-hover:text-amber-500 transition-colors" />
            )}
            <span className="truncate">{folder.name || "Untitled Folder"}</span>
          </button>
        </ContextMenuTrigger>

        <ContextMenuContent className="w-48">
          <ContextMenuItem onClick={() => onNewNote(folder.id)} className="gap-2">
            <SquarePen className="size-3.5" />
            New Note
          </ContextMenuItem>
          <ContextMenuItem onClick={() => onNewFolder(folder.id)} className="gap-2">
            <FolderPlus className="size-3.5" />
            New Subfolder
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem onClick={startRename} className="gap-2">
            <Pencil className="size-3.5" />
            Rename
          </ContextMenuItem>
          <ContextMenuSub>
            <ContextMenuSubTrigger className="gap-2">
              <FolderInput className="size-3.5" />
              Move to
            </ContextMenuSubTrigger>
            <ContextMenuSubContent>
              {canMoveToRoot && (
                <ContextMenuItem
                  onClick={() => onMoveFolder(folder.id, null)}
                  className="gap-2"
                >
                  <Inbox className="size-3.5" />
                  Root
                </ContextMenuItem>
              )}
              {moveTargets.length === 0 && !canMoveToRoot ? (
                <ContextMenuItem disabled>No other folders</ContextMenuItem>
              ) : (
                moveTargets.map((target) => (
                  <ContextMenuItem
                    key={target.id}
                    onClick={() => onMoveFolder(folder.id, target.id)}
                    className="gap-2"
                  >
                    <FolderIcon className="size-3.5 text-amber-500" />
                    <span className="truncate">
                      {target.name || "Untitled Folder"}
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
        title={`Delete "${folder.name || "Untitled Folder"}"?`}
        description={`This will permanently delete ${directNoteCount} ${
          directNoteCount === 1 ? "note" : "notes"
        } and ${directSubfolderCount} ${
          directSubfolderCount === 1 ? "subfolder" : "subfolders"
        } (including everything inside them).`}
        onConfirm={() => {
          setDeleteOpen(false);
          onDeleteFolder(folder.id);
        }}
      />

      {hasChildren && expanded && (
        <div>
          {children.map((child) => (
            <FolderNode
              key={child.id}
              folder={child}
              depth={depth + 1}
              folders={folders}
              notes={notes}
              childrenByParent={childrenByParent}
              activeFolderId={activeFolderId}
              collapsedIds={collapsedIds}
              onToggleExpand={onToggleExpand}
              onOpenFolder={onOpenFolder}
              onNewNote={onNewNote}
              onNewFolder={onNewFolder}
              onRenameFolder={onRenameFolder}
              onMoveFolder={onMoveFolder}
              onDeleteFolder={onDeleteFolder}
            />
          ))}
        </div>
      )}
    </div>
  );
}
