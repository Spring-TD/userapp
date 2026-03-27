"use client"
import { Drawer } from "@/components/drawer"

interface CreateProductDrawerProps {
  isOpen: boolean
  onClose: () => void
  onSelectProduct: (productType: string) => void
  accentColor?: string
  cardBgColor?: string
  cardHoverColor?: string
}

export default function CreateProductDrawer({ 
  isOpen, 
  onClose, 
  onSelectProduct,
  accentColor = "#9A813F",
  cardBgColor = "#F5F1E8",
  cardHoverColor = "#EBE5D6"
}: CreateProductDrawerProps) {
  const products = [
    {
      id: "loan",
      title: "Loan",
      description:
        "This feature allows you to set up loan products for your customers, define repayment terms, interest rates, and eligibility criteria, and manage them directly from your dashboard.",
    },
    {
      id: "mortgage",
      title: "Mortgage",
      description:
        "Easily create mortgage products that let customers finance property purchases. You can configure repayment schedules, interest structures, and manage long-term financing offerings in one place.",
    },
    {
      id: "savings",
      title: "Savings",
      description:
        "Offer tailored savings plans to your customers by setting interest rates, deposit requirements, and lock-in periods. This helps you attract and retain users looking to grow their funds securely.",
    },
    {
      id: "commodity",
      title: "Commodity",
      description:
        "Offer commodity products directly through your platform and manage them from your dashboard. Highlight opportunities, present details, and keep track of customer activity with ease.",
    },
    {
      id: "investment",
      title: "Investment",
      description:
        "Create investment products that enable customers to grow their wealth through managed portfolios, mutual funds, or custom investment plans with attractive returns.",
    },
  ]

  return (
    <Drawer
      open={isOpen}
      onOpenChange={onClose}
      title="Create Product"
      subtitle="Select the product option you want to create with us"
    >
      <div className="grid grid-cols-2 gap-4">
        {products.map((product) => (
          <button
            key={product.id}
            onClick={() => onSelectProduct(product.id)}
            className="rounded-lg p-6 text-left transition-colors"
            style={{ 
              backgroundColor: cardBgColor,
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = cardHoverColor}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = cardBgColor}
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{product.title}</h3>
            <p className="text-sm text-gray-600 leading-relaxed">{product.description}</p>
          </button>
        ))}
      </div>
    </Drawer>
  )
}
