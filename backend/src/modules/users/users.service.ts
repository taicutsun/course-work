import { Injectable } from '@nestjs/common';
import { CreateUserDto } from './schemas/create-user.schema';
import { User, UserResponse } from './types/user.types';

@Injectable()
export class UsersService {
  private users: User[] = [
    { id: '1', username: 'test', password: 'test', cryptoI: 0 },
  ];
  private indexOfUser = 1; // Start from 1 since we already have one user

  findAll(): User[] {
    return this.users;
  }

  //todo: replace with id
  //todo when db is implemented make it async
  findOne(username: string): User | undefined {
    return this.users.find((user) => user.username === username);
  }

  create(createUserDto: CreateUserDto): UserResponse {
    const existingUser = this.findOne(createUserDto.username);

    if (existingUser) {
      //todo: return code mb 400
      return { message: 'User already created', isCreated: true };
    }

    const newUser: User = {
      id: (this.indexOfUser + 1).toString(),
      username: createUserDto.username,
      password: createUserDto.password,
      cryptoI: this.indexOfUser,
    };

    this.users.push(newUser);
    this.indexOfUser++;

    return { message: 'New user logged', user: newUser };
  }
}
