# SwipeAttend — Smart Gesture & QR Attendance System (BIT Sindri)

SwipeAttend is a high-speed, modern attendance management web application engineered for colleges and universities. It features rapid card-swiping attendance marking, dynamic QR code attendance for smartphones, individual student pass portals, detailed attendance analytics, offline support, and full PWA (Progressive Web App) installability.

---

## 🚀 Quick Start Guide

### Prerequisites
- [Node.js](https://nodejs.org/) v18.0.0 or higher
- npm or yarn or pnpm

### 1. Extract & Install Dependencies
After downloading and extracting this ZIP file, navigate into the project directory in your terminal:

```bash
cd SwipeAttend-App
npm install
```

### 2. Configure Environment (Optional)
A `.env.example` file is included. Copy it to `.env`:

```bash
cp .env.example .env
```
*(Optional: If you want AI roll generation powered by Google Gemini, provide your `GEMINI_API_KEY` in `.env`)*

### 3. Launch Development Server
```bash
npm run dev
```

Open your web browser and navigate to:
```
http://localhost:3000
```

---

## 🛠 Available Scripts

- **`npm run dev`**: Starts the Express + Vite development server on port 3000.
- **`npm run build`**: Compiles and bundles TypeScript and React assets into production-ready `/dist`.
- **`npm start`**: Runs the production server using `node server.ts`.
- **`npm run lint`**: Performs TypeScript type verification.

---

## ✨ Key Features

1. **Swipe Attendance Arena**: Swipe right for Present, swipe left for Absent, with keyboard shortcuts (Arrow Right / Arrow Left / Space).
2. **Dynamic QR Code Attendance**:
   - Generates rotating secure QR tokens every 25 seconds to eliminate proxy attendance.
   - Students scan from their mobile camera to submit attendance instantly.
3. **Student Pass & Identity Portal**:
   - Fast instant student search directory by Roll Number, Name, Student ID, or Department.
   - Dynamic real-time calculation of overall attendance percentage, classes held, classes attended, and shortage calculator.
   - Dynamic subject-wise breakdown and individual lecture attendance history.
   - Digital ID Card & QR pass modal.
4. **Offline PWA Capabilities**:
   - Automatically caches assets with service workers.
   - Records attendance offline and queues sessions; auto-syncs when internet connection restores.
   - Installable on Android, iOS, Windows, and Mac as a native desktop/mobile app.
5. **Data Export & Reports**:
   - Export official attendance sheets directly to Excel (.xlsx) and CSV format.
   - Full student roster management and classroom creation.

---

## 📁 Project Structure

```
├── public/                 # Static assets, icons, PWA manifest, and portraits
├── src/
│   ├── components/
│   │   ├── attendance/     # SwipeArena card deck and gestures
│   │   ├── classroom/      # Classroom and branch management
│   │   ├── common/         # Avatars, modals, logos, buttons
│   │   ├── qr/             # Live rotating QR display & mobile scanner
│   │   ├── student/        # Student Pass portal, search, and subjects
│   │   └── teacher/        # Teacher dashboard and timetable
│   ├── services/           # Firebase, offline sync, storage, download
│   ├── types/              # TypeScript interfaces and data models
│   ├── App.tsx             # Main application orchestrator
│   └── main.tsx            # Vite React entry point
├── server.ts               # Express backend API & Vite middleware
├── package.json            # Project dependencies and scripts
├── vite.config.ts          # Vite & PWA configuration
└── tsconfig.json           # TypeScript configuration
```

---

© BIT Sindri — SwipeAttend Attendance System
