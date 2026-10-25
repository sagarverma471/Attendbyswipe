import React, { useState, useMemo, useCallback } from 'react';
import { AttendanceSession, Student, AttendanceStatus } from '../../types/attendance';
import {
  Calendar,
  Search,
  Download,
  ArrowLeft,
  FileText,
  Clock,
  History,
  Edit2,
  QrCode,
  Smartphone,
  Filter,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Layers,
  Sparkles,
  Play,
  X,
} from 'lucide-react';
import { ResponsiveTableWrapper } from '../common/ResponsiveTableWrapper';
import { getStudentAttendanceStatus } from '../attendance/AttendanceSummaryView';

interface AttendanceHistoryViewProps {
  sessions: AttendanceSession[];
  students: Student[];
  onUpdateSession: (updatedSession: AttendanceSession) => void;
  onBack: () => void;
  onResumeDraft?: () => void;
  hasDraftSession?: boolean;
}

export type SessionFilterType = 'all' | 'qr' | 'swipe';

/**
 * Determine whether an AttendanceSession is a QR-based digital session or a traditional swipe session.
 */
export function isQRSession(sess: AttendanceSession): boolean {
  if (sess.sessionType === 'qr') return true;
  if (sess.sessionType === 'swipe') return false;
  if (sess.id.startsWith('session-qr') || sess.id.includes('qr-') || sess.id.includes('-qr')) {
    return true;
  }
  if (sess.notes && /qr(\s*code|\s*session|\s*attendance)?/i.test(sess.notes)) {
    return true;
  }
  if (sess.auditTrail && sess.auditTrail.some((a) => a.action?.includes('QR') || a.reason?.includes('QR'))) {
    return true;
  }
  return false;
}

export const AttendanceHistoryView: React.FC<AttendanceHistoryViewProps> = ({
  sessions,
  students,
  onUpdateSession,
  onBack,
  onResumeDraft,
  hasDraftSession,
}) => {
  const [selectedSession, setSelectedSession] = useState<AttendanceSession | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<SessionFilterType>('all');
  const [notification, setNotification] = useState<string | null>(null);

  const showNotification = useCallback((msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  }, []);


  // Counts for filter tabs
  const qrSessionsCount = useMemo(() => sessions.filter(isQRSession).length, [sessions]);
  const swipeSessionsCount = useMemo(() => sessions.filter((s) => !isQRSession(s)).length, [sessions]);

  // Filtered sessions based on active filter toggle & search query
  const filteredSessions = useMemo(() => {
    return sessions.filter((s) => {
      // 1. Filter toggle type
      const isQR = isQRSession(s);
      if (filterType === 'qr' && !isQR) return false;
      if (filterType === 'swipe' && isQR) return false;

      // 2. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchSubject = s.subjectName.toLowerCase().includes(q);
        const matchClass = s.classroomName.toLowerCase().includes(q);
        const matchDate = s.date.includes(q);
        const matchNotes = s.notes ? s.notes.toLowerCase().includes(q) : false;
        const matchTeacher = s.markedBy ? s.markedBy.toLowerCase().includes(q) : false;
        const matchMethodTag = (isQR ? 'digital qr' : 'swipe manual traditional').includes(q);
        return matchSubject || matchClass || matchDate || matchNotes || matchTeacher || matchMethodTag;
      }
      return true;
    });
  }, [sessions, filterType, searchQuery]);

  // Students belonging to the active session
  const activeSessionStudents = useMemo(() => {
    if (!selectedSession) return [];
    const matched = students.filter(
      (std) => std.classroomId === selectedSession.classroomId || selectedSession.records[std.id] !== undefined
    );
    const result = matched.length > 0 ? matched : students;
    // Sort numerically by roll number
    return [...result].sort((a, b) => {
      const numA = parseInt(a.rollNo.replace(/\D/g, ''), 10);
      const numB = parseInt(b.rollNo.replace(/\D/g, ''), 10);
      if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
      return a.rollNo.localeCompare(b.rollNo);
    });
  }, [selectedSession, students]);

  // Handle correcting attendance on historical record
  const handleCorrectStatus = (studentId: string, currentStatus: AttendanceStatus) => {
    if (!selectedSession) return;
    const newStatus: AttendanceStatus = currentStatus === 'present' ? 'absent' : 'present';
    const reason = 'Administrative verification / Attendance audit adjustment';

    const updatedRecords = { ...selectedSession.records, [studentId]: newStatus };
    const presentCount = Object.values(updatedRecords).filter((s) => s === 'present').length;
    const absentCount = Object.values(updatedRecords).filter((s) => s === 'absent').length;

    const studentName = students.find((s) => s.id === studentId)?.name || 'Student';

    const auditEntry = {
      id: `audit-${Date.now()}`,
      timestamp: new Date().toISOString(),
      action: 'Status Correction',
      studentId,
      studentName,
      previousStatus: currentStatus,
      newStatus,
      modifiedBy: selectedSession.markedBy || 'Teacher Admin',
      reason,
    };

    // Also update student metadata to reflect manual change if QR session
    const updatedMetadata = selectedSession.studentMetadata
      ? {
          ...selectedSession.studentMetadata,
          [studentId]: {
            method: 'Manual' as const,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            verificationStatus: newStatus === 'present' ? 'manual_present' : 'manual_absent',
          },
        }
      : undefined;

    const updated: AttendanceSession = {
      ...selectedSession,
      records: updatedRecords,
      studentMetadata: updatedMetadata,
      presentCount,
      absentCount,
      auditTrail: [auditEntry, ...(selectedSession.auditTrail || [])],
    };

    setSelectedSession(updated);
    onUpdateSession(updated);
    showNotification(`Updated status for ${studentName} to ${newStatus.toUpperCase()}`);
  };

  // Export CSV with QR-specific metadata (Submission Method & Timestamp)
  const handleExportHistoricalCSV = (sess: AttendanceSession) => {
    const isQR = isQRSession(sess);
    const headers = [
      'Roll No',
      'Student Name',
      'Attendance Status',
      'Submission Method',
      'Submission Timestamp',
      'Date',
      'Subject',
      'Classroom',
      'Session Type',
      'Marked By',
      'Verification Status',
    ];

    const targetStudents = activeSessionStudents.length > 0 ? activeSessionStudents : students;

    const rows = targetStudents.map((std) => {
      const status = sess.records[std.id] || 'unmarked';
      const meta = sess.studentMetadata?.[std.id];

      let submissionMethod = 'Manual';
      let submissionTimestamp = 'N/A';
      let verification = 'Standard';

      if (isQR) {
        if (meta?.method) {
          submissionMethod = meta.method;
        } else if (status === 'present') {
          submissionMethod = 'QR';
        } else {
          submissionMethod = 'Manual';
        }

        if (meta?.timestamp && meta.timestamp !== '-') {
          submissionTimestamp = meta.timestamp;
        } else if (status === 'present') {
          submissionTimestamp = sess.completedAt
            ? new Date(sess.completedAt).toLocaleTimeString()
            : 'Verified at session';
        } else {
          submissionTimestamp = 'N/A';
        }

        verification = meta?.verificationStatus || (status === 'present' ? 'verified' : 'unmatched');
      } else {
        submissionMethod = 'Manual';
        submissionTimestamp = status === 'present'
          ? (sess.completedAt ? new Date(sess.completedAt).toLocaleTimeString() : 'Verified (Swipe Deck)')
          : 'N/A';
        verification = 'Swipe Deck Verified';
      }

      return [
        `"${std.rollNo}"`,
        `"${std.name.replace(/"/g, '""')}"`,
        `"${status.toUpperCase()}"`,
        `"${submissionMethod}"`,
        `"${submissionTimestamp}"`,
        `"${sess.date}"`,
        `"${sess.subjectName.replace(/"/g, '""')}"`,
        `"${sess.classroomName.replace(/"/g, '""')}"`,
        `"${isQR ? 'Digital (QR)' : 'Traditional Swipe'}"`,
        `"${(sess.markedBy || 'Teacher').replace(/"/g, '""')}"`,
        `"${verification}"`,
      ];
    });

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `SwipeAttend_${isQR ? 'Digital_QR' : 'Traditional_Swipe'}_${sess.subjectName.replace(/\s+/g, '_')}_${sess.date}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showNotification(`CSV exported with QR metadata (${rows.length} student records)`);
  };

  // Bulk Export for all filtered sessions
  const handleBulkExportCSV = () => {
    if (filteredSessions.length === 0) return;
    const headers = [
      'Session ID',
      'Date',
      'Subject',
      'Classroom',
      'Session Type',
      'Roll No',
      'Student Name',
      'Attendance Status',
      'Submission Method',
      'Submission Timestamp',
      'Marked By',
    ];

    const allRows: string[][] = [];

    filteredSessions.forEach((sess) => {
      const isQR = isQRSession(sess);
      const sessionStds = students.filter(
        (std) => std.classroomId === sess.classroomId || sess.records[std.id] !== undefined
      );
      const list = sessionStds.length > 0 ? sessionStds : students;

      list.forEach((std) => {
        const status = sess.records[std.id] || 'unmarked';
        const meta = sess.studentMetadata?.[std.id];
        const method = isQR
          ? (meta?.method || (status === 'present' ? 'QR' : 'Manual'))
          : 'Manual';
        const timestamp = isQR
          ? (meta?.timestamp && meta.timestamp !== '-' ? meta.timestamp : status === 'present' ? 'Verified' : 'N/A')
          : (status === 'present' ? 'Verified' : 'N/A');

        allRows.push([
          `"${sess.id}"`,
          `"${sess.date}"`,
          `"${sess.subjectName.replace(/"/g, '""')}"`,
          `"${sess.classroomName.replace(/"/g, '""')}"`,
          `"${isQR ? 'Digital (QR)' : 'Traditional Swipe'}"`,
          `"${std.rollNo}"`,
          `"${std.name.replace(/"/g, '""')}"`,
          `"${status.toUpperCase()}"`,
          `"${method}"`,
          `"${timestamp}"`,
          `"${(sess.markedBy || 'Teacher').replace(/"/g, '""')}"`,
        ]);
      });
    });

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...allRows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `SwipeAttend_Batch_Attendance_History_${new Date().toISOString().split('T')[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showNotification(`Exported batch CSV with ${allRows.length} total records`);
  };

  return (
    <div className="max-w-6xl mx-auto py-4 sm:py-6 lg:py-8 px-3 sm:px-6 lg:px-8 space-y-4 sm:space-y-6 animate-fade-in overflow-x-hidden w-full min-w-0 max-w-full">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed bottom-5 right-5 z-50 bg-[#141A2E] border border-cyan-500/40 text-cyan-200 px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2.5 text-xs animate-slide-up">
          <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-xl bg-[#141A2E] text-slate-300 hover:text-white transition-colors cursor-pointer min-h-[40px] min-w-[40px] flex items-center justify-center border border-white/5"
            aria-label="Back to dashboard"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white font-['Plus_Jakarta_Sans'] flex items-center gap-2.5">
              <span>Attendance History & Audit</span>
            </h1>
            <p className="text-xs text-slate-400">
              Immutable session records with Digital QR tracking, swipe archives, and auditable correction trails
            </p>
          </div>
        </div>

        {/* Global Bulk Export and Resume Draft Actions in Header */}
        {!selectedSession && (
          <div className="flex items-center gap-2 w-fit self-end sm:self-auto flex-wrap">
            {hasDraftSession && onResumeDraft && (
              <button
                onClick={onResumeDraft}
                className="h-8 px-3 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 text-slate-950 text-xs font-black border border-amber-300/90 shadow-sm flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all"
                title="Resume unfinished attendance session"
              >
                <Play className="w-3 h-3 fill-slate-950" />
                <span>Resume Draft</span>
              </button>
            )}
            {filteredSessions.length > 0 && (
              <button
                onClick={handleBulkExportCSV}
                className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[#121826] hover:bg-slate-800 text-white border border-slate-700/80 text-xs font-semibold transition-all cursor-pointer shadow-sm active:scale-95 min-h-[32px]"
                title="Export all filtered sessions into a combined CSV"
              >
                <Download className="w-3.5 h-3.5 text-violet-400" />
                <span>Export CSV</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* In-Progress Draft Banner Card (Ultra HD, shown in history section only) */}
      {hasDraftSession && onResumeDraft && !selectedSession && (
        <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-[#141B2D] via-[#101626] to-[#141B2D] border border-amber-500/40 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fade-in">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <Play className="w-4 h-4 fill-amber-400 ml-0.5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-bold text-white tracking-tight">Active Attendance Draft</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  In-Progress
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5 truncate">
                An unfinished lecture session was saved on this device. Click to resume swiping without losing marked attendance.
              </p>
            </div>
          </div>
          <button
            onClick={onResumeDraft}
            className="h-8 px-3.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 active:scale-95 text-slate-950 text-xs font-black shadow-md shadow-amber-500/20 border border-amber-300/80 transition-all cursor-pointer flex items-center justify-center gap-1.5 shrink-0 whitespace-nowrap"
            title="Resume draft session"
          >
            <Play className="w-3 h-3 fill-slate-950" />
            <span>Resume Draft Session</span>
          </button>
        </div>
      )}

      {/* Main content: Either Detail View or Session List */}
      {selectedSession ? (
        <div className="bg-[#101526] border border-white/8 rounded-3xl p-4 sm:p-6 space-y-6">
          {/* Detail View Header */}
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-white/8">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSelectedSession(null)}
                className="p-2 rounded-xl bg-[#141A2E] text-slate-300 hover:text-white transition-colors cursor-pointer border border-white/5"
                title="Back to list"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg font-bold text-white font-['Plus_Jakarta_Sans']">
                    {selectedSession.subjectName}
                  </h2>
                  {/* Digital Tag vs Traditional Swipe Tag */}
                  {isQRSession(selectedSession) ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 shadow-xs">
                      <QrCode className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Digital</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-violet-500/15 text-violet-300 border border-violet-500/30 shadow-xs">
                      <Smartphone className="w-3.5 h-3.5 text-violet-400" />
                      <span>Traditional Swipe</span>
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  {selectedSession.classroomName} • Period {selectedSession.period || 2} • Marked by{' '}
                  <span className="text-slate-300">{selectedSession.markedBy || 'Teacher'}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <span className="font-mono text-xs px-3 py-1.5 rounded-xl bg-[#141A2E] border border-white/8 text-slate-300 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>{selectedSession.date}</span>
              </span>
              <button
                onClick={() => handleExportHistoricalCSV(selectedSession)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-600/20 text-violet-300 border border-violet-500/30 text-xs font-semibold hover:bg-violet-600/30 transition-all cursor-pointer"
                title="Export this session with QR submission methods & timestamps"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export to CSV</span>
              </button>
            </div>
          </div>

          {/* Banner Explaining QR Digital Session Metadata */}
          {isQRSession(selectedSession) && (
            <div className="bg-gradient-to-r from-cyan-950/40 via-blue-950/30 to-[#141A2E] border border-cyan-500/30 rounded-2xl p-3.5 sm:p-4 flex items-start gap-3 text-xs text-slate-300 shadow-sm">
              <div className="p-2 rounded-xl bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 shrink-0">
                <QrCode className="w-4 h-4" />
              </div>
              <div className="space-y-1">
                <p className="font-semibold text-cyan-200">
                  Digital QR Session — Mobile Verification Enabled
                </p>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Students scanned the rotating QR code using smartphones. The table below preserves individual
                  submission methods (<span className="text-cyan-300 font-mono">QR</span> vs{' '}
                  <span className="text-slate-300 font-mono">Manual</span>) and precise scan timestamps. CSV export includes all metadata.
                </p>
              </div>
            </div>
          )}

          {/* Stats Bar */}
          <div className="grid grid-cols-3 gap-3 bg-[#141A2E] p-4 rounded-2xl border border-white/5">
            <div className="text-center">
              <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Total Enrolled</p>
              <p className="text-xl font-bold text-white font-mono mt-0.5">
                {selectedSession.totalStudents || Object.keys(selectedSession.records).length}
              </p>
            </div>
            <div className="text-center border-l border-white/10">
              <p className="text-xs text-emerald-400 font-semibold uppercase tracking-wider">Present</p>
              <p className="text-xl font-bold text-emerald-400 font-mono mt-0.5">
                {selectedSession.presentCount}
              </p>
            </div>
            <div className="text-center border-l border-white/10">
              <p className="text-xs text-red-400 font-semibold uppercase tracking-wider">Absent</p>
              <p className="text-xl font-bold text-red-400 font-mono mt-0.5">
                {selectedSession.absentCount}
              </p>
            </div>
          </div>

          {/* Audit Trail Section if any modifications were made */}
          {selectedSession.auditTrail && selectedSession.auditTrail.length > 0 && (
            <div className="bg-[#141A2E]/60 border border-violet-500/20 rounded-2xl p-4">
              <h3 className="text-xs font-bold text-violet-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <History className="w-3.5 h-3.5" />
                <span>Session Correction Audit Log</span>
              </h3>
              <div className="space-y-1.5 text-xs text-slate-300 max-h-40 overflow-y-auto pr-1">
                {selectedSession.auditTrail.map((log) => (
                  <div key={log.id} className="flex justify-between py-1 border-b border-white/5 text-[11px]">
                    <span>
                      {log.studentName || 'Student'}: Changed to{' '}
                      <strong className="uppercase text-violet-300">{log.newStatus || log.action}</strong>{' '}
                      {log.reason && <span className="text-slate-400">({log.reason})</span>}
                    </span>
                    <span className="font-mono text-slate-500 shrink-0 ml-2">
                      {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Student Roster in this session */}
          <div>
            <div className="flex items-center justify-between gap-3 mb-3">
              <h3 className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
                <span>Student Attendance Records</span>
                <span className="text-slate-400 text-xs font-normal font-mono">
                  ({activeSessionStudents.length} students)
                </span>
              </h3>
              <span className="text-[11px] text-slate-400 hidden sm:inline">
                Tap status button to correct or re-verify
              </span>
            </div>

            {/* RESPONSIVE ROSTER: Touch cards on mobile, Structured Table on desktop */}
            <ResponsiveTableWrapper
              mobileCards={
                <div className="space-y-2">
                  {activeSessionStudents.map((std) => {
                    const status = getStudentAttendanceStatus(selectedSession.records, std);
                    const isQR = isQRSession(selectedSession);
                    const meta = selectedSession.studentMetadata?.[std.id];
                    const method = isQR
                      ? (meta?.method || (status === 'present' ? 'QR' : 'Manual'))
                      : 'Manual';
                    const timestamp = isQR
                      ? (meta?.timestamp && meta.timestamp !== '-' ? meta.timestamp : status === 'present' ? 'Verified' : '-')
                      : (status === 'present' ? 'Swipe Deck' : '-');

                    return (
                      <div
                        key={std.id}
                        className="bg-[#141A2E]/70 border border-white/8 rounded-xl p-3 flex flex-col gap-2 shadow-sm"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-white truncate">{std.name}</p>
                            <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono mt-0.5">
                              <span className="text-violet-300 font-bold">Roll {std.rollNo}</span>
                              <span>•</span>
                              <span>{timestamp}</span>
                            </div>
                          </div>

                          <button
                            onClick={() => handleCorrectStatus(std.id, status)}
                            className={`px-2.5 py-1 rounded-xl font-bold text-xs cursor-pointer min-h-[32px] flex items-center gap-1.5 active:scale-95 transition-transform ${
                              status === 'present'
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : 'bg-red-500/20 text-red-400 border border-red-500/30'
                            }`}
                            title="Tap to change status"
                          >
                            <span>{status === 'present' ? 'Present' : 'Absent'}</span>
                            <Edit2 className="w-3 h-3 text-slate-400" />
                          </button>
                        </div>

                        {/* Submission method tag on mobile */}
                        <div className="flex items-center justify-between text-[10px] pt-1.5 border-t border-white/5">
                          <span className="text-slate-400">Method:</span>
                          {method === 'QR' ? (
                            <span className="inline-flex items-center gap-1 font-mono font-semibold text-cyan-300 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                              <QrCode className="w-2.5 h-2.5" />
                              <span>QR Scan</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 font-mono text-slate-400 bg-white/5 px-2 py-0.5 rounded border border-white/10">
                              <span>Manual Entry</span>
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              }
              desktopTable={
                <div className="overflow-x-auto rounded-xl border border-white/8">
                  <table className="w-full text-left text-xs text-slate-300 min-w-[650px]">
                    <thead className="bg-[#141A2E] text-slate-400 font-semibold border-b border-white/8">
                      <tr>
                        <th className="py-2.5 px-3 font-mono">Roll No.</th>
                        <th className="py-2.5 px-3">Student Name</th>
                        <th className="py-2.5 px-3">Submission Method</th>
                        <th className="py-2.5 px-3">Scan / Recorded Timestamp</th>
                        <th className="py-2.5 px-3 text-center">Recorded Status</th>
                        <th className="py-2.5 px-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {activeSessionStudents.map((std) => {
                        const status = getStudentAttendanceStatus(selectedSession.records, std);
                        const isQR = isQRSession(selectedSession);
                        const meta = selectedSession.studentMetadata?.[std.id];
                        const method = isQR
                          ? (meta?.method || (status === 'present' ? 'QR' : 'Manual'))
                          : 'Manual';
                        const timestamp = isQR
                          ? (meta?.timestamp && meta.timestamp !== '-' ? meta.timestamp : status === 'present' ? 'Verified' : '—')
                          : (status === 'present' ? 'Swipe Deck' : '—');

                        return (
                          <tr key={std.id} className="hover:bg-white/5 transition-colors">
                            <td className="py-2.5 px-3 font-mono text-violet-300 font-semibold">
                              {std.rollNo}
                            </td>
                            <td className="py-2.5 px-3 font-semibold text-white">
                              {std.name}
                            </td>
                            <td className="py-2.5 px-3">
                              {method === 'QR' ? (
                                <span className="inline-flex items-center gap-1 font-mono text-[11px] font-semibold text-cyan-300 bg-cyan-500/15 px-2 py-0.5 rounded-md border border-cyan-500/30">
                                  <QrCode className="w-3 h-3 text-cyan-400" />
                                  <span>QR Mobile</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 font-mono text-[11px] text-slate-400 bg-white/5 px-2 py-0.5 rounded-md border border-white/10">
                                  <span>Manual</span>
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 font-mono text-slate-400 text-[11px]">
                              {timestamp}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <span
                                className={`px-2.5 py-0.5 rounded-full font-bold text-[11px] inline-flex items-center gap-1 ${
                                  status === 'present'
                                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                    : 'bg-red-500/20 text-red-400 border border-red-500/30'
                                }`}
                              >
                                {status === 'present' ? (
                                  <>
                                    <CheckCircle2 className="w-3 h-3" />
                                    <span>Present</span>
                                  </>
                                ) : (
                                  <>
                                    <XCircle className="w-3 h-3" />
                                    <span>Absent</span>
                                  </>
                                )}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              <button
                                onClick={() => handleCorrectStatus(std.id, status)}
                                className="text-xs text-violet-400 hover:text-violet-300 underline inline-flex items-center gap-1 cursor-pointer"
                              >
                                <Edit2 className="w-3 h-3" />
                                <span>Correct</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              }
            />
          </div>
        </div>
      ) : (
        /* Sessions List with Digital Tag & Filter Toggle */
        <div className="space-y-4">
          {/* Controls Bar: Filter Toggle & Search */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            {/* Filter Toggle to Separate QR Sessions from Traditional Swipe Sessions */}
            <div className="flex items-center bg-[#0C1226] p-1.5 rounded-2xl border border-slate-700/80 shadow-md self-start w-full sm:w-auto gap-1 overflow-x-auto max-w-full">
              {/* All Sessions Tab */}
              <button
                onClick={() => setFilterType('all')}
                className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                  filterType === 'all'
                    ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md border border-violet-400/50'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                }`}
              >
                <Layers className="w-3.5 h-3.5 shrink-0" />
                <span>All<span className="hidden xs:inline"> Sessions</span></span>
                <span
                  className={`px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                    filterType === 'all' ? 'bg-violet-900/90 text-white border border-violet-400/40' : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  {sessions.length}
                </span>
              </button>

              {/* Digital (QR) Tab */}
              <button
                onClick={() => setFilterType('qr')}
                className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                  filterType === 'qr'
                    ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md border border-cyan-400/50'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                }`}
              >
                <QrCode className="w-3.5 h-3.5 shrink-0" />
                <span>Digital<span className="hidden xs:inline"> (QR)</span></span>
                <span
                  className={`px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                    filterType === 'qr' ? 'bg-cyan-900/90 text-white border border-cyan-400/40' : 'bg-slate-800 text-cyan-300'
                  }`}
                >
                  {qrSessionsCount}
                </span>
              </button>

              {/* Traditional Swipe Tab */}
              <button
                onClick={() => setFilterType('swipe')}
                className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                  filterType === 'swipe'
                    ? 'bg-slate-700 text-white shadow-md border border-slate-500'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5 shrink-0" />
                <span><span className="hidden xs:inline">Traditional </span>Swipe</span>
                <span
                  className={`px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                    filterType === 'swipe' ? 'bg-slate-900 text-white' : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  {swipeSessionsCount}
                </span>
              </button>
            </div>

            {/* Search Input */}
            <div className="relative flex-1 md:max-w-xs">
              <Search className="w-4 h-4 text-cyan-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search subject, classroom, date..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#0C1226] border border-slate-700 focus:border-cyan-400 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-cyan-500/40 transition-colors shadow-sm font-medium"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-2.5 text-xs text-cyan-400 hover:text-white font-semibold cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Session Cards Grid */}
          {filteredSessions.length > 0 ? (
            <div className="grid grid-cols-1 gap-3">
              {filteredSessions.map((sess) => {
                const isQR = isQRSession(sess);
                return (
                  <div
                    key={sess.id}
                    onClick={() => setSelectedSession(sess)}
                    className="bg-[#101526] border border-white/8 hover:border-violet-500/40 rounded-2xl p-3.5 sm:p-4.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 transition-all cursor-pointer shadow-md group relative overflow-hidden"
                  >
                    {/* Visual accent bar on left for Digital sessions */}
                    {isQR && (
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-cyan-400 to-blue-500" />
                    )}

                    <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                      <div
                        className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border ${
                          isQR
                            ? 'bg-cyan-500/15 border-cyan-500/30 text-cyan-300'
                            : 'bg-violet-500/15 border-violet-500/25 text-violet-400'
                        }`}
                      >
                        {isQR ? <QrCode className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                      </div>

                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm font-bold text-white group-hover:text-violet-300 transition-colors truncate">
                            {sess.subjectName}
                          </h3>

                          {/* Digital Tag highlight */}
                          {isQR ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-300 border border-cyan-500/35 shadow-xs">
                              <QrCode className="w-3 h-3 text-cyan-400" />
                              <span>Digital</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-violet-500/15 text-violet-300 border border-violet-500/25">
                              <Smartphone className="w-3 h-3 text-violet-400" />
                              <span>Traditional Swipe</span>
                            </span>
                          )}

                          {/* Sync Status Badge */}
                          {sess.syncStatus === 'synced' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-mono">
                              <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
                              <span>Synced</span>
                            </span>
                          ) : (
                            <span
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30 font-mono"
                              title="Saved locally in device database. Waiting to synchronize with cloud."
                            >
                              <span>Saved Locally</span>
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-slate-400 truncate flex items-center gap-2">
                          <span>{sess.classroomName}</span>
                          <span className="text-slate-600">•</span>
                          <span>Period {sess.period || 2}</span>
                          {sess.notes && (
                            <>
                              <span className="text-slate-600 hidden md:inline">•</span>
                              <span className="text-slate-500 truncate hidden md:inline max-w-[200px]">
                                {sess.notes}
                              </span>
                            </>
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2 font-mono text-xs w-full sm:w-auto pt-2.5 sm:pt-0 border-t sm:border-t-0 border-white/5">
                      <div className="flex items-center gap-1.5 sm:gap-2.5 flex-wrap">
                        <span className="text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/20 text-[11px] sm:text-xs">
                          {sess.presentCount} Present
                        </span>
                        <span className="text-red-400 font-bold bg-red-500/10 px-2 py-0.5 rounded-lg border border-red-500/20 text-[11px] sm:text-xs">
                          {sess.absentCount} Absent
                        </span>
                      </div>

                      <span className="text-slate-400 bg-[#141A2E] px-2.5 py-1 rounded-lg border border-white/5 shrink-0 flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-500" />
                        <span>{sess.date}</span>
                      </span>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleExportHistoricalCSV(sess);
                        }}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-300 hover:text-white transition-all text-xs font-semibold cursor-pointer shrink-0 shadow-sm"
                        title="Download CSV report for this session"
                      >
                        <Download className="w-3.5 h-3.5 text-cyan-400" />
                        <span className="hidden md:inline">Export CSV</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Empty State */
            <div className="text-center py-12 px-4 bg-[#101526] border border-white/8 rounded-3xl space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 mx-auto">
                <Filter className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-white">No attendance sessions found</p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                {filterType !== 'all'
                  ? `No ${filterType === 'qr' ? 'Digital QR' : 'Traditional Swipe'} sessions match your current filter.`
                  : 'No historical sessions match your search criteria.'}
              </p>
              <div className="pt-2 flex items-center justify-center gap-2">
                {filterType !== 'all' && (
                  <button
                    onClick={() => setFilterType('all')}
                    className="px-3 py-1.5 rounded-xl bg-violet-600/20 text-violet-300 border border-violet-500/30 text-xs font-semibold hover:bg-violet-600/30 cursor-pointer"
                  >
                    View All Sessions
                  </button>
                )}
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="px-3 py-1.5 rounded-xl bg-white/10 text-slate-300 text-xs font-semibold hover:bg-white/20 cursor-pointer"
                  >
                    Clear Search
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
