import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { KeyRound, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../controllers/hooks/useAuth';
import { useAppSelector } from '../../controllers/hooks/hooks';

export const ForceChangePasswordScreen = () => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const { completeNewPassword, error } = useAuth();
  const { isLoading } = useAppSelector((state) => state.auth);
  const navigate = useNavigate();

  const passwordRules = [
    { label: 'At least 8 characters', test: (p: string) => p.length >= 8 },
    { label: 'One uppercase letter', test: (p: string) => /[A-Z]/.test(p) },
    { label: 'One lowercase letter', test: (p: string) => /[a-z]/.test(p) },
    { label: 'One number', test: (p: string) => /\d/.test(p) },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (newPassword !== confirmPassword) {
      setLocalError("Passwords don't match.");
      return;
    }
    const failedRule = passwordRules.find((r) => !r.test(newPassword));
    if (failedRule) {
      setLocalError(`Password must meet: ${failedRule.label}`);
      return;
    }

    const ok = await completeNewPassword(newPassword);
    if (ok) {
      setSuccess(true);
      setTimeout(() => navigate('/dashboard', { replace: true }), 1500);
    }
  };

  const displayError = localError || error;

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
        <div className="flex flex-col items-center mb-8">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${success ? 'bg-green-500' : 'bg-blue-600'}`}>
            {success ? (
              <CheckCircle2 className="text-white w-8 h-8" />
            ) : (
              <KeyRound className="text-white w-8 h-8" />
            )}
          </div>
          <h2 className="text-2xl font-bold text-gray-900">
            {success ? 'Password Set!' : 'Set Your Password'}
          </h2>
          <p className="text-gray-500 mt-2 text-center text-sm px-4">
            {success
              ? 'Your password has been set. Redirecting to your dashboard…'
              : 'Your account was created with a temporary password. Please set a permanent one to continue.'}
          </p>
        </div>

        {!success && (
          <>
            {displayError && (
              <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm mb-6 text-center border border-red-100">
                {displayError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* New Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                <div className="relative">
                  <input
                    type={showNew ? 'text' : 'password'}
                    required
                    className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showNew ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* Password strength indicators */}
              <div className="grid grid-cols-2 gap-2">
                {passwordRules.map((rule) => {
                  const passed = rule.test(newPassword);
                  return (
                    <div
                      key={rule.label}
                      className={`text-xs flex items-center gap-1.5 ${passed ? 'text-green-600' : 'text-gray-400'}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${passed ? 'bg-green-500' : 'bg-gray-300'}`} />
                      {rule.label}
                    </div>
                  );
                })}
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
                <div className="relative">
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    required
                    className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {confirmPassword && newPassword !== confirmPassword && (
                  <p className="text-red-500 text-xs mt-1">Passwords don't match</p>
                )}
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-blue-600 text-white font-medium py-2.5 rounded-md hover:bg-blue-700 transition-colors disabled:bg-blue-400 disabled:cursor-not-allowed flex justify-center items-center shadow-sm"
              >
                {isLoading ? 'Setting Password…' : 'Set Permanent Password'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};
