import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Trash2, RotateCcw, X, FolderOpen } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import ConfirmDialog from "@/components/ConfirmDialog";
import type { TrashedNote } from "@/lib/trash";
import type { Folder } from "@/components/FolderScreen";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trash: TrashedNote[];
  folders: Folder[];
  retentionDays: number;
  onRestore: (trashId: string) => Promise<void>;
  onDeleteForever: (trashId: string) => Promise<void>;
  onEmptyTrash: () => Promise<void>;
};

function daysRemaining(deletedAt: Date, retentionDays: number): number | null {
  if (!Number.isFinite(retentionDays) || retentionDays <= 0) return null;
  const purgeAt = deletedAt.getTime() + retentionDays * 24 * 60 * 60 * 1000;
  return Math.max(0, Math.ceil((purgeAt - Date.now()) / (24 * 60 * 60 * 1000)));
}

export default function TrashScreen({
  open,
  onOpenChange,
  trash,
  folders,
  retentionDays,
  onRestore,
  onDeleteForever,
  onEmptyTrash,
}: Props) {
  const [emptyOpen, setEmptyOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const foldersById = new Map(folders.map((f) => [f.id, f]));

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="size-4" />
              Trash
            </DialogTitle>
            <DialogDescription>
              {retentionDays > 0
                ? `Notes here are permanently deleted after ${retentionDays} ${retentionDays === 1 ? "day" : "days"}.`
                : "Notes here stay until you delete them permanently."}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col max-h-96 overflow-y-auto border border-line rounded-card">
            {trash.length === 0 && (
              <p className="p-4 text-sm text-muted-foreground text-center">Trash is empty.</p>
            )}
            {trash.map((note) => {
              const folder = note.folderId ? foldersById.get(note.folderId) : undefined;
              const remaining = daysRemaining(note.deletedAt, retentionDays);
              return (
                <div
                  key={note.id}
                  className="flex items-center gap-2 px-3 py-2 border-b border-line last:border-b-0"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {note.title || "Untitled"}
                    </p>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <span>Deleted {formatDistanceToNow(note.deletedAt, { addSuffix: true })}</span>
                      {folder && (
                        <>
                          <span>·</span>
                          <FolderOpen className="size-3" />
                          <span className="truncate">{folder.name || "Untitled Folder"}</span>
                        </>
                      )}
                      {remaining !== null && (
                        <>
                          <span>·</span>
                          <span>
                            {remaining === 0
                              ? "purging soon"
                              : `${remaining} ${remaining === 1 ? "day" : "days"} left`}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => onRestore(note.id)}
                    aria-label="Restore note"
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <RotateCcw className="size-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setPendingDeleteId(note.id)}
                    aria-label="Delete forever"
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <X className="size-3.5" />
                  </Button>
                </div>
              );
            })}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              disabled={trash.length === 0}
              onClick={() => setEmptyOpen(true)}
              className="gap-1.5"
            >
              <Trash2 className="size-3.5" />
              Empty Trash
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={pendingDeleteId !== null}
        onOpenChange={(open) => !open && setPendingDeleteId(null)}
        title="Delete this note forever?"
        description="This cannot be undone — the note and its version history will be permanently deleted."
        confirmLabel="Delete Forever"
        onConfirm={() => {
          if (pendingDeleteId) onDeleteForever(pendingDeleteId);
          setPendingDeleteId(null);
        }}
      />

      <ConfirmDialog
        open={emptyOpen}
        onOpenChange={setEmptyOpen}
        title="Empty Trash?"
        description={`This permanently deletes all ${trash.length} ${trash.length === 1 ? "note" : "notes"} in Trash. This cannot be undone.`}
        confirmLabel="Empty Trash"
        onConfirm={() => {
          setEmptyOpen(false);
          onEmptyTrash();
        }}
      />
    </>
  );
}
