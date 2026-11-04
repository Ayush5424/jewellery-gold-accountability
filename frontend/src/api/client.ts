import { AuthUser, Karigar, JobOrder, GoldLedgerEntry, LossAlert, StockSummary } from '../types';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

export function getAuthToken(): string | null {
  return localStorage.getItem('gold_auth_token');
}

export function setAuthToken(token: string | null) {
  if (token) {
    localStorage.setItem('gold_auth_token', token);
  } else {
    localStorage.removeItem('gold_auth_token');
  }
}

export function generateIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'req-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9);
}

// Tablet Offline / Pending Form Drafts LocalStorage Persistence
export function saveFormDraft(key: string, data: any) {
  try {
    localStorage.setItem(`draft_${key}`, JSON.stringify(data));
  } catch (e) {
    console.error('Failed to save draft', e);
  }
}

export function loadFormDraft<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(`draft_${key}`);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

export function clearFormDraft(key: string) {
  localStorage.removeItem(`draft_${key}`);
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorMessage = `HTTP Error ${response.status}: ${response.statusText}`;
    try {
      const errJson = await response.json();
      if (errJson.message) {
        errorMessage = errJson.message;
      }
    } catch (_) {}
    throw new Error(errorMessage);
  }

  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}

export const api = {
  // Auth
  login: (credentials: { username: string; password: string }) =>
    request<AuthUser>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    }),
  getMe: () => request<AuthUser>('/auth/me'),

  // Karigars
  getKarigars: () => request<Karigar[]>('/karigars'),
  getKarigarById: (id: number) => request<Karigar>(`/karigars/${id}`),
  createKarigar: (data: Partial<Karigar>) =>
    request<Karigar>('/karigars', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Jobs
  getJobs: (status?: string, karigarId?: number) => {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (karigarId) params.append('karigarId', karigarId.toString());
    const query = params.toString() ? `?${params.toString()}` : '';
    return request<JobOrder[]>(`/jobs${query}`);
  },
  getJobById: (id: number) => request<JobOrder>(`/jobs/${id}`),
  createJob: (data: any) =>
    request<JobOrder>('/jobs', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  markReadyForReconciliation: (jobId: number) =>
    request<JobOrder>(`/jobs/${jobId}/ready-for-reconciliation`, {
      method: 'POST',
    }),
  reconcileJob: (jobId: number) =>
    request<JobOrder>(`/jobs/${jobId}/reconcile`, {
      method: 'POST',
    }),
  reopenJob: (jobId: number, reason: string) =>
    request<JobOrder>(`/jobs/${jobId}/reopen`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),

  // Gold Ledger
  issueGold: (data: {
    jobId: number;
    grossWeight: number;
    purity: number;
    remarks?: string;
    aiExtracted?: boolean;
    idempotencyKey?: string;
  }) =>
    request<GoldLedgerEntry>('/issue', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  receiveGold: (data: {
    jobId: number;
    transactionType: string;
    grossWeight: number;
    purity: number;
    huid?: string;
    itemDescription?: string;
    remarks?: string;
    aiExtracted?: boolean;
    idempotencyKey?: string;
  }) =>
    request<GoldLedgerEntry>('/receive', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  reverseVoucher: (voucherNumber: string, reason: string) =>
    request<GoldLedgerEntry>('/ledger/reverse', {
      method: 'POST',
      body: JSON.stringify({ voucherNumber, reason }),
    }),

  getRecentLedger: () => request<GoldLedgerEntry[]>('/ledger'),
  getLedgerByJob: (jobId: number) => request<GoldLedgerEntry[]>(`/ledger/job/${jobId}`),
  getLedgerByKarigar: (karigarId: number) => request<GoldLedgerEntry[]>(`/ledger/karigar/${karigarId}`),

  // Loss Alerts
  getAlerts: (status?: string) => {
    const query = status ? `?status=${status}` : '';
    return request<LossAlert[]>(`/alerts${query}`);
  },
  reviewAlert: (alertId: number, status: string, financeNotes?: string) =>
    request<LossAlert>(`/alerts/${alertId}/review`, {
      method: 'POST',
      body: JSON.stringify({ status, financeNotes }),
    }),

  // Stock
  getStockSummary: () => request<StockSummary>('/stock/summary'),
  getStockStatement: (date?: string) => {
    const query = date ? `?date=${date}` : '';
    return request<any>(`/stock/statement${query}`);
  },
  getTallyExport: async (date?: string): Promise<string> => {
    const token = getAuthToken();
    const query = date ? `?date=${date}` : '';
    const res = await fetch(`${API_BASE}/stock/statement/tally-export${query}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) throw new Error('Failed to download Tally XML export');
    return res.text();
  },

  // AI Slip Reader
  extractSlip: async (file?: File, textHint?: string) => {
    const formData = new FormData();
    if (file) formData.append('file', file);
    if (textHint) formData.append('textHint', textHint);

    const token = getAuthToken();
    const res = await fetch(`${API_BASE}/ai/extract-slip`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });
    if (!res.ok) throw new Error('AI extraction service failed');
    return res.json();
  },
};
