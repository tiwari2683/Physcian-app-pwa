import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
    ArrowLeft,
    RefreshCcw,
    History as HistoryIcon,
    FileText,
    Loader2,
    CheckCircle2,
    Share2,
    Download,
    ChevronDown,
    Plus,
    Stethoscope,
    ClipboardList,
    Star,
} from 'lucide-react';
import { fitnessCertificateService } from '../../services/api/fitnessCertificateService';
import { patientService } from '../../services/api/patientService';
import type { FitnessCertificateFormData, OpinionType } from '../../models/FitnessCertificateTypes';
import { GenerateCertificatePdfModal } from './GenerateCertificatePdfModal';
import { generatePrescriptionFromMedications } from '../../utils/FitnessCertificateUtils';
import html2canvas from 'html2canvas';

const SURGERY_FITNESS_OPTIONS = [
    "Fit for surgery under general anaesthesia",
    "Fit for surgery under spinal anaesthesia",
    "Fit for surgery under local anaesthesia",
    "Fit for minor surgery only",
    "Not fit for surgery - cardiac evaluation needed",
    "Not fit for surgery - pulmonary evaluation needed",
    "Fitness reserved pending investigations",
];

const VALIDITY_OPTIONS = ["15 days", "30 days", "60 days", "90 days"];

export const FitnessCertificateForm = () => {
    const { patientId } = useParams<{ patientId: string }>();
    const navigate = useNavigate();
    const location = useLocation();
    const templateData = location.state?.templateData as FitnessCertificateFormData | undefined;

    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [patient, setPatient] = useState<any>(null);
    const [isSurgeryDropdownOpen, setIsSurgeryDropdownOpen] = useState(false);
    const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);

    const [dataLoadingStatus, setDataLoadingStatus] = useState({
        patient: false,
        diagnosis: false,
        investigations: false,
    });

    const [formData, setFormData] = useState<FitnessCertificateFormData>({
        patientName: '',
        patientAge: '',
        patientSex: '',
        patientId: patientId || '',
        opinion: '',
        selectedOpinionType: null,
        surgeryFitnessOption: '',
        medicationModificationText: '',
        fitnessReservedText: '',
        pastHistory: '',
        cardioRespiratorySymptoms: 'No significant cardio-respiratory symptoms',
        bloodPressure: '',
        heartRate: '',
        temperature: '',
        respiratoryRate: '',
        oxygenSaturation: '',
        ecgFindings: 'Normal ECG',
        echoFindings: 'Normal Echo study',
        cxrFindings: 'Clear lung fields',
        labValues: '',
        recommendations: '',
        followUpRequired: false,
        validityPeriod: '30 days',
        preOpEvaluationForm: '',
        referredForPreOp: '',
        cardioRespiratoryFunction: 'Normal',
        syE: 'Normal',
        ecgField: 'Normal',
        echoField: 'Normal',
        cxrField: 'Normal',
        latestPrescription: '',
        latestInvestigations: '',
    });

    const updateField = (field: keyof FitnessCertificateFormData, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const loadData = useCallback(async () => {
        if (!patientId) return;
        setIsLoading(true);
        setDataLoadingStatus({ patient: true, diagnosis: true, investigations: true });

        try {
            const [patientInfo, , invHistory, prescHistory] = await Promise.all([
                fitnessCertificateService.fetchPatientData(patientId).finally(() =>
                    setDataLoadingStatus(prev => ({ ...prev, patient: false }))
                ),
                fitnessCertificateService.fetchDiagnosisHistory(patientId).finally(() =>
                    setDataLoadingStatus(prev => ({ ...prev, diagnosis: false }))
                ),
                fitnessCertificateService.fetchInvestigationsHistory(patientId).finally(() =>
                    setDataLoadingStatus(prev => ({ ...prev, investigations: false }))
                ),
                fitnessCertificateService.fetchPrescriptionHistory(patientId).catch(() => [])
            ]);

            const patientData = patientInfo as any;
            setPatient(patientData);

            const pastMedicalHistory = Array.isArray(patientData?.medicalHistory)
                ? patientData.medicalHistory.join('\n')
                : (patientData?.medicalHistory || '');

            let latestPrescription = '';
            if (patientData?.generatedPrescription) {
                latestPrescription = patientData.generatedPrescription;
            } else if (prescHistory && prescHistory.length > 0) {
                const sorted = [...prescHistory].sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
                const latestMedications = sorted[0].medications;
                if (latestMedications && latestMedications.length > 0) {
                    latestPrescription = generatePrescriptionFromMedications(latestMedications);
                }
            } else if (patientData?.medications?.length > 0) {
                latestPrescription = generatePrescriptionFromMedications(patientData.medications);
            }

            const parseArrayData = (val: any): string => {
                if (!val) return '';
                if (Array.isArray(val)) return val.join('\n');
                if (typeof val === 'string') {
                    if (val.trim().startsWith('[') && val.trim().endsWith(']')) {
                        try {
                            const parsed = JSON.parse(val);
                            return Array.isArray(parsed) ? parsed.join('\n') : val;
                        } catch (e) {
                            return val;
                        }
                    }
                    return val;
                }
                return String(val);
            };

            let latestInvestigations = '';
            if (invHistory?.length > 0) {
                const sorted = [...invHistory].sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
                const latestInv = sorted[0] as any;
                const invVal = latestInv.investigations || latestInv.advisedInvestigations || '';
                const customInvVal = latestInv.customInvestigations ? `Other: ${latestInv.customInvestigations}` : '';
                const parts = [parseArrayData(invVal), customInvVal].filter(Boolean);
                latestInvestigations = parts.join('\n');
            } else if (patientData?.advisedInvestigations) {
                latestInvestigations = parseArrayData(patientData.advisedInvestigations);
            }

            setFormData(prev => ({
                ...prev,
                patientName: patientData?.name || prev.patientName,
                patientAge: patientData?.age?.toString() || prev.patientAge,
                patientSex: patientData?.sex || prev.patientSex,
                pastHistory: pastMedicalHistory,
                latestPrescription,
                latestInvestigations,
                medicationModificationText: latestPrescription,
                fitnessReservedText: latestInvestigations,
            }));

        } catch (error) {
            console.error('Error loading patient data:', error);
            alert('Some patient data could not be loaded. You can still create the certificate.');
        } finally {
            setIsLoading(false);
            setDataLoadingStatus({ patient: false, diagnosis: false, investigations: false });
        }
    }, [patientId]);

    // Template loading effect (Copy-to-New from History)
    useEffect(() => {
        if (templateData) {
            const { certificateId, createdAt, ...cleanTemplate } = templateData as any;
            setFormData(prev => ({
                ...prev,
                ...cleanTemplate,
                patientName: patient?.name || prev.patientName,
                patientAge: patient?.age?.toString() || prev.patientAge,
                patientSex: patient?.sex || prev.patientSex,
                patientId: patientId || prev.patientId,
            }));
            alert('Template Loaded: Certificate data copied from history. Review before generating.');
            window.history.replaceState({}, document.title);
            setIsLoading(false);
            // Still fetch patient name for header
            patientService.getPatientById(patientId!).then(setPatient).catch(() => {});
        } else {
            loadData();
        }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const handleOpinionTypeSelect = (type: OpinionType) => {
        updateField('selectedOpinionType', type);
        if (type === 'surgery_fitness') {
            setIsSurgeryDropdownOpen(true);
        } else {
            setIsSurgeryDropdownOpen(false);
        }
    };

    const handleSave = async (): Promise<boolean> => {
        if (!formData.selectedOpinionType) {
            alert('Validation Error: Please select an opinion type (Surgery Fitness, Medication Modification, or Fitness Reserved For)');
            return false;
        }
        if (!formData.opinion.trim()) {
            alert('Validation Error: Medical opinion text is required');
            return false;
        }

        setIsSaving(true);
        try {
            const certificateId = formData.certificateId || `CERT_${Date.now()}`;
            const dataToSave = {
                ...formData,
                certificateId,
                createdAt: new Date().toISOString(),
                doctorName: 'Dipak Gawli',
                type: 'fitness_certificate',
            };

            // Fire and forget
            fitnessCertificateService.saveFitnessCertificate(patientId!, dataToSave)
                .catch(err => console.error('Background save failed:', err));

            updateField('certificateId', certificateId);
            return true;
        } catch (error) {
            console.error('Save error:', error);
            alert('Error: Failed to save certificate data');
            return false;
        } finally {
            setIsSaving(false);
        }
    };

    const handleGeneratePdf = async () => {
        const saved = await handleSave();
        if (saved) setIsPdfModalOpen(true);
    };

    const handleSaveImage = async () => {
        const saved = await handleSave();
        if (!saved) return;

        const certElement = document.getElementById('certificate-preview-dom');
        if (!certElement) {
            alert("Could not find certificate preview element");
            return;
        }

        try {
            const originalTransform = certElement.style.transform;
            certElement.style.transform = 'none';

            const canvas = await html2canvas(certElement, {
                scale: 2,
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff'
            });

            certElement.style.transform = originalTransform;

            const image = canvas.toDataURL('image/png');
            const link = document.createElement('a');
            link.href = image;
            const safeName = (formData.patientName || 'Patient').replace(/[^a-z0-9]/gi, '_');
            link.download = `FitnessCertificate_${safeName}_${formData.certificateId || Date.now()}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (error) {
            console.error("Failed to generate image", error);
            alert('Failed to save image. Please use Generate & Share PDF instead.');
        }
    };

    return (
        <div className="relative flex flex-col min-h-full">

            {/* Loading Overlay */}
            {isLoading && (
                <div className="fixed inset-0 z-[9999] bg-black/50 flex items-center justify-center">
                    <div className="bg-white rounded-2xl shadow-2xl p-8 mx-4 flex flex-col items-center gap-5 min-w-[300px]">
                        <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
                        <div className="text-center">
                            <p className="text-gray-900 font-bold text-lg">Loading patient data...</p>
                            <p className="text-gray-400 text-sm mt-1">Please wait while we fetch records</p>
                        </div>
                        <div className="w-full space-y-3 bg-gray-50 rounded-xl p-4">
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-gray-600 font-medium">Patient Record</span>
                                <span className={dataLoadingStatus.patient ? 'text-blue-500 font-bold' : 'text-green-600 font-bold'}>
                                    {dataLoadingStatus.patient ? '⏳ Loading...' : '✅ Ready'}
                                </span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-gray-600 font-medium">Diagnosis History</span>
                                <span className={dataLoadingStatus.diagnosis ? 'text-blue-500 font-bold' : 'text-green-600 font-bold'}>
                                    {dataLoadingStatus.diagnosis ? '⏳ Loading...' : '✅ Ready'}
                                </span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-gray-600 font-medium">Investigations</span>
                                <span className={dataLoadingStatus.investigations ? 'text-blue-500 font-bold' : 'text-green-600 font-bold'}>
                                    {dataLoadingStatus.investigations ? '⏳ Loading...' : '✅ Ready'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Nav Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate(-1)} className="p-2 bg-white border border-gray-200 hover:bg-gray-50 rounded-full transition-colors shadow-sm">
                        <ArrowLeft className="w-6 h-6 text-gray-700" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Fitness Certificate</h1>
                        <p className="text-sm font-bold text-blue-600 uppercase tracking-wider">
                            {patient?.name || 'Loading...'}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={() => loadData()} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-xl transition-colors shadow-sm text-sm font-bold" title="Reload Data">
                        <RefreshCcw className="w-4 h-4" /> <span className="hidden sm:inline">Refresh</span>
                    </button>
                    <button onClick={() => navigate(`/fitness-certificate/${patientId}/history`)} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-xl transition-colors shadow-sm text-sm font-bold" title="View History">
                        <HistoryIcon className="w-4 h-4" /> <span className="hidden sm:inline">History</span>
                    </button>
                </div>
            </div>

            <div className="flex-1 max-w-7xl w-full mx-auto">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pb-32">

                    {/* =========================================================
                        LEFT COLUMN: LIVE CERTIFICATE PREVIEW
                    ========================================================= */}
                    <div className="space-y-4 order-2 lg:order-1">
                        <div className="sticky top-6">
                            <h2 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                                <FileText className="w-4 h-4" /> Live Certificate Preview
                            </h2>

                            <div id="certificate-preview-dom" className="bg-white rounded-2xl shadow-xl shadow-blue-100/50 border border-t-[12px] border-blue-600 p-8 text-[11px] leading-relaxed overflow-hidden">

                                {/* --- Letterhead --- */}
                                <div className="text-center border-b-2 border-blue-600 pb-5 mb-5">
                                    <h2 className="text-blue-600 font-bold text-lg uppercase tracking-widest mb-3">
                                        MEDICAL FITNESS CERTIFICATE
                                    </h2>
                                    <p className="font-bold text-gray-900 text-base">Dr. Dipak Gawli</p>
                                    <p className="text-gray-600 text-sm">MBBS, DNB General Medicine</p>
                                </div>

                                {/* --- Patient Information --- */}
                                <div className="mb-4">
                                    <h3 className="text-[10px] font-black text-blue-600 uppercase tracking-widest border-b border-gray-100 pb-1 mb-3">
                                        PATIENT INFORMATION
                                    </h3>
                                    <div className="space-y-1">
                                        <div className="flex gap-2">
                                            <span className="text-gray-500 font-bold w-16 shrink-0">Name:</span>
                                            <span className="text-gray-900 font-semibold">{formData.patientName || '—'}</span>
                                        </div>
                                        <div className="flex gap-2">
                                            <span className="text-gray-500 font-bold w-16 shrink-0">Age/Sex:</span>
                                            <span className="text-gray-900 font-semibold">
                                                {formData.patientAge} years / {formData.patientSex}
                                            </span>
                                        </div>
                                        <div className="flex gap-2">
                                            <span className="text-gray-500 font-bold w-16 shrink-0">Date:</span>
                                            <span className="text-gray-900 font-semibold">
                                                {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* --- Pre-Operative Evaluation (Conditional) --- */}
                                {(formData.preOpEvaluationForm || formData.referredForPreOp) && (
                                    <div className="mb-4">
                                        <h3 className="text-[10px] font-black text-blue-600 uppercase tracking-widest border-b border-gray-100 pb-1 mb-3">
                                            PRE-OPERATIVE EVALUATION
                                        </h3>
                                        <div className="space-y-2">
                                            {formData.preOpEvaluationForm && (
                                                <p className="text-gray-700 leading-relaxed">
                                                    PreOp evaluation / Fitness:{' '}
                                                    <span className="font-bold text-blue-600 underline underline-offset-2">
                                                        {formData.preOpEvaluationForm}
                                                    </span>{' '}
                                                    form
                                                </p>
                                            )}
                                            {formData.referredForPreOp && (
                                                <p className="text-gray-700 leading-relaxed">
                                                    Thanks for your reference. Referred for PreOp evaluation posted for Dr.{' '}
                                                    <span className="font-bold text-blue-600 underline underline-offset-2">
                                                        {formData.referredForPreOp}
                                                    </span>
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* --- Clinical Assessment --- */}
                                <div className="mb-4">
                                    <h3 className="text-[10px] font-black text-blue-600 uppercase tracking-widest border-b border-gray-100 pb-1 mb-3">
                                        CLINICAL ASSESSMENT
                                    </h3>
                                    <div className="space-y-1">
                                        <div className="flex gap-2 min-w-0">
                                            <span className="text-gray-500 font-bold w-28 shrink-0">Past History:</span>
                                            <span className="text-gray-900 font-medium break-words min-w-0 flex-1">{formData.pastHistory || 'No significant history'}</span>
                                        </div>
                                        <div className="flex gap-2">
                                            <span className="text-gray-500 font-bold w-28 shrink-0">Cardio Respiratory:</span>
                                            <span className="text-gray-900 font-medium">{formData.cardioRespiratoryFunction || 'Normal'}</span>
                                        </div>
                                        <div className="flex gap-2">
                                            <span className="text-gray-500 font-bold w-28 shrink-0">Sy/E:</span>
                                            <span className="text-gray-900 font-medium">{formData.syE || 'Normal'}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* --- Investigations --- */}
                                <div className="mb-4">
                                    <h3 className="text-[10px] font-black text-blue-600 uppercase tracking-widest border-b border-gray-100 pb-1 mb-3">
                                        INVESTIGATIONS
                                    </h3>
                                    <div className="space-y-1">
                                        <div className="flex gap-2">
                                            <span className="text-gray-500 font-bold w-12 shrink-0">ECG:</span>
                                            <span className="text-gray-900 font-medium">{formData.ecgField || 'Normal'}</span>
                                        </div>
                                        <div className="flex gap-2">
                                            <span className="text-gray-500 font-bold w-12 shrink-0">Echo:</span>
                                            <span className="text-gray-900 font-medium">{formData.echoField || 'Normal'}</span>
                                        </div>
                                        <div className="flex gap-2">
                                            <span className="text-gray-500 font-bold w-12 shrink-0">CXR:</span>
                                            <span className="text-gray-900 font-medium">{formData.cxrField || 'Normal'}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* --- Medical Opinion --- */}
                                <div className="mb-4">
                                    <h3 className="text-[10px] font-black text-blue-600 uppercase tracking-widest border-b border-gray-100 pb-1 mb-3">
                                        MEDICAL OPINION
                                    </h3>
                                    <div className="space-y-2">
                                        <div className="flex gap-2">
                                            <span className="text-gray-500 font-bold w-16 shrink-0">Opinion:</span>
                                            <span className={`font-medium ${formData.opinion ? 'text-gray-900' : 'text-gray-300 italic'}`}>
                                                {formData.opinion || '_______________________'}
                                            </span>
                                        </div>
                                        {formData.selectedOpinionType && (
                                            <div className="mt-2 pl-3 border-l-4 border-blue-500 bg-blue-50/50 rounded-r-lg p-3">
                                                <p className="text-[9px] font-black text-blue-600 uppercase tracking-wider mb-1">
                                                    {formData.selectedOpinionType === 'surgery_fitness' && 'Fitness for Surgery'}
                                                    {formData.selectedOpinionType === 'medication_modification' && 'Medication Modification'}
                                                    {formData.selectedOpinionType === 'fitness_reserved' && 'Fitness Reserved For'}
                                                </p>
                                                <p className="text-gray-800 font-semibold leading-relaxed break-words">
                                                    {formData.selectedOpinionType === 'surgery_fitness'
                                                        ? (formData.surgeryFitnessOption || 'Not specified')
                                                        : formData.selectedOpinionType === 'medication_modification'
                                                            ? (formData.medicationModificationText || 'Not specified')
                                                            : (formData.fitnessReservedText || 'Not specified')}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* --- Vitals & Labs (Conditional) --- */}
                                {(formData.bloodPressure || formData.heartRate || formData.temperature ||
                                    formData.oxygenSaturation || formData.respiratoryRate || formData.labValues) && (
                                    <div className="mb-4">
                                        <h3 className="text-[10px] font-black text-blue-600 uppercase tracking-widest border-b border-gray-100 pb-1 mb-3">
                                            VITALS &amp; LAB VALUES
                                        </h3>
                                        <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                                            <div className="space-y-1">
                                                {formData.bloodPressure && (
                                                    <div className="flex gap-2">
                                                        <span className="text-gray-500 font-bold w-10 shrink-0">BP:</span>
                                                        <span className="text-gray-900 font-medium">{formData.bloodPressure}</span>
                                                    </div>
                                                )}
                                                {formData.heartRate && (
                                                    <div className="flex gap-2">
                                                        <span className="text-gray-500 font-bold w-10 shrink-0">HR:</span>
                                                        <span className="text-gray-900 font-medium">{formData.heartRate}</span>
                                                    </div>
                                                )}
                                                {formData.temperature && (
                                                    <div className="flex gap-2">
                                                        <span className="text-gray-500 font-bold w-10 shrink-0">Temp:</span>
                                                        <span className="text-gray-900 font-medium">{formData.temperature}</span>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="space-y-1">
                                                {formData.oxygenSaturation && (
                                                    <div className="flex gap-2">
                                                        <span className="text-gray-500 font-bold w-12 shrink-0">SpO2:</span>
                                                        <span className="text-gray-900 font-medium">{formData.oxygenSaturation}</span>
                                                    </div>
                                                )}
                                                {formData.respiratoryRate && (
                                                    <div className="flex gap-2">
                                                        <span className="text-gray-500 font-bold w-12 shrink-0">RR:</span>
                                                        <span className="text-gray-900 font-medium">{formData.respiratoryRate}</span>
                                                    </div>
                                                )}
                                                {formData.labValues && (
                                                    <div className="flex gap-2 min-w-0">
                                                        <span className="text-gray-500 font-bold w-12 shrink-0">Labs:</span>
                                                        <span className="text-gray-900 font-medium break-words min-w-0 flex-1">{formData.labValues}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* --- Recommendations (Conditional) --- */}
                                {formData.recommendations && (
                                    <div className="mb-4">
                                        <h3 className="text-[10px] font-black text-blue-600 uppercase tracking-widest border-b border-gray-100 pb-1 mb-3">
                                            RECOMMENDATIONS
                                        </h3>
                                        <p className="text-gray-800 font-medium leading-relaxed break-words">{formData.recommendations}</p>
                                    </div>
                                )}

                                {/* --- Footer / Signature --- */}
                                <div className="flex justify-between items-end pt-4 border-t border-gray-200 mt-4">
                                    <div>
                                        <div className="w-32 h-[1px] bg-gray-500 mb-1" />
                                        <p className="font-bold text-gray-900">Dr. Dipak Gawli</p>
                                        <p className="text-gray-500 text-[9px] uppercase tracking-wider">Consulting Physician</p>
                                        <p className="text-gray-400 text-[9px] mt-1">
                                            Date: {new Date().toLocaleDateString('en-IN')}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-gray-600 font-semibold">Valid for: {formData.validityPeriod || '30 days'}</p>
                                        <p className="text-gray-400 text-[9px] mt-1">
                                            Cert ID: {formData.certificateId || `CERT_${Date.now().toString().slice(-10)}`}
                                        </p>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Action Buttons (Moved below Preview) */}
                            <div className="flex flex-col xl:flex-row gap-4 mt-6">
                                <button
                                    onClick={handleGeneratePdf}
                                    disabled={isSaving}
                                    className="flex-1 flex items-center justify-center gap-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white py-4 rounded-xl font-bold text-base shadow-lg shadow-blue-200 transition-all active:scale-[0.98]"
                                >
                                    {isSaving
                                        ? <><Loader2 className="w-5 h-5 animate-spin" /><span>Saving...</span></>
                                        : <><Share2 className="w-5 h-5" /><span>Generate &amp; Share PDF</span></>
                                    }
                                </button>
                                <button
                                    onClick={handleSaveImage}
                                    disabled={isSaving}
                                    className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-gray-100 text-gray-600 rounded-xl font-bold text-base hover:bg-gray-200 transition-all disabled:opacity-50"
                                >
                                    <Download className="w-5 h-5" />
                                    <span className="hidden sm:inline">Save Image (Legacy)</span>
                                </button>
                            </div>

                        </div>
                    </div>

                    {/* =========================================================
                        RIGHT COLUMN: EDIT FORM
                    ========================================================= */}
                    <div className="space-y-6 order-1 lg:order-2">

                        {/* ---- Section 1: Medical Opinion ---- */}
                        <section className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-5">
                            <div className="flex items-center gap-3 pb-4 border-b border-gray-50">
                                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                                    <Plus className="w-5 h-5" />
                                </div>
                                <h3 className="text-lg font-bold text-gray-900">1. Medical Opinion</h3>
                            </div>

                            {/* Opinion Type Radio Cards */}
                            <div className="grid grid-cols-1 gap-3">
                                {[
                                    { id: 'surgery_fitness' as const, label: 'Surgery Fitness' },
                                    { id: 'medication_modification' as const, label: 'Medication Modification' },
                                    { id: 'fitness_reserved' as const, label: 'Fitness Reserved For' },
                                ].map((opt) => (
                                    <div key={opt.id}>
                                        <button
                                            onClick={() => handleOpinionTypeSelect(opt.id)}
                                            className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all text-left ${
                                                formData.selectedOpinionType === opt.id
                                                    ? 'border-blue-600 bg-blue-50 shadow-md shadow-blue-100'
                                                    : 'border-gray-100 bg-gray-50 hover:border-gray-200 hover:bg-white'
                                            }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                                                    formData.selectedOpinionType === opt.id
                                                        ? 'border-blue-600 bg-blue-600'
                                                        : 'border-gray-300'
                                                }`}>
                                                    {formData.selectedOpinionType === opt.id && (
                                                        <div className="w-2 h-2 rounded-full bg-white" />
                                                    )}
                                                </div>
                                                <span className={`font-bold text-sm ${
                                                    formData.selectedOpinionType === opt.id ? 'text-blue-700' : 'text-gray-700'
                                                }`}>
                                                    {opt.label}
                                                </span>
                                            </div>
                                            {formData.selectedOpinionType === opt.id && (
                                                <CheckCircle2 className="w-5 h-5 text-blue-600 shrink-0" />
                                            )}
                                        </button>

                                        {/* Surgery Fitness Dropdown */}
                                        {opt.id === 'surgery_fitness' && formData.selectedOpinionType === 'surgery_fitness' && (
                                            <div className="ml-8 mt-2 space-y-2">
                                                <button
                                                    onClick={() => setIsSurgeryDropdownOpen(prev => !prev)}
                                                    className="w-full flex items-center justify-between bg-white border border-blue-200 rounded-xl p-3 text-left shadow-sm"
                                                >
                                                    <span className={`text-sm font-semibold ${formData.surgeryFitnessOption ? 'text-gray-900' : 'text-gray-400'}`}>
                                                        {formData.surgeryFitnessOption || 'Select fitness category...'}
                                                    </span>
                                                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isSurgeryDropdownOpen ? 'rotate-180' : ''}`} />
                                                </button>
                                                {isSurgeryDropdownOpen && (
                                                    <div className="bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden z-50">
                                                        {SURGERY_FITNESS_OPTIONS.map((surgOpt, i) => (
                                                            <button
                                                                key={i}
                                                                onClick={() => {
                                                                    updateField('surgeryFitnessOption', surgOpt);
                                                                    setIsSurgeryDropdownOpen(false);
                                                                }}
                                                                className={`w-full p-3 text-left text-sm font-medium hover:bg-blue-50 hover:text-blue-700 transition-colors border-b last:border-0 border-gray-50 ${
                                                                    formData.surgeryFitnessOption === surgOpt ? 'bg-blue-50 text-blue-700 font-bold' : 'text-gray-700'
                                                                }`}
                                                            >
                                                                {surgOpt}
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Medication Modification Textarea */}
                                        {opt.id === 'medication_modification' && formData.selectedOpinionType === 'medication_modification' && (
                                            <div className="ml-8 mt-2 space-y-2">
                                                <div className="flex justify-between items-center">
                                                    <label className="text-xs font-bold text-blue-600 uppercase tracking-wider">
                                                        Current Prescription
                                                    </label>
                                                    {formData.latestPrescription && !formData.medicationModificationText && (
                                                        <button
                                                            onClick={() => updateField('medicationModificationText', formData.latestPrescription)}
                                                            className="text-[11px] font-bold text-blue-600 bg-blue-50 border border-blue-200 px-3 py-1 rounded-full hover:bg-blue-100 transition-colors"
                                                        >
                                                            📋 Load Current Prescription
                                                        </button>
                                                    )}
                                                </div>
                                                <textarea
                                                    value={formData.medicationModificationText}
                                                    onChange={(e) => updateField('medicationModificationText', e.target.value)}
                                                    rows={4}
                                                    className="w-full bg-white border border-blue-200 rounded-xl p-3 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500 resize-none placeholder:text-gray-300"
                                                    placeholder="Prescription details will be auto-loaded from patient data..."
                                                />
                                            </div>
                                        )}

                                        {/* Fitness Reserved Textarea */}
                                        {opt.id === 'fitness_reserved' && formData.selectedOpinionType === 'fitness_reserved' && (
                                            <div className="ml-8 mt-2 space-y-2">
                                                <div className="flex justify-between items-center">
                                                    <label className="text-xs font-bold text-blue-600 uppercase tracking-wider">
                                                        Required Investigations
                                                    </label>
                                                    {formData.latestInvestigations && !formData.fitnessReservedText && (
                                                        <button
                                                            onClick={() => updateField('fitnessReservedText', formData.latestInvestigations)}
                                                            className="text-[11px] font-bold text-blue-600 bg-blue-50 border border-blue-200 px-3 py-1 rounded-full hover:bg-blue-100 transition-colors"
                                                        >
                                                            📋 Load Current Investigations
                                                        </button>
                                                    )}
                                                </div>
                                                <textarea
                                                    value={formData.fitnessReservedText}
                                                    onChange={(e) => updateField('fitnessReservedText', e.target.value)}
                                                    rows={4}
                                                    className="w-full bg-white border border-blue-200 rounded-xl p-3 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500 resize-none placeholder:text-gray-300"
                                                    placeholder="Investigation details will be auto-loaded from patient data..."
                                                />
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>

                            {/* General Medical Opinion — Always Visible */}
                            <div className="space-y-2 mt-4">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                                    General Medical Opinion (Free Text)
                                </label>
                                <textarea
                                    value={formData.opinion}
                                    onChange={(e) => updateField('opinion', e.target.value)}
                                    rows={3}
                                    className="w-full bg-gray-50 border border-gray-100 rounded-xl p-3 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500 resize-none transition-all placeholder:text-gray-300"
                                    placeholder="Enter the primary medical opinion..."
                                />
                            </div>
                        </section>

                        {/* ---- Section 2: Pre-Op & Vitals ---- */}
                        <section className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-5">
                            <div className="flex items-center gap-3 pb-4 border-b border-gray-50">
                                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                                    <Stethoscope className="w-5 h-5" />
                                </div>
                                <h3 className="text-lg font-bold text-gray-900">2. Pre-Op & Vitals</h3>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">PreOp Form Type</label>
                                    <input
                                        type="text"
                                        value={formData.preOpEvaluationForm}
                                        onChange={(e) => updateField('preOpEvaluationForm', e.target.value)}
                                        className="w-full bg-gray-50 border border-gray-100 rounded-xl p-3 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-gray-300"
                                        placeholder="e.g. Test 1"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Posted for Doctor</label>
                                    <input
                                        type="text"
                                        value={formData.referredForPreOp}
                                        onChange={(e) => updateField('referredForPreOp', e.target.value)}
                                        className="w-full bg-gray-50 border border-gray-100 rounded-xl p-3 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-gray-300"
                                        placeholder="Doctor's name"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                {[
                                    { field: 'bloodPressure', label: 'Blood Pressure', placeholder: 'e.g. 120/80 mmHg' },
                                    { field: 'heartRate', label: 'Heart Rate', placeholder: 'e.g. 72 bpm' },
                                    { field: 'temperature', label: 'Temperature', placeholder: 'e.g. 98.6 °F' },
                                    { field: 'respiratoryRate', label: 'Respiratory Rate', placeholder: 'e.g. 16 /min' },
                                    { field: 'oxygenSaturation', label: 'SpO2', placeholder: 'e.g. 98%' },
                                ].map((v) => (
                                    <div key={v.field} className="space-y-1">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{v.label}</label>
                                        <input
                                            type="text"
                                            value={(formData as any)[v.field]}
                                            onChange={(e) => updateField(v.field as any, e.target.value)}
                                            className="w-full bg-gray-50 border border-gray-100 rounded-xl p-3 text-sm font-medium text-center outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-gray-300"
                                            placeholder={v.placeholder}
                                        />
                                    </div>
                                ))}
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Other Lab Values</label>
                                <textarea
                                    value={formData.labValues}
                                    onChange={(e) => updateField('labValues', e.target.value)}
                                    rows={2}
                                    className="w-full bg-gray-50 border border-gray-100 rounded-xl p-3 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500 resize-none placeholder:text-gray-300"
                                    placeholder="Hb, Creatinine, RFT, LFT etc."
                                />
                            </div>
                        </section>

                        {/* ---- Section 3: Clinical Findings ---- */}
                        <section className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-5">
                            <div className="flex items-center gap-3 pb-4 border-b border-gray-50">
                                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                                    <ClipboardList className="w-5 h-5" />
                                </div>
                                <h3 className="text-lg font-bold text-gray-900">3. Clinical Findings</h3>
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Past History</label>
                                <textarea
                                    value={formData.pastHistory}
                                    onChange={(e) => updateField('pastHistory', e.target.value)}
                                    rows={2}
                                    className="w-full bg-gray-50 border border-gray-100 rounded-xl p-3 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Cardio Respiratory</label>
                                    <input
                                        type="text"
                                        value={formData.cardioRespiratoryFunction}
                                        onChange={(e) => updateField('cardioRespiratoryFunction', e.target.value)}
                                        className="w-full bg-gray-50 border border-gray-100 rounded-xl p-3 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Sy/E (Symptom/Exam)</label>
                                    <input
                                        type="text"
                                        value={formData.syE}
                                        onChange={(e) => updateField('syE', e.target.value)}
                                        className="w-full bg-gray-50 border border-gray-100 rounded-xl p-3 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                                {[
                                    { statusField: 'ecgField', findingsField: 'ecgFindings', label: 'ECG', placeholder: 'Normal ECG' },
                                    { statusField: 'echoField', findingsField: 'echoFindings', label: 'Echo', placeholder: 'Normal Echo study' },
                                    { statusField: 'cxrField', findingsField: 'cxrFindings', label: 'CXR', placeholder: 'Clear lung fields' },
                                ].map((inv) => (
                                    <div key={inv.statusField} className="space-y-2">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{inv.label}</label>
                                        <input
                                            type="text"
                                            value={(formData as any)[inv.statusField]}
                                            onChange={(e) => updateField(inv.statusField as any, e.target.value)}
                                            className="w-full bg-gray-50 border border-gray-100 rounded-xl p-2 text-sm font-bold text-blue-700 outline-none focus:ring-2 focus:ring-blue-500"
                                            placeholder={inv.placeholder}
                                        />
                                        <textarea
                                            value={(formData as any)[inv.findingsField]}
                                            onChange={(e) => updateField(inv.findingsField as any, e.target.value)}
                                            rows={1}
                                            className="w-full bg-gray-50 border border-gray-100 rounded-xl p-2 text-xs font-medium outline-none focus:ring-2 focus:ring-blue-500 resize-none placeholder:text-gray-300"
                                            placeholder="Detailed findings..."
                                        />
                                    </div>
                                ))}
                            </div>
                        </section>

                        {/* ---- Section 4: Recommendations ---- */}
                        <section className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-5">
                            <div className="flex items-center gap-3 pb-4 border-b border-gray-50">
                                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                                    <Star className="w-5 h-5" />
                                </div>
                                <h3 className="text-lg font-bold text-gray-900">4. Recommendations</h3>
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Special Recommendations</label>
                                <textarea
                                    value={formData.recommendations}
                                    onChange={(e) => updateField('recommendations', e.target.value)}
                                    rows={3}
                                    className="w-full bg-gray-50 border border-gray-100 rounded-xl p-3 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500 resize-none placeholder:text-gray-300"
                                    placeholder="Meds to continue/stop before surgery..."
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Validity Period</label>
                                <div className="flex flex-wrap gap-2">
                                    {VALIDITY_OPTIONS.map((period) => (
                                        <button
                                            key={period}
                                            onClick={() => updateField('validityPeriod', period)}
                                            className={`px-4 py-2 rounded-full text-xs font-bold border transition-all ${
                                                formData.validityPeriod === period
                                                    ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-200'
                                                    : 'bg-white text-gray-500 border-gray-200 hover:border-blue-300 hover:text-blue-600'
                                            }`}
                                        >
                                            {period}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </section>
                    </div>
                </div>
            </div>



            {/* PDF Modal */}
            <GenerateCertificatePdfModal
                isOpen={isPdfModalOpen}
                onClose={() => setIsPdfModalOpen(false)}
                formData={formData}
            />
        </div>
    );
};
