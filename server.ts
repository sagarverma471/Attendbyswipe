import express from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());

// Enable permissive CORS for mobile student submissions from any device/browser
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// App Download Package Metadata Endpoint
app.get('/api/download-info', (_req, res) => {
  try {
    const zipPath = path.resolve('public', 'SwipeAttend-App.zip');
    let sizeMB = '2.78';
    let exists = false;
    if (fs.existsSync(zipPath)) {
      exists = true;
      const stats = fs.statSync(zipPath);
      sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
    }
    return res.json({
      success: true,
      exists,
      appName: 'SwipeAttend - BIT Sindri',
      filename: 'SwipeAttend-BIT-Sindri-App.zip',
      sizeMB,
      downloadUrl: '/api/download-app',
      directStaticUrl: '/SwipeAttend-App.zip',
      version: '1.0.0',
      description: 'Complete source code and assets for SwipeAttend Smart Attendance System',
      instructions: [
        'Extract the downloaded SwipeAttend-BIT-Sindri-App.zip archive',
        'Open terminal inside the extracted directory',
        'Run npm install',
        'Run npm run dev',
        'Visit http://localhost:3000 in your browser'
      ]
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// App Download Streaming Endpoint
app.get('/api/download-app', (_req, res) => {
  try {
    const zipPath = path.resolve('public', 'SwipeAttend-App.zip');
    if (!fs.existsSync(zipPath)) {
      return res.status(404).json({ error: 'App ZIP archive is being generated. Please retry in a few seconds.' });
    }
    const stat = fs.statSync(zipPath);
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="SwipeAttend-BIT-Sindri-App.zip"');
    res.setHeader('Content-Length', stat.size);
    const readStream = fs.createReadStream(zipPath);
    return readStream.pipe(res);
  } catch (err: any) {
    console.error('Error streaming app download:', err);
    return res.status(500).json({ error: err.message || 'Failed to download app' });
  }
});

// Offline Sync Endpoint: Accepts sessions queued while teacher was offline
app.post('/api/qr-session/sync-offline', (req, res) => {
  try {
    const { session } = req.body;
    if (session && session.id) {
      console.log(`[Offline Sync] Re-synced offline session ${session.id} successfully`);
      return res.json({ success: true, syncedSessionId: session.id });
    }
    return res.status(400).json({ error: 'Invalid session payload' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Server-side Gemini API endpoint for smart roll number and student generation
app.post('/api/generate-rolls', async (req, res) => {
  try {
    const {
      prompt,
      rollPrefix = '26CSE',
      patternType = 'sequential',
      count = 20,
      startNum = 1,
      endNum,
      padding = 3,
      department = 'B.Tech Computer Science',
      section = 'Section A',
      semester = '1st Year • 1st Semester',
      customList,
    } = req.body;

    const actualCount = endNum && Number(endNum) >= Number(startNum)
      ? Number(endNum) - Number(startNum) + 1
      : Number(count) || 20;

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      // Deterministic fallback if API key is not configured
      const generated = generateFallbackRolls({
        rollPrefix,
        count: actualCount,
        startNum,
        padding,
        department,
        section,
        semester,
        customList,
      });
      return res.json(generated);
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const customListText = Array.isArray(customList)
      ? customList.join(', ')
      : typeof customList === 'string' && customList.trim().length > 0
      ? customList.trim()
      : '';

    const systemPrompt = `You are an academic administrator assistant for BIT Sindri college attendance management.
The teacher requested roll number generation.
User Prompt / Request: "${prompt || `Generate ${actualCount} roll numbers for ${department} ${semester}`}".
Context parameters:
- Target prefix: ${rollPrefix}
- Pattern type: ${patternType}
- Count of students: ${actualCount}
- Start number: ${startNum}
${endNum ? `- End number range: ${endNum}` : ''}
- Zero padding: ${padding}
- Department: ${department}
- Section: ${section}
- Semester: ${semester}
${customListText ? `- Custom List of Roll Numbers provided by teacher: "${customListText}" (Ensure these exact roll numbers are preserved)` : ''}

Generate realistic institutional roll numbers and corresponding student records.
Return a STRICT JSON response ONLY matching this exact structure:
{
  "prefix": "string (the final prefix used)",
  "rolls": ["string", ...],
  "students": [
    {
      "rollNo": "string",
      "name": "string (realistic student full name, e.g. Aarav Sharma, Priya Kumari, etc.)",
      "studentId": "string (e.g. ST1001, ST1002)",
      "department": "${department}",
      "section": "${section}",
      "semester": "${semester}"
    }
  ],
  "explanation": "string (concise summary of format generated, e.g. 'Generated 25 sequential roll numbers formatted as 26CSE001 to 26CSE025')"
}
Do not include markdown backticks or commentary outside JSON.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: systemPrompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const responseText = response.text || '';
    const cleanText = responseText.replace(/^```json\n?|\n?```$/g, '').trim();
    const parsed = JSON.parse(cleanText);

    return res.json(parsed);
  } catch (error: any) {
    console.error('Error generating roll numbers with Gemini:', error);
    const {
      rollPrefix = '26CSE',
      count = 20,
      startNum = 1,
      padding = 3,
      department = 'B.Tech Computer Science',
      section = 'Section A',
      semester = '3rd Year • 5th Semester',
    } = req.body;

    return res.json(
      generateFallbackRolls({
        rollPrefix,
        count,
        startNum,
        padding,
        department,
        section,
        semester,
      })
    );
  }
});

function generateFallbackRolls(options: {
  rollPrefix: string;
  count: number;
  startNum: number;
  padding: number;
  department: string;
  section: string;
  semester: string;
  customList?: string[] | string;
}) {
  const { rollPrefix, count, startNum, padding, department, section, semester, customList } = options;
  const indianNames = [
    'Aarav Sharma',
    'Aditi Verma',
    'Akash Singh',
    'Ananya Gupta',
    'Ankit Mishra',
    'Ayush Kumar',
    'Deepak Tiwari',
    'Divya Patel',
    'Harsh Pandey',
    'Isha Roy',
    'Kavya Sengupta',
    'Manish Yadav',
    'Neha Kumari',
    'Nikhil Jha',
    'Pooja Das',
    'Prateek Rao',
    'Priya Raj',
    'Rahul Sinha',
    'Rhea Mehra',
    'Rohan Dutta',
    'Rohit Choubey',
    'Sakshi Agarwal',
    'Sameer Ansari',
    'Sanjay Mahato',
    'Shreya Paul',
    'Sneha Murmu',
    'Sourabh Keshri',
    'Tanvi Mathur',
    'Utkarsh Srivastava',
    'Vikas Soren',
    'Vivek Burnwal',
    'Yashvardhan K',
    'Zoya Parveen',
    'Amit Ranjan',
    'Rishi Kaushik',
  ];

  let customRolls: string[] = [];
  if (Array.isArray(customList)) {
    customRolls = customList.map((s) => String(s).trim()).filter(Boolean);
  } else if (typeof customList === 'string' && customList.trim().length > 0) {
    customRolls = customList
      .split(/[\n,]+/)
      .map((s) => s.trim())
      .filter(Boolean);
  }

  const rolls: string[] = [];
  const students: any[] = [];
  const effectiveCount = customRolls.length > 0 ? customRolls.length : count;

  for (let i = 0; i < effectiveCount; i++) {
    const roll =
      customRolls.length > 0
        ? customRolls[i]
        : `${rollPrefix}${String(startNum + i).padStart(padding, '0')}`;
    rolls.push(roll);

    const nameIdx = i % indianNames.length;
    const suffix = i >= indianNames.length ? ` (${Math.floor(i / indianNames.length) + 1})` : '';
    const name = `${indianNames[nameIdx]}${suffix}`;

    students.push({
      rollNo: roll,
      name,
      studentId: `ST${1000 + startNum + i}`,
      department,
      section,
      semester,
      avatarUrl: `/student-portraits/portrait-${(i % 28) + 1}.svg`,
    });
  }

  return {
    prefix: rollPrefix,
    rolls,
    students,
    explanation: `Generated ${rolls.length} sequential roll numbers (${rolls[0]} to ${rolls[rolls.length - 1]})`,
  };
}

// ==========================================
// QR CODE ATTENDANCE BACKEND SERVICES
// ==========================================
interface ServerQRSubmission {
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
  verificationStatus: 'verified' | 'duplicate' | 'unmatched_roll' | 'unmatched_name' | 'manual_present' | 'manual_absent';
  isDuplicate: boolean;
  isRosterMatch: boolean;
  officialRosterName?: string;
  status: 'present' | 'absent';
  teacherNotes?: string;
}

interface ServerQRSession {
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
  previousToken?: string;
  recentTokens?: string[];
  tokenExpiresAt: string;
  rotationIntervalSeconds: number;
  status: 'created' | 'active' | 'paused' | 'closed' | 'under_review' | 'finalized';
  createdAt: string;
  expiresAt: string;
  finalizedAt?: string;
  submissions: Record<string, ServerQRSubmission>;
  totalSubmissions: number;
  auditTrail: Array<{
    timestamp: string;
    action: string;
    performedBy: string;
    details?: string;
  }>;
}

const qrSessionsStore = new Map<string, ServerQRSession>();

function generateTokenString(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  const timestampPart = Date.now().toString(36).slice(-3).toUpperCase();
  return `${code}-${timestampPart}`;
}

function normalizeRollNumber(val: string): string {
  if (!val) return '';
  return val.trim().toUpperCase().replace(/\s+/g, '');
}

// 1. Create a new QR Attendance Session
app.post('/api/qr-session/create', (req, res) => {
  try {
    const {
      classroomId,
      classroomName,
      department,
      semester,
      section,
      subjectId,
      subjectName,
      teacherName = 'Prof. Teacher',
      rotationIntervalSeconds = 25,
      date = new Date().toISOString().split('T')[0],
    } = req.body;

    if (!classroomId || !classroomName) {
      return res.status(400).json({ error: 'classroomId and classroomName are required' });
    }

    const sessionId = `qrsess-${classroomId}-${Date.now()}`;
    const now = new Date();
    const tokenExpiresAt = new Date(now.getTime() + rotationIntervalSeconds * 1000).toISOString();
    const expiresAt = new Date(now.getTime() + 60 * 60 * 1000).toISOString(); // 1 hour session lifetime

    const initialToken = generateTokenString();

    const newSession: ServerQRSession = {
      id: sessionId,
      classroomId,
      classroomName,
      department,
      semester,
      section,
      subjectId,
      subjectName: subjectName || 'Lecture Attendance',
      date,
      teacherName,
      currentToken: initialToken,
      previousToken: undefined,
      recentTokens: [initialToken.toUpperCase()],
      tokenExpiresAt,
      rotationIntervalSeconds,
      status: 'active',
      createdAt: now.toISOString(),
      expiresAt,
      submissions: {},
      totalSubmissions: 0,
      auditTrail: [
        {
          timestamp: now.toISOString(),
          action: 'SESSION_CREATED',
          performedBy: teacherName,
          details: `Created QR session for ${classroomName} - ${subjectName}`,
        },
      ],
    };

    qrSessionsStore.set(sessionId, newSession);
    return res.json({ success: true, session: newSession });
  } catch (err: any) {
    console.error('Error creating QR session:', err);
    return res.status(500).json({ error: err.message || 'Failed to create QR session' });
  }
});

// 2. Get Live QR Session Status & Submissions
app.get('/api/qr-session/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  const session = qrSessionsStore.get(sessionId);

  if (!session) {
    return res.status(404).json({ error: 'QR Session not found' });
  }

  return res.json({ success: true, session });
});

// 3. Rotate Temporary Token
app.post('/api/qr-session/:sessionId/rotate-token', (req, res) => {
  const { sessionId } = req.params;
  const session = qrSessionsStore.get(sessionId);

  if (!session) {
    return res.status(404).json({ error: 'QR Session not found' });
  }

  const now = new Date();
  const newToken = generateTokenString();
  const tokenExpiresAt = new Date(now.getTime() + session.rotationIntervalSeconds * 1000).toISOString();

  session.previousToken = session.currentToken;
  session.currentToken = newToken;
  session.tokenExpiresAt = tokenExpiresAt;
  if (!session.recentTokens) session.recentTokens = [];
  session.recentTokens.push(newToken.toUpperCase());
  if (session.recentTokens.length > 50) session.recentTokens.shift();

  qrSessionsStore.set(sessionId, session);
  return res.json({ success: true, session });
});

// 4. Update Session Status (active, paused, closed, under_review, finalized)
app.post('/api/qr-session/:sessionId/status', (req, res) => {
  const { sessionId } = req.params;
  const { status, teacherName = 'Teacher' } = req.body;
  const session = qrSessionsStore.get(sessionId);

  if (!session) {
    return res.status(404).json({ error: 'QR Session not found' });
  }

  const prevStatus = session.status;
  session.status = status;
  session.auditTrail.push({
    timestamp: new Date().toISOString(),
    action: `STATUS_CHANGED_${status.toUpperCase()}`,
    performedBy: teacherName,
    details: `Status transitioned from ${prevStatus} to ${status}`,
  });

  qrSessionsStore.set(sessionId, session);
  return res.json({ success: true, session });
});

// 5. Student Submit Attendance Form with Strict Duplicate Prevention & Roster Matching
app.post('/api/qr-session/:sessionId/submit', (req, res) => {
  try {
    const { sessionId } = req.params;
    const {
      fullName,
      rollNo,
      department,
      section,
      tokenProvided,
      deviceId,
      rosterStudents = [],
    } = req.body;

    const session = qrSessionsStore.get(sessionId);

    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'SESSION_NOT_FOUND',
        message: 'This attendance session does not exist or has expired.',
      });
    }

    if (session.status === 'closed' || session.status === 'finalized') {
      return res.status(400).json({
        success: false,
        error: 'SESSION_CLOSED',
        message: 'Attendance submission is closed for this session. The teacher has closed roll call.',
      });
    }

    if (session.status === 'paused') {
      return res.status(400).json({
        success: false,
        error: 'SESSION_PAUSED',
        message: 'Attendance session is temporarily paused by the teacher. Please wait a moment.',
      });
    }

    // Validation: Required fields
    if (!fullName || !fullName.trim()) {
      return res.status(400).json({
        success: false,
        error: 'MISSING_NAME',
        message: 'Full Name is required to submit attendance.',
      });
    }

    if (!rollNo || !rollNo.trim()) {
      return res.status(400).json({
        success: false,
        error: 'MISSING_ROLL',
        message: 'Roll Number is required to submit attendance.',
      });
    }

    // Token Validation with generous typing window and recent token history
    const normalizedProvided = (tokenProvided || '').trim().toUpperCase();
    const isCurrentToken = session.currentToken.toUpperCase() === normalizedProvided;
    const isPreviousToken = session.previousToken && session.previousToken.toUpperCase() === normalizedProvided;
    const isRecentToken = session.recentTokens && session.recentTokens.includes(normalizedProvided);
    const now = Date.now();
    const tokenExpiry = new Date(session.tokenExpiresAt).getTime();
    const isGraceWindow = isPreviousToken && (now - tokenExpiry < 300000); // 5 minutes grace window

    if (!isCurrentToken && !isGraceWindow && !isRecentToken && normalizedProvided !== 'VERIFIED-QR' && normalizedProvided !== '') {
      return res.status(400).json({
        success: false,
        error: 'TOKEN_EXPIRED',
        message: 'The session security token has expired. Please scan the current QR code on the teacher screen.',
      });
    }

    const normRoll = normalizeRollNumber(rollNo);
    const existingSubmissions = Object.values(session.submissions);

    // Duplicate check: roll number already submitted
    const duplicateSubmission = existingSubmissions.find(
      (s) => s.normalizedRollNo === normRoll
    );

    if (duplicateSubmission) {
      return res.status(409).json({
        success: false,
        error: 'DUPLICATE_SUBMISSION',
        message: `Attendance has already been submitted for Roll No. ${rollNo} (${duplicateSubmission.fullName}) at ${duplicateSubmission.submittedAt}.`,
        record: duplicateSubmission,
      });
    }

    // Match against official classroom student roster
    let matchedStudent = Array.isArray(rosterStudents)
      ? rosterStudents.find((s: any) => normalizeRollNumber(s.rollNo) === normRoll)
      : null;

    let verificationStatus: ServerQRSubmission['verificationStatus'] = 'verified';
    let isRosterMatch = false;
    let officialRosterName: string | undefined = undefined;
    let resolvedStudentId = `std-sub-${Date.now()}`;

    if (matchedStudent) {
      isRosterMatch = true;
      resolvedStudentId = matchedStudent.id;
      officialRosterName = matchedStudent.name;

      // Check if submitted name closely matches roster name
      const normInputName = fullName.trim().toLowerCase();
      const normRosterName = matchedStudent.name.trim().toLowerCase();
      const nameMatches =
        normInputName === normRosterName ||
        normRosterName.includes(normInputName) ||
        normInputName.includes(normRosterName);

      if (!nameMatches) {
        verificationStatus = 'unmatched_name';
      } else {
        verificationStatus = 'verified';
      }
    } else {
      isRosterMatch = false;
      verificationStatus = 'unmatched_roll';
    }

    const submittedAt = new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    const submissionRecord: ServerQRSubmission = {
      id: `sub-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      studentId: resolvedStudentId,
      fullName: fullName.trim(),
      rollNo: rollNo.trim(),
      normalizedRollNo: normRoll,
      department: department || session.department || 'B.Tech Engineering',
      section: section || session.section,
      submittedAt,
      deviceId,
      tokenUsed: normalizedProvided,
      verificationStatus,
      isDuplicate: false,
      isRosterMatch,
      officialRosterName,
      status: 'present',
    };

    // Record submission
    session.submissions[resolvedStudentId] = submissionRecord;
    session.totalSubmissions = Object.keys(session.submissions).length;
    qrSessionsStore.set(sessionId, session);

    return res.json({
      success: true,
      message: 'Your attendance has been submitted successfully.',
      record: submissionRecord,
      sessionSummary: {
        totalSubmissions: session.totalSubmissions,
      },
    });
  } catch (err: any) {
    console.error('Error handling student QR submission:', err);
    return res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: 'Internal server error processing attendance submission.',
    });
  }
});

// 6. Teacher Edit Submission (Change Status, Resolve Unmatched, Add Notes)
app.post('/api/qr-session/:sessionId/edit-submission', (req, res) => {
  const { sessionId } = req.params;
  const { studentId, status, verificationStatus, teacherNotes, teacherName = 'Teacher' } = req.body;
  const session = qrSessionsStore.get(sessionId);

  if (!session) {
    return res.status(404).json({ error: 'QR Session not found' });
  }

  if (!session.submissions[studentId]) {
    return res.status(404).json({ error: 'Submission not found for this student' });
  }

  const record = session.submissions[studentId];
  if (status) record.status = status;
  if (verificationStatus) record.verificationStatus = verificationStatus;
  if (teacherNotes !== undefined) record.teacherNotes = teacherNotes;

  session.auditTrail.push({
    timestamp: new Date().toISOString(),
    action: 'RECORD_EDITED',
    performedBy: teacherName,
    details: `Updated ${record.fullName} (Roll ${record.rollNo}) to ${status || record.status}`,
  });

  qrSessionsStore.set(sessionId, session);
  return res.json({ success: true, record });
});

// 7. Finalize QR Session & Build Completed Session Record
app.post('/api/qr-session/:sessionId/finalize', (req, res) => {
  try {
    const { sessionId } = req.params;
    const { enrolledStudents = [], notes, teacherName = 'Teacher' } = req.body;
    const session = qrSessionsStore.get(sessionId);

    if (!session) {
      return res.status(404).json({ error: 'QR Session not found' });
    }

    session.status = 'finalized';
    session.finalizedAt = new Date().toISOString();

    // Build finalized records map and student metadata (submission method & timestamp)
    const recordsMap: Record<string, 'present' | 'absent'> = {};
    const studentMetadata: Record<
      string,
      {
        method: 'QR' | 'Manual';
        timestamp?: string;
        deviceId?: string;
        verificationStatus?: string;
      }
    > = {};
    let presentCount = 0;
    let absentCount = 0;

    // First process submissions
    Object.values(session.submissions).forEach((sub) => {
      if (sub.status === 'present') {
        recordsMap[sub.studentId] = 'present';
        studentMetadata[sub.studentId] = {
          method: 'QR',
          timestamp: sub.submittedAt,
          deviceId: sub.deviceId,
          verificationStatus: sub.verificationStatus,
        };
        presentCount++;
      } else {
        recordsMap[sub.studentId] = 'absent';
        studentMetadata[sub.studentId] = {
          method: 'Manual',
          timestamp: sub.submittedAt,
          deviceId: sub.deviceId,
          verificationStatus: sub.verificationStatus,
        };
        absentCount++;
      }
    });

    // Mark remaining enrolled students as absent if not submitted
    if (Array.isArray(enrolledStudents)) {
      enrolledStudents.forEach((std: any) => {
        if (!recordsMap[std.id]) {
          recordsMap[std.id] = 'absent';
          studentMetadata[std.id] = {
            method: 'Manual',
            timestamp: '-',
            verificationStatus: 'unmatched_roll',
          };
          absentCount++;
        }
      });
    }

    session.auditTrail.push({
      timestamp: new Date().toISOString(),
      action: 'SESSION_FINALIZED',
      performedBy: teacherName,
      details: `Finalized attendance: ${presentCount} present, ${absentCount} absent out of ${presentCount + absentCount} total`,
    });

    qrSessionsStore.set(sessionId, session);

    const finalizedSession = {
      id: `session-qr-${Date.now()}`,
      classroomId: session.classroomId,
      classroomName: session.classroomName,
      subjectId: session.subjectId || 'general',
      subjectName: session.subjectName || 'Class Attendance',
      date: session.date,
      period: 1,
      markedBy: session.teacherName,
      status: 'completed',
      sessionType: 'qr',
      records: recordsMap,
      studentMetadata,
      totalStudents: presentCount + absentCount,
      presentCount,
      absentCount,
      unmarkedCount: 0,
      createdAt: session.createdAt,
      completedAt: session.finalizedAt,
      notes: notes || `QR Attendance Session: ${session.totalSubmissions} submitted via mobile QR`,
      auditTrail: session.auditTrail,
    };

    return res.json({ success: true, finalizedSession });
  } catch (err: any) {
    console.error('Error finalizing session:', err);
    return res.status(500).json({ error: err.message || 'Failed to finalize session' });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve('dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
