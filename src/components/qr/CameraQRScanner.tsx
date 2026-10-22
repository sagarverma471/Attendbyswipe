import React, { useState, useEffect, useRef, useCallback } from 'react';
import jsQR from 'jsqr';
import {
  Camera,
  CameraOff,
  FlipHorizontal,
  Zap,
  ZapOff,
  Upload,
  AlertCircle,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';

export interface DecodedQRData {
  rawText: string;
  sessionId?: string;
  classroomId?: string;
  classroomName?: string;
  subjectName?: string;
  department?: string;
  section?: string;
  teacherName?: string;
  token?: string;
  rollNo?: string;
  studentId?: string;
  studentName?: string;
}

interface CameraQRScannerProps {
  onScanSuccess: (data: DecodedQRData) => void;
  isScanning?: boolean;
  className?: string;
}

export const CameraQRScanner: React.FC<CameraQRScannerProps> = ({
  onScanSuccess,
  isScanning = true,
  className = '',
}) => {
  const [hasCamera, setHasCamera] = useState<boolean>(true);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [torchEnabled, setTorchEnabled] = useState<boolean>(false);
  const [hasTorch, setHasTorch] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [lastScannedCode, setLastScannedCode] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Play crisp audio beep when QR is detected
  const playBeep = useCallback(() => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, audioCtx.currentTime); // A5
      osc.frequency.exponentialRampToValueAtTime(1320, audioCtx.currentTime + 0.1); // E6
      gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.15);
    } catch {}

    // Haptic vibration
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate([40, 30, 40]);
      } catch {}
    }
  }, []);

  // Helper to parse student QR URL parameters or ID cards
  const parseQRContent = useCallback((raw: string): DecodedQRData => {
    try {
      // Check if URL
      if (raw.startsWith('http://') || raw.startsWith('https://') || raw.includes('action=student-qr')) {
        const parsedUrl = new URL(raw.startsWith('http') ? raw : `https://example.com${raw}`);
        const sp = parsedUrl.searchParams;
        return {
          rawText: raw,
          sessionId: sp.get('sessionId') || undefined,
          classroomId: sp.get('classroomId') || undefined,
          classroomName: sp.get('classroomName') || sp.get('name') || undefined,
          subjectName: sp.get('subjectName') || sp.get('subject') || undefined,
          department: sp.get('dept') || sp.get('department') || undefined,
          section: sp.get('sec') || sp.get('section') || undefined,
          teacherName: sp.get('teacher') || undefined,
          token: sp.get('token') || undefined,
          rollNo: sp.get('rollNo') || sp.get('roll') || undefined,
          studentId: sp.get('studentId') || sp.get('id') || undefined,
          studentName: sp.get('studentName') || sp.get('name') || undefined,
        };
      }

      // Check if JSON payload (e.g. from student digital ID card)
      if (raw.trim().startsWith('{') && raw.trim().endsWith('}')) {
        const json = JSON.parse(raw);
        return {
          rawText: raw,
          sessionId: json.sessionId,
          classroomId: json.classroomId,
          token: json.token,
          classroomName: json.classroomName,
          subjectName: json.subjectName,
          rollNo: json.rollNo || json.roll,
          studentId: json.studentId || json.id,
          studentName: json.studentName || json.name || json.fullName,
          department: json.department || json.dept,
          section: json.section || json.sec,
        };
      }
    } catch {}

    const cleanRaw = raw.trim();
    // Check if raw looks like student roll number (e.g. 26CSE001, 24IT021, etc.)
    const isLikelyRoll = /^[0-9]{2}[A-Za-z]{2,4}[0-9]{2,4}$/i.test(cleanRaw) || /^ST[0-9]{3,5}$/i.test(cleanRaw);

    // Fallback: direct token or text
    return {
      rawText: raw,
      token: cleanRaw.toUpperCase(),
      rollNo: isLikelyRoll ? cleanRaw.toUpperCase() : undefined,
    };
  }, []);

  // Start Camera Stream
  const startCamera = useCallback(async () => {
    setCameraError(null);

    // Stop existing stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setHasCamera(false);
      setCameraError('Camera API is not supported in this browser. Please upload a QR image or enter the code manually.');
      return;
    }

    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play();
      }

      // Check for torch capability
      const track = stream.getVideoTracks()[0];
      if (track) {
        const capabilities = (track.getCapabilities ? track.getCapabilities() : {}) as any;
        setHasTorch(Boolean(capabilities && capabilities.torch));
      }

      setHasCamera(true);
    } catch (err: any) {
      console.warn('Camera access error:', err);
      setHasCamera(false);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraError('Camera permission denied. Allow camera permissions in browser settings or upload a QR screenshot.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setCameraError('No camera found on this device. You can upload a QR photo or enter code manually.');
      } else {
        setCameraError('Unable to access camera feed. You can upload a QR photo or enter code manually.');
      }
    }
  }, [facingMode]);

  // Stop camera stream
  const stopCamera = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  // Toggle Torch/Flashlight
  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (track) {
      try {
        const nextTorch = !torchEnabled;
        await (track as any).applyConstraints({
          advanced: [{ torch: nextTorch }],
        });
        setTorchEnabled(nextTorch);
      } catch (err) {
        console.warn('Torch toggle failed:', err);
      }
    }
  };

  // Flip Front/Back Camera
  const toggleCameraFacing = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  // Process Video Frame for QR Code
  const scanFrame = useCallback(() => {
    if (!isScanning || isProcessing) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
      animationFrameRef.current = requestAnimationFrame(scanFrame);
      return;
    }

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) {
      animationFrameRef.current = requestAnimationFrame(scanFrame);
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: 'dontInvert',
    });

    if (code && code.data) {
      const rawText = code.data.trim();
      if (rawText && rawText !== lastScannedCode) {
        setLastScannedCode(rawText);
        setIsProcessing(true);
        playBeep();

        const decoded = parseQRContent(rawText);
        onScanSuccess(decoded);

        // Reset debounce after 2 seconds
        setTimeout(() => {
          setIsProcessing(false);
          setLastScannedCode(null);
        }, 2000);
        return;
      }
    }

    animationFrameRef.current = requestAnimationFrame(scanFrame);
  }, [isScanning, isProcessing, lastScannedCode, onScanSuccess, parseQRContent, playBeep]);

  // Start scanning loop when stream is active
  useEffect(() => {
    if (isScanning && hasCamera) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isScanning, facingMode, startCamera, stopCamera, hasCamera]);

  // Keep scanning frame loop alive
  useEffect(() => {
    if (isScanning && hasCamera && !isProcessing) {
      animationFrameRef.current = requestAnimationFrame(scanFrame);
    }
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [scanFrame, isScanning, hasCamera, isProcessing]);

  // Handle Photo/Screenshot Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height);
          if (code && code.data) {
            playBeep();
            const decoded = parseQRContent(code.data.trim());
            onScanSuccess(decoded);
          } else {
            alert('No valid QR code could be found in the uploaded image. Please try a clearer screenshot.');
          }
        }
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
    // Reset file input
    e.target.value = '';
  };

  return (
    <div className={`relative w-full overflow-hidden rounded-2xl sm:rounded-3xl bg-[#090D1A] border border-white/10 ${className}`}>
      {/* Hidden processing canvas */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Hidden File Input for QR Image upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* Camera Video Feed */}
      {hasCamera && !cameraError ? (
        <div className="relative w-full aspect-square max-h-[360px] sm:max-h-[420px] flex items-center justify-center bg-black overflow-hidden">
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            autoPlay
            playsInline
            muted
          />

          {/* Scanner Reticle Overlay */}
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-6 sm:p-8">
            <div className="relative w-56 h-56 sm:w-68 sm:h-68 rounded-2xl border-2 border-violet-500/40 flex items-center justify-center">
              {/* Corner Accents */}
              <div className="absolute -top-1 -left-1 w-6 h-6 border-t-3 border-l-3 border-violet-400 rounded-tl-lg" />
              <div className="absolute -top-1 -right-1 w-6 h-6 border-t-3 border-r-3 border-violet-400 rounded-tr-lg" />
              <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-3 border-l-3 border-violet-400 rounded-bl-lg" />
              <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-3 border-r-3 border-violet-400 rounded-br-lg" />

              {/* Animated Laser Scanning Beam */}
              {!isProcessing && (
                <div className="absolute left-2 right-2 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_12px_#22d3ee] animate-pulse"
                  style={{
                    animation: 'scannerLaser 2.2s ease-in-out infinite alternate',
                  }}
                />
              )}

              {/* Success Badge Flash */}
              {isProcessing && (
                <div className="absolute inset-0 bg-emerald-500/20 backdrop-blur-xs rounded-2xl flex flex-col items-center justify-center text-white animate-fade-in">
                  <CheckCircle2 className="w-12 h-12 text-emerald-400 animate-bounce" />
                  <p className="text-xs font-bold mt-2 text-emerald-300">QR Code Verified!</p>
                </div>
              )}
            </div>
          </div>

          {/* Top Camera Controls Overlay */}
          <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-auto">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-[11px] text-slate-300 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>Camera Active</span>
            </div>

            <div className="flex items-center gap-2">
              {hasTorch && (
                <button
                  type="button"
                  onClick={toggleTorch}
                  className={`p-2 rounded-xl backdrop-blur-md border transition-all cursor-pointer ${
                    torchEnabled
                      ? 'bg-amber-500 text-black border-amber-400 shadow-lg shadow-amber-500/30'
                      : 'bg-black/60 text-white border-white/10 hover:bg-black/80'
                  }`}
                  title={torchEnabled ? 'Turn torch off' : 'Turn torch on'}
                >
                  {torchEnabled ? <Zap className="w-4 h-4 fill-current" /> : <ZapOff className="w-4 h-4" />}
                </button>
              )}

              <button
                type="button"
                onClick={toggleCameraFacing}
                className="p-2 rounded-xl bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/10 text-white transition-all cursor-pointer"
                title="Flip front/back camera"
              >
                <FlipHorizontal className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Bottom Floating Tip */}
          <div className="absolute bottom-3 inset-x-4 flex items-center justify-between gap-2">
            <p className="text-[11px] text-slate-300 bg-black/70 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 truncate">
              Align QR code inside frame
            </p>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-600/80 hover:bg-violet-600 backdrop-blur-md text-white text-xs font-semibold shadow-md transition-all cursor-pointer shrink-0"
              title="Upload QR code from photo gallery or screenshot"
            >
              <Upload className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">Upload Image</span>
            </button>
          </div>
        </div>
      ) : (
        /* Camera Unavailable or Permission Denied Fallback */
        <div className="p-6 sm:p-8 flex flex-col items-center justify-center text-center space-y-4 min-h-[280px]">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <CameraOff className="w-7 h-7" />
          </div>

          <div className="max-w-xs space-y-1">
            <h4 className="font-bold text-white text-sm sm:text-base">Camera Not Accessible</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              {cameraError || 'Allow camera access in your browser, or upload a photo of the QR code.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1">
            <button
              type="button"
              onClick={() => startCamera()}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold border border-white/10 transition-colors cursor-pointer"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Retry Camera</span>
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold shadow-md transition-colors cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload QR Screenshot</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
