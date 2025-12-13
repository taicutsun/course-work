// User interface matching backend schema
export interface User {
  id: string;
  email: string;
  password?: string; // Password should not be exposed in responses
  roleId: number;
  createdAt: string;
  updatedAt: string;
}

// Role interface
export interface Role {
  id: number;
  name: string;
}

// User creation request
export interface CreateUserRequest {
  email: string;
  password: string;
}

// User creation response
export interface CreateUserResponse {
  message: string;
  user?: User;
  isCreated: boolean;
}

// Login request
export interface LoginRequest {
  email: string;
  password: string;
}

// Login response
export interface LoginResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

// User profile update request
export interface UpdateUserRequest {
  email?: string;
  roleId?: number;
}

// User role update request
export interface UpdateUserRoleRequest {
  roleName: string;
}

// User notification interface
export interface Notification {
  id: string;
  userId: string;
  typeId: number;
  message: string;
  read: boolean;
  createdAt: string;
}

// Notification type interface
export interface NotificationType {
  id: number;
  name: string;
}

// User action log interface
export interface UserLog {
  id: string;
  userId: string;
  actionId: number;
  success: boolean;
  createdAt: string;
}

// Action type interface
export interface ActionType {
  id: number;
  name: string;
}

// User notifications response
export interface UserNotificationsResponse {
  notifications: Notification[];
  total: number;
}

// User logs response
export interface UserLogsResponse {
  logs: UserLog[];
  total: number;
}

// User profile response
export interface UserProfileResponse {
  user: User;
  role?: Role;
  wallets: any[];
  notifications: Notification[];
  logs: UserLog[];
}
