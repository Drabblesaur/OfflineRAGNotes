import { useEffect, useMemo, useRef, useState } from "react";
import { TooltipProvider } from "./components/ui/tooltip";
import TabView from "./components/TabView";
import type { Tab } from "./components/TabView/Tabs";
import type { Note } from "./components/NoteScreen";
import type { Folder } from "./components/FolderScreen";
import { useNotesStore } from "./hooks/useNotesStore";
import { loadSession, saveSession } from "./lib/session";

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeNoteTab(note: Note): Tab {
  return { id: `note-${note.id}-${Date.now()}`, type: "note", refId: note.id };
}

function makeFolderTab(folder: Folder): Tab {
  return {
    id: `folder-${folder.id}-${Date.now()}`,
    type: "folder",
    refId: folder.id,
  };
}

// ── App ───────────────────────────────────────────────────────────────────────

export default function App() {
  const store = useNotesStore();

  const [tabs, setTabs] = useState<Tab[]>(() => loadSession()?.tabs ?? []);
  const [activeTabId, setActiveTabId] = useState<string | null>(
    () => loadSession()?.activeTabId ?? null,
  );

  const notesById = useMemo(
    () => new Map(store.notes.map((n) => [n.id, n])),
    [store.notes],
  );
  const foldersById = useMemo(
    () => new Map(store.folders.map((f) => [f.id, f])),
    [store.folders],
  );

  // First-ever load (empty session, e.g. a brand new browser profile): once
  // seeding/loading finishes, open a tab for the top-level folder so the user
  // doesn't land on the "no open tabs" empty state immediately after seeding.
  const autoOpenedRef = useRef(false);
  useEffect(() => {
    if (store.loading || autoOpenedRef.current) return;
    autoOpenedRef.current = true;
    if (tabs.length === 0) {
      const rootFolder = store.folders.find((f) => f.parentId === null);
      if (rootFolder) {
        const tab = makeFolderTab(rootFolder);
        setTabs([tab]);
        setActiveTabId(tab.id);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.loading]);

  useEffect(() => {
    saveSession({ tabs, activeTabId });
  }, [tabs, activeTabId]);

  // ── Tab management ──────────────────────────────────────────────────────────

  function openTab(tab: Tab) {
    setTabs((prev) => [...prev, tab]);
    setActiveTabId(tab.id);
  }

  function closeTab(id: string) {
    const remaining = tabs.filter((t) => t.id !== id);
    setTabs(remaining);
    if (activeTabId === id) setActiveTabId(remaining.at(-1)?.id ?? null);
  }

  function closeTabsByRefIds(refIds: Set<string>) {
    setTabs((prev) => {
      const remaining = prev.filter((t) => !refIds.has(t.refId));
      if (remaining.length !== prev.length) {
        setActiveTabId((current) =>
          remaining.some((t) => t.id === current)
            ? current
            : (remaining.at(-1)?.id ?? null),
        );
      }
      return remaining;
    });
  }

  function reorderTabs(reordered: Tab[]) {
    setTabs(reordered);
  }

  // ── Note actions ────────────────────────────────────────────────────────────

  function openNote(note: Note) {
    const existing = tabs.find(
      (t) => t.type === "note" && t.refId === note.id,
    );
    if (existing) {
      setActiveTabId(existing.id);
      return;
    }
    openTab(makeNoteTab(note));
  }

  async function createNote(folderId: string | null) {
    const note = await store.createNote(folderId);
    openTab(makeNoteTab(note));
  }

  async function deleteNote(id: string) {
    await store.deleteNote(id);
    closeTabsByRefIds(new Set([id]));
  }

  // ── Folder actions ──────────────────────────────────────────────────────────

  function openFolder(folder: Folder) {
    const existing = tabs.find(
      (t) => t.type === "folder" && t.refId === folder.id,
    );
    if (existing) {
      setActiveTabId(existing.id);
      return;
    }
    openTab(makeFolderTab(folder));
  }

  async function createFolder(parentId: string | null) {
    const folder = await store.createFolder(parentId);
    openTab(makeFolderTab(folder));
  }

  async function deleteFolder(id: string) {
    const { deletedNoteIds, deletedFolderIds } = await store.deleteFolder(id);
    closeTabsByRefIds(new Set([...deletedNoteIds, ...deletedFolderIds]));
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  if (store.loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="h-screen w-screen overflow-hidden">
        <TabView
          tabs={tabs}
          activeTabId={activeTabId}
          notes={store.notes}
          folders={store.folders}
          notesById={notesById}
          foldersById={foldersById}
          onTabSelect={setActiveTabId}
          onTabClose={closeTab}
          onTabsReorder={reorderTabs}
          onNoteChange={(note) => store.updateNote(note.id, note)}
          onFolderRename={(folderId, name) =>
            store.renameFolder(folderId, name)
          }
          onNoteSelect={openNote}
          onFolderSelect={openFolder}
          onNewNote={(folderId) => createNote(folderId)}
          onDeleteNote={deleteNote}
          onMoveNote={(noteId, folderId) => store.moveNote(noteId, folderId)}
          onDeleteFolder={deleteFolder}
          onOpenNote={openNote}
          onOpenFolder={openFolder}
          onCreateNote={() => createNote(null)}
          onCreateFolder={() => createFolder(null)}
        />
      </div>
    </TooltipProvider>
  );
}
