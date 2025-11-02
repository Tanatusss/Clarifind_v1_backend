import type { IndicatorCode } from './indicator.constants';

export type IndicatorItem = {
  code: IndicatorCode;
  name_th?: string | null;
  name_en?: string | null;
  value: boolean;        // true = 1, false = 0/null
};

export type IndicatorSummary = {
  registration_id: string;
  company_id?: number;
  indicators: IndicatorItem[];
  found_count: number;
  total: number;
  coverage_pct: number;  // เช่น 34.78
};
