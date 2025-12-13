// Database types based on initWallerDb.sql schema

export interface Role {
  id: number;
  name: string;
}

export interface User {
  id: string;
  email: string;
  password: string;
  role_id: number;
  created_at: Date;
  updated_at: Date;
}

export interface TransactionStatus {
  id: number;
  name: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  tx_hash: string;
  amount?: number;
  from_address?: string;
  to_address?: string;
  status_id: number;
  created_at: Date;
  updated_at?: Date;
}

export interface TransactionMetadata {
  id: string;
  transaction_id: string;
  formed_at?: Date;
  signature?: string;
  extra_data?: Record<string, any>;
}

export interface NotificationType {
  id: number;
  name: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type_id: number;
  message?: string;
  read: boolean;
  created_at: Date;
}

export interface ActionType {
  id: number;
  name: string;
}

export interface UserLog {
  id: string;
  user_id: string;
  action_id: number;
  success: boolean;
  created_at: Date;
}

export interface Wallet {
  id: string;
  user_id: string;
  address: string;
  created_at: Date;
}

export interface Balance {
  id: string;
  wallet_id: string;
  amount: string;
  updated_at?: Date;
}

// Union types for database entities
export type DatabaseEntity =
  | Role
  | User
  | TransactionStatus
  | Transaction
  | TransactionMetadata
  | NotificationType
  | Notification
  | ActionType
  | UserLog
  | Wallet
  | Balance;

// Table name mapping
export const TABLE_NAMES = {
  ROLES: 'wallet.roles',
  USERS: 'wallet.users',
  TRANSACTION_STATUSES: 'wallet.transaction_statuses',
  TRANSACTIONS: 'wallet.transactions',
  TRANSACTION_METADATA: 'wallet.transaction_metadata',
  NOTIFICATION_TYPES: 'wallet.notification_types',
  NOTIFICATIONS: 'wallet.notifications',
  ACTION_TYPES: 'wallet.action_types',
  USER_LOGS: 'wallet.user_logs',
  WALLETS: 'wallet.wallets',
  BALANCES: 'wallet.balances',
} as const;
