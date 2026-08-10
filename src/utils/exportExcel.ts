/**
 * Minimal, dependency-free .xlsx writer.
 *
 * An .xlsx file is a ZIP of XML parts. Writing it ourselves keeps the admin
 * bundle small (a spreadsheet library costs several hundred KB) and produces a
 * real Excel file — no "the file format doesn't match its extension" warning,
 * and numbers arrive as numbers so Excel can sum them.
 *
 * Entries are stored uncompressed: the payloads here are small, and it avoids
 * shipping a deflate implementation.
 */

export type CellValue = string | number | null | undefined;

export interface ExcelColumn<T> {
  /** Header text for the column. */
  header: string;
  /** Pull the cell value out of a row. */
  value: (row: T) => CellValue;
  /** Column width in characters (Excel units). */
  width?: number;
}

/* ------------------------------------------------------------------ XML --- */

const escapeXml = (value: string): string =>
  value.replace(/[<>&'"]/g, ch => {
    switch (ch) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case "'": return '&apos;';
      default: return '&quot;';
    }
  });

/**
 * Excel rejects XML containing control characters, which can easily sneak in
 * from pasted product descriptions.
 */
const sanitize = (value: string): string =>
  value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');

/** 0 -> A, 25 -> Z, 26 -> AA … */
const columnLetter = (index: number): string => {
  let letter = '';
  let n = index;
  while (n >= 0) {
    letter = String.fromCharCode((n % 26) + 65) + letter;
    n = Math.floor(n / 26) - 1;
  }
  return letter;
};

const isFiniteNumber = (value: CellValue): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const cellXml = (ref: string, value: CellValue, styleId: number): string => {
  const style = styleId ? ` s="${styleId}"` : '';

  if (value === null || value === undefined || value === '') {
    return `<c r="${ref}"${style}/>`;
  }

  if (isFiniteNumber(value)) {
    return `<c r="${ref}"${style}><v>${value}</v></c>`;
  }

  const text = sanitize(String(value));
  return `<c r="${ref}"${style} t="inlineStr"><is><t xml:space="preserve">${escapeXml(text)}</t></is></c>`;
};

/* ------------------------------------------------------------------ ZIP --- */

const crcTable = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c >>> 0;
  }
  return table;
})();

const crc32 = (bytes: Uint8Array): number => {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    crc = crcTable[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
};

interface ZipEntry {
  name: string;
  bytes: Uint8Array;
  crc: number;
  offset: number;
}

const zip = (files: { name: string; content: string }[]): Blob => {
  const encoder = new TextEncoder();
  const chunks: Uint8Array[] = [];
  const entries: ZipEntry[] = [];
  let offset = 0;

  const push = (bytes: Uint8Array) => {
    chunks.push(bytes);
    offset += bytes.length;
  };

  const u16 = (n: number) => new Uint8Array([n & 0xff, (n >>> 8) & 0xff]);
  const u32 = (n: number) => new Uint8Array([n & 0xff, (n >>> 8) & 0xff, (n >>> 16) & 0xff, (n >>> 24) & 0xff]);
  const concat = (parts: Uint8Array[]) => {
    const total = parts.reduce((sum, p) => sum + p.length, 0);
    const out = new Uint8Array(total);
    let at = 0;
    for (const part of parts) {
      out.set(part, at);
      at += part.length;
    }
    return out;
  };

  // A fixed timestamp keeps the output byte-identical for identical data.
  const dosTime = u16(0);
  const dosDate = u16(((2020 - 1980) << 9) | (1 << 5) | 1);

  for (const file of files) {
    const nameBytes = encoder.encode(file.name);
    const dataBytes = encoder.encode(file.content);
    const crc = crc32(dataBytes);

    entries.push({ name: file.name, bytes: dataBytes, crc, offset });

    push(concat([
      u32(0x04034b50),      // local file header signature
      u16(20),              // version needed
      u16(0x0800),          // flags: UTF-8 names
      u16(0),               // method: stored
      dosTime, dosDate,
      u32(crc),
      u32(dataBytes.length),
      u32(dataBytes.length),
      u16(nameBytes.length),
      u16(0),               // extra length
      nameBytes,
    ]));
    push(dataBytes);
  }

  const centralStart = offset;

  for (const entry of entries) {
    const nameBytes = encoder.encode(entry.name);
    push(concat([
      u32(0x02014b50),      // central directory header signature
      u16(20), u16(20),
      u16(0x0800),
      u16(0),
      dosTime, dosDate,
      u32(entry.crc),
      u32(entry.bytes.length),
      u32(entry.bytes.length),
      u16(nameBytes.length),
      u16(0), u16(0), u16(0), u16(0),
      u32(0),               // external attributes
      u32(entry.offset),
      nameBytes,
    ]));
  }

  push(concat([
    u32(0x06054b50),        // end of central directory
    u16(0), u16(0),
    u16(entries.length), u16(entries.length),
    u32(offset - centralStart),
    u32(centralStart),
    u16(0),
  ]));

  return new Blob(chunks as BlobPart[], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
};

/* -------------------------------------------------------------- workbook --- */

/** Style 1 = bold header, style 2 = thousands-separated integer. */
const STYLES_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<numFmts count="1"><numFmt numFmtId="164" formatCode="#,##0"/></numFmts>
<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font></fonts>
<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF1E293B"/><bgColor indexed="64"/></patternFill></fill></fills>
<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="3">
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
<xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
<xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
</cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;

/** Excel forbids : \ / ? * [ ] in sheet names and caps them at 31 characters. */
const safeSheetName = (name: string): string =>
  (name.replace(/[:\\/?*[\]]/g, ' ').trim() || 'Sheet1').slice(0, 31);

/**
 * Build and download an .xlsx file.
 *
 * Numeric columns are written as real numbers so Excel can total and sort them;
 * everything else is written as text (a barcode like "007" keeps its zeros).
 */
export function downloadXlsx<T>(options: {
  filename: string;
  sheetName?: string;
  columns: ExcelColumn<T>[];
  rows: T[];
  /** Optional lines written above the table, e.g. the active filters. */
  title?: string[];
}): void {
  const { filename, columns, rows, title = [] } = options;
  const sheetName = safeSheetName(options.sheetName || 'Sheet1');

  const xmlRows: string[] = [];
  let rowIndex = 1;

  for (const line of title) {
    xmlRows.push(`<row r="${rowIndex}">${cellXml(`A${rowIndex}`, line, 0)}</row>`);
    rowIndex++;
  }
  if (title.length) {
    rowIndex++; // blank spacer row
  }

  const headerRow = rowIndex;
  xmlRows.push(
    `<row r="${headerRow}">` +
    columns.map((col, i) => cellXml(`${columnLetter(i)}${headerRow}`, col.header, 1)).join('') +
    '</row>'
  );
  rowIndex++;

  for (const row of rows) {
    const cells = columns.map((col, i) => {
      const value = col.value(row);
      return cellXml(`${columnLetter(i)}${rowIndex}`, value, isFiniteNumber(value) ? 2 : 0);
    });
    xmlRows.push(`<row r="${rowIndex}">${cells.join('')}</row>`);
    rowIndex++;
  }

  const cols = columns
    .map((col, i) => `<col min="${i + 1}" max="${i + 1}" width="${col.width ?? 18}" customWidth="1"/>`)
    .join('');

  const sheetXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<cols>${cols}</cols>
<sheetData>${xmlRows.join('')}</sheetData>
</worksheet>`;

  const blob = zip([
    {
      name: '[Content_Types].xml',
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>`,
    },
    {
      name: '_rels/.rels',
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`,
    },
    {
      name: 'xl/workbook.xml',
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheets><sheet name="${escapeXml(sheetName)}" sheetId="1" r:id="rId1"/></sheets>
</workbook>`,
    },
    {
      name: 'xl/_rels/workbook.xml.rels',
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`,
    },
    { name: 'xl/styles.xml', content: STYLES_XML },
    { name: 'xl/worksheets/sheet1.xml', content: sheetXml },
  ]);

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Give the browser a moment to start the download before revoking.
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
