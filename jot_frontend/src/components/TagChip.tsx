import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { categoryStyleForTag } from "@/lib/category";

// Tag chip recipe (DESIGN_SYSTEM §6): font-mono chip on the tag's category
// tint, a leading category dot, border in the same hue. Tags are free-form
// text, so the hue itself comes from a deterministic hash (see lib/category).
export default function TagChip({
  tag,
  size = "default",
  onRemove,
  className,
}: {
  tag: string;
  size?: "default" | "sm";
  onRemove?: () => void;
  className?: string;
}) {
  const style = categoryStyleForTag(tag);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border font-mono text-ink-900",
        style.tint,
        style.border,
        size === "default" ? "text-xs px-2.5 py-1" : "text-[10px] px-1.5 py-0 h-4",
        onRemove && "pr-1",
        className,
      )}
    >
      <span className={cn("size-1.5 rounded-full shrink-0", style.dot)} />
      <span className="truncate">{tag}</span>
      {onRemove && (
        <button
          onClick={onRemove}
          aria-label={`Remove tag ${tag}`}
          className="rounded-full hover:text-destructive transition-colors shrink-0"
        >
          <X className="size-2.5" />
        </button>
      )}
    </span>
  );
}
