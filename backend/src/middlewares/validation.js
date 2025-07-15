import { ValidationError } from '../utils/errors.js';

export const validateBody = (schema) => {
  return (req, res, next) => {
    try {
      const validatedData = schema.parse(req.body);
      req.validatedBody = validatedData;
      next();
    } catch (error) {
      next(new ValidationError('Request body validation failed', error.issues));
    }
  };
};

export const validateParams = (schema) => {
  return (req, res, next) => {
    try {
      const validatedData = schema.parse(req.params);
      req.validatedParams = validatedData;
      next();
    } catch (error) {
      next(new ValidationError('Request parameters validation failed', error.issues));
    }
  };
};

export const validateQuery = (schema) => {
  return (req, res, next) => {
    try {
      const validatedData = schema.parse(req.query);
      req.validatedQuery = validatedData;
      next();
    } catch (error) {
      next(new ValidationError('Query parameters validation failed', error.issues));
    }
  };
};

export const validateRequest = (schemas) => {
  return [
    ...(schemas.body ? [validateBody(schemas.body)] : []),
    ...(schemas.params ? [validateParams(schemas.params)] : []),
    ...(schemas.query ? [validateQuery(schemas.query)] : [])
  ];
};