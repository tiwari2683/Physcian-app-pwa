import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppSelector } from '../../../controllers/hooks/hooks';
import { useAuth } from '../../../controllers/hooks/useAuth';
import { apiClient } from '../../../services/api/apiClient';
import type { RootState } from '../../../controllers/store';
import {
  Building2, Users, UserCog, RefreshCw, CheckCircle,
  Stethoscope, ClipboardList, Plus, LogOut
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


// ─────────────────────────────────────────────────────────────────────────────
// MINIMAL CLINIC CARD (click → detail page)
// ─────────────────────────────────────────────────────────────────────────────
function ClinicCard({ clinic }: { clinic: Clinic }) {
  const navigate = useNavigate();
  const isActive = clinic.status === 'ACTIVE';
  const days = Math.ceil((new Date(clinic.subscription_expiry).getTime() - Date.now()) / 86_400_000);
  const expiryColor = days < 0 ? 'text-red-400' : days <= 30 ? 'text-amber-400' : 'text-emerald-400';
  const expiryLabel = days < 0 ? 'Expired' : `${days}d left`;

  return (
    <button
      onClick={() => navigate(`/superadmin/clinic/${clinic.tenant_id}`, { state: { clinic } })}
      className="w-full text-left bg-slate-900/60 border border-slate-700/60 rounded-2xl p-5 backdrop-blur-sm transition-all duration-200 hover:border-indigo-500/50 hover:shadow-lg hover:shadow-indigo-500/5 hover:-translate-y-0.5 group"
    >
      {/* Top row */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center flex-shrink-0 group-hover:bg-indigo-500/30 transition-colors">
            <Building2 size={18} className="text-indigo-400" />
          </div>
          <div>
            <p className="text-white font-semibold text-base leading-tight group-hover:text-indigo-300 transition-colors">
              {clinic.clinic_name}
            </p>
            <p className="text-slate-500 text-xs mt-0.5 font-mono">{clinic.tenant_id.substring(0, 20)}…</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${isActive ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-red-500/20 text-red-400 border-red-500/30'}`}>
            {clinic.status}
          </span>
          <span className={`text-xs font-medium ${expiryColor}`}>{expiryLabel}</span>
        </div>
      </div>

      {/* Stats row */}
      <div className="flex items-center gap-3 text-xs text-slate-400">
        <span className="flex items-center gap-1"><Stethoscope size={12} className="text-blue-400" />{clinic.doctorCount ?? 0} Doctors</span>
        <span className="text-slate-600">·</span>
        <span className="flex items-center gap-1"><UserCog size={12} className="text-purple-400" />{clinic.assistantCount ?? 0} Assistants</span>
        <span className="text-slate-600">·</span>
        <span className="flex items-center gap-1"><ClipboardList size={12} className="text-emerald-400" />{clinic.patientCount ?? 0} Patients</span>
      </div>

      <p className="text-indigo-400/60 text-xs mt-3 group-hover:text-indigo-400 transition-colors">View details & manage →</p>
    </button>
  );
}


// ─────────────────────────────────────────────────────────────────────────────
// ONBOARD FORM
// ─────────────────────────────────────────────────────────────────────────────
interface OnboardFormProps {
  onSuccess: () => void;
}

function OnboardForm({ onSuccess }: OnboardFormProps) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [form, setForm] = useState({ clinicName: '', address: '', contactNumber: '', adminName: '', adminEmail: '' });

  const [phoneError, setPhoneError] = useState<string | null>(null);

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [key]: e.target.value }));

  // Digits-only, max 10 digits for Indian mobile numbers
  const setPhone = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
    setForm(f => ({ ...f, contactNumber: digits }));
    if (digits.length > 0 && digits.length < 10) {
      setPhoneError('Phone number must be exactly 10 digits.');
    } else {
      setPhoneError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Validate Indian phone number: exactly 10 digits, starts with 6-9
    if (form.contactNumber && !/^[6-9]\d{9}$/.test(form.contactNumber)) {
      setPhoneError('Enter a valid 10-digit Indian mobile number (starting with 6–9).');
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      const res = await apiClient.post('/patient-data', {
        action: 'onboardClinic',
        clinicName: form.clinicName,
        address: form.address,
        contactNumber: form.contactNumber,
        adminName: form.adminName,
        adminEmail: form.adminEmail,
      });
      const data = res.data?.body ? JSON.parse(res.data.body) : res.data;
      if (data.success) {
        setMessage({ type: 'success', text: `✅ Clinic "${form.clinicName}" provisioned! Credentials emailed to ${form.adminEmail}.` });
        setForm({ clinicName: '', address: '', contactNumber: '', adminName: '', adminEmail: '' });
        onSuccess();
      } else {
        setMessage({ type: 'error', text: `❌ ${data.error || 'Unknown error'}` });
      }
    } catch (err: any) {
      const serverMsg = err.response?.data?.error || err.response?.data?.message || err.message;
      setMessage({ type: 'error', text: `❌ ${serverMsg}` });
    } finally {
      setLoading(false);
    }
  };

  const inputCls = "w-full px-4 py-2.5 rounded-lg bg-slate-950/60 border border-slate-700 text-white text-sm placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/60 focus:border-indigo-500 transition-all";
  const labelCls = "block text-xs font-medium text-slate-400 mb-1.5";

  return (
    <div className="bg-slate-900/60 border border-slate-700/60 rounded-2xl backdrop-blur-sm p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center">
          <Plus size={16} className="text-indigo-400" />
        </div>
        <div>
          <h2 className="text-white font-semibold text-base">Onboard New Clinic</h2>
          <p className="text-slate-500 text-xs mt-0.5">Provisions a secure tenant and emails credentials to the Doctor</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Clinic Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className={labelCls}>Clinic Name *</label>
            <input required type="text" className={inputCls} placeholder="e.g., City General Hospital" value={form.clinicName} onChange={set('clinicName')} />
          </div>
          <div className="md:col-span-2">
            <label className={labelCls}>Clinic Address</label>
            <input type="text" className={inputCls} placeholder="e.g., 12, MG Road, Mumbai 400001" value={form.address} onChange={set('address')} />
          </div>
          <div>
            <label className={labelCls}>Contact Number</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm font-mono select-none">+91</span>
              <input
                id="contact-number-input"
                type="tel"
                inputMode="numeric"
                maxLength={10}
                className={`${inputCls} pl-12 ${phoneError ? 'border-red-500/70 focus:ring-red-500/40 focus:border-red-500' : ''}`}
                placeholder="98765 43210"
                value={form.contactNumber}
                onChange={setPhone}
              />
            </div>
            {phoneError && (
              <p className="mt-1.5 text-xs text-red-400 flex items-center gap-1">
                <span>⚠</span> {phoneError}
              </p>
            )}
            {form.contactNumber.length === 10 && !phoneError && (
              <p className="mt-1.5 text-xs text-emerald-400">✓ Valid Indian mobile number</p>
            )}
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-slate-700/60 pt-4">
          <p className="text-xs text-slate-500 mb-3 font-medium uppercase tracking-wider">Admin Doctor Account</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Doctor's Full Name *</label>
              <input required type="text" className={inputCls} placeholder="e.g., Dr. Prashant Tiwari" value={form.adminName} onChange={set('adminName')} />
            </div>
            <div>
              <label className={labelCls}>Doctor's Email (Login ID) *</label>
              <input required type="email" className={inputCls} placeholder="e.g., doctor@clinic.com" value={form.adminEmail} onChange={set('adminEmail')} />
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/50 disabled:cursor-not-allowed text-white font-medium py-2.5 rounded-xl transition-all duration-200 shadow-lg shadow-indigo-600/20 text-sm mt-2"
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Provisioning infrastructure…
            </>
          ) : (
            <>
              <Plus size={15} />
              Provision Clinic & Send Invite
            </>
          )}
        </button>
      </form>

      {message && (
        <div className={`mt-4 p-3.5 rounded-xl text-sm border ${message.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-red-500/10 border-red-500/30 text-red-300'}`}>
          {message.text}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN DASHBOARD
// ─────────────────────────────────────────────────────────────────────────────
export default function SuperAdminDashboard() {
  const user = useAppSelector((state: RootState) => state.auth.user);
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [loadingClinics, setLoadingClinics] = useState(true);
  const [clinicError, setClinicError] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    await logout();
    navigate('/admin-login', { replace: true });
  };



  const fetchClinics = useCallback(async () => {
    setLoadingClinics(true);
    setClinicError(null);
    try {
      const res = await apiClient.post('/patient-data', { action: 'getAllClinics' });
      const data = res.data?.body ? JSON.parse(res.data.body) : res.data;
      if (data.success) {
        setClinics(data.clinics || []);
      } else {
        setClinicError(data.error || 'Failed to load clinics.');
      }
    } catch (err: any) {
      setClinicError(`Failed to load clinics: ${err.message}`);
    } finally {
      setLoadingClinics(false);
    }
  }, []);

  useEffect(() => { fetchClinics(); }, [fetchClinics]);

  // Aggregate stats
  const totalPatients   = clinics.reduce((s, c) => s + (c.patientCount   ?? 0), 0);
  const totalDoctors    = clinics.reduce((s, c) => s + (c.doctorCount    ?? 0), 0);
  const totalAssistants = clinics.reduce((s, c) => s + (c.assistantCount ?? 0), 0);
  const activeClinics   = clinics.filter(c => c.status === 'ACTIVE').length;

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Ambient background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-15%] left-[-10%] w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[140px]" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[400px] h-[400px] bg-slate-600/10 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-6 py-10">
        {/* ── Header ── */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">Super Admin Portal</h1>
            <p className="text-slate-400 text-sm mt-1">Welcome back, <span className="text-indigo-400 font-medium">{user?.name}</span>. Manage your SaaS platform below.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchClinics}
              disabled={loadingClinics}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 hover:text-white hover:border-slate-600 text-sm transition-all disabled:opacity-50"
            >
              <RefreshCw size={14} className={loadingClinics ? 'animate-spin' : ''} />
              Refresh
            </button>
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-950/60 border border-red-800/50 text-red-400 hover:text-red-300 hover:border-red-700 text-sm transition-all disabled:opacity-50"
            >
              {loggingOut
                ? <div className="w-3.5 h-3.5 border border-red-400/30 border-t-red-400 rounded-full animate-spin" />
                : <LogOut size={14} />}
              {loggingOut ? 'Signing out…' : 'Sign Out'}
            </button>
          </div>
        </div>

        {/* ── Platform Stats ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Clinics',    value: clinics.length,   icon: Building2,     color: 'text-indigo-400',  bg: 'bg-indigo-500/10 border-indigo-500/20' },
            { label: 'Active Clinics',   value: activeClinics,    icon: CheckCircle,   color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
            { label: 'Total Doctors',    value: totalDoctors,     icon: Stethoscope,   color: 'text-blue-400',    bg: 'bg-blue-500/10 border-blue-500/20' },
            { label: 'Assistants',       value: totalAssistants,  icon: UserCog,       color: 'text-purple-400',  bg: 'bg-purple-500/10 border-purple-500/20' },
            { label: 'Total Patients',   value: totalPatients,    icon: Users,         color: 'text-pink-400',    bg: 'bg-pink-500/10 border-pink-500/20' },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className={`rounded-2xl border p-4 ${bg} backdrop-blur-sm`}>
              <Icon size={20} className={`${color} mb-2`} />
              <p className="text-2xl font-bold text-white">{loadingClinics ? '—' : value}</p>
              <p className="text-xs text-slate-400 mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* ── Clinic List ── */}
        <div className="mb-8">
          <h2 className="text-base font-semibold text-slate-200 mb-4 flex items-center gap-2">
            <Building2 size={16} className="text-indigo-400" />
            Registered Clinics
            <span className="ml-1 px-2 py-0.5 bg-slate-800 border border-slate-700 rounded-full text-xs text-slate-400">{clinics.length}</span>
          </h2>

          {loadingClinics ? (
            <div className="flex items-center justify-center py-16 text-slate-500">
              <RefreshCw size={20} className="animate-spin mr-2" />
              Loading clinics…
            </div>
          ) : clinicError ? (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm">
              {clinicError}
            </div>
          ) : clinics.length === 0 ? (
            <div className="text-center py-16 text-slate-500">
              <Building2 size={32} className="mx-auto mb-3 opacity-30" />
              <p>No clinics registered yet. Use the form below to get started.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {clinics.map(clinic => (
                <ClinicCard key={clinic.tenant_id} clinic={clinic} />
              ))}
            </div>
          )}
        </div>

        {/* ── Onboard Form ── */}
        <OnboardForm onSuccess={fetchClinics} />
      </div>
    </div>
  );
}
