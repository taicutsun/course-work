import { Injectable } from '@nestjs/common';
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

  /*async remove(id: number): Promise<void> {
    await this.usersRepository.delete(id);
  }*/

  async create(createUserDto: CreateUserDto): Promise<UserResponse> {
    const existingUser = await this.findOne(createUserDto.username);

    if (existingUser) {
      //todo: return code not this
      return { message: 'User already created', isCreated: true };
    }

    /*const newUser: User = {
      id: (this.indexOfUser + 1).toString(),
      username: createUserDto.username,
      password: createUserDto.password,
      cryptoI: this.indexOfUser,
    };*/
    const newUser = this.usersRepository.create({
      username: createUserDto.username,
      password: createUserDto.password,
      cryptoI: this.indexOfUser,
    });

    try {
      const savedUser = await this.usersRepository.save(newUser);

      this.indexOfUser++;
      return { message: 'New user logged', user: savedUser, isCreated: true }; //todo replace with normal response
    } catch (error) {
      return {
        message: 'Error creating user',
        isCreated: false,
      };
    }
  }
}
