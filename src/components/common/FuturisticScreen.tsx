import React, { createContext, useContext } from 'react';

export type FuturisticAuraMode = 'cyber' | 'quantum' | 'solar' | 'space';

interface FuturisticContextType {
  auraMode: FuturisticAuraMode;
  setAuraMode: (mode: FuturisticAuraMode) => void;
  hasGrid: boolean;
  setHasGrid: (val: boolean) => void;
  isHighGlow: boolean;
  setIsHighGlow: (val: boolean) => void;
  hasScanlines: boolean;
  setHasScanlines: (val: boolean) => void;
}

const FuturisticContext = createContext<FuturisticContextType>({
  auraMode: 'cyber',
  setAuraMode: () => {},
  hasGrid: false,
  setHasGrid: () => {},
  isHighGlow: false,
  setIsHighGlow: () => {},
  hasScanlines: false,
  setHasScanlines: () => {},
});

export const useFuturistic = () => useContext(FuturisticContext);

interface FuturisticScreenProps {
  children: React.ReactNode;
}

/**
 * Clean, lightweight layout wrapper providing optimal contrast,
 * zero layout overhead, and a distraction-free experience.
 */
export const FuturisticScreen: React.FC<FuturisticScreenProps> = ({ children }) => {
  const contextValue: FuturisticContextType = {
    auraMode: 'cyber',
    setAuraMode: () => {},
    hasGrid: false,
    setHasGrid: () => {},
    isHighGlow: false,
    setIsHighGlow: () => {},
    hasScanlines: false,
    setHasScanlines: () => {},
  };

  return (
    <FuturisticContext.Provider value={contextValue}>
      <div className="min-h-screen w-full max-w-full relative flex flex-col bg-[#0B0F19] text-slate-100 font-['Plus_Jakarta_Sans',sans-serif] selection:bg-violet-500 selection:text-white overflow-x-hidden">
        {/* Main Application Container */}
        <div className="relative z-10 flex-1 flex flex-col w-full max-w-full min-w-0 overflow-x-hidden">{children}</div>

        {/* Clean, Quiet Academic Footer */}
        <footer className="relative z-20 bg-[#080C16] border-t border-slate-800/80 px-4 py-3 flex flex-wrap items-center justify-between text-xs text-slate-400 select-none gap-2">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-300">SwipeAttend</span>
            <span className="text-slate-600">·</span>
            <span>Smart Attendance Management</span>
            <span className="hidden sm:inline text-slate-600">·</span>
            <span className="hidden sm:inline text-slate-400">BIT Sindri</span>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-slate-400">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400" />
            <span>Ready · Cloud & Offline</span>
          </div>
        </footer>
      </div>
    </FuturisticContext.Provider>
  );
};

// Re-export alias for backward compatibility
export const RetroCRTScreen = FuturisticScreen;
