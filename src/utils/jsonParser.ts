import { FieldInfo, ParseResult } from '../types/log';

// Helper to flatten nested objects into dot notation: a.b.c
export function flattenObject(obj: any, prefix = '', res: Record<string, any> = {}): Record<string, any> {
  if (obj === null || obj === undefined) return res;

  if (typeof obj !== 'object' || obj instanceof Date) {
    if (prefix) res[prefix] = obj;
    return res;
  }

  // Handle arrays of primitives vs arrays of objects
  if (Array.isArray(obj)) {
    // If it's a small array of primitives, join or skip
    if (obj.every(item => typeof item !== 'object')) {
      if (prefix) res[prefix] = obj.join(', ');
      return res;
    }
    // For arrays of objects, just serialize to string preview or index
    obj.forEach((item, idx) => {
      flattenObject(item, prefix ? `${prefix}[${idx}]` : `[${idx}]`, res);
    });
    return res;
  }

  for (const key of Object.keys(obj)) {
    const propName = prefix ? `${prefix}.${key}` : key;
    const val = obj[key];
    if (val !== null && typeof val === 'object' && !(val instanceof Date) && !Array.isArray(val)) {
      flattenObject(val, propName, res);
    } else if (Array.isArray(val)) {
      if (val.length > 0 && typeof val[0] === 'object') {
        val.forEach((item, idx) => {
          flattenObject(item, `${propName}[${idx}]`, res);
        });
      } else {
        res[propName] = val.join(', ');
      }
    } else {
      res[propName] = val;
    }
  }

  return res;
}

// Check if string looks like an ISO date or timestamp
function isDateString(val: any): boolean {
  if (typeof val !== 'string') return false;
  // ISO date format or common datetime strings
  if (/^\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}/.test(val)) return true;
  if (/^\d{2}\/\d{2}\/\d{4}/.test(val)) return true;
  if (/^\d{2}:\d{2}:\d{2}/.test(val)) return true;
  return false;
}

// Check if a number is likely a Unix epoch (seconds or milliseconds)
function isLikelyEpoch(val: number): boolean {
  // Between 2000-01-01 and 2100-01-01 in seconds or ms
  // ms: 946684800000 to 4102444800000
  // s: 946684800 to 4102444800
  return (val >= 946684800 && val <= 4102444800) || (val >= 946684800000 && val <= 4102444800000);
}

// Robust CSV tokenizer that respects quotes and delimiter
export function parseCsvRows(input: string, delimiter?: string): { headers: string[]; rows: string[][] } {
  const lines = input.split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length === 0) {
    return { headers: [], rows: [] };
  }

  // Auto-detect delimiter if not provided
  if (!delimiter) {
    const candidateDelimiters = [',', ';', '\t', '|'];
    const sampleLines = lines.slice(0, Math.min(lines.length, 5));
    let bestDelimiter = ',';
    let bestScore = -1;

    for (const d of candidateDelimiters) {
      const counts = sampleLines.map(line => {
        let count = 0;
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
          if (line[i] === '"') inQuotes = !inQuotes;
          else if (!inQuotes && line[i] === d) count++;
        }
        return count;
      });

      // Check consistency (all sample rows have the same non-zero count)
      const allNonZero = counts.every(c => c > 0);
      const isConsistent = counts.every(c => c === counts[0]);
      const score = (allNonZero ? 100 : 0) + (isConsistent ? 50 : 0) + (counts[0] || 0);

      if (score > bestScore && (counts[0] || 0) > 0) {
        bestScore = score;
        bestDelimiter = d;
      }
    }
    delimiter = bestDelimiter;
  }

  // Helper to tokenize a line respecting quotes
  const tokenizeLine = (line: string): string[] => {
    const tokens: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++; // skip escaped quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === delimiter && !inQuotes) {
        tokens.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    tokens.push(current.trim());
    return tokens.map(t => {
      // Strip surrounding quotes if present
      if (t.startsWith('"') && t.endsWith('"') && t.length >= 2) {
        return t.slice(1, -1).replace(/""/g, '"').trim();
      }
      return t;
    });
  };

  const rawHeaders = tokenizeLine(lines[0]);
  const headers = rawHeaders.map((h, i) => (h && h.trim().length > 0 ? h.trim() : `col_${i + 1}`));

  const rows: string[][] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = tokenizeLine(lines[i]);
    // Skip empty lines
    if (cells.length === 1 && cells[0] === '') continue;
    rows.push(cells);
  }

  return { headers, rows };
}

// Convert CSV content into an array of objects
export function parseCsv(input: string, filename?: string): Record<string, any>[] {
  const { headers, rows } = parseCsvRows(input);
  if (headers.length === 0 || rows.length === 0) {
    throw new Error('O arquivo CSV não contém colunas ou linhas válidas de dados.');
  }

  const result: Record<string, any>[] = [];

  for (let r = 0; r < rows.length; r++) {
    const cells = rows[r];
    const record: Record<string, any> = {};

    for (let c = 0; c < headers.length; c++) {
      const colName = headers[c];
      const valStr = cells[c] !== undefined ? cells[c] : '';

      if (valStr === '' || valStr.toLowerCase() === 'null' || valStr.toLowerCase() === 'nan') {
        record[colName] = null;
        continue;
      }

      // Check boolean
      if (valStr.toLowerCase() === 'true') {
        record[colName] = true;
        continue;
      }
      if (valStr.toLowerCase() === 'false') {
        record[colName] = false;
        continue;
      }

      // Check date / datetime
      if (isDateString(valStr)) {
        record[colName] = valStr;
        continue;
      }

      // Check number (support standard 123.45 and Brazilian/European 123,45)
      let cleanedNumStr = valStr;
      if (/^-?\d+,\d+$/.test(valStr)) {
        cleanedNumStr = valStr.replace(',', '.');
      }

      const numVal = Number(cleanedNumStr);
      if (!isNaN(numVal) && cleanedNumStr.trim() !== '') {
        record[colName] = numVal;
      } else {
        record[colName] = valStr;
      }
    }

    record._index = r;
    result.push(record);
  }

  return result;
}

export function parseJsonLog(input: string, filename?: string): ParseResult {
  const startTime = performance.now();
  let rawParsed: any;
  const trimmed = input.trim();

  // If filename clearly indicates CSV or if content looks like CSV (no JSON brackets, has delimiters)
  const isExplicitCsv = filename && filename.toLowerCase().endsWith('.csv');

  if (isExplicitCsv) {
    try {
      rawParsed = parseCsv(trimmed, filename);
    } catch (csvErr: any) {
      throw new Error(`Erro ao processar CSV: ${csvErr.message}`);
    }
  } else {
    // Try standard JSON.parse first
    try {
      rawParsed = JSON.parse(trimmed);
    } catch {
      // If standard JSON fails, test if it's NDJSON (JSON Lines / .log file) or comma-separated objects
      const lines = trimmed.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
      const parsedLines: any[] = [];
      let parsedCount = 0;

      for (const line of lines) {
        try {
          const cleanLine = line.endsWith(',') ? line.slice(0, -1).trim() : line;
          const item = JSON.parse(cleanLine);
          parsedLines.push(item);
          parsedCount++;
        } catch {
          // Try extracting JSON objects if multiple per line
          const objMatches = line.match(/\{[^}]+\}/g);
          if (objMatches) {
            for (const m of objMatches) {
              try {
                const item = JSON.parse(m);
                parsedLines.push(item);
                parsedCount++;
              } catch {
                // skip
              }
            }
          }
        }
      }

      if (parsedCount > 0) {
        rawParsed = parsedLines;
      } else {
        // Also test wrapping in [ ... ]
        try {
          rawParsed = JSON.parse(`[${trimmed}]`);
        } catch {
          // Fallback: Test if the file is a CSV format (e.g. pasted CSV or .txt/.log containing CSV data)
          try {
            const csvData = parseCsv(trimmed, filename);
            if (csvData && csvData.length > 0 && Object.keys(csvData[0]).length > 1) {
              rawParsed = csvData;
            } else {
              throw new Error();
            }
          } catch {
            throw new Error('Não foi possível interpretar o conteúdo como JSON, JSONL ou CSV. Verifique a sintaxe.');
          }
        }
      }
    }
  }

  // Extract array of records
  let rawList: any[] = [];

  if (Array.isArray(rawParsed)) {
    rawList = rawParsed;
  } else if (rawParsed && typeof rawParsed === 'object') {
    // Check common container keys
    const arrayKeys = ['data', 'logs', 'records', 'items', 'events', 'entries', 'points', 'series', 'values', 'telemetry'];
    const foundKey = arrayKeys.find(k => Array.isArray(rawParsed[k]));

    if (foundKey) {
      rawList = rawParsed[foundKey];
    } else {
      // Find any property that is an array
      const anyArrayKey = Object.keys(rawParsed).find(k => Array.isArray(rawParsed[k]));
      if (anyArrayKey) {
        rawList = rawParsed[anyArrayKey];
      } else {
        // Single object log record
        rawList = [rawParsed];
      }
    }
  }

  if (!rawList || rawList.length === 0) {
    throw new Error('Nenhum registro de dados foi encontrado no JSON fornecido.');
  }

  // Flatten every record to dot notation and normalize numeric values
  const records: Record<string, any>[] = rawList.map((item, index) => {
    if (typeof item !== 'object' || item === null) {
      return { value: item, _index: index };
    }
    const flat = flattenObject(item);
    // Add sequential index
    flat._index = index;
    return flat;
  });

  // Extract all unique field names
  const allKeysSet = new Set<string>();
  records.forEach(rec => {
    Object.keys(rec).forEach(k => allKeysSet.add(k));
  });

  // Analyze each field
  const fields: FieldInfo[] = [];

  allKeysSet.forEach(key => {
    if (key === '_index') return;

    let numericCount = 0;
    let stringCount = 0;
    let booleanCount = 0;
    let dateCandidateCount = 0;
    const values: any[] = [];
    const numValues: number[] = [];
    const sampleValues: any[] = [];

    for (let i = 0; i < records.length; i++) {
      const v = records[i][key];
      if (v === undefined || v === null) continue;

      if (sampleValues.length < 5 && !sampleValues.includes(v)) {
        sampleValues.push(v);
      }

      values.push(v);

      if (typeof v === 'number') {
        numericCount++;
        numValues.push(v);
        if (key.toLowerCase().includes('time') || key.toLowerCase().includes('date') || isLikelyEpoch(v)) {
          dateCandidateCount++;
        }
      } else if (typeof v === 'string') {
        stringCount++;
        // Check if string can be cleanly parsed into a number
        const trimmedStr = v.trim();
        if (trimmedStr !== '' && !isNaN(Number(trimmedStr)) && !isDateString(trimmedStr)) {
          numericCount++;
          numValues.push(Number(trimmedStr));
        } else if (isDateString(trimmedStr)) {
          dateCandidateCount++;
        }
      } else if (typeof v === 'boolean') {
        booleanCount++;
      }
    }

    const totalValid = values.length;
    if (totalValid === 0) return;

    const isNumeric = numericCount / totalValid >= 0.7; // At least 70% numeric
    const isDateCandidate = dateCandidateCount / totalValid >= 0.5 ||
      key.toLowerCase().includes('timestamp') ||
      key.toLowerCase().includes('datetime') ||
      key.toLowerCase() === 'time' ||
      key.toLowerCase() === 'date' ||
      key.toLowerCase() === 'created_at';

    let min: number | undefined;
    let max: number | undefined;
    let avg: number | undefined;
    let median: number | undefined;

    if (isNumeric && numValues.length > 0) {
      numValues.sort((a, b) => a - b);
      min = numValues[0];
      max = numValues[numValues.length - 1];
      const sum = numValues.reduce((acc, curr) => acc + curr, 0);
      avg = sum / numValues.length;
      const mid = Math.floor(numValues.length / 2);
      median = numValues.length % 2 !== 0 ? numValues[mid] : (numValues[mid - 1] + numValues[mid]) / 2;
    }

    const uniqueSet = new Set(values);

    let detectedType: FieldInfo['type'] = 'string';
    if (isNumeric) detectedType = 'number';
    else if (booleanCount > totalValid / 2) detectedType = 'boolean';
    else if (isDateCandidate) detectedType = 'date';

    fields.push({
      key,
      label: key,
      type: detectedType,
      isNumeric,
      isDateCandidate,
      uniqueValuesCount: uniqueSet.size,
      min,
      max,
      avg,
      median,
      sampleValues,
    });
  });

  // Sort fields: numeric and date candidates first, then alphabetical
  fields.sort((a, b) => {
    if (a.isDateCandidate && !b.isDateCandidate) return -1;
    if (!a.isDateCandidate && b.isDateCandidate) return 1;
    if (a.isNumeric && !b.isNumeric) return -1;
    if (!a.isNumeric && b.isNumeric) return 1;
    return a.key.localeCompare(b.key);
  });

  // Suggest best default X key:
  // 1. Look for date/time fields
  const dateCandidates = fields.filter(f => f.isDateCandidate);
  let detectedXKey = '_index';

  if (dateCandidates.length > 0) {
    const preferredNames = ['timestamp', 'time', 'datetime', 'date', 'created_at', 'ts', 'epoch'];
    const matched = dateCandidates.find(f => preferredNames.includes(f.key.toLowerCase())) || dateCandidates[0];
    detectedXKey = matched.key;
  } else {
    // 2. Look for sequence / packet / sample / iteration id: #, seq, sequence, sample, frame, packet, step, index, id
    const indexCandidates = ['#', 'seq', 'sequence', 'sample', 'frame', 'packet', 'step', 'iteration', 'index', 'id', 'record', 'nro'];
    const matchedIndex = fields.find(f => indexCandidates.includes(f.key.toLowerCase()));
    if (matchedIndex) {
      detectedXKey = matchedIndex.key;
    }
  }

  // Suggest default Y keys: top 2-3 numeric fields that are NOT the X key and NOT sequence numbers
  const sequenceKeys = new Set(['#', '_index', 'id', 'index', 'seq', 'step', 'record', 'sample', 'packet', 'frame']);
  const numericFields = fields.filter(f => f.isNumeric && f.key !== detectedXKey && !sequenceKeys.has(f.key.toLowerCase()));
  const detectedYKeys = numericFields.slice(0, 3).map(f => f.key);

  const parseTimeMs = Math.round(performance.now() - startTime);

  return {
    records,
    fields,
    detectedXKey,
    detectedYKeys,
    totalRecords: records.length,
    filename,
    parseTimeMs,
  };
}

// Vibrant palette for Chart.js series
export const PALETTE = [
  '#3b82f6', // blue
  '#10b981', // emerald
  '#f59e0b', // amber
  '#ec4899', // pink
  '#8b5cf6', // purple
  '#06b6d4', // cyan
  '#ef4444', // red
  '#14b8a6', // teal
  '#f97316', // orange
  '#6366f1', // indigo
];
