/**
 * مخزن الصوت المحلي — IndexedDB
 * ============================================================
 * Issue #9: تنزيل التلاوات فعليًا والتشغيل دون شبكة.
 *
 * - تخزين ملف MP3 لكل آية (Blob) بمفتاح `{reciterId}:{ayahId}`
 *   داخل قاعدة `noor-alhuda-audio` (object store واحد: ayahs).
 * - التشغيل يقرأ من المخزن أولًا (blob URL) قبل الشبكة —
 *   ما يجعل السور المنزّلة تعمل دون أي اتصال.
 * - التنزيل الفعلي يتم عبر proxy داخلي بنفس الأصل
 *   (`/api/audio/{ayahId}?reciter=...`) لأن CDN الخارجي
 *   لا يرسل ترويسات CORS، وبالتالي جلب Blob من المتصفح
 *   مباشرةً محجوب.
 * - حذف فردي (سورة/مقرئ) وكلي، وقياس استهلاك التخزين.
 *
 * كل دوال المتصفح محمية بفحوص `typeof` لتكون آمنة أثناء SSR
 * وقابلة للاستيراد في بيئات بلا IndexedDB (اختبارات Bun).
 */

export const AUDIO_DB_NAME = "noor-alhuda-audio";
export const AUDIO_DB_VERSION = 1;
export const AYAH_STORE = "ayahs";

/** القالب الافتراضي — مطابق لمحرك التلاوات (fallback) */
export const DEFAULT_AUDIO_TEMPLATE = "https://cdn.islamic.network/quran/audio/128/ar.alafasy/{ayah}.mp3";

export interface StoredAyahRecord {
  key: string; // {reciterId}:{ayahId}
  reciterId: string;
  ayahId: number; // الرقم العالمي
  surah: number;
  sizeBytes: number;
  blob: Blob;
  downloadedAt: number;
}

/* ============================================================
   منطق نقي — قابل للاختبار مباشرة (بلا متصفح)
   ============================================================ */

export function ayahKey(reciterId: string, ayahId: number): string {
  return `${reciterId}:${ayahId}`;
}

export function parseAyahKey(key: string): { reciterId: string; ayahId: number } | null {
  const idx = key.lastIndexOf(":");
  if (idx <= 0 || idx === key.length - 1) return null;
  const reciterId = key.slice(0, idx);
  const ayahId = Number(key.slice(idx + 1));
  if (!reciterId || !Number.isInteger(ayahId) || ayahId < 1) return null;
  return { reciterId, ayahId };
}

/** أول رقم عالمي للآية ضمن السورة (تراكمي فوق قائمة السور) */
export function firstGlobalAyahId(
  surahs: { number: number; ayahCount: number }[],
  surahNumber: number
): number | null {
  let cum = 0;
  for (const s of surahs) {
    if (s.number === surahNumber) return cum + 1;
    cum += s.ayahCount;
  }
  return null;
}

/** كل أرقام الآيات العالمية لسورة معينة */
export function ayahIdsForSurah(
  surahs: { number: number; ayahCount: number }[],
  surahNumber: number
): number[] {
  const first = firstGlobalAyahId(surahs, surahNumber);
  if (first == null) return [];
  const count = surahs.find((s) => s.number === surahNumber)?.ayahCount ?? 0;
  return Array.from({ length: count }, (_, i) => first + i);
}

/**
 * بناء رابط MP3 للآية من قالب المقرئ.
 * يدعم العناصر النائبة {reciter} و {ayah} و {ayahId}،
 * ويعود للقالب الافتراضي إن كان القالب فارغًا أو بلا عنصر نائب.
 */
export function ayahAudioUrl(template: string, reciterId: string, ayahId: number): string {
  const tpl = template && template.includes("{") ? template : DEFAULT_AUDIO_TEMPLATE;
  return tpl
    .split("{reciter}").join(reciterId)
    .split("{ayahId}").join(String(ayahId))
    .split("{ayah}").join(String(ayahId));
}

/** رابط الـ proxy الداخلي بنفس الأصل (تنزيل فعلي عبر الخادم) */
export function proxyAudioUrl(ayahId: number, reciterId: string): string {
  const suffix = reciterId ? `?reciter=${encodeURIComponent(reciterId)}` : "";
  return `/api/audio/${ayahId}${suffix}`;
}

/* ============================================================
   طبقة IndexedDB — متاحة في المتصفح فقط (null/تجاهل خارجها)
   ============================================================ */

function openAudioDb(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === "undefined") return Promise.resolve(null);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(AUDIO_DB_NAME, AUDIO_DB_VERSION);
    req.onupgradeneeded = () => {
      const database = req.result;
      if (!database.objectStoreNames.contains(AYAH_STORE)) {
        const store = database.createObjectStore(AYAH_STORE, { keyPath: "key" });
        store.createIndex("byReciter", "reciterId", { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("فشل فتح مخزن الصوت"));
  });
}

async function withStore<T>(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest | void
): Promise<T | null> {
  const db = await openAudioDb();
  if (!db) return null;
  return new Promise<T | null>((resolve, reject) => {
    const tx = db.transaction(AYAH_STORE, mode);
    const store = tx.objectStore(AYAH_STORE);
    let result: unknown = null;
    const req = fn(store);
    if (req) {
      req.onsuccess = () => {
        result = req.result;
      };
    }
    tx.oncomplete = () => {
      db.close();
      resolve(result as T | null);
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error ?? new Error("فشل عملية المخزن"));
    };
    tx.onabort = () => {
      db.close();
      reject(tx.error ?? new Error("أُجهضت عملية المخزن"));
    };
  });
}

export async function getAyahRecord(reciterId: string, ayahId: number): Promise<StoredAyahRecord | null> {
  const rec = await withStore<StoredAyahRecord>("readonly", (s) => s.get(ayahKey(reciterId, ayahId)));
  return rec ?? null;
}

export async function putAyahRecord(record: StoredAyahRecord): Promise<void> {
  await withStore("readwrite", (s) => {
    s.put(record);
  });
}

/** حذف مجموعة سجلات بمفاتيحها (حذف سورة كاملة للمقرئ) */
export async function deleteAyahKeys(keys: string[]): Promise<void> {
  if (!keys.length) return;
  await withStore("readwrite", (s) => {
    for (const k of keys) s.delete(k);
  });
}

export async function clearAyahStore(): Promise<void> {
  await withStore("readwrite", (s) => {
    s.clear();
  });
}

/** رابط تشغيل محلي (blob:) للآية إن وُجدت في المخزن — وإلا null */
export async function getPlaybackUrl(reciterId: string, ayahId: number): Promise<string | null> {
  if (typeof URL === "undefined" || typeof URL.createObjectURL !== "function") return null;
  const rec = await getAyahRecord(reciterId, ayahId);
  if (!rec) return null;
  try {
    return URL.createObjectURL(rec.blob);
  } catch {
    return null;
  }
}

/** معلومات التخزين الفعلي لسورة/مقرئ: كم آية مخزّنة وكم بايت */
export async function getSurahStoredInfo(
  reciterId: string,
  ayahIds: number[]
): Promise<{ stored: number; bytes: number }> {
  let stored = 0;
  let bytes = 0;
  for (const id of ayahIds) {
    const rec = await getAyahRecord(reciterId, id);
    if (rec) {
      stored += 1;
      bytes += rec.sizeBytes;
    }
  }
  return { stored, bytes };
}

/** تقدير استهلاك التخزين (navigator.storage.estimate) — null إن غير مدعوم */
export async function storageEstimate(): Promise<{ usage: number; quota: number } | null> {
  if (typeof navigator === "undefined" || !navigator.storage?.estimate) return null;
  try {
    const est = await navigator.storage.estimate();
    return { usage: est.usage ?? 0, quota: est.quota ?? 0 };
  } catch {
    return null;
  }
}

/* ============================================================
   منفذ التخزين — قابل للحقن للاختبارات (بديل IndexedDB)
   ============================================================ */

export interface AyahStoragePort {
  put(record: StoredAyahRecord): Promise<void>;
  has(reciterId: string, ayahId: number): Promise<boolean>;
}

function realStoragePort(): AyahStoragePort {
  return {
    put: (record) => putAyahRecord(record),
    has: async (reciterId, ayahId) => (await getAyahRecord(reciterId, ayahId)) !== null,
  };
}

/** تخزين ذاكرة للاختبارات */
export function createMemoryAyahStorage(): AyahStoragePort & { records: Map<string, StoredAyahRecord> } {
  const records = new Map<string, StoredAyahRecord>();
  return {
    records,
    async put(record) {
      records.set(record.key, record);
    },
    async has(reciterId, ayahId) {
      return records.has(ayahKey(reciterId, ayahId));
    },
  };
}

/* ============================================================
   التنزيل الفعلي — تجمع آيات بconcurrency محدود مع تقدم وإلغاء
   ============================================================ */

export interface AudioFetchResponse {
  ok: boolean;
  status?: number;
  blob(): Promise<Blob>;
}

export interface DownloadDeps {
  /** بديل fetch للاختبارات */
  fetcher?: (url: string, init?: { signal?: AbortSignal }) => Promise<AudioFetchResponse>;
  /** بديل IndexedDB للاختبارات */
  storage?: AyahStoragePort;
  /** بناء الرابط (الافتراضي: proxy داخلي) — للاختبارات */
  buildUrl?: (ayahId: number, reciterId: string) => string;
}

export interface DownloadOptions {
  reciterId: string;
  surahNumber: number;
  ayahIds: number[];
  concurrency?: number;
  signal?: AbortSignal;
  /** تخطّي الآيات الموجودة مسبقًا (استئناف تنزيل ناقص) */
  skipExisting?: boolean;
  onProgress?: (p: { done: number; total: number; bytesSoFar: number; failed: number }) => void;
}

export interface DownloadSummary {
  storedCount: number;
  failedAyahs: number[];
  totalBytes: number;
  cancelled: boolean;
}

/**
 * تنزيل كل آيات السورة كمفاتيح Blob في المخزن.
 * - pool من المهام بحد concurrency (افتراضي 4)
 * - يقبل الإلغاء عبر AbortSignal
 * - يبلّغ التقدم بعد كل آية (نجاح أو فشل)
 * لا يلمس قاعدة بيانات الخادم — تسجيل السجل النهائي مسؤولية المستدعي.
 */
export async function downloadSurahAudio(
  opts: DownloadOptions,
  deps: DownloadDeps = {}
): Promise<DownloadSummary> {
  const fetcher = deps.fetcher ?? ((url, init) => fetch(url, init) as unknown as Promise<AudioFetchResponse>);
  const storage = deps.storage ?? realStoragePort();
  const buildUrl = deps.buildUrl ?? ((ayahId: number, reciterId: string) => proxyAudioUrl(ayahId, reciterId));

  const { reciterId, surahNumber, ayahIds } = opts;
  const concurrency = Math.max(1, Math.min(opts.concurrency ?? 4, 8));
  const total = ayahIds.length;

  let done = 0;
  let bytesSoFar = 0;
  let storedCount = 0;
  let cancelled = false;
  const failedAyahs: number[] = [];
  let next = 0;

  const report = () =>
    opts.onProgress?.({ done, total, bytesSoFar, failed: failedAyahs.length });

  const worker = async (): Promise<void> => {
    while (!cancelled) {
      if (opts.signal?.aborted) {
        cancelled = true;
        return;
      }
      const i = next++;
      if (i >= total) return;
      const ayahId = ayahIds[i];
      try {
        if (opts.skipExisting && (await storage.has(reciterId, ayahId))) {
          storedCount += 1;
        } else {
          const res = await fetcher(buildUrl(ayahId, reciterId), { signal: opts.signal });
          if (!res.ok) throw new Error(`HTTP ${res.status ?? "غير معروف"}`);
          const blob = await res.blob();
          const sizeBytes = blob.size;
          const record: StoredAyahRecord = {
            key: ayahKey(reciterId, ayahId),
            reciterId,
            ayahId,
            surah: surahNumber,
            sizeBytes,
            blob,
            downloadedAt: Date.now(),
          };
          await storage.put(record);
          storedCount += 1;
          bytesSoFar += sizeBytes;
        }
      } catch (err) {
        if (opts.signal?.aborted) {
          cancelled = true;
          return;
        }
        failedAyahs.push(ayahId);
      }
      done += 1;
      report();
    }
  };

  await Promise.all(Array.from({ length: Math.min(concurrency, Math.max(total, 1)) }, worker));
  if (opts.signal?.aborted) cancelled = true;

  return { storedCount, failedAyahs, totalBytes: bytesSoFar, cancelled };
}
