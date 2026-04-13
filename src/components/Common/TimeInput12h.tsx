import React, { useMemo } from 'react';

interface TimeInput12hProps {
  label: string;
  value: string; // HH:mm (24h format)
  onChange: (value: string) => void;
  required?: boolean;
}

export const TimeInput12h: React.FC<TimeInput12hProps> = ({ label, value, onChange, required }) => {
  // Parse HH:mm into 12h pieces
  const { hour12, minutes, period } = useMemo(() => {
    if (!value || !value.includes(':')) {
      return { hour12: '09', minutes: '00', period: 'AM' };
    }
    const [h24, m] = value.split(':');
    let h = parseInt(h24, 10);
    const p = h >= 12 ? 'PM' : 'AM';
    h = h % 12;
    if (h === 0) h = 12;
    return {
      hour12: h.toString().padStart(2, '0'),
      minutes: m,
      period: p
    };
  }, [value]);

  const updateTime = (h12: string, m: string, p: string) => {
    let h24 = parseInt(h12, 10);
    if (p === 'PM' && h24 !== 12) h24 += 12;
    if (p === 'AM' && h24 === 12) h24 = 0;
    
    const h24Str = h24.toString().padStart(2, '0');
    onChange(`${h24Str}:${m}`);
  };

  const hours = Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, '0'));
  const minuteOptions = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));

  return (
    <div className="space-y-1">
      <label className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-gray-500 ml-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className="flex gap-2">
        {/* Hour Select */}
        <select
          value={hour12}
          onChange={(e) => updateTime(e.target.value, minutes, period)}
          className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-semibold cursor-pointer"
        >
          {hours.map(h => <option key={h} value={h}>{h}</option>)}
        </select>

        {/* Minute Select */}
        <select
          value={minutes}
          onChange={(e) => updateTime(hour12, e.target.value, period)}
          className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-semibold cursor-pointer"
        >
          {minuteOptions.map(m => <option key={m} value={m}>{m}</option>)}
        </select>

        {/* AM/PM Select */}
        <select
          value={period}
          onChange={(e) => updateTime(hour12, minutes, e.target.value)}
          className="w-20 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-semibold cursor-pointer"
        >
          <option value="AM">AM</option>
          <option value="PM">PM</option>
        </select>
      </div>
    </div>
  );
};
