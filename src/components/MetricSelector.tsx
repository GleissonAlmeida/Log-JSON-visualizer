import React, { useState } from 'react';
import { FieldInfo, MetricConfig, GlobalChartType, YAxisScaleConfig } from '../types/log';
import { PALETTE } from '../utils/jsonParser';
import { Check, Search, BarChart3, LineChart, Layers, HelpCircle, ArrowRightLeft, UploadCloud, FolderOpen, FileText, SlidersHorizontal, RotateCcw, ArrowDownAZ } from 'lucide-react';

interface MetricSelectorProps {
  fields: FieldInfo[];
  xAxisKey: string;
  onXAxisChange: (key: string) => void;
  selectedMetrics: MetricConfig[];
  onToggleMetric: (key: string) => void;
  onMetricAxisChange: (key: string, axis: 'y' | 'y1') => void;
  onSelectAllNumeric: () => void;
  onClearAllMetrics: () => void;
  chartType: GlobalChartType;
  onChartTypeChange: (type: GlobalChartType) => void;
  showPoints: boolean;
  onTogglePoints: () => void;
  fillArea: boolean;
  onToggleFill: () => void;
  dualAxis: boolean;
  onToggleDualAxis: () => void;
  yAxisScale: YAxisScaleConfig;
  onYAxisScaleChange: (scale: YAxisScaleConfig) => void;
  holdSparseTelemetry?: boolean;
  onToggleHoldSparseTelemetry?: () => void;
  onOpenLoadModal?: () => void;
  onLoadFile?: (file: File) => void;
  datasetName?: string;
  totalRecords?: number;
}

export const MetricSelector: React.FC<MetricSelectorProps> = ({
  fields,
  xAxisKey,
  onXAxisChange,
  selectedMetrics,
  onToggleMetric,
  onMetricAxisChange,
  onSelectAllNumeric,
  onClearAllMetrics,
  chartType,
  onChartTypeChange,
  showPoints,
  onTogglePoints,
  fillArea,
  onToggleFill,
  dualAxis,
  onToggleDualAxis,
  yAxisScale,
  onYAxisScaleChange,
  holdSparseTelemetry = true,
  onToggleHoldSparseTelemetry,
  onOpenLoadModal,
  onLoadFile,
  datasetName,
  totalRecords,
}) => {
  const [search, setSearch] = useState('');
  const [sortSelectedFirst, setSortSelectedFirst] = useState(true);

  const numericFields = fields.filter(f => f.isNumeric);
  const otherFields = fields.filter(f => !f.isNumeric);

  const isMetricSelected = (key: string) => selectedMetrics.some(m => m.key === key);
  const getMetricConfig = (key: string) => selectedMetrics.find(m => m.key === key);

  // Ordenação: primeiro os sinais selecionados, com classificação alfabética em cada grupo
  const sortedNumeric = React.useMemo(() => {
    return [...numericFields].sort((a, b) => {
      if (sortSelectedFirst) {
        const aSel = isMetricSelected(a.key);
        const bSel = isMetricSelected(b.key);
        if (aSel && !bSel) return -1;
        if (!aSel && bSel) return 1;
      }
      return a.key.localeCompare(b.key, undefined, { numeric: true, sensitivity: 'base' });
    });
  }, [numericFields, selectedMetrics, sortSelectedFirst]);

  const filteredNumeric = sortedNumeric.filter(f =>
    f.key.toLowerCase().includes(search.toLowerCase())
  );

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0] && onLoadFile) {
      onLoadFile(e.target.files[0]);
    }
  };

  return (
    <div className="flex flex-col gap-5 bg-slate-900/80 border border-slate-800 rounded-xl p-5">
      {/* 0. Opção de Carregar o Log JSON */}
      <div className="bg-slate-950/70 border border-slate-800/90 rounded-lg p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-indigo-400" />
            Origem dos Dados JSON
          </span>
          {totalRecords !== undefined && (
            <span className="text-[10px] text-indigo-300 font-mono tabular-nums bg-indigo-950/70 border border-indigo-800/60 px-1.5 py-0.5 rounded">
              {totalRecords} registros
            </span>
          )}
        </div>

        {datasetName && (
          <div className="text-xs text-slate-400 font-mono truncate mb-2.5" title={datasetName}>
            Arquivo atual: <span className="text-slate-200 font-semibold">{datasetName}</span>
          </div>
        )}

        <div className="flex items-center gap-2">
          {onOpenLoadModal && (
            <button
              type="button"
              onClick={onOpenLoadModal}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-sm transition-colors"
            >
              <UploadCloud className="w-3.5 h-3.5" />
              <span>Carregar Arquivo JSON</span>
            </button>
          )}

          <label
            title="Selecionar arquivo .json/.log direto do seu computador"
            className="flex items-center justify-center p-2 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 hover:text-white rounded-lg border border-slate-700 cursor-pointer transition-colors shrink-0"
          >
            <FolderOpen className="w-4 h-4 text-indigo-400" />
            <input
              type="file"
              accept=".json,.log,.ndjson,.txt,application/json,text/plain"
              className="hidden"
              onChange={handleFileInput}
            />
          </label>
        </div>
      </div>

      <div className="h-px bg-slate-800" />
      {/* 1. X-Axis Configuration */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
            1. Eixo X (Referência Horizontal)
          </label>
        </div>
        <select
          value={xAxisKey}
          onChange={(e) => onXAxisChange(e.target.value)}
          className="w-full px-3 py-2 text-sm bg-slate-950 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
        >
          <option value="_index"># Índice Sequencial (1, 2, 3...)</option>
          <optgroup label="Campos de Data & Horário Detectados">
            {fields
              .filter(f => f.isDateCandidate)
              .map(f => (
                <option key={f.key} value={f.key}>
                  {f.key} (Temporal)
                </option>
              ))}
          </optgroup>
          <optgroup label="Outros Campos Disponíveis">
            {fields
              .filter(f => !f.isDateCandidate)
              .map(f => (
                <option key={f.key} value={f.key}>
                  {f.key} ({f.type})
                </option>
              ))}
          </optgroup>
        </select>
        <p className="text-xs text-slate-500 mt-1.5">
          Determina os rótulos do eixo horizontal do gráfico.
        </p>
      </div>

      <div className="h-px bg-slate-800" />

      {/* 2. Visual Style & Chart Controls */}
      <div>
        <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-2.5">
          2. Tipo e Estilo do Gráfico
        </label>
        
        {/* Chart type tabs */}
        <div className="grid grid-cols-4 gap-1 p-1 bg-slate-950 border border-slate-800 rounded-lg text-xs mb-3">
          <button
            onClick={() => onChartTypeChange('line')}
            className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md font-medium transition-colors ${
              chartType === 'line' && !fillArea
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <LineChart className="w-3.5 h-3.5" />
            Linha
          </button>
          <button
            onClick={() => {
              onChartTypeChange('area');
              if (!fillArea) onToggleFill();
            }}
            className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md font-medium transition-colors ${
              (chartType === 'area' || fillArea) && chartType !== 'bar' && chartType !== 'stepped'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Área
          </button>
          <button
            onClick={() => onChartTypeChange('bar')}
            className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md font-medium transition-colors ${
              chartType === 'bar'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            Barras
          </button>
          <button
            onClick={() => onChartTypeChange('stepped')}
            className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md font-medium transition-colors ${
              chartType === 'stepped'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Degraus
          </button>
        </div>

        {/* Toggles */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <label className="flex items-center gap-2 text-slate-300 cursor-pointer bg-slate-950/70 p-2 rounded-lg border border-slate-800 hover:border-slate-700">
            <input
              type="checkbox"
              checked={showPoints}
              onChange={onTogglePoints}
              className="accent-indigo-500 rounded"
            />
            <span>Pontos no gráfico</span>
          </label>

          <label className="flex items-center gap-2 text-slate-300 cursor-pointer bg-slate-950/70 p-2 rounded-lg border border-slate-800 hover:border-slate-700">
            <input
              type="checkbox"
              checked={dualAxis}
              onChange={onToggleDualAxis}
              className="accent-indigo-500 rounded"
            />
            <span>Eixo Y duplo (L / R)</span>
          </label>

          {onToggleHoldSparseTelemetry && (
            <label
              className="col-span-2 flex items-center gap-2 text-slate-300 cursor-pointer bg-slate-950/70 p-2 rounded-lg border border-slate-800 hover:border-slate-700"
              title="Zero-Order Hold: mantém o último valor conhecido para sinais de CAN bus ou sensores assíncronos/esparsos"
            >
              <input
                type="checkbox"
                checked={holdSparseTelemetry}
                onChange={onToggleHoldSparseTelemetry}
                className="accent-indigo-500 rounded"
              />
              <span className="flex items-center justify-between flex-1">
                <span>Hold de Telemetria (CAN)</span>
                <span className="text-[10px] text-indigo-400 bg-indigo-950/90 px-1.5 py-0.5 rounded border border-indigo-800/60 font-mono">
                  Sample &amp; Hold
                </span>
              </span>
            </label>
          )}
        </div>

        {/* Ajuste da Escala do Eixo Y */}
        <div className="mt-3 pt-3 border-t border-slate-800/80 flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-400" />
              Escala do Eixo Y
            </span>

            <div className="flex items-center gap-1 p-0.5 bg-slate-950 rounded-md border border-slate-800 text-[11px]">
              <button
                type="button"
                onClick={() => onYAxisScaleChange({ ...yAxisScale, mode: 'auto' })}
                className={`px-2 py-0.5 rounded font-medium transition-colors ${
                  yAxisScale.mode === 'auto'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Auto
              </button>
              <button
                type="button"
                onClick={() => onYAxisScaleChange({ ...yAxisScale, mode: 'manual' })}
                className={`px-2 py-0.5 rounded font-medium transition-colors ${
                  yAxisScale.mode === 'manual'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Manual
              </button>
            </div>
          </div>

          {/* Opções de Escala */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <label className="flex items-center gap-2 text-slate-300 cursor-pointer bg-slate-950/70 p-2 rounded-lg border border-slate-800 hover:border-slate-700">
              <input
                type="checkbox"
                checked={yAxisScale.beginAtZero}
                onChange={(e) => onYAxisScaleChange({ ...yAxisScale, beginAtZero: e.target.checked })}
                className="accent-indigo-500 rounded"
              />
              <span>Iniciar no zero (0)</span>
            </label>

            <label className="flex items-center gap-2 text-slate-300 cursor-pointer bg-slate-950/70 p-2 rounded-lg border border-slate-800 hover:border-slate-700">
              <input
                type="checkbox"
                checked={yAxisScale.scaleType === 'logarithmic'}
                onChange={(e) => onYAxisScaleChange({ ...yAxisScale, scaleType: e.target.checked ? 'logarithmic' : 'linear' })}
                className="accent-indigo-500 rounded"
              />
              <span>Escala Log</span>
            </label>
          </div>

          {/* Inputs de Mínimo e Máximo Manual */}
          {yAxisScale.mode === 'manual' && (
            <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-2.5 flex flex-col gap-2">
              <div className="flex items-center justify-between text-[11px] text-slate-400 font-semibold">
                <span>Limites do Eixo Y (Esquerdo):</span>
                <button
                  type="button"
                  onClick={() => onYAxisScaleChange({ ...yAxisScale, minY: '', maxY: '' })}
                  className="flex items-center gap-1 text-[10px] text-indigo-400 hover:text-indigo-300"
                >
                  <RotateCcw className="w-2.5 h-2.5" /> Redefinir
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-mono text-slate-500 uppercase block mb-1">Mínimo (Y)</label>
                  <input
                    type="number"
                    placeholder="Auto"
                    value={yAxisScale.minY}
                    onChange={(e) => onYAxisScaleChange({ ...yAxisScale, minY: e.target.value === '' ? '' : Number(e.target.value) })}
                    className="w-full px-2 py-1 text-xs bg-slate-900 border border-slate-700 rounded text-slate-200 font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono text-slate-500 uppercase block mb-1">Máximo (Y)</label>
                  <input
                    type="number"
                    placeholder="Auto"
                    value={yAxisScale.maxY}
                    onChange={(e) => onYAxisScaleChange({ ...yAxisScale, maxY: e.target.value === '' ? '' : Number(e.target.value) })}
                    className="w-full px-2 py-1 text-xs bg-slate-900 border border-slate-700 rounded text-slate-200 font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Se Eixo Duplo estiver ativo, limites para Y1 */}
              {dualAxis && (
                <div className="pt-2 border-t border-slate-800/80 mt-1 flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-[11px] text-sky-400 font-semibold font-mono">
                    <span>Limites do Eixo Y1 (Direito):</span>
                    <button
                      type="button"
                      onClick={() => onYAxisScaleChange({ ...yAxisScale, minY1: '', maxY1: '' })}
                      className="flex items-center gap-1 text-[10px] text-sky-400 hover:text-sky-300"
                    >
                      <RotateCcw className="w-2.5 h-2.5" /> Redefinir
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-mono text-slate-500 uppercase block mb-1">Mínimo (Y1)</label>
                      <input
                        type="number"
                        placeholder="Auto"
                        value={yAxisScale.minY1}
                        onChange={(e) => onYAxisScaleChange({ ...yAxisScale, minY1: e.target.value === '' ? '' : Number(e.target.value) })}
                        className="w-full px-2 py-1 text-xs bg-slate-900 border border-slate-700 rounded text-sky-300 font-mono focus:outline-none focus:border-sky-500"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-mono text-slate-500 uppercase block mb-1">Máximo (Y1)</label>
                      <input
                        type="number"
                        placeholder="Auto"
                        value={yAxisScale.maxY1}
                        onChange={(e) => onYAxisScaleChange({ ...yAxisScale, maxY1: e.target.value === '' ? '' : Number(e.target.value) })}
                        className="w-full px-2 py-1 text-xs bg-slate-900 border border-slate-700 rounded text-sky-300 font-mono focus:outline-none focus:border-sky-500"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="h-px bg-slate-800" />

      {/* 3. Y-Axis Metrics Selector */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
            3. Variáveis Selecionadas ({selectedMetrics.length}/{numericFields.length})
          </label>
          <div className="flex items-center gap-2">
            <button
              onClick={onSelectAllNumeric}
              className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors font-medium"
            >
              Todas
            </button>
            <span className="text-slate-600">·</span>
            <button
              onClick={onClearAllMetrics}
              className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
            >
              Limpar
            </button>
          </div>
        </div>

        {/* Barra de Busca e Ordenação */}
        <div className="flex items-center gap-1.5 mb-2.5">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filtrar variáveis..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <button
            type="button"
            onClick={() => setSortSelectedFirst(!sortSelectedFirst)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg border font-mono transition-all shrink-0 cursor-pointer ${
              sortSelectedFirst
                ? 'bg-indigo-950/80 text-indigo-300 border-indigo-700/80 shadow-sm'
                : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-300'
            }`}
            title={sortSelectedFirst ? 'Ordenação: Selecionados primeiro, depois A-Z' : 'Ordenação: Apenas alfabética A-Z'}
          >
            <ArrowDownAZ className="w-3.5 h-3.5 text-indigo-400" />
            <span className="text-[11px] font-medium hidden sm:inline">
              {sortSelectedFirst ? 'Selecionados 1º' : 'A-Z Geral'}
            </span>
          </button>
        </div>

        {/* List of numeric fields */}
        <div className="flex flex-col gap-1.5 max-h-[290px] overflow-y-auto pr-1">
          {filteredNumeric.length === 0 ? (
            <div className="text-center py-6 text-xs text-slate-500">
              Nenhuma variável numérica encontrada com este filtro.
            </div>
          ) : (
            filteredNumeric.map((field, idx) => {
              const selected = isMetricSelected(field.key);
              const config = getMetricConfig(field.key);

              // Indicador visual quando começa o bloco de não-selecionados
              const isFirstUnselected =
                sortSelectedFirst &&
                !selected &&
                idx > 0 &&
                isMetricSelected(filteredNumeric[idx - 1].key);

              return (
                <React.Fragment key={field.key}>
                  {isFirstUnselected && (
                    <div className="flex items-center gap-2 pt-2.5 pb-1 text-[10px] text-slate-500 uppercase tracking-wider font-mono">
                      <div className="h-px bg-slate-800 flex-1" />
                      <span>Outros Sinais ({numericFields.length - selectedMetrics.length})</span>
                      <div className="h-px bg-slate-800 flex-1" />
                    </div>
                  )}

                  <div
                    className={`flex items-center justify-between p-2 rounded-lg border transition-all ${
                      selected
                        ? 'bg-slate-800/90 border-slate-700 shadow-sm'
                        : 'bg-slate-950/50 border-slate-800/70 hover:border-slate-700/70'
                    }`}
                  >
                  <label className="flex items-center gap-2.5 cursor-pointer flex-1 min-w-0 mr-2">
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => onToggleMetric(field.key)}
                      className="accent-indigo-500 rounded cursor-pointer"
                    />

                    {selected && (
                      <span
                        className="w-3 h-3 rounded-full shrink-0 shadow"
                        style={{ backgroundColor: config?.color || '#3b82f6' }}
                      />
                    )}

                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-semibold text-slate-200 truncate font-mono">
                        {field.key}
                      </span>
                      {field.min !== undefined && field.max !== undefined && (
                        <span className="text-[10px] text-slate-500 font-mono tabular-nums">
                          min: {Number(field.min).toFixed(1)} · max: {Number(field.max).toFixed(1)} · méd: {Number(field.avg).toFixed(1)}
                        </span>
                      )}
                    </div>
                  </label>

                  {/* Dual Axis assignment switch if dual axis enabled */}
                  {selected && dualAxis && config && (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => onMetricAxisChange(field.key, config.yAxis === 'y' ? 'y1' : 'y')}
                        className={`text-[10px] font-mono px-2 py-0.5 rounded border transition-colors ${
                          config.yAxis === 'y1'
                            ? 'bg-sky-950 text-sky-400 border-sky-800'
                            : 'bg-slate-900 text-slate-400 border-slate-700'
                        }`}
                        title={config.yAxis === 'y1' ? 'Plotado no Eixo Direito (Y1)' : 'Plotado no Eixo Esquerdo (Y)'}
                      >
                        {config.yAxis === 'y1' ? 'Eixo Dir (Y1)' : 'Eixo Esq (Y)'}
                      </button>
                    </div>
                  )}
                </div>
              </React.Fragment>
            );
          })
          )}
        </div>
      </div>
    </div>
  );
};
