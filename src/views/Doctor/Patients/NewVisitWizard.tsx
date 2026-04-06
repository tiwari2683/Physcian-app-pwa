import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAppSelector } from '../../../controllers/hooks/hooks';
import { patientService } from '../../../services/api/patientService';
import { uploadFilesWithPresignedUrls, fileNeedsUpload } from '../../../services/uploadService';
import type { LocalReportFile } from '../../../services/uploadService';
import { useLocalDraft } from '../../../controllers/hooks/useLocalDraft';
import { ArrowLeft, ArrowRight, Save, Loader2, AlertCircle, User, MessageSquare } from 'lucide-react';

import { ClinicalTab } from './Tabs/ClinicalTab';
import { DiagnosisTab } from './Tabs/DiagnosisTab';
import { PrescriptionTab } from './Tabs/PrescriptionTab';

const INITIAL_FORM_STATE = {
  name: '', age: '', sex: 'Male', mobile: '', address: '',
  newHistoryEntry: '', reports: '', reportFiles: [] as any[],
  inr: '', hb: '', wbc: '', platelet: '', bilirubin: '', sgot: '', sgpt: '', alt: '', 
  tprAlb: '', ureaCreat: '', sodium: '', fastingHBA1C: '', pp: '', tsh: '', ft4: '', others: '',
  diagnosis: '', selectedInvestigations: [] as string[], customInvestigations: '',
  medications: [] as any[]
};

const COMMON_INVESTIGATIONS = [
  "Complete Blood Count (CBC)", "Blood Sugar - Fasting", "Blood Sugar - Post Prandial",
  "HbA1c", "Lipid Profile", "Liver Function Test (LFT)", "Kidney Function Test (KFT)",
  "Thyroid Profile", "Urine Routine", "X-Ray Chest", "X-Ray - Other",
  "Ultrasound Abdomen", "ECG", "2D Echo", "CT Scan", "MRI",
  "PFT (Pulmonary Function Test)", "Blood Pressure Monitoring"
];

const STEPS = [
  { id: 0, label: 'Patient Info' },
  { id: 1, label: 'Clinical' },
  { id: 2, label: 'Diagnosis' },
  { id: 3, label: 'Prescription' }
];

export const NewVisitWizard = () => {
  const { patientId } = useParams<{ patientId: string }>();
  const navigate = useNavigate();

  const isNewPatient = patientId?.startsWith('draft_') ?? false;
  const realPatientId = isNewPatient ? undefined : patientId;
  const draftId = patientId ?? 'draft_unknown';

  const [activeStep, setActiveStep] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [saveError, setSaveError] = useState<string | null>(null);

  const [activeVisitId, setActiveVisitId] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState({ name: '', contactNumber: '', age: '' });

  const existingPatient = useAppSelector(state =>
    state.patients.patients.find(p => p.patientId === realPatientId)
  );

  const [formData, setFormData, clearDraft] = useLocalDraft(
    draftId,
    realPatientId,
    INITIAL_FORM_STATE
  );

  useEffect(() => {
    if (existingPatient && !formData.name) {
      setFormData(prev => ({
        ...prev,
        name: existingPatient.name || '',
        age: existingPatient.age?.toString() || '',
        sex: existingPatient.sex || 'Male',
        mobile: existingPatient.mobile || '',
        address: existingPatient.address || ''
      }));
    }
  }, [existingPatient]);

  useEffect(() => {
    if (!realPatientId) return;

    const fetchAssistantPrefill = async () => {
      try {
        const activeVisit = await patientService.getActiveVisit(realPatientId);
        if (activeVisit) {
          if (activeVisit.visitId) {
            setActiveVisitId(activeVisit.visitId);
          }

          const cp = activeVisit.clinicalParameters || {};
          let parsedKnownInvestigations: string[] = [];
          let parsedCustomInvestigation = '';
          try {
            const raw = activeVisit.advisedInvestigations;
            let allItems: string[] = [];
            if (typeof raw === 'string' && raw.trim().startsWith('[')) {
              allItems = JSON.parse(raw);
            } else if (Array.isArray(raw)) {
              allItems = raw;
            } else if (typeof raw === 'string' && raw.trim()) {
              allItems = raw.split('\n').map(l => l.replace(/^[\u2022\-\*]\s*/, '').trim()).filter(Boolean);
            }
            parsedKnownInvestigations = allItems.filter(item => COMMON_INVESTIGATIONS.includes(item));
            const customItems = allItems.filter(item => !COMMON_INVESTIGATIONS.includes(item));
            parsedCustomInvestigation = customItems.join(', ');
          } catch (e) {
            console.error('Failed to parse investigations', e);
          }

          setFormData(prev => ({
            ...prev,
            name:    prev.name    || activeVisit.name    || '',
            age:     prev.age     || String(activeVisit.age || ''),
            sex:     prev.sex     || activeVisit.sex     || 'Male',
            mobile:  prev.mobile  || activeVisit.mobile  || '',
            address: prev.address || activeVisit.address || '',
            inr:          prev.inr          || cp.inr          || '',
            hb:           prev.hb           || cp.hb           || '',
            wbc:          prev.wbc          || cp.wbc          || '',
            platelet:     prev.platelet     || cp.platelet     || '',
            bilirubin:    prev.bilirubin    || cp.bilirubin    || '',
            sgot:         prev.sgot         || cp.sgot         || '',
            sgpt:         prev.sgpt         || cp.sgpt         || '',
            alt:          prev.alt          || cp.alt          || '',
            tprAlb:       prev.tprAlb       || cp.tprAlb       || '',
            ureaCreat:    prev.ureaCreat    || cp.ureaCreat    || '',
            sodium:       prev.sodium       || cp.sodium       || '',
            fastingHBA1C: prev.fastingHBA1C || cp.fastingHBA1C || cp.fastingHbA1c || '',
            pp:           prev.pp           || cp.pp           || '',
            tsh:          prev.tsh          || cp.tsh          || '',
            ft4:          prev.ft4          || cp.ft4          || '',
            others:       prev.others       || cp.others       || '',
            reports:          prev.reports     || activeVisit.reportNotes || activeVisit.reportDetails || '',
            reportFiles: (prev.reportFiles && prev.reportFiles.length > 0) ? prev.reportFiles : (activeVisit.reportFiles || []),
            newHistoryEntry:  prev.newHistoryEntry || activeVisit.medicalHistory || activeVisit.chiefComplaint || '',
            diagnosis:              prev.diagnosis || activeVisit.diagnosis || activeVisit.diagnosisText || '',
            selectedInvestigations: prev.selectedInvestigations?.length ? prev.selectedInvestigations : parsedKnownInvestigations,
            customInvestigations:   prev.customInvestigations || activeVisit.customInvestigations || parsedCustomInvestigation || '',
          }));
        }
      } catch (err) {
        console.warn('getActiveVisit failed (non-fatal):', err);
      }
    };

    fetchAssistantPrefill();
  }, [realPatientId]);

  const validateBasicInfo = (): boolean => {
    const errs = { name: '', contactNumber: '', age: '' };
    let valid = true;

    if (!formData.name.trim()) {
      errs.name = 'Full name is required.';
      valid = false;
    }
    if (!formData.age) {
      errs.age = 'Age is required.';
      valid = false;
    }
    if (!formData.mobile) {
      errs.contactNumber = 'Mobile number is required.';
      valid = false;
    } else if (!/^[6-9]\d{9}$/.test(formData.mobile)) {
      errs.contactNumber = 'Must be a valid 10-digit Indian number (starts with 6–9).';
      valid = false;
    }

    setFieldErrors(errs);
    return valid;
  };

  const handleNext = () => {
    if (activeStep === 0 && !validateBasicInfo()) return;
    setActiveStep(prev => Math.min(prev + 1, STEPS.length - 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePrevious = () => {
    setActiveStep(prev => Math.max(prev - 1, 0));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleTabClick = (stepId: number) => {
    if (activeStep === 0 && stepId > 0 && !validateBasicInfo()) return;
    setActiveStep(stepId);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCompleteVisit = async () => {
    if (!validateBasicInfo()) {
      setActiveStep(0);
      return;
    }
    if (!patientId) return;

    setSaveError(null);
    const localFiles: LocalReportFile[] = formData.reportFiles || [];
    const filesToUpload = localFiles.filter(fileNeedsUpload);
    let processedReportFiles: LocalReportFile[] = localFiles.filter(f => !fileNeedsUpload(f));

    if (filesToUpload.length > 0 && realPatientId) {
      setIsUploading(true);
      setUploadProgress(`Uploading 0 of ${filesToUpload.length} file(s)… Do not close this tab.`);

      try {
        const { uploaded, failed } = await uploadFilesWithPresignedUrls(
          filesToUpload,
          realPatientId,
          (done, total) => setUploadProgress(`Uploading ${done} of ${total} file(s)… Do not close this tab.`),
          { visitId: activeVisitId || undefined, uploadedBy: 'doctor' }
        );

        processedReportFiles = [
          ...processedReportFiles,
          ...uploaded.map(u => ({
            id: u.s3Key,
            name: u.name,
            size: `${(u.size / 1024 / 1024).toFixed(2)} MB`,
            type: (u.type.startsWith('image/') ? 'image' : 'document') as 'image' | 'document',
            previewUri: null,
            s3Key: u.s3Key,
            key: u.key,
            uploadedToS3: true as const,
            uploadDate: u.uploadDate,
          })),
        ];

        if (failed.length > 0) {
          setSaveError(`Warning: ${failed.length} file(s) failed to upload (${failed.join(', ')}). The visit will be saved without them.`);
        }
      } finally {
        setIsUploading(false);
        setUploadProgress('');
      }
    }

    setIsSaving(true);
    try {
      const combinedInvestigations = [
        ...(formData.selectedInvestigations || []),
        formData.customInvestigations
      ].filter(Boolean).join('\n• ');
      const finalInvestigationsString = combinedInvestigations ? `• ${combinedInvestigations}` : '';

      const acuteData = {
        name:       formData.name,
        age:        parseInt(formData.age, 10) || 0,
        sex:        formData.sex,
        mobile:     formData.mobile,
        address:    formData.address,
        diagnosis:  formData.diagnosis,
        advisedInvestigations: finalInvestigationsString,
        newHistoryEntry: formData.newHistoryEntry,
        reports:    formData.reports,
        reportFiles: processedReportFiles,
        medications: formData.medications || [],
        clinicalParameters: {
          inr:         formData.inr,
          hb:          formData.hb,
          wbc:         formData.wbc,
          platelet:    formData.platelet,
          bilirubin:   formData.bilirubin,
          sgot:        formData.sgot,
          sgpt:        formData.sgpt,
          alt:         formData.alt,
          tprAlb:      formData.tprAlb,
          ureaCreat:   formData.ureaCreat,
          sodium:      formData.sodium,
          fastingHBA1C: formData.fastingHBA1C,
          pp:          formData.pp,
          tsh:         formData.tsh,
          ft4:         formData.ft4,
          others:      formData.others
        }
      };

      if (activeVisitId) {
        await patientService.completeVisit({
          visitId:   activeVisitId,
          patientId,
          acuteData
        });
      } else {
        await patientService.updatePatient(patientId, acuteData);
      }

      clearDraft();
      navigate('/doctor/patients');
    } catch (err) {
      setSaveError('Failed to complete visit: ' + (err as Error).message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {isUploading && (
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white/90 backdrop-blur-md">
          <div className="flex flex-col items-center gap-4 max-w-sm text-center px-6">
            <div className="relative w-16 h-16">
              <div className="absolute inset-0 rounded-full border-4 border-blue-100" />
              <div className="absolute inset-0 rounded-full border-4 border-blue-600 border-t-transparent animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
              </div>
            </div>
            <div>
              <p className="text-base font-bold text-gray-900">{uploadProgress}</p>
              <p className="text-xs text-red-600 font-semibold mt-2 flex items-center justify-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5" />
                Do not close or refresh this tab
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ─── High-Density Navigation Header ─── */}
      <div 
        className="sticky top-0 z-40 bg-white"
        style={{ 
          marginTop: 'calc(-1 * var(--content-padding-y))',
          marginLeft: 'calc(-1 * var(--content-padding-x))',
          marginRight: 'calc(-1 * var(--content-padding-x))',
          paddingLeft: 'var(--content-padding-x)',
          paddingRight: 'var(--content-padding-x)',
          borderBottom: '1px solid var(--color-border)'
        }}
      >
        <div className="absolute left-0 right-0 bg-white pointer-events-none" style={{ top: '-40px', height: '40px' }} />
        
        {/* Title Bar - 56px */}
        <div className="flex items-center justify-between h-[56px]">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/doctor/patients')}
              className="text-gray-400 hover:text-gray-900 transition-colors flex shrink-0 p-1 -ml-1"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex flex-col">
              <h1 className="text-sm font-bold text-gray-900 leading-none">
                {activeStep === 0 ? 'New Patient' : 'Consultation'}
              </h1>
              {existingPatient?.name && (
                <p className="text-[10px] font-bold text-blue-600 mt-1 uppercase tracking-tight">
                  {existingPatient.name} • {existingPatient.age}y
                </p>
              )}
            </div>
          </div>

        </div>

        {/* Tab Bar - Compact High-Density (40px) */}
        <div className="flex items-center overflow-x-auto no-scrollbar -mx-4 px-4 border-t border-gray-50 h-[40px]">
          {STEPS.map((step) => {
            const isActive = activeStep === step.id;
            return (
              <button
                key={step.id}
                onClick={() => handleTabClick(step.id)}
                className={`flex-shrink-0 px-4 h-full flex items-center text-[11px] font-black uppercase tracking-widest transition-all relative ${
                  isActive ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                {step.label}
                {isActive && (
                  <div className="absolute bottom-0 left-4 right-4 h-0.5 bg-blue-600 rounded-full" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── Main Form Area ─── */}
      <div className="flex-1 overflow-y-auto pb-6">
        <div className="max-w-5xl mx-auto w-full pt-4 sm:pt-6 pb-4">
          {saveError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2 text-sm text-red-700">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              {saveError}
            </div>
          )}

          <div>
            {activeStep === 0 && (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 flex items-start gap-3 shadow-sm">
                  <div className="p-1.5 bg-blue-600 text-white rounded-lg shrink-0">
                     <MessageSquare className="w-4 h-4" />
                  </div>
                  <p className="text-blue-800 text-xs font-medium leading-relaxed pt-0.5">
                    Please review and confirm basic details. Pre-filled from profile or assistant triage notes.
                  </p>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                  <div className="px-4 py-3 bg-white border-b border-gray-50 flex items-center gap-3">
                     <User className="w-4 h-4 text-blue-600" />
                     <span className="font-bold text-gray-800 text-sm">Basic Information</span>
                  </div>
                  
                  <div className="p-4 space-y-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-tight ml-1">Full Name *</label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                        className={`w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium text-sm ${fieldErrors.name ? 'border-red-400 bg-red-50' : 'border-gray-100 bg-blue-50/20'}`}
                        placeholder="Patient Full Name"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-tight ml-1">Age *</label>
                        <input
                          type="number"
                          value={formData.age}
                          onChange={e => setFormData({ ...formData, age: e.target.value })}
                          className={`w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium text-sm ${fieldErrors.age ? 'border-red-400 bg-red-50' : 'border-gray-100 bg-blue-50/20'}`}
                          placeholder="35"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-tight ml-1">Sex *</label>
                        <select
                          value={formData.sex}
                          onChange={e => setFormData({ ...formData, sex: e.target.value })}
                          className="w-full p-2.5 border border-gray-100 bg-blue-50/20 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-medium text-sm"
                        >
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-tight ml-1">Mobile Number *</label>
                      <input
                        type="tel"
                        value={formData.mobile}
                        onChange={e => setFormData({ ...formData, mobile: e.target.value.replace(/[^0-9]/g, '').slice(0, 10) })}
                        className={`w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium text-sm ${fieldErrors.contactNumber ? 'border-red-400 bg-red-50' : 'border-gray-100 bg-blue-50/20'}`}
                        placeholder="9876543210"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-tight ml-1">Address</label>
                      <textarea
                        value={formData.address || ''}
                        onChange={e => setFormData({ ...formData, address: e.target.value })}
                        className="w-full p-2.5 border border-gray-100 bg-blue-50/20 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none font-medium text-sm"
                        placeholder="Street, City, State..."
                        rows={2}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeStep === 1 && <ClinicalTab formData={formData} setFormData={setFormData} patientId={patientId} />}
            {activeStep === 2 && <DiagnosisTab formData={formData} setFormData={setFormData} patientId={patientId} />}
            {activeStep === 3 && <PrescriptionTab formData={formData} setFormData={setFormData} patientId={patientId} />}

            {/* Inline Form Navigation (Appears only at the very bottom of the tab content) */}
            <div className="mt-8 pt-6 border-t border-gray-100 flex items-center justify-between pb-8">
              <button
                onClick={handlePrevious}
                disabled={activeStep === 0}
                className="flex items-center gap-2 text-gray-500 font-bold text-sm px-4 py-2.5 rounded-xl hover:bg-gray-50 disabled:opacity-0 transition-all active:scale-95"
              >
                <ArrowLeft className="w-4 h-4" /> Previous
              </button>

              {activeStep < STEPS.length - 1 ? (
                <button 
                  onClick={handleNext} 
                  className="bg-blue-600 text-white font-bold text-sm px-8 py-3 rounded-xl hover:bg-blue-700 transition-all active:scale-95 shadow-[0_4px_12px_rgba(37,99,235,0.2)] flex items-center gap-2"
                >
                  Next <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={handleCompleteVisit}
                  disabled={isSaving}
                  className="bg-green-600 text-white font-bold text-sm px-8 py-3 rounded-xl hover:bg-green-700 transition-all active:scale-95 shadow-[0_4px_12px_rgba(22,163,74,0.2)] flex items-center gap-2"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" /> Save Visit
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};
