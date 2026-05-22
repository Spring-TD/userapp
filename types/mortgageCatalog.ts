export type EnsureMortgageAccountResult = {
  ok: boolean
  accountCreated: boolean
  accountId?: string
  message?: string
  error?: string
}
