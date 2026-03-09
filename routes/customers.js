/**
 * Customers Routes
 */

const router = require('express').Router();
const { supabase, supabaseAdmin } = require('../config/supabase');
const { protect, adminOnly } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

/* ── GET /api/customers ───────── (admin only) ─── */
router.get('/', protect, adminOnly, asyncHandler(async (req, res) => {
    const { data, error, count } = await supabaseAdmin
        .from('customers')
        .select('*', { count: 'exact' });

    if (error) throw error;
    res.json({ success: true, customers: data, total: count });
}));

/* ── GET /api/customers/:id ────────────────────── */
router.get('/:id', protect, asyncHandler(async (req, res) => {
    const isAdmin = req.user.app_metadata && req.user.app_metadata.role === 'admin';
    const { data, error } = await supabaseAdmin
        .from('customers')
        .select('*')
        .eq('customer_id', req.params.id)
        .single();

    if (error || !data) {
        const err = new Error('Customer not found');
        err.statusCode = 404;
        throw err;
    }

    // Regular users can only see their own customer profile
    if (!isAdmin && data.auth_uid !== req.user.id) {
        const err = new Error('Forbidden');
        err.statusCode = 403;
        throw err;
    }

    res.json({ success: true, customer: data });
}));

/* ── PATCH /api/customers/:id ──────────────────── */
router.patch('/:id', protect, asyncHandler(async (req, res) => {
    const isAdmin = req.user.app_metadata && req.user.app_metadata.role === 'admin';

    // Get current customer
    const { data: curr } = await supabaseAdmin
        .from('customers')
        .select('customer_id, auth_uid')
        .eq('customer_id', req.params.id)
        .single();

    if (!curr || (!isAdmin && curr.auth_uid !== req.user.id)) {
        const err = new Error('Forbidden');
        err.statusCode = 403;
        throw err;
    }

    const allowed = ['first_name', 'last_name', 'phone', 'address', 'city', 'state', 'pin', 'country'];
    const updateData = {};
    allowed.forEach(k => { if (req.body[k] !== undefined) updateData[k] = req.body[k]; });

    const { data, error } = await supabaseAdmin
        .from('customers')
        .update(updateData)
        .eq('customer_id', req.params.id)
        .select()
        .single();

    if (error) throw error;
    res.json({ success: true, customer: data });
}));

module.exports = router;
