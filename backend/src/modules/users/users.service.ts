import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { CreateUserDto } from './schemas/create-user.schema';
import { UserResponse } from './types/user.types';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../db/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}
  private indexOfUser = 1; // Start from 1 since we already have one user

  findAll(): Promise<User[]> {
    return this.usersRepository.find();
  }

  findOne(username: string): Promise<User | null> {
    return this.usersRepository.findOneBy({ username });
  }

  async create(createUserDto: CreateUserDto): Promise<UserResponse> {
    const existingUser = await this.findOne(createUserDto.username);

    if (existingUser) {
      throw new ConflictException({
        statusCode: 409,
        message: 'User already exists',
        isCreated: false,
      });
    }

    const newUser = this.usersRepository.create({
      username: createUserDto.username,
      password: createUserDto.password,
      cryptoI: this.indexOfUser,
    });

    try {
      const savedUser = await this.usersRepository.save(newUser);

      this.indexOfUser++;
      return { message: 'New user logged', user: savedUser, isCreated: true };
    } catch (error) {
      throw new InternalServerErrorException({
        statusCode: 500,
        message: 'Error creating user',
        error: error,
      });
    }
  }
}
