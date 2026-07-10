const TRASH_RETENTION_KEY = "jot:trashRetentionDays";
const DEFAULT_RETENTION_DAYS = 30;

// <= 0 means "never auto-purge" (see purgeExpiredTrash in trash.ts).
export function getTrashRetentionDays(): number {
  const raw = localStorage.getItem(TRASH_RETENTION_KEY);
  if (raw === null) return DEFAULT_RETENTION_DAYS;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : DEFAULT_RETENTION_DAYS;
}

export function setTrashRetentionDays(days: number): void {
  localStorage.setItem(TRASH_RETENTION_KEY, String(days));
}
