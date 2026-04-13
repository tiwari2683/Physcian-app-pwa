import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { patientService } from '../../../services/api/patientService';
import { generatePrescriptionHTML } from '../../../utils/PrescriptionPdfTemplate';
import { generateAndSharePrescription } from '../../../utils/PdfGenerator';
import { ArrowLeft, Share2, Download, AlertCircle, RefreshCw, FileText, Calendar, Clock, Pill, User, Eye, Phone, MapPin, Activity, Stethoscope, CheckCircle, Image as ImageIcon, X } from 'lucide-react';
import toast from 'react-hot-toast';

export const PatientProfileScreen = () => {
    const { patientId } = useParams<{ patientId: string }>();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [patientInfo, setPatientInfo] = useState<any>(null);
    const [activeVisit, setActiveVisit] = useState<any>(null);
    const [prescriptions, setPrescriptions] = useState<any[]>([]);

    const [generatingId, setGeneratingId] = useState<string | null>(null);
    const [previewFile, setPreviewFile] = useState<any>(null);

    const fetchProfileData = async () => {
        if (!patientId) return;
        setLoading(true);
        setError(null);
        try {
            // Fetch concurrently
            const [patientBaseData, activeVisitData, prescriptionHistory] = await Promise.all([
                patientService.getPatientById(patientId).catch(() => null),
                patientService.getActiveVisit(patientId).catch(() => null),
                patientService.getAllPatientVisits(patientId).catch(() => [])
            ]);

            if (patientBaseData) {
                setPatientInfo(patientBaseData);
            }

            if (activeVisitData) {
                setActiveVisit(activeVisitData);
            }

            // Sort prescriptions newest first
            const sorted = prescriptionHistory.sort((a: any, b: any) => {
                const dateA = a.prescriptionDate || a.visitDate || a.createdAt;
                const dateB = b.prescriptionDate || b.visitDate || b.createdAt;
                return new Date(dateB).getTime() - new Date(dateA).getTime();
            });

            setPrescriptions(sorted);
        } catch (err: any) {
            console.error('Failed to load patient profile:', err);
            setError('Failed to load patient profile. connection lost.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProfileData();
    }, [patientId]);

    // Grouping prescriptions by Date
    const groupedPrescriptions = useMemo(() => {
        const groups = new Map<string, any[]>();
        prescriptions.forEach(record => {
            const iso = record.prescriptionDate || record.visitDate || record.createdAt;
            if (!iso) return;
            const dateObj = new Date(iso);
            const dateStr = dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
            if (!groups.has(dateStr)) groups.set(dateStr, []);
            groups.get(dateStr)!.push(record);
        });
        return Array.from(groups.entries());
    }, [prescriptions]);

    const handleGeneratePdf = async (record: any, mode: 'share' | 'download' | 'view') => {
        if (generatingId) return;
        setGeneratingId(record.prescriptionId || 'active');

        try {
            const html = generatePrescriptionHTML({
                patientName: record.patientName || patientInfo?.name || 'Unknown Patient',
                age: record.age || patientInfo?.age || 'N/A',
                gender: record.gender || patientInfo?.sex || patientInfo?.gender || 'N/A',
                patientId: record.patientId,
                address: record.address || patientInfo?.address,
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
        const topNames = meds.slice(0, 3).map(m => m.name).filter(Boolean);
        const remainder = meds.length - 3;

        let display = topNames.join(', ');
        if (remainder > 0) {
            display += ` +${remainder} more`;
        }
        return display;
    };

    // Calculate aggregated patient object specifically for the view
    // (Active visit overrides base patient if data exists)
    const displayPatient = patientInfo || (prescriptions.length > 0 ? prescriptions[0] : null);
    const registeredDate = displayPatient?.createdAt ? new Date(displayPatient.createdAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A';

    return (
        <div className="flex-1 bg-[#F8FAFC] min-h-screen pb-20">
            {/* Main Content Area */}
            <div className="p-4 md:p-6 max-w-4xl mx-auto flex flex-col gap-8">

                {/* Back Button */}
                <div>
                    <button
                        onClick={() => navigate('/doctor/patients')}
                        className="flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors font-bold text-sm pl-1"
                    >
                        <ArrowLeft className="w-4 h-4" /> Back to Patient Directory
                    </button>
                </div>

                {loading ? (
                    <div className="space-y-6">
                        <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 h-40 animate-pulse"></div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 h-32 animate-pulse"></div>
                            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 h-32 animate-pulse"></div>
                        </div>
                    </div>
                ) : error ? (
                    <div className="mt-6 bg-red-50 border border-red-100 rounded-2xl p-6 flex flex-col items-center justify-center text-center">
                        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
                        <h3 className="text-lg font-bold text-red-900 mb-2">Connection Error</h3>
                        <p className="text-red-600 max-w-md mx-auto font-medium mb-6">{error}</p>
                        <button
                            onClick={fetchProfileData}
                            className="flex items-center gap-2 bg-red-100 hover:bg-red-200 text-red-800 px-6 py-2.5 rounded-xl font-bold transition-colors"
                        >
                            <RefreshCw className="w-4 h-4" /> Try Again
                        </button>
                    </div>
                ) : (
                    <>
                        {/* Premium Patient Profile Card */}
                        <div className="bg-gradient-to-br from-indigo-600 to-blue-700 rounded-3xl p-6 shadow-[0_8px_30px_rgb(79,70,229,0.2)] relative overflow-hidden">
                            <div className="absolute top-0 right-0 -mt-8 -mr-8 w-40 h-40 bg-white/10 rounded-full blur-2xl"></div>
                            <div className="absolute bottom-0 left-0 -mb-8 -ml-8 w-24 h-24 bg-white/10 rounded-full blur-xl"></div>

                            <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                                <div className="flex items-center gap-4 border-b border-indigo-400/30 pb-4 md:border-b-0 md:pb-0 w-full md:w-auto">
                                    <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center border border-white/20 shadow-inner shrink-0">
                                        <span className="text-2xl font-black text-white">
                                            {displayPatient?.name ? displayPatient.name.substring(0, 1).toUpperCase() : 'P'}
                                        </span>
                                    </div>
                                    <div>
                                        <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white mb-1">
                                            {displayPatient?.name || 'Unknown Patient'}
                                        </h1>
                                        <div className="flex items-center flex-wrap gap-2 text-sm text-indigo-100 font-medium">
                                            <span className="font-mono text-xs opacity-90 uppercase bg-indigo-900/40 px-2 py-0.5 rounded-md tracking-wider">
                                                ID: {patientId?.substring(0, 8)}
                                            </span>
                                            <span className="w-1 h-1 bg-indigo-300 rounded-full hidden sm:block"></span>
                                            <span>{displayPatient?.age || 'N/A'}y</span>
                                            <span className="w-1 h-1 bg-indigo-300 rounded-full hidden sm:block"></span>
                                            <span>{displayPatient?.sex || displayPatient?.gender || 'N/A'}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-2 w-full md:w-auto">
                                    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/10 flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                                            <CheckCircle className="w-4 h-4 text-emerald-300" />
                                        </div>
                                        <div>
                                            <p className="text-xs text-indigo-100 font-medium tracking-wide uppercase">Patient Status</p>
                                            <p className="text-sm font-bold text-white tracking-wide">
                                                {activeVisit ? 'Currently in Clinic (Active)' : 'Registered'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Two Column Layout for Profile Info */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                            {/* Left Column: Contact & Base Stats */}
                            <div className="space-y-6 lg:col-span-1">
                                {/* Contact Info */}
                                <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-4">
                                    <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-2">Contact Details</h3>

                                    <div className="flex items-start gap-4">
                                        <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center shrink-0 border border-blue-100">
                                            <Phone className="w-4 h-4 text-blue-600" />
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-400 font-bold mb-0.5">Phone Number</p>
                                            <p className="text-sm font-bold text-gray-900">{displayPatient?.mobile || 'N/A'}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-4">
                                        <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center shrink-0 border border-blue-100">
                                            <MapPin className="w-4 h-4 text-blue-600" />
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-400 font-bold mb-0.5">Address</p>
                                            <p className="text-sm font-bold text-gray-900 line-clamp-3">{displayPatient?.address || 'N/A'}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-4">
                                        <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center shrink-0 border border-blue-100">
                                            <Calendar className="w-4 h-4 text-blue-600" />
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-400 font-bold mb-0.5">Registered On</p>
                                            <p className="text-sm font-bold text-gray-900">{registeredDate}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Right Column: Clinical History & Notes */}
                            <div className="space-y-6 lg:col-span-2">
                                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                                    <div className="flex items-center gap-2 mb-6">
                                        <Activity className="w-5 h-5 text-indigo-600" />
                                        <h3 className="text-lg font-black text-gray-900">Clinical Background</h3>
                                    </div>

                                    <div className="space-y-5">
                                        <div>
                                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Most Recent Diagnosis</p>
                                            <p className="text-gray-900 font-medium leading-relaxed bg-gray-50 p-3 rounded-lg border border-gray-100">
                                                {activeVisit?.diagnosis || (prescriptions.find(p => p.diagnosis)?.diagnosis) || 'No current diagnosis recorded. Focus on historical records below.'}
                                            </p>
                                        </div>

                                        <div className="pt-3 border-t border-gray-100">
                                            <div>
                                                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1 flex items-center gap-1.5"><Stethoscope className="w-3.5 h-3.5" /> Complaint / Medical History</p>
                                                <p className="text-gray-700 text-sm font-medium leading-relaxed">
                                                    {activeVisit?.medicalHistory || (prescriptions.find(p => p.medicalHistory)?.medicalHistory) || 'None reported.'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Recent Prescriptions & Documents */}
                        <div className="mt-4">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-black text-gray-900 tracking-tight">Prescriptions & Visit History</h2>
                                <span className="bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full text-xs font-bold border border-indigo-100">{prescriptions.length} Records</span>
                            </div>

                            {prescriptions.length === 0 ? (
                                <div className="bg-white rounded-2xl p-12 text-center border border-dashed border-gray-200">
                                    <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-gray-100">
                                        <FileText className="w-8 h-8 text-gray-300" />
                                    </div>
                                    <h3 className="text-lg font-bold text-gray-900 mb-2">No Visit History</h3>
                                    <p className="text-gray-500 font-medium">This patient currently has no generated prescriptions on record.</p>
                                </div>
                            ) : (
                                <div className="space-y-8">
                                    {groupedPrescriptions.map(([dateStr, records]) => (
                                        <div key={dateStr}>
                                            <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                                <Calendar className="w-4 h-4" /> {dateStr}
                                            </h3>

                                            <div className="space-y-4">
                                                {records.map((record, index) => {
                                                    const timeObj = new Date(record.prescriptionDate || record.visitDate || record.createdAt);
                                                    const timeStr = timeObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

                                                    const isGenerating = generatingId === (record.prescriptionId || 'active');

                                                    return (
                                                        <div key={record.prescriptionId || index} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 transition-all hover:shadow-md">
                                                            <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-6">

                                                                {/* Left Summary Info */}
                                                                <div className="flex-1 space-y-3">
                                                                    <div className="flex items-center gap-3">
                                                                        <div className="flex items-center gap-1.5 text-xs font-bold text-gray-600 bg-gray-50 px-2.5 py-1 rounded-lg border border-gray-200">
                                                                            <Clock className="w-3.5 h-3.5" /> {timeStr}
                                                                        </div>
                                                                        <span className="text-sm font-bold text-indigo-600 flex items-center gap-1.5">
                                                                            <User className="w-3 h-3" /> {record.doctorName || 'Dr. Dipak Gawli'}
                                                                        </span>
                                                                    </div>

                                                                    <div className="flex items-start gap-3">
                                                                        <div className="mt-1 w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center shrink-0 border border-emerald-100">
                                                                            <Pill className="w-4 h-4 text-emerald-600" />
                                                                        </div>
                                                                        <div>
                                                                            <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-0.5">Medications Prescribed</p>
                                                                            <p className="text-gray-900 font-bold leading-snug">
                                                                                {renderMedicationSummary(record.medications)}
                                                                            </p>
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                {/* Action Buttons */}
                                                                <div className="flex items-center flex-wrap gap-2 shrink-0 pt-2 xl:pt-0">
                                                                    <button
                                                                        disabled={!!generatingId}
                                                                        onClick={() => handleGeneratePdf(record, 'view')}
                                                                        className="flex items-center justify-center gap-1.5 bg-white border border-gray-200 text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2.5 rounded-xl font-bold transition-all shadow-sm flex-1 md:flex-none text-sm"
                                                                    >
                                                                        {isGenerating ? <RefreshCw className="w-4 h-4 animate-spin text-emerald-500" /> : <Eye className="w-4 h-4 text-emerald-600" />}
                                                                        Preview PDF
                                                                    </button>

                                                                    <button
                                                                        disabled={!!generatingId}
                                                                        onClick={() => handleGeneratePdf(record, 'download')}
                                                                        className="flex items-center justify-center gap-1.5 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2.5 rounded-xl font-bold transition-all shadow-sm flex-1 md:flex-none text-sm"
                                                                    >
                                                                        {isGenerating ? <RefreshCw className="w-4 h-4 animate-spin text-gray-500" /> : <Download className="w-4 h-4 text-gray-500" />}
                                                                        Save Offline
                                                                    </button>

                                                                    <button
                                                                        disabled={!!generatingId}
                                                                        onClick={() => handleGeneratePdf(record, 'share')}
                                                                        className="flex items-center justify-center gap-1.5 bg-indigo-50 border border-indigo-100 text-indigo-700 hover:bg-indigo-600 hover:text-white hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2.5 rounded-xl font-bold transition-all shadow-sm flex-1 md:flex-none text-sm"
                                                                    >
                                                                        {isGenerating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4" />}
                                                                        Share PDF
                                                                    </button>
                                                                </div>

                                                            </div>

                                                            {/* Expanded Clinical Data for this Visit */}
                                                            <div className="mt-5 pt-5 border-t border-gray-100 grid grid-cols-1 md:grid-cols-2 gap-6">
                                                                <div className="space-y-4">
                                                                    {record.diagnosis && (
                                                                        <div>
                                                                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1 shadow-sm">Diagnosis</p>
                                                                            <p className="text-sm font-medium text-gray-800">{record.diagnosis}</p>
                                                                        </div>
                                                                    )}
                                                                    {record.medicalHistory && (
                                                                        <div>
                                                                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1 shadow-sm">Complaint / History</p>
                                                                            <p className="text-sm font-medium text-gray-800">{record.medicalHistory}</p>
                                                                        </div>
                                                                    )}
                                                                    {record.advisedInvestigations && (
                                                                        <div>
                                                                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1 shadow-sm">Advised Investigations</p>
                                                                            <p className="text-sm font-medium text-gray-800">{record.advisedInvestigations}</p>
                                                                        </div>
                                                                    )}
                                                                </div>

                                                                <div className="space-y-4">
                                                                    {/* Report Files (If any exist in the visit) */}
                                                                    {record.reportFiles && record.reportFiles.length > 0 && (
                                                                        <div>
                                                                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                                                                                <FileText className="w-3.5 h-3.5" /> Attached Reports
                                                                            </p>
                                                                            <div className="space-y-2">
                                                                                {record.reportFiles.map((file: any, fidx: number) => (
                                                                                    <div key={fidx} className="flex items-center justify-between bg-gray-50 p-2.5 rounded-xl border border-gray-200">
                                                                                        <div className="flex items-center gap-2.5 overflow-hidden">
                                                                                            <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shrink-0 border border-gray-200 shadow-sm">
                                                                                                {file.fileType?.includes('image') ? <ImageIcon className="w-4 h-4 text-blue-500" /> : <FileText className="w-4 h-4 text-gray-500" />}
                                                                                            </div>
                                                                                            <div className="overflow-hidden">
                                                                                                <p className="text-xs font-bold text-gray-800 truncate">{file.fileName || 'Document'}</p>
                                                                                                <p className="text-[10px] text-gray-500">{file.fileType || 'Report'}</p>
                                                                                            </div>
                                                                                        </div>
                                                                                        <button
                                                                                            onClick={() => {
                                                                                                if (file.url || file.signedUrl) {
                                                                                                    setPreviewFile(file);
                                                                                                } else {
                                                                                                    toast.error('File URL is currently unavailable or expired.');
                                                                                                }
                                                                                            }}
                                                                                            className="shrink-0 p-1.5 hover:bg-gray-200 rounded-lg transition-colors"
                                                                                        >
                                                                                            <Eye className="w-4 h-4 text-gray-600" />
                                                                                        </button>
                                                                                    </div>
                                                                                ))}
                                                                            </div>
                                                                        </div>
                                                                    )}

                                                                    {record.reportNotes && (
                                                                        <div>
                                                                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1 shadow-sm">Report Notes</p>
                                                                            <p className="text-sm font-medium text-gray-800 bg-yellow-50 p-2 rounded-lg border border-yellow-100 italic">{record.reportNotes}</p>
                                                                        </div>
                                                                    )}
                                                                </div>
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
                    </>
                )}
            </div>

            {/* Premium Glassmorphic File Viewer Modal */}
            {previewFile && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/80 backdrop-blur-md p-4">
                    <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                                    {previewFile.fileType?.includes('image') ? <ImageIcon className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900 text-lg">{previewFile.fileName || 'Report View'}</h3>
                                    <p className="text-sm text-gray-500 font-medium">{previewFile.fileType}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => window.open(previewFile.url || previewFile.signedUrl, '_blank')}
                                    className="px-4 py-2 bg-gray-900 text-white text-sm font-bold rounded-xl hover:bg-gray-800 transition-colors hidden sm:block"
                                >
                                    Open Externally
                                </button>
                                <button
                                    onClick={() => setPreviewFile(null)}
                                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                                >
                                    <X className="w-6 h-6" />
                                </button>
                            </div>
                        </div>

                        {/* Viewer Body */}
                        <div className="flex-1 overflow-auto bg-gray-100/50 p-6 flex items-center justify-center relative min-h-[400px]">
                            {previewFile.fileType?.includes('image') ? (
                                <img
                                    src={previewFile.url || previewFile.signedUrl}
                                    alt={previewFile.fileName}
                                    className="max-w-full max-h-[70vh] object-contain rounded-xl shadow-sm border border-gray-200/60"
                                />
                            ) : (
                                <iframe
                                    src={previewFile.url || previewFile.signedUrl}
                                    className="w-full h-[70vh] rounded-xl shadow-sm border border-gray-200/60 bg-white"
                                    title={previewFile.fileName}
                                />
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
