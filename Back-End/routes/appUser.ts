import HTTP from "@Util/HTTPCodes";
import express, { Request, Response } from "express";
import appUserController from "@controllers/appUserController/appUserController";
import appUserTypes from "@controllers/appUserController/appUser_types"

const router = express.Router();

  router.get('/appUser/update', async (req: Request, res: Response) => {
    const { id, email, password, firstname, lastname, degree, type } = req.query as {
        id: string;
        email: string;
        password: string;
        firstname: string;
        lastname: string;
        degree: string;
        type: appUserTypes.UserType;
      };
  
    try {
      // Validate input
      if (  
        !id || !email || !password || !firstname || !lastname || !degree || !type ||
        typeof id !== 'string' || typeof email !== 'string' || typeof password !== 'string' ||
        typeof firstname !== 'string' || typeof lastname !== 'string' || typeof degree !== 'string' ||
        !Object.values(appUserTypes.UserType).includes(type as appUserTypes.UserType)
        ) {
        res.status(HTTP.BAD_REQUEST).json({
          error: 'Invalid input.',
        });
        return;
      }
  
      // Call the service function
      const updatedAppUser = await appUserController.updateAppUser(id, email, password, firstname, lastname, degree, type);
  
      // Send success response
      res.status(HTTP.OK).json({
        message: 'AppUser updated successfully.',
        appUser: updatedAppUser,
      });
    } catch (error) {
      // Handle errors from the service
      if (error instanceof Error && error.message === 'AppUser with this id does not exist.') {
        res.status(HTTP.FORBIDDEN).json({ error: error.message });
      } else {
        const errMsg = 'Internal server error in /appUser/update';
        console.error(errMsg, error);
        res.status(HTTP.SERVER_ERR).json({ error: errMsg });
      }
    }
  });

  router.get('/appUser/delete', async (req: Request, res: Response) => {
    const { id } = req.query;
  
    try {
      // Validate input
      if (!id || typeof id !== 'string') {
        res.status(HTTP.BAD_REQUEST).json({
          error: 'Invalid input. Please provide id as a string.',
        });
        return;
      }
  
      // Call the service function
        await appUserController.deleteAppUser(id);
  
      // Send success response
      res.status(HTTP.OK).json({
        message: 'AppUser deleted successfully.',
      });
    } catch (error) {
      // Handle errors from the service
      if (error instanceof Error && error.message === 'AppUser with this id does not exist.') {
        res.status(HTTP.FORBIDDEN).json({ error: error.message });
      } else {
        const errMsg = 'Internal server error in /appUser/delete';
        console.error(errMsg, error);
        res.status(HTTP.SERVER_ERR).json({ error: errMsg });
      }
    }
  });
  
  export default router;