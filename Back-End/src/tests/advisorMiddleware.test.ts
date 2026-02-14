import { Request, Response, NextFunction } from 'express';
import { advisorOrAdminMiddleware } from '@middleware/advisorMiddleware';
import { User } from '@models/user';
import { jwtService } from '@services/jwtService';
import HTTP from '@utils/httpCodes';

// Mock dependencies
jest.mock('@services/jwtService', () => ({
    jwtService: {
        verifyAccessToken: jest.fn(),
    },
}));

jest.mock('@models/user', () => ({
    User: {
        findById: jest.fn(),
    },
}));

describe('advisorOrAdminMiddleware', () => {
    let mockReq: Partial<Request>;
    let mockRes: Partial<Response>;
    let mockNext: NextFunction;
    let mockJson: jest.Mock;
    let mockStatus: jest.Mock;

    beforeEach(() => {
        mockJson = jest.fn();
        mockStatus = jest.fn().mockReturnValue({ json: mockJson });
        mockReq = {
            cookies: { access_token: 'valid-token' },
        };
        mockRes = {
            status: mockStatus,
            json: mockJson,
        };
        mockNext = jest.fn();
        jest.clearAllMocks();
    });

    it('should return 401 if no access token in cookies', async () => {
        mockReq.cookies = {};

        await advisorOrAdminMiddleware(mockReq as Request, mockRes as Response, mockNext);

        expect(mockStatus).toHaveBeenCalledWith(HTTP.UNAUTHORIZED);
        expect(mockJson).toHaveBeenCalledWith({ error: 'Missing access token' });
        expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 if token is invalid or expired', async () => {
        (jwtService.verifyAccessToken as jest.Mock).mockReturnValue(null);

        await advisorOrAdminMiddleware(mockReq as Request, mockRes as Response, mockNext);

        expect(jwtService.verifyAccessToken).toHaveBeenCalledWith('valid-token');
        expect(mockStatus).toHaveBeenCalledWith(HTTP.UNAUTHORIZED);
        expect(mockJson).toHaveBeenCalledWith({ error: 'Invalid or expired token' });
        expect(mockNext).not.toHaveBeenCalled();
    });

    it('should call next() for admin user', async () => {
        const payload = { userId: 'user123', type: 'admin' };
        (jwtService.verifyAccessToken as jest.Mock).mockReturnValue(payload);
        (User.findById as jest.Mock).mockResolvedValue({ _id: 'user123', type: 'admin' });

        await advisorOrAdminMiddleware(mockReq as Request, mockRes as Response, mockNext);

        expect(User.findById).toHaveBeenCalledWith('user123');
        expect(mockNext).toHaveBeenCalled();
    });

    it('should call next() for advisor user', async () => {
        const payload = { userId: 'user123', type: 'advisor' };
        (jwtService.verifyAccessToken as jest.Mock).mockReturnValue(payload);
        (User.findById as jest.Mock).mockResolvedValue({ _id: 'user123', type: 'advisor' });

        await advisorOrAdminMiddleware(mockReq as Request, mockRes as Response, mockNext);

        expect(User.findById).toHaveBeenCalledWith('user123');
        expect(mockNext).toHaveBeenCalled();
    });

    it('should return 403 for student user', async () => {
        const payload = { userId: 'user123', type: 'student' };
        (jwtService.verifyAccessToken as jest.Mock).mockReturnValue(payload);
        (User.findById as jest.Mock).mockResolvedValue({ _id: 'user123', type: 'student' });

        await advisorOrAdminMiddleware(mockReq as Request, mockRes as Response, mockNext);

        expect(mockStatus).toHaveBeenCalledWith(HTTP.FORBIDDEN);
        expect(mockJson).toHaveBeenCalledWith({ error: 'Admin or advisor access required' });
        expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 404 if user not found', async () => {
        const payload = { userId: 'user123', type: 'admin' };
        (jwtService.verifyAccessToken as jest.Mock).mockReturnValue(payload);
        (User.findById as jest.Mock).mockResolvedValue(null);

        await advisorOrAdminMiddleware(mockReq as Request, mockRes as Response, mockNext);

        expect(mockStatus).toHaveBeenCalledWith(HTTP.NOT_FOUND);
        expect(mockJson).toHaveBeenCalledWith({ error: 'User not found' });
    });

    it('should handle database errors gracefully', async () => {
        const payload = { userId: 'user123', type: 'admin' };
        (jwtService.verifyAccessToken as jest.Mock).mockReturnValue(payload);
        (User.findById as jest.Mock).mockRejectedValue(new Error('Database error'));

        await advisorOrAdminMiddleware(mockReq as Request, mockRes as Response, mockNext);

        expect(mockStatus).toHaveBeenCalledWith(HTTP.SERVER_ERR);
        expect(mockJson).toHaveBeenCalledWith({ error: 'Internal server error' });
    });

    it('should use userId from JWT payload to look up user', async () => {
        const payload = { userId: 'specificUser456', type: 'admin' };
        (jwtService.verifyAccessToken as jest.Mock).mockReturnValue(payload);
        (User.findById as jest.Mock).mockResolvedValue({ _id: 'specificUser456', type: 'admin' });

        await advisorOrAdminMiddleware(mockReq as Request, mockRes as Response, mockNext);

        expect(User.findById).toHaveBeenCalledWith('specificUser456');
    });

    it('should return 401 when cookies object is undefined', async () => {
        mockReq.cookies = undefined;

        await advisorOrAdminMiddleware(mockReq as Request, mockRes as Response, mockNext);

        expect(mockStatus).toHaveBeenCalledWith(HTTP.UNAUTHORIZED);
        expect(mockJson).toHaveBeenCalledWith({ error: 'Missing access token' });
    });
});
