import WalletBalanceCard from "@/components/wallet-balance-card"
import WalletRecordTable from "@/components/wallet-record-table"

export default function SettlementWalletPage() {
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Settlement Wallet</h1>
      <WalletBalanceCard title="Settlement Wallet" balance="$ 0.00.00" showFundButton={true} />
      <WalletRecordTable />
    </div>
  )
}
