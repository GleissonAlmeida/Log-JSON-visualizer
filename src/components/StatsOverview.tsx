import React from 'react';
import { FieldInfo, MetricConfig } from '../types/log';

interface StatsOverviewProps {
  fields: FieldInfo[];
  selectedMetrics: MetricConfig[];
  totalRecords: number;
}

export const StatsOverview: React.FC<StatsOverviewProps> = ({
  fields,
  selectedMetrics,
  totalRecords,
}) => {
  if (selectedMetrics.length === 0) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {selectedMetrics.map((metric) => {
        const field = fields.find((f) => f.key === metric.key);
        if (!field) return null;

        return (
          <div
            key={metric.key}
            className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-300 font-mono truncate max-w-[170px]">
                {metric.label || metric.key}
              </span>
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
                style={{ backgroundColor: metric.color }}
              />
            </div>

            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-2xl font-bold text-slate-100 font-mono tabular-nums tracking-tight">
                {field.avg !== undefined
                  ? field.avg.toLocaleString('pt-BR', { maximumFractionDigits: 2 })
                  : '—'}
              </span>
              <span className="text-xs text-slate-400">média</span>
            </div>

            {/* Sub-metrics */}
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800/80 text-[11px] font-mono tabular-nums text-slate-400">
              <div>
                <span className="block text-[10px] text-slate-500 uppercase">Mín</span>
                <span className="text-slate-300">
                  {field.min !== undefined ? Number(field.min).toFixed(1) : '—'}
                </span>
              </div>
              <div>
                <span className="block text-[10px] text-slate-500 uppercase">Máx</span>
                <span className="text-slate-300">
                  {field.max !== undefined ? Number(field.max).toFixed(1) : '—'}
                </span>
              </div>
              <div>
                <span className="block text-[10px] text-slate-500 uppercase">Mediana</span>
                <span className="text-slate-300">
                  {field.median !== undefined ? Number(field.median).toFixed(1) : '—'}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
