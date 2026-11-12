/**
 * Service Worker — نور الهدى
 * Issue #8 (دورة التدقيق 2): عمل دون اتصال حقيقي.
 *
 * الاستراتيجيات:
 * - fonts / icons: cache-first (أصول غير متغيرة، ثقيلة — 93MB خطوط المصحف)
 * - /_next/static + الصور: stale-while-revalidate
 * - API GET للمحتوى (quran/library/reciters/topics/settings): network-first مع كولون احتياطي
 *   → ما شُوهد مرة يعمل دون شبكة
 * - تنقلات الصفحات (HTML): network-first → الكاش → الجذر المُخزَّن
 * - الاستثناءات الصريحة: غير GET، /api/admin/* (جلسات حساسة)، RSC prefetch (?_rsc)، WebSocket، XTransformPort
 * - حدّ حجم كاش صفحات المصحف (120 صفحة) لتجنب تضخم التخزين
 */
const VERSION = "noor-sw-v1";
const CACHE_STATIC = `${VERSION}-static`;
const CACHE_FONTS = `${VERSION}-fonts`;
const CACHE_API = `${VERSION}-api`;
const CACHE_PAGES = `${VERSION}-mushaf`;
const MAX_MUSHAF_PAGES = 120;

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_STATIC);
      try {
        await cache.addAll(["/", "/manifest.webmanifest", "/logo.svg"]);
      } catch {
        /* التثبيت لا يفشل إن تعذر جلب الجذر أول مرة */
      }
      await self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keep = new Set([CACHE_STATIC, CACHE_FONTS, CACHE_API, CACHE_PAGES]);
      for (const name of await caches.keys()) {
        if (!keep.has(name)) await caches.delete(name);
      }
      await self.clients.claim();
    })()
  );
});

function isMushafPage(url) {
  return /^\/api\/quran\/page\/\d+\/mushaf$/.test(url.pathname);
}

function isCacheableApi(url) {
  if (url.searchParams.has("XTransformPort")) return false;
  if (isMushafPage(url)) return true;
  return (
    url.pathname.startsWith("/api/quran/") ||
    url.pathname.startsWith("/api/library/") ||
    url.pathname.startsWith("/api/reciters") ||
    url.pathname.startsWith("/api/topics") ||
    url.pathname.startsWith("/api/settings") ||
    url.pathname.startsWith("/api/search") ||
    url.pathname.startsWith("/api/surahs")
  );
}

/** قصّ كاش صفحات المصحف إلى أحدث MAX_MUSHAF_PAGES */
async function trimMushafCache() {
  const cache = await caches.open(CACHE_PAGES);
  const keys = await cache.keys();
  if (keys.length <= MAX_MUSHAF_PAGES) return;
  keys.sort((a, b) => (a.url.match(/page\/(\d+)/)?.[1] ?? 0) - (b.url.match(/page\/(\d+)/)?.[1] ?? 0));
  for (const k of keys.slice(0, keys.length - MAX_MUSHAF_PAGES)) await cache.delete(k);
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.searchParams.has("_rsc") || url.searchParams.has("XTransformPort")) return;
  if (url.pathname.startsWith("/api/admin/")) return;

  /* الخطوط والأيقونات — cache-first */
  if (url.pathname.startsWith("/fonts/") || url.pathname.startsWith("/huda/icons/") || url.pathname === "/logo.svg") {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_FONTS);
        const hit = await cache.match(req);
        if (hit) return hit;
        try {
          const res = await fetch(req);
          if (res.ok) cache.put(req, res.clone());
          return res;
        } catch {
          return hit ?? Response.error();
        }
      })()
    );
    return;
  }

  /* chunks ثابتة وصور — stale-while-revalidate */
  if (url.pathname.startsWith("/_next/static") || url.pathname.startsWith("/images/") || url.pathname.startsWith("/huda/")) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_STATIC);
        const hit = await cache.match(req);
        const network = fetch(req)
          .then((res) => {
            if (res.ok) cache.put(req, res.clone());
            return res;
          })
          .catch(() => undefined);
        return hit ?? (await network) ?? Response.error();
      })()
    );
    return;
  }

  /* API محتوى — network-first مع احتياطي الكاش */
  if (isCacheableApi(url)) {
    event.respondWith(
      (async () => {
        const cacheName = isMushafPage(url) ? CACHE_PAGES : CACHE_API;
        const cache = await caches.open(cacheName);
        try {
          const res = await fetch(req);
          if (res.ok) {
            cache.put(req, res.clone());
            if (isMushafPage(url)) event.waitUntil(trimMushafCache());
          }
          return res;
        } catch {
          const hit = await cache.match(req);
          if (hit) return hit;
          return new Response(JSON.stringify({ offline: true, error: "المحتوى غير مخزَّن للعمل دون اتصال" }), {
            status: 503,
            headers: { "Content-Type": "application/json" },
          });
        }
      })()
    );
    return;
  }

  /* تنقلات الصفحات — network-first → الكاش → الجذر */
  if (req.mode === "navigate") {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_STATIC);
        try {
          const res = await fetch(req);
          if (res.ok) cache.put(req, res.clone());
          return res;
        } catch {
          const hit = (await cache.match(req)) ?? (await cache.match("/"));
          return hit ?? new Response("التطبيق غير متاح دون اتصال في هذه الصفحة بعد", {
            status: 503,
            headers: { "Content-Type": "text/plain; charset=utf-8" },
          });
        }
      })()
    );
  }
});
