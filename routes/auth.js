/**
 * Auth Routes
 * POST /api/auth/signup
 * POST /api/auth/login
 * POST /api/auth/logout
 * POST /api/auth/refresh
 * GET  /api/auth/me
 * POST /api/auth/forgot-password
 * POST /api/auth/reset-password
 */
// Frontend (Store): https://nextgen-store-frontend-dhaya.netlify.app
// Backend (API): https://nextgen-backend-dhaya-production.up.railway.app

const router = require('express').Router();
const { supabase, supabaseAdmin } = require('../config/supabase');
const { protect } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { signupRules, loginRules, validate } = require('../middleware/validate');

/* ── POST /api/auth/signup ──────────────────────── */
router.post('/signup', signupRules, validate, asyncHandler(async (req, res) => {
  const { email, password, first_name, last_name, phone } = req.body;

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { first_name, last_name, phone: phone || '' },
    },
  });

  if (error) {
    const err = new Error(error.message);
    err.statusCode = 400;
    throw err;
  }

  res.status(201).json({
    success: true,
    message: 'Account created. Check your email to confirm.',
    user: {
      id: data.user && data.user.id,
      email: data.user && data.user.email,
      first_name,
      last_name,
    },
  });
}));

/* ── POST /api/auth/login ───────────────────────── */
router.post('/login', loginRules, validate, asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    const err = new Error('Invalid email or password');
    err.statusCode = 401;
    throw err;
  }

  res.json({
    success: true,
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
    expires_at: data.session.expires_at,
    user: {
      id: data.user.id,
      email: data.user.email,
      first_name: data.user.user_metadata && data.user.user_metadata.first_name,
      last_name: data.user.user_metadata && data.user.user_metadata.last_name,
      phone: data.user.user_metadata && data.user.user_metadata.phone,
    },
  });
}));

/* ── POST /api/auth/logout ──────────────────────── */
router.post('/logout', protect, asyncHandler(async (req, res) => {
  await supabase.auth.signOut();
  res.json({ success: true, message: 'Logged out successfully' });
}));

/* ── POST /api/auth/refresh ─────────────────────── */
router.post('/refresh', asyncHandler(async (req, res) => {
  const { refresh_token } = req.body;
  if (!refresh_token) {
    const err = new Error('Refresh token required');
    err.statusCode = 400;
    throw err;
  }

  const { data, error } = await supabase.auth.refreshSession({ refresh_token });
  if (error) {
    const err = new Error('Invalid or expired refresh token');
    err.statusCode = 401;
    throw err;
  }

  res.json({
    success: true,
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
    expires_at: data.session.expires_at,
  });
}));

/* ── GET /api/auth/me ───────────────────────────── */
router.get('/me', protect, asyncHandler(async (req, res) => {
  const user = req.user;
  res.json({
    success: true,
    user: {
      id: user.id,
      email: user.email,
      first_name: user.user_metadata && user.user_metadata.first_name,
      last_name: user.user_metadata && user.user_metadata.last_name,
      phone: user.user_metadata && user.user_metadata.phone,
      created_at: user.created_at,
    },
  });
}));

/* ── POST /api/auth/forgot-password ─────────────── */
router.post('/forgot-password', asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) {
    const err = new Error('Email is required');
    err.statusCode = 400;
    throw err;
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.APP_URL}/reset-password`,
  });

  // Always return success (don't reveal if email exists)
  res.json({
    success: true,
    message: 'If that email is registered, a reset link has been sent.',
  });
}));

/* ── POST /api/auth/reset-password ──────────────── */
router.post('/reset-password', protect, asyncHandler(async (req, res) => {
  const { new_password } = req.body;
  if (!new_password || new_password.length < 8) {
    const err = new Error('New password must be at least 8 characters');
    err.statusCode = 400;
    throw err;
  }

  const { error } = await supabase.auth.updateUser({ password: new_password });
  if (error) {
    const err = new Error(error.message);
    err.statusCode = 400;
    throw err;
  }

  res.json({ success: true, message: 'Password updated successfully' });
}));

module.exports = router;
