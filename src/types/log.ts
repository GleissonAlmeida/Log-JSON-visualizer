export type FieldType = 'number' | 'string' | 'boolean' | 'date' | 'object' | 'null';

export interface FieldInfo {
  key: string;
  label: string;
  type: FieldType;
  isNumeric: boolean;
  isDateCandidate: boolean;
  uniqueValuesCount: number;
  min?: number;
  max?: number;
  avg?: number;
  median?: number;
  sampleValues: any[];
}

export interface MetricConfig {
  key: string;
  label: string;
  color: string;
  yAxis: 'y' | 'y1'; // 'y' is left, 'y1' is right
  chartType?: 'line' | 'bar';
}

export interface ParseResult {
  records: Record<string, any>[];
  fields: FieldInfo[];
  detectedXKey: string;
  detectedYKeys: string[];
  totalRecords: number;
  filename?: string;
  parseTimeMs: number;
}

export type GlobalChartType = 'line' | 'bar' | 'area' | 'stepped' | 'scatter';

export interface YAxisScaleConfig {
  mode: 'auto' | 'manual';
  beginAtZero: boolean;
  scaleType: 'linear' | 'logarithmic';
  minY: number | '';
  maxY: number | '';
  minY1: number | '';
  maxY1: number | '';
}
