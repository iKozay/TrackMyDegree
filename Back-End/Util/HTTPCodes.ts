
/*HTTP response status codes*/

//Successful Responses
const OK              = 200;
const CREATED         = 201;
const ACCEPTED        = 202;

//Client error responses
const BAD_REQUEST     = 400;
const UNAUTHORIZED    = 401;
const FORBIDDEN       = 403;
const NOT_FOUND       = 404;

//Server error responses
const SERVER_ERR      = 500;


const HTTP = {
  OK,
  CREATED,
  ACCEPTED,
  BAD_REQUEST,
  UNAUTHORIZED,
  FORBIDDEN,
  NOT_FOUND,
  SERVER_ERR
}

//Default Export
export default HTTP
