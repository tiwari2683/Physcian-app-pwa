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
    Camera,
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
        hidden: { opacity: 0, y: 10 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.4 } }
    };

    return (
        <div className="p-4 md:p-8 max-w-6xl mx-auto">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-10">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                        <SettingsIcon className="text-primary-base" size={32} />
                        Settings Center
                    </h1>
                    <p className="text-slate-500 font-medium text-sm mt-1">Configure your personal profile and account security preferences.</p>
                </div>
                <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200">
                    {(['profile', 'security', 'notifications'] as const).map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                                activeTab === tab 
                                ? 'bg-white text-primary-base shadow-sm font-black' 
                                : 'text-slate-500 hover:text-slate-700'
                            }`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                
                {/* Sidebar Card */}
                <div className="lg:col-span-4 space-y-6">
                    <motion.div 
                        initial="hidden" 
                        animate="visible" 
                        variants={containerVariants}
                        className="bg-white rounded-3xl p-6 shadow-tier-base border border-slate-100 flex flex-col items-center text-center relative overflow-hidden"
                    >
                        <div className="absolute top-0 right-0 w-32 h-32 bg-primary-base/5 rounded-full -mr-16 -mt-16 blur-2xl"></div>
                        
                        <div className="relative mb-6">
                            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary-base to-indigo-600 flex items-center justify-center text-white text-3xl font-black shadow-tier-dark">
                                {user?.name?.charAt(0) || 'D'}
                            </div>
                            <button className="absolute bottom-0 right-0 p-2 bg-white rounded-full shadow-lg border border-slate-100 text-primary-base hover:scale-110 transition-transform">
                                <Camera size={16} />
                            </button>
                        </div>

                        <h2 className="text-xl font-black text-slate-900 leading-none">{user?.name || 'Physician'}</h2>
                        <div className="mt-2 flex items-center gap-2 px-3 py-1 bg-primary-light text-primary-base rounded-full border border-primary-base/10">
                            <Shield size={12} />
                            <span className="text-[10px] font-black uppercase tracking-widest">{user?.role || 'Doctor'}</span>
                        </div>

                        <div className="w-full mt-8 pt-8 border-t border-slate-100 space-y-4">
                            <div className="flex items-center justify-between text-xs text-slate-500 font-bold">
                                <span>Status</span>
                                <span className="flex items-center gap-1.5 text-emerald-500">
                                    <CheckCircle2 size={14} /> Verified
                                </span>
                            </div>
                            <div className="flex items-center justify-between text-xs text-slate-500 font-bold">
                                <span>Joined</span>
                                <span className="text-slate-900">March 2024</span>
                            </div>
                        </div>

                        <button 
                            onClick={handleLogout}
                            className="w-full mt-8 p-4 rounded-2xl bg-rose-50 text-rose-500 font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-rose-100 transition-colors border border-rose-100"
                        >
                            <LogOut size={16} /> Logout Account
                        </button>
                    </motion.div>
                </div>

                {/* Main Settings Panel */}
                <div className="lg:col-span-8">
                    <AnimatePresence mode="wait">
                        {activeTab === 'profile' && (
                            <motion.div
                                key="profile"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-6"
                            >
                                <div className="bg-white rounded-3xl p-8 shadow-tier-base border border-slate-100">
                                    <h3 className="text-lg font-black text-slate-900 mb-6 flex items-center gap-2">
                                        <User className="text-primary-base" size={20} />
                                        Profile Information
                                    </h3>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Full Identity Name</label>
                                            <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                                <User size={18} className="text-slate-400" />
                                                <span className="text-sm font-bold text-slate-900">{user?.name}</span>
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Official Email Address</label>
                                            <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                                <Mail size={18} className="text-slate-400" />
                                                <span className="text-sm font-bold text-slate-900">{user?.email}</span>
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Assigned Platform Role</label>
                                            <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                                <Briefcase size={18} className="text-slate-400" />
                                                <span className="text-sm font-bold text-slate-900">{user?.role} Access Mode</span>
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">PWA Experience Mode</label>
                                            <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                                <Layout size={18} className="text-slate-400" />
                                                <span className="text-sm font-bold text-slate-900">Standard Healthcare Admin</span>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="mt-10 p-6 bg-indigo-50/50 rounded-2xl border border-indigo-100 flex items-start gap-4">
                                        <Bell className="text-indigo-600 mt-1" size={20} />
                                        <div>
                                            <h4 className="text-sm font-black text-indigo-900">Need to update your professional details?</h4>
                                            <p className="text-xs font-bold text-indigo-600/70 mt-1 leading-relaxed">Identity and role information are synced with the AWS Cognito User Pool. To modify these, please contact your System Administrator.</p>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {activeTab === 'security' && (
                            <motion.div
                                key="security"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="bg-white rounded-3xl p-8 shadow-tier-base border border-slate-100"
                            >
                                <h3 className="text-lg font-black text-slate-900 mb-6 flex items-center gap-2">
                                    <ShieldCheck className="text-primary-base" size={20} />
                                    Access Security Settings
                                </h3>

                                <div className="max-w-md">
                                    {success && (
                                        <div className="mb-6 p-4 bg-emerald-50 text-emerald-700 rounded-2xl flex gap-3 text-sm font-bold border border-emerald-100 items-center animate-bounce-in">
                                            <ShieldCheck className="w-5 h-5 shrink-0 text-emerald-500" />
                                            <p>Security credentials updated successfully.</p>
                                        </div>
                                    )}
                                    
                                    {error && (
                                        <div className="mb-6 p-4 bg-rose-50 text-rose-600 rounded-2xl text-xs font-bold border border-rose-100 flex items-start gap-3">
                                            <LogOut className="w-4 h-4 mt-0.5" />
                                            <p className="leading-relaxed">{error}</p>
                                        </div>
                                    )}

                                    <form onSubmit={handleChangePassword} className="space-y-6">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Current Password Access</label>
                                            <div className="relative group">
                                                <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary-base transition-colors" size={18} />
                                                <input
                                                    type="password"
                                                    required
                                                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-primary-base/10 focus:border-primary-base focus:bg-white outline-none text-sm font-bold transition-all"
                                                    value={oldPassword}
                                                    onChange={(e) => setOldPassword(e.target.value)}
                                                    placeholder="Enter verified current password"
                                                />
                                            </div>
                                        </div>
                                        
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Desired New Password</label>
                                            <div className="relative group">
                                                <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary-base transition-colors" size={18} />
                                                <input
                                                    type="password"
                                                    required
                                                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-primary-base/10 focus:border-primary-base focus:bg-white outline-none text-sm font-bold transition-all"
                                                    value={newPassword}
                                                    onChange={(e) => setNewPassword(e.target.value)}
                                                    placeholder="Minimum 8 characters safe strength"
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Confirm Identity Verification</label>
                                            <div className="relative group">
                                                <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary-base transition-colors" size={18} />
                                                <input
                                                    type="password"
                                                    required
                                                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-primary-base/10 focus:border-primary-base focus:bg-white outline-none text-sm font-bold transition-all"
                                                    value={confirmPassword}
                                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                                    placeholder="Repeat new password for verification"
                                                />
                                            </div>
                                        </div>
                                        
                                        <button
                                            type="submit"
                                            disabled={isLoading}
                                            className="w-full bg-slate-900 text-white font-black text-xs uppercase tracking-widest py-4 rounded-2xl hover:bg-primary-base transition-all active:scale-[0.98] disabled:bg-slate-300 disabled:cursor-not-allowed flex justify-center items-center gap-3 shadow-xl shadow-slate-200"
                                        >
                                            {isLoading ? 'Processing Securty Update...' : (
                                                <>
                                                    <ShieldCheck size={18} />
                                                    Commit Password Change
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
                                exit={{ opacity: 0, x: -20 }}
                                className="bg-white rounded-3xl p-8 shadow-tier-base border border-slate-100 h-full flex flex-col items-center justify-center text-center py-20"
                            >
                                <Bell className="text-slate-200" size={80} />
                                <h3 className="text-xl font-black text-slate-900 mt-6 mb-2">Notification Preferences</h3>
                                <p className="text-slate-500 font-bold text-sm max-w-sm">Push notifications and email alerts are coming in the next version of the Physician Experience update.</p>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
};
