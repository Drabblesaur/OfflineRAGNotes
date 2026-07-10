import { useCallback, useEffect, useRef, useState } from "react";
import type { Note } from "@/components/NoteScreen";
import type { Folder } from "@/components/FolderScreen";
import * as vault from "@/lib/vault";
import { getVaultPath, setVaultPath as persistVaultPath } from "@/lib/vaultPath";
import { extractWikiLinkTitles, rewriteLinksTo } from "@/lib/wikilinks";
import { snapshotNote } from "@/lib/versions";
import * as trash from "@/lib/trash";
import type { TrashedNote } from "@/lib/trash";
import { getTrashRetentionDays } from "@/lib/trashSettings";

function makeEmptyNote(folderId: string | null): Note {
  return {
    id: crypto.randomUUID(),
    folderId,
    title: "",
    bodyMd: "",
    favorite: false,
    tags: [],
    date: new Date(),
    lastEditedAt: new Date(),
  };
}

export type NotesStore = {
  notes: Note[];
  folders: Folder[];
  trash: TrashedNote[];
  loading: boolean;
  vaultPath: string | null;
  selectVault: (path: string) => void;
  createNote: (folderId: string | null) => Promise<Note>;
  updateNote: (id: string, patch: Partial<Note>) => Promise<Note | undefined>;
  // Restores `id` to `snapshot`'s content — force-snapshots the note's
  // current (pre-restore) state first so restoring is itself always undoable.
  restoreVersion: (id: string, snapshot: Note) => Promise<Note | undefined>;
  // Moves a note to Trash rather than deleting it outright.
  deleteNote: (id: string) => Promise<void>;
  // Restores a trashed note — back to its original folder if that folder
  // still exists, otherwise to the vault root.
  restoreNote: (trashId: string) => Promise<Note | undefined>;
  deleteForever: (trashId: string) => Promise<void>;
  emptyTrash: () => Promise<void>;
  moveNote: (id: string, folderId: string | null) => Promise<void>;
  createFolder: (parentId: string | null) => Promise<Folder>;
  renameFolder: (id: string, name: string) => Promise<Map<string, string>>;
  moveFolder: (id: string, parentId: string | null) => Promise<Map<string, string>>;
  // Deletes a folder; every note inside (recursively) is moved to Trash
  // rather than deleted outright.
  deleteFolder: (
    id: string,
  ) => Promise<{ deletedNoteIds: string[]; deletedFolderIds: string[] }>;
  getNotesByFolder: (folderId: string | null) => Note[];
  getSubfolders: (parentId: string | null) => Folder[];
};

// Single reactive store — call once in App.tsx. Backed by a vault (a folder
// of real .md files on disk) instead of IndexedDB. `vaultPath` is seeded
// synchronously from localStorage so the very first render already knows
// whether to show the vault picker or start loading — no flash of the wrong
// screen while an effect resolves.
export function useNotesStore(): NotesStore {
  const [notes, setNotes] = useState<Note[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [trashItems, setTrashItems] = useState<TrashedNote[]>([]);
  const [vaultPath, setVaultPathState] = useState<string | null>(() => getVaultPath());
  const [loading, setLoading] = useState<boolean>(() => getVaultPath() !== null);

  // Callbacks below are async and need the *current* notes/folders before
  // their first await, not whatever was captured when the callback was
  // created — refs kept in sync via effect give them that without having to
  // depend on (and be recreated by) every notes/folders change.
  const notesRef = useRef(notes);
  const foldersRef = useRef(folders);
  useEffect(() => {
    notesRef.current = notes;
  }, [notes]);
  useEffect(() => {
    foldersRef.current = folders;
  }, [folders]);

  // Loads (and, for a freshly-picked empty folder, seeds) whichever vault
  // `vaultPath` currently points at. Re-runs whenever selectVault changes it.
  useEffect(() => {
    if (!vaultPath) return;
    let cancelled = false;
    (async () => {
      await vault.seedVaultIfEmpty(vaultPath);
      const { notes: loadedNotes, folders: loadedFolders } = await vault.scanVault(vaultPath);
      if (cancelled) return;
      setNotes(loadedNotes);
      setFolders(loadedFolders);
      setLoading(false);
      // Trash is loaded after the main scan resolves and doesn't block it —
      // it's a secondary view, not needed to render notes/folders.
      await trash.purgeExpiredTrash(vaultPath, getTrashRetentionDays()).catch((err) =>
        console.error("Failed to purge expired trash", err),
      );
      if (cancelled) return;
      const loadedTrash = await trash.listTrash(vaultPath).catch(() => []);
      if (!cancelled) setTrashItems(loadedTrash);
    })();
    return () => {
      cancelled = true;
    };
  }, [vaultPath]);

  const selectVault = useCallback((path: string) => {
    persistVaultPath(path);
    setLoading(true);
    setVaultPathState(path);
  }, []);

  const createNote = useCallback(
    async (folderId: string | null) => {
      if (!vaultPath) throw new Error("no vault selected");
      const draft = makeEmptyNote(folderId);
      const siblingTitles = notesRef.current
        .filter((n) => n.folderId === folderId)
        .map((n) => n.title);
      const written = await vault.writeNote(vaultPath, null, draft, siblingTitles);
      setNotes((prev) => [...prev, written]);
      return written;
    },
    [vaultPath],
  );

  // When a note's title changes, rewrite [[Old Title]] occurrences in every
  // other note's body to [[New Title]] so links don't silently break —
  // mirrors Obsidian's rename behavior. Runs after the rename itself is
  // persisted; failures here don't roll back the rename.
  const propagateTitleRename = useCallback(
    async (oldTitle: string, newTitle: string, renamedId: string) => {
      if (!vaultPath || !oldTitle.trim() || oldTitle === newTitle) return;
      const oldLower = oldTitle.trim().toLowerCase();
      const linkers = notesRef.current.filter(
        (n) =>
          n.id !== renamedId &&
          extractWikiLinkTitles(n.bodyMd).some((t) => t.toLowerCase() === oldLower),
      );
      for (const linker of linkers) {
        const rewritten: Note = {
          ...linker,
          bodyMd: rewriteLinksTo(oldTitle, newTitle, linker.bodyMd),
        };
        const siblingTitles = notesRef.current
          .filter((n) => n.folderId === rewritten.folderId && n.id !== linker.id)
          .map((n) => n.title);
        const saved = await vault.writeNote(vaultPath, linker, rewritten, siblingTitles);
        notesRef.current = notesRef.current.map((n) => (n.id === linker.id ? saved : n));
      }
    },
    [vaultPath],
  );

  const updateNote = useCallback(
    async (id: string, patch: Partial<Note>) => {
      if (!vaultPath) return undefined;
      const existing = notesRef.current.find((n) => n.id === id);
      if (!existing) return undefined;
      const next: Note = { ...existing, ...patch, lastEditedAt: new Date() };
      // Publish the in-flight change to the ref immediately so a second
      // updateNote call arriving before this one's write resolves builds its
      // sibling-title list and diff against this pending state, not stale data.
      notesRef.current = notesRef.current.map((n) => (n.id === id ? next : n));
      const siblingTitles = notesRef.current
        .filter((n) => n.folderId === next.folderId && n.id !== id)
        .map((n) => n.title);
      const written = await vault.writeNote(vaultPath, existing, next, siblingTitles);
      notesRef.current = notesRef.current.map((n) => (n.id === id ? written : n));

      if (patch.title !== undefined && written.title !== existing.title) {
        await propagateTitleRename(existing.title, written.title, id);
      }

      // Fire-and-forget: version history is a safety net, not part of the
      // save path — a snapshot failure must never fail or block the actual
      // save the user is waiting on.
      void snapshotNote(vaultPath, written).catch((err) =>
        console.error("Failed to snapshot note version", err),
      );

      setNotes(notesRef.current);
      return written;
    },
    [vaultPath, propagateTitleRename],
  );

  const restoreVersion = useCallback(
    async (id: string, snapshot: Note) => {
      if (!vaultPath) return undefined;
      const current = notesRef.current.find((n) => n.id === id);
      if (current) {
        await snapshotNote(vaultPath, current, { force: true }).catch((err) =>
          console.error("Failed to snapshot pre-restore state", err),
        );
      }
      return updateNote(id, {
        title: snapshot.title,
        tags: snapshot.tags,
        favorite: snapshot.favorite,
        date: snapshot.date,
        bodyMd: snapshot.bodyMd,
      });
    },
    [vaultPath, updateNote],
  );

  const deleteNote = useCallback(
    async (id: string) => {
      if (!vaultPath) return;
      const note = notesRef.current.find((n) => n.id === id);
      if (!note) return;
      await trash.moveNoteToTrash(vaultPath, note);
      setNotes((prev) => prev.filter((n) => n.id !== id));
      setTrashItems((prev) => [{ ...note, deletedAt: new Date() }, ...prev]);
    },
    [vaultPath],
  );

  const restoreNote = useCallback(
    async (trashId: string) => {
      if (!vaultPath) return undefined;
      const trashed = trashItems.find((t) => t.id === trashId);
      if (!trashed) return undefined;
      // Restore into the original folder only if it still exists — a
      // deleted-then-emptied folder shouldn't silently resurrect.
      const targetFolderId = foldersRef.current.some((f) => f.id === trashed.folderId)
        ? trashed.folderId
        : null;
      const siblingTitles = notesRef.current
        .filter((n) => n.folderId === targetFolderId)
        .map((n) => n.title);
      const restored = await trash.restoreFromTrash(vaultPath, trashed, targetFolderId, siblingTitles);
      setNotes((prev) => [...prev, restored]);
      setTrashItems((prev) => prev.filter((t) => t.id !== trashId));
      return restored;
    },
    [vaultPath, trashItems],
  );

  const deleteForever = useCallback(
    async (trashId: string) => {
      if (!vaultPath) return;
      await trash.deleteForever(vaultPath, trashId);
      setTrashItems((prev) => prev.filter((t) => t.id !== trashId));
    },
    [vaultPath],
  );

  const emptyTrash = useCallback(async () => {
    if (!vaultPath) return;
    for (const t of trashItems) {
      await trash.deleteForever(vaultPath, t.id);
    }
    setTrashItems([]);
  }, [vaultPath, trashItems]);

  const moveNote = useCallback(
    async (id: string, folderId: string | null) => {
      await updateNote(id, { folderId });
    },
    [updateNote],
  );

  const createFolder = useCallback(
    async (parentId: string | null) => {
      if (!vaultPath) throw new Error("no vault selected");
      const siblingNames = foldersRef.current
        .filter((f) => f.parentId === parentId)
        .map((f) => f.name);
      const folder = await vault.createFolder(vaultPath, parentId, "Untitled Folder", siblingNames);
      setFolders((prev) => [...prev, folder]);
      return folder;
    },
    [vaultPath],
  );

  // Rewrites every folder/note whose id/folderId falls under a relocated
  // path — used by both renameFolder and moveFolder, since on disk they're
  // the same "give this directory a new path" operation.
  const applyFolderPathMap = useCallback((pathMap: Map<string, string>) => {
    if (pathMap.size === 0) return;
    setFolders((prev) =>
      prev.map((f) => {
        const newId = pathMap.get(f.id);
        const newParentId = f.parentId !== null ? (pathMap.get(f.parentId) ?? f.parentId) : null;
        if (!newId && newParentId === f.parentId) return f;
        return { ...f, id: newId ?? f.id, parentId: newParentId };
      }),
    );
    setNotes((prev) =>
      prev.map((n) => {
        if (n.folderId === null) return n;
        const newFolderId = pathMap.get(n.folderId);
        return newFolderId ? { ...n, folderId: newFolderId } : n;
      }),
    );
  }, []);

  const renameFolder = useCallback(
    async (id: string, name: string) => {
      if (!vaultPath) return new Map<string, string>();
      const folder = foldersRef.current.find((f) => f.id === id);
      if (!folder) return new Map<string, string>();
      const pathMap = await vault.renameFolder(vaultPath, folder, name, foldersRef.current);
      applyFolderPathMap(pathMap);
      return pathMap;
    },
    [vaultPath, applyFolderPathMap],
  );

  const moveFolder = useCallback(
    async (id: string, parentId: string | null) => {
      if (!vaultPath) return new Map<string, string>();
      const folder = foldersRef.current.find((f) => f.id === id);
      if (!folder) return new Map<string, string>();
      const pathMap = await vault.moveFolder(vaultPath, folder, parentId, foldersRef.current);
      applyFolderPathMap(pathMap);
      return pathMap;
    },
    [vaultPath, applyFolderPathMap],
  );

  // Cascades: deleting a folder moves every note inside it (recursively) to
  // Trash and recurses into every subfolder. Returns the full set of
  // affected ids so callers (App.tsx) can close any tabs pointing at them.
  const deleteFolder = useCallback(
    async (id: string) => {
      if (!vaultPath) return { deletedNoteIds: [], deletedFolderIds: [] };
      const folder = foldersRef.current.find((f) => f.id === id);
      if (!folder) return { deletedNoteIds: [], deletedFolderIds: [] };

      const deletedFolderIds: string[] = [];
      const notesToTrash: Note[] = [];

      const collect = (folderId: string) => {
        deletedFolderIds.push(folderId);
        for (const note of notesRef.current) {
          if (note.folderId === folderId) notesToTrash.push(note);
        }
        for (const f of foldersRef.current) {
          if (f.parentId === folderId) collect(f.id);
        }
      };
      collect(id);

      // Move notes to Trash first (each write+delete), then remove the
      // (now note-empty) directory tree.
      const deletedAt = new Date();
      for (const note of notesToTrash) {
        await trash.moveNoteToTrash(vaultPath, note);
      }
      await vault.deleteFolder(vaultPath, folder);

      const deletedNoteIds = notesToTrash.map((n) => n.id);
      setNotes((prev) => prev.filter((n) => !deletedNoteIds.includes(n.id)));
      setFolders((prev) => prev.filter((f) => !deletedFolderIds.includes(f.id)));
      setTrashItems((prev) => [
        ...notesToTrash.map((n) => ({ ...n, deletedAt })),
        ...prev,
      ]);

      return { deletedNoteIds, deletedFolderIds };
    },
    [vaultPath],
  );

  const getNotesByFolder = useCallback(
    (folderId: string | null) => notes.filter((n) => n.folderId === folderId),
    [notes],
  );

  const getSubfolders = useCallback(
    (parentId: string | null) => folders.filter((f) => f.parentId === parentId),
    [folders],
  );

  return {
    notes,
    folders,
    trash: trashItems,
    loading,
    vaultPath,
    selectVault,
    createNote,
    updateNote,
    restoreVersion,
    deleteNote,
    restoreNote,
    deleteForever,
    emptyTrash,
    moveNote,
    createFolder,
    renameFolder,
    moveFolder,
    deleteFolder,
    getNotesByFolder,
    getSubfolders,
  };
}
