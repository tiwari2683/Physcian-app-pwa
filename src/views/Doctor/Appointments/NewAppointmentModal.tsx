import React, { useState, useEffect } from 'react';
import { useAppDispatch } from '../../../controllers/hooks/hooks';
import { createAppointment } from '../../../controllers/slices/appointmentSlice';
import { X, Search, Loader2, ShieldOff } from 'lucide-react';
import type { Appointment } from '../../../models';
import { patientService } from '../../../services/api/patientService';
import { useSubscription } from '../../../controllers/hooks/useSubscription';
import toast from 'react-hot-toast';
import { TimeInput12h } from '../../../components/Common/TimeInput12h';

const Button = ({ variant = 'primary', loading, children, ...props }: any) => {
    const baseStyle = "px-5 py-2.5 rounded-lg font-medium transition-colors flex items-center justify-center gap-2";
    const variantStyle = variant === 'primary' 
        ? "bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-70 disabled:cursor-not-allowed" 
        : "bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-70 disabled:cursor-not-allowed";
    return (
        <button className={`${baseStyle} ${variantStyle}`} disabled={loading || props.disabled} {...props}>
            {loading ? <Loader2 className="animate-spin" size={18} /> : null}
            {children}
        </button>
    );
};

const Input = ({ label, ...props }: any) => (
    <div className="space-y-1 w-full text-left">
        <label className="text-sm font-medium text-gray-700">{label}</label>
        <input 
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition bg-gray-50 disabled:opacity-70 disabled:bg-gray-100 disabled:cursor-not-allowed" 
            {...props} 
        />
    </div>
);

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
        if (mode !== 'existing' || searchQuery.trim().length < 3) {
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
        if (isExpired) {
            toast.error('Subscription expired. New appointments cannot be created.');
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
            const formDataPayload = {
                patientName: formData.patientName,
                age: formData.age,
                mobile: formData.mobile,
                sex: formData.sex,
                address: formData.address,
                date: formData.date,
                time: formData.time,
                type: formData.type,
                status: initialData?.status || 'Upcoming'
            };

            if (mode === 'new') {
                // Fix Ghost Patient Bug: Dynamically import and use the new thunk
                const { createPatientAndAppointment } = await import('../../../controllers/slices/appointmentSlice');
                await dispatch(createPatientAndAppointment({
                    patientData: {
                        name: formData.patientName,
                        age: formData.age || '0',
                        sex: formData.sex,
                        mobile: formData.mobile,
                        address: formData.address
                    },
                    appointmentData: formDataPayload
                })).unwrap();
            } else {
                // Existing Patient
                await dispatch(createAppointment({
                    ...(initialData?.id ? { id: initialData.id } : {}),
                    patientId: selectedPatientId || undefined,
                    ...formDataPayload
                })).unwrap();
            }

            onClose();
        } catch (error) {
            console.error('Failed to save appointment', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                <div className="flex justify-between items-center p-6 border-b border-gray-200 bg-gray-50">
                    <h2 className="text-xl font-bold text-gray-900">
                        {initialData ? 'Edit Appointment' : 'New Appointment'}
                    </h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-red-500 transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto">
                    <form id="new-appointment-form" onSubmit={handleSubmit} className="space-y-6">

                        {/* Toggle Mode */}
                        {!initialData && (
                            <div className="flex bg-gray-100 rounded-lg p-1">
                                <button
                                    type="button"
                                    onClick={() => handleChangeMode('existing')}
                                    className={`flex-1 py-2 rounded-md text-sm font-semibold transition-all ${mode === 'existing' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                >
                                    Existing Patient
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleChangeMode('new')}
                                    className={`flex-1 py-2 rounded-md text-sm font-semibold transition-all ${mode === 'new' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                >
                                    New Patient
                                </button>
                            </div>
                        )}

                        {/* Search Section for Existing Patient */}
                        {mode === 'existing' && !selectedPatientId && (
                            <div className="relative space-y-2">
                                <label className="text-sm font-bold text-gray-700">Search Patient</label>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                    <input
                                        type="text"
                                        placeholder="Search by name or phone..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none text-gray-900"
                                    />
                                    {isSearching && (
                                        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 animate-spin" size={18} />
                                    )}
                                </div>

                                {searchResults.length > 0 && (
                                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 shadow-lg rounded-lg z-10 max-h-60 overflow-y-auto">
                                        {searchResults.map(patient => (
                                            <button
                                                key={patient.patientId}
                                                type="button"
                                                onClick={() => handleSelectPatient(patient)}
                                                className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-50 last:border-0 transition-colors"
                                            >
                                                <div className="font-semibold text-gray-900">{patient.name}</div>
                                                <div className="text-xs text-gray-500 mt-1 space-x-2">
                                                    <span>{patient.mobile || "No phone"}</span>
                                                    <span>•</span>
                                                    <span>{patient.age} yrs</span>
                                                    <span>•</span>
                                                    <span>{patient.sex}</span>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Selected Patient Banner */}
                        {mode === 'existing' && selectedPatientId && !initialData && (
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex justify-between items-center">
                                <div>
                                    <div className="text-xs font-semibold text-blue-700 uppercase tracking-wider mb-1">Selected Patient</div>
                                    <div className="text-blue-900 font-medium">{formData.patientName}</div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => { setSelectedPatientId(null); setFormData(prev => ({ ...emptyForm, type: prev.type, date: prev.date, time: prev.time })); }}
                                    className="text-sm font-semibold text-blue-600 hover:text-blue-800"
                                >
                                    Change
                                </button>
                            </div>
                        )}

                        {/* ── Patient Details ── */}
                        {(mode === 'new' || selectedPatientId) && (
                            <div className="space-y-4">
                                <h3 className="text-sm font-bold tracking-wide text-gray-500 uppercase">Patient Details</h3>
                                <Input
                                    label="Patient Full Name"
                                    value={formData.patientName}
                                    onChange={(e: any) => setFormData({ ...formData, patientName: e.target.value })}
                                    placeholder="e.g. John Doe"
                                    required
                                    disabled={mode === 'existing'}
                                />
                                <div className="grid grid-cols-2 gap-4">
                                    <Input
                                        label="Age"
                                        type="number"
                                        value={formData.age}
                                        onChange={(e: any) => setFormData({ ...formData, age: e.target.value })}
                                        placeholder="e.g. 35"
                                        required
                                        disabled={mode === 'existing'}
                                    />
                                    <Input
                                        label="Mobile Number"
                                        type="tel"
                                        value={formData.mobile}
                                        onChange={(e: any) => {
                                            const clean = e.target.value.replace(/\D/g, '').slice(0, 10);
                                            setFormData({ ...formData, mobile: clean });
                                        }}
                                        placeholder="e.g. 9876543210"
                                        required
                                        disabled={mode === 'existing'}
                                    />
                                </div>

                                {/* Sex — Radio Group */}
                                <div className="flex flex-col gap-2">
                                    <label className="text-sm font-bold text-gray-700">Sex</label>
                                    <div className="flex gap-6 mt-1">
                                        {(['Male', 'Female', 'Other'] as const).map((option) => (
                                            <label key={option} className={`flex items-center gap-2 ${mode === 'existing' ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'}`}>
                                                <input
                                                    type="radio"
                                                    name="sex"
                                                    value={option}
                                                    checked={formData.sex === option}
                                                    onChange={() => setFormData({ ...formData, sex: option })}
                                                    className="w-4 h-4 text-blue-600 focus:ring-blue-600"
                                                    disabled={mode === 'existing'}
                                                />
                                                <span className="text-sm text-gray-700">{option}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                {/* Address */}
                                <div className="flex flex-col gap-2">
                                    <label className="text-sm font-bold text-gray-700">Address</label>
                                    <textarea
                                        value={formData.address}
                                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                        rows={2}
                                        placeholder="Patient's permanent address (optional)"
                                        className="px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none text-gray-900 resize-none disabled:opacity-70 disabled:bg-gray-100 disabled:cursor-not-allowed"
                                        disabled={mode === 'existing'}
                                    />
                                </div>
                            </div>
                        )}

                        {/* ── Visit Details ── */}
                        {(mode === 'new' || selectedPatientId) && (
                            <div className="space-y-4 pt-2">
                                <h3 className="text-sm font-bold tracking-wide text-gray-500 uppercase border-t border-gray-200 pt-4">Visit Details</h3>

                                <div className="flex flex-col gap-2">
                                    <label className="text-sm font-bold text-gray-700">Visit Type</label>
                                    <select
                                        className="px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none text-gray-900 w-full cursor-pointer"
                                        value={formData.type}
                                        onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                        required
                                    >
                                        <option value="First Visit">First Visit</option>
                                        <option value="Emergency">Emergency</option>
                                        {mode === 'existing' && (
                                            <>
                                                <option value="Follow-up">Follow-up</option>
                                                <option value="Check-up">Check-up</option>
                                                <option value="Consultation">Consultation</option>
                                            </>
                                        )}
                                    </select>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <Input
                                        label="Date"
                                        type="date"
                                        value={formData.date}
                                        onChange={(e: any) => setFormData({ ...formData, date: e.target.value })}
                                        required
                                    />
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

                    {isExpired && (
                        <div className="px-6 pb-0 flex items-center gap-2 text-xs font-bold text-red-600 bg-red-50 py-2.5 border-t border-red-100">
                            <ShieldOff className="w-3.5 h-3.5 shrink-0" />
                            Subscription expired — new appointments are disabled.
                        </div>
                    )}
                    <div className="p-6 border-t border-gray-200 bg-gray-50 flex justify-end gap-3 shrink-0">
                        <Button variant="secondary" onClick={onClose} type="button">
                            Cancel
                        </Button>
                        <Button
                            variant="primary"
                            type="submit"
                            form="new-appointment-form"
                            loading={loading}
                            disabled={(mode === 'existing' && !selectedPatientId) || isExpired}
                        >
                            {initialData ? 'Save Changes' : 'Schedule Appointment'}
                        </Button>
                    </div>
            </div>
        </div>
    );
};

