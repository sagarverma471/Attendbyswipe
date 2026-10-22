import { Student } from '../types/attendance';

// High-speed lazy loaders: Only fetch heavy parser binaries when the user actually uploads a document
let xlsxModule: typeof import('xlsx') | null = null;
export const loadXlsx = async () => {
  if (!xlsxModule) {
    xlsxModule = await import('xlsx');
  }
  return xlsxModule;
};

let pdfjsModule: any = null;
export const loadPdfJs = async () => {
  if (!pdfjsModule) {
    const mod = await import('pdfjs-dist');
    if (typeof window !== 'undefined') {
      try {
        const version = mod.version || '6.4.299';
        mod.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${version}/build/pdf.worker.min.mjs`;
      } catch (err) {
        console.warn('PDF.js worker initialization notice:', err);
      }
    }
    pdfjsModule = mod;
  }
  return pdfjsModule;
};

export interface ParserOptions {
  targetClassroomId: string;
  targetClassroomName?: string;
  defaultDepartment?: string;
  defaultSemester?: string;
  defaultSection?: string;
  existingStudents: Student[];
}

export interface ParsedStudentItem {
  tempId: string;
  name: string;
  rollNo: string;
  studentId: string;
  department: string;
  classroomId: string;
  semester: string;
  section: string;
  email: string;
  avatarUrl: string;
  status: 'valid' | 'duplicate' | 'error';
  issues: string[];
  isDuplicateInDb: boolean;
  isDuplicateInFile: boolean;
  selected: boolean;
  originalRowData?: Record<string, any>;
}

export interface ParseResult {
  success: boolean;
  fileType: 'pdf' | 'excel' | 'csv' | 'unknown';
  fileName: string;
  fileSize: number;
  sheetNames?: string[];
  activeSheet?: string;
  totalExtracted: number;
  validCount: number;
  duplicateCount: number;
  errorCount: number;
  students: ParsedStudentItem[];
  isScannedPdf?: boolean;
  errorMessage?: string;
  warnings: string[];
}

// Deterministic high-quality avatar generator from student roll number
const AVATAR_POOL = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&h=256&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=256&h=256&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=256&h=256&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=256&h=256&q=80',
  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=256&h=256&q=80',
  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=256&h=256&q=80',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=256&h=256&q=80',
  'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=256&h=256&q=80',
];

export const getDeterministicAvatar = (key: string): string => {
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash << 5) - hash + key.charCodeAt(i);
    hash |= 0;
  }
  const idx = Math.abs(hash) % 72;
  return `/student-portraits/student_${idx}.jpg`;
};

/**
 * Standard Header Keyword Mappings for Academic Rosters & Admission Lists
 */
const HEADER_PATTERNS = {
  name: [
    'student name',
    'candidate name',
    'name of the student',
    'student_name',
    'full name',
    'fullname',
    'name',
    'candidate',
    'applicant name',
    'student',
  ],
  rollNo: [
    'roll no',
    'roll number',
    'roll_no',
    'rollno',
    'univ roll no',
    'university roll',
    'registration no',
    'reg no',
    'reg_no',
    'reg. no',
    'enrollment no',
    'enroll no',
    'enrollment',
    'adm no',
    'admission no',
    'roll',
  ],
  studentId: [
    'student id',
    'student_id',
    'std id',
    'scholar no',
    'scholar id',
    'college id',
    'uid',
    'prn',
    'usn',
    'id no',
    'id',
  ],
  department: [
    'department',
    'branch',
    'dept',
    'stream',
    'discipline',
    'course',
    'programme',
    'program',
  ],
  semester: [
    'semester',
    'sem',
    'academic year',
    'year/sem',
    'year',
    'term',
  ],
  section: [
    'section',
    'sec',
    'division',
    'batch',
  ],
  email: [
    'email id',
    'email address',
    'e-mail',
    'email',
    'mail',
  ],
};

/**
 * Match a raw column string against known academic headers
 */
const matchHeaderType = (headerStr: string): string | null => {
  const clean = headerStr.toLowerCase().trim().replace(/[^a-z0-9]/g, ' ');
  for (const [key, patterns] of Object.entries(HEADER_PATTERNS)) {
    for (const pat of patterns) {
      if (clean === pat || clean.includes(pat)) {
        // Prevent false positives on 'father name' or 'teacher name'
        if (key === 'name' && (clean.includes('father') || clean.includes('mother') || clean.includes('teacher') || clean.includes('faculty'))) {
          continue;
        }
        return key;
      }
    }
  }
  return null;
};

/**
 * Validate and flag duplicates / missing fields in extracted students
 */
export const validateStudentList = (
  items: Omit<ParsedStudentItem, 'status' | 'issues' | 'isDuplicateInDb' | 'isDuplicateInFile' | 'selected'>[],
  existingStudents: Student[]
): ParsedStudentItem[] => {
  const existingRollSet = new Set(existingStudents.map((s) => s.rollNo.trim().toUpperCase()));
  const existingIdSet = new Set(existingStudents.map((s) => s.studentId.trim().toUpperCase()));

  const seenRollsInFile = new Map<string, number>();

  // Count occurrences inside the current batch
  for (const item of items) {
    const rollNorm = item.rollNo.trim().toUpperCase();
    if (rollNorm) {
      seenRollsInFile.set(rollNorm, (seenRollsInFile.get(rollNorm) || 0) + 1);
    }
  }

  return items.map((item) => {
    const issues: string[] = [];
    const rollNorm = item.rollNo.trim().toUpperCase();
    const idNorm = item.studentId.trim().toUpperCase();

    const isDuplicateInDb = Boolean(rollNorm && existingRollSet.has(rollNorm));
    const isDuplicateIdInDb = Boolean(idNorm && existingIdSet.has(idNorm));
    const isDuplicateInFile = Boolean(rollNorm && (seenRollsInFile.get(rollNorm) || 0) > 1);

    if (!item.name || item.name.trim().length === 0) {
      issues.push('Missing Student Name');
    }
    if (!item.rollNo || item.rollNo.trim().length === 0) {
      issues.push('Missing Roll Number');
    }

    if (isDuplicateInDb) {
      issues.push(`Duplicate: Roll No (${item.rollNo}) already enrolled in roster`);
    } else if (isDuplicateIdInDb) {
      issues.push(`Duplicate: Student ID (${item.studentId}) already exists`);
    }

    if (isDuplicateInFile) {
      issues.push(`Duplicate: Roll No (${item.rollNo}) appears multiple times in file`);
    }

    let status: 'valid' | 'duplicate' | 'error' = 'valid';
    if (!item.name || !item.rollNo) {
      status = 'error';
    } else if (isDuplicateInDb || isDuplicateInFile || isDuplicateIdInDb) {
      status = 'duplicate';
    }

    return {
      ...item,
      status,
      issues,
      isDuplicateInDb,
      isDuplicateInFile,
      // Default to selected only if fully valid
      selected: status === 'valid',
    };
  });
};

/**
 * Parse Excel Spreadsheets (.xlsx, .xls)
 */
export const parseExcelFile = async (
  file: File,
  options: ParserOptions
): Promise<ParseResult> => {
  const [XLSX, arrayBuffer] = await Promise.all([loadXlsx(), file.arrayBuffer()]);
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });

  if (workbook.SheetNames.length === 0) {
    return {
      success: false,
      fileType: 'excel',
      fileName: file.name,
      fileSize: file.size,
      totalExtracted: 0,
      validCount: 0,
      duplicateCount: 0,
      errorCount: 0,
      students: [],
      errorMessage: 'The Excel workbook has no readable sheets.',
      warnings: [],
    };
  }

  // Use first sheet or sheet containing student data
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const rawRows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

  if (!rawRows || rawRows.length < 2) {
    return {
      success: false,
      fileType: 'excel',
      fileName: file.name,
      fileSize: file.size,
      sheetNames: workbook.SheetNames,
      activeSheet: sheetName,
      totalExtracted: 0,
      validCount: 0,
      duplicateCount: 0,
      errorCount: 0,
      students: [],
      errorMessage: 'The worksheet does not contain enough rows to extract student records.',
      warnings: [],
    };
  }

  // Detect header row by scanning rows 0 to 15
  let headerRowIndex = 0;
  let highestScore = 0;
  let detectedColIndices: Record<string, number> = {};

  for (let r = 0; r < Math.min(rawRows.length, 15); r++) {
    const row = rawRows[r];
    if (!Array.isArray(row)) continue;

    let score = 0;
    const tempColMap: Record<string, number> = {};

    row.forEach((cellVal, c) => {
      if (typeof cellVal === 'string' && cellVal.trim()) {
        const matchedType = matchHeaderType(cellVal);
        if (matchedType) {
          score++;
          if (tempColMap[matchedType] === undefined) {
            tempColMap[matchedType] = c;
          }
        }
      }
    });

    if (score > highestScore) {
      highestScore = score;
      headerRowIndex = r;
      detectedColIndices = tempColMap;
    }
  }

  const warnings: string[] = [];

  // Fallback if headers were not explicitly titled
  if (detectedColIndices.rollNo === undefined && detectedColIndices.name === undefined) {
    warnings.push('Could not find standard headers (Roll No, Name). Attempting position-based detection.');
    // Check first 2 columns of row 1+
    if (rawRows.length > 1) {
      detectedColIndices.rollNo = 0;
      detectedColIndices.name = 1;
      if (rawRows[0].length > 2) detectedColIndices.studentId = 2;
    }
  }

  const rawExtracted: Omit<ParsedStudentItem, 'status' | 'issues' | 'isDuplicateInDb' | 'isDuplicateInFile' | 'selected'>[] = [];

  // Iterate rows below header
  for (let r = headerRowIndex + 1; r < rawRows.length; r++) {
    const row = rawRows[r];
    if (!Array.isArray(row) || row.every((c) => String(c).trim() === '')) {
      continue;
    }

    const getVal = (colIdx: number | undefined) => {
      if (colIdx === undefined || colIdx < 0 || colIdx >= row.length) return '';
      return String(row[colIdx] ?? '').trim();
    };

    let rollNo = getVal(detectedColIndices.rollNo);
    let name = getVal(detectedColIndices.name);
    let studentId = getVal(detectedColIndices.studentId);
    let department = getVal(detectedColIndices.department) || options.defaultDepartment || 'B.Tech Computer Science';
    let semester = getVal(detectedColIndices.semester) || options.defaultSemester || '3rd Year • 5th Semester';
    let section = getVal(detectedColIndices.section) || options.defaultSection || 'Section A';
    let email = getVal(detectedColIndices.email);

    // Filter out total/summary rows
    if (rollNo.toLowerCase().includes('total') || name.toLowerCase().includes('total')) {
      continue;
    }

    // Auto-generate student ID if absent
    if (!studentId && rollNo) {
      studentId = `ST${rollNo.replace(/[^a-zA-Z0-9]/g, '')}`;
    }

    // Skip empty ghost rows
    if (!rollNo && !name) continue;

    const tempId = `parsed-${Date.now()}-${r}-${Math.random().toString(36).substring(2, 7)}`;

    rawExtracted.push({
      tempId,
      name,
      rollNo,
      studentId: studentId || `ST${1000 + r}`,
      department,
      classroomId: options.targetClassroomId,
      semester,
      section,
      email,
      avatarUrl: getDeterministicAvatar(rollNo || name),
      originalRowData: { rowNumber: r + 1, data: row },
    });
  }

  const validatedStudents = validateStudentList(rawExtracted, options.existingStudents);

  const validCount = validatedStudents.filter((s) => s.status === 'valid').length;
  const duplicateCount = validatedStudents.filter((s) => s.status === 'duplicate').length;
  const errorCount = validatedStudents.filter((s) => s.status === 'error').length;

  return {
    success: true,
    fileType: 'excel',
    fileName: file.name,
    fileSize: file.size,
    sheetNames: workbook.SheetNames,
    activeSheet: sheetName,
    totalExtracted: validatedStudents.length,
    validCount,
    duplicateCount,
    errorCount,
    students: validatedStudents,
    warnings,
  };
};

/**
 * Parse CSV / TSV Documents (.csv, .tsv, .txt)
 */
export const parseCsvFile = async (
  file: File,
  options: ParserOptions
): Promise<ParseResult> => {
  const [XLSX, text] = await Promise.all([loadXlsx(), file.text()]);
  const workbook = XLSX.read(text, { type: 'string' });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const rawRows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

  if (!rawRows || rawRows.length < 2) {
    return {
      success: false,
      fileType: 'csv',
      fileName: file.name,
      fileSize: file.size,
      totalExtracted: 0,
      validCount: 0,
      duplicateCount: 0,
      errorCount: 0,
      students: [],
      errorMessage: 'The CSV file does not contain student records.',
      warnings: [],
    };
  }

  // Scan for header row
  let headerRowIndex = 0;
  let highestScore = 0;
  let detectedColIndices: Record<string, number> = {};

  for (let r = 0; r < Math.min(rawRows.length, 10); r++) {
    const row = rawRows[r];
    if (!Array.isArray(row)) continue;

    let score = 0;
    const tempColMap: Record<string, number> = {};

    row.forEach((cellVal, c) => {
      if (typeof cellVal === 'string' && cellVal.trim()) {
        const matchedType = matchHeaderType(cellVal);
        if (matchedType) {
          score++;
          if (tempColMap[matchedType] === undefined) {
            tempColMap[matchedType] = c;
          }
        }
      }
    });

    if (score > highestScore) {
      highestScore = score;
      headerRowIndex = r;
      detectedColIndices = tempColMap;
    }
  }

  const warnings: string[] = [];

  if (detectedColIndices.rollNo === undefined && detectedColIndices.name === undefined) {
    detectedColIndices.rollNo = 0;
    detectedColIndices.name = 1;
    if (rawRows[0].length > 2) detectedColIndices.studentId = 2;
    warnings.push('Defaulted to column order: Roll No (col 1), Name (col 2), ID (col 3).');
  }

  const rawExtracted: Omit<ParsedStudentItem, 'status' | 'issues' | 'isDuplicateInDb' | 'isDuplicateInFile' | 'selected'>[] = [];

  for (let r = headerRowIndex + 1; r < rawRows.length; r++) {
    const row = rawRows[r];
    if (!Array.isArray(row) || row.every((c) => String(c).trim() === '')) {
      continue;
    }

    const getVal = (colIdx: number | undefined) => {
      if (colIdx === undefined || colIdx < 0 || colIdx >= row.length) return '';
      return String(row[colIdx] ?? '').trim().replace(/^"|"$/g, '');
    };

    let rollNo = getVal(detectedColIndices.rollNo);
    let name = getVal(detectedColIndices.name);
    let studentId = getVal(detectedColIndices.studentId);
    let department = getVal(detectedColIndices.department) || options.defaultDepartment || 'B.Tech Computer Science';
    let semester = getVal(detectedColIndices.semester) || options.defaultSemester || '3rd Year • 5th Semester';
    let section = getVal(detectedColIndices.section) || options.defaultSection || 'Section A';
    let email = getVal(detectedColIndices.email);

    if (rollNo.toLowerCase().includes('total') || name.toLowerCase().includes('total')) {
      continue;
    }

    if (!studentId && rollNo) {
      studentId = `ST${rollNo.replace(/[^a-zA-Z0-9]/g, '')}`;
    }

    if (!rollNo && !name) continue;

    const tempId = `parsed-${Date.now()}-${r}-${Math.random().toString(36).substring(2, 7)}`;

    rawExtracted.push({
      tempId,
      name,
      rollNo,
      studentId: studentId || `ST${1000 + r}`,
      department,
      classroomId: options.targetClassroomId,
      semester,
      section,
      email,
      avatarUrl: getDeterministicAvatar(rollNo || name),
      originalRowData: { rowNumber: r + 1, data: row },
    });
  }

  const validatedStudents = validateStudentList(rawExtracted, options.existingStudents);

  return {
    success: true,
    fileType: 'csv',
    fileName: file.name,
    fileSize: file.size,
    totalExtracted: validatedStudents.length,
    validCount: validatedStudents.filter((s) => s.status === 'valid').length,
    duplicateCount: validatedStudents.filter((s) => s.status === 'duplicate').length,
    errorCount: validatedStudents.filter((s) => s.status === 'error').length,
    students: validatedStudents,
    warnings,
  };
};

/**
 * Parse Multi-Page Academic PDF Documents (.pdf)
 */
export const parsePdfFile = async (
  file: File,
  options: ParserOptions
): Promise<ParseResult> => {
  const [pdfjsLib, arrayBuffer] = await Promise.all([loadPdfJs(), file.arrayBuffer()]);

  try {
    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(arrayBuffer),
      useSystemFonts: true,
    });

    const pdf = await loadingTask.promise;
    const numPages = pdf.numPages;

    let totalExtractedCharCount = 0;
    const allLines: string[] = [];

    // Extract text from every page
    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();

      // Group items by vertical Y coordinates (within ±3.5px line tolerance)
      const lineMap = new Map<number, { x: number; text: string }[]>();

      for (const item of textContent.items as any[]) {
        if (!item.str || item.str.trim() === '') continue;

        totalExtractedCharCount += item.str.length;
        const rawY = item.transform[5];
        const x = item.transform[4];

        // Group into buckets of ~4px
        let matchedY: number | null = null;
        for (const existingY of lineMap.keys()) {
          if (Math.abs(existingY - rawY) <= 3.5) {
            matchedY = existingY;
            break;
          }
        }

        const targetY = matchedY !== null ? matchedY : rawY;
        if (!lineMap.has(targetY)) {
          lineMap.set(targetY, []);
        }
        lineMap.get(targetY)!.push({ x, text: item.str });
      }

      // Sort lines by descending Y (top of page down to bottom)
      const sortedYKeys = Array.from(lineMap.keys()).sort((a, b) => b - a);

      for (const y of sortedYKeys) {
        const lineItems = lineMap.get(y)!;
        // Sort items horizontally (left to right)
        lineItems.sort((a, b) => a.x - b.x);
        const lineString = lineItems.map((i) => i.text.trim()).filter(Boolean).join('\t');
        if (lineString.trim()) {
          allLines.push(lineString);
        }
      }
    }

    // Scanned Image PDF Detection
    if (totalExtractedCharCount < 20 || allLines.length === 0) {
      return {
        success: false,
        fileType: 'pdf',
        fileName: file.name,
        fileSize: file.size,
        totalExtracted: 0,
        validCount: 0,
        duplicateCount: 0,
        errorCount: 0,
        students: [],
        isScannedPdf: true,
        errorMessage:
          'This PDF appears to be a scanned photo or flattened bitmap without selectable digital text layers.',
        warnings: [
          'Scanned PDFs require digitized selectable text. Please export directly from your college portal / Excel or use CSV.',
        ],
      };
    }

    const rawExtracted: Omit<ParsedStudentItem, 'status' | 'issues' | 'isDuplicateInDb' | 'isDuplicateInFile' | 'selected'>[] = [];
    const warnings: string[] = [];

    // College Roll Number Regex Patterns: e.g., 26CSE040, 24ECE102, 2024BCSE001, 1042, etc.
    const rollPattern = /\b([0-9]{2,4}[A-Za-z]{2,5}[0-9]{2,4}|[A-Za-z]{2,4}[0-9]{3,6}|[0-9]{4,10})\b/;
    // Student ID pattern: e.g. ST1040, ADM202401, ID-409
    const idPattern = /\b(ST[0-9]{3,6}|ADM[0-9]{3,6}|ID-?[0-9]{3,6})\b/i;

    for (let i = 0; i < allLines.length; i++) {
      const line = allLines[i];
      // Skip header lines or noise
      const lowerLine = line.toLowerCase();
      if (
        lowerLine.includes('roll number') ||
        lowerLine.includes('student name') ||
        lowerLine.includes('attendance sheet') ||
        lowerLine.includes('page ') ||
        lowerLine.includes('institution') ||
        lowerLine.includes('semester examination')
      ) {
        continue;
      }

      // Check if line contains tab-separated table tokens or space tokens
      const tokens = line.split('\t').map((t) => t.trim()).filter(Boolean);

      let rollNo = '';
      let name = '';
      let studentId = '';
      let department = options.defaultDepartment || 'B.Tech Computer Science';

      if (tokens.length >= 2) {
        // Find which token looks like a roll number
        const rollIdx = tokens.findIndex((t) => rollPattern.test(t) && !isNaN(Number(t.replace(/[a-zA-Z]/g, ''))));
        if (rollIdx >= 0) {
          rollNo = tokens[rollIdx].match(rollPattern)?.[0] || tokens[rollIdx];

          // Next or previous alphabetic token is usually the student name
          const nameCandidate = tokens.find(
            (t, idx) => idx !== rollIdx && !/^\d+$/.test(t) && t.length >= 2 && !rollPattern.test(t)
          );
          if (nameCandidate) {
            name = nameCandidate;
          }

          // Check if any token matches student ID or branch
          const idCandidate = tokens.find((t, idx) => idx !== rollIdx && idPattern.test(t));
          if (idCandidate) studentId = idCandidate;

          const deptCandidate = tokens.find(
            (t, idx) => idx !== rollIdx && t !== name && (t.includes('Tech') || t.includes('Engineering') || t.includes('Science') || t.includes('CSE') || t.includes('EE') || t.includes('ME'))
          );
          if (deptCandidate) department = deptCandidate;
        }
      }

      // If tokens didn't match, test line with regex
      if (!rollNo || !name) {
        const rollMatch = line.match(rollPattern);
        if (rollMatch) {
          rollNo = rollMatch[0];
          // Strip roll and digits to extract name
          const cleanLine = line
            .replace(rollMatch[0], '')
            .replace(/^\s*\d+[\.\)\-]?\s*/, '') // strip leading s.no
            .replace(/\b(present|absent|p|a)\b/gi, '')
            .trim();

          const words = cleanLine.split(/\s+/).filter((w) => /^[A-Za-z\.]+$/.test(w));
          if (words.length >= 1) {
            name = words.join(' ');
          }
        }
      }

      if (rollNo && name) {
        // Clean name (e.g., remove stray punctuation)
        name = name.replace(/^[0-9\.\-\_\s]+/, '').trim();

        if (!studentId) {
          studentId = `ST${rollNo.replace(/[^a-zA-Z0-9]/g, '')}`;
        }

        const tempId = `parsed-pdf-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 7)}`;

        rawExtracted.push({
          tempId,
          name,
          rollNo,
          studentId,
          department,
          classroomId: options.targetClassroomId,
          semester: options.defaultSemester || '3rd Year • 5th Semester',
          section: options.defaultSection || 'Section A',
          email: '',
          avatarUrl: getDeterministicAvatar(rollNo || name),
          originalRowData: { rawLine: line },
        });
      }
    }

    if (rawExtracted.length === 0) {
      warnings.push('Could not find structured student records in the text. You can review and enter records manually.');
    }

    const validatedStudents = validateStudentList(rawExtracted, options.existingStudents);

    return {
      success: true,
      fileType: 'pdf',
      fileName: file.name,
      fileSize: file.size,
      totalExtracted: validatedStudents.length,
      validCount: validatedStudents.filter((s) => s.status === 'valid').length,
      duplicateCount: validatedStudents.filter((s) => s.status === 'duplicate').length,
      errorCount: validatedStudents.filter((s) => s.status === 'error').length,
      students: validatedStudents,
      warnings,
    };
  } catch (err: any) {
    console.error('PDF parsing error:', err);
    return {
      success: false,
      fileType: 'pdf',
      fileName: file.name,
      fileSize: file.size,
      totalExtracted: 0,
      validCount: 0,
      duplicateCount: 0,
      errorCount: 0,
      students: [],
      errorMessage: `Failed to parse PDF: ${err?.message || 'Unsupported format or corrupted file'}`,
      warnings: [],
    };
  }
};

/**
 * Universal Entry Point: Auto-detects file extension and routes to appropriate parser
 */
export const parseStudentDocument = async (
  file: File,
  options: ParserOptions
): Promise<ParseResult> => {
  const extension = file.name.split('.').pop()?.toLowerCase() || '';

  if (extension === 'pdf') {
    return parsePdfFile(file, options);
  } else if (extension === 'xlsx' || extension === 'xls') {
    return parseExcelFile(file, options);
  } else if (extension === 'csv' || extension === 'tsv' || extension === 'txt') {
    return parseCsvFile(file, options);
  }

  return {
    success: false,
    fileType: 'unknown',
    fileName: file.name,
    fileSize: file.size,
    totalExtracted: 0,
    validCount: 0,
    duplicateCount: 0,
    errorCount: 0,
    students: [],
    errorMessage: `Unsupported file format (.${extension}). Please upload a PDF (.pdf), Excel (.xlsx, .xls), or CSV (.csv) file.`,
    warnings: [],
  };
};
