export type UserRole = 'student' | 'admin';

export interface UserDocument {
  _id: string;
  email: string;
  fullname: string;
  type: UserRole;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateUserInput {
  email: string;
  fullname: string;
  password: string;
  type: UserRole;
}

export interface UpdateUserInput {
  email?: string;
  fullname?: string;
  type?: UserRole;
}
