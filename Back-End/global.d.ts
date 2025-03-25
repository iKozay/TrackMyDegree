

declare namespace NodeJS {
  interface ProcessEnv {
    //? User-defined
    PORT?               : number;
    CLIENT?             : string;

    //? SQL Specific
    SQL_SERVER_USER     : string;
    SQL_SERVER_PASSWORD : string;
    SQL_SERVER_DATABASE : string;
    SQL_SERVER_HOST     : string;

    //? DB Info
    DB_USER             : string;      
    DB_PASSWORD         : string;      
    DB_NAME             : string;      
    DB_HOST             : string;

    //? Email
    EMAIL_USER          : string;     
    EMAIL_PASSWORD      : string;

    //? JWT Specific
    JWT_SECRET          : string;     
    JWT_EXPIRY          : number;      
    JWT_ORG_ID          : string;      
  }
}