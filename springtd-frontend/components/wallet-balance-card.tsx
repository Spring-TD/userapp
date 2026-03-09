import { Button } from "@/components/ui/button"
import { Eye } from "lucide-react"

interface WalletBalanceCardProps {
  title: string
  balance: string
  showFundButton?: boolean
  showWithdrawButton?: boolean
}

export default function WalletBalanceCard({
  title,
  balance,
  showFundButton = false,
  showWithdrawButton = false,
}: WalletBalanceCardProps) {
  return (
    <div className="bg-gradient-to-r from-[#7C3AED] to-[#9333EA] rounded-lg p-8 text-white">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-purple-100 mb-2">Available Balance</p>
          <h2 className="text-5xl font-bold tracking-tight">{balance}</h2>
        </div>

        <div className="flex items-center gap-8">
          <button className="bg-white/10 p-2 rounded-lg hover:bg-white/20 transition-colors">
            <div className="relative">
               <Eye size={24} />
               <div className="absolute top-1/2 left-0 w-full h-0.5 bg-white transform -rotate-45 origin-center"></div>
            </div>
          </button>

          <div className="flex items-center gap-4">
            {showFundButton && (
              <Button className="bg-white text-gray-900 hover:bg-gray-100 font-semibold px-6">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Fund
              </Button>
            )}

            {showWithdrawButton && (
              <Button variant="outline" className="bg-transparent border-white text-white hover:bg-white/10 font-semibold px-6">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                  />
                </svg>
                Withdraw
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
