import React, { useState } from 'react';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { Download, Share, PlusSquare, X } from 'lucide-react';
import { SwipeAttendLogo } from './SwipeAttendLogo';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already running as an installed PWA, hide the button
  if (isInstalled) {
    return null;
  }

  // Chromium / Android / Desktop flow
  if (isInstallable) {
    return (
      <button
        onClick={install}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-linear-to-r from-violet-600 to-indigo-600 text-white font-semibold text-xs shadow-md hover:from-violet-500 hover:to-indigo-500 transition-all cursor-pointer"
        title="Install SwipeAttend as a standalone app"
      >
        <Download className="w-3.5 h-3.5" />
        <span>Install App</span>
      </button>
    );
  }

  // iOS Safari flow (beforeinstallprompt is not supported by WebKit)
  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-slate-300 hover:text-white text-xs font-semibold border border-white/10 transition-colors cursor-pointer"
          title="Install on iPhone / iPad"
        >
          <Download className="w-3.5 h-3.5 text-violet-400" />
          <span className="hidden sm:inline">Install App</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-fade-in">
            <div className="bg-[#101526] border border-white/15 rounded-3xl p-5 max-w-sm w-full space-y-4 shadow-2xl">
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-2.5">
                  <SwipeAttendLogo size={36} />
                  <div>
                    <h3 className="font-bold text-white text-sm">Install SwipeAttend</h3>
                    <p className="text-[10px] text-slate-400">Offline PWA on iOS</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 text-xs text-slate-300">
                <div className="flex items-start gap-2.5">
                  <div className="w-6 h-6 rounded-full bg-violet-600/30 text-violet-400 font-bold flex items-center justify-center shrink-0">
                    1
                  </div>
                  <p>
                    Tap the <strong className="text-white">Share</strong> button <Share className="inline w-3.5 h-3.5 text-cyan-400" /> at the bottom of Safari.
                  </p>
                </div>

                <div className="flex items-start gap-2.5">
                  <div className="w-6 h-6 rounded-full bg-violet-600/30 text-violet-400 font-bold flex items-center justify-center shrink-0">
                    2
                  </div>
                  <p>
                    Scroll down and tap <strong className="text-white">Add to Home Screen</strong> <PlusSquare className="inline w-3.5 h-3.5 text-emerald-400" />.
                  </p>
                </div>

                <div className="flex items-start gap-2.5">
                  <div className="w-6 h-6 rounded-full bg-violet-600/30 text-violet-400 font-bold flex items-center justify-center shrink-0">
                    3
                  </div>
                  <p>
                    Tap <strong className="text-white">Add</strong> in the top-right corner to launch SwipeAttend anytime with full offline support.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowIOSGuide(false)}
                className="w-full py-2.5 rounded-xl bg-violet-600 text-white font-bold text-xs hover:bg-violet-500 transition-colors cursor-pointer"
              >
                Got It
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  // Desktop / Other browser fallback when beforeinstallprompt has not fired yet or in preview iframe
  const [showDesktopGuide, setShowDesktopGuide] = useState(false);

  return (
    <>
      <button
        onClick={() => setShowDesktopGuide(true)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-violet-600/20 hover:bg-violet-600/30 text-violet-300 hover:text-white text-xs font-semibold border border-violet-500/30 transition-colors cursor-pointer"
        title="Install SwipeAttend as a standalone app"
      >
        <Download className="w-3.5 h-3.5 text-violet-400" />
        <span className="hidden sm:inline">Install App</span>
      </button>

      {showDesktopGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-[#101526] border border-white/15 rounded-3xl p-5 max-w-sm w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <SwipeAttendLogo size={36} />
                <div>
                  <h3 className="font-bold text-white text-sm">Install SwipeAttend PWA</h3>
                  <p className="text-[10px] text-slate-400">Offline & Fast Native Experience</p>
                </div>
              </div>
              <button
                onClick={() => setShowDesktopGuide(false)}
                className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-300">
              <div className="flex items-start gap-2.5">
                <div className="w-6 h-6 rounded-full bg-violet-600/30 text-violet-400 font-bold flex items-center justify-center shrink-0">
                  1
                </div>
                <p>
                  Look at your browser's address bar (top right) and click the <strong className="text-white">Install</strong> icon <Download className="inline w-3.5 h-3.5 text-violet-400" />.
                </p>
              </div>

              <div className="flex items-start gap-2.5">
                <div className="w-6 h-6 rounded-full bg-violet-600/30 text-violet-400 font-bold flex items-center justify-center shrink-0">
                  2
                </div>
                <p>
                  Or open browser menu (<strong className="text-white">⋮</strong>) and select <strong className="text-white">"Install SwipeAttend"</strong> or <strong className="text-white">"Save and Share &gt; Install App"</strong>.
                </p>
              </div>

              <div className="flex items-start gap-2.5">
                <div className="w-6 h-6 rounded-full bg-violet-600/30 text-violet-400 font-bold flex items-center justify-center shrink-0">
                  3
                </div>
                <p>
                  Enjoy <strong className="text-emerald-400">100% offline</strong> attendance marking, instant caching, and lightning-fast loading speeds without internet!
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowDesktopGuide(false)}
              className="w-full py-2.5 rounded-xl bg-violet-600 text-white font-bold text-xs hover:bg-violet-500 transition-colors cursor-pointer"
            >
              Got It
            </button>
          </div>
        </div>
      )}
    </>
  );
};
