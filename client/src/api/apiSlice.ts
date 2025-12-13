import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { API_URL } from "./interceptor";

export interface LoginResponse {
  user: {
    email: string;
    role_id: number;
  };
  accessToken: string;
  refreshToken: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface CreateUserRequest {
  email: string;
  password: string;
}

export interface CreateUserResponse {
  dontExist: boolean;
}

export interface TransactionData {
  to: string;
  amount: string;
  formedAt?: number;
  signature?: string;
}

export interface SendEtherData {
  to: string;
  amountEther: string;
  signerId?: string;
}

export const apiSlice = createApi({
  reducerPath: "api",
  baseQuery: fetchBaseQuery({
    baseUrl: API_URL,
    credentials: "include",
    prepareHeaders: (headers, { getState }) => {
      headers.set("Content-Type", "application/json");
      // Add any headers if needed
      return headers;
    },
  }),
  tagTypes: ["User", "Transaction", "Wallet"],
  endpoints: (builder) => ({
    // Auth endpoints
    login: builder.mutation<LoginResponse, LoginRequest>({
      query: (credentials) => ({
        url: "/auth/login",
        method: "POST",
        body: credentials,
      }),
      transformResponse: (response: LoginResponse) => {
        // Set cookies after successful login
        const cookieHeaders = `Path=/; SameSite=Strict${
          window.location.protocol === "https:" ? "; Secure" : ""
        }`;
        document.cookie = `accessToken=${response.accessToken}; ${cookieHeaders}`;
        document.cookie = `refreshToken=${response.refreshToken}; ${cookieHeaders}`;
        return response;
      },
    }),
    refreshToken: builder.mutation<{ accessToken: string }, void>({
      query: () => ({
        url: "/auth/token",
        method: "POST",
      }),
      transformResponse: (response: { accessToken: string }) => {
        // Update access token cookie
        const cookieAttributes = `Path=/; SameSite=Strict${
          window.location.protocol === "https:" ? "; Secure" : ""
        }`;
        document.cookie = `accessToken=${response.accessToken}; ${cookieAttributes}`;
        return response;
      },
    }),

    // User endpoints
    createUser: builder.mutation<CreateUserResponse, CreateUserRequest>({
      query: (userData: CreateUserRequest) => ({
        url: "/users/create",
        method: "POST",
        body: userData,
      }),
    }),

    // Blockchain endpoints
    getPublicKeys: builder.query<string[], void>({
      query: () => "/blockchain/publicKeys",
      transformResponse: (response: { publicKeys: string[] }) =>
        response.publicKeys,
    }),

    // Transaction endpoints
    createTransaction: builder.mutation<any, TransactionData>({
      query: (txData: TransactionData) => ({
        url: "/blockchain/createTransaction",
        method: "POST",
        body: txData,
      }),
    }),
    confirmTransaction: builder.mutation<any, { txHash: string }>({
      query: ({ txHash }: { txHash: string }) => ({
        url: "/blockchain/confirmTransaction",
        method: "POST",
        body: { txHash },
      }),
    }),
    getTransaction: builder.query<any, string>({
      query: (txHash: string) => `/blockchain/transaction/${txHash}`,
    }),
    getUserTransactions: builder.query<any[], void>({
      query: () => "/blockchain/user/transactions",
      transformResponse: (response: { transactions: any[] }) =>
        response.transactions,
      providesTags: ["Transaction"],
    }),
    sendEtherWithTracking: builder.mutation<any, SendEtherData>({
      query: (txData: SendEtherData) => ({
        url: "/blockchain/sendEther",
        method: "POST",
        body: txData,
      }),
    }),
    getTransactionStatuses: builder.query<any[], void>({
      query: () => "/blockchain/transaction-statuses",
      transformResponse: (response: { statuses: any[] }) => response.statuses,
    }),

    // Wallet endpoints
    createWallet: builder.mutation<any, { address: string }>({
      query: ({ address }: { address: string }) => ({
        url: "/blockchain/createWallet",
        method: "POST",
        body: { address },
      }),
      invalidatesTags: ["Wallet"],
    }),
    getWalletBalance: builder.query<string, string>({
      query: (address: string) => `/blockchain/wallet/${address}/balance`,
      transformResponse: (response: { balance: string }) => response.balance,
    }),
    getUserWallets: builder.query<any[], void>({
      query: () => "/blockchain/user/wallets",
      transformResponse: (response: { wallets: any[] }) => response.wallets,
      providesTags: ["Wallet"],
    }),
  }),
});

export const {
  useLoginMutation,
  useRefreshTokenMutation,
  useCreateUserMutation,
  useGetPublicKeysQuery,
  useCreateTransactionMutation,
  useConfirmTransactionMutation,
  useGetTransactionQuery,
  useGetUserTransactionsQuery,
  useSendEtherWithTrackingMutation,
  useGetTransactionStatusesQuery,
  useCreateWalletMutation,
  useGetWalletBalanceQuery,
  useGetUserWalletsQuery,
} = apiSlice;
