"use client"
import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Search } from "lucide-react"
import { FiEyeOff, FiEye } from "react-icons/fi"
import { IoIosCopy } from "react-icons/io"
import { merchantWalletApi, type MerchantWallet, type Transaction } from "@/lib/walletService"

interface WalletRecord {
  amount: string
  ref: string
  timestamp: string
  fee: string
  product: string
  metaRef: string
  userEmail: string
  userPhone: string
}

// Helper to get merchantId from JWT token
const getMerchantIdFromToken = (): string | null => {
  if (typeof window === 'undefined') return null
  const token = localStorage.getItem('accessToken')
  if (!token) return null
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return payload.userMerchantId || payload.merchantId || null
  } catch {
    return null
  }
}

export default function TreasuryWalletPage() {
  const params = useParams()
  const appId = params.id as string
  
  const [wallet, setWallet] = useState<MerchantWallet | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [walletRecords, setWalletRecords] = useState<WalletRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showBalance, setShowBalance] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [merchantId, setMerchantId] = useState<string | null>(null)

  // Get merchant ID from token on mount
  useEffect(() => {
    const id = getMerchantIdFromToken()
    setMerchantId(id)
  }, [])

  useEffect(() => {
    const fetchWalletData = async () => {
      if (!merchantId) {
        setError('No merchant ID found. Please log in again.')
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)
        
        // Fetch treasury wallet using merchantId from token
        const walletResponse = await merchantWalletApi.getMerchantWallet(merchantId, 'TREASURY')
        if (walletResponse.success && walletResponse.data) {
          setWallet(walletResponse.data)
        }

        // Fetch treasury transactions
        const WALLET_API_BASE = process.env.NEXT_PUBLIC_WALLET_SERVICE_URL || 'https://wallet-ms.fly.dev'
        const token = localStorage.getItem('accessToken')
        const transactionsResponse = await fetch(
          `${WALLET_API_BASE}/api/v1/wallets/treasury/${merchantId}/transactions`,
          {
            headers: {
              'Content-Type': 'application/json',
              ...(token && { 'Authorization': `Bearer ${token}` }),
            },
          }
        )
        
        const transactionsData = await transactionsResponse.json()
        // Handle nested response: { data: { transactions: [...] } }
        const txArray = transactionsData.data?.transactions || transactionsData.data || []
        if (transactionsData.success && Array.isArray(txArray)) {
          setTransactions(txArray)
          // Transform transactions to wallet records format
          const records = txArray.map((tx: Transaction) => ({
            amount: `$${Math.abs(tx.amount).toFixed(2)}`,
            ref: tx.referenceId || tx.id.slice(0, 12),
            timestamp: new Date(tx.createdAt).toLocaleString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
              month: 'short',
              day: 'numeric',
              year: 'numeric'
            }),
            fee: '$0.00',
            product: tx.description || 'N/A',
            metaRef: tx.id.slice(0, 10),
            userEmail: 'N/A',
            userPhone: 'N/A',
          }))
          setWalletRecords(records)
        }
      } catch (err) {
        console.error('Failed to fetch wallet data:', err)
        setError(err instanceof Error ? err.message : 'Failed to load wallet data')
      } finally {
        setLoading(false)
      }
    }

    if (merchantId) {
      fetchWalletData()
    }
  }, [merchantId])

  const handleCopyRef = (ref: string) => {
    navigator.clipboard.writeText(ref)
  }

  const formatBalance = (balance: number) => {
    const formatted = balance.toFixed(2)
    const [dollars, cents] = formatted.split('.')
    return { dollars: Number(dollars).toLocaleString(), cents }
  }

  const filteredRecords = walletRecords.filter(record =>
    record.ref.toLowerCase().includes(searchTerm.toLowerCase()) ||
    record.product.toLowerCase().includes(searchTerm.toLowerCase()) ||
    record.userEmail.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const balance = wallet ? formatBalance(wallet.balance) : { dollars: '0', cents: '00' }

  if (loading) {
    return (
      <div className="flex-1 bg-white p-8">
        <h1 className="text-2xl font-semibold text-gray-900 mb-6">Treasury Wallet</h1>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 bg-white p-8">
      {/* Treasury Wallet Heading */}
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">Treasury Wallet</h1>

      {error && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg mb-6">
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Balance Card */}
      <div className="bg-black rounded-lg p-8 mb-8 relative overflow-hidden">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-gray-400 text-sm mb-2">Available Balance</p>
            <div className="flex items-baseline gap-1">
              {showBalance ? (
                <>
                  <span className="text-white text-5xl font-semibold">$ {balance.dollars}</span>
                  <span className="text-white text-2xl">.{balance.cents}</span>
                </>
              ) : (
                <span className="text-white text-5xl font-semibold">$ ****.**</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => setShowBalance(!showBalance)} className="text-gray-400 hover:text-white transition-colors">
              {showBalance ? <FiEyeOff size={24} /> : <FiEye size={24} />}
            </button>
            <Button className="bg-[#8B7355] hover:bg-[#7A6449] text-white">Withdraw</Button>
          </div>
        </div>
      </div>

      {/* Wallet Record */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Wallet Record</h2>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            placeholder="Search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#8B7355] text-sm w-64"
          />
        </div>
      </div>

      {/* Records Table */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        {filteredRecords.length === 0 ? (
          <div className="text-center py-12 bg-gray-50">
            <p className="text-gray-500 text-sm">No transaction available yet</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-[#F5F5F5]">
              <tr>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-700">Amount</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-700">Ref</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-700">Timestamp</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-700">Fee</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-700">Product</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-700">Meta_Ref</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-700">User email</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-700">User Phone</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredRecords.map((record, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm text-gray-900">{record.amount}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <span>{record.ref}</span>
                      <button
                        onClick={() => handleCopyRef(record.ref)}
                        className="text-gray-400 hover:text-gray-600"
                        title="Copy reference"
                      >
                        <IoIosCopy size={16} />
                      </button>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{record.timestamp}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{record.fee}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{record.product}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <span>{record.metaRef}</span>
                      <button
                        onClick={() => handleCopyRef(record.metaRef)}
                        className="text-gray-400 hover:text-gray-600"
                        title="Copy reference"
                      >
                        <IoIosCopy size={16} />
                      </button>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{record.userEmail}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{record.userPhone}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
