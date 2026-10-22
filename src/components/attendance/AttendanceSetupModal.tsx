import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Classroom, Subject, Student, AttendanceSession } from '../../types/attendance';
import { SwipeAttendLogo } from '../common/SwipeAttendLogo';
import {
  Calendar,
  BookOpen,
  Users,
  AlertTriangle,
  Play,
  X,
  QrCode,
  Sparkles,
  Bot,
  Hash,
  ListPlus,
  Loader2,
  Check,
  ChevronDown,
  ChevronUp,
  Plus,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';
import {
  generateLocalSequence,
  generateRollsWithGemini,
} from '../../services/rollGenerator';
import { getTodayIsoDate, formatClassDate } from '../../utils/dateUtils';
import { StudentAvatar } from '../common/StudentAvatar';

interface AttendanceSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  classrooms: Classroom[];
  subjects: Subject[];
  students: Student[];
  existingSessions: AttendanceSession[];
  onStartSession: (config: {
    classroomId: string;
    subjectId: string;
    date: string;
    period: number;
    order: 'roll' | 'name' | 'random';
    notes?: string;
  }) => void;
  onStartQRSession?: (classroomId: string, subjectId: string) => void;
  onEnrollStudents?: (newStudents: Student[]) => void;
  onCreateClassroom?: (newClassroom: Classroom) => void;
  initialClassroomId?: string;
  initialSubjectId?: string;
}

export const AttendanceSetupModal: React.FC<AttendanceSetupModalProps> = ({
  isOpen,
  onClose,
  classrooms,
  subjects,
  students,
  existingSessions,
  onStartSession,
  onStartQRSession,
  onEnrollStudents,
  onCreateClassroom,
  initialClassroomId,
  initialSubjectId,
}) => {
  const [selectedClassId, setSelectedClassId] = useState(
    initialClassroomId || classrooms[0]?.id || ''
  );
  const [selectedSubjectId, setSelectedSubjectId] = useState(
    initialSubjectId || subjects[0]?.id || ''
  );
  const [date, setDate] = useState(() => getTodayIsoDate());
  const [period, setPeriod] = useState(2);
  const [order, setOrder] = useState<'roll' | 'name' | 'random'>('roll');
  const [notes, setNotes] = useState('');

  // New Classroom Inline State
  const [isCreatingNewClass, setIsCreatingNewClass] = useState(false);
  const [newClassName, setNewClassName] = useState('B.Tech CSE · 1st Year · Sec A');
  const [newClassDept, setNewClassDept] = useState('B.Tech Computer Science');
  const [newClassSem, setNewClassSem] = useState('1st Year • 1st Semester');
  const [newClassSec, setNewClassSec] = useState('Section A');

  // Gemini Roll Number Generator Panel State
  const [isGeneratorOpen, setIsGeneratorOpen] = useState(false);
  const [generatorMode, setGeneratorMode] = useState<'range' | 'custom' | 'prompt'>('range');
  const [rangePrefix, setRangePrefix] = useState('26CSE');
  const [rangeStart, setRangeStart] = useState(1);
  const [rangeEnd, setRangeEnd] = useState(60);
  const [rangePadding, setRangePadding] = useState(3);
  const [customListText, setCustomListText] = useState('26CSE001, 26CSE002, 26CSE003, 26CSE004, 26CSE005');
  const [aiPromptText, setAiPromptText] = useState('Generate 60 first year roll numbers for B.Tech Computer Science Section A');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [previewRolls, setPreviewRolls] = useState<string[]>([]);
  const [previewStudents, setPreviewStudents] = useState<Omit<Student, 'id'>[]>([]);
  const [aiExplanation, setAiExplanation] = useState<string>('');
  const [enrolledNotice, setEnrolledNotice] = useState<string | null>(null);

  // Synchronize initial selections and ensure valid selected subject
  useEffect(() => {
    if (initialClassroomId) {
      setSelectedClassId(initialClassroomId);
    } else if (classrooms.length > 0 && (!selectedClassId || !classrooms.some((c) => c.id === selectedClassId))) {
      setSelectedClassId(classrooms[0].id);
    }

    if (initialSubjectId && subjects.some((s) => s.id === initialSubjectId)) {
      setSelectedSubjectId(initialSubjectId);
    } else if (subjects.length > 0 && (!selectedSubjectId || !subjects.some((s) => s.id === selectedSubjectId))) {
      setSelectedSubjectId(subjects[0].id);
    }
  }, [isOpen, initialClassroomId, initialSubjectId, subjects, classrooms]);

  // Initialize preview on first open of generator
  useEffect(() => {
    if (isGeneratorOpen && previewRolls.length === 0) {
      handlePreviewSequence();
    }
  }, [isGeneratorOpen]);

  const currentClass = classrooms.find((c) => c.id === selectedClassId);
  const availableSubjects = subjects.filter(
    (s) => s.classroomId === selectedClassId || !s.classroomId
  );
  const enrolledStudents = students.filter(
    (s) => s.classroomId === selectedClassId
  );

  // Check if session already exists for this class, subject and date
  const isDuplicate = existingSessions.some(
    (s) =>
      s.classroomId === selectedClassId &&
      s.subjectId === selectedSubjectId &&
      s.date === date &&
      s.status === 'completed'
  );

  // Compute local sequence preview
  const handlePreviewSequence = () => {
    const targetDept = isCreatingNewClass ? newClassDept : currentClass?.department || 'B.Tech Computer Science';
    const targetSec = isCreatingNewClass ? newClassSec : currentClass?.section ? `Section ${currentClass.section}` : 'Section A';
    const targetSem = isCreatingNewClass ? newClassSem : currentClass?.semester || '1st Year • 1st Semester';
    const targetCId = isCreatingNewClass ? 'class-pending-new' : selectedClassId;

    if (generatorMode === 'range') {
      const res = generateLocalSequence({
        patternType: 'sequential',
        rollPrefix: rangePrefix,
        startNum: rangeStart,
        count: Math.max(1, rangeEnd - rangeStart + 1),
        endNum: rangeEnd,
        padding: rangePadding,
        step: 1,
        department: targetDept,
        section: targetSec,
        semester: targetSem,
        classroomId: targetCId,
      });
      setPreviewRolls(res.rolls);
      setPreviewStudents(res.students);
      setAiExplanation(res.explanation);
    } else if (generatorMode === 'custom') {
      const res = generateLocalSequence({
        patternType: 'sequential',
        rollPrefix: rangePrefix,
        startNum: 1,
        count: 20,
        customList: customListText,
        padding: rangePadding,
        step: 1,
        department: targetDept,
        section: targetSec,
        semester: targetSem,
        classroomId: targetCId,
      });
      setPreviewRolls(res.rolls);
      setPreviewStudents(res.students);
      setAiExplanation(`Parsed ${res.rolls.length} custom roll numbers from list.`);
    }
  };

  // Generate sequence using Gemini API
  const handleGenerateWithGemini = async () => {
    setIsAiLoading(true);
    setEnrolledNotice(null);

    const targetDept = isCreatingNewClass ? newClassDept : currentClass?.department || 'B.Tech Computer Science';
    const targetSec = isCreatingNewClass ? newClassSec : currentClass?.section ? `Section ${currentClass.section}` : 'Section A';
    const targetSem = isCreatingNewClass ? newClassSem : currentClass?.semester || '1st Year • 1st Semester';
    const targetCId = isCreatingNewClass ? 'class-pending-new' : selectedClassId;

    try {
      let promptToUse = aiPromptText;
      if (generatorMode === 'range') {
        promptToUse = `Generate roll numbers for first year ${targetDept} starting from ${rangePrefix}${String(rangeStart).padStart(rangePadding, '0')} to ${rangePrefix}${String(rangeEnd).padStart(rangePadding, '0')}`;
      } else if (generatorMode === 'custom') {
        promptToUse = `Generate student records for this custom roll number list: ${customListText}`;
      }

      const res = await generateRollsWithGemini({
        prompt: promptToUse,
        patternType: 'sequential',
        rollPrefix: rangePrefix,
        startNum: rangeStart,
        endNum: rangeEnd,
        count: Math.max(1, rangeEnd - rangeStart + 1),
        customList: generatorMode === 'custom' ? customListText : undefined,
        padding: rangePadding,
        step: 1,
        department: targetDept,
        section: targetSec,
        semester: targetSem,
        classroomId: targetCId,
      });

      setPreviewRolls(res.rolls);
      setPreviewStudents(res.students);
      setAiExplanation(res.explanation);
    } catch (err) {
      console.error('Gemini roll generation error:', err);
      handlePreviewSequence();
    } finally {
      setIsAiLoading(false);
    }
  };

  // Populate classroom roster and auto-enroll students
  const handlePopulateRoster = () => {
    let effectiveClassId = selectedClassId;

    // 1. If teacher opted to create a new classroom, instantiate it
    if (isCreatingNewClass && onCreateClassroom) {
      effectiveClassId = `class-${Date.now()}`;
      const newCls: Classroom = {
        id: effectiveClassId,
        name: newClassName,
        institutionType: 'College',
        department: newClassDept,
        academicYear: '2026-2027',
        year: '1st Year',
        semester: newClassSem,
        section: newClassSec.replace('Section ', ''),
        attendanceThreshold: 75,
        studentCount: previewStudents.length || Math.max(1, rangeEnd - rangeStart + 1),
      };
      onCreateClassroom(newCls);
      setSelectedClassId(effectiveClassId);
      setIsCreatingNewClass(false);
    }

    // 2. Prepare students to enroll
    const studentsToEnroll =
      previewStudents.length > 0
        ? previewStudents
        : generateLocalSequence({
            patternType: 'sequential',
            rollPrefix: rangePrefix,
            startNum: rangeStart,
            endNum: rangeEnd,
            count: Math.max(1, rangeEnd - rangeStart + 1),
            padding: rangePadding,
            step: 1,
            department: isCreatingNewClass ? newClassDept : currentClass?.department || 'B.Tech Computer Science',
            section: isCreatingNewClass ? newClassSec : currentClass?.section ? `Section ${currentClass.section}` : 'Section A',
            semester: isCreatingNewClass ? newClassSem : currentClass?.semester || '1st Year • 1st Semester',
            classroomId: effectiveClassId,
          }).students;

    const fullStudents: Student[] = studentsToEnroll.map((s, idx) => ({
      ...s,
      id: `std-${Date.now()}-${idx}`,
      classroomId: effectiveClassId,
    }));

    if (onEnrollStudents) {
      onEnrollStudents(fullStudents);
    }

    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
    });

    setEnrolledNotice(`Enrolled ${fullStudents.length} students into roster! (${fullStudents[0].rollNo} to ${fullStudents[fullStudents.length - 1].rollNo})`);
    setIsGeneratorOpen(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onStartSession({
      classroomId: selectedClassId,
      subjectId: selectedSubjectId,
      date,
      period,
      order,
      notes,
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-xl bg-[#0F1424] border border-white/10 rounded-2xl sm:rounded-3xl shadow-2xl shadow-violet-950/40 p-4 sm:p-7 overflow-hidden my-auto max-h-[94vh] overflow-y-auto">
        {/* Glow backdrop */}
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 sm:pb-5 border-b border-white/8">
          <div className="flex items-center gap-3">
            <SwipeAttendLogo size={40} />
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-white font-['Plus_Jakarta_Sans'] flex items-center gap-2">
                Start Attendance
              </h2>
              <p className="text-xs text-slate-400">
                Configure classroom, roster generation, and session parameters
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4 sm:space-y-5">
          {/* Subject Selection */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Subject
            </label>
            <div className="relative">
              <select
                value={selectedSubjectId}
                onChange={(e) => setSelectedSubjectId(e.target.value)}
                className="w-full bg-[#171E33] border border-white/10 rounded-xl px-4 py-2.5 sm:py-3 text-sm text-white font-medium focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all cursor-pointer"
                required
              >
                {subjects.map((sub) => (
                  <option key={sub.id} value={sub.id}>
                    {sub.name} ({sub.code})
                  </option>
                ))}
              </select>
              <BookOpen className="w-4 h-4 text-slate-400 absolute right-4 top-3.5 pointer-events-none" />
            </div>
          </div>

          {/* Classroom Selection (with + Create New Classroom option) */}
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Classroom
                </label>
                <select
                  value={isCreatingNewClass ? '__NEW__' : selectedClassId}
                  onChange={(e) => {
                    if (e.target.value === '__NEW__') {
                      setIsCreatingNewClass(true);
                    } else {
                      setIsCreatingNewClass(false);
                      setSelectedClassId(e.target.value);
                      const relatedSub = subjects.find(
                        (s) => s.classroomId === e.target.value
                      );
                      if (relatedSub) setSelectedSubjectId(relatedSub.id);
                    }
                  }}
                  className="w-full bg-[#171E33] border border-white/10 rounded-xl px-4 py-2.5 sm:py-3 text-sm text-white font-medium focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all cursor-pointer"
                  required
                >
                  {classrooms.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name}
                    </option>
                  ))}
                  <option value="__NEW__">+ Create New Classroom...</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Section
                </label>
                <div className="w-full bg-[#171E33]/60 border border-white/10 rounded-xl px-4 py-2.5 sm:py-3 text-sm text-slate-300 font-medium">
                  {isCreatingNewClass
                    ? newClassSec
                    : currentClass?.section
                    ? `Section ${currentClass.section}`
                    : 'Section A'}
                </div>
              </div>
            </div>

            {/* Inline New Classroom Configuration Form */}
            {isCreatingNewClass && (
              <div className="p-3.5 rounded-xl bg-violet-950/20 border border-violet-500/30 space-y-3 animate-fade-in text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <Plus className="w-3.5 h-3.5 text-violet-400" />
                    New Classroom Setup
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsCreatingNewClass(false)}
                    className="text-[11px] text-slate-400 hover:text-white"
                  >
                    Cancel New Class
                  </button>
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Classroom Label</label>
                  <input
                    type="text"
                    value={newClassName}
                    onChange={(e) => setNewClassName(e.target.value)}
                    placeholder="e.g. B.Tech CSE · 1st Year · Sec A"
                    className="w-full bg-[#171E33] border border-white/10 rounded-lg px-3 py-1.5 text-white"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">Department</label>
                    <select
                      value={newClassDept}
                      onChange={(e) => setNewClassDept(e.target.value)}
                      className="w-full bg-[#171E33] border border-white/10 rounded-lg px-2.5 py-1.5 text-white"
                    >
                      <option value="B.Tech Computer Science">B.Tech Computer Science</option>
                      <option value="B.Tech Electrical Engineering">B.Tech Electrical Engineering</option>
                      <option value="B.Tech Mechanical Engineering">B.Tech Mechanical Engineering</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">Semester</label>
                    <select
                      value={newClassSem}
                      onChange={(e) => setNewClassSem(e.target.value)}
                      className="w-full bg-[#171E33] border border-white/10 rounded-lg px-2.5 py-1.5 text-white"
                    >
                      <option value="1st Year • 1st Semester">1st Year • 1st Sem</option>
                      <option value="1st Year • 2nd Semester">1st Year • 2nd Sem</option>
                      <option value="2nd Year • 3rd Semester">2nd Year • 3rd Sem</option>
                      <option value="3rd Year • 5th Semester">3rd Year • 5th Sem</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">Section</label>
                    <select
                      value={newClassSec}
                      onChange={(e) => setNewClassSec(e.target.value)}
                      className="w-full bg-[#171E33] border border-white/10 rounded-lg px-2.5 py-1.5 text-white"
                    >
                      <option value="Section A">Section A</option>
                      <option value="Section B">Section B</option>
                      <option value="Section C">Section C</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Roster Strip & Gemini Generate Roll Numbers Feature */}
          <div className="space-y-2">
            {/* Roster Overview Strip */}
            <div className="bg-[#141A2E] border border-white/8 rounded-xl p-3 sm:p-3.5 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex -space-x-2 overflow-hidden">
                  {enrolledStudents.slice(0, 4).map((s) => (
                    <StudentAvatar
                      key={s.id}
                      name={s.name}
                      avatarUrl={s.avatarUrl}
                      rollNo={s.rollNo}
                      studentId={s.studentId}
                      size="sm"
                      className="ring-2 ring-[#0F1424]"
                    />
                  ))}
                  {enrolledStudents.length === 0 && (
                    <div className="h-8 w-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 text-xs">
                      0
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">
                    {enrolledStudents.length > 0
                      ? `${enrolledStudents.length} Students Enrolled`
                      : isCreatingNewClass
                      ? 'New Roster (Empty)'
                      : `${currentClass?.studentCount || 0} Students`}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    {enrolledStudents.length > 0 ? 'Ready for attendance' : 'Use Gemini AI to populate roll numbers'}
                  </p>
                </div>
              </div>

              {/* Toggle Gemini AI Generator Button */}
              <button
                type="button"
                onClick={() => {
                  setIsGeneratorOpen(!isGeneratorOpen);
                  if (!isGeneratorOpen) handlePreviewSequence();
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                  isGeneratorOpen
                    ? 'bg-violet-600 text-white border-violet-500 shadow-md shadow-violet-600/30'
                    : 'bg-violet-600/15 hover:bg-violet-600/25 text-violet-300 border-violet-500/30 hover:text-white'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>Generate Roll Numbers</span>
                {isGeneratorOpen ? (
                  <ChevronUp className="w-3.5 h-3.5 ml-0.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5 ml-0.5" />
                )}
              </button>
            </div>

            {/* Success toast if roster was populated */}
            {enrolledNotice && (
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs animate-fade-in font-medium">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>{enrolledNotice}</span>
              </div>
            )}

            {/* EXPANDED GEMINI AI ROLL NUMBER GENERATOR PANEL */}
            {isGeneratorOpen && (
              <div className="p-3.5 sm:p-4 rounded-2xl bg-[#11172A] border border-violet-500/30 space-y-3.5 animate-fade-in shadow-xl text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-white/5">
                  <div className="flex items-center gap-2">
                    <Bot className="w-4 h-4 text-violet-400" />
                    <span className="font-bold text-white text-xs">
                      Gemini API Roll Number & Roster Generator
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-violet-300 px-2 py-0.5 rounded-full bg-violet-500/20">
                    Gemini 3.8 Flash
                  </span>
                </div>

                {/* Generator Mode Switcher Tabs */}
                <div className="grid grid-cols-3 gap-1.5 p-1 bg-[#090D1A] rounded-xl border border-white/5">
                  <button
                    type="button"
                    onClick={() => {
                      setGeneratorMode('range');
                      setRangePrefix('26CSE');
                      setRangeStart(1);
                      setRangeEnd(60);
                    }}
                    className={`py-1.5 px-2 rounded-lg font-semibold transition-all cursor-pointer text-center ${
                      generatorMode === 'range'
                        ? 'bg-violet-600 text-white shadow'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    1st Year Range
                  </button>

                  <button
                    type="button"
                    onClick={() => setGeneratorMode('custom')}
                    className={`py-1.5 px-2 rounded-lg font-semibold transition-all cursor-pointer text-center ${
                      generatorMode === 'custom'
                        ? 'bg-violet-600 text-white shadow'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Custom List
                  </button>

                  <button
                    type="button"
                    onClick={() => setGeneratorMode('prompt')}
                    className={`py-1.5 px-2 rounded-lg font-semibold transition-all cursor-pointer text-center ${
                      generatorMode === 'prompt'
                        ? 'bg-violet-600 text-white shadow'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    AI Prompt
                  </button>
                </div>

                {/* Mode 1: First Year Range Configuration */}
                {generatorMode === 'range' && (
                  <div className="space-y-2.5">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <div>
                        <label className="block text-[10px] text-slate-400 mb-1">Prefix</label>
                        <input
                          type="text"
                          value={rangePrefix}
                          onChange={(e) => setRangePrefix(e.target.value)}
                          placeholder="e.g. 26CSE"
                          className="w-full bg-[#171E33] border border-white/10 rounded-lg px-2.5 py-1.5 text-white font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-400 mb-1">Start Roll</label>
                        <input
                          type="number"
                          value={rangeStart}
                          min={1}
                          onChange={(e) => setRangeStart(Number(e.target.value) || 1)}
                          className="w-full bg-[#171E33] border border-white/10 rounded-lg px-2.5 py-1.5 text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-400 mb-1">End Roll Range</label>
                        <input
                          type="number"
                          value={rangeEnd}
                          min={rangeStart}
                          max={200}
                          onChange={(e) => setRangeEnd(Number(e.target.value) || rangeStart)}
                          className="w-full bg-[#171E33] border border-white/10 rounded-lg px-2.5 py-1.5 text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-400 mb-1">Zero Padding</label>
                        <select
                          value={rangePadding}
                          onChange={(e) => setRangePadding(Number(e.target.value))}
                          className="w-full bg-[#171E33] border border-white/10 rounded-lg px-2 py-1.5 text-white"
                        >
                          <option value={2}>2 Digits (01-60)</option>
                          <option value={3}>3 Digits (001-060)</option>
                          <option value={0}>None (1-60)</option>
                        </select>
                      </div>
                    </div>

                    {/* Quick Range Presets */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">Presets:</span>
                      {[
                        { label: 'Full Cohort (1-72)', start: 1, end: 72, prefix: '26CSE' },
                        { label: 'Section A (1-36)', start: 1, end: 36, prefix: '26CSE' },
                        { label: 'Section B (37-72)', start: 37, end: 72, prefix: '26CSE' },
                        { label: 'Lateral Entry (1-20)', start: 1, end: 20, prefix: '26-LE-CSE-' },
                      ].map((preset) => (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() => {
                            setRangeStart(preset.start);
                            setRangeEnd(preset.end);
                            setRangePrefix(preset.prefix);
                          }}
                          className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-[10px] text-slate-300 border border-white/5 cursor-pointer"
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Mode 2: Custom List */}
                {generatorMode === 'custom' && (
                  <div className="space-y-1.5">
                    <label className="block text-[10px] text-slate-400 font-semibold">
                      Paste or Type Custom Roll Numbers (Comma or line separated)
                    </label>
                    <textarea
                      rows={2}
                      value={customListText}
                      onChange={(e) => setCustomListText(e.target.value)}
                      placeholder="e.g. 26CSE001, 26CSE002, 26CSE005, 26CSE010..."
                      className="w-full bg-[#171E33] border border-white/10 rounded-xl p-2 text-white font-mono text-xs focus:outline-none focus:border-violet-500"
                    />
                    <p className="text-[10px] text-slate-400">
                      Gemini API will parse each roll number and automatically generate realistic student profiles for your roster.
                    </p>
                  </div>
                )}

                {/* Mode 3: Natural Language Prompt */}
                {generatorMode === 'prompt' && (
                  <div className="space-y-1.5">
                    <label className="block text-[10px] text-slate-400 font-semibold">
                      Describe in Plain English what students to generate
                    </label>
                    <textarea
                      rows={2}
                      value={aiPromptText}
                      onChange={(e) => setAiPromptText(e.target.value)}
                      placeholder="e.g. Generate 50 roll numbers for first year electrical engineering Section A with realistic names"
                      className="w-full bg-[#171E33] border border-white/10 rounded-xl p-2 text-white text-xs focus:outline-none focus:border-violet-500"
                    />
                  </div>
                )}

                {/* Action: Trigger Gemini AI Generation */}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleGenerateWithGemini}
                    disabled={isAiLoading}
                    className="flex-1 py-2 px-3 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold rounded-xl shadow-md shadow-violet-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-60 text-xs"
                  >
                    {isAiLoading ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                        <span>Gemini Generating Roster...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                        <span>Generate with Gemini API</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handlePreviewSequence}
                    className="py-2 px-3 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 rounded-xl font-semibold transition-colors cursor-pointer text-xs"
                    title="Quick deterministic rule preview"
                  >
                    Quick Rule Preview
                  </button>
                </div>

                {/* Generated Sequence Preview */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-slate-300">
                      Generated Roster Preview ({previewRolls.length} Students)
                    </span>
                    {previewRolls.length > 0 && (
                      <span className="text-[10px] font-mono text-emerald-400">
                        {previewRolls[0]} → {previewRolls[previewRolls.length - 1]}
                      </span>
                    )}
                  </div>

                  {aiExplanation && (
                    <p className="text-[10px] text-slate-400 italic bg-white/5 p-1.5 rounded-lg border border-white/5">
                      {aiExplanation}
                    </p>
                  )}

                  <div className="bg-[#090D1A] border border-white/10 rounded-xl p-2.5 max-h-24 overflow-y-auto flex flex-wrap gap-1 font-mono text-[10px]">
                    {previewRolls.length > 0 ? (
                      previewRolls.map((roll, idx) => (
                        <span
                          key={idx}
                          className="px-1.5 py-0.5 rounded bg-violet-500/15 text-violet-300 border border-violet-500/20"
                        >
                          {roll}
                        </span>
                      ))
                    ) : (
                      <span className="text-slate-500 italic">
                        Click 'Generate with Gemini API' or 'Quick Rule Preview' to preview rolls.
                      </span>
                    )}
                  </div>
                </div>

                {/* Confirm & Populate Roster CTA */}
                <button
                  type="button"
                  onClick={handlePopulateRoster}
                  disabled={previewRolls.length === 0}
                  className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 text-xs"
                >
                  <Check className="w-4 h-4" />
                  <span>
                    Populate Classroom Roster ({previewRolls.length || Math.max(1, rangeEnd - rangeStart + 1)} Students)
                  </span>
                </button>
              </div>
            )}
          </div>

          {/* Date & Order in 2 Columns */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Date of Attendance
                </label>
                <span className="text-[10px] text-emerald-400 font-mono font-semibold">
                  Today: {formatClassDate(date, false)}
                </span>
              </div>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-[#171E33] border border-white/10 rounded-xl px-4 py-2.5 sm:py-3 text-sm text-white font-medium focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all font-mono"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Attendance Order
              </label>
              <select
                value={order}
                onChange={(e) => setOrder(e.target.value as any)}
                className="w-full bg-[#171E33] border border-white/10 rounded-xl px-4 py-2.5 sm:py-3 text-sm text-white font-medium focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all cursor-pointer"
              >
                <option value="roll">Roll Number (Default)</option>
                <option value="name">Student Name (A-Z)</option>
                <option value="random">Shuffle Order</option>
              </select>
            </div>
          </div>

          {/* Duplicate Session Notice */}
          {isDuplicate && (
            <div className="flex items-start gap-3 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs">
              <AlertTriangle className="w-5 h-5 shrink-0 text-amber-400" />
              <div>
                <p className="font-semibold">Notice: Prior session exists for this date</p>
                <p className="text-amber-200/80 mt-0.5">
                  An attendance session for this subject and class was previously recorded for {date}. Proceeding will record a new additional period session.
                </p>
              </div>
            </div>
          )}

          {/* Action CTAs */}
          <div className="flex flex-wrap items-center justify-end gap-2.5 sm:gap-3 pt-3 border-t border-white/8">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-slate-300 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            {onStartQRSession && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onStartQRSession(selectedClassId, selectedSubjectId);
                }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-violet-300 bg-violet-600/20 hover:bg-violet-600/30 border border-violet-500/30 transition-all cursor-pointer"
                title="Generate rotating QR Code for student self-scanning"
              >
                <QrCode className="w-4 h-4 text-violet-400" />
                <span>Live QR Code</span>
              </button>
            )}
            <button
              type="submit"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 shadow-lg shadow-violet-600/30 transition-all cursor-pointer"
            >
              <span>Swipe Mode</span>
              <Play className="w-3.5 h-3.5 fill-white" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
