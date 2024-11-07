import express, { Request, Response }  from "express"
import authController                  from "@controllers/authController/authController"
import HTTP                            from "@Util/HTTPCodes";
import Auth                            from "@controllers/authController/auth_types"

const router = express.Router();


/**Routes */
//Login
router.post('/login', async (req: Request, res: Response) =>{
  const { email, password } = req.body;

  if (!(email) || !(password)) {
    res.status(HTTP.BAD_REQUEST).json({ error: "Email and password are required" });
  }

  try {
    const result = await authController.authenticate(email, password);

    if ((undefined) === (result)) {
      res.status(HTTP.UNAUTHORIZED).json({ error: "Incorrect email or password" });
    }
    else {
      res.status(HTTP.OK).json(result);
    }

  } 
  catch (error) {
    const errMsg = "Internal server error in /login";
    console.error(errMsg, error);
    res.status(HTTP.SERVER_ERR).json({ error: errMsg });
  }
});

//Sign-up
router.post('/signup', async (req: Request, res: Response) => {

  if((undefined) === (req.body)){
    res.status(HTTP.BAD_REQUEST).json({ error: "Request body cannot be empty" })
  }

  const payload: Auth.UserInfo = req.body;

  try {
    const result = await authController.registerUser(payload);

    if((undefined) === (result)) {
      throw new Error("Insertion result is undefined");
    }
    else {
      res.status(HTTP.CREATED).json(result);
    }
  }
  catch(error) {
    const errMsg = "Internal server error in /signup";
    console.error(errMsg, error);
    res.status(HTTP.SERVER_ERR).json({ error: errMsg });
  }
});

export default router;
