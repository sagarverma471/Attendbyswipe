import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import QRCode from 'qrcode';
import confetti from 'canvas-confetti';
import {
  X,
  RefreshCw,
  Maximize2,
  Minimize2,
  Copy,
  Check,
  Pause,
  Play,
  Users,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Sparkles,
  QrCode,
  Volume2,
  VolumeX,
  ExternalLink,
  Save,
  AlertTriangle,
  FileText,
  Edit2,
  Search,
  CheckCircle,
  XCircle,
  ListFilter,
  ArrowLeft,
  Camera,
  Smartphone,
  UserCheck,
  Plus,
  User,
} from 'lucide-react';
import { Classroom, Student, Subject, QRAttendanceSession, AttendanceSession, QRSubmissionRecord } from '../../types/attendance';
import { SwipeAttendLogo } from '../common/SwipeAttendLogo';
import { CameraQRScanner, DecodedQRData } from './CameraQRScanner';
import {
  createQRAttendanceSession,
  rotateSessionToken,
  setSessionStatus,
  subscribeToQRSession,
  finalizeQRSession,
  getActiveQRSession,
  buildStudentScanAttendanceUrl,
  editSubmissionRecord,
  markStudentByTeacherKiosk,
  normalizeRollNumber,
} from '../../services/qrAttendanceService';

interface ClassroomQRGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  classroom: Classroom;
  subject?: Subject;
  teacherName?: string;
  enrolledStudents: Student[];
  onFinalizeAttendance: (session: AttendanceSession) => void;
  onOpenStudentScanView?: (session: QRAttendanceSession) => void;
}

export const ClassroomQRGeneratorModal: React.FC<ClassroomQRGeneratorModalProps> = ({
  isOpen,
  onClose,
  classroom,
  subject,
  teacherName = 'Prof. Teacher',
  enrolledStudents = [],
  onFinalizeAttendance,
  onOpenStudentScanView,
}) => {
  const [session, setSession] = useState<QRAttendanceSession | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(25);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [copiedToken, setCopiedToken] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [isFinalizing, setIsFinalizing] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'qr' | 'kiosk' | 'summary'>('qr');
  const [rightColumnTab, setRightColumnTab] = useState<'feed' | 'quickMark'>('feed');
  const [kioskStatusMsg, setKioskStatusMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [quickRollInput, setQuickRollInput] = useState<string>('');

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const modalContainerRef = useRef<HTMLDivElement | null>(null);

  // Play audio chime when attendance is scanned
  const playScanChime = useCallback(() => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.15); // A5
      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.25);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.25);
    } catch {}
  }, [soundEnabled]);

  const playScanChimeRef = useRef(playScanChime);
  playScanChimeRef.current = playScanChime;

  const sessionRef = useRef<QRAttendanceSession | null>(session);
  sessionRef.current = session;

  // Initialize or resume QR session
  useEffect(() => {
    if (!isOpen) return;

    let unsubscribe: (() => void) | null = null;
    let isMounted = true;

    async function initSession() {
      setIsLoading(true);
      try {
        let current = await getActiveQRSession(classroom.id);
        if (!current) {
          current = await createQRAttendanceSession(classroom, subject, teacherName, 25);
        }

        if (isMounted) {
          setSession(current);
          setIsLoading(false);

          unsubscribe = subscribeToQRSession(current.id, classroom.id, (updated) => {
            if ((updated?.totalScanned ?? 0) > (sessionRef.current?.totalScanned ?? 0)) {
              playScanChimeRef.current();
            }
            setSession(updated);
          });
        }
      } catch (e) {
        console.error('Failed to initialize QR session', e);
        if (isMounted) setIsLoading(false);
      }
    }

    initSession();

    return () => {
      isMounted = false;
      if (unsubscribe) unsubscribe();
    };
  }, [isOpen, classroom.id, subject?.id, teacherName]);

  const isRotatingRef = useRef(false);

  // Live Token Countdown and Auto-Rotation Timer
  useEffect(() => {
    if (!session || session.status !== 'active') return;

    const interval = setInterval(() => {
      const expiry = new Date(session.tokenExpiresAt).getTime();
      const diff = Math.max(0, Math.ceil((expiry - Date.now()) / 1000));
      setSecondsRemaining(diff);

      if (diff <= 0 && !isRotatingRef.current) {
        isRotatingRef.current = true;
        // Rotate token
        rotateSessionToken(session)
          .then((rotated) => {
            setSession(rotated);
            setSecondsRemaining(rotated.rotationIntervalSeconds);
          })
          .catch((err) => {
            console.warn('Token rotation error:', err);
          })
          .finally(() => {
            isRotatingRef.current = false;
          });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [session?.id, session?.status, session?.currentToken, session?.tokenExpiresAt]);

  // Construct Student Scan URL (Points to public Shared App URL without 403 Google Auth restriction)
  const studentScanUrl = useMemo(() => {
    if (!session) return '';
    return buildStudentScanAttendanceUrl({
      sessionId: session.id,
      classroomId: session.classroomId,
      classroomName: classroom.name,
      subjectName: subject?.name || 'Lecture Attendance',
      department: classroom.department,
      section: classroom.section,
      teacherName: teacherName,
      token: session.currentToken,
    });
  }, [session, classroom.name, classroom.department, classroom.section, subject?.name, teacherName]);

  // Draw QR code onto canvas whenever token or URL updates
  useEffect(() => {
    if (!canvasRef.current || !studentScanUrl || !session || activeTab !== 'qr') return;

    QRCode.toCanvas(
      canvasRef.current,
      studentScanUrl,
      {
        width: isFullscreen ? 360 : 260,
        margin: 2,
        color: {
          dark: '#FFFFFF',
          light: '#0D111E',
        },
        errorCorrectionLevel: 'M',
      },
      (err) => {
        if (err) console.error('Failed to render QR Code', err);
      }
    );
  }, [studentScanUrl, isFullscreen, session?.currentToken, activeTab]);

  // Manual token rotation
  const handleManualRotate = async () => {
    if (!session) return;
    setIsLoading(true);
    try {
      const updated = await rotateSessionToken(session);
      setSession(updated);
      setSecondsRemaining(updated.rotationIntervalSeconds);
    } finally {
      setIsLoading(false);
    }
  };

  // Toggle Pause / Resume
  const handleToggleStatus = async () => {
    if (!session) return;
    const nextStatus = session.status === 'active' ? 'paused' : 'active';
    const updated = await setSessionStatus(session, nextStatus);
    setSession(updated);
  };

  // Copy public scan link
  const handleCopyLink = () => {
    if (!studentScanUrl) return;
    navigator.clipboard.writeText(studentScanUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Copy current token
  const handleCopyToken = () => {
    if (!session) return;
    navigator.clipboard.writeText(session.currentToken);
    setCopiedToken(true);
    setTimeout(() => setCopiedToken(false), 2000);
  };

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!modalContainerRef.current) return;
    if (!document.fullscreenElement) {
      modalContainerRef.current.requestFullscreen?.().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Teacher edit submission record status (present <-> absent)
  const handleToggleStudentStatus = async (studentId: string, currentStatus: string) => {
    if (!session) return;
    const newStatus = currentStatus === 'present' ? 'absent' : 'present';
    const updated = await editSubmissionRecord(session, studentId, {
      status: newStatus as any,
      verificationStatus: newStatus === 'present' ? 'manual_present' : 'manual_absent',
      teacherNotes: `Status changed to ${newStatus} by teacher review`,
    });
    setSession(updated);
  };

  // Kiosk camera barcode/QR scanner handler (when student shows ID card/phone to teacher camera)
  const handleKioskCameraScan = async (data: DecodedQRData) => {
    if (!session) return;
    setKioskStatusMsg(null);

    // Try matching student from roster
    let matched = enrolledStudents.find((s) => {
      if (data.rollNo && normalizeRollNumber(s.rollNo) === normalizeRollNumber(data.rollNo)) return true;
      if (data.studentId && s.studentId.toUpperCase() === data.studentId.toUpperCase()) return true;
      if (data.studentName && s.name.toLowerCase() === data.studentName.toLowerCase()) return true;
      return false;
    });

    if (!matched && data.rawText) {
      const clean = normalizeRollNumber(data.rawText);
      matched = enrolledStudents.find(
        (s) => normalizeRollNumber(s.rollNo) === clean || s.studentId.toUpperCase() === clean
      );
    }

    if (!matched) {
      setKioskStatusMsg({
        text: `QR / Card scanned (${data.rollNo || data.rawText?.slice(0, 16)}), but student not found in this classroom roster.`,
        type: 'error',
      });
      return;
    }

    // Check if student already submitted
    const isAlreadyMarked = Object.values(session.submissions || {}).some(
      (sub) => sub.studentId === matched!.id || sub.normalizedRollNo === normalizeRollNumber(matched!.rollNo)
    );

    if (isAlreadyMarked) {
      setKioskStatusMsg({
        text: `Roll #${matched.rollNo} (${matched.name}) is already marked present!`,
        type: 'error',
      });
      return;
    }

    try {
      const res = await markStudentByTeacherKiosk(session, matched, enrolledStudents);
      if (res.success) {
        playScanChimeRef.current();
        setKioskStatusMsg({
          text: `✓ Checked in Roll #${matched.rollNo} (${matched.name})`,
          type: 'success',
        });
      } else {
        setKioskStatusMsg({
          text: res.message || 'Failed to check in student',
          type: 'error',
        });
      }
    } catch (e: any) {
      setKioskStatusMsg({
        text: e.message || 'Error checking in student',
        type: 'error',
      });
    }
  };

  // Quick roll number text entry check-in
  const handleQuickRollCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickRollInput.trim() || !session) return;
    const clean = normalizeRollNumber(quickRollInput);
    const matched = enrolledStudents.find(
      (s) =>
        normalizeRollNumber(s.rollNo) === clean ||
        s.rollNo.toUpperCase().endsWith(clean) ||
        s.studentId.toUpperCase() === clean
    );
    if (!matched) {
      setKioskStatusMsg({ text: `Student with roll "${quickRollInput}" not found in roster.`, type: 'error' });
      return;
    }
    const res = await markStudentByTeacherKiosk(session, matched, enrolledStudents);
    if (res.success) {
      playScanChimeRef.current();
      setKioskStatusMsg({ text: `✓ Checked in Roll #${matched.rollNo} (${matched.name})`, type: 'success' });
      setQuickRollInput('');
    } else {
      setKioskStatusMsg({ text: res.message || 'Check-in failed', type: 'error' });
    }
  };

  // 1-Tap check-in from roster list
  const handleOneTapCheckIn = async (student: Student) => {
    if (!session) return;
    const res = await markStudentByTeacherKiosk(session, student, enrolledStudents);
    if (res.success) {
      playScanChimeRef.current();
    }
  };

  // Finalize attendance and save to session history
  const handleFinalize = async () => {
    if (!session) return;
    setIsFinalizing(true);
    try {
      const finalSession = await finalizeQRSession(
        session,
        enrolledStudents,
        `Classroom QR Attendance: ${session.totalScanned || 0} present of ${enrolledStudents.length}`
      );
      confetti({
        particleCount: 100,
        spread: 80,
        origin: { y: 0.6 },
      });
      onFinalizeAttendance(finalSession);
      onClose();
    } catch (err) {
      console.error('Failed to finalize session', err);
    } finally {
      setIsFinalizing(false);
    }
  };

  if (!isOpen) return null;

  const scannedMap = session?.submissions || session?.scannedStudents || {};
  const scannedList = Object.values(scannedMap) as QRSubmissionRecord[];
  const enrolledList = enrolledStudents || [];
  const attendanceRate =
    enrolledList.length > 0
      ? Math.round((scannedList.length / enrolledList.length) * 100)
      : 0;

  const remainingCount = Math.max(0, enrolledList.length - scannedList.length);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-fade-in overflow-y-auto font-['Plus_Jakarta_Sans']">
      <div
        ref={modalContainerRef}
        className={`relative w-full ${
          isFullscreen ? 'max-w-none h-screen rounded-none p-6 sm:p-8' : 'max-w-4xl max-h-[92vh] rounded-3xl p-5 sm:p-7'
        } bg-[#0A0E1A] border border-white/10 shadow-2xl flex flex-col overflow-hidden text-slate-100 transition-all duration-300`}
      >
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-white/8 shrink-0">
          <div className="flex items-center gap-3">
            <SwipeAttendLogo size={40} />
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  {classroom.name}
                </h2>
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                    session?.status === 'active'
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      session?.status === 'active'
                        ? 'bg-emerald-400 animate-pulse'
                        : 'bg-amber-400'
                    }`}
                  />
                  {session?.status === 'active' ? 'LIVE SESSION' : 'PAUSED'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {subject?.name || classroom.department} • {teacherName} • {session?.date}
              </p>
            </div>
          </div>

          {/* Right Header Navigation Tabs & Controls */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* View Switcher Tabs */}
            <div className="flex items-center bg-[#141A2E] p-1 rounded-xl border border-white/10 text-xs">
              <button
                onClick={() => setActiveTab('qr')}
                className={`px-2.5 sm:px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'qr'
                    ? 'bg-violet-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>QR Display</span>
              </button>

              <button
                onClick={() => setActiveTab('kiosk')}
                className={`px-2.5 sm:px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'kiosk'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Scan Cards (Kiosk)</span>
              </button>

              <button
                onClick={() => setActiveTab('summary')}
                className={`px-2.5 sm:px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'summary'
                    ? 'bg-cyan-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Summary ({scannedList.length})</span>
              </button>
            </div>

            {/* Test Student Scan Trigger */}
            {onOpenStudentScanView && session && (
              <button
                onClick={() => onOpenStudentScanView(session)}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-600/20 hover:bg-violet-600/35 border border-violet-500/35 text-violet-200 hover:text-white text-xs font-bold transition-all cursor-pointer shadow-xs"
                title="Open Student Scanner to simulate or test student attendance"
              >
                <Smartphone className="w-3.5 h-3.5 text-violet-400" />
                <span>Test Student Scan</span>
              </button>
            )}

            {/* Audio Toggle */}
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              title={soundEnabled ? 'Mute scan sound' : 'Enable scan sound'}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-violet-400" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {/* Fullscreen Button */}
            <button
              onClick={toggleFullscreen}
              title={isFullscreen ? 'Exit Fullscreen' : 'Projector Fullscreen Mode'}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Body: Either QR Live Screen or Summary Review Screen */}
        {activeTab === 'qr' ? (
          <div className="flex-1 overflow-y-auto py-5 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: QR Code & Security Controls (7 cols) */}
            <div className="lg:col-span-7 flex flex-col items-center text-center space-y-4">
              {/* Anti-Proxy Security Shield Banner */}
              <div className="w-full flex items-center justify-between px-3.5 py-2 rounded-xl bg-violet-950/30 border border-violet-500/20 text-xs text-violet-200">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-violet-400 shrink-0" />
                  <span className="font-medium">Rotating Temporary Token Protection</span>
                </div>
                <span className="text-[11px] text-violet-400 font-mono">
                  Rotates every {session?.rotationIntervalSeconds || 25}s
                </span>
              </div>

              {/* QR Code Canvas Box */}
              <div className="relative p-5 rounded-3xl bg-[#0D111E] border-2 border-violet-500/30 shadow-[0_0_35px_rgba(139,92,246,0.15)] flex flex-col items-center">
                {isLoading && (
                  <div className="absolute inset-0 bg-[#0D111E]/90 backdrop-blur-xs rounded-3xl flex items-center justify-center z-10">
                    <RefreshCw className="w-8 h-8 text-violet-400 animate-spin" />
                  </div>
                )}

                <canvas
                  ref={canvasRef}
                  className="rounded-2xl shadow-inner border border-white/5"
                />

                {/* Status overlay if paused */}
                {session?.status === 'paused' && (
                  <div className="absolute inset-0 bg-black/75 backdrop-blur-xs rounded-3xl flex flex-col items-center justify-center text-amber-300 p-4">
                    <Pause className="w-10 h-10 mb-2" />
                    <p className="font-bold text-sm">Attendance Paused</p>
                    <p className="text-xs text-amber-300/80 mt-1">
                      Student scans will be rejected until resumed
                    </p>
                  </div>
                )}

                {/* Token Info & Countdown Bar */}
                <div className="w-full mt-4 space-y-2.5">
                  <div className="flex items-center justify-between text-xs px-1">
                    <div className="flex items-center gap-1.5 text-slate-300">
                      <Clock className="w-3.5 h-3.5 text-violet-400" />
                      <span>Token Code:</span>
                      <span className="font-mono font-bold text-violet-300 tracking-wider">
                        {session?.currentToken || '------'}
                      </span>
                      <button
                        onClick={handleCopyToken}
                        className="p-1 text-slate-400 hover:text-white transition-colors"
                        title="Copy Token"
                      >
                        {copiedToken ? (
                          <Check className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    </div>

                    <span
                      className={`font-mono text-xs font-semibold ${
                        secondsRemaining <= 5 ? 'text-rose-400 animate-pulse' : 'text-slate-400'
                      }`}
                    >
                      Rotates in {secondsRemaining}s
                    </span>
                  </div>

                  {/* Animated Progress Bar */}
                  <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-1000 ${
                        secondsRemaining <= 5
                          ? 'bg-rose-500'
                          : secondsRemaining <= 10
                          ? 'bg-amber-400'
                          : 'bg-violet-500'
                      }`}
                      style={{
                        width: `${((secondsRemaining) / (session?.rotationIntervalSeconds || 25)) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Public URL Notice (Explicitly informing teacher that students won't get Google 403) */}
              <div className="w-full flex items-center justify-between px-3.5 py-2 rounded-xl bg-emerald-950/30 border border-emerald-500/25 text-xs text-emerald-200">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="font-semibold text-emerald-300">Public Link (No Google Login Required)</span>
                </div>
                <a
                  href={studentScanUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-mono text-[11px] text-cyan-300 hover:text-cyan-200 underline"
                  title="Test scan link in new browser tab"
                >
                  <span>Test Link</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              {/* Quick Actions Row */}
              <div className="w-full flex flex-wrap items-center justify-center gap-2 pt-1">
                {onOpenStudentScanView && session && (
                  <button
                    onClick={() => onOpenStudentScanView(session)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-violet-600/25 hover:bg-violet-600/40 text-violet-200 hover:text-white text-xs font-bold border border-violet-500/40 transition-all cursor-pointer shadow-sm"
                    title="Open Student Scanner to simulate or test student attendance"
                  >
                    <Smartphone className="w-3.5 h-3.5 text-violet-400" />
                    <span>📱 Open Student Scanner</span>
                  </button>
                )}

                <button
                  onClick={() => setActiveTab('kiosk')}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 hover:text-white text-xs font-semibold border border-emerald-500/30 transition-colors cursor-pointer"
                  title="Switch to Kiosk Camera to scan student ID cards"
                >
                  <Camera className="w-3.5 h-3.5 text-emerald-400" />
                  <span>📷 Scan Cards (Kiosk)</span>
                </button>

                <button
                  onClick={handleManualRotate}
                  disabled={isLoading}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-xs font-semibold border border-white/10 transition-colors cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                  Rotate Token
                </button>

                <button
                  onClick={handleToggleStatus}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
                    session?.status === 'active'
                      ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border-amber-500/30'
                      : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                  }`}
                >
                  {session?.status === 'active' ? (
                    <>
                      <Pause className="w-3.5 h-3.5" />
                      Pause
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5" />
                      Resume
                    </>
                  )}
                </button>

                <button
                  onClick={handleCopyLink}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-xs font-semibold border border-white/10 transition-colors cursor-pointer"
                >
                  {copiedLink ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      Copy Link
                    </>
                  )}
                </button>

                <button
                  onClick={() => setActiveTab('summary')}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 hover:text-white text-xs font-semibold border border-cyan-500/30 transition-colors cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5" />
                  View Summary
                </button>
              </div>

              <p className="text-[11px] text-slate-400 max-w-sm">
                Students scan the projected QR code directly with their phone camera to open the attendance form.
              </p>
            </div>

            {/* Right Column: Live Attendees Roster & Status (5 cols) */}
            <div className="lg:col-span-5 flex flex-col space-y-4 h-full">
              {/* Attendance Progress Metrics */}
              <div className="p-4 rounded-2xl bg-[#101526] border border-white/8 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-violet-400" />
                    <span className="text-xs font-semibold text-slate-300">Live Submission Progress</span>
                  </div>
                  <span className="text-xs font-mono font-bold text-emerald-400">
                    {scannedList.length} / {enrolledStudents.length} ({attendanceRate}%)
                  </span>
                </div>

                {/* Attendance percentage bar */}
                <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-linear-to-r from-violet-500 to-emerald-400 transition-all duration-500"
                    style={{ width: `${attendanceRate}%` }}
                  />
                </div>

                <div className="grid grid-cols-3 gap-2 text-center text-xs pt-1">
                  <div className="p-2 rounded-xl bg-white/5 border border-white/5">
                    <p className="text-white font-bold text-base font-mono">{enrolledStudents.length}</p>
                    <p className="text-[9px] text-slate-400 uppercase font-semibold">Total Enrolled</p>
                  </div>
                  <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                    <p className="text-emerald-400 font-bold text-base font-mono">{scannedList.length}</p>
                    <p className="text-[9px] text-emerald-300/80 uppercase font-semibold">Submitted</p>
                  </div>
                  <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20">
                    <p className="text-amber-400 font-bold text-base font-mono">{remainingCount}</p>
                    <p className="text-[9px] text-amber-300 uppercase font-semibold">Remaining</p>
                  </div>
                </div>
              </div>

              {/* Live Student Feed & 1-Tap Check-In Tabs */}
              <div className="flex-1 min-h-[240px] max-h-[320px] p-3 rounded-2xl bg-[#101526] border border-white/8 flex flex-col">
                <div className="flex items-center justify-between pb-2 border-b border-white/5 mb-2">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setRightColumnTab('feed')}
                      className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                        rightColumnTab === 'feed'
                          ? 'bg-violet-600/30 text-violet-200 border border-violet-500/30'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Sparkles className="w-3.5 h-3.5 text-violet-400" />
                      <span>Live Feed ({scannedList.length})</span>
                    </button>

                    <button
                      onClick={() => setRightColumnTab('quickMark')}
                      className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                        rightColumnTab === 'quickMark'
                          ? 'bg-emerald-600/30 text-emerald-200 border border-emerald-500/30'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                      <span>1-Tap Check-In ({remainingCount})</span>
                    </button>
                  </div>

                  <span className="text-[10px] text-slate-400 font-mono">
                    {rightColumnTab === 'feed' ? `${scannedList.length} recorded` : `${remainingCount} remaining`}
                  </span>
                </div>

                {/* Submissions Stream */}
                {rightColumnTab === 'feed' ? (
                  <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
                    {scannedList.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center p-6 text-center text-slate-400 text-xs">
                        <QrCode className="w-8 h-8 text-slate-600 mb-2 animate-pulse" />
                        <p className="font-semibold text-slate-300">Waiting for first scan...</p>
                        <p className="text-[11px] text-slate-400 mt-1">
                          Point phone camera at the screen to submit, or use 1-Tap Check-In.
                        </p>
                      </div>
                    ) : (
                      scannedList
                        .slice()
                        .reverse()
                        .map((item) => (
                          <div
                            key={item.studentId || item.id}
                            className="flex items-center justify-between p-2 rounded-xl bg-white/3 border border-white/5 hover:border-emerald-500/30 transition-colors animate-fade-in"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                                <CheckCircle2 className="w-4 h-4" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-semibold text-slate-200 truncate">
                                  {item.fullName || (item as any).studentName}
                                </p>
                                <p className="text-[10px] text-slate-400 font-mono">
                                  Roll #{item.rollNo} • {item.department} {item.section ? `• Sec: ${item.section}` : ''}
                                </p>
                              </div>
                            </div>

                            <span className="text-[10px] text-slate-400 font-mono shrink-0 ml-2">
                              {item.submittedAt || (item as any).scannedAt}
                            </span>
                          </div>
                        ))
                    )}
                  </div>
                ) : (
                  /* 1-Tap Roster Check-In */
                  <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
                    {enrolledStudents
                      .filter(
                        (std) =>
                          !scannedMap[std.id] &&
                          !Object.values(scannedMap).some(
                            (rec: any) => rec.normalizedRollNo === normalizeRollNumber(std.rollNo)
                          )
                      )
                      .map((std) => (
                        <div
                          key={std.id}
                          className="flex items-center justify-between p-2 rounded-xl bg-white/3 border border-white/5 hover:border-violet-500/30 transition-colors"
                        >
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-slate-200 truncate">{std.name}</p>
                            <p className="text-[10px] text-slate-400 font-mono">Roll #{std.rollNo}</p>
                          </div>
                          <button
                            onClick={() => handleOneTapCheckIn(std)}
                            className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-[11px] font-bold border border-emerald-500/30 flex items-center gap-1 cursor-pointer transition-all active:scale-95 shrink-0 ml-2"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Check In</span>
                          </button>
                        </div>
                      ))}
                  </div>
                )}
              </div>

              {/* Action Buttons Row */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  onClick={() => setActiveTab('summary')}
                  className="py-3 px-3 rounded-xl bg-[#141A2E] hover:bg-[#1A223B] text-slate-200 text-xs font-semibold border border-white/10 transition-colors cursor-pointer text-center"
                >
                  View Summary
                </button>

                <button
                  onClick={handleFinalize}
                  disabled={isFinalizing}
                  className="flex items-center justify-center gap-1.5 py-3 px-3 rounded-xl bg-linear-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-violet-600/25 transition-all cursor-pointer disabled:opacity-50 text-center"
                >
                  {isFinalizing ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  Final Submit ({scannedList.length})
                </button>
              </div>
            </div>
          </div>
        ) : activeTab === 'kiosk' ? (
          /* KIOSK SCANNER TAB: Teacher Uses Device Camera to Scan Student ID Badges / QR Codes */
          <div className="flex-1 overflow-y-auto py-5 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left: Camera Viewfinder & Manual Roll Entry */}
            <div className="lg:col-span-7 flex flex-col items-center text-center space-y-4">
              <div className="w-full flex items-center justify-between px-3.5 py-2 rounded-xl bg-emerald-950/30 border border-emerald-500/25 text-xs text-emerald-200">
                <div className="flex items-center gap-2">
                  <Camera className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="font-semibold">Kiosk Mode: Point Camera at Student ID Card or QR Code</span>
                </div>
                <span className="text-[11px] font-mono text-emerald-400">Live Camera</span>
              </div>

              {kioskStatusMsg && (
                <div
                  className={`w-full p-3 rounded-2xl border text-xs flex items-center justify-between animate-fade-in ${
                    kioskStatusMsg.type === 'success'
                      ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                      : 'bg-rose-500/15 border-rose-500/30 text-rose-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {kioskStatusMsg.type === 'success' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                    )}
                    <span className="font-medium">{kioskStatusMsg.text}</span>
                  </div>
                  <button
                    onClick={() => setKioskStatusMsg(null)}
                    className="p-1 text-slate-400 hover:text-white cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Camera Scanner Viewfinder */}
              <div className="w-full max-w-md">
                <CameraQRScanner
                  isScanning={activeTab === 'kiosk'}
                  onScanSuccess={handleKioskCameraScan}
                  className="rounded-3xl border-2 border-emerald-500/30 shadow-[0_0_35px_rgba(16,185,129,0.15)]"
                />
              </div>

              {/* Quick Roll Number Text Input Fallback */}
              <div className="w-full max-w-md p-3.5 rounded-2xl bg-[#101526] border border-white/8 space-y-2">
                <p className="text-xs text-slate-300 font-semibold text-left flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Fast Roll Number Check-In</span>
                </p>
                <form onSubmit={handleQuickRollCheckIn} className="flex gap-2">
                  <input
                    type="text"
                    value={quickRollInput}
                    onChange={(e) => setQuickRollInput(e.target.value)}
                    placeholder="Enter Roll No (e.g. 26CSE001) or ST1001..."
                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/30 transition-all cursor-pointer"
                  >
                    Mark Present
                  </button>
                </form>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={() => setActiveTab('qr')}
                  className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-xs font-semibold border border-white/10 transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to QR Display</span>
                </button>
              </div>
            </div>

            {/* Right: Attendance Progress & Feed */}
            <div className="lg:col-span-5 flex flex-col space-y-4 h-full">
              <div className="p-4 rounded-2xl bg-[#101526] border border-white/8 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-semibold text-slate-300">Live Progress</span>
                  </div>
                  <span className="text-xs font-mono font-bold text-emerald-400">
                    {scannedList.length} / {enrolledStudents.length} ({attendanceRate}%)
                  </span>
                </div>

                <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-linear-to-r from-emerald-500 to-cyan-400 transition-all duration-500"
                    style={{ width: `${attendanceRate}%` }}
                  />
                </div>

                <div className="grid grid-cols-3 gap-2 text-center text-xs pt-1">
                  <div className="p-2 rounded-xl bg-white/5 border border-white/5">
                    <p className="text-white font-bold text-base font-mono">{enrolledStudents.length}</p>
                    <p className="text-[9px] text-slate-400 uppercase font-semibold">Total</p>
                  </div>
                  <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                    <p className="text-emerald-400 font-bold text-base font-mono">{scannedList.length}</p>
                    <p className="text-[9px] text-emerald-300/80 uppercase font-semibold">Present</p>
                  </div>
                  <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20">
                    <p className="text-amber-400 font-bold text-base font-mono">{remainingCount}</p>
                    <p className="text-[9px] text-amber-300 uppercase font-semibold">Absent</p>
                  </div>
                </div>
              </div>

              {/* Roster & Check-ins Feed */}
              <div className="flex-1 min-h-[260px] max-h-[350px] p-3 rounded-2xl bg-[#101526] border border-white/8 flex flex-col">
                <div className="flex items-center justify-between pb-2 border-b border-white/5 mb-2">
                  <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                    Checked-In Feed
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {scannedList.length} recorded
                  </span>
                </div>

                <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
                  {scannedList.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center p-6 text-center text-slate-400 text-xs">
                      <Camera className="w-8 h-8 text-slate-600 mb-2 animate-pulse" />
                      <p className="font-semibold text-slate-300">Ready to scan student cards</p>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Hold student ID card or QR pass in front of camera.
                      </p>
                    </div>
                  ) : (
                    scannedList
                      .slice()
                      .reverse()
                      .map((item) => (
                        <div
                          key={item.studentId || item.id}
                          className="flex items-center justify-between p-2 rounded-xl bg-white/3 border border-white/5 hover:border-emerald-500/30 transition-colors animate-fade-in"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                              <CheckCircle2 className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-slate-200 truncate">
                                {item.fullName || (item as any).studentName}
                              </p>
                              <p className="text-[10px] text-slate-400 font-mono">
                                Roll #{item.rollNo} • {item.department}
                              </p>
                            </div>
                          </div>

                          <span className="text-[10px] text-emerald-400 font-mono shrink-0 ml-2">
                            {item.submittedAt || (item as any).scannedAt}
                          </span>
                        </div>
                      ))
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  onClick={() => setActiveTab('summary')}
                  className="py-3 px-3 rounded-xl bg-[#141A2E] hover:bg-[#1A223B] text-slate-200 text-xs font-semibold border border-white/10 transition-colors cursor-pointer text-center"
                >
                  View Summary
                </button>

                <button
                  onClick={handleFinalize}
                  disabled={isFinalizing}
                  className="flex items-center justify-center gap-1.5 py-3 px-3 rounded-xl bg-linear-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/25 transition-all cursor-pointer disabled:opacity-50 text-center"
                >
                  {isFinalizing ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  Final Submit ({scannedList.length})
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* SUMMARY & REVIEW SCREEN (Step 4 & 5) */
          <div className="flex-1 overflow-y-auto py-5 space-y-5">
            {/* Summary Metrics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#101526] p-4 rounded-2xl border border-white/8">
              <div className="p-3 rounded-xl bg-white/4 border border-white/5 text-center">
                <p className="text-xs text-slate-400 uppercase font-semibold">Total Enrolled</p>
                <p className="text-xl font-bold text-white font-mono mt-1">{enrolledStudents.length}</p>
              </div>

              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center">
                <p className="text-xs text-emerald-400 uppercase font-semibold">Submitted / Scanned</p>
                <p className="text-xl font-bold text-emerald-400 font-mono mt-1">{scannedList.length}</p>
              </div>

              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-center">
                <p className="text-xs text-amber-400 uppercase font-semibold">Remaining (Absent)</p>
                <p className="text-xl font-bold text-amber-400 font-mono mt-1">{remainingCount}</p>
              </div>

              <div className="p-3 rounded-xl bg-violet-500/10 border border-violet-500/20 text-center">
                <p className="text-xs text-violet-300 uppercase font-semibold">Attendance Rate</p>
                <p className="text-xl font-bold text-violet-300 font-mono mt-1">{attendanceRate}%</p>
              </div>
            </div>

            {/* Instruction Notice */}
            <div className="p-3.5 rounded-2xl bg-[#141A2E] border border-white/8 flex items-center justify-between text-xs text-slate-300">
              <div className="flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-violet-400 shrink-0" />
                <span>
                  Review submitted records below. Tap status to correct, or mark an absent student present before confirming final attendance.
                </span>
              </div>

              <button
                onClick={() => setActiveTab('qr')}
                className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold flex items-center gap-1 shrink-0 ml-2"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to QR</span>
              </button>
            </div>

            {/* Submissions Review Table */}
            <div className="rounded-2xl border border-white/8 overflow-hidden bg-[#101526]">
              <div className="p-3 bg-[#141A2E] border-b border-white/8 flex items-center justify-between">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  Submitted Student Records ({scannedList.length})
                </h3>
              </div>

              {scannedList.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  <p>No student submissions received yet.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300 min-w-[600px]">
                    <thead className="bg-[#141A2E]/60 text-slate-400 font-semibold border-b border-white/8">
                      <tr>
                        <th className="py-2.5 px-3 font-mono">Roll No.</th>
                        <th className="py-2.5 px-3">Student Name</th>
                        <th className="py-2.5 px-3">Department / Branch</th>
                        <th className="py-2.5 px-3">Section</th>
                        <th className="py-2.5 px-3">Time</th>
                        <th className="py-2.5 px-3">Verification</th>
                        <th className="py-2.5 px-3 text-center">Status</th>
                        <th className="py-2.5 px-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {scannedList.map((sub) => {
                        const isPresent = sub.status === 'present';
                        const isUnmatched =
                          sub.verificationStatus === 'unmatched_roll' ||
                          sub.verificationStatus === 'unmatched_name';
                        const isDuplicate = sub.isDuplicate || sub.verificationStatus === 'duplicate';

                        return (
                          <tr key={sub.studentId || sub.id} className="hover:bg-white/5 transition-colors">
                            <td className="py-2.5 px-3 font-mono font-bold text-violet-300">
                              {sub.rollNo}
                            </td>
                            <td className="py-2.5 px-3 font-semibold text-white">
                              {sub.fullName || (sub as any).studentName}
                            </td>
                            <td className="py-2.5 px-3 text-slate-400">
                              {sub.department || 'B.Tech'}
                            </td>
                            <td className="py-2.5 px-3 text-slate-400 font-mono">
                              {sub.section || classroom.section || '-'}
                            </td>
                            <td className="py-2.5 px-3 font-mono text-slate-400 text-[11px]">
                              {sub.submittedAt || (sub as any).scannedAt}
                            </td>
                            <td className="py-2.5 px-3">
                              {isDuplicate ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-rose-300 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/25">
                                  Duplicate Attempt
                                </span>
                              ) : isUnmatched ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/25">
                                  Unmatched Detail
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/25">
                                  Verified Match
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <span
                                className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                                  isPresent
                                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                    : 'bg-red-500/20 text-red-400 border border-red-500/30'
                                }`}
                              >
                                {isPresent ? 'Present' : 'Absent'}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              <button
                                onClick={() => handleToggleStudentStatus(sub.studentId, sub.status)}
                                className="text-xs text-cyan-400 hover:text-cyan-300 underline cursor-pointer"
                              >
                                {isPresent ? 'Mark Absent' : 'Mark Present'}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Bottom Finalize Confirmation Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-2xl bg-gradient-to-r from-violet-950/40 via-indigo-950/40 to-[#101526] border border-violet-500/30">
              <div>
                <h4 className="text-sm font-bold text-white">Ready for Final Attendance Submission?</h4>
                <p className="text-xs text-slate-400">
                  Confirmed records will be committed to the database and attendance history.
                </p>
              </div>

              <div className="flex items-center gap-2.5 w-full sm:w-auto">
                <button
                  onClick={() => setActiveTab('qr')}
                  className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold border border-white/10 transition-colors cursor-pointer"
                >
                  Keep QR Active
                </button>

                <button
                  onClick={handleFinalize}
                  disabled={isFinalizing}
                  className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/30 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isFinalizing ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  Confirm Final Attendance
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
