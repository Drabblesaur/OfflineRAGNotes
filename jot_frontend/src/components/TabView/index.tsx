import { useState } from "react";
import { FileText, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import TabBar from "./TabBar";
import OpenCommand from "./OpenCommand";
import NoteScreen from "@/components/NoteScreen";
import FolderScreen from "@/components/FolderScreen";
import type { Note } from "@/components/NoteScreen";
import type { Folder } from "@/components/FolderScreen";
import type { Tab } from "./Tabs";

// ── Types ─────────────────────────────────────────────────────────────────────

type Props = {
  tabs: Tab[];
  activeTabId: string | null;
  // Full persisted store — used both to populate the command dialog and to
  // resolve each tab's refId to its current Note/Folder at render time.
  notes: Note[];
  folders: Folder[];
  notesById: Map<string, Note>;
  foldersById: Map<string, Folder>;
  onTabSelect: (id: string) => void;
  onTabClose: (id: string) => void;
  onTabsReorder: (reordered: Tab[]) => void;
  onNoteChange?: (note: Note) => void;
  onFolderRename?: (folderId: string, name: string) => void;
  onNoteSelect?: (note: Note) => void;
  onFolderSelect?: (folder: Folder) => void;
  onNewNote?: (folderId: string | null) => void;
  onDeleteNote?: (noteId: string) => void;
  onMoveNote?: (noteId: string, folderId: string | null) => void;
  onDeleteFolder?: (folderId: string) => void;
  // Command dialog actions
  onOpenNote: (note: Note) => void;
  onOpenFolder: (folder: Folder) => void;
  onCreateNote: () => void;
  onCreateFolder: () => void;
};

// ── TabView ───────────────────────────────────────────────────────────────────

export default function TabView({
  tabs,
  activeTabId,
  notes,
  folders,
  notesById,
  foldersById,
  onTabSelect,
  onTabClose,
  onTabsReorder,
  onNoteChange,
  onFolderRename,
  onNoteSelect,
  onFolderSelect,
  onNewNote,
  onDeleteNote,
  onMoveNote,
  onDeleteFolder,
  onOpenNote,
  onOpenFolder,
  onCreateNote,
  onCreateFolder,
}: Props) {
  const [commandOpen, setCommandOpen] = useState(false);

  return (
    <div className="flex flex-col h-full w-full overflow-hidden">
      {/* Tab bar with add button */}
      <TabBar
        tabs={tabs}
        activeTabId={activeTabId}
        notesById={notesById}
        foldersById={foldersById}
        onTabSelect={onTabSelect}
        onTabClose={onTabClose}
        onTabsReorder={onTabsReorder}
        onAddClick={() => setCommandOpen(true)}
      />

      {/* Command dialog */}
      <OpenCommand
        open={commandOpen}
        onOpenChange={setCommandOpen}
        notes={notes}
        folders={folders}
        onOpenNote={onOpenNote}
        onOpenFolder={onOpenFolder}
        onNewNote={onCreateNote}
        onNewFolder={onCreateFolder}
      />

      {/* Empty state */}
      {tabs.length === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center gap-2 text-muted-foreground select-none">
          <FileText className="size-10 opacity-20" />
          <p className="text-sm">No open tabs</p>
          <button
            onClick={() => setCommandOpen(true)}
            className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
          >
            Open something
          </button>
        </div>
      )}

      {/* Tab panels — all mounted, only active visible.
          Keeps editor state and scroll position alive when switching tabs. */}
      {tabs.length > 0 && (
        <div className="flex-1 min-h-0 overflow-hidden relative">
          {tabs.map((tab) => {
            const note = tab.type === "note" ? notesById.get(tab.refId) : undefined;
            const folder =
              tab.type === "folder" ? foldersById.get(tab.refId) : undefined;

            return (
              <div
                key={tab.id}
                className={cn(
                  "absolute inset-0 overflow-y-auto transition-opacity duration-150",
                  tab.id === activeTabId
                    ? "opacity-100 z-10 pointer-events-auto"
                    : "opacity-0 z-0 pointer-events-none",
                )}
              >
                {tab.type === "note" &&
                  (note ? (
                    <NoteScreen
                      note={note}
                      folders={folders}
                      onChange={onNoteChange}
                      onDelete={
                        onDeleteNote ? () => onDeleteNote(note.id) : undefined
                      }
                      onMove={
                        onMoveNote
                          ? (folderId) => onMoveNote(note.id, folderId)
                          : undefined
                      }
                    />
                  ) : (
                    <DeletedTabPanel
                      label="This note"
                      onClose={() => onTabClose(tab.id)}
                    />
                  ))}
                {tab.type === "folder" &&
                  (folder ? (
                    <FolderScreen
                      folder={folder}
                      notes={notes.filter((n) => n.folderId === folder.id)}
                      subfolders={folders.filter(
                        (f) => f.parentId === folder.id,
                      )}
                      allFolders={folders}
                      onNoteSelect={onNoteSelect}
                      onFolderSelect={onFolderSelect}
                      onFolderRename={(name) =>
                        onFolderRename?.(folder.id, name)
                      }
                      onNewNote={() => onNewNote?.(folder.id)}
                      onDeleteNote={onDeleteNote}
                      onMoveNote={onMoveNote}
                      onDeleteFolder={
                        onDeleteFolder
                          ? () => onDeleteFolder(folder.id)
                          : undefined
                      }
                    />
                  ) : (
                    <DeletedTabPanel
                      label="This folder"
                      onClose={() => onTabClose(tab.id)}
                    />
                  ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Deleted tab fallback ─────────────────────────────────────────────────────
// Renders when a restored session references a note/folder that no longer
// exists in the store (e.g. deleted from another tab, or the DB was cleared).

function DeletedTabPanel({
  label,
  onClose,
}: {
  label: string;
  onClose: () => void;
}) {
  return (
    <div className="flex-1 h-full flex flex-col items-center justify-center gap-2 text-muted-foreground">
      <FileText className="size-10 opacity-20" />
      <p className="text-sm">{label} was deleted.</p>
      <Button variant="ghost" size="sm" onClick={onClose} className="gap-1.5">
        <X className="size-3.5" />
        Close tab
      </Button>
    </div>
  );
}
