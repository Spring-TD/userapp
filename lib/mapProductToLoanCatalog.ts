import { poweredBy } from "@/lib/mobileProductDetailDisplay"
import type { MobileProduct } from "@/lib/storefrontProducts"
import type { LoanCatalogItem } from "@/types/loanCatalog"

function formatNgnAmount(value: number | undefined): string {
  if (value == null || Number.isNaN(value)) return "NGN—"
  return `NGN${value.toLocaleString("en-NG")}`
}

function formatPlainAmount(value: number | undefined): string | null {
  if (value == null || Number.isNaN(value)) return null
  return value.toLocaleString("en-NG")
}

function amountRange(product: MobileProduct): { formatted: string; plain: string } {
  const min = formatNgnAmount(product.amountMin)
  const max = formatNgnAmount(product.amountMax)
  const plainMin = formatPlainAmount(product.amountMin)
  const plainMax = formatPlainAmount(product.amountMax)

  if (product.amountMin != null && product.amountMax != null) {
    return {
      formatted: `${min} - ${max}`,
      plain: `${plainMin} - ${plainMax}`,
    }
  }

  const single = product.amountMax ?? product.amountMin ?? product.propertyValue
  return {
    formatted: formatNgnAmount(single),
    plain: formatPlainAmount(single) ?? "—",
  }
}

export function mapMobileProductToLoanCatalog(
  product: MobileProduct,
  providerName = poweredBy(),
): LoanCatalogItem {
  const amount = amountRange(product)
  return {
    id: product.id,
    providerName,
    providerLogoUrl: product.image,
    imageUrl: product.image,
    title: product.name,
    amountDisplay: amount.formatted,
    loanAmountDisplay: amount.plain,
    loanAmountLabel: "Loan Amount",
    description: product.description,
    duration: product.duration || "—",
    interestRate: product.interestRate
      ? product.interestRate.includes("%")
        ? `${product.interestRate} p.a`
        : `${product.interestRate}% p.a`
      : "—",
  }
}
