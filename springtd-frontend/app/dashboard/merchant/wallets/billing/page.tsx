import WalletBalanceCard from "@/components/wallet-balance-card"
import WalletRecordTable from "@/components/wallet-record-table"

export default function BillingWalletPage() {
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Billing Wallet</h1>
      <div className="mb-8">
        <WalletBalanceCard title="Billing Wallet" balance="$ 0.00.00" showFundButton={true} showWithdrawButton={true} />
      </div>
      <WalletRecordTable />
    </div>
  )
}
