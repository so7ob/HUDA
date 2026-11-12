"use client";

/** عميل الـ API الموحّد — كل الطلبات مسارات نسبية */

async function get<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`API ${res.status}: ${url}`);
  return res.json();
}

async function post<T>(url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${url}`);
  return res.json();
}

async function patch<T>(url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${url}`);
  return res.json();
}

async function del<T>(url: string): Promise<T> {
  const res = await fetch(url, { method: "DELETE" });
  if (!res.ok) throw new Error(`API ${res.status}: ${url}`);
  return res.json();
}

/** قراءة رسالة الخطأ من استجابة API (لعرضها للمستخدم) */
async function postSafe<T>(url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((json as { error?: string }).error || `API ${res.status}`);
  return json as T;
}

async function patchSafe<T>(url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((json as { error?: string }).error || `API ${res.status}`);
  return json as T;
}

/* ---------- الأنواع ---------- */

export interface SurahMeta {
  number: number;
  name: string;
  nameFull: string;
  ayahCount: number;
  revelationType: string;
  startPage: number;
  juzStart: number;
}

export interface Ayah {
  id: number;
  surah: number;
  numberInSurah: number;
  text: string;
  page: number;
  juz: number;
  hizbQuarter: number;
  sajda: boolean;
}

export interface AyahWithTafsir extends Ayah {
  tafsir?: string;
}

export interface TopicItem {
  id: string;
  key: string;
  title: string;
  description?: string;
  ayahCount: number;
  ayahs?: { surah: number; ayah: number; note?: string; text?: string }[];
}

export interface LibrarySectionItem {
  id: string;
  key: string;
  title: string;
  icon: string;
  color: string;
  description?: string;
  bookCount?: number;
}

export interface BookItem {
  id: string;
  sectionId: string;
  title: string;
  subtitle?: string;
  author?: string;
  description?: string;
  coverStyle: string;
  coverEmoji?: string;
  edition?: string;
  sourceName?: string;
  licenseNote?: string;
  mediaUrl?: string;
  mediaLabel?: string;
  status: string;
  isFeatured: boolean;
  chapterCount?: number;
  sectionTitle?: string;
}

export interface ChapterItem {
  id: string;
  bookId: string;
  number: number;
  title: string;
  content: string;
}

export interface PlanItem {
  id: string;
  kind: string;
  name: string;
  targetType: string;
  targetRef: string;
  totalPages: number;
  startDate: string;
  endDate?: string;
  reminderTime?: string;
  repeatKind: string;
  status: string;
  doneDays?: number;
  totalDays?: number;
  pagesRead?: number;
  todayDone?: boolean;
  targetLabel?: string;
}

export interface ReciterItem {
  id: string;
  name: string;
  riwayah: string;
  style: string;
  audioUrlTemplate?: string;
  isDefault: boolean;
  source: string;
  license: string;
  bitrate: string;
}

export interface SearchResultItem {
  kind: "ayah" | "tafsir" | "book" | "chapter" | "surah" | "topic" | "dua";
  title: string;
  snippet: string;
  surah?: number;
  ayahInSurah?: number;
  bookId?: string;
  ref: string;
}

export interface FavoriteItem {
  id: string;
  kind: string;
  refKey: string;
  label: string;
  detail?: string;
  createdAt: string;
}

export interface BookmarkItem {
  id: string;
  kind: string;
  refKey: string;
  label: string;
  createdAt: string;
}

export interface LastReadingData {
  surah: number;
  ayah: number;
  page: number;
  mode: "list" | "mushaf";
  updatedAt: string;
  surahName?: string;
  totalPages?: number;
}

export interface NotificationItem {
  id: string;
  kind: string;
  title: string;
  body: string;
  fireAt?: string;
  scheduledAt?: string;
  isRead: boolean;
}

/* ---------- نقاط النهاية ---------- */

export const api = {
  /* القرآن */
  surahs: () => get<{ surahs: SurahMeta[] }>("/api/quran/surahs"),
  surah: (n: number) => get<{ surah: SurahMeta; ayahs: AyahWithTafsir[] }>(`/api/quran/surah/${n}`),
  page: (p: number) => get<{ page: number; ayahs: AyahWithTafsir[] }>(`/api/quran/page/${p}`),
  pageMushaf: (p: number) =>
    get<{
      page: number;
      juz: number;
      hizbQuarter: number;
      slots: { kind: "text" | "header" | "bismillah"; line?: number; items?: { c: string; t: number; ay: number; s: number; aid: number }[]; surah?: number; surahName?: string; withBismillahInline?: boolean }[];
      surahs: { number: number; name: string; nameFull: string; ayahCount: number; revelationType: string }[];
    }>(`/api/quran/page/${p}/mushaf`),
  juz: (n: number) => get<{ juz: number; surahs: (SurahMeta & { pageFrom: number; pageTo: number })[]; ayahFrom: Ayah }>(`/api/quran/juz/${n}`),
  pagesIndex: () => get<{ pages: { page: number; surah: number; surahName: string; juz: number }[] }>("/api/quran/pages-index"),
  tafsir: (surah: number, ayah: number) =>
    get<{ text: string; source: { key: string; name: string; author: string; source: string } }>(`/api/quran/tafsir/${surah}/${ayah}`),
  topics: () => get<{ topics: TopicItem[] }>("/api/quran/topics"),
  topic: (id: string) => get<{ topic: TopicItem }>(`/api/quran/topics/${id}`),

  /* البحث */
  search: (q: string) => get<{ results: SearchResultItem[]; query: string }>(`/api/search?q=${encodeURIComponent(q)}`),

  /* المفضلة والعلامات */
  favorites: () => get<{ favorites: FavoriteItem[] }>("/api/favorites"),
  addFavorite: (kind: string, refKey: string, label: string, detail?: string) =>
    post<{ ok: boolean }>("/api/favorites", { kind, refKey, label, detail }),
  removeFavorite: (kind: string, refKey: string) => post<{ ok: boolean }>(`/api/favorites/remove`, { kind, refKey }),
  bookmarks: () => get<{ bookmarks: BookmarkItem[] }>("/api/bookmarks"),
  addBookmark: (kind: string, refKey: string, label: string) => post<{ ok: boolean }>("/api/bookmarks", { kind, refKey, label }),
  removeBookmark: (kind: string, refKey: string) => post<{ ok: boolean }>(`/api/bookmarks/remove`, { kind, refKey }),

  /* آخر قراءة */
  lastReading: () => get<{ last: LastReadingData }>("/api/last-reading"),
  saveLastReading: (surah: number, ayah: number, page: number, mode: string) =>
    post<{ ok: boolean }>("/api/last-reading", { surah, ayah, page, mode }),

  /* المكتبة */
  sections: () => get<{ sections: LibrarySectionItem[] }>("/api/library/sections"),
  books: (sectionKey?: string) =>
    get<{ books: BookItem[] }>(`/api/library/books${sectionKey ? `?section=${encodeURIComponent(sectionKey)}` : ""}`),
  book: (id: string) => get<{ book: BookItem; chapters: ChapterItem[] }>(`/api/library/book/${id}`),

  /* الأوراد والبرامج */
  plans: (status?: string) => get<{ plans: PlanItem[] }>(`/api/plans${status ? `?status=${encodeURIComponent(status)}` : ""}`),
  createPlan: (data: Record<string, unknown>) => post<{ plan: PlanItem }>("/api/plans", data),
  updatePlan: (id: string, data: Record<string, unknown>) => patch<{ plan: PlanItem }>(`/api/plans/${id}`, data),
  deletePlan: (id: string) => del<{ ok: boolean }>(`/api/plans/${id}`),
  logPlan: (id: string, date: string, done: boolean, pagesRead?: number) =>
    post<{ ok: boolean }>(`/api/plans/${id}/log`, { date, done, pagesRead }),

  /* المقرئون والتنزيلات */
  reciters: () => get<{ reciters: ReciterItem[] }>("/api/reciters"),
  setDefaultReciter: (id: string) => post<{ ok: boolean }>("/api/reciters/default", { id }),
  downloads: () => get<{ downloads: { id: string; reciterId: string; reciterName: string; surah: number; surahName: string; ayahCount: number; sizeBytes: number; status: string }[] }>("/api/downloads"),
  addDownload: (reciterId: string, reciterName: string, surah: number, surahName: string, ayahCount: number, sizeBytes: number) =>
    post<{ ok: boolean }>("/api/downloads", { reciterId, reciterName, surah, surahName, ayahCount, sizeBytes }),
  removeDownload: (id: string) => del<{ ok: boolean }>(`/api/downloads?id=${id}`),

  /* الإعدادات */
  getSettings: () => get<{ settings: Record<string, unknown> }>("/api/settings"),
  saveSettings: (data: Record<string, unknown>) => post<{ ok: boolean }>("/api/settings", data),

  /* حزم المحتوى */
  packages: () => get<{ packages: { id: string; key: string; name: string; kind: string; description: string; version: number; status: string; sizeLabel: string; installedAt?: string }[] }>("/api/packages"),
  refreshPackage: (key: string) => post<{ ok: boolean }>("/api/packages", { key }),

  /* الإشعارات */
  notifications: () => get<{ notifications: NotificationItem[] }>("/api/notifications"),
  createNotification: (data: { title: string; body: string; kind?: string; scheduledAt?: string; fireAt?: string }) =>
    post<{ ok: boolean }>("/api/notifications", data),
  markNotificationRead: (id: string) => post<{ ok: boolean }>(`/api/notifications/read`, { id }),
  clearNotifications: () => post<{ ok: boolean }>("/api/notifications/clear"),

  /* الإدارة */
  admin: {
    session: () =>
      get<{ authenticated: boolean; user?: { username: string; displayName: string; role: string } }>(
        "/api/admin/auth/session"
      ),
    login: (username: string, password: string) =>
      postSafe<{ ok: boolean; user: { username: string; displayName: string; role: string } }>(
        "/api/admin/auth/login",
        { username, password }
      ),
    logout: () => postSafe<{ ok: boolean }>("/api/admin/auth/logout"),
    changePassword: (currentPassword: string, newPassword: string) =>
      patchSafe<{ ok: boolean }>("/api/admin/auth/password", { currentPassword, newPassword }),
    overview: () =>
      get<{ stats: Record<string, number> & { byStatus?: Record<string, number> }; audit: { id: string; actor: string; action: string; entity: string; entityId?: string; details?: string; createdAt: string }[] }>(
        "/api/admin/overview"
      ),
    books: (status?: string) => get<{ books: BookItem[] }>(`/api/admin/books${status ? `?status=${encodeURIComponent(status)}` : ""}`),
    createBook: (data: Record<string, unknown>) => postSafe<{ book: BookItem }>("/api/admin/books", data),
    updateBook: (id: string, data: Record<string, unknown>) => patchSafe<{ book: BookItem }>(`/api/admin/books/${id}`, data),
    setBookStatus: (id: string, status: string) => postSafe<{ book: BookItem }>(`/api/admin/books/${id}/status`, { status }),
    deleteBook: (id: string) => del<{ ok: boolean }>(`/api/admin/books/${id}`),
    chapters: (bookId: string) => get<{ chapters: ChapterItem[] }>(`/api/admin/chapters?bookId=${bookId}`),
    createChapter: (data: Record<string, unknown>) => postSafe<{ chapter: ChapterItem }>("/api/admin/chapters", data),
    updateChapter: (id: string, data: Record<string, unknown>) => patchSafe<{ chapter: ChapterItem }>(`/api/admin/chapters/${id}`, data),
    deleteChapter: (id: string) => del<{ ok: boolean }>(`/api/admin/chapters/${id}`),
    sections: () => get<{ sections: LibrarySectionItem[] }>("/api/admin/sections"),
    createSection: (data: Record<string, unknown>) => postSafe<{ section: LibrarySectionItem }>("/api/admin/sections", data),
    updateSection: (id: string, data: Record<string, unknown>) => patchSafe<{ section: LibrarySectionItem }>(`/api/admin/sections/${id}`, data),
    deleteSection: (id: string) => del<{ ok: boolean }>(`/api/admin/sections/${id}`),
    topics: () => get<{ topics: TopicItem[] }>("/api/admin/topics"),
    topic: (id: string) =>
      get<{
        topic: TopicItem & {
          isPublished: boolean;
          ayahs: { id: string; surah: number; ayah: number; note?: string; text: string }[];
        };
      }>(`/api/admin/topics/${id}`),
    createTopic: (data: { title: string; description?: string }) => postSafe<{ topic: TopicItem }>("/api/admin/topics", data),
    updateTopic: (id: string, data: Record<string, unknown>) => patchSafe<{ topic: TopicItem }>(`/api/admin/topics/${id}`, data),
    reciters: () => get<{ reciters: AdminReciter[] }>("/api/admin/reciters"),
    createReciter: (data: Record<string, unknown>) => postSafe<{ reciter: AdminReciter }>("/api/admin/reciters", data),
    updateReciter: (id: string, data: Record<string, unknown>) => patchSafe<{ reciter: AdminReciter }>(`/api/admin/reciters/${id}`, data),
    deleteReciter: (id: string) => del<{ ok: boolean }>(`/api/admin/reciters/${id}`),
    packages: () => get<{ packages: AdminPackage[] }>("/api/admin/packages"),
    refreshPackage: (key: string, bumpVersion?: boolean) =>
      postSafe<{ ok: boolean }>("/api/admin/packages", { key, bumpVersion }),
    audit: (filters?: { action?: string; entity?: string; q?: string }) => {
      const sp = new URLSearchParams();
      if (filters?.action) sp.set("action", filters.action);
      if (filters?.entity) sp.set("entity", filters.entity);
      if (filters?.q) sp.set("q", filters.q);
      const qs = sp.toString();
      return get<{ logs: AuditEntry[]; facets: { actions: { value: string; count: number }[]; entities: { value: string; count: number }[] } }>(
        `/api/admin/audit${qs ? `?${qs}` : ""}`
      );
    },
    clearAudit: () => del<{ ok: boolean; deleted: number }>("/api/admin/audit"),
    backup: () => post<{ ok: boolean; data: Record<string, unknown> }>("/api/admin/backup"),
    restore: (data: Record<string, unknown>) => postSafe<{ ok: boolean }>("/api/admin/restore", { data }),
    exportUserData: () => post<{ ok: boolean; data: Record<string, unknown> }>("/api/admin/export-user"),
  },
};

/* ---------- أنواع الإدارة ---------- */

export interface AdminReciter {
  id: string;
  name: string;
  riwayah: string;
  style: string;
  audioUrlTemplate: string;
  bitrate: string;
  source: string;
  license: string;
  isDefault: boolean;
  isActive: boolean;
  sortOrder: number;
}

export interface AdminPackage {
  id: string;
  key: string;
  name: string;
  kind: string;
  description: string;
  version: number;
  status: string;
  sizeLabel: string;
  installedAt?: string;
}

export interface AuditEntry {
  id: string;
  actor: string;
  action: string;
  entity: string;
  entityId?: string;
  details?: string;
  createdAt: string;
}
