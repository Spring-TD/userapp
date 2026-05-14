"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Copy, MoreVertical, Check, AlertCircle, Loader2, Globe, Shield, CheckCircle2, XCircle, RefreshCw, ExternalLink } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { useState, useCallback } from "react"
import { useAppBuilder } from "@/contexts/AppBuilderContext"
import { toast } from "sonner"

type VerificationStatus = 'idle' | 'checking' | 'success' | 'failed'

export function DNSTab() {
  const { dns, updateDNS, isLoading, isSaving, appId, saveSection } = useAppBuilder()
  const [newDomain, setNewDomain] = useState("")
  const [domainError, setDomainError] = useState<string | null>(null)
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus>('idle')
  const [verificationDetails, setVerificationDetails] = useState<{
    aRecord: boolean
    cnameRecord: boolean
    txtRecord: boolean
  }>({ aRecord: false, cnameRecord: false, txtRecord: false })

  // Safe accessors with defaults
  const baseUrl = dns.baseUrl ?? `https://${appId || 'yourapp'}.springpay.app/`
  const records = dns.records ?? generateDNSRecords(dns.customDomain)

  // Generate DNS records based on domain
  function generateDNSRecords(domain?: string) {
    const targetDomain = domain || 'yourapp.springpay.app'
    return [
      { type: 'A', name: '@', value: '76.76.21.21' },
      { type: 'CNAME', name: 'www', value: 'cname.springpay.app' },
      { type: 'TXT', name: '_springpay-verification', value: `springpay-verify=${appId || 'pending'}` },
    ]
  }

  const copyToClipboard = useCallback((text: string, field: string) => {
    navigator.clipboard.writeText(text)
    setCopiedField(field)
    toast.success("Copied to clipboard")
    setTimeout(() => setCopiedField(null), 2000)
  }, [])

  const handleToggleCustomDomain = async (checked: boolean) => {
    updateDNS({ useCustomDomain: checked })
    if (!checked) {
      setVerificationStatus('idle')
    }
    // Auto-save when toggling
    if (appId) {
      setTimeout(() => saveSection('dns'), 50) // slight delay for state to update
    }
  }

  const validateDomain = (domain: string): boolean => {
    const domainRegex = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$/i
    return domainRegex.test(domain)
  }

  const handleAddDomain = async () => {
    setDomainError(null)
    setVerificationStatus('idle')

    if (!newDomain.trim()) {
      setDomainError("Please enter a domain")
      return
    }

    // Remove protocol if present
    let cleanDomain = newDomain.replace(/^https?:\/\//, "").replace(/\/$/, "")

    if (!validateDomain(cleanDomain)) {
      setDomainError("Please enter a valid domain (e.g., www.example.com)")
      return
    }

    // Generate new DNS records for this domain
    const newRecords = generateDNSRecords(cleanDomain)

    updateDNS({
      customDomain: cleanDomain,
      verified: false,
      records: newRecords,
    })
    setNewDomain("")
    toast.success("Domain added. Configure DNS records below to verify ownership.")
    // Save after adding domain
    if (appId) {
      setTimeout(() => saveSection('dns'), 50)
    }
  }

  const handleVerifyDNS = async () => {
    if (!dns.customDomain) {
      toast.error("Please add a domain first")
      return
    }

    setVerificationStatus('checking')
    setVerificationDetails({ aRecord: false, cnameRecord: false, txtRecord: false })

    try {
      // Simulate DNS lookup with progressive verification
      // In production, this would call an API endpoint that performs actual DNS lookups
      await new Promise(resolve => setTimeout(resolve, 1000))
      setVerificationDetails(prev => ({ ...prev, aRecord: true }))

      await new Promise(resolve => setTimeout(resolve, 800))
      setVerificationDetails(prev => ({ ...prev, cnameRecord: true }))

      await new Promise(resolve => setTimeout(resolve, 600))

      // Simulate 70% success rate for demo
      const success = Math.random() > 0.3

      if (success) {
        setVerificationDetails(prev => ({ ...prev, txtRecord: true }))
        setVerificationStatus('success')
        updateDNS({ verified: true })
        toast.success("🎉 Domain verified successfully!", {
          description: `${dns.customDomain} is now connected to your app.`,
        })
      } else {
        setVerificationStatus('failed')
        toast.error("DNS verification failed", {
          description: "Some records could not be verified. Please check your DNS configuration.",
        })
      }
    } catch (error) {
      setVerificationStatus('failed')
      toast.error("Verification failed. Please try again.")
    }
  }

  const handleRemoveDomain = () => {
    updateDNS({
      customDomain: undefined,
      verified: false,
      records: [],
    })
    setVerificationStatus('idle')
    setVerificationDetails({ aRecord: false, cnameRecord: false, txtRecord: false })
    toast.success("Domain removed")
  }

  if (isLoading) {
    return (
      <div className="py-6 max-w-5xl flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-[#7C3AED]" />
          <p className="text-sm text-gray-500">Loading DNS configuration...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="py-6 max-w-5xl space-y-8">
      {/* Header Section */}
      <div className="flex items-center justify-between bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-6 border border-purple-100">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#7C3AED] flex items-center justify-center">
            <Globe className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Custom Domain</h2>
            <p className="text-sm text-gray-500">Connect your own domain to personalize your app</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Switch
            id="custom-domain"
            className="data-[state=checked]:bg-[#7C3AED]"
            checked={dns.useCustomDomain}
            onCheckedChange={handleToggleCustomDomain}
          />
          <span className={`text-sm font-medium ${dns.useCustomDomain ? 'text-[#7C3AED]' : 'text-gray-500'}`}>
            {dns.useCustomDomain ? "Enabled" : "Disabled"}
          </span>
        </div>
      </div>

      {/* Default SpringPay URL */}
      <div className="space-y-4 p-5 bg-gray-50 rounded-xl border border-gray-200">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-gray-500" />
          <p className="text-sm font-medium text-gray-700">Default SpringPay URL</p>
        </div>
        <div className="flex items-center gap-4 bg-white rounded-lg border border-gray-200 p-3">
          <div className="px-4 py-2 bg-gray-100 rounded-lg text-xs font-medium text-gray-600 uppercase tracking-wider">
            URL
          </div>
          <div className="flex-1 flex items-center justify-between">
            <code className="text-sm font-mono text-gray-800">{baseUrl}</code>
            <Button
              variant="ghost"
              size="sm"
              className="text-gray-400 hover:text-gray-600 gap-2"
              onClick={() => copyToClipboard(baseUrl, 'baseUrl')}
            >
              {copiedField === 'baseUrl' ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
              Copy
            </Button>
          </div>
        </div>
        <p className="text-xs text-gray-500">This is your default app URL on SpringPay infrastructure.</p>
      </div>

      {/* Custom Domain Input */}
      {dns.useCustomDomain && (
        <div className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-base font-semibold text-gray-800">Add Your Domain</h3>
            <div className="flex gap-3 max-w-2xl">
              <Input
                placeholder="e.g. app.yourcompany.com"
                className="h-12 bg-white border-gray-200 text-base"
                value={newDomain}
                onChange={(e) => {
                  setNewDomain(e.target.value)
                  setDomainError(null)
                }}
                onKeyDown={(e) => e.key === 'Enter' && handleAddDomain()}
              />
              <Button
                className="h-12 bg-[#7C3AED] hover:bg-[#6D28D9] text-white px-8"
                onClick={handleAddDomain}
              >
                Add Domain
              </Button>
            </div>
            {domainError && (
              <p className="text-sm text-red-500 font-medium flex items-center gap-1.5">
                <XCircle className="w-4 h-4" />
                {domainError}
              </p>
            )}
          </div>

          {/* Current Domain Status */}
          {dns.customDomain && (
            <div className={`p-5 rounded-xl border ${dns.verified ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  {dns.verified ? (
                    <CheckCircle2 className="w-6 h-6 text-green-500" />
                  ) : (
                    <AlertCircle className="w-6 h-6 text-amber-500" />
                  )}
                  <div>
                    <p className="font-semibold text-gray-900">{dns.customDomain}</p>
                    <p className={`text-sm ${dns.verified ? 'text-green-600' : 'text-amber-600'}`}>
                      {dns.verified ? 'Domain verified and active' : 'Pending DNS verification'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {dns.verified && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(`https://${dns.customDomain}`, '_blank')}
                      className="gap-2"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Visit
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleRemoveDomain}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    Remove
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* DNS Configuration Table */}
      {dns.useCustomDomain && dns.customDomain && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-gray-800">DNS Configuration</h3>
              <p className="text-sm text-gray-500 mt-1">
                Add these records to your domain's DNS settings
              </p>
            </div>
          </div>

          {/* Verification Status */}
          {verificationStatus !== 'idle' && (
            <div className={`p-4 rounded-lg border ${verificationStatus === 'success' ? 'bg-green-50 border-green-200' :
                verificationStatus === 'failed' ? 'bg-red-50 border-red-200' :
                  'bg-blue-50 border-blue-200'
              }`}>
              <div className="flex items-center gap-3">
                {verificationStatus === 'checking' && (
                  <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                )}
                {verificationStatus === 'success' && (
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                )}
                {verificationStatus === 'failed' && (
                  <XCircle className="w-5 h-5 text-red-500" />
                )}
                <span className={`font-medium ${verificationStatus === 'success' ? 'text-green-700' :
                    verificationStatus === 'failed' ? 'text-red-700' :
                      'text-blue-700'
                  }`}>
                  {verificationStatus === 'checking' && 'Verifying DNS records...'}
                  {verificationStatus === 'success' && 'All DNS records verified successfully!'}
                  {verificationStatus === 'failed' && 'Some records could not be verified'}
                </span>
              </div>

              {/* Individual record status */}
              {(verificationStatus === 'checking' || verificationStatus === 'failed') && (
                <div className="mt-3 space-y-2 pl-8">
                  <div className="flex items-center gap-2 text-sm">
                    {verificationDetails.aRecord ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border-2 border-gray-300" />
                    )}
                    <span className={verificationDetails.aRecord ? 'text-green-600' : 'text-gray-500'}>
                      A Record
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    {verificationDetails.cnameRecord ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border-2 border-gray-300" />
                    )}
                    <span className={verificationDetails.cnameRecord ? 'text-green-600' : 'text-gray-500'}>
                      CNAME Record
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    {verificationDetails.txtRecord ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border-2 border-gray-300" />
                    )}
                    <span className={verificationDetails.txtRecord ? 'text-green-600' : 'text-gray-500'}>
                      TXT Record (Verification)
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* DNS Records Table */}
          <div className="rounded-xl overflow-hidden border border-gray-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-600 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 font-semibold w-24">Type</th>
                  <th className="px-6 py-4 font-semibold w-48">Name / Host</th>
                  <th className="px-6 py-4 font-semibold">Value / Target</th>
                  <th className="px-4 py-4 w-16"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {records.map((record, index) => (
                  <tr key={index} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-5">
                      <span className="inline-flex px-3 py-1.5 bg-purple-100 text-purple-700 font-mono text-xs rounded-lg font-bold">
                        {record.type}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center justify-between group">
                        <code className="text-gray-800 font-mono text-sm">{record.name}</code>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => copyToClipboard(record.name, `name-${index}`)}
                        >
                          {copiedField === `name-${index}` ? (
                            <Check className="w-4 h-4 text-green-500" />
                          ) : (
                            <Copy className="w-4 h-4 text-gray-400" />
                          )}
                        </Button>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center justify-between group">
                        <code className="text-gray-600 font-mono text-sm truncate max-w-xs">{record.value}</code>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 ml-2"
                          onClick={() => copyToClipboard(record.value, `value-${index}`)}
                        >
                          {copiedField === `value-${index}` ? (
                            <Check className="w-4 h-4 text-green-500" />
                          ) : (
                            <Copy className="w-4 h-4 text-gray-400" />
                          )}
                        </Button>
                      </div>
                    </td>
                    <td className="px-4 py-5"></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-xs text-gray-500">
            <strong>Note:</strong> DNS changes can take up to 48 hours to propagate. Most changes are visible within 15 minutes.
          </p>
        </div>
      )}

      {/* Action Button */}
      {dns.useCustomDomain && dns.customDomain && !dns.verified && (
        <div className="flex items-center gap-4">
          <Button
            className="h-12 px-8 bg-[#7C3AED] hover:bg-[#6D28D9] text-white gap-2"
            onClick={handleVerifyDNS}
            disabled={verificationStatus === 'checking'}
          >
            {verificationStatus === 'checking' ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Verifying...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4" />
                Verify DNS Configuration
              </>
            )}
          </Button>
          <p className="text-sm text-gray-500">
            Click to check if your DNS records are properly configured
          </p>
        </div>
      )}
    </div>
  )
}
