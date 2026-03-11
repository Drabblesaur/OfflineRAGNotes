import { useState } from "react";
import { FileText } from "lucide-react";
import { cn } from "@/lib/utils";
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
  // All notes and folders in the app — used to populate the command dialog.
  allNotes: Note[];
  allFolders: Folder[];
  onTabSelect: (id: string) => void;
  onTabClose: (id: string) => void;
  onTabsReorder: (reordered: Tab[]) => void;
  onNoteChange?: (tabId: string, note: Note) => void;
  onFolderRename?: (tabId: string, name: string) => void;
  onNoteSelect?: (tabId: string, note: Note) => void;
  onNewNote?: (tabId: string) => void;
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
  allNotes,
  allFolders,
  onTabSelect,
  onTabClose,
  onTabsReorder,
  onNoteChange,
  onFolderRename,
  onNoteSelect,
  onNewNote,
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
        onTabSelect={onTabSelect}
        onTabClose={onTabClose}
        onTabsReorder={onTabsReorder}
        onAddClick={() => setCommandOpen(true)}
      />

      {/* Command dialog */}
      <OpenCommand
        open={commandOpen}
        onOpenChange={setCommandOpen}
        notes={allNotes}
        folders={allFolders}
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
          {tabs.map((tab) => (
            <div
              key={tab.id}
              className={cn(
                "absolute inset-0 overflow-y-auto transition-opacity duration-150",
                tab.id === activeTabId
                  ? "opacity-100 z-10 pointer-events-auto"
                  : "opacity-0 z-0 pointer-events-none",
              )}
            >
              {tab.type === "note" && (
                <NoteScreen
                  note={tab.note}
                  onChange={(updated) => onNoteChange?.(tab.id, updated)}
                />
              )}
              {tab.type === "folder" && (
                <FolderScreen
                  folder={tab.folder}
                  onNoteSelect={(note) => onNoteSelect?.(tab.id, note)}
                  onFolderRename={(name) => onFolderRename?.(tab.id, name)}
                  onNewNote={() => onNewNote?.(tab.id)}
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
