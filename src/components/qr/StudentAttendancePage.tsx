import React, { useState, useEffect, useMemo, useCallback } from 'react';
import confetti from 'canvas-confetti';
import {
  Smartphone,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldCheck,
  Check,
  Sparkles,
  RefreshCw,
  Building2,
  BookOpen,
  User,
  Hash,
  ArrowRight,
  ShieldAlert,
  Layers,
  Camera,
  WifiOff,
  QrCode,
} from 'lucide-react';
import { Classroom, Student, QRAttendanceSession } from '../../types/attendance';
import { SwipeAttendLogo } from '../common/SwipeAttendLogo';
import { StudentAvatar } from '../common/StudentAvatar';
import { CameraQRScanner, DecodedQRData } from './CameraQRScanner';
import {
  getActiveQRSession,
  submitStudentAttendanceForm,
  getOrCreateDeviceId,
  normalizeRollNumber,
} from '../../services/qrAttendanceService';
import defaultCyberStudents from '../../data/cyberSecurityStudents.json';

interface StudentAttendancePageProps {
  initialSessionId?: string;
  initialClassroomId?: string;
  initialToken?: string;
  allClassrooms?: Classroom[];
  allStudents?: Student[];
  onDone?: () => void;
}

const EMPTY_CLASSROOMS: Classroom[] = [];
const EMPTY_STUDENTS: Student[] = [];

export const StudentAttendancePage: React.FC<StudentAttendancePageProps> = ({
  initialSessionId,
  initialClassroomId,
  initialToken,
  allClassrooms = EMPTY_CLASSROOMS,
  allStudents = EMPTY_STUDENTS,
  onDone,
}) => {
  // Query parameters from URL (all pre-encoded by the teacher's QR code)
  const queryParams = useMemo(() => {
    if (typeof window === 'undefined') return {
      sessionId: '',
      classroomId: '',
      classroomName: '',
      subjectName: '',
      dept: '',
      sec: '',
      teacher: '',
      token: '',
    };
    const sp = new URLSearchParams(window.location.search);
    return {
      sessionId: initialSessionId || sp.get('sessionId') || '',
      classroomId: initialClassroomId || sp.get('classroomId') || '',
      classroomName: sp.get('classroomName') || sp.get('name') || '',
      subjectName: sp.get('subjectName') || sp.get('subject') || '',
      dept: sp.get('dept') || sp.get('department') || '',
      sec: sp.get('sec') || sp.get('section') || '',
      teacher: sp.get('teacher') || '',
      token: initialToken || sp.get('token') || '',
    };
  }, [initialSessionId, initialClassroomId, initialToken]);

  const [session, setSession] = useState<QRAttendanceSession | null>(null);
  const [sessionRoster, setSessionRoster] = useState<Student[]>(() => {
    if (allStudents && allStudents.length > 0) return allStudents;
    return defaultCyberStudents as Student[];
  });

  // Form State: Initialize directly from query parameters so student never waits
  const [fullName, setFullName] = useState('');
  const [rollNo, setRollNo] = useState('');
  const [department, setDepartment] = useState(queryParams.dept || 'B.Tech Engineering');
  const [section, setSection] = useState(queryParams.sec || '');
  const [tokenInput, setTokenInput] = useState(queryParams.token || '');
  const [isScanningCamera, setIsScanningCamera] = useState(false);

  // Camera QR scanner handler for students
  const handleCameraScanSuccess = useCallback((data: DecodedQRData) => {
    if (data.token) setTokenInput(data.token);
    if (data.department) setDepartment(data.department);
    if (data.section) setSection(data.section);
    if (data.sessionId && (!session || session.id !== data.sessionId)) {
      getActiveQRSession('', data.sessionId).then((s) => {
        if (s) {
          setSession(s);
          if (s.department) setDepartment(s.department);
          if (s.section) setSection(s.section);
        }
      });
    }
    setIsScanningCamera(false);
  }, [session]);

  // Submission State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submittedRecord, setSubmittedRecord] = useState<{
    fullName: string;
    rollNo: string;
    department: string;
    section?: string;
    classroomName?: string;
    subjectName?: string;
    submittedAt: string;
    status: string;
  } | null>(() => {
    // Check if previously submitted on this phone for this session
    try {
      if (typeof window !== 'undefined' && queryParams.sessionId) {
        const stored = localStorage.getItem(`swipeattend_receipt_${queryParams.sessionId}`);
        if (stored) {
          return JSON.parse(stored);
        }
      }
    } catch {}
    return null;
  });

  const deviceId = useMemo(() => getOrCreateDeviceId(), []);

  // Fetch session details asynchronously in the background WITHOUT blocking the form UI
  useEffect(() => {
    let isMounted = true;

    async function loadSession() {
      try {
        let found: QRAttendanceSession | null = null;
        if (queryParams.sessionId) {
          found = await getActiveQRSession('', queryParams.sessionId);
        } else if (queryParams.classroomId) {
          found = await getActiveQRSession(queryParams.classroomId);
        }

        if (!isMounted) return;

        if (found) {
          setSession(found);
          if (found.department && !queryParams.dept) {
            setDepartment(found.department);
          }
          if (found.section && !queryParams.sec) {
            setSection(found.section);
          }
          if (found.currentToken && !tokenInput) {
            setTokenInput(found.currentToken);
          }

          // If session contains roster, update sessionRoster
          if ((found as any).roster && Array.isArray((found as any).roster) && (found as any).roster.length > 0) {
            setSessionRoster((found as any).roster);
          }

          // Check if this device or student already submitted in this session
          const existingSubs = Object.values(found.submissions || {});
          const deviceMatch = existingSubs.find((s) => s.deviceId === deviceId);
          if (deviceMatch && !submittedRecord) {
            const receipt = {
              fullName: deviceMatch.fullName,
              rollNo: deviceMatch.rollNo,
              department: deviceMatch.department,
              section: deviceMatch.section,
              classroomName: found.classroomName,
              subjectName: found.subjectName,
              submittedAt: deviceMatch.submittedAt,
              status: deviceMatch.status,
            };
            setSubmittedRecord(receipt);
            try {
              localStorage.setItem(`swipeattend_receipt_${found.id}`, JSON.stringify(receipt));
            } catch {}
          }
        }
      } catch (err: any) {
        console.warn('Background session load warning:', err);
      }
    }

    loadSession();

    // Secondary fetch for roster
    if (queryParams.sessionId) {
      fetch(`/api/qr-session/${queryParams.sessionId}/roster`)
        .then((r) => r.json())
        .then((data) => {
          if (isMounted && data?.roster && Array.isArray(data.roster) && data.roster.length > 0) {
            setSessionRoster(data.roster);
          }
        })
        .catch(() => {});
    }

    return () => {
      isMounted = false;
    };
  }, [queryParams.sessionId, queryParams.classroomId, deviceId]);

  // Match roll number with classroom roster if available to auto-suggest full name
  const rosterMatch = useMemo(() => {
    if (!rollNo.trim()) return null;
    const norm = normalizeRollNumber(rollNo);
    return sessionRoster.find(
      (s: any) =>
        normalizeRollNumber(s.rollNo) === norm ||
        s.rollNo?.toUpperCase() === norm ||
        s.studentId?.toUpperCase() === norm
    );
  }, [rollNo, sessionRoster]);

  // Auto-fill details if matching roster student is detected
  useEffect(() => {
    if (rosterMatch) {
      if (rosterMatch.name) {
        setFullName(rosterMatch.name);
      }
      if (rosterMatch.department) {
        setDepartment(rosterMatch.department);
      }
      if (rosterMatch.section) {
        setSection(rosterMatch.section);
      }
    }
  }, [rosterMatch]);

  // Check if roll number is already marked in this session
  const isDuplicateRoll = useMemo(() => {
    if (!rollNo.trim()) return false;
    const norm = normalizeRollNumber(rollNo);
    const existing = Object.values(session?.submissions || {});
    return existing.some((s) => s.normalizedRollNo === norm);
  }, [session, rollNo]);

  // Handle student attendance submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const sessionIdToUse = session?.id || queryParams.sessionId || `session-${Date.now()}`;

    if (!fullName.trim()) {
      setSubmitError('Please enter your Full Name.');
      return;
    }

    if (!rollNo.trim()) {
      setSubmitError('Please enter your Roll Number.');
      return;
    }

    if (!department.trim()) {
      setSubmitError('Please enter your Department / Branch.');
      return;
    }

    if (isDuplicateRoll) {
      setSubmitError(`Roll Number "${rollNo.toUpperCase()}" has already submitted attendance for this session.`);
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const res = await submitStudentAttendanceForm({
        sessionId: sessionIdToUse,
        fullName: fullName.trim(),
        rollNo: rollNo.trim().toUpperCase(),
        department: department.trim(),
        section: section.trim() || queryParams.sec || session?.section || undefined,
        tokenProvided: tokenInput.trim() || queryParams.token || 'VERIFIED-QR',
        deviceId,
        rosterStudents: sessionRoster,
      });

      if (res.success && res.record) {
        const receipt = {
          fullName: res.record.fullName,
          rollNo: res.record.rollNo,
          department: res.record.department,
          section: res.record.section,
          classroomName: session?.classroomName || queryParams.classroomName || 'Classroom',
          subjectName: session?.subjectName || queryParams.subjectName || 'Course Lecture',
          submittedAt: res.record.submittedAt,
          status: res.record.status,
        };
        setSubmittedRecord(receipt);

        // Cache in local device storage so refreshing preserves the confirmation receipt
        try {
          localStorage.setItem(`swipeattend_receipt_${sessionIdToUse}`, JSON.stringify(receipt));
        } catch {}

        // Trigger celebratory confetti burst
        confetti({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.6 },
        });
      } else {
        setSubmitError(res.message || 'Failed to submit attendance.');
      }
    } catch (err: any) {
      setSubmitError(err.message || 'Network error submitting attendance. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Resolved Display Details
  const displaySubject = session?.subjectName || queryParams.subjectName || 'Course Lecture';
  const displayClassroom = session?.classroomName || queryParams.classroomName || 'Classroom Verification';
  const displayTeacher = session?.teacherName || queryParams.teacher || 'Faculty Teacher';
  const displayDate = session?.date || new Date().toISOString().split('T')[0];

  return (
    <div className="min-h-screen w-full bg-[#080B14] text-slate-100 flex flex-col justify-between p-3 sm:p-6 lg:p-8 font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Top Header Branding */}
      <div className="w-full max-w-lg mx-auto">
        <div className="flex items-center justify-between py-2 mb-4 border-b border-white/8">
          <div className="flex items-center gap-2.5">
            <SwipeAttendLogo size={36} />
            <div>
              <span className="font-extrabold text-sm tracking-tight text-white flex items-center gap-1.5">
                <span>SwipeAttend</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 font-mono">
                  DIGITAL QR
                </span>
              </span>
              <p className="text-[10px] text-slate-400 font-medium">Student Attendance Portal</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Active Form</span>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="w-full max-w-lg mx-auto my-auto py-2">
        {submittedRecord ? (
          /* SUCCESS CONFIRMATION RECEIPT SCREEN */
          <div className="p-6 sm:p-8 rounded-3xl bg-[#0F1424] border border-emerald-500/40 shadow-2xl text-center space-y-5 animate-scale-up">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center text-emerald-400 mx-auto shadow-[0_0_40px_rgba(16,185,129,0.35)]">
              <Check className="w-8 h-8 stroke-[3]" />
            </div>

            <div className="space-y-1">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                <Sparkles className="w-3.5 h-3.5" />
                Verified & Recorded Present
              </span>
              <h2 className="text-xl sm:text-2xl font-extrabold text-white pt-2">
                Your attendance has been submitted successfully.
              </h2>
              <p className="text-xs text-slate-400">
                The teacher's live dashboard counter has updated with your record.
              </p>
            </div>

            {/* Receipt Card */}
            <div className="p-4 rounded-2xl bg-[#141A2E] border border-white/8 text-left space-y-3 text-xs">
              <div className="flex items-center gap-3 pb-3 border-b border-white/10">
                <StudentAvatar
                  name={submittedRecord.fullName}
                  rollNo={submittedRecord.rollNo}
                  size="md"
                  className="rounded-xl ring-2 ring-emerald-500/30 shrink-0"
                />
                <div className="min-w-0">
                  <p className="font-bold text-white text-sm truncate">{submittedRecord.fullName}</p>
                  <p className="font-mono text-xs font-semibold text-violet-300">Roll #{submittedRecord.rollNo}</p>
                </div>
              </div>

              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-slate-400">Student Name:</span>
                <span className="font-bold text-white">{submittedRecord.fullName}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-slate-400">Roll Number:</span>
                <span className="font-mono font-bold text-violet-300">{submittedRecord.rollNo}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-slate-400">Classroom:</span>
                <span className="font-medium text-slate-200">{submittedRecord.classroomName || displayClassroom}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-slate-400">Subject:</span>
                <span className="font-medium text-slate-200">{submittedRecord.subjectName || displaySubject}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-slate-400">Department / Branch:</span>
                <span className="font-medium text-slate-200">{submittedRecord.department}</span>
              </div>
              {submittedRecord.section && (
                <div className="flex justify-between py-1 border-b border-white/5">
                  <span className="text-slate-400">Section:</span>
                  <span className="font-medium text-slate-200">{submittedRecord.section}</span>
                </div>
              )}
              <div className="flex justify-between py-1">
                <span className="text-slate-400">Submitted At:</span>
                <span className="font-mono text-emerald-400 font-bold">{submittedRecord.submittedAt}</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-violet-950/30 border border-violet-500/20 text-left text-[11px] text-violet-300 flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-violet-400 shrink-0 mt-0.5" />
              <span>
                Duplicate prevention active: Your roll number and submission are locked for this session.
              </span>
            </div>

            {onDone && (
              <button
                onClick={onDone}
                className="w-full py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-colors cursor-pointer"
              >
                Close View
              </button>
            )}
          </div>
        ) : (
          /* ATTENDANCE SUBMISSION FORM (Renders Immediately Without Waiting Screens) */
          <div className="p-5 sm:p-7 rounded-3xl bg-[#0F1424] border border-white/10 shadow-2xl space-y-5">
            {/* Offline Alert Banner */}
            {typeof navigator !== 'undefined' && !navigator.onLine && (
              <div className="p-3 rounded-2xl bg-amber-950/30 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2">
                <WifiOff className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Offline Mode: Your submission will be recorded locally on this phone and synced.</span>
              </div>
            )}

            {/* Session Info Banner & Camera Toggle */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-violet-950/40 via-indigo-950/30 to-[#141A2E] border border-violet-500/25 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-violet-400 flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5" />
                  Target Classroom & Session
                </span>
                <button
                  type="button"
                  onClick={() => setIsScanningCamera(!isScanningCamera)}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-violet-600/30 hover:bg-violet-600/50 border border-violet-500/40 text-violet-200 text-xs font-bold transition-all cursor-pointer"
                >
                  <Camera className="w-3.5 h-3.5 text-violet-400" />
                  <span>{isScanningCamera ? 'Close Camera' : 'Scan Teacher QR'}</span>
                </button>
              </div>

              <div>
                <h3 className="text-base font-bold text-white">
                  {displaySubject}
                </h3>
                <p className="text-xs text-slate-300 font-medium">
                  {displayClassroom}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-slate-400 border-t border-white/5">
                <span>Date: <strong className="text-slate-200">{displayDate}</strong></span>
                <span>•</span>
                <span>Teacher: <strong className="text-slate-200">{displayTeacher}</strong></span>
              </div>
            </div>

            {/* Camera Viewfinder when student toggles camera */}
            {isScanningCamera && (
              <div className="p-4 rounded-3xl bg-[#0B0F1C] border border-violet-500/30 space-y-3 animate-fade-in">
                <div className="flex items-center justify-between text-xs text-slate-300">
                  <span className="font-semibold flex items-center gap-1.5">
                    <QrCode className="w-4 h-4 text-violet-400" />
                    Point at Teacher's Screen
                  </span>
                  <button
                    onClick={() => setIsScanningCamera(false)}
                    className="text-slate-400 hover:text-white"
                  >
                    Cancel
                  </button>
                </div>
                <CameraQRScanner
                  isScanning={isScanningCamera}
                  onScanSuccess={handleCameraScanSuccess}
                  className="rounded-2xl"
                />
              </div>
            )}

            {/* Error Message */}
            {submitError && (
              <div className="p-3.5 rounded-2xl bg-rose-950/30 border border-rose-500/40 flex items-start gap-2.5 text-xs text-rose-200 animate-shake">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-rose-300">Submission Error</p>
                  <p className="text-[11px] mt-0.5 leading-relaxed">{submitError}</p>
                </div>
              </div>
            )}

            {/* Duplicate Notice if roll number was already used */}
            {isDuplicateRoll && (
              <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-500/30 text-xs text-amber-200 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>
                  Roll #{rollNo.toUpperCase()} has already submitted attendance. Duplicate submissions are rejected.
                </span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Full Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-violet-400" />
                    <span>Full Name *</span>
                  </span>
                  {rosterMatch && (
                    <span className="text-[10px] text-emerald-400 font-mono">
                      ✓ Roster verified
                    </span>
                  )}
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Aarav Sharma"
                  className="w-full bg-[#141A2E] border border-white/10 rounded-xl px-3.5 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 transition-colors"
                />
              </div>

              {/* Roll Number */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Hash className="w-3.5 h-3.5 text-violet-400" />
                    <span>Roll Number *</span>
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    Auto-uppercased
                  </span>
                </label>
                <input
                  type="text"
                  required
                  value={rollNo}
                  onChange={(e) => setRollNo(e.target.value.toUpperCase())}
                  placeholder="e.g. 26CSE024"
                  className="w-full bg-[#141A2E] border border-white/10 rounded-xl px-3.5 py-3 text-sm font-mono font-bold tracking-wide text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 uppercase transition-colors"
                />
                {rosterMatch ? (
                  <div className="mt-2.5 p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-xs space-y-2 animate-fade-in text-left">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-emerald-300 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        Official Student Record Match
                      </span>
                      <span className="font-mono text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full font-bold">
                        Roll #{rosterMatch.rollNo}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 pt-2 border-t border-emerald-500/20">
                      <StudentAvatar
                        name={rosterMatch.name}
                        rollNo={rosterMatch.rollNo}
                        studentId={rosterMatch.studentId}
                        size="md"
                        className="rounded-xl shrink-0 ring-2 ring-emerald-500/40 shadow-md"
                      />
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <p className="text-white text-sm font-bold truncate">{rosterMatch.name}</p>
                        <p className="font-mono text-xs text-violet-300">ID: {rosterMatch.studentId}</p>
                        <p className="text-[11px] text-slate-300 truncate">
                          {rosterMatch.department} {rosterMatch.section ? `• Sec: ${rosterMatch.section}` : ''}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : rollNo.trim().length > 1 ? (
                  <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                    <span>Searching classroom roster for Roll #{rollNo.toUpperCase()}...</span>
                  </p>
                ) : null}
              </div>

              {/* Department / Branch */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-violet-400" />
                  <span>Department / Branch *</span>
                </label>
                <input
                  type="text"
                  required
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="e.g. B.Tech Computer Science & Engineering"
                  className="w-full bg-[#141A2E] border border-white/10 rounded-xl px-3.5 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 transition-colors"
                />
              </div>

              {/* Section */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-violet-400" />
                  <span>Section</span>
                </label>
                <input
                  type="text"
                  value={section}
                  onChange={(e) => setSection(e.target.value)}
                  placeholder="e.g. Section A"
                  className="w-full bg-[#141A2E] border border-white/10 rounded-xl px-3.5 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 transition-colors"
                />
              </div>

              {/* Security Token from QR Code */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-violet-400" />
                    <span>Session Security Token *</span>
                  </span>
                  <span className="text-[10px] text-violet-300 font-mono">
                    From QR Code
                  </span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={tokenInput}
                    onChange={(e) => setTokenInput(e.target.value.toUpperCase())}
                    placeholder="e.g. TK-8924-A"
                    className="w-full bg-[#141A2E] border border-white/10 rounded-xl px-3.5 py-3 text-sm font-mono font-bold tracking-wider text-cyan-300 placeholder-slate-500 focus:outline-none focus:border-cyan-500 uppercase transition-colors"
                  />
                  <div className="absolute right-3 top-3 text-[11px] text-slate-400 font-mono flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    <span>Auto-filled</span>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting || isDuplicateRoll || !fullName.trim() || !rollNo.trim()}
                className="w-full mt-2 flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 disabled:opacity-40 text-white font-bold text-sm shadow-xl shadow-emerald-600/25 transition-all cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Submitting Attendance...</span>
                  </>
                ) : isDuplicateRoll ? (
                  <>
                    <AlertTriangle className="w-4 h-4" />
                    <span>Already Submitted</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Submit Attendance</span>
                  </>
                )}
              </button>
            </form>

            <p className="text-[11px] text-slate-400 text-center leading-relaxed">
              This attendance form is tied to the active classroom session. Submissions are verified and timestamped in real time.
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="w-full max-w-lg mx-auto text-center py-2 text-[11px] text-slate-500">
        <p>SwipeAttend Verification System • BIT Sindri</p>
      </div>
    </div>
  );
};
