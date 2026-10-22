# SwipeAttend — Gesture-Based Attendance Management System

SwipeAttend replaces conventional paper registers with a tactile, gesture-driven attendance platform engineered for schools and colleges, featuring seamless swipe-right (Present) and swipe-left (Absent) card mechanics, multi-mode fallback, automated roll numbering, and session persistence.

## User Review & Critical Decisions

> [!IMPORTANT]
> The architectural and visual decisions confirmed during alignment:

- **Confirmed Decision 1 (Aesthetic & Theme)**: Adopted the **Dark Neon Tech Aesthetic** directly aligned with the uploaded UI posters (`#0B0F19` deep obsidian canvas, violet/purple neon glows `#8B5CF6`, emerald green `#10B981` Present badge and swipe glow, crimson coral `#EF4444` Absent badge and swipe glow). Includes toggle capability for high-contrast viewing.
- **Confirmed Decision 2 (User Access Scope)**: Built an interactive **Role Switcher** between **Teacher Workspace** (primary attendance workflow, roster & subject manager), **Student Portal** (personal attendance percentage ring, subject breakdown, shortage calculator), and **Admin Console** (institutional metrics, teacher/class roster, institutional audit log).
- **Confirmed Decision 3 (Institution & Seed Data)**: Pre-loaded with **BIT Sindri** engineering classrooms (B.Tech CSE 3rd Year Sec A, B.Tech CSE 3rd Year Sec B, B.Tech EE 1st Year Sec J, B.Tech ME 1st Year Sec F), realistic student rosters with profile avatars (Rahul Kumar, Priya Sharma, Rohit Singh, Aman Kumar, etc.), timetable schedules, and prior session histories.

---

## 1. Overview & Core Concept

- **What It Does**: Teachers start an attendance session for a class and subject, then rapidly evaluate students one by one using natural touch/mouse swipe gestures (Swipe Right = Present, Swipe Left = Absent) or rapid keyboard shortcuts (`→`, `←`, `Space`, `Ctrl+Z` / `Z` for undo). Includes list-mode fallback, "Mark All Present" batch workflow, multi-step review, duplicate session warnings, and automatic recovery of in-progress sessions.
- **Target Audience**: College professors, school teachers, academic coordinators, and students at institutions like BIT Sindri.
- **Key Value**: Reduces 10-minute manual roll calls down to 60 seconds with tactile gestures, visual student recognition, zero-data-loss recovery, and real-time percentage threshold alerts (Good $\ge 75\%$, Warning $60\%–74\%$, Critical $< 60\%$).

---

## 2. User Experience & Visual Design

### Key User Flows
1. **Teacher Attendance Flow**:
   - Teacher Dashboard displays today's schedule at BIT Sindri (DBMS at 10:00 AM, OS at 12:00 PM, Computer Networks at 2:00 PM).
   - Professor clicks **"Start Attendance"** $\rightarrow$ verifies Class, Subject, Date, Period $\rightarrow$ enters Swipe Arena.
   - **Swipe Arena**: Student card displays photo/initials, name, roll number, semester, section, and historical attendance percentage ring.
   - Swiping right renders green glow + "+1 Present" indicator; swiping left renders red glow + "+1 Absent" indicator. Card smoothly dismisses and pops the next student from the deck with spring physics.
   - Live counter updates: `Present: X`, `Absent: Y`, `Remaining: Z`, progress bar.
   - One-click **Undo** (`Z` or button) rolls back the previous card with exact historical count restoration.
   - Completion leads to **Celebration Screen** (confetti burst + session stats) $\rightarrow$ **Attendance Summary Table** (review/edit each status) $\rightarrow$ **Confirm & Save**.
2. **Student Portal Flow**:
   - Student signs in or switches role to view attendance ring (e.g. 87% overall).
   - Subject breakdown (DBMS 91%, OS 87%, Mathematics 94%, Computer Networks 82%).
   - **Attendance Shortage Calculator**: Enter target percentage (e.g. 75% or 85%) to calculate exact consecutive classes needed to attend or safe classes to miss.
3. **Classroom & Student Roster Manager**:
   - Manage classrooms, subjects, and student rosters.
   - **Automatic Roll Number Generator**: Configure prefix (e.g., `26CSE`), start number, count, zero-padding, preview, and generate.
   - **CSV/Excel Importer & Exporter**: Upload rosters with column mapping and validation; export session reports to CSV and printable summary.

### Visual Identity & Theme Tokens
- **Background Canvas**: `#070A12` (deep obsidian midnight) to `#0D111E`.
- **Card Surfaces**: `#13192B` with 1px border `rgba(255, 255, 255, 0.08)` and subtle backdrop blur.
- **Primary Violet Accent**: `#8B5CF6` / `#7C3AED` (neon purple buttons, active states, progress indicators).
- **Present State**: `#10B981` (emerald green badge, glow, right-swipe aura).
- **Absent State**: `#EF4444` (crimson coral badge, glow, left-swipe aura).
- **Warning State**: `#F59E0B` (amber shortage warning).
- **Typography**: `Plus Jakarta Sans` for clean modern sans headlines, `Inter` for crisp body labels, and `tabular-nums` monospace for all counts, percentages, and roll numbers.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Gesture Engine (Framer Motion / Motion Drag + Pointer Fallbacks)**:
  - *Chosen Approach*: Use `motion/react` with spring physics, rotation tilt based on drag offset $x$, velocity sensitivity, swipe thresholds (commit at $\pm 100\text{px}$ or flick velocity $> 500\text{px/s}$), and return-to-center spring if released prematurely.
  - *Why*: Delivers an ultra-responsive, native-feeling gesture matching the prompt poster without jank or accidental swipes. Works uniformly on desktop mouse drag, touchscreens, and trackpads.
- **Decision 2: Dual Mode (Swipe Card Deck & Tabular List Mode)**:
  - *Chosen Approach*: Shared session state machine allowing teachers to toggle between Swipe Deck mode and conventional List Checklist mode mid-session without losing progress.
  - *Why*: Accommodates teachers who prefer scanning a list or quickly identifying a few absentees in large lecture halls.
- **Decision 3: Multi-Level Session Recovery (Zero Data Loss)**:
  - *Chosen Approach*: Continuous client-side persistence in `localStorage` keyed by `session_draft_${classId}_${subjectId}_${date}`. If the browser tab closes or refreshes mid-marking, a notification banner offers instant 1-click session restoration at the exact student index.
  - *Why*: Solves the edge case of classroom internet drops or browser crashes without frustrating the teacher.

---

## 4. Technical Architecture & Data Strategy

### System Component Diagram

```
┌────────────────────────────────────────────────────────────────────────┐
│                        SwipeAttend Application                         │
│                                                                        │
│  ┌───────────────────────┐  ┌───────────────────────────────────────┐  │
│  │   Top Navigation Bar  │  │ Role Switcher (Teacher/Student/Admin) │  │
│  │ Brand · Date · Alerts │  │ Theme Toggle · Quick Demo Reset       │  │
│  └───────────┬───────────┘  └───────────────────┬───────────────────┘  │
│              │                                  │                      │
│  ┌───────────▼──────────────────────────────────▼───────────────────┐  │
│  │                         Active View Host                         │  │
│  │                                                                  │  │
│  │  ┌──────────────────────┐  ┌──────────────────────────────────┐  │  │
│  │  │ Teacher Workspace    │  │ Attendance Session Arena         │  │  │
│  │  │ • Today's Schedule   │  │ • Swipe Card Deck (Motion drag)  │  │  │
│  │  │ • Classroom Cards    │  │ • Green/Red Threshold Indicators │  │  │
│  │  │ • Low Attendance Ring│  │ • Live Counters & Progress Bar   │  │  │
│  │  │ • Roster/Roll Tools  │  │ • Undo Stack & Keyboard Hooks    │  │  │
│  │  └──────────────────────┘  │ • List Mode & Mark All Present   │  │  │
│  │                            └─────────────────┬────────────────┘  │  │
│  │  ┌──────────────────────┐                    │                   │  │
│  │  │ Student Portal       │  ┌─────────────────▼────────────────┐  │  │
│  │  │ • Overall % Dial     │  │ Session Complete & Summary Table │  │  │
│  │  │ • Subject Breakdown  │  │ • Verification · Status Editing  │  │  │
│  │  │ • Shortage Calc      │  │ • Historical Persistence & Export│  │  │
│  │  └──────────────────────┘  └──────────────────────────────────┘  │  │
│  │                                                                  │  │
│  │  ┌──────────────────────┐  ┌──────────────────────────────────┐  │  │
│  │  │ Admin Console        │  │ Reports & Historical Logs        │  │  │
│  │  │ • Institution Stats  │  │ • Session Audit Trail            │  │  │
│  │  │ • Teachers & Classes │  │ • CSV Export & Printable Slips   │  │  │
│  │  └──────────────────────┘  └──────────────────────────────────┘  │  │
│  └───────────────────────────────────┬──────────────────────────────┘  │
│                                      │                                 │
│  ┌───────────────────────────────────▼──────────────────────────────┐  │
│  │              State Store & LocalStorage Persistence              │  │
│  │   Classrooms · Students · Subjects · Timetable · Sessions · Audit│  │
│  └──────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────┘
```

### Core Entities & State Model
- **Institution**: `id`, `name: "BIT Sindri"`, `code: "BITS"`, `departments`.
- **Classroom**: `id`, `name`, `department`, `year`, `semester`, `section`, `studentCount`, `attendanceThreshold: 75`.
- **Student**: `id`, `name`, `rollNo`, `studentId`, `avatarUrl`, `email`, `classroomId`, `attendancePercentage`.
- **Subject**: `id`, `name`, `code`, `classroomId`, `teacherName`, `weeklyClasses`.
- **AttendanceSession**: `id`, `classroomId`, `subjectId`, `date`, `period`, `records: { [studentId]: 'present' | 'absent' | 'unmarked' }`, `status: 'draft' | 'completed'`, `completedAt`, `markedBy`.
- **AttendanceHistoryRecord**: Immutable finalized record with audit logs and edit annotations.

### Next Execution Steps
1. Configure metadata and entry files with brand title and OpenGraph tags.
2. Build data model, mock seed generator for BIT Sindri, and persistent storage engine with session auto-save.
3. Build the interactive swipe gesture card deck with `motion/react`, physics-driven tilts, directional green/red visual cue glows, and undo engine.
4. Implement the comprehensive review screen, completion celebration, student portal with shortage calculator, and admin console.
5. Verify build, responsiveness, and test against all 12 core acceptance tests.
