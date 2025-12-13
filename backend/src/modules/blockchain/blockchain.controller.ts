import {
  Controller,
  Post,
  Body,
  UseGuards,
  Get,
  Param,
  Request,
  BadRequestException,
} from '@nestjs/common';
import { BlockchainService } from './blockchain.service';
import { SendEtherDto } from './schemas/send-ether.schema';
import { sendEtherSchema } from './schemas/send-ether.schema';
import { JwtGuard } from '../../common/guards/jwt.guard';

interface Wallet {
  id: string;
  user_id: string;
  address: string;
  created_at: Date;
}

interface AuthenticatedRequest {
  user: {
    id?: string;
    sub?: string;
    email: string;
  };
}

@Controller('blockchain')
export class BlockchainController {
  constructor(private readonly blockchainService: BlockchainService) {}

  @Get('publicKeys')
  @UseGuards(JwtGuard)
  async publicKeys() {
    return this.blockchainService.publicKeys();
  }

  @Get('balance/:cryptoIndex')
  @UseGuards(JwtGuard)
  async getBalance(@Param('cryptoIndex') cryptoIndex: number) {
    return this.blockchainService.getBalance(cryptoIndex);
  }

  @Post('sendEther')
  @UseGuards(JwtGuard)
  async sendEther(
    @Body() sendEtherDto: SendEtherDto,
    @Request() req: AuthenticatedRequest,
  ) {
    // Validate the request body using Zod schema
    const validation = sendEtherSchema.safeParse(sendEtherDto);
    if (!validation.success) {
      throw new BadRequestException(
        `Validation failed: ${validation.error.message}`,
      );
    }

    const validatedData = validation.data;

    // Debug: Check what's available in the request
    console.log('Request user:', req.user);
    console.log('Request user ID:', req.user?.id);

    // Use user ID from JWT token (stored in 'sub' field) instead of signerId
    const userId: string =
      req.user?.sub || req.user?.id || validatedData.signerId;
    return this.blockchainService.sendEther({
      signerId: userId,
      to: validatedData.to,
      amountEther: validatedData.amountEther,
    });
  }

  @Post('wallet')
  @UseGuards(JwtGuard)
  async createWallet(
    @Body() createWalletDto: { address: string },
    @Request() req: AuthenticatedRequest,
  ): Promise<{ wallet: Wallet; message: string }> {
    const userId = req.user?.sub || req.user?.id;
    if (!userId) {
      throw new BadRequestException('User ID not found in token');
    }
    return this.blockchainService.createWallet(userId, createWalletDto.address);
  }

  @Get('wallet/:address')
  @UseGuards(JwtGuard)
  async getWalletBalance(
    @Param('address') address: string,
  ): Promise<{ balance: string; wallet: Wallet }> {
    return this.blockchainService.getWalletBalance(address);
  }

  @Get('transactions/:userId')
  @UseGuards(JwtGuard)
  async getUserTransactions(@Param('userId') userId: string) {
    return this.blockchainService.getUserTransactions(userId);
  }

  @Post('transaction/confirm')
  @UseGuards(JwtGuard)
  async confirmTransaction(
    @Body() confirmDto: { txHash: string },
    @Request() req: AuthenticatedRequest,
  ): Promise<{ message: string }> {
    const userId = req.user?.sub || req.user?.id;
    if (!userId) {
      throw new BadRequestException('User ID not found in token');
    }
    return this.blockchainService.confirmTransaction(confirmDto.txHash, userId);
  }

  @Get('wallets/:userId')
  @UseGuards(JwtGuard)
  async getUserWallets(
    @Param('userId') userId: string,
  ): Promise<{ wallets: Wallet[] }> {
    const wallets = await this.blockchainService.getUserWallets(userId);
    return { wallets: wallets as Wallet[] };
  }

  @Get('transaction-statuses')
  @UseGuards(JwtGuard)
  async getTransactionStatuses() {
    return this.blockchainService.getTransactionStatuses();
  }
}
