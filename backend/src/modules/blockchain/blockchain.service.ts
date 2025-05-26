import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ethers } from 'ethers';
import * as LockContract from '@contracts/Lock.sol/Lock.json';
import * as ContractAddress from '@ignition/deployments/chain-31337/deployed_addresses.json';
import { SendEtherDto } from './schemas/send-ether.schema';

@Injectable()
export class BlockchainService implements OnModuleInit {
  private provider: ethers.JsonRpcProvider;
  private contract: ethers.Contract;
  private ownerKey: string;

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    this.ownerKey = this.configService.get<string>('OWNER_KEY') ?? '';
    const rpcUrl = this.configService.get<string>('RPC_URL');
    this.provider = new ethers.JsonRpcProvider(rpcUrl);

    await this.initializeBlockchain();
  }

  private async initializeBlockchain() {
    const owner = new ethers.Wallet(this.ownerKey, this.provider);

    this.contract = new ethers.Contract(
      ContractAddress['LockModule#Lock'],
      LockContract.abi,
      owner,
    );
    try {
      await this.provider.getBlockNumber();
      console.log('Successfully connected to the blockchain');
    } catch (error) {
      console.error('Failed to connect to the blockchain:', error);
      throw error;
    }
  }

  async getBalance(cryptoIndex: number): Promise<number> {
    try {
      const signer = await this.provider.getSigner(cryptoIndex);
      const address = await signer.getAddress();
      const balance = await this.provider.getBalance(address);

      return Number(ethers.formatEther(balance));
    } catch (error) {
      console.error('Error getting balance:', error);
      throw error;
    }
  }

  //todo add status code
  async sendEther({
    signerId,
    to,
    amountEther,
  }: SendEtherDto): Promise<string> {
    const amountInWei = ethers.parseEther(amountEther);
    const signer = await this.provider.getSigner(signerId);
    const tx = await signer.sendTransaction({
      to,
      value: amountInWei,
    });

    const receipt = await tx.wait();
    const balance = await this.provider.getBalance(to);

    console.log(
      `Ether sent successfully in transaction: ${receipt?.hash}, recipient balance = ${ethers.formatEther(balance)} ETH`,
    );

    return receipt?.hash ?? '';
  }

  async publicKeys(): Promise<string[]> {
    try {
      const signers = await this.provider.listAccounts();
      const addresses = await Promise.all(
        signers.map(async (signer) => {
          const address = await signer.getAddress();
          return address;
        }),
      );
      return addresses;
    } catch (error) {
      console.error('Error getting public keys:', error);
      throw error;
    }
  }
}
