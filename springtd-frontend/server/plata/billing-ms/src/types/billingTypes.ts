export enum BillingType {
  ONE_TIME = 'one-time',
  RECURRING = 'recurring'
}

// Interface for one-time billing based on requirements
export interface OneTimeBilling {
  amount: number; // a numeric value representing the billing amount
  type: 'one-time'; // should be set to the string literal "one-time"
  billingCycle: ''; // an empty string, indicating no recurring cycle
  billTo: string; // a user reference identifier
  billingFor: string; // a description field explaining what the billing is for
  billingTitle: string; // a name/title for this billing entry
}

// New interface for recurring billing based on your requirements
export interface RecurringBilling {
  id: string;
  amount: number; // How much to be billed
  billingType: BillingType;
  billingCycle: number; // 30 days
  billingTarget?: number; // This billing ID stops running when the target is met
  billingCount: number; // Count/every time
  billTo: string; // user_ref
  billingFor: string; // description
  billingTitle: string; // name this billing
  billingException?: {
    maxAttempts: number; // How many unsuccessful tries before the account is suspended
    currentAttempts: number; // Current count of failed attempts
  };
  status: 'active' | 'paused' | 'completed' | 'suspended' | 'cancelled';
  startDate: Date;
  nextBillingDate?: Date;
  endDate?: Date;
  totalBilled?: number; // Running total of amount billed
  createdAt: Date;
  updatedAt: Date;
}

export interface Invoice {
  id: string;
  merchantId: string;
  customerId?: string;
  amount: number;
  currency: string;
  items: InvoiceItem[];
  billingType: BillingType;
  status: 'draft' | 'pending' | 'paid' | 'overdue' | 'cancelled';
  dueDate?: Date;
  issuedDate: Date;
  paidDate?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface Payment {
  id: string;
  invoiceId?: string;
  merchantId: string;
  customerId?: string;
  amount: number;
  currency: string;
  billingType: BillingType;
  method: 'card' | 'bank_transfer' | 'paypal' | 'crypto';
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  transactionId?: string;
  processedAt?: Date;
  refundedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Subscription {
  id: string;
  merchantId: string;
  customerId: string;
  planId: string;
  amount: number;
  currency: string;
  billingType: BillingType;
  interval: 'day' | 'week' | 'month' | 'year';
  intervalCount: number;
  status: 'active' | 'paused' | 'cancelled' | 'expired';
  startDate: Date;
  endDate?: Date;
  nextBillingDate?: Date;
  trialEnd?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Transaction {
  id: string;
  merchantId: string;
  customerId?: string;
  amount: number;
  currency: string;
  billingType: BillingType;
  type: 'payment' | 'refund' | 'payout' | 'transfer';
  status: 'pending' | 'completed' | 'failed' | 'reversed';
  description?: string;
  referenceId?: string;
  createdAt: Date;
  updatedAt: Date;
}