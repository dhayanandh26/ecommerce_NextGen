/**
 * Dashboard / Stats Routes
 */

const router = require('express').Router();
const { supabase, supabaseAdmin } = require('../config/supabase');
const { protect, adminOnly } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

/* ── GET /api/dashboard/stats ── (admin only) ─── */
router.get('/stats', protect, adminOnly, asyncHandler(async (req, res) => {
    // Get counts
    const { count: customers } = await supabaseAdmin.from('customers').select('*', { count: 'exact', head: true });
    const { count: orders } = await supabaseAdmin.from('orders').select('*', { count: 'exact', head: true });
    const { count: products } = await supabaseAdmin.from('products').select('*', { count: 'exact', head: true, eq: { is_active: true } });

    // Get total revenue
    const { data: rev } = await supabaseAdmin.from('payments').select('amount').eq('status', 'completed');
    const revenue = rev?.reduce((s, r) => s + r.amount, 0) || 0;

    // Get recent orders
    const { data: recent } = await supabaseAdmin
        .from('orders')
        .select('order_id, total_amount, status, created_at, customers(first_name, last_name)')
        .order('created_at', { ascending: false })
        .limit(5);

    res.json({
        success: true,
        stats: {
            customers: customers || 0,
            orders: orders || 0,
            products: products || 0,
            revenue,
        },
        recent_orders: recent,
    });
}));

/* ── GET /api/dashboard/me ─────────────────────── */
router.get('/me', protect, asyncHandler(async (req, res) => {
    // Get stats for current user
    const { data: ords } = await supabase
        .from('orders')
        .select('order_id, total_amount, status, created_at', { count: 'exact' })
        .order('created_at', { ascending: false });

    // Get customer id for current user
    const { data: cust } = await supabase
        .from('customers')
        .select('customer_id')
        .eq('auth_uid', req.user.id)
        .single();

    const orders_count = ords?.length || 0;
    const total_spent = ords?.filter(o => o.status !== 'cancelled').reduce((s, o) => s + o.total_amount, 0) || 0;

    res.json({
        success: true,
        stats: {
            orders_count,
            total_spent,
            customer_id: cust?.customer_id,
        },
        recent_orders: ords?.slice(0, 5) || [],
    });
}));

module.exports = router;
