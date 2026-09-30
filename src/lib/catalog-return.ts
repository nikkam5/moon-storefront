export const RETURN_KEY = "moonstore-catalog-return";

export function saveCatalogReturn(filter: string, url = location.pathname + location.search + location.hash) {
  try { sessionStorage.setItem(RETURN_KEY, JSON.stringify({ url, scrollY: window.scrollY, filter })); } catch { /* Back link still works without storage. */ }
}

export function readCatalogReturn(): { url: string; scrollY: number; filter: string } | null {
  try {
    const saved = JSON.parse(sessionStorage.getItem(RETURN_KEY) || "null");
    if (saved && typeof saved.url === "string" && /^\/(?:#shop|shop)(?:$|[?#])/.test(saved.url) && Number.isFinite(saved.scrollY) && saved.scrollY >= 0 && typeof saved.filter === "string") return saved;
  } catch { /* Use the catalog fallback. */ }
  return null;
}
