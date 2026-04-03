import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { patientService } from '../../../services/api/patientService';
import { Search, ClipboardList, AlertCircle, RefreshCw, FileText } from 'lucide-react';

interface PatientPrescriptionSummary {
    patientId: string;
    patientName: string;
    age: string;
    gender: string;
    totalPrescriptions: number;
    mostRecentDate: string;
}

export const PrescriptionsList = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [patients, setPatients] = useState<PatientPrescriptionSummary[]>([]);

    const fetchPrescriptions = async () => {
        setLoading(true);
        setError(null);
        try {
            // Note: If the backend Lambda is not yet updated, this will safely catch the 400 error.
            const allPrescriptions = await patientService.getAllPrescriptions();
            
            // Group by patientId
            const patientMap = new Map<string, PatientPrescriptionSummary>();
            
            allPrescriptions.forEach((record: any) => {
                const pid = record.patientId;
                if (!patientMap.has(pid)) {
                    patientMap.set(pid, {
                        patientId: pid,
                        patientName: record.patientName || 'Unknown Patient',
                        age: record.age || 'N/A',
                        gender: record.gender || 'N/A',
                        totalPrescriptions: 1,
                        mostRecentDate: record.prescriptionDate || record.visitDate || new Date().toISOString()
                    });
                } else {
                    const existing = patientMap.get(pid)!;
                    existing.totalPrescriptions += 1;
                    const recordDate = new Date(record.prescriptionDate || record.visitDate || new Date().toISOString());
                    const existingDate = new Date(existing.mostRecentDate);
                    if (recordDate > existingDate) {
                        existing.mostRecentDate = recordDate.toISOString();
                    }
                }
            });

            // Convert to array and sort by most recent
            const patientArray = Array.from(patientMap.values()).sort((a, b) => {
                return new Date(b.mostRecentDate).getTime() - new Date(a.mostRecentDate).getTime();
            });

            setPatients(patientArray);
        } catch (err: any) {
            console.error('Failed to load prescriptions:', err);
            setError('Failed to fetch prescription records. The backend endpoint might not be deployed yet.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPrescriptions();
    }, []);

    const filteredPatients = useMemo(() => {
        const query = searchQuery.toLowerCase().trim();
        if (!query) return patients;
        return patients.filter(p => 
            p.patientName.toLowerCase().includes(query) || 
            p.patientId.toLowerCase().includes(query)
        );
    }, [patients, searchQuery]);

    const formatDate = (isoString: string) => {
        return new Date(isoString).toLocaleDateString('en-GB', {
            day: '2-digit', month: 'short', year: 'numeric'
        });
    };

    return (
        <div className="p-4 lg:p-8 space-y-6 bg-gray-50 min-h-screen">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h1 className="text-2xl font-bold text-gray-900">
                    Prescription Directory
                </h1>
            </div>

            {/* Prescriptions Mode Banner */}
            <div className="bg-indigo-600 text-white rounded-2xl p-4 flex items-center gap-3 shadow-lg shadow-indigo-200">
                <ClipboardList className="w-6 h-6 shrink-0" />
                <div>
                    <p className="font-bold">Select a patient to view or download their generated Prescriptions</p>
                    <p className="text-indigo-200 text-sm">Search by name or ID below</p>
                </div>
            </div>

            {/* Search Bar */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex items-center gap-3">
                <Search className="w-5 h-5 text-gray-400" />
                <input
                    type="text"
                    placeholder="Search by patient name or ID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex-1 outline-none text-gray-700 bg-transparent"
                />
            </div>

            {/* Main Content Area */}
            {loading ? (
                <div className="flex justify-center items-center py-20">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                </div>
            ) : error ? (
                <div className="bg-red-50 border border-red-100 p-4 rounded-xl flex flex-col items-center justify-center text-center">
                    <AlertCircle className="w-8 h-8 text-red-500 mb-2" />
                    <h3 className="text-lg font-bold text-red-900 mb-1">Connection Error</h3>
                    <p className="text-red-600 font-medium mb-4">{error}</p>
                    <button 
                        onClick={fetchPrescriptions}
                        className="flex items-center gap-2 bg-red-100 hover:bg-red-200 text-red-800 px-4 py-2 rounded-lg font-bold transition-colors"
                    >
                        <RefreshCw className="w-4 h-4" /> Try Again
                    </button>
                </div>
            ) : patients.length === 0 ? (
                <div className="col-span-full text-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
                    <p className="text-gray-500 font-medium text-lg">No prescriptions found.</p>
                    <p className="text-gray-400 text-sm mt-1">There are currently no patients with generated prescriptions.</p>
                </div>
            ) : filteredPatients.length === 0 ? (
                <div className="col-span-full text-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
                    <p className="text-gray-500 font-medium text-lg">No matches found.</p>
                    <p className="text-gray-400 text-sm mt-1">Try adjusting your search query.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {filteredPatients.map(patient => (
                        <div 
                            key={patient.patientId}
                            className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900">{patient.patientName}</h3>
                                    <p className="text-sm text-gray-500">{patient.age} yrs • {patient.gender}</p>
                                </div>
                                <span className="px-3 py-1 bg-indigo-50 text-indigo-700 text-xs font-semibold rounded-full border border-indigo-100">
                                    ID: {patient.patientId.substring(0,6).toUpperCase()}
                                </span>
                            </div>
                            
                            <div className="space-y-2 text-sm text-gray-600 mb-6 bg-gray-50 p-3 rounded-lg border border-gray-100">
                                <p className="flex justify-between">
                                    <span className="font-medium text-gray-900">Total Prescriptions:</span> 
                                    <span className="font-bold text-indigo-600">{patient.totalPrescriptions}</span>
                                </p>
                                <p className="flex justify-between">
                                    <span className="font-medium text-gray-900">Most Recent:</span> 
                                    <span>{formatDate(patient.mostRecentDate)}</span>
                                </p>
                            </div>

                            <button 
                                onClick={() => navigate(patient.patientId)}
                                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold text-sm transition-all bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-100"
                            >
                                <FileText className="w-4 h-4" />
                                View Prescription History
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

