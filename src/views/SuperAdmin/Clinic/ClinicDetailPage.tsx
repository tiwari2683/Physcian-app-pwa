import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { apiClient } from '../../../services/api/apiClient';
import {
  ArrowLeft, Building2, MapPin, Phone, CalendarClock, CheckCircle, XCircle,
  AlertTriangle, Stethoscope, UserCog, ClipboardList, Mail, Send,
  UserPlus, RefreshCw, Shield, Users, User
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────
interface Clinic {
  tenant_id: string;
  clinic_name: string;
  address?: string;
  contactNumber?: string;
  subscription_expiry: string;
  status: 'ACTIVE' | 'SUSPENDED';
  createdAt: string;
  doctorCount?: number;
  assistantCount?: number;
  patientCount?: number;
}

interface StaffMember {
  username: string;
  email: string;
  name: string;
  role: 'Doctor' | 'Assistant';
  status: 'CONFIRMED' | 'FORCE_CHANGE_PASSWORD' | 'UNCONFIRMED' | string;
  enabled: boolean;
  createdAt: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────
function getDaysUntilExpiry(iso: string) {
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000);
}

function ExpiryBadge({ expiryIso }: { expiryIso: string }) {
  const days = getDaysUntilExpiry(expiryIso);
  const label = days < 0 ? 'Expired' : days === 0 ? 'Expires today' : `${days}d left`;
  const color = days < 0
    ? 'bg-red-500/20 text-red-300 border-red-500/40'
    : days <= 30
      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
      : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
  const Icon = days < 0 ? XCircle : days <= 30 ? AlertTriangle : CheckCircle;
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium border ${color}`}>
      <Icon size={13} />
      {label}
    </span>
  );
}

function StatCard({ icon: Icon, label, value, color, bg }: { icon: any; label: string; value: number; color: string; bg: string }) {
  return (
    <div className={`rounded-2xl border p-5 ${bg} backdrop-blur-sm`}>
      <Icon size={22} className={`${color} mb-3`} />
      <p className="text-3xl font-bold text-white">{value}</p>
      <p className="text-sm text-slate-400 mt-1">{label}</p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STAFF LIST
// ─────────────────────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const cfg: Record<string, { label: string; cls: string }> = {
    CONFIRMED:             { label: 'Active',      cls: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
    FORCE_CHANGE_PASSWORD: { label: 'Invite Sent', cls: 'bg-amber-500/20  text-amber-400  border-amber-500/30'  },
    UNCONFIRMED:           { label: 'Unverified',  cls: 'bg-slate-500/20  text-slate-400  border-slate-600/40'  },
  };
  const { label, cls } = cfg[status] ?? { label: status, cls: 'bg-slate-500/20 text-slate-400 border-slate-600/40' };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${cls}`}>
      {label}
    </span>
  );
}

function StaffList({ clinicId, refreshKey }: { clinicId: string; refreshKey: number }) {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'All' | 'Doctor' | 'Assistant'>('All');

  useEffect(() => {
    const fetchStaff = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await apiClient.post('/patient-data', { action: 'getClinicStaff', clinicId });
        const data = res.data?.body ? JSON.parse(res.data.body) : res.data;
        if (data.success) setStaff(data.staff || []);
        else setError(data.error || 'Failed to load staff.');
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    fetchStaff();
  }, [clinicId, refreshKey]);

  const filtered    = activeTab === 'All' ? staff : staff.filter(s => s.role === activeTab);
  const doctorCount = staff.filter(s => s.role === 'Doctor').length;
  const asstCount   = staff.filter(s => s.role === 'Assistant').length;

  return (
    <div className="bg-slate-900/60 border border-slate-700/60 rounded-2xl p-6 backdrop-blur-sm mb-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
            <Users size={16} className="text-blue-400" />
          </div>
          <div>
            <h2 className="text-white font-semibold text-sm">Registered Staff</h2>
            <p className="text-slate-500 text-xs mt-0.5">
              {doctorCount} doctor{doctorCount !== 1 ? 's' : ''} · {asstCount} assistant{asstCount !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        {/* Tab filter */}
        <div className="flex gap-1 bg-slate-800/60 border border-slate-700/40 rounded-xl p-1">
          {(['All', 'Doctor', 'Assistant'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                activeTab === tab ? 'bg-slate-700 text-white' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {tab}{tab !== 'All' && ` (${tab === 'Doctor' ? doctorCount : asstCount})`}
            </button>
          ))}
        </div>
      </div>

      {/* Body */}
      {loading ? (
        <div className="flex items-center justify-center py-8 text-slate-500 text-sm gap-2">
          <RefreshCw size={14} className="animate-spin" /> Loading staff…
        </div>
      ) : error ? (
        <p className="text-red-400 text-sm text-center py-6">{error}</p>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-slate-500">
          <User size={32} className="mb-2 opacity-30" />
          <p className="text-sm">No {activeTab === 'All' ? 'staff' : activeTab + 's'} registered yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filtered.map(member => (
            <div
              key={member.username}
              className="flex items-start gap-3 p-4 rounded-xl bg-slate-800/50 border border-slate-700/40 hover:border-slate-600/60 transition-colors"
            >
              {/* Avatar */}
              <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 font-semibold text-sm ${
                member.role === 'Doctor'
                  ? 'bg-blue-500/20 border border-blue-500/30 text-blue-300'
                  : 'bg-purple-500/20 border border-purple-500/30 text-purple-300'
              }`}>
                {member.name?.charAt(0)?.toUpperCase() || '?'}
              </div>

              {/* Details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-white text-sm font-medium truncate">{member.name}</p>
                  <span className={`px-1.5 py-0.5 rounded-md text-xs font-medium ${
                    member.role === 'Doctor' ? 'bg-blue-500/20 text-blue-400' : 'bg-purple-500/20 text-purple-400'
                  }`}>
                    {member.role}
                  </span>
                </div>
                <p className="text-slate-400 text-xs mt-0.5 truncate">{member.email}</p>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <StatusBadge status={member.status} />
                  {!member.enabled && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-500/20 text-red-400 border border-red-500/30">
                      Disabled
                    </span>
                  )}
                  <span className="text-slate-600 text-xs">
                    Added {new Date(member.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// RESEND INVITE PANEL
// ─────────────────────────────────────────────────────────────────────────────
function ResendInvitePanel() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ type: 'success' | 'error'; text: string; tempPassword?: string } | null>(null);

  const handleSend = async () => {
    if (!email.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await apiClient.post('/patient-data', { action: 'resendDoctorInvite', doctorEmail: email.trim() });
      const data = res.data?.body ? JSON.parse(res.data.body) : res.data;
      if (data.success) {
        setResult({ type: 'success', text: data.message, tempPassword: data.tempPassword });
        setEmail('');
      } else {
        setResult({ type: 'error', text: data.error || 'Failed to resend.' });
      }
    } catch (e: any) {
      setResult({ type: 'error', text: e.response?.data?.error || e.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-900/60 border border-slate-700/60 rounded-2xl p-6 backdrop-blur-sm">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center">
          <Mail size={16} className="text-indigo-400" />
        </div>
        <div>
          <h3 className="text-white font-semibold text-sm">Resend Invite / Reset Password</h3>
          <p className="text-slate-500 text-xs mt-0.5">Sends a fresh temporary password to the staff member's email</p>
        </div>
      </div>
      <div className="flex gap-2">
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="staff@clinic.com"
          className="flex-1 px-4 py-2.5 rounded-xl bg-slate-950/60 border border-slate-700 text-white text-sm placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/60 focus:border-indigo-500 transition-all"
        />
        <button
          onClick={handleSend}
          disabled={loading || !email.trim()}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium transition-all"
        >
          {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Send size={14} />}
          {loading ? 'Sending…' : 'Send'}
        </button>
      </div>
      {result && (
        <div className={`mt-3 p-3 rounded-xl text-sm border ${result.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-red-500/10 border-red-500/30 text-red-300'}`}>
          {result.text}
          {result.tempPassword && (
            <div className="mt-2 px-3 py-1.5 bg-slate-900 rounded-lg font-mono text-yellow-300 border border-yellow-500/30">
              Temp Password: <strong>{result.tempPassword}</strong>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ADD STAFF PANEL
// ─────────────────────────────────────────────────────────────────────────────
function AddStaffPanel({ clinicId, onStaffAdded }: { clinicId: string; onStaffAdded: () => void }) {
  const [form, setForm] = useState({ staffName: '', staffEmail: '', staffRole: 'Doctor' as 'Doctor' | 'Assistant' });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleAdd = async () => {
    if (!form.staffEmail.trim() || !form.staffName.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await apiClient.post('/patient-data', {
        action: 'addStaffToClinic',
        clinicId,
        staffEmail: form.staffEmail.trim(),
        staffName: form.staffName.trim(),
        staffRole: form.staffRole,
      });
      const data = res.data?.body ? JSON.parse(res.data.body) : res.data;
      if (data.success) {
        setResult({ type: 'success', text: data.message });
        setForm({ staffName: '', staffEmail: '', staffRole: 'Doctor' });
        onStaffAdded();
      } else {
        setResult({ type: 'error', text: data.error || 'Failed to add staff.' });
      }
    } catch (e: any) {
      setResult({ type: 'error', text: e.response?.data?.error || e.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-900/60 border border-slate-700/60 rounded-2xl p-6 backdrop-blur-sm">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
          <UserPlus size={16} className="text-emerald-400" />
        </div>
        <div>
          <h3 className="text-white font-semibold text-sm">Add Doctor / Assistant</h3>
          <p className="text-slate-500 text-xs mt-0.5">Provisions a new staff member and sends them an invite email</p>
        </div>
      </div>

      {/* Role Toggle */}
      <div className="flex gap-2 mb-4">
        {(['Doctor', 'Assistant'] as const).map(role => (
          <button
            key={role}
            type="button"
            onClick={() => setForm(f => ({ ...f, staffRole: role }))}
            className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-all ${
              form.staffRole === role
                ? role === 'Doctor'
                  ? 'bg-blue-500/20 border-blue-500/50 text-blue-300'
                  : 'bg-purple-500/20 border-purple-500/50 text-purple-300'
                : 'bg-slate-800 border-slate-700 text-slate-500 hover:text-slate-400'
            }`}
          >
            {role === 'Doctor' ? '🩺' : '🧑‍⚕️'} {role}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        <input
          type="text"
          value={form.staffName}
          onChange={e => setForm(f => ({ ...f, staffName: e.target.value }))}
          placeholder={`${form.staffRole}'s full name`}
          className="w-full px-4 py-2.5 rounded-xl bg-slate-950/60 border border-slate-700 text-white text-sm placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/60 focus:border-emerald-500 transition-all"
        />
        <div className="flex gap-2">
          <input
            type="email"
            value={form.staffEmail}
            onChange={e => setForm(f => ({ ...f, staffEmail: e.target.value }))}
            placeholder={`${form.staffRole}'s email`}
            className="flex-1 px-4 py-2.5 rounded-xl bg-slate-950/60 border border-slate-700 text-white text-sm placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/60 focus:border-emerald-500 transition-all"
          />
          <button
            onClick={handleAdd}
            disabled={loading || !form.staffEmail.trim() || !form.staffName.trim()}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-medium transition-all"
          >
            {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <UserPlus size={14} />}
            {loading ? 'Adding…' : 'Add'}
          </button>
        </div>
      </div>

      {result && (
        <div className={`mt-3 p-3 rounded-xl text-sm border ${result.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-red-500/10 border-red-500/30 text-red-300'}`}>
          {result.text}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────
export default function ClinicDetailPage() {
  const navigate = useNavigate();
  const { clinicId } = useParams<{ clinicId: string }>();
  const location = useLocation();

  // Prefer data passed via router state (already loaded); fallback to API fetch
  const [clinic, setClinic] = useState<Clinic | null>((location.state as any)?.clinic ?? null);
  const [loading, setLoading] = useState(!clinic);
  const [error, setError] = useState<string | null>(null);
  const [staffRefreshKey, setStaffRefreshKey] = useState(0);

  const fetchClinic = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.post('/patient-data', { action: 'getAllClinics' });
      const data = res.data?.body ? JSON.parse(res.data.body) : res.data;
      if (data.success) {
        const found = (data.clinics as Clinic[]).find(c => c.tenant_id === clinicId);
        if (found) setClinic(found);
        else setError('Clinic not found.');
      } else {
        setError(data.error || 'Failed to load clinic.');
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [clinicId]);

  useEffect(() => {
    if (!clinic) fetchClinic();
  }, [clinic, fetchClinic]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
        <RefreshCw size={22} className="animate-spin mr-3" />
        Loading clinic details…
      </div>
    );
  }

  if (error || !clinic) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400 gap-4">
        <p className="text-red-400">{error || 'Clinic not found.'}</p>
        <button onClick={() => navigate('/superadmin/dashboard')} className="text-indigo-400 hover:underline text-sm">
          ← Back to Dashboard
        </button>
      </div>
    );
  }

  const isActive = clinic.status === 'ACTIVE';

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Ambient BG */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-15%] left-[-10%] w-[500px] h-[500px] bg-indigo-600/8 rounded-full blur-[140px]" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-slate-600/8 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-6 py-10">

        {/* ── Back Button ── */}
        <button
          onClick={() => navigate('/superadmin/dashboard')}
          className="flex items-center gap-2 text-slate-400 hover:text-white text-sm font-medium mb-8 transition-colors"
        >
          <ArrowLeft size={16} />
          Back to Dashboard
        </button>

        {/* ── Clinic Header ── */}
        <div className="bg-slate-900/60 border border-slate-700/60 rounded-2xl p-6 backdrop-blur-sm mb-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center flex-shrink-0">
                <Building2 size={24} className="text-indigo-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">{clinic.clinic_name}</h1>
                <p className="text-slate-500 text-xs mt-1 font-mono">{clinic.tenant_id}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`px-3 py-1 rounded-full text-sm font-medium border flex items-center gap-1.5 ${isActive ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-red-500/20 text-red-400 border-red-500/30'}`}>
                {isActive ? <CheckCircle size={13} /> : <XCircle size={13} />}
                {clinic.status}
              </span>
              <ExpiryBadge expiryIso={clinic.subscription_expiry} />
              <button
                onClick={fetchClinic}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-400 hover:text-white text-xs transition-all"
              >
                <RefreshCw size={12} />
                Refresh
              </button>
            </div>
          </div>

          {/* Clinic Info */}
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            {clinic.address && (
              <div className="flex items-start gap-2.5 text-slate-300">
                <MapPin size={15} className="text-slate-500 mt-0.5 flex-shrink-0" />
                <span>{clinic.address}</span>
              </div>
            )}
            {clinic.contactNumber && (
              <div className="flex items-center gap-2.5 text-slate-300">
                <Phone size={15} className="text-slate-500 flex-shrink-0" />
                <span>{clinic.contactNumber}</span>
              </div>
            )}
            <div className="flex items-center gap-2.5 text-slate-300">
              <CalendarClock size={15} className="text-slate-500 flex-shrink-0" />
              <span>Registered: {new Date(clinic.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
            </div>
            <div className="flex items-center gap-2.5 text-slate-300">
              <Shield size={15} className="text-slate-500 flex-shrink-0" />
              <span>Subscription expires: {new Date(clinic.subscription_expiry).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
            </div>
          </div>
        </div>

        {/* ── Stats ── */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <StatCard icon={Stethoscope}   label="Doctors"    value={clinic.doctorCount    ?? 0} color="text-blue-400"    bg="bg-blue-500/10 border-blue-500/20"    />
          <StatCard icon={UserCog}       label="Assistants" value={clinic.assistantCount ?? 0} color="text-purple-400"  bg="bg-purple-500/10 border-purple-500/20"  />
          <StatCard icon={ClipboardList} label="Patients"   value={clinic.patientCount   ?? 0} color="text-emerald-400" bg="bg-emerald-500/10 border-emerald-500/20" />
        </div>

        {/* ── Staff List ── */}
        <StaffList clinicId={clinic.tenant_id} refreshKey={staffRefreshKey} />

        {/* ── Actions ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ResendInvitePanel />
          <AddStaffPanel
            clinicId={clinic.tenant_id}
            onStaffAdded={() => { fetchClinic(); setStaffRefreshKey(k => k + 1); }}
          />
        </div>

      </div>
    </div>
  );
}
