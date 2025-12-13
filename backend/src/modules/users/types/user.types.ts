export type UserType = {
  id: string;
  email: string;
  password?: string;
  role_id: number;
  created_at: Date;
  updated_at: Date;
};

export type UserResponse = {
  message: string;
  user?: UserType;
  isCreated?: boolean;
};
