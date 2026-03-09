# NextGen Store — Backend API

Express.js REST API connected to Supabase. Deploy to Railway, Render, or any Node host.

---

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Copy env file and fill in values
cp .env.example .env

# 3. Run the schema files in Supabase SQL Editor:
#    - supabase_schema.sql         (tables + seed data)
#    - supabase_backend_additions.sql  (RPCs + triggers)

# 4. Start development server
npm run dev

# Server runs at http://localhost:5000
```

---

## Project Structure

```
backend/
├── server.js                      # Entry point
├── package.json
├── .env.example                   # Copy to .env
├── Procfile                       # Railway / Heroku
├── railway.json                   # Railway config
├── config/
│   └── supabase.js               # Supabase client (anon + admin)
├── middleware/
│   ├── auth.js                   # JWT protect / adminOnly
│   ├── errorHandler.js           # Global error + asyncHandler
│   └── validate.js               # express-validator rules
├── routes/
│   ├── auth.js                   # /api/auth/*
│   ├── products.js               # /api/products/*
│   ├── categories.js             # /api/categories/*
│   ├── orders.js                 # /api/orders/*
│   ├── customers.js              # /api/customers/*
│   ├── payments.js               # /api/payments/*
│   └── dashboard.js              # /api/dashboard/*
├── tests/
│   └── api.test.js
├── supabase_schema.sql            # Run first in Supabase
└── supabase_backend_additions.sql # Run second in Supabase
```

---

## API Reference

All responses follow this shape:
```json
{ "success": true, "data": ... }
{ "success": false, "error": "message", "details": [...] }
```

Authentication: `Authorization: Bearer <supabase_access_token>`

---

### Auth  `/api/auth`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/signup` | ❌ | Register new user |
| POST | `/login` | ❌ | Login, get JWT |
| POST | `/logout` | ✅ | Invalidate session |
| POST | `/refresh` | ❌ | Refresh access token |
| GET | `/me` | ✅ | Get current user |
| POST | `/forgot-password` | ❌ | Send reset email |
| POST | `/reset-password` | ✅ | Change password |

**POST /api/auth/signup**
```json
{
  "email": "user@example.com",
  "password": "minlength8",
  "first_name": "Dhayanandh",
  "last_name": "D",
  "phone": "9876543210"
}
```

**POST /api/auth/login**
```json
{ "email": "user@example.com", "password": "yourpassword" }
```
Returns: `{ access_token, refresh_token, expires_at, user }`

---

### Products  `/api/products`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/` | ❌ | List products (filter/search/paginate) |
| GET | `/:id` | ❌ | Get one product |
| GET | `/:id/related` | ❌ | Related products |
| POST | `/` | Admin | Create product |
| PUT | `/:id` | Admin | Replace product |
| PATCH | `/:id` | Admin | Partial update |
| PATCH | `/:id/stock` | Admin | Update stock only |
| DELETE | `/:id` | Admin | Soft delete |

**Query params for GET /**
```
?category=Electronics   filter by category name
?search=samsung         search name/brand
?badge=deal             filter by badge
?min_price=1000         price range
?max_price=50000
?min_rating=4.5         minimum rating
?in_stock=true          only in-stock items
?sort=price_asc         price_asc | price_desc | rating | reviews | newest
?page=1&limit=20        pagination
```

---

### Orders  `/api/orders`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/` | Optional | Place order |
| GET | `/` | ✅ | Own orders (or all if admin) |
| GET | `/:id` | ✅ | Get order details |
| PATCH | `/:id/status` | Admin | Update order status |
| POST | `/:id/cancel` | ✅ | Cancel order |

**POST /api/orders**
```json
{
  "customer": {
    "first_name": "Dhayanandh",
    "last_name": "D",
    "phone": "9876543210",
    "email": "d@example.com"
  },
  "shipping_address": "12, 3rd Street, Anna Nagar",
  "city": "Chennai",
  "state": "Tamil Nadu",
  "pin": "600040",
  "items": [
    { "product_id": 1, "quantity": 1 },
    { "product_id": 14, "quantity": 2 }
  ],
  "payment_method": "upi",
  "notes": "Leave at door"
}
```

Returns:
```json
{
  "success": true,
  "order_id": "NGS-00000042",
  "db_order_id": 42,
  "total": 141597,
  "delivery": 0,
  "payment_method": "upi"
}
```

---

### Categories  `/api/categories`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/` | ❌ | List all |
| GET | `/:id` | ❌ | Get one |
| POST | `/` | Admin | Create |
| PUT | `/:id` | Admin | Update |

---

### Customers  `/api/customers`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/` | Admin | List all customers |
| GET | `/:id` | ✅ | Get customer |
| PATCH | `/:id` | ✅ | Update profile |

---

### Payments  `/api/payments`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/` | Admin | List all payments |
| GET | `/:id` | ✅ | Get payment |
| PATCH | `/:id/status` | Admin | Update status |

---

### Dashboard  `/api/dashboard`  (Admin only)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Summary stats: orders, revenue, products, customers |
| GET | `/orders` | Recent orders |
| GET | `/products` | Top selling products |

---

## Deployment

### Railway (Recommended)
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and deploy
railway login
railway init
railway up

# Set environment variables in Railway dashboard
# or via CLI:
railway variables set SUPABASE_URL=... SUPABASE_ANON_KEY=... SUPABASE_SERVICE_ROLE_KEY=... JWT_SECRET=...
```

### Render
1. New Web Service → connect GitHub repo
2. Build command: `npm install`
3. Start command: `node server.js`
4. Add env variables in dashboard

### Heroku
```bash
heroku create nextgen-store-api
heroku config:set SUPABASE_URL=... SUPABASE_ANON_KEY=... NODE_ENV=production
git push heroku main
```

---

## Connect Backend to Frontend

In `index.html`, update the `saveOrderToSupabase` function or add:
```javascript
const API_URL = 'https://your-backend.railway.app';

// Example: place order via backend
const res = await fetch(`${API_URL}/api/orders`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(orderData),
});
const data = await res.json();
```

---

Built by **Dhayanandh D** · NextGen Store v2 · 2026
