import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
    ArrowLeft, 
    Calendar, 
    Download, 
    FileText, 
    Loader2, 
    RefreshCcw,
    User,
    Search
} from 'lucide-react';
import { fitnessCertificateService } from '../../services/api/fitnessCertificateService';
import { patientService } from '../../services/api/patientService';
import type { FitnessCertificateFormData } from '../../models/FitnessCertificateTypes';
import { GenerateCertificatePdfModal } from './GenerateCertificatePdfModal';

export const FitnessCertificateHistory = () => {
    const { patientId } = useParams<{ patientId: string }>();
    const navigate = useNavigate();

    const [patient, setPatient] = useState<any>(null);
    const [history, setHistory] = useState<FitnessCertificateFormData[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    // PDF Modal State
    const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
    const [selectedCert, setSelectedCert] = useState<Partial<FitnessCertificateFormData>>({});

    const loadData = useCallback(async () => {
        if (!patientId) return;
        
        try {
            const [patientData, historyData] = await Promise.all([
                patientService.getPatientById(patientId),
                fitnessCertificateService.getFitnessCertificateHistory(patientId)
            ]);

            setPatient(patientData);
            setHistory(historyData.sort((a, b) => 
                new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
            ));
        } catch (error) {
            console.error("Failed to load history:", error);
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

    const handleDownloadPdf = (cert: FitnessCertificateFormData) => {
        setSelectedCert(cert);
        setIsPdfModalOpen(true);
    };

    const formatDate = (isoString?: string) => {
        if (!isoString) return "N/A";
        return new Date(isoString).toLocaleDateString("en-IN", {
            day: 'numeric', month: 'short', year: 'numeric'
        });
    };

    const getOpinionLabel = (type: string | null | undefined) => {
        switch (type) {
            case 'surgery_fitness': return 'Surgery Fitness';
            case 'medication_modification': return 'Medication Modification';
            case 'fitness_reserved': return 'Fitness Reserved';
            default: return 'Medical Opinion';
        }
    };

    // Section 7.2 — Search by ID slice, opinion type label, or date
    const filteredHistory = history.filter(item => {
        const term = searchTerm.toLowerCase();
        const idMatch = item.certificateId?.slice(-6).toLowerCase().includes(term) ?? false;
        const typeMatch = getOpinionLabel(item.selectedOpinionType).toLowerCase().includes(term);
        const dateMatch = new Date(item.createdAt || '').toLocaleDateString('en-IN').includes(searchTerm);
        return idMatch || typeMatch || dateMatch;
    });

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
                <p className="text-gray-500 font-medium">Loading certificate history...</p>
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
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <ArrowLeft className="w-6 h-6 text-gray-700" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Certificate History</h1>
                        <p className="text-gray-500 flex items-center gap-1.5">
                            <User className="w-4 h-4" />
                            {patient?.name} • {patient?.age}y • {patient?.sex}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button 
                        onClick={handleRefresh}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 transition-colors shadow-sm text-sm font-semibold ${refreshing ? 'text-blue-500' : 'text-gray-700'}`}
                    >
                        <RefreshCcw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>
                    <button 
                        onClick={() => navigate(`/fitness-certificate/${patientId}`)}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all shadow-md shadow-blue-100 text-sm font-bold"
                    >
                        <FileText className="w-4 h-4" />
                        New Certificate
                    </button>
                </div>
            </div>

            {/* Search Bar */}
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-200 flex items-center gap-3">
                <Search className="w-5 h-5 text-gray-400 shrink-0" />
                <input 
                    type="text" 
                    placeholder="Search by ID, opinion type, or date..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="flex-1 outline-none text-gray-700 bg-transparent placeholder:text-gray-300"
                />
            </div>

            {/* History Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Section 7.3 — Empty state with CTA */}
                {filteredHistory.length === 0 ? (
                    <div className="col-span-full flex flex-col items-center justify-center py-24 bg-white rounded-2xl border-2 border-dashed border-gray-200 space-y-4">
                        <div className="p-5 bg-gray-50 rounded-full border border-gray-100">
                            <FileText className="w-12 h-12 text-gray-300" />
                        </div>
                        <div className="text-center">
                            <p className="font-bold text-gray-600 text-lg">No certificates found</p>
                            <p className="text-gray-400 text-sm mt-1">
                                {searchTerm
                                    ? `No results for "${searchTerm}"`
                                    : 'This patient has no fitness certificates yet'}
                            </p>
                        </div>
                        {!searchTerm && (
                            <button
                                onClick={() => navigate(`/fitness-certificate/${patientId}`)}
                                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-colors shadow-md shadow-blue-100"
                            >
                                <FileText className="w-4 h-4" />
                                Issue First Certificate
                            </button>
                        )}
                    </div>
                ) : (
                    filteredHistory.map((item) => (
                        <div key={item.certificateId} className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col">
                            <div className="p-5 flex-1 space-y-4">
                                <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-2 text-gray-500 text-sm font-medium">
                                        <Calendar className="w-4 h-4" />
                                        {formatDate(item.createdAt)}
                                    </div>
                                    <span className="px-2.5 py-1 bg-gray-100 text-gray-600 text-[10px] font-bold rounded uppercase tracking-wider font-mono">
                                        #{item.certificateId?.slice(-6)}
                                    </span>
                                </div>

                                <div className="space-y-1">
                                    <h3 className="text-lg font-bold text-blue-700 leading-tight">
                                        {getOpinionLabel(item.selectedOpinionType)}
                                    </h3>
                                    <p className="text-sm text-gray-500 font-medium">
                                        Issued by {item.doctorName || "Dr. Dipak Gawli"}
                                    </p>
                                </div>

                                {/* Section 7.4 — Opinion quote block */}
                                {item.opinion && (
                                    <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 mt-2">
                                        <p className="text-sm text-gray-600 line-clamp-2 italic">
                                            "{item.opinion}"
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Section 7.5 — Card footer action buttons */}
                            <div className="flex border-t border-gray-100 mt-auto">
                                <button 
                                    onClick={() => handleDownloadPdf(item)}
                                    className="flex-1 flex items-center justify-center gap-2 py-3.5 hover:bg-blue-50 transition-colors text-blue-600 font-bold text-sm group"
                                >
                                    <Download className="w-4 h-4 group-hover:translate-y-0.5 transition-transform" />
                                    PDF
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* PDF Generation Modal */}
            <GenerateCertificatePdfModal 
                isOpen={isPdfModalOpen}
                onClose={() => setIsPdfModalOpen(false)}
                formData={selectedCert}
            />
        </div>
    );
};
