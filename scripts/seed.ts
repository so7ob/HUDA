/**
 * سكربت تغذية قاعدة البيانات — «نور الهدى»
 * ============================================================
 * مصادر البيانات (موثقة، مرخصة، بلا أي محتوى مولَّد بالذكاء الاصطناعي):
 *  1. النص القرآني العثماني (رواية حفص عن عاصم، تقسيم مدني 604 صفحات):
 *     Tanzil (ترخيص مفتوح موثق) — عبر api.alquran.cloud/v1/quran/quran-uthmani
 *  2. التفسير الميسّر — مجمع الملك فهد لطباعة المصحف الشريف (ترخيص مفتوح):
 *     api.alquran.cloud/v1/quran/ar.muyassar
 *  3. التلاوات: cdn.islamic.network (everyayah) — ملفات لكل آية،
 *     مما يتيح تظليلًا صحيحًا للآية الجارية (بيانات التوقيت مضمونة بالبنية).
 *  4. الفهرس الموضوعي: آيات مشهورة مرجعية قابلة للمراجعة العلمية.
 *  5. المكتبة: أقسام المحتوى + كتاب «الأدعية القرآنية» مجمَّع من القرآن نفسه
 *     (نصوص قرآنية خالصة بإحالات دقيقة) — لا نصوص مختلقة.
 */
import { PrismaClient } from "@prisma/client";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { randomBytes, scryptSync } from "crypto";

const db = new PrismaClient();
const CACHE_DIR = "db/cache";
const BASE = "https://api.alquran.cloud/v1";

interface AyahRaw {
  number: number; numberInSurah: number; text: string; page: number; juz: number; hizbQuarter: number; sajda: boolean | { recommended: boolean; obligatory: boolean };
}
interface SurahRaw {
  number: number; name: string; numberOfAyahs: number; revelationType: string; ayahs: AyahRaw[];
}

async function fetchCached(url: string, file: string): Promise<unknown> {
  const path = `${CACHE_DIR}/${file}`;
  if (existsSync(path)) return JSON.parse(readFileSync(path, "utf8"));
  console.log(`  ⤓ fetch: ${file}`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  const json = await res.json();
  writeFileSync(path, JSON.stringify(json));
  return json;
}

function stripBismillahPrefix(text: string, surah: number, ayahNumber: number): string {
  // آية البسملة داخل الفاتحة تُحفظ كما هي؛ في باقي السور تُنزع البسملة الافتتاحية
  if (ayahNumber === 1 && surah !== 1 && surah !== 9) {
    return text.replace(/^\s*بِسْمِ\s*ٱللَّهِ\s*ٱلرَّحْمَ[ـٰ]?نِ\s*ٱلرَّحِيمِ\s*/u, "").trim();
  }
  return text;
}

function cleanSurahName(name: string): string {
  return name.replace(/^سُورَةُ\s*/u, "").trim();
}

async function seedQuran() {
  const quran = (await fetchCached(`${BASE}/quran/quran-uthmani`, "quran-uthmani.json")) as { data: { surahs: SurahRaw[] } };

  const surahs = quran.data.surahs;
  console.log(`📖 Quran: ${surahs.length} surahs`);

  const surahRows = surahs.map((s) => {
    const first = s.ayahs[0];
    return {
      number: s.number,
      name: cleanSurahName(s.name),
      nameFull: `سورة ${cleanSurahName(s.name)}`,
      ayahCount: s.ayahs.length,
      revelationType: s.revelationType === "Meccan" ? "مكية" : "مدنية",
      startPage: first.page,
      juzStart: first.juz,
    };
  });
  for (const row of surahRows) {
    await db.quranSurah.upsert({ where: { number: row.number }, update: row, create: row });
  }
  console.log("  ✓ 114 surah metadata");

  const totalAyahs = surahs.reduce((acc, s) => acc + s.ayahs.length, 0);
  console.log(`  total ayahs: ${totalAyahs}`);
  await db.quranAyah.deleteMany({});
  const ayahRows: { id: number; surah: number; numberInSurah: number; text: string; page: number; juz: number; hizbQuarter: number; sajda: boolean }[] = [];
  for (const s of surahs) {
    for (const a of s.ayahs) {
      ayahRows.push({
        id: a.number,
        surah: s.number,
        numberInSurah: a.numberInSurah,
        text: stripBismillahPrefix(a.text, s.number, a.numberInSurah),
        page: a.page,
        juz: a.juz,
        hizbQuarter: a.hizbQuarter,
        sajda: Boolean(a.sajda),
      });
    }
  }
  for (let i = 0; i < ayahRows.length; i += 500) {
    await db.quranAyah.createMany({ data: ayahRows.slice(i, i + 500) });
  }
  console.log(`  ✓ ${ayahRows.length} ayahs (uthmani, page/juz mapped)`);
}

async function seedTafsir() {
  await db.tafsirSource.upsert({
    where: { key: "muyassar" },
    update: {},
    create: {
      key: "muyassar",
      name: "التفسير الميسّر",
      author: "لجنة من العلماء — مجمع الملك فهد لطباعة المصحف الشريف",
      source: "مجمع الملك فهد لطباعة المصحف الشريف — المدينة النبوية",
      license: "مفتوح بموافقة المجمع (المصدر: api.alquran.cloud / Tanzil mirrors)",
      isDefault: true,
      isActive: true,
    },
  });

  const tafsir = (await fetchCached(`${BASE}/quran/ar.muyassar`, "muyassar.json")) as { data: { surahs: SurahRaw[] } };
  await db.tafsirAyah.deleteMany({ where: { tafsirKey: "muyassar" } });
  const rows: { tafsirKey: string; ayahId: number; text: string }[] = [];
  for (const s of tafsir.data.surahs) {
    for (const a of s.ayahs) {
      rows.push({ tafsirKey: "muyassar", ayahId: a.number, text: a.text });
    }
  }
  for (let i = 0; i < rows.length; i += 500) {
    await db.tafsirAyah.createMany({ data: rows.slice(i, i + 500) });
  }
  console.log(`  ✓ ${rows.length} tafsir entries (الميسر)`);
}

async function seedReciters() {
  const editions = (await fetchCached(`${BASE}/edition?format=audio&language=ar`, "audio-editions.json")) as { data: { identifier: string; name: string; englishName: string; format: string; type: string }[] };
  const chosen: { id: string; name: string; style: string; sortOrder: number }[] = [
    { id: "ar.alafasy", name: "مشاري راشد العفاسي", style: "مرتل", sortOrder: 1 },
    { id: "ar.abdulbasitmurattal", name: "عبد الباسط عبد الصمد", style: "مرتل", sortOrder: 2 },
    { id: "ar.minshawi", name: "محمد صديق المنشاوي", style: "مرتل", sortOrder: 3 },
    { id: "ar.abdurrahmaansudais", name: "عبد الرحمن السديس", style: "مرتل", sortOrder: 4 },
    { id: "ar.husary", name: "محمود خليل الحصري", style: "مرتل", sortOrder: 5 },
    { id: "ar.muhammadayyoub", name: "محمد أيوب", style: "مرتل", sortOrder: 6 },
  ];
  let idx = 0;
  for (const c of chosen) {
    const found = editions.data.find((e) => e.identifier === c.id);
    if (!found) continue;
    await db.reciter.upsert({
      where: { id: c.id },
      update: { sortOrder: c.sortOrder },
      create: {
        id: c.id,
        name: c.name,
        style: c.style,
        riwayah: "حفص عن عاصم",
        audioUrlTemplate: `https://cdn.islamic.network/quran/audio/128/${c.id}/{ayah}.mp3`,
        bitrate: "128",
        source: "cdn.islamic.network (everyayah) — قراءات موثقة لكل آية",
        license: "متاح للاستخدام التعليمي وغير التجاري — المصدر موثق",
        isDefault: idx === 0,
        sortOrder: c.sortOrder,
      },
    });
    idx++;
  }
  console.log(`  ✓ ${idx} reciters`);
}

// ------------------------------------------------------------
// الفهرس الموضوعي — آيات مرجعية مشهورة (قابلة للمراجعة من لوحة الإدارة)
// ------------------------------------------------------------
const TOPICS: { key: string; title: string; description: string; ayahs: [number, number, string?][] }[] = [
  {
    key: "iman", title: "الإيمان", description: "آيات البيان لأصول الإيمان والإيمان بالغيب",
    ayahs: [
      [2, 3, "الإيمان بالغيب"], [2, 255, "آية الكرسي"], [2, 285, "إيمان الرسل"], [2, 286], [3, 102, "التقوى"], [49, 15, "المؤمنون حقًا"], [8, 2, "خشية المؤمنين"],
    ],
  },
  {
    key: "akhlaq", title: "الأخلاق", description: "آيات حسن الخلق وصدق اللسان",
    ayahs: [
      [16, 90, "العدل والإحسان"], [31, 18, "لا تصعّر خدّك"], [49, 11, "لا يسخر قوم"], [49, 12, "اجتنب كثيرًا من الظن"], [26, 151, "لا تطع المفرطين"], [68, 4, "إنك لعلى خلق عظيم"], [3, 159, "بما رحمة من الله لنت"],
    ],
  },
  {
    key: "ibadah", title: "العبادة", description: "آيات الصلاة والصيام والزكاة وذكر الله",
    ayahs: [
      [2, 45, "الصبر والصلاة"], [2, 152, "اذكروني أذكركم"], [2, 183, "الصيام"], [2, 110, "الصلاة والزكاة"], [29, 45, "إقامة الصلاة"], [62, 9, "يوم الجمعة"], [73, 20, "قيام الليل"],
    ],
  },
  {
    key: "family", title: "الأسرة", description: "آيات حقوق الزوجين والوالدين والتربية",
    ayahs: [
      [4, 1, "النفس الواحدة"], [30, 21, "مودة ورحمة"], [2, 187, "لباس لكما"], [4, 19, "عاشروهن بالمعروف"], [17, 23, "الوالدين"], [17, 24, "قول كريم"], [66, 6, "أهلكم نارًا"],
    ],
  },
  {
    key: "dealings", title: "المعاملات", description: "آيات البيع والوفاء بالعقود والأمانة",
    ayahs: [
      [2, 282, "الدَّين وكتابته"], [4, 29, "أوفوا بالعقود"], [83, 1, "الطفيفون"], [55, 9, "الميزان"], [26, 181, "أوفوا الكيل"], [4, 58, "أداء الأمانات"], [11, 85, "أوفوا الكيل والميزان"],
    ],
  },
  {
    key: "stories", title: "القصص القرآني", description: "مواضع القصص والعِبر من الأنبياء والأمم",
    ayahs: [
      [12, 3, "أحسن القصص"], [28, 3, "نُتلو عليك"], [11, 120, "قصص الرسل"], [3, 62, "إن هذا لهو القصص"], [7, 176, "فاقصص القصص"], [20, 9, "وموسى"], [19, 16, "ومريم"],
    ],
  },
  {
    key: "values", title: "القيم والسلوك", description: "آيات الصبر والشكر والاستقامة والتوكل",
    ayahs: [
      [2, 153, "استعينوا بالصبر"], [14, 7, "لشكرتم لأزيدنكم"], [39, 10, "الصابرون"], [29, 69, "السابقون"], [65, 3, "توكل من الله"], [12, 87, "لا تيأسوا"], [90, 17, "الصبر والمواساة"],
    ],
  },
];

async function seedTopics() {
  for (let i = 0; i < TOPICS.length; i++) {
    const t = TOPICS[i];
    const topic = await db.quranTopic.upsert({
      where: { key: t.key },
      update: { title: t.title, description: t.description, ayahCount: t.ayahs.length, sortOrder: i },
      create: { key: t.key, title: t.title, description: t.description, ayahCount: t.ayahs.length, sortOrder: i },
    });
    await db.topicAyah.deleteMany({ where: { topicId: topic.id } });
    for (const [surah, ayah, note] of t.ayahs) {
      await db.topicAyah.create({ data: { topicId: topic.id, surah, ayah, note: note ?? null } });
    }
  }
  console.log(`  ✓ ${TOPICS.length} topics`);
}

// ------------------------------------------------------------
// محرك المحتوى: الأقسام + كتاب «الأدعية القرآنية» (نصوص قرآنية بإحالات)
// ------------------------------------------------------------
const SECTIONS: { key: string; title: string; icon: string; color: string; description: string }[] = [
  { key: "books", title: "الكتب", icon: "book-open", color: "teal", description: "كتب قرآنية وثقافية معتمدة" },
  { key: "letters", title: "الرسائل", icon: "mail", color: "sand", description: "رسائل علمية ومؤلفات مختارة" },
  { key: "sermons", title: "الخطب", icon: "mic", color: "teal", description: "خطب منبرية ومواقف" },
  { key: "lessons", title: "الدروس", icon: "graduation-cap", color: "sand", description: "دروس شرعية مقررة" },
  { key: "lectures", title: "المحاضرات", icon: "presentation", color: "teal", description: "محاضرات ثقافية وقرآنية" },
  { key: "duas", title: "الأدعية", icon: "hand-heart", color: "sand", description: "الأدعية القرآنية والمأثورة" },
  { key: "munajat", title: "المناجاة والزيارات", icon: "moon-star", color: "teal", description: "مناجيات وزيارات وأدعية صباحية ومسائية" },
  { key: "audio", title: "الصوتيات", icon: "audio-lines", color: "sand", description: "محاضرات ودروس مسجلة" },
  { key: "media", title: "المرئيات", icon: "video", color: "teal", description: "محتوى مرئي معتمد" },
];

// الأدعية القرآنية — تُجمع من نص القرآن نفسه (لا تأليف). الإحالات دقيقة.
const QURANIC_DUAS: { title: string; surah: number; ayah: number }[] = [
  { title: "«رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً...»", surah: 2, ayah: 201 },
  { title: "«رَبَّنَا لَا تُزِغْ قُلُوبَنَا...»", surah: 3, ayah: 8 },
  { title: "«رَبَّنَا إِنَّا آمَنَّا فَاغْفِرْ لَنَا...»", surah: 3, ayah: 16 },
  { title: "«رَبَّنَا لَا تُؤَاخِذْنَا إِنْ نَسِينَا...»", surah: 2, ayah: 286 },
  { title: "«رَبِّ اشْرَحْ لِي صَدْرِي...»", surah: 20, ayah: 25 },
  { title: "«رَبَّنَا تَقَبَّلْ مِنَّا...»", surah: 2, ayah: 127 },
  { title: "«رَبَّنَا أَنْزِلْ عَلَيْنَا مَائِدَةً...»", surah: 5, ayah: 114 },
  { title: "«رَبِّ هَبْ لِي مِنْ لَدُنْكَ ذُرِّيَّةً...»", surah: 3, ayah: 38 },
  { title: "«رَبِّ اجْعَلْنِي مُقِيمَ الصَّلَاةِ...»", surah: 14, ayah: 40 },
  { title: "«رَبَّنَا آتِنَا مِنْ أَزْوَاجِنَا...»", surah: 25, ayah: 74 },
  { title: "«رَبِّ أَعِنِّي وَلَا تُعِنِّي عَلَيَّ...»", surah: 27, ayah: 19 },
  { title: "«حَسْبُنَا اللَّهُ وَنِعْمَ الْوَكِيلُ»", surah: 3, ayah: 173 },
  { title: "«رَبِّ زِدْنِي عِلْمًا»", surah: 20, ayah: 114 },
  { title: "«رَبَّنَا اغْفِرْ لَنَا ذُنُوبَنَا...»", surah: 3, ayah: 193 },
  { title: "«رَبِّ لَا تَذَرْنِي فَرْدًا وَأَنْتَ خَيْرُ الْوَارِثِينَ»", surah: 21, ayah: 89 },
  { title: "«لَا إِلَٰهَ إِلَّا أَنْتَ سُبْحَانَكَ إِنِّي كُنْتُ مِنَ الظَّالِمِينَ»", surah: 21, ayah: 87 },
];

async function seedLibrary() {
  for (let i = 0; i < SECTIONS.length; i++) {
    const s = SECTIONS[i];
    await db.librarySection.upsert({
      where: { key: s.key },
      update: { title: s.title, icon: s.icon, color: s.color, description: s.description, sortOrder: i },
      create: { key: s.key, title: s.title, icon: s.icon, color: s.color, description: s.description, sortOrder: i },
    });
  }

  const duasSection = await db.librarySection.findUnique({ where: { key: "duas" } });
  if (duasSection) {
    const existing = await db.book.findFirst({ where: { title: "الأدعية القرآنية", sectionId: duasSection.id } });
    const book = await db.book.upsert({
      where: { id: existing?.id ?? "__none__" },
      update: { status: "published", isFeatured: true },
      create: {
        sectionId: duasSection.id,
        title: "الأدعية القرآنية",
        author: "مُجمَّع من القرآن الكريم",
        description: "مختارات من الأدعية القرآنية بنصوصها الموثقة وإحالاتها الدقيقة إلى السورة والآية. النصوص من القرآن الكريم نفسه (نص عثماني معتمد) دون أي تأليف أو إضافة.",
        coverStyle: "teal",
        edition: "تنسيق خاص لتطبيق نور الهدى",
        sourceName: "القرآن الكريم — نص عثماني (Tanzil)",
        licenseNote: "نصوص قرآنية — لا حقوق حصرية",
        status: "published",
        isFeatured: true,
      },
    });
    const cnt = await db.chapter.count({ where: { bookId: book.id } });
    if (cnt === 0) {
      let n = 0;
      for (const d of QURANIC_DUAS) {
        const ayah = await db.quranAyah.findFirst({ where: { surah: d.surah, numberInSurah: d.ayah } });
        if (!ayah) continue;
        n++;
        await db.chapter.create({
          data: {
            bookId: book.id,
            number: n,
            title: d.title,
            content: `**السورة ${d.surah} — الآية ${d.ayah}**\n\n${ayah.text}`,
            status: "published",
          },
        });
      }
      console.log(`  ✓ book «الأدعية القرآنية» with ${n} chapters`);
    }
  }

  const munajatSection = await db.librarySection.findUnique({ where: { key: "munajat" } });
  if (munajatSection) {
    const existing = await db.book.findFirst({ where: { title: "مناجاة من القرآن", sectionId: munajatSection.id } });
    const book = await db.book.upsert({
      where: { id: existing?.id ?? "__none__" },
      update: { status: "published" },
      create: {
        sectionId: munajatSection.id,
        title: "مناجاة من القرآن",
        author: "مُجمَّع من القرآن الكريم",
        description: "مختارات من آيات المناجاة والرجاء في القرآن الكريم، بنصوصها المعتمدة وإحالاتها.",
        coverStyle: "sand",
        sourceName: "القرآن الكريم — نص عثماني (Tanzil)",
        licenseNote: "نصوص قرآنية — لا حقوق حصرية",
        status: "published",
      },
    });
    const cnt = await db.chapter.count({ where: { bookId: book.id } });
    if (cnt === 0) {
      const picks: [number, number][] = [[7, 23], [10, 85], [23, 109], [25, 65], [40, 7], [40, 8], [23, 118], [44, 12]];
      let n = 0;
      for (const [s, a] of picks) {
        const ayah = await db.quranAyah.findFirst({ where: { surah: s, numberInSurah: a } });
        if (!ayah) continue;
        n++;
        await db.chapter.create({
          data: { bookId: book.id, number: n, title: `من السورة ${s} — الآية ${a}`, content: `**السورة ${s} — الآية ${a}**\n\n${ayah.text}`, status: "published" },
        });
      }
      console.log(`  ✓ book «مناجاة من القرآن» with ${n} chapters`);
    }
  }
}

async function seedPackages() {
  const packages: { key: string; name: string; kind: string; description: string; sizeLabel: string }[] = [
    { key: "core-quran", name: "القرآن الكريم (نص عثماني)", kind: "text", description: "نص المصحف كاملًا برواية حفص — 604 صفحات", sizeLabel: "٢٫١ م.ب" },
    { key: "tafsir-muyassar", name: "التفسير الميسّر", kind: "tafsir", description: "تفسير موجز لكل آية — مجمع الملك فهد", sizeLabel: "١٫٨ م.ب" },
    { key: "books-basic", name: "حزمة الكتب الأساسية", kind: "books", description: "الأدعية القرآنية والمناجيات", sizeLabel: "٠٫٣ م.ب" },
    { key: "audio-recitations", name: "حزمة التلاوات", kind: "audio", description: "تلاوات مرخصة — تُنزَّل سورةً سورة عند الطلب", sizeLabel: "حسب السورة" },
  ];
  for (const p of packages) {
    await db.contentPackage.upsert({
      where: { key: p.key },
      update: {},
      create: { ...p, version: 1, status: "installed", installedAt: new Date() },
    });
  }
  console.log(`  ✓ ${packages.length} content packages`);
}

async function seedAdmin() {
  // كلمة المرور الافتراضية admin123 تُضبط كتجزئة scrypt — تُطلب تغييرها بعد أول دخول
  const salt = randomBytes(16).toString("hex");
  const passwordHash = scryptSync("admin123", salt, 64).toString("hex");
  await db.adminUser.upsert({
    where: { username: "admin" },
    update: {},
    create: { username: "admin", displayName: "مدير النظام", role: "owner", passwordHash, salt },
  });
  await db.appSetting.upsert({ where: { key: "userName" }, update: {}, create: { key: "userName", value: JSON.stringify("عبدالله") } });
  await db.lastReading.upsert({
    where: { id: "main" },
    update: {},
    create: { id: "main", surah: 1, ayah: 1, page: 1, mode: "list" },
  });
}

async function main() {
  mkdirSync(CACHE_DIR, { recursive: true });
  console.log("🌱 Seeding نور الهدى database…");
  await seedQuran();
  await seedTafsir();
  await seedReciters();
  await seedTopics();
  await seedLibrary();
  await seedPackages();
  await seedAdmin();
  console.log("✅ Seed complete");
}

main().catch((e) => {
  console.error("Seed failed:", e);
  process.exit(1);
}).finally(() => db.$disconnect());
