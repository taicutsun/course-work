import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { UsersService } from './users.service';
import { createUserSchema, CreateUserDto } from './schemas/create-user.schema';
import { CreateUserValidation } from './pipes/CreateUserValidation.pipe';
import { User, UserResponse } from './types/user.types';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  findAll(): User[] {
    return this.usersService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string): User | null {
    return this.usersService.findOne(id) || null;
  }

  @Post('create')
  create(
    @Body(new CreateUserValidation(createUserSchema))
    createUserDto: CreateUserDto,
  ): UserResponse {
    return this.usersService.create(createUserDto);
  }
}
