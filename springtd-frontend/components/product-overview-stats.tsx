export default function ProductOverviewStats() {
  const stats = [
    { label: "Requested", value: "N5,000,000", subtext: "6 months" },
    { label: "Approved", value: "N4,000,000", subtext: "5 months" },
    { label: "Total Transactions", value: "N4,000,000", subtext: "5 months" },
    { label: "Total Savings", value: "N4,000,000", subtext: "5 months" },
    { label: "Total Interest", value: "N1,200,000", subtext: "7% monthly" },
  ]

  return (
    <div className="bg-gray-900 rounded-lg p-8 grid grid-cols-5 gap-8 mb-8">
      {stats.map((stat, index) => (
        <div key={index}>
          <p className="text-gray-400 text-sm mb-2">{stat.label}</p>
          <p className="text-white text-3xl font-bold mb-1">{stat.value}</p>
          <p className="text-gray-400 text-sm">{stat.subtext}</p>
        </div>
      ))}
    </div>
  )
}
