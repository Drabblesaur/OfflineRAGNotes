// Placeholder for a future RAG indexing pipeline — no indexer exists yet.
// The type covers the states a real implementation will need (idle/up to
// date, in-progress with counts, error) so wiring one in later only means
// changing this hook's internals, not the UI that reads it.
export type IndexStatus =
  | { state: "disabled" }
  | { state: "idle"; lastIndexedAt: Date | null }
  | { state: "indexing"; done: number; total: number }
  | { state: "error"; message: string };

export function useIndexStatus(): IndexStatus {
  return { state: "disabled" };
}
