import { Editor, useEditorState } from "@tiptap/react";

import { DEFAULT_STATE, EditorState, HeadingValue, AlignValue } from "./Types";
import { MenuTracker } from "./Primitives";
import { TOOLBAR_GROUPS } from "./toolbar-config";
import { CollapsedToolbar } from "./CollapsedToolbar";
import { ExpandedToolbar } from "./ExpandedToolbar";

type Props = {
  editor: Editor | null;
  /** Parent uses this to keep the sticky toolbar visible while a dropdown is open */
  onMenuOpenChange?: (open: boolean) => void;
};

export default function Toolbar({ editor, onMenuOpenChange }: Props) {
  // useEditorState must be called before any early return
  const rawState = useEditorState({
    editor,
    selector: (ctx): EditorState => {
      const e = ctx?.editor;
      if (!e) return DEFAULT_STATE;

      const heading: HeadingValue = e.isActive("heading", { level: 1 })
        ? "h1"
        : e.isActive("heading", { level: 2 })
          ? "h2"
          : e.isActive("heading", { level: 3 })
            ? "h3"
            : "p";

      const align: AlignValue = e.isActive({ textAlign: "center" })
        ? "center"
        : e.isActive({ textAlign: "right" })
          ? "right"
          : "left";

      return {
        heading,
        align,
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

  const state = rawState ?? DEFAULT_STATE;

  if (!editor) return null;

  return (
    <MenuTracker onAnyMenuOpenChange={onMenuOpenChange}>
      {({ track }) => (
        <>
          <CollapsedToolbar
            editor={editor}
            groups={TOOLBAR_GROUPS}
            state={state}
            track={track}
          />
          <ExpandedToolbar
            editor={editor}
            groups={TOOLBAR_GROUPS}
            state={state}
          />
        </>
      )}
    </MenuTracker>
  );
}
