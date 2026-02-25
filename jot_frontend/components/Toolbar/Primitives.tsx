import React from "react";
import { ChevronDown } from "lucide-react";

import { Toggle } from "@/components/ui/toggle";
import { ToggleGroupItem } from "@/components/ui/toggle-group";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// ── Prevent dropdown portals from stealing editor focus on mousedown ──────────
export const stopBlur = (e: React.MouseEvent) => e.preventDefault();

// ── Shared class names ────────────────────────────────────────────────────────
export const iconBtn = "h-8 w-8 p-0";
export const menuBtn = "h-8 px-2 gap-1";

// ── Visual divider between toolbar sections ───────────────────────────────────
export function Divider() {
  return <div className="h-5 w-px bg-border mx-1" />;
}

// ── Tooltip for Toggle / Button (asChild works fine here) ─────────────────────
export function Tip({
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

// ── Tooltip for ToggleGroupItems ──────────────────────────────────────────────
// asChild conflicts with Radix internals on ToggleGroupItem, so we wrap in a
// span as the trigger instead to avoid breaking toggle-group state tracking.
export function TipItem({
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

// ── Dropdown trigger button ───────────────────────────────────────────────────
// Uses forwardRef so DropdownMenuTrigger asChild works without a <span> wrapper.
export const MenuTriggerButton = React.forwardRef<
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
    onMouseDown={stopBlur}
    aria-label={label}
    {...props}
  >
    {icon}
    <ChevronDown className="size-3 opacity-70" />
  </Button>
));
MenuTriggerButton.displayName = "MenuTriggerButton";

// ── Toolbar toggle button with tooltip baked in ───────────────────────────────
// Use this for all standalone toggle/action buttons in the expanded toolbar.
// The optional `disabled` prop handles history buttons (undo/redo).
export function ToolbarToggle({
  label,
  pressed,
  onToggle,
  disabled,
  children,
}: {
  label: string;
  pressed: boolean;
  onToggle: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <TipItem label={label}>
      <Toggle
        className={iconBtn}
        pressed={pressed}
        disabled={disabled}
        onMouseDown={stopBlur}
        onPressedChange={onToggle}
      >
        {children}
      </Toggle>
    </TipItem>
  );
}

// ── ToggleGroup item with tooltip baked in ────────────────────────────────────
// Use this inside a <ToggleGroup> (headings, alignment) in the expanded toolbar.
export function ToolbarGroupItem({
  label,
  value,
  children,
}: {
  label: string;
  value: string;
  children: React.ReactNode;
}) {
  return (
    <TipItem label={label}>
      <ToggleGroupItem className={iconBtn} value={value} onMouseDown={stopBlur}>
        {children}
      </ToggleGroupItem>
    </TipItem>
  );
}

// ── Menu open tracker ─────────────────────────────────────────────────────────
// Counts how many menus are open at once so the parent can keep the sticky
// toolbar visible while any dropdown is still open.
export function MenuTracker({
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
