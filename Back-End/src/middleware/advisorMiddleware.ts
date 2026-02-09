import { Request, Response, NextFunction } from 'express';
import HTTP from '@utils/httpCodes';
import { jwtService } from '@services/jwtService';
import { User } from '@models/user';

/**
 * Middleware that allows both admin and advisor users to access protected routes.
 * Must be authenticated first.
 */
export async function advisorOrAdminMiddleware(
    req: Request,
    res: Response,
    next: NextFunction,
) {
    const token = req.cookies?.access_token;

    if (!token) {
        return res
            .status(HTTP.UNAUTHORIZED)
            .json({ error: 'Missing access token' });
    }

    const payload = jwtService.verifyAccessToken(token);
    if (!payload) {
        return res
            .status(HTTP.UNAUTHORIZED)
            .json({ error: 'Invalid or expired token' });
    }

    (req as any).user = payload;

    // Check if user is admin or advisor
    try {
        const user = await User.findById(payload.userId);
        if (!user) {
            return res.status(HTTP.NOT_FOUND).json({ error: 'User not found' });
        }

        if (user.type !== 'admin' && user.type !== 'advisor') {
            return res
                .status(HTTP.FORBIDDEN)
                .json({ error: 'Admin or advisor access required' });
        }

        next();
    } catch (error) {
        console.error('Error checking user role:', error);
        return res.status(HTTP.SERVER_ERR).json({ error: 'Internal server error' });
    }
}
