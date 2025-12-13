// Transaction status enum matching smart contract
export enum TransactionStatus {
  PENDING = "PENDING",
  CONFIRMED = "CONFIRMED",
  FAILED = "FAILED",
  CANCELLED = "CANCELLED",
}

// Transaction interface matching database schema
export interface Transaction {
  id: string;
  userId: string;
  txHash: string;
  amount: string;
  fromAddress?: string;
  toAddress?: string;
  statusId: number;
  createdAt: string;
  updatedAt?: string;
  // Enhanced fields from smart contract
  status?: TransactionStatus;
  formedAt?: number;
  signature?: string;
  extraData?: object;
}

// Transaction metadata interface
export interface TransactionMetadata {
  id: string;
  transactionId: string;
  formedAt?: string;
  signature?: string;
  extraData?: object;
}

// Wallet interface
export interface Wallet {
  id: string;
  userId: string;
  address: string;
  createdAt: string;
  balance?: string;
}

// Balance interface
export interface Balance {
  id: string;
  walletId: string;
  amount: string;
  updatedAt: string;
}

// Transaction creation request
export interface CreateTransactionRequest {
  to: string;
  amount: string;
  formedAt?: number;
  signature?: string;
}

// Transaction response from API
export interface TransactionResponse {
  transaction: Transaction;
  message?: string;
}

// User transactions response
export interface UserTransactionsResponse {
  transactions: Transaction[];
  total: number;
}

// Wallet creation request
export interface CreateWalletRequest {
  address: string;
}

// Wallet balance response
export interface WalletBalanceResponse {
  balance: string;
  wallet: Wallet;
}

// User wallets response
export interface UserWalletsResponse {
  wallets: Wallet[];
  total: number;
}

// Send ether request with tracking
export interface SendEtherRequest {
  to: string;
  amountEther: string;
  signerId?: number;
}

// Send ether response with transaction tracking
export interface SendEtherResponse {
  txHash: string;
  status: TransactionStatus;
  message: string;
  transaction?: Transaction;
}
