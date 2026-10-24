import React, { useState } from 'react';
import {
  Camera,
  Smartphone,
  QrCode,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  X,
  Compass,
  Zap,
  ShieldCheck,
  Eye,
  Check,
} from 'lucide-react';

interface QRScannerGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenScanner?: () => void;
}

export const QRScannerGuideModal: React.FC<QRScannerGuideModalProps> = ({
  isOpen,
  onClose,
  onOpenScanner,
}) => {
  const [currentStep, setCurrentStep] = useState<number>(0);

  if (!isOpen) return null;

  const steps = [
    {
      title: 'Step 1: Open Smartphone Camera',
      subtitle: 'No App Download Required',
      description:
        'Students do not need to install any app or log into an app store. Simply open the default Camera app on any iPhone (iOS Camera) or Android smartphone (Camera or Google Lens).',
      badge: 'Zero Installation',
      icon: Camera,
      color: 'violet',
      visual: (
        <div className="relative w-52 h-64 bg-slate-900 border-4 border-slate-700 rounded-3xl p-3 shadow-2xl flex flex-col justify-between overflow-hidden mx-auto">
          {/* Top Notch */}
          <div className="w-20 h-4 bg-slate-800 rounded-full mx-auto" />
          
          {/* Camera Viewport Mock */}
          <div className="relative flex-1 bg-gradient-to-b from-slate-800 to-slate-950 rounded-2xl flex flex-col items-center justify-center border border-white/10 my-2 overflow-hidden">
            <div className="w-16 h-16 rounded-full bg-violet-600/30 border border-violet-400/50 flex items-center justify-center animate-pulse">
              <Camera className="w-8 h-8 text-violet-300" />
            </div>
            <p className="text-[11px] font-mono text-slate-300 mt-2 font-semibold">
              Standard Camera App
            </p>
            <span className="text-[9px] text-emerald-400 mt-0.5">iOS & Android Compatible</span>
          </div>

          {/* Shutter Button */}
          <div className="flex items-center justify-center pb-1">
            <div className="w-9 h-9 rounded-full border-2 border-white/60 flex items-center justify-center">
              <div className="w-7 h-7 rounded-full bg-white/90" />
            </div>
          </div>
        </div>
      ),
    },
    {
      title: 'Step 2: Point at Classroom Screen',
      subtitle: 'Instant Optical Auto-Detection',
      description:
        'Hold the camera phone facing the classroom projector or monitor where the rotating QR code is displayed. The camera lens will automatically detect the QR frame within 1 second.',
      badge: 'Auto Focus',
      icon: QrCode,
      color: 'cyan',
      visual: (
        <div className="relative w-52 h-64 bg-slate-900 border-4 border-slate-700 rounded-3xl p-3 shadow-2xl flex flex-col justify-between overflow-hidden mx-auto">
          {/* Camera Viewfinder */}
          <div className="relative flex-1 bg-[#060A16] rounded-2xl flex flex-col items-center justify-center border border-cyan-500/30 my-2 overflow-hidden">
            {/* Viewfinder Target Reticle */}
            <div className="absolute inset-4 border-2 border-cyan-400/80 rounded-xl pointer-events-none flex items-center justify-center">
              <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-cyan-300" />
              <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-cyan-300" />
              <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-cyan-300" />
              <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-cyan-300" />
              
              {/* Target Scan Line */}
              <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_8px_#22d3ee] animate-bounce" />
            </div>

            <QrCode className="w-16 h-16 text-slate-300 opacity-60" />
            <span className="absolute bottom-2 text-[9px] font-mono text-cyan-300 bg-cyan-950/80 px-2 py-0.5 rounded-full border border-cyan-500/30">
              Align QR in frame
            </span>
          </div>

          <div className="text-center text-[10px] text-slate-400 font-mono">
            Optical Alignment
          </div>
        </div>
      ),
    },
    {
      title: 'Step 3: Tap the Prompt Notification',
      subtitle: 'Single Tap Launch',
      description:
        'A browser link notification banner appears on the smartphone display (e.g., "Open SwipeAttend Attendance Link"). Tap this notification to instantly open the attendance validation interface.',
      badge: 'One Tap',
      icon: Smartphone,
      color: 'amber',
      visual: (
        <div className="relative w-52 h-64 bg-slate-900 border-4 border-slate-700 rounded-3xl p-3 shadow-2xl flex flex-col justify-between overflow-hidden mx-auto">
          <div className="relative flex-1 bg-[#0B1020] rounded-2xl p-2.5 flex flex-col justify-between border border-white/10 my-1 overflow-hidden">
            {/* Camera View Behind */}
            <div className="opacity-30 flex items-center justify-center flex-1">
              <QrCode className="w-16 h-16 text-slate-400" />
            </div>

            {/* Notification Banner Overlay */}
            <div className="absolute top-3 left-2 right-2 bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 p-2 rounded-xl shadow-lg animate-pulse flex items-center gap-2">
              <Compass className="w-4 h-4 text-slate-950 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold leading-tight truncate">SwipeAttend Portal</p>
                <p className="text-[8px] opacity-80 truncate">Tap to open session attendance</p>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-slate-950 shrink-0" />
            </div>

            <div className="text-center text-[10px] text-amber-300 font-semibold bg-amber-500/10 rounded-lg py-1 border border-amber-500/20">
              Tap Notification to Open
            </div>
          </div>

          <div className="text-center text-[10px] text-slate-400 font-mono">
            Direct Web App Launch
          </div>
        </div>
      ),
    },
    {
      title: 'Step 4: Verify Roll & Confirm Attendance',
      subtitle: 'Instant Verification & Presence Locked',
      description:
        'The student selects or confirms their Roll Number from the enrolled class roster. Biometric face validation and rotating cryptographic tokens verify presence with zero proxy possibility!',
      badge: 'Presence Marked',
      icon: CheckCircle2,
      color: 'emerald',
      visual: (
        <div className="relative w-52 h-64 bg-slate-900 border-4 border-slate-700 rounded-3xl p-3 shadow-2xl flex flex-col justify-between overflow-hidden mx-auto">
          <div className="relative flex-1 bg-[#09121E] rounded-2xl p-2.5 flex flex-col items-center justify-center text-center border border-emerald-500/30 my-1 overflow-hidden">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.4)] mb-2">
              <Check className="w-6 h-6 stroke-[3]" />
            </div>

            <span className="text-xs font-bold text-white font-['Plus_Jakarta_Sans']">
              Attendance Verified!
            </span>
            <span className="text-[10px] text-emerald-300 font-mono mt-0.5">
              Roll #23 · Present
            </span>

            <div className="mt-2 text-[9px] text-slate-400 bg-white/5 px-2 py-0.5 rounded-full border border-white/5 font-mono">
              GPS & Rotating Token Verified
            </div>
          </div>

          <div className="text-center text-[10px] text-emerald-400 font-mono font-semibold">
            Status: Marked Present
          </div>
        </div>
      ),
    },
  ];

  const activeStep = steps[currentStep];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-xl bg-[#0C1120] border border-cyan-500/30 rounded-3xl p-5 sm:p-7 shadow-2xl text-slate-100 flex flex-col space-y-5 my-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-violet-400">
              <Sparkles className="w-5 h-5 text-violet-300" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white font-['Plus_Jakarta_Sans']">
                Student Camera Scan Guide
              </h3>
              <p className="text-xs text-slate-400">
                How students mark attendance using their phone camera
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
            aria-label="Close guide"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Progress Indicators */}
        <div className="grid grid-cols-4 gap-2">
          {steps.map((s, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentStep(idx)}
              className={`h-2 rounded-full transition-all cursor-pointer ${
                idx === currentStep
                  ? 'bg-gradient-to-r from-violet-500 to-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.5)]'
                  : idx < currentStep
                  ? 'bg-emerald-500/60'
                  : 'bg-white/10'
              }`}
              title={`Jump to ${s.title}`}
            />
          ))}
        </div>

        {/* Interactive Visual + Explanation Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center bg-[#080D18] border border-white/5 rounded-2xl p-4 sm:p-5">
          {/* Left: Interactive Phone Mockup */}
          <div className="md:col-span-5 flex justify-center">
            {activeStep.visual}
          </div>

          {/* Right: Step Details */}
          <div className="md:col-span-7 space-y-3">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/30 text-[11px] font-semibold">
              <activeStep.icon className="w-3.5 h-3.5" />
              <span>{activeStep.badge}</span>
              <span className="text-slate-400 font-mono ml-1">
                {currentStep + 1} of {steps.length}
              </span>
            </div>

            <h4 className="text-lg sm:text-xl font-bold text-white font-['Plus_Jakarta_Sans'] leading-tight">
              {activeStep.title}
            </h4>
            <p className="text-xs font-semibold text-cyan-300 font-mono">
              {activeStep.subtitle}
            </p>
            <p className="text-xs text-slate-300 leading-relaxed">
              {activeStep.description}
            </p>

            {/* Anti-Proxy Features Tip */}
            <div className="p-2.5 rounded-xl bg-violet-950/40 border border-violet-500/20 text-[11px] text-slate-300 flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-violet-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-violet-200">Anti-Proxy Security: </span>
                <span>
                  The QR code rotates tokens every 30 seconds. Screenshots cannot be shared among proxy attendees.
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Navigation Buttons */}
        <div className="flex items-center justify-between pt-2 border-t border-white/10">
          <button
            type="button"
            onClick={handlePrev}
            disabled={currentStep === 0}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Previous</span>
          </button>

          <div className="flex items-center gap-2">
            {onOpenScanner && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenScanner();
                }}
                className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl bg-cyan-600/20 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-600/30 text-xs font-semibold transition-colors cursor-pointer"
              >
                <Camera className="w-4 h-4 text-cyan-400" />
                <span>Try In-App Scanner</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleNext}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-bold shadow-md shadow-violet-600/30 transition-all cursor-pointer"
            >
              <span>{currentStep === steps.length - 1 ? 'Got it, let’s start!' : 'Next Step'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QRScannerGuideModal;
