import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Search, UserPlus, FileText } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../../controllers/hooks/hooks';
import { fetchPatients } from '../../../controllers/slices/patientSlice';

export const PatientDirectory = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();
  const { patients, loading, error } = useAppSelector((state) => state.patients);
  const [searchTerm, setSearchTerm] = useState('');

  const isCertificateMode = location.pathname.includes('/fitness-certificate');

  useEffect(() => {
    dispatch(fetchPatients());
  }, [dispatch]);

  // Real-time frontend filtering
  const filteredPatients = patients.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.mobile.includes(searchTerm)
  );

  return (
    <div className="p-4 lg:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-900">
          {isCertificateMode ? 'Select Patient' : 'Patient Directory'}
        </h1>
        <button onClick={() => navigate('/doctor/patients/new')} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-sm">
          <UserPlus className="w-4 h-4" />
          <span className="font-medium">New Patient</span>
        </button>
      </div>

      {/* Section 8 — Certificate Mode Banner */}
      {isCertificateMode && (
        <div className="bg-blue-600 text-white rounded-2xl p-4 flex items-center gap-3 shadow-lg shadow-blue-200">
          <FileText className="w-6 h-6 shrink-0" />
          <div>
            <p className="font-bold">Select a patient to issue a Fitness Certificate</p>
            <p className="text-blue-200 text-sm">Search by name or phone number below</p>
          </div>
        </div>
      )}

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex items-center gap-3">
        <Search className="w-5 h-5 text-gray-400" />
        <input 
          type="text" 
          placeholder="Search patients by name or phone number..." 
          className="flex-1 outline-none text-gray-700 bg-transparent"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg border border-red-100">
          {error}
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        /* Patient List Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredPatients.length === 0 && !error ? (
            <div className="col-span-full text-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
              <p className="text-gray-500 font-medium text-lg">No patients found.</p>
              <p className="text-gray-400 text-sm mt-1">Try adjusting your search or add a new patient.</p>
            </div>
          ) : (
            filteredPatients.map((patient) => (
              <div key={patient.patientId} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{patient.name}</h3>
                    <p className="text-sm text-gray-500">{patient.age} yrs • {patient.sex}</p>
                  </div>
                  <span className="px-3 py-1 bg-blue-50 text-blue-700 text-xs font-semibold rounded-full border border-blue-100">
                    ID: {patient.patientId.substring(0,6).toUpperCase()}
                  </span>
                </div>
                <div className="space-y-2 text-sm text-gray-600 mb-6 bg-gray-50 p-3 rounded-lg border border-gray-100">
                  <p className="flex justify-between"><span className="font-medium text-gray-900">Phone:</span> {patient.mobile}</p>
                  <p className="flex justify-between">
                    <span className="font-medium text-gray-900">Last Visit:</span> 
                    {patient.updatedAt ? new Date(patient.updatedAt).toLocaleDateString() : 'N/A'}
                  </p>
                </div>

                {/* Section 8 — Full-blue button in certificate mode */}
                <button 
                  onClick={() => navigate(
                    isCertificateMode
                      ? `/doctor/fitness-certificate/${patient.patientId}`
                      : `/doctor/visit/new/${patient.patientId}`
                  )}
                  className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold text-sm transition-all ${
                    isCertificateMode
                      ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-100'
                      : 'bg-white text-blue-600 border border-gray-200 hover:bg-gray-50 hover:border-blue-200'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  {isCertificateMode ? 'Issue Fitness Certificate' : 'Start Consultation / Visit'}
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

