import { Request, Response, NextFunction } from 'express';
import { advisorOrAdminMiddleware } from '@middleware/advisorMiddleware';
import { authMiddleware } from '@middleware/authMiddleware';
import { User } from '@models/user';
import HTTP from '@utils/httpCodes';

// Mock dependencies
jest.mock('@middleware/authMiddleware', () => ({
    authMiddleware: jest.fn(),
}));

jest.mock('@models/user', () => ({
    User: {
        findById: jest.fn(),
    },
}));

describe('advisorOrAdminMiddleware', () => {
    let mockReq: Partial<Request> & { user?: any };
    let mockRes: Partial<Response>;
    let mockNext: NextFunction;
    let mockJson: jest.Mock;
    let mockStatus: jest.Mock;

    beforeEach(() => {
        mockJson = jest.fn();
        mockStatus = jest.fn().mockReturnValue({ json: mockJson });
        mockReq = {
            user: { userId: 'user123' },
        };
        mockRes = {
            status: mockStatus,
            json: mockJson,
        };
        mockNext = jest.fn();
        jest.clearAllMocks();
    });

    it('should call next() for admin user', async () => {
        const adminUser = { _id: 'user123', type: 'admin' };

        // Mock authMiddleware to call next immediately
        (authMiddleware as jest.Mock).mockImplementation((_req, _res, next) => {
            next();
        });

        (User.findById as jest.Mock).mockResolvedValue(adminUser);

        await advisorOrAdminMiddleware(mockReq as Request, mockRes as Response, mockNext);

        expect(mockNext).toHaveBeenCalled();
    });

    it('should call next() for advisor user', async () => {
        const advisorUser = { _id: 'user123', type: 'advisor' };

        (authMiddleware as jest.Mock).mockImplementation((_req, _res, next) => {
            next();
        });

        (User.findById as jest.Mock).mockResolvedValue(advisorUser);

        await advisorOrAdminMiddleware(mockReq as Request, mockRes as Response, mockNext);

        expect(mockNext).toHaveBeenCalled();
    });

    it('should return 403 for student user', async () => {
        const studentUser = { _id: 'user123', type: 'student' };

        (authMiddleware as jest.Mock).mockImplementation((_req, _res, next) => {
            next();
        });

        (User.findById as jest.Mock).mockResolvedValue(studentUser);

        await advisorOrAdminMiddleware(mockReq as Request, mockRes as Response, mockNext);

        expect(mockStatus).toHaveBeenCalledWith(HTTP.FORBIDDEN);
        expect(mockJson).toHaveBeenCalledWith({ error: 'Access denied. Admin or advisor privileges required.' });
        expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 404 if user not found', async () => {
        (authMiddleware as jest.Mock).mockImplementation((_req, _res, next) => {
            next();
        });

        (User.findById as jest.Mock).mockResolvedValue(null);

        await advisorOrAdminMiddleware(mockReq as Request, mockRes as Response, mockNext);

        expect(mockStatus).toHaveBeenCalledWith(HTTP.NOT_FOUND);
        expect(mockJson).toHaveBeenCalledWith({ error: 'User not found' });
    });

    it('should handle database errors gracefully', async () => {
        (authMiddleware as jest.Mock).mockImplementation((_req, _res, next) => {
            next();
        });

        (User.findById as jest.Mock).mockRejectedValue(new Error('Database error'));

        await advisorOrAdminMiddleware(mockReq as Request, mockRes as Response, mockNext);

        expect(mockStatus).toHaveBeenCalledWith(HTTP.SERVER_ERR);
    });

    it('should not proceed if authMiddleware fails', async () => {
        (authMiddleware as jest.Mock).mockImplementation((_req, res, _next) => {
            res.status(HTTP.UNAUTHORIZED).json({ error: 'Unauthorized' });
        });

        await advisorOrAdminMiddleware(mockReq as Request, mockRes as Response, mockNext);

        expect(User.findById).not.toHaveBeenCalled();
        expect(mockNext).not.toHaveBeenCalled();
    });

    it('should use userId from request object set by authMiddleware', async () => {
        const adminUser = { _id: 'specificUser456', type: 'admin' };
        mockReq.user = { userId: 'specificUser456' };

        (authMiddleware as jest.Mock).mockImplementation((_req, _res, next) => {
            next();
        });

        (User.findById as jest.Mock).mockResolvedValue(adminUser);

        await advisorOrAdminMiddleware(mockReq as Request, mockRes as Response, mockNext);

        expect(User.findById).toHaveBeenCalledWith('specificUser456');
    });
});
