import { invoke } from "@tauri-apps/api/core";
import { dump, load } from "js-yaml";
import type { Note } from "@/components/NoteScreen";

// Snapshots live at .jot/versions/<note-id>/<timestamp>.md inside the vault.
// `.jot` is invisible to the vault scanner (walk() in vault.rs skips any
// dotfile/dotdir), so these never show up as notes/folders in the app.
const COALESCE_WINDOW_MS = 10 * 60 * 1000; // bucket saves into ~10 min windows
const MAX_SNAPSHOTS = 50;
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export type VersionSnapshot = {
  fileName: string;
  timestamp: Date;
};

function versionsDir(noteId: string): string {
  return `.jot/versions/${noteId}`;
}

// ISO timestamps contain `:` and `.`, which are unsafe/reserved in Windows
// filenames — swap them for `-` and reverse it on the way back.
function encodeTimestamp(date: Date): string {
  return date.toISOString().replace(/[:.]/g, "-");
}

function decodeTimestamp(encoded: string): Date | null {
  const match = /^(\d{4}-\d{2}-\d{2})T(\d{2})-(\d{2})-(\d{2})-(\d{3})Z$/.exec(encoded);
  if (!match) return null;
  const [, datePart, hh, mm, ss, ms] = match;
  const parsed = new Date(`${datePart}T${hh}:${mm}:${ss}.${ms}Z`);
  return isNaN(parsed.getTime()) ? null : parsed;
}

// Snapshot files need `title` alongside the usual note metadata (a real
// note's title is derived from its filename, but a snapshot has no filename
// convention to derive it from) — a small dedicated format rather than
// stretching frontmatter.ts's NoteMeta to cover a field only snapshots need.
function serializeSnapshot(note: Note): string {
  const meta = {
    title: note.title,
    tags: note.tags,
    favorite: note.favorite,
    date: note.date.toISOString(),
    lastEditedAt: note.lastEditedAt.toISOString(),
  };
  return `---\n${dump(meta).trimEnd()}\n---\n${note.bodyMd}`;
}

function parseSnapshot(raw: string, id: string, folderId: string | null): Note {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(raw);
  const fallback: Note = {
    id,
    folderId,
    title: "Untitled",
    bodyMd: raw,
    favorite: false,
    tags: [],
    date: new Date(),
    lastEditedAt: new Date(),
  };
  if (!match) return fallback;
  let meta: Record<string, unknown>;
  try {
    meta = (load(match[1]) as Record<string, unknown>) ?? {};
  } catch {
    return fallback;
  }
  return {
    id,
    folderId,
    title: typeof meta.title === "string" ? meta.title : "Untitled",
    bodyMd: match[2],
    favorite: typeof meta.favorite === "boolean" ? meta.favorite : false,
    tags: Array.isArray(meta.tags) ? meta.tags.filter((t): t is string => typeof t === "string") : [],
    date: typeof meta.date === "string" ? new Date(meta.date) : new Date(),
    lastEditedAt: typeof meta.lastEditedAt === "string" ? new Date(meta.lastEditedAt) : new Date(),
  };
}

export async function listSnapshots(vaultPath: string, noteId: string): Promise<VersionSnapshot[]> {
  const names = await invoke<string[]>("list_dir", { vaultPath, relPath: versionsDir(noteId) });
  return names
    .map((fileName): VersionSnapshot | null => {
      const timestamp = decodeTimestamp(fileName.replace(/\.md$/, ""));
      return timestamp ? { fileName, timestamp } : null;
    })
    .filter((s): s is VersionSnapshot => s !== null)
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
}

export async function readSnapshot(
  vaultPath: string,
  noteId: string,
  folderId: string | null,
  fileName: string,
): Promise<Note> {
  const raw = await invoke<string>("read_file", {
    vaultPath,
    relPath: `${versionsDir(noteId)}/${fileName}`,
  });
  return parseSnapshot(raw, noteId, folderId);
}

async function pruneSnapshots(
  vaultPath: string,
  noteId: string,
  snapshots: VersionSnapshot[],
): Promise<void> {
  const cutoff = Date.now() - MAX_AGE_MS;
  const beyondCap = snapshots.slice(MAX_SNAPSHOTS);
  const withinCapButStale = snapshots.slice(0, MAX_SNAPSHOTS).filter((s) => s.timestamp.getTime() < cutoff);
  for (const s of [...beyondCap, ...withinCapButStale]) {
    await invoke("delete_path", {
      vaultPath,
      relPath: `${versionsDir(noteId)}/${s.fileName}`,
      isDir: false,
    }).catch(() => {});
  }
}

// Snapshots `note`'s current state. Consecutive saves within
// COALESCE_WINDOW_MS of the most recent snapshot overwrite that same
// snapshot instead of creating a new one, so a burst of typing produces one
// entry per ~10 minutes rather than one per keystroke-triggered save.
// `force` bypasses coalescing — used before a restore, so the pre-restore
// state always gets its own recoverable point regardless of timing.
export async function snapshotNote(
  vaultPath: string,
  note: Note,
  opts: { force?: boolean } = {},
): Promise<void> {
  const existing = await listSnapshots(vaultPath, note.id);
  const now = new Date();
  const mostRecent = existing[0];
  const shouldCoalesce =
    !opts.force && !!mostRecent && now.getTime() - mostRecent.timestamp.getTime() < COALESCE_WINDOW_MS;

  const fileName = shouldCoalesce ? mostRecent.fileName : `${encodeTimestamp(now)}.md`;
  await invoke("write_note", {
    vaultPath,
    relPath: `${versionsDir(note.id)}/${fileName}`,
    content: serializeSnapshot(note),
  });

  const updatedList = shouldCoalesce ? existing : [{ fileName, timestamp: now }, ...existing];
  await pruneSnapshots(vaultPath, note.id, updatedList);
}
