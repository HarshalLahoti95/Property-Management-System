'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Mail, Lock, Loader2, ArrowRight, Shield, User } from 'lucide-react';

export default function LoginPage() {
  const [loginType, setLoginType] = useState<'admin' | 'otp'>('admin');
  
  // Admin Login States
  const [email, setEmail] = useState('admin@example.com');
  const [password, setPassword] = useState('password123');
  
  // OTP Login States
  const [otpEmail, setOtpEmail] = useState('');
  const [role, setRole] = useState<'TENANT' | 'LANDLORD'>('TENANT');
  const [otpCode, setOtpCode] = useState('');
  const [otpStep, setOtpStep] = useState<'request' | 'verify'>('request');
  const [message, setMessage] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const router = useRouter();

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        login(data.user);
        window.location.href = '/dashboard';
      } else {
        setError(data.message || 'Invalid credentials');
      }
    } catch (err) {
      setError('An error occurred during login');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setMessage('');

    try {
      const res = await fetch('/api/auth/otp/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: otpEmail, role }),
      });

      const data = await res.json();

      if (res.ok) {
        setOtpStep('verify');
        setMessage(data.message || 'OTP sent successfully! Please check your email.');
      } else {
        setError(data.message || 'Failed to request OTP. Make sure email and role match.');
      }
    } catch (err) {
      setError('An error occurred while sending OTP');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: otpEmail, code: otpCode, role }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        login(data.user);
        window.location.href = '/dashboard';
      } else {
        setError(data.message || 'Invalid or expired OTP code');
      }
    } catch (err) {
      setError('An error occurred during OTP verification');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-slate-900">
      {/* Background Gradients & Animated Shapes */}
      <div className="absolute inset-0 w-full h-full bg-slate-950 z-0" />
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-primary/30 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '4s' }} />
      <div className="absolute bottom-[-10%] right-[-10%] w-[30rem] h-[30rem] bg-purple-600/20 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '6s' }} />
      
      <div className="z-10 w-full max-w-md p-8 m-4 rounded-2xl glass shadow-2xl transition-all duration-500 hover:shadow-primary/10 bg-slate-900/40 border border-slate-800 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-500">
        <div className="mb-6 text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 text-primary mb-2 ring-1 ring-primary/20">
            <Lock className="w-6 h-6" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white font-sans">Welcome Back</h1>
          <p className="text-slate-400 text-sm">Choose your login method to access your account</p>
        </div>

        {/* Tab Controls */}
        <div className="grid grid-cols-2 gap-1 bg-slate-950/60 p-1 rounded-xl mb-6 border border-slate-800">
          <button
            type="button"
            onClick={() => {
              setLoginType('admin');
              setError('');
              setMessage('');
            }}
            className={`py-2 text-sm font-semibold rounded-lg transition-all duration-200 ${
              loginType === 'admin'
                ? 'bg-primary text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/30'
            }`}
          >
            Administrator
          </button>
          <button
            type="button"
            onClick={() => {
              setLoginType('otp');
              setError('');
              setMessage('');
            }}
            className={`py-2 text-sm font-semibold rounded-lg transition-all duration-200 ${
              loginType === 'otp'
                ? 'bg-primary text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/30'
            }`}
          >
            Tenant / Landlord
          </button>
        </div>

        {error && (
          <div className="mb-6 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm text-center animate-in fade-in slide-in-from-top-2">
            {error}
          </div>
        )}

        {message && (
          <div className="mb-6 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm text-center animate-in fade-in slide-in-from-top-2">
            {message}
          </div>
        )}

        {loginType === 'admin' ? (
          <form onSubmit={handleAdminLogin} className="space-y-5">
            <div className="space-y-2 relative group">
              <label className="text-sm font-medium text-slate-300 ml-1">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-primary transition-colors" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-900/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-300"
                  placeholder="admin@example.com"
                />
              </div>
            </div>

            <div className="space-y-2 relative group">
              <div className="flex items-center justify-between ml-1">
                <label className="text-sm font-medium text-slate-300">Password</label>
                <a href="#" className="text-xs text-primary hover:text-primary/80 transition-colors">Forgot password?</a>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-primary transition-colors" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-900/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-300"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-6 py-2.5 px-4 bg-primary hover:bg-primary/90 text-white rounded-xl font-medium transition-all duration-300 flex items-center justify-center group disabled:opacity-70 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-primary/25 relative overflow-hidden"
            >
              <span className="relative flex items-center gap-2">
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>
                    Sign in as Admin
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </span>
            </button>
          </form>
        ) : (
          <div className="space-y-5">
            {otpStep === 'request' ? (
              <form onSubmit={handleSendOtp} className="space-y-5">
                {/* Role Selector Control */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300 ml-1">Select Role</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setRole('TENANT')}
                      className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-medium transition-all duration-200 ${
                        role === 'TENANT'
                          ? 'border-primary bg-primary/10 text-white font-semibold'
                          : 'border-slate-700 bg-slate-900/30 text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
                      }`}
                    >
                      <User className="w-4 h-4" />
                      Tenant
                    </button>
                    <button
                      type="button"
                      onClick={() => setRole('LANDLORD')}
                      className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-medium transition-all duration-200 ${
                        role === 'LANDLORD'
                          ? 'border-primary bg-primary/10 text-white font-semibold'
                          : 'border-slate-700 bg-slate-900/30 text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
                      }`}
                    >
                      <Shield className="w-4 h-4" />
                      Landlord
                    </button>
                  </div>
                </div>

                <div className="space-y-2 relative group">
                  <label className="text-sm font-medium text-slate-300 ml-1">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-primary transition-colors" />
                    <input
                      type="email"
                      required
                      value={otpEmail}
                      onChange={(e) => setOtpEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-900/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-300"
                      placeholder="user@example.com"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full mt-6 py-2.5 px-4 bg-primary hover:bg-primary/90 text-white rounded-xl font-medium transition-all duration-300 flex items-center justify-center group disabled:opacity-70 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-primary/25 relative overflow-hidden"
                >
                  <span className="relative flex items-center gap-2">
                    {isLoading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Requesting OTP...
                      </>
                    ) : (
                      <>
                        Send Verification Code
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                  </span>
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} className="space-y-5">
                <div className="text-center text-sm text-slate-300">
                  We've sent a 6-digit code to <strong className="text-white">{otpEmail}</strong> ({role.toLowerCase()}).
                </div>

                <div className="space-y-2 relative group">
                  <label className="text-sm font-medium text-slate-300 ml-1">One-Time Password (OTP)</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-primary transition-colors" />
                    <input
                      type="text"
                      required
                      maxLength={6}
                      pattern="\d{6}"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 tracking-[0.5em] text-center text-xl bg-slate-900/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-300 font-mono"
                      placeholder="000000"
                    />
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setOtpStep('request');
                      setOtpCode('');
                      setMessage('');
                      setError('');
                    }}
                    className="w-1/3 py-2.5 px-4 bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white rounded-xl font-medium transition-all duration-300 border border-slate-700"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-2/3 py-2.5 px-4 bg-primary hover:bg-primary/90 text-white rounded-xl font-medium transition-all duration-300 flex items-center justify-center group disabled:opacity-70 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-primary/25 relative overflow-hidden"
                  >
                    <span className="relative flex items-center gap-2">
                      {isLoading ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Verifying...
                        </>
                      ) : (
                        <>
                          Verify & Sign In
                          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </>
                      )}
                    </span>
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        <div className="mt-8 text-center">
          <p className="text-sm text-slate-400">
            Don't have an account?{' '}
            <a href="#" className="text-primary hover:text-primary/80 transition-colors font-medium">Request access</a>
          </p>
        </div>
      </div>
    </div>
  );
}
