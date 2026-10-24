import React, { useState, useCallback, useMemo, Suspense, lazy } from 'react';
import confetti from 'canvas-confetti';
import { Student, Classroom, AttendanceStatus } from '../../types/attendance';
import {
  Users,
  Search,
  Plus,
  FileSpreadsheet,
  Hash,
  Download,
  Upload,
  Check,
  X,
  Trash2,
  AlertTriangle,
  FileText,
  CheckSquare,
  Square,
  UserCheck,
  UserX,
  Sparkles,
  CheckCheck,
  Layers,
  Wand2,
  Copy,
  ArrowRight,
  Loader2,
  Bot,
  BookOpen,
} from 'lucide-react';
import { StudentTableRow } from '../cards/StudentCard';
import { ResponsiveTableWrapper } from '../common/ResponsiveTableWrapper';
import {
  generateLocalSequence,
  generateRollsWithGemini,
  downloadRollsCsv,
  RollGeneratorConfig,
} from '../../services/rollGenerator';

// Lazy-load the student document parser modal on-demand to keep initial bundle size tiny and fast
const UploadStudentListModal = lazy(() =>
  import('./UploadStudentListModal').then((m) => ({ default: m.UploadStudentListModal }))
);

interface StudentManagerProps {
  students: Student[];
  classrooms?: Classroom[];
  onAddStudent: (student: Omit<Student, 'id'>) => void;
  onImportStudents: (imported: Student[]) => void;
  onDeleteStudent: (studentId: string) => void;
  onBatchUpdateStudents?: (
    studentIds: string[],
    status: AttendanceStatus,
    config?: {
      classroomId?: string;
      subjectId?: string;
      createSessionRecord?: boolean;
      notes?: string;
    }
  ) => void;
  onBack: () => void;
}

export const StudentManager: React.FC<StudentManagerProps> = ({
  students,
  classrooms = [],
  onAddStudent,
  onImportStudents,
  onDeleteStudent,
  onBatchUpdateStudents,
  onBack,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [branchFilter, setBranchFilter] = useState<'All' | 'CSE' | 'EE' | 'ME'>('All');

  // Batch Selection & Status Update States
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [batchTargetStatus, setBatchTargetStatus] = useState<AttendanceStatus>('present');
  const [batchRecordSession, setBatchRecordSession] = useState(true);
  const [batchReasonNotes, setBatchReasonNotes] = useState('');
  const [batchClassroomId, setBatchClassroomId] = useState(classrooms[0]?.id || 'class-cse-3a');
  const [notificationToast, setNotificationToast] = useState<{
    message: string;
    type: 'success' | 'info';
  } | null>(null);

  // Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isRollModalOpen, setIsRollModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isUploadDocModalOpen, setIsUploadDocModalOpen] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);

  const handleDeleteRequest = useCallback((student: Student) => {
    setStudentToDelete(student);
  }, []);

  const handleConfirmDelete = useCallback(() => {
    if (studentToDelete) {
      onDeleteStudent(studentToDelete.id);
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(studentToDelete.id);
        return next;
      });
      setStudentToDelete(null);
    }
  }, [studentToDelete, onDeleteStudent]);

  // Add Student Form State
  const [newStudent, setNewStudent] = useState({
    name: '',
    rollNo: '',
    studentId: '',
    department: 'B.Tech Computer Science',
    classroomId: 'class-cse-3a',
    semester: '1st Year • 1st Semester',
    section: 'Section A',
    email: '',
  });

  // Enhanced Roll Number & Student Generator State
  const [generatorTab, setGeneratorTab] = useState<'ai' | 'template'>('template');
  const [aiPrompt, setAiPrompt] = useState('Generate roll numbers for 30 students in 1st Year CSE with format 26CSE001 to 26CSE030 with realistic names');
  const [isGeneratingWithAi, setIsGeneratingWithAi] = useState(false);
  const [aiExplanation, setAiExplanation] = useState<string>('');
  const [patternType, setPatternType] = useState<'sequential' | 'institutional' | 'lateral' | 'custom' | 'simple'>('sequential');
  const [rollPrefix, setRollPrefix] = useState('26CSE');
  const [startNum, setStartNum] = useState(1);
  const [count, setCount] = useState(25);
  const [padding, setPadding] = useState(3);
  const [stepNum, setStepNum] = useState(1);
  const [suffix, setSuffix] = useState('');
  const [customFormat, setCustomFormat] = useState('BIT/{YEAR}/{BRANCH}/{NUM}');
  const [targetClassroomId, setTargetClassroomId] = useState(classrooms?.[0]?.id || 'class-cse-3a');
  const [targetDepartment, setTargetDepartment] = useState('B.Tech Computer Science');
  const [targetSection, setTargetSection] = useState('Section A');
  const [targetSemester, setTargetSemester] = useState('1st Year • 1st Semester');
  const [rollPreview, setRollPreview] = useState<string[]>([]);
  const [generatedStudentsPreview, setGeneratedStudentsPreview] = useState<Omit<Student, 'id'>[]>([]);
  const [isRollsCopied, setIsRollsCopied] = useState(false);
  const [previewTab, setPreviewTab] = useState<'rolls' | 'students'>('rolls');

  // Calculate local rule-based preview
  const handlePreviewRolls = useCallback(() => {
    const res = generateLocalSequence({
      patternType,
      rollPrefix,
      startNum,
      count,
      padding,
      step: stepNum,
      suffix,
      customFormat,
      year: '2026',
      department: targetDepartment,
      section: targetSection,
      semester: targetSemester,
      classroomId: targetClassroomId,
    });
    setRollPreview(res.rolls);
    setGeneratedStudentsPreview(res.students);
    setAiExplanation(res.explanation);
  }, [
    patternType,
    rollPrefix,
    startNum,
    count,
    padding,
    stepNum,
    suffix,
    customFormat,
    targetDepartment,
    targetSection,
    targetSemester,
    targetClassroomId,
  ]);

  // Generate sequence using Gemini AI
  const handleGenerateWithAi = async () => {
    setIsGeneratingWithAi(true);
    try {
      const res = await generateRollsWithGemini({
        prompt: aiPrompt,
        patternType,
        rollPrefix,
        startNum,
        count,
        padding,
        step: stepNum,
        suffix,
        customFormat,
        year: '2026',
        department: targetDepartment,
        section: targetSection,
        semester: targetSemester,
        classroomId: targetClassroomId,
      });
      setRollPreview(res.rolls);
      setGeneratedStudentsPreview(res.students);
      setAiExplanation(res.explanation);
    } catch (err) {
      console.error('Failed to generate with AI:', err);
      handlePreviewRolls();
    } finally {
      setIsGeneratingWithAi(false);
    }
  };

  // Next Step: Add generated students directly to roster
  const handleNextApplyToRoster = () => {
    if (rollPreview.length === 0) {
      handlePreviewRolls();
    }

    const studentsToEnroll =
      generatedStudentsPreview.length > 0
        ? generatedStudentsPreview
        : generateLocalSequence({
            patternType,
            rollPrefix,
            startNum,
            count,
            padding,
            step: stepNum,
            suffix,
            customFormat,
            year: '2026',
            department: targetDepartment,
            section: targetSection,
            semester: targetSemester,
            classroomId: targetClassroomId,
          }).students;

    const fullStudents: Student[] = studentsToEnroll.map((s, idx) => ({
      ...s,
      id: `std-gen-${Date.now()}-${idx}`,
    }));

    onImportStudents(fullStudents);

    confetti({
      particleCount: 85,
      spread: 75,
      origin: { y: 0.6 },
    });

    setNotificationToast({
      message: `Enrolled ${fullStudents.length} students with generated rolls (${fullStudents[0].rollNo} to ${fullStudents[fullStudents.length - 1].rollNo})!`,
      type: 'success',
    });

    setTimeout(() => {
      setNotificationToast(null);
    }, 4500);

    setIsRollModalOpen(false);
  };

  // Export rolls spreadsheet
  const handleExportRollsCsv = () => {
    if (rollPreview.length === 0) return;
    downloadRollsCsv(rollPreview, generatedStudentsPreview, `rolls_${rollPrefix}_${count}.csv`);
  };

  // Copy rolls to clipboard
  const handleCopyRollsList = () => {
    if (rollPreview.length === 0) return;
    navigator.clipboard.writeText(rollPreview.join(', '));
    setIsRollsCopied(true);
    setTimeout(() => setIsRollsCopied(false), 2000);
  };

  // CSV Import State
  const [csvText, setCsvText] = useState('');
  const [importPreview, setImportPreview] = useState<any[]>([]);

  const handleParseCsv = (text: string) => {
    setCsvText(text);
    const lines = text.trim().split('\n');
    if (lines.length <= 1) {
      setImportPreview([]);
      return;
    }
    const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
    const parsed = lines.slice(1).map((line, idx) => {
      const values = line.split(',').map((v) => v.trim().replace(/^"|"$/g, ''));
      return {
        id: `imported-${Date.now()}-${idx}`,
        rollNo: values[0] || `R${idx + 1}`,
        name: values[1] || 'Unknown Student',
        studentId: values[2] || `ST${1000 + idx}`,
        department: 'B.Tech Computer Science',
        classroomId: 'class-cse-3a',
        semester: '1st Year • 1st Semester',
        section: 'Section A',
        attendancePercentage: 85,
        totalClassesHeld: 50,
        totalClassesAttended: 42,
        avatarUrl: `https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&h=256&q=80`,
      };
    });
    setImportPreview(parsed);
  };

  const handleDownloadSampleCsv = () => {
    const sample = `Roll Number,Student Name,Student ID\n26CSE040,Arjun Sharma,ST1040\n26CSE041,Rashi Verma,ST1041\n26CSE042,Kunal Roy,ST1042`;
    const blob = new Blob([sample], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'SwipeAttend_Student_Roster_Template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredStudents = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return students.filter((s) => {
      const matchesBranch =
        branchFilter === 'All'
          ? true
          : branchFilter === 'CSE'
          ? s.department.includes('Computer Science')
          : branchFilter === 'EE'
          ? s.department.includes('Electrical')
          : s.department.includes('Mechanical');

      if (!matchesBranch) return false;
      if (!query) return true;

      return (
        s.name.toLowerCase().includes(query) ||
        s.rollNo.toLowerCase().includes(query) ||
        s.studentId.toLowerCase().includes(query)
      );
    });
  }, [students, branchFilter, searchQuery]);

  // Selection Handlers
  const handleToggleStudent = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleSelectAllFiltered = useCallback(() => {
    setSelectedIds((prev) => {
      const allFilteredSelected =
        filteredStudents.length > 0 &&
        filteredStudents.every((s) => prev.has(s.id));
      const next = new Set(prev);
      if (allFilteredSelected) {
        filteredStudents.forEach((s) => next.delete(s.id));
      } else {
        filteredStudents.forEach((s) => next.add(s.id));
      }
      return next;
    });
  }, [filteredStudents]);

  const handleClearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const handleSelectAtRisk = useCallback(() => {
    const atRisk = filteredStudents.filter((s) => s.attendancePercentage < 75);
    setSelectedIds(new Set(atRisk.map((s) => s.id)));
  }, [filteredStudents]);

  // Open Batch Status Adjustment Modal
  const handleOpenBatchModal = (status: AttendanceStatus, targetIds?: string[]) => {
    if (targetIds && targetIds.length > 0) {
      setSelectedIds(new Set(targetIds));
    }
    setBatchTargetStatus(status);
    setBatchReasonNotes(
      status === 'present'
        ? 'Batch manual attendance update: Marked Present'
        : 'Batch manual attendance update: Marked Absent'
    );
    setIsBatchModalOpen(true);
  };

  // Execute Batch Update
  const handleExecuteBatchUpdate = () => {
    const idsToUpdate = Array.from(selectedIds);
    if (idsToUpdate.length === 0) return;

    if (onBatchUpdateStudents) {
      onBatchUpdateStudents(idsToUpdate, batchTargetStatus, {
        classroomId: batchClassroomId,
        createSessionRecord: batchRecordSession,
        notes: batchReasonNotes,
      });
    }

    confetti({
      particleCount: 75,
      spread: 75,
      origin: { y: 0.65 },
    });

    setNotificationToast({
      message: `Updated ${idsToUpdate.length} students as ${batchTargetStatus.toUpperCase()}!`,
      type: 'success',
    });

    setTimeout(() => {
      setNotificationToast(null);
    }, 4000);

    setIsBatchModalOpen(false);
    setSelectedIds(new Set());
  };

  // Quick single-student status toggle
  const handleQuickStatusChange = useCallback(
    (studentId: string, status: AttendanceStatus) => {
      if (onBatchUpdateStudents) {
        onBatchUpdateStudents([studentId], status, {
          classroomId: batchClassroomId,
          createSessionRecord: false,
          notes: `Quick manual adjustment: marked as ${status}`,
        });
      }

      const std = students.find((s) => s.id === studentId);
      setNotificationToast({
        message: `Marked ${std?.name || 'Student'} as ${status.toUpperCase()}`,
        type: 'success',
      });

      setTimeout(() => {
        setNotificationToast(null);
      }, 3000);
    },
    [students, batchClassroomId, onBatchUpdateStudents]
  );

  const allFilteredSelected =
    filteredStudents.length > 0 &&
    filteredStudents.every((s) => selectedIds.has(s.id));

  return (
    <div className="max-w-7xl mx-auto py-4 sm:py-6 lg:py-8 px-3 sm:px-6 lg:px-8 space-y-4 sm:space-y-6 animate-fade-in overflow-x-hidden">
      {/* Toast Notification Banner */}
      {notificationToast && (
        <div className="fixed top-16 right-4 sm:right-8 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 text-xs sm:text-sm font-semibold shadow-2xl backdrop-blur-md animate-fade-in">
          <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{notificationToast.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-white font-['Plus_Jakarta_Sans'] tracking-tight">
            Student Management
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Manage student rosters, generate institutional roll numbers, and perform batch attendance adjustments.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => {
              handlePreviewRolls();
              setIsRollModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#131A32] hover:bg-[#1C2646] border border-cyan-500/40 hover:border-cyan-400 text-xs font-bold text-white transition-all cursor-pointer shadow-sm active:scale-95"
          >
            <Hash className="w-3.5 h-3.5 text-cyan-400" />
            <span>Generate Rolls</span>
          </button>

          <button
            onClick={() => setIsImportModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#131A32] hover:bg-[#1C2646] border border-slate-600/80 hover:border-slate-500 text-xs font-bold text-white transition-all cursor-pointer shadow-sm active:scale-95"
          >
            <Upload className="w-3.5 h-3.5 text-slate-300" />
            <span>Import CSV</span>
          </button>

          <button
            onClick={() => setIsUploadDocModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-extrabold shadow-md shadow-violet-600/30 border border-violet-400/50 transition-all cursor-pointer active:scale-95"
            title="Upload student list from PDF, Excel (.xlsx), or CSV"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Upload Student List</span>
          </button>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-extrabold shadow-md shadow-emerald-600/30 border border-emerald-400/50 transition-all cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Add Student</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar (Responsive) */}
      <div className="bg-[#0C1226] border border-slate-700/80 rounded-2xl p-3 sm:p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shadow-md">
        {/* Search */}
        <div className="relative w-full sm:flex-1">
          <Search className="w-4 h-4 text-cyan-400 absolute left-3 top-2.5 sm:top-3" />
          <input
            type="text"
            placeholder="Search students by name, roll no, or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#060A18] border border-slate-700 focus:border-cyan-400 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-cyan-500/40 transition-colors font-medium"
          />
        </div>

        {/* Branch Filter Tabs */}
        <div className="grid grid-cols-4 sm:flex items-center gap-1.5 bg-[#060A18] p-1.5 rounded-xl border border-slate-700/80 w-full sm:w-auto">
          {(['All', 'CSE', 'EE', 'ME'] as const).map((branch) => (
            <button
              key={branch}
              onClick={() => setBranchFilter(branch)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer text-center ${
                branchFilter === branch
                  ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md border border-violet-400/50'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
              }`}
            >
              {branch}
            </button>
          ))}
        </div>
      </div>

      {/* BATCH ACTION & SELECTION TOOLBAR */}
      <div className="bg-[#101526] border border-white/8 rounded-2xl p-3 sm:p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Select all master toggle */}
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-300 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={allFilteredSelected}
              onChange={handleSelectAllFiltered}
              className="rounded accent-violet-600 cursor-pointer w-4 h-4"
            />
            <span>Select All Filtered ({filteredStudents.length})</span>
          </label>

          {/* Quick select helpers */}
          <button
            type="button"
            onClick={handleSelectAtRisk}
            className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/25 transition-colors cursor-pointer"
            title="Select all students below 75% attendance"
          >
            Select At-Risk ({filteredStudents.filter((s) => s.attendancePercentage < 75).length})
          </button>

          {selectedIds.size > 0 && (
            <button
              type="button"
              onClick={handleClearSelection}
              className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer flex items-center gap-1"
            >
              <X className="w-3 h-3" />
              <span>Deselect ({selectedIds.size})</span>
            </button>
          )}

          {selectedIds.size > 0 && (
            <span className="text-[11px] font-mono font-bold text-violet-300 px-2 py-0.5 rounded-md bg-violet-500/15 border border-violet-500/30">
              {selectedIds.size} of {filteredStudents.length} selected
            </span>
          )}
        </div>

        {/* Batch Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap w-full md:w-auto justify-end">
          {selectedIds.size > 0 ? (
            <>
              <button
                type="button"
                onClick={() => handleOpenBatchModal('present')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
                title={`Mark ${selectedIds.size} selected students as Present`}
              >
                <Check className="w-3.5 h-3.5" />
                <span>Mark Present ({selectedIds.size})</span>
              </button>

              <button
                type="button"
                onClick={() => handleOpenBatchModal('absent')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md shadow-rose-600/20 transition-all cursor-pointer"
                title={`Mark ${selectedIds.size} selected students as Absent`}
              >
                <X className="w-3.5 h-3.5" />
                <span>Mark Absent ({selectedIds.size})</span>
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleOpenBatchModal('present', filteredStudents.map((s) => s.id))}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 hover:text-white text-xs font-semibold border border-emerald-500/30 transition-colors cursor-pointer"
                title={`Quick mark all ${filteredStudents.length} filtered students as Present`}
              >
                <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Mark All Present</span>
              </button>

              <button
                type="button"
                onClick={() => handleOpenBatchModal('absent', filteredStudents.map((s) => s.id))}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 hover:text-white text-xs font-semibold border border-rose-500/30 transition-colors cursor-pointer"
                title={`Quick mark all ${filteredStudents.length} filtered students as Absent`}
              >
                <X className="w-3.5 h-3.5 text-rose-400" />
                <span>Mark All Absent</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* RESPONSIVE ROSTER: Touch cards on screens < 768px, Structured Table on screens >= 768px */}
      <ResponsiveTableWrapper
        mobileCards={
          <div className="space-y-2.5">
            {filteredStudents.length === 0 ? (
              <div className="p-8 text-center bg-[#101526] border border-white/8 rounded-2xl text-slate-400 text-xs">
                No students found matching your search.
              </div>
            ) : (
              filteredStudents.map((std) => {
                const isSelected = selectedIds.has(std.id);
                return (
                  <div
                    key={std.id}
                    className={`bg-[#101526] border rounded-2xl p-3.5 space-y-2.5 shadow-md transition-all ${
                      isSelected
                        ? 'border-violet-500/50 bg-[#13192F]'
                        : 'border-white/8'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2.5">
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        {/* Checkbox */}
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleStudent(std.id)}
                          className="rounded accent-violet-600 cursor-pointer w-4 h-4 shrink-0"
                          aria-label={`Select ${std.name}`}
                        />

                        <img
                          src={std.avatarUrl}
                          alt={std.name}
                          className="w-10 h-10 rounded-full object-cover ring-1 ring-white/10 shrink-0 bg-slate-800"
                          loading="lazy"
                          decoding="async"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-white truncate">{std.name}</p>
                          <p className="text-[10px] text-slate-400 font-mono truncate">
                            ID: {std.studentId}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {/* Quick 1-click status adjustment buttons */}
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleQuickStatusChange(std.id, 'present')}
                            className="p-1 rounded bg-emerald-500/15 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 transition-colors"
                            title="Mark Present"
                          >
                            <Check className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleQuickStatusChange(std.id, 'absent')}
                            className="p-1 rounded bg-rose-500/15 hover:bg-rose-500/30 text-rose-400 border border-rose-500/30 transition-colors"
                            title="Mark Absent"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>

                        <span
                          className={`font-mono font-bold text-xs ${
                            std.attendancePercentage >= 75
                              ? 'text-emerald-400'
                              : std.attendancePercentage >= 60
                              ? 'text-amber-400'
                              : 'text-red-400'
                          }`}
                        >
                          {std.attendancePercentage}%
                        </span>

                        <button
                          onClick={() => handleDeleteRequest(std)}
                          className="p-1.5 text-slate-400 hover:text-red-400 rounded-lg hover:bg-white/5 transition-colors cursor-pointer min-h-[32px] min-w-[32px] flex items-center justify-center"
                          title={`Remove ${std.name}`}
                          aria-label={`Remove ${std.name}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] pt-2 border-t border-white/5">
                      <span className="font-mono text-violet-300 font-bold bg-violet-500/10 px-2 py-0.5 rounded-md border border-violet-500/20">
                        Roll {std.rollNo}
                      </span>
                      <span className="text-slate-400 truncate max-w-[170px]">
                        {std.department}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        }
        desktopTable={
          <div className="bg-[#101526] border border-white/8 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300 min-w-[620px]">
                <thead className="bg-[#141A2E] text-slate-400 uppercase font-semibold text-[11px] border-b border-white/8">
                  <tr>
                    <th className="py-3.5 px-3 sm:px-4 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={allFilteredSelected}
                        onChange={handleSelectAllFiltered}
                        className="rounded accent-violet-600 cursor-pointer w-4 h-4"
                        title="Select/Deselect all filtered students"
                        aria-label="Select all filtered students"
                      />
                    </th>
                    <th className="py-3.5 px-4 w-14">Photo</th>
                    <th className="py-3.5 px-4">Student Name</th>
                    <th className="py-3.5 px-4 font-mono">Roll No.</th>
                    <th className="py-3.5 px-4">Branch</th>
                    <th className="py-3.5 px-4">Year</th>
                    <th className="py-3.5 px-4">Attendance</th>
                    <th className="py-3.5 px-4">Quick Status</th>
                    <th className="py-3.5 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredStudents.map((std) => (
                    <StudentTableRow
                      key={std.id}
                      student={std}
                      isSelected={selectedIds.has(std.id)}
                      onToggleSelect={handleToggleStudent}
                      onQuickStatusChange={handleQuickStatusChange}
                      onDeleteRequest={handleDeleteRequest}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        }
      />

      {/* MODAL: ADD STUDENT */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
          <div className="w-full max-w-md bg-[#0F1424] border border-white/10 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-white/8">
              <h2 className="text-lg font-bold text-white">Add New Student</h2>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                onAddStudent({
                  ...newStudent,
                  attendancePercentage: 100,
                  totalClassesHeld: 0,
                  totalClassesAttended: 0,
                  avatarUrl: `https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&h=256&q=80`,
                });
                setIsAddModalOpen(false);
              }}
              className="mt-4 space-y-4 text-xs"
            >
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Vikramaditya Prasad"
                  value={newStudent.name}
                  onChange={(e) => setNewStudent({ ...newStudent, name: e.target.value })}
                  className="w-full bg-[#171E33] border border-white/10 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Roll Number</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 39"
                    value={newStudent.rollNo}
                    onChange={(e) => setNewStudent({ ...newStudent, rollNo: e.target.value })}
                    className="w-full bg-[#171E33] border border-white/10 rounded-xl px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Student ID</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. ST1039"
                    value={newStudent.studentId}
                    onChange={(e) => setNewStudent({ ...newStudent, studentId: e.target.value })}
                    className="w-full bg-[#171E33] border border-white/10 rounded-xl px-3 py-2 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Department</label>
                <select
                  value={newStudent.department}
                  onChange={(e) => setNewStudent({ ...newStudent, department: e.target.value })}
                  className="w-full bg-[#171E33] border border-white/10 rounded-xl px-3 py-2 text-white"
                >
                  <option value="B.Tech Computer Science">B.Tech Computer Science</option>
                  <option value="B.Tech Electrical Engineering">B.Tech Electrical Engineering</option>
                  <option value="B.Tech Mechanical Engineering">B.Tech Mechanical Engineering</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-violet-600 text-white font-bold rounded-xl shadow-lg shadow-violet-600/30"
                >
                  Add Student
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ROLL NUMBER & STUDENT SEQUENCE GENERATOR */}
      {isRollModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
          <div className="w-full max-w-2xl bg-[#0F1424] border border-white/10 rounded-2xl p-4 sm:p-6 shadow-2xl my-auto text-slate-100 flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 sm:pb-4 border-b border-white/8 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-500 flex items-center justify-center shadow-md shadow-violet-500/20 text-white">
                  <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
                    Roll Number & Sequence Generator
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/30 font-mono">
                      AI Powered
                    </span>
                  </h2>
                  <p className="text-[11px] text-slate-400">
                    Generate custom institutional roll numbers and enroll full batches into your roster.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsRollModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body - Scrollable */}
            <div className="flex-1 overflow-y-auto py-3 space-y-4 text-xs pr-1">
              {/* Generation Mode Switcher */}
              <div className="grid grid-cols-2 gap-2 p-1 bg-[#141A2E] rounded-xl border border-white/5">
                <button
                  type="button"
                  onClick={() => setGeneratorTab('ai')}
                  className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg font-semibold transition-all cursor-pointer ${
                    generatorTab === 'ai'
                      ? 'bg-violet-600 text-white shadow-md shadow-violet-600/30'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Bot className="w-3.5 h-3.5 text-violet-300" />
                  <span>AI Smart Prompt (Gemini)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setGeneratorTab('template');
                    handlePreviewRolls();
                  }}
                  className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg font-semibold transition-all cursor-pointer ${
                    generatorTab === 'template'
                      ? 'bg-violet-600 text-white shadow-md shadow-violet-600/30'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5 text-indigo-300" />
                  <span>Template & Rules</span>
                </button>
              </div>

              {/* TAB 1: AI SMART PROMPT */}
              {generatorTab === 'ai' && (
                <div className="space-y-3 p-3.5 rounded-xl bg-violet-950/20 border border-violet-500/20">
                  <div className="flex items-center justify-between">
                    <label className="font-semibold text-slate-200 flex items-center gap-1.5">
                      <Wand2 className="w-3.5 h-3.5 text-violet-400" />
                      Describe roll number sequence or format
                    </label>
                    <span className="text-[10px] text-violet-300 font-mono">Gemini 3.8 Flash</span>
                  </div>

                  <textarea
                    rows={2}
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    placeholder="e.g. Generate 40 roll numbers for 1st Year CSE with format 26CSE001 to 26CSE040 with student names"
                    className="w-full bg-[#141A2E] border border-white/10 rounded-xl p-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 text-xs"
                  />

                  {/* Quick Preset Chips */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">Quick Suggestions:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        'BIT Sindri 2026 Batch (26CSE001 - 030)',
                        'Lateral Entry Cohort (26-LE-EE-01 to 20)',
                        'Exam Roll (BIT/2026/ME/101 to 130)',
                        'Simple Numeric (1 to 50)',
                      ].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => {
                            if (preset.includes('Lateral')) {
                              setAiPrompt('Generate 25 roll numbers for Electrical lateral entry like 26-LE-EE-01 to 26-LE-EE-25 with names');
                              setRollPrefix('26-LE-EE-');
                              setPatternType('lateral');
                            } else if (preset.includes('Exam')) {
                              setAiPrompt('Generate 30 roll numbers formatted as BIT/2026/ME/101 to BIT/2026/ME/130 with student names');
                              setPatternType('institutional');
                            } else if (preset.includes('Simple')) {
                              setAiPrompt('Generate 50 roll numbers numbered 1 to 50 with student names');
                              setPatternType('simple');
                            } else {
                              setAiPrompt('Generate 30 roll numbers for CSE 1st Year from 26CSE001 to 26CSE030 with realistic names');
                              setRollPrefix('26CSE');
                              setPatternType('sequential');
                            }
                          }}
                          className="px-2 py-1 rounded-md bg-white/5 hover:bg-white/10 text-[10px] text-slate-300 border border-white/5 transition-colors cursor-pointer"
                        >
                          {preset}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleGenerateWithAi}
                    disabled={isGeneratingWithAi}
                    className="w-full py-2.5 px-4 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-violet-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-60"
                  >
                    {isGeneratingWithAi ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-white" />
                        <span>AI Analyzing & Generating Sequence...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 text-amber-300" />
                        <span>Generate Sequence with Gemini AI</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* TAB 2: TEMPLATE & FORMAT RULES */}
              {generatorTab === 'template' && (
                <div className="space-y-3 p-3.5 rounded-xl bg-slate-900/60 border border-white/5">
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">Pattern Template Style</label>
                    <select
                      value={patternType}
                      onChange={(e) => {
                        const val = e.target.value as any;
                        setPatternType(val);
                        if (val === 'institutional') setCustomFormat('BIT/{YEAR}/{BRANCH}/{NUM}');
                        else if (val === 'lateral') setRollPrefix('26-LE-');
                        else if (val === 'simple') setRollPrefix('');
                      }}
                      className="w-full bg-[#171E33] border border-white/10 rounded-xl px-3 py-2 text-white"
                    >
                      <option value="sequential">Branch Sequential (e.g. 26CSE001, 26CSE002)</option>
                      <option value="institutional">Institutional Standard (e.g. BIT/2026/CSE/001)</option>
                      <option value="lateral">Lateral Entry Diploma (e.g. 26-LE-CSE-01)</option>
                      <option value="custom">Custom Token Pattern (e.g. BIT/YEAR/BRANCH/NUM)</option>
                      <option value="simple">Simple Numeric Sequence (e.g. 1, 2, 3...)</option>
                    </select>
                  </div>

                  {patternType === 'custom' && (
                    <div>
                      <label className="block font-semibold text-slate-300 mb-1">
                        Custom Formula Token Format
                      </label>
                      <input
                        type="text"
                        value={customFormat}
                        onChange={(e) => setCustomFormat(e.target.value)}
                        placeholder="BIT/{YEAR}/{BRANCH}/{NUM}"
                        className="w-full bg-[#171E33] border border-white/10 rounded-xl px-3 py-2 text-white font-mono"
                      />
                      <p className="text-[10px] text-slate-400 mt-1">
                        Use tokens: {'{PREFIX}'}, {'{YEAR}'}, {'{BRANCH}'}, {'{SEC}'}, {'{NUM}'}
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {patternType !== 'simple' && (
                      <div>
                        <label className="block font-semibold text-slate-300 mb-1">Prefix</label>
                        <input
                          type="text"
                          value={rollPrefix}
                          onChange={(e) => setRollPrefix(e.target.value)}
                          placeholder="e.g. 26CSE"
                          className="w-full bg-[#171E33] border border-white/10 rounded-xl px-2.5 py-1.5 text-white"
                        />
                      </div>
                    )}
                    <div>
                      <label className="block font-semibold text-slate-300 mb-1">Start Number</label>
                      <input
                        type="number"
                        value={startNum}
                        min={1}
                        onChange={(e) => setStartNum(Number(e.target.value) || 1)}
                        className="w-full bg-[#171E33] border border-white/10 rounded-xl px-2.5 py-1.5 text-white"
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block font-semibold text-slate-300">Total Count</label>
                        <span className="text-[10px] text-violet-400 font-mono">
                          Roll {startNum} to {startNum + count * stepNum - 1}
                        </span>
                      </div>
                      <input
                        type="number"
                        value={count}
                        min={1}
                        max={200}
                        onChange={(e) => setCount(Number(e.target.value) || 1)}
                        className="w-full bg-[#171E33] border border-white/10 rounded-xl px-2.5 py-1.5 text-white"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-300 mb-1">Zero Padding</label>
                      <select
                        value={padding}
                        onChange={(e) => setPadding(Number(e.target.value))}
                        className="w-full bg-[#171E33] border border-white/10 rounded-xl px-2.5 py-1.5 text-white"
                      >
                        <option value={0}>None (1, 2...)</option>
                        <option value={2}>2 Digits (01, 02...)</option>
                        <option value={3}>3 Digits (001, 002...)</option>
                        <option value={4}>4 Digits (0001, 0002...)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-300 mb-1">Increment Step</label>
                      <input
                        type="number"
                        value={stepNum}
                        min={1}
                        onChange={(e) => setStepNum(Number(e.target.value) || 1)}
                        className="w-full bg-[#171E33] border border-white/10 rounded-xl px-2.5 py-1.5 text-white"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-300 mb-1">Suffix (Optional)</label>
                      <input
                        type="text"
                        value={suffix}
                        onChange={(e) => setSuffix(e.target.value)}
                        placeholder="e.g. -A or (LE)"
                        className="w-full bg-[#171E33] border border-white/10 rounded-xl px-2.5 py-1.5 text-white"
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handlePreviewRolls}
                    className="w-full py-2 bg-[#171E33] hover:bg-[#1E2742] text-violet-300 border border-violet-500/30 rounded-xl font-semibold transition-colors cursor-pointer"
                  >
                    Refresh Rule Preview
                  </button>
                </div>
              )}

              {/* TARGET DESTINATION CONFIGURATION */}
              <div className="p-3.5 rounded-xl bg-[#141A2E] border border-white/5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
                    Target Enrollment Class & Cohort
                  </span>
                  <span className="text-[10px] text-slate-400">Where students will be added</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">Target Classroom</label>
                    <select
                      value={targetClassroomId}
                      onChange={(e) => setTargetClassroomId(e.target.value)}
                      className="w-full bg-[#171E33] border border-white/10 rounded-lg px-2.5 py-1.5 text-white text-xs"
                    >
                      {classrooms && classrooms.length > 0 ? (
                        classrooms.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))
                      ) : (
                        <option value="class-cse-3a">B.Tech CSE · 1st Year · Sec A</option>
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">Department</label>
                    <select
                      value={targetDepartment}
                      onChange={(e) => setTargetDepartment(e.target.value)}
                      className="w-full bg-[#171E33] border border-white/10 rounded-lg px-2.5 py-1.5 text-white text-xs"
                    >
                      <option value="B.Tech Computer Science">B.Tech Computer Science</option>
                      <option value="B.Tech Electrical Engineering">B.Tech Electrical Engineering</option>
                      <option value="B.Tech Mechanical Engineering">B.Tech Mechanical Engineering</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">Section</label>
                    <select
                      value={targetSection}
                      onChange={(e) => setTargetSection(e.target.value)}
                      className="w-full bg-[#171E33] border border-white/10 rounded-lg px-2.5 py-1.5 text-white text-xs"
                    >
                      <option value="Section A">Section A</option>
                      <option value="Section B">Section B</option>
                      <option value="Section C">Section C</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* SEQUENCE PREVIEW BOX */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <label className="font-semibold text-slate-300">
                      Generated Sequence Preview
                    </label>
                    <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                      {rollPreview.length > 0 ? `${rollPreview.length} Rolls Ready` : 'Ready to Generate'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setPreviewTab(previewTab === 'rolls' ? 'students' : 'rolls')}
                      className="text-[10px] text-violet-300 hover:text-white px-2 py-1 rounded bg-white/5 border border-white/5"
                    >
                      {previewTab === 'rolls' ? 'Show Names' : 'Show Rolls Only'}
                    </button>
                    {rollPreview.length > 0 && (
                      <button
                        type="button"
                        onClick={handleCopyRollsList}
                        className="flex items-center gap-1 text-[10px] text-slate-300 hover:text-white px-2 py-1 rounded bg-white/5 border border-white/5 cursor-pointer"
                        title="Copy roll numbers to clipboard"
                      >
                        {isRollsCopied ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-400" />
                            <span className="text-emerald-300">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3 text-slate-400" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {aiExplanation && (
                  <p className="text-[11px] text-slate-400 italic bg-white/5 p-2 rounded-lg border border-white/5">
                    {aiExplanation}
                  </p>
                )}

                {previewTab === 'rolls' ? (
                  <div className="bg-[#141A2E] border border-white/10 rounded-xl p-3 max-h-36 overflow-y-auto flex flex-wrap gap-1.5 font-mono text-[11px]">
                    {rollPreview.length > 0 ? (
                      rollPreview.map((r, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 rounded-md bg-violet-500/15 text-violet-300 border border-violet-500/25"
                        >
                          {r}
                        </span>
                      ))
                    ) : (
                      <span className="text-slate-500 italic">
                        Click "Generate Sequence with Gemini AI" or "Refresh Rule Preview" to see rolls here.
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="bg-[#141A2E] border border-white/10 rounded-xl p-2 max-h-36 overflow-y-auto space-y-1">
                    {generatedStudentsPreview.length > 0 ? (
                      generatedStudentsPreview.map((s, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between px-2.5 py-1 rounded bg-white/5 text-[11px]"
                        >
                          <span className="font-mono text-violet-300 font-semibold">{s.rollNo}</span>
                          <span className="text-white font-medium">{s.name}</span>
                          <span className="text-slate-400 font-mono text-[10px]">{s.studentId}</span>
                        </div>
                      ))
                    ) : (
                      <span className="text-slate-500 italic p-2 block text-xs">
                        No student preview generated yet.
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* ACTION FOOTER - THE MISSING NEXT / APPLY BUTTONS */}
            <div className="pt-3.5 border-t border-white/8 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 shrink-0 bg-[#0F1424]">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsRollModalOpen(false)}
                  className="px-3.5 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 text-xs font-semibold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                {rollPreview.length > 0 && (
                  <button
                    type="button"
                    onClick={handleExportRollsCsv}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 text-xs font-semibold transition-colors cursor-pointer"
                    title="Export as CSV spreadsheet"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download CSV</span>
                  </button>
                )}
              </div>

              {/* Primary Next Action */}
              <button
                type="button"
                onClick={handleNextApplyToRoster}
                className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-violet-600/30 transition-all cursor-pointer"
              >
                <span>Add {rollPreview.length > 0 ? `${rollPreview.length} Students` : 'Sequence'} to Roster</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CSV IMPORT */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
          <div className="w-full max-w-xl bg-[#0F1424] border border-white/10 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-white/8">
              <div className="flex items-center gap-2">
                <Upload className="w-5 h-5 text-violet-400" />
                <h2 className="text-lg font-bold text-white">Import Students from CSV</h2>
              </div>
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4 text-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 rounded-xl bg-[#141A2E] border border-white/10">
                <span className="text-slate-300">Need the sample format?</span>
                <button
                  onClick={handleDownloadSampleCsv}
                  className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-600/20 text-violet-300 border border-violet-500/30 hover:bg-violet-600/30 w-full sm:w-auto"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Sample CSV</span>
                </button>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Paste CSV Content</label>
                <textarea
                  rows={4}
                  placeholder="Roll Number,Student Name,Student ID&#10;26CSE040,Arjun Sharma,ST1040"
                  value={csvText}
                  onChange={(e) => handleParseCsv(e.target.value)}
                  className="w-full bg-[#171E33] border border-white/10 rounded-xl p-3 text-white font-mono text-[11px]"
                />
              </div>

              {importPreview.length > 0 && (
                <div>
                  <p className="font-semibold text-emerald-400 mb-1">
                    Ready to import: {importPreview.length} students
                  </p>
                  <div className="bg-[#141A2E] border border-white/10 rounded-xl p-2.5 max-h-32 overflow-y-auto space-y-1">
                    {importPreview.map((item, i) => (
                      <div key={i} className="flex justify-between text-[11px] text-slate-300">
                        <span>{item.name}</span>
                        <span className="font-mono text-violet-300">Roll {item.rollNo}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsImportModalOpen(false)}
                  className="px-4 py-2 text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={importPreview.length === 0}
                  onClick={() => {
                    onImportStudents(importPreview);
                    setIsImportModalOpen(false);
                  }}
                  className="px-5 py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white font-bold rounded-xl shadow-lg shadow-violet-600/30"
                >
                  Confirm Import ({importPreview.length})
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: SAFE DELETE CONFIRMATION (Replaces window.confirm) */}
      {studentToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-sm bg-[#0F1424] border border-red-500/30 rounded-2xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/20 border border-red-500/30 flex items-center justify-center text-red-400 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Remove Student</h3>
                <p className="text-xs text-slate-400">This action cannot be undone.</p>
              </div>
            </div>
            <p className="text-xs text-slate-300">
              Are you sure you want to remove <span className="font-bold text-white">{studentToDelete.name}</span> (Roll: <span className="font-mono text-violet-300">{studentToDelete.rollNo}</span>) from the active roster?
            </p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/5">
              <button
                type="button"
                onClick={() => setStudentToDelete(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white rounded-xl hover:bg-white/5 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-500 rounded-xl shadow-lg shadow-red-600/30 transition-all cursor-pointer"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: UNIVERSAL STUDENT LIST UPLOAD (PDF, EXCEL, CSV) */}
      {isUploadDocModalOpen && (
        <Suspense fallback={null}>
          <UploadStudentListModal
            isOpen={isUploadDocModalOpen}
            onClose={() => setIsUploadDocModalOpen(false)}
            classrooms={classrooms}
            existingStudents={students}
            onImportComplete={(imported) => {
              onImportStudents(imported);
              setIsUploadDocModalOpen(false);
            }}
          />
        </Suspense>
      )}

      {/* FLOATING DOCKED BATCH ACTION BAR */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-40 w-[94%] max-w-2xl bg-[#0F1426]/95 border border-violet-500/40 rounded-2xl shadow-2xl shadow-violet-950/60 p-3 sm:p-4 backdrop-blur-md flex items-center justify-between gap-2.5 animate-slide-up">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-violet-600/20 text-violet-400 flex items-center justify-center shrink-0">
              <CheckSquare className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs sm:text-sm font-bold text-white truncate">
                {selectedIds.size} Students Selected
              </p>
              <p className="text-[10px] text-slate-400 hidden sm:block truncate">
                Adjust attendance statuses across selected students
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => handleOpenBatchModal('present')}
              className="flex items-center gap-1.5 px-3 py-1.5 sm:py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/30 transition-all cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Mark Present</span>
            </button>

            <button
              type="button"
              onClick={() => handleOpenBatchModal('absent')}
              className="flex items-center gap-1.5 px-3 py-1.5 sm:py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md shadow-rose-600/30 transition-all cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              <span>Mark Absent</span>
            </button>

            <button
              type="button"
              onClick={handleClearSelection}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/5 transition-colors cursor-pointer"
              title="Clear Selection"
              aria-label="Clear Selection"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* MODAL: BATCH ATTENDANCE STATUS ADJUSTMENT */}
      {isBatchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-fade-in overflow-y-auto">
          <div className="relative w-full max-w-lg bg-[#0F1424] border border-white/10 rounded-2xl sm:rounded-3xl p-5 sm:p-7 shadow-2xl space-y-4 sm:space-y-5 text-slate-100">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3.5 border-b border-white/8">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    batchTargetStatus === 'present'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                  }`}
                >
                  {batchTargetStatus === 'present' ? (
                    <UserCheck className="w-5 h-5" />
                  ) : (
                    <UserX className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                    Batch Mark as {batchTargetStatus === 'present' ? 'Present' : 'Absent'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Applying attendance status to {selectedIds.size} student{selectedIds.size === 1 ? '' : 's'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsBatchModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Target Status Toggle */}
            <div
              className={`p-3.5 rounded-2xl border text-xs flex items-center justify-between ${
                batchTargetStatus === 'present'
                  ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-300'
                  : 'bg-rose-500/10 border-rose-500/25 text-rose-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="font-bold uppercase tracking-wider text-[11px]">
                  Target Status:
                </span>
                <span className="px-2 py-0.5 rounded-md font-mono font-bold text-xs bg-white/10 uppercase">
                  {batchTargetStatus}
                </span>
              </div>
              <div className="flex items-center gap-1 font-semibold text-[11px]">
                <button
                  type="button"
                  onClick={() => setBatchTargetStatus('present')}
                  className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                    batchTargetStatus === 'present'
                      ? 'bg-emerald-600 text-white shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Present
                </button>
                <button
                  type="button"
                  onClick={() => setBatchTargetStatus('absent')}
                  className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                    batchTargetStatus === 'absent'
                      ? 'bg-rose-600 text-white shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Absent
                </button>
              </div>
            </div>

            {/* Classroom Scope */}
            {classrooms.length > 0 && (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Classroom Scope
                </label>
                <select
                  value={batchClassroomId}
                  onChange={(e) => setBatchClassroomId(e.target.value)}
                  className="w-full bg-[#171E33] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-violet-500"
                >
                  {classrooms.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name} ({cls.department})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Session Logging Option */}
            <div className="p-3 rounded-2xl bg-white/4 border border-white/8 space-y-2">
              <label className="flex items-center gap-2 text-xs font-semibold text-white cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={batchRecordSession}
                  onChange={(e) => setBatchRecordSession(e.target.checked)}
                  className="rounded accent-violet-600 cursor-pointer w-4 h-4"
                />
                <span>Log as Attendance Session in History & Firestore</span>
              </label>
              <p className="text-[11px] text-slate-400 pl-6">
                Creates a completed attendance session record for audit history and updates student attendance percentages.
              </p>
            </div>

            {/* Reason / Notes */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Adjustment Reason / Note
              </label>
              <input
                type="text"
                value={batchReasonNotes}
                onChange={(e) => setBatchReasonNotes(e.target.value)}
                placeholder="e.g. Regular lecture attendance, Lab makeup, Sports excuse..."
                className="w-full bg-[#171E33] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-violet-500"
              />
            </div>

            {/* Selected Students Preview Chips */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Target Students ({selectedIds.size})
              </label>
              <div className="max-h-28 overflow-y-auto p-2 rounded-xl bg-black/20 border border-white/5 flex flex-wrap gap-1.5">
                {students
                  .filter((s) => selectedIds.has(s.id))
                  .map((s) => (
                    <span
                      key={s.id}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-mono bg-white/6 border border-white/10 text-slate-200"
                    >
                      <span className="font-bold text-violet-300">{s.rollNo}</span>
                      <span>{s.name}</span>
                    </span>
                  ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-white/8">
              <button
                type="button"
                onClick={() => setIsBatchModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white rounded-xl hover:bg-white/5 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteBatchUpdate}
                className={`flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white shadow-lg transition-all cursor-pointer ${
                  batchTargetStatus === 'present'
                    ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30'
                    : 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/30'
                }`}
              >
                {batchTargetStatus === 'present' ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <X className="w-4 h-4" />
                )}
                <span>
                  Confirm Mark {batchTargetStatus === 'present' ? 'Present' : 'Absent'} ({selectedIds.size})
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
