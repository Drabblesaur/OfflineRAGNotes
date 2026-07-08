import type { Tab } from "@/components/TabView/Tabs";

const SESSION_KEY = "jot:session";
const DEBOUNCE_MS = 300;

type Session = {
  tabs: Tab[];
  activeTabId: string | null;
};

export function loadSession(): Session | null {
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Session;
  } catch {
    return null;
  }
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;

// Ephemeral UI state (which tabs are open) — debounced, synchronous
// localStorage writes so a fast unmount can't leave a torn write behind the
// way an in-flight IndexedDB transaction could.
export function saveSession(session: Session): void {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  }, DEBOUNCE_MS);
}
