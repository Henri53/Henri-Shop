// Live exchange rates, no API key needed.
//   Fiat:   Frankfurter (European Central Bank reference rates)
//   Crypto: CoinGecko public price API
//
// Fiat and crypto are fetched INDEPENDENTLY: if CoinGecko rate-limits us,
// USD/GBP prices must stay live, and vice versa.
//
// `fiatLive` / `cryptoLive` say whether the numbers are real and recent.
// Never quote a crypto payment amount when `cryptoLive` is false.

export type Rates = {
  fiat: { EUR: number; USD: number; GBP: number }; // 1 EUR in that currency
  crypto: { BTC: number; LTC: number; SOL: number }; // price of 1 coin, in EUR (0 when unknown)
  fiatLive: boolean;
  cryptoLive: boolean;
  updatedAt: string;
};

type Fiat = Rates["fiat"];
type Crypto = Rates["crypto"];
type Slot<T> = { value: T; at: number };

const FRESH_MS = 60_000; // refetch at most once a minute
const FIAT_MAX_STALE_MS = 60 * 60_000; // ECB rates only change daily
const CRYPTO_MAX_STALE_MS = 5 * 60_000; // crypto moves fast: don't trust old prices

let fiatSlot: Slot<Fiat> | null = null;
let cryptoSlot: Slot<Crypto> | null = null;

async function getJson(url: string): Promise<any> {
  const res = await fetch(url, {
    next: { revalidate: 60 },
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) throw new Error(`${url} answered ${res.status}`);
  return res.json();
}

async function fetchFiat(): Promise<Fiat> {
  const urls = [
    "https://api.frankfurter.dev/v1/latest?base=EUR&symbols=USD,GBP",
    "https://api.frankfurter.app/latest?from=EUR&to=USD,GBP", // old host, kept as fallback
  ];
  let lastErr: unknown = new Error("no fiat source");
  for (const url of urls) {
    try {
      const json = await getJson(url);
      const usd = Number(json?.rates?.USD);
      const gbp = Number(json?.rates?.GBP);
      if (!(usd > 0) || !(gbp > 0)) throw new Error("unexpected fiat payload");
      return { EUR: 1, USD: usd, GBP: gbp };
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr;
}

async function fetchCrypto(): Promise<Crypto> {
  const json = await getJson(
    "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,litecoin,solana&vs_currencies=eur"
  );
  const btc = Number(json?.bitcoin?.eur);
  const ltc = Number(json?.litecoin?.eur);
  const sol = Number(json?.solana?.eur);
  if (!(btc > 0) || !(ltc > 0) || !(sol > 0)) throw new Error("unexpected crypto payload");
  return { BTC: btc, LTC: ltc, SOL: sol };
}

// Returns the freshest data we can get plus whether it is still trustworthy.
async function refresh<T>(
  slot: Slot<T> | null,
  fetcher: () => Promise<T>,
  maxStaleMs: number
): Promise<{ slot: Slot<T> | null; live: boolean }> {
  if (slot && Date.now() - slot.at < FRESH_MS) return { slot, live: true };
  try {
    return { slot: { value: await fetcher(), at: Date.now() }, live: true };
  } catch {
    // API hiccup: keep serving the last good value, but only for a limited time.
    const usable = !!slot && Date.now() - slot.at < maxStaleMs;
    return { slot, live: usable };
  }
}

export async function getLiveRates(): Promise<Rates> {
  const [fiat, crypto] = await Promise.all([
    refresh(fiatSlot, fetchFiat, FIAT_MAX_STALE_MS),
    refresh(cryptoSlot, fetchCrypto, CRYPTO_MAX_STALE_MS),
  ]);
  fiatSlot = fiat.slot;
  cryptoSlot = crypto.slot;

  const newest = Math.max(fiatSlot?.at ?? 0, cryptoSlot?.at ?? 0);
  return {
    // Fiat falls back to 1:1 EUR only as a display aid; callers must check fiatLive.
    fiat: fiatSlot?.value ?? { EUR: 1, USD: 1, GBP: 1 },
    // Crypto never falls back to made-up prices: 0 means "unknown".
    crypto: cryptoSlot?.value ?? { BTC: 0, LTC: 0, SOL: 0 },
    fiatLive: fiat.live,
    cryptoLive: crypto.live,
    updatedAt: new Date(newest).toISOString(),
  };
}
