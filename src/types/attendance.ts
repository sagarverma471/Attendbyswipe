export type Role = 'teacher' | 'student' | 'admin';

export type AttendanceStatus = 'present' | 'absent' | 'unmarked';

export interface Student {
  id: string;
  name: string;
  rollNo: string;
  studentId: string;
  avatarUrl?: string;
  department: string;
  classroomId: string;
  semester: string;
  section: string;
  attendancePercentage: number;
  totalClassesHeld: number;
  totalClassesAttended: number;
  email?: string;
  gender?: 'male' | 'female';
}

export interface Classroom {
  id: string;
  name: string;
  institutionType: 'College' | 'School';
  department: string;
  academicYear: string;
  year: string;
  semester: string;
  section: string;
  attendanceThreshold: number;
  studentCount: number;
  lastAttendanceDate?: string;
  isArchived?: boolean;
}

export interface Subject {
  id: string;
  name: string;
  code: string;
  classroomId: string;
  teacherName: string;
  weeklyClasses: number;
  academicYear: string;
}

export interface TimetableEntry {
  id: string;
  classroomId: string;
  subjectId: string;
  subjectName: string;
  classroomName: string;
  section: string;
  timeSlot: string;
  period: number;
  teacherName: string;
  day: string;
}

export interface AttendanceRecordItem {
  studentId: string;
  studentName: string;
  rollNo: string;
  avatarUrl?: string;
  status: AttendanceStatus;
  notes?: string;
  previousAttendancePercentage: number;
}

export interface AttendanceSession {
  id: string;
  classroomId: string;
  classroomName: string;
  subjectId: string;
  subjectName: string;
  date: string;
  period: number;
  markedBy: string;
  status: 'draft' | 'completed';
  records: Record<string, AttendanceStatus>; // studentId -> status
  totalStudents: number;
  presentCount: number;
  absentCount: number;
  unmarkedCount: number;
  createdAt: string;
  completedAt?: string;
  notes?: string;
  auditTrail?: AuditEntry[];
  sessionType?: 'qr' | 'swipe' | 'manual';
  syncStatus?: 'saved_offline' | 'pending' | 'synced';
  syncedAt?: string;
  updatedAt?: string;
  isOfflineFinalized?: boolean;
  studentMetadata?: Record<
    string,
    {
      method: 'QR' | 'Manual';
      timestamp?: string;
      deviceId?: string;
      verificationStatus?: string;
    }
  >;
}

export interface AuditEntry {
  id: string;
  timestamp: string;
  action: string;
  studentId?: string;
  studentName?: string;
  previousStatus?: AttendanceStatus;
  newStatus?: AttendanceStatus;
  modifiedBy: string;
  reason?: string;
}

export interface TeacherProfile {
  name: string;
  title: string;
  department: string;
  institution: string;
  avatarUrl?: string;
  email: string;
}

export type QRVerificationStatus =
  | 'verified'
  | 'duplicate'
  | 'unmatched_roll'
  | 'unmatched_name'
  | 'manual_present'
  | 'manual_absent';

export interface QRSubmissionRecord {
  id: string;
  studentId: string;
  fullName: string;
  rollNo: string;
  normalizedRollNo: string;
  department: string;
  section?: string;
  submittedAt: string;
  deviceId?: string;
  tokenUsed: string;
  verificationStatus: QRVerificationStatus;
  isDuplicate: boolean;
  isRosterMatch: boolean;
  officialRosterName?: string;
  status: AttendanceStatus;
  teacherNotes?: string;
}

export type QRSessionStatus =
  | 'created'
  | 'active'
  | 'paused'
  | 'closed'
  | 'under_review'
  | 'finalized';

export interface QRAttendanceSession {
  id: string;
  classroomId: string;
  classroomName: string;
  department?: string;
  semester?: string;
  section?: string;
  subjectId?: string;
  subjectName?: string;
  date: string;
  teacherName: string;
  currentToken: string;
  previousToken?: string | null;
  tokenExpiresAt: string;
  rotationIntervalSeconds: number;
  status: QRSessionStatus;
  createdAt: string;
  expiresAt: string;
  finalizedAt?: string;
  submissions: Record<string, QRSubmissionRecord>; // key: studentId or submissionId
  totalSubmissions: number;
  // Backward compatibility alias for existing components
  scannedStudents?: Record<string, any>;
  totalScanned?: number;
}
