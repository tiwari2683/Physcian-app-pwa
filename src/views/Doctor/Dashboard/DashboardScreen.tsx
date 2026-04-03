import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Users, Activity, Clock, PlayCircle, Loader2, FileEdit, Trash2, RefreshCw } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../../controllers/hooks/hooks';
import { fetchWaitingRoom, updateVisitStatusThunk, fetchPatients } from '../../../controllers/slices/patientSlice';
import { fetchAppointments } from '../../../controllers/slices/appointmentSlice';
import { DraftService } from '../../../services/draftService';
import type { DraftPatient } from '../../../services/draftService';

// ─── Relative time helper ────────────────────────────────────────────────────
function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export const DashboardScreen = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  
  const { waitingRoom, loadingWaitingRoom, patients } = useAppSelector(state => state.patients);
  const { appointments } = useAppSelector(state => state.appointments);

  const [startingVisitId, setStartingVisitId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<DraftPatient[]>([]);

  // ── Calculation Helpers ──────────────────────────────────────────────────
  const todaysAppointmentsCount = appointments.filter(apt => {
    const today = new Date().toISOString().split('T')[0];
    return apt.date === today || apt.date.includes(new Date().toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' }));
  }).length;

  // ── On mount: run GC, load drafts, and fetch metrics ──
  useEffect(() => {
    DraftService.cleanupOldDrafts(30);
    setDrafts(DraftService.getAllDrafts());
    
    // Fetch all patients for the 'Total Patients' metric
    dispatch(fetchPatients());
    // Fetch all appointments for the 'Appointments' metric
    dispatch(fetchAppointments());
  }, [dispatch]);

  // ── Poll waiting room every 15 seconds ──────────────────────────────────────
  useEffect(() => {
    dispatch(fetchWaitingRoom());
    const intervalId = setInterval(() => {
      dispatch(fetchWaitingRoom());
    }, 15000);
    return () => clearInterval(intervalId);
  }, [dispatch]);

  const handleStartConsultation = async (patient: any) => {
    setStartingVisitId(patient.visitId);
    try {
      await dispatch(updateVisitStatusThunk({ 
        visitId: patient.visitId, 
        status: 'IN_PROGRESS' 
      })).unwrap();
      navigate(`/doctor/visit/new/${patient.patientId}`);
    } catch (err) {
      console.error('Failed to start consultation', err);
      setStartingVisitId(null);
    }
  };

  const handleResumeDraft = (draft: DraftPatient) => {
    navigate(`/doctor/visit/new/${draft.draftId}`);
  };

  const handleDeleteDraft = (draftId: string) => {
    DraftService.deleteDraft(draftId);
    setDrafts(prev => prev.filter(d => d.draftId !== draftId));
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
      
      {/* ── Metrics Grid ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
        {/* Waiting Room - Live */}
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4 transition-all hover:shadow-md">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
            <Clock className="w-6 h-6 lg:w-7 lg:h-7" />
          </div>
          <div>
            <p className="text-xs lg:text-sm font-medium text-gray-500">Waiting Room</p>
            <p className="text-xl lg:text-2xl font-bold text-gray-900">{waitingRoom.length}</p>
          </div>
        </div>

        {/* Total Patients - Live */}
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4 transition-all hover:shadow-md">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
            <Users className="w-6 h-6 lg:w-7 lg:h-7" />
          </div>
          <div>
            <p className="text-xs lg:text-sm font-medium text-gray-500">Total Patients</p>
            <p className="text-xl lg:text-2xl font-bold text-gray-900">{patients.length || '...'}</p>
          </div>
        </div>

        {/* Today's Appointments - Live */}
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4 transition-all hover:shadow-md">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-lg">
            <Calendar className="w-6 h-6 lg:w-7 lg:h-7" />
          </div>
          <div>
            <p className="text-xs lg:text-sm font-medium text-gray-500">Appointments</p>
            <p className="text-xl lg:text-2xl font-bold text-gray-900">{todaysAppointmentsCount}</p>
          </div>
        </div>
      </div>

      {/* ── Action Buttons (Feature Parity with Native) ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <button
          onClick={() => navigate('/doctor/visit/new')}
          className="flex flex-col items-center justify-center gap-3 p-6 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm transition-all active:scale-95 group"
        >
          <div className="p-2.5 bg-white/20 rounded-full group-hover:scale-110 transition-transform">
            <Users className="w-5 h-5" />
          </div>
          <span className="text-sm font-semibold">New Patient</span>
        </button>

        <button
          onClick={() => navigate('/doctor/appointments')}
          className="flex flex-col items-center justify-center gap-3 p-6 bg-amber-500 hover:bg-amber-600 text-white rounded-xl shadow-sm transition-all active:scale-95 group"
        >
          <div className="p-2.5 bg-white/20 rounded-full group-hover:scale-110 transition-transform">
            <Calendar className="w-5 h-5" />
          </div>
          <span className="text-sm font-semibold">Appointments</span>
        </button>

        <button
          onClick={() => navigate('/doctor/prescriptions')}
          className="flex flex-col items-center justify-center gap-3 p-6 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl shadow-sm transition-all active:scale-95 group"
        >
          <div className="p-2.5 bg-white/20 rounded-full group-hover:scale-110 transition-transform">
            <Activity className="w-5 h-5" />
          </div>
          <span className="text-sm font-semibold">Messages</span>
        </button>

        <button
          onClick={() => navigate('/doctor/settings')}
          className="flex flex-col items-center justify-center gap-3 p-6 bg-orange-500 hover:bg-orange-600 text-white rounded-xl shadow-sm transition-all active:scale-95 group"
        >
          <div className="p-2.5 bg-white/20 rounded-full group-hover:scale-110 transition-transform">
            <RefreshCw className="w-5 h-5" />
          </div>
          <span className="text-sm font-semibold">Payments</span>
        </button>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          DRAFT QUEUE — rendered above the Waiting Room, hidden when empty
          Visually distinct: amber/orange palette + smaller compact cards
          so doctors cannot confuse a draft with an active waiting patient
         ═══════════════════════════════════════════════════════════════════════ */}
      {drafts.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-amber-100 overflow-hidden">
          <div className="p-4 border-b border-amber-50 flex items-center justify-between bg-amber-50/60">
            <div>
              <h2 className="text-base font-bold text-amber-900 flex items-center gap-2">
                <FileEdit className="w-4 h-4 text-amber-600" />
                Saved Drafts
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-500 text-white text-[10px] font-bold">
                  {drafts.length}
                </span>
              </h2>
              <p className="text-xs text-amber-700 mt-0.5">Interrupted consultations — resume where you left off</p>
            </div>
          </div>

          {/* Horizontally scrollable card row */}
          <div className="p-4">
            <div className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-thin scrollbar-thumb-amber-200 scrollbar-track-transparent">
              {drafts.map(draft => {
                const name = (draft.formData?.name as string) || 'Unnamed Patient';
                const age  = draft.formData?.age  as string | undefined;
                const sex  = draft.formData?.sex  as string | undefined;

                return (
                  <div
                    key={draft.draftId}
                    className="snap-start flex-shrink-0 w-52 bg-amber-50 border border-amber-200 rounded-xl p-3.5 flex flex-col gap-2.5 hover:shadow-md hover:border-amber-400 transition-all"
                  >
                    {/* Draft badge */}
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-700 text-[10px] font-bold uppercase tracking-wide">
                        <FileEdit className="w-2.5 h-2.5" /> Draft
                      </span>
                      <button
                        onClick={() => handleDeleteDraft(draft.draftId)}
                        title="Delete draft"
                        className="p-1 rounded-lg text-amber-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Patient info */}
                    <div>
                      <p className="font-semibold text-gray-900 text-sm truncate">{name}</p>
                      {(age || sex) && (
                        <p className="text-xs text-gray-500 mt-0.5">
                          {[age ? `${age}y` : null, sex].filter(Boolean).join(' • ')}
                        </p>
                      )}
                    </div>

                    {/* Last saved */}
                    <p className="text-[10px] text-amber-600 font-medium flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {timeAgo(draft.lastUpdatedAt)}
                    </p>

                    {/* Resume CTA */}
                    <button
                      onClick={() => handleResumeDraft(draft)}
                      className="w-full flex items-center justify-center gap-1.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold rounded-lg transition-colors active:scale-95"
                    >
                      <RefreshCw className="w-3 h-3" />
                      Resume
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── Live Waiting Room Queue ── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
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
          {(() => {
            const sortedQueue = [...waitingRoom].sort((a, b) =>
              new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
            );
            if (sortedQueue.length === 0) {
              return (
                <div className="text-center py-10 px-4 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                  <Clock className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                  <h3 className="text-base font-semibold text-gray-900">Queue is empty</h3>
                  <p className="text-sm text-gray-500 max-w-sm mx-auto mt-1">
                    There are currently no patients waiting. Have the assistant register a new patient to populate the queue.
                  </p>
                </div>
              );
            }
            return (
              <div className="space-y-4">
                {sortedQueue.map((patient: any, index: number) => {
                  const arrivalTime = new Date(patient.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                  const isStarting = startingVisitId === patient.visitId;

                  return (
                    <div key={patient.visitId || patient.patientId || index} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-white border border-gray-200 rounded-xl hover:border-blue-300 hover:shadow-md transition-all gap-4">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-lg shrink-0">
                          {patient.name?.charAt(0).toUpperCase() ?? '?'}
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
            );
          })()}
        </div>
      </div>
    </div>
  );
};

