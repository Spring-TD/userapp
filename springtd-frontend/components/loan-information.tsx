export function LoanInformation() {
  return (
    <div className="space-y-6">
      <div className="bg-gray-50 p-6 rounded-lg">
        <h3 className="text-sm font-bold text-gray-900 mb-4">Loan information</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <p className="text-xs text-gray-500 mb-1">Name</p>
            <p className="text-sm font-medium text-gray-900">Vera Chidi</p>
            <p className="text-xs text-gray-500 mt-4 mb-1">Type</p>
            <p className="text-sm font-medium text-gray-900">Mortgage Loan</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Name</p>
            <p className="text-sm font-medium text-gray-900">Adedayo Majek</p>
             <p className="text-xs text-gray-500 mt-4 mb-1">Type</p>
            <p className="text-sm font-medium text-gray-900">Mortgage Loan</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Name</p>
            <p className="text-sm font-medium text-gray-900">Vera Vera</p>
             <p className="text-xs text-gray-500 mt-4 mb-1">Type</p>
            <p className="text-sm font-medium text-gray-900">Mortgage Loan</p>
          </div>
        </div>
      </div>

      <div className="bg-gray-50 p-6 rounded-lg">
        <h3 className="text-sm font-bold text-gray-900 mb-4">Loan Tenure</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <p className="text-xs text-gray-500 mb-1">Tenure</p>
            <p className="text-sm font-medium text-gray-900">6 Months</p>
            <p className="text-xs text-gray-500 mt-4 mb-1">Repayment</p>
            <p className="text-sm font-medium text-gray-900">₦18,000,000.00</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Tenure</p>
            <p className="text-sm font-medium text-gray-900">6 Months</p>
            <p className="text-xs text-gray-500 mt-4 mb-1">Repayment</p>
            <p className="text-sm font-medium text-gray-900">₦18,000,000.00</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Tenure</p>
            <p className="text-sm font-medium text-gray-900">6 Months</p>
            <p className="text-xs text-gray-500 mt-4 mb-1">Repayment</p>
            <p className="text-sm font-medium text-gray-900">₦18,000,000.00</p>
          </div>
        </div>
      </div>

       <div className="bg-gray-50 p-6 rounded-lg">
        <h3 className="text-sm font-bold text-gray-900 mb-4">Loan Requirement</h3>
         {/* Placeholder as Image 2 cuts off */}
         <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
           <div>
             <p className="text-xs text-gray-500 mb-1">Name</p>
            <p className="text-sm font-medium text-gray-900">...</p>
           </div>
         </div>
      </div>
    </div>
  )
}
