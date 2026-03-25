import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAppSelector } from '../../controllers/hooks/hooks';
import { patientService } from '../../services/api/patientService';
import { uploadFilesWithPresignedUrls, fileNeedsUpload } from '../../services/uploadService';
import type { LocalReportFile } from '../../services/uploadService';
import { useLocalDraft } from '../../controllers/hooks/useLocalDraft';
import { ArrowLeft, ArrowRight, Save, Loader2, AlertCircle, User, MapPin, Phone, MessageSquare } from 'lucide-react';

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

const STEPS = [
  { id: 0, label: 'Patient Info' },
  { id: 1, label: 'Clinical' },
  { id: 2, label: 'Diagnosis' },
  { id: 3, label: 'Prescription' }
];

export const NewVisitWizard = () => {
  const { patientId } = useParams<{ patientId: string }>();
  const navigate = useNavigate();

  // If patientId starts with 'draft_' this is a brand-new patient session.
  // Otherwise it is an existing patient being consulted.
  const isNewPatient = patientId?.startsWith('draft_') ?? false;
  const realPatientId = isNewPatient ? undefined : patientId;

  // draftId is the stable key passed into DraftService.
  // For new patients  → the 'draft_<uuid>' from the URL (survives F5)
  // For real patients → their patientId (strict one-draft-per-patient upsert)
  const draftId = patientId ?? 'draft_unknown';

  const [activeStep, setActiveStep] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [saveError, setSaveError] = useState<string | null>(null);

  // Captured from the assistant's active visit record on mount
  const [activeVisitId, setActiveVisitId] = useState<string | null>(null);

  // Inline validation errors for Basic Info step
  const [fieldErrors, setFieldErrors] = useState({ name: '', contactNumber: '', age: '' });

  // Try to load patient from Redux store first (already fetched in Patient Directory)
  const existingPatient = useAppSelector(state =>
    state.patients.patients.find(p => p.patientId === realPatientId)
  );

  const [formData, setFormData, clearDraft] = useLocalDraft(
    draftId,
    realPatientId,
    INITIAL_FORM_STATE
  );

  // ─────────────────────────────────────────────
  // STEP 1 — Prefill from Redux patient profile
  // ─────────────────────────────────────────────
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

  // ─────────────────────────────────────────────────────────────────────────
  // STEP 2 — Prefill triage data from IN_PROGRESS visit (assistant's data)
  //   • Only when this is a REAL (non-draft) patient session
  //   • Captures the visitId so completeVisit can reference it transactionally
  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!realPatientId) return; // skip for new-patient (draft_) sessions

    const fetchAssistantPrefill = async () => {
      try {
        const activeVisit = await patientService.getActiveVisit(realPatientId);
        if (activeVisit) {
          // ── Capture visitId so completeVisit can end the correct record ──
          if (activeVisit.visitId) {
            setActiveVisitId(activeVisit.visitId);
          }

          const cp = activeVisit.clinicalParameters || {};
          // Bug 2.2/2.3 Fix: Hydrate Diagnosis and Reports notes
          let parsedInvestigations: string[] = [];
          try {
            const raw = activeVisit.advisedInvestigations;
            if (typeof raw === 'string' && raw.startsWith('[')) {
              parsedInvestigations = JSON.parse(raw);
            } else if (Array.isArray(raw)) {
              parsedInvestigations = raw;
            }
          } catch (e) {
            console.error('Failed to parse investigations', e);
          }

          setFormData(prev => ({
            ...prev,
            // ── Patient info (prefer existing draft over triage) ──
            name:    prev.name    || activeVisit.name    || '',
            age:     prev.age     || String(activeVisit.age || ''),
            sex:     prev.sex     || activeVisit.sex     || 'Male',
            mobile:  prev.mobile  || activeVisit.mobile  || '',
            address: prev.address || activeVisit.address || '',
            // ── Clinical vitals ──
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
            fastingHBA1C: prev.fastingHBA1C || cp.fastingHBA1C || '',
            pp:           prev.pp           || cp.pp           || '',
            tsh:          prev.tsh          || cp.tsh          || '',
            ft4:          prev.ft4          || cp.ft4          || '',
            others:       prev.others       || cp.others       || '',
            // ── Complaint & Reports (Bug 2.3) ──
            // The assistant stores text notes as 'reportNotes', file array as 'reports'/'reportFiles'
            reports:          prev.reports     || activeVisit.reportNotes || activeVisit.reportDetails || '',
            reportFiles:      mergeFiles(prev.reportFiles, activeVisit.reportFiles || []),
            newHistoryEntry:  prev.newHistoryEntry || activeVisit.medicalHistory || activeVisit.chiefComplaint || '',
            // ── Diagnosis & Investigations (Bug 2.2) ──
            diagnosis:              prev.diagnosis || activeVisit.diagnosis || activeVisit.diagnosisText || '',
            selectedInvestigations: prev.selectedInvestigations?.length ? prev.selectedInvestigations : parsedInvestigations,
            customInvestigations:   prev.customInvestigations || activeVisit.customInvestigations || '',
          }));
        }
      } catch (err) {
        console.warn('getActiveVisit failed (non-fatal):', err);
      }
    };

    fetchAssistantPrefill();
  }, [realPatientId, setFormData]);

  const mergeFiles = (existing: any[], incoming: any[]): any[] => {
    const names = new Set(existing.map(f => f.fileName || f.name));
    const novel = incoming.filter(f => !names.has(f.fileName || f.name));
    return [...existing, ...novel];
  };

  // ─────────────────────────────────────────────
  // VALIDATION (inline, per-field)
  // ─────────────────────────────────────────────
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

  // ─────────────────────────────────────────────
  // NAVIGATION
  // ─────────────────────────────────────────────
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
    if (stepId > activeStep && activeStep === 0 && !validateBasicInfo()) return;
    setActiveStep(stepId);
  };

  // ─────────────────────────────────────────────────────────────────────────
  // SAVE — Transactional completeVisit (from Prescription tab only)
  //   Uses the stored activeVisitId captured during mount (assistant's visit)
  //   Falls back to a raw updatePatient if no visitId was captured (new walk-in)
  // ─────────────────────────────────────────────────────────────────────────
  const handleCompleteVisit = async () => {
    if (!validateBasicInfo()) {
      setActiveStep(0);
      return;
    }
    if (!patientId) return;

    setSaveError(null);

    // ─── Phase 1: Upload new files to S3 via presigned URL pipeline ────────────
    const localFiles: LocalReportFile[] = formData.reportFiles || [];
    const filesToUpload = localFiles.filter(fileNeedsUpload);
    let processedReportFiles: LocalReportFile[] = localFiles.filter(f => !fileNeedsUpload(f)); // already-uploaded files

    if (filesToUpload.length > 0 && realPatientId) {
      setIsUploading(true);
      setUploadProgress(`Uploading 0 of ${filesToUpload.length} file(s)… Do not close this tab.`);

      try {
        const { uploaded, failed } = await uploadFilesWithPresignedUrls(
          filesToUpload,
          realPatientId,
          (done, total) => setUploadProgress(`Uploading ${done} of ${total} file(s)… Do not close this tab.`)
        );

        // Merge newly uploaded records with already-uploaded files
        processedReportFiles = [
          ...processedReportFiles,
          // Cast uploaded records back to LocalReportFile shape for acuteData
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
          // Non-blocking — surface a warning but continue with the save
          setSaveError(`Warning: ${failed.length} file(s) failed to upload (${failed.join(', ')}). The visit will be saved without them.`);
        }
      } finally {
        setIsUploading(false);
        setUploadProgress('');
      }
    }

    // ─── Phase 2: Build acuteData payload & complete visit ────────────────────
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
        reportFiles: processedReportFiles, // ← S3-processed files
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
        // ✅ Transactional path — closes the visit, updates patient status, writes snapshot
        await patientService.completeVisit({
          visitId:   activeVisitId,
          patientId,
          acuteData
        });
      } else {
        // 🔄 Fallback path for walk-ins registered directly from the Doctor app
        await patientService.updatePatient(patientId, acuteData);
      }

      clearDraft();
      navigate('/patients');
    } catch (err) {
      setSaveError('Failed to complete visit: ' + (err as Error).message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-full">

      {/* ── Full-screen Upload Blocking Overlay ─────────────────────────────────
          Visible only while S3 presigned PUT requests are in-flight.
          Prevents the doctor from closing the tab or navigating away.       ── */}
      {isUploading && (
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white/90 backdrop-blur-md">
          <div className="flex flex-col items-center gap-4 max-w-sm text-center px-6">
            {/* Animated spinner */}
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
              <p className="text-xs text-gray-400 mt-1">
                Files are being securely uploaded to cloud storage. This will only take a moment.
              </p>
            </div>

            {/* Progress bar (indeterminate style) */}
            <div className="w-full h-1.5 bg-blue-100 rounded-full overflow-hidden">
              <div className="h-full w-1/2 bg-blue-500 rounded-full animate-[indeterminate_1.5s_ease-in-out_infinite]" />
            </div>
          </div>
        </div>
      )}

      {/* ─── Ultra-Compact Seamless Header ─── */}
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
        {/* Anti-gap mask: permanently covers the transparent padding gap above the sticky element with solid white, so scrolling content cannot be seen 'between' the two headers. */}
        <div className="absolute left-0 right-0 bg-white pointer-events-none" style={{ top: '-40px', height: '40px' }} />
        <div className="flex items-center justify-between h-[60px]">
          {/* Left section */}
          <div className="flex items-center gap-4 w-1/4">
            <button
              onClick={() => navigate('/patients')}
              className="text-gray-500 hover:text-gray-900 transition-colors flex flex-shrink-0"
            >
              <ArrowLeft />
            </button>
            <div>
              <h1 className="text-sm font-semibold text-gray-900 leading-tight">
                {activeStep === 0 ? 'Edit Patient' : 'Consultation'}
              </h1>
              <p className="text-[10px] text-gray-500 font-medium">
                {existingPatient?.name ? (
                  <span className="lowercase">{existingPatient.name} • {existingPatient.age}y</span>
                ) : (
                  'new patient'
                )}
              </p>
            </div>
          </div>

          {/* Center Tabs */}
          <div className="hidden md:flex justify-center items-center h-[60px]">
            <div className="tab-bar border-b-0 h-full min-h-0 bg-transparent px-0 gap-6 lg:gap-12">
              {STEPS.map((step) => {
                const isActive = activeStep === step.id;
                return (
                  <button
                    key={step.id}
                    onClick={() => handleTabClick(step.id)}
                    className={`tab-item ${isActive ? 'active' : ''}`}
                    style={{ height: '60px' }}
                  >
                    {step.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right section */}
          <div className="flex items-center justify-end w-1/4">
            {activeStep < STEPS.length - 1 ? (
              <button onClick={handleNext} className="btn btn-primary btn-sm">Next</button>
            ) : (
              <button onClick={handleCompleteVisit} disabled={isSaving} className="btn btn-primary btn-sm">
                {isSaving ? 'Saving...' : 'Save'}
              </button>
            )}
          </div>
        </div>

        {/* Mobile Tabs */}
        <div className="md:hidden w-full">
          <div className="tab-bar h-[44px] min-h-[44px] px-0 bg-transparent w-full">
            {STEPS.map((step) => {
              const isActive = activeStep === step.id;
              return (
                <button
                  key={step.id}
                  onClick={() => handleTabClick(step.id)}
                  className={`tab-item flex-1 justify-center px-1.5 py-0 text-[11px] ${isActive ? 'active' : ''}`}
                  style={{ height: '44px' }}
                >
                  {step.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ─── Form Area (scrollable, grows to fill space) ─── */}
      <div className="flex-1 overflow-y-auto">
      <div className="max-w-5xl mx-auto w-full pt-4 sm:pt-6 pb-4">
        {/* Save Error Banner */}
        {saveError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2 text-sm text-red-700">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            {saveError}
          </div>
        )}

        <div>
          {/* STEP 0 — Patient Info */}
          {activeStep === 0 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
              {/* Confirmation Banner */}
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-start gap-4 shadow-sm">
                <div className="p-2 bg-blue-600 text-white rounded-lg shrink-0">
                   <MessageSquare className="w-5 h-5" />
                </div>
                <p className="text-blue-800 text-sm font-medium leading-relaxed pt-0.5">
                  Please review and confirm the patient's basic details. These were pre-filled from their profile or assistant's triage notes.
                </p>
              </div>

              {/* Basic Info Card */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-4 py-4 bg-white border-b border-gray-50 flex items-center gap-3">
                   <User className="w-5 h-5 text-blue-600" />
                   <span className="font-bold text-gray-800 text-base">Basic Information</span>
                </div>
                
                <div className="p-4 space-y-5">
                  {/* Full Name */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-tight ml-1 flex items-center gap-1.5">
                      Full Name <span className="text-red-500 font-bold">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={e => {
                        setFormData({ ...formData, name: e.target.value });
                        if (e.target.value.trim()) setFieldErrors({ ...fieldErrors, name: '' });
                      }}
                      className={`w-full p-3 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium text-sm ${
                        fieldErrors.name ? 'border-red-400 bg-red-50' : 'border-gray-100 bg-blue-50/20'
                      }`}
                      placeholder="Enter patient's full name"
                    />
                    {fieldErrors.name && (
                      <p className="text-[10px] text-red-600 flex items-center gap-1 ml-1 font-bold">
                        <AlertCircle className="w-3 h-3" /> {fieldErrors.name}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {/* Age */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-tight ml-1">
                        Age <span className="text-red-500 font-bold">*</span>
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={130}
                        value={formData.age}
                        onChange={e => {
                          setFormData({ ...formData, age: e.target.value });
                          if (e.target.value) setFieldErrors({ ...fieldErrors, age: '' });
                        }}
                        className={`w-full p-3 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium text-sm ${
                          fieldErrors.age ? 'border-red-400 bg-red-50' : 'border-gray-100 bg-blue-50/20'
                        }`}
                        placeholder="35"
                      />
                      {fieldErrors.age && (
                        <p className="text-[10px] text-red-600 flex items-center gap-1 ml-1 font-bold">
                          <AlertCircle className="w-3 h-3" /> {fieldErrors.age}
                        </p>
                      )}
                    </div>

                    {/* Sex */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-tight ml-1">Sex <span className="text-red-500 font-bold">*</span></label>
                      <select
                        value={formData.sex}
                        onChange={e => setFormData({ ...formData, sex: e.target.value })}
                        className="w-full p-3 border border-gray-100 bg-blue-50/20 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-medium text-sm"
                      >
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>

                  {/* Mobile */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-tight ml-1 flex items-center gap-1.5">
                      <Phone className="w-3 h-3" /> Mobile Number <span className="text-red-500 font-bold">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="tel"
                        value={formData.mobile}
                        onChange={e => {
                          const clean = e.target.value.replace(/[^0-9]/g, '').slice(0, 10);
                          setFormData({ ...formData, mobile: clean });
                          if (!clean) {
                            setFieldErrors({ ...fieldErrors, contactNumber: '' });
                          } else if (!/^[6-9]/.test(clean)) {
                            setFieldErrors({ ...fieldErrors, contactNumber: 'Starts with 6, 7, 8, or 9' });
                          } else if (clean.length < 10) {
                            setFieldErrors({ ...fieldErrors, contactNumber: `${clean.length}/10 digits` });
                          } else {
                            setFieldErrors({ ...fieldErrors, contactNumber: '' });
                          }
                        }}
                        className={`w-full p-3 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all pr-14 font-medium text-sm ${
                          fieldErrors.contactNumber ? 'border-red-400 bg-red-50' : 'border-gray-100 bg-blue-50/20'
                        }`}
                        placeholder="9876543210"
                        inputMode="numeric"
                      />
                      <span className={`absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold ${
                        formData.mobile.length === 10 ? 'text-green-600' : 'text-gray-300'
                      }`}>
                        {formData.mobile.length}/10
                      </span>
                    </div>
                    {fieldErrors.contactNumber && (
                      <p className="text-[10px] text-red-600 flex items-center gap-1 ml-1 font-bold">
                        <AlertCircle className="w-3 h-3" /> {fieldErrors.contactNumber}
                      </p>
                    )}
                  </div>

                  {/* Address */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-tight ml-1 flex items-center gap-1.5">
                      <MapPin className="w-3 h-3" /> Address
                    </label>
                    <textarea
                      value={formData.address || ''}
                      onChange={e => setFormData({ ...formData, address: e.target.value })}
                      className="w-full p-3 border border-gray-100 bg-blue-50/20 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none resize-none font-medium text-sm"
                      placeholder="Enter street, city, state..."
                      rows={2}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 1 — Clinical */}
          <div className={activeStep === 1 ? 'block' : 'hidden'}>
            <ClinicalTab formData={formData} setFormData={setFormData} patientId={patientId} />
          </div>

          {/* STEP 2 — Diagnosis (with HistoryModal via patientId prop) */}
          <div className={activeStep === 2 ? 'block' : 'hidden'}>
            <DiagnosisTab formData={formData} setFormData={setFormData} patientId={patientId} />
          </div>

          {/* STEP 3 — Prescription */}
          <div className={activeStep === 3 ? 'block' : 'hidden'}>
            <PrescriptionTab formData={formData} setFormData={setFormData} patientId={patientId} />
          </div>
        </div>
      </div>
      </div>

      {/* ─── Sticky In-Flow Footer (no position:fixed, no left offset needed) ─── */}
      <div className="page-footer bg-white border-t border-gray-200 shadow-[0_-4px_16px_rgba(0,0,0,0.04)] flex-shrink-0">
        <div className="w-full max-w-5xl mx-auto flex justify-between items-center px-4 md:px-8">
          <button
            onClick={handlePrevious}
            disabled={activeStep === 0}
            className="btn btn-ghost"
            style={{ opacity: activeStep === 0 ? 0.5 : 1, cursor: activeStep === 0 ? 'not-allowed' : 'pointer' }}
          >
            <ArrowLeft /> Previous
          </button>

          {/* Progress dots */}
          <div className="footer-dots">
            {STEPS.map(s => (
              <div
                key={s.id}
                className={`footer-dot ${s.id <= activeStep ? 'active' : ''}`}
              />
            ))}
          </div>

          {activeStep < STEPS.length - 1 ? (
            <button onClick={handleNext} className="btn btn-primary">
              Next <ArrowRight />
            </button>
          ) : (
            <button
              onClick={handleCompleteVisit}
              disabled={isSaving}
              className="btn btn-success"
            >
              {isSaving ? (
                <>
                  <Loader2 className="animate-spin" /> Saving...
                </>
              ) : (
                <>
                  <Save /> Save Visit
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
