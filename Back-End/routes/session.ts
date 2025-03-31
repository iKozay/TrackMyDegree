import express, { Request, Response } from 'express';
import HTTP from '@Util/HTTPCodes';
import Database from '@controllers/DBController/DBController';
import { verifyAuth } from '@middleware/authMiddleware';
import { setJWTCookie, TokenPayload, verifyToken } from '@Util/JWT_Util';
import { refreshSession, UserHeaders } from '@Util/Session_Util';

const router = express.Router();

//* Middleware
router.use(verifyAuth);

//* Route handlers
router.get('/refresh', async (req: Request, res: Response) => {
  const access_token = req.cookies.access_token;

  try {
    const headers: UserHeaders = {
      agent: req.headers['user-agent'] || '',
      ip_addr: req.ip || '',
    };
    const payload: TokenPayload = verifyToken(access_token);
    const session_token = refreshSession(payload.session_token, headers);

    if (!session_token) {
      throw new Error('Unauthorized');
    }

    const user_info = {
      id: payload.userId,
      type: payload.type,
    };

    const cookie = setJWTCookie(user_info, headers, session_token);

    res.clearCookie(cookie.name, {//? Clear previous JWT cookie
      httpOnly: true,
      secure: cookie.config.secure,
      sameSite: cookie.config.sameSite,
      path: cookie.config.path,
      domain: cookie.config.domain
    }); 
    res.cookie(cookie.name, cookie.value, cookie.config); //? Set new JWT cookie

    const dbConn = await Database.getConnection();

    if (dbConn) {//? Get User Data
      const result = await dbConn
        .request()
        .input('id', Database.msSQL.VarChar, payload.userId)
        .query('SELECT * FROM AppUser WHERE id = @id');

      if (result.recordset && result.recordset.length > 0) {
        res.status(HTTP.OK).json(result.recordset[0]);
      }
      else {
        throw new Error();//? User not found
      }
    }

    res.status(HTTP.SERVER_ERR);
  } catch (error) {
    res.status(HTTP.UNAUTHORIZED).json({ message: (error as Error).message });
  }
});

export default router;
