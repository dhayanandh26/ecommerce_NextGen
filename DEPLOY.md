# 🚀 NextGen Store — Deployment Guide
## Vercel · Netlify · Supabase

---

## 📁 Files in this Package

| File | Purpose |
|------|---------|
| `index.html` | Complete store — all pages, all JS, Supabase SDK built in |
| `supabase_schema.sql` | Database schema + 17 seed products |
| `vercel.json` | Vercel deployment config |
| `netlify.toml` | Netlify deployment config |
| `DEPLOY.md` | This guide |

---

## STEP 1 — Set Up Supabase (5 minutes)

### 1.1 Create a Project
1. Go to **[supabase.com](https://supabase.com)** → Sign up / Log in
2. Click **"New Project"**
3. Fill in:
   - **Name:** `nextgen-store`
   - **Database Password:** (save this somewhere safe)
   - **Region:** `ap-south-1` (Mumbai — closest to India)
4. Wait ~2 minutes for the project to spin up

### 1.2 Run the Schema
1. In your Supabase dashboard, click **SQL Editor** in the left sidebar
2. Click **"New Query"**
3. Copy the entire contents of `supabase_schema.sql` and paste it
4. Click **"Run"** (Ctrl+Enter)
5. You should see a table at the bottom showing 3 categories and product counts ✅

### 1.3 Copy Your Credentials
1. Go to **Settings → API** in your Supabase dashboard
2. Copy these two values:
   - **Project URL** → looks like `https://xxxxxxxxxxx.supabase.co`
   - **anon public** key → long JWT string starting with `eyJ...`

---

## STEP 2A — Deploy to Vercel (Recommended, 2 minutes)

### Option A: Drag & Drop (Easiest)
1. Go to **[vercel.com](https://vercel.com)** → Sign up with GitHub
2. Click **"Add New → Project"**
3. Click **"Upload"** tab
4. Drag this entire folder onto the upload area
5. Click **"Deploy"** → done in ~30 seconds ✅

### Option B: Vercel CLI
```bash
# Install Vercel CLI
npm install -g vercel

# From this folder
cd nextgen_ecommerce_v2
vercel login
vercel --prod
```

### Option C: GitHub + Auto-Deploy
```bash
# Push to GitHub
git init
git add .
git commit -m "NextGen Store v2"
git remote add origin https://github.com/YOUR_USERNAME/nextgen-store.git
git push -u origin main

# Then in vercel.com:
# New Project → Import from GitHub → select your repo → Deploy
```

---

## STEP 2B — Deploy to Netlify (Alternative, 2 minutes)

### Option A: Drag & Drop (Easiest)
1. Go to **[app.netlify.com](https://app.netlify.com)** → Sign up
2. From the dashboard, drag this entire folder onto the page
3. Netlify deploys in ~15 seconds ✅
4. You get a URL like `https://nextgen-store-xyz.netlify.app`

### Option B: Netlify CLI
```bash
# Install Netlify CLI
npm install -g netlify-cli

# From this folder
netlify login
netlify deploy --prod --dir .
```

### Option C: GitHub + Auto-Deploy
1. Push to GitHub (same as Vercel Option C above)
2. Netlify dashboard → **"Add new site" → "Import from Git"**
3. Select your repo → **Build command:** leave empty → **Publish directory:** `.`
4. Click **"Deploy site"**

---

## STEP 3 — Connect Supabase in the Store (30 seconds)

Once your store is deployed:

1. Open your deployed store URL
2. Click the **"Connect Supabase"** button in the top navigation bar (green button on the right)
3. Enter your **Project URL** and **anon public key** from Step 1.3
4. Click **"Connect & Sync"**
5. The store will load live product data from your database ✅

> **Note:** Credentials are saved in your browser's localStorage. They persist across sessions.

---

## What Syncs with Supabase

| Feature | Without Supabase | With Supabase |
|---------|-----------------|---------------|
| Products | Demo data (hardcoded) | Live from database |
| Prices/Stock | Static | Real-time from DB |
| Orders | Browser only | Saved to `orders` table |
| Customers | Not stored | Saved to `customers` table |
| Payments | Not stored | Saved to `payments` table |
| Order items | Not stored | Saved to `order_items` table |

---

## Database Tables

```
categories     → Electronics, Clothing, Books
products       → 17 products with price, stock, rating, badge
customers      → Created on each order (UUID primary key)
orders         → Each placed order with total + status
order_items    → Line items per order
payments       → Payment method + status per order

products_with_category  → VIEW joining products + categories
```

---

## Updating Products via Supabase

You can update products directly from the Supabase **Table Editor**:
- Change `price` or `mrp` → reflects on your store after next page load
- Set `stock_quantity` to 0 → shows "Out of Stock"
- Change `badge` to `deal`, `new`, `hot`, or `bestseller`
- Set `is_active` to `false` to hide a product

---

## Custom Domain (Optional)

### Vercel
1. Vercel Dashboard → Your Project → **Settings → Domains**
2. Add your domain (e.g. `nextgenstore.in`) → Follow DNS instructions

### Netlify
1. Netlify Dashboard → Your Site → **Domain management**
2. Add custom domain → Follow DNS instructions

---

## Environment Variables (Advanced)

If you prefer not to use the modal, you can hardcode credentials:

Open `index.html`, find this line near the top of the `<script>` section:
```javascript
let SUPA_URL = localStorage.getItem('ng_sb_url') || '';
let SUPA_KEY  = localStorage.getItem('ng_sb_key')  || '';
```

Replace with:
```javascript
let SUPA_URL = 'https://YOUR_PROJECT_ID.supabase.co';
let SUPA_KEY  = 'YOUR_ANON_PUBLIC_KEY';
```

> ⚠️ The `anon` key is safe to expose — it's public by design and only allows operations permitted by your RLS policies.

---

## Troubleshooting

**"Connection failed" in modal**
- Double-check the URL includes `https://` and ends with `.supabase.co`
- Make sure you used the **anon public** key (not the service_role key)
- Confirm you ran `supabase_schema.sql` successfully

**Products not updating from Supabase**
- Open browser DevTools → Console — look for `[NextGen]` logs
- Check that `products_with_category` view exists in your Supabase Table Editor

**Orders not saving**
- Check Supabase Dashboard → Table Editor → `orders` table
- Check RLS policies are correctly applied (run the schema again if unsure)

**Vercel build error**
- Make sure `vercel.json` is in the same folder as `index.html`
- No build step is needed — it's a pure static site

---

## Built by Dhayanandh D · NextGen Store v2 · 2026
