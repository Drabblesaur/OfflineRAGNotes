import { useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import Logo from "@/components/Logo";
import { Button } from "@/components/ui/button";

type Props = {
  onVaultSelected: (path: string) => void;
};

export default function VaultPicker({ onVaultSelected }: Props) {
  const [picking, setPicking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePick() {
    setError(null);
    setPicking(true);
    try {
      const path = await open({ directory: true, title: "Choose your notes folder" });
      if (typeof path === "string") {
        onVaultSelected(path);
        return;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't open the folder picker.");
    }
    setPicking(false);
  }

  return (
    <div className="h-screen w-screen flex items-center justify-center bg-paper-canvas">
      <div className="flex flex-col items-center gap-6 max-w-sm text-center px-6">
        <Logo />
        <div className="space-y-2">
          <h1 className="font-serif text-2xl font-semibold text-ink-900">
            Choose your notes folder
          </h1>
          <p className="text-sm text-ink-700">
            jot stores every note as a plain markdown file in a folder you pick, like a vault.
            Choose an empty folder to start fresh, or an existing one to open it.
          </p>
        </div>
        <Button onClick={handlePick} disabled={picking}>
          {picking ? "Choosing…" : "Choose folder"}
        </Button>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    </div>
  );
}
