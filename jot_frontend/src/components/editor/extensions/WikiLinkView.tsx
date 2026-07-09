import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { cn } from "@/lib/utils";
import type { WikiLinkBridge } from "./WikiLink";

export default function WikiLinkView({ node, extension }: NodeViewProps) {
  const title = (node.attrs.title as string) ?? "";
  const alias = node.attrs.alias as string | null;
  const bridge = (extension.options as { bridgeRef: { current: WikiLinkBridge } }).bridgeRef.current;
  const target = bridge.notes.find(
    (n) => n.title.trim().toLowerCase() === title.trim().toLowerCase(),
  );

  return (
    <NodeViewWrapper as="span" className="inline">
      <span
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => bridge.onClickLink(title)}
        role="link"
        tabIndex={0}
        title={target ? "Open note" : `Note not found — click to create "${title}"`}
        className={cn(
          "cursor-pointer rounded px-1 py-0.5 -mx-0.5",
          target
            ? "bg-blue-500/10 text-blue-600 hover:bg-blue-500/20"
            : "bg-red-500/10 text-red-600 hover:bg-red-500/20",
        )}
      >
        {alias ?? title}
      </span>
    </NodeViewWrapper>
  );
}
