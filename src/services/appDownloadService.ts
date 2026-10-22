import { Student, AttendanceSession, Classroom } from '../types/attendance';

export interface DownloadAppInfo {
  success: boolean;
  appName: string;
  filename: string;
  sizeMB: string;
  downloadUrl: string;
  directStaticUrl: string;
  version: string;
  totalFiles?: number;
  instructions: string[];
}

/**
 * Triggers the direct download of the packaged SwipeAttend App ZIP file.
 */
export function downloadAppZip(): void {
  try {
    const link = document.createElement('a');
    link.href = '/api/download-app';
    link.download = 'SwipeAttend-BIT-Sindri-App.zip';
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (err) {
    console.error('Error triggering /api/download-app, falling back to static zip', err);
    // Fallback directly to static asset
    const fallbackLink = document.createElement('a');
    fallbackLink.href = '/SwipeAttend-App.zip';
    fallbackLink.download = 'SwipeAttend-BIT-Sindri-App.zip';
    document.body.appendChild(fallbackLink);
    fallbackLink.click();
    document.body.removeChild(fallbackLink);
  }
}

/**
 * Exports current app data (students, sessions, classrooms) as a downloadable JSON backup file.
 */
export function downloadAppDataBackup(data: {
  students: Student[];
  sessions: AttendanceSession[];
  classrooms?: Classroom[];
}): void {
  try {
    const payload = {
      exportTimestamp: new Date().toISOString(),
      institution: 'BIT Sindri',
      system: 'SwipeAttend v1.0.0',
      totalStudents: data.students.length,
      totalSessions: data.sessions.length,
      data,
    };
    const jsonStr = JSON.stringify(payload, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SwipeAttend-Database-Backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error('Failed to export data backup:', err);
  }
}
