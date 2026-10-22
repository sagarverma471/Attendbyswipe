import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  FileSpreadsheet,
  FileText,
  GraduationCap,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  LogIn,
  Send,
  Users,
  Calendar,
  Sparkles,
  BookOpen,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { Classroom, Subject, AttendanceSession, Student } from '../../types/attendance';
import {
  signInWithGoogle,
  getCachedAccessToken,
  signOutUser,
  auth,
} from '../../services/firebase';
import {
  exportSessionToGoogleSheet,
  exportClassroomSummaryToGoogleSheet,
} from '../../services/workspace/googleSheetsService';
import {
  generateDefaultersNoticeDoc,
  generateSessionReportDoc,
} from '../../services/workspace/googleDocsService';
import {
  fetchGoogleClassroomCourses,
  fetchGoogleClassroomStudents,
  postClassroomAttendanceAnnouncement,
} from '../../services/workspace/googleClassroomService';
import { GoogleClassroomCourse, DefaulterStudentItem } from '../../services/workspace/types';

interface GoogleWorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  classrooms: Classroom[];
  subjects: Subject[];
  sessions: AttendanceSession[];
  students: Student[];
  onImportStudentsFromClassroom?: (newStudents: Student[], classroomId: string) => void;
}

export const GoogleWorkspaceModal: React.FC<GoogleWorkspaceModalProps> = ({
  isOpen,
  onClose,
  classrooms,
  subjects,
  sessions,
  students,
  onImportStudentsFromClassroom,
}) => {
  const [activeTab, setActiveTab] = useState<'sheets' | 'docs' | 'classroom'>('sheets');
  const [accessToken, setAccessToken] = useState<string | null>(() => getCachedAccessToken());
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<{
    type: 'sheets' | 'docs' | 'classroom';
    title: string;
    url: string;
  } | null>(null);

  // Sheets Selection State
  const [selectedSheetSessionId, setSelectedSheetSessionId] = useState<string>(() => sessions[0]?.id || '');
  const [selectedSheetClassId, setSelectedSheetClassId] = useState<string>(() => classrooms[0]?.id || '');
  const [sheetMode, setSheetMode] = useState<'session' | 'classroom'>('session');

  // Docs Selection State
  const [selectedDocClassId, setSelectedDocClassId] = useState<string>(() => classrooms[0]?.id || '');
  const [selectedDocSubId, setSelectedDocSubId] = useState<string>(() => subjects[0]?.id || '');
  const [docThreshold, setDocThreshold] = useState<number>(75);

  // Classroom Selection State
  const [courses, setCourses] = useState<GoogleClassroomCourse[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [isLoadingCourses, setIsLoadingCourses] = useState(false);
  const [announcementText, setAnnouncementText] = useState(
    'Attendance session for today has been recorded on SwipeAttend. Please verify your marks.'
  );

  // Confirmation Modal State (MANDATORY per skill guidelines)
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    targetService: 'Google Sheets' | 'Google Docs' | 'Google Classroom';
    onConfirm: () => Promise<void>;
  } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setAccessToken(getCachedAccessToken());
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  // Load Google Classroom courses when Classroom tab is opened
  useEffect(() => {
    if (activeTab === 'classroom' && accessToken && courses.length === 0) {
      loadCourses(accessToken);
    }
  }, [activeTab, accessToken]);

  const loadCourses = async (token: string) => {
    setIsLoadingCourses(true);
    setErrorMessage(null);
    try {
      const data = await fetchGoogleClassroomCourses(token);
      setCourses(data);
      if (data.length > 0) {
        setSelectedCourseId(data[0].id);
      }
    } catch (err: any) {
      console.warn('Could not load Google Classroom courses:', err);
    } finally {
      setIsLoadingCourses(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsAuthenticating(true);
    setErrorMessage(null);
    try {
      const res = await signInWithGoogle();
      if (res.accessToken) {
        setAccessToken(res.accessToken);
        if (activeTab === 'classroom') {
          loadCourses(res.accessToken);
        }
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Google Sign-in failed');
    } finally {
      setIsAuthenticating(false);
    }
  };

  // Google Sheets Action
  const triggerExportSheet = async () => {
    if (!accessToken) {
      handleGoogleSignIn();
      return;
    }

    if (sheetMode === 'session') {
      const sess = sessions.find((s) => s.id === selectedSheetSessionId) || sessions[0];
      if (!sess) {
        setErrorMessage('Please select an attendance session to export.');
        return;
      }

      setConfirmDialog({
        isOpen: true,
        title: `Create Google Sheet for ${sess.subjectName}?`,
        description: `This will create a new Google Spreadsheet in your Google Drive with attendance records for ${sess.subjectName} (${sess.date}, Period ${sess.period}).`,
        targetService: 'Google Sheets',
        onConfirm: async () => {
          setIsLoading(true);
          setErrorMessage(null);
          try {
            const result = await exportSessionToGoogleSheet(sess, students, accessToken);
            if (result.success && result.url) {
              setSuccessResult({
                type: 'sheets',
                title: result.title || 'Session Attendance Spreadsheet',
                url: result.url,
              });
            } else {
              setErrorMessage(result.error || 'Failed to export to Google Sheets');
            }
          } catch (e: any) {
            setErrorMessage(e.message || 'Error creating Google Sheet');
          } finally {
            setIsLoading(false);
          }
        },
      });
    } else {
      const cls = classrooms.find((c) => c.id === selectedSheetClassId) || classrooms[0];
      if (!cls) {
        setErrorMessage('Please select a classroom.');
        return;
      }

      setConfirmDialog({
        isOpen: true,
        title: `Create Google Sheet for ${cls.name}?`,
        description: `This will create a cumulative attendance roster spreadsheet in your Google Drive for ${cls.name} with attendance percentages across all sessions.`,
        targetService: 'Google Sheets',
        onConfirm: async () => {
          setIsLoading(true);
          setErrorMessage(null);
          try {
            const result = await exportClassroomSummaryToGoogleSheet(
              cls,
              subjects,
              sessions,
              students,
              accessToken
            );
            if (result.success && result.url) {
              setSuccessResult({
                type: 'sheets',
                title: result.title || 'Classroom Cumulative Spreadsheet',
                url: result.url,
              });
            } else {
              setErrorMessage(result.error || 'Failed to export classroom to Google Sheets');
            }
          } catch (e: any) {
            setErrorMessage(e.message || 'Error creating Google Sheet');
          } finally {
            setIsLoading(false);
          }
        },
      });
    }
  };

  // Google Docs Action
  const triggerGenerateDoc = async () => {
    if (!accessToken) {
      handleGoogleSignIn();
      return;
    }

    const cls = classrooms.find((c) => c.id === selectedDocClassId) || classrooms[0];
    const sub = subjects.find((s) => s.id === selectedDocSubId) || subjects[0];
    if (!cls || !sub) {
      setErrorMessage('Please select a classroom and subject.');
      return;
    }

    // Compute defaulters
    const classStudents = students.filter((s) => s.classroomId === cls.id);
    const completedSessions = sessions.filter(
      (s) => (s.classroomId === cls.id || !s.classroomId) && s.status === 'completed'
    );

    const defaulters: DefaulterStudentItem[] = [];
    classStudents.forEach((std) => {
      let attended = 0;
      let held = 0;
      completedSessions.forEach((sess) => {
        const status = sess.records[std.id];
        if (status === 'present') {
          attended++;
          held++;
        } else if (status === 'absent') {
          held++;
        }
      });
      const percentage = held > 0 ? Math.round((attended / held) * 100) : 0;
      if (percentage < docThreshold) {
        defaulters.push({
          id: std.id,
          name: std.name,
          rollNo: std.rollNo,
          studentId: std.studentId,
          percentage,
          attended,
          held,
        });
      }
    });

    setConfirmDialog({
      isOpen: true,
      title: `Generate Official Google Doc Warning Notice?`,
      description: `This will create an official BIT Sindri Attendance Shortage Notice Google Document for ${sub.name} (${cls.name}) identifying ${defaulters.length} student(s) below ${docThreshold}% attendance.`,
      targetService: 'Google Docs',
      onConfirm: async () => {
        setIsLoading(true);
        setErrorMessage(null);
        try {
          const result = await generateDefaultersNoticeDoc(
            cls,
            sub,
            defaulters,
            docThreshold,
            accessToken
          );
          if (result.success && result.url) {
            setSuccessResult({
              type: 'docs',
              title: result.title || 'Official Attendance Notice Doc',
              url: result.url,
            });
          } else {
            setErrorMessage(result.error || 'Failed to generate Google Doc');
          }
        } catch (e: any) {
          setErrorMessage(e.message || 'Error generating Google Doc');
        } finally {
          setIsLoading(false);
        }
      },
    });
  };

  // Google Classroom Action
  const triggerPostClassroomAnnouncement = async () => {
    if (!accessToken) {
      handleGoogleSignIn();
      return;
    }

    if (!selectedCourseId) {
      setErrorMessage('Please select a Google Classroom course.');
      return;
    }

    const course = courses.find((c) => c.id === selectedCourseId);
    const courseName = course?.name || 'Selected Class';

    setConfirmDialog({
      isOpen: true,
      title: `Post Announcement to Google Classroom?`,
      description: `This will publish a new stream announcement to "${courseName}":\n\n"${announcementText}"`,
      targetService: 'Google Classroom',
      onConfirm: async () => {
        setIsLoading(true);
        setErrorMessage(null);
        try {
          const result = await postClassroomAttendanceAnnouncement(
            selectedCourseId,
            announcementText,
            accessToken
          );
          if (result.success) {
            setSuccessResult({
              type: 'classroom',
              title: `Announcement posted to ${courseName}`,
              url: course?.alternateLink || 'https://classroom.google.com',
            });
          } else {
            setErrorMessage(result.error || 'Failed to post announcement');
          }
        } catch (e: any) {
          setErrorMessage(e.message || 'Error posting to Google Classroom');
        } finally {
          setIsLoading(false);
        }
      },
    });
  };

  // Lock background scrolling when modal is active so user stays focused
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-[#0B0F1E] border border-cyan-500/30 rounded-2xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-white/10 bg-[#12182D] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 via-blue-500/20 to-emerald-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
              <Sparkles className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white font-['Plus_Jakarta_Sans'] flex items-center gap-2">
                Google Workspace Integration
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  Live
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Connect Sheets, Docs, and Google Classroom with SwipeAttend
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Auth Status Banner */}
        <div className="px-4 sm:px-6 py-2.5 bg-[#0e1428] border-b border-white/5 flex items-center justify-between text-xs shrink-0">
          <div className="flex items-center gap-2">
            <ShieldCheck className={`w-4 h-4 ${accessToken ? 'text-emerald-400' : 'text-amber-400'}`} />
            <span className="text-slate-300">
              {accessToken ? (
                <>
                  Connected as <span className="text-emerald-300 font-semibold">{auth.currentUser?.email || 'Google User'}</span>
                </>
              ) : (
                'Sign in with Google to enable Workspace integrations'
              )}
            </span>
          </div>

          {!accessToken ? (
            <button
              onClick={handleGoogleSignIn}
              disabled={isAuthenticating}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white font-semibold text-xs border border-white/20 transition-all cursor-pointer"
            >
              {isAuthenticating ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <LogIn className="w-3.5 h-3.5 text-cyan-400" />
              )}
              <span>Sign in with Google</span>
            </button>
          ) : (
            <button
              onClick={handleGoogleSignIn}
              className="text-[11px] text-slate-400 hover:text-white underline cursor-pointer"
            >
              Re-authenticate
            </button>
          )}
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-white/10 bg-[#0d1224] p-1.5 gap-1.5 shrink-0">
          <button
            onClick={() => {
              setActiveTab('sheets');
              setSuccessResult(null);
              setErrorMessage(null);
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'sheets'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>Google Sheets</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('docs');
              setSuccessResult(null);
              setErrorMessage(null);
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'docs'
                ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40 shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <FileText className="w-4 h-4 text-blue-400" />
            <span>Google Docs</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('classroom');
              setSuccessResult(null);
              setErrorMessage(null);
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'classroom'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <GraduationCap className="w-4 h-4 text-amber-400" />
            <span>Google Classroom</span>
          </button>
        </div>

        {/* Scrollable Form Body */}
        <div className="overflow-y-auto flex-1 overscroll-contain">

        {/* Success Alert */}
        {successResult && (
          <div className="m-4 sm:m-5 p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/40 flex items-center justify-between gap-3 animate-fade-in">
            <div className="flex items-center gap-2.5 min-w-0">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <div className="truncate">
                <p className="text-xs font-bold text-emerald-200 truncate">{successResult.title}</p>
                <p className="text-[11px] text-emerald-400">Created successfully in your Google Workspace!</p>
              </div>
            </div>
            <a
              href={successResult.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 text-black font-bold text-xs hover:bg-emerald-400 transition-colors shrink-0 cursor-pointer shadow-md"
            >
              <span>Open</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        )}

        {/* Error Alert */}
        {errorMessage && (
          <div className="m-4 sm:m-5 p-3 rounded-xl bg-rose-950/50 border border-rose-500/30 flex items-center gap-2.5 text-rose-300 text-xs">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Tab 1: Google Sheets */}
        {activeTab === 'sheets' && (
          <div className="p-4 sm:p-6 space-y-4">
            <div className="space-y-3">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                Export Mode
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSheetMode('session')}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    sheetMode === 'session'
                      ? 'bg-emerald-500/15 border-emerald-500/40 text-white'
                      : 'bg-white/5 border-white/5 text-slate-400 hover:text-white'
                  }`}
                >
                  <p className="font-bold text-xs flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                    Single Session Sheet
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">Export individual lecture attendance log</p>
                </button>

                <button
                  type="button"
                  onClick={() => setSheetMode('classroom')}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    sheetMode === 'classroom'
                      ? 'bg-emerald-500/15 border-emerald-500/40 text-white'
                      : 'bg-white/5 border-white/5 text-slate-400 hover:text-white'
                  }`}
                >
                  <p className="font-bold text-xs flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-emerald-400" />
                    Cumulative Roster Sheet
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">All students with overall % attendance</p>
                </button>
              </div>
            </div>

            {sheetMode === 'session' ? (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Select Completed Lecture Session:
                </label>
                <select
                  value={selectedSheetSessionId}
                  onChange={(e) => setSelectedSheetSessionId(e.target.value)}
                  className="w-full bg-[#171E33] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white font-medium focus:outline-none focus:border-emerald-500 cursor-pointer"
                >
                  {sessions.map((sess) => (
                    <option key={sess.id} value={sess.id}>
                      {sess.subjectName} · {sess.date} (Period {sess.period}) · {sess.classroomName}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Select Classroom:
                </label>
                <select
                  value={selectedSheetClassId}
                  onChange={(e) => setSelectedSheetClassId(e.target.value)}
                  className="w-full bg-[#171E33] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white font-medium focus:outline-none focus:border-emerald-500 cursor-pointer"
                >
                  {classrooms.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name} ({cls.department})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="pt-2">
              <button
                onClick={triggerExportSheet}
                disabled={isLoading}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/40"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <FileSpreadsheet className="w-4 h-4" />
                )}
                <span>Export to Google Sheets</span>
              </button>
            </div>
          </div>
        )}

        {/* Tab 2: Google Docs */}
        {activeTab === 'docs' && (
          <div className="p-4 sm:p-6 space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                Target Classroom & Subject
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <span className="text-[11px] text-slate-400 block mb-1">Classroom:</span>
                  <select
                    value={selectedDocClassId}
                    onChange={(e) => setSelectedDocClassId(e.target.value)}
                    className="w-full bg-[#171E33] border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-medium focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    {classrooms.map((cls) => (
                      <option key={cls.id} value={cls.id}>
                        {cls.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <span className="text-[11px] text-slate-400 block mb-1">Subject:</span>
                  <select
                    value={selectedDocSubId}
                    onChange={(e) => setSelectedDocSubId(e.target.value)}
                    className="w-full bg-[#171E33] border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-medium focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    {subjects.map((sub) => (
                      <option key={sub.id} value={sub.id}>
                        {sub.name} ({sub.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-slate-300">Attendance Warning Threshold:</span>
                <span className="text-xs font-mono font-bold text-blue-400">{docThreshold}%</span>
              </div>
              <input
                type="range"
                min="50"
                max="90"
                step="5"
                value={docThreshold}
                onChange={(e) => setDocThreshold(Number(e.target.value))}
                className="w-full accent-blue-500 cursor-pointer"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Generates a formal BIT Sindri notice listing students below {docThreshold}% for mandatory consultation.
              </p>
            </div>

            <div className="pt-2">
              <button
                onClick={triggerGenerateDoc}
                disabled={isLoading}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-blue-950/40"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <FileText className="w-4 h-4" />
                )}
                <span>Generate Official Notice in Google Docs</span>
              </button>
            </div>
          </div>
        )}

        {/* Tab 3: Google Classroom */}
        {activeTab === 'classroom' && (
          <div className="p-4 sm:p-6 space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                Google Classroom Active Courses
              </label>

              {isLoadingCourses ? (
                <div className="p-4 rounded-xl bg-[#171E33] border border-white/5 flex items-center justify-center gap-2 text-slate-300 text-xs">
                  <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                  <span>Loading courses from Google Classroom...</span>
                </div>
              ) : courses.length > 0 ? (
                <select
                  value={selectedCourseId}
                  onChange={(e) => setSelectedCourseId(e.target.value)}
                  className="w-full bg-[#171E33] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white font-medium focus:outline-none focus:border-amber-500 cursor-pointer"
                >
                  {courses.map((crs) => (
                    <option key={crs.id} value={crs.id}>
                      {crs.name} {crs.section ? `(${crs.section})` : ''}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-xs text-slate-300">
                  <p>No Google Classroom courses found for this account.</p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Make sure you are logged in with your institutional or teacher Google account.
                  </p>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Post Attendance Update / Stream Announcement:
              </label>
              <textarea
                value={announcementText}
                onChange={(e) => setAnnouncementText(e.target.value)}
                rows={3}
                className="w-full bg-[#171E33] border border-white/10 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-all resize-none"
                placeholder="Type your announcement to post to the Google Classroom course stream..."
              />
            </div>

            <div className="pt-2">
              <button
                onClick={triggerPostClassroomAnnouncement}
                disabled={isLoading || !selectedCourseId}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-amber-950/40 disabled:opacity-50"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                <span>Post to Google Classroom Stream</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>

      {/* Mandatory User Confirmation Dialog */}
      {confirmDialog && confirmDialog.isOpen && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#10162A] border border-white/15 rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shrink-0">
                <AlertTriangle className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">{confirmDialog.title}</h3>
                <p className="text-xs text-slate-400 mt-1 whitespace-pre-line leading-relaxed">
                  {confirmDialog.description}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
              <button
                onClick={() => setConfirmDialog(null)}
                className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  const action = confirmDialog.onConfirm;
                  setConfirmDialog(null);
                  await action();
                }}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold transition-all shadow-md cursor-pointer"
              >
                Confirm & Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
};
