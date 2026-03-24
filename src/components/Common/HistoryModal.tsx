import React from 'react';

export interface HistoryRecord {
  date: string;
  title: string;
  details?: string;
  doctorName?: string;
}

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  records: HistoryRecord[];
  isLoading: boolean;
  /** Optional custom renderer for the record details. Receives the raw record and index. */
  renderDetails?: (record: HistoryRecord, index: number) => React.ReactNode;
}

export const HistoryModal: React.FC<HistoryModalProps> = ({ 
  isOpen, 
  onClose, 
  title, 
  records,
  isLoading,
  renderDetails
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col">
        
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-gray-200 bg-gray-50 rounded-t-xl">
          <h3 className="text-lg font-bold text-gray-800">{title}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-red-500 transition-colors text-2xl leading-none">
            &times;
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto flex-1">
          {isLoading ? (
            <div className="flex justify-center items-center py-10">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : records.length === 0 ? (
            <div className="text-center py-10 text-gray-400 italic">
              No historical records found for this patient.
            </div>
          ) : (
            <div className="space-y-4">
              {records.map((record, index) => (
                <div key={index} className="border border-gray-100 bg-white p-4 rounded-lg shadow-sm border-l-4 border-l-blue-500">
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-semibold text-gray-800">{record.title}</span>
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                      {new Date(record.date).toLocaleDateString()}
                    </span>
                  </div>
                  {renderDetails ? (
                    renderDetails(record, index)
                  ) : (
                    record.details && (
                      <p className="text-sm text-gray-600 mt-1">{record.details}</p>
                    )
                  )}
                  {record.doctorName && (
                    <div className="text-xs text-gray-400 mt-2 text-right">
                      Recorded by: {record.doctorName}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
