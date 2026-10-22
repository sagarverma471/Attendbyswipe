import React, { useState, Suspense, lazy } from 'react';
import { Classroom, Student } from '../../types/attendance';
import {
  Building,
  Plus,
  Users,
  Percent,
  Calendar,
  X,
  ArrowRight,
  Archive,
  Upload,
  FileText,
} from 'lucide-react';
import { ClassroomCard } from '../cards/ClassroomCard';

const UploadStudentListModal = lazy(() =>
  import('./UploadStudentListModal').then((m) => ({ default: m.UploadStudentListModal }))
);

interface ClassroomManagerProps {
  classrooms: Classroom[];
  students?: Student[];
  onCreateClassroom: (classroom: Classroom) => void;
  onSelectClassroom: (classroom: Classroom) => void;
  onLaunchQRAttendance?: (classroom: Classroom) => void;
  onImportStudents?: (imported: Student[]) => void;
  onBack: () => void;
}

export const ClassroomManager: React.FC<ClassroomManagerProps> = ({
  classrooms,
  students = [],
  onCreateClassroom,
  onSelectClassroom,
  onLaunchQRAttendance,
  onImportStudents,
  onBack,
}) => {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploadClassroomId, setUploadClassroomId] = useState<string>('class-me-1f');

  // Pre-filled with BIT Sindri dummy data for trial tests
  const [formData, setFormData] = useState<Partial<Classroom>>({
    name: 'B.Tech CSE - 1st Year - Section A',
    institutionType: 'College',
    department: 'Computer Science & Engineering',
    academicYear: '2026-2027',
    year: '1st Year',
    semester: '1st Semester',
    section: 'A',
    attendanceThreshold: 75,
    studentCount: 60,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newClass: Classroom = {
      id: `class-${Date.now()}`,
      name: formData.name || 'New Classroom',
      institutionType: formData.institutionType || 'College',
      department: formData.department || 'Computer Science',
      academicYear: formData.academicYear || '2026-2027',
      year: formData.year || '1st Year',
      semester: formData.semester || '1st Semester',
      section: formData.section || 'A',
      attendanceThreshold: formData.attendanceThreshold || 75,
      studentCount: formData.studentCount || 50,
      lastAttendanceDate: new Date().toISOString().split('T')[0],
    };
    onCreateClassroom(newClass);
    setIsCreateOpen(false);
  };

  return (
    <div className="max-w-7xl mx-auto py-4 sm:py-6 lg:py-8 px-3 sm:px-6 lg:px-8 space-y-4 sm:space-y-6 animate-fade-in overflow-x-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-white font-['Plus_Jakarta_Sans'] tracking-tight">
            Classroom Management
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Maintain classroom profiles, departments, sections, and attendance policies.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setUploadClassroomId('class-me-1f');
              setIsUploadOpen(true);
            }}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 hover:text-white border border-emerald-500/30 font-bold text-xs transition-all cursor-pointer"
            title="Upload student list / Bully PDF roster"
          >
            <Upload className="w-4 h-4 text-emerald-400" />
            <span>Upload PDF / Roster</span>
          </button>
          <button
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs shadow-lg shadow-violet-600/30 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create Classroom</span>
          </button>
        </div>
      </div>

      {/* Bully PDF quick upload bar for Mechanical & Electrical Engineering */}
      <div className="bg-gradient-to-r from-violet-950/40 via-[#10162A] to-indigo-950/30 border border-violet-500/25 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-violet-300 shrink-0 mt-0.5 sm:mt-0">
            <FileText className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-white">Student Bully PDF Uploads</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono">
                Mech 1 & EE Ready
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Upload <strong className="text-slate-200">Mech 1 bully.pdf</strong> for Mechanical Engineering (Sec F) and <strong className="text-slate-200">EE bully.pdf</strong> for Electrical Engineering (Sec J) student details.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => {
              setUploadClassroomId('class-me-1f');
              setIsUploadOpen(true);
            }}
            className="px-3 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 hover:text-white border border-amber-500/30 text-xs font-semibold transition-colors cursor-pointer"
          >
            📄 Upload Mech 1
          </button>
          <button
            onClick={() => {
              setUploadClassroomId('class-ee-1j');
              setIsUploadOpen(true);
            }}
            className="px-3 py-1.5 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 hover:text-white border border-sky-500/30 text-xs font-semibold transition-colors cursor-pointer"
          >
            ⚡ Upload EE
          </button>
        </div>
      </div>

      {/* Grid of Classrooms */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {classrooms.map((cls) => (
          <ClassroomCard
            key={cls.id}
            classroom={cls}
            variant="manager"
            onSelect={onSelectClassroom}
            onLaunchQR={onLaunchQRAttendance}
            onUploadStudents={(targetCls) => {
              setUploadClassroomId(targetCls.id);
              setIsUploadOpen(true);
            }}
          />
        ))}
      </div>

      {/* Upload Student List Modal */}
      {isUploadOpen && (
        <Suspense fallback={null}>
          <UploadStudentListModal
            isOpen={isUploadOpen}
            onClose={() => setIsUploadOpen(false)}
            classrooms={classrooms}
            existingStudents={students}
            initialClassroomId={uploadClassroomId}
            onImportComplete={(imported) => {
              if (onImportStudents) {
                onImportStudents(imported);
              }
              setIsUploadOpen(false);
            }}
          />
        </Suspense>
      )}

      {/* CREATE CLASSROOM MODAL */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
          <div className="w-full max-w-lg bg-[#0F1424] border border-white/10 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-white/8">
              <h2 className="text-lg font-bold text-white">Create New Classroom</h2>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Institution Type</label>
                <select
                  value={formData.institutionType}
                  onChange={(e) => setFormData({ ...formData, institutionType: e.target.value as any })}
                  className="w-full bg-[#171E33] border border-white/10 rounded-xl px-3 py-2 text-white"
                >
                  <option value="College">College (BIT Sindri)</option>
                  <option value="School">School</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Classroom Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-[#171E33] border border-white/10 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Department / Branch</label>
                  <input
                    type="text"
                    required
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full bg-[#171E33] border border-white/10 rounded-xl px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Academic Year</label>
                  <input
                    type="text"
                    required
                    value={formData.academicYear}
                    onChange={(e) => setFormData({ ...formData, academicYear: e.target.value })}
                    className="w-full bg-[#171E33] border border-white/10 rounded-xl px-3 py-2 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Year</label>
                  <input
                    type="text"
                    required
                    value={formData.year}
                    onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                    className="w-full bg-[#171E33] border border-white/10 rounded-xl px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Semester</label>
                  <input
                    type="text"
                    value={formData.semester}
                    onChange={(e) => setFormData({ ...formData, semester: e.target.value })}
                    className="w-full bg-[#171E33] border border-white/10 rounded-xl px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Section</label>
                  <input
                    type="text"
                    required
                    value={formData.section}
                    onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                    className="w-full bg-[#171E33] border border-white/10 rounded-xl px-3 py-2 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Student Capacity</label>
                  <input
                    type="number"
                    value={formData.studentCount}
                    onChange={(e) => setFormData({ ...formData, studentCount: Number(e.target.value) })}
                    className="w-full bg-[#171E33] border border-white/10 rounded-xl px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Attendance Threshold (%)</label>
                  <input
                    type="number"
                    value={formData.attendanceThreshold}
                    onChange={(e) => setFormData({ ...formData, attendanceThreshold: Number(e.target.value) })}
                    className="w-full bg-[#171E33] border border-white/10 rounded-xl px-3 py-2 text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-violet-600 text-white font-bold rounded-xl shadow-lg shadow-violet-600/30"
                >
                  Create Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
