/** Status counts for a customer's applications on one app (merchant dashboard). */
export interface ApplicationSummary {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  blacklisted: number;
}
