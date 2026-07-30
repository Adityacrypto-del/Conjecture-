import type { GlobalState } from "./types";

/**
 * Local run history — persists completed pipeline runs to localStorage so the
 * user can revisit and reload past proposals across sessions.
 *
 * Layout: a small index (one array) plus one entry per run keyed by id. Keeping
 * full states out of the index means listing history never deserializes every
 * proposal, and a single corrupt run can't break the whole list.
 */

const INDEX_KEY = "conjecture.history.index.v1";
const RUN_PREFIX = "conjecture.history.run.";
const MAX_RUNS = 15;

export interface HistoryEntry {
  id: string;
  question: string;
  title: string;
  savedAt: number; // epoch ms
}

function runKey(id: string): string {
  return RUN_PREFIX + id;
}

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function readIndex(): HistoryEntry[] {
  if (typeof localStorage === "undefined") return [];
  const list = safeParse<HistoryEntry[]>(localStorage.getItem(INDEX_KEY), []);
  return Array.isArray(list) ? list : [];
}

function writeIndex(list: HistoryEntry[]): void {
  try {
    localStorage.setItem(INDEX_KEY, JSON.stringify(list));
  } catch {
    /* ignore quota / unavailable */
  }
}

/** Past runs, newest first. */
export function listRuns(): HistoryEntry[] {
  return readIndex().sort((a, b) => b.savedAt - a.savedAt);
}

/** Full state for a run, or null if missing/corrupt. */
export function getRun(id: string): GlobalState | null {
  if (typeof localStorage === "undefined") return null;
  return safeParse<GlobalState | null>(localStorage.getItem(runKey(id)), null);
}

/** Remove a single run (its state and index entry). */
export function deleteRun(id: string): void {
  try {
    localStorage.removeItem(runKey(id));
  } catch {
    /* ignore */
  }
  writeIndex(readIndex().filter((e) => e.id !== id));
}

/** Wipe all history. */
export function clearRuns(): void {
  for (const e of readIndex()) {
    try {
      localStorage.removeItem(runKey(e.id));
    } catch {
      /* ignore */
    }
  }
  writeIndex([]);
}

/**
 * Persist a completed run. Dedupes by session id, caps the list at MAX_RUNS
 * (evicting the oldest), and retries once after eviction on a quota error.
 * Returns the updated list (newest first), or the unchanged list on failure.
 */
export function saveRun(state: GlobalState): HistoryEntry[] {
  if (typeof localStorage === "undefined") return listRuns();

  const id = state.session_id || `run-${Date.now()}`;
  const entry: HistoryEntry = {
    id,
    question: state.research_question || "Untitled research question",
    title: state.proposal?.title || "Untitled proposal",
    savedAt: Date.now(),
  };

  // Rebuild index: drop any existing entry for this id, put the new one first.
  let index = readIndex().filter((e) => e.id !== id);
  index.unshift(entry);

  // Evict oldest beyond the cap, removing their stored states too.
  while (index.length > MAX_RUNS) {
    const evicted = index.pop();
    if (evicted) {
      try {
        localStorage.removeItem(runKey(evicted.id));
      } catch {
        /* ignore */
      }
    }
  }

  const persist = (): boolean => {
    try {
      localStorage.setItem(runKey(id), JSON.stringify(state));
      writeIndex(index);
      return true;
    } catch {
      return false;
    }
  };

  if (!persist()) {
    // Likely quota — drop the oldest run and try once more.
    const evicted = index.pop();
    if (evicted) {
      try {
        localStorage.removeItem(runKey(evicted.id));
      } catch {
        /* ignore */
      }
    }
    persist();
  }

  return listRuns();
}
