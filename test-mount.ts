import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', {
  url: 'http://localhost:3000/',
});

global.window = dom.window as any;
global.document = dom.window.document as any;
try {
  Object.defineProperty(global, 'navigator', {
    value: dom.window.navigator,
    configurable: true,
    writable: true,
  });
} catch {}
try {
  Object.defineProperty(global, 'location', {
    value: dom.window.location,
    configurable: true,
    writable: true,
  });
} catch {}

const mockStorage: Record<string, string> = {};
const storageObj = {
  getItem: (key: string) => mockStorage[key] ?? null,
  setItem: (key: string, val: string) => { mockStorage[key] = String(val); },
  removeItem: (key: string) => { delete mockStorage[key]; },
  clear: () => { Object.keys(mockStorage).forEach(k => delete mockStorage[k]); },
};

try {
  Object.defineProperty(dom.window, 'localStorage', { value: storageObj, configurable: true });
} catch {}
try {
  Object.defineProperty(global, 'localStorage', { value: storageObj, configurable: true });
} catch {}

global.HTMLElement = dom.window.HTMLElement as any;
global.HTMLCanvasElement = dom.window.HTMLCanvasElement as any;
global.requestAnimationFrame = (cb) => setTimeout(cb, 0);
global.cancelAnimationFrame = (id) => clearTimeout(id);
global.matchMedia = () => ({
  matches: false,
  addListener: () => {},
  removeListener: () => {},
  addEventListener: () => {},
  removeEventListener: () => {},
}) as any;

if (global.HTMLCanvasElement) {
  (global.HTMLCanvasElement.prototype as any).getContext = () => ({
    fillRect: () => {},
    clearRect: () => {},
    getImageData: (x: any, y: any, w: any, h: any) => ({
      data: new Uint8ClampedArray(w * h * 4),
    }),
    putImageData: () => {},
    createImageData: (w: any, h: any) => ({
      data: new Uint8ClampedArray(w * h * 4),
    }),
    setTransform: () => {},
    drawImage: () => {},
    save: () => {},
    fillText: () => {},
    restore: () => {},
    beginPath: () => {},
    moveTo: () => {},
    lineTo: () => {},
    closePath: () => {},
    stroke: () => {},
    fill: () => {},
  });
}

import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './src/App';
import { ClassroomQRGeneratorModal } from './src/components/qr/ClassroomQRGeneratorModal';
import { AttendanceSetupModal } from './src/components/attendance/AttendanceSetupModal';
import { UploadStudentListModal } from './src/components/roster/UploadStudentListModal';
import { StudentScanAttendanceModal } from './src/components/qr/StudentScanAttendanceModal';
import { StudentAttendancePage } from './src/components/qr/StudentAttendancePage';
import { SwipeArena } from './src/components/attendance/SwipeArena';
import { getStoredClassrooms, getStoredStudents, getStoredSubjects, getStoredSessions } from './src/services/storage';

console.log('Testing App and all modal components...');
const container = document.getElementById('root')!;
const root = createRoot(container);

let maxUpdateDepthError = false;

const origError = console.error;
console.error = (...args: any[]) => {
  const str = args.map(a => (a && a.stack ? a.stack : String(a))).join(' ');
  if (str.includes('Maximum update depth exceeded') || str.includes('Too many re-renders')) {
    console.log('!!! CAUGHT MAXIMUM UPDATE DEPTH EXCEEDED !!!', str);
    maxUpdateDepthError = true;
  }
  origError(...args);
};

async function runTests() {
  const classrooms = getStoredClassrooms();
  const students = getStoredStudents();
  const subjects = getStoredSubjects();
  const sessions = getStoredSessions();

  console.log('1. Rendering App...');
  root.render(React.createElement(App));
  await new Promise((r) => setTimeout(r, 600));

  console.log('2. Testing ClassroomQRGeneratorModal open...');
  root.render(
    React.createElement(ClassroomQRGeneratorModal, {
      isOpen: true,
      onClose: () => {},
      classroom: classrooms[0],
      subject: subjects[0],
      teacherName: 'Dr. S. K. Singh',
      enrolledStudents: students,
      onFinalizeAttendance: () => {},
    } as any)
  );
  await new Promise((r) => setTimeout(r, 600));

  console.log('3. Testing AttendanceSetupModal open...');
  root.render(
    React.createElement(AttendanceSetupModal, {
      isOpen: true,
      onClose: () => {},
      onStartSession: () => {},
      classrooms,
      subjects,
      students,
      existingSessions: [],
    } as any)
  );
  await new Promise((r) => setTimeout(r, 600));

  console.log('4. Testing UploadStudentListModal open...');
  root.render(
    React.createElement(UploadStudentListModal, {
      isOpen: true,
      onClose: () => {},
      classrooms,
      onImportRoster: () => {},
      initialClassroomId: classrooms[0].id,
    } as any)
  );
  await new Promise((r) => setTimeout(r, 600));

  console.log('5. Testing StudentScanAttendanceModal open...');
  root.render(
    React.createElement(StudentScanAttendanceModal, {
      isOpen: true,
      onClose: () => {},
      initialClassroomId: classrooms[0].id,
      allClassrooms: classrooms,
      allStudents: students,
    } as any)
  );
  await new Promise((r) => setTimeout(r, 600));

  console.log('6. Testing StudentAttendancePage...');
  root.render(
    React.createElement(StudentAttendancePage, {
      allClassrooms: classrooms,
      allStudents: students,
    })
  );
  await new Promise((r) => setTimeout(r, 600));

  console.log('7. Testing SwipeArena...');
  if (sessions.length > 0) {
    root.render(
      React.createElement(SwipeArena, {
        session: sessions[0],
        students: students.slice(0, 10),
        initialIndex: 0,
        onUpdateSession: () => {},
        onComplete: () => {},
        onExit: () => {},
      })
    );
    await new Promise((r) => setTimeout(r, 600));
  }

  console.log('FINISHED TESTS. Max update depth error triggered:', maxUpdateDepthError);
  process.exit(maxUpdateDepthError ? 1 : 0);
}

runTests().catch((e) => {
  console.error('Test run failed with error:', e);
  process.exit(1);
});
