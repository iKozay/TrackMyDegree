import express, { Request, Response, NextFunction } from 'express'
import cors                                         from 'cors'
import dotenv                                       from 'dotenv'
import cookieParser                                 from 'cookie-parser'
import createError                                  from 'http-errors'
import Database                                     from '@controllers/DBController/DBController'


//Express Init
dotenv.config();                                    //Load environment variables from .env file
const app   = express();
const PORT  = process.env.PORT || 5000;


//Express function config
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(cookieParser());
app.use(cors());


//Routes


/**
 * DB test route 
 * TO BE REMOVED 
 */
app.get('/test-db', async (req, res) => {
  try {
    const pool    = await Database.getConnection();
    const result  = await pool.request().query('SELECT 1 AS number');
    res.status(200).send({
      message : "Database connected successfully!",
      result  : result.recordset,
    });
  } 
  catch (error) {
    res.status(500).send({ message: "Database connection failed", error });
  }
});


//Handle 404
app.use((req:Request, res:Response, next:NextFunction) => {
  next(createError(404, 'Page not found'));
});


//Listen for requests
app.listen(PORT, () => {
  console.log(`Server listening on Port: ${PORT}`);
});