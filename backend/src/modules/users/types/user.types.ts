export type UserType = {
  id: string;
  username: string;
  password: string;
  cryptoI: number;
};

export type UserResponse = {
  message: string;
  user?: UserType;
  isCreated?: boolean;
};
