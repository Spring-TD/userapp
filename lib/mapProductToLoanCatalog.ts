import type { MobileProduct } from "@/lib/storefrontProducts"
import type { LoanCatalogItem } from "@/types/loanCatalog"

function formatNgnAmount(value: number | undefined): string {
  if (value == null || Number.isNaN(value)) return "NGN—"
  return `NGN${value.toLocaleString("en-NG")}`
}

function formatPlainAmount(value: number | undefined): string {
  if (value == null || Number.isNaN(value)) return "—"
  return value.toLocaleString("en-NG")
}

export function mapMobileProductToLoanCatalog(
  product: MobileProduct,
  providerName = "AG Mortgage Bank",
): LoanCatalogItem {
  const maxLoan = product.propertyValue
  return {
    id: product.id,
    providerName,
    providerLogoUrl: product.image,
    imageUrl: product.image,
    title: product.name,
    amountDisplay: formatNgnAmount(maxLoan),
    loanAmountDisplay: formatPlainAmount(maxLoan),
    loanAmountLabel: "Loan Amount",
    description:
      product.description ||
      "Flexible repayment terms designed for business owners who need working capital.",
    duration: product.duration || "12 months",
    interestRate: product.interestRate
      ? product.interestRate.includes("%")
        ? `${product.interestRate} p.a`
        : `${product.interestRate}% p.a`
      : "14% p.a",
  }
}
