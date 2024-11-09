import express, { Request, Response } from "express";
import authController from "@controllers/authController/authController";
import HTTP from "@Util/HTTPCodes";
import Auth from "@controllers/authController/auth_types";
import bcrypt from "bcryptjs";

const router = express.Router();
var salt = bcrypt.genSaltSync(10);

var bcryptVar = require('bcryptjs');
var hash = bcrypt.hashSync("B4c0/\/", salt);

/**Routes */
// Login
router.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!(email) || !(password)) {
    res.status(HTTP.BAD_REQUEST).json({ error: "Email and password are required" });
    return; // Exit if validation fails
  }

  try {
    const result = await authController.authenticate(email, password);

    if ((undefined) === (result)) {
      res.status(HTTP.UNAUTHORIZED).json({ error: "Incorrect email or password" });
    } else {
      res.status(HTTP.OK).json(result);
    }
  } catch (error) {
    const errMsg = "Internal server error in /login";
    console.error(errMsg, error);
    res.status(HTTP.SERVER_ERR).json({ error: errMsg });
  }
});

// Sign-up
router.post('/signup', async (req: Request, res: Response) => {
  if (!req.body) {
    res.status(HTTP.BAD_REQUEST).json({ error: "Request body cannot be empty" });
    return; // Exit if validation fails
  }

  const payload: Auth.UserInfo = req.body;

  try {
    payload.password = await bcrypt.hash(payload.password, salt);
    const result = await authController.registerUser(payload);

    if (!result) {
      throw new Error("Insertion result is undefined");
    } else {
      res.status(HTTP.CREATED).json(result);
    }
  } catch (error) {
    const errMsg = "Internal server error in /signup";
    console.error(errMsg, error);
    res.status(HTTP.SERVER_ERR).json({ error: errMsg });
  }
});

export default router;
