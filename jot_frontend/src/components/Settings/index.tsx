import { useState } from "react";
import { Sun, Moon, Monitor, Download, FolderOpen, RefreshCw } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import ConfirmDialog from "@/components/ConfirmDialog";
import { clearVaultPath } from "@/lib/vaultPath";
import { getTrashRetentionDays, setTrashRetentionDays } from "@/lib/trashSettings";
import { useIndexStatus } from "@/hooks/useIndexStatus";
import { describeIndexStatus } from "@/lib/indexStatus";
import type { Theme } from "@/hooks/useTheme";
import type { Note } from "@/components/NoteScreen";
import type { Folder } from "@/components/FolderScreen";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  notes: Note[];
  folders: Folder[];
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
};

export default function Settings({
  open,
  onOpenChange,
  notes,
  folders,
  theme,
  onThemeChange,
}: Props) {
  const [clearOpen, setClearOpen] = useState(false);
  const [retentionDays, setRetentionDays] = useState(() => getTrashRetentionDays());
  const indexStatus = useIndexStatus();
  const { icon, label, tooltip } = describeIndexStatus(indexStatus);

  function handleRetentionChange(value: string) {
    const parsed = Number(value);
    const next = Number.isFinite(parsed) ? Math.max(0, Math.round(parsed)) : 0;
    setRetentionDays(next);
    setTrashRetentionDays(next);
  }

  function exportNotes() {
    const blob = new Blob(
      [JSON.stringify({ notes, folders }, null, 2)],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `jot-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleSwitchVault() {
    setClearOpen(false);
    clearVaultPath();
    window.location.reload();
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Settings</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-6">
            {/* ── Appearance ── */}
            <SettingsSection title="Appearance">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Theme</span>
                <ToggleGroup
                  type="single"
                  variant="outline"
                  value={theme}
                  onValueChange={(value) => {
                    if (value) onThemeChange(value as Theme);
                  }}
                >
                  <ToggleGroupItem value="light" aria-label="Light theme">
                    <Sun className="size-3.5" />
                  </ToggleGroupItem>
                  <ToggleGroupItem value="dark" aria-label="Dark theme">
                    <Moon className="size-3.5" />
                  </ToggleGroupItem>
                  <ToggleGroupItem value="system" aria-label="System theme">
                    <Monitor className="size-3.5" />
                  </ToggleGroupItem>
                </ToggleGroup>
              </div>
            </SettingsSection>

            {/* ── Data ── */}
            <SettingsSection title="Data">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {notes.length} {notes.length === 1 ? "note" : "notes"},{" "}
                  {folders.length} {folders.length === 1 ? "folder" : "folders"}
                </span>
                <Button variant="outline" size="sm" onClick={exportNotes} className="gap-1.5">
                  <Download className="size-3.5" />
                  Export
                </Button>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setClearOpen(true)}
                className="gap-1.5"
              >
                <FolderOpen className="size-3.5" />
                Switch vault
              </Button>
            </SettingsSection>

            {/* ── Trash ── */}
            <SettingsSection title="Trash">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Delete permanently after
                </span>
                <div className="flex items-center gap-1.5">
                  <Input
                    type="number"
                    min={0}
                    value={retentionDays}
                    onChange={(e) => handleRetentionChange(e.target.value)}
                    className="h-7 w-16 text-sm text-right"
                    aria-label="Days to keep trash before permanent deletion"
                  />
                  <span className="text-sm text-muted-foreground">
                    {retentionDays === 1 ? "day" : "days"}
                  </span>
                </div>
              </div>
              {retentionDays === 0 && (
                <p className="text-xs text-muted-foreground/70">
                  0 = never auto-delete — you'll need to empty Trash manually.
                </p>
              )}
            </SettingsSection>

            {/* ── Indexing ── */}
            <SettingsSection title="Indexing">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  {icon}
                  <span>{label}</span>
                </div>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span>
                      <Button variant="outline" size="sm" disabled className="gap-1.5">
                        <RefreshCw className="size-3.5" />
                        Re-index now
                      </Button>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="top">{tooltip}</TooltipContent>
                </Tooltip>
              </div>
            </SettingsSection>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={clearOpen}
        onOpenChange={setClearOpen}
        title="Switch to a different vault?"
        description="This closes the current notes folder and lets you choose another one. Nothing on disk is deleted."
        confirmLabel="Switch vault"
        onConfirm={handleSwitchVault}
      />
    </>
  );
}

// ── Shared bits ──────────────────────────────────────────────────────────────

function SettingsSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-medium text-muted-foreground/70 uppercase tracking-wider">
        {title}
      </p>
      {children}
    </div>
  );
}
