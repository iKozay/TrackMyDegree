export type UserRole = 'student' | 'admin' | 'advisor';

export interface UserDocument {
  _id: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateUserInput {
  email: string;
  name: string;
  password: string;
  role: UserRole;
}

export interface UpdateUserInput {
  email?: string;
  name?: string;
  role?: UserRole;
}

export interface InviteAdminInput {
  email: string;
  name: string;
}
