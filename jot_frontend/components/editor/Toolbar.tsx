import React from "react";
import {
  Bold,
  Heading1,
  Heading2,
  Heading3,
  Strikethrough,
  Italic,
  AlignLeft,
  AlignRight,
  AlignCenter,
  List,
  ListOrdered,
  Highlighter,
  Quote,
  Code2,
  Minus,
  Undo2,
  Redo2,
  Pilcrow,
  ChevronDown,
  Type,
  Wand2,
  TextCursor,
  ListChecks,
} from "lucide-react";

import { Toggle } from "@/components/ui/toggle";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { Editor, useEditorState } from "@tiptap/react";

type Props = {
  editor: Editor | null;
  /** Parent uses this to keep the sticky toolbar visible while a dropdown is open */
  onMenuOpenChange?: (open: boolean) => void;
};

// Prevents dropdown portals from stealing editor focus on mousedown
const stopBlur = (e: React.MouseEvent) => e.preventDefault();

type HeadingValue = "p" | "h1" | "h2" | "h3";
type AlignValue = "left" | "center" | "right";

const DEFAULT_STATE = {
  heading: "p" as HeadingValue,
  align: "left" as AlignValue,
  bold: false,
  italic: false,
  strike: false,
  highlight: false,
  code: false,
  bullet: false,
  ordered: false,
  blockquote: false,
  codeBlock: false,
};

const iconBtn = "h-8 w-8 p-0";
const menuBtn = "h-8 px-2 gap-1";

function Divider() {
  return <div className="h-5 w-px bg-border mx-1" />;
}

// For Toggle / Button — asChild works fine here
function Tip({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side="bottom">
        <p>{label}</p>
      </TooltipContent>
    </Tooltip>
  );
}

// For ToggleGroupItems — asChild conflicts with Radix internals, so we
// use a wrapping span as the trigger instead to avoid breaking toggle state
function TipItem({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex">{children}</span>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        <p>{label}</p>
      </TooltipContent>
    </Tooltip>
  );
}

// Using forwardRef so DropdownMenuTrigger asChild works without a <span> wrapper
const MenuTriggerButton = React.forwardRef<
  HTMLButtonElement,
  React.ComponentPropsWithoutRef<typeof Button> & {
    icon: React.ReactNode;
    label: string;
  }
>(({ icon, label, ...props }, ref) => (
  <Button
    ref={ref}
    type="button"
    variant="secondary"
    size="sm"
    className={menuBtn}
    onMouseDown={(e) => e.preventDefault()}
    aria-label={label}
    {...props}
  >
    {icon}
    <ChevronDown className="size-3 opacity-70" />
  </Button>
));
MenuTriggerButton.displayName = "MenuTriggerButton";

function MenuTracker({
  onAnyMenuOpenChange,
  children,
}: {
  onAnyMenuOpenChange?: (open: boolean) => void;
  children: (opts: { track: (open: boolean) => void }) => React.ReactNode;
}) {
  const openCount = React.useRef(0);

  const track = React.useCallback(
    (open: boolean) => {
      if (open) openCount.current += 1;
      else openCount.current = Math.max(0, openCount.current - 1);
      onAnyMenuOpenChange?.(openCount.current > 0);
    },
    [onAnyMenuOpenChange],
  );

  React.useEffect(() => {
    return () => onAnyMenuOpenChange?.(false);
  }, [onAnyMenuOpenChange]);

  return <>{children({ track })}</>;
}

export default function ToolBar({ editor, onMenuOpenChange }: Props) {
  // ✅ MUST be before any early return
  const [openMenu, setOpenMenu] = React.useState<
    null | "headings" | "formatting" | "alignment" | "blocks"
  >(null);

  const rawState = useEditorState({
    editor,
    selector: (ctx) => {
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

  // ✅ safe to early return AFTER all hooks
  if (!editor) return null;

  return (
    <MenuTracker onAnyMenuOpenChange={onMenuOpenChange}>
      {({ track }) => (
        <>
          {/* ── Collapsed toolbar ( < lg ) ── */}
          <div className="lg:hidden">
            <div className="border rounded-md bg-white/95 backdrop-blur shadow-sm p-1 inline-flex items-center gap-1">
              <div className="flex gap-1">
                <Tip label="Undo">
                  <Toggle
                    className={iconBtn}
                    pressed={false}
                    disabled={!editor.can().chain().focus().undo().run()}
                    onMouseDown={(e) => e.preventDefault()}
                    onPressedChange={() => editor.chain().focus().undo().run()}
                  >
                    <Undo2 className="size-4" />
                  </Toggle>
                </Tip>
                <Tip label="Redo">
                  <Toggle
                    className={iconBtn}
                    pressed={false}
                    disabled={!editor.can().chain().focus().redo().run()}
                    onMouseDown={(e) => e.preventDefault()}
                    onPressedChange={() => editor.chain().focus().redo().run()}
                  >
                    <Redo2 className="size-4" />
                  </Toggle>
                </Tip>
              </div>

              <Divider />

              {/* Headings dropdown */}
              <DropdownMenu
                open={openMenu === "headings"}
                onOpenChange={(open) => {
                  setOpenMenu(open ? "headings" : null);
                  track(open);
                }}
              >
                <Tip label="Headings">
                  <DropdownMenuTrigger asChild>
                    <MenuTriggerButton
                      icon={<Type className="size-4" />}
                      label="Headings"
                    />
                  </DropdownMenuTrigger>
                </Tip>
                <DropdownMenuContent
                  align="start"
                  sideOffset={8}
                  onMouseDown={stopBlur}
                  onCloseAutoFocus={(e) => e.preventDefault()}
                >
                  <DropdownMenuCheckboxItem
                    checked={state.heading === "p"}
                    onSelect={(e) => {
                      e.preventDefault(); // ✅ keep menu open
                      editor.chain().focus().setParagraph().run();
                    }}
                  >
                    <Pilcrow className="mr-2 size-4" /> Paragraph
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={state.heading === "h1"}
                    onSelect={(e) => {
                      e.preventDefault();
                      editor.chain().focus().setHeading({ level: 1 }).run();
                    }}
                  >
                    <Heading1 className="mr-2 size-4" /> Heading 1
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={state.heading === "h2"}
                    onSelect={(e) => {
                      e.preventDefault();
                      editor.chain().focus().setHeading({ level: 2 }).run();
                    }}
                  >
                    <Heading2 className="mr-2 size-4" /> Heading 2
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={state.heading === "h3"}
                    onSelect={(e) => {
                      e.preventDefault();
                      editor.chain().focus().setHeading({ level: 3 }).run();
                    }}
                  >
                    <Heading3 className="mr-2 size-4" /> Heading 3
                  </DropdownMenuCheckboxItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Formatting dropdown */}
              <DropdownMenu
                open={openMenu === "formatting"}
                onOpenChange={(open) => {
                  setOpenMenu(open ? "formatting" : null);
                  track(open);
                }}
              >
                <Tip label="Formatting">
                  <DropdownMenuTrigger asChild>
                    <MenuTriggerButton
                      icon={<Wand2 className="size-4" />}
                      label="Formatting"
                    />
                  </DropdownMenuTrigger>
                </Tip>
                <DropdownMenuContent
                  align="start"
                  sideOffset={8}
                  onMouseDown={stopBlur}
                  onCloseAutoFocus={(e) => e.preventDefault()}
                >
                  <DropdownMenuCheckboxItem
                    checked={state.bold}
                    onSelect={(e) => {
                      e.preventDefault();
                      editor.chain().focus().toggleBold().run();
                    }}
                  >
                    <Bold className="mr-2 size-4" /> Bold
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={state.italic}
                    onSelect={(e) => {
                      e.preventDefault();
                      editor.chain().focus().toggleItalic().run();
                    }}
                  >
                    <Italic className="mr-2 size-4" /> Italic
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={state.strike}
                    onSelect={(e) => {
                      e.preventDefault();
                      editor.chain().focus().toggleStrike().run();
                    }}
                  >
                    <Strikethrough className="mr-2 size-4" /> Strikethrough
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={state.highlight}
                    onSelect={(e) => {
                      e.preventDefault();
                      editor.chain().focus().toggleHighlight().run();
                    }}
                  >
                    <Highlighter className="mr-2 size-4" /> Highlight
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={state.code}
                    onSelect={(e) => {
                      e.preventDefault();
                      editor.chain().focus().toggleCode().run();
                    }}
                  >
                    <Code2 className="mr-2 size-4" /> Inline code
                  </DropdownMenuCheckboxItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Alignment dropdown */}
              <DropdownMenu
                open={openMenu === "alignment"}
                onOpenChange={(open) => {
                  setOpenMenu(open ? "alignment" : null);
                  track(open);
                }}
              >
                <Tip label="Alignment">
                  <DropdownMenuTrigger asChild>
                    <MenuTriggerButton
                      icon={<TextCursor className="size-4" />}
                      label="Alignment"
                    />
                  </DropdownMenuTrigger>
                </Tip>
                <DropdownMenuContent
                  align="start"
                  sideOffset={8}
                  onMouseDown={stopBlur}
                  onCloseAutoFocus={(e) => e.preventDefault()}
                >
                  <DropdownMenuCheckboxItem
                    checked={state.align === "left"}
                    onSelect={(e) => {
                      e.preventDefault();
                      editor.chain().focus().setTextAlign("left").run();
                    }}
                  >
                    <AlignLeft className="mr-2 size-4" /> Left
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={state.align === "center"}
                    onSelect={(e) => {
                      e.preventDefault();
                      editor.chain().focus().setTextAlign("center").run();
                    }}
                  >
                    <AlignCenter className="mr-2 size-4" /> Center
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={state.align === "right"}
                    onSelect={(e) => {
                      e.preventDefault();
                      editor.chain().focus().setTextAlign("right").run();
                    }}
                  >
                    <AlignRight className="mr-2 size-4" /> Right
                  </DropdownMenuCheckboxItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Blocks dropdown */}
              <DropdownMenu
                open={openMenu === "blocks"}
                onOpenChange={(open) => {
                  setOpenMenu(open ? "blocks" : null);
                  track(open);
                }}
              >
                <Tip label="Blocks">
                  <DropdownMenuTrigger asChild>
                    <MenuTriggerButton
                      icon={<ListChecks className="size-4" />}
                      label="Blocks"
                    />
                  </DropdownMenuTrigger>
                </Tip>
                <DropdownMenuContent
                  align="start"
                  sideOffset={8}
                  onMouseDown={stopBlur}
                  onCloseAutoFocus={(e) => e.preventDefault()}
                >
                  <DropdownMenuCheckboxItem
                    checked={state.blockquote}
                    onSelect={(e) => {
                      e.preventDefault();
                      editor.chain().focus().toggleBlockquote().run();
                    }}
                  >
                    <Quote className="mr-2 size-4" /> Blockquote
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={state.codeBlock}
                    onSelect={(e) => {
                      e.preventDefault();
                      editor.chain().focus().toggleCodeBlock().run();
                    }}
                  >
                    <Code2 className="mr-2 size-4" /> Code block
                  </DropdownMenuCheckboxItem>

                  <DropdownMenuSeparator />

                  <DropdownMenuItem
                    onSelect={(e) => {
                      e.preventDefault();
                      editor.chain().focus().setHorizontalRule().run();
                    }}
                  >
                    <Minus className="mr-2 size-4" /> Divider
                  </DropdownMenuItem>

                  <DropdownMenuSeparator />

                  <DropdownMenuCheckboxItem
                    checked={state.bullet}
                    onSelect={(e) => {
                      e.preventDefault();
                      editor.chain().focus().toggleBulletList().run();
                    }}
                  >
                    <List className="mr-2 size-4" /> Bullet list
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={state.ordered}
                    onSelect={(e) => {
                      e.preventDefault();
                      editor.chain().focus().toggleOrderedList().run();
                    }}
                  >
                    <ListOrdered className="mr-2 size-4" /> Ordered list
                  </DropdownMenuCheckboxItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* ── Full toolbar ( lg+ ) ── */}
          <div className="hidden lg:block">
            <div className="border rounded-md bg-white/95 backdrop-blur shadow-sm p-1 inline-flex items-center gap-1 whitespace-nowrap overflow-x-auto">
              {/* History */}
              <div className="flex gap-1">
                <TipItem label="Undo">
                  <Toggle
                    className={iconBtn}
                    pressed={false}
                    disabled={!editor.can().chain().focus().undo().run()}
                    onMouseDown={(e) => e.preventDefault()}
                    onPressedChange={() => editor.chain().focus().undo().run()}
                  >
                    <Undo2 className="size-4" />
                  </Toggle>
                </TipItem>
                <TipItem label="Redo">
                  <Toggle
                    className={iconBtn}
                    pressed={false}
                    disabled={!editor.can().chain().focus().redo().run()}
                    onMouseDown={(e) => e.preventDefault()}
                    onPressedChange={() => editor.chain().focus().redo().run()}
                  >
                    <Redo2 className="size-4" />
                  </Toggle>
                </TipItem>
              </div>

              <Divider />

              {/* Headings */}
              <ToggleGroup
                type="single"
                value={state.heading}
                onValueChange={(value) => {
                  if (!value) return;
                  const v = value as HeadingValue;
                  if (v === "p")
                    return editor.chain().focus().setParagraph().run();
                  const level = v === "h1" ? 1 : v === "h2" ? 2 : 3;
                  editor.chain().focus().setHeading({ level }).run();
                }}
                className="flex gap-1"
              >
                <TipItem label="Paragraph">
                  <ToggleGroupItem
                    className={iconBtn}
                    value="p"
                    onMouseDown={(e) => e.preventDefault()}
                  >
                    <Pilcrow className="size-4" />
                  </ToggleGroupItem>
                </TipItem>
                <TipItem label="Heading 1">
                  <ToggleGroupItem
                    className={iconBtn}
                    value="h1"
                    onMouseDown={(e) => e.preventDefault()}
                  >
                    <Heading1 className="size-4" />
                  </ToggleGroupItem>
                </TipItem>
                <TipItem label="Heading 2">
                  <ToggleGroupItem
                    className={iconBtn}
                    value="h2"
                    onMouseDown={(e) => e.preventDefault()}
                  >
                    <Heading2 className="size-4" />
                  </ToggleGroupItem>
                </TipItem>
                <TipItem label="Heading 3">
                  <ToggleGroupItem
                    className={iconBtn}
                    value="h3"
                    onMouseDown={(e) => e.preventDefault()}
                  >
                    <Heading3 className="size-4" />
                  </ToggleGroupItem>
                </TipItem>
              </ToggleGroup>

              <Divider />

              {/* Marks */}
              <div className="flex gap-1">
                <TipItem label="Bold">
                  <Toggle
                    className={iconBtn}
                    pressed={state.bold}
                    onMouseDown={(e) => e.preventDefault()}
                    onPressedChange={() =>
                      editor.chain().focus().toggleBold().run()
                    }
                  >
                    <Bold className="size-4" />
                  </Toggle>
                </TipItem>
                <TipItem label="Italic">
                  <Toggle
                    className={iconBtn}
                    pressed={state.italic}
                    onMouseDown={(e) => e.preventDefault()}
                    onPressedChange={() =>
                      editor.chain().focus().toggleItalic().run()
                    }
                  >
                    <Italic className="size-4" />
                  </Toggle>
                </TipItem>
                <TipItem label="Strikethrough">
                  <Toggle
                    className={iconBtn}
                    pressed={state.strike}
                    onMouseDown={(e) => e.preventDefault()}
                    onPressedChange={() =>
                      editor.chain().focus().toggleStrike().run()
                    }
                  >
                    <Strikethrough className="size-4" />
                  </Toggle>
                </TipItem>
                <TipItem label="Highlight">
                  <Toggle
                    className={iconBtn}
                    pressed={state.highlight}
                    onMouseDown={(e) => e.preventDefault()}
                    onPressedChange={() =>
                      editor.chain().focus().toggleHighlight().run()
                    }
                  >
                    <Highlighter className="size-4" />
                  </Toggle>
                </TipItem>
                <TipItem label="Inline code">
                  <Toggle
                    className={iconBtn}
                    pressed={state.code}
                    onMouseDown={(e) => e.preventDefault()}
                    onPressedChange={() =>
                      editor.chain().focus().toggleCode().run()
                    }
                  >
                    <Code2 className="size-4" />
                  </Toggle>
                </TipItem>
              </div>

              <Divider />

              {/* Alignment */}
              <ToggleGroup
                type="single"
                value={state.align}
                onValueChange={(value) => {
                  if (!value) return;
                  editor
                    .chain()
                    .focus()
                    .setTextAlign(value as AlignValue)
                    .run();
                }}
                className="flex gap-1"
              >
                <TipItem label="Align left">
                  <ToggleGroupItem
                    className={iconBtn}
                    value="left"
                    onMouseDown={(e) => e.preventDefault()}
                  >
                    <AlignLeft className="size-4" />
                  </ToggleGroupItem>
                </TipItem>
                <TipItem label="Align center">
                  <ToggleGroupItem
                    className={iconBtn}
                    value="center"
                    onMouseDown={(e) => e.preventDefault()}
                  >
                    <AlignCenter className="size-4" />
                  </ToggleGroupItem>
                </TipItem>
                <TipItem label="Align right">
                  <ToggleGroupItem
                    className={iconBtn}
                    value="right"
                    onMouseDown={(e) => e.preventDefault()}
                  >
                    <AlignRight className="size-4" />
                  </ToggleGroupItem>
                </TipItem>
              </ToggleGroup>

              <Divider />

              {/* Blocks */}
              <div className="flex gap-1">
                <TipItem label="Blockquote">
                  <Toggle
                    className={iconBtn}
                    pressed={state.blockquote}
                    onMouseDown={(e) => e.preventDefault()}
                    onPressedChange={() =>
                      editor.chain().focus().toggleBlockquote().run()
                    }
                  >
                    <Quote className="size-4" />
                  </Toggle>
                </TipItem>
                <TipItem label="Code block">
                  <Toggle
                    className={iconBtn}
                    pressed={state.codeBlock}
                    onMouseDown={(e) => e.preventDefault()}
                    onPressedChange={() =>
                      editor.chain().focus().toggleCodeBlock().run()
                    }
                  >
                    <Code2 className="size-4" />
                  </Toggle>
                </TipItem>
                <TipItem label="Divider">
                  <Toggle
                    className={iconBtn}
                    pressed={false}
                    onMouseDown={(e) => e.preventDefault()}
                    onPressedChange={() =>
                      editor.chain().focus().setHorizontalRule().run()
                    }
                  >
                    <Minus className="size-4" />
                  </Toggle>
                </TipItem>
                <TipItem label="Bullet list">
                  <Toggle
                    className={iconBtn}
                    pressed={state.bullet}
                    onMouseDown={(e) => e.preventDefault()}
                    onPressedChange={() =>
                      editor.chain().focus().toggleBulletList().run()
                    }
                  >
                    <List className="size-4" />
                  </Toggle>
                </TipItem>
                <TipItem label="Ordered list">
                  <Toggle
                    className={iconBtn}
                    pressed={state.ordered}
                    onMouseDown={(e) => e.preventDefault()}
                    onPressedChange={() =>
                      editor.chain().focus().toggleOrderedList().run()
                    }
                  >
                    <ListOrdered className="size-4" />
                  </Toggle>
                </TipItem>
              </div>
            </div>
          </div>
        </>
      )}
    </MenuTracker>
  );
}
