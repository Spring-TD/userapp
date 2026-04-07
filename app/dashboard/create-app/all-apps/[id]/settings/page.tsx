 "use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter, useParams } from "next/navigation"
import { useState, useEffect, useMemo } from "react"
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Trash2, AlertTriangle, Loader2, Copy, Eye, EyeOff, Plus, Download } from "lucide-react"
import { Trash2, AlertTriangle, Loader2, Copy, Eye, EyeOff, Plus, Download } from "lucide-react"
import { getAccessToken } from "@/lib/cookieAuth"
import { toast } from "sonner"
import { Skeleton } from "@/components/ui/skeleton"

type AppRecord = Record<string, unknown>
import { toast } from "sonner"
import { Skeleton } from "@/components/ui/skeleton"

type AppRecord = Record<string, unknown>

interface App {
  id: string
  name: string
  alias?: string
  description?: string
  status: string
  [key: string]: unknown
}

const LABEL_FOR_FIELD: Record<string, string> = {
  clientSecret: "Client secret",
  client_secret: "Client secret",
  secretKey: "Secret key",
  secret_key: "Secret key",
  apiSecret: "API secret",
  api_secret: "API secret",
  apiKey: "API key",
  api_key: "API key",
  springAppSecret: "Spring app secret",
  webhookSecret: "Webhook secret",
  webhook_secret: "Webhook secret",
  privateKey: "Private key",
  publicKey: "Public key",
}

function humanizeFieldKey(key: string) {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/_/g, " ")
    .trim()
    .replace(/^\w/, (c) => c.toUpperCase())
}

const MASK = "••••••••••"

/** Private key column: signing secret material (API: secretKey, clientSecret, …). */
function pickSecretKeyValue(app: App | null): string {
  if (!app) return ""
  const a = app as AppRecord
  const keys = [
    "secretKey",
    "secret_key",
    "clientSecret",
    "client_secret",
    "apiSecret",
    "api_secret",
    "springAppSecret",
    "webhookSecret",
    "webhook_secret",
    "privateKey",
    "private_key",
  ]
  for (const k of keys) {
    const v = a[k]
    if (v != null && String(v).trim()) return String(v).trim()
  }
  const creds = a.credentials
  if (creds && typeof creds === "object") {
    const nested = creds as AppRecord
    for (const k of keys) {
      const v = nested[k]
      if (v != null && String(v).trim()) return String(v).trim()
    }
  }
  return ""
}

/** Public key column: publishable key material (API: publicKey, publishable apiKey, …). */
function pickPublicKeyValue(app: App | null): string {
  if (!app) return ""
  const a = app as AppRecord
  const keys = ["publicKey", "public_key", "apiKey", "api_key", "publishableKey", "publishable_key"]
  for (const k of keys) {
    const v = a[k]
    if (v != null && String(v).trim()) return String(v).trim()
  }
  const creds = a.credentials
  if (creds && typeof creds === "object") {
    const nested = creds as AppRecord
    for (const k of keys) {
      const v = nested[k]
      if (v != null && String(v).trim()) return String(v).trim()
    }
  }
  return ""
}

function formatCredentialDate(raw: unknown): string {
  if (raw == null || raw === "") return "—"
  const d = new Date(String(raw))
  if (Number.isNaN(d.getTime())) return String(raw)
  return d.toLocaleDateString(undefined, { day: "2-digit", month: "2-digit", year: "numeric" })
}

function collectExtraCredentialRows(app: App | null): { id: string; label: string; value: string }[] {
  if (!app) return []
  const rows: { id: string; label: string; value: string }[] = []
  const seen = new Set<string>()
  const secretVal = pickSecretKeyValue(app)
  const publicVal = pickPublicKeyValue(app)

  const pushValue = (id: string, label: string, raw: unknown) => {
    if (raw === undefined || raw === null) return
    const value = String(raw).trim()
    if (!value || seen.has(id) || value === secretVal || value === publicVal) return
    seen.add(id)
    rows.push({ id, label, value })
  }

  const skip = new Set([
    "secretKey",
    "secret_key",
    "clientSecret",
    "client_secret",
    "apiSecret",
    "api_secret",
    "springAppSecret",
    "webhookSecret",
    "webhook_secret",
    "publicKey",
    "public_key",
    "apiKey",
    "api_key",
    "publishableKey",
    "publishable_key",
    "credentials",
  ])

  for (const key of Object.keys(app)) {
    if (skip.has(key)) continue
    const v = (app as AppRecord)[key]
    if (typeof v === "string" && v.length > 8 && /secret|key|token/i.test(key)) {
      pushValue(`extra-${key}`, LABEL_FOR_FIELD[key] ?? humanizeFieldKey(key), v)
    }
  }

  const pk = (app as AppRecord).productKeys ?? (app as AppRecord).product_keys
  if (Array.isArray(pk)) {
    pk.forEach((item, i) => {
      pushValue(
        `productKey-${i}`,
        `Product key ${i + 1}`,
        typeof item === "object" && item !== null ? JSON.stringify(item) : item,
      )
    })
  }

  return rows
  [key: string]: unknown
}

const LABEL_FOR_FIELD: Record<string, string> = {
  clientSecret: "Client secret",
  client_secret: "Client secret",
  secretKey: "Secret key",
  secret_key: "Secret key",
  apiSecret: "API secret",
  api_secret: "API secret",
  apiKey: "API key",
  api_key: "API key",
  springAppSecret: "Spring app secret",
  webhookSecret: "Webhook secret",
  webhook_secret: "Webhook secret",
  privateKey: "Private key",
  publicKey: "Public key",
}

function humanizeFieldKey(key: string) {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/_/g, " ")
    .trim()
    .replace(/^\w/, (c) => c.toUpperCase())
}

const MASK = "••••••••••"

/** Private key column: signing secret material (API: secretKey, clientSecret, …). */
function pickSecretKeyValue(app: App | null): string {
  if (!app) return ""
  const a = app as AppRecord
  const keys = [
    "secretKey",
    "secret_key",
    "clientSecret",
    "client_secret",
    "apiSecret",
    "api_secret",
    "springAppSecret",
    "webhookSecret",
    "webhook_secret",
    "privateKey",
    "private_key",
  ]
  for (const k of keys) {
    const v = a[k]
    if (v != null && String(v).trim()) return String(v).trim()
  }
  const creds = a.credentials
  if (creds && typeof creds === "object") {
    const nested = creds as AppRecord
    for (const k of keys) {
      const v = nested[k]
      if (v != null && String(v).trim()) return String(v).trim()
    }
  }
  return ""
}

/** Public key column: publishable key material (API: publicKey, publishable apiKey, …). */
function pickPublicKeyValue(app: App | null): string {
  if (!app) return ""
  const a = app as AppRecord
  const keys = ["publicKey", "public_key", "apiKey", "api_key", "publishableKey", "publishable_key"]
  for (const k of keys) {
    const v = a[k]
    if (v != null && String(v).trim()) return String(v).trim()
  }
  const creds = a.credentials
  if (creds && typeof creds === "object") {
    const nested = creds as AppRecord
    for (const k of keys) {
      const v = nested[k]
      if (v != null && String(v).trim()) return String(v).trim()
    }
  }
  return ""
}

function formatCredentialDate(raw: unknown): string {
  if (raw == null || raw === "") return "—"
  const d = new Date(String(raw))
  if (Number.isNaN(d.getTime())) return String(raw)
  return d.toLocaleDateString(undefined, { day: "2-digit", month: "2-digit", year: "numeric" })
}

function collectExtraCredentialRows(app: App | null): { id: string; label: string; value: string }[] {
  if (!app) return []
  const rows: { id: string; label: string; value: string }[] = []
  const seen = new Set<string>()
  const secretVal = pickSecretKeyValue(app)
  const publicVal = pickPublicKeyValue(app)

  const pushValue = (id: string, label: string, raw: unknown) => {
    if (raw === undefined || raw === null) return
    const value = String(raw).trim()
    if (!value || seen.has(id) || value === secretVal || value === publicVal) return
    seen.add(id)
    rows.push({ id, label, value })
  }

  const skip = new Set([
    "secretKey",
    "secret_key",
    "clientSecret",
    "client_secret",
    "apiSecret",
    "api_secret",
    "springAppSecret",
    "webhookSecret",
    "webhook_secret",
    "publicKey",
    "public_key",
    "apiKey",
    "api_key",
    "publishableKey",
    "publishable_key",
    "credentials",
  ])

  for (const key of Object.keys(app)) {
    if (skip.has(key)) continue
    const v = (app as AppRecord)[key]
    if (typeof v === "string" && v.length > 8 && /secret|key|token/i.test(key)) {
      pushValue(`extra-${key}`, LABEL_FOR_FIELD[key] ?? humanizeFieldKey(key), v)
    }
  }

  const pk = (app as AppRecord).productKeys ?? (app as AppRecord).product_keys
  if (Array.isArray(pk)) {
    pk.forEach((item, i) => {
      pushValue(
        `productKey-${i}`,
        `Product key ${i + 1}`,
        typeof item === "object" && item !== null ? JSON.stringify(item) : item,
      )
    })
  }

  return rows
}

// Helper to get token (cookie or localStorage)
const getAuthHeaders = () => {
  const token = typeof window !== 'undefined' ? getAccessToken() : null
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
  }
}

export default function SettingsPage() {
  const params = useParams()
  const appId = params.id as string
export default function SettingsPage() {
  const params = useParams()
  const appId = params.id as string
  const router = useRouter()
  const [app, setApp] = useState<App | null>(null)
  const [keysBundle, setKeysBundle] = useState<App | null>(null)
  const [keysBundle, setKeysBundle] = useState<App | null>(null)
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [confirmText, setConfirmText] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [generatingKey, setGeneratingKey] = useState(false)
  const [loadingKeys, setLoadingKeys] = useState(true)

  useEffect(() => {
    const fetchApp = async () => {
      try {
        const response = await fetch(`/api/apps/${appId}`, {
          credentials: 'include',
          headers: getAuthHeaders(),
        })
        const data = await response.json()
        if (data.success && data.data) {
          setApp(data.data)
        }
      } catch (err) {
        console.error('Failed to fetch app:', err)
      } finally {
        setLoading(false)
      }
    }

    if (appId) {
      fetchApp()
    }
  }, [appId])

  useEffect(() => {
    const loadKeys = async () => {
      try {
        const res = await fetch("/api/v1/keys", {
          method: "GET",
          credentials: "include",
          headers: getAuthHeaders(),
          cache: "no-store",
        })
        const json = await res.json().catch(() => ({} as any))

        if (!res.ok) return

        const payload = (json?.data ?? json) as unknown
        if (!payload) return

        // Endpoint may return either a single object or an array of bundles.
        const chosen =
          Array.isArray(payload) && payload.length ? (payload[0] as any) : (payload as any)

        setKeysBundle(chosen ?? null)
      } catch (err) {
        console.error("Failed to fetch /api/v1/keys:", err)
      }
    }

    void loadKeys()
  }, [appId])

  const secretKeyValue = useMemo(() => pickSecretKeyValue(keysBundle ?? app), [keysBundle, app])
  const publicKeyValue = useMemo(() => pickPublicKeyValue(keysBundle ?? app), [keysBundle, app])
  const extraCredentialRows = useMemo(() => collectExtraCredentialRows(keysBundle ?? app), [keysBundle, app])

  const [showSecretKey, setShowSecretKey] = useState(false)
  const [showPublicKey, setShowPublicKey] = useState(false)

  const merchantOrAppId = useMemo(() => {
    const source = keysBundle ?? app
    if (!source) return appId
    const m = (source as AppRecord).merchantId ?? (source as AppRecord).merchant_id
    return m != null && String(m).trim() ? String(m).trim() : appId
  }, [keysBundle, app, appId])

  const generatedOn = useMemo(() => {
    const source = keysBundle ?? app
    if (!source) return "—"
    const a = source as AppRecord
    return formatCredentialDate(
      a.generatedOn ??
        a.generated_on ??
        a.keysGeneratedAt ??
        a.createdAt ??
        a.dateCreated ??
        a.created_at,
    )
  }, [keysBundle, app])

  const expiresOn = useMemo(() => {
    const source = keysBundle ?? app
    if (!source) return "—"
    const a = source as AppRecord
    return formatCredentialDate(
      a.expiresOn ??
        a.expires_on ??
        a.keyExpiresAt ??
        a.keysExpiresAt ??
        a.credentialsExpireAt ??
        a.expiresAt ??
        a.expires_at,
    )
  }, [keysBundle, app])

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast.success(`${label} copied`)
    } catch {
      toast.error("Could not copy to clipboard")
    }
  }

  const handleDeleteApp = async () => {
    if (confirmText !== app?.name) {
      setError('Please type the app name correctly to confirm deletion')
      return
    }

    try {
      setDeleting(true)
      setError(null)

      const response = await fetch(`/api/apps/${appId}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: getAuthHeaders(),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete app')
      }

      // Redirect to apps list
      router.push('/dashboard/create-app/all-apps')
    } catch (err) {
      console.error('Failed to delete app:', err)
      setError(err instanceof Error ? err.message : 'Failed to delete app')
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex-1 bg-white p-8">
        <Skeleton className="h-8 w-28 mb-6" />

        <div className="border border-gray-200 rounded-lg p-6 mb-8">
          <Skeleton className="h-5 w-40 mb-4" />
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-5 w-40" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-5 w-28" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-6 w-24 rounded-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-14" />
              <Skeleton className="h-5 w-32" />
            </div>
          </div>
        </div>

        <div className="border border-gray-200 rounded-lg p-6 mb-8">
          <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center">
              <div className="space-y-2">
                <Skeleton className="h-6 w-56" />
                <Skeleton className="h-4 w-80" />
              </div>
              <Skeleton className="h-10 w-56 rounded-md" />
            </div>

            <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
              <div className="min-w-[720px]">
                <div className="grid grid-cols-6 gap-4 p-4 bg-gray-50 border-b border-gray-200">
                  {Array.from({ length: 6 }).map((_, idx) => (
                    <Skeleton key={idx} className="h-4 w-24" />
                  ))}
                </div>
                {Array.from({ length: 2 }).map((_, rowIdx) => (
                  <div key={rowIdx} className="grid grid-cols-6 gap-4 p-4 border-b border-gray-100 last:border-b-0 items-center">
                    <Skeleton className="h-5 w-28 font-mono" />
                    <Skeleton className="h-5 w-44" />
                    <Skeleton className="h-5 w-44" />
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-9 w-28 rounded-md" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        <Skeleton className="h-8 w-28 mb-6" />

        <div className="border border-gray-200 rounded-lg p-6 mb-8">
          <Skeleton className="h-5 w-40 mb-4" />
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-5 w-40" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-5 w-28" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-6 w-24 rounded-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-14" />
              <Skeleton className="h-5 w-32" />
            </div>
          </div>
        </div>

        <div className="border border-gray-200 rounded-lg p-6 mb-8">
          <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center">
              <div className="space-y-2">
                <Skeleton className="h-6 w-56" />
                <Skeleton className="h-4 w-80" />
              </div>
              <Skeleton className="h-10 w-56 rounded-md" />
            </div>

            <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
              <div className="min-w-[720px]">
                <div className="grid grid-cols-6 gap-4 p-4 bg-gray-50 border-b border-gray-200">
                  {Array.from({ length: 6 }).map((_, idx) => (
                    <Skeleton key={idx} className="h-4 w-24" />
                  ))}
                </div>
                {Array.from({ length: 2 }).map((_, rowIdx) => (
                  <div key={rowIdx} className="grid grid-cols-6 gap-4 p-4 border-b border-gray-100 last:border-b-0 items-center">
                    <Skeleton className="h-5 w-28 font-mono" />
                    <Skeleton className="h-5 w-44" />
                    <Skeleton className="h-5 w-44" />
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-9 w-28 rounded-md" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 bg-white p-8">
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">Settings</h1>
      
      {/* App Info Section */}
      <div className="border border-gray-200 rounded-lg p-6 mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">App Information</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-500">App Name</p>
            <p className="text-gray-900 font-medium">{app?.name || 'N/A'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">App ID</p>
            <p className="text-gray-900 font-mono text-sm">{appId}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Status</p>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              app?.status === 'approved' ? 'bg-green-100 text-green-800' :
              app?.status === 'submitted' ? 'bg-blue-100 text-blue-800' :
              app?.status === 'rejected' ? 'bg-red-100 text-red-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {app?.status || 'draft'}
            </span>
          </div>
          {app?.alias && (
            <div>
              <p className="text-sm text-gray-500">Alias</p>
              <p className="text-gray-900">{app.alias}</p>
            </div>
          )}
        </div>
      </div>

      {/* API keys — CredentialsTab-style table (Secret key + Private key columns) */}
      <div className="border border-gray-200 rounded-lg p-6 mb-8">
        <div className="space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">API keys &amp; credentials</h2>
              <p className="text-sm text-gray-500">Same layout as Developer credentials: show or hide keys, then copy.</p>
            </div>
            <Button type="button" className="bg-black text-white hover:bg-gray-800 shrink-0" disabled>
              <Plus className="w-4 h-4 mr-2" />
              Generate New Keys
            </Button>
          </div>

          <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
            <div className="min-w-[720px]">
              <div className="grid grid-cols-6 gap-4 p-4 bg-gray-50 border-b border-gray-200 text-sm font-medium text-gray-700">
                <div>Merchant ID</div>
                <div>Private key</div>
                <div>Public key</div>
                <div>Generated On</div>
                <div>Expires on</div>
                <div>Download</div>
              </div>
              <div className="grid grid-cols-6 gap-4 p-4 border-b border-gray-100 last:border-b-0 text-sm items-center">
                <div className="font-medium font-mono text-xs break-all">{merchantOrAppId}</div>
                <div className="flex items-center gap-2 min-w-0">
                  <span className="truncate font-mono text-xs" title={secretKeyValue || undefined}>
                    {!secretKeyValue ? "—" : showSecretKey ? secretKeyValue : MASK}
                  </span>
                  {secretKeyValue ? (
                    <>
                      <button
                        type="button"
                        onClick={() => setShowSecretKey((s) => !s)}
                        className="shrink-0 text-gray-400 hover:text-gray-600"
                        aria-label={showSecretKey ? "Hide private key" : "Show private key"}
                      >
                        {showSecretKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => void copyToClipboard(secretKeyValue, "Private key")}
                        className="shrink-0 text-gray-400 hover:text-gray-600"
                        aria-label="Copy private key"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </>
                  ) : null}
                </div>
                <div className="flex items-center gap-2 min-w-0">
                  <span className="truncate font-mono text-xs" title={publicKeyValue || undefined}>
                    {!publicKeyValue ? "—" : showPublicKey ? publicKeyValue : MASK}
                  </span>
                  {publicKeyValue ? (
                    <>
                      <button
                        type="button"
                        onClick={() => setShowPublicKey((s) => !s)}
                        className="shrink-0 text-gray-400 hover:text-gray-600"
                        aria-label={showPublicKey ? "Hide public key" : "Show public key"}
                      >
                        {showPublicKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => void copyToClipboard(publicKeyValue, "Public key")}
                        className="shrink-0 text-gray-400 hover:text-gray-600"
                        aria-label="Copy public key"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </>
                  ) : null}
                </div>
                <div className="text-gray-700">{generatedOn}</div>
                <div className="text-gray-700">{expiresOn}</div>
                <div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1"
                    onClick={() => toast.info("Key bundle download will be available when your backend exposes a download URL.")}
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {extraCredentialRows.length > 0 ? (
            <div className="bg-[#F0F2F5] rounded-lg p-6 space-y-4">
              <p className="text-sm font-medium text-gray-800">Additional credentials</p>
              {extraCredentialRows.map((row) => (
                <div
                  key={row.id}
                  className="flex flex-col gap-2 sm:flex-row sm:justify-between sm:items-start bg-white p-4 rounded-md shadow-sm"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-gray-900">{row.label}</p>
                    <p className="text-sm text-gray-600 break-all font-mono">{row.value}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void copyToClipboard(row.value, row.label)}
                    className="shrink-0 inline-flex items-center justify-center rounded-md p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-800"
                    aria-label={`Copy ${row.label}`}
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          ) : null}

          {!secretKeyValue && !publicKeyValue ? (
            <p className="text-sm text-gray-500">
              No private or public key on this app record yet. When the API returns fields such as{" "}
              <code className="text-xs">secretKey</code>, <code className="text-xs">clientSecret</code>, <code className="text-xs">publicKey</code>, or{" "}
              <code className="text-xs">apiKey</code>, they will appear in the table above.
            </p>
          ) : null}
        </div>
      </div>

      {/* Danger Zone */}
      <div className="border border-red-200 rounded-lg p-6 bg-red-50">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="text-red-600" size={20} />
          <h2 className="text-lg font-semibold text-red-900">Danger Zone</h2>
        </div>
        
        <p className="text-sm text-red-700 mb-4">
          Deleting this app is permanent and cannot be undone. All associated data including products and configurations will be removed.
        </p>

        {!showDeleteConfirm ? (
          <Button
            variant="destructive"
            onClick={() => setShowDeleteConfirm(true)}
            className="bg-red-600 hover:bg-red-700"
          >
            <Trash2 size={16} className="mr-2" />
            Delete App
          </Button>
        ) : (
          <div className="space-y-4">
            <div className="bg-white border border-red-300 rounded-lg p-4">
              <p className="text-sm text-gray-700 mb-3">
                To confirm deletion, please type the app name: <strong>{app?.name}</strong>
              </p>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="Type app name to confirm"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
              {error && (
                <p className="text-red-600 text-sm mt-2">{error}</p>
              )}
            </div>
            <div className="flex gap-3">
              <Button
                variant="destructive"
                onClick={handleDeleteApp}
                disabled={deleting || confirmText !== app?.name}
                className="bg-red-600 hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? (
                  <>
                    <Loader2 size={16} className="mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 size={16} className="mr-2" />
                    Confirm Delete
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowDeleteConfirm(false)
                  setConfirmText("")
                  setError(null)
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
