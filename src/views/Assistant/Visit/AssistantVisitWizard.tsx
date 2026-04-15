import React, { useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../../controllers/hooks/hooks';
import {
    setAsstActiveTab,
    initializeAsstNewVisit,
    initializeAsstExistingVisit,
    loadAsstDraftIntoState,
} from '../../../controllers/slices/assistant/asstPatientVisitSlice';
import {
    // initiateAsstVisitThunk, // Commented out to prevent premature visit initiation
    fetchAsstPatientDataThunk
} from '../../../controllers/assistant/asstThunks';
import { BasicTab } from './Tabs/BasicTab';
import { ClinicalTab } from './Tabs/ClinicalTab';
import { DiagnosisTab } from './Tabs/DiagnosisTab';
import { OverviewTab } from './Tabs/OverviewTab';
import { DraftService } from '../../../services/assistant/DraftService';
import HistoryDrawer from './components/HistoryDrawer';
import {
    Stethoscope,
    ClipboardList,
    Activity,
    FileText,
    AlertCircle,
    ChevronLeft,
    ChevronRight,
    Save,
    ShieldCheck,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import '../Assistant.css';

const TABS = [
    { id: 0, label: 'Basic', icon: Stethoscope },
    { id: 1, label: 'Clinical', icon: Activity },
    { id: 2, label: 'Diagnosis', icon: ClipboardList },
    { id: 3, label: 'Overview', icon: FileText },
];

const isLocalDraftId = (id: string | null | undefined): boolean => {
    if (!id || id === 'undefined' || id === 'null') return true; // Treat explicitly broken IDs as local/draft so they don't hit the cloud
    return id.startsWith('draft_') || id.startsWith('checkin_');
};

const AssistantVisitWizard: React.FC = () => {
    const { patientId: id } = useParams<{ patientId: string }>();
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const asstVisitState = useAppSelector((state) => state.asstPatientVisit);

    const {
        activeTab,
        isVisitLocked,
        // visitId, // Commented out because premature Visit Initiation has been disabled
        patientId,
        draftId,
        cloudPatientId,
        basic,
        isHistoryDrawerOpen,
        isSubmitting,
    } = asstVisitState;

    const isInitialized = useRef(false);
    const localSaveTimerRef = useRef<any>(null);
    const stateRef = useRef(asstVisitState);

    useEffect(() => {
        stateRef.current = asstVisitState;
    }, [asstVisitState]);

    // ──────────────────────────────────────────────────────────────────────────
    // 1. Initialization Logic (Draft Loading / Server Fetching)
    // ──────────────────────────────────────────────────────────────────────────
    // ──────────────────────────────────────────────────────────────────────────
    // 1. Initialization Logic (Draft Loading / Server Fetching)
    // ──────────────────────────────────────────────────────────────────────────
    useEffect(() => {
        isInitialized.current = false;
        if (id && id !== 'new') {
            if (draftId === id || patientId === id) {
                isInitialized.current = true;
                // ── BUG #2 FIX: Stale Redux Guard ─────────────────────────────────
                // If we already have the record in Redux but have empty history arrays,
                // re-fetch now (could happen if hydrated from minimal local draft).
                const realId = !isLocalDraftId(id) ? id : cloudPatientId;
                const isHistoryEmpty = (asstVisitState.vitalsHistory?.length || 0) === 0;
                if (realId && !isLocalDraftId(realId) && isHistoryEmpty) {
                    dispatch(fetchAsstPatientDataThunk(realId));
                }
                return;
            }

            const savedDraft = DraftService.getDraft(id);
            if (savedDraft) {
                dispatch(loadAsstDraftIntoState(savedDraft));
                if (savedDraft.cloudPatientId && !isLocalDraftId(savedDraft.cloudPatientId)) {
                    dispatch(fetchAsstPatientDataThunk(savedDraft.cloudPatientId));
                }
            } else if (isLocalDraftId(id)) {
                dispatch(initializeAsstNewVisit(id));
            } else {
                dispatch(initializeAsstExistingVisit(id));
                dispatch(fetchAsstPatientDataThunk(id));
            }
            isInitialized.current = true;
        } else {
            const newDraftId = DraftService.generateDraftId();
            navigate(`/assistant/visit/${newDraftId}`, { replace: true });
        }
    }, [id, draftId, patientId]);

    // ──────────────────────────────────────────────────────────────────────────
    // 2. Visit Initiation (Cloud Handshake) - COMMENTED OUT
    // Visit is now ONLY initiated in the backend when the Assistant clicks "Send to Doctor" 
    // on the Overview Tab. This prevents patients from being prematurely added to the 
    // waiting room queue upon simply clicking "Check In" while the assistant is still filling out details.
    // ──────────────────────────────────────────────────────────────────────────
    /*
    useEffect(() => {
        const resolvedId = cloudPatientId || (!isLocalDraftId(patientId) ? patientId : null);
        const hasDemographics = !!basic.fullName;

        if (isInitialized.current && resolvedId && !visitId && !isVisitLocked && hasDemographics) {
            dispatch(initiateAsstVisitThunk({
                patientId: resolvedId,
                name: basic.fullName,
                age: basic.age,
                sex: basic.sex,
                mobile: basic.mobileNumber,
                address: basic.address
            }));
        }
    }, [isInitialized.current, patientId, cloudPatientId, visitId, basic.fullName]);
    */

    // ──────────────────────────────────────────────────────────────────────────
    // 3. Local Auto-Save Logic (2s Debounce)
    // ──────────────────────────────────────────────────────────────────────────
    useEffect(() => {
        if (!isInitialized.current) return;
        const currentId = id || draftId || patientId;
        if (isVisitLocked || isSubmitting) return;

        const hasName = !!basic?.fullName?.trim();
        if (!hasName) return;

        if (localSaveTimerRef.current) clearTimeout(localSaveTimerRef.current);
        localSaveTimerRef.current = setTimeout(() => {
            const stateToSave = stateRef.current;
            const existingDraft = DraftService.getDraft(currentId!);
            const existingData = existingDraft?.patientData;

            // ── BUG #5 FIX: History Merge Guard ──
            // Prevent empty history arrays in the current state (if fetched data hasn't arrived)
            // from clobbering what's already saved in localStorage.
            const mergedPatientData = {
                ...stateToSave,
                vitalsHistory: stateToSave.vitalsHistory?.length > 0 ? stateToSave.vitalsHistory : (existingData?.vitalsHistory || []),
                medicalHistory: stateToSave.medicalHistory?.length > 0 ? stateToSave.medicalHistory : (existingData?.medicalHistory || []),
                clinicalHistory: stateToSave.clinicalHistory?.length > 0 ? stateToSave.clinicalHistory : (existingData?.clinicalHistory || []),
                reportsHistory: stateToSave.reportsHistory?.length > 0 ? stateToSave.reportsHistory : (existingData?.reportsHistory || []),
                diagnosisHistory: stateToSave.diagnosisHistory?.length > 0 ? stateToSave.diagnosisHistory : (existingData?.diagnosisHistory || []),
                investigationsHistory: stateToSave.investigationsHistory?.length > 0 ? stateToSave.investigationsHistory : (existingData?.investigationsHistory || []),
            };

            DraftService.saveDraft(currentId!, {
                patientId: currentId!,
                cloudPatientId: stateToSave.cloudPatientId ?? undefined,
                status: 'DRAFT',
                patientData: mergedPatientData,
                lastUpdatedAt: Date.now(),
                savedSections: { basic: true, clinical: true, diagnosis: true, prescription: false }
            });
        }, 2000);

        return () => { if (localSaveTimerRef.current) clearTimeout(localSaveTimerRef.current); };
    }, [asstVisitState, isVisitLocked, isSubmitting]);

    const getSaveStatusDisplay = () => {
        if (isVisitLocked) return null;
        if (!basic?.fullName?.trim()) {
            return (
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-amber-500 bg-amber-50 px-3 py-1.5 rounded-full border border-amber-100">
                    <AlertCircle size={12} />
                    <span>Basic Info Required</span>
                </div>
            );
        }
        return (
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100">
                <Save size={12} />
                <span>Local Draft Ready</span>
            </div>
        );
    };

    return (
        <div className="flex flex-col min-h-screen bg-appBg relative">
            <div className={`p-4 md:p-6 lg:p-8 max-w-5xl mx-auto w-full transition-all duration-500 ${isHistoryDrawerOpen ? 'lg:pr-[420px]' : ''}`}>

                {/* Header */}
                <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
                    <div className="flex items-center gap-5">
                        <Link
                            to="/assistant"
                            className="w-10 h-10 bg-white rounded-xl border border-slate-100 shadow-sm text-slate-400 hover:text-primary-base hover:border-primary-base transition-all active:scale-95 flex items-center justify-center"
                        >
                            <ChevronLeft size={20} />
                        </Link>
                        <div>
                            <h1 className="text-xl md:text-2xl lg:text-3xl font-black text-type-heading tracking-tight leading-none mb-1">
                                {activeTab === 3 ? 'Final Review' : 'Active Patient Case'}
                            </h1>
                            <div className="flex items-center gap-2">
                                <ShieldCheck size={16} className="text-primary-base" />
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">HIPAA Compliant Secure Intake</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 self-end md:self-auto">
                        <AnimatePresence mode="wait">
                            {getSaveStatusDisplay()}
                        </AnimatePresence>
                        {isVisitLocked && (
                            <div className="bg-rose-50 text-rose-500 text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-full border border-rose-100 flex items-center gap-2">
                                <AlertCircle size={14} /> Read-Only Archive
                            </div>
                        )}
                    </div>
                </header>

                {/* Tabs Navigation */}
                <nav className="glass-card mb-8 p-1.5 flex gap-1.5 overflow-x-auto no-scrollbar outline-none focus:outline-none">
                    {TABS.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        const hasRequiredBasicInfo = !!(basic?.fullName?.trim() && basic?.mobileNumber?.trim());
                        const isBlocked = tab.id > 0 && !hasRequiredBasicInfo && !isVisitLocked;

                        return (
                            <button
                                key={tab.id}
                                onClick={() => !isBlocked && dispatch(setAsstActiveTab(tab.id))}
                                disabled={isBlocked}
                                className={`relative flex items-center gap-2.5 px-6 py-3 rounded-2xl font-black text-xs md:text-sm whitespace-nowrap transition-all duration-300 group ${isActive
                                        ? 'text-white'
                                        : isBlocked
                                            ? 'text-slate-300 cursor-not-allowed'
                                            : 'text-slate-500 hover:bg-slate-50'
                                    }`}
                            >
                                {isActive && (
                                    <motion.div
                                        layoutId="asst-active-tab"
                                        className="absolute inset-0 bg-primary-base rounded-2xl shadow-lg shadow-primary-base/30"
                                        transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                                    />
                                )}
                                <span className="relative z-10 flex items-center gap-2.5">
                                    <Icon size={18} />
                                    {tab.label}
                                </span>
                            </button>
                        );
                    })}
                </nav>

                {/* Tab Content */}
                <main className="relative min-h-[400px]">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeTab}
                            initial={{ opacity: 0, y: 10, scale: 0.99 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -10, scale: 0.99 }}
                            transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
                        >
                            {activeTab === 0 && <BasicTab />}
                            {activeTab === 1 && <ClinicalTab />}
                            {activeTab === 2 && <DiagnosisTab />}
                            {activeTab === 3 && <OverviewTab />}
                        </motion.div>
                    </AnimatePresence>
                </main>

                {/* Footer Navigation */}
                <footer className="mt-8 pt-8 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div className="w-full sm:w-auto">
                        {activeTab > 0 && (
                            <button
                                onClick={() => dispatch(setAsstActiveTab(activeTab - 1))}
                                className="w-full sm:w-auto btn-secondary py-3 px-6 flex items-center justify-center gap-3 transition-transform active:scale-95 group"
                            >
                                <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                                Previous Stage
                            </button>
                        )}
                    </div>
                    <div className="w-full sm:w-auto">
                        {activeTab < 3 && (
                            <button
                                onClick={() => {
                                    const hasRequired = !!(basic?.fullName?.trim() && basic?.mobileNumber?.trim());
                                    if (hasRequired || isVisitLocked) dispatch(setAsstActiveTab(activeTab + 1));
                                    else alert('Please provide Patient Name and Mobile Number first to Proceed.');
                                }}
                                className="w-full sm:w-auto btn-primary py-3 px-10 flex items-center justify-center gap-3 shadow-xl transition-all active:scale-95 group"
                            >
                                Proceed to {TABS[activeTab + 1].label}
                                <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
                            </button>
                        )}
                    </div>
                </footer>

            </div>

            {/* History Drawer */}
            <HistoryDrawer />
        </div>
    );
};

export default AssistantVisitWizard;
