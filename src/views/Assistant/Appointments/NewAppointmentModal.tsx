import { useState, useEffect } from 'react';
import { useAppDispatch } from '../../../controllers/hooks/hooks';
import { 
    createAsstAppointmentThunk, 
    createAsstPatientAndAppointmentThunk 
} from '../../../controllers/assistant/asstThunks';
import { X, Search, Loader2, Calendar } from 'lucide-react';
import type { Appointment } from '../../../models/index';
import { patientService } from '../../../services/api/patientService';
import toast from 'react-hot-toast';
import { TimeInput12h } from '../../../components/Common/TimeInput12h';
import { useSubscription } from '../../../controllers/hooks/useSubscription';
import {
    assertSubscriptionActive,
    isSubscriptionBlockedError,
} from '../../../services/subscription/subscriptionAccess';

interface Props {
    onClose: () => void;
    initialData?: Appointment | null;
}

export const NewAppointmentModal: React.FC<Props> = ({ onClose, initialData }) => {
    const dispatch = useAppDispatch();
    const { isExpired } = useSubscription();
    const [loading, setLoading] = useState(false);
    
    // Existing vs New Mode
    const [mode, setMode] = useState<'existing' | 'new'>('existing');
    
    // Search State
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);

    const emptyForm = {
        patientName: '',
        age: '',
        mobile: '',
        sex: 'Male' as 'Male' | 'Female' | 'Other',
        address: '',
        type: 'Follow-up',
        date: '',
        time: '09:00'
    };

    const [formData, setFormData] = useState(emptyForm);

    useEffect(() => {
        if (initialData) {
            setFormData({
                patientName: initialData.patientName || '',
                age: initialData.age?.toString() || '',
                mobile: initialData.mobile || '',
                sex: (initialData.sex as 'Male' | 'Female' | 'Other') || 'Male',
                address: initialData.address || '',
                type: initialData.type || 'Follow-up',
                date: initialData.date || '',
                time: initialData.time || ''
            });
            // If editing an existing appointment, we should lock to the associated patient if present
            if (initialData.patientId) {
                setSelectedPatientId(initialData.patientId);
                setMode('existing');
            } else {
                setMode('new');
            }
        }
    }, [initialData]);

    // Search Debounce Effect
    useEffect(() => {
        if (mode !== 'existing' || searchQuery.trim().length < 1) {
            setSearchResults([]);
            return;
        }
        
        const delayDebounceFn = setTimeout(async () => {
            setIsSearching(true);
            try {
                const results = await patientService.searchPatients(searchQuery);
                setSearchResults(results);
            } catch (e) {
                console.error("Search failed", e);
            } finally {
                setIsSearching(false);
            }
        }, 300);
        
        return () => clearTimeout(delayDebounceFn);
    }, [searchQuery, mode]);

    const handleSelectPatient = async (patient: any) => {
        setIsSearching(true);
        try {
            // Fetch the full profile to guarantee we get the address and other complete details
            const profile = await patientService.getPatientById(patient.patientId);
            // patientService.getPatientById returns the raw patient object or parses it internally

            setSelectedPatientId(patient.patientId);
            setFormData(prev => ({
                ...prev,
                patientName: profile.name || patient.name || '',
                age: profile.age ? profile.age.toString() : (patient.age ? patient.age.toString() : ''),
                mobile: profile.mobile || patient.mobile || '',
                sex: (profile.sex as 'Male' | 'Female' | 'Other') || patient.sex || 'Male',
                address: profile.address || patient.address || ''
            }));
        } catch (error) {
            console.error("Failed to fetch full patient profile:", error);
            // Fallback to search result data
            setSelectedPatientId(patient.patientId);
            setFormData(prev => ({
                ...prev,
                patientName: patient.name || '',
                age: patient.age ? patient.age.toString() : '',
                mobile: patient.mobile || '',
                sex: (patient.sex as 'Male' | 'Female' | 'Other') || 'Male',
                address: patient.address || ''
            }));
        } finally {
            setSearchQuery('');
            setSearchResults([]);
            setIsSearching(false);
        }
    };

    const handleChangeMode = (newMode: 'existing' | 'new') => {
        setMode(newMode);
        setSelectedPatientId(null);
        setSearchQuery('');
        setSearchResults([]);
        setFormData(prev => ({
            ...emptyForm,
            type: 'First Visit', // Default for new patients
            date: prev.date,
            time: prev.time
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            assertSubscriptionActive(
                isExpired,
                'Subscription expired. New appointments cannot be booked.'
            );
        } catch {
            return;
        }

        // Mobile validation for Indian numbers (10 digits starting with 6-9)
        if (mode === 'new') {
            if (!/^[6-9]\d{9}$/.test(formData.mobile)) {
                toast.error('Please enter a valid 10-digit Indian mobile number.');
                return;
            }
        }

        setLoading(true);

        try {
            if (mode === 'new' && !initialData) {
                // ── NEW PATIENT ────────────────────────────────────────────────
                // Step 1 creates the Patient record, Step 2 creates the
                // Appointment linked to the new patientId.
                await dispatch(createAsstPatientAndAppointmentThunk({
                    patientData: {
                        name: formData.patientName,
                        age: formData.age,
                        sex: formData.sex,
                        mobile: formData.mobile,
                        address: formData.address,
                    },
                    appointmentData: {
                        patientName: formData.patientName,
                        age: formData.age,
                        mobile: formData.mobile,
                        sex: formData.sex,
                        address: formData.address,
                        date: formData.date,
                        time: formData.time,
                        type: formData.type,
                        status: 'Upcoming',
                    },
                })).unwrap();
            } else {
                // ── EXISTING PATIENT or EDIT ───────────────────────────────────
                await dispatch(createAsstAppointmentThunk({
                    ...(initialData?.id ? { id: initialData.id } : {}),
                    patientId: selectedPatientId || undefined,
                    patientName: formData.patientName,
                    age: formData.age,
                    mobile: formData.mobile,
                    sex: formData.sex,
                    address: formData.address,
                    date: formData.date,
                    time: formData.time,
                    type: formData.type,
                    status: initialData?.status || 'Upcoming',
                })).unwrap();
            }

            onClose();
        } catch (error) {
            if (isSubscriptionBlockedError(error)) return;
            console.error('Failed to save appointment', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-3xl shadow-premium w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh] border border-borderColor animate-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center px-6 py-4 border-b border-slate-50 bg-white">
                    <h2 className="text-base font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                        <Calendar size={18} className="text-primary-base" /> {initialData ? 'Edit Appointment' : 'New Appointment'}
                    </h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-rose-500 transition-all p-2 rounded-xl hover:bg-rose-50/50">
                        <X size={18} />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto custom-scrollbar bg-white">
                    <form id="new-appointment-form" onSubmit={handleSubmit} className="space-y-6">

                        {/* Toggle Mode */}
                        {!initialData && (
                            <div className="flex bg-slate-50 rounded-2xl p-1.5 border border-slate-100 shadow-inner">
                                <button
                                    type="button"
                                    onClick={() => handleChangeMode('existing')}
                                    className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.15em] transition-all ${mode === 'existing' ? 'bg-white text-primary-base shadow-sm border border-slate-100/50' : 'text-slate-400 hover:text-slate-600'}`}
                                >
                                    Existing Patient
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleChangeMode('new')}
                                    className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.15em] transition-all ${mode === 'new' ? 'bg-white text-primary-base shadow-sm border border-slate-100/50' : 'text-slate-400 hover:text-slate-600'}`}
                                >
                                    New Patient
                                </button>
                            </div>
                        )}

                        {/* Search Section for Existing Patient */}
                        {mode === 'existing' && !selectedPatientId && (
                            <div className="relative space-y-2 animate-in fade-in duration-300">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Search Identifier</label>
                                <div className="relative">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                    <input
                                        type="text"
                                        placeholder="Search by patient name or mobile number..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:ring-4 focus:ring-primary-base/5 focus:border-primary-base focus:outline-none text-sm text-slate-700 transition-all font-bold placeholder:text-slate-300"
                                    />
                                    {isSearching && (
                                        <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 text-primary-base animate-spin" size={16} />
                                    )}
                                </div>
                                <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest ml-1">Start typing to search across records</p>
                                
                                {searchResults.length > 0 && (
                                    <div className="absolute top-full left-0 right-0 mt-3 bg-white border border-slate-100 shadow-2xl rounded-2xl z-50 max-h-72 overflow-y-auto ring-4 ring-slate-900/5 animate-in fade-in slide-in-from-top-2 duration-200">
                                        <div className="p-2 space-y-1">
                                            {searchResults.map((patient, idx) => (
                                                <button
                                                    key={patient.patientId || idx}
                                                    type="button"
                                                    onClick={() => handleSelectPatient(patient)}
                                                    className="w-full text-left px-4 py-3.5 hover:bg-primary-base/[0.03] rounded-xl transition-all group border border-transparent hover:border-primary-base/10"
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <div className="font-black text-type-heading text-sm group-hover:text-primary-base transition-colors">{patient.name}</div>
                                                        <div className="text-[10px] font-black text-slate-300 group-hover:text-primary-base/30 uppercase tracking-tighter">{patient.patientId?.slice(-6)}</div>
                                                    </div>
                                                    <div className="flex flex-wrap items-center gap-2 mt-2">
                                                        <span className="text-[9px] font-black bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md uppercase tracking-wider">{patient.mobile || "N/A"}</span>
                                                        <span className="text-[9px] font-black bg-blue-50 text-blue-600 px-2 py-0.5 rounded-md uppercase tracking-wider">{patient.age}Y</span>
                                                        <span className={`text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider ${patient.sex === 'Female' ? 'bg-rose-50 text-rose-600' : 'bg-indigo-50 text-indigo-600'}`}>
                                                            {patient.sex}
                                                        </span>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {searchQuery.trim().length >= 3 && !isSearching && searchResults.length === 0 && (
                                    <div className="absolute top-full left-0 right-0 mt-3 bg-white border border-slate-100 shadow-xl rounded-2xl z-50 p-8 text-center animate-in fade-in slide-in-from-top-2 duration-200">
                                        <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3">
                                            <Search className="text-slate-200" size={24} />
                                        </div>
                                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest">No Patients Found</p>
                                        <p className="text-[11px] text-slate-300 mt-1">Try a different name or mobile number</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Selected Patient Banner */}
                        {mode === 'existing' && selectedPatientId && !initialData && (
                            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex justify-between items-center shadow-xl relative overflow-hidden group">
                                <div className="absolute -right-4 -top-4 w-24 h-24 bg-primary-base/10 rounded-full blur-2xl group-hover:bg-primary-base/20 transition-all"></div>
                                <div className="relative z-10 flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary-base to-indigo-600 text-white flex items-center justify-center font-black text-base shadow-lg">
                                        {formData.patientName?.charAt(0)}
                                    </div>
                                    <div>
                                        <div className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">Active Selection</div>
                                        <div className="text-white font-black text-sm tracking-tight">{formData.patientName}</div>
                                        <div className="flex items-center gap-2 mt-1 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                            <span>{formData.age} yrs</span>
                                            <span>·</span>
                                            <span>{formData.sex}</span>
                                        </div>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => { 
                                        setSelectedPatientId(null); 
                                        setFormData(prev => ({ ...emptyForm, type: prev.type, date: prev.date, time: prev.time })); 
                                    }}
                                    className="relative z-10 text-[9px] font-black text-white hover:text-rose-400 uppercase tracking-widest bg-white/5 hover:bg-white/10 px-4 py-1.5 rounded-xl border border-white/10 transition-all active:scale-95"
                                >
                                    Change
                                </button>
                            </div>
                        )}

                        {/* ── Patient Details ── */}
                        {(mode === 'new' || selectedPatientId) && (
                            <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                <h3 className="text-[10px] font-black tracking-widest text-slate-400 uppercase">Patient Verification</h3>
                                
                                <div className="space-y-1 text-xs">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Full Name</label>
                                    <input
                                        type="text"
                                        value={formData.patientName}
                                        onChange={(e) => setFormData({ ...formData, patientName: e.target.value })}
                                        placeholder="Enter patient's legal name"
                                        className={`w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl focus:bg-white focus:ring-4 focus:ring-primary-base/5 focus:border-primary-base focus:outline-none text-sm font-bold text-slate-700 transition-all ${mode === 'existing' ? 'opacity-70 cursor-not-allowed' : ''}`}
                                        disabled={mode === 'existing'}
                                        required
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1 text-xs">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Age</label>
                                        <input
                                            type="number"
                                            value={formData.age}
                                            onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                                            placeholder="Years"
                                            className={`w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl focus:bg-white focus:ring-4 focus:ring-primary-base/5 focus:border-primary-base focus:outline-none text-sm font-bold text-slate-700 transition-all ${mode === 'existing' ? 'opacity-70 cursor-not-allowed' : ''}`}
                                            disabled={mode === 'existing'}
                                            required
                                        />
                                    </div>
                                    <div className="space-y-1 text-xs">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Mobile</label>
                                        <input
                                            type="tel"
                                            value={formData.mobile}
                                            onChange={(e: any) => {
                                                const clean = e.target.value.replace(/\D/g, '').slice(0, 10);
                                                setFormData({ ...formData, mobile: clean });
                                            }}
                                            placeholder="10-digit number"
                                            maxLength={10}
                                            className={`w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl focus:bg-white focus:ring-4 focus:ring-primary-base/5 focus:border-primary-base focus:outline-none text-sm font-bold text-slate-700 transition-all ${mode === 'existing' ? 'opacity-70 cursor-not-allowed' : ''}`}
                                            disabled={mode === 'existing'}
                                            required
                                        />
                                    </div>
                                </div>

                                {/* Sex — Radio Group */}
                                <div className="flex flex-col gap-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Sex</label>
                                    <div className="flex gap-4 mt-1 bg-slate-50/50 p-4 rounded-2xl border border-slate-50">
                                        {(['Male', 'Female', 'Other'] as const).map((option) => (
                                            <label key={option} className={`flex items-center gap-2 group ${mode === 'existing' ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'}`}>
                                                <div className="relative flex items-center justify-center p-1">
                                                    <input
                                                        type="radio"
                                                        name="sex"
                                                        value={option}
                                                        checked={formData.sex === option}
                                                        onChange={() => setFormData({ ...formData, sex: option })}
                                                        className="w-4 h-4 text-primary-base focus:ring-primary-base/20 border-slate-200"
                                                        disabled={mode === 'existing'}
                                                    />
                                                </div>
                                                <span className={`text-xs font-black uppercase tracking-widest transition-colors ${formData.sex === option ? 'text-slate-800' : 'text-slate-400 group-hover:text-slate-600'}`}>{option}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                {/* Address */}
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Address Information</label>
                                    <textarea
                                        value={formData.address}
                                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                        rows={2}
                                        placeholder="Complete residential address"
                                        className={`w-full bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:ring-4 focus:ring-primary-base/5 focus:border-primary-base focus:outline-none p-4 text-sm font-bold text-slate-700 transition-all min-h-[70px] resize-none ${mode === 'existing' ? 'opacity-70 cursor-not-allowed' : ''}`}
                                        disabled={mode === 'existing'}
                                    />
                                </div>
                            </div>
                        )}

                        {/* ── Visit Details ── */}
                        {(mode === 'new' || selectedPatientId) && (
                            <div className="space-y-5 pt-2">
                                <h3 className="text-[10px] font-black tracking-widest text-slate-400 uppercase border-t border-slate-50 pt-6">Schedule Session</h3>

                                <div className="flex flex-col gap-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Visit Classification</label>
                                    <select
                                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:ring-4 focus:ring-primary-base/5 focus:border-primary-base focus:outline-none p-3 text-sm font-black text-slate-700 transition-all cursor-pointer appearance-none"
                                        value={formData.type}
                                        onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                        required
                                    >
                                        <option value="First Visit">First Visit Interaction</option>
                                        <option value="Emergency">Urgent / Emergency</option>
                                        {mode === 'existing' && (
                                            <>
                                                <option value="Follow-up">Regular Follow-up</option>
                                                <option value="Check-up">Routine Check-up</option>
                                                <option value="Consultation">Professional Consultation</option>
                                            </>
                                        )}
                                    </select>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1 text-xs">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Date</label>
                                        <input
                                            type="date"
                                            value={formData.date}
                                            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl focus:bg-white focus:ring-4 focus:ring-primary-base/5 focus:border-primary-base focus:outline-none text-sm font-bold text-slate-700 transition-all"
                                            required
                                        />
                                    </div>
                                    <TimeInput12h
                                        label="Time"
                                        value={formData.time}
                                        onChange={(val) => setFormData({ ...formData, time: val })}
                                        required
                                    />
                                </div>
                            </div>
                        )}
                    </form>
                </div>

                <div className="px-8 py-4 border-t border-slate-50 bg-slate-50/30 flex justify-end gap-3 shrink-0">
                    <button 
                        onClick={onClose} 
                        type="button" 
                        className="px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all active:scale-95"
                    >
                        Cancel
                    </button>
                    <button 
                        type="submit" 
                        form="new-appointment-form" 
                        disabled={loading || (mode === 'existing' && !selectedPatientId) || isExpired}
                        className="px-8 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] bg-primary-base text-white shadow-xl shadow-primary-base/20 hover:bg-primary-dark transition-all disabled:opacity-50 disabled:shadow-none active:scale-95 flex items-center gap-2"
                    >
                        {loading && <Loader2 size={12} className="animate-spin" />}
                        {initialData ? 'Save Changes' : 'Schedule Appointment'}
                    </button>
                </div>
            </div>
        </div>
    );
};
