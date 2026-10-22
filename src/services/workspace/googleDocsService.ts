import { Classroom, Subject, AttendanceSession, Student } from '../../types/attendance';
import { GoogleWorkspaceResult, DefaulterStudentItem } from './types';

/**
 * Creates an official formatted Google Doc Attendance Shortage Warning Notice.
 */
export async function generateDefaultersNoticeDoc(
  classroom: Classroom,
  subject: Subject,
  defaulters: DefaulterStudentItem[],
  threshold: number,
  token: string
): Promise<GoogleWorkspaceResult> {
  try {
    const title = `Official Attendance Shortage Notice - ${subject.name} - ${classroom.name}`;

    // 1. Create Google Doc
    const createRes = await fetch('https://docs.googleapis.com/v1/documents', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title,
      }),
    });

    if (!createRes.ok) {
      const err = await createRes.json().catch(() => ({}));
      throw new Error(err.error?.message || `Failed to create Google Doc (${createRes.status})`);
    }

    const docData = await createRes.json();
    const documentId = docData.documentId;
    const documentUrl = `https://docs.google.com/document/d/${documentId}/edit`;

    // 2. Build Document Text Content
    const today = new Date().toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    let docText = `BIRSA INSTITUTE OF TECHNOLOGY (BIT) SINDRI\n`;
    docText += `DEPARTMENT OF ${classroom.department.toUpperCase()}\n`;
    docText += `CAMPUS: DHANBAD, JHARKHAND - 828123\n`;
    docText += `========================================================================\n\n`;
    docText += `Ref: BIT/ATT/${new Date().getFullYear()}/${subject.code || 'UG'}\t\t\t\tDate: ${today}\n\n`;
    docText += `OFFICIAL WARNING NOTICE: ATTENDANCE SHORTAGE (< ${threshold}%)\n\n`;
    docText += `Classroom: ${classroom.name}\n`;
    docText += `Subject: ${subject.name} (${subject.code})\n`;
    docText += `Course In-charge: ${subject.teacherName}\n\n`;
    docText += `As per University and Academic Council Regulations, a minimum of ${threshold}% attendance in theory and laboratory classes is mandatory to appear in End Semester Examinations.\n\n`;
    docText += `The following students currently fall short of the required ${threshold}% attendance threshold in ${subject.name}:\n\n`;
    docText += `------------------------------------------------------------------------\n`;
    docText += `S.No\tRoll No\t\tStudent Name\t\tAttendance %\tAttended / Held\n`;
    docText += `------------------------------------------------------------------------\n`;

    if (defaulters.length === 0) {
      docText += `Nil. (All enrolled students currently meet the required ${threshold}% threshold!)\n`;
    } else {
      defaulters.forEach((d, idx) => {
        docText += `${idx + 1}\t${d.rollNo}\t\t${d.name}\t\t${d.percentage}%\t\t${d.attended} / ${d.held}\n`;
      });
    }

    docText += `------------------------------------------------------------------------\n\n`;
    docText += `ACTION REQUIRED:\n`;
    docText += `All students listed above are directed to meet the undersigned faculty in-charge within 3 working days with relevant justifications (medical certificates, official representations). Failure to regularize attendance may lead to debarment from examination.\n\n\n`;
    docText += `(Dr. Ankit Sharma / Faculty In-Charge)\t\t\t\tHead of Department\n`;
    docText += `SwipeAttend Smart Attendance System\t\t\t\tBIT Sindri, Dhanbad\n`;

    // 3. Insert Text into Document via batchUpdate
    const updateRes = await fetch(`https://docs.googleapis.com/v1/documents/${documentId}:batchUpdate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requests: [
          {
            insertText: {
              location: {
                index: 1,
              },
              text: docText,
            },
          },
        ],
      }),
    });

    if (!updateRes.ok) {
      const err = await updateRes.json().catch(() => ({}));
      throw new Error(err.error?.message || `Failed to populate Google Doc text (${updateRes.status})`);
    }

    return {
      success: true,
      id: documentId,
      url: documentUrl,
      title,
    };
  } catch (err: any) {
    console.error('Error in generateDefaultersNoticeDoc:', err);
    return {
      success: false,
      error: err.message || 'Failed to create Google Doc',
    };
  }
}

/**
 * Creates an official single session attendance record in Google Docs.
 */
export async function generateSessionReportDoc(
  session: AttendanceSession,
  students: Student[],
  token: string
): Promise<GoogleWorkspaceResult> {
  try {
    const title = `SwipeAttend Session Report - ${session.subjectName} (${session.date})`;

    const createRes = await fetch('https://docs.googleapis.com/v1/documents', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title,
      }),
    });

    if (!createRes.ok) {
      const err = await createRes.json().catch(() => ({}));
      throw new Error(err.error?.message || `Failed to create Google Doc (${createRes.status})`);
    }

    const docData = await createRes.json();
    const documentId = docData.documentId;
    const documentUrl = `https://docs.google.com/document/d/${documentId}/edit`;

    const relevantStudents = students.filter(
      (s) => s.classroomId === session.classroomId || session.records[s.id] !== undefined
    );
    const sorted = [...relevantStudents].sort((a, b) => {
      const numA = parseInt(a.rollNo.replace(/\D/g, ''), 10);
      const numB = parseInt(b.rollNo.replace(/\D/g, ''), 10);
      if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
      return a.rollNo.localeCompare(b.rollNo);
    });

    let docText = `BIRSA INSTITUTE OF TECHNOLOGY (BIT) SINDRI\n`;
    docText += `OFFICIAL CLASSROOM ATTENDANCE LEDGER\n`;
    docText += `========================================================================\n\n`;
    docText += `Subject: ${session.subjectName}\n`;
    docText += `Classroom: ${session.classroomName}\n`;
    docText += `Date: ${session.date} | Period: Period ${session.period}\n`;
    docText += `Faculty: ${session.markedBy || 'Faculty In-Charge'}\n`;
    docText += `Attendance Mode: ${session.sessionType?.toUpperCase() || 'SWIPE'}\n`;
    if (session.notes) docText += `Topic / Notes: ${session.notes}\n`;
    docText += `\n`;
    docText += `------------------------------------------------------------------------\n`;
    docText += `Roll No\t\tStudent Name\t\tStatus\t\tMethod\n`;
    docText += `------------------------------------------------------------------------\n`;

    sorted.forEach((std) => {
      const status = (session.records[std.id] || 'unmarked').toUpperCase();
      const method = session.studentMetadata?.[std.id]?.method || (session.sessionType === 'qr' ? 'QR' : 'Swipe');
      docText += `${std.rollNo}\t\t${std.name}\t\t${status}\t\t${method}\n`;
    });

    docText += `------------------------------------------------------------------------\n`;
    const present = sorted.filter((s) => session.records[s.id] === 'present').length;
    const absent = sorted.filter((s) => session.records[s.id] === 'absent').length;
    docText += `Total Students: ${sorted.length} | Present: ${present} | Absent: ${absent} (${sorted.length > 0 ? Math.round((present / sorted.length) * 100) : 0}%)\n\n`;
    docText += `Generated by SwipeAttend — Verified in Cloud Database\n`;

    await fetch(`https://docs.googleapis.com/v1/documents/${documentId}:batchUpdate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requests: [
          {
            insertText: {
              location: {
                index: 1,
              },
              text: docText,
            },
          },
        ],
      }),
    });

    return {
      success: true,
      id: documentId,
      url: documentUrl,
      title,
    };
  } catch (err: any) {
    console.error('Error in generateSessionReportDoc:', err);
    return {
      success: false,
      error: err.message || 'Failed to export session to Google Docs',
    };
  }
}
