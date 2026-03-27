"use client"

import { Drawer } from "@/components/drawer"
import { CreditCard, PiggyBank, Home, Coins } from "lucide-react"

interface NewApplicationDrawerProps {
    isOpen: boolean
    onClose: () => void
    onSelectType: (type: "loan" | "savings" | "mortgage" | "commodity") => void
}

interface ApplicationTypeCard {
    type: "loan" | "savings" | "mortgage" | "commodity"
    title: string
    subtitle: string
    icon: React.ReactNode
    gradient: string
    iconBg: string
}

const APPLICATION_TYPES: ApplicationTypeCard[] = [
    {
        type: "loan",
        title: "Apply for Loan",
        subtitle: "Get quick access to personal or business loans with competitive interest rates",
        icon: <CreditCard className="h-6 w-6 text-white" />,
        gradient: "from-gray-800 to-black",
        iconBg: "bg-black",
    },
    {
        type: "savings",
        title: "Open Savings Account",
        subtitle: "Start saving with high-yield savings accounts and fixed deposits",
        icon: <PiggyBank className="h-6 w-6 text-white" />,
        gradient: "from-gray-800 to-black",
        iconBg: "bg-black",
    },
    {
        type: "mortgage",
        title: "Apply for Mortgage",
        subtitle: "Finance your dream home or commercial property with flexible terms",
        icon: <Home className="h-6 w-6 text-white" />,
        gradient: "from-gray-800 to-black",
        iconBg: "bg-black",
    },
    {
        type: "commodity",
        title: "Purchase Commodity",
        subtitle: "Invest in gold, silver, and other precious commodities",
        icon: <Coins className="h-6 w-6 text-white" />,
        gradient: "from-gray-800 to-black",
        iconBg: "bg-black",
    },
]

export default function NewApplicationDrawer({
    isOpen,
    onClose,
    onSelectType,
}: NewApplicationDrawerProps) {
    const handleSelectType = (type: "loan" | "savings" | "mortgage" | "commodity") => {
        onClose()
        // Small delay to allow drawer transition
        setTimeout(() => {
            onSelectType(type)
        }, 200)
    }

    return (
        <Drawer
            open={isOpen}
            onOpenChange={onClose}
            title="New Application"
            subtitle="Choose the type of financial product you'd like to apply for"
        >
            <div className="space-y-4 mt-6">
                {APPLICATION_TYPES.map((item) => (
                    <button
                        key={item.type}
                        onClick={() => handleSelectType(item.type)}
                        className="w-full group"
                    >
                        <div className="relative overflow-hidden rounded-xl border border-gray-200 bg-white p-5 transition-all duration-300 ease-out hover:border-transparent hover:shadow-xl hover:shadow-gray-200/50 hover:-translate-y-1">
                            {/* Gradient hover effect */}
                            <div className={`absolute inset-0 bg-gradient-to-r ${item.gradient} opacity-0 group-hover:opacity-[0.03] transition-opacity duration-300`} />

                            <div className="relative flex items-start gap-4">
                                {/* Icon */}
                                <div className={`flex-shrink-0 w-12 h-12 rounded-xl ${item.iconBg} flex items-center justify-center shadow-lg shadow-black/20 transition-transform group-hover:scale-110`}>
                                    {item.icon}
                                </div>

                                {/* Content */}
                                <div className="flex-1 text-left min-w-0">
                                    <h3 className="font-semibold text-gray-900 mb-1 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-gray-900 group-hover:to-gray-600 transition-all">
                                        {item.title}
                                    </h3>
                                    <p className="text-sm text-gray-500 leading-relaxed">
                                        {item.subtitle}
                                    </p>
                                </div>

                                {/* Arrow */}
                                <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 group-hover:bg-gray-900 transition-all duration-300">
                                    <svg
                                        className="w-4 h-4 text-gray-400 group-hover:text-white transition-colors"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                </div>
                            </div>
                        </div>
                    </button>
                ))}
            </div>

            {/* Bottom decoration */}
            <div className="mt-8 pt-6 border-t border-gray-100">
                <p className="text-xs text-gray-400 text-center">
                    Need help choosing? Contact our support team for personalized recommendations.
                </p>
            </div>
        </Drawer>
    )
}
