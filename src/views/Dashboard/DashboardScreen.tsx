import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Users, Activity, Clock, PlayCircle, Loader2 } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../controllers/hooks/hooks';
import { fetchWaitingRoom, updateVisitStatusThunk } from '../../controllers/slices/patientSlice';

export const DashboardScreen = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  
  const { waitingRoom, loadingWaitingRoom } = useAppSelector(state => state.patients);
  const [startingVisitId, setStartingVisitId] = useState<string | null>(null);

  // Poll waiting room every 15 seconds
  useEffect(() => {
    dispatch(fetchWaitingRoom());
    
    const intervalId = setInterval(() => {
      dispatch(fetchWaitingRoom());
    }, 15000); // 15 seconds
    
    return () => clearInterval(intervalId);
  }, [dispatch]);

  const handleStartConsultation = async (patient: any) => {
    setStartingVisitId(patient.visitId);
    try {
      // Transition from WAITING to IN_PROGRESS
      await dispatch(updateVisitStatusThunk({ 
        visitId: patient.visitId, 
        status: 'IN_PROGRESS' 
      })).unwrap();
      
      // Navigate to Visit Wizard for Consultation
      navigate(`/visit/new/${patient.patientId}`);
    } catch (err) {
      console.error('Failed to start consultation', err);
      // Optional: Add a toast notification here
      setStartingVisitId(null);
    }
  };

  return (
    <div className="p-4 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        {loadingWaitingRoom && !waitingRoom.length && (
          <span className="text-sm font-medium text-blue-600 flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Fetching Live Queue...
          </span>
        )}
      </div>
      
      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
            <Calendar className="w-8 h-8" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Waiting Room</p>
            <p className="text-2xl font-bold text-gray-900">{waitingRoom.length}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
            <Users className="w-8 h-8" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Total Patients</p>
            <p className="text-2xl font-bold text-gray-900">1,248</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="p-3 bg-purple-50 text-purple-600 rounded-lg">
            <Activity className="w-8 h-8" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Pending Reports</p>
            <p className="text-2xl font-bold text-gray-900">5</p>
          </div>
        </div>
      </div>

      {/* Live Waiting Room Queue */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 mt-8 overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div>
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              Live Waiting Room
              <span className="flex h-3 w-3 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
            </h2>
            <p className="text-sm text-gray-500 mt-1">Patients queued by the Assistant Panel</p>
          </div>
        </div>
        
        <div className="p-6">
          {/* Newest-first: most recently arrived patients appear at the top */}
          {[...waitingRoom].sort((a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          ).length === 0 ? (
            <div className="text-center py-10 px-4 bg-gray-50 rounded-xl border border-dashed border-gray-200">
              <Clock className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-gray-900">Queue is empty</h3>
              <p className="text-sm text-gray-500 max-w-sm mx-auto mt-1">
                There are currently no patients waiting. Have the assistant register a new patient to populate the queue.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {waitingRoom.map((patient: any) => {
                const arrivalTime = new Date(patient.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                const isStarting = startingVisitId === patient.visitId;

                return (
                  <div key={patient.visitId} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-white border border-gray-200 rounded-xl hover:border-blue-300 hover:shadow-md transition-all gap-4">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-lg shrink-0">
                        {patient.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900 text-base">{patient.name}</h3>
                        <p className="text-sm text-gray-500 font-medium">
                          {patient.age}y • {patient.sex} • Arrived at {arrivalTime}
                        </p>
                      </div>
                    </div>
                    
                    <button
                      onClick={() => handleStartConsultation(patient)}
                      disabled={isStarting}
                      className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg font-semibold shadow-sm hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-70"
                    >
                      {isStarting ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Starting...
                        </>
                      ) : (
                        <>
                          <PlayCircle className="w-5 h-5 text-blue-100" />
                          Start Consultation
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
