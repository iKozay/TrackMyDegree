import { InspectionFiles } from "@services/catalogService";
import HTTP from "./httpCodes";

// Messages
export const INTERNAL_SERVER_ERROR = 'Internal server error';
export const DEGREE_WITH_ID_DOES_NOT_EXIST = 'Degree with this id does not exist.';
export const DATABASE_CONNECTION_NOT_AVAILABLE = 'Database connection not available';
export const QUERY_FAILED = 'Query failed';
export const DELETE_FAILED = 'Delete failed';

// Error classes

// Base error for all operational errors that are safe to expose to clients
export class APIError extends Error {
  public status: number;

  constructor(message: string, status: number = HTTP.SERVER_ERR) {
    super(message);
    this.status = status;
    this.name = this.constructor.name;

    Object.setPrototypeOf(this, new.target.prototype); // fix instanceof
    Error.captureStackTrace?.(this, this.constructor); // clean stack
  }
}

export class NotFoundError extends APIError {
  constructor(message: string = 'Resource not found') {
    super(message, HTTP.NOT_FOUND);
  }
}

export class UnauthorizedError extends APIError {
  constructor(message: string = 'Unauthorized') {
    super(message, HTTP.UNAUTHORIZED);
  }
}

export class ForbiddenError extends APIError {
  constructor(message: string = 'Forbidden') {
    super(message, HTTP.FORBIDDEN);
  }
}

export class BadRequestError extends APIError {
  constructor(message: string = 'Bad request') {
    super(message, HTTP.BAD_REQUEST);
  }
}

export class DatabaseConnectionError extends APIError {
  constructor(message: string = DATABASE_CONNECTION_NOT_AVAILABLE) {
    super(message, HTTP.SERVER_ERR);
  }
}

export class AlreadyExistsError extends APIError {
  constructor(message: string = 'Resource already exists') {
    super(message, HTTP.CONFLICT);
  }
}

export class CatalogError extends APIError {
  inspectionFiles: InspectionFiles;

  constructor(message: string, inspectionFiles: InspectionFiles) {
    super(message, HTTP.SERVER_ERR);
    this.inspectionFiles = inspectionFiles;
  }
}