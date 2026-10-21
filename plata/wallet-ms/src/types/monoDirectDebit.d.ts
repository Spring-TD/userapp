export type MonoMandateDebitType = 'fixed' | 'variable';
export type MonoMandateType = 'emandate' | 'sweep' | 'signed_mandate';
export type MonoFeeBearer = 'business' | 'customer';
export type MonoMandateStatus = 'initiated' | 'created' | 'approved' | 'ready' | 'rejected' | 'paused' | 'cancelled' | 'expired' | 'failed';
export type MonoDebitAttemptStatus = 'pending' | 'processing' | 'successful' | 'failed' | 'cancelled';
export interface MonoDirectDebitCustomer {
    id?: string;
    name?: string;
    email?: string;
    phone?: string;
    bvn?: string;
}
export interface MonoBeneficiaryAccount {
    nuban: string;
    nip_code: string;
}
export interface MonoDirectDebitMandate {
    id: string;
    applicationId: string;
    userId: string;
    merchantId: string;
    debitType: MonoMandateDebitType;
    mandateType: MonoMandateType;
    amountKobo: number;
    reference: string;
    status: MonoMandateStatus;
    readyToDebit: boolean;
    monoMandateId?: string;
    monoUrl?: string;
    nibssCode?: string;
    accountName?: string;
    accountNumber: string;
    bankCode: string;
    bankName?: string;
    customer?: MonoDirectDebitCustomer;
    description?: string;
    startDate: string;
    endDate: string;
    feeBearer?: MonoFeeBearer;
    redirectUrl?: string;
    schedule?: Record<string, unknown>;
    meta?: Record<string, unknown>;
    rawMonoResponse?: Record<string, unknown>;
    createdAt: Date;
    updatedAt: Date;
}
export interface CreateMonoMandateRequest {
    applicationId: string;
    userId: string;
    merchantId: string;
    debitType: MonoMandateDebitType;
    mandateType?: MonoMandateType;
    amountKobo: number;
    reference?: string;
    accountNumber: string;
    bankCode: string;
    accountName?: string;
    bankName?: string;
    customer?: MonoDirectDebitCustomer;
    description?: string;
    startDate: string;
    endDate: string;
    feeBearer?: MonoFeeBearer;
    redirectUrl?: string;
    schedule?: Record<string, unknown>;
    meta?: Record<string, unknown>;
    /** Use Mono's hosted mandate link flow (`/v2/payments/initiate`) instead of direct create. */
    useHostedLink?: boolean;
    /** Optional direct-create verification method, for enabled Mono accounts. */
    verificationMethod?: string;
}
export interface MonoBalanceInquiryResult {
    mandateId: string;
    monoMandateId: string;
    amountKobo?: number;
    sufficient?: boolean;
    balanceKobo?: number;
    rawResponse: Record<string, unknown>;
}
export interface InitiateMonoDebitRequest {
    amountKobo: number;
    reference?: string;
    narration: string;
    feeBearer?: MonoFeeBearer;
    beneficiary?: MonoBeneficiaryAccount;
    meta?: Record<string, unknown>;
    checkBalance?: boolean;
}
export interface MonoDebitAttempt {
    id: string;
    mandateId: string;
    monoMandateId: string;
    applicationId: string;
    userId: string;
    merchantId: string;
    amountKobo: number;
    reference: string;
    narration: string;
    status: MonoDebitAttemptStatus;
    feeBearer?: MonoFeeBearer;
    beneficiary?: MonoBeneficiaryAccount;
    balanceInquiry?: MonoBalanceInquiryResult;
    rawMonoResponse?: Record<string, unknown>;
    rawWebhookPayload?: Record<string, unknown>;
    failureReason?: string;
    createdAt: Date;
    updatedAt: Date;
}
export interface MonoDirectDebitWebhook {
    event?: string;
    event_id?: string;
    timestamp?: string;
    data?: Record<string, unknown>;
}
//# sourceMappingURL=monoDirectDebit.d.ts.map