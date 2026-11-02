export type UserRole = 'ROLE_ISSUE_CLERK' | 'ROLE_FINANCE_HEAD' | 'ROLE_KARIGAR';

export type JobStatus = 'OPEN' | 'IN_PROGRESS' | 'READY_FOR_RECONCILIATION' | 'RECONCILED';

export type TransactionType = 'ISSUE' | 'RECEIPT_JEWELLERY' | 'RECEIPT_SCRAP' | 'RECEIPT_FILINGS' | 'ADJUSTMENT_REVERSAL';

export type AlertType = 'EXCESS_OVER_ALLOWANCE' | 'HISTORICAL_DRIFT';

export type AlertStatus = 'PENDING_REVIEW' | 'REVIEWED_APPROVED' | 'ESCALATED';

export type ItemCategory = 'BANGLES' | 'CHAIN' | 'NECKLACE' | 'RING' | 'EARRINGS' | 'TEMPLE_JEWELLERY' | 'COIN_BAR';

export interface AuthUser {
  token: string | null;
  username: string;
  fullName: string;
  role: UserRole;
  karigarId: number | null;
}

export interface Karigar {
  id: number;
  karigarCode: string;
  name: string;
  phone: string;
  workshopLocation: string;
  historicalLossAvgPct: number;
  completedJobsCount: number;
  active: boolean;
  username: string;
  createdAt: string;
}

export interface JobOrder {
  id: number;
  jobCode: string;
  karigar: Karigar;
  itemCategory: ItemCategory;
  description: string;
  status: JobStatus;
  allowedWastagePercent: number;
  issuedFineWeight: number;
  recoveredFineWeight: number;
  outstandingFineWeight: number;
  actualLoss?: number;
  excessLoss?: number;
  actualLossPct?: number;
  reconciledAt?: string;
  reconciledBy?: string;
  createdAt: string;
}

export interface GoldLedgerEntry {
  id: number;
  voucherNumber: string;
  transactionType: TransactionType;
  jobOrder?: JobOrder;
  karigar: Karigar;
  grossWeight: number;
  purity: number;
  fineWeight: number;
  huid?: string;
  itemDescription?: string;
  remarks?: string;
  isReversal: boolean;
  reversalOfVoucher?: string;
  aiExtracted: boolean;
  idempotencyKey?: string;
  createdBy: string;
  createdAt: string;
}

export interface LossAlert {
  id: number;
  jobOrder: JobOrder;
  karigar: Karigar;
  alertType: AlertType;
  actualLoss: number;
  allowedLoss: number;
  excessLoss: number;
  actualLossPct: number;
  allowedLossPct: number;
  historicalBaselinePct?: number;
  reason: string;
  status: AlertStatus;
  financeNotes?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt: string;
}

export interface StockSummary {
  vaultFineGold: number;
  goldWithKarigars: number;
  goldAtRefiner: number;
  totalTrackedFineGold: number;
  pendingAlertsCount: number;
  totalIssuedFine: number;
  totalRecoveredFine: number;
}
