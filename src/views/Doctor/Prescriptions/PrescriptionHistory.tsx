import { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { patientService } from '../../../services/api/patientService';
import { generatePrescriptionHTML } from '../../../utils/PrescriptionPdfTemplate';
import { generateAndSharePrescription } from '../../../utils/PdfGenerator';
import { 
    ArrowLeft, 
    Calendar, 
    Clock, 
    Download, 
    Eye, 
    FileText, 
    Loader2, 
    Pill, 
    RefreshCcw, 
    Search, 
    Share2, 
    User,
    AlertCircle
} from 'lucide-react';
import toast from 'react-hot-toast';

export const PrescriptionHistory = () => {
    const { patientId } = useParams<{ patientId: string }>();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [patient, setPatient] = useState<any>(null);
    const [prescriptions, setPrescriptions] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [generatingId, setGeneratingId] = useState<string | null>(null);

    const loadData = useCallback(async () => {
        if (!patientId) return;
        
        setError(null);
        try {
            const [patientData, prescriptionData] = await Promise.all([
                patientService.getPatientById(patientId),
                patientService.getPatientPrescriptions(patientId)
            ]);

            setPatient(patientData);
            
            // Sort prescriptions newest first
            const sorted = prescriptionData.sort((a: any, b: any) => {
                const dateA = a.prescriptionDate || a.visitDate || a.createdAt;
                const dateB = b.prescriptionDate || b.visitDate || b.createdAt;
                return new Date(dateB).getTime() - new Date(dateA).getTime();
            });

            setPrescriptions(sorted);
        } catch (err: any) {
            console.error('Failed to load prescription history:', err);
            setError('Failed to load records. Connection lost.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [patientId]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleRefresh = () => {
        setRefreshing(true);
        loadData();
    };

    const handleGeneratePdf = async (record: any, mode: 'share' | 'download' | 'view') => {
        if (generatingId) return;
        setGeneratingId(record.prescriptionId || 'active');
        
        try {
            const html = generatePrescriptionHTML({
                patientName: record.patientName || patient?.name || 'Unknown Patient',
                age: record.age || patient?.age || 'N/A',
                gender: record.sex || record.gender || patient?.sex || patient?.gender || 'N/A',
                patientId: record.patientId,
                address: record.address || patient?.address,
                vitals: {
                    bp: record.bp,
                    weight: record.weight,
                    height: record.height,
                    temp: record.temperature
                },
                diagnosis: record.diagnosis || undefined,
                advisedInvestigations: record.advisedInvestigations || undefined,
                additionalNotes: record.additionalNotes || undefined,
                medications: record.medications || [],
                prescriptionDate: record.prescriptionDate || record.visitDate || undefined
            });

            await generateAndSharePrescription(html, mode);
        } catch (err) {
            console.error('PDF Generation Error:', err);
            toast.error('Failed to generate PDF');
        } finally {
            setGeneratingId(null);
        }
    };

    const renderMedicationSummary = (meds: any[]) => {
        if (!meds || meds.length === 0) return 'No medications prescribed';
        const names = meds.map(m => m.name).filter(Boolean);
        if (names.length <= 3) return names.join(', ');
        return `${names.slice(0, 3).join(', ')} +${names.length - 3} more`;
    };

    // Grouping prescriptions by format for the UI
    const filteredPrescriptions = useMemo(() => {
        const term = searchTerm.toLowerCase().trim();
        if (!term) return prescriptions;
        
        return prescriptions.filter(p => {
            const dateStr = new Date(p.prescriptionDate || p.visitDate || p.createdAt).toLocaleDateString();
            const doctorMatch = (p.doctorName || '').toLowerCase().includes(term);
            const medsMatch = (p.medications || []).some((m: any) => (m.name || '').toLowerCase().includes(term));
            const diagnosisMatch = (p.diagnosis || '').toLowerCase().includes(term);
            return dateStr.includes(term) || doctorMatch || medsMatch || diagnosisMatch;
        });
    }, [prescriptions, searchTerm]);

    const groupedHistory = useMemo(() => {
        const groups = new Map<string, any[]>();
        filteredPrescriptions.forEach(record => {
            const iso = record.prescriptionDate || record.visitDate || record.createdAt;
            const dateStr = new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
            if (!groups.has(dateStr)) groups.set(dateStr, []);
            groups.get(dateStr)!.push(record);
        });
        return Array.from(groups.entries());
    }, [filteredPrescriptions]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
                <p className="text-gray-500 font-medium">Loading prescription history...</p>
            </div>
        );
    }

    return (
        <div className="p-4 lg:p-8 max-w-5xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <button 
                        onClick={() => navigate(-1)}
                        className="p-2 hover:bg-indigo-50 text-indigo-600 rounded-full transition-colors"
                    >
                        <ArrowLeft className="w-6 h-6" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-black text-gray-900 tracking-tight">Prescription History</h1>
                        <p className="text-gray-500 flex items-center gap-1.5 font-medium">
                            <User className="w-4 h-4 text-indigo-400" />
                            {patient?.name} • {patient?.age}y • {patient?.sex || patient?.gender}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button 
                        onClick={handleRefresh}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 transition-colors shadow-sm text-sm font-bold ${refreshing ? 'text-indigo-500' : 'text-gray-700'}`}
                    >
                        <RefreshCcw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>
                </div>
            </div>

            {/* Error State */}
            {error && (
                <div className="bg-red-50 border border-red-100 p-4 rounded-xl flex items-center gap-3 text-red-800">
                    <AlertCircle className="w-5 h-5 shrink-0" />
                    <p className="font-bold text-sm">{error}</p>
                    <button onClick={handleRefresh} className="ml-auto underline font-black text-xs">Retry</button>
                </div>
            )}

            {/* Search Bar */}
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-200 flex items-center gap-3">
                <Search className="w-5 h-5 text-gray-400 shrink-0" />
                <input 
                    type="text" 
                    placeholder="Search by date, diagnosis, or medication..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="flex-1 outline-none text-gray-700 bg-transparent font-medium placeholder:text-gray-300"
                />
            </div>

            {/* History Feed */}
            {groupedHistory.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-dashed border-gray-200 space-y-4">
                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center border border-gray-100">
                        <FileText className="w-8 h-8 text-gray-300" />
                    </div>
                    <div className="text-center">
                        <h3 className="font-bold text-gray-900 text-lg">No Records Found</h3>
                        <p className="text-gray-500 font-medium text-sm mt-1">This patient has no historical prescriptions matching your search.</p>
                    </div>
                </div>
            ) : (
                <div className="space-y-10">
                    {groupedHistory.map(([dateStr, records]) => (
                        <div key={dateStr}>
                            <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-5 flex items-center gap-3 px-1">
                                <Calendar className="w-4 h-4 text-indigo-400" /> {dateStr}
                            </h3>
                            
                            <div className="grid grid-cols-1 gap-4">
                                {records.map((record, index) => {
                                    const timeObj = new Date(record.prescriptionDate || record.visitDate || record.createdAt);
                                    const timeStr = timeObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
                                    const isGenerating = generatingId === (record.prescriptionId || 'active');

                                    return (
                                        <div 
                                            key={record.prescriptionId || index} 
                                            className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all p-5 flex flex-col md:flex-row md:items-center justify-between gap-6"
                                        >
                                            <div className="space-y-3 flex-1">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex items-center gap-1.5 text-[10px] font-black text-gray-500 bg-gray-50 px-2.5 py-1 rounded-lg border border-gray-200 uppercase tracking-tighter">
                                                        <Clock className="w-3 h-3" /> {timeStr}
                                                    </div>
                                                    <span className="text-sm font-bold text-indigo-600">
                                                        {record.doctorName || 'Dr. Dipak Gawli'}
                                                    </span>
                                                </div>

                                                <div className="flex items-start gap-4">
                                                    <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center border border-emerald-100 shrink-0">
                                                        <Pill className="w-5 h-5 text-emerald-600" />
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-0.5">Medications</p>
                                                        <p className="text-gray-900 font-bold leading-tight">
                                                            {renderMedicationSummary(record.medications)}
                                                        </p>
                                                        {record.diagnosis && (
                                                            <p className="text-xs text-indigo-500 font-medium mt-1 italic">
                                                                Diagnosis: {record.diagnosis}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2 border-t md:border-t-0 md:pl-6 border-gray-50 pt-4 md:pt-0">
                                                <button 
                                                    disabled={!!generatingId}
                                                    onClick={() => handleGeneratePdf(record, 'view')}
                                                    className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-50 hover:bg-emerald-50 text-emerald-700 rounded-xl font-bold text-xs transition-colors border border-gray-100 hover:border-emerald-100 disabled:opacity-50"
                                                >
                                                    {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
                                                    View
                                                </button>
                                                <button 
                                                    disabled={!!generatingId}
                                                    onClick={() => handleGeneratePdf(record, 'download')}
                                                    className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-xl font-bold text-xs transition-colors border border-gray-100 disabled:opacity-50"
                                                >
                                                    {isGenerating ? <Loader2 className="w-4 h-4 animate-spin text-indigo-400" /> : <Download className="w-4 h-4 text-indigo-600" />}
                                                    Download
                                                </button>
                                                <button 
                                                    disabled={!!generatingId}
                                                    onClick={() => handleGeneratePdf(record, 'share')}
                                                    className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-xs hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-100 disabled:opacity-50"
                                                >
                                                    {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4" />}
                                                    Share
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
