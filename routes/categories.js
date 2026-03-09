/**
 * Categories Routes
 */

const router = require('express').Router();
const { supabase, supabaseAdmin } = require('../config/supabase');
const { protect, adminOnly } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

/* ── GET /api/categories ────────────────────────── */
router.get('/', asyncHandler(async (req, res) => {
    const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true });

    if (error) throw error;
    res.json({ success: true, categories: data });
}));

/* ── GET /api/categories/:id ────────────────────── */
router.get('/:id', asyncHandler(async (req, res) => {
    const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('category_id', req.params.id)
        .single();

    if (error || !data) {
        const err = new Error('Category not found');
        err.statusCode = 404;
        throw err;
    }
    res.json({ success: true, category: data });
}));

/* ── POST /api/categories ─────── (admin only) ──── */
router.post('/', protect, adminOnly, asyncHandler(async (req, res) => {
    const { name, icon, description, sort_order } = req.body;
    const { data, error } = await supabaseAdmin
        .from('categories')
        .insert({ name, icon, description, sort_order })
        .select()
        .single();

    if (error) throw error;
    res.status(201).json({ success: true, category: data });
}));

module.exports = router;
