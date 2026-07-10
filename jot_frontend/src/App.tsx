import { useEffect, useMemo, useRef, useState } from "react";
import { TooltipProvider } from "./components/ui/tooltip";
import TabView from "./components/TabView";
import Sidebar from "./components/Sidebar";
import OpenCommand from "./components/TabView/OpenCommand";
import Settings from "./components/Settings";
import TrashScreen from "./components/TrashScreen";
import VaultPicker from "./components/Onboarding/VaultPicker";
import type { Tab } from "./components/TabView/Tabs";
import type { Note } from "./components/NoteScreen";
import type { Folder } from "./components/FolderScreen";
import { useNotesStore } from "./hooks/useNotesStore";
import { useTheme } from "./hooks/useTheme";
import { loadSession, saveSession } from "./lib/session";
import { getTrashRetentionDays } from "./lib/trashSettings";

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
  const { theme, setTheme } = useTheme();

  const [tabs, setTabs] = useState<Tab[]>(() => loadSession()?.tabs ?? []);
  const [activeTabId, setActiveTabId] = useState<string | null>(
    () => loadSession()?.activeTabId ?? null,
  );
  const [commandOpen, setCommandOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [trashOpen, setTrashOpen] = useState(false);

  const activeTab = tabs.find((t) => t.id === activeTabId) ?? null;
  const activeFolderId = activeTab?.type === "folder" ? activeTab.refId : null;
  const activeNoteId = activeTab?.type === "note" ? activeTab.refId : null;

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

  // Renaming/moving a folder changes its id (folder ids are vault-relative
  // paths) — any open folder tab pointing at the old path needs its refId
  // rewritten to the new one, or it'd silently stop resolving to anything.
  // Note tabs need no equivalent repair: note ids are stable UUIDs in
  // frontmatter, independent of the file's path.
  function repairFolderTabs(pathMap: Map<string, string>) {
    if (pathMap.size === 0) return;
    setTabs((prev) =>
      prev.map((t) =>
        t.type === "folder" && pathMap.has(t.refId)
          ? { ...t, refId: pathMap.get(t.refId)! }
          : t,
      ),
    );
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

  // Used by [[wikilink]] autocomplete/click-to-create — creates a titled note
  // without opening a tab for it, so the user stays in the note they're
  // linking from.
  async function createLinkedNote(folderId: string | null, title: string): Promise<Note> {
    const created = await store.createNote(folderId);
    const renamed = await store.updateNote(created.id, { title });
    return renamed ?? created;
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

  async function renameFolder(id: string, name: string) {
    const pathMap = await store.renameFolder(id, name);
    repairFolderTabs(pathMap);
  }

  async function moveFolder(id: string, parentId: string | null) {
    const pathMap = await store.moveFolder(id, parentId);
    repairFolderTabs(pathMap);
  }

  function toggleFavorite(noteId: string) {
    const note = notesById.get(noteId);
    if (!note) return;
    store.updateNote(noteId, { favorite: !note.favorite });
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  if (!store.vaultPath) {
    return <VaultPicker onVaultSelected={store.selectVault} />;
  }

  if (store.loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="h-screen w-screen overflow-hidden flex">
        <Sidebar
          folders={store.folders}
          notes={store.notes}
          activeFolderId={activeFolderId}
          activeNoteId={activeNoteId}
          onOpenFolder={openFolder}
          onOpenNote={openNote}
          onNewNote={createNote}
          onNewFolder={createFolder}
          onRenameFolder={renameFolder}
          onMoveFolder={moveFolder}
          onDeleteFolder={deleteFolder}
          onToggleFavorite={toggleFavorite}
          onMoveNote={(noteId, folderId) => store.moveNote(noteId, folderId)}
          onDeleteNote={deleteNote}
          onOpenCommand={() => setCommandOpen(true)}
          onOpenSettings={() => setSettingsOpen(true)}
          onOpenTrash={() => setTrashOpen(true)}
        />
        <div className="flex-1 min-w-0">
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
            onFolderRename={renameFolder}
            onNoteSelect={openNote}
            onFolderSelect={openFolder}
            onNewNote={(folderId) => createNote(folderId)}
            onDeleteNote={deleteNote}
            onMoveNote={(noteId, folderId) =>
              store.moveNote(noteId, folderId)
            }
            onDeleteFolder={deleteFolder}
            onOpenCommand={() => setCommandOpen(true)}
            onCreateNote={createLinkedNote}
            vaultPath={store.vaultPath}
            onRestoreVersion={store.restoreVersion}
          />
        </div>
      </div>

      <OpenCommand
        open={commandOpen}
        onOpenChange={setCommandOpen}
        notes={store.notes}
        folders={store.folders}
        onOpenNote={openNote}
        onOpenFolder={openFolder}
        onNewNote={() => createNote(null)}
        onNewFolder={() => createFolder(null)}
      />

      <Settings
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        notes={store.notes}
        folders={store.folders}
        theme={theme}
        onThemeChange={setTheme}
      />

      <TrashScreen
        open={trashOpen}
        onOpenChange={setTrashOpen}
        trash={store.trash}
        folders={store.folders}
        retentionDays={getTrashRetentionDays()}
        onRestore={async (trashId) => {
          await store.restoreNote(trashId);
        }}
        onDeleteForever={store.deleteForever}
        onEmptyTrash={store.emptyTrash}
      />
    </TooltipProvider>
  );
}
