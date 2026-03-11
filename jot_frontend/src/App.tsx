import { useState } from "react";
import { TooltipProvider } from "./components/ui/tooltip";
import TabView from "./components/TabView";
import type { Tab } from "./components/TabView/Tabs";
import type { Note } from "./components/NoteScreen";
import type { Folder } from "./components/FolderScreen";
import { mockFolder } from "./mock/mockFolder";
import { mockNote } from "./mock/mockNote";

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeNoteTab(note: Note): Tab {
  return { id: `note-${note.id}-${Date.now()}`, type: "note", note };
}

function makeFolderTab(folder: Folder): Tab {
  return { id: `folder-${folder.id}-${Date.now()}`, type: "folder", folder };
}

// ── App ───────────────────────────────────────────────────────────────────────

export default function App() {
  const [tabs, setTabs] = useState<Tab[]>([
    { id: "t1", type: "note", note: mockNote },
    { id: "t2", type: "folder", folder: mockFolder },
  ]);
  const [activeTabId, setActiveTabId] = useState<string | null>("t1");

  // Flat lists for the command dialog to search across.
  const allNotes: Note[] = tabs
    .filter((t): t is Extract<Tab, { type: "note" }> => t.type === "note")
    .map((t) => t.note);

  const allFolders: Folder[] = tabs
    .filter((t): t is Extract<Tab, { type: "folder" }> => t.type === "folder")
    .map((t) => t.folder);

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

  // ── Note actions ────────────────────────────────────────────────────────────

  function openNote(note: Note) {
    const existing = tabs.find(
      (t) => t.type === "note" && t.note.id === note.id,
    );
    if (existing) {
      setActiveTabId(existing.id);
      return;
    }
    openTab(makeNoteTab(note));
  }

  function updateNote(tabId: string, updated: Note) {
    setTabs((prev) =>
      prev.map((t) =>
        t.id === tabId && t.type === "note" ? { ...t, note: updated } : t,
      ),
    );
  }

  function createNote() {
    console.log("TODO: create new note and open in tab");
  }

  // ── Folder actions ──────────────────────────────────────────────────────────

  function openFolder(folder: Folder) {
    const existing = tabs.find(
      (t) => t.type === "folder" && t.folder.id === folder.id,
    );
    if (existing) {
      setActiveTabId(existing.id);
      return;
    }
    openTab(makeFolderTab(folder));
  }

  function renameFolder(tabId: string, name: string) {
    setTabs((prev) =>
      prev.map((t) =>
        t.id === tabId && t.type === "folder"
          ? { ...t, folder: { ...t.folder, name } }
          : t,
      ),
    );
  }

  function createFolder() {
    console.log("TODO: create new folder and open in tab");
  }

  function reorderTabs(reordered: Tab[]) {
    setTabs(reordered);
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <TooltipProvider>
      <div className="h-screen w-screen overflow-hidden">
        <TabView
          tabs={tabs}
          activeTabId={activeTabId}
          allNotes={allNotes}
          allFolders={allFolders}
          onTabSelect={setActiveTabId}
          onTabClose={closeTab}
          onTabsReorder={reorderTabs}
          onNoteChange={updateNote}
          onFolderRename={renameFolder}
          onNoteSelect={(_tabId, note) => openNote(note)}
          onNewNote={(_tabId) => createNote()}
          onOpenNote={openNote}
          onOpenFolder={openFolder}
          onCreateNote={createNote}
          onCreateFolder={createFolder}
        />
      </div>
    </TooltipProvider>
  );
}
