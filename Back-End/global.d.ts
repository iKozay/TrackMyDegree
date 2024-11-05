
declare namespace NodeJS {
  interface ProcessEnv {
    //User-defined
    PORT?               : number;
    CLIENT?             : string;

    //SQL Specific
    SQL_SERVER_USER     : string;
    SQL_SERVER_PASSWORD : string;
    SQL_SERVER_DATABASE : string;
    SQL_SERVER_HOST     : string;
  }
}