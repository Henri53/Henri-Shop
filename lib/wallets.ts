// Your receiving addresses. These are fixed addresses (not per-order), so every
// crypto top-up gets a unique, slightly-randomised target amount to tell
// payments apart — see lib/actions.ts requestCryptoTopup and lib/chain.ts.
export const WALLETS = {
  BTC: "bc1qh6e850qk7gszqlu4ux4gvz7r4pmx9hspgjmyt8",
  LTC: "LKMwL36RgMCJZCR33zGJNoMK1V8btMWcuL",
  SOL: "2b6Mjv4zPwMbregH1nXWXeyPQKFzVBeGUJngjY2jMywu",
} as const;

// How many extra decimals of randomness to add to the target amount, and how
// many decimals to round the final number to (must stay visible on a typical
// wallet app's send screen, or customers can't match it exactly).
export const DISAMBIGUATION: Record<keyof typeof WALLETS, { min: number; max: number; decimals: number }> = {
  BTC: { min: 0.00001, max: 0.00009, decimals: 8 },
  LTC: { min: 0.0005, max: 0.0025, decimals: 6 },
  SOL: { min: 0.001, max: 0.006, decimals: 6 },
};
