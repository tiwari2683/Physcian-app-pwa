import React, { useState } from 'react';
import { HistorySidebar } from '../../../../components/Common/HistorySidebar';
import type { HistoryRecord } from '../../../../components/Common/HistoryModal';
import { apiClient } from '../../../../services/api/apiClient';
import { Activity, Clock } from 'lucide-react';
import { AutoBulletTextArea } from '../../../../components/Common/AutoBulletTextArea';

interface DiagnosisTabProps {
  formData: any;
  setFormData: (data: any) => void;
  patientId?: string;
}

// ── Common Section Components (Matching ClinicalTab) ───────────────────────
const SectionHeader: React.FC<{
  icon: React.ReactNode;
  title: string;
  isExpanded: boolean;
  onToggle: () => void;
}> = ({ icon, title, isExpanded, onToggle }) => (
  <button
    type="button"
    onClick={onToggle}
    className="w-full flex items-center justify-between px-4 py-4 bg-white text-left"
  >
    <div className="flex items-center gap-3">
      <span className="text-blue-600 font-bold">{icon}</span>
      <span className="font-bold text-gray-800 text-base">{title}</span>
    </div>
    <svg
      className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  </button>
);

const SectionCard: React.FC<{
  icon: React.ReactNode;
  title: string;
  isExpanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  rightElement?: React.ReactNode;
}> = ({ icon, title, isExpanded, onToggle, children, rightElement }) => (
  <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mb-4">
    <div className="flex items-center justify-between pr-4 bg-white">
        <SectionHeader icon={icon} title={title} isExpanded={isExpanded} onToggle={onToggle} />
        {rightElement}
    </div>
    {isExpanded && (
      <div className="px-4 pb-4 pt-0 border-t border-gray-50 animate-in fade-in slide-in-from-top-1 duration-200">
        {children}
      </div>
    )}
  </div>
);

const COMMON_INVESTIGATIONS = [
  "Complete Blood Count (CBC)", "Blood Sugar - Fasting", "Blood Sugar - Post Prandial", 
  "HbA1c", "Lipid Profile", "Liver Function Test (LFT)", "Kidney Function Test (KFT)", 
  "Thyroid Profile", "Urine Routine", "X-Ray Chest", "X-Ray - Other", 
  "Ultrasound Abdomen", "ECG", "2D Echo", "CT Scan", "MRI", 
  "PFT (Pulmonary Function Test)", "Blood Pressure Monitoring"
];

export const DiagnosisTab: React.FC<DiagnosisTabProps> = ({ formData, setFormData, patientId }) => {
  const [isDiagnosisHistoryOpen, setIsDiagnosisHistoryOpen] = useState(false);
  const [isInvestigationsHistoryOpen, setIsInvestigationsHistoryOpen] = useState(false);
  
  const [historyData, setHistoryData] = useState<HistoryRecord[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [expanded, setExpanded] = useState({ diagnosis: true, investigations: true });

  const toggle = (section: keyof typeof expanded) =>
    setExpanded(prev => ({ ...prev, [section]: !prev[section] }));

  const fetchHistory = async (type: 'diagnoses' | 'investigations') => {
    if (!patientId) return;
    setIsLoadingHistory(true);
    try {
      const response = await apiClient.post('/patient-data', {
        action: type === 'diagnoses' ? 'getDiagnosisHistory' : 'getInvestigationsHistory',
        patientId: patientId
      });
      const data = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
      const parsedData = data?.body ? (typeof data.body === 'string' ? JSON.parse(data.body) : data.body) : data;
      
      let historyRecords: HistoryRecord[] = [];
      const items = parsedData.diagnosisHistory || parsedData.investigationsHistory || [];
      
      if (Array.isArray(items)) {
         historyRecords = items.map((item: any) => {
            if (type === 'diagnoses') {
               return {
                  date: item.createdAt || new Date().toISOString(),
                  title: item.diagnosis?.split('\n')[0] || 'Diagnosis',
                  details: item.diagnosis,
                  doctorName: item.doctorName || 'Dr. Tiwari'
               };
            } else {
               let standard = '';
               try {
                 if (Array.isArray(item.investigations)) {
                   standard = item.investigations.join(', ');
                 } else if (typeof item.investigations === 'string') {
                   if (item.investigations.trim().startsWith('[')) {
                     standard = JSON.parse(item.investigations).join(', ');
                   } else {
                     standard = item.investigations;
                   }
                 }
               } catch (e) {
                 standard = String(item.investigations || '');
               }

               const custom = item.customInvestigations ? `Other: ${item.customInvestigations}` : '';
               const details = [standard, custom].filter(Boolean).join(' | ');
               return {
                  date: item.createdAt || new Date().toISOString(),
                  title: 'Advised Investigations',
                  details: details,
                  doctorName: item.doctorName || 'Dr. Tiwari'
               };
            }
         });
      }
      setHistoryData(historyRecords);
    } catch (error) {
      console.error(`Failed to fetch ${type} history:`, error);
      setHistoryData([]); 
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleOpenDiagnosisHistory = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDiagnosisHistoryOpen(true);
    fetchHistory('diagnoses');
  };

  const handleOpenInvestigationsHistory = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsInvestigationsHistoryOpen(true);
    fetchHistory('investigations');
  };

  const handleCheckboxChange = (inv: string) => {
    const currentList = formData.selectedInvestigations || [];
    if (currentList.includes(inv)) {
      setFormData({ ...formData, selectedInvestigations: currentList.filter((i: string) => i !== inv) });
    } else {
      setFormData({ ...formData, selectedInvestigations: [...currentList, inv] });
    }
  };

  return (
    <div className="space-y-1 animate-in fade-in duration-300">
      
      {/* ── Current Diagnosis ── */}
      <SectionCard
        icon={<Activity className="w-5 h-5" />}
        title="Current Diagnosis"
        isExpanded={expanded.diagnosis}
        onToggle={() => toggle('diagnosis')}
      >
        <div className="space-y-3 pt-3">
          <div className="flex justify-between items-center mb-1">
            <p className="text-sm text-gray-500 font-medium">Diagnosis Details:</p>
            <button 
              type="button" 
              onClick={handleOpenDiagnosisHistory}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold hover:bg-blue-100 transition-colors shrink-0"
            >
              <Clock className="w-3.5 h-3.5" />
              History
            </button>
          </div>
          <AutoBulletTextArea 
            rows={5}
            placeholder="Enter primary and secondary diagnosis (e.g. Type 2 Diabetes, Hypertension)..." 
            className="w-full p-4 border border-gray-100 rounded-xl bg-blue-50/30 focus:bg-white focus:border-blue-300 outline-none text-sm font-medium transition-all resize-none"
            value={formData.diagnosis || ''}
            onChangeText={(text) => setFormData({ ...formData, diagnosis: text })}
          />
          <p className="text-[10px] text-gray-400 mt-1 ml-1 flex items-center gap-1">
            <span className="text-blue-400">ℹ️</span> This field automatically starts a bulleted list for clarity.
          </p>
        </div>
      </SectionCard>

      {/* ── Advised Investigations ── */}
      <SectionCard
        icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.691.387a2 2 0 01-1.132.252l-2.269-.454a2 2 0 00-1.715.747l-2.203 2.203a1 1 0 01-1.414-1.414l2.203-2.203a1 1 0 011.414 1.414l-2.203 2.203a1 1 0 01-1.414-1.414l2.203-2.203a2 2 0 00.747-1.715l-.454-2.269a2 2 0 01.252-1.132l.387-.691a6 6 0 00.517-3.86l-.477-2.387a2 2 0 00-.547-1.022L12 3l1.428 1.428a2 2 0 001.022.547l2.387.477a6 6 0 003.86-.517l.691-.387a2 2 0 011.132-.252l2.269.454a2 2 0 001.715-.747l2.203-2.203a1 1 0 011.414 1.414l-2.203 2.203a1 1 0 01-1.414-1.414l2.203-2.203a1 1 0 011.414 1.414l-2.203 2.203a2 2 0 00-.747 1.715l.454 2.269a2 2 0 01-.252 1.132l-.387.691a6 6 0 00-.517 3.86l.477 2.387a2 2 0 00.547 1.022L12 21l-1.428-1.428z" /></svg>}
        title="Investigations"
        isExpanded={expanded.investigations}
        onToggle={() => toggle('investigations')}
      >
        <div className="space-y-4 pt-4">
          <div className="flex justify-between items-center mb-1 -mt-2">
            <label className="text-sm text-gray-500 font-medium">Common Investigations:</label>
            <button 
              type="button" 
              onClick={handleOpenInvestigationsHistory}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold hover:bg-blue-100 transition-colors shrink-0"
            >
              <Clock className="w-3.5 h-3.5" />
              History
            </button>
          </div>
          <div className="bg-gray-50/50 p-3 rounded-xl border border-gray-100 grid grid-cols-2 gap-x-3 gap-y-1.5">
            {COMMON_INVESTIGATIONS.map((inv) => (
              <label key={inv} className="flex items-center gap-3 cursor-pointer group p-1.5 hover:bg-white rounded-lg transition-colors">
                <input 
                  type="checkbox" 
                  className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 transition-all cursor-pointer"
                  checked={(formData.selectedInvestigations || []).includes(inv)}
                  onChange={() => handleCheckboxChange(inv)}
                />
                <span className="text-xs font-medium text-gray-700 group-hover:text-gray-900">{inv}</span>
              </label>
            ))}
          </div>

          <div className="space-y-2 mt-4">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-tight ml-1">Other Investigations</label>
            <AutoBulletTextArea 
              rows={2}
              placeholder="Type any other tests not listed above..." 
              className="w-full p-3 border border-gray-100 rounded-lg bg-blue-50/30 focus:bg-white focus:border-blue-300 outline-none text-sm font-medium transition-all resize-none"
              value={formData.customInvestigations || ''}
              onChangeText={(text) => setFormData({ ...formData, customInvestigations: text })}
            />
            <p className="text-[10px] text-gray-400 mt-1 ml-1 flex items-center gap-1">
              <span className="text-blue-400">ℹ️</span> Lists tests in a bulleted format.
            </p>
          </div>
        </div>
      </SectionCard>

      <HistorySidebar
        isOpen={isDiagnosisHistoryOpen}
        onClose={() => setIsDiagnosisHistoryOpen(false)}
        title="Past Diagnoses"
        records={historyData}
        isLoading={isLoadingHistory}
      />
      <HistorySidebar
        isOpen={isInvestigationsHistoryOpen}
        onClose={() => setIsInvestigationsHistoryOpen(false)}
        title="Past Investigations"
        records={historyData}
        isLoading={isLoadingHistory}
      />
    </div>
  );
};

