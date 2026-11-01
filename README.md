# Vaultline — account shop with live rates, real payments and an owner dashboard

A real Next.js app:

- **Owner login** — only `OWNER_EMAIL` / `OWNER_PASSWORD` from your `.env` can log in as
  owner. It's not a database account, so nobody can register their way into it.
- **Customer registration/login** — customers create their own account (hashed password,
  never stored in plain text) and get a balance.
- **Owner dashboard** at `/owner` — add/edit/delete products with Name, Category, Price,
  Stock, Origin, Delivery time, Warranty time, descriptions.
- **Live exchange rates** — EUR/USD/GBP from the European Central Bank (via
  frankfurter.dev) and BTC/LTC/SOL prices from CoinGecko, both free, no API key.
  Converted prices are display-only ("≈"); payments are always charged in EUR. If the
  rate API is down, prices fall back to plain EUR, and crypto top-ups are refused
  rather than quoted from outdated prices.
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

The check lives at `GET /api/cron/check-topups`. Something needs to call it every few
minutes — **crypto top-ups expire after 1 hour, so a daily check is not enough.**

**Vercel Hobby (free) only allows cron jobs once per day**, and a more frequent
schedule makes the whole deployment fail. So use an external cron service for the
every-few-minutes check:

1. Sign up at [cron-job.org](https://cron-job.org) (free).
2. Create a job: URL `https://your-domain.com/api/cron/check-topups`, schedule every
   2–5 minutes.
3. In the job's advanced settings add the header `Authorization` with the value
   `Bearer YOUR_CRON_SECRET` (the same value as `CRON_SECRET` in your Vercel
   Environment Variables). Prefer the header over `?secret=...` in the URL, because
   URLs end up in logs.

`vercel.json` keeps one daily Vercel cron as a harmless backup (it cleans up expired
top-ups). Vercel sends `CRON_SECRET` as a Bearer header on its own, so **never put the
real secret into `vercel.json` or any other file in the repo.**

If you are on a paid Vercel plan, you can instead change the `schedule` in
`vercel.json` to `*/5 * * * *` and skip the external service.

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
3. You need a hosted Postgres database (the app already uses Postgres, nothing to
   change in the code). The easiest free option: [Neon](https://neon.tech) — sign in
   with GitHub, create a project, and copy the connection string (in the copy dialog,
   turn **Connection pooling OFF**). [Supabase](https://supabase.com) works too.
4. In Vercel's project settings → **Environment Variables**, add every variable from
   your `.env` (with real/live values this time) — `DATABASE_URL` (your Postgres
   connection string), `NEXTAUTH_SECRET`, `NEXTAUTH_URL` (your real domain, e.g.
   `https://yourshop.vercel.app`), `OWNER_EMAIL`, `OWNER_PASSWORD`,
   `PAYPAL_ENV`/`PAYPAL_CLIENT_ID`/`PAYPAL_CLIENT_SECRET`/`NEXT_PUBLIC_PAYPAL_CLIENT_ID`,
   `CRON_SECRET`.
5. Deploy. The database tables are created automatically on every build
   (`prisma db push` is part of `npm run build`); nothing to run by hand. If a build
   fails right away with a database error, `DATABASE_URL` is missing or wrong in
   Vercel's environment variables.
6. Set up the cron-job.org job from section 3 (do not put your secret into
   `vercel.json`).

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
