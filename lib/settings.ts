import { prisma } from "./prisma";

export type Settings = {
  siteName: string;
  tagline: string;
  announcement: string; // banner on top of the shop, empty = hidden
  supportUrl: string; // Discord / Telegram / contact page, empty = hidden
  purchasesPaused: boolean; // blocks buying, e.g. while restocking
};

export const DEFAULT_SETTINGS: Settings = {
  siteName: "Vaultline",
  tagline: "Pick a product, pay from your balance, get your details.",
  announcement: "",
  supportUrl: "",
  purchasesPaused: false,
};

// Never throws: if the database hiccups, the shop still renders with defaults.
export async function getSettings(): Promise<Settings> {
  try {
    const rows = await prisma.setting.findMany();
    const m: Record<string, string> = {};
    for (const r of rows) m[r.key] = r.value;
    return {
      siteName: m.siteName || DEFAULT_SETTINGS.siteName,
      tagline: m.tagline ?? DEFAULT_SETTINGS.tagline,
      announcement: m.announcement ?? "",
      supportUrl: m.supportUrl ?? "",
      purchasesPaused: m.purchasesPaused === "1",
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}
