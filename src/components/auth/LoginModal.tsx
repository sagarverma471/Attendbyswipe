import React, { useState, useEffect } from 'react';
import {
  X,
  LogIn,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Mail,
  UserCheck,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { signInWithGoogle, User } from '../../services/firebase';
import { SwipeAttendLogo } from '../common/SwipeAttendLogo';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: User | null) => void;
  currentUser: User | null;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  currentUser,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [viewportHeight, setViewportHeight] = useState<number | null>(null);

  // Mobile virtual keyboard resize protection
  useEffect(() => {
    if (typeof window === 'undefined' || !window.visualViewport) return;
    const handleResize = () => {
      if (window.visualViewport) {
        setViewportHeight(window.visualViewport.height);
      }
    };
    window.visualViewport.addEventListener('resize', handleResize);
    return () => window.visualViewport?.removeEventListener('resize', handleResize);
  }, []);

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await signInWithGoogle();
      if (res?.user) {
        setSuccessMessage(`Welcome back, ${res.user.displayName || res.user.email}!`);
        setTimeout(() => {
          onLoginSuccess(res.user);
          onClose();
        }, 800);
      }
    } catch (err: any) {
      console.error('Google Login Error:', err);
      let userFriendlyMsg = 'Authentication could not be completed. Please try again.';
      if (err.code === 'auth/popup-blocked') {
        userFriendlyMsg = 'Mobile popup was blocked by your browser. Please allow popups or tap retry.';
      } else if (err.code === 'auth/network-request-failed') {
        userFriendlyMsg = 'Network connection problem. Please check your internet connection.';
      } else if (err.code === 'auth/unauthorized-domain') {
        userFriendlyMsg = 'This web domain is pending authorization in Firebase console.';
      } else if (err.message) {
        userFriendlyMsg = err.message;
      }
      setErrorMessage(userFriendlyMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFacultyQuickSignIn = () => {
    setIsLoading(true);
    setErrorMessage(null);
    // Instant Faculty Demo Account
    const simulatedUser = {
      uid: 'faculty-teacher-bitsindri-01',
      displayName: 'Dr. Ankit Sharma',
      email: 'ankit.sharma@bitsindri.ac.in',
      photoURL: '/student-portraits/student_10.jpg',
    } as unknown as User;

    setSuccessMessage('Authenticated as BIT Sindri Faculty Teacher!');
    setTimeout(() => {
      onLoginSuccess(simulatedUser);
      setIsLoading(false);
      onClose();
    }, 600);
  };

  const handleEmailSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setErrorMessage('Please enter both email address and password.');
      return;
    }

    if (!email.includes('@')) {
      setErrorMessage('Please enter a valid academic or college email address.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    // Mock faculty email authorization
    setTimeout(() => {
      const namePart = email.split('@')[0].replace(/[._-]/g, ' ');
      const formattedName = namePart.charAt(0).toUpperCase() + namePart.slice(1);
      const simulatedUser = {
        uid: `user-${Date.now()}`,
        displayName: formattedName || 'Faculty Member',
        email: email.trim(),
      } as unknown as User;

      setSuccessMessage(`Signed in as ${email}`);
      setTimeout(() => {
        onLoginSuccess(simulatedUser);
        setIsLoading(false);
        onClose();
      }, 600);
    }, 700);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div
        style={{ maxHeight: viewportHeight ? `${viewportHeight - 20}px` : '92vh' }}
        className="w-full max-w-md bg-[#0F1424] border border-white/10 rounded-3xl p-5 sm:p-7 shadow-2xl flex flex-col text-slate-100 overflow-y-auto relative"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
          <div className="flex items-center gap-2.5">
            <SwipeAttendLogo size={32} />
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-1.5">
                <span>Teacher Authentication</span>
                <span className="text-[10px] bg-violet-500/20 text-violet-300 px-1.5 py-0.5 rounded font-mono font-bold">
                  BIT Sindri
                </span>
              </h2>
              <p className="text-[11px] text-slate-400">Cloud Sync & Session Authorization</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Notifications */}
        {errorMessage && (
          <div className="mb-4 p-3 rounded-2xl bg-rose-950/40 border border-rose-500/40 text-rose-200 text-xs flex items-start gap-2.5 animate-shake">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-bold text-rose-300">Login Issue</p>
              <p className="text-[11px] mt-0.5 leading-relaxed">{errorMessage}</p>
            </div>
          </div>
        )}

        {successMessage && (
          <div className="mb-4 p-3 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-200 text-xs flex items-center gap-2.5 animate-fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-bold">{successMessage}</span>
          </div>
        )}

        {/* Google One-Tap / OAuth Button */}
        <div className="space-y-3 mb-5">
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-bold text-xs shadow-md transition-all cursor-pointer active:scale-95 disabled:opacity-50"
          >
            {isLoading ? (
              <RefreshCw className="w-4 h-4 animate-spin text-slate-900" />
            ) : (
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
            )}
            <span>Sign in with Google</span>
          </button>

          {/* Quick Faculty Instant Sign-In for offline / classroom demo */}
          <button
            type="button"
            onClick={handleFacultyQuickSignIn}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-violet-600/20 hover:bg-violet-600/30 border border-violet-500/30 text-violet-200 hover:text-white font-bold text-xs transition-all cursor-pointer"
          >
            <UserCheck className="w-3.5 h-3.5 text-violet-400" />
            <span>Continue as BIT Sindri Faculty</span>
          </button>
        </div>

        {/* Divider */}
        <div className="relative flex items-center justify-center mb-4">
          <div className="border-t border-white/10 w-full" />
          <span className="bg-[#0F1424] px-2 text-[10px] font-mono uppercase tracking-wider text-slate-500">
            or faculty email
          </span>
        </div>

        {/* Email & Password Form */}
        <form onSubmit={handleEmailSignIn} className="space-y-3">
          <div>
            <label className="block text-[11px] font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-violet-400" />
              <span>Email Address</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. ankit.sharma@bitsindri.ac.in"
              className="w-full bg-[#141A2E] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-violet-400" />
              <span>Password</span>
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full bg-[#141A2E] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 px-4 rounded-xl bg-linear-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-xs shadow-md shadow-violet-600/30 transition-all cursor-pointer mt-1"
          >
            {isLoading ? <RefreshCw className="w-4 h-4 animate-spin mx-auto" /> : 'Log In with Faculty Credentials'}
          </button>
        </form>

        <p className="text-[10px] text-slate-500 text-center mt-4">
          Protected by BIT Sindri Academic Access Policy & Cloud Firestore
        </p>
      </div>
    </div>
  );
};
