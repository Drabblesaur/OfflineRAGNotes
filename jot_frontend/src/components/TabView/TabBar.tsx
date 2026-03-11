import { useRef, useState } from "react";
import { X, FileText, FolderOpen, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Tab } from "./Tabs";
import { tabLabel } from "./Tabs";

// ── Types ─────────────────────────────────────────────────────────────────────

type Props = {
  tabs: Tab[];
  activeTabId: string | null;
  onTabSelect: (id: string) => void;
  onTabClose: (id: string) => void;
  onTabsReorder: (reordered: Tab[]) => void;
  onAddClick: () => void;
};

// ── TabBar ────────────────────────────────────────────────────────────────────

export default function TabBar({
  tabs,
  activeTabId,
  onTabSelect,
  onTabClose,
  onTabsReorder,
  onAddClick,
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // id of the tab being dragged
  const [draggedId, setDraggedId] = useState<string | null>(null);
  // id of the tab currently under the drag cursor (drop target)
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  // ── Drag handlers ──────────────────────────────────────────────────────────

  function handleDragStart(e: React.DragEvent, id: string) {
    setDraggedId(id);
    // Required for Firefox
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", id);
  }

  const DRAG_END_SENTINEL = "__end__";

  function handleDragOver(e: React.DragEvent, id: string) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (id !== draggedId) setDragOverId(id);
  }

  function handleDrop(e: React.DragEvent, targetId: string) {
    e.preventDefault();
    if (!draggedId) return;

    const from = tabs.findIndex((t) => t.id === draggedId);
    if (from === -1) return;

    const reordered = [...tabs];
    const [moved] = reordered.splice(from, 1);

    if (targetId === DRAG_END_SENTINEL) {
      // Drop after the last tab
      reordered.push(moved);
    } else {
      if (draggedId === targetId) {
        setDraggedId(null);
        setDragOverId(null);
        return;
      }
      const to = reordered.findIndex((t) => t.id === targetId);
      if (to === -1) return;
      reordered.splice(to, 0, moved);
    }

    onTabsReorder(reordered);
    setDraggedId(null);
    setDragOverId(null);
  }

  function handleDragEnd() {
    setDraggedId(null);
    setDragOverId(null);
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex items-end border-b bg-muted/30 shrink-0">
      {/* Scrollable tab strip */}
      <div
        ref={scrollRef}
        className="flex items-end overflow-x-auto min-w-0 flex-1"
        style={{ scrollbarWidth: "none" }}
      >
        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId;
          const isDragging = tab.id === draggedId;
          const isDropTarget = tab.id === dragOverId;
          const label = tabLabel(tab);

          return (
            <button
              key={tab.id}
              draggable
              onClick={() => onTabSelect(tab.id)}
              onDragStart={(e) => handleDragStart(e, tab.id)}
              onDragOver={(e) => handleDragOver(e, tab.id)}
              onDrop={(e) => handleDrop(e, tab.id)}
              onDragEnd={handleDragEnd}
              title={label}
              className={cn(
                "group relative flex items-center gap-1.5 px-3 h-9 shrink-0",
                "text-xs font-medium border-t border-l border-r rounded-t-md",
                "transition-all duration-150 max-w-[180px] min-w-[100px]",
                "cursor-grab active:cursor-grabbing select-none",
                isActive
                  ? "bg-white text-foreground border-border -mb-px z-10 shadow-sm"
                  : "bg-transparent text-muted-foreground border-transparent hover:bg-white/60 hover:text-foreground",
                // Dim the tab being dragged
                isDragging && "opacity-40",
                // Show a left border highlight on the drop target
                isDropTarget && !isDragging && "border-l-blue-400 border-l-2",
              )}
            >
              {/* Type icon */}
              {tab.type === "folder" ? (
                <FolderOpen
                  className={cn(
                    "size-3 shrink-0 transition-colors",
                    isActive
                      ? "text-amber-500"
                      : "text-muted-foreground/60 group-hover:text-muted-foreground",
                  )}
                />
              ) : (
                <FileText
                  className={cn(
                    "size-3 shrink-0 transition-colors",
                    isActive
                      ? "text-blue-500"
                      : "text-muted-foreground/60 group-hover:text-muted-foreground",
                  )}
                />
              )}

              {/* Label */}
              <span className="truncate flex-1 text-left">{label}</span>

              {/* Close button */}
              <span
                role="button"
                aria-label={`Close ${label}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onTabClose(tab.id);
                }}
                className={cn(
                  "shrink-0 rounded-sm p-0.5 transition-colors",
                  "opacity-0 group-hover:opacity-100",
                  isActive && "opacity-60",
                  "hover:!opacity-100 hover:bg-muted hover:text-foreground",
                )}
              >
                <X className="size-2.5" />
              </span>
            </button>
          );
        })}

        {/* Trailing drop zone — catches drops past the last tab */}
        <div
          className={cn(
            "flex-1 min-w-[24px] h-9 transition-colors",
            dragOverId === DRAG_END_SENTINEL && draggedId && "bg-blue-50",
          )}
          onDragOver={(e) => handleDragOver(e, DRAG_END_SENTINEL)}
          onDrop={(e) => handleDrop(e, DRAG_END_SENTINEL)}
        />
      </div>

      {/* Add tab button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onAddClick}
        aria-label="Open or create"
        className="h-8 w-8 p-0 mx-1 mb-0.5 shrink-0 text-muted-foreground hover:text-foreground transition-colors"
      >
        <Plus className="size-4" />
      </Button>
    </div>
  );
}
