import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BlockchainController } from './blockchain.controller';
import { BlockchainService } from './blockchain.service';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [
    ConfigModule,
    JwtModule.registerAsync({
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('ACCESS_TOKEN_SECRET'),
        signOptions: { expiresIn: '15s' },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [BlockchainController],
  providers: [BlockchainService],
})
export class BlockchainModule {}
