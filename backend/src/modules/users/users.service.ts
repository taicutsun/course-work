import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  BadRequestException,
} from '@nestjs/common';
import { CreateUserDto } from './schemas/create-user.schema';
import { UserResponse, UserType } from './types/user.types';
import { DatabaseService } from '../database/database.service';
import {
  User as DBUser,
  Role,
  NotificationType,
  ActionType,
} from '../../common/types/database.types';

@Injectable()
export class UsersService {
  constructor(private readonly db: DatabaseService) {}

  async findAll(): Promise<UserType[]> {
    const result = await this.db.findMany('wallet.users');
    return result as UserType[];
  }

  async findOne(email: string): Promise<UserType | null> {
    const result = await this.db.findOne('wallet.users', { email });
    return result as UserType | null;
  }

  async findById(id: string): Promise<UserType | null> {
    const result = await this.db.findById('wallet.users', id);
    return result as UserType | null;
  }

  async create(createUserDto: CreateUserDto): Promise<UserResponse> {
    try {
      console.log('Creating user with email:', createUserDto.email);

      // Check if user already exists
      const existingUser = await this.db.query(
        'SELECT id FROM wallet.users WHERE email = ?',
        [createUserDto.email],
      );

      if (existingUser.rows.length > 0) {
        throw new ConflictException({
          statusCode: 409,
          message: 'User already exists',
          isCreated: false,
        });
      }

      // Get default user role
      let userRole = (await this.db.findOne('wallet.roles', {
        name: 'USER',
      })) as Role;
      if (!userRole) {
        // Create default role if it doesn't exist
        userRole = (await this.db.insert('wallet.roles', {
          name: 'USER',
        })) as Role;
      }

      // Store password as plain text (no encryption)
      const hashedPassword = createUserDto.password;

      // Insert user with raw SQL
      const newUser = await this.db.query(
        `INSERT INTO wallet.users (email, password, role_id, created_at, updated_at) 
         VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) 
         RETURNING id, email, role_id, created_at`,
        [createUserDto.email, hashedPassword, userRole.id],
      );

      const savedUser = newUser.rows[0] as UserType;

      // Create notification for new user
      const systemNotificationType = (await this.db.findOne(
        'wallet.notification_types',
        { name: 'SYSTEM' },
      )) as NotificationType;
      if (systemNotificationType) {
        await this.db.query(
          `INSERT INTO wallet.notifications (user_id, type_id, message, read, created_at) 
           VALUES (?, ?, ?, false, CURRENT_TIMESTAMP)`,
          [
            savedUser.id,
            systemNotificationType.id,
            'Welcome! Your account has been created successfully.',
          ],
        );
      }

      // Log user creation
      const createActionType = (await this.db.findOne('wallet.action_types', {
        name: 'CREATE',
      })) as ActionType;
      if (createActionType) {
        await this.db.query(
          `INSERT INTO wallet.user_logs (user_id, action_id, success, created_at) 
           VALUES (?, ?, true, CURRENT_TIMESTAMP)`,
          [savedUser.id, createActionType.id],
        );
      }

      console.log('User created successfully:', savedUser.email);

      return {
        message: 'New user created successfully',
        user: savedUser,
        isCreated: true,
      };
    } catch (error: unknown) {
      console.error('Error creating user:', error);
      throw new InternalServerErrorException({
        statusCode: 500,
        message: 'Error creating user',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async validateUser(email: string, password: string): Promise<DBUser | null> {
    const user = await this.db.findOne<DBUser>('wallet.users', { email });

    if (!user) {
      return null;
    }

    // Compare plain text passwords (no encryption)
    const isPasswordValid = password === user.password;

    if (!isPasswordValid) {
      return null;
    }

    return user;
  }

  async getUserWallets(userId: string): Promise<any[]> {
    return this.db.findMany(
      'wallet.wallets',
      { user_id: userId },
      { column: 'created_at', direction: 'DESC' },
    );
  }

  async getUserNotifications(userId: string): Promise<any[]> {
    return this.db.findMany(
      'wallet.notifications',
      { user_id: userId },
      { column: 'created_at', direction: 'DESC' },
    );
  }

  async markNotificationAsRead(
    notificationId: string,
    userId: string,
  ): Promise<void> {
    const notification = await this.db.query(
      'SELECT id FROM wallet.notifications WHERE id = ? AND user_id = ?',
      [notificationId, userId],
    );

    if (!notification || !notification.rows.length) {
      throw new BadRequestException('Notification not found');
    }

    await this.db.query(
      'UPDATE wallet.notifications SET read = true, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [notificationId],
    );
  }

  async getUserRole(userId: string): Promise<Role | null> {
    const user = await this.db.query(
      'SELECT role_id FROM wallet.users WHERE id = ?',
      [userId],
    );

    if (!user || !user.rows.length) {
      return null;
    }

    const role = await this.db.query(
      'SELECT * FROM wallet.roles WHERE id = ?',
      [(user.rows[0] as Record<string, any>).role_id],
    );

    return role.rows.length > 0 ? (role.rows[0] as Role) : null;
  }

  async updateUserRole(userId: string, roleName: string): Promise<UserType> {
    const user = await this.db.query(
      'SELECT id FROM wallet.users WHERE id = ?',
      [userId],
    );

    if (!user || !user.rows.length) {
      throw new BadRequestException('User not found');
    }

    const role = await this.db.query(
      'SELECT id FROM wallet.roles WHERE name = ?',
      [roleName],
    );

    if (!role || !role.rows.length) {
      throw new BadRequestException('Role not found');
    }

    const roleRows = role.rows;
    if (roleRows.length === 0) {
      throw new BadRequestException('Role not found');
    }

    await this.db.query(
      'UPDATE wallet.users SET role_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [(role.rows[0] as Record<string, any>).id, userId],
    );

    // Create notification for role change
    const systemNotificationType = (await this.db.findOne(
      'wallet.notification_types',
      { name: 'SYSTEM' },
    )) as NotificationType;
    if (systemNotificationType) {
      await this.db.query(
        `INSERT INTO wallet.notifications (user_id, type_id, message, read, created_at) 
         VALUES (?, ?, ?, false, CURRENT_TIMESTAMP)`,
        [
          userId,
          systemNotificationType.id,
          `Your role has been updated to ${roleName}`,
        ],
      );
    }

    const updatedUser = await this.db.query(
      'SELECT * FROM wallet.users WHERE id = ?',
      [userId],
    );

    if (!updatedUser || !updatedUser.rows.length) {
      throw new BadRequestException('User not found after update');
    }

    return updatedUser.rows[0] as UserType;
  }

  async getUserLogs(userId: string): Promise<any[]> {
    return this.db.findMany(
      'wallet.user_logs',
      { user_id: userId },
      { column: 'created_at', direction: 'DESC' },
    );
  }
}
