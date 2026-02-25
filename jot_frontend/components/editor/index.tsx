"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TextAlign from "@tiptap/extension-text-align";
import Highlight from "@tiptap/extension-highlight";
import { ListKeymap } from "@tiptap/extension-list-keymap";
import GlobalDragHandle from "tiptap-extension-global-drag-handle";
import { useEffect, useRef, useState } from "react";
import Toolbar from "@/components/Toolbar";

export default function Editor() {
  const [focused, setFocused] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const rootRef = useRef<HTMLDivElement | null>(null);

  const showToolbar = focused || menuOpen;

  const editor = useEditor({
    extensions: [
      StarterKit,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Highlight,
      ListKeymap,
      GlobalDragHandle.configure({
        dragHandleWidth: 20,
        scrollTreshold: 100,
      }),
    ],
    content: "<p>Start writing...</p>",
    editorProps: {
      attributes: {
        class:
          "prose prose-sm sm:prose max-w-none focus:outline-none min-h-[300px] p-4",
      },
    },
    onFocus: () => setFocused(true),
    // IMPORTANT: no onBlur
    immediatelyRender: false,
  });

  const handleMenuOpenChange = (open: boolean) => {
    setMenuOpen(open);

    // ✅ While a dropdown is open, force toolbar to stay visible
    if (open) setFocused(true);

    if (!open) editor?.commands.focus();
  };

  useEffect(() => {
    const onPointerDownCapture = (e: PointerEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      // ✅ Ignore clicks inside Radix portals (dropdown content lives here)
      // This prevents toolbar from hiding while selecting a dropdown item.
      if (target.closest("[data-radix-portal]")) return;

      // ✅ If any menu is open, do not hide toolbar
      if (menuOpen) return;

      const root = rootRef.current;
      if (!root) return;

      if (!root.contains(target)) {
        setFocused(false);
      }
    };

    document.addEventListener("pointerdown", onPointerDownCapture, true);
    return () =>
      document.removeEventListener("pointerdown", onPointerDownCapture, true);
  }, [menuOpen]);

  // ✅ When interacting with toolbar, keep it visible and prevent selection loss.
  const handleToolbarPointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    setFocused(true);
  };

  return (
    <div ref={rootRef} className="flex flex-col items-center w-full">
      <div
        onPointerDown={handleToolbarPointerDown}
        className={`
          mb-2 transition-all duration-200
          ${
            showToolbar
              ? "opacity-100 translate-y-0 pointer-events-auto"
              : "opacity-0 -translate-y-1 pointer-events-none"
          }
        `}
      >
        <Toolbar editor={editor} onMenuOpenChange={handleMenuOpenChange} />
      </div>

      <div className="w-full border rounded-lg flex">
        <div className="drag-handle-gutter relative w-8 shrink-0 rounded-l-lg bg-gray-50 border-r border-gray-100" />
        <div className="flex-1 min-w-0">
          <EditorContent editor={editor} />
        </div>
      </div>
    </div>
  );
}
