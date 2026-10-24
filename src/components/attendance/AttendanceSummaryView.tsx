import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  Student,
  AttendanceSession,
  AttendanceStatus,
} from '../../types/attendance';
import {
  Calendar,
  Search,
  Download,
  Printer,
  Check,
  X,
  AlertTriangle,
  ArrowLeft,
  Save,
  Users,
  Sparkles,
  CheckCheck,
  FileSpreadsheet,
  ExternalLink,
  Loader2,
  CheckCircle2,
  Copy,
  AlertCircle,
} from 'lucide-react';
import { StudentAttendanceSummaryRow } from '../cards/StudentCard';
import { ResponsiveTableWrapper } from '../common/ResponsiveTableWrapper';
import { formatClassDate } from '../../utils/dateUtils';
import { getDraftSession } from '../../services/storage';

export function getStudentAttendanceStatus(
  records: Record<string, AttendanceStatus> | undefined,
  std: Student
): AttendanceStatus {
  if (!records) return 'unmarked';

  // 1. Direct ID match
  if (records[std.id] && records[std.id] !== 'unmarked') return records[std.id];

  // 2. Exact roll number match
  if (records[std.rollNo] && records[std.rollNo] !== 'unmarked') return records[std.rollNo];

  // 3. Numeric roll match (e.g. "01" vs "1" or "std-26cy-1001" vs "1001")
  const numRoll = std.rollNo.replace(/\D/g, '');
  if (numRoll && records[numRoll] && records[numRoll] !== 'unmarked') return records[numRoll];
  const padded = numRoll ? numRoll.padStart(2, '0') : '';
  if (padded && records[padded] && records[padded] !== 'unmarked') return records[padded];

  // 4. Student registration ID match
  if (std.studentId && records[std.studentId] && records[std.studentId] !== 'unmarked') return records[std.studentId];

  // 5. Deep case-insensitive match across all keys in records
  for (const [key, val] of Object.entries(records)) {
    if (val && val !== 'unmarked') {
      const lowerKey = key.toLowerCase().trim();
      if (
        lowerKey === std.id.toLowerCase().trim() ||
        lowerKey === std.rollNo.toLowerCase().trim() ||
        (std.studentId && lowerKey === std.studentId.toLowerCase().trim()) ||
        lowerKey === std.name.toLowerCase().trim()
      ) {
        return val;
      }
    }
  }

  // 6. Explicit unmarked record if present
  if (records[std.id]) return records[std.id];
  return 'unmarked';
}

interface AttendanceSummaryViewProps {
  session: AttendanceSession;
  students: Student[];
  onConfirmSave: (finalSession: AttendanceSession) => void;
  onBackToSwipe: () => void;
}

export const AttendanceSummaryView: React.FC<AttendanceSummaryViewProps> = ({
  session,
  students,
  onConfirmSave,
  onBackToSwipe,
}) => {
  const [records, setRecords] = useState<Record<string, AttendanceStatus>>(() => {
    // 1. Session passed with marked records takes priority
    if (session?.records && Object.keys(session.records).length > 0) {
      const hasMarked = Object.values(session.records).some((s) => s === 'present' || s === 'absent');
      if (hasMarked) return session.records;
    }
    // 2. Draft session fallback
    const draft = getDraftSession();
    if (draft?.session?.records && Object.keys(draft.session.records).length > 0) {
      const hasDraftMarked = Object.values(draft.session.records).some((s) => s === 'present' || s === 'absent');
      if (hasDraftMarked) return draft.session.records;
    }
    return session?.records || {};
  });
  const [filter, setFilter] = useState<'all' | 'present' | 'absent' | 'unmarked'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Sync state whenever session or draft updates
  useEffect(() => {
    if (session?.records && Object.keys(session.records).length > 0) {
      const hasMarked = Object.values(session.records).some((s) => s === 'present' || s === 'absent');
      if (hasMarked) {
        setRecords(session.records);
        return;
      }
    }
    const draft = getDraftSession();
    if (draft?.session?.records && Object.keys(draft.session.records).length > 0) {
      const hasDraftMarked = Object.values(draft.session.records).some((s) => s === 'present' || s === 'absent');
      if (hasDraftMarked) {
        setRecords(draft.session.records);
        return;
      }
    }
    if (session?.records) {
      setRecords(session.records);
    }
  }, [session]);

  // Robust student status map matching by id, rollNo, or studentId
  const studentStatuses = useMemo(() => {
    const map: Record<string, AttendanceStatus> = {};
    students.forEach((std) => {
      map[std.id] = getStudentAttendanceStatus(records, std);
    });
    return map;
  }, [records, students]);

  const total = students.length;
  const presentCount = useMemo(
    () => students.filter((s) => studentStatuses[s.id] === 'present').length,
    [students, studentStatuses]
  );
  const absentCount = useMemo(
    () => students.filter((s) => studentStatuses[s.id] === 'absent').length,
    [students, studentStatuses]
  );
  const unmarkedCount = Math.max(0, total - (presentCount + absentCount));
  const attendancePercentage = total > 0 ? ((presentCount / total) * 100).toFixed(1) : '0.0';

  // Toggle student status
  const handleToggleStatus = useCallback((studentId: string, currentStatus: AttendanceStatus) => {
    let nextStatus: AttendanceStatus = 'present';
    if (currentStatus === 'present') nextStatus = 'absent';
    else if (currentStatus === 'absent') nextStatus = 'present';

    setRecords((prev) => ({
      ...prev,
      [studentId]: nextStatus,
    }));
  }, []);

  // Quick Action: Mark all remaining unmarked students as present or absent
  const handleMarkAllUnmarked = useCallback((statusToSet: 'present' | 'absent') => {
    setRecords((prev) => {
      const updated = { ...prev };
      students.forEach((std) => {
        const cur = studentStatuses[std.id];
        if (!cur || cur === 'unmarked') {
          updated[std.id] = statusToSet;
        }
      });
      return updated;
    });
  }, [students, studentStatuses]);

  // CSV Export
  const handleExportCSV = () => {
    const isQR =
      session.sessionType === 'qr' ||
      session.id.startsWith('session-qr') ||
      (session.notes && /qr/i.test(session.notes));

    const headers = [
      'Roll No',
      'Student ID',
      'Student Name',
      'Status',
      'Submission Method',
      'Submission Timestamp',
      'Session Date',
      'Subject',
      'Classroom',
      'Session Type',
    ];

    const rows = students.map((std) => {
      const status = records[std.id] || 'unmarked';
      const meta = session.studentMetadata?.[std.id];
      const method = isQR
        ? (meta?.method || (status === 'present' ? 'QR' : 'Manual'))
        : 'Manual';
      const timestamp = isQR
        ? (meta?.timestamp && meta.timestamp !== '-' ? meta.timestamp : status === 'present' ? 'Verified' : 'N/A')
        : (status === 'present' ? 'Verified' : 'N/A');

      return [
        `"${std.rollNo}"`,
        `"${std.studentId}"`,
        `"${std.name.replace(/"/g, '""')}"`,
        `"${status.toUpperCase()}"`,
        `"${method}"`,
        `"${timestamp}"`,
        `"${session.date}"`,
        `"${session.subjectName.replace(/"/g, '""')}"`,
        `"${session.classroomName.replace(/"/g, '""')}"`,
        `"${isQR ? 'Digital (QR)' : 'Traditional Swipe'}"`,
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
      `SwipeAttend_${isQR ? 'Digital_QR' : 'Swipe'}_${session.subjectName.replace(/\s+/g, '_')}_${session.date}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };


  const handleSave = () => {
    const finalRecords: Record<string, AttendanceStatus> = {};
    students.forEach((s) => {
      finalRecords[s.id] = studentStatuses[s.id] || 'unmarked';
    });
    const finalPresent = Object.values(finalRecords).filter((s) => s === 'present').length;
    const finalAbsent = Object.values(finalRecords).filter((s) => s === 'absent').length;

    const finalSession: AttendanceSession = {
      ...session,
      records: finalRecords,
      presentCount: finalPresent,
      absentCount: finalAbsent,
      unmarkedCount: Math.max(0, students.length - (finalPresent + finalAbsent)),
      status: 'completed',
      completedAt: new Date().toISOString(),
    };
    onConfirmSave(finalSession);
  };

  const filteredStudents = useMemo(() => {
    return students.filter((std) => {
      const status = studentStatuses[std.id] || 'unmarked';
      const matchesFilter =
        filter === 'all'
          ? true
          : filter === 'present'
          ? status === 'present'
          : filter === 'absent'
          ? status === 'absent'
          : status === 'unmarked';

      const matchesSearch =
        std.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        std.rollNo.includes(searchQuery) ||
        std.studentId.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesFilter && matchesSearch;
    });
  }, [students, studentStatuses, filter, searchQuery]);

  return (
    <div className="w-full max-w-5xl mx-auto py-3 sm:py-6 px-3 sm:px-6 space-y-3.5 sm:space-y-6 animate-fade-in overflow-hidden">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 w-full">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 w-full sm:w-auto">
          <button
            onClick={onBackToSwipe}
            className="p-2 rounded-xl bg-[#141A2E] text-slate-300 hover:text-white hover:bg-white/10 transition-colors shrink-0 min-h-[40px] min-w-[40px] flex items-center justify-center cursor-pointer border border-white/5 active:scale-95"
            title="Return to marking"
            aria-label="Back to swipe deck"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="text-base sm:text-2xl font-bold text-white font-['Plus_Jakarta_Sans'] truncate">
              Attendance Summary
            </h1>
            <p className="text-[11px] sm:text-xs text-slate-400 truncate">
              {session.subjectName} · {session.classroomName}
            </p>
          </div>
        </div>

        {/* Action Controls & Date */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#141A2E] border border-white/8 text-xs text-slate-300 font-mono">
            <Calendar className="w-3.5 h-3.5 text-violet-400 shrink-0" />
            <span>{formatClassDate(session.date, true)}</span>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-600/20 text-violet-300 border border-violet-500/30 hover:bg-violet-600/30 text-xs font-semibold hover:text-white transition-colors cursor-pointer min-h-[36px]"
              title="Download CSV report"
            >
              <Download className="w-3.5 h-3.5 shrink-0 text-violet-400" />
              <span>Export CSV</span>
            </button>

            <button
              onClick={handlePrint}
              className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#141A2E] border border-white/10 text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer min-h-[36px]"
              title="Print attendance report"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4 Metric Cards (Single-column on mobile, 2x2 Grid on tablet, 4-column row on Desktop via auto-fit) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4 [grid-template-columns:repeat(auto-fit,minmax(200px,1fr))] sm:[grid-template-columns:repeat(auto-fit,minmax(220px,1fr))] w-full">
        {/* Total Students */}
        <div className="bg-[#101526] border border-white/10 rounded-xl sm:rounded-2xl p-3 sm:p-4 flex flex-col justify-between shadow-sm min-w-0">
          <span className="text-2xl sm:text-3xl font-extrabold text-white font-mono tracking-tight truncate">
            {total}
          </span>
          <div className="flex items-center gap-1.5 mt-1 text-slate-400 min-w-0">
            <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider truncate">
              Total Students
            </span>
          </div>
        </div>

        {/* Present */}
        <div className="bg-[#101526] border border-emerald-500/25 rounded-xl sm:rounded-2xl p-3 sm:p-4 flex flex-col justify-between shadow-sm min-w-0">
          <span className="text-2xl sm:text-3xl font-extrabold text-emerald-400 font-mono tracking-tight truncate">
            {presentCount}
          </span>
          <div className="flex items-center gap-1.5 mt-1 text-emerald-400/90 min-w-0">
            <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 stroke-[3]" />
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider truncate">
              Present
            </span>
          </div>
        </div>

        {/* Absent */}
        <div className="bg-[#101526] border border-red-500/25 rounded-xl sm:rounded-2xl p-3 sm:p-4 flex flex-col justify-between shadow-sm min-w-0">
          <span className="text-2xl sm:text-3xl font-extrabold text-red-400 font-mono tracking-tight truncate">
            {absentCount}
          </span>
          <div className="flex items-center gap-1.5 mt-1 text-red-400/90 min-w-0">
            <X className="w-3.5 h-3.5 text-red-400 shrink-0 stroke-[3]" />
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider truncate">
              Absent
            </span>
          </div>
        </div>

        {/* Attendance Rate */}
        <div className="bg-[#101526] border border-violet-500/25 rounded-xl sm:rounded-2xl p-3 sm:p-4 flex flex-col justify-between shadow-sm min-w-0">
          <span className="text-2xl sm:text-3xl font-extrabold text-violet-400 font-mono tracking-tight truncate">
            {attendancePercentage}%
          </span>
          <div className="flex items-center gap-1.5 mt-1 text-violet-400/90 min-w-0">
            <Sparkles className="w-3.5 h-3.5 text-violet-400 shrink-0" />
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider truncate">
              Rate
            </span>
          </div>
        </div>
      </div>

      {/* Unmarked Warning Alert */}
      {unmarkedCount > 0 && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 w-full">
          <div className="flex items-start gap-2.5 min-w-0 flex-1">
            <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 shrink-0 text-amber-400 mt-0.5" />
            <div className="text-xs min-w-0 flex-1">
              <p className="font-bold">
                {unmarkedCount} student{unmarkedCount === 1 ? '' : 's'} remain unmarked
              </p>
              <p className="text-amber-200/80 text-[11px] mt-0.5">
                Tap status below to toggle, or resolve all remaining students in one click:
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
            <button
              onClick={() => handleMarkAllUnmarked('present')}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600/30 hover:bg-emerald-600/40 border border-emerald-500/40 text-emerald-300 text-xs font-bold transition-colors cursor-pointer active:scale-95"
              title="Mark all unmarked students as present"
            >
              <Check className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Mark All Present</span>
            </button>
            <button
              onClick={() => handleMarkAllUnmarked('absent')}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-600/30 hover:bg-red-600/40 border border-red-500/40 text-red-300 text-xs font-bold transition-colors cursor-pointer active:scale-95"
              title="Mark all unmarked students as absent"
            >
              <X className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Mark All Absent</span>
            </button>
          </div>
        </div>
      )}

      {/* Search and Filters Bar (Clean Responsive Layout) */}
      <div className="bg-[#101526] border border-white/8 rounded-xl sm:rounded-2xl p-2.5 sm:p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 w-full">
        <div className="relative w-full sm:flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search student name, roll no, or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#171E33] border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-violet-500"
          />
        </div>

        <div className="grid grid-cols-2 sm:flex items-center gap-1 bg-[#171E33] p-1 rounded-xl border border-white/5 w-full sm:w-auto">
          <button
            onClick={() => setFilter('all')}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer text-center min-h-[32px] ${
              filter === 'all'
                ? 'bg-violet-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            All ({total})
          </button>
          <button
            onClick={() => setFilter('present')}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer text-center min-h-[32px] ${
              filter === 'present'
                ? 'bg-emerald-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Present ({presentCount})
          </button>
          <button
            onClick={() => setFilter('absent')}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer text-center min-h-[32px] ${
              filter === 'absent'
                ? 'bg-red-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Absent ({absentCount})
          </button>
          {unmarkedCount > 0 && (
            <button
              onClick={() => setFilter('unmarked')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer text-center min-h-[32px] ${
                filter === 'unmarked'
                  ? 'bg-amber-600 text-white shadow'
                  : 'text-amber-400/80 hover:text-amber-300'
              }`}
            >
              Unmarked ({unmarkedCount})
            </button>
          )}
        </div>
      </div>

      {/* RESPONSIVE ROSTER: Cards on screens < 768px, Structured Table on screens >= 768px */}
      <ResponsiveTableWrapper
        mobileCards={
          <div className="space-y-2 w-full">
            {filteredStudents.length === 0 ? (
              <div className="p-8 text-center bg-[#101526] border border-white/8 rounded-xl text-slate-400 text-xs">
                No students found matching your search.
              </div>
            ) : (
              filteredStudents.map((std, idx) => {
                const status = studentStatuses[std.id] || 'unmarked';
                return (
                  <div
                    key={std.id}
                    className="bg-[#101526] border border-white/8 rounded-xl p-3 flex items-center justify-between gap-2.5 shadow-md hover:border-white/15 transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <span className="text-[11px] font-mono text-slate-500 w-4 text-right shrink-0">
                        {idx + 1}
                      </span>
                      <img
                        src={std.avatarUrl}
                        alt={std.name}
                        className="w-10 h-10 rounded-full object-cover ring-1 ring-white/10 shrink-0 bg-slate-800"
                        loading="lazy"
                        decoding="async"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-white truncate">{std.name}</p>
                        <div className="flex items-center gap-1.5 text-[11px] mt-0.5 flex-wrap">
                          <span className="font-mono text-violet-300 font-semibold">{std.rollNo}</span>
                          <span className="text-slate-500">·</span>
                          <span className="text-slate-400 text-[10px]">{std.attendancePercentage}% Rate</span>
                        </div>
                      </div>
                    </div>

                    {/* Large Touch-Friendly Toggle Button */}
                    <button
                      onClick={() => handleToggleStatus(std.id, status)}
                      className={`flex items-center justify-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 min-h-[38px] active:scale-95 shadow-sm ${
                        status === 'present'
                          ? 'bg-emerald-500 text-white shadow-emerald-500/25'
                          : status === 'absent'
                          ? 'bg-red-500 text-white shadow-red-500/25'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      }`}
                      title="Tap to toggle status"
                      aria-label={`Toggle status for ${std.name}`}
                    >
                      {status === 'present' ? (
                        <>
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                          <span>Present</span>
                        </>
                      ) : status === 'absent' ? (
                        <>
                          <X className="w-3.5 h-3.5 stroke-[3]" />
                          <span>Absent</span>
                        </>
                      ) : (
                        <span>Unmarked</span>
                      )}
                    </button>
                  </div>
                );
              })
            )}
          </div>
        }
        desktopTable={
          <div className="w-full overflow-hidden">
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left text-xs text-slate-300 min-w-[560px]">
                <thead className="bg-[#141A2E] text-slate-400 uppercase font-semibold text-[10px] sm:text-[11px] border-b border-white/8 sticky top-0 z-10">
                  <tr>
                    <th className="py-2.5 sm:py-3.5 px-3 sm:px-4 w-12 font-mono">#</th>
                    <th className="py-2.5 sm:py-3.5 px-3 sm:px-4 w-14">Photo</th>
                    <th className="py-2.5 sm:py-3.5 px-3 sm:px-4">Student</th>
                    <th className="py-2.5 sm:py-3.5 px-3 sm:px-4 font-mono">Roll No</th>
                    <th className="py-2.5 sm:py-3.5 px-3 sm:px-4 text-center">Status (Click to Toggle)</th>
                    <th className="py-2.5 sm:py-3.5 px-3 sm:px-4 text-right">Term Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-10 text-slate-400">
                        No students found matching your search.
                      </td>
                    </tr>
                  ) : (
                    filteredStudents.map((std, idx) => (
                      <StudentAttendanceSummaryRow
                        key={std.id}
                        index={idx}
                        student={std}
                        status={studentStatuses[std.id] || 'unmarked'}
                        onToggleStatus={handleToggleStatus}
                      />
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        }
      />

      {/* Bottom Confirmation CTA (Mobile-Friendly Full-Width Stack) */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-[#101526] border border-white/10 shadow-xl w-full">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-xs sm:text-sm font-bold text-white">Save session to database</p>
            {typeof navigator !== 'undefined' && navigator.onLine ? (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-medium font-mono">
                Cloud Sync Ready
              </span>
            ) : (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 font-medium font-mono">
                Saved on this device — waiting to sync
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-400 truncate">
            {presentCount} Present · {absentCount} Absent · {unmarkedCount} Unmarked
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full sm:w-auto">
          <button
            type="button"
            onClick={handleExportCSV}
            className="flex items-center justify-center gap-2 px-4 py-2.5 sm:py-3 rounded-xl bg-cyan-600/20 hover:bg-cyan-600/30 border border-cyan-500/30 text-cyan-300 font-semibold text-xs sm:text-sm transition-all cursor-pointer min-h-[44px] shadow-sm"
            title="Download CSV report for this session"
          >
            <Download className="w-4 h-4 text-cyan-400" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={handleSave}
            className="flex items-center justify-center gap-2 px-5 py-2.5 sm:py-3 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-violet-600/30 transition-all cursor-pointer min-h-[44px] w-full sm:w-auto"
          >
            <Save className="w-4 h-4" />
            <span>Confirm & Save Attendance</span>
          </button>
        </div>
      </div>
    </div>
  );
};
