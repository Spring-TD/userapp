'use client';

import React, { useEffect } from 'react';
import { Delete } from 'lucide-react';
import { cn } from '@/lib/utils';
import { kycMotion as s } from './ui';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'] as const;

/** Applies a key ('0'-'9' or 'del') to a digit buffer, capped at `max`. */
export function applyKey(buf: string, key: string, max: number): string {
  if (key === 'del') return buf.slice(0, -1);
  return buf.length < max ? buf + key : buf;
}

/**
 * On-screen number pad from the prototype. Also listens for a physical keyboard and paste,
 * so desktop users can type. `onKey` receives '0'-'9' or 'del'; `onPaste` receives raw text.
 */
export function Keypad({
  onKey,
  onPaste,
  disabled,
}: {
  onKey: (key: string) => void;
  onPaste?: (text: string) => void;
  disabled?: boolean;
}) {
  useEffect(() => {
    if (disabled) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable) && !t.dataset.keypadSink) return;
      if (/^\d$/.test(e.key)) {
        e.preventDefault();
        onKey(e.key);
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        onKey('del');
      }
    };
    const onPasteEvt = (e: ClipboardEvent) => {
      const text = e.clipboardData?.getData('text') ?? '';
      if (onPaste && /\d{4,}/.test(text)) {
        e.preventDefault();
        onPaste(text);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('paste', onPasteEvt);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('paste', onPasteEvt);
    };
  }, [disabled, onKey, onPaste]);

  return (
    <div className="shrink-0 border-t border-gray-200/80 bg-[#F4F2FC]/95 px-4 pb-[max(1.75rem,env(safe-area-inset-bottom))] pt-3">
      <div className="grid grid-cols-3 gap-2">
        {KEYS.map((k, i) =>
          k === '' ? (
            <div key={i} />
          ) : (
            <button
              key={i}
              type="button"
              onClick={() => onKey(k)}
              disabled={disabled}
              aria-label={k === 'del' ? 'Delete' : k}
              className={cn(
                'flex h-[50px] w-full items-center justify-center rounded-xl text-2xl font-semibold text-[#1C1C1E] transition-[transform,background-color] duration-100 active:scale-[0.93] disabled:opacity-50',
                k === 'del' ? 'bg-transparent' : 'bg-white shadow-[0_1px_0_rgba(60,50,130,0.16)] active:bg-[#E4E0F6]',
              )}
            >
              {k === 'del' ? <Delete className="h-6 w-6" strokeWidth={1.7} /> : k}
            </button>
          ),
        )}
      </div>
    </div>
  );
}

/** Six (or N) code cells: active cell outlined, green when verified, pulsing while checking. */
export function CodeCells({
  value,
  length = 6,
  status,
  error,
  shakeKey = 0,
}: {
  value: string;
  length?: number;
  status: 'idle' | 'checking' | 'ok';
  error?: boolean;
  shakeKey?: number;
}) {
  return (
    <div
      key={shakeKey}
      className={cn('flex gap-2', shakeKey > 0 && s.shake)}
      role="group"
      aria-label={`Code, ${value.length} of ${length} digits entered`}
    >
      {Array.from({ length }, (_, i) => {
        const ch = value[i] ?? '';
        const active = status === 'idle' && i === value.length;
        return (
          <div
            key={i}
            className={cn(
              'flex h-14 w-12 items-center justify-center rounded-[14px] border-2 text-2xl font-bold tabular-nums text-[var(--sf-ink,#1E1B4B)] transition-[border-color,background-color] duration-200',
              status === 'ok'
                ? 'border-[#34C759] bg-[#EAFBEF]'
                : active
                  ? 'border-[var(--sf-button,#1E40AF)] bg-white'
                  : ch
                    ? 'border-[color-mix(in_srgb,var(--sf-button,#1E40AF)_35%,white)] bg-white'
                    : error
                      ? 'border-red-200 bg-white'
                      : 'border-gray-200 bg-white',
              status === 'checking' && s.pulse,
            )}
          >
            {ch}
          </div>
        );
      })}
    </div>
  );
}
