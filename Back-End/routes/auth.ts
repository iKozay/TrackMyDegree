import express, { Request, Response, NextFunction }  from "express"
import authController                                from "@controllers/authController/authController"
import HTTP                                          from "@Util/HTTPCodes";

const router = express.Router();

router.post('/login', async (req: Request, res: Response) =>{
  const { email, password } = req.body;

  if (!(email) || !(password)) {
    res.status(HTTP.BAD_REQUEST).json({ error: "Email and password are required" });
  }

  try {
    const user = await authController.authenticate(email, password);

    if ((undefined) === (user)) {
      res.status(HTTP.UNAUTHORIZED).json({ error: "Incorrect email or password" });
    }
    else {
      res.status(HTTP.OK).json(user);
    }

  } 
  catch (error) {
    console.error("Authentication error:", error);
    res.status(HTTP.SERVER_ERR).json({ error: "Internal server error" });
  }
});

export default router;
