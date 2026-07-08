import { useCallback, useEffect, useState } from "react";
import type { Note } from "@/components/NoteScreen";
import type { Folder } from "@/components/FolderScreen";
import {
  getAllNotes,
  getAllFolders,
  putNote,
  putFolder,
  deleteNoteRecord,
  deleteFolderRecord,
  seedIfEmpty,
} from "@/lib/db";

function makeEmptyNote(folderId: string | null): Note {
  return {
    id: crypto.randomUUID(),
    folderId,
    title: "",
    contentJSON: { type: "doc", content: [{ type: "paragraph" }] },
    contentMd: "",
    favorite: false,
    tags: [],
    date: new Date(),
    lastEditedAt: new Date(),
  };
}

function makeEmptyFolder(parentId: string | null): Folder {
  return {
    id: crypto.randomUUID(),
    parentId,
    name: "Untitled Folder",
  };
}

export type NotesStore = {
  notes: Note[];
  folders: Folder[];
  loading: boolean;
  createNote: (folderId: string | null) => Promise<Note>;
  updateNote: (id: string, patch: Partial<Note>) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;
  moveNote: (id: string, folderId: string | null) => Promise<void>;
  createFolder: (parentId: string | null) => Promise<Folder>;
  renameFolder: (id: string, name: string) => Promise<void>;
  moveFolder: (id: string, parentId: string | null) => Promise<void>;
  deleteFolder: (
    id: string,
  ) => Promise<{ deletedNoteIds: string[]; deletedFolderIds: string[] }>;
  getNotesByFolder: (folderId: string | null) => Note[];
  getSubfolders: (parentId: string | null) => Folder[];
};

// Single reactive store — call once in App.tsx. Loads everything from
// IndexedDB on mount and keeps an in-memory mirror in sync with every write.
export function useNotesStore(): NotesStore {
  const [notes, setNotes] = useState<Note[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await seedIfEmpty();
      const [loadedNotes, loadedFolders] = await Promise.all([
        getAllNotes(),
        getAllFolders(),
      ]);
      if (cancelled) return;
      setNotes(loadedNotes);
      setFolders(loadedFolders);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const createNote = useCallback(async (folderId: string | null) => {
    const note = makeEmptyNote(folderId);
    await putNote(note);
    setNotes((prev) => [...prev, note]);
    return note;
  }, []);

  const updateNote = useCallback(async (id: string, patch: Partial<Note>) => {
    setNotes((prev) => {
      const existing = prev.find((n) => n.id === id);
      if (!existing) return prev;
      const updated = { ...existing, ...patch };
      void putNote(updated);
      return prev.map((n) => (n.id === id ? updated : n));
    });
  }, []);

  const deleteNote = useCallback(async (id: string) => {
    await deleteNoteRecord(id);
    setNotes((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const moveNote = useCallback(
    async (id: string, folderId: string | null) => {
      await updateNote(id, { folderId });
    },
    [updateNote],
  );

  const createFolder = useCallback(async (parentId: string | null) => {
    const folder = makeEmptyFolder(parentId);
    await putFolder(folder);
    setFolders((prev) => [...prev, folder]);
    return folder;
  }, []);

  const renameFolder = useCallback(async (id: string, name: string) => {
    setFolders((prev) => {
      const existing = prev.find((f) => f.id === id);
      if (!existing) return prev;
      const updated = { ...existing, name };
      void putFolder(updated);
      return prev.map((f) => (f.id === id ? updated : f));
    });
  }, []);

  const moveFolder = useCallback(async (id: string, parentId: string | null) => {
    setFolders((prev) => {
      const existing = prev.find((f) => f.id === id);
      if (!existing) return prev;
      const updated = { ...existing, parentId };
      void putFolder(updated);
      return prev.map((f) => (f.id === id ? updated : f));
    });
  }, []);

  // Cascades: deleting a folder deletes every note directly inside it and
  // recurses into every subfolder. Returns the full set of deleted ids so
  // callers (App.tsx) can close any tabs pointing at them.
  const deleteFolder = useCallback(
    async (id: string) => {
      const deletedNoteIds: string[] = [];
      const deletedFolderIds: string[] = [];

      const collect = (folderId: string) => {
        deletedFolderIds.push(folderId);
        for (const note of notes) {
          if (note.folderId === folderId) deletedNoteIds.push(note.id);
        }
        for (const folder of folders) {
          if (folder.parentId === folderId) collect(folder.id);
        }
      };
      collect(id);

      await Promise.all([
        ...deletedNoteIds.map((noteId) => deleteNoteRecord(noteId)),
        ...deletedFolderIds.map((folderId) => deleteFolderRecord(folderId)),
      ]);

      setNotes((prev) => prev.filter((n) => !deletedNoteIds.includes(n.id)));
      setFolders((prev) =>
        prev.filter((f) => !deletedFolderIds.includes(f.id)),
      );

      return { deletedNoteIds, deletedFolderIds };
    },
    [notes, folders],
  );

  const getNotesByFolder = useCallback(
    (folderId: string | null) => notes.filter((n) => n.folderId === folderId),
    [notes],
  );

  const getSubfolders = useCallback(
    (parentId: string | null) =>
      folders.filter((f) => f.parentId === parentId),
    [folders],
  );

  return {
    notes,
    folders,
    loading,
    createNote,
    updateNote,
    deleteNote,
    moveNote,
    createFolder,
    renameFolder,
    moveFolder,
    deleteFolder,
    getNotesByFolder,
    getSubfolders,
  };
}
