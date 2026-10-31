# Vaultline — account shop with live rates, real payments and an owner dashboard

A real Next.js app:

- **Owner login** — only `OWNER_EMAIL` / `OWNER_PASSWORD` from your `.env` can log in as
  owner. It's not a database account, so nobody can register their way into it.
- **Customer registration/login** — customers create their own account (hashed password,
  never stored in plain text) and get a balance.
- **Owner dashboard** at `/owner` — add/edit/delete products with Name, Category, Price,
  Stock, Origin, Delivery time, Warranty time, descriptions.
- **Live exchange rates** — EUR/USD/GBP from the European Central Bank (via
  frankfurter.app) and BTC/LTC/SOL prices from CoinGecko, both free, no API key.
- **Real PayPal payments** — via PayPal's own Orders API. A top-up is confirmed the
  moment PayPal confirms it; nothing to click on your end.
- **Automatic crypto detection** — a background job checks public blockchain explorers
  for incoming payments and credits the customer's balance itself, no manual step.

## 1. Run it locally first

```bash
npm install
cp .env.example .env
```

Fill in `.env`:

- `NEXTAUTH_SECRET` and `CRON_SECRET` — generate each with `openssl rand -base64 32`
- `OWNER_EMAIL` / `OWNER_PASSWORD` — your own owner login
- Leave the PayPal fields empty for now if you just want to look around; the PayPal
  button will show a note instead of breaking.

Then:

```bash
npm run db:push
npm run dev
```

Open http://localhost:3000, log in with your `OWNER_EMAIL` / `OWNER_PASSWORD` at
`/login` → you land on `/owner` and can add products straight away.

## 2. Set up PayPal (real, automatic payments)

1. Go to [developer.paypal.com](https://developer.paypal.com) → log in with your normal
   PayPal account → **Apps & Credentials**.
2. Make sure **Sandbox** is selected while testing, create an app (any name).
3. Copy its **Client ID** and **Secret** into `.env`:
   ```
   PAYPAL_ENV="sandbox"
   PAYPAL_CLIENT_ID="..."
   PAYPAL_CLIENT_SECRET="..."
   NEXT_PUBLIC_PAYPAL_CLIENT_ID="..."   (same value as PAYPAL_CLIENT_ID)
   ```
4. Restart `npm run dev`. On `/account`, the PayPal button now works. In sandbox mode,
   pay with a sandbox buyer account (developer.paypal.com → **Sandbox → Accounts**
   has one ready-made for you, or create one).
5. When you're ready to accept real money: switch to **Live** in the PayPal developer
   dashboard, create a live app, and swap in its Client ID/Secret with
   `PAYPAL_ENV="live"`.

Balance is credited the instant PayPal confirms the capture — this part is fully
automatic, no manual confirmation anywhere.

## 3. How crypto top-ups work

Your three wallet addresses are fixed (in `lib/wallets.ts`), so to tell different
customers' payments apart, every top-up gets its own slightly-randomised exact
amount — e.g. "send exactly 0.00034217 BTC". A background job checks the public
blockchain for a transaction matching that amount and marks the top-up paid.

This is a solid, free way to do it without a paid payment processor, but it's a
heuristic — if a customer rounds the amount or sends the wrong figure, it won't
match automatically, and you confirm it by hand on `/owner` instead (that fallback
is always there).

### Triggering the background check

The check lives at `GET /api/cron/check-topups?secret=YOUR_CRON_SECRET`. Something
needs to call it every few minutes. Two ways:

**A) Vercel Cron** (simplest if your Vercel plan supports the frequency you want —
check your current plan's limits in the Vercel dashboard under Settings → Cron Jobs):
`vercel.json` already defines a 5-minute schedule. Just replace
`REPLACE_WITH_YOUR_CRON_SECRET` in `vercel.json` with your real `CRON_SECRET` value
before deploying.

**B) A free external cron service** (works regardless of your Vercel plan): sign up at
[cron-job.org](https://cron-job.org) (free) and create a job that does a GET request to
`https://your-domain.com/api/cron/check-topups?secret=YOUR_CRON_SECRET` every 2–5
minutes.

Either way, if you change `CRON_SECRET`, update it in both `.env` (on Vercel, in the
project's Environment Variables) and wherever you configured the cron call.

### Upgrading later

For a more reliable, per-order setup (a fresh address for every single payment instead
of amount-matching on one fixed address), swap this part for
[BTCPay Server](https://btcpayserver.org/) (free, self-hosted), NOWPayments, or
Coinbase Commerce — each gives you a webhook you'd call instead of the cron job.

## 4. Put it on GitHub and make it live (Vercel)

GitHub on its own only stores files — it doesn't run your app. Pair it with
[Vercel](https://vercel.com) (free tier), which runs the server part and rebuilds
automatically every time you push:

1. Create a new, **private** repository on GitHub and push this project to it
   (`.env` is already in `.gitignore`, so your real secrets never get uploaded —
   double-check that before your first push).
2. Go to [vercel.com](https://vercel.com), sign in with GitHub, **Add New → Project**,
   pick your repo. Vercel detects Next.js automatically.
3. Before the first deploy, you need a real hosted database — SQLite only works
   locally. The easiest free option: [Neon](https://neon.tech) or
   [Supabase](https://supabase.com) (Postgres, free tier).
   - Create a project there, copy its connection string.
   - In `prisma/schema.prisma`, change:
     ```prisma
     datasource db {
       provider = "postgresql"
       url      = env("DATABASE_URL")
     }
     ```
   - Commit that change.
4. In Vercel's project settings → **Environment Variables**, add every variable from
   your `.env` (with real/live values this time) — `DATABASE_URL` (your Postgres
   connection string), `NEXTAUTH_SECRET`, `NEXTAUTH_URL` (your real domain, e.g.
   `https://yourshop.vercel.app`), `OWNER_EMAIL`, `OWNER_PASSWORD`,
   `PAYPAL_ENV`/`PAYPAL_CLIENT_ID`/`PAYPAL_CLIENT_SECRET`/`NEXT_PUBLIC_PAYPAL_CLIENT_ID`,
   `CRON_SECRET`.
5. Deploy. Then run `npx prisma db push` once from your own machine, pointed at the
   production database (`DATABASE_URL=<your Postgres URL> npx prisma db push`), to
   create its tables.
6. Update `vercel.json`'s cron URL with your real `CRON_SECRET` (or use the
   cron-job.org route from section 3) and redeploy.

From then on: push to GitHub → Vercel rebuilds and redeploys automatically, same
simple workflow as uploading files, just with a real server behind it.

## Notes

- `origin`, `deliveryTime`, and `warrantyTime` on each product are free-text fields —
  fill them with whatever's true (e.g. "self-created", "Instant", "24 hours").
- Only your one fixed owner login can reach `/owner` — enforced server-side in
  `middleware.ts`, not just hidden in the menu.
- Change your owner password any time by updating `OWNER_PASSWORD` in `.env` (and on
  Vercel, in Environment Variables) — no database step needed.
- Prices are stored in EUR cents; the currency switcher in the header only changes the
  *display*, using the live rates from `/api/rates`.
