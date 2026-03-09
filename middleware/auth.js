/**
 * Authentication middleware
 * Verifies JWT tokens issued by Supabase Auth
 */

const jwt = require('jsonwebtoken');
const { supabase } = require('../config/supabase');
const { asyncHandler } = require('./errorHandler');

/**
 * Protect route — requires a valid Bearer token
 */
const protect = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    const err = new Error('Not authorised — no token provided');
    err.statusCode = 401;
    throw err;
  }

  const token = authHeader.split(' ')[1];

  try {
    // Verify with Supabase — this validates expiry + signature
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      const err = new Error('Not authorised — invalid or expired token');
      err.statusCode = 401;
      throw err;
    }

    req.user = user;
    req.token = token;
    next();
  } catch (e) {
    if (e.statusCode) throw e;
    const err = new Error('Not authorised — token verification failed');
    err.statusCode = 401;
    throw err;
  }
});

/**
 * Optional auth — attaches user if token is present, continues either way
 */
const optionalAuth = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return next();

  const token = authHeader.split(' ')[1];
  try {
    const { data: { user } } = await supabase.auth.getUser(token);
    if (user) { req.user = user; req.token = token; }
  } catch (_) { }
  next();
});

/**
 * Admin guard — checks for service role or custom admin claim
 */
const adminOnly = asyncHandler(async (req, res, next) => {
  if (!req.user) {
    const err = new Error('Not authorised');
    err.statusCode = 401;
    throw err;
  }

  const isAdmin =
    (req.user.app_metadata && req.user.app_metadata.role === 'admin') ||
    (req.user.user_metadata && req.user.user_metadata.is_admin === true);

  if (!isAdmin) {
    const err = new Error('Forbidden — admin access required');
    err.statusCode = 403;
    throw err;
  }

  next();
});

module.exports = { protect, optionalAuth, adminOnly };
