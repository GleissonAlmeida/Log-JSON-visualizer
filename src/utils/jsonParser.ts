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
  return (val >= 946684800 && val <= 4102444800) || (val >= 946684800000 && val <= 4102444800000);
}

// Categorize automotive CAN / telemetry signals
export function categorizeField(key: string): string {
  const k = key.toLowerCase();
  if (k === '#' || k === '_index' || k === 'timestamp' || k === 'time' || k === 'date') return 'Temporal / Sequencial';
  if (
    k.includes('speed') ||
    k.includes('torque') ||
    k.includes('rpm') ||
    k.includes('gear') ||
    k.includes('clutch') ||
    k.includes('eng_') ||
    k.includes('engine') ||
    k.includes('shaft') ||
    k.includes('driveline')
  ) {
    return 'Motor & Transmissão';
  }
  if (
    k.includes('turret') ||
    k.includes('angle') ||
    k.includes('roll') ||
    k.includes('pitch') ||
    k.includes('yaw') ||
    k.includes('gyro') ||
    k.includes('acc') ||
    k.includes('swim')
  ) {
    return 'Dinâmica & Torre';
  }
  if (
    k.includes('press') ||
    k.includes('temp') ||
    k.includes('fuel') ||
    k.includes('volt') ||
    k.includes('level') ||
    k.includes('in_ana') ||
    k.includes('hpa') ||
    k.includes('batt')
  ) {
    return 'Sensores & Níveis';
  }
  if (
    k.includes('light') ||
    k.includes('lamp') ||
    k.includes('pump') ||
    k.includes('fan') ||
    k.includes('valve') ||
    k.includes('out_') ||
    k.includes('sts_') ||
    k.includes('btn') ||
    k.includes('fbk_') ||
    k.includes('icon_')
  ) {
    return 'Atuadores & Lâmpadas';
  }
  return 'Geral / Outros';
}

export function parseJsonLog(input: string, filename?: string): ParseResult {
  const startTime = performance.now();
  let rawParsed: any;
  const trimmed = input.trim();

  // 1. Try standard JSON.parse first
  try {
    rawParsed = JSON.parse(trimmed);
  } catch {
    // 2. Test if it's NDJSON (JSON Lines / .log file) where each line is an object:
    // {"#": 0, "eng_dem_perc_torque": 0.0, ...}
    const lines = trimmed.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
    const parsedLines: any[] = [];
    let parsedCount = 0;

    for (const line of lines) {
      const cleanLine = line.endsWith(',') ? line.slice(0, -1).trim() : line;
      try {
        const item = JSON.parse(cleanLine);
        parsedLines.push(item);
        parsedCount++;
      } catch {
        // Fallback: extract substring between first { and last }
        const startBrace = cleanLine.indexOf('{');
        const endBrace = cleanLine.lastIndexOf('}');
        if (startBrace !== -1 && endBrace > startBrace) {
          try {
            const item = JSON.parse(cleanLine.substring(startBrace, endBrace + 1));
            parsedLines.push(item);
            parsedCount++;
          } catch {
            // Ignore corrupted line
          }
        }
      }
    }

    if (parsedCount > 0) {
      rawParsed = parsedLines;
    } else {
      // 3. Try wrapping comma-separated records in brackets
      try {
        rawParsed = JSON.parse('[' + trimmed.replace(/,\s*$/, '') + ']');
      } catch {
        throw new Error('Não foi possível interpretar o texto como JSON ou JSONL (JSON Lines). Verifique a sintaxe.');
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

  // Extract all unique field names across all sparse lines
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
      validCount: totalValid,
      category: categorizeField(key),
      min,
      max,
      avg,
      median,
      sampleValues,
    });
  });

  // Sort fields: numeric and date candidates first, then by category and name
  fields.sort((a, b) => {
    // If one is '#', it belongs at the very top
    if (a.key === '#' && b.key !== '#') return -1;
    if (a.key !== '#' && b.key === '#') return 1;

    if (a.isDateCandidate && !b.isDateCandidate) return -1;
    if (!a.isDateCandidate && b.isDateCandidate) return 1;
    if (a.isNumeric && !b.isNumeric) return -1;
    if (!a.isNumeric && b.isNumeric) return 1;
    return a.key.localeCompare(b.key);
  });

  // Suggest best default X key:
  // 1. Check for '#' or hash tick/frame first (primary key in CAN logs like Log_112)
  let detectedXKey = '_index';
  const hashKeyField = fields.find(f => f.key === '#' || f.key.toLowerCase() === 'step' || f.key.toLowerCase() === 'tick');
  if (hashKeyField) {
    detectedXKey = hashKeyField.key;
  } else {
    const dateCandidates = fields.filter(f => f.isDateCandidate);
    if (dateCandidates.length > 0) {
      const preferredNames = ['timestamp', 'time', 'datetime', 'date', 'created_at', 'ts', 'epoch', 'step'];
      const matched = dateCandidates.find(f => preferredNames.includes(f.key.toLowerCase())) || dateCandidates[0];
      detectedXKey = matched.key;
    } else {
      // Look for id, step, seq, index
      const indexField = fields.find(f => ['step', 'iteration', 'seq', 'index', 'id', 'record', 'frame'].includes(f.key.toLowerCase()));
      if (indexField) {
        detectedXKey = indexField.key;
      }
    }
  }

  // Suggest default Y keys:
  // Score numeric candidates prioritizing real telemetry signals (dynamic range > 0, multiple unique values, key vehicle names)
  const highInterestPatterns = [
    'engine_speed',
    'wheelbasedvehiclespeed',
    'fa_speed',
    'fuel_level',
    'turret_angle',
    'inp_shaft_speed',
    'out_shaft_speed',
    'intake_manf_temp',
    'speed',
    'rpm',
    'torque',
    'temperatura',
    'frequencia_cardiaca',
    'cpu_percent',
    'requisicoes_sec',
    'pressao',
    'vibracao',
  ];

  const candidateYFields = fields.filter(f => f.isNumeric && f.key !== detectedXKey);

  candidateYFields.sort((a, b) => {
    const aKey = a.key.toLowerCase();
    const bKey = b.key.toLowerCase();

    // Check if in high interest patterns
    const aPatternIdx = highInterestPatterns.findIndex(p => aKey.includes(p));
    const bPatternIdx = highInterestPatterns.findIndex(p => bKey.includes(p));

    if (aPatternIdx !== -1 && bPatternIdx === -1) return -1;
    if (aPatternIdx === -1 && bPatternIdx !== -1) return 1;
    if (aPatternIdx !== -1 && bPatternIdx !== -1) {
      if (aPatternIdx !== bPatternIdx) return aPatternIdx - bPatternIdx;
    }

    // Dynamic range score: prefer signals where min !== max
    const aDynamic = (a.max ?? 0) - (a.min ?? 0) > 0 ? 1 : 0;
    const bDynamic = (b.max ?? 0) - (b.min ?? 0) > 0 ? 1 : 0;
    if (aDynamic !== bDynamic) return bDynamic - aDynamic;

    // Prefer metrics with more unique values (avoid 0/1 constant flags)
    if (a.uniqueValuesCount !== b.uniqueValuesCount) {
      return b.uniqueValuesCount - a.uniqueValuesCount;
    }

    return (b.validCount ?? 0) - (a.validCount ?? 0);
  });

  const detectedYKeys = candidateYFields.slice(0, 3).map(f => f.key);

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
