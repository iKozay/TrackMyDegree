import express, { Request, Response } from 'express';
import HTTP from '@Util/HTTPCodes';
import Database from '@controllers/DBController/DBController';
import { authMiddleware } from '@middleware/authMiddleware';
import {
  jwtService,
  TokenPayload,
  getCookieOptions,
} from '../services/jwtService';
import { refreshSession, UserHeaders } from '@Util/Session_Util';

const router = express.Router();

//* Middleware
router.use(authMiddleware);

//* Route handlers
router.get('/refresh', async (req: Request, res: Response) => {
  const access_token = req.cookies.access_token;

  try {
    const headers: UserHeaders = {
      agent: req.headers['user-agent'] || '',
      ip_addr: req.ip || '',
    };
    const payload: TokenPayload = jwtService.verifyAccessToken(access_token)!;
    const session_token = refreshSession(payload.session_token, headers);

    if (!session_token) {
      throw new Error('Unauthorized');
    }

    const accessToken = jwtService.generateToken(
      {
        orgId: process.env.JWT_ORG_ID!,
        userId: payload.id!,
        type: payload.type,
      },
      headers,
      session_token,
    );

    const cookie = jwtService.setAccessCookie(accessToken);

    res.clearCookie(cookie.name, getCookieOptions()); //? Clear previous session
    res.cookie(cookie.name, cookie.value, cookie.config); //? Set new JWT cookie

    const dbConn = await Database.getConnection();

    if (dbConn) {
      //? Get User Data
      const result = await dbConn
        .request()
        .input('id', Database.msSQL.VarChar, payload.userId)
        .query('SELECT * FROM AppUser WHERE id = @id');

      if (result.recordset && result.recordset.length > 0) {
        res.status(HTTP.OK).json(result.recordset[0]);
      } else {
        throw new Error('User not found');
      }
    }

    res.status(HTTP.SERVER_ERR);
  } catch (error) {
    res.status(HTTP.UNAUTHORIZED).json({ message: (error as Error).message });
  }
});

router.get('/destroy', (req: Request, res: Response) => {
  res.clearCookie('access_token');

  res.status(HTTP.OK).json({ message: 'session destroyed' });
});

export default router;
