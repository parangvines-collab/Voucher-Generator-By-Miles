export interface UserData {
  password?: string;
  expiration?: string; // YYYY-MM-DD
  balance?: number;
  lastSeen?: string;
}

export type UserDatabase = Record<string, UserData>;

export interface ActivityLog {
  id: string;
  type: string;
  user: string;
  description: string;
  details: Record<string, any>;
  timestamp: string;
}

export interface CashInRequest {
  username: string;
  refNumber: string;
  amount: number;
  status: 'pending' | 'approved' | 'denied';
  date: string;
  approvedAmount?: number;
}

export interface PortalKeyRequest {
  username: string;
  serialNumber: string;
  portalKey: string;
  status: 'approved';
  date: string;
}

export interface PortalKeyRecord {
  code: string;
  serial: string;
  date: string;
}

export interface PromoHistoryItem {
  username: string;
  price: number;
  date: string;
}

export interface Voucher {
  code: string;
  amount: number;
  validity: number; // minutes
  time: number; // minutes
  profile: string;
}

export type VoucherTemplate = 'template1' | 'template2' | 'template3';
