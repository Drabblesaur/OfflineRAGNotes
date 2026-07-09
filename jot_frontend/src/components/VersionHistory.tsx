import { useEffect, useState } from "react";
import { formatDistanceToNow, format } from "date-fns";
import { History } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Note } from "@/components/NoteScreen";
import { listSnapshots, readSnapshot, type VersionSnapshot } from "@/lib/versions";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vaultPath: string | null;
  note: Note;
  onRestore: (snapshot: Note) => Promise<void>;
};

export default function VersionHistory({ open, onOpenChange, vaultPath, note, onRestore }: Props) {
  const [snapshots, setSnapshots] = useState<VersionSnapshot[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<VersionSnapshot | null>(null);
  const [preview, setPreview] = useState<Note | null>(null);
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    if (!open || !vaultPath) return;
    setLoading(true);
    setSelected(null);
    setPreview(null);
    let cancelled = false;
    listSnapshots(vaultPath, note.id).then((result) => {
      if (!cancelled) {
        setSnapshots(result);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [open, vaultPath, note.id]);

  useEffect(() => {
    if (!vaultPath || !selected) {
      setPreview(null);
      return;
    }
    let cancelled = false;
    readSnapshot(vaultPath, note.id, note.folderId, selected.fileName).then((snapshot) => {
      if (!cancelled) setPreview(snapshot);
    });
    return () => {
      cancelled = true;
    };
  }, [vaultPath, note.id, note.folderId, selected]);

  async function handleRestore() {
    if (!preview) return;
    setRestoring(true);
    try {
      await onRestore(preview);
      onOpenChange(false);
    } finally {
      setRestoring(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="size-4" />
            Version history
          </DialogTitle>
          <DialogDescription>
            Saved automatically as you edit. Restoring saves your current version too, so you can
            always undo.
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-4 h-80">
          <div className="w-48 shrink-0 overflow-y-auto border border-line rounded-card">
            {loading && <p className="p-3 text-xs text-muted-foreground">Loading…</p>}
            {!loading && snapshots.length === 0 && (
              <p className="p-3 text-xs text-muted-foreground">No earlier versions yet.</p>
            )}
            {snapshots.map((s) => (
              <button
                key={s.fileName}
                type="button"
                onClick={() => setSelected(s)}
                className={cn(
                  "w-full text-left px-3 py-2 text-xs border-b border-line last:border-b-0 hover:bg-paper-panel transition-colors",
                  selected?.fileName === s.fileName && "bg-paper-panel font-medium",
                )}
              >
                <div>{formatDistanceToNow(s.timestamp, { addSuffix: true })}</div>
                <div className="text-muted-foreground/70 font-mono">
                  {format(s.timestamp, "MMM d, h:mm a")}
                </div>
              </button>
            ))}
          </div>

          <div className="flex-1 min-w-0 overflow-y-auto border border-line rounded-card p-3">
            {!selected && (
              <p className="text-sm text-muted-foreground">Select a version to preview.</p>
            )}
            {selected && !preview && (
              <p className="text-sm text-muted-foreground">Loading preview…</p>
            )}
            {preview && (
              <div>
                <p className="font-sans text-sm font-medium mb-2">{preview.title || "Untitled"}</p>
                <p className="text-xs font-mono whitespace-pre-wrap text-ink-700">{preview.bodyMd}</p>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button onClick={handleRestore} disabled={!preview || restoring}>
            {restoring ? "Restoring…" : "Restore this version"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
