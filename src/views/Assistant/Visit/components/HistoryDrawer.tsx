import React from 'react';
import { X, Clock, Calendar, ClipboardList, Activity, FileText, Search } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../../../controllers/hooks/hooks';
import { toggleAsstHistoryDrawer } from '../../../../controllers/slices/assistant/asstPatientVisitSlice';

const HistoryDrawer: React.FC = () => {
    const dispatch = useAppDispatch();
    const { 
        isHistoryDrawerOpen, 
        historyDrawerType,
        clinicalHistory,
        vitalsHistory,
        reportsHistory,
        medicalHistory,
        diagnosisHistory,
        investigationsHistory,
        patientId,
        cloudPatientId
    } = useAppSelector((state) => state.asstPatientVisit);

    if (!isHistoryDrawerOpen) return null;

    const onClose = () => dispatch(toggleAsstHistoryDrawer({ open: false }));

    const hasPatientId = !!(patientId && !patientId.startsWith('draft_')) || !!cloudPatientId;

    const getHistoryData = () => {
        switch (historyDrawerType) {
            case 'vitals': return vitalsHistory;
            case 'reports': return reportsHistory;
            case 'clinical': return clinicalHistory;
            case 'medical': return medicalHistory;
            case 'diagnosis': return diagnosisHistory;
            case 'investigations': return investigationsHistory;
            default: return [];
        }
    };

    const historyData = getHistoryData();

    // Grouping logic: Newest Date -> Newest Time
    const groupedHistory = historyData.reduce((acc: any, item: any) => {
        const date = new Date(item.timestamp).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
        if (!acc[date]) acc[date] = [];
        acc[date].push(item);
        return acc;
    }, {});

    const sortedDates = Object.keys(groupedHistory).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

    const renderContent = (item: any) => {
        if (!item.data) return <p className="text-slate-400 italic">No detailed data found.</p>;

        const data = item.data;
        
        switch (historyDrawerType) {
            case 'medical':
            case 'clinical':
                return (
                    <div className="space-y-3">
                        {data.historyText && (
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Symptoms / Complaints</p>
                                <p className="text-sm text-type-contrast whitespace-pre-wrap leading-relaxed">{data.historyText}</p>
                            </div>
                        )}
                        {data.vitals && Object.keys(data.vitals).length > 0 && (
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Recorded Vitals</p>
                                <div className="grid grid-cols-2 gap-2">
                                    {Object.entries(data.vitals).map(([k, v]) => (
                                        v ? (
                                            <div key={k} className="flex justify-between p-2 bg-slate-50 rounded-lg border border-slate-100">
                                                <span className="text-[9px] font-black text-slate-500 uppercase">{k}</span>
                                                <span className="text-[10px] font-bold text-primary-dark">{v as string}</span>
                                            </div>
                                        ) : null
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                );
            case 'vitals':
                return (
                    <div className="space-y-3">
                        {data.vitals && Object.keys(data.vitals).length > 0 ? (
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Vital Parameters</p>
                                <div className="grid grid-cols-2 gap-2">
                                    {Object.entries(data.vitals).map(([k, v]) => (
                                        v ? (
                                            <div key={k} className="flex justify-between p-2 bg-slate-50 rounded-lg border border-slate-100">
                                                <span className="text-[10px] font-bold text-slate-500 uppercase">{k}</span>
                                                <span className="text-[10px] font-bold text-primary-dark">{v as string}</span>
                                            </div>
                                        ) : null
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <p className="text-sm text-slate-500 italic">No vitals recorded.</p>
                        )}
                    </div>
                );
            case 'reports':
                return (
                    <div className="space-y-3">
                        {data.reportNotes && (
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Report Notes</p>
                                <p className="text-sm text-type-contrast whitespace-pre-wrap">{data.reportNotes}</p>
                            </div>
                        )}
                        {data.reportsAttached > 0 && (
                            <div className="mt-2">
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 text-[10px] font-bold border border-blue-100 uppercase tracking-tight">
                                    <FileText size={12} />
                                    {data.reportsAttached} File{data.reportsAttached > 1 ? 's' : ''} Linked
                                </span>
                            </div>
                        )}
                        {!data.reportNotes && !data.reportsAttached && (
                            <p className="text-sm text-slate-500 italic">No reports or notes recorded.</p>
                        )}
                    </div>
                );
            case 'diagnosis':
                return (
                    <div className="space-y-3">
                        {data.diagnosisText && (
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Diagnosis</p>
                                <p className="text-sm font-bold text-slate-800">{data.diagnosisText}</p>
                            </div>
                        )}
                        {data.selectedInvestigations && data.selectedInvestigations.length > 0 && (
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Advised Tests</p>
                                <div className="flex flex-wrap gap-1.5">
                                    {data.selectedInvestigations.map((inv: string) => (
                                        <span key={inv} className="bg-purple-50 text-purple-700 text-[9px] font-black px-2 py-0.5 rounded border border-purple-100 uppercase tracking-tighter">
                                            {inv}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                );
            default:
                return (
                    <div className="bg-slate-50 p-2 rounded-lg text-[10px] font-mono overflow-auto border border-slate-100">
                        {typeof data === 'string' ? data : JSON.stringify(data, null, 2)}
                    </div>
                );
        }
    };

    const getIcon = () => {
        switch (historyDrawerType) {
            case 'clinical':
            case 'medical': return <Activity size={20} className="text-emerald-500" />;
            case 'vitals': return <Activity size={20} className="text-blue-500" />;
            case 'reports': return <FileText size={20} className="text-indigo-500" />;
            case 'diagnosis': return <ClipboardList size={20} className="text-purple-500" />;
            default: return <FileText size={20} className="text-slate-500" />;
        }
    };

    return (
        <div className="fixed inset-0 z-[60] overflow-hidden flex justify-end">
            <div 
                className={`absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity duration-300 ${isHistoryDrawerOpen ? 'opacity-100' : 'opacity-0'}`} 
                onClick={onClose} 
            />
            
            <div 
                className={`relative w-full max-w-md bg-white h-full shadow-2xl transform transition-transform duration-300 ease-out flex flex-col ${isHistoryDrawerOpen ? 'translate-x-0' : 'translate-x-full'}`}
            >
                {/* Header */}
                <div className="px-4 py-3 border-b border-borderColor flex items-center justify-between bg-white sticky top-0 z-10">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-slate-50 rounded-xl">
                            {getIcon()}
                        </div>
                        <div>
                            <h3 className="text-base font-black text-type-heading capitalize leading-none mb-0.5">
                                {historyDrawerType} History
                            </h3>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Longitudinal Records</p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-2 hover:bg-slate-50 rounded-full transition-colors group"
                    >
                        <X size={20} className="text-slate-400 group-hover:text-slate-900" />
                    </button>
                </div>

                {/* Filter Bar */}
                <div className="px-4 py-2 bg-slate-50/50 border-b border-borderColor">
                    <div className="relative">
                        <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input 
                            type="text" 
                            placeholder="Search in history..." 
                            className="w-full pl-9 pr-4 py-1.5 border border-borderColor rounded-xl text-xs bg-white focus:outline-none focus:ring-4 focus:ring-primary-base/10"
                        />
                    </div>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto px-4 py-4 scroll-smooth bg-white">
                    {!hasPatientId ? (
                        <div className="flex flex-col items-center justify-center h-full text-center space-y-4 py-20 px-6">
                            <div className="p-6 bg-amber-50 rounded-full border border-dashed border-amber-200">
                                <Search size={48} className="text-amber-300" />
                            </div>
                            <div>
                                <p className="font-black text-type-heading">Unsynced Patient Record</p>
                                <p className="text-xs text-type-body mt-2">To view history, you must first proceed to the Overview tab or select an existing patient from the directory.</p>
                            </div>
                        </div>
                    ) : sortedDates.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center space-y-4 py-20">
                            <div className="p-6 bg-slate-50 rounded-full border border-dashed border-slate-200">
                                <Clock size={48} className="text-slate-300" />
                            </div>
                            <div>
                                <p className="font-black text-type-heading">No History Found</p>
                                <p className="text-xs text-type-body px-10 mt-2">Historical records will appear here after the patient's first visit is archived by the doctor.</p>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {sortedDates.map(date => (
                                <div key={date} className="relative">
                                    {/* Date Header */}
                                    <div className="flex items-center gap-2 mb-4 sticky top-0 bg-white py-1 z-10">
                                        <div className="p-1 bg-primary-base rounded text-white shadow-lg shadow-primary-base/20">
                                            <Calendar size={12} />
                                        </div>
                                        <h4 className="font-black text-type-heading text-[11px] uppercase tracking-widest">{date}</h4>
                                        <div className="flex-1 h-px bg-slate-100" />
                                    </div>

                                    {/* Items for this date */}
                                    <div className="space-y-4 ml-3 border-l-2 border-slate-100">
                                        {groupedHistory[date].map((item: any, idx: number) => (
                                            <div key={idx} className="relative pl-6">
                                                {/* Timeline Bullet */}
                                                <div className="absolute left-[-6px] top-6 w-2.5 h-2.5 rounded-full bg-white border-2 border-primary-base" />
                                                
                                                <div className="glass-card overflow-hidden hover:border-primary-base/30 transition-colors">
                                                    <div className="px-3 py-1.5 bg-slate-50/50 border-b border-borderColor/50 flex justify-between items-center">
                                                        <span className="text-[9px] font-black text-primary-base tracking-tighter flex items-center gap-1 uppercase">
                                                            <Clock size={10} />
                                                            {new Date(item.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                        <span className="text-[9px] font-black text-slate-400 bg-white px-2 py-0.5 rounded-full border border-slate-100 uppercase tracking-tighter">
                                                            Visit #{historyData.length - (historyData.indexOf(item))}
                                                        </span>
                                                    </div>
                                                    <div className="p-3 leading-relaxed">
                                                        {renderContent(item)}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-borderColor bg-slate-50/50">
                    <p className="text-[9px] text-center text-slate-400 font-black uppercase tracking-tighter italic">
                        Longitudinal Clinical Artifacts · HIPAA Compliant View
                    </p>
                </div>
            </div>
        </div>
    );
};

export default HistoryDrawer;
