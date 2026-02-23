import { body, param, query, validationResult } from 'express-validator';

// Middleware to handle validation errors
export function handleValidationErrors(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.warn('Validation failed:', errors.array());
    return res.status(400).json({
      success: false,
      error: 'Invalid input data',
      details: errors.array().map(error => ({
        field: error.path,
        message: error.msg,
      })),
    });
  }
  next();
}

// Video ID validation (UUID format)
export const validateVideoId = [
  param('id')
    .isUUID(4)
    .withMessage('Invalid video ID format')
    .escape(),
  handleValidationErrors,
];

// Upload validation
export const validateUpload = [
  body('isPrivate')
    .optional()
    .isBoolean({ strict: false })
    .withMessage('isPrivate must be true or false')
    .toBoolean(),
  handleValidationErrors,
];

// Privacy update validation
export const validatePrivacyUpdate = [
  param('id')
    .isUUID(4)
    .withMessage('Invalid video ID format')
    .escape(),
  body('isPrivate')
    .isBoolean({ strict: false })
    .withMessage('isPrivate must be true or false')
    .toBoolean(),
  handleValidationErrors,
];

// Access code validation  
export const validateAccessCode = [
  param('id')
    .isUUID(4)
    .withMessage('Invalid video ID format')
    .escape(),
  query('accessCode')
    .isLength({ min: 1, max: 20 })
    .withMessage('Access code must be 1-20 characters')
    .isAlphanumeric()
    .withMessage('Access code must contain only letters and numbers')
    .escape(),
  handleValidationErrors,
];

// Search validation
export const validateSearch = [
  query('q')
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage('Search query must be 1-100 characters')
    .trim()
    .escape(),
  query('page')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Page must be a number between 1 and 100')
    .toInt(),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit must be a number between 1 and 50')
    .toInt(),
  handleValidationErrors,
];

// Uploader ID validation
export const validateUploaderId = [
  param('uploaderId')
    .isUUID(4)
    .withMessage('Invalid uploader ID format')
    .escape(),
  handleValidationErrors,
];

// View increment validation
export const validateViewIncrement = [
  param('id')
    .isUUID(4)
    .withMessage('Invalid video ID format')
    .escape(),
  handleValidationErrors,
];