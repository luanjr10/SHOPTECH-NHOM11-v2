const KEY = "shoptech_aff";
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

type Stored = Record<string, { code: string; at: number }>;

function read(): Stored {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "{}") as Stored;
  } catch {
    return {};
  }
}

/** Link affiliate dạng /san-pham/<slug>?aff=<MÃ>: ghi nhớ mã theo từng sản phẩm 30 ngày (lần bấm cuối thắng). */
export function captureAffiliateFromUrl(): void {
  try {
    const match = window.location.pathname.match(/^\/san-pham\/([^/]+)/);
    const code = new URLSearchParams(window.location.search).get("aff");
    if (!match || !code || !/^[A-Za-z0-9]{4,12}$/.test(code)) return;

    const stored = read();
    stored[match[1]] = { code: code.toUpperCase(), at: Date.now() };
    localStorage.setItem(KEY, JSON.stringify(stored));
  } catch {
    // localStorage bị chặn → chỉ mất ghi nhận affiliate
  }
}

export function getAffiliateCode(slug?: string | null): string | null {
  if (!slug) return null;
  const entry = read()[slug];
  return entry && Date.now() - entry.at < MAX_AGE_MS ? entry.code : null;
}

export function buildAffiliateLink(slug: string, code: string): string {
  return `${window.location.origin}/san-pham/${slug}?aff=${code}`;
}
