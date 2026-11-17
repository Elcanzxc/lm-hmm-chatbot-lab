import React, { useMemo } from 'react';
import katex from 'katex';
import { motion } from 'framer-motion';

interface MathFormulaProps {
  math: string;
  block?: boolean;
  className?: string;
}

export const MathFormula: React.FC<MathFormulaProps> = ({
  math,
  block = false,
  className = '',
}) => {
  const html = useMemo(() => {
    try {
      return katex.renderToString(math, {
        displayMode: block,
        throwOnError: false,
        strict: false,
      });
    } catch {
      return math;
    }
  }, [math, block]);

  return (
    <span
      className={`${block ? 'block my-1 overflow-x-auto' : 'inline-block'} ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};

interface PrecisionSliderProps {
  label: string;
  sublabel?: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (val: number) => void;
  formatValue?: (val: number) => string;
  accent?: 'sky' | 'indigo' | 'emerald' | 'amber' | 'rose';
  ticks?: number;
  badgeText?: string;
}

const ACCENT_MAP = {
  sky: {
    fill: 'from-sky-500/80 via-cyan-400 to-sky-300',
    glow: 'shadow-[0_0_16px_rgba(56,189,248,0.45)]',
    border: 'border-sky-400/50',
    text: 'text-sky-300',
    bgPill: 'bg-sky-500/15 border-sky-400/30 text-sky-300',
    thumbBorder: 'border-sky-300',
  },
  indigo: {
    fill: 'from-indigo-500/80 via-indigo-400 to-violet-300',
    glow: 'shadow-[0_0_16px_rgba(129,140,248,0.45)]',
    border: 'border-indigo-400/50',
    text: 'text-indigo-300',
    bgPill: 'bg-indigo-500/15 border-indigo-400/30 text-indigo-300',
    thumbBorder: 'border-indigo-300',
  },
  emerald: {
    fill: 'from-emerald-500/80 via-emerald-400 to-teal-300',
    glow: 'shadow-[0_0_16px_rgba(16,185,129,0.45)]',
    border: 'border-emerald-400/50',
    text: 'text-emerald-300',
    bgPill: 'bg-emerald-500/15 border-emerald-400/30 text-emerald-300',
    thumbBorder: 'border-emerald-300',
  },
  amber: {
    fill: 'from-amber-500/80 via-amber-400 to-yellow-300',
    glow: 'shadow-[0_0_16px_rgba(245,158,11,0.45)]',
    border: 'border-amber-400/50',
    text: 'text-amber-300',
    bgPill: 'bg-amber-500/15 border-amber-400/30 text-amber-300',
    thumbBorder: 'border-amber-300',
  },
  rose: {
    fill: 'from-rose-500/80 via-rose-400 to-pink-300',
    glow: 'shadow-[0_0_16px_rgba(244,63,94,0.45)]',
    border: 'border-rose-400/50',
    text: 'text-rose-300',
    bgPill: 'bg-rose-500/15 border-rose-400/30 text-rose-300',
    thumbBorder: 'border-rose-300',
  },
};

export const PrecisionSlider: React.FC<PrecisionSliderProps> = ({
  label,
  sublabel,
  value,
  min,
  max,
  step = 0.01,
  onChange,
  formatValue,
  accent = 'sky',
  ticks = 11,
  badgeText,
}) => {
  const percentage = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
  const theme = ACCENT_MAP[accent];
  const displayVal = formatValue ? formatValue(value) : value.toFixed(2);

  return (
    <div className="group relative rounded-xl bg-[#0D1424]/90 border border-white/10 p-3.5 transition-all duration-200 hover:border-white/20">
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold tracking-wide text-slate-200">
              {label}
            </span>
            {badgeText && (
              <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-white/5 text-slate-400 border border-white/10">
                {badgeText}
              </span>
            )}
          </div>
          {sublabel && (
            <span className="text-[11px] text-slate-400 font-mono mt-0.5">
              {sublabel}
            </span>
          )}
        </div>

        <div
          className={`px-2.5 py-1 rounded-md border font-mono text-xs font-bold tabular-nums tracking-tight ${theme.bgPill}`}
        >
          {displayVal}
        </div>
      </div>

      {/* Custom Precision Track & Tick Marks */}
      <div className="relative h-7 flex items-center select-none">
        {/* Background Rail */}
        <div className="w-full h-2 rounded-full bg-[#070A12] border border-white/10 overflow-hidden relative">
          {/* Glowing Active Fill */}
          <motion.div
            className={`h-full bg-gradient-to-r ${theme.fill} ${theme.glow}`}
            style={{ width: `${percentage}%` }}
            transition={{ type: 'spring', bounce: 0, duration: 0.15 }}
          />
        </div>

        {/* Tick Ruler Overlay */}
        <div className="absolute inset-x-1 -bottom-1 flex justify-between pointer-events-none">
          {Array.from({ length: ticks }).map((_, idx) => {
            const tickPct = (idx / (ticks - 1)) * 100;
            const isActive = tickPct <= percentage + 0.5;
            const isMajor = idx === 0 || idx === Math.floor((ticks - 1) / 2) || idx === ticks - 1;
            return (
              <div
                key={idx}
                className={`w-[1px] transition-colors duration-150 ${
                  isMajor ? 'h-2' : 'h-1'
                } ${isActive ? 'bg-slate-300/60' : 'bg-slate-700/60'}`}
              />
            );
          })}
        </div>

        {/* Custom Tactile Thumb Indicator */}
        <div
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 pointer-events-none z-10 transition-transform duration-75 group-hover:scale-110"
          style={{ left: `${percentage}%` }}
        >
          <div
            className={`w-4 h-4 rounded-full bg-[#090D16] border-2 ${theme.thumbBorder} ${theme.glow} flex items-center justify-center`}
          >
            <div className="w-1.5 h-1.5 rounded-full bg-white" />
          </div>
        </div>

        {/* Invisible High-Resolution Native Range Input */}
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-20"
        />
      </div>

      <div className="flex justify-between text-[10px] font-mono text-slate-500 mt-1 tabular-nums">
        <span>{formatValue ? formatValue(min) : min.toFixed(2)}</span>
        <span>{formatValue ? formatValue((min + max) / 2) : ((min + max) / 2).toFixed(2)}</span>
        <span>{formatValue ? formatValue(max) : max.toFixed(2)}</span>
      </div>
    </div>
  );
};

export const AtmosphericBackground: React.FC<{ activeTab: number }> = ({ activeTab }) => {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {/* Subtle SVG Fractal Noise Grain (opacity 0.03) */}
      <svg className="fixed inset-0 w-full h-full opacity-[0.03] mix-blend-overlay">
        <filter id="obsidian-noise">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.82"
            numOctaves="4"
            stitchTiles="stitch"
          />
        </filter>
        <rect width="100%" height="100%" filter="url(#obsidian-noise)" />
      </svg>

      {/* Engineering Grid */}
      <div className="absolute inset-0 bg-engineering-grid opacity-70" />

      {/* Dynamic Ambient Radial Spotlights depending on active tab */}
      <motion.div
        animate={{
          x: activeTab === 0 ? '-10%' : activeTab === 1 ? '25%' : '55%',
          y: activeTab === 0 ? '-5%' : activeTab === 1 ? '10%' : '-5%',
        }}
        transition={{ duration: 1.2, ease: 'easeOut' }}
        className="absolute -top-32 left-1/4 w-[680px] h-[680px] rounded-full bg-sky-500/10 blur-[140px]"
      />
      <motion.div
        animate={{
          x: activeTab === 0 ? '40%' : activeTab === 1 ? '-15%' : '10%',
          y: activeTab === 0 ? '30%' : activeTab === 1 ? '20%' : '35%',
        }}
        transition={{ duration: 1.4, ease: 'easeOut' }}
        className="absolute top-1/3 right-1/4 w-[600px] h-[600px] rounded-full bg-indigo-500/10 blur-[150px]"
      />
      <div className="absolute bottom-0 left-1/3 w-[520px] h-[360px] rounded-full bg-emerald-500/5 blur-[130px]" />
    </div>
  );
};
