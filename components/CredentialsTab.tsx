"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Eye, EyeOff, Plus } from "lucide-react"

interface Credential {
  id: string
  merchantId: string
  secretKey: string
  privateKey: string
  generatedOn: string
  expiresOn: string
}

interface CredentialsTabProps {
  onGenerateNewKeys?: () => void
  onDownload?: (credentialId: string) => void
  credentials?: Credential[]
  buttonClassName?: string
  showSecrets?: Record<string, boolean>
  secretKeyValue?: string
  privateKeyValue?: string
}

const defaultCredentials: Credential[] = [
  {
    id: "1",
    merchantId: "MERCH_0LSKBL5FS",
    secretKey: "••••••••••",
    privateKey: "••••••••••",
    generatedOn: "12/09/2025",
    expiresOn: "14/09/2025",
  },
  {
    id: "2",
    merchantId: "MERCH_0LSKBL5FS",
    secretKey: "••••••••••",
    privateKey: "••••••••••",
    generatedOn: "12/09/2025",
    expiresOn: "14/09/2025",
  },
  {
    id: "3",
    merchantId: "MERCH_0LSKBL5FS",
    secretKey: "••••••••••",
    privateKey: "••••••••••",
    generatedOn: "12/09/2025",
    expiresOn: "14/09/2025",
  },
  {
    id: "4",
    merchantId: "MERCH_0LSKBL5FS",
    secretKey: "••••••••••",
    privateKey: "••••••••••",
    generatedOn: "12/09/2025",
    expiresOn: "14/09/2025",
  },
]

export default function CredentialsTab({
  onGenerateNewKeys,
  onDownload,
  credentials = defaultCredentials,
  buttonClassName = "bg-black text-white hover:bg-gray-800",
  showSecrets,
  secretKeyValue = "sk_live_abc123def456",
  privateKeyValue = "pk_live_xyz789uvw012"
}: CredentialsTabProps) {
  const [internalShowSecrets, setInternalShowSecrets] = useState<Record<string, boolean>>({})
  const currentShowSecrets = showSecrets ?? internalShowSecrets
  const setShowSecrets = showSecrets ? undefined : setInternalShowSecrets

  const toggleSecret = (id: string) => {
    if (setShowSecrets) {
      setShowSecrets((prev) => ({ ...prev, [id]: !prev[id] }))
    }
  }

  const handleDownload = (credentialId: string) => {
    if (onDownload) {
      onDownload(credentialId)
    } else {
      // Default download behavior
      console.log("Download credential:", credentialId)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div></div>
        <Button className={buttonClassName} onClick={onGenerateNewKeys}>
          <Plus className="w-4 h-4 mr-2" />
          Generate New Keys
        </Button>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="grid grid-cols-6 gap-4 p-4 bg-gray-50 border-b border-gray-200 text-sm font-medium text-gray-700">
          <div>Merchant ID</div>
          <div>Secret Key</div>
          <div>Private Key</div>
          <div>Generated On</div>
          <div>Expires on</div>
          <div>Download</div>
        </div>
        {credentials.map((cred) => (
          <div key={cred.id} className="grid grid-cols-6 gap-4 p-4 border-b border-gray-100 last:border-b-0 text-sm">
            <div className="font-medium">{cred.merchantId}</div>
            <div className="flex items-center gap-2">
              <span>{currentShowSecrets[`secret-${cred.id}`] ? secretKeyValue : cred.secretKey}</span>
              <button 
                onClick={() => toggleSecret(`secret-${cred.id}`)} 
                className="text-gray-400 hover:text-gray-600"
                disabled={!setShowSecrets}
              >
                {currentShowSecrets[`secret-${cred.id}`] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <div className="flex items-center gap-2">
              <span>{currentShowSecrets[`private-${cred.id}`] ? privateKeyValue : cred.privateKey}</span>
              <button 
                onClick={() => toggleSecret(`private-${cred.id}`)} 
                className="text-gray-400 hover:text-gray-600"
                disabled={!setShowSecrets}
              >
                {currentShowSecrets[`private-${cred.id}`] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <div>{cred.generatedOn}</div>
            <div>{cred.expiresOn}</div>
            <div>
              <Button variant="outline" size="sm" onClick={() => handleDownload(cred.id)}>
                Download
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
