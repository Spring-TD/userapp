'use client';

import React, { useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Search, X } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useCountries } from '@/hooks/useCountries';
import type { CountryOption } from '@/lib/countryApi';
import { cn } from '@/lib/utils';

/** Turns an ISO 3166-1 alpha-2 code into its regional-indicator flag emoji. */
function flagEmoji(code: string): string {
  const cc = code.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(cc)) return '🏳️';
  return String.fromCodePoint(...[...cc].map((ch) => 0x1f1e6 + ch.charCodeAt(0) - 65));
}

/** Lowercases and strips accents so "cote" matches "Côte d'Ivoire". */
function normalize(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

function matches(c: CountryOption, q: string): boolean {
  if (!q) return true;
  const digits = q.replace(/[^\d]/g, '');
  if (digits && /^\+?\d+$/.test(q)) {
    return c.dialCode.replace(/[^\d]/g, '').startsWith(digits);
  }
  return normalize(c.name).includes(q) || c.code.toLowerCase() === q;
}

type CountryPickerFieldProps = {
  id?: string;
  label?: string;
  /** ISO alpha-2 code (any case). */
  value: string;
  onChange: (code: string) => void;
  error?: string;
};

export function CountryPickerField({
  id = 'country',
  label = 'Country',
  value,
  onChange,
  error,
}: CountryPickerFieldProps) {
  const { countries, loading, error: loadError } = useCountries();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);

  const selected = useMemo(
    () => countries.find((c) => c.code.toLowerCase() === value.trim().toLowerCase()) ?? null,
    [countries, value],
  );

  const results = useMemo(() => {
    const q = normalize(query);
    const list = countries.filter((c) => matches(c, q));
    if (!q) return list;
    // Names that start with the query rank above names that merely contain it.
    return [...list].sort((a, b) => {
      const as = normalize(a.name).startsWith(q) ? 0 : 1;
      const bs = normalize(b.name).startsWith(q) ? 0 : 1;
      return as - bs;
    });
  }, [countries, query]);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) setQuery('');
  };

  const pick = (c: CountryOption) => {
    onChange(c.code.toUpperCase());
    setOpen(false);
  };

  const hasValue = Boolean(selected);

  return (
    <div className="space-y-1">
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <button
            id={id}
            type="button"
            disabled={loading && countries.length === 0}
            aria-invalid={Boolean(error) || undefined}
            className={cn(
              'relative flex h-14 w-full items-center gap-3 rounded-2xl bg-white px-4 text-left shadow-[0_2px_10px_rgba(0,0,0,0.03)] transition-all',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sf-primary,#2563EB)]/20',
              open && 'ring-2 ring-[var(--sf-primary,#2563EB)]/20',
              error && !open && 'ring-2 ring-red-500/30',
            )}
          >
            {hasValue && (
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--sf-tint,#E0E7FF)]/60 text-lg leading-none">
                {flagEmoji(selected!.code)}
              </span>
            )}
            <span className="relative min-w-0 flex-1">
              <span
                className={cn(
                  'pointer-events-none block text-gray-400 transition-all',
                  hasValue ? 'text-[11px] font-medium' : 'text-base',
                )}
              >
                {loading && countries.length === 0
                  ? 'Loading countries…'
                  : loadError && !countries.length
                    ? loadError
                    : label}
              </span>
              {hasValue && <span className="block truncate text-base text-[#1E293B]">{selected!.name}</span>}
            </span>
            {hasValue && selected!.dialCode && (
              <span className="shrink-0 text-sm text-gray-400">{selected!.dialCode}</span>
            )}
            <ChevronDown
              className={cn(
                'h-5 w-5 shrink-0 text-[var(--sf-primary,#2563EB)] transition-transform duration-200',
                open && 'rotate-180',
              )}
            />
          </button>
        </PopoverTrigger>

        <PopoverContent
          align="start"
          sideOffset={8}
          collisionPadding={12}
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            searchRef.current?.focus();
          }}
          className="w-[var(--radix-popover-trigger-width)] overflow-hidden rounded-2xl border border-gray-100 bg-white p-0 shadow-[0_12px_40px_rgba(15,23,42,0.14)]"
        >
          <div className="border-b border-gray-100 p-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                ref={searchRef}
                type="search"
                inputMode="search"
                autoComplete="off"
                placeholder="Search country"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && results[0]) {
                    e.preventDefault();
                    pick(results[0]);
                  }
                }}
                aria-controls={`${id}-listbox`}
                className="h-11 w-full rounded-xl border-0 bg-gray-50 pl-9 pr-9 text-base placeholder:text-gray-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[var(--sf-primary,#2563EB)]/20 [&::-webkit-search-cancel-button]:hidden"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery('');
                    searchRef.current?.focus();
                  }}
                  aria-label="Clear search"
                  className="absolute right-2.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full bg-gray-200/70 text-gray-500 hover:bg-gray-200"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          <ul
            id={`${id}-listbox`}
            role="listbox"
            aria-label="Countries"
            className="max-h-64 overflow-y-auto overscroll-contain p-1.5"
            onWheel={(e) => e.stopPropagation()}
          >
            {results.length === 0 ? (
              <li className="flex flex-col items-center gap-1 px-4 py-8 text-center">
                <span className="text-2xl">🌍</span>
                <span className="text-sm font-medium text-[#1E293B]">
                  {loading ? 'Loading countries…' : 'No countries found'}
                </span>
                {!loading && <span className="text-xs text-gray-500">Try a different name or code.</span>}
              </li>
            ) : (
              results.map((c) => {
                const isSelected = selected?.code === c.code;
                return (
                  <li key={c.code} role="option" aria-selected={isSelected}>
                    <button
                      type="button"
                      onClick={() => pick(c)}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-xl px-2.5 py-2.5 text-left transition-colors',
                        isSelected ? 'bg-[var(--sf-tint,#E0E7FF)]/70' : 'hover:bg-gray-50 active:bg-gray-100',
                      )}
                    >
                      <span className="text-xl leading-none">{flagEmoji(c.code)}</span>
                      <span
                        className={cn(
                          'min-w-0 flex-1 truncate text-[15px]',
                          isSelected ? 'font-semibold text-[var(--sf-ink,#1E1B4B)]' : 'text-[#1E293B]',
                        )}
                      >
                        {c.name}
                      </span>
                      {c.dialCode && (
                        <span className="shrink-0 text-sm tabular-nums text-gray-400">{c.dialCode}</span>
                      )}
                      {isSelected && <Check className="h-4 w-4 shrink-0 text-[var(--sf-primary,#2563EB)]" />}
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </PopoverContent>
      </Popover>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
