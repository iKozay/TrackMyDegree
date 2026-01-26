"use strict";
/**
 * User Routes
 *
 * Handles user CRUD operations, deficiencies, and exemptions
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const HTTPCodes_1 = __importDefault(require("../../Util/HTTPCodes"));
const express_1 = __importDefault(require("express"));
const mondoDBControllers_1 = require("../../controllers/mondoDBControllers");
const router = express_1.default.Router();
// ==========================
// USER ROUTES (CRUD)
// ==========================
const INTERNAL_SERVER_ERROR = 'Internal server error';
const USER_ID_REQUIRED = 'User ID is required';
const DOES_NOT_EXIST = 'does not exist';
/**
 * POST /users - Create user
 */
router.post('/', async (req, res) => {
    try {
        const userData = req.body;
        if (!userData.email || !userData.fullname || !userData.type) {
            res.status(HTTPCodes_1.default.BAD_REQUEST).json({
                error: 'Email, fullname, and type are required',
            });
            return;
        }
        const user = await mondoDBControllers_1.userController.createUser(userData);
        res.status(HTTPCodes_1.default.CREATED).json({
            message: 'User created successfully',
            user,
        });
    }
    catch (error) {
        console.error('Error in POST /users', error);
        if (error instanceof Error && error.message.includes('already exists')) {
            res.status(HTTPCodes_1.default.CONFLICT).json({ error: error.message });
        }
        else {
            res.status(HTTPCodes_1.default.SERVER_ERR).json({ error: INTERNAL_SERVER_ERROR });
        }
    }
});
/**
 * GET /users/:id - Get user by ID
 */
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) {
            res.status(HTTPCodes_1.default.BAD_REQUEST).json({
                error: USER_ID_REQUIRED,
            });
            return;
        }
        const user = await mondoDBControllers_1.userController.getUserById(id);
        res.status(HTTPCodes_1.default.OK).json({
            message: 'User retrieved successfully',
            user,
        });
    }
    catch (error) {
        console.error('Error in GET /users/:id', error);
        if (error instanceof Error && error.message.includes(DOES_NOT_EXIST)) {
            res.status(HTTPCodes_1.default.NOT_FOUND).json({ error: error.message });
        }
        else {
            res.status(HTTPCodes_1.default.SERVER_ERR).json({ error: INTERNAL_SERVER_ERROR });
        }
    }
});
/**
 * GET /users - Get all users
 */
router.get('/', async (req, res) => {
    try {
        const users = await mondoDBControllers_1.userController.getAllUsers();
        res.status(HTTPCodes_1.default.OK).json({
            message: 'Users retrieved successfully',
            users,
        });
    }
    catch (error) {
        console.error('Error in GET /users', error);
        res.status(HTTPCodes_1.default.SERVER_ERR).json({ error: INTERNAL_SERVER_ERROR });
    }
});
/**
 * PUT /users/:id - Update user
 */
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        if (!id) {
            res.status(HTTPCodes_1.default.BAD_REQUEST).json({
                error: USER_ID_REQUIRED,
            });
            return;
        }
        const user = await mondoDBControllers_1.userController.updateUser(id, updates);
        res.status(HTTPCodes_1.default.OK).json({
            message: 'User updated successfully',
            user,
        });
    }
    catch (error) {
        console.error('Error in PUT /users/:id', error);
        if (error instanceof Error && error.message.includes(DOES_NOT_EXIST)) {
            res.status(HTTPCodes_1.default.NOT_FOUND).json({ error: error.message });
        }
        else {
            res.status(HTTPCodes_1.default.SERVER_ERR).json({ error: INTERNAL_SERVER_ERROR });
        }
    }
});
/**
 * DELETE /users/:id - Delete user
 */
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) {
            res.status(HTTPCodes_1.default.BAD_REQUEST).json({
                error: USER_ID_REQUIRED,
            });
            return;
        }
        const message = await mondoDBControllers_1.userController.deleteUser(id);
        res.status(HTTPCodes_1.default.OK).json({
            message,
        });
    }
    catch (error) {
        console.error('Error in DELETE /users/:id', error);
        if (error instanceof Error && error.message.includes(DOES_NOT_EXIST)) {
            res.status(HTTPCodes_1.default.NOT_FOUND).json({ error: error.message });
        }
        else {
            res.status(HTTPCodes_1.default.SERVER_ERR).json({ error: INTERNAL_SERVER_ERROR });
        }
    }
});
/**
 * GET /users/:id/data - Get comprehensive user data
 */
router.get('/:id/data', async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) {
            res.status(HTTPCodes_1.default.BAD_REQUEST).json({
                error: USER_ID_REQUIRED,
            });
            return;
        }
        const userData = await mondoDBControllers_1.userController.getUserData(id);
        res.status(HTTPCodes_1.default.OK).json({
            message: 'User data retrieved successfully',
            ...userData,
        });
    }
    catch (error) {
        console.error('Error in GET /users/:id/data', error);
        if (error instanceof Error && error.message.includes(DOES_NOT_EXIST)) {
            res.status(HTTPCodes_1.default.NOT_FOUND).json({ error: error.message });
        }
        else {
            res.status(HTTPCodes_1.default.SERVER_ERR).json({ error: INTERNAL_SERVER_ERROR });
        }
    }
});
// ==========================
// DEFICIENCY ROUTES
// ==========================
const DEFICIENCIES_PATH = '/:userId/deficiencies';
/**
 * POST /users/:userId/deficiencies - Create deficiency
 */
router.post(DEFICIENCIES_PATH, async (req, res) => {
    try {
        const { userId } = req.params;
        const { coursepool, creditsRequired } = req.body;
        if (!userId || !coursepool || typeof creditsRequired !== 'number') {
            res.status(HTTPCodes_1.default.BAD_REQUEST).json({
                error: 'User ID, coursepool, and creditsRequired are required',
            });
            return;
        }
        const deficiency = await mondoDBControllers_1.userController.createDeficiency(coursepool, userId, creditsRequired);
        res.status(HTTPCodes_1.default.CREATED).json({
            message: 'Deficiency created successfully',
            deficiency,
        });
    }
    catch (error) {
        console.error('Error in POST /users/:userId/deficiencies', error);
        if (error instanceof Error && error.message.includes(DOES_NOT_EXIST)) {
            res.status(HTTPCodes_1.default.NOT_FOUND).json({ error: error.message });
        }
        else if (error instanceof Error &&
            error.message.includes('already exists')) {
            res.status(HTTPCodes_1.default.CONFLICT).json({ error: error.message });
        }
        else {
            res.status(HTTPCodes_1.default.SERVER_ERR).json({ error: INTERNAL_SERVER_ERROR });
        }
    }
});
/**
 * GET /users/:userId/deficiencies - Get user deficiencies
 */
router.get(DEFICIENCIES_PATH, async (req, res) => {
    try {
        const { userId } = req.params;
        if (!userId) {
            res.status(HTTPCodes_1.default.BAD_REQUEST).json({
                error: USER_ID_REQUIRED,
            });
            return;
        }
        const deficiencies = await mondoDBControllers_1.userController.getAllDeficienciesByUser(userId);
        res.status(HTTPCodes_1.default.OK).json({
            message: 'Deficiencies retrieved successfully',
            deficiencies,
        });
    }
    catch (error) {
        console.error('Error in GET /users/:userId/deficiencies', error);
        if (error instanceof Error && error.message.includes(DOES_NOT_EXIST)) {
            res.status(HTTPCodes_1.default.NOT_FOUND).json({ error: error.message });
        }
        else {
            res.status(HTTPCodes_1.default.SERVER_ERR).json({ error: INTERNAL_SERVER_ERROR });
        }
    }
});
/**
 * PUT /users/:userId/deficiencies - Update deficiency
 */
router.put(DEFICIENCIES_PATH, async (req, res) => {
    try {
        const { userId } = req.params;
        const { coursepool, creditsRequired } = req.body;
        if (!userId || !coursepool || typeof creditsRequired !== 'number') {
            res.status(HTTPCodes_1.default.BAD_REQUEST).json({
                error: 'User ID, coursepool, and creditsRequired are required',
            });
            return;
        }
        const deficiency = await mondoDBControllers_1.userController.updateDeficiency(coursepool, userId, creditsRequired);
        res.status(HTTPCodes_1.default.OK).json({
            message: 'Deficiency updated successfully',
            deficiency,
        });
    }
    catch (error) {
        console.error('Error in PUT /users/:userId/deficiencies', error);
        if (error instanceof Error && error.message.includes('not found')) {
            res.status(HTTPCodes_1.default.NOT_FOUND).json({ error: error.message });
        }
        else {
            res.status(HTTPCodes_1.default.SERVER_ERR).json({ error: INTERNAL_SERVER_ERROR });
        }
    }
});
/**
 * DELETE /users/:userId/deficiencies - Delete deficiency
 */
router.delete(DEFICIENCIES_PATH, async (req, res) => {
    try {
        const { userId } = req.params;
        const { coursepool } = req.body;
        if (!userId || !coursepool) {
            res.status(HTTPCodes_1.default.BAD_REQUEST).json({
                error: 'User ID and coursepool are required',
            });
            return;
        }
        const message = await mondoDBControllers_1.userController.deleteDeficiency(coursepool, userId);
        res.status(HTTPCodes_1.default.OK).json({
            message,
        });
    }
    catch (error) {
        console.error('Error in DELETE /users/:userId/deficiencies', error);
        if (error instanceof Error && error.message.includes(DOES_NOT_EXIST)) {
            res.status(HTTPCodes_1.default.NOT_FOUND).json({ error: error.message });
        }
        else {
            res.status(HTTPCodes_1.default.SERVER_ERR).json({ error: INTERNAL_SERVER_ERROR });
        }
    }
});
// ==========================
// EXEMPTION ROUTES
// ==========================
const EXEMPTION_PATH = '/:userId/exemptions';
/**
 * POST /users/:userId/exemptions - Create exemptions
 */
router.post(EXEMPTION_PATH, async (req, res) => {
    try {
        const { userId } = req.params;
        const { coursecodes } = req.body;
        if (!userId || !Array.isArray(coursecodes)) {
            res.status(HTTPCodes_1.default.BAD_REQUEST).json({
                error: 'User ID and coursecodes array are required',
            });
            return;
        }
        const result = await mondoDBControllers_1.userController.createExemptions(coursecodes, userId);
        res.status(HTTPCodes_1.default.CREATED).json({
            message: 'Exemptions processed successfully',
            ...result,
        });
    }
    catch (error) {
        console.error('Error in POST /users/:userId/exemptions', error);
        if (error instanceof Error && error.message.includes(DOES_NOT_EXIST)) {
            res.status(HTTPCodes_1.default.NOT_FOUND).json({ error: error.message });
        }
        else {
            res.status(HTTPCodes_1.default.SERVER_ERR).json({ error: INTERNAL_SERVER_ERROR });
        }
    }
});
/**
 * GET /users/:userId/exemptions - Get user exemptions
 */
router.get(EXEMPTION_PATH, async (req, res) => {
    try {
        const { userId } = req.params;
        if (!userId) {
            res.status(HTTPCodes_1.default.BAD_REQUEST).json({
                error: USER_ID_REQUIRED,
            });
            return;
        }
        const exemptions = await mondoDBControllers_1.userController.getAllExemptionsByUser(userId);
        res.status(HTTPCodes_1.default.OK).json({
            message: 'Exemptions retrieved successfully',
            exemptions,
        });
    }
    catch (error) {
        console.error('Error in GET /users/:userId/exemptions', error);
        if (error instanceof Error && error.message.includes(DOES_NOT_EXIST)) {
            res.status(HTTPCodes_1.default.NOT_FOUND).json({ error: error.message });
        }
        else {
            res.status(HTTPCodes_1.default.SERVER_ERR).json({ error: INTERNAL_SERVER_ERROR });
        }
    }
});
/**
 * DELETE /users/:userId/exemptions - Delete exemption
 */
router.delete(EXEMPTION_PATH, async (req, res) => {
    try {
        const { userId } = req.params;
        const { coursecode } = req.body;
        if (!userId || !coursecode) {
            res.status(HTTPCodes_1.default.BAD_REQUEST).json({
                error: 'User ID and coursecode are required',
            });
            return;
        }
        const message = await mondoDBControllers_1.userController.deleteExemption(coursecode, userId);
        res.status(HTTPCodes_1.default.OK).json({
            message,
        });
    }
    catch (error) {
        console.error('Error in DELETE /users/:userId/exemptions', error);
        if (error instanceof Error && error.message.includes(DOES_NOT_EXIST)) {
            res.status(HTTPCodes_1.default.NOT_FOUND).json({ error: error.message });
        }
        else {
            res.status(HTTPCodes_1.default.SERVER_ERR).json({ error: INTERNAL_SERVER_ERROR });
        }
    }
});
exports.default = router;
//# sourceMappingURL=userRoutes.js.map