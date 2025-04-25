export type User = {
  id: string;
  username: string;
  password: string;
  cryptoI: number;
};

export type UserResponse = {
  message: string;
  user?: User;
  isCreated?: boolean;
};
