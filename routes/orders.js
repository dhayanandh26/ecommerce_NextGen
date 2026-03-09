/**
 * Orders Routes
 * POST  /api/orders           — place order (public/auth)
 * GET   /api/orders           — list orders (admin) / own orders (user)
 * GET   /api/orders/:id       — get one order
 * PATCH /api/orders/:id/status — update status (admin)
 * POST  /api/orders/:id/cancel — cancel order
 */

const router = require('express').Router();
const { supabase, supabaseAdmin } = require('../config/supabase');
const { protect, optionalAuth, adminOnly } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { createOrderRules, validate, paginationRules } = require('../middleware/validate');

const paginate = (q) => {
  const page = Math.max(1, parseInt(q.page || 1));
  const limit = Math.min(100, parseInt(q.limit || 20));
  const from = (page - 1) * limit;
  return { page, limit, from, to: from + limit - 1 };
};

/* ── POST /api/orders ──────────────────────────── */
router.post(
  '/',
  optionalAuth,
  createOrderRules, validate,
  asyncHandler(async (req, res) => {
    const {
      customer, shipping_address, city, state, pin,
      items, payment_method, notes,
    } = req.body;

    const db = supabaseAdmin || supabase;

    /* 1. Verify products & calculate total */
    const productIds = items.map(i => i.product_id);
    const { data: products, error: pErr } = await db
      .from('products')
      .select('product_id, name, price, stock_quantity')
      .in('product_id', productIds)
      .eq('is_active', true);

    if (pErr) throw pErr;

    let subtotal = 0;
    const validatedItems = [];

    for (const item of items) {
      const product = products.find(p => p.product_id === item.product_id);
      if (!product) {
        const err = new Error(`Product ${item.product_id} not found`);
        err.statusCode = 400;
        throw err;
      }
      if (product.stock_quantity < item.quantity) {
        const err = new Error(`Insufficient stock for "${product.name}" (${product.stock_quantity} available)`);
        err.statusCode = 400;
        throw err;
      }
      const lineTotal = product.price * item.quantity;
      subtotal += lineTotal;
      validatedItems.push({
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: product.price,
      });
    }

    const delivery = subtotal >= 499 ? 0 : 49;
    const totalAmount = subtotal + delivery;

    /* 2. Create or reuse customer */
    let customerId;
    if (req.user) {
      // Logged-in user — look up by auth UID
      const { data: existing } = await db
        .from('customers')
        .select('customer_id')
        .eq('auth_uid', req.user.id)
        .single();
      customerId = existing && existing.customer_id;
    }

    if (!customerId) {
      const { data: newCust, error: cErr } = await db
        .from('customers')
        .insert({
          first_name: customer.first_name,
          last_name: customer.last_name || '',
          email: customer.email || `guest_${Date.now()}@nextgen.in`,
          phone: customer.phone,
          address: shipping_address,
          city,
          country: 'India',
          auth_uid: (req.user && req.user.id) || null,
        })
        .select('customer_id')
        .single();
      if (cErr) throw cErr;
      customerId = newCust.customer_id;
    }

    /* 3. Create order */
    const { data: order, error: oErr } = await db
      .from('orders')
      .insert({
        customer_id: customerId,
        total_amount: totalAmount,
        status: 'pending',
        shipping_address: `${shipping_address}, ${city}, ${state} - ${pin}`,
        notes: notes || null,
      })
      .select('order_id')
      .single();
    if (oErr) throw oErr;

    /* 4. Create order items */
    const { error: iErr } = await db
      .from('order_items')
      .insert(validatedItems.map(v => ({ ...v, order_id: order.order_id })));
    if (iErr) throw iErr;

    /* 5. Create payment record */
    const { error: pmErr } = await db
      .from('payments')
      .insert({
        order_id: order.order_id,
        amount: totalAmount,
        payment_method: payment_method,
        status: payment_method === 'cash_on_delivery' ? 'pending' : 'completed',
      });
    if (pmErr) throw pmErr;

    /* 6. Decrement stock */
    for (const item of validatedItems) {
      await db.rpc('decrement_stock', {
        p_product_id: item.product_id,
        p_quantity: item.quantity,
      });
    }

    res.status(201).json({
      success: true,
      order_id: `NGS-${order.order_id.toString().padStart(8, '0')}`,
      db_order_id: order.order_id,
      total: totalAmount,
      delivery,
      payment_method,
      message: 'Order placed successfully',
    });
  })
);

/* ── GET /api/orders ───────────────────────────── */
router.get(
  '/',
  protect,
  paginationRules, validate,
  asyncHandler(async (req, res) => {
    const { page, limit, from, to } = paginate(req.query);
    const isAdmin = req.user.app_metadata?.role === 'admin';
    const { status } = req.query;

    let q = supabase
      .from('orders')
      .select(`
        order_id, total_amount, status, shipping_address,
        created_at, updated_at,
        customers ( customer_id, first_name, last_name, email, phone ),
        order_items (
          item_id, quantity, unit_price,
          products ( product_id, name, image_url )
        ),
        payments ( payment_id, payment_method, status )
      `, { count: 'exact' })
      .range(from, to)
      .order('created_at', { ascending: false });

    if (!isAdmin) {
      // Regular users can only see their own orders
      const { data: cust } = await supabase
        .from('customers')
        .select('customer_id')
        .eq('auth_uid', req.user.id)
        .single();
      if (cust) q = q.eq('customer_id', cust.customer_id);
      else return res.json({ success: true, orders: [], total: 0 });
    }

    if (status) q = q.eq('status', status);

    const { data, error, count } = await q;
    if (error) throw error;

    res.json({
      success: true,
      page, limit,
      total: count,
      total_pages: Math.ceil((count || 0) / limit),
      orders: data,
    });
  })
);

/* ── GET /api/orders/:id ───────────────────────── */
router.get('/:id', protect, asyncHandler(async (req, res) => {
  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      customers ( * ),
      order_items (
        *,
        products ( product_id, name, brand, image_url, price )
      ),
      payments ( * )
    `)
    .eq('order_id', req.params.id)
    .single();

  if (error || !data) {
    const err = new Error('Order not found');
    err.statusCode = 404;
    throw err;
  }

  res.json({ success: true, order: data });
}));

/* ── PATCH /api/orders/:id/status ─── (admin) ──── */
router.patch(
  '/:id/status',
  protect, adminOnly,
  asyncHandler(async (req, res) => {
    const { status } = req.body;
    const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      const err = new Error(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
      err.statusCode = 400;
      throw err;
    }

    const { data, error } = await supabaseAdmin
      .from('orders')
      .update({ status })
      .eq('order_id', req.params.id)
      .select('order_id, status, updated_at')
      .single();

    if (error) throw error;
    res.json({ success: true, order: data });
  })
);

/* ── POST /api/orders/:id/cancel ───────────────── */
router.post('/:id/cancel', protect, asyncHandler(async (req, res) => {
  const { data: order, error: oErr } = await supabase
    .from('orders')
    .select('order_id, status, customer_id')
    .eq('order_id', req.params.id)
    .single();

  if (oErr || !order) {
    const err = new Error('Order not found');
    err.statusCode = 404;
    throw err;
  }

  if (!['pending', 'processing'].includes(order.status)) {
    const err = new Error(`Cannot cancel order with status: ${order.status}`);
    err.statusCode = 400;
    throw err;
  }

  const db = supabaseAdmin || supabase;
  const { error } = await db
    .from('orders')
    .update({ status: 'cancelled' })
    .eq('order_id', req.params.id);

  if (error) throw error;
  res.json({ success: true, message: 'Order cancelled successfully' });
}));

module.exports = router;
