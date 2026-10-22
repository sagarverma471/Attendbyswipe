import { AttendanceSession, Student, Classroom, Subject } from '../../types/attendance';
import { GoogleWorkspaceResult } from './types';

/**
 * Creates a formatted Google Sheet for a single attendance session.
 */
export async function exportSessionToGoogleSheet(
  session: AttendanceSession,
  students: Student[],
  token: string
): Promise<GoogleWorkspaceResult> {
  try {
    const title = `SwipeAttend - ${session.subjectName} - ${session.date}`;

    // 1. Create Spreadsheet
    const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        properties: {
          title,
        },
      }),
    });

    if (!createRes.ok) {
      const err = await createRes.json().catch(() => ({}));
      throw new Error(err.error?.message || `Failed to create Google Sheet (${createRes.status})`);
    }

    const spreadsheet = await createRes.json();
    const spreadsheetId = spreadsheet.spreadsheetId;
    const spreadsheetUrl = spreadsheet.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

    // 2. Prepare Rows
    const relevantStudents = students.filter(
      (s) => s.classroomId === session.classroomId || session.records[s.id] !== undefined
    );
    const sortedStudents = [...relevantStudents].sort((a, b) => {
      const numA = parseInt(a.rollNo.replace(/\D/g, ''), 10);
      const numB = parseInt(b.rollNo.replace(/\D/g, ''), 10);
      if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
      return a.rollNo.localeCompare(b.rollNo);
    });

    const values: (string | number)[][] = [
      ['BIRSA INSTITUTE OF TECHNOLOGY (BIT) SINDRI'],
      ['ATTENDANCE SESSION RECORD — SwipeAttend Cloud System'],
      [''],
      ['Subject:', session.subjectName, '', 'Date:', session.date],
      ['Classroom:', session.classroomName, '', 'Period:', `Period ${session.period}`],
      ['Faculty:', session.markedBy || 'Faculty In-Charge', '', 'Session Type:', session.sessionType?.toUpperCase() || 'SWIPE'],
      [''],
      ['#', 'Roll No', 'Student Name', 'College ID', 'Attendance Status', 'Method', 'Timestamp'],
    ];

    sortedStudents.forEach((std, idx) => {
      const status = session.records[std.id] || 'unmarked';
      const meta = session.studentMetadata?.[std.id];
      values.push([
        idx + 1,
        std.rollNo,
        std.name,
        std.studentId,
        status.toUpperCase(),
        meta?.method || (session.sessionType === 'qr' ? 'QR Code' : 'Swipe Arena'),
        meta?.timestamp || '-',
      ]);
    });

    // Summary statistics block
    const presentCount = sortedStudents.filter((s) => session.records[s.id] === 'present').length;
    const absentCount = sortedStudents.filter((s) => session.records[s.id] === 'absent').length;
    const totalCount = sortedStudents.length;
    const pct = totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0;

    values.push(['']);
    values.push(['SUMMARY STATISTICS', '', '', '', '', '', '']);
    values.push(['Total Enrolled:', totalCount, '', 'Total Present:', presentCount, 'Present %:', `${pct}%`]);
    values.push(['Total Absent:', absentCount, '', '', '', '', '']);
    values.push(['Generated automatically by SwipeAttend BIT Sindri System at:', new Date().toLocaleString()]);

    // 3. Populate Values via dynamic first sheet name (avoiding hardcoded 'Sheet1' per best practices)
    const firstSheetTitle = spreadsheet.sheets?.[0]?.properties?.title || 'Sheet1';
    const firstSheetId = spreadsheet.sheets?.[0]?.properties?.sheetId ?? 0;
    const encodedRange = encodeURIComponent(`${firstSheetTitle}!A1`);

    const updateRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodedRange}?valueInputOption=USER_ENTERED`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          range: `${firstSheetTitle}!A1`,
          majorDimension: 'ROWS',
          values,
        }),
      }
    );

    if (!updateRes.ok) {
      const err = await updateRes.json().catch(() => ({}));
      throw new Error(err.error?.message || `Failed to populate Google Sheet (${updateRes.status})`);
    }

    // 4. Polish formatting via batchUpdate (header styles & column auto-resize)
    try {
      await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requests: [
            {
              autoResizeDimensions: {
                dimensions: {
                  sheetId: firstSheetId,
                  dimension: 'COLUMNS',
                  startIndex: 0,
                  endIndex: 8,
                },
              },
            },
            {
              repeatCell: {
                range: {
                  sheetId: firstSheetId,
                  startRowIndex: 0,
                  endRowIndex: 2,
                  startColumnIndex: 0,
                  endColumnIndex: 7,
                },
                cell: {
                  userEnteredFormat: {
                    backgroundColor: { red: 0.08, green: 0.12, blue: 0.22 },
                    textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 }, fontSize: 11 },
                  },
                },
                fields: 'userEnteredFormat(backgroundColor,textFormat)',
              },
            },
            {
              repeatCell: {
                range: {
                  sheetId: firstSheetId,
                  startRowIndex: 7,
                  endRowIndex: 8,
                  startColumnIndex: 0,
                  endColumnIndex: 7,
                },
                cell: {
                  userEnteredFormat: {
                    backgroundColor: { red: 0.06, green: 0.45, blue: 0.28 },
                    textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 }, fontSize: 10 },
                  },
                },
                fields: 'userEnteredFormat(backgroundColor,textFormat)',
              },
            },
          ],
        }),
      });
    } catch {
      // Styling is non-blocking
    }

    return {
      success: true,
      id: spreadsheetId,
      url: spreadsheetUrl,
      title,
    };
  } catch (err: any) {
    console.error('Error in exportSessionToGoogleSheet:', err);
    return {
      success: false,
      error: err.message || 'Unknown error exporting to Google Sheets',
    };
  }
}

/**
 * Creates a cumulative multi-column classroom attendance spreadsheet in Google Sheets.
 */
export async function exportClassroomSummaryToGoogleSheet(
  classroom: Classroom,
  subjects: Subject[],
  sessions: AttendanceSession[],
  students: Student[],
  token: string
): Promise<GoogleWorkspaceResult> {
  try {
    const title = `SwipeAttend Roster - ${classroom.name}`;

    const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        properties: {
          title,
        },
      }),
    });

    if (!createRes.ok) {
      const err = await createRes.json().catch(() => ({}));
      throw new Error(err.error?.message || `Failed to create Google Sheet (${createRes.status})`);
    }

    const spreadsheet = await createRes.json();
    const spreadsheetId = spreadsheet.spreadsheetId;
    const spreadsheetUrl = spreadsheet.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

    const classStudents = students.filter((s) => s.classroomId === classroom.id);
    const sortedStudents = [...classStudents].sort((a, b) => {
      const numA = parseInt(a.rollNo.replace(/\D/g, ''), 10);
      const numB = parseInt(b.rollNo.replace(/\D/g, ''), 10);
      if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
      return a.rollNo.localeCompare(b.rollNo);
    });

    const completedSessions = sessions.filter(
      (s) => s.classroomId === classroom.id && s.status === 'completed'
    );

    const values: (string | number)[][] = [
      ['BIRSA INSTITUTE OF TECHNOLOGY (BIT) SINDRI'],
      [`CUMULATIVE ATTENDANCE ROSTER — ${classroom.name}`],
      ['Department:', classroom.department, 'Academic Year:', classroom.academicYear, 'Threshold:', `${classroom.attendanceThreshold}%`],
      ['Total Completed Lectures:', completedSessions.length, 'Enrolled Strength:', sortedStudents.length],
      [''],
      ['#', 'Roll No', 'Student Name', 'College ID', 'Attended', 'Total Held', 'Attendance %', 'Status (Threshold)'],
    ];

    sortedStudents.forEach((std, idx) => {
      let attended = 0;
      let held = 0;
      completedSessions.forEach((sess) => {
        const st = sess.records[std.id];
        if (st === 'present') {
          attended++;
          held++;
        } else if (st === 'absent') {
          held++;
        }
      });

      const pct = held > 0 ? Math.round((attended / held) * 100) : 0;
      const isDefaulter = pct < classroom.attendanceThreshold;

      values.push([
        idx + 1,
        std.rollNo,
        std.name,
        std.studentId,
        attended,
        held,
        `${pct}%`,
        isDefaulter ? 'WARNING (< 75%)' : 'Eligible',
      ]);
    });

    const firstSheetTitle = spreadsheet.sheets?.[0]?.properties?.title || 'Sheet1';
    const firstSheetId = spreadsheet.sheets?.[0]?.properties?.sheetId ?? 0;
    const encodedRange = encodeURIComponent(`${firstSheetTitle}!A1`);

    await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodedRange}?valueInputOption=USER_ENTERED`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          range: `${firstSheetTitle}!A1`,
          majorDimension: 'ROWS',
          values,
        }),
      }
    );

    // Auto-resize columns
    try {
      await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requests: [
            {
              autoResizeDimensions: {
                dimensions: {
                  sheetId: firstSheetId,
                  dimension: 'COLUMNS',
                  startIndex: 0,
                  endIndex: 8,
                },
              },
            },
          ],
        }),
      });
    } catch {
      // Non-blocking
    }

    return {
      success: true,
      id: spreadsheetId,
      url: spreadsheetUrl,
      title,
    };
  } catch (err: any) {
    console.error('Error in exportClassroomSummaryToGoogleSheet:', err);
    return {
      success: false,
      error: err.message || 'Failed to export classroom to Google Sheets',
    };
  }
}

/**
 * Creates a comprehensive multi-session historical attendance ledger in Google Sheets.
 */
export async function exportHistoricalSessionsToGoogleSheet(
  sessions: AttendanceSession[],
  students: Student[],
  filterTitle: string,
  token: string
): Promise<GoogleWorkspaceResult> {
  try {
    const title = `SwipeAttend History - ${filterTitle} (${new Date().toISOString().split('T')[0]})`;

    const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        properties: {
          title,
        },
      }),
    });

    if (!createRes.ok) {
      const err = await createRes.json().catch(() => ({}));
      throw new Error(err.error?.message || `Failed to create Google Sheet (${createRes.status})`);
    }

    const spreadsheet = await createRes.json();
    const spreadsheetId = spreadsheet.spreadsheetId;
    const spreadsheetUrl = spreadsheet.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

    const values: (string | number)[][] = [
      ['BIRSA INSTITUTE OF TECHNOLOGY (BIT) SINDRI'],
      [`HISTORICAL ATTENDANCE LEDGER — ${filterTitle.toUpperCase()}`],
      ['Generated at:', new Date().toLocaleString(), 'Total Sessions Exported:', sessions.length],
      [''],
      ['SESSION SUMMARY TABLE'],
      ['Session ID', 'Date', 'Subject', 'Classroom', 'Period', 'Type', 'Present', 'Absent', 'Total', 'Present %'],
    ];

    sessions.forEach((s) => {
      const total = s.totalStudents || Object.keys(s.records).length || 0;
      const present = s.presentCount || Object.values(s.records).filter((st) => st === 'present').length;
      const absent = s.absentCount || Object.values(s.records).filter((st) => st === 'absent').length;
      const pct = total > 0 ? Math.round((present / total) * 100) : 0;
      values.push([
        s.id,
        s.date,
        s.subjectName,
        s.classroomName,
        `Period ${s.period}`,
        s.sessionType?.toUpperCase() || 'SWIPE',
        present,
        absent,
        total,
        `${pct}%`,
      ]);
    });

    values.push(['']);
    values.push(['DETAILED STUDENT ATTENDANCE LOG']);
    values.push(['#', 'Session Date', 'Subject', 'Classroom', 'Roll No', 'Student Name', 'College ID', 'Status', 'Method', 'Timestamp']);

    let rowIdx = 1;
    sessions.forEach((sess) => {
      const sessStudents = students.filter(
        (st) => st.classroomId === sess.classroomId || sess.records[st.id] !== undefined
      );
      const sorted = [...sessStudents].sort((a, b) => {
        const numA = parseInt(a.rollNo.replace(/\D/g, ''), 10);
        const numB = parseInt(b.rollNo.replace(/\D/g, ''), 10);
        if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
        return a.rollNo.localeCompare(b.rollNo);
      });

      sorted.forEach((std) => {
        const status = sess.records[std.id] || 'unmarked';
        const meta = sess.studentMetadata?.[std.id];
        values.push([
          rowIdx++,
          sess.date,
          sess.subjectName,
          sess.classroomName,
          std.rollNo,
          std.name,
          std.studentId,
          status.toUpperCase(),
          meta?.method || (sess.sessionType === 'qr' ? 'QR Code' : 'Swipe'),
          meta?.timestamp || '-',
        ]);
      });
    });

    const firstSheetTitle = spreadsheet.sheets?.[0]?.properties?.title || 'Sheet1';
    const firstSheetId = spreadsheet.sheets?.[0]?.properties?.sheetId ?? 0;
    const encodedRange = encodeURIComponent(`${firstSheetTitle}!A1`);

    await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodedRange}?valueInputOption=USER_ENTERED`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          range: `${firstSheetTitle}!A1`,
          majorDimension: 'ROWS',
          values,
        }),
      }
    );

    // Auto-resize columns
    try {
      await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requests: [
            {
              autoResizeDimensions: {
                dimensions: {
                  sheetId: firstSheetId,
                  dimension: 'COLUMNS',
                  startIndex: 0,
                  endIndex: 10,
                },
              },
            },
            {
              repeatCell: {
                range: {
                  sheetId: firstSheetId,
                  startRowIndex: 0,
                  endRowIndex: 2,
                  startColumnIndex: 0,
                  endColumnIndex: 10,
                },
                cell: {
                  userEnteredFormat: {
                    backgroundColor: { red: 0.08, green: 0.12, blue: 0.22 },
                    textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 }, fontSize: 11 },
                  },
                },
                fields: 'userEnteredFormat(backgroundColor,textFormat)',
              },
            },
            {
              repeatCell: {
                range: {
                  sheetId: firstSheetId,
                  startRowIndex: 5,
                  endRowIndex: 6,
                  startColumnIndex: 0,
                  endColumnIndex: 10,
                },
                cell: {
                  userEnteredFormat: {
                    backgroundColor: { red: 0.06, green: 0.45, blue: 0.28 },
                    textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 }, fontSize: 10 },
                  },
                },
                fields: 'userEnteredFormat(backgroundColor,textFormat)',
              },
            },
          ],
        }),
      });
    } catch {
      // Non-blocking
    }

    return {
      success: true,
      id: spreadsheetId,
      url: spreadsheetUrl,
      title,
    };
  } catch (err: any) {
    console.error('Error in exportHistoricalSessionsToGoogleSheet:', err);
    return {
      success: false,
      error: err.message || 'Failed to export historical sessions to Google Sheets',
    };
  }
}
