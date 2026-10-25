import React, { useState, useMemo } from 'react';
import { FieldInfo } from '../types/log';
import { Search, ChevronLeft, ChevronRight, Download, FileJson } from 'lucide-react';

interface DataTableProps {
  records: Record<string, any>[];
  fields: FieldInfo[];
  xAxisKey: string;
  range: [number, number];
}

export const DataTable: React.FC<DataTableProps> = ({
  records,
  fields,
  xAxisKey,
  range,
}) => {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(15);
  const [showOnlyInRange, setShowOnlyInRange] = useState(false);

  const [startIdx, endIdx] = range;

  // Filter records
  const filteredRecords = useMemo(() => {
    let list = records;
    if (showOnlyInRange) {
      list = list.slice(startIdx, endIdx + 1);
    }
    if (!search.trim()) return list;

    const query = search.toLowerCase();
    return list.filter((r) => {
      return Object.entries(r).some(([_, val]) => {
        if (val === undefined || val === null) return false;
        return String(val).toLowerCase().includes(query);
      });
    });
  }, [records, search, showOnlyInRange, startIdx, endIdx]);

  const totalPages = Math.ceil(filteredRecords.length / pageSize);
  const paginatedRecords = useMemo(() => {
    const start = page * pageSize;
    return filteredRecords.slice(start, start + pageSize);
  }, [filteredRecords, page, pageSize]);

  // Export functions
  const exportCSV = () => {
    const headers = ['_index', ...fields.map((f) => f.key)];
    const csvRows = [
      headers.join(','),
      ...filteredRecords.map((r, i) => {
        return headers
          .map((h) => {
            const v = h === '_index' ? r._index ?? i : r[h];
            if (v === undefined || v === null) return '';
            const str = String(v).replace(/"/g, '""');
            return str.includes(',') || str.includes('\n') ? `"${str}"` : str;
          })
          .join(',');
      }),
    ];

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dados_log_${Date.now()}.csv`;
    a.click();
  };

  const exportJSON = () => {
    const blob = new Blob([JSON.stringify(filteredRecords, null, 2)], {
      type: 'application/json;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dados_log_${Date.now()}.json`;
    a.click();
  };

  // Columns to display (prioritize xAxisKey, numeric fields, then others)
  const displayFields = useMemo(() => {
    const list = [...fields];
    // Put xAxisKey first
    const xIndex = list.findIndex((f) => f.key === xAxisKey);
    if (xIndex > -1) {
      const [xField] = list.splice(xIndex, 1);
      list.unshift(xField);
    }
    return list;
  }, [fields, xAxisKey]);

  return (
    <div className="flex flex-col bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden">
      {/* Table Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-b border-slate-800 bg-slate-900/60">
        <div className="flex items-center gap-3 flex-1 min-w-[240px] max-w-md">
          <div className="relative w-full">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Pesquisar nos registros do log..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer mr-2">
            <input
              type="checkbox"
              checked={showOnlyInRange}
              onChange={(e) => {
                setShowOnlyInRange(e.target.checked);
                setPage(0);
              }}
              className="accent-indigo-500 rounded"
            />
            <span>Apenas faixa visível no gráfico</span>
          </label>

          <button
            onClick={exportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 hover:text-white rounded-lg border border-slate-700/60 transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>CSV</span>
          </button>

          <button
            onClick={exportJSON}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 hover:text-white rounded-lg border border-slate-700/60 transition-colors"
          >
            <FileJson className="w-3.5 h-3.5 text-indigo-400" />
            <span>JSON</span>
          </button>
        </div>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-950/70 text-slate-400 font-mono">
              <th className="py-2.5 px-3.5 w-16 text-center">#</th>
              {displayFields.map((field) => (
                <th
                  key={field.key}
                  className={`py-2.5 px-3.5 whitespace-nowrap font-semibold ${
                    field.key === xAxisKey
                      ? 'text-indigo-400'
                      : field.isNumeric
                      ? 'text-slate-300'
                      : 'text-slate-400'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <span>{field.label}</span>
                    {field.key === xAxisKey && (
                      <span className="text-[10px] bg-indigo-950/80 text-indigo-300 px-1.5 py-0.2 rounded border border-indigo-800/60">
                        Eixo X
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-mono">
            {paginatedRecords.length === 0 ? (
              <tr>
                <td colSpan={displayFields.length + 1} className="py-8 text-center text-slate-500">
                  Nenhum registro encontrado.
                </td>
              </tr>
            ) : (
              paginatedRecords.map((row, idx) => {
                const actualIndex = row._index ?? page * pageSize + idx;
                const isWithinCurrentRange = actualIndex >= startIdx && actualIndex <= endIdx;

                return (
                  <tr
                    key={actualIndex}
                    className={`transition-colors hover:bg-slate-800/40 ${
                      isWithinCurrentRange ? 'bg-slate-850/40' : 'opacity-70'
                    }`}
                  >
                    <td className="py-2 px-3.5 text-center text-slate-500 tabular-nums">
                      {actualIndex + 1}
                    </td>
                    {displayFields.map((field) => {
                      const val = row[field.key];
                      const formattedVal =
                        val === undefined || val === null
                          ? '—'
                          : typeof val === 'number'
                          ? val.toLocaleString('pt-BR', { maximumFractionDigits: 3 })
                          : String(val);

                      return (
                        <td
                          key={field.key}
                          className={`py-2 px-3.5 whitespace-nowrap tabular-nums ${
                            field.key === xAxisKey
                              ? 'text-indigo-300 font-medium'
                              : field.isNumeric
                              ? 'text-slate-200'
                              : 'text-slate-400'
                          }`}
                        >
                          {formattedVal}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-slate-800 bg-slate-900/60 text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <span>Linhas por página:</span>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(0);
            }}
            className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-300 focus:outline-none"
          >
            <option value={10}>10</option>
            <option value={15}>15</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
          <span className="text-slate-500 tabular-nums">
            Mostrando {filteredRecords.length > 0 ? page * pageSize + 1 : 0}–
            {Math.min((page + 1) * pageSize, filteredRecords.length)} de {filteredRecords.length}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="p-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-slate-800 text-slate-300 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="px-2 font-mono tabular-nums">
            {totalPages > 0 ? page + 1 : 0} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="p-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-slate-800 text-slate-300 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
