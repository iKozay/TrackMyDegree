
declare namespace appUserTypes {

  enum UserType {
    STUDENT = "student",
    ADVISOR = "advisor",
    ADMIN = "admin"
  }

  type AppUser = {
    id: string;
    email: string;
    password: string;
    fullname: string;
    degree?: string;
    type: UserType;
  };
}

export default appUserTypes;