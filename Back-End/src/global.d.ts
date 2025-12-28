declare namespace NodeJS {
  interface ProcessEnv {
    //? User-defined
    PORT?: number;
    CLIENT?: string;

    //? MongoDB
    MONGODB_URI: string;

    //? Email
    EMAIL_USER: string;
    EMAIL_PASSWORD: string;

    //? Application Environment
    NODE_ENV: string;

    //? JWT Specific
    JWT_SECRET: string;
    JWT_EXPIRY: number;
    JWT_ORG_ID: string;

    //? Session specific
    SESSION_ALGO: string;
  }
}
