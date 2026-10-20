import { fetchOptionLabels, fetchProductOptionLabels } from "@/lib/productOptions"
import { DEFAULT_REPAYMENT_WORKFLOWS } from "@/components/drawers/product-config-form-fields"

export type LoanConfigurePrefetched = {
  tenure: string[]
  interestMethods: string[]
  moratoriumType: string[]
  repaymentSchedule: string[]
  amortizationSchedule: string[]
  repaymentFrequency: string[]
  acceptableNpa: string[]
  equityRequirement: string[]
  otherRequirementType: string[]
  requirementContentType: string[]
  securities: string[]
  feeType: string[]
  penaltyType: string[]
  repaymentWorkflow: string[]
}

export async function prefetchLoanConfigureOptions(): Promise<LoanConfigurePrefetched> {
  const [
    tenure,
    interestMethods,
    moratoriumType,
    repaymentSchedule,
    amortizationSchedule,
    repaymentFrequency,
    acceptableNpa,
    equityRequirement,
    otherRequirementType,
    requirementContentType,
    securities,
    feeType,
    penaltyType,
    repaymentWorkflow,
  ] = await Promise.all([
    fetchOptionLabels("loan-tenure", []),
    fetchProductOptionLabels("interest-method", []),
    fetchOptionLabels("moratorium-type", []),
    fetchOptionLabels("repayment-schedule", []),
    fetchOptionLabels("amortization", []),
    fetchOptionLabels("repayment-cycle", []),
    fetchOptionLabels("acceptable-npa", []),
    fetchOptionLabels("equity-requirement", []),
    fetchProductOptionLabels("loan-other-requirement-type", []),
    fetchProductOptionLabels("loan-other-requirement-content-type", []),
    fetchProductOptionLabels("security-requirements", [], { productType: "LOAN" }),
    fetchOptionLabels("fee-type", []),
    fetchOptionLabels("penalty-type", []),
    fetchOptionLabels("repayment-workflow", [...DEFAULT_REPAYMENT_WORKFLOWS]),
  ])

  return {
    tenure,
    interestMethods,
    moratoriumType,
    repaymentSchedule,
    amortizationSchedule,
    repaymentFrequency,
    acceptableNpa,
    equityRequirement,
    otherRequirementType,
    requirementContentType,
    securities,
    feeType,
    penaltyType,
    repaymentWorkflow,
  }
}

const MORTGAGE_DEFAULTS = {
  tenure: [] as string[],
  interestMethods: [] as string[],
  moratoriumType: [] as string[],
  moratoriumDuration: [] as string[],
  repaymentSchedule: [] as string[],
  amortizationSchedule: [] as string[],
  repaymentFrequency: [] as string[],
  acceptableNpa: [] as string[],
  equityRequirement: [] as string[],
  otherRequirementType: [] as string[],
  requirementContentType: [] as string[],
  feeType: [] as string[],
  penaltyType: [] as string[],
  triggerDuration: [] as string[],
}

export type MortgageConfigurePrefetched = {
  tenure: string[]
  interestMethods: string[]
  moratoriumType: string[]
  moratoriumDuration: string[]
  repaymentSchedule: string[]
  amortizationSchedule: string[]
  repaymentFrequency: string[]
  acceptableNpa: string[]
  equityRequirement: string[]
  otherRequirementType: string[]
  requirementContentType: string[]
  feeType: string[]
  penaltyType: string[]
  triggerDuration: string[]
  securities: string[]
  propertyTypes: string[]
  repaymentWorkflow: string[]
}

export async function prefetchMortgageConfigureOptions(): Promise<MortgageConfigurePrefetched> {
  const [
    tenure,
    interestMethods,
    moratoriumType,
    moratoriumDuration,
    repaymentSchedule,
    amortizationSchedule,
    repaymentFrequency,
    acceptableNpa,
    equityRequirement,
    otherRequirementType,
    requirementContentType,
    securities,
    propertyTypes,
    feeType,
    penaltyType,
    triggerDuration,
    repaymentWorkflow,
  ] = await Promise.all([
    fetchOptionLabels("loan-tenure", MORTGAGE_DEFAULTS.tenure),
    fetchProductOptionLabels("interest-method", MORTGAGE_DEFAULTS.interestMethods),
    fetchProductOptionLabels("moratorium", MORTGAGE_DEFAULTS.moratoriumType),
    fetchProductOptionLabels("moratorium-duration", MORTGAGE_DEFAULTS.moratoriumDuration),
    fetchOptionLabels("repayment-schedule", MORTGAGE_DEFAULTS.repaymentSchedule),
    fetchOptionLabels("amortization", MORTGAGE_DEFAULTS.amortizationSchedule),
    fetchOptionLabels("repayment-cycle", MORTGAGE_DEFAULTS.repaymentFrequency),
    fetchOptionLabels("acceptable-npa", MORTGAGE_DEFAULTS.acceptableNpa),
    fetchOptionLabels("equity-requirement", MORTGAGE_DEFAULTS.equityRequirement),
    fetchProductOptionLabels("loan-other-requirement-type", MORTGAGE_DEFAULTS.otherRequirementType),
    fetchProductOptionLabels("loan-other-requirement-content-type", MORTGAGE_DEFAULTS.requirementContentType),
    fetchProductOptionLabels("security-requirements", [], { productType: "MORTGAGE" }),
    fetchProductOptionLabels("property-type", []),
    fetchOptionLabels("fee-type", MORTGAGE_DEFAULTS.feeType),
    fetchOptionLabels("penalty-type", MORTGAGE_DEFAULTS.penaltyType),
    fetchProductOptionLabels("trigger-duration", MORTGAGE_DEFAULTS.triggerDuration),
    fetchOptionLabels("repayment-workflow", [...DEFAULT_REPAYMENT_WORKFLOWS]),
  ])

  return {
    tenure,
    interestMethods,
    moratoriumType,
    moratoriumDuration,
    repaymentSchedule,
    amortizationSchedule,
    repaymentFrequency,
    acceptableNpa,
    equityRequirement,
    otherRequirementType,
    requirementContentType,
    securities,
    propertyTypes,
    feeType,
    penaltyType,
    triggerDuration,
    repaymentWorkflow,
  }
}

export type SavingsConfigurePrefetched = {
  duration: string[]
  interestMethods: string[]
  savingsTypes: string[]
  withdrawalFlexibility: string[]
  feeType: string[]
  penaltyType: string[]
  triggerDuration: string[]
}

async function fetchSavingsTenure(): Promise<string[]> {
  try {
    const tenureRes = await fetch("/api/configurations/options/savings-tenure", { credentials: "include", cache: "no-store" })
    const tenureJson = await tenureRes.json().catch(() => ({}))
    const tenureList = (tenureJson?.data ?? []) as { value?: string | number; label?: string }[]
    return Array.isArray(tenureList) && tenureList.length
      ? tenureList.map((x) => x.label || String(x.value ?? "")).filter((v): v is string => typeof v === "string" && v.length > 0)
      : []
  } catch {
    return []
  }
}

export async function prefetchSavingsConfigureOptions(): Promise<SavingsConfigurePrefetched> {
  const duration = await fetchSavingsTenure()
  const [interestMethods, savingsTypes, withdrawalFlexibility, feeTypes, penaltyTypes, triggerDuration] = await Promise.all([
    fetchOptionLabels("savings-interest-method", []),
    fetchOptionLabels("savings-type", []),
    fetchOptionLabels("withdrawal-flexibility", []),
    fetchOptionLabels("fee-type", []),
    fetchOptionLabels("penalty-type", []),
    fetchProductOptionLabels("trigger-duration", []),
  ])
  return {
    duration,
    interestMethods,
    savingsTypes,
    withdrawalFlexibility,
    feeType: feeTypes,
    penaltyType: penaltyTypes,
    triggerDuration,
  }
}

export type CommodityConfigurePrefetched = {
  tenure: string[]
  yieldMethod: string[]
  withdrawalFlexibility: string[]
  feeType: string[]
  penaltyType: string[]
  triggerDuration: string[]
}

export async function prefetchCommodityConfigureOptions(isInvestment: boolean): Promise<CommodityConfigurePrefetched> {
  const tenureUrl = isInvestment
    ? "/api/configurations/options/investment-tenure"
    : "/api/configurations/options/commodity-tenure"
  let tenure: string[] = []
  try {
    const res = await fetch(tenureUrl, { credentials: "include", cache: "no-store" })
    const json = await res.json().catch(() => ({}))
    const list = (json?.data ?? []) as { value?: string; label?: string }[]
    tenure =
      Array.isArray(list) && list.length
        ? list.map((x) => x.label || x.value).filter((v): v is string => typeof v === "string" && v.length > 0)
        : []
  } catch {
    tenure = []
  }

  const [withdrawalFlexibility, feeTypes, penaltyTypes, triggerDuration, yieldMethod] = await Promise.all([
    fetchOptionLabels("withdrawal-flexibility", []),
    fetchOptionLabels("fee-type", []),
    fetchOptionLabels("penalty-type", []),
    fetchProductOptionLabels("trigger-duration", []),
    fetchOptionLabels(isInvestment ? "investment-trading-cycle" : "commodity-trading-cycle", []),
  ])

  return {
    tenure,
    yieldMethod,
    withdrawalFlexibility,
    feeType: feeTypes,
    penaltyType: penaltyTypes,
    triggerDuration,
  }
}
