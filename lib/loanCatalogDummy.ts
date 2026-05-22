import type { LoanCatalogItem } from "@/types/loanCatalog"

/** Placeholder catalog until API rows are mapped — matches product design mock. */
export const DUMMY_FEATURED_LOAN: LoanCatalogItem = {
  id: "dummy-featured-loan",
  providerName: "Accion Bank",
  providerLogoUrl:
    "https://images.unsplash.com/photo-1486406146926-c627a92fd1ab?q=80&w=200&auto=format&fit=crop",
  loanAmountLabel: "Loan Amount",
  loanAmountDisplay: "2,000,000",
  duration: "12 months",
  interestRate: "14% p.a",
  description:
    "This is a 12 month loan for business owners who need a revolving capital for their business",
  imageUrl:
    "https://images.unsplash.com/photo-1560518883-ce09059eeffa?q=80&w=1200&auto=format&fit=crop",
  title: "Business Loan",
  amountDisplay: "NGN2,000,000",
}

export const DUMMY_HOT_LOANS: LoanCatalogItem[] = [
  {
    id: "dummy-hot-accion",
    providerName: "Accion Bank",
    providerLogoUrl:
      "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?q=80&w=400&auto=format&fit=crop",
    imageUrl:
      "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?q=80&w=800&auto=format&fit=crop",
    title: "Business Loan",
    amountDisplay: "NGN122,000,000",
    description:
      "World's top marketer by Forbes, Entrepreneur and Inc Magazines; Writer for Time Magazine with …",
    duration: "12 months",
    interestRate: "3% p.a",
    loanAmountDisplay: "122,000,000",
  },
  {
    id: "dummy-hot-ag",
    providerName: "Spring Loan Bank",
    providerLogoUrl:
      "https://images.unsplash.com/photo-1486406146926-c627a92fd1ab?q=80&w=200&auto=format&fit=crop",
    imageUrl:
      "https://images.unsplash.com/photo-1560518883-ce09059eeffa?q=80&w=800&auto=format&fit=crop",
    title: "Business Loan",
    amountDisplay: "NGN122,000,000",
    description:
      "World's top marketer by Forbes, Entrepreneur and Inc Magazines; Writer for Time Magazine with …",
    duration: "12 months",
    interestRate: "3% p.a",
    loanAmountDisplay: "122,000,000",
  },
]

export function getDummyLoanById(id: string): LoanCatalogItem | undefined {
  return [DUMMY_FEATURED_LOAN, ...DUMMY_HOT_LOANS].find((loan) => loan.id === id)
}
