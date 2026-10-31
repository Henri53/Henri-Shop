// Live exchange rates: no API key needed.
// Fiat: frankfurter.app (European Central Bank reference rates)
// Crypto: CoinGecko public price API
//
// Both are free public APIs. If either is briefly unreachable, we fall back
// to the last successfully fetched values for a short while rather than
// breaking the page.

type Rates = {
  fiat: { EUR: number; USD: number; GBP: number }; // 1 EUR in that currency
  crypto: { BTC: number; LTC: number; SOL: number }; // price of 1 coin, in EUR
  updatedAt: string;
};

let cache: { value: Rates; at: number } | null = null;
const CACHE_MS = 60_000; // refetch at most once a minute

export async function getLiveRates(): Promise<Rates> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.value;

  try {
    const [fiatRes, cryptoRes] = await Promise.all([
      fetch("https://api.frankfurter.app/latest?from=EUR&to=USD,GBP", {
        next: { revalidate: 60 },
      }),
      fetch(
        "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,litecoin,solana&vs_currencies=eur",
        { next: { revalidate: 60 } }
      ),
    ]);

    if (!fiatRes.ok || !cryptoRes.ok) throw new Error("rate fetch failed");

    const fiatJson = await fiatRes.json();
    const cryptoJson = await cryptoRes.json();

    const value: Rates = {
      fiat: {
        EUR: 1,
        USD: fiatJson.rates.USD,
        GBP: fiatJson.rates.GBP,
      },
      crypto: {
        BTC: cryptoJson.bitcoin.eur,
        LTC: cryptoJson.litecoin.eur,
        SOL: cryptoJson.solana.eur,
      },
      updatedAt: new Date().toISOString(),
    };

    cache = { value, at: Date.now() };
    return value;
  } catch (err) {
    if (cache) return cache.value; // serve stale data rather than crash
    // Last-resort fallback so the page never hard-fails even on first load.
    return {
      fiat: { EUR: 1, USD: 1.08, GBP: 0.86 },
      crypto: { BTC: 60000, LTC: 70, SOL: 140 },
      updatedAt: new Date(0).toISOString(),
    };
  }
}
