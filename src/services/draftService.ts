// ─── Storage key constants ────────────────────────────────────────────────────
const DRAFT_PREFIX = 'DRAFT_PATIENT_';
/** Legacy prefix used by old useLocalDraft hook — cleaned up on Dashboard mount */
const LEGACY_PREFIX = 'pwa_visit_draft_';

// ─── Data Envelope ────────────────────────────────────────────────────────────
export interface DraftPatient {
  /** 'draft_<uuid>' for new patients or '<real-patientId>' for existing ones */
  draftId: string;
  /** Only present when editing an existing patient */
  patientId?: string;
  /** Full wizard form state snapshot */
  formData: Record<string, unknown>;
  /** ISO timestamp — updated on every save for Dashboard sort order */
  lastUpdatedAt: string;
  /** ISO timestamp — set once when draft is first created */
  createdAt: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const storageKey = (draftId: string) => `${DRAFT_PREFIX}${draftId}`;

// ─── DraftService ─────────────────────────────────────────────────────────────

/**
 * Upsert a draft.  Overwrites any existing entry for the same draftId
 * so there is always exactly one draft per patient/session.
 *
 * No-op if formData.name is missing or shorter than 2 characters.
 */
function saveDraft(
  draftId: string,
  patientId: string | undefined,
  formData: Record<string, unknown>
): void {
  const name = (formData.name as string | undefined) ?? '';
  if (name.trim().length < 2) return; // storage bloat guard

  try {
    const key = storageKey(draftId);
    const existing = getDraft(draftId);

    const draft: DraftPatient = {
      draftId,
      patientId,
      formData,
      lastUpdatedAt: new Date().toISOString(),
      createdAt: existing?.createdAt ?? new Date().toISOString(),
    };

    localStorage.setItem(key, JSON.stringify(draft));
  } catch (err) {
    console.error('[DraftService] saveDraft failed', err);
  }
}

/**
 * Load a single draft by its ID.  Returns null if not found or unreadable.
 */
function getDraft(draftId: string): DraftPatient | null {
  try {
    const raw = localStorage.getItem(storageKey(draftId));
    if (!raw) return null;
    return JSON.parse(raw) as DraftPatient;
  } catch {
    return null;
  }
}

/**
 * Return all drafts sorted newest-first (by lastUpdatedAt).
 */
function getAllDrafts(): DraftPatient[] {
  const drafts: DraftPatient[] = [];

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key?.startsWith(DRAFT_PREFIX)) continue;

    try {
      const raw = localStorage.getItem(key);
      if (raw) drafts.push(JSON.parse(raw) as DraftPatient);
    } catch {
      // skip corrupt entries
    }
  }

  return drafts.sort(
    (a, b) =>
      new Date(b.lastUpdatedAt).getTime() - new Date(a.lastUpdatedAt).getTime()
  );
}

/**
 * Permanently remove a draft from storage.
 */
function deleteDraft(draftId: string): void {
  localStorage.removeItem(storageKey(draftId));
}

/**
 * Delete all drafts whose `lastUpdatedAt` is older than `days` days.
 * Also sweeps any leftover legacy `pwa_visit_draft_*` keys.
 *
 * Call this silently on Dashboard mount.
 */
function cleanupOldDrafts(days: number): void {
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  const toRemove: string[] = [];

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key) continue;

    // Remove legacy keys unconditionally
    if (key.startsWith(LEGACY_PREFIX)) {
      toRemove.push(key);
      continue;
    }

    // Remove expired DRAFT_PATIENT_ keys
    if (key.startsWith(DRAFT_PREFIX)) {
      try {
        const raw = localStorage.getItem(key);
        if (raw) {
          const draft = JSON.parse(raw) as DraftPatient;
          const ts = draft.lastUpdatedAt ?? draft.createdAt;
          if (new Date(ts).getTime() < cutoff) {
            toRemove.push(key);
          }
        }
      } catch {
        toRemove.push(key); // remove unreadable entries
      }
    }
  }

  toRemove.forEach(k => localStorage.removeItem(k));
}

export const DraftService = {
  saveDraft,
  getDraft,
  getAllDrafts,
  deleteDraft,
  cleanupOldDrafts,
};
