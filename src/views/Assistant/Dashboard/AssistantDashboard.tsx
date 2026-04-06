import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Calendar, Activity, FilePlus, Save, Trash2, ArrowRight, Clock, ShieldCheck } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../../controllers/hooks/hooks';
import { 
    fetchAsstPatientsThunk, 
    fetchAsstAppointmentsThunk, 
    fetchAsstWaitingRoomThunk,
    fetchAsstPatientDataThunk 
} from '../../../controllers/assistant/asstThunks';
import { setAsstFullPatientHistory } from '../../../controllers/slices/assistant/asstPatientVisitSlice';
import { DraftService, type DraftPatient } from '../../../services/assistant/DraftService';
import '../Assistant.css';

const AssistantDashboard = () => {
    const dispatch = useAppDispatch();
    const navigate = useNavigate();

    // Remote Data - Using namespaced assistant slices
    const { patients, waitingRoom, isLoading: loadingPatients } = useAppSelector((state) => state.asstPatients);
    const { appointments, isLoading: loadingAppointments } = useAppSelector((state) => state.asstAppointments);
    const { user } = useAppSelector((state) => state.auth);
    const role = user?.role || 'Assistant';

    // Local Data
    const [localDrafts, setLocalDrafts] = useState<DraftPatient[]>([]);
    const hasFetched = useRef(false);

    useEffect(() => {
        if (hasFetched.current) return;
        hasFetched.current = true;

        dispatch(fetchAsstPatientsThunk());
        dispatch(fetchAsstWaitingRoomThunk());
        dispatch(fetchAsstAppointmentsThunk());
        setLocalDrafts(DraftService.getAllDrafts());

        DraftService.cleanupOldDrafts(30);

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                dispatch(fetchAsstAppointmentsThunk());
                setLocalDrafts(DraftService.getAllDrafts());
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, [dispatch]);

    const handleNewVisit = () => {
        navigate('/assistant/visit/new');
    };

    const handleResumeDraft = (draft: DraftPatient) => {
        dispatch(setAsstFullPatientHistory(draft.patientData));
        navigate(`/assistant/visit/${draft.patientId}`);
    };

    const handleDeleteDraft = (draftId: string) => {
        if (window.confirm('Are you sure you want to delete this draft?')) {
            DraftService.deleteDraft(draftId);
            setLocalDrafts(DraftService.getAllDrafts());
        }
    };

    const handleCheckIn = (apt: any) => {
        const draftId = `checkin_${apt.id || Math.random().toString(36).substr(2, 9)}`;
        const freshDraft: DraftPatient = {
            patientId: draftId,
            lastUpdatedAt: Date.now(),
            status: "DRAFT",
            savedSections: { basic: true, clinical: false, diagnosis: false, prescription: false },
            patientData: {
                patientId: draftId,
                draftId: draftId,
                cloudPatientId: apt.patientId || null,
                activeTab: 0,
                visitStatus: 'DRAFT',
                basic: {
                    fullName: apt.patientName || apt.name || apt.fullName || '',
                    age: apt.age ? String(apt.age) : '',
                    mobileNumber: apt.mobile || apt.phone || apt.mobileNumber || '',
                    sex: apt.sex || apt.gender || 'Male',
                    address: apt.address || ''
                },
                clinical: { historyText: '', vitals: {}, reports: [] },
                diagnosis: { diagnosisText: '', selectedInvestigations: [], customInvestigations: '' },
                prescription: { medications: [], isAssistant: true },
                clinicalHistory: [],
                medicalHistory: [],
                vitalsHistory: [],
                diagnosisHistory: [],
                investigationsHistory: [],
                isVisitLocked: false,
                lastLockedVisitDate: null
            }
        };
        DraftService.saveDraft(draftId, freshDraft);
        dispatch(setAsstFullPatientHistory(freshDraft.patientData));

        if (apt.patientId) {
            dispatch(fetchAsstPatientDataThunk(apt.patientId));
        }

        navigate(`/assistant/visit/${draftId}`);
    };

    const todayAppointments = appointments.filter((apt) => {
        const status = (apt.status || '').toLowerCase();
        if (status === 'canceled' || status === 'cancelled') return false;

        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const tomorrow = new Date(todayStart);
        tomorrow.setDate(tomorrow.getDate() + 1);

        try {
            const aptDate = new Date(`${apt.date} ${apt.time || '00:00'}`);
            if (!isNaN(aptDate.getTime())) {
                return aptDate >= todayStart && aptDate < tomorrow;
            }
        } catch { }

        return false;
    });

    const waitingRoomPatients = waitingRoom;

    // Animation Variants
    const containerVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
    };

    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: { y: 0, opacity: 1, transition: { duration: 0.4 } }
    };

    return (
        <motion.div 
            initial="hidden"
            animate="visible"
            variants={containerVariants}
            className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 md:space-y-8"
        >
            {/* Header */}
            <motion.div variants={itemVariants} className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 px-1">
                <div>
                    <h1 className="text-xl md:text-2xl lg:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-500">
                        {role === 'Doctor' ? 'Doctor' : 'Assistant'} Dashboard
                    </h1>
                    <p className="text-type-body flex items-center gap-2 mt-1 decoration-transparent">
                        <Clock size={16} className="text-primary-base" />
                        Live Status
                    </p>
                </div>
            </motion.div>

            {/* 📊 System Stats Section */}
            <motion.div variants={itemVariants} className="px-1">
                <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2.5">📊 System Stats</h2>
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* Waiting Room - Priority Card (Full Width on mobile) */}
                    <div className="col-span-2 lg:col-span-1 bg-amber-500 p-4 rounded-2xl shadow-lg shadow-amber-200/50 flex items-center gap-4 transition-all hover:scale-[1.02] active:scale-98">
                        <div className="p-2.5 bg-white/20 text-white rounded-xl shrink-0 backdrop-blur-sm">
                            <Activity size={24} className="animate-pulse" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-amber-100/80 truncate">In Waiting Room</p>
                            <div className="flex items-baseline gap-2">
                                <p className="text-2xl font-black text-white leading-none mt-1">{waitingRoomPatients.length}</p>
                                <span className="flex h-2 w-2 relative">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Total Registered */}
                    <div className="bg-white p-3.5 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-3 transition-all hover:shadow-md active:scale-98">
                        <div className="p-2 bg-blue-50 text-blue-600 rounded-xl shrink-0">
                            <Users size={20} />
                        </div>
                        <div className="min-w-0">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 truncate">Patients</p>
                            <p className="text-lg font-black text-slate-900 leading-none mt-1">{patients.length}</p>
                        </div>
                    </div>

                    {/* Today's Appointments */}
                    <div className="bg-white p-3.5 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-3 transition-all hover:shadow-md active:scale-98">
                        <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl shrink-0">
                            <Calendar size={20} />
                        </div>
                        <div className="min-w-0">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 truncate">Schedule</p>
                            <p className="text-lg font-black text-slate-900 leading-none mt-1">{todayAppointments.length}</p>
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* ⚡ Quick Actions Section */}
            <motion.div variants={itemVariants} className="px-1">
                <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2.5">⚡ Quick Actions</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                        { label: 'New Visit', onClick: handleNewVisit, icon: FilePlus, color: 'blue', grad: 'from-blue-500/10 to-indigo-500/10' },
                        { label: 'Register', onClick: () => navigate('/assistant/patients'), icon: Users, color: 'amber', grad: 'from-amber-500/10 to-orange-500/10' },
                        { label: 'Schedule', onClick: () => navigate('/assistant/appointments'), icon: Calendar, color: 'emerald', grad: 'from-emerald-500/10 to-teal-500/10' },
                        { label: 'Settings', onClick: () => navigate('/assistant/settings'), icon: ShieldCheck, color: 'slate', grad: 'from-slate-500/10 to-slate-800/10' }
                    ].map((item, idx) => (
                        <button
                            key={idx}
                            onClick={item.onClick}
                            className="group relative overflow-hidden p-3.5 bg-white border border-slate-100 rounded-2xl shadow-sm transition-all hover:shadow-md active:scale-95 flex flex-col items-start gap-2.5"
                        >
                            <div className={`absolute inset-0 bg-gradient-to-br ${item.grad} opacity-0 group-hover:opacity-100 transition-opacity`} />
                            <div className={`p-2 bg-${item.color}-50 text-${item.color}-600 rounded-xl group-hover:scale-110 transition-transform duration-200 shrink-0`}>
                                <item.icon size={18} />
                            </div>
                            <span className="text-xs font-bold text-slate-800 tracking-tight">{item.label}</span>
                        </button>
                    ))}
                </div>
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">
                
                <div className="lg:col-span-7 space-y-6 md:space-y-8">
                    
                    <motion.div variants={itemVariants} className="glass-card overflow-hidden">
                        <div className="p-4 border-b border-borderColor/50 flex justify-between items-center bg-amber-50/50">
                            <h2 className="text-base font-bold text-amber-800 flex items-center gap-2">
                                <span className="relative flex h-3 w-3">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
                                </span>
                                Waiting Room Queue
                            </h2>
                            <div className="flex items-center gap-2 text-[10px] font-bold text-amber-600 uppercase tracking-tighter bg-amber-100/50 px-2 py-1 rounded-full border border-amber-200/50">
                                <ShieldCheck size={12} />
                                Cloud Sync Active
                            </div>
                        </div>
                        <div className="divide-y divide-borderColor/30">
                            <AnimatePresence mode="popLayout">
                                {loadingPatients ? (
                                    <div className="p-12 text-center flex flex-col items-center gap-3">
                                        <Activity className="text-amber-400 animate-spin" size={32} />
                                        <p className="text-amber-800 font-medium animate-pulse">Synchronizing patient queue...</p>
                                    </div>
                                ) : waitingRoomPatients.length === 0 ? (
                                    <div className="p-12 text-center text-type-body bg-white/30 backdrop-blur-sm">
                                        <Users className="mx-auto text-slate-300 mb-3" size={48} />
                                        <p className="text-sm font-medium">The waiting room is currently empty.</p>
                                        <p className="text-xs mt-1 text-slate-400">Newly checked-in patients will appear here automatically.</p>
                                    </div>
                                ) : (
                                    waitingRoomPatients.map((patient: any) => (
                                        <motion.div 
                                            key={patient.visitId || patient.patientId}
                                            layout
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, scale: 0.95 }}
                                            className="p-4 md:p-5 flex flex-col sm:flex-row justify-between items-center bg-white/40 hover:bg-amber-50/50 transition-colors group"
                                        >
                                            <div className="flex items-center gap-3 w-full sm:w-auto">
                                                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 font-bold shrink-0 text-sm">
                                                    {(patient.name || 'U')[0].toUpperCase()}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="font-bold text-type-contrast truncate text-base leading-tight">{patient.name}</p>
                                                    <div className="flex flex-wrap items-center gap-2 mt-1">
                                                        <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-mono border border-slate-200">#{(patient.patientId || '').split('_').pop()}</span>
                                                        {patient.visitId && <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full border border-amber-200">Visit Active</span>}
                                                    </div>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => navigate(`/assistant/visit/${patient.patientId}`)}
                                                className="mt-4 sm:mt-0 w-full sm:w-auto px-4 py-1.5 rounded-lg text-amber-700 bg-amber-100 hover:bg-amber-200 font-bold text-xs transition-all flex items-center justify-center gap-2 group"
                                            >
                                                <span>View Case</span>
                                                <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                                            </button>
                                        </motion.div>
                                    ))
                                )}
                            </AnimatePresence>
                        </div>
                    </motion.div>

                    <AnimatePresence>
                        {localDrafts.length > 0 && (
                            <motion.div 
                                variants={itemVariants}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="glass-card overflow-hidden"
                            >
                                <div className="p-4 border-b border-borderColor/50 flex justify-between items-center bg-slate-50/50">
                                    <h2 className="text-base font-bold text-type-heading flex items-center gap-2">
                                        <Save size={18} className="text-primary-base" />
                                        In-Progress Drafts
                                    </h2>
                                    <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-full border border-slate-200">LOCAL SYNC</span>
                                </div>
                                <div className="divide-y divide-borderColor/30">
                                    {localDrafts.map((draft) => (
                                        <div key={draft.patientId} className="p-4 flex flex-col sm:flex-row justify-between items-center bg-white/20 hover:bg-primary-light/10 transition-colors">
                                            <div className="w-full sm:w-auto">
                                                <p className="font-bold text-type-contrast text-base leading-none">
                                                    {draft.patientData?.basic?.fullName || 'Untitled Patient'}
                                                </p>
                                                <p className="text-xs text-type-body mt-2 flex items-center gap-1.5">
                                                    <Clock size={12} />
                                                    Modified: {new Date(draft.lastUpdatedAt).toLocaleDateString()} at {new Date(draft.lastUpdatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </p>
                                            </div>
                                            <div className="mt-4 sm:mt-0 w-full sm:w-auto flex items-center gap-2">
                                                <button
                                                    onClick={() => handleResumeDraft(draft)}
                                                    className="flex-1 sm:flex-none px-5 py-2 rounded-xl text-primary-base bg-primary-light/50 border border-primary-base/20 hover:bg-primary-base hover:text-white font-bold text-sm transition-all"
                                                >
                                                    Resume
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteDraft(draft.patientId)}
                                                    className="p-2.5 rounded-xl text-rose-500 bg-rose-50 border border-rose-100 hover:bg-rose-500 hover:text-white transition-all shadow-sm"
                                                    title="Discard Draft"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                <div className="lg:col-span-5">
                    <motion.div variants={itemVariants} className="glass-card flex flex-col h-full overflow-hidden">
                        <div className="p-4 border-b border-borderColor/50 flex justify-between items-center bg-slate-900 text-white">
                            <h2 className="text-base font-bold flex items-center gap-2">
                                <Calendar size={18} className="text-secondary-base" />
                                Today's Schedule
                            </h2>
                            <button 
                                onClick={() => navigate('/assistant/appointments')}
                                className="text-secondary-light text-xs font-bold hover:underline tracking-widest uppercase"
                            >
                                Full View
                            </button>
                        </div>
                        <div className="divide-y divide-borderColor/30 overflow-y-auto max-h-[600px] flex-1 scroll-smooth">
                            {loadingAppointments ? (
                                <div className="p-10 space-y-4">
                                    {[1,2,3].map(i => <div key={i} className="h-16 bg-slate-100 rounded-xl animate-pulse"></div>)}
                                </div>
                            ) : todayAppointments.length === 0 ? (
                                <div className="p-12 text-center">
                                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <Calendar className="text-slate-300" size={32} />
                                    </div>
                                    <p className="text-type-body font-medium">Clear schedule for today!</p>
                                    <p className="text-xs text-slate-400 mt-1">No upcoming appointments found.</p>
                                </div>
                            ) : (
                                todayAppointments.map((apt: any) => (
                                    <div key={apt.id} className="p-4 flex justify-between items-center hover:bg-slate-50/50 transition-colors relative group">
                                        <div className="flex items-center gap-4">
                                            <div className="text-center w-14 px-1 py-2 bg-slate-50 border border-slate-100 rounded-xl group-hover:bg-white group-hover:shadow-sm transition-all shrink-0">
                                                <span className="block text-[10px] font-black text-primary-base scale-90">{(apt.time || '').split(' ')[1] || ''}</span>
                                                <span className="block text-base font-bold text-slate-800 leading-none mt-0.5">{(apt.time || '').split(' ')[0]}</span>
                                            </div>
                                            <div className="min-w-0 pr-2">
                                                <p className="font-bold text-type-contrast truncate text-base leading-tight">{apt.patientName}</p>
                                                <p className="text-[9px] font-black text-secondary-base bg-secondary-light/30 px-2 py-0.5 rounded-full mt-1 inline-flex items-center gap-1 border border-secondary-base/10 uppercase tracking-tighter">
                                                    <ShieldCheck size={10} />
                                                    {apt.type || 'Consultation'}
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleCheckIn(apt)}
                                            className="ml-auto px-4 py-1.5 rounded-lg text-slate-600 border border-slate-200 bg-white hover:border-primary-base hover:text-primary-base hover:bg-primary-light/30 font-bold text-xs transition-all shadow-sm shrink-0"
                                        >
                                            Check In
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </motion.div>
                </div>

            </div>
        </motion.div>
    );
};

export default AssistantDashboard;
