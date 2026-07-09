import { Node, mergeAttributes, type RawCommands } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import Suggestion from "@tiptap/suggestion";
import type { RefObject } from "react";
import type { Note } from "@/components/NoteScreen";
import WikiLinkView from "./WikiLinkView";
import { renderWikiLinkSuggestion } from "./renderWikiLinkSuggestion";
import type { WikiLinkSuggestionItem } from "./WikiLinkSuggestionTypes";

// A single mutable object the extension reads from on every keystroke/click
// instead of closing over props — the TipTap editor instance (and therefore
// this extension's config) is created once and lives across note switches
// (see editor/index.tsx), so anything that can change over the editor's
// lifetime has to be threaded through a ref, not a closure. Mirrors the
// notesRef/foldersRef pattern in hooks/useNotesStore.ts.
export type WikiLinkBridge = {
  notes: Note[];
  // Resolved link click -> navigate to it. Broken link click -> create a note
  // titled `title` in the current note's folder, then navigate to it.
  onClickLink: (title: string) => void;
  // Used by the "Create note" suggestion item: creates a note titled `title`
  // in the current note's folder without navigating away, so the user can
  // keep typing in the note they're linking from.
  onCreateNoteSilently: (title: string) => Promise<void>;
};

export type WikiLinkOptions = {
  bridgeRef: RefObject<WikiLinkBridge>;
};

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    wikiLink: {
      insertWikiLink: (attrs: { title: string; alias?: string | null }) => ReturnType;
    };
  }
}

const WIKILINK_TOKEN_RE = /^\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/;

export const WikiLink = Node.create<WikiLinkOptions>({
  name: "wikiLink",
  group: "inline",
  inline: true,
  atom: true,

  addOptions() {
    return {
      bridgeRef: {
        current: { notes: [], onClickLink: () => {}, onCreateNoteSilently: async () => {} },
      },
    };
  },

  addAttributes() {
    return {
      title: { default: "" },
      alias: { default: null },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-type="wiki-link"]' }];
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      "span",
      mergeAttributes(HTMLAttributes, { "data-type": "wiki-link" }),
      `[[${(node.attrs.alias as string | null) ?? (node.attrs.title as string)}]]`,
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(WikiLinkView);
  },

  markdownTokenizer: {
    name: "wikiLink",
    level: "inline",
    start: (src: string) => src.indexOf("[["),
    tokenize(src: string) {
      const match = WIKILINK_TOKEN_RE.exec(src);
      if (!match) return undefined;
      return {
        type: "wikiLink",
        raw: match[0],
        title: match[1].trim(),
        alias: match[2] ? match[2].trim() : null,
      };
    },
  },

  parseMarkdown(token, helpers) {
    return helpers.createNode("wikiLink", {
      title: token.title as string,
      alias: (token.alias as string | null) ?? null,
    });
  },

  renderMarkdown(node) {
    const title = (node.attrs?.title as string) ?? "";
    const alias = node.attrs?.alias as string | null;
    return alias ? `[[${title}|${alias}]]` : `[[${title}]]`;
  },

  addCommands() {
    return {
      insertWikiLink:
        (attrs) =>
        ({ commands }) =>
          commands.insertContent({ type: this.name, attrs }),
    } as Partial<RawCommands>;
  },

  addProseMirrorPlugins() {
    const bridgeRef = this.options.bridgeRef;
    return [
      Suggestion<WikiLinkSuggestionItem>({
        editor: this.editor,
        char: "[[",
        allowSpaces: true,
        items: ({ query }) => {
          const notes = bridgeRef.current.notes;
          const q = query.trim().toLowerCase();
          const matches = (q ? notes.filter((n) => n.title.toLowerCase().includes(q)) : notes)
            .slice()
            .sort((a, b) => {
              const aStarts = a.title.toLowerCase().startsWith(q) ? 0 : 1;
              const bStarts = b.title.toLowerCase().startsWith(q) ? 0 : 1;
              if (aStarts !== bStarts) return aStarts - bStarts;
              return a.title.localeCompare(b.title);
            })
            .slice(0, 8)
            .map((n): WikiLinkSuggestionItem => ({ kind: "note", id: n.id, title: n.title }));

          const exact = notes.some((n) => n.title.toLowerCase() === q);
          if (q && !exact) {
            matches.push({ kind: "create", title: query.trim() });
          }
          return matches;
        },
        command: ({ editor, range, props }) => {
          const run = (title: string) =>
            editor
              .chain()
              .focus()
              .insertContentAt(range, [
                { type: "wikiLink", attrs: { title, alias: null } },
                { type: "text", text: " " },
              ])
              .run();

          if (props.kind === "create") {
            void bridgeRef.current.onCreateNoteSilently(props.title).then(() => run(props.title));
          } else {
            run(props.title);
          }
        },
        render: renderWikiLinkSuggestion,
      }),
    ];
  },
});
