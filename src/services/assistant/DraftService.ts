export interface DraftPatient {
    patientId: string;
    lastUpdatedAt: number;
    status: "DRAFT";
    /**
     * Set after the first successful cloud save.
     */
    cloudPatientId?: string | null;
    patientData: any; // Aggregated state of the 4 tabs
    savedSections: {
        basic: boolean;
        clinical: boolean;
        diagnosis: boolean;
        prescription: boolean;
    };
}

const DRAFT_PREFIX = 'ASST_DRAFT_'; // Distinct prefix for Assistant drafts in the unified PWA

export const DraftService = {
    generateDraftId: (): string => {
        return `draft_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    },

    saveDraft: (patientId: string, data: DraftPatient): void => {
        if (!patientId) return;
        const key = `${DRAFT_PREFIX}${patientId}`;
        const draftData = {
            ...data,
            lastUpdatedAt: Date.now(),
        };
        localStorage.setItem(key, JSON.stringify(draftData));
    },

    getDraft: (patientId: string): DraftPatient | null => {
        if (!patientId) return null;
        const key = `${DRAFT_PREFIX}${patientId}`;
        const saved = localStorage.getItem(key);
        if (!saved) return null;

        try {
            return JSON.parse(saved) as DraftPatient;
        } catch (e) {
            console.error("Failed to parse assistant draft", e);
            return null;
        }
    },

    deleteDraft: (patientId: string): void => {
        if (!patientId) return;
        const key = `${DRAFT_PREFIX}${patientId}`;
        localStorage.removeItem(key);
    },

    getAllDrafts: (): DraftPatient[] => {
        const drafts: DraftPatient[] = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key?.startsWith(DRAFT_PREFIX)) {
                const saved = localStorage.getItem(key);
                if (saved) {
                    try {
                        drafts.push(JSON.parse(saved) as DraftPatient);
                    } catch (e) {
                        console.warn("Invalid assistant draft format for key:", key);
                    }
                }
            }
        }
        return drafts.sort((a, b) => b.lastUpdatedAt - a.lastUpdatedAt);
    },

    cleanupOldDrafts: (maxAgeInDays: number = 30): number => {
        const cutoffTime = Date.now() - (maxAgeInDays * 24 * 60 * 60 * 1000);
        let deletedCount = 0;

        for (let i = localStorage.length - 1; i >= 0; i--) {
            const key = localStorage.key(i);
            if (!key?.startsWith(DRAFT_PREFIX)) continue;

            const saved = localStorage.getItem(key);
            if (!saved) continue;

            try {
                const draft = JSON.parse(saved) as DraftPatient;
                if (draft.lastUpdatedAt < cutoffTime) {
                    localStorage.removeItem(key);
                    deletedCount++;
                }
            } catch {
                localStorage.removeItem(key!);
                deletedCount++;
            }
        }
        return deletedCount;
    },
};
