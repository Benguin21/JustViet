/**
 * Reading (and, for the grammar ID fill, writing) spreadsheets with no dependencies, shared by the
 * import scripts. An .xlsx is a zip of XML files, read here with node:zlib; .csv and .tsv are
 * parsed directly. Only the first worksheet of an .xlsx is read.
 */
import { readFileSync } from "node:fs";
import { extname } from "node:path";
import { crc32, deflateRawSync, inflateRawSync } from "node:zlib";

// ---------------------------------------------------------------- zip / xlsx

export function readZip(buffer: Buffer): Map<string, Buffer> {
  const files = new Map<string, Buffer>();
  let eocd = -1;
  for (let i = buffer.length - 22; i >= Math.max(0, buffer.length - 65557); i--) {
    if (buffer.readUInt32LE(i) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error("Not a valid .xlsx file (zip directory not found).");
  const count = buffer.readUInt16LE(eocd + 10);
  let ptr = buffer.readUInt32LE(eocd + 16);
  for (let n = 0; n < count; n++) {
    if (buffer.readUInt32LE(ptr) !== 0x02014b50) throw new Error("Corrupt zip directory.");
    const method = buffer.readUInt16LE(ptr + 10);
    const compressedSize = buffer.readUInt32LE(ptr + 20);
    const nameLength = buffer.readUInt16LE(ptr + 28);
    const extraLength = buffer.readUInt16LE(ptr + 30);
    const commentLength = buffer.readUInt16LE(ptr + 32);
    const localOffset = buffer.readUInt32LE(ptr + 42);
    const name = buffer.toString("utf8", ptr + 46, ptr + 46 + nameLength);
    const localNameLength = buffer.readUInt16LE(localOffset + 26);
    const localExtraLength = buffer.readUInt16LE(localOffset + 28);
    const start = localOffset + 30 + localNameLength + localExtraLength;
    const data = buffer.subarray(start, start + compressedSize);
    files.set(name, method === 8 ? inflateRawSync(data) : Buffer.from(data));
    ptr += 46 + nameLength + extraLength + commentLength;
  }
  return files;
}

export function decodeXml(text: string): string {
  return text
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number(dec)))
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

/** Concatenates every <t> run in a fragment (rich-text cells have several), skipping phonetic runs. */
function textRuns(xml: string): string {
  const withoutPhonetic = xml.replace(/<rPh\b[\s\S]*?<\/rPh>/g, "");
  return Array.from(withoutPhonetic.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g), (m) =>
    decodeXml(m[1]),
  ).join("");
}

function columnIndex(ref: string): number {
  const letters = /^[A-Z]+/.exec(ref)?.[0] ?? "A";
  return Array.from(letters).reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0) - 1;
}

export function readXlsx(path: string): string[][] {
  const files = readZip(readFileSync(path));
  const read = (name: string) => files.get(name)?.toString("utf8");

  const shared = Array.from((read("xl/sharedStrings.xml") ?? "").matchAll(/<si>([\s\S]*?)<\/si>/g), (m) =>
    textRuns(m[1]),
  );

  // First worksheet, resolved through the workbook's relationships.
  const workbook = read("xl/workbook.xml") ?? "";
  const rels = read("xl/_rels/workbook.xml.rels") ?? "";
  const firstSheetRel = /<sheet\b[^>]*\br:id="([^"]+)"/.exec(workbook)?.[1];
  const target = firstSheetRel
    ? new RegExp(`<Relationship\\b[^>]*Id="${firstSheetRel}"[^>]*Target="([^"]+)"`).exec(rels)?.[1] ??
      new RegExp(`<Relationship\\b[^>]*Target="([^"]+)"[^>]*Id="${firstSheetRel}"`).exec(rels)?.[1]
    : undefined;
  const sheetPath = target
    ? target.startsWith("/")
      ? target.slice(1)
      : `xl/${target}`
    : "xl/worksheets/sheet1.xml";
  const sheet = read(sheetPath);
  if (!sheet) throw new Error(`Worksheet ${sheetPath} not found in ${path}.`);

  const rows: string[][] = [];
  for (const rowMatch of sheet.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)) {
    const row: string[] = [];
    for (const cell of rowMatch[1].matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const attrs = cell[1];
      const body = cell[2] ?? "";
      const ref = /\br="([A-Z]+\d+)"/.exec(attrs)?.[1] ?? "A1";
      const type = /\bt="([^"]+)"/.exec(attrs)?.[1];
      const value = /<v>([\s\S]*?)<\/v>/.exec(body)?.[1];
      let text = "";
      if (type === "s" && value !== undefined) text = shared[Number(value)] ?? "";
      else if (type === "inlineStr") text = textRuns(body);
      else if (value !== undefined) text = decodeXml(value);
      row[columnIndex(ref)] = text;
    }
    rows.push(Array.from(row, (c) => c ?? ""));
  }
  return rows;
}

// ------------------------------------------------------------------ csv/tsv

export function readDelimited(path: string, delimiter: string): string[][] {
  const text = readFileSync(path, "utf8").replace(/^﻿/, "");
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"' && cell === "") quoted = true;
    else if (ch === delimiter) {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else cell += ch;
  }
  if (cell || row.length) rows.push([...row, cell]);
  return rows;
}

/** The rows of a .xlsx (first worksheet), .csv or .tsv file, as text. */
export function readSpreadsheet(path: string): string[][] {
  const ext = extname(path).toLowerCase();
  if (ext === ".xlsx") return readXlsx(path);
  if (ext === ".csv") return readDelimited(path, ",");
  if (ext === ".tsv" || ext === ".txt") return readDelimited(path, "\t");
  throw new Error(`Unsupported file type "${ext}". Use .xlsx, .csv or .tsv.`);
}

/** Writes files back into a zip (every entry deflated), in the order given. */
export function writeZip(files: Map<string, Buffer>): Buffer {
  const locals: Buffer[] = [];
  const central: Buffer[] = [];
  let offset = 0;
  for (const [name, data] of files) {
    const nameBuf = Buffer.from(name, "utf8");
    const packed = deflateRawSync(data);
    const crc = crc32(data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x0800, 6); // UTF-8 names
    local.writeUInt16LE(8, 8);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(packed.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    locals.push(local, nameBuf, packed);
    const dir = Buffer.alloc(46);
    dir.writeUInt32LE(0x02014b50, 0);
    dir.writeUInt16LE(20, 4);
    dir.writeUInt16LE(20, 6);
    dir.writeUInt16LE(0x0800, 8);
    dir.writeUInt16LE(8, 10);
    dir.writeUInt32LE(crc, 16);
    dir.writeUInt32LE(packed.length, 20);
    dir.writeUInt32LE(data.length, 24);
    dir.writeUInt16LE(nameBuf.length, 28);
    dir.writeUInt32LE(offset, 42);
    central.push(dir, nameBuf);
    offset += 30 + nameBuf.length + packed.length;
  }
  const centralSize = central.reduce((n, b) => n + b.length, 0);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(files.size, 8);
  end.writeUInt16LE(files.size, 10);
  end.writeUInt32LE(centralSize, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, ...central, end]);
}
