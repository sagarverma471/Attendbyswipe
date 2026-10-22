import React, { useState, useRef } from 'react';
import { Student } from '../../types/attendance';
import {
  DEFAULT_MOSAIC_URL,
  TOTAL_PORTRAITS,
  MOSAIC_COLUMNS,
  MOSAIC_ROWS,
  getStudentPortraitUrl,
  cropCollageToPortraits,
} from '../../services/studentImageService';
import { X, Upload, Sparkles, Check, Image as ImageIcon, Grid, RefreshCw } from 'lucide-react';

interface StudentMosaicModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  currentStudentIndex: number;
  onApplyCroppedPortraits?: (updatedStudents: Student[]) => void;
}

export const StudentMosaicModal: React.FC<StudentMosaicModalProps> = ({
  isOpen,
  onClose,
  students,
  currentStudentIndex,
  onApplyCroppedPortraits,
}) => {
  const [selectedCell, setSelectedCell] = useState<number>(currentStudentIndex);
  const [isCropping, setIsCropping] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const currentStudent = students[currentStudentIndex];

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsCropping(true);
      setStatusMessage('Processing & cropping collage mosaic into 60 student portraits...');

      const croppedPortraits = await cropCollageToPortraits(file, MOSAIC_COLUMNS, MOSAIC_ROWS);

      if (onApplyCroppedPortraits && croppedPortraits.length > 0) {
        const updated = students.map((std, idx) => {
          const portraitIndex = idx % croppedPortraits.length;
          return {
            ...std,
            avatarUrl: croppedPortraits[portraitIndex],
          };
        });
        onApplyCroppedPortraits(updated);
        setStatusMessage(`Successfully cropped ${croppedPortraits.length} student portraits and applied to classroom!`);
      }
    } catch (err: any) {
      console.error('Collage cropping error:', err);
      setStatusMessage(`Error cropping image: ${err.message || 'Unknown error'}`);
    } finally {
      setIsCropping(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#0E1324] border border-white/15 rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-white/10 bg-[#141A2E]/60">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-violet-300">
              <Grid className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <span>Student Portrait Mosaic</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/30 font-mono">
                  72 Student Headshots (Rolls 1 to 72)
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Individual portraits cropped from diverse student collage with straight, centered faces
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isCropping}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold shadow-md transition-colors cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>{isCropping ? 'Cropping...' : 'Upload New Collage'}</span>
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept="image/*"
              className="hidden"
            />
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Status Notification */}
        {statusMessage && (
          <div className="px-4 py-2 bg-violet-950/60 border-b border-violet-500/30 text-xs text-violet-200 flex items-center justify-between">
            <span>{statusMessage}</span>
            <button
              onClick={() => setStatusMessage(null)}
              className="text-violet-400 hover:text-white ml-2 text-xs"
            >
              ✕
            </button>
          </div>
        )}

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* Active Card Highlight Banner */}
          {currentStudent && (
            <div className="p-3 sm:p-4 rounded-2xl bg-gradient-to-r from-violet-950/40 via-[#161D32] to-[#12182B] border border-violet-500/25 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden border-2 border-violet-400 shadow-lg shrink-0">
                  <img
                    src={getStudentPortraitUrl(currentStudent, currentStudentIndex)}
                    alt={currentStudent.name}
                    className="w-full h-full object-cover object-center"
                    style={{ objectFit: 'cover', objectPosition: 'center' }}
                  />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase font-bold text-violet-400">
                      Currently Active in Deck
                    </span>
                    <span className="text-xs font-mono font-bold text-slate-300">
                      #{currentStudentIndex + 1}
                    </span>
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-white truncate">
                    {currentStudent.name}
                  </h3>
                  <p className="text-xs font-mono text-slate-400">
                    Roll {currentStudent.rollNo} • ID: {currentStudent.studentId}
                  </p>
                </div>
              </div>

              <div className="hidden sm:flex flex-col items-end text-xs text-slate-400 font-mono">
                <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30">
                  {currentStudent.attendancePercentage}% Attendance
                </span>
                <span className="mt-1 text-[11px] text-slate-400">{currentStudent.department}</span>
              </div>
            </div>
          )}

          {/* Full Mosaic Grid Visual */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-semibold text-slate-300">
                12×6 Mosaic Grid (Click any face to inspect):
              </span>
              <span>Total {TOTAL_PORTRAITS} Student Headshots</span>
            </div>

            <div className="grid grid-cols-6 sm:grid-cols-12 gap-1.5 sm:gap-2 p-2 bg-[#080B14] rounded-2xl border border-white/10">
              {Array.from({ length: TOTAL_PORTRAITS }).map((_, idx) => {
                const assignedStudent = students[idx];
                const isCurrentActive = idx === currentStudentIndex;
                const isSelected = idx === selectedCell;
                const photoSrc = `/student-portraits/student_${idx}.jpg`;

                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedCell(idx)}
                    className={`group relative aspect-square rounded-xl overflow-hidden border transition-all cursor-pointer focus:outline-none ${
                      isCurrentActive
                        ? 'ring-2 ring-violet-400 border-white shadow-lg shadow-violet-500/30 scale-102 z-10'
                        : isSelected
                        ? 'border-emerald-400 ring-2 ring-emerald-400/50 scale-102 z-10'
                        : 'border-white/10 hover:border-white/40'
                    }`}
                  >
                    <img
                      src={photoSrc}
                      alt={`Portrait ${idx}`}
                      className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-200"
                      style={{ objectFit: 'cover', objectPosition: 'center' }}
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-1">
                      <span className="text-[9px] font-mono font-bold text-white leading-none">
                        #{idx + 1}
                      </span>
                    </div>

                    {isCurrentActive && (
                      <div className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-violet-400 ring-2 ring-black" />
                    )}

                    {assignedStudent && (
                      <div className="absolute bottom-0 inset-x-0 bg-black/60 backdrop-blur-xs py-0.5 text-center">
                        <span className="text-[8px] font-mono text-slate-200 truncate block px-0.5">
                          {assignedStudent.rollNo}
                        </span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-3 sm:p-4 border-t border-white/10 bg-[#141A2E]/80 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-violet-400 inline-block" />
            <span>Currently Active Deck Student</span>
            <span className="ml-3 w-2.5 h-2.5 rounded-full bg-white/40 inline-block" />
            <span>Classroom Roster Mapped</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
