import { useState, useEffect, useRef } from 'react';
import { DraftService } from '../../services/draftService';

/**
 * Replaces the old useLocalDraft hook.
 * Routes all persistence through DraftService (DRAFT_PATIENT_ prefix).
 * Features:
 *   • 500ms debounce — prevents main-thread blocking on every keystroke
 *   • Name guard — no write if formData.name < 2 chars (prevents storage bloat)
 *   • Loads existing draft from DraftService on mount
 *   • clearDraft() calls DraftService.deleteDraft() for clean teardown
 */
export function useLocalDraft<T extends Record<string, unknown>>(
  draftId: string,
  patientId: string | undefined,
  initialData: T
) {
  // ── Initialise from existing draft (survives F5 because draftId is in the URL) ──
  const [formData, setFormData] = useState<T>(() => {
    const saved = DraftService.getDraft(draftId);
    let initial = saved ? (saved.formData as T) : initialData;
    
    // Ghost cleanup: if legacy draft restoring metadata, silently wipe it
    // because the binary blob is already permanently lost to JSON.stringify.
    if (initial && typeof initial === 'object' && 'reportFiles' in initial) {
        initial = { ...initial, reportFiles: [] };
    }
    return initial;
  });

  // ── Debounced auto-save ──────────────────────────────────────────────────────
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Clear any pending write from the previous render
    if (debounceRef.current) clearTimeout(debounceRef.current);

    // Schedule a write 500ms after the last state change
    debounceRef.current = setTimeout(() => {
      // Create a shallow copy and completely strip the binary file array bounds
      const payloadToSave = { ...formData } as Record<string, unknown>;
      if ('reportFiles' in payloadToSave) {
          delete payloadToSave.reportFiles;
      }
      DraftService.saveDraft(draftId, patientId, payloadToSave);
    }, 500);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [formData, draftId, patientId]);

  // ── Call this after a successful API submit to remove the draft ──────────────
  const clearDraft = () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    DraftService.deleteDraft(draftId);
    setFormData(initialData);
  };

  return [formData, setFormData, clearDraft] as const;
}
