import { BadRequestException, Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DatabaseService } from '../database/database.service';
import { ethers } from 'ethers';
import * as LockContract from '@contracts/Lock.sol/Lock.json';
import * as ContractAddress from '@ignition/deployments/chain-31337/deployed_addresses.json';
import { SendEtherDto } from './schemas/send-ether.schema';

interface TransactionStatus {
  id: number;
  name: string;
}

interface NotificationType {
  id: number;
  name: string;
}

interface ActionType {
  id: number;
  name: string;
}

interface Wallet {
  id: string;
  user_id: string;
  address: string;
  created_at: Date;
}

@Injectable()
export class BlockchainService implements OnModuleInit {
  private provider: ethers.JsonRpcProvider;
  private contract: ethers.Contract;
  private ownerKey: string;

  constructor(
    private configService: ConfigService,
    private readonly db: DatabaseService,
  ) {}

  async onModuleInit() {
    this.ownerKey = this.configService.get<string>('OWNER_KEY') ?? '';
    const rpcUrl = this.configService.get<string>('RPC_URL');
    this.provider = new ethers.JsonRpcProvider(rpcUrl);

    await this.initializeBlockchain();
    await this.initializeDatabaseData();
  }

  private async initializeBlockchain() {
    try {
      const owner = new ethers.Wallet(this.ownerKey, this.provider);

      this.contract = new ethers.Contract(
        ContractAddress['LockModule#Lock'],
        LockContract.abi,
        owner,
      );

      // Test connection
      await this.provider.getNetwork();
      console.log('Successfully connected to blockchain');
    } catch (error) {
      console.warn(
        'Blockchain connection failed, continuing without blockchain functionality:',
        error,
      );
      // Continue without blockchain - user auth will still work
    }
  }

  private async initializeDatabaseData() {
    try {
      // Initialize transaction statuses
      const transactionStatuses = [
        'PENDING',
        'CONFIRMED',
        'COMPLETED',
        'FAILED',
      ];
      for (const status of transactionStatuses) {
        const existingStatus = await this.db.findOne(
          'wallet.transaction_statuses',
          {
            name: status,
          },
        );
        if (!existingStatus) {
          await this.db.insert('wallet.transaction_statuses', { name: status });
        }
      }

      // Initialize notification types
      const notificationTypes = ['SYSTEM', 'TRANSACTION', 'WALLET'];
      for (const type of notificationTypes) {
        const existingType = await this.db.findOne(
          'wallet.notification_types',
          {
            name: type,
          },
        );
        if (!existingType) {
          await this.db.insert('wallet.notification_types', { name: type });
        }
      }

      // Initialize action types
      const actionTypes = [
        'LOGIN',
        'LOGOUT',
        'TRANSACTION',
        'WALLET_CREATE',
        'WALLET_DELETE',
      ];
      for (const type of actionTypes) {
        const existingType = await this.db.findOne('wallet.action_types', {
          name: type,
        });
        if (!existingType) {
          await this.db.insert('wallet.action_types', { name: type });
        }
      }

      // Initialize roles
      const roles = ['ADMIN', 'USER'];
      for (const role of roles) {
        const existingRole = await this.db.findOne('wallet.roles', {
          name: role,
        });
        if (!existingRole) {
          await this.db.insert('wallet.roles', { name: role });
        }
      }

      console.log('Database initialization completed successfully');
    } catch (error) {
      console.error('Error during database initialization:', error);
      throw error;
    }
  }

  getBalance(cryptoIndex: number): Promise<{ balance: number }> {
    if (isNaN(cryptoIndex) || cryptoIndex < 0) {
      throw new BadRequestException('Invalid cryptocurrency ID');
    }

    try {
      // For demo purposes, return a mock balance based on crypto index
      // In a real application, this would map to actual cryptocurrency balances
      const mockBalances = {
        0: 1.5, // ETH
        1: 1000, // BTC equivalent
        2: 500, // USDT equivalent
      };

      const balance =
        mockBalances[cryptoIndex as keyof typeof mockBalances] || 0;

      return Promise.resolve({ balance });
    } catch (error) {
      console.error('Error getting balance:', error);
      throw error;
    }
  }

  async sendEther({ signerId, to, amountEther }: SendEtherDto): Promise<{
    receipt_hash: string;
    msg: string;
    txHash?: string;
  }> {
    try {
      const amountInWei = ethers.parseEther(amountEther);

      // Use the first Hardhat account for demo purposes
      const hardhatPrivateKey =
        '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
      const wallet = new ethers.Wallet(hardhatPrivateKey, this.provider);
      const fromAddress = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';

      // Create transaction record in database
      const txHash = `pending_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      const pendingStatus = (await this.db.findOne(
        'wallet.transaction_statuses',
        {
          name: 'PENDING',
        },
      )) as TransactionStatus;

      if (!pendingStatus) {
        throw new Error('PENDING transaction status not found in database');
      }

      await this.db.query(
        `INSERT INTO wallet.transactions (user_id, tx_hash, amount, from_address, to_address, status_id, created_at, updated_at) 
         VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) RETURNING *`,
        [signerId, txHash, amountEther, fromAddress, to, pendingStatus.id],
      );

      // Send actual blockchain transaction
      const tx = await wallet.sendTransaction({
        to,
        value: amountInWei,
      });

      const receipt = await tx.wait();
      if (!receipt) {
        throw new Error('Transaction failed to confirm');
      }
      const receipt_hash = receipt.hash;

      // Update transaction status to CONFIRMED
      const confirmedStatus = (await this.db.findOne(
        'wallet.transaction_statuses',
        {
          name: 'CONFIRMED',
        },
      )) as TransactionStatus;

      if (!confirmedStatus) {
        throw new Error('CONFIRMED transaction status not found in database');
      }

      await this.db.query(
        `UPDATE wallet.transactions SET tx_hash = ?, status_id = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ? AND tx_hash = ?`,
        [receipt_hash, confirmedStatus.id, signerId, txHash],
      );

      return {
        receipt_hash,
        msg: 'Transaction confirmed on blockchain',
        txHash: receipt_hash,
      };
    } catch (error) {
      console.error('Error sending transaction:', error);
      throw new Error(
        `Failed to send transaction: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async publicKeys(): Promise<{ publicKeys: string[] }> {
    try {
      const signers = await this.provider.listAccounts();
      return {
        publicKeys: await Promise.all(
          signers.map(async (signer) => await signer.getAddress()),
        ),
      };
    } catch (error) {
      console.error('Error getting public keys:', error);
      throw error;
    }
  }

  // Enhanced blockchain methods for new contract features
  async createWallet(
    userId: string,
    address: string,
  ): Promise<{ wallet: Wallet; message: string }> {
    try {
      // Check if wallet already exists in database
      const existingWallet = (await this.db.findOne('wallet.wallets', {
        address,
      })) as Wallet;
      if (existingWallet) {
        throw new BadRequestException('Wallet already exists');
      }

      // Create wallet in smart contract
      await this.contract.createWallet(address);

      // Save wallet to database
      const wallet = await this.db.query(
        `INSERT INTO wallet.wallets (user_id, address, created_at, updated_at) 
         VALUES (?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) 
         RETURNING id, user_id, address, created_at`,
        [userId, address],
      );

      const savedWallet = wallet.rows[0] as Wallet;

      // Initialize wallet balance
      await this.db.query(
        `INSERT INTO wallet.balances (wallet_id, amount, created_at, updated_at) 
         VALUES (?, '0', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [savedWallet.id],
      );

      // Create notification for wallet creation
      const walletNotificationType = (await this.db.findOne(
        'wallet.notification_types',
        { name: 'WALLET' },
      )) as NotificationType;
      if (walletNotificationType) {
        await this.db.query(
          `INSERT INTO wallet.notifications (user_id, type_id, message, read, created_at) 
           VALUES (?, ?, ?, false, CURRENT_TIMESTAMP)`,
          [
            userId,
            walletNotificationType.id,
            `Wallet created successfully with address ${address}`,
          ],
        );
      }

      // Log wallet creation action
      const walletActionType = (await this.db.findOne('wallet.action_types', {
        name: 'WALLET_CREATE',
      })) as ActionType;
      if (walletActionType) {
        await this.db.query(
          `INSERT INTO wallet.user_logs (user_id, action_id, success, created_at) 
           VALUES (?, ?, true, CURRENT_TIMESTAMP)`,
          [userId, walletActionType.id],
        );
      }

      return { wallet: savedWallet, message: 'Wallet created successfully' };
    } catch (error: unknown) {
      console.error('Error creating wallet:', error);
      throw error;
    }
  }

  async getWalletBalance(
    address: string,
  ): Promise<{ balance: string; wallet: Wallet }> {
    try {
      // Get balance from smart contract
      const contractBalance = (await this.contract.getWalletBalance(
        address,
      )) as bigint;

      // Get wallet from database
      const wallet = (await this.db.findOne('wallet.wallets', {
        address,
      })) as Wallet;
      if (!wallet) {
        throw new BadRequestException('Wallet not found');
      }

      // Update balance in database
      await this.db.query(
        `UPDATE wallet.balances SET amount = ?, updated_at = CURRENT_TIMESTAMP WHERE wallet_id = ?`,
        [contractBalance.toString(), wallet.id],
      );

      return { balance: ethers.formatEther(contractBalance), wallet };
    } catch (error: unknown) {
      console.error('Error getting wallet balance:', error);
      throw error;
    }
  }

  async getUserTransactions(userId: string): Promise<{ transactions: any[] }> {
    try {
      const transactions = await this.db.query(
        `SELECT t.*, ts.name as status_name FROM wallet.transactions t 
         LEFT JOIN wallet.transaction_statuses ts ON t.status_id = ts.id 
         WHERE t.user_id = ? 
         ORDER BY t.created_at DESC`,
        [userId],
      );

      return { transactions: transactions.rows };
    } catch (error: unknown) {
      console.error('Error getting user transactions:', error);
      throw error;
    }
  }

  async getTransaction(txHash: string): Promise<any> {
    try {
      const transaction = await this.db.query(
        `SELECT t.*, ts.name as status_name FROM wallet.transactions t 
         LEFT JOIN wallet.transaction_statuses ts ON t.status_id = ts.id 
         WHERE t.tx_hash = ?`,
        [txHash],
      );

      if (!transaction || !transaction.rows.length) {
        throw new BadRequestException('Transaction not found');
      }

      // Get transaction details from smart contract
      await this.contract.getTransaction(txHash);

      return transaction.rows[0];
    } catch (error: unknown) {
      console.error('Error getting transaction:', error);
      throw error;
    }
  }

  async confirmTransaction(
    txHash: string,
    userId: string,
  ): Promise<{ message: string }> {
    try {
      const transaction = await this.db.query(
        `SELECT id FROM wallet.transactions WHERE tx_hash = ? AND user_id = ?`,
        [txHash, userId],
      );

      if (!transaction || !transaction.rows.length) {
        throw new BadRequestException('Transaction not found');
      }

      // Update transaction status to confirmed
      const confirmedStatus = (await this.db.findOne(
        'wallet.transaction_statuses',
        {
          name: 'CONFIRMED',
        },
      )) as TransactionStatus;
      await this.db.query(
        `UPDATE wallet.transactions SET status_id = ?, updated_at = CURRENT_TIMESTAMP WHERE tx_hash = ?`,
        [confirmedStatus.id, txHash],
      );

      // Create notification for transaction confirmation
      const transactionNotificationType = (await this.db.findOne(
        'wallet.notification_types',
        { name: 'TRANSACTION' },
      )) as NotificationType;
      if (transactionNotificationType) {
        await this.db.query(
          `INSERT INTO wallet.notifications (user_id, type_id, message, read, created_at) 
           VALUES (?, ?, ?, false, CURRENT_TIMESTAMP)`,
          [
            userId,
            transactionNotificationType.id,
            `Transaction ${txHash} has been confirmed`,
          ],
        );
      }

      return { message: 'Transaction confirmed successfully' };
    } catch (error: unknown) {
      console.error('Error confirming transaction:', error);
      throw error;
    }
  }

  async getUserWallets(userId: string): Promise<any[]> {
    try {
      const wallets = await this.db.query(
        `SELECT w.*, b.amount as balance FROM wallet.wallets w 
         LEFT JOIN wallet.balances b ON w.id = b.wallet_id 
         WHERE w.user_id = ? 
         ORDER BY w.created_at DESC`,
        [userId],
      );

      return wallets.rows;
    } catch (error: unknown) {
      console.error('Error getting user wallets:', error);
      throw error;
    }
  }

  async getTransactionStatuses(): Promise<{ statuses: any[] }> {
    try {
      const statuses = await this.db.findMany('wallet.transaction_statuses');
      return { statuses };
    } catch (error: unknown) {
      console.error('Error getting transaction statuses:', error);
      throw error;
    }
  }
}
