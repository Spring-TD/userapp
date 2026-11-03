'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { OnboardingProgress } from '@/lib/kycOnboardingClient';
import s from './kyc-onboarding.module.css';

export { s as kycMotion };

/** Brand gradient used by the full-bleed screens (welcome, finalising, done). */
export const BRAND_GRADIENT =
  'bg-[linear-gradient(175deg,var(--sf-ink,#1E1B4B)_0%,color-mix(in_srgb,var(--sf-button,#1E40AF)_80%,var(--sf-ink,#1E1B4B))_58%,var(--sf-button,#1E40AF)_100%)]';

export function PrimaryButton({
  children,
  loading,
  light,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean; light?: boolean }) {
  return (
    <button
      type="button"
      {...props}
      disabled={props.disabled || loading}
      className={cn(
        'flex h-14 w-full items-center justify-center gap-2 rounded-[20px] text-base font-semibold transition-[transform,opacity] active:scale-[0.97] disabled:cursor-default disabled:opacity-40 disabled:shadow-none disabled:active:scale-100',
        light
          ? 'bg-white text-[var(--sf-ink,#1E1B4B)] shadow-[0_8px_24px_rgba(10,6,40,0.28)]'
          : 'bg-[var(--sf-button,#1E40AF)] text-white shadow-lg shadow-[color-mix(in_srgb,var(--sf-button,#1E40AF)_30%,transparent)]',
        className,
      )}
    >
      {loading && <Loader2 className="h-5 w-5 animate-spin" aria-hidden />}
      {children}
    </button>
  );
}

export function TickCircle({ size = 22, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden className={cn('shrink-0', className)}>
      <circle cx="12" cy="12" r="12" fill="#34C759" />
      <path className={s.draw} d="M6.5 12.5l3.8 3.8L17.5 8.5" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function BrandTick({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden className="shrink-0">
      <circle cx="12" cy="12" r="12" fill="var(--sf-button,#1E40AF)" />
      <path d="M6.5 12.5l3.8 3.8L17.5 8.5" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Row in a "checking…" list: waiting dot → spinner → green tick. */
export function StageRow({
  state,
  label,
  dark,
}: {
  state: 'wait' | 'active' | 'done';
  label: string;
  dark?: boolean;
}) {
  return (
    <div
      className={cn(
        'flex min-h-12 items-center gap-3 text-[15px] transition-colors',
        state === 'wait'
          ? dark ? 'font-medium text-white/60' : 'font-medium text-gray-400'
          : dark ? 'font-semibold text-white' : 'font-semibold text-[#1C1C1E]',
      )}
    >
      <span className="flex h-6 w-6 items-center justify-center">
        {state === 'done' ? (
          <span className={s.pop}><TickCircle /></span>
        ) : state === 'active' ? (
          <Loader2 className={cn('h-5 w-5 animate-spin', dark ? 'text-white' : 'text-[var(--sf-primary,#2563EB)]')} />
        ) : (
          <span className={cn('h-2.5 w-2.5 rounded-full', dark ? 'bg-white/35' : 'bg-gray-300')} />
        )}
      </span>
      {label}
    </div>
  );
}

const SEGMENTS: { key: keyof OnboardingProgress['segments']; label: string }[] = [
  { key: 'contacts', label: 'Contacts' },
  { key: 'identity', label: 'Identity' },
  { key: 'face', label: 'Face' },
  { key: 'address', label: 'Address' },
];

function Star({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden className="shrink-0">
      <path d="M12 2.8l2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.2l-5.7 3.1 1.2-6.4L2.8 9.5l6.4-.8z" fill="#F59E0B" />
    </svg>
  );
}

/** Counts up to `value` (the prototype's ticking points counter). */
export function useCountUp(value: number): number {
  const [shown, setShown] = useState(value);
  const shownRef = useRef(value);
  useEffect(() => {
    if (value === shownRef.current) return;
    const id = setInterval(() => {
      const cur = shownRef.current;
      const step = Math.max(1, Math.ceil(Math.abs(value - cur) / 8));
      const next = value > cur ? Math.min(value, cur + step) : Math.max(value, cur - step);
      shownRef.current = next;
      setShown(next);
      if (next === value) clearInterval(id);
    }, 28);
    return () => clearInterval(id);
  }, [value]);
  return shown;
}

export function PointsChip({ points, className }: { points: number; className?: string }) {
  const shown = useCountUp(points);
  return (
    <span
      className={cn(
        'flex h-[30px] items-center gap-1.5 rounded-full bg-[#FFF3D6] pl-[9px] pr-3 text-sm font-bold tabular-nums text-[#7A4A00]',
        className,
      )}
      aria-label={`${points} points`}
    >
      <Star />
      {shown}
    </span>
  );
}

/** Sticky header for the step screens: back / Save & exit, level + points chips, 4-part progress bar. */
export function StepChrome({
  progress,
  activeIndex,
  onSaveExit,
  onBack,
  award,
}: {
  progress: OnboardingProgress;
  activeIndex: number;
  onSaveExit: () => void;
  /** When set, a back arrow replaces "Save & exit" (prototype: only on the first phone screen). */
  onBack?: () => void;
  /** Latest points award; changing `key` replays the floating "+N pts". */
  award?: { amount: number; key: number } | null;
}) {
  return (
    <div className="shrink-0 px-4 pt-12 sf-page-bg">
      <div className="flex h-11 items-center justify-between">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            aria-label="Back"
            className="-ml-1 flex h-11 w-11 items-center justify-center rounded-full transition-colors hover:bg-black/5"
          >
            <ChevronLeft className="h-6 w-6 text-[#1C1C1E]" />
          </button>
        ) : (
          <button
            type="button"
            onClick={onSaveExit}
            className="-ml-1 min-h-11 rounded-full px-2 text-[15px] font-semibold text-gray-500 transition-colors hover:text-gray-700"
          >
            Save &amp; exit
          </button>
        )}
        <div className="relative flex items-center gap-2">
          <span className="flex h-[30px] items-center rounded-full bg-[var(--sf-tint,#E0E7FF)] px-3 text-[13px] font-bold text-[var(--sf-ink,#1E1B4B)]">
            Level {progress.level}
          </span>
          <PointsChip points={progress.points} />
          {award && award.amount > 0 && (
            <span
              key={award.key}
              className={cn(s.floatUp, 'pointer-events-none absolute right-0 top-[34px] whitespace-nowrap rounded-xl bg-[var(--sf-button,#1E40AF)] px-2.5 py-1 text-[13px] font-bold text-white')}
              aria-live="polite"
            >
              +{award.amount} pts
            </span>
          )}
        </div>
      </div>
      <div className="mt-2.5 flex gap-1.5" role="list" aria-label="Verification progress">
        {SEGMENTS.map((seg, i) => {
          const f = progress.segments[seg.key];
          const complete = f >= 1;
          const active = i === activeIndex;
          return (
            <div key={seg.key} className="min-w-0 flex-1" role="listitem" aria-label={`${seg.label}: ${Math.round(f * 100)}%`}>
              <div className="h-1.5 overflow-hidden rounded-full bg-gray-200/80">
                <div
                  className={cn(
                    'h-1.5 rounded-full transition-[width,background-color] duration-700 ease-[cubic-bezier(.32,.72,0,1)]',
                    complete ? 'bg-[#34C759]' : 'bg-[var(--sf-button,#1E40AF)]',
                  )}
                  style={{ width: `${Math.round(f * 100)}%` }}
                />
              </div>
              <div
                className={cn(
                  'mt-1.5 text-center text-xs',
                  active
                    ? 'font-bold text-[var(--sf-button,#1E40AF)]'
                    : complete ? 'font-medium text-[#17743F]' : 'font-medium text-gray-500',
                )}
              >
                {seg.label}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const CONFETTI_COLORS = ['var(--sf-button,#1E40AF)', 'var(--sf-primary,#2563EB)', '#F59E0B', '#34C759', '#FF6B8B', '#38BDF8'];
const BURST_PATHS = [
  [0, -170, 270, 10, 200, 540],
  [110, -140, -210, 190, 180, -420],
  [160, -60, 180, 250, 220, 360],
  [130, 40, -300, 210, 260, -600],
  [-110, -140, 240, -190, 180, 480],
  [-160, -60, -180, -250, 220, -360],
  [-130, 40, 300, -210, 260, 600],
  [50, -200, -240, 70, 170, -480],
];

/** One-shot confetti burst; remount (change `key`) to fire again. */
export function Confetti() {
  const pieces = useMemo(
    () =>
      Array.from({ length: 30 }, (_, i) => {
        const w = 6 + ((i * 5) % 6);
        const round = i % 3 === 0;
        const [dx1, dy1, r1, dx2, dy2, r2] = BURST_PATHS[i % 8];
        return {
          left: ((i * 37) % 70) - 35,
          top: ((i * 53) % 30) - 15,
          w,
          h: round ? w : w + 4,
          radius: round ? '50%' : '2px',
          color: CONFETTI_COLORS[i % 6],
          delay: (i % 7) * 35,
          vars: { '--dx1': `${dx1}px`, '--dy1': `${dy1}px`, '--r1': `${r1}deg`, '--dx2': `${dx2}px`, '--dy2': `${dy2}px`, '--r2': `${r2}deg` },
        };
      }),
    [],
  );
  return (
    <div className="pointer-events-none absolute left-1/2 top-[38%] z-[60] h-0 w-0" aria-hidden>
      {pieces.map((p, i) => (
        <span
          key={i}
          className={s.confetti}
          style={{
            left: p.left,
            top: p.top,
            width: p.w,
            height: p.h,
            borderRadius: p.radius,
            background: p.color,
            animationDelay: `${p.delay}ms`,
            ...(p.vars as React.CSSProperties),
          }}
        />
      ))}
    </div>
  );
}

/** Centered "milestone" card shown briefly between steps. */
export function MilestonePop({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-[rgba(14,11,31,0.45)] px-6" role="status" aria-live="polite">
      <div className={cn(s.pop, 'w-full max-w-[300px] rounded-[28px] bg-white px-6 pb-7 pt-8 text-center shadow-[0_24px_60px_rgba(10,6,40,0.4)]')}>
        <div className="mx-auto flex h-[76px] w-[76px] items-center justify-center rounded-full bg-[#34C759] shadow-[0_0_0_10px_rgba(52,199,89,0.18)]">
          <svg width="40" height="40" viewBox="0 0 24 24" aria-hidden>
            <path className={s.draw} d="M5.5 12.5l4.2 4.2L18.5 8" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div className="mt-[18px] text-[22px] font-bold text-[#1C1C1E]">{title}</div>
        <div className="mt-1.5 text-[15px] leading-snug text-gray-500">{sub}</div>
      </div>
    </div>
  );
}

/** "Level N unlocked" modal. */
export function LevelUpModal({ level, sub, onContinue }: { level: number; sub: string; onContinue: () => void }) {
  return (
    <div className="absolute inset-0 z-[41] flex items-center justify-center bg-[rgba(14,11,31,0.55)] px-6" role="dialog" aria-modal="true" aria-labelledby="level-up-title">
      <div className={cn(s.pop, 'w-full max-w-[312px] overflow-hidden rounded-[28px] bg-white px-6 pb-6 pt-7 text-center shadow-[0_24px_60px_rgba(10,6,40,0.45)]')}>
        <div className="relative mx-auto flex h-[130px] w-[150px] items-center justify-center">
          <div
            className={cn(s.rays, 'absolute -top-2.5 left-0 h-[150px] w-[150px] rounded-full')}
            style={{
              background:
                'repeating-conic-gradient(color-mix(in srgb, var(--sf-button,#1E40AF) 28%, transparent) 0deg 10deg, transparent 10deg 22deg)',
              WebkitMaskImage: 'radial-gradient(circle, #000 30%, transparent 70%)',
              maskImage: 'radial-gradient(circle, #000 30%, transparent 70%)',
            }}
          />
          <div className="relative flex h-[92px] w-[92px] flex-col items-center justify-center rounded-full bg-[linear-gradient(160deg,var(--sf-primary,#2563EB),var(--sf-button,#1E40AF))] text-white shadow-[0_10px_24px_color-mix(in_srgb,var(--sf-button,#1E40AF)_45%,transparent)]">
            <span className="text-xs font-bold tracking-[1.4px]">LEVEL</span>
            <span className="text-[38px] font-bold leading-none">{level}</span>
          </div>
        </div>
        <div id="level-up-title" className="mt-3 text-2xl font-bold text-[#1C1C1E]">
          Level {level} unlocked
        </div>
        <div className="mt-1.5 text-[15px] leading-snug text-gray-500">{sub}</div>
        <PrimaryButton className="mt-5" onClick={onContinue} autoFocus>
          Continue
        </PrimaryButton>
      </div>
    </div>
  );
}

export function ErrorNote({ children }: { children: React.ReactNode }) {
  if (!children) return null;
  return (
    <p className={cn(s.rise, 'rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900')} role="alert">
      {children}
    </p>
  );
}
