import React, { useState, useEffect, useMemo, useCallback } from 'react';
import confetti from 'canvas-confetti';
import {
  X,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldCheck,
  Search,
  UserCheck,
  Smartphone,
  RefreshCw,
  QrCode,
  Sparkles,
  ArrowRight,
  Camera,
  Layers,
  Check,
  Building2,
  Calendar,
} from 'lucide-react';
import { Classroom, Student, QRAttendanceSession } from '../../types/attendance';
import { SwipeAttendLogo } from '../common/SwipeAttendLogo';
import { CameraQRScanner, DecodedQRData } from './CameraQRScanner';
import {
  submitStudentAttendanceForm,
  verifyAndMarkStudentAttendance,
  getActiveQRSession,
  getOrCreateDeviceId,
  normalizeRollNumber,
} from '../../services/qrAttendanceService';

interface StudentScanAttendanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialSessionId?: string;
  initialClassroomId?: string;
  initialToken?: string;
  allClassrooms: Classroom[];
  allStudents: Student[];
  onAttendanceMarkedSuccess?: (studentId: string) => void;
}

export const StudentScanAttendanceModal: React.FC<StudentScanAttendanceModalProps> = ({
  isOpen,
  onClose,
  initialSessionId,
  initialClassroomId,
  initialToken,
  allClassrooms = [],
  allStudents = [],
  onAttendanceMarkedSuccess,
}) => {
  const [activeTab, setActiveTab] = useState<'camera' | 'manual'>('camera');
  const [session, setSession] = useState<QRAttendanceSession | null>(null);
  const [tokenInput, setTokenInput] = useState<string>(initialToken || '');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [searchStudentQuery, setSearchStudentQuery] = useState<string>('');
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<{
    studentName: string;
    rollNo: string;
    scannedAt: string;
    message: string;
    department?: string;
    classroomName?: string;
  } | null>(null);

  const deviceId = useMemo(() => getOrCreateDeviceId(), []);

  // Load active session from ID or classroom
  useEffect(() => {
    if (!isOpen) return;

    setErrorMsg(null);
    setSuccessInfo(null);
    if (initialToken) setTokenInput(initialToken);

    async function fetchSession() {
      if (initialSessionId) {
        const found = await getActiveQRSession('', initialSessionId);
        if (found) setSession(found);
      } else if (initialClassroomId) {
        const found = await getActiveQRSession(initialClassroomId);
        if (found) setSession(found);
      }
    }

    fetchSession();
  }, [isOpen, initialClassroomId, initialSessionId, initialToken]);

  // Determine current classroom and enrolled students
  const targetClassroomId = session?.classroomId || initialClassroomId;
  const targetClassroom = allClassrooms.find((c) => c.id === targetClassroomId);
  const enrolledStudents = useMemo(() => {
    if (!targetClassroomId) return allStudents.slice(0, 75);
    const inClass = allStudents.filter((s) => s.classroomId === targetClassroomId);
    return inClass.length > 0 ? inClass : allStudents.slice(0, 75);
  }, [allStudents, targetClassroomId]);

  // Auto-select first student if none selected
  useEffect(() => {
    if (!selectedStudent && enrolledStudents.length > 0) {
      setSelectedStudent(enrolledStudents[0]);
    }
  }, [enrolledStudents, selectedStudent]);

  // Filter students based on search input
  const filteredStudents = useMemo(() => {
    return enrolledStudents.filter(
      (s) =>
        s.name.toLowerCase().includes(searchStudentQuery.toLowerCase()) ||
        s.rollNo.toLowerCase().includes(searchStudentQuery.toLowerCase()) ||
        s.studentId.toLowerCase().includes(searchStudentQuery.toLowerCase())
    );
  }, [enrolledStudents, searchStudentQuery]);

  // Handle successful live camera QR code decode
  const handleCameraScanSuccess = useCallback(async (data: DecodedQRData) => {
    setErrorMsg(null);

    // If QR code provided token, set it
    if (data.token) {
      setTokenInput(data.token);
    }

    // Load or switch session if QR code pointed to a specific sessionId
    let effectiveSession = session;
    if (data.sessionId && (!session || session.id !== data.sessionId)) {
      const loaded = await getActiveQRSession('', data.sessionId);
      if (loaded) {
        setSession(loaded);
        effectiveSession = loaded;
      }
    }

    // Auto-detect student if scanned QR contains rollNo, studentId, or studentName
    let studentToMark = selectedStudent;
    if (data.rollNo || data.studentId || data.studentName) {
      const matched = allStudents.find(
        (s) =>
          (data.rollNo && (normalizeRollNumber(s.rollNo) === normalizeRollNumber(data.rollNo) || s.rollNo.toUpperCase() === data.rollNo.toUpperCase())) ||
          (data.studentId && s.studentId.toUpperCase() === data.studentId.toUpperCase()) ||
          (data.studentName && s.name.toLowerCase() === data.studentName.toLowerCase())
      );
      if (matched) {
        setSelectedStudent(matched);
        studentToMark = matched;
      }
    }

    // If student is determined, verify immediately!
    if (studentToMark && (data.sessionId || effectiveSession?.id || initialSessionId)) {
      const sessId = data.sessionId || effectiveSession?.id || initialSessionId || '';
      const token = data.token || effectiveSession?.currentToken || tokenInput || 'VERIFIED-QR';
      
      setIsVerifying(true);
      try {
        const res = await submitStudentAttendanceForm({
          sessionId: sessId,
          fullName: studentToMark.name,
          rollNo: studentToMark.rollNo,
          department: studentToMark.department || effectiveSession?.department || 'Engineering',
          section: studentToMark.section || effectiveSession?.section,
          tokenProvided: token,
          deviceId,
          rosterStudents: enrolledStudents,
        });

        if (res.success && res.record) {
          setSuccessInfo({
            studentName: res.record.fullName,
            rollNo: res.record.rollNo,
            scannedAt: res.record.submittedAt,
            message: 'QR Camera Scan Verified Successfully!',
            department: res.record.department,
            classroomName: effectiveSession?.classroomName || targetClassroom?.name,
          });

          confetti({
            particleCount: 120,
            spread: 80,
            origin: { y: 0.6 },
          });

          if (onAttendanceMarkedSuccess && studentToMark) {
            onAttendanceMarkedSuccess(studentToMark.id);
          }
        } else {
          setErrorMsg(res.message || 'QR Token validation failed. Try rescanning.');
        }
      } catch (err: any) {
        setErrorMsg(err.message || 'Error recording camera scan attendance.');
      } finally {
        setIsVerifying(false);
      }
    } else {
      // Switched to confirmation view
      setActiveTab('manual');
    }
  }, [session, selectedStudent, initialSessionId, tokenInput, deviceId, enrolledStudents, targetClassroom, onAttendanceMarkedSuccess]);

  // Handle manual submit button click
  const handleMarkAttendance = async () => {
    if (!selectedStudent) {
      setErrorMsg('Please select your student record to proceed.');
      return;
    }

    const sessionIdToUse = session?.id || initialSessionId || '';
    const tokenToUse = tokenInput.trim() || session?.currentToken || 'VERIFIED-QR';

    if (!sessionIdToUse) {
      setErrorMsg('No active attendance session found.');
      return;
    }

    setIsVerifying(true);
    setErrorMsg(null);

    try {
      const res = await submitStudentAttendanceForm({
        sessionId: sessionIdToUse,
        fullName: selectedStudent.name,
        rollNo: selectedStudent.rollNo,
        department: selectedStudent.department || session?.department || 'B.Tech Engineering',
        section: selectedStudent.section || session?.section,
        tokenProvided: tokenToUse,
        deviceId,
        rosterStudents: enrolledStudents,
      });

      if (res.success && res.record) {
        setSuccessInfo({
          studentName: selectedStudent.name,
          rollNo: selectedStudent.rollNo,
          scannedAt: res.record.submittedAt,
          message: 'Attendance Verified & Submitted!',
          department: selectedStudent.department,
          classroomName: session?.classroomName || targetClassroom?.name,
        });

        confetti({
          particleCount: 110,
          spread: 80,
          origin: { y: 0.6 },
        });

        if (onAttendanceMarkedSuccess) {
          onAttendanceMarkedSuccess(selectedStudent.id);
        }
      } else {
        setErrorMsg(res.message || 'Verification failed. Please check the current token.');
      }
    } catch (e: any) {
      setErrorMsg(e.message || 'An unexpected error occurred during verification.');
    } finally {
      setIsVerifying(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-lg rounded-3xl bg-[#0C101D] border border-white/12 shadow-2xl p-5 sm:p-7 text-slate-100 flex flex-col space-y-4 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/8 shrink-0">
          <div className="flex items-center gap-3">
            <SwipeAttendLogo size={40} />
            <div>
              <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                <span>Student QR Scanner</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  LIVE
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                {targetClassroom?.name || session?.classroomName || 'Classroom Attendance Verification'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
            title="Close scanner"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher: Camera Scanner vs Manual Roll */}
        {!successInfo && (
          <div className="grid grid-cols-2 gap-1 bg-[#141A2E] p-1 rounded-xl border border-white/8 shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab('camera')}
              className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'camera'
                  ? 'bg-violet-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Live Camera Scan</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('manual')}
              className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'manual'
                  ? 'bg-violet-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>Enter Code / Roll</span>
            </button>
          </div>
        )}

        {/* Success Confirmation Pass */}
        {successInfo ? (
          <div className="p-6 sm:p-7 rounded-3xl bg-linear-to-b from-[#101E2E] to-[#0D1526] border border-emerald-500/35 text-center space-y-4 animate-fade-in">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-400 text-emerald-400 flex items-center justify-center mx-auto shadow-xl shadow-emerald-500/25 animate-bounce">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/30">
                Verified Present
              </span>
              <h4 className="text-xl font-extrabold text-white pt-2">{successInfo.studentName}</h4>
              <p className="text-xs font-mono font-bold text-violet-300">
                Roll No: {successInfo.rollNo}
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-black/40 border border-white/8 text-xs text-slate-300 space-y-1.5 text-left">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Class:</span>
                <span className="font-semibold text-white">{successInfo.classroomName || 'Course Lecture'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Time Verified:</span>
                <span className="font-mono text-emerald-300">{successInfo.scannedAt}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Method:</span>
                <span className="text-violet-300 font-semibold">QR Smart Scan</span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-emerald-600/30 transition-all cursor-pointer"
            >
              Done & Return
            </button>
          </div>
        ) : (
          <>
            {/* Error Banner */}
            {errorMsg && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                <span className="flex-1">{errorMsg}</span>
              </div>
            )}

            {/* TAB 1: Live Camera Scanner */}
            {activeTab === 'camera' && (
              <div className="space-y-3">
                <CameraQRScanner
                  onScanSuccess={handleCameraScanSuccess}
                  isScanning={activeTab === 'camera' && isOpen}
                />

                {/* Selected Student Identifier Preview */}
                <div className="p-3 rounded-2xl bg-[#141A2E] border border-white/8 flex items-center justify-between gap-2.5">
                  <div className="min-w-0">
                    <p className="text-[10px] text-slate-400 uppercase font-semibold">Marking Attendance For:</p>
                    <p className="text-xs font-bold text-white truncate">
                      {selectedStudent?.name || 'Tap to select student'}
                    </p>
                    <p className="text-[10px] font-mono text-violet-300">
                      Roll {selectedStudent?.rollNo}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setActiveTab('manual')}
                    className="px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-slate-300 text-xs font-semibold cursor-pointer shrink-0"
                  >
                    Change
                  </button>
                </div>
              </div>
            )}

            {/* TAB 2: Manual Code & Student Selector */}
            {activeTab === 'manual' && (
              <div className="space-y-3.5">
                {/* Token / Short Code Input */}
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-300 flex items-center justify-between">
                    <span>QR Security Code</span>
                    {session?.currentToken && (
                      <span className="font-mono text-violet-400 text-[10px]">
                        Current: {session.currentToken}
                      </span>
                    )}
                  </label>
                  <input
                    type="text"
                    value={tokenInput}
                    onChange={(e) => setTokenInput(e.target.value.toUpperCase())}
                    placeholder="Enter 6-char token (e.g. 9K2L-4A)"
                    className="w-full bg-[#141A2E] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm font-mono text-white placeholder-slate-500 focus:outline-none focus:border-violet-500"
                  />
                </div>

                {/* Student Picker with Instant Search */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-slate-300 flex items-center justify-between">
                    <span>Select Your Student Record ({enrolledStudents.length} Enrolled)</span>
                  </label>

                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={searchStudentQuery}
                      onChange={(e) => setSearchStudentQuery(e.target.value)}
                      placeholder="Search your name or roll number..."
                      className="w-full bg-[#141A2E] border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-violet-500"
                    />
                  </div>

                  <div className="overflow-y-auto max-h-[170px] divide-y divide-white/5 border border-white/8 rounded-xl bg-[#090D1A] p-1">
                    {filteredStudents.length === 0 ? (
                      <p className="text-center py-4 text-xs text-slate-500">
                        No student found matching query.
                      </p>
                    ) : (
                      filteredStudents.map((std) => {
                        const isSelected = selectedStudent?.id === std.id;
                        return (
                          <div
                            key={std.id}
                            onClick={() => setSelectedStudent(std)}
                            className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${
                              isSelected
                                ? 'bg-violet-600/30 border border-violet-500/40'
                                : 'hover:bg-white/5'
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <img
                                src={std.avatarUrl}
                                alt={std.name}
                                className="w-7 h-7 rounded-full object-cover ring-1 ring-white/10 shrink-0"
                              />
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-white truncate">{std.name}</p>
                                <p className="text-[10px] text-slate-400 font-mono">
                                  Roll: {std.rollNo}
                                </p>
                              </div>
                            </div>

                            {isSelected && (
                              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="button"
                  onClick={handleMarkAttendance}
                  disabled={isVerifying || !selectedStudent}
                  className={`w-full py-3 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-violet-600/30 transition-all cursor-pointer flex items-center justify-center gap-2 ${
                    isVerifying ? 'opacity-70 cursor-wait' : ''
                  }`}
                >
                  {isVerifying ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Verifying & Recording Attendance...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Confirm & Record Attendance</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
