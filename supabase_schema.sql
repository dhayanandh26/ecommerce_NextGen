-- ═══════════════════════════════════════════════════════════════
-- NextGen Store — Supabase Schema
-- Run in: Supabase Dashboard → SQL Editor → New Query → Run
-- ═══════════════════════════════════════════════════════════════

create extension if not exists "uuid-ossp";

-- Clean slate
drop view  if exists products_with_category;
drop table if exists payments    cascade;
drop table if exists order_items cascade;
drop table if exists orders      cascade;
drop table if exists customers   cascade;
drop table if exists products    cascade;
drop table if exists categories  cascade;

-- CATEGORIES
create table categories (
  category_id serial primary key,
  name        varchar(100) not null unique,
  description text,
  created_at  timestamptz default now()
);

-- PRODUCTS
create table products (
  product_id     serial primary key,
  category_id    int references categories(category_id),
  name           varchar(255) not null,
  brand          varchar(100),
  description    text,
  price          numeric(10,2) not null,
  mrp            numeric(10,2),
  stock_quantity int default 0,
  image_url      text,
  rating         numeric(3,1) default 0,
  review_count   int default 0,
  badge          varchar(50),
  is_active      boolean default true,
  created_at     timestamptz default now(),
  updated_at     timestamptz default now()
);

-- CUSTOMERS
create table customers (
  customer_id uuid default uuid_generate_v4() primary key,
  first_name  varchar(100),
  last_name   varchar(100),
  email       varchar(255),
  phone       varchar(20),
  address     text,
  city        varchar(100),
  country     varchar(100) default 'India',
  created_at  timestamptz default now()
);

-- ORDERS
create table orders (
  order_id         serial primary key,
  customer_id      uuid references customers(customer_id),
  total_amount     numeric(10,2) not null,
  status           varchar(50) default 'pending',
  shipping_address text,
  notes            text,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

-- ORDER ITEMS
create table order_items (
  item_id    serial primary key,
  order_id   int references orders(order_id) on delete cascade,
  product_id int references products(product_id),
  quantity   int not null check (quantity > 0),
  unit_price numeric(10,2) not null,
  created_at timestamptz default now()
);

-- PAYMENTS
create table payments (
  payment_id      serial primary key,
  order_id        int references orders(order_id) on delete cascade,
  amount          numeric(10,2) not null,
  payment_method  varchar(50),
  status          varchar(50) default 'pending',
  transaction_ref varchar(100),
  created_at      timestamptz default now()
);

-- VIEW
create view products_with_category as
select p.*, c.name as category_name,
  round(((p.mrp - p.price) / nullif(p.mrp,0)) * 100) as discount_pct
from products p
left join categories c on p.category_id = c.category_id
where p.is_active = true;

-- INDEXES
create index on products(category_id);
create index on products(badge);
create index on orders(customer_id);
create index on order_items(order_id);
create index on payments(order_id);

-- AUTO-UPDATE TRIGGER
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

create trigger trg_products_upd before update on products
  for each row execute function update_updated_at();
create trigger trg_orders_upd before update on orders
  for each row execute function update_updated_at();

-- ROW LEVEL SECURITY
alter table categories  enable row level security;
alter table products    enable row level security;
alter table customers   enable row level security;
alter table orders      enable row level security;
alter table order_items enable row level security;
alter table payments    enable row level security;

create policy "public_read_categories"  on categories  for select using (true);
create policy "public_read_products"    on products    for select using (is_active = true);
create policy "insert_customers"        on customers   for insert with check (true);
create policy "read_customers"          on customers   for select using (true);
create policy "insert_orders"           on orders      for insert with check (true);
create policy "read_orders"             on orders      for select using (true);
create policy "insert_order_items"      on order_items for insert with check (true);
create policy "read_order_items"        on order_items for select using (true);
create policy "insert_payments"         on payments    for insert with check (true);
create policy "read_payments"           on payments    for select using (true);

-- SEED CATEGORIES
insert into categories (name, description) values
  ('Electronics', 'Phones, headphones, monitors, keyboards and more'),
  ('Clothing',    'Fashion — jeans, shirts, shoes and activewear'),
  ('Books',       'Dev books, programming guides and tech references');

-- SEED PRODUCTS (17 items)
insert into products (product_id, category_id, name, brand, price, mrp, stock_quantity, image_url, rating, review_count, badge) values
(1,  1, 'Samsung Galaxy S26 Ultra 5G',           'Samsung',    139999, 159999,  20, 'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=700', 4.6,   796, 'deal'),
(2,  1, 'Sony WH-1000XM6 Noise Cancelling',      'Sony',        24990,  34990,  50, 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=700', 4.7,  2841, 'bestseller'),
(3,  1, 'JBL Charge 5 Bluetooth Speaker',        'JBL',         11999,  16999,  30, 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=700', 4.4,  1243, null),
(4,  1, 'Apple Watch Ultra 3',                   'Apple',       89900,  99900,  15, 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=700', 4.8,  3102, 'new'),
(5,  1, 'LG UltraGear 27" 4K Gaming Monitor',   'LG',          42999,  54999,  12, 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=700', 4.6,   567, 'deal'),
(6,  1, 'Keychron Q3 Pro Mechanical Keyboard',   'Keychron',    14500,  18000,  35, 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=700', 4.7,   892, null),
(7,  1, 'Logitech MX Master 3S Mouse',           'Logitech',     7495,   9995,  70, 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=700', 4.6,  4521, 'bestseller'),
(8,  1, 'Nothing Ear (2) True Wireless Earbuds', 'Nothing',      8999,  11999,  60, 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=700', 4.4,  1876, 'deal'),
(9,  2, 'Levi''s 511 Slim Fit Jeans',            'Levi''s',      2499,   4499,  80, 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=700', 4.3,  5612, null),
(10, 2, 'Nike Dri-FIT Running T-Shirt',          'Nike',         1299,   2195, 120, 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=700', 4.5,  8920, 'bestseller'),
(11, 2, 'Nike Air Max 270 Running Shoes',        'Nike',         7995,  12995,  45, 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=700', 4.6,  3241, 'deal'),
(12, 2, 'Allen Solly Formal Slim Shirt',         'Allen Solly',  1799,   3499,  60, 'https://images.unsplash.com/photo-1607345366928-199ea26cfe3e?w=700', 4.2,  2103, null),
(13, 3, 'Clean Code by Robert C. Martin',        'Pearson',      1299,   2499,  30, 'https://images.unsplash.com/photo-1532012197267-da84d127e765?w=700', 4.7, 12540, 'bestseller'),
(14, 3, 'Python Crash Course by Eric Matthes',   'No Starch',     799,   1599,  50, 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=700', 4.8, 18320, 'bestseller'),
(15, 3, 'Designing Data-Intensive Applications', 'O''Reilly',    2499,   4999,  20, 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=700', 4.9,  9876, 'hot'),
(16, 3, 'The Pragmatic Programmer 20th Ed',      'Pragmatic',    1799,   3299,  25, 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=700', 4.7,  7654, null),
(17, 3, 'System Design Interview Vol. 2',        'ByteByteGo',   1599,   2799,  35, 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=700', 4.8,  5430, 'hot');

select setval('products_product_id_seq', (select max(product_id) from products));

-- VERIFY
select c.name as category, count(*) as products, sum(p.stock_quantity) as total_stock
from products p join categories c on p.category_id = c.category_id
group by c.name order by c.name;
