import Fuse from "fuse.js";
import type { Note } from "@/components/NoteScreen";

// Shared fuzzy search over notes — used by both the in-folder search
// (FolderScreen) and the command palette (OpenCommand), so both surfaces
// match on title, tags, *and* body content instead of just title/tags.
const FUSE_OPTIONS: ConstructorParameters<typeof Fuse<Note>>[1] = {
  keys: [
    { name: "title", weight: 3 },
    { name: "tags", weight: 2 },
    { name: "bodyMd", weight: 1 },
  ],
  threshold: 0.35,
  ignoreLocation: true,
};

export function searchNotes(notes: Note[], query: string): Note[] {
  const trimmed = query.trim();
  if (!trimmed) return notes;
  return new Fuse(notes, FUSE_OPTIONS).search(trimmed).map((result) => result.item);
}
