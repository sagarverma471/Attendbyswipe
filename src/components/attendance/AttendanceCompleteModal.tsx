import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import confetti from 'canvas-confetti';
import { AttendanceSession, Student } from '../../types/attendance';
import {
  Check,
  ArrowRight,
  FileText,
  Calendar,
  FileSpreadsheet,
  ExternalLink,
  Loader2,
  CheckCircle2,
  Copy,
  AlertCircle,
  X,
} from 'lucide-react';
import { formatClassDate } from '../../utils/dateUtils';
import { exportSessionToGoogleSheet } from '../../services/workspace/googleSheetsService';
import { getCachedAccessToken, signInWithGoogle } from '../../services/firebase';
import { getStoredStudents } from '../../services/storage';

interface AttendanceCompleteModalProps {
  session: AttendanceSession;
  students?: Student[];
  onViewSummary: () => void;
  onSaveAndFinish: () => void;
}

export const AttendanceCompleteModal: React.FC<AttendanceCompleteModalProps> = ({
  session,
  students: propStudents,
  onViewSummary,
  onSaveAndFinish,
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [sheetResult, setSheetResult] = useState<{ url: string; title: string; id: string } | null>(null);
  const [showConfirmExport, setShowConfirmExport] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const total = session.totalStudents || Object.keys(session.records).length || 58;
  const present = session.presentCount || Object.values(session.records).filter((s) => s === 'present').length;
  const absent = session.absentCount || Object.values(session.records).filter((s) => s === 'absent').length;
  const percentage = total > 0 ? ((present / total) * 100).toFixed(1) : '0.0';

  useEffect(() => {
    confetti({
      particleCount: 70,
      spread: 60,
      origin: { y: 0.6 },
      colors: ['#10B981', '#8B5CF6', '#3B82F6', '#F59E0B'],
    });
  }, []);

  const handleStartExportFlow = () => {
    setErrorMessage(null);
    setShowConfirmExport(true);
  };

  const handleConfirmExport = async () => {
    setShowConfirmExport(false);
    setIsExporting(true);
    setErrorMessage(null);

    try {
      let token = getCachedAccessToken();
      if (!token) {
        const authRes = await signInWithGoogle();
        token = authRes.accessToken || null;
      }

      if (!token) {
        throw new Error('Google Sign-In required to export directly into Google Sheets');
      }

      const effectiveStudents =
        propStudents && propStudents.length > 0 ? propStudents : getStoredStudents();

      const result = await exportSessionToGoogleSheet(session, effectiveStudents, token);

      if (result.success && result.url && result.id) {
        setSheetResult({
          url: result.url,
          title: result.title || `SwipeAttend - ${session.subjectName} - ${session.date}`,
          id: result.id,
        });
      } else {
        throw new Error(result.error || 'Failed to export session to Google Sheets');
      }
    } catch (err: any) {
      console.error('Google Sheets export failed:', err);
      setErrorMessage(err.message || 'An error occurred while creating the Google Sheet.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopyLink = () => {
    if (sheetResult?.url) {
      navigator.clipboard.writeText(sheetResult.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-md bg-[#0F1424] border border-white/10 rounded-2xl sm:rounded-3xl p-5 sm:p-7 text-center shadow-2xl shadow-emerald-950/40 overflow-hidden my-auto max-h-[94vh] flex flex-col justify-between">
        {/* Glow backdrop */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Big Animated Success Checkmark Ring */}
        <div className="relative mx-auto w-14 h-14 sm:w-18 sm:h-18 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center text-emerald-400 shadow-xl shadow-emerald-500/30 mb-3 sm:mb-4 animate-bounce-short shrink-0">
          <Check className="w-7 h-7 sm:w-9 sm:h-9 stroke-[3]" />
        </div>

        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-white font-['Plus_Jakarta_Sans'] tracking-tight">
            Attendance Complete!
          </h2>
          <p className="mt-1 text-xs sm:text-sm font-semibold text-slate-300 truncate">
            {session.subjectName}
          </p>
          <p className="text-[11px] sm:text-xs text-slate-400 truncate">
            {session.classroomName}
          </p>
          <div className="mt-2 flex items-center justify-center gap-1.5">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-violet-500/15 border border-violet-500/25 text-violet-300 text-[11px] font-mono">
              <Calendar className="w-3 h-3 text-violet-400" />
              <span>{formatClassDate(session.date, true)}</span>
            </span>
          </div>
        </div>

        {/* 4-Metric Grid */}
        <div className="grid grid-cols-4 gap-1.5 sm:gap-2 my-3 sm:my-4 bg-[#141A2E] border border-white/8 rounded-xl sm:rounded-2xl p-2.5 sm:p-3.5 shrink-0">
          <div className="flex flex-col items-center">
            <span className="text-base sm:text-xl font-extrabold text-white font-mono">
              {total}
            </span>
            <span className="text-[9px] sm:text-[10px] uppercase font-bold text-slate-400 mt-0.5">
              Total
            </span>
          </div>

          <div className="flex flex-col items-center border-l border-white/10">
            <span className="text-base sm:text-xl font-extrabold text-emerald-400 font-mono">
              {present}
            </span>
            <span className="text-[9px] sm:text-[10px] uppercase font-bold text-slate-400 mt-0.5">
              Present
            </span>
          </div>

          <div className="flex flex-col items-center border-l border-white/10">
            <span className="text-base sm:text-xl font-extrabold text-red-400 font-mono">
              {absent}
            </span>
            <span className="text-[9px] sm:text-[10px] uppercase font-bold text-slate-400 mt-0.5">
              Absent
            </span>
          </div>

          <div className="flex flex-col items-center border-l border-white/10">
            <span className="text-base sm:text-xl font-extrabold text-violet-400 font-mono">
              {percentage}%
            </span>
            <span className="text-[9px] sm:text-[10px] uppercase font-bold text-slate-400 mt-0.5">
              Rate
            </span>
          </div>
        </div>

        {/* Google Sheets Export Result Banner */}
        {sheetResult && (
          <div className="mb-3.5 p-3 rounded-2xl bg-emerald-950/50 border border-emerald-500/40 text-left animate-fade-in shadow-lg shrink-0">
            <div className="flex items-center gap-2 text-emerald-300 font-semibold text-xs mb-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="truncate">Exported to Google Sheet!</span>
            </div>
            <p className="text-[11px] text-emerald-200/80 truncate mb-2.5">
              {sheetResult.title}
            </p>
            <div className="flex items-center gap-2">
              <a
                href={sheetResult.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-md transition-colors cursor-pointer"
              >
                <span>Open in Google Sheets</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <button
                type="button"
                onClick={handleCopyLink}
                className="flex items-center justify-center gap-1 py-1.5 px-2.5 rounded-xl bg-emerald-900/60 hover:bg-emerald-800/80 border border-emerald-500/30 text-emerald-300 text-xs font-medium transition-colors cursor-pointer"
                title="Copy Sheet URL"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>{copied ? 'Copied!' : 'Copy'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Error message */}
        {errorMessage && (
          <div className="mb-3 p-2.5 rounded-xl bg-red-950/40 border border-red-500/30 text-red-300 text-xs text-left flex items-start gap-2 shrink-0">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="font-semibold">Export Failed</p>
              <p className="text-[11px] text-red-200/80">{errorMessage}</p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-2 sm:space-y-2.5 shrink-0">
          {/* Direct Google Sheets Export Button */}
          {!sheetResult && (
            <button
              onClick={handleStartExportFlow}
              disabled={isExporting}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 hover:text-white font-semibold text-xs sm:text-sm transition-all cursor-pointer min-h-[44px] shadow-sm disabled:opacity-50"
              title="Export this completed attendance session directly to Google Sheets"
            >
              {isExporting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                  <span>Exporting to Google Sheets...</span>
                </>
              ) : (
                <>
                  <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                  <span>Export to Google Sheet</span>
                </>
              )}
            </button>
          )}

          <button
            onClick={onViewSummary}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#1A223B] border border-white/10 text-white font-semibold text-xs sm:text-sm hover:bg-[#212B4A] transition-colors cursor-pointer min-h-[44px]"
          >
            <FileText className="w-4 h-4 text-violet-400" />
            <span>View Summary & Edit</span>
          </button>

          <button
            onClick={onSaveAndFinish}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-violet-600/30 transition-all cursor-pointer min-h-[44px]"
          >
            <span>Save & Finish</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Explicit User Confirmation Dialog for Workspace Export (Mandatory for Workspace guidelines) */}
      {showConfirmExport && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#101526] border border-emerald-500/30 rounded-2xl p-5 sm:p-6 max-w-sm w-full text-left space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                <FileSpreadsheet className="w-5 h-5" />
                <span>Export to Google Sheets</span>
              </div>
              <button
                onClick={() => setShowConfirmExport(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/5 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              This will create a new, formatted spreadsheet in your Google Drive titled:
              <br />
              <span className="font-mono text-emerald-300 font-semibold mt-1 block">
                SwipeAttend - {session.subjectName} - {session.date}
              </span>
              <br />
              It will contain student roll numbers, attendance statuses, submission methods, and attendance summary rates.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmExport(false)}
                className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-slate-300 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmExport}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition-all shadow-md cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Confirm & Create Sheet</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
};
