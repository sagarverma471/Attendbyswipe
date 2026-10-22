import React, { useState, useEffect } from 'react';
import {
  Download,
  X,
  Check,
  Smartphone,
  Laptop,
  FolderArchive,
  Terminal,
  Copy,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  FileCode,
  Database,
  ArrowRight
} from 'lucide-react';
import { SwipeAttendLogo } from './SwipeAttendLogo';
import { downloadAppZip, downloadAppDataBackup } from '../../services/appDownloadService';
import { Student, AttendanceSession, Classroom } from '../../types/attendance';

interface DownloadAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  students?: Student[];
  sessions?: AttendanceSession[];
  classrooms?: Classroom[];
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const DownloadAppModal: React.FC<DownloadAppModalProps> = ({
  isOpen,
  onClose,
  students = [],
  sessions = [],
  classrooms = [],
}) => {
  const [downloadingZip, setDownloadingZip] = useState(false);
  const [downloadedZipSuccess, setDownloadedZipSuccess] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [installSuccess, setInstallSuccess] = useState(false);

  // Detect PWA install prompt & standalone mode
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsStandalone(true);
    }

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  // Escape key handler
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleDownloadZip = () => {
    setDownloadingZip(true);
    downloadAppZip();
    setTimeout(() => {
      setDownloadingZip(false);
      setDownloadedZipSuccess(true);
      setTimeout(() => setDownloadedZipSuccess(false), 4000);
    }, 1200);
  };

  const handleInstallPWA = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setInstallSuccess(true);
      }
      setDeferredPrompt(null);
    } else {
      // If browser doesn't support automatic prompt, guide user
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      if (isIOS) {
        alert("To install on iOS Safari:\n1. Tap the Share button at the bottom (box with arrow)\n2. Scroll down and tap 'Add to Home Screen'");
      } else {
        alert("To install on Chrome/Edge:\nClick the Install icon in your browser address bar (top right) or check the browser menu (⋮) -> 'Install SwipeAttend'");
      }
    }
  };

  const handleCopyBash = () => {
    navigator.clipboard.writeText('cd SwipeAttend-App && npm install && npm run dev');
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  const handleExportData = () => {
    downloadAppDataBackup({ students, sessions, classrooms });
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto p-4 sm:p-6 flex items-center justify-center animate-fade-in">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-2xl bg-[#090E1D] border border-cyan-500/40 rounded-3xl p-5 sm:p-7 shadow-2xl shadow-cyan-950/60 text-slate-100 space-y-6 z-10 overflow-hidden">
        {/* Glow corner accent */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-violet-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-start justify-between gap-4 relative">
          <div className="flex items-center gap-3">
            <SwipeAttendLogo size={42} />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
                  Download <span className="text-cyan-400">SwipeAttend</span>
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 font-mono text-[10px] font-bold">
                  v1.0.0
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Download the complete application files or install directly on your device
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Primary Download Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 relative">
          {/* Option 1: Download Complete Source ZIP */}
          <div className="futuristic-glass cyber-corner border border-cyan-500/30 hover:border-cyan-400/60 rounded-2xl p-4 sm:p-5 flex flex-col justify-between space-y-4 shadow-lg group">
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                <FolderArchive className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-sm sm:text-base text-white">
                Download App ZIP File
              </h3>
              <p className="text-xs text-slate-300">
                Complete project source code, components, Express backend, PWA assets, and configurations ready to run locally.
              </p>
              <div className="flex items-center gap-2 text-[11px] font-mono text-cyan-300 pt-1">
                <span>📦 ~2.78 MB</span>
                <span>•</span>
                <span>180+ Files</span>
                <span>•</span>
                <span>.ZIP</span>
              </div>
            </div>

            <button
              onClick={handleDownloadZip}
              disabled={downloadingZip}
              className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md ${
                downloadedZipSuccess
                  ? 'bg-emerald-600 text-white'
                  : 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-cyan-600/30'
              }`}
            >
              {downloadingZip ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Preparing ZIP...</span>
                </>
              ) : downloadedZipSuccess ? (
                <>
                  <Check className="w-4 h-4 text-white" />
                  <span>Downloaded App ZIP!</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Download App (.ZIP)</span>
                </>
              )}
            </button>
          </div>

          {/* Option 2: Install as Native App (PWA) */}
          <div className="futuristic-glass cyber-corner border border-violet-500/30 hover:border-violet-400/60 rounded-2xl p-4 sm:p-5 flex flex-col justify-between space-y-4 shadow-lg group">
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-violet-500/15 border border-violet-500/30 flex items-center justify-center text-violet-400">
                <Smartphone className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-sm sm:text-base text-white">
                Install on Phone or PC
              </h3>
              <p className="text-xs text-slate-300">
                Install as a standalone native app on Android, Windows, Mac, or iOS homescreen with full offline attendance support.
              </p>
              <div className="flex items-center gap-2 text-[11px] font-mono text-violet-300 pt-1">
                <span>⚡ Instant Launch</span>
                <span>•</span>
                <span>Offline Sync</span>
                <span>•</span>
                <span>PWA</span>
              </div>
            </div>

            <button
              onClick={handleInstallPWA}
              disabled={isStandalone}
              className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md ${
                isStandalone
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : installSuccess
                  ? 'bg-emerald-600 text-white'
                  : 'bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-violet-600/30'
              }`}
            >
              {isStandalone ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Already Installed as App</span>
                </>
              ) : installSuccess ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>App Installed!</span>
                </>
              ) : (
                <>
                  <Laptop className="w-4 h-4" />
                  <span>Install App to Device</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Quick Start Terminal Guide */}
        <div className="p-4 rounded-2xl bg-[#070A14] border border-white/10 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5 font-mono">
              <Terminal className="w-3.5 h-3.5 text-cyan-400" />
              <span>How to run the downloaded app locally</span>
            </span>
            <button
              onClick={handleCopyBash}
              className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer font-mono"
              title="Copy setup commands"
            >
              {copiedCode ? (
                <>
                  <Check className="w-3 h-3 text-emerald-400" />
                  <span className="text-emerald-400">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>Copy Command</span>
                </>
              )}
            </button>
          </div>

          <div className="bg-[#04060C] p-3 rounded-xl font-mono text-xs text-slate-300 border border-white/5 space-y-1 overflow-x-auto">
            <p className="text-slate-500"># 1. Extract ZIP, then open terminal and run:</p>
            <p className="text-cyan-300 font-semibold select-all">
              cd SwipeAttend-App && npm install && npm run dev
            </p>
            <p className="text-slate-500 pt-1"># 2. Open in browser: <span className="text-white">http://localhost:3000</span></p>
          </div>
        </div>

        {/* Database Backup Export Option */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-white/10 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <Database className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span>Need your current student records & sessions?</span>
          </div>
          <button
            onClick={handleExportData}
            className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-cyan-300 hover:text-white font-mono text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <Download className="w-3 h-3" />
            <span>Export Data Backup (.JSON)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
