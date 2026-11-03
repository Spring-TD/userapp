'use client';

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMobileV2Tenant } from '@/contexts/MobileV2TenantContext';
import { supportFromManifest } from '@/lib/mobileManifestContent';
import { buildLegalDocs, readSignupDraft, writeSignupDraft, type LegalTab } from '@/lib/legalContent';
import { AcceptedTick, LegalTabs, ShortVersion } from '@/components/mobile-v2/TermsConsentSheet';

function TermsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tenant = useMobileV2Tenant();
  const fromSignup = searchParams.get('from') === 'signup';
  const [tab, setTab] = useState<LegalTab>(searchParams.get('tab') === 'privacy' ? 'privacy' : 'terms');
  const [accepted, setAccepted] = useState<Partial<Record<LegalTab, boolean>>>({});
  const [readPct, setReadPct] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const docs = useMemo(
    () =>
      buildLegalDocs({
        storeName: tenant.branding?.companyName ?? tenant.displayName,
        supportEmail: supportFromManifest(tenant.pwaManifest).contactEmail,
      }),
    [tenant.branding?.companyName, tenant.displayName, tenant.pwaManifest],
  );
  const doc = docs[tab];

  useEffect(() => {
    if (fromSignup) setAccepted(readSignupDraft().consent ?? {});
  }, [fromSignup]);

  // Keep the URL in sync so refresh/share lands on the same tab.
  const changeTab = (t: LegalTab) => {
    setTab(t);
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', t);
    router.replace(`/mobile-v2/auth/terms?${params.toString()}`, { scroll: false });
    scrollRef.current?.scrollTo({ top: 0 });
    setReadPct(0);
  };

  const goBack = () => {
    if (window.history.length > 1) router.back();
    else router.push(fromSignup ? '/mobile-v2/auth/signup' : '/mobile-v2');
  };

  const accept = () => {
    writeSignupDraft({ consent: { [tab]: true } });
    setAccepted((a) => ({ ...a, [tab]: true }));
    setTimeout(goBack, 450);
  };

  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const max = el.scrollHeight - el.clientHeight;
    setReadPct(max > 0 ? Math.min(1, el.scrollTop / max) : 1);
  };

  const done = Boolean(accepted[tab]);

  return (
    <div className="flex h-full flex-col bg-white text-[#1C1C1E]">
      <div className="shrink-0 px-4 pt-12">
        <div className="relative flex h-11 items-center justify-center">
          <button
            type="button"
            onClick={goBack}
            aria-label="Back"
            className="absolute left-0 flex h-11 w-11 items-center justify-center rounded-full transition-colors hover:bg-black/5"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <h1 className="text-[17px] font-semibold">Terms &amp; Privacy</h1>
        </div>
        <LegalTabs tab={tab} onChange={changeTab} accepted={fromSignup ? accepted : undefined} className="mx-2 mb-3.5 mt-2" />
      </div>

      <div ref={scrollRef} onScroll={onScroll} className="min-h-0 flex-1 overflow-y-auto px-6 pb-10 pt-1.5 no-scrollbar">
        <article key={tab}>
          <h2 className="text-[30px] font-bold leading-tight tracking-[-0.6px]">{doc.title}</h2>
          <p className="mt-1.5 text-sm text-gray-500">{doc.updated}</p>
          <ShortVersion points={doc.shortVersion} />
          {doc.sections.map((sec) => (
            <section key={sec.heading} className="mt-[22px]">
              <h3 className="text-lg font-semibold leading-snug">{sec.heading}</h3>
              <p className="mt-1.5 text-base leading-relaxed text-[#48484F]">{sec.body}</p>
            </section>
          ))}
          <div className="mt-9 flex items-center justify-center gap-2 text-sm text-gray-500">
            <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden>
              <circle cx="8" cy="8" r="8" fill="#C7C7CC" />
              <path d="M4.4 8.2 L6.9 10.6 L11.6 5.5" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            That&apos;s everything.
          </div>
        </article>
      </div>

      {fromSignup && (
        <div className="shrink-0 bg-white/90 backdrop-blur-xl">
          <div className="h-0.5 bg-[#EEEEF3]">
            <i className="block h-0.5 bg-[var(--sf-button,#1E40AF)] transition-[width] duration-150" style={{ width: `${Math.round(readPct * 100)}%` }} />
          </div>
          <div className="px-6 pb-[calc(24px+env(safe-area-inset-bottom))] pt-3.5">
            <button
              type="button"
              onClick={() => !done && accept()}
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
          </div>
        </div>
      )}
    </div>
  );
}

export default function TermsPage() {
  return (
    <Suspense fallback={<div className="flex h-full items-center justify-center bg-white text-sm text-gray-500">Loading…</div>}>
      <TermsContent />
    </Suspense>
  );
}
