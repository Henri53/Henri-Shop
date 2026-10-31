// Looks up incoming payments on public block explorers. This is a best-effort
// way to auto-detect crypto payments to a FIXED wallet address without paying
// for a payment processor: every top-up gets a unique, slightly-randomised
// target amount so it can be told apart from other people's payments to the
// same address. It is not as bulletproof as a dedicated processor (BTCPay,
// NOWPayments, Coinbase Commerce), which gives every order its own address —
// but for a small shop it works well as long as customers send the exact
// amount shown.

type ChainMatch = { txId: string; amount: number; confirmed: boolean };

function closeEnough(a: number, b: number, tolerance: number) {
  return Math.abs(a - b) <= tolerance;
}

// --- Bitcoin: blockstream.info esplora API ---
export async function findBitcoinPayment(
  address: string,
  targetBtc: number,
  sinceMs: number
): Promise<ChainMatch | null> {
  const res = await fetch(`https://blockstream.info/api/address/${address}/txs`, {
    cache: "no-store",
  });
  if (!res.ok) return null;
  const txs = await res.json();

  for (const tx of txs) {
    const blockTimeMs = (tx.status?.block_time ?? 0) * 1000;
    if (tx.status?.confirmed && blockTimeMs && blockTimeMs < sinceMs) continue;
    const sats = (tx.vout || [])
      .filter((o: any) => o.scriptpubkey_address === address)
      .reduce((sum: number, o: any) => sum + o.value, 0);
    const btc = sats / 1e8;
    if (closeEnough(btc, targetBtc, Math.max(targetBtc * 0.002, 0.000005))) {
      return { txId: tx.txid, amount: btc, confirmed: !!tx.status?.confirmed };
    }
  }
  return null;
}

// --- Litecoin: litecoinspace.org (mempool.space-compatible explorer) ---
export async function findLitecoinPayment(
  address: string,
  targetLtc: number,
  sinceMs: number
): Promise<ChainMatch | null> {
  const res = await fetch(`https://litecoinspace.org/api/address/${address}/txs`, {
    cache: "no-store",
  });
  if (!res.ok) return null;
  const txs = await res.json();

  for (const tx of txs) {
    const blockTimeMs = (tx.status?.block_time ?? 0) * 1000;
    if (tx.status?.confirmed && blockTimeMs && blockTimeMs < sinceMs) continue;
    const litoshi = (tx.vout || [])
      .filter((o: any) => o.scriptpubkey_address === address)
      .reduce((sum: number, o: any) => sum + o.value, 0);
    const ltc = litoshi / 1e8;
    if (closeEnough(ltc, targetLtc, Math.max(targetLtc * 0.002, 0.0005))) {
      return { txId: tx.txid, amount: ltc, confirmed: !!tx.status?.confirmed };
    }
  }
  return null;
}

// --- Solana: public JSON-RPC ---
async function solanaRpc(method: string, params: any[]) {
  const res = await fetch("https://api.mainnet-beta.solana.com", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error("solana rpc failed");
  const json = await res.json();
  if (json.error) throw new Error(json.error.message || "solana rpc error");
  return json.result;
}

export async function findSolanaPayment(
  address: string,
  targetSol: number,
  sinceMs: number
): Promise<ChainMatch | null> {
  const sigs: any[] = await solanaRpc("getSignaturesForAddress", [address, { limit: 20 }]);

  for (const sigInfo of sigs) {
    if (sigInfo.err) continue;
    const blockTimeMs = (sigInfo.blockTime ?? 0) * 1000;
    if (blockTimeMs && blockTimeMs < sinceMs) continue;

    const tx = await solanaRpc("getTransaction", [
      sigInfo.signature,
      { encoding: "jsonParsed", maxSupportedTransactionVersion: 0 },
    ]);
    if (!tx) continue;

    const accountKeys: string[] = (tx.transaction.message.accountKeys || []).map((k: any) =>
      typeof k === "string" ? k : k.pubkey
    );
    const idx = accountKeys.indexOf(address);
    if (idx === -1) continue;

    const pre = tx.meta?.preBalances?.[idx] ?? 0;
    const post = tx.meta?.postBalances?.[idx] ?? 0;
    const receivedLamports = post - pre;
    if (receivedLamports <= 0) continue;

    const sol = receivedLamports / 1e9;
    if (closeEnough(sol, targetSol, Math.max(targetSol * 0.002, 0.0002))) {
      const confirmed =
        sigInfo.confirmationStatus === "finalized" || sigInfo.confirmationStatus === "confirmed";
      return { txId: sigInfo.signature, amount: sol, confirmed };
    }
  }
  return null;
}

export async function findPayment(
  coin: "BTC" | "LTC" | "SOL",
  address: string,
  targetAmount: number,
  sinceMs: number
): Promise<ChainMatch | null> {
  if (coin === "BTC") return findBitcoinPayment(address, targetAmount, sinceMs);
  if (coin === "LTC") return findLitecoinPayment(address, targetAmount, sinceMs);
  return findSolanaPayment(address, targetAmount, sinceMs);
}
