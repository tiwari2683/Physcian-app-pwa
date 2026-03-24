import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Pill, Trash2, Search, Plus, Clock, ChevronDown, Printer } from 'lucide-react';
import { apiClient } from '../../services/api/apiClient';

export interface Medication {
  id?: string;
  name: string;
  dosage?: string;
  timing?: string;
  timingValues?: string;
  duration?: string;
  durationDays?: number;
  frequency?: string;
  specialInstructions?: string;
  datePrescribed?: string;
}

interface SmartPrescriptionEngineProps {
  prescriptions: Medication[];
  setPrescriptions: (meds: Medication[]) => void;
  patientId?: string; // For past visits
  onGeneratePast?: (meds: Medication[]) => Promise<void>;
}

// Exact replication of RN Regex Expiration Engine
const calculateMedicationExpiration = (datePrescribed?: string, duration?: string) => {
  if (!datePrescribed || !duration) return null;
  const durationRegex = /(\d+)\s*(day|days|week|weeks|month|months)/i;
  let match = duration.match(durationRegex);
  
  if (!match) {
    // fallback if user just typed a number or durationDays was used
    const durationDaysMatch = duration.match(/(\d+)/);
    if (!durationDaysMatch) return null;
    match = ['', durationDaysMatch[1], 'days'];
  }

  const amount = parseInt(match[1]);
  const unit = match[2].toLowerCase();
  
  const startDate = new Date(datePrescribed);
  const expirationDate = new Date(startDate);
  
  switch (unit) {
    case "day":
    case "days":
      expirationDate.setDate(startDate.getDate() + amount);
      break;
    case "week":
    case "weeks":
      expirationDate.setDate(startDate.getDate() + amount * 7);
      break;
    case "month":
    case "months":
      expirationDate.setMonth(startDate.getMonth() + amount);
      break;
    default:
      return null;
  }
  
  const now = new Date();
  const diffTime = expirationDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) {
    return { status: 'Expired', color: 'bg-red-100 text-red-700 border-red-200', text: `Expired ${Math.abs(diffDays)} days ago` };
  } else if (diffDays <= 3) {
    return { status: 'Expiring Soon', color: 'bg-orange-100 text-orange-700 border-orange-200', text: `Expires in ${diffDays} days` };
  } else {
    return { status: 'Active', color: 'bg-green-100 text-green-700 border-green-200', text: `Expires in ${diffDays} days` };
  }
};

const timingOptions = [
  { id: "morning", label: "Morning" },
  { id: "afternoon", label: "Afternoon" },
  { id: "evening", label: "Evening" },
  { id: "night", label: "Night" },
];

const MedicationCard = ({ med, index, updateMedication, removeMedication, isReadOnly = false }: any) => {
  const [expanded, setExpanded] = useState(false);
  const [selectedTimings, setSelectedTimings] = useState<string[]>(med.timing ? med.timing.split(",") : []);
  const [timingValues, setTimingValues] = useState<{ [key: string]: string }>(med.timingValues ? JSON.parse(med.timingValues) : {});

  // For PWA testing safely mapping duration or durationDays string
  const durationStr = med.duration || (med.durationDays ? `${med.durationDays} days` : "");
  const expStatus = calculateMedicationExpiration(med.datePrescribed, durationStr);
  const isToday = med.datePrescribed && new Date(med.datePrescribed).toDateString() === new Date().toDateString();

  const toggleTiming = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const newTimings = selectedTimings.includes(id) ? selectedTimings.filter((t) => t !== id) : [...selectedTimings, id];
    setSelectedTimings(newTimings);
    updateMedication(index, "timing", newTimings.join(","));
    if (!newTimings.includes(id)) {
      const newVals = { ...timingValues };
      delete newVals[id];
      setTimingValues(newVals);
      updateMedication(index, "timingValues", JSON.stringify(newVals));
    }
  };

  const handleTimingValue = (id: string, val: string) => {
    const newVals = { ...timingValues, [id]: val };
    setTimingValues(newVals);
    updateMedication(index, "timingValues", JSON.stringify(newVals));
  };

  return (
    <div className={`flex flex-col bg-white border ${isToday ? 'border-blue-200 shadow-sm' : 'border-gray-200'} rounded-xl overflow-hidden mb-3 transition-all duration-300`}>
      {/* Header (Always Visible) */}
      <div 
        className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50 active:bg-gray-100 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <Pill className="w-5 h-5 text-blue-600 flex-shrink-0" />
            <span className="font-bold text-gray-900 text-base">{med.name}</span>
            {isToday && <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">New</span>}
          </div>
          {expStatus && (
            <div className={`mt-1.5 inline-flex items-center px-2 py-0.5 rounded border ${expStatus.color}`}>
              <span className={`text-[10px] font-bold`}>{expStatus.text}</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          {!isReadOnly && (
            <button onClick={(e) => { e.stopPropagation(); removeMedication(index); }} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          {isReadOnly && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-gray-100 rounded-md border border-gray-200">
              <Clock className="w-3.5 h-3.5 text-gray-500" />
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">History</span>
            </div>
          )}
          <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`} />
        </div>
      </div>

      {/* Expanded Body (Smooth Mobile-first CSS Transition) */}
      <div 
        className="grid transition-all duration-300 ease-in-out"
        style={{ gridTemplateRows: expanded ? '1fr' : '0fr', opacity: expanded ? 1 : 0 }}
      >
        <div className="overflow-hidden">
          <div className="p-4 pt-0 border-t border-gray-100 space-y-4">
            
            {/* Timing Granular Picker */}
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Timing & Dosage</label>
              <div className="flex flex-wrap gap-2">
                {timingOptions.map(t => (
                  <div key={t.id} className="flex flex-col gap-1 w-[80px]">
                    <button 
                      onClick={(e) => !isReadOnly && toggleTiming(e, t.id)}
                      disabled={isReadOnly}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-colors ${selectedTimings.includes(t.id) ? 'bg-blue-600 border-blue-600 text-white shadow-sm' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50 bg-opacity-50'} ${isReadOnly && selectedTimings.includes(t.id) ? 'opacity-80' : ''}`}
                    >
                      {t.label}
                    </button>
                    {selectedTimings.includes(t.id) && (
                      <input 
                        type="text" 
                        placeholder="Qty" 
                        value={timingValues[t.id] || ''}
                        onChange={(e) => handleTimingValue(t.id, e.target.value)}
                        disabled={isReadOnly}
                        className="w-full text-center p-1.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-blue-500 bg-gray-50 disabled:bg-gray-100 disabled:text-gray-500"
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Duration</label>
                <input 
                  type="text" 
                  value={durationStr}
                  onChange={(e) => updateMedication(index, "duration", e.target.value)}
                  disabled={isReadOnly}
                  placeholder="e.g. 5 days, 1 month"
                  className="w-full p-2 border border-gray-200 rounded-lg outline-none focus:border-blue-400 text-sm disabled:bg-gray-50 disabled:text-gray-600"
                />
              </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Special Instructions</label>
              <input 
                type="text" 
                value={med.specialInstructions || ''}
                onChange={(e) => updateMedication(index, "specialInstructions", e.target.value)}
                disabled={isReadOnly}
                placeholder="e.g. After meals"
                className="w-full p-2 border border-gray-200 rounded-lg outline-none focus:border-blue-400 text-sm disabled:bg-gray-50 disabled:text-gray-600"
              />
            </div>
            
          </div>
        </div>
      </div>
    </div>
  );
};

export const SmartPrescriptionEngine: React.FC<SmartPrescriptionEngineProps> = ({ prescriptions, setPrescriptions, patientId, onGeneratePast }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isAddingMedicine, setIsAddingMedicine] = useState(false);
  
  // Add state for past prescriptions
  const [pastPrescriptions, setPastPrescriptions] = useState<Medication[]>([]);
  // Track expanded state for past groups
  const [expandedPastGroups, setExpandedPastGroups] = useState<Record<string, boolean>>({});

  // Strict Cache & UI Flush Guards mimicking RN
  const localCache = useRef(new Map<string, any[]>());
  const selectionMade = useRef(false);

  useEffect(() => {
    if (!patientId) return;
    const fetchPast = async () => {
      try {
        const response = await apiClient.post('/patient-data', { action: 'getPrescriptionHistory', patientId });
        const data = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
        const parsedData = data?.body ? (typeof data.body === 'string' ? JSON.parse(data.body) : data.body) : data;
        
        let allPastMeds: Medication[] = [];
        if (parsedData?.clinicalHistory?.length) {
            parsedData.clinicalHistory.forEach((visit: any) => {
                if (visit.medications && visit.medications.length > 0) {
                    const medsWithDate = visit.medications.map((m: any) => ({
                        ...m,
                        datePrescribed: m.datePrescribed || visit.visitDate || visit.date || new Date().toISOString()
                    }));
                    allPastMeds = [...allPastMeds, ...medsWithDate];
                }
            });
        } else if (parsedData && Array.isArray(parsedData)) {
            parsedData.forEach((visit: any) => {
                if (visit.medications && visit.medications.length > 0) {
                    const medsWithDate = visit.medications.map((m: any) => ({
                        ...m,
                        datePrescribed: m.datePrescribed || visit.visitDate || visit.createdAt || new Date().toISOString()
                    }));
                    allPastMeds = [...allPastMeds, ...medsWithDate];
                }
            });
        }
        setPastPrescriptions(allPastMeds);
      } catch(e) {
        console.error("Failed to fetch past prescriptions on mount", e);
      }
    };
    fetchPast();
  }, [patientId]);

  useEffect(() => {
    if (selectionMade.current) {
      selectionMade.current = false;
      return;
    }
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      setSearchResults([]);
      return;
    }
    
    // Strict Testing Map Cache Strategy
    if (localCache.current.has(query)) {
       setSearchResults(localCache.current.get(query) || []);
       return;
    }

    const timer = setTimeout(() => {
      fetchMedications(query);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchMedications = async (query: string) => {
    setIsSearching(true);
    try {
      const response = await apiClient.post('/patient-data', {
        action: 'searchMedicines',
        query: query
      });
      const data = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
      const parsedData = data?.body ? (typeof data.body === 'string' ? JSON.parse(data.body) : data.body) : data;

      if (parsedData.success && parsedData.medicines) {
        const formattedResults = parsedData.medicines.map((medName: string) => ({
          id: medName, name: medName, dosage: '',
        }));
        localCache.current.set(query, formattedResults);
        setSearchResults(formattedResults);
      } else {
        localCache.current.set(query, []);
        setSearchResults([]);
      }
    } catch (error) {
      console.error('Failed to fetch medicines:', error);
      localCache.current.set(query, []);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const addNewMedicineToDatabase = async (name: string) => {
    setIsAddingMedicine(true);
    try {
      const response = await apiClient.post('/patient-data', {
        action: 'addMedicine', 
        name: name
      });
      const data = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
      const parsedData = data?.body ? (typeof data.body === 'string' ? JSON.parse(data.body) : data.body) : data;

      if (parsedData.success) {
        handleSelectMedication({ name });
      } else {
        alert(parsedData.error || "Failed to add medicine to database");
      }
    } catch (error) {
      console.error('Failed to add medicine:', error);
      alert("Network Error: Could not add medicine");
    } finally {
      setIsAddingMedicine(false);
    }
  };

  const handleSelectMedication = (med: Partial<Medication>) => {
    selectionMade.current = true;
    const newPrescription: Medication = {
      id: med.name + '-' + Date.now(),
      name: med.name!, // Non-null
      datePrescribed: new Date().toISOString(),
      duration: "5 days",
      timing: "morning,night",
      timingValues: JSON.stringify({ morning: "1", night: "1" }),
      dosage: "",
      specialInstructions: "After meals"
    };
    
    // Check if retroactively adding to a past visit group (advanced UI flow placeholder)
    setPrescriptions([newPrescription, ...prescriptions]);
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const query = searchQuery.trim();
      if (query && searchResults.length === 0 && !isSearching) {
         // Auto-append un-cached string
         handleSelectMedication({ name: query });
      } else if (searchResults.length > 0) {
        handleSelectMedication(searchResults[0]);
      }
    }
  };

  const updateMedication = (idx: number, field: string, value: string) => {
    const updated = [...prescriptions];
    updated[idx] = { ...updated[idx], [field]: value };
    setPrescriptions(updated);
  };

  const removeMedication = (idx: number) => {
    const updated = [...prescriptions];
    updated.splice(idx, 1);
    setPrescriptions(updated);
  };
  
  // Grouping by Date for Retroactive View Tracking (Current)
  const groupedMeds = useMemo(() => {
    const groups: Record<string, Medication[]> = {};
    prescriptions.forEach(med => {
      const dateStr = med.datePrescribed ? new Date(med.datePrescribed).toDateString() : new Date().toDateString();
      if (!groups[dateStr]) groups[dateStr] = [];
      groups[dateStr].push(med);
    });
    return Object.entries(groups).sort((a,b) => new Date(b[0]).getTime() - new Date(a[0]).getTime());
  }, [prescriptions]);

  // Grouping by Date for Past
  const groupedPastMeds = useMemo(() => {
    const groups: Record<string, Medication[]> = {};
    pastPrescriptions.forEach(med => {
      const dateStr = med.datePrescribed ? new Date(med.datePrescribed).toDateString() : 'Unknown Date';
      if (!groups[dateStr]) groups[dateStr] = [];
      groups[dateStr].push(med);
    });
    return Object.entries(groups).sort((a,b) => new Date(b[0]).getTime() - new Date(a[0]).getTime());
  }, [pastPrescriptions]);

  return (
    <div className="space-y-6">
      
      {/* Top Actions & Search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Search Medication</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="e.g. Paracetamol..."
              className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none shadow-sm transition-shadow font-medium text-gray-800 bg-white"
            />
            {isSearching && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}
          </div>

          {/* Autocomplete Dropdown */}
          {searchQuery.trim() && !selectionMade.current && (
            <div className="absolute z-20 w-full mt-1 bg-white border border-gray-100 rounded-xl shadow-[0_10px_40px_-15px_rgba(0,0,0,0.1)] max-h-80 overflow-y-auto">
              {searchResults.length > 0 ? searchResults.map((result, idx) => (
                <button
                  key={idx} type="button" onClick={() => handleSelectMedication(result)}
                  className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-50 flex items-center gap-3 transition-colors last:border-0"
                >
                  <div className="p-1.5 bg-blue-50/50 rounded-lg">
                    <Pill className="w-4 h-4 text-blue-600" />
                  </div>
                  <span className="font-bold text-gray-700">{result.name}</span>
                </button>
              )) : null}

              {/* Add New Medicine Section */}
              {!isSearching && !searchResults.some(r => r.name.toLowerCase() === searchQuery.trim().toLowerCase()) && (
                <div className="p-3 border-t border-gray-100 bg-gray-50/50">
                  <div className="flex items-center gap-2 mb-2 p-2 bg-gray-100/80 rounded-lg">
                     <span className="text-xs font-medium text-gray-600">Medicine not found in database</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => addNewMedicineToDatabase(searchQuery.trim())}
                    disabled={isAddingMedicine}
                    className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-lg font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isAddingMedicine ? (
                       <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                       <><Plus className="w-5 h-5" /> Add "{searchQuery.trim()}" to Database</>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Regimen Display Grouped by Date */}
      <div className="space-y-6 pt-2">
        {groupedMeds.map(([dateStr, meds]) => {
          const isToday = dateStr === new Date().toDateString();
          return (
             <div key={dateStr} className="space-y-3 relative group">
                <div className="flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur-md p-2 z-10 rounded-lg shadow-sm border border-gray-100/50">
                   <h4 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-blue-600" /> 
                      {isToday ? "Current Visit" : `Past Visit: ${new Date(dateStr).toLocaleDateString()}`}
                   </h4>
                   {!isToday && (
                     <button 
                        onClick={() => {
                           const newMed = { id: `Retro-${Date.now()}`, name: "Paracetamol", datePrescribed: dateStr, timing: "morning", duration: "1 week" };
                           setPrescriptions([...prescriptions, newMed]);
                        }} 
                        title="Add medication retroactively to this past visit block"
                        className="text-[10px] uppercase font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-md hover:bg-blue-100 transition-colors flex items-center gap-1 opacity-0 group-hover:opacity-100"
                     >
                        <Plus className="w-3 h-3" /> Retro Add
                     </button>
                   )}
                </div>
                <div className="space-y-2">
                  {meds.map((med) => {
                     // Find absolute index mapping based on exact matching ID in original prescriptions array
                     const idx = prescriptions.findIndex(p => p.id === med.id);
                     return <MedicationCard key={med.id || Math.random()} med={med} index={idx} updateMedication={updateMedication} removeMedication={removeMedication} />;
                  })}
                </div>
             </div>
          );
        })}
        {prescriptions.length === 0 && (
          <div className="text-center py-12 bg-gray-50/50 rounded-2xl border-2 border-dashed border-gray-200">
            <Pill className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-600 font-bold text-base">No active medications prescribed.</p>
            <p className="text-sm text-gray-400 mt-1 font-medium">Search the master database or quickly copy from the patient's history.</p>
          </div>
        )}
      </div>

      {/* Past Prescriptions List (Read-only) */}
      {groupedPastMeds.length > 0 && (
          <div className="space-y-4 pt-6 mt-8 border-t-2 border-dashed border-gray-200">
             <div className="flex items-center gap-3 mb-2">
               <Clock className="w-5 h-5 text-gray-400" />
               <h3 className="text-sm font-black text-gray-500 uppercase tracking-widest">Previous Prescriptions</h3>
             </div>
             
             {groupedPastMeds.map(([dateStr, meds]) => {
                const isExpanded = !!expandedPastGroups[dateStr];
                
                return (
                 <div key={dateStr} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm transition-all duration-300">
                    <div 
                      className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                      onClick={() => setExpandedPastGroups(prev => ({ ...prev, [dateStr]: !isExpanded }))}
                    >
                      <div>
                         <h4 className="font-bold text-gray-900 text-[15px]">Prescription: {new Date(dateStr).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</h4>
                         <span className="text-xs font-semibold text-gray-500">{meds.length} medication{meds.length !== 1 ? 's' : ''}</span>
                      </div>
                      <div className="flex items-center gap-3">
                         {onGeneratePast && (
                           <button 
                             onClick={(e) => { 
                                e.stopPropagation(); 
                                onGeneratePast(meds); 
                             }}
                             className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-[13px] font-bold transition-all shadow-sm active:scale-95"
                           >
                             <Printer className="w-4 h-4" /> Generate
                           </button>
                         )}
                         <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
                      </div>
                    </div>

                    <div 
                      className="grid transition-all duration-300 ease-in-out bg-gray-50/50"
                      style={{ gridTemplateRows: isExpanded ? '1fr' : '0fr', opacity: isExpanded ? 1 : 0 }}
                    >
                      <div className="overflow-hidden">
                        <div className="p-3 border-t border-gray-100 space-y-2">
                          {meds.map((med, idx) => (
                             <MedicationCard 
                               key={med.id || Math.random()} 
                               med={med} 
                               index={idx} 
                               updateMedication={() => {}} 
                               removeMedication={() => {}} 
                               isReadOnly={true}
                             />
                          ))}
                        </div>
                      </div>
                    </div>
                 </div>
                );
             })}
          </div>
      )}
    </div>
  );
};
