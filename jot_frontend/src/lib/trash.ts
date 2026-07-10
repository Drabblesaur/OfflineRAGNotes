import { invoke } from "@tauri-apps/api/core";
import { dump, load } from "js-yaml";
import type { Note } from "@/components/NoteScreen";
import * as vault from "@/lib/vault";

// Trashed notes live at .jot/trash/<note-id>.md — same invisible-to-scanner
// trick as .jot/versions/ (walk() in vault.rs skips any dotdir). A vault
// note's title/folderId derive from its file path, but a trashed note is a
// flat file with no path context, so its frontmatter carries everything
// needed to restore it.
export type TrashedNote = Note & { deletedAt: Date };

function trashPath(noteId: string): string {
  return `.jot/trash/${noteId}.md`;
}

function versionsDir(noteId: string): string {
  return `.jot/versions/${noteId}`;
}

// Small dedicated serializer, same reasoning as versions.ts's
// serializeSnapshot/parseSnapshot: title/folderId/deletedAt aren't part of
// frontmatter.ts's NoteMeta (a real note's title/folderId derive from its
// path, not its content), and only trash needs them.
function serializeTrash(note: Note, deletedAt: Date): string {
  const meta = {
    id: note.id,
    title: note.title,
    folderId: note.folderId,
    tags: note.tags,
    favorite: note.favorite,
    date: note.date.toISOString(),
    lastEditedAt: note.lastEditedAt.toISOString(),
    deletedAt: deletedAt.toISOString(),
  };
  return `---\n${dump(meta).trimEnd()}\n---\n${note.bodyMd}`;
}

function parseTrash(raw: string, fallbackId: string): TrashedNote | null {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(raw);
  if (!match) return null;
  let meta: Record<string, unknown>;
  try {
    meta = (load(match[1]) as Record<string, unknown>) ?? {};
  } catch {
    return null;
  }
  const deletedAt = typeof meta.deletedAt === "string" ? new Date(meta.deletedAt) : null;
  if (!deletedAt || isNaN(deletedAt.getTime())) return null;
  return {
    id: typeof meta.id === "string" && meta.id ? meta.id : fallbackId,
    folderId: typeof meta.folderId === "string" ? meta.folderId : null,
    title: typeof meta.title === "string" ? meta.title : "Untitled",
    bodyMd: match[2],
    favorite: typeof meta.favorite === "boolean" ? meta.favorite : false,
    tags: Array.isArray(meta.tags) ? meta.tags.filter((t): t is string => typeof t === "string") : [],
    date: typeof meta.date === "string" ? new Date(meta.date) : new Date(),
    lastEditedAt: typeof meta.lastEditedAt === "string" ? new Date(meta.lastEditedAt) : new Date(),
    deletedAt,
  };
}

export async function moveNoteToTrash(vaultPath: string, note: Note): Promise<void> {
  await invoke("write_note", {
    vaultPath,
    relPath: trashPath(note.id),
    content: serializeTrash(note, new Date()),
  });
  await vault.deleteNote(vaultPath, note);
}

export async function listTrash(vaultPath: string): Promise<TrashedNote[]> {
  const names = await invoke<string[]>("list_dir", { vaultPath, relPath: ".jot/trash" });
  const entries: TrashedNote[] = [];
  for (const fileName of names) {
    if (!fileName.endsWith(".md")) continue;
    const id = fileName.replace(/\.md$/, "");
    const raw = await invoke<string>("read_file", { vaultPath, relPath: `.jot/trash/${fileName}` });
    const parsed = parseTrash(raw, id);
    if (parsed) entries.push(parsed);
  }
  return entries.sort((a, b) => b.deletedAt.getTime() - a.deletedAt.getTime());
}

// Writes the note back into the vault (reusing vault.writeNote's existing
// slugify/dedupe/frontmatter logic — restoring is just "write a new note"),
// then removes the trash file. `targetFolderId` lets the caller redirect to
// vault root if the note's original folder no longer exists.
export async function restoreFromTrash(
  vaultPath: string,
  trashed: TrashedNote,
  targetFolderId: string | null,
  siblingTitles: string[],
): Promise<Note> {
  const noteToWrite: Note = { ...trashed, folderId: targetFolderId };
  const written = await vault.writeNote(vaultPath, null, noteToWrite, siblingTitles);
  await invoke("delete_path", { vaultPath, relPath: trashPath(trashed.id), isDir: false });
  return written;
}

// Permanently removes a trashed note and its version history, so nothing
// orphaned is left behind once it's truly gone.
export async function deleteForever(vaultPath: string, noteId: string): Promise<void> {
  await invoke("delete_path", { vaultPath, relPath: trashPath(noteId), isDir: false }).catch(() => {});
  await invoke("delete_path", { vaultPath, relPath: versionsDir(noteId), isDir: true }).catch(() => {});
}

// retentionDays <= 0 (or not finite) means "never auto-purge".
export async function purgeExpiredTrash(vaultPath: string, retentionDays: number): Promise<void> {
  if (!Number.isFinite(retentionDays) || retentionDays <= 0) return;
  const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
  const trash = await listTrash(vaultPath);
  for (const entry of trash) {
    if (entry.deletedAt.getTime() < cutoff) {
      await deleteForever(vaultPath, entry.id);
    }
  }
}
