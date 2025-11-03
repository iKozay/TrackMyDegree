declare namespace Auth {
  enum UserType {
    STUDENT = 'student',
    ADVISOR = 'advisor',
    ADMIN = 'admin',
  }

  type Credentials = {
    email: string;
    password: string;
  };

  type UserInfo = Credentials & {
    id?: string;
    fullname: string;
    type: UserType;
  };
}

export default Auth;
