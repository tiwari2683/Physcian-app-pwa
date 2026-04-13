import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Users, Activity, Clock, PlayCircle, Loader2, FileEdit, Trash2, RefreshCw, AlertTriangle } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../../controllers/hooks/hooks';
import { fetchWaitingRoom, updateVisitStatusThunk, fetchPatients } from '../../../controllers/slices/patientSlice';
import { fetchAppointments } from '../../../controllers/slices/appointmentSlice';
import { useSubscription } from '../../../controllers/hooks/useSubscription';
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

  const { user } = useAppSelector(state => state.auth);
  const { waitingRoom, loadingWaitingRoom, patients } = useAppSelector(state => state.patients);
  const { appointments } = useAppSelector(state => state.appointments);
  const { daysLeft, isExpired, isExpiringSoon, expiryDateLabel } = useSubscription();

  const [startingVisitId, setStartingVisitId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<DraftPatient[]>([]);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  // ── Calculation Helpers ──────────────────────────────────────────────────
  const todaysAppointmentsCount = appointments.filter(apt => {
    const today = new Date().toISOString().split('T')[0];
    return apt.date === today || apt.date.includes(new Date().toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' }));
  }).length;

  // ── On mount: run GC, load data ──
  useEffect(() => {
    DraftService.cleanupOldDrafts(30);
    setDrafts(DraftService.getAllDrafts());
    dispatch(fetchPatients());
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

  // ── Expiry banner colours ──
  const bannerStyle = isExpired
    ? { bg: 'bg-red-50 border-red-200', icon: 'text-red-500', text: 'text-red-800', badge: 'bg-red-100 text-red-700' }
    : { bg: 'bg-amber-50 border-amber-200', icon: 'text-amber-500', text: 'text-amber-800', badge: 'bg-amber-100 text-amber-700' };

  const showBanner = !bannerDismissed && (isExpiringSoon || isExpired);

  return (
    <div className="p-3 lg:p-6 space-y-3 lg:space-y-4 max-w-7xl mx-auto">

      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            Welcome, {user?.role === 'Doctor' ? `Dr. ${user?.name || 'Physician'}` : user?.name || 'Staff'}
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Here's what's happening in your clinic today.
          </p>
        </div>
        {loadingWaitingRoom && !waitingRoom.length && (
          <span className="text-xs font-semibold text-blue-600 flex items-center gap-1.5 animate-pulse">
            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Fetching Live Queue...
          </span>
        )}
      </div>

      {/* ── Subscription Expiry Banner (last-30-days window + expired) ── */}
      {showBanner && (
        <div className={`flex items-start gap-3 px-4 py-3.5 rounded-2xl border ${bannerStyle.bg} animate-in slide-in-from-top-2 duration-300`}>
          <AlertTriangle className={`w-5 h-5 mt-0.5 shrink-0 ${bannerStyle.icon}`} />
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-bold ${bannerStyle.text}`}>
              {isExpired
                ? '⛔ Clinic subscription has expired — write actions are now restricted.'
                : `⚠️ Subscription expiring in ${daysLeft} day${daysLeft === 1 ? '' : 's'} — renew to keep full access.`}
            </p>
            <p className={`text-xs mt-0.5 font-medium ${bannerStyle.text} opacity-70`}>
              {isExpired
                ? 'Patient history and records remain fully accessible. Contact your platform administrator to renew.'
                : `Expiry date: ${expiryDateLabel}. Patient history and existing records will always remain accessible.`}
            </p>
          </div>
          <button
            onClick={() => setBannerDismissed(true)}
            className={`text-xs font-bold px-2.5 py-1 rounded-lg shrink-0 ${bannerStyle.badge} hover:opacity-80 transition-opacity`}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* 📊 System Stats Section */}
      <div className="px-1">
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {/* Waiting Room - Priority Card (Full Width on mobile) */}
          <div className="col-span-2 md:col-span-1 bg-indigo-600 p-4 rounded-2xl shadow-lg shadow-indigo-200/50 flex items-center gap-4 transition-all hover:scale-[1.02] active:scale-98">
            <div className="p-2.5 bg-white/20 text-white rounded-xl shrink-0 backdrop-blur-sm">
              <Clock className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-tight text-indigo-100/80">Waiting Room</p>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-black text-white leading-none mt-1">{waitingRoom.length}</p>
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
                </span>
              </div>
            </div>
          </div>

          {/* Total Patients */}
          <div className="bg-white p-3.5 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-3 transition-all hover:shadow-md active:scale-98">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-tight text-slate-400">Patients</p>
              <p className="text-lg font-black text-slate-900 leading-none mt-1">{patients.length || '...'}</p>
            </div>
          </div>

          {/* Today's Appointments */}
          <div className="bg-white p-3.5 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-3 transition-all hover:shadow-md active:scale-98">
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl shrink-0">
              <Calendar className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-tight text-slate-400">Today</p>
              <p className="text-lg font-black text-slate-900 leading-none mt-1">{todaysAppointmentsCount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ⚡ Quick Actions Section */}
      <div className="px-1">
        <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2.5">⚡ Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 lg:gap-4">
          {[
            { label: 'New Patient', path: '/doctor/visit/new', icon: Users, color: 'blue', grad: 'from-blue-500/10 to-indigo-500/10' },
            { label: 'Schedule', path: '/doctor/appointments', icon: Calendar, color: 'amber', grad: 'from-amber-500/10 to-orange-500/10' },
            { label: 'Messages', path: '/doctor/prescriptions', icon: Activity, color: 'teal', grad: 'from-teal-500/10 to-emerald-500/10' },
            { label: 'Settings', path: '/doctor/settings', icon: RefreshCw, color: 'slate', grad: 'from-slate-500/10 to-slate-800/10' }
          ].map((item, idx) => (
            <button
              key={idx}
              onClick={() => navigate(item.path)}
              className="group relative overflow-hidden p-3 bg-white border border-slate-100 rounded-2xl shadow-sm transition-all hover:shadow-md active:scale-95 flex flex-col items-start gap-2.5"
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${item.grad} opacity-0 group-hover:opacity-100 transition-opacity`} />
              <div className={`p-2 bg-${item.color}-50 text-${item.color}-600 rounded-xl group-hover:scale-110 transition-transform duration-200 shrink-0`}>
                <item.icon className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-slate-800 tracking-tight">{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* DRAFT QUEUE */}
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

                    <div>
                      <p className="font-semibold text-gray-900 text-sm truncate">{name}</p>
                      {(age || sex) && (
                        <p className="text-xs text-gray-500 mt-0.5">
                          {[age ? `${age}y` : null, sex].filter(Boolean).join(' • ')}
                        </p>
                      )}
                    </div>

                    <p className="text-[10px] text-amber-600 font-medium flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {timeAgo(draft.lastUpdatedAt)}
                    </p>

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
        <div className="p-3 lg:p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div>
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
              Live Waiting Room
              <span className="flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
            </h2>
            <p className="text-[11px] text-gray-500 mt-0.5">Queued by Assistant Panel</p>
          </div>
        </div>

        <div className="p-3 lg:p-4">
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
                    <div key={patient.visitId || patient.patientId || index} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 bg-white border border-gray-200 rounded-xl hover:border-blue-300 hover:shadow-sm transition-all gap-3">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-base shrink-0">
                          {patient.name?.charAt(0).toUpperCase() ?? '?'}
                        </div>
                        <div>
                          <h3 className="font-bold text-gray-900 text-sm truncate max-w-[150px] sm:max-w-none">{patient.name}</h3>
                          <p className="text-[11px] text-gray-500 font-medium">
                            {patient.age}y • {patient.sex} • {arrivalTime}
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => handleStartConsultation(patient)}
                        disabled={isStarting}
                        className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-bold text-xs shadow-sm hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-70"
                      >
                        {isStarting ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            Starting...
                          </>
                        ) : (
                          <>
                            <PlayCircle className="w-4 h-4 text-blue-100" />
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
