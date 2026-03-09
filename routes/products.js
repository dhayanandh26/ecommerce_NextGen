/**
 * Products Routes
 * GET    /api/products              — list all (filter, search, paginate)
 * GET    /api/products/:id          — get one product
 * POST   /api/products              — create (admin)
 * PUT    /api/products/:id          — full update (admin)
 * PATCH  /api/products/:id          — partial update (admin)
 * DELETE /api/products/:id          — soft-delete (admin)
 * GET    /api/products/:id/related  — related products
 * PATCH  /api/products/:id/stock    — update stock (admin)
 */

const router = require('express').Router();
const { supabase, supabaseAdmin } = require('../config/supabase');
const { protect, adminOnly }      = require('../middleware/auth');
const { asyncHandler }            = require('../middleware/errorHandler');
const {
  createProductRules, paginationRules, validate,
} = require('../middleware/validate');

/* ── Helper: parse pagination ─────────────────── */
const paginate = (query) => {
  const page  = Math.max(1, parseInt(query.page  || 1));
  const limit = Math.min(100, parseInt(query.limit || 20));
  const from  = (page - 1) * limit;
  return { page, limit, from, to: from + limit - 1 };
};

/* ── GET /api/products ─────────────────────────── */
router.get('/', paginationRules, validate, asyncHandler(async (req, res) => {
  const { page, limit, from, to } = paginate(req.query);
  const {
    category, search, badge, min_price, max_price,
    min_rating, in_stock, sort = 'product_id',
  } = req.query;

  let q = supabase
    .from('products_with_category')
    .select('*', { count: 'exact' })
    .range(from, to);

  // Filters
  if (category)   q = q.ilike('category_name', `%${category}%`);
  if (search)     q = q.or(`name.ilike.%${search}%,brand.ilike.%${search}%`);
  if (badge)      q = q.eq('badge', badge.toLowerCase());
  if (min_price)  q = q.gte('price', parseFloat(min_price));
  if (max_price)  q = q.lte('price', parseFloat(max_price));
  if (min_rating) q = q.gte('rating', parseFloat(min_rating));
  if (in_stock === 'true') q = q.gt('stock_quantity', 0);

  // Sorting
  const sortMap = {
    price_asc   : { col: 'price',         asc: true  },
    price_desc  : { col: 'price',         asc: false },
    rating      : { col: 'rating',        asc: false },
    reviews     : { col: 'review_count',  asc: false },
    newest      : { col: 'created_at',    asc: false },
    product_id  : { col: 'product_id',    asc: true  },
  };
  const s = sortMap[sort] || sortMap.product_id;
  q = q.order(s.col, { ascending: s.asc });

  const { data, error, count } = await q;
  if (error) throw error;

  res.json({
    success   : true,
    page,
    limit,
    total     : count,
    total_pages: Math.ceil((count || 0) / limit),
    products  : data,
  });
}));

/* ── GET /api/products/:id ─────────────────────── */
router.get('/:id', asyncHandler(async (req, res) => {
  const { data, error } = await supabase
    .from('products_with_category')
    .select('*')
    .eq('product_id', req.params.id)
    .single();

  if (error || !data) {
    const err = new Error('Product not found');
    err.statusCode = 404;
    throw err;
  }

  res.json({ success: true, product: data });
}));

/* ── GET /api/products/:id/related ─────────────── */
router.get('/:id/related', asyncHandler(async (req, res) => {
  // First get the product's category
  const { data: product } = await supabase
    .from('products')
    .select('category_id')
    .eq('product_id', req.params.id)
    .single();

  if (!product) {
    const err = new Error('Product not found');
    err.statusCode = 404;
    throw err;
  }

  const { data, error } = await supabase
    .from('products_with_category')
    .select('*')
    .eq('category_id', product.category_id)
    .neq('product_id', req.params.id)
    .limit(6);

  if (error) throw error;
  res.json({ success: true, products: data });
}));

/* ── POST /api/products ───────── (admin only) ─── */
router.post(
  '/',
  protect, adminOnly,
  createProductRules, validate,
  asyncHandler(async (req, res) => {
    const { name, brand, description, price, mrp, stock_quantity,
            category_id, image_url, badge } = req.body;

    const { data, error } = await supabaseAdmin
      .from('products')
      .insert({ name, brand, description, price, mrp, stock_quantity,
                category_id, image_url, badge })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ success: true, product: data });
  })
);

/* ── PUT /api/products/:id ─────── (admin only) ─── */
router.put(
  '/:id',
  protect, adminOnly,
  createProductRules, validate,
  asyncHandler(async (req, res) => {
    const { name, brand, description, price, mrp, stock_quantity,
            category_id, image_url, badge } = req.body;

    const { data, error } = await supabaseAdmin
      .from('products')
      .update({ name, brand, description, price, mrp, stock_quantity,
                category_id, image_url, badge })
      .eq('product_id', req.params.id)
      .select()
      .single();

    if (error || !data) {
      const err = new Error('Product not found');
      err.statusCode = 404;
      throw err;
    }
    res.json({ success: true, product: data });
  })
);

/* ── PATCH /api/products/:id ────── (admin only) ─ */
router.patch(
  '/:id',
  protect, adminOnly,
  asyncHandler(async (req, res) => {
    const allowed = ['name','brand','description','price','mrp',
                     'stock_quantity','image_url','badge','is_active'];
    const updates = {};
    allowed.forEach(k => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });

    if (!Object.keys(updates).length) {
      const err = new Error('No valid fields to update');
      err.statusCode = 400;
      throw err;
    }

    const { data, error } = await supabaseAdmin
      .from('products')
      .update(updates)
      .eq('product_id', req.params.id)
      .select()
      .single();

    if (error || !data) {
      const err = new Error('Product not found');
      err.statusCode = 404;
      throw err;
    }
    res.json({ success: true, product: data });
  })
);

/* ── PATCH /api/products/:id/stock  (admin only) ── */
router.patch(
  '/:id/stock',
  protect, adminOnly,
  asyncHandler(async (req, res) => {
    const { stock_quantity } = req.body;
    if (stock_quantity === undefined || isNaN(stock_quantity) || stock_quantity < 0) {
      const err = new Error('stock_quantity must be a non-negative number');
      err.statusCode = 400;
      throw err;
    }

    const { data, error } = await supabaseAdmin
      .from('products')
      .update({ stock_quantity: parseInt(stock_quantity) })
      .eq('product_id', req.params.id)
      .select('product_id, name, stock_quantity')
      .single();

    if (error) throw error;
    res.json({ success: true, product: data });
  })
);

/* ── DELETE /api/products/:id ───── (admin only) ─ */
router.delete(
  '/:id',
  protect, adminOnly,
  asyncHandler(async (req, res) => {
    // Soft delete
    const { error } = await supabaseAdmin
      .from('products')
      .update({ is_active: false })
      .eq('product_id', req.params.id);

    if (error) throw error;
    res.json({ success: true, message: 'Product deactivated' });
  })
);

module.exports = router;
