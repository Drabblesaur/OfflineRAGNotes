import { invoke } from "@tauri-apps/api/core";
import type { Note } from "@/components/NoteScreen";
import type { Folder } from "@/components/FolderScreen";
import { parseNoteMeta, stringifyFrontmatter } from "@/lib/frontmatter";
import { slugifyFilename, dedupeFilename } from "@/lib/slug";
import { seedFiles } from "@/mock/seedData";

type RawVaultFile = { relPath: string; content: string };
type RawVaultScan = { files: RawVaultFile[]; dirs: string[] };

function joinPath(parentId: string | null, name: string): string {
  return parentId ? `${parentId}/${name}` : name;
}

function notePath(note: Pick<Note, "folderId" | "title">): string {
  return joinPath(note.folderId, `${note.title || "Untitled"}.md`);
}

// ── Scan ──────────────────────────────────────────────────────────────────────

export async function scanVault(
  vaultPath: string,
): Promise<{ notes: Note[]; folders: Folder[] }> {
  const raw = await invoke<RawVaultScan>("read_vault", { vaultPath });

  const folders: Folder[] = raw.dirs.map((dirPath) => {
    const parts = dirPath.split("/");
    const name = parts[parts.length - 1];
    const parentId = parts.length > 1 ? parts.slice(0, -1).join("/") : null;
    return { id: dirPath, parentId, name };
  });

  const notes: Note[] = raw.files.map((file) => {
    const { meta, body } = parseNoteMeta(file.content);
    const parts = file.relPath.split("/");
    const title = parts[parts.length - 1].replace(/\.md$/, "");
    const folderId = parts.length > 1 ? parts.slice(0, -1).join("/") : null;
    return {
      id: meta.id,
      folderId,
      title,
      bodyMd: body,
      favorite: meta.favorite,
      tags: meta.tags,
      date: meta.date,
      lastEditedAt: meta.lastEditedAt,
    };
  });

  return { notes, folders };
}

// Only seeds a freshly-picked, genuinely empty vault — never overwrites or
// merges with a user's existing notes.
export async function seedVaultIfEmpty(vaultPath: string): Promise<boolean> {
  const { notes, folders } = await scanVault(vaultPath);
  if (notes.length > 0 || folders.length > 0) return false;
  for (const file of seedFiles) {
    await invoke("write_note", { vaultPath, relPath: file.relPath, content: file.content });
  }
  return true;
}

// ── Notes ─────────────────────────────────────────────────────────────────────

// `siblingTitles` = titles of other notes already in `nextNote.folderId`
// (the caller excludes `nextNote` itself) — used to auto-suffix on a
// filename collision, e.g. two notes both titled "Untitled" -> "Untitled 2".
// `prevNote` is null for a brand-new note (nothing to rename away from).
export async function writeNote(
  vaultPath: string,
  prevNote: Note | null,
  nextNote: Note,
  siblingTitles: string[],
): Promise<Note> {
  const desiredTitle = slugifyFilename(nextNote.title || "Untitled");
  const finalTitle = dedupeFilename(desiredTitle, new Set(siblingTitles));
  const finalNote: Note = { ...nextNote, title: finalTitle };
  const newPath = notePath(finalNote);

  if (prevNote) {
    const oldPath = notePath(prevNote);
    if (oldPath !== newPath) {
      await invoke("rename_path", { vaultPath, oldRelPath: oldPath, newRelPath: newPath });
    }
  }

  const content = stringifyFrontmatter(
    {
      id: finalNote.id,
      tags: finalNote.tags,
      favorite: finalNote.favorite,
      date: finalNote.date,
      lastEditedAt: finalNote.lastEditedAt,
    },
    finalNote.bodyMd,
  );
  await invoke("write_note", { vaultPath, relPath: newPath, content });
  return finalNote;
}

export async function deleteNote(vaultPath: string, note: Note): Promise<void> {
  await invoke("delete_path", { vaultPath, relPath: notePath(note), isDir: false });
}

// ── Folders ───────────────────────────────────────────────────────────────────

function collectDescendantFolders(folder: Folder, allFolders: Folder[]): Folder[] {
  const direct = allFolders.filter((f) => f.parentId === folder.id);
  return direct.flatMap((f) => [f, ...collectDescendantFolders(f, allFolders)]);
}

export async function createFolder(
  vaultPath: string,
  parentId: string | null,
  name: string,
  siblingNames: string[],
): Promise<Folder> {
  const finalName = dedupeFilename(name, new Set(siblingNames));
  const id = joinPath(parentId, finalName);
  await invoke("create_dir", { vaultPath, relPath: id });
  return { id, parentId, name: finalName };
}

// Shared by renameFolder/moveFolder below — both are "give this folder a new
// parent+name", just holding one side fixed. A directory rename/move on disk
// cascades every descendant's path for free; the returned Map (old id -> new
// id, covering the folder itself and every descendant folder) is what the
// caller uses to repair in-memory folder/note ids and any open tab refIds.
async function relocateFolder(
  vaultPath: string,
  folder: Folder,
  newParentId: string | null,
  desiredName: string,
  allFolders: Folder[],
): Promise<Map<string, string>> {
  const siblingNames = allFolders
    .filter((f) => f.parentId === newParentId && f.id !== folder.id)
    .map((f) => f.name);
  const finalName = dedupeFilename(desiredName, new Set(siblingNames));
  const newId = joinPath(newParentId, finalName);
  if (newId === folder.id) return new Map();

  await invoke("rename_path", { vaultPath, oldRelPath: folder.id, newRelPath: newId });

  const pathMap = new Map<string, string>();
  pathMap.set(folder.id, newId);
  for (const descendant of collectDescendantFolders(folder, allFolders)) {
    pathMap.set(descendant.id, newId + descendant.id.slice(folder.id.length));
  }
  return pathMap;
}

export async function renameFolder(
  vaultPath: string,
  folder: Folder,
  newName: string,
  allFolders: Folder[],
): Promise<Map<string, string>> {
  return relocateFolder(vaultPath, folder, folder.parentId, newName, allFolders);
}

export async function moveFolder(
  vaultPath: string,
  folder: Folder,
  newParentId: string | null,
  allFolders: Folder[],
): Promise<Map<string, string>> {
  return relocateFolder(vaultPath, folder, newParentId, folder.name, allFolders);
}

export async function deleteFolder(vaultPath: string, folder: Folder): Promise<void> {
  await invoke("delete_path", { vaultPath, relPath: folder.id, isDir: true });
}
