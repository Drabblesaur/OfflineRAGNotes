import { useState } from "react";
import { Check, FolderOpen, Inbox } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import type { Folder } from "@/components/FolderScreen";

type Props = {
  folders: Folder[];
  currentFolderId: string | null;
  onSelect: (folderId: string | null) => void;
  /** Folder ids to exclude (e.g. the folder currently being moved, and its descendants). */
  excludeIds?: string[];
  children: React.ReactNode;
};

export default function FolderPicker({
  folders,
  currentFolderId,
  onSelect,
  excludeIds = [],
  children,
}: Props) {
  const [open, setOpen] = useState(false);
  const options = folders.filter((f) => !excludeIds.includes(f.id));

  function handleSelect(folderId: string | null) {
    onSelect(folderId);
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className="w-56 p-0" align="start">
        <Command>
          <CommandInput placeholder="Move to…" />
          <CommandList>
            <CommandEmpty>No folders found.</CommandEmpty>
            <CommandGroup>
              <CommandItem
                value="root-unfiled"
                onSelect={() => handleSelect(null)}
                className="gap-2"
              >
                <Inbox className="size-3.5 shrink-0 text-muted-foreground" />
                <span className="flex-1">Unfiled</span>
                {currentFolderId === null && <Check className="size-3.5" />}
              </CommandItem>
              {options.map((folder) => (
                <CommandItem
                  key={folder.id}
                  value={`${folder.id}-${folder.name}`}
                  onSelect={() => handleSelect(folder.id)}
                  className="gap-2"
                >
                  <FolderOpen className="size-3.5 shrink-0 text-amber-500" />
                  <span className="flex-1 truncate">
                    {folder.name || "Untitled Folder"}
                  </span>
                  {currentFolderId === folder.id && (
                    <Check className="size-3.5" />
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
