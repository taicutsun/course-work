import { z } from 'zod';

export const createUserSchema = z.object({
  username: z.string().min(2, 'Username must be at least 2 characters'),
  password: z.string().min(2, 'Password must be at least 2 characters'), //todo update validation
});

export type CreateUserDto = z.infer<typeof createUserSchema>;
