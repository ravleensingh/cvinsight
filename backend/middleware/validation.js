const { body, validationResult } = require('express-validator');

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);

  if (errors.isEmpty()) {
    return next();
  }

  return res.status(400).json({
    success: false,
    message: 'Validation failed',
    details: errors.array().map(error => ({
      field: error.path,
      message: error.msg
    })),
    data: null
  });
};

const PASSWORD_RULES = [
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/[A-Z]/)
    .withMessage('Password must include at least one uppercase letter')
    .matches(/[a-z]/)
    .withMessage('Password must include at least one lowercase letter')
    .matches(/\d/)
    .withMessage('Password must include at least one number')
    .matches(/[!@#$%^&*(),.?":{}|<>\-_=+\[\]\/\\;'`~]/)
    .withMessage('Password must include at least one special character')
];

const NEW_PASSWORD_RULES = [
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('New password must be at least 8 characters')
    .matches(/[A-Z]/)
    .withMessage('New password must include at least one uppercase letter')
    .matches(/[a-z]/)
    .withMessage('New password must include at least one lowercase letter')
    .matches(/\d/)
    .withMessage('New password must include at least one number')
    .matches(/[!@#$%^&*(),.?":{}|<>\-_=+\[\]\/\\;'`~]/)
    .withMessage('New password must include at least one special character')
];

const signupValidation = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters'),
  body('email')
    .trim()
    .isEmail()
    .withMessage('Valid email is required')
    .normalizeEmail(),
  ...PASSWORD_RULES,
  handleValidationErrors
];

const loginValidation = [
  body('email')
    .trim()
    .isEmail()
    .withMessage('Valid email is required')
    .normalizeEmail(),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  handleValidationErrors
];

const resendOtpValidation = [
  body('email')
    .trim()
    .isEmail()
    .withMessage('Valid email is required')
    .normalizeEmail(),
  body('type')
    .optional()
    .isIn(['signup', 'password-reset', 'account-deletion'])
    .withMessage('Invalid OTP request type'),
  handleValidationErrors
];

const otpValidation = [
  body('email')
    .trim()
    .isEmail()
    .withMessage('Valid email is required')
    .normalizeEmail(),
  body('otp')
    .matches(/^\d{6}$/)
    .withMessage('OTP must be exactly 6 digits'),
  handleValidationErrors
];

const forgotPasswordValidation = [
  body('email')
    .trim()
    .isEmail()
    .withMessage('Valid email is required')
    .normalizeEmail(),
  handleValidationErrors
];

const passwordResetValidation = [
  body('email')
    .trim()
    .isEmail()
    .withMessage('Valid email is required')
    .normalizeEmail(),
  body('otp')
    .matches(/^\d{6}$/)
    .withMessage('OTP must be exactly 6 digits'),
  ...NEW_PASSWORD_RULES,
  handleValidationErrors
];

const profileUpdateValidation = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters'),
  handleValidationErrors
];

module.exports = {
  signupValidation,
  loginValidation,
  resendOtpValidation,
  otpValidation,
  forgotPasswordValidation,
  passwordResetValidation,
  profileUpdateValidation,
  handleValidationErrors
};
