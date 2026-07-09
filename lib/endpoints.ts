/**
 * Client-auth-ms API endpoints and descriptions.
 * Use with backend base URL: `${NEXT_PUBLIC_API_URL}` (e.g. BACKEND.registration.merchant → POST /api/v1/registration/merchant).
 *
 * Total: 44 endpoints (4 root/docs + 4 registration + 7 auth + 3 OTP + 3 password + 10 user + 3 roles + 4 invitations + 2 sessions + 1 verify-email).
 */

/** Backend path suffixes. Build URL as `${baseUrl}${BACKEND.registration.merchant}` etc. */
export const BACKEND = {
  /** Root & docs */
  root: {
    /** GET — Service info: name, version, status, and list of endpoint groups. */
    info: "/",
    /** GET — Liveness/readiness check for the client-auth service. */
    health: "/health",
    /** GET — Serves the Swagger UI for interactive API docs. */
    apiDocs: "/api-docs",
    /** GET — OpenAPI (Swagger) spec as JSON. */
    apiDocsJson: "/api-docs.json",
  },

  /** Registration (`/api/v1/registration`) — all public */
  registration: {
    /** GET — Returns form schemas (fields, labels, validation) for merchant, user, and admin registration. */
    forms: "/api/v1/registration/forms",
    /** POST — Registers a new merchant account; sends verification OTP email. */
    merchant: "/api/v1/registration/merchant",
    /** POST — Registers a new user account; sends verification OTP email. */
    user: "/api/v1/registration/user",
    /** POST — Registers a new admin account. */
    admin: "/api/v1/registration/admin",
  },

  /** Auth (`/api/v1/auth`) — only paths under /api/v1/auth */
  auth: {
    /** POST — Public. Verifies an account using a token (e.g. from an email link). Not for 6-digit OTP; use otp.verify for that. */
    verifyAccount: "/api/v1/auth/verify-account",
    /** POST — Public. Authenticates with email/password; returns access and refresh tokens. */
    login: "/api/v1/auth/login",
    /** POST — Public. Issues new access (and optionally refresh) token using a valid refresh token. */
    refresh: "/api/v1/auth/refresh",
    /** POST — Public. Validates a JWT (e.g. used by other services to check tokens). */
    verifyToken: "/api/v1/auth/verify-token",
    /** GET — Public. Checks whether an email is already registered. */
    emailExists: (email: string) => `/api/v1/auth/email-exists/${encodeURIComponent(email)}`,
    /** POST — Bearer. Invalidates the current session / logs the user out. */
    logout: "/api/v1/auth/logout",
    /** GET — Bearer. Returns the current authenticated user's profile. */
    me: "/api/v1/auth/me",
  },

  /** OTP (`/api/v1/otp`) — only paths under /api/v1/otp */
  otp: {
    /** POST — Public. Generates an OTP for an identifier (e.g. email), stores it, and sends it by email or SMS. */
    generate: "/api/v1/otp/generate",
    /** POST — Public. Deletes existing OTP for the identifier and sends a new OTP (e.g. "resend code"). */
    resend: "/api/v1/otp/resend",
    /** POST — Bearer. Verifies the OTP sent to email (6-digit code); for purpose `verification`, marks email verified and sets status to ACTIVE. */
    verify: "/api/v1/otp/verify",
  },

  /** Password (`/api/v1/password`) */
  password: {
    /** POST — Public. Sends a password-reset link or OTP to the given email. */
    forgot: "/api/v1/password/forgot",
    /** POST — Public. Resets password using identifier + OTP + newPassword. */
    reset: "/api/v1/password/reset",
    /** POST — Bearer. Sends OTP to the user's email for password change confirmation. */
    changeRequestOtp: "/api/v1/password/change/request-otp",
    /** PUT — Bearer. Changes password (currentPassword, code, newPassword). */
    change: "/api/v1/password/change",
  },

  /** FAQs (`/api/v1/faqs`) — per client-auth-ms */
  faqs: {
    list: "/api/v1/faqs",
    byId: (id: string) => `/api/v1/faqs/${encodeURIComponent(id)}`,
  },

  /** Support contacts (`/api/v1/support-contacts`) */
  supportContacts: {
    list: "/api/v1/support-contacts",
    byId: (id: string) => `/api/v1/support-contacts/${encodeURIComponent(id)}`,
  },

  /** Legal documents — terms & privacy (`/api/v1/legal-documents`) */
  legalDocuments: {
    list: "/api/v1/legal-documents",
    byId: (id: string) => `/api/v1/legal-documents/${encodeURIComponent(id)}`,
  },

  /** User (`/api/v1/user`) — all Bearer */
  user: {
    /** GET — Lists users (e.g. for the authenticated merchant). */
    list: "/api/v1/user/list",
    /** GET — Returns the authenticated user's profile. */
    profile: "/api/v1/user/profile",
    /** PUT — Updates the authenticated user's profile (e.g. name, phone). */
    updateProfile: "/api/v1/user/profile",
    /** PUT — Updates the user's email (may send a new verification email). */
    updateEmail: "/api/v1/user/email",
    /** PUT — Updates a user's status (e.g. active/suspended) by a merchant or admin. */
    updateStatus: (userId: string) => `/api/v1/user/${encodeURIComponent(userId)}/status`,
    /** POST — Deactivates the authenticated user's account. */
    deactivate: "/api/v1/user/deactivate",
    /** PUT — Updates callback URLs for the authenticated merchant/user. */
    callbacks: "/api/v1/user/callbacks",
    /** GET — Returns detailed info for a user (admin). */
    info: (userId: string) => `/api/v1/user/info/${encodeURIComponent(userId)}`,
    /** POST — Marks or updates verification info for a user (admin). */
    verifyInfo: (userId: string) => `/api/v1/user/verify-info/${encodeURIComponent(userId)}`,
    /** PUT — Suspends a user (admin). */
    suspend: (userId: string) => `/api/v1/user/suspend/${encodeURIComponent(userId)}`,
    /** PUT — Reactivates a suspended user (admin). */
    activate: (userId: string) => `/api/v1/user/activate/${encodeURIComponent(userId)}`,
  },

  /** Roles (`/api/v1/roles`) — all Bearer */
  roles: {
    /** POST — Creates a new role (e.g. for a merchant). */
    create: "/api/v1/roles",
    /** GET — Returns roles for the current context (e.g. merchant). */
    list: "/api/v1/roles",
    /** GET — Returns the list of available permissions for roles. */
    permissions: "/api/v1/roles/permissions",
  },

  /** Invitations (`/api/v1/invitations`) */
  invitations: {
    /** POST — Bearer. Creates an invitation (e.g. merchant invites user by email and role). */
    create: "/api/v1/invitations",
    /** GET — Bearer. Lists invitations for the authenticated merchant. */
    list: "/api/v1/invitations",
    /** GET — Public. Validates an invitation token and returns invitation details (for the invitee). */
    validate: (token: string) => `/api/v1/invitations/validate/${encodeURIComponent(token)}`,
    /** POST — Public. Accepts an invitation: creates user account and optionally sets password (invitee). */
    accept: "/api/v1/invitations/accept",
  },

  /** Sessions (`/api/v1/sessions`) — all Bearer */
  sessions: {
    /** GET — Returns the authenticated user's active sessions (e.g. devices, IPs, last activity). */
    list: "/api/v1/sessions",
    /** DELETE — Revokes a specific session (logs out that device). */
    revoke: (sessionId: string) => `/api/v1/sessions/${encodeURIComponent(sessionId)}`,
  },

  /** Wallet (`/api/v1/wallets`) — Bearer except funding callback/status */
  wallet: {
    merchant: {
      create: "/api/v1/wallets/merchant",
      createAll: "/api/v1/wallets/merchant/all",
      byType: (merchantId: string, walletType: "TREASURY" | "OPERATION" | "KYC", appId?: string) =>
        `/api/v1/wallets/merchant/${encodeURIComponent(merchantId)}/type/${encodeURIComponent(walletType)}${appId ? `?appId=${encodeURIComponent(appId)}` : ""}`,
      all: (merchantId: string, appId?: string) =>
        `/api/v1/wallets/merchant/${encodeURIComponent(merchantId)}/all${appId ? `?appId=${encodeURIComponent(appId)}` : ""}`,
      updateBalance: "/api/v1/wallets/merchant/balance",
      users: (merchantId: string) => `/api/v1/wallets/merchant/${encodeURIComponent(merchantId)}/users`,
    },
    operation: {
      transactions: (merchantId: string) => `/api/v1/wallets/operation/${encodeURIComponent(merchantId)}/transactions`,
      debit: "/api/v1/wallets/operation/debit",
      toKyc: "/api/v1/wallets/operation-to-kyc",
    },
    kyc: {
      transactions: (merchantId: string) => `/api/v1/wallets/kyc/${encodeURIComponent(merchantId)}/transactions`,
      debit: "/api/v1/wallets/kyc/debit",
      fee: "/api/v1/wallets/kyc/fee",
      toOperation: "/api/v1/wallets/kyc-to-operation",
    },
    treasury: {
      transactions: (merchantId: string) => `/api/v1/wallets/treasury/${encodeURIComponent(merchantId)}/transactions`,
      transfer: "/api/v1/wallets/treasury/transfer",
      debitUser: "/api/v1/wallets/treasury/debit",
      debitMerchant: "/api/v1/wallets/treasury/debit-merchant",
    },
    user: {
      create: "/api/v1/wallets/user",
      byId: (userId: string) => `/api/v1/wallets/user/${encodeURIComponent(userId)}`,
      updateBalance: (userId: string) => `/api/v1/wallets/user/${encodeURIComponent(userId)}/balance`,
      transactions: (userId: string) => `/api/v1/wallets/user/${encodeURIComponent(userId)}/transactions`,
      transfer: (userId: string) => `/api/v1/wallets/user/${encodeURIComponent(userId)}/transfer`,
      apiCall: (userId: string) => `/api/v1/wallets/user/${encodeURIComponent(userId)}/api-call`,
    },
    funding: {
      callback: "/api/v1/wallets/funding/callback",
      status: (transactionId: string) => `/api/v1/wallets/funding/status/${encodeURIComponent(transactionId)}`,
    },
    transactions: {
      create: "/api/v1/transactions",
      byWallet: (walletId: string) => `/api/v1/transactions/${encodeURIComponent(walletId)}`,
    },
    admin: {
      summary: "/api/v1/wallets/admin/summary",
      transactions: "/api/v1/wallets/admin/transactions",
    },
  },

  /** Verify email (`/verify-email`) — public */
  verifyEmail: {
    /** GET — Verifies email using a token from the verification link (e.g. in email). */
    verifyEmail: "/verify-email/verify-email",
  },

 
  kyc: {
    /** Individual KYC */
    individual: {
      submit: "/api/v1/kyc/individual/submit",
      message: "/api/v1/kyc/individual/message",
      messages: "/api/v1/kyc/individual/messages",
    },
    /** KYC document upload (multipart/form-data, field: file) */
    upload: "/api/v1/kyc/upload",
    /** Business KYC */
    business: {
      submit: "/api/v1/kyc/business/submit",
      businessInfo: "/api/v1/kyc/business/business-info",
      businessSurvey: "/api/v1/kyc/business/business-survey",
      status: "/api/v1/kyc/business/status",
      documents: "/api/v1/kyc/business/documents",
      document: (documentId: string) =>
        `/api/v1/kyc/business/document/${encodeURIComponent(documentId)}`,
      businessTypeOptions: "/api/v1/kyc/business/business-type-options",
      industryTypeOptions: "/api/v1/kyc/business/industry-type-options",
      businessModelOptions: "/api/v1/kyc/business/business-model-options",
      beneficialOwners: (merchantId: string) =>
        `/api/v1/kyc/business/${encodeURIComponent(merchantId)}/beneficial-owners`,
      beneficialOwnersPut: "/api/v1/kyc/business/beneficial-owners",
      riskAssessment: "/api/v1/kyc/business/risk-assessment",
      enhancedDueDiligence: "/api/v1/kyc/business/enhanced-due-diligence",
      corporateStructure: "/api/v1/kyc/business/corporate-structure",
      nonProfitVerification: "/api/v1/kyc/business/non-profit-verification",
      governmentVerification: "/api/v1/kyc/business/government-verification",
      message: "/api/v1/kyc/business/message",
      messages: "/api/v1/kyc/business/messages",
    },
    /** KYC status */
    status: (userId: string) => `/api/v1/kyc/status/${encodeURIComponent(userId)}`,
    /** Admin — view */
    admin: {
      users: "/api/v1/kyc/admin/users",
      documents: "/api/v1/kyc/admin/documents",
      profiles: "/api/v1/kyc/admin/profiles",
      profilesPendingReview: "/api/v1/kyc/admin/profiles/pending-review",
      profilesHighRisk: "/api/v1/kyc/admin/profiles/high-risk",
      businesses: (userId: string) => `/api/v1/kyc/admin/businesses/${encodeURIComponent(userId)}`,
      businessesBeneficialOwners: (userId: string) =>
        `/api/v1/kyc/admin/businesses/${encodeURIComponent(userId)}/beneficial-owners`,
      businessesCorporateStructure: (userId: string) =>
        `/api/v1/kyc/admin/businesses/${encodeURIComponent(userId)}/corporate-structure`,
      document: (documentId: string) => `/api/v1/kyc/admin/document/${encodeURIComponent(documentId)}`,
      documentApprove: (documentId: string) =>
        `/api/v1/kyc/admin/document/${encodeURIComponent(documentId)}/approve`,
      documentStatus: (documentId: string) =>
        `/api/v1/kyc/admin/document/${encodeURIComponent(documentId)}/status`,
      documentVerifyAml: (documentId: string) =>
        `/api/v1/kyc/admin/document/${encodeURIComponent(documentId)}/verify-aml`,
      individuals: (userId: string) => `/api/v1/kyc/admin/individuals/${encodeURIComponent(userId)}`,
      businessesApprove: (userId: string) =>
        `/api/v1/kyc/admin/businesses/${encodeURIComponent(userId)}/approve`,
      businessesReview: (userId: string) =>
        `/api/v1/kyc/admin/businesses/${encodeURIComponent(userId)}/review`,
      businessesRiskLevel: (userId: string) =>
        `/api/v1/kyc/admin/businesses/${encodeURIComponent(userId)}/risk-level`,
      businessesVerifyCertificate: (userId: string) =>
        `/api/v1/kyc/admin/businesses/${encodeURIComponent(userId)}/verify-certificate`,
      businessesMessage: (userId: string) =>
        `/api/v1/kyc/admin/businesses/${encodeURIComponent(userId)}/message`,
      businessesBlock: (userId: string) =>
        `/api/v1/kyc/admin/businesses/${encodeURIComponent(userId)}/block`,
      businessesUnblock: (userId: string) =>
        `/api/v1/kyc/admin/businesses/${encodeURIComponent(userId)}/unblock`,
      individualsApprove: (userId: string) =>
        `/api/v1/kyc/admin/individuals/${encodeURIComponent(userId)}/approve`,
      individualsReview: (userId: string) =>
        `/api/v1/kyc/admin/individuals/${encodeURIComponent(userId)}/review`,
      individualsRiskLevel: (userId: string) =>
        `/api/v1/kyc/admin/individuals/${encodeURIComponent(userId)}/risk-level`,
      individualsMessage: (userId: string) =>
        `/api/v1/kyc/admin/individuals/${encodeURIComponent(userId)}/message`,
      individualsBlock: (userId: string) =>
        `/api/v1/kyc/admin/individuals/${encodeURIComponent(userId)}/block`,
      individualsUnblock: (userId: string) =>
        `/api/v1/kyc/admin/individuals/${encodeURIComponent(userId)}/unblock`,
      workflowStatus: (kycId: string) =>
        `/api/v1/kyc/admin/workflow/${encodeURIComponent(kycId)}/status`,
      workflowsPending: "/api/v1/kyc/admin/workflows/pending",
      checkSanctions: "/api/v1/kyc/admin/check-sanctions",
      reportsRiskSummary: "/api/v1/kyc/admin/reports/risk-summary",
      reportsComplianceMetrics: "/api/v1/kyc/admin/reports/compliance-metrics",
      reportsDocumentStatus: "/api/v1/kyc/admin/reports/document-status",
    },
  },
} as const

// ─── Frontend paths (relative to baseURL /api) for Next.js API proxy routes ───
// Gateway-aligned public routes proxied via `/api/v1/client-ms/*` → account-ms `/api/v1/*`
// Legacy auth shortcuts: `/api/v1/auth/register` → same as registration/user
const AUTH_BASE = "/v1/auth"
const USER_BASE = "/v1/user"
const COMPLIANCE_BASE = "/compliance"
/** Gateway-aligned routes (dedicated Next proxies under `/api/v1/...`). */
const REGISTRATION_BASE = "/v1/registration"
const OTP_BASE = "/v1/otp"
const WALLET_BASE = "/v1/wallets"
const KYC_V1 = "/v1/kyc"
/** Allowlisted catch-all proxy to account-ms gateway (`NEXT_PUBLIC_API_URL`). */
const CLIENT_MS = "/v1/client-ms"

export const ENDPOINTS = {
  /** POST /api/v1/registration/user — retail signup (send `x-tenant-subdomain`). */
  registration: {
    user: `${REGISTRATION_BASE}/user`,
    forms: `${CLIENT_MS}/registration/forms`,
    merchant: `${CLIENT_MS}/registration/merchant`,
    admin: `${CLIENT_MS}/registration/admin`,
  },
  /** POST /api/v1/otp/* — verify / resend / generate */
  otp: {
    verify: `${OTP_BASE}/verify`,
    resend: `${OTP_BASE}/resend`,
    generate: `${OTP_BASE}/generate`,
  },
  /** User wallet — proxied via `/api/v1/wallets/*` through account-ms. Bearer required. */
  wallet: {
    userById: (userId: string) => `${WALLET_BASE}/user/${encodeURIComponent(userId)}`,
    userProductTypeSummary: (userId: string) =>
      `${WALLET_BASE}/user/${encodeURIComponent(userId)}/product-type-summary`,
    userTransactions: (userId: string) =>
      `${WALLET_BASE}/user/${encodeURIComponent(userId)}/transactions`,
    banks: `${WALLET_BASE}/banks`,
    nameEnquiry: `${WALLET_BASE}/banks/name-enquiry`,
    externalBankAccounts: (userId: string) =>
      `${WALLET_BASE}/user/${encodeURIComponent(userId)}/external-bank-accounts`,
    externalBankAccountById: (userId: string, accountId: string) =>
      `${WALLET_BASE}/user/${encodeURIComponent(userId)}/external-bank-accounts/${encodeURIComponent(accountId)}`,
    externalBankAccountDefault: (userId: string, accountId: string) =>
      `${WALLET_BASE}/user/${encodeURIComponent(userId)}/external-bank-accounts/${encodeURIComponent(accountId)}/default`,
    payout: (userId: string) => `${WALLET_BASE}/user/${encodeURIComponent(userId)}/payout`,
    transactionPin: (userId: string) =>
      `${WALLET_BASE}/user/${encodeURIComponent(userId)}/transaction-pin`,
    transactionPinStatus: (userId: string) =>
      `${WALLET_BASE}/user/${encodeURIComponent(userId)}/transaction-pin/status`,
  },
  applications: {
    init: "/v1/applications/init",
    user: (userId: string) => `/v1/applications/user/${encodeURIComponent(userId)}`,
  },
  pricing: {
    product: (productId: string) => `/v1/pricing/product/${encodeURIComponent(productId)}`,
  },
  commodityAccounts: {
    apply: "/v1/commodity-accounts/apply",
    byId: (applicationId: string) =>
      `/v1/commodity-accounts/${encodeURIComponent(applicationId)}`,
    withdraw: (applicationId: string) =>
      `/v1/commodity-accounts/${encodeURIComponent(applicationId)}/withdraw`,
  },
  /**
   * Modular KYC — proxied via `/api/v1/kyc/*` → compliance-ms.
   * Flow: POST `modularVerification` (Bearer; `fuspay.customerId` from signup). Optional GET `modularVerificationUrl`.
   */
  /** Storefront catalog — app-enabled products only (not full Plata catalog). */
  products: {
    byAppId: (appId: string) => `/v1/products/app/${encodeURIComponent(appId)}`,
    byId: (productId: string) => `/v1/products/${encodeURIComponent(productId)}`,
  },
  kyc: {
    modularVerification: `${KYC_V1}/modular/verification`,
    modularVerificationUrl: `${KYC_V1}/modular/verification-url`,
    modularStatus: (verificationId: string) =>
      `${KYC_V1}/modular/status/${encodeURIComponent(verificationId)}`,
  },
  auth: {
    login: `${AUTH_BASE}/login`,
    signup: {
      merchant: `${AUTH_BASE}/register/merchant`,
      /** Legacy alias; prefer `ENDPOINTS.registration.user`. */
      user: `${AUTH_BASE}/register`,
      admin: `${AUTH_BASE}/register/admin`,
    },
    verify: {
      account: `${AUTH_BASE}/verify-account`,
      token: `${AUTH_BASE}/verify-token`,
      /** @deprecated Use `ENDPOINTS.otp.verify` */
      emailOtp: `${OTP_BASE}/verify`,
    },
    otp: {
      /** @deprecated Use `ENDPOINTS.otp.resend` */
      resendEmail: `${AUTH_BASE}/resend-email-otp`,
      generate: `${OTP_BASE}/generate`,
      verify: `${OTP_BASE}/verify`,
      resend: `${OTP_BASE}/resend`,
    },
    password: {
      forgot: `${AUTH_BASE}/password/forgot`,
      reset: `${AUTH_BASE}/password/reset`,
      change: `${AUTH_BASE}/password/change`,
      /** POST — Bearer. Same as `POST /api/v1/password/change/request-otp` on client-auth-ms. */
      changeRequestOtp: `${AUTH_BASE}/password/change/request-otp`,
    },
    me: `${AUTH_BASE}/me`,
    logout: `${AUTH_BASE}/logout`,
    /** Query param avoids `+` / `@` mangling in URL path segments (e.g. plus-addressed Gmail). */
    emailExists: (email: string) => `${AUTH_BASE}/email-exists?email=${encodeURIComponent(email)}`,
    sessions: {
      list: "/sessions",
      byId: (sessionId: string) => `/sessions/${encodeURIComponent(sessionId)}`,
    },
  },
  /** Direct client-auth-ms shapes under `/api/v1/...` (FAQs, invitations, roles, registration forms, …). */
  clientMs: {
    registrationForms: `${CLIENT_MS}/registration/forms`,
    registrationMerchant: `${CLIENT_MS}/registration/merchant`,
    registrationUser: `${CLIENT_MS}/registration/user`,
    registrationAdmin: `${CLIENT_MS}/registration/admin`,
    faqs: `${CLIENT_MS}/faqs`,
    faqById: (id: string) => `${CLIENT_MS}/faqs/${encodeURIComponent(id)}`,
    supportContacts: `${CLIENT_MS}/support-contacts`,
    supportContactById: (id: string) => `${CLIENT_MS}/support-contacts/${encodeURIComponent(id)}`,
    legalDocuments: `${CLIENT_MS}/legal-documents`,
    legalDocumentById: (id: string) => `${CLIENT_MS}/legal-documents/${encodeURIComponent(id)}`,
    invitations: `${CLIENT_MS}/invitations`,
    invitationValidate: (token: string) => `${CLIENT_MS}/invitations/validate/${encodeURIComponent(token)}`,
    invitationAccept: `${CLIENT_MS}/invitations/accept`,
    roles: `${CLIENT_MS}/roles`,
    rolesPermissions: `${CLIENT_MS}/roles/permissions`,
    sessions: `${CLIENT_MS}/sessions`,
    sessionRevoke: (sessionId: string) => `${CLIENT_MS}/sessions/${encodeURIComponent(sessionId)}`,
    userList: `${CLIENT_MS}/user/list`,
    userProfile: `${CLIENT_MS}/user/profile`,
    userDeactivate: `${CLIENT_MS}/user/deactivate`,
    userEmail: `${CLIENT_MS}/user/email`,
    userInfo: (userId: string) => `${CLIENT_MS}/user/info/${encodeURIComponent(userId)}`,
    userVerifyInfo: (userId: string) => `${CLIENT_MS}/user/verify-info/${encodeURIComponent(userId)}`,
    userSuspend: (userId: string) => `${CLIENT_MS}/user/suspend/${encodeURIComponent(userId)}`,
    userActivate: (userId: string) => `${CLIENT_MS}/user/activate/${encodeURIComponent(userId)}`,
    userStatus: (userId: string) => `${CLIENT_MS}/user/${encodeURIComponent(userId)}/status`,
    authVerifyToken: `${CLIENT_MS}/auth/verify-token`,
  },
  user: {
    list: `${USER_BASE}/list`,
    profile: `${USER_BASE}/profile`,
    info: (userId: string) => `${USER_BASE}/info/${encodeURIComponent(userId)}`,
    getUser: (userId: string) => `${USER_BASE}/info/${encodeURIComponent(userId)}`,
  },
  /** Compliance (KYC) — proxy to compliance-ms. Use ENDPOINTS.compliance.*; paths go through /api/compliance/[...path]. */
  compliance: {
    individual: {
      submit: `${COMPLIANCE_BASE}/individual/submit`,
      message: `${COMPLIANCE_BASE}/individual/message`,
      messages: `${COMPLIANCE_BASE}/individual/messages`,
    },
    upload: `${COMPLIANCE_BASE}/upload`,
    business: {
      submit: `${COMPLIANCE_BASE}/business/submit`,
      businessInfo: `${COMPLIANCE_BASE}/business/business-info`,
      businessSurvey: `${COMPLIANCE_BASE}/business/business-survey`,
      status: `${COMPLIANCE_BASE}/business/status`,
      documents: `${COMPLIANCE_BASE}/business/documents`,
      document: (documentId: string) =>
        `${COMPLIANCE_BASE}/business/document/${encodeURIComponent(documentId)}`,
      businessTypeOptions: "/v1/kyc/business/business-type-options",
      industryTypeOptions: "/v1/kyc/business/industry-type-options",
      businessModelOptions: "/v1/kyc/business/business-model-options",
      beneficialOwners: (merchantId: string) =>
        `${COMPLIANCE_BASE}/business/${encodeURIComponent(merchantId)}/beneficial-owners`,
      beneficialOwnersPut: `${COMPLIANCE_BASE}/business/beneficial-owners`,
      riskAssessment: `${COMPLIANCE_BASE}/business/risk-assessment`,
      enhancedDueDiligence: `${COMPLIANCE_BASE}/business/enhanced-due-diligence`,
      corporateStructure: `${COMPLIANCE_BASE}/business/corporate-structure`,
      nonProfitVerification: `${COMPLIANCE_BASE}/business/non-profit-verification`,
      governmentVerification: `${COMPLIANCE_BASE}/business/government-verification`,
      message: `${COMPLIANCE_BASE}/business/message`,
      messages: `${COMPLIANCE_BASE}/business/messages`,
    },
    /** GET — KYC status for user (direct v1 KYC proxy). */
    status: (userId: string) => `/v1/kyc/status/${encodeURIComponent(userId)}`,
    admin: {
      users: `${COMPLIANCE_BASE}/admin/users`,
      documents: `${COMPLIANCE_BASE}/admin/documents`,
      profiles: `${COMPLIANCE_BASE}/admin/profiles`,
      profilesPendingReview: `${COMPLIANCE_BASE}/admin/profiles/pending-review`,
      profilesHighRisk: `${COMPLIANCE_BASE}/admin/profiles/high-risk`,
      businesses: (userId: string) =>
        `${COMPLIANCE_BASE}/admin/businesses/${encodeURIComponent(userId)}`,
      businessesBeneficialOwners: (userId: string) =>
        `${COMPLIANCE_BASE}/admin/businesses/${encodeURIComponent(userId)}/beneficial-owners`,
      businessesCorporateStructure: (userId: string) =>
        `${COMPLIANCE_BASE}/admin/businesses/${encodeURIComponent(userId)}/corporate-structure`,
      document: (documentId: string) =>
        `${COMPLIANCE_BASE}/admin/document/${encodeURIComponent(documentId)}`,
      documentApprove: (documentId: string) =>
        `${COMPLIANCE_BASE}/admin/document/${encodeURIComponent(documentId)}/approve`,
      documentStatus: (documentId: string) =>
        `${COMPLIANCE_BASE}/admin/document/${encodeURIComponent(documentId)}/status`,
      documentVerifyAml: (documentId: string) =>
        `${COMPLIANCE_BASE}/admin/document/${encodeURIComponent(documentId)}/verify-aml`,
      individuals: (userId: string) =>
        `${COMPLIANCE_BASE}/admin/individuals/${encodeURIComponent(userId)}`,
      businessesApprove: (userId: string) =>
        `${COMPLIANCE_BASE}/admin/businesses/${encodeURIComponent(userId)}/approve`,
      businessesReview: (userId: string) =>
        `${COMPLIANCE_BASE}/admin/businesses/${encodeURIComponent(userId)}/review`,
      businessesRiskLevel: (userId: string) =>
        `${COMPLIANCE_BASE}/admin/businesses/${encodeURIComponent(userId)}/risk-level`,
      businessesVerifyCertificate: (userId: string) =>
        `${COMPLIANCE_BASE}/admin/businesses/${encodeURIComponent(userId)}/verify-certificate`,
      businessesMessage: (userId: string) =>
        `${COMPLIANCE_BASE}/admin/businesses/${encodeURIComponent(userId)}/message`,
      businessesBlock: (userId: string) =>
        `${COMPLIANCE_BASE}/admin/businesses/${encodeURIComponent(userId)}/block`,
      businessesUnblock: (userId: string) =>
        `${COMPLIANCE_BASE}/admin/businesses/${encodeURIComponent(userId)}/unblock`,
      individualsApprove: (userId: string) =>
        `${COMPLIANCE_BASE}/admin/individuals/${encodeURIComponent(userId)}/approve`,
      individualsReview: (userId: string) =>
        `${COMPLIANCE_BASE}/admin/individuals/${encodeURIComponent(userId)}/review`,
      individualsRiskLevel: (userId: string) =>
        `${COMPLIANCE_BASE}/admin/individuals/${encodeURIComponent(userId)}/risk-level`,
      individualsMessage: (userId: string) =>
        `${COMPLIANCE_BASE}/admin/individuals/${encodeURIComponent(userId)}/message`,
      individualsBlock: (userId: string) =>
        `${COMPLIANCE_BASE}/admin/individuals/${encodeURIComponent(userId)}/block`,
      individualsUnblock: (userId: string) =>
        `${COMPLIANCE_BASE}/admin/individuals/${encodeURIComponent(userId)}/unblock`,
      workflowStatus: (kycId: string) =>
        `${COMPLIANCE_BASE}/admin/workflow/${encodeURIComponent(kycId)}/status`,
      workflowsPending: `${COMPLIANCE_BASE}/admin/workflows/pending`,
      checkSanctions: `${COMPLIANCE_BASE}/admin/check-sanctions`,
      reportsRiskSummary: `${COMPLIANCE_BASE}/admin/reports/risk-summary`,
      reportsComplianceMetrics: `${COMPLIANCE_BASE}/admin/reports/compliance-metrics`,
      reportsDocumentStatus: `${COMPLIANCE_BASE}/admin/reports/document-status`,
    },
  },
} as const
