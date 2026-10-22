import React, { useState, useEffect, useMemo, createContext, useContext } from 'react';
import { Sparkles, Grid, Radio, Sliders, Layers } from 'lucide-react';

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
  hasGrid: true,
  setHasGrid: () => {},
  isHighGlow: true,
  setIsHighGlow: () => {},
  hasScanlines: false,
  setHasScanlines: () => {},
});

export const useFuturistic = () => useContext(FuturisticContext);

// Isolated, memoized digital clock to prevent root-level re-rendering of children every second
const TelemetryClock: React.FC = React.memo(() => {
  const [time, setTime] = useState<string>(() => {
    const d = new Date();
    return d.toTimeString().split(' ')[0];
  });

  useEffect(() => {
    const interval = setInterval(() => {
      const d = new Date();
      setTime(d.toTimeString().split(' ')[0]);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return <span className="tabular-nums font-semibold text-slate-200">{time}</span>;
});

interface FuturisticScreenProps {
  children: React.ReactNode;
}

export const FuturisticScreen: React.FC<FuturisticScreenProps> = ({ children }) => {
  const [auraMode, setAuraMode] = useState<FuturisticAuraMode>(() => {
    if (typeof window === 'undefined') return 'cyber';
    return (localStorage.getItem('swipeattend_futuristic_aura') as FuturisticAuraMode) || 'cyber';
  });

  const [hasGrid, setHasGrid] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    const stored = localStorage.getItem('swipeattend_futuristic_grid');
    return stored !== null ? stored === 'true' : true;
  });

  const [isHighGlow, setIsHighGlow] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    const stored = localStorage.getItem('swipeattend_futuristic_glow');
    return stored !== null ? stored === 'true' : true;
  });

  const [hasScanlines, setHasScanlines] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const stored = localStorage.getItem('swipeattend_futuristic_scanlines');
    return stored !== null ? stored === 'true' : false;
  });

  useEffect(() => {
    localStorage.setItem('swipeattend_futuristic_aura', auraMode);
  }, [auraMode]);

  useEffect(() => {
    localStorage.setItem('swipeattend_futuristic_grid', String(hasGrid));
  }, [hasGrid]);

  useEffect(() => {
    localStorage.setItem('swipeattend_futuristic_glow', String(isHighGlow));
  }, [isHighGlow]);

  useEffect(() => {
    localStorage.setItem('swipeattend_futuristic_scanlines', String(hasScanlines));
  }, [hasScanlines]);

  // Atmospheric neon lighting spectrum definitions
  const auraGradients = useMemo(() => ({
    cyber: {
      glow: 'from-cyan-500/25 via-violet-600/20 to-transparent',
      accent: 'text-cyan-400 border-cyan-500/40 bg-cyan-500/10',
      dot: 'bg-cyan-400 shadow-[0_0_12px_#22d3ee]',
      border: 'border-cyan-500/30',
      tag: 'Cyber Neon',
    },
    quantum: {
      glow: 'from-emerald-500/25 via-teal-600/20 to-transparent',
      accent: 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10',
      dot: 'bg-emerald-400 shadow-[0_0_12px_#34d399]',
      border: 'border-emerald-500/30',
      tag: 'Quantum Matrix',
    },
    solar: {
      glow: 'from-amber-500/25 via-rose-600/20 to-transparent',
      accent: 'text-amber-400 border-amber-500/40 bg-amber-500/10',
      dot: 'bg-amber-400 shadow-[0_0_12px_#fbbf24]',
      border: 'border-amber-500/30',
      tag: 'Solar Flare',
    },
    space: {
      glow: 'from-indigo-500/25 via-sky-600/15 to-transparent',
      accent: 'text-sky-300 border-sky-400/40 bg-sky-500/10',
      dot: 'bg-sky-400 shadow-[0_0_12px_#38bdf8]',
      border: 'border-sky-500/30',
      tag: 'Deep Space',
    },
  }[auraMode]), [auraMode]);

  const contextValue = useMemo<FuturisticContextType>(() => ({
    auraMode,
    setAuraMode,
    hasGrid,
    setHasGrid,
    isHighGlow,
    setIsHighGlow,
    hasScanlines,
    setHasScanlines,
  }), [auraMode, hasGrid, isHighGlow, hasScanlines]);

  return (
    <FuturisticContext.Provider value={contextValue}>
      <div className="min-h-screen relative flex flex-col bg-[#060813] text-slate-100 font-['Plus_Jakarta_Sans',sans-serif] selection:bg-cyan-500 selection:text-black overflow-x-hidden">
        {/* Futuristic Ambient Grid Matrix Overlay */}
        {hasGrid && (
          <div className="fixed inset-0 pointer-events-none z-0 futuristic-grid-bg opacity-75" />
        )}

        {/* Optional Futuristic Laser Scanlines Overlay */}
        {hasScanlines && (
          <div className="fixed inset-0 pointer-events-none z-40 laser-scanlines opacity-60" />
        )}

        {/* Ambient Top Laser Nebula Beam */}
        {isHighGlow && (
          <div
            className={`fixed -top-40 left-1/2 -translate-x-1/2 w-[900px] h-[360px] bg-gradient-to-b ${auraGradients.glow} rounded-full blur-[110px] pointer-events-none z-0 animate-cyber-pulse`}
          />
        )}

        {/* Main Application Container */}
        <div className="relative z-10 flex-1 flex flex-col">{children}</div>

        {/* Futuristic Cyber Footer Telemetry Bar */}
        <footer className="relative z-20 bg-[#060814]/95 backdrop-blur-xl border-t border-cyan-500/20 px-4 py-2.5 flex items-center justify-between text-xs text-slate-400 font-mono select-none">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex items-center gap-1.5 text-cyan-400 font-bold">
              <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee] animate-pulse" />
              <span>SMART ATTENDANCE PROTOCOL</span>
            </span>
            <span className="hidden sm:inline text-slate-600">·</span>
            <span className="hidden sm:inline text-[11px] text-slate-400">
              GESTURE & QR HYBRID ENGINE
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden md:inline text-[11px] text-slate-400">
              BIT SINDRI ACADEMIC DECK
            </span>
            <span className="px-2 py-0.5 rounded-full bg-violet-500/15 border border-violet-500/30 text-violet-300 font-bold text-[10px]">
              ONLINE CLOUD
            </span>
          </div>
        </footer>
      </div>
    </FuturisticContext.Provider>
  );
};

// Re-export alias for backward compatibility with existing imports
export const RetroCRTScreen = FuturisticScreen;
