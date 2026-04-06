import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type {
    PatientBasic,
    ClinicalData,
    DiagnosisData,
    Medication,
    VisitHistoryItem
} from '../../../models';
import { DraftService } from '../../../services/assistant/DraftService';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export interface AsstPatientVisitState {
    patientId: string | null;
    draftId: string | null;
    cloudPatientId: string | null;
    visitId: string | null;
    activeTab: number;
    visitStatus: 'DRAFT' | 'WAITING' | 'COMPLETED';

    // Current Form State
    basic: PatientBasic;
    clinical: ClinicalData;
    diagnosis: DiagnosisData;
    prescription: {
        medications: Medication[];
        isAssistant: boolean;
    };

    // History State
    clinicalHistory: VisitHistoryItem[];
    vitalsHistory: VisitHistoryItem[];
    reportsHistory: VisitHistoryItem[];
    medicalHistory: VisitHistoryItem[];
    diagnosisHistory: VisitHistoryItem[];
    investigationsHistory: VisitHistoryItem[];

    // Logic Flags
    isVisitLocked: boolean;
    lastLockedVisitDate: string | null;
    lastSavedAt: number | null;
    isLoading: boolean;
    isSubmitting: boolean;
    error: string | null;

    saveStatus: SaveStatus;
    isHistoryDrawerOpen: boolean;
    historyDrawerType: 'clinical' | 'medical' | 'diagnosis' | 'investigations' | 'reports' | 'vitals';
}

const getInitialState = (): AsstPatientVisitState => ({
    patientId: null,
    draftId: null,
    cloudPatientId: null,
    visitId: null,
    activeTab: 0,
    visitStatus: 'DRAFT',

    basic: {
        fullName: '',
        age: '',
        mobileNumber: '',
        sex: 'Male',
        address: '',
    },
    clinical: {
        historyText: '',
        reportNotes: '',
        vitals: {},
        reports: [],
    },
    diagnosis: {
        diagnosisText: '',
        selectedInvestigations: [],
        customInvestigations: '',
    },
    prescription: {
        medications: [],
        isAssistant: true,
    },

    clinicalHistory: [],
    vitalsHistory: [],
    reportsHistory: [],
    medicalHistory: [],
    diagnosisHistory: [],
    investigationsHistory: [],

    isVisitLocked: false,
    lastLockedVisitDate: null,
    lastSavedAt: null,
    isLoading: false,
    isSubmitting: false,
    error: null,

    saveStatus: 'idle',
    isHistoryDrawerOpen: false,
    historyDrawerType: 'clinical',
});

const initialState: AsstPatientVisitState = getInitialState();

export const asstPatientVisitSlice = createSlice({
    name: 'asstPatientVisit',
    initialState,
    reducers: {
        updateAsstBasicDetails: (state, action: PayloadAction<Partial<PatientBasic>>) => {
            if (!state.isVisitLocked) {
                state.basic = { ...state.basic, ...action.payload };
            }
        },
        updateAsstClinicalDetails: (state, action: PayloadAction<Partial<ClinicalData>>) => {
            if (!state.isVisitLocked) {
                state.clinical = { ...state.clinical, ...action.payload };
            }
        },
        updateAsstDiagnosisDetails: (state, action: PayloadAction<Partial<DiagnosisData>>) => {
            if (!state.isVisitLocked) {
                state.diagnosis = { ...state.diagnosis, ...action.payload };
            }
        },
        setAsstMedications: (state, action: PayloadAction<Medication[]>) => {
            if (!state.isVisitLocked) {
                state.prescription.medications = action.payload;
            }
        },
        setAsstActiveTab: (state, action: PayloadAction<number>) => {
            state.activeTab = action.payload;
        },
        setAsstIsSubmitting: (state, action: PayloadAction<boolean>) => {
            state.isSubmitting = action.payload;
        },
        setAsstSaveStatus: (state, action: PayloadAction<SaveStatus>) => {
            state.saveStatus = action.payload;
        },
        setAsstCloudPatientId: (state, action: PayloadAction<string>) => {
            state.cloudPatientId = action.payload;
        },
        setAsstVisitId: (state, action: PayloadAction<string | null>) => {
            state.visitId = action.payload;
        },
        setAsstVisitLock: (state, action: PayloadAction<{ isLocked: boolean; lastLockedDate: string | null }>) => {
            state.isVisitLocked = action.payload.isLocked;
            state.lastLockedVisitDate = action.payload.lastLockedDate;
            if (action.payload.isLocked) {
                state.visitStatus = 'COMPLETED';
            }
        },
        setAsstFullPatientHistory: (state, action: PayloadAction<{
            clinicalHistory: any[];
            vitalsHistory?: any[];
            reportsHistory?: any[];
            medicalHistory: any[];
            diagnosisHistory: any[];
            investigationsHistory: any[];
            patientData: Partial<PatientBasic>;
            activeVisit?: any;
            lastLockedVisitDate?: string;
        }>) => {
            state.clinicalHistory = action.payload.clinicalHistory;
            state.vitalsHistory = action.payload.vitalsHistory || [];
            state.reportsHistory = action.payload.reportsHistory || [];
            state.medicalHistory = action.payload.medicalHistory;
            state.diagnosisHistory = action.payload.diagnosisHistory;
            state.investigationsHistory = action.payload.investigationsHistory;

            // Merge basic info carefully: only update if missing or if the server has something we don't
            if (action.payload.patientData) {
                const updatedBasic = { ...state.basic };
                (Object.keys(action.payload.patientData) as (keyof PatientBasic)[]).forEach(key => {
                    if (!updatedBasic[key] && action.payload.patientData[key]) {
                        (updatedBasic as any)[key] = action.payload.patientData[key];
                    }
                });
                state.basic = updatedBasic;
            }

            if (action.payload.activeVisit && !state.visitId) {
                const av = action.payload.activeVisit;
                state.visitId = av.visitId;
                state.visitStatus = av.status || 'WAITING';
                
                // Only populate vitals, history, diagnosis if they are currently blank
                if (av.clinicalParameters && Object.keys(state.clinical.vitals).length === 0) {
                    state.clinical.vitals = av.clinicalParameters;
                }
                if (av.medicalHistory && !state.clinical.historyText) {
                    state.clinical.historyText = av.medicalHistory;
                }
                if (av.diagnosis && !state.diagnosis.diagnosisText) {
                    state.diagnosis.diagnosisText = av.diagnosis;
                }
                
                if (av.advisedInvestigations && state.diagnosis.selectedInvestigations.length === 0) {
                    const rawAdv = av.advisedInvestigations;
                    if (typeof rawAdv === 'string' && rawAdv.trim() !== '') {
                        if (rawAdv.trim().startsWith('[')) {
                            try {
                                const invs = JSON.parse(rawAdv);
                                if (Array.isArray(invs)) state.diagnosis.selectedInvestigations = invs;
                            } catch (e) { console.warn('Failed to parse investigations'); }
                        } else {
                            state.diagnosis.selectedInvestigations = rawAdv.split('\n').map(l => l.replace(/^[\u2022\-\*]\s*/, '').trim()).filter(l => l.length > 0);
                        }
                    } else if (Array.isArray(rawAdv)) {
                        state.diagnosis.selectedInvestigations = rawAdv;
                    }
                }

                if (av.medications && state.prescription.medications.length === 0) {
                    state.prescription.medications = av.medications;
                }
                if (av.reportFiles && state.clinical.reports.length === 0) {
                    state.clinical.reports = av.reportFiles;
                }
            }

            const lockDate = action.payload.lastLockedVisitDate || (action.payload.activeVisit?.status === 'COMPLETED' ? action.payload.activeVisit.updatedAt : null);
            if (lockDate) {
                const today = new Date().toISOString().split('T')[0];
                if (lockDate.split('T')[0] >= today) {
                    state.isVisitLocked = true;
                    state.lastLockedVisitDate = lockDate;
                    state.visitStatus = 'COMPLETED';
                }
            }
        },
        // Draft Management
        initializeAsstNewVisit: (state, action: PayloadAction<string | undefined>) => {
            Object.assign(state, getInitialState());
            state.draftId = action.payload || DraftService.generateDraftId();
            state.visitStatus = 'DRAFT';
        },

        initializeAsstExistingVisit: (state, action: PayloadAction<string>) => {
            Object.assign(state, getInitialState());
            state.patientId = action.payload;
            state.visitStatus = 'DRAFT';
        },

        loadAsstDraftIntoState: (state, action: PayloadAction<any>) => {
            const { patientData } = action.payload;
            if (!patientData) return;

            state.patientId = patientData.patientId;
            state.draftId = patientData.draftId;
            state.cloudPatientId = patientData.cloudPatientId || null;
            state.activeTab = patientData.activeTab;
            state.visitStatus = patientData.visitStatus;

            state.basic = patientData.basic;
            state.clinical = patientData.clinical;
            state.diagnosis = patientData.diagnosis;
            state.prescription = { ...patientData.prescription, isAssistant: true };

            state.clinicalHistory = patientData.clinicalHistory || [];
            state.vitalsHistory = patientData.vitalsHistory || [];
            state.reportsHistory = patientData.reportsHistory || [];
            state.medicalHistory = patientData.medicalHistory || [];
            state.diagnosisHistory = patientData.diagnosisHistory || [];
            state.investigationsHistory = patientData.investigationsHistory || [];

            state.isVisitLocked = patientData.isVisitLocked;
            state.lastLockedVisitDate = patientData.lastLockedVisitDate;
            state.lastSavedAt = action.payload.lastUpdatedAt;
            state.saveStatus = 'saved';
        },

        toggleAsstHistoryDrawer: (state, action: PayloadAction<{ open: boolean; type?: AsstPatientVisitState['historyDrawerType'] }>) => {
            state.isHistoryDrawerOpen = action.payload.open;
            if (action.payload.type) {
                state.historyDrawerType = action.payload.type;
            }
        },
        clearAsstVisitSession: (state) => {
            Object.assign(state, getInitialState());
        },
    },
});

export const {
    updateAsstBasicDetails,
    updateAsstClinicalDetails,
    updateAsstDiagnosisDetails,
    setAsstMedications,
    setAsstActiveTab,
    setAsstIsSubmitting,
    setAsstSaveStatus,
    setAsstCloudPatientId,
    setAsstVisitId,
    setAsstVisitLock,
    setAsstFullPatientHistory,
    initializeAsstNewVisit,
    initializeAsstExistingVisit,
    loadAsstDraftIntoState,
    toggleAsstHistoryDrawer,
    clearAsstVisitSession,
} = asstPatientVisitSlice.actions;

export default asstPatientVisitSlice.reducer;
