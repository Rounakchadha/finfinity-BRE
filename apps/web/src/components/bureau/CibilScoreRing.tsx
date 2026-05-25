'use client';

import { motion } from 'framer-motion';
import { clsx } from 'clsx';

interface CibilScoreRingProps {
  score: number;
  size?: number;
  strokeWidth?: number;
  showLabel?: boolean;
  animated?: boolean;
}

function getScoreColor(score: number): string {
  if (score >= 750) return '#34d399'; // green
  if (score >= 650) return '#fbbf24'; // amber
  return '#f87171'; // red
}

function getScoreLabel(score: number): string {
  if (score >= 800) return 'Excellent';
  if (score >= 750) return 'Very Good';
  if (score >= 700) return 'Good';
  if (score >= 650) return 'Fair';
  if (score >= 600) return 'Poor';
  return 'Very Poor';
}

function getScorePercent(score: number): number {
  // CIBIL range: 300 to 900
  const min = 300;
  const max = 900;
  return Math.max(0, Math.min(1, (score - min) / (max - min)));
}

export function CibilScoreRing({
  score,
  size = 160,
  strokeWidth = 12,
  showLabel = true,
  animated = true,
}: CibilScoreRingProps) {
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = radius * 2 * Math.PI;
  // Use 270° arc (start from bottom-left, go clockwise)
  const arcLength = circumference * 0.75;
  const scorePercent = getScorePercent(score);
  const fillLength = arcLength * scorePercent;
  const color = getScoreColor(score);
  const label = getScoreLabel(score);

  // Rotation: start from 135° (bottom-left)
  const startAngle = 135;

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        className="absolute inset-0"
        style={{ transform: `rotate(${startAngle}deg)` }}
      >
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(30,61,52,0.8)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${arcLength} ${circumference}`}
        />

        {/* Progress */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${fillLength} ${circumference}`}
          initial={animated ? { strokeDasharray: `0 ${circumference}` } : undefined}
          animate={
            animated
              ? { strokeDasharray: `${fillLength} ${circumference}` }
              : undefined
          }
          transition={{ duration: 1.2, ease: 'easeOut', delay: 0.2 }}
          style={{
            filter: `drop-shadow(0 0 6px ${color})`,
          }}
        />
      </svg>

      {/* Center content */}
      <div className="flex flex-col items-center justify-center relative z-10">
        <motion.div
          initial={animated ? { opacity: 0, scale: 0.8 } : undefined}
          animate={animated ? { opacity: 1, scale: 1 } : undefined}
          transition={{ delay: 0.5, duration: 0.4 }}
          className="text-3xl font-black leading-none"
          style={{ color }}
        >
          {score || '—'}
        </motion.div>
        {showLabel && score > 0 && (
          <motion.div
            initial={animated ? { opacity: 0 } : undefined}
            animate={animated ? { opacity: 1 } : undefined}
            transition={{ delay: 0.7 }}
            className="text-xs text-muted mt-1 font-medium"
          >
            {label}
          </motion.div>
        )}
      </div>
    </div>
  );
}

// ─── Score bar (horizontal) ────────────────────────────────────────────────────

interface CibilScoreBarProps {
  score: number;
  className?: string;
}

export function CibilScoreBar({ score, className }: CibilScoreBarProps) {
  const percent = getScorePercent(score) * 100;
  const color = getScoreColor(score);

  const zones = [
    { label: 'Very Poor', max: 30, color: '#f87171' },
    { label: 'Poor', max: 45, color: '#fb923c' },
    { label: 'Fair', max: 60, color: '#fbbf24' },
    { label: 'Good', max: 75, color: '#a3e635' },
    { label: 'Very Good', max: 90, color: '#34d399' },
    { label: 'Excellent', max: 100, color: '#25F0C0' },
  ];

  return (
    <div className={clsx('w-full', className)}>
      {/* Bar */}
      <div className="relative h-2.5 rounded-full bg-faint overflow-hidden">
        <div
          className="absolute left-0 top-0 h-full rounded-full transition-all duration-1000"
          style={{
            width: `${percent}%`,
            background: `linear-gradient(90deg, #f87171 0%, #fbbf24 40%, #34d399 70%, #25F0C0 100%)`,
          }}
        />
        {/* Marker */}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 border-black shadow-lg transition-all duration-1000"
          style={{
            left: `calc(${percent}% - 6px)`,
            background: color,
          }}
        />
      </div>

      {/* Scale labels */}
      <div className="flex justify-between mt-1">
        <span className="text-[10px] text-muted">300</span>
        <span className="text-[10px] text-muted">600</span>
        <span className="text-[10px] text-muted">750</span>
        <span className="text-[10px] text-muted">900</span>
      </div>

      {/* Zone labels */}
      <div className="flex gap-2 mt-2 flex-wrap">
        {zones.map((z) => (
          <span
            key={z.label}
            className="text-[10px] px-2 py-0.5 rounded-full"
            style={{
              background: `${z.color}18`,
              color: z.color,
              border: `1px solid ${z.color}30`,
            }}
          >
            {z.label}
          </span>
        ))}
      </div>
    </div>
  );
}
