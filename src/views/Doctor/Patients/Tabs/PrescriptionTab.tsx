import React, { useState } from 'react';
// Force TS cache refresh
import { Pill, Printer, Share2, FileText, Clock, Activity, X, Eye, ExternalLink, Image as ImageIcon } from 'lucide-react';
import { SmartPrescriptionEngine } from '../../../../components/Common/SmartPrescriptionEngine';
import { generatePrescriptionHTML, DEFAULT_DOCTOR_INFO } from '../../../../utils/PrescriptionPdfTemplate';
import { generateAndSharePrescription } from '../../../../utils/PdfGenerator';
import { apiClient } from '../../../../services/api/apiClient';
import toast from 'react-hot-toast';
import { HistoryModal } from '../../../../components/Common/HistoryModal';
import { ImageZoomModal } from '../../../../components/Common/ImageZoomModal';

interface PrescriptionTabProps {
  formData: any;
  setFormData: (data: any) => void;
  patientId?: string;
}

// Custom Native-styled Dialog for Selective PDF Generation
const PdfOptionsDialog = ({ isOpen, onClose, onGenerate }: any) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h3 className="font-bold text-gray-900 text-lg">PDF Settings</h3>
          <button onClick={onClose} className="p-1.5 bg-white border border-gray-100 hover:bg-gray-50 rounded-lg transition-colors shadow-sm"><X className="w-5 h-5 text-gray-500" /></button>
        </div>
        <div className="p-5 space-y-3 bg-white">
          <p className="text-sm font-bold text-blue-600 uppercase tracking-widest mb-4">Select Inclusion Level</p>
          {[
            { id: 'all', title: 'Include Both', desc: 'Prescription, Diagnosis & Investigations' },
            { id: 'diagnosis', title: 'Diagnosis Only', desc: 'Prescription & Diagnosis only' },
            { id: 'investigations', title: 'Investigations Only', desc: 'Prescription & Investigations only' },
            { id: 'meds', title: 'Medications Only', desc: 'Exclude all clinical notes' },
          ].map((opt) => (
            <button key={opt.id} onClick={() => onGenerate(opt.id)} className="w-full text-left p-3.5 rounded-xl border-2 border-gray-100 hover:border-blue-500 hover:bg-blue-50/50 transition-all active:scale-95 flex flex-col group">
               <span className="font-bold text-gray-800 group-hover:text-blue-700 text-[15px]">{opt.title}</span>
               <span className="text-xs font-semibold text-gray-400 mt-0.5">{opt.desc}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

// The RN Context Chip Array & Zero-Jank Modals
const VisitContextSummary = ({ formData }: { formData: any }) => {
   const [activeModal, setActiveModal] = useState<string | null>(null);
   const [zoomedUrl, setZoomedUrl] = useState<string | null>(null);

   /** Resolve the best viewable URL for a report file */
   const resolveViewUrl = (f: any): string | null =>
     f.s3Url || f.url || f.fileUrl || (f.previewUri?.startsWith('blob:') ? f.previewUri : null) || null;

   const isImageFile = (f: any): boolean =>
     (f.type === 'image' || (f.file?.type || '').startsWith('image/') ||
     /\.(jpe?g|png|gif|webp)$/i.test(f.name || ''));

   return (
      <div className="bg-gradient-to-br from-blue-50/80 to-indigo-50/80 border border-blue-100/60 rounded-2xl p-4 shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)] animate-in slide-in-from-top-4 duration-500 mb-6 relative overflow-hidden">
         <div className="absolute -right-10 -top-10 w-32 h-32 bg-blue-100/50 rounded-full blur-3xl"></div>
         
         <div className="flex items-center justify-between mb-4 relative z-10">
            <div className="flex items-center gap-2.5">
               <span className="w-2 h-2 rounded-full bg-blue-600 shadow-[0_0_10px_rgba(37,99,235,0.6)]"></span>
               <span className="text-xs font-black text-blue-900 uppercase tracking-widest">Visit Context Summary</span>
            </div>
            <span className="text-[9px] font-black text-blue-500 uppercase bg-white px-2.5 py-1 rounded-full border border-blue-200 shadow-sm tracking-wider">In-Memory Sync</span>
         </div>
         
         <div className="flex flex-wrap gap-2 relative z-10">
            <button onClick={() => setActiveModal('history')} className="flex flex-1 items-center justify-center gap-2 bg-white border border-gray-100 px-3 py-3 rounded-xl hover:border-blue-400 hover:shadow-md transition-all active:scale-95 group shadow-sm">
               <Clock className="w-4 h-4 text-blue-600 group-hover:-rotate-12 transition-transform" />
               <span className="text-xs font-bold text-gray-700">History</span>
            </button>
            <button onClick={() => setActiveModal('reports')} className="flex flex-1 items-center justify-center gap-2 bg-white border border-gray-100 px-3 py-3 rounded-xl hover:border-emerald-400 hover:shadow-md transition-all active:scale-95 group shadow-sm">
               <FileText className="w-4 h-4 text-emerald-600 group-hover:-rotate-12 transition-transform" />
               <span className="text-xs font-bold text-gray-700">Reports</span>
            </button>
            <button onClick={() => setActiveModal('params')} className="flex flex-1 items-center justify-center gap-2 bg-white border border-gray-100 px-3 py-3 rounded-xl hover:border-rose-400 hover:shadow-md transition-all active:scale-95 group shadow-sm">
               <Activity className="w-4 h-4 text-rose-500 group-hover:-rotate-12 transition-transform" />
               <span className="text-xs font-bold text-gray-700">Params</span>
            </button>
         </div>

         {(formData.diagnosis || formData.selectedInvestigations?.length > 0 || formData.customInvestigations) && (
            <div className="mt-3 grid grid-cols-2 gap-3 relative z-10">
               {(formData.diagnosis) && (
                  <div className="bg-white/80 backdrop-blur-sm p-3.5 rounded-xl border border-white shadow-sm hover:shadow-md transition-shadow">
                     <span className="text-[10px] font-black text-blue-500 block mb-1.5 uppercase tracking-wider">Diagnosis Snapshot</span>
                     <p className="text-xs font-bold text-gray-800 line-clamp-2 leading-relaxed">{formData.diagnosis}</p>
                  </div>
               )}
               {(formData.selectedInvestigations?.length > 0 || formData.customInvestigations) && (
                  <div className="bg-white/80 backdrop-blur-sm p-3.5 rounded-xl border border-white shadow-sm hover:shadow-md transition-shadow">
                     <span className="text-[10px] font-black text-emerald-500 block mb-1.5 uppercase tracking-wider">Suggested Investigations</span>
                     <ul className="text-xs font-bold text-gray-800 leading-relaxed list-disc pl-4 max-h-24 overflow-y-auto custom-scrollbar pr-1">
                        {[...(formData.selectedInvestigations || []), formData.customInvestigations].filter(Boolean).map((inv, idx) => (
                           <li key={idx} className="break-words mb-0.5">{inv}</li>
                        ))}
                     </ul>
                  </div>
               )}
            </div>
         )}

         {/* Zero-Jank Local Modals Triggered via simple conditionals directly tied to the robust Context Cache */}
         {activeModal === 'history' && (
             <HistoryModal 
                isOpen={true} 
                onClose={() => setActiveModal(null)} 
                title="Current Complaints"
                isLoading={false}
                records={[{ date: new Date().toISOString(), title: 'Current Note', details: formData.newHistoryEntry || 'No details', doctorName: 'Current Session' }]}
             />
         )}
         {activeModal === 'reports' && (
             <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in">
                 <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95">
                    <div className="flex justify-between items-center p-5 border-b border-gray-100 bg-gray-50/50">
                       <h3 className="font-bold text-lg flex items-center gap-2"><FileText className="w-5 h-5 text-emerald-600"/> Uploaded Reports</h3>
                       <button onClick={() => setActiveModal(null)} className="p-1.5 bg-white hover:bg-gray-100 border border-gray-100 rounded-lg shadow-sm transition-colors"><X className="w-5 h-5 text-gray-500"/></button>
                    </div>
                    <div className="p-4 max-h-[60vh] overflow-y-auto">
                       {(formData.reportFiles && formData.reportFiles.length > 0) ? (
                          <div className="space-y-2">
                            {formData.reportFiles.map((f: any, i: number) => {
                               const img = isImageFile(f);
                               const url = resolveViewUrl(f);
                               return (
                                  <div key={i} className="flex items-center justify-between p-3.5 bg-emerald-50/60 rounded-xl border border-emerald-100 gap-3">
                                     <div className="flex items-center gap-3 min-w-0">
                                        <div className="p-1.5 bg-white rounded-lg border border-emerald-100 shrink-0">
                                           {img
                                             ? <ImageIcon className="w-4 h-4 text-emerald-500" />
                                             : <FileText className="w-4 h-4 text-emerald-500" />}
                                        </div>
                                        <p className="text-xs font-bold text-emerald-900 truncate">{f.name}</p>
                                     </div>
                                     {/* Action button: Eye for images, Open for documents */}
                                     {url ? (
                                        img ? (
                                           <button
                                              onClick={() => setZoomedUrl(url)}
                                              className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold hover:bg-blue-100 transition-colors"
                                              title="View full size"
                                           >
                                              <Eye className="w-3.5 h-3.5" /> View
                                           </button>
                                        ) : (
                                           <button
                                              onClick={() => window.open(url, '_blank')}
                                              className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold hover:bg-blue-100 transition-colors"
                                              title="Open file"
                                           >
                                              <ExternalLink className="w-3.5 h-3.5" /> Open
                                           </button>
                                        )
                                     ) : (
                                        <span className="shrink-0 text-[10px] text-amber-600 font-bold bg-amber-50 px-2 py-1 rounded-lg border border-amber-100">
                                           Pending upload
                                        </span>
                                     )}
                                  </div>
                               );
                            })}
                          </div>
                       ) : <p className="text-sm font-bold text-gray-400 text-center py-6">No reports uploaded for this session.</p>}
                    </div>
                 </div>
             </div>
         )}
         {activeModal === 'params' && (
             <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in">
                 <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95">
                    <div className="flex justify-between items-center p-5 border-b border-gray-100 bg-gray-50/50">
                       <h3 className="font-bold text-lg flex items-center gap-2"><Activity className="w-5 h-5 text-rose-500"/> Clinical Vitals</h3>
                       <button onClick={() => setActiveModal(null)} className="p-1.5 bg-white hover:bg-gray-100 border border-gray-100 rounded-lg shadow-sm transition-colors"><X className="w-5 h-5 text-gray-500"/></button>
                    </div>
                    <div className="p-6">
                       <div className="grid grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto pr-1">
                          {['inr', 'hb', 'wbc', 'platelet', 'bilirubin', 'sgot', 'sgpt', 'alt', 'tprAlb', 'ureaCreat', 'sodium', 'fastingHBA1C', 'pp', 'tsh', 'ft4', 'others'].map(key => (
                             formData[key] && <div key={key} className="bg-rose-50/50 p-3 rounded-xl border border-rose-100">
                                <span className="text-[10px] uppercase font-bold text-rose-500 block tracking-widest leading-none mb-1">{key === 'tprAlb' ? 'TPR ALB' : key === 'ureaCreat' ? 'UREA/CREAT' : key === 'fastingHBA1C' ? 'FASTING/HBA1C' : key}</span>
                                <span className="text-sm font-black text-rose-900 block break-words">{formData[key]}</span>
                             </div>
                          ))}
                       </div>
                       {!['inr', 'hb', 'wbc', 'platelet', 'bilirubin', 'sgot', 'sgpt', 'alt', 'tprAlb', 'ureaCreat', 'sodium', 'fastingHBA1C', 'pp', 'tsh', 'ft4', 'others'].some(k => formData[k]) && (
                          <p className="text-sm font-bold text-gray-400 text-center py-6">No clinical parameters recorded.</p>
                       )}
                    </div>
                 </div>
             </div>
         )}
         {/* Image Zoom Viewer — shared with the reports modal above */}
         <ImageZoomModal imageUrl={zoomedUrl} onClose={() => setZoomedUrl(null)} />
      </div>
   );
};

export const PrescriptionTab: React.FC<PrescriptionTabProps> = ({ formData, setFormData, patientId }) => {
  const [dialogOpen, setDialogOpen] = useState(false);

  const initiateGenerateRequest = () => {
    if (formData.diagnosis || formData.selectedInvestigations?.length > 0 || formData.customInvestigations) {
        setDialogOpen(true);
    } else {
        executeGeneration('meds');
    }
  };

  const executeGeneration = async (mode: string) => {
    setDialogOpen(false);
    
    const incB = mode === 'all';
    const incD = mode === 'diagnosis' || incB;
    const incI = mode === 'investigations' || incB;

    const html = generatePrescriptionHTML({
      patientName: formData.name || 'Unknown Patient',
      age: formData.age || 'N/A',
      gender: formData.sex || 'N/A',
      patientId: patientId || formData.patientId,
      address: formData.address,
      vitals: {
         bp: formData.bp, 
         weight: formData.weight, 
         height: formData.height,
         temp: formData.temperature
      },
      diagnosis: incD ? formData.diagnosis : undefined,
      advisedInvestigations: incI ? [...(formData.selectedInvestigations || []), formData.customInvestigations].filter(Boolean).join(', ') : undefined,
      additionalNotes: formData.advice || formData.prescription || undefined,
      medications: formData.medications || []
    });

    const loadingToast = toast.loading('Saving prescription...');
    try {
      await apiClient.post('/patient-data', {
          action: 'savePrescription',
          payload: {
              patientId: patientId || formData.patientId,
              patientName: formData.name || 'Unknown Patient',
              age: formData.age,
              gender: formData.sex,
              visitDate: new Date().toISOString(),
              doctorName: DEFAULT_DOCTOR_INFO.name,
              medications: formData.medications || [],
              diagnosis: incD ? formData.diagnosis : null,
              advisedInvestigations: incI ? [...(formData.selectedInvestigations || []), formData.customInvestigations].filter(Boolean).join(', ') : null,
              additionalNotes: formData.advice || formData.prescription || null,
              prescriptionDate: new Date().toISOString()
          }
      });
      toast.success('Prescription saved successfully', { id: loadingToast });
    } catch (error) {
      console.error('Save prescription error:', error);
      toast.error('Failed to save prescription. Aborting PDF generation.', { id: loadingToast });
      return; 
    }

    await generateAndSharePrescription(html);
  };

  return (
    <div className="animate-in fade-in duration-300 pb-20">
      
      {/* ── Core Execution Guideline: Visit Context Summary (Mobile First, Zero-Jank) ── */}
      <VisitContextSummary formData={formData} />
      
      {/* ── Prescription & Medications Wrapper ── */}
      <div className="bg-white rounded-[20px] border border-gray-100/80 shadow-sm overflow-hidden mb-6">
        <div className="flex items-center justify-between px-5 py-5 bg-white border-b border-gray-50/80">
          <div className="flex items-center gap-4">
            <div className="p-2 bg-blue-50/80 text-blue-600 rounded-xl border border-blue-100/50"><Pill className="w-5 h-5" /></div>
            <span className="font-bold text-gray-900 text-[17px] tracking-tight">Prescription Engine</span>
          </div>
        </div>
        <div className="p-5 pt-6 bg-gray-50/30">
          <SmartPrescriptionEngine 
            prescriptions={formData.medications || []} 
            setPrescriptions={(meds) => setFormData({...formData, medications: meds})}
            patientId={patientId} 
          />
        </div>
      </div>

      {/* ── Final Generate & Share Call to Action ── */}
      <div className="pt-2">
        <button 
          onClick={initiateGenerateRequest}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-6 rounded-2xl shadow-[0_8px_30px_rgba(37,99,235,0.3)] transition-all active:scale-[0.98] flex justify-center items-center gap-3 relative overflow-hidden group border border-blue-500"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600 transition-opacity opacity-0 group-hover:opacity-100"></div>
          <Printer className="w-6 h-6 relative z-10" />
          <span className="text-[17px] relative z-10 tracking-wide">Finalize Prescription</span>
          <Share2 className="w-5 h-5 ml-1 relative z-10 opacity-80" />
        </button>
        <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest text-center mt-5 leading-relaxed">
          Generating PDF will lock this visit permanently
        </p>
      </div>

      <PdfOptionsDialog isOpen={dialogOpen} onClose={() => setDialogOpen(false)} onGenerate={executeGeneration} />
    </div>
  );
};

