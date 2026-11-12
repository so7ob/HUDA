/**
 * اختبارات الوحدة — مخزن الصوت المحلي ومنسّق التنزيل (Issue #9)
 * تشغيل: bun test
 * تُختبر هنا الأجزاء النقية (مفاتيح، خرائط الآيات، روابط، منسّق التنزيل)
 * عبر منفذ تخزين ذاكرة — بلا IndexedDB أو شبكة.
 */
import { describe, expect, test } from "bun:test";
import {
  ayahKey,
  parseAyahKey,
  firstGlobalAyahId,
  ayahIdsForSurah,
  ayahAudioUrl,
  proxyAudioUrl,
  DEFAULT_AUDIO_TEMPLATE,
  createMemoryAyahStorage,
  downloadSurahAudio,
  type StoredAyahRecord,
  type DownloadDeps,
} from "../../src/lib/audio-store";

/** قائمة سور صناعية: 1→7 آيات، 2→3، 3→5 */
const SYNTHETIC_SURAHS = [
  { number: 1, ayahCount: 7 },
  { number: 2, ayahCount: 3 },
  { number: 3, ayahCount: 5 },
];

describe("ayahKey / parseAyahKey", () => {
  test("صيغة المفتاح وتحليله عكسيًا", () => {
    const key = ayahKey("ar.alafasy", 42);
    expect(key).toBe("ar.alafasy:42");
    const parsed = parseAyahKey(key);
    expect(parsed).toEqual({ reciterId: "ar.alafasy", ayahId: 42 });
  });

  test("مقرئ بمعرف يحوي نقطتين — التحليل يحفظ كامل المعرف", () => {
    const key = ayahKey("quran.com:edition", 7);
    expect(parseAyahKey(key)).toEqual({ reciterId: "quran.com:edition", ayahId: 7 });
  });

  test("مفاتيح غير صالحة تُرجع null", () => {
    expect(parseAyahKey(":42")).toBeNull();
    expect(parseAyahKey("reciter:")).toBeNull();
    expect(parseAyahKey("reciter:abc")).toBeNull();
    expect(parseAyahKey("reciter:0")).toBeNull();
  });
});

describe("خرائط الآيات العالمية", () => {
  test("أول رقم عالمي للسورة تراكمي", () => {
    expect(firstGlobalAyahId(SYNTHETIC_SURAHS, 1)).toBe(1);
    expect(firstGlobalAyahId(SYNTHETIC_SURAHS, 2)).toBe(8); // بعد 7 آيات الفاتحة
    expect(firstGlobalAyahId(SYNTHETIC_SURAHS, 3)).toBe(11); // 7 + 3
    expect(firstGlobalAyahId(SYNTHETIC_SURAHS, 99)).toBeNull();
  });

  test("آيات السورة كاملة متسلسلة", () => {
    expect(ayahIdsForSurah(SYNTHETIC_SURAHS, 2)).toEqual([8, 9, 10]);
    expect(ayahIdsForSurah(SYNTHETIC_SURAHS, 1)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(ayahIdsForSurah(SYNTHETIC_SURAHS, 42)).toEqual([]);
  });
});

describe("بناء روابط الصوت", () => {
  test("قالب بعنصر {ayah}", () => {
    expect(ayahAudioUrl("https://cdn.example/{reciter}/{ayah}.mp3", "ar.alafasy", 5)).toBe(
      "https://cdn.example/ar.alafasy/5.mp3"
    );
  });

  test("قالب بعنصر {ayahId} و {reciter}", () => {
    expect(ayahAudioUrl("https://cdn.example/audio/{reciter}/{ayahId}.mp3", "ar.abdulbasit", 262)).toBe(
      "https://cdn.example/audio/ar.abdulbasit/262.mp3"
    );
  });

  test("قالب فارغ أو بلا عنصر نائب → القالب الافتراضي", () => {
    expect(ayahAudioUrl("", "ar.alafasy", 1)).toBe(DEFAULT_AUDIO_TEMPLATE.replace("{ayah}", "1"));
    expect(ayahAudioUrl("https://cdn.example/static.mp3", "ar.alafasy", 1)).toBe(
      DEFAULT_AUDIO_TEMPLATE.replace("{ayah}", "1")
    );
    expect(DEFAULT_AUDIO_TEMPLATE).toContain("ar.alafasy");
  });

  test("رابط الـ proxy الداخلي بنفس الأصل", () => {
    expect(proxyAudioUrl(1, "ar.alafasy")).toBe("/api/audio/1?reciter=ar.alafasy");
    expect(proxyAudioUrl(6236, "ar.abdulbasit")).toBe("/api/audio/6236?reciter=ar.abdulbasit");
    expect(proxyAudioUrl(5, "")).toBe("/api/audio/5");
  });
});

describe("منسّق التنزيل downloadSurahAudio", () => {
  /** بناء fetcher صناعي: كل الآيات نجاح بحجم معين، مع قائمة استثناءات */
  function fakeFetcher(okIds: Map<number, number>, failingIds: Set<number> = new Set()) {
    const requested: number[] = [];
    const fetcher: NonNullable<DownloadDeps["fetcher"]> = async (url, init) => {
      const ayahId = Number(url.split("/").pop()?.split("?")[0]);
      requested.push(ayahId);
      if (init?.signal?.aborted) throw new Error("aborted");
      if (failingIds.has(ayahId)) return { ok: false, status: 404, blob: async () => new Blob() };
      const bytes = okIds.get(ayahId) ?? 100;
      return { ok: true, status: 200, blob: async () => new Blob([new Uint8Array(bytes)]) };
    };
    return { fetcher, requested };
  }

  function recordFrom(reciterId: string, ayahId: number, surah: number, sizeBytes: number, blob: Blob): StoredAyahRecord {
    return {
      key: ayahKey(reciterId, ayahId),
      reciterId,
      ayahId,
      surah,
      sizeBytes,
      blob,
      downloadedAt: 0,
    };
  }

  test("تنزيل كامل ناجح: تخزين + بايتات + تقدم لكل آية", async () => {
    const storage = createMemoryAyahStorage();
    const ids = [1, 2, 3, 4];
    const { fetcher } = fakeFetcher(new Map([[1, 1000], [2, 2000], [3, 3000], [4, 4000]]));
    const progress: { done: number; total: number; bytesSoFar: number; failed: number }[] = [];
    const summary = await downloadSurahAudio(
      {
        reciterId: "test.reciter",
        surahNumber: 1,
        ayahIds: ids,
        concurrency: 2,
        onProgress: (p) => progress.push({ ...p }),
      },
      { fetcher, storage }
    );
    expect(summary.cancelled).toBe(false);
    expect(summary.failedAyahs).toEqual([]);
    expect(summary.storedCount).toBe(4);
    expect(summary.totalBytes).toBe(10_000);
    expect(storage.records.size).toBe(4);
    expect(storage.records.get("test.reciter:1")?.sizeBytes).toBe(1000);
    expect(storage.records.get("test.reciter:4")?.surah).toBe(1);
    // آخر بلاغ تقدم = الاكتمال
    const last = progress[progress.length - 1];
    expect(last).toEqual({ done: 4, total: 4, bytesSoFar: 10_000, failed: 0 });
    // عدد بلاغات التقدم = عدد الآيات
    expect(progress.length).toBe(4);
  });

  test("فشل جزئي: الآيات الفاشلة تُبلّغ ولا تُخزَّن", async () => {
    const storage = createMemoryAyahStorage();
    const ids = [1, 2, 3];
    const { fetcher } = fakeFetcher(new Map(ids.map((i) => [i, 500])), new Set([2]));
    const summary = await downloadSurahAudio(
      { reciterId: "test.reciter", surahNumber: 2, ayahIds: ids, concurrency: 3 },
      { fetcher, storage }
    );
    expect(summary.failedAyahs).toEqual([2]);
    expect(summary.storedCount).toBe(2);
    expect(summary.totalBytes).toBe(1000);
    expect(storage.records.size).toBe(2);
    expect(storage.records.has("test.reciter:2")).toBe(false);
  });

  test("skipExisting يخطّي الموجود مسبقًا (استكمال ناقص)", async () => {
    const storage = createMemoryAyahStorage();
    // الآية 1 موجودة مسبقًا
    storage.records.set(
      "test.reciter:1",
      recordFrom("test.reciter", 1, 1, 999, new Blob())
    );
    const ids = [1, 2, 3];
    const { fetcher, requested } = fakeFetcher(new Map([[2, 100], [3, 100]]));
    const summary = await downloadSurahAudio(
      { reciterId: "test.reciter", surahNumber: 1, ayahIds: ids, concurrency: 1, skipExisting: true },
      { fetcher, storage }
    );
    expect(summary.storedCount).toBe(3);
    expect(summary.failedAyahs).toEqual([]);
    // لم تُطلب الآية 1 من الشبكة
    expect(requested).not.toContain(1);
    expect(requested.sort()).toEqual([2, 3]);
    // حجم الآية الموجودة محفوظ كما هو
    expect(storage.records.get("test.reciter:1")?.sizeBytes).toBe(999);
  });

  test("الإلغاء يوقف التجميع ويعلّم cancelled", async () => {
    const storage = createMemoryAyahStorage();
    const ctrl = new AbortController();
    const ids = [1, 2, 3, 4, 5, 6];
    let started = 0;
    const fetcher: NonNullable<DownloadDeps["fetcher"]> = async (url, init) => {
      started += 1;
      // بعد بدء أول آيتين ألغِ
      if (started >= 2) ctrl.abort();
      if (init?.signal?.aborted) throw new Error("aborted");
      return { ok: true, blob: async () => new Blob([new Uint8Array(50)]) };
    };
    const summary = await downloadSurahAudio(
      { reciterId: "test.reciter", surahNumber: 1, ayahIds: ids, concurrency: 1, signal: ctrl.signal },
      { fetcher, storage }
    );
    expect(summary.cancelled).toBe(true);
    expect(summary.storedCount).toBeLessThan(ids.length);
    // الإشارة اكتملت: جميع العمال توقفوا قبل معالجة كل الآيات
    expect(summary.storedCount + summary.failedAyahs.length).toBeLessThan(ids.length);
  });

  test("concurrency محدود لا يتجاوز الحد", async () => {
    const storage = createMemoryAyahStorage();
    let active = 0;
    let peak = 0;
    const fetcher: NonNullable<DownloadDeps["fetcher"]> = async () => {
      active += 1;
      peak = Math.max(peak, active);
      await new Promise((r) => setTimeout(r, 5));
      active -= 1;
      return { ok: true, blob: async () => new Blob([new Uint8Array(10)]) };
    };
    const ids = Array.from({ length: 12 }, (_, i) => i + 1);
    const summary = await downloadSurahAudio(
      { reciterId: "test.reciter", surahNumber: 1, ayahIds: ids, concurrency: 3 },
      { fetcher, storage }
    );
    expect(peak).toBeLessThanOrEqual(3);
    expect(summary.storedCount).toBe(12);
    expect(summary.totalBytes).toBe(120);
  });

  test("قائمة فارغة — ملخص صفرية بلا أخطاء", async () => {
    const storage = createMemoryAyahStorage();
    const { fetcher } = fakeFetcher(new Map());
    const summary = await downloadSurahAudio(
      { reciterId: "test.reciter", surahNumber: 1, ayahIds: [] },
      { fetcher, storage }
    );
    expect(summary.storedCount).toBe(0);
    expect(summary.totalBytes).toBe(0);
    expect(summary.failedAyahs).toEqual([]);
    expect(summary.cancelled).toBe(false);
  });
});
