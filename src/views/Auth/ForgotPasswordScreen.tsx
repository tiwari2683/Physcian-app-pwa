import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, KeyRound, CheckCircle2, ArrowLeft } from 'lucide-react';
import { authService } from '../../services/auth/authService';

type Step = 'EMAIL' | 'OTP' | 'SUCCESS';

export const ForgotPasswordScreen = () => {
  const [step, setStep] = useState<Step>('EMAIL');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      await authService.forgotPassword(email);
      setStep('OTP');
    } catch (err: any) {
      console.error('Forgot password error:', err);
      setError(err.message || 'Failed to send reset code.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmReset = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await authService.confirmForgotPassword(email, otp, newPassword);
      setStep('SUCCESS');
    } catch (err: any) {
      console.error('Confirm password error:', err);
      setError(err.message || 'Failed to reset password. Please check your verification code.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {step !== 'SUCCESS' && (
          <button 
            type="button"
            onClick={() => navigate('/login')}
            className="mb-6 flex items-center text-gray-600 hover:text-blue-600 transition-colors font-medium text-sm"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Login
          </button>
        )}

        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mb-4 text-white shadow-md shadow-blue-200">
              {step === 'SUCCESS' ? (
                <CheckCircle2 className="w-8 h-8" />
              ) : step === 'OTP' ? (
                <KeyRound className="w-8 h-8" />
              ) : (
                <Mail className="w-8 h-8" />
              )}
            </div>
            <h2 className="text-2xl font-bold text-gray-900">
              {step === 'EMAIL' ? 'Forgot Password?' : step === 'OTP' ? 'Reset Password' : 'Password Reset'}
            </h2>
            <p className="text-gray-500 mt-2 text-center text-sm px-4">
              {step === 'EMAIL' 
                ? "Enter your email address, and we'll send you a 6-digit code to reset your password."
                : step === 'OTP' 
                  ? `Enter the 6-digit code sent to your email and create your new password.`
                  : "Your password has been successfully reset. You can now use it to log in."}
            </p>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm mb-6 text-center border border-red-100">
              {error}
            </div>
          )}

          {step === 'EMAIL' && (
            <form onSubmit={handleSendCode} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="doctor@example.com"
                />
              </div>
              
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-blue-600 text-white font-medium py-2.5 rounded-md hover:bg-blue-700 transition-colors disabled:bg-blue-400 disabled:cursor-not-allowed flex justify-center items-center shadow-sm"
              >
                {isLoading ? 'Sending Code...' : 'Send Reset Code'}
              </button>
            </form>
          )}

          {step === 'OTP' && (
            <form onSubmit={handleConfirmReset} className="space-y-5">
              <div className="text-sm text-center font-medium bg-blue-50 text-blue-700 p-2.5 rounded-lg border border-blue-100">
                Code sent to: {email}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Verification Code</label>
                <input
                  type="text"
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors tracking-widest text-center text-lg font-bold"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="123456"
                  maxLength={6}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                <input
                  type="password"
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
                <input
                  type="password"
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>
              
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-blue-600 text-white font-medium py-2.5 rounded-md hover:bg-blue-700 transition-colors disabled:bg-blue-400 disabled:cursor-not-allowed flex justify-center items-center shadow-sm mt-2"
              >
                {isLoading ? 'Resetting Password...' : 'Change Password'}
              </button>
            </form>
          )}

          {step === 'SUCCESS' && (
            <div className="space-y-6 pt-2">
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="w-full bg-blue-600 text-white font-medium py-2.5 rounded-md hover:bg-blue-700 transition-colors shadow-sm"
              >
                Return to Login
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
