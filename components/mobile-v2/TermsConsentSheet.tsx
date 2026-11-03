'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ChevronRight, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { LegalDoc, LegalTab } from '@/lib/legalContent';

/** Keeps tenant query params (localhost `?subdomain=`) when linking to the full terms page. */
export function legalPageHref(tab: LegalTab, from?: 'signup'): string {
  const params = new URLSearchParams({ tab });
  if (from) params.set('from', from);
  if (typeof window !== 'undefined') {
    const current = new URLSearchParams(window.location.search);
    for (const key of ['subdomain', 'merchant_id']) {
      const v = current.get(key);
      if (v) params.set(key, v);
    }
  }
  return `/mobile-v2/auth/terms?${params.toString()}`;
}

export function AcceptedTick({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" aria-label="Accepted" role="img" className="shrink-0">
      <circle cx="7" cy="7" r="7" fill="#34C759" />
      <path d="M3.8 7.2 L6 9.3 L10.2 4.9" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ShortVersion({ points }: { points: string[] }) {
  return (
    <div className="mt-5 rounded-[20px] bg-[var(--sf-tint,#E0E7FF)]/60 px-[18px] pb-1 pt-[18px]">
      <span className="text-xs font-bold tracking-[1.2px] text-[var(--sf-button,#1E40AF)]">THE SHORT VERSION</span>
      {points.map((p) => (
        <div key={p} className="my-3.5 flex items-start gap-3 text-base leading-snug text-[#1C1C1E]">
          <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden className="mt-px shrink-0">
            <circle cx="11" cy="11" r="11" fill="var(--sf-button,#1E40AF)" />
            <path d="M6.2 11.3 L9.6 14.5 L15.8 7.6" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span>{p}</span>
        </div>
      ))}
    </div>
  );
}

/** iOS-style segmented control with a sliding pill and "accepted" ticks. */
export function LegalTabs({
  tab,
  onChange,
  accepted,
  className,
}: {
  tab: LegalTab;
  onChange: (t: LegalTab) => void;
  accepted?: Partial<Record<LegalTab, boolean>>;
  className?: string;
}) {
  return (
    <div className={cn('relative flex h-9 shrink-0 rounded-[10px] bg-[rgba(118,118,128,0.12)] p-0.5', className)} role="tablist">
      <span
        aria-hidden
        className={cn(
          'absolute left-0.5 top-0.5 h-8 w-[calc(50%-2px)] rounded-lg bg-white shadow-[0_1px_3px_rgba(0,0,0,0.14)] transition-transform duration-400 ease-[cubic-bezier(.32,.72,0,1)]',
          tab === 'privacy' && 'translate-x-full',
        )}
      />
      {(['terms', 'privacy'] as const).map((t) => (
        <button
          key={t}
          type="button"
          role="tab"
          aria-selected={tab === t}
          onClick={() => onChange(t)}
          className="relative flex h-8 flex-1 items-center justify-center gap-1.5 text-sm font-semibold text-[#1C1C1E]"
        >
          {t === 'terms' ? 'Terms' : 'Privacy'}
          {accepted?.[t] && <AcceptedTick />}
        </button>
      ))}
    </div>
  );
}

type Props = {
  open: boolean;
  tab: LegalTab;
  onTabChange: (t: LegalTab) => void;
  docs: Record<LegalTab, LegalDoc>;
  consent: Record<LegalTab, boolean>;
  onAccept: (t: LegalTab) => void;
  onClose: () => void;
  /** Called right before navigating to the full page, so the form can be saved. */
  onOpenFullPage?: () => void;
};

/**
 * Bottom sheet rendered inside the signup screen (stays within the phone frame on desktop).
 * Parent must be `position: relative; overflow: hidden`.
 */
export function TermsConsentSheet({ open, tab, onTabChange, docs, consent, onAccept, onClose, onOpenFullPage }: Props) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [readPct, setReadPct] = useState(0);
  const doc = docs[tab];
  const done = consent[tab];

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => sheetRef.current?.focus(), 60);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => {
      clearTimeout(t);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
    setReadPct(0);
  }, [tab]);

  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const max = el.scrollHeight - el.clientHeight;
    setReadPct(max > 0 ? Math.min(1, el.scrollTop / max) : 1);
  };

  return (
    <>
      <button
        type="button"
        tabIndex={-1}
        aria-label="Close terms and privacy"
        onClick={onClose}
        className={cn(
          'absolute inset-0 z-40 w-full cursor-default bg-[rgba(8,6,24,0.5)] transition-opacity duration-500',
          open ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
      />
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-label="Terms and Privacy"
        aria-hidden={!open}
        tabIndex={-1}
        className={cn(
          'absolute inset-x-0 bottom-0 z-50 flex h-[min(762px,92%)] flex-col rounded-t-[28px] bg-white shadow-[0_-10px_40px_rgba(10,8,30,0.28)] outline-none',
          'transition-[transform,visibility] duration-[550ms] ease-[cubic-bezier(.32,.72,0,1)]',
          open ? 'visible translate-y-0' : 'invisible translate-y-[104%]',
        )}
      >
        <div className="flex shrink-0 justify-center pt-2">
          <span className="h-[5px] w-9 rounded-full bg-[#D1D1D6]" />
        </div>
        <div className="relative flex h-[52px] shrink-0 items-center justify-center text-[17px] font-semibold text-[#1C1C1E]">
          Terms &amp; Privacy
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute right-4 top-2.5 flex h-8 w-8 items-center justify-center rounded-full bg-[rgba(118,118,128,0.14)]"
          >
            <X className="h-3.5 w-3.5 text-[#6B6B73]" strokeWidth={2.5} />
          </button>
        </div>

        <LegalTabs tab={tab} onChange={onTabChange} accepted={consent} className="mx-6 mb-3.5" />

        <div ref={scrollRef} onScroll={onScroll} className="min-h-0 flex-1 overflow-y-auto px-6 pb-7 pt-1.5 no-scrollbar">
          <h2 className="text-[30px] font-bold leading-tight tracking-[-0.6px] text-[#1C1C1E]">{doc.title}</h2>
          <p className="mt-1.5 text-sm text-gray-500">{doc.updated}</p>
          <ShortVersion points={doc.shortVersion} />
          <Link
            href={legalPageHref(tab, 'signup')}
            onClick={onOpenFullPage}
            className="mt-5 flex min-h-14 w-full items-center justify-between rounded-2xl bg-[#F2F2F7] px-[18px] text-[17px] font-semibold text-[#1C1C1E] transition-colors hover:bg-[#EAEAF0]"
          >
            {tab === 'terms' ? 'Read the full terms' : 'Read the full privacy policy'}
            <ChevronRight className="h-4 w-4 text-gray-400" strokeWidth={2.5} />
          </Link>
        </div>

        <div className="shrink-0 bg-white/90 backdrop-blur-xl">
          <div className="h-0.5 bg-[#EEEEF3]">
            <i className="block h-0.5 bg-[var(--sf-button,#1E40AF)] transition-[width] duration-150" style={{ width: `${Math.round(readPct * 100)}%` }} />
          </div>
          <div className="flex flex-col items-center gap-1 px-6 pb-[calc(24px+env(safe-area-inset-bottom))] pt-3.5">
            <button
              type="button"
              onClick={() => !done && onAccept(tab)}
              aria-disabled={done}
              className={cn(
                'flex h-[54px] w-full items-center justify-center gap-2 rounded-[27px] text-[17px] font-semibold transition-colors duration-300',
                done
                  ? 'bg-[var(--sf-tint,#E0E7FF)] text-[var(--sf-button,#1E40AF)]'
                  : 'bg-[var(--sf-button,#1E40AF)] text-white active:scale-[0.98]',
              )}
            >
              {done ? (
                <>
                  <AcceptedTick size={16} /> Accepted
                </>
              ) : (
                `Accept ${doc.shortLabel}`
              )}
            </button>
            <button type="button" onClick={onClose} className="h-11 px-6 text-[17px] font-medium text-[#6B6B73]">
              {done ? 'Done' : 'Not now'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
