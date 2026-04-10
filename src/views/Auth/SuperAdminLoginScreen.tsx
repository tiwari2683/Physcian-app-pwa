import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../controllers/hooks/useAuth';
import { useAppSelector } from '../../controllers/hooks/hooks';
import { Shield, Eye, EyeOff, ArrowLeft } from 'lucide-react';

export const SuperAdminLoginScreen = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { login, logout, error } = useAuth();
  const { isLoading } = useAppSelector((state) => state.auth);
  const navigate = useNavigate();

  const handleForceLogout = async () => {
    await logout();
    window.location.reload(); // Refresh to clean slate
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await login(email, password);
    if (result === 'success') {
      // Direct them exactly home!
      navigate('/superadmin/dashboard', { replace: true });
    } else if (result === 'new_password_required') {
      navigate('/change-password', { replace: true });
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      
      {/* Background Decorative Elemements */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-indigo-600/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-slate-500/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Back Button */}
      <div className="absolute top-6 left-6">
        <Link to="/login" className="flex items-center text-slate-400 hover:text-white transition-colors duration-200">
          <ArrowLeft size={20} className="mr-2" />
          <span className="text-sm font-medium">Back to Physician Portal</span>
        </Link>
      </div>

      <div className="max-w-md w-full bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-2xl shadow-2xl p-8 relative z-10">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-indigo-700 shadow-lg shadow-indigo-500/30 rounded-full flex items-center justify-center mb-5 border border-indigo-400/20">
            <Shield className="text-white w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-white tracking-wide">Admin Portal</h2>
          <p className="text-slate-400 mt-2 text-sm">Authorized personnel only</p>
        </div>

        {error && (
          <div className="bg-red-900/40 border border-red-500/40 text-red-200 p-3 rounded-lg text-sm mb-6 text-center shadow-inner flex flex-col items-center">
            <span className="mb-2">{error}</span>
            {error.toLowerCase().includes('already a signed in user') && (
              <button 
                type="button" 
                onClick={handleForceLogout}
                className="mt-2 text-xs bg-red-800 hover:bg-red-700 shadow shadow-red-900/50 px-4 py-2 rounded-md text-white font-medium transition-colors"
              >
                Clear Cached Session
              </button>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Email Address</label>
            <input
              type="email"
              required
              className="w-full px-4 py-3 bg-slate-950/50 border border-slate-700 text-white rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all placeholder-slate-600"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@practice.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                className="w-full px-4 py-3 pr-10 bg-slate-950/50 border border-slate-700 text-white rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all placeholder-slate-600"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 focus:outline-none transition-colors"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className="flex justify-end -mt-2 mb-2">
            <Link to="/forgot-password" className="text-sm font-medium text-indigo-400 hover:text-indigo-300 hover:underline transition-colors">
              Recover access
            </Link>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-3 rounded-lg transition-all duration-200 disabled:bg-indigo-600/50 disabled:text-white/50 disabled:cursor-not-allowed flex justify-center items-center shadow-lg shadow-indigo-600/20"
          >
            {isLoading ? (
              <div className="flex space-x-2 justify-center items-center">
                <span className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0s' }}></span>
                <span className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                <span className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></span>
              </div>
            ) : (
              'Authenticate'
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
