/**
 * NextGen Store — Express Backend Server
 * Node.js + Express + Supabase
 */

const express    = require('express');
const cors       = require('cors');
const helmet     = require('helmet');
const morgan     = require('morgan');
const rateLimit  = require('express-rate-limit');
require('dotenv').config();

const productRoutes  = require('./routes/products');
const categoryRoutes = require('./routes/categories');
const orderRoutes    = require('./routes/orders');
const customerRoutes = require('./routes/customers');
const authRoutes     = require('./routes/auth');
const paymentRoutes  = require('./routes/payments');
const dashboardRoutes= require('./routes/dashboard');

const { errorHandler, notFound } = require('./middleware/errorHandler');

const app  = express();
const PORT = process.env.PORT || 5000;

/* ── Security ───────────────────────────────────── */
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false,
}));

/* ── CORS ───────────────────────────────────────── */
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '*').split(',');
app.use(cors({
  origin: allowedOrigins.includes('*') ? '*' : allowedOrigins,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

/* ── Body parsers ───────────────────────────────── */
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

/* ── Logging ────────────────────────────────────── */
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

/* ── Rate limiting ──────────────────────────────── */
const limiter = rateLimit({
  windowMs : 15 * 60 * 1000,   // 15 minutes
  max      : 300,               // requests per window per IP
  message  : { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders  : false,
});
app.use('/api/', limiter);

// Stricter limit for auth endpoints
const authLimiter = rateLimit({
  windowMs : 15 * 60 * 1000,
  max      : 20,
  message  : { error: 'Too many auth attempts. Try again in 15 minutes.' },
});
app.use('/api/auth/', authLimiter);

/* ── Health check ───────────────────────────────── */
app.get('/', (req, res) => {
  res.json({
    service : 'NextGen Store API',
    version : '2.0.0',
    status  : 'online',
    env     : process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    docs    : `${req.protocol}://${req.get('host')}/api`,
  });
});

app.get('/api', (req, res) => {
  res.json({
    message  : 'NextGen Store REST API v2',
    endpoints: {
      auth      : '/api/auth',
      products  : '/api/products',
      categories: '/api/categories',
      orders    : '/api/orders',
      customers : '/api/customers',
      payments  : '/api/payments',
      dashboard : '/api/dashboard',
    },
  });
});

/* ── Routes ─────────────────────────────────────── */
app.use('/api/auth',       authRoutes);
app.use('/api/products',   productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/orders',     orderRoutes);
app.use('/api/customers',  customerRoutes);
app.use('/api/payments',   paymentRoutes);
app.use('/api/dashboard',  dashboardRoutes);

/* ── Error handling ─────────────────────────────── */
app.use(notFound);
app.use(errorHandler);

/* ── Start ──────────────────────────────────────── */
app.listen(PORT, () => {
  console.log(`
  ╔══════════════════════════════════════╗
  ║   NextGen Store API  v2.0.0          ║
  ║   http://localhost:${PORT}              ║
  ║   Env: ${(process.env.NODE_ENV || 'development').padEnd(28)}║
  ╚══════════════════════════════════════╝
  `);
});

module.exports = app;
