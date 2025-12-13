import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Request,
  UseGuards,
  HttpCode,
  HttpStatus,
  Put,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './schemas/create-user.schema';
import { JwtGuard } from '../../common/guards/jwt.guard';
import { UserType } from './types/user.types';

interface AuthenticatedRequest extends Request {
  user: UserType;
}

interface Role {
  id: number;
  name: string;
}

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('create')
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() createUserDto: CreateUserDto,
  ): Promise<{ user: UserType }> {
    const user = await this.usersService.create(createUserDto);
    return { user: user.user! };
  }

  @Get()
  async findAll(): Promise<{ users: UserType[] }> {
    const users = await this.usersService.findAll();
    return { users };
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<{ user: UserType | null }> {
    const user = await this.usersService.findById(id);
    return { user: user || null };
  }

  @Get('me/wallets')
  @UseGuards(JwtGuard)
  async getUserWallets(
    @Request() req: AuthenticatedRequest,
  ): Promise<{ wallets: any }> {
    return { wallets: await this.usersService.getUserWallets(req.user.id) };
  }

  @Get('me/notifications')
  @UseGuards(JwtGuard)
  async getUserNotifications(
    @Request() req: AuthenticatedRequest,
  ): Promise<{ notifications: any }> {
    return {
      notifications: await this.usersService.getUserNotifications(req.user.id),
    };
  }

  @Put('me/notifications/:notificationId/read')
  @UseGuards(JwtGuard)
  async markNotificationAsRead(
    @Param('notificationId') notificationId: string,
    @Request() req: AuthenticatedRequest,
  ): Promise<{ message: string }> {
    await this.usersService.markNotificationAsRead(notificationId, req.user.id);
    return { message: 'Notification marked as read' };
  }

  @Get('me/role')
  @UseGuards(JwtGuard)
  async getUserRole(
    @Request() req: AuthenticatedRequest,
  ): Promise<{ role: Role | null }> {
    const role = await this.usersService.getUserRole(req.user.id);
    return { role };
  }

  @Put('me/role')
  @UseGuards(JwtGuard)
  async updateUserRole(
    @Body() updateRoleDto: { roleName: string },
    @Request() req: AuthenticatedRequest,
  ): Promise<{ user: UserType }> {
    const { roleName } = updateRoleDto;
    const updatedUser = await this.usersService.updateUserRole(
      req.user.id,
      roleName,
    );
    return { user: updatedUser };
  }

  @Get('me/logs')
  @UseGuards(JwtGuard)
  async getUserLogs(@Request() req: AuthenticatedRequest) {
    return this.usersService.getUserLogs(req.user.id);
  }
}
