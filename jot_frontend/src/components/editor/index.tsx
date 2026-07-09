import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TextAlign from "@tiptap/extension-text-align";
import Highlight from "@tiptap/extension-highlight";
import { ListKeymap } from "@tiptap/extension-list-keymap";
import { Markdown } from "@tiptap/markdown";
import GlobalDragHandle from "tiptap-extension-global-drag-handle";
import {
  TableOfContents,
  getHierarchicalIndexes,
} from "@tiptap/extension-table-of-contents";
import { UniqueID } from "@tiptap/extension-unique-id";
import { useRef, useEffect } from "react";
import Toolbar from "@/components/Toolbar";

export type ToCItem = {
  id: string;
  textContent: string;
  level: number;
  isActive: boolean;
  isScrolledOver: boolean;
  itemIndex: string;
};

type Props = {
  /** Controlled by NoteScreen's pointer listener — Editor does not own this. */
  focused: boolean;
  noteId: string;
  /** Markdown source — the Markdown extension parses/serializes it. */
  content: string;
  onContentChange: (content: string) => void;
  onToCChange?: (items: ToCItem[]) => void;
  onMenuOpenChange?: (open: boolean) => void;
};

export default function Editor({
  focused,
  noteId,
  content,
  onContentChange,
  onToCChange,
  onMenuOpenChange,
}: Props) {
  const menuOpenRef = useRef(false);
  const prevNoteId = useRef<string | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ listKeymap: false }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Highlight,
      ListKeymap,
      Markdown,
      GlobalDragHandle.configure({
        dragHandleWidth: 20,
        scrollTreshold: 100,
      }),
      UniqueID.configure({
        // Assign stable IDs to headings so ToC anchor links work.
        types: ["heading"],
      }),
      TableOfContents.configure({
        getIndex: getHierarchicalIndexes,
        onUpdate: (items) =>
          onToCChange?.(
            items.map((item) => ({
              ...item,
              itemIndex: String(item.itemIndex),
            })),
          ),
      }),
    ],
    // Initial content from the note. Tiptap treats this as a seed — it is NOT
    // a controlled value. Note switching is handled via setContent() below.
    content,
    contentType: "markdown",
    editorProps: {
      attributes: {
        class:
          "prose prose-sm sm:prose max-w-none focus:outline-none min-h-[300px] p-4",
      },
    },
    onUpdate: ({ editor }) => {
      onContentChange(editor.getMarkdown());
    },
    // No onFocus — NoteScreen's pointer listener owns focused state entirely.
    // Relying on tiptap's onFocus caused spurious refocus when toolbar buttons
    // called e.preventDefault() on mousedown (stopBlur).
    immediatelyRender: false,
  });

  // When the active note changes, replace editor content.
  // We guard with noteId rather than comparing content objects to avoid
  // resetting the editor mid-edit if the parent re-renders for other reasons.
  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    if (prevNoteId.current === noteId) return;
    prevNoteId.current = noteId;
    // false = don't emit an onUpdate, so we don't immediately write back
    // the content we just set.
    editor.commands.setContent(content, { emitUpdate: false, contentType: "markdown" });
  }, [noteId, editor]);

  const handleMenuOpenChange = (open: boolean) => {
    menuOpenRef.current = open;
    // Only restore editor focus on menu close if the editor area is still
    // active — don't steal focus if the user has moved to the title/tags.
    if (!open && focused && editor && !editor.isDestroyed) {
      editor.commands.focus();
    }
    onMenuOpenChange?.(open);
  };

  return (
    <div className="flex flex-col items-center w-full">
      <div
        className={`
          sticky top-2 z-10 mb-2 transition-all duration-200
          ${
            focused
              ? "opacity-100 translate-y-0 pointer-events-auto"
              : "opacity-0 -translate-y-1 pointer-events-none"
          }
        `}
      >
        <Toolbar editor={editor} onMenuOpenChange={handleMenuOpenChange} />
      </div>

      <div className="w-full border border-line rounded-card flex">
        <div className="drag-handle-gutter relative w-8 shrink-0 rounded-l-card bg-paper-panel border-r border-line" />
        <div className="flex-1 min-w-0">
          <EditorContent editor={editor} />
        </div>
      </div>
    </div>
  );
}
