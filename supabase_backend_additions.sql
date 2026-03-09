-- ═══════════════════════════════════════════════════════════
-- NextGen Store — Backend SQL Additions
-- Run AFTER supabase_schema.sql
-- ═══════════════════════════════════════════════════════════

-- ── 1. Add auth_uid column to customers ─────────────────────
alter table customers
  add column if not exists auth_uid uuid references auth.users(id);

create index if not exists idx_customers_auth_uid on customers(auth_uid);

-- ── 2. Decrement stock RPC (used by order placement) ────────
create or replace function decrement_stock(
  p_product_id int,
  p_quantity   int
)
returns void language plpgsql security definer as $$
begin
  update products
  set stock_quantity = greatest(0, stock_quantity - p_quantity)
  where product_id = p_product_id;
end;
$$;

-- ── 3. Increment stock RPC (used on cancellation) ───────────
create or replace function increment_stock(
  p_product_id int,
  p_quantity   int
)
returns void language plpgsql security definer as $$
begin
  update products
  set stock_quantity = stock_quantity + p_quantity
  where product_id = p_product_id;
end;
$$;

-- ── 4. Sales summary function ────────────────────────────────
create or replace function get_sales_summary(
  from_date timestamptz default now() - interval '30 days',
  to_date   timestamptz default now()
)
returns table (
  period        date,
  order_count   bigint,
  total_revenue numeric
) language plpgsql security definer as $$
begin
  return query
  select
    date_trunc('day', created_at)::date as period,
    count(*) as order_count,
    sum(total_amount) as total_revenue
  from orders
  where status != 'cancelled'
    and created_at between from_date and to_date
  group by 1
  order by 1;
end;
$$;

-- ── 5. Updated RLS policies for auth_uid ────────────────────
-- Allow customers to read only their own records
drop policy if exists "read_customers" on customers;
create policy "read_own_customer"
  on customers for select
  using (
    auth_uid = auth.uid()
    or true  -- keep open for guest orders; tighten as needed
  );

-- Allow logged-in users to update their own customer record
create policy "update_own_customer"
  on customers for update
  using (auth_uid = auth.uid());

-- ── 6. Order status trigger (auto-update payments on cancel) ─
create or replace function handle_order_cancellation()
returns trigger language plpgsql security definer as $$
begin
  if new.status = 'cancelled' and old.status != 'cancelled' then
    -- Mark payment as refunded
    update payments
    set status = 'refunded'
    where order_id = new.order_id
      and status = 'completed';

    -- Restore stock for each item
    perform increment_stock(oi.product_id, oi.quantity)
    from order_items oi
    where oi.order_id = new.order_id;
  end if;
  return new;
end;
$$;

create trigger trg_order_cancellation
  after update on orders
  for each row
  when (new.status = 'cancelled' and old.status != 'cancelled')
  execute function handle_order_cancellation();

-- ── 7. Verify setup ──────────────────────────────────────────
select
  routine_name,
  routine_type
from information_schema.routines
where routine_schema = 'public'
  and routine_name in ('decrement_stock','increment_stock','get_sales_summary')
order by routine_name;
