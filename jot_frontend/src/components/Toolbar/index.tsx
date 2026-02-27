import { Editor, useEditorState } from "@tiptap/react";

import { DEFAULT_STATE } from "./Types";
import type { EditorState, HeadingValue, AlignValue } from "./Types";
import { useMenuTracker } from "./Primitives";
import { TOOLBAR_GROUPS } from "./toolbar-config";
import { CollapsedToolbar } from "./CollapsedToolbar";
import { ExpandedToolbar } from "./ExpandedToolbar";

type Props = {
  editor: Editor | null;
  /** Parent uses this to keep the sticky toolbar visible while a dropdown is open */
  onMenuOpenChange?: (open: boolean) => void;
};

// ── Heading / align helpers ───────────────────────────────────────────────────
// Centralised here so the selector below never has to re-implement the logic,
// and toolbar-config.tsx never has to import from tiptap directly.

function deriveHeading(e: Editor): HeadingValue {
  if (e.isActive("heading", { level: 1 })) return "h1";
  if (e.isActive("heading", { level: 2 })) return "h2";
  if (e.isActive("heading", { level: 3 })) return "h3";
  return "p";
}

function deriveAlign(e: Editor): AlignValue {
  if (e.isActive({ textAlign: "center" })) return "center";
  if (e.isActive({ textAlign: "right" })) return "right";
  return "left";
}

// ─────────────────────────────────────────────────────────────────────────────

export default function Toolbar({ editor, onMenuOpenChange }: Props) {
  // Must be called before any early return (Rules of Hooks)
  const rawState = useEditorState({
    editor,
    selector: (ctx): EditorState => {
      const e = ctx?.editor;
      if (!e) return DEFAULT_STATE;

      return {
        heading: deriveHeading(e),
        align: deriveAlign(e),
        bold: e.isActive("bold"),
        italic: e.isActive("italic"),
        strike: e.isActive("strike"),
        highlight: e.isActive("highlight"),
        code: e.isActive("code"),
        bullet: e.isActive("bulletList"),
        ordered: e.isActive("orderedList"),
        blockquote: e.isActive("blockquote"),
        codeBlock: e.isActive("codeBlock"),
      };
    },
  });

  const track = useMenuTracker(onMenuOpenChange);
  const state = rawState ?? DEFAULT_STATE;

  if (!editor) return null;

  return (
    <>
      <CollapsedToolbar
        editor={editor}
        groups={TOOLBAR_GROUPS}
        state={state}
        track={track}
      />
      <ExpandedToolbar editor={editor} groups={TOOLBAR_GROUPS} state={state} />
    </>
  );
}
