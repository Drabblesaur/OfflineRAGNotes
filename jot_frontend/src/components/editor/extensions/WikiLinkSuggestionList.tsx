import { forwardRef, useImperativeHandle, useState } from "react";
import { FileText, Plus } from "lucide-react";
import type { SuggestionKeyDownProps, SuggestionProps } from "@tiptap/suggestion";
import { cn } from "@/lib/utils";
import type { WikiLinkSuggestionItem } from "./WikiLinkSuggestionTypes";

export type WikiLinkSuggestionListHandle = {
  onKeyDown: (props: SuggestionKeyDownProps) => boolean;
};

const WikiLinkSuggestionList = forwardRef<
  WikiLinkSuggestionListHandle,
  SuggestionProps<WikiLinkSuggestionItem>
>(function WikiLinkSuggestionList({ items, command }, ref) {
  const [selected, setSelected] = useState(0);
  // Reset the highlighted row whenever a new items array arrives (new query
  // results) — adjusted during render, React's documented pattern for
  // resetting state in response to a changed prop, same as
  // NoteScreen.tsx's syncedTitle handling.
  const [prevItems, setPrevItems] = useState(items);
  if (items !== prevItems) {
    setPrevItems(items);
    setSelected(0);
  }

  const select = (index: number) => {
    const item = items[index];
    if (item) command(item);
  };

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }) => {
      if (items.length === 0) return false;
      if (event.key === "ArrowDown") {
        setSelected((i) => (i + 1) % items.length);
        return true;
      }
      if (event.key === "ArrowUp") {
        setSelected((i) => (i - 1 + items.length) % items.length);
        return true;
      }
      if (event.key === "Enter") {
        select(selected);
        return true;
      }
      return false;
    },
  }));

  if (items.length === 0) {
    return (
      <div className="rounded-panel border bg-popover px-3 py-2 text-sm text-muted-foreground shadow-md">
        Type to link a note…
      </div>
    );
  }

  return (
    <div className="w-64 overflow-hidden rounded-panel border bg-popover p-1 text-popover-foreground shadow-md">
      {items.map((item, index) => (
        <button
          key={item.kind === "note" ? item.id : `create-${item.title}`}
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => select(index)}
          className={cn(
            "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm",
            index === selected ? "bg-paper-panel text-ink-900" : "text-foreground",
          )}
        >
          {item.kind === "note" ? (
            <>
              <FileText className="size-3.5 shrink-0 text-blue-500" />
              <span className="flex-1 truncate">{item.title || "Untitled"}</span>
            </>
          ) : (
            <>
              <Plus className="size-3.5 shrink-0 text-blue-500" />
              <span className="flex-1 truncate">Create note "{item.title}"</span>
            </>
          )}
        </button>
      ))}
    </div>
  );
});

export default WikiLinkSuggestionList;
