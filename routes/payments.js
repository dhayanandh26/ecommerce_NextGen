/**
 * Payments Routes
 */

const router = require('express').Router();
const { supabase, supabaseAdmin } = require('../config/supabase');
const { protect, adminOnly } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

/* ── GET /api/payments ────────── (admin only) ─── */
router.get('/', protect, adminOnly, asyncHandler(async (req, res) => {
    const { data, error, count } = await supabaseAdmin
        .from('payments')
        .select('*, orders(total_amount, status)', { count: 'exact' });

    if (error) throw error;
    res.json({ success: true, payments: data, total: count });
}));

/* ── GET /api/payments/:id ─────────────────────── */
router.get('/:id', protect, asyncHandler(async (req, res) => {
    const isAdmin = req.user.app_metadata?.role === 'admin';
    const { data, error } = await supabaseAdmin
        .from('payments')
        .select('*, orders!inner(*, customers(customer_id, auth_uid))')
        .eq('payment_id', req.params.id)
        .single();

    if (error || !data) {
        const err = new Error('Payment not found');
        err.statusCode = 404;
        throw err;
    }

    // Regular users can only see their own payments
    if (!isAdmin && data.orders.customers.auth_uid !== req.user.id) {
        const err = new Error('Forbidden');
        err.statusCode = 403;
        throw err;
    }

    res.json({ success: true, payment: data });
}));

/* ── PATCH /api/payments/:id/status (admin only) ─ */
router.patch('/:id/status', protect, adminOnly, asyncHandler(async (req, res) => {
    const { status } = req.body;
    const valid = ['pending', 'completed', 'failed', 'refunded'];
    if (!valid.includes(status)) {
        const err = new Error(`Invalid status. Must be one of: ${valid.join(', ')}`);
        err.statusCode = 400;
        throw err;
    }

    const { data, error } = await supabaseAdmin
        .from('payments')
        .update({ status })
        .eq('payment_id', req.params.id)
        .select()
        .single();

    if (error) throw error;
    res.json({ success: true, payment: data });
}));

module.exports = router;
