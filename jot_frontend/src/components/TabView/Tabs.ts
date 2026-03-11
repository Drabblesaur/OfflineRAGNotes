import type { Note } from "@/components/NoteScreen";
import type { Folder } from "@/components/FolderScreen";

export type NoteTab = {
  id: string;
  type: "note";
  note: Note;
};

export type FolderTab = {
  id: string;
  type: "folder";
  folder: Folder;
};

export type Tab = NoteTab | FolderTab;

export function tabLabel(tab: Tab): string {
  if (tab.type === "note") return tab.note.title || "Untitled";
  return tab.folder.name || "Untitled Folder";
}