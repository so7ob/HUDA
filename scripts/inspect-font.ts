/** فحص خطوط TTF: قراءة جدول cmap لمعرفة نقاط يونيكود المدعومة */
import { readFileSync } from "fs";

function parseCmap(path: string): number[] {
  const buf = readFileSync(path);
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  const numTables = dv.getUint16(4);
  let cmapOff = 0;
  for (let i = 0; i < numTables; i++) {
    const off = 12 + i * 16;
    const tag = String.fromCharCode(buf[off], buf[off + 1], buf[off + 2], buf[off + 3]);
    if (tag === "cmap") cmapOff = dv.getUint32(off + 8);
  }
  if (!cmapOff) return [];
  const nSub = dv.getUint16(cmapOff + 2);
  let best = 0;
  for (let i = 0; i < nSub; i++) {
    const rec = cmapOff + 4 + i * 8;
    const platform = dv.getUint16(rec);
    const enc = dv.getUint16(rec + 2);
    if ((platform === 3 && (enc === 1 || enc === 10)) || platform === 0) {
      best = cmapOff + dv.getUint32(rec + 4);
    }
  }
  if (!best) return [];
  const format = dv.getUint16(best);
  const codes: number[] = [];
  if (format === 4) {
    const segX2 = dv.getUint16(best + 6);
    const segs = segX2 / 2;
    const endBase = best + 14;
    const startBase = endBase + segX2 + 2;
    const deltaBase = startBase + segX2;
    const rangeBase = deltaBase + segX2;
    for (let s = 0; s < segs; s++) {
      const end = dv.getUint16(endBase + s * 2);
      const start = dv.getUint16(startBase + s * 2);
      const delta = dv.getInt16(deltaBase + s * 2);
      const rangeOff = dv.getUint16(rangeBase + s * 2);
      for (let c = start; c <= end && c !== 0xffff; c++) {
        if (rangeOff === 0) {
          if ((c + delta) & 0xffff) codes.push(c);
        } else {
          const gi = rangeBase + s * 2 + rangeOff + (c - start) * 2;
          if (gi + 1 < buf.length && dv.getUint16(gi) !== 0) codes.push(c);
        }
      }
    }
  } else if (format === 12) {
    const nGroups = dv.getUint32(best + 12);
    for (let g = 0; g < nGroups; g++) {
      const rec = best + 16 + g * 12;
      const start = dv.getUint32(rec);
      const end = dv.getUint32(rec + 4);
      for (let c = start; c <= end && codes.length < 5000; c++) codes.push(c);
    }
  }
  return codes;
}

const files = process.argv.slice(2);
for (const f of files) {
  const codes = parseCmap(f);
  const uniq = [...new Set(codes)].sort((a, b) => a - b);
  console.log(`${f}: ${uniq.length} codepoints`);
  // نطاقات مضغوطة
  const ranges: string[] = [];
  let s = uniq[0], p = uniq[0];
  for (let i = 1; i <= uniq.length; i++) {
    if (uniq[i] === p + 1) { p = uniq[i]; continue; }
    ranges.push(s === p ? `0x${s.toString(16)}` : `0x${s.toString(16)}-0x${p.toString(16)}`);
    s = p = uniq[i];
  }
  console.log("  ranges:", ranges.slice(0, 25).join(", "));
}
