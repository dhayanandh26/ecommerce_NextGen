/**
 * Validation Middleware
 * Uses express-validator style but simplified for this implementation
 */

const { validationResult, body, query } = require('express-validator');

/**
 * Handle validation errors
 */
const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (errors.isEmpty()) return next();

    res.status(400).json({
        success: false,
        errors: errors.array().map(e => ({ field: e.path, message: e.msg })),
    });
};

/* ── Rules ────────────────────────────────────── */

const signupRules = [
    body('email').isEmail().withMessage('Invalid email address'),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    body('first_name').notEmpty().withMessage('First name is required'),
];

const loginRules = [
    body('email').isEmail().withMessage('Invalid email address'),
    body('password').notEmpty().withMessage('Password is required'),
];

const createOrderRules = [
    body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
    body('items.*.product_id').notEmpty().withMessage('Product ID is required'),
    body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
    body('payment_method').notEmpty().withMessage('Payment method is required'),
];

const createProductRules = [
    body('name').notEmpty().withMessage('Product name is required'),
    body('price').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
    body('category_id').notEmpty().withMessage('Category is required'),
];

const paginationRules = [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be at least 1'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
];

module.exports = {
    validate,
    signupRules,
    loginRules,
    createOrderRules,
    createProductRules,
    paginationRules,
};
