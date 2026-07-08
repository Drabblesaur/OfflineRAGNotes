import type { Note } from "@/components/NoteScreen";
import type { Folder } from "@/components/FolderScreen";

// Tabs hold only a reference — the actual Note/Folder is resolved from the
// central store at render time, so edits made anywhere are reflected
// everywhere instead of going stale inside a tab-local copy.
export type Tab =
  | { id: string; type: "note"; refId: string }
  | { id: string; type: "folder"; refId: string };

export function tabLabel(
  tab: Tab,
  notesById: Map<string, Note>,
  foldersById: Map<string, Folder>,
): string {
  if (tab.type === "note") {
    return notesById.get(tab.refId)?.title || "Untitled";
  }
  return foldersById.get(tab.refId)?.name || "Untitled Folder";
}
