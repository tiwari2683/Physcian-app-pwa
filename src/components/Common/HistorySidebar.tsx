import React from 'react';
import { X } from 'lucide-react';

export interface HistoryRecord {
  date: string;
  title: string;
  details?: string;
  doctorName?: string;
}

interface HistorySidebarProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  records: HistoryRecord[];
  isLoading: boolean;
  /** Optional custom renderer for the record details. Receives the raw record and index. */
  renderDetails?: (record: HistoryRecord, index: number) => React.ReactNode;
}

export const HistorySidebar: React.FC<HistorySidebarProps> = ({ 
  isOpen, 
  onClose, 
  title, 
  records,
  isLoading,
  renderDetails
}) => {
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Slide-over Panel */}
      <div className="fixed inset-y-0 right-0 z-50 w-full md:w-[400px] lg:w-[450px] bg-white shadow-2xl flex flex-col transform transition-transform duration-300 ease-in-out border-l border-gray-200">
        
        {/* Header */}
        <div className="flex justify-between items-start p-6 border-b border-gray-100 bg-white">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              {/* Clinical History Icon */}
              <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 leading-tight">{title}</h3>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mt-0.5">Retrieved from longitudinal records</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto bg-[#F8FAFC]">
          {isLoading ? (
            <div className="flex justify-center items-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : records.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 h-full text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
                 <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                 </svg>
              </div>
              <div>
                <h4 className="font-extrabold text-gray-800 text-lg">No History Found</h4>
                <p className="text-sm text-gray-500 mt-2">Historical records will appear here after the patient's first longitudinal visit is locked.</p>
              </div>
            </div>
          ) : (
            <div className="p-6 space-y-6">
              {records.map((record, index) => (
                <div key={index} className="bg-white rounded-xl shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] border border-gray-100 overflow-hidden group hover:border-blue-200 transition-colors">
                  <div className="px-5 py-3 border-b border-gray-50 bg-gradient-to-r from-gray-50 to-white flex justify-between items-center">
                    <span className="font-bold text-gray-800 text-sm group-hover:text-blue-700 transition-colors">{record.title}</span>
                    <span className="text-[10px] font-black tracking-widest text-[#2563EB] bg-blue-50 px-2.5 py-1 rounded-full uppercase">
                      {new Date(record.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                  <div className="px-5 py-4">
                    {renderDetails ? (
                      renderDetails(record, index)
                    ) : (
                      record.details && (
                        <p className="text-sm text-gray-600 leading-relaxed font-medium whitespace-pre-wrap">{record.details}</p>
                      )
                    )}
                    {record.doctorName && (
                      <div className="mt-3 pt-3 border-t border-gray-50 flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full bg-purple-100 flex items-center justify-center">
                          <span className="text-[10px] font-bold text-purple-700">Dr</span>
                        </div>
                        <span className="text-xs font-semibold text-gray-500">
                          {record.doctorName}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="p-4 bg-white border-t border-gray-100 text-center">
           <p className="text-[10px] italic text-gray-400 font-medium">Viewing historical snapshots from patient visit history. Data is strictly read-only and contextually grouped.</p>
        </div>
      </div>
    </>
  );
};
