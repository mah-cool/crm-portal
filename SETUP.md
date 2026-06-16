# User accounts — setup guide

The site now has signup / login / logout backed by **Neon Postgres** and
**Vercel Serverless Functions**. Follow these steps once to switch it on.

## 1. Create the Neon database
1. In your **Vercel project → Storage → Create Database → Neon** (or sign up at
   neon.tech and create a project).
2. Connect it to this project. Vercel will add a `DATABASE_URL` environment
   variable automatically. If you created Neon directly, copy the **pooled**
   connection string into Vercel → Settings → Environment Variables as
   `DATABASE_URL`.

## 2. Create the users table
Open the **Neon dashboard → SQL Editor**, paste the contents of
[`schema.sql`](./schema.sql), and run it.

## 3. Add the session secret
In **Vercel → Settings → Environment Variables**, add:

| Name         | Value                                              |
|--------------|----------------------------------------------------|
| `JWT_SECRET` | a long random string (see below)                   |

Generate one locally:
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

## 4. Deploy
Commit and push (or `vercel --prod`). Vercel installs the dependencies in
`package.json` and turns every file in `/api` into an endpoint:

- `POST /api/signup` — create account
- `POST /api/login`  — sign in
- `POST /api/logout` — sign out
- `GET  /api/me`     — current user

## 5. Create the CRM + stock tables
After `schema.sql`, run [`schema-crm.sql`](./schema-crm.sql) in the Neon SQL
Editor too. It adds `role`/`active` to users, creates the CRM tables
(customers, suppliers, hauliers, timber stock, plus purchase/sales orders,
deliveries and stock movements) and seeds a few placeholder rows.

## 5b. Timber product model + stock import (Phase 1)
After `schema-crm.sql`, run these two in the Neon SQL Editor **in order**:
1. [`schema-timber.sql`](./schema-timber.sql) — replaces the placeholder stock
   table with a proper **product card** (dual purchase/selling dimensions,
   GBP costing, `sell_rate_per_m3` master price, auto-calculated piece/pack
   volumes), **locations**, **stock levels** (per product per location) and a
   stock-movement audit trail.
2. [`import-stock.sql`](./import-stock.sql) — loads your real stock: 116
   products and 125 product/location levels across Sutton Bridge, Wisbech,
   Cardiff (auto-generated from your Stock List CSV; safe to re-run).

In the app this adds **Products** (the card), **Stock on hand** (by location,
with an Adjust action) and **Locations**. Pricing: set each product's
`sell rate £/m³`; the app derives £/pack and £/piece from the pack volume.

> Re-importing later: regenerate `import-stock.sql` from a fresh CSV and run it
> again — it upserts, so quantities are refreshed without duplicating products.

## 5c. Order-to-cash chain (Phase 2)
After `schema-timber.sql`, run [`schema-orders.sql`](./schema-orders.sql). It
builds the sales **order → picking → delivery → invoice** chain (with
partial-quantity tracking) plus a `doc_sequences` table for document numbers.

Document numbers start at **SO 7959, SPN 15024, DN 24422, INV 1** — edit them
any time in the Neon SQL Editor, e.g.:
```sql
update doc_sequences set next_value = 7959 where doc_type = 'sales_order';
```

This adds **Sales Orders** and **Picking Notes** to the app. Workflow so far:
1. Create a sales order (pick a customer, add product lines — £/pack auto-fills
   from the product's £/m³ sell rate; set delivery address + haulier).
2. From the order, **Create picking note** for the outstanding quantities,
   choosing the location to pick from.
3. Open the picking note, adjust picked quantities if needed, and **Confirm** —
   this **reduces stock at that location** and advances the order status.
   Print a warehouse copy with the **Print** button.

## 5d. Phase 2+/3/4 migrations (run in this order)
After `schema-orders.sql`, run these in the Neon SQL Editor **in order** (each is
idempotent — `create … if not exists` / `add column if not exists` — safe to re-run):

1. [`schema-orders-v2.sql`](./schema-orders-v2.sql) — customer delivery addresses;
   sell sales-order lines by £/m³.
2. [`schema-crm-v2.sql`](./schema-crm-v2.sql) — **VAT rate per customer & supplier**
   (the sales order no longer asks for VAT; it snapshots the customer's rate).
3. [`schema-orders-v3.sql`](./schema-orders-v3.sql) — **delivery notes + invoices**;
   `stock_levels.allocated_packs`. Stock now moves **only at delivery**: confirming a
   pick *reserves* (allocates) stock; it physically leaves when the delivery note is
   confirmed (amendable loaded qty). Invoices are raised **per delivery note**.
4. [`schema-haulage.sql`](./schema-haulage.sql) — **haulage orders** (multi-drop;
   each drop = one SPN picking note, per-drop nett cost); adds address fields to
   **locations** for collection addresses.
5. [`schema-product-options.sql`](./schema-product-options.sql) — managed
   **category / species / treatment** drop-down lists (seeded from existing values).
6. [`schema-purchasing.sql`](./schema-purchasing.sql) — **purchase orders → loading
   lists → vessel transit bins → arrival at port**. Suppliers are priced in **€/m³**
   on purchase dimensions; landed £/m³ (selling) =
   `€/m³ × (purchase pack vol ÷ selling pack vol) × exchange rate + freight £/m³`.
   Adds a per-voyage transit location, `products.purchase_pack_volume`, and
   `is_transit` on locations.

This adds **Delivery Notes**, **Invoices**, **Haulage Orders**, **Purchase Orders**
and **Loading Lists** to the app, and **Allocated / Available** columns to Stock.

> **If you ran `schema-purchasing.sql` before 2026-06 and Purchase Orders / Loading
> Lists error** (`column po.number does not exist`), re-run the current
> `schema-purchasing.sql` — it now drops the old placeholder `purchase_orders`
> from `schema-crm.sql` and rebuilds the table correctly.

## 5e. CRM depth (run in any order, after schema-crm.sql)
- [`schema-crm-v3.sql`](./schema-crm-v3.sql) — **bank & limited-company details**
  on customers & suppliers. **Required**: the customer/supplier forms now post
  these fields, so editing a partner errors until this is run.
- [`schema-contacts.sql`](./schema-contacts.sql) — **multiple contacts** per
  customer/supplier (accounts, sales, purchasing…).
- [`schema-interactions.sql`](./schema-interactions.sql) — **customer interaction
  log** (calls/emails/visits) on the customer **Profile** page.
- [`schema-stocklists.sql`](./schema-stocklists.sql) — **customer stock lists**:
  from Stock on hand → "Customer stock list", build/save per-customer selections
  of previously-ordered products and export to Excel (CSV).
- [`schema-haulage-v2.sql`](./schema-haulage-v2.sql) — haulage orders get separate
  **collection & delivery dates**.
- [`schema-crm-v4.sql`](./schema-crm-v4.sql) — customer **credit limit & terms**.
- [`schema-2026-06.sql`](./schema-2026-06.sql) — pick-note/haulage **instructions**,
  haulier **city/county/postcode**, and the permanent **"On the water"** transit bin.
- [`schema-reports.sql`](./schema-reports.sql) — **Reports** section (nav group):
  Report manager lists built-in reports (**Write-offs by reason/period**,
  **Stock valuation**) + saved ones; Report creator saves a configured copy
  (base type + preset params) to `report_defs`. Reports run with date/location/
  group params and print or export to CSV.
- [`schema-writeoffs.sql`](./schema-writeoffs.sql) — **sales-order write-offs**:
  write off un-picked outstanding (e.g. 1 pack) with a reason (lost order /
  office amendment / customer change), audited in `order_write_offs`. Also adds
  "Add line" to a sales order even after picking has started.
- [`schema-crm-v5.sql`](./schema-crm-v5.sql) — **sales rep per customer**
  (`customers.sales_rep_id`). The Customers list becomes CRM-style: your own
  customers first, then by who was contacted longest ago (next to call), with a
  quick "Log note" action. The customer **Profile** adds an account summary
  (balance, credit limit/available, open orders, 6-month sales).
- [`schema-accounts.sql`](./schema-accounts.sql) — **accounts & credit control**:
  structured credit terms on customers (`credit_terms_days` + `credit_terms_eom`),
  invoice **due date + amount paid**, and **customer receipts** allocated across
  invoices. Adds an **Accounts** nav group (Invoices + **Aged debtors**), a printable
  **statement** per customer, and a warn-only credit check on new orders.
- [`schema-auth.sql`](./schema-auth.sql) — **user invites** (single-use expiring
  links via `/invite.html?token=…`) and **per-module permissions** on users
  (`users.permissions`; NULL = full access, admins always full). Manage both in
  the **Staff** module: "Invite user" generates a link; "Permissions" per staff
  user toggles module access.

## 5f. Per-batch stock rebuild (Phase 5) — ⚠ DESTRUCTIVE, run WITH the deploy
Stock is now tracked **per batch** (a child of a product code, e.g. `9-100 - 700`).
The app code and these two scripts must go live together — the batch-aware app
will not work on the old product-keyed schema, and vice-versa. Run **in order**:

1. [`schema-batches.sql`](./schema-batches.sql) — creates `product_batches`,
   re-keys `stock_levels` + every document line to `batch_id`, adds
   `suppliers.currency` and the `batch_view`. **Wipes** products, stock and all
   documents (orders, picks, deliveries, invoices, POs, loading lists, haulage).
   Customers, suppliers, hauliers, locations and users are kept.
2. [`import-batches.sql`](./import-batches.sql) — loads the stock list (115
   products, 148 batches, 157 stock rows). Landed £/m³ per batch =
   `(€/m³ ÷ exchange + freight) × (purchase ÷ selling area)`, seeded at
   exchange **1.15 (€ per £)** and **£45/m³** freight (editable per batch).
   Regenerate with `node scripts-generate-batches-import.cjs "<csv path>"`.

> Take a Neon backup first. Sell prices and product descriptions import blank.

## 6. Create the first admin
Public sign-up is **closed** for this internal tool. To create the very first
account, visit **`/setup.html`** once — it creates an `admin` and then disables
itself. After that, admins add staff inside the app (Staff module).

> Already created a test user before this change? Promote it to admin in the
> Neon SQL Editor: `update users set role = 'admin' where email = 'you@example.com';`

## Using the app
- Staff sign in at **`/login.html`** → land in **`/app.html`** (the CRM).
- Modules: **Dashboard** (counts + low-stock alerts), **Customers**,
  **Suppliers**, **Timber Stock**, **Hauliers**, and **Staff** (admin only).
- Timber Stock has an **Adjust** action that records a stock movement and
  updates the on-hand quantity atomically.

### API endpoints (auth required)
- `GET|POST /api/data/:entity` and `GET|PATCH|DELETE /api/data/:entity/:id`
  for `customers`, `suppliers`, `hauliers`, `timber_stock`
- `POST /api/stock/adjust` — record a stock movement
- `GET|POST /api/users`, `PATCH|DELETE /api/users/:id` — admin only

## Local development (optional)
```bash
npm install
cp .env.example .env   # fill in DATABASE_URL and JWT_SECRET
vercel dev             # runs the static site + /api functions locally
```

## How it works / security notes
- Passwords are hashed with **bcrypt** (cost 12) — plaintext is never stored.
- Sessions are **JWTs in an httpOnly, Secure, SameSite=Lax cookie**, so the
  token can't be read by JavaScript and rides along automatically.
- All DB queries are parameterised (no SQL injection).

- Access is **role-based**: any signed-in user reaches the CRM; only `admin`
  users can manage staff. Admins can't demote/deactivate/delete themselves.

### Worth adding later
- Email verification and password reset.
- Rate limiting on login/signup (e.g. Vercel KV / Upstash) to slow brute force.
- The transaction UIs: purchase orders, sales orders, deliveries (tables are
  already in `schema-crm.sql`).
