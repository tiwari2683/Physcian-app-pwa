import React, { useState, useRef } from 'react';
import { FileText, Image as ImageIcon, X, Eye, Upload, Calendar, Clock, AlertTriangle } from 'lucide-react';
import { AutoBulletTextArea } from '../../../components/Common/AutoBulletTextArea';
import { HistorySidebar } from '../../../components/Common/HistorySidebar';
import { ImageZoomModal } from '../../../components/Common/ImageZoomModal';
import { ViewUploadedFilesPanel } from '../../../components/Common/ViewUploadedFilesPanel';
import type { HistoryRecord } from '../../../components/Common/HistorySidebar';
import type { LocalReportFile } from '../../../services/uploadService';
import { apiClient } from '../../../services/api/apiClient';

interface ClinicalTabProps {
  formData: any;
  setFormData: (data: any) => void;
  patientId?: string;
}


// ── Section Card — supports optional rightElement in the header ─────────────
const SectionCard: React.FC<{
  icon: React.ReactNode;
  title: string;
  isExpanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  rightElement?: React.ReactNode;
}> = ({ icon, title, isExpanded, onToggle, children, rightElement }) => (
  <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mb-4">
    <div className="flex items-center justify-between pr-4">
      <button
        type="button"
        onClick={onToggle}
        className="flex-1 flex items-center justify-between px-4 py-4 bg-white text-left"
      >
        <div className="flex items-center gap-3">
          <span className="text-blue-600 font-bold">{icon}</span>
          <span className="font-bold text-gray-800 text-base">{title}</span>
        </div>
        <svg
          className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {rightElement}
    </div>
    {isExpanded && (
      <div className="px-4 pb-4 pt-0 border-t border-gray-50 animate-in fade-in slide-in-from-top-1 duration-200">
        {children}
      </div>
    )}
  </div>
);

// ── Icons (SVG paths matching native style) ──────────────────────────────────
const HistoryIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

const ReportsIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
      d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
  </svg>
);

const ParamsIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
      d="M13 10V3L4 14h7v7l9-11h-7z" />
  </svg>
);

// ─────────────────────────────────────────────────────────────────────────────
// CompareTable — PWA specific table logic
// ─────────────────────────────────────────────────────────────────────────────
interface CompareTableProps {
    vitals: any;
    history: any[];
    onVitalsChange: (name: string, value: string) => void;
    paramFields: { key: string, label: string, placeholder: string }[];
}

const CompareTable: React.FC<CompareTableProps> = ({ vitals, history, onVitalsChange, paramFields }) => {
    // Filter history items that have properties matching our param fields
    const historicalColumns = [...history]
        .filter(h => paramFields.some(f => h[f.key] !== undefined))
        .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
        .slice(0, 4)
        .reverse(); // oldest first, so newest is closest to Today

    const formatDate = (iso: string) => {
        try {
            const d = new Date(iso);
            return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' });
        } catch {
            return iso;
        }
    };

    const todayLabel = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' });

    return (
        <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm mt-4">
            <table className="min-w-full border-collapse text-sm">
                <thead>
                    <tr className="bg-gray-50">
                        <th className="sticky left-0 z-20 bg-gray-50 text-left px-4 py-3 font-bold text-gray-700 border-b border-r border-gray-200 min-w-[140px] whitespace-nowrap">
                            Parameter
                        </th>
                        {historicalColumns.map((col, i) => (
                            <th key={i} className="text-center px-4 py-3 font-semibold text-gray-500 border-b border-r border-gray-200 min-w-[100px] whitespace-nowrap">
                                {formatDate(col.createdAt)}
                            </th>
                        ))}
                        <th className="text-center px-4 py-3 font-bold text-white bg-blue-600 border-b border-blue-700 min-w-[120px] whitespace-nowrap">
                            Today
                            <span className="block text-xs font-normal opacity-75">{todayLabel}</span>
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {paramFields.map((field, rowIdx) => {
                        const isEven = rowIdx % 2 === 0;
                        const rowBg = isEven ? 'bg-white' : 'bg-gray-50';

                        return (
                            <tr key={field.key} className={`${rowBg} hover:bg-blue-50 transition-colors group`}>
                                <td className={`sticky left-0 z-10 ${rowBg} group-hover:bg-blue-50 transition-colors px-4 py-2.5 font-semibold text-gray-700 border-r border-gray-200 whitespace-nowrap`}>
                                    {field.label}
                                </td>
                                {historicalColumns.map((col, i) => {
                                    const val = col[field.key];
                                    return (
                                        <td key={i} className="text-center px-4 py-2.5 text-gray-700 border-r border-gray-200">
                                            {val !== undefined && val !== '' && val !== null
                                                ? <span className="font-medium">{val}</span>
                                                : <span className="text-gray-300">—</span>
                                            }
                                        </td>
                                    );
                                })}
                                <td className="px-3 py-1.5 bg-blue-50/50">
                                    <input
                                        type="number"
                                        value={vitals[field.key] || ''}
                                        onChange={(e) => onVitalsChange(field.key, e.target.value)}
                                        step="0.01"
                                        placeholder="—"
                                        className="w-full text-center bg-white border border-blue-200 rounded-md px-2 py-1.5 text-sm font-semibold text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                                    />
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
            {historicalColumns.length === 0 && (
                <div className="text-center py-4 text-sm text-gray-400 bg-gray-50 border-t border-gray-200">
                    No previous visit data available for comparison.
                </div>
            )}
        </div>
    );
};

export const ClinicalTab: React.FC<ClinicalTabProps> = ({ formData, setFormData, patientId }) => {
  const [expanded, setExpanded] = useState({ history: true, reports: true, params: true });
  const [isCompareMode, setIsCompareMode] = useState(false);
  const [isClinicalHistoryOpen, setIsClinicalHistoryOpen] = useState(false);
  const [isReportPanelOpen, setIsReportPanelOpen] = useState(false);
  const [zoomedImageUrl, setZoomedImageUrl] = useState<string | null>(null);
  
  const [historyData, setHistoryData] = useState<HistoryRecord[]>([]);
  const [rawClinicalHistory, setRawClinicalHistory] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [historyModalTitle, setHistoryModalTitle] = useState('');

  const fetchClinicalHistory = async (type: 'getClinicalHistory' | 'getMedicalHistory' | 'getReportsHistory') => {
    if (!patientId) return;
    setIsLoadingHistory(true);
    
    if (type === 'getMedicalHistory') setHistoryModalTitle('History & Complaints');
    else if (type === 'getReportsHistory') setHistoryModalTitle('Past Report Notes');
    else setHistoryModalTitle('Clinical Parameters History');
    
    if (type !== 'getClinicalHistory') {
       setIsClinicalHistoryOpen(true);
    }

    try {
      const response = await apiClient.post('/patient-data', {
        action: type,
        patientId: patientId
      });
      const data = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
      const parsedData = data?.body ? (typeof data.body === 'string' ? JSON.parse(data.body) : data.body) : data;
      
      let historyRecords: HistoryRecord[] = [];
      let items = parsedData.clinicalHistory || parsedData.medicalHistory || parsedData.reportsHistory || parsedData.history || parsedData.visits;
      
      if (!items && Array.isArray(parsedData)) {
          items = parsedData;
      }
      
      if (!items || items.length === 0) {
          // DEBUGGING: If it's truly empty, let's render the raw payload so the user can take a screenshot!
          historyRecords = [{
              date: new Date().toISOString(),
              title: 'DEBUG: Raw API Response for ' + type,
              details: JSON.stringify(parsedData, null, 2),
              doctorName: 'System'
          }];
          setHistoryData(historyRecords);
          return;
      }

      if (Array.isArray(items)) {
         if (type === 'getClinicalHistory') {
             setRawClinicalHistory(items);
         }
         
         historyRecords = items.map((item: any) => {
            if (type === 'getMedicalHistory') {
               return {
                  date: item.createdAt || new Date().toISOString(),
                  title: 'Complaints (Auto-Bulleted)',
                  details: item.medicalHistory || item.historyDetails || item.newHistoryEntry || 'No details provided.',
                  doctorName: item.doctorName || 'Dr. Tiwari'
               };
            } else if (type === 'getReportsHistory') {
               return {
                  date: item.createdAt || new Date().toISOString(),
                  title: `Report Notes (${item.filesAttached || 0} files attached)`,
                  details: item.reportNotes || item.reports || 'No notes provided.',
                  doctorName: item.doctorName || 'Dr. Tiwari'
               };
            } else {
               const excludedKeys = ['patientId', 'createdAt', 'visitId', 'doctorName'];
               const params = Object.entries(item)
                  .filter(([key, value]) => !excludedKeys.includes(key) && value)
                  .map(([key, value]) => `${key.toUpperCase()}: ${value}`)
                  .join(', ');

               return {
                  date: item.createdAt || new Date().toISOString(),
                  title: 'Clinical Vitals',
                  details: params || 'No recorded parameters',
                  doctorName: item.doctorName || 'Dr. Tiwari'
               };
            }
         });
      }
      setHistoryData(historyRecords);
    } catch (error) {
      console.error(`Failed to fetch ${type}:`, error);
      setHistoryData([{
          date: new Date().toISOString(),
          title: 'DEBUG: Error',
          details: error instanceof Error ? error.message : JSON.stringify(error),
          doctorName: 'System'
      }]); 
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const toggle = (section: keyof typeof expanded) =>
    setExpanded(prev => ({ ...prev, [section]: !prev[section] }));

  const handleChange = (field: string, value: string) =>
    setFormData({ ...formData, [field]: value });

  const imageInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const newFiles: LocalReportFile[] = files.map(file => ({
      id: Math.random().toString(36).substring(7),
      file,
      name: file.name,
      size: (file.size / 1024 / 1024).toFixed(2) + ' MB',
      type: file.type.startsWith('image/') ? 'image' : 'document',
      previewUri: file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
    }));
    const current: LocalReportFile[] = formData.reportFiles || [];
    setFormData({ ...formData, reportFiles: [...current, ...newFiles] });
    e.target.value = '';
  };

  const removeFile = (id: string) =>
    setFormData({
      ...formData,
      reportFiles: (formData.reportFiles || []).filter((f: any) => f.id !== id)
    });

  const paramFields = [
    { key: 'inr',         label: 'INR (last)',            placeholder: 'ratio (0.8 - 1.2)' },
    { key: 'hb',          label: 'HB',                   placeholder: 'g/dL' },
    { key: 'wbc',         label: 'WBC',                   placeholder: 'x103/uL' },
    { key: 'platelet',    label: 'Platelet',              placeholder: 'lakhs/uL' },
    { key: 'bilirubin',   label: 'Bilirubin',             placeholder: 'mg/dL' },
    { key: 'sgot',        label: 'SGOT',                  placeholder: 'U/L' },
    { key: 'sgpt',        label: 'SGPT',                  placeholder: 'U/L' },
    { key: 'alt',         label: 'ALT',                   placeholder: 'U/L' },
    { key: 'tprAlb',      label: 'TPR/Alb',               placeholder: 'g/dL' },
    { key: 'ureaCreat',   label: 'Urea/Creat',            placeholder: 'mg/dL' },
    { key: 'sodium',      label: 'Sodium (Na)',           placeholder: 'mEq/L' },
    { key: 'fastingHBA1C',label: 'Fasting/HBA1C',         placeholder: 'mg/dL / %' },
    { key: 'pp',          label: 'P.P',                   placeholder: 'mg/dL' },
    { key: 'tsh',         label: 'TSH',                   placeholder: 'uIU/mL' },
    { key: 'ft4',         label: 'FT4',                   placeholder: 'ng/dL' },
  ];


  return (
    <div className="space-y-1 animate-in fade-in duration-300">

      {/* ── History / Complaints / Symptoms ── */}
      <SectionCard
        icon={<HistoryIcon />}
        title="History/Complaints/Symptoms"
        isExpanded={expanded.history}
        onToggle={() => toggle('history')}
      >
        <div className="space-y-4 pt-3">
          <div className="flex justify-between items-center mb-1">
            <p className="text-sm text-gray-500 font-medium">History/Complaints/Symptoms:</p>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); fetchClinicalHistory('getMedicalHistory'); }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold hover:bg-blue-100 transition-colors shrink-0"
            >
              <Clock className="w-3.5 h-3.5" />
              History
            </button>
          </div>
          <AutoBulletTextArea
            rows={6}
            placeholder="Enter patient's history, complaints, and symptoms. Use dash (-) or bullet (•) at the beginning of a line for auto-bulleting."
            value={formData.newHistoryEntry || ''}
            onChangeText={text => handleChange('newHistoryEntry', text)}
          />

          <p className="text-xs text-gray-400">
            Tip: Start a line with "-" to create a bulleted list
          </p>
        </div>
      </SectionCard>

      {/* ── Reports ── */}
      <SectionCard
        icon={<ReportsIcon />}
        title="Reports"
        isExpanded={expanded.reports}
        onToggle={() => toggle('reports')}
      >
        <div className="space-y-4 pt-3">
          <div className="flex justify-between items-center mb-1 -mt-2">
            <p className="text-sm text-gray-500 font-medium">Report Details & Notes:</p>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); fetchClinicalHistory('getReportsHistory'); }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold hover:bg-blue-100 transition-colors shrink-0"
            >
              <Clock className="w-3.5 h-3.5" />
              History
            </button>
          </div>
          <textarea
            rows={4}
            placeholder="Enter report details or upload reports"
            className="w-full p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none resize-none text-sm placeholder:text-gray-300"
            value={formData.reports || ''}
            onChange={e => handleChange('reports', e.target.value)}
          />

          {/* Single combined file input: accepts images, PDFs, Word docs */}
          <input
            type="file"
            accept="image/*,.pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            multiple
            className="hidden"
            ref={imageInputRef}
            onChange={handleFileSelect}
          />

          <button
            type="button"
            onClick={() => imageInputRef.current?.click()}
            className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-sm transition-all shadow-md active:scale-[0.98]"
          >
            <Upload className="w-5 h-5" /> Upload Report
          </button>

          {(() => {
            // Only show files that have actual content to upload/preview.
            // Ghost entries (draft-restored metadata with no binary and no URL) are filtered out.
            const liveFiles = (formData.reportFiles || []).filter((f: any) =>
              f.file instanceof File || f.previewUri || f.url || f.signedUrl || f.s3Url || f.fileUrl
            );
            if (liveFiles.length === 0) return null;
            return (
            <div className="space-y-3">
              <p className="text-sm font-bold text-gray-800">Files to Upload: ({liveFiles.length})</p>
              <div className="space-y-2">
                {liveFiles.map((f: any, idx: number) => (
                   <div key={f.id || f.name || idx} className="flex items-center justify-between p-3 bg-white border border-gray-100 rounded-xl shadow-sm">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                        {f.type === 'image' ? <ImageIcon className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                      </div>
                      <div className="truncate">
                        <p className="text-xs font-bold text-gray-800 truncate">{f.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                           <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-bold uppercase">Report</span>
                           <span className="text-[10px] text-gray-400 font-medium">{f.size}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {/* Eye / Open button — works for images AND documents */}
                      {(() => {
                        const stableUrl = f.s3Url || f.fileUrl || f.url || f.signedUrl || null;
                        const localBlob  = f.previewUri?.startsWith('blob:') ? f.previewUri : null;
                        const resolvedUrl = stableUrl || localBlob;
                        const isImg = f.type === 'image'
                          || String(f.type).startsWith('image/')
                          || String(f.fileType).startsWith('image/');
                        return (
                          <button
                            type="button"
                            disabled={!resolvedUrl}
                            onClick={() => {
                              if (!resolvedUrl) return;
                              if (isImg) setZoomedImageUrl(resolvedUrl);
                              else window.open(resolvedUrl, '_blank');
                            }}
                            className="p-1.5 text-gray-400 hover:text-blue-600 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                            title={resolvedUrl ? (isImg ? 'View full size' : 'Open document') : 'No preview available'}
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        );
                      })()}
                      <button type="button" onClick={() => removeFile(f.id)} className="p-1.5 text-red-400 hover:text-red-600 transition-colors">
                        <X className="w-4 h-4 border border-red-400 rounded-full" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              {liveFiles.some((f: any) => !f.uploadedToS3) && (
                <div className="flex items-start gap-3 p-3.5 bg-amber-50 border border-amber-200 rounded-xl mt-4">
                  <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                  <div className="text-amber-800">
                    <p className="font-bold text-sm">Do not refresh or close this page.</p>
                    <p className="text-xs font-medium mt-0.5 opacity-90 leading-snug">
                       Files will be irrevocably lost if you refresh before clicking "Save Visit".
                    </p>
                  </div>
                </div>
              )}
            </div>
            );
          })()}

          <button
            type="button"
            onClick={() => setIsReportPanelOpen(true)}
            className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg font-bold text-sm transition-colors"
          >
            <div className="p-1 bg-indigo-700 text-white rounded">
               <FileText className="w-3 h-3" />
            </div>
            View Upload Files
          </button>
        </div>
      </SectionCard>

      {/* ── Clinical Parameters ── */}
      <SectionCard
        icon={<ParamsIcon />}
        title="Clinical Parameters"
        isExpanded={expanded.params}
        onToggle={() => toggle('params')}
      >
        <div className="space-y-4 pt-4">
          <div className="flex justify-between items-center mb-2 -mt-2">
            <p className="text-sm text-gray-500 font-medium">
              {isCompareMode ? 'Longitudinal comparison — scroll horizontally' : 'Enter vital parameters'}
            </p>
            <button
              type="button"
              onClick={(e) => { 
                e.stopPropagation(); 
                if (!isCompareMode && rawClinicalHistory.length === 0) {
                   fetchClinicalHistory('getClinicalHistory');
                }
                setIsCompareMode(!isCompareMode);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${isCompareMode ? 'bg-blue-600 text-white border-blue-700 shadow-sm' : 'bg-blue-50 text-blue-600 border-blue-100 hover:bg-blue-100'} shrink-0`}
            >
              {isCompareMode ? <><X size={13} /> Close Compare</> : <><Clock className="w-3.5 h-3.5" /> Compare History</>}
            </button>
          </div>

          {isCompareMode ? (
             <CompareTable 
                vitals={formData} 
                history={rawClinicalHistory} 
                onVitalsChange={handleChange} 
                paramFields={paramFields} 
             />
          ) : (
             <>
                {/* Date Picker (native like) */}
                <div className="relative">
                  <label className="absolute -top-2 left-3 px-1 bg-white text-[10px] font-bold text-gray-400 z-10">Date:</label>
                  <div className="flex items-center border border-gray-200 rounded-lg p-3 bg-white">
                     <input 
                       type="text" 
                       defaultValue={new Date().toLocaleDateString('en-GB')}
                       readOnly
                       className="flex-1 outline-none text-sm font-medium text-gray-700"
                     />
                     <Calendar className="w-4 h-4 text-gray-400" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-x-4 gap-y-4">
                  {paramFields.map(field => (
                    <div key={field.key} className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-tight ml-1">{field.label}</label>
                      <input
                        type="text"
                        placeholder={field.placeholder}
                        className="w-full p-2.5 border border-gray-100 rounded-lg bg-blue-50/30 focus:bg-white focus:border-blue-300 outline-none text-sm font-medium transition-all"
                        value={formData[field.key] || ''}
                        onChange={e => handleChange(field.key, e.target.value)}
                      />
                    </div>
                  ))}
                  {/* Others at the bottom */}
                  <div className="col-span-2 space-y-1 mt-2">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-tight ml-1">Others</label>
                      <textarea
                        rows={4}
                        className="w-full p-3 border border-gray-100 rounded-lg bg-blue-50/30 focus:bg-white focus:border-blue-300 outline-none text-sm font-medium transition-all resize-none"
                        value={formData.others || ''}
                        onChange={e => handleChange('others', e.target.value)}
                      />
                  </div>
                </div>
             </>
          )}
        </div>
      </SectionCard>

      {/* ── Modals ── */}
      <HistorySidebar
        isOpen={isClinicalHistoryOpen}
        onClose={() => setIsClinicalHistoryOpen(false)}
        title={historyModalTitle}
        records={historyData}
        isLoading={isLoadingHistory}
      />

      {/* ── Historical & Pending Files Viewer ── */}
      <ViewUploadedFilesPanel
        isOpen={isReportPanelOpen}
        onClose={() => setIsReportPanelOpen(false)}
        patientId={patientId}
        localFiles={formData.reportFiles || []}
        onZoomImage={url => setZoomedImageUrl(url)}
      />

      {/* ── Image Zoom Viewer ── */}
      <ImageZoomModal
        imageUrl={zoomedImageUrl}
        onClose={() => setZoomedImageUrl(null)}
      />

    </div>
  );
};
