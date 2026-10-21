/**
 * Plata RBAC permission codes for wallet-ms (aligned with client-auth-ms).
 */
export const Permission = {
  VIEW_WALLET_BALANCES: 'view_wallet_balances',
  VIEW_TRANSACTION_LEDGER: 'view_transaction_ledger',
  RECONCILE_LEDGER: 'reconcile_ledger',
  FLAG_LEDGER_DISCREPANCIES: 'flag_ledger_discrepancies',
  VIEW_PAYOUT_HISTORY: 'view_payout_history',
  INITIATE_PAYOUT: 'initiate_payout',
  APPROVE_PAYOUT: 'approve_payout',
  MANAGE_SYSTEM_SETTINGS: 'manage_system_settings'
} as const;

export function actorHasAnyPermission(
  actorPermissions: string[] | undefined,
  isOwner: boolean | undefined,
  required: string | string[]
): boolean {
  if (isOwner) return true;
  const needed = Array.isArray(required) ? required : [required];
  const set = new Set((actorPermissions || []).map(String));
  return needed.some((p) => set.has(p));
}
