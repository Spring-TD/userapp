/**
 * Storefront Terms of Service + Privacy Policy copy (from the "T&C FLOW" design doc).
 * Bracketed placeholders are still awaiting real legal copy — replace them before production.
 */

export type LegalTab = 'terms' | 'privacy'

export type LegalDoc = {
  title: string
  /** Label for the tab / accept button, e.g. "Accept Terms". */
  shortLabel: string
  updated: string
  shortVersion: string[]
  sections: { heading: string; body: string }[]
}

/** Set to the publication date once legal signs off (e.g. "3 November 2026"). */
export const LEGAL_LAST_UPDATED: string | null = null

export function buildLegalDocs(opts: { storeName?: string | null; supportEmail?: string | null }): Record<LegalTab, LegalDoc> {
  const store = opts.storeName?.trim() || 'this app'
  const email = opts.supportEmail?.trim()
  const updated = `Last updated ${LEGAL_LAST_UPDATED ?? '[DATE]'}`

  return {
    terms: {
      title: 'Terms of Service',
      shortLabel: 'Terms',
      updated,
      shortVersion: [
        'Your account is yours to look after. Keep your password safe.',
        `Use ${store} lawfully and fairly.`,
        'If we change these terms, we tell you first.',
      ],
      sections: [
        {
          heading: `1. Using ${store}`,
          body: `These terms apply when you create an account or use ${store}. By registering, you confirm that the details you give us are accurate.`,
        },
        {
          heading: '2. Your account',
          body: 'You are responsible for your password and for activity on your account. Tell us straight away if you think someone else has used it.',
        },
        { heading: '3. Fees and payments', body: '[Describe any fees, charges and payment terms here.]' },
        {
          heading: '4. Fair use',
          body: `Please use ${store} lawfully. Do not misuse the service, interfere with it or try to access other people’s accounts.`,
        },
        {
          heading: '5. Ending your account',
          body: 'You can close your account at any time. We may suspend or close accounts that break these terms.',
        },
        {
          heading: '6. Changes to these terms',
          body: 'If we change these terms in a way that matters, we will tell you in the app before the change takes effect.',
        },
        { heading: '7. Contact', body: `Questions about these terms? Reach us at ${email ?? '[SUPPORT EMAIL]'}.` },
      ],
    },
    privacy: {
      title: 'Privacy Policy',
      shortLabel: 'Privacy Policy',
      updated,
      shortVersion: [
        'We use your contact details and country to create and protect your account.',
        'You can ask to see, correct or delete your data.',
        'We protect your information with encryption and access controls.',
      ],
      sections: [
        {
          heading: '1. What we collect',
          body: 'Your name, email address, phone number, country and the password you choose. We also collect basic device information to keep your account secure.',
        },
        {
          heading: '2. How we use it',
          body: 'To create and protect your account, to check that it is really you, and to provide the service.',
        },
        {
          heading: '3. Who we share it with',
          body: `Only with partners who help us run ${store}, and where the law requires it. [List the categories of partners here.]`,
        },
        {
          heading: '4. Your choices',
          body: 'You can ask to see, correct or delete your personal data at any time, from the app or by contacting us.',
        },
        { heading: '5. How long we keep it', body: '[State your retention period here.]' },
        {
          heading: '6. Security',
          body: 'We use safeguards such as encryption and access controls to protect your information.',
        },
        { heading: '7. Contact', body: `Privacy questions? Reach us at ${email ?? '[PRIVACY EMAIL]'}.` },
      ],
    },
  }
}

/* ── Signup draft: survives the trip to the full terms page and back ── */

export const SIGNUP_DRAFT_KEY = 'mobile-v2-signup-draft'

export type SignupDraft = {
  firstName?: string
  lastName?: string
  email?: string
  phone?: string
  country?: string
  consent?: { terms?: boolean; privacy?: boolean }
}

export function readSignupDraft(): SignupDraft {
  try {
    const raw = sessionStorage.getItem(SIGNUP_DRAFT_KEY)
    return raw ? (JSON.parse(raw) as SignupDraft) : {}
  } catch {
    return {}
  }
}

/** Merges into the stored draft. Passwords are never stored. */
export function writeSignupDraft(patch: SignupDraft) {
  try {
    const next = { ...readSignupDraft(), ...patch }
    if (patch.consent) next.consent = { ...readSignupDraft().consent, ...patch.consent }
    sessionStorage.setItem(SIGNUP_DRAFT_KEY, JSON.stringify(next))
  } catch {
    /* storage unavailable — form just won't be restored */
  }
}

export function clearSignupDraft() {
  try {
    sessionStorage.removeItem(SIGNUP_DRAFT_KEY)
  } catch {
    /* ignore */
  }
}
