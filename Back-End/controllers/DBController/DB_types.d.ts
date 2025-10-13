declare namespace SQL {
  //Type for config object passed to SQL.connect()
  type Config = {
    user: string;
    password: string;
    database: string;
    server: string;
    options: {
      encrypt: boolean;
      trustServerCertificate: boolean;
      requestTimeout: number;
    };
  };
}

export default SQL;
