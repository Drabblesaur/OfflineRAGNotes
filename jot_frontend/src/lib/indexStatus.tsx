import type { ReactNode } from "react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import type { IndexStatus } from "@/hooks/useIndexStatus";

export type IndexStatusDescription = {
  icon: ReactNode;
  label: string;
  tooltip: string;
};

function dot(className: string) {
  return <span className={cn("size-1.5 rounded-full shrink-0", className)} />;
}

// Doc §7 "local-first signal": a quiet footer dot + mono label, not a loud
// icon set — the dot's color is the only thing that changes per state.
export function describeIndexStatus(status: IndexStatus): IndexStatusDescription {
  switch (status.state) {
    case "disabled":
      return {
        icon: dot("bg-ink-300"),
        label: "Indexing not set up",
        tooltip: "RAG search isn't available yet.",
      };
    case "idle":
      return {
        icon: dot("bg-cat-sage"),
        label: "Up to date",
        tooltip: status.lastIndexedAt
          ? `Last indexed ${formatDistanceToNow(status.lastIndexedAt, { addSuffix: true })}`
          : "All notes are indexed.",
      };
    case "indexing":
      return {
        icon: dot("bg-cat-sage animate-pulse"),
        label: `Indexing… ${status.done}/${status.total}`,
        tooltip: "Building the search index.",
      };
    case "error":
      return {
        icon: dot("bg-destructive"),
        label: "Indexing error",
        tooltip: status.message,
      };
  }
}
