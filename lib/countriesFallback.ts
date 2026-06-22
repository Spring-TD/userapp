import type { CountryOption } from "@/lib/countryApi"

/** Used when upstream country sources are unavailable (signup must still work). */
export const COUNTRIES_FALLBACK: CountryOption[] = [
  { code: "ng", name: "Nigeria", dialCode: "+234" },
  { code: "gh", name: "Ghana", dialCode: "+233" },
  { code: "ke", name: "Kenya", dialCode: "+254" },
  { code: "za", name: "South Africa", dialCode: "+27" },
  { code: "eg", name: "Egypt", dialCode: "+20" },
  { code: "us", name: "United States", dialCode: "+1" },
  { code: "gb", name: "United Kingdom", dialCode: "+44" },
  { code: "ca", name: "Canada", dialCode: "+1" },
  { code: "in", name: "India", dialCode: "+91" },
  { code: "ae", name: "United Arab Emirates", dialCode: "+971" },
]
