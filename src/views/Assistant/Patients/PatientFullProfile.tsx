import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
    ArrowLeft, 
    Calendar, 
    Activity, 
    ClipboardList, 
    FileText, 
    Stethoscope, 
    History,
    Sparkles,
    UserCircle,
    ArrowUpRight,
    TrendingUp,
    Pill
} from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../../controllers/hooks/hooks';
import { fetchAsstPatientDataThunk } from '../../../controllers/assistant/asstThunks';
import { motion } from 'framer-motion';
import '../Assistant.css';

const PatientFullProfile: React.FC = () => {
    const { patientId } = useParams<{ patientId: string }>();
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const [expandedVisitIdx, setExpandedVisitIdx] = React.useState<number | null>(0); // Default expand first visit
    
    const { 
        clinicalHistory,
        reportsHistory,
        basic,
        isLoading 
    } = useAppSelector((state: any) => state.asstPatientVisit);
    
    const patient = basic || {};

    useEffect(() => {
        if (patientId) {
            dispatch(fetchAsstPatientDataThunk(patientId));
        }
    }, [dispatch, patientId]);

    const formatDate = (dateString?: string) => {
        if (!dateString) return 'Today';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    if (isLoading && !patient.fullName) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-appBg gap-4">
                <div className="w-12 h-12 border-4 border-primary-base border-t-transparent rounded-full animate-spin"></div>
                <p className="text-xs font-black uppercase text-slate-400 tracking-widest animate-pulse">Retreiving History...</p>
            </div>
        );
    }

    return (
        <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="pb-20 bg-appBg min-h-screen"
        >
            {/* 🏷️ Top Navigation & Bio Header */}
            <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-slate-100 px-4 py-4 md:px-8">
                <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={() => navigate('/assistant/patients')}
                            className="p-2.5 rounded-xl hover:bg-slate-50 text-slate-400 hover:text-type-heading transition-all active:scale-90"
                        >
                            <ArrowLeft size={20} />
                        </button>
                        <div className="h-10 w-px bg-slate-100"></div>
                        <div className="flex items-center gap-3.5">
                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-primary-base to-indigo-600 text-white flex items-center justify-center font-black text-xl shadow-lg shadow-primary-base/20 uppercase">
                                {patient.fullName?.charAt(0) || '?'}
                            </div>
                            <div className="hidden sm:block">
                                <h1 className="text-xl font-black text-type-heading tracking-tight">{patient.fullName}</h1>
                                <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                    <span className="bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">{patientId}</span>
                                    <span>·</span>
                                    <span>{patient.age}Y · {patient.sex}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={() => navigate(`/assistant/visit/${patientId}`)}
                        className="btn-primary px-8 py-3 rounded-2xl flex items-center gap-3 shadow-xl shadow-primary-base/20 transition-all active:scale-95 group"
                    >
                        <Activity size={20} className="group-hover:animate-pulse" />
                        <span className="uppercase tracking-widest font-black text-xs">Add Vitals / New Visit</span>
                    </button>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
                
                {/* 📋 Sidebar: Profile Stats */}
                <div className="lg:col-span-4 space-y-6">
                    <div className="glass-card p-6 border-slate-100 shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 text-emerald-500/10">
                            <UserCircle size={80} />
                        </div>
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                             <Sparkles size={14} className="text-primary-base" /> Patient Metadata
                        </h3>
                        <div className="space-y-4">
                            {[
                                { label: 'Contact', value: patient.mobileNumber || 'None', color: 'bg-blue-50 text-blue-600' },
                                { label: 'Address', value: patient.address || 'None provided', color: 'bg-indigo-50 text-indigo-600' },
                                { label: 'Visit Count', value: clinicalHistory?.length || '0', color: 'bg-emerald-50 text-emerald-600' },
                            ].map((item, i: number) => (
                                <div key={i} className="flex items-start gap-4 p-3.5 rounded-2xl bg-white border border-slate-50 transition-all hover:border-primary-base/10 group">
                                    <div className={`p-2 rounded-xl h-fit ${item.color}`}>
                                        <TrendingUp size={14} />
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">{item.label}</p>
                                        <p className="text-sm font-bold text-slate-700 leading-tight truncate max-w-[200px]">{item.value}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="glass-card p-6 border-slate-100 shadow-sm bg-slate-900 overflow-hidden group">
                        <div className="absolute -bottom-4 -right-4 w-32 h-32 bg-primary-base/10 rounded-full blur-3xl"></div>
                        <div className="relative z-10">
                            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4">Laboratory History</h3>
                            {reportsHistory?.length === 0 ? (
                                <p className="text-xs text-slate-500 italic">No cloud archives found.</p>
                            ) : (
                                <div className="space-y-3">
                                    {reportsHistory.slice(0, 5).map((rep: any, j: number) => (
                                        <div key={j} className="flex items-center gap-3 p-2.5 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition-all cursor-pointer group/item">
                                            <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-slate-500 group-hover/item:text-primary-base transition-colors">
                                                <FileText size={16} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-[10px] font-bold text-slate-400 truncate">{rep.data.reportNotes || 'Report Attachment'}</p>
                                                <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest mt-0.5">{formatDate(rep.timestamp)}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* 🌊 Main Feed: Separated Visit Records */}
                <div className="lg:col-span-8 space-y-8">
                    
                    {/* Segment 1: Clinical Notes Feed */}
                    <section className="space-y-4">
                        <div className="flex items-center justify-between px-2">
                             <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <History size={16} className="text-primary-base" /> Longitudinal Visit Timeline
                             </h2>
                             <span className="text-[10px] font-black bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full border border-slate-200 uppercase tracking-tighter">
                                Sorted Newest First
                             </span>
                        </div>

                        {clinicalHistory?.length === 0 ? (
                             <div className="bg-white p-16 rounded-3xl border-2 border-dashed border-slate-100 flex flex-col items-center gap-4">
                                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center">
                                    <ClipboardList size={32} className="text-slate-200" />
                                </div>
                                <div className="text-center">
                                    <h4 className="font-black text-slate-400 uppercase text-xs tracking-widest">No Interaction History</h4>
                                    <p className="text-xs text-slate-300 font-medium mt-1">Start a new visit to record patient data.</p>
                                </div>
                             </div>
                        ) : (
                            <div className="space-y-6 relative ml-4 pl-8 border-l-2 border-slate-100">
                                {clinicalHistory.map((visit: any, idx: number) => (
                                    <motion.div 
                                        key={idx}
                                        initial={{ x: 20, opacity: 0 }}
                                        animate={{ x: 0, opacity: 1 }}
                                        transition={{ delay: idx * 0.05 }}
                                        className="relative group pb-8 last:pb-0"
                                    >
                                        {/* Timeline Node */}
                                        <div className="absolute -left-[41px] top-4 w-6 h-6 rounded-full bg-white border-4 border-slate-100 group-hover:border-primary-base transition-colors z-10 flex items-center justify-center overflow-hidden">
                                            <div className="w-2 h-2 rounded-full bg-slate-200 group-hover:bg-primary-base"></div>
                                        </div>

                                        <div 
                                            className="glass-card p-6 border-slate-100 shadow-sm relative overflow-hidden transition-all group-hover:shadow-xl group-hover:shadow-slate-200/50 cursor-pointer"
                                            onClick={() => setExpandedVisitIdx(expandedVisitIdx === idx ? null : idx)}
                                        >
                                            <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-6 pb-4 border-b border-slate-50">
                                                <div>
                                                    <div className="flex items-center gap-2 mb-1.5">
                                                        <Calendar size={14} className="text-slate-400" />
                                                        <span className="text-xs font-black text-slate-800 uppercase tracking-tight">{formatDate(visit.timestamp)}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <UserCircle size={14} className="text-slate-400" />
                                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{visit.doctorName || 'Dr. Tiwari'}</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <div className="flex items-center gap-2 bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full border border-emerald-100">
                                                        <Activity size={12} />
                                                        <span className="text-[9px] font-black uppercase tracking-widest">Completed Session</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 gap-8">
                                                {/* 🧬 Summary Complaints - Always Visible */}
                                                <div className="space-y-6">
                                                    <div>
                                                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                                            <ClipboardList size={12} className="text-primary-base" /> Medical History / Complaints
                                                        </h4>
                                                        <p className="text-sm font-bold text-slate-700 leading-relaxed whitespace-pre-wrap">
                                                            {visit.data.historyText || "No detailed complaints recorded."}
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* 🚀 Detail Content - Toggled via Expansion */}
                                                {(expandedVisitIdx === idx) && (
                                                    <motion.div 
                                                        initial={{ height: 0, opacity: 0 }}
                                                        animate={{ height: 'auto', opacity: 1 }}
                                                        className="space-y-10 mt-4 pt-8 border-t border-slate-50"
                                                    >
                                                        {/* 🏥 Vitals & Parameters Grid */}
                                                        {(visit.data.vitals && Object.keys(visit.data.vitals).length > 0) && (
                                                            <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-inner">
                                                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                                                    <TrendingUp size={12} className="text-primary-base" /> Clinical Parameters Matrix
                                                                </h4>
                                                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                                                                    {Object.entries((visit.data.vitals) as Record<string, any>)
                                                                        .filter(([_, val]) => val && String(val).trim() !== '')
                                                                        .map(([k, v]) => (
                                                                            <div key={k} className="flex flex-col bg-slate-50/50 p-2.5 rounded-xl border border-slate-100/50 group/vital hover:bg-white transition-colors">
                                                                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter truncate">{k.replace(/([A-Z])/g, ' $1')}</span>
                                                                                <span className="text-xs font-black text-slate-800 mt-0.5">{String(v)}</span>
                                                                            </div>
                                                                        ))
                                                                    }
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* 💊 Pharmacy & Prescriptions */}
                                                        {(visit.data.meds && visit.data.meds.length > 0) && (
                                                            <div className="space-y-4">
                                                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                                                    <Pill size={14} className="text-primary-base" /> Prescribed Pharmacy Hud
                                                                </h4>
                                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                                    {visit.data.meds.map((med: any, mIdx: number) => {
                                                                        let timingInfo = med.timing;
                                                                        try {
                                                                            const parsed = typeof med.timingValues === 'string' ? JSON.parse(med.timingValues) : med.timingValues;
                                                                            if (parsed) {
                                                                                timingInfo = Object.entries(parsed).filter(([_, v]) => v && v !== '0').map(([k, v]) => `${k}(${v})`).join(', ');
                                                                            }
                                                                        } catch (e) {}

                                                                        return (
                                                                            <div key={mIdx} className="bg-white border border-slate-100 p-4 rounded-2xl flex items-start gap-4 hover:shadow-md transition-shadow relative overflow-hidden group/med">
                                                                                <div className="absolute top-0 right-0 p-2 text-indigo-500/5 rotate-12">
                                                                                    <Pill size={48} />
                                                                                </div>
                                                                                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                                                                                    <span className="font-black text-sm uppercase">{med.name?.charAt(0)}</span>
                                                                                </div>
                                                                                <div className="min-w-0 flex-1">
                                                                                    <p className="font-black text-slate-800 text-sm truncate">{med.name}</p>
                                                                                    <div className="flex flex-wrap gap-2 mt-1.5">
                                                                                        <span className="text-[9px] font-black bg-slate-100 text-slate-600 px-2 py-0.5 rounded-lg uppercase tracking-widest">{med.duration}</span>
                                                                                        <span className="text-[9px] font-black bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-lg uppercase tracking-widest">{timingInfo || med.timing}</span>
                                                                                    </div>
                                                                                    {med.specialInstructions && (
                                                                                        <p className="text-[10px] text-slate-400 italic mt-2 flex items-center gap-1.5 font-bold">
                                                                                            <Stethoscope size={10} /> {med.specialInstructions}
                                                                                        </p>
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            </div>
                                                        )}

                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                                            {/* 🔬 Diagnosis & Advice */}
                                                            <div className="space-y-6">
                                                                {(visit.data.diag) && (
                                                                    <div className="bg-primary-base/5 p-5 rounded-3xl border border-primary-base/10">
                                                                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                                                                            <Stethoscope size={12} className="text-primary-base" /> Clinical Diagnosis
                                                                        </h4>
                                                                        <p className="text-sm font-black text-primary-base leading-snug">
                                                                            {visit.data.diag}
                                                                        </p>
                                                                    </div>
                                                                )}

                                                                {(visit.data.advisedInvestigations || (visit.data.data && visit.data.data.selectedInvestigations)) && (
                                                                    <div>
                                                                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                                                            <Sparkles size={12} className="text-primary-base" /> Advised Tests
                                                                        </h4>
                                                                        <div className="flex flex-wrap gap-2">
                                                                            {(Array.isArray(visit.data.advisedInvestigations || visit.data.data?.selectedInvestigations) 
                                                                                ? (visit.data.advisedInvestigations || visit.data.data?.selectedInvestigations)
                                                                                : (visit.data.advisedInvestigations || "").split('\n').filter((s: string) => s.trim().length > 0)
                                                                            ).map((inv: string, i: number) => (
                                                                                <span key={i} className="text-[9px] font-black text-slate-600 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 uppercase tracking-tight">
                                                                                    {inv.replace(/^[\u2022\-\*]\s*/, '')}
                                                                                </span>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>

                                                            {/* 📂 Reports for this visit */}
                                                            {(visit.data.files && visit.data.files.length > 0) && (
                                                                <div className="bg-slate-900 p-5 rounded-3xl shadow-xl overflow-hidden relative group/repbox">
                                                                    <div className="absolute top-0 right-0 p-4 text-white/5 opacity-50">
                                                                        <FileText size={64} />
                                                                    </div>
                                                                    <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4 flex items-center gap-2 relative z-10">
                                                                        <FileText size={12} className="text-primary-base" /> Visit Lab Archives
                                                                    </h4>
                                                                    <div className="space-y-3 relative z-10">
                                                                        {visit.data.files.map((file: any, fIdx: number) => (
                                                                            <div key={fIdx} className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/5 hover:border-primary-base/30 transition-all group/fileitem cursor-pointer">
                                                                                <div className="w-8 h-8 rounded-xl bg-primary-base/10 text-primary-base flex items-center justify-center">
                                                                                    <FileText size={16} />
                                                                                </div>
                                                                                <div className="flex-1 min-w-0">
                                                                                    <p className="text-[10px] font-bold text-white truncate">{file.fileName}</p>
                                                                                    <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mt-0.5">{(file.fileSize / 1024).toFixed(1)} KB · {file.category || 'General'}</p>
                                                                                </div>
                                                                                <ArrowUpRight size={14} className="text-slate-600 group-hover/fileitem:text-primary-base transition-colors" />
                                                                            </div>
                                                                        ))}
                                                                        {(visit.data.reportNotes) && (
                                                                            <div className="mt-4 pt-4 border-t border-white/5">
                                                                                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Transcription Notes</p>
                                                                                <p className="text-[11px] text-slate-400 italic">"{visit.data.reportNotes}"</p>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </div>
                                            
                                            <div className="absolute right-0 top-0 p-4 transition-all">
                                                <div 
                                                    className={`p-2 rounded-xl shadow-lg ring-4 transition-all ${expandedVisitIdx === idx ? 'bg-primary-base text-white ring-primary-base/20 rotate-180' : 'bg-slate-50 text-slate-400 ring-slate-100'}`}
                                                >
                                                    <TrendingUp size={16} className={expandedVisitIdx === idx ? 'hidden' : ''} />
                                                    <ArrowLeft size={16} className={expandedVisitIdx === idx ? '' : 'hidden'} style={{ transform: 'rotate(90deg)' }} />
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        )}
                    </section>
                </div>
            </div>
        </motion.div>
    );
};

export default PatientFullProfile;
