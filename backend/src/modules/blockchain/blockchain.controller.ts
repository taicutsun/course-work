import {
  Controller,
  Post,
  Body,
  UseGuards,
  Get,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { BlockchainService } from './blockchain.service';
import { SendEtherDto, sendEtherSchema } from './schemas/send-ether.schema';
import { SendEtherValidation } from './pipes/SendEtherValidation.pipe';
import { JwtGuard } from '../../common/guards/jwt.guard';

@Controller('blockchain')
export class BlockchainController {
  constructor(private readonly blockchainService: BlockchainService) {}

  @Get('publicKeys')
  @UseGuards(JwtGuard)
  async publicKeys() {
    return this.blockchainService.publicKeys();
  }

  @Get('getBalance')
  @UseGuards(JwtGuard)
  async balance(@Query('cryptoI') id: number) {
    return this.blockchainService.getBalance(Number(id));
  }

  @Post('sendEther')
  @UseGuards(JwtGuard)
  async sendEther(
    @Body(new SendEtherValidation(sendEtherSchema))
    sendEtherDto: SendEtherDto,
  ) {
    return this.blockchainService.sendEther({
      signerId: sendEtherDto.signerId,
      to: sendEtherDto.to,
      amountEther: sendEtherDto.amountEther,
    });
  }
}
