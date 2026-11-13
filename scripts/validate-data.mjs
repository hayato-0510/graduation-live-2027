// src/data/ の JSON が決めた形式通りかを検査する。
// 使い方: node scripts/validate-data.mjs [データディレクトリ]
// 形式ミス（キーの改名・必須項目の欠落・型違い・重複）は exit 1 で落とす。
import { readFileSync } from "node:fs";
import { join } from "node:path";

const dir = process.argv[2] ?? "src/data";
const errors = [];
const err = (file, msg) => errors.push(`${file}: ${msg}`);

function load(file) {
  try {
    return JSON.parse(readFileSync(join(dir, file), "utf8"));
  } catch (e) {
    err(file, `JSON として読めない (${e.message})`);
    return undefined;
  }
}

function checkKeys(file, obj, allowed, required) {
  for (const k of Object.keys(obj)) {
    if (!allowed.includes(k))
      err(file, `知らないキー "${k}" がある（キーの改名？）`);
  }
  for (const k of required) {
    if (!(k in obj)) err(file, `必須キー "${k}" が無い`);
  }
}

const isTime = (v) =>
  typeof v === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(v);
const isDate = (v) => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);

// --- site.json ---
const site = load("site.json");
if (site) {
  const keys = [
    "admission",
    "dateLabel",
    "day1Date",
    "day2Date",
    "doors",
    "eventName",
    "start",
    "title",
    "venue",
  ];
  checkKeys("site.json", site, keys, keys);
  for (const k of ["dateLabel", "eventName", "title", "venue"]) {
    if (typeof site[k] !== "string" || site[k] === "")
      err("site.json", `"${k}" は空でない文字列にする`);
  }
  for (const k of ["day1Date", "day2Date"]) {
    if (!isDate(site[k])) err("site.json", `"${k}" は YYYY-MM-DD 形式にする`);
  }
  for (const k of ["admission", "doors", "start"]) {
    if (site[k] !== null && typeof site[k] !== "string")
      err("site.json", `"${k}" は文字列か null（未定）にする`);
  }
}

// --- bands.json ---
const bandsData = load("bands.json");
let bandNames = new Set();
if (bandsData) {
  checkKeys("bands.json", bandsData, ["bands", "note"], ["bands"]);
  if (!Array.isArray(bandsData.bands) || bandsData.bands.length === 0) {
    err("bands.json", `"bands" は1件以上の配列にする`);
  } else {
    bandsData.bands.forEach((b, i) => {
      const at = `bands.json bands[${i}]`;
      if (typeof b !== "object" || b === null)
        return err(at, "オブジェクトでない");
      checkKeys(
        at,
        b,
        ["day", "name", "photo", "startTime"],
        ["day", "name", "photo", "startTime"],
      );
      if (typeof b.name !== "string" || b.name === "")
        err(at, `"name" は空でない文字列にする`);
      else if (bandNames.has(b.name))
        err(at, `バンド名 "${b.name}" が重複している`);
      else bandNames.add(b.name);
      if (b.day !== null && b.day !== 1 && b.day !== 2)
        err(at, `"day" は 1 / 2 / null（未定）のどれかにする`);
      if (b.startTime !== null && !isTime(b.startTime))
        err(at, `"startTime" は "HH:MM" か null（未定）にする`);
      if (b.photo !== null && typeof b.photo !== "string")
        err(at, `"photo" はパス文字列か null にする`);
    });
  }
}

// --- timetable.json ---
const tt = load("timetable.json");
if (tt) {
  checkKeys("timetable.json", tt, ["day1", "day2", "note"], ["day1", "day2"]);
  for (const d of ["day1", "day2"]) {
    const day = tt[d];
    if (typeof day !== "object" || day === null) {
      err("timetable.json", `"${d}" が無い`);
      continue;
    }
    checkKeys(
      `timetable.json ${d}`,
      day,
      ["date", "label", "slots"],
      ["date", "label", "slots"],
    );
    if (!isDate(day.date))
      err("timetable.json", `"${d}.date" は YYYY-MM-DD 形式にする`);
    if (!Array.isArray(day.slots)) {
      err("timetable.json", `"${d}.slots" は配列にする`);
      continue;
    }
    day.slots.forEach((s, i) => {
      const at = `timetable.json ${d}.slots[${i}]`;
      if (typeof s !== "object" || s === null)
        return err(at, "オブジェクトでない");
      checkKeys(at, s, ["band", "start", "end"], ["band", "start", "end"]);
      if (typeof s.band !== "string" || s.band === "")
        err(at, `"band" は空でない文字列にする`);
      else if (bandNames.size > 0 && !bandNames.has(s.band))
        err(at, `バンド名 "${s.band}" が bands.json に無い（表記ゆれ？）`);
      if (!isTime(s.start)) err(at, `"start" は "HH:MM" 形式にする`);
      if (!isTime(s.end)) err(at, `"end" は "HH:MM" 形式にする`);
    });
  }
}

if (errors.length > 0) {
  console.error("データ検証で問題が見つかりました:");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log("データ検証 OK");
