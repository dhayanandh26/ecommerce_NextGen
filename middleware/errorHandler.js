/**
 * Express Error Handling Middleware
 */

/**
 * Not Found handler — catches all undefined routes
 */
const notFound = (req, res, next) => {
    const err = new Error(`Not Found — ${req.originalUrl}`);
    err.statusCode = 404;
    next(err);
};

/**
 * Global Error Handler — catches all thrown errors
 */
const errorHandler = (err, req, res, next) => {
    let statusCode = err.statusCode || 500;
    let message = err.message || 'Internal Server Error';

    // Specific Supabase error mapping
    if (err.code === 'PGRST116') { // No single result when expected
        statusCode = 404;
        message = 'Resource not found';
    } else if (err.code === 'PGRST204') { // Resource not found
        statusCode = 404;
        message = 'Resource not found';
    } else if (err.code === '23505') { // Unique constraint violation (duplicate key)
        statusCode = 409;
        message = 'Resource already exists';
    } else if (err.code === '23503') { // Foreign key violation
        statusCode = 400;
        message = 'Invalid reference (foreign key violation)';
    } else if (err.status && err.status >= 400) {
        statusCode = err.status;
    }

    // Response
    res.status(statusCode).json({
        success: false,
        error: {
            message,
            status: statusCode,
            path: req.originalUrl,
            ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
        },
    });

    // Log in non-production
    if (process.env.NODE_ENV !== 'production') {
        console.error(`[Error] ${statusCode} — ${message}`);
        if (statusCode === 500) console.error(err.stack);
    }
};

/**
 * Helper: wraps async route handlers to catch errors and pass to next()
 */
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = { notFound, errorHandler, asyncHandler };
