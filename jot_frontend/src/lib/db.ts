import { openDB, type IDBPDatabase } from "idb";
import type { Note } from "@/components/NoteScreen";
import type { Folder } from "@/components/FolderScreen";
import { seedFolders, seedNotes } from "@/mock/seedData";

const DB_NAME = "jot-notes";
const DB_VERSION = 1;
const SEEDED_FLAG = "jot:seeded";

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDB(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        db.createObjectStore("notes", { keyPath: "id" });
        db.createObjectStore("folders", { keyPath: "id" });
      },
    });
  }
  return dbPromise;
}

// ── Notes ─────────────────────────────────────────────────────────────────────

export async function getAllNotes(): Promise<Note[]> {
  const db = await getDB();
  return db.getAll("notes");
}

export async function putNote(note: Note): Promise<void> {
  const db = await getDB();
  await db.put("notes", note);
}

export async function deleteNoteRecord(id: string): Promise<void> {
  const db = await getDB();
  await db.delete("notes", id);
}

// ── Folders ───────────────────────────────────────────────────────────────────

export async function getAllFolders(): Promise<Folder[]> {
  const db = await getDB();
  return db.getAll("folders");
}

export async function putFolder(folder: Folder): Promise<void> {
  const db = await getDB();
  await db.put("folders", folder);
}

export async function deleteFolderRecord(id: string): Promise<void> {
  const db = await getDB();
  await db.delete("folders", id);
}

// ── Bulk operations ───────────────────────────────────────────────────────────

// Wipes all notes and folders. Deliberately leaves the SEEDED_FLAG alone so
// the demo content doesn't come back on next load — this is meant to leave
// the user with a truly empty app, not reset it to the first-run state.
export async function clearAll(): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(["notes", "folders"], "readwrite");
  await Promise.all([
    tx.objectStore("notes").clear(),
    tx.objectStore("folders").clear(),
    tx.done,
  ]);
}

// ── Seeding ───────────────────────────────────────────────────────────────────

// Runs once per browser profile — gated on localStorage rather than "store is
// empty" so a user who deletes everything doesn't get the demo content back.
export async function seedIfEmpty(): Promise<void> {
  if (localStorage.getItem(SEEDED_FLAG) === "1") return;

  const db = await getDB();
  const tx = db.transaction(["notes", "folders"], "readwrite");
  await Promise.all([
    ...seedFolders.map((folder) => tx.objectStore("folders").put(folder)),
    ...seedNotes.map((note) => tx.objectStore("notes").put(note)),
    tx.done,
  ]);

  localStorage.setItem(SEEDED_FLAG, "1");
}
