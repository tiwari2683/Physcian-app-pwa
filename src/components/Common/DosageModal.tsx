import React, { useState } from 'react';

interface DosageModalProps {
  medicationName: string;
  defaultDosage?: string;
  onSave: (details: { dosage: string; frequency: string; durationDays: number }) => void;
  onCancel: () => void;
}

export const DosageModal: React.FC<DosageModalProps> = ({ 
  medicationName, 
  defaultDosage = '', 
  onSave, 
  onCancel 
}) => {
  const [dosage, setDosage] = useState(defaultDosage);
  const [frequency, setFrequency] = useState('BID (Twice a day)');
  const [durationDays, setDurationDays] = useState<number | ''>(5);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dosage || !frequency || !durationDays) return;
    
    onSave({
      dosage,
      frequency,
      durationDays: Number(durationDays),
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
        
        <div className="bg-blue-600 p-4 text-white flex justify-between items-center">
          <h3 className="font-bold text-lg">Prescribe: {medicationName}</h3>
          <button onClick={onCancel} className="text-white hover:text-gray-200 text-xl leading-none">&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Dosage</label>
            <input
              type="text"
              required
              value={dosage}
              onChange={(e) => setDosage(e.target.value)}
              placeholder="e.g., 500mg, 10ml"
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Frequency</label>
            <select
              value={frequency}
              onChange={(e) => setFrequency(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
            >
              <option value="OD (Once a day)">OD (Once a day)</option>
              <option value="BID (Twice a day)">BID (Twice a day)</option>
              <option value="TID (Three times a day)">TID (Three times a day)</option>
              <option value="QID (Four times a day)">QID (Four times a day)</option>
              <option value="SOS (As needed)">SOS (As needed)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Duration (Days)</label>
            <input
              type="number"
              required
              min="1"
              value={durationDays}
              onChange={(e) => setDurationDays(e.target.value === '' ? '' : Number(e.target.value))}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-md font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-md font-medium transition-colors"
            >
              Add to Prescription
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
