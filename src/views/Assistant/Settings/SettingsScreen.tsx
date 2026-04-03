import React, { useState } from 'react';
import { 
    ShieldCheck, 
    KeyRound, 
    User, 
    Mail, 
    Briefcase, 
    Layout, 
    Bell, 
    Settings as SettingsIcon,
    LogOut,
    CheckCircle2,
    Shield
} from 'lucide-react';
import { authService } from '../../../services/auth/authService';
import { useAppSelector, useAppDispatch } from '../../../controllers/hooks/hooks';
import { logoutUser } from '../../../controllers/slices/authSlice';
import { motion, AnimatePresence } from 'framer-motion';

export const SettingsScreen = () => {
    const dispatch = useAppDispatch();
    const { user } = useAppSelector((state) => state.auth);
    const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'notifications'>('profile');

    // Password State
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            setError("New passwords don't match.");
            return;
        }
        if (newPassword.length < 8) {
            setError("New password must be at least 8 characters long.");
            return;
        }
        setIsLoading(true);
        setError(null);
        setSuccess(false);
        try {
            await authService.changePassword(oldPassword, newPassword);
            setSuccess(true);
            setOldPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (err: any) {
            setError(err.message || 'Failed to change password.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleLogout = () => {
        authService.logout();
        dispatch(logoutUser());
    };

    const containerVariants = {
        hidden: { opacity: 0, scale: 0.98 },
        visible: { opacity: 1, scale: 1, transition: { duration: 0.5 } }
    };

    return (
        <div className="p-4 md:p-8 max-w-6xl mx-auto">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                        <SettingsIcon className="text-primary-base" size={32} />
                        Assistant Hub Settings
                    </h1>
                    <p className="text-slate-500 font-bold text-sm mt-1 uppercase tracking-widest text-[10px]">Portal Configuration & Security Control</p>
                </div>
                <div className="flex bg-slate-100/80 backdrop-blur-md p-1.5 rounded-2xl border border-slate-200/50 shadow-glass-sm">
                    {(['profile', 'security', 'notifications'] as const).map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-7 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${
                                activeTab === tab 
                                ? 'bg-white text-primary-base shadow-sm font-black scale-[1.02]' 
                                : 'text-slate-400 hover:text-slate-700'
                            }`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                
                {/* Left Sidebar Profile Section */}
                <div className="lg:col-span-4">
                    <motion.div 
                        initial="hidden" 
                        animate="visible" 
                        variants={containerVariants}
                        className="bg-white rounded-[32px] p-8 shadow-tier-base border border-slate-100 flex flex-col items-center text-center relative overflow-hidden"
                    >
                        {/* Decorative Elements */}
                        <div className="absolute top-0 right-0 w-40 h-40 bg-primary-base/5 rounded-full -mr-20 -mt-20 blur-3xl"></div>
                        <div className="absolute bottom-0 left-0 w-24 h-24 bg-indigo- base/5 rounded-full -ml-12 -mb-12 blur-3xl"></div>
                        
                        <div className="relative mb-8 pt-4">
                            <div className="w-28 h-28 rounded-[38px] bg-gradient-to-br from-primary-base to-indigo-600 flex items-center justify-center text-white text-4xl font-black shadow-tier-dark rotate-3 hover:rotate-0 transition-transform duration-500 group cursor-pointer">
                                {user?.name?.charAt(0) || 'A'}
                            </div>
                            <div className="absolute -bottom-2 -right-2 bg-emerald-500 p-2.5 rounded-2xl border-4 border-white shadow-lg text-white">
                                <ShieldCheck size={18} />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <h2 className="text-2xl font-black text-slate-900 tracking-tight leading-none">{user?.name || 'Care Assistant'}</h2>
                            <p className="text-slate-400 font-bold text-xs uppercase tracking-[0.2em]">{user?.email}</p>
                        </div>

                        <div className="w-full mt-10 space-y-3">
                            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between text-[11px] font-black uppercase tracking-widest text-slate-500">
                                <div className="flex items-center gap-3">
                                    <Shield size={16} className="text-primary-base" />
                                    <span>Access Role</span>
                                </div>
                                <span className="text-slate-900">{user?.role || 'Assistant'}</span>
                            </div>
                            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between text-[11px] font-black uppercase tracking-widest text-slate-500">
                                <div className="flex items-center gap-3">
                                    <Layout size={16} className="text-primary-base" />
                                    <span>Sync Status</span>
                                </div>
                                <span className="text-emerald-500 flex items-center gap-1.5">
                                    <CheckCircle2 size={14} /> Cloud Active
                                </span>
                            </div>
                        </div>

                        <button 
                            onClick={handleLogout}
                            className="w-full mt-10 p-4 rounded-2xl bg-slate-900 text-white font-black text-[11px] uppercase tracking-[0.2em] flex items-center justify-center gap-3 hover:bg-primary-base transition-all duration-300 shadow-tier-base"
                        >
                            <LogOut size={16} /> Logout Securely
                        </button>
                    </motion.div>
                </div>

                {/* Right Interactive Panel */}
                <div className="lg:col-span-8">
                    <AnimatePresence mode="wait">
                        {activeTab === 'profile' && (
                            <motion.div
                                key="profile"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="space-y-6"
                            >
                                <div className="bg-white rounded-[32px] p-10 shadow-tier-base border border-slate-100">
                                    <div className="flex items-center gap-4 mb-10">
                                        <div className="p-3.5 bg-primary-light text-primary-base rounded-[18px]">
                                            <User size={24} />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-black text-slate-900 tracking-tight leading-none">Public Identity</h3>
                                            <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">Global platform credentials</p>
                                        </div>
                                    </div>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                        <div className="group">
                                            <div className="flex items-center gap-3 mb-3">
                                                <div className="w-7 h-7 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 group-focus-within:bg-primary-base group-focus-within:text-white transition-colors">
                                                    <User size={14} />
                                                </div>
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest group-focus-within:text-primary-base transition-colors">Assistant Full Name</label>
                                            </div>
                                            <input 
                                                readOnly
                                                value={user?.name}
                                                className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-700 outline-none cursor-default"
                                            />
                                        </div>

                                        <div className="group">
                                            <div className="flex items-center gap-3 mb-3">
                                                <div className="w-7 h-7 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 group-focus-within:bg-primary-base group-focus-within:text-white transition-colors">
                                                    <Mail size={14} />
                                                </div>
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest group-focus-within:text-primary-base transition-colors">Primary Email Communication</label>
                                            </div>
                                            <input 
                                                readOnly
                                                value={user?.email}
                                                className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-700 outline-none cursor-default"
                                            />
                                        </div>

                                        <div className="group">
                                            <div className="flex items-center gap-3 mb-3">
                                                <div className="w-7 h-7 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400">
                                                    <Briefcase size={14} />
                                                </div>
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Platform Authorization</label>
                                            </div>
                                            <div className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl flex items-center gap-3">
                                                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-sm shadow-emerald-500/20"></div>
                                                <span className="text-sm font-bold text-slate-700">{user?.role} — Certified</span>
                                            </div>
                                        </div>

                                        <div className="group">
                                            <div className="flex items-center gap-3 mb-3">
                                                <div className="w-7 h-7 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400">
                                                    <Layout size={14} />
                                                </div>
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Interface Mode</label>
                                            </div>
                                            <div className="w-full px-6 py-4 bg-slate-100/50 border border-slate-200/50 rounded-2xl text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] italic">
                                                Role Restricted
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="mt-12 p-6 bg-amber-50/50 rounded-[24px] border border-amber-100 flex items-start gap-5 relative overflow-hidden">
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full -mr-16 -mt-16 blur-2x"></div>
                                        <Bell className="text-amber-600 mt-1 shrink-0" size={24} />
                                        <div>
                                            <h4 className="text-[11px] font-black text-amber-900 uppercase tracking-widest mb-1.5">Administrative Guard</h4>
                                            <p className="text-xs font-bold text-amber-600/80 leading-relaxed uppercase tracking-widest text-[9px]">Identity changes require administrative intervention from the central healthcare dashboard. Please contact IT support for profile modifications.</p>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {activeTab === 'security' && (
                            <motion.div
                                key="security"
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, y: 20 }}
                                className="bg-white rounded-[32px] p-10 shadow-tier-base border border-slate-100"
                            >
                                <div className="flex items-center gap-4 mb-10">
                                    <div className="p-3.5 bg-primary-light text-primary-base rounded-[18px]">
                                        <ShieldCheck size={24} />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black text-slate-900 tracking-tight leading-none">Security Center</h3>
                                        <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">Update your access credentials</p>
                                    </div>
                                </div>

                                <div className="max-w-md">
                                    {success && (
                                        <div className="mb-8 p-5 bg-emerald-50 text-emerald-700 rounded-2xl flex gap-4 text-xs font-black uppercase tracking-widest border border-emerald-200 items-center animate-bounce-in">
                                            <CheckCircle2 className="w-6 h-6 shrink-0 text-emerald-500" />
                                            <p>Access credentials updated with cloud sync.</p>
                                        </div>
                                    )}
                                    
                                    {error && (
                                        <div className="mb-8 p-5 bg-rose-50 text-rose-600 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-rose-100 flex items-start gap-4">
                                            <LogOut className="w-5 h-5 mt-0.5" />
                                            <p className="leading-relaxed">{error}</p>
                                        </div>
                                    )}

                                    <form onSubmit={handleChangePassword} className="space-y-8">
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Verified Current Password</label>
                                            <div className="relative group">
                                                <KeyRound className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary-base transition-colors" size={18} />
                                                <input
                                                    type="password"
                                                    required
                                                    className="w-full pl-14 pr-6 py-4.5 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-primary-base/10 focus:border-primary-base focus:bg-white outline-none text-sm font-bold transition-all placeholder:text-slate-300"
                                                    value={oldPassword}
                                                    onChange={(e) => setOldPassword(e.target.value)}
                                                    placeholder="Enter verified current password"
                                                />
                                            </div>
                                        </div>
                                        
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">New Security Credential</label>
                                            <div className="relative group">
                                                <KeyRound className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary-base transition-colors" size={18} />
                                                <input
                                                    type="password"
                                                    required
                                                    className="w-full pl-14 pr-6 py-4.5 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-primary-base/10 focus:border-primary-base focus:bg-white outline-none text-sm font-bold transition-all placeholder:text-slate-300"
                                                    value={newPassword}
                                                    onChange={(e) => setNewPassword(e.target.value)}
                                                    placeholder="Set 8+ character strong phrase"
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Confirm New Credential</label>
                                            <div className="relative group">
                                                <KeyRound className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary-base transition-colors" size={18} />
                                                <input
                                                    type="password"
                                                    required
                                                    className="w-full pl-14 pr-6 py-4.5 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-primary-base/10 focus:border-primary-base focus:bg-white outline-none text-sm font-bold transition-all placeholder:text-slate-300"
                                                    value={confirmPassword}
                                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                                    placeholder="Retype for secure confirmation"
                                                />
                                            </div>
                                        </div>
                                        
                                        <button
                                            type="submit"
                                            disabled={isLoading}
                                            className="w-full bg-slate-900 text-white font-black text-[11px] uppercase tracking-[0.2em] py-5 rounded-2xl hover:bg-primary-base transition-all active:scale-[0.98] disabled:bg-slate-300 disabled:cursor-not-allowed flex justify-center items-center gap-3 shadow-xl overflow-hidden group relative"
                                        >
                                            <div className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500 skew-x-12"></div>
                                            {isLoading ? 'Updating Cloud Credentials...' : (
                                                <>
                                                    <ShieldCheck size={20} />
                                                    Commit Security Update
                                                </>
                                            )}
                                        </button>
                                    </form>
                                </div>
                            </motion.div>
                        )}

                        {activeTab === 'notifications' && (
                            <motion.div
                                key="notifications"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0 }}
                                className="bg-white rounded-[32px] p-10 shadow-tier-base border border-slate-100 h-full flex flex-col items-center justify-center text-center py-20"
                            >
                                <div className="p-8 bg-slate-50 rounded-[40px] mb-8 group overflow-hidden relative">
                                    <div className="absolute inset-0 bg-primary-base/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                    <Bell className="text-slate-200 group-hover:text-primary-base transition-colors group-hover:rotate-12 duration-500" size={100} />
                                </div>
                                <h3 className="text-2xl font-black text-slate-900 mb-3 tracking-tight">Signal Connectivity</h3>
                                <p className="text-slate-500 font-bold text-xs max-w-sm uppercase tracking-widest leading-relaxed">Push alerts and lab notification signals are currently in development for the Assistant Hub v2.0 update.</p>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
};
